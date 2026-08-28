#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const planning = require("../client/js/vela/velaPlanningContracts");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const moduleApi = require("../client/js/vela/velaAuthorizedPlanMaterializer");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
let assertions = 0;
let executionCounter = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, codes, message) { codes = Array.isArray(codes) ? codes : [codes]; await assert.rejects(Promise.resolve(value), function (error) { return error && codes.indexOf(error.code) !== -1; }, message); assertions += 1; }

function browserSmoke() {
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaAuthorizedPlanMaterializer"), "utf8");
    const moduleSentinel = { exports: { untouched: true } };
    const sandbox = { Object, Error, Promise, module: moduleSentinel, require() { throw new Error("browser path called require"); } };
    sandbox.self = sandbox; sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: "velaAuthorizedPlanMaterializer.js" });
    check(typeof sandbox.VelaAuthorizedPlanMaterializer.createAuthorizedPlanMaterializer === "function", "Browser-global materializer registration works.");
    check(moduleSentinel.exports.untouched === true, "CEP-like browser identity wins over ambient CommonJS descriptors.");
}

function policy(decision, issuedBy) { return { decision, reasonCode: "mutation", issuedBy: issuedBy || "legacy-policy", provenance: { rule: "mutation", capabilityId: "set-opacity-v1", requestedOperation: "mutate" } }; }
function step(index, overrides) {
    return Object.assign({ candidateId: "authority_cand_" + index, capabilityId: "set-opacity-v1", kind: "tool", risk: "write", params: { opacity: 10 + index }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true, policyDecision: policy("REVIEW_REQUIRED") }, overrides || {});
}
function authorized(count, stepOverrides) { return planning.createAuthorizedPlan({ planId: "authority_plan_" + (++executionCounter), revision: executionCounter, steps: Array.from({ length: count }, function (_, index) { return step(index + 1, stepOverrides); }) }); }

function harness() {
    const calls = [];
    const preflight = { createBoundPlan(input) {
        calls.push(input);
        const number = ++executionCounter;
        return Promise.resolve({ planId: "execution_plan_" + number, planRevision: number, actionCount: input.steps.length, review: { valueKind: "number", beforeValue: 100 }, candidateIds: input.steps.map(function (_, index) { return "execution_cand_" + number + "_" + index; }) });
    } };
    return { calls, materializer: moduleApi.createAuthorizedPlanMaterializer({ protocol, planningContracts: planning, capabilityContracts: capabilities, preflight }) };
}

async function run() {
    check(typeof moduleApi.createAuthorizedPlanMaterializer === "function", "Node/CommonJS import works.");
    browserSmoke();
    const oneHarness = harness();
    const onePlan = authorized(1);
    const one = await oneHarness.materializer.materialize(onePlan, { selectionOrderMeaningful: true });
    check(one.actionCount === 1 && Object.isFrozen(one), "One-step AuthorizedPlan materializes to an immutable envelope.");
    check(one.authorizedPlanId === onePlan.planId && one.executionPlanId !== onePlan.planId, "Authority and execution plan identities remain distinct.");
    check(one.authorityCandidateIds[0] === onePlan.steps[0].candidateId && one.authorityCandidateIds[0] !== "execution_cand_" + one.executionPlanRevision + "_0", "Authority candidate identity is preserved as provenance and never reused for execution identity.");
    check(oneHarness.calls.length === 1 && oneHarness.calls[0].steps[0].targetScope.type === "selected-layer", "Semantic selected-layer scope is preserved.");
    check(!/layerId|nativeLayerId|propertyValueDigest|confirmationNonce/.test(JSON.stringify(oneHarness.calls[0])), "Materialization creates no native binding, CAS digest, or nonce.");

    const twoHarness = harness();
    const twoPlan = authorized(2);
    const two = await twoHarness.materializer.materialize(twoPlan, { selectionOrderMeaningful: true });
    check(two.actionCount === 2 && two.authorityCandidateIds.join(",") === twoPlan.steps.map(function (item) { return item.candidateId; }).join(","), "Two-step authority ordering maps stably to execution ordering.");
    const eightHarness = harness();
    check((await eightHarness.materializer.materialize(authorized(8), { selectionOrderMeaningful: true })).actionCount === 8, "Eight-step boundary is accepted.");

    const invalidHarness = harness();
    await expectCode(invalidHarness.materializer.materialize(Object.freeze({ contractType: "authorized-plan", planId: "bad", revision: 0, steps: "bad" }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Invalid AuthorizedPlan is rejected.");
    const taskPlan = planning.createTaskPlan({ planId: "task_plan", revision: 0, steps: [{ stepId: "step_1", kind: "observe" }] });
    await expectCode(invalidHarness.materializer.materialize(taskPlan, { selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "TaskPlan is rejected.");
    const rawCandidate = planning.createActionCandidate({ candidateId: "raw_cand", capabilityId: "set-opacity-v1", operationKind: "mutate", kind: "tool", risk: "write", params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true });
    await expectCode(invalidHarness.materializer.materialize(rawCandidate, { selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Raw ActionCandidate is rejected.");
    const forgedBinding = Object.freeze({ contractType: "authorized-plan", planId: "forged", revision: 0, steps: Object.freeze([Object.freeze(Object.assign({}, step(1), { layerId: "native" }))]) });
    await expectCode(invalidHarness.materializer.materialize(forgedBinding, { selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Trusted native binding in an AuthorizedPlan is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { capabilityId: "missing-v1" }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Unregistered capability is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { params: { opacity: 101 } }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Invalid params are rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { kind: "script" }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PERMISSION_DENIED, "Forged kind is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { risk: "read" }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PERMISSION_DENIED, "Forged risk is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { requiresConfirmation: false }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PERMISSION_DENIED, "Forged confirmation requirement is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { policyDecision: undefined }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PERMISSION_DENIED, "Missing policy decision is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { policyDecision: policy("DENY") }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PERMISSION_DENIED, "DENY is rejected.");
    await expectCode(invalidHarness.materializer.materialize(authorized(1, { policyDecision: policy("ALLOW") }), { selectionOrderMeaningful: true }), protocol.ERROR_CODES.PERMISSION_DENIED, "Mutation ALLOW is rejected.");
    check((await invalidHarness.materializer.materialize(authorized(1, { policyDecision: policy("REVIEW_REQUIRED", "local-authority") }), { selectionOrderMeaningful: true })).actionCount === 1, "Trusted local REVIEW_REQUIRED is accepted.");
    assert.throws(function () { authorized(1, { policyDecision: policy("REVIEW_REQUIRED", "model") }); }, function (error) { return error && error.code === planning.ERROR_CODES.AUTHORITY_CONTRACT_INVALID; }, "Model/provider-issued decisions cannot form an AuthorizedPlan."); assertions += 1;
    check(invalidHarness.calls.length === 1, "Rejected materializations mint no execution plan, nonce, reservation, or execution.");
    console.log("PASS Vela AuthorizedPlan materializer: " + assertions + " assertions.");
}

run().catch(function (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
