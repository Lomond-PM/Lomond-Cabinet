#!/usr/bin/env node
"use strict";

const assert = require("assert");
const runtimeModule = require("../client/js/vela/velaRuntime");
const contextModule = require("../client/js/vela/velaContext");
const protocolModule = require("../client/js/vela/velaProtocol");
const nodeRuntime = require("./velaNodeRuntime");

let assertions = 0;
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
const PATH = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];

function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}
function decodeCall(source) {
    const contextPrefix = "AEToolbox.VelaContext.handle(";
    const executionPrefix = "AEToolbox.VelaExecution.handle(";
    if (source.indexOf(contextPrefix) === 0) return { kind: "context", request: JSON.parse(JSON.parse(source.slice(contextPrefix.length, -1))) };
    if (source.indexOf(executionPrefix) === 0) return { kind: "execution", request: JSON.parse(JSON.parse(source.slice(executionPrefix.length, -1))) };
    throw new Error("Unexpected Host facade.");
}
function contextSuccess(request, snapshot) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot });
}
function contextError(request, code) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error: { code, message: "bounded" } });
}
function executionResult(request, digest) {
    return JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: true, hostExecutionRevision: "vela-execution-host-v1", result: { capabilityId: "set-opacity-v1", valueKind: "number", resultingValueDigest: digest } });
}
function tier0() {
    return { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } };
}
function binding(state) {
    return {
        hostInstanceId: HOST,
        hostReloadEpoch: state.hostReloadEpoch,
        tier: 1,
        projectGeneration: state.projectGeneration,
        activeComp: { itemId: 12, projectGeneration: state.projectGeneration, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
        selection: { count: state.selectionCount, identityQuality: "native-layer-id", items: state.selectionCount === 1 ? [{ nativeLayerId: 45, layerIndex: state.layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }] : [] }
    };
}
function valueSnapshot(request, state) {
    return {
        hostInstanceId: HOST,
        hostReloadEpoch: state.hostReloadEpoch,
        projectGeneration: state.projectGeneration,
        sampleTime: state.sampleTime,
        tier: 3,
        targets: request.scope.targets.map((target, index) => ({
            targetOrdinal: index,
            nativeLayerId: target.nativeLayerId,
            layerIndex: target.layerIndex,
            propertyPath: target.propertyPath,
            propertyMatchName: "ADBE Opacity",
            value: { kind: "number", data: state.value }
        }))
    };
}
function makeRuntime(options) {
    options = options || {};
    let nowTick = 100;
    const sourceNow = options.now || (() => nowTick++);
    const deterministicRuntime = Object.assign({}, nodeRuntime, { now: sourceNow });
    const protocol = protocolModule.createProtocol(deterministicRuntime);
    const contextApi = contextModule.createContextApi(protocol);
    const state = { value: 25, selectionCount: 1, projectGeneration: 3, hostReloadEpoch: 1, layerIndex: 4, sampleTime: 1, errorCode: null };
    const calls = [];
    const environment = Object.assign({ setTimeout, clearTimeout }, deterministicRuntime);
    if (options.omitNow === true) delete environment.now;
    const runtime = runtimeModule.createRuntime({
        environment,
        invokeHost(source, callback) {
            const call = decodeCall(source);
            calls.push(call);
            if (call.kind === "context") {
                if (call.request.operation === "getCapabilities" && call.request.tier === 0) callback(contextSuccess(call.request, tier0()));
                else if (call.request.operation === "captureContext") callback(contextSuccess(call.request, binding(state)));
                else if (state.errorCode) callback(contextError(call.request, state.errorCode));
                else callback(contextSuccess(call.request, valueSnapshot(call.request, state)));
                return;
            }
            check(call.request.capabilityId === "set-opacity-v1" && call.request.scope.target.propertyPath.join("|") === PATH.join("|"), "Host execution request is exact set-opacity-v1 Opacity target.");
            state.value = call.request.scope.params.opacity;
            callback(executionResult(call.request, contextApi.digestPropertyValue("number", state.value)));
        }
    });
    return { runtime, state, calls };
}

async function run() {
    const harness = makeRuntime();
    await harness.runtime.initialize();
    const ready = await harness.runtime.refreshContext();
    check(ready.state === "input-ready", "Runtime exposes a safe input-ready UI state.");
    const pending = await harness.runtime.createOpacityCandidate({ opacity: 57.5 });
    check(pending.state === "pending-confirmation" && pending.beforeValue === 25 && pending.proposedValue === 57.5, "Local proposal returns trusted beforeValue and proposedValue.");
    check(!JSON.stringify(pending).includes("nativeLayerId") && !JSON.stringify(pending).includes("Digest") && !JSON.stringify(pending).includes("planId"), "UI state does not leak native identity, digest or plan id.");
    const surfacePending = harness.runtime.getConfirmationSurfaceState();
    check(surfacePending.state === "confirmation-ready" && surfacePending.beforeValue === 25 && surfacePending.proposedValue === 57.5 && Object.isFrozen(surfacePending), "Confirmation Surface projection exposes only bounded values and state.");
    check(!/candidate|target|context|plan|nonce|digest|authority|payload/i.test(Object.keys(surfacePending).join(",")), "Confirmation Surface projection excludes trusted execution data.");
    const consumed = await harness.runtime.approveActiveCandidate();
    check(consumed.state === "consumed" && harness.state.value === 57.5, "Approve runs through the full production runtime chain and consumes once.");
    check(harness.calls.filter((call) => call.kind === "execution").length === 1, "Successful approval invokes the Host execution facade once.");
    await expectCode(harness.runtime.approveActiveCandidate(), "CANDIDATE_STATE_INVALID", "Terminal candidate cannot be approved again.");

    const rejectHarness = makeRuntime();
    await rejectHarness.runtime.initialize();
    const rejectPending = await rejectHarness.runtime.createOpacityCandidate({ opacity: 10 });
    const discarded = await rejectHarness.runtime.rejectActiveCandidate();
    check(discarded.state === "discarded" && rejectHarness.calls.filter((call) => call.kind === "execution").length === 0, "Reject discards without Host execution.");
    await expectCode(rejectHarness.runtime.approveActiveCandidate(), "CANDIDATE_STATE_INVALID", "Rejected candidate cannot execute.");

    const drift = makeRuntime();
    await drift.runtime.initialize();
    const driftPending = await drift.runtime.createOpacityCandidate({ opacity: 80 });
    drift.state.value = 81;
    await expectCode(drift.runtime.approveCandidate({ candidateId: driftPending.candidateId }), "CONTEXT_STALE", "Value drift blocks execution before Host mutation.");
    check(drift.calls.filter((call) => call.kind === "execution").length === 0 && drift.runtime.getUiState().state === "stale", "Stale terminal state does not call execution facade.");

    const epoch = { value: 1750000000000 };
    const epochHarness = makeRuntime({ now: () => epoch.value });
    await epochHarness.runtime.initialize();
    const epochPending = await epochHarness.runtime.createOpacityCandidate({ opacity: 57.5 });
    check(epochPending.state === "pending-confirmation" && epochPending.proposedValue === 57.5, "Epoch-millisecond runtime clock produces a bounded session-relative candidate timestamp.");
    check(!JSON.stringify(epochHarness.runtime.getUiState()).includes(String(epoch.value)), "Public UI state does not expose the wall-clock epoch or session origin.");
    epoch.value -= 250;
    const rollbackPending = await epochHarness.runtime.createOpacityCandidate({ opacity: 58 });
    check(rollbackPending.state === "pending-confirmation" && rollbackPending.candidateId !== epochPending.candidateId, "A small wall-clock rollback cannot make protocol timestamps decrease or reject a new candidate.");
    epoch.value = 1750000000000 + 30 * 60 * 1000;
    const thirtyMinutePending = await epochHarness.runtime.createOpacityCandidate({ opacity: 59 });
    check(thirtyMinutePending.state === "pending-confirmation", "A 30-minute session remains inside the bounded protocol timestamp range.");
    epoch.value = 1750000000000 + 24 * 60 * 60 * 1000;
    const oneDayPending = await epochHarness.runtime.createOpacityCandidate({ opacity: 60 });
    check(oneDayPending.state === "pending-confirmation", "A 24-hour session remains inside the bounded protocol timestamp range.");
    check(epochHarness.runtime.resetSession() === true, "Reset session starts a new private protocol-clock origin.");
    await expectCode(epochHarness.runtime.approveCandidate({ candidateId: oneDayPending.candidateId }), "CANDIDATE_NOT_FOUND", "Reset session invalidates the previous candidate before execution.");
    const postResetPending = await epochHarness.runtime.createOpacityCandidate({ opacity: 61 });
    check(postResetPending.state === "pending-confirmation", "A new session can issue a bounded candidate after reset.");

    const defaultClockHarness = makeRuntime({ omitNow: true });
    await defaultClockHarness.runtime.initialize();
    const defaultClockPending = await defaultClockHarness.runtime.createOpacityCandidate({ opacity: 62 });
    check(defaultClockPending.state === "pending-confirmation", "The production Date-based source is normalized before it reaches issuedAt.");

    console.log("test-vela-confirmation-flow: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
