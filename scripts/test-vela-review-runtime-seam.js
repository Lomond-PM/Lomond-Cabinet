#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocol = require("../client/js/vela/velaProtocol").createProtocol(require("./velaNodeRuntime"));
const planning = require("../client/js/vela/velaPlanningContracts");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const materializerModule = require("../client/js/vela/velaAuthorizedPlanMaterializer");
const projectionModule = require("../client/js/vela/velaPlanReviewProjection");
const taskRunModule = require("../client/js/vela/velaTaskRun");
const controllerModule = require("../client/js/vela/velaPlanController");
const portModule = require("../client/js/vela/velaReviewRuntimePort");

let assertions = 0; let serial = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectCode(fn, codes, message) { codes = Array.isArray(codes) ? codes : [codes]; assert.throws(fn, function (error) { return error && codes.indexOf(error.code) !== -1; }, message); assertions += 1; }
function policy() { return { decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "legacy-policy", provenance: { rule: "mutation", capabilityId: "set-opacity-v1", requestedOperation: "mutate" } }; }
function authorized(opacities) { const n = ++serial; return planning.createAuthorizedPlan({ planId: "authority_plan_" + n, revision: n, steps: opacities.map(function (opacity, index) { return { candidateId: "authority_cand_" + n + "_" + index, capabilityId: "set-opacity-v1", kind: "tool", risk: "write", params: { opacity }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true, policyDecision: policy() }; }) }); }
function harness(options) {
    options = options || {};
    let planNumber = 0; let taskNumber = 0; let tokenNumber = 0;
    const views = new Map();
    const preflight = {
        createBoundPlan(input) { const id = "execution_plan_" + (++planNumber); views.set(id, { planId: id, actionCount: input.steps.length, nextStep: 0, state: "pending-confirmation", candidates: input.steps.map(function () { return { state: "pending" }; }) }); return Promise.resolve({ planId: id, planRevision: planNumber, actionCount: input.steps.length, review: Object.freeze({ valueKind: "number", beforeValue: 100 }) }); },
        confirmBoundPlan() { throw new Error("port must not confirm"); }, executeStep() { throw new Error("port must not execute"); },
        discardBoundPlan(input) { const view = views.get(input.planId); if (view) view.state = "discarded"; return view; }
    };
    const planStore = { getPlanView(id) { const view = views.get(id); if (!view) { protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "missing"); } return Object.freeze({ actionCount: view.actionCount, nextStep: view.nextStep, state: view.state, candidates: Object.freeze(view.candidates.map(function (item) { return Object.freeze({ state: item.state }); })) }); } };
    const materializer = materializerModule.createAuthorizedPlanMaterializer({ protocol, planningContracts: planning, capabilityContracts: capabilities, preflight });
    const projectionFactory = options.projectionFactory || projectionModule.createPlanReviewProjection({ protocol, planningContracts: planning, capabilityContracts: capabilities });
    const controller = controllerModule.createPlanController({ protocol, materializer, projectionFactory, preflight, planStore, taskRunFactory: taskRunModule.createTaskRun, taskRunIdFactory() { return "task_run_" + (++taskNumber); }, now() { return taskNumber + planNumber + 1; } });
    const port = portModule.createReviewRuntimePort({ protocol, planController: controller, tokenFactory: options.tokenFactory || function () { return "review_" + (++tokenNumber); } });
    return { controller, port, views };
}
function forbidden(value) { const text = JSON.stringify(value); return /executionPlanId|authorizedPlanId|taskRunId|candidateId|executionArmed|confirmationNonce|reservationId|replayKey|propertyValueDigest/.test(text); }

