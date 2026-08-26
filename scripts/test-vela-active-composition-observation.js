#!/usr/bin/env node
"use strict";

const assert = require("assert");
const agentModule = require("../client/js/vela/velaAgentRuntime");
const capabilityModule = require("../client/js/vela/velaActiveCompositionCapability");
const runtimeModule = require("../client/js/vela/velaAgentCapabilityRuntime");
const observationModule = require("../client/js/vela/velaAgentObservationRuntime");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
async function rejectsCode(promise, code, message) { let found; try { await promise; } catch (error) { found = error; } equal(found && found.code, code, message); }
async function rejection(promise) { try { await promise; } catch (error) { return error; } throw new Error("Expected rejection"); }
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
function capture(activeComp, id) {
    return Object.freeze({ contextId: id, snapshot: Object.freeze({ sessionId: "bridge-session", hostInstanceId: "host_abcdefghijklmnopqrstuvwxyz0123456789abcdefghijk", hostReloadEpoch: 4, tier: 1, activeComp: activeComp, selection: [] }) });
}
function createHarness(captures, onError) {
    const values = captures.slice();
    const bridge = Object.freeze({ getState: () => Object.freeze({ state: "idle" }), capture: () => Promise.resolve(values.shift()) });
    const capability = capabilityModule.create({ contextBridge: bridge });
    const agent = agentModule.createAgent(); agent.activate(); agent.beginTurn();
    const capabilityRuntime = runtimeModule.createCapabilityRuntime({ registry: capability.registry, adapters: capability.adapters, readOwnership: () => { const value = agent.getSnapshot(); return { sessionId: value.sessionId, turnId: value.turnId, scopeId: value.scopeId, agentRevision: value.revision, disposed: value.lifecycleStage === "disposed" }; } });
    const observation = observationModule.createAgentObservationRuntime({ readAgentSnapshot: () => agent.getSnapshot(), capabilityRuntime, capabilityId: capability.capabilityId, onError });
    return { agent, capabilityRuntime, observation };
}

