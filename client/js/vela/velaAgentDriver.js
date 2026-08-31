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
    var MODULE_REVISION = "vela-agent-driver-0.3.7-a2-b1-v1";
    var ERROR_CODES = Object.freeze({
        AGENT_DRIVER_INVALID_OPTIONS: "AGENT_DRIVER_INVALID_OPTIONS",
        AGENT_DRIVER_BUSY: "AGENT_DRIVER_BUSY",
        AGENT_DRIVER_DISPOSED: "AGENT_DRIVER_DISPOSED",
        AGENT_DRIVER_INVALID_OBJECTIVE: "AGENT_DRIVER_INVALID_OBJECTIVE",
        AGENT_DRIVER_ILLEGAL_TRANSITION: "AGENT_DRIVER_ILLEGAL_TRANSITION",
        AGENT_DRIVER_REASON_INVALID: "AGENT_DRIVER_REASON_INVALID",
        AGENT_DRIVER_EXECUTION_FAILED: "AGENT_DRIVER_EXECUTION_FAILED",
        AGENT_DRIVER_TASK_UNVERIFIED: "AGENT_DRIVER_TASK_UNVERIFIED",
        AGENT_DRIVER_REVIEW_INVALID: "AGENT_DRIVER_REVIEW_INVALID"
    });
    function error(code) { var value = new Error(code); value.code = code; return value; }
    function plain(value) { var prototype; if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; } prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; }
    function stableCode(value, fallback) { return value && typeof value.code === "string" ? value.code : fallback; }
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
        function snapshot() { return Object.freeze({ state: state, objectiveId: active ? active.objectiveId : null, taskId: active ? active.taskId : null, taskPlan: active ? active.taskPlan : null, turn: active ? active.turn : null, suspendedReview: active ? active.suspendedReview : null, reviewResolution: active ? active.reviewResolution : null, terminal: active ? active.terminal : null, counters: Object.freeze(active ? { observations: active.observations, reasoningTurns: active.reasoningTurns, actions: active.actions, replans: 0 } : { observations: 0, reasoningTurns: 0, actions: 0, replans: 0 }), disposed: disposed }); }
        function notify() { var current = snapshot(); listeners.slice().forEach(function (listener) { try { listener(current); } catch (listenerError) { try { onListenerError(listenerError, Object.freeze({ phase: "driver-listener" })); } catch (ignored) {} } }); }
        function transition(next) { var legal = { idle: ["observing"], observing: ["reasoning", "terminal"], reasoning: ["awaiting-outcome", "terminal"], "awaiting-outcome": ["awaiting-review", "verifying", "terminal"], "awaiting-review": ["awaiting-outcome", "terminal"], verifying: ["terminal"] }; if (!legal[state] || legal[state].indexOf(next) === -1) { throw error(ERROR_CODES.AGENT_DRIVER_ILLEGAL_TRANSITION); } state = next; notify(); }
        function event(kind, payload) { append({ kind: kind, requestId: active.objectiveId, payload: payload || {} }); }
        function terminal(outcome, code) { if (!active || active.terminal) { return snapshot(); } active.suspendedReview = null; active.terminal = Object.freeze({ outcome: outcome, code: code || null }); transition("terminal"); event(outcome === "completed" ? "task/completed" : outcome === "cancelled" ? "task/cancelled" : outcome === "rejected" ? "task/review-rejected" : "task/blocked", { taskId: active.taskId, taskPlanId: active.taskPlan ? active.taskPlan.planId : null, code: code || null }); return snapshot(); }
        function current(captured) { return !disposed && active && !active.terminal && generation === captured; }
        function buildPlan(reason) {
            var opacity;
            var intent;
            if (!plain(reason) || reason.capabilityId !== "set-opacity-v1" || !plain(reason.params)) { throw error(ERROR_CODES.AGENT_DRIVER_REASON_INVALID); }
            opacity = reason.params.opacity;
            if (typeof opacity !== "number" || !isFinite(opacity) || opacity < 0 || opacity > 100) { throw error(ERROR_CODES.AGENT_DRIVER_REASON_INVALID); }
            intent = planning.createCapabilityIntent({ intentId: "intent_agent_" + serial, capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: opacity } });
            active.taskPlan = planning.createTaskPlan({ planId: "task_plan_agent_" + serial, taskId: active.taskId, revision: 0, steps: [{ stepId: "operate_opacity_" + serial, kind: "operate", capabilityIntent: { intentId: intent.intentId, capabilityId: intent.capabilityId, requestedOperation: intent.requestedOperation, params: { opacity: opacity } }, rationale: "Apply the bounded opacity objective.", metadata: { expectedOpacity: opacity } }] });
            planning.assertTaskPlanNotExecutable(active.taskPlan);
            active.intent = intent;
            return intent;
        }
        function fail(captured, failure) { if (!current(captured)) { return snapshot(); } return terminal("blocked", stableCode(failure, ERROR_CODES.AGENT_DRIVER_EXECUTION_FAILED)); }
        function startObjective(input) {
            var captured;
            var reasonInput;
            if (disposed) { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_DISPOSED)); }
            if (state === "terminal") { state = "idle"; active = null; }
            if (state !== "idle") { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_BUSY)); }
            if (!plain(input) || typeof input.message !== "string" || !/\S/.test(input.message) || typeof input.endpoint !== "string" || typeof input.model !== "string") { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_INVALID_OBJECTIVE)); }
            if (!runtimePort) { return Promise.reject(error(ERROR_CODES.AGENT_DRIVER_INVALID_OPTIONS)); }
            serial += 1; generation += 1; captured = generation;
            active = { objectiveId: "objective_agent_" + serial, taskId: "agent_task_" + serial, taskPlan: null, intent: null, turn: beginTurn(), suspendedReview: null, reviewResolution: null, terminal: null, observations: 0, reasoningTurns: 0, actions: 0, committed: false };
            event("task/started", { taskId: active.taskId, objective: input.message });
            transition("observing");
            return Promise.resolve(observe()).then(function () {
                if (!current(captured)) { return snapshot(); }
                active.observations += 1; event("ae/state-observed", { taskId: active.taskId, phase: "pre-action", observationRevision: getObservation() && getObservation().observationRevision || null });
                transition("reasoning"); active.reasoningTurns += 1;
                reasonInput = { message: input.message, endpoint: input.endpoint, model: input.model };
                return runtimePort.reason(reasonInput);
            }).then(function (reason) {
                var intent;
                if (!current(captured) || !reason) { return snapshot(); }
                intent = buildPlan(reason); transition("awaiting-outcome"); active.actions += 1;
                event("agent/action-performed", { taskId: active.taskId, taskPlanId: active.taskPlan.planId, stepId: active.taskPlan.steps[0].stepId, capabilityId: intent.capabilityId, phase: "submitted" });
                return runtimePort.submitIntent({ sessionId: active.turn.sessionId, taskId: active.taskId, taskPlanId: active.taskPlan.planId, stepId: active.taskPlan.steps[0].stepId, capabilityIntent: intent });
            }).then(function (outcome) {
                if (!current(captured) || !outcome) { return snapshot(); }
                if (outcome.state === "review-required") {
                    var beforeValue = typeof outcome.beforeValue === "number" && isFinite(outcome.beforeValue) && outcome.beforeValue >= 0 && outcome.beforeValue <= 100 ? outcome.beforeValue : null;
                    active.suspendedReview = Object.freeze({ objectiveId: active.objectiveId, taskId: active.taskId, sessionId: active.turn.sessionId, turnId: active.turn.turnId, taskPlanId: active.taskPlan.planId, taskPlanRevision: active.taskPlan.revision, stepId: active.taskPlan.steps[0].stepId, capabilityId: active.intent.capabilityId, params: Object.freeze({ opacity: active.intent.params.opacity }), localExpectation: Object.freeze({ opacity: active.intent.params.opacity }), beforeValue: beforeValue, reviewId: "agent_review_" + serial + "_" + generation, revision: generation });
                    transition("awaiting-review");
                    event("task/review-required", { taskId: active.taskId, taskPlanId: active.taskPlan.planId, stepId: active.taskPlan.steps[0].stepId, reviewId: active.suspendedReview.reviewId, reviewRevision: active.suspendedReview.revision, code: outcome.code || "REVIEW_REQUIRED" });
                    return snapshot();
                }
                if (outcome.state === "denied") { return terminal("blocked", outcome.code || "PERMISSION_DENIED"); }
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
        function resolveReview(input) {
            var review;
            var outcome;
            if (disposed) { throw error(ERROR_CODES.AGENT_DRIVER_DISPOSED); }
            review = active && active.suspendedReview;
            if (state !== "awaiting-review" || !review || !plain(input) || Object.keys(input).sort().join(",") !== "outcome,reviewId,revision" || input.reviewId !== review.reviewId || input.revision !== review.revision || (input.outcome !== "approved" && input.outcome !== "rejected")) { throw error(ERROR_CODES.AGENT_DRIVER_REVIEW_INVALID); }
            outcome = input.outcome;
            active.suspendedReview = null;
            active.reviewResolution = Object.freeze({ reviewId: review.reviewId, revision: review.revision, outcome: outcome, objectiveId: review.objectiveId, taskId: review.taskId, taskPlanId: review.taskPlanId, stepId: review.stepId });
            if (outcome === "rejected") { return terminal("rejected", "REVIEW_REJECTED"); }
            transition("awaiting-outcome");
            return snapshot();
        }
        function cancel() { generation += 1; if (disposed || !active || active.terminal || state === "idle" || state === "terminal") { return false; } try { if (runtimePort && typeof runtimePort.cancel === "function") { runtimePort.cancel(); } } catch (ignored) {} terminal("cancelled", "AGENT_DRIVER_CANCELLED"); return true; }
        function attachRuntimePort(port) { if (disposed || runtimePort || !port || typeof port.reason !== "function" || typeof port.submitIntent !== "function" || typeof port.verifyOpacity !== "function") { return false; } runtimePort = port; return true; }
        function dispose() { if (disposed) { return false; } if (active && !active.terminal && state !== "idle") { cancel(); } disposed = true; generation += 1; runtimePort = null; listeners = []; return true; }
        return Object.freeze({ attachRuntimePort: attachRuntimePort, startObjective: startObjective, resolveReview: resolveReview, cancel: cancel, dispose: dispose, getSnapshot: snapshot, subscribe: function (listener) { var subscribed = true; if (typeof listener !== "function" || disposed) { throw error(ERROR_CODES.AGENT_DRIVER_DISPOSED); } listeners.push(listener); try { listener(snapshot()); } catch (listenerError) { try { onListenerError(listenerError, Object.freeze({ phase: "driver-listener" })); } catch (ignored) {} } return Object.freeze({ unsubscribe: function () { var index; if (!subscribed) { return; } subscribed = false; index = listeners.indexOf(listener); if (index !== -1) { listeners.splice(index, 1); } } }); } });
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, ERROR_CODES: ERROR_CODES, createAgentDriver: createAgentDriver });
}));
