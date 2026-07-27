(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaSurfaceController")) {
        Object.defineProperty(root, "VelaSurfaceController", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function create(options) {
        var surface = options && options.surface;
        var provider = options && options.provider;
        var confirmation = options && options.confirmation;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var PresentationModel = options && options.PresentationModel;
        var TranscriptView = options && options.TranscriptView;
        var ComposerView = options && options.ComposerView;
        var ConfirmationView = options && options.ConfirmationView;
        var elements;
        var presentation;
        var transcript;
        var composer;
        var confirmationView;
        var generation = 1;
        var mounted = false;
        var suspended = false;
        var disposed = false;
        var suppressConfirmationTerminal = false;
        if (!surface || typeof surface.getElementsForTest !== "function" || !provider || typeof provider.send !== "function" || typeof provider.cancel !== "function" || typeof provider.getState !== "function" || !confirmation || typeof confirmation.review !== "function" || typeof confirmation.approve !== "function" || typeof confirmation.reject !== "function" || typeof confirmation.getState !== "function" || !PresentationModel || typeof PresentationModel.create !== "function" || !TranscriptView || typeof TranscriptView.create !== "function" || !ComposerView || typeof ComposerView.create !== "function" || !ConfirmationView || typeof ConfirmationView.create !== "function") { throw new Error("VelaSurfaceController requires trusted presentation dependencies."); }
        function actionState(providerState, confirmationState) {
            var current = confirmationState && confirmationState.state;
            if (current === "executing") { return "none"; }
            if (current === "confirmation-ready") { return "confirm"; }
            if (current === "execution-completed" || current === "rejected" || current === "execution-failed") { return "send"; }
            if (providerState && providerState.state === "pending") { return "cancel"; }
            if (providerState && providerState.state === "proposal-ready") { return "review"; }
            return "send";
        }
        function statusText(providerState, confirmationState) {
            var current = confirmationState && confirmationState.state;
            if (current === "executing") { return t("vela.surfaceStatusExecuting"); }
            if (current === "confirmation-ready") { return t("vela.surfaceStatusConfirmation"); }
            if (current === "execution-completed") { return t("vela.surfaceStatusExecutionCompleted"); }
            if (current === "rejected") { return t("vela.surfaceStatusRejected"); }
            if (current === "execution-failed") { return t("vela.surfaceStatusExecutionFailed"); }
            if (providerState && providerState.state === "pending") { return t("vela.surfaceStatusPending"); }
            if (providerState && providerState.state === "completed") { return t("vela.surfaceStatusCompleted"); }
            if (providerState && providerState.state === "cancelled") { return t("vela.surfaceStatusCancelled"); }
            if (providerState && providerState.state === "failed") { return t("vela.surfaceStatusFailed"); }
            if (providerState && providerState.state === "intent-rejected") { return t("vela.surfaceStatusIntentRejected"); }
            if (providerState && providerState.state === "proposal-ready") { return t("vela.surfaceStatusProposalReady"); }
            return t("vela.surfaceStatusSetup");
        }
        function effectiveConfirmationState(state) {
            var current = state && state.state;
            if (current === "confirmation-ready" || current === "executing") { suppressConfirmationTerminal = false; }
            if (suppressConfirmationTerminal && (current === "execution-completed" || current === "rejected" || current === "execution-failed")) {
                return Object.freeze({ state: "idle", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: state && state.moduleRevision || null });
            }
            return state;
        }
        function synchronize() {
            var providerState;
            var confirmationState;
            var snapshot;
            var action;
            if (disposed || suspended || !elements) { return; }
            providerState = provider.getState();
            confirmationState = effectiveConfirmationState(confirmation.getState());
            snapshot = presentation.apply(providerState);
            snapshot = presentation.applyConfirmation(confirmationState, snapshot);
            transcript.render(snapshot);
            action = actionState(providerState, confirmationState);
            composer.render(action);
            confirmationView.render(action, confirmationState);
            elements.statusText.textContent = statusText(providerState, confirmationState);
            elements.statusSlot.setAttribute("data-vela-provider-state", providerState && providerState.state || "idle");
            elements.statusSlot.setAttribute("data-vela-confirmation-state", confirmationState && confirmationState.state || "idle");
        }
        function complete(operation, capturedGeneration) { Promise.resolve(operation).then(function () { if (!disposed && !suspended && mounted && capturedGeneration === generation) { synchronize(); } }, function () { if (!disposed && !suspended && mounted && capturedGeneration === generation) { synchronize(); } }); }
        function send(message) {
            var operation;
            var providerState;
            if (disposed || suspended || !mounted || !message || !/\S/.test(message)) { return; }
            try { operation = provider.send(message); } catch (ignored) { return; }
            providerState = provider.getState();
            if (!providerState || providerState.state !== "pending") { Promise.resolve(operation).then(function () {}, function () {}); return; }
            generation += 1;
            presentation.begin(message);
            suppressConfirmationTerminal = true;
            presentation.clearConfirmationTerminal();
            composer.clearSubmittedMessage(message);
            synchronize();
            complete(operation, generation);
        }
        function cancel() { if (disposed || suspended || !mounted) { return; } generation += 1; provider.cancel(); synchronize(); }
        function review() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.review(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function approve() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.approve(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function reject() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.reject(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function mount() {
            if (disposed || mounted) { return false; }
            elements = surface.getElementsForTest();
            presentation = PresentationModel.create();
            transcript = TranscriptView.create({ root: elements.transcriptScroll, intro: elements.transcriptMessage, t: t });
            composer = ComposerView.create({ composer: elements.composer, actionSlot: elements.actionSlot, t: t, onSend: send, onCancel: cancel });
            confirmationView = ConfirmationView.create({ actionSlot: elements.actionSlot, t: t, onReview: review, onApprove: approve, onReject: reject });
            mounted = true; synchronize(); return true;
        }
        function suspend() { if (disposed || !mounted || suspended) { return false; } suspended = true; generation += 1; return true; }
        function resume() { if (disposed || !mounted || !suspended) { return false; } suspended = false; synchronize(); return true; }
        function refreshLocale() { if (disposed || !mounted) { return; } transcript.refreshLocale(); composer.refreshLocale(); confirmationView.refreshLocale(); synchronize(); }
        function dispose() { if (disposed) { return false; } disposed = true; generation += 1; if (transcript) { transcript.dispose(); } if (composer) { composer.dispose(); } if (confirmationView) { confirmationView.dispose(); } return true; }
        return Object.freeze({ mount: mount, suspend: suspend, resume: resume, refreshLocale: refreshLocale, getElementsForTest: function () { return elements; }, dispose: dispose });
    }
    return Object.freeze({ create: create });
}));
