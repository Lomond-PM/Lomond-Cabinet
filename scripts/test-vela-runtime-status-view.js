#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "client", "js", "main.js"), "utf8");
const cutoff = source.indexOf("    var Motion = {");
let assertions = 0;

function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}

function run() {
    let current = { state: "new", initialized: false, suspended: false, disposed: false, moduleRevision: "vela-runtime-v1", hostAdapterRevision: null, lastErrorCode: null };
    let providerDiagnostics = null;
    const context = {
        console: { warn() {} },
        CSInterface: function CSInterface() {},
        __testController: Object.freeze({ getStatus() { return Object.freeze(current); }, getProviderDiagnostics() { return providerDiagnostics; } }),
        VelaCepModuleLoader: Object.freeze({ getStatus() { return Object.freeze({ state: "idle" }); } })
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(source.slice(0, cutoff).replace("var velaRuntimeController = null;", "var velaRuntimeController = window.__testController || null;") + "}());", context, { filename: "main-status-prefix.js" });

    const descriptor = Object.getOwnPropertyDescriptor(context, "VelaRuntimeStatusView");
    check(!!descriptor && descriptor.configurable === false && typeof descriptor.get === "function" && descriptor.set === undefined, "Status view is a non-configurable getter without a setter.");
    const first = context.VelaRuntimeStatusView;
    const second = context.VelaRuntimeStatusView;
    const allowed = ["schemaRevision", "diagnosticOnly", "state", "initialized", "suspended", "disposed", "loaderState", "moduleRevision", "hostAdapterRevision", "providerDiagnostics", "lastErrorCode", "statusRevision"];
    check(vm.runInContext("Object.isFrozen(VelaRuntimeStatusView) && Object.getPrototypeOf(VelaRuntimeStatusView) === Object.prototype", context), "Status view returns a frozen plain snapshot.");
    check(Object.keys(first).sort().join(",") === allowed.sort().join(","), "Status view uses the exact diagnostic field allowlist.");
    check(first.schemaRevision === "vela-runtime-status-view-v1" && first.diagnosticOnly === true && first.state === "new" && first.loaderState === "idle", "Initial status view is bounded and diagnostic-only.");
    check(first.providerDiagnostics === null, "Provider diagnostics are absent before a bounded Provider diagnostic snapshot exists.");
    check(first !== second && Object.isFrozen(second), "Each status access returns a new frozen snapshot rather than an authority object.");
    check(!Object.prototype.hasOwnProperty.call(first, "runtime") && !Object.prototype.hasOwnProperty.call(first, "controller") && !Object.prototype.hasOwnProperty.call(first, "sessionId") && !Object.prototype.hasOwnProperty.call(first, "fingerprint") && !Object.prototype.hasOwnProperty.call(first, "capture"), "Status view exposes no trusted or raw runtime material.");
    current = { state: "ready", initialized: true, suspended: false, disposed: false, moduleRevision: "vela-runtime-v1", hostAdapterRevision: "vela-context-host-v4", lastErrorCode: null };
    providerDiagnostics = Object.freeze({ provisionalProfile: "text-only", contextUnionEligible: true, finalProfile: "proposal-capable-union", responseSchemaName: "vela_bounded_union_response", parsedResponseType: "text", intentAllowed: null, intentReason: null });
    check(context.VelaRuntimeStatusView.state === "ready" && context.VelaRuntimeStatusView.initialized === true && context.VelaRuntimeStatusView.hostAdapterRevision === "vela-context-host-v4" && context.VelaRuntimeStatusView.providerDiagnostics.finalProfile === "proposal-capable-union", "Status view reflects ready runtime and bounded Provider diagnostics without exposing the controller.");
    current = { state: "suspended", initialized: true, suspended: true, disposed: false, moduleRevision: "vela-runtime-v1", hostAdapterRevision: "vela-context-host-v4", lastErrorCode: null };
    check(context.VelaRuntimeStatusView.state === "suspended" && context.VelaRuntimeStatusView.suspended === true, "Status view reflects suspend state.");
    current = { state: "failed", initialized: false, suspended: false, disposed: false, moduleRevision: "vela-runtime-v1", hostAdapterRevision: null, lastErrorCode: "RUNTIME_CAPABILITY_UNAVAILABLE" };
    check(context.VelaRuntimeStatusView.state === "failed" && context.VelaRuntimeStatusView.lastErrorCode === "RUNTIME_CAPABILITY_UNAVAILABLE", "Status view reflects bounded initialization failure.");
    current = { state: "disposed", initialized: false, suspended: false, disposed: true, moduleRevision: "vela-runtime-v1", hostAdapterRevision: null, lastErrorCode: null };
    check(context.VelaRuntimeStatusView.state === "disposed" && context.VelaRuntimeStatusView.disposed === true, "Status view reflects terminal disposal and cannot restore runtime authority.");
    assert.throws(() => { Object.defineProperty(context, "VelaRuntimeStatusView", { value: {} }); }, /TypeError/);
    assertions += 1;
    console.log("test-vela-runtime-status-view: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
