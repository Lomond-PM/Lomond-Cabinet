const assert = require("assert");
const contracts = require("../client/js/vela/velaLogicalPlanContracts");
const valid = { type: "logicalPlanProposal", steps: [
  { capabilityId: "set-opacity-v1", params: { opacity: 47 } },
  { capabilityId: "set-layer-name-v1", params: { name: " Hero " } }
] };
const plan = contracts.validateLogicalPlanProposal(valid);
assert.strictEqual(plan.declaredStepCount, 2);
assert.strictEqual(plan.steps[0].ordinal, 0);
assert.strictEqual(plan.steps[1].params.name, " Hero ");
assert(Object.isFrozen(plan) && Object.isFrozen(plan.steps) && Object.isFrozen(plan.steps[1].params));
assert.strictEqual(plan.planSemanticSignature, contracts.validateLogicalPlanProposal(JSON.parse(JSON.stringify(valid))).planSemanticSignature);
assert.notStrictEqual(plan.planSemanticSignature, contracts.validateLogicalPlanProposal({ type: "logicalPlanProposal", steps: [valid.steps[0], { capabilityId: "set-layer-name-v1", params: { name: "Hero" } }] }).planSemanticSignature);
function rejects(value, code) { assert.throws(() => contracts.validateLogicalPlanProposal(value), error => error.code === code); }
rejects({ type: "logicalPlanProposal", steps: [] }, "LOGICAL_PLAN_INVALID");
rejects({ type: "logicalPlanProposal", steps: [valid.steps[1], valid.steps[0]] }, "LOGICAL_PLAN_INVALID");
rejects({ type: "logicalPlanProposal", steps: [valid.steps[0], valid.steps[0]] }, "LOGICAL_PLAN_INVALID");
rejects({ type: "logicalPlanProposal", steps: [valid.steps[1], valid.steps[1]] }, "LOGICAL_PLAN_INVALID");
rejects({ type: "logicalPlanProposal", steps: [valid.steps[0], valid.steps[1], valid.steps[0]] }, "LOGICAL_PLAN_INVALID");
rejects({ type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 47, extra: 1 } }, valid.steps[1]] }, "LOGICAL_PLAN_INVALID");
rejects({ type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 47 }, nonce: "x" }, valid.steps[1]] }, "LOGICAL_PLAN_FORBIDDEN_FIELD");
rejects({ type: "logicalPlanProposal", steps: [{ capabilityId: "unknown-v1", params: {} }, valid.steps[1]] }, "LOGICAL_PLAN_INVALID");
assert.strictEqual(contracts.validateCompletionSummary({ completedStepCount: 1, objectiveTerminalSuccess: false }).partialCompletion, true);
console.log("Vela logical plan contracts: PASS");