async function run() {
    check(typeof portModule.createReviewRuntimePort === "function", "CommonJS ReviewRuntimePort factory is available.");
    check(typeof portModule.createObjectiveReviewRuntimePort === "function", "Objective review adapter factory is available.");
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaReviewRuntimePort"), "utf8");
    let requires = 0; const sentinel = { exports: { untouched: true } }; const browser = { Object, Error, Map, Number, module: sentinel, require() { requires += 1; } }; browser.self = browser; browser.window = browser;
    vm.runInNewContext(source, browser, { filename: "velaReviewRuntimePort.js" });
    check(browser.VelaReviewRuntimePort && requires === 0 && sentinel.exports.untouched === true, "CEP hybrid browser path wins without touching CommonJS descriptors.");
    assert.throws(function () { vm.runInNewContext(source, browser); }, /MODULE_BOOTSTRAP_CONFLICT/, "Duplicate browser bootstrap fails closed."); assertions += 1;

    const h = harness();
    check(Object.keys(h.port).sort().join(",") === "invalidate,invalidateAll,register,resolve", "Port starts empty with only minimal read-only correlation API.");
    expectCode(function () { h.port.resolve("review_1"); }, protocol.ERROR_CODES.PLAN_INVALID, "Empty port cannot resolve a token.");
    const plan = authorized([50, 25]); const waiting = await h.controller.accept(plan, { selectionOrderMeaningful: true });
    const token = h.port.register(waiting.executionPlanId);
    const token2 = h.port.register(waiting.executionPlanId);
    check(token !== token2 && token !== waiting.executionPlanId && token !== plan.planId && token.indexOf(waiting.executionPlanId) === -1, "Tokens are unique opaque local correlations, not plan identities.");
    const resolved = h.port.resolve(token);
    check(Object.isFrozen(resolved) && Object.isFrozen(resolved.projection) && resolved.reviewToken === token && resolved.projection.stepCount === 2, "Resolve returns only the exact frozen projection and token.");
    check(!forbidden(resolved), "Resolved output contains no plan, run, candidate, armed, nonce, reservation, or CAS identity.");
    check(!("approve" in h.port) && !("confirm" in h.port) && !("run" in h.port) && !("cancel" in h.port), "Port cannot confirm, arm, run, cancel, or modify lifecycle.");
    expectCode(function () { h.port.resolve(""); }, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Malformed token is rejected.");
    expectCode(function () { h.port.resolve("review_unknown"); }, protocol.ERROR_CODES.PLAN_INVALID, "Unknown token is rejected.");
    check(h.port.invalidate(token) === true, "Exact token invalidation succeeds.");
    expectCode(function () { h.port.resolve(token); }, protocol.ERROR_CODES.PLAN_INVALID, "Deleted token is rejected.");
    h.port.invalidateAll();
    expectCode(function () { h.port.resolve(token2); }, protocol.ERROR_CODES.PLAN_INVALID, "invalidateAll removes every token.");

    const stale = harness(); const staleWaiting = await stale.controller.accept(authorized([40]), { selectionOrderMeaningful: true }); const staleToken = stale.port.register(staleWaiting.executionPlanId);
    stale.controller.cancel(staleWaiting.executionPlanId, "terminal");
    expectCode(function () { stale.port.resolve(staleToken); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Terminal/non-waiting review fails closed.");
    const missing = harness(); const missingWaiting = await missing.controller.accept(authorized([30]), { selectionOrderMeaningful: true }); const missingToken = missing.port.register(missingWaiting.executionPlanId); missing.controller.invalidate("reset");
    expectCode(function () { missing.port.resolve(missingToken); }, protocol.ERROR_CODES.PLAN_INVALID, "Missing controller record fails closed and invalidates correlation.");

    let currentRevision = 1; const changingController = { getReviewState() { return { projection: Object.freeze({ revision: currentRevision }) }; }, getProgress() { return { taskState: "waiting-approval", executionArmed: false, authorizedPlanId: "authority_revision", executionPlanId: "execution_revision", taskRunId: "task_revision" }; } };
    const changingPort = portModule.createReviewRuntimePort({ protocol, planController: changingController, tokenFactory() { return "review_revision"; } });
    const mismatchToken = changingPort.register("execution_revision"); currentRevision = 2;
    expectCode(function () { changingPort.resolve(mismatchToken); }, protocol.ERROR_CODES.PLAN_INVALID, "Changed projection revision fails closed.");

    const oldPort = harness(); const oldWaiting = await oldPort.controller.accept(authorized([10]), { selectionOrderMeaningful: true }); const oldToken = oldPort.port.register(oldWaiting.executionPlanId); const freshPort = harness();
    expectCode(function () { freshPort.port.resolve(oldToken); }, protocol.ERROR_CODES.PLAN_INVALID, "Fresh port cannot resolve a prior lifetime token.");
    check(oldPort.controller.getProgress(oldWaiting.executionPlanId).executionArmed === false, "Registration and resolution never arm TaskRun.");

    let objectiveState = Object.freeze({ state: "active", reviewId: "agent_review_1", revision: 1, capabilityId: "set-opacity-v1", proposedValue: 47, outcome: null });
    let objectiveResolutions = 0;
    const objectivePort = portModule.createObjectiveReviewRuntimePort({ protocol, ownerPort: Object.freeze({
        getProjection() { return objectiveState; },
        resolve(input) { objectiveResolutions += 1; objectiveState = Object.freeze({ state: "resolved", reviewId: input.reviewId, revision: input.revision, capabilityId: null, proposedValue: null, outcome: input.outcome }); return Object.freeze({ state: input.outcome === "approved" ? "awaiting-outcome" : "terminal" }); }
    }) });
    const objectiveProjection = objectivePort.getProjection();
    check(Object.isFrozen(objectiveProjection) && objectiveProjection.state === "active" && objectiveProjection.reviewId === "agent_review_1" && objectiveProjection.proposedValue === 47, "Objective adapter returns only a frozen bounded projection.");
    check(!forbidden(objectiveProjection) && !/taskPlan|CapabilityIntent|ActionCandidate|authority|host/i.test(JSON.stringify(objectiveProjection)), "Objective projection contains no planning, authority, binding, or Host object.");
    check(objectivePort.resolve("approved").state === "awaiting-outcome" && objectiveResolutions === 1, "Objective adapter routes one exact approved outcome to its owner.");
    expectCode(function () { objectivePort.resolve("rejected"); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Resolved objective review rejects duplicate or crossed outcomes.");
    objectiveState = Object.freeze({ state: "active", reviewId: "agent_review_2", revision: 2, capabilityId: "set-opacity-v1", proposedValue: 51, outcome: null });
    check(objectivePort.invalidate() === true && objectivePort.invalidate() === false && objectivePort.getProjection().state === "inactive", "Objective adapter invalidation closes only the exact active review.");
    objectiveState = Object.freeze({ state: "active", reviewId: "agent_review_3", revision: 3, capabilityId: "set-opacity-v1", proposedValue: 52, outcome: null });
    check(objectivePort.getProjection().state === "active", "A fresh review identity remains available after prior invalidation.");
    check(!/confirm\(|\.run\(|ExecutionAdapter|Host|executeStep/.test(portModule.createObjectiveReviewRuntimePort.toString()), "Objective adapter has no confirmation, execution, Adapter, or Host seam.");
    console.log("PASS Vela ReviewRuntime seam: " + assertions + " assertions.");
}

run().catch(function (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
