#!/usr/bin/env node
"use strict";

const assert = require("assert");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");

let assertions = 0;

function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}

function expectCode(fn, code, message) {
    let thrown = null;
    try {
        fn();
    } catch (error) {
        thrown = error;
    }
    assert.ok(thrown && thrown.code === code, message || ("Expected " + code));
    assertions += 1;
}

function expectThrows(fn, message) {
    let thrown = false;
    try {
        fn();
    } catch (error) {
        thrown = true;
    }
    assert.ok(thrown, message || "Expected an exception");
    assertions += 1;
}

function deepEqual(actual, expected, message) {
    assert.deepStrictEqual(actual, expected, message);
    assertions += 1;
}

// ---------------------------------------------------------------------------
// C2 — event taxonomy
// ---------------------------------------------------------------------------

check(sessionRuntime.classifyEventKind("user/message") === "fact", "user/message is a fact event");
check(sessionRuntime.classifyEventKind("agent/action-performed") === "fact", "action-performed is a fact event");
check(sessionRuntime.classifyEventKind("tool/result") === "fact", "tool/result is a fact event");
check(sessionRuntime.classifyEventKind("ae/state-observed") === "fact", "state-observed is a fact event");
check(sessionRuntime.classifyEventKind("task/started") === "control", "task/started is a control event");
check(sessionRuntime.classifyEventKind("task/review-required") === "control", "task/review-required is a control event");
check(sessionRuntime.classifyEventKind("task/review-rejected") === "control", "task/review-rejected is a control event");
check(sessionRuntime.classifyEventKind("permission/requested") === "control", "permission/requested is a control event");
check(sessionRuntime.classifyEventKind("todo/write") === "control", "todo/write is a control event");
check(sessionRuntime.classifyEventKind("summary/created") === "derived", "summary/created is a derived event");
check(sessionRuntime.classifyEventKind("title/generated") === "derived", "title/generated is a derived event");
check(sessionRuntime.classifyEventKind("inferred-operation") === "derived", "inferred-operation is a derived event");
check(sessionRuntime.classifyEventKind("unknown/thing") === null, "unknown kind fails closed to null");
check(sessionRuntime.classifyEventKind(null) === null, "null kind fails closed");
check(sessionRuntime.isSessionEventKind("user/message"), "isSessionEventKind true for known kind");
check(!sessionRuntime.isSessionEventKind("mystery/kind"), "isSessionEventKind false for unknown kind");

// ---------------------------------------------------------------------------
// C3 — AuthorityEvidenceSource whitelist
// ---------------------------------------------------------------------------

["permission/decided", "delegation/granted", "delegation/revoked", "task/execution-armed"].forEach((kind) => {
    check(sessionRuntime.isAuthorityEvidenceKind(kind), kind + " is authority evidence");
});
["todo/write", "task/paused", "task/started", "user/message", "summary/created", "permission/requested"].forEach((kind) => {
    check(!sessionRuntime.isAuthorityEvidenceKind(kind), kind + " is NOT authority evidence (no coarse classification)");
});
const authorityIdentityLog = sessionRuntime.createSessionLog({ sessionId: "session_authority_identity" });
const publicAuthorityShape = authorityIdentityLog.append({ kind: "delegation/granted", requestId: "req_public", payload: { grantId: "forged" } });
const authorityAppender = sessionRuntime.createAuthorityEventAppender(authorityIdentityLog);
const trustedAuthorityRecord = authorityAppender.append({ kind: "delegation/granted", requestId: "req_trusted", payload: { grantId: "grant_local" } });
check(!sessionRuntime.isTrustedAuthorityEvent(publicAuthorityShape), "Public append cannot create trusted authority-event identity");
check(sessionRuntime.isTrustedAuthorityEvent(trustedAuthorityRecord), "Authority appender creates module-private authority-event identity");
check(sessionRuntime.isTrustedAuthorityEventAppenderForSession(authorityAppender, authorityIdentityLog), "Authority appender is bound to its exact Session");
check(!sessionRuntime.isTrustedAuthorityEventAppenderForSession({ append() {} }, authorityIdentityLog), "Caller-created authority appender is rejected");
check(authorityIdentityLog.getEventBySeq(trustedAuthorityRecord.seq) === trustedAuthorityRecord, "Trusted Session provides exact seq identity lookup");

