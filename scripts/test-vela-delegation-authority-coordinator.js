#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");
const grantStoreModule = require("../client/js/vela/velaDelegationGrantStore");
const resolverModule = require("../client/js/vela/velaAuthorityEvidenceResolver");
const coordinatorModule = require("../client/js/vela/velaDelegationAuthorityCoordinator");
const planning = require("../client/js/vela/velaPlanningContracts");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const capabilityContracts = require("../client/js/vela/velaCapabilityContracts");
const policyModule = require("../client/js/vela/velaDelegationPolicyEngine");

let assertions = 0;
let now = 100;
let id = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function expectCode(fn, code, message) { assert.throws(fn, error => error && error.code === code, message); assertions += 1; }
function captureCode(fn, code, message) { let captured = null; try { fn(); } catch (error) { captured = error; } check(captured && captured.code === code, message + " (actual: " + (captured && captured.code) + ")"); return captured; }
function spec(overrides) { return Object.assign({ capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId: "task_1", expiresAt: 200, maxActions: 1, provenance: { source: "local-user", requestId: "req_permission", issuedAt: 100 } }, overrides || {}); }
function harness() {
    const session = sessionRuntime.createSessionLog({ sessionId: "session_" + (++id) });
    const authorityAppender = sessionRuntime.createAuthorityEventAppender(session);
    const store = grantStoreModule.createDelegationGrantStore({ now() { return now; }, idFactory() { return "grant_" + (++id); } });
    const resolver = resolverModule.createAuthorityEvidenceResolver({ session });
    const coordinator = coordinatorModule.createDelegationAuthorityCoordinator({ grantStore: store, session, authorityAppender, evidenceResolver: resolver, issuerId: "local-user" });
    return { session, authorityAppender, store, resolver, coordinator };
}
function permission(h, overrides) {
    const event = h.authorityAppender.append({ kind: "permission/decided", requestId: "req_permission", payload: Object.assign({ decision: "approved", issuedBy: "local-user", taskId: "task_1" }, overrides || {}) });
    return h.resolver.resolveEvidence({ sessionId: h.session.getSessionId(), seq: event.seq, eventKind: event.kind, requestId: event.requestId });
}

function loadCoordinatorWithResolverModule(fakeResolverModule) {
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaDelegationAuthorityCoordinator"), "utf8");
    const moduleRecord = { exports: {} };
    const dependencies = {
        "./velaPlanningContracts": planning,
        "./velaSessionRuntime": sessionRuntime,
        "./velaDelegationGrantStore": grantStoreModule,
        "./velaAuthorityEvidenceResolver": fakeResolverModule
    };
    Function("module", "require", source + "\n//# sourceURL=velaDelegationAuthorityCoordinator.fault-harness.js")(moduleRecord, function (name) { return dependencies[name]; });
    return moduleRecord.exports;
}

function policyDecisionFor(store, sessionId) {
    const capabilityResolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilityContracts });
    const localCompiler = compilerModule.createCapabilityCompiler({ resolveCapability: capabilityResolver.resolveCapability, makeId() { return "rollback_candidate_" + (++id); } });
    const localCandidate = localCompiler.compile(planning.createCapabilityIntent({ intentId: "rollback_intent_" + (++id), capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: 50 } }));
    const localEngine = policyModule.createDelegationPolicyEngine({ grantStore: store, resolveCapability: capabilityResolver.resolveCapability, sessionId });
    return localEngine.evaluate(localCandidate, { sessionId, taskId: "task_1" }).decision;
}

