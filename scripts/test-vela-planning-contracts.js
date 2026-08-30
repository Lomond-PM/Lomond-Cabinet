#!/usr/bin/env node
"use strict";

const assert = require("assert");
const p = require("../client/js/vela/velaPlanningContracts");

let assertions = 0;

function check(value, message) {
    assert.ok(value, message);
    assertions += 1;
}

function deepEqual(actual, expected, message) {
    assert.deepStrictEqual(actual, expected, message);
    assertions += 1;
}

function expectCode(fn, code, message) {
    let thrown = null;
    try { fn(); } catch (error) { thrown = error; }
    assert.ok(thrown && thrown.code === code, message || ("Expected code " + code + "; got " + (thrown && thrown.code)));
    assertions += 1;
}

function expectThrows(fn, message) {
    let thrown = false;
    try { fn(); } catch (error) { thrown = true; }
    assert.ok(thrown, message || "Expected an exception");
    assertions += 1;
}

function frozen(value) { return Object.isFrozen(value) || Object.isFrozen(value.freezeOption); }

// ---------------------------------------------------------------------------
// Baseline sanity: closed enums + taxonomy reference does not duplicate.
// ---------------------------------------------------------------------------
deepEqual(p.POLICY_DECISIONS, ["ALLOW", "REVIEW_REQUIRED", "DENY"], "PolicyDecision is a closed 3-value enum");
check(p.OPERATION_KINDS.indexOf("read") !== -1, "OPERATION_KINDS includes read");
check(p.OPERATION_KINDS.indexOf("create") !== -1, "OPERATION_KINDS includes create");
check(p.AUTHORITY_EVIDENCE_TYPES.indexOf("authority-evidence") !== -1, "AUTHORITY_EVIDENCE_TYPES closed");
check(p.TRUSTED_DECISION_SOURCES.indexOf("local-authority") !== -1, "trusted decision sources defined");
// If the session taxonomy is loadable, the contract references it (single source).
check(p.isAuthorityEvidenceKind("permission/decided") === true, "permission/decided is authority-evidence kind");
check(p.isAuthorityEvidenceKind("summary/created") === false, "derived summary is not authority-evidence kind");
check(p.isDerivedSessionKind("summary/created") === true, "summary/created is derived kind");

