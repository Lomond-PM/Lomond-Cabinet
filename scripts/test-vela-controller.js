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
    const controller = controllerModule.createController({ protocol, preflight });
    return { protocol, controller, preflight, contextBridge, respond, get contextCalls() { return contextCalls; }, get executionCalls() { return executionCalls; }, get discardCalls() { return discardCalls; } };
}

async function run() {
    const harness = makeHarness();
    check(Object.isFrozen(harness.controller), "Controller instance is frozen.");
    check(controllerModule.isTrustedControllerForProtocol(harness.controller, harness.protocol), "Controller carries exact trusted protocol identity.");
    function proposal(opacity, generation) { return { opacity, requestId: "req_" + String(generation || 1).padStart(32, "a"), requestGeneration: generation || 1 }; }
    await expectCode(harness.controller.createBoundOpacityCandidate(proposal("57", 1)), "PARAM_OUT_OF_RANGE", "String opacity is rejected.");
    await expectCode(harness.controller.createBoundOpacityCandidate(proposal(NaN, 1)), "PARAM_OUT_OF_RANGE", "NaN opacity is rejected.");
    await expectCode(harness.controller.createBoundOpacityCandidate(proposal(Infinity, 1)), "PARAM_OUT_OF_RANGE", "Infinity opacity is rejected.");
    await expectCode(harness.controller.createBoundOpacityCandidate(proposal(-0, 1)), "PARAM_OUT_OF_RANGE", "Negative zero opacity is rejected.");
    await expectCode(harness.controller.createBoundOpacityCandidate(proposal(101, 1)), "PARAM_OUT_OF_RANGE", "Out of range opacity is rejected.");
    await expectCode(harness.controller.createBoundOpacityCandidate({ opacity: 10, target: {} }), "SCHEMA_VALIDATION_FAILED", "Provider proposal cannot supply target overrides.");

    const pending = await harness.controller.createBoundOpacityCandidate(proposal(57.5, 1));
    check(pending.state === "pending-confirmation" && pending.beforeValue === 25 && pending.proposedValue === 57.5 && pending.candidateId.indexOf("cand_") === 0, "Valid opacity creates a pending confirmation with review values.");
    check(!JSON.stringify(pending).includes("planId") && !JSON.stringify(pending).includes("Digest") && !JSON.stringify(pending).includes("capture"), "Public UI state does not leak plan, digest or capture.");
    const edited = await harness.controller.createBoundOpacityCandidate(proposal(10, 2));
    check(edited.candidateId !== pending.candidateId && edited.beforeValue === 30 && harness.discardCalls === 1, "Editing discards the previous pending candidate and creates a new candidate with a fresh beforeValue.");
    await expectCode(harness.controller.approveCandidate({ candidateId: pending.candidateId }), "CANDIDATE_NOT_FOUND", "Old edited candidate cannot be approved.");
    const consumed = await harness.controller.approveCandidate({ candidateId: edited.candidateId });
    check(consumed.state === "consumed" && harness.executionCalls === 1, "Approval confirms and executes exactly once.");
    await expectCode(harness.controller.approveCandidate({ candidateId: edited.candidateId }), "CANDIDATE_STATE_INVALID", "Double approve cannot execute again.");
    check(harness.executionCalls === 1, "Double approve does not call executor a second time.");

    const reject = makeHarness();
    const rejectPending = await reject.controller.createBoundOpacityCandidate(proposal(20, 1));
    const rejected = reject.controller.rejectCandidate({ candidateId: rejectPending.candidateId });
    check(rejected.state === "discarded" && reject.executionCalls === 0 && reject.discardCalls === 1, "Reject discards without executing.");
    await expectCode(reject.controller.approveCandidate({ candidateId: rejectPending.candidateId }), "CANDIDATE_STATE_INVALID", "Rejected candidate is terminal.");

    const stale = makeHarness({ executeCode: "CONTEXT_STALE" });
    const stalePending = await stale.controller.createBoundOpacityCandidate(proposal(30, 1));
    await expectCode(stale.controller.approveCandidate({ candidateId: stalePending.candidateId }), "CONTEXT_STALE", "Execution context drift reports stale.");
    check(stale.controller.getUiState().state === "stale", "Stale execution is reflected in UI state.");

    console.log("test-vela-controller: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
