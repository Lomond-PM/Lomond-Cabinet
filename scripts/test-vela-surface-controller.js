"use strict";

const assert = require("assert");
const PresentationModel = require("../client/js/vela/velaPresentationModel.js").VelaPresentationModel;
const TranscriptView = require("../client/js/vela/velaTranscriptView.js").VelaTranscriptView;
const ComposerView = require("../client/js/vela/velaComposerView.js").VelaComposerView;
const ConfirmationView = require("../client/js/vela/velaConfirmationView.js").VelaConfirmationView;
const SurfaceController = require("../client/js/vela/velaSurfaceController.js").VelaSurfaceController;
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function deferred() { let resolve; let reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; }
function Node(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.className = ""; this.attributes = {}; this.listeners = {}; this.textContent = ""; this.value = ""; this.hidden = false; this.disabled = false; this.readOnly = false; this.scrollTop = 0; this.scrollHeight = 100; this.clientHeight = 100; this.selectionStart = 0; this.selectionEnd = 0; this.focused = false; this.ownerDocument = { createElement: (childTag) => new Node(childTag) }; }
Node.prototype.appendChild = function (child) { child.parentNode = this; this.children.push(child); this.scrollHeight += 20; return child; };
Node.prototype.removeChild = function (child) { const index = this.children.indexOf(child); if (index >= 0) { this.children.splice(index, 1); child.parentNode = null; } return child; };
Node.prototype.setAttribute = function (key, value) { this.attributes[key] = String(value); };
Node.prototype.getAttribute = function (key) { return this.attributes[key] || null; };
Node.prototype.addEventListener = function (type, listener) { (this.listeners[type] || (this.listeners[type] = [])).push(listener); };
Node.prototype.emit = function (type) { (this.listeners[type] || []).slice().forEach((listener) => listener({})); };
Node.prototype.focus = function () { this.focused = true; };
Node.prototype.setSelectionRange = function (left, right) { this.selectionStart = left; this.selectionEnd = right; };
function fixture(options) {
    options = options || {};
    const intro = new Node("p"), scroll = new Node("div"), composer = new Node("textarea"), actionSlot = new Node("div"), statusText = new Node("span"), statusSlot = new Node("div");
    scroll.appendChild(intro);
    const elements = { transcriptScroll: scroll, transcriptMessage: intro, composer, actionSlot, statusText, statusSlot };
    const request = deferred(), confirmationRequest = deferred();
    let providerState = { state: "idle", text: null, errorCode: null };
    let confirmationState = { state: "idle", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: "test" };
    const calls = { send: [], cancel: 0, review: 0, approve: 0, reject: 0 };
    const provider = {
        send(message) { calls.send.push(message); if (options.synchronousRejection) { providerState = { state: "failed", text: null, errorCode: "VERIFICATION_UNAVAILABLE" }; return Promise.reject(new Error("VERIFICATION_UNAVAILABLE")); } providerState = { state: "pending", text: null, errorCode: null }; return request.promise; },
        cancel() { calls.cancel += 1; providerState = { state: "cancelled", text: null, errorCode: "PROVIDER_REQUEST_ABORTED" }; },
        getState() { return Object.freeze(Object.assign({}, providerState)); }
    };
    const confirmation = {
        review() { calls.review += 1; providerState = { state: "idle", text: null, errorCode: null }; confirmationState = { state: "confirmation-ready", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }; return Promise.resolve(); },
        approve() { calls.approve += 1; confirmationState = { state: "executing", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }; return confirmationRequest.promise; },
        reject() { calls.reject += 1; confirmationState = { state: "rejected", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }; return Promise.resolve(); },
        getState() { return Object.freeze(Object.assign({}, confirmationState)); }
    };
    const controller = SurfaceController.create({ surface: { getElementsForTest: () => elements }, provider, confirmation, t: (key) => "t:" + key, PresentationModel, TranscriptView, ComposerView, ConfirmationView });
    return { controller, elements, request, confirmationRequest, calls, setProvider(next) { providerState = next; }, setConfirmation(next) { confirmationState = next; } };
}
async function flush() { await Promise.resolve(); await Promise.resolve(); }
async function run() {
    equal(PresentationModel.errorDisplayKey("VERIFICATION_UNAVAILABLE"), "vela.surfaceContextUnavailable", "AE context error is localized");
    equal(PresentationModel.errorDisplayKey("PROVIDER_CONNECTION_FAILED"), "vela.surfaceProviderConnection", "connection error is localized");
    equal(PresentationModel.errorDisplayKey("PROVIDER_TIMEOUT"), "vela.surfaceProviderTimeout", "timeout error is localized");
    equal(PresentationModel.errorDisplayKey("UNKNOWN_TEST_ERROR"), "vela.surfaceGenericError", "unknown error uses localized fallback");
    const test = fixture(), e = test.elements;
    check(test.controller.mount(), "controller mounts once");
    equal(e.actionSlot.children.length, 6, "stable action slot installs Send, Cancel, summary, Review, Approve, and Reject once");
    equal(e.actionSlot.children.filter((node) => node.tagName === "BUTTON").length, 5, "fresh production-shaped mount creates the fixed five action buttons");
    const [send, cancel, summary, review, approve, reject] = e.actionSlot.children;
    const textarea = e.composer, transcript = e.transcriptScroll;
    check(!send.hidden && cancel.hidden && review.hidden && approve.hidden && reject.hidden, "idle exposes only Send");
    const matrix = fixture(); matrix.controller.mount(); const m = matrix.elements.actionSlot.children; const matrixNodes = m.slice();
    check(!matrix.elements.actionSlot.hidden && !m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "fresh provider and confirmation idle keeps slot visible and exposes only Send");
    matrix.setProvider({ state: "completed", text: "terminal", errorCode: null }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "provider text terminal exposes only Send");
    matrix.setProvider({ state: "failed", text: null, errorCode: "PROVIDER_CONNECTION_FAILED" }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "provider error terminal exposes only Send");
    matrix.setProvider({ state: "cancelled", text: null, errorCode: "PROVIDER_REQUEST_ABORTED" }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "provider cancellation terminal exposes only Send");
    matrix.setProvider({ state: "intent-rejected", text: null, errorCode: null }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "intent-rejected is a provider terminal that exposes only Send");
    const intentNotice = fixture(); intentNotice.controller.mount(); intentNotice.elements.composer.value = "你好"; intentNotice.elements.actionSlot.children[0].emit("click"); intentNotice.setProvider({ state: "intent-rejected", text: null, errorCode: null }); intentNotice.request.resolve(); await flush();
    equal(intentNotice.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceIntentRejected", "intent-rejected uses the fixed localized notice rather than model or internal data");
    check(!intentNotice.elements.actionSlot.children[0].hidden && intentNotice.elements.actionSlot.children[3].hidden && intentNotice.elements.actionSlot.children[4].hidden && intentNotice.elements.actionSlot.children[5].hidden, "intent-rejected restores Send with no Review, Approve, or Reject action");
    matrix.setProvider({ state: "proposal-ready", text: null, errorCode: null }); matrix.controller.refreshLocale();
    check(m[0].hidden && m[1].hidden && !m[3].hidden && m[4].hidden && m[5].hidden, "proposal-ready exposes only Review");
    matrix.setProvider({ state: "idle", text: null, errorCode: null }); matrix.setConfirmation({ state: "confirmation-ready", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }); matrix.controller.refreshLocale();
    check(m[0].hidden && m[1].hidden && m[3].hidden && !m[4].hidden && !m[5].hidden, "confirmation-ready exposes only Approve and Reject");
    matrix.setConfirmation({ state: "executing", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }); matrix.controller.refreshLocale();
    check(m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "executing hides every action");
    matrix.setConfirmation({ state: "execution-completed", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "execution terminal exposes only Send");
    matrix.setConfirmation({ state: "idle", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: "test" }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden, "locale refresh retains idle Send visibility");
    matrix.controller.suspend(); matrix.controller.resume();
    check(!m[0].hidden && matrixNodes.every((node, index) => node === m[index]), "suspend and resume retain idle Send visibility and every action node identity");
    e.composer.value = "set opacity"; e.composer.focus(); e.composer.setSelectionRange(2, 5); send.emit("click");
    equal(test.calls.send[0], "set opacity", "Send supplies only message text");
    equal(e.composer.value, "", "accepted pending send clears submitted text");
    equal(e.composer, textarea, "send preserves textarea DOM identity");
    equal(e.composer.selectionStart, 2, "send preserves selection");
    check(send.hidden && !cancel.hidden && !e.composer.readOnly, "pending exposes Cancel and retains editable composer");
    e.composer.value = "new draft"; e.scrollTop = 0;
    test.setProvider({ state: "proposal-ready", text: null, errorCode: null }); test.request.resolve(); await flush();
    check(send.hidden && cancel.hidden && !review.hidden && approve.hidden && reject.hidden, "proposal-ready exposes only Review");
    equal(e.composer.value, "new draft", "proposal patch cannot clear a later draft");
    equal(transcript.children[1].children[1].textContent, "t:vela.surfaceLocalProposalNotice", "proposal uses dedicated notice");
    check(transcript.children[1].children[1].textContent.indexOf("NoDisplayableText") === -1, "proposal does not use text fallback");
    review.emit("click"); await flush();
    equal(test.calls.review, 1, "Review is explicit and invoked once without Surface identifiers");
    check(send.hidden && review.hidden && !approve.hidden && !reject.hidden, "confirmation exposes only Approve and Reject");
    equal(summary.textContent, "t:vela.surfaceConfirmationValue", "confirmation uses the bounded value summary key");
    approve.emit("click"); approve.emit("click");
    equal(test.calls.approve, 1, "double Approve is blocked while executing");
    check(send.hidden && approve.hidden && reject.hidden && e.composer.readOnly, "executing exposes no clickable mutation");
    test.setConfirmation({ state: "execution-completed", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }); test.confirmationRequest.resolve(); await flush();
    check(!send.hidden && approve.hidden && reject.hidden, "completed execution returns to Send");
    equal(transcript.children[1].children[3].textContent, "t:vela.surfaceExecutionCompleted", "completion has a bounded transcript notice");
    e.composer.value = "second request"; send.emit("click");
    check(!cancel.hidden && send.hidden, "new provider pending state takes precedence over a cleared execution terminal");
    cancel.emit("click");
    equal(test.calls.cancel, 1, "Cancel remains a no-argument action while a replacement request is pending");
    const rejected = fixture(); rejected.controller.mount(); const r = rejected.elements.actionSlot.children; rejected.setProvider({ state: "proposal-ready", text: null, errorCode: null }); rejected.controller.refreshLocale(); r[3].emit("click"); await flush(); r[5].emit("click"); await flush();
    equal(rejected.calls.reject, 1, "Reject is a private no-argument action");
    check(!r[0].hidden && r[3].hidden && r[4].hidden && r[5].hidden, "rejected confirmation returns to Send without execution action");
    equal(rejected.elements.transcriptScroll.children[1].children[0].textContent, "t:vela.surfaceConfirmationReady", "confirmation has dedicated bounded notice");
    equal(rejected.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceConfirmationRejected", "rejection has dedicated bounded notice");
    const errors = fixture(); errors.controller.mount(); errors.elements.composer.value = "fail"; errors.elements.actionSlot.children[0].emit("click"); errors.setProvider({ state: "failed", text: null, errorCode: "PROVIDER_CONNECTION_FAILED" }); errors.request.resolve(); await flush();
    equal(errors.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceProviderConnection", "Transcript receives mapped presentation text");
    check(errors.elements.transcriptScroll.children[1].children[1].textContent.indexOf("PROVIDER_CONNECTION_FAILED") === -1, "Transcript never exposes raw error codes");
    const sync = fixture({ synchronousRejection: true }); sync.controller.mount(); sync.elements.composer.value = "keep"; const syncTextarea = sync.elements.composer; sync.elements.actionSlot.children[0].emit("click"); await flush(); equal(sync.elements.composer.value, "keep", "synchronous rejection keeps draft"); equal(sync.elements.composer, syncTextarea, "synchronous rejection preserves textarea");
    const beforeChildren = e.actionSlot.children.slice(); test.controller.suspend(); e.composer.value = "suspended"; test.setProvider({ state: "completed", text: "late", errorCode: null }); test.controller.refreshLocale(); equal(e.composer.value, "suspended", "suspension blocks patches"); test.controller.resume(); check(e.actionSlot.children.every((node, index) => node === beforeChildren[index]), "resume preserves controls DOM identity");
    check(!/errorCode|PROVIDER_|VERIFICATION_UNAVAILABLE/.test(TranscriptView.create.toString()), "Transcript does not map internal codes");
    check(!/requestId|candidateId|planId|authority|endpoint|target|context|nonce|digest/.test(SurfaceController.create.toString()), "Surface controller has no trusted identity seam");
    check(!/candidateId|planId|authority|target|context|nonce|digest/.test(ConfirmationView.create.toString()), "confirmation view receives no trusted execution data");
    check(test.controller.dispose(), "dispose succeeds once");
    console.log("test-vela-surface-controller: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
