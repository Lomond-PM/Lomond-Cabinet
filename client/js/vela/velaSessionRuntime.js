(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaSessionRuntime";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var exported = Object.freeze(factory());

    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // =========================================================================
    // Vela Session runtime — append-only data and synchronous publication
    // Contract: docs/design/vela-agent-runtime-contract-foundation-0.3.3.md
    // Baseline: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x, §5/§6)
    // Loaded by client/index.html and consumed by AgentRuntime / Runtime's
    // Authority composition. The CommonJS entry exercises the same factory.
    // =========================================================================

    var MODULE_REVISION = "vela-session-runtime-0.3.3-v1";
    var defaultSessionSequence = 0;
    var trustedSessionLogs = new WeakSet();
    var authorityAppendBySession = new WeakMap();
    var authorityPublishBySession = new WeakMap();
    var trustedAuthorityAppenders = new WeakMap();
    var trustedAuthorityEvents = new WeakSet();
    var authorityEventSessions = new WeakMap();
    var publishedAuthorityEvents = new WeakSet();

    // Stable error codes (do not localize; do not change).
    var ERROR_CODES = Object.freeze({
        SESSION_EVENT_INVALID: "SESSION_EVENT_INVALID",
        SESSION_EVENT_FROZEN: "SESSION_EVENT_FROZEN",
        SESSION_SEQ_GAP: "SESSION_SEQ_GAP",
        SESSION_CLOSED: "SESSION_CLOSED",
        SESSION_AUTHORITY_EVENT_UNPUBLISHABLE: "SESSION_AUTHORITY_EVENT_UNPUBLISHABLE",
        SESSION_AUTHORITY_EVENT_ALREADY_PUBLISHED: "SESSION_AUTHORITY_EVENT_ALREADY_PUBLISHED"
    });

    function fail(code) {
        var error = new Error(code);
        error.code = code;
        throw error;
    }

    function isPlainObject(value) {
        if (!value || typeof value !== "object") { return false; }
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
    }

    function deepFreeze(value, seen) {
        var values = seen || [];
        var keys;
        var index;
        if (!value || typeof value !== "object" || values.indexOf(value) !== -1) { return value; }
        values.push(value);
        if (Array.isArray(value)) {
            for (index = 0; index < value.length; index += 1) { deepFreeze(value[index], values); }
        } else {
            keys = Object.keys(value);
            for (index = 0; index < keys.length; index += 1) { deepFreeze(value[keys[index]], values); }
        }
        return Object.freeze(value);
    }

    // Read descriptors, never accessors / toJSON. Only owned data is frozen.
    function dataDescriptors(value) {
        var descriptors = Object.create(null);
        if (Object.getOwnPropertySymbols(value).length) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
        Object.getOwnPropertyNames(value).forEach(function (key) {
            var descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            descriptors[key] = descriptor;
        });
        return descriptors;
    }

    function copyData(value, ancestors) {
        var array;
        var descriptors;
        var copy;
        if (value === null || value === undefined || typeof value === "string" || typeof value === "boolean") { return value; }
        if (typeof value === "number" && Number.isFinite(value)) { return value; }
        array = Array.isArray(value);
        if ((!array && !isPlainObject(value)) || ancestors.indexOf(value) !== -1) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
        descriptors = dataDescriptors(value);
        copy = array ? [] : Object.create(Object.getPrototypeOf(value));
        ancestors.push(value);
        Object.keys(descriptors).forEach(function (key) {
            var descriptor = descriptors[key];
            if (array && key === "length") { return; }
            // Arrays retain holes and length; custom executable/object behavior
            // is not part of the event data contract.
            if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= descriptors.length.value)) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            Object.defineProperty(copy, key, { value: copyData(descriptor.value, ancestors), enumerable: descriptor.enumerable });
        });
        if (array) { copy.length = descriptors.length.value; }
        ancestors.pop();
        return Object.freeze(copy);
    }

    // -------------------------------------------------------------------------
    // C2 — typed SessionEvent taxonomy (frozen §6.2)
    // -------------------------------------------------------------------------

    var SESSION_EVENT_FAMILIES = Object.freeze(["fact", "control", "derived"]);

    var SESSION_EVENT_KINDS = Object.freeze({
        fact: Object.freeze([
            "user/message",
            "agent/action-performed",
            "tool/result",
            "ae/state-observed"
        ]),
        control: Object.freeze([
            "task/started",
            "task/paused",
            "task/review-required",
            "task/review-rejected",
            "task/completed",
            "task/blocked",
            "task/cancelled",
            "permission/requested",
            "permission/decided",
            "permission/cancelled",
            "permission/expired",
            "delegation/granted",
            "delegation/revoked",
            "task/execution-armed",
            "todo/write"
        ]),
        derived: Object.freeze([
            "summary/created",
            "title/generated",
            "inferred-operation"
        ])
    });

    var KIND_TO_FAMILY = Object.freeze((function () {
        var map = {};
        SESSION_EVENT_FAMILIES.forEach(function (family) {
            SESSION_EVENT_KINDS[family].forEach(function (kind) {
                map[kind] = family;
            });
        });
        return map;
    })());

    function classifyEventKind(kind) {
        return typeof kind === "string" && Object.prototype.hasOwnProperty.call(KIND_TO_FAMILY, kind) ? KIND_TO_FAMILY[kind] : null;
    }

    function isSessionEventKind(kind) {
        return classifyEventKind(kind) !== null;
    }

    // -------------------------------------------------------------------------
    // C3 — AuthorityEvidenceSource whitelist (frozen §6.2)
    // -------------------------------------------------------------------------

    // Only kinds explicitly listed here may participate in authority judgment.
    // "Fact + Control authoritative / Derived not" coarse classification is
    // explicitly forbidden; todo/write and task/paused gain no safety meaning.
    var AUTHORITY_EVIDENCE_KINDS = Object.freeze([
        "permission/decided",
        "delegation/granted",
        "delegation/revoked",
        "task/execution-armed"
        // verified target facts (Tier-3 capture + value digest) are FactEvent
        // fields consumed by later authority stages (0.3.5+); no kind-level entry
        // is added here because the whitelist is kind-scoped by the baseline.
    ]);

    function isAuthorityEvidenceKind(kind) {
        return typeof kind === "string" && AUTHORITY_EVIDENCE_KINDS.indexOf(kind) !== -1;
    }

    // -------------------------------------------------------------------------
    // C4 — approval event lifecycle (frozen §6.3)
    // -------------------------------------------------------------------------

    var PERMISSION_REQUESTED = "permission/requested";
    var PERMISSION_TERMINALS = Object.freeze(["permission/decided", "permission/cancelled", "permission/expired"]);

    function isPermissionEventKind(kind) {
        return kind === PERMISSION_REQUESTED || PERMISSION_TERMINALS.indexOf(kind) !== -1;
    }

    function isPermissionTerminal(kind) {
        return PERMISSION_TERMINALS.indexOf(kind) !== -1;
    }

    // pending = requested − (decided ∪ cancelled ∪ expired); pure fold.
    function projectPendingApprovalIds(events) {
        var pending = [];
        var seen = {};
        var index;
        var event;
        var requestId;
        if (!Array.isArray(events)) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
        for (index = 0; index < events.length; index += 1) {
            event = events[index];
            if (!isPlainObject(event)) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            requestId = typeof event.requestId === "string" ? event.requestId : null;
            if (!requestId) { continue; }
            if (event.kind === PERMISSION_REQUESTED && !seen[requestId]) {
                seen[requestId] = true;
                pending.push(requestId);
            } else if (PERMISSION_TERMINALS.indexOf(event.kind) !== -1 && seen[requestId]) {
                seen[requestId] = false;
                pending = pending.filter(function (id) { return id !== requestId; });
            }
        }
        return Object.freeze(pending);
    }

    // -------------------------------------------------------------------------
    // C5 — state tri-partition (frozen §5.1)
    // -------------------------------------------------------------------------

    var AGENT_ACTIVITY = Object.freeze(["idle", "running"]);
    var TASK_STATE = Object.freeze(["active", "paused", "waiting-approval", "blocked", "completed", "cancelled"]);
    var PRESENTATION_STATUS = Object.freeze(["ready", "working", "waiting", "warning", "error"]);

    function contains(collection, value) {
        return collection.indexOf(value) !== -1;
    }

    function isValidStateTripartition(state) {
        return isPlainObject(state) &&
            contains(AGENT_ACTIVITY, state.agentActivity) &&
            contains(TASK_STATE, state.taskState) &&
            contains(PRESENTATION_STATUS, state.presentationStatus);
    }

    // -------------------------------------------------------------------------
    // C1 — Session: append-only typed event log + deterministic projection
    // -------------------------------------------------------------------------

    function createSessionLog(options) {
        var settings = isPlainObject(options) ? options : {};
        defaultSessionSequence += 1;
        var sessionId = typeof settings.sessionId === "string" && settings.sessionId.length > 0
            ? settings.sessionId
            : "session_" + (typeof settings.idFactory === "function" ? settings.idFactory("session") : String(defaultSessionSequence));
        var events = [];
        var lastSeq = 0;
        var closed = false;
        var subscribers = [];
        var publications = [];
        var notifying = false;
        var normalizing = false;
        var onListenerError = typeof settings.onListenerError === "function" ? settings.onListenerError : function () {};

        function assertOpen() {
            if (closed) { fail(ERROR_CODES.SESSION_CLOSED); }
        }

        function normalizeEvent(input) {
            var descriptors;
            var kind;
            var requestId;
            var payload;
            var family;
            if (!isPlainObject(input)) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            descriptors = dataDescriptors(input);
            kind = descriptors.kind && descriptors.kind.value;
            requestId = descriptors.requestId && descriptors.requestId.value;
            payload = descriptors.payload && descriptors.payload.value;
            family = classifyEventKind(kind);
            if (!family) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            return Object.freeze({
                kind: kind,
                family: family,
                seq: lastSeq + 1,
                requestId: typeof requestId === "string" ? requestId : null,
                // Preserve the foundation's missing / non-plain payload -> {}.
                payload: isPlainObject(payload) ? copyData(payload, []) : Object.freeze({})
            });
        }

        function publish(event, phase) {
            var cursor = 0;
            var publication;
            var index;
            publications.push({ event: event, phase: phase, listeners: subscribers.slice() });
            if (notifying) { return; }
            notifying = true;
            try {
                // FIFO within this synchronous drain; a nested append returns
                // its committed receipt before its queued callbacks run.
                while (!closed && cursor < publications.length) {
                    publication = publications[cursor];
                    cursor += 1;
                    for (index = 0; !closed && index < publication.listeners.length; index += 1) {
                        try { publication.listeners[index].listener(publication.event); }
                        catch (error) {
                            try { onListenerError(error, Object.freeze({ phase: publication.phase, event: publication.event })); }
                            catch (ignored) { /* Diagnostics cannot turn a commit into failure. */ }
                        }
                    }
                }
            } finally {
                publications = [];
                notifying = false;
            }
        }

        function appendInternal(input, authorityOwned) {
            var event;
            assertOpen();
            if (normalizing) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            normalizing = true;
            try {
                event = normalizeEvent(input);
                if (authorityOwned && !isAuthorityEvidenceKind(event.kind)) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
            } catch (invalidInput) {
                fail(ERROR_CODES.SESSION_EVENT_INVALID);
            } finally {
                normalizing = false;
            }
            assertOpen();
            if (event.seq !== lastSeq + 1) { fail(ERROR_CODES.SESSION_SEQ_GAP); }
            events.push(event);
            lastSeq = event.seq;
            if (authorityOwned) {
                trustedAuthorityEvents.add(event);
                authorityEventSessions.set(event, sessionLog);
            }
            // Authority transitions use a narrow append-and-return boundary.
            // Runtime publishes explicitly after its authority transaction;
            // re-entrant listeners must not split that transaction.
            if (!authorityOwned) { publish(event, "session-post-commit"); }
            return event;
        }
        function publishAuthorityInternal(event) {
            assertOpen();
            if (!trustedAuthorityEvents.has(event) || authorityEventSessions.get(event) !== sessionLog || sessionLog.getEventBySeq(event.seq) !== event) { fail(ERROR_CODES.SESSION_AUTHORITY_EVENT_UNPUBLISHABLE); }
            if (publishedAuthorityEvents.has(event)) { fail(ERROR_CODES.SESSION_AUTHORITY_EVENT_ALREADY_PUBLISHED); }
            publishedAuthorityEvents.add(event);
            publish(event, "authority-post-commit");
            return true;
        }

        var sessionLog = Object.freeze({
            append: function (input) {
                return appendInternal(input, false);
            },
            getEvents: function () {
                return Object.freeze(events.slice());
            },
            getEventBySeq: function (seq) {
                if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 1) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
                return seq <= events.length && events[seq - 1].seq === seq ? events[seq - 1] : null;
            },
            getSnapshot: function () {
                assertOpen();
                return Object.freeze({ sessionId: sessionId, events: Object.freeze(events.slice()), lastSeq: lastSeq });
            },
            project: function (fold, seed) {
                var accumulator = seed;
                var index;
                if (typeof fold !== "function") { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
                for (index = 0; index < events.length; index += 1) {
                    accumulator = fold(accumulator, events[index]);
                }
                return accumulator;
            },
            subscribe: function (listener) {
                var subscription;
                assertOpen();
                if (typeof listener !== "function") { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
                subscription = { listener: listener };
                subscribers.push(subscription);
                return Object.freeze({ unsubscribe: function () {
                    var index = subscribers.indexOf(subscription);
                    if (index !== -1) { subscribers.splice(index, 1); }
                } });
            },
            close: function () {
                closed = true;
                subscribers = [];
                publications = [];
            },
            getSessionId: function () { return sessionId; },
            isClosed: function () { return closed; }
        });
        trustedSessionLogs.add(sessionLog);
        authorityAppendBySession.set(sessionLog, function (input) { return appendInternal(input, true); });
        authorityPublishBySession.set(sessionLog, publishAuthorityInternal);
        return sessionLog;
    }

    function createAuthorityEventAppender(sessionLog) {
        var appendAuthority;
        var publishAuthority;
        var appender;
        if (!trustedSessionLogs.has(sessionLog) || !authorityAppendBySession.has(sessionLog)) { fail(ERROR_CODES.SESSION_EVENT_INVALID); }
        appendAuthority = authorityAppendBySession.get(sessionLog);
        publishAuthority = authorityPublishBySession.get(sessionLog);
        appender = Object.freeze({
            append: function (input) { return appendAuthority(input); },
            publishCommitted: function (event) { return publishAuthority(event); }
        });
        trustedAuthorityAppenders.set(appender, sessionLog);
        return appender;
    }

    // -------------------------------------------------------------------------
    // C7 — SessionPersistence seam (frozen §6.4): in-memory provider
    // -------------------------------------------------------------------------

    function createInMemorySessionPersistence() {
        var store = {};
        return Object.freeze({
            persist: function (snapshot) {
                var receipt;
                if (!isPlainObject(snapshot) || !Array.isArray(snapshot.events) || typeof snapshot.lastSeq !== "number") {
                    fail(ERROR_CODES.SESSION_EVENT_INVALID);
                }
                receipt = "receipt_" + String(Object.keys(store).length + 1);
                store[receipt] = deepFreeze(snapshot);
                return receipt;
            },
            restore: function (receipt) {
                return typeof receipt === "string" && Object.prototype.hasOwnProperty.call(store, receipt)
                    ? deepFreeze(store[receipt])
                    : null;
            }
        });
    }

    // Null provider is a legal 0.3.x choice (optional provider per §6.4).
    function createNullSessionPersistence() {
        return Object.freeze({
            persist: function () { return null; },
            restore: function () { return null; }
        });
    }

    // -------------------------------------------------------------------------
    // C8 — Agent / AgentScope / AgentDriver interface shapes (frozen §5)
    // Interface shapes only; no Agent factory and no reasoning loop (0.3.7).
    // -------------------------------------------------------------------------

    var AGENT_LIFECYCLE_STAGES = Object.freeze(["created", "active", "disposed"]);

    var AGENT_INTERFACE_SHAPES = Object.freeze({
        agent: Object.freeze({
            session: "Session (append-only typed event log + projection)",
            scope: "AgentScope (listeners / context / capabilities / abort)",
            lifecycle: "created / active / disposed; decoupled from TaskRun"
        }),
        agentScope: Object.freeze({
            listeners: "projection listeners owned by this scope",
            context: "active scope context",
            capabilities: "capability availability within scope",
            abort: "abort lifetime owner"
        }),
        agentDriver: Object.freeze({
            loop: "Observe → Reason → Act → Observe → Verify → Replan (0.3.7)",
            note: "0.3.3 defines the shape only; no loop implementation."
        })
    });

    // C6 — executionArmed semantics (frozen §5.2): process-level, non-persistent.
    // The TaskRun object is NOT implemented in 0.3.3 (baseline §5 note). The
    // in-memory Session above proves only that Session/runtime execution
    // authorization does not survive reload and is not Session-persisted.
    // Observation/read/analyze capability availability remains deferred.
    var EXECUTION_ARMED_CONTRACT = Object.freeze({
        owner: "TaskRun (0.3.5+ object)",
        persistence: "process-level only; never persisted",
        reloadSemantics: "reload resets to false; read/analyze remain available",
        notOwnedBy: "Agent"
    });

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        SESSION_EVENT_FAMILIES: SESSION_EVENT_FAMILIES,
        SESSION_EVENT_KINDS: SESSION_EVENT_KINDS,
        classifyEventKind: classifyEventKind,
        isSessionEventKind: isSessionEventKind,
        AUTHORITY_EVIDENCE_KINDS: AUTHORITY_EVIDENCE_KINDS,
        isAuthorityEvidenceKind: isAuthorityEvidenceKind,
        isPermissionEventKind: isPermissionEventKind,
        isPermissionTerminal: isPermissionTerminal,
        projectPendingApprovalIds: projectPendingApprovalIds,
        AGENT_ACTIVITY: AGENT_ACTIVITY,
        TASK_STATE: TASK_STATE,
        PRESENTATION_STATUS: PRESENTATION_STATUS,
        isValidStateTripartition: isValidStateTripartition,
        createSessionLog: createSessionLog,
        isTrustedSessionLog: function (sessionLog) { return Boolean(sessionLog && trustedSessionLogs.has(sessionLog)); },
        createAuthorityEventAppender: createAuthorityEventAppender,
        isTrustedAuthorityEventAppenderForSession: function (appender, sessionLog) { return Boolean(appender && trustedAuthorityAppenders.has(appender) && trustedAuthorityAppenders.get(appender) === sessionLog); },
        isTrustedAuthorityEvent: function (event) { return Boolean(event && trustedAuthorityEvents.has(event)); },
        createInMemorySessionPersistence: createInMemorySessionPersistence,
        createNullSessionPersistence: createNullSessionPersistence,
        AGENT_LIFECYCLE_STAGES: AGENT_LIFECYCLE_STAGES,
        AGENT_INTERFACE_SHAPES: AGENT_INTERFACE_SHAPES,
        EXECUTION_ARMED_CONTRACT: EXECUTION_ARMED_CONTRACT
    });
}));
