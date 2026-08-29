#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const taskRunModule = require("../client/js/vela/velaTaskRun");
const runtime = require("./velaNodeRuntime");
const protocol = protocolModule.createProtocol(runtime);
let assertions = 0;
let ids = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectCode(callback, code, message) { assert.throws(callback, function (error) { return error && error.code === code; }, message); assertions += 1; }

function browserSmoke() {
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaTaskRun"), "utf8");
    const moduleSentinel = { exports: { untouched: true } };
    const sandbox = { Object, Error, module: moduleSentinel, require() { throw new Error("browser path called require"); } };
    sandbox.self = sandbox; sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: "velaTaskRun.js" });
    check(typeof sandbox.VelaTaskRun.createTaskRun === "function", "Browser-global TaskRun registration works.");
    check(moduleSentinel.exports.untouched === true, "CEP-like browser identity wins over ambient CommonJS descriptors.");
}
function makeRun() {
    const n = ++ids;
    let tick = n * 100;
    return taskRunModule.createTaskRun({ protocol, taskRunId: "task_run_" + n, authorizedPlanId: "authority_plan_" + n, executionPlanId: "execution_plan_" + n, now() { return ++tick; } });
}

function run() {
    check(typeof taskRunModule.createTaskRun === "function", "Node/CommonJS import works.");
    browserSmoke();
    check(taskRunModule.TASK_STATE.join(",") === "active,paused,waiting-approval,blocked,completed,cancelled" && taskRunModule.TASK_STATE.indexOf("failed") === -1, "TaskRun uses the frozen task vocabulary without a failed state.");
    const initial = makeRun();
    const initialView = initial.snapshot();
    check(initialView.state === "waiting-approval" && initialView.executionArmed === false, "New TaskRun starts waiting-approval and unarmed.");
    check(Object.isFrozen(initialView) && initialView.taskRunId !== initialView.authorizedPlanId && initialView.authorizedPlanId !== initialView.executionPlanId && initialView.taskRunId !== initialView.executionPlanId, "TaskRun snapshot is immutable and all three identities are distinct.");
    const active = initial.arm();
    check(active.state === "active" && active.executionArmed === true, "arm transitions waiting-approval to active.");
    expectCode(function () { initial.arm(); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "A TaskRun can arm only once.");
    const completed = initial.complete();
    check(completed.state === "completed" && completed.executionArmed === false, "complete terminalizes and disarms.");
    expectCode(function () { initial.arm(); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Completed runs cannot re-arm.");

    const blockedRun = makeRun(); blockedRun.arm();
    const blocked = blockedRun.block(protocol.ERROR_CODES.CONTEXT_STALE);
    check(blocked.state === "blocked" && blocked.executionArmed === false && blocked.terminalErrorCode === protocol.ERROR_CODES.CONTEXT_STALE, "block records stable terminal error and disarms.");
    expectCode(function () { blockedRun.arm(); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Blocked runs cannot re-arm.");

    const waitingCancel = makeRun();
    const cancelledWaiting = waitingCancel.cancel("user-cancelled");
    check(cancelledWaiting.state === "cancelled" && cancelledWaiting.executionArmed === false && cancelledWaiting.cancelReason === "user-cancelled", "Waiting cancellation records reason and remains unarmed.");
    const activeCancel = makeRun(); activeCancel.arm();
    check(activeCancel.cancel("stop").executionArmed === false, "Active cancellation disarms.");
    expectCode(function () { activeCancel.complete(); }, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Cancelled runs are terminal.");
    const disposed = makeRun();
    check(disposed.dispose().state === "cancelled" && disposed.snapshot().cancelReason === "disposed", "dispose cancels and disarms a non-terminal run.");

    const a = makeRun(); const b = makeRun();
    a.arm();
    check(a.snapshot().executionArmed === true && b.snapshot().executionArmed === false, "executionArmed cannot transfer between TaskRuns.");
    check(!Object.prototype.hasOwnProperty.call(a.snapshot(), "currentStepIndex") && !Object.prototype.hasOwnProperty.call(a.snapshot(), "completedStepCount") && !Object.prototype.hasOwnProperty.call(a.snapshot(), "failureStepIndex"), "TaskRun does not duplicate PlanStore progress.");
    check(typeof a.retry === "undefined" && typeof a.replan === "undefined" && typeof a.rollback === "undefined" && typeof a.pause === "undefined", "TaskRun exposes no retry, replan, rollback, or pause API.");
    check(!/localStorage|Agent|permission|grant/.test(fs.readFileSync(require.resolve("../client/js/vela/velaTaskRun"), "utf8")), "TaskRun has no persistence, Agent ownership, permission, or grant semantics.");
    console.log("PASS Vela TaskRun: " + assertions + " assertions.");
}

try { run(); } catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
