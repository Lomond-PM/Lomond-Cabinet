#!/usr/bin/env node
"use strict";
// Mock the selected transport, preserving JSON-looking prose as inert text.
function fixtureContent(body, value) { return !body.response_format && value.envelope.type === "text" ? value.envelope.text : JSON.stringify(value); }
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
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
const activationPolicy = require("../client/js/vela/velaActivationPolicy").VelaActivationPolicy;
const nodeRuntime = require("./velaNodeRuntime");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
function protocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v, "utf8").digest("hex"), randomId: (kind) => kind + "_" + (++id).toString().padStart(32, "a"), now: () => 1 }); }
function hostResult(request) { const hostInstanceId = "host_" + "a".repeat(48); const tierOne = { hostInstanceId, hostReloadEpoch: 1, tier: 1, projectGeneration: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } }; let snapshot = tierOne; if (request.tier === 3) snapshot = { hostInstanceId, hostReloadEpoch: 1, tier: 3, projectGeneration: 1, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: 57.5 } })) }; return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }
function hostError(request, code, reason, stage) { const error = { code, message: "bounded" }; if (reason) error.reason = reason; if (stage) error.stage = stage; return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error }); }
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
function observedControllerModule(observed, options) {
    options = options || {};
    const policyFacade = Object.freeze({
        PROFILES: policyModule.PROFILES,
        groundBoundedLogicalRequest: policyModule.groundBoundedLogicalRequest,
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
            const provider = adapterModule.createLocalOpenAICompatibleProvider(config);
            return Object.freeze({ start(input) { observed.providerInputs.push(input); return provider.start(input); }, cancel(requestId) { return provider.cancel(requestId); }, getState() { return provider.getState(); }, getDiagnostics() { return provider.getDiagnostics(); } });
        }
    });
    const intentFacade = Object.freeze({
        evaluate(input) {
            observed.events.push("intent:" + input.message);
            observed.intentInputs.push(input);
            return intentGateModule.evaluate(input);
        },
        evaluateLogicalPlan(input) { return intentGateModule.evaluateLogicalPlan(input); }
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
    const observed = { events: [], classifyInputs: [], providerProfiles: [], providerInputs: [], intentInputs: [], hostCalls: [], transportBodies: [] };
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
            if (options.hostThrow) throw new Error("Host transport unavailable");
            if (options.deferHost) pendingHost.push({ request, callback });
            else callback(typeof options.hostResponse === "function" ? options.hostResponse(request, observed.hostCalls.length) : hostResult(request));
        },
        runtime: { setTimeout, clearTimeout, timeoutMs: 1000 }
    });
    const transport = transportModule.createLocalTransport({
        protocol: p,
        fetch(url, fetchOptions) {
            const body = JSON.parse(fetchOptions.body);
            observed.transportBodies.push(body);
            if (options.transportDeferred) return options.transportDeferred.promise;
            const schema = body.response_format ? body.response_format.json_schema.schema : null;
            const requestId = schema ? schema.properties.requestId.enum[0] : "req_" + "0".repeat(32);
            const userMessage = body.messages[2].content;
            const responseEnvelope = schema && schema.properties.envelope;
            const requestedKind = options.responseKind ? options.responseKind(userMessage, body) : (body.response_format && body.response_format.json_schema.name === "vela_local_proposal_response" ? "localProposal" : "text");
            const envelope = requestedKind === "text" ? { type: "text", text: options.responseText || "safe" } : { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: typeof options.responseOpacity === "number" ? options.responseOpacity : 50 } } };
            const canonicalContent = fixtureContent(body, { protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId, provider: "lmstudio", model: "m", envelope });
            const message = options.responseMessage ? options.responseMessage(canonicalContent) : { role: "assistant", content: canonicalContent, reasoning_content: "", tool_calls: [] };
            const response = JSON.stringify({ id: "x", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message, finish_reason: "stop" }], usage: options.responseUsage || {} });
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
    const transport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { const body = JSON.parse(options.body); transportCalls.push(body); const requestId = (body.response_format ? /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(body.messages[1].content).turnResponseContract)[1] : "req_" + "0".repeat(32)); const response = JSON.stringify({ id: "x", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message: { role: "assistant", content: fixtureContent(body, { protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId, provider: "lmstudio", model: "m", envelope: { type: "text", text: "safe" } }), tool_calls: [] }, finish_reason: "stop" }], usage: {} }); let sent = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } }); }, TextDecoder });
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
    function fetch(url, options) { const body = JSON.parse(options.body); transportCalls.push(body); const requestId = (body.response_format ? /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(body.messages[1].content).turnResponseContract)[1] : "req_" + "0".repeat(32)); const responseSchema = body.response_format ? body.response_format.json_schema.schema.properties : {protocol:{enum:["vela.model-response.v1"]},schemaVersion:{enum:["1.1"]},provider:{enum:["lmstudio"]}}; const response = JSON.stringify({ id: "chatcmpl-local", object: "chat.completion", created: 1784797754, model: "m", choices: [{ index: 0, message: { role: "assistant", content: fixtureContent(body, { protocol: responseSchema.protocol.enum[0], schemaVersion: responseSchema.schemaVersion.enum[0], requestId, provider: responseSchema.provider.enum[0], model: "m", envelope: { type: "text", text: "safe" } }), reasoning_content: "", tool_calls: [] }, logprobs: null, finish_reason: "stop" }], usage: { prompt_tokens: 239, completion_tokens: 144, total_tokens: 383, completion_tokens_details: { reasoning_tokens: 0 } }, stats: {}, system_fingerprint: "qwen3.5-4b" }); let sent = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } }); }
    const runtime = runtimeModule.createRuntime({ activationPolicy, environment: Object.assign({ setTimeout, clearTimeout, fetch, TextDecoder, timeoutMs: 1000 }, nodeRuntime), invokeHost(source, callback) { hostCalls.push({ request: decode(source), callback }); } });
    return { runtime, hostCalls, transportCalls, tierZero, tierOne, tierThree, resolve(call, raw) { call.callback(raw); }, async initialize() { const ready = runtime.initialize(); await flush(); this.resolve(hostCalls[0], this.tierZero(hostCalls[0].request)); await ready; await flush(); } };
}
async function runRequestProfileLifecycleTests() {
    const endpoint = "http://127.0.0.1:1234/v1/chat/completions";
    const cold = observedHarness({ responseKind: () => "text", hostResponse: (request) => hostError(request, "HOST_CONTEXT_UNAVAILABLE", "no-actionable-target") });
    const coldFirst = await cold.controller.send({ message: "ordinary cold question", endpoint, model: "m" });
    const coldFirstDiagnostics = cold.controller.getDiagnostics();
    const coldSecondPending = cold.controller.send({ message: "ordinary cold follow-up", endpoint, model: "m" });
    const coldPendingDiagnostics = cold.controller.getDiagnostics();
    const coldSecond = await coldSecondPending;
    const coldSecondDiagnostics = cold.controller.getDiagnostics();
    check(coldFirst.state === "completed" && coldFirst.text === "safe" && coldSecond.state === "completed" && cold.observed.transportBodies.length === 2, "Fresh Context-unavailable runtime sends two ordinary Provider requests and completes both text responses.");
    check(coldFirstDiagnostics.lastTerminalRequestId === coldFirst.requestId && coldFirstDiagnostics.lastTerminalDisposition === "completed" && coldFirstDiagnostics.lastTerminalFailureBoundary === null && coldFirstDiagnostics.lastTerminalErrorCode === null, "A completed request atomically records its bounded last-terminal projection.");
    check(coldFirstDiagnostics.lastContextOperation === "capture-context" && coldFirstDiagnostics.lastContextDisposition === "unavailable" && coldFirstDiagnostics.lastContextFailureStage === "host-error" && coldFirstDiagnostics.lastContextHostErrorCode === "HOST_CONTEXT_UNAVAILABLE" && coldFirstDiagnostics.lastContextErrorCode === "VERIFICATION_UNAVAILABLE" && coldFirstDiagnostics.lastContextUnavailableReason === "no-actionable-target", "Provider diagnostics project the Bridge-owned unavailable Context terminal without reclassifying it.");
    check(coldPendingDiagnostics.lastTerminalRequestId === coldFirst.requestId && coldPendingDiagnostics.lastTerminalDisposition === "completed" && coldPendingDiagnostics.lastTerminalFailureBoundary === null && coldPendingDiagnostics.lastTerminalErrorCode === null, "Starting the next send preserves the prior last-terminal attempt until replacement.");
    check(coldPendingDiagnostics.lastContextHostErrorCode === coldFirstDiagnostics.lastContextHostErrorCode && coldPendingDiagnostics.lastContextErrorCode === coldFirstDiagnostics.lastContextErrorCode && coldPendingDiagnostics.lastContextUnavailableReason === coldFirstDiagnostics.lastContextUnavailableReason, "Starting the next send preserves the prior last-Context terminal projection until the new capture terminates.");
    check(coldSecondDiagnostics.lastTerminalRequestId === coldSecond.requestId && coldSecond.requestId !== coldFirst.requestId && coldSecondDiagnostics.lastTerminalDisposition === "completed" && coldSecondDiagnostics.lastTerminalFailureBoundary === null && coldSecondDiagnostics.lastTerminalErrorCode === null, "A new completion atomically replaces every prior last-terminal field.");
    check(cold.observed.providerInputs.length === 2 && cold.observed.providerInputs.every((input) => input.context.tier === 0 && /^provider-context-unavailable-/.test(input.context.contextId) && input.messages[0].content.includes("active composition type none") && input.messages[0].content.includes("selected layers 0") && input.messages[0].content.includes("opacity unavailable")), "Each cold request carries the existing explicit identity-free unavailable projection instead of failing before Provider start.");
    check(cold.observed.providerInputs[0].context.contextId !== cold.observed.providerInputs[1].context.contextId && cold.observed.providerInputs[0].context.fingerprint !== cold.observed.providerInputs[1].context.fingerprint, "Consecutive unavailable requests receive isolated request generations and never share Context correlation.");
    const hostTransportFailure = observedHarness({ responseKind: () => "text", hostThrow: true });
    const hostTransportState = await hostTransportFailure.controller.send({ message: "transport failure", endpoint, model: "m" });
    check(hostTransportState.state === "failed" && hostTransportState.errorCode === "RUNTIME_CAPABILITY_UNAVAILABLE" && hostTransportFailure.observed.transportBodies.length === 0 && hostTransportFailure.observed.providerInputs.length === 0, "A Host transport failure fails closed before Provider invocation and is never projected as zero selection.");
    check(hostTransportFailure.controller.getDiagnostics().lastTerminalRequestId === null && hostTransportFailure.controller.getDiagnostics().lastTerminalDisposition === "failed" && hostTransportFailure.controller.getDiagnostics().lastTerminalFailureBoundary === "context-capture" && hostTransportFailure.controller.getDiagnostics().lastTerminalErrorCode === "RUNTIME_CAPABILITY_UNAVAILABLE", "Pre-Provider Context failure records a null request id and the closed context-capture boundary.");
    const malformedHost = observedHarness({ responseKind: () => "text", hostResponse: () => "not-json" });
    const malformedState = await malformedHost.controller.send({ message: "malformed host", endpoint, model: "m" });
    check(malformedState.state === "failed" && malformedState.errorCode === "SCHEMA_VALIDATION_FAILED" && malformedHost.observed.transportBodies.length === 0 && malformedHost.observed.providerInputs.length === 0, "A malformed Host response fails closed before Provider invocation and is never projected as zero selection.");
    check(malformedHost.controller.getDiagnostics().lastContextOperation === "capture-context" && malformedHost.controller.getDiagnostics().lastContextDisposition === "failed" && malformedHost.controller.getDiagnostics().lastContextFailureStage === "raw-json" && malformedHost.controller.getDiagnostics().lastContextHostErrorCode === null && malformedHost.controller.getDiagnostics().lastContextErrorCode === "SCHEMA_VALIDATION_FAILED", "Provider diagnostics copy the Bridge-owned raw-json failure without raw Host content.");
    let stagedFailureCount = 0;
    const stagedFailure = observedHarness({ responseKind: () => "text", hostResponse: (request) => { stagedFailureCount += 1; return stagedFailureCount === 1 ? hostError(request, "HOST_CONTEXT_READ_FAILED", null, "project-transition") : hostError(request, "HOST_CONTEXT_UNAVAILABLE", "no-active-composition"); } });
    const stagedFirst = await stagedFailure.controller.send({ message: "staged failure", endpoint, model: "m" });
    const stagedFirstDiagnostics = stagedFailure.controller.getDiagnostics();
    const stagedSecondPending = stagedFailure.controller.send({ message: "staged recovery", endpoint, model: "m" });
    const stagedPendingDiagnostics = stagedFailure.controller.getDiagnostics();
    const stagedSecond = await stagedSecondPending;
    const stagedSecondDiagnostics = stagedFailure.controller.getDiagnostics();
    check(stagedFirst.state === "failed" && stagedFirst.errorCode === "SCHEMA_VALIDATION_FAILED" && stagedFirstDiagnostics.lastContextHostFailureStage === "project-transition", "Provider diagnostics copy the Bridge-owned closed Host failure stage without reclassification.");
    check(stagedPendingDiagnostics.lastContextHostFailureStage === "project-transition", "Starting the next send preserves the prior Host failure stage until terminal replacement.");
    check(stagedSecond.state === "completed" && stagedSecondDiagnostics.lastContextHostErrorCode === "HOST_CONTEXT_UNAVAILABLE" && stagedSecondDiagnostics.lastContextHostFailureStage === null && stagedSecondDiagnostics.lastContextUnavailableReason === "no-active-composition", "The next terminal Context attempt atomically clears the prior Host failure stage.");
    check(!/bounded|stack|project path|native object/i.test(JSON.stringify(stagedFirstDiagnostics)), "Provider Host-stage projection remains bounded and private.");
    const facadeUnavailable = observedHarness({ responseKind: () => "text", hostResponse: (request) => hostError(request, "HOST_CONTEXT_UNAVAILABLE") });
    const facadeUnavailableState = await facadeUnavailable.controller.send({ message: "facade unavailable", endpoint, model: "m" });
    check(facadeUnavailableState.state === "failed" && facadeUnavailableState.errorCode === "RUNTIME_CAPABILITY_UNAVAILABLE" && facadeUnavailable.observed.transportBodies.length === 0 && facadeUnavailable.observed.providerInputs.length === 0, "An unclassified Host infrastructure unavailable error fails closed instead of taking the benign unavailable projection.");
    let warmedUnavailable = false;
    const warmed = observedHarness({ responseKind: () => "text", hostResponse: (request) => warmedUnavailable && request.operation === "captureContext" ? hostError(request, "HOST_CONTEXT_UNAVAILABLE", "no-actionable-target") : hostResult(request) });
    const warmedFirst = await warmed.controller.send({ message: "selected question", endpoint, model: "m" }); warmedUnavailable = true;
    const warmedSecond = await warmed.controller.send({ message: "after deselection", endpoint, model: "m" });
    check(warmedFirst.state === "completed" && warmedSecond.state === "completed" && warmed.observed.transportBodies.length === 2, "A warmed request followed by current Context unavailability behaves like a fresh unavailable request.");
    check(warmed.observed.providerInputs[0].context.tier === 1 && warmed.observed.providerInputs[1].context.tier === 0 && warmed.observed.providerInputs[0].context.contextId !== warmed.observed.providerInputs[1].context.contextId && warmed.observed.providerInputs[0].context.fingerprint !== warmed.observed.providerInputs[1].context.fingerprint && !/layerId|nativeLayerId|propertyPath/.test(JSON.stringify(warmed.observed.providerInputs[1])), "Deselection never reuses the warmed target identity, fingerprint, or execution authority.");
    const isolated = observedHarness();
    const messages = ["hello", "Set opacity to 50%", "hello again"];
    const states = [];
    for (const message of messages) states.push(await isolated.controller.send({ message, endpoint, model: "m" }));
    check(isolated.observed.classifyInputs.length === 3 && isolated.observed.classifyInputs.join("|") === messages.join("|"), "Each completed send classifies exactly once and receives only its current user message.");
    check(messages.every((message) => { const index = isolated.observed.events.indexOf("classify:" + message); const nextCapture = isolated.observed.events.findIndex((event, eventIndex) => eventIndex > index && /^capture:/.test(event)); return index !== -1 && nextCapture !== -1 && !isolated.observed.events.slice(index + 1, nextCapture).some((event) => /^classify:|^provider:/.test(event)); }), "Each classification precedes its Tier 1 capture without another classification or Provider creation: " + JSON.stringify(isolated.observed.events));
    check(isolated.observed.providerProfiles.join("|") === "text-only|explicit-edit-eligible|text-only", "One Controller binds plain → extraction → plain Profiles without sticky structured state.");
    check(isolated.observed.transportBodies.map((body) => (body.response_format ? body.response_format.json_schema.name : "native")).join("|") === "native|vela_local_proposal_response|native", "Three Provider instances select isolated plain → localProposal → plain Schemas.");
    check(isolated.observed.transportBodies[0].messages[0].content.includes("ordinary conversation") && isolated.observed.transportBodies[1].messages[0].content.includes("This request is explicit-edit-eligible") && isolated.observed.transportBodies[2].messages[0].content.includes("ordinary conversation"), "Prompt Builder selects each generation's fresh Profile without caching the prior branch.");
    check(states[0].state === "completed" && states[1].state === "proposal-ready" && states[2].state === "completed" && isolated.observed.intentInputs.length === 1, "Only the legal extraction response reaches Intent Gate and proposal-ready.");
    check(isolated.observed.intentInputs[0].message === "Set opacity to 50%" && isolated.observed.intentInputs[0].capabilityId === "set-opacity-v1" && isolated.observed.intentInputs[0].proposedOpacity === 50, "Intent Gate receives the current extraction message, exact capability, and exact unique target.");
    [states[0], states[1], states[2], isolated.controller.getUiState()].forEach((state) => check(!Object.prototype.hasOwnProperty.call(state, "requestProfile") && !JSON.stringify(state).includes("\"requestProfile\""), "Public UI state never exposes requestProfile."));
    isolated.observed.transportBodies.forEach((body) => {
        check(!JSON.stringify(body).includes("\"requestProfile\""), "Transport body contains no requestProfile field.");
        check(!/propertyPath|contextId|fingerprint|nativeLayerId|sha256:|host_[a-z0-9]|auto(?:matic|nomous)? execution/i.test(body.messages[0].content), "Profile Prompt contains no actual Context identity or autonomous execution authority.");
    });
    const proposalPort = isolated.observedModule.createProposalPort(isolated.controller, isolated.p);
    await assert.rejects(Promise.resolve().then(() => proposalPort.beginReview()), (error) => error.code === isolated.p.ERROR_CODES.CANDIDATE_NOT_FOUND); assertions += 1;
    check(isolated.controller.getUiState().proposalCapabilityId === null, "A later text generation clears the prior active proposal without retaining Profile data.");

    const textMismatch = observedHarness({ responseKind: () => "localProposal" });
    const textMismatchState = await textMismatch.controller.send({ message: "hello", endpoint, model: "m" });
    check(textMismatchState.state === "completed" && textMismatchState.text.includes("localProposal") && textMismatch.observed.intentInputs.length === 0 && textMismatchState.proposalCapabilityId === null, "A structured localProposal on an ordinary chat turn fails closed before Intent Gate.");
    const textMismatchPort = textMismatch.observedModule.createProposalPort(textMismatch.controller, textMismatch.p);
    await assert.rejects(Promise.resolve().then(() => textMismatchPort.beginReview()), (error) => error.code === textMismatch.p.ERROR_CODES.CANDIDATE_NOT_FOUND); assertions += 1;

    const extractionMismatch = observedHarness({ responseKind: () => "text" });
    const extractionMismatchState = await extractionMismatch.controller.send({ message: "Set opacity to 50%", endpoint, model: "m" });
    check(extractionMismatchState.state === "failed" && extractionMismatchState.errorCode === extractionMismatch.p.ERROR_CODES.PROVIDER_RESPONSE_INVALID && extractionMismatch.observed.intentInputs.length === 0 && extractionMismatchState.proposalCapabilityId === null, "A protocol-valid text response on explicit-edit-eligible fails locally before Intent Gate and cannot reach proposal-ready.");
    check(extractionMismatch.controller.getDiagnostics().lastTerminalRequestId === extractionMismatchState.requestId && extractionMismatch.controller.getDiagnostics().lastTerminalDisposition === "failed" && extractionMismatch.controller.getDiagnostics().lastTerminalFailureBoundary === "profile-validation" && extractionMismatch.controller.getDiagnostics().lastTerminalErrorCode === "PROVIDER_RESPONSE_INVALID", "Controller terminal diagnostics preserve the Adapter-owned profile-validation boundary and correlated request id.");

    const chineseMessage = "将当前选中图层的不透明度设置为 50%。";
    const chineseProposal = observedHarness();
    const chineseProposalState = await chineseProposal.controller.send({ message: chineseMessage, endpoint, model: "m" });
    check(chineseProposal.observed.classifyInputs[0] === chineseMessage && chineseProposal.observed.providerProfiles[0] === "explicit-edit-eligible", "The exact AE regression message binds the deterministic explicit-edit-eligible Profile.");
    check(chineseProposal.observed.transportBodies[0].response_format.json_schema.name === "vela_local_proposal_response" && chineseProposal.observed.transportBodies[0].messages[2].content === chineseMessage, "The exact original Chinese message reaches the extraction response format without rewriting.");
    check(chineseProposalState.state === "proposal-ready" && chineseProposalState.proposalCapabilityId === "set-opacity-v1" && chineseProposalState.suggestedOpacity === 50 && chineseProposalState.text === null && chineseProposal.observed.intentInputs.length === 1, "A valid exact-opacity localProposal reaches Intent Gate and proposal-ready with no assistant text.");

    for (const message of ["将当前图层不透明度更改为50", "将该图层的不透明度调整到50"]) {
        const union = observedHarness({ responseKind: () => "localProposal" });
        const unionState = await union.controller.send({ message, endpoint, model: "m" });
        const diagnostic = union.controller.getDiagnostics();
        check(union.observed.providerProfiles[0] === "text-only" && !union.observed.transportBodies[0].response_format, message + " remains plain text instead of inheriting a union Profile.");
        check(unionState.state === "completed" && unionState.proposalCapabilityId === null && union.observed.intentInputs.length === 0, message + " cannot reach proposal-ready from a plain turn.");
        check(diagnostic.provisionalProfile === "text-only" && diagnostic.contextUnionEligible === true && diagnostic.finalProfile === "text-only" && diagnostic.responseSchemaName === null, "Diagnostics record the current plain Profile without sticky structured state.");
        check(!/endpoint|token|currentUserMessage|rawResponse|project|host_|nativeLayerId|fingerprint/i.test(JSON.stringify(diagnostic)), "Diagnostics exclude endpoint secrets, raw message/response, project content, and Host identity.");
    }

    const executionClaim = observedHarness({ responseKind: () => "text", responseText: "已经修改，已执行，调整完成" });
    const executionClaimState = await executionClaim.controller.send({ message: chineseMessage, endpoint, model: "m" });
    check(executionClaim.observed.providerProfiles[0] === "explicit-edit-eligible" && executionClaim.observed.transportBodies[0].response_format.json_schema.name === "vela_local_proposal_response", "The execution-claim fixture remains bound to the extraction Profile and schema.");
    check(executionClaimState.state === "failed" && executionClaimState.errorCode === executionClaim.p.ERROR_CODES.PROVIDER_RESPONSE_INVALID && executionClaimState.text === null && executionClaimState.proposalCapabilityId === null && executionClaim.observed.intentInputs.length === 0, "Model execution claims fail at Profile mismatch before Intent Gate and expose no text or proposal authority.");

    const repeated = observedHarness();
    const repeatedFirst = await repeated.controller.send({ message: chineseMessage, endpoint, model: "m" });
    const repeatedFirstRequestId = repeatedFirst.requestId;
    const repeatedPort = repeated.observedModule.createProposalPort(repeated.controller, repeated.p);
    const repeatedFirstProposal = repeatedPort.beginReview();
    check(repeatedFirstProposal.requestId === repeatedFirstRequestId && Number.isInteger(repeatedFirstProposal.generation), "The first proposal is explicitly bound to its Provider request identity.");
    check(repeatedPort.finalizeReview({ requestId: repeatedFirstProposal.requestId, generation: repeatedFirstProposal.generation, outcome: "completed", errorCode: null }) === true, "The first request transaction is finalized before the next send.");
    const repeatedSecond = await repeated.controller.send({ message: chineseMessage, endpoint, model: "m" });
    check(repeated.observed.classifyInputs.join("|") === chineseMessage + "|" + chineseMessage && repeated.observed.providerProfiles.join("|") === "explicit-edit-eligible|explicit-edit-eligible", "Two identical Chinese turns are independently classified and Profile-bound.");
    check(repeatedFirstRequestId !== repeatedSecond.requestId && repeated.observed.transportBodies[0].response_format.json_schema.schema.properties.requestId.enum[0] === repeatedFirstRequestId && repeated.observed.transportBodies[1].response_format.json_schema.schema.properties.requestId.enum[0] === repeatedSecond.requestId, "Repeated turns receive distinct requestIds bound to their own response schemas.");
    check(repeated.observed.transportBodies.every((body) => body.messages[2].content === chineseMessage) && repeated.observed.intentInputs.length === 2 && repeated.observed.intentInputs.every((input) => input.message === chineseMessage && input.proposedOpacity === 50), "Prompt Builder and Intent Gate receive each turn's exact immutable user message and proposal.");
    check(repeatedFirstProposal.opacity === 50 && repeatedSecond.state === "proposal-ready" && repeatedSecond.suggestedOpacity === 50 && repeatedSecond.requestId !== repeatedFirstRequestId, "Consuming the first proposal leaves no authority reuse and the second legal proposal owns a new Review turn.");
    const repeatedSecondProposal = repeatedPort.beginReview();
    check(repeatedPort.finalizeReview({ requestId: repeatedSecondProposal.requestId, generation: repeatedSecondProposal.generation, outcome: "completed", errorCode: null, handled: true }) === true && repeated.controller.getUiState().state === "local-proposal-handled" && repeated.controller.getUiState().text === null && repeated.controller.getUiState().errorCode === null, "A trusted completed review can settle as handled localProposal success without assistant text.");
    check(repeatedPort.finalizeReview({ requestId: repeatedSecondProposal.requestId, generation: repeatedSecondProposal.generation, outcome: "completed", errorCode: null, handled: true }) === false, "Handled proposal settlement remains exactly-once and cannot be replayed.");

    const opacityMismatch = observedHarness({ responseOpacity: 40 });
    const opacityMismatchState = await opacityMismatch.controller.send({ message: chineseMessage, endpoint, model: "m" });
    check(opacityMismatchState.state === "intent-rejected" && opacityMismatchState.intentReason === "target-mismatch" && opacityMismatchState.suggestedOpacity === null && opacityMismatch.observed.intentInputs[0].message === chineseMessage && opacityMismatch.observed.intentInputs[0].proposedOpacity === 40, "Only a mismatched current-turn opacity receives the bounded target-mismatch Gate classification.");

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
    check(rapid.controller.getDiagnostics().lastTerminalRequestId === null && rapid.controller.getDiagnostics().lastTerminalDisposition === "cancelled" && rapid.controller.getDiagnostics().lastTerminalFailureBoundary === null && rapid.controller.getDiagnostics().lastTerminalErrorCode === "PROVIDER_REQUEST_ABORTED", "Pre-transport cancellation records no fabricated request id or failure boundary.");
    rapid.resolveNext(); await first; await flush();
    check(rapid.observed.transportBodies.length === 0 && rapid.observed.intentInputs.length === 0 && rapid.controller.getUiState().state === "cancelled", "Late Tier 1 after cancel cannot transport, enter Intent Gate, or revive public state.");
    const providerDeferred = deferred();
    const providerCancelled = observedHarness({ transportDeferred: providerDeferred });
    const providerCancelledPromise = providerCancelled.controller.send({ message: "cancel provider", endpoint, model: "m" }); await flush();
    const providerCancelledRequestId = providerCancelled.controller.getUiState().requestId;
    check(typeof providerCancelledRequestId === "string" && providerCancelled.controller.cancel({ requestId: providerCancelledRequestId }) === true, "Cancel accepts the exact issued Provider request id while transport is pending.");
    await providerCancelledPromise;
    check(providerCancelled.controller.getDiagnostics().lastTerminalRequestId === providerCancelledRequestId && providerCancelled.controller.getDiagnostics().lastTerminalDisposition === "cancelled" && providerCancelled.controller.getDiagnostics().lastTerminalFailureBoundary === null && providerCancelled.controller.getDiagnostics().lastTerminalErrorCode === "PROVIDER_REQUEST_ABORTED", "Provider-phase cancellation correlates its request id without fabricating a failure boundary.");
    const sentinel = "A3_REASONING_SECRET_SENTINEL_94827";
    const reasoningHeavy = observedHarness({ responseOpacity: 47, responseMessage(content) { return { role: "assistant", content, reasoning_content: sentinel, tool_calls: [] }; }, responseUsage: { completion_tokens_details: { reasoning_tokens: 321 } } });
    const reasoningHeavyState = await reasoningHeavy.controller.send({ message: "Set opacity to 47%", endpoint, model: "m" });
    check(reasoningHeavyState.state === "proposal-ready" && reasoningHeavyState.suggestedOpacity === 47 && reasoningHeavy.observed.intentInputs.length === 1, "Controller consumes structured final content from a reasoning-heavy wrapper and reaches the normal proposal path.");
    check(!JSON.stringify(reasoningHeavyState).includes(sentinel) && !/reasoning_content|reasoning_tokens/.test(JSON.stringify(reasoningHeavyState)) && !JSON.stringify(reasoningHeavy.controller.getDiagnostics()).includes(sentinel), "Controller state and diagnostics discard reasoning text and token metadata.");
    const noReasoning = observedHarness({ responseOpacity: 47, responseMessage(content) { return { role: "assistant", content, tool_calls: [] }; } });
    const noReasoningState = await noReasoning.controller.send({ message: "Set opacity to 47%", endpoint, model: "m" });
    check(noReasoningState.state === reasoningHeavyState.state && noReasoningState.proposalCapabilityId === reasoningHeavyState.proposalCapabilityId && noReasoningState.suggestedOpacity === reasoningHeavyState.suggestedOpacity && noReasoning.observed.intentInputs[0].proposedOpacity === reasoningHeavy.observed.intentInputs[0].proposedOpacity, "The same canonical content has equivalent proposal and Intent Gate semantics with or without reasoning metadata.");
    const controllerFailures = [
        ["reasoning-only-empty", (content) => ({ role: "assistant", content: "", reasoning_content: sentinel, tool_calls: [] }), {}],
        ["reasoning-only-null", (content) => ({ role: "assistant", content: null, reasoning_content: sentinel, tool_calls: [] }), {}],
        ["reasoning-only-missing", (content) => ({ role: "assistant", reasoning_content: sentinel, tool_calls: [] }), {}],
        ["reasoning-object", (content) => ({ role: "assistant", content, reasoning_content: { secret: sentinel }, tool_calls: [] }), {}],
        ["reasoning-array", (content) => ({ role: "assistant", content, reasoning_content: [sentinel], tool_calls: [] }), {}],
        ["reasoning-number", (content) => ({ role: "assistant", content, reasoning_content: 7, tool_calls: [] }), {}],
        ["unknown-reasoning", (content) => ({ role: "assistant", content, reasoning: sentinel, tool_calls: [] }), {}],
        ["negative-reasoning-tokens", (content) => ({ role: "assistant", content, reasoning_content: sentinel, tool_calls: [] }), { completion_tokens_details: { reasoning_tokens: -1 } }],
        ["fractional-reasoning-tokens", (content) => ({ role: "assistant", content, reasoning_content: sentinel, tool_calls: [] }), { completion_tokens_details: { reasoning_tokens: 1.5 } }]
    ];
    for (const fixture of controllerFailures) {
        const invalid = observedHarness({ responseOpacity: 47, responseMessage: fixture[1], responseUsage: fixture[2] });
        const invalidState = await invalid.controller.send({ message: "Set opacity to 47%", endpoint, model: "m" });
        check(invalidState.state === "failed" && invalidState.errorCode === "PROVIDER_RESPONSE_INVALID" && invalid.observed.intentInputs.length === 0 && invalid.observed.transportBodies.length === 1 && invalid.controller.getUiState().proposalCapabilityId === null, fixture[0] + " fails closed once before proposal or retry.");
        check(!JSON.stringify(invalid.controller.getDiagnostics()).includes(sentinel), fixture[0] + " diagnostics do not stringify auxiliary reasoning payloads.");
    }
    const restarted = rapid.controller.send({ message: chineseMessage, endpoint, model: "m" }); await flush();
    rapid.resolveNext(); await flush();
    rapid.resolveNext(); await restarted; await flush();
    check(rapid.observed.classifyInputs.length === 2 && rapid.observed.classifyInputs[1] === chineseMessage && rapid.observed.providerProfiles.join("|") === "explicit-edit-eligible", "Lifecycle restart independently reclassifies the identical explicit request and does not reuse the cancelled generation Profile.");
    check(rapid.observed.transportBodies.length === 1 && rapid.observed.intentInputs.length === 1 && rapid.observed.intentInputs[0].message === chineseMessage && rapid.controller.getUiState().state === "proposal-ready", "After Cancel, the identical explicit retry is isolated from the stale generation and reaches fresh Review.");
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
    for (const count of [0, 2]) { const h = deferredHarness(); const request = h.controller.send({ message: "query", endpoint, model: "m" }); await flush(); h.resolve(h.hostCalls[0], h.tierOne(h.hostCalls[0].request, count)); await request; await flush(); check(h.hostCalls.length === 1 && h.transportCalls.length === 1 && h.transportCalls[0].messages[1].content.includes("opacity unavailable") && !JSON.parse(h.transportCalls[0].messages[1].content).trustedGrounding.includes("value"), (count === 0 ? "No selection" : "Multi-selection") + " completes a formal Send with available:false and no Tier 3 target."); }
    const mismatch = deferredHarness(); const mismatchRequest = mismatch.controller.send({ message: "mismatch", endpoint, model: "m" }); await flush(); mismatch.resolve(mismatch.hostCalls[0], mismatch.tierOne(mismatch.hostCalls[0].request, 1)); await flush(); mismatch.resolve(mismatch.hostCalls[1], mismatch.tierThree(mismatch.hostCalls[1].request, 25, true)); await mismatchRequest; await flush();
    check(mismatch.transportCalls.length === 0 && mismatch.controller.getUiState().state === "failed", "A Tier 3 target mismatch fails closed without a trusted value or outbound request.");
    const recovered = mismatch.controller.send({ message: "recovered", endpoint, model: "m" }); await flush(); mismatch.resolve(mismatch.hostCalls[2], mismatch.tierOne(mismatch.hostCalls[2].request, 1)); await flush(); mismatch.resolve(mismatch.hostCalls[3], mismatch.tierThree(mismatch.hostCalls[3].request, 25)); await recovered; await flush();
    check(mismatch.transportCalls.length === 1 && mismatch.transportCalls[0].messages[1].content.includes("25"), "A normal later Send recovers from target mismatch with a new binding and no fallback projection.");
    const suspended = deferredHarness(); const suspendedRequest = suspended.controller.send({ message: "suspend", endpoint, model: "m" }); await flush(); suspended.resolve(suspended.hostCalls[0], suspended.tierOne(suspended.hostCalls[0].request, 1)); await flush(); const suspendedTier3 = suspended.hostCalls[1]; suspended.controller.invalidate("idle"); suspended.bridge.suspend(); suspended.resolve(suspendedTier3, suspended.tierThree(suspendedTier3.request, 25)); await suspendedRequest; await flush();
    check(suspended.transportCalls.length === 0 && suspended.controller.getUiState().state === "idle", "Runtime-equivalent invalidate then suspend prevents a late Tier 3 from transport or UI revival.");
    suspended.bridge.resume(); const resumed = suspended.controller.send({ message: "resume", endpoint, model: "m" }); await flush(); const resumedTier1 = suspended.hostCalls[2]; suspended.resolve(resumedTier1, suspended.tierOne(resumedTier1.request, 1)); await flush(); const resumedTier3 = suspended.hostCalls[3]; suspended.resolve(resumedTier3, suspended.tierThree(resumedTier3.request, 50)); await resumed; await flush();
    check(suspended.transportCalls.length === 1 && suspended.transportCalls[0].messages[1].content.includes("50"), "A new post-resume send uses a fresh capture and completes normally.");
    const coldCancelled = deferredHarness(); const coldCancelledRequest = coldCancelled.controller.send({ message: "cancel cold context", endpoint, model: "m" }); await flush(); const coldPendingCapture = coldCancelled.hostCalls[0]; check(coldCancelled.controller.cancel({ requestId: null }) === true, "A request may be cancelled while its cold Context capture is pending."); coldCancelled.resolve(coldPendingCapture, hostError(coldPendingCapture.request, "HOST_CONTEXT_UNAVAILABLE", "no-actionable-target")); await coldCancelledRequest; await flush(); check(coldCancelled.transportCalls.length === 0 && coldCancelled.controller.getUiState().state === "cancelled", "Late unavailable Context after cancel cannot trigger the best-effort Provider fallback.");
    const ownership = deferredHarness(); const providerPending = ownership.controller.send({ message: "provider", endpoint, model: "m" }); await flush(); const legacyAttempt = ownership.bridge.beginOwnedCapture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true }); await assert.rejects(legacyAttempt.promise, error => error.code === ownership.p.ERROR_CODES.EXECUTION_BUSY); assertions += 1; check(ownership.bridge.cancelOwnedCapture(legacyAttempt.handle) === false, "A busy legacy attempt receives no owned handle and cannot cancel Provider capture."); ownership.resolve(ownership.hostCalls[0], ownership.tierOne(ownership.hostCalls[0].request, 1)); await flush(); ownership.resolve(ownership.hostCalls[1], ownership.tierThree(ownership.hostCalls[1].request, 25)); await providerPending; await flush(); check(ownership.transportCalls.length === 1, "Provider-owned capture remains valid after a competing legacy Refresh attempt.");
    const disposed = deferredHarness(); const oldRequest = disposed.controller.send({ message: "old", endpoint, model: "m" }); await flush(); disposed.resolve(disposed.hostCalls[0], disposed.tierOne(disposed.hostCalls[0].request, 1)); await flush(); const oldTier3 = disposed.hostCalls[1]; disposed.controller.invalidate("idle"); disposed.resolve(oldTier3, disposed.tierThree(oldTier3.request, 25)); await oldRequest; await flush(); check(disposed.transportCalls.length === 0 && disposed.controller.getUiState().state === "idle", "Runtime disposal's Provider invalidate prevents old Tier 3 completion from transport or revival.");
    const newLifecycle = deferredHarness(); const newRequest = newLifecycle.controller.send({ message: "new", endpoint, model: "m" }); await flush(); newLifecycle.resolve(newLifecycle.hostCalls[0], newLifecycle.tierOne(newLifecycle.hostCalls[0].request, 1)); await flush(); newLifecycle.resolve(newLifecycle.hostCalls[1], newLifecycle.tierThree(newLifecycle.hostCalls[1].request, 100)); await newRequest; await flush(); check(newLifecycle.transportCalls.length === 1 && newLifecycle.transportCalls[0].messages[1].content.includes("100") && !newLifecycle.transportCalls[0].messages[1].content.includes("25"), "A new Controller lifecycle has no old projection, callback, or transport completion inheritance.");
}
async function run() {
    const p = protocol(); const context = contextModule.createContextApi(p);
    const requestBodies = [];
    const requestUrls = [];
    const nativeModelsFixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "vela-provider-readiness", "lm-studio-models-native-v1.json"), "utf8"));
    const bridge = bridgeModule.createContextBridge({ protocol: p, contextApi: context, invokeHost(source, cb) { cb(hostResult(decode(source))); }, runtime: { setTimeout, clearTimeout, timeoutMs: 1000 } });
    const transport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { const requestBody = JSON.parse(options.body); requestUrls.push(url); requestBodies.push(requestBody); const requestId = (requestBody.response_format ? requestBody.response_format.json_schema.schema.properties.requestId.enum[0] : "req_" + "0".repeat(32)); const message = requestBody.messages[2].content; const envelope = message === "将当前图层不透明度设为 57.5%" ? { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 57.5 } } } : message === "把当前图层透明度改成47%，然后把它命名为Hero" ? { type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 47 } }, { capabilityId: "set-layer-name-v1", params: { name: "Hero" } }] } : { text: "safe text", type: "text" }; const body = JSON.stringify({ id: "chatcmpl-local", object: "chat.completion", created: 1784797754, model: "m", choices: [{ index: 0, message: { role: "assistant", content: fixtureContent(requestBody, { envelope, model: "m", protocol: p.PROTOCOLS.RESPONSE, provider: "lmstudio", requestId, schemaVersion: p.SCHEMA_VERSION }), reasoning_content: "", tool_calls: [] }, logprobs: null, finish_reason: "stop" }], usage: { prompt_tokens: 239, completion_tokens: 144, total_tokens: 383, completion_tokens_details: { reasoning_tokens: 0 } }, stats: {}, system_fingerprint: "qwen3.5-4b" }); let done = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (done) return Promise.resolve({ done: true }); done = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(body) }); }, cancel() {} }; } } }); }, TextDecoder });
    const controller = controllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 100 } });
    let readinessFetches = 0;
    const readinessTransport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { readinessFetches += 1; const fixture = JSON.parse(JSON.stringify(nativeModelsFixture)); if (readinessFetches === 2) { fixture.models[0].key = "library-alias"; } if (readinessFetches === 5) { fixture.models = {}; } const body = JSON.stringify(fixture); let done = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (done) return Promise.resolve({ done: true }); done = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(body) }); }, cancel() {} }; } } }); }, TextDecoder });
    const readinessController = controllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport: readinessTransport, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 100 } });
    const ready = await readinessController.checkReadiness({ endpoint: "http://127.0.0.1:1234", model: "qwen/qwen3.5-9b" });
    check(Object.isFrozen(ready) && ready.ready === true && ready.code === "experimental-ready" && ready.modelId === "qwen/qwen3.5-9b" && ready.loadedInstances === 1 && ready.quantization === "Q4_K_M" && ready.contextLength === 8192, "The captured LM Studio native models fixture reports the exact loaded 9B model ready despite inert deep catalog metadata.");
    check(ready.baseUrl === "http://127.0.0.1:1234" && ready.chatUrl === "http://127.0.0.1:1234/v1/chat/completions", "Base endpoint derives fixed readiness and chat routes in trusted Provider code.");
    const idReady = await readinessController.checkReadiness({ endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "qwen/qwen3.5-9b" });
    check(idReady.ready === true && idReady.baseUrl === "http://127.0.0.1:1234", "A complete chat URL normalizes to base and an exact loaded instance id match is accepted when the library key differs.");
    const cold = await readinessController.checkReadiness({ endpoint: "http://localhost:1234/", model: "qwen3.5-4b" });
    check(cold.ready === false && cold.code === "configured-model-not-loaded" && cold.loadedInstances === 0 && cold.baseUrl === "http://localhost:1234", "localhost with a trailing slash normalizes to base and an unloaded requested model is classified not-loaded.");
    const missing = await readinessController.checkReadiness({ endpoint: "http://[::1]:1234", model: "text-embedding-nomic-embed-text-v1.5" });
    check(missing.ready === false && missing.code === "configured-model-not-found" && missing.modelId === "text-embedding-nomic-embed-text-v1.5" && missing.loadedInstances === 0 && missing.baseUrl === "http://[::1]:1234", "IPv6 loopback remains canonical and an embedding key is not accepted as an LLM readiness candidate.");
    await assert.rejects(readinessController.checkReadiness({ endpoint: "http://127.0.0.1:1234", model: "qwen/qwen3.5-9b" }), (error) => error.localReadinessCode === "readiness-response-invalid"); assertions += 1;
    await assert.rejects(readinessController.checkReadiness({ endpoint: "http://192.168.1.2:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.PROVIDER_CONFIG_INVALID); assertions += 1;
    check(readinessFetches === 5 && requestBodies.length === 0, "Readiness rejects non-loopback endpoints and never starts Provider send or Context capture.");
    const state = await controller.send({ message: "hello", endpoint: "http://127.0.0.1:1234", model: "m" });
    const requestBody = requestBodies[0];
    check(state.state === "completed" && state.text === "safe text", "Trusted Tier 1 capture reaches the adapter and exposes bounded text only.");
    check(!/stats|logprobs|completion_tokens_details|system_fingerprint|reasoning_content|tool_calls/.test(JSON.stringify(state)), "The complete LM Studio wrapper fixture reaches completed UI state without inert metadata leakage.");
    check(Array.isArray(requestBody.messages) && requestBody.messages.length === 3 && requestBody.messages[0].role === "system" && requestBody.messages[1].role === "assistant" && requestBody.messages[2].role === "user", "The final Controller to Adapter to Transport payload must preserve system, bounded context and user message order.");
    check(requestBody.messages[2].content === "hello", "The final payload user message must exactly match the current send input.");
    check(requestUrls[0] === "http://127.0.0.1:1234/v1/chat/completions", "A base endpoint derives the fixed chat completion URL before transport.");
    const assistantTurn = JSON.parse(requestBody.messages[1].content);
    check(Object.keys(assistantTurn).join(",") === "turnResponseContract,trustedGrounding" && !assistantTurn.turnResponseContract.includes(state.requestId) && !assistantTurn.turnResponseContract.includes("model m") && assistantTurn.trustedGrounding.indexOf("Trusted request context:") === 0 && assistantTurn.trustedGrounding.includes("selected layer opacity 57.5") && !JSON.stringify(requestBody.messages[1]).includes("host_") && !JSON.stringify(requestBody.messages[1]).includes("sha256:"), "The fixed assistant structure carries concrete response metadata plus only bounded trusted grounding and excludes authority data.");
    check(!requestBody.response_format && requestBody.stream === false && requestBody.model === "m", "Native chat sends ordinary completion shape without schema.");
    check(!JSON.stringify(state).includes("host_") && !JSON.stringify(state).includes("sha256:"), "Public provider state does not leak authority or fingerprint.");
    check(controller.cancel({ requestId: state.requestId }) === false, "Terminal requests cannot be cancelled or replayed.");
    const second = await controller.send({ message: "second request", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const secondBody = requestBodies[1];
    check(secondBody.messages.length === 3 && secondBody.messages[2].content === "second request" && !JSON.stringify(secondBody.messages).includes("hello"), "Each request must receive a fresh, isolated messages array without prior user content.");
    check(!secondBody.response_format && second.requestId !== state.requestId, "Each request schema must bind its own current local request id.");
    const logicalState = await controller.send({ message: "把当前图层透明度改成47%，然后把它命名为Hero", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(logicalState.state === "logical-plan-ready" && logicalState.logicalPlanProposal.declaredStepCount === 2 && Object.isFrozen(logicalState.logicalPlanProposal) && controller.getUiState().state === "completed", "Controller emits a frozen declaration-only logical terminal result while public UI state stays bounded.");
    check(requestBodies[2].response_format.json_schema.name === "vela_bounded_logical_plan_response" && !/TaskPlan|authority|nonce|targetKind/.test(JSON.stringify(logicalState)), "Logical Controller result contains no executable plan, authority, target, or nonce.");
    const proposalState = await controller.send({ message: "将当前图层不透明度设为 57.5%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(proposalState.state === "proposal-ready" && proposalState.proposalCapabilityId === "set-opacity-v1" && proposalState.suggestedOpacity === 57.5 && proposalState.text === null, "A localProposal becomes a bounded read-only Provider state without text or candidate data.");
    check(!/candidate|plan|nonce|digest|host_|nativeLayerId/i.test(JSON.stringify(proposalState)), "Proposal-ready state leaks no execution, authority or Host identity data.");
    const beforeInvalid = requestBodies.length;
    await assert.rejects(controller.send({ message: "", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    await assert.rejects(controller.send({ message: "   \t", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    await assert.rejects(controller.send({ message: "x".repeat(p.HARD_LIMITS.maxMessageBytes + 1), endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED); assertions += 1;
    check(requestBodies.length === beforeInvalid, "Invalid blank or oversized input must be rejected before context capture or network transport.");
    const controllerStreamEvents = [];
    const streamingTransport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) {
        const body = JSON.parse(options.body);
        const terminal = "streamed";
        const chunks = [
            "data: " + JSON.stringify({ choices: [{ delta: { reasoning_content: "private" }, finish_reason: null }] }) + "\n\n",
            "data: " + JSON.stringify({ choices: [{ delta: { content: terminal }, finish_reason: null }] }) + "\n\n",
            "data: [DONE]\n\n"
        ].map((value) => new TextEncoder().encode(value));
        return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "text/event-stream" }, body: { getReader() { return { read() { return Promise.resolve(chunks.length ? { done: false, value: chunks.shift() } : { done: true }); }, cancel() {} }; } } });
    }, TextDecoder });
    const streamingController = controllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport: streamingTransport, streaming: true, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 100 } });
    await assert.rejects(Promise.resolve().then(() => streamingController.subscribeStreamEvents(null)), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    let selfSubscription;
    let selfCalls = 0;
    selfSubscription = streamingController.subscribeStreamEvents(() => { selfCalls += 1; selfSubscription.unsubscribe(); });
    const throwingSubscription = streamingController.subscribeStreamEvents(() => { throw new Error("presentation listener failure"); });
    const orderedSubscription = streamingController.subscribeStreamEvents((event) => { controllerStreamEvents.push(event); });
    check(Object.isFrozen(selfSubscription) && selfSubscription.unsubscribe === selfSubscription.dispose, "Controller stream subscriptions expose one frozen, idempotent unsubscribe/dispose seam.");
    const streamedState = await streamingController.send({ message: "stream", endpoint: "http://127.0.0.1:1234", model: "m" });
    check(streamedState.state === "completed" && streamedState.text === "streamed" && streamingController.getUiState().text === "streamed", "Controller terminal state and Promise semantics remain authoritative while streaming is explicitly enabled.");
    check(controllerStreamEvents.map((event) => event.type).join(",") === "stream-started,reasoning-delta,text-delta,stream-completed" && selfCalls === 1, "Controller subscribers receive ordered events and mutation during dispatch is isolated.");
    check(throwingSubscription.unsubscribe() === true && throwingSubscription.dispose() === false && orderedSubscription.dispose() === true, "Controller unsubscribe/dispose is idempotent and listener failures do not affect other subscribers.");
    const eventCountAfterDispose = controllerStreamEvents.length;
    await streamingController.send({ message: "stream again", endpoint: "http://127.0.0.1:1234", model: "m" });
    check(controllerStreamEvents.length === eventCountAfterDispose, "Unsubscribed Controller listeners receive no later request events.");
    await runRequestProfileLifecycleTests();
    await runDeferredGroundingTests();
    console.log("test-vela-provider-controller: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
