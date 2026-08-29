#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const planning = require("../client/js/vela/velaPlanningContracts");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const preflightModule = require("../client/js/vela/velaExecutionPreflight");
const contextModule = require("../client/js/vela/velaContext");
const materializerModule = require("../client/js/vela/velaAuthorizedPlanMaterializer");
const projectionModule = require("../client/js/vela/velaPlanReviewProjection");
const taskRunModule = require("../client/js/vela/velaTaskRun");
const controllerModule = require("../client/js/vela/velaPlanController");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const contextApi = contextModule.createContextApi(protocol);
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
let assertions = 0;
let harnessId = 0;
let authorityId = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, codes, message) { codes = Array.isArray(codes) ? codes : [codes]; await assert.rejects(Promise.resolve(value), function (error) { return error && codes.indexOf(error.code) !== -1; }, message); assertions += 1; }
function localId(kind, value) { return kind + "_" + String(value).padStart(32, "0"); }
function flush() { return Promise.resolve().then(function () { return Promise.resolve(); }).then(function () { return Promise.resolve(); }); }

function browserSmoke() {
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaPlanController"), "utf8");
    const moduleSentinel = { exports: { untouched: true } };
    const sandbox = { Object, Error, Promise, Map, Set, module: moduleSentinel, require() { throw new Error("browser path called require"); } };
    sandbox.self = sandbox; sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: "velaPlanController.js" });
    check(typeof sandbox.VelaPlanController.createPlanController === "function", "Browser-global PlanController registration works.");
    check(moduleSentinel.exports.untouched === true, "CEP-like browser identity wins over ambient CommonJS descriptors.");
}

function authorized(opacities, overrides) {
    const number = ++authorityId;
    return planning.createAuthorizedPlan({ planId: "authority_plan_" + number, revision: number, steps: opacities.map(function (opacity, index) {
        return Object.assign({
            candidateId: "authority_cand_" + number + "_" + index,
            capabilityId: "set-opacity-v1",
            kind: "tool",
            risk: "write",
            params: { opacity },
            targetScope: { type: "selected-layer", property: "opacity" },
            requiresConfirmation: true,
            policyDecision: { decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "legacy-policy", provenance: { rule: "mutation", capabilityId: "set-opacity-v1", requestedOperation: "mutate" } }
        }, overrides || {});
    }) });
}

function decode(source) {
    const prefix = "AEToolbox.VelaContext.handle(";
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}
function hostResult(request, snapshot) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }

