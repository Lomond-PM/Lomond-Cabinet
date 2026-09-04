#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const VELA = path.join(ROOT, "client", "js", "vela");
const mainSource = fs.readFileSync(path.join(ROOT, "client", "js", "main.js"), "utf8");
const MODULES = [
    "velaProtocol.js",
    "velaResponseParser.js",
    "velaCapabilityContracts.js",
    "velaLogicalPlanContracts.js",
    "velaProviderRequestBranchPolicy.js",
    "velaCapabilityPromptBuilder.js",
    "velaProviderAdapter.js",
    "velaProviderIntentGate.js",
    "velaLocalTransport.js",
    "velaContext.js",
    "velaValidator.js",
    "velaPlan.js",
    "velaExecutionGuard.js",
    "velaContextBridge.js",
    "velaExecutionPreflight.js",
    "velaExecutionAdapter.js",
    "velaController.js",
    "velaProviderController.js",
    "velaProviderProposalRouter.js",
    "velaAuthorizedPlanMaterializer.js",
    "velaTaskRun.js",
    "velaPlanReviewProjection.js",
    "velaPlanController.js",
    "velaConfirmedAuthorityComposer.js",
    "velaReviewRuntimePort.js",
    "velaRuntime.js"
];
let assertions = 0;

function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}

function sameDescriptor(left, right) {
    if (left === right) return true;
    if (!left || !right || left.configurable !== right.configurable || left.enumerable !== right.enumerable) return false;
    if (Object.prototype.hasOwnProperty.call(left, "value") || Object.prototype.hasOwnProperty.call(right, "value")) {
        return Object.prototype.hasOwnProperty.call(left, "value") && Object.prototype.hasOwnProperty.call(right, "value") && left.writable === right.writable && left.value === right.value;
    }
    return left.get === right.get && left.set === right.set;
}

function browserContext() {
    let requireCalls = 0;
    const moduleSentinel = { exports: { sentinel: true } };
    const exportsSentinel = moduleSentinel.exports;
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
        crypto: { getRandomValues(values) { for (let index = 0; index < values.length; index += 1) values[index] = index + 1; return values; } },
        module: moduleSentinel,
        exports: exportsSentinel,
        require() { requireCalls += 1; throw new Error("Browser module path must not require."); }
    };
    context.VelaLegacyAuthorityBridge = Object.freeze({ createActionCandidateFromLocalProposal() {}, decide() {} });
    context.window = context;
    context.self = context;
    const sandbox = vm.createContext(context);
    return {
        context,
        sandbox,
        moduleSentinel,
        exportsSentinel,
        requireCalls() { return requireCalls; },
        descriptors() {
            return {
                module: Object.getOwnPropertyDescriptor(context, "module"),
                exports: Object.getOwnPropertyDescriptor(context, "exports"),
                require: Object.getOwnPropertyDescriptor(context, "require")
            };
        }
    };
}

function runBrowserModule(browser, filename) {
    return vm.runInContext(fs.readFileSync(path.join(VELA, filename), "utf8"), browser.sandbox, { filename });
}

function providerControllerDependencyBrowser(fault) {
    const browser = browserContext();
    const registry = Object.create(null);
    const exportsByName = {
        VelaProtocol: Object.freeze({ isTrustedProtocol() {} }),
        VelaContextBridge: Object.freeze({ createProviderContextPort() {}, isTrustedContextBridgeForProtocol() {} }),
        VelaCapabilityContracts: Object.freeze({ getModelProjection() {} }),
        VelaProviderRequestBranchPolicy: Object.freeze({ createRequestBranchPolicy() {} }),
        VelaProviderAdapter: Object.freeze({ createLocalOpenAICompatibleProvider() {} }),
        VelaLocalTransport: Object.freeze({ isTrustedLocalTransportForProtocol() {} }),
        VelaProviderIntentGate: Object.freeze({ evaluate() {}, evaluateLogicalPlan() {} }),
        VelaLogicalPlanContracts: Object.freeze({ validateLogicalPlanProposal() {} })
    };
    Object.keys(exportsByName).forEach((name) => {
        registry[name] = exportsByName[name];
        if (fault && fault.name === name && fault.kind === "accessor") {
            Object.defineProperty(browser.context, name, { configurable: false, enumerable: true, get() { throw new Error("must not invoke dependency global getter"); } });
        } else if (!(fault && fault.name === name && fault.kind === "inherited")) {
            Object.defineProperty(browser.context, name, { configurable: false, enumerable: true, value: exportsByName[name], writable: false });
        }
    });
    if (fault && fault.kind === "inherited") {
        Object.setPrototypeOf(browser.context, { [fault.name]: exportsByName[fault.name] });
    }
    if (fault && fault.kind === "identity") {
        registry[fault.name] = Object.freeze({ createRequestBranchPolicy() {} });
    }
    const bootstrap = Object.freeze({
        getModule(name) { return registry[name]; },
        hasModule(name) { return Object.prototype.hasOwnProperty.call(registry, name); },
        registerModule(name, value) { registry[name] = value; }
    });
    Object.defineProperty(browser.context, "__velaProtocolCoreBootstrapV1", { configurable: false, enumerable: false, value: bootstrap, writable: false });
    return browser;
}