// ---------------------------------------------------------------------------
// C4 — approval event lifecycle
// ---------------------------------------------------------------------------

check(sessionRuntime.isPermissionEventKind("permission/requested"), "requested is a permission event");
check(sessionRuntime.isPermissionEventKind("permission/decided"), "decided is a permission event");
check(sessionRuntime.isPermissionTerminal("permission/decided"), "decided is terminal");
check(sessionRuntime.isPermissionTerminal("permission/cancelled"), "cancelled is terminal");
check(sessionRuntime.isPermissionTerminal("permission/expired"), "expired is terminal");
check(!sessionRuntime.isPermissionTerminal("permission/requested"), "requested is not terminal");
check(!sessionRuntime.isPermissionEventKind("todo/write"), "todo/write is not a permission event");

const approvalLog = sessionRuntime.createSessionLog({ idFactory: (kind) => "test_" + kind + "_1" });
approvalLog.append({ kind: "permission/requested", requestId: "req_a", payload: { candidateId: "cand_1" } });
approvalLog.append({ kind: "permission/requested", requestId: "req_b" });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalLog.getEvents()),
    ["req_a", "req_b"],
    "two requested approvals are pending"
);
approvalLog.append({ kind: "permission/decided", requestId: "req_a", payload: { decision: "approve" } });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalLog.getEvents()),
    ["req_b"],
    "decided approval leaves pending set"
);
approvalLog.append({ kind: "permission/cancelled", requestId: "req_b", payload: { reason: "superseded" } });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalLog.getEvents()),
    [],
    "cancelled approval leaves pending set"
);

const approvalEdgeLog = sessionRuntime.createSessionLog({ sessionId: "session_approval_edges" });
approvalEdgeLog.append({ kind: "permission/decided", requestId: "req_terminal_first" });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalEdgeLog.getEvents()),
    [],
    "terminal event before requested does not create a pending approval"
);
approvalEdgeLog.append({ kind: "permission/requested" });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalEdgeLog.getEvents()),
    [],
    "permission event missing requestId does not create a pending approval"
);
approvalEdgeLog.append({ kind: "permission/requested", requestId: "req_duplicate" });
approvalEdgeLog.append({ kind: "permission/requested", requestId: "req_duplicate" });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalEdgeLog.getEvents()),
    ["req_duplicate"],
    "duplicate requested events produce one pending approval id"
);
approvalEdgeLog.append({ kind: "user/message", requestId: "req_duplicate" });
approvalEdgeLog.append({ kind: "task/paused", requestId: "req_duplicate" });
deepEqual(
    sessionRuntime.projectPendingApprovalIds(approvalEdgeLog.getEvents()),
    ["req_duplicate"],
    "interleaved non-permission events do not change pending approvals"
);

// ---------------------------------------------------------------------------
// C1 — Session: append-only, immutable, seq-continuous, deterministic projection
// ---------------------------------------------------------------------------

const log = sessionRuntime.createSessionLog({ sessionId: "session_fixture" });
const defaultIdLogA = sessionRuntime.createSessionLog();
const defaultIdLogB = sessionRuntime.createSessionLog();

check(log.getSessionId() === "session_fixture", "session id is honored");
check(defaultIdLogA.getSessionId() !== defaultIdLogB.getSessionId(), "default session ids are unique without environment dependencies");
check(log.isClosed() === false, "fresh session is open");