function makeHarness(options) {
    options = options || {};
    const number = ++harnessId;
    const state = { value: 100, layerIndex: 3, selectionExtra: false, deferAt: null, failAt: null, permissionRevision: "p1" };
    const executed = [];
    const deferred = [];
    const bridge = bridgeModule.createContextBridge({
        protocol,
        contextApi,
        invokeHost(source, callback) {
            const request = decode(source);
            if (request.operation === "captureContext") {
                const items = [{ nativeLayerId: 45, layerIndex: state.layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }];
                if (state.selectionExtra) items.push({ nativeLayerId: 46, layerIndex: 4, selectedOrder: 1, matchName: "ADBE AV Layer", type: "av" });
                callback(hostResult(request, { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 1, projectGeneration: 3, activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: items.length, identityQuality: "native-layer-id", items } }));
                return;
            }
            callback(hostResult(request, { hostInstanceId: HOST, hostReloadEpoch: 1, projectGeneration: 3, sampleTime: executed.length + 1, tier: 3, targets: request.scope.targets.map(function (target, index) { return { targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: state.value } }; }) }));
        },
        runtime: { setTimeout, clearTimeout, timeoutMs: 1000 }
    });
    const validator = validatorModule.createActionValidator(protocol, { registry: { vela: { id: "vela", actions: { "set-opacity-v1": { id: "set-opacity-v1", executable: true, risk: "write", targetScope: ["layer", "property"], capabilityRevision: "set-opacity-v1", paramsSchema: { type: "object", additionalProperties: false, required: ["opacity"], properties: { opacity: { type: "number", minimum: 0, maximum: 100 } } } } } } } });
    let id = 0;
    const store = planModule.createPlanStore(protocol, {
        validatorAuthority: validator.authority,
        candidateIdFactory() { return localId("cand", number * 1000 + (++id)); },
        planIdFactory() { return localId("plan", number * 1000 + (++id)); },
        nonceFactory() { return localId("confirm", number * 1000 + (++id)); },
        reservationIdFactory() { return localId("res", number * 1000 + (++id)); },
        sessionIdFactory() { return localId("session", number * 1000 + (++id)); },
        now() { return ++id; }
    });
    const preflight = preflightModule.createExecutionPreflight({
        protocol,
        actionValidator: validator,
        planStore: store,
        contextBridge: bridge,
        getCurrentExecutionBinding() { return { settingsFingerprint: "sha256:" + "a".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: ["layer.write"], policyRevision: state.permissionRevision }, lifecycle: "active", hasVerifier: true }; },
        executeValidatedAction(action, metadata) {
            executed.push({ index: metadata.actionIndex, opacity: action.payload.params.opacity, before: state.value });
            if (state.failAt === metadata.actionIndex) { return Promise.reject(new protocol.VelaProtocolError(protocol.ERROR_CODES.PLAN_FAILED)); }
            function finish() { state.value = action.payload.params.opacity; return { ok: true, summary: { capabilityId: "set-opacity-v1", resultingValueDigest: contextApi.digestPropertyValue("number", state.value) } }; }
            if (state.deferAt === metadata.actionIndex) { return new Promise(function (resolve) { deferred.push(function () { state.deferAt = null; resolve(finish()); }); }); }
            return finish();
        }
    });
    const materializer = materializerModule.createAuthorizedPlanMaterializer({ protocol, planningContracts: planning, capabilityContracts: capabilities, preflight });
    const projectionFactory = options.projectionFactory || projectionModule.createPlanReviewProjection({ protocol, planningContracts: planning, capabilityContracts: capabilities });
    let taskId = 0;
    let taskRunCreations = 0;
    const controller = controllerModule.createPlanController({ protocol, materializer, projectionFactory, preflight, planStore: store, taskRunFactory(input) { taskRunCreations += 1; return taskRunModule.createTaskRun(input); }, taskRunIdFactory() { return "task_run_" + number + "_" + (++taskId); }, now() { return ++id; } });
    return { state, executed, deferred, bridge, store, preflight, materializer, controller, getTaskRunCreations() { return taskRunCreations; }, release() { const next = deferred.shift(); if (next) next(); } };
}

async function acceptAndConfirm(harness, opacities) {
    const waiting = await harness.controller.accept(authorized(opacities), { selectionOrderMeaningful: true });
    const active = await harness.controller.confirm(waiting.executionPlanId);
    return { waiting, active };
}

