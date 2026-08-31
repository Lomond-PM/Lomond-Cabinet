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
        var authority = options && options.authority;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var PresentationModel = options && options.PresentationModel;
        var TranscriptView = options && options.TranscriptView;
        var ComposerView = options && options.ComposerView;
        var ConfirmationView = options && options.ConfirmationView;
        var ActivationPolicy = options && options.ActivationPolicy;
        var activationPolicy = ActivationPolicy && typeof ActivationPolicy.getPolicy === "function" ? ActivationPolicy.getPolicy() : null;
        var experimentalEnabled = false;
        var onExperimentalStateChange = options && typeof options.onExperimentalStateChange === "function" ? options.onExperimentalStateChange : function () {};
        var agentProjection = options && options.agentProjection && typeof options.agentProjection.subscribe === "function" && typeof options.agentProjection.getSnapshot === "function" ? options.agentProjection : null;
        var onAgentProjectionError = options && typeof options.onAgentProjectionError === "function" ? options.onAgentProjectionError : function () {};
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
        var mounted = false;
        var suspended = false;
        var disposed = false;
        var suppressConfirmationTerminal = false;
        var agentProjectionSubscription = null;
        var latestAgentProjectionSnapshot = null;
        var authorityButton = null;
        if (!surface || typeof surface.getElementsForTest !== "function" || !provider || typeof provider.send !== "function" || typeof provider.cancel !== "function" || typeof provider.getState !== "function" || !confirmation || typeof confirmation.review !== "function" || typeof confirmation.approve !== "function" || typeof confirmation.reject !== "function" || typeof confirmation.getState !== "function" || !PresentationModel || typeof PresentationModel.create !== "function" || !TranscriptView || typeof TranscriptView.create !== "function" || !ComposerView || typeof ComposerView.create !== "function" || !ConfirmationView || typeof ConfirmationView.create !== "function" || !ActivationPolicy || typeof ActivationPolicy.isTrustedPolicy !== "function" || !ActivationPolicy.isTrustedPolicy(activationPolicy) || activationPolicy.experimentalOptInAllowed !== true || activationPolicy.productionEnabled !== false) { throw new Error("VelaSurfaceController requires trusted presentation dependencies."); }
        function actionState(providerState, confirmationState) {
            var current = confirmationState && confirmationState.state;
            if (current === "executing") { return "none"; }
            if (current === "confirmation-ready") { return "confirm"; }
            if (current === "review-approved") { return "cancel"; }
            if (current === "execution-completed" || current === "rejected" || current === "execution-failed") { return "send"; }
            if (providerState && providerState.state === "pending") { return "cancel"; }
            if (providerState && providerState.state === "proposal-ready") { return "review"; }
            if (providerState && providerState.state === "proposal-reviewing") { return "none"; }
            return "send";
        }
        function reportAgentProjectionError(error, phase) {
            try { onAgentProjectionError(error, phase); }
            catch (reportError) { /* Optional diagnostics never affect Surface behavior. */ }
        }
        function consumeAgentProjection() {
            try { latestAgentProjectionSnapshot = agentProjection.getSnapshot(); }
            catch (error) { reportAgentProjectionError(error, "projection"); }
        }
        function subscribeAgentProjection() {
            if (!agentProjection || agentProjectionSubscription || disposed || suspended || !mounted) { return false; }
            try {
                agentProjectionSubscription = agentProjection.subscribe(function () { consumeAgentProjection(); });
                return !!agentProjectionSubscription;
            } catch (error) {
                agentProjectionSubscription = null;
                reportAgentProjectionError(error, "subscribe");
                return false;
            }
        }
        function unsubscribeAgentProjection() {
            var subscription = agentProjectionSubscription;
            agentProjectionSubscription = null;
            if (!subscription || typeof subscription.unsubscribe !== "function") { return false; }
            try { subscription.unsubscribe(); }
            catch (error) { reportAgentProjectionError(error, "unsubscribe"); }
            return true;
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
                "awaiting-continuation": "vela.surfaceStatusAwaitingContinuation",
                "executing": "vela.surfaceStatusExecuting",
                "completed": "vela.surfaceStatusCompleted",
                "cancelled": "vela.surfaceStatusCancelled",
                "blocked": "vela.surfaceStatusBlocked",
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
            var authorityState = null;
            if (disposed || suspended || !elements) { return; }
            providerState = provider.getState();
            confirmationState = effectiveConfirmationState(confirmation.getState());
            snapshot = presentation.apply(providerState);
            snapshot = presentation.applyConfirmation(confirmationState, snapshot);
            transcript.render(snapshot);
            action = actionState(providerState, confirmationState);
            projection = PresentationModel.projectSurfaceState(providerState, confirmationState, elements.composer.value, experimentalEnabled, experimentalState, activationPolicy, experimentalDisabledReason);
            if (!experimentalEnabled) { action = "send"; }
            composer.render(action, experimentalEnabled);
            confirmationView.render(action, confirmationState);
            if (authorityButton) {
                authorityState = authority.getState();
                var authorityActive = authorityState && authorityState.active === true;
                var authorityVisible = experimentalEnabled && action === "send" && authorityState && ["inactive", "active", "revoked", "expired", "consumed", "failed"].indexOf(authorityState.state) !== -1;
                authorityButton.hidden = !authorityVisible;
                authorityButton.disabled = !authorityVisible;
                authorityButton.textContent = t(authorityActive ? "vela.surfaceRevokeOpacityConsent" : "vela.surfaceGrantOpacityConsent");
                authorityButton.setAttribute("aria-label", authorityButton.textContent);
            }
            elements.statusText.textContent = authorityState && ["active", "executing", "consumed", "revoked", "expired", "failed"].indexOf(authorityState.state) !== -1 ? t("vela.surfaceAuthorityStatus." + authorityState.state) : projectedStatusText(projection.state);
            elements.root.setAttribute("data-vela-surface-state", projection.state);
            elements.statusSlot.setAttribute("data-tone", projection.tone);
            elements.statusSlot.setAttribute("data-vela-provider-state", providerState && providerState.state || "idle");
            elements.statusSlot.setAttribute("data-vela-confirmation-state", confirmationState && confirmationState.state || "idle");
            synchronizeStatusAccessibility();
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
            experimentalConfig = { endpoint: experimentalConfig.endpoint, model: experimentalConfig.model, acknowledged: experimentalConfig.acknowledged };
            readiness = null;
            synchronize(); notifyExperimental(); return true;
        }
        function review() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.review(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function approve() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.approve(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function reject() { var operation; if (disposed || suspended || !mounted) { return; } generation += 1; try { operation = confirmation.reject(); } catch (ignored) { return; } synchronize(); complete(operation, generation); }
        function authorityClick() {
            var state;
            var operation;
            if (disposed || suspended || !mounted || !experimentalEnabled || !authority) { return; }
            state = authority.getState();
            try { operation = state && state.active ? authority.revoke() : authority.grant(); }
            catch (ignored) { return; }
            generation += 1; synchronize(); complete(operation, generation);
        }
        function mount() {
            if (disposed || mounted) { return false; }
            elements = surface.getElementsForTest();
            presentation = PresentationModel.create();
            transcript = TranscriptView.create({ root: elements.transcriptScroll, intro: elements.transcriptMessage, t: t });
            composer = ComposerView.create({ composer: elements.composer, actionSlot: elements.actionSlot, t: t, onSend: send, onCancel: cancel, onDraftChange: synchronize });
            confirmationView = ConfirmationView.create({ actionSlot: elements.actionSlot, t: t, onReview: review, onApprove: approve, onReject: reject });
            if (authority && typeof authority.grant === "function" && typeof authority.revoke === "function" && typeof authority.getState === "function") {
                authorityButton = elements.actionSlot.ownerDocument.createElement("button");
                authorityButton.type = "button";
                authorityButton.className = "panel-button utility-action vela-surface-action vela-compact-action vela-authority-action";
                authorityButton.addEventListener("click", authorityClick);
                elements.actionSlot.appendChild(authorityButton);
            }
            mounted = true; subscribeAgentProjection(); synchronize(); return true;
        }
        function suspend() { if (disposed || !mounted || suspended) { return false; } suspended = true; generation += 1; unsubscribeAgentProjection(); return true; }
        function resume() { if (disposed || !mounted || !suspended) { return false; } suspended = false; subscribeAgentProjection(); synchronize(); return true; }
        function refreshLocale() { if (disposed || !mounted) { return; } transcript.refreshLocale(); composer.refreshLocale(); confirmationView.refreshLocale(); synchronize(); }
        function dispose() { if (disposed) { return false; } disposed = true; generation += 1; unsubscribeAgentProjection(); if (authorityButton) { authorityButton.removeEventListener("click", authorityClick); } if (transcript) { transcript.dispose(); } if (composer) { composer.dispose(); } if (confirmationView) { confirmationView.dispose(); } return true; }
        return Object.freeze({ mount: mount, suspend: suspend, resume: resume, refreshLocale: refreshLocale, configureExperimental: configureExperimental, enableExperimental: enableExperimental, disableExperimental: disableExperimental, getExperimentalState: experimentalSnapshot, getElementsForTest: function () { return elements; }, getAgentProjectionSnapshotForTest: function () { return latestAgentProjectionSnapshot; }, dispose: dispose });
    }
    return Object.freeze({ create: create });
}));
