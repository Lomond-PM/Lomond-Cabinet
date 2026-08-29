(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory());
        if (Object.prototype.hasOwnProperty.call(root, "VelaReviewRuntimePort") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaReviewRuntimePort", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function createReviewRuntimePort(options) {
        var protocol = options && options.protocol;
        if (!protocol || !protocol.isPlainObject(options)) { throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        protocol.assertNoUnknownKeys(options, ["protocol", "planController", "tokenFactory"], "reviewRuntimePort.options");
        var planController = protocol.getOwnDataProperty(options, "planController");
        var tokenFactory = protocol.getOwnDataProperty(options, "tokenFactory");
        if (!planController || typeof planController.getReviewState !== "function" || typeof planController.getProgress !== "function" || typeof tokenFactory !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Review runtime dependencies are unavailable.");
        }
        var records = new Map();
        var revisions = new Map();

        function tokenInput(value) { return protocol.assertNonEmptyString(value, "reviewRuntimePort.reviewToken", protocol.HARD_LIMITS.maxLocalIdBytes); }
        function planInput(value) { return protocol.assertNonEmptyString(value, "reviewRuntimePort.executionPlanId", protocol.HARD_LIMITS.maxLocalIdBytes); }
        function current(executionPlanId) {
            var review;
            var progress;
            try { review = planController.getReviewState(executionPlanId); progress = planController.getProgress(executionPlanId); }
            catch (error) { protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "Review record is unavailable."); }
            if (!review || !progress || progress.taskState !== "waiting-approval" || progress.executionArmed !== false ||
                    !review.projection || !Object.isFrozen(review.projection) || !Number.isInteger(review.projection.revision) || review.projection.revision < 0) {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Review record is not waiting for approval.");
            }
            return { projection: review.projection, authorizedPlanId: progress.authorizedPlanId, executionPlanId: progress.executionPlanId, taskRunId: progress.taskRunId };
        }
        function register(executionPlanId) {
            var id = planInput(executionPlanId);
            var state = current(id);
            var projection = state.projection;
            var token;
            try { token = tokenInput(tokenFactory("review")); }
            catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Review token factory failed."); }
            if (records.has(token) || token === id || token === state.executionPlanId || token === state.authorizedPlanId || token === state.taskRunId) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Review token collision.");
            }
            records.set(token, id);
            revisions.set(token, projection.revision);
            return token;
        }
        function resolve(reviewToken) {
            var token = tokenInput(reviewToken);
            var executionPlanId;
            var projection;
            var state;
            if (!records.has(token)) { protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "Review token is unavailable."); }
            executionPlanId = records.get(token);
            try { state = current(executionPlanId); projection = state.projection; }
            catch (error) { records.delete(token); revisions.delete(token); throw error; }
            if (projection.revision !== revisions.get(token)) { records.delete(token); revisions.delete(token); protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "Review projection revision is stale."); }
            return protocol.deepFreeze({ reviewToken: token, projection: projection });
        }
        function invalidate(reviewToken) { var token = tokenInput(reviewToken); revisions.delete(token); return records.delete(token); }
        function invalidateAll() { var changed = records.size > 0; records.clear(); revisions.clear(); return changed; }

        return Object.freeze({ register: register, resolve: resolve, invalidate: invalidate, invalidateAll: invalidateAll });
    }

    return { createReviewRuntimePort: createReviewRuntimePort };
}));
