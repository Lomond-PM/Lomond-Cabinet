#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "client", "js", "main.js"), "utf8");
const start = source.indexOf("    function reportVelaRuntimeError(error) {");
const end = source.indexOf("    function playAnimation(", start);
let assertions = 0;

function check(value, message) { assertions += 1; assert.ok(value, message); }
async function flush() { for (let index = 0; index < 8; index += 1) await Promise.resolve(); }

function actionSlot() {
    return {
        children: [],
        get firstChild() { return this.children.length ? this.children[0] : null; },
        appendChild(node) { this.children.push(node); return node; },
        removeChild(node) { const index = this.children.indexOf(node); if (index >= 0) this.children.splice(index, 1); return node; }
    };
}

function harness(options) {
    options = options || {};
    const warnings = [];
    const slot = actionSlot();
    const calls = { runtimeCreate: 0, runtimeInitialize: 0, runtimeDispose: 0, surfaceCreate: 0, surfaceMount: 0, surfaceDispose: 0, runtimeOptions: null, surfaceOptions: null, resolveFirst: null, rejectFirst: null };
    const policy = Object.freeze({ releaseMode: "experimental-preview", experimentalOptInAllowed: true, productionEnabled: false, productionBlockReason: "no-qualified-default-model", qualifiedDefaultModelId: null, legacyFallbackRetained: false, formalUiD2Enabled: false, moduleRevision: "vela-activation-policy-v2" });
    const activationModule = Object.freeze({ getPolicy() { return policy; }, isTrustedPolicy(value) { return value === policy; } });
    function runtimeCandidate(ordinal) {
        let disposed = false;
        return Object.freeze({
            initialize() {
                calls.runtimeInitialize += 1;
                if (options.deferFirst && ordinal === 1) return new Promise((resolve, reject) => { calls.resolveFirst = resolve; calls.rejectFirst = reject; });
                return options.runtimeFailure && ordinal === 1 ? Promise.reject({ code: "SCHEMA_VALIDATION_FAILED" }) : Promise.resolve({ ok: true });
            },
            getStatus() { return Object.freeze({ state: disposed ? "disposed" : "ready", initialized: !disposed, disposed, activationPolicy: policy }); },
            dispose() { if (disposed) return false; disposed = true; calls.runtimeDispose += 1; return true; },
            sendProviderMessage() {}, checkProviderReadiness() {}, cancelProviderRequest() {}, getProviderSurfaceState() { return Object.freeze({ state: "idle" }); },
            reviewProviderProposal() {}, approveActiveCandidate() {}, rejectActiveCandidate() {}, getConfirmationSurfaceState() { return Object.freeze({ state: "idle" }); }
        });
    }
    const runtime = runtimeCandidate(1);
    const controllerModule = {
        create(createOptions) {
            calls.surfaceOptions = createOptions;
            calls.surfaceCreate += 1;
            if (options.surfaceConstructorFailure) throw new Error("private constructor detail");
            return {
                mount() {
                    calls.surfaceMount += 1;
                    if (options.surfaceMountFailure) { slot.appendChild({ type: "button" }); throw new Error("private mount detail"); }
                    ["send", "cancel", "review", "approve", "reject"].forEach((name) => slot.appendChild({ type: name }));
                    return true;
                },
                configureExperimental() {}, getExperimentalState() { return { state: "disabled", enabled: false }; },
                dispose() { calls.surfaceDispose += 1; }
            };
        }
    };
    const context = {
        Promise,
        Error,
        console: { warn() { warnings.push(Array.prototype.join.call(arguments, " ")); } },
        panelShuttingDown: false,
        panelLifecycleGeneration: 1,
        coreBootstrapSnapshot: { state: "host-ready", generation: 1, hostReady: true },
        velaRuntimeInitTransaction: null,
        velaRuntimeLastAttemptCoreGeneration: null,
        velaRuntimeController: null,
        velaSurfaceShell: { getElementsForTest() { return { actionSlot: slot }; } },
        velaSurfaceController: null,
        velaSurfaceBootstrapState: "idle",
        velaSurfaceBootstrapRevision: 0,
        velaRuntimeStatusRevision: 0,
        velaRuntimeLastErrorCode: null,
        activeToolId: "shapeAdd",
        VelaProviderModel: "qwen3.5-4b",
        VelaProviderEndpoint: "http://127.0.0.1:1234",
        VelaExperimentalAcknowledged: true,
        configureVelaExperimentalSession() {},
        refreshVelaExperimentalSettings() {},
        tr(key) { return key; },
        invokeVelaHost() {}
    };
    context.window = context;
    context.window.VelaCepModuleLoader = { load() { return options.loaderFailure ? Promise.reject({ code: "RUNTIME_CAPABILITY_UNAVAILABLE" }) : Promise.resolve(); } };
    context.window.VelaActivationPolicy = activationModule;
    context.getVelaActivationPolicy = function () { return activationModule.getPolicy(); };
    context.window.VelaRuntime = { createRuntime(runtimeOptions) { calls.runtimeCreate += 1; calls.runtimeOptions = runtimeOptions; return calls.runtimeCreate === 1 ? runtime : runtimeCandidate(calls.runtimeCreate); } };
    context.window.VelaSurfaceController = controllerModule;
    context.window.VelaPresentationModel = { create() {} };
    context.window.VelaTranscriptView = { create() {} };
    context.window.VelaComposerView = { create() {} };
    if (!options.missingConfirmationView) context.window.VelaConfirmationView = { create() {} };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end) + "\nwindow.__testHooks = { initializeRuntime: initializeVelaRuntime, initializeSurface: initializeVelaSurfaceController, runtime: function () { return velaRuntimeController; }, runtimeError: function () { return velaRuntimeLastErrorCode; }, surfaceState: function () { return velaSurfaceBootstrapState; }, surfaceRevision: function () { return velaSurfaceBootstrapRevision; }, controller: function () { return velaSurfaceController; } };", context, { filename: "main-vela-bootstrap-boundary.js" });
    return { context, slot, calls, warnings, runtime };
}

