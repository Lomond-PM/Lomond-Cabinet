#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const protocolModule = require("../client/js/vela/velaProtocol");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const planningContracts = require("../client/js/vela/velaPlanningContracts");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const CONTEXT_FP = "sha256:" + "1".repeat(64);
const SETTINGS_FP = "sha256:" + "2".repeat(64);
let assertions = 0;
let storeCounter = 0;
let planCounter = 0;

function localId(kind, value) { return kind + "_" + Number(value).toString(36).padStart(32, "0"); }
function check(condition, message) { assert.ok(condition, message); assertions += 1; }
function expectCode(callback, code, message) {
    assert.throws(callback, function (error) { return error && error.code === code; }, message || ("Expected " + code));
    assertions += 1;
}
function expectAnyCode(callback, codes, message) {
    let caught;
    try { callback(); }
    catch (error) { caught = error; }
    assert.ok(caught && codes.indexOf(caught.code) !== -1, (message || ("Expected one of " + codes.join(", "))) + " Actual: " + (caught && caught.code));
    assertions += 1;
}

const validator = validatorModule.createActionValidator(protocol, {
    registry: {
        localTool: {
            id: "localTool",
            actions: {
                mutate: {
                    id: "mutate",
                    executable: true,
                    risk: "write",
                    targetScope: ["layer"],
                    capabilityRevision: "registry-v1",
                    paramsSchema: {
                        type: "object",
                        required: ["value"],
                        additionalProperties: false,
                        properties: { value: { type: "number", minimum: 0, maximum: 100 } }
                    }
                }
            }
        }
    }
});

const binding = {
    contextFingerprint: CONTEXT_FP,
    settingsFingerprint: SETTINGS_FP,
    permissionSnapshot: { mode: "confirm-every-action", grants: ["layer.write"], policyRevision: "policy-01" }
};

function proposal(value) {
    return {
        providerActionId: "provider_action_" + value,
        kind: "tool",
        title: "Plan step " + value,
        rationale: "PlanStore invariant test.",
        risk: "write",
        target: { contextFingerprint: CONTEXT_FP, compId: "comp-01", layerIndex: value + 1 },
        payload: { toolId: "localTool", actionId: "mutate", params: { value: value } },
        undoGroupLabel: "Vela: Plan test",
        requiresConfirmation: true
    };
}

function validatedAction(value) { return validator.validateActionProposal(proposal(value)).action; }

function makeStore(options) {
    options = options || {};
    const storeId = ++storeCounter;
    let candidate = 0;
    let nonce = 0;
    let reservation = 0;
    return planModule.createPlanStore(protocol, {
        validatorAuthority: validator.authority,
        candidateIdFactory: options.candidateIdFactory || function () { return localId("cand", storeId * 1000 + (++candidate)); },
        nonceFactory: options.nonceFactory || function () { return localId("confirm", storeId * 1000 + (++nonce)); },
        planIdFactory: options.planIdFactory || function () { return localId("plan", ++planCounter); },
        reservationIdFactory: options.reservationIdFactory || function () { return localId("res", storeId * 1000 + (++reservation)); },
        sessionIdFactory: options.sessionIdFactory || function () { return localId("session", storeId); },
        now: options.now || (function () { let tick = storeId * 1000; return function () { return ++tick; }; }())
    });
}

function createPlan(store, count) {
    return store.createPlan({
        validatedActions: Array.from({ length: count }, function (_, index) { return validatedAction(index + 1); }),
        validatorAuthority: validator.authority,
        contextFingerprint: CONTEXT_FP,
        settingsFingerprint: SETTINGS_FP,
        permissionSnapshot: binding.permissionSnapshot
    });
}

function current(plan, candidate, overrides) {
    return Object.assign({
        lifecycle: "active",
        planRevision: plan.planRevision,
        totalSteps: plan.actionCount,
        confirmationNonce: candidate.confirmationNonce,
        permissionSnapshot: binding.permissionSnapshot,
        contextFingerprint: CONTEXT_FP,
        settingsFingerprint: SETTINGS_FP,
        hasVerifier: true
    }, overrides || {});
}

