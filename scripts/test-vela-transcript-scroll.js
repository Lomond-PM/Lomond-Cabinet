"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const PresentationModel = require(path.join(ROOT, "client/js/vela/velaPresentationModel.js")).VelaPresentationModel;
const TranscriptView = require(path.join(ROOT, "client/js/vela/velaTranscriptView.js")).VelaTranscriptView;
let assertions = 0;
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message) { assertions += 1; assert.ok(value, message); }

function Node(tag, documentRef) {
    this.tagName = String(tag).toUpperCase();
    this.ownerDocument = documentRef;
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this._text = "";
    this._scrollTop = 0;
    this.clientHeight = 100;
    this.listeners = {};
}
Object.defineProperty(Node.prototype, "textContent", {
    get: function () { return this._text; },
    set: function (value) { this._text = String(value || ""); }
});
Object.defineProperty(Node.prototype, "scrollHeight", {
    get: function () {
        if (/vela-transcript-message/.test(this.className)) { return Math.max(20, Math.ceil(this._text.length / 20) * 20); }
        if (/vela-transcript-intro/.test(this.className)) { return 20; }
        return this.children.reduce(function (total, child) { return total + child.scrollHeight; }, 0);
    }
});
Object.defineProperty(Node.prototype, "scrollTop", {
    get: function () { return this._scrollTop; },
    set: function (value) { this._scrollTop = Math.max(0, Number(value) || 0); }
});
Node.prototype.appendChild = function (child) { child.parentNode = this; this.children.push(child); return child; };
Node.prototype.removeChild = function (child) { const index = this.children.indexOf(child); if (index >= 0) { this.children.splice(index, 1); child.parentNode = null; } return child; };
Node.prototype.addEventListener = function (type, listener) { (this.listeners[type] || (this.listeners[type] = [])).push(listener); };
Node.prototype.emit = function (type) { (this.listeners[type] || []).slice().forEach(function (listener) { listener(); }); };

function fixture() {
    const documentRef = { createElement: function (tag) { return new Node(tag, documentRef); } };
    const root = new Node("div", documentRef);
    root.className = "vela-transcript-scroll";
    const intro = new Node("p", documentRef);
    intro.className = "vela-transcript-intro";
    root.appendChild(intro);
    let localePrefix = "t:";
    const view = TranscriptView.create({ root: root, intro: intro, t: function (key) { return localePrefix + key; } });
    return { root: root, intro: intro, view: view, list: root.children[1], setLocalePrefix: function (value) { localePrefix = value; } };
}

const model = PresentationModel.create();
let snapshot;
for (let index = 0; index < 20; index += 1) {
    model.begin("user-" + index);
    snapshot = model.apply({ state: "completed", text: "assistant-" + index });
}
equal(snapshot.items.length, 40, "all twenty user/assistant rounds remain in the Presentation Model snapshot");
equal(snapshot.items[0].text, "user-0", "the first user message remains in the snapshot");
equal(snapshot.items[1].text, "assistant-0", "the first assistant response remains in the snapshot");

const transcript = fixture();
transcript.view.render(snapshot);
equal(transcript.list.children.length, 40, "all retained messages render into transcript DOM");
equal(transcript.list.children[0].textContent, "user-0", "the first round remains accessible in transcript DOM");
equal(transcript.root.scrollTop, transcript.root.scrollHeight, "initial near-bottom render follows the newest message");

const retained = snapshot.items.slice();
retained.push({ kind: "user", text: "latest-user", displayTextKey: null });
transcript.root.scrollTop = transcript.root.scrollHeight - transcript.root.clientHeight;
transcript.view.render({ items: retained });
equal(transcript.root.scrollTop, transcript.root.scrollHeight, "near-bottom user follows an appended message");

transcript.root.scrollTop = 40;
const readingTop = transcript.root.scrollTop;
retained.push({ kind: "assistant", text: "latest-assistant", displayTextKey: null });
transcript.view.render({ items: retained });
equal(transcript.root.scrollTop, readingTop, "appended messages do not pull an upward reader to the bottom");

transcript.root.scrollTop = transcript.root.scrollHeight - transcript.root.clientHeight;
retained.push({ kind: "notice", text: "confirmation", displayTextKey: null });
transcript.view.render({ items: retained });
equal(transcript.root.scrollTop, transcript.root.scrollHeight, "manual return near bottom restores automatic following");

const streaming = { kind: "assistant", text: "token", displayTextKey: null };
const streamItems = retained.concat([streaming]);
transcript.root.scrollTop = transcript.root.scrollHeight - transcript.root.clientHeight;
transcript.view.render({ items: streamItems });
streaming.text = "token ".repeat(30);
transcript.view.render({ items: streamItems });
equal(transcript.root.scrollTop, transcript.root.scrollHeight, "streaming growth keeps a near-bottom reader at the bottom");

transcript.root.scrollTop = 60;
const streamReadingTop = transcript.root.scrollTop;
streaming.text = "token ".repeat(50);
transcript.view.render({ items: streamItems });
equal(transcript.root.scrollTop, streamReadingTop, "streaming growth does not steal an upward reader position");

