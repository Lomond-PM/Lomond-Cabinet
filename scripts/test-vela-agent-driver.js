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
    const calls = { reason: 0, submit: 0, continue: 0, committedVerify: 0, verify: 0, cancel: 0, observe: 0 };
    let observation = null;
    const driver = driverModule.createAgentDriver({
        beginTurn() { return Object.freeze({ sessionId: "session_driver", turnId: "turn_driver" }); },
        observe() { calls.observe += 1; if (options.observeError) return Promise.reject(Object.assign(new Error(options.observeError), { code: options.observeError })); observation = Object.freeze({ observationRevision: calls.observe }); return Promise.resolve(observation); },
        getObservation() { return observation; },
        appendSessionEvent(event) { events.push(event); return event; },
        onListenerError: options.onListenerError
    });
    const port = {
        reason() { calls.reason += 1; return Promise.resolve(options.reason || { capabilityId: "set-opacity-v1", params: { opacity: options.opacity === undefined ? 42 : options.opacity } }); },
        submitIntent(input) { calls.submit += 1; calls.intent = input; return options.executionError ? Promise.reject(Object.assign(new Error(options.executionError), { code: options.executionError })) : Promise.resolve(options.outcome || { state: "executed", committed: true, transcriptSettled: options.transcriptSettled !== false }); },
        continueApprovedReview(input) { calls.continue += 1; calls.continuation = input; if (options.deferContinuation) return new Promise((resolve) => { calls.releaseContinuation = resolve; }); return options.continuationError ? Promise.reject(Object.assign(new Error(options.continuationError), { code: options.continuationError })) : Promise.resolve(options.continuation || { state: "verification-required", code: null }); },
        verifyCommittedAction(input) { calls.committedVerify += 1; calls.committedVerificationInput = input; if (options.deferCommittedVerification) return new Promise((resolve) => { calls.releaseCommittedVerification = resolve; }); return Promise.resolve(options.committedVerification || { state: "verified", code: null }); },
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

    const text = harness({ reason: { type: "text", text: "safe text" } });
    const textCompleted = await text.driver.startObjective({ message: "hello", endpoint: "e", model: "m" });
    equal(textCompleted.terminal.outcome, "completed", "bounded text completes the objective without entering the action path");
    equal(textCompleted.taskPlan, null, "bounded text creates no TaskPlan");
    equal(text.calls.submit, 0, "bounded text submits no mutation intent");
    equal(text.calls.verify, 0, "bounded text performs no action verification");
    check(["ae/state-observed", "agent/action-performed", "task/review-required", "tool/result"].every((kind) => text.events.every((event) => event.kind !== kind)), "bounded text fabricates no action or AE observation events");
    const textNext = await text.driver.startObjective({ message: "hello again", endpoint: "e", model: "m" });
    equal(textNext.objectiveId, "objective_agent_2", "a fresh objective starts after bounded text completion");

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
    const review = harness({ opacity: 47, outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", beforeValue: 100, reviewCorrelation: "opaque_review_correlation_1" } });
    const suspended = await review.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    equal(suspended.state, "awaiting-review", "REVIEW_REQUIRED suspends the active objective");
    equal(suspended.objectiveId, "objective_agent_1", "suspension preserves objective identity");
    equal(suspended.suspendedReview.taskPlanId, suspended.taskPlan.planId, "suspension preserves TaskPlan identity");
    equal(suspended.suspendedReview.taskPlanRevision, suspended.taskPlan.revision, "suspension binds the exact TaskPlan revision");
    equal(suspended.suspendedReview.beforeValue, 100, "suspension retains only the trusted numeric presentation baseline");
    equal(suspended.suspendedReview.params.opacity, 47, "the requested opacity remains distinct from the presentation baseline");
    check(Object.isFrozen(suspended.suspendedReview) && Object.isFrozen(suspended.suspendedReview.params) && Object.isFrozen(suspended.suspendedReview.localExpectation), "suspended review record is deeply immutable at every owned nested value");
    equal(suspended.suspendedReview.reviewCorrelation, "opaque_review_correlation_1", "suspended review holds only the opaque Runtime correlation");
    check(["authorizedPlan", "boundPlan", "nonce", "executionContext", "executionReservation", "taskRun", "hostPayload", "targetBinding", "nativeLayerId", "valueDigest", "binding", "observation", "contextFingerprint"].every((key) => !Object.prototype.hasOwnProperty.call(suspended.suspendedReview, key)), "suspended review contains no execution, binding, digest, observation, or Host authority object");
    equal(review.events.filter((event) => event.kind === "task/review-required").length, 1, "review-required lifecycle evidence is appended exactly once");
    equal(review.calls.verify, 0, "suspension invokes no verification or mutation continuation");
    await code(() => review.driver.startObjective({ message: "second", endpoint: "e", model: "m" }), "AGENT_DRIVER_BUSY", "a suspended objective excludes a second objective");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: "stale", revision: suspended.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "stale review identity fails closed");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision + 1, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "stale review revision fails closed");
    const approved = await review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision, outcome: "approved" });
    equal(approved.state, "terminal", "approved production execution completes after committed-target verification");
    equal(approved.terminal.outcome, "completed", "verified committed target completes the reviewed objective");
    equal(approved.objectiveId, suspended.objectiveId, "approval preserves the same objective");
    equal(approved.taskPlan, suspended.taskPlan, "approval preserves the immutable TaskPlan reference");
    equal(approved.suspendedReview, null, "approval consumes the suspended record");
    check(Object.isFrozen(approved.reviewResolution) && approved.reviewResolution.outcome === "approved", "approval creates one immutable closed resolution result");
    equal(review.calls.submit, 1, "approval does not resubmit or compile an action");
    equal(review.calls.continue, 1, "approval invokes one bounded Runtime continuation");
    equal(review.calls.continuation.objectiveId, suspended.objectiveId, "continuation preserves the objective identity");
    equal(review.calls.continuation.reviewCorrelation, "opaque_review_correlation_1", "continuation returns the opaque Runtime correlation only");
    equal(review.calls.verify, 0, "A1 production continuation never falls back to legacy current-selection verification");
    equal(review.calls.committedVerify, 1, "reviewed production execution invokes committed-target verification exactly once");
    check(review.calls.committedVerificationInput.objectiveId === suspended.objectiveId && review.calls.committedVerificationInput.taskId === suspended.taskId && review.calls.committedVerificationInput.expectedOpacity === 47 && !Object.prototype.hasOwnProperty.call(review.calls.committedVerificationInput, "planId"), "Driver passes only logical identity and expectation to committed verification");
    equal(review.events.filter((event) => event.kind === "tool/result" && event.payload.committed === true).length, 1, "A1 reuses the existing committed tool-result event without expanding Driver projection data");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "duplicate approval fails closed");
    await code(() => Promise.resolve().then(() => review.driver.resolveReview({ reviewId: suspended.suspendedReview.reviewId, revision: suspended.suspendedReview.revision, outcome: "rejected" })), "AGENT_DRIVER_REVIEW_INVALID", "approval followed by rejection fails closed");

    const blockedContinuation = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_blocked" }, continuation: { state: "blocked", code: "CONTEXT_STALE" } });
    const blockedPending = await blockedContinuation.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const blockedApproved = await blockedContinuation.driver.resolveReview({ reviewId: blockedPending.suspendedReview.reviewId, revision: blockedPending.suspendedReview.revision, outcome: "approved" });
    equal(blockedApproved.terminal.outcome, "blocked", "a blocked production continuation terminalizes the objective without verification");
    equal(blockedApproved.terminal.code, "CONTEXT_STALE", "a blocked continuation preserves its canonical code");
    equal(blockedContinuation.calls.verify, 0, "a blocked continuation never invokes legacy verification");

    const cancelledContinuation = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_cancelled" }, continuation: { state: "cancelled", code: "AGENT_DRIVER_CANCELLED" } });
    const continuationPending = await cancelledContinuation.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const continuationCancelled = await cancelledContinuation.driver.resolveReview({ reviewId: continuationPending.suspendedReview.reviewId, revision: continuationPending.suspendedReview.revision, outcome: "approved" });
    equal(continuationCancelled.terminal.outcome, "cancelled", "a cancelled production continuation preserves cancelled lifecycle truth");
    equal(cancelledContinuation.calls.verify, 0, "a cancelled continuation never invokes legacy verification");

    const mismatchedCommitted = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_mismatch" }, committedVerification: { state: "unverified", code: "AGENT_DRIVER_TASK_UNVERIFIED" } });
    const mismatchPending = await mismatchedCommitted.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const mismatchTerminal = await mismatchedCommitted.driver.resolveReview({ reviewId: mismatchPending.suspendedReview.reviewId, revision: mismatchPending.suspendedReview.revision, outcome: "approved" });
    equal(mismatchTerminal.terminal.code, "AGENT_DRIVER_TASK_UNVERIFIED", "committed-target mismatch blocks with the existing unverified code");
    equal(mismatchedCommitted.calls.verify, 0, "committed-target mismatch never falls back to legacy verification");

    const unavailableCommitted = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_unavailable" }, committedVerification: { state: "blocked", code: "VERIFICATION_UNAVAILABLE" } });
    const unavailablePending = await unavailableCommitted.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const unavailableTerminal = await unavailableCommitted.driver.resolveReview({ reviewId: unavailablePending.suspendedReview.reviewId, revision: unavailablePending.suspendedReview.revision, outcome: "approved" });
    equal(unavailableTerminal.terminal.code, "VERIFICATION_UNAVAILABLE", "committed-target unavailable preserves the canonical blocked code");

    const pendingCommitted = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_pending" }, deferCommittedVerification: true });
    const pendingCommittedReview = await pendingCommitted.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const pendingCommittedResult = pendingCommitted.driver.resolveReview({ reviewId: pendingCommittedReview.suspendedReview.reviewId, revision: pendingCommittedReview.suspendedReview.revision, outcome: "approved" });
    await Promise.resolve(); await Promise.resolve();
    equal(pendingCommitted.driver.getSnapshot().state, "verifying", "Driver remains verifying while committed-target observation is pending");
    await code(() => pendingCommitted.driver.startObjective({ message: "busy", endpoint: "e", model: "m" }), "AGENT_DRIVER_BUSY", "a pending committed-target Verify keeps the objective busy");
    check(pendingCommitted.driver.cancel(), "cancel wins while committed-target Verify is pending");
    pendingCommitted.calls.releaseCommittedVerification({ state: "verified", code: null });
    equal((await pendingCommittedResult).terminal.outcome, "cancelled", "late committed-target success cannot resurrect a cancelled objective");
    equal(pendingCommitted.events.filter((event) => event.kind === "task/cancelled").length, 1, "late committed-target success cannot duplicate the cancelled terminal event");
    equal(pendingCommitted.events.filter((event) => event.kind === "task/completed" || event.kind === "task/blocked").length, 0, "late committed-target success emits no conflicting terminal event");

    for (const lateVerification of [{ state: "unverified", code: "AGENT_DRIVER_TASK_UNVERIFIED" }, { state: "blocked", code: "VERIFICATION_UNAVAILABLE" }]) {
        const late = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_late_" + lateVerification.state }, deferCommittedVerification: true });
        const lateReview = await late.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
        const lateResult = late.driver.resolveReview({ reviewId: lateReview.suspendedReview.reviewId, revision: lateReview.suspendedReview.revision, outcome: "approved" });
        await Promise.resolve(); await Promise.resolve();
        check(late.driver.cancel(), "cancel wins before late committed-target " + lateVerification.state + " settlement");
        late.calls.releaseCommittedVerification(lateVerification);
        equal((await lateResult).terminal.outcome, "cancelled", "late committed-target " + lateVerification.state + " cannot replace cancelled truth");
        equal(late.calls.committedVerify, 1, "late committed-target " + lateVerification.state + " performs at most one Verify call");
        equal(late.calls.verify, 0, "late committed-target " + lateVerification.state + " never falls back to current-selection Verify");
        equal(late.events.filter((event) => /^task\/(completed|blocked|cancelled)$/.test(event.kind)).length, 1, "late committed-target " + lateVerification.state + " preserves exactly one terminal event");
    }

    const pendingContinuation = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_pending_continuation" }, deferContinuation: true });
    const pendingContinuationReview = await pendingContinuation.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const pendingContinuationResult = pendingContinuation.driver.resolveReview({ reviewId: pendingContinuationReview.suspendedReview.reviewId, revision: pendingContinuationReview.suspendedReview.revision, outcome: "approved" });
    await Promise.resolve();
    equal(pendingContinuation.driver.getSnapshot().state, "awaiting-outcome", "Driver remains busy while approved production continuation is pending");
    await code(() => pendingContinuation.driver.startObjective({ message: "busy", endpoint: "e", model: "m" }), "AGENT_DRIVER_BUSY", "pending continuation excludes a second objective");
    await code(() => Promise.resolve().then(() => pendingContinuation.driver.resolveReview({ reviewId: pendingContinuationReview.suspendedReview.reviewId, revision: pendingContinuationReview.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "duplicate Approve is rejected while the first continuation is pending");
    check(pendingContinuation.driver.cancel(), "cancel terminalizes a pending approved continuation");
    pendingContinuation.calls.releaseContinuation({ state: "verification-required", code: null });
    equal((await pendingContinuationResult).terminal.outcome, "cancelled", "late committed continuation cannot resurrect a cancelled Driver");
    equal(pendingContinuation.calls.continue, 1, "duplicate Approve cannot create a second continuation");
    equal(pendingContinuation.calls.committedVerify, 0, "cancelled pending continuation cannot start committed-target Verify");

    const rejectedReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_2" } });
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

    const cancelledReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_3" } });
    const cancelledPending = await cancelledReview.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    check(cancelledReview.driver.cancel(), "a suspended review can be cancelled");
    equal(cancelledReview.driver.getSnapshot().terminal.outcome, "cancelled", "cancel terminalizes the suspended objective");
    await code(() => Promise.resolve().then(() => cancelledReview.driver.resolveReview({ reviewId: cancelledPending.suspendedReview.reviewId, revision: cancelledPending.suspendedReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "cancelled review cannot be approved late");

    const disposedReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_4" } });
    const disposedPending = await disposedReview.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    check(disposedReview.driver.dispose(), "Driver disposes while review is suspended");
    await code(() => Promise.resolve().then(() => disposedReview.driver.resolveReview({ reviewId: disposedPending.suspendedReview.reviewId, revision: disposedPending.suspendedReview.revision, outcome: "rejected" })), "AGENT_DRIVER_DISPOSED", "disposed Driver rejects late review resolution");

    let reviewListenerFailures = 0;
    const listenerReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "opaque_review_correlation_5" }, onListenerError() { reviewListenerFailures += 1; } });
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
    const cancellingPort = { reason() { throw new Error("unreachable"); }, submitIntent() { throw new Error("unreachable"); }, continueApprovedReview() { throw new Error("unreachable"); }, verifyCommittedAction() { throw new Error("unreachable"); }, verifyOpacity() { throw new Error("unreachable"); }, cancel() { return true; } };
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
