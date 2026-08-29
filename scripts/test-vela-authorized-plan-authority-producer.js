#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const planning = require("../client/js/vela/velaPlanningContracts");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");
const capabilityContracts = require("../client/js/vela/velaCapabilityContracts");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const storeModule = require("../client/js/vela/velaDelegationGrantStore");
const policyModule = require("../client/js/vela/velaDelegationPolicyEngine");
const evidenceModule = require("../client/js/vela/velaAuthorityEvidenceResolver");
const coordinatorModule = require("../client/js/vela/velaDelegationAuthorityCoordinator");
const producerModule = require("../client/js/vela/velaAuthorizedPlanAuthorityProducer");

let assertions = 0;
let serial = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function expectCode(fn, code, message) { assert.throws(fn, error => error && error.code === code, message); assertions += 1; }

const capabilityResolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilityContracts });
const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: capabilityResolver.resolveCapability, makeId() { return "candidate_" + (++serial); } });
function candidate(opacity) { return compiler.compile(planning.createCapabilityIntent({ intentId: "intent_" + (++serial), capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: opacity === undefined ? 50 : opacity } })); }
function grantSpec(requestId, overrides) { return Object.assign({ capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId: "task_1", expiresAt: 200, maxActions: 2, provenance: { source: "local-user", requestId, issuedAt: 100 } }, overrides || {}); }

function harness(options) {
    options = options || {};
    let clock = options.now === undefined ? 100 : options.now;
    const session = sessionRuntime.createSessionLog({ sessionId: options.sessionId || "session_" + (++serial) });
    const appender = sessionRuntime.createAuthorityEventAppender(session);
    const evidenceResolver = evidenceModule.createAuthorityEvidenceResolver({ session });
    const store = storeModule.createDelegationGrantStore({ now() { return clock; }, idFactory() { return "grant_" + String(++serial).padStart(4, "0"); } });
    const policyEngine = policyModule.createDelegationPolicyEngine({ grantStore: store, resolveCapability: capabilityResolver.resolveCapability, sessionId: session.getSessionId() });
    let planSerial = 0;
    const producer = producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine, grantStore: store, evidenceResolver, makePlanId() { planSerial += 1; return "authority_plan_" + planSerial; } });
    const coordinator = coordinatorModule.createDelegationAuthorityCoordinator({ grantStore: store, session, authorityAppender: appender, evidenceResolver, issuerId: "local-user" });
    function issue(requestId, overrides) {
        const permission = appender.append({ kind: "permission/decided", requestId, payload: { decision: "approved", issuedBy: "local-user", taskId: "task_1" } });
        const permissionEvidence = evidenceResolver.resolveEvidence({ sessionId: session.getSessionId(), seq: permission.seq, eventKind: permission.kind, requestId });
        return coordinator.issueGrant({ spec: grantSpec(requestId, overrides), permissionEvidence });
    }
    return { session, appender, evidenceResolver, store, policyEngine, producer, coordinator, issue, setNow(value) { clock = value; } };
}
function context(h, overrides) { return Object.assign({ sessionId: h.session.getSessionId(), taskId: "task_1" }, overrides || {}); }

function browserSmoke() {
    const sandbox = { Object, Error, Date, Map, WeakMap, WeakSet, Number, Boolean, String, Array, RegExp, JSON, Math, Uint8Array };
    sandbox.self = sandbox; sandbox.window = sandbox;
    ["velaSessionRuntime", "velaPlanningContracts", "velaCapabilityCompiler", "velaDelegationGrantStore", "velaDelegationPolicyEngine", "velaAuthorityEvidenceResolver", "velaAuthorizedPlanAuthorityProducer"].forEach(name => {
        vm.runInNewContext(fs.readFileSync(require.resolve("../client/js/vela/" + name), "utf8"), sandbox, { filename: name + ".js" });
    });
    check(typeof sandbox.VelaAuthorizedPlanAuthorityProducer.createAuthorizedPlanAuthorityProducer === "function", "CEP-like UMD producer registration works without loader wiring.");
}

