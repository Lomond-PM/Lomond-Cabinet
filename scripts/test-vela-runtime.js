#!/usr/bin/env node
"use strict";

const assert = require("assert");
const runtimeModule = require("../client/js/vela/velaRuntime");
const activationPolicy = require("../client/js/vela/velaActivationPolicy").VelaActivationPolicy;
const nodeRuntime = require("./velaNodeRuntime");
let assertions = 0;
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";

function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
function hostResult(request, unavailable) {
    let snapshot;
    if (unavailable !== true) {
        if (request.operation === "captureContext") {
            snapshot = {
                hostInstanceId: HOST, hostReloadEpoch: 1, tier: 1, projectGeneration: 3,
                activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
                selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 45, layerIndex: 3, selectedOrder: 0, matchName: "ADBE Text Layer", type: "text" }] }
            };
        } else if (request.operation === "capturePropertyValues") {
            snapshot = {
                hostInstanceId: HOST, hostReloadEpoch: 1, tier: 3, projectGeneration: 3, sampleTime: 1,
                targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: target.propertyPath[target.propertyPath.length - 2], value: { kind: "number", data: 57.5 } }))
            };
        } else {
            snapshot = { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: false, bindingContextAvailable: false, hostAdapterRevision: "vela-context-host-v4" } };
        }
    }
    return JSON.stringify({
        protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId,
        operation: request.operation, ok: unavailable !== true, hostAdapterRevision: "vela-context-host-v4",
        snapshot,
        error: unavailable === true ? { code: "HOST_CONTEXT_UNAVAILABLE", message: "ignored" } : undefined
    });
}
function createController(options) {
    options = options || {};
    const environment = Object.assign({ setTimeout, clearTimeout }, nodeRuntime, options.environment || {});
    return runtimeModule.createRuntime({
        activationPolicy,
        environment,
        invokeHost(source, callback) {
            const request = decode(source);
            if (options.late) { options.late.callback = callback; options.late.request = request; return; }
            callback(hostResult(request, options.unavailable));
        }
    });
}

