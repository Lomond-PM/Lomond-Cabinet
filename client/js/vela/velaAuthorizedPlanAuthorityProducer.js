(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaPlanningContracts, root.VelaCapabilityCompiler, root.VelaDelegationGrantStore, root.VelaDelegationPolicyEngine, root.VelaAuthorityEvidenceResolver));
        if (Object.prototype.hasOwnProperty.call(root, "VelaAuthorizedPlanAuthorityProducer") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaAuthorizedPlanAuthorityProducer", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaPlanningContracts"), require("./velaCapabilityCompiler"), require("./velaDelegationGrantStore"), require("./velaDelegationPolicyEngine"), require("./velaAuthorityEvidenceResolver")));
    }
}(typeof self !== "undefined" ? self : this, function (planning, compilerModule, grantStoreModule, policyEngineModule, evidenceResolverModule) {
    "use strict";

    var MODULE_REVISION = "vela-authorized-plan-authority-producer-v1";
    var ERROR_CODES = Object.freeze({
        AUTHORIZED_PLAN_PRODUCER_INVALID_OPTIONS: "AUTHORIZED_PLAN_PRODUCER_INVALID_OPTIONS",
        AUTHORIZED_PLAN_PRODUCER_INVALID_INPUT: "AUTHORIZED_PLAN_PRODUCER_INVALID_INPUT",
        AUTHORIZED_PLAN_CANDIDATE_UNTRUSTED: "AUTHORIZED_PLAN_CANDIDATE_UNTRUSTED",
        AUTHORIZED_PLAN_POLICY_DENIED: "AUTHORIZED_PLAN_POLICY_DENIED",
        AUTHORIZED_PLAN_REVIEW_REQUIRED: "AUTHORIZED_PLAN_REVIEW_REQUIRED",
        AUTHORIZED_PLAN_GRANT_UNAVAILABLE: "AUTHORIZED_PLAN_GRANT_UNAVAILABLE",
        AUTHORIZED_PLAN_EVIDENCE_INVALID: "AUTHORIZED_PLAN_EVIDENCE_INVALID",
        AUTHORIZED_PLAN_CORRELATION_FAILED: "AUTHORIZED_PLAN_CORRELATION_FAILED",
        AUTHORIZED_PLAN_ID_INVALID: "AUTHORIZED_PLAN_ID_INVALID"
    });
    var trustedProducers = new WeakMap();
    var trustedProducedPlans = new WeakMap();

    function fail(code, message) { var error = new Error(message || code); error.code = code; throw error; }
    function isPlainObject(value) { return Boolean(value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }
    function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

    function createAuthorizedPlanAuthorityProducer(options) {
        if (!isPlainObject(options) || Object.keys(options).some(function (key) { return ["policyEngine", "grantStore", "evidenceResolver", "makePlanId"].indexOf(key) === -1; })) { fail(ERROR_CODES.AUTHORIZED_PLAN_PRODUCER_INVALID_OPTIONS); }
        var policyEngine = options.policyEngine;
        var grantStore = options.grantStore;
        var evidenceResolver = options.evidenceResolver;
        var makePlanId = options.makePlanId;
        if (!grantStoreModule.isTrustedDelegationGrantStore(grantStore) || !evidenceResolverModule.isTrustedAuthorityEvidenceResolver(evidenceResolver) || !policyEngineModule.isTrustedDelegationPolicyEngineFor(policyEngine, grantStore, evidenceResolver.getSessionId()) || typeof makePlanId !== "function") {
            fail(ERROR_CODES.AUTHORIZED_PLAN_PRODUCER_INVALID_OPTIONS);
        }

        function produce(input) {
            var candidate;
            var context;
            var evidence;
            var decision;
            var grantId;
            var grantView;
            var grant;
            var grantedEvent;
            var permissionEvidence;
            var permissionEvent;
            var planId;
            var plan;
            if (!isPlainObject(input) || Object.keys(input).some(function (key) { return ["candidate", "context", "delegationGrantedEvidence"].indexOf(key) === -1; })) { fail(ERROR_CODES.AUTHORIZED_PLAN_PRODUCER_INVALID_INPUT); }
            candidate = input.candidate;
            context = input.context;
            evidence = input.delegationGrantedEvidence;
            if (!compilerModule.isTrustedActionCandidate(candidate)) { fail(ERROR_CODES.AUTHORIZED_PLAN_CANDIDATE_UNTRUSTED); }
            if (!isPlainObject(context) || typeof context.sessionId !== "string" || context.sessionId !== evidenceResolver.getSessionId() || (context.taskId !== undefined && typeof context.taskId !== "string")) { fail(ERROR_CODES.AUTHORIZED_PLAN_CORRELATION_FAILED); }

            decision = policyEngine.evaluate(candidate, context);
            if (!planning.isPolicyDecision(decision)) { fail(ERROR_CODES.AUTHORIZED_PLAN_POLICY_DENIED); }
            try { planning.assertPolicyDecisionClosed(decision); planning.assertTrustedDecisionSource(decision); }
            catch (errorDecision) { fail(ERROR_CODES.AUTHORIZED_PLAN_POLICY_DENIED); }
            if (decision.decision === "DENY") { fail(ERROR_CODES.AUTHORIZED_PLAN_POLICY_DENIED); }
            if (decision.decision !== "ALLOW") { fail(ERROR_CODES.AUTHORIZED_PLAN_REVIEW_REQUIRED); }
            if (!decision.provenance || decision.provenance.candidateId !== candidate.candidateId || decision.provenance.capabilityId !== candidate.capabilityId || decision.provenance.requestedOperation !== candidate.operationKind || typeof decision.provenance.grantId !== "string") { fail(ERROR_CODES.AUTHORIZED_PLAN_CORRELATION_FAILED); }
            grantId = decision.provenance.grantId;

            try { grantView = grantStore.lookup(grantId); }
            catch (errorGrant) { fail(ERROR_CODES.AUTHORIZED_PLAN_GRANT_UNAVAILABLE); }
            grant = grantView.grant;
            if (grantView.status !== "active" || grantView.remainingActions === 0 || grant.capabilityId !== candidate.capabilityId || grant.operationKind !== candidate.operationKind || grant.taskId !== (context.taskId === undefined ? null : context.taskId)) { fail(ERROR_CODES.AUTHORIZED_PLAN_CORRELATION_FAILED); }

            try {
                evidenceResolver.verifyEvidenceReference(evidence, { eventKind: "delegation/granted", grantId: grantId, taskId: grant.taskId, requestId: grant.provenance.requestId });
                grantedEvent = evidenceResolver.getVerifiedEvent(evidence);
            } catch (errorEvidence) { fail(ERROR_CODES.AUTHORIZED_PLAN_EVIDENCE_INVALID); }
            if (grantedEvent.payload.capabilityId !== candidate.capabilityId || grantedEvent.payload.operationKind !== candidate.operationKind || grantedEvent.payload.scopeType !== grant.targetScope.type || grantedEvent.payload.issuedBy !== grant.provenance.source || typeof grantedEvent.payload.permissionSeq !== "number") { fail(ERROR_CODES.AUTHORIZED_PLAN_CORRELATION_FAILED); }
            try {
                permissionEvidence = evidenceResolver.resolveEvidence({ sessionId: context.sessionId, seq: grantedEvent.payload.permissionSeq, eventKind: "permission/decided", requestId: grantedEvent.requestId });
                permissionEvent = evidenceResolver.getVerifiedEvent(permissionEvidence);
            } catch (errorPermission) { fail(ERROR_CODES.AUTHORIZED_PLAN_EVIDENCE_INVALID); }
            if (permissionEvent.payload.decision !== "approved" || permissionEvent.payload.issuedBy !== grantedEvent.payload.issuedBy || permissionEvent.payload.taskId !== grant.taskId) { fail(ERROR_CODES.AUTHORIZED_PLAN_CORRELATION_FAILED); }

            try { planId = makePlanId("authorityPlan"); }
            catch (errorId) { fail(ERROR_CODES.AUTHORIZED_PLAN_ID_INVALID); }
            if (typeof planId !== "string" || !/^[A-Za-z0-9_.:-]+$/.test(planId) || planId.length === 0) { fail(ERROR_CODES.AUTHORIZED_PLAN_ID_INVALID); }
            try {
                plan = planning.createAuthorizedPlan({
                    planId: planId,
                    revision: 0,
                    steps: [{
                        candidateId: candidate.candidateId,
                        capabilityId: candidate.capabilityId,
                        kind: candidate.kind,
                        risk: candidate.risk,
                        params: candidate.params,
                        targetScope: candidate.targetScope,
                        requiresConfirmation: candidate.requiresConfirmation,
                        policyDecision: {
                            decision: decision.decision,
                            reasonCode: decision.reasonCode,
                            provenance: decision.provenance,
                            issuedBy: decision.issuedBy
                        },
                        grantProvenance: { grantId: grant.grantId, capabilityFamily: grant.capabilityFamily, source: grant.provenance.source, issuedAt: grant.provenance.issuedAt },
                        authorityEvidence: {
                            eventKind: evidence.eventKind,
                            seq: evidence.seq,
                            requestId: evidence.requestId,
                            evidenceType: evidence.evidenceType
                        }
                    }]
                });
                planning.assertAuthorizedPlanNoTrustedBinding(plan);
            } catch (errorPlan) { fail(ERROR_CODES.AUTHORIZED_PLAN_CORRELATION_FAILED); }
            trustedProducedPlans.set(plan, {
                producer: producer,
                grantStore: grantStore,
                storeEpoch: grantStoreModule.getTrustedDelegationGrantStoreEpoch(grantStore),
                sessionId: context.sessionId,
                taskId: context.taskId === undefined ? null : context.taskId,
                candidateId: candidate.candidateId,
                capabilityId: candidate.capabilityId,
                operationKind: candidate.operationKind,
                targetScope: candidate.targetScope,
                grantId: grant.grantId
            });
            return plan;
        }

        var producer = Object.freeze({ produce: produce });
        trustedProducers.set(producer, { grantStore: grantStore, sessionId: evidenceResolver.getSessionId() });
        return producer;
    }

    return Object.freeze({
        ERROR_CODES: ERROR_CODES,
        MODULE_REVISION: MODULE_REVISION,
        createAuthorizedPlanAuthorityProducer: createAuthorizedPlanAuthorityProducer,
        isTrustedAuthorityProducedPlan: function (plan) { return Boolean(plan && trustedProducedPlans.has(plan)); },
        isTrustedAuthorityProducerFor: function (producer, grantStore, sessionId) {
            var identity = producer && trustedProducers.get(producer);
            return Boolean(identity && identity.grantStore === grantStore && identity.sessionId === sessionId);
        },
        getTrustedAuthorityPlanIdentity: function (plan, producer, grantStore, sessionId) {
            var identity = plan && trustedProducedPlans.get(plan);
            if (!identity || identity.producer !== producer || identity.grantStore !== grantStore || identity.sessionId !== sessionId) { return null; }
            return planning.deepFreeze({
                sessionId: identity.sessionId,
                storeEpoch: identity.storeEpoch,
                taskId: identity.taskId,
                candidateId: identity.candidateId,
                capabilityId: identity.capabilityId,
                operationKind: identity.operationKind,
                targetScope: identity.targetScope,
                grantId: identity.grantId
            });
        }
    });
}));
