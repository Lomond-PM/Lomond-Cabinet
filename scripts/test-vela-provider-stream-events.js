"use strict";
var events = require("../client/js/vela/velaProviderStreamEvents");
var passed = 0;
function check(value, message) { if (!value) { throw new Error(message); } passed += 1; }
function rejects(fn, message) { var rejected = false; try { fn(); } catch (error) { rejected = true; } check(rejected, message); }
var identity = { requestId: "req_stream_1", generation: 1, providerId: "lmstudio", modelId: "model" };
[
    Object.assign({ type: "stream-started" }, identity),
    Object.assign({ type: "reasoning-delta", text: "thinking" }, identity),
    Object.assign({ type: "text-delta", text: "hello" }, identity),
    Object.assign({ type: "stream-completed" }, identity),
    Object.assign({ type: "stream-failed", errorCode: "PROVIDER_RESPONSE_INVALID", failureBoundary: "stream-read" }, identity),
    Object.assign({ type: "stream-cancelled" }, identity)
].forEach(function (input) {
    var result = events.canonicalize(input);
    check(Object.isFrozen(result), input.type + " is frozen");
    check(result.type === input.type && result.requestId === identity.requestId && result.generation === 1, input.type + " has canonical identity");
});
check(events.canonicalize(Object.assign({ type: "stream-completed" }, identity)).text === undefined, "Completion has no text requirement");
check(events.canonicalize(Object.assign({ type: "stream-failed", errorCode: "X" }, identity)).failureBoundary === null, "Failure boundary is optional");
check(events.canonicalize(Object.assign({ type: "stream-cancelled" }, identity)).text === undefined, "Cancellation does not require text");
check(events.canonicalize(Object.assign({ type: "reasoning-delta", text: "r" }, identity)).text === "r" && events.canonicalize(Object.assign({ type: "text-delta", text: "t" }, identity)).text === "t", "Reasoning and text use distinct event types");
[
    {}, Object.assign({ type: "stream-started" }, identity, { requestId: "" }), Object.assign({ type: "stream-started" }, identity, { generation: 0 }), Object.assign({ type: "stream-started" }, identity, { generation: "1" }), Object.assign({ type: "text-delta" }, identity, { text: 1 }), Object.assign({ type: "text-delta", text: "" }, identity), Object.assign({ type: "unknown" }, identity), Object.assign({ type: "stream-completed", terminalResponse: {} }, identity), Object.assign({ type: "stream-completed", logicalPlan: {} }, identity), Object.assign({ type: "stream-completed", proposal: {} }, identity), Object.assign({ type: "stream-completed", capabilityIntent: {} }, identity), Object.assign({ type: "stream-completed", hostPayload: {} }, identity), Object.assign({ type: "text-delta", chunk: "x" }, identity)
].forEach(function (input, index) { rejects(function () { events.canonicalize(input); }, "Malformed/forbidden event rejected " + index); });
var source = Object.assign({ type: "text-delta", text: "x" }, identity);
var copy = events.canonicalize(source);
source.text = "changed";
check(copy.text === "x" && events.isCanonical(copy), "Canonicalization returns immutable canonical copy");
check(events.EVENT_TYPES.length === 6 && events.EVENT_TYPES.indexOf("structured-delta") === -1, "Vocabulary excludes structured-delta");
console.log("PASS Vela provider stream events: " + passed + " assertions.");