log.append({ kind: "user/message", payload: { text: "hello" } });
log.append({ kind: "ae/state-observed", payload: { property: "opacity", from: 100, to: 50 } });
log.append({ kind: "task/started" });

// seq continuity
const events = log.getEvents();
deepEqual(events.map((e) => e.seq), [1, 2, 3], "seq is contiguous from 1");
deepEqual(events.map((e) => e.family), ["fact", "fact", "control"], "family is classified on append");

// immutability: events are deep-frozen; engine-level modification is rejected
check(Object.isFrozen(events[0]), "appended event is frozen");
check(Object.isFrozen(events[0].payload), "appended event payload is frozen");
expectThrows(() => {
    "use strict";
    events[0].payload = { text: "tampered" };
}, "assigning to a frozen event throws");
expectThrows(() => {
    "use strict";
    events[1].seq = 99;
}, "assigning to a frozen event seq throws");

// projection is deterministic and does not mutate the log
const fold1 = log.project((acc, event) => acc.concat(event.kind), []);
const fold2 = log.project((acc, event) => acc.concat(event.kind), []);
deepEqual(fold1, ["user/message", "ae/state-observed", "task/started"], "projection folds event kinds");
deepEqual(fold2, fold1, "projection is deterministic");
deepEqual(log.getEvents().length, 3, "projection does not mutate the log");

// snapshot is frozen and carries session metadata
const snapshot = log.getSnapshot();
check(snapshot.sessionId === "session_fixture", "snapshot carries session id");
check(snapshot.lastSeq === 3, "snapshot carries last seq");
expectThrows(() => {
    "use strict";
    snapshot.events.push({});
}, "mutating the frozen snapshot throws");

// invalid events
expectCode(() => {
    log.append({ kind: "not/a-kind" });
}, sessionRuntime.ERROR_CODES.SESSION_EVENT_INVALID, "unknown kind is rejected");
expectCode(() => {
    log.append(null);
}, sessionRuntime.ERROR_CODES.SESSION_EVENT_INVALID, "non-object event is rejected");

// post-commit authority publishing
const listenerErrors = [];
const publishLog = sessionRuntime.createSessionLog({ sessionId: "session_publish", onListenerError(error, envelope) { listenerErrors.push({ error, envelope }); } });
const publishAppender = sessionRuntime.createAuthorityEventAppender(publishLog);
const observedAuthority = [];
publishLog.subscribe(() => { throw new Error("listener failure"); });
publishLog.subscribe((event) => { observedAuthority.push(event); });
const committedAuthorityEvent = publishAppender.append({ kind: "delegation/granted", requestId: "request_publish", payload: { grantId: "grant_publish" } });
check(observedAuthority.length === 0 && publishLog.getEvents()[0] === committedAuthorityEvent, "trusted authority append commits before subscriber publication");
check(publishAppender.publishCommitted(committedAuthorityEvent) === true, "exact authority appender publishes its committed event");
check(observedAuthority.length === 1 && observedAuthority[0] === committedAuthorityEvent && listenerErrors.length === 1 && listenerErrors[0].envelope.phase === "authority-post-commit", "listener failure is contained and later listeners receive the exact event");
check(publishLog.getEvents().length === 1 && publishLog.getEvents()[0] === committedAuthorityEvent, "post-commit listener failure cannot roll back Session history");
expectCode(() => publishAppender.publishCommitted(committedAuthorityEvent), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_ALREADY_PUBLISHED, "double publication is rejected");
expectCode(() => publishAppender.publishCommitted(Object.assign({}, committedAuthorityEvent)), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_UNPUBLISHABLE, "copied authority event is rejected");
const wrongPublishLog = sessionRuntime.createSessionLog({ sessionId: "session_publish_wrong" });
const wrongPublishAppender = sessionRuntime.createAuthorityEventAppender(wrongPublishLog);
expectCode(() => wrongPublishAppender.publishCommitted(committedAuthorityEvent), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_UNPUBLISHABLE, "wrong Session appender rejects a trusted event");
expectCode(() => publishAppender.publishCommitted(Object.freeze({ kind: "delegation/granted", seq: 2, requestId: null, payload: Object.freeze({}) })), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_UNPUBLISHABLE, "raw unappended event is rejected");