async function run() {
    let test = harness();
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.context.__testHooks.runtime() === test.runtime && test.runtime.getStatus().state === "ready", "A successful Runtime bootstrap remains ready while Surface starts separately.");
    check(test.calls.surfaceCreate === 1 && test.calls.surfaceMount === 1 && test.slot.children.length === 5, "A complete Surface dependency graph creates the fixed five actions once.");
    check(test.context.__testHooks.surfaceState() === "ready" && test.context.__testHooks.runtimeError() === null, "Successful Surface bootstrap does not create a Runtime diagnostic.");
    check(!Object.prototype.hasOwnProperty.call(test.calls.runtimeOptions, "activationPolicy") && test.runtime.getStatus().activationPolicy === test.context.window.VelaActivationPolicy.getPolicy() && test.calls.surfaceOptions.ActivationPolicy === test.context.window.VelaActivationPolicy, "Runtime closes over and Surface receives the same source-owned activation policy identity without a caller injection option.");
    test.context.__testHooks.initializeSurface();
    check(test.calls.surfaceCreate === 1 && test.calls.surfaceMount === 1 && test.slot.children.length === 5, "Repeated Surface bootstrap is idempotent and does not duplicate action nodes.");

    test = harness({ missingConfirmationView: true });
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.context.__testHooks.runtime() === test.runtime && test.runtime.getStatus().state === "ready", "Missing ConfirmationView does not change the ready Runtime state.");
    check(test.calls.surfaceCreate === 0 && test.slot.children.length === 0 && test.context.__testHooks.controller() === null, "Missing ConfirmationView prevents Controller mount and leaves no interactive action nodes.");
    check(test.context.__testHooks.surfaceState() === "unavailable" && test.context.__testHooks.runtimeError() === null, "Missing ConfirmationView is recorded only as Surface bootstrap unavailable.");
    check(test.warnings.join("\n").indexOf("SURFACE_BOOTSTRAP_UNAVAILABLE") !== -1 && test.warnings.join("\n").indexOf("RUNTIME_CAPABILITY_UNAVAILABLE") === -1, "Surface dependency diagnostics never claim a Runtime capability failure.");
    check(test.warnings.join("\n").indexOf("private") === -1, "Surface diagnostics never expose private exception text or stack material.");

    test = harness({ runtimeFailure: true });
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.context.__testHooks.runtime() === null && test.context.__testHooks.runtimeError() === "SCHEMA_VALIDATION_FAILED" && test.calls.runtimeDispose === 1, "A failed Runtime candidate is disposed and never committed globally.");
    check(test.calls.surfaceCreate === 0 && test.slot.children.length === 0, "A failed Runtime never starts the Surface Controller.");
    test.context.coreBootstrapSnapshot = { state: "host-ready", generation: 3, hostReady: true };
    test.context.__testHooks.initializeRuntime(test.context.coreBootstrapSnapshot); await flush();
    check(test.calls.runtimeCreate === 2 && test.calls.runtimeInitialize === 2 && test.context.__testHooks.runtime() !== null, "A new Core generation retries with a fresh Runtime candidate and commits it after success.");
    check(test.calls.surfaceCreate === 1 && test.calls.surfaceMount === 1, "A successful retry mounts one Surface Controller without remounting the shell.");
    test.context.__testHooks.initializeRuntime(test.context.coreBootstrapSnapshot); await flush();
    check(test.calls.runtimeCreate === 2 && test.calls.surfaceCreate === 1, "Repeated host-ready/ready notifications for one generation do not duplicate Runtime or Surface controllers.");

    test = harness({ deferFirst: true });
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.calls.runtimeCreate === 1 && test.context.__testHooks.runtime() === null, "An initializing candidate remains private until its initialize promise succeeds.");
    test.context.coreBootstrapSnapshot = { state: "host-ready", generation: 3, hostReady: true };
    test.context.__testHooks.initializeRuntime(test.context.coreBootstrapSnapshot); await flush();
    check(test.calls.runtimeDispose === 1 && test.calls.runtimeCreate === 2 && test.context.__testHooks.runtime() !== null, "A newer Core generation disposes the stale candidate and commits a fresh candidate.");
    test.calls.resolveFirst({ ok: true }); await flush();
    check(test.calls.runtimeCreate === 2 && test.calls.surfaceCreate === 1 && test.context.__testHooks.runtime().getStatus().state === "ready", "A stale candidate's late success cannot replace or clear the committed Runtime.");

    test = harness({ deferFirst: true });
    test.context.__testHooks.initializeRuntime(); await flush();
    test.context.panelShuttingDown = true;
    test.context.panelLifecycleGeneration = 2;
    test.calls.resolveFirst({ ok: true }); await flush();
    check(test.context.__testHooks.runtime() === null && test.calls.runtimeDispose === 1 && test.calls.surfaceCreate === 0, "A candidate completing during shutdown is disposed and cannot commit or mount a Surface Controller.");

    test = harness({ surfaceConstructorFailure: true });
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.runtime.getStatus().state === "ready" && test.context.__testHooks.runtimeError() === null, "A Surface constructor failure preserves the actual ready Runtime state.");
    check(test.calls.surfaceCreate === 1 && test.calls.surfaceMount === 0 && test.slot.children.length === 0 && test.context.__testHooks.surfaceState() === "unavailable", "A Surface constructor failure is contained without action nodes or a mounted Controller.");
    check(test.warnings.join("\n").indexOf("RUNTIME_CAPABILITY_UNAVAILABLE") === -1, "A Surface constructor failure does not flow into reportVelaRuntimeError.");

    test = harness({ surfaceMountFailure: true });
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.runtime.getStatus().state === "ready" && test.calls.surfaceDispose === 1 && test.slot.children.length === 0, "A partial Surface mount failure disposes its local controller and clears action nodes without changing Runtime state.");

    test = harness();
    test.context.__testHooks.initializeRuntime(); await flush();
    check(test.context.__testHooks.surfaceState() === "ready" && test.calls.surfaceMount === 1 && test.slot.children.length === 5, "A new panel lifecycle with restored dependencies mounts the Surface normally.");
    console.log("test-vela-surface-bootstrap-boundary: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
