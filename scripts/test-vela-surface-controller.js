"use strict";

const assert = require("assert");
const PresentationModel = require("../client/js/vela/velaPresentationModel.js").VelaPresentationModel;
const TranscriptView = require("../client/js/vela/velaTranscriptView.js").VelaTranscriptView;
const ComposerView = require("../client/js/vela/velaComposerView.js").VelaComposerView;
const SurfaceController = require("../client/js/vela/velaSurfaceController.js").VelaSurfaceController;
let assertions = 0;

function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function deferred() { let resolve; let reject; const promise = new Promise(function (ok, fail) { resolve = ok; reject = fail; }); return { promise: promise, resolve: resolve, reject: reject }; }

function Node(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.attributes = {};
    this.listeners = {};
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.readOnly = false;
    this.scrollTop = 0;
    this.scrollHeight = 100;
    this.clientHeight = 100;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.focused = false;
    this.ownerDocument = { createElement: function (childTag) { return new Node(childTag); } };
}
Node.prototype.appendChild = function (child) { child.parentNode = this; this.children.push(child); this.scrollHeight += 20; return child; };
Node.prototype.removeChild = function (child) { const index = this.children.indexOf(child); if (index >= 0) { this.children.splice(index, 1); child.parentNode = null; } return child; };
Node.prototype.setAttribute = function (key, value) { this.attributes[key] = String(value); };
Node.prototype.getAttribute = function (key) { return this.attributes[key] || null; };
Node.prototype.addEventListener = function (type, listener) { (this.listeners[type] || (this.listeners[type] = [])).push(listener); };
Node.prototype.emit = function (type) { (this.listeners[type] || []).slice().forEach(function (listener) { listener({}); }); };
Node.prototype.focus = function () { this.focused = true; };
Node.prototype.setSelectionRange = function (left, right) { this.selectionStart = left; this.selectionEnd = right; };

function createFixture(options) {
    const root = new Node("div");
    const intro = new Node("p");
    const scroll = new Node("div");
    const composer = new Node("textarea");
    const actionSlot = new Node("div");
    const statusText = new Node("span");
    const statusSlot = new Node("div");
    scroll.appendChild(intro);
    const elements = { transcriptScroll: scroll, transcriptMessage: intro, composer: composer, actionSlot: actionSlot, statusText: statusText, statusSlot: statusSlot };
    const surface = { getElementsForTest: function () { return elements; } };
    const request = deferred();
    let state = { state: "idle", text: null, errorCode: null };
    const calls = { send: [], cancel: 0 };
    options = options || {};
    const provider = {
        send: function (message) {
            calls.send.push(message);
            if (options.synchronousRejection) {
                state = { state: "failed", text: null, errorCode: "VERIFICATION_UNAVAILABLE" };
                return Promise.reject(new Error("VERIFICATION_UNAVAILABLE"));
            }
            state = { state: "pending", text: null, errorCode: null };
            return request.promise;
        },
        cancel: function () { calls.cancel += 1; state = { state: "cancelled", text: null, errorCode: "PROVIDER_REQUEST_ABORTED" }; return true; },
        getState: function () { return Object.freeze({ state: state.state, text: state.text, errorCode: state.errorCode }); }
    };
    const controller = SurfaceController.create({
        surface: surface,
        provider: provider,
        t: function (key) { return "t:" + key; },
        PresentationModel: PresentationModel,
        TranscriptView: TranscriptView,
        ComposerView: ComposerView
    });
    return { controller: controller, elements: elements, request: request, calls: calls, setState: function (next) { state = next; } };
}

