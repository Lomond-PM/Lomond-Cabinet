#!/usr/bin/env node
"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const transportModule = require("../client/js/vela/velaLocalTransport");
const contractsModule = require("../client/js/vela/velaCapabilityContracts");
const policyModule = require("../client/js/vela/velaProviderRequestBranchPolicy");
const adapterModule = require("../client/js/vela/velaProviderAdapter");
const intentGateModule = require("../client/js/vela/velaProviderIntentGate");
const controllerModule = require("../client/js/vela/velaProviderController");
const runtimeModule = require("../client/js/vela/velaRuntime");
const nodeRuntime = require("./velaNodeRuntime");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
function protocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v, "utf8").digest("hex"), randomId: (kind) => kind + "_" + (++id).toString().padStart(32, "a"), now: () => 1 }); }
function hostResult(request) { const hostInstanceId = "host_" + "a".repeat(48); const tierOne = { hostInstanceId, hostReloadEpoch: 1, tier: 1, projectGeneration: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } }; let snapshot = tierOne; if (request.tier === 3) snapshot = { hostInstanceId, hostReloadEpoch: 1, tier: 3, projectGeneration: 1, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: 57.5 } })) }; return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
function observedControllerModule(observed, options) {
    options = options || {};
    const policyFacade = Object.freeze({
        createRequestBranchPolicy(projection) {
            const production = policyModule.createRequestBranchPolicy(projection);
            return Object.freeze({
                classify(message) {
                    observed.events.push("classify:" + message);
                    observed.classifyInputs.push(message);
                    if (options.classifyFailure) throw new Error("LOCAL_CLASSIFICATION_FAILED");
                    return production.classify(message);
                }
            });
        }
    });
    const adapterFacade = Object.freeze({
        createLocalOpenAICompatibleProvider(config) {
            observed.events.push("provider:" + config.requestProfile);
            observed.providerProfiles.push(config.requestProfile);
            return adapterModule.createLocalOpenAICompatibleProvider(config);
        }
    });
    const intentFacade = Object.freeze({
        evaluate(input) {
            observed.events.push("intent:" + input.message);
            observed.intentInputs.push(input);
            return intentGateModule.evaluate(input);
        }
    });
    const policyPath = require.resolve("../client/js/vela/velaProviderRequestBranchPolicy");
    const adapterPath = require.resolve("../client/js/vela/velaProviderAdapter");
    const intentPath = require.resolve("../client/js/vela/velaProviderIntentGate");
    const controllerPath = require.resolve("../client/js/vela/velaProviderController");
    const savedPolicy = require.cache[policyPath].exports;
    const savedAdapter = require.cache[adapterPath].exports;
    const savedIntent = require.cache[intentPath].exports;
    const savedController = require.cache[controllerPath];
    let observedModule;
    try {
        require.cache[policyPath].exports = policyFacade;
        require.cache[adapterPath].exports = adapterFacade;
        require.cache[intentPath].exports = intentFacade;
        delete require.cache[controllerPath];
        observedModule = require(controllerPath);
    } finally {
        require.cache[policyPath].exports = savedPolicy;
        require.cache[adapterPath].exports = savedAdapter;
        require.cache[intentPath].exports = savedIntent;
        delete require.cache[controllerPath];
        require.cache[controllerPath] = savedController;
    }
    return observedModule;
}
function observedHarness(options) {
    options = options || {};
    const observed = { events: [], classifyInputs: [], providerProfiles: [], intentInputs: [], hostCalls: [], transportBodies: [] };
    const observedModule = observedControllerModule(observed, options);
    const p = protocol();
    const context = contextModule.createContextApi(p);
    const pendingHost = [];
    const bridge = bridgeModule.createContextBridge({
        protocol: p,
        contextApi: context,
        invokeHost(source, callback) {
            const request = decode(source);
            observed.events.push("capture:" + request.tier);
            observed.hostCalls.push(request);
            if (options.deferHost) pendingHost.push({ request, callback });
            else callback(hostResult(request));
        },
        runtime: { setTimeout, clearTimeout, timeoutMs: 1000 }
    });
    const transport = transportModule.createLocalTransport({
        protocol: p,
        fetch(url, fetchOptions) {
            const body = JSON.parse(fetchOptions.body);
            observed.transportBodies.push(body);
            const schema = body.response_format.json_schema.schema;
            const requestId = schema.properties.requestId.enum[0];
            const userMessage = body.messages[2].content;
            const requestedKind = options.responseKind ? options.responseKind(userMessage, body) : (schema.properties.envelope.properties.type.enum[0] === "text" ? "text" : "localProposal");
            const envelope = requestedKind === "text" ? { type: "text", text: "safe" } : { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 50 } } };
            const response = JSON.stringify({ id: "x", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId, provider: "lmstudio", model: "m", envelope }), reasoning_content: "", tool_calls: [] }, finish_reason: "stop" }], usage: {} });
            let sent = false;
            return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } });
        },
        TextDecoder
    });
    const runtime = { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 1 };
    const controller = observedModule.createProviderController({ protocol: p, contextBridge: bridge, transport, runtime });
    return { observed, observedModule, p, bridge, transport, runtime, controller, pendingHost, resolveNext() { const item = pendingHost.shift(); item.callback(hostResult(item.request)); return item; } };
}
function deferredHarness() {
    const p = protocol(); const context = contextModule.createContextApi(p); const hostCalls = []; const transportCalls = []; const hostInstanceId = "host_" + "b".repeat(48);
    const bridge = bridgeModule.createContextBridge({ protocol: p, contextApi: context, invokeHost(source, callback) { hostCalls.push({ request: decode(source), callback }); }, runtime: { setTimeout, clearTimeout, timeoutMs: 1000 } });
    const transport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { const body = JSON.parse(options.body); transportCalls.push(body); const requestId = /Use requestId (req_[a-z0-9]+)/.exec(body.messages[0].content)[1]; const response = JSON.stringify({ id: "x", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId, provider: "lmstudio", model: "m", envelope: { type: "text", text: "safe" } }), tool_calls: [] }, finish_reason: "stop" }], usage: {} }); let sent = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } }); }, TextDecoder });
    const controller = controllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 1 } });
    function tierOne(request, count) { const items = []; for (let i = 0; i < count; i += 1) items.push({ nativeLayerId: i + 2, layerIndex: i + 1, selectedOrder: i, matchName: "ADBE AV Layer", type: "AVLayer" }); return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot: { hostInstanceId, hostReloadEpoch: 1, tier: 1, projectGeneration: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count, identityQuality: "native-layer-id", items } } }); }
    function tierThree(request, value, mismatch) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot: { hostInstanceId, hostReloadEpoch: 1, tier: 3, projectGeneration: 1, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: mismatch ? target.nativeLayerId + 1 : target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: value } })) } }); }
    return { p, bridge, controller, hostCalls, transportCalls, tierOne, tierThree, resolve(call, raw) { call.callback(raw); } };
}
function runtimeDeferredHarness() {
    const hostCalls = []; const transportCalls = []; const hostInstanceId = "host_" + "c".repeat(48);
    function tierZero(request) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot: { hostInstanceId, hostReloadEpoch: 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } } }); }
    function tierOne(request) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot: { hostInstanceId, hostReloadEpoch: 1, tier: 1, projectGeneration: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } } }); }
    function tierThree(request, value) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot: { hostInstanceId, hostReloadEpoch: 1, tier: 3, projectGeneration: 1, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: value } })) } }); }
    function fetch(url, options) { const body = JSON.parse(options.body); transportCalls.push(body); const requestId = /Use requestId (req_[a-z0-9]+)/.exec(body.messages[0].content)[1]; const responseSchema = body.response_format.json_schema.schema.properties; const response = JSON.stringify({ id: "chatcmpl-local", object: "chat.completion", created: 1784797754, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ protocol: responseSchema.protocol.enum[0], schemaVersion: responseSchema.schemaVersion.enum[0], requestId, provider: responseSchema.provider.enum[0], model: "m", envelope: { type: "text", text: "safe" } }), reasoning_content: "", tool_calls: [] }, logprobs: null, finish_reason: "stop" }], usage: { prompt_tokens: 239, completion_tokens: 144, total_tokens: 383, completion_tokens_details: { reasoning_tokens: 0 } }, stats: {}, system_fingerprint: "qwen3.5-4b" }); let sent = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } }); }
    const runtime = runtimeModule.createRuntime({ environment: Object.assign({ setTimeout, clearTimeout, fetch, TextDecoder, timeoutMs: 1000 }, nodeRuntime), invokeHost(source, callback) { hostCalls.push({ request: decode(source), callback }); } });
    return { runtime, hostCalls, transportCalls, tierZero, tierOne, tierThree, resolve(call, raw) { call.callback(raw); }, async initialize() { const ready = runtime.initialize(); await flush(); this.resolve(hostCalls[0], this.tierZero(hostCalls[0].request)); await ready; await flush(); } };
}
async function runRequestProfileLifecycleTests() {
    const endpoint = "http://127.0.0.1:1234/v1/chat/completions";
    const isolated = observedHarness();
    const messages = ["hello", "Set opacity to 50%", "hello again"];
    const states = [];
    for (const message of messages) states.push(await isolated.controller.send({ message, endpoint, model: "m" }));
    check(isolated.observed.classifyInputs.length === 3 && isolated.observed.classifyInputs.join("|") === messages.join("|"), "Each completed send classifies exactly once and receives only its current user message.");
    check(messages.every((message) => { const index = isolated.observed.events.indexOf("classify:" + message); const nextCapture = isolated.observed.events.findIndex((event, eventIndex) => eventIndex > index && /^capture:/.test(event)); return index !== -1 && nextCapture !== -1 && !isolated.observed.events.slice(index + 1, nextCapture).some((event) => /^classify:|^provider:/.test(event)); }), "Each classification precedes its Tier 1 capture without another classification or Provider creation: " + JSON.stringify(isolated.observed.events));
    check(isolated.observed.providerProfiles.join("|") === "text-only|explicit-edit-eligible|text-only", "One Controller binds text → extraction → text Profiles to three private generations without reuse.");
    check(isolated.observed.transportBodies.map((body) => body.response_format.json_schema.name).join("|") === "vela_text_response|vela_local_proposal_response|vela_text_response", "Three Provider instances select isolated text → localProposal → text Schemas.");
    check(isolated.observed.transportBodies[0].messages[0].content.includes("This request is text-only") && isolated.observed.transportBodies[1].messages[0].content.includes("This request is explicit-edit-eligible") && isolated.observed.transportBodies[2].messages[0].content.includes("This request is text-only"), "Prompt Builder selects each generation's Profile without caching the prior branch.");
    check(states[0].state === "completed" && states[1].state === "proposal-ready" && states[2].state === "completed" && isolated.observed.intentInputs.length === 1, "Only the legal extraction response reaches Intent Gate and proposal-ready.");
    check(isolated.observed.intentInputs[0].message === "Set opacity to 50%" && isolated.observed.intentInputs[0].capabilityId === "set-opacity-v1" && isolated.observed.intentInputs[0].proposedOpacity === 50, "Intent Gate receives the current extraction message, exact capability, and exact unique target.");
    [states[0], states[1], states[2], isolated.controller.getUiState()].forEach((state) => check(!Object.prototype.hasOwnProperty.call(state, "requestProfile") && !JSON.stringify(state).includes("\"requestProfile\""), "Public UI state never exposes requestProfile."));
    isolated.observed.transportBodies.forEach((body) => {
        check(!JSON.stringify(body).includes("\"requestProfile\""), "Transport body contains no requestProfile field.");
        check(!/layerId|compId|propertyPath|contextId|fingerprint|nativeLayerId|nonce|digest|callback|execution authority/i.test(body.messages[0].content), "Profile Prompt contains no Context identity or execution authority.");
    });
    const proposalPort = isolated.observedModule.createProposalPort(isolated.controller, isolated.p);
    await assert.rejects(Promise.resolve().then(() => proposalPort.consume()), (error) => error.code === isolated.p.ERROR_CODES.CANDIDATE_NOT_FOUND); assertions += 1;
    check(isolated.controller.getUiState().proposalCapabilityId === null, "A later text generation clears the prior active proposal without retaining Profile data.");

    const textMismatch = observedHarness({ responseKind: () => "localProposal" });
    const textMismatchState = await textMismatch.controller.send({ message: "hello", endpoint, model: "m" });
    check(textMismatchState.state === "failed" && textMismatchState.errorCode === textMismatch.p.ERROR_CODES.PROVIDER_RESPONSE_INVALID && textMismatch.observed.intentInputs.length === 0 && textMismatchState.proposalCapabilityId === null, "A protocol-valid localProposal on text-only fails locally before Intent Gate and cannot reach proposal-ready.");
    const textMismatchPort = textMismatch.observedModule.createProposalPort(textMismatch.controller, textMismatch.p);
    await assert.rejects(Promise.resolve().then(() => textMismatchPort.consume()), (error) => error.code === textMismatch.p.ERROR_CODES.CANDIDATE_NOT_FOUND); assertions += 1;

    const extractionMismatch = observedHarness({ responseKind: () => "text" });
    const extractionMismatchState = await extractionMismatch.controller.send({ message: "Set opacity to 50%", endpoint, model: "m" });
    check(extractionMismatchState.state === "failed" && extractionMismatchState.errorCode === extractionMismatch.p.ERROR_CODES.PROVIDER_RESPONSE_INVALID && extractionMismatch.observed.intentInputs.length === 0 && extractionMismatchState.proposalCapabilityId === null, "A protocol-valid text response on explicit-edit-eligible fails locally before Intent Gate and cannot reach proposal-ready.");

    const classificationFailure = observedHarness({ classifyFailure: true });
    await assert.rejects(classificationFailure.controller.send({ message: "classify failure", endpoint, model: "m" })); assertions += 1;
    const failureState = classificationFailure.controller.getUiState();
    check(classificationFailure.observed.classifyInputs.length === 1 && classificationFailure.observed.hostCalls.length === 0 && classificationFailure.observed.providerProfiles.length === 0 && classificationFailure.observed.transportBodies.length === 0 && classificationFailure.observed.intentInputs.length === 0, "Classification failure starts no Tier 1/Tier 3 capture, Provider, transport, or Intent Gate.");
    check(failureState.state === "failed" && failureState.requestId === null && failureState.proposalCapabilityId === null && !JSON.stringify(failureState).includes("requestProfile"), "Classification failure leaves a local terminal state with no pending generation, proposal, or Profile leak.");

    for (const forbidden of ["policy", "requestProfile", "capabilityProjection"]) {
        const injected = {}; injected[forbidden] = {};
        await assert.rejects(Promise.resolve().then(() => classificationFailure.observedModule.createProviderController(Object.assign({ protocol: classificationFailure.p, contextBridge: classificationFailure.bridge, transport: classificationFailure.transport, runtime: classificationFailure.runtime }, injected))), (error) => error.code === classificationFailure.p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    }

    const rapid = observedHarness({ deferHost: true });
    const first = rapid.controller.send({ message: "hello", endpoint, model: "m" });
    await flush();
    await assert.rejects(rapid.controller.send({ message: "Set opacity to 50%", endpoint, model: "m" }), (error) => error.code === rapid.p.ERROR_CODES.PROVIDER_REQUEST_IN_FLIGHT); assertions += 1;
    check(rapid.observed.classifyInputs.length === 1 && rapid.observed.hostCalls.length === 1 && rapid.observed.providerProfiles.length === 0, "Pending rapid resend starts neither a second classification nor capture and preserves the first generation Profile.");
    check(rapid.controller.cancel({ requestId: null }) === true, "Cancel during Tier 1 terminates the first classified generation.");
    rapid.resolveNext(); await first; await flush();
    check(rapid.observed.transportBodies.length === 0 && rapid.observed.intentInputs.length === 0 && rapid.controller.getUiState().state === "cancelled", "Late Tier 1 after cancel cannot transport, enter Intent Gate, or revive public state.");
    const restarted = rapid.controller.send({ message: "hello after restart", endpoint, model: "m" }); await flush();
    rapid.resolveNext(); await flush();
    rapid.resolveNext(); await restarted; await flush();
    check(rapid.observed.classifyInputs.length === 2 && rapid.observed.classifyInputs[1] === "hello after restart" && rapid.observed.providerProfiles.join("|") === "text-only", "Lifecycle restart reclassifies its first request and does not reuse the cancelled generation Profile.");
    check(rapid.observed.transportBodies.length === 1 && rapid.observed.intentInputs.length === 0 && rapid.controller.getUiState().state === "completed", "Restart completion is isolated from the cancelled generation and stale extraction authority.");
}
async function runDeferredGroundingTests() {
    const endpoint = "http://127.0.0.1:1234/v1/chat/completions";
    const a = deferredHarness(); const pendingA = a.controller.send({ message: "A", endpoint, model: "m" }); await flush(); const tier1A = a.hostCalls[0]; a.resolve(tier1A, a.tierOne(tier1A.request, 1)); await flush(); const tier3A = a.hostCalls[1];
    check(tier3A.request.operation === "capturePropertyValues" && a.transportCalls.length === 0, "A pending Tier 3 is a real Provider Controller boundary before request assembly and transport.");
    check(a.controller.cancel({ requestId: null }) === true && a.controller.getUiState().state === "cancelled", "Cancel accepts the pre-transport null request identity and publishes only the terminal cancelled state.");
    a.resolve(tier3A, a.tierThree(tier3A.request, 25)); await pendingA; await flush();
    check(a.transportCalls.length === 0 && a.controller.getUiState().state === "cancelled" && a.controller.getUiState().proposalCapabilityId === null, "Late Tier 3 after cancel cannot assemble, transport, patch, or preserve a proposal.");
    const rejectedLate = deferredHarness(); const rejectedRequest = rejectedLate.controller.send({ message: "reject-late", endpoint, model: "m" }); await flush(); rejectedLate.resolve(rejectedLate.hostCalls[0], rejectedLate.tierOne(rejectedLate.hostCalls[0].request, 1)); await flush(); const rejectedTier3 = rejectedLate.hostCalls[1];
    check(rejectedLate.controller.cancel({ requestId: null }) === true, "Cancel also terminates a request while its real Tier 3 capture can still reject.");
    rejectedLate.resolve(rejectedTier3, "malformed late Tier 3 response"); await rejectedRequest; await flush();
    check(rejectedLate.transportCalls.length === 0 && rejectedLate.controller.getUiState().state === "cancelled", "A late Tier 3 rejection after cancel cannot replace cancellation, assemble a request, or reach transport.");
    const recoveredAfterMalformed = rejectedLate.controller.send({ message: "recover-after-malformed", endpoint, model: "m" }); await flush(); rejectedLate.resolve(rejectedLate.hostCalls[2], rejectedLate.tierOne(rejectedLate.hostCalls[2].request, 1)); await flush(); rejectedLate.resolve(rejectedLate.hostCalls[3], rejectedLate.tierThree(rejectedLate.hostCalls[3].request, 50)); await recoveredAfterMalformed; await flush();
    check(rejectedLate.transportCalls.length === 1 && rejectedLate.transportCalls[0].messages[1].content.includes("50") && rejectedLate.controller.getUiState().state === "completed", "A malformed stale Tier 3 neither preserves its error nor prevents the next fresh capture and Provider completion.");
    const pendingB = a.controller.send({ message: "B", endpoint, model: "m" }); await flush(); const tier1B = a.hostCalls[2]; a.resolve(tier1B, a.tierOne(tier1B.request, 1)); await flush(); const tier3B = a.hostCalls[3]; a.resolve(tier3B, a.tierThree(tier3B.request, 57.5)); await pendingB; await flush();
    check(a.transportCalls.length === 1 && a.transportCalls[0].messages[1].content.includes("57.5") && !a.transportCalls[0].messages[1].content.includes("25"), "Cancel A then Send B uses a new binding/value and never mixes A opacity into B.");
    const lateDuringB = deferredHarness(); const lateDuringA = lateDuringB.controller.send({ message: "A", endpoint, model: "m" }); await flush(); lateDuringB.resolve(lateDuringB.hostCalls[0], lateDuringB.tierOne(lateDuringB.hostCalls[0].request, 1)); await flush(); const lateDuringTier3A = lateDuringB.hostCalls[1]; lateDuringB.controller.cancel({ requestId: null }); const lateDuringBRequest = lateDuringB.controller.send({ message: "B", endpoint, model: "m" }); await flush(); lateDuringB.resolve(lateDuringB.hostCalls[2], lateDuringB.tierOne(lateDuringB.hostCalls[2].request, 1)); await flush(); const lateDuringTier3B = lateDuringB.hostCalls[3]; const pendingBState = lateDuringB.controller.getUiState(); lateDuringB.resolve(lateDuringTier3A, lateDuringB.tierThree(lateDuringTier3A.request, 25)); await lateDuringA; await flush();
    check(lateDuringB.transportCalls.length === 0 && lateDuringB.controller.getUiState() === pendingBState && lateDuringB.hostCalls.length === 4, "A Tier 3 resolving while B Tier 3 remains pending cannot cancel, patch, assemble, or contaminate B.");
    lateDuringB.resolve(lateDuringTier3B, lateDuringB.tierThree(lateDuringTier3B.request, 57.5)); const lateDuringFinal = await lateDuringBRequest; await flush();
    check(lateDuringB.transportCalls.length === 1 && lateDuringB.transportCalls[0].messages[1].content.includes("57.5") && !lateDuringB.transportCalls[0].messages[1].content.includes("25") && lateDuringFinal.state === "completed", "B completes from its own deferred Tier 3 after the cancelled A callback arrives.");
    const lateAfterB = deferredHarness(); const lateAfterA = lateAfterB.controller.send({ message: "A", endpoint, model: "m" }); await flush(); lateAfterB.resolve(lateAfterB.hostCalls[0], lateAfterB.tierOne(lateAfterB.hostCalls[0].request, 1)); await flush(); const lateAfterTier3A = lateAfterB.hostCalls[1]; lateAfterB.controller.cancel({ requestId: null }); const lateAfterBRequest = lateAfterB.controller.send({ message: "B", endpoint, model: "m" }); await flush(); lateAfterB.resolve(lateAfterB.hostCalls[2], lateAfterB.tierOne(lateAfterB.hostCalls[2].request, 1)); await flush(); const lateAfterTier3B = lateAfterB.hostCalls[3]; lateAfterB.resolve(lateAfterTier3B, lateAfterB.tierThree(lateAfterTier3B.request, 57.5)); const lateAfterFinal = await lateAfterBRequest; await flush(); const finalBody = JSON.stringify(lateAfterB.transportCalls[0]); const finalContext = lateAfterB.transportCalls[0].messages[1].content; const finalState = lateAfterB.controller.getUiState();
    lateAfterB.resolve(lateAfterTier3A, lateAfterB.tierThree(lateAfterTier3A.request, 25)); await lateAfterA; await flush();
    check(lateAfterB.transportCalls.length === 1 && JSON.stringify(lateAfterB.transportCalls[0]) === finalBody && lateAfterB.controller.getUiState() === finalState && lateAfterFinal.requestId === finalState.requestId && finalContext.includes("57.5") && !finalContext.includes("25"), "A Tier 3 resolving after B completes cannot alter B messages, request identity, final state, or transport count.");
    const fresh = deferredHarness(); const first = fresh.controller.send({ message: "first", endpoint, model: "m" }); await flush(); fresh.resolve(fresh.hostCalls[0], fresh.tierOne(fresh.hostCalls[0].request, 1)); await flush(); fresh.resolve(fresh.hostCalls[1], fresh.tierThree(fresh.hostCalls[1].request, 0)); await first; const second = fresh.controller.send({ message: "second", endpoint, model: "m" }); await flush(); fresh.resolve(fresh.hostCalls[2], fresh.tierOne(fresh.hostCalls[2].request, 1)); await flush(); fresh.resolve(fresh.hostCalls[3], fresh.tierThree(fresh.hostCalls[3].request, 100)); await second; await flush();
    check(fresh.hostCalls.length === 4 && fresh.transportCalls.length === 2 && fresh.transportCalls[0].messages[1].content.includes("opacity 0") && fresh.transportCalls[1].messages[1].content.includes("opacity 100") && !fresh.transportCalls[1].messages[1].content.includes("opacity 0"), "Each completed send recaptures Tier 1/Tier 3; zero and one hundred remain exact and isolated.");
    for (const count of [0, 2]) { const h = deferredHarness(); const request = h.controller.send({ message: "query", endpoint, model: "m" }); await flush(); h.resolve(h.hostCalls[0], h.tierOne(h.hostCalls[0].request, count)); await request; await flush(); check(h.hostCalls.length === 1 && h.transportCalls.length === 1 && h.transportCalls[0].messages[1].content.includes("opacity unavailable") && !h.transportCalls[0].messages[1].content.includes("value"), (count === 0 ? "No selection" : "Multi-selection") + " completes a formal Send with available:false and no Tier 3 target."); }
    const mismatch = deferredHarness(); const mismatchRequest = mismatch.controller.send({ message: "mismatch", endpoint, model: "m" }); await flush(); mismatch.resolve(mismatch.hostCalls[0], mismatch.tierOne(mismatch.hostCalls[0].request, 1)); await flush(); mismatch.resolve(mismatch.hostCalls[1], mismatch.tierThree(mismatch.hostCalls[1].request, 25, true)); await mismatchRequest; await flush();
    check(mismatch.transportCalls.length === 0 && mismatch.controller.getUiState().state === "failed", "A Tier 3 target mismatch fails closed without a trusted value or outbound request.");
    const recovered = mismatch.controller.send({ message: "recovered", endpoint, model: "m" }); await flush(); mismatch.resolve(mismatch.hostCalls[2], mismatch.tierOne(mismatch.hostCalls[2].request, 1)); await flush(); mismatch.resolve(mismatch.hostCalls[3], mismatch.tierThree(mismatch.hostCalls[3].request, 25)); await recovered; await flush();
    check(mismatch.transportCalls.length === 1 && mismatch.transportCalls[0].messages[1].content.includes("25"), "A normal later Send recovers from target mismatch with a new binding and no fallback projection.");
    const suspended = deferredHarness(); const suspendedRequest = suspended.controller.send({ message: "suspend", endpoint, model: "m" }); await flush(); suspended.resolve(suspended.hostCalls[0], suspended.tierOne(suspended.hostCalls[0].request, 1)); await flush(); const suspendedTier3 = suspended.hostCalls[1]; suspended.controller.invalidate("idle"); suspended.bridge.suspend(); suspended.resolve(suspendedTier3, suspended.tierThree(suspendedTier3.request, 25)); await suspendedRequest; await flush();
    check(suspended.transportCalls.length === 0 && suspended.controller.getUiState().state === "idle", "Runtime-equivalent invalidate then suspend prevents a late Tier 3 from transport or UI revival.");
    suspended.bridge.resume(); const resumed = suspended.controller.send({ message: "resume", endpoint, model: "m" }); await flush(); const resumedTier1 = suspended.hostCalls[2]; suspended.resolve(resumedTier1, suspended.tierOne(resumedTier1.request, 1)); await flush(); const resumedTier3 = suspended.hostCalls[3]; suspended.resolve(resumedTier3, suspended.tierThree(resumedTier3.request, 50)); await resumed; await flush();
    check(suspended.transportCalls.length === 1 && suspended.transportCalls[0].messages[1].content.includes("50"), "A new post-resume send uses a fresh capture and completes normally.");
    const ownership = deferredHarness(); const providerPending = ownership.controller.send({ message: "provider", endpoint, model: "m" }); await flush(); const legacyAttempt = ownership.bridge.beginOwnedCapture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true }); await assert.rejects(legacyAttempt.promise, error => error.code === ownership.p.ERROR_CODES.EXECUTION_BUSY); assertions += 1; check(ownership.bridge.cancelOwnedCapture(legacyAttempt.handle) === false, "A busy legacy attempt receives no owned handle and cannot cancel Provider capture."); ownership.resolve(ownership.hostCalls[0], ownership.tierOne(ownership.hostCalls[0].request, 1)); await flush(); ownership.resolve(ownership.hostCalls[1], ownership.tierThree(ownership.hostCalls[1].request, 25)); await providerPending; await flush(); check(ownership.transportCalls.length === 1, "Provider-owned capture remains valid after a competing legacy Refresh attempt.");
    const legacyFirst = deferredHarness(); const legacyOwned = legacyFirst.bridge.beginOwnedCapture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true }); const blockedProvider = legacyFirst.controller.send({ message: "blocked", endpoint, model: "m" }); await flush(); check(legacyFirst.hostCalls.length === 1, "A Provider Send does not create a second Bridge while legacy Refresh owns capture."); legacyFirst.resolve(legacyFirst.hostCalls[0], legacyFirst.tierOne(legacyFirst.hostCalls[0].request, 1)); await legacyOwned.promise; await blockedProvider; await flush(); check(legacyFirst.transportCalls.length === 0 && legacyFirst.controller.getUiState().state === "failed", "Provider busy failure neither steals nor cancels the legacy owned capture.");
    const runtimeProviderOwns = runtimeDeferredHarness(); await runtimeProviderOwns.initialize(); const providerOwnsRequest = runtimeProviderOwns.runtime.sendProviderMessage({ message: "provider", endpoint, model: "m" }); await flush(); const providerOwnedTier1 = runtimeProviderOwns.hostCalls[1]; await assert.rejects(runtimeProviderOwns.runtime.refreshContext(), error => error.code === "EXECUTION_BUSY"); await assert.rejects(runtimeProviderOwns.runtime.refreshContext(), error => error.code === "EXECUTION_BUSY"); assertions += 2;
    check(runtimeProviderOwns.hostCalls.length === 2 && runtimeProviderOwns.transportCalls.length === 0, "Two real Runtime legacy Refresh calls receive the shared Bridge busy contract without starting another capture or transport.");
    runtimeProviderOwns.resolve(providerOwnedTier1, runtimeProviderOwns.tierOne(providerOwnedTier1.request)); await flush(); const providerOwnedTier3 = runtimeProviderOwns.hostCalls[2]; runtimeProviderOwns.resolve(providerOwnedTier3, runtimeProviderOwns.tierThree(providerOwnedTier3.request, 25)); const providerOwnsFinal = await providerOwnsRequest; await flush();
    check(runtimeProviderOwns.hostCalls.length === 3, "Provider ownership collision leaves exactly one initialization, one Tier 1, and one Tier 3 Host call.");
    check(runtimeProviderOwns.transportCalls.length === 1, "Provider ownership collision reaches Transport exactly once after its own Tier 3 resolves.");
    check(providerOwnsFinal.state === "completed", "Provider ownership collision preserves a normal completed Provider terminal state.");
    check(runtimeProviderOwns.transportCalls[0].messages[1].content.includes("25"), "Provider ownership collision preserves the verified Provider opacity in its single request.");
    const runtimeLegacyOwns = runtimeDeferredHarness(); await runtimeLegacyOwns.initialize(); const legacyRefresh = runtimeLegacyOwns.runtime.refreshContext(); await flush(); const legacyTier1 = runtimeLegacyOwns.hostCalls[1]; const blockedByLegacy = await runtimeLegacyOwns.runtime.sendProviderMessage({ message: "blocked", endpoint, model: "m" }); await flush();
    check(runtimeLegacyOwns.hostCalls.length === 2 && runtimeLegacyOwns.transportCalls.length === 0 && blockedByLegacy.state === "failed", "A real Provider Send cannot steal a real legacy Refresh handle, start Tier 3, or reach transport while the Bridge is owned.");
    runtimeLegacyOwns.resolve(legacyTier1, runtimeLegacyOwns.tierOne(legacyTier1.request)); await flush(); const legacyTier3 = runtimeLegacyOwns.hostCalls[2]; runtimeLegacyOwns.resolve(legacyTier3, runtimeLegacyOwns.tierThree(legacyTier3.request, 25)); await legacyRefresh; await flush(); const recoveredProvider = runtimeLegacyOwns.runtime.sendProviderMessage({ message: "recovered", endpoint, model: "m" }); await flush(); const recoveredTier1 = runtimeLegacyOwns.hostCalls[3]; runtimeLegacyOwns.resolve(recoveredTier1, runtimeLegacyOwns.tierOne(recoveredTier1.request)); await flush(); const recoveredTier3 = runtimeLegacyOwns.hostCalls[4]; runtimeLegacyOwns.resolve(recoveredTier3, runtimeLegacyOwns.tierThree(recoveredTier3.request, 57.5)); const recoveredProviderFinal = await recoveredProvider; await flush();
    check(runtimeLegacyOwns.transportCalls.length === 1 && recoveredProviderFinal.state === "completed" && runtimeLegacyOwns.transportCalls[0].messages[1].content.includes("57.5") && !runtimeLegacyOwns.transportCalls[0].messages[1].content.includes("25"), "After real legacy Refresh releases ownership, a new Provider Send recaptures fresh 57.5 grounding without inheriting legacy data.");
    const disposed = deferredHarness(); const oldRequest = disposed.controller.send({ message: "old", endpoint, model: "m" }); await flush(); disposed.resolve(disposed.hostCalls[0], disposed.tierOne(disposed.hostCalls[0].request, 1)); await flush(); const oldTier3 = disposed.hostCalls[1]; disposed.controller.invalidate("idle"); disposed.resolve(oldTier3, disposed.tierThree(oldTier3.request, 25)); await oldRequest; await flush(); check(disposed.transportCalls.length === 0 && disposed.controller.getUiState().state === "idle", "Runtime disposal's Provider invalidate prevents old Tier 3 completion from transport or revival.");
    const newLifecycle = deferredHarness(); const newRequest = newLifecycle.controller.send({ message: "new", endpoint, model: "m" }); await flush(); newLifecycle.resolve(newLifecycle.hostCalls[0], newLifecycle.tierOne(newLifecycle.hostCalls[0].request, 1)); await flush(); newLifecycle.resolve(newLifecycle.hostCalls[1], newLifecycle.tierThree(newLifecycle.hostCalls[1].request, 100)); await newRequest; await flush(); check(newLifecycle.transportCalls.length === 1 && newLifecycle.transportCalls[0].messages[1].content.includes("100") && !newLifecycle.transportCalls[0].messages[1].content.includes("25"), "A new Controller lifecycle has no old projection, callback, or transport completion inheritance.");
}
async function run() {
    const p = protocol(); const context = contextModule.createContextApi(p);
    const requestBodies = [];
    const bridge = bridgeModule.createContextBridge({ protocol: p, contextApi: context, invokeHost(source, cb) { cb(hostResult(decode(source))); }, runtime: { setTimeout, clearTimeout, timeoutMs: 1000 } });
    const transport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { const requestBody = JSON.parse(options.body); requestBodies.push(requestBody); const requestId = /Use requestId (req_[a-z0-9]+)/.exec(requestBody.messages[0].content)[1]; const isProposal = requestBody.messages[2].content === "将当前图层不透明度设为 57.5%"; const body = JSON.stringify({ id: "chatcmpl-local", object: "chat.completion", created: 1784797754, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ envelope: isProposal ? { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 57.5 } } } : { text: "safe text", type: "text" }, model: "m", protocol: p.PROTOCOLS.RESPONSE, provider: "lmstudio", requestId, schemaVersion: p.SCHEMA_VERSION }), reasoning_content: "", tool_calls: [] }, logprobs: null, finish_reason: "stop" }], usage: { prompt_tokens: 239, completion_tokens: 144, total_tokens: 383, completion_tokens_details: { reasoning_tokens: 0 } }, stats: {}, system_fingerprint: "qwen3.5-4b" }); let done = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (done) return Promise.resolve({ done: true }); done = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(body) }); }, cancel() {} }; } } }); }, TextDecoder });
    const controller = controllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 100 } });
    const state = await controller.send({ message: "hello", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const requestBody = requestBodies[0];
    check(state.state === "completed" && state.text === "safe text", "Trusted Tier 1 capture reaches the adapter and exposes bounded text only.");
    check(!/stats|logprobs|completion_tokens_details|system_fingerprint|reasoning_content|tool_calls/.test(JSON.stringify(state)), "The complete LM Studio wrapper fixture reaches completed UI state without inert metadata leakage.");
    check(Array.isArray(requestBody.messages) && requestBody.messages.length === 3 && requestBody.messages[0].role === "system" && requestBody.messages[1].role === "assistant" && requestBody.messages[2].role === "user", "The final Controller to Adapter to Transport payload must preserve system, bounded context and user message order.");
    check(requestBody.messages[2].content === "hello", "The final payload user message must exactly match the current send input.");
    check(requestBody.messages[1].content.indexOf("Trusted request context:") === 0 && requestBody.messages[1].content.includes("selected layer opacity 57.5") && !JSON.stringify(requestBody.messages[1]).includes("host_") && !JSON.stringify(requestBody.messages[1]).includes("sha256:"), "The bounded trusted request context contains only the verified opacity fact and excludes authority data.");
    check(requestBody.response_format && requestBody.response_format.type === "json_schema", "The production local provider explicitly enables LM Studio json_schema mode.");
    check(requestBody.response_format.json_schema && requestBody.response_format.json_schema.strict === true && requestBody.response_format.json_schema.name === "vela_text_response", "The text request must use its trusted structured response schema.");
    check(requestBody.response_format.json_schema.schema.properties.requestId.enum[0] === state.requestId && requestBody.response_format.json_schema.schema.properties.model.enum[0] === "m", "The production schema must bind the local request id and configured model.");
    const outputSchema = requestBody.response_format.json_schema.schema;
    const outputEnvelope = outputSchema.properties.envelope;
    check(outputEnvelope.properties.text.maxLength === 1024 && outputEnvelope.properties.type.enum[0] === "text" && !Object.prototype.hasOwnProperty.call(outputEnvelope, "oneOf"), "The text profile payload retains only bounded text input.");
    check(outputSchema.required.length === 6 && !JSON.stringify(requestBody.response_format).includes("\"error\"") && requestBody.stream === false && requestBody.model === "m", "The final payload must retain full required fields, one model-authorized envelope, stream:false and the configured model.");
    check(!JSON.stringify(requestBody.response_format).includes("json_object"), "The production controller must not request the unsupported json_object mode.");
    check(!JSON.stringify(state).includes("host_") && !JSON.stringify(state).includes("sha256:"), "Public provider state does not leak authority or fingerprint.");
    check(controller.cancel({ requestId: state.requestId }) === false, "Terminal requests cannot be cancelled or replayed.");
    const second = await controller.send({ message: "second request", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const secondBody = requestBodies[1];
    check(secondBody.messages.length === 3 && secondBody.messages[2].content === "second request" && !JSON.stringify(secondBody.messages).includes("hello"), "Each request must receive a fresh, isolated messages array without prior user content.");
    check(secondBody.response_format.json_schema.schema.properties.requestId.enum[0] === second.requestId && second.requestId !== state.requestId, "Each request schema must bind its own current local request id.");
    const proposalState = await controller.send({ message: "将当前图层不透明度设为 57.5%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(proposalState.state === "proposal-ready" && proposalState.proposalCapabilityId === "set-opacity-v1" && proposalState.suggestedOpacity === 57.5 && proposalState.text === null, "A localProposal becomes a bounded read-only Provider state without text or candidate data.");
    check(!/candidate|plan|nonce|digest|host_|nativeLayerId/i.test(JSON.stringify(proposalState)), "Proposal-ready state leaks no execution, authority or Host identity data.");
    const beforeInvalid = requestBodies.length;
    await assert.rejects(controller.send({ message: "", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    await assert.rejects(controller.send({ message: "   \t", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    await assert.rejects(controller.send({ message: "x".repeat(p.HARD_LIMITS.maxMessageBytes + 1), endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED); assertions += 1;
    check(requestBodies.length === beforeInvalid, "Invalid blank or oversized input must be rejected before context capture or network transport.");
    await runRequestProfileLifecycleTests();
    await runDeferredGroundingTests();
    console.log("test-vela-provider-controller: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
