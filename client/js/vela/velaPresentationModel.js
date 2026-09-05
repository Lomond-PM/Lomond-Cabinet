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
    function safePositiveInteger(value) { return Number.isSafeInteger(value) && value >= 1; }
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
        else if (provider === "objective-blocked") { state = "blocked"; }
        else if (provider === "failed" || provider === "intent-rejected") { state = "error"; }
        else if (provider === "cancelled") { state = "cancelled"; }
        else if (provider === "completed" || provider === "local-proposal-handled") { state = "completed"; }
        else if (confirmation === "executing") { state = "executing"; }
        else if (confirmation === "confirmation-ready") { state = "awaiting-confirmation"; }
        else if (confirmation === "review-approved") { state = "awaiting-continuation"; }
        else if (confirmation === "execution-failed") { state = "error"; }
        else if (confirmation === "execution-completed") { state = "completed"; }
        else if (confirmation === "rejected") { state = "cancelled"; }
        else if (provider === "pending") { state = "requesting"; }
        else if (provider === "proposal-ready" || provider === "proposal-reviewing") { state = "reviewing"; }
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
        var transientInvocations = [];
        var activeTransientInvocationId = null;
        var transientRuntimeGeneration = 0;
        var transientSerial = 0;
        var presentationTurnSerial = 0;
        var activePresentationTurnId = null;
        function snapshot() {
            return Object.freeze({
                pending: pending,
                items: Object.freeze(items.slice()),
                terminalGeneration: terminalGeneration
            });
        }
        function transientSnapshot() {
            return Object.freeze({ activeInvocationId: activeTransientInvocationId, presentationTurnId: activePresentationTurnId, runtimeGeneration: transientRuntimeGeneration, invocations: Object.freeze(transientInvocations.map(function (entry) { return Object.freeze({ reasoningInvocationId: entry.reasoningInvocationId, presentationTurnId: entry.presentationTurnId, state: entry.state, reasoningText: entry.reasoningText, text: entry.text, runtimeGeneration: entry.runtimeGeneration, presentationMode: entry.presentationMode, reconciliation: entry.reconciliation, assistantReconciliation: entry.assistantReconciliation }); })) });
        }
        function findTransient(id) { var index; for (index = 0; index < transientInvocations.length; index += 1) { if (transientInvocations[index].reasoningInvocationId === id) { return transientInvocations[index]; } } return null; }
        function applyPresentationEvent(envelope) {
            var event;
            var invocation;
            var type;
            if (!envelope || envelope.type !== "provider-stream-event" || !safePositiveInteger(envelope.runtimeGeneration) || typeof envelope.reasoningInvocationId !== "string" || !envelope.reasoningInvocationId || (envelope.presentationMode !== "assistant-text" && envelope.presentationMode !== "structured") || !envelope.providerEvent || !Object.isFrozen(envelope.providerEvent)) { return transientSnapshot(); }
            if (envelope.runtimeGeneration < transientRuntimeGeneration) { return transientSnapshot(); }
            event = envelope.providerEvent;
            if (typeof event.type !== "string" || typeof event.requestId !== "string" || !safePositiveInteger(event.generation) || typeof event.providerId !== "string" || typeof event.modelId !== "string") { return transientSnapshot(); }
            transientRuntimeGeneration = envelope.runtimeGeneration;
            type = event.type;
            invocation = findTransient(envelope.reasoningInvocationId);
            if (type === "stream-started") {
                if (invocation) { return transientSnapshot(); }
                invocation = { reasoningInvocationId: envelope.reasoningInvocationId, presentationTurnId: activePresentationTurnId, state: "streaming", reasoningText: "", text: "", runtimeGeneration: envelope.runtimeGeneration, presentationMode: envelope.presentationMode, reconciliation: null, assistantReconciliation: null, serial: ++transientSerial };
                transientInvocations.push(invocation);
                activeTransientInvocationId = invocation.reasoningInvocationId;
                return transientSnapshot();
            }
            if (!invocation || invocation.runtimeGeneration !== envelope.runtimeGeneration || invocation.reconciliation !== null || activeTransientInvocationId !== invocation.reasoningInvocationId) { return transientSnapshot(); }
            if (type === "reasoning-delta" && typeof event.text === "string" && event.text.length > 0) { invocation.reasoningText += event.text; }
            else if (type === "text-delta" && invocation.presentationMode === "assistant-text" && typeof event.text === "string" && event.text.length > 0) { invocation.text += event.text; }
            else if (type === "stream-completed" || type === "stream-failed" || type === "stream-cancelled") { invocation.state = type; invocation.reconciliation = "presentation-terminal"; if (activeTransientInvocationId === invocation.reasoningInvocationId) { activeTransientInvocationId = null; } }
            return transientSnapshot();
        }
        function closeTransientForTerminal() { transientInvocations.forEach(function (entry) { entry.assistantReconciliation = "closed"; entry.text = ""; entry.reconciliation = entry.reasoningText ? "retained" : "closed"; }); activeTransientInvocationId = null; }
        function append(kind, text, displayTextKey) {
            var item = Object.freeze({ kind: kind, text: safeText(text), displayTextKey: typeof displayTextKey === "string" ? displayTextKey : null, presentationTurnId: activePresentationTurnId });
            items.push(item);
            return item;
        }
        function begin(message) {
            pending = true;
            presentationTurnSerial += 1;
            activePresentationTurnId = "presentation_turn_" + String(presentationTurnSerial);
            transientInvocations = [];
            activeTransientInvocationId = null;
            transientRuntimeGeneration = 0;
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
            closeTransientForTerminal();
            terminalGeneration += 1;
            if (state === "completed") { if (text) { append("assistant", text, null); } /* A validated structured result may be consumed by the Agent without assistant text. */ }
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
            if (next === "confirmation-ready") { append("notice", "", state && (state.capabilityId === "set-layer-name-v1" || state.valueKind === "string") ? "vela.surfaceConfirmationLayerNameReady" : "vela.surfaceConfirmationReady"); }
            else if (next === "rejected") { append("notice", "", "vela.surfaceConfirmationRejected"); }
            else if (next === "execution-completed") { append("notice", "", "vela.surfaceExecutionCompleted"); }
            else if (next === "execution-failed") { append("error", "", errorDisplayKey(state && state.errorCode)); }
            return snapshot();
        }
        function clearConfirmationTerminal() { if (confirmationState === "execution-completed" || confirmationState === "rejected" || confirmationState === "execution-failed") { confirmationState = "idle"; } return snapshot(); }
        function reset() { items = []; transientInvocations = []; activeTransientInvocationId = null; activePresentationTurnId = null; transientRuntimeGeneration = 0; pending = false; proposalReviewPending = false; confirmationState = "idle"; terminalGeneration += 1; return snapshot(); }
        return Object.freeze({ begin: begin, apply: apply, applyPresentationEvent: applyPresentationEvent, applyConfirmation: applyConfirmation, clearConfirmationTerminal: clearConfirmationTerminal, reset: reset, getSnapshot: snapshot, getTransientSnapshot: transientSnapshot });
    }
    return Object.freeze({ create: create, errorDisplayKey: errorDisplayKey, projectSurfaceState: projectSurfaceState, statusTone: statusTone });
}));