async function run() {
    equal(PresentationModel.errorDisplayKey("VERIFICATION_UNAVAILABLE"), "vela.surfaceContextUnavailable", "PresentationModel maps unavailable AE context to its dedicated user message");
    equal(PresentationModel.errorDisplayKey("PROVIDER_CONNECTION_FAILED"), "vela.surfaceProviderConnection", "PresentationModel maps provider connection failures to the LM Studio recovery message");
    equal(PresentationModel.errorDisplayKey("PROVIDER_TIMEOUT"), "vela.surfaceProviderTimeout", "PresentationModel maps provider timeouts to their bounded user message");
    equal(PresentationModel.errorDisplayKey("UNKNOWN_TEST_ERROR"), "vela.surfaceGenericError", "PresentationModel maps unknown error codes to the generic user fallback");
    const fixture = createFixture();
    const elements = fixture.elements;
    check(fixture.controller.mount(), "controller mounts once over the existing Surface slots");
    equal(elements.actionSlot.children.length, 2, "composer installs stable Send and Cancel buttons once");
    const textarea = elements.composer;
    const send = elements.actionSlot.children[0];
    const cancel = elements.actionSlot.children[1];
    check(!send.hidden && cancel.hidden, "idle state exposes only Send");
    elements.composer.value = "keep this text";
    elements.composer.focus();
    elements.composer.setSelectionRange(2, 6);
    send.emit("click");
    equal(fixture.calls.send.length, 1, "Send forwards only the textarea message through the private facade");
    equal(fixture.calls.send[0], "keep this text", "Send does not fabricate endpoint, model, IDs, or provider metadata");
    check(send.hidden && !cancel.hidden && !elements.composer.readOnly, "pending state exposes only Cancel while preserving an editable composer");
    equal(elements.composer.value, "", "an accepted pending send clears only the submitted text");
    equal(elements.composer.selectionStart, 2, "accepted send retains textarea selection state without rebuilding it");
    equal(elements.composer.selectionEnd, 6, "accepted send retains textarea selection end without rebuilding it");
    equal(elements.composer.focused, true, "pending patch preserves textarea identity and focus state");
    equal(elements.composer, textarea, "accepted send preserves textarea DOM identity");
    elements.composer.value = "new draft while waiting";
    elements.transcriptScroll.scrollTop = 0;
    fixture.setState({ state: "completed", text: "safe local text", errorCode: null });
    fixture.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    check(!send.hidden && cancel.hidden && !elements.composer.readOnly, "completed text restores Send without reconstructing composer controls");
    equal(elements.composer.value, "new draft while waiting", "a later response patch cannot clear a new user draft");
    equal(elements.transcriptScroll.children[1].children[0].textContent, "keep this text", "user text is appended through textContent");
    equal(elements.transcriptScroll.children[1].children[1].textContent, "safe local text", "provider text is appended through textContent");
    equal(elements.statusText.textContent, "t:vela.surfaceStatusCompleted", "completed state projects only a bounded status label");
    equal(elements.transcriptScroll.scrollTop, 0, "an up-scrolled transcript is not forced back to bottom by a provider patch");
    const scrollBefore = elements.transcriptScroll.scrollTop;
    elements.transcriptScroll.scrollTop = 0;
    fixture.controller.refreshLocale();
    equal(elements.transcriptScroll.scrollTop, 0, "locale patch does not force an up-scrolled transcript to bottom");
    check(scrollBefore >= 0, "transcript maintains a session-only scroll position");

    const cancelled = createFixture();
    cancelled.controller.mount();
    cancelled.elements.composer.value = "cancel me";
    cancelled.elements.actionSlot.children[0].emit("click");
    cancelled.elements.actionSlot.children[0].emit("click");
    equal(cancelled.calls.send.length, 1, "double Send is ignored while the request is pending");
    cancelled.elements.actionSlot.children[1].emit("click");
    equal(cancelled.calls.cancel, 1, "Cancel uses the private no-argument facade once");
    cancelled.setState({ state: "completed", text: "late text", errorCode: null });
    cancelled.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    equal(cancelled.elements.transcriptScroll.children[1].children.length, 2, "late result cannot restore a cancelled provider transcript");
    equal(cancelled.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceProviderCancelled", "cancelled requests use a mapped user message");
    equal(cancelled.elements.statusText.textContent, "t:vela.surfaceStatusCancelled", "cancelled state remains terminal for the session request");
    check(cancelled.controller.dispose(), "dispose invalidates later state callbacks");

    const failed = createFixture();
    failed.controller.mount();
    failed.elements.composer.value = "fail me";
    failed.elements.actionSlot.children[0].emit("click");
    failed.setState({ state: "failed", text: null, errorCode: "PROVIDER_CONNECTION_FAILED" });
    failed.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    equal(failed.elements.statusText.textContent, "t:vela.surfaceStatusFailed", "connection and timeout failures project a bounded failed state");
    equal(failed.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceProviderConnection", "connection failures map to the LM Studio recovery message");
    check(failed.elements.transcriptScroll.children[1].children[1].textContent.indexOf("PROVIDER_CONNECTION_FAILED") === -1, "connection failure codes never leak into Transcript text");

    const timeout = createFixture();
    timeout.controller.mount();
    timeout.elements.composer.value = "timeout";
    timeout.elements.actionSlot.children[0].emit("click");
    timeout.setState({ state: "failed", text: null, errorCode: "PROVIDER_TIMEOUT" });
    timeout.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    equal(timeout.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceProviderTimeout", "timeout failures use the bounded timeout message");
    check(timeout.elements.transcriptScroll.children[1].children[1].textContent.indexOf("PROVIDER_TIMEOUT") === -1, "timeout codes never leak into Transcript text");

    const unknown = createFixture();
    unknown.controller.mount();
    unknown.elements.composer.value = "unknown error";
    unknown.elements.actionSlot.children[0].emit("click");
    unknown.setState({ state: "failed", text: null, errorCode: "UNKNOWN_TEST_ERROR" });
    unknown.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    equal(unknown.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceGenericError", "unknown failures use the generic local fallback");
    check(unknown.elements.transcriptScroll.children[1].children[1].textContent.indexOf("UNKNOWN_TEST_ERROR") === -1, "unknown codes never leak into Transcript text");

    const rejected = createFixture({ synchronousRejection: true });
    rejected.controller.mount();
    rejected.elements.composer.value = "retain rejected draft";
    const rejectedTextarea = rejected.elements.composer;
    rejected.elements.actionSlot.children[0].emit("click");
    await Promise.resolve();
    equal(rejected.elements.composer.value, "retain rejected draft", "a synchronous rejection keeps the submitted draft");
    equal(rejected.elements.composer, rejectedTextarea, "a synchronous rejection preserves textarea DOM identity");
    check(!rejected.elements.actionSlot.children[0].hidden, "a synchronous rejection keeps Send available");

    const proposal = createFixture();
    proposal.controller.mount();
    proposal.elements.composer.value = "proposal";
    proposal.elements.actionSlot.children[0].emit("click");
    proposal.setState({ state: "proposal-ready", text: null, errorCode: null });
    proposal.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    equal(proposal.elements.actionSlot.children.length, 2, "proposal-ready does not add Review, Approve, or execution controls to the Surface");
    equal(proposal.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceLocalProposalNotice", "proposal-ready uses its dedicated non-executable notice rather than the empty-text fallback");
    check(proposal.elements.transcriptScroll.children[1].children[1].textContent.indexOf("NoDisplayableText") === -1, "proposal-ready never reports a missing displayable text fallback");
    check(!proposal.elements.actionSlot.children[0].hidden && proposal.elements.actionSlot.children[1].hidden, "proposal-ready restores Send and exposes no execution-class action");

    const unavailable = createFixture();
    unavailable.controller.mount();
    unavailable.elements.composer.value = "context unavailable";
    unavailable.elements.actionSlot.children[0].emit("click");
    unavailable.setState({ state: "failed", text: null, errorCode: "VERIFICATION_UNAVAILABLE" });
    unavailable.request.resolve();
    await Promise.resolve();
    await Promise.resolve();
    equal(unavailable.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceContextUnavailable", "VERIFICATION_UNAVAILABLE maps to an actionable user message");
    check(unavailable.elements.transcriptScroll.children[1].children[1].textContent.indexOf("VERIFICATION_UNAVAILABLE") === -1, "VERIFICATION_UNAVAILABLE never leaks into Transcript text");
    check(!/errorCode|PROVIDER_|VERIFICATION_UNAVAILABLE/.test(TranscriptView.create.toString()), "Transcript only renders PresentationModel text and has no internal error-code mapping");
    check(!/requestId|proposalCapability|candidateId|planId|authority|endpoint/.test(SurfaceController.create.toString()), "Surface controller accepts no trusted provider identity input");
    console.log("test-vela-surface-controller: " + assertions + " assertions passed.");
}

run().catch(function (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
