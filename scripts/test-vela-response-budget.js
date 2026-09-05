"use strict";
const assert = require("assert"), crypto = require("crypto");
const pm = require("../client/js/vela/velaProtocol");
const am = require("../client/js/vela/velaProviderAdapter");
const tm = require("../client/js/vela/velaLocalTransport");
const lp = require("../client/js/vela/velaLogicalPlanContracts");
const OLD = 256 * 1024, LIMIT = am.RESOURCE_POLICY.maxStreamResponseBytes;
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions++; }
const frame = (delta, finish = null) => "data: " + JSON.stringify({ id: "metadata".repeat(32), choices: [{ delta, finish_reason: finish }] }) + "\n\n";
const done = "data: [DONE]\n\n";
function harness(options = {}) {
    let serial = 0, timer, calls = 0, aborts = 0, reads = 0, cancels = 0, releasePending;
    const bodies = [], events = [], diagnostics = [];
    const p = pm.createProtocol({ utf8ByteLength: v => Buffer.byteLength(v), sha256Hex: v => crypto.createHash("sha256").update(v).digest("hex"), randomId: () => "req_" + String(++serial).padStart(32, "a"), now: () => 1 });
    p.attachLogicalPlanContracts(lp);
    const transport = tm.createLocalTransport({ protocol: p, TextDecoder, fetch: async (url, input) => {
        const body = JSON.parse(input.body); bodies.push(body); calls++;
        const raw = options.raw(body, calls); let offset = 0;
        const bytes = Buffer.from(raw);
        return { status: 200, redirected: false, url, headers: { get: () => options.streaming === false ? "application/json" : "text/event-stream" }, body: { getReader() { return {
            read() {
                reads++;
                if (options.defer && calls === 1 && reads === 2) return new Promise(resolve => { releasePending = resolve; });
                if (offset >= bytes.length) { if (options.postDoneError) return Promise.reject(Error("late reader error")); return Promise.resolve({ done: true }); }
                const value = bytes.subarray(offset, offset + (options.chunkSize || 4096)); offset += value.length;
                return Promise.resolve({ done: false, value });
            }, cancel() { cancels++; }, releaseLock() {}
        }; } } };
    } });
    const runtime = { setTimeout(fn) { timer = fn; return 1; }, clearTimeout() {}, nowMs() { return 1; }, createAbortController() { return { signal: {}, abort() { aborts++; } }; }, parseUrl(v) { const u = new URL(v); return Object.fromEntries(["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"].map(k => [k, u[k]])); } };
    const provider = am.createLocalOpenAICompatibleProvider({ protocol: p, transport, runtime, model: options.model || "qwen3.5-4b", requestProfile: options.profile || "text-only", streaming: options.streaming !== false, debugTerminalDiagnostics: true, onStreamEvent: e => events.push(e) });
    function start() { return provider.start({ messages: [{ role: "user", content: "Explain keyframes" }], context: { contextId: "f6", fingerprint: "sha256:" + "a".repeat(64), tier: 0 } }); }
    return { p, provider, transport, start, bodies, events, fire() { timer(); }, release() { releasePending({ done: false, value: Buffer.alloc(LIMIT + 1, 65) }); }, ready: () => !!releasePending, aborts: () => aborts, reads: () => reads, cancels: () => cancels };
}
function contentFor(body, type) {
    if (type === "text") return "Completed assistant answer.";
    const props = body.response_format.json_schema.schema.properties;
    return JSON.stringify({ protocol: props.protocol.enum[0], schemaVersion: props.schemaVersion.enum[0], requestId: props.requestId.enum[0], provider: props.provider.enum[0], model: body.model, envelope: type === "localProposal" ? { type, proposal: { capabilityId: "set-opacity-v1", params: { opacity: 47 } } } : { type, steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 47 } }, { capabilityId: "set-layer-name-v1", params: { name: "Hero" } }] } });
}
(async () => {
    check(LIMIT === 4 * 1024 * 1024 && Object.isFrozen(am.RESOURCE_POLICY), "Finite calibrated stream ceiling");
    check(pm.HARD_LIMITS.maxResponseJsonBytes === OLD && pm.HARD_LIMITS.maxMessageBytes === 16 * 1024, "Canonical and final text limits are unchanged");
    const policy = am.getGenerationPolicy("qwen3.5-4b", "text-only");
    check(Object.isFrozen(policy) && policy.thinkingBudgetTokens === 6144 && policy.maxOutputTokens === 8192, "Qwen gets separate reasoning and total generation capacity");
    check(am.getGenerationPolicy("non-reasoning-model") === null, "Unknown/non-reasoning models get no Qwen options");
    const mediumReasoning = frame({ reasoning_content: "r" }).repeat(1200);
    const h = harness({ raw: () => mediumReasoning + frame({ content: "final answer" }, "stop") + done });
    check(Buffer.byteLength(mediumReasoning) > OLD, "Ordinary token-framed reasoning exceeds the old terminal JSON budget");
    const result = await h.start().promise;
    check(result.envelope.text === "final answer", "Reasoning plus final answer succeeds above the old ceiling");
    check(h.bodies[0].thinking_budget_tokens === 6144 && h.bodies[0].max_tokens === 8192 && !Object.hasOwn(h.bodies[0], "reasoning_effort"), "Production preserves operator on/off while reserving total token capacity");
    const d = h.provider.getDiagnostics().terminalDebugEvidence.transportDiagnostics;
    check(d.bytesRead === Buffer.byteLength(mediumReasoning + frame({ content: "final answer" }, "stop") + done), "Accounting includes all UTF-8 payload, reasoning, metadata, framing and DONE bytes");
    const oldCheck = harness({ raw: () => mediumReasoning + done });
    await assert.rejects(oldCheck.transport.readStream({ url: "http://127.0.0.1:1234/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json" }, body: { stream: true }, signal: {}, allowRedirects: false, maxRequestBytes: 1024, maxResponseBytes: OLD, onChunk() {} }), e => e.code === "PROVIDER_RESPONSE_TOO_LARGE"); assertions++;
    const end = frame({ content: "boundary" }, "stop") + done;
    for (const extra of [0, 1]) {
        const raw = ":" + "x".repeat(LIMIT - Buffer.byteLength(end) - 3 + extra) + "\n\n" + end;
        const boundary = harness({ raw: () => raw });
        const r = await boundary.start().promise;
        check(extra ? r.envelope.error.code === "PROVIDER_RESPONSE_TOO_LARGE" : r.envelope.text === "boundary", "Exact ceiling succeeds; ceiling plus one fails including comment/framing bytes");
    }
    for (const [profile, type] of [["text-only", "text"], ["explicit-edit-eligible", "localProposal"], ["bounded-logical-plan-eligible", "logicalPlanProposal"]]) {
        const valid = harness({ profile, raw: body => mediumReasoning + frame({ content: contentFor(body, type) }, "stop") + done });
        check((await valid.start().promise).envelope.type === type, "Calibrated reasoning workload succeeds: " + type);
        check(valid.bodies[0].thinking_budget_tokens === (type === "text" ? 6144 : 2048) && valid.bodies[0].max_tokens === (type === "text" ? 8192 : 4096), "Profile-specific model budgets preserve final headroom");
        const overflow = harness({ profile, raw: (body, call) => call === 1 ? frame({ content: contentFor(body, type).slice(0, 5) }) + frame({ reasoning_content: "runaway" }).repeat(14000) + done : frame({ content: contentFor(body, type) }, "stop") + done });
        const r = await overflow.start().promise;
        check(r.envelope.type === "error" && r.envelope.error.code === "PROVIDER_RESPONSE_TOO_LARGE", "Partial " + type + " never becomes authoritative success on overflow");
        check(overflow.events.some(e => e.type === "text-delta") && !overflow.events.some(e => e.type === "stream-completed"), "Partial presentation does not imply committed success");
        check((await overflow.start().promise).envelope.type === type, "Next request recovers after overflow: " + type);
        const malformed = harness({ profile, raw: () => frame({ content: "broken structured candidate" }, "stop") + done });
        if (type !== "text") check((await malformed.start().promise).envelope.type === "error", "Structured malformed output never falls back");
    }
    for (const kind of ["cancel", "timeout"]) {
        const pending = harness({ defer: true, chunkSize: 1024, raw: () => frame({ content: "partial" }) + ":" + "x".repeat(5000) + "\n\n" });
        const handle = pending.start();
        for (let i = 0; i < 50 && !pending.ready(); i++) await Promise.resolve();
        check(pending.ready(), "Transport is waiting after partial text");
        if (kind === "cancel") pending.provider.cancel(handle.requestId); else pending.fire();
        const r = await handle.promise; pending.release(); await new Promise(resolve => setImmediate(resolve));
        check(r.envelope.error.code === (kind === "cancel" ? "PROVIDER_REQUEST_ABORTED" : "PROVIDER_TIMEOUT") && pending.aborts() === 1, "Late oversized chunk cannot replace prior " + kind);
        check(pending.provider.getState().state === (kind === "cancel" ? "cancelled" : "timed-out"), "Late callback preserves terminal state");
    }
    const early = harness({ postDoneError: true, raw: () => frame({ content: "你好" }, "stop") + done });
    check((await early.start().promise).envelope.text === "你好" && early.reads() === 1 && early.cancels() === 1, "Post-DONE early stop ignores later reader failure");
    const generic = harness({ model: "non-reasoning-model", raw: () => frame({ content: "answer" }, "stop") + done });
    check((await generic.start().promise).envelope.text === "answer" && !Object.hasOwn(generic.bodies[0], "thinking_budget_tokens") && !Object.hasOwn(generic.bodies[0], "max_tokens"), "Non-reasoning provider compatibility");
    for (const streaming of [false, true]) {
        const cut = harness({ streaming, raw: () => streaming ? frame({ content: "partial answer" }, "length") + done : JSON.stringify({ choices: [{ message: { role: "assistant", content: "partial answer" }, finish_reason: "length" }] }) });
        check((await cut.start().promise).envelope.type === "error", "Model total-token exhaustion never commits partial prose, streaming=" + streaming);
    }
    console.log("PASS Vela response budget: " + assertions + " assertions.");
})().catch(error => { console.error(error); process.exitCode = 1; });