// A04: exact receipts, synchronous FIFO publication and isolated audiences.
// Exercise both real entry points; Authority append itself must stay silent.
[false, true].forEach((authority) => {
    const label = authority ? "authority" : "ordinary";
    const errors = [];
    const current = sessionRuntime.createSessionLog({ onListenerError(error, envelope) { errors.push({ error, envelope }); throw new Error("reporter"); } });
    const writer = authority ? sessionRuntime.createAuthorityEventAppender(current) : current;
    const make = (id) => ({ kind: authority ? "delegation/granted" : "user/message", requestId: id, payload: { id } });
    const deliver = (event) => { if (authority) check(writer.publishCommitted(event) === true, label + " explicit publication succeeds"); };
    const order = [];
    let inner, late;
    let second;
    current.subscribe((event) => {
        order.push("first:" + event.requestId);
        if (event.requestId === "A") {
            second.unsubscribe();
            late = current.subscribe((next) => order.push("late:" + next.requestId));
            inner = writer.append(make("B"));
            check(current.getEventBySeq(2) === inner, label + " nested receipt is committed immediately");
            deliver(inner);
            deepEqual(order, ["first:A"], label + " nested notification waits for the current audience");
            if (authority) expectCode(() => writer.publishCommitted(inner), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_ALREADY_PUBLISHED, "queued Authority publication already consumes its one-shot guard");
            throw new Error("first observer");
        }
    });
    second = current.subscribe((event) => order.push("second:" + event.requestId));
    const outer = writer.append(make("A"));
    if (authority) deepEqual(order, [], "Authority append does not publish");
    deliver(outer);
    check(outer === current.getEventBySeq(1) && outer.requestId === "A", label + " outer receipt is exactly A");
    check(inner === current.getEventBySeq(2) && inner.requestId === "B", label + " inner receipt is exactly B");
    deepEqual(order, ["first:A", "second:A", "first:B", "late:B"], label + " snapshot audience / FIFO drain finishes synchronously");
    check(errors.length === 1 && errors[0].envelope.event === outer, label + " listener error identifies the committed event");
    check(errors[0].error.message === "first observer", label + " all callback assertions completed before the deliberate failure");
    check(Object.isFrozen(errors[0].envelope), label + " diagnostic envelope is immutable");
    check(errors[0].envelope.phase === (authority ? "authority-post-commit" : "session-post-commit"), label + " error uses the existing diagnostic port");
    late.unsubscribe();
    const third = writer.append(make("C")); deliver(third);
    deepEqual(order.slice(4), ["first:C"], label + " removals affect future publications only");
    deepEqual(current.getEvents().map(e => e.requestId), ["A", "B", "C"], label + " committed sequence stays intact after errors");
});

[false, true].forEach((authority) => {
    const current = sessionRuntime.createSessionLog();
    const writer = authority ? sessionRuntime.createAuthorityEventAppender(current) : current;
    const publish = (id) => { const event = writer.append({ kind: authority ? "delegation/revoked" : "user/message", requestId: id }); if (authority) writer.publishCommitted(event); return event; };
    const order = [];
    let first;
    first = current.subscribe(e => { order.push("first:" + e.requestId); first.unsubscribe(); first.unsubscribe(); });
    const repeated = e => order.push("same:" + e.requestId);
    const handleA = current.subscribe(repeated);
    const handleB = current.subscribe(repeated);
    publish("A");
    handleA.unsubscribe(); handleA.unsubscribe(); publish("B");
    handleB.unsubscribe(); publish("C");
    deepEqual(order, ["first:A", "same:A", "same:A", "same:B"], "subscription tokens isolate duplicate functions and repeated unsubscribe");
});

