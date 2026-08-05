"use strict";

const assert = require("assert");
const PresentationModel = require("../client/js/vela/velaPresentationModel.js").VelaPresentationModel;
const TranscriptView = require("../client/js/vela/velaTranscriptView.js").VelaTranscriptView;
const ComposerView = require("../client/js/vela/velaComposerView.js").VelaComposerView;
const ConfirmationView = require("../client/js/vela/velaConfirmationView.js").VelaConfirmationView;
const SurfaceController = require("../client/js/vela/velaSurfaceController.js").VelaSurfaceController;
const ActivationPolicy = require("../client/js/vela/velaActivationPolicy.js").VelaActivationPolicy;
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
Node.prototype.removeEventListener = function (type, listener) { const list = this.listeners[type] || []; const index = list.indexOf(listener); if (index >= 0) list.splice(index, 1); };
Node.prototype.emit = function (type) { (this.listeners[type] || []).slice().forEach((listener) => listener({})); };
Node.prototype.focus = function () { this.focused = true; };
Node.prototype.setSelectionRange = function (left, right) { this.selectionStart = left; this.selectionEnd = right; };
function fixture(options) {
    options = options || {};
    const root = new Node("section"), intro = new Node("p"), scroll = new Node("div"), composer = new Node("textarea"), actionSlot = new Node("div"), statusText = new Node("span"), experimentalText = new Node("span"), statusDot = new Node("span"), statusSlot = new Node("div");
    const localToggle = new Node("button"), localUtility = new Node("section"), localTargetValue = new Node("span"), localTypeValue = new Node("span"), localCurrentValue = new Node("span"), localInput = new Node("input"), localValidation = new Node("p"), localNotice = new Node("p"), localRefresh = new Node("button"), localCreate = new Node("button"), localClose = new Node("button");
    experimentalText.textContent = Object.prototype.hasOwnProperty.call(options, "experimentalText") ? options.experimentalText : "t:vela.surfaceExperimentalStatus";
    scroll.appendChild(intro);
    const elements = { root, transcriptScroll: scroll, transcriptMessage: intro, composer, actionSlot, statusText, experimentalText, statusDot, statusSlot, localToggle, localUtility, localTargetValue, localTypeValue, localCurrentValue, localInput, localValidation, localNotice, localRefresh, localCreate, localClose };
    const request = deferred(), confirmationRequest = deferred();
    let providerState = { state: "idle", text: null, errorCode: null };
    let confirmationState = { state: "idle", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: "test" };
    let localState = { state: "idle", contextLayerIndex: null, beforeValue: null, source: null };
    const localRefreshRequest = options.localRefreshRequest || null;
    const calls = { check: [], send: [], cancel: 0, review: 0, approve: 0, reject: 0, localRefresh: 0, localCreate: [] };
    const provider = {
        check(config) { calls.check.push(config); if (options.readinessError) { return Promise.reject(options.readinessError); } return options.readinessPromise || Promise.resolve(options.readinessResult || { ready: true, code: "experimental-ready", modelId: config.model, loadedInstances: 1, quantization: "Q_TEST", contextLength: 8192 }); },
        send(message) { calls.send.push(message); if (options.synchronousRejection) { providerState = { state: "failed", text: null, errorCode: "VERIFICATION_UNAVAILABLE" }; return Promise.reject(new Error("VERIFICATION_UNAVAILABLE")); } providerState = { state: "pending", text: null, errorCode: null }; return request.promise; },
        cancel() { calls.cancel += 1; providerState = { state: "cancelled", text: null, errorCode: "PROVIDER_REQUEST_ABORTED" }; },
        getState() { return Object.freeze(Object.assign({}, providerState)); }
    };
    const confirmation = {
        review() { calls.review += 1; providerState = { state: "idle", text: null, errorCode: null }; confirmationState = { state: "confirmation-ready", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }; return Promise.resolve(); },
        approve() { calls.approve += 1; confirmationState = { state: "executing", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }; if (options.approveError) { localState = Object.assign({}, localState, { state: options.approveError.code === "CONTEXT_STALE" ? "stale" : "failed", errorCode: options.approveError.code }); return Promise.reject(options.approveError); } return confirmationRequest.promise; },
        reject() { calls.reject += 1; confirmationState = { state: "rejected", beforeValue: 20, proposedValue: 57.5, errorCode: null, moduleRevision: "test" }; return Promise.resolve(); },
        getState() { return Object.freeze(Object.assign({}, confirmationState)); }
    };
    const localOpacity = {
        refresh() { calls.localRefresh += 1; const result = localRefreshRequest ? localRefreshRequest.promise : Promise.resolve(); return result.then(() => { localState = { state: "ready", contextLayerIndex: 2, beforeValue: 35, contextRevision: 2, source: null }; return localState; }); },
        create(input) { calls.localCreate.push(input); if (options.localCreateError) return Promise.reject(options.localCreateError); localState = { state: "pending-confirmation", contextLayerIndex: 2, beforeValue: 35, proposedValue: input.opacity, contextRevision: 2, source: "local-manual-opacity" }; confirmationState = { state: "confirmation-ready", beforeValue: 35, proposedValue: input.opacity, errorCode: null, moduleRevision: "test" }; return Promise.resolve(localState); },
        getState() { return Object.freeze(Object.assign({}, localState)); }
    };
    const controller = SurfaceController.create({ surface: { getElementsForTest: () => elements }, provider, confirmation, localOpacity, t: options.t || ((key) => "t:" + key), PresentationModel, TranscriptView, ComposerView, ConfirmationView, ActivationPolicy });
    return { controller, elements, request, confirmationRequest, localRefreshRequest, calls, setProvider(next) { providerState = next; }, setConfirmation(next) { confirmationState = next; }, setLocal(next) { localState = next; }, getLocal() { return localState; } };
}
async function flush() { await Promise.resolve(); await Promise.resolve(); }
async function mountEnabled(test) { check(test.controller.mount(), "controller mounts before explicit experimental opt-in"); test.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234", model: "configured-model", acknowledged: true }); await test.controller.enableExperimental(); equal(test.controller.getExperimentalState().enabled, true, "explicit readiness enables only the current experimental session"); return test; }
async function run() {
    equal(PresentationModel.errorDisplayKey("VERIFICATION_UNAVAILABLE"), "vela.surfaceContextUnavailable", "AE context error is localized");
    equal(PresentationModel.errorDisplayKey("PROVIDER_CONNECTION_FAILED"), "vela.surfaceProviderConnection", "connection error is localized");
    equal(PresentationModel.errorDisplayKey("PROVIDER_TIMEOUT"), "vela.surfaceProviderTimeout", "timeout error is localized");
    equal(PresentationModel.errorDisplayKey("UNKNOWN_TEST_ERROR"), "vela.surfaceGenericError", "unknown error uses localized fallback");
    equal(PresentationModel.projectSurfaceState({ state: "completed", text: "model cannot choose state" }, { state: "idle" }, "", true, ActivationPolicy.getPolicy()).state, "completed", "projection uses trusted provider state rather than model text");
    equal(PresentationModel.projectSurfaceState({ state: "idle" }, { state: "idle" }, "", true).state, "idle", "trusted idle state projects idle");
    equal(PresentationModel.projectSurfaceState({ state: "idle", text: "requesting" }, { state: "idle" }, "draft", true).state, "composing", "non-empty local draft projects composing without trusting provider text");
    equal(PresentationModel.projectSurfaceState({ state: "pending" }, { state: "idle" }, "", true).state, "requesting", "trusted pending state projects requesting");
    equal(PresentationModel.projectSurfaceState({ state: "proposal-ready" }, { state: "idle" }, "", true).state, "reviewing", "proposal-ready projects reviewing");
    equal(PresentationModel.projectSurfaceState({ state: "idle" }, { state: "confirmation-ready" }, "", true).state, "awaiting-confirmation", "local confirmation projects awaiting-confirmation");
    equal(PresentationModel.projectSurfaceState({ state: "idle" }, { state: "executing" }, "", true).state, "executing", "local execution projects executing");
    equal(PresentationModel.projectSurfaceState({ state: "cancelled" }, { state: "idle" }, "", true).state, "cancelled", "trusted cancellation projects cancelled");
    equal(PresentationModel.projectSurfaceState({ state: "failed", text: "completed" }, { state: "idle" }, "", true).state, "error", "trusted failure projects error regardless of model text");
    equal(PresentationModel.statusTone("experimental-disabled"), "warning", "trusted disabled enum maps to warning without display-text matching");
    equal(PresentationModel.statusTone("idle"), "idle", "idle retains its existing semantic tone");
    equal(PresentationModel.statusTone("requesting"), "processing", "requesting retains processing semantics");
    equal(PresentationModel.statusTone("executing"), "processing", "executing retains processing semantics");
    equal(PresentationModel.statusTone("completed"), "success", "completed maps to shared success semantics");
    equal(PresentationModel.statusTone("error"), "error", "error retains its existing semantic tone");
    equal(PresentationModel.statusTone("experimental-disabled", "user-disabled"), "disabled", "explicit user disable is distinct from qualification warning");
    const unavailable = fixture({ experimentalEnabled: false }); unavailable.controller.mount();
    equal(unavailable.elements.statusSlot.getAttribute("data-vela-provider-state"), "idle", "unavailable projection retains the trusted provider diagnostic state");
    equal(unavailable.elements.root.getAttribute("data-vela-surface-state"), "experimental-disabled", "production default projects the fixed experimental-disabled state");
    equal(unavailable.elements.statusSlot.getAttribute("data-tone"), "warning", "qualification-blocked experimental-disabled writes the warning semantic attribute");
    equal(unavailable.elements.statusSlot.getAttribute("aria-label"), "t:vela.surfaceStatusExperimentalDisabled · t:vela.surfaceExperimentalStatus", "disabled status remains complete in the live region accessible name");
    equal(unavailable.elements.statusDot.getAttribute("title"), "t:vela.surfaceStatusExperimentalDisabled", "disabled status dot title uses the short summary");
    equal(unavailable.elements.experimentalText.getAttribute("title"), "t:vela.surfaceExperimentalStatus", "disabled detail title preserves the complete untruncated text");
    const localizedDisabled = fixture({ t: (key) => "zh:" + key, experimentalText: "zh:vela.surfaceExperimentalStatus" }); localizedDisabled.controller.mount();
    equal(localizedDisabled.elements.statusSlot.getAttribute("data-tone"), unavailable.elements.statusSlot.getAttribute("data-tone"), "Chinese and English display strings produce the same enum-derived warning tone");
    equal(localizedDisabled.elements.statusDot.getAttribute("title"), "zh:vela.surfaceStatusExperimentalDisabled", "status dot title updates from the localized short summary");
    const emptyDetail = fixture({ experimentalText: "" }); emptyDetail.controller.mount();
    equal(emptyDetail.elements.statusSlot.getAttribute("data-detail-empty"), "true", "Presentation synchronization explicitly selects the narrow summary fallback when detail is empty");
    equal(emptyDetail.elements.statusSlot.getAttribute("aria-label"), "t:vela.surfaceStatusExperimentalDisabled", "empty detail does not duplicate or erase the accessible summary");
    equal(unavailable.elements.composer.disabled, true, "model-independent production default disables the Provider composer");
    equal(unavailable.elements.actionSlot.children[0].disabled, true, "model-independent production default exposes no enabled Send action");
    let opt = fixture({ experimentalEnabled: false }); opt.controller.mount();
    opt.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m", acknowledged: false });
    await opt.controller.enableExperimental(); equal(opt.calls.check.length, 0, "missing acknowledgement cannot start readiness"); equal(opt.controller.getExperimentalState().enabled, false, "missing acknowledgement remains disabled");
    opt = fixture({ experimentalEnabled: false }); opt.controller.mount(); opt.controller.configureExperimental({ endpoint: "http://192.168.1.2:1234/v1/chat/completions", model: "m", acknowledged: true }); await opt.controller.enableExperimental(); equal(opt.calls.check.length, 0, "non-loopback endpoint is rejected before readiness"); equal(opt.controller.getExperimentalState().state, "endpoint-invalid", "invalid endpoint has a distinct local status");
    opt = fixture({ experimentalEnabled: false }); opt.controller.mount(); opt.controller.configureExperimental({ endpoint: "http://localhost:1234/v1/chat/completions", model: "", acknowledged: true }); await opt.controller.enableExperimental(); equal(opt.calls.check.length, 0, "empty model id is rejected before readiness");
    const unavailableModel = fixture({ experimentalEnabled: false, readinessResult: { ready: false, code: "configured-model-not-loaded", modelId: "m", loadedInstances: 0, quantization: null, contextLength: null } }); unavailableModel.controller.mount(); unavailableModel.controller.configureExperimental({ endpoint: "http://[::1]:1234/v1/chat/completions", model: "m", acknowledged: true }); await unavailableModel.controller.enableExperimental(); equal(unavailableModel.controller.getExperimentalState().state, "configured-model-not-loaded", "unloaded requested model is classified separately from other readiness failures"); equal(unavailableModel.elements.composer.disabled, true, "readiness failure keeps Composer disabled");
    const lateReadiness = deferred(); const changing = fixture({ experimentalEnabled: false, readinessPromise: lateReadiness.promise }); changing.controller.mount(); changing.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "old-model", acknowledged: true }); const oldCheck = changing.controller.enableExperimental(); changing.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "new-model", acknowledged: true }); lateReadiness.resolve({ ready: true, modelId: "old-model", loadedInstances: 1, quantization: "Q_TEST", contextLength: 8192 }); const superseded = await oldCheck; equal(superseded.code, "readiness-superseded", "a stale readiness completion is classified as superseded"); equal(changing.controller.getExperimentalState().state, "configuring", "late readiness for a replaced configuration cannot revive the session"); equal(changing.controller.getExperimentalState().enabled, false, "late readiness cannot authorize the replacement model");
    for (const code of ["readiness-network-failed", "readiness-http-failed", "readiness-response-invalid"]) { const readinessError = new Error(code); readinessError.localReadinessCode = code; const classified = fixture({ experimentalEnabled: false, readinessError }); classified.controller.mount(); classified.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234", model: "m", acknowledged: true }); await classified.controller.enableExperimental(); equal(classified.controller.getExperimentalState().state, code, code + " remains distinguishable in local UI state"); }
    const notFound = fixture({ experimentalEnabled: false, readinessResult: { ready: false, code: "configured-model-not-found", modelId: "m", loadedInstances: 0 } }); notFound.controller.mount(); notFound.controller.configureExperimental({ endpoint: "http://localhost:1234", model: "m", acknowledged: true }); await notFound.controller.enableExperimental(); equal(notFound.controller.getExperimentalState().state, "configured-model-not-found", "missing configured model has a distinct local status");
    const ready = fixture({ experimentalEnabled: false }); ready.controller.mount(); ready.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "configured-model", acknowledged: true }); const enabling = ready.controller.enableExperimental(); equal(ready.controller.getExperimentalState().endpoint, "http://127.0.0.1:1234", "A complete chat URL is normalized to the canonical base endpoint"); equal(ready.controller.getExperimentalState().state, "checking", "explicit enable enters checking before readiness completes"); equal(ready.elements.composer.disabled, true, "checking keeps Composer disabled"); await enabling; equal(ready.controller.getExperimentalState().state, "experimental-ready", "matching loaded model enters experimental-ready"); equal(ready.elements.composer.disabled, false, "successful readiness enables Composer"); equal(ready.elements.statusSlot.getAttribute("data-tone"), "idle", "ready Provider returns the visible status to idle semantics"); equal(ready.elements.statusDot.getAttribute("title"), "t:vela.surfaceStatusSetup", "status dot title updates with the projected short summary"); equal(ready.elements.experimentalText.getAttribute("title"), "t:vela.surfaceExperimentalStatus", "detail title remains synchronized after state changes"); equal(ready.calls.check[0].model, "configured-model", "readiness binds the configured model id explicitly"); await ready.controller.enableExperimental(); equal(ready.calls.check.length, 1, "duplicate enable cannot repeat readiness or create another controller");
    ready.controller.configureExperimental({ endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "changed-model", acknowledged: true }); equal(ready.controller.getExperimentalState().state, "configuring", "changing the ready model immediately revokes the old readiness"); equal(ready.elements.composer.disabled, true, "configuration drift disables Composer until another explicit readiness check"); await ready.controller.enableExperimental(); equal(ready.calls.check.length, 2, "changed configuration requires a new explicit readiness check");
    ready.elements.composer.value = "send configured"; ready.elements.composer.emit("input"); ready.elements.actionSlot.children[0].emit("click"); equal(ready.calls.send.length, 1, "ready session can use the existing send facade"); ready.controller.disableExperimental(); equal(ready.calls.cancel, 1, "Disable cancels the active request"); equal(ready.controller.getExperimentalState().state, "disabled", "Disable clears session readiness"); equal(ready.elements.statusSlot.getAttribute("data-tone"), "disabled", "explicit user disable is distinct from qualification warning"); equal(ready.controller.getExperimentalState().acknowledged, false, "Disable clears session acknowledgement"); ready.setProvider({ state: "completed", text: "late qualified ready", errorCode: null }); ready.request.resolve(); await flush(); equal(ready.elements.root.getAttribute("data-vela-surface-state"), "experimental-disabled", "late model response cannot replace disabled state or forge readiness");
    const test = fixture(), e = test.elements;
    await mountEnabled(test);
    equal(e.actionSlot.children.length, 6, "stable action slot installs Send, Cancel, summary, Review, Approve, and Reject once");
    equal(e.actionSlot.children.filter((node) => node.tagName === "BUTTON").length, 5, "fresh production-shaped mount creates the fixed five action buttons");
    const [send, cancel, summary, review, approve, reject] = e.actionSlot.children;
    const textarea = e.composer, transcript = e.transcriptScroll;
    equal(e.composer.getAttribute("aria-label"), "t:vela.surfaceComposerLabel", "composer has a stable accessible name");
    equal(send.getAttribute("aria-label"), "t:vela.surfaceSend", "Send has a stable accessible label");
    equal(cancel.getAttribute("aria-label"), "t:vela.surfaceCancel", "Cancel has a stable accessible label");
    equal(review.getAttribute("aria-label"), "t:vela.surfaceReview", "Review has a stable accessible label");
    equal(approve.getAttribute("aria-label"), "t:vela.surfaceApprove", "Approve has a stable accessible label");
    equal(reject.getAttribute("aria-label"), "t:vela.surfaceReject", "Reject has a stable accessible label");
    check(!send.hidden && cancel.hidden && review.hidden && approve.hidden && reject.hidden, "idle exposes only Send");
    check(send.disabled, "empty composer keeps Send disabled");
    e.composer.value = "draft"; e.composer.emit("input"); check(!send.disabled, "non-empty composer enables Send only in an opted-in fixture"); e.composer.value = ""; e.composer.emit("input");
    const matrix = fixture(); await mountEnabled(matrix); const m = matrix.elements.actionSlot.children; const matrixNodes = m.slice();
    check(!matrix.elements.actionSlot.hidden && !m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "fresh provider and confirmation idle keeps slot visible and exposes only Send");
    matrix.setProvider({ state: "completed", text: "terminal", errorCode: null }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "provider text terminal exposes only Send");
    matrix.setProvider({ state: "failed", text: null, errorCode: "PROVIDER_CONNECTION_FAILED" }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "provider error terminal exposes only Send");
    matrix.setProvider({ state: "cancelled", text: null, errorCode: "PROVIDER_REQUEST_ABORTED" }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "provider cancellation terminal exposes only Send");
    matrix.setProvider({ state: "intent-rejected", text: null, errorCode: null }); matrix.controller.refreshLocale();
    check(!m[0].hidden && m[1].hidden && m[3].hidden && m[4].hidden && m[5].hidden, "intent-rejected is a provider terminal that exposes only Send");
    const intentNotice = fixture(); await mountEnabled(intentNotice); intentNotice.elements.composer.value = "你好"; intentNotice.elements.actionSlot.children[0].emit("click"); intentNotice.setProvider({ state: "intent-rejected", text: null, errorCode: null }); intentNotice.request.resolve(); await flush();
    equal(intentNotice.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceIntentRejected", "intent-rejected uses the fixed localized notice rather than model or internal data");
    check(!intentNotice.elements.actionSlot.children[0].hidden && intentNotice.elements.actionSlot.children[3].hidden && intentNotice.elements.actionSlot.children[4].hidden && intentNotice.elements.actionSlot.children[5].hidden, "intent-rejected restores Send with no Review, Approve, or Reject action");
    const mismatchNotice = fixture(); await mountEnabled(mismatchNotice); mismatchNotice.elements.composer.value = "将当前选中图层的不透明度设置为 50%。"; mismatchNotice.elements.actionSlot.children[0].emit("click"); mismatchNotice.setProvider({ state: "intent-rejected", text: null, errorCode: null, intentReason: "target-mismatch" }); mismatchNotice.request.resolve(); await flush(); equal(mismatchNotice.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceIntentTargetMismatch", "Target mismatch uses an accurate fixed local notice instead of claiming the request was not explicit"); check(mismatchNotice.calls.review === 0 && mismatchNotice.calls.approve === 0, "A mismatched proposal creates no automatic Review or execution authority");
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
    const rejected = fixture(); await mountEnabled(rejected); const r = rejected.elements.actionSlot.children; rejected.setProvider({ state: "proposal-ready", text: null, errorCode: null }); rejected.controller.refreshLocale(); r[3].emit("click"); await flush(); r[5].emit("click"); await flush();
    equal(rejected.calls.reject, 1, "Reject is a private no-argument action");
    check(!r[0].hidden && r[3].hidden && r[4].hidden && r[5].hidden, "rejected confirmation returns to Send without execution action");
    equal(rejected.elements.transcriptScroll.children[1].children[0].textContent, "t:vela.surfaceConfirmationReady", "confirmation has dedicated bounded notice");
    equal(rejected.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceConfirmationRejected", "rejection has dedicated bounded notice");
    const errors = fixture(); await mountEnabled(errors); errors.elements.composer.value = "fail"; errors.elements.actionSlot.children[0].emit("click"); errors.setProvider({ state: "failed", text: null, errorCode: "PROVIDER_CONNECTION_FAILED" }); errors.request.resolve(); await flush();
    equal(errors.elements.transcriptScroll.children[1].children[1].textContent, "t:vela.surfaceProviderConnection", "Transcript receives mapped presentation text");
    check(errors.elements.transcriptScroll.children[1].children[1].textContent.indexOf("PROVIDER_CONNECTION_FAILED") === -1, "Transcript never exposes raw error codes");
    const claim = fixture(); await mountEnabled(claim); claim.elements.composer.value = "将当前选中图层的不透明度设置为 50%。"; claim.elements.actionSlot.children[0].emit("click"); claim.setProvider({ state: "failed", text: "已经修改，已执行，调整完成", errorCode: "PROVIDER_RESPONSE_INVALID" }); claim.request.resolve(); await flush(); const claimTranscript = claim.elements.transcriptScroll.children[1].children.map((node) => node.textContent).join("|"); check(!claimTranscript.includes("已经修改") && !claimTranscript.includes("已执行") && !claimTranscript.includes("调整完成"), "A failed explicit response cannot render model-authored execution claims into transcript"); equal(claim.elements.root.getAttribute("data-vela-surface-state"), "error", "Profile mismatch remains a local error and cannot project completed or proposal-ready");
    errors.elements.composer.value = "recover"; errors.elements.composer.emit("input"); errors.elements.actionSlot.children[0].emit("click");
    check(!errors.elements.actionSlot.children[1].hidden, "a local draft can recover from an error into a new requesting state");
    const late = fixture(); await mountEnabled(late); late.elements.composer.value = "cancel me"; late.elements.actionSlot.children[0].emit("click"); late.elements.actionSlot.children[1].emit("click");
    const lateTranscriptCount = late.elements.transcriptScroll.children[1].children.length; late.setProvider({ state: "completed", text: "late model text", errorCode: null }); late.request.resolve(); await flush();
    equal(late.elements.transcriptScroll.children[1].children.length, lateTranscriptCount, "late response after cancel cannot append transcript state");
    equal(late.elements.root.getAttribute("data-vela-surface-state"), "cancelled", "late response after cancel cannot replace the cancelled presentation projection");
    const sync = fixture({ synchronousRejection: true }); await mountEnabled(sync); sync.elements.composer.value = "keep"; const syncTextarea = sync.elements.composer; sync.elements.actionSlot.children[0].emit("click"); await flush(); equal(sync.elements.composer.value, "keep", "synchronous rejection keeps draft"); equal(sync.elements.composer, syncTextarea, "synchronous rejection preserves textarea");
    const beforeChildren = e.actionSlot.children.slice(); test.controller.suspend(); e.composer.value = "suspended"; test.setProvider({ state: "completed", text: "late", errorCode: null }); test.controller.refreshLocale(); equal(e.composer.value, "suspended", "suspension blocks patches"); test.controller.resume(); check(e.actionSlot.children.every((node, index) => node === beforeChildren[index]), "resume preserves controls DOM identity");
    check(!/errorCode|PROVIDER_|VERIFICATION_UNAVAILABLE/.test(TranscriptView.create.toString()), "Transcript does not map internal codes");
    check(!/requestId|candidateId|planId|authority|nonce|digest/.test(SurfaceController.create.toString()), "Surface controller receives no trusted target identity or execution authority");
    check(!/candidateId|planId|authority|target|context|nonce|digest/.test(ConfirmationView.create.toString()), "confirmation view receives no trusted execution data");
    equal(SurfaceController.validateOpacityInput("0").opacity, 0, "local opacity accepts zero");
    equal(SurfaceController.validateOpacityInput("100").opacity, 100, "local opacity accepts one hundred");
    equal(SurfaceController.validateOpacityInput("57.5").opacity, 57.5, "local opacity accepts a finite decimal");
    for (const invalid of ["-0.1", "100.1", "", "NaN", "Infinity", "abc", "1e2"]) equal(SurfaceController.validateOpacityInput(invalid).opacity, null, "local opacity rejects " + (invalid || "empty input"));
    const local = fixture(); local.controller.mount();
    local.elements.localToggle.emit("click");
    equal(local.elements.localUtility.hidden, false, "local opacity utility opens inline without replacing the composer");
    equal(local.elements.composer.tagName, "TEXTAREA", "opening the local utility preserves the composer node");
    local.elements.localRefresh.emit("click");
    equal(local.calls.localRefresh, 1, "Surface can trigger the bounded local context refresh port");
    equal(local.calls.check.length + local.calls.send.length, 0, "local context refresh does not call Provider readiness or send");
    await flush();
    equal(local.elements.localTargetValue.textContent, "t:vela.contextSelectedLayerOpacity", "refreshed context renders the safe target summary");
    equal(local.elements.localCurrentValue.textContent, "35%", "refreshed context renders current opacity");
    local.elements.localInput.value = "57.5"; local.elements.localInput.emit("input"); local.elements.localCreate.emit("click"); await flush();
    equal(local.calls.localCreate.length, 1, "Provider-unavailable Surface creates a local proposal");
    equal(local.calls.localCreate[0].opacity, 57.5, "local proposal receives only validated opacity");
    equal(local.getLocal().source, "local-manual-opacity", "local proposal state carries a stable non-Provider source");
    equal(local.calls.send.length, 0, "local proposal creation does not send a model request");
    check(!local.elements.actionSlot.children[4].hidden && !local.elements.actionSlot.children[5].hidden, "local proposal enters the existing Approve and Reject confirmation UI");
    equal(local.elements.localNotice.textContent, "t:vela.surfaceLocalProposalReady", "local proposal reports a bounded review-ready notice");
    const localConflict = fixture(); localConflict.controller.mount(); localConflict.elements.localToggle.emit("click"); localConflict.setLocal({ state: "ready", contextLayerIndex: 1, beforeValue: 20 }); localConflict.setProvider({ state: "pending", text: null, errorCode: null }); localConflict.controller.refreshLocale(); localConflict.elements.localInput.value = "40"; localConflict.elements.localCreate.emit("click"); equal(localConflict.calls.localCreate.length, 0, "pending model request blocks a conflicting local proposal");
    const existingProposal = fixture(); existingProposal.controller.mount(); existingProposal.elements.localToggle.emit("click"); existingProposal.setLocal({ state: "ready", contextLayerIndex: 1, beforeValue: 20 }); existingProposal.setConfirmation({ state: "confirmation-ready", beforeValue: 20, proposedValue: 30 }); existingProposal.controller.refreshLocale(); existingProposal.elements.localInput.value = "40"; existingProposal.elements.localCreate.emit("click"); equal(existingProposal.calls.localCreate.length, 0, "existing confirmation cannot be overwritten by a local proposal");
    const lateLocalRefresh = deferred(); const localLifecycle = fixture({ localRefreshRequest: lateLocalRefresh }); localLifecycle.controller.mount(); localLifecycle.elements.localToggle.emit("click"); localLifecycle.elements.localRefresh.emit("click"); localLifecycle.controller.suspend(); lateLocalRefresh.resolve(); await flush(); check(localLifecycle.elements.localNotice.textContent !== "t:vela.surfaceLocalRefreshReady", "suspend ignores a late local context callback"); localLifecycle.controller.resume();
    const rejectedLocal = fixture(); rejectedLocal.controller.mount(); rejectedLocal.elements.localToggle.emit("click"); rejectedLocal.elements.localRefresh.emit("click"); await flush(); rejectedLocal.elements.localInput.value = "60"; rejectedLocal.elements.localCreate.emit("click"); await flush(); rejectedLocal.elements.actionSlot.children[5].emit("click"); await flush(); equal(rejectedLocal.calls.reject, 1, "local proposal reuses the existing reject path"); equal(rejectedLocal.elements.localUtility.hidden, true, "reject closes the inline utility without changing the composer");
    const approvedLocal = fixture(); approvedLocal.controller.mount(); approvedLocal.elements.localToggle.emit("click"); approvedLocal.elements.localRefresh.emit("click"); await flush(); approvedLocal.elements.localInput.value = "65"; approvedLocal.elements.localCreate.emit("click"); await flush(); approvedLocal.elements.actionSlot.children[4].emit("click"); equal(approvedLocal.calls.approve, 1, "local proposal reuses the existing approve execution path"); approvedLocal.setConfirmation({ state: "execution-completed", beforeValue: 35, proposedValue: 65, errorCode: null, moduleRevision: "test" }); approvedLocal.confirmationRequest.resolve(); await flush(); await flush(); equal(approvedLocal.calls.localRefresh, 2, "successful local execution refreshes current opacity through the same context port");
    const staleError = new Error("CONTEXT_STALE"); staleError.code = "CONTEXT_STALE"; const staleLocal = fixture({ approveError: staleError }); staleLocal.controller.mount(); staleLocal.elements.localToggle.emit("click"); staleLocal.elements.localRefresh.emit("click"); await flush(); staleLocal.elements.localInput.value = "70"; staleLocal.elements.localCreate.emit("click"); await flush(); staleLocal.elements.actionSlot.children[4].emit("click"); await flush(); equal(staleLocal.elements.localNotice.textContent, "t:vela.surfaceLocalContextStale", "stale target is rejected with an explicit refresh-and-recreate notice");
    const listenerFixture = fixture(); listenerFixture.controller.mount(); equal(listenerFixture.elements.localToggle.listeners.click.length, 1, "local utility binds its toggle once"); listenerFixture.controller.dispose(); equal(listenerFixture.elements.localToggle.listeners.click.length, 0, "dispose removes local utility listeners");
    check(test.controller.dispose(), "dispose succeeds once");
    console.log("test-vela-surface-controller: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
