#!/usr/bin/env node
"use strict";

const assert = require("assert");
const controllerModule = require("../client/js/vela/velaController");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const nodeRuntime = require("./velaNodeRuntime");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function makeHarness(options) {
    options = options || {};
    const protocol = protocolModule.createProtocol(nodeRuntime);
    const contextApi = contextModule.createContextApi(protocol);
    let counter = 0;
    let executionCalls = 0;
    let discardCalls = 0;
    let contextCalls = 0;
    const host = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
    const selection = options.selection === undefined ? [{ nativeLayerId: 45, layerIndex: 3 }] : options.selection;
    function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
    function result(request, snapshot) {
        return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot });
    }
    function respond(entry, responseOptions) {
        const request = entry.request;
        const currentSelection = responseOptions && responseOptions.selection !== undefined ? responseOptions.selection : selection;
        const currentOpacity = responseOptions && responseOptions.beforeValue !== undefined ? responseOptions.beforeValue : (options.beforeValue === undefined ? 25 : options.beforeValue);
        if (responseOptions && responseOptions.errorCode) {
            entry.callback(JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error: { code: responseOptions.errorCode, message: "ignored" } }));
            return;
        }
        if (request.operation === "captureContext") {
            entry.callback(result(request, {
                hostInstanceId: host, hostReloadEpoch: 1, tier: 1, projectGeneration: 3,
                activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
                selection: { count: currentSelection.length, identityQuality: "native-layer-id", items: currentSelection.map((item, index) => ({ nativeLayerId: item.nativeLayerId, layerIndex: item.layerIndex, selectedOrder: index, matchName: "ADBE Text Layer", type: "text" })) }
            }));
            return;
        }
        entry.callback(result(request, {
            hostInstanceId: host, hostReloadEpoch: 1, tier: 3, projectGeneration: 3, sampleTime: 1,
            targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: responseOptions && responseOptions.nativeLayerId !== undefined ? responseOptions.nativeLayerId : target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: target.propertyPath[target.propertyPath.length - 2], value: { kind: "number", data: currentOpacity } }))
        }));
    }
    const contextBridge = bridgeModule.createContextBridge({
        protocol,
        contextApi,
        invokeHost(source, callback) {
            const request = decode(source);
            contextCalls += 1;
            if (options.defer) { options.defer.push({ request, callback }); return; }
            if (options.valueCode && request.operation === "capturePropertyValues") {
                callback(JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error: { code: options.valueCode, message: "ignored" } }));
                return;
            }
            respond({ request, callback });
        },
        runtime: { setTimeout, clearTimeout, timeoutMs: 100 }
    });
    const reviewPort = bridgeModule.createReviewPort(contextBridge, protocol);
    const preflight = {
        createBoundPlan(input) {
            counter += 1;
            if (options.createCode) return Promise.reject(new protocol.VelaProtocolError(options.createCode));
            return Promise.resolve({
                planId: "plan_" + String(counter).padStart(32, "0"),
                planRevision: counter,
                candidateIds: ["cand_" + String(counter).padStart(32, "0")],
                candidates: [],
                actionCount: 1,
                state: "pending-confirmation",
                nextStep: 0,
                createdAt: counter,
                review: { valueKind: "number", beforeValue: options.beforeValue === undefined ? 20 + counter * 5 : options.beforeValue }
            });
        },
        confirmBoundPlan(input) {
            if (options.confirmCode) return Promise.reject(new protocol.VelaProtocolError(options.confirmCode));
            return Promise.resolve({ state: "confirmed", planId: input.planId });
        },
        executeStep() {
            executionCalls += 1;
            if (options.executeCode) return Promise.reject(new protocol.VelaProtocolError(options.executeCode));
            return Promise.resolve({ candidate: { state: "consumed" }, result: { ok: true } });
        },
        discardBoundPlan() {
            discardCalls += 1;
            return { state: "discarded" };
        }
    };
    const controller = controllerModule.createController({ protocol, preflight, contextBridge, reviewPort });
    return { protocol, controller, preflight, contextBridge, respond, get contextCalls() { return contextCalls; }, get executionCalls() { return executionCalls; }, get discardCalls() { return discardCalls; } };
}

