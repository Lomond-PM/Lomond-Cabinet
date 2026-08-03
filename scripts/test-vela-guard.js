#!/usr/bin/env node
"use strict";

const assert = require("assert");
const protocolModule = require("../client/js/vela/velaProtocol");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const guardModule = require("../client/js/vela/velaExecutionGuard");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const CONTEXT_FP = "sha256:" + "1".repeat(64);
const SETTINGS_FP = "sha256:" + "2".repeat(64);
const OTHER_CONTEXT_FP = "sha256:" + "3".repeat(64);
const OTHER_SETTINGS_FP = "sha256:" + "4".repeat(64);
let assertions = 0;
let planCounter = 0;
let storeCounter = 0;

function localId(kind, value) { return kind + "_" + Number(value).toString(36).padStart(32, "0"); }

function check(condition, message) { assert.ok(condition, message); assertions += 1; }
function expectCode(callback, code, message) { assert.throws(callback, (error) => error && error.code === code, message || ("Expected " + code)); assertions += 1; }

const validator = validatorModule.createActionValidator(protocol, {
    registry: {
        localTool: {
            id: "localTool",
            actions: {
                mutate: {
                    id: "mutate",
                    executable: true,
                    risk: "write",
                    targetScope: ["layer", "property"],
                    capabilityRevision: "registry-v1",
                    paramsSchema: { type: "object", additionalProperties: false, properties: { value: { type: "number", minimum: 0, maximum: 1000000 } } }
                }
            }
        }
    }
});

function makeAction(overrides) {
    return Object.assign({
        providerActionId: "provider_action_01",
        kind: "tool",
        title: "A bounded lifecycle action",
        rationale: "A pure lifecycle test.",
        risk: "write",
        target: { contextFingerprint: CONTEXT_FP, compId: "comp-session-01", layerIndex: 3, propertyPath: ["ADBE Transform Group", "ADBE Position"] },
        payload: { toolId: "localTool", actionId: "mutate", params: { value: 12 } },
        undoGroupLabel: "Vela: Lifecycle test",
        requiresConfirmation: true
    }, overrides || {});
}

function makeStore(options) {
    options = options || {};
    const storeId = ++storeCounter;
    let id = 0;
    let nonce = 0;
    let reservation = 0;
    return planModule.createPlanStore(protocol, {
        validatorAuthority: validator.authority,
        candidateIdFactory: options.candidateIdFactory || (() => localId("cand", storeId * 1000 + (++id))),
        nonceFactory: options.nonceFactory || (() => localId("confirm", storeId * 1000 + (++nonce))),
        planIdFactory: options.planIdFactory || (() => localId("plan", ++planCounter)),
        reservationIdFactory: options.reservationIdFactory || (() => localId("res", storeId * 1000 + (++reservation))),
        sessionIdFactory: options.sessionIdFactory || (() => localId("session", storeId)),
        now: options.now || (() => { let tick = 1000; return () => ++tick; })()
    });
}

function makeBinding(overrides) {
    return Object.assign({
        contextFingerprint: CONTEXT_FP,
        settingsFingerprint: SETTINGS_FP,
        permissionSnapshot: { mode: "confirm-every-action", grants: ["layer.write", "comp.read"], policyRevision: "policy-01" }
    }, overrides || {});
}

function makePlan(store, count) {
    const action = validator.validateActionProposal(makeAction()).action;
    const actions = Array.from({ length: count || 1 }, () => action);
    return store.createPlan({ validatedActions: actions, validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: makeBinding().permissionSnapshot });
}

function currentFor(plan, candidate, overrides) {
    return Object.assign({
        lifecycle: "active",
        planRevision: plan.planRevision,
        totalSteps: plan.actionCount,
        confirmationNonce: candidate.confirmationNonce,
        permissionSnapshot: makeBinding().permissionSnapshot,
        contextFingerprint: CONTEXT_FP,
        settingsFingerprint: SETTINGS_FP,
        hasVerifier: true
    }, overrides || {});
}