function run() {
    const C = producerModule.ERROR_CODES;
    browserSmoke();
    const h = harness();
    const issued = h.issue("req_1");
    const trustedCandidate = candidate();
    const beforeStore = h.store.lookup(issued.grant.grant.grantId);
    const beforeEvents = h.session.getEvents().length;
    const candidateSnapshot = JSON.stringify(trustedCandidate);
    const evidenceSnapshot = JSON.stringify(issued.evidence);
    const plan = h.producer.produce({ candidate: trustedCandidate, context: context(h), delegationGrantedEvidence: issued.evidence });
    check(planning.isAuthorizedPlan(plan) && producerModule.isTrustedAuthorityProducedPlan(plan), "Exact trusted authority inputs produce a privately branded AuthorizedPlan.");
    check(Object.isFrozen(plan) && Object.isFrozen(plan.steps) && Object.isFrozen(plan.steps[0]), "Produced AuthorizedPlan is deeply immutable.");
    equal(plan.steps[0].policyDecision.decision, "ALLOW", "Plan preserves the freshly evaluated ALLOW advisory decision.");
    equal(plan.steps[0].grantProvenance.grantId, issued.grant.grant.grantId, "Plan preserves exact selected grant provenance.");
    equal(plan.steps[0].authorityEvidence.eventKind, "delegation/granted", "Plan carries the verified granted evidence reference.");
    planning.assertAuthorizedPlanNoTrustedBinding(plan); assertions += 1;
    check(!/layerId|nativeLayerId|propertyValueDigest|confirmationNonce|reservationId|hostPayload|executionArmed/.test(JSON.stringify(plan)), "Plan contains no native binding, CAS, nonce, reservation, Host payload, or TaskRun authority.");
    const afterStore = h.store.lookup(issued.grant.grant.grantId);
    equal(afterStore.remainingActions, beforeStore.remainingActions, "Production does not consume budget.");
    equal(afterStore.reservedActions, beforeStore.reservedActions, "Production does not reserve budget.");
    equal(afterStore.generation, beforeStore.generation, "Production does not mutate Store lifecycle.");
    equal(h.session.getEvents().length, beforeEvents, "Production appends no Session event.");
    equal(JSON.stringify(trustedCandidate), candidateSnapshot, "Production does not mutate the trusted candidate.");
    equal(JSON.stringify(issued.evidence), evidenceSnapshot, "Production does not mutate trusted Evidence.");

    const secondPlan = h.producer.produce({ candidate: trustedCandidate, context: context(h), delegationGrantedEvidence: issued.evidence });
    check(secondPlan.planId !== plan.planId && producerModule.isTrustedAuthorityProducedPlan(secondPlan), "Repeated production creates a fresh local plan identity without PlanStore ownership.");
    equal(h.store.lookup(issued.grant.grant.grantId).remainingActions, beforeStore.remainingActions, "Repeated production remains budget side-effect free.");
    check(!producerModule.isTrustedAuthorityProducedPlan(planning.snapshotAuthorizedPlan(plan)), "A copied plan loses producer-private identity.");

    const forgedDecision = planning.createPolicyDecision({ decision: "ALLOW", issuedBy: "local-authority", provenance: { rule: "fake", grantId: issued.grant.grant.grantId, candidateId: trustedCandidate.candidateId } });
    expectCode(() => h.producer.produce({ candidate: trustedCandidate, context: context(h), delegationGrantedEvidence: issued.evidence, policyDecision: forgedDecision }), C.AUTHORIZED_PLAN_PRODUCER_INVALID_INPUT, "Caller-supplied shape-valid ALLOW decision is rejected.");
    expectCode(() => h.producer.produce({ candidate: trustedCandidate, context: context(h), delegationGrantedEvidence: issued.evidence, policyDecision: plan.steps[0].policyDecision }), C.AUTHORIZED_PLAN_PRODUCER_INVALID_INPUT, "Copied real PolicyDecision is rejected rather than trusted by fields.");
    expectCode(() => h.producer.produce({ candidate: Object.assign({}, trustedCandidate), context: context(h), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_CANDIDATE_UNTRUSTED, "Forged/copied candidate is rejected.");
    expectCode(() => h.producer.produce({ candidate: trustedCandidate, context: context(h), delegationGrantedEvidence: issued.evidence, planId: "caller_plan" }), C.AUTHORIZED_PLAN_PRODUCER_INVALID_INPUT, "Caller cannot inject planId or authority revision.");
    expectCode(() => h.producer.produce({ candidate: Object.assign({}, trustedCandidate, { layerId: 9 }), context: context(h), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_CANDIDATE_UNTRUSTED, "Caller cannot inject native target binding.");

    const reviewHarness = harness();
    expectCode(() => reviewHarness.producer.produce({ candidate: candidate(), context: context(reviewHarness), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "No delegated grant preserves REVIEW_REQUIRED compatibility.");
    const deniedEngine = { evaluate() { return planning.createPolicyDecision({ decision: "DENY", issuedBy: "local-authority" }); } };
    expectCode(() => producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine: deniedEngine, grantStore: h.store, evidenceResolver: h.evidenceResolver, makePlanId() { return "x"; } }), C.AUTHORIZED_PLAN_PRODUCER_INVALID_OPTIONS, "Caller-created PolicyEngine cannot inject DENY or ALLOW decisions.");
    const unknownEngine = policyModule.createDelegationPolicyEngine({ grantStore: h.store, resolveCapability() { return null; }, sessionId: h.session.getSessionId() });
    const unknownProducer = producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine: unknownEngine, grantStore: h.store, evidenceResolver: h.evidenceResolver, makePlanId() { return "unknown_plan"; } });
    expectCode(() => unknownProducer.produce({ candidate: trustedCandidate, context: context(h), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_POLICY_DENIED, "Unknown capability resolution produces a trusted DENY and no AuthorizedPlan.");
    const mismatched = harness();
    expectCode(() => producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine: h.policyEngine, grantStore: mismatched.store, evidenceResolver: mismatched.evidenceResolver, makePlanId() { return "x"; } }), C.AUTHORIZED_PLAN_PRODUCER_INVALID_OPTIONS, "Trusted dependencies from different Store/Session ownership cannot be composed.");

    const revokedHarness = harness();
    const revokedIssue = revokedHarness.issue("req_revoke");
    const revokedCandidate = candidate();
    const oldAllow = revokedHarness.policyEngine.evaluate(revokedCandidate, context(revokedHarness));
    equal(oldAllow.decision, "ALLOW", "Pre-revoke evaluation is ALLOW.");
    revokedHarness.coordinator.revokeGrant({ grantId: revokedIssue.grant.grant.grantId, taskId: "task_1", requestId: "req_revoke_done" });
    expectCode(() => revokedHarness.producer.produce({ candidate: revokedCandidate, context: context(revokedHarness), delegationGrantedEvidence: revokedIssue.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "Revoke after ALLOW prevents plan production.");

    const expiryHarness = harness();
    const expiryIssue = expiryHarness.issue("req_expiry", { expiresAt: 110 });
    const expiryCandidate = candidate();
    equal(expiryHarness.policyEngine.evaluate(expiryCandidate, context(expiryHarness)).decision, "ALLOW", "Pre-expiry evaluation is ALLOW.");
    expiryHarness.setNow(110);
    expectCode(() => expiryHarness.producer.produce({ candidate: expiryCandidate, context: context(expiryHarness), delegationGrantedEvidence: expiryIssue.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "Expiry after ALLOW prevents plan production.");

    const budgetHarness = harness();
    const budgetIssue = budgetHarness.issue("req_budget", { maxActions: 1 });
    const budgetCandidate = candidate();
    equal(budgetHarness.policyEngine.evaluate(budgetCandidate, context(budgetHarness)).decision, "ALLOW", "Pre-consumption evaluation is ALLOW.");
    budgetHarness.store.consume(budgetHarness.store.reserve(budgetIssue.grant.grant.grantId));
    expectCode(() => budgetHarness.producer.produce({ candidate: budgetCandidate, context: context(budgetHarness), delegationGrantedEvidence: budgetIssue.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "Budget consumed elsewhere prevents plan production.");

    expectCode(() => h.producer.produce({ candidate: candidate(), context: context(h, { sessionId: "wrong_session" }), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_CORRELATION_FAILED, "Wrong Session correlation is rejected.");
    expectCode(() => h.producer.produce({ candidate: candidate(), context: context(h, { taskId: "wrong_task" }), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "Wrong task cannot obtain delegated ALLOW.");
    expectCode(() => h.producer.produce({ candidate: candidate(), context: context(h), delegationGrantedEvidence: Object.assign({}, issued.evidence) }), C.AUTHORIZED_PLAN_EVIDENCE_INVALID, "Copied Evidence is rejected.");
    const other = harness();
    const otherIssue = other.issue("req_other");
    expectCode(() => h.producer.produce({ candidate: candidate(), context: context(h), delegationGrantedEvidence: otherIssue.evidence }), C.AUTHORIZED_PLAN_EVIDENCE_INVALID, "Evidence from another Resolver/Session is rejected.");

    function expectGrantedPayloadMismatch(label, payloadOverride) {
        const mismatch = harness();
        const directGrant = mismatch.store.issue(grantSpec("req_" + label));
        const permission = mismatch.appender.append({ kind: "permission/decided", requestId: "req_" + label, payload: { decision: "approved", issuedBy: "local-user", taskId: "task_1" } });
        const payload = Object.assign({ grantId: directGrant.grant.grantId, taskId: "task_1", capabilityId: "set-opacity-v1", operationKind: "mutate", scopeType: "selected-layer", issuedBy: "local-user", permissionSeq: permission.seq }, payloadOverride);
        const event = mismatch.appender.append({ kind: "delegation/granted", requestId: "req_" + label, payload });
        const mismatchEvidence = mismatch.evidenceResolver.resolveEvidence({ sessionId: mismatch.session.getSessionId(), seq: event.seq, eventKind: event.kind, requestId: event.requestId });
        expectCode(() => mismatch.producer.produce({ candidate: candidate(), context: context(mismatch), delegationGrantedEvidence: mismatchEvidence }), C.AUTHORIZED_PLAN_CORRELATION_FAILED, label + " granted-event correlation is rejected.");
    }
    expectGrantedPayloadMismatch("capability_mismatch", { capabilityId: "other-capability-v1" });
    expectGrantedPayloadMismatch("operation_mismatch", { operationKind: "read" });
    expectGrantedPayloadMismatch("scope_mismatch", { scopeType: "current-comp" });

    const multiple = harness();
    const grantA = multiple.issue("req_a");
    const grantB = multiple.issue("req_b");
    const multipleCandidate = candidate();
    const selected = multiple.policyEngine.evaluate(multipleCandidate, context(multiple));
    equal(selected.provenance.grantId, grantA.grant.grant.grantId, "PolicyEngine deterministically selects grant A.");
    expectCode(() => multiple.producer.produce({ candidate: multipleCandidate, context: context(multiple), delegationGrantedEvidence: grantB.evidence }), C.AUTHORIZED_PLAN_EVIDENCE_INVALID, "Decision grant A cannot use evidence grant B.");
    multiple.coordinator.revokeGrant({ grantId: grantA.grant.grant.grantId, taskId: "task_1", requestId: "req_a_revoke" });
    expectCode(() => multiple.producer.produce({ candidate: multipleCandidate, context: context(multiple), delegationGrantedEvidence: grantA.evidence }), C.AUTHORIZED_PLAN_EVIDENCE_INVALID, "Fresh re-evaluation may select B but cannot silently substitute B for evidence A.");

    const reset = harness();
    const resetIssue = reset.issue("req_reset");
    const resetCandidate = candidate();
    reset.store.resetSession();
    expectCode(() => reset.producer.produce({ candidate: resetCandidate, context: context(reset), delegationGrantedEvidence: resetIssue.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "Store reset after decision prevents production.");
    const suspended = harness();
    const suspendedIssue = suspended.issue("req_suspend");
    suspended.store.suspend();
    expectCode(() => suspended.producer.produce({ candidate: candidate(), context: context(suspended), delegationGrantedEvidence: suspendedIssue.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "Store suspend after decision prevents production.");
    const reloadedStore = storeModule.createDelegationGrantStore({ now() { return 100; } });
    const reloadedPolicy = policyModule.createDelegationPolicyEngine({ grantStore: reloadedStore, resolveCapability: capabilityResolver.resolveCapability, sessionId: h.session.getSessionId() });
    const reloadedProducer = producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine: reloadedPolicy, grantStore: reloadedStore, evidenceResolver: h.evidenceResolver, makePlanId() { return "reload_plan"; } });
    expectCode(() => reloadedProducer.produce({ candidate: candidate(), context: context(h), delegationGrantedEvidence: issued.evidence }), C.AUTHORIZED_PLAN_REVIEW_REQUIRED, "New/reloaded Store cannot use old decision or evidence.");

    const badPermission = harness();
    const directGrant = badPermission.store.issue(grantSpec("req_bad_permission"));
    const wrongPermission = badPermission.appender.append({ kind: "permission/decided", requestId: "req_bad_permission", payload: { decision: "denied", issuedBy: "local-user", taskId: "task_1" } });
    const forgedGranted = badPermission.appender.append({ kind: "delegation/granted", requestId: "req_bad_permission", payload: { grantId: directGrant.grant.grantId, taskId: "task_1", capabilityId: "set-opacity-v1", operationKind: "mutate", scopeType: "selected-layer", issuedBy: "local-user", permissionSeq: wrongPermission.seq } });
    const forgedGrantedEvidence = badPermission.evidenceResolver.resolveEvidence({ sessionId: badPermission.session.getSessionId(), seq: forgedGranted.seq, eventKind: forgedGranted.kind, requestId: forgedGranted.requestId });
    expectCode(() => badPermission.producer.produce({ candidate: candidate(), context: context(badPermission), delegationGrantedEvidence: forgedGrantedEvidence }), C.AUTHORIZED_PLAN_CORRELATION_FAILED, "Mismatched denied permission provenance is rejected.");

    const stablePlanHarness = harness();
    const stableIssue = stablePlanHarness.issue("req_stable");
    const stablePlan = stablePlanHarness.producer.produce({ candidate: candidate(), context: context(stablePlanHarness), delegationGrantedEvidence: stableIssue.evidence });
    stablePlanHarness.coordinator.revokeGrant({ grantId: stableIssue.grant.grant.grantId, taskId: "task_1", requestId: "req_stable_revoke" });
    check(Object.isFrozen(stablePlan) && producerModule.isTrustedAuthorityProducedPlan(stablePlan), "Produced plan remains immutable historical intent after revoke.");
    equal(stablePlanHarness.policyEngine.evaluate(candidate(), context(stablePlanHarness)).decision, "REVIEW_REQUIRED", "Plan Evidence cannot restore revoked authority.");

    const disposed = harness();
    const disposedIssue = disposed.issue("req_disposed");
    disposed.store.dispose();
    expectCode(() => disposed.producer.produce({ candidate: candidate(), context: context(disposed), delegationGrantedEvidence: disposedIssue.evidence }), C.AUTHORIZED_PLAN_POLICY_DENIED, "Disposed Store dependency fails closed.");
    const closedSession = harness();
    const closedIssue = closedSession.issue("req_closed_session");
    closedSession.session.close();
    expectCode(() => closedSession.producer.produce({ candidate: candidate(), context: context(closedSession), delegationGrantedEvidence: closedIssue.evidence }), C.AUTHORIZED_PLAN_EVIDENCE_INVALID, "Closed Session/EvidenceResolver dependency fails closed.");

    console.log("PASS Vela AuthorizedPlan Authority Producer: " + assertions + " assertions.");
}

run();
