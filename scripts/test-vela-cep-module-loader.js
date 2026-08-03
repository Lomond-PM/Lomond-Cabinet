#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const VELA = path.join(ROOT, "client", "js", "vela");
const loaderSource = fs.readFileSync(path.join(VELA, "velaCepModuleLoader.js"), "utf8");
let assertions = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(promise, code, message) {
    await assert.rejects(Promise.resolve(promise), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function makeBrowser(options) {
    options = options || {};
    const timers = new Map();
    let nextTimer = 0;
    const context = {
        Promise,
        Set,
        Map,
        WeakMap,
        WeakSet,
        Uint8Array,
        JSON,
        Math,
        Number,
        String,
        Array,
        RegExp,
        Error,
        Date,
        console: { log() {}, warn() {} },
        setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        crypto: { getRandomValues(values) { for (let index = 0; index < values.length; index += 1) values[index] = index + 1; return values; } }
    };
    context.window = context;
    context.self = context;
    const document = {
        currentScript: { src: options.loaderSrc || "file:///C:/extension/client/js/vela/velaCepModuleLoader.js?v=test" },
        head: null,
        documentElement: null,
        createElement() { return { parentNode: null, async: true, onload: null, onerror: null, src: "" }; }
    };
    let appendCount = 0;
    const requestedUrls = [];
    const host = {
        appendChild(script) {
            appendCount += 1;
            requestedUrls.push(script.src);
            script.parentNode = host;
            const filename = script.src.split("?")[0].slice(script.src.split("?")[0].lastIndexOf("/") + 1);
            if (options.failFile === filename) { script.onerror(); return script; }
            if (options.timeoutFile === filename) { return script; }
            try {
                vm.runInContext(options.moduleSources && Object.prototype.hasOwnProperty.call(options.moduleSources, filename) ? options.moduleSources[filename] : fs.readFileSync(path.join(VELA, filename), "utf8"), sandbox, { filename });
                script.onload();
            } catch (error) {
                script.onerror();
            }
            return script;
        },
        removeChild(script) { script.parentNode = null; }
    };
    document.head = host;
    context.document = document;
    if (options.moduleDescriptor) Object.defineProperty(context, "module", options.moduleDescriptor);
    if (options.exportsDescriptor) Object.defineProperty(context, "exports", options.exportsDescriptor);
    if (options.requireDescriptor) Object.defineProperty(context, "require", options.requireDescriptor);
    const sandbox = vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(VELA, "velaActivationPolicy.js"), "utf8"), sandbox, { filename: "velaActivationPolicy.js" });
    vm.runInContext(loaderSource, sandbox, { filename: "velaCepModuleLoader.js" });
    return { context, sandbox, timers, document, getAppendCount() { return appendCount; }, requestedUrls };
}

function policyModuleSource(expression) {
    return "(function () { var value = " + expression + "; window.__velaProtocolCoreBootstrapV1.registerModule('VelaProviderRequestBranchPolicy', value); Object.defineProperty(window, 'VelaProviderRequestBranchPolicy', { configurable: false, enumerable: true, value: value, writable: false }); }());";
}

async function expectPolicyShapeFailure(expression, message) {
    const browser = makeBrowser({ moduleSources: { "velaProviderRequestBranchPolicy.js": policyModuleSource(expression) } });
    await expectCode(browser.context.VelaCepModuleLoader.load(), "MODULE_BOOTSTRAP_CONFLICT", message);
    check(browser.getAppendCount() === 4 && browser.context.VelaCapabilityPromptBuilder === undefined && browser.context.VelaProviderAdapter === undefined, message + " stops before dependent modules.");
    return browser;
}