[false, true].forEach((authority) => {
    const current = sessionRuntime.createSessionLog();
    const writer = authority ? sessionRuntime.createAuthorityEventAppender(current) : current;
    const notified = [];
    const make = id => ({ kind: authority ? "delegation/revoked" : "user/message", requestId: id });
    let nested;
    current.subscribe(e => {
        notified.push(e.requestId);
        nested = writer.append(make("B"));
        if (authority) writer.publishCommitted(nested);
        current.close(); current.close();
    });
    const later = current.subscribe(() => notified.push("later"));
    const outer = writer.append(make("A"));
    if (authority) check(writer.publishCommitted(outer) === true, "closing observer does not turn Authority publish into failure");
    deepEqual(notified, ["A"], "close cancels remaining callbacks and queued publications");
    check(outer === current.getEventBySeq(1) && nested === current.getEventBySeq(2), "close preserves both committed receipts");
    deepEqual(current.project((acc, e) => acc.concat(e.requestId), []), ["A", "B"], "closed log remains readable for projection");
    expectCode(() => current.subscribe(() => {}), sessionRuntime.ERROR_CODES.SESSION_CLOSED, "subscribe after close is rejected");
    expectCode(() => writer.append(make("C")), sessionRuntime.ERROR_CODES.SESSION_CLOSED, "closed writer cannot append");
    if (authority) expectCode(() => writer.publishCommitted(nested), sessionRuntime.ERROR_CODES.SESSION_CLOSED, "closed writer cannot republish");
    later.unsubscribe();
});

// Audience capture happens at explicit publication, not Authority append time.
{
    const current = sessionRuntime.createSessionLog();
    const writer = sessionRuntime.createAuthorityEventAppender(current);
    const order = [];
    const early = current.subscribe(() => order.push("early"));
    const event = writer.append({ kind: "permission/decided" });
    early.unsubscribe(); current.subscribe(() => order.push("late"));
    writer.publishCommitted(event);
    deepEqual(order, ["late"], "Authority publication samples its then-current subscribers");
}

// A diagnostic callback may reenter but cannot replace the committed receipt.
{
    let inner; const delivered = [];
    const current = sessionRuntime.createSessionLog({ onListenerError() { inner = current.append({ kind: "user/message", requestId: "B" }); throw new Error("reporting failed"); } });
    current.subscribe(e => { if (e.requestId === "A") throw new Error("observer failed"); });
    current.subscribe(e => delivered.push(e));
    const outer = current.append({ kind: "user/message", requestId: "A" });
    deepEqual(delivered, [outer, inner], "diagnostic reentry is contained in publication order");
    check(outer.seq === 1 && inner.seq === 2, "diagnostic reentry preserves receipts and seq");
}

