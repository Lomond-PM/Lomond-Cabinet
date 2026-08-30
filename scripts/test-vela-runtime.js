#!/usr/bin/env node
"use strict";

const assert = require("assert");
const runtimeModule = require("../client/js/vela/velaRuntime");
const capabilityContracts = require("../client/js/vela/velaCapabilityContracts");
const activationPolicy = require("../client/js/vela/velaActivationPolicy").VelaActivationPolicy;
const nodeRuntime = require("./velaNodeRuntime");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");
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
        exactAgentSession: options.exactAgentSession || sessionRuntime.createSessionLog(),
        environment,
        invokeHost(source, callback) {
            const request = decode(source);
            if (options.late) { options.late.callback = callback; options.late.request = request; return; }
            callback(hostResult(request, options.unavailable));
        }
    });
}

async function run() {
    const runtimeSource = require("fs").readFileSync(require.resolve("../client/js/vela/velaRuntime"), "utf8");
    ["velaAuthorizedPlanMaterializer", "velaTaskRun", "velaPlanReviewProjection", "velaPlanController", "velaReviewRuntimePort"].forEach((file) => { check(runtimeSource.indexOf('require("./' + file + '")') !== -1, "Runtime CommonJS graph requires " + file + " before construction."); });
    check(/createAuthorizedPlanMaterializer\([\s\S]*preflight:\s*preflight[\s\S]*createPlanController\([\s\S]*planStore:\s*planStore[\s\S]*preflight:\s*preflight/.test(runtimeSource), "Dormant PlanController shares the exact production PlanStore and Preflight mutation spine.");
    check(/reviewRuntimePort\.invalidateAll\(\)[\s\S]*planController\.invalidate\("suspend"\)/.test(runtimeSource) && /planController\.invalidate\("session-reset"\)/.test(runtimeSource) && /planController\.dispose\(\)/.test(runtimeSource), "Suspend, resetSession, and dispose invalidate dormant review/orchestration lifetime.");
    check(!/acceptAuthorizedPlan|acceptPlan|submitPlan|approvePlanReview|confirmPlan|runPlan|getPendingPlanReview|currentReview|listReviews/.test(runtimeSource), "Runtime exposes no orchestration producer, confirmation, execution, or review-selection API.");
    const derivedSchema = runtimeModule.deriveRegisteredActionParamsSchema({ parameters: { type: "object", additionalProperties: false, required: ["opacity"], properties: { opacity: { type: "number", minimum: 12, maximum: 88, unit: "percent" } } } });
    check(Object.isFrozen(derivedSchema) && Object.isFrozen(derivedSchema.required) && Object.isFrozen(derivedSchema.properties) && Object.isFrozen(derivedSchema.properties.opacity) && derivedSchema.properties.opacity.minimum === 12 && derivedSchema.properties.opacity.maximum === 88 && !Object.prototype.hasOwnProperty.call(derivedSchema.properties.opacity, "unit"), "Runtime registered-action params schema is frozen and derives canonical bounds without copying capability-only annotations.");
    const registeredTool = Object.freeze({ id: "vela", actions: Object.freeze({ "set-opacity-v1": Object.freeze({ id: "set-opacity-v1" }) }) });
    const validMappings = runtimeModule.validateRegisteredActionMappings(capabilityContracts, {
        getTool(toolId) { return toolId === "vela" ? registeredTool : null; },
        getAction(tool, actionId) { return tool && tool.actions[actionId] || null; }
    });
    check(Object.isFrozen(validMappings) && validMappings.length === 1 && Object.isFrozen(validMappings[0]) && Object.isFrozen(validMappings[0].registeredAction) && validMappings[0].registeredAction.toolId === "vela" && validMappings[0].registeredAction.actionId === "set-opacity-v1", "Runtime startup cross-validation accepts the exact registered composite action identity and returns only frozen mapping data.");
    assert.throws(() => runtimeModule.validateRegisteredActionMappings(capabilityContracts, { getTool() { return null; }, getAction() { return null; } }), (error) => error && error.code === "RUNTIME_CAPABILITY_UNAVAILABLE", "Runtime startup fails closed when the mapped tool is missing."); assertions += 1;
    assert.throws(() => runtimeModule.validateRegisteredActionMappings(capabilityContracts, { getTool() { return registeredTool; }, getAction() { return null; } }), (error) => error && error.code === "RUNTIME_CAPABILITY_UNAVAILABLE", "Runtime startup fails closed when the mapped action is missing."); assertions += 1;
    const controller = createController();
    check(Object.isFrozen(controller), "Controller is frozen.");
    check(Object.keys(controller).sort().join(",") === "approveActiveCandidate,cancelProviderRequest,checkProviderReadiness,dispose,getAuthorityDiagnostics,getAuthorityProjection,getConfirmationSurfaceState,getObservationReadPort,getProviderDiagnostics,getProviderSurfaceState,getProviderUiState,getStatus,getUiState,grantNextOpacityMutation,initialize,rejectActiveCandidate,resetSession,resume,reviewProviderProposal,revokeOpacityDelegation,sendProviderMessage,suspend", "Runtime exposes only existing facades plus the two fixed pilot consent operations and bounded Authority observation.");
    check(controller.getObservationReadPort() === null, "Observation read port is unavailable before Runtime initialization.");
    check(controller.cancelProviderRequest.length === 0, "Provider cancellation has no caller-supplied request identifier seam.");
    check(controller.approveActiveCandidate.length === 0 && controller.rejectActiveCandidate.length === 0, "Surface confirmation facades accept no caller-supplied candidate identifier.");
    check(!Object.prototype.hasOwnProperty.call(controller, "getPreflight") && !Object.prototype.hasOwnProperty.call(controller, "getBridge") && !Object.prototype.hasOwnProperty.call(controller, "executeHostRequest"), "Controller does not expose private execution objects.");
    const first = controller.initialize();
    const second = controller.initialize();
    check(first === second, "Concurrent initialization shares one Promise.");
    const status = await first;
    const authorityProjection = controller.getAuthorityProjection();
    check(Object.isFrozen(authorityProjection) && authorityProjection.state === "inactive" && authorityProjection.active === false && authorityProjection.capabilityId === null && authorityProjection.taskId === null, "Authority projection is frozen and inactive without a consent producer.");
    check(controller.getAuthorityDiagnostics() === null, "Authority diagnostics are debug-gated.");
    global.AETOOLBOX_DEBUG_REGISTRY = true;
    const authorityDiagnostics = controller.getAuthorityDiagnostics();
    check(Object.isFrozen(authorityDiagnostics) && authorityDiagnostics.canonicalComposition === true && authorityDiagnostics.lifecycleState === "ready" && authorityDiagnostics.projection.state === "inactive", "Debug diagnostics witness a canonical, ready, inactive production Authority Plane.");
    check(Object.isFrozen(authorityDiagnostics.moduleRevisions) && !/store|engine|resolver|coordinator|appender|issue|revoke|reserve|activate|run/.test(Object.keys(authorityDiagnostics).join(",")), "Diagnostics expose revisions and summaries without raw Authority handles or mutation methods.");
    delete global.AETOOLBOX_DEBUG_REGISTRY;
    check(!Object.prototype.hasOwnProperty.call(controller, "issueGrant") && !Object.prototype.hasOwnProperty.call(controller, "revokeGrant") && !Object.prototype.hasOwnProperty.call(controller, "produce") && !Object.prototype.hasOwnProperty.call(controller, "activate") && !Object.prototype.hasOwnProperty.call(controller, "run"), "Production facade exposes no delegated authority mutation entry point.");
    const grantedProjection = await controller.grantNextOpacityMutation();
    check(grantedProjection.active === true && grantedProjection.capabilityId === "set-opacity-v1" && grantedProjection.remainingActions === 1 && grantedProjection.expiresAt !== null && grantedProjection.taskId !== null, "Explicit narrow consent creates exactly one fixed opacity pilot grant.");
    await expectCode(controller.grantNextOpacityMutation({ capabilityId: "other" }), "LIFECYCLE_BLOCKED", "Consent API accepts no caller-owned grant spec.");
    const revokedProjection = await controller.revokeOpacityDelegation();
    check(revokedProjection.state === "revoked" && revokedProjection.active === false, "Narrow revoke terminates the exact active pilot grant.");
    let expiryClock = 1000;
    const expirySession = sessionRuntime.createSessionLog({ sessionId: "session_runtime_expiry" });
    const expiryPublished = [];
    expirySession.subscribe((event) => expiryPublished.push(event.kind));
    const expiryRuntime = createController({ exactAgentSession: expirySession, environment: { now: () => expiryClock } });
    await expiryRuntime.initialize(); await expiryRuntime.grantNextOpacityMutation();
    check(expirySession.getEvents().map((event) => event.kind).join(",") === "permission/decided,delegation/granted" && expiryPublished.join(",") === "permission/decided,delegation/granted", "Consent commits and then publishes trusted permission and grant events once.");
    expiryClock += 60000;
    check(expiryRuntime.getAuthorityProjection().state === "expired" && expiryRuntime.getAuthorityProjection().active === false, "Trusted Store clock expiry returns the pilot to an inactive projection.");
    expiryRuntime.dispose();
    const observationReadPort = controller.getObservationReadPort();
    check(Object.isFrozen(observationReadPort) && Object.keys(observationReadPort).sort().join(",") === "capture,getState", "initialized Runtime exposes one frozen read-only Observation port.");
    check(!Object.prototype.hasOwnProperty.call(observationReadPort, "buildRequest") && !Object.prototype.hasOwnProperty.call(observationReadPort, "execute"), "Observation read port exposes no execution authority.");
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
    check(!/ownData\(options,\s*["']activationPolicy["']\)/.test(runtimeSource), "Runtime exposes no caller option for replacing the source-owned activation policy.");
    console.log("test-vela-runtime: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
