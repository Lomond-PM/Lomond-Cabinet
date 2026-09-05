#!/usr/bin/env node
"use strict";

const assert = require("assert");
const ownerModule = require("../client/js/vela/velaAgentRuntimeOwner");
const agentRuntime = require("../client/js/vela/velaAgentRuntime");
const capabilityRuntime = require("../client/js/vela/velaAgentCapabilityRuntime");
const activeCompositionCapability = require("../client/js/vela/velaActiveCompositionCapability");
const observationRuntime = require("../client/js/vela/velaAgentObservationRuntime");
const logicalPlanContracts = require("../client/js/vela/velaLogicalPlanContracts");

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
    let submissionMode = "executed";
    let continuationMode = "verified";
    let reasonMode = "single";
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
        reason() { reasons += 1; return Promise.resolve(reasonMode === "logical" ? logicalPlanContracts.validateLogicalPlanProposal({ type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 47 } }, { capabilityId: "set-layer-name-v1", params: { name: "Hero" } }] }) : Object.freeze({ capabilityId: "set-opacity-v1", params: Object.freeze({ opacity: 63 }) })); },
        submitIntent(input) { submissions += 1; return Promise.resolve(Object.freeze(submissionMode === "review" ? { state: "review-required", committed: false, code: "REVIEW_REQUIRED", beforeValue: input.capabilityIntent.capabilityId === "set-layer-name-v1" ? "Layer A" : 100, reviewCorrelation: "owner_review_correlation_" + submissions } : submissionMode === "denied" ? { state: "denied", committed: false, code: "PERMISSION_DENIED" } : { state: "executed", committed: true })); },
        continueApprovedReview() { return Promise.resolve(Object.freeze(continuationMode === "stale" ? { state: "blocked", code: "CONTEXT_STALE", committed: false, observation: Object.freeze({ targetAvailable: true, targetClass: "layer-opacity", observedOpacityDigest: "sha256:owner_stale" }) } : { state: "verification-required", code: null })); },
        verifyCommittedAction() { return Promise.resolve(Object.freeze({ state: "verified", code: null })); },
        verifyOpacity() { return Promise.resolve(Object.freeze({ fresh: true, matches: true, opacity: 63 })); },
        cancel() { return false; }
    })), "late Runtime action port attaches to the Owner-held Driver");
    const result = await coldOwner.startObjective({ message: "Set opacity to 63", endpoint: "http://127.0.0.1:1234", model: "m" });
    equal(result.terminal.outcome, "completed", "cold-start objective passes Observe into reasoning and execution");
    equal(captures, 1, "initial Observe executes exactly once after late attachment");
    equal(reasons, 1, "reason executes exactly once after initial Observe");
    equal(submissions, 1, "submitIntent executes exactly once without mutation retry");
    check(result.terminal.code !== "OBSERVATION_PROVIDER_UNAVAILABLE", "cold-start objective cannot fail with missing Observation provider");
    equal(coldOwner.getObjectiveReviewPort().getProjection().state, "inactive", "completed Driver terminal truth has no active objective review projection");
    submissionMode = "review";
    const suspended = await coldOwner.startObjective({ message: "Review opacity 63", endpoint: "http://127.0.0.1:1234", model: "m" });
    equal(suspended.state, "awaiting-review", "Owner preserves the Driver suspended review state");
    const ownerReviewPort = coldOwner.getObjectiveReviewPort();
    const reviewProjection = ownerReviewPort.getProjection();
    check(Object.isFrozen(ownerReviewPort) && Object.isFrozen(reviewProjection) && Object.keys(reviewProjection).sort().join(",") === "beforeValue,capabilityId,outcome,proposedValue,reviewId,revision,state,valueKind", "Owner exposes only a frozen bounded typed objective review port and projection");
    equal(reviewProjection.reviewId, suspended.suspendedReview.reviewId, "Owner projection correlates the exact Driver review identity");
    equal(reviewProjection.beforeValue, 100, "Owner projects the Driver-owned scalar presentation baseline without reading AE");
    const approved = await ownerReviewPort.resolve({ reviewId: reviewProjection.reviewId, revision: reviewProjection.revision, outcome: "approved" });
    equal(approved.state, "terminal", "Owner approve completes after committed-target verification");
    equal(ownerReviewPort.getProjection().state, "inactive", "Owner review projection closes once production execution reaches verifying");
    check(!coldOwner.cancelObjective(), "completed committed verification leaves no cancellable active objective");
    const cancelled = coldOwner.getAgentDriver().getSnapshot();
    equal(cancelled.state, "terminal", "approved objective cancel reaches Driver terminal truth");
    equal(cancelled.terminal.outcome, "completed", "approved objective retains completed outcome after committed verification");
    equal(cancelled.reviewResolution.outcome, "approved", "historical approved review evidence remains in the Driver snapshot");
    equal(ownerReviewPort.getProjection().state, "inactive", "terminal cancelled truth suppresses historical approved review projection");
    check(!coldOwner.cancelObjective(), "duplicate cancel is inert after terminal settlement");
    expectCode(function () { ownerReviewPort.resolve({ reviewId: reviewProjection.reviewId, revision: reviewProjection.revision, outcome: "approved" }); }, "AGENT_DRIVER_REVIEW_INVALID", "late approve fails closed after cancel");
    expectCode(function () { ownerReviewPort.resolve({ reviewId: reviewProjection.reviewId, revision: reviewProjection.revision, outcome: "rejected" }); }, "AGENT_DRIVER_REVIEW_INVALID", "late reject fails closed after cancel");
    const replacement = await coldOwner.startObjective({ message: "Review replacement opacity 63", endpoint: "http://127.0.0.1:1234", model: "m" });
    check(replacement.objectiveId !== suspended.objectiveId && ownerReviewPort.getProjection().state === "active", "fresh objective starts with a new active review after terminal cancel");
    const replacementProjection = ownerReviewPort.getProjection();
    const rejected = ownerReviewPort.resolve({ reviewId: replacementProjection.reviewId, revision: replacementProjection.revision, outcome: "rejected" });
    equal(rejected.terminal.outcome, "rejected", "Owner review facade resolves only the Owner-held Driver objective");
    equal(ownerReviewPort.getProjection().state, "resolved", "terminal rejection retains only bounded non-actionable rejected presentation");
    continuationMode = "stale";
    const staleReview = await coldOwner.startObjective({ message: "Review stale opacity 63", endpoint: "http://127.0.0.1:1234", model: "m" });
    const staleProjection = ownerReviewPort.getProjection();
    const staleReplanned = await ownerReviewPort.resolve({ reviewId: staleProjection.reviewId, revision: staleProjection.revision, outcome: "approved" });
    check(staleReplanned.state === "awaiting-review" && staleReplanned.objectiveId === staleReview.objectiveId && staleReplanned.turn.turnId !== staleReview.turn.turnId && staleReplanned.counters.replans === 1 && captures >= 2 && reasons >= 2, "Owner wiring gives CONTEXT_STALE replan the same objective, a fresh turn, fresh Observe, and fresh Reason");
    const staleSecondProjection = ownerReviewPort.getProjection();
    check(staleSecondProjection.state === "active" && staleSecondProjection.reviewId !== staleProjection.reviewId, "Owner projects only the fresh second-iteration Review");
    continuationMode = "verified";
    const staleCompleted = await ownerReviewPort.resolve({ reviewId: staleSecondProjection.reviewId, revision: staleSecondProjection.revision, outcome: "approved" });
    equal(staleCompleted.terminal.outcome, "completed", "second iteration completes through the existing committed-target verification wiring");
    equal(ownerReviewPort.getProjection().state, "inactive", "completed bounded replan closes the Owner review projection");
    reasonMode = "logical";
    submissionMode = "review";
    continuationMode = "verified";
    const logicalStep0 = await coldOwner.startObjective({ message: "Set opacity to 47 then rename to Hero", endpoint: "http://127.0.0.1:1234", model: "m" });
    const logicalProjection0 = ownerReviewPort.getProjection();
    check(logicalStep0.logicalPlan.currentStepIndex === 0 && logicalProjection0.state === "active" && logicalProjection0.capabilityId === "set-opacity-v1" && logicalProjection0.valueKind === "number" && logicalProjection0.proposedValue === 47, "Owner Review projection exposes exact step 0 opacity semantics from the current Driver review");
    const logicalStep1 = await ownerReviewPort.resolve({ reviewId: logicalProjection0.reviewId, revision: logicalProjection0.revision, outcome: "approved" });
    const logicalProjection1 = ownerReviewPort.getProjection();
    check(logicalStep1.logicalPlan.currentStepIndex === 1 && logicalProjection1.state === "active" && logicalProjection1.capabilityId === "set-layer-name-v1" && logicalProjection1.valueKind === "string" && logicalProjection1.proposedValue === "Hero" && logicalProjection1.reviewId !== logicalProjection0.reviewId, "Owner Review projection switches to exact step 1 rename semantics and a fresh review identity");
    const logicalRejected = ownerReviewPort.resolve({ reviewId: logicalProjection1.reviewId, revision: logicalProjection1.revision, outcome: "rejected" });
    check(logicalRejected.terminal.outcome === "rejected" && logicalRejected.logicalPlan.completedStepCount === 1 && logicalRejected.logicalPlan.partialCompletion === true, "step 1 rejection retains deterministic partial-completion truth without stale step 0 projection");
    reasonMode = "single";
    submissionMode = "denied";
    continuationMode = "verified";
    const blocked = await coldOwner.startObjective({ message: "Denied opacity objective", endpoint: "http://127.0.0.1:1234", model: "m" });
    equal(blocked.terminal.outcome, "blocked", "denied replacement reaches Driver blocked terminal truth");
    equal(ownerReviewPort.getProjection().state, "inactive", "blocked Driver terminal truth has no active objective review projection");
    coldOwner.dispose();
    equal(coldOwner.getObjectiveReviewPort(), null, "disposed Owner exposes no objective review port");
}

coldStartRegression().then(function () {
    console.log("test-vela-agent-runtime-owner: " + assertions + " assertions passed");
}, function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});