// A04: data-only normalization, independent ownership and pre-commit rejection.
[false, true].forEach((authority) => {
    const current = sessionRuntime.createSessionLog();
    const writer = authority ? sessionRuntime.createAuthorityEventAppender(current) : current;
    const kind = authority ? "permission/decided" : "user/message";
    const nested = { value: 1 };
    const dictionary = Object.create(null); dictionary.entry = "data";
    const payload = { nested, list: [nested, null, undefined, false, "text", 2], dictionary };
    Object.defineProperty(payload, "hidden", { value: { value: 3 } });
    Object.defineProperty(payload, "__proto__", { value: { value: 4 }, enumerable: true });
    const input = { kind, requestId: "original", payload, seq: 99, family: "forged" };
    const event = writer.append(input);
    check(!Object.isFrozen(input) && !Object.isFrozen(payload) && !Object.isFrozen(nested), "normalization never freezes caller data");
    check(event.payload !== payload && event.payload.nested !== nested && event.payload.list !== payload.list, "nested objects and arrays are independently owned");
    check(event.payload.dictionary !== dictionary && Object.getPrototypeOf(event.payload.dictionary) === null, "null-prototype data is copied");
    input.requestId = "changed"; nested.value = 9; payload.list.push("later"); payload.hidden.value = 8;
    check(event.requestId === "original" && event.payload.nested.value === 1 && event.payload.list.length === 6 && event.payload.hidden.value === 3, "caller changes cannot change event facts");
    check(event.seq === 1 && event.family === sessionRuntime.classifyEventKind(kind), "caller cannot set seq or classification");
    check(Object.isFrozen(event) && Object.isFrozen(event.payload) && Object.isFrozen(event.payload.list[0]) && Object.isFrozen(event.payload.hidden), "all retained data is immutable including hidden fields");
    check(Object.prototype.hasOwnProperty.call(event.payload, "__proto__") && event.payload.__proto__.value === 4 && Object.getPrototypeOf(event.payload) === Object.prototype, "special keys remain data, without prototype assignment");
    check(event.payload.list[2] === undefined && Object.prototype.hasOwnProperty.call(event.payload.list, 2), "undefined data retains its optional-field meaning");
    check(sessionRuntime.isTrustedAuthorityEvent(event) === authority, "copying payload does not change Authority ownership");
    const frozen = Object.freeze({ leaf: Object.freeze({ value: 5 }) });
    const fromFrozen = writer.append({ kind, payload: frozen });
    check(fromFrozen.payload !== frozen && fromFrozen.payload.leaf !== frozen.leaf, "even frozen caller objects are copied");
    const sparse = []; sparse.length = 3; sparse[2] = "end";
    const sparseEvent = writer.append({ kind, payload: { sparse } });
    check(sparseEvent.payload.sparse.length === 3 && !(0 in sparseEvent.payload.sparse) && sparseEvent.payload.sparse[2] === "end", "array holes are preserved");
    [null, undefined, [], "payload", 3, false, new Date(0), function () {}].forEach(value => {
        deepEqual(writer.append({ kind, payload: value }).payload, {}, "foundation non-plain root payload normalization is retained");
    });
    let calls = 0;
    const getter = () => { calls += 1; throw new Error("must not execute"); };
    const accessor = (name, value, enumerable = true) => Object.defineProperty(value, name, { enumerable, get: getter });
    const cycle = {}; cycle.self = cycle;
    const symbolKey = {}; symbolKey[Symbol("key")] = "value";
    const invalid = [
        accessor("kind", {}), accessor("payload", { kind }), accessor("requestId", { kind }), accessor("ignored", { kind }, false),
        { kind, payload: accessor("live", {}) }, { kind, payload: { nested: accessor("live", {}, false) } },
        { kind, payload: { list: [accessor("live", {})] } }, { kind, payload: { list: accessor("0", []) } },
        { kind, payload: { nested: Object.defineProperty({}, "set", { set: getter }) } },
        { kind, payload: { toJSON: getter } }, { kind, payload: { method: getter } },
        { kind, payload: { bad: NaN } }, { kind, payload: { bad: Infinity } }, { kind, payload: { bad: Symbol("value") } },
        { kind, payload: { bad: BigInt(1) } }, { kind, payload: { date: new Date(0) } },
        { kind, payload: { instance: new (class Local {})() } }, { kind, payload: cycle }, { kind, payload: symbolKey },
        accessor(Symbol.toStringTag, { kind }), { kind, payload: accessor(Symbol.toStringTag, {}) }
    ];
    invalid.forEach((input, index) => {
        const before = current.getSnapshot();
        expectCode(() => writer.append(input), sessionRuntime.ERROR_CODES.SESSION_EVENT_INVALID, "invalid data case " + index + " rejects through the real writer");
        const after = current.getSnapshot();
        check(after.lastSeq === before.lastSeq && after.events.length === before.events.length && after.events.every((e, i) => e === before.events[i]), "rejected input cannot change seq/log/identities");
    });
    check(calls === 0, "no getter, setter, toJSON or executable member ran");
    const ignoredTopLevel = writer.append({ kind, toJSON: getter, payload: { value: 1 } });
    check(calls === 0 && !Object.prototype.hasOwnProperty.call(ignoredTopLevel, "toJSON"), "unretained top-level extension data is never executed or frozen");
    const nextSeq = current.getSnapshot().lastSeq + 1;
    check(writer.append({ kind }).seq === nextSeq, "next valid event has no rejection-created seq gap");
});

