"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const adapterModule = require("../client/js/vela/velaProviderAdapter");
const transportModule = require("../client/js/vela/velaLocalTransport");
const logical = require("../client/js/vela/velaLogicalPlanContracts");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
const endpoint = "http://127.0.0.1:1234/v1/chat/completions";
const requestId = "req_" + "b".repeat(32);
async function run(options) {
    const p = protocolModule.createProtocol({ utf8ByteLength: value => Buffer.byteLength(value), sha256Hex: value => crypto.createHash("sha256").update(value).digest("hex"), randomId: () => requestId, now: () => 1 });
    p.attachLogicalPlanContracts(logical);
    const events = []; let body;
    const profile = options.profile || "text-only";
    const transport = transportModule.createLocalTransport({ protocol: p, TextDecoder, fetch: async (url, input) => {
        body = JSON.parse(input.body);
        let content = options.content;
        if (options.envelope) content = JSON.stringify({ protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId, provider: "lmstudio", model: "owned-model", envelope: options.envelope });
        const frame = delta => "data: " + JSON.stringify({ choices: [{ delta, finish_reason: null }] }) + "\n\n";
        let raw;
        if (options.streaming) {
            raw = (options.reasoning ? frame({ reasoning_content: "consider the user question" }) : "") +
                (typeof content === "string" ? frame({ content: content.slice(0, 2) }) + frame({ content: content.slice(2) }) : frame({ content })) +
                (options.noDone ? "" : "data: [DONE]\n\n");
        } else raw = JSON.stringify(options.wrapper || { model: "untrusted-wrapper-model", choices: [{ message: { role: "assistant", content, reasoning_content: options.reasoning ? "independent reasoning" : null }, finish_reason: "stop" }] });
        let sent = false;
        return { status: options.status || 200, redirected: false, url, headers: { get: () => options.streaming ? "text/event-stream" : "application/json" }, body: { getReader() { return { read() { if (sent) return Promise.resolve({ done: true }); sent = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(raw) }); }, cancel() {}, releaseLock() {} }; } } };
    } });
    const runtime = { setTimeout() { return 1; }, clearTimeout() {}, createAbortController() { return { signal: {}, abort() {} }; }, nowMs() { return 1; }, parseUrl(value) { const url = new URL(value); return Object.fromEntries(["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"].map(key => [key, url[key]])); } };
    const adapter = adapterModule.createLocalOpenAICompatibleProvider({ protocol: p, transport, runtime, requestProfile: profile, model: "owned-model", streaming: !!options.streaming, onStreamEvent: event => events.push(event) });
    const result = await adapter.start({ messages: [{ role: "user", content: "Explain keyframes" }], context: { contextId: "test", fingerprint: "sha256:" + "a".repeat(64), tier: 0 } }).promise;
    return { result, body, events };
}
(async () => {
    const text = "  关键帧描述状态。\nNext frame.  ";
    for (const streaming of [false, true]) for (const reasoning of [false, true]) {
        const value = await run({ content: text, streaming, reasoning });
        check(!Object.hasOwn(value.body, "response_format"), "Native request omits response_format");
        check(Object.keys(value.body).sort().join(",") === "messages,model,stream", "Native request uses minimal normal completion shape");
        check(!/schemaVersion|requestId|envelope|exactly one.*JSON|vela.model-response/.test(JSON.stringify(value.body.messages)), "Native prompts do not impose wire serialization");
        check(/Do not claim an edit|Do not create proposals/.test(JSON.stringify(value.body.messages)), "Product constraints remain present");
        check(value.result.envelope.type === "text" && value.result.envelope.text === text, "Adapter preserves prose bytes without terminal rewriting");
        check(value.result.requestId === requestId && value.result.provider === "lmstudio" && value.result.model === "owned-model" && value.result.protocol === "vela.model-response.v1" && value.result.schemaVersion === "1.1", "Canonical metadata is locally owned");
        check(Object.isFrozen(value.result) && Object.isFrozen(value.result.envelope), "Canonical text is deeply frozen");
        if (streaming) {
            check(value.events.filter(event => event.type === "text-delta").map(event => event.text).join("") === value.result.envelope.text, "Transient prose equals committed text without JSON jump");
            check(value.events.filter(event => event.type === "reasoning-delta").length === (reasoning ? 1 : 0), "Reasoning has its own optional channel");
            check(value.events.filter(event => event.type === "stream-completed").length === 1, "Exactly one stream completion");
        } else check(value.events.length === 0, "Non-stream fallback publishes no transient events");
    }
    const jsonProse = '{"requestId":"forged","envelope":{"type":"localProposal"}}';
    const inert = await run({ content: jsonProse, streaming: true });
    check(inert.result.envelope.text === jsonProse && inert.result.requestId === requestId, "JSON-looking prose cannot inject metadata or become an Agent candidate");
    for (const content of ["", "   ", null, 5, {}, []]) for (const streaming of [false, true]) {
        const failed = await run({ content, streaming });
        check(failed.result.envelope.type === "error", "Empty or invalid content fails in both transports: " + JSON.stringify(content));
    }
    for (const wrapper of [{ choices: [] }, { choices: [{ message: { role: "user", content: "x" } }] }, { choices: [{ message: { role: "assistant", content: "x", tool_calls: [{}] } }] }]) {
        check((await run({ wrapper })).result.envelope.type === "error", "Invalid OpenAI message shape fails");
    }
    check((await run({ content: "partial", streaming: true, noDone: true })).result.envelope.type === "error", "EOF before DONE fails");
    check((await run({ content: "x", status: 500 })).result.envelope.error.code === "PROVIDER_HTTP_ERROR", "HTTP errors remain errors");
    check((await run({ content: "a".repeat(1024 * 1024), streaming: true })).result.envelope.type === "error", "Streaming text remains size bounded");
    for (const profile of ["explicit-edit-eligible", "bounded-logical-plan-eligible"]) {
        for (const streaming of [false, true]) {
            const malformed = await run({ profile, content: "Natural language is not structured JSON", streaming, reasoning: true });
            check(malformed.body.response_format.type === "json_schema" && malformed.body.response_format.json_schema.strict, "Structured request retains strict schema");
            check(malformed.result.envelope.type === "error", "Malformed structured content cannot fall back to prose");
        }
        const decision = adapterModule.getOutputDecision(profile);
        check(decision.transportMode === "strict-structured" && decision.presentationMode === "structured", "Structured transport and presentation share one decision");
    }
    const native = adapterModule.getOutputDecision("text-only");
    check(Object.isFrozen(native) && Object.isFrozen(native.allowedOutputs) && native.allowedOutputs[0] === "assistant-text" && native.transportMode === "native-assistant" && native.presentationMode === "assistant-text", "Immutable native output capability decision");
    const union = adapterModule.getOutputDecision("proposal-capable-union");
    check(union.allowedOutputs.length === 2 && union.transportMode === "strict-structured", "Allowed outputs are not a permanently exclusive response category");
    console.log("PASS Vela native assistant output: " + assertions + " assertions.");
})().catch(error => { console.error(error); process.exitCode = 1; });
