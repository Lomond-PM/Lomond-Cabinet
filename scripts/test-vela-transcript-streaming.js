"use strict";
const assert = require("assert");
const View = require("../client/js/vela/velaTranscriptView").VelaTranscriptView;
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function Node(tag, documentRef) { this.ownerDocument = documentRef; this.tagName = tag; this.children = []; this.parentNode = null; this.className = ""; this.textContent = ""; this.style = {}; this.attributes = {}; this.listeners = {}; }
Node.prototype.appendChild = function (node) { if (node.parentNode) { node.parentNode.removeChild(node); } node.parentNode = this; this.children.push(node); return node; };
Node.prototype.removeChild = function (node) { const index = this.children.indexOf(node); if (index >= 0) { this.children.splice(index, 1); node.parentNode = null; } return node; };
Node.prototype.insertBefore = function (node, before) { const index = before ? this.children.indexOf(before) : -1; if (node.parentNode) { node.parentNode.removeChild(node); } node.parentNode = this; if (index < 0) { this.children.push(node); } else { this.children.splice(index, 0, node); } return node; };
Node.prototype.setAttribute = function (key, value) { this.attributes[key] = String(value); };
Node.prototype.addEventListener = function (key, handler) { this.listeners[key] = handler; };
function Document() {}
Document.prototype.createElement = function (tag) { return new Node(tag, this); };
function root(documentRef) { const node = new Node("div", documentRef); node.scrollHeight = 200; node.clientHeight = 200; node.scrollTop = 0; return node; }
function transient(id, state, reasoningText, text, reconciliation) { return { reasoningInvocationId: id, state, reasoningText: reasoningText || "", text: text || "", runtimeGeneration: 1, reconciliation: reconciliation || null }; }
const documentRef = new Document(); const rootNode = root(documentRef); const intro = new Node("p", documentRef); const view = View.create({ root: rootNode, intro, t: (key) => key });
view.render({ items: [{ kind: "user", text: "hello", displayTextKey: null }] }, { activeInvocationId: "reasoning_1", runtimeGeneration: 1, invocations: [transient("reasoning_1", "streaming", "thinking", "<b>Hello</b>")] });
const transientList = rootNode.children[1]; const segment = rootNode.children[0].children[1]; const firstTextNode = segment.children[1];
check(segment.className === "vela-transcript-transient-segment" && segment.children[0].className === "vela-transcript-transient-reasoning", "Transient segment has separate reasoning and assistant channels");
check(segment.children[0].children[1].textContent === "thinking" && firstTextNode.textContent === "<b>Hello</b>", "Reasoning and HTML-like assistant output render as plain text");
view.render({ items: [{ kind: "user", text: "hello", displayTextKey: null }] }, { activeInvocationId: "reasoning_1", runtimeGeneration: 1, invocations: [transient("reasoning_1", "streaming", "thinking more", "<b>Hello</b> world")] });
check(rootNode.children[0].children[1] === segment && segment.children[1] === firstTextNode, "Incremental delta reuses the same transient DOM segment and text node");
check(firstTextNode.textContent === "<b>Hello</b> world" && segment.children[0].children[1].textContent === "thinking more", "Incremental assistant and reasoning channels update independently");
view.render({ items: [{ kind: "user", text: "hello", displayTextKey: null }] }, { activeInvocationId: "reasoning_1", runtimeGeneration: 1, invocations: [transient("reasoning_1", "stream-completed", "thinking more", "<b>Hello</b> world", "closed")] });
check(!rootNode.children[0].children.includes(segment), "Reconciled transient segment is removed without touching committed items");
view.render({ items: [{ kind: "user", text: "hello", displayTextKey: null }, { kind: "assistant", text: "<b>Hello</b> world", displayTextKey: null }] }, { activeInvocationId: null, runtimeGeneration: 1, invocations: [] });
check(rootNode.children[0].children.length === 2 && rootNode.children[0].children[1].textContent === "<b>Hello</b> world", "Authoritative committed assistant message remains one safe transcript item");
view.render({ items: [] }, { activeInvocationId: "reasoning_1", runtimeGeneration: 1, invocations: [transient("reasoning_1", "streaming", "only reasoning", "")] });
check(transientList.children.length === 1 && transientList.children[0].children[1].style.display === "none", "Reasoning-only stream does not require an assistant text node");
view.render({ items: [] }, { activeInvocationId: "reasoning_2", runtimeGeneration: 1, invocations: [transient("reasoning_1", "stream-completed", "only reasoning", "", "closed"), transient("reasoning_2", "streaming", "", "second")] });
check(transientList.children.length === 1 && transientList.children[0].attributes["data-reasoning-invocation-id"] === "reasoning_2", "Multiple invocations use separate transient segments");
view.render({ items: [] }, { activeInvocationId: null, runtimeGeneration: 1, invocations: [] });
check(transientList.children.length === 0, "Completed/cancelled empty transient state leaves no permanent blank block");
console.log("PASS Vela TranscriptView streaming: " + assertions + " assertions.");
