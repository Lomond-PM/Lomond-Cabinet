#!/usr/bin/env node
"use strict";

const assert = require("assert");
const controllerModule = require("../client/js/vela/velaController");
const protocolModule = require("../client/js/vela/velaProtocol");
const nodeRuntime = require("./velaNodeRuntime");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function makeHarness(options) {
    options = options || {};
    const protocol = protocolModule.createProtocol(nodeRuntime);
    let counter = 0;
    let executionCalls = 0;
    let discardCalls = 0;
    const preflight = {
        createBoundPlan(input) {
            counter += 1;
            if (options.createCode) return Promise.reject(new protocol.VelaProtocolError(options.createCode));
            return Promise.resolve({
                planId: "plan_" + String(counter).padStart(32, "0"),
                planRevision: counter,
                candidateIds: ["cand_" + String(counter).padStart(32, "0")],
                candidates: [],
                actionCount: 1,
                state: "pending-confirmation",
                nextStep: 0,
                createdAt: counter,
                review: { valueKind: "number", beforeValue: options.beforeValue === undefined ? 20 + counter * 5 : options.beforeValue }
            });
        },
        confirmBoundPlan(input) {
            if (options.confirmCode) return Promise.reject(new protocol.VelaProtocolError(options.confirmCode));
            return Promise.resolve({ state: "confirmed", planId: input.planId });
        },
        executeStep() {
            executionCalls += 1;
            if (options.executeCode) return Promise.reject(new protocol.VelaProtocolError(options.executeCode));
            return Promise.resolve({ candidate: { state: "consumed" }, result: { ok: true } });
        },
        discardBoundPlan() {
            discardCalls += 1;
            return { state: "discarded" };
        }
    };
    const controller = controllerModule.createController({ protocol, preflight });
    return { protocol, controller, preflight, get executionCalls() { return executionCalls; }, get discardCalls() { return discardCalls; } };
}

async function run() {
    const harness = makeHarness();
    check(Object.isFrozen(harness.controller), "Controller instance is frozen.");
    check(controllerModule.isTrustedControllerForProtocol(harness.controller, harness.protocol), "Controller carries exact trusted protocol identity.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: "57" }), "PARAM_OUT_OF_RANGE", "String opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: NaN }), "PARAM_OUT_OF_RANGE", "NaN opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: Infinity }), "PARAM_OUT_OF_RANGE", "Infinity opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: -0 }), "PARAM_OUT_OF_RANGE", "Negative zero opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: 101 }), "PARAM_OUT_OF_RANGE", "Out of range opacity is rejected.");
    await expectCode(harness.controller.createOpacityCandidate({ opacity: 10, target: {} }), "SCHEMA_VALIDATION_FAILED", "UI cannot supply target overrides.");

    const pending = await harness.controller.createOpacityCandidate({ opacity: 57.5 });
    check(pending.state === "pending-confirmation" && pending.beforeValue === 25 && pending.proposedValue === 57.5 && pending.candidateId.indexOf("cand_") === 0, "Valid opacity creates a pending confirmation with review values.");
    check(!JSON.stringify(pending).includes("planId") && !JSON.stringify(pending).includes("Digest") && !JSON.stringify(pending).includes("capture"), "Public UI state does not leak plan, digest or capture.");
    const edited = await harness.controller.createOpacityCandidate({ opacity: 10 });
    check(edited.candidateId !== pending.candidateId && edited.beforeValue === 30 && harness.discardCalls === 1, "Editing discards the previous pending candidate and creates a new candidate with a fresh beforeValue.");
    await expectCode(harness.controller.approveCandidate({ candidateId: pending.candidateId }), "CANDIDATE_NOT_FOUND", "Old edited candidate cannot be approved.");
    const consumed = await harness.controller.approveCandidate({ candidateId: edited.candidateId });
    check(consumed.state === "consumed" && harness.executionCalls === 1, "Approval confirms and executes exactly once.");
    await expectCode(harness.controller.approveCandidate({ candidateId: edited.candidateId }), "CANDIDATE_STATE_INVALID", "Double approve cannot execute again.");
    check(harness.executionCalls === 1, "Double approve does not call executor a second time.");

    const reject = makeHarness();
    const rejectPending = await reject.controller.createOpacityCandidate({ opacity: 20 });
    const rejected = reject.controller.rejectCandidate({ candidateId: rejectPending.candidateId });
    check(rejected.state === "discarded" && reject.executionCalls === 0 && reject.discardCalls === 1, "Reject discards without executing.");
    await expectCode(reject.controller.approveCandidate({ candidateId: rejectPending.candidateId }), "CANDIDATE_STATE_INVALID", "Rejected candidate is terminal.");

    const stale = makeHarness({ executeCode: "CONTEXT_STALE" });
    const stalePending = await stale.controller.createOpacityCandidate({ opacity: 30 });
    await expectCode(stale.controller.approveCandidate({ candidateId: stalePending.candidateId }), "CONTEXT_STALE", "Execution context drift reports stale.");
    check(stale.controller.getUiState().state === "stale", "Stale execution is reflected in UI state.");

    console.log("test-vela-controller: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
