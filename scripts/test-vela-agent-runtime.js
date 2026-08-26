#!/usr/bin/env node
"use strict";

const assert = require("assert");
const agentRuntime = require("../client/js/vela/velaAgentRuntime");

let assertions = 0;

function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}

function equal(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
    assertions += 1;
}

function deepEqual(actual, expected, message) {
    assert.deepStrictEqual(actual, expected, message);
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

const agentA = agentRuntime.createAgent();
const agentB = agentRuntime.createAgent();

check(agentA.getAgentId() !== agentB.getAgentId(), "two Agents have unique agent ids");
check(agentA.getAgentId() !== agentA.getSessionId(), "Agent identity differs from Session identity");
equal(agentA.getSession(), agentA.getSession(), "Agent retains exactly one Session association");
equal(agentA.getScope(), agentA.getScope(), "Agent retains exactly one AgentScope association");
equal(agentA.getLifecycleStage(), "created", "initial lifecycle is created");
equal(agentA.getRevision(), 0, "initial revision is zero");

const initialSession = agentA.getSession();
initialSession.append({ kind: "user/message", payload: { text: "history" } });
const eventCountBeforeLifecycle = initialSession.getEvents().length;

equal(agentA.activate(), "active", "created transitions to active");
equal(agentA.getRevision(), 1, "activation increments revision once");
equal(agentA.activate(), "active", "activation while active is a no-op");
equal(agentA.getRevision(), 1, "no-op activation does not increment revision");
equal(initialSession.getEvents().length, eventCountBeforeLifecycle, "activation appends no SessionEvent");

const scope = agentA.getScope();
const scopeId = scope.getScopeId();
const firstBoundaryInput = { focus: { name: "first" }, markers: [1, 2] };
const firstBoundary = agentA.setScopeBoundary(firstBoundaryInput);
equal(agentA.getRevision(), 2, "unequal boundary replacement increments revision once");
equal(agentA.getScope(), scope, "scope object identity remains stable after replacement");
equal(agentA.getScope().getScopeId(), scopeId, "scope id remains stable after replacement");
check(Object.isFrozen(firstBoundary), "new boundary snapshot is frozen");
check(Object.isFrozen(firstBoundary.focus), "nested boundary values are frozen");
check(Object.isFrozen(firstBoundary.markers), "boundary arrays are frozen");

firstBoundaryInput.focus.name = "mutated input";
equal(firstBoundary.focus.name, "first", "boundary is detached from caller input");

const secondBoundary = agentA.setScopeBoundary({ focus: { name: "second" }, markers: [3] });
equal(firstBoundary.focus.name, "first", "old boundary snapshot remains unchanged");
equal(secondBoundary.focus.name, "second", "new boundary snapshot replaces the old snapshot");
equal(agentA.getRevision(), 3, "second unequal boundary increments revision once");
equal(agentA.setScopeBoundary({ focus: { name: "second" }, markers: [3] }), secondBoundary, "equal boundary replacement reuses current snapshot");
equal(agentA.getRevision(), 3, "equal boundary replacement does not increment revision");
equal(initialSession.getEvents().length, eventCountBeforeLifecycle, "scope replacement appends no SessionEvent");

const activeSnapshot = agentA.getSnapshot();
check(Object.isFrozen(activeSnapshot), "Agent snapshot is frozen");
check(Object.isFrozen(activeSnapshot.scopeBoundary), "Agent snapshot boundary is frozen");
deepEqual(
    Object.keys(activeSnapshot).sort(),
    ["agentId", "lifecycleStage", "revision", "scopeBoundary", "scopeId", "sessionId", "turnId"],
    "Agent snapshot contains only the bounded runtime shape"
);
equal(activeSnapshot.turnId, null, "active Agent has no implicit turn");
const turnAgent = agentRuntime.createAgent();
turnAgent.activate();
const firstTurn = turnAgent.beginTurn();
check(Object.isFrozen(firstTurn), "turn identity is immutable");
equal(firstTurn.sessionId, turnAgent.getSessionId(), "turn is bound to the Agent Session");
equal(firstTurn.turnId, turnAgent.getCurrentTurnId(), "Runtime owns the current turn id");
const secondTurn = turnAgent.beginTurn();
check(secondTurn.turnId !== firstTurn.turnId, "each explicit turn has a unique identity");
equal(turnAgent.getSnapshot().turnId, secondTurn.turnId, "Agent snapshot projects current turn identity");

const forbiddenAgentFields = [
    "agentActivity", "taskState", "presentationStatus", "provider", "permission",
    "approval", "authority", "executionArmed", "DelegationGrant", "AgentDriver",
    "driver", "driverId", "driverKind"
];
forbiddenAgentFields.forEach((field) => {
    check(!Object.prototype.hasOwnProperty.call(activeSnapshot, field), "Agent snapshot excludes " + field);
});

const scopeSnapshot = { scopeId: scope.getScopeId(), scopeBoundary: scope.getBoundary() };
["permission", "authority", "approval", "grant", "capabilities"].forEach((field) => {
    check(!Object.prototype.hasOwnProperty.call(scopeSnapshot, field), "AgentScope excludes " + field);
});

const directDisposeAgent = agentRuntime.createAgent();
equal(directDisposeAgent.dispose(), "disposed", "created Agent may transition directly to disposed");
equal(directDisposeAgent.getRevision(), 1, "direct disposal increments revision once");

equal(agentA.dispose(), "disposed", "active transitions to disposed");
equal(agentA.getLifecycleStage(), "disposed", "disposed lifecycle remains readable");
equal(agentA.getRevision(), 4, "first disposal increments revision once");
equal(agentA.dispose(), "disposed", "dispose is idempotent");
equal(agentA.getRevision(), 4, "repeated dispose does not increment revision");
check(initialSession.isClosed(), "Agent disposal closes the Session write path");
expectCode(
    () => initialSession.append({ kind: "user/message" }),
    "SESSION_CLOSED",
    "Session append fails after Agent disposal"
);
deepEqual(initialSession.getEvents().map((event) => event.kind), ["user/message"], "historical Session events remain readable after disposal");
deepEqual(initialSession.project((acc, event) => acc.concat(event.kind), []), ["user/message"], "Session projection remains readable after disposal");
expectCode(() => agentA.activate(), agentRuntime.ERROR_CODES.AGENT_DISPOSED, "disposed Agent cannot activate");
expectCode(() => agentA.setScopeBoundary({}), agentRuntime.ERROR_CODES.AGENT_DISPOSED, "disposed Agent cannot replace scope boundary");
equal(initialSession.getEvents().length, eventCountBeforeLifecycle, "disposal appends no SessionEvent");

const lifecycleIndependentAgent = agentRuntime.createAgent();
lifecycleIndependentAgent.getSession().close();
equal(lifecycleIndependentAgent.getLifecycleStage(), "created", "Session.close does not drive Agent lifecycle");

check(!Object.prototype.hasOwnProperty.call(agentRuntime, "createAgentDriver"), "AgentDriver factory is not exported");
["run", "advance", "step", "invoke", "dispatch", "execute", "start", "pause", "resume", "subscribe", "unsubscribe"].forEach((name) => {
    check(!Object.prototype.hasOwnProperty.call(agentA, name), "Agent exposes no " + name + " API");
});

// ---------------------------------------------------------------------------
// 0.3.3-C — Agent-owned Projection seam
// ---------------------------------------------------------------------------

const reportedErrors = [];
const projectionAgent = agentRuntime.createAgent({
    onListenerError: (error, envelope) => reportedErrors.push({ error, envelope })
});
const projection = projectionAgent.getProjection();
check(projection && typeof projection.subscribe === "function", "Agent exposes an AgentProjection");
check(!Object.prototype.hasOwnProperty.call(projectionAgent, "subscribe"), "subscribe is not added to Agent");
check(!Object.prototype.hasOwnProperty.call(projectionAgent, "unsubscribe"), "unsubscribe is not added to Agent");

const primaryNotifications = [];
const primaryHandle = projection.subscribe((envelope) => primaryNotifications.push(envelope));
equal(primaryNotifications.length, 1, "subscribe synchronously sends exactly one initial envelope");
equal(primaryNotifications[0].changeKind, "initial", "initial envelope has initial change kind");
equal(primaryNotifications[0].projectionRevision, 0, "initial delivery does not increment projection revision");
check(Object.isFrozen(primaryNotifications[0]), "notification envelope is frozen");

projectionAgent.activate();
equal(primaryNotifications.length, 2, "activation sends one Agent notification");
equal(primaryNotifications[1].changeKind, "agent", "activation notification is classified as Agent change");
equal(primaryNotifications[1].agentRevision, projectionAgent.getRevision(), "Agent revision commits before activation notification");
equal(primaryNotifications[1].projectionRevision, 1, "activation increments projection revision once");

projectionAgent.activate();
equal(primaryNotifications.length, 2, "duplicate activation sends no notification");
equal(projectionAgent.getRevision(), 1, "duplicate activation leaves Agent revision unchanged");

projectionAgent.setScopeBoundary({ focus: "projection" });
equal(primaryNotifications.length, 3, "real Scope replacement sends one Agent notification");
equal(primaryNotifications[2].changeKind, "agent", "Scope replacement is classified as Agent change");
equal(primaryNotifications[2].agentRevision, 2, "Scope revision commits before notification");

projectionAgent.setScopeBoundary({ focus: "projection" });
equal(primaryNotifications.length, 3, "equal Scope replacement sends no notification");

const projectionSession = projectionAgent.getSession();
const agentRevisionBeforeAppend = projectionAgent.getRevision();
projectionSession.append({ kind: "user/message", payload: { text: "projection event" } });
equal(primaryNotifications.length, 4, "Session append sends one notification");
equal(primaryNotifications[3].changeKind, "session", "Session append uses Session change kind");
equal(primaryNotifications[3].sessionSeq, 1, "Session append advances session seq");
equal(primaryNotifications[3].agentRevision, agentRevisionBeforeAppend, "Session append leaves Agent revision unchanged");
equal(primaryNotifications[3].projectionRevision, 3, "Session append advances projection revision once");

let goodLaterNotifications = 0;
projection.subscribe((envelope) => {
    if (envelope.changeKind !== "initial") { throw new Error("expected consumer failure"); }
});
projection.subscribe((envelope) => {
    if (envelope.changeKind !== "initial") { goodLaterNotifications += 1; }
});
const eventsBeforeContainedAppend = projectionSession.getEvents().length;
projectionSession.append({ kind: "task/started" });
equal(projectionSession.getEvents().length, eventsBeforeContainedAppend + 1, "listener failure does not prevent or duplicate Session commit");
equal(goodLaterNotifications, 1, "bad subscriber does not block another subscriber");
equal(reportedErrors.length, 1, "injected reporter receives consumer error");
equal(reportedErrors[0].envelope.changeKind, "session", "reported error carries the failed notification envelope");

let laterSelfUnsubscribeCount = 0;
let laterSelfUnsubscribeHandle;
laterSelfUnsubscribeHandle = projection.subscribe((envelope) => {
    if (envelope.changeKind !== "initial") {
        laterSelfUnsubscribeCount += 1;
        laterSelfUnsubscribeHandle.unsubscribe();
    }
});
projectionSession.append({ kind: "tool/result" });
projectionSession.append({ kind: "ae/state-observed" });
equal(laterSelfUnsubscribeCount, 1, "unsubscribe inside a later callback prevents future delivery");
laterSelfUnsubscribeHandle.unsubscribe();
laterSelfUnsubscribeHandle.unsubscribe();

let removedConsumerCount = 0;
const removedHandle = projection.subscribe((envelope) => {
    if (envelope.changeKind !== "initial") { removedConsumerCount += 1; }
});
removedHandle.unsubscribe();
removedHandle.unsubscribe();

const beforeDisposeSnapshot = projection.getSnapshot();
const notificationsBeforeDispose = primaryNotifications.length;
let lifecycleObservedInsideDisposeCallback = null;
projection.subscribe((envelope) => {
    if (envelope.changeKind === "disposed") {
        lifecycleObservedInsideDisposeCallback = projectionAgent.getLifecycleStage();
    }
});
projectionAgent.dispose();
equal(primaryNotifications.length, notificationsBeforeDispose + 1, "dispose sends one final notification");
equal(primaryNotifications[primaryNotifications.length - 1].changeKind, "disposed", "final notification is classified as disposed");
equal(projectionAgent.getLifecycleStage(), "disposed", "disposed lifecycle is committed before callback completes");
equal(lifecycleObservedInsideDisposeCallback, "disposed", "final callback observes committed disposed lifecycle");
equal(primaryNotifications[primaryNotifications.length - 1].agentRevision, projectionAgent.getRevision(), "dispose Agent revision commits before final notification");
equal(primaryNotifications[primaryNotifications.length - 1].projectionRevision, beforeDisposeSnapshot.projectionRevision + 1, "dispose advances projection revision once");
equal(removedConsumerCount, 0, "unsubscribed consumer receives no future notification");
check(projectionSession.isClosed(), "dispose closes Session after final notification");

const disposedProjectionSnapshot = projection.getSnapshot();
equal(disposedProjectionSnapshot.lifecycleStage, "disposed", "Projection snapshot remains readable after dispose");
check(Object.isFrozen(disposedProjectionSnapshot), "Projection snapshot is frozen");
deepEqual(projection.readSessionEvents({ fromSeq: 2 }).map((event) => event.seq), [2, 3, 4], "incremental Session event read remains ordered after dispose");
deepEqual(projectionSession.project((acc, event) => acc.concat(event.kind), []), ["user/message", "task/started", "tool/result", "ae/state-observed"], "Session projection remains readable after Projection finalization");
const notificationCountAfterDispose = primaryNotifications.length;
expectCode(() => projection.subscribe(() => {}), agentRuntime.ERROR_CODES.AGENT_DISPOSED, "subscribe after dispose fails closed");
expectCode(() => projectionAgent.activate(), agentRuntime.ERROR_CODES.AGENT_DISPOSED, "Agent activation remains fail closed after Projection finalization");
expectCode(() => projectionAgent.setScopeBoundary({}), agentRuntime.ERROR_CODES.AGENT_DISPOSED, "Scope replacement remains fail closed after Projection finalization");
equal(primaryNotifications.length, notificationCountAfterDispose, "rejected post-dispose operations send no notification");
primaryHandle.unsubscribe();
primaryHandle.unsubscribe();

const revisionAfterDispose = projectionAgent.getRevision();
const projectionRevisionAfterDispose = projection.getSnapshot().projectionRevision;
const finalNotificationCount = primaryNotifications.length;
projectionAgent.dispose();
equal(projectionAgent.getRevision(), revisionAfterDispose, "repeated dispose leaves Agent revision unchanged");
equal(projection.getSnapshot().projectionRevision, projectionRevisionAfterDispose, "repeated dispose leaves Projection revision unchanged");
equal(primaryNotifications.length, finalNotificationCount, "repeated dispose sends no notification");

for (let index = 1; index < primaryNotifications.length; index += 1) {
    check(primaryNotifications[index].projectionRevision > primaryNotifications[index - 1].projectionRevision, "Projection revisions are strictly monotonic after initial delivery");
}

const projectionSnapshotFields = Object.keys(disposedProjectionSnapshot);
["presentationStatus", "agentActivity", "taskState", "provider", "AgentDriver", "permission", "approval", "authority", "executionArmed", "DelegationGrant", "executionState"].forEach((field) => {
    check(projectionSnapshotFields.indexOf(field) === -1, "Projection snapshot excludes " + field);
});
check(!Object.prototype.hasOwnProperty.call(agentRuntime, "createAgentDriver"), "Projection work introduces no AgentDriver factory");
["run", "advance", "step", "invoke", "dispatch", "execute"].forEach((name) => {
    check(!Object.prototype.hasOwnProperty.call(projection, name), "Projection exposes no " + name + " orchestration API");
});

const externallyClosedAgent = agentRuntime.createAgent();
const externalProjectionNotifications = [];
externallyClosedAgent.getProjection().subscribe((envelope) => externalProjectionNotifications.push(envelope));
externallyClosedAgent.getSession().close();
externallyClosedAgent.activate();
equal(externallyClosedAgent.getLifecycleStage(), "active", "external Session.close does not dispose Agent");
equal(externalProjectionNotifications[externalProjectionNotifications.length - 1].changeKind, "agent", "Agent changes still notify after external Session.close");

console.log("test-vela-agent-runtime: " + assertions + " assertions passed");
