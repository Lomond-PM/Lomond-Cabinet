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
    const limits = driverModule.LOOP_DEFAULT_LIMITS;
    check(Object.isFrozen(limits) && limits.maxIterations === 2 && limits.maxProviderCalls === 2 && limits.maxActionAttempts === 2 && limits.maxConsecutiveNoProgress === 1, "Driver owns immutable bounded default loop limits");
    const MAY = driverModule.REPLAN_CLASSIFICATIONS.MAY_REPLAN;
    const NEVER = driverModule.REPLAN_CLASSIFICATIONS.NEVER_REPLAN;
    const SUCCESS = driverModule.REPLAN_CLASSIFICATIONS.SUCCESS;
    function classify(code, committed, verificationState) { return driverModule.classifyReplanEligibility({ code, committed, verificationState }).classification; }
    equal(classify("CONTEXT_STALE", false, null), MAY, "CONTEXT_STALE is eligible only for a future fresh iteration");
    equal(classify("UNKNOWN_TARGET", false, null), MAY, "confirmed noncommitted UNKNOWN_TARGET may replan");
    equal(classify("UNKNOWN_TARGET", null, null), NEVER, "uncertain UNKNOWN_TARGET fails closed");
    equal(classify("PLAN_FAILED", false, null), MAY, "allowlisted confirmed noncommitted PLAN_FAILED may replan");
    equal(classify("PLAN_FAILED", null, null), NEVER, "uncertain PLAN_FAILED fails closed");
    equal(classify("AGENT_DRIVER_TASK_UNVERIFIED", true, "mismatch"), MAY, "committed verification mismatch may replan through fresh observation");
    equal(classify("AGENT_DRIVER_TASK_UNVERIFIED", true, null), NEVER, "unclassified committed verification state fails closed");
    ["PERMISSION_DENIED", "LIFECYCLE_BLOCKED", "REVIEW_REJECTED", "AGENT_DRIVER_CANCELLED", "PROVIDER_TIMEOUT", "PROVIDER_CONNECTION_FAILED", "PROVIDER_RESPONSE_INVALID", "VERIFICATION_UNAVAILABLE", "BUDGET_EXHAUSTED", "NO_PROGRESS", "UNKNOWN_FAILURE"].forEach((failureCode) => equal(classify(failureCode, false, null), NEVER, failureCode + " never replans by default"));
    equal(classify(null, true, "matches"), SUCCESS, "matching verification is terminal success");
    equal(classify(null, false, "text-completed"), SUCCESS, "bounded text completion is terminal success");
    const observationA = driverModule.createObservationSignature({ targetAvailable: true, targetClass: "layer-opacity", observedOpacityDigest: "sha256:aaa", observationRevision: 1, nativeLayerId: 7, requestId: "req_a" });
    const observationAWithDifferentIds = driverModule.createObservationSignature({ observedOpacityDigest: "sha256:aaa", targetClass: "layer-opacity", targetAvailable: true, observationRevision: 99, nativeLayerId: 88, requestId: "req_b" });
    const observationB = driverModule.createObservationSignature({ targetAvailable: true, targetClass: "layer-opacity", observedOpacityDigest: "sha256:bbb" });
    equal(observationA, observationAWithDifferentIds, "observation signature ignores revisions, native ids, and request ids");
    check(observationA !== observationB && observationA === "{\"observedOpacityDigest\":\"sha256:aaa\",\"targetAvailable\":true,\"targetClass\":\"layer-opacity\"}", "observation signature is canonical and changes only with trusted bounded semantics");
    const intentA = driverModule.createIntentSignature({ intentId: "intent_a", capabilityId: "set-opacity-v1", requestedOperation: "mutate", canonicalParams: { opacity: 47 }, targetScope: ["layer", "property"], candidateId: "candidate_a", planId: "plan_a" });
    const intentAWithDifferentIds = driverModule.createIntentSignature({ planId: "plan_b", targetScope: ["layer", "property"], canonicalParams: { opacity: 47 }, requestedOperation: "mutate", capabilityId: "set-opacity-v1", intentId: "intent_b", reviewId: "review_b" });
    const intentB = driverModule.createIntentSignature({ capabilityId: "set-opacity-v1", requestedOperation: "mutate", canonicalParams: { opacity: 48 }, targetScope: ["layer", "property"] });
    equal(intentA, intentAWithDifferentIds, "intent signature ignores identity and preserves canonical object order");
    check(intentA !== intentB, "intent signature changes when effective canonical params change");
    const repeated = driverModule.evaluateNoProgress({ observationSignature: observationA, intentSignature: intentA, failureClass: "PLAN_FAILED", noProgressCount: 0 }, { observationSignature: observationAWithDifferentIds, intentSignature: intentAWithDifferentIds, failureClass: "PLAN_FAILED", requestId: "different", errorText: "different words" }, limits.maxConsecutiveNoProgress);
    check(repeated.noProgressCount === 1 && repeated.replanAllowed === false && repeated.reason === "no-progress", "one consecutive semantic repeat reaches the frozen no-progress threshold");
    const changedObservation = driverModule.evaluateNoProgress({ observationSignature: observationA, intentSignature: intentA, failureClass: "PLAN_FAILED", noProgressCount: 1 }, { observationSignature: observationB, intentSignature: intentA, failureClass: "PLAN_FAILED" }, limits.maxConsecutiveNoProgress);
    const changedIntent = driverModule.evaluateNoProgress({ observationSignature: observationA, intentSignature: intentA, failureClass: "PLAN_FAILED", noProgressCount: 1 }, { observationSignature: observationA, intentSignature: intentB, failureClass: "PLAN_FAILED" }, limits.maxConsecutiveNoProgress);
    const changedFailure = driverModule.evaluateNoProgress({ observationSignature: observationA, intentSignature: intentA, failureClass: "PLAN_FAILED", noProgressCount: 1 }, { observationSignature: observationA, intentSignature: intentA, failureClass: "UNKNOWN_TARGET" }, limits.maxConsecutiveNoProgress);
    check([changedObservation, changedIntent, changedFailure].every((result) => result.noProgressCount === 0 && result.replanAllowed === true), "any trusted semantic dimension change resets no-progress");
    const good = harness();
    let listenerFailures = 0;
    good.driver.subscribe(() => { if (good.driver.getSnapshot().state === "reasoning") { throw new Error("listener"); } });
    const completed = await good.driver.startObjective({ message: "Set opacity to 42", endpoint: "http://127.0.0.1:1234", model: "m" });
    equal(completed.state, "terminal", "objective reaches terminal");
    equal(completed.terminal.outcome, "completed", "matching fresh verification completes objective");
    check(Object.isFrozen(completed.loop) && Object.isFrozen(completed.loop.budgets) && completed.loop.iterationIndex === 0 && completed.loop.budgets.iterationsUsed === 1 && completed.loop.budgets.providerCallsUsed === 1 && completed.loop.budgets.actionAttemptsUsed === 1 && completed.loop.noProgressCount === 0, "snapshot exposes only bounded first-iteration counters");
    check(completed.loop.budgets.iterationsUsed <= limits.maxIterations && completed.loop.budgets.providerCallsUsed <= limits.maxProviderCalls && completed.loop.budgets.actionAttemptsUsed <= limits.maxActionAttempts, "production counters cannot exceed immutable limits");
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
    check(textCompleted.loop.iterationIndex === 0 && textCompleted.loop.budgets.iterationsUsed === 1 && textCompleted.loop.budgets.providerCallsUsed === 1 && textCompleted.loop.budgets.actionAttemptsUsed === 0, "text consumes one iteration and Provider call but no action attempt");
    equal(text.calls.submit, 0, "bounded text submits no mutation intent");
    equal(text.calls.verify, 0, "bounded text performs no action verification");
    check(["ae/state-observed", "agent/action-performed", "task/review-required", "tool/result"].every((kind) => text.events.every((event) => event.kind !== kind)), "bounded text fabricates no action or AE observation events");
    const textNext = await text.driver.startObjective({ message: "hello again", endpoint: "e", model: "m" });
    equal(textNext.objectiveId, "objective_agent_2", "a fresh objective starts after bounded text completion");

    const mismatch = harness({ verification: { fresh: true, matches: false, opacity: 41 } });
    const mismatchResult = await mismatch.driver.startObjective({ message: "set", endpoint: "e", model: "m" });
    equal(mismatchResult.terminal.code, "AGENT_DRIVER_TASK_UNVERIFIED", "fresh mismatch blocks objective");
    check(mismatchResult.state === "terminal" && mismatchResult.counters.replans === 0 && mismatch.calls.reason === 1 && mismatch.calls.submit === 1, "eligible mismatch remains terminal with no real B1 replan");
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
    equal(suspended.loop.budgets.actionAttemptsUsed, 0, "waiting for human Review consumes no action-attempt budget");
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
    equal(approved.loop.budgets.actionAttemptsUsed, 1, "approved continuation establishes exactly one execution-attempt ownership");
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
    equal(blockedApproved.terminal.code, "AGENT_DRIVER_REPLAN_EXHAUSTED", "CONTEXT_STALE without trusted committed truth fails closed without replan");
    equal(blockedContinuation.calls.verify, 0, "a blocked continuation never invokes legacy verification");

    let boundedTurn = 0;
    let boundedObserve = 0;
    let boundedReason = 0;
    let boundedSubmit = 0;
    let boundedContinue = 0;
    let boundedVerify = 0;
    const boundedEvents = [];
    const boundedDriver = driverModule.createAgentDriver({ beginTurn() { boundedTurn += 1; return Object.freeze({ sessionId: "bounded_session", turnId: "bounded_turn_" + boundedTurn }); }, observe() { boundedObserve += 1; return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: boundedObserve }); }, appendSessionEvent(event) { boundedEvents.push(event); return event; } });
    boundedDriver.attachRuntimePort({ reason() { boundedReason += 1; return Promise.resolve({ capabilityId: "set-opacity-v1", params: { opacity: boundedReason === 1 ? 47 : 48 } }); }, submitIntent() { boundedSubmit += 1; return Promise.resolve({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", beforeValue: 100, reviewCorrelation: "bounded_correlation_" + boundedSubmit }); }, continueApprovedReview() { boundedContinue += 1; return Promise.resolve(boundedContinue === 1 ? { state: "blocked", code: "CONTEXT_STALE", committed: false, observation: { targetAvailable: true, targetClass: "layer-opacity", observedOpacityDigest: "sha256:iteration_a" } } : { state: "verification-required", code: null }); }, verifyCommittedAction() { boundedVerify += 1; return Promise.resolve({ state: "verified", code: null }); }, verifyOpacity() { throw new Error("unreachable"); }, cancel() { return true; } });
    const boundedFirst = await boundedDriver.startObjective({ message: "set", endpoint: "e", model: "m" });
    const boundedFirstReview = boundedFirst.suspendedReview;
    const boundedSecond = await boundedDriver.resolveReview({ reviewId: boundedFirstReview.reviewId, revision: boundedFirstReview.revision, outcome: "approved" });
    check(boundedSecond.state === "awaiting-review" && boundedSecond.objectiveId === boundedFirst.objectiveId && boundedSecond.turn.turnId !== boundedFirst.turn.turnId, "eligible precommit CONTEXT_STALE starts iteration one with the same objective and a fresh owner turn");
    check(boundedSecond.loop.iterationIndex === 1 && boundedSecond.loop.budgets.iterationsUsed === 2 && boundedSecond.loop.budgets.providerCallsUsed === 2 && boundedSecond.loop.budgets.actionAttemptsUsed === 1 && boundedSecond.counters.replans === 1, "second iteration reflects exact bounded accounting");
    check(boundedObserve === 2 && boundedReason === 2 && boundedSubmit === 2 && boundedFirstReview.reviewId !== boundedSecond.suspendedReview.reviewId && boundedFirstReview.reviewCorrelation !== boundedSecond.suspendedReview.reviewCorrelation && boundedFirst.taskPlan.planId !== boundedSecond.taskPlan.planId && boundedFirst.taskPlan.steps[0].capabilityIntent.intentId !== boundedSecond.taskPlan.steps[0].capabilityIntent.intentId, "replan performs fresh Observe, Provider reasoning, TaskPlan, intent, and Review ownership");
    await code(() => Promise.resolve().then(() => boundedDriver.resolveReview({ reviewId: boundedFirstReview.reviewId, revision: boundedFirstReview.revision, outcome: "approved" })), "AGENT_DRIVER_REVIEW_INVALID", "old approval is permanently invalid during iteration one");
    equal(boundedDriver.getSnapshot().state, "awaiting-review", "stale approval cannot affect the fresh Review");
    const boundedCompleted = await boundedDriver.resolveReview({ reviewId: boundedSecond.suspendedReview.reviewId, revision: boundedSecond.suspendedReview.revision, outcome: "approved" });
    check(boundedCompleted.terminal.outcome === "completed" && boundedVerify === 1 && boundedCompleted.loop.budgets.actionAttemptsUsed === 2, "second iteration can execute and complete through exactly one committed-target Verify");
    check(boundedEvents.filter((event) => event.kind === "task/started").length === 1 && boundedEvents.filter((event) => event.kind === "task/completed").length === 1, "bounded replan emits one objective start and one terminal event");

    let exhaustedReason = 0;
    let exhaustedSubmit = 0;
    const exhausted = driverModule.createAgentDriver({ beginTurn() { return { sessionId: "exhausted_session", turnId: "exhausted_turn_" + (exhaustedReason + 1) }; }, observe() { return Promise.resolve(); }, getObservation() { return { observationRevision: exhaustedReason + 1 }; }, appendSessionEvent() {} });
    exhausted.attachRuntimePort({ reason() { exhaustedReason += 1; return Promise.resolve({ capabilityId: "set-opacity-v1", params: { opacity: 47 } }); }, submitIntent() { exhaustedSubmit += 1; return Promise.resolve({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "exhausted_correlation_" + exhaustedSubmit }); }, continueApprovedReview() { return Promise.resolve({ state: "blocked", code: "CONTEXT_STALE", committed: false, observation: { targetAvailable: true, targetClass: "layer-opacity", observedOpacityDigest: "sha256:same" } }); }, verifyCommittedAction() { throw new Error("unreachable"); }, verifyOpacity() { throw new Error("unreachable"); }, cancel() { return true; } });
    const exhaustedFirst = await exhausted.startObjective({ message: "set", endpoint: "e", model: "m" });
    const exhaustedSecond = await exhausted.resolveReview({ reviewId: exhaustedFirst.suspendedReview.reviewId, revision: exhaustedFirst.suspendedReview.revision, outcome: "approved" });
    const exhaustedTerminal = await exhausted.resolveReview({ reviewId: exhaustedSecond.suspendedReview.reviewId, revision: exhaustedSecond.suspendedReview.revision, outcome: "approved" });
    check(exhaustedTerminal.terminal.code === "AGENT_DRIVER_REPLAN_EXHAUSTED" && exhaustedTerminal.loop.noProgressCount === 1 && exhaustedTerminal.counters.replans === 1 && exhaustedReason === 2 && exhaustedSubmit === 2, "same second CONTEXT_STALE terminates on no-progress and budget without a third Provider or Review");

    let transitionObserve = 0;
    let releaseTransitionObserve;
    let transitionReason = 0;
    const transitionCancel = driverModule.createAgentDriver({ beginTurn() { return { sessionId: "cancel_session", turnId: "cancel_turn_" + (transitionObserve + 1) }; }, observe() { transitionObserve += 1; return transitionObserve === 1 ? Promise.resolve() : new Promise((resolve) => { releaseTransitionObserve = resolve; }); }, getObservation() { return { observationRevision: transitionObserve }; }, appendSessionEvent() {} });
    transitionCancel.attachRuntimePort({ reason() { transitionReason += 1; return Promise.resolve({ capabilityId: "set-opacity-v1", params: { opacity: 47 } }); }, submitIntent() { return Promise.resolve({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "cancel_transition_review" }); }, continueApprovedReview() { return Promise.resolve({ state: "blocked", code: "CONTEXT_STALE", committed: false, observation: { targetAvailable: true, targetClass: "layer-opacity", observedOpacityDigest: "sha256:cancel" } }); }, verifyCommittedAction() { throw new Error("unreachable"); }, verifyOpacity() { throw new Error("unreachable"); }, cancel() { return true; } });
    const transitionFirst = await transitionCancel.startObjective({ message: "set", endpoint: "e", model: "m" });
    const transitionPending = transitionCancel.resolveReview({ reviewId: transitionFirst.suspendedReview.reviewId, revision: transitionFirst.suspendedReview.revision, outcome: "approved" });
    await Promise.resolve(); await Promise.resolve();
    check(transitionCancel.getSnapshot().state === "observing" && transitionCancel.cancel(), "cancel wins while the second-iteration fresh Observe is pending");
    releaseTransitionObserve();
    const transitionCancelled = await transitionPending;
    check(transitionCancelled.terminal.outcome === "cancelled" && transitionReason === 1 && transitionCancel.getSnapshot().counters.replans === 1, "cancel prevents Provider request two, Review two, and lifecycle resurrection");

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
