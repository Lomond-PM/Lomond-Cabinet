"use strict";
const assert = require("assert");
const View = require("../client/js/vela/velaTranscriptView").VelaTranscriptView;
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function Node(tag, documentRef) { this.tagName = tag; this.ownerDocument = documentRef; this.children = []; this.parentNode = null; this.className = ""; this.textContent = ""; this.style = {}; this.attributes = {}; this.listeners = {}; }
Node.prototype.appendChild = function (node) { if (node.parentNode) { node.parentNode.removeChild(node); } node.parentNode = this; this.children.push(node); return node; };
Node.prototype.removeChild = function (node) { const index = this.children.indexOf(node); if (index >= 0) { this.children.splice(index, 1); node.parentNode = null; } return node; };
Node.prototype.insertBefore = function (node, before) { const index = before ? this.children.indexOf(before) : -1; if (node.parentNode) { node.parentNode.removeChild(node); } node.parentNode = this; if (index < 0) { this.children.push(node); } else { this.children.splice(index, 0, node); } return node; };
Node.prototype.setAttribute = function (key, value) { this.attributes[key] = String(value); };
Node.prototype.addEventListener = function (key, listener) { this.listeners[key] = listener; };
function Document() {}
Document.prototype.createElement = function (tag) { return new Node(tag, this); };
function entry(id, turn, state, reasoning, text) { return { reasoningInvocationId: id, presentationTurnId: turn, state, reasoningText: reasoning || "", text: text || "", reconciliation: state === "streaming" ? null : "presentation-terminal" }; }
const documentRef = new Document();
const root = new Node("div", documentRef); root.scrollHeight = 200; root.clientHeight = 200; root.scrollTop = 0;
const view = View.create({ root, intro: new Node("p", documentRef), t: (key) => key });
const items = [
    { kind: "user", text: "first", presentationTurnId: "turn_a" },
    { kind: "assistant", text: "first terminal", presentationTurnId: "turn_a" },
    { kind: "user", text: "second", presentationTurnId: "turn_b" },
    { kind: "assistant", text: "second terminal", presentationTurnId: "turn_b" }
];
const initial = { activeInvocationId: "a2", invocations: [entry("a1", "turn_a", "stream-completed", "a-first"), entry("a2", "turn_a", "streaming", "a-second"), entry("b1", "turn_b", "streaming", "b-reasoning")] };
view.render({ items }, initial);
const list = root.children[0];
check(list.children.map((node) => node.textContent || node.attributes["data-reasoning-invocation-id"]).join("|") === "first|a1|a2|first terminal|second|b1|second terminal", "Each transient invocation is turn-anchored between its user and terminal, preserving multi-step insertion order");
const a1 = list.children[1]; const a2 = list.children[2]; const b1 = list.children[5];
check(a2.children[0].children[0].attributes["aria-expanded"] === "true", "Active reasoning defaults open before assistant text begins");
view.render({ items }, { activeInvocationId: "a2", invocations: [entry("a1", "turn_a", "stream-completed", "a-first"), entry("a2", "turn_a", "streaming", "a-second", "visible"), entry("b1", "turn_b", "streaming", "b-reasoning")] });
check(a2.children[0].children[0].attributes["aria-expanded"] === "false", "Assistant text lifecycle transition collapses reasoning by default");
a1.children[0].children[0].listeners.click();
view.render({ items }, { activeInvocationId: "a2", invocations: [entry("a1", "turn_a", "stream-completed", "a-first"), entry("a2", "turn_a", "streaming", "a-second", "updated"), entry("b1", "turn_b", "streaming", "b-reasoning")] });
check(a1.children[0].children[0].attributes["aria-expanded"] === "true" && list.children[1] === a1 && list.children[2] === a2 && list.children[5] === b1, "Manual disclosure state and segment identity survive unrelated incremental rendering");
view.render({ items }, { activeInvocationId: null, invocations: [entry("a1", "turn_a", "stream-cancelled", "a-first"), entry("a2", "turn_a", "stream-cancelled", "a-second", "updated"), entry("b1", "turn_b", "stream-cancelled", "b-reasoning")] });
check(a2.children[0].children[0].attributes["aria-expanded"] === "false", "Cancellation settles an untouched active reasoning disclosure collapsed");
b1.children[0].children[0].listeners.click();
view.render({ items }, { activeInvocationId: null, invocations: [entry("a1", "turn_a", "stream-cancelled", "a-first"), entry("a2", "turn_a", "stream-cancelled", "a-second", "updated"), entry("b1", "turn_b", "stream-cancelled", "b-reasoning")] });
check(b1.children[0].children[0].attributes["aria-expanded"] === "true", "Manual reopen after cancellation persists across rerendering");
console.log("PASS Vela TranscriptView turn composition: " + assertions + " assertions.");
