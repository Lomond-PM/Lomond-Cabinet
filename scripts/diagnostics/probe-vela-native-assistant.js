"use strict";
// Explicit local acceptance probe. This is not a formal qualification run or a Host call.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const protocolModule = require("../../client/js/vela/velaProtocol");
const adapterModule = require("../../client/js/vela/velaProviderAdapter");
const transportModule = require("../../client/js/vela/velaLocalTransport");
const logicalPlans = require("../../client/js/vela/velaLogicalPlanContracts");
const output = path.resolve(__dirname, "../../.tmp/vela-f5");
if (!process.argv.includes("--run")) {
    console.error("Use --run to send four local qwen3.5-4b acceptance probes.");
    process.exit(2);
}
fs.mkdirSync(output, { recursive: true });
const runtime = {
    setTimeout, clearTimeout, nowMs: Date.now,
    createAbortController() {
        const controller = new AbortController();
        return { signal: controller.signal, abort() { controller.abort(); } };
    },
    parseUrl(value) {
        const url = new URL(value);
        return Object.fromEntries(["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"].map(key => [key, url[key]]));
    }
};
const cases = [
    ["enabled", "text-only", true, "你好。"],
    ["disabled", "text-only", false, "你好。"],
    ["proposal", "explicit-edit-eligible", false, "Set layer opacity to 47%"],
    ["logical", "bounded-logical-plan-eligible", false, "Set layer opacity to 47% then rename it to Hero"]
];
async function probe([name, profile, thinking, message]) {
    const protocol = protocolModule.createProtocol({
        utf8ByteLength: value => Buffer.byteLength(value),
        sha256Hex: value => crypto.createHash("sha256").update(value).digest("hex"),
        randomId: () => "req_" + crypto.randomBytes(16).toString("hex"),
        now: Date.now
    });
    if (profile === "bounded-logical-plan-eligible") protocol.attachLogicalPlanContracts(logicalPlans);
    const evidence = { name, profile, thinking, events: [], raw: "" };
    const transport = transportModule.createLocalTransport({
        protocol, TextDecoder,
        async fetch(url, options) {
            const body = JSON.parse(options.body);
            evidence.adapterRequest = JSON.parse(JSON.stringify(body));
            // Probe-only inference override. Production does not control model reasoning mode.
            body.reasoning_effort = thinking ? "high" : "none";
            evidence.probeOverride = { reasoning_effort: body.reasoning_effort };
            const response = await fetch(url, { ...options, body: JSON.stringify(body) });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            return {
                status: response.status, redirected: response.redirected,
                url: response.url, headers: response.headers,
                body: { getReader() { return {
                    async read() {
                        const part = await reader.read();
                        if (part.value) evidence.raw += decoder.decode(part.value, { stream: true });
                        if (part.done) evidence.raw += decoder.decode();
                        return part;
                    },
                    cancel() { return reader.cancel(); },
                    releaseLock() { reader.releaseLock(); }
                }; } }
            };
        }
    });
    const adapter = adapterModule.createLocalOpenAICompatibleProvider({
        protocol, transport, runtime, model: "qwen3.5-4b", requestProfile: profile,
        streaming: true, timeoutMs: 120000, debugTerminalDiagnostics: true,
        onStreamEvent: event => evidence.events.push(event)
    });
    evidence.result = await adapter.start({
        messages: [{ role: "user", content: message }],
        context: { contextId: "f5-probe", fingerprint: "sha256:" + "a".repeat(64), tier: 0 }
    }).promise;
    evidence.diagnostics = adapter.getDiagnostics();
    const serialized = JSON.stringify(evidence, null, 2);
    // Preserve every attempt; the short name is only a convenience pointer to the latest run.
    fs.writeFileSync(path.join(output, "probe-" + name + "-" + Date.now() + ".json"), serialized);
    fs.writeFileSync(path.join(output, "probe-" + name + ".json"), serialized);
    console.log(name, JSON.stringify(evidence.result),
        "reasoningDeltas", evidence.events.filter(event => event.type === "reasoning-delta").length,
        "textDeltas", evidence.events.filter(event => event.type === "text-delta").length);
    return evidence.result.envelope.type !== "error";
}
(async () => {
    let passed = true;
    for (const entry of cases) passed = await probe(entry) && passed;
    if (!passed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
