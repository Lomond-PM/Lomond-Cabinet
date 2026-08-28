#!/usr/bin/env node
"use strict";

const assert = require("assert");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const planning = require("../client/js/vela/velaPlanningContracts");
const agentRegistryModule = require("../client/js/vela/velaAgentCapabilityRegistry");
const activeComposition = require("../client/js/vela/velaActiveCompositionCapability");
const legacyContracts = require("../client/js/vela/velaCapabilityContracts");

let assertions = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
function deepEqual(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); assertions += 1; }
function expectCode(fn, code, message) {
    let thrown = null;
    try { fn(); } catch (error) { thrown = error; }
    assert.ok(thrown && thrown.code === code, message || ("Expected code " + code + "; got " + (thrown && thrown.code)));
    assertions += 1;
}
function expectThrows(fn, message) { let thrown = false; try { fn(); } catch (error) { thrown = true; } assert.ok(thrown, message || "Expected an exception"); assertions += 1; }

// Real Registry as source of truth (System B agent registry + System A legacy
// contracts). No second capability registry is created.
const agentRegistry = agentRegistryModule.createRegistry([activeComposition.DEFINITION]);
const resolver = compilerModule.createCapabilityViewResolver({ agentRegistry: agentRegistry, legacyContracts: legacyContracts });

let idCounter = 0;
const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: resolver.resolveCapability, makeId: () => "cand_" + (++idCounter), now: () => 1000 });

// A compiler with a deterministic id for the determinism test.
const fixedCompiler = compilerModule.createCapabilityCompiler({ resolveCapability: resolver.resolveCapability, makeId: () => "cand_fixed", now: () => 5000 });

function readIntent(overrides) {
    return Object.assign({ intentId: "intent_r", capabilityId: "observe-active-composition-v1", requestedOperation: "read", params: {} }, overrides || {});
}
function mutationIntent(overrides) {
    return Object.assign({ intentId: "intent_m", capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: 50 } }, overrides || {});
}

// ===========================================================================
// 1. valid registered (read/analyze) capability compiles to an ActionCandidate.
// ===========================================================================
const readCandidate = compiler.compile(planning.createCapabilityIntent(readIntent()));
check(planning.isActionCandidate(readCandidate), "read compile output is an ActionCandidate");
check(!planning.isAuthorizedPlan(readCandidate), "compile does not create an AuthorizedPlan");
check(readCandidate.operationKind === "read", "candidate operationKind is read");
check(readCandidate.risk === "read", "candidate risk is read");
check(readCandidate.capabilityId === "observe-active-composition-v1", "candidate capabilityId preserved");
check(readCandidate.provenance.source === "compiler", "candidate provenance is compiler-derived");
check(readCandidate.provenance.moduleRevision === compilerModule.MODULE_REVISION, "candidate provenance carries module revision");
check(readCandidate.targetScope.type === "current-comp", "read candidate targetScope is the semantic current-comp descriptor");
deepEqual(readCandidate.params, {}, "read candidate params is canonical empty object");
check(Object.isFrozen(readCandidate), "compile output is immutable (deep-frozen)");

// ===========================================================================
// 2. unknown capability fails closed.
// ===========================================================================
expectCode(() => compiler.compile(planning.createCapabilityIntent({ intentId: "i", capabilityId: "nope-v1", requestedOperation: "read", params: {} })), "CAPABILITY_NOT_REGISTERED", "unknown capability -> CAPABILITY_NOT_REGISTERED");

// ===========================================================================
// 3. unsupported operation fails.
// ===========================================================================
expectCode(() => compiler.compile(planning.createCapabilityIntent({ intentId: "i", capabilityId: "observe-active-composition-v1", requestedOperation: "mutate", params: {} })), "CAPABILITY_OPERATION_UNSUPPORTED", "read capability with mutate operation -> CAPABILITY_OPERATION_UNSUPPORTED");
expectCode(() => compiler.compile(planning.createCapabilityIntent({ intentId: "i", capabilityId: "set-opacity-v1", requestedOperation: "read", params: {} })), "CAPABILITY_OPERATION_UNSUPPORTED", "mutation capability with read operation -> CAPABILITY_OPERATION_UNSUPPORTED");

