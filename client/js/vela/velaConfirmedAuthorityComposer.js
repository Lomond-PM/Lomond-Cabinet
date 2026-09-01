(function (root, factory) {
    "use strict";
    var planning = root && root.self === root ? root.VelaPlanningContracts : (typeof module === "object" && module.exports ? require("./velaPlanningContracts") : null);
    var exported = Object.freeze(factory(planning));
    if (root && root.self === root && root["win" + "dow"] === root) {
        if (Object.prototype.hasOwnProperty.call(root, "VelaConfirmedAuthorityComposer") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaConfirmedAuthorityComposer", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function (planning) {
    "use strict";
    var MODULE_REVISION = "vela-confirmed-authority-composer-0.3.7-c2-d1-f1-v1";
    function fail(code) { var error = new Error(code); error.code = code; throw error; }
    function plain(value) { var prototype; if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; } prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; }
    function validateCanonical(value, stack) {
        var type = typeof value;
        var names;
        var symbols;
        var index;
        var descriptor;
        if (value === null || type === "string" || type === "boolean") { return true; }
        if (type === "number") { if (!Number.isFinite(value) || Object.is(value, -0)) { fail("LIFECYCLE_BLOCKED"); } return true; }
        if (type !== "object" || (!Array.isArray(value) && !plain(value)) || !Object.isFrozen(value)) { fail("LIFECYCLE_BLOCKED"); }
        if (stack.indexOf(value) !== -1) { fail("LIFECYCLE_BLOCKED"); }
        stack.push(value);
        symbols = typeof Object.getOwnPropertySymbols === "function" ? Object.getOwnPropertySymbols(value) : [];
        if (symbols.length !== 0) { fail("LIFECYCLE_BLOCKED"); }
        names = Object.getOwnPropertyNames(value);
        if (Array.isArray(value)) {
            for (index = 0; index < value.length; index += 1) { if (!Object.prototype.hasOwnProperty.call(value, String(index))) { fail("LIFECYCLE_BLOCKED"); } }
            if (names.length !== value.length + 1 || names[names.length - 1] !== "length") { fail("LIFECYCLE_BLOCKED"); }
        }
        names.forEach(function (key) {
            if (Array.isArray(value) && key === "length") { return; }
            descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.enumerable !== true || descriptor.writable !== false || descriptor.configurable !== false) { fail("LIFECYCLE_BLOCKED"); }
            validateCanonical(descriptor.value, stack);
        });
        stack.pop();
        return true;
    }
    function canonical(value) { validateCanonical(value, []); if (Array.isArray(value)) { return "[" + value.map(canonical).join(",") + "]"; } if (plain(value)) { return "{" + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ":" + canonical(value[key]); }).join(",") + "}"; } return JSON.stringify(value); }
    function same(left, right) { return canonical(left) === canonical(right); }
    function stableCode(error) { return error && typeof error.code === "string" ? error.code : "PLAN_FAILED"; }
    function createReviewedPolicySemantics(decision) { var provenance = decision && decision.provenance || {}; return Object.freeze({ decision: decision && decision.decision, reasonCode: decision && decision.reasonCode || null, issuedBy: decision && decision.issuedBy || null, rule: provenance.rule || null, capabilityId: provenance.capabilityId || null, requestedOperation: provenance.requestedOperation || null, authoritySource: provenance.authoritySource || null }); }
    function createReviewedSemantics(intent, candidate, resolveRegisteredAction) {
        var action = typeof resolveRegisteredAction === "function" ? resolveRegisteredAction(candidate && candidate.capabilityId) : null;
        if (!planning || !planning.isCapabilityIntent(intent) || !candidate || !action || typeof action.toolId !== "string" || typeof action.actionId !== "string") { fail("LIFECYCLE_BLOCKED"); }
        return Object.freeze({ capabilityId: candidate.capabilityId, requestedOperation: intent.requestedOperation, operationKind: candidate.operationKind, kind: candidate.kind, risk: candidate.risk, params: candidate.params, targetScope: candidate.targetScope, targetProperty: "opacity", requiresConfirmation: candidate.requiresConfirmation, registeredAction: Object.freeze({ toolId: action.toolId, actionId: action.actionId }), provenance: candidate.provenance });
    }
    function createConfirmedAuthorityComposer(options) {
        var compiler = options && options.compiler;
        var policyEngine = options && options.policyEngine;
        var planController = options && options.planController;
        var resolveRegisteredAction = options && options.resolveRegisteredAction;
        var makePlanId = options && options.makePlanId;
        var getRuntimeGeneration = options && options.getRuntimeGeneration;
        var claimApprovedReview = options && options.claimApprovedReview;
        var state = "idle";
        var generation = 0;
        var activeRecord = null;
        var disposed = false;
        if (!planning || !plain(options) || !compiler || typeof compiler.compile !== "function" || !policyEngine || typeof policyEngine.evaluate !== "function" || !planController || typeof planController.accept !== "function" || typeof planController.confirm !== "function" || typeof planController.cancel !== "function" || typeof resolveRegisteredAction !== "function" || typeof makePlanId !== "function" || typeof getRuntimeGeneration !== "function" || typeof claimApprovedReview !== "function") { fail("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        function reviewedSnapshot(value) {
            var keys = ["capabilityId", "requestedOperation", "operationKind", "kind", "risk", "params", "targetScope", "targetProperty", "requiresConfirmation", "registeredAction", "provenance"];
            if (!plain(value) || Object.keys(value).sort().join(",") !== keys.slice().sort().join(",") || value.targetProperty !== "opacity") { fail("LIFECYCLE_BLOCKED"); }
            validateCanonical(value, []);
            return value;
        }
        function current(record) { return !disposed && activeRecord === record && generation === record.generation && record.cancelled !== true && getRuntimeGeneration() === record.runtimeGeneration; }
        function officialCancel(record, reason) {
            var result;
            if (!record || record.terminalized === true) { return true; }
            if (!record.executionPlanId) { return false; }
            try { result = planController.cancel(record.executionPlanId, reason || "cancelled"); }
            catch (error) { record.cancellationErrorCode = stableCode(error); return false; }
            if (!result || result.taskState !== "cancelled" || result.executionArmed !== false) { record.cancellationErrorCode = "PLAN_FAILED"; return false; }
            record.terminalized = true; record.cancellationErrorCode = null; return true;
        }
        function finish(record) { if (activeRecord === record) { activeRecord = null; if (!disposed) { state = "idle"; } } }
        function cancelledResult() { return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
        function compose(input) {
            var intent;
            var reviewed;
            var freshCandidate;
            var decision;
            var freshSemantics;
            var record;
            if (disposed || state !== "idle" || !plain(input) || !plain(input.review) || !plain(input.policyContext)) { return Promise.resolve(Object.freeze({ state: "blocked", code: "LIFECYCLE_BLOCKED" })); }
            try {
                intent = input.capabilityIntent;
                reviewed = reviewedSnapshot(input.reviewedSemantics);
                freshCandidate = compiler.compile(intent);
                freshSemantics = createReviewedSemantics(intent, freshCandidate, resolveRegisteredAction);
                if (!same(freshSemantics, reviewed)) { return Promise.resolve(Object.freeze({ state: "blocked", code: "LIFECYCLE_BLOCKED" })); }
                decision = policyEngine.evaluate(freshCandidate, input.policyContext);
                if (!decision || decision.decision === "DENY") { return Promise.resolve(Object.freeze({ state: "blocked", code: "PERMISSION_DENIED" })); }
                if (decision.decision !== "REVIEW_REQUIRED" || !same(createReviewedPolicySemantics(decision), input.reviewPolicySemantics)) { return Promise.resolve(Object.freeze({ state: "blocked", code: "LIFECYCLE_BLOCKED" })); }
            } catch (error) { return Promise.resolve(Object.freeze({ state: "blocked", code: stableCode(error) })); }
            generation += 1;
            record = { generation: generation, runtimeGeneration: getRuntimeGeneration(), cancelled: false, claimed: false, executionPlanId: null, phase: "claim-pending", terminalized: false, cancellationErrorCode: null };
            activeRecord = record; state = "composing";
            return Promise.resolve().then(function () {
                if (!current(record)) { return cancelledResult(); }
                return claimApprovedReview({ reviewId: input.review.reviewId, reviewRevision: input.review.reviewRevision, reviewCorrelation: input.review.reviewCorrelation, objectiveId: input.review.objectiveId, taskId: input.review.taskId, sessionId: input.review.sessionId, turnId: input.review.turnId, taskPlanId: input.review.taskPlanId, taskPlanRevision: input.review.taskPlanRevision, stepId: input.review.stepId, capabilityIntent: intent, reviewedSemantics: reviewed, reviewPolicySemantics: input.reviewPolicySemantics, freshSemantics: freshSemantics, freshCandidateId: freshCandidate.candidateId, runtimeGeneration: record.runtimeGeneration });
            }).then(function (claim) {
                var plan;
                if (!current(record)) { return cancelledResult(); }
                if (!claim || claim.claimed !== true) { finish(record); return Object.freeze({ state: "blocked", code: claim && claim.code || "LIFECYCLE_BLOCKED" }); }
                record.claimed = true;
                plan = planning.createAuthorizedPlan({ planId: makePlanId("confirmedPlan"), revision: 0, steps: [{ candidateId: freshCandidate.candidateId, capabilityId: freshCandidate.capabilityId, kind: freshCandidate.kind, risk: freshCandidate.risk, params: freshCandidate.params, targetScope: { type: freshCandidate.targetScope.type, property: "opacity" }, requiresConfirmation: freshCandidate.requiresConfirmation, policyDecision: { decision: decision.decision, reasonCode: decision.reasonCode, provenance: decision.provenance, issuedBy: decision.issuedBy } }] });
                record.phase = "accept-pending";
                return Promise.resolve(planController.accept(plan, { selectionOrderMeaningful: true })).then(function (waiting) {
                    record.executionPlanId = waiting && waiting.executionPlanId || null;
                    if (!current(record)) { if (officialCancel(record, disposed ? "disposed" : "composition-cancelled")) { finish(record); } else { state = disposed ? "disposed" : "cancellation-failed"; } return cancelledResult(); }
                    if (!waiting || waiting.taskState !== "waiting-approval" || waiting.executionArmed !== false) { fail("PLAN_INVALID"); }
                    record.phase = "confirm-pending";
                    return Promise.resolve(planController.confirm(waiting.executionPlanId)).then(function (armed) {
                        if (!current(record)) { if (officialCancel(record, disposed ? "disposed" : "composition-cancelled")) { finish(record); } else { state = disposed ? "disposed" : "cancellation-failed"; } return cancelledResult(); }
                        if (!armed || armed.taskState !== "active" || armed.executionArmed !== true) { fail("PLAN_INVALID"); }
                        record.phase = "authority-ready";
                        state = "authority-ready";
                        return Object.freeze({ state: "authority-ready", code: null });
                    });
                });
            }).then(function (result) { if (result && result.state === "cancelled" && record.executionPlanId === null) { finish(record); } return result; }, function (error) { if (!record.executionPlanId || officialCancel(record, "composition-failed")) { finish(record); } else { state = disposed ? "disposed" : "cancellation-failed"; } return Object.freeze({ state: record.cancelled || disposed ? "cancelled" : "blocked", code: record.cancelled || disposed ? "AGENT_DRIVER_CANCELLED" : stableCode(error) }); });
        }
        function cancel() { var record = activeRecord; if (disposed || !record) { return false; } generation += 1; record.cancelled = true; if (record.phase === "claim-pending") { finish(record); return true; } if (officialCancel(record, "cancelled")) { finish(record); return true; } state = "cancellation-failed"; return false; }
        function dispose() { if (disposed) { return false; } var record = activeRecord; disposed = true; generation += 1; state = "disposed"; if (record) { record.cancelled = true; if (record.phase === "claim-pending" || officialCancel(record, "disposed")) { activeRecord = null; } } return true; }
        return Object.freeze({ compose: compose, cancel: cancel, dispose: dispose });
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, createReviewedSemantics: createReviewedSemantics, createReviewedPolicySemantics: createReviewedPolicySemantics, sameReviewedSemantics: same, createConfirmedAuthorityComposer: createConfirmedAuthorityComposer });
}));
