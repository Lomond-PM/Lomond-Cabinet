#!/usr/bin/env node
"use strict";

const assert = require("assert");
const runtimeModule = require("../client/js/vela/velaRuntime");
const activationPolicy = require("../client/js/vela/velaActivationPolicy").VelaActivationPolicy;
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
function providerHttpResponse(body, envelope) {
    const requestId = /Use requestId (req_[a-z0-9]+)/.exec(body.messages[0].content)[1];
    const content = JSON.stringify({ protocol: "vela.model-response.v1", schemaVersion: "1.1", requestId, provider: "lmstudio", model: body.model, envelope });
    const response = JSON.stringify({ id: "local", object: "chat.completion", created: 1, model: body.model, choices: [{ index: 0, message: { role: "assistant", content, tool_calls: [] }, finish_reason: "stop" }], usage: {} });
    let sent = false;
    return { status: 200, redirected: false, url: "http://127.0.0.1:1234/v1/chat/completions", headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } };
}
function providerRawHttpResponse(body, content) {
    const response = JSON.stringify({ id: "local", object: "chat.completion", created: 1, model: body.model, choices: [{ index: 0, message: { role: "assistant", content, tool_calls: [] }, finish_reason: "stop" }], usage: {} });
    let sent = false;
    return { status: 200, redirected: false, url: "http://127.0.0.1:1234/v1/chat/completions", headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } };
}
function deferredProviderFetch(queue) {
    return function (url, options) {
        return new Promise((resolve) => queue.push({ body: JSON.parse(options.body), signal: options.signal, resolve }));
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
    if (options.fetch) environment.fetch = options.fetch;
    if (options.omitNow === true) delete environment.now;
    const runtime = runtimeModule.createRuntime({
        activationPolicy,
        environment,
        invokeHost(source, callback) {
            const call = decodeCall(source);
            calls.push(call);
            if (call.kind === "context") {
                if (call.request.operation === "getCapabilities" && call.request.tier === 0) callback(contextSuccess(call.request, tier0()));
                else if (call.request.operation === "captureContext" && options.contextQueue) options.contextQueue.push({ call, callback });
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
    check(ready.state === "ready" && ready.beforeValue === 25 && ready.candidateId === null, "Runtime refresh publishes the current bounded opacity without creating a candidate.");
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

    const separatedManual = makeRuntime();
    separatedManual.state.value = 100;
    await separatedManual.runtime.initialize();
    const separatedReady = await separatedManual.runtime.refreshContext();
    const separatedCandidate = await separatedManual.runtime.createOpacityCandidate({ opacity: 50 });
    check(separatedReady.beforeValue === 100 && separatedCandidate.beforeValue === 100 && separatedCandidate.proposedValue === 50, "A legacy manual candidate keeps trusted current opacity as beforeValue and uses only explicit input as proposedValue.");
    check(separatedManual.calls.filter((call) => call.kind === "execution").length === 0, "Creating a separated manual candidate does not execute the Host action.");

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

    const proposalResponses = [];
    const proposalHarness = makeRuntime({ fetch: deferredProviderFetch(proposalResponses) });
    await proposalHarness.runtime.initialize();
    const providerProposal = proposalHarness.runtime.sendProviderMessage({ message: "Set the selected layer opacity to 57.5%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    check(proposalResponses.length === 1, "Production Runtime starts one Provider request for an explicit proposal.");
    proposalResponses[0].resolve(providerHttpResponse(proposalResponses[0].body, { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 57.5 } } }));
    await providerProposal;
    check(proposalHarness.runtime.getProviderUiState().state === "proposal-ready", "The production Provider reaches private proposal-ready before legacy Refresh (actual: " + proposalHarness.runtime.getProviderUiState().state + ", " + proposalHarness.runtime.getProviderUiState().errorCode + ").");
    await proposalHarness.runtime.refreshContext();
    check(proposalHarness.runtime.getProviderUiState().state === "idle", "Legacy Refresh atomically discards an already-ready Provider proposal.");
    await expectCode(proposalHarness.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "A Refresh-discarded proposal cannot later enter Review or create a candidate.");
    check(proposalHarness.runtime.getUiState().candidateId === null, "Discarding a Provider proposal during Refresh creates no legacy candidate.");
    const manualLegacyCandidate = await proposalHarness.runtime.createOpacityCandidate({ opacity: 100 });
    check(manualLegacyCandidate.state === "pending-confirmation" && manualLegacyCandidate.proposedValue === 100 && proposalHarness.runtime.getProviderUiState().state === "idle", "A later legacy manual Review input of 100 creates an independent legacy candidate, not a recovered Provider proposal.");

    const pendingResponses = [];
    const pendingProvider = makeRuntime({ fetch: deferredProviderFetch(pendingResponses) });
    await pendingProvider.runtime.initialize();
    const pendingSend = pendingProvider.runtime.sendProviderMessage({ message: "Hello", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    check(pendingResponses.length === 1 && pendingProvider.runtime.getProviderUiState().state === "pending", "The production Provider remains pending before Refresh starts its own capture.");
    await pendingProvider.runtime.refreshContext();
    check(pendingProvider.runtime.getProviderUiState().state === "pending" && pendingResponses[0].signal.aborted === false, "Legacy Refresh does not cancel, invalidate, replace, or abort a pending Provider request.");
    const pendingRequestId = pendingProvider.runtime.getProviderUiState().requestId;
    pendingResponses[0].resolve(providerHttpResponse(pendingResponses[0].body, { type: "text", text: "Hello." }));
    await pendingSend;
    check(pendingProvider.runtime.getProviderUiState().state === "completed" && pendingProvider.runtime.getProviderUiState().requestId === pendingRequestId && pendingProvider.runtime.getProviderUiState().errorCode === null, "A valid deferred text response keeps its Provider request identity and completes normally after Refresh.");

    const pendingProposalResponses = [];
    const pendingProposal = makeRuntime({ fetch: deferredProviderFetch(pendingProposalResponses) });
    await pendingProposal.runtime.initialize();
    const pendingProposalSend = pendingProposal.runtime.sendProviderMessage({ message: "Set the selected layer opacity to 50%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const pendingProposalRequestId = pendingProposal.runtime.getProviderUiState().requestId;
    await pendingProposal.runtime.refreshContext();
    pendingProposalResponses[0].resolve(providerHttpResponse(pendingProposalResponses[0].body, { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 50 } } }));
    await pendingProposalSend;
    check(pendingProposal.runtime.getProviderUiState().state === "proposal-ready" && pendingProposal.runtime.getProviderUiState().requestId === pendingProposalRequestId && pendingProposal.runtime.getProviderUiState().suggestedOpacity === 50, "A valid deferred Provider proposal remains independently accepted when Refresh began during Provider pending.");

    const invalidResponses = [];
    const invalidProvider = makeRuntime({ fetch: deferredProviderFetch(invalidResponses) });
    await invalidProvider.runtime.initialize();
    const invalidSend = invalidProvider.runtime.sendProviderMessage({ message: "Hello", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await invalidProvider.runtime.refreshContext();
    invalidResponses[0].resolve(providerRawHttpResponse(invalidResponses[0].body, "not-json"));
    await invalidSend;
    check(invalidProvider.runtime.getProviderUiState().state === "failed" && invalidProvider.runtime.getProviderUiState().errorCode === "JSON_PARSE_FAILED", "Malformed model JSON remains the Parser's JSON_PARSE_FAILED error after an otherwise isolated Refresh.");

    const providerCaptureQueue = [];
    const bridgePendingResponses = [];
    const bridgePending = makeRuntime({ fetch: deferredProviderFetch(bridgePendingResponses), contextQueue: providerCaptureQueue });
    await bridgePending.runtime.initialize();
    const bridgePendingSend = bridgePending.runtime.sendProviderMessage({ message: "Hello", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expectCode(bridgePending.runtime.refreshContext(), "EXECUTION_BUSY", "Refresh has no owned handle while the Provider owns the Bridge capture.");
    await expectCode(bridgePending.runtime.refreshContext(), "EXECUTION_BUSY", "Repeated Refresh cannot cancel or claim the Provider capture.");
    check(providerCaptureQueue.length === 1 && bridgePendingResponses.length === 0, "Busy Refresh does not replace the Provider capture or start a transport request early.");
    providerCaptureQueue[0].callback(contextSuccess(providerCaptureQueue[0].call.request, binding(bridgePending.state)));
    await new Promise((resolve) => setTimeout(resolve, 0));
    bridgePendingResponses[0].resolve(providerHttpResponse(bridgePendingResponses[0].body, { type: "text", text: "Hello." }));
    await bridgePendingSend;
    check(bridgePending.runtime.getProviderUiState().state === "completed" && bridgePending.runtime.getProviderUiState().errorCode === null, "The Provider capture and subsequent valid text response complete normally after busy Refresh rejection.");

    console.log("test-vela-confirmation-flow: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
