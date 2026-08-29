#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const planning = require("../client/js/vela/velaPlanningContracts");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const storeModule = require("../client/js/vela/velaDelegationGrantStore");
const policyModule = require("../client/js/vela/velaDelegationPolicyEngine");
const evidenceModule = require("../client/js/vela/velaAuthorityEvidenceResolver");
const coordinatorModule = require("../client/js/vela/velaDelegationAuthorityCoordinator");
const producerModule = require("../client/js/vela/velaAuthorizedPlanAuthorityProducer");
const gateModule = require("../client/js/vela/velaAuthorityActivationGate");

let assertions = 0;
let serial = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function expectCode(fn, code, message) { assert.throws(fn, error => error && error.code === code, message); assertions += 1; }

const resolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilities });
const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: resolver.resolveCapability, makeId() { return "candidate_" + (++serial); } });
function candidate(value) { return compiler.compile(planning.createCapabilityIntent({ intentId: "intent_" + (++serial), capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: value || 50 } })); }

function harness(options) {
    options = options || {};
    let now = options.now || 100;
    const session = sessionRuntime.createSessionLog({ sessionId: options.sessionId || "session_" + (++serial) });
    const appender = sessionRuntime.createAuthorityEventAppender(session);
    const evidenceResolver = evidenceModule.createAuthorityEvidenceResolver({ session });
    const store = storeModule.createDelegationGrantStore({ now() { return now; }, idFactory() { return options.grantId || "grant_" + (++serial); } });
    const policyEngine = policyModule.createDelegationPolicyEngine({ grantStore: store, resolveCapability: resolver.resolveCapability, sessionId: session.getSessionId() });
    let planId = 0;
    const producer = producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine, grantStore: store, evidenceResolver, makePlanId() { return "plan_" + (++planId); } });
    let activationId = 0;
    const gate = gateModule.createAuthorityActivationGate({ producer, grantStore: store, sessionId: session.getSessionId(), makeActivationId() { return "activation_" + (++activationId); } });
    const coordinator = coordinatorModule.createDelegationAuthorityCoordinator({ grantStore: store, session, authorityAppender: appender, evidenceResolver, issuerId: "local-user" });
    function issue(requestId, maxActions, taskId) {
        taskId = taskId === undefined ? "task_1" : taskId;
        const permission = appender.append({ kind: "permission/decided", requestId, payload: { decision: "approved", issuedBy: "local-user", taskId } });
        const permissionEvidence = evidenceResolver.resolveEvidence({ sessionId: session.getSessionId(), seq: permission.seq, eventKind: permission.kind, requestId });
        return coordinator.issueGrant({ spec: { capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId, expiresAt: 200, maxActions: maxActions === undefined ? 2 : maxActions, provenance: { source: "local-user", requestId, issuedAt: 100 } }, permissionEvidence });
    }
    function produce(issued, value, taskId) { return producer.produce({ candidate: candidate(value), context: { sessionId: session.getSessionId(), taskId: taskId === undefined ? "task_1" : taskId }, delegationGrantedEvidence: issued.evidence }); }
    return { session, store, producer, gate, coordinator, issue, produce, setNow(value) { now = value; } };
}

function browserSmoke() {
    const sandbox = { Object, Error, Date, Map, WeakMap, WeakSet, Number, Boolean, String, Array, RegExp, JSON, Math, Uint8Array };
    sandbox.self = sandbox; sandbox.window = sandbox;
    ["velaSessionRuntime", "velaPlanningContracts", "velaCapabilityCompiler", "velaDelegationGrantStore", "velaDelegationPolicyEngine", "velaAuthorityEvidenceResolver", "velaAuthorizedPlanAuthorityProducer", "velaAuthorityActivationGate"].forEach(name => vm.runInNewContext(fs.readFileSync(require.resolve("../client/js/vela/" + name), "utf8"), sandbox, { filename: name + ".js" }));
    check(typeof sandbox.VelaAuthorityActivationGate.createAuthorityActivationGate === "function", "CEP-like UMD Gate registration works without production loader wiring.");
}