// ===========================================================================
// 4. malformed CapabilityIntent fails.
// ===========================================================================
expectCode(() => compiler.compile({ contractType: "task-plan", planId: "p", revision: 0, steps: [] }), "PLANNING_CONTRACT_INVALID", "non-intent input -> PLANNING_CONTRACT_INVALID");
expectCode(() => compiler.compile(null), "PLANNING_CONTRACT_INVALID", "null intent -> PLANNING_CONTRACT_INVALID");

// ===========================================================================
// 5. unknown params fail.
// ===========================================================================
expectCode(() => compiler.compile(planning.createCapabilityIntent(readIntent({ params: { foo: 1 } }))), "CAPABILITY_PARAMS_INVALID", "read intent with unknown param -> CAPABILITY_PARAMS_INVALID");

// ===========================================================================
// 6. local-only params fail.
// ===========================================================================
expectCode(() => compiler.compile(planning.createCapabilityIntent(mutationIntent({ params: { opacity: 50, undoGroupLabel: "x" } }))), "CAPABILITY_PARAMS_INVALID", "mutation intent with local-only param -> CAPABILITY_PARAMS_INVALID");

// ===========================================================================
// 7. wrong param type fails.
// ===========================================================================
expectCode(() => compiler.compile(planning.createCapabilityIntent(mutationIntent({ params: { opacity: "50" } }))), "CAPABILITY_PARAMS_INVALID", "string opacity -> CAPABILITY_PARAMS_INVALID");

// ===========================================================================
// 8. invalid enum/range fails.
// ===========================================================================
expectCode(() => compiler.compile(planning.createCapabilityIntent(mutationIntent({ params: { opacity: 150 } }))), "CAPABILITY_PARAMS_INVALID", "out-of-range opacity (150) -> CAPABILITY_PARAMS_INVALID");
expectCode(() => compiler.compile(planning.createCapabilityIntent(mutationIntent({ params: { opacity: -1 } }))), "CAPABILITY_PARAMS_INVALID", "out-of-range opacity (-1) -> CAPABILITY_PARAMS_INVALID");

