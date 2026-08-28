(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory());
        if (Object.prototype.hasOwnProperty.call(root, "VelaPlanController") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaPlanController", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function createPlanController(options) {
        var protocol = options && options.protocol;
        if (!protocol || !protocol.isPlainObject(options)) { throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        protocol.assertNoUnknownKeys(options, ["protocol", "materializer", "projectionFactory", "preflight", "planStore", "taskRunFactory", "taskRunIdFactory", "now"], "planController.options");
        if (!Object.prototype.hasOwnProperty.call(options, "projectionFactory")) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Plan review projection is unavailable."); }
        var materializer = protocol.getOwnDataProperty(options, "materializer");
        var projectionFactory = protocol.getOwnDataProperty(options, "projectionFactory");
        var preflight = protocol.getOwnDataProperty(options, "preflight");
        var planStore = protocol.getOwnDataProperty(options, "planStore");
        var taskRunFactory = protocol.getOwnDataProperty(options, "taskRunFactory");
        var taskRunIdFactory = protocol.getOwnDataProperty(options, "taskRunIdFactory");
        var now = protocol.getOwnDataProperty(options, "now");
        if (!materializer || typeof materializer.materialize !== "function" || !projectionFactory || typeof projectionFactory.project !== "function" || !preflight || typeof preflight.confirmBoundPlan !== "function" ||
                typeof preflight.executeStep !== "function" || typeof preflight.discardBoundPlan !== "function" || !planStore ||
                typeof planStore.getPlanView !== "function" || typeof taskRunFactory !== "function" || typeof taskRunIdFactory !== "function" || typeof now !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "PlanController dependencies are unavailable.");
        }
        var records = new Map();
        var authorityIds = new Set();
        var taskRunIds = new Set();
        var disposed = false;
        var generation = 0;

        function failDisposed() { if (disposed) { protocol.fail(protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "PlanController is disposed."); } }
        function recordFor(executionPlanId) {
            var id = protocol.assertNonEmptyString(executionPlanId, "planController.executionPlanId", protocol.HARD_LIMITS.maxLocalIdBytes);
            if (!records.has(id)) { protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "PlanController record was not found."); }
            return records.get(id);
        }
        function stableCode(error) { return error && typeof error.code === "string" ? error.code : protocol.ERROR_CODES.PLAN_FAILED; }
        function progress(record) {
            var task = record.taskRun.snapshot();
            var plan = planStore.getPlanView(record.materializedPlan.executionPlanId);
            return protocol.deepFreeze({
                taskRunId: task.taskRunId,
                authorizedPlanId: task.authorizedPlanId,
                executionPlanId: task.executionPlanId,
                taskState: task.state,
                executionArmed: task.executionArmed,
                actionCount: plan.actionCount,
                nextStep: plan.nextStep,
                candidateStates: plan.candidates.map(function (candidate) { return candidate.state; }),
                terminalErrorCode: task.terminalErrorCode,
                cancelReason: task.cancelReason
            });
        }

        function accept(authorizedPlan, executionInput) {
            return Promise.resolve().then(function () {
                failDisposed();
                if (authorizedPlan && typeof authorizedPlan.planId === "string" && authorityIds.has(authorizedPlan.planId)) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_REPLAY, "Authorized plan identity was already accepted."); }
                return materializer.materialize(authorizedPlan, executionInput);
            }).then(function (materialized) {
                failDisposed();
                if (records.has(materialized.executionPlanId) || authorityIds.has(materialized.authorizedPlanId)) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_REPLAY, "Authorized or execution plan identity was already accepted."); }
                var projection;
                try { projection = projectionFactory.project(authorizedPlan, materialized); }
                catch (errorProjection) {
                    try { preflight.discardBoundPlan({ planId: materialized.executionPlanId, reason: "review-projection-failed" }); } catch (ignoredDiscard) { /* preserve the projection failure */ }
                    throw errorProjection;
                }
                var taskRunId;
                try { taskRunId = taskRunIdFactory("taskRun"); } catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "TaskRun identity factory failed."); }
                protocol.assertNonEmptyString(taskRunId, "planController.taskRunId", protocol.HARD_LIMITS.maxLocalIdBytes);
                if (taskRunIds.has(taskRunId) || taskRunId === materialized.authorizedPlanId || taskRunId === materialized.executionPlanId) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "TaskRun identity collision."); }
                var taskRun = taskRunFactory({ protocol: protocol, taskRunId: taskRunId, authorizedPlanId: materialized.authorizedPlanId, executionPlanId: materialized.executionPlanId, now: now });
                var record = { materializedPlan: materialized, projection: projection, taskRun: taskRun, running: false, generation: 0 };
                records.set(materialized.executionPlanId, record);
                authorityIds.add(materialized.authorizedPlanId);
                taskRunIds.add(taskRunId);
                return progress(record);
            });
        }

        function confirm(executionPlanId) {
            failDisposed();
            var record = recordFor(executionPlanId);
            if (record.taskRun.snapshot().state !== "waiting-approval") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "TaskRun is not waiting for approval."); }
            if (!record.projection || record.projection.revision !== record.materializedPlan.authorizedPlanRevision) { protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "Plan review projection revision is inconsistent."); }
            return Promise.resolve(preflight.confirmBoundPlan({ planId: executionPlanId })).then(function () {
                failDisposed();
                record.taskRun.arm();
                return progress(record);
            });
        }

        function run(executionPlanId) {
            failDisposed();
            var record = recordFor(executionPlanId);
            var task = record.taskRun.snapshot();
            if (task.state !== "active" || task.executionArmed !== true) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "TaskRun is not armed."); }
            if (record.running) { protocol.fail(protocol.ERROR_CODES.EXECUTION_BUSY, "PlanController run is already active."); }
            record.running = true;
            var capturedGeneration = generation;
            var capturedRecordGeneration = record.generation;
            var chain = Promise.resolve();
            var index;
            for (index = 0; index < protocol.HARD_LIMITS.maxPlanSteps; index += 1) {
                chain = chain.then(function () {
                    var currentTask = record.taskRun.snapshot();
                    if (disposed || generation !== capturedGeneration || record.generation !== capturedRecordGeneration || currentTask.state !== "active" || currentTask.executionArmed !== true) { return null; }
                    var view = planStore.getPlanView(executionPlanId);
                    if (view.state === "consumed") { record.taskRun.complete(); return null; }
                    if (view.nextStep >= view.actionCount) { protocol.fail(protocol.ERROR_CODES.PLAN_FAILED, "Execution plan did not reach a terminal state."); }
                    return Promise.resolve(preflight.executeStep({ planId: executionPlanId, stepIndex: view.nextStep })).then(function () {
                        var completedView = planStore.getPlanView(executionPlanId);
                        if (completedView.state === "consumed" && record.taskRun.snapshot().state === "active") { record.taskRun.complete(); }
                        return null;
                    });
                });
            }
            return chain.then(function () {
                record.running = false;
                var finalView = planStore.getPlanView(executionPlanId);
                if (record.taskRun.snapshot().state === "active" && finalView.state !== "consumed") { record.taskRun.block(protocol.ERROR_CODES.PLAN_FAILED); }
                return progress(record);
            }, function (error) {
                record.running = false;
                if (record.taskRun.snapshot().state === "active") { record.taskRun.block(stableCode(error)); }
                throw error;
            });
        }

        function cancel(executionPlanId, reason) {
            failDisposed();
            var record = recordFor(executionPlanId);
            record.taskRun.cancel(reason);
            record.generation += 1;
            try { preflight.discardBoundPlan({ planId: executionPlanId, reason: reason || "cancelled" }); } catch (ignored) { /* in-flight steps are not forcibly interrupted */ }
            return progress(record);
        }

        function getProgress(executionPlanId) { return progress(recordFor(executionPlanId)); }
        function getReviewState(executionPlanId) {
            var record = recordFor(executionPlanId);
            return protocol.deepFreeze({ executionPlanId: executionPlanId, review: record.materializedPlan.review, actionCount: record.materializedPlan.actionCount, projection: record.projection });
        }
        function dispose() {
            if (disposed) { return false; }
            disposed = true; generation += 1;
            records.forEach(function (record) {
                var state = record.taskRun.snapshot().state;
                if (state === "waiting-approval" || state === "active") {
                    try { record.taskRun.dispose(); } catch (ignored) { /* already terminal */ }
                    record.generation += 1;
                    try { preflight.discardBoundPlan({ planId: record.materializedPlan.executionPlanId, reason: "controller-disposed" }); } catch (ignoredDiscard) { /* no force-abort */ }
                }
            });
            return true;
        }

        return Object.freeze({ accept: accept, cancel: cancel, confirm: confirm, dispose: dispose, getProgress: getProgress, getReviewState: getReviewState, run: run });
    }

    return { createPlanController: createPlanController };
}));
