(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory());
        if (Object.prototype.hasOwnProperty.call(root, "VelaTaskRun") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaTaskRun", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var TASK_STATE = Object.freeze(["active", "paused", "waiting-approval", "blocked", "completed", "cancelled"]);
    var TERMINAL = Object.freeze(["blocked", "completed", "cancelled"]);

    function createTaskRun(options) {
        var protocol = options && options.protocol;
        if (!protocol || !protocol.isPlainObject(options)) { throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        protocol.assertNoUnknownKeys(options, ["protocol", "taskRunId", "authorizedPlanId", "executionPlanId", "now"], "taskRun.options");
        var taskRunId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(options, "taskRunId"), "taskRun.taskRunId", protocol.HARD_LIMITS.maxLocalIdBytes);
        var authorizedPlanId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(options, "authorizedPlanId"), "taskRun.authorizedPlanId", protocol.HARD_LIMITS.maxLocalIdBytes);
        var executionPlanId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(options, "executionPlanId"), "taskRun.executionPlanId", protocol.HARD_LIMITS.maxLocalIdBytes);
        var now = protocol.getOwnDataProperty(options, "now");
        if (typeof now !== "function" || taskRunId === authorizedPlanId || taskRunId === executionPlanId || authorizedPlanId === executionPlanId) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "TaskRun identities or clock are invalid."); }
        var state = "waiting-approval";
        var executionArmed = false;
        var createdAt = safeNow();
        var updatedAt = createdAt;
        var terminalErrorCode = null;
        var cancelReason = null;

        function safeNow() {
            var value;
            try { value = now(); } catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "TaskRun clock is unavailable."); }
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "TaskRun clock is unavailable."); }
            return value;
        }
        function terminal() { return TERMINAL.indexOf(state) !== -1; }
        function requireState(expected) {
            if (terminal() || state !== expected) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "TaskRun lifecycle transition is invalid."); }
        }
        function touch() { updatedAt = safeNow(); }
        function snapshot() {
            return Object.freeze({ taskRunId: taskRunId, authorizedPlanId: authorizedPlanId, executionPlanId: executionPlanId, state: state, executionArmed: executionArmed, createdAt: createdAt, updatedAt: updatedAt, terminalErrorCode: terminalErrorCode, cancelReason: cancelReason });
        }
        function arm() { requireState("waiting-approval"); state = "active"; executionArmed = true; touch(); return snapshot(); }
        function complete() { requireState("active"); state = "completed"; executionArmed = false; touch(); return snapshot(); }
        function block(errorCode) {
            requireState("active");
            terminalErrorCode = protocol.assertNonEmptyString(errorCode, "taskRun.terminalErrorCode", 128);
            state = "blocked"; executionArmed = false; touch(); return snapshot();
        }
        function cancel(reason) {
            if (terminal() || (state !== "waiting-approval" && state !== "active")) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "TaskRun cannot be cancelled."); }
            cancelReason = reason === undefined ? "cancelled" : protocol.assertNonEmptyString(reason, "taskRun.cancelReason", 256);
            state = "cancelled"; executionArmed = false; touch(); return snapshot();
        }
        function dispose() { return cancel("disposed"); }

        return Object.freeze({ arm: arm, block: block, cancel: cancel, complete: complete, dispose: dispose, snapshot: snapshot });
    }

    return { TASK_STATE: TASK_STATE, createTaskRun: createTaskRun };
}));