// ===========================================================================
// 9-13. forged target/nonce/authority/PolicyDecision/Host payload fail closed.
// ===========================================================================
expectCode(() => compiler.compile({ contractType: "capability-intent", intentId: "i", capabilityId: "observe-active-composition-v1", requestedOperation: "read", params: { layerId: 3 } }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "forged target binding -> PLANNING_CONTRACT_FORBIDDEN_FIELD");
expectCode(() => compiler.compile({ contractType: "capability-intent", intentId: "i", capabilityId: "observe-active-composition-v1", requestedOperation: "read", params: { nonce: "forged" } }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "forged nonce -> PLANNING_CONTRACT_FORBIDDEN_FIELD");
expectCode(() => compiler.compile({ contractType: "capability-intent", intentId: "i", capabilityId: "observe-active-composition-v1", requestedOperation: "read", params: { authority: true } }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "forged authority -> PLANNING_CONTRACT_FORBIDDEN_FIELD");
expectCode(() => compiler.compile({ contractType: "capability-intent", intentId: "i", capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { policyDecision: "ALLOW" } }), "CAPABILITY_PARAMS_INVALID", "forged PolicyDecision -> CAPABILITY_PARAMS_INVALID");
expectCode(() => compiler.compile({ contractType: "capability-intent", intentId: "i", capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { hostPayload: "h" } }), "PLANNING_CONTRACT_FORBIDDEN_FIELD", "forged Host payload -> PLANNING_CONTRACT_FORBIDDEN_FIELD");

// ===========================================================================
// 14. output is ActionCandidate.
// ===========================================================================
check(planning.isActionCandidate(readCandidate), "output is an ActionCandidate");
check(!planning.isTaskPlan(readCandidate), "output is not a TaskPlan");

// ===========================================================================
// 15. output immutable.
// ===========================================================================
expectThrows(() => { readCandidate.params.opacity = 1; }, "mutating a frozen candidate throws");

// ===========================================================================
// 16. candidate has local provenance.
// ===========================================================================
check(readCandidate.provenance && readCandidate.provenance.source === "compiler", "candidate provenance is local/compiler");
check(readCandidate.provenance.capabilityId === "observe-active-composition-v1", "candidate provenance references the capability");

// ===========================================================================
// 17. candidate contains no trusted final binding.
// ===========================================================================
planning.assertActionCandidateNonAuthoritative(readCandidate);
check(readCandidate.targetScope.type === "current-comp", "targetScope is a semantic descriptor, not a binding");
check(!("layerId" in readCandidate) && !("nativeLayerId" in readCandidate) && !("itemId" in readCandidate) && !("layerIndex" in readCandidate), "candidate carries no trusted native binding identity");

// ===========================================================================
// 18-21. compile does not invoke the capability / mutate Session / create
//        AuthorizedPlan / call Host.
// ===========================================================================
// The resolver used here has NO availability resolver and the agent registry is
// constructed WITHOUT the bridge adapter, so compile cannot invoke the
// capability, refresh observation, or reach Host. It only does a pure
// descriptor lookup. Assert availability is unavailable yet compile succeeds.
check(agentRegistry.getContract("observe-active-composition-v1").adapterId === "context-bridge-active-composition-v1", "agent registry descriptor exposes its adapterId");
check(agentRegistry.getAvailability("observe-active-composition-v1").available === false, "no availability resolver => availability is false (compile is decoupled from invocation)");
check(planning.isActionCandidate(readCandidate) && !planning.isAuthorizedPlan(readCandidate), "compile output is a candidate, never an AuthorizedPlan");
check(readCandidate.operationKind === "read", "compile performed no invocation, only typed candidate generation");

// ===========================================================================
// 22. repeated deterministic input -> semantically equivalent candidate
//     (except explicitly local identity fields, here fixed).
// ===========================================================================
const a = fixedCompiler.compile(planning.createCapabilityIntent(readIntent()));
const b = fixedCompiler.compile(planning.createCapabilityIntent(readIntent()));
deepEqual(a, b, "deterministic compile of the same intent is semantically identical");
check(a.candidateId === "cand_fixed" && b.candidateId === "cand_fixed", "deterministic id produced identical identity under fixed id factory");

// ===========================================================================
// 23. read/analyze exemplar works (compiles and stays non-authoritative).
// ===========================================================================
check(planning.isActionCandidate(readCandidate), "read/analyze exemplar compiles to a candidate");
check(planning.legacyAuthorityPolicy({ capabilityId: "observe-active-composition-v1", requestedOperation: "read", capabilityKnown: true, paramsValid: true, operationSupported: true, declaredLocalScope: { capabilityId: "observe-active-composition-v1", scopeType: "current-project" }, targetScope: { type: "current-comp" } }).decision === "ALLOW", "read exemplar would be ALLOW under a declared local scope");

// ===========================================================================
// 24. mutation-compatible fixture remains non-authoritative.
// ===========================================================================
const mutationCandidate = compiler.compile(planning.createCapabilityIntent(mutationIntent()));
check(planning.isActionCandidate(mutationCandidate), "mutation fixture compiles to a candidate");
check(!planning.isAuthorizedPlan(mutationCandidate), "mutation fixture is not an AuthorizedPlan");
check(mutationCandidate.operationKind === "mutate", "mutation candidate operationKind is mutate");
check(mutationCandidate.kind === "tool", "mutation candidate keeps its tool invocation kind");
check(mutationCandidate.risk === "write", "mutation candidate risk is write");
check(mutationCandidate.requiresConfirmation === true, "mutation candidate requires confirmation");
deepEqual(mutationCandidate.params, { opacity: 50 }, "mutation candidate params are the canonical validated opacity");
// A candidate is never execution authority: the mutation still requires review.
check(planning.legacyAuthorityPolicy({ capabilityId: "set-opacity-v1", requestedOperation: "mutate", capabilityKnown: true, paramsValid: true, operationSupported: true }).decision === "REVIEW_REQUIRED", "mutation remains REVIEW_REQUIRED even after a candidate exists");
// Even with a valid DelegationGrant, no mutation authority is granted.
const grant = planning.createDelegationGrant({ grantId: "grant_1", capabilityFamily: "mutation", capabilityId: "set-opacity-v1", targetScope: { type: "current-comp" }, riskCeiling: "write" });
check(planning.grantAllowsMutation(grant) === false, "a valid DelegationGrant still does not authorize the mutation");

// ===========================================================================
// Extra: no compiler output is executable in the spine sense (structural).
// ===========================================================================
check(planning.isActionCandidate(mutationCandidate) && !Object.prototype.hasOwnProperty.call(mutationCandidate, "executionArmed") && !Object.prototype.hasOwnProperty.call(mutationCandidate, "nonce"), "candidate carries no execution authority marker");

console.log("test-vela-capability-compiler: " + assertions + " assertions passed");