// Reflection errors are validation failures. Reflection is not a sandbox for
// hostile Proxies, but even reentrant reflection cannot commit another event.
{
    const current = sessionRuntime.createSessionLog(); let attempted = 0;
    const payload = new Proxy({}, { ownKeys() { attempted += 1; current.append({ kind: "user/message" }); return []; } });
    expectCode(() => current.append({ kind: "user/message", payload }), sessionRuntime.ERROR_CODES.SESSION_EVENT_INVALID, "reflection reentry is rejected before any commit");
    check(attempted === 1 && current.getSnapshot().lastSeq === 0 && current.getEvents().length === 0, "reflection reentry leaves log and seq unchanged");
    check(current.append({ kind: "user/message" }).seq === 1, "normalization guard releases after rejection");
}

// Legal push order agrees with replay / pure project. Explicit unpublished
// Authority evidence is in the log, but is never auto-published by ordinary append.
{
    const current = sessionRuntime.createSessionLog();
    const writer = sessionRuntime.createAuthorityEventAppender(current);
    const pushed = [];
    const fold = (acc, e) => acc.concat([e.seq + ":" + e.kind]);
    current.subscribe(e => {
        if (e.kind === "permission/requested") {
            const terminal = writer.append({ kind: "permission/decided", requestId: e.requestId, payload: { decision: "approved" } });
            writer.publishCommitted(terminal);
        }
    });
    current.subscribe(e => pushed.push(e));
    current.append({ kind: "permission/requested", requestId: "request_A" });
    current.append({ kind: "task/completed" });
    deepEqual(pushed.reduce(fold, []), current.project(fold, []), "published legal reentrant sequence equals log project");
    deepEqual(sessionRuntime.projectPendingApprovalIds(pushed), sessionRuntime.projectPendingApprovalIds(current.getEvents()), "push and replay agree on approval projection");
    const replay = sessionRuntime.createSessionLog({ sessionId: current.getSessionId() });
    const replayWriter = sessionRuntime.createAuthorityEventAppender(replay);
    current.getEvents().forEach(e => {
        const copied = replay.append(e);
        check(!sessionRuntime.isTrustedAuthorityEvent(copied), "event replay never restores Authority identity");
        expectCode(() => replayWriter.publishCommitted(copied), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_UNPUBLISHABLE, "authority-shaped replay cannot publish");
    });
    deepEqual(replay.project(fold, []), current.project(fold, []), "replay preserves data projection without authorization");
    expectCode(() => replayWriter.publishCommitted(current.getEventBySeq(2)), sessionRuntime.ERROR_CODES.SESSION_AUTHORITY_EVENT_UNPUBLISHABLE, "same Session id string cannot cross exact Session ownership");
    const deferred = writer.append({ kind: "delegation/granted" });
    const publicEvent = current.append({ kind: "user/message" });
    check(pushed[pushed.length - 1] === publicEvent && pushed.indexOf(deferred) === -1, "ordinary append cannot implicitly publish committed Authority evidence");
    writer.publishCommitted(deferred);
    check(pushed[pushed.length - 1] === deferred, "deferred event is delivered only at its explicit publication position");
}

