(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaAgentObservationRuntime";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var exported = Object.freeze(factory());

    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MODULE_REVISION = "vela-agent-observation-context-plumbing-0.3.3-v1";
    var ERROR_CODES = Object.freeze({
        AGENT_NOT_ACTIVE: "AGENT_NOT_ACTIVE",
        AGENT_DISPOSED: "AGENT_DISPOSED",
        OBSERVATION_PROVIDER_UNAVAILABLE: "OBSERVATION_PROVIDER_UNAVAILABLE",
        OBSERVATION_PROVIDER_FAILED: "OBSERVATION_PROVIDER_FAILED",
        OBSERVATION_RESULT_INVALID: "OBSERVATION_RESULT_INVALID",
        OBSERVATION_RESULT_STALE: "OBSERVATION_RESULT_STALE",
        OBSERVATION_CONTEXT_PROJECTION_FAILED: "OBSERVATION_CONTEXT_PROJECTION_FAILED",
        OBSERVATION_REFRESH_CANCELLED: "OBSERVATION_REFRESH_CANCELLED",
        OBSERVATION_RUNTIME_DISPOSED: "OBSERVATION_RUNTIME_DISPOSED",
        OBSERVATION_RUNTIME_OPTIONS_INVALID: "OBSERVATION_RUNTIME_OPTIONS_INVALID"
    });

    var CAPABILITY_ERROR_CODES = Object.freeze(["ADAPTER_ERROR", "INVALID_OUTPUT"]);

    function createError(code, capabilityErrorCode) {
        var error = new Error(code);
        error.code = code;
        if (CAPABILITY_ERROR_CODES.indexOf(capabilityErrorCode) !== -1) {
            Object.defineProperty(error, "capabilityErrorCode", { configurable: false, enumerable: true, value: capabilityErrorCode, writable: false });
        }
        return error;
    }

    function isPlainObject(value) {
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; }
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
    }

    function cloneJson(value, seen) {
        var sources = seen || [];
        var result;
        var keys;
        var index;
        var descriptor;

        if (value === null || typeof value === "string" || typeof value === "boolean") { return value; }
        if (typeof value === "number" && isFinite(value)) { return value; }
        if (!value || typeof value !== "object" || sources.indexOf(value) !== -1) {
            throw createError(ERROR_CODES.OBSERVATION_RESULT_INVALID);
        }
        if (!Array.isArray(value) && !isPlainObject(value)) {
            throw createError(ERROR_CODES.OBSERVATION_RESULT_INVALID);
        }
        sources.push(value);
        result = Array.isArray(value) ? [] : {};
        keys = Object.keys(value);
        if (Array.isArray(value) && keys.length !== value.length) {
            throw createError(ERROR_CODES.OBSERVATION_RESULT_INVALID);
        }
        for (index = 0; index < keys.length; index += 1) {
            descriptor = Object.getOwnPropertyDescriptor(value, keys[index]);
            if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                throw createError(ERROR_CODES.OBSERVATION_RESULT_INVALID);
            }
            result[keys[index]] = cloneJson(descriptor.value, sources);
        }
        sources.pop();
        return result;
    }

    function deepFreeze(value) {
        var keys;
        var index;
        if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; }
        keys = Object.keys(value);
        for (index = 0; index < keys.length; index += 1) { deepFreeze(value[keys[index]]); }
        return Object.freeze(value);
    }

    function validateAgentSnapshot(snapshot) {
        if (!isPlainObject(snapshot) || typeof snapshot.agentId !== "string" || !snapshot.agentId ||
                typeof snapshot.scopeId !== "string" || !snapshot.scopeId ||
                typeof snapshot.revision !== "number" || snapshot.revision < 0 || snapshot.revision % 1 !== 0 ||
                !isPlainObject(snapshot.scopeBoundary) ||
                (snapshot.lifecycleStage !== "created" && snapshot.lifecycleStage !== "active" && snapshot.lifecycleStage !== "disposed")) {
            throw createError(ERROR_CODES.OBSERVATION_RUNTIME_OPTIONS_INVALID);
        }
        return snapshot;
    }

    function lifecycleError(snapshot) {
        if (snapshot.lifecycleStage === "disposed") { return createError(ERROR_CODES.AGENT_DISPOSED); }
        if (snapshot.lifecycleStage !== "active") { return createError(ERROR_CODES.AGENT_NOT_ACTIVE); }
        return null;
    }

    function createAgentObservationRuntime(options) {
        var settings = isPlainObject(options) ? options : {};
        var readAgentSnapshot = settings.readAgentSnapshot;
        var provider = settings.provider || null;
        var capabilityRuntime = settings.capabilityRuntime || null;
        var capabilityId = typeof settings.capabilityId === "string" ? settings.capabilityId : null;
        var onError = typeof settings.onError === "function" ? settings.onError : function () {};
        var disposed = false;
        var observationRevision = 0;
        var currentObservation = null;
        var currentContext = null;
        var inFlight = null;

        if (typeof readAgentSnapshot !== "function") {
            throw createError(ERROR_CODES.OBSERVATION_RUNTIME_OPTIONS_INVALID);
        }

        function report(error, phase) {
            try { onError(error, Object.freeze({ phase: phase })); }
            catch (reportError) { /* Reporting is out-of-band and contained. */ }
        }

        function rejectStable(error, phase) {
            if (!error || error.code !== ERROR_CODES.OBSERVATION_REFRESH_CANCELLED) { report(error, phase); }
            throw error;
        }

        function captureRequest() {
            var snapshot;
            var error;
            if (disposed) { throw createError(ERROR_CODES.OBSERVATION_RUNTIME_DISPOSED); }
            snapshot = validateAgentSnapshot(readAgentSnapshot());
            error = lifecycleError(snapshot);
            if (error) { throw error; }
            return deepFreeze({
                agentId: snapshot.agentId,
                sessionId: typeof snapshot.sessionId === "string" ? snapshot.sessionId : null,
                turnId: typeof snapshot.turnId === "string" ? snapshot.turnId : null,
                scopeToken: {
                    scopeId: snapshot.scopeId,
                    agentRevision: snapshot.revision
                },
                scopeBoundary: cloneJson(snapshot.scopeBoundary)
            });
        }

        function validateResult(result) {
            if (!isPlainObject(result) || typeof result.sourceKind !== "string" || !result.sourceKind ||
                    !Object.prototype.hasOwnProperty.call(result, "payload")) {
                throw createError(ERROR_CODES.OBSERVATION_RESULT_INVALID);
            }
            return {
                sourceKind: result.sourceKind,
                payload: cloneJson(result.payload)
            };
        }

        function commit(request, result) {
            var current;
            var error;
            var nextRevision;
            var observation;
            var context;
            if (disposed) { throw createError(ERROR_CODES.OBSERVATION_RUNTIME_DISPOSED); }
            current = validateAgentSnapshot(readAgentSnapshot());
            error = lifecycleError(current);
            if (error) { throw error; }
            if (current.agentId !== request.agentId || current.scopeId !== request.scopeToken.scopeId ||
                    current.revision !== request.scopeToken.agentRevision) {
                throw createError(ERROR_CODES.OBSERVATION_RESULT_STALE);
            }
            nextRevision = observationRevision + 1;
            observation = deepFreeze({
                observationRevision: nextRevision,
                agentId: request.agentId,
                scopeToken: cloneJson(request.scopeToken),
                sourceKind: result.sourceKind,
                payload: cloneJson(result.payload)
            });
            try {
                context = deepFreeze({
                    agentId: observation.agentId,
                    scopeToken: cloneJson(observation.scopeToken),
                    observationRevision: observation.observationRevision,
                    facts: cloneJson(observation.payload)
                });
            } catch (projectionError) {
                throw createError(ERROR_CODES.OBSERVATION_CONTEXT_PROJECTION_FAILED);
            }
            observationRevision = nextRevision;
            currentObservation = observation;
            currentContext = context;
            return observation;
        }

        function beginRefresh() {
            var request;
            var invocationPromise;
            var capabilityOperation;
            if (capabilityRuntime && capabilityId) {
                try { request = captureRequest(); }
                catch (captureError) { return Promise.reject(captureError); }
                if (!request.sessionId || !request.turnId) { return Promise.reject(createError(ERROR_CODES.AGENT_NOT_ACTIVE)); }
                invocationPromise = capabilityRuntime.invoke({ capabilityId: capabilityId, input: {} });
                capabilityOperation = invocationPromise.then(function (result) {
                    var current;
                    var data;
                    var facts;
                    var provenance;
                    var nextRevision;
                    if (!result || result.status === "cancelled") { throw createError(ERROR_CODES.OBSERVATION_REFRESH_CANCELLED); }
                    if (result.status !== "succeeded") {
                        throw createError(
                            result.status === "unavailable" ? ERROR_CODES.OBSERVATION_PROVIDER_UNAVAILABLE : ERROR_CODES.OBSERVATION_PROVIDER_FAILED,
                            result.status === "error" && result.error ? result.error.code : null
                        );
                    }
                    current = validateAgentSnapshot(readAgentSnapshot());
                    if (current.lifecycleStage !== "active" || current.agentId !== request.agentId || current.scopeId !== request.scopeToken.scopeId || current.revision !== request.scopeToken.agentRevision || current.sessionId !== request.sessionId || current.turnId !== request.turnId || result.sessionId !== request.sessionId || result.turnId !== request.turnId || result.capabilityId !== capabilityId) { throw createError(ERROR_CODES.OBSERVATION_RESULT_STALE); }
                    data = result.data;
                    facts = {
                        activeComposition: {
                            available: data.available, compositionId: data.compositionId, type: data.type,
                            width: data.width, height: data.height, duration: data.duration, frameRate: data.frameRate
                        }
                    };
                    provenance = {
                        capabilityId: capabilityId, invocationId: result.invocationId,
                        sessionId: result.sessionId, turnId: result.turnId,
                        scopeId: request.scopeToken.scopeId, agentRevision: request.scopeToken.agentRevision,
                        hostContextId: data.hostContextId, hostInstanceId: data.hostInstanceId, hostReloadEpoch: data.hostReloadEpoch
                    };
                    nextRevision = observationRevision + 1;
                    currentObservation = deepFreeze({ observationRevision: nextRevision, agentId: request.agentId, facts: cloneJson(facts), provenance: cloneJson(provenance) });
                    currentContext = deepFreeze({ agentId: request.agentId, observationRevision: nextRevision, facts: cloneJson(facts), provenance: cloneJson(provenance) });
                    observationRevision = nextRevision;
                    return currentObservation;
                }, function (error) {
                    if (error && error.code === "CAPABILITY_RESULT_DISCARDED") { throw createError(ERROR_CODES.OBSERVATION_RESULT_STALE); }
                    throw error;
                });
                capabilityOperation.cancel = typeof invocationPromise.cancel === "function" ? invocationPromise.cancel : function () { return false; };
                return capabilityOperation;
            }
            if (!provider || typeof provider.observe !== "function") {
                return Promise.reject(createError(ERROR_CODES.OBSERVATION_PROVIDER_UNAVAILABLE));
            }
            try { request = captureRequest(); }
            catch (error) { return Promise.reject(error); }
            return Promise.resolve().then(function () {
                return provider.observe(request);
            }).then(function (rawResult) {
                if (rawResult === null || typeof rawResult === "undefined") {
                    throw createError(ERROR_CODES.OBSERVATION_PROVIDER_UNAVAILABLE);
                }
                return commit(request, validateResult(rawResult));
            }, function () {
                throw createError(ERROR_CODES.OBSERVATION_PROVIDER_FAILED);
            });
        }

        function refresh() {
            var operation;
            if (inFlight) { return inFlight; }
            operation = beginRefresh();
            inFlight = operation.then(function (value) {
                inFlight = null;
                return value;
            }, function (error) {
                inFlight = null;
                return rejectStable(error, "refresh");
            });
            if (typeof operation.cancel === "function") { inFlight.cancel = operation.cancel; }
            return inFlight;
        }

        return Object.freeze({
            refresh: refresh,
            cancelRefresh: function () {
                if (!inFlight || typeof inFlight.cancel !== "function") { return false; }
                return inFlight.cancel();
            },
            getObservationSnapshot: function () { return currentObservation; },
            getContextSnapshot: function () { return currentContext; },
            dispose: function () {
                if (disposed) { return false; }
                disposed = true;
                currentObservation = null;
                currentContext = null;
                return true;
            },
            isDisposed: function () { return disposed; }
        });
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        createAgentObservationRuntime: createAgentObservationRuntime
    });
}));