function run() {
    const browser = browserContext();
    const before = browser.descriptors();
    runBrowserModule(browser, "velaActivationPolicy.js");
    Object.defineProperty(browser.context, "VelaPlanningContracts", { configurable: false, enumerable: true, value: require("../client/js/vela/velaPlanningContracts"), writable: false });
    MODULES.forEach((filename) => runBrowserModule(browser, filename));
    const bootstrap = browser.context.__velaProtocolCoreBootstrapV1;
    check(bootstrap && Object.isFrozen(bootstrap), "A self-referential browser global creates the exact Vela bootstrap even when CommonJS globals exist.");
    ["VelaProtocol", "VelaResponseParser", "VelaCapabilityContracts", "VelaLogicalPlanContracts", "VelaProviderRequestBranchPolicy", "VelaCapabilityPromptBuilder", "VelaProviderAdapter", "VelaProviderIntentGate", "VelaLocalTransport", "VelaContext", "VelaValidator", "VelaPlan", "VelaExecutionGuard", "VelaContextBridge", "VelaExecutionPreflight", "VelaExecutionAdapter", "VelaController", "VelaProviderController", "VelaProviderProposalRouter", "VelaRuntime"].forEach((name) => {
        check(bootstrap.getModule(name) === browser.context[name] && Object.isFrozen(browser.context[name]), name + " registers through the browser bootstrap.");
    });
    ["VelaAuthorizedPlanMaterializer", "VelaTaskRun", "VelaPlanReviewProjection", "VelaPlanController", "VelaConfirmedAuthorityComposer", "VelaReviewRuntimePort"].forEach((name) => { check(Object.isFrozen(browser.context[name]), name + " registers as a frozen CEP browser global before Runtime."); });
    check(browser.requireCalls() === 0, "Browser-first registration never calls require.");
    check(browser.context.VelaRuntime && browser.context.VelaActivationPolicy.isTrustedPolicy(browser.context.VelaRuntime.createRuntime({}).getStatus().activationPolicy), "Browser Runtime closes over the exact source-owned activation policy rather than a caller option.");
    check(browser.context.module === browser.moduleSentinel && browser.context.module.exports === browser.exportsSentinel && browser.context.exports === browser.exportsSentinel, "Browser registration never changes CommonJS object identities.");
    const after = browser.descriptors();
    check(sameDescriptor(before.module, after.module) && sameDescriptor(before.exports, after.exports) && sameDescriptor(before.require, after.require), "Browser registration preserves CommonJS descriptors exactly.");

    const partial = browserContext();
    partial.context.VelaProtocol = Object.freeze({ fake: true });
    let partialCode = null;
    try { runBrowserModule(partial, "velaProtocol.js"); } catch (error) { partialCode = error && error.code; }
    check(partialCode === "MODULE_BOOTSTRAP_CONFLICT" && partial.context.__velaProtocolCoreBootstrapV1 === undefined, "A fake browser global is rejected without creating a bootstrap.");

    const fakeBootstrap = browserContext();
    fakeBootstrap.context.__velaProtocolCoreBootstrapV1 = Object.freeze({ getModule() {}, hasModule() {}, registerModule() {} });
    let bootstrapCode = null;
    try { runBrowserModule(fakeBootstrap, "velaProtocol.js"); } catch (error) { bootstrapCode = error && error.code; }
    check(bootstrapCode === "MODULE_BOOTSTRAP_CONFLICT" && fakeBootstrap.context.VelaProtocol === undefined, "A preempted bootstrap is never adopted.");

    const dependencyCases = [
        { kind: "identity", name: "VelaProviderRequestBranchPolicy" },
        { kind: "accessor", name: "VelaCapabilityContracts" },
        { kind: "inherited", name: "VelaProviderIntentGate" }
    ];
    dependencyCases.forEach((fault) => {
        const dependencyBrowser = providerControllerDependencyBrowser(fault);
        let dependencyCode = null;
        try { runBrowserModule(dependencyBrowser, "velaProviderController.js"); } catch (error) { dependencyCode = error && error.code; }
        check(dependencyCode === "RUNTIME_CAPABILITY_UNAVAILABLE" && dependencyBrowser.context.VelaProviderController === undefined, "ProviderController fails closed for " + fault.kind + " " + fault.name + " dependency globals.");
    });

    const protocol = require(path.join(VELA, "velaProtocol.js"));
    const parser = require(path.join(VELA, "velaResponseParser.js"));
    const providerAdapter = require(path.join(VELA, "velaProviderAdapter.js"));
    const providerIntentGate = require(path.join(VELA, "velaProviderIntentGate.js"));
    const requestBranchPolicy = require(path.join(VELA, "velaProviderRequestBranchPolicy.js"));
    const localTransport = require(path.join(VELA, "velaLocalTransport.js"));
    const context = require(path.join(VELA, "velaContext.js"));
    const validator = require(path.join(VELA, "velaValidator.js"));
    const plan = require(path.join(VELA, "velaPlan.js"));
    const guard = require(path.join(VELA, "velaExecutionGuard.js"));
    const bridge = require(path.join(VELA, "velaContextBridge.js"));
    const preflight = require(path.join(VELA, "velaExecutionPreflight.js"));
    const executionAdapter = require(path.join(VELA, "velaExecutionAdapter.js"));
    const controller = require(path.join(VELA, "velaController.js"));
    const providerController = require(path.join(VELA, "velaProviderController.js"));
    const proposalRouter = require(path.join(VELA, "velaProviderProposalRouter.js"));
    const runtime = require(path.join(VELA, "velaRuntime.js"));
    check(typeof protocol.createProtocol === "function" && typeof parser.createResponseParser === "function" && typeof requestBranchPolicy.createRequestBranchPolicy === "function" && typeof providerAdapter.createLocalOpenAICompatibleProvider === "function" && typeof providerIntentGate.evaluate === "function" && typeof localTransport.createLocalTransport === "function" && typeof context.createContextApi === "function" && typeof validator.createActionValidator === "function" && typeof plan.createPlanStore === "function" && typeof guard.createExecutionGuard === "function" && typeof bridge.createContextBridge === "function" && typeof preflight.createExecutionPreflight === "function" && typeof executionAdapter.createExecutionAdapter === "function" && typeof controller.createController === "function" && typeof providerController.createProviderController === "function" && typeof proposalRouter.createProposalRouter === "function" && typeof runtime.createRuntime === "function", "Modules continue to export their fixed CommonJS APIs without a browser window.");
    check(/ConfirmationView:\s*window\.VelaConfirmationView/.test(mainSource) && /typeof window\.VelaConfirmationView\.create !== "function"/.test(mainSource), "Production Surface bootstrap injects and validates the UI-C ConfirmationView factory before Controller creation.");
    check(/function reportVelaSurfaceInitializationError\(\)[\s\S]*SURFACE_BOOTSTRAP_UNAVAILABLE/.test(mainSource) && /transaction\.candidate\.initialize\(\)[\s\S]*velaRuntimeController = transaction\.candidate;[\s\S]*initializeVelaSurfaceController\(\);[\s\S]*reportVelaRuntimeError\(error\);/.test(mainSource), "Runtime candidates commit only after initialization while Runtime and Surface bootstrap failures retain distinct error boundaries.");

    console.log("test-vela-browser-bootstrap: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
