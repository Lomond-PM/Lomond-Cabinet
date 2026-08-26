#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "client", "js", "main.js"), "utf8");
const cutoff = source.indexOf("    var Motion = {");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function deferred() { let resolve; let reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
function observation(id, available) {
    return Object.freeze({
        facts: Object.freeze({ activeComposition: Object.freeze({ available, compositionId: available ? "ae-project-1-item-" + id : null, type: available ? "CompItem" : null, width: available ? 1920 : null, height: available ? 1080 : null, duration: available ? 10 : null, frameRate: available ? 25 : null }) }),
        provenance: Object.freeze({ capabilityId: "observe-active-composition-v1", invocationId: "inv-" + id, sessionId: "session-1", turnId: "turn-" + id, scopeId: "scope-1", agentRevision: id, hostContextId: "context-" + id, hostInstanceId: "host-1", hostReloadEpoch: 1 })
    });
}

(async function () {
    let current = null;
    let disposed = false;
    let refreshCalls = 0;
    let cancelCalls = 0;
    let runtimeCreates = 0;
    let ownerCreates = 0;
    let providerCancels = 0;
    let mutationCancels = 0;
    const owner = {
        isDisposed: () => disposed,
        getObservationRuntime: () => disposed ? null : Object.freeze({}),
        refreshActiveComposition() { refreshCalls += 1; return current.promise; },
        cancelActiveCompositionRefresh() { cancelCalls += 1; current.reject(Object.assign(new Error("cancelled"), { code: "OBSERVATION_REFRESH_CANCELLED" })); return true; }
    };
    const context = {
        console: { warn() {} },
        CSInterface: function CSInterface() {},
        __testOwner: owner,
        VelaRuntime: { createRuntime() { runtimeCreates += 1; } },
        VelaAgentRuntimeOwner: { createOwner() { ownerCreates += 1; } },
        VelaCepModuleLoader: Object.freeze({ getStatus() { return Object.freeze({ state: "idle" }); } })
    };
    context.window = context;
    vm.createContext(context);
    const prefix = source.slice(0, cutoff)
        .replace("var velaAgentRuntimeOwner = null;", "var velaAgentRuntimeOwner = window.__testOwner || null;") +
        "var panelShuttingDown = false; window.__replaceDiagnosticsOwner = function (next) { velaAgentRuntimeOwner = next; resetActiveCompositionDiagnostics(); }; window.__invalidateDiagnostics = resetActiveCompositionDiagnostics; }());";
    vm.runInContext(prefix, context, { filename: "main-active-composition-diagnostics-prefix.js" });

    const diagnostics = context.VelaActiveCompositionDiagnostics;
    const descriptor = Object.getOwnPropertyDescriptor(context, "VelaActiveCompositionDiagnostics");
    check(Object.isFrozen(diagnostics), "diagnostics API is frozen");
    check(descriptor && descriptor.configurable === false && descriptor.writable === false && descriptor.value === diagnostics, "global diagnostics property is non-configurable and non-writable");
    assert.throws(() => Object.defineProperty(context, "VelaActiveCompositionDiagnostics", { value: {} }), /TypeError/); assertions += 1;
    equal(Object.keys(diagnostics).sort().join(","), "cancel,getState,refresh", "diagnostics exposes only approved operations");
    ["owner", "runtime", "registry", "capabilityRuntime", "observationRuntime", "contextBridge", "beginTurn", "dispose", "invoke"].forEach((key) => check(!Object.prototype.hasOwnProperty.call(diagnostics, key), "diagnostics excludes " + key));

    let state = diagnostics.getState();
    check(Object.isFrozen(state) && state.enabled === false && state.runtimeAvailable === false && state.lastErrorCode === "DIAGNOSTICS_DISABLED", "disabled Developer gate returns a closed disabled state");
    const disabledResult = await diagnostics.refresh();
    equal(disabledResult.status, "disabled", "disabled refresh fails closed");
    equal(disabledResult.capabilityErrorCode, null, "disabled refresh has no capability cause");
    equal(refreshCalls, 0, "disabled refresh does not call production Owner");
    equal(runtimeCreates + ownerCreates, 0, "diagnostics never creates replacement Runtime or Owner");

    context.AETOOLBOX_DEBUG_REGISTRY = true;
    state = diagnostics.getState();
    check(state.enabled && state.runtimeAvailable && state.activeComposition === null && state.provenance === null, "enabled gate binds the current production Owner without fabricating truth");
    current = deferred();
    const first = diagnostics.refresh();
    const second = diagnostics.refresh();
    equal(first, second, "diagnostics preserves wrapper Promise identity during single-flight");
    equal(refreshCalls, 1, "single-flight calls production Owner exactly once");
    check(diagnostics.getState().refreshing, "state reports an active diagnostic refresh");
    const acceptedSource = observation(1, true);
    current.resolve(acceptedSource);
    const accepted = await first;
    equal(accepted.status, "succeeded", "valid production Observation becomes a closed succeeded result");
    equal(Object.keys(accepted).sort().join(","), "activeComposition,capabilityErrorCode,errorCode,provenance,schemaRevision,status", "refresh result keys are closed");
    equal(accepted.capabilityErrorCode, null, "successful refresh has no capability cause");
    check(Object.isFrozen(accepted) && Object.isFrozen(accepted.activeComposition) && Object.isFrozen(accepted.provenance), "refresh result is deeply frozen");
    check(accepted.activeComposition !== acceptedSource.facts.activeComposition && accepted.provenance !== acceptedSource.provenance, "diagnostics returns detached projections, not internal references");
    equal(accepted.activeComposition.compositionId, "ae-project-1-item-1", "active composition facts project exactly");
    equal(accepted.provenance.capabilityId, "observe-active-composition-v1", "typed provenance projects exactly");
    state = diagnostics.getState();
    equal(Object.keys(state).sort().join(","), "activeComposition,capabilityErrorCode,diagnosticOnly,enabled,lastErrorCode,provenance,refreshing,runtimeAvailable,schemaRevision", "state keys are closed");
    check(Object.isFrozen(state) && Object.isFrozen(state.activeComposition) && Object.isFrozen(state.provenance) && !state.refreshing, "terminal state is frozen and no longer refreshing");
    check(Object.values(state).every((value) => typeof value !== "function"), "state exposes no function or internal accessor");

    for (const capabilityErrorCode of ["ADAPTER_ERROR", "INVALID_OUTPUT"]) {
        current = deferred();
        const failed = diagnostics.refresh();
        current.reject(Object.assign(new Error("private failure"), { code: "OBSERVATION_PROVIDER_FAILED", capabilityErrorCode, stack: "private-stack", payload: { secret: true } }));
        const failureResult = await failed;
        equal(failureResult.status, "error", capabilityErrorCode + " remains a refresh failure");
        equal(failureResult.errorCode, "REFRESH_FAILED", capabilityErrorCode + " retains the closed diagnostic error");
        equal(failureResult.capabilityErrorCode, capabilityErrorCode, capabilityErrorCode + " reaches the closed diagnostic projection");
        equal(failureResult.activeComposition, null, "failed refresh returns no current active-composition truth");
        equal(failureResult.provenance, null, "failed refresh returns no current provenance");
        state = diagnostics.getState();
        equal(state.activeComposition.compositionId, "ae-project-1-item-1", "state retains the last accepted facts after " + capabilityErrorCode);
        equal(state.provenance.invocationId, "inv-1", "state provenance remains the last accepted invocation, not the failed invocation");
        equal(state.lastErrorCode, "REFRESH_FAILED", "state records the latest refresh failure");
        equal(state.capabilityErrorCode, capabilityErrorCode, "state records the latest bounded capability cause");
        check(!Object.prototype.hasOwnProperty.call(failureResult, "payload") && !Object.prototype.hasOwnProperty.call(failureResult, "stack"), "diagnostics excludes raw failure details");
    }

    current = deferred();
    const unknownFailure = diagnostics.refresh();
    current.reject(Object.assign(new Error("unknown"), { code: "OBSERVATION_PROVIDER_FAILED", capabilityErrorCode: "FUTURE_UNTRUSTED" }));
    equal((await unknownFailure).capabilityErrorCode, null, "allowlist-external cause is not projected");
    equal(diagnostics.getState().capabilityErrorCode, null, "allowlist-external cause clears the stored bounded cause");

    current = deferred();
    const next = diagnostics.refresh();
    check(next !== first, "terminal completion permits one new diagnostic Promise");
    check(diagnostics.cancel(), "cancel delegates only to active-composition Owner cancellation");
    const cancelled = await next;
    equal(cancelled.status, "cancelled", "cancelled refresh is distinct from ordinary failure");
    equal(cancelled.errorCode, "CANCELLED", "cancelled refresh uses the bounded diagnostic code");
    equal(cancelled.capabilityErrorCode, null, "cancelled refresh clears the capability cause");
    equal(cancelCalls, 1, "cancel reaches the focused Owner path exactly once");
    equal(providerCancels + mutationCancels, 0, "focused cancel cannot touch Provider or mutation state");
    equal(diagnostics.getState().activeComposition.compositionId, "ae-project-1-item-1", "cancel and any late completion cannot overwrite last accepted truth");

    current = deferred();
    const oldOperation = diagnostics.refresh();
    const replacement = Object.assign({}, owner, { refreshActiveComposition() { return Promise.resolve(observation(2, false)); } });
    context.__replaceDiagnosticsOwner(replacement);
    current.resolve(observation(99, true));
    equal((await oldOperation).status, "cancelled", "old Owner callback is lifecycle-cancelled after replacement");
    check(diagnostics.getState().activeComposition === null && diagnostics.getState().provenance === null, "replacement clears old Observation truth");
    const replacementResult = await diagnostics.refresh();
    equal(replacementResult.status, "succeeded", "new initialization binds only the replacement production Owner");
    equal(replacementResult.activeComposition.available, false, "replacement Owner supplies new truth without retaining old facts");
    equal(replacementResult.capabilityErrorCode, null, "next successful refresh clears any prior capability cause");

    disposed = true;
    context.__invalidateDiagnostics();
    const unavailableResult = await diagnostics.refresh();
    equal(unavailableResult.status, "unavailable", "disposed production Owner fails closed without replacement creation");
    equal(unavailableResult.capabilityErrorCode, null, "runtime unavailable has no capability cause");
    equal(diagnostics.getState().capabilityErrorCode, null, "reset and disposal leave no stored capability cause");
    equal(runtimeCreates + ownerCreates, 0, "disposed diagnostics path still creates no Runtime or Owner");
    equal(diagnostics.cancel(), false, "disposed diagnostics cannot cancel stale Owner work");

    console.log("test-vela-active-composition-diagnostics: " + assertions + " assertions passed");
}()).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
