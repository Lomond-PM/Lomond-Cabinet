(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaPresentationModel")) {
        Object.defineProperty(root, "VelaPresentationModel", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var ERROR_DISPLAY_KEYS = Object.freeze({
        "VERIFICATION_UNAVAILABLE": "vela.surfaceContextUnavailable",
        "PROVIDER_CONNECTION_FAILED": "vela.surfaceProviderConnection",
        "PROVIDER_TIMEOUT": "vela.surfaceProviderTimeout",
        "PROVIDER_REQUEST_ABORTED": "vela.surfaceProviderCancelled",
        "PROVIDER_HTTP_ERROR": "vela.surfaceProviderResponse",
        "PROVIDER_RESPONSE_INVALID": "vela.surfaceProviderResponse",
        "PROVIDER_RESPONSE_TOO_LARGE": "vela.surfaceProviderResponse",
        "PROVIDER_CONFIG_INVALID": "vela.surfaceProviderConfiguration",
        "RUNTIME_CAPABILITY_UNAVAILABLE": "vela.surfaceRuntimeUnavailable",
        "LIFECYCLE_BLOCKED": "vela.surfaceRuntimeUnavailable",
        "REVIEW_REQUIRED": "vela.surfaceReviewRequired",
        "PERMISSION_DENIED": "vela.surfacePermissionDenied",
        "SCHEMA_VALIDATION_FAILED": "vela.surfaceGenericError",
        "PAYLOAD_BUDGET_EXCEEDED": "vela.surfaceGenericError",
        "UNKNOWN_TARGET": "vela.surfaceNoActionableTarget",
        "CONTEXT_STALE": "vela.surfaceGenericError",
        "CONTEXT_VALUE_EVALUATION_DISALLOWED": "vela.surfaceGenericError",
        "CONTEXT_VALUE_UNSUPPORTED": "vela.surfaceGenericError",
        "CONTEXT_VALUE_INVALID": "vela.surfaceGenericError"
    });

    function safeText(value) {
        return typeof value === "string" ? value : "";
    }
    function errorDisplayKey(code) {
        return typeof code === "string" && Object.prototype.hasOwnProperty.call(ERROR_DISPLAY_KEYS, code) ? ERROR_DISPLAY_KEYS[code] : "vela.surfaceGenericError";
    }
    function statusTone(state, disabledReason) {
        var Contract = typeof StatusToneContract !== "undefined" ? StatusToneContract : typeof require === "function" ? require("../statusTone.js").StatusToneContract : null;
        if (state === "experimental-disabled" && disabledReason === "user-disabled") { return "disabled"; }
        return Contract && Contract.toneForState ? Contract.toneForState(state) : "idle";
    }
    function projectSurfaceState(providerState, confirmationState, composerValue, experimentalEnabled, experimentalState, activationPolicy, disabledReason) {
        var provider = providerState && typeof providerState.state === "string" ? providerState.state : "idle";
        var confirmation = confirmationState && typeof confirmationState.state === "string" ? confirmationState.state : "idle";
        var state = "idle";
        if (experimentalEnabled !== true) { state = experimentalState === "configuring" || experimentalState === "checking" || experimentalState === "unavailable" ? "experimental-" + experimentalState : experimentalState === "disabled" || experimentalState === "ready" ? "experimental-disabled" : experimentalState || "experimental-disabled"; }
        else if (confirmation === "executing") { state = "executing"; }
        else if (confirmation === "confirmation-ready") { state = "awaiting-confirmation"; }
        else if (confirmation === "review-approved") { state = "awaiting-continuation"; }
        else if (confirmation === "execution-failed") { state = "error"; }
        else if (confirmation === "execution-completed") { state = "completed"; }
        else if (confirmation === "rejected") { state = "cancelled"; }
        else if (provider === "pending") { state = "requesting"; }
        else if (provider === "proposal-ready" || provider === "proposal-reviewing") { state = "reviewing"; }
        else if (provider === "objective-blocked") { state = "blocked"; }
        else if (provider === "failed" || provider === "intent-rejected") { state = "error"; }
        else if (provider === "cancelled") { state = "cancelled"; }
        else if (provider === "completed" || provider === "local-proposal-handled") { state = "completed"; }
        else if (typeof composerValue === "string" && /\S/.test(composerValue)) { state = "composing"; }
        return Object.freeze({
            state: state,
            tone: statusTone(state, disabledReason),
            experimental: activationPolicy && activationPolicy.releaseMode === "experimental-preview",
            qualified: !!(activationPolicy && activationPolicy.qualifiedDefaultModelId),
            manualOptInRequired: !!(activationPolicy && activationPolicy.experimentalOptInAllowed && !activationPolicy.productionEnabled),
            productionEnabled: !!(activationPolicy && activationPolicy.productionEnabled),
            productionBlockReason: activationPolicy && activationPolicy.productionBlockReason || null
        });
    }
    function create() {
        var items = [];
        var pending = false;
        var terminalGeneration = 0;
        var confirmationState = "idle";
        var proposalReviewPending = false;
        function snapshot() {
            return Object.freeze({
                pending: pending,
                items: Object.freeze(items.slice()),
                terminalGeneration: terminalGeneration
            });
        }
        function append(kind, text, displayTextKey) {
            var item = Object.freeze({ kind: kind, text: safeText(text), displayTextKey: typeof displayTextKey === "string" ? displayTextKey : null });
            items.push(item);
            return item;
        }
        function begin(message) {
            pending = true;
            append("user", message, null);
            return snapshot();
        }
        function apply(providerState) {
            var state = providerState && typeof providerState.state === "string" ? providerState.state : "failed";
            var text = providerState && typeof providerState.text === "string" ? providerState.text : "";
            var code = providerState && typeof providerState.errorCode === "string" ? providerState.errorCode : null;
            var intentReason = providerState && typeof providerState.intentReason === "string" ? providerState.intentReason : null;
            if (state === "pending") { pending = true; return snapshot(); }
            if (!pending && !proposalReviewPending) { return snapshot(); }
            if (proposalReviewPending && (state === "proposal-reviewing" || state === "idle" || state === "local-proposal-handled")) {
                if (state === "idle" || state === "local-proposal-handled") {
                    proposalReviewPending = false;
                    if (code) { terminalGeneration += 1; append("error", "", errorDisplayKey(code)); }
                }
                return snapshot();
            }
            pending = false;
            terminalGeneration += 1;
            if (state === "completed" && text) { append("assistant", text, null); }
            else if (state === "local-proposal-handled") { /* Trusted local handling needs no fabricated assistant text. */ }
            else if (state === "proposal-ready") { proposalReviewPending = true; append("notice", "", "vela.surfaceLocalProposalNotice"); }
            else if (state === "intent-rejected") { append("notice", "", intentReason === "target-mismatch" ? "vela.surfaceIntentTargetMismatch" : "vela.surfaceIntentRejected"); }
            else if (state === "objective-blocked") { append(code === "REVIEW_REQUIRED" ? "notice" : "error", "", errorDisplayKey(code)); }
            else if (state === "cancelled") { append("error", "", errorDisplayKey(code || "PROVIDER_REQUEST_ABORTED")); }
            else { append("error", "", errorDisplayKey(code || "PROVIDER_RESPONSE_INVALID")); }
            if (state !== "proposal-ready" && state !== "proposal-reviewing") { proposalReviewPending = false; }
            return snapshot();
        }
        function applyConfirmation(state, currentSnapshot) {
            var next = state && typeof state.state === "string" ? state.state : "idle";
            if (next === confirmationState) { return currentSnapshot || snapshot(); }
            confirmationState = next;
            if (next === "confirmation-ready") { append("notice", "", "vela.surfaceConfirmationReady"); }
            else if (next === "rejected") { append("notice", "", "vela.surfaceConfirmationRejected"); }
            else if (next === "execution-completed") { append("notice", "", "vela.surfaceExecutionCompleted"); }
            else if (next === "execution-failed") { append("error", "", errorDisplayKey(state && state.errorCode)); }
            return snapshot();
        }
        function clearConfirmationTerminal() { if (confirmationState === "execution-completed" || confirmationState === "rejected" || confirmationState === "execution-failed") { confirmationState = "idle"; } return snapshot(); }
        function reset() { items = []; pending = false; proposalReviewPending = false; confirmationState = "idle"; terminalGeneration += 1; return snapshot(); }
        return Object.freeze({ begin: begin, apply: apply, applyConfirmation: applyConfirmation, clearConfirmationTerminal: clearConfirmationTerminal, reset: reset, getSnapshot: snapshot });
    }
    return Object.freeze({ create: create, errorDisplayKey: errorDisplayKey, projectSurfaceState: projectSurfaceState, statusTone: statusTone });
}));