async function run() {
    const controller = createController();
    check(Object.isFrozen(controller), "Controller is frozen.");
    check(Object.keys(controller).sort().join(",") === "approveActiveCandidate,cancelProviderRequest,checkProviderReadiness,dispose,getConfirmationSurfaceState,getProviderDiagnostics,getProviderSurfaceState,getProviderUiState,getStatus,getUiState,initialize,rejectActiveCandidate,resetSession,resume,reviewProviderProposal,sendProviderMessage,suspend", "Runtime exposes only Persistent Surface lifecycle, bounded Provider diagnostics, proposal review, and active confirmation facades.");
    check(controller.cancelProviderRequest.length === 0, "Provider cancellation has no caller-supplied request identifier seam.");
    check(controller.approveActiveCandidate.length === 0 && controller.rejectActiveCandidate.length === 0, "Surface confirmation facades accept no caller-supplied candidate identifier.");
    check(!Object.prototype.hasOwnProperty.call(controller, "getPreflight") && !Object.prototype.hasOwnProperty.call(controller, "getBridge") && !Object.prototype.hasOwnProperty.call(controller, "executeHostRequest"), "Controller does not expose private execution objects.");
    const first = controller.initialize();
    const second = controller.initialize();
    check(first === second, "Concurrent initialization shares one Promise.");
    const status = await first;
    check(status.state === "ready" && status.initialized === true, "Tier 0 Host v4 readiness succeeds.");
    check(status.hostAdapterRevision === "vela-context-host-v4", "Status reports only the Host revision.");
    check(Object.isFrozen(status) && Object.isFrozen(status.bridgeState), "Status is frozen.");
    check(status.activationPolicy === activationPolicy.getPolicy() && Object.isFrozen(status.activationPolicy), "Runtime reads and retains the exact trusted activation policy identity.");
    check(status.activationPolicy.productionEnabled === false && status.activationPolicy.qualifiedDefaultModelId === null && status.activationPolicy.productionBlockReason === "no-qualified-default-model", "Runtime production activation remains fail-closed with no qualified default model.");
    check(!Object.prototype.hasOwnProperty.call(status, "sessionId") && !Object.prototype.hasOwnProperty.call(status, "planStore"), "Status does not leak trusted runtime state.");
    check(Object.isFrozen(controller.getUiState()) && !Object.prototype.hasOwnProperty.call(controller.getUiState(), "planId") && !Object.prototype.hasOwnProperty.call(controller.getUiState(), "propertyValueDigest"), "UI state is frozen and does not leak private plan or digest data.");
    check(Object.isFrozen(controller.getProviderSurfaceState()) && !Object.prototype.hasOwnProperty.call(controller.getProviderSurfaceState(), "requestId") && !Object.prototype.hasOwnProperty.call(controller.getProviderSurfaceState(), "proposalCapabilityId"), "Provider Surface projection is frozen and excludes request and proposal authority.");
    check(Object.isFrozen(controller.getConfirmationSurfaceState()) && Object.keys(controller.getConfirmationSurfaceState()).sort().join(",") === "beforeValue,errorCode,moduleRevision,proposedValue,state" && !/candidate|target|context|plan|nonce|digest|authority|payload/i.test(Object.keys(controller.getConfirmationSurfaceState()).join(",")), "Confirmation Surface projection is frozen and excludes trusted execution data.");
    check(!Object.prototype.hasOwnProperty.call(controller, "refreshContext") && !Object.prototype.hasOwnProperty.call(controller, "createOpacityCandidate") && !Object.prototype.hasOwnProperty.call(controller, "approveCandidate") && !Object.prototype.hasOwnProperty.call(controller, "rejectCandidate"), "Runtime exposes no legacy/manual Context or candidate facade.");
    await expectCode(controller.approveActiveCandidate(), "CANDIDATE_STATE_INVALID", "Approve facade fails closed without a pending confirmation.");
    await expectCode(controller.rejectActiveCandidate(), "CANDIDATE_STATE_INVALID", "Reject facade fails closed without a pending confirmation.");
    check((await controller.initialize()).state === "ready" && controller.getStatus().state === "ready", "Repeated initialization is idempotent.");
    check(controller.getStatus().activationPolicy === status.activationPolicy, "Repeated initialization and bootstrap retain one activation policy identity.");
    check(controller.suspend() === true && controller.getStatus().state === "suspended", "Suspend forwards to the private bridge.");
    check(controller.suspend() === false, "Duplicate suspend is inert.");
    check(controller.resume() === true && controller.getStatus().state === "ready", "Resume restores the runtime state.");
    check(controller.resume() === false, "Duplicate resume is inert.");
    check(controller.resetSession() === true, "Reset session uses the bridge lifecycle method.");
    check(controller.dispose() === true && controller.getStatus().disposed === true, "Dispose invalidates the controller.");
    check(controller.dispose() === false, "Duplicate dispose is inert.");
    await expectCode(controller.initialize(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Disposed runtime fails closed.");
    check(controller.suspend() === false && controller.resume() === false && controller.resetSession() === false, "Disposed lifecycle calls fail closed.");

    const unavailable = createController({ unavailable: true });
    await expectCode(unavailable.initialize(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Unclassified Host v4 infrastructure unavailability is bounded and fail closed.");
    check(unavailable.getStatus().state === "failed" && unavailable.getStatus().lastErrorCode === "RUNTIME_CAPABILITY_UNAVAILABLE", "Runtime frozen status retains the classified infrastructure error code for diagnostics.");

    const late = {};
    const pending = createController({ late });
    const initializing = pending.initialize();
    check(pending.dispose() === true, "Dispose can invalidate an in-flight readiness request.");
    late.callback(hostResult(late.request, false));
    await expectCode(initializing, "LIFECYCLE_BLOCKED", "Late Host callback cannot reactivate a disposed runtime.");
    check(pending.getStatus().state === "disposed", "Late callback preserves disposed state.");

    const invalid = runtimeModule.createRuntime({ invokeHost: null, activationPolicy });
    await expectCode(invalid.initialize(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Missing browser capabilities fail closed.");
    check(!/ownData\(options,\s*["']activationPolicy["']\)/.test(require("fs").readFileSync(require.resolve("../client/js/vela/velaRuntime"), "utf8")), "Runtime exposes no caller option for replacing the source-owned activation policy.");
    console.log("test-vela-runtime: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