(async function () {
    let successReports = 0;
    const none = createHarness([capture(null, "context-none")], () => { successReports += 1; });
    const noneObservation = await none.observation.refresh();
    equal(noneObservation.facts.activeComposition.available, false, "no active comp is a successful available:false fact");
    equal(noneObservation.facts.activeComposition.compositionId, null, "unavailable composition identity is explicitly null");
    equal(noneObservation.provenance.capabilityId, "observe-active-composition-v1", "Observation carries typed capability provenance");
    equal(noneObservation.provenance.turnId, none.agent.getCurrentTurnId(), "Observation provenance binds the owning turn");
    equal(noneObservation.provenance.hostContextId, "context-none", "Observation provenance carries trusted Host capture identity");
    check(Object.isFrozen(noneObservation) && Object.isFrozen(noneObservation.facts.activeComposition) && Object.isFrozen(noneObservation.provenance), "Observation is deeply immutable");
    assert.deepStrictEqual(none.observation.getContextSnapshot().facts, noneObservation.facts); assertions += 1;
    assert.deepStrictEqual(none.observation.getContextSnapshot().provenance, noneObservation.provenance); assertions += 1;
    equal(successReports, 0, "normal refresh success does not call the error reporter");

    const comp = Object.freeze({ compId: "ae-project-3-item-12", type: "CompItem", width: 1920, height: 1080, duration: 12.5, frameRate: 25 });
    const active = createHarness([capture(comp, "context-active")]);
    const accepted = await active.observation.refresh();
    equal(accepted.facts.activeComposition.available, true, "active composition is available");
    equal(accepted.facts.activeComposition.compositionId, comp.compId, "public Context Bridge composition identity is preserved");
    equal(accepted.facts.activeComposition.frameRate, 25, "validated composition fact reaches Context");
    check(!Object.prototype.hasOwnProperty.call(accepted.facts.activeComposition, "itemId") && !Object.prototype.hasOwnProperty.call(accepted.facts.activeComposition, "projectGeneration"), "slice does not reconstruct private Host identity fields");

    const pending = deferred();
    const bridge = Object.freeze({ getState: () => Object.freeze({ state: "idle" }), capture: () => pending.promise });
    const capability = capabilityModule.create({ contextBridge: bridge });
    const agent = agentModule.createAgent(); agent.activate(); agent.beginTurn();
    const capabilityRuntime = runtimeModule.createCapabilityRuntime({ registry: capability.registry, adapters: capability.adapters, readOwnership: () => { const value = agent.getSnapshot(); return { sessionId: value.sessionId, turnId: value.turnId, scopeId: value.scopeId, agentRevision: value.revision, disposed: value.lifecycleStage === "disposed" }; } });
    const observation = observationModule.createAgentObservationRuntime({ readAgentSnapshot: () => agent.getSnapshot(), capabilityRuntime, capabilityId: capability.capabilityId });
    const stale = observation.refresh(); await Promise.resolve(); await Promise.resolve(); agent.beginTurn(); pending.resolve(capture(comp, "context-late"));
    await rejectsCode(stale, observationModule.ERROR_CODES.OBSERVATION_RESULT_STALE, "old-turn Host callback cannot commit Observation");
    equal(observation.getObservationSnapshot(), null, "old-turn callback produces no Observation");
    equal(observation.getContextSnapshot(), null, "old-turn callback produces no Context");

    const cancelPending = deferred();
    const cancelledHarness = createHarness([]);
    // Use a fresh composition whose bridge remains in-flight.
    const cancelBridge = Object.freeze({ getState: () => Object.freeze({ state: "idle" }), capture: () => cancelPending.promise });
    const cancelCapability = capabilityModule.create({ contextBridge: cancelBridge });
    const cancelAgent = cancelledHarness.agent;
    const cancelRuntime = runtimeModule.createCapabilityRuntime({ registry: cancelCapability.registry, adapters: cancelCapability.adapters, readOwnership: () => { const value = cancelAgent.getSnapshot(); return { sessionId: value.sessionId, turnId: value.turnId, scopeId: value.scopeId, agentRevision: value.revision }; } });
    let cancelReports = 0;
    const cancelObservation = observationModule.createAgentObservationRuntime({ readAgentSnapshot: () => cancelAgent.getSnapshot(), capabilityRuntime: cancelRuntime, capabilityId: cancelCapability.capabilityId, onError: () => { cancelReports += 1; } });
    const cancelled = cancelObservation.refresh(); await Promise.resolve(); await Promise.resolve();
    check(cancelObservation.cancelRefresh(), "Observation refresh can commit-cancel its owned invocation");
    const cancelledError = await rejection(cancelled);
    equal(cancelledError.code, observationModule.ERROR_CODES.OBSERVATION_REFRESH_CANCELLED, "cancelled invocation cannot commit Observation");
    check(!Object.prototype.hasOwnProperty.call(cancelledError, "capabilityErrorCode"), "cancelled invocation does not fabricate a capability cause");
    equal(cancelReports, 0, "expected cancellation does not call the error reporter");
    cancelPending.resolve(capture(comp, "context-cancelled-late")); await Promise.resolve(); await Promise.resolve();
    equal(cancelObservation.getContextSnapshot(), null, "late callback after cancel cannot project Context");
    equal(cancelReports, 0, "late callback after cancellation does not call the error reporter");

    function capabilityFailureResult(code, extras) {
        const error = Object.assign({ code }, extras || {});
        return Object.freeze({ invocationId: "inv-error", sessionId: "session-error", turnId: "turn-error", capabilityId: "observe-active-composition-v1", status: "error", data: null, error: Object.freeze(error) });
    }
    function capabilityFailureHarness(result, onError) {
        const agent = agentModule.createAgent(); agent.activate(); agent.beginTurn();
        const snapshot = agent.getSnapshot();
        const adjusted = Object.freeze(Object.assign({}, result, { sessionId: snapshot.sessionId, turnId: snapshot.turnId }));
        const capabilityRuntime = Object.freeze({ invoke: () => Promise.resolve(adjusted) });
        return observationModule.createAgentObservationRuntime({ readAgentSnapshot: () => agent.getSnapshot(), capabilityRuntime, capabilityId: "observe-active-composition-v1", onError });
    }
    for (const code of ["ADAPTER_ERROR", "INVALID_OUTPUT"]) {
        let failureReports = 0;
        const runtime = capabilityFailureHarness(capabilityFailureResult(code, { message: "private", stack: "private-stack", payload: { secret: true } }), () => { failureReports += 1; });
        const error = await rejection(runtime.refresh());
        equal(error.code, observationModule.ERROR_CODES.OBSERVATION_PROVIDER_FAILED, code + " preserves the public Observation taxonomy");
        equal(error.capabilityErrorCode, code, code + " is retained as a bounded capability cause");
        check(Object.getOwnPropertyDescriptor(error, "capabilityErrorCode").writable === false, code + " cause is read-only");
        check(!Object.prototype.hasOwnProperty.call(error, "payload") && error.message === observationModule.ERROR_CODES.OBSERVATION_PROVIDER_FAILED && error.stack.indexOf("private-stack") === -1, code + " does not expose raw message, stack, or payload");
        equal(failureReports, 1, code + " remains observable through the error reporter");
    }
    const unknownError = await rejection(capabilityFailureHarness(capabilityFailureResult("FUTURE_UNTRUSTED", { payload: { secret: true } })).refresh());
    check(!Object.prototype.hasOwnProperty.call(unknownError, "capabilityErrorCode"), "unknown capability error code is not retained");

    const unavailableAgent = agentModule.createAgent(); unavailableAgent.activate(); unavailableAgent.beginTurn();
    const unavailableSnapshot = unavailableAgent.getSnapshot();
    const unavailableRuntime = observationModule.createAgentObservationRuntime({ readAgentSnapshot: () => unavailableAgent.getSnapshot(), capabilityRuntime: Object.freeze({ invoke: () => Promise.resolve(Object.freeze({ invocationId: "inv-unavailable", sessionId: unavailableSnapshot.sessionId, turnId: unavailableSnapshot.turnId, capabilityId: "observe-active-composition-v1", status: "unavailable", data: null, error: Object.freeze({ code: "CAPABILITY_UNAVAILABLE" }) })) }), capabilityId: "observe-active-composition-v1" });
    const unavailableError = await rejection(unavailableRuntime.refresh());
    equal(unavailableError.code, observationModule.ERROR_CODES.OBSERVATION_PROVIDER_UNAVAILABLE, "unavailable retains its existing Observation code");
    check(!Object.prototype.hasOwnProperty.call(unavailableError, "capabilityErrorCode"), "unavailable does not fabricate a capability cause");

    const legacyAgent = agentModule.createAgent(); legacyAgent.activate(); legacyAgent.beginTurn();
    let legacyReports = 0;
    const legacyRuntime = observationModule.createAgentObservationRuntime({ readAgentSnapshot: () => legacyAgent.getSnapshot(), provider: Object.freeze({ observe: () => Promise.reject(Object.assign(new Error("private legacy failure"), { stack: "private-legacy-stack" })) }), onError: () => { legacyReports += 1; } });
    const legacyError = await rejection(legacyRuntime.refresh());
    equal(legacyError.code, observationModule.ERROR_CODES.OBSERVATION_PROVIDER_FAILED, "legacy provider failure retains its existing public code");
    check(!Object.prototype.hasOwnProperty.call(legacyError, "capabilityErrorCode") && legacyError.stack.indexOf("private-legacy-stack") === -1, "legacy provider failure does not fabricate or leak a capability cause");
    equal(legacyReports, 1, "legacy provider failure remains observable through the error reporter");

    console.log("test-vela-active-composition-observation: " + assertions + " assertions passed");
}()).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
