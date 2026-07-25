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
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var PresentationModel = options && options.PresentationModel;
        var TranscriptView = options && options.TranscriptView;
        var ComposerView = options && options.ComposerView;
        var elements;
        var presentation;
        var transcript;
        var composer;
        var generation = 1;
        var mounted = false;
        var disposed = false;
        if (!surface || typeof surface.getElementsForTest !== "function" || !provider || typeof provider.send !== "function" || typeof provider.cancel !== "function" || typeof provider.getState !== "function" || !PresentationModel || typeof PresentationModel.create !== "function" || !TranscriptView || typeof TranscriptView.create !== "function" || !ComposerView || typeof ComposerView.create !== "function") {
            throw new Error("VelaSurfaceController requires trusted presentation dependencies.");
        }
        function statusText(state) {
            if (state === "pending") { return t("vela.surfaceStatusPending"); }
            if (state === "completed") { return t("vela.surfaceStatusCompleted"); }
            if (state === "cancelled") { return t("vela.surfaceStatusCancelled"); }
            if (state === "failed") { return t("vela.surfaceStatusFailed"); }
            if (state === "proposal-ready") { return t("vela.surfaceStatusCompleted"); }
            return t("vela.surfaceStatusSetup");
        }
        function renderState(state) {
            var snapshot;
            if (disposed || !elements) { return; }
            snapshot = presentation.apply(state);
            transcript.render(snapshot);
            composer.render(state && state.state);
            elements.statusText.textContent = statusText(state && state.state);
            elements.statusSlot.setAttribute("data-vela-provider-state", state && state.state || "idle");
        }
        function synchronize() {
            if (disposed) { return; }
            renderState(provider.getState());
        }
        function send(message) {
            var capturedGeneration;
            var operation;
            var providerState;
            if (disposed || !mounted || !message || !/\S/.test(message)) { return; }
            try { operation = provider.send(message); }
            catch (ignoredSend) { return; }
            providerState = provider.getState();
            if (!providerState || providerState.state !== "pending") {
                Promise.resolve(operation).then(function () {}, function () {});
                return;
            }
            capturedGeneration = generation + 1;
            generation = capturedGeneration;
            presentation.begin(message);
            composer.clearSubmittedMessage(message);
            composer.render("pending");
            elements.statusText.textContent = statusText("pending");
            Promise.resolve(operation).then(function () {
                if (!disposed && mounted && capturedGeneration === generation) { synchronize(); }
            }, function () {
                if (!disposed && mounted && capturedGeneration === generation) { synchronize(); }
            });
        }
        function cancel() {
            if (disposed || !mounted) { return; }
            generation += 1;
            provider.cancel();
            synchronize();
        }
        function mount() {
            if (disposed || mounted) { return false; }
            elements = surface.getElementsForTest();
            presentation = PresentationModel.create();
            transcript = TranscriptView.create({ root: elements.transcriptScroll, intro: elements.transcriptMessage, t: t });
            composer = ComposerView.create({ composer: elements.composer, actionSlot: elements.actionSlot, t: t, onSend: send, onCancel: cancel });
            mounted = true;
            synchronize();
            return true;
        }
        function suspend() { generation += 1; return !disposed && mounted; }
        function resume() { if (disposed || !mounted) { return false; } synchronize(); return true; }
        function refreshLocale() { if (disposed || !mounted) { return; } transcript.refreshLocale(); composer.refreshLocale(); synchronize(); }
        function dispose() { if (disposed) { return false; } disposed = true; generation += 1; if (transcript) { transcript.dispose(); } if (composer) { composer.dispose(); } return true; }
        return Object.freeze({ mount: mount, suspend: suspend, resume: resume, refreshLocale: refreshLocale, getElementsForTest: function () { return elements; }, dispose: dispose });
    }
    return Object.freeze({ create: create });
}));
