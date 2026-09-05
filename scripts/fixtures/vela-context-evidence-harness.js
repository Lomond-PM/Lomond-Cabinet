"use strict";
// Offline fixtures only; captures and transport exercise real Controller/Adapter code.
const crypto = require("crypto");
const protocolModule = require("../../client/js/vela/velaProtocol");
const contextModule = require("../../client/js/vela/velaContext");
const bridgeModule = require("../../client/js/vela/velaContextBridge");
const transportModule = require("../../client/js/vela/velaLocalTransport");
function deferred() { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; }
async function flush() { for (let i = 0; i < 35; i++) await Promise.resolve(); }
const cases = [
    { id: "text", message: "hello", model: "m" },
    { id: "proposal", message: "Set opacity to 50%", model: "m" },
    { id: "logical", message: "把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test", model: "m" },
    { id: "thinking-text", message: "hello", model: "qwen3.5-4b", streaming: true },
    { id: "thinking-proposal", message: "Set opacity to 50%", model: "qwen3.5-4b", streaming: true },
    { id: "thinking-logical", message: "把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test", model: "qwen3.5-4b", streaming: true },
    { id: "no-selection", message: "hello", model: "m", noSelection: true },
    { id: "unavailable", message: "hello", model: "m", unavailable: true },
    { id: "property-unavailable", message: "hello", model: "m", propertyUnavailable: true }
];
function create(options = {}) {
    let serial = 0;
    const protocol = protocolModule.createProtocol({ utf8ByteLength: v => Buffer.byteLength(v, "utf8"), sha256Hex: v => crypto.createHash("sha256").update(v).digest("hex"), randomId: kind => kind + "_" + String(++serial).padStart(32, "a"), now: () => 1 });
    const hostCalls = [], bodies = [], timers = [], streamReads = [];
    const pendingHost = [];
    const fetchGate = deferred();
    const bridge = bridgeModule.createContextBridge({ protocol, contextApi: contextModule.createContextApi(protocol), runtime: { setTimeout: () => 1, clearTimeout() {}, timeoutMs: 1000 }, invokeHost(source, callback) {
        const request = JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1)));
        hostCalls.push(request);
        const base = { hostInstanceId: "host_" + "a".repeat(48), hostReloadEpoch: 1, projectGeneration: 1 };
        let snapshot = { ...base, tier: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: options.noSelection ? 0 : 1, identityQuality: "native-layer-id", items: options.noSelection ? [] : [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } };
        if (request.tier === 3) snapshot = { ...base, tier: 3, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: 57.5 } })) };
        const result = { protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot };
        if (options.unavailable || options.propertyUnavailable && request.tier === 3) { result.ok = false; delete result.snapshot; result.error = { code: "HOST_CONTEXT_UNAVAILABLE", message: "bounded", reason: "no-actionable-target" }; }
        const answer = () => callback(options.captureFailure ? "malformed-json" : JSON.stringify(result));
        if (options.holdHost) pendingHost.push(answer); else answer();
    } });
    function response(url, body) {
        const schema = body.response_format && body.response_format.json_schema;
        let envelope = { type: "text", text: "safe" };
        if (schema) envelope = schema.name === "vela_bounded_logical_plan_response" ? { type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 60 } }, { capabilityId: "set-layer-name-v1", params: { name: "Vela Stream Test" } }] } : { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 50 } } };
        const content = schema ? JSON.stringify({ protocol: protocol.PROTOCOLS.RESPONSE, schemaVersion: protocol.SCHEMA_VERSION, requestId: schema.schema.properties.requestId.enum[0], provider: "lmstudio", model: body.model, envelope }) : "safe";
        const reasoning = "RAW_REASONING_A2_SENTINEL";
        const text = body.stream ? "data: " + JSON.stringify({ choices: [{ delta: { reasoning_content: reasoning, content }, finish_reason: "stop" }] }) + "\n\ndata: [DONE]\n\n" : JSON.stringify({ choices: [{ message: { role: "assistant", content, reasoning_content: reasoning }, finish_reason: "stop" }] });
        let sent = false;
        return { status: 200, redirected: false, url, headers: { get: () => body.stream ? "text/event-stream" : "application/json" }, body: { getReader() { return { read() {
            if (options.holdStream) { const gate = deferred(); streamReads.push(gate); return gate.promise; }
            if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(text) });
        }, cancel() {} }; } } };
    }
    const transport = transportModule.createLocalTransport({ protocol, TextDecoder, fetch(url, input) { const body = JSON.parse(input.body); bodies.push(input.body); return options.holdFetch ? fetchGate.promise.then(() => response(url, body)) : Promise.resolve(response(url, body)); } });
    const runtime = { setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {}, nowMs: () => 1, createAbortController() { const controller = new AbortController(); return { signal: controller.signal, abort() { controller.abort(); } }; }, parseUrl(value) { const url = new URL(value); return Object.fromEntries(["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"].map(key => [key, url[key]])); } };
    const config = { protocol, contextBridge: bridge, transport, runtime, streaming: options.streaming === true };
    if (options.debug !== undefined) config.debugContextEvidence = options.debug;
    const controller = (options.controllerModule || require("../../client/js/vela/velaProviderController")).createProviderController(config);
    return { protocol, runtime, transport, controller, bridge, hostCalls, bodies, timers, pendingHost, streamReads, fetchGate, options, send(message = options.message || "hello") { return controller.send({ message, endpoint: "http://127.0.0.1:1234", model: options.model || "m" }); } };
}
module.exports = { create, cases, deferred, flush };
