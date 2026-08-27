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

function injectProjectAssignmentFailure(source, label) {
    const pattern = /(^[ \t]*)currentProjectReference = project;(\r?\n)\1currentProjectReferenceWasNull = project === null;\2\1projectGeneration\+\+;/gm;
    const matches = source.match(pattern) || [];
    check(matches.length === 1, label + " assignment fault injection must match exactly one replacement-transition block.");
    const patched = source.replace(pattern, (match, indent, eol) => indent + "throw new Error(\"SECRET_HOST_DETAIL assignment\");" + eol + match);
    check(patched !== source, label + " assignment fault injection must change the source.");
    check(patched.indexOf("SECRET_HOST_DETAIL assignment") !== -1, label + " assignment fault marker must exist in the patched source.");
    return patched;
}
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

function loadFacade(realm, source) {
    vm.runInContext(source || contextSource, realm, { filename: "velaContext.jsx" });
    return realm.AEToolbox.VelaContext;
}

function runHostStageDiagnosticsTests() {
    function bindingRequest() { return request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }); }
    function expectStage(facade, stage, label) {
        const raw = facade.handle(JSON.stringify(bindingRequest()));
        const result = parseResult(raw);
        check(result.ok === false && result.error.code === "HOST_CONTEXT_READ_FAILED" && result.error.stage === stage, label + " must retain only its closed Host read stage.");
        check(raw.indexOf("SECRET_HOST_DETAIL") === -1 && raw.indexOf("stack") === -1 && raw.indexOf("project-path") === -1 && raw.indexOf("native-object") === -1, label + " must not expose the underlying exception or Host object details.");
    }

    let firstReads = 0;
    const firstApp = {};
    Object.defineProperty(firstApp, "project", { get() { firstReads += 1; throw new Error("SECRET_HOST_DETAIL first project read"); } });
    const firstRealm = makeRealm({ app: firstApp, CompItem: function CompItem() {} });
    expectStage(loadFacade(firstRealm), "project-read", "The first app.project getter failure");
    check(firstReads === 1, "The first app.project getter failure must stop after one read.");

    let secondReads = 0;
    const secondApp = {};
    Object.defineProperty(secondApp, "project", { get() { secondReads += 1; if (secondReads === 2) throw new Error("SECRET_HOST_DETAIL second project read"); return { activeItem: null }; } });
    const secondRealm = makeRealm({ app: secondApp, CompItem: function CompItem() {} });
    expectStage(loadFacade(secondRealm), "project-read", "The second app.project getter failure");
    check(secondReads === 2, "The existing truthy project expression must still perform its second getter read.");

    const transitionRealm = makeRealm({ app: { project: { activeItem: null } }, CompItem: function CompItem() {} });
    const transitionSource = contextSource.replace("if (!changed) { return; }", "throw new Error(\"SECRET_HOST_DETAIL transition\");\n        if (!changed) { return; }");
    const transitionFacade = loadFacade(transitionRealm, transitionSource);
    check(parseResult(transitionFacade.handle(JSON.stringify(request()))).ok === true, "The controlled transition fault must not affect initial Project observation.");
    transitionRealm.app.project = { activeItem: null };
    expectStage(transitionFacade, "project-transition", "An unknown project transition failure");

    const activeProject = {};
    Object.defineProperty(activeProject, "activeItem", { get() { throw new Error("SECRET_HOST_DETAIL active item"); } });
    const activeRealm = makeRealm({ app: { project: activeProject }, CompItem: function CompItem() {} });
    expectStage(loadFacade(activeRealm), "active-item-read", "The project.activeItem getter failure");

    const classificationRealm = makeRealm({ app: { project: { activeItem: {} } } });
    inRealm(classificationRealm, 'function CompItem(){}; Object.defineProperty(CompItem, Symbol.hasInstance, { value: function(){ throw new Error("SECRET_HOST_DETAIL classification"); } });');
    expectStage(loadFacade(classificationRealm), "active-item-classification", "The active item classification failure");

    const unavailableRealm = makeRealm({ app: { project: { activeItem: null } }, CompItem: function CompItem() {} });
    const unavailable = parseResult(loadFacade(unavailableRealm).handle(JSON.stringify(bindingRequest())));
    check(unavailable.ok === false && unavailable.error.code === "HOST_CONTEXT_UNAVAILABLE" && unavailable.error.reason === "no-active-composition" && !Object.prototype.hasOwnProperty.call(unavailable.error, "stage"), "Normal no-active-composition remains unavailable without a Host failure stage.");
}

