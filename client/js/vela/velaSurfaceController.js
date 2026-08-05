(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaSurfaceController")) {
        Object.defineProperty(root, "VelaSurfaceController", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function validateOpacityInput(value) {
        var trimmed;
        var numeric;
        if (typeof value !== "string") { return Object.freeze({ state: "invalid", opacity: null }); }
        trimmed = value.replace(/^\s+|\s+$/g, "");
        if (!trimmed) { return Object.freeze({ state: "required", opacity: null }); }
        if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) { return Object.freeze({ state: "invalid", opacity: null }); }
        numeric = Number(trimmed);
        if (!isFinite(numeric) || numeric < 0 || numeric > 100) { return Object.freeze({ state: "invalid", opacity: null }); }
        return Object.freeze({ state: "valid", opacity: numeric });
    }
    function create(options) {
        var surface = options && options.surface;
        var provider = options && options.provider;
        var confirmation = options && options.confirmation;
        var localOpacity = options && options.localOpacity;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var PresentationModel = options && options.PresentationModel;
        var TranscriptView = options && options.TranscriptView;
        var ComposerView = options && options.ComposerView;
        var ConfirmationView = options && options.ConfirmationView;
        var ActivationPolicy = options && options.ActivationPolicy;
        var activationPolicy = ActivationPolicy && typeof ActivationPolicy.getPolicy === "function" ? ActivationPolicy.getPolicy() : null;
        var experimentalEnabled = false;
        var onExperimentalStateChange = options && typeof options.onExperimentalStateChange === "function" ? options.onExperimentalStateChange : function () {};
        var experimentalState = experimentalEnabled ? "ready" : "disabled";
        var experimentalDisabledReason = "qualification-required";
        var experimentalConfig = { endpoint: "", model: "", acknowledged: false };
        var readiness = null;
        var elements;
        var presentation;
        var transcript;
        var composer;
        var confirmationView;
        var generation = 1;
        var localGeneration = 1;
        var mounted = false;
        var suspended = false;
        var disposed = false;
        var suppressConfirmationTerminal = false;
        var localOpen = false;
        var localPending = false;
        var localCandidateOwned = false;
        var localNoticeKey = "";
        var localNoticeError = false;
        var localListeners = [];
        if (!surface || typeof surface.getElementsForTest !== "function" || !provider || typeof provider.send !== "function" || typeof provider.cancel !== "function" || typeof provider.getState !== "function" || !confirmation || typeof confirmation.review !== "function" || typeof confirmation.approve !== "function" || typeof confirmation.reject !== "function" || typeof confirmation.getState !== "function" || !localOpacity || typeof localOpacity.refresh !== "function" || typeof localOpacity.create !== "function" || typeof localOpacity.getState !== "function" || !PresentationModel || typeof PresentationModel.create !== "function" || !TranscriptView || typeof TranscriptView.create !== "function" || !ComposerView || typeof ComposerView.create !== "function" || !ConfirmationView || typeof ConfirmationView.create !== "function" || !ActivationPolicy || typeof ActivationPolicy.isTrustedPolicy !== "function" || !ActivationPolicy.isTrustedPolicy(activationPolicy) || activationPolicy.experimentalOptInAllowed !== true || activationPolicy.productionEnabled !== false) { throw new Error("VelaSurfaceController requires trusted presentation dependencies."); }
        function listen(node, eventName, handler) { node.addEventListener(eventName, handler); localListeners.push({ node: node, eventName: eventName, handler: handler }); }
        function replaceIndex(text, index) { return String(text).replace("{index}", String(index)); }
        function localConflict(providerState, confirmationState) {
            var providerCurrent = providerState && providerState.state;
            var confirmationCurrent = confirmationState && confirmationState.state;
            return providerCurrent === "pending" || providerCurrent === "proposal-ready" || confirmationCurrent === "confirmation-ready" || confirmationCurrent === "executing";
        }
        function localErrorKey(error) {
            var code = error && typeof error.code === "string" ? error.code : "";
            if (code === "UNKNOWN_TARGET") { return "vela.surfaceLocalNoTarget"; }
            if (code === "CONTEXT_STALE" || code === "LIFECYCLE_BLOCKED") { return "vela.surfaceLocalContextStale"; }
            return "vela.surfaceLocalRefreshFailed";
        }
        function renderLocal(providerState, confirmationState) {
            var state;
            var validation;
            var conflict;
            var hasTarget;
            if (!elements || !elements.localUtility) { return; }
            state = localOpacity.getState() || { state: "idle" };
            validation = validateOpacityInput(elements.localInput.value);
            conflict = localConflict(providerState, confirmationState);
            hasTarget = state.state === "ready" && typeof state.beforeValue === "number" && isFinite(state.beforeValue);
            elements.localUtility.hidden = !localOpen;
            elements.localToggle.setAttribute("aria-expanded", localOpen ? "true" : "false");
            elements.localToggle.disabled = disposed || suspended || (!localOpen && conflict);
            elements.localTargetValue.textContent = typeof state.contextLayerIndex === "number" ? replaceIndex(t("vela.contextSelectedLayerOpacity"), state.contextLayerIndex) : state.targetSummary || t("vela.surfaceLocalNoTarget");
            elements.localTargetValue.setAttribute("title", elements.localTargetValue.textContent);
            elements.localTypeValue.textContent = t("vela.surfaceLocalOpacityType");
            elements.localCurrentValue.textContent = hasTarget ? String(state.beforeValue) + "%" : "—";
            elements.localInput.disabled = localPending || conflict || !hasTarget;
            elements.localRefresh.disabled = localPending || conflict;
            elements.localCreate.disabled = localPending || conflict || !hasTarget || validation.state !== "valid";
            elements.localValidation.textContent = validation.state === "required" && elements.localInput.value !== "" ? t("vela.manualOpacityRequired") : validation.state === "invalid" ? t("vela.manualOpacityInvalid") : "";
            elements.localValidation.className = "vela-local-validation" + (elements.localValidation.textContent ? " is-error" : "");
            elements.localNotice.textContent = localNoticeKey ? t(localNoticeKey) : "";
            elements.localNotice.className = "vela-local-notice" + (localNoticeError ? " is-error" : "");
        }
        function settleLocal(operation, capturedGeneration, successKey, closeOnSuccess) {
            Promise.resolve(operation).then(function () {
                if (disposed || suspended || capturedGeneration !== localGeneration) { return; }
                localPending = false;
                localNoticeKey = successKey || "";
                localNoticeError = false;
                if (closeOnSuccess) { localOpen = false; }
                synchronize();
            }, function (error) {
                if (disposed || suspended || capturedGeneration !== localGeneration) { return; }
                localPending = false;
                localNoticeKey = localErrorKey(error);
                localNoticeError = true;
                synchronize();
            });
        }
        function toggleLocal() { if (disposed || suspended || !mounted) { return; } localOpen = !localOpen; localNoticeKey = ""; localNoticeError = false; synchronize(); }
        function closeLocal() { if (disposed || suspended || !mounted) { return; } localOpen = false; localNoticeKey = ""; localNoticeError = false; synchronize(); }
        function refreshLocal() {
            var operation;
            var capturedGeneration;
            if (disposed || suspended || !mounted || localPending || localConflict(provider.getState(), confirmation.getState())) { return; }
            localGeneration += 1;
            capturedGeneration = localGeneration;
            localPending = true;
            localNoticeKey = "vela.surfaceLocalRefreshing";
            localNoticeError = false;
            try { operation = localOpacity.refresh(); } catch (error) { operation = Promise.reject(error); }
            synchronize();
            settleLocal(operation, capturedGeneration, "vela.surfaceLocalRefreshReady", false);
        }
        function createLocalCandidate() {
            var validation;
            var operation;
            var capturedGeneration;
            var localState;
            if (disposed || suspended || !mounted || localPending || localConflict(provider.getState(), confirmation.getState())) { return; }
            validation = validateOpacityInput(elements.localInput.value);
            localState = localOpacity.getState();
            if (validation.state !== "valid" || !localState || localState.state !== "ready") { renderLocal(provider.getState(), confirmation.getState()); return; }
            localGeneration += 1;
            capturedGeneration = localGeneration;
            localPending = true;
            localNoticeKey = "";
            try { operation = localOpacity.create({ opacity: validation.opacity }); } catch (error) { operation = Promise.reject(error); }
            Promise.resolve(operation).then(function () {
                if (disposed || suspended || capturedGeneration !== localGeneration) { return; }
                localPending = false;
                localCandidateOwned = true;
                localNoticeKey = "vela.surfaceLocalProposalReady";
                localNoticeError = false;
                synchronize();
            }, function (error) {
                if (disposed || suspended || capturedGeneration !== localGeneration) { return; }
                localPending = false;
                localNoticeKey = localErrorKey(error);
                localNoticeError = true;
                synchronize();
            });
            synchronize();
        }
        function actionState(providerState, confirmationState) {
            var current = confirmationState && confirmationState.state;
            if (current === "executing") { return "none"; }
            if (current === "confirmation-ready") { return "confirm"; }
            if (current === "execution-completed" || current === "rejected" || current === "execution-failed") { return "send"; }
            if (providerState && providerState.state === "pending") { return "cancel"; }
            if (providerState && providerState.state === "proposal-ready") { return "review"; }
            return "send";
        }
        function projectedStatusText(state) {
            var keys = {
                "experimental-unavailable": "vela.surfaceStatusExperimentalUnavailable",
                "experimental-disabled": "vela.surfaceStatusExperimentalDisabled",
                "experimental-configuring": "vela.surfaceStatusExperimentalConfiguring",
                "experimental-checking": "vela.surfaceStatusExperimentalChecking",
                "endpoint-invalid": "vela.surfaceStatusEndpointInvalid",
                "readiness-network-failed": "vela.surfaceStatusReadinessNetworkFailed",
                "readiness-http-failed": "vela.surfaceStatusReadinessHttpFailed",
                "readiness-response-invalid": "vela.surfaceStatusReadinessResponseInvalid",
                "configured-model-not-found": "vela.surfaceStatusModelNotFound",
                "configured-model-not-loaded": "vela.surfaceStatusModelNotLoaded",
                "idle": "vela.surfaceStatusSetup",
                "composing": "vela.surfaceStatusComposing",
                "requesting": "vela.surfaceStatusPending",
                "reviewing": "vela.surfaceStatusProposalReady",
                "awaiting-confirmation": "vela.surfaceStatusConfirmation",
                "executing": "vela.surfaceStatusExecuting",
                "completed": "vela.surfaceStatusCompleted",
                "cancelled": "vela.surfaceStatusCancelled",
                "error": "vela.surfaceStatusFailed"
            };
            return t(keys[state] || "vela.surfaceStatusFailed");
        }
        function synchronizeStatusAccessibility() {
            var primary = elements.statusText.textContent || "";
            var experimental = elements.experimentalText && elements.experimentalText.textContent || "";
            var complete = primary && experimental && primary !== experimental ? primary + " · " + experimental : primary || experimental;
            elements.statusSlot.setAttribute("aria-label", complete);
            elements.statusDot.setAttribute("title", primary || experimental);
            elements.experimentalText.setAttribute("title", experimental);
            elements.statusSlot.setAttribute("data-detail-empty", experimental ? "false" : "true");
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
            var projection;
            if (disposed || suspended || !elements) { return; }
            providerState = provider.getState();
            confirmationState = effectiveConfirmationState(confirmation.getState());
            snapshot = presentation.apply(providerState);
            snapshot = presentation.applyConfirmation(confirmationState, snapshot);
            transcript.render(snapshot);
            action = actionState(providerState, confirmationState);
            projection = PresentationModel.projectSurfaceState(providerState, confirmationState, elements.composer.value, experimentalEnabled, experimentalState, activationPolicy, experimentalDisabledReason);
            if (!experimentalEnabled && action !== "confirm" && action !== "none") { action = "send"; }
            composer.render(action, experimentalEnabled);
            confirmationView.render(action, confirmationState);
            elements.statusText.textContent = projectedStatusText(projection.state);
            elements.root.setAttribute("data-vela-surface-state", projection.state);
            elements.statusSlot.setAttribute("data-tone", projection.tone);
            elements.statusSlot.setAttribute("data-vela-provider-state", providerState && providerState.state || "idle");
            elements.statusSlot.setAttribute("data-vela-confirmation-state", confirmationState && confirmationState.state || "idle");
            synchronizeStatusAccessibility();
            renderLocal(providerState, confirmationState);
        }
        function complete(operation, capturedGeneration) { Promise.resolve(operation).then(function () { if (!disposed && !suspended && mounted && capturedGeneration === generation) { synchronize(); } }, function () { if (!disposed && !suspended && mounted && capturedGeneration === generation) { synchronize(); } }); }
        function send(message) {
            var operation;
            var providerState;
            if (disposed || suspended || !mounted || !experimentalEnabled || !message || !/\S/.test(message)) { return; }
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
        function experimentalSnapshot() { return Object.freeze({ state: experimentalState, enabled: experimentalEnabled, acknowledged: experimentalConfig.acknowledged === true, endpoint: experimentalConfig.endpoint, model: experimentalConfig.model, readiness: readiness }); }
        function supersededSnapshot() { var snapshot = experimentalSnapshot(); return Object.freeze({ state: snapshot.state, enabled: snapshot.enabled, acknowledged: snapshot.acknowledged, endpoint: snapshot.endpoint, model: snapshot.model, readiness: snapshot.readiness, code: "readiness-superseded" }); }
        function notifyExperimental() { onExperimentalStateChange(experimentalSnapshot()); }
        function normalizeEndpoint(value) { var match = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([1-9][0-9]{0,4})(?:\/|\/v1\/chat\/completions)?$/.exec(value); return match && Number(match[2]) <= 65535 ? "http://" + match[1] + ":" + match[2] : ""; }
        function configureExperimental(input) {
            var endpoint = input && typeof input.endpoint === "string" ? input.endpoint.replace(/^\s+|\s+$/g, "") : "";
            var model = input && typeof input.model === "string" ? input.model.replace(/^\s+|\s+$/g, "") : "";
            var canonicalEndpoint = normalizeEndpoint(endpoint);
            var changed = (canonicalEndpoint || endpoint) !== experimentalConfig.endpoint || model !== experimentalConfig.model;
            var providerState;
            if (changed && (experimentalEnabled || experimentalState === "checking")) {
                generation += 1;
                providerState = provider.getState();
                if (providerState && providerState.state === "pending") { provider.cancel(); }
                experimentalEnabled = false;
                readiness = null;
            }
            experimentalConfig = { endpoint: canonicalEndpoint || endpoint, model: model, acknowledged: !!(input && input.acknowledged === true) };
            experimentalDisabledReason = "qualification-required";
            if (!experimentalEnabled && (experimentalState !== "checking" || changed)) { experimentalState = endpoint && !canonicalEndpoint ? "endpoint-invalid" : canonicalEndpoint && model ? "configuring" : "disabled"; readiness = null; }
            if (mounted) { synchronize(); }
            notifyExperimental();
            return experimentalSnapshot();
        }
        function enableExperimental() {
            var capturedGeneration;
            if (disposed || suspended || !mounted || activationPolicy.experimentalOptInAllowed !== true || activationPolicy.productionEnabled === true || experimentalEnabled || experimentalState === "checking") { return Promise.resolve(experimentalSnapshot()); }
            if (!normalizeEndpoint(experimentalConfig.endpoint)) { experimentalState = "endpoint-invalid"; synchronize(); notifyExperimental(); return Promise.resolve(experimentalSnapshot()); }
            if (!experimentalConfig.acknowledged || !experimentalConfig.model || typeof provider.check !== "function") { experimentalState = "experimental-unavailable"; synchronize(); notifyExperimental(); return Promise.resolve(experimentalSnapshot()); }
            generation += 1;
            capturedGeneration = generation;
            experimentalState = "checking";
            readiness = null;
            synchronize();
            notifyExperimental();
            return Promise.resolve(provider.check({ endpoint: experimentalConfig.endpoint, model: experimentalConfig.model })).then(function (result) {
                if (disposed || capturedGeneration !== generation || experimentalState !== "checking") { return supersededSnapshot(); }
                if (!result || result.ready !== true || result.modelId !== experimentalConfig.model) { experimentalState = result && result.code || "readiness-response-invalid"; readiness = result || null; }
                else { experimentalState = "experimental-ready"; experimentalEnabled = true; readiness = result; }
                synchronize(); notifyExperimental(); return experimentalSnapshot();
            }, function (error) {
                if (!disposed && capturedGeneration === generation && experimentalState === "checking") { experimentalState = error && error.localReadinessCode || "readiness-network-failed"; experimentalEnabled = false; readiness = null; synchronize(); notifyExperimental(); }
                return capturedGeneration !== generation ? supersededSnapshot() : experimentalSnapshot();
            });
        }
        function disableExperimental() {
            var providerState;
            if (disposed || !mounted) { return false; }
            generation += 1;
            providerState = provider.getState();
            if (providerState && providerState.state === "pending") { provider.cancel(); }
            experimentalEnabled = false;
            experimentalState = "disabled";
            experimentalDisabledReason = "user-disabled";
            experimentalConfig = { endpoint: experimentalConfig.endpoint, model: experimentalConfig.model, acknowledged: false };
            readiness = null;
            synchronize(); notifyExperimental(); return true;
        }
        function review() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.review(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function approve() {
            var operation;
            var capturedGeneration;
            var refreshOperation;
            var wasLocal = localCandidateOwned;
            if (disposed || suspended || !mounted) { return; }
            generation += 1;
            capturedGeneration = generation;
            try { operation = confirmation.approve(); } catch (ignored) { return; }
            synchronize();
            if (!wasLocal) { complete(operation, capturedGeneration); return; }
            Promise.resolve(operation).then(function () {
                if (disposed || suspended || capturedGeneration !== generation) { return; }
                localCandidateOwned = false;
                localNoticeKey = "vela.surfaceLocalApplySucceeded";
                localNoticeError = false;
                synchronize();
                try { refreshOperation = localOpacity.refresh(); } catch (error) { refreshOperation = Promise.reject(error); }
                return Promise.resolve(refreshOperation).then(function () { if (!disposed && !suspended && capturedGeneration === generation) { synchronize(); } }, function () { if (!disposed && !suspended && capturedGeneration === generation) { localNoticeKey = "vela.surfaceLocalRefreshFailed"; localNoticeError = true; synchronize(); } });
            }, function () {
                var failedState;
                if (!disposed && !suspended && capturedGeneration === generation) {
                    failedState = localOpacity.getState();
                    localNoticeKey = failedState && failedState.state === "stale" ? "vela.surfaceLocalContextStale" : "vela.surfaceLocalApplyFailed";
                    localNoticeError = true;
                    synchronize();
                }
            });
        }
        function reject() {
            var operation;
            var wasLocal = localCandidateOwned;
            if (disposed || suspended || !mounted) { return; }
            generation += 1;
            try { operation = confirmation.reject(); } catch (ignored) { return; }
            if (wasLocal) { localCandidateOwned = false; localOpen = false; }
            synchronize();
            complete(operation, generation);
        }
        function mount() {
            if (disposed || mounted) { return false; }
            elements = surface.getElementsForTest();
            presentation = PresentationModel.create();
            transcript = TranscriptView.create({ root: elements.transcriptScroll, intro: elements.transcriptMessage, t: t });
            composer = ComposerView.create({ composer: elements.composer, actionSlot: elements.actionSlot, t: t, onSend: send, onCancel: cancel, onDraftChange: synchronize });
            confirmationView = ConfirmationView.create({ actionSlot: elements.actionSlot, t: t, onReview: review, onApprove: approve, onReject: reject });
            listen(elements.localToggle, "click", toggleLocal);
            listen(elements.localClose, "click", closeLocal);
            listen(elements.localRefresh, "click", refreshLocal);
            listen(elements.localCreate, "click", createLocalCandidate);
            listen(elements.localInput, "input", function () { renderLocal(provider.getState(), effectiveConfirmationState(confirmation.getState())); });
            mounted = true; synchronize(); return true;
        }
        function suspend() { if (disposed || !mounted || suspended) { return false; } suspended = true; generation += 1; localGeneration += 1; localPending = false; return true; }
        function resume() { if (disposed || !mounted || !suspended) { return false; } suspended = false; synchronize(); return true; }
        function refreshLocale() { if (disposed || !mounted) { return; } transcript.refreshLocale(); composer.refreshLocale(); confirmationView.refreshLocale(); synchronize(); }
        function dispose() { if (disposed) { return false; } disposed = true; generation += 1; localGeneration += 1; localListeners.forEach(function (item) { item.node.removeEventListener(item.eventName, item.handler); }); localListeners = []; if (transcript) { transcript.dispose(); } if (composer) { composer.dispose(); } if (confirmationView) { confirmationView.dispose(); } return true; }
        return Object.freeze({ mount: mount, suspend: suspend, resume: resume, refreshLocale: refreshLocale, configureExperimental: configureExperimental, enableExperimental: enableExperimental, disableExperimental: disableExperimental, getExperimentalState: experimentalSnapshot, getElementsForTest: function () { return elements; }, dispose: dispose });
    }
    return Object.freeze({ create: create, validateOpacityInput: validateOpacityInput });
}));
