(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && root.self === root && root["win" + "dow"] === root) {
        if (!Object.prototype.hasOwnProperty.call(root, "VelaConversationComposition")) {
            Object.defineProperty(root, "VelaConversationComposition", { value: exported, configurable: false, writable: false });
        }
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function fail(code) { var error = new Error(code); error.code = code; throw error; }
    function createComposition(options) {
        var ownership = options.Ownership;
        var records = new Map();
        var pending = new Set();
        var selected = null;
        var holder = null;
        var providerStopped = false;
        var suspended = false;
        var disposed = false;
        var listeners = new Set();
        function notify() { listeners.forEach(function (listener) { try { listener(); } catch (ignored) {} }); }
        var unbind = options.unbindSurface || function () {};
        var selectedChanged = options.onSelectionChanged || function () {};
        function requireLive() { if (disposed) { fail("CONVERSATION_COMPOSITION_DISPOSED"); } }
        function entryFor(record) {
            requireLive();
            var entry = records.get(record);
            if (!entry || !ownership.isLive(entry.association.handle)) { fail("CONVERSATION_RECORD_STALE"); }
            return entry;
        }
        function checkRelease(token) {
            if (disposed || holder !== token || token.pending !== 0) { return; }
            var state = token.entry.driver.getSnapshot();
            if (state.state === "terminal" || state.state === "idle") { holder = null; if (suspended) { token.entry.association.runtime.suspend(); } notify(); }
        }
        function track(token, action) {
            token.pending += 1;
            function done() { token.pending -= 1; checkRelease(token); }
            var result;
            try { result = action(); }
            catch (error) { done(); throw error; }
            if (result && typeof result.then === "function") {
                return Promise.resolve(result).then(function (value) { done(); return value; }, function (error) { done(); throw error; });
            }
            // Cancellation's synchronous return is not its settlement boundary.
            Promise.resolve().then(done);
            return result;
        }
        function requireProvider() {
            if (suspended || providerStopped || typeof options.isProviderEnabled === "function" && options.isProviderEnabled() !== true) { fail("PROVIDER_SESSION_DISABLED"); }
        }
        function cancelActiveObjective() {
            requireLive();
            if (!holder) { return false; }
            var token = holder;
            return track(token, function () { return token.entry.association.agentOwner.cancelObjective({ settleInFlight: true }); });
        }
        function stopProviderActivity() {
            requireLive(); providerStopped = true; notify();
            cancelActiveObjective();
            records.forEach(function (entry) {
                var runtime = entry.association.runtime;
                // Unused session-only consent must not survive a later re-enable.
                if (runtime.getAuthorityProjection().active) { Promise.resolve(runtime.revokeOpacityDelegation()).catch(function () {}); }
            });
            notify();
        }
        function admission(entry) {
            return Object.freeze({
                start: function (action) {
                    entryFor(entry.record);
                    requireProvider();
                    if (holder) { fail("CONVERSATION_OBJECTIVE_BUSY"); }
                    var token = { entry: entry, pending: 0 };
                    holder = token;
                    notify();
                    return track(token, action);
                },
                continue: function (action, stopping) {
                    entryFor(entry.record);
                    if (!stopping) { requireProvider(); }
                    if (holder && holder.entry !== entry) { fail("CONVERSATION_OBJECTIVE_BUSY"); }
                    return holder ? track(holder, action) : action();
                }
            });
        }
        function cleanup(candidate) {
            if (candidate.cleaned) { return; }
            candidate.cleaned = true;
            if (candidate.handle) { ownership.dispose(candidate.handle); }
            if (candidate.subscription) { candidate.subscription.unsubscribe(); }
            if (candidate.runtime) { try { candidate.runtime.dispose(); } catch (ignoredRuntime) {} }
            if (candidate.owner) { try { candidate.owner.dispose(); } catch (ignoredOwner) {} }
        }
        function createRecord() {
            requireLive();
            var candidate = { owner: null, runtime: null, handle: null, cleaned: false };
            pending.add(candidate);
            var initializing;
            try {
                candidate.owner = options.createOwner();
                if (!candidate.owner) { fail("AGENT_RUNTIME_UNAVAILABLE"); }
                candidate.session = candidate.owner.getSessionRuntime();
                candidate.runtime = options.createRuntime(candidate.session);
                initializing = candidate.runtime.initialize();
            } catch (error) { cleanup(candidate); pending.delete(candidate); return Promise.reject(error); }
            return Promise.resolve(initializing).then(function () {
                requireLive();
                if (candidate.cleaned || candidate.runtime.getStatus().state !== "ready") { fail("CONVERSATION_BINDING_INVALID"); }
                var owner = candidate.owner;
                var runtime = candidate.runtime;
                if (owner.attachObservationReadPort(runtime.getObservationReadPort()) === false ||
                        owner.attachAgentDriverRuntimePort(runtime.getAgentDriverRuntimePort()) === false ||
                        runtime.attachObjectiveReviewPort(owner.getObjectiveReviewPort()) === false) { fail("CONVERSATION_BINDING_INVALID"); }
                owner.activate();
                var presentation = options.PresentationModel.create();
                candidate.handle = ownership.createOwnership({ agentOwner: owner, session: candidate.session, runtime: runtime, presentation: presentation }, options.fillRandomValues);
                // The opaque record is not the private A1 capability. Its ID is display-only.
                var record = Object.freeze({ conversationId: candidate.handle.conversationId });
                var entry = { record: record, driver: owner.getAgentDriver(), association: null, candidate: candidate };
                var sourcePort = ownership.createSourcePort(candidate.handle, options.getConfig, admission(entry));
                entry.association = Object.freeze({ handle: candidate.handle, agentOwner: owner, session: candidate.session, runtime: runtime, presentation: presentation, sourcePort: sourcePort });
                candidate.subscription = entry.driver.subscribe(function () {
                    var token = holder;
                    if (token && token.entry === entry) { Promise.resolve().then(function () { checkRelease(token); }); }
                });
                records.set(record, entry);
                pending.delete(candidate);
                notify();
                return record;
            }).catch(function (error) { cleanup(candidate); pending.delete(candidate); throw error; });
        }
        function select(record) {
            requireLive();
            var entry = record === null ? null : entryFor(record);
            if (selected === record) { return false; }
            unbind();
            selected = record;
            // Only the trusted composition root receives this association callback.
            selectedChanged(record, entry ? entry.association : null);
            notify();
            return true;
        }
        function disposeRecord(record) {
            var entry = entryFor(record);
            if (holder && holder.entry === entry) { fail("CONVERSATION_RECORD_ACTIVE"); }
            if (selected === record) { select(null); }
            records.delete(record);
            cleanup(entry.candidate);
            notify();
            return true;
        }
        function dispose() {
            if (disposed) { return false; }
            disposed = true;
            listeners.clear();
            selected = null;
            records.forEach(function (entry) { ownership.dispose(entry.association.handle); });
            pending.forEach(function (candidate) { if (candidate.handle) { ownership.dispose(candidate.handle); } });
            try { unbind(); } finally {
                try { selectedChanged(null, null); } finally {
                    records.forEach(function (entry) { cleanup(entry.candidate); });
                    pending.forEach(cleanup);
                    records.clear(); pending.clear(); holder = null;
                }
            }
            return true;
        }
        return Object.freeze({
            stopProviderActivity: stopProviderActivity, cancelActiveObjective: cancelActiveObjective,
            allowProviderRequests: function () { requireLive(); if (suspended || typeof options.isProviderEnabled === "function" && options.isProviderEnabled() !== true) { return false; } providerStopped = false; notify(); return true; },
            getActiveRecord: function () { requireLive(); return holder ? holder.entry.record : null; },
            subscribe: function (listener) { requireLive(); listeners.add(listener); return Object.freeze({ unsubscribe: function () { listeners.delete(listener); } }); },
            createRecord: createRecord, select: select, disposeRecord: disposeRecord, dispose: dispose,
            getRecords: function () { requireLive(); return Object.freeze(Array.from(records.keys())); },
            getSelected: function () { requireLive(); return selected; },
            getSourcePort: function (record) { return entryFor(record).association.sourcePort; },
            getAdmissionState: function () { requireLive(); return Object.freeze({ busy: !!holder, providerStopped: providerStopped, conversationId: holder ? holder.entry.record.conversationId : null }); },
            suspend: function () { requireLive(); suspended = true; stopProviderActivity(); records.forEach(function (entry) { if (!holder || holder.entry !== entry) { entry.association.runtime.suspend(); } }); },
            resume: function () { requireLive(); suspended = false; records.forEach(function (entry) { entry.association.runtime.resume(); }); }
        });
    }
    return { MODULE_REVISION: "vela-conversation-composition-0.3.11-a4-v1", createComposition: createComposition };
}));
