#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const JSON_PATH = path.join(ROOT, "host", "vela", "velaJson.jsx");
const CONTEXT_PATH = path.join(ROOT, "host", "vela", "velaContext.jsx");
const INDEX_PATH = path.join(ROOT, "host", "index.jsx");
const jsonSource = fs.readFileSync(JSON_PATH, "utf8");
const contextSource = fs.readFileSync(CONTEXT_PATH, "utf8");
let assertions = 0;

function check(condition, message) { assert.ok(condition, message); assertions += 1; }
function expectCode(callback, code, message) {
    assert.throws(callback, (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function makeRealm(overrides) {
    const realm = Object.assign({ AEToolbox: {}, console }, overrides || {});
    vm.createContext(realm);
    vm.runInContext(jsonSource, realm, { filename: "velaJson.jsx" });
    return realm;
}

function loadFacade(realm) {
    vm.runInContext(contextSource, realm, { filename: "velaContext.jsx" });
    return realm.AEToolbox.VelaContext;
}

const REQ = "req_" + "a".repeat(32);
const SESSION = "session_" + "b".repeat(32);

function request(overrides) {
    return Object.assign({
        protocol: "vela.host-context-request.v1",
        schemaVersion: "1.0",
        requestId: REQ,
        sessionId: SESSION,
        operation: "captureContext",
        tier: 1,
        scope: { purpose: "display", selectionOrderMeaningful: true }
    }, overrides || {});
}

function parseResult(text) { return JSON.parse(text); }
function inRealm(realm, source) { return vm.runInContext(source, realm); }

function installAeArrayDescriptorProfile(realm) {
    const RealmObject = inRealm(realm, "Object");
    const RealmArray = inRealm(realm, "Array");
    const realDescriptor = RealmObject.getOwnPropertyDescriptor;
    const realNames = RealmObject.getOwnPropertyNames;
    const controls = new WeakMap();

    RealmObject.getOwnPropertyDescriptor = function (value, key) {
        const control = controls.get(value);
        if (RealmArray.isArray(value) && key === "length") {
            return undefined;
        }
        if (control && control.descriptorThrowKey === key) {
            throw new Error("descriptor probe failure");
        }
        if (control && control.missingDescriptorKey === key) {
            return undefined;
        }
        return realDescriptor(value, key);
    };
    RealmObject.getOwnPropertyNames = function (value) {
        const control = controls.get(value);
        let names;
        if (control && control.namesThrow) {
            throw new Error("own names probe failure");
        }
        names = realNames(value);
        if (RealmArray.isArray(value)) {
            names = names.filter((name) => name !== "length");
        }
        if (control && control.names) {
            names = control.names.slice();
        }
        return names;
    };
    return {
        control(value, options) {
            controls.set(value, Object.assign({}, options));
            return value;
        }
    };
}

function preprocessHostFile(filePath, replacements) {
    const directory = path.dirname(filePath);
    const normalized = path.normalize(filePath);
    if (replacements && Object.prototype.hasOwnProperty.call(replacements, normalized)) {
        return replacements[normalized];
    }
    return fs.readFileSync(filePath, "utf8")
        .replace(/^\s*#target[^\r\n]*$/gm, "")
        .replace(/^([ \t]*)#include\s+"([^"]+)"\s*$/gm, (match, indent, relativePath) => {
            return preprocessHostFile(path.resolve(directory, relativePath), replacements);
        });
}

function makeFullHostRealm(overrides) {
    function File(filePath) {
        if (!(this instanceof File)) { return new File(filePath); }
        this.fsName = String(filePath);
        this.name = path.basename(String(filePath));
        this.parent = { fsName: path.dirname(String(filePath)) };
    }
    function Folder(folderPath) {
        if (!(this instanceof Folder)) { return new Folder(folderPath); }
        this.fsName = String(folderPath);
        this.exists = false;
        this.getFiles = function () { return []; };
    }
    const realm = Object.assign({
        AEToolbox: {},
        app: { project: null },
        CompItem: function CompItem() {},
        FootageItem: function FootageItem() {},
        File,
        Folder,
        console,
        $: { fileName: INDEX_PATH, evalFile() { throw new Error("Unexpected dynamic Host include."); } }
    }, overrides || {});
    realm.$.global = realm;
    vm.createContext(realm);
    return realm;
}

function runFullHost(realm, replacements) {
    return vm.runInContext(preprocessHostFile(INDEX_PATH, replacements), realm, { filename: "host/index.preprocessed.jsx" });
}

function makeAeRealm(layerOptions) {
    function CompItem() {}
    function FootageItem() {}
    const layer = Object.assign({
        id: 45,
        index: 3,
        matchName: "ADBE Text Layer",
        nullLayer: false,
        adjustmentLayer: false,
        source: null
    }, layerOptions || {});
    const comp = new CompItem();
    Object.assign(comp, { id: 12, width: 1920, height: 1080, duration: 10, frameRate: 30, selectedLayers: [layer] });
    const project = { activeItem: comp };
    const realm = makeRealm({ app: { version: "24.0", project }, CompItem, FootageItem });
    loadFacade(realm);
    return { realm, facade: realm.AEToolbox.VelaContext, project, comp, layer };
}

function runJsonTests() {
    const realm = makeRealm();
    const api = realm.AEToolbox.VelaJson;
    const installedDescriptor = Object.getOwnPropertyDescriptor(realm.AEToolbox, "VelaJson");
    const bootstrapDescriptor = Object.getOwnPropertyDescriptor(realm.AEToolbox, "__velaHostBootstrapV1");
    check(!installedDescriptor || installedDescriptor.writable === false, "Host JSON helper should be non-writable when descriptors are available.");
    check(bootstrapDescriptor && bootstrapDescriptor.writable === false && bootstrapDescriptor.configurable === false && Object.isFrozen(bootstrapDescriptor.value), "Host JSON bootstrap must be immutable.");
    check(api.parseBounded('{"a":[true,false,null,"中🙂"]}').a[3] === "中🙂", "Strict JSON should parse standard values and Unicode.");
    check(api.parseBounded('{"a":"\\uD83D\\uDE42"}').a === "🙂", "Escaped surrogate pairs should decode correctly.");
    expectCode(() => api.parseBounded('{"a":1,"a":2}'), "HOST_CONTEXT_REQUEST_INVALID", "Duplicate keys must be rejected.");
    expectCode(() => api.parseBounded('{"a":1,"\\u0061":2}'), "HOST_CONTEXT_REQUEST_INVALID", "Escaped duplicate keys must be rejected.");
    expectCode(() => api.parseBounded('{}{}'), "HOST_CONTEXT_REQUEST_INVALID", "Multiple roots must be rejected.");
    expectCode(() => api.parseBounded('{"a":'), "HOST_CONTEXT_REQUEST_INVALID", "Malformed JSON must be rejected.");
    expectCode(() => api.parseBounded('{"__proto__":{}}'), "HOST_CONTEXT_REQUEST_INVALID", "Dangerous keys must be rejected.");
    expectCode(() => api.parseBounded('{"a":"\\uD800"}'), "HOST_CONTEXT_REQUEST_INVALID", "Unpaired surrogates must be rejected.");
    expectCode(() => api.parseBounded('{"a":-0}'), "HOST_CONTEXT_REQUEST_INVALID", "Negative zero must be rejected.");
    expectCode(() => api.parseBounded('{"a":1e9999}'), "HOST_CONTEXT_REQUEST_INVALID", "Non-finite parsed numbers must be rejected.");
    check(api.parseBounded('{"a":"中"}', { maxStringBytes: 3 }).a === "中", "UTF-8 string limit should accept the exact boundary.");
    expectCode(() => api.parseBounded('{"a":"中a"}', { maxStringBytes: 3 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "UTF-8 string limit should reject limit plus one.");
    expectCode(() => api.parseBounded('[[[0]]]', { maxDepth: 1 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Depth budgets must be enforced.");
    expectCode(() => api.parseBounded('[1,2]', { maxArrayLength: 1 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Array budgets must be enforced.");
    expectCode(() => api.parseBounded('{"a":1,"b":2}', { maxObjectProperties: 1 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Object property budgets must be enforced.");
    expectCode(() => api.parseBounded('"1234"', { maxBytes: 3 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Total input bytes must be enforced.");
    check(api.stringifyBounded(api.parseBounded('{"b":"🙂","a":[1,true]}')) === '{"a":[1,true],"b":"🙂"}', "Serializer should produce one deterministic JSON root.");
    const cycle = api.parseBounded('{}'); cycle.self = cycle;
    expectCode(() => api.stringifyBounded(cycle), "HOST_CONTEXT_REQUEST_INVALID", "Serializer cycles must be rejected.");
    const undefinedValue = api.parseBounded('{}'); undefinedValue.a = undefined;
    expectCode(() => api.stringifyBounded(undefinedValue), "HOST_CONTEXT_REQUEST_INVALID", "Undefined values must be rejected.");
    const infiniteValue = api.parseBounded('{}'); infiniteValue.a = Infinity;
    expectCode(() => api.stringifyBounded(infiniteValue), "HOST_CONTEXT_REQUEST_INVALID", "Non-finite values must be rejected.");
    const negativeZero = api.parseBounded('{}'); negativeZero.a = -0;
    expectCode(() => api.stringifyBounded(negativeZero), "HOST_CONTEXT_REQUEST_INVALID", "Serialized negative zero must be rejected.");
    expectCode(() => api.stringifyBounded(new Date()), "HOST_CONTEXT_REQUEST_INVALID", "Host-like or custom objects must be rejected.");

    const indexGetter = inRealm(realm, '(function(){var a=[];this.indexGetterReads=0;Object.defineProperty(a,"0",{enumerable:true,get:function(){indexGetterReads++;return 1;}});a.length=1;return a}())');
    expectCode(() => api.stringifyBounded(indexGetter), "HOST_CONTEXT_REQUEST_INVALID", "Array index getters must be rejected.");
    check(realm.indexGetterReads === 0, "Array index getters must never execute.");
    const indexSetter = inRealm(realm, '(function(){var a=[];Object.defineProperty(a,"0",{enumerable:true,set:function(){}});a.length=1;return a}())');
    expectCode(() => api.stringifyBounded(indexSetter), "HOST_CONTEXT_REQUEST_INVALID", "Array index setter descriptors must be rejected.");
    expectCode(() => api.stringifyBounded(inRealm(realm, "new Array(1)")), "HOST_CONTEXT_REQUEST_INVALID", "Sparse arrays must be rejected.");
    expectCode(() => api.stringifyBounded(inRealm(realm, '(function(){var a=[1];a.extra=2;return a}())')), "HOST_CONTEXT_REQUEST_INVALID", "Arrays with extra own properties must be rejected.");
    expectCode(() => api.stringifyBounded(inRealm(realm, '(function(){var a=[1];Object.setPrototypeOf(a,{});return a}())')), "HOST_CONTEXT_REQUEST_INVALID", "Arrays with custom prototypes must be rejected.");
    const descriptorProxy = inRealm(realm, 'new Proxy([1],{getOwnPropertyDescriptor:function(){throw new Error("descriptor")}})');
    expectCode(() => api.stringifyBounded(descriptorProxy), "HOST_CONTEXT_REQUEST_INVALID", "Array descriptor proxy failures must fail closed.");
    const ownKeysProxy = inRealm(realm, 'new Proxy([1],{ownKeys:function(){throw new Error("keys")}})');
    expectCode(() => api.stringifyBounded(ownKeysProxy), "HOST_CONTEXT_REQUEST_INVALID", "Array ownKeys proxy failures must fail closed.");
    const constructorGetter = inRealm(realm, '(function(){var x={};this.constructorReads=0;Object.defineProperty(x,"constructor",{enumerable:true,get:function(){constructorReads++;return Object;}});return x}())');
    expectCode(() => api.stringifyBounded(constructorGetter), "HOST_CONTEXT_REQUEST_INVALID", "Constructor accessors must be rejected.");
    check(realm.constructorReads === 0, "Constructor accessors must never execute.");
    const toJsonGetter = inRealm(realm, '(function(){var x={};this.toJsonReads=0;Object.defineProperty(x,"toJSON",{enumerable:true,get:function(){toJsonReads++;return function(){};}});return x}())');
    expectCode(() => api.stringifyBounded(toJsonGetter), "HOST_CONTEXT_REQUEST_INVALID", "toJSON accessors must be rejected.");
    check(realm.toJsonReads === 0, "toJSON accessors must never execute.");

    check(api.stringifyBounded("a", { maxBytes: 3 }) === '"a"', "Serializer total budget must accept the exact ASCII boundary.");
    expectCode(() => api.stringifyBounded("a", { maxBytes: 2 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Serializer total budget must reject limit plus one.");
    const emoji = api.parseBounded('"\\uD83D\\uDE42"');
    check(api.stringifyBounded(emoji, { maxBytes: 6 }) === '"' + emoji + '"', "Serializer must count emoji UTF-8 bytes exactly.");
    expectCode(() => api.stringifyBounded(emoji, { maxBytes: 5 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Emoji must reject one byte over the output limit.");
    check(api.stringifyBounded("\n", { maxBytes: 4 }) === '"\\n"', "Escaped controls must count their emitted bytes.");
    const controls = "\n".repeat(10);
    check(api.stringifyBounded(controls, { maxBytes: 22 }) === '"' + "\\n".repeat(10) + '"', "Many escaped controls must fit only their exact emitted-byte budget.");
    expectCode(() => api.stringifyBounded(controls, { maxBytes: 21 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Escaped-control output must reject limit plus one.");
    expectCode(() => api.stringifyBounded(api.parseBounded('["1234","5678"]'), { maxBytes: 10 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Nested output must stop at the aggregate byte limit.");
    const manyFields = api.parseBounded('{"a":1,"b":2,"c":3,"d":4,"e":5,"f":6,"g":7,"h":8}');
    const manyFieldsOutput = api.stringifyBounded(manyFields);
    check(api.stringifyBounded(manyFields, { maxBytes: api.utf8ByteLength(manyFieldsOutput) }) === manyFieldsOutput, "Many small fields must fit their exact aggregate budget.");
    expectCode(() => api.stringifyBounded(manyFields, { maxBytes: api.utf8ByteLength(manyFieldsOutput) - 1 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Many small fields must not bypass the aggregate budget.");
    const stopAfterBudget = inRealm(realm, '(function(){var x={a:"123456789",z:1};this.lateGetterReads=0;Object.defineProperty(x,"z",{enumerable:true,get:function(){lateGetterReads++;return 1;}});return x}())');
    expectCode(() => api.stringifyBounded(stopAfterBudget, { maxBytes: 5 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "Output budget must fail before later properties are inspected.");
    check(realm.lateGetterReads === 0, "No later getter may run after the output budget is exceeded.");

    expectCode(() => vm.runInContext(jsonSource, realm, { filename: "velaJson-again.jsx" }), "VELA_JSON_MODULE_CONFLICT", "Repeated Host JSON loading must be a stable conflict.");
    check(realm.AEToolbox.VelaJson === api, "A repeated load must not replace the installed JSON module.");
    ["same-revision", "same-methods", "frozen"].forEach((kind, index) => {
        let calls = 0;
        const fake = {
            parseBounded() { calls += 1; },
            stringifyBounded() { calls += 1; },
            utf8ByteLength() { calls += 1; }
        };
        if (kind !== "same-methods") { fake.revision = "vela-json-host-v1"; }
        if (kind === "frozen") { Object.freeze(fake); }
        const conflictRealm = { AEToolbox: { VelaJson: fake }, console };
        vm.createContext(conflictRealm);
        expectCode(() => vm.runInContext(jsonSource, conflictRealm, { filename: "velaJson-conflict-" + index + ".jsx" }), "VELA_JSON_MODULE_CONFLICT", "Every preloaded JSON object must conflict.");
        check(conflictRealm.AEToolbox.VelaJson === fake && calls === 0 && conflictRealm.AEToolbox.__velaHostBootstrapV1 === undefined, "JSON conflict must not call, replace or partially initialize the fake object.");
    });
    const fakeBootstrap = { VelaJson: {} };
    const bootstrapConflictRealm = { AEToolbox: { __velaHostBootstrapV1: fakeBootstrap }, console };
    vm.createContext(bootstrapConflictRealm);
    expectCode(() => vm.runInContext(jsonSource, bootstrapConflictRealm), "VELA_JSON_MODULE_CONFLICT", "A preloaded Host bootstrap must conflict.");
    check(bootstrapConflictRealm.AEToolbox.__velaHostBootstrapV1 === fakeBootstrap && bootstrapConflictRealm.AEToolbox.VelaJson === undefined, "Bootstrap conflict must not be overwritten or partially install JSON.");
}

function runAeArrayProfileTests() {
    const realm = makeRealm();
    const profile = installAeArrayDescriptorProfile(realm);
    const api = realm.AEToolbox.VelaJson;
    const empty = inRealm(realm, "[]");
    const one = inRealm(realm, "[1]");
    const many = inRealm(realm, "[1,2,3]");
    const nested = inRealm(realm, "[[1],[2,3]]");
    check(api.stringifyBounded(empty) === "[]", "AE native-array profile must serialize an empty array.");
    check(api.stringifyBounded(one) === "[1]", "AE native-array profile must serialize one element.");
    check(api.stringifyBounded(many) === "[1,2,3]", "AE native-array profile must serialize multiple elements.");
    check(api.stringifyBounded(nested) === "[[1],[2,3]]", "AE native-array profile must serialize nested arrays.");

    const internalSparse = inRealm(realm, "(function(){var a=[];a[0]=1;a[2]=3;return a;}())");
    const trailingSparse = inRealm(realm, "(function(){var a=[1];a.length=2;return a;}())");
    expectCode(() => api.stringifyBounded(internalSparse), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject internal sparse arrays.");
    expectCode(() => api.stringifyBounded(trailingSparse), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject trailing sparse arrays.");
    const countMismatch = inRealm(realm, "[1,2]");
    profile.control(countMismatch, { names: ["0"] });
    expectCode(() => api.stringifyBounded(countMismatch), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array own-name count must equal length.");
    ["extra", "00", "01", "+1", "-0", "-1", "1.0", "1e0"].forEach((key) => {
        const array = inRealm(realm, "[1]");
        Object.defineProperty(array, key, { configurable: true, enumerable: true, value: 2, writable: true });
        expectCode(() => api.stringifyBounded(array), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject non-canonical key " + key + ".");
    });

    const missingDescriptor = inRealm(realm, "[1]");
    profile.control(missingDescriptor, { missingDescriptorKey: "0" });
    expectCode(() => api.stringifyBounded(missingDescriptor), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject missing index descriptors.");
    const indexGetter = inRealm(realm, '(function(){var a=[];this.aeIndexGetterReads=0;Object.defineProperty(a,"0",{enumerable:true,get:function(){aeIndexGetterReads++;return 1;}});a.length=1;return a;}())');
    expectCode(() => api.stringifyBounded(indexGetter), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array index getters must be rejected.");
    check(realm.aeIndexGetterReads === 0, "AE native-array index getters must never execute.");
    const indexSetter = inRealm(realm, '(function(){var a=[];Object.defineProperty(a,"0",{enumerable:true,set:function(){}});a.length=1;return a;}())');
    expectCode(() => api.stringifyBounded(indexSetter), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array index setters must be rejected.");
    const hiddenIndex = inRealm(realm, '(function(){var a=[];Object.defineProperty(a,"0",{enumerable:false,value:1});a.length=1;return a;}())');
    expectCode(() => api.stringifyBounded(hiddenIndex), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array indexes must be enumerable.");
    expectCode(() => api.stringifyBounded(inRealm(realm, '(function(){var a=[1];Object.setPrototypeOf(a,{});return a;}())')), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject custom prototypes.");
    const fakeArray = inRealm(realm, '({"0":1,length:1})');
    check(api.stringifyBounded(fakeArray).charAt(0) === "{", "A plain object with length must remain an object, never enter the array profile.");

    const descriptorThrow = inRealm(realm, "[1]");
    profile.control(descriptorThrow, { descriptorThrowKey: "0" });
    expectCode(() => api.stringifyBounded(descriptorThrow), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array descriptor failures must fail closed.");
    const namesThrow = inRealm(realm, "[1]");
    profile.control(namesThrow, { namesThrow: true });
    expectCode(() => api.stringifyBounded(namesThrow), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array own-name failures must fail closed.");

    function controlledLengthArray(lengthValue, throws) {
        const target = inRealm(realm, "[1]");
        let reads = 0;
        const proxy = new Proxy(target, {
            get(value, key) {
                if (key === "length") {
                    reads += 1;
                    if (throws) { throw new Error("length probe failure"); }
                    return lengthValue;
                }
                return Reflect.get(value, key);
            }
        });
        return { proxy, reads: () => reads };
    }
    const oneLengthRead = controlledLengthArray(1, false);
    check(api.stringifyBounded(oneLengthRead.proxy) === "[1]" && oneLengthRead.reads() === 1, "AE native-array length must be read exactly once.");
    const lengthThrow = controlledLengthArray(1, true);
    expectCode(() => api.stringifyBounded(lengthThrow.proxy), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array length read failures must fail closed.");
    check(lengthThrow.reads() === 1, "A failing AE native-array length read must occur exactly once.");
    [Infinity, -1, -0, 1.5, 65].forEach((length) => {
        const controlled = controlledLengthArray(length, false);
        expectCode(() => api.stringifyBounded(controlled.proxy), length === 65 ? "HOST_CONTEXT_BUDGET_EXCEEDED" : "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject invalid length " + String(length) + ".");
        check(controlled.reads() === 1, "Invalid AE native-array length must be read once.");
    });

    ["constructor", "toJSON", "valueOf"].forEach((key) => {
        const counter = "ae" + key + "Reads";
        const array = inRealm(realm, '(function(){var a=[1];this.' + counter + '=0;Object.defineProperty(a,"' + key + '",{enumerable:true,get:function(){' + counter + '++;return function(){};}});return a;}())');
        expectCode(() => api.stringifyBounded(array), "HOST_CONTEXT_REQUEST_INVALID", "AE native-array profile must reject " + key + " properties.");
        check(realm[counter] === 0, "AE native-array profile must not execute " + key + " getters.");
    });
    check(api.stringifyBounded("a", { maxBytes: 3 }) === '"a"', "AE profile changes must preserve exact incremental budgets.");
    expectCode(() => api.stringifyBounded("a", { maxBytes: 2 }), "HOST_CONTEXT_BUDGET_EXCEEDED", "AE profile changes must preserve incremental budget rejection.");

    const ae = makeAeRealm();
    installAeArrayDescriptorProfile(ae.realm);
    const display = parseResult(ae.facade.handle(JSON.stringify(request())));
    const binding = parseResult(ae.facade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
    check(display.ok === true && display.snapshot.selection.items.length === 1 && display.snapshot.selection.items[0].nativeLayerId === 45, "AE profile must serialize a complete display Tier 1 envelope.");
    check(binding.ok === true && binding.snapshot.selection.items.length === 1 && binding.snapshot.selection.identityQuality === "native-layer-id", "AE profile must serialize a complete binding Tier 1 envelope.");
}

function runFacadeTests() {
    function CompItem() {}
    let projectReads = 0;
    const app = { version: "24.0" };
    Object.defineProperty(app, "project", { get() { projectReads += 1; throw new Error("project secret"); } });
    const tierZeroRealm = makeRealm({ app, CompItem });
    const tierZeroFacade = loadFacade(tierZeroRealm);
    const tierZeroRequest = request({ operation: "getCapabilities", tier: 0 });
    const tierZero = parseResult(tierZeroFacade.handle(JSON.stringify(tierZeroRequest)));
    check(tierZero.ok === true && tierZero.snapshot.tier === 0 && projectReads === 0, "Tier 0 must not access app.project.");
    check(tierZero.snapshot.capabilities.maxTier === 1 && tierZero.snapshot.capabilities.nativeLayerIdAvailable === false, "Tier 0 must report conservative capabilities.");

    const ae = makeAeRealm();
    const facadeDescriptor = Object.getOwnPropertyDescriptor(ae.realm.AEToolbox, "VelaContext");
    check(!facadeDescriptor || facadeDescriptor.writable === false, "Host context facade should be non-writable when descriptors are available.");
    expectCode(() => vm.runInContext(contextSource, ae.realm, { filename: "velaContext-again.jsx" }), "VELA_CONTEXT_MODULE_CONFLICT", "Repeated Host context loading must be a stable conflict.");
    check(ae.realm.AEToolbox.VelaContext === ae.facade, "A repeated load must not replace the installed context facade.");
    const display = parseResult(ae.facade.handle(JSON.stringify(request())));
    check(display.ok === true && display.snapshot.activeComp.itemId === 12 && display.snapshot.selection.items[0].nativeLayerId === 45, "Tier 1 should return bounded comp and layer identity.");
    check(display.snapshot.selection.items[0].matchName === "ADBE Text Layer" && display.snapshot.selection.items[0].type === "text", "Tier 1 should return the allowed layer metadata.");
    ["source", "nullLayer", "adjustmentLayer", "name", "text", "expression"].forEach((key) => {
        Object.defineProperty(ae.layer, key, { configurable: true, get() { throw new Error("forbidden layer read: " + key); } });
    });
    check(parseResult(ae.facade.handle(JSON.stringify(request()))).ok === true, "Tier 1 must not read layer fields outside the fixed allowlist.");
    const binding = parseResult(ae.facade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
    check(binding.ok === true && binding.snapshot.selection.identityQuality === "native-layer-id", "Native Layer.id should permit binding context.");
    const capabilitiesAfterRead = parseResult(ae.facade.handle(JSON.stringify(tierZeroRequest)));
    check(capabilitiesAfterRead.snapshot.capabilities.bindingContextAvailable === true, "A safely observed Layer.id should enable binding capability.");

    const noId = makeAeRealm({ id: undefined });
    const displayNoId = parseResult(noId.facade.handle(JSON.stringify(request())));
    check(displayNoId.ok === true && displayNoId.snapshot.selection.identityQuality === "index-only" && displayNoId.snapshot.selection.items[0].nativeLayerId === undefined, "Display context may use index-only identity.");
    const bindingNoId = parseResult(noId.facade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
    check(bindingNoId.ok === false && bindingNoId.error.code === "HOST_CONTEXT_UNAVAILABLE", "Binding context must reject missing Layer.id.");

    const many = makeAeRealm();
    many.comp.selectedLayers = Array.from({ length: 33 }, (_, index) => ({ id: index + 1, index: index + 1, matchName: "ADBE AV Layer", source: null }));
    const omitted = parseResult(many.facade.handle(JSON.stringify(request())));
    check(omitted.ok === true && omitted.snapshot.selection.omitted === true && omitted.snapshot.selection.count === 33, "Display context may return an explicit selection-limit omission.");
    const bindingMany = parseResult(many.facade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
    check(bindingMany.ok === false && bindingMany.error.code === "HOST_CONTEXT_BUDGET_EXCEEDED", "Binding context must reject oversized selections.");

    const unknown = parseResult(ae.facade.handle(JSON.stringify(Object.assign(request(), { provider: "bad" }))));
    check(unknown.ok === false && unknown.error.code === "HOST_CONTEXT_REQUEST_INVALID", "Unknown request fields must be rejected.");
    const unsupported = parseResult(ae.facade.handle(JSON.stringify(request({ operation: "runAnything" }))));
    check(unsupported.ok === false && unsupported.error.code === "HOST_CONTEXT_OPERATION_UNSUPPORTED" && unsupported.operation === "unknown", "Only fixed operations may be dispatched without echoing the rejected operation.");
    const leaked = ae.facade.handle('{"secret":"SHOULD_NOT_RETURN"}');
    check(leaked.indexOf("SHOULD_NOT_RETURN") === -1 && leaked.indexOf("stack") === -1, "Host errors must not echo input or stacks.");

    const originalGeneration = display.snapshot.projectGeneration;
    const newComp = new ae.realm.CompItem();
    Object.assign(newComp, { id: 12, width: 1920, height: 1080, duration: 10, frameRate: 30, selectedLayers: [ae.layer] });
    ae.realm.app.project = { activeItem: newComp };
    const replaced = parseResult(ae.facade.handle(JSON.stringify(request())));
    check(replaced.snapshot.projectGeneration === originalGeneration + 1, "Project reference replacement must advance projectGeneration.");

    let fakeContextCalls = 0;
    const fakeContext = { hostAdapterRevision: "vela-context-host-v1", handle() { fakeContextCalls += 1; } };
    const fakeContextRealm = makeRealm();
    fakeContextRealm.AEToolbox.VelaContext = fakeContext;
    expectCode(() => loadFacade(fakeContextRealm), "VELA_CONTEXT_MODULE_CONFLICT", "A preloaded context facade must conflict.");
    check(fakeContextRealm.AEToolbox.VelaContext === fakeContext && fakeContextCalls === 0, "Context conflict must not call or replace the preloaded facade.");

    const failedJsonRealm = { AEToolbox: { VelaJson: { revision: "vela-json-host-v1" } }, console };
    vm.createContext(failedJsonRealm);
    expectCode(() => vm.runInContext(jsonSource, failedJsonRealm), "VELA_JSON_MODULE_CONFLICT", "JSON preload conflicts must fail before bootstrap creation.");
    expectCode(() => vm.runInContext(contextSource, failedJsonRealm), "HOST_CONTEXT_UNAVAILABLE", "Context must reject a JSON dependency that was not installed by the real module.");
    check(failedJsonRealm.AEToolbox.VelaContext === undefined, "A failed JSON dependency must not leave a partial Context module.");

    const overflowRealm = makeRealm();
    function OverflowCompItem() {}
    overflowRealm.CompItem = OverflowCompItem;
    const overflowComp = new OverflowCompItem();
    Object.assign(overflowComp, { id: 1, width: 1, height: 1, duration: 1, frameRate: 1, selectedLayers: [] });
    let overflowProjectReads = 0;
    let overflowProject = { activeItem: overflowComp };
    Object.defineProperty(overflowRealm, "app", { value: {}, configurable: true });
    Object.defineProperty(overflowRealm.app, "project", { configurable: true, get() { overflowProjectReads += 1; return overflowProject; } });
    const overflowSource = contextSource.replace("var projectGeneration = 1;", "var projectGeneration = 1000000;");
    check(overflowSource !== contextSource, "Overflow fixture must patch exactly the private initial generation for testing.");
    vm.runInContext(overflowSource, overflowRealm, { filename: "velaContext-overflow.jsx" });
    const overflowFacade = overflowRealm.AEToolbox.VelaContext;
    check(parseResult(overflowFacade.handle(JSON.stringify(request()))).ok === true, "The maximum in-range generation may be captured before replacement.");
    overflowProject = { activeItem: overflowComp };
    const overflowFirst = parseResult(overflowFacade.handle(JSON.stringify(request())));
    const readsAfterOverflow = overflowProjectReads;
    const overflowSecond = parseResult(overflowFacade.handle(JSON.stringify(request())));
    const overflowThird = parseResult(overflowFacade.handle(JSON.stringify(request())));
    check(overflowFirst.error.code === "HOST_CONTEXT_SESSION_RESET_REQUIRED" && overflowSecond.error.code === "HOST_CONTEXT_SESSION_RESET_REQUIRED" && overflowThird.error.code === "HOST_CONTEXT_SESSION_RESET_REQUIRED", "Generation overflow must remain latched for every later Tier 1 request.");
    check(overflowProjectReads === readsAfterOverflow, "Latched Tier 1 requests must not read the project document again.");
    const overflowTierZero = parseResult(overflowFacade.handle(JSON.stringify(tierZeroRequest)));
    check(overflowTierZero.ok === true && overflowTierZero.snapshot.capabilities.bindingContextAvailable === false, "Tier 0 must report binding unavailable while reset is latched.");
}

function runStaticTests() {
    const combined = jsonSource + "\n" + contextSource;
    const forbiddenCalls = [
        /\bbeginUndoGroup\s*\(/, /\bendUndoGroup\s*\(/, /\.setValue\s*\(/, /\.setValueAtTime\s*\(/,
        /\.addProperty\s*\(/, /\.remove\s*\(/, /\.duplicate\s*\(/, /\.moveBefore\s*\(/, /\.moveAfter\s*\(/,
        /\bexecuteCommand\s*\(/, /\bsystem\.callSystem\s*\(/, /\bSocket\s*\(/, /\bFile\s*\(/, /\bFolder\s*\(/
    ];
    check(forbiddenCalls.every((pattern) => !pattern.test(combined)), "Host context files must contain no mutation, filesystem, shell or socket calls.");
    check(!/\beval\s*\(|\bFunction\s*\(/.test(combined), "Host context files must contain no dynamic code parser.");
    check(!/\b(?:let|const|class)\b|=>|`|\?\./.test(combined), "Host context files must remain ExtendScript-compatible ES3 style.");
    const indexSource = fs.readFileSync(INDEX_PATH, "utf8");
    const wrapperIndex = indexSource.indexOf("(function (velaHostNamespace)");
    const jsonIndex = indexSource.indexOf('#include "vela/velaJson.jsx"');
    const contextIndex = indexSource.indexOf('#include "vela/velaContext.jsx"');
    const wrapperEndIndex = indexSource.indexOf("}(AEToolbox));", contextIndex);
    const toolIndex = indexSource.indexOf('#include "tools/textBackgroundBox.jsx"');
    check(wrapperIndex !== -1 && jsonIndex > wrapperIndex && contextIndex > jsonIndex && wrapperEndIndex > contextIndex && toolIndex > wrapperEndIndex, "Host Vela includes must share one private load scope and remain ordered before tool includes.");
    const productionRealm = { AEToolbox: {}, console };
    vm.createContext(productionRealm);
    vm.runInContext("(function (velaHostNamespace) { var AEToolbox = velaHostNamespace;\n" + jsonSource + "\n" + contextSource + "\n}(AEToolbox));", productionRealm);
    check(productionRealm.AEToolbox.VelaJson && productionRealm.AEToolbox.VelaContext && productionRealm.__velaHostJsonInstallTokenV1 === undefined, "Production-style Host loading must install both modules without exposing the private install token.");
}

function runRuntimeReloadTests() {
    let projectReads = 0;
    let mutationCalls = 0;
    const app = {};
    Object.defineProperty(app, "project", { configurable: true, get() { projectReads += 1; return null; } });
    ["beginUndoGroup", "endUndoGroup", "executeCommand"].forEach((name) => {
        app[name] = function () { mutationCalls += 1; };
    });
    const realm = makeFullHostRealm({ app });
    runFullHost(realm);
    const runtime = realm.AEToolbox.__velaHostRuntimeV1;
    const json = realm.AEToolbox.VelaJson;
    const context = realm.AEToolbox.VelaContext;
    check(runtime && runtime.revision === "vela-host-runtime-v1", "A fresh engine must publish the Vela Host runtime after both modules are constructed.");
    check(runtime.json === json && runtime.context === context, "Public Host aliases must exactly reference the runtime modules.");
    check(projectReads === 0, "The first complete Host load must not read the project.");
    runFullHost(realm);
    check(realm.AEToolbox.__velaHostRuntimeV1 === runtime && realm.AEToolbox.VelaJson === json && realm.AEToolbox.VelaContext === context, "A second complete Host load must reuse runtime, JSON and Context identities.");
    check(projectReads === 0, "A legal Host reload must not read project, activeItem or selection.");
    check(mutationCalls === 0, "Initial Host load and legal reload must not call Host mutation APIs.");

    const incompatibleRuntime = { revision: "wrong", json: {}, context: {}, reload() {} };
    const incompatibleRealm = makeFullHostRealm({ AEToolbox: { __velaHostRuntimeV1: incompatibleRuntime } });
    expectCode(() => runFullHost(incompatibleRealm), "VELA_HOST_RUNTIME_CONFLICT", "An incompatible root runtime must be rejected.");
    check(incompatibleRealm.AEToolbox.__velaHostRuntimeV1 === incompatibleRuntime && incompatibleRealm.AEToolbox.VelaJson === undefined && incompatibleRealm.AEToolbox.VelaContext === undefined, "An incompatible runtime must not be overwritten or gain aliases.");

    ["VelaJson", "VelaContext"].forEach((name) => {
        const fake = {};
        const preloadedRealm = makeFullHostRealm({ AEToolbox: { [name]: fake } });
        expectCode(() => runFullHost(preloadedRealm), "VELA_HOST_RUNTIME_CONFLICT", "A preloaded alias without a compatible runtime must be rejected.");
        check(preloadedRealm.AEToolbox[name] === fake && preloadedRealm.AEToolbox.__velaHostRuntimeV1 === undefined, "A preloaded alias conflict must not be overwritten or publish a runtime.");
    });

    const failedRealm = makeFullHostRealm();
    const failedContextSource = 'throw (function(){var e=new Error("forced context construction failure");e.code="HOST_CONTEXT_UNAVAILABLE";return e;}());';
    const failedReplacements = {};
    failedReplacements[path.normalize(CONTEXT_PATH)] = failedContextSource;
    expectCode(() => runFullHost(failedRealm, failedReplacements), "HOST_CONTEXT_UNAVAILABLE", "A Context construction failure must escape with its stable code.");
    check(failedRealm.AEToolbox.__velaHostRuntimeV1 === undefined && failedRealm.AEToolbox.VelaJson === undefined && failedRealm.AEToolbox.VelaContext === undefined, "A construction failure must leave no runtime, JSON or Context globals.");
    runFullHost(failedRealm);
    check(failedRealm.AEToolbox.__velaHostRuntimeV1 && failedRealm.AEToolbox.VelaJson && failedRealm.AEToolbox.VelaContext, "A clean retry after partial construction failure must succeed.");

    function OverflowCompItem() {}
    const overflowComp = new OverflowCompItem();
    Object.assign(overflowComp, { id: 1, width: 1, height: 1, duration: 1, frameRate: 1, selectedLayers: [] });
    let overflowProject = { activeItem: overflowComp };
    let overflowReads = 0;
    const overflowApp = {};
    Object.defineProperty(overflowApp, "project", { configurable: true, get() { overflowReads += 1; return overflowProject; } });
    const overflowRealm = makeFullHostRealm({ app: overflowApp, CompItem: OverflowCompItem });
    const overflowReplacements = {};
    overflowReplacements[path.normalize(CONTEXT_PATH)] = contextSource.replace("var projectGeneration = 1;", "var projectGeneration = 1000000;");
    runFullHost(overflowRealm, overflowReplacements);
    const overflowContext = overflowRealm.AEToolbox.VelaContext;
    check(parseResult(overflowContext.handle(JSON.stringify(request()))).ok === true, "The maximum generation must remain readable before project replacement.");
    overflowProject = { activeItem: overflowComp };
    check(parseResult(overflowContext.handle(JSON.stringify(request()))).error.code === "HOST_CONTEXT_SESSION_RESET_REQUIRED", "Project replacement at the maximum generation must latch reset-required.");
    const readsAtLatch = overflowReads;
    check(parseResult(overflowContext.handle(JSON.stringify(request()))).error.code === "HOST_CONTEXT_SESSION_RESET_REQUIRED" && overflowReads === readsAtLatch, "The overflow latch must persist without further project reads.");
    const overflowRuntime = overflowRealm.AEToolbox.__velaHostRuntimeV1;
    runFullHost(overflowRealm, overflowReplacements);
    check(overflowRealm.AEToolbox.__velaHostRuntimeV1 === overflowRuntime && overflowRealm.AEToolbox.VelaContext === overflowContext, "Overflow recovery must preserve runtime and Context identity.");
    check(overflowReads === readsAtLatch, "Runtime reload must clear the latch without reading the project.");
    const afterReload = parseResult(overflowContext.handle(JSON.stringify(request())));
    check(afterReload.ok === true && afterReload.snapshot.projectGeneration === 1, "The first capture after legal reload must restart project generation at one.");
}

try {
    runJsonTests();
    runAeArrayProfileTests();
    runFacadeTests();
    runStaticTests();
    runRuntimeReloadTests();
    console.log("PASS Vela context Host: " + assertions + " assertions.");
} catch (error) {
    console.error("FAIL Vela context Host - " + error.message + "\n" + (error.stack || ""));
    process.exitCode = 1;
}
