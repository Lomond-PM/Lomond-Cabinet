#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const planning = require("../client/js/vela/velaPlanningContracts");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const moduleApi = require("../client/js/vela/velaPlanReviewProjection");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const projector = moduleApi.createPlanReviewProjection({ protocol, planningContracts: planning, capabilityContracts: capabilities });
let assertions = 0;
let serial = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectCode(fn, codes, message) { codes = Array.isArray(codes) ? codes : [codes]; assert.throws(fn, function (error) { return error && codes.indexOf(error.code) !== -1; }, message); assertions += 1; }
function policy(decision, issuedBy) { return { decision: decision || "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: issuedBy || "legacy-policy", provenance: { rule: "mutation", capabilityId: "set-opacity-v1", requestedOperation: "mutate" } }; }
function step(number, opacity, overrides) { return Object.assign({ candidateId: "authority_cand_" + number, capabilityId: "set-opacity-v1", kind: "tool", risk: "write", params: { opacity }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true, policyDecision: policy() }, overrides || {}); }
function authorized(opacities, overrides) { const number = ++serial; return planning.createAuthorizedPlan({ planId: "authority_plan_" + number, revision: number, steps: opacities.map(function (opacity, index) { return step(number + "_" + index, opacity, overrides); }) }); }
function materialized(plan, overrides) { return Object.freeze(Object.assign({ authorizedPlanId: plan.planId, authorizedPlanRevision: plan.revision, authorityCandidateIds: Object.freeze(plan.steps.map(function (item) { return item.candidateId; })), executionPlanId: "execution_plan_" + serial, executionPlanRevision: 1, actionCount: plan.steps.length, review: Object.freeze({ valueKind: "number", beforeValue: 100 }) }, overrides || {})); }
function project(opacities) { const plan = authorized(opacities); return projector.project(plan, materialized(plan)); }
function walk(value, visit, seen) { if (!value || typeof value !== "object" || seen.indexOf(value) !== -1) return; seen.push(value); Object.getOwnPropertyNames(value).forEach(function (key) { visit(value, key, Object.getOwnPropertyDescriptor(value, key)); walk(value[key], visit, seen); }); }
function deepFrozen(value) { let result = true; walk(value, function (owner) { if (!Object.isFrozen(owner)) result = false; }, []); return result; }

function browserSmoke() {
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaPlanReviewProjection"), "utf8");
    const moduleSentinel = { exports: { untouched: true } };
    let requireCalls = 0;
    const sandbox = { Object, Error, module: moduleSentinel, require() { requireCalls += 1; throw new Error("browser path called require"); } };
    sandbox.self = sandbox; sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: "velaPlanReviewProjection.js" });
    check(typeof sandbox.VelaPlanReviewProjection.createPlanReviewProjection === "function", "Browser-global projector registration works.");
    check(requireCalls === 0 && moduleSentinel.exports.untouched === true, "CEP browser identity wins without require or module.exports mutation.");
}

