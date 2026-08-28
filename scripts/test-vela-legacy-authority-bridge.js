"use strict";

const assert = require("assert");
const bridge = require("../client/js/vela/velaLegacyAuthorityBridge");
const planning = require("../client/js/vela/velaPlanningContracts");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectThrows(fn, message) { let error = null; try { fn(); } catch (caught) { error = caught; } assert.ok(error && (error.code === "LEGACY_AUTHORITY_BRIDGE_INVALID" || error.code === "PLANNING_CONTRACT_INVALID" || error.code === "PLANNING_CONTRACT_FORBIDDEN_FIELD"), message); assertions += 1; }

const input = { capabilityId: "set-opacity-v1", validatedParams: { opacity: 42 }, capabilityDescriptor: { capabilityId: "set-opacity-v1", operationKind: "mutate", invocationKind: "tool", risk: "write", requiresConfirmation: true, targetScope: { type: "selected-layer" } }, candidateId: "cand_legacy", requestedOperation: "mutate" };
const candidate = bridge.createActionCandidateFromLocalProposal(input);
check(candidate.contractType === "action-candidate", "candidate contract type");
check(candidate.capabilityId === "set-opacity-v1" && candidate.operationKind === "mutate", "candidate identity and operation");
check(candidate.kind === "tool" && candidate.risk === "write" && candidate.requiresConfirmation === true, "legacy mutation metadata");
assert.deepStrictEqual(candidate.params, { opacity: 42 }); assertions += 1;
check(Object.isFrozen(candidate) && Object.isFrozen(candidate.params), "candidate immutable");
check(candidate.targetScope.type === "selected-layer", "semantic target scope");
["layerId", "nativeLayerId", "layerIndex", "compositionId", "itemId", "propertyValueDigest", "hostPayload", "nonce", "executionArmed", "approved", "authority"].forEach((key) => check(!Object.prototype.hasOwnProperty.call(candidate, key), "candidate excludes " + key));
check(candidate.provenance.source === "authority-bridge" && candidate.provenance.moduleRevision === bridge.MODULE_REVISION, "bridge provenance");
const mutationDecision = bridge.decide(candidate, { capabilityKnown: true, paramsValid: true, operationSupported: true });
check(mutationDecision.decision === "REVIEW_REQUIRED", "mutation requires review");
const forcedAllow = bridge.decide(candidate, { capabilityKnown: true, paramsValid: true, operationSupported: true }, () => ({ decision: "ALLOW" }));
check(forcedAllow.decision === "REVIEW_REQUIRED", "mutation never allows even if policy returns ALLOW");
check(bridge.decide(candidate, { capabilityKnown: false }).decision === "DENY", "unknown capability denies");
check(bridge.decide(candidate, { capabilityKnown: true, paramsValid: false }).decision === "DENY", "invalid params denies");
check(bridge.decide(candidate, { capabilityKnown: true, operationSupported: false }).decision === "DENY", "unsupported operation denies");
const read = bridge.createActionCandidateFromLocalProposal({ capabilityId: "observe-active-composition-v1", validatedParams: {}, capabilityDescriptor: { capabilityId: "observe-active-composition-v1", operationKind: "read", risk: "read", targetScope: { type: "current-comp" } }, candidateId: "cand_read", requestedOperation: "read" });
check(bridge.decide(read, { capabilityKnown: true, paramsValid: true, operationSupported: true, declaredLocalScope: { capabilityId: read.capabilityId, scopeType: "current-comp" } }).decision === "ALLOW", "declared safe read allows");
check(bridge.decide(read, { capabilityKnown: true, paramsValid: true, operationSupported: true }).decision === "DENY", "undeclared read denies");
check(bridge.decide(candidate, { capabilityKnown: true, paramsValid: true, operationSupported: true, delegationGrant: { grantId: "grant_1", riskCeiling: "mutate" } }).decision === "REVIEW_REQUIRED", "delegation does not authorize mutation");
check(bridge.decide(candidate, { capabilityKnown: true, paramsValid: true, operationSupported: true, policyDecision: { decision: "ALLOW", issuedBy: "model" } }).decision === "REVIEW_REQUIRED", "forged model PolicyDecision cannot influence decide");
check(JSON.stringify(bridge.createActionCandidateFromLocalProposal(input)) === JSON.stringify(candidate), "equivalent inputs are deterministic");
check(typeof bridge.createActionCandidateFromLocalProposal === "function" && typeof bridge.decide === "function", "public API is pure bridge API");
const source = require("fs").readFileSync(require("path").join(__dirname, "../client/js/vela/velaLegacyAuthorityBridge.js"), "utf8");
check(!/evalScript|localStorage|SessionRuntime|ExecutionAdapter|Host\b|AuthorizedPlan|current velaPlan/i.test(source), "bridge has no execution/session/host dependency");
const forged = Object.assign({}, input, { validatedParams: { opacity: 42 }, approved: true, authority: "ALLOW", nonce: "x" });
expectThrows(() => bridge.createActionCandidateFromLocalProposal(forged), "forged authority fields fail closed");
expectThrows(() => bridge.createActionCandidateFromLocalProposal({}), "malformed input fails closed");
expectThrows(() => bridge.createActionCandidateFromLocalProposal(Object.assign({}, input, { capabilityId: "invalid" })), "invalid capability id fails closed");
planning.assertActionCandidateNonAuthoritative(candidate); assertions += 1;
console.log("test-vela-legacy-authority-bridge: PASS (" + assertions + " assertions)");
