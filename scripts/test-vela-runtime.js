#!/usr/bin/env node
"use strict";

const assert = require("assert");
const runtimeModule = require("../client/js/vela/velaRuntime");
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
    return JSON.stringify({
        protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId,
        operation: request.operation, ok: unavailable !== true, hostAdapterRevision: "vela-context-host-v4",
        snapshot: unavailable === true ? undefined : { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: false, bindingContextAvailable: false, hostAdapterRevision: "vela-context-host-v4" } },
        error: unavailable === true ? { code: "HOST_CONTEXT_UNAVAILABLE", message: "ignored" } : undefined
    });
}
function createController(options) {
    options = options || {};
    const environment = Object.assign({ setTimeout, clearTimeout }, nodeRuntime, options.environment || {});
    return runtimeModule.createRuntime({
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
    check(Object.keys(controller).sort().join(",") === "approveCandidate,cancelProviderRequest,createOpacityCandidate,dispose,getProviderSurfaceState,getProviderUiState,getStatus,getUiState,initialize,refreshContext,rejectCandidate,resetSession,resume,reviewProviderProposal,sendProviderMessage,suspend", "Controller exposes only lifecycle and bounded Vela UI methods.");
    check(controller.cancelProviderRequest.length === 0, "Provider cancellation has no caller-supplied request identifier seam.");
    check(!Object.prototype.hasOwnProperty.call(controller, "getPreflight") && !Object.prototype.hasOwnProperty.call(controller, "getBridge") && !Object.prototype.hasOwnProperty.call(controller, "executeHostRequest"), "Controller does not expose private execution objects.");
    const first = controller.initialize();
    const second = controller.initialize();
    check(first === second, "Concurrent initialization shares one Promise.");
    const status = await first;
    check(status.state === "ready" && status.initialized === true, "Tier 0 Host v4 readiness succeeds.");
    check(status.hostAdapterRevision === "vela-context-host-v4", "Status reports only the Host revision.");
    check(Object.isFrozen(status) && Object.isFrozen(status.bridgeState), "Status is frozen.");
    check(!Object.prototype.hasOwnProperty.call(status, "sessionId") && !Object.prototype.hasOwnProperty.call(status, "planStore"), "Status does not leak trusted runtime state.");
    check(Object.isFrozen(controller.getUiState()) && !Object.prototype.hasOwnProperty.call(controller.getUiState(), "planId") && !Object.prototype.hasOwnProperty.call(controller.getUiState(), "propertyValueDigest"), "UI state is frozen and does not leak private plan or digest data.");
    check(Object.isFrozen(controller.getProviderSurfaceState()) && !Object.prototype.hasOwnProperty.call(controller.getProviderSurfaceState(), "requestId") && !Object.prototype.hasOwnProperty.call(controller.getProviderSurfaceState(), "proposalCapabilityId"), "Provider Surface projection is frozen and excludes request and proposal authority.");
    check((await controller.initialize()).state === "ready" && controller.getStatus().state === "ready", "Repeated initialization is idempotent.");
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
    await expectCode(unavailable.initialize(), "VERIFICATION_UNAVAILABLE", "Host v4 unavailability is bounded and fail closed.");
    check(unavailable.getStatus().state === "failed" && unavailable.getStatus().lastErrorCode === "VERIFICATION_UNAVAILABLE", "Runtime frozen status retains the raw Host error code for diagnostics while the Surface maps it separately.");

    const late = {};
    const pending = createController({ late });
    const initializing = pending.initialize();
    check(pending.dispose() === true, "Dispose can invalidate an in-flight readiness request.");
    late.callback(hostResult(late.request, false));
    await expectCode(initializing, "LIFECYCLE_BLOCKED", "Late Host callback cannot reactivate a disposed runtime.");
    check(pending.getStatus().state === "disposed", "Late callback preserves disposed state.");

    const invalid = runtimeModule.createRuntime({ invokeHost: null });
    await expectCode(invalid.initialize(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Missing browser capabilities fail closed.");
    console.log("test-vela-runtime: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
