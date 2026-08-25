(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaAgentSurfaceProjection";
    var exported = Object.freeze(factory());

    if (root && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MODULE_REVISION = "vela-agent-surface-projection-0.3.3-v1";

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
        keys = Object.keys(value);
        for (index = 0; index < keys.length; index += 1) {
            result[keys[index]] = cloneValue(value[keys[index]], sourceSeen, targetCopies);
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
        for (index = 0; index < keys.length; index += 1) { deepFreeze(value[keys[index]], values); }
        return Object.freeze(value);
    }

    function createSurfaceReadModel(snapshot, sessionEvents) {
        var events = Array.isArray(sessionEvents) ? sessionEvents : [];
        return deepFreeze({
            runtime: {
                agentId: snapshot.agentId,
                lifecycleStage: snapshot.lifecycleStage,
                scopeId: snapshot.scopeId,
                scopeBoundary: cloneValue(snapshot.scopeBoundary),
                agentRevision: snapshot.agentRevision
            },
            session: {
                sessionId: snapshot.sessionId,
                lastSeq: snapshot.sessionLastSeq
            },
            projection: {
                projectionRevision: snapshot.projectionRevision
            },
            events: events.map(function (event) {
                return { seq: event.seq, kind: event.kind, family: event.family };
            })
        });
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        createSurfaceReadModel: createSurfaceReadModel
    });
}));
