(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory());
        if (Object.prototype.hasOwnProperty.call(root, "VelaAuthorizedPlanMaterializer") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaAuthorizedPlanMaterializer", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function createAuthorizedPlanMaterializer(options) {
        var protocol = options && options.protocol;
        var planning = options && options.planningContracts;
        var capabilities = options && options.capabilityContracts;
        var preflight = options && options.preflight;
        if (!protocol || !protocol.isPlainObject(options) || !planning || !capabilities || !preflight ||
                typeof planning.createAuthorizedPlan !== "function" || typeof planning.isAuthorizedPlan !== "function" ||
                typeof planning.assertAuthorizedPlanNoTrustedBinding !== "function" || typeof planning.assertPolicyDecisionClosed !== "function" ||
                typeof planning.assertTrustedDecisionSource !== "function" || typeof capabilities.getLocalProjection !== "function" ||
                typeof capabilities.resolveRegisteredAction !== "function" || typeof capabilities.validateCapabilityParams !== "function" ||
                typeof preflight.createBoundPlan !== "function") {
            throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE");
        }

        function fail(code, message) { protocol.fail(code, message, { stage: "authorized-plan-materialize" }); }

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
            } catch (error) {
                fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "AuthorizedPlan validation failed.");
            }
            var stringifyOptions = { allowDangerousPaths: ["steps.*.candidateId"] };
            if (protocol.canonicalStringify(rebuilt, stringifyOptions) !== protocol.canonicalStringify(value, stringifyOptions)) { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "AuthorizedPlan is not canonical."); }
            return rebuilt;
        }

        function materialize(authorizedPlan, executionInput) {
            return Promise.resolve().then(function () {
            if (!protocol.isPlainObject(executionInput)) { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Materialization execution input is invalid."); }
            protocol.assertNoUnknownKeys(executionInput, ["selectionOrderMeaningful"], "authorizedPlanMaterializer.executionInput");
            if (typeof protocol.getOwnDataProperty(executionInput, "selectionOrderMeaningful") !== "boolean") { fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Selection-order semantics are required."); }
            var canonical = canonicalAuthorizedPlan(authorizedPlan);
            if (canonical.steps.length < 1 || canonical.steps.length > protocol.HARD_LIMITS.maxPlanSteps) { fail(protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "AuthorizedPlan step count is outside the execution budget."); }
            var authorityCandidateIds = [];
            var steps = canonical.steps.map(function (step) {
                var projection = capabilities.getLocalProjection(step.capabilityId);
                var registeredAction = capabilities.resolveRegisteredAction(step.capabilityId);
                var params;
                if (!projection || !registeredAction || registeredAction.actionId !== step.capabilityId) { fail(protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Authorized capability is not registered for mutation execution."); }
                try { params = capabilities.validateCapabilityParams(projection, step.params); }
                catch (error) { fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Authorized capability parameters are invalid."); }
                if (step.kind !== "tool" || step.risk !== "write" || step.requiresConfirmation !== true ||
                        !step.targetScope || step.targetScope.type !== "selected-layer" || step.targetScope.property !== "opacity") {
                    fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Authorized mutation semantics do not match the local registry subset.");
                }
                if (!step.policyDecision) { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "A local review policy decision is required."); }
                try {
                    planning.assertPolicyDecisionClosed(step.policyDecision);
                    planning.assertTrustedDecisionSource(step.policyDecision);
                    if (step.authorityEvidence && typeof planning.assertAuthorityEvidenceNotDerived === "function") { planning.assertAuthorityEvidenceNotDerived(step.authorityEvidence); }
                } catch (error) { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Authorized mutation policy evidence is invalid."); }
                if (step.policyDecision.decision !== "REVIEW_REQUIRED") { fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Mutation execution requires local review authority."); }
                authorityCandidateIds.push(step.candidateId);
                return { capabilityId: step.capabilityId, params: params, targetScope: { type: "selected-layer", property: "opacity" } };
            });
            return Promise.resolve(preflight.createBoundPlan({ steps: steps, selectionOrderMeaningful: executionInput.selectionOrderMeaningful })).then(function (executionPlan) {
                if (!executionPlan || executionPlan.actionCount !== steps.length || executionPlan.planId === canonical.planId) { fail(protocol.ERROR_CODES.PLAN_INVALID, "Execution plan materialization failed."); }
                var envelope = {
                    authorizedPlanId: canonical.planId,
                    authorizedPlanRevision: canonical.revision,
                    authorityCandidateIds: authorityCandidateIds,
                    executionPlanId: executionPlan.planId,
                    executionPlanRevision: executionPlan.planRevision,
                    actionCount: executionPlan.actionCount,
                    review: executionPlan.review
                };
                return protocol.deepFreeze(protocol.cloneJson(envelope, { maxBytes: protocol.HARD_LIMITS.maxResponseJsonBytes, allowDangerousPaths: ["authorityCandidateIds.*"] }));
            });
            });
        }

        return Object.freeze({ materialize: materialize });
    }

    return { createAuthorizedPlanMaterializer: createAuthorizedPlanMaterializer };
}));