function run() {
    const creationStore = makeStore();
    const one = createPlan(creationStore, 1);
    const two = createPlan(creationStore, 2);
    const eight = createPlan(creationStore, 8);
    check(one.actionCount === 1 && one.candidates.length === 1, "A one-step plan must be created.");
    check(two.actionCount === 2 && two.nextStep === 0, "A two-step ordered plan must be created.");
    check(eight.actionCount === protocol.HARD_LIMITS.maxPlanSteps, "The eight-step hard limit must be accepted.");
    expectCode(function () { createPlan(creationStore, 9); }, protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Nine steps must be rejected.");
    expectCode(function () { createPlan(creationStore, 0); }, protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Zero steps must be rejected.");
    expectCode(function () {
        creationStore.createPlan({ validatedActions: [proposal(1)], validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: binding.permissionSnapshot });
    }, protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Untrusted actions must be rejected.");

    const immutableView = creationStore.getPlanView(two.planId);
    const originalTitle = immutableView.candidates[0].action.title;
    assert.throws(function () { immutableView.candidateIds.push("cand_fake"); }, TypeError); assertions += 1;
    assert.throws(function () { immutableView.candidates[0].action.payload.params.value = 99; }, TypeError); assertions += 1;
    const immutableAgain = creationStore.getPlanView(two.planId);
    check(immutableAgain.candidates[0].action.title === originalTitle && immutableAgain.candidates[0].action.payload.params.value === 1, "Public snapshots cannot mutate plan definitions or action params.");
    check(immutableAgain.candidateIds.join(",") === two.candidateIds.join(","), "Candidate ids must remain stable between views.");
    check(new Set(eight.candidateIds).size === eight.candidateIds.length, "Candidate ids must be unique within a plan.");
    check(immutableAgain.planRevision === two.planRevision, "Plan revision must remain stable.");

    const confirmStore = makeStore();
    const pending = createPlan(confirmStore, 2);
    const confirmed = confirmStore.confirmPlan(pending.planId, binding);
    check(confirmed.state === "confirmed" && confirmed.candidates.every(function (candidate) { return candidate.state === "confirmed"; }), "confirmPlan must confirm every ordered candidate.");
    check(confirmed.candidates.every(function (candidate) { return typeof candidate.confirmationNonce === "string"; }), "Every confirmed candidate must receive a nonce.");
    check(new Set(confirmed.candidates.map(function (candidate) { return candidate.confirmationNonce; })).size === 2, "Candidate confirmation nonces must be distinct.");
    assert.throws(function () { confirmed.candidates[1].action.payload.params.value = 75; }, TypeError); assertions += 1;
    check(confirmStore.getPlanView(pending.planId).candidates[1].action.payload.params.value === 2, "Confirmation must not make the definition mutable.");

    const first = confirmed.candidates[0];
    const second = confirmed.candidates[1];
    expectCode(function () { confirmStore.reserveStep(confirmed.planId, 1, current(confirmed, second)); }, protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Step one cannot run before step zero.");
    expectCode(function () { confirmStore.reserveStep(confirmed.planId, 0, current(confirmed, first, { confirmationNonce: localId("confirm", 999999) })); }, protocol.ERROR_CODES.PERMISSION_DENIED, "A wrong nonce must be rejected.");
    expectCode(function () { confirmStore.reserveStep(confirmed.planId, 0, current(confirmed, first, { planRevision: confirmed.planRevision + 1 })); }, protocol.ERROR_CODES.CONTEXT_STALE, "A stale revision must be rejected.");
    const reserved0 = confirmStore.reserveStep(confirmed.planId, 0, current(confirmed, first));
    check(reserved0.ok && reserved0.actionIndex === 0, "Step zero reservation must succeed.");
    const completed0 = confirmStore.completeStep(reserved0.reservation, { ok: true });
    check(completed0.state === "consumed", "Step zero completion must succeed.");
    const after0 = confirmStore.getPlanView(confirmed.planId);
    check(after0.state === "confirmed" && after0.nextStep === 1, "Intermediate success must restore confirmed and advance nextStep.");
    expectCode(function () { confirmStore.reserveStep(confirmed.planId, 0, current(confirmed, first)); }, protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "A completed step cannot execute again.");
    const eligible1 = confirmStore.checkStep(confirmed.planId, 1, current(after0, after0.candidates[1]));
    check(eligible1.ok === true, "Step one must become eligible after step zero.");
    const reserved1 = confirmStore.reserveStep(confirmed.planId, 1, current(after0, after0.candidates[1]));
    check(reserved1.ok && reserved1.replayKey !== reserved0.replayKey, "Different steps must reserve without a false replay collision.");
    confirmStore.completeStep(reserved1.reservation, { ok: true });
    check(confirmStore.getPlanView(confirmed.planId).state === "consumed", "The positive two-step Store flow must end consumed.");
    expectCode(function () { confirmStore.completeStep(reserved1.reservation, { ok: true }); }, protocol.ERROR_CODES.RESERVATION_INVALID, "Terminal reservation reentry must fail closed.");

    const failureStore = makeStore();
    const failurePlan = failureStore.confirmPlan(createPlan(failureStore, 2).planId, binding);
    const failedReservation = failureStore.reserveStep(failurePlan.planId, 0, current(failurePlan, failurePlan.candidates[0]));
    failureStore.completeStep(failedReservation.reservation, { ok: false, summary: { errorCode: protocol.ERROR_CODES.PLAN_FAILED } });
    const failedView = failureStore.getPlanView(failurePlan.planId);
    check(failedView.state === "failed" && failedView.candidates[0].state === "failed", "A failed step must fail the plan without retry.");
    expectCode(function () { failureStore.reserveStep(failurePlan.planId, 1, current(failedView, failedView.candidates[1])); }, protocol.ERROR_CODES.PLAN_FAILED, "Failure must block all later steps.");
    check(failedView.nextStep === 1 && failedView.candidates[1].state === "confirmed" && failedView.candidates.length === 2, "Failure must not retry, replan, or roll back consumed progress.");

    const staleStore = makeStore();
    const stalePlan = staleStore.confirmPlan(createPlan(staleStore, 2).planId, binding);
    staleStore.markStale(stalePlan.candidateIds[0], "context-changed");
    const staleView = staleStore.getPlanView(stalePlan.planId);
    check(staleView.state === "stale" && staleView.candidates[0].state === "stale", "markStale must make the plan stale.");
    expectAnyCode(function () { staleStore.reserveStep(stalePlan.planId, 0, current(staleView, staleView.candidates[0])); }, [protocol.ERROR_CODES.CONTEXT_STALE, protocol.ERROR_CODES.PLAN_FAILED, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID], "A stale plan must block execution fail-closed.");

    const raceStore = makeStore();
    const racePlan = raceStore.confirmPlan(createPlan(raceStore, 2).planId, binding);
    const raceReservation = raceStore.reserveStep(racePlan.planId, 0, current(racePlan, racePlan.candidates[0]));
    expectCode(function () { raceStore.markStale(racePlan.candidateIds[1], "late-context-change"); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "markStale must reject lifecycle mutation while any candidate executes.");
    raceStore.completeStep(raceReservation.reservation, { ok: true });
    check(raceStore.getPlanView(racePlan.planId).state === "confirmed", "Rejected stale races must leave normal intermediate completion intact.");
    const planSource = fs.readFileSync(path.join(__dirname, "../client/js/vela/velaPlan.js"), "utf8");
    check(/terminalPlanState\s*=\s*plan\.state\s*===\s*["']stale["']\s*\?\s*["']stale["']/.test(planSource), "completeStep must preserve an already-stale terminal plan state.");

    const discardStore = makeStore();
    const discardPlan = discardStore.confirmPlan(createPlan(discardStore, 2).planId, binding);
    const discarded = discardStore.discardPlan(discardPlan.planId, "user-discarded");
    check(discarded.state === "discarded" && discarded.candidates.every(function (candidate) { return candidate.state === "discarded"; }), "Discard must terminalize every pending step.");
    expectCode(function () { discardStore.reserveStep(discardPlan.planId, 0, current(discarded, discarded.candidates[0])); }, protocol.ERROR_CODES.CONTEXT_STALE, "Discarded steps cannot execute.");

    const revisionStore = makeStore();
    const oldPlan = revisionStore.confirmPlan(createPlan(revisionStore, 1).planId, binding);
    const newPlan = revisionStore.revisePlan(oldPlan.planId, [validatedAction(3)], binding);
    check(revisionStore.getPlanView(oldPlan.planId).state === "superseded" && newPlan.planRevision !== oldPlan.planRevision, "Revision must supersede old authority.");
    expectCode(function () { revisionStore.reserveStep(oldPlan.planId, 0, current(oldPlan, oldPlan.candidates[0])); }, protocol.ERROR_CODES.PLAN_FAILED, "A superseded plan cannot execute.");

    const foreignA = makeStore();
    const foreignB = makeStore();
    const foreignPlan = foreignA.confirmPlan(createPlan(foreignA, 1).planId, binding);
    const foreignReservation = foreignA.reserveStep(foreignPlan.planId, 0, current(foreignPlan, foreignPlan.candidates[0]));
    expectCode(function () { foreignB.completeStep(foreignReservation.reservation, { ok: true }); }, protocol.ERROR_CODES.RESERVATION_INVALID, "Foreign reservations must be rejected.");
    expectCode(function () { foreignB.reserveStep(foreignPlan.planId, 0, current(foreignPlan, foreignPlan.candidates[0])); }, protocol.ERROR_CODES.PLAN_INVALID, "A fresh store/session cannot consume old plan authority.");
    foreignA.completeStep(foreignReservation.reservation, { ok: true });

    const contractStore = makeStore();
    const taskPlan = planningContracts.createTaskPlan({ planId: "plan_task_1", taskId: "task_1", revision: 0, steps: [{ stepId: "step_1", kind: "operate", capabilityIntent: { intentId: "intent_1", capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: 50 } } }] });
    expectCode(function () {
        contractStore.createPlan({ validatedActions: [taskPlan], validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: binding.permissionSnapshot });
    }, protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "TaskPlan cannot enter the execution store.");
    const rawCandidate = planningContracts.createActionCandidate({ candidateId: "cand_1", capabilityId: "set-opacity-v1", operationKind: "mutate", kind: "tool", risk: "write", params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true, provenance: { source: "local-validator" } });
    expectAnyCode(function () {
        contractStore.createPlan({ validatedActions: [rawCandidate], validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: binding.permissionSnapshot });
    }, [protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, protocol.ERROR_CODES.UNSAFE_JSON_VALUE], "A raw ActionCandidate has no execution authority.");

    const legacyStore = makeStore();
    const issued = legacyStore.issue({ action: validatedAction(5), validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: binding.permissionSnapshot });
    const legacyConfirmed = legacyStore.confirm(issued.candidateId, binding);
    const legacyReserved = legacyStore.reserve(issued.candidateId, current({ planRevision: legacyConfirmed.planRevision, actionCount: 1 }, legacyConfirmed), 0);
    const legacyCompleted = legacyStore.complete(issued.candidateId, true, { ok: true });
    check(legacyReserved.ok === true && legacyCompleted.state === "consumed", "Existing one-step issue/confirm/reserve/complete semantics must remain compatible.");

    console.log("PASS Vela plan: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela plan - " + error.message);
    process.exitCode = 1;
}
