(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaPlanningContracts, root.VelaCapabilityCompiler, root.VelaDelegationGrantStore));
        if (Object.prototype.hasOwnProperty.call(root, "VelaDelegationPolicyEngine") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaDelegationPolicyEngine", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaPlanningContracts"), require("./velaCapabilityCompiler"), require("./velaDelegationGrantStore")));
    }
}(typeof self !== "undefined" ? self : this, function (planning, compilerModule, grantStoreModule) {
    "use strict";

    var MODULE_REVISION = "vela-delegation-policy-engine-v1";
    var trustedEngines = new WeakMap();
    var ERROR_CODES = Object.freeze({
        POLICY_ENGINE_INVALID_OPTIONS: "POLICY_ENGINE_INVALID_OPTIONS",
        POLICY_ENGINE_INVALID_CONTEXT: "POLICY_ENGINE_INVALID_CONTEXT",
        POLICY_ENGINE_STORE_UNAVAILABLE: "POLICY_ENGINE_STORE_UNAVAILABLE"
    });
    var RISK_RANK = Object.freeze({ read: 0, analyze: 1, mutate: 2, create: 3, write: 4 });
    var SCOPE_RANK = Object.freeze({ none: 0, "specific-layer": 1, "selected-layer": 2, "specific-layers": 3, "selected-layers": 4, "current-comp": 5, "current-project": 6 });

    function fail(code, message) { var error = new Error(message || code); error.code = code; throw error; }
    function isPlainObject(value) { return Boolean(value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }
    function hasOwn(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
    function operationFamily(operation) { return operation === "mutate" || operation === "create" ? "mutation" : operation; }
    function scopeCovers(grantScope, candidateScope) {
        var grantType = grantScope && grantScope.type;
        var candidateType = candidateScope && candidateScope.type;
        if (grantType === "current-project") { return true; }
        if (grantType === "current-comp") { return ["current-comp", "selected-layer", "selected-layers", "specific-layer", "specific-layers"].indexOf(candidateType) !== -1; }
        if (grantType === "selected-layers") { return candidateType === "selected-layers" || candidateType === "selected-layer"; }
        if (grantType === "specific-layers") { return candidateType === "specific-layers" || candidateType === "specific-layer"; }
        return grantType === candidateType && sameJson(grantScope, candidateScope);
    }
    function compareGrantViews(left, right) {
        var leftGrant = left.grant;
        var rightGrant = right.grant;
        var leftScopeRank = hasOwn(SCOPE_RANK, leftGrant.targetScope.type) ? SCOPE_RANK[leftGrant.targetScope.type] : 99;
        var rightScopeRank = hasOwn(SCOPE_RANK, rightGrant.targetScope.type) ? SCOPE_RANK[rightGrant.targetScope.type] : 99;
        var difference = leftScopeRank - rightScopeRank;
        if (difference !== 0) { return difference; }
        difference = RISK_RANK[leftGrant.riskCeiling] - RISK_RANK[rightGrant.riskCeiling];
        if (difference !== 0) { return difference; }
        var leftExpiry = leftGrant.expiresAt === null ? Infinity : leftGrant.expiresAt;
        var rightExpiry = rightGrant.expiresAt === null ? Infinity : rightGrant.expiresAt;
        if (leftExpiry !== rightExpiry) { return leftExpiry < rightExpiry ? -1 : 1; }
        return leftGrant.grantId < rightGrant.grantId ? -1 : leftGrant.grantId > rightGrant.grantId ? 1 : 0;
    }

    function createDelegationPolicyEngine(options) {
        if (!isPlainObject(options)) { fail(ERROR_CODES.POLICY_ENGINE_INVALID_OPTIONS, "DelegationPolicyEngine options are invalid."); }
        Object.keys(options).forEach(function (key) { if (["grantStore", "resolveCapability", "sessionId"].indexOf(key) === -1) { fail(ERROR_CODES.POLICY_ENGINE_INVALID_OPTIONS, "DelegationPolicyEngine options contain an unknown field."); } });
        var grantStore = options.grantStore;
        var resolveCapability = options.resolveCapability;
        var sessionId = options.sessionId;
        if (!grantStoreModule.isTrustedDelegationGrantStore(grantStore) || typeof grantStore.getAuthorityView !== "function" || typeof resolveCapability !== "function" || typeof sessionId !== "string" || sessionId.length === 0) {
            fail(ERROR_CODES.POLICY_ENGINE_INVALID_OPTIONS, "DelegationPolicyEngine requires trusted local dependencies.");
        }

        function decision(value, reason, candidate, grant) {
            return planning.createPolicyDecision({
                decision: value,
                reasonCode: reason,
                issuedBy: "local-authority",
                provenance: {
                    rule: reason,
                    capabilityId: candidate && candidate.capabilityId ? candidate.capabilityId : null,
                    requestedOperation: candidate && candidate.operationKind ? candidate.operationKind : null,
                    grantId: grant ? grant.grantId : null,
                    candidateId: candidate && candidate.candidateId ? candidate.candidateId : null,
                    authoritySource: MODULE_REVISION
                }
            });
        }
        function trustedContext(context) {
            if (!isPlainObject(context)) { return false; }
            if (Object.keys(context).some(function (key) { return ["sessionId", "taskId"].indexOf(key) === -1; })) { return false; }
            if (typeof context.sessionId !== "string" || context.sessionId.length === 0) { return false; }
            if (context.taskId !== undefined && (typeof context.taskId !== "string" || context.taskId.length === 0)) { return false; }
            return true;
        }
        function validateCandidate(candidate) {
            var view;
            if (!compilerModule.isTrustedActionCandidate(candidate)) { return { valid: false, reason: "untrusted-candidate" }; }
            try { planning.assertActionCandidateNonAuthoritative(candidate); }
            catch (error) { return { valid: false, reason: "malformed-candidate" }; }
            try { view = resolveCapability(candidate.capabilityId); }
            catch (errorResolve) { return { valid: false, reason: "capability-resolution-failed" }; }
            if (!view || !compilerModule.validateCapabilityView(view)) { return { valid: false, reason: "unknown-capability" }; }
            if (view.supportedOperations.indexOf(candidate.operationKind) === -1 || view.operationKind !== candidate.operationKind) { return { valid: false, reason: "unsupported-operation" }; }
            if (view.risk !== candidate.risk || !sameJson(view.targetScope, candidate.targetScope) || view.requiresConfirmation !== candidate.requiresConfirmation) { return { valid: false, reason: "candidate-metadata-mismatch" }; }
            if (!hasOwn(RISK_RANK, view.risk)) { return { valid: false, reason: "non-delegable-risk" }; }
            return { valid: true, view: view };
        }
        function grantMatches(item, candidate, view, context) {
            var grant = item.grant;
            if (!grant || item.status !== "active" || item.remainingActions === 0) { return false; }
            if (!grant.capabilityId || grant.capabilityId !== candidate.capabilityId) { return false; }
            if (grant.capabilityFamily !== operationFamily(candidate.operationKind) || grant.operationKind !== candidate.operationKind) { return false; }
            if (!hasOwn(RISK_RANK, grant.riskCeiling) || RISK_RANK[view.risk] > RISK_RANK[grant.riskCeiling]) { return false; }
            if (!grant.targetScope || !scopeCovers(grant.targetScope, candidate.targetScope)) { return false; }
            if (grant.taskId !== null && (context.taskId === undefined || grant.taskId !== context.taskId)) { return false; }
            return true;
        }
        function evaluate(candidate, context) {
            var validation;
            var authorityView;
            var matches;
            if (!trustedContext(context)) { return decision("DENY", "invalid-evaluation-context", candidate, null); }
            if (context.sessionId !== sessionId) { return decision("REVIEW_REQUIRED", "session-correlation-mismatch", candidate, null); }
            validation = validateCandidate(candidate);
            if (!validation.valid) { return decision("DENY", validation.reason, candidate, null); }
            try { authorityView = grantStore.getAuthorityView(); }
            catch (error) { return decision("DENY", "authority-store-unavailable", candidate, null); }
            matches = authorityView.grants.filter(function (item) { return grantMatches(item, candidate, validation.view, context); }).sort(compareGrantViews);
            if (matches.length === 0) { return decision("REVIEW_REQUIRED", "delegated-authority-insufficient", candidate, null); }
            return decision("ALLOW", "active-delegation-grant", candidate, matches[0].grant);
        }

        var engine = Object.freeze({ evaluate: evaluate });
        trustedEngines.set(engine, { grantStore: grantStore, sessionId: sessionId });
        return engine;
    }

    return {
        ERROR_CODES: ERROR_CODES,
        MODULE_REVISION: MODULE_REVISION,
        RISK_RANK: RISK_RANK,
        createDelegationPolicyEngine: createDelegationPolicyEngine,
        isTrustedDelegationPolicyEngine: function (engine) { return Boolean(engine && trustedEngines.has(engine)); },
        isTrustedDelegationPolicyEngineFor: function (engine, grantStore, sessionId) {
            var identity = engine && trustedEngines.get(engine);
            return Boolean(identity && identity.grantStore === grantStore && identity.sessionId === sessionId);
        }
    };
}));
