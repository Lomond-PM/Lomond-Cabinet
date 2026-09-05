"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const adapterModule = require("../client/js/vela/velaProviderAdapter");
const policy = require("../client/js/vela/velaProviderRequestBranchPolicy");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function makeProtocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v).digest("hex"), randomId: () => "req_" + String(++id).padStart(32, "a"), now: () => 1 }); }
function requestId(request) { return /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(request.body.messages[1].content).turnResponseContract)[1]; }
function terminalContent(protocol, request, text) { return text; }
function frames(content) { return "data: " + JSON.stringify({ choices: [{ delta: { reasoning_content: "private", content: content }, finish_reason: null }] }) + "\n\ndata: [DONE]\n\n"; }
function snapshot() { return { status: 200, contentType: "text/event-stream", bodyText: "", redirected: false, finalUrl: "http://127.0.0.1:1234/v1/chat/completions" }; }
function scheduler() { let callback = null; let cleared = 0; return { setTimeout(fn) { callback = fn; return 1; }, clearTimeout() { cleared += 1; callback = null; }, fire() { const fn = callback; callback = null; if (fn) fn(); }, cleared: () => cleared }; }
function harness() {
    const protocol = makeProtocol(); const timer = scheduler(); const calls = []; let aborts = 0;
    const transport = { sendJson() { throw new Error("wrong path"); }, readStream(request) { const pending = deferred(); calls.push({ request, pending }); return pending.promise; } };
    const runtime = { setTimeout: timer.setTimeout, clearTimeout: timer.clearTimeout, createAbortController() { return { signal: {}, abort() { aborts += 1; } }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs() { return 1; } };
    const provider = adapterModule.createLocalOpenAICompatibleProvider({ protocol, transport, model: "model", requestProfile: policy.PROFILES.TEXT_ONLY, responseFormatMode: "json-schema", streaming: true, runtime });
    return { protocol, timer, calls, provider, aborts: () => aborts };
}
const input = { messages: [{ role: "user", content: "x" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } };
async function complete(call, protocol, text) { call.request.onChunk(frames(terminalContent(protocol, call.request, text))); call.pending.resolve(snapshot()); await Promise.resolve(); await Promise.resolve(); }
async function started(provider) { const handle = provider.start(input); await Promise.resolve(); await Promise.resolve(); return handle; }
(async function () {
    const beforeChunk = harness(); const beforeChunkHandle = await started(beforeChunk.provider); const beforeChunkCall = beforeChunk.calls[0];
    check(beforeChunk.provider.cancel(beforeChunkHandle.requestId) === true && (await beforeChunkHandle.promise).envelope.error.code === "PROVIDER_REQUEST_ABORTED", "Cancel before first chunk uses stable cancellation semantics");
    beforeChunkCall.request.onChunk(frames(terminalContent(beforeChunk.protocol, beforeChunkCall.request, "ignored"))); beforeChunkCall.pending.resolve(snapshot());
    check(beforeChunk.provider.getState().state === "cancelled", "Late DONE after pre-chunk cancellation cannot replace terminal state");

    const cancelled = harness();
    const first = await started(cancelled.provider); const firstCall = cancelled.calls[0];
    firstCall.request.onChunk("data: " + JSON.stringify({ choices: [{ delta: { content: "partial", reasoning_content: "secret" }, finish_reason: null }] }) + "\n\n");
    check(cancelled.provider.cancel(first.requestId) === true, "Cancel settles an active streaming request");
    const cancelledResult = await first.promise;
    check(cancelledResult.envelope.error.code === "PROVIDER_REQUEST_ABORTED" && cancelled.aborts() === 1 && cancelled.provider.getState().state === "cancelled", "Cancel preserves stable terminal semantics and aborts transport");
    const second = await started(cancelled.provider); const secondCall = cancelled.calls[1];
    firstCall.request.onChunk(frames(terminalContent(cancelled.protocol, firstCall.request, "late"))); firstCall.pending.resolve(snapshot());
    await complete(secondCall, cancelled.protocol, "next");
    const secondResult = await second.promise;
    check(secondResult.envelope.text === "next" && cancelled.provider.getState().state === "completed", "Cancelled stream late chunks/completion cannot pollute the next request");

    const timed = harness(); const timeoutHandle = await started(timed.provider); const timeoutCall = timed.calls[0];
    timeoutCall.request.onChunk("data: " + JSON.stringify({ choices: [{ delta: { content: "partial" }, finish_reason: null }] }) + "\n\n");
    timed.timer.fire(); const timeoutResult = await timeoutHandle.promise;
    check(timeoutResult.envelope.error.code === "PROVIDER_TIMEOUT" && timed.aborts() === 1 && timed.provider.getState().state === "timed-out", "Whole-request timeout remains active during streaming read");
    timeoutCall.request.onChunk(frames(terminalContent(timed.protocol, timeoutCall.request, "late"))); timeoutCall.pending.resolve(snapshot());
    const afterTimeout = await started(timed.provider); const afterTimeoutCall = timed.calls[1]; await complete(afterTimeoutCall, timed.protocol, "recovered");
    check((await afterTimeout.promise).envelope.text === "recovered", "Timed-out stream late completion cannot prevent restart");

    const timeoutBefore = harness(); const timeoutBeforeHandle = await started(timeoutBefore.provider); const timeoutBeforeCall = timeoutBefore.calls[0]; timeoutBefore.timer.fire();
    check((await timeoutBeforeHandle.promise).envelope.error.code === "PROVIDER_TIMEOUT", "Timeout before first chunk uses the whole-request timeout contract");
    timeoutBeforeCall.request.onChunk(frames(terminalContent(timeoutBefore.protocol, timeoutBeforeCall.request, "ignored"))); timeoutBeforeCall.pending.resolve(snapshot());
    check(timeoutBefore.provider.getState().state === "timed-out", "Late completion after pre-chunk timeout cannot replace terminal state");

    const failed = harness(); const failureHandle = await started(failed.provider); const failureCall = failed.calls[0]; try { failureCall.request.onChunk("data: {bad}\n\n"); failureCall.pending.resolve(snapshot()); } catch (streamError) { failureCall.pending.reject(new failed.protocol.VelaProtocolError(failed.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID)); }
    const failureResult = await failureHandle.promise;
    check(failureResult.envelope.error.code === "PROVIDER_RESPONSE_INVALID" && failed.provider.getDiagnostics().terminalFailureBoundary === "transport-read", "Malformed partial stream fails before terminal parser admission");
    const recovered = await started(failed.provider); const recoveredCall = failed.calls[1]; await complete(recoveredCall, failed.protocol, "ok");
    check((await recovered.promise).envelope.text === "ok", "Failed stream releases activeRequest for the next request");

    const truncated = harness(); const truncatedHandle = await started(truncated.provider); const truncatedCall = truncated.calls[0]; truncatedCall.request.onChunk("data: " + JSON.stringify({ choices: [{ delta: { content: "partial" }, finish_reason: null }] }) + "\n\n"); truncatedCall.pending.resolve(snapshot());
    check((await truncatedHandle.promise).envelope.error.code === "PROVIDER_RESPONSE_INVALID", "EOF without DONE cannot produce success");
    check(cancelled.provider.cancel(first.requestId) === false, "Settled request cannot double-settle");
    check(cancelled.timer.cleared() >= 2 && timed.timer.cleared() >= 1, "Terminal paths clear whole-request timers");
    console.log("PASS Vela provider stream lifecycle: " + assertions + " assertions.");
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
