#!/usr/bin/env node
"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const transportModule = require("../client/js/vela/velaLocalTransport");
const controllerModule = require("../client/js/vela/velaProviderController");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
function protocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v, "utf8").digest("hex"), randomId: (kind) => kind + "_" + (++id).toString().padStart(32, "a"), now: () => 1 }); }
function hostResult(request) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot: request.tier === 1 ? { hostInstanceId: "host_" + "a".repeat(48), hostReloadEpoch: 1, tier: 1, projectGeneration: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } } : { hostInstanceId: "host_" + "a".repeat(48), hostReloadEpoch: 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } } }); }
async function run() {
    const p = protocol(); const context = contextModule.createContextApi(p);
    const requestBodies = [];
    const bridge = bridgeModule.createContextBridge({ protocol: p, contextApi: context, invokeHost(source, cb) { cb(hostResult(decode(source))); }, runtime: { setTimeout, clearTimeout, timeoutMs: 1000 } });
    const transport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { const requestBody = JSON.parse(options.body); requestBodies.push(requestBody); const requestId = /Use requestId (req_[a-z0-9]+)/.exec(requestBody.messages[0].content)[1]; const body = JSON.stringify({ id: "chatcmpl-local", object: "chat.completion", created: 1784797754, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ envelope: { text: "safe text", type: "text" }, model: "m", protocol: p.PROTOCOLS.RESPONSE, provider: "lmstudio", requestId, schemaVersion: p.SCHEMA_VERSION }), reasoning_content: "", tool_calls: [] }, logprobs: null, finish_reason: "stop" }], usage: { prompt_tokens: 239, completion_tokens: 144, total_tokens: 383, completion_tokens_details: { reasoning_tokens: 0 } }, stats: {}, system_fingerprint: "qwen3.5-4b" }); let done = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (done) return Promise.resolve({ done: true }); done = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(body) }); }, cancel() {} }; } } }); }, TextDecoder });
    const controller = controllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 100 } });
    const state = await controller.send({ message: "hello", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const requestBody = requestBodies[0];
    check(state.state === "completed" && state.text === "safe text", "Trusted Tier 1 capture reaches the adapter and exposes bounded text only.");
    check(!/stats|logprobs|completion_tokens_details|system_fingerprint|reasoning_content|tool_calls/.test(JSON.stringify(state)), "The complete LM Studio wrapper fixture reaches completed UI state without inert metadata leakage.");
    check(Array.isArray(requestBody.messages) && requestBody.messages.length === 3 && requestBody.messages[0].role === "system" && requestBody.messages[1].role === "assistant" && requestBody.messages[2].role === "user", "The final Controller to Adapter to Transport payload must preserve system, bounded context and user message order.");
    check(requestBody.messages[2].content === "hello", "The final payload user message must exactly match the current send input.");
    check(requestBody.messages[1].content.indexOf("Tier 1 display context:") === 0 && !JSON.stringify(requestBody.messages[1]).includes("host_") && !JSON.stringify(requestBody.messages[1]).includes("sha256:"), "The bounded Tier 1 context remains separate from the system prompt and excludes authority data.");
    check(requestBody.response_format && requestBody.response_format.type === "json_schema", "The production local provider explicitly enables LM Studio json_schema mode.");
    check(requestBody.response_format.json_schema && requestBody.response_format.json_schema.strict === true && requestBody.response_format.json_schema.name === "vela_response", "The production controller must use the trusted structured response schema.");
    check(requestBody.response_format.json_schema.schema.properties.requestId.enum[0] === state.requestId && requestBody.response_format.json_schema.schema.properties.model.enum[0] === "m", "The production schema must bind the local request id and configured model.");
    const outputSchema = requestBody.response_format.json_schema.schema;
    const outputVariants = outputSchema.properties.envelope.oneOf;
    check(outputVariants[0].properties.text.maxLength === 1024 && outputVariants[1].properties.error.properties.stage.maxLength === 128 && outputVariants[1].properties.error.properties.message.maxLength === 512, "The final Transport payload must retain conservative LM Studio generation caps.");
    check(outputSchema.required.length === 6 && outputVariants.length === 2 && requestBody.stream === false && requestBody.model === "m", "The final payload must retain full required fields, both envelope variants, stream:false and the configured model.");
    check(!JSON.stringify(requestBody.response_format).includes("json_object"), "The production controller must not request the unsupported json_object mode.");
    check(!JSON.stringify(state).includes("host_") && !JSON.stringify(state).includes("sha256:"), "Public provider state does not leak authority or fingerprint.");
    check(controller.cancel({ requestId: state.requestId }) === false, "Terminal requests cannot be cancelled or replayed.");
    const second = await controller.send({ message: "second request", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    const secondBody = requestBodies[1];
    check(secondBody.messages.length === 3 && secondBody.messages[2].content === "second request" && !JSON.stringify(secondBody.messages).includes("hello"), "Each request must receive a fresh, isolated messages array without prior user content.");
    check(secondBody.response_format.json_schema.schema.properties.requestId.enum[0] === second.requestId && second.requestId !== state.requestId, "Each request schema must bind its own current local request id.");
    const beforeInvalid = requestBodies.length;
    await assert.rejects(controller.send({ message: "", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    await assert.rejects(controller.send({ message: "   \t", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.SCHEMA_VALIDATION_FAILED); assertions += 1;
    await assert.rejects(controller.send({ message: "x".repeat(p.HARD_LIMITS.maxMessageBytes + 1), endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }), (error) => error.code === p.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED); assertions += 1;
    check(requestBodies.length === beforeInvalid, "Invalid blank or oversized input must be rejected before context capture or network transport.");
    console.log("test-vela-provider-controller: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
