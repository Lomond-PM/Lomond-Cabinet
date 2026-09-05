(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaLogicalPlanContracts";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function register(target, name, create) {
        var bootstrap;
        if (Object.prototype.hasOwnProperty.call(target, name) || !Object.isExtensible(target)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.registerModule !== "function" || bootstrap.hasModule(name)) { throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        var value = Object.freeze(create());
        bootstrap.registerModule(name, value);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, writable: false, value: value });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        register(root, MODULE_NAME, function () { return factory(root.VelaCapabilityContracts); });
    } else if (typeof module === "object" && module.exports) { module.exports = Object.freeze(factory(require("./velaCapabilityContracts"))); }
}(typeof self !== "undefined" ? self : this, function (capabilities) {
    "use strict";
    var ERROR_CODES = Object.freeze({ LOGICAL_PLAN_INVALID: "LOGICAL_PLAN_INVALID", LOGICAL_PLAN_FORBIDDEN_FIELD: "LOGICAL_PLAN_FORBIDDEN_FIELD" });
    var MAX_LOGICAL_STEPS = 2;
    var validatedPlans = new WeakSet();
    var DESCRIPTORS = Object.freeze({
        "set-opacity-v1": Object.freeze({ operation: "mutate", targetScopeKind: "selected-layer" }),
        "set-layer-name-v1": Object.freeze({ operation: "mutate", targetScopeKind: "selected-layer" })
    });
    function fail(code, message) { var error = new Error(code + ": " + message); error.code = code; throw error; }
    function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined; }
    function plain(value) { return value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null); }
    function canonical(value) { if (Array.isArray(value)) { return "[" + value.map(canonical).join(",") + "]"; } if (value && typeof value === "object") { return "{" + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ":" + canonical(value[key]); }).join(",") + "}"; } return JSON.stringify(value); }
    function signature(value) { return canonical(value); }
    function canonicalStep(raw, index) {
        var id = own(raw, "capabilityId"), params, descriptor, keys;
        if (!plain(raw)) { fail(ERROR_CODES.LOGICAL_PLAN_INVALID, "step must be an object"); }
        keys = Object.keys(raw).sort(); if (keys.join(",") !== "capabilityId,params") { fail(ERROR_CODES.LOGICAL_PLAN_FORBIDDEN_FIELD, "step contains untrusted metadata"); }
        descriptor = DESCRIPTORS[id]; if (!descriptor || (index === 0 && id !== "set-opacity-v1") || (index === 1 && id !== "set-layer-name-v1")) { fail(ERROR_CODES.LOGICAL_PLAN_INVALID, "step composition is invalid"); }
        try { params = capabilities.validateRepresentationCapabilityParams(id, own(raw, "params")); } catch (error) { fail(ERROR_CODES.LOGICAL_PLAN_INVALID, "capability parameters are invalid"); }
        return Object.freeze({ ordinal: index, capabilityId: id, params: params, operation: descriptor.operation, targetScopeKind: descriptor.targetScopeKind, semanticSignature: signature({ capabilityId: id, params: params, targetScopeKind: descriptor.targetScopeKind }) });
    }
    function validateLogicalPlanProposal(raw) {
        var steps, signatures;
        if (!plain(raw) || Object.keys(raw).sort().join(",") !== "steps,type" || raw.type !== "logicalPlanProposal" || !Array.isArray(raw.steps) || raw.steps.length !== MAX_LOGICAL_STEPS) { fail(ERROR_CODES.LOGICAL_PLAN_INVALID, "logicalPlanProposal must contain exactly two ordered steps"); }
        steps = raw.steps.map(canonicalStep); signatures = steps.map(function (step) { return step.semanticSignature; });
        var plan = Object.freeze({ declaredStepCount: MAX_LOGICAL_STEPS, steps: Object.freeze(steps), planSemanticSignature: signature({ declaredStepCount: MAX_LOGICAL_STEPS, stepSemanticSignatures: signatures }) });
        validatedPlans.add(plan);
        return plan;
    }
    function validateCompletionSummary(input) {
        if (!plain(input) || !Number.isInteger(input.completedStepCount) || input.completedStepCount < 0 || input.completedStepCount > MAX_LOGICAL_STEPS || (input.completedStepCount > 0 && input.completedStepCount < MAX_LOGICAL_STEPS && input.objectiveTerminalSuccess === true)) { fail(ERROR_CODES.LOGICAL_PLAN_INVALID, "completion summary is invalid"); }
        return Object.freeze({ declaredStepCount: MAX_LOGICAL_STEPS, completedStepCount: input.completedStepCount, partialCompletion: input.completedStepCount > 0 && input.completedStepCount < MAX_LOGICAL_STEPS && input.objectiveTerminalSuccess !== true, failedStepOrdinal: input.failedStepOrdinal === undefined ? null : input.failedStepOrdinal, code: input.code || null });
    }
    return { MODULE_REVISION: "vela-logical-plan-contracts-v1", ERROR_CODES: ERROR_CODES, MAX_LOGICAL_STEPS: MAX_LOGICAL_STEPS, validateLogicalPlanProposal: validateLogicalPlanProposal, isValidatedLogicalPlan: function (value) { return Boolean(value && validatedPlans.has(value)); }, validateCompletionSummary: validateCompletionSummary };
}));
