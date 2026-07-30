(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaProviderRequestBranchPolicy";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertContracts(value) { if (!value || typeof value.getModelProjection !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); } return value; }
    function registerBrowserModule(target, name, create) {
        var bootstrap;
        var contracts;
        var exported;
        if (!Object.prototype.hasOwnProperty.call(target, BOOTSTRAP_NAME) || Object.prototype.hasOwnProperty.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.registerModule !== "function" || typeof bootstrap.hasModule !== "function" || bootstrap.hasModule(name)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        contracts = assertContracts(bootstrap.getModule("VelaCapabilityContracts"));
        exported = Object.freeze(create(contracts));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertContracts(require("./velaCapabilityContracts"))));
    }
}(typeof self !== "undefined" ? self : this, function (capabilityContracts) {
    "use strict";

    var MODULE_REVISION = "vela-provider-request-branch-policy-v1";
    var CAPABILITY_ID = "set-opacity-v1";
    var CAPABILITY_REVISION = "vela-capability-contract-v1";
    var PROFILES = Object.freeze({ TEXT_ONLY: "text-only", EXPLICIT_EDIT_ELIGIBLE: "explicit-edit-eligible" });
    var canonicalProjection = capabilityContracts.getModelProjection(CAPABILITY_ID);

    if (!canonicalProjection || !Object.isFrozen(canonicalProjection)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }

    function fail(message) { throw new Error("REQUEST_BRANCH_POLICY_INVALID: " + message); }
    function sameNames(left, right) {
        var leftNames;
        var rightNames;
        var leftSymbols;
        var rightSymbols;
        try {
            leftNames = Object.getOwnPropertyNames(left).sort();
            rightNames = Object.getOwnPropertyNames(right).sort();
            leftSymbols = typeof Object.getOwnPropertySymbols === "function" ? Object.getOwnPropertySymbols(left) : [];
            rightSymbols = typeof Object.getOwnPropertySymbols === "function" ? Object.getOwnPropertySymbols(right) : [];
        } catch (error) { fail("property inspection failed."); }
        return leftSymbols.length === 0 && rightSymbols.length === 0 && leftNames.join("\u0000") === rightNames.join("\u0000");
    }
    function assertCanonicalValue(value, expected, path, active) {
        var names;
        var descriptor;
        var expectedDescriptor;
        var values = active || [];
        try {
            if (!expected || typeof expected !== "object") { if (value !== expected) { fail(path + " differs from the production Capability projection."); } return; }
            if (!value || typeof value !== "object" || !Object.isFrozen(value) || Object.getPrototypeOf(value) !== Object.getPrototypeOf(expected) || Array.isArray(value) !== Array.isArray(expected) || values.indexOf(value) !== -1 || !sameNames(value, expected)) { fail(path + " is not a frozen canonical value."); }
            values.push(value);
            names = Object.getOwnPropertyNames(expected);
            names.forEach(function (name) {
                descriptor = Object.getOwnPropertyDescriptor(value, name);
                expectedDescriptor = Object.getOwnPropertyDescriptor(expected, name);
                if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.enumerable !== expectedDescriptor.enumerable || descriptor.configurable !== false || descriptor.writable !== false) { fail(path + "." + name + " is not a frozen own data property."); }
                assertCanonicalValue(descriptor.value, expectedDescriptor.value, path + "." + name, values);
            });
            values.pop();
        } catch (error) {
            if (error && /^REQUEST_BRANCH_POLICY_INVALID:/.test(error.message)) { throw error; }
            fail(path + " inspection failed.");
        }
    }
    function assertProjection(value) {
        assertCanonicalValue(value, canonicalProjection, "capability projection", []);
        if (canonicalProjection.capabilityId !== CAPABILITY_ID || canonicalProjection.revision !== CAPABILITY_REVISION) { fail("production Capability projection is unavailable."); }
        return canonicalProjection;
    }
    function assertMessage(value) {
        if (typeof value !== "string" || !value.trim() || value.length > 65536) { fail("currentUserMessage is invalid."); }
        return value;
    }
    function parseTarget(raw) {
        var normalized;
        var value;
        if (typeof raw !== "string" || /^(?:0\d|\.\d)/.test(raw) || /[eExX]/.test(raw)) { return null; }
        normalized = raw.replace(/%$/, "");
        value = Number(normalized);
        if (typeof value !== "number" || !isFinite(value) || value < 0 || value > 100) { return null; }
        return value;
    }
    function explicitTarget(message) {
        var match;
        var target;
        var chinese = /^(?:\s*(?:\u8bf7|\u9ebb\u70e6)?\s*)?(?:(?:\u5c06|\u628a)\s*)?(?:(?:\u5f53\u524d|\u9009\u4e2d|\u6240\u9009)\s*)?(?:\u56fe\u5c42|\u5c42)?\s*(?:\u7684)?\s*(?:\u4e0d\u900f\u660e\u5ea6|opacity)\s*(?:\u8bbe\u4e3a|\u8bbe\u7f6e\u4e3a|\u8bbe\u7f6e\u6210|\u6539\u4e3a|\u8c03\u6574\u4e3a|\u8c03\u5230|\u6539\u6210)\s*((?:0|[1-9]\d*)(?:\.\d+)?%?)\s*[\u3002.!\uff01]?\s*$/i;
        var english = /^\s*(?:please\s+)?(?:set|change|adjust)\s+(?:(?:the\s+)?(?:(?:current(?:ly)?|selected)\s+)?layer\s+)?opacity\s+(?:to|at)\s*((?:0|[1-9]\d*)(?:\.\d+)?%?)\s*[.!\uff01]?\s*$/i;
        match = chinese.exec(message) || english.exec(message);
        if (!match) { return null; }
        target = parseTarget(match[1]);
        return target === null ? null : target;
    }
    function createRequestBranchPolicy(capabilityProjection) {
        assertProjection(capabilityProjection);
        return Object.freeze({
            classify: function (currentUserMessage) {
                assertMessage(currentUserMessage);
                return explicitTarget(currentUserMessage) === null ? PROFILES.TEXT_ONLY : PROFILES.EXPLICIT_EDIT_ELIGIBLE;
            }
        });
    }

    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, PROFILES: PROFILES, createRequestBranchPolicy: createRequestBranchPolicy });
}));
