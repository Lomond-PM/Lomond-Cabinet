#!/usr/bin/env node
"use strict";
const assert = require("assert");
const composerPath = require.resolve("../client/js/vela/velaConfirmedAuthorityComposer");
const realComposerModule = require(composerPath);
const composerTracker = { creates: 0, composes: 0, executes: 0, cancels: 0, disposes: 0, instances: [], semantics: [], policies: [], deferExecuteSettlement: false, pendingExecuteSettlements: [] };
require.cache[composerPath].exports = Object.freeze({
    MODULE_REVISION: realComposerModule.MODULE_REVISION,
    createReviewedSemantics(intent, candidate, resolver) { const value = realComposerModule.createReviewedSemantics(intent, candidate, resolver); composerTracker.semantics.push({ intent, candidate, value }); return value; },
    createReviewedPolicySemantics(decision) { const value = realComposerModule.createReviewedPolicySemantics(decision); composerTracker.policies.push({ decision, value }); return value; },
    sameReviewedSemantics: realComposerModule.sameReviewedSemantics,
    createConfirmedAuthorityComposer(options) {
        composerTracker.creates += 1;
        const real = realComposerModule.createConfirmedAuthorityComposer(options);
        const record = { options, real };
        composerTracker.instances.push(record);
        return Object.freeze({ compose(input) { composerTracker.composes += 1; return real.compose(input); }, executeConfirmed() { composerTracker.executes += 1; return Promise.resolve(real.executeConfirmed()).then((result) => composerTracker.deferExecuteSettlement ? new Promise((resolve) => { composerTracker.pendingExecuteSettlements.push({ result, release() { resolve(result); } }); }) : result); }, cancel() { composerTracker.cancels += 1; return real.cancel(); }, dispose() { composerTracker.disposes += 1; return real.dispose(); } });
    }
});
const runtimeModule = require("../client/js/vela/velaRuntime");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");
const activationPolicy = require("../client/js/vela/velaActivationPolicy").VelaActivationPolicy;
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
const planningModule = require("../client/js/vela/velaPlanningContracts");
const presentationModule = require("../client/js/vela/velaPresentationModel").VelaPresentationModel;
const agentDriverModule = require("../client/js/vela/velaAgentDriver");
const nodeRuntime = require("./velaNodeRuntime");
let assertions = 0;
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) { await assert.rejects(Promise.resolve(value), (error) => error && (Array.isArray(code) ? code.indexOf(error.code) !== -1 : error.code === code), message); assertions += 1; }
async function flushUntil(predicate, message) { let index; for (index = 0; index < 40 && !predicate(); index += 1) { await Promise.resolve(); if (index % 5 === 4) await new Promise((resolve) => setImmediate(resolve)); } check(predicate(), message); }
function decode(source) {
    const contextPrefix = "AEToolbox.VelaContext.handle(";
    const executionPrefix = "AEToolbox.VelaExecution.handle(";
    if (source.indexOf(contextPrefix) === 0) return { kind: "context", request: JSON.parse(JSON.parse(source.slice(contextPrefix.length, -1))) };
    if (source.indexOf(executionPrefix) === 0) return { kind: "execution", request: JSON.parse(JSON.parse(source.slice(executionPrefix.length, -1))) };
    throw new Error("Unexpected Host facade.");
}
function hostContext(request, snapshot) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }
function hostContextError(request, code, reason) { const error = { code, message: "bounded" }; if (reason) error.reason = reason; return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error }); }
function hostExecution(request, digest) { return JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: true, hostExecutionRevision: "vela-execution-host-v1", result: { capabilityId: "set-opacity-v1", valueKind: "number", resultingValueDigest: digest } }); }
function makeHarness() {
    let now = 1700000000000;
    const state = { value: 25, name: "Layer A", selectionCount: 1, nativeLayerId: 45, layerIndex: 3, generation: 3, epoch: 1, error: null, executionError: null, executionMutationCommitted: undefined, deferExecutionSettlement: false, pendingExecutionSettlements: [], committedObservationError: null, deferCommittedObservation: false, pendingCommittedObservations: [], providerMode: "proposal", proposalCapability: "set-opacity-v1", proposalOpacity: 57.5, proposalName: "Hero", reasoningContent: null, reasoningTokens: 0, groundingUnavailableOnce: false, contextHostErrorOnce: null, contextHostReasonOnce: null, advanceLayerIdAfterCapture: false, deferProviderResponse: false, pendingProviderReads: [], cancelledProviderRequestIds: [], deferContextCapture: false, pendingContextCaptures: [], baselineReadError: null, propertyCaptureCount: 0 };
    const calls = [];
    const providerBodies = [];
    const environment = Object.assign({}, nodeRuntime, {
        now: () => now++, setTimeout, clearTimeout, TextDecoder,
        fetch(url, options) {
            const body = JSON.parse(options.body);
            providerBodies.push(body);
            const requestId = /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(body.messages[1].content).turnResponseContract)[1];
            let envelope;
            if (state.providerMode === "text") envelope = { type: "text", text: "safe text" };
            else if (state.providerMode === "error") envelope = { type: "error", error: { code: "EXPRESSION_NOT_ALLOWLISTED", stage: "provider", retryable: false, message: "untrusted", details: {} } };
            else if (state.providerMode === "malformed") envelope = { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 101 } } };
            else envelope = state.proposalCapability === "set-layer-name-v1" ? { type: "localProposal", proposal: { capabilityId: "set-layer-name-v1", params: { name: state.proposalName } } } : { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: state.proposalOpacity } } };
            const response = JSON.stringify({ id: "local", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ protocol: "vela.model-response.v1", schemaVersion: "1.1", requestId, provider: "lmstudio", model: "m", envelope }), reasoning_content: state.reasoningContent, tool_calls: [] }, finish_reason: "stop" }], usage: { completion_tokens_details: { reasoning_tokens: state.reasoningTokens } } });
            let sent = false;
            if (options.signal && typeof options.signal.addEventListener === "function") { options.signal.addEventListener("abort", () => { state.cancelledProviderRequestIds.push(requestId); }); }
            return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); if (state.deferProviderResponse) { return new Promise((resolve) => { state.pendingProviderReads.push({ requestId, release() { sent = true; resolve({ done: false, value: new TextEncoder().encode(response) }); } }); }); } sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } });
        }
    });
    const digestProtocol = protocolModule.createProtocol(environment);
    const digestContext = contextModule.createContextApi(digestProtocol);
    const session = sessionRuntime.createSessionLog();
    const runtime = runtimeModule.createRuntime({ activationPolicy, environment, exactAgentSession: session, invokeHost(source, callback) {
        const call = decode(source); calls.push(call);
        if (call.kind === "execution") { const complete = () => { if (state.executionError) { const error = { code: state.executionError, message: "bounded" }; if (typeof state.executionMutationCommitted === "boolean") error.mutationCommitted = state.executionMutationCommitted; if (state.executionMutationCommitted === true) { if (call.request.capabilityId === "set-layer-name-v1") state.name = call.request.scope.params.name; else state.value = call.request.scope.params.opacity; } callback(JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: call.request.requestId, sessionId: call.request.sessionId, operation: "executeCapability", ok: false, hostExecutionRevision: "vela-execution-host-v1", error })); return; } if (call.request.capabilityId === "set-layer-name-v1") { state.name = call.request.scope.params.name; callback(JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: call.request.requestId, sessionId: call.request.sessionId, operation: "executeCapability", ok: true, hostExecutionRevision: "vela-execution-host-v1", result: { capabilityId: "set-layer-name-v1", valueKind: "string", resultingValueDigest: digestContext.digestPropertyValue("string", state.name) } })); } else { state.value = call.request.scope.params.opacity; callback(hostExecution(call.request, digestContext.digestPropertyValue("number", state.value))); } }; if (state.deferExecutionSettlement) { state.pendingExecutionSettlements.push({ release: complete }); return; } complete(); return; }
        if (call.request.operation === "getCapabilities") { callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } })); return; }
        if (state.error) { callback(hostContextError(call.request, state.error)); return; }
        if (call.request.operation === "captureContext") { if (state.contextHostErrorOnce) { const code = state.contextHostErrorOnce; const reason = state.contextHostReasonOnce; state.contextHostErrorOnce = null; state.contextHostReasonOnce = null; callback(hostContextError(call.request, code, reason)); return; } if (state.groundingUnavailableOnce) { state.groundingUnavailableOnce = false; callback(hostContextError(call.request, "HOST_CONTEXT_UNAVAILABLE", "no-actionable-target")); return; } const complete = () => { callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, tier: 1, projectGeneration: state.generation, activeComp: { itemId: 12, projectGeneration: state.generation, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: state.selectionCount, identityQuality: "native-layer-id", items: state.selectionCount === 1 ? [{ nativeLayerId: state.nativeLayerId, layerIndex: state.layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }] : [] } })); if (state.advanceLayerIdAfterCapture) { state.advanceLayerIdAfterCapture = false; state.nativeLayerId += 1; } }; if (state.deferContextCapture) { state.pendingContextCaptures.push({ requestId: call.request.requestId, release: complete }); return; } complete(); return; }
        if (call.request.operation === "observeCommittedPropertyValue") { const complete = () => { if (state.committedObservationError) callback(hostContextError(call.request, state.committedObservationError)); else callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, projectGeneration: state.generation, tier: 3, target: Object.assign({}, call.request.scope.target, { value: call.request.scope.target.targetKind === "layer-attribute" ? { kind: "string", data: state.name } : { kind: "number", data: state.value } }) })); }; if (state.deferCommittedObservation) { state.pendingCommittedObservations.push({ release: complete }); return; } complete(); return; }
        if (call.request.operation === "observeCommittedLayerAttributeValue") { callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, projectGeneration: state.generation, tier: 3, target: Object.assign({}, call.request.scope.target, { value: { kind: "string", data: state.name } }) })); return; }
        if (call.request.operation === "captureLayerAttributeValue") { callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, projectGeneration: state.generation, tier: 3, target: Object.assign({}, call.request.scope.target, { value: { kind: "string", data: state.name } }) })); return; }
        state.propertyCaptureCount += 1;
        if (state.baselineReadError && state.propertyCaptureCount > 1) { callback(hostContextError(call.request, state.baselineReadError)); return; }
        callback(hostContext(call.request, { hostInstanceId: HOST, hostReloadEpoch: state.epoch, projectGeneration: state.generation, sampleTime: 1, tier: 3, targets: call.request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: state.value } })) }));
    } });
    return { runtime, session, state, calls, providerBodies };
}
async function sendProposal(harness, opacity) { harness.state.providerMode = "proposal"; harness.state.proposalOpacity = opacity; return harness.runtime.sendProviderMessage({ message: "Set the selected layer opacity to " + opacity + "%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); }
async function run() {
    const reasoningSentinel = "A3_REASONING_SECRET_SENTINEL_94827";
    check(typeof protocolModule.createProtocol === "function" && typeof parserModule.createResponseParser === "function" && typeof providerAdapterModule.createLocalOpenAICompatibleProvider === "function" && typeof providerControllerModule.createProviderController === "function" && typeof routerModule.createProposalRouter === "function" && typeof controllerModule.createController === "function" && typeof validatorModule.createActionValidator === "function" && typeof planModule.createPlanStore === "function" && typeof preflightModule.createExecutionPreflight === "function" && typeof adapterModule.createExecutionAdapter === "function", "D2-C loads the real production Protocol, parser, provider, router, controller, validator, plan, preflight and execution adapter modules.");
    const h = makeHarness(); const createsBeforeFirstSetup = composerTracker.creates; await h.runtime.initialize();
    check(composerTracker.creates === createsBeforeFirstSetup + 1 && composerTracker.instances.length === composerTracker.creates, "Runtime setup creates exactly one private ConfirmedAuthorityComposer instance.");
    check(!Object.keys(h.runtime).some((key) => /composer/i.test(key)) && composerTracker.composes === 0, "Runtime exposes no Composer instance and E1 setup never calls compose.");
    const agentSlice = makeHarness(); agentSlice.state.proposalOpacity = 63; await agentSlice.runtime.initialize(); await agentSlice.runtime.grantNextOpacityMutation();
    const agentPort = agentSlice.runtime.getAgentDriverRuntimePort();
    const reasoning = await agentPort.reason({ message: "Set the selected layer opacity to 63%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const agentIntent = planningModule.createCapabilityIntent({ intentId: "intent_agent_e2e", capabilityId: reasoning.capabilityId, requestedOperation: "mutate", params: reasoning.params });
    const agentOutcome = await agentPort.submitIntent({ sessionId: agentSlice.session.getSessionId(), taskId: "agent_task_e2e", taskPlanId: "agent_plan_e2e", stepId: "agent_step_e2e", capabilityIntent: agentIntent });
    const agentVerification = await agentPort.verifyOpacity({ taskId: "agent_task_e2e", expectedOpacity: 63 });
    check(agentOutcome.state === "executed" && agentOutcome.committed === true && agentSlice.calls.filter((call) => call.kind === "execution").length === 1, "Agent Driver port reaches the existing delegated execution spine exactly once.");
    check(agentVerification.fresh === true && agentVerification.matches === true && agentVerification.opacity === 63, "Agent Driver port performs a fresh trusted opacity read after commit.");
    const textRoute = makeHarness(); await textRoute.runtime.initialize(); textRoute.state.providerMode = "text";
    const textPortResult = await textRoute.runtime.getAgentDriverRuntimePort().reason({ message: "hello", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(textPortResult.type === "text" && textPortResult.text === "safe text" && textRoute.runtime.getProviderSurfaceState().state === "completed" && textRoute.runtime.getProviderSurfaceState().text === "safe text", "canonical Provider text routes through Runtime as bounded visible text without review ownership.");
    check(textRoute.calls.filter((call) => call.kind === "execution").length === 0 && textRoute.runtime.getAuthorityProjection().active === false, "Runtime text routing creates no Host mutation or authority.");
    let textTurn = 0;
    const textEvents = [];
    const textDriver = agentDriverModule.createAgentDriver({ beginTurn() { textTurn += 1; return Object.freeze({ sessionId: textRoute.session.getSessionId(), turnId: "text_turn_" + textTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "text_observation_" + textTurn }); }, appendSessionEvent(event) { textEvents.push(event); return event; }, onListenerError() {} });
    check(textDriver.attachRuntimePort(textRoute.runtime.getAgentDriverRuntimePort()), "text Driver attaches the production Runtime port once.");
    const textOff = await textDriver.startObjective({ message: "hello without reasoning", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    textRoute.state.reasoningContent = reasoningSentinel; textRoute.state.reasoningTokens = 321;
    const textOn = await textDriver.startObjective({ message: "hello with reasoning", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(textOff.terminal.outcome === "completed" && textOn.terminal.outcome === "completed" && textOn.objectiveId !== textOff.objectiveId && textRoute.runtime.getProviderSurfaceState().text === "safe text", "reasoning-off and reasoning-on text share completed semantics and the next objective remains usable.");
    check(textEvents.filter((event) => ["ae/state-observed", "agent/action-performed", "task/review-required", "tool/result"].indexOf(event.kind) !== -1).length === 0 && textRoute.calls.filter((call) => call.kind === "execution").length === 0 && !JSON.stringify({ events: textEvents, surface: textRoute.runtime.getProviderSurfaceState(), driver: textDriver.getSnapshot() }).includes(reasoningSentinel), "text objectives fabricate no review, action, tool, or AE observation events, perform no Host mutation, and expose no reasoning.");
    const sequence = makeHarness(); await sequence.runtime.initialize(); await sequence.runtime.grantNextOpacityMutation();
    let sequenceTurn = 0;
    const sequenceEvents = [];
    const sequenceDriver = agentDriverModule.createAgentDriver({
        beginTurn() { sequenceTurn += 1; return Object.freeze({ sessionId: sequence.session.getSessionId(), turnId: "sequence_turn_" + sequenceTurn }); },
        observe() { return Promise.resolve(); },
        getObservation() { return Object.freeze({ observationRevision: "sequence_observation_" + sequenceTurn }); },
        appendSessionEvent(event) { sequenceEvents.push(event); return event; },
        onListenerError() {}
    });
    check(sequenceDriver.attachRuntimePort(sequence.runtime.getAgentDriverRuntimePort()), "sequence Driver attaches the real production Runtime port once.");
    const cancelRace = makeHarness(); await cancelRace.runtime.initialize();
    let cancelRaceTurn = 0;
    const cancelRaceDriver = agentDriverModule.createAgentDriver({ beginTurn() { cancelRaceTurn += 1; return Object.freeze({ sessionId: cancelRace.session.getSessionId(), turnId: "cancel_race_turn_" + cancelRaceTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "cancel_race_observation_" + cancelRaceTurn }); }, appendSessionEvent() {}, onListenerError() {} });
    check(cancelRaceDriver.attachRuntimePort(cancelRace.runtime.getAgentDriverRuntimePort()), "cancel-race Driver attaches the production Runtime port once.");
    check(cancelRace.runtime.attachObjectiveReviewPort(Object.freeze({ getProjection() { const snapshot = cancelRaceDriver.getSnapshot(); const review = snapshot.suspendedReview; return snapshot.state === "awaiting-review" && review ? Object.freeze({ state: "active", reviewId: review.reviewId, revision: review.revision, capabilityId: review.capabilityId, beforeValue: review.beforeValue, proposedValue: review.params.opacity, outcome: null }) : Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null }); }, resolve(input) { return cancelRaceDriver.resolveReview(input); } })), "cancel-race Runtime attaches a bounded Driver review projection.");
    cancelRace.state.reasoningContent = reasoningSentinel; cancelRace.state.reasoningTokens = 321; cancelRace.state.deferProviderResponse = true;
    const cancelledObjectivePromise = cancelRaceDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    await flushUntil(() => cancelRace.state.pendingProviderReads.length === 1, "objective one reaches a deferred Provider response with a real request identity.");
    const cancelledRequestId = cancelRace.state.pendingProviderReads[0].requestId;
    check(typeof cancelledRequestId === "string" && cancelRace.runtime.getProviderUiState().requestId === cancelledRequestId, "Runtime canonical Provider state exposes objective one's exact non-null request id.");
    check(cancelRaceDriver.cancel(), "composer-style objective cancellation terminalizes the in-flight Driver objective.");
    check(cancelRace.state.cancelledProviderRequestIds.length === 1 && cancelRace.state.cancelledProviderRequestIds[0] === cancelledRequestId, "Agent Runtime cancel correlates Provider cancellation to objective one's exact request id.");
    cancelRace.state.pendingProviderReads.shift().release();
    const cancelledObjective = await cancelledObjectivePromise;
    check(cancelledObjective.state === "terminal" && cancelledObjective.terminal.outcome === "cancelled", "a transport response that arrives after abort cannot replace Driver cancellation truth.");
    check(cancelRace.runtime.getStatus().state === "ready" && cancelRace.runtime.getProviderUiState().state !== "proposal-ready" && cancelRace.runtime.getProviderUiState().state !== "proposal-reviewing" && cancelRace.runtime.getConfirmationSurfaceState().state === "idle", "late objective-one completion leaves Runtime ready with no stale Provider or Confirmation review.");
    check(cancelRace.calls.filter((call) => call.kind === "execution").length === 0 && cancelRace.providerBodies.length === 1 && !JSON.stringify(cancelRaceDriver.getSnapshot()).includes(reasoningSentinel), "late otherwise-valid reasoning-heavy settlement creates no review, authority, Host mutation, retry, or Driver leakage.");
    cancelRace.state.deferProviderResponse = false; cancelRace.state.value = 100; cancelRace.state.proposalOpacity = 47;
    const recoveredObjective = await cancelRaceDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const recoveredRequestId = /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(cancelRace.providerBodies[1].messages[1].content).turnResponseContract)[1];
    check(recoveredRequestId !== cancelledRequestId && recoveredObjective.state === "awaiting-review" && recoveredObjective.terminal === null && recoveredObjective.suspendedReview.beforeValue === 100 && recoveredObjective.suspendedReview.params.opacity === 47, "objective two uses fresh correlation and retains the distinct trusted 100 to 47 presentation baseline without LIFECYCLE_BLOCKED: " + JSON.stringify(recoveredObjective.terminal));
    check(cancelRace.runtime.getConfirmationSurfaceState().state === "confirmation-ready" && cancelRace.runtime.getConfirmationSurfaceState().beforeValue === 100 && cancelRace.runtime.getConfirmationSurfaceState().proposedValue === 47, "the fresh objective alone owns the bounded 100 to 47 Confirmation presentation.");
    check(cancelRaceDriver.cancel() && cancelRace.runtime.getConfirmationSurfaceState().state === "idle", "true awaiting-review cancellation remains terminal and restores idle Confirmation.");
    check(cancelRace.state.cancelledProviderRequestIds.length === 1, "awaiting-review cancellation does not target an already-settled or unrelated Provider request.");
    cancelRace.state.proposalOpacity = 49;
    const afterReviewCancel = await cancelRaceDriver.startObjective({ message: "Set the selected layer opacity to 49%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(afterReviewCancel.state === "awaiting-review" && afterReviewCancel.objectiveId !== recoveredObjective.objectiveId, "a fresh objective still starts after true awaiting-review cancellation.");
    cancelRaceDriver.cancel();
    const baselineFailure = makeHarness(); await baselineFailure.runtime.initialize(); baselineFailure.state.value = 100; baselineFailure.state.proposalOpacity = 47; baselineFailure.state.baselineReadError = "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED";
    let baselineFailureTurn = 0;
    const baselineFailureDriver = agentDriverModule.createAgentDriver({ beginTurn() { baselineFailureTurn += 1; return Object.freeze({ sessionId: baselineFailure.session.getSessionId(), turnId: "baseline_failure_turn_" + baselineFailureTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "baseline_failure_observation_" + baselineFailureTurn }); }, appendSessionEvent() {}, onListenerError() {} });
    check(baselineFailureDriver.attachRuntimePort(baselineFailure.runtime.getAgentDriverRuntimePort()), "baseline-failure Driver attaches the production Runtime port once.");
    const nullableBaseline = await baselineFailureDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(nullableBaseline.terminal && nullableBaseline.terminal.outcome === "blocked" && nullableBaseline.terminal.code === "CONTEXT_VALUE_EVALUATION_DISALLOWED" && baselineFailure.runtime.getProviderUiState().state === "local-proposal-handled", "barrier evidence failure blocks rather than creating a non-resumable review while Provider remains terminal-settled.");
    check(baselineFailure.calls.filter((call) => call.kind === "execution").length === 0 && baselineFailure.runtime.getAuthorityProjection().remainingActions === null, "barrier evidence failure performs no Host mutation and consumes no authority.");
    baselineFailureDriver.cancel();
    async function directBarrier(harness, label, serial) {
        const port = harness.runtime.getAgentDriverRuntimePort();
        const reason = await port.reason({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
        const localLabel = label.replace(/[^a-z0-9_-]/gi, "_");
        const intent = planningModule.createCapabilityIntent({ intentId: "intent_direct_" + localLabel + "_" + serial, capabilityId: reason.capabilityId, requestedOperation: "mutate", params: reason.params });
        const identity = { objectiveId: "objective_direct_" + localLabel + "_" + serial, sessionId: harness.session.getSessionId(), turnId: "turn_direct_" + localLabel + "_" + serial, taskId: "task_direct_" + localLabel + "_" + serial, taskPlanId: "plan_direct_" + localLabel + "_" + serial, taskPlanRevision: 0, stepId: "step_direct_" + localLabel + "_" + serial, reviewRevision: serial, capabilityIntent: intent };
        const outcome = await port.submitIntent(identity);
        check(outcome.state === "review-required" && typeof outcome.reviewCorrelation === "string", label + " direct setup establishes a valid Runtime barrier correlation.");
        const semantic = composerTracker.semantics.filter((item) => item.intent === intent).slice(-1)[0];
        const policy = composerTracker.policies[composerTracker.policies.length - 1];
        return { port, outcome, semantic, policy, composer: composerTracker.instances[composerTracker.instances.length - 1], input: Object.freeze(Object.assign({}, identity, { localExpectation: Object.freeze({ opacity: 47 }), reviewId: "review_direct_" + localLabel + "_" + serial, reviewCorrelation: outcome.reviewCorrelation })) };
    }
    function privateClaim(barrier, overrides) {
        return barrier.composer.options.claimApprovedReview(Object.assign({ reviewCorrelation: barrier.input.reviewCorrelation, reviewId: barrier.input.reviewId, reviewRevision: barrier.input.reviewRevision, objectiveId: barrier.input.objectiveId, taskId: barrier.input.taskId, sessionId: barrier.input.sessionId, turnId: barrier.input.turnId, taskPlanId: barrier.input.taskPlanId, taskPlanRevision: barrier.input.taskPlanRevision, stepId: barrier.input.stepId, capabilityIntent: barrier.input.capabilityIntent, reviewedSemantics: barrier.semantic.value, reviewPolicySemantics: barrier.policy.value, freshSemantics: barrier.semantic.value, freshCandidateId: barrier.semantic.candidate.candidateId, runtimeGeneration: barrier.composer.options.getRuntimeGeneration() }, overrides || {}));
    }
    const correlationHarness = makeHarness(); correlationHarness.state.proposalOpacity = 47; await correlationHarness.runtime.initialize();
    const firstCorrelation = await directBarrier(correlationHarness, "correlation", 1);
    const providerCountBeforeContinuation = correlationHarness.providerBodies.length;
    const composesBeforeContinuation = composerTracker.composes;
    const executesBeforeContinuation = composerTracker.executes;
    const firstContinuation = await firstCorrelation.port.continueApprovedReview(firstCorrelation.input);
    check(firstContinuation.state === "verification-required", "first direct continuation composes, executes and reaches the A1 checkpoint once: " + JSON.stringify(firstContinuation));
    check(Object.isFrozen(firstCorrelation.semantic.value) && Object.isFrozen(firstCorrelation.policy.value) && firstCorrelation.semantic.intent === firstCorrelation.input.capabilityIntent && firstCorrelation.policy.decision.decision === "REVIEW_REQUIRED", "Runtime stores canonical immutable reviewed semantics and real REVIEW_REQUIRED policy truth from the initial candidate path.");
    check(privateClaim(firstCorrelation).claimed === false && composerTracker.composes === composesBeforeContinuation + 1 && composerTracker.executes === executesBeforeContinuation + 1 && correlationHarness.calls.filter((call) => call.kind === "execution").length === 1, "Runtime continuation consumes approval internally and performs exactly one compose, execute and Host mutation.");
    const duplicateContinuation = await firstCorrelation.port.continueApprovedReview(firstCorrelation.input);
    check(duplicateContinuation.state === "blocked" && duplicateContinuation.code === "LIFECYCLE_BLOCKED" && composerTracker.composes === composesBeforeContinuation + 1 && composerTracker.executes === executesBeforeContinuation + 1 && correlationHarness.calls.filter((call) => call.kind === "execution").length === 1, "duplicate direct continuation fails closed without a second compose, execute or Host mutation.");
    const committedReadsBeforeIdentityProbe = correlationHarness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length;
    const wrongVerifyIdentity = await firstCorrelation.port.verifyCommittedAction({ objectiveId: "objective_wrong_verify", taskId: firstCorrelation.input.taskId, expectedOpacity: 47 });
    check(wrongVerifyIdentity.state === "blocked" && correlationHarness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === committedReadsBeforeIdentityProbe, "wrong Verify identity fails closed without consuming or reading the correct committed target.");
    const wrongVerifyTask = await firstCorrelation.port.verifyCommittedAction({ objectiveId: firstCorrelation.input.objectiveId, taskId: "task_wrong_verify", expectedOpacity: 47 });
    const wrongVerifyExpectation = await firstCorrelation.port.verifyCommittedAction({ objectiveId: firstCorrelation.input.objectiveId, taskId: firstCorrelation.input.taskId, expectedOpacity: 48 });
    check(wrongVerifyTask.state === "blocked" && wrongVerifyExpectation.state === "blocked" && correlationHarness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === committedReadsBeforeIdentityProbe, "wrong task or expected opacity fails closed without consuming another objective's committed capability.");
    const firstVerified = await firstCorrelation.port.verifyCommittedAction({ objectiveId: firstCorrelation.input.objectiveId, taskId: firstCorrelation.input.taskId, expectedOpacity: 47 });
    check(firstVerified.state === "verified" && correlationHarness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === committedReadsBeforeIdentityProbe + 1, "correct logical identity consumes the private association and verifies the committed target once.");
    const duplicateVerify = await firstCorrelation.port.verifyCommittedAction({ objectiveId: firstCorrelation.input.objectiveId, taskId: firstCorrelation.input.taskId, expectedOpacity: 47 });
    check(duplicateVerify.state === "blocked" && correlationHarness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === committedReadsBeforeIdentityProbe + 1, "duplicate committed Verify fails closed without a second Host read.");
    const secondCorrelation = await directBarrier(correlationHarness, "correlation", 2);
    check(secondCorrelation.outcome.reviewCorrelation !== firstCorrelation.outcome.reviewCorrelation, "a fresh objective receives a distinct Runtime correlation.");
    const historicalInput = Object.assign({}, secondCorrelation.input, { reviewCorrelation: firstCorrelation.outcome.reviewCorrelation });
    const historicalResult = await secondCorrelation.port.continueApprovedReview(historicalInput);
    check(historicalResult.state === "blocked", "historical correlation cannot bind to a fresh objective.");
    const wrongIdentity = Object.assign({}, secondCorrelation.input, { objectiveId: "objective_cross_scope" });
    const wrongIdentityResult = await secondCorrelation.port.continueApprovedReview(wrongIdentity);
    check(wrongIdentityResult.state === "blocked", "valid correlation with wrong logical identity fails closed without consuming the valid binding.");
    const secondContinuation = await secondCorrelation.port.continueApprovedReview(secondCorrelation.input);
    check(secondContinuation.state === "verification-required" && correlationHarness.providerBodies.length === providerCountBeforeContinuation + 1 && correlationHarness.calls.filter((call) => call.kind === "execution").length === 2, "valid fresh identity performs one new production execution without a continuation Provider request.");
    correlationHarness.state.nativeLayerId = 99;
    const selectionDriftVerified = await secondCorrelation.port.verifyCommittedAction({ objectiveId: secondCorrelation.input.objectiveId, taskId: secondCorrelation.input.taskId, expectedOpacity: 47 });
    const selectionDriftRequest = correlationHarness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").slice(-1)[0];
    check(selectionDriftVerified.state === "verified" && selectionDriftRequest.request.scope.target.nativeLayerId === 45, "post-commit selection drift still verifies the original execute-time native target without current-selection fallback.");

    const mismatchHarness = makeHarness(); mismatchHarness.state.proposalOpacity = 47; await mismatchHarness.runtime.initialize();
    const mismatchBarrier = await directBarrier(mismatchHarness, "post_commit_mismatch", 1); check((await mismatchBarrier.port.continueApprovedReview(mismatchBarrier.input)).state === "verification-required", "mismatch fixture commits before verification.");
    mismatchHarness.state.value = 60;
    check((await mismatchBarrier.port.verifyCommittedAction({ objectiveId: mismatchBarrier.input.objectiveId, taskId: mismatchBarrier.input.taskId, expectedOpacity: 47 })).state === "unverified" && mismatchHarness.calls.filter((call) => call.kind === "execution").length === 1, "external post-commit target change maps to unverified without mutation retry.");

    const missingTargetHarness = makeHarness(); missingTargetHarness.state.proposalOpacity = 47; await missingTargetHarness.runtime.initialize();
    const missingTargetBarrier = await directBarrier(missingTargetHarness, "post_commit_missing", 1); await missingTargetBarrier.port.continueApprovedReview(missingTargetBarrier.input); missingTargetHarness.state.committedObservationError = "HOST_CONTEXT_TARGET_NOT_FOUND";
    check((await missingTargetBarrier.port.verifyCommittedAction({ objectiveId: missingTargetBarrier.input.objectiveId, taskId: missingTargetBarrier.input.taskId, expectedOpacity: 47 })).code === "VERIFICATION_UNAVAILABLE", "missing committed target blocks with canonical verification unavailable and no fallback.");

    const lateVerifyHarness = makeHarness(); lateVerifyHarness.state.proposalOpacity = 47; await lateVerifyHarness.runtime.initialize();
    const lateVerifyBarrier = await directBarrier(lateVerifyHarness, "late_verify", 1); await lateVerifyBarrier.port.continueApprovedReview(lateVerifyBarrier.input); lateVerifyHarness.state.deferCommittedObservation = true;
    const lateVerifyPromise = lateVerifyBarrier.port.verifyCommittedAction({ objectiveId: lateVerifyBarrier.input.objectiveId, taskId: lateVerifyBarrier.input.taskId, expectedOpacity: 47 });
    await flushUntil(() => lateVerifyHarness.state.pendingCommittedObservations.length === 1, "committed-target Verify reaches an in-flight Host read.");
    lateVerifyBarrier.port.cancel(); lateVerifyHarness.state.deferCommittedObservation = false; lateVerifyHarness.state.pendingCommittedObservations.shift().release();
    check((await lateVerifyPromise).state === "cancelled" && (await lateVerifyBarrier.port.verifyCommittedAction({ objectiveId: lateVerifyBarrier.input.objectiveId, taskId: lateVerifyBarrier.input.taskId, expectedOpacity: 47 })).state === "blocked", "cancelled in-flight Verify ignores late success and cannot reacquire the consumed capability.");

    async function lateVerifyLifecycle(label, lifecycle, lateMode) {
        const harness = makeHarness(); harness.state.proposalOpacity = 47; await harness.runtime.initialize();
        const barrier = await directBarrier(harness, label, 1); await barrier.port.continueApprovedReview(barrier.input);
        harness.state.deferCommittedObservation = true;
        const pending = barrier.port.verifyCommittedAction({ objectiveId: barrier.input.objectiveId, taskId: barrier.input.taskId, expectedOpacity: 47 });
        await flushUntil(() => harness.state.pendingCommittedObservations.length === 1, label + " reaches one in-flight committed-target read.");
        if (lifecycle === "reset") check(harness.runtime.resetSession(), label + " resets Runtime while Verify is pending.");
        else if (lifecycle === "dispose") check(harness.runtime.dispose(), label + " disposes Runtime while Verify is pending.");
        else barrier.port.cancel();
        if (lateMode === "false") harness.state.value = 60;
        if (lateMode === "unavailable") harness.state.committedObservationError = "HOST_CONTEXT_TARGET_NOT_FOUND";
        harness.state.deferCommittedObservation = false; harness.state.pendingCommittedObservations.shift().release();
        const result = await pending;
        const reads = harness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length;
        check(result.state === "cancelled" && reads === 1, label + " ignores late " + lateMode + " settlement without a second committed-target read.");
        check((await barrier.port.verifyCommittedAction({ objectiveId: barrier.input.objectiveId, taskId: barrier.input.taskId, expectedOpacity: 47 })).state === "blocked", label + " leaves the consumed association unavailable.");
    }
    await lateVerifyLifecycle("cancel_verify_false", "cancel", "false");
    await lateVerifyLifecycle("cancel_verify_unavailable", "cancel", "unavailable");
    await lateVerifyLifecycle("reset_verify_true", "reset", "true");
    await lateVerifyLifecycle("dispose_verify_true", "dispose", "true");

    async function lateExecutionLifecycle(label, lifecycle, mutationCommitted) {
        const harness = makeHarness(); harness.state.proposalOpacity = 47; harness.state.deferExecutionSettlement = true; harness.state.executionError = "HOST_EXECUTION_RESULT_UNAVAILABLE"; harness.state.executionMutationCommitted = mutationCommitted; await harness.runtime.initialize();
        const barrier = await directBarrier(harness, label, 1);
        const pending = barrier.port.continueApprovedReview(barrier.input);
        await flushUntil(() => harness.state.pendingExecutionSettlements.length === 1, label + " reaches one dispatched Host mutation.");
        if (lifecycle === "reset") check(harness.runtime.resetSession(), label + " resets Runtime after Host dispatch.");
        else if (lifecycle === "dispose") check(harness.runtime.dispose(), label + " disposes Runtime after Host dispatch.");
        else if (lifecycle === "suspend") check(harness.runtime.suspend(), label + " suspends Runtime after Host dispatch.");
        else barrier.port.cancel();
        harness.state.deferExecutionSettlement = false; harness.state.pendingExecutionSettlements.shift().release();
        const result = await pending;
        check(result.state === "cancelled" && harness.calls.filter((call) => call.kind === "execution").length === 1, label + " keeps lifecycle cancelled after one late Host settlement.");
        check(harness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === 0, label + " never verifies a late post-cancel commit.");
        check((await barrier.port.verifyCommittedAction({ objectiveId: barrier.input.objectiveId, taskId: barrier.input.taskId, expectedOpacity: 47 })).state === "blocked", label + " cannot reuse an old verification association.");
        if (lifecycle === "suspend") check(harness.runtime.resume(), label + " resumes only with a fresh Composer lifecycle.");
        if (lifecycle !== "dispose") {
            harness.state.executionError = null; harness.state.executionMutationCommitted = undefined;
            const fresh = await directBarrier(harness, label + "_fresh", 2);
            const freshContinuation = await fresh.port.continueApprovedReview(fresh.input);
            const freshVerification = await fresh.port.verifyCommittedAction({ objectiveId: fresh.input.objectiveId, taskId: fresh.input.taskId, expectedOpacity: 47 });
            check(freshContinuation.state === "verification-required" && freshVerification.state === "verified", label + " permits a fresh objective after old late settlement.");
            check(harness.calls.filter((call) => call.kind === "execution").length === 2 && harness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === 1, label + " isolates the fresh objective to one new Host mutation and one new committed-target Verify.");
        }
    }
    await lateExecutionLifecycle("cancel_post_dispatch_true", "cancel", true);
    await lateExecutionLifecycle("cancel_post_dispatch_null", "cancel", undefined);
    await lateExecutionLifecycle("reset_post_dispatch_true", "reset", true);
    await lateExecutionLifecycle("dispose_post_dispatch_true", "dispose", true);
    await lateExecutionLifecycle("suspend_post_dispatch_true", "suspend", true);

    async function callbackBeforeSettlementLifecycle(label, lifecycle) {
        const harness = makeHarness(); harness.state.proposalOpacity = 47; await harness.runtime.initialize();
        const barrier = await directBarrier(harness, label, 1);
        composerTracker.deferExecuteSettlement = true;
        const pending = barrier.port.continueApprovedReview(barrier.input);
        await flushUntil(() => composerTracker.pendingExecuteSettlements.length === 1, label + " owns committed verification before execute Promise settlement.");
        if (lifecycle === "reset") check(harness.runtime.resetSession(), label + " resets after callback ownership.");
        else if (lifecycle === "dispose") check(harness.runtime.dispose(), label + " disposes after callback ownership.");
        else barrier.port.cancel();
        composerTracker.deferExecuteSettlement = false; composerTracker.pendingExecuteSettlements.shift().release();
        const result = await pending;
        check(result.state === "cancelled" && harness.calls.filter((call) => call.kind === "execution").length === 1, label + " late execute settlement cannot revive the continuation.");
        check(harness.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === 0, label + " invalidates the callback-created capability before any Verify read.");
        check((await barrier.port.verifyCommittedAction({ objectiveId: barrier.input.objectiveId, taskId: barrier.input.taskId, expectedOpacity: 47 })).state === "blocked", label + " leaves no orphan committed verification entry.");
    }
    await callbackBeforeSettlementLifecycle("callback_cancel", "cancel");
    await callbackBeforeSettlementLifecycle("callback_reset", "reset");
    await callbackBeforeSettlementLifecycle("callback_dispose", "dispose");

    async function executionTruth(label, mutationCommitted) {
        const harness = makeHarness(); harness.state.proposalOpacity = 47; harness.state.executionError = "HOST_EXECUTION_RESULT_UNAVAILABLE"; harness.state.executionMutationCommitted = mutationCommitted; await harness.runtime.initialize();
        const barrier = await directBarrier(harness, label, 1);
        const result = await barrier.port.continueApprovedReview(barrier.input);
        return { harness, barrier, result };
    }
    const committedUnavailable = await executionTruth("committed_unavailable", true);
    check(committedUnavailable.result.state === "verification-required" && committedUnavailable.harness.calls.filter((call) => call.kind === "execution").length === 1, "committed:true plus unavailable execution result still reaches the future committed-target verification checkpoint.");
    check((await committedUnavailable.barrier.port.verifyCommittedAction({ objectiveId: committedUnavailable.barrier.input.objectiveId, taskId: committedUnavailable.barrier.input.taskId, expectedOpacity: 47 })).state === "verified", "committed:true plus unavailable execution result can complete through independent committed-target verification.");
    const confirmedNoncommit = await executionTruth("confirmed_noncommit", false);
    check(confirmedNoncommit.result.state === "blocked" && confirmedNoncommit.harness.calls.filter((call) => call.kind === "execution").length === 1, "committed:false terminal-blocks without verification or execution retry.");
    const uncertainCommit = await executionTruth("uncertain_commit", undefined);
    check(uncertainCommit.result.state === "blocked" && uncertainCommit.harness.calls.filter((call) => call.kind === "execution").length === 1, "committed:null fails closed without verification or execution retry.");

    const rejectClaimHarness = makeHarness(); rejectClaimHarness.state.proposalOpacity = 47; await rejectClaimHarness.runtime.initialize(); let rejectTurn = 0;
    const rejectDriver = agentDriverModule.createAgentDriver({ beginTurn() { rejectTurn += 1; return Object.freeze({ sessionId: rejectClaimHarness.session.getSessionId(), turnId: "reject_claim_turn_" + rejectTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "reject_claim_observation_" + rejectTurn }); }, appendSessionEvent() {}, onListenerError() {} });
    const rejectPort = rejectClaimHarness.runtime.getAgentDriverRuntimePort(); rejectDriver.attachRuntimePort(rejectPort);
    rejectClaimHarness.runtime.attachObjectiveReviewPort(Object.freeze({ getProjection() { const snapshot = rejectDriver.getSnapshot(); const review = snapshot.suspendedReview; return snapshot.state === "awaiting-review" && review ? Object.freeze({ state: "active", reviewId: review.reviewId, revision: review.revision, capabilityId: review.capabilityId, beforeValue: review.beforeValue, proposedValue: review.params.opacity, outcome: null }) : Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null }); }, resolve(input) { return rejectDriver.resolveReview(input); } }));
    const rejectReview = await rejectDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); const rejectedReview = rejectReview.suspendedReview; const rejectedIntent = composerTracker.semantics[composerTracker.semantics.length - 1].intent;
    const composesBeforeReject = composerTracker.composes;
    await rejectClaimHarness.runtime.rejectActiveCandidate();
    const rejectedContinuation = await rejectPort.continueApprovedReview({ objectiveId: rejectedReview.objectiveId, taskId: rejectedReview.taskId, sessionId: rejectedReview.sessionId, turnId: rejectedReview.turnId, taskPlanId: rejectedReview.taskPlanId, taskPlanRevision: rejectedReview.taskPlanRevision, stepId: rejectedReview.stepId, capabilityIntent: rejectedIntent, localExpectation: rejectedReview.localExpectation, reviewId: rejectedReview.reviewId, reviewRevision: rejectedReview.revision, reviewCorrelation: rejectedReview.reviewCorrelation });
    check(rejectedContinuation.state === "blocked" && composerTracker.composes === composesBeforeReject && rejectClaimHarness.calls.filter((call) => call.kind === "execution").length === 0, "Reject deletes the Runtime-private review record and cannot create claimable approval, TaskRun, or Host activity.");

    const lifecycleClaimHarness = makeHarness(); lifecycleClaimHarness.state.proposalOpacity = 47; await lifecycleClaimHarness.runtime.initialize();
    const lifecycleClaim = await directBarrier(lifecycleClaimHarness, "lifecycle_claim", 1); await lifecycleClaim.port.continueApprovedReview(lifecycleClaim.input);
    const createsBeforeSuspend = composerTracker.creates; check(lifecycleClaimHarness.runtime.suspend() === true && privateClaim(lifecycleClaim).claimed === false, "Suspend invalidates a claimable record.");
    check(lifecycleClaimHarness.runtime.resume() === true && composerTracker.creates === createsBeforeSuspend + 1, "Resume creates a fresh Runtime-private Composer after suspended lifecycle disposal.");
    const disposesBeforeReset = composerTracker.disposes; check(lifecycleClaimHarness.runtime.resetSession() === true && composerTracker.disposes === disposesBeforeReset + 1, "Session reset disposes the old Composer before creating a fresh instance.");
    const disposesBeforeDispose = composerTracker.disposes; check(lifecycleClaimHarness.runtime.dispose() === true && composerTracker.disposes === disposesBeforeDispose + 1, "Runtime dispose closes the private Composer before downstream references are lost.");

    const cancelBarrier = makeHarness(); cancelBarrier.state.proposalOpacity = 47; await cancelBarrier.runtime.initialize();
    let cancelBarrierTurn = 0;
    const cancelBarrierDriver = agentDriverModule.createAgentDriver({ beginTurn() { cancelBarrierTurn += 1; return Object.freeze({ sessionId: cancelBarrier.session.getSessionId(), turnId: "cancel_barrier_turn_" + cancelBarrierTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "cancel_barrier_observation_" + cancelBarrierTurn }); }, appendSessionEvent() {}, onListenerError() {} });
    check(cancelBarrierDriver.attachRuntimePort(cancelBarrier.runtime.getAgentDriverRuntimePort()), "pending-capture cancel Driver attaches the production Runtime port.");
    const cancelBarrierReview = await cancelBarrierDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const cancelledCorrelation = cancelBarrierReview.suspendedReview.reviewCorrelation;
    const cancelProviderCount = cancelBarrier.providerBodies.length;
    cancelBarrier.state.deferContextCapture = true;
    const pendingCancelContinuation = cancelBarrierDriver.resolveReview({ reviewId: cancelBarrierReview.suspendedReview.reviewId, revision: cancelBarrierReview.suspendedReview.revision, outcome: "approved" });
    await flushUntil(() => cancelBarrier.state.pendingContextCaptures.length === 1, "approved continuation reaches a deferred fresh barrier capture.");
    check(cancelBarrierDriver.cancel(), "Driver cancel terminalizes while continuation capture is pending.");
    cancelBarrier.state.deferContextCapture = false; cancelBarrier.state.pendingContextCaptures.shift().release();
    const cancelledContinuation = await pendingCancelContinuation;
    check(cancelledContinuation.terminal && cancelledContinuation.terminal.outcome === "cancelled", "late capture cannot replace Driver cancellation truth.");
    const afterCancelReview = await cancelBarrierDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(afterCancelReview.state === "awaiting-review" && afterCancelReview.suspendedReview.reviewCorrelation !== cancelledCorrelation && cancelBarrier.providerBodies.length === cancelProviderCount + 1, "fresh objective after pending-capture cancel receives a fresh correlation and normal review lifecycle.");
    cancelBarrierDriver.cancel();

    const disposeBarrier = makeHarness(); disposeBarrier.state.proposalOpacity = 47; await disposeBarrier.runtime.initialize();
    const disposable = await directBarrier(disposeBarrier, "dispose", 1);
    const disposeProviderCount = disposeBarrier.providerBodies.length;
    disposeBarrier.state.deferContextCapture = true;
    const pendingDisposeContinuation = disposable.port.continueApprovedReview(disposable.input);
    await flushUntil(() => disposeBarrier.state.pendingContextCaptures.length === 1, "direct continuation reaches a deferred capture before Runtime disposal.");
    check(disposeBarrier.runtime.dispose() && disposeBarrier.runtime.getStatus().state === "disposed", "Runtime dispose invalidates both reasoning and review continuation lifecycle domains.");
    disposeBarrier.state.pendingContextCaptures.shift().release();
    const disposedContinuation = await pendingDisposeContinuation;
    check(disposedContinuation.state === "cancelled" && disposeBarrier.providerBodies.length === disposeProviderCount && disposeBarrier.calls.filter((call) => call.kind === "execution").length === 0, "late capture after dispose settles bounded cancelled with no Provider or Host activity.");
    async function barrierDrift(label, mutate) {
        const harness = makeHarness(); harness.state.proposalOpacity = 47; await harness.runtime.initialize();
        let turn = 0;
        const driver = agentDriverModule.createAgentDriver({ beginTurn() { turn += 1; return Object.freeze({ sessionId: harness.session.getSessionId(), turnId: "barrier_" + label + "_turn_" + turn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "barrier_" + label }); }, appendSessionEvent() {}, onListenerError() {} });
        check(driver.attachRuntimePort(harness.runtime.getAgentDriverRuntimePort()), label + " Driver attaches the production Runtime port.");
        const pending = await driver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
        const providerCount = harness.providerBodies.length;
        check(pending.state === "awaiting-review" && typeof pending.suspendedReview.reviewCorrelation === "string" && !Object.prototype.hasOwnProperty.call(pending.suspendedReview, "valueDigest"), label + " establishes only opaque Driver correlation without barrier evidence leakage: " + JSON.stringify(pending.terminal));
        mutate(harness.state);
        const result = await driver.resolveReview({ reviewId: pending.suspendedReview.reviewId, revision: pending.suspendedReview.revision, outcome: "approved" });
        check(result.state === "awaiting-review" && result.objectiveId === pending.objectiveId && result.turn.turnId !== pending.turn.turnId && result.suspendedReview.reviewId !== pending.suspendedReview.reviewId && result.suspendedReview.reviewCorrelation !== pending.suspendedReview.reviewCorrelation && result.taskPlan.planId !== pending.taskPlan.planId && result.counters.replans === 1, label + " precommit drift starts one fresh bounded iteration and Review without reusing old ownership.");
        check(harness.calls.filter((call) => call.kind === "execution").length === 0 && harness.providerBodies.length === providerCount + 1, label + " drift performs no Host mutation and dispatches exactly one fresh Provider request.");
        const rejected = driver.resolveReview({ reviewId: result.suspendedReview.reviewId, revision: result.suspendedReview.revision, outcome: "rejected" });
        check(rejected.terminal.outcome === "rejected" && harness.calls.filter((call) => call.kind === "execution").length === 0, label + " fresh Review remains mandatory and rejection cannot execute either iteration.");
    }
    await barrierDrift("selection", (state) => { state.nativeLayerId += 1; });
    await barrierDrift("composition", (state) => { state.generation += 1; });
    await barrierDrift("opacity", (state) => { state.value = 65; });
    function providerRequestId(body) { return body.response_format.json_schema.schema.properties.requestId.enum[0]; }
    const replanSuccess = makeHarness(); replanSuccess.state.proposalOpacity = 47; await replanSuccess.runtime.initialize();
    let replanSuccessTurn = 0;
    const replanSuccessEvents = [];
    const replanSuccessDriver = agentDriverModule.createAgentDriver({ beginTurn() { replanSuccessTurn += 1; return Object.freeze({ sessionId: replanSuccess.session.getSessionId(), turnId: "replan_success_turn_" + replanSuccessTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "replan_success_observation_" + replanSuccessTurn }); }, appendSessionEvent(event) { replanSuccessEvents.push(event); return event; }, onListenerError() {} });
    check(replanSuccessDriver.attachRuntimePort(replanSuccess.runtime.getAgentDriverRuntimePort()), "successful replan Driver attaches the production Runtime port.");
    const replanReviewA = await replanSuccessDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const replanPlanA = replanReviewA.taskPlan;
    const replanSuspendedA = replanReviewA.suspendedReview;
    const replanRequestA = providerRequestId(replanSuccess.providerBodies[0]);
    replanSuccess.state.nativeLayerId += 1;
    const replanReviewB = await replanSuccessDriver.resolveReview({ reviewId: replanSuspendedA.reviewId, revision: replanSuspendedA.revision, outcome: "approved" });
    const replanRequestB = providerRequestId(replanSuccess.providerBodies[1]);
    check(replanReviewB.state === "awaiting-review" && replanReviewB.objectiveId === replanReviewA.objectiveId && replanReviewB.turn.turnId !== replanReviewA.turn.turnId && replanReviewB.suspendedReview.reviewId !== replanSuspendedA.reviewId && replanReviewB.suspendedReview.reviewCorrelation !== replanSuspendedA.reviewCorrelation && replanRequestB !== replanRequestA && replanReviewB.taskPlan.planId !== replanPlanA.planId && replanReviewB.taskPlan.steps[0].capabilityIntent.intentId !== replanPlanA.steps[0].capabilityIntent.intentId, "successful production replan creates fresh turn, Provider request, TaskPlan, intent, and Review identities.");
    check(replanSuccess.calls.filter((call) => call.kind === "execution").length === 0 && replanReviewB.counters.replans === 1 && replanReviewB.loop.iterationIndex === 1 && replanReviewB.loop.budgets.iterationsUsed === 2 && replanReviewB.loop.budgets.providerCallsUsed === 2 && replanReviewB.loop.budgets.actionAttemptsUsed === 1, "iteration zero CONTEXT_STALE is committed false, mutates no Host, and exposes exact bounded accounting.");
    await expectCode(Promise.resolve().then(() => replanSuccessDriver.resolveReview({ reviewId: replanSuspendedA.reviewId, revision: replanSuspendedA.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "iteration-one Review rejects the stale iteration-zero approval.");
    check(replanSuccessDriver.getSnapshot().state === "awaiting-review" && replanSuccess.calls.filter((call) => call.kind === "execution").length === 0, "stale approval cannot alter Review B or create Host authority.");
    const replanCompleted = await replanSuccessDriver.resolveReview({ reviewId: replanReviewB.suspendedReview.reviewId, revision: replanReviewB.suspendedReview.revision, outcome: "approved" });
    check(replanCompleted.terminal.outcome === "completed" && replanSuccess.providerBodies.length === 2 && replanSuccess.calls.filter((call) => call.kind === "execution").length === 1 && replanSuccess.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === 1 && replanCompleted.counters.replans === 1, "second iteration executes one Host mutation, verifies the committed target once, and completes without a third iteration.");
    check(replanSuccessEvents.filter((event) => event.kind === "task/started").length === 1 && replanSuccessEvents.filter((event) => event.kind === "task/review-required").length === 2 && replanSuccessEvents.filter((event) => event.kind === "task/completed").length === 1, "successful replan emits one objective start, two real Reviews, and one terminal event.");

    const replanExhausted = makeHarness(); replanExhausted.state.proposalOpacity = 47; await replanExhausted.runtime.initialize();
    let replanExhaustedTurn = 0;
    const replanExhaustedDriver = agentDriverModule.createAgentDriver({ beginTurn() { replanExhaustedTurn += 1; return Object.freeze({ sessionId: replanExhausted.session.getSessionId(), turnId: "replan_exhausted_turn_" + replanExhaustedTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "replan_exhausted_observation_" + replanExhaustedTurn }); }, appendSessionEvent() {}, onListenerError() {} });
    replanExhaustedDriver.attachRuntimePort(replanExhausted.runtime.getAgentDriverRuntimePort());
    const exhaustedReviewA = await replanExhaustedDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    replanExhausted.state.nativeLayerId += 1;
    const exhaustedReviewB = await replanExhaustedDriver.resolveReview({ reviewId: exhaustedReviewA.suspendedReview.reviewId, revision: exhaustedReviewA.suspendedReview.revision, outcome: "approved" });
    replanExhausted.state.nativeLayerId += 1;
    const exhaustedTerminal = await replanExhaustedDriver.resolveReview({ reviewId: exhaustedReviewB.suspendedReview.reviewId, revision: exhaustedReviewB.suspendedReview.revision, outcome: "approved" });
    check(exhaustedTerminal.terminal.outcome === "blocked" && exhaustedTerminal.terminal.code === "AGENT_DRIVER_REPLAN_EXHAUSTED" && exhaustedTerminal.counters.replans === 1 && exhaustedTerminal.loop.iterationIndex === 1 && exhaustedTerminal.loop.budgets.iterationsUsed === 2 && exhaustedTerminal.loop.noProgressCount === 1, "second production CONTEXT_STALE terminates with canonical exhaustion and no-progress truth.");
    check(replanExhausted.providerBodies.length === 2 && replanExhausted.calls.filter((call) => call.kind === "execution").length === 0 && replanExhausted.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === 0, "second stale creates no third Provider, Review, Host mutation, or Verify.");

    const replanCancel = makeHarness(); replanCancel.state.proposalOpacity = 47; await replanCancel.runtime.initialize();
    let replanCancelTurn = 0;
    let releaseReplanObserve;
    const replanCancelEvents = [];
    const replanCancelDriver = agentDriverModule.createAgentDriver({ beginTurn() { replanCancelTurn += 1; return Object.freeze({ sessionId: replanCancel.session.getSessionId(), turnId: "replan_cancel_turn_" + replanCancelTurn }); }, observe() { return replanCancelTurn === 1 ? Promise.resolve() : new Promise((resolve) => { releaseReplanObserve = resolve; }); }, getObservation() { return Object.freeze({ observationRevision: "replan_cancel_observation_" + replanCancelTurn }); }, appendSessionEvent(event) { replanCancelEvents.push(event); return event; }, onListenerError() {} });
    replanCancelDriver.attachRuntimePort(replanCancel.runtime.getAgentDriverRuntimePort());
    const cancelReviewA = await replanCancelDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    replanCancel.state.nativeLayerId += 1;
    const cancelTransition = replanCancelDriver.resolveReview({ reviewId: cancelReviewA.suspendedReview.reviewId, revision: cancelReviewA.suspendedReview.revision, outcome: "approved" });
    await flushUntil(() => typeof releaseReplanObserve === "function", "production replan reaches the deferred second-iteration Observe.");
    check(replanCancelDriver.cancel(), "cancel wins during production second-iteration Observe.");
    releaseReplanObserve();
    const cancelledReplan = await cancelTransition;
    check(cancelledReplan.terminal.outcome === "cancelled" && replanCancel.providerBodies.length === 1 && replanCancel.calls.filter((call) => call.kind === "execution").length === 0 && replanCancelEvents.filter((event) => event.kind === "task/cancelled").length === 1, "cancelled production replan dispatches no Provider two or Review two, mutates no Host, and emits one terminal event.");

    async function iterationOneTerminal(mode, expectedOutcome, expectedCode) {
        const harness = makeHarness(); harness.state.proposalOpacity = 47; await harness.runtime.initialize();
        let turn = 0;
        const events = [];
        const driver = agentDriverModule.createAgentDriver({ beginTurn() { turn += 1; return Object.freeze({ sessionId: harness.session.getSessionId(), turnId: "iteration_one_" + mode + "_turn_" + turn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: turn }); }, appendSessionEvent(event) { events.push(event); return event; }, onListenerError() {} });
        driver.attachRuntimePort(harness.runtime.getAgentDriverRuntimePort());
        const first = await driver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
        harness.state.nativeLayerId += 1; harness.state.providerMode = mode;
        const result = await driver.resolveReview({ reviewId: first.suspendedReview.reviewId, revision: first.suspendedReview.revision, outcome: "approved" });
        check(result.terminal.outcome === expectedOutcome && result.terminal.code === expectedCode && result.counters.replans === 1 && harness.providerBodies.length === 2, "iteration-one " + mode + " settles once without a third Provider: " + JSON.stringify({ terminal: result.terminal, counters: result.counters, providerCalls: harness.providerBodies.length }));
        check(harness.calls.filter((call) => call.kind === "execution").length === 0 && events.filter((event) => event.kind === "task/review-required").length === 1 && events.filter((event) => /^task\/(?:completed|blocked|cancelled|review-rejected)$/.test(event.kind)).length === 1, "iteration-one " + mode + " creates no Review B, Host mutation, retry, or duplicate terminal event.");
    }
    await iterationOneTerminal("error", "blocked", "PROVIDER_RESPONSE_INVALID");
    sequence.state.proposalOpacity = 63;
    const sequenceFirst = await sequenceDriver.startObjective({ message: "Set the selected layer opacity to 63%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(sequenceFirst.terminal.outcome === "completed" && sequence.state.value === 63 && sequence.calls.filter((call) => call.kind === "execution").length === 1, "sequence objective one consumes the grant through exactly one real Host mutation and fresh verification.");
    check(sequence.runtime.getAuthorityProjection().state === "consumed" && sequence.runtime.getAuthorityProjection().remainingActions === 0 && sequence.runtime.getProviderUiState().state === "local-proposal-handled", "sequence objective one closes Provider ownership and exhausts the one-shot grant.");
    sequence.state.proposalOpacity = 47; sequence.state.reasoningContent = reasoningSentinel + " says opacity 90 and do not change anything"; sequence.state.reasoningTokens = 987;
    const sequenceSecond = await sequenceDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    global.AETOOLBOX_DEBUG_REGISTRY = true;
    const sequenceDiagnostics = sequence.runtime.getAuthorityDiagnostics();
    delete global.AETOOLBOX_DEBUG_REGISTRY;
    check(sequenceSecond.objectiveId !== sequenceFirst.objectiveId && sequenceSecond.turn.turnId !== sequenceFirst.turn.turnId && sequenceSecond.taskPlan.planId !== sequenceFirst.taskPlan.planId && sequenceSecond.taskPlan.steps[0].capabilityIntent.intentId !== sequenceFirst.taskPlan.steps[0].capabilityIntent.intentId, "sequence objective two has fresh objective, turn, TaskPlan, and CapabilityIntent ownership.");
    check(sequenceSecond.state === "awaiting-review" && sequenceSecond.terminal === null && sequenceSecond.suspendedReview.objectiveId === sequenceSecond.objectiveId && sequenceDiagnostics.latestDecision.decision === "REVIEW_REQUIRED" && sequenceDiagnostics.latestDecision.reasonCode === "delegated-authority-insufficient", "sequence objective two reaches the real PolicyEngine and suspends with its canonical REVIEW_REQUIRED decision.");
    check(sequence.state.value === 63 && sequence.calls.filter((call) => call.kind === "execution").length === 1 && sequenceSecond.counters.actions === 1 && sequenceSecond.counters.replans === 0, "REVIEW_REQUIRED neither reuses the consumed grant nor retries or calls Host.");
    check(sequence.runtime.getProviderUiState().state === "local-proposal-handled" && sequence.runtime.getProviderUiState().state !== "proposal-ready" && sequence.runtime.getProviderUiState().state !== "proposal-reviewing", "REVIEW_REQUIRED terminal-settles the Provider proposal and clears Runtime-held proposal ownership.");
    const blockedPresentation = presentationModule.create(); blockedPresentation.begin("Set opacity to 47%"); blockedPresentation.apply({ state: "pending", text: null, errorCode: null });
    const blockedTranscript = blockedPresentation.apply({ state: "objective-blocked", text: null, errorCode: "REVIEW_REQUIRED" });
    check(blockedTranscript.pending === false && blockedTranscript.items.some((item) => item.displayTextKey === "vela.surfaceReviewRequired") && !blockedTranscript.items.some((item) => item.displayTextKey === "vela.surfaceProviderResponse"), "REVIEW_REQUIRED has an explicit bounded presentation and never falls back to invalid Provider response.");
    check(sequence.runtime.attachObjectiveReviewPort(Object.freeze({ getProjection() { const snapshot = sequenceDriver.getSnapshot(); const review = snapshot.suspendedReview; const resolution = snapshot.reviewResolution; return snapshot.state === "awaiting-review" && review ? Object.freeze({ state: "active", reviewId: review.reviewId, revision: review.revision, capabilityId: review.capabilityId, beforeValue: review.beforeValue, proposedValue: review.params.opacity, outcome: null }) : snapshot.state === "awaiting-outcome" && resolution && resolution.outcome === "approved" ? Object.freeze({ state: "resolved", reviewId: resolution.reviewId, revision: resolution.revision, capabilityId: null, beforeValue: null, proposedValue: null, outcome: resolution.outcome }) : snapshot.state === "terminal" && snapshot.terminal && snapshot.terminal.outcome === "rejected" && resolution && resolution.outcome === "rejected" ? Object.freeze({ state: "resolved", reviewId: resolution.reviewId, revision: resolution.revision, capabilityId: null, beforeValue: null, proposedValue: null, outcome: resolution.outcome }) : Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null }); }, resolve(input) { return sequenceDriver.resolveReview(input); } })) === true, "production Runtime accepts the bounded Owner-style objective review port once.");
    check(sequence.runtime.getConfirmationSurfaceState().state === "confirmation-ready" && sequence.runtime.getConfirmationSurfaceState().beforeValue === 63 && sequence.runtime.getConfirmationSurfaceState().proposedValue === 47, "real suspended Driver review reaches Confirmation with distinct bounded baseline and proposal values.");
    const sequenceApproved = await sequence.runtime.approveActiveCandidate();
    check(sequenceApproved.state === "terminal" && sequenceApproved.terminal.outcome === "completed" && sequenceApproved.objectiveId === sequenceSecond.objectiveId && sequence.runtime.getConfirmationSurfaceState().state === "idle", "real approve routing preserves the same objective and completes through committed-target verification.");
    check(sequence.state.value === 47 && sequence.calls.filter((call) => call.kind === "execution").length === 2 && sequence.calls.filter((call) => call.request && call.request.operation === "observeCommittedPropertyValue").length === 1 && sequence.runtime.getAuthorityProjection().remainingActions === 0, "A2 approve performs one Host mutation and one exact committed-target observation without delegated fallback.");
    const reasoningObservable = JSON.stringify({ provider: sequence.runtime.getProviderUiState(), runtime: sequence.runtime.getStatus(), driver: sequenceDriver.getSnapshot(), events: sequenceEvents, session: sequence.session.getSnapshot(), diagnostics: sequence.runtime.getProviderDiagnostics() });
    check(!reasoningObservable.includes(reasoningSentinel) && !/reasoning_content|reasoning_tokens/.test(reasoningObservable), "reasoning text, raw auxiliary fields, and reasoning token metadata are absent from Runtime, Driver, Session, events, and production diagnostics.");
    check(sequenceSecond.suspendedReview.params.opacity === 47 && sequence.state.value === 47, "conflicting reasoning prose cannot override final-content opacity or action semantics.");
    check(!sequenceDriver.cancel() && sequenceDriver.getSnapshot().reviewResolution.outcome === "approved", "completed committed verification cannot be cancelled or reinterpret historical approval evidence.");
    check(sequence.runtime.getConfirmationSurfaceState().state === "idle", "completed Driver terminal truth converges Runtime Confirmation to idle.");
    check(sequenceEvents.filter((event) => event.kind === "task/completed").length === 2, "reviewed production completion appends exactly one additional completed event.");
    await expectCode(sequence.runtime.approveActiveCandidate(), "CANDIDATE_STATE_INVALID", "late approve fails closed after approved continuation cancellation.");
    await expectCode(sequence.runtime.rejectActiveCandidate(), "CANDIDATE_STATE_INVALID", "late reject fails closed after approved continuation cancellation.");
    check(sequence.runtime.getProviderUiState().state !== "proposal-ready" && sequence.runtime.getProviderUiState().state !== "proposal-reviewing", "cancel convergence never revives Provider review ownership.");
    await sequence.runtime.grantNextOpacityMutation(); sequence.state.proposalOpacity = 47;
    const sequenceThird = await sequenceDriver.startObjective({ message: "Set the selected layer opacity to 47%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(sequenceThird.terminal.outcome === "completed" && sequenceThird.objectiveId !== sequenceSecond.objectiveId && sequence.state.value === 47 && sequence.calls.filter((call) => call.kind === "execution").length === 3, "a new grant permits a fresh third objective and exactly one additional Host mutation.");
    check(!JSON.stringify(sequence.providerBodies[2].messages).includes(reasoningSentinel) && sequence.providerBodies.every((body) => Object.keys(body).sort().join(",") === "messages,model,response_format,stream" && body.stream === false), "next-turn messages contain no prior reasoning and the production request protocol remains unchanged.");
    const precommit = makeHarness(); precommit.state.selectionCount = 0; precommit.state.proposalOpacity = 58; await precommit.runtime.initialize(); await precommit.runtime.grantNextOpacityMutation();
    let precommitTurn = 0;
    const precommitDriver = agentDriverModule.createAgentDriver({ beginTurn() { precommitTurn += 1; return Object.freeze({ sessionId: precommit.session.getSessionId(), turnId: "precommit_turn_" + precommitTurn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "precommit_observation_" + precommitTurn }); }, appendSessionEvent() {}, onListenerError() {} });
    precommitDriver.attachRuntimePort(precommit.runtime.getAgentDriverRuntimePort());
    const precommitBlocked = await precommitDriver.startObjective({ message: "Set the selected layer opacity to 58%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(precommitBlocked.terminal.outcome === "blocked" && precommit.calls.filter((call) => call.kind === "execution").length === 0, "real no-selection Preflight blocks before Host dispatch without mutation retry.");
    check(precommit.runtime.getAuthorityProjection().state === "active" && precommit.runtime.getAuthorityProjection().active === true && precommit.runtime.getAuthorityProjection().remainingActions === 1 && precommit.runtime.getProviderUiState().state !== "proposal-ready" && precommit.runtime.getProviderUiState().state !== "proposal-reviewing", "pre-commit failure terminal-settles Provider ownership and restores the canonical live grant projection.");
    precommit.state.selectionCount = 1;
    const precommitRecovery = await precommitDriver.startObjective({ message: "Set the selected layer opacity to 58%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(precommitRecovery.terminal.outcome === "completed" && precommit.state.value === 58 && precommit.calls.filter((call) => call.kind === "execution").length === 1 && precommit.runtime.getAuthorityProjection().state === "consumed", "a fresh objective consumes the recovered grant exactly once.");
    const stale = makeHarness(); stale.state.proposalOpacity = 66; await stale.runtime.initialize(); await stale.runtime.grantNextOpacityMutation();
    const stalePort = stale.runtime.getAgentDriverRuntimePort(); const staleReason = await stalePort.reason({ message: "Set the selected layer opacity to 66%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); stale.state.advanceLayerIdAfterCapture = true;
    const staleIntent = planningModule.createCapabilityIntent({ intentId: "intent_stale_precommit", capabilityId: staleReason.capabilityId, requestedOperation: "mutate", params: staleReason.params });
    let staleError = null; try { await stalePort.submitIntent({ sessionId: stale.session.getSessionId(), taskId: "stale_task", taskPlanId: "stale_plan", stepId: "stale_step", capabilityIntent: staleIntent }); } catch (error) { staleError = error; }
    check(staleError && staleError.code === "CONTEXT_STALE", "JIT selection drift rejects before delegated commit; got " + (staleError && staleError.code));
    check(stale.calls.filter((call) => call.kind === "execution").length === 0 && stale.runtime.getAuthorityProjection().state === "active" && stale.runtime.getAuthorityProjection().remainingActions === 1, "stale pre-commit rejection restores active authority without changing binding policy.");
    const postcommit = makeHarness(); postcommit.state.proposalOpacity = 72; postcommit.state.executionError = "HOST_EXECUTION_MUTATION_FAILED"; await postcommit.runtime.initialize(); await postcommit.runtime.grantNextOpacityMutation();
    const postPort = postcommit.runtime.getAgentDriverRuntimePort(); const postReason = await postPort.reason({ message: "Set the selected layer opacity to 72%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const postIntent = planningModule.createCapabilityIntent({ intentId: "intent_postcommit", capabilityId: postReason.capabilityId, requestedOperation: "mutate", params: postReason.params });
    await expectCode(postPort.submitIntent({ sessionId: postcommit.session.getSessionId(), taskId: "post_task", taskPlanId: "post_plan", stepId: "post_step", capabilityIntent: postIntent }), "PLAN_FAILED", "Host failure occurs only after delegated commit consumed the grant.");
    check(postcommit.calls.filter((call) => call.kind === "execution").length === 1 && postcommit.runtime.getAuthorityProjection().state === "failed" && postcommit.runtime.getAuthorityProjection().active === false && postcommit.runtime.getAuthorityProjection().remainingActions === 0, "post-commit failure never restores authority or creates a free retry.");
    const greeting = makeHarness(); await greeting.runtime.initialize();
    const rejectedGreeting = await greeting.runtime.sendProviderMessage({ message: "你好", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(rejectedGreeting.state === "intent-rejected" && rejectedGreeting.intentReason === "missing-action" && rejectedGreeting.proposalCapabilityId === null && greeting.runtime.getProviderUiState().state !== "proposal-ready" && greeting.runtime.getProviderUiState().proposalCapabilityId === null && greeting.runtime.getUiState().candidateId === null, "An actionable-context greeting receiving a mistaken union localProposal is rejected by Intent Gate and cannot create proposal or candidate authority.");
    await expectCode(greeting.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "An Intent-Gate-rejected greeting has no active proposal to review.");
    check(greeting.calls.filter((call) => call.kind === "execution").length === 0, "A union conversational false positive makes zero Host execution calls.");
    const ready = await sendProposal(h, 57.5);
    check(ready.state === "proposal-ready" && ready.suggestedOpacity === 57.5 && h.runtime.getUiState().candidateId === null, "A schema 1.1 localProposal reaches proposal-ready without a candidate.");
    check(h.calls.filter((call) => call.kind === "execution").length === 0, "Provider result and Review preconditions make zero Host mutation calls.");
    const pending = await h.runtime.reviewProviderProposal();
    check(pending.state === "pending-confirmation" && pending.proposedValue === 57.5 && h.runtime.getProviderUiState().state === "idle", "Parameterless Review one-shot consumes the proposal and creates only the local confirmation candidate.");
    check(h.calls.filter((call) => call.kind === "execution").length === 0, "Review is not approval and cannot call the Host execution facade.");
    const consumed = await h.runtime.approveActiveCandidate();
    check(consumed.state === "consumed" && h.calls.filter((call) => call.kind === "execution").length === 1, "Approve reaches real Preflight and ExecutionAdapter with exactly one fake Host execution call.");
    await expectCode(h.runtime.approveActiveCandidate(), "CANDIDATE_STATE_INVALID", "Consumed candidates cannot replay execution.");
    let delegated;
    for (const opacity of [0, 50, 100]) {
        delegated = makeHarness(); await delegated.runtime.initialize(); const delegatedGrant = await delegated.runtime.grantNextOpacityMutation();
        const delegatedPresentation = presentationModule.create(); delegatedPresentation.begin("Set the selected layer opacity to " + opacity + "%"); delegatedPresentation.apply({ state: "pending", text: null, errorCode: null });
        check(delegatedGrant.active === true && delegatedGrant.remainingActions === 1 && delegatedGrant.capabilityId === "set-opacity-v1", "Explicit consent creates the fixed one-shot opacity pilot grant.");
        await sendProposal(delegated, opacity);
        const settledTranscript = delegatedPresentation.apply(delegated.runtime.getProviderSurfaceState());
        check(delegated.state.value === opacity && delegated.calls.filter((call) => call.kind === "execution").length === 1 && delegated.runtime.getConfirmationSurfaceState().state === "idle", "Delegated production route preserves and executes opacity " + opacity + " without human confirmation.");
        check(delegated.runtime.getProviderSurfaceState().state === "local-proposal-handled" && settledTranscript.pending === false && settledTranscript.items.filter((item) => item.kind === "error").length === 0 && settledTranscript.items.filter((item) => item.kind === "assistant").length === 0, "Successful delegated execution settles the final presentation once without unusable-response or fabricated assistant text.");
        check(delegated.runtime.getAuthorityProjection().state === "consumed" && delegated.runtime.getAuthorityProjection().active === false, "Delegated Host attempt consumes the one-shot budget.");
    }
    global.AETOOLBOX_DEBUG_REGISTRY = true;
    const delegatedDiagnostics = delegated.runtime.getAuthorityDiagnostics();
    delete global.AETOOLBOX_DEBUG_REGISTRY;
    check(delegatedDiagnostics.latestParamTrace.provider === 100 && delegatedDiagnostics.latestParamTrace.intent === 100 && delegatedDiagnostics.latestParamTrace.candidate === 100 && delegatedDiagnostics.latestParamTrace.authorizedPlan === 100 && delegatedDiagnostics.latestParamTrace.valueType === "number" && delegatedDiagnostics.latestParamTrace.schemaOwner === "VelaCapabilityContracts:set-opacity-v1", "Debug diagnostics prove the canonical number is unchanged through the production authority route.");
    check(delegatedDiagnostics.latestFailure === null && delegatedDiagnostics.latestExecution && delegatedDiagnostics.latestExecution.committed === true, "A successful realistic-clock delegated route clears failure diagnostics and records committed execution.");
    await sendProposal(delegated, 60);
    check(delegated.runtime.getProviderUiState().state === "proposal-ready" && delegated.calls.filter((call) => call.kind === "execution").length === 1, "An exhausted grant falls back to the existing REVIEW_REQUIRED path without a second Host call.");
    const rejected = makeHarness(); await rejected.runtime.initialize(); await sendProposal(rejected, 0); await rejected.runtime.reviewProviderProposal(); await rejected.runtime.rejectActiveCandidate();
    check(rejected.calls.filter((call) => call.kind === "execution").length === 0, "Reject produces zero Host execution calls.");
    for (const opacity of [0, 57.5, 100]) { const edge = makeHarness(); await edge.runtime.initialize(); await sendProposal(edge, opacity); const candidate = await edge.runtime.reviewProviderProposal(); check(candidate.proposedValue === opacity, "Boundary opacity " + opacity + " promotes through the real local candidate path."); }
    const replay = makeHarness(); await replay.runtime.initialize(); await sendProposal(replay, 57.5); await replay.runtime.reviewProviderProposal(); await expectCode(replay.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "Double Review cannot replay a consumed proposal.");
    const drift = makeHarness(); await drift.runtime.initialize(); await sendProposal(drift, 57.5); await drift.runtime.reviewProviderProposal(); drift.state.selectionCount = 2; await expectCode(drift.runtime.approveActiveCandidate(), ["CONTEXT_STALE", "UNKNOWN_TARGET", "SCHEMA_VALIDATION_FAILED"], "Selection drift after Review blocks execution before Host mutation."); check(drift.calls.filter((call) => call.kind === "execution").length === 0, "Drift rejection remains before the Host execution boundary.");
    // Review value is presentation evidence; the unchanged Tier 1 target is
    // JIT-captured at approval as the absolute set-opacity CAS baseline. Host
    // CAS and resulting-value verification remain in the real production path.
    const valueDrift = makeHarness(); await valueDrift.runtime.initialize(); await sendProposal(valueDrift, 57.5); await valueDrift.runtime.reviewProviderProposal(); valueDrift.state.value = 40; const valueDriftResult = await valueDrift.runtime.approveActiveCandidate(); check(valueDriftResult.state === "consumed" && valueDrift.state.value === 57.5 && valueDrift.calls.filter((call) => call.kind === "execution").length === 1, "Absolute set-opacity uses the step-due value as CAS baseline and still reaches verified Host execution exactly once.");
    const expression = makeHarness(); await expression.runtime.initialize(); await sendProposal(expression, 57.5); await expression.runtime.reviewProviderProposal(); expression.state.error = "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED"; await expectCode(expression.runtime.approveActiveCandidate(), "CONTEXT_VALUE_EVALUATION_DISALLOWED", "Expression evaluation blocking remains in the production preflight chain.");
    const lifecycle = makeHarness(); await lifecycle.runtime.initialize(); await sendProposal(lifecycle, 57.5); check(lifecycle.runtime.resetSession() === true, "Session reset is accepted before Review."); await expectCode(lifecycle.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "ResetSession clears the old provider proposal.");
    const text = makeHarness(); await text.runtime.initialize(); text.state.selectionCount = 0; text.state.providerMode = "text"; await text.runtime.sendProviderMessage({ message: "text", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); check(text.runtime.getProviderUiState().state === "completed" && text.runtime.getProviderUiState().text === "safe text", "No selection still permits a normal text response without proposal authority.");
    const transition = makeHarness(); await transition.runtime.initialize(); transition.state.selectionCount = 0; transition.state.providerMode = "text"; transition.state.contextHostErrorOnce = "HOST_CONTEXT_UNAVAILABLE"; transition.state.contextHostReasonOnce = "no-project"; const transitionFirst = await transition.runtime.sendProviderMessage({ message: "你好", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); const transitionFirstDiagnostics = transition.runtime.getProviderDiagnostics(); transition.state.generation += 1; transition.state.contextHostErrorOnce = "HOST_CONTEXT_UNAVAILABLE"; transition.state.contextHostReasonOnce = "no-active-composition"; const transitionSecond = await transition.runtime.sendProviderMessage({ message: "你好", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); const transitionSecondDiagnostics = transition.runtime.getProviderDiagnostics(); check(transitionFirst.state === "completed" && transitionFirstDiagnostics.lastTerminalRequestId === transitionFirst.requestId && transitionFirstDiagnostics.lastTerminalDisposition === "completed" && transitionFirstDiagnostics.lastContextOperation === "capture-context" && transitionFirstDiagnostics.lastContextDisposition === "unavailable" && transitionFirstDiagnostics.lastContextFailureStage === "host-error" && transitionFirstDiagnostics.lastContextHostErrorCode === "HOST_CONTEXT_UNAVAILABLE" && transitionFirstDiagnostics.lastContextErrorCode === "VERIFICATION_UNAVAILABLE" && transitionFirstDiagnostics.lastContextUnavailableReason === "no-project", "The no-project first request records its completed Provider terminal and unavailable Host correlation."); check(transitionSecond.state === "completed" && transitionSecond.requestId !== transitionFirst.requestId && transitionSecondDiagnostics.lastTerminalRequestId === transitionSecond.requestId && transitionSecondDiagnostics.lastTerminalDisposition === "completed" && transitionSecondDiagnostics.lastTerminalFailureBoundary === null && transitionSecondDiagnostics.lastTerminalErrorCode === null && transitionSecondDiagnostics.lastContextOperation === "capture-context" && transitionSecondDiagnostics.lastContextDisposition === "unavailable" && transitionSecondDiagnostics.lastContextFailureStage === "host-error" && transitionSecondDiagnostics.lastContextHostErrorCode === "HOST_CONTEXT_UNAVAILABLE" && transitionSecondDiagnostics.lastContextErrorCode === "VERIFICATION_UNAVAILABLE" && transitionSecondDiagnostics.lastContextUnavailableReason === "no-active-composition" && transition.providerBodies.length === 2, "A no-active-composition transition remains an unavailable Context fallback and atomically replaces request-one diagnostics with request two."); check(!/bodyText|trustedGrounding|fingerprint|nativeLayerId|propertyPath/.test(JSON.stringify(transitionSecondDiagnostics)), "Provider diagnostics expose no raw response, grounding, Context fingerprint, or target identity.");
    const transitionReadFailure = makeHarness(); await transitionReadFailure.runtime.initialize(); transitionReadFailure.state.providerMode = "text"; transitionReadFailure.state.contextHostErrorOnce = "HOST_CONTEXT_READ_FAILED"; const transitionReadFailureResult = await transitionReadFailure.runtime.sendProviderMessage({ message: "你好", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); const transitionReadFailureDiagnostics = transitionReadFailure.runtime.getProviderDiagnostics(); check(transitionReadFailureResult.state === "failed" && transitionReadFailureDiagnostics.lastTerminalRequestId === null && transitionReadFailureDiagnostics.lastTerminalDisposition === "failed" && transitionReadFailureDiagnostics.lastTerminalFailureBoundary === "context-capture" && transitionReadFailureDiagnostics.lastTerminalErrorCode === "SCHEMA_VALIDATION_FAILED" && transitionReadFailureDiagnostics.lastContextOperation === "capture-context" && transitionReadFailureDiagnostics.lastContextDisposition === "failed" && transitionReadFailureDiagnostics.lastContextFailureStage === "host-error" && transitionReadFailureDiagnostics.lastContextHostErrorCode === "HOST_CONTEXT_READ_FAILED" && transitionReadFailureDiagnostics.lastContextErrorCode === "SCHEMA_VALIDATION_FAILED" && transitionReadFailure.providerBodies.length === 0, "A Host read failure correlates the Provider context-capture failure with its closed Host cause before any Provider request.");
    const noTarget = makeHarness(); await noTarget.runtime.initialize(); noTarget.state.selectionCount = 0; noTarget.state.proposalOpacity = 40; const noTargetReady = await sendProposal(noTarget, 40); check(noTargetReady.state === "proposal-ready", "A no-selection action response may parse into a request-scoped proposal before binding."); await expectCode(noTarget.runtime.reviewProviderProposal(), "UNKNOWN_TARGET", "Review fails with the existing stable no-target code when no layer can be bound."); check(noTarget.runtime.getProviderUiState().state === "idle" && noTarget.runtime.getProviderUiState().errorCode === "UNKNOWN_TARGET" && noTarget.runtime.getUiState().state === "idle" && noTarget.runtime.getUiState().candidateId === null && noTarget.runtime.getConfirmationSurfaceState().state === "idle" && noTarget.calls.filter((call) => call.kind === "execution").length === 0, "No-target finalization records one terminal error while clearing proposal, candidate, confirmation and Host execution authority back to idle."); await expectCode(noTarget.runtime.reviewProviderProposal(), "CANDIDATE_NOT_FOUND", "The terminated no-target proposal cannot be reviewed again."); noTarget.state.selectionCount = 1; noTarget.state.proposalOpacity = 70; const recoveredReady = await sendProposal(noTarget, 70); check(recoveredReady.state === "proposal-ready" && recoveredReady.suggestedOpacity === 70 && recoveredReady.intentReason === null, "Request B accepts opacity 70 without comparing request A's terminated opacity 40."); const recoveredCandidate = await noTarget.runtime.reviewProviderProposal(); check(recoveredCandidate.proposedValue === 70, "Request B binds only its own proposal value."); await noTarget.runtime.approveActiveCandidate(); check(noTarget.state.value === 70 && noTarget.calls.filter((call) => call.kind === "execution").length === 1, "Recovered request B approves and executes opacity 70 exactly once.");
    const modelError = makeHarness(); await modelError.runtime.initialize(); modelError.state.providerMode = "error"; const modelErrorResult = await modelError.runtime.sendProviderMessage({ message: "current value", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); check(modelErrorResult.state === "failed" && modelErrorResult.errorCode === "PROVIDER_RESPONSE_INVALID" && modelError.runtime.getProviderUiState().proposalCapabilityId === null && !JSON.stringify(modelErrorResult).includes("EXPRESSION_NOT_ALLOWLISTED"), "A model-authored error is rejected as a generic local invalid response without proposal state or model error leakage.");
    const bad = makeHarness(); await bad.runtime.initialize(); bad.state.providerMode = "malformed"; const badResult = await bad.runtime.sendProviderMessage({ message: "Set opacity to 50%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); check(badResult.state === "failed" && badResult.errorCode === "PARAM_OUT_OF_RANGE" && bad.runtime.getProviderUiState().state !== "proposal-ready" && bad.runtime.getProviderUiState().proposalCapabilityId === null && bad.runtime.getUiState().candidateId === null && bad.calls.filter((call) => call.kind === "execution").length === 0, "An explicit-edit-eligible malformed localProposal fails closed before proposal-ready, candidate, or Host execution.");
    for (const opacity of [-1, 100.01]) { const invalid = makeHarness(); await invalid.runtime.initialize(); invalid.state.providerMode = "proposal"; invalid.state.proposalOpacity = opacity; const invalidResult = await sendProposal(invalid, opacity); check(invalidResult.state === "failed" && invalidResult.errorCode === "PARAM_OUT_OF_RANGE" && invalid.calls.filter((call) => call.kind === "execution").length === 0, "Canonical production parsing rejects delegated opacity " + opacity + " before authority or Host execution."); }
    const repeated = makeHarness(); await repeated.runtime.initialize(); const repeatedMessage = "将当前选中图层的不透明度设置为 50%。"; repeated.state.proposalOpacity = 50; const repeatedFirst = await repeated.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); const repeatedFirstCandidate = await repeated.runtime.reviewProviderProposal(); await repeated.runtime.approveActiveCandidate(); check(repeated.state.value === 50 && repeated.runtime.getProviderUiState().state === "idle" && repeated.calls.filter((call) => call.kind === "execution").length === 1, "The first repeated-turn fixture completes and clears its active Provider proposal."); const repeatedSecond = await repeated.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); check(repeatedFirst.requestId !== repeatedSecond.requestId && repeatedSecond.state === "proposal-ready" && repeatedSecond.suggestedOpacity === 50, "The identical second explicit turn receives a fresh requestId and reaches a new proposal-ready state even when current opacity is already 50."); check(repeated.providerBodies.length === 2 && repeated.providerBodies.every((body) => body.messages[2].content === repeatedMessage && body.response_format.json_schema.name === "vela_local_proposal_response") && repeated.providerBodies[0].response_format.json_schema.schema.properties.requestId.enum[0] !== repeated.providerBodies[1].response_format.json_schema.schema.properties.requestId.enum[0], "Both repeated turns retain their own exact user message, extraction Profile schema, and request correlation."); check(repeated.calls.filter((call) => call.kind === "execution").length === 1, "The second proposal cannot auto-enter Confirmation or Host execution."); const repeatedSecondCandidate = await repeated.runtime.reviewProviderProposal(); check(repeatedSecondCandidate.candidateId !== repeatedFirstCandidate.candidateId && repeated.calls.filter((call) => call.kind === "execution").length === 1, "Explicit second Review creates fresh candidate authority without reusing or executing the first candidate.");
    const afterReject = makeHarness(); await afterReject.runtime.initialize(); afterReject.state.proposalOpacity = 50; await afterReject.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); await afterReject.runtime.reviewProviderProposal(); await afterReject.runtime.rejectActiveCandidate(); const afterRejectSecond = await afterReject.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); check(afterRejectSecond.state === "proposal-ready" && afterReject.calls.filter((call) => call.kind === "execution").length === 0, "Reject clears first-turn authority and an identical second turn can enter fresh Review.");
    const afterError = makeHarness(); await afterError.runtime.initialize(); afterError.state.providerMode = "text"; const failedExplicit = await afterError.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); afterError.state.providerMode = "proposal"; afterError.state.proposalOpacity = 50; const afterErrorSecond = await afterError.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); check(failedExplicit.state === "failed" && failedExplicit.errorCode === "PROVIDER_RESPONSE_INVALID" && afterErrorSecond.state === "proposal-ready", "Explicit text mismatch remains PROVIDER_RESPONSE_INVALID and cannot poison an identical retry into intent-rejected.");
    const mismatch = makeHarness(); await mismatch.runtime.initialize(); mismatch.state.proposalOpacity = 40; const mismatchResult = await mismatch.runtime.sendProviderMessage({ message: repeatedMessage, endpoint: "http://127.0.0.1:1234", model: "m" }); check(mismatchResult.state === "intent-rejected" && mismatchResult.intentReason === "target-mismatch" && mismatch.runtime.getProviderSurfaceState().intentReason === "target-mismatch" && mismatch.runtime.getUiState().candidateId === null && mismatch.calls.filter((call) => call.kind === "execution").length === 0, "A same-request opacity mismatch preserves the accurate bounded Gate reason without candidate or Host authority."); mismatch.state.proposalOpacity = 70; const mismatchRecovery = await mismatch.runtime.sendProviderMessage({ message: "Set the selected layer opacity to 70%", endpoint: "http://127.0.0.1:1234", model: "m" }); check(mismatchRecovery.state === "proposal-ready" && mismatchRecovery.suggestedOpacity === 70, "A same-request mismatch terminates cleanly and cannot poison the next valid request.");
    const coldAction = makeHarness(); await coldAction.runtime.initialize(); coldAction.state.selectionCount = 0; coldAction.state.proposalOpacity = 40; coldAction.state.groundingUnavailableOnce = true;
    const coldActionReady = await sendProposal(coldAction, 40);
    check(coldActionReady.state === "proposal-ready" && coldAction.providerBodies.length === 1, "Fresh HOST_CONTEXT_UNAVAILABLE grounding does not block an explicit Provider request or its structured proposal.");
    await expectCode(coldAction.runtime.reviewProviderProposal(), "UNKNOWN_TARGET", "The cold proposal still requires a fresh Review binding and fails with no current target.");
    check(coldAction.runtime.getProviderUiState().state === "idle" && coldAction.runtime.getUiState().candidateId === null && coldAction.runtime.getConfirmationSurfaceState().state === "idle" && coldAction.calls.filter((call) => call.kind === "execution").length === 0, "Cold unavailable grounding grants no candidate, confirmation, or Host authority and terminates back at idle.");
    function renameDriver(harness) {
        let turn = 0;
        const events = [];
        const driver = agentDriverModule.createAgentDriver({ beginTurn() { turn += 1; return Object.freeze({ sessionId: harness.session.getSessionId(), turnId: "rename_turn_" + turn }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: "rename_observation_" + turn }); }, appendSessionEvent(event) { events.push(event); return event; }, onListenerError() {} });
        check(driver.attachRuntimePort(harness.runtime.getAgentDriverRuntimePort()), "Rename Driver attaches the existing production Runtime semantic port.");
        return { driver, events };
    }
    const renameHappy = makeHarness(); renameHappy.state.proposalCapability = "set-layer-name-v1"; renameHappy.state.proposalName = "Hero"; await renameHappy.runtime.initialize();
    const renameHappyDriver = renameDriver(renameHappy);
    const renameReview = await renameHappyDriver.driver.startObjective({ message: "将当前图层重命名为 Hero", endpoint: "http://127.0.0.1:1234", model: "m" });
    check(renameReview.state === "awaiting-review" && renameReview.suspendedReview.capabilityId === "set-layer-name-v1" && renameReview.suspendedReview.beforeValue === "Layer A" && renameReview.suspendedReview.params.name === "Hero", "Production rename reaches one exact string Review with Layer A to Hero semantics.");
    const renameDone = await renameHappyDriver.driver.resolveReview({ reviewId: renameReview.suspendedReview.reviewId, revision: renameReview.suspendedReview.revision, outcome: "approved" });
    check(renameDone.state === "terminal" && renameDone.terminal.outcome === "completed" && renameHappy.state.name === "Hero" && renameHappy.providerBodies.length === 1 && renameHappy.calls.filter((call) => call.kind === "execution").length === 1 && renameHappy.calls.filter((call) => call.request && call.request.operation === "observeCommittedLayerAttributeValue").length === 1 && renameHappyDriver.events.filter((event) => event.kind === "task/review-required").length === 1, "Rename happy path performs Provider 1, Review 1, Host rename 1, committed-target Verify 1 and one completed terminal.");
    const renameStale = makeHarness(); renameStale.state.proposalCapability = "set-layer-name-v1"; renameStale.state.proposalName = "Hero"; await renameStale.runtime.initialize();
    const renameStaleDriver = renameDriver(renameStale);
    const staleReviewA = await renameStaleDriver.driver.startObjective({ message: "把选中图层改名为 Hero", endpoint: "http://127.0.0.1:1234", model: "m" });
    renameStale.state.nativeLayerId = 46;
    const staleReviewB = await renameStaleDriver.driver.resolveReview({ reviewId: staleReviewA.suspendedReview.reviewId, revision: staleReviewA.suspendedReview.revision, outcome: "approved" });
    check(staleReviewB.state === "awaiting-review" && staleReviewB.loop.iterationIndex === 1 && staleReviewB.counters.replans === 1 && renameStale.providerBodies.length === 2 && renameStale.calls.filter((call) => call.kind === "execution").length === 0, "Rename selection drift returns CONTEXT_STALE committed:false, Host 0, then creates one fresh Provider iteration and Review B.");
    const staleDone = await renameStaleDriver.driver.resolveReview({ reviewId: staleReviewB.suspendedReview.reviewId, revision: staleReviewB.suspendedReview.revision, outcome: "approved" });
    check(staleDone.state === "terminal" && staleDone.terminal.outcome === "completed" && staleDone.counters.replans === 1 && renameStale.calls.filter((call) => call.kind === "execution").length === 1 && renameStale.calls.filter((call) => call.request && call.request.operation === "observeCommittedLayerAttributeValue").length === 1, "Fresh rename Review B approves one exact new target mutation and one Verify with no third iteration.");
    check(!JSON.stringify(h.runtime.getStatus()).match(/proposal|router|capture|digest|nativeLayerId|planId|candidateId/i), "Runtime status remains diagnostic-only and leaks no proposal or trusted data.");
    console.log("test-vela-provider-production-e2e: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