transcript.root.scrollTop = transcript.root.scrollHeight - transcript.root.clientHeight;
const rebuiltAtBottom = streamItems.map(function (item) { return { kind: item.kind, text: item.text, displayTextKey: item.displayTextKey }; });
transcript.view.render({ items: rebuiltAtBottom });
equal(transcript.root.scrollTop, transcript.root.scrollHeight, "necessary DOM rebuild preserves bottom following");

transcript.root.scrollTop = 80;
const beforeRebuildTop = transcript.root.scrollTop;
const beforeRebuildHeight = transcript.root.scrollHeight;
const rebuiltAbove = rebuiltAtBottom.map(function (item, index) { return { kind: item.kind, text: index === 0 ? item.text + " expanded ".repeat(20) : item.text, displayTextKey: item.displayTextKey }; });
transcript.view.render({ items: rebuiltAbove });
equal(transcript.root.scrollTop, beforeRebuildTop + transcript.root.scrollHeight - beforeRebuildHeight, "upward reading position is compensated by rebuild height delta");

transcript.root.clientHeight = 60;
transcript.root.scrollTop = 0;
equal(transcript.list.children[0].textContent, rebuiltAbove[0].text, "height shrink still permits access to the first message");
transcript.root.scrollTop = transcript.root.scrollHeight - transcript.root.clientHeight;
ok(transcript.root.scrollTop > 0 && transcript.list.children[transcript.list.children.length - 1].textContent === rebuiltAbove[rebuiltAbove.length - 1].text, "height shrink still permits access to the latest message");
transcript.root.scrollTop = 80;
transcript.root.clientHeight = 140;
transcript.view.render({ items: rebuiltAbove });
equal(transcript.root.scrollTop, 80, "height growth does not unconditionally jump an upward reader to the bottom");

const beforeLocaleCount = transcript.list.children.length;
transcript.setLocalePrefix("localized-long-prefix:");
transcript.view.refreshLocale();
equal(transcript.list.children.length, beforeLocaleCount, "locale refresh does not clear conversation DOM");
equal(transcript.list.children[0].textContent, rebuiltAbove[0].text, "locale refresh preserves ordinary message content");

const terminalModel = PresentationModel.create();
terminalModel.begin("cancel request");
let terminal = terminalModel.apply({ state: "cancelled", errorCode: "PROVIDER_REQUEST_ABORTED" });
terminalModel.begin("error request");
terminal = terminalModel.apply({ state: "failed", errorCode: "PROVIDER_CONNECTION_FAILED" });
terminalModel.begin("complete request");
terminal = terminalModel.apply({ state: "completed", text: "complete response" });
terminal = terminalModel.applyConfirmation({ state: "confirmation-ready" }, terminal);
ok(terminal.items.some(function (item) { return item.text === "cancel request"; }), "cancelled terminal state retains earlier messages");
ok(terminal.items.some(function (item) { return item.text === "error request"; }), "error terminal state retains earlier messages");
ok(terminal.items.some(function (item) { return item.text === "complete response"; }), "completed terminal state retains earlier messages");
ok(terminal.items.some(function (item) { return item.displayTextKey === "vela.surfaceConfirmationReady"; }), "confirmation notice appends without replacing ordinary messages");

const css = fs.readFileSync(path.join(ROOT, "client/css/velaSurface.css"), "utf8");
const presentationSource = fs.readFileSync(path.join(ROOT, "client/js/vela/velaPresentationModel.js"), "utf8");
const surfaceRule = (css.match(/\.vela-surface\s*\{([^}]*)\}/) || [])[1] || "";
const slotRule = (css.match(/\.vela-transcript-slot\s*\{([^}]*)\}/) || [])[1] || "";
const scrollRule = (css.match(/\.vela-transcript-scroll\s*\{([^}]*)\}/) || [])[1] || "";
ok(/grid-template-rows:\s*minmax\(0, 1fr\) auto auto/.test(surfaceRule) && /min-height:\s*0/.test(surfaceRule) && /overflow:\s*hidden/.test(surfaceRule), "Surface constrains transcript row without becoming scrollable");
ok(/min-height:\s*0/.test(slotRule) && /min-width:\s*0/.test(slotRule) && /overflow:\s*hidden/.test(slotRule), "transcript outer slot cannot expand the Grid intrinsically");
ok(/min-height:\s*0/.test(scrollRule) && /min-width:\s*0/.test(scrollRule) && /overflow-y:\s*auto/.test(scrollRule) && /overflow-x:\s*hidden/.test(scrollRule), "transcript is the bounded vertical scroller with no horizontal overflow");
equal((css.match(/overflow-y:\s*auto/g) || []).length, 1, "transcript is the only Vela vertical auto-scroll area");
ok(/overflow-wrap:\s*anywhere/.test(css) && /\.vela-transcript-message pre,[\s\S]*?white-space:\s*pre-wrap/.test(css), "long text, paths, pre, and code wrap without horizontal overflow");
ok(!/MAX_TRANSCRIPT_ITEMS|slice\s*\(\s*-|\.shift\s*\(/.test(presentationSource), "Presentation Model has no fixed recent-message truncation path");

console.log("test-vela-transcript-scroll: " + assertions + " assertions passed.");
