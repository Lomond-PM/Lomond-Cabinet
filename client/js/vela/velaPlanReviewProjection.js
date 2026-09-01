(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory());
        if (Object.prototype.hasOwnProperty.call(root, "VelaPlanReviewProjection") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaPlanReviewProjection", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var LABEL_KEYS = Object.freeze({
        capabilities: Object.freeze({ "set-opacity-v1": "vela.planReviewCapabilitySetOpacity" }),
        parameters: Object.freeze({ opacity: "vela.planReviewParameterOpacity" }),
        risks: Object.freeze({ write: "vela.planReviewRiskWrite" }),
        targets: Object.freeze({ "selected-layer": "vela.planReviewTargetSelectedLayer" })
    });

    function createPlanReviewProjection(options) {
        var protocol = options && options.protocol;
        var planning = options && options.planningContracts;
        var capabilities = options && options.capabilityContracts;
        if (!protocol || !protocol.isPlainObject(options) || !planning || !capabilities ||
                typeof planning.createAuthorizedPlan !== "function" || typeof planning.isAuthorizedPlan !== "function" ||
                typeof planning.assertAuthorizedPlanNoTrustedBinding !== "function" || typeof planning.assertPolicyDecisionClosed !== "function" ||
                typeof planning.assertTrustedDecisionSource !== "function" || typeof capabilities.getLocalProjection !== "function" ||
                typeof capabilities.validateCapabilityParams !== "function") {
            throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE");
        }
        protocol.assertNoUnknownKeys(options, ["protocol", "planningContracts", "capabilityContracts"], "planReviewProjection.options");

        function fail(code, message) { protocol.fail(code, message, { stage: "plan-review-projection" }); }
        function canonicalAuthorizedPlan(value) {
            var rebuilt;
            if (!planning.isAuthorizedPlan(value) || !Object.isFrozen(value)) { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A frozen AuthorizedPlan contract is required."); }
            try {
                rebuilt = planning.createAuthorizedPlan({ planId: value.planId, revision: value.revision, steps: value.steps.map(function (step) {
                    var raw = { candidateId: step.candidateId, capabilityId: step.capabilityId, kind: step.kind, risk: step.risk, params: step.params, targetScope: step.targetScope, requiresConfirmation: step.requiresConfirmation };
                    if (step.policyDecision) { raw.policyDecision = { decision: step.policyDecision.decision, reasonCode: step.policyDecision.reasonCode, provenance: step.policyDecision.provenance, issuedBy: step.policyDecision.issuedBy }; }
                    if (step.grantProvenance) { raw.grantProvenance = step.grantProvenance; }
                    if (step.authorityEvidence) { raw.authorityEvidence = { eventKind: step.authorityEvidence.eventKind, seq: step.authorityEvidence.seq, requestId: step.authorityEvidence.requestId, evidenceType: step.authorityEvidence.evidenceType }; }
                    return raw;
                }) });
                planning.assertAuthorizedPlanNoTrustedBinding(rebuilt);
            } catch (error) { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "AuthorizedPlan validation failed."); }
            if (protocol.canonicalStringify(rebuilt, { allowDangerousPaths: ["steps.*.candidateId", "steps.*.policyDecision.provenance.candidateId"] }) !== protocol.canonicalStringify(value, { allowDangerousPaths: ["steps.*.candidateId", "steps.*.policyDecision.provenance.candidateId"] })) {
                fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "AuthorizedPlan is not canonical.");
            }
            return rebuilt;
        }
        function assertMaterializedPair(plan, materialized) {
            var ids;
            var index;
            if (!protocol.isPlainObject(materialized)) { fail(protocol.ERROR_CODES.PLAN_INVALID, "MaterializedPlan is invalid."); }
            ids = protocol.getOwnDataProperty(materialized, "authorityCandidateIds");
            if (protocol.getOwnDataProperty(materialized, "authorizedPlanId") !== plan.planId ||
                    protocol.getOwnDataProperty(materialized, "authorizedPlanRevision") !== plan.revision ||
                    protocol.getOwnDataProperty(materialized, "actionCount") !== plan.steps.length || !Array.isArray(ids) || ids.length !== plan.steps.length) {
                fail(protocol.ERROR_CODES.PLAN_INVALID, "AuthorizedPlan and MaterializedPlan do not match.");
            }
            for (index = 0; index < ids.length; index += 1) {
                if (ids[index] !== plan.steps[index].candidateId) { fail(protocol.ERROR_CODES.PLAN_INVALID, "Materialized action order does not match AuthorizedPlan order."); }
            }
        }
        function observedBefore(materialized) {
            var review = protocol.getOwnDataProperty(materialized, "review");
            if (!protocol.isPlainObject(review)) { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Materialized review observation is invalid."); }
            protocol.assertNoUnknownKeys(review, ["valueKind", "beforeValue"], "planReviewProjection.review");
            if (protocol.getOwnDataProperty(review, "valueKind") !== "number" || typeof protocol.getOwnDataProperty(review, "beforeValue") !== "number" ||
                    !Number.isFinite(protocol.getOwnDataProperty(review, "beforeValue")) || Object.is(protocol.getOwnDataProperty(review, "beforeValue"), -0) ||
                    protocol.getOwnDataProperty(review, "beforeValue") < 0 || protocol.getOwnDataProperty(review, "beforeValue") > 100) {
                fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Materialized review observation is invalid.");
            }
            return { source: "observed", valueKind: "number", value: protocol.getOwnDataProperty(review, "beforeValue") };
        }
        function projectStep(step, index, before) {
            var capability;
            var params;
            var opacitySchema;
            if (step.capabilityId !== "set-opacity-v1" || !Object.prototype.hasOwnProperty.call(LABEL_KEYS.capabilities, step.capabilityId)) { fail(protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Capability is not review-projectable."); }
            capability = capabilities.getLocalProjection(step.capabilityId);
            if (!capability || !capability.parameters || !capability.parameters.properties) { fail(protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Capability presentation contract is unavailable."); }
            try { params = capabilities.validateCapabilityParams(capability, step.params); } catch (error) { fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Capability parameters are invalid."); }
            if (Object.keys(params).length !== 1 || typeof params.opacity !== "number") { fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Capability parameters are not review-projectable."); }
            opacitySchema = capability.parameters.properties.opacity;
            if (!opacitySchema || opacitySchema.unit !== "percent") { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Capability unit metadata is invalid."); }
            if (step.kind !== "tool" || step.risk !== "write" || step.requiresConfirmation !== true || !step.targetScope ||
                    step.targetScope.type !== "selected-layer" || step.targetScope.property !== "opacity") { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Mutation semantics are not review-projectable."); }
            if (!step.policyDecision) { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Local review authority is required."); }
            try { planning.assertPolicyDecisionClosed(step.policyDecision); planning.assertTrustedDecisionSource(step.policyDecision); }
            catch (errorPolicy) { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Local review authority is invalid."); }
            if (step.policyDecision.decision !== "REVIEW_REQUIRED") { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Mutation review is required."); }
            return {
                index: index,
                capabilityId: "set-opacity-v1",
                capabilityLabelKey: LABEL_KEYS.capabilities["set-opacity-v1"],
                target: { scopeType: "selected-layer", labelKey: LABEL_KEYS.targets["selected-layer"] },
                parameters: [{ key: "opacity", labelKey: LABEL_KEYS.parameters.opacity, value: params.opacity, unit: opacitySchema.unit }],
                risk: { level: "write", labelKey: LABEL_KEYS.risks.write },
                requiresConfirmation: true,
                before: before
            };
        }
        function project(authorizedPlan, materializedPlan) {
            var plan = canonicalAuthorizedPlan(authorizedPlan);
            var before = observedBefore(materializedPlan);
            var projection;
            if (plan.steps.length < 1 || plan.steps.length > protocol.HARD_LIMITS.maxPlanSteps) { fail(protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "AuthorizedPlan step count is outside the review budget."); }
            assertMaterializedPair(plan, materializedPlan);
            projection = {
                projectionType: "plan-review",
                revision: plan.revision,
                stepCount: plan.steps.length,
                requiresConfirmation: true,
                confirmationScope: "entire-plan",
                steps: plan.steps.map(function (step, index) { return projectStep(step, index, index === 0 ? before : { source: "execution-time" }); })
            };
            return protocol.deepFreeze(projection);
        }

        return Object.freeze({ project: project, LABEL_KEYS: LABEL_KEYS });
    }

    return { createPlanReviewProjection: createPlanReviewProjection, LABEL_KEYS: LABEL_KEYS };
}));