function runProjectReferenceLifetimeTests() {
    function project() { return { activeItem: null }; }
    function capture(facade) { return parseResult(facade.handle(JSON.stringify(request()))); }

    const projectA = project();
    const projectB = project();
    let validCalls = 0;
    const validRealm = makeRealm({ app: { project: projectA }, CompItem: function CompItem() {}, isValid(value) { validCalls += 1; return value === projectA || value === projectB; } });
    const validFacade = loadFacade(validRealm);
    const initial = capture(validFacade);
    const same = capture(validFacade);
    validRealm.app.project = projectB;
    const replacement = capture(validFacade);
    const replacementSame = capture(validFacade);
    check(initial.snapshot.projectGeneration === 1, "Initial Project observation keeps the initial generation.");
    check(same.snapshot.projectGeneration === 1 && validCalls === 3, "A valid same Project reference does not advance generation and later observations use isValid.");
    check(replacement.snapshot.projectGeneration === 2 && replacementSame.snapshot.projectGeneration === 2, "A valid Project replacement advances generation exactly once and the accepted Project then remains stable.");

    const invalidA = project();
    const invalidB = project();
    const invalidSource = contextSource.replace("changed = project !== currentProjectReference;", "comparisonCalls += 1;\n                    changed = project !== currentProjectReference;");
    const invalidRealm = makeRealm({ app: { project: invalidA }, CompItem: function CompItem() {}, comparisonCalls: 0, isValid(value) { return value !== invalidA; } });
    const invalidFacade = loadFacade(invalidRealm, invalidSource);
    check(capture(invalidFacade).snapshot.projectGeneration === 1, "An initial native Project reference is accepted without validity comparison.");
    invalidRealm.app.project = invalidB;
    const invalidReplacement = capture(invalidFacade);
    const invalidSame = capture(invalidFacade);
    check(invalidReplacement.ok === true && invalidReplacement.snapshot.projectGeneration === 2 && invalidRealm.comparisonCalls === 1, "An invalid prior Project skips equality, advances once, and the accepted replacement is compared only on its later same-Project capture.");
    check(invalidSame.snapshot.projectGeneration === 2, "The Project accepted after invalidation remains stable on its next capture.");

    const throwingValidityA = project();
    const throwingValidityRealm = makeRealm({ app: { project: throwingValidityA }, CompItem: function CompItem() {}, isValid() { throw new Error("validity unavailable"); } });
    const throwingValidityFacade = loadFacade(throwingValidityRealm);
    check(capture(throwingValidityFacade).snapshot.projectGeneration === 1, "Initial observation does not invoke validity checks.");
    throwingValidityRealm.app.project = project();
    check(capture(throwingValidityFacade).snapshot.projectGeneration === 2, "An isValid exception conservatively advances Project authority once.");

    const throwingComparisonSource = contextSource.replace("changed = project !== currentProjectReference;", "throw new Error(\"comparison unavailable\");");
    const throwingComparisonA = project();
    const throwingComparisonRealm = makeRealm({ app: { project: throwingComparisonA }, CompItem: function CompItem() {}, isValid() { return true; } });
    const throwingComparisonFacade = loadFacade(throwingComparisonRealm, throwingComparisonSource);
    check(capture(throwingComparisonFacade).snapshot.projectGeneration === 1, "Initial observation bypasses reference comparison.");
    throwingComparisonRealm.app.project = project();
    check(capture(throwingComparisonFacade).snapshot.projectGeneration === 2, "A strict-comparison exception conservatively advances Project authority once.");

    const fallbackA = project();
    const fallbackB = project();
    const fallbackRealm = makeRealm({ app: { project: fallbackA }, CompItem: function CompItem() {} });
    const fallbackFacade = loadFacade(fallbackRealm);
    const fallbackInitial = capture(fallbackFacade);
    const fallbackSame = capture(fallbackFacade);
    fallbackRealm.app.project = fallbackB;
    const fallbackReplacement = capture(fallbackFacade);
    check(fallbackInitial.snapshot.projectGeneration === 1 && fallbackSame.snapshot.projectGeneration === 1 && fallbackReplacement.snapshot.projectGeneration === 2, "When isValid is unavailable, guarded strict comparison preserves same/replacement generation semantics.");

    let nullValidityCalls = 0;
    const nullRealm = makeRealm({ app: { project: null }, CompItem: function CompItem() {}, isValid(value) { nullValidityCalls += 1; if (value === null) throw new Error("isValid(null) must not run"); return true; } });
    const nullFacade = loadFacade(nullRealm);
    const nullInitial = capture(nullFacade);
    const nullSame = capture(nullFacade);
    nullRealm.app.project = project();
    const nullToProject = capture(nullFacade);
    const projectSame = capture(nullFacade);
    nullRealm.app.project = null;
    const projectToNull = capture(nullFacade);
    check(nullInitial.snapshot.projectGeneration === 1 && nullSame.snapshot.projectGeneration === 1 && nullValidityCalls === 2, "null to null does not invoke isValid or advance generation; only later non-null observations use validity checks.");
    check(nullToProject.snapshot.projectGeneration === 2, "null to Project advances generation exactly once.");
    check(projectSame.snapshot.projectGeneration === 2, "The same valid Project after a null transition does not advance generation.");
    check(projectToNull.snapshot.projectGeneration === 3, "Project to null advances generation exactly once.");

    [
        ["checked-out", contextSource],
        ["LF", contextSource.replace(/\r\n/g, "\n")],
        ["CRLF", contextSource.replace(/\r?\n/g, "\r\n")]
    ].forEach(([label, source]) => {
        const assignmentSource = injectProjectAssignmentFailure(source, label);
        const assignmentRealm = makeRealm({ app: { project: project() }, CompItem: function CompItem() {}, isValid() { return true; } });
        const assignmentFacade = loadFacade(assignmentRealm, assignmentSource);
        check(capture(assignmentFacade).ok === true, label + " assignment fault fixture leaves initial observation intact.");
        assignmentRealm.app.project = project();
        const assignmentFailure = parseResult(assignmentFacade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
        check(assignmentFailure.error.code === "HOST_CONTEXT_READ_FAILED" && assignmentFailure.error.stage === "project-transition", label + " new-reference assignment failure remains visible as project-transition READ_FAILED.");
    });

    function NativeCompItem() {}
    const layer = { id: 9, index: 1, matchName: "ADBE AV Layer" };
    const comp = new NativeCompItem();
    Object.assign(comp, { id: 7, width: 100, height: 100, duration: 1, frameRate: 24, selectedLayers: [layer] });
    const nativeA = { activeItem: comp };
    const nativeB = { activeItem: null };
    const nativeRealm = makeRealm({ app: { project: nativeA }, CompItem: NativeCompItem, isValid() { return true; } });
    const nativeFacade = loadFacade(nativeRealm);
    check(capture(nativeFacade).ok === true, "A native-layer-id observation succeeds before replacement.");
    check(parseResult(nativeFacade.handle(JSON.stringify(Object.assign(request(), { operation: "getCapabilities", tier: 0 })))).snapshot.capabilities.bindingContextAvailable === true, "Observed native Layer identity enables binding before replacement.");
    nativeRealm.app.project = nativeB;
    check(capture(nativeFacade).snapshot.projectGeneration === 2, "Replacement after native Layer observation advances generation.");
    check(parseResult(nativeFacade.handle(JSON.stringify(Object.assign(request(), { operation: "getCapabilities", tier: 0 })))).snapshot.capabilities.bindingContextAvailable === false, "Project replacement resets nativeLayerIdObserved.");
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

function tierTwoRequest(details, overrides) {
    return Object.assign(request({
        operation: "captureLayerDetails",
        tier: 2,
        scope: { purpose: "display", selectionOrderMeaningful: true, details: details === undefined ? ["name"] : details }
    }), overrides || {});
}

function tierThreeRequest(targets, overrides) {
    return Object.assign(request({
        operation: "resolvePropertyTargets",
        tier: 3,
        scope: {
            purpose: "binding",
            expectedHostInstanceId: "host_0123456789abcdef0123456789abcdef0123456789abcdef",
            expectedHostReloadEpoch: 1,
            expectedProjectGeneration: 1,
            targets
        }
    }), overrides || {});
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
    Object.assign(comp, { id: 12, width: 1920, height: 1080, duration: 10, frameRate: 30, selectedLayers: [layer], layer(index) { return index === layer.index ? layer : null; } });
    const project = { activeItem: comp };
    const realm = makeRealm({ app: { version: "24.0", project }, CompItem, FootageItem, PropertyType: { PROPERTY: "property", NAMED_GROUP: "named", INDEXED_GROUP: "indexed" } });
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
    check(tierZero.snapshot.capabilities.maxTier === 3 && tierZero.snapshot.capabilities.nativeLayerIdAvailable === false, "Tier 0 must report conservative capabilities.");

    const ae = makeAeRealm();
    const facadeDescriptor = Object.getOwnPropertyDescriptor(ae.realm.AEToolbox, "VelaContext");
    check(!facadeDescriptor || facadeDescriptor.writable === false, "Host context facade should be non-writable when descriptors are available.");
    expectCode(() => vm.runInContext(contextSource, ae.realm, { filename: "velaContext-again.jsx" }), "VELA_CONTEXT_MODULE_CONFLICT", "Repeated Host context loading must be a stable conflict.");
    check(ae.realm.AEToolbox.VelaContext === ae.facade, "A repeated load must not replace the installed context facade.");
    const display = parseResult(ae.facade.handle(JSON.stringify(request())));
    check(display.ok === true && display.snapshot.activeComp.itemId === 12 && display.snapshot.selection.items[0].nativeLayerId === 45, "Tier 1 should return bounded comp and layer identity.");
    check(/^host_[a-f0-9]{48}$/.test(display.snapshot.hostInstanceId) && display.snapshot.hostReloadEpoch === 1, "Tier 1 must return exact Host instance and reload authority.");
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
    const fakeContext = { hostAdapterRevision: "vela-context-host-v4", handle() { fakeContextCalls += 1; } };
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

function runTierTwoTests() {
    const ae = makeAeRealm();
    ae.comp.time = 2.5;
    let propertyCalls = 0;
    let boundsCalls = 0;
    let textReads = 0;
    const textDocument = { styleSecret: "MUST_NOT_LEAK" };
    Object.defineProperty(textDocument, "text", { get() { textReads += 1; return "中🙂".repeat(200); } });
    const textDocumentProperty = { matchName: "ADBE Text Document", value: textDocument };
    const textProperties = {
        matchName: "ADBE Text Properties",
        property(name) { propertyCalls += 1; return name === "ADBE Text Document" ? textDocumentProperty : null; }
    };
    ae.layer.name = "层🙂".repeat(200);
    ae.layer.property = function (name) { propertyCalls += 1; return name === "ADBE Text Properties" ? textProperties : null; };
    ae.layer.sourceRectAtTime = function (time, includeExtents) {
        boundsCalls += 1;
        check(time === 2.5 && includeExtents === false, "Tier 2 bounds must use active comp time and false extents.");
        return { left: -10, top: 5, width: 100, height: 50 };
    };

    const none = parseResult(ae.facade.handle(JSON.stringify(tierTwoRequest(["name"]))));
    check(none.ok === true && none.snapshot.tier === 2 && none.snapshot.selection.items.length === 1, "Tier 2 name-only capture must succeed.");
    check(propertyCalls === 0 && boundsCalls === 0, "Unrequested Tier 2 text and bounds reads must remain at zero calls.");
    const nameItem = none.snapshot.selection.items[0];
    check(nameItem.nameTruncated === true && Buffer.byteLength(nameItem.name, "utf8") <= 256 && !/[\uD800-\uDBFF]$/.test(nameItem.name), "Tier 2 name truncation must use UTF-8 bytes without splitting a surrogate pair.");
    check(nameItem.nameOriginalBytes === Buffer.byteLength(ae.layer.name, "utf8") && nameItem.textPreview === undefined && nameItem.bounds === undefined, "Tier 2 must return only requested optional fields and exact name byte metadata.");

    const text = parseResult(ae.facade.handle(JSON.stringify(tierTwoRequest(["textPreview"]))));
    const textItem = text.snapshot.selection.items[0];
    check(textItem.textPreviewTruncated === true && Buffer.byteLength(textItem.textPreview, "utf8") <= 512 && propertyCalls === 2 && textReads === 1, "Tier 2 text preview must use the fixed two-level path, one text read and UTF-8 budget.");
    check(JSON.stringify(text).indexOf("MUST_NOT_LEAK") === -1 && textItem.name === undefined && textItem.bounds === undefined, "TextDocument objects and unrequested fields must not enter the result.");

    const bounds = parseResult(ae.facade.handle(JSON.stringify(tierTwoRequest(["bounds"]))));
    check(bounds.ok === true && bounds.snapshot.selection.items[0].bounds.width === 100 && boundsCalls === 1, "Tier 2 bounds must call sourceRectAtTime at most once per selected layer; calls=" + boundsCalls + " result=" + JSON.stringify(bounds));
    const combined = parseResult(ae.facade.handle(JSON.stringify(tierTwoRequest(["name", "textPreview", "bounds"]))));
    check(combined.ok === true && combined.snapshot.selection.items[0].omittedFields.length === 0 && boundsCalls === 2, "Tier 2 combined details must remain bounded and avoid duplicate omissions.");
    check(Buffer.byteLength(JSON.stringify(combined), "utf8") <= 16 * 1024, "Tier 2 Host response must remain within 16 KiB.");

    const empty = makeAeRealm();
    empty.comp.selectedLayers = [];
    const emptyResult = parseResult(empty.facade.handle(JSON.stringify(tierTwoRequest(["name"]))));
    check(emptyResult.ok === true && emptyResult.snapshot.selection.count === 0 && emptyResult.snapshot.selection.items.length === 0, "Tier 2 must accept an empty explicit selection.");

    const eight = makeAeRealm();
    eight.comp.selectedLayers = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, index: index + 1, matchName: "ADBE AV Layer", name: "L" + index }));
    const eightResult = parseResult(eight.facade.handle(JSON.stringify(tierTwoRequest(["name"]))));
    check(eightResult.ok === true && eightResult.snapshot.selection.items.length === 8, "Tier 2 must accept exactly eight selected layers.");
    const nine = makeAeRealm();
    nine.comp.selectedLayers = Array.from({ length: 9 }, (_, index) => ({ id: index + 1, index: index + 1, matchName: "ADBE AV Layer", name: "L" + index }));
    const nineResult = parseResult(nine.facade.handle(JSON.stringify(tierTwoRequest(["name"]))));
    check(nineResult.ok === false && nineResult.error.code === "HOST_CONTEXT_BUDGET_EXCEEDED", "Tier 2 must reject nine selected layers without truncation.");

    [[], ["name", "name"], ["unknown"]].forEach((details) => {
        const invalid = parseResult(ae.facade.handle(JSON.stringify(tierTwoRequest(details))));
        check(invalid.ok === false && invalid.error.code === "HOST_CONTEXT_REQUEST_INVALID", "Tier 2 must reject empty, duplicate and unknown detail lists.");
    });
    const forbidden = parseResult(ae.facade.handle(JSON.stringify(Object.assign(tierTwoRequest(["name"]), { propertyPath: ["bad", 1] }))));
    check(forbidden.ok === false && forbidden.error.code === "HOST_CONTEXT_REQUEST_INVALID", "Tier 2 must reject caller property paths and unknown request fields.");

    const nonText = makeAeRealm({ matchName: "ADBE AV Layer", name: "AV" });
    let nonTextPropertyReads = 0;
    nonText.layer.property = function () { nonTextPropertyReads += 1; throw new Error("must not read"); };
    const nonTextResult = parseResult(nonText.facade.handle(JSON.stringify(tierTwoRequest(["textPreview"]))));
    check(nonTextResult.ok === true && nonTextPropertyReads === 0 && nonTextResult.snapshot.selection.items[0].omittedFields[0] === "textPreview", "Non-text layers must omit textPreview without touching Text Source.");

    const badBounds = makeAeRealm({ name: "bad" });
    let badBoundsCalls = 0;
    badBounds.comp.time = 0;
    badBounds.layer.sourceRectAtTime = function () { badBoundsCalls += 1; return { left: -0, top: 0, width: Infinity, height: -1 }; };
    const badBoundsResult = parseResult(badBounds.facade.handle(JSON.stringify(tierTwoRequest(["bounds"]))));
    check(badBoundsResult.ok === true && badBoundsCalls === 1 && badBoundsResult.snapshot.selection.items[0].bounds === undefined && badBoundsResult.snapshot.selection.items[0].omittedFields[0] === "bounds", "Illegal bounds must be omitted without leaking native failure data.");

    const forbiddenReads = makeAeRealm();
    forbiddenReads.comp.time = 0;
    let forbiddenNameReads = 0;
    let forbiddenTextPathReads = 0;
    let allowedBoundsReads = 0;
    Object.defineProperty(forbiddenReads.layer, "name", { configurable: true, get() { forbiddenNameReads += 1; throw new Error("name must not be read"); } });
    Object.defineProperty(forbiddenReads.layer, "property", { configurable: true, get() { forbiddenTextPathReads += 1; throw new Error("text path must not be read"); } });
    forbiddenReads.layer.sourceRectAtTime = function () { allowedBoundsReads += 1; return { left: 0, top: 0, width: 1, height: 1 }; };
    const boundsOnly = parseResult(forbiddenReads.facade.handle(JSON.stringify(tierTwoRequest(["bounds"]))));
    check(boundsOnly.ok === true && forbiddenNameReads === 0 && forbiddenTextPathReads === 0 && allowedBoundsReads === 1, "Tier 2 must perform zero forbidden optional reads and exactly one requested bounds read.");
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

function runTierThreeTests() {
    const ae = makeAeRealm();
    const types = ae.realm.PropertyType;
    let propertyCalls = 0;
    let forbiddenReads = 0;
    const position = { matchName: "ADBE Position", propertyIndex: 2, propertyType: types.PROPERTY };
    ["value", "expression", "expressionEnabled", "expressionError", "name", "valueAtTime"].forEach((key) => {
        Object.defineProperty(position, key, { get() { forbiddenReads += 1; throw new Error("forbidden raw read"); } });
    });
    const transform = {
        matchName: "ADBE Transform Group",
        propertyIndex: 0,
        propertyType: types.NAMED_GROUP,
        property(name) { propertyCalls += 1; return name === "ADBE Position" ? position : null; }
    };
    ae.layer.property = function (name) { propertyCalls += 1; return name === "ADBE Transform Group" ? transform : null; };
    const binding = parseResult(ae.facade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
    const target = { targetOrdinal: 0, itemId: 12, nativeLayerId: 45, layerIndex: 3, propertyPath: ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0] };
    const resolved = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([target], {
        scope: {
            purpose: "binding",
            expectedHostInstanceId: binding.snapshot.hostInstanceId,
            expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch,
            expectedProjectGeneration: binding.snapshot.projectGeneration,
            targets: [target]
        }
    }))));
    check(resolved.ok === true && resolved.snapshot.tier === 3 && resolved.snapshot.targets[0].propertyMatchName === "ADBE Position" && resolved.snapshot.targets[0].propertyIndex === 2, "Tier 3 must resolve a mixed named terminal Property path.");
    check(propertyCalls === 2, "Tier 3 must call property exactly once per path segment.");
    check(forbiddenReads === 0 && JSON.stringify(resolved).indexOf("value") === -1 && JSON.stringify(resolved).indexOf("expression") === -1, "Tier 3 must not read or return raw value/expression fields.");

    let siblingReads = 0;
    const slider = { matchName: "ADBE Slider Control-0001", propertyIndex: 1, propertyType: types.PROPERTY };
    const effect = { matchName: "ADBE Slider Control", propertyIndex: 1, propertyType: types.NAMED_GROUP, property(name) { propertyCalls += 1; return name === "ADBE Slider Control-0001" ? slider : null; } };
    const effectParade = { matchName: "ADBE Effect Parade", propertyIndex: 0, propertyType: types.INDEXED_GROUP, property(index) { propertyCalls += 1; return index === 1 ? effect : null; } };
    Object.defineProperty(effectParade, "numProperties", { get() { siblingReads += 1; throw new Error("sibling traversal"); } });
    ae.layer.property = function (name) { propertyCalls += 1; return name === "ADBE Effect Parade" ? effectParade : null; };
    propertyCalls = 0;
    const effectTarget = { targetOrdinal: 0, itemId: 12, nativeLayerId: 45, layerIndex: 3, propertyPath: ["named", "ADBE Effect Parade", 0, "indexed", "ADBE Slider Control", 1, "named", "ADBE Slider Control-0001", 0] };
    const effectResult = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([effectTarget], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [effectTarget] }
    }))));
    check(effectResult.ok === true && effectResult.snapshot.targets[0].propertyIndex === 1, "Tier 3 must resolve a named/indexed/named duplicate-effect path.");
    check(propertyCalls === 3 && siblingReads === 0, "Tier 3 must use exactly one property call per segment and never enumerate siblings.");

    effectParade.property = function (index) { propertyCalls += 1; return index === 1 ? Object.assign({}, effect, { propertyIndex: 2 }) : null; };
    const mismatchTarget = effectTarget;
    const mismatchResult = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([mismatchTarget], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [mismatchTarget] }
    }))));
    check(mismatchResult.ok === false && mismatchResult.error.code === "HOST_CONTEXT_TARGET_NOT_FOUND", "Tier 3 must reject indexed child property-index drift without a fallback search.");

    const namedAgainstIndexedTarget = Object.assign({}, effectTarget, { propertyPath: ["named", "ADBE Effect Parade", 0, "named", "ADBE Slider Control", 0] });
    const namedAgainstIndexedResult = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([namedAgainstIndexedTarget], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [namedAgainstIndexedTarget] }
    }))));
    check(namedAgainstIndexedResult.ok === false && namedAgainstIndexedResult.error.code === "HOST_CONTEXT_TARGET_NOT_FOUND", "Tier 3 must reject named traversal from an indexed group.");

    const terminalGroup = { matchName: "ADBE Group", propertyIndex: 0, propertyType: types.NAMED_GROUP, property() { propertyCalls += 1; return null; } };
    ae.layer.property = function () { propertyCalls += 1; return terminalGroup; };
    const groupTarget = { targetOrdinal: 0, itemId: 12, nativeLayerId: 45, layerIndex: 3, propertyPath: ["named", "ADBE Group", 0] };
    const groupResult = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([groupTarget], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [groupTarget] }
    }))));
    check(groupResult.ok === false && groupResult.error.code === "HOST_CONTEXT_TARGET_NOT_FOUND", "Tier 3 must reject a terminal PropertyGroup.");

    const missingTarget = { targetOrdinal: 0, itemId: 12, nativeLayerId: 45, layerIndex: 3, propertyPath: ["named", "ADBE Missing", 0] };
    const partialResult = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([groupTarget, missingTarget], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [groupTarget, missingTarget] }
    }))));
    check(partialResult.ok === false && partialResult.snapshot === undefined, "A failed Tier 3 target must reject the entire request without a partial result.");
    const invalid = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([Object.assign({}, target, { propertyPath: ["indexed", "ADBE Position", 0] })], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [Object.assign({}, target, { propertyPath: ["indexed", "ADBE Position", 0] })] }
    }))));
    check(invalid.ok === false && invalid.error.code === "HOST_CONTEXT_REQUEST_INVALID", "Tier 3 must reject invalid indexed path schema before resolving.");
    const overlongPath = [];
    for (let index = 0; index < 13; index += 1) { overlongPath.push("indexed", "ADBE Group " + index, index + 1); }
    const overlong = parseResult(ae.facade.handle(JSON.stringify(tierThreeRequest([Object.assign({}, target, { propertyPath: overlongPath })], {
        scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets: [Object.assign({}, target, { propertyPath: overlongPath })] }
    }))));
    check(overlong.ok === false && overlong.error.code === "HOST_CONTEXT_REQUEST_INVALID", "Tier 3 Host validation must reject thirteen property-path levels before resolution.");
}

