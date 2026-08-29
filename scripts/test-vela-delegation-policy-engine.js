#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const planning = require("../client/js/vela/velaPlanningContracts");
const capabilityContracts = require("../client/js/vela/velaCapabilityContracts");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const grantStoreModule = require("../client/js/vela/velaDelegationGrantStore");
const policyModule = require("../client/js/vela/velaDelegationPolicyEngine");

let assertions = 0;
let now = 100;
let grantId = 0;
let candidateId = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function expectCode(fn, code, message) { assert.throws(fn, error => error && error.code === code, message); assertions += 1; }

const resolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilityContracts });
const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: resolver.resolveCapability, makeId() { candidateId += 1; return "candidate_" + candidateId; } });
function createStore() { return grantStoreModule.createDelegationGrantStore({ now() { return now; }, idFactory() { grantId += 1; return "grant_" + String(grantId).padStart(4, "0"); } }); }
function candidate(opacity) { return compiler.compile(planning.createCapabilityIntent({ intentId: "intent_" + (++candidateId), capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: opacity === undefined ? 50 : opacity } })); }
function grantSpec(overrides) { return Object.assign({ capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId: "task_1", expiresAt: 200, maxActions: 1, provenance: { source: "local-user", requestId: "request_1", issuedAt: 100 } }, overrides || {}); }
function engine(store) { return policyModule.createDelegationPolicyEngine({ grantStore: store, resolveCapability: resolver.resolveCapability, sessionId: "session_1" }); }
function context(overrides) { return Object.assign({ sessionId: "session_1", taskId: "task_1" }, overrides || {}); }

function browserSmoke() {
    const sandbox = { Object, Error, Date, Map, WeakMap, WeakSet, Number, Boolean, String, Array, RegExp, JSON, Math, Uint8Array };
    sandbox.self = sandbox; sandbox.window = sandbox;
    ["velaSessionRuntime", "velaPlanningContracts", "velaCapabilityCompiler", "velaDelegationGrantStore", "velaDelegationPolicyEngine"].forEach(name => {
        vm.runInNewContext(fs.readFileSync(require.resolve("../client/js/vela/" + name), "utf8"), sandbox, { filename: name + ".js" });
    });
    check(typeof sandbox.VelaDelegationPolicyEngine.createDelegationPolicyEngine === "function", "CEP-like browser registration works without production loader wiring.");
}

