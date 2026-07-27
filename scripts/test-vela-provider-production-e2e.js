#!/usr/bin/env node
"use strict";
const assert = require("assert");
const runtimeModule = require("../client/js/vela/velaRuntime");
const protocolModule = require("../client/js/vela/velaProtocol");
const parserModule = require("../client/js/vela/velaResponseParser");
const providerAdapterModule = require("../client/js/vela/velaProviderAdapter");
const providerControllerModule = require("../client/js/vela/velaProviderController");
const routerModule = require("../client/js/vela/velaProviderProposalRouter");
const controllerModule = require("../client/js/vela/velaController");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const preflightModule = require("../client/js/vela/velaExecutionPreflight");
const adapterModule = require("../client/js/vela/velaExecutionAdapter");
const contextModule = require("../client/js/vela/velaContext");
const nodeRuntime = require("./velaNodeRuntime");
let assertions = 0;
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) { await assert.rejects(Promise.resolve(value), (error) => error && (Array.isArray(code) ? code.indexOf(error.code) !== -1 : error.code === code), message); assertions += 1; }
function decode(source) {
    const contextPrefix = "AEToolbox.VelaContext.handle(";
    const executionPrefix = "AEToolbox.VelaExecution.handle(";
    if (source.indexOf(contextPrefix) === 0) return { kind: "context", request: JSON.parse(JSON.parse(source.slice(contextPrefix.length, -1))) };
    if (source.indexOf(executionPrefix) === 0) return { kind: "execution", request: JSON.parse(JSON.parse(source.slice(executionPrefix.length, -1))) };
    throw new Error("Unexpected Host facade.");
}
function hostContext(request, snapshot) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }
function hostContextError(request, code) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error: { code, message: "bounded" } }); }
function hostExecution(request, digest) { return JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: true, hostExecutionRevision: "vela-execution-host-v1", result: { capabilityId: "set-opacity-v1", valueKind: "number", resultingValueDigest: digest } }); }
function makeHarness() {
    let now = 1;
    const state = { value: 25, selectionCount: 1, layerIndex: 3, generation: 3, epoch: 1, error: null, providerMode: "proposal", proposalOpacity: 57.5 };
    const calls = [];
    const environment = Object.assign({}, nodeRuntime, {
        now: () => now++, setTimeout, clearTimeout, TextDecoder,
        fetch(url, options) {
            const body = JSON.parse(options.body);
            const requestId = /Use requestId (req_[a-z0-9]+)/.exec(body.messages[0].content)[1];
            let envelope;
            if (state.providerMode === "text") envelope = { type: "text", text: "safe text" };
            else if (state.providerMode === "error") envelope = { type: "error", error: { code: "EXPRESSION_NOT_ALLOWLISTED", stage: "provider", retryable: false, message: "untrusted", details: {} } };
            else if (state.providerMode === "malformed") envelope = { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 101 } } };
            else envelope = { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: state.proposalOpacity } } };
            const response = JSON.stringify({ id: "local", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ protocol: "vela.model-response.v1", schemaVersion: "1.1", requestId, provider: "lmstudio", model: "m", envelope }), tool_calls: [] }, finish_reason: "stop" }], usage: {} });
            let sent = false;
            return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } });
        }
    });
    const digestProtocol = protocolModule.createProtocol(environment);
    const digestContext = contextModule.createContextApi(digestProtocol);
    const runtime = runtimeModule.createRuntime({ environment, invokeHost(source, callback) {
        const call = decode(source); calls.push(call);
        if (call.kind === "execution") { state.value = call.request.scope.params.opacity; callback(hostExecution(call.request, digestContext.digestPropertyValue("number", state.value))); return; }
        if (call.request.operation === "getCapabilities") { callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } })); return; }
        if (state.error) { callback(hostContextError(call.request, state.error)); return; }
        if (call.request.operation === "captureContext") { callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, tier: 1, projectGeneration: state.generation, activeComp: { itemId: 12, projectGeneration: state.generation, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: state.selectionCount, identityQuality: "native-layer-id", items: state.selectionCount === 1 ? [{ nativeLayerId: 45, layerIndex: state.layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }] : [] } })); return; }
        callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, projectGeneration: state.generation, sampleTime: 1, tier: 3, targets: call.request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: state.value } })) }));
    } });
    return { runtime, state, calls };
}
async function sendProposal(harness, opacity) { harness.state.providerMode = "proposal"; harness.state.proposalOpacity = opacity; return harness.runtime.sendProviderMessage({ message: "Set the selected layer opacity to " + opacity + "%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); }
async function run() {
    check(typeof protocolModule.createProtocol === "function" && typeof parserModule.createResponseParser === "function" && typeof providerAdapterModule.createLocalOpenAICompatibleProvider === "function" && typeof providerControllerModule.createProviderController === "function" && typeof routerModule.createProposalRouter === "function" && typeof controllerModule.createController === "function" && typeof validatorModule.createActionValidator === "function" && typeof planModule.createPlanStore === "function" && typeof preflightModule.createExecutionPreflight === "function" && typeof adapterModule.createExecutionAdapter === "function", "D2-C loads the real production Protocol, parser, provider, router, controller, validator, plan, preflight and execution adapter modules.");
    const h = makeHarness(); await h.runtime.initialize();
    const greeting = makeHarness(); await greeting.runtime.initialize();
    const rejectedGreeting = await greeting.runtime.sendProviderMessage({ message: "你好", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(rejectedGreeting.state === "intent-rejected" && greeting.runtime.getProviderUiState().proposalCapabilityId === null && greeting.runtime.getUiState().candidateId === null, "A production Runtime greeting cannot promote a valid model proposal to proposal-ready.");
    await expectCode(greeting.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "A rejected production proposal cannot be reviewed into a candidate.");
    const ready = await sendProposal(h, 57.5);
    check(ready.state === "proposal-ready" && ready.suggestedOpacity === 57.5 && h.runtime.getUiState().candidateId === null, "A schema 1.1 localProposal reaches proposal-ready without a candidate.");
    check(h.calls.filter((call) => call.kind === "execution").length === 0, "Provider result and Review preconditions make zero Host mutation calls.");
    const pending = await h.runtime.reviewProviderProposal();
    check(pending.state === "pending-confirmation" && pending.proposedValue === 57.5 && h.runtime.getProviderUiState().state === "idle", "Parameterless Review one-shot consumes the proposal and creates only the local confirmation candidate.");
    check(h.calls.filter((call) => call.kind === "execution").length === 0, "Review is not approval and cannot call the Host execution facade.");
    const consumed = await h.runtime.approveCandidate({ candidateId: pending.candidateId });
    check(consumed.state === "consumed" && h.calls.filter((call) => call.kind === "execution").length === 1, "Approve reaches real Preflight and ExecutionAdapter with exactly one fake Host execution call.");
    await expectCode(h.runtime.approveCandidate({ candidateId: pending.candidateId }), "CANDIDATE_STATE_INVALID", "Consumed candidates cannot replay execution.");
    const rejected = makeHarness(); await rejected.runtime.initialize(); await sendProposal(rejected, 0); const rejectPending = await rejected.runtime.reviewProviderProposal(); await rejected.runtime.rejectCandidate({ candidateId: rejectPending.candidateId });
    check(rejected.calls.filter((call) => call.kind === "execution").length === 0, "Reject produces zero Host execution calls.");
    for (const opacity of [0, 57.5, 100]) { const edge = makeHarness(); await edge.runtime.initialize(); await sendProposal(edge, opacity); const candidate = await edge.runtime.reviewProviderProposal(); check(candidate.proposedValue === opacity, "Boundary opacity " + opacity + " promotes through the real local candidate path."); }
    const replay = makeHarness(); await replay.runtime.initialize(); await sendProposal(replay, 57.5); await replay.runtime.reviewProviderProposal(); await expectCode(replay.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "Double Review cannot replay a consumed proposal.");
    const drift = makeHarness(); await drift.runtime.initialize(); await sendProposal(drift, 57.5); const driftPending = await drift.runtime.reviewProviderProposal(); drift.state.selectionCount = 2; await expectCode(drift.runtime.approveCandidate({ candidateId: driftPending.candidateId }), ["CONTEXT_STALE", "UNKNOWN_TARGET", "SCHEMA_VALIDATION_FAILED"], "Selection drift after Review blocks execution before Host mutation."); check(drift.calls.filter((call) => call.kind === "execution").length === 0, "Drift rejection remains before the Host execution boundary.");
    const valueDrift = makeHarness(); await valueDrift.runtime.initialize(); await sendProposal(valueDrift, 57.5); const valuePending = await valueDrift.runtime.reviewProviderProposal(); valueDrift.state.value = 40; await expectCode(valueDrift.runtime.approveCandidate({ candidateId: valuePending.candidateId }), "CONTEXT_STALE", "Value drift after Review fails closed.");
    const expression = makeHarness(); await expression.runtime.initialize(); await sendProposal(expression, 57.5); const expressionPending = await expression.runtime.reviewProviderProposal(); expression.state.error = "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED"; await expectCode(expression.runtime.approveCandidate({ candidateId: expressionPending.candidateId }), "CONTEXT_VALUE_EVALUATION_DISALLOWED", "Expression evaluation blocking remains in the production preflight chain.");
    const lifecycle = makeHarness(); await lifecycle.runtime.initialize(); await sendProposal(lifecycle, 57.5); check(lifecycle.runtime.resetSession() === true, "Session reset is accepted before Review."); await expectCode(lifecycle.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "ResetSession clears the old provider proposal.");
    const text = makeHarness(); await text.runtime.initialize(); text.state.providerMode = "text"; await text.runtime.sendProviderMessage({ message: "text", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); check(text.runtime.getProviderUiState().state === "completed", "Text results do not enter proposal-ready.");
    const modelError = makeHarness(); await modelError.runtime.initialize(); modelError.state.providerMode = "error"; const modelErrorResult = await modelError.runtime.sendProviderMessage({ message: "current value", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); check(modelErrorResult.state === "failed" && modelErrorResult.errorCode === "PROVIDER_RESPONSE_INVALID" && modelError.runtime.getProviderUiState().proposalCapabilityId === null && !JSON.stringify(modelErrorResult).includes("EXPRESSION_NOT_ALLOWLISTED"), "A model-authored error is rejected as a generic local invalid response without proposal state or model error leakage.");
    const bad = makeHarness(); await bad.runtime.initialize(); bad.state.providerMode = "malformed"; const badResult = await bad.runtime.sendProviderMessage({ message: "bad", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); check(badResult.state === "failed" && badResult.errorCode === "PARAM_OUT_OF_RANGE" && bad.runtime.getProviderUiState().proposalCapabilityId === null, "Malformed localProposal fails closed before proposal-ready state.");
    check(!JSON.stringify(h.runtime.getStatus()).match(/proposal|router|capture|digest|nativeLayerId|planId|candidateId/i), "Runtime status remains diagnostic-only and leaks no proposal or trusted data.");
    console.log("test-vela-provider-production-e2e: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
