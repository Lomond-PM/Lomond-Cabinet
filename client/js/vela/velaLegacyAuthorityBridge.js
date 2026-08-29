(function (root, factory) {
    "use strict";

    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var hasModule = !browserPage && typeof module === "object" && module.exports;
    var planning = browserPage
        ? root.VelaPlanningContracts
        : hasModule ? require("./velaPlanningContracts") : null;
    var exported = Object.freeze(factory(planning));

    if (browserPage && !Object.prototype.hasOwnProperty.call(root, "VelaLegacyAuthorityBridge")) {
        Object.defineProperty(root, "VelaLegacyAuthorityBridge", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (hasModule) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function (planning) {
    "use strict";

    var MODULE_REVISION = "vela-legacy-authority-bridge-v1";
    var BRIDGE_ERROR = "LEGACY_AUTHORITY_BRIDGE_INVALID";

    function fail(message) {
        var error = new Error(message || BRIDGE_ERROR);
        error.code = BRIDGE_ERROR;
        throw error;
    }

    function isObject(value) {
        return Boolean(value && Object.prototype.toString.call(value) === "[object Object]");
    }

    function createActionCandidateFromLocalProposal(input) {
        var descriptor;
        var operation;
        var capabilityId;
        var candidate;
        if (!planning || typeof planning.createActionCandidate !== "function" || typeof planning.assertActionCandidateNonAuthoritative !== "function") { fail("Planning contracts are unavailable."); }
        if (!isObject(input) || !isObject(input.validatedParams) || !isObject(input.capabilityDescriptor)) { fail("A locally validated legacy proposal is required."); }
        ["approved", "allow", "authority", "nonce", "confirmationNonce", "executionArmed", "hostPayload", "binding", "layerId", "nativeLayerId", "layerIndex", "compositionId", "itemId", "propertyValueDigest"].forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(input, key)) { fail("Legacy proposal carries a forbidden authority or binding field: " + key); }
        });
        descriptor = input.capabilityDescriptor;
        capabilityId = input.capabilityId || descriptor.capabilityId;
        operation = input.requestedOperation || descriptor.operationKind || descriptor.kind;
        if (typeof capabilityId !== "string" || capabilityId.length === 0 || typeof operation !== "string") { fail("Legacy proposal identity is incomplete."); }
        candidate = planning.createActionCandidate({
            candidateId: input.candidateId,
            capabilityId: capabilityId,
            operationKind: operation,
            kind: descriptor.invocationKind === undefined ? "tool" : descriptor.invocationKind,
            risk: descriptor.risk || (operation === "mutate" || operation === "create" ? "write" : operation),
            params: input.validatedParams,
            targetScope: descriptor.targetScope || { type: "selected-layer" },
            requiresConfirmation: descriptor.requiresConfirmation === undefined ? (operation === "mutate" || operation === "create") : descriptor.requiresConfirmation,
            provenance: {
                source: "authority-bridge",
                capabilityId: capabilityId,
                requestedOperation: input.requestedOperation || operation,
                moduleRevision: MODULE_REVISION
            }
        });
        planning.assertActionCandidateNonAuthoritative(candidate);
        return candidate;
    }

    function decide(actionCandidate, policyContext, policyOverride) {
        var policyInput;
        var decision;
        if (!planning || typeof planning.isActionCandidate !== "function" || typeof planning.assertActionCandidateNonAuthoritative !== "function" || typeof planning.legacyAuthorityPolicy !== "function") { fail("Planning contracts are unavailable."); }
        planning.assertActionCandidateNonAuthoritative(actionCandidate);
        if (!isObject(policyContext)) { fail("A policy context is required."); }
        policyInput = {
            capabilityId: actionCandidate.capabilityId,
            requestedOperation: actionCandidate.operationKind,
            risk: actionCandidate.risk,
            targetScope: actionCandidate.targetScope,
            capabilityKnown: policyContext.capabilityKnown,
            paramsValid: policyContext.paramsValid,
            operationSupported: policyContext.operationSupported,
            declaredLocalScope: policyContext.declaredLocalScope
        };
        decision = (typeof policyOverride === "function" ? policyOverride : planning.legacyAuthorityPolicy)(policyInput);
        if (!decision || typeof decision.decision !== "string") { fail("Legacy policy did not return a PolicyDecision."); }
        if (actionCandidate.operationKind === "mutate" || actionCandidate.operationKind === "create") {
            if (decision.decision === "ALLOW") {
                decision = planning.createPolicyDecision({ decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "legacy-policy", provenance: { rule: "bridge-mutation-floor", capabilityId: actionCandidate.capabilityId, requestedOperation: actionCandidate.operationKind } });
            }
        }
        return decision;
    }

    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, createActionCandidateFromLocalProposal: createActionCandidateFromLocalProposal, decide: decide });
}));
