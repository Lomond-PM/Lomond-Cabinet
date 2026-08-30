#!/usr/bin/env node
"use strict";
const assert = require("assert");
const driverModule = require("../client/js/vela/velaAgentDriver");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
async function code(operation, expected, message) { let failure = null; try { await operation(); } catch (error) { failure = error; } assertions += 1; assert.ok(failure && failure.code === expected, message); }
function harness(settings) {
    const options = settings || {};
    const events = [];
    const calls = { reason: 0, submit: 0, verify: 0, cancel: 0, observe: 0 };
    let observation = null;
    const driver = driverModule.createAgentDriver({
        beginTurn() { return Object.freeze({ sessionId: "session_driver", turnId: "turn_driver" }); },
        observe() { calls.observe += 1; if (options.observeError) return Promise.reject(Object.assign(new Error(options.observeError), { code: options.observeError })); observation = Object.freeze({ observationRevision: calls.observe }); return Promise.resolve(observation); },
        getObservation() { return observation; },
        appendSessionEvent(event) { events.push(event); return event; },
        onListenerError: options.onListenerError
    });
    const port = {
        reason() { calls.reason += 1; return Promise.resolve({ capabilityId: "set-opacity-v1", params: { opacity: options.opacity === undefined ? 42 : options.opacity } }); },
        submitIntent(input) { calls.submit += 1; calls.intent = input; return options.executionError ? Promise.reject(Object.assign(new Error(options.executionError), { code: options.executionError })) : Promise.resolve(options.outcome || { state: "executed", committed: true, transcriptSettled: options.transcriptSettled !== false }); },
        verifyOpacity() { calls.verify += 1; return options.verifyError ? Promise.reject(Object.assign(new Error(options.verifyError), { code: options.verifyError })) : Promise.resolve(options.verification || { fresh: true, matches: true, opacity: options.opacity === undefined ? 42 : options.opacity }); },
        cancel() { calls.cancel += 1; return true; }
    };
    check(driver.attachRuntimePort(port), "runtime port attaches once");
    return { driver, events, calls };
}
async function run() {
    const good = harness();
    let listenerFailures = 0;
    good.driver.subscribe(() => { if (good.driver.getSnapshot().state === "reasoning") { throw new Error("listener"); } });
    const completed = await good.driver.startObjective({ message: "Set opacity to 42", endpoint: "http://127.0.0.1:1234", model: "m" });
    equal(completed.state, "terminal", "objective reaches terminal");
    equal(completed.terminal.outcome, "completed", "matching fresh verification completes objective");
    check(Object.isFrozen(completed.taskPlan) && completed.taskPlan.contractType === "task-plan", "Driver produces an immutable formal TaskPlan");
    equal(completed.taskPlan.steps.length, 1, "TaskPlan has exactly one step");
    equal(completed.taskPlan.steps[0].kind, "operate", "TaskPlan contains exactly one operate step");
    equal(completed.taskPlan.steps[0].capabilityIntent.capabilityId, "set-opacity-v1", "Driver creates the bounded CapabilityIntent");
    equal(good.calls.submit, 1, "Driver submits exactly one mutation intent");
    equal(good.calls.verify, 1, "Driver performs one post-action verification");
    equal(good.events.filter((event) => event.kind === "task/completed").length, 1, "completed terminal is appended exactly once");
    const next = await good.driver.startObjective({ message: "another objective", endpoint: "e", model: "m" });
    equal(next.objectiveId, "objective_agent_2", "terminal objective cannot restart and a subsequent objective receives fresh identity");

    const mismatch = harness({ verification: { fresh: true, matches: false, opacity: 41 } });
    equal((await mismatch.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.code, "AGENT_DRIVER_TASK_UNVERIFIED", "fresh mismatch blocks objective");
    equal(mismatch.calls.submit, 1, "mismatch never retries mutation");
    const unavailable = harness({ verifyError: "VERIFICATION_UNAVAILABLE" });
    equal((await unavailable.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.outcome, "blocked", "verification unavailable blocks objective");
    equal(unavailable.calls.submit, 1, "verification unavailable never retries mutation");
    const failed = harness({ executionError: "PLAN_FAILED" });
    equal((await failed.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.code, "PLAN_FAILED", "execution failure blocks with stable code");
    equal(failed.calls.submit, 1, "execution failure is not retried");
    equal(failed.calls.verify, 0, "failed execution is not verified as committed");
    const settled = harness({ transcriptSettled: false });
    equal((await settled.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.outcome, "completed", "transcript settlement failure after commit cannot reinterpret world state");
    equal(settled.calls.submit, 1, "transcript settlement failure never replays mutation");
    const denied = harness({ outcome: { state: "denied", committed: false, code: "PERMISSION_DENIED" } });
    equal((await denied.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.code, "PERMISSION_DENIED", "DENY blocks without replan");
    const review = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED" } });
    equal((await review.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.code, "REVIEW_REQUIRED", "A1 closes REVIEW_REQUIRED safely without new UI");
    const stale = harness({ observeError: "OBSERVATION_RESULT_STALE" });
    equal((await stale.driver.startObjective({ message: "set", endpoint: "e", model: "m" })).terminal.code, "OBSERVATION_RESULT_STALE", "stale observation fails closed");
    equal(stale.calls.submit, 0, "stale observation cannot reach mutation");

    let release;
    const cancelling = driverModule.createAgentDriver({ beginTurn() { return { sessionId: "s", turnId: "t" }; }, observe() { return new Promise((resolve) => { release = resolve; }); }, getObservation() { return null; }, appendSessionEvent() {} });
    const cancellingPort = { reason() { throw new Error("unreachable"); }, submitIntent() { throw new Error("unreachable"); }, verifyOpacity() { throw new Error("unreachable"); }, cancel() { return true; } };
    cancelling.attachRuntimePort(cancellingPort);
    const pending = cancelling.startObjective({ message: "set", endpoint: "e", model: "m" });
    check(cancelling.cancel(), "in-flight observation can be cancelled"); release(null);
    equal((await pending).terminal.outcome, "cancelled", "cancel wins over late observation");
    check(cancelling.dispose(), "Driver disposes once");
    check(!cancelling.dispose(), "Driver dispose is idempotent");
    await code(() => cancelling.startObjective({ message: "set", endpoint: "e", model: "m" }), "AGENT_DRIVER_DISPOSED", "disposed Driver cannot restart");
    console.log("test-vela-agent-driver: " + assertions + " assertions passed");
}
run().catch((error) => { console.error(error && error.stack || error); process.exitCode = 1; });