function runPropertyValueTests() {
    const ae = makeAeRealm();
    const types = ae.realm.PropertyType;
    const target = { targetOrdinal: 0, itemId: 12, nativeLayerId: 45, layerIndex: 3, propertyPath: ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0] };
    const binding = parseResult(ae.facade.handle(JSON.stringify(request({ scope: { purpose: "binding", selectionOrderMeaningful: true } }))));
    let propertyCalls = 0;
    let valueReads = 0;
    let capabilityReads = 0;
    let enabledReads = 0;
    let forbiddenReads = 0;
    let timeReads = 0;
    let durationReads = 0;
    function requestValues(targets, extra) {
        return Object.assign(tierThreeRequest(targets, {
            operation: "capturePropertyValues",
            scope: { purpose: "binding", expectedHostInstanceId: binding.snapshot.hostInstanceId, expectedHostReloadEpoch: binding.snapshot.hostReloadEpoch, expectedProjectGeneration: binding.snapshot.projectGeneration, targets }
        }), extra || {});
    }
    function installTerminal(value, canSetExpression, expressionEnabled, behavior) {
        const position = { matchName: "ADBE Position", propertyIndex: 2, propertyType: types.PROPERTY };
        behavior = behavior || {};
        Object.defineProperty(position, "canSetExpression", { get() { capabilityReads += 1; if (behavior.canThrow) { throw new Error("CAN_SENTINEL"); } return canSetExpression; } });
        Object.defineProperty(position, "expressionEnabled", { get() { enabledReads += 1; if (behavior.enabledThrow) { throw new Error("ENABLED_SENTINEL"); } return expressionEnabled; } });
        Object.defineProperty(position, "value", { get() { valueReads += 1; return behavior.valueForRead ? behavior.valueForRead(valueReads) : value; } });
        ["expression", "expressionError", "name"].forEach((key) => Object.defineProperty(position, key, { get() { forbiddenReads += 1; throw new Error("forbidden raw read"); } }));
        position.valueAtTime = function () { forbiddenReads += 1; throw new Error("forbidden raw call"); };
        const transform = { matchName: "ADBE Transform Group", propertyIndex: 0, propertyType: types.NAMED_GROUP, property(name) { propertyCalls += 1; return name === "ADBE Position" ? position : null; } };
        ae.layer.property = function (name) { propertyCalls += 1; return name === "ADBE Transform Group" ? transform : null; };
    }
    Object.defineProperty(ae.comp, "time", { configurable: true, get() { timeReads += 1; return 0; } });
    Object.defineProperty(ae.comp, "duration", { configurable: true, get() { durationReads += 1; return 10; } });
    installTerminal(50, false, false);
    let result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === true && result.snapshot.sampleTime === 0 && result.snapshot.targets[0].value.kind === "number" && result.snapshot.targets[0].value.data === 50, "Property values must return only an allowed primitive payload and one request-local sample time.");
    check(timeReads === 1 && propertyCalls === 2 && capabilityReads === 1 && enabledReads === 0 && valueReads === 1 && forbiddenReads === 0, "A non-expression property must read time once, capability once and value once without forbidden reads.");
    check(durationReads === 1, "A one-target request must read active comp duration within its fixed one-read budget.");
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal(inRealm(ae.realm, "[0, 1, 1.5]"), true, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === true && result.snapshot.targets[0].value.kind === "number-array" && result.snapshot.targets[0].value.data.length === 3, "A dense one-to-four number array must be accepted.");
    check(capabilityReads === 1 && enabledReads === 1 && valueReads === 1 && forbiddenReads === 0 && timeReads === 1, "A disabled expression-capable property must read expressionEnabled once and value once.");
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal(99, true, true);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED", "An expression-enabled property must fail closed.");
    check(capabilityReads === 1 && enabledReads === 1 && valueReads === 0 && forbiddenReads === 0 && timeReads === 1, "An enabled expression must never evaluate its value or inspect expression source fields.");
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    const aeArrayProfile = installAeArrayDescriptorProfile(ae.realm);
    const nativeArray = inRealm(ae.realm, "[0, 1]");
    aeArrayProfile.control(nativeArray, {});
    installTerminal(nativeArray, false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === true && result.snapshot.targets[0].value.kind === "number-array", "The Host value normalizer must accept the bounded AE native-array descriptor profile.");
    check(valueReads === 1 && forbiddenReads === 0, "The native-array value path must read only the value getter and descriptor data.");
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal({ unsafe: true }, false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_VALUE_UNSUPPORTED" && result.snapshot === undefined, "Unsupported property values must reject the whole request without a partial result.");
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal(7, false, false);
    const fourTargets = [0, 1, 2, 3].map((targetOrdinal) => Object.assign({}, target, { targetOrdinal }));
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues(fourTargets))));
    check(result.ok === true && result.snapshot.targets.length === 4 && result.snapshot.targets.every((item) => item.sampleTime === undefined) && result.snapshot.sampleTime === 0, "Four targets must share the snapshot sample time without target-local times.");
    check(timeReads === 1 && durationReads === 1 && valueReads === 4 && forbiddenReads === 0, "A four-target request must read time and duration once and each value at most once.");
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal("a".repeat(1024), false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === true && result.snapshot.targets[0].value.data.length === 1024, "A 1024-byte ASCII property payload must be accepted.");
    installTerminal("a".repeat(1025), false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_BUDGET_EXCEEDED" && result.snapshot === undefined, "A 1025-byte ASCII property payload must reject without a partial result.");
    installTerminal("\u4e2d".repeat(341) + "a", false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === true, "A mixed UTF-8 property string at exactly 1024 bytes must be accepted.");
    installTerminal("\u4e2d".repeat(341) + "aa", false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_BUDGET_EXCEEDED", "A mixed UTF-8 property string at 1025 bytes must reject.");
    installTerminal("b".repeat(1024), false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues(fourTargets))));
    check(result.ok === true && result.snapshot.targets.length === 4, "Four exact-limit payloads must meet the 4096-byte aggregate boundary.");
    installTerminal("b".repeat(1025), false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues(fourTargets))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_BUDGET_EXCEEDED" && result.snapshot === undefined, "The first representable value beyond the 4096-byte aggregate boundary must reject without partial targets.");
    [null, 0, 1, "true", undefined].forEach((invalid) => {
        propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
        installTerminal(1, invalid, false);
        result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
        check(result.ok === false && result.error.code === "HOST_CONTEXT_VALUE_INVALID" && valueReads === 0 && enabledReads === 0 && forbiddenReads === 0, "Non-boolean canSetExpression must fail closed without raw reads.");
    });
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal(1, false, false, { canThrow: true });
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_READ_FAILED" && valueReads === 0 && enabledReads === 0 && JSON.stringify(result).indexOf("CAN_SENTINEL") === -1, "A throwing canSetExpression getter must fail closed without leaking native text.");
    [null, 0, 1, "false", undefined].forEach((invalid) => {
        propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
        installTerminal(1, true, invalid);
        result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
        check(result.ok === false && result.error.code === "HOST_CONTEXT_VALUE_INVALID" && valueReads === 0 && enabledReads === 1 && forbiddenReads === 0, "Non-boolean expressionEnabled must fail closed without raw reads.");
    });
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    installTerminal(1, true, false, { enabledThrow: true });
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === false && result.error.code === "HOST_CONTEXT_READ_FAILED" && valueReads === 0 && enabledReads === 1 && JSON.stringify(result).indexOf("ENABLED_SENTINEL") === -1, "A throwing expressionEnabled getter must fail closed without leaking native text.");
    const sentinel = "VELA_RAW_SENTINEL_6c7a0c4f";
    propertyCalls = valueReads = capabilityReads = enabledReads = forbiddenReads = timeReads = durationReads = 0;
    const sentinelTargets = [Object.assign({}, target, { targetOrdinal: 0 }), Object.assign({}, target, { targetOrdinal: 1 })];
    installTerminal(sentinel, false, false, { valueForRead(read) { return read === 1 ? sentinel : { invalid: true }; } });
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues(sentinelTargets))));
    check(result.ok === false && result.snapshot === undefined && JSON.stringify(result).indexOf(sentinel) === -1 && JSON.stringify(ae.realm.AEToolbox).indexOf(sentinel) === -1, "A prior target raw sentinel must not leak when a later target fails.");
    installTerminal(1, false, false);
    result = parseResult(ae.facade.handle(JSON.stringify(requestValues([target]))));
    check(result.ok === true && JSON.stringify(result).indexOf(sentinel) === -1, "A later successful request must not expose a previous request raw sentinel.");
    const malformed = parseResult(ae.facade.handle(JSON.stringify(requestValues([], {}))));
    check(malformed.ok === false && malformed.error.code === "HOST_CONTEXT_REQUEST_INVALID", "Property-value requests must require one to four targets.");
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
    const execution = realm.AEToolbox.VelaExecution;
    check(runtime && runtime.revision === "vela-host-runtime-v5" && execution && execution.hostExecutionRevision === "vela-execution-host-v1", "A fresh engine must publish the v5 Host runtime after all staged Vela modules are constructed.");
    check(realm.AEToolbox.__velaPropertyValueDigestV1 === undefined && realm.AEToolbox.__velaVerifyExecutionAuthorityV1 === undefined && Object.keys(context).join(",") === "hostAdapterRevision,handle,reload", "Digest and authority helpers stay staging-private and the v4 Context public surface remains unchanged.");
    check(runtime.json === json && runtime.context === context, "Public Host aliases must exactly reference the runtime modules.");
    const firstAuthority = parseResult(context.handle(JSON.stringify({ ...request(), operation: "getCapabilities", tier: 0 }))).snapshot;
    check(/^host_[a-f0-9]{48}$/.test(firstAuthority.hostInstanceId) && firstAuthority.hostReloadEpoch === 1, "Fresh Host installation must issue fixed-format authority at epoch one.");
    check(projectReads === 0, "The first complete Host load must not read the project.");
    runFullHost(realm);
    check(realm.AEToolbox.__velaHostRuntimeV1 === runtime && realm.AEToolbox.VelaJson === json && realm.AEToolbox.VelaContext === context && realm.AEToolbox.VelaExecution === execution, "A second complete Host load must reuse runtime, JSON, Context and Execution identities.");
    check(projectReads === 0, "A legal Host reload must not read project, activeItem or selection.");
    check(mutationCalls === 0, "Initial Host load and legal reload must not call Host mutation APIs.");
    const secondAuthority = parseResult(context.handle(JSON.stringify({ ...request(), operation: "getCapabilities", tier: 0 }))).snapshot;
    check(secondAuthority.hostInstanceId === firstAuthority.hostInstanceId && secondAuthority.hostReloadEpoch === 2, "Compatible reload must preserve Host instance identity and increment reload epoch exactly once.");
    const freshRealm = makeFullHostRealm();
    runFullHost(freshRealm);
    const freshAuthority = parseResult(freshRealm.AEToolbox.VelaContext.handle(JSON.stringify({ ...request(), operation: "getCapabilities", tier: 0 }))).snapshot;
    check(freshAuthority.hostInstanceId !== firstAuthority.hostInstanceId && freshAuthority.hostReloadEpoch === 1, "A fresh Host realm must issue a different instance identity at epoch one.");
    const idFailureRealm = makeRealm();
    expectCode(() => vm.runInContext(contextSource.replace(/Math\.random\(\)/g, "(0/0)"), idFailureRealm, { filename: "velaContext-id-failure.jsx" }), "HOST_CONTEXT_UNAVAILABLE", "Invalid Host authority entropy must fail closed after bounded retries.");
    check(idFailureRealm.AEToolbox.VelaContext === undefined, "Host authority generation failure must not publish a partial Context facade.");
    const fullIdFailureRealm = makeFullHostRealm();
    const fullIdFailureReplacements = {};
    fullIdFailureReplacements[path.normalize(CONTEXT_PATH)] = contextSource.replace(/Math\.random\(\)/g, "(0/0)");
    expectCode(() => runFullHost(fullIdFailureRealm, fullIdFailureReplacements), "HOST_CONTEXT_UNAVAILABLE", "Host authority failure inside staging must escape with a stable code.");
    check(fullIdFailureRealm.AEToolbox.__velaHostRuntimeV1 === undefined && fullIdFailureRealm.AEToolbox.VelaJson === undefined && fullIdFailureRealm.AEToolbox.VelaContext === undefined && fullIdFailureRealm.AEToolbox.VelaExecution === undefined, "Host authority failure must transactionally publish no runtime aliases.");
    runFullHost(fullIdFailureRealm);
    check(fullIdFailureRealm.AEToolbox.__velaHostRuntimeV1 && fullIdFailureRealm.AEToolbox.VelaContext, "A fresh retry after Host authority failure must recover cleanly.");

    const incompatibleRuntime = { revision: "wrong", json: {}, context: {}, reload() {} };
    const incompatibleRealm = makeFullHostRealm({ AEToolbox: { __velaHostRuntimeV1: incompatibleRuntime } });
    expectCode(() => runFullHost(incompatibleRealm), "VELA_HOST_RUNTIME_CONFLICT", "An incompatible root runtime must be rejected.");
    check(incompatibleRealm.AEToolbox.__velaHostRuntimeV1 === incompatibleRuntime && incompatibleRealm.AEToolbox.VelaJson === undefined && incompatibleRealm.AEToolbox.VelaContext === undefined, "An incompatible runtime must not be overwritten or gain aliases.");
    const v1Runtime = { revision: "vela-host-runtime-v1", json: {}, context: {}, reload() {} };
    const v1Realm = makeFullHostRealm({ AEToolbox: { __velaHostRuntimeV1: v1Runtime } });
    expectCode(() => runFullHost(v1Realm), "VELA_HOST_RUNTIME_CONFLICT", "An existing v1 runtime must not be adopted by the v4 loader.");
    check(v1Realm.AEToolbox.__velaHostRuntimeV1 === v1Runtime, "The v4 loader must not overwrite an existing v1 runtime.");
    const v2Runtime = { revision: "vela-host-runtime-v2", json: {}, context: {}, reload() {} };
    const v2Realm = makeFullHostRealm({ AEToolbox: { __velaHostRuntimeV1: v2Runtime } });
    expectCode(() => runFullHost(v2Realm), "VELA_HOST_RUNTIME_CONFLICT", "An existing v2 runtime must not be adopted by the v4 loader.");
    check(v2Realm.AEToolbox.__velaHostRuntimeV1 === v2Runtime, "The v4 loader must not overwrite an existing v2 runtime.");
    let v3Calls = 0;
    const v3Json = { revision: "vela-json-host-v1", parseBounded() { v3Calls += 1; }, stringifyBounded() { v3Calls += 1; }, utf8ByteLength() { v3Calls += 1; } };
    const v3Context = { hostAdapterRevision: "vela-context-host-v3", handle() { v3Calls += 1; }, reload() { v3Calls += 1; } };
    const v3Runtime = { revision: "vela-host-runtime-v3", json: v3Json, context: v3Context, reload() { v3Calls += 1; } };
    const v3Realm = makeFullHostRealm({ AEToolbox: { __velaHostRuntimeV1: v3Runtime, VelaJson: v3Json, VelaContext: v3Context } });
    expectCode(() => runFullHost(v3Realm), "VELA_HOST_RUNTIME_CONFLICT", "An existing complete v3 runtime must conflict with the v4 loader.");
    check(v3Realm.AEToolbox.__velaHostRuntimeV1 === v3Runtime && v3Realm.AEToolbox.VelaJson === v3Json && v3Realm.AEToolbox.VelaContext === v3Context && v3Calls === 0, "A v3 conflict must not call or replace legacy runtime aliases or publish partial v4 state.");

    ["VelaJson", "VelaContext", "VelaExecution"].forEach((name) => {
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
    check(failedRealm.AEToolbox.__velaHostRuntimeV1 === undefined && failedRealm.AEToolbox.VelaJson === undefined && failedRealm.AEToolbox.VelaContext === undefined && failedRealm.AEToolbox.VelaExecution === undefined, "A construction failure must leave no runtime, JSON, Context or Execution globals.");
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

    const reloadOverflowRealm = makeFullHostRealm();
    const reloadOverflowReplacements = {};
    reloadOverflowReplacements[path.normalize(CONTEXT_PATH)] = contextSource.replace("var hostReloadEpoch = 1;", "var hostReloadEpoch = 1000000;");
    runFullHost(reloadOverflowRealm, reloadOverflowReplacements);
    const reloadOverflowRuntime = reloadOverflowRealm.AEToolbox.__velaHostRuntimeV1;
    expectCode(() => runFullHost(reloadOverflowRealm, reloadOverflowReplacements), "HOST_CONTEXT_SESSION_RESET_REQUIRED", "Host reload epoch overflow must fail closed with a stable code.");
    check(reloadOverflowRealm.AEToolbox.__velaHostRuntimeV1 === reloadOverflowRuntime, "Reload overflow must preserve the installed runtime without partial replacement.");
}

try {
    runJsonTests();
    runAeArrayProfileTests();
    runHostStageDiagnosticsTests();
    runProjectReferenceLifetimeTests();
    runFacadeTests();
    runTierTwoTests();
    runTierThreeTests();
    runPropertyValueTests();
    runStaticTests();
    runRuntimeReloadTests();
    console.log("PASS Vela context Host: " + assertions + " assertions.");
} catch (error) {
    console.error("FAIL Vela context Host - " + error.message + "\n" + (error.stack || ""));
    process.exitCode = 1;
}
