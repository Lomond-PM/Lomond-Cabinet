"use strict";
var assembler = require("../client/js/vela/velaProviderStreamAssembler");
var passed = 0;
function check(value, message) { if (!value) { throw new Error(message); } passed += 1; }
function rejects(fn, message) { var rejected = false; try { fn(); } catch (error) { rejected = true; } check(rejected, message); }
function frame(value) { return "data: " + JSON.stringify({ choices: [{ delta: value, finish_reason: null }] }) + "\n\n"; }
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
console.log("PASS Vela provider stream assembler: " + passed + " assertions.");