function run() {
    check(typeof moduleApi.createPlanReviewProjection === "function", "Node/CommonJS import works.");
    browserSmoke();
    const one = project([50]);
    check(one.projectionType === "plan-review" && one.stepCount === 1 && one.steps[0].parameters[0].value === 50, "One-step semantic projection is exact.");
    const two = project([50, 25]);
    check(two.stepCount === 2 && two.steps.map(function (item) { return item.parameters[0].value; }).join(",") === "50,25", "Two-step projection preserves AuthorizedPlan order.");
    const eight = project([10, 20, 30, 40, 50, 60, 70, 80]);
    check(eight.stepCount === 8 && eight.steps.every(function (item, index) { return item.index === index; }), "Eight-step projection preserves exact indices.");
    const revisionPlan = authorized([33]); const revisionProjection = projector.project(revisionPlan, materialized(revisionPlan));
    check(revisionProjection.revision === revisionPlan.revision, "Projection retains exact AuthorizedPlan revision.");
    const relationBase = authorized([44]); const relationStep = relationBase.steps[0];
    const relationPlan = planning.createAuthorizedPlan({ planId: "authority_relation", revision: 0, steps: [Object.assign({}, relationStep, { policyDecision: { decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "local-authority", provenance: { rule: "mutation", capabilityId: "set-opacity-v1", requestedOperation: "mutate", candidateId: relationStep.candidateId } } })] });
    check(projector.project(relationPlan, materialized(relationPlan)).stepCount === 1, "Matching PolicyDecision candidate provenance is canonical and projectable.");
    const mismatchPlan = planning.createAuthorizedPlan({ planId: "authority_relation_bad", revision: 0, steps: [Object.assign({}, relationStep, { policyDecision: { decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "local-authority", provenance: { rule: "mutation", capabilityId: "set-opacity-v1", requestedOperation: "mutate", candidateId: "different_candidate" } } })] });
    expectCode(function () { projector.project(mismatchPlan, materialized(mismatchPlan)); }, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Mismatched PolicyDecision candidate provenance fails closed.");

    const pair = authorized([20, 30]);
    expectCode(function () { projector.project(pair, materialized(pair, { authorizedPlanId: "authority_plan_other" })); }, protocol.ERROR_CODES.PLAN_INVALID, "Mismatched AuthorizedPlan identity is rejected.");
    expectCode(function () { projector.project(pair, materialized(pair, { authorizedPlanRevision: pair.revision + 1 })); }, protocol.ERROR_CODES.PLAN_INVALID, "Mismatched revision is rejected.");
    expectCode(function () { projector.project(pair, materialized(pair, { actionCount: 1 })); }, protocol.ERROR_CODES.PLAN_INVALID, "Mismatched action count is rejected.");
    expectCode(function () { projector.project(pair, materialized(pair, { authorityCandidateIds: Object.freeze([pair.steps[0].candidateId]) })); }, protocol.ERROR_CODES.PLAN_INVALID, "Mismatched candidate count is rejected.");
    expectCode(function () { projector.project(pair, materialized(pair, { authorityCandidateIds: Object.freeze([pair.steps[1].candidateId, pair.steps[0].candidateId]) })); }, protocol.ERROR_CODES.PLAN_INVALID, "Mismatched candidate order is rejected.");

    check(deepFrozen(two) && Object.isFrozen(two.steps) && Object.isFrozen(two.steps[0].target) && Object.isFrozen(two.steps[0].parameters) && Object.isFrozen(two.steps[0].risk) && Object.isFrozen(two.steps[0].before), "Projection and every nested review value are immutable.");
    check(one.steps[0].capabilityLabelKey === moduleApi.LABEL_KEYS.capabilities["set-opacity-v1"] && one.steps[0].target.labelKey === moduleApi.LABEL_KEYS.targets["selected-layer"] && one.steps[0].parameters[0].labelKey === moduleApi.LABEL_KEYS.parameters.opacity && one.steps[0].risk.labelKey === moduleApi.LABEL_KEYS.risks.write, "Closed explicit label mappings cover capability, target, parameter, and risk.");
    check(one.steps[0].capabilityLabelKey !== "vela.capability.set-opacity-v1" && !/\+\s*capabilityId/.test(fs.readFileSync(require.resolve("../client/js/vela/velaPlanReviewProjection"), "utf8")), "Capability labels are not synthesized dynamically.");
    check(one.steps[0].parameters[0].key === "opacity" && one.steps[0].parameters[0].unit === "percent", "Opacity is rebuilt with canonical percent metadata.");
    check(Object.keys(one.steps[0].target).join(",") === "scopeType,labelKey" && Object.keys(one.steps[0]).indexOf("targetScope") === -1 && Object.keys(one.steps[0]).indexOf("params") === -1, "Raw targetScope and params are not passed through.");
    check(two.confirmationScope === "entire-plan" && two.requiresConfirmation === true && two.steps.every(function (item) { return item.requiresConfirmation === true && item.risk.level === "write"; }), "Whole-plan and per-step confirmation semantics are closed.");
    check(two.steps[0].before.source === "observed" && two.steps[0].before.valueKind === "number" && two.steps[0].before.value === 100, "Only step zero carries the review-time observation.");
    check(Object.keys(two.steps[1].before).join(",") === "source" && two.steps[1].before.source === "execution-time" && two.steps[1].before.value === undefined, "Future before values remain execution-time unknown and non-speculative.");

    expectCode(function () { const p = authorized([50], { capabilityId: "unknown-v1" }); projector.project(p, materialized(p)); }, protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Unsupported capability is rejected.");
    expectCode(function () { const p = authorized([50], { targetScope: { type: "current-comp" } }); projector.project(p, materialized(p)); }, protocol.ERROR_CODES.PERMISSION_DENIED, "Unsupported scope is rejected.");
    expectCode(function () { const p = authorized([50], { risk: "read" }); projector.project(p, materialized(p)); }, protocol.ERROR_CODES.PERMISSION_DENIED, "Unsupported risk is rejected.");
    expectCode(function () { const p = authorized([50], { policyDecision: undefined }); projector.project(p, materialized(p)); }, protocol.ERROR_CODES.PERMISSION_DENIED, "Missing REVIEW_REQUIRED policy is rejected.");
    expectCode(function () { const p = authorized([50], { policyDecision: policy("DENY") }); projector.project(p, materialized(p)); }, protocol.ERROR_CODES.PERMISSION_DENIED, "Non-review policy is rejected.");

    const forbidden = /^(layerId|nativeLayerId|layerIndex|layerIds|compId|itemId|propertyValueDigest|confirmationNonce|reservationId|replayKey|executionArmed|sessionId|authorizedPlanId|executionPlanId|taskRunId|candidateId|authorityCandidateIds|capture|bindingCapture|valueCapture|fingerprint|permissionSnapshot|settingsFingerprint|policyDecision|authorityEvidence|grantProvenance|undoGroupLabel)$/;
    let forbiddenFound = false; let unsafeFound = false;
    walk(eight, function (owner, key, descriptor) { if (forbidden.test(key)) forbiddenFound = true; if (descriptor.get || descriptor.set || typeof descriptor.value === "function") unsafeFound = true; }, []);
    check(!forbiddenFound, "Projection contains no execution, candidate, binding, nonce, CAS, policy, or provenance field.");
    check(!unsafeFound && JSON.parse(JSON.stringify(eight)).projectionType === "plan-review", "Projection is plain JSON-like data without functions or accessors.");
    check(one.steps[0].before.value === 100 && one.steps[0].parameters[0].value === 50, "Single-step projection retains legacy observed-before and declared-target facts.");
    const lifecyclePlan = authorized([50]); const lifecycleMaterialized = materialized(lifecyclePlan); const beforeJson = JSON.stringify(lifecycleMaterialized);
    projector.project(lifecyclePlan, lifecycleMaterialized);
    check(JSON.stringify(lifecycleMaterialized) === beforeJson, "Projection causes no confirmation, execution, or lifecycle mutation.");

    const rawStep = { candidateId: "raw", capabilityId: "set-opacity-v1" };
    expectCode(function () { projector.project({ contractType: "authorized-plan", planId: "fake", revision: 1, steps: [rawStep] }, materialized(pair)); }, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Plain object masquerading as AuthorizedPlan is rejected.");
    console.log("PASS Vela PlanReviewProjection: " + assertions + " assertions.");
}

run();
