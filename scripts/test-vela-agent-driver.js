#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const driverModule = require("../client/js/vela/velaAgentDriver");
const logicalPlanContracts = require("../client/js/vela/velaLogicalPlanContracts");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
async function code(operation, expected, message) { let failure = null; try { await operation(); } catch (error) { failure = error; } assertions += 1; assert.ok(failure && failure.code === expected, message); }
function harness(settings) {
    const options = settings || {};
    const events = [];
    const calls = { reason: 0, submit: 0, continue: 0, committedVerify: 0, verify: 0, cancel: 0, observe: 0, intents: [], continuations: [], committedVerifications: [] };
    let observation = null;
    let turnCount = 0;
    const driver = driverModule.createAgentDriver({
        beginTurn() { turnCount += 1; return Object.freeze({ sessionId: "session_driver", turnId: "turn_driver_" + turnCount }); },
        observe() { calls.observe += 1; if (options.observeError) return Promise.reject(Object.assign(new Error(options.observeError), { code: options.observeError })); observation = Object.freeze({ observationRevision: calls.observe }); return Promise.resolve(observation); },
        getObservation() { return observation; },
        appendSessionEvent(event) { events.push(event); return event; },
        onListenerError: options.onListenerError
    });
    const port = {
        reason() { calls.reason += 1; return Promise.resolve(options.reason || { capabilityId: "set-opacity-v1", params: { opacity: options.opacity === undefined ? 42 : options.opacity } }); },
        submitIntent(input) { calls.submit += 1; calls.intent = input; calls.intents.push(input); return options.executionError ? Promise.reject(Object.assign(new Error(options.executionError), { code: options.executionError })) : Promise.resolve(options.outcome || { state: "executed", committed: true, transcriptSettled: options.transcriptSettled !== false }); },
        continueApprovedReview(input) { calls.continue += 1; calls.continuation = input; calls.continuations.push(input); if (options.deferContinuation) return new Promise((resolve) => { calls.releaseContinuation = resolve; }); return options.continuationError ? Promise.reject(Object.assign(new Error(options.continuationError), { code: options.continuationError })) : Promise.resolve(options.continuation || { state: "verification-required", code: null }); },
        verifyCommittedAction(input) { calls.committedVerify += 1; calls.committedVerificationInput = input; calls.committedVerifications.push(input); if (options.deferCommittedVerification) return new Promise((resolve) => { calls.releaseCommittedVerification = resolve; }); return Promise.resolve(options.committedVerification || { state: "verified", code: null }); },
        verifyOpacity() { calls.verify += 1; return options.verifyError ? Promise.reject(Object.assign(new Error(options.verifyError), { code: options.verifyError })) : Promise.resolve(options.verification || { fresh: true, matches: true, opacity: options.opacity === undefined ? 42 : options.opacity }); },
        cancel() { calls.cancel += 1; return true; }
    };
    check(driver.attachRuntimePort(port), "runtime port attaches once");
    return { driver, events, calls };
}
function logicalReplanHarness(logicalPlanProposal, continuationResults, settings) {
    const options = settings || {};
    const calls = { observe: 0, submit: 0, continue: 0, verify: 0, submissions: [], continuations: [] };
    let turn = 0;
    const driver = driverModule.createAgentDriver({
        beginTurn() { turn += 1; return Object.freeze({ sessionId: "logical_replan_session", turnId: "logical_replan_turn_" + turn }); },
        observe() { calls.observe += 1; if (options.deferObserveAt === calls.observe) return new Promise((resolve) => { calls.releaseObserve = resolve; }); return Promise.resolve(); },
        getObservation() { return Object.freeze({ observationRevision: calls.observe }); },
        appendSessionEvent() {}
    });
    driver.attachRuntimePort({
        reason() { throw new Error("unreachable"); },
        submitIntent(input) { calls.submit += 1; calls.submissions.push(input); return Promise.resolve({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "logical_replan_review_" + calls.submit }); },
        continueApprovedReview(input) { calls.continue += 1; calls.continuations.push(input); return Promise.resolve(continuationResults[calls.continue - 1]); },
        verifyCommittedAction() { calls.verify += 1; return Promise.resolve({ state: "verified", code: null }); },
        verifyOpacity() { throw new Error("unreachable"); },
        cancel() { return true; }
    });
    return { driver, calls, proposal: logicalPlanProposal };
}
async function run() {
    const logicalPlanProposal = Object.freeze({ type: "logicalPlanProposal", steps: Object.freeze([
        Object.freeze({ capabilityId: "set-opacity-v1", params: Object.freeze({ opacity: 47 }) }),
        Object.freeze({ capabilityId: "set-layer-name-v1", params: Object.freeze({ name: "Hero" }) })
    ]) });
    let browserRequireCalls = 0;
    const browser = { console, Promise, setTimeout, clearTimeout, module: { exports: { cepSentinel: true } }, exports: { cepSentinel: true }, require() { browserRequireCalls += 1; throw new Error("CEP must not use CommonJS resolution"); } };
    browser.self = browser; browser.window = browser;
    const browserRealm = vm.createContext(browser);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaPlanningContracts.js"), "utf8"), browserRealm, { filename: "velaPlanningContracts.js" });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaAgentDriver.js"), "utf8"), browserRealm, { filename: "velaAgentDriver.js" });
    ["velaProtocol.js", "velaCapabilityContracts.js", "velaLogicalPlanContracts.js"].forEach(function (filename) { vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", filename), "utf8"), browserRealm, { filename: filename }); });
    browser.__validatedPlan = vm.runInContext("VelaLogicalPlanContracts.validateLogicalPlanProposal({type:'logicalPlanProposal',steps:[{capabilityId:'set-opacity-v1',params:{opacity:47}},{capabilityId:'set-layer-name-v1',params:{name:'Hero'}}]})", browserRealm);
    browser.__beginTurn = function () { return Object.freeze({ sessionId: "session_cep", turnId: "turn_cep" }); }; browser.__observe = function () { return Promise.resolve(); }; browser.__getObservation = function () { return Object.freeze({ observationRevision: 1 }); }; browser.__appendSessionEvent = function () {};
    const browserDriver = vm.runInContext("VelaAgentDriver.createAgentDriver({beginTurn:__beginTurn,observe:__observe,getObservation:__getObservation,appendSessionEvent:__appendSessionEvent})", browserRealm);
    let browserSubmits = 0;
    browserDriver.attachRuntimePort({ reason() { return Promise.resolve(browser.__validatedPlan); }, submitIntent() { browserSubmits += 1; return Promise.resolve({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", beforeValue: browserSubmits === 1 ? 100 : "Layer A", reviewCorrelation: "cep_review_" + browserSubmits }); }, continueApprovedReview() { return Promise.resolve({ state: "verification-required" }); }, verifyCommittedAction() { return Promise.resolve({ state: "verified" }); }, verifyAction() { return Promise.resolve({ fresh: true, matches: true }); }, cancel() { return true; } });
    browser.__driver = browserDriver;
    const browserReview = await vm.runInContext("__driver.startObjective({message:'把当前图层透明度改成47%，然后把它命名为Hero',endpoint:'e',model:'m'})", browserRealm);
    check(browserRequireCalls === 0 && browserReview.state === "awaiting-review" && browserReview.logicalPlan.currentStepIndex === 0 && browserReview.suspendedReview.capabilityId === "set-opacity-v1" && browserReview.suspendedReview.params.opacity === 47 && browserSubmits === 1, "CEP browser wiring ignores CommonJS-like globals, adopts the browser-owned validated plan, and reaches exact step 0 Review without mutation or step 1 materialization.");
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
    check(observationA !== observationB && observationA === "{\"observedValueDigest\":\"sha256:aaa\",\"observedValueKind\":\"number\",\"targetAvailable\":true,\"targetClass\":\"layer-opacity\"}", "observation signature is canonical and changes only with trusted bounded semantics");
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

    const logical = harness({ opacity: 47 });
    const logicalTerminal = await logical.driver.startObjective({ message: "bounded logical objective", endpoint: "e", model: "m", logicalPlanProposal });
    const logicalMetadata = logicalTerminal.logicalPlan;
    equal(logicalTerminal.terminal.outcome, "completed", "both verified logical steps complete the objective");
    check(logical.calls.reason === 0 && logical.calls.submit === 2 && logical.calls.verify === 2 && logical.calls.observe === 2, "two logical steps reuse the one-step pipeline with one fresh Observe per step and no Provider call");
    check(logical.calls.intents[0].capabilityIntent.capabilityId === "set-opacity-v1" && logical.calls.intents[1].capabilityIntent.capabilityId === "set-layer-name-v1", "declared logical steps materialize once in order");
    check(logicalMetadata.currentStepIndex === 1 && logicalMetadata.stepCount === 2 && logicalMetadata.completedStepCount === 2 && logicalMetadata.remainingStepCount === 0, "bounded projection advances only through both verified steps");
    check(Object.isFrozen(logicalMetadata) && Object.keys(logicalMetadata).sort().join(",") === "completedStepCount,currentStepId,currentStepIndex,logicalPlanId,materializedStepId,materializedTaskPlanId,partialCompletion,planSemanticSignature,remainingStepCount,status,stepCount", "logical cursor projection is frozen, closed, and excludes private plan state");
    equal(logicalMetadata.partialCompletion, false, "fully completed logical objective is not partial completion");
    const productionReason = harness({ reason: logicalPlanContracts.validateLogicalPlanProposal(logicalPlanProposal), opacity: 47 });
    const productionReasonTerminal = await productionReason.driver.startObjective({ message: "把当前图层透明度改成47%，然后把它命名为Hero", endpoint: "e", model: "m" });
    check(productionReason.calls.reason === 1 && productionReason.calls.submit === 2 && productionReasonTerminal.terminal.outcome === "completed", "validated production reason result is adopted into the existing Driver cursor and completes both steps.");
    check(logicalMetadata.logicalPlanId !== logicalMetadata.currentStepId && logicalMetadata.currentStepId !== logicalMetadata.materializedStepId && logicalMetadata.materializedTaskPlanId !== logicalMetadata.materializedStepId, "logical plan, logical step, TaskPlan, and materialized step identities remain distinct");
    equal(logicalMetadata.status, "completed", "terminal projection remains read-only after private cursor ownership is cleared");
    equal(logicalTerminal.counters.actions, 2, "B3 performs exactly the two declared logical actions");
    check(logical.calls.intents[0].taskPlanId !== logical.calls.intents[1].taskPlanId && logical.calls.intents[0].stepId !== logical.calls.intents[1].stepId && logical.calls.intents[0].turnId !== logical.calls.intents[1].turnId, "step 1 receives fresh TaskPlan, materialized step, and turn identities");

    const logicalReview = harness({ outcome: { state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "logical_review" } });
    const logicalReview0 = await logicalReview.driver.startObjective({ message: "reviewed logical objective", endpoint: "e", model: "m", logicalPlanProposal });
    const oldReviewToken = { reviewId: logicalReview0.suspendedReview.reviewId, revision: logicalReview0.suspendedReview.revision, outcome: "approved" };
    const logicalReview1 = await logicalReview.driver.resolveReview(oldReviewToken);
    check(logicalReview1.state === "awaiting-review" && logicalReview1.logicalPlan.currentStepIndex === 1, "verified reviewed step 0 advances to a fresh step 1 review");
    check(logicalReview1.suspendedReview.reviewId !== logicalReview0.suspendedReview.reviewId && logicalReview1.suspendedReview.taskPlanId !== logicalReview0.suspendedReview.taskPlanId && logicalReview1.reviewResolution === null, "step 1 does not inherit step 0 review resolution or TaskPlan identity");
    await code(() => Promise.resolve().then(() => logicalReview.driver.resolveReview(oldReviewToken)), "AGENT_DRIVER_REVIEW_INVALID", "previous-step review settlement cannot resolve the current step review");
    const logicalReviewedTerminal = await logicalReview.driver.resolveReview({ reviewId: logicalReview1.suspendedReview.reviewId, revision: logicalReview1.suspendedReview.revision, outcome: "approved" });
    check(logicalReviewedTerminal.terminal.outcome === "completed" && logicalReview.calls.continue === 2 && logicalReview.calls.committedVerify === 2, "each logical step receives independent review continuation and committed-target Verify");

    const logicalVerifyFailure = harness({ opacity: 47, verification: { fresh: true, matches: false, opacity: 47 } });
    const logicalVerifyBlocked = await logicalVerifyFailure.driver.startObjective({ message: "logical verify failure", endpoint: "e", model: "m", logicalPlanProposal });
    check(logicalVerifyBlocked.terminal.code === "AGENT_DRIVER_TASK_UNVERIFIED" && logicalVerifyFailure.calls.submit === 1 && logicalVerifyFailure.calls.observe === 1, "step 0 Verify failure makes step 1 unreachable");
    const logicalDenied = harness({ outcome: { state: "denied", committed: false, code: "PERMISSION_DENIED" } });
    const logicalDeniedTerminal = await logicalDenied.driver.startObjective({ message: "logical denied", endpoint: "e", model: "m", logicalPlanProposal });
    check(logicalDeniedTerminal.terminal.code === "PERMISSION_DENIED" && logicalDenied.calls.submit === 1 && logicalDenied.calls.observe === 1, "step 0 authority denial terminalizes without reaching step 1");

    const staleA = { state: "blocked", code: "CONTEXT_STALE", committed: false, observation: { targetAvailable: true, targetClass: "layer-opacity", observedValueKind: "number", observedValueDigest: "sha256:logical_a" } };
    const verifiedContinuation = { state: "verification-required", code: null };
    const sharedReplan = logicalReplanHarness(logicalPlanProposal, [staleA, verifiedContinuation, verifiedContinuation]);
    const sharedStep0Attempt0 = await sharedReplan.driver.startObjective({ message: "shared replan completes", endpoint: "e", model: "m", logicalPlanProposal });
    const sharedStep0Token0 = { reviewId: sharedStep0Attempt0.suspendedReview.reviewId, revision: sharedStep0Attempt0.suspendedReview.revision, outcome: "approved" };
    const sharedStep0Attempt1 = await sharedReplan.driver.resolveReview(sharedStep0Token0);
    check(sharedStep0Attempt1.state === "awaiting-review" && sharedStep0Attempt1.logicalPlan.currentStepId === sharedStep0Attempt0.logicalPlan.currentStepId && sharedStep0Attempt1.logicalPlan.currentStepIndex === 0, "current-step replan preserves declared logical step identity and ordinal");
    check(sharedStep0Attempt1.taskPlan.planId !== sharedStep0Attempt0.taskPlan.planId && sharedStep0Attempt1.taskPlan.steps[0].stepId !== sharedStep0Attempt0.taskPlan.steps[0].stepId && sharedStep0Attempt1.suspendedReview.reviewId !== sharedStep0Attempt0.suspendedReview.reviewId && sharedStep0Attempt1.turn.turnId !== sharedStep0Attempt0.turn.turnId, "current-step replan receives fresh materialized, TaskPlan, Review, and turn identities");
    await code(() => Promise.resolve().then(() => sharedReplan.driver.resolveReview(sharedStep0Token0)), "AGENT_DRIVER_REVIEW_INVALID", "old materialization review settlement cannot affect the rematerialized current step");
    const sharedStep1 = await sharedReplan.driver.resolveReview({ reviewId: sharedStep0Attempt1.suspendedReview.reviewId, revision: sharedStep0Attempt1.suspendedReview.revision, outcome: "approved" });
    check(sharedStep1.state === "awaiting-review" && sharedStep1.logicalPlan.currentStepIndex === 1 && sharedStep1.logicalPlan.completedStepCount === 1, "verified rematerialized step 0 progresses through fresh Observe to step 1");
    const sharedComplete = await sharedReplan.driver.resolveReview({ reviewId: sharedStep1.suspendedReview.reviewId, revision: sharedStep1.suspendedReview.revision, outcome: "approved" });
    check(sharedComplete.terminal.outcome === "completed" && sharedComplete.counters.replans === 1 && sharedComplete.loop.budgets.iterationsUsed === 2 && sharedComplete.loop.budgets.actionAttemptsUsed === 2, "one objective-shared replan allowance supports two committed logical steps within existing hard bounds");
    check(sharedReplan.calls.submissions.map((input) => input.capabilityIntent.capabilityId).join(",") === "set-opacity-v1,set-opacity-v1,set-layer-name-v1", "step 0 rematerialization never rewrites trajectory or replays a completed step");

    const sharedExhaustion = logicalReplanHarness(logicalPlanProposal, [staleA, verifiedContinuation, { state: "blocked", code: "CONTEXT_STALE", committed: false, observation: { targetAvailable: true, targetClass: "layer-name", observedValueKind: "string", observedValueDigest: "sha256:logical_b" } }]);
    const exhaustedLogical0 = await sharedExhaustion.driver.startObjective({ message: "shared replan exhausted", endpoint: "e", model: "m", logicalPlanProposal });
    const exhaustedLogical0Retry = await sharedExhaustion.driver.resolveReview({ reviewId: exhaustedLogical0.suspendedReview.reviewId, revision: exhaustedLogical0.suspendedReview.revision, outcome: "approved" });
    const exhaustedLogical1 = await sharedExhaustion.driver.resolveReview({ reviewId: exhaustedLogical0Retry.suspendedReview.reviewId, revision: exhaustedLogical0Retry.suspendedReview.revision, outcome: "approved" });
    const exhaustedLogicalTerminal = await sharedExhaustion.driver.resolveReview({ reviewId: exhaustedLogical1.suspendedReview.reviewId, revision: exhaustedLogical1.suspendedReview.revision, outcome: "approved" });
    check(exhaustedLogicalTerminal.terminal.code === "AGENT_DRIVER_REPLAN_EXHAUSTED" && exhaustedLogicalTerminal.counters.replans === 1 && sharedExhaustion.calls.submit === 3, "step 1 receives no second replan allowance after step 0 consumed the objective-shared budget");
    check(exhaustedLogicalTerminal.logicalPlan.completedStepCount === 1 && exhaustedLogicalTerminal.logicalPlan.currentStepIndex === 1 && exhaustedLogicalTerminal.logicalPlan.status === "blocked", "completed step 0 remains immutable when step 1 terminates blocked");

    const repeatedStale = logicalReplanHarness(logicalPlanProposal, [staleA, staleA]);
    const repeatedStale0 = await repeatedStale.driver.startObjective({ message: "logical no progress", endpoint: "e", model: "m", logicalPlanProposal });
    const repeatedStale1 = await repeatedStale.driver.resolveReview({ reviewId: repeatedStale0.suspendedReview.reviewId, revision: repeatedStale0.suspendedReview.revision, outcome: "approved" });
    const repeatedStaleTerminal = await repeatedStale.driver.resolveReview({ reviewId: repeatedStale1.suspendedReview.reviewId, revision: repeatedStale1.suspendedReview.revision, outcome: "approved" });
    check(repeatedStaleTerminal.terminal.code === "AGENT_DRIVER_REPLAN_EXHAUSTED" && repeatedStaleTerminal.loop.noProgressCount === 1 && repeatedStale.calls.submit === 2, "repeated same-step stale settlement deterministically blocks without a third materialization");

    const cancelReplan = logicalReplanHarness(logicalPlanProposal, [staleA], { deferObserveAt: 2 });
    const cancelReplan0 = await cancelReplan.driver.startObjective({ message: "cancel logical replan", endpoint: "e", model: "m", logicalPlanProposal });
    const cancelReplanPending = cancelReplan.driver.resolveReview({ reviewId: cancelReplan0.suspendedReview.reviewId, revision: cancelReplan0.suspendedReview.revision, outcome: "approved" });
    for (let microtask = 0; microtask < 20 && !cancelReplan.calls.releaseObserve; microtask += 1) await Promise.resolve();
    check(cancelReplan.driver.getSnapshot().state === "observing" && cancelReplan.driver.cancel(), "cancel wins during current-step replan fresh Observe");
    cancelReplan.calls.releaseObserve();
    const cancelReplanTerminal = await cancelReplanPending;
    check(cancelReplanTerminal.terminal.outcome === "cancelled" && cancelReplan.calls.submit === 1 && cancelReplanTerminal.logicalPlan.currentStepIndex === 0, "late replan Observe settlement cannot restore cursor or rematerialize the cancelled step");

    const cancelStep1Review = logicalReplanHarness(logicalPlanProposal, [verifiedContinuation]);
    const cancelStep1Review0 = await cancelStep1Review.driver.startObjective({ message: "cancel step 1 review", endpoint: "e", model: "m", logicalPlanProposal });
    const cancelStep1Pending = await cancelStep1Review.driver.resolveReview({ reviewId: cancelStep1Review0.suspendedReview.reviewId, revision: cancelStep1Review0.suspendedReview.revision, outcome: "approved" });
    const cancelStep1Token = { reviewId: cancelStep1Pending.suspendedReview.reviewId, revision: cancelStep1Pending.suspendedReview.revision, outcome: "approved" };
    check(cancelStep1Review.driver.cancel(), "step 1 awaiting Review can be cancelled deterministically");
    await code(() => Promise.resolve().then(() => cancelStep1Review.driver.resolveReview(cancelStep1Token)), "AGENT_DRIVER_REVIEW_INVALID", "cancelled step 1 review token cannot resurrect the objective");
    check(cancelStep1Review.driver.getSnapshot().logicalPlan.completedStepCount === 1 && cancelStep1Review.driver.getSnapshot().logicalPlan.status === "cancelled", "step 0 remains completed after step 1 review cancellation");

    let pendingStepSubmitCount = 0;
    let releasePendingStep1Submit;
    const pendingStep1Driver = driverModule.createAgentDriver({ beginTurn() { return Object.freeze({ sessionId: "pending_step_session", turnId: "pending_step_turn_" + (pendingStepSubmitCount + 1) }); }, observe() { return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: pendingStepSubmitCount + 1 }); }, appendSessionEvent() {} });
    pendingStep1Driver.attachRuntimePort({ reason() { throw new Error("unreachable"); }, submitIntent() { pendingStepSubmitCount += 1; if (pendingStepSubmitCount === 2) return new Promise((resolve) => { releasePendingStep1Submit = resolve; }); return Promise.resolve({ state: "executed", committed: true }); }, continueApprovedReview() { throw new Error("unreachable"); }, verifyCommittedAction() { throw new Error("unreachable"); }, verifyOpacity() { return Promise.resolve({ fresh: true, matches: true, opacity: 47 }); }, cancel() { return true; } });
    const pendingStep1Result = pendingStep1Driver.startObjective({ message: "cancel materialized step 1", endpoint: "e", model: "m", logicalPlanProposal });
    for (let microtask = 0; microtask < 30 && !releasePendingStep1Submit; microtask += 1) await Promise.resolve();
    check(pendingStep1Driver.getSnapshot().logicalPlan.currentStepIndex === 1 && pendingStep1Driver.getSnapshot().state === "awaiting-outcome", "step 1 can be cancelled after materialization while submission is unsettled");
    check(pendingStep1Driver.cancel(), "cancel wins before materialized step 1 receives a Review outcome");
    releasePendingStep1Submit({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", reviewCorrelation: "late_step_1_review" });
    const pendingStep1Cancelled = await pendingStep1Result;
    check(pendingStep1Cancelled.terminal.outcome === "cancelled" && pendingStep1Cancelled.suspendedReview === null && pendingStep1Cancelled.logicalPlan.completedStepCount === 1, "late step 1 submission settlement cannot restore Review or rewrite completed step 0");

    const malformedLogical = harness();
    await code(() => malformedLogical.driver.startObjective({ message: "invalid logical objective", endpoint: "e", model: "m", logicalPlanProposal: { type: "logicalPlanProposal", steps: [logicalPlanProposal.steps[1], logicalPlanProposal.steps[0]] } }), "AGENT_DRIVER_LOGICAL_PLAN_INVALID", "invalid logical plan is rejected before private cursor ownership begins");
    check(malformedLogical.driver.getSnapshot().state === "idle" && malformedLogical.driver.getSnapshot().logicalPlan === null && malformedLogical.calls.observe === 0, "invalid logical plan cannot enter Driver state or Observe");

    let releaseLogicalObservation;
    let lifecycleObservations = 0;
    const lifecycleEvents = [];
    const lifecycleDriver = driverModule.createAgentDriver({ beginTurn() { return Object.freeze({ sessionId: "logical_session", turnId: "logical_turn_" + lifecycleObservations }); }, observe() { lifecycleObservations += 1; if (lifecycleObservations === 1) { return new Promise((resolve) => { releaseLogicalObservation = resolve; }); } return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: lifecycleObservations }); }, appendSessionEvent(event) { lifecycleEvents.push(event); } });
    let lifecycleSubmit = 0;
    lifecycleDriver.attachRuntimePort({ reason() { return Promise.resolve({ capabilityId: "set-opacity-v1", params: { opacity: 42 } }); }, submitIntent() { lifecycleSubmit += 1; return Promise.resolve({ state: "executed", committed: true }); }, continueApprovedReview() { throw new Error("unreachable"); }, verifyCommittedAction() { throw new Error("unreachable"); }, verifyOpacity() { return Promise.resolve({ fresh: true, matches: true, opacity: 42 }); }, cancel() { return true; } });
    const cancelledLogicalPending = lifecycleDriver.startObjective({ message: "cancel logical", endpoint: "e", model: "m", logicalPlanProposal });
    check(lifecycleDriver.cancel(), "cancel clears active logical cursor ownership while Observe is pending");
    const replacementLogical = lifecycleDriver.startObjective({ message: "replacement single step", endpoint: "e", model: "m" });
    releaseLogicalObservation();
    const replacementLogicalTerminal = await replacementLogical;
    const cancelledLogicalSettlement = await cancelledLogicalPending;
    check(replacementLogicalTerminal.terminal.outcome === "completed" && replacementLogicalTerminal.logicalPlan === null, "replacement objective owns fresh single-step state without prior logical cursor leakage");
    equal(cancelledLogicalSettlement.objectiveId, replacementLogicalTerminal.objectiveId, "late cancelled settlement can only observe the current snapshot and cannot restore the previous objective");
    equal(lifecycleSubmit, 1, "cancelled logical objective never submits step 0 or step 1 after late Observe settlement");
    equal(lifecycleEvents.filter((event) => event.kind === "task/cancelled").length, 1, "cancelled logical objective emits one terminal lifecycle event");

    let transitionObserveCount = 0;
    let releaseLogicalTransition;
    let transitionSubmitCount = 0;
    const logicalTransitionDriver = driverModule.createAgentDriver({ beginTurn() { return Object.freeze({ sessionId: "transition_session", turnId: "transition_turn_" + (transitionObserveCount + 1) }); }, observe() { transitionObserveCount += 1; if (transitionObserveCount === 2) { return new Promise((resolve) => { releaseLogicalTransition = resolve; }); } return Promise.resolve(); }, getObservation() { return Object.freeze({ observationRevision: transitionObserveCount }); }, appendSessionEvent() {} });
    logicalTransitionDriver.attachRuntimePort({ reason() { throw new Error("unreachable"); }, submitIntent() { transitionSubmitCount += 1; return Promise.resolve({ state: "executed", committed: true }); }, continueApprovedReview() { throw new Error("unreachable"); }, verifyCommittedAction() { throw new Error("unreachable"); }, verifyOpacity() { return Promise.resolve({ fresh: true, matches: true, opacity: 47 }); }, cancel() { return true; } });
    const logicalTransitionPending = logicalTransitionDriver.startObjective({ message: "cancel between logical steps", endpoint: "e", model: "m", logicalPlanProposal });
    for (let microtask = 0; microtask < 20 && !releaseLogicalTransition; microtask += 1) await Promise.resolve();
    check(logicalTransitionDriver.getSnapshot().state === "observing" && logicalTransitionDriver.getSnapshot().logicalPlan.status === "observing-next", "step 0 Verify enters the fresh-Observe transition before cursor advance");
    check(logicalTransitionDriver.cancel(), "cancel wins during fresh Observe before step 1 materialization");
    releaseLogicalTransition();
    const logicalTransitionCancelled = await logicalTransitionPending;
    check(logicalTransitionCancelled.terminal.outcome === "cancelled" && transitionSubmitCount === 1 && logicalTransitionCancelled.logicalPlan.currentStepIndex === 0, "cancelled transition cannot advance cursor or materialize step 1");

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
    check(review.calls.committedVerificationInput.objectiveId === suspended.objectiveId && review.calls.committedVerificationInput.taskId === suspended.taskId && review.calls.committedVerificationInput.capabilityId === "set-opacity-v1" && review.calls.committedVerificationInput.expectedValue.kind === "number" && review.calls.committedVerificationInput.expectedValue.data === 47 && !Object.prototype.hasOwnProperty.call(review.calls.committedVerificationInput, "planId"), "Driver passes only logical identity and typed expectation to committed verification");
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
