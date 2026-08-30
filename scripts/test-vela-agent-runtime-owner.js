#!/usr/bin/env node
"use strict";

const assert = require("assert");
const ownerModule = require("../client/js/vela/velaAgentRuntimeOwner");
const agentRuntime = require("../client/js/vela/velaAgentRuntime");
const capabilityRuntime = require("../client/js/vela/velaAgentCapabilityRuntime");
const activeCompositionCapability = require("../client/js/vela/velaActiveCompositionCapability");
const observationRuntime = require("../client/js/vela/velaAgentObservationRuntime");

let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function expectCode(fn, code, message) {
    let thrown = null;
    try { fn(); } catch (error) { thrown = error; }
    assertions += 1;
    assert.ok(thrown && thrown.code === code, message || ("Expected " + code));
}

const owner = ownerModule.createOwner();
const agent = owner.getCurrentAgent();
const projection = owner.getCurrentProjection();
check(agent && projection, "Owner creates one current Agent and Projection");
equal(owner.getCurrentAgent(), agent, "current Agent reference remains stable");
equal(owner.getCurrentProjection(), projection, "current Projection reference remains stable");
equal(agent.getLifecycleStage(), "created", "Owner creation does not activate Agent implicitly");
check(owner.activate(), "Owner activates its current Agent");
check(owner.getAgentDriver() && Object.isFrozen(owner.getAgentDriver()), "Owner creates and uniquely holds one frozen AgentDriver");
equal(agent.getLifecycleStage(), "active", "Owner activation commits created to active");
const agentId = agent.getAgentId();
owner.activate();
equal(owner.getCurrentAgent().getAgentId(), agentId, "duplicate activate creates no second Agent");

expectCode(
    () => ownerModule.createOwner({ AgentRuntime: null }),
    ownerModule.ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE,
    "missing AgentRuntime dependency fails closed"
);
expectCode(
    () => ownerModule.createOwner({ AgentRuntime: { createAgent() { throw Object.assign(new Error("create failed"), { code: "AGENT_CREATE_FAILED" }); } } }),
    "AGENT_CREATE_FAILED",
    "Agent creation failure fails closed"
);

const reported = [];
const reportingOwner = ownerModule.createOwner({ onListenerError: (error, envelope) => reported.push({ error, envelope }) });
reportingOwner.getCurrentProjection().subscribe((envelope) => {
    if (envelope.changeKind !== "initial") { throw new Error("consumer failure"); }
});
reportingOwner.getCurrentAgent().getSession().append({ kind: "user/message" });
equal(reported.length, 1, "Owner passes injected listener reporter through to Agent Projection");

const throwingReporterOwner = ownerModule.createOwner({ onListenerError() { throw new Error("reporter failure"); } });
throwingReporterOwner.getCurrentProjection().subscribe((envelope) => {
    if (envelope.changeKind !== "initial") { throw new Error("consumer failure"); }
});
throwingReporterOwner.getCurrentAgent().getSession().append({ kind: "task/started" });
equal(throwingReporterOwner.getCurrentAgent().getSession().getEvents().length, 1, "reporter failure never escapes committed runtime truth");

const session = agent.getSession();
check(owner.dispose(), "Owner disposes current Agent once");
equal(owner.getAgentDriver(), null, "disposed Owner no longer exposes its Driver");
equal(agent.getLifecycleStage(), "disposed", "Owner disposal delegates to Agent disposal");
check(session.isClosed(), "Owner disposal closes Session write through Agent");
check(!owner.dispose(), "Owner disposal is idempotent");
check(owner.isDisposed(), "Owner reports disposed state");

const ownerKeys = Object.keys(owner);
["switchCurrentAgent", "createAdditionalAgent", "sessionManager", "agentRegistry", "provider", "send", "run", "execute"].forEach((name) => {
    check(ownerKeys.indexOf(name) === -1, "Owner exposes no " + name + " API");
});
const ownerSnapshot = { disposed: owner.isDisposed(), agentId: agent.getAgentId() };
["authority", "permission", "approval", "executionArmed", "DelegationGrant"].forEach((field) => {
    check(!Object.prototype.hasOwnProperty.call(ownerSnapshot, field), "Owner state exposes no " + field);
});
check(!Object.prototype.hasOwnProperty.call(ownerModule, "createAgentDriver"), "Owner module exposes no AgentDriver factory");
equal(typeof agentRuntime.createAgent, "function", "Owner reuses the existing Agent runtime module");

async function coldStartRegression() {
    let captures = 0;
    let reasons = 0;
    let submissions = 0;
    const coldOwner = ownerModule.createOwner({
        AgentCapabilityRuntime: capabilityRuntime,
        ActiveCompositionCapability: activeCompositionCapability,
        AgentObservationRuntime: observationRuntime
    });
    coldOwner.activate();
    equal(coldOwner.getObservationRuntime(), null, "cold Owner starts before the Runtime read port exists");
    const readPort = Object.freeze({
        getState() { return Object.freeze({ state: "ready" }); },
        capture() {
            captures += 1;
            return Promise.resolve(Object.freeze({
                contextId: "req_cold_observation",
                snapshot: Object.freeze({
                    hostInstanceId: "host_cold",
                    hostReloadEpoch: 1,
                    activeComp: Object.freeze({ compId: "comp_cold", type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 })
                })
            }));
        }
    });
    check(coldOwner.attachObservationReadPort(readPort), "late Runtime read port attaches after cold Owner creation");
    check(coldOwner.getObservationRuntime(), "late attachment creates the real ObservationRuntime");
    check(coldOwner.attachAgentDriverRuntimePort(Object.freeze({
        reason() { reasons += 1; return Promise.resolve(Object.freeze({ capabilityId: "set-opacity-v1", params: Object.freeze({ opacity: 63 }) })); },
        submitIntent() { submissions += 1; return Promise.resolve(Object.freeze({ state: "executed", committed: true })); },
        verifyOpacity() { return Promise.resolve(Object.freeze({ fresh: true, matches: true, opacity: 63 })); },
        cancel() { return false; }
    })), "late Runtime action port attaches to the Owner-held Driver");
    const result = await coldOwner.startObjective({ message: "Set opacity to 63", endpoint: "http://127.0.0.1:1234", model: "m" });
    equal(result.terminal.outcome, "completed", "cold-start objective passes Observe into reasoning and execution");
    equal(captures, 1, "initial Observe executes exactly once after late attachment");
    equal(reasons, 1, "reason executes exactly once after initial Observe");
    equal(submissions, 1, "submitIntent executes exactly once without mutation retry");
    check(result.terminal.code !== "OBSERVATION_PROVIDER_UNAVAILABLE", "cold-start objective cannot fail with missing Observation provider");
    coldOwner.dispose();
}

coldStartRegression().then(function () {
    console.log("test-vela-agent-runtime-owner: " + assertions + " assertions passed");
}, function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