async function run() {
    const moduleSentinel = { exports: { sentinel: true } };
    const exportsSentinel = moduleSentinel.exports;
    const browser = makeBrowser({
        moduleDescriptor: { configurable: true, enumerable: false, writable: true, value: moduleSentinel },
        exportsDescriptor: { configurable: true, enumerable: true, writable: true, value: exportsSentinel },
        requireDescriptor: { configurable: true, enumerable: false, writable: true, value: function () { throw new Error("must not call require"); } }
    });
    const beforeModule = Object.getOwnPropertyDescriptor(browser.context, "module");
    const beforeExports = Object.getOwnPropertyDescriptor(browser.context, "exports");
    const beforeRequire = Object.getOwnPropertyDescriptor(browser.context, "require");
    check(browser.context.VelaCepModuleLoader.getStatus().state === "idle", "Loader status starts idle without exposing instances.");
    check(browser.document.currentScript && browser.document.currentScript.src.indexOf("velaCepModuleLoader.js?v=test") !== -1, "Loader captures its own script URL while the synchronous script context is available.");
    browser.document.scripts = [{ src: "file:///C:/unrelated/a.js" }, { src: "file:///C:/unrelated/velaCepModuleLoader.js" }];
    browser.document.currentScript = null;
    const concurrentA = browser.context.VelaCepModuleLoader.load();
    const concurrentB = browser.context.VelaCepModuleLoader.load();
    check(concurrentA === concurrentB, "Concurrent loader calls share one Promise.");
    const result = await concurrentA;
    check(result.ok === true && result.state === "ready", "Loader reaches ready state.");
    check(Object.isFrozen(browser.context.VelaCepModuleLoader.getStatus()) && browser.context.VelaCepModuleLoader.getStatus().state === "ready" && browser.context.VelaCepModuleLoader.getStatus().lastErrorCode === null, "Loader exposes only a frozen ready diagnostic snapshot.");
    check(Object.isFrozen(result) && Object.isFrozen(result.modules), "Loader result is frozen.");
    check(result.modules.length === 19 && result.modules[2] === "VelaCapabilityContracts" && result.modules[3] === "VelaProviderRequestBranchPolicy" && result.modules[4] === "VelaCapabilityPromptBuilder" && result.modules[6] === "VelaProviderIntentGate" && result.modules[result.modules.length - 1] === "VelaRuntime" && result.modules[result.modules.length - 2] === "VelaProviderProposalRouter" && result.modules[result.modules.length - 3] === "VelaProviderController", "Loader returns bounded dependency order.");
    check(browser.context.__velaProtocolCoreBootstrapV1.getModule("VelaProtocol") === browser.context.VelaProtocol, "Protocol uses the browser bootstrap identity.");
    check(browser.context.__velaProtocolCoreBootstrapV1.getModule("VelaRuntime") === browser.context.VelaRuntime, "Runtime uses the browser bootstrap identity.");
    check(Object.isFrozen(browser.context.VelaRuntime), "Runtime browser module is frozen.");
    const policyExport = browser.context.VelaProviderRequestBranchPolicy;
    const policyProfiles = Object.getOwnPropertyDescriptor(policyExport, "PROFILES").value;
    check(Object.isFrozen(policyExport) && Object.isFrozen(policyProfiles) && Object.getOwnPropertyDescriptor(policyExport, "PROFILES").writable === false && Object.getOwnPropertyDescriptor(policyExport, "PROFILES").configurable === false && typeof Object.getOwnPropertyDescriptor(policyExport, "createRequestBranchPolicy").value === "function" && Object.getOwnPropertyDescriptor(policyExport, "createRequestBranchPolicy").writable === false && Object.getOwnPropertyDescriptor(policyExport, "createRequestBranchPolicy").configurable === false, "The production Request Branch Policy export has frozen own data descriptors.");
    check(JSON.stringify(Object.getOwnPropertyNames(policyProfiles).sort()) === JSON.stringify(["EXPLICIT_EDIT_ELIGIBLE", "TEXT_ONLY"]) && Object.getOwnPropertySymbols(policyProfiles).length === 0 && Object.getOwnPropertyDescriptor(policyProfiles, "TEXT_ONLY").value === "text-only" && Object.getOwnPropertyDescriptor(policyProfiles, "EXPLICIT_EDIT_ELIGIBLE").value === "explicit-edit-eligible", "The production Request Branch Policy profiles have exactly the frozen supported constants.");
    check(browser.context.module === moduleSentinel && browser.context.module.exports === exportsSentinel, "module identity is restored.");
    check(browser.context.exports === exportsSentinel, "exports identity is restored.");
    check(browser.context.require === beforeRequire.value, "require identity is restored.");
    check(JSON.stringify(Object.getOwnPropertyDescriptor(browser.context, "module")) === JSON.stringify(beforeModule), "module descriptor is restored exactly.");
    check(JSON.stringify(Object.getOwnPropertyDescriptor(browser.context, "exports")) === JSON.stringify(beforeExports), "exports descriptor is restored exactly.");
    check(JSON.stringify(Object.getOwnPropertyDescriptor(browser.context, "require")) === JSON.stringify(beforeRequire), "require descriptor is restored exactly.");
    check(await browser.context.VelaCepModuleLoader.load() === result, "Ready loader calls return the same result.");
    check(Object.getOwnPropertyDescriptor(browser.context, "CSInterface") === undefined, "Loader does not create CSInterface state.");
    check(Object.getOwnPropertyDescriptor(browser.context, "__adobe_cep__") === undefined, "Loader does not create Adobe CEP state.");
    check(browser.getAppendCount() === 19, "Loader injects each protected module exactly once.");
    check(browser.requestedUrls[0] === "file:///C:/extension/client/js/vela/velaProtocol.js?v=test", "The captured loader base and cache query produce VelaProtocol as the first request after currentScript is cleared.");
    check(JSON.stringify(browser.requestedUrls) === JSON.stringify([
        "file:///C:/extension/client/js/vela/velaProtocol.js?v=test",
        "file:///C:/extension/client/js/vela/velaResponseParser.js?v=test",
        "file:///C:/extension/client/js/vela/velaCapabilityContracts.js?v=test",
        "file:///C:/extension/client/js/vela/velaProviderRequestBranchPolicy.js?v=test",
        "file:///C:/extension/client/js/vela/velaCapabilityPromptBuilder.js?v=test",
        "file:///C:/extension/client/js/vela/velaProviderAdapter.js?v=test",
        "file:///C:/extension/client/js/vela/velaProviderIntentGate.js?v=test",
        "file:///C:/extension/client/js/vela/velaLocalTransport.js?v=test",
        "file:///C:/extension/client/js/vela/velaContext.js?v=test",
        "file:///C:/extension/client/js/vela/velaValidator.js?v=test",
        "file:///C:/extension/client/js/vela/velaPlan.js?v=test",
        "file:///C:/extension/client/js/vela/velaExecutionGuard.js?v=test",
        "file:///C:/extension/client/js/vela/velaContextBridge.js?v=test",
        "file:///C:/extension/client/js/vela/velaExecutionPreflight.js?v=test",
        "file:///C:/extension/client/js/vela/velaExecutionAdapter.js?v=test",
        "file:///C:/extension/client/js/vela/velaController.js?v=test",
        "file:///C:/extension/client/js/vela/velaProviderController.js?v=test",
        "file:///C:/extension/client/js/vela/velaProviderProposalRouter.js?v=test",
        "file:///C:/extension/client/js/vela/velaRuntime.js?v=test"
    ]), "Captured location preserves the fixed module order and cache query without inspecting unrelated scripts.");

    check(!Object.prototype.hasOwnProperty.call(browser.context, "velaRuntimeController"), "Browser module path never publishes a runtime instance.");

    const absent = makeBrowser();
    await absent.context.VelaCepModuleLoader.load();
    check(!Object.prototype.hasOwnProperty.call(absent.context, "module"), "Absent module remains absent after load.");
    check(!Object.prototype.hasOwnProperty.call(absent.context, "exports"), "Absent exports remains absent after load.");
    check(!Object.prototype.hasOwnProperty.call(absent.context, "require"), "Absent require remains absent after load.");

    const failed = makeBrowser({ failFile: "velaContext.js" });
    await expectCode(failed.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Module load error fails closed.");
    await expectCode(failed.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Failed loader remains failed until reload.");
    check(failed.context.VelaCepModuleLoader.getStatus().state === "failed" && failed.context.VelaCepModuleLoader.getStatus().lastErrorCode === "RUNTIME_CAPABILITY_UNAVAILABLE", "Failed loader caches a bounded diagnostic error code.");
    check(!failed.context.VelaRuntime, "Failed loader does not create the runtime module.");

    const missingPolicy = makeBrowser({ failFile: "velaProviderRequestBranchPolicy.js" });
    await expectCode(missingPolicy.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "A missing Request Branch Policy fails closed before Prompt Builder loading.");
    check(missingPolicy.getAppendCount() === 4 && missingPolicy.context.VelaCapabilityPromptBuilder === undefined, "A missing Request Branch Policy never proceeds to dependent modules.");
    const inertFactory = makeBrowser({ moduleSources: { "velaProviderRequestBranchPolicy.js": policyModuleSource("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), createRequestBranchPolicy: function () { window.__policyFactoryCalls = (window.__policyFactoryCalls || 0) + 1; } })") } });
    await inertFactory.context.VelaCepModuleLoader.load();
    check((inertFactory.context.__policyFactoryCalls || 0) === 0, "Loader validates a legal Policy export without creating a Policy instance.");
    await expectPolicyShapeFailure("Object.freeze({})", "A Request Branch Policy missing PROFILES and factory fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: null, createRequestBranchPolicy: function () {} })", "A null PROFILES value fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: { TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }, createRequestBranchPolicy: function () {} })", "An unfrozen PROFILES value fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), createRequestBranchPolicy: function () {} })", "Missing TEXT_ONLY fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only' }), createRequestBranchPolicy: function () {} })", "Missing EXPLICIT_EDIT_ELIGIBLE fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'wrong', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), createRequestBranchPolicy: function () {} })", "A wrong TEXT_ONLY value fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'wrong' }), createRequestBranchPolicy: function () {} })", "A wrong EXPLICIT_EDIT_ELIGIBLE value fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible', EXTRA: 'x' }), createRequestBranchPolicy: function () {} })", "An extra enumerable profile key fails closed.");
    await expectPolicyShapeFailure("(function(){ var p = { TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }; Object.defineProperty(p, 'hidden', { value: 'x', enumerable: false }); Object.freeze(p); return Object.freeze({ PROFILES: p, createRequestBranchPolicy: function () {} }); }())", "A hidden profile key fails closed.");
    await expectPolicyShapeFailure("(function(){ var p = { TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }; p[Symbol('hidden')] = 'x'; Object.freeze(p); return Object.freeze({ PROFILES: p, createRequestBranchPolicy: function () {} }); }())", "A symbol profile key fails closed.");
    await expectPolicyShapeFailure("(function(){ var p = Object.create({ TEXT_ONLY: 'text-only' }); Object.defineProperty(p, 'EXPLICIT_EDIT_ELIGIBLE', { value: 'explicit-edit-eligible', enumerable: true }); Object.freeze(p); return Object.freeze({ PROFILES: p, createRequestBranchPolicy: function () {} }); }())", "An inherited profile key fails closed.");
    const profilesGetter = await expectPolicyShapeFailure("(function(){ var e = { createRequestBranchPolicy: function () {} }; Object.defineProperty(e, 'PROFILES', { enumerable: true, get: function () { window.__policyGetterCalls = (window.__policyGetterCalls || 0) + 1; return null; }, set: function () { window.__policySetterCalls = (window.__policySetterCalls || 0) + 1; } }); Object.freeze(e); return e; }())", "A getter/setter-backed PROFILES value fails closed.");
    check((profilesGetter.context.__policyGetterCalls || 0) === 0, "PROFILES getter is never invoked.");
    check((profilesGetter.context.__policySetterCalls || 0) === 0, "PROFILES setter is never invoked.");
    const profileGetter = await expectPolicyShapeFailure("(function(){ var p = {}; Object.defineProperty(p, 'TEXT_ONLY', { enumerable: true, get: function () { window.__policyGetterCalls = (window.__policyGetterCalls || 0) + 1; return 'text-only'; }, set: function () { window.__policySetterCalls = (window.__policySetterCalls || 0) + 1; } }); Object.defineProperty(p, 'EXPLICIT_EDIT_ELIGIBLE', { value: 'explicit-edit-eligible', enumerable: true }); Object.freeze(p); return Object.freeze({ PROFILES: p, createRequestBranchPolicy: function () {} }); }())", "A getter/setter-backed profile value fails closed.");
    check((profileGetter.context.__policyGetterCalls || 0) === 0, "Profile getter is never invoked.");
    check((profileGetter.context.__policySetterCalls || 0) === 0, "Profile setter is never invoked.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }) })", "A missing factory fails closed.");
    await expectPolicyShapeFailure("Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), createRequestBranchPolicy: 'not-a-function' })", "A non-function factory fails closed.");
    await expectPolicyShapeFailure("(function(){ var e = Object.create({ createRequestBranchPolicy: function () {} }); Object.defineProperty(e, 'PROFILES', { value: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), enumerable: true }); Object.freeze(e); return e; }())", "An inherited factory fails closed.");
    const factoryGetter = await expectPolicyShapeFailure("(function(){ var e = {}; Object.defineProperty(e, 'PROFILES', { value: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), enumerable: true }); Object.defineProperty(e, 'createRequestBranchPolicy', { enumerable: true, get: function () { window.__policyGetterCalls = (window.__policyGetterCalls || 0) + 1; return function () {}; }, set: function () { window.__policySetterCalls = (window.__policySetterCalls || 0) + 1; } }); Object.freeze(e); return e; }())", "A getter/setter-backed factory fails closed.");
    check((factoryGetter.context.__policyGetterCalls || 0) === 0, "Factory getter is never invoked.");
    check((factoryGetter.context.__policySetterCalls || 0) === 0, "Factory setter is never invoked.");
    await expectPolicyShapeFailure("({ PROFILES: Object.freeze({ TEXT_ONLY: 'text-only', EXPLICIT_EDIT_ELIGIBLE: 'explicit-edit-eligible' }), createRequestBranchPolicy: function () {} })", "An unfrozen Request Branch Policy export fails closed.");

    const timeout = makeBrowser({ timeoutFile: "velaProtocol.js" });
    const timeoutPromise = timeout.context.VelaCepModuleLoader.load();
    await Promise.resolve();
    await Promise.resolve();
    timeout.timers.forEach((callback) => callback());
    await expectCode(timeoutPromise, "RUNTIME_CAPABILITY_UNAVAILABLE", "Module timeout fails closed.");
    check(!timeout.context.VelaProtocol, "Timed-out module does not register a partial protocol facade.");

    const partial = makeBrowser();
    Object.defineProperty(partial.context, "VelaProtocol", { configurable: true, enumerable: true, writable: true, value: Object.freeze({}) });
    await expectCode(partial.context.VelaCepModuleLoader.load(), "MODULE_BOOTSTRAP_CONFLICT", "Pre-existing facade fails closed.");

    const accessorValue = { exports: { accessor: true } };
    const accessor = makeBrowser({ moduleDescriptor: { configurable: true, enumerable: true, get() { return accessorValue; } } });
    const accessorBefore = Object.getOwnPropertyDescriptor(accessor.context, "module");
    await accessor.context.VelaCepModuleLoader.load();
    const accessorAfter = Object.getOwnPropertyDescriptor(accessor.context, "module");
    check(accessorAfter.get === accessorBefore.get && accessorAfter.enumerable === accessorBefore.enumerable && accessorAfter.configurable === accessorBefore.configurable, "Accessor descriptor is restored exactly.");

    const invalidLocation = makeBrowser({ loaderSrc: "file:///C:/extension/client/js/vela/not-the-loader.js?v=bad" });
    invalidLocation.document.currentScript = null;
    await expectCode(invalidLocation.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "An invalid synchronous loader URL fails closed.");
    check(invalidLocation.getAppendCount() === 0, "An invalid loader URL injects no protected module.");

    console.log("test-vela-cep-module-loader: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
