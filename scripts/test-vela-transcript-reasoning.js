"use strict";
const assert = require("assert");
const View = require("../client/js/vela/velaTranscriptView").VelaTranscriptView;
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function Node(tag, documentRef) { this.ownerDocument = documentRef; this.tagName = tag; this.children = []; this.parentNode = null; this.className = ""; this.textContent = ""; this.style = {}; this.attributes = {}; this.listeners = {}; }
Node.prototype.appendChild = function (node) { node.parentNode = this; this.children.push(node); return node; };
Node.prototype.removeChild = function (node) { const index = this.children.indexOf(node); if (index >= 0) { this.children.splice(index, 1); node.parentNode = null; } return node; };
Node.prototype.setAttribute = function (key, value) { this.attributes[key] = String(value); };
Node.prototype.addEventListener = function (key, handler) { this.listeners[key] = handler; };
function Document() {}
Document.prototype.createElement = function (tag) { return new Node(tag, this); };
function root(documentRef) { const node = new Node("div", documentRef); node.scrollHeight = 200; node.clientHeight = 200; node.scrollTop = 0; return node; }
function entry(id, state, reasoningText, text, reconciliation) { return { reasoningInvocationId: id, state, reasoningText: reasoningText || "", text: text || "", runtimeGeneration: 1, reconciliation: reconciliation || null }; }
const documentRef = new Document(); const rootNode = root(documentRef); const intro = new Node("p", documentRef); const view = View.create({ root: rootNode, intro, t: (key) => key });
function render(invocations) { view.render({ items: [] }, { activeInvocationId: invocations[0] ? invocations[0].reasoningInvocationId : null, runtimeGeneration: 1, invocations }); }
render([entry("one", "streaming", "private thinking", "")]);
const list = rootNode.children[1]; const first = list.children[0]; const reasoning = first.children[0]; const toggle = reasoning.children[0]; const body = reasoning.children[1];
check(toggle.tagName === "button" && toggle.attributes.type === "button", "Reasoning is exposed through an accessible native toggle button");
check(toggle.attributes["aria-expanded"] === "true" && body.textContent === "private thinking", "Active reasoning is visible and expanded");
render([entry("one", "streaming", "private thinking", "assistant text")]);
check(toggle.attributes["aria-expanded"] === "false" && body.style.display === "none", "First assistant text transitions reasoning to compact presentation");
toggle.listeners.click();
check(toggle.attributes["aria-expanded"] === "true" && body.style.display === "", "Reasoning toggle expands without changing the text channel");
render([entry("one", "streaming", "more thinking", "assistant text")]);
check(body.textContent === "more thinking" && toggle.attributes["aria-expanded"] === "true", "User expansion is retained while later reasoning deltas arrive");
render([entry("one", "stream-completed", "more thinking", "assistant text")]);
check(toggle.attributes["aria-expanded"] === "false" && toggle.textContent === "vela.surfaceReasoningCompleted", "Completed reasoning settles compact once and uses neutral ended language");
render([entry("two", "streaming", "only thought", "")]);
check(list.children.length === 1 && list.children[0].children[0].children[1].textContent === "only thought", "A second invocation is independently rendered");
render([entry("text-only", "streaming", "", "text only")]);
check(list.children[0].children.length === 1 && list.children[0].children[0].textContent === "text only", "Text-only stream has no empty reasoning shell");
render([entry("three", "stream-failed", "failed thought", "")]);
check(list.children[0].children[0].children[0].textContent === "vela.surfaceReasoningFailed", "Failed stream remains neutral-ended and presentation-only");
render([entry("four", "stream-cancelled", "cancelled thought", "")]);
check(list.children[0].children[0].children[0].textContent === "vela.surfaceReasoningCancelled", "Cancelled stream remains neutral-ended and does not require text");
render([entry("five", "stream-completed", "", "")]);
check(list.children.length === 0, "Empty terminal stream does not leave a blank presentation block");
render([entry("six", "streaming", "<b>unsafe</b>", "<i>plain</i>")]);
check(list.children[0].children[0].children[1].textContent === "<b>unsafe</b>" && list.children[0].children[1].textContent === "<i>plain</i>", "Reasoning and assistant text remain textContent-only safe channels");
console.log("PASS Vela TranscriptView reasoning UX: " + assertions + " assertions.");
