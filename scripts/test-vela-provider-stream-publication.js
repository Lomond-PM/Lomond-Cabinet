"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const adapterModule = require("../client/js/vela/velaProviderAdapter");
const streamEvents = require("../client/js/vela/velaProviderStreamEvents");
const policy = require("../client/js/vela/velaProviderRequestBranchPolicy");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function makeProtocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: (value) => Buffer.byteLength(value, "utf8"), sha256Hex: (value) => crypto.createHash("sha256").update(value).digest("hex"), randomId: () => "req_" + String(++id).padStart(32, "a"), now: () => 1 }); }
function requestId(request) { return /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(request.body.messages[1].content).turnResponseContract)[1]; }
function terminalContent(protocol, request, text) { return text; }
function frame(delta) { return "data: " + JSON.stringify({ choices: [{ delta, finish_reason: null }] }) + "\n\n"; }
function done() { return "data: [DONE]\n\n"; }
function snapshot() { return { status: 200, contentType: "text/event-stream", bodyText: "", redirected: false, finalUrl: "http://127.0.0.1:1234/v1/chat/completions" }; }
function scheduler() { let callback = null; return { setTimeout(fn) { callback = fn; return 1; }, clearTimeout() { callback = null; }, fire() { const fn = callback; callback = null; if (fn) fn(); } }; }
function harness(options) {
    options = options || {};
    const protocol = makeProtocol(); const timer = scheduler(); const calls = []; const events = [];
    const transport = {
        sendJson(request) { const pending = deferred(); calls.push({ request, pending, mode: "json" }); return pending.promise; },
        readStream(request) { const pending = deferred(); calls.push({ request, pending, mode: "stream" }); return pending.promise; }
    };
    const runtime = { setTimeout: timer.setTimeout, clearTimeout: timer.clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const url = new URL(value); return { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, username: url.username, password: url.password, search: url.search, hash: url.hash, href: url.href }; }, nowMs() { return 1; } };
    const providerOptions = { protocol, transport, model: "model", requestProfile: options.profile || policy.PROFILES.TEXT_ONLY, responseFormatMode: "json-schema", streaming: options.streaming === true, debugTerminalDiagnostics: options.debugTerminalDiagnostics === true, runtime };
    if (options.listener !== false) { providerOptions.onStreamEvent = function (event) { events.push(event); if (options.throwListener) { throw new Error("listener failure"); } }; }
    const provider = adapterModule.createLocalOpenAICompatibleProvider(providerOptions);
    return { protocol, timer, calls, events, provider };
}
const input = { messages: [{ role: "user", content: "x" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } };
async function start(harnessValue) { const handle = harnessValue.provider.start(input); await Promise.resolve(); await Promise.resolve(); return handle; }
function assertCanonical(events) { events.forEach((event) => { check(Object.isFrozen(event) && streamEvents.isCanonical(event), "Published stream events are frozen A1 canonical values"); check(!/terminalResponse|structuredResponse|logicalPlan|proposal|capabilityIntent|hostPayload|structured-delta/.test(JSON.stringify(event)), "Published stream events contain no structured control data"); }); }
(async function () {
    const successful = harness({ streaming: true }); const successHandle = await start(successful); const successCall = successful.calls[0];
    successCall.request.onChunk(frame({ reasoning_content: "think" }));
    successCall.request.onChunk(frame({ content: terminalContent(successful.protocol, successCall.request, "visible") }) + done());
    successCall.pending.resolve(snapshot()); const successResult = await successHandle.promise;
    check(successResult.envelope.text === "visible", "Event publication preserves the authoritative terminal Promise response");
    check(successful.events.map((event) => event.type).join(",") === "stream-started,reasoning-delta,text-delta,stream-completed", "Successful stream events preserve lifecycle and channel order");
    check(successful.events[1].text === "think" && successful.events[2].text.includes("visible"), "Reasoning and assistant text remain distinct presentation channels");
    check(successful.events.every((event) => event.requestId === successHandle.requestId && event.generation === 1 && event.providerId === "lmstudio" && event.modelId === "model"), "All events carry Provider-owned request identity only");
    assertCanonical(successful.events);

    const throwing = harness({ streaming: true, throwListener: true }); const throwingHandle = await start(throwing); const throwingCall = throwing.calls[0];
    throwingCall.request.onChunk(frame({ content: terminalContent(throwing.protocol, throwingCall.request, "safe") }) + done()); throwingCall.pending.resolve(snapshot());
    check((await throwingHandle.promise).envelope.text === "safe" && throwing.events.at(-1).type === "stream-completed", "Listener exceptions cannot alter terminal completion");

    const cancelled = harness({ streaming: true }); const cancelHandle = await start(cancelled); const cancelCall = cancelled.calls[0];
    cancelCall.request.onChunk(frame({ content: "partial" })); check(cancelled.provider.cancel(cancelHandle.requestId) === true, "Streaming request can be cancelled"); await cancelHandle.promise;
    cancelCall.request.onChunk(frame({ content: "late" }) + done()); cancelCall.pending.resolve(snapshot()); await Promise.resolve(); await Promise.resolve();
    check(cancelled.events.map((event) => event.type).join(",") === "stream-started,text-delta,stream-cancelled", "Cancellation publishes one terminal event and suppresses late deltas/completion");

    const timed = harness({ streaming: true }); const timedHandle = await start(timed); const timedCall = timed.calls[0]; timed.timer.fire(); await timedHandle.promise;
    timedCall.request.onChunk(frame({ content: "late" }) + done()); timedCall.pending.resolve(snapshot()); await Promise.resolve(); await Promise.resolve();
    check(timed.events.map((event) => event.type).join(",") === "stream-started,stream-failed" && timed.events[1].errorCode === timed.protocol.ERROR_CODES.PROVIDER_TIMEOUT, "Timeout publishes one stable failure and suppresses late activity");

    const malformed = harness({ streaming: true }); const malformedHandle = await start(malformed); const malformedCall = malformed.calls[0];
    try { malformedCall.request.onChunk("data: {bad}\n\n"); } catch (error) { malformedCall.pending.reject(new malformed.protocol.VelaProtocolError(malformed.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID)); }
    await malformedHandle.promise;
    check(malformed.events.map((event) => event.type).join(",") === "stream-started,stream-failed" && malformed.events[1].failureBoundary === "transport-read", "Malformed streams publish one bounded failure without raw transport data");

    const parserRejected = harness({ streaming: true, profile: policy.PROFILES.EXPLICIT_EDIT_ELIGIBLE }); const parserHandle = await start(parserRejected); const parserCall = parserRejected.calls[0];
    parserCall.request.onChunk(frame({ content: "complete but not a structured terminal response" }) + done()); parserCall.pending.resolve(snapshot());
    const parserResult = await parserHandle.promise;
    check(parserResult.envelope.type === "error" && parserRejected.events.map((event) => event.type).join(",") === "stream-started,text-delta,stream-completed", "Presentation completion remains independent from later authoritative parser rejection");

    const diagnostic = harness({ streaming: true, debugTerminalDiagnostics: true, profile: policy.PROFILES.EXPLICIT_EDIT_ELIGIBLE }); const diagnosticHandle = await start(diagnostic); const diagnosticCall = diagnostic.calls[0];
    diagnosticCall.request.onChunk(frame({ reasoning_content: "trace" }) + frame({ content: "not a terminal envelope" }) + done()); diagnosticCall.pending.resolve(snapshot()); await diagnosticHandle.promise;
    const terminalEvidence = diagnostic.provider.getDiagnostics().terminalDebugEvidence;
    check(Object.isFrozen(terminalEvidence) && terminalEvidence.requestProfile === "explicit-edit-eligible" && terminalEvidence.responseSchemaPresent === true && terminalEvidence.transportMode === "stream" && terminalEvidence.streamDone === true && terminalEvidence.assembledReasoningChars === 5 && terminalEvidence.assembledTextChars === 23 && terminalEvidence.parserOutcome === "rejected" && terminalEvidence.expectedEnvelopeType === "localProposal", "Explicit debug diagnostics expose bounded terminal contract evidence");
    check(terminalEvidence.terminalContentPreview === "not a terminal envelope" && terminalEvidence.terminalContentTruncated === false && terminalEvidence.markdownFencePresent === false && !JSON.stringify(terminalEvidence).includes("trace"), "Debug diagnostics retain only the bounded rejected terminal content, never reasoning or transport chunks");

    const terminalOnly = harness({ streaming: false }); const terminalHandle = await start(terminalOnly); const terminalCall = terminalOnly.calls[0];
    terminalCall.pending.resolve({ status: 200, contentType: "application/json", bodyText: JSON.stringify({ id: "chat-local", object: "chat.completion", created: 1, model: "model", choices: [{ index: 0, message: { role: "assistant", content: terminalContent(terminalOnly.protocol, terminalCall.request, "legacy") }, finish_reason: "stop", logprobs: null }], usage: {} }), redirected: false, finalUrl: "http://127.0.0.1:1234/v1/chat/completions" });
    const terminalResult = await terminalHandle.promise;
    check(terminalOnly.events.length === 0 && terminalCall.mode === "json", "Default terminal-only behavior publishes no stream events and uses sendJson");
    check(terminalResult.envelope.text === "legacy", "Default terminal-only behavior preserves the existing terminal response");
    check(!Object.prototype.hasOwnProperty.call(terminalOnly.provider.getDiagnostics(), "terminalDebugEvidence"), "Terminal diagnostics retain their existing default shape unless explicit debug evidence is enabled");
    console.log("PASS Vela provider stream publication: " + assertions + " assertions.");
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