async function run() {
    const harness = makeHarness();
    check(Object.isFrozen(harness.controller), "Controller instance is frozen.");
    check(controllerModule.isTrustedControllerForProtocol(harness.controller, harness.protocol), "Controller carries exact trusted protocol identity.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: "57" }), "PARAM_OUT_OF_RANGE", "String opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: NaN }), "PARAM_OUT_OF_RANGE", "NaN opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: Infinity }), "PARAM_OUT_OF_RANGE", "Infinity opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: -0 }), "PARAM_OUT_OF_RANGE", "Negative zero opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: 101 }), "PARAM_OUT_OF_RANGE", "Out of range opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: 10, target: {} }), "SCHEMA_VALIDATION_FAILED", "UI cannot supply target overrides.");

    const pending = await harness.controller.createOpacityCandidate({ opacity: 57.5 });
    check(pending.state === "pending-confirmation" && pending.beforeValue === 25 && pending.proposedValue === 57.5 && pending.candidateId.indexOf("cand_") === 0, "Valid opacity creates a pending confirmation with review values.");
    check(!JSON.stringify(pending).includes("planId") && !JSON.stringify(pending).includes("Digest") && !JSON.stringify(pending).includes("capture"), "Public UI state does not leak plan, digest or capture.");
    const edited = await harness.controller.createOpacityCandidate({ opacity: 10 });
    check(edited.candidateId !== pending.candidateId && edited.beforeValue === 30 && harness.discardCalls === 1, "Editing discards the previous pending candidate and creates a new candidate with a fresh beforeValue.");
    await expectCode(harness.controller.approveCandidate({ candidateId: pending.candidateId }), "CANDIDATE_NOT_FOUND", "Old edited candidate cannot be approved.");
    const consumed = await harness.controller.approveCandidate({ candidateId: edited.candidateId });
    check(consumed.state === "consumed" && harness.executionCalls === 1, "Approval confirms and executes exactly once.");
    await expectCode(harness.controller.approveCandidate({ candidateId: edited.candidateId }), "CANDIDATE_STATE_INVALID", "Double approve cannot execute again.");
    check(harness.executionCalls === 1, "Double approve does not call executor a second time.");

    const reject = makeHarness();
    const rejectPending = await reject.controller.createOpacityCandidate({ opacity: 20 });
    const rejected = reject.controller.rejectCandidate({ candidateId: rejectPending.candidateId });
    check(rejected.state === "discarded" && reject.executionCalls === 0 && reject.discardCalls === 1, "Reject discards without executing.");
    await expectCode(reject.controller.approveCandidate({ candidateId: rejectPending.candidateId }), "CANDIDATE_STATE_INVALID", "Rejected candidate is terminal.");

    const stale = makeHarness({ executeCode: "CONTEXT_STALE" });
    const stalePending = await stale.controller.createOpacityCandidate({ opacity: 30 });
    await expectCode(stale.controller.approveCandidate({ candidateId: stalePending.candidateId }), "CONTEXT_STALE", "Execution context drift reports stale.");
    check(stale.controller.getUiState().state === "stale", "Stale execution is reflected in UI state.");

    const refreshed = makeHarness({ beforeValue: 57.5 });
    const refreshedState = await refreshed.controller.refreshContext();
    check(refreshed.contextCalls === 2 && refreshedState.state === "ready" && refreshedState.beforeValue === 57.5 && refreshedState.contextLayerIndex === 3 && refreshedState.targetSummary === null, "Refresh performs one bound Tier 1 capture and one Tier 3 value capture before publishing the current opacity without hard-coding a localized target summary.");
    check(!JSON.stringify(refreshedState).includes("layerId") && !JSON.stringify(refreshedState).includes("propertyPath") && !JSON.stringify(refreshedState).includes("requestId"), "Refresh projection does not expose trusted capture identity.");
    for (const value of [0, 100]) {
        const boundary = makeHarness({ beforeValue: value });
        const state = await boundary.controller.refreshContext();
        check(state.beforeValue === value, "Refresh preserves opacity boundary " + value + ".");
    }
    const noTarget = makeHarness({ selection: [] });
    await expectCode(noTarget.controller.refreshContext(), "UNKNOWN_TARGET", "Refresh rejects an empty selection after the Tier 1 binding capture.");
    check(noTarget.controller.getUiState().state === "no-target" && noTarget.controller.getUiState().beforeValue === null, "No-target refresh clears stale context values.");
    const valueFailure = makeHarness({ valueCode: "HOST_CONTEXT_UNAVAILABLE" });
    await expectCode(valueFailure.controller.refreshContext(), "VERIFICATION_UNAVAILABLE", "Tier 3 capture failures retain their finite mapped error.");
    check(valueFailure.controller.getUiState().state === "failed" && valueFailure.controller.getUiState().beforeValue === null, "Tier 3 failure never publishes a partial Tier 1 context value.");

    const mismatchDeferred = [];
    const mismatch = makeHarness({ defer: mismatchDeferred });
    const mismatchedRefresh = mismatch.controller.refreshContext();
    mismatch.respond(mismatchDeferred[0]);
    await Promise.resolve();
    mismatch.respond(mismatchDeferred[1], { nativeLayerId: 99 });
    await expectCode(mismatchedRefresh, "CONTEXT_STALE", "Tier 3 rejects a property result whose target identity differs from the Tier 1 binding.");
    check(mismatch.controller.getUiState().state === "failed" && mismatch.controller.getUiState().beforeValue === null, "Target mismatch does not publish a partial context record.");

    const deferred = [];
    const rapid = makeHarness({ defer: deferred });
    const firstRefresh = rapid.controller.refreshContext();
    firstRefresh.catch(() => {});
    const secondRefresh = rapid.controller.refreshContext();
    check(deferred.length === 2 && rapid.contextCalls === 2, "Rapid refresh cancels only the older refresh capture and starts one latest Tier 1 capture.");
    rapid.respond(deferred[1], { selection: [{ nativeLayerId: 99, layerIndex: 7 }] });
    await Promise.resolve();
    check(deferred.length === 3, "The latest Tier 1 capture alone advances to its Tier 3 value capture.");
    rapid.respond(deferred[2], { beforeValue: 100 });
    const latest = await secondRefresh;
    await expectCode(firstRefresh, "LIFECYCLE_BLOCKED", "A cancelled older refresh cannot publish after a newer generation starts.");
    rapid.respond(deferred[0], { selection: [{ nativeLayerId: 45, layerIndex: 3 }] });
    check(latest.state === "ready" && latest.contextLayerIndex === 7 && latest.beforeValue === 100 && rapid.controller.getUiState().contextLayerIndex === 7, "Late selection A cannot overwrite the latest selection B context.");

    const providerBusyDeferred = [];
    const providerBusy = makeHarness({ defer: providerBusyDeferred });
    const providerCapture = providerBusy.contextBridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    await expectCode(providerBusy.controller.refreshContext(), "EXECUTION_BUSY", "Refresh fails closed while a separate Provider-owned Bridge capture is pending.");
    await expectCode(providerBusy.controller.refreshContext(), "EXECUTION_BUSY", "Repeated Refresh still cannot claim or cancel a Provider-owned capture.");
    check(providerBusy.contextCalls === 1 && providerBusy.contextBridge.getState().state === "pending", "Busy Refresh does not start, replace, or cancel the pending Provider capture.");
    providerBusy.respond(providerBusyDeferred[0]);
    check((await providerCapture).executable === true, "The pending Provider capture completes normally after isolated Refresh rejections.");

    const recoverDeferred = [];
    const recover = makeHarness({ defer: recoverDeferred });
    const failedRefresh = recover.controller.refreshContext();
    recover.respond(recoverDeferred[0]);
    await Promise.resolve();
    recover.respond(recoverDeferred[1], { errorCode: "HOST_CONTEXT_UNAVAILABLE" });
    await expectCode(failedRefresh, "VERIFICATION_UNAVAILABLE", "A finite property capture failure is returned to the caller.");
    const recoveredRefresh = recover.controller.refreshContext();
    recover.respond(recoverDeferred[2], { selection: [{ nativeLayerId: 88, layerIndex: 8 }] });
    await Promise.resolve();
    recover.respond(recoverDeferred[3], { beforeValue: 0 });
    check((await recoveredRefresh).state === "ready" && recover.controller.getUiState().beforeValue === 0, "A later refresh recovers from an earlier finite capture failure without stale opacity.");

    const lifecycleDeferred = [];
    const lifecycle = makeHarness({ defer: lifecycleDeferred });
    const blockedRefresh = lifecycle.controller.refreshContext();
    blockedRefresh.catch(() => {});
    lifecycle.controller.invalidate("stale");
    lifecycle.respond(lifecycleDeferred[0]);
    await expectCode(blockedRefresh, "LIFECYCLE_BLOCKED", "Invalidate blocks a late refresh callback before it can patch state.");
    check(lifecycle.controller.getUiState().state === "stale" && lifecycle.controller.getUiState().beforeValue === null, "Lifecycle invalidation clears captured display values.");

    console.log("test-vela-controller: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