// ===========================================================================
// A. TaskPlan arbitrary model data cannot become executable.
// ===========================================================================
const taskPlan = p.createTaskPlan({ planId: "plan_task_1", taskId: "task_1", revision: 0, steps: [
    { stepId: "step_a", kind: "observe", rationale: "look" },
    { stepId: "step_b", kind: "operate", capabilityIntent: { intentId: "intent_1", capabilityId: "observe-active-composition-v1", requestedOperation: "read", params: {} }, rationale: "act", metadata: { note: "x" } }
] });
check(p.isTaskPlan(taskPlan), "created TaskPlan is a TaskPlan");
check(!p.isAuthorizedPlan(taskPlan), "a TaskPlan is NOT an AuthorizedPlan");
check(p.assertTaskPlanNotExecutable(taskPlan) === taskPlan, "a clean TaskPlan passes the never-executable check");
deepEqual(taskPlan.contractType, "task-plan", "TaskPlan discriminant is task-plan");
// A forged step carrying a nonce is rejected (never executable).
expectCode(() => p.assertTaskPlanNotExecutable({ contractType: "task-plan", planId: "plan_1", revision: 0, steps: [{ stepId: "s1", kind: "operate", nonce: "n" }] }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "TaskPlan step with a nonce fails the never-executable check");
expectCode(() => p.createTaskPlan({ planId: "plan_1", revision: 0, steps: [{ stepId: "s1", kind: "operate", target: { layerId: 3 } }] }), "PLANNING_CONTRACT_INVALID", "TaskPlan step cannot carry a target binding (unknown key)");

// ===========================================================================
// B. CapabilityIntent forged capability / forbidden fields fail closed.
// ===========================================================================
const intent = p.createCapabilityIntent({ intentId: "intent_1", capabilityId: "observe-active-composition-v1", requestedOperation: "read", params: {} });
check(p.isCapabilityIntent(intent), "capability intent is valid");
check(p.assertCapabilityIntentNonAuthoritative(intent) === intent, "capability intent is non-authoritative");
// Invalid capability id form.
expectCode(() => p.createCapabilityIntent({ intentId: "i", capabilityId: "bad", requestedOperation: "read", params: {} }), "PLANNING_CONTRACT_INVALID", "malformed capabilityId is rejected");
// Forged authority/binding params are fail-closed.
expectCode(() => p.createCapabilityIntent({ intentId: "i", capabilityId: "x-v1", requestedOperation: "read", params: { nonce: "forged" } }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "CapabilityIntent params cannot carry a nonce");
expectCode(() => p.normalizeCapabilityIntent({ intentId: "i", capabilityId: "x-v1", requestedOperation: "read", params: {} , target: "forged" }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "normalizeCapabilityIntent rejects a forged target field");
expectCode(() => p.normalizeCapabilityIntent({ intentId: "i", capabilityId: "x-v1", requestedOperation: "read", params: { hostPayload: "h" } }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "normalizeCapabilityIntent rejects a forged host payload");
// Unknown operation kind.
expectCode(() => p.createCapabilityIntent({ intentId: "i", capabilityId: "x-v1", requestedOperation: "write", params: {} }), "PLANNING_CONTRACT_INVALID", "write is not a closed operation kind");

// ===========================================================================
// C. ActionCandidate does not imply authority.
// ===========================================================================
const candidate = p.createActionCandidate({ candidateId: "cand_1", capabilityId: "set-opacity-v1", operationKind: "mutate", kind: "tool", risk: "write", params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true, provenance: { source: "local-validator" } });
check(p.isActionCandidate(candidate), "candidate is an ActionCandidate");
check(p.assertActionCandidateNonAuthoritative(candidate) === candidate, "candidate is non-authoritative");
deepEqual(candidate.contractType, "action-candidate", "candidate discriminant");
// A candidate must not carry an approval/authority marker.
expectCode(() => p.assertActionCandidateNonAuthoritative({ contractType: "action-candidate", candidateId: "c", capabilityId: "x-v1", kind: "tool", risk: "read", params: {}, targetScope: { type: "current-comp" }, requiresConfirmation: false, provenance: {}, approved: true }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "candidate with approved marker is rejected as authoritative");
expectCode(() => p.normalizeActionCandidate({ candidateId: "c", capabilityId: "x-v1", operationKind: "read", kind: "tool", risk: "read", params: {}, targetScope: { type: "current-comp" }, requiresConfirmation: false, policyDecision: "ALLOW" }), "PLANNING_CONTRACT_INVALID", "candidate cannot carry a policyDecision field");

// ===========================================================================
// D. AuthorizedPlan rejects trusted final binding / Host payload.
// ===========================================================================
function validAuthorized(stepOverrides) {
    return p.createAuthorizedPlan({ planId: "auth_1", revision: 0, steps: [Object.assign({
        candidateId: "cand_1", capabilityId: "set-opacity-v1", kind: "tool", risk: "write",
        params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" },
        requiresConfirmation: true,
        policyDecision: { decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "legacy-policy", provenance: { rule: "mutation" } },
        authorityEvidence: { eventKind: "permission/decided", seq: 7, requestId: "req_1", evidenceType: "authority-evidence" }
    }, stepOverrides || {})] });
}
const authPlan = validAuthorized();
check(p.isAuthorizedPlan(authPlan), "AuthorizedPlan created");
check(!p.isTaskPlan(authPlan), "an AuthorizedPlan is NOT a TaskPlan");
check(p.assertAuthorizedPlanNoTrustedBinding(authPlan) === authPlan, "clean AuthorizedPlan has no trusted binding");
const realisticIssuedAt = 1788020000000;
const delegatedPlan = validAuthorized({ grantProvenance: { grantId: "grant_realistic", capabilityFamily: "mutation", source: "local-user", issuedAt: realisticIssuedAt } });
check(delegatedPlan.steps[0].grantProvenance.issuedAt === realisticIssuedAt, "AuthorizedPlan accepts a realistic epoch-ms authority timestamp.");
[undefined, "1700000000000", NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].forEach((issuedAt) => expectCode(() => validAuthorized({ grantProvenance: { grantId: "grant_bad_time", capabilityFamily: "mutation", source: "local-user", issuedAt } }), "AUTHORITY_CONTRACT_INVALID", "AuthorizedPlan rejects a missing, malformed, negative, fractional, or unsafe issuedAt"));
check(validAuthorized({ grantProvenance: { grantId: "grant_zero_time", capabilityFamily: "mutation", source: "local-user", issuedAt: 0 } }).steps[0].grantProvenance.issuedAt === 0, "AuthorizedPlan accepts the canonical timestamp lower bound.");
check(validAuthorized({ grantProvenance: { grantId: "grant_max_time", capabilityFamily: "mutation", source: "local-user", issuedAt: Number.MAX_SAFE_INTEGER } }).steps[0].grantProvenance.issuedAt === Number.MAX_SAFE_INTEGER, "AuthorizedPlan accepts the canonical safe-integer timestamp upper bound.");
// params with a native binding is rejected.
expectCode(() => validAuthorized({ params: { opacity: 50, layerId: 3 } }), "AUTHORITY_CONTRACT_INVALID", "AuthorizedPlan params cannot carry a trusted native layerId");
// a step-level native binding is rejected.
expectCode(() => validAuthorized({ layerId: 3 }), "AUTHORITY_CONTRACT_INVALID", "AuthorizedPlan step cannot carry a native layerId");
// target scope with a native binding is rejected.
expectCode(() => p.createAuthorizedPlan({ planId: "x", revision: 0, steps: [{ candidateId: "c", capabilityId: "x-v1", kind: "tool", risk: "read", params: {}, targetScope: { type: "selected-layer", layerId: 3 }, requiresConfirmation: false }] }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "AuthorizedPlan targetScope cannot carry a native binding");
// Host payload is rejected.
expectCode(() => p.createAuthorizedPlan({ planId: "x", revision: 0, steps: [{ candidateId: "c", capabilityId: "x-v1", kind: "tool", risk: "read", params: {}, targetScope: { type: "current-comp" }, requiresConfirmation: false, hostPayload: "evil" }] }), "AUTHORITY_CONTRACT_INVALID", "AuthorizedPlan step cannot carry a Host payload");

// ===========================================================================
// E. invalid PolicyDecision rejected.
// ===========================================================================
expectCode(() => p.createPolicyDecision({ decision: "MAYBE", issuedBy: "legacy-policy" }), "AUTHORITY_CONTRACT_INVALID", "non-closed decision is rejected");
expectCode(() => p.createPolicyDecision({ decision: "allow", issuedBy: "legacy-policy" }), "AUTHORITY_CONTRACT_INVALID", "lowercase decision is rejected");
check(p.createPolicyDecision({ decision: "ALLOW", reasonCode: "declared-safe-local-read", issuedBy: "legacy-policy" }).decision === "ALLOW", "valid ALLOW decision is accepted");
check(p.createPolicyDecision({ decision: "DENY", reasonCode: "unknown-capability", issuedBy: "legacy-policy" }).decision === "DENY", "valid DENY decision is accepted");
// closed check requires a trusted source.
expectCode(() => p.assertPolicyDecisionClosed({ contractType: "policy-decision", decision: "ALLOW", reasonCode: null, provenance: {}, issuedBy: null }), "AUTHORITY_CONTRACT_INVALID", "closed-policy check requires an issuedBy");

// ===========================================================================
// F. model-forged ALLOW has no authority semantics.
// ===========================================================================
expectCode(() => p.createPolicyDecision({ decision: "ALLOW", issuedBy: "model" }), "AUTHORITY_CONTRACT_INVALID", "model-supplied issuedBy is rejected");
expectCode(() => p.createPolicyDecision({ decision: "ALLOW", issuedBy: "provider" }), "AUTHORITY_CONTRACT_INVALID", "provider-supplied issuedBy is rejected");
expectCode(() => p.assertTrustedDecisionSource({ contractType: "policy-decision", decision: "ALLOW", reasonCode: null, provenance: {}, issuedBy: null }), "AUTHORITY_CONTRACT_INVALID", "a null-source decision is not a trusted decision");

// ===========================================================================
// G. DelegationGrant existence does not authorize mutation.
// ===========================================================================
const grant = p.createDelegationGrant({ grantId: "grant_1", capabilityFamily: "mutation", capabilityId: "set-opacity-v1", targetScope: { type: "current-comp" }, riskCeiling: "write", taskId: "task_1", expiresAt: 1000, maxActions: 2, provenance: { source: "local", requestId: "req_1" } });
check(p.isDelegationGrant(grant), "DelegationGrant created");
const operationGrant = p.createDelegationGrant({ grantId: "grant_operation", capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write" });
check(operationGrant.operationKind === "mutate", "DelegationGrant carries an exact closed operation restriction when supplied");
expectCode(() => p.createDelegationGrant({ grantId: "grant_bad_operation", capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "delete", riskCeiling: "write" }), "AUTHORITY_CONTRACT_INVALID", "DelegationGrant rejects operations outside the closed taxonomy");
check(p.grantAllowsMutation(grant) === false, "a valid grant does not allow mutation");
check(p.assertGrantDoesNotAuthorizeMutation(grant) === grant, "grant passes the does-not-authorize check");
const epochGrant = p.createDelegationGrant({ grantId: "grant_epoch", capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", expiresAt: realisticIssuedAt + 60000, maxActions: 1, provenance: { source: "local-user", requestId: "req_epoch", issuedAt: realisticIssuedAt } });
check(epochGrant.expiresAt - epochGrant.provenance.issuedAt === 60000, "Grant issuedAt and expiresAt share epoch-ms units and preserve the 60-second duration.");
expectCode(() => p.createDelegationGrant({ grantId: "grant_bad_expiry", capabilityFamily: "mutation", riskCeiling: "write", expiresAt: realisticIssuedAt, provenance: { source: "local-user", requestId: "req_bad_expiry", issuedAt: realisticIssuedAt } }), "AUTHORITY_CONTRACT_INVALID", "Grant expiry must be strictly later than issuance");
check(p.legacyAuthorityPolicy({ capabilityId: "set-opacity-v1", requestedOperation: "mutate", capabilityKnown: true, paramsValid: true, operationSupported: true }).decision === "REVIEW_REQUIRED", "a mutation is still REVIEW_REQUIRED even when a grant exists");

// ===========================================================================
// H. DerivedEvent cannot become AuthorityEvidence.
// ===========================================================================
expectCode(() => p.createAuthorityEvidence({ eventKind: "summary/created", seq: 1, requestId: "req_1", evidenceType: "authority-evidence" }), "AUTHORITY_EVIDENCE_INVALID", "a derived event cannot be fabricated as authority evidence");
check(p.classifyAuthorityEvidence(p.createAuthorityEvidence({ eventKind: "summary/created", seq: 1, requestId: "req_1", evidenceType: "canonical-record" })) === "canonical-record", "derived classifies as canonical-record");
const authorityEvidence = p.createAuthorityEvidence({ eventKind: "permission/decided", seq: 7, requestId: "req_1", evidenceType: "authority-evidence" });
check(p.classifyAuthorityEvidence(authorityEvidence) === "authority-evidence", "whitelisted kind classifies as authority-evidence");
check(p.assertAuthorityEvidenceNotDerived(authorityEvidence) === authorityEvidence, "whitelisted authority evidence passes");
const factEvidence = p.createAuthorityEvidence({ eventKind: "user/message", seq: 1, requestId: "req_1", evidenceType: "evidentiary-fact" });
check(p.classifyAuthorityEvidence(factEvidence) === "evidentiary-fact", "a plain fact is an evidentiary fact, not authority evidence");

// ===========================================================================
// I. LegacyAuthorityPolicy: valid declared safe-local read/analyze → ALLOW.
// ===========================================================================
const allowDecision = p.legacyAuthorityPolicy({ capabilityId: "observe-active-composition-v1", requestedOperation: "read", risk: "read", capabilityKnown: true, paramsValid: true, operationSupported: true, declaredLocalScope: { capabilityId: "observe-active-composition-v1", scopeType: "current-project" }, targetScope: { type: "current-comp" } });
check(allowDecision.decision === "ALLOW", "declared safe-local read/analyze -> ALLOW");
check(allowDecision.issuedBy === "legacy-policy", "ALLOW produced by legacy-policy source");

// ===========================================================================
// J. risk="read" but undeclared / unknown scope → DENY.
// ===========================================================================
const jDecision = p.legacyAuthorityPolicy({ capabilityId: "some-reader-v1", requestedOperation: "read", risk: "read", capabilityKnown: true, paramsValid: true, operationSupported: true, declaredLocalScope: null, targetScope: { type: "current-comp" } });
check(jDecision.decision === "DENY", "risk=read without a declared scope -> DENY, never ALLOW");
const j2Decision = p.legacyAuthorityPolicy({ capabilityId: "some-reader-v1", requestedOperation: "read", risk: "read", capabilityKnown: true, paramsValid: true, operationSupported: true, declaredLocalScope: { capabilityId: "other-v1", scopeType: "current-project" }, targetScope: { type: "current-comp" } });
check(j2Decision.decision === "DENY", "declared scope for a different capability -> DENY");

// ===========================================================================
// K. mutation → REVIEW_REQUIRED.
// ===========================================================================
const kDecision = p.legacyAuthorityPolicy({ capabilityId: "set-opacity-v1", requestedOperation: "mutate", risk: "write", capabilityKnown: true, paramsValid: true, operationSupported: true });
check(kDecision.decision === "REVIEW_REQUIRED", "mutation -> REVIEW_REQUIRED");
const k2Decision = p.legacyAuthorityPolicy({ capabilityId: "set-opacity-v1", requestedOperation: "create", risk: "create", capabilityKnown: true, paramsValid: true, operationSupported: true });
check(k2Decision.decision === "REVIEW_REQUIRED", "create (mutation) -> REVIEW_REQUIRED");

// ===========================================================================
// L. unknown capability / unsupported operation → DENY.
// ===========================================================================
check(p.legacyAuthorityPolicy({ capabilityId: "unknown-v1", requestedOperation: "read", risk: "read", capabilityKnown: false, paramsValid: true, operationSupported: true }).decision === "DENY", "unknown capability -> DENY");
check(p.legacyAuthorityPolicy({ capabilityId: "x-v1", requestedOperation: "write", capabilityKnown: true, paramsValid: true, operationSupported: true }).decision === "DENY", "unsupported operation -> DENY");
check(p.legacyAuthorityPolicy({ capabilityId: "x-v1", requestedOperation: "read", capabilityKnown: true, paramsValid: false, operationSupported: true }).decision === "DENY", "invalid params -> DENY");

// ===========================================================================
// M. Immutable snapshots cannot be externally mutated.
// ===========================================================================
check(Object.isFrozen(taskPlan), "TaskPlan is deep-frozen");
check(Object.isFrozen(authPlan), "AuthorizedPlan is deep-frozen");
expectThrows(() => { taskPlan.steps.push({ stepId: "x", kind: "observe" }); }, "mutating a frozen TaskPlan throws");
expectThrows(() => { authPlan.planId = "changed"; }, "mutating a frozen AuthorizedPlan throws");
check(Object.isFrozen(p.snapshotTaskPlan(taskPlan)), "snapshotTaskPlan returns a frozen snapshot");
check(Object.isFrozen(p.snapshotAuthorizedPlan(authPlan)), "snapshotAuthorizedPlan returns a frozen snapshot");

// ===========================================================================
// N. revision / identity validation.
// ===========================================================================
expectCode(() => p.createTaskPlan({ planId: "bad space", revision: 0, steps: [] }), "PLANNING_CONTRACT_INVALID", "invalid planId is rejected");
expectCode(() => p.createTaskPlan({ planId: "plan_1", revision: -1, steps: [] }), "PLANNING_CONTRACT_INVALID", "negative revision is rejected");
expectCode(() => p.createTaskPlan({ planId: "plan_1", revision: 0, steps: {} }), "PLANNING_CONTRACT_INVALID", "non-array steps is rejected");
// identity helpers reuse the planning-contract structural code; authority
// semantics errors use the authority-contract code. Both fail closed.
expectCode(() => p.createAuthorizedPlan({ planId: "bad id", revision: 0, steps: [] }), "PLANNING_CONTRACT_INVALID", "invalid AuthorizedPlan id is rejected");

// ===========================================================================
// O. TaskPlan and AuthorizedPlan are structurally non-interchangeable.
// ===========================================================================
check(p.isTaskPlan(taskPlan) && !p.isAuthorizedPlan(taskPlan), "TaskPlan is not interchangeable with AuthorizedPlan");
check(p.isAuthorizedPlan(authPlan) && !p.isTaskPlan(authPlan), "AuthorizedPlan is not interchangeable with TaskPlan");
// A TaskPlan node kind is not a valid AuthorizedPlan invocation kind.
expectCode(() => p.createAuthorizedPlan({ planId: "x", revision: 0, steps: [{ candidateId: "c", capabilityId: "x-v1", kind: "observe", risk: "read", params: {}, targetScope: { type: "current-comp" }, requiresConfirmation: false }] }), "AUTHORITY_CONTRACT_INVALID", "AuthorizedPlan step rejects a TaskPlan node kind (observe)");
// An invocation kind is not a valid TaskPlan node kind.
expectCode(() => p.createTaskPlan({ planId: "plan_1", revision: 0, steps: [{ stepId: "s1", kind: "tool" }] }), "PLANNING_CONTRACT_INVALID", "TaskPlan step rejects an invocation kind (tool)");
// explicit non-interchangeable assertion passes for both.
check(p.assertNotInterchangeable(taskPlan) === taskPlan, "TaskPlan passes non-interchangeable assertion");
check(p.assertNotInterchangeable(authPlan) === authPlan, "AuthorizedPlan passes non-interchangeable assertion");

// ===========================================================================
// Negative: cloneJson must reject unsafe values and cycles.
// ===========================================================================
expectThrows(() => p.cloneJson({ a: undefined }, []), "cloneJson rejects undefined values");
expectThrows(() => { const c = {}; c.self = c; p.cloneJson(c, []); }, "cloneJson rejects reference cycles");
expectThrows(() => p.cloneJson(NaN, []), "cloneJson rejects NaN");
check(p.cloneJson([1, "a", { b: 2 }], []) && true, "cloneJson clones plain JSON");

console.log("test-vela-planning-contracts: " + assertions + " assertions passed");
