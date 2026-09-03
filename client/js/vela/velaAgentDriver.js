(function (root, factory) {
    "use strict";
    var planning = root && root.self === root ? root.VelaPlanningContracts : (typeof module === "object" && module.exports ? require("./velaPlanningContracts") : null);
    var exported = Object.freeze(factory(planning));
    if (root && root.self === root && root["win" + "dow"] === root) {
        if (Object.prototype.hasOwnProperty.call(root, "VelaAgentDriver") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaAgentDriver", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function (planning) {
    "use strict";
    var MODULE_REVISION = "vela-agent-driver-0.3.7-a4-b1-v1";
    var LOOP_DEFAULT_LIMITS = Object.freeze({ maxIterations: 2, maxProviderCalls: 2, maxActionAttempts: 2, maxConsecutiveNoProgress: 1 });
    var REPLAN_CLASSIFICATIONS = Object.freeze({ MAY_REPLAN: "may-replan", NEVER_REPLAN: "never-replan", SUCCESS: "success" });
    var ERROR_CODES = Object.freeze({
        AGENT_DRIVER_INVALID_OPTIONS: "AGENT_DRIVER_INVALID_OPTIONS",
        AGENT_DRIVER_BUSY: "AGENT_DRIVER_BUSY",
        AGENT_DRIVER_DISPOSED: "AGENT_DRIVER_DISPOSED",
        AGENT_DRIVER_INVALID_OBJECTIVE: "AGENT_DRIVER_INVALID_OBJECTIVE",
        AGENT_DRIVER_ILLEGAL_TRANSITION: "AGENT_DRIVER_ILLEGAL_TRANSITION",
        AGENT_DRIVER_REASON_INVALID: "AGENT_DRIVER_REASON_INVALID",
        AGENT_DRIVER_EXECUTION_FAILED: "AGENT_DRIVER_EXECUTION_FAILED",
        AGENT_DRIVER_TASK_UNVERIFIED: "AGENT_DRIVER_TASK_UNVERIFIED",
        AGENT_DRIVER_REVIEW_INVALID: "AGENT_DRIVER_REVIEW_INVALID",
        AGENT_DRIVER_REPLAN_EXHAUSTED: "AGENT_DRIVER_REPLAN_EXHAUSTED"
    });
    function error(code) { var value = new Error(code); value.code = code; return value; }
    function plain(value) { var prototype; if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; } prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; }
    function stableCode(value, fallback) { return value && typeof value.code === "string" ? value.code : fallback; }
    function canonical(value) {
        if (value === null || typeof value === "string" || typeof value === "boolean") { return JSON.stringify(value); }
        if (typeof value === "number" && isFinite(value)) { return JSON.stringify(value); }
        if (Array.isArray(value)) { return "[" + value.map(canonical).join(",") + "]"; }
        if (plain(value)) { return "{" + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ":" + canonical(value[key]); }).join(",") + "}"; }
        throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS);
    }
    function createObservationSignature(input) {
        if (!plain(input) || typeof input.targetAvailable !== "boolean" || (input.targetClass !== null && typeof input.targetClass !== "string") || (input.observedOpacityDigest !== null && typeof input.observedOpacityDigest !== "string")) { throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS); }
        return canonical({ observedOpacityDigest: input.observedOpacityDigest, targetAvailable: input.targetAvailable, targetClass: input.targetClass });
    }
    function createIntentSignature(input) {
        var params;
        if (!plain(input) || typeof input.capabilityId !== "string" || typeof input.requestedOperation !== "string" || !Array.isArray(input.targetScope)) { throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS); }
        params = Object.prototype.hasOwnProperty.call(input, "canonicalParams") ? input.canonicalParams : input.params;
        if (!plain(params) || !input.targetScope.every(function (value) { return typeof value === "string"; })) { throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS); }
        return canonical({ canonicalParams: params, capabilityId: input.capabilityId, requestedOperation: input.requestedOperation, targetScope: input.targetScope });
    }
    function classifyReplanEligibility(input) {
        var code = input && input.code;
        var committed = input && input.committed;
        var verificationState = input && input.verificationState;
        if (!plain(input) || (committed !== true && committed !== false && committed !== null) || (code !== null && typeof code !== "string") || (verificationState !== null && typeof verificationState !== "string")) { throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS); }
        if (verificationState === "matches" || verificationState === "completed" || verificationState === "text-completed") { return Object.freeze({ classification: REPLAN_CLASSIFICATIONS.SUCCESS, reason: "objective-completed" }); }
        if (committed === null) { return Object.freeze({ classification: REPLAN_CLASSIFICATIONS.NEVER_REPLAN, reason: "commit-uncertain" }); }
        if (code === "CONTEXT_STALE" || (code === "UNKNOWN_TARGET" && committed === false) || (code === "PLAN_FAILED" && committed === false) || (code === "AGENT_DRIVER_TASK_UNVERIFIED" && committed === true && verificationState === "mismatch")) { return Object.freeze({ classification: REPLAN_CLASSIFICATIONS.MAY_REPLAN, reason: "fresh-iteration-required" }); }
        return Object.freeze({ classification: REPLAN_CLASSIFICATIONS.NEVER_REPLAN, reason: "failure-not-eligible" });
    }
    function evaluateNoProgress(previous, current, maxConsecutiveNoProgress) {
        var same;
        var count;
        if (!plain(previous) || !plain(current) || !Number.isInteger(previous.noProgressCount) || previous.noProgressCount < 0 || !Number.isInteger(maxConsecutiveNoProgress) || maxConsecutiveNoProgress < 1 || typeof current.observationSignature !== "string" || typeof current.intentSignature !== "string" || typeof current.failureClass !== "string") { throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS); }
        same = previous.observationSignature === current.observationSignature && previous.intentSignature === current.intentSignature && previous.failureClass === current.failureClass;
        count = same ? previous.noProgressCount + 1 : 0;
        return Object.freeze({ noProgressCount: count, replanAllowed: count < maxConsecutiveNoProgress, reason: count >= maxConsecutiveNoProgress ? "no-progress" : null });
    }
    function createAgentDriver(options) {
        var settings = plain(options) ? options : {};
        var beginTurn = settings.beginTurn;
        var observe = settings.observe;
        var getObservation = settings.getObservation;
        var append = settings.appendSessionEvent;
        var onListenerError = typeof settings.onListenerError === "function" ? settings.onListenerError : function () {};
        var runtimePort = null;
        var state = "idle";
        var active = null;
        var disposed = false;
        var serial = 0;
        var generation = 0;
        var listeners = [];
        if (!planning || typeof planning.createTaskPlan !== "function" || typeof planning.createCapabilityIntent !== "function" || typeof beginTurn !== "function" || typeof observe !== "function" || typeof getObservation !== "function" || typeof append !== "function") { throw error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS); }
        function snapshot() { return Object.freeze({ state: state, objectiveId: active ? active.objectiveId : null, taskId: active ? active.taskId : null, taskPlan: active ? active.taskPlan : null, turn: active ? active.turn : null, suspendedReview: active ? active.suspendedReview : null, reviewResolution: active ? active.reviewResolution : null, terminal: active ? active.terminal : null, counters: Object.freeze(active ? { observations: active.observations, reasoningTurns: active.reasoningTurns, actions: active.actions, replans: active.replans } : { observations: 0, reasoningTurns: 0, actions: 0, replans: 0 }), loop: Object.freeze(active ? { iterationIndex: active.loopHealth.iterationIndex, budgets: Object.freeze({ iterationsUsed: active.loopHealth.iterationsUsed, providerCallsUsed: active.loopHealth.providerCallsUsed, actionAttemptsUsed: active.loopHealth.actionAttemptsUsed }), noProgressCount: active.loopHealth.noProgressCount } : { iterationIndex: 0, budgets: Object.freeze({ iterationsUsed: 0, providerCallsUsed: 0, actionAttemptsUsed: 0 }), noProgressCount: 0 }), disposed: disposed }); }
        function notify() { var current = snapshot(); listeners.slice().forEach(function (listener) { try { listener(current); } catch (listenerError) { try { onListenerError(listenerError, Object.freeze({ phase: "driver-listener" })); } catch (ignored) {} } }); }
        function transition(next) { var legal = { idle: ["observing"], observing: ["reasoning", "terminal"], reasoning: ["awaiting-outcome", "terminal"], "awaiting-outcome": ["awaiting-review", "observing", "verifying", "terminal"], "awaiting-review": ["awaiting-outcome", "terminal"], verifying: ["terminal"] }; if (!legal[state] || legal[state].indexOf(next) === -1) { throw error(ERROR_CODES.AGENT_DRIVER_ILLEGAL_TRANSITION); } state = next; notify(); }
        function event(kind, payload) { append({ kind: kind, requestId: active.objectiveId, payload: payload || {} }); }
        function terminal(outcome, code) { if (!active || active.terminal) { return snapshot(); } active.suspendedReview = null; active.terminal = Object.freeze({ outcome: outcome, code: code || null }); transition("terminal"); event(outcome === "completed" ? "task/completed" : outcome === "cancelled" ? "task/cancelled" : outcome === "rejected" ? "task/review-rejected" : "task/blocked", { taskId: active.taskId, taskPlanId: active.taskPlan ? active.taskPlan.planId : null, code: code || null }); return snapshot(); }
        function current(captured) { return !disposed && active && !active.terminal && generation === captured; }
        function buildPlan(reason) {
            var opacity;
            var intent;
            if (!plain(reason) || reason.capabilityId !== "set-opacity-v1" || !plain(reason.params)) { throw error(ERROR_CODES.AGENT_DRIVER_REASON_INVALID); }
            opacity = reason.params.opacity;
            if (typeof opacity !== "number" || !isFinite(opacity) || opacity < 0 || opacity > 100) { throw error(ERROR_CODES.AGENT_DRIVER_REASON_INVALID); }
            intent = planning.createCapabilityIntent({ intentId: "intent_agent_" + serial + "_" + active.loopHealth.iterationIndex, capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: opacity } });
            active.taskPlan = planning.createTaskPlan({ planId: "task_plan_agent_" + serial + "_" + active.loopHealth.iterationIndex, taskId: active.taskId, revision: 0, steps: [{ stepId: "operate_opacity_" + serial + "_" + active.loopHealth.iterationIndex, kind: "operate", capabilityIntent: { intentId: intent.intentId, capabilityId: intent.capabilityId, requestedOperation: intent.requestedOperation, params: { opacity: opacity } }, rationale: "Apply the bounded opacity objective.", metadata: { expectedOpacity: opacity } }] });
            planning.assertTaskPlanNotExecutable(active.taskPlan);
            active.intent = intent;
            active.currentIntentSignature = createIntentSignature({ capabilityId: intent.capabilityId, requestedOperation: intent.requestedOperation, canonicalParams: intent.params, targetScope: ["layer", "property"] });
            return intent;
        }
        function fail(captured, failure) { if (!current(captured)) { return snapshot(); } active.loopHealth.lastFailureClass = stableCode(failure, ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED); return terminal("blocked", active.loopHealth.lastFailureClass); }
        function runIteration(captured) {
            var reasonInput;
            var reasonObservationRevision;
            return Promise.resolve(observe()).then(function () {
                if (!current(captured)) { return snapshot(); }
                active.observations += 1; reasonObservationRevision = getObservation() && getObservation().observationRevision || null;
                transition("reasoning"); active.reasoningTurns += 1;
                reasonInput = { message: active.objectiveInput.message, endpoint: active.objectiveInput.endpoint, model: active.objectiveInput.model };
                if (active.loopHealth.providerCallsUsed >= LOOP_DEFAULT_LIMITS.maxProviderCalls) { throw error(ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED); }
                active.loopHealth.providerCallsUsed += 1;
                return runtimePort.reason(reasonInput);
            }).then(function (reason) {
                var intent;
                if (!current(captured) || !reason) { return snapshot(); }
                if (plain(reason) && reason.type === "text" && typeof reason.text === "string" && /\S/.test(reason.text)) { return terminal("completed", null); }
                event("ae/state-observed", { taskId: active.taskId, phase: "pre-action", observationRevision: reasonObservationRevision });
                intent = buildPlan(reason); transition("awaiting-outcome"); active.actions += 1;
                if (active.loopHealth.actionAttemptsUsed >= LOOP_DEFAULT_LIMITS.maxActionAttempts) { throw error(ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED); }
                active.loopHealth.actionAttemptsUsed += 1;
                event("agent/action-performed", { taskId: active.taskId, taskPlanId: active.taskPlan.planId, stepId: active.taskPlan.steps[0].stepId, capabilityId: intent.capabilityId, phase: "submitted" });
                return runtimePort.submitIntent({ objectiveId: active.objectiveId, sessionId: active.turn.sessionId, turnId: active.turn.turnId, taskId: active.taskId, taskPlanId: active.taskPlan.planId, taskPlanRevision: active.taskPlan.revision, stepId: active.taskPlan.steps[0].stepId, reviewRevision: captured, capabilityIntent: intent });
            }).then(function (outcome) {
                if (!current(captured) || !outcome) { return snapshot(); }
                if (outcome.state === "review-required") {
                    var beforeValue = typeof outcome.beforeValue === "number" && isFinite(outcome.beforeValue) && outcome.beforeValue >= 0 && outcome.beforeValue <= 100 ? outcome.beforeValue : null;
                    active.loopHealth.actionAttemptsUsed -= 1;
                    if (typeof outcome.reviewCorrelation !== "string" || outcome.reviewCorrelation.length === 0) { return terminal("blocked", ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED); }
                    active.suspendedReview = Object.freeze({ objectiveId: active.objectiveId, taskId: active.taskId, sessionId: active.turn.sessionId, turnId: active.turn.turnId, taskPlanId: active.taskPlan.planId, taskPlanRevision: active.taskPlan.revision, stepId: active.taskPlan.steps[0].stepId, capabilityId: active.intent.capabilityId, params: Object.freeze({ opacity: active.intent.params.opacity }), localExpectation: Object.freeze({ opacity: active.intent.params.opacity }), beforeValue: beforeValue, reviewId: "agent_review_" + serial + "_" + generation + "_" + active.loopHealth.iterationIndex, revision: generation, reviewCorrelation: outcome.reviewCorrelation });
                    transition("awaiting-review");
                    event("task/review-required", { taskId: active.taskId, taskPlanId: active.taskPlan.planId, stepId: active.taskPlan.steps[0].stepId, reviewId: active.suspendedReview.reviewId, reviewRevision: active.suspendedReview.revision, code: outcome.code || "REVIEW_REQUIRED" });
                    return snapshot();
                }
                if (outcome.state === "denied") { active.loopHealth.actionAttemptsUsed -= 1; return terminal("blocked", outcome.code || "PERMISSION_DENIED"); }
                if (outcome.state !== "executed" || outcome.committed !== true) { return terminal("blocked", outcome.code || ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED); }
                active.committed = true; event("tool/result", { taskId: active.taskId, capabilityId: "set-opacity-v1", committed: true }); transition("verifying");
                return runtimePort.verifyOpacity({ taskId: active.taskId, expectedOpacity: active.intent.params.opacity });
            }).then(function (verification) {
                if (!current(captured) || state !== "verifying") { return snapshot(); }
                active.observations += 1; event("ae/state-observed", { taskId: active.taskId, phase: "post-action", fresh: verification && verification.fresh === true, observedOpacity: verification && typeof verification.opacity === "number" ? verification.opacity : null });
                if (!verification || verification.fresh !== true || verification.matches !== true) { return terminal("blocked", ERROR_CODES.AGENT_DRIVER_TASK_UNVERIFIED); }
                return terminal("completed", null);
            }, function (failure) { return fail(captured, failure); });
        }
        function startObjective(input) {
            var captured;
            if (disposed) { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_DISPOSED)); }
            if (state === "terminal") { state = "idle"; active = null; }
            if (state !== "idle") { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_BUSY)); }
            if (!plain(input) || typeof input.message !== "string" || !/\S/.test(input.message) || typeof input.endpoint !== "string" || typeof input.model !== "string") { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_INVALID_OBJECTIVE)); }
            if (!runtimePort) { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS)); }
            serial += 1; generation += 1; captured = generation;
            active = { objectiveId: "objective_agent_" + serial, taskId: "agent_task_" + serial, objectiveInput: Object.freeze({ message: input.message, endpoint: input.endpoint, model: input.model }), taskPlan: null, intent: null, currentIntentSignature: null, turn: beginTurn(), suspendedReview: null, reviewResolution: null, terminal: null, observations: 0, reasoningTurns: 0, actions: 0, replans: 0, committed: false, loopHealth: { iterationIndex: 0, iterationsUsed: 1, providerCallsUsed: 0, actionAttemptsUsed: 0, noProgressCount: 0, lastObservationSignature: null, lastIntentSignature: null, lastFailureClass: null } };
            event("task/started", { taskId: active.taskId, objective: input.message });
            transition("observing");
            return runIteration(captured);
        }
        function beginNextIteration(captured, settlement) {
            var eligibility;
            var observationSignature;
            var health;
            if (!current(captured) || state !== "awaiting-outcome" || !settlement || settlement.code !== "CONTEXT_STALE" || settlement.committed !== false || !plain(settlement.observation)) { return null; }
            eligibility = classifyReplanEligibility({ code: settlement.code, committed: settlement.committed, verificationState: null });
            if (eligibility.classification !== REPLAN_CLASSIFICATIONS.MAY_REPLAN) { return null; }
            try { observationSignature = createObservationSignature(settlement.observation); }
            catch (ignoredSignature) { return null; }
            if (active.loopHealth.lastObservationSignature !== null) {
                health = evaluateNoProgress({ observationSignature: active.loopHealth.lastObservationSignature, intentSignature: active.loopHealth.lastIntentSignature, failureClass: active.loopHealth.lastFailureClass, noProgressCount: active.loopHealth.noProgressCount }, { observationSignature: observationSignature, intentSignature: active.currentIntentSignature, failureClass: settlement.code }, LOOP_DEFAULT_LIMITS.maxConsecutiveNoProgress);
                active.loopHealth.noProgressCount = health.noProgressCount;
            }
            active.loopHealth.lastObservationSignature = observationSignature;
            active.loopHealth.lastIntentSignature = active.currentIntentSignature;
            active.loopHealth.lastFailureClass = settlement.code;
            if (active.loopHealth.iterationIndex !== 0 || active.loopHealth.iterationsUsed >= LOOP_DEFAULT_LIMITS.maxIterations || active.loopHealth.providerCallsUsed >= LOOP_DEFAULT_LIMITS.maxProviderCalls || active.loopHealth.noProgressCount >= LOOP_DEFAULT_LIMITS.maxConsecutiveNoProgress) { return null; }
            active.loopHealth.iterationIndex += 1;
            active.loopHealth.iterationsUsed += 1;
            active.replans += 1;
            active.taskPlan = null;
            active.intent = null;
            active.currentIntentSignature = null;
            active.reviewResolution = null;
            active.committed = false;
            active.turn = beginTurn();
            transition("observing");
            return runIteration(captured);
        }
        function resolveReview(input) {
            var review;
            var outcome;
            var captured;
            if (disposed) { throw error(ERROR_CODES.AGENT_DRIVER_DISPOSED); }
            review = active && active.suspendedReview;
            if (state !== "awaiting-review" || !review || !plain(input) || Object.keys(input).sort().join(",") !== "outcome,reviewId,revision" || input.reviewId !== review.reviewId || input.revision !== review.revision || (input.outcome !== "approved" && input.outcome !== "rejected")) { throw error(ERROR_CODES.AGENT_DRIVER_REVIEW_INVALID); }
            outcome = input.outcome;
            active.suspendedReview = null;
            active.reviewResolution = Object.freeze({ reviewId: review.reviewId, revision: review.revision, outcome: outcome, objectiveId: review.objectiveId, taskId: review.taskId, taskPlanId: review.taskPlanId, stepId: review.stepId });
            if (outcome === "rejected") { return terminal("rejected", "REVIEW_REJECTED"); }
            transition("awaiting-outcome");
            captured = generation;
            if (active.loopHealth.actionAttemptsUsed >= LOOP_DEFAULT_LIMITS.maxActionAttempts) { return terminal("blocked", ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED); }
            active.loopHealth.actionAttemptsUsed += 1;
            return Promise.resolve(runtimePort.continueApprovedReview({ objectiveId: review.objectiveId, taskId: review.taskId, sessionId: review.sessionId, turnId: review.turnId, taskPlanId: review.taskPlanId, taskPlanRevision: review.taskPlanRevision, stepId: review.stepId, capabilityIntent: active.intent, localExpectation: review.localExpectation, reviewId: review.reviewId, reviewRevision: review.revision, reviewCorrelation: review.reviewCorrelation })).then(function (continuation) {
                if (!current(captured)) { return snapshot(); }
                if (continuation && continuation.state === "verification-required") {
                    active.committed = true; event("tool/result", { taskId: active.taskId, capabilityId: "set-opacity-v1", committed: true }); transition("verifying");
                    return runtimePort.verifyCommittedAction({ objectiveId: active.objectiveId, taskId: active.taskId, expectedOpacity: active.intent.params.opacity }).then(function (verification) {
                        if (!current(captured) || state !== "verifying") { return snapshot(); }
                        active.observations += 1;
                        event("ae/state-observed", { taskId: active.taskId, phase: "post-action", fresh: verification && verification.state === "verified", observedOpacity: null });
                        if (verification && verification.state === "verified") { return terminal("completed", null); }
                        if (verification && verification.state === "cancelled") { return terminal("cancelled", verification.code || "AGENT_DRIVER_CANCELLED"); }
                        return terminal("blocked", verification && verification.code || ERROR_CODES.AGENT_DRIVER_TASK_UNVERIFIED);
                    }, function (failure) { return fail(captured, failure); });
                }
                if (continuation && continuation.state === "cancelled") { return terminal("cancelled", continuation.code || "AGENT_DRIVER_CANCELLED"); }
                if (continuation && continuation.state === "blocked" && continuation.code === "CONTEXT_STALE") { return beginNextIteration(captured, continuation) || terminal("blocked", ERROR_CODES.AGENT_DRIVER_REPLAN_EXHAUSTED); }
                return terminal("blocked", continuation && continuation.code || ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED);
            }, function (failure) { return fail(captured, failure); });
        }
        function cancel() { generation += 1; if (disposed || !active || active.terminal || state === "idle" || state === "terminal") { return false; } try { if (runtimePort && typeof runtimePort.cancel === "function") { runtimePort.cancel(); } } catch (ignored) {} terminal("cancelled", "AGENT_DRIVER_CANCELLED"); return true; }
        function attachRuntimePort(port) { if (disposed || runtimePort || !port || typeof port.reason !== "function" || typeof port.submitIntent !== "function" || typeof port.continueApprovedReview !== "function" || typeof port.verifyCommittedAction !== "function" || typeof port.verifyOpacity !== "function") { return false; } runtimePort = port; return true; }
        function dispose() { if (disposed) { return false; } if (active && !active.terminal && state !== "idle") { cancel(); } disposed = true; generation += 1; runtimePort = null; listeners = []; return true; }
        return Object.freeze({ attachRuntimePort: attachRuntimePort, startObjective: startObjective, resolveReview: resolveReview, cancel: cancel, dispose: dispose, getSnapshot: snapshot, subscribe: function (listener) { var subscribed = true; if (typeof listener !== "function" || disposed) { throw error(ERROR_CODES.AGENT_DRIVER_DISPOSED); } listeners.push(listener); try { listener(snapshot()); } catch (listenerError) { try { onListenerError(listenerError, Object.freeze({ phase: "driver-listener" })); } catch (ignored) {} } return Object.freeze({ unsubscribe: function () { var index; if (!subscribed) { return; } subscribed = false; index = listeners.indexOf(listener); if (index !== -1) { listeners.splice(index, 1); } } }); } });
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, ERROR_CODES: ERROR_CODES, LOOP_DEFAULT_LIMITS: LOOP_DEFAULT_LIMITS, REPLAN_CLASSIFICATIONS: REPLAN_CLASSIFICATIONS, createObservationSignature: createObservationSignature, createIntentSignature: createIntentSignature, classifyReplanEligibility: classifyReplanEligibility, evaluateNoProgress: evaluateNoProgress, createAgentDriver: createAgentDriver });
}));
