(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaAgentRuntimeOwner";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var agentRuntime = null;
    var agentDriver = null;
    var exported;

    if (browserPage) {
        agentRuntime = root.VelaAgentRuntime;
        agentDriver = root.VelaAgentDriver;
    } else if (typeof module === "object" && module.exports) {
        agentRuntime = require("./velaAgentRuntime");
        agentDriver = require("./velaAgentDriver");
    }

    exported = Object.freeze(factory(agentRuntime, agentDriver));
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function (defaultAgentRuntime, defaultAgentDriver) {
    "use strict";

    var MODULE_REVISION = "vela-agent-runtime-owner-0.3.3-v1";
    var ERROR_CODES = Object.freeze({
        AGENT_OWNER_RUNTIME_UNAVAILABLE: "AGENT_OWNER_RUNTIME_UNAVAILABLE"
    });

    function fail(code) {
        var error = new Error(code);
        error.code = code;
        throw error;
    }

    function isPlainObject(value) {
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; }
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
    }

    function createOwner(options) {
        var settings = isPlainObject(options) ? options : {};
        var runtime = Object.prototype.hasOwnProperty.call(settings, "AgentRuntime") ? settings.AgentRuntime : defaultAgentRuntime;
        var driverModule = Object.prototype.hasOwnProperty.call(settings, "AgentDriver") ? settings.AgentDriver : defaultAgentDriver;
        var reporter = typeof settings.onListenerError === "function" ? settings.onListenerError : function () {};
        var agent;
        var projection;
        var capabilityRuntime = null;
        var observationRuntime = null;
        var observationRefreshPromise = null;
        var driver = null;
        var disposed = false;

        if (!runtime || typeof runtime.createAgent !== "function") {
            fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE);
        }

        agent = runtime.createAgent({
            onListenerError: function (error, envelope) {
                try { reporter(error, envelope); }
                catch (reportError) { /* Diagnostics must never affect runtime truth. */ }
            }
        });
        if (!agent || typeof agent.getProjection !== "function" || typeof agent.activate !== "function" || typeof agent.dispose !== "function") {
            fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE);
        }
        projection = agent.getProjection();

        if (!driverModule || typeof driverModule.createAgentDriver !== "function") { fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE); }
        driver = driverModule.createAgentDriver({
            beginTurn: function () { return agent.beginTurn(); },
            observe: function () {
                if (!observationRuntime) { return Promise.reject(Object.assign(new Error("OBSERVATION_PROVIDER_UNAVAILABLE"), { code: "OBSERVATION_PROVIDER_UNAVAILABLE" })); }
                return observationRuntime.refresh();
            },
            getObservation: function () { return observationRuntime ? observationRuntime.getObservationSnapshot() : null; },
            appendSessionEvent: function (event) { return agent.getSession().append(event); },
            onListenerError: function (error, envelope) { try { reporter(error, envelope); } catch (ignored) {} }
        });

        function attachObservationReadPort(observationReadPort) {
            var capability;
            if (disposed || observationRuntime || !settings.AgentCapabilityRuntime || !settings.ActiveCompositionCapability || !settings.AgentObservationRuntime || !observationReadPort) { return false; }
            capability = settings.ActiveCompositionCapability.create({ contextBridge: observationReadPort });
            capabilityRuntime = settings.AgentCapabilityRuntime.createCapabilityRuntime({
                registry: capability.registry,
                adapters: capability.adapters,
                readOwnership: function () {
                    var snapshot = agent.getSnapshot();
                    return { sessionId: snapshot.sessionId, turnId: snapshot.turnId, scopeId: snapshot.scopeId, agentRevision: snapshot.revision, disposed: snapshot.lifecycleStage === "disposed" };
                }
            });
            observationRuntime = settings.AgentObservationRuntime.createAgentObservationRuntime({
                readAgentSnapshot: function () { return agent.getSnapshot(); },
                capabilityRuntime: capabilityRuntime,
                capabilityId: capability.capabilityId,
                onError: function (error) { try { reporter(error, Object.freeze({ phase: "observation" })); } catch (ignored) {} }
            });
            return true;
        }
        if (settings.observationReadPort) {
            attachObservationReadPort(settings.observationReadPort);
        }

        function objectiveReviewProjection() {
            var snapshot;
            var review;
            var resolution;
            if (disposed || !driver) { return Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null }); }
            snapshot = driver.getSnapshot();
            review = snapshot.suspendedReview;
            resolution = snapshot.reviewResolution;
            if (snapshot.state === "awaiting-review" && review) {
                return Object.freeze({ state: "active", reviewId: review.reviewId, revision: review.revision, capabilityId: review.capabilityId, valueKind: review.capabilityId === "set-layer-name-v1" ? "string" : "number", beforeValue: review.beforeValue, proposedValue: review.capabilityId === "set-layer-name-v1" ? review.params.name : review.params.opacity, outcome: null });
            }
            if (snapshot.state === "awaiting-outcome" && resolution && resolution.outcome === "approved") {
                return Object.freeze({ state: "resolved", reviewId: resolution.reviewId, revision: resolution.revision, capabilityId: null, beforeValue: null, proposedValue: null, outcome: resolution.outcome });
            }
            if (snapshot.state === "terminal" && snapshot.terminal && snapshot.terminal.outcome === "rejected" && resolution && resolution.outcome === "rejected") {
                return Object.freeze({ state: "resolved", reviewId: resolution.reviewId, revision: resolution.revision, capabilityId: null, beforeValue: null, proposedValue: null, outcome: resolution.outcome });
            }
            return Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null });
        }
        var objectiveReviewPort = Object.freeze({
            getProjection: objectiveReviewProjection,
            resolve: function (input) { if (disposed || !driver) { throw Object.assign(new Error("AGENT_OWNER_RUNTIME_UNAVAILABLE"), { code: "AGENT_OWNER_RUNTIME_UNAVAILABLE" }); } return driver.resolveReview(input); }
        });

        return Object.freeze({
            getCurrentAgent: function () { return agent; },
            getSessionRuntime: function () { return disposed ? null : agent.getSession(); },
            getCurrentProjection: function () { return projection; },
            getObservationRuntime: function () { return observationRuntime; },
            getAgentDriver: function () { return disposed ? null : driver; },
            getObjectiveReviewPort: function () { return disposed ? null : objectiveReviewPort; },
            attachAgentDriverRuntimePort: function (port) { return !disposed && driver ? driver.attachRuntimePort(port) : false; },
            startObjective: function (input) { return !disposed && driver ? driver.startObjective(input) : Promise.reject(Object.assign(new Error("AGENT_OWNER_RUNTIME_UNAVAILABLE"), { code: "AGENT_OWNER_RUNTIME_UNAVAILABLE" })); },
            resolveObjectiveReview: function (input) { if (disposed || !driver) { throw Object.assign(new Error("AGENT_OWNER_RUNTIME_UNAVAILABLE"), { code: "AGENT_OWNER_RUNTIME_UNAVAILABLE" }); } return driver.resolveReview(input); },
            cancelObjective: function () { return !disposed && driver ? driver.cancel() : false; },
            attachObservationReadPort: attachObservationReadPort,
            activate: function () {
                if (disposed) { return false; }
                agent.activate();
                return true;
            },
            beginTurn: function () {
                if (disposed || !agent || typeof agent.beginTurn !== "function") { return null; }
                return agent.beginTurn();
            },
            refreshActiveComposition: function () {
                if (disposed || !observationRuntime) { return Promise.reject(Object.assign(new Error("OBSERVATION_PROVIDER_UNAVAILABLE"), { code: "OBSERVATION_PROVIDER_UNAVAILABLE" })); }
                if (observationRefreshPromise) { return observationRefreshPromise; }
                agent.beginTurn();
                observationRefreshPromise = observationRuntime.refresh();
                observationRefreshPromise.then(function () { observationRefreshPromise = null; }, function () { observationRefreshPromise = null; });
                return observationRefreshPromise;
            },
            cancelActiveCompositionRefresh: function () {
                return observationRuntime && typeof observationRuntime.cancelRefresh === "function" ? observationRuntime.cancelRefresh() : false;
            },
            dispose: function () {
                if (disposed) { return false; }
                disposed = true;
                if (driver) { driver.dispose(); }
                if (observationRuntime) { observationRuntime.dispose(); }
                if (capabilityRuntime) { capabilityRuntime.dispose(); }
                agent.dispose();
                return true;
            },
            isDisposed: function () { return disposed; }
        });
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        createOwner: createOwner
    });
}));
