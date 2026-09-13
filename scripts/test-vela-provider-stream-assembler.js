"use strict";
var assembler = require("../client/js/vela/velaProviderStreamAssembler");
var passed = 0;
function check(value, message) { if (!value) { throw new Error(message); } passed += 1; }
function rejects(fn, message) { var rejected = false; try { fn(); } catch (error) { rejected = true; } check(rejected, message); }
function frame(value, reason) { return "data: " + JSON.stringify({ choices: [{ delta: value, finish_reason: reason || null }] }) + "\n\n"; }
var stream = assembler.create();
stream.feed(frame({ content: "你" }).slice(0, 5));
stream.feed(frame({ content: "你" }).slice(5) + frame({ reasoning_content: "think" }) + frame({ content: "好" }) + "data: [DONE]\r\n\r\n");
var result = stream.finish();
check(result.text === "你好", "Text deltas assemble across chunks");
check(result.reasoning === "think" && result.structured === "", "Reasoning remains separate and structured remains private");
check(Object.isFrozen(result), "Assembler result is frozen");
var noText = assembler.create(); noText.feed(frame({ role: "assistant" }) + "data: [DONE]\n\n"); check(noText.finish().text === "", "Terminal without text is supported");
rejects(function () { assembler.create().feed("data: {bad}\n\n"); }, "Malformed JSON is rejected");
var truncated = assembler.create(); truncated.feed(frame({ content: "x" })); rejects(function () { truncated.finish(); }, "EOF before DONE is rejected");
var partial = assembler.create(); partial.feed("data: {}\n"); rejects(function () { partial.finish(); }, "Trailing partial frame is rejected");
var forbidden = assembler.create(); rejects(function () { forbidden.feed("event: x\ndata: {}\n\n"); }, "Invalid empty delta shape is rejected");
var afterDone = assembler.create(); afterDone.feed("data: [DONE]\n\n"); rejects(function () { afterDone.feed(frame({ content: "late" })); }, "Data after DONE is rejected");
var badReasoning = assembler.create(); rejects(function () { badReasoning.feed(frame({ reasoning_content: 1 })); }, "Non-string reasoning is rejected");
var badContent = assembler.create(); rejects(function () { badContent.feed(frame({ content: null })); }, "Non-string content is rejected");
var terminated = assembler.create(); terminated.feed(frame({ content: "complete" }, "stop") + frame({ role: "assistant", content: "", reasoning: "" }) + ": heartbeat\n\nevent: metadata\n\n" + frame({}, "stop") + "data: [DONE]\n\n");
check(terminated.finish().text === "complete" && terminated.getState().finishReasonObserved === "stop", "Empty deltas, repeated same reason and SSE metadata tails are allowed");
var conflict = assembler.create(); conflict.feed(frame({ content: "truncated" }, "length"));
rejects(function () { conflict.feed(frame({}, "stop")); }, "length cannot be overwritten by stop");
check(conflict.getState().finishReasonObserved === "length", "first reason retained even after failure");
rejects(function () { conflict.feed("data: [DONE]\n\n"); }, "failed assembler cannot recover via DONE");
rejects(function () { conflict.finish(); }, "failure is sticky through finish");
["content", "reasoning_content", "reasoning", "thinking", "structured_content"].forEach(function (key) {
    var deltas = [], s = assembler.create({ onDelta: function (type, value) { deltas.push(value); } });
    s.feed(frame({ content: "safe" }, "stop")); var extra = {}; extra[key] = "late";
    rejects(function () { s.feed(frame(extra)); }, "post-terminal " + key + " rejected");
    check(s.getState().text === "safe" && deltas.join() === "safe", "late content never published or assembled");
});
var mixed = assembler.create(); rejects(function () { mixed.feed(frame({ content: "must not publish", reasoning_content: 3 })); }, "mixed invalid frame rejected atomically");
check(mixed.getState().text === "", "no partial frame publication");
var errorFrame = assembler.create(); rejects(function () { errorFrame.feed('data: {"error":{"message":"bad"},"choices":[{"delta":{}}]}\n\n'); }, "error frame cannot produce success even with valid delta shape");
console.log("PASS Vela provider stream assembler: " + passed + " assertions.");
