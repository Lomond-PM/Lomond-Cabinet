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
