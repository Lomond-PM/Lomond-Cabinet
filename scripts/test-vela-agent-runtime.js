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
    ["agentId", "lifecycleStage", "revision", "scopeBoundary", "scopeId", "sessionId"],
    "Agent snapshot contains only the bounded runtime shape"
);

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

console.log("test-vela-agent-runtime: " + assertions + " assertions passed");