function run() {
    const C = gateModule.ERROR_CODES;
    browserSmoke();
    const h = harness();
    const issued = h.issue("req_main", 2);
    const plan = h.produce(issued);
    const eventsBefore = h.session.getEvents().length;
    const planBefore = JSON.stringify(plan);
    const activation = h.gate.reserve(plan);
    check(gateModule.isTrustedAuthorityActivationGate(h.gate), "Factory Gate has module-private identity.");
    check(gateModule.isTrustedActivationReservation(activation), "Reservation has module-private identity.");
    check(Object.isFrozen(activation) && activation.contractType === "authority-activation-reservation", "Reservation projection is immutable and narrowly named.");
    equal(activation.planId, plan.planId, "Reservation correlates exact plan.");
    equal(activation.grantId, issued.grant.grant.grantId, "Reservation correlates exact grant.");
    check(!/nonce|binding|hostPayload|storeReservation|execution/i.test(JSON.stringify(activation).replace("authority-activation-reservation", "")), "Projection exposes no raw Store handle or execution data.");
    equal(h.store.lookup(activation.grantId).reservedActions, 1, "reserve delegates one atomic budget slot to Store.");
    equal(h.session.getEvents().length, eventsBefore, "reserve appends no Session event.");
    equal(JSON.stringify(plan), planBefore, "reserve does not mutate AuthorizedPlan.");
    expectCode(() => h.gate.reserve(plan), C.ACTIVATION_ALREADY_PENDING, "Same plan cannot have two unsettled reservations.");
    const siblingGate = gateModule.createAuthorityActivationGate({ producer: h.producer, grantStore: h.store, sessionId: h.session.getSessionId(), makeActivationId() { return "sibling_activation"; } });
    expectCode(() => siblingGate.reserve(plan), C.ACTIVATION_ALREADY_PENDING, "Same plan cannot be double-reserved through a second canonical Gate instance.");
    expectCode(() => siblingGate.consume(activation), C.ACTIVATION_HANDLE_UNTRUSTED, "Only the creating Gate can settle its activation reservation.");
    expectCode(() => h.gate.consume(Object.assign({}, activation)), C.ACTIVATION_HANDLE_UNTRUSTED, "Copied activation is rejected.");
    expectCode(() => h.gate.release({ ...activation }), C.ACTIVATION_HANDLE_UNTRUSTED, "Raw field-identical activation is rejected.");
    check(h.gate.release(activation), "Pending activation can release.");
    equal(h.store.lookup(activation.grantId).reservedActions, 0, "release returns the reserved slot.");
    expectCode(() => h.gate.release(activation), C.ACTIVATION_ALREADY_SETTLED, "Double release fails closed.");
    expectCode(() => h.gate.consume(activation), C.ACTIVATION_ALREADY_SETTLED, "Consume after release fails closed.");
    const replay = h.gate.reserve(plan);
    check(replay.activationId !== activation.activationId, "Released plan may deterministically reserve again with a fresh activationId.");
    check(h.gate.consume(replay), "Pending activation can be committed as consumed authority budget.");
    equal(h.store.lookup(replay.grantId).consumedActions, 1, "consume permanently decrements theoretical grant budget.");
    expectCode(() => h.gate.consume(replay), C.ACTIVATION_ALREADY_SETTLED, "Double consume fails closed.");
    expectCode(() => h.gate.release(replay), C.ACTIVATION_ALREADY_SETTLED, "Release after consume fails closed.");
    expectCode(() => h.gate.reserve(plan), C.ACTIVATION_PLAN_ALREADY_CONSUMED, "A consumed plan cannot replay authority consumption.");

    const forged = planning.snapshotAuthorizedPlan(plan);
    expectCode(() => h.gate.reserve(forged), C.ACTIVATION_PLAN_UNTRUSTED, "Copied AuthorizedPlan is rejected.");
    expectCode(() => h.gate.reserve(Object.assign({}, plan)), C.ACTIVATION_PLAN_UNTRUSTED, "Raw/modified plan is rejected.");
    const legacy = planning.createAuthorizedPlan({ planId: "legacy_plan", revision: 0, steps: [{ candidateId: "candidate_legacy", capabilityId: "set-opacity-v1", kind: "tool", risk: "write", params: { opacity: 50 }, targetScope: { type: "selected-layer" }, requiresConfirmation: true, policyDecision: { decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "legacy-policy", provenance: { rule: "mutation" } }, authorityEvidence: { eventKind: "permission/decided", seq: 1, requestId: "req_main", evidenceType: "authority-evidence" } }] });
    expectCode(() => h.gate.reserve(legacy), C.ACTIVATION_PLAN_UNTRUSTED, "Legacy review plan cannot impersonate a delegated plan.");

    const cross = harness({ sessionId: "session_cross", grantId: issued.grant.grant.grantId });
    expectCode(() => gateModule.createAuthorityActivationGate({ producer: h.producer, grantStore: cross.store, sessionId: cross.session.getSessionId(), makeActivationId() { return "x"; } }), C.ACTIVATION_GATE_INVALID_OPTIONS, "Wrong Producer/Store/Session composition is rejected even with same grantId.");
    expectCode(() => gateModule.createAuthorityActivationGate({ producer: h.producer, grantStore: h.store, sessionId: "wrong_session", makeActivationId() { return "x"; } }), C.ACTIVATION_GATE_INVALID_OPTIONS, "Wrong Session Gate composition is rejected.");
    const invalidIdHarness = harness();
    const invalidIdGrant = invalidIdHarness.issue("req_invalid_activation_id", 1);
    const invalidIdPlan = invalidIdHarness.produce(invalidIdGrant);
    const invalidIdGate = gateModule.createAuthorityActivationGate({ producer: invalidIdHarness.producer, grantStore: invalidIdHarness.store, sessionId: invalidIdHarness.session.getSessionId(), makeActivationId() { return "bad id"; } });
    expectCode(() => invalidIdGate.reserve(invalidIdPlan), C.ACTIVATION_ID_INVALID, "Invalid local activationId fails closed.");
    equal(invalidIdHarness.store.lookup(invalidIdGrant.grant.grant.grantId).reservedActions, 0, "ActivationId failure releases the internal Store reservation.");

    function lifecycleCase(label, mutate, expected) {
        const x = harness(); const grant = x.issue("req_" + label, 1); const p = x.produce(grant); mutate(x, grant); expectCode(() => x.gate.reserve(p), expected, label + " prevents activation reservation.");
    }
    lifecycleCase("revoked", (x, grant) => x.coordinator.revokeGrant({ grantId: grant.grant.grant.grantId, taskId: "task_1", requestId: "req_revoke" }), C.ACTIVATION_GRANT_UNAVAILABLE);
    lifecycleCase("expired", x => x.setNow(200), C.ACTIVATION_GRANT_UNAVAILABLE);
    lifecycleCase("reset", x => x.store.resetSession(), C.ACTIVATION_GRANT_UNAVAILABLE);
    lifecycleCase("suspend", x => x.store.suspend(), C.ACTIVATION_GRANT_UNAVAILABLE);
    lifecycleCase("disposed", x => x.store.dispose(), C.ACTIVATION_GRANT_UNAVAILABLE);
    lifecycleCase("exhausted", (x, grant) => x.store.consume(x.store.reserve(grant.grant.grant.grantId)), C.ACTIVATION_RESERVATION_FAILED);
    const epoch = harness({ grantId: "grant_reused" });
    const oldGrant = epoch.issue("req_epoch_old", 1);
    const oldPlan = epoch.produce(oldGrant);
    epoch.store.resetSession();
    epoch.issue("req_epoch_new", 1);
    expectCode(() => epoch.gate.reserve(oldPlan), C.ACTIVATION_GRANT_UNAVAILABLE, "Old plan cannot correlate to a same-ID grant from a new Store authority epoch.");

    function staleCase(label, mutate) {
        const x = harness(); const grant = x.issue("req_stale_" + label, 1); const a = x.gate.reserve(x.produce(grant)); mutate(x, grant); expectCode(() => x.gate.consume(a), C.ACTIVATION_STALE, label + " invalidates pending activation consume."); expectCode(() => x.gate.release(a), C.ACTIVATION_STALE, label + " leaves activation deterministically stale.");
    }
    staleCase("revoke", (x, grant) => x.coordinator.revokeGrant({ grantId: grant.grant.grant.grantId, taskId: "task_1", requestId: "req_stale_revoke_done" }));
    staleCase("expiry", x => x.setNow(200));
    staleCase("reset", x => x.store.resetSession());
    staleCase("suspend", x => x.store.suspend());
    staleCase("dispose", x => x.store.dispose());

    const contention = harness();
    const one = contention.issue("req_contention", 1);
    const planA = contention.produce(one, 40);
    const planB = contention.produce(one, 60);
    const a = contention.gate.reserve(planA);
    expectCode(() => contention.gate.reserve(planB), C.ACTIVATION_RESERVATION_FAILED, "Budget=1 allows only one competing plan reservation.");
    contention.gate.release(a);
    const b = contention.gate.reserve(planB);
    contention.gate.consume(b);
    expectCode(() => contention.gate.reserve(planA), C.ACTIVATION_RESERVATION_FAILED, "Consumed budget remains unavailable to competing plan.");

    const independent = harness();
    const grantA = independent.issue("req_independent_a", 1);
    const planIndependentA = independent.produce(grantA, 30);
    const activationA = independent.gate.reserve(planIndependentA);
    const grantB = independent.issue("req_independent_b", 1);
    independent.coordinator.revokeGrant({ grantId: grantA.grant.grant.grantId, taskId: "task_1", requestId: "req_independent_a_revoke" });
    const planIndependentB = independent.produce(grantB, 70);
    const activationB = independent.gate.reserve(planIndependentB);
    check(activationA.grantId !== activationB.grantId, "Independent grants reserve independently.");
    independent.gate.release(activationB);

    console.log("PASS Vela AuthorityActivationGate: " + assertions + " assertions.");
}

run();