function run() {
    browserSmoke();
    const exactStore = createStore();
    const exactGrant = exactStore.issue(grantSpec());
    const exactCandidate = candidate();
    const exactEngine = engine(exactStore);
    check(policyModule.isTrustedDelegationPolicyEngine(exactEngine), "PolicyEngine factory output carries module-private identity.");
    check(!policyModule.isTrustedDelegationPolicyEngine({ evaluate() {} }), "Caller-created PolicyEngine facade is not trusted.");
    check(policyModule.isTrustedDelegationPolicyEngineFor(exactEngine, exactStore, "session_1"), "PolicyEngine identity retains its exact Store and Session ownership.");
    check(!policyModule.isTrustedDelegationPolicyEngineFor(exactEngine, createStore(), "session_1"), "PolicyEngine cannot be substituted across Store instances.");
    const allowed = exactEngine.evaluate(exactCandidate, context());
    equal(allowed.decision, "ALLOW", "Valid trusted candidate plus exact active grant is ALLOW.");
    equal(allowed.issuedBy, "local-authority", "ALLOW is issued by trusted local authority.");
    equal(allowed.provenance.grantId, exactGrant.grant.grantId, "ALLOW correlates the selected Store grant.");
    equal(allowed.provenance.candidateId, exactCandidate.candidateId, "ALLOW correlates the trusted candidate.");
    check(Object.isFrozen(allowed) && Object.isFrozen(allowed.provenance), "PolicyDecision is deeply immutable.");

    const noGrantStore = createStore();
    equal(engine(noGrantStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "A legal mutation without a grant preserves human review.");

    const revokedStore = createStore();
    const revoked = revokedStore.issue(grantSpec());
    revokedStore.revoke(revoked.grant.grantId);
    equal(engine(revokedStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Revoked authority falls back to review.");

    const expiredStore = createStore();
    expiredStore.issue(grantSpec({ expiresAt: 110 }));
    now = 110;
    equal(engine(expiredStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Expired authority falls back to review.");
    now = 100;

    const exhaustedStore = createStore();
    exhaustedStore.issue(grantSpec({ maxActions: 0 }));
    equal(engine(exhaustedStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Exhausted authority falls back to review.");

    const wrongCapabilityStore = createStore();
    wrongCapabilityStore.issue(grantSpec({ capabilityId: "other-capability-v1" }));
    equal(engine(wrongCapabilityStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Wrong capability grant does not match.");
    const wrongOperationStore = createStore();
    wrongOperationStore.issue(grantSpec({ operationKind: "create" }));
    equal(engine(wrongOperationStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Wrong operation family does not match.");
    const lowRiskStore = createStore();
    lowRiskStore.issue(grantSpec({ riskCeiling: "read" }));
    equal(engine(lowRiskStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Insufficient risk ceiling does not match.");
    const wrongScopeStore = createStore();
    wrongScopeStore.issue(grantSpec({ targetScope: { type: "none" } }));
    equal(engine(wrongScopeStore).evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Semantic target scope mismatch does not match.");
    equal(exactEngine.evaluate(candidate(), context({ sessionId: "session_2" })).decision, "REVIEW_REQUIRED", "Session mismatch cannot use delegated authority.");
    equal(exactEngine.evaluate(candidate(), context({ taskId: "task_2" })).decision, "REVIEW_REQUIRED", "Task mismatch cannot use delegated authority.");
    equal(exactEngine.evaluate(candidate(), { taskId: "task_1" }).decision, "DENY", "Missing required trusted session correlation is denied.");

    const unknownResolver = function () { return null; };
    const unknownEngine = policyModule.createDelegationPolicyEngine({ grantStore: exactStore, resolveCapability: unknownResolver, sessionId: "session_1" });
    equal(unknownEngine.evaluate(candidate(), context()).decision, "DENY", "A capability missing from current trusted metadata is denied.");
    equal(exactEngine.evaluate({ capabilityId: "set-opacity-v1" }, context()).decision, "DENY", "Raw candidate JSON is denied.");
    const forgedCandidate = planning.createActionCandidate({ candidateId: "forged_candidate", capabilityId: "set-opacity-v1", operationKind: "mutate", kind: "tool", risk: "read", params: { opacity: 50 }, targetScope: { type: "selected-layer" }, requiresConfirmation: true, provenance: { source: "compiler" } });
    equal(exactEngine.evaluate(forgedCandidate, context()).decision, "DENY", "Forged model-supplied risk cannot lower trusted risk.");
    equal(exactEngine.evaluate(Object.assign({}, exactCandidate, { grantId: exactGrant.grant.grantId }), context()).decision, "DENY", "Model-supplied grantId cannot forge candidate identity.");
    expectCode(() => policyModule.createDelegationPolicyEngine({ grantStore: { getAuthorityView() { return { grants: [exactGrant] }; } }, resolveCapability: resolver.resolveCapability, sessionId: "session_1" }), policyModule.ERROR_CODES.POLICY_ENGINE_INVALID_OPTIONS, "Caller-created grant stores are rejected.");
    equal(engine(noGrantStore).evaluate(candidate(), context(), [exactGrant]).decision, "REVIEW_REQUIRED", "A caller-injected public grant snapshot is ignored and cannot become authority.");

    const before = exactStore.lookup(exactGrant.grant.grantId);
    const repeatA = exactEngine.evaluate(exactCandidate, context());
    const repeatB = exactEngine.evaluate(exactCandidate, context());
    const repeatC = exactEngine.evaluate(exactCandidate, context());
    const after = exactStore.lookup(exactGrant.grant.grantId);
    check([repeatA, repeatB, repeatC].every(item => item.decision === "ALLOW"), "Repeated evaluation remains advisory ALLOW.");
    equal(after.remainingActions, before.remainingActions, "Evaluation does not consume budget.");
    equal(after.reservedActions, before.reservedActions, "Evaluation does not reserve budget.");
    equal(after.generation, before.generation, "Evaluation does not mutate grant lifecycle.");

    const multipleStore = createStore();
    const broad = multipleStore.issue(grantSpec({ targetScope: { type: "current-comp" }, expiresAt: 190 }));
    const narrowLate = multipleStore.issue(grantSpec({ targetScope: { type: "selected-layer" }, expiresAt: 180 }));
    const narrowEarly = multipleStore.issue(grantSpec({ targetScope: { type: "selected-layer" }, expiresAt: 150 }));
    const selected = engine(multipleStore).evaluate(candidate(), context());
    equal(selected.provenance.grantId, narrowEarly.grant.grantId, "Narrower scope wins, then shorter expiry deterministically.");
    check(selected.provenance.grantId !== broad.grant.grantId && selected.provenance.grantId !== narrowLate.grant.grantId, "Selection does not prefer a broader or longer-lived grant.");

    const raceStore = createStore();
    const raceGrant = raceStore.issue(grantSpec({ expiresAt: 120 }));
    const raceEngine = engine(raceStore);
    const beforeRevoke = raceEngine.evaluate(candidate(), context());
    equal(beforeRevoke.decision, "ALLOW", "Grant initially evaluates ALLOW.");
    raceStore.revoke(raceGrant.grant.grantId);
    equal(raceEngine.evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Revoke removes future ALLOW.");
    equal(beforeRevoke.decision, "ALLOW", "Old PolicyDecision remains an immutable historical advisory, not live authority.");

    const expiryRaceStore = createStore();
    expiryRaceStore.issue(grantSpec({ expiresAt: 120 }));
    const expiryRaceEngine = engine(expiryRaceStore);
    const beforeExpiry = expiryRaceEngine.evaluate(candidate(), context());
    now = 120;
    equal(expiryRaceEngine.evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Expiry removes future ALLOW.");
    equal(beforeExpiry.decision, "ALLOW", "Old ALLOW is not rewritten and cannot re-enter the Store.");
    now = 100;

    const independentStore = createStore();
    const matching = independentStore.issue(grantSpec());
    const unrelated = independentStore.issue(grantSpec({ capabilityId: "unrelated-capability-v1", maxActions: 2 }));
    equal(engine(independentStore).evaluate(candidate(), context()).provenance.grantId, matching.grant.grantId, "Independent unrelated grants do not influence selection.");
    equal(independentStore.lookup(unrelated.grant.grantId).remainingActions, 2, "Independent grant state is untouched.");

    const lifecycleStore = createStore();
    lifecycleStore.issue(grantSpec());
    const lifecycleEngine = engine(lifecycleStore);
    lifecycleStore.resetSession();
    equal(lifecycleEngine.evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Session reset removes delegated ALLOW.");
    lifecycleStore.issue(grantSpec());
    lifecycleStore.suspend();
    equal(lifecycleEngine.evaluate(candidate(), context()).decision, "REVIEW_REQUIRED", "Suspend removes delegated ALLOW.");
    lifecycleStore.dispose();
    equal(lifecycleEngine.evaluate(candidate(), context()).decision, "DENY", "Disposed Store evaluation fails closed.");

    const invalidOperation = Object.assign({}, exactCandidate, { operationKind: "delete" });
    equal(exactEngine.evaluate(invalidOperation, context()).decision, "DENY", "Operation taxonomy forgery fails closed at candidate trust.");

    console.log("PASS Vela DelegationPolicyEngine: " + assertions + " assertions.");
}

run();