async function run() {
    check(typeof controllerModule.createPlanController === "function", "Node/CommonJS import works.");
    const delegatedPreflight = makeHarness();
    const delegatedBound = await delegatedPreflight.preflight.createBoundPlan({ steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 33 }, targetScope: { type: "selected-layer", property: "opacity" } }], selectionOrderMeaningful: true });
    const delegatedActivationPort = delegatedPreflight.preflight.createDelegatedActivationPort({ planId: delegatedBound.planId, activationId: "activation_delegated_test" });
    await delegatedPreflight.preflight.activateDelegatedBoundPlan({ planId: delegatedBound.planId, activationPort: delegatedActivationPort });
    let commitCalls = 0;
    const delegatedCommitPort = delegatedPreflight.preflight.createExecutionCommitPort({ planId: delegatedBound.planId, stepIndex: 0, commit() { commitCalls += 1; } });
    await delegatedPreflight.preflight.executeStep({ planId: delegatedBound.planId, stepIndex: 0, commitPort: delegatedCommitPort });
    check(commitCalls === 1 && delegatedPreflight.executed.length === 1, "Delegated PlanStore branch commits exactly once before the existing executor seam.");
    check(!delegatedPreflight.store.getCandidate(delegatedBound.candidateIds[0]).confirmationNonce, "Delegated activation does not mint or reuse a human confirmation nonce.");
    const failedCommit = makeHarness();
    const failedBound = await failedCommit.preflight.createBoundPlan({ steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 44 }, targetScope: { type: "selected-layer", property: "opacity" } }], selectionOrderMeaningful: true });
    const failedActivationPort = failedCommit.preflight.createDelegatedActivationPort({ planId: failedBound.planId, activationId: "activation_failed_commit" });
    await failedCommit.preflight.activateDelegatedBoundPlan({ planId: failedBound.planId, activationPort: failedActivationPort });
    const failedCommitPort = failedCommit.preflight.createExecutionCommitPort({ planId: failedBound.planId, stepIndex: 0, commit() { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.PERMISSION_DENIED); } });
    await expectCode(failedCommit.preflight.executeStep({ planId: failedBound.planId, stepIndex: 0, commitPort: failedCommitPort }), protocol.ERROR_CODES.PERMISSION_DENIED, "Authority commit failure stops delegated execution.");
    check(failedCommit.executed.length === 0 && failedCommit.store.getPlanView(failedBound.planId).state === "failed", "Commit failure calls no executor and terminalizes the PlanStore reservation without replay restoration.");
    browserSmoke();

    const accepted = makeHarness();
    const waiting = await accepted.controller.accept(authorized([50, 25]), { selectionOrderMeaningful: true });
    check(waiting.taskState === "waiting-approval" && waiting.executionArmed === false && waiting.nextStep === 0, "accept creates one unarmed waiting-approval TaskRun.");
    check(accepted.executed.length === 0 && accepted.store.getPlanView(waiting.executionPlanId).state === "pending-confirmation", "accept neither confirms nor executes.");
    const review = accepted.controller.getReviewState(waiting.executionPlanId);
    check(Object.isFrozen(review) && review.actionCount === 2 && review.projection.stepCount === 2, "Accept creates and exposes the whole-plan projection.");
    check(Object.isFrozen(review.projection) && Object.isFrozen(review.projection.steps) && Object.isFrozen(review.projection.steps[0].parameters), "getReviewState returns the immutable projection snapshot.");
    check(review.projection.executionPlanId === undefined && review.projection.authorizedPlanId === undefined && review.projection.taskRunId === undefined, "Projection contains no execution or runtime plan identity.");
    await expectCode(Promise.resolve().then(function () { return accepted.controller.run(waiting.executionPlanId); }), protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "run before confirmation is impossible.");
    const active = await accepted.controller.confirm(waiting.executionPlanId);
    check(active.taskState === "active" && active.executionArmed === true && accepted.executed.length === 0, "confirm arms only after Preflight confirmation and does not auto-execute.");

    const one = makeHarness(); const oneRecord = await acceptAndConfirm(one, [40]);
    const oneDone = await one.controller.run(oneRecord.waiting.executionPlanId);
    check(oneDone.taskState === "completed" && oneDone.executionArmed === false && one.state.value === 40 && one.executed.length === 1, "One-step run completes and disarms.");

    const two = makeHarness(); const twoRecord = await acceptAndConfirm(two, [50, 25]);
    const twoDone = await two.controller.run(twoRecord.waiting.executionPlanId);
    check(twoDone.taskState === "completed" && two.state.value === 25, "Two-step run completes in order.");
    check(two.executed.map(function (item) { return item.index; }).join(",") === "0,1" && two.executed[1].before === 50, "Each chain link reads live nextStep after the prior execution promise terminal.");

    const eight = makeHarness(); const eightRecord = await acceptAndConfirm(eight, [10, 20, 30, 40, 50, 60, 70, 80]);
    check((await eight.controller.run(eightRecord.waiting.executionPlanId)).taskState === "completed" && eight.executed.length === 8, "Bounded max-eight orchestration executes in order.");

    const failure = makeHarness(); const failureRecord = await acceptAndConfirm(failure, [50, 25, 10]); failure.state.failAt = 1;
    await expectCode(failure.controller.run(failureRecord.waiting.executionPlanId), protocol.ERROR_CODES.PLAN_FAILED, "Execution failure rejects the run.");
    const failedProgress = failure.controller.getProgress(failureRecord.waiting.executionPlanId);
    check(failedProgress.taskState === "blocked" && failedProgress.executionArmed === false && failedProgress.terminalErrorCode === protocol.ERROR_CODES.PLAN_FAILED && failure.executed.length === 2, "Failure blocks TaskRun and stops all later scheduling without retry.");

    const stale = makeHarness(); const staleRecord = await acceptAndConfirm(stale, [50, 25]); stale.state.selectionExtra = true;
    await expectCode(stale.controller.run(staleRecord.waiting.executionPlanId), protocol.ERROR_CODES.CONTEXT_STALE, "Stale JIT target stops orchestration.");
    check(stale.controller.getProgress(staleRecord.waiting.executionPlanId).taskState === "blocked" && stale.executed.length === 0, "Stale failure blocks before Host execution and later steps.");

    const permission = makeHarness(); const permissionRecord = await acceptAndConfirm(permission, [50, 25]); permission.state.permissionRevision = "p2";
    await expectCode(permission.controller.run(permissionRecord.waiting.executionPlanId), protocol.ERROR_CODES.PERMISSION_DENIED, "Permission drift stops orchestration.");
    check(permission.controller.getProgress(permissionRecord.waiting.executionPlanId).executionArmed === false && permission.executed.length === 0, "Permission failure disarms and executes nothing.");

    const confirmFailure = makeHarness();
    const confirmWaiting = await confirmFailure.controller.accept(authorized([50]), { selectionOrderMeaningful: true });
    confirmFailure.state.selectionExtra = true;
    await expectCode(confirmFailure.controller.confirm(confirmWaiting.executionPlanId), protocol.ERROR_CODES.CONTEXT_STALE, "Failed confirmation rejects.");
    check(confirmFailure.controller.getProgress(confirmWaiting.executionPlanId).taskState === "waiting-approval" && confirmFailure.controller.getProgress(confirmWaiting.executionPlanId).executionArmed === false, "Failed confirmation never arms or executes.");

    const cancelled = makeHarness(); const cancelWaiting = await cancelled.controller.accept(authorized([50, 25]), { selectionOrderMeaningful: true });
    const cancelledProgress = cancelled.controller.cancel(cancelWaiting.executionPlanId, "user-cancelled");
    check(cancelledProgress.taskState === "cancelled" && cancelledProgress.executionArmed === false && cancelled.executed.length === 0, "Cancel before confirmation disarms and discards without execution.");

    const between = makeHarness(); const betweenRecord = await acceptAndConfirm(between, [50, 25]); between.state.deferAt = 0;
    const betweenRun = between.controller.run(betweenRecord.waiting.executionPlanId); await flush(); await flush();
    check(between.executed.length === 1, "First in-flight step reaches the external execution boundary.");
    const betweenCancelled = between.controller.cancel(betweenRecord.waiting.executionPlanId, "between-steps");
    check(betweenCancelled.taskState === "cancelled", "Cancel race disarms the TaskRun without force-aborting the in-flight step.");
    between.release(); await betweenRun;
    check(between.executed.length === 1 && between.state.value === 50, "In-flight mutation may finish, is not rolled back, and no next step schedules.");

    const overlap = makeHarness(); const overlapRecord = await acceptAndConfirm(overlap, [50, 25]); overlap.state.deferAt = 0;
    const firstRun = overlap.controller.run(overlapRecord.waiting.executionPlanId); await flush(); await flush();
    await expectCode(Promise.resolve().then(function () { return overlap.controller.run(overlapRecord.waiting.executionPlanId); }), protocol.ERROR_CODES.EXECUTION_BUSY, "Overlapping run is rejected.");
    overlap.release(); await firstRun;

    const disposed = makeHarness(); const disposeRecord = await acceptAndConfirm(disposed, [50, 25]); disposed.state.deferAt = 0;
    const disposeRun = disposed.controller.run(disposeRecord.waiting.executionPlanId); await flush(); await flush();
    check(disposed.controller.dispose() === true, "dispose marks controller terminal and cancels non-terminal runs.");
    disposed.release(); await disposeRun;
    check(disposed.executed.length === 1, "Dispose prevents later scheduling without rollback of the in-flight step.");
    await expectCode(Promise.resolve().then(function () { return disposed.controller.accept(authorized([20]), { selectionOrderMeaningful: true }); }), protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Disposed controller prevents new accept.");
    await expectCode(Promise.resolve().then(function () { return disposed.controller.confirm(disposeRecord.waiting.executionPlanId); }), protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Disposed controller prevents confirm.");
    await expectCode(Promise.resolve().then(function () { return disposed.controller.run(disposeRecord.waiting.executionPlanId); }), protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Disposed controller prevents run.");

    const duplicate = makeHarness(); const duplicatePlan = authorized([50]);
    await duplicate.controller.accept(duplicatePlan, { selectionOrderMeaningful: true });
    await expectCode(duplicate.controller.accept(duplicatePlan, { selectionOrderMeaningful: true }), protocol.ERROR_CODES.CANDIDATE_REPLAY, "One authority/execution plan maps to one TaskRun.");

    const invalid = makeHarness();
    const taskPlan = planning.createTaskPlan({ planId: "task_input", revision: 0, steps: [{ stepId: "observe_1", kind: "observe" }] });
    await expectCode(invalid.controller.accept(taskPlan, { selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "TaskPlan cannot enter PlanController.");
    const rawCandidate = planning.createActionCandidate({ candidateId: "raw_input", capabilityId: "set-opacity-v1", operationKind: "mutate", kind: "tool", risk: "write", params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true });
    await expectCode(invalid.controller.accept(rawCandidate, { selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Raw ActionCandidate cannot enter PlanController.");

    assert.throws(function () { controllerModule.createPlanController({ protocol, materializer: invalid.materializer, preflight: invalid.preflight, planStore: invalid.store, taskRunFactory: taskRunModule.createTaskRun, taskRunIdFactory() { return "task_missing_projection"; }, now() { return 1; } }); }, function (error) { return error && error.code === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE; }, "Projection factory is a required PlanController dependency."); assertions += 1;

    let failedExecutionPlanId = null;
    const projectionFailure = makeHarness({ projectionFactory: { project(plan, materializedPlan) { failedExecutionPlanId = materializedPlan.executionPlanId; throw new protocol.VelaProtocolError(protocol.ERROR_CODES.PLAN_INVALID); } } });
    await expectCode(projectionFailure.controller.accept(authorized([50, 25]), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PLAN_INVALID, "Projection failure rejects accept.");
    check(failedExecutionPlanId !== null && projectionFailure.store.getPlanView(failedExecutionPlanId).state === "discarded", "Projection failure discards the newly materialized execution plan.");
    check(projectionFailure.getTaskRunCreations() === 0 && projectionFailure.executed.length === 0, "Projection failure creates no TaskRun and executes nothing.");
    await expectCode(Promise.resolve().then(function () { return projectionFailure.controller.confirm(failedExecutionPlanId); }), protocol.ERROR_CODES.PLAN_INVALID, "Projection failure leaves no confirmable controller record.");
    await expectCode(Promise.resolve().then(function () { return projectionFailure.controller.run(failedExecutionPlanId); }), protocol.ERROR_CODES.PLAN_INVALID, "Projection failure leaves no runnable controller record.");

    const mutableProjection = { revision: null };
    const revisionMismatch = makeHarness({ projectionFactory: { project(plan) { mutableProjection.revision = plan.revision; return mutableProjection; } } });
    const mismatchWaiting = await revisionMismatch.controller.accept(authorized([50]), { selectionOrderMeaningful: true });
    mutableProjection.revision += 1;
    await expectCode(Promise.resolve().then(function () { return revisionMismatch.controller.confirm(mismatchWaiting.executionPlanId); }), protocol.ERROR_CODES.PLAN_INVALID, "Confirm rejects an internally inconsistent projection revision.");
    check(revisionMismatch.controller.getProgress(mismatchWaiting.executionPlanId).executionArmed === false && revisionMismatch.executed.length === 0, "Projection revision mismatch cannot arm or execute.");

    const ordering = makeHarness(); const orderingRecord = await acceptAndConfirm(ordering, [31, 62]);
    const orderingReview = ordering.controller.getReviewState(orderingRecord.waiting.executionPlanId).projection;
    orderingReview.steps.forEach(function (item) { check(Object.isFrozen(item), "Projection step cannot be mutated to influence execution ordering."); });
    await ordering.controller.run(orderingRecord.waiting.executionPlanId);
    check(ordering.executed.map(function (item) { return item.opacity; }).join(",") === "31,62", "Execution ordering remains owned by PlanStore, not projection.");

    const invalidatedWaiting = makeHarness(); const invalidatedWaitingRecord = await invalidatedWaiting.controller.accept(authorized([45]), { selectionOrderMeaningful: true });
    check(typeof invalidatedWaiting.controller.invalidate === "function" && invalidatedWaiting.controller.invalidate("session-reset") === true, "Reusable invalidate exists and clears waiting orchestration state.");
    await expectCode(Promise.resolve().then(function () { return invalidatedWaiting.controller.getProgress(invalidatedWaitingRecord.executionPlanId); }), protocol.ERROR_CODES.PLAN_INVALID, "No old waiting record remains callable after invalidate.");
    const reused = await invalidatedWaiting.controller.accept(authorized([35]), { selectionOrderMeaningful: true });
    check(reused.taskState === "waiting-approval" && reused.executionArmed === false, "Invalidate does not dispose PlanController and the same instance is reusable.");

    const invalidatedActive = makeHarness(); const invalidatedActiveRecord = await acceptAndConfirm(invalidatedActive, [50, 25]); invalidatedActive.state.deferAt = 0;
    const invalidatedRun = invalidatedActive.controller.run(invalidatedActiveRecord.waiting.executionPlanId); await flush(); await flush();
    check(invalidatedActive.executed.length === 1, "Invalidate race begins with one in-flight Host mutation.");
    invalidatedActive.controller.invalidate("suspend"); invalidatedActive.release(); await invalidatedRun;
    check(invalidatedActive.executed.length === 1 && invalidatedActive.state.value === 50, "In-flight mutation may finish without rollback, while generation invalidation blocks every later step.");
    await expectCode(Promise.resolve().then(function () { return invalidatedActive.controller.confirm(invalidatedActiveRecord.waiting.executionPlanId); }), protocol.ERROR_CODES.PLAN_INVALID, "Invalidated TaskRun cannot be re-armed.");

    const invalidatedCompleted = makeHarness(); const completedRecord = await acceptAndConfirm(invalidatedCompleted, [42]); await invalidatedCompleted.controller.run(completedRecord.waiting.executionPlanId);
    invalidatedCompleted.controller.invalidate("reset");
    check(invalidatedCompleted.state.value === 42 && invalidatedCompleted.executed.length === 1, "Invalidate leaves completed mutation effects unchanged and adds no retry or rollback.");

    const source = fs.readFileSync(require.resolve("../client/js/vela/velaPlanController"), "utf8");
    check(!/Surface|SessionRuntime|Observation|refreshActiveComposition|task\//.test(source), "PlanController has no Surface, Session event, or Observation dependency.");
    check(!/retry|replan|rollback/.test(source), "PlanController implements no retry, replan, or rollback.");
    console.log("PASS Vela PlanController: " + assertions + " assertions.");
}

run().catch(function (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