// close semantics
log.close();
check(log.isClosed() === true, "close marks session closed");
expectCode(() => {
    log.append({ kind: "user/message" });
}, sessionRuntime.ERROR_CODES.SESSION_CLOSED, "append after close is rejected");
expectCode(() => {
    log.getSnapshot();
}, sessionRuntime.ERROR_CODES.SESSION_CLOSED, "snapshot after close is rejected");

// ---------------------------------------------------------------------------
// C7 — SessionPersistence seam (in-memory provider)
// ---------------------------------------------------------------------------

const persistence = sessionRuntime.createInMemorySessionPersistence();
const persistedLog = sessionRuntime.createSessionLog({ sessionId: "session_persisted" });
persistedLog.append({ kind: "user/message", payload: { text: "persist me" } });
persistedLog.append({ kind: "task/started" });

const receipt = persistence.persist(persistedLog.getSnapshot());
check(typeof receipt === "string" && receipt.length > 0, "persist returns a receipt");
const restored = persistence.restore(receipt);
check(restored !== null, "restore returns a snapshot");
deepEqual(restored.events.map((e) => e.seq), [1, 2], "restored snapshot keeps seq");
deepEqual(restored.events.map((e) => e.kind), ["user/message", "task/started"], "restored snapshot keeps kinds");
check(persistence.restore("receipt_missing") === null, "unknown receipt restores null");

const projectionFold = (acc, event) => acc.concat(event.seq + ":" + event.kind);
const liveProjection = persistedLog.project(projectionFold, []);
const restoredProjection = restored.events.reduce(projectionFold, []);
deepEqual(restoredProjection, liveProjection, "restored event sequence reproduces the live deterministic projection");

const nullPersistence = sessionRuntime.createNullSessionPersistence();
check(nullPersistence.persist(persistedLog.getSnapshot()) === null, "null provider persist is legal");
check(nullPersistence.restore("anything") === null, "null provider restore is legal");

// ---------------------------------------------------------------------------
// C5 — state tri-partition
// ---------------------------------------------------------------------------

check(sessionRuntime.isValidStateTripartition({ agentActivity: "idle", taskState: "waiting-approval", presentationStatus: "waiting" }), "typical idle/waiting-approval/waiting combination is valid");
check(sessionRuntime.isValidStateTripartition({ agentActivity: "running", taskState: "active", presentationStatus: "working" }), "running/active/working combination is valid");
check(!sessionRuntime.isValidStateTripartition({ agentActivity: "paused", taskState: "active", presentationStatus: "working" }), "invalid agentActivity is rejected");
check(!sessionRuntime.isValidStateTripartition({ agentActivity: "idle", taskState: "mystery", presentationStatus: "waiting" }), "invalid taskState is rejected");
check(!sessionRuntime.isValidStateTripartition({ agentActivity: "idle", taskState: "active", presentationStatus: "mystery" }), "invalid presentationStatus is rejected");
check(!sessionRuntime.isValidStateTripartition(null), "null state is rejected");

// ---------------------------------------------------------------------------
// C8 — Agent interface shapes (no factories, no loop)
// ---------------------------------------------------------------------------

check(sessionRuntime.AGENT_LIFECYCLE_STAGES.indexOf("created") !== -1, "agent lifecycle includes created");
check(sessionRuntime.AGENT_INTERFACE_SHAPES.agentDriver.loop.indexOf("Observe") !== -1, "driver loop shape documented, not implemented");
check(sessionRuntime.AGENT_INTERFACE_SHAPES.agentScope.abort === "abort lifetime owner", "scope owns abort lifetime");
check(sessionRuntime.EXECUTION_ARMED_CONTRACT.owner === "TaskRun (0.3.5+ object)", "executionArmed is owned by TaskRun, not Agent");
check(sessionRuntime.EXECUTION_ARMED_CONTRACT.persistence.indexOf("never persisted") !== -1, "executionArmed is not Session-persisted");

// ---------------------------------------------------------------------------

console.log("test-vela-session-runtime: " + assertions + " assertions passed");
