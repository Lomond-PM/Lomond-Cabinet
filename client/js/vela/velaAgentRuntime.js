(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaAgentRuntime";
    var sessionRuntime = null;
    var exported;

    if (typeof module === "object" && module.exports) {
        sessionRuntime = require("./velaSessionRuntime");
    } else if (root && root.VelaSessionRuntime) {
        sessionRuntime = root.VelaSessionRuntime;
    }

    exported = Object.freeze(factory(sessionRuntime));

    if (root && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function (sessionRuntime) {
    "use strict";

    var MODULE_REVISION = "vela-agent-runtime-projection-0.3.3-v2";
    var agentSequence = 0;
    var scopeSequence = 0;

    var ERROR_CODES = Object.freeze({
        AGENT_DISPOSED: "AGENT_DISPOSED",
        AGENT_PROJECTION_LISTENER_INVALID: "AGENT_PROJECTION_LISTENER_INVALID",
        AGENT_SCOPE_BOUNDARY_INVALID: "AGENT_SCOPE_BOUNDARY_INVALID",
        AGENT_RUNTIME_UNAVAILABLE: "AGENT_RUNTIME_UNAVAILABLE"
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

    function cloneValue(value, seen, copies) {
        var sourceSeen = seen || [];
        var targetCopies = copies || [];
        var result;
        var keys;
        var index;
        var sourceIndex;

        if (!value || typeof value !== "object") { return value; }
        sourceIndex = sourceSeen.indexOf(value);
        if (sourceIndex !== -1) { return targetCopies[sourceIndex]; }
        result = Array.isArray(value) ? [] : {};
        sourceSeen.push(value);
        targetCopies.push(result);
        if (Array.isArray(value)) {
            for (index = 0; index < value.length; index += 1) {
                result.push(cloneValue(value[index], sourceSeen, targetCopies));
            }
        } else {
            keys = Object.keys(value);
            for (index = 0; index < keys.length; index += 1) {
                result[keys[index]] = cloneValue(value[keys[index]], sourceSeen, targetCopies);
            }
        }
        return result;
    }

    function deepFreeze(value, seen) {
        var values = seen || [];
        var keys;
        var index;
        if (!value || typeof value !== "object" || values.indexOf(value) !== -1) { return value; }
        values.push(value);
        keys = Object.keys(value);
        for (index = 0; index < keys.length; index += 1) {
            deepFreeze(value[keys[index]], values);
        }
        return Object.freeze(value);
    }

    function sameValue(left, right, seenLeft, seenRight) {
        var leftSeen = seenLeft || [];
        var rightSeen = seenRight || [];
        var leftKeys;
        var rightKeys;
        var index;
        var seenIndex;

        if (left === right) { return true; }
        if (!left || !right || typeof left !== "object" || typeof right !== "object") { return false; }
        if (Array.isArray(left) !== Array.isArray(right)) { return false; }
        seenIndex = leftSeen.indexOf(left);
        if (seenIndex !== -1) { return rightSeen[seenIndex] === right; }
        leftSeen.push(left);
        rightSeen.push(right);
        leftKeys = Object.keys(left);
        rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length) { return false; }
        for (index = 0; index < leftKeys.length; index += 1) {
            if (!Object.prototype.hasOwnProperty.call(right, leftKeys[index]) ||
                    !sameValue(left[leftKeys[index]], right[leftKeys[index]], leftSeen, rightSeen)) {
                return false;
            }
        }
        return true;
    }

    function createAgent(options) {
        var settings = isPlainObject(options) ? options : {};
        var agentId;
        var session;
        var sessionId;
        var scopeId;
        var lifecycleStage = "created";
        var revision = 0;
        var projectionRevision = 0;
        var scopeBoundary = deepFreeze({});
        var scope;
        var projection;
        var projectionSubscribers = [];
        var onListenerError = typeof settings.onListenerError === "function" ? settings.onListenerError : function () {};

        if (!sessionRuntime || typeof sessionRuntime.createSessionLog !== "function") {
            fail(ERROR_CODES.AGENT_RUNTIME_UNAVAILABLE);
        }

        agentSequence += 1;
        scopeSequence += 1;
        agentId = "agent_" + String(agentSequence);
        session = sessionRuntime.createSessionLog();
        sessionId = session.getSessionId();
        scopeId = "scope_" + String(scopeSequence);

        function assertNotDisposed() {
            if (lifecycleStage === "disposed") { fail(ERROR_CODES.AGENT_DISPOSED); }
        }

        function getSessionLastSeq() {
            var events = session.getEvents();
            return events.length > 0 ? events[events.length - 1].seq : 0;
        }

        function createEnvelope(changeKind) {
            return deepFreeze({
                projectionRevision: projectionRevision,
                agentRevision: revision,
                sessionSeq: getSessionLastSeq(),
                changeKind: changeKind
            });
        }

        function reportListenerFailure(error, envelope) {
            try { onListenerError(error, envelope); }
            catch (reportError) { /* Error reporting is out-of-band and contained. */ }
        }

        function notifyConsumers(changeKind) {
            var envelope = createEnvelope(changeKind);
            var listeners = projectionSubscribers.slice();
            var index;
            for (index = 0; index < listeners.length; index += 1) {
                try { listeners[index](envelope); }
                catch (error) { reportListenerFailure(error, envelope); }
            }
        }

        function commitProjectionChange(changeKind) {
            projectionRevision += 1;
            notifyConsumers(changeKind);
        }

        scope = Object.freeze({
            getScopeId: function () { return scopeId; },
            getBoundary: function () { return scopeBoundary; }
        });

        session.subscribe(function () {
            commitProjectionChange("session");
        });

        projection = Object.freeze({
            getSnapshot: function () {
                return deepFreeze({
                    agentId: agentId,
                    lifecycleStage: lifecycleStage,
                    scopeId: scopeId,
                    scopeBoundary: scopeBoundary,
                    agentRevision: revision,
                    sessionId: sessionId,
                    sessionLastSeq: getSessionLastSeq(),
                    projectionRevision: projectionRevision
                });
            },
            readSessionEvents: function (options) {
                var readOptions = isPlainObject(options) ? options : {};
                var fromSeq = typeof readOptions.fromSeq === "number" && readOptions.fromSeq >= 1 ? readOptions.fromSeq : 1;
                return deepFreeze(session.getEvents().filter(function (event) { return event.seq >= fromSeq; }));
            },
            subscribe: function (listener) {
                var subscribed = true;
                assertNotDisposed();
                if (typeof listener !== "function") { fail(ERROR_CODES.AGENT_PROJECTION_LISTENER_INVALID); }
                projectionSubscribers.push(listener);
                try { listener(createEnvelope("initial")); }
                catch (error) { reportListenerFailure(error, createEnvelope("initial")); }
                return Object.freeze({
                    unsubscribe: function () {
                        var index;
                        if (!subscribed) { return; }
                        subscribed = false;
                        index = projectionSubscribers.indexOf(listener);
                        if (index !== -1) { projectionSubscribers.splice(index, 1); }
                    }
                });
            }
        });

        return Object.freeze({
            getAgentId: function () { return agentId; },
            getSessionId: function () { return sessionId; },
            getSession: function () { return session; },
            getLifecycleStage: function () { return lifecycleStage; },
            getScope: function () { return scope; },
            getProjection: function () { return projection; },
            getRevision: function () { return revision; },
            getSnapshot: function () {
                return deepFreeze({
                    agentId: agentId,
                    sessionId: sessionId,
                    lifecycleStage: lifecycleStage,
                    scopeId: scopeId,
                    scopeBoundary: scopeBoundary,
                    revision: revision
                });
            },
            activate: function () {
                assertNotDisposed();
                if (lifecycleStage === "created") {
                    lifecycleStage = "active";
                    revision += 1;
                    commitProjectionChange("agent");
                }
                return lifecycleStage;
            },
            setScopeBoundary: function (snapshot) {
                var nextBoundary;
                assertNotDisposed();
                if (!isPlainObject(snapshot)) { fail(ERROR_CODES.AGENT_SCOPE_BOUNDARY_INVALID); }
                nextBoundary = deepFreeze(cloneValue(snapshot));
                if (!sameValue(scopeBoundary, nextBoundary)) {
                    scopeBoundary = nextBoundary;
                    revision += 1;
                    commitProjectionChange("agent");
                }
                return scopeBoundary;
            },
            dispose: function () {
                if (lifecycleStage !== "disposed") {
                    lifecycleStage = "disposed";
                    revision += 1;
                    commitProjectionChange("disposed");
                    session.close();
                    projectionSubscribers = [];
                }
                return lifecycleStage;
            }
        });
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        createAgent: createAgent
    });
}));
