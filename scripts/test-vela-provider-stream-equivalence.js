"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const adapterModule = require("../client/js/vela/velaProviderAdapter");
const transportModule = require("../client/js/vela/velaLocalTransport");
const policy = require("../client/js/vela/velaProviderRequestBranchPolicy");
const logicalPlans = require("../client/js/vela/velaLogicalPlanContracts");
const endpoint = "http://127.0.0.1:1234/v1/chat/completions";
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function protocol() { let serial = 0; return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v).digest("hex"), randomId: () => "req_" + String(++serial).padStart(32, "a"), now: () => 1 }); }
function runtime() { return { setTimeout() { return 1; }, clearTimeout() {}, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs() { return 1; } }; }
function requestId(body) { const match = /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(body.messages[1].content).turnResponseContract); return match[1]; }
function canonical(body, envelope) { return JSON.stringify({ protocol: "vela.model-response.v1", schemaVersion: "1.1", requestId: requestId(body), provider: "lmstudio", model: body.model, envelope }); }
function completeWrapper(content) { return JSON.stringify({ choices: [{ message: { role: "assistant", content, reasoning_content: "private" }, finish_reason: "stop" }] }); }
function streamBody(content) {
    const pieces = [content.slice(0, 3), content.slice(3, 11), content.slice(11)];
    return "data: " + JSON.stringify({ choices: [{ delta: { reasoning_content: "私" }, finish_reason: null }] }) + "\r\n\r\n" + pieces.map((piece) => "data: " + JSON.stringify({ choices: [{ delta: { content: piece }, finish_reason: null }] }) + "\n\n").join("") + "data: [DONE]\n\n";
}
function response(bytes, contentType) { let index = 0; const cuts = [1, 2, 5, 3, 11, 7, 13]; return { status: 200, redirected: false, url: endpoint, headers: { get: () => contentType }, body: { getReader() { return { read() { if (index >= bytes.length) return Promise.resolve({ done: true }); const size = cuts[index % cuts.length]; const value = bytes.slice(index, Math.min(bytes.length, index + size)); index += value.length; return Promise.resolve({ done: false, value }); }, releaseLock() {} }; } } }; }
async function runCase(profile, envelope) {
    const p = protocol();
    if (profile === policy.PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE) { p.attachLogicalPlanContracts(logicalPlans); }
    function make(streaming) {
        const transport = transportModule.createLocalTransport({ protocol: p, TextDecoder, fetch(url, options) { const body = JSON.parse(options.body); const content = profile === policy.PROFILES.TEXT_ONLY ? envelope.text : canonical(body, envelope); const raw = streaming ? streamBody(content) : completeWrapper(content); return Promise.resolve(response(new TextEncoder().encode(raw), streaming ? "text/event-stream" : "application/json")); } });
        return adapterModule.createLocalOpenAICompatibleProvider({ protocol: p, transport, model: "model", requestProfile: profile, responseFormatMode: "json-schema", streaming, runtime: runtime() });
    }
    const input = { messages: [{ role: "user", content: "中文" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } };
    const normal = await make(false).start(input).promise;
    const streamed = await make(true).start(input).promise;
    check(JSON.stringify(normal.envelope) === JSON.stringify(streamed.envelope), profile + " terminal envelopes are equivalent");
    check(streamed.envelope.type === envelope.type, profile + " streamed result uses existing parser");
    return streamed;
}
(async function () {
    const text = await runCase(policy.PROFILES.TEXT_ONLY, { type: "text", text: "你好" });
    check(text.envelope.text === "你好", "Unicode survives arbitrary byte chunking");
    const logical = await runCase(policy.PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE, { type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 42 } }, { capabilityId: "set-layer-name-v1", params: { name: "图层" } }] });
    check(logical.envelope.steps.length === 2, "Logical plan remains structured-only and validated");
    const proposal = await runCase(policy.PROFILES.EXPLICIT_EDIT_ELIGIBLE, { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 35 } } });
    check(proposal.envelope.proposal.params.opacity === 35, "Proposal remains structured-only and validated");
    console.log("PASS Vela provider stream equivalence: " + assertions + " assertions.");
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