function rollbackReconciliation() {
    // 1. Store.issue succeeds, but delegation/granted cannot append.
    const appendSession = sessionRuntime.createSessionLog({ sessionId: "session_append_failure" });
    const appendAuthority = sessionRuntime.createAuthorityEventAppender(appendSession);
    const appendResolver = resolverModule.createAuthorityEvidenceResolver({ session: appendSession });
    const permissionEvent = appendAuthority.append({ kind: "permission/decided", requestId: "req_permission", payload: { decision: "approved", issuedBy: "local-user", taskId: "task_1" } });
    const permissionEvidence = appendResolver.resolveEvidence({ sessionId: appendSession.getSessionId(), seq: permissionEvent.seq, eventKind: permissionEvent.kind, requestId: permissionEvent.requestId });
    let appendClockCalls = 0;
    const appendStore = grantStoreModule.createDelegationGrantStore({ now() { appendClockCalls += 1; if (appendClockCalls === 1) { appendSession.close(); } return 100; }, idFactory() { return "grant_append_failure"; } });
    const appendCoordinator = coordinatorModule.createDelegationAuthorityCoordinator({ grantStore: appendStore, session: appendSession, authorityAppender: appendAuthority, evidenceResolver: appendResolver, issuerId: "local-user" });
    const appendError = captureCode(() => appendCoordinator.issueGrant({ spec: spec(), permissionEvidence }), coordinatorModule.ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Granted append failure returns its stable error.");
    equal(appendError.details.grantedEventAppended, false, "Granted append failure explicitly records that no granted event exists.");
    equal(appendStore.listActive().length, 0, "Granted append failure rolls back live Store authority.");
    equal(appendSession.getEvents().map(event => event.kind).join(","), "permission/decided", "Granted append failure fabricates no revoke event.");
    equal(policyDecisionFor(appendStore, appendSession.getSessionId()), "REVIEW_REQUIRED", "PolicyEngine cannot ALLOW an append-failed rolled-back grant.");

    function resolveFailureHarness(sessionId, closeOnRollback) {
        const session = sessionRuntime.createSessionLog({ sessionId });
        const authorityAppender = sessionRuntime.createAuthorityEventAppender(session);
        const permissionRecord = authorityAppender.append({ kind: "permission/decided", requestId: "req_permission", payload: { decision: "approved", issuedBy: "local-user", taskId: "task_1" } });
        let clockCalls = 0;
        const store = grantStoreModule.createDelegationGrantStore({ now() { clockCalls += 1; if (closeOnRollback && clockCalls === 2) { session.close(); } return 100; }, idFactory() { return "grant_" + sessionId; } });
        const fakeResolver = {
            getSessionId() { return session.getSessionId(); },
            getVerifiedEvent() { return permissionRecord; },
            resolveEvidence() { const error = new Error("forced-resolve-failure"); error.code = "EVIDENCE_REFERENCE_INVALID"; throw error; }
        };
        const fakeResolverModule = { isTrustedAuthorityEvidenceResolver(value) { return value === fakeResolver; } };
        const isolatedCoordinatorModule = loadCoordinatorWithResolverModule(fakeResolverModule);
        const coordinator = isolatedCoordinatorModule.createDelegationAuthorityCoordinator({ grantStore: store, session, authorityAppender, evidenceResolver: fakeResolver, issuerId: "local-user" });
        return { session, store, coordinator, moduleApi: isolatedCoordinatorModule };
    }

    // 2. Granted append succeeds, resolve fails, rollback revoke evidence succeeds.
    const resolvedRollback = resolveFailureHarness("session_resolve_rollback", false);
    const resolvedError = captureCode(() => resolvedRollback.coordinator.issueGrant({ spec: spec(), permissionEvidence: {} }), resolvedRollback.moduleApi.ERROR_CODES.AUTHORITY_ISSUE_ROLLED_BACK, "Resolve failure with rollback evidence returns rolled-back error.");
    equal(resolvedError.details.authorityState, "revoked", "Resolve failure reports final revoked Store state.");
    equal(resolvedRollback.store.listActive().length, 0, "Resolve failure immediately revokes live Store authority.");
    equal(resolvedRollback.session.getEvents().map(event => event.kind).join(","), "permission/decided,delegation/granted,delegation/revoked", "Resolve failure records both granted history and rollback revocation.");
    equal(policyDecisionFor(resolvedRollback.store, resolvedRollback.session.getSessionId()), "REVIEW_REQUIRED", "PolicyEngine cannot ALLOW a resolve-failed rolled-back grant.");

    // 3. Granted append succeeds, resolve fails, rollback revoke append also fails.
    const degradedRollback = resolveFailureHarness("session_degraded_rollback", true);
    const degradedError = captureCode(() => degradedRollback.coordinator.issueGrant({ spec: spec(), permissionEvidence: {} }), degradedRollback.moduleApi.ERROR_CODES.AUTHORITY_ROLLBACK_EVIDENCE_FAILED, "Rollback evidence failure returns degraded-provenance error.");
    equal(degradedError.details.authorityState, "revoked", "Degraded provenance explicitly reports revoked live authority.");
    equal(degradedRollback.store.listActive().length, 0, "Rollback evidence failure never reactivates the grant.");
    equal(degradedRollback.session.getEvents().map(event => event.kind).join(","), "permission/decided,delegation/granted", "Degraded history truthfully contains no fabricated rollback event.");
    equal(policyDecisionFor(degradedRollback.store, degradedRollback.session.getSessionId()), "REVIEW_REQUIRED", "PolicyEngine cannot ALLOW a degraded-provenance rolled-back grant.");
}

function browserSmoke() {
    const sandbox = { Object, Error, Date, Map, WeakMap, WeakSet, Number, Boolean, String, Array, RegExp, JSON };
    sandbox.self = sandbox; sandbox.window = sandbox;
    ["velaSessionRuntime", "velaPlanningContracts", "velaDelegationGrantStore", "velaAuthorityEvidenceResolver", "velaDelegationAuthorityCoordinator"].forEach(name => {
        vm.runInNewContext(fs.readFileSync(require.resolve("../client/js/vela/" + name), "utf8"), sandbox, { filename: name + ".js" });
    });
    check(typeof sandbox.VelaDelegationAuthorityCoordinator.createDelegationAuthorityCoordinator === "function", "CEP-like UMD coordinator registration works without loader wiring.");
}

function run() {
    browserSmoke();
    rollbackReconciliation();
    const h = harness();
    const issued = h.coordinator.issueGrant({ spec: spec(), permissionEvidence: permission(h) });
    equal(issued.grant.status, "active", "Issue returns active Store-owned grant only after evidence exists.");
    equal(issued.evidence.eventKind, "delegation/granted", "Issue returns trusted delegation/granted evidence.");
    h.resolver.verifyEvidenceReference(issued.evidence, { grantId: issued.grant.grant.grantId, taskId: "task_1" }); assertions += 1;
    const beforeBudget = h.store.lookup(issued.grant.grant.grantId);
    h.resolver.verifyEvidenceReference(issued.evidence); assertions += 1;
    const afterBudget = h.store.lookup(issued.grant.grant.grantId);
    equal(afterBudget.remainingActions, beforeBudget.remainingActions, "Evidence does not consume budget.");
    equal(afterBudget.reservedActions, beforeBudget.reservedActions, "Evidence does not reserve budget.");

    const resolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilityContracts });
    const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: resolver.resolveCapability, makeId() { return "candidate_" + (++id); } });
    const candidate = compiler.compile(planning.createCapabilityIntent({ intentId: "intent_1", capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: 50 } }));
    const engine = policyModule.createDelegationPolicyEngine({ grantStore: h.store, resolveCapability: resolver.resolveCapability, sessionId: h.session.getSessionId() });
    equal(engine.evaluate(candidate, { sessionId: h.session.getSessionId(), taskId: "task_1" }).decision, "ALLOW", "PolicyEngine uses live Store, not evidence history.");

    const revoked = h.coordinator.revokeGrant({ grantId: issued.grant.grant.grantId, taskId: "task_1", requestId: "req_revoke" });
    equal(revoked.evidence.eventKind, "delegation/revoked", "Real Store revocation has trusted evidence.");
    equal(engine.evaluate(candidate, { sessionId: h.session.getSessionId(), taskId: "task_1" }).decision, "REVIEW_REQUIRED", "Granted evidence cannot reactivate revoked live authority.");
    h.resolver.verifyEvidenceReference(issued.evidence); assertions += 1;
    h.resolver.verifyEvidenceReference(revoked.evidence); assertions += 1;
    const countAfterRevoke = h.session.getEvents().length;
    expectCode(() => h.coordinator.revokeGrant({ grantId: issued.grant.grant.grantId, taskId: "task_1", requestId: "req_repeat" }), coordinatorModule.ERROR_CODES.AUTHORITY_TRANSITION_NOT_ACTIVE, "Repeated revoke is rejected as a new transition.");
    equal(h.session.getEvents().length, countAfterRevoke, "Repeated revoke fabricates no new event.");

    const resetHarness = harness();
    const resetIssued = resetHarness.coordinator.issueGrant({ spec: spec(), permissionEvidence: permission(resetHarness) });
    resetHarness.store.resetSession();
    resetHarness.resolver.verifyEvidenceReference(resetIssued.evidence); assertions += 1;
    equal(resetHarness.store.listActive().length, 0, "Old evidence cannot restore Store after reset.");
    const suspendHarness = harness();
    const suspendIssued = suspendHarness.coordinator.issueGrant({ spec: spec(), permissionEvidence: permission(suspendHarness) });
    suspendHarness.store.suspend();
    suspendHarness.resolver.verifyEvidenceReference(suspendIssued.evidence); assertions += 1;
    equal(suspendHarness.store.listActive().length, 0, "Old evidence cannot restore Store after suspend.");
    const reloadStore = grantStoreModule.createDelegationGrantStore({ now() { return now; } });
    equal(reloadStore.listActive().length, 0, "Old evidence cannot restore a new/reloaded Store.");
    expectCode(() => reloadStore.issue(resetIssued.evidence), grantStoreModule.ERROR_CODES.GRANT_STORE_INVALID_SPEC, "Evidence object cannot be used as a grant spec.");

    const wrongPermissionHarness = harness();
    const deniedPermission = permission(wrongPermissionHarness, { decision: "denied" });
    expectCode(() => wrongPermissionHarness.coordinator.issueGrant({ spec: spec(), permissionEvidence: deniedPermission }), coordinatorModule.ERROR_CODES.AUTHORITY_PERMISSION_EVIDENCE_REQUIRED, "Denied permission cannot issue a grant.");
    equal(wrongPermissionHarness.store.listActive().length, 0, "Permission failure leaves no authority.");
    const mismatchHarness = harness();
    expectCode(() => mismatchHarness.coordinator.issueGrant({ spec: spec({ taskId: "task_other" }), permissionEvidence: permission(mismatchHarness) }), coordinatorModule.ERROR_CODES.AUTHORITY_PERMISSION_EVIDENCE_REQUIRED, "Grant/task correlation mismatch is rejected.");
    equal(mismatchHarness.store.listActive().length, 0, "Task mismatch creates no live authority.");

    const closedHarness = harness();
    const closedPermission = permission(closedHarness);
    closedHarness.session.close();
    expectCode(() => closedHarness.coordinator.issueGrant({ spec: spec(), permissionEvidence: closedPermission }), coordinatorModule.ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Session unavailable before issue fails closed.");
    equal(closedHarness.store.listActive().length, 0, "Append failure before issue creates no grant.");

    const closedRevokeHarness = harness();
    const closedRevokeIssued = closedRevokeHarness.coordinator.issueGrant({ spec: spec(), permissionEvidence: permission(closedRevokeHarness) });
    closedRevokeHarness.session.close();
    expectCode(() => closedRevokeHarness.coordinator.revokeGrant({ grantId: closedRevokeIssued.grant.grant.grantId, taskId: "task_1", requestId: "req_closed_revoke" }), coordinatorModule.ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Revocation remains fail closed when Session append is unavailable.");
    equal(closedRevokeHarness.store.listActive().length, 0, "Failed revoke evidence never restores revoked live authority.");

    const subscriberHarness = harness();
    const subscriberPermission = permission(subscriberHarness);
    subscriberHarness.session.subscribe(() => { throw new Error("subscriber-failure"); });
    const recovered = subscriberHarness.coordinator.issueGrant({ spec: spec(), permissionEvidence: subscriberPermission });
    equal(recovered.evidence.eventKind, "delegation/granted", "Authority append is not split by re-entrant general Session subscribers.");

    console.log("PASS Vela DelegationAuthorityCoordinator: " + assertions + " assertions.");
}

run();
