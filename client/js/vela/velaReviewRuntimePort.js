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

    function createObjectiveReviewRuntimePort(options) {
        var protocol = options && options.protocol;
        var ownerPort;
        var invalidatedReviewId = null;
        var invalidatedRevision = null;
        if (!protocol || !protocol.isPlainObject(options)) { throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        protocol.assertNoUnknownKeys(options, ["protocol", "ownerPort"], "objectiveReviewRuntimePort.options");
        ownerPort = protocol.getOwnDataProperty(options, "ownerPort");
        if (!ownerPort || typeof ownerPort.getProjection !== "function" || typeof ownerPort.resolve !== "function") { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Objective review owner port is unavailable."); }
        function projection() {
            var value;
            value = ownerPort.getProjection();
            if (!value || (value.state !== "inactive" && value.state !== "active" && value.state !== "resolved")) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Objective review projection is invalid."); }
            if (value.state === "active" && (typeof value.reviewId !== "string" || !Number.isInteger(value.revision) || value.revision < 1 || (value.capabilityId !== "set-opacity-v1" && value.capabilityId !== "set-layer-name-v1") || (value.capabilityId === "set-opacity-v1" ? ((value.beforeValue !== null && (typeof value.beforeValue !== "number" || !isFinite(value.beforeValue) || value.beforeValue < 0 || value.beforeValue > 100)) || typeof value.proposedValue !== "number" || !isFinite(value.proposedValue) || value.proposedValue < 0 || value.proposedValue > 100) : (typeof value.beforeValue !== "string" || typeof value.proposedValue !== "string" || value.valueKind !== "string")) || value.outcome !== null)) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Active objective review projection is invalid."); }
            if (value.state === "resolved" && value.outcome !== "approved" && value.outcome !== "rejected") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Resolved objective review projection is invalid."); }
            if (value.state === "active" && value.reviewId === invalidatedReviewId && value.revision === invalidatedRevision) { return protocol.deepFreeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null }); }
            return protocol.deepFreeze({ state: value.state, reviewId: value.reviewId || null, revision: Number.isInteger(value.revision) ? value.revision : null, capabilityId: value.capabilityId || null, valueKind: value.state === "active" ? (value.capabilityId === "set-layer-name-v1" ? "string" : "number") : null, beforeValue: typeof value.beforeValue === "number" || typeof value.beforeValue === "string" ? value.beforeValue : null, proposedValue: typeof value.proposedValue === "number" || typeof value.proposedValue === "string" ? value.proposedValue : null, outcome: value.outcome || null });
        }
        function resolve(outcome) {
            var current = projection();
            if (current.state !== "active" || (outcome !== "approved" && outcome !== "rejected")) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Objective review is not active."); }
            return ownerPort.resolve({ reviewId: current.reviewId, revision: current.revision, outcome: outcome });
        }
        function invalidate() { var current = projection(); if (current.state !== "active") { return false; } invalidatedReviewId = current.reviewId; invalidatedRevision = current.revision; return true; }
        return Object.freeze({ getProjection: projection, resolve: resolve, invalidate: invalidate });
    }

    return { createReviewRuntimePort: createReviewRuntimePort, createObjectiveReviewRuntimePort: createObjectiveReviewRuntimePort };
}));
