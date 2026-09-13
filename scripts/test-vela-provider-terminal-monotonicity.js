"use strict";
// Production LocalTransport -> Adapter -> Runtime -> Driver/Session; controlled fetch byte stream only.
const assert = require("assert");
const { create } = require("./fixtures/vela-trajectory-harness");
let assertions = 0;
function eq(a, b, label) { assert.deepStrictEqual(a, b, label); assertions++; }
function frame(delta, reason = null) { return "data: " + JSON.stringify({ choices: [{ delta, finish_reason: reason }] }) + "\n\n"; }
async function example(kind) {
    let reads = 0, cancellations = 0, releases = 0;
    const h = await create({ fetch: async (url, input) => {
        const body = JSON.parse(input.body), properties = body.response_format.json_schema.schema.properties;
        const content = JSON.stringify({ protocol: properties.protocol.enum[0], schemaVersion: properties.schemaVersion.enum[0], requestId: properties.requestId.enum[0], provider: "lmstudio", model: body.model, envelope: { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 60 } } } });
        let chunks = [frame({ content }, kind === "length" || kind === "conflict" ? "length" : "stop")];
        if (kind === "conflict") chunks.push(frame({}, "stop"));
        if (["content", "reasoning_content", "structured_content"].includes(kind)) chunks.push(frame({ [kind]: "late" }));
        if (kind === "tail") chunks.push(frame({ content: "", reasoning_content: "", role: "assistant" }) + ": heartbeat\n\nevent: metadata\n\n" + frame({}, "stop"));
        if (kind === "error") chunks.push('data: {"error":{"message":"failure"}}\n\n');
        if (kind !== "truncated") chunks.push("data: [DONE]\n\n");
        return { status: 200, redirected: false, url, headers: { get: () => "text/event-stream" }, body: { getReader() { return {
            read() { reads++; if (chunks.length) return Promise.resolve({ done: false, value: new TextEncoder().encode(chunks.shift()) }); return kind === "open-socket" ? new Promise(() => {}) : Promise.resolve({ done: true }); },
            cancel() { cancellations++; }, releaseLock() { releases++; }
        }; } } };
    } });
    const events = [], subscription = h.runtime.subscribePresentationEvents(event => events.push(event.providerEvent));
    let timer;
    try {
        await Promise.race([h.start(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("DONE waited for socket EOF")), 1500); })]);
        const state = h.owner.getAgentDriver().getSnapshot();
        const success = ["normal", "tail", "open-socket"].includes(kind);
        eq(state.state, success ? "awaiting-review" : "terminal", kind + " downstream state");
        eq(!!state.suspendedReview, success, kind + " only valid output reaches Review admission");
        if (!success) { eq(state.terminal.outcome, "blocked", "abnormal output cannot complete"); eq(state.counters.actions, 0, "abnormal stream cannot become a capability intent"); }
        eq(h.state.mutations, 0, "no automatic mutation");
        const terminals = events.filter(e => ["stream-completed", "stream-failed", "stream-cancelled"].includes(e.type));
        eq(terminals.map(e => e.type), [success ? "stream-completed" : "stream-failed"], kind + " terminal published once after validation");
        if (!success) eq(terminals[0].errorCode, "PROVIDER_RESPONSE_INVALID", "stable error classification");
        if (kind === "open-socket") { eq(reads, 2, "DONE prevents another socket read"); eq(cancellations, 1, "reader cancelled at protocol completion"); }
        // An aborted read may finish releasing its lock on a subsequent microtask.
        for (let i = 0; i < 20; i++) await Promise.resolve();
        eq(releases, 1, kind + " reader released");
    } finally { clearTimeout(timer); subscription.unsubscribe(); h.dispose(); }
}
(async () => {
    for (const kind of ["normal", "tail", "open-socket", "length", "conflict", "content", "reasoning_content", "structured_content", "truncated", "error"]) await example(kind);
    console.log("PASS Provider terminal monotonicity: " + assertions + " assertions.");
})().catch(e => { console.error(e); process.exitCode = 1; });