function run() {
    const store = makeStore();
    const plan = makePlan(store);
    const binding = makeBinding();
    const confirmedPlan = store.confirmPlan(plan.planId, binding);
    const candidate = store.getCandidate(confirmedPlan.candidateIds[0]);
    check(candidate.state === "confirmed", "Plan confirmation must bind the candidate.");
    check(candidate.permissionSnapshot.grants.join(",") === "comp.read,layer.write", "Permission grants must be sorted and deduplicated.");
    check(Object.isFrozen(candidate) && Object.isFrozen(candidate.action), "Candidate and action views must be immutable.");
    assert.throws(() => { confirmedPlan.candidates[0].action.title = "edited"; }, TypeError, "Editing a plan view must not mutate the immutable plan.");
    assertions += 1;
    const guard = guardModule.createExecutionGuard(store);
    const current = currentFor(confirmedPlan, candidate);
    const preview = guard.check(plan.planId, 0, current);
    check(preview.ok === true, "A matching confirmed candidate should pass the guard.");
    check(preview.replayKey === guardModule.replayKeyFor(candidate.candidateId, plan.planRevision, 0), "Replay keys must contain candidate id, plan revision and action index.");
    const reservation = guard.reserve(plan.planId, 0, current);
    check(reservation.ok === true && reservation.reservation, "Reserve must return an opaque reservation handle.");
    expectCode(() => store.completeStep(Object.assign({}, reservation.reservation), { ok: true }), protocol.ERROR_CODES.RESERVATION_INVALID, "Cloned reservation handles must be rejected.");
    expectCode(() => guard.reserve(plan.planId, 0, current), protocol.ERROR_CODES.EXECUTION_BUSY, "A second concurrent reserve must be rejected.");
    expectCode(() => store.discardPlan(plan.planId), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Executing plans cannot be discarded.");
    const consumed = guard.complete(reservation.reservation, { ok: true, summary: { ok: true } });
    check(consumed.state === "consumed", "Successful execution must consume the candidate.");
    const spentCheck = guard.check(plan.planId, 0, current);
    check(spentCheck.error.code === protocol.ERROR_CODES.PLAN_FAILED && Object.isFrozen(spentCheck.error) && !("stack" in spentCheck.error), "Consumed plans must return a frozen replay rejection without a stack.");
    expectCode(() => guard.complete(reservation.reservation, { ok: true }), protocol.ERROR_CODES.RESERVATION_INVALID, "The reservation handle is one-shot.");
    const settledAck = guard.abort(reservation.reservation, protocol.ERROR_CODES.PLAN_FAILED);
    check(settledAck.state === "consumed" && settledAck.emergencyAbort === false, "Abort after normal completion must return the immutable settled acknowledgement without a second transition.");

    const invalidResultStore = makeStore();
    const invalidResultPlan = makePlan(invalidResultStore);
    const invalidResultConfirmed = invalidResultStore.confirmPlan(invalidResultPlan.planId, binding);
    const invalidResultCandidate = invalidResultStore.getCandidate(invalidResultPlan.candidateIds[0]);
    const invalidResultGuard = guardModule.createExecutionGuard(invalidResultStore);
    const invalidResultReservation = invalidResultGuard.reserve(invalidResultPlan.planId, 0, currentFor(invalidResultConfirmed, invalidResultCandidate));
    expectCode(() => invalidResultGuard.complete(invalidResultReservation.reservation, { ok: true, summary: { source: "forbidden" } }), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Invalid completion results must fail before state commit.");
    const invalidAbort = invalidResultGuard.abort(invalidResultReservation.reservation, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    check(invalidAbort.state === "failed" && invalidAbort.emergencyAbort === true && invalidAbort.errorCode === protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Abort must terminalize an active reservation without clock or result validation.");
    check(invalidResultStore.getCandidate(invalidResultPlan.candidateIds[0]).state === "failed", "Abort must leave no executing candidate after invalid completion preparation.");
    check(invalidResultGuard.check(invalidResultPlan.planId, 0, currentFor(invalidResultConfirmed, invalidResultCandidate)).ok === false, "Emergency-aborted replay keys must remain permanently consumed.");
    const duplicateAbort = invalidResultGuard.abort(invalidResultReservation.reservation, "not an error code");
    check(duplicateAbort === invalidAbort, "Repeated abort must return the exact immutable acknowledgement without a second mutation.");
    expectCode(() => invalidResultGuard.abort(Object.assign({}, invalidResultReservation.reservation), protocol.ERROR_CODES.PLAN_FAILED), protocol.ERROR_CODES.RESERVATION_INVALID, "Cloned reservation handles must not reach emergency abort.");
    const replacementAfterAbort = makePlan(invalidResultStore);
    const replacementConfirmed = invalidResultStore.confirmPlan(replacementAfterAbort.planId, binding);
    const replacementCandidate = invalidResultStore.getCandidate(replacementAfterAbort.candidateIds[0]);
    const replacementReservation = invalidResultGuard.reserve(replacementAfterAbort.planId, 0, currentFor(replacementConfirmed, replacementCandidate));
    check(replacementReservation.ok === true, "Emergency abort must release the store execution lock for a later plan.");
    const fallbackAbort = invalidResultGuard.abort(replacementReservation.reservation, { invalid: true });
    check(fallbackAbort.errorCode === protocol.ERROR_CODES.PLAN_FAILED && fallbackAbort.emergencyAbort === true, "Emergency abort must reduce invalid error codes to bounded PLAN_FAILED metadata.");

    let clockBroken = false;
    const clockStore = makeStore({ now: () => { if (clockBroken) { throw new Error("clock unavailable"); } return 42; } });
    const clockPlan = makePlan(clockStore);
    const clockConfirmed = clockStore.confirmPlan(clockPlan.planId, binding);
    const clockCandidate = clockStore.getCandidate(clockPlan.candidateIds[0]);
    const clockGuard = guardModule.createExecutionGuard(clockStore);
    const clockReservation = clockGuard.reserve(clockPlan.planId, 0, currentFor(clockConfirmed, clockCandidate));
    clockBroken = true;
    expectCode(() => clockGuard.complete(clockReservation.reservation, { ok: true }), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Completion clock failure must occur before any terminal state commit.");
    const clockFailure = clockGuard.fail(clockReservation.reservation, { code: protocol.ERROR_CODES.PLAN_FAILED });
    check(clockFailure.emergencyAbort === true && clockStore.getCandidate(clockPlan.candidateIds[0]).state === "failed", "Fail must fall back to emergency abort when its clock-dependent preparation fails.");
    check(clockGuard.abort(clockReservation.reservation, protocol.ERROR_CODES.PLAN_FAILED) === clockFailure, "Abort after fail fallback must not create a second terminal transition.");

    function reserveFailureCase() {
        const localStore = makeStore();
        const localPlan = makePlan(localStore);
        const localConfirmed = localStore.confirmPlan(localPlan.planId, binding);
        const localCandidate = localStore.getCandidate(localConfirmed.candidateIds[0]);
        const localGuard = guardModule.createExecutionGuard(localStore);
        const localCurrent = currentFor(localConfirmed, localCandidate);
        return {
            store: localStore,
            plan: localPlan,
            confirmed: localConfirmed,
            candidate: localCandidate,
            guard: localGuard,
            current: localCurrent,
            reservation: localGuard.reserve(localPlan.planId, 0, localCurrent)
        };
    }

    function assertSafeFailureTerminal(error, expectedCode, label) {
        const local = reserveFailureCase();
        const terminal = local.guard.fail(local.reservation.reservation, error);
        const candidateAfter = local.store.getCandidate(local.plan.candidateIds[0]);
        check(terminal.state === "failed" && candidateAfter.state === "failed", label + " must terminalize the active candidate exactly once.");
        check(candidateAfter.result.errorCode === expectedCode, label + " must retain only the accepted stable error code.");
        check(local.store.getPlanView(local.plan.planId).state === "failed", label + " must leave the plan terminal rather than active.");
        expectCode(() => local.guard.complete(local.reservation.reservation, { ok: true }), protocol.ERROR_CODES.RESERVATION_INVALID, label + " must settle and remove the reservation handle.");
        const settledAck = local.guard.abort(local.reservation.reservation, protocol.ERROR_CODES.CONTEXT_STALE);
        check(settledAck.state === "failed" && settledAck.emergencyAbort === false && Object.isFrozen(settledAck), label + " must expose only the existing frozen terminal acknowledgement.");
        check(local.guard.abort(local.reservation.reservation, protocol.ERROR_CODES.PLAN_FAILED) === settledAck, label + " must not produce a second terminal acknowledgement.");
        expectCode(() => local.guard.reserve(local.plan.planId, 0, local.current), protocol.ERROR_CODES.PLAN_FAILED, label + " must keep the replayed plan step permanently blocked.");
        const replacement = makePlan(local.store);
        const replacementConfirmed = local.store.confirmPlan(replacement.planId, binding);
        const replacementCandidate = local.store.getCandidate(replacementConfirmed.candidateIds[0]);
        const replacementReservation = local.guard.reserve(replacement.planId, 0, currentFor(replacementConfirmed, replacementCandidate));
        check(replacementReservation.ok === true, label + " must release executionActive for a later plan.");
        local.guard.abort(replacementReservation.reservation, protocol.ERROR_CODES.PLAN_FAILED);
        return local;
    }

    let getterReads = 0;
    const throwingGetter = {};
    Object.defineProperty(throwingGetter, "code", {
        enumerable: true,
        get: function () {
            getterReads += 1;
            throw new Error("getter must not escape");
        }
    });
    assertSafeFailureTerminal(throwingGetter, protocol.ERROR_CODES.PLAN_FAILED, "Throwing own code getter");
    check(getterReads === 0, "safeFailureCode must not execute an own code getter.");

    const inheritedCode = Object.create({ code: protocol.ERROR_CODES.CONTEXT_STALE });
    assertSafeFailureTerminal(inheritedCode, protocol.ERROR_CODES.PLAN_FAILED, "Inherited error code");

    ["MADE_UP_ERROR", "HOST_CONTEXT_FAKE", "CONTEXT_NOT_REGISTERED"].forEach((unknownCode) => {
        assertSafeFailureTerminal({ code: unknownCode }, protocol.ERROR_CODES.PLAN_FAILED, "Unknown stable-looking error code " + unknownCode);
    });
    assertSafeFailureTerminal({ code: protocol.ERROR_CODES.CONTEXT_STALE }, protocol.ERROR_CODES.CONTEXT_STALE, "Declared protocol error code");

    const unknownAbort = reserveFailureCase();
    const unknownAbortAck = unknownAbort.guard.abort(unknownAbort.reservation.reservation, "MADE_UP_ERROR");
    check(unknownAbortAck.errorCode === protocol.ERROR_CODES.PLAN_FAILED && unknownAbort.store.getCandidate(unknownAbort.plan.candidateIds[0]).result.errorCode === protocol.ERROR_CODES.PLAN_FAILED, "Unknown abort codes must not enter acknowledgements or candidate results.");
    check(unknownAbort.guard.abort(unknownAbort.reservation.reservation, protocol.ERROR_CODES.CONTEXT_STALE) === unknownAbortAck, "Unknown-code aborts must remain exactly-once terminal transitions.");

    if (typeof Proxy === "function") {
        const descriptorTrap = new Proxy({}, {
            getOwnPropertyDescriptor: function () {
                throw new Error("descriptor trap must not escape");
            }
        });
        assertSafeFailureTerminal(descriptorTrap, protocol.ERROR_CODES.PLAN_FAILED, "Throwing Proxy descriptor trap");
        if (typeof Proxy.revocable === "function") {
            const revocable = Proxy.revocable({}, {});
            revocable.revoke();
            assertSafeFailureTerminal(revocable.proxy, protocol.ERROR_CODES.PLAN_FAILED, "Revoked Proxy error");
        } else {
            console.log("SKIP revoked Proxy test: Proxy.revocable is unavailable.");
        }
    } else {
        console.log("SKIP Proxy error tests: Proxy is unavailable.");
    }

    const staleStore = makeStore();
    const stalePlan = makePlan(staleStore);
    staleStore.confirmPlan(stalePlan.planId, binding);
    const staleCandidate = staleStore.getCandidate(stalePlan.candidateIds[0]);
    check(guardModule.createExecutionGuard(staleStore).check(stalePlan.planId, 0, currentFor(stalePlan, staleCandidate, { contextFingerprint: OTHER_CONTEXT_FP })).error.code === protocol.ERROR_CODES.CONTEXT_STALE, "Context drift must block execution.");
    check(staleStore.markStale(staleCandidate.candidateId, "selection-changed").state === "stale", "Context drift must invalidate the candidate.");
    expectCode(() => staleStore.confirm(staleCandidate.candidateId, binding), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Stale candidates cannot be re-confirmed.");

    const permissionStore = makeStore();
    const permissionPlan = makePlan(permissionStore);
    permissionStore.confirmPlan(permissionPlan.planId, binding);
    const permissionCandidate = permissionStore.getCandidate(permissionPlan.candidateIds[0]);
    const permissionGuard = guardModule.createExecutionGuard(permissionStore);
    const permissionChanged = permissionGuard.check(permissionPlan.planId, 0, currentFor(permissionPlan, permissionCandidate, { permissionSnapshot: { mode: "confirm-plan", grants: ["comp.read", "layer.write"], policyRevision: "policy-02" } }));
    check(permissionChanged.ok === false && permissionChanged.error.code === protocol.ERROR_CODES.PERMISSION_DENIED, "Permission policy changes must block old candidates.");
    const grantReordered = permissionGuard.check(permissionPlan.planId, 0, currentFor(permissionPlan, permissionCandidate, { permissionSnapshot: { mode: "confirm-every-action", grants: ["comp.read", "layer.write"], policyRevision: "policy-01" } }));
    check(grantReordered.ok === true, "Permission grant order must not change the normalized snapshot.");
    const settingsChanged = permissionGuard.check(permissionPlan.planId, 0, currentFor(permissionPlan, permissionCandidate, { settingsFingerprint: OTHER_SETTINGS_FP }));
    check(settingsChanged.ok === false && settingsChanged.error.code === protocol.ERROR_CODES.CONTEXT_STALE, "Execution settings changes must block old candidates.");

    const failureStore = makeStore();
    const failurePlan = makePlan(failureStore, 2);
    failureStore.confirmPlan(failurePlan.planId, binding);
    const firstCandidate = failureStore.getCandidate(failurePlan.candidateIds[0]);
    const firstReservation = guardModule.createExecutionGuard(failureStore).reserve(failurePlan.planId, 0, currentFor(failurePlan, firstCandidate));
    const failed = failureStore.failStep(firstReservation.reservation, { code: protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED });
    check(failed.state === "failed", "Failed execution must consume the candidate.");
    const secondCandidate = failureStore.getCandidate(failurePlan.candidateIds[1]);
    expectCode(() => failureStore.reserveStep(failurePlan.planId, 1, currentFor(failurePlan, secondCandidate)), protocol.ERROR_CODES.PLAN_FAILED, "A failed step must stop all later steps.");
    expectCode(() => failureStore.markStale(firstCandidate.candidateId, "late"), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Executing/consumed lifecycle states cannot be recovered.");

    const mismatchStore = makeStore();
    const mismatchAction = validator.validateActionProposal(makeAction({ target: { contextFingerprint: OTHER_CONTEXT_FP, compId: "comp-session-01", layerIndex: 3, propertyPath: ["ADBE Position"] } })).action;
    expectCode(() => mismatchStore.createPlan({ validatedActions: [mismatchAction], validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: binding.permissionSnapshot }), protocol.ERROR_CODES.CONTEXT_STALE, "Action and plan context fingerprints must match at creation.");
    expectCode(() => makePlan(makeStore(), protocol.HARD_LIMITS.maxPlanSteps + 1), protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Plan step limit must reject limit plus one at creation.");

    const blobValidator = validatorModule.createActionValidator(protocol, { registry: { blobTool: { id: "blobTool", actions: { create: { id: "create", executable: true, risk: "write", targetScope: ["layer"], capabilityRevision: "blob-v1", paramsSchema: { type: "object", required: ["blob"], additionalProperties: false, properties: { blob: { type: "string", maxByteLength: protocol.HARD_LIMITS.maxStringBytes } } } } } } } });
    const blobAction = blobValidator.validateActionProposal(makeAction({ payload: { toolId: "blobTool", actionId: "create", params: { blob: "x".repeat(protocol.HARD_LIMITS.maxStringBytes) } }, target: { contextFingerprint: CONTEXT_FP, layerId: "layer-1" } })).action;
    const blobStore = planModule.createPlanStore(protocol, { validatorAuthority: blobValidator.authority, candidateIdFactory: (() => { let i = 0; return () => localId("cand", 9000 + (++i)); })(), nonceFactory: () => localId("confirm", 9001), planIdFactory: () => localId("plan", 9001), sessionIdFactory: () => localId("session", 9001), now: () => 1 });
    expectCode(() => blobStore.createPlan({ validatedActions: Array.from({ length: protocol.HARD_LIMITS.maxPlanSteps }, () => blobAction), validatorAuthority: blobValidator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: SETTINGS_FP, permissionSnapshot: binding.permissionSnapshot }), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Aggregate plan payload must reject the hard limit.");

    const collisionStore = makeStore({ candidateIdFactory: () => localId("cand", 1) });
    expectCode(() => makePlan(collisionStore, 2), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Candidate id collisions must fail within a bounded attempt.");
    expectCode(() => guardModule.createExecutionGuard({ checkStep: () => ({ ok: true }), reserveStep: () => ({ ok: true }) }), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "Method-shaped fake stores must not reach the guard.");
    class FakePlanStore {
        checkStep() { return { ok: true }; }
        reserveStep() { return { ok: true, reservation: {} }; }
    }
    expectCode(() => guardModule.createExecutionGuard(new FakePlanStore()), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "Fake PlanStore classes must be rejected.");
    const constructorSpoof = { constructor: { name: "PlanStore" }, checkStep: store.checkStep, reserveStep: store.reserveStep };
    expectCode(() => guardModule.createExecutionGuard(constructorSpoof), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "Constructor-name spoofing must be rejected.");
    expectCode(() => guardModule.createExecutionGuard(Object.assign({}, store)), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "Shallow PlanStore clones must be rejected.");
    expectCode(() => guardModule.createExecutionGuard(Object.create(store)), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "PlanStore prototype clones must be rejected.");
    expectCode(() => guardModule.createExecutionGuard(new Proxy(store, {})), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "PlanStore proxies must be rejected.");
    expectCode(() => guardModule.createExecutionGuard(JSON.parse(JSON.stringify(store))), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "JSON-round-tripped store views must be rejected.");
    expectCode(() => new guardModule.ExecutionGuard({ protocol, store }), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "The legacy constructor shape must not accept a caller-supplied store field.");
    check(guardModule.evaluateExecutionGuard === undefined, "The old functional store entry point must not be exported.");
    check(planModule.isTrustedPlanStore(store) === true && planModule.isTrustedPlanStoreForProtocol(store, protocol) === true && planModule.isTrustedPlanStoreForProtocol(store, protocolModule.createProtocol(runtime)) === false, "PlanStore trust must use module-private store and exact protocol identity.");
    const planModulePath = require.resolve("../client/js/vela/velaPlan");
    const cachedPlanModule = require.cache[planModulePath];
    try {
        delete require.cache[planModulePath];
        const isolatedPlanModule = require("../client/js/vela/velaPlan");
        const isolatedStore = isolatedPlanModule.createPlanStore(protocol, {
            validatorAuthority: validator.authority,
            sessionIdFactory: () => localId("session", 99991),
            now: () => 1
        });
        expectCode(() => guardModule.createExecutionGuard(isolatedStore), protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "Stores from another VelaPlan module instance must be rejected.");
    } finally {
        require.cache[planModulePath] = cachedPlanModule;
    }
    check(guardModule.replayKeyFor(localId("cand", 1), 4, 2) === localId("cand", 1) + ":4:2", "Replay key format must be stable.");

    const pendingRevisionStore = makeStore();
    const pendingOld = makePlan(pendingRevisionStore);
    const pendingOldCandidate = pendingRevisionStore.getCandidate(pendingOld.candidateIds[0]);
    const pendingAction = validator.validateActionProposal(makeAction()).action;
    const pendingNew = pendingRevisionStore.revisePlan(pendingOld.planId, [pendingAction], binding);
    check(pendingRevisionStore.getPlanView(pendingOld.planId).state === "superseded", "Revising a pending plan must supersede the old revision.");
    check(pendingRevisionStore.getCandidate(pendingOldCandidate.candidateId).state === "superseded", "Pending candidates must become terminal superseded candidates.");
    check(pendingNew.planRevision !== pendingOld.planRevision && pendingNew.candidateIds[0] !== pendingOld.candidateIds[0], "A revision must receive a new revision number and candidate id.");
    expectCode(() => pendingRevisionStore.confirmCandidate(pendingOldCandidate.candidateId, binding), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Superseded pending candidates cannot be confirmed.");
    expectCode(() => pendingRevisionStore.revisePlan(pendingOld.planId, [pendingAction], binding), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "The same old revision cannot be revised twice.");
    expectCode(() => pendingRevisionStore.markStale(pendingOldCandidate.candidateId, "restore"), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Superseded candidates cannot be restored.");

    const confirmedRevisionStore = makeStore();
    const confirmedOld = makePlan(confirmedRevisionStore);
    const confirmedOldView = confirmedRevisionStore.confirmPlan(confirmedOld.planId, binding);
    const confirmedOldCandidate = confirmedRevisionStore.getCandidate(confirmedOld.candidateIds[0]);
    const confirmedNew = confirmedRevisionStore.revisePlan(confirmedOld.planId, [validator.validateActionProposal(makeAction()).action], binding);
    expectCode(() => confirmedRevisionStore.reserveStep(confirmedOld.planId, 0, currentFor(confirmedOldView, confirmedOldCandidate)), protocol.ERROR_CODES.PLAN_FAILED, "Superseded confirmed revisions cannot execute with restored old bindings.");
    check(confirmedNew.supersedesPlanId === confirmedOld.planId, "A revised plan must record its predecessor.");
    assert.throws(() => { confirmedOldView.state = "confirmed"; }, TypeError, "Old frozen plan views must not affect revision state."); assertions += 1;
    check(confirmedRevisionStore.getPlanView(confirmedOld.planId).state === "superseded", "External old view mutation must not affect supersede state.");

    const executingRevisionStore = makeStore();
    const executingOld = makePlan(executingRevisionStore);
    const executingConfirmed = executingRevisionStore.confirmPlan(executingOld.planId, binding);
    const executingCandidate = executingRevisionStore.getCandidate(executingOld.candidateIds[0]);
    const executingReservation = executingRevisionStore.reserveStep(executingOld.planId, 0, currentFor(executingConfirmed, executingCandidate));
    expectCode(() => executingRevisionStore.revisePlan(executingOld.planId, [validator.validateActionProposal(makeAction()).action], binding), protocol.ERROR_CODES.EXECUTION_BUSY, "Executing plans cannot be revised.");
    executingRevisionStore.completeStep(executingReservation.reservation, { ok: true });
    expectCode(() => executingRevisionStore.revisePlan(executingOld.planId, [validator.validateActionProposal(makeAction()).action], binding), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Consumed plans cannot be revised or revived.");
    expectCode(() => failureStore.revisePlan(failurePlan.planId, [validator.validateActionProposal(makeAction()).action], binding), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Failed-consumed plans cannot be revised or revived.");

    const independentStore = makeStore();
    const independentA = makePlan(independentStore);
    const independentB = makePlan(independentStore);
    check(independentStore.getPlanView(independentA.planId).state === "pending-confirmation" && independentStore.getPlanView(independentB.planId).state === "pending-confirmation", "Independent plan creation must not supersede unrelated plans.");

    let collisionCalls = 0;
    const boundedCollisionStore = makeStore({ candidateIdFactory: () => { collisionCalls += 1; return localId("cand", 42); } });
    expectCode(() => makePlan(boundedCollisionStore, 2), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Repeated candidate collisions must fail closed.");
    check(collisionCalls === protocol.HARD_LIMITS.maxIdCollisionRetries + 1, "Candidate collision retries must have a fixed hard cap.");

    const duplicatePlanStore = makeStore({ planIdFactory: () => localId("plan", 55) });
    makePlan(duplicatePlanStore);
    expectCode(() => makePlan(duplicatePlanStore), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Plan id collisions must fail within the hard retry budget.");

    const duplicateConfirmationStore = makeStore({ nonceFactory: () => localId("confirm", 66) });
    const duplicateConfirmationPlan = makePlan(duplicateConfirmationStore, 2);
    duplicateConfirmationStore.confirmCandidate(duplicateConfirmationPlan.candidateIds[0], binding);
    expectCode(() => duplicateConfirmationStore.confirmCandidate(duplicateConfirmationPlan.candidateIds[1], binding), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Confirmation id collisions must fail within the hard retry budget.");

    const sessionRaw = localId("session", 7777);
    makeStore({ sessionIdFactory: () => sessionRaw });
    expectCode(() => makeStore({ sessionIdFactory: () => sessionRaw }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Session id collisions must fail within the hard retry budget.");

    const duplicateReservationStore = makeStore({ reservationIdFactory: () => localId("res", 77) });
    const duplicateReservationPlan = makePlan(duplicateReservationStore, 2);
    const duplicateReservationConfirmed = duplicateReservationStore.confirmPlan(duplicateReservationPlan.planId, binding);
    const duplicateFirst = duplicateReservationStore.getCandidate(duplicateReservationPlan.candidateIds[0]);
    const duplicateFirstReservation = duplicateReservationStore.reserveStep(duplicateReservationPlan.planId, 0, currentFor(duplicateReservationConfirmed, duplicateFirst));
    duplicateReservationStore.completeStep(duplicateFirstReservation.reservation, { ok: true });
    const duplicateSecond = duplicateReservationStore.getCandidate(duplicateReservationPlan.candidateIds[1]);
    expectCode(() => duplicateReservationStore.reserveStep(duplicateReservationPlan.planId, 1, currentFor(duplicateReservationConfirmed, duplicateSecond)), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Reservation id collisions must fail within the hard retry budget.");

    const crossStoreA = makeStore({ candidateIdFactory: () => localId("cand", 88), planIdFactory: () => localId("plan", 88), reservationIdFactory: () => localId("res", 88) });
    const crossStoreB = makeStore({ candidateIdFactory: () => localId("cand", 88), planIdFactory: () => localId("plan", 88), reservationIdFactory: () => localId("res", 88) });
    const crossPlanA = makePlan(crossStoreA);
    const crossPlanB = makePlan(crossStoreB);
    check(crossPlanA.planId !== crossPlanB.planId && crossPlanA.candidateIds[0] !== crossPlanB.candidateIds[0], "Session binding must separate identical raw ids across stores.");
    check(!Object.prototype.hasOwnProperty.call(crossPlanA, "sessionId"), "Plan views must not expose the internal session id.");
    const crossConfirmedA = crossStoreA.confirmPlan(crossPlanA.planId, binding);
    const crossCandidateA = crossStoreA.getCandidate(crossPlanA.candidateIds[0]);
    const crossReservationA = crossStoreA.reserveStep(crossPlanA.planId, 0, currentFor(crossConfirmedA, crossCandidateA));
    expectCode(() => crossStoreB.completeStep(crossReservationA.reservation, { ok: true }), protocol.ERROR_CODES.RESERVATION_INVALID, "Reservation handles from another store must be rejected.");
    expectCode(() => crossStoreB.completeStep({ reservationId: crossReservationA.reservation.reservationId }, { ok: true }), protocol.ERROR_CODES.RESERVATION_INVALID, "Fake reservation ids must be rejected.");
    expectCode(() => crossStoreB.getCandidate(crossPlanA.candidateIds[0]), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Candidate ids from another store must be rejected.");
    expectCode(() => crossStoreB.reserveStep(crossPlanA.planId, 0, {}), protocol.ERROR_CODES.PLAN_INVALID, "Plan ids from another store must be rejected.");
    crossStoreA.completeStep(crossReservationA.reservation, { ok: true });
    console.log("PASS Vela guard: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela guard - " + error.message);
    process.exitCode = 1;
}
