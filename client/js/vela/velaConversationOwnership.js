(function (root, factory) {
    "use strict";
    var name = "VelaConversationOwnership";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    if (browserPage) {
        // Re-evaluation must not create a second handle namespace on this page.
        if (!Object.prototype.hasOwnProperty.call(root, name)) {
            Object.defineProperty(root, name, { value: factory(), writable: false, configurable: false });
        }
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var records = new WeakMap();
    var claimedPresentations = new WeakSet();
    var sequence = 0;
    function fail(code) { var error = new Error(code); error.code = code; throw error; }
    function invalidate(record) {
        record.disposed = true;
        record.binding = null;
        if (record.closePort) { record.closePort(); record.closePort = null; }
    }
    function live(record) {
        var binding;
        if (!record || record.disposed) { return false; }
        binding = record.binding;
        try {
            if (binding.agentOwner.isDisposed() || binding.agentOwner.getSessionRuntime() !== binding.session || binding.session.isClosed() || binding.runtime.getStatus().disposed === true) {
                invalidate(record); return false;
            }
        } catch (error) { invalidate(record); return false; }
        return true;
    }
    function createOwnership(options, fillRandomValues) {
        var binding;
        var bytes = new Uint8Array(16);
        var id;
        var handle;
        if (!options || Object.keys(options).sort().join(",") !== "agentOwner,presentation,runtime,session") { fail("CONVERSATION_BINDING_INVALID"); }
        // Only copy the association container, never any trusted object.
        binding = Object.freeze({ agentOwner: options.agentOwner, session: options.session, runtime: options.runtime, presentation: options.presentation });
        if (!binding.agentOwner || typeof binding.agentOwner.isDisposed !== "function" || typeof binding.agentOwner.getSessionRuntime !== "function" || !binding.session || typeof binding.session.isClosed !== "function" || !binding.runtime || typeof binding.runtime.getStatus !== "function") { fail("CONVERSATION_BINDING_INVALID"); }
        var record = { binding: binding, disposed: false };
        if (!live(record) || binding.runtime.getStatus().state !== "ready") { fail("CONVERSATION_BINDING_INVALID"); }
        if (!binding.presentation || typeof binding.presentation.getSnapshot !== "function" || typeof binding.presentation.begin !== "function" || claimedPresentations.has(binding.presentation)) { fail("CONVERSATION_PRESENTATION_INVALID"); }
        if (!Number.isSafeInteger(sequence + 1)) { fail("CONVERSATION_ID_UNAVAILABLE"); }
        try { fillRandomValues(bytes); } catch (error) { fail("CONVERSATION_ID_UNAVAILABLE"); }
        sequence += 1;
        id = "conversation_" + Array.prototype.map.call(bytes, function (value) { return ("0" + value.toString(16)).slice(-2); }).join("") + "_" + sequence;
        handle = Object.freeze({ conversationId: id });
        claimedPresentations.add(binding.presentation);
        records.set(handle, record);
        return handle;
    }
    function readBinding(handle) {
        var record = records.get(handle);
        if (!live(record)) { fail("CONVERSATION_OWNER_STALE"); }
        return record.binding;
    }
    function dispose(handle) {
        var record = records.get(handle);
        if (!record || record.disposed) { return false; }
        // The composition root alone disposes Runtime/Agent in their existing order.
        invalidate(record);
        return true;
    }
    // Composition-root only: the view receives the returned operations, never binding.
    function createSourcePort(handle, getConfig) {
        var binding = readBinding(handle);
        var record = records.get(handle);
        if (record.port) { return record.port; }
        var runtime = binding.runtime;
        var owner = binding.agentOwner;
        var model = binding.presentation;
        var driver = typeof owner.getAgentDriver === "function" ? owner.getAgentDriver() : null;
        var projection = typeof owner.getCurrentProjection === "function" ? owner.getCurrentProjection() : null;
        var listeners = new Set();
        var subscriptions = [];
        var initiating = false;
        function available() { return live(record); }
        function requireSource() { if (!available()) { fail("CONVERSATION_OWNER_STALE"); } }
        function notify() { if (available()) { listeners.forEach(function (listener) { try { listener(); } catch (ignored) {} }); } }
        function providerState() {
            requireSource();
            var state = driver && driver.getSnapshot();
            if (state && state.state !== "idle" && state.state !== "terminal") { return Object.freeze({ state: "pending", text: null, errorCode: null }); }
            if (state && state.state === "terminal" && state.terminal && state.terminal.outcome === "blocked") { return Object.freeze({ state: "objective-blocked", text: null, errorCode: state.terminal.code }); }
            if (state && state.state === "terminal" && state.terminal && state.terminal.outcome === "cancelled") { return Object.freeze({ state: "cancelled", text: null, errorCode: null }); }
            return runtime.getProviderSurfaceState();
        }
        function confirmationState() { requireSource(); return runtime.getConfirmationSurfaceState(); }
        function synchronize() {
            if (!available() || initiating) { return false; }
            model.apply(providerState());
            model.applyConfirmation(model.filterConfirmationState(confirmationState()));
            notify();
            return true;
        }
        function settle(operation) {
            return Promise.resolve(operation).then(function (result) { requireSource(); synchronize(); return result; }, function (error) { requireSource(); synchronize(); throw error; });
        }
        function command(method) { return function () { requireSource(); var result = runtime[method](); synchronize(); return settle(result); }; }
        function reviewIdentity() {
            var reviewPort = typeof owner.getObjectiveReviewPort === "function" ? owner.getObjectiveReviewPort() : null;
            var review = reviewPort && reviewPort.getProjection();
            if (review && review.state === "active") { return "objective:" + JSON.stringify([review.reviewId, review.revision]); }
            var candidate = typeof runtime.getUiState === "function" ? runtime.getUiState() : null;
            return candidate && candidate.state === "pending-confirmation" && typeof candidate.candidateId === "string" ? "candidate:" + candidate.candidateId : null;
        }
        function captureReviewCommands() {
            requireSource();
            var identity = reviewIdentity();
            var consumed = false;
            function resolve(method) {
                requireSource();
                if (consumed || !identity || reviewIdentity() !== identity) { fail("CONVERSATION_REVIEW_STALE"); }
                consumed = true;
                // Synchronous validation precedes the existing Runtime/Review barrier.
                return command(method)();
            }
            return Object.freeze({ approve: function () { return resolve("approveActiveCandidate"); }, reject: function () { return resolve("rejectActiveCandidate"); } });
        }
        record.closePort = function () {
            listeners.clear();
            subscriptions.forEach(function (subscription) { try { subscription.unsubscribe(); } catch (ignored) {} });
            subscriptions = [];
        };
        var port = Object.freeze({
            presentation: model,
            isLive: available,
            synchronize: synchronize,
            subscribe: function (listener) {
                requireSource();
                var active = true;
                var guarded = function () { if (active && available()) { listener(); } };
                listeners.add(guarded);
                return Object.freeze({ unsubscribe: function () { active = false; listeners.delete(guarded); } });
            },
            provider: Object.freeze({
                getState: providerState,
                check: function (config) { requireSource(); return settle(runtime.checkProviderReadiness(config)); },
                send: function (message) {
                    requireSource();
                    var config = getConfig();
                    var input = { message: message, endpoint: config.endpoint, model: config.model };
                    var operation;
                    initiating = true;
                    try {
                        operation = typeof owner.startObjective === "function" ? owner.startObjective(input) : runtime.sendProviderMessage(input);
                        if (providerState().state === "pending") { model.begin(message); model.clearConfirmationTerminal(); }
                    } finally { initiating = false; }
                    synchronize();
                    return settle(operation);
                },
                cancel: function () { requireSource(); var result = typeof owner.cancelObjective === "function" ? owner.cancelObjective() : runtime.cancelProviderRequest(); synchronize(); return result; }
            }),
            confirmation: Object.freeze({ getState: confirmationState, review: command("reviewProviderProposal"), captureReviewCommands: captureReviewCommands,
                approve: function () { fail("CONVERSATION_REVIEW_BINDING_REQUIRED"); }, reject: function () { fail("CONVERSATION_REVIEW_BINDING_REQUIRED"); } }),
            authority: Object.freeze({ grant: command("grantNextOpacityMutation"), revoke: command("revokeOpacityDelegation"), getState: function () { requireSource(); return runtime.getAuthorityProjection(); } }),
            agentProjection: projection ? Object.freeze({ getSnapshot: function () { requireSource(); return projection.getSnapshot(); }, subscribe: function (listener) { return port.subscribe(listener); } }) : null,
            diagnostics: Object.freeze({
                refresh: function () { requireSource(); return Promise.resolve(owner.refreshActiveComposition()).then(function (result) { requireSource(); return result; }, function (error) { requireSource(); throw error; }); },
                cancel: function () { requireSource(); return owner.cancelActiveCompositionRefresh(); },
                trajectory: function () { requireSource(); return owner.getTrajectoryEvidence(); },
                selection: function () { requireSource(); return runtime.getProviderSelectionEvidence(); }
            })
        });
        try {
            if (typeof runtime.subscribePresentationEvents === "function") { subscriptions.push(runtime.subscribePresentationEvents(function (event) { if (available()) { model.applyPresentationEvent(event); notify(); } })); }
            if (driver && typeof driver.subscribe === "function") { subscriptions.push(driver.subscribe(synchronize)); }
            if (projection && typeof projection.subscribe === "function") { subscriptions.push(projection.subscribe(synchronize)); }
        } catch (error) { record.closePort(); throw error; }
        record.port = port;
        return port;
    }
    return Object.freeze({ MODULE_REVISION: "vela-conversation-ownership-0.3.11-a3-v1", createOwnership: createOwnership, readBinding: readBinding, createSourcePort: createSourcePort, isLive: function (handle) { return live(records.get(handle)); }, dispose: dispose });
}));
