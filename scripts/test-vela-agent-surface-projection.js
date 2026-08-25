#!/usr/bin/env node
"use strict";

const assert = require("assert");
const surfaceProjection = require("../client/js/vela/velaAgentSurfaceProjection");

let assertions = 0;

function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}

function deepEqual(actual, expected, message) {
    assert.deepStrictEqual(actual, expected, message);
    assertions += 1;
}

const snapshot = Object.freeze({
    agentId: "agent_fixture",
    lifecycleStage: "active",
    scopeId: "scope_fixture",
    scopeBoundary: Object.freeze({ focus: "opaque" }),
    agentRevision: 2,
    sessionId: "session_fixture",
    sessionLastSeq: 2,
    projectionRevision: 4,
    activate: () => { throw new Error("must not invoke Agent mutation"); }
});
const events = Object.freeze([
    Object.freeze({ seq: 1, kind: "user/message", family: "fact", payload: Object.freeze({ text: "hello" }) }),
    Object.freeze({ seq: 2, kind: "task/started", family: "control", payload: Object.freeze({}) })
]);
const inputSnapshotBefore = JSON.stringify(snapshot);
const inputEventsBefore = JSON.stringify(events);

const modelA = surfaceProjection.createSurfaceReadModel(snapshot, events);
const modelB = surfaceProjection.createSurfaceReadModel(snapshot, events);

deepEqual(modelA, modelB, "equivalent input produces equivalent deterministic output");
check(Object.isFrozen(modelA), "Surface read model is frozen");
check(Object.isFrozen(modelA.runtime), "runtime row is frozen");
check(Object.isFrozen(modelA.runtime.scopeBoundary), "scope boundary projection is frozen");
check(Object.isFrozen(modelA.events), "event rows are frozen");
check(Object.isFrozen(modelA.events[0]), "individual event row is frozen");
deepEqual(
    modelA.events,
    [
        { seq: 1, kind: "user/message", family: "fact" },
        { seq: 2, kind: "task/started", family: "control" }
    ],
    "neutral event projection preserves seq, kind, family, and order"
);
check(JSON.stringify(snapshot) === inputSnapshotBefore, "adapter does not mutate snapshot input");
check(JSON.stringify(events) === inputEventsBefore, "adapter does not mutate event input");
check(modelA.runtime.scopeBoundary !== snapshot.scopeBoundary, "adapter detaches projected boundary from input");

const serialized = JSON.stringify(modelA);
["presentationStatus", "agentActivity", "taskState", "authority", "permission", "approval", "executionArmed", "DelegationGrant", "executionState"].forEach((field) => {
    check(serialized.indexOf(field) === -1, "Surface read model invents no " + field);
});
["activate", "dispose", "setScopeBoundary", "append", "subscribe", "unsubscribe", "approve", "confirm", "execute"].forEach((field) => {
    check(!Object.prototype.hasOwnProperty.call(modelA, field), "Surface read model exposes no " + field + " API");
});
deepEqual(Object.keys(surfaceProjection).sort(), ["MODULE_REVISION", "createSurfaceReadModel"], "adapter exports only its pure read projection API");

console.log("test-vela-agent-surface-projection: " + assertions + " assertions passed");
