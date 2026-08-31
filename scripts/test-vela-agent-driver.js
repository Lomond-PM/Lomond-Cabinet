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
    const review = harness({ opacity: 47, outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", beforeValue: 100 } });
    const suspended = await review.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    equal(suspended.state, "awaiting-review", "REVIEW_REQUIRED suspends the active objective");
    equal(suspended.objectiveId, "objective_agent_1", "suspension preserves objective identity");
    equal(suspended.suspendedReview.taskPlanId, suspended.taskPlan.planId, "suspension preserves TaskPlan identity");
    equal(suspended.suspendedReview.taskPlanRevision, suspended.taskPlan.revision, "suspension binds the exact TaskPlan revision");
    equal(suspended.suspendedReview.beforeValue, 100, "suspension retains only the trusted numeric presentation baseline");
    equal(suspended.suspendedReview.params.opacity, 47, "the requested opacity remains distinct from the presentation baseline");
    check(Object.isFrozen(suspended.suspendedReview) && Object.isFrozen(suspended.suspendedReview.params) && Object.isFrozen(suspended.suspendedReview.localExpectation), "suspended review record is deeply immutable at every owned nested value");
    check(["authorizedPlan", "boundPlan", "nonce", "executionContext", "executionReservation", "taskRun", "hostPayload", "targetBinding", "nativeLayerId", "valueDigest", "binding", "observation"].every((key) => !Object.prototype.hasOwnProperty.call(suspended.suspendedReview, key)), "suspended review contains no execution, binding, digest, observation, or Host authority object");
    equal(review.events.filter((event) => event.kind === "task/review-required").length, 1, "review-required lifecycle evidence is appended exactly once");
    equal(review.calls.verify, 0, "suspension invokes no verification or mutation continuation");
    await code(() => review.driver.startObjective({ message: "second", endpoint: "e", model: "m" }), "AGENT_DRIVER_BUSY", "a suspended objective excludes a second objective");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: "stale", revision: suspended.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "stale review identity fails closed");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision + 1, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "stale review revision fails closed");
    const approved = review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision, outcome: "approved" });
    equal(approved.state, "awaiting-outcome", "approved B1 review waits for a future owner continuation");
    equal(approved.objectiveId, suspended.objectiveId, "approval preserves the same objective");
    equal(approved.taskPlan, suspended.taskPlan, "approval preserves the immutable TaskPlan reference");
    equal(approved.suspendedReview, null, "approval consumes the suspended record");
    check(Object.isFrozen(approved.reviewResolution) && approved.reviewResolution.outcome === "approved", "approval creates one immutable closed resolution result");
    equal(review.calls.submit, 1, "approval does not resubmit or compile an action");
    equal(review.calls.verify, 0, "approval does not execute or verify");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "duplicate approval fails closed");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision, outcome: "rejected" })), "AGENT_DRIVER_REVIEW_INVALID", "approval followed by rejection fails closed");

    const rejectedReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED" } });
    const rejectedPending = await rejectedReview.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const rejected = rejectedReview.driver.resolveReview({ reviewId: rejectedPending.suspendedReview.reviewId, revision: rejectedPending.suspendedReview.revision, outcome: "rejected" });
    equal(rejected.terminal.outcome, "rejected", "user rejection has a distinct terminal outcome");
    equal(rejected.terminal.code, "REVIEW_REJECTED", "user rejection has a distinct stable code");
    equal(rejectedReview.events.filter((event) => event.kind === "task/review-rejected").length, 1, "rejection lifecycle evidence is appended exactly once");
    equal(rejectedReview.calls.verify, 0, "rejection performs no mutation continuation");
    await code(() => Promise.resolve().then(() => rejectedReview.driver.resolveReview({ reviewId: rejectedPending.suspendedReview.reviewId, revision: rejectedPending.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "rejection followed by approval fails closed");
    const replacement = await rejectedReview.driver.startObjective({ message: "new", endpoint: "e", model: "m" });
    await code(() => Promise.resolve().then(() => rejectedReview.driver.resolveReview({ reviewId: rejectedPending.suspendedReview.reviewId, revision: rejectedPending.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "a previous objective token cannot affect a replacement objective");
    check(replacement.objectiveId !== rejectedPending.objectiveId, "replacement objective has fresh identity");

    const cancelledReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED" } });
    const cancelledPending = await cancelledReview.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    check(cancelledReview.driver.cancel(), "a suspended review can be cancelled");
    equal(cancelledReview.driver.getSnapshot().terminal.outcome, "cancelled", "cancel terminalizes the suspended objective");
    await code(() => Promise.resolve().then(() => cancelledReview.driver.resolveReview({ reviewId: cancelledPending.suspendedReview.reviewId, revision: cancelledPending.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "cancelled review cannot be approved late");

    const disposedReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED" } });
    const disposedPending = await disposedReview.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    check(disposedReview.driver.dispose(), "Driver disposes while review is suspended");
    await code(() => Promise.resolve().then(() => disposedReview.driver.resolveReview({ reviewId: disposedPending.suspendedReview.reviewId, revision: disposedPending.suspendedReview.revision, outcome: "rejected" })), "AGENT_DRIVER_DISPOSED", "disposed Driver rejects late review resolution");

    let reviewListenerFailures = 0;
    const listenerReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED" }, onListenerError() { reviewListenerFailures += 1; } });
    listenerReview.driver.subscribe((snapshot) => { if (snapshot.state === "awaiting-review" || snapshot.state === "terminal") throw new Error("listener"); });
    const listenerPending = await listenerReview.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const listenerRejected = listenerReview.driver.resolveReview({ reviewId: listenerPending.suspendedReview.reviewId, revision: listenerPending.suspendedReview.revision, outcome: "rejected" });
    equal(listenerRejected.terminal.outcome, "rejected", "listener failures cannot change review terminal truth");
    check(reviewListenerFailures >= 2, "review listener failures are reported and contained");
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
