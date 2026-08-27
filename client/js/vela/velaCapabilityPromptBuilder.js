(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaCapabilityPromptBuilder";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertContracts(value) { if (!value || typeof value.getModelProjection !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); } return value; }
    function assertPolicy(value) { if (!value || typeof value !== "object" || !Object.isFrozen(value)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); } return value; }
    function registerBrowserModule(target, name, create) {
        var bootstrap;
        var contracts;
        var policy;
        var exported;
        if (!Object.prototype.hasOwnProperty.call(target, BOOTSTRAP_NAME) || Object.prototype.hasOwnProperty.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.registerModule !== "function" || typeof bootstrap.hasModule !== "function" || bootstrap.hasModule(name)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        contracts = assertContracts(bootstrap.getModule("VelaCapabilityContracts"));
        policy = assertPolicy(bootstrap.getModule("VelaProviderRequestBranchPolicy"));
        exported = Object.freeze(create(contracts, policy));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertContracts(require("./velaCapabilityContracts")), assertPolicy(require("./velaProviderRequestBranchPolicy"))));
    }
}(typeof self !== "undefined" ? self : this, function (capabilityContracts, requestBranchPolicy) {
    "use strict";
    var MODULE_REVISION = "vela-capability-prompt-builder-v4";
    var CAPABILITY_ID = "set-opacity-v1";
    var RESPONSE_PROTOCOL = "vela.model-response.v1";
    var RESPONSE_SCHEMA_VERSION = "1.1";
    var PROVIDER_ID = "lmstudio";
    var canonicalProjection = capabilityContracts.getModelProjection(CAPABILITY_ID);
    if (!canonicalProjection || !Object.isFrozen(canonicalProjection)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
    function fail(message) { throw new Error("CAPABILITY_PROMPT_BUILDER_INVALID: " + message); }
    function ownData(value, key) { var descriptor; try { descriptor = Object.getOwnPropertyDescriptor(value, key); } catch (error) { fail("descriptor inspection failed."); } if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) { fail("an own data property is required."); } return descriptor.value; }
    function sameNames(left, right) { var leftNames; var rightNames; var leftSymbols; var rightSymbols; try { leftNames = Object.getOwnPropertyNames(left).sort(); rightNames = Object.getOwnPropertyNames(right).sort(); leftSymbols = typeof Object.getOwnPropertySymbols === "function" ? Object.getOwnPropertySymbols(left) : []; rightSymbols = typeof Object.getOwnPropertySymbols === "function" ? Object.getOwnPropertySymbols(right) : []; } catch (error) { fail("property inspection failed."); } return leftSymbols.length === 0 && rightSymbols.length === 0 && leftNames.join("\u0000") === rightNames.join("\u0000"); }
    function assertCanonicalValue(value, expected, path, active) {
        var names;
        var descriptor;
        var expectedDescriptor;
        var values = active || [];
        try {
            if (!expected || typeof expected !== "object") { if (value !== expected) { fail(path + " differs from the production Contract."); } return; }
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
            if (error && /^CAPABILITY_PROMPT_BUILDER_INVALID:/.test(error.message)) { throw error; }
            fail(path + " inspection failed.");
        }
    }
    function assertProjection(value) { assertCanonicalValue(value, canonicalProjection, "model projection", []); return canonicalProjection; }
    function assertRequestId(value) { if (typeof value !== "string" || !/^req_[a-z0-9]{32,96}$/.test(value)) { fail("requestId is invalid."); } return value; }
    function assertModel(value) {
        var segments;
        var index;
        if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/.test(value)) { fail("model is invalid."); }
        try { if (unescape(encodeURIComponent(value)).length > 256) { fail("model is invalid."); } } catch (error) { fail("model is invalid."); }
        if (value.charAt(0) === "/" || value.charAt(value.length - 1) === "/" || value.indexOf("//") !== -1) { fail("model is invalid."); }
        segments = value.split("/");
        for (index = 0; index < segments.length; index += 1) { if (segments[index] === "." || segments[index] === ".." || !/[A-Za-z0-9]/.test(segments[index])) { fail("model is invalid."); } }
        return value;
    }
    function assertProfileExport() {
        var profiles = ownData(requestBranchPolicy, "PROFILES");
        var textOnly;
        var explicitEdit;
        if (!Object.isFrozen(profiles) || Object.getPrototypeOf(profiles) !== Object.prototype ||
            Object.getOwnPropertyNames(profiles).sort().join("\u0000") !== "EXPLICIT_EDIT_ELIGIBLE\u0000PROPOSAL_CAPABLE_UNION\u0000TEXT_ONLY" ||
            (typeof Object.getOwnPropertySymbols === "function" && Object.getOwnPropertySymbols(profiles).length !== 0)) { fail("request profile export is invalid."); }
        textOnly = Object.getOwnPropertyDescriptor(profiles, "TEXT_ONLY");
        explicitEdit = Object.getOwnPropertyDescriptor(profiles, "EXPLICIT_EDIT_ELIGIBLE");
        if (!textOnly || !explicitEdit || textOnly.get || textOnly.set || explicitEdit.get || explicitEdit.set ||
            textOnly.writable !== false || textOnly.configurable !== false || explicitEdit.writable !== false || explicitEdit.configurable !== false ||
            textOnly.value !== "text-only" || explicitEdit.value !== "explicit-edit-eligible") { fail("request profile export is invalid."); }
        return profiles;
    }
    var PROFILES = assertProfileExport();
    function assertRequestProfile(value) {
        if (value !== PROFILES.TEXT_ONLY && value !== PROFILES.EXPLICIT_EDIT_ELIGIBLE && value !== PROFILES.PROPOSAL_CAPABLE_UNION) { fail("requestProfile is invalid."); }
        return value;
    }
    var GLOBAL_STATIC_CONTRACT = [
        "Return exactly one complete JSON object and nothing else.",
        "Use protocol " + RESPONSE_PROTOCOL + " and schemaVersion " + RESPONSE_SCHEMA_VERSION + ".",
        "Every response must use the closed Vela response envelope selected for this request; never add unknown fields.",
        "Trusted context is a fact only; never guess a missing current value.",
        "A localProposal is only a bounded candidate and does not modify After Effects.",
        "Trusted local intent validation, target binding, review, confirmation, preflight, and execution happen later.",
        "The only supported proposal capability is " + canonicalProjection.capabilityId + "; the model may supply only params.opacity from 0 through 100.",
        "Never include target identity, layer or comp ids, confirmation, nonce, Host payload, arbitrary code, or extra fields."
    ].join(" ");
    function rootEnvelope(requestId, model, envelope) {
        return JSON.stringify({ protocol: RESPONSE_PROTOCOL, schemaVersion: RESPONSE_SCHEMA_VERSION, requestId: requestId, provider: PROVIDER_ID, model: model, envelope: envelope });
    }
    function buildSystemPrompt(modelProjection, requestProfile) {
        var projection;
        projection = assertProjection(modelProjection);
        requestProfile = assertRequestProfile(requestProfile);
        if (requestProfile === PROFILES.TEXT_ONLY) { return [
            GLOBAL_STATIC_CONTRACT,
            "This request is text-only. Return only a text envelope; a localProposal is invalid for this request.",
            "Answer normal conversation, current-value queries, advice, explanations, ambiguity, and unavailable grounding as text. Trusted context is a fact only; never guess a missing current value.",
            "Do not claim an edit was performed, will be performed, or that a proposal was created. Do not describe a proposal."
        ].join(" "); }
        if (requestProfile === PROFILES.PROPOSAL_CAPABLE_UNION) { return [
            GLOBAL_STATIC_CONTRACT,
            "This request is proposal-capable-union. Return either a conversational text envelope or one bounded localProposal envelope for set-opacity-v1.",
            "Return text for questions, discussion, advice, ambiguity, or any message without a clear direct request to set the current actionable layer opacity.",
            "For a clear direct opacity edit, use only capabilityId " + projection.capabilityId + " and only params.opacity from 0 through 100. Never include target identity, layer or comp ids, confirmation, nonce, Host payload, arbitrary code, or extra fields.",
            "A localProposal does not modify After Effects. Trusted local intent validation, target binding, review, confirmation, preflight, and execution happen later."
        ].join(" "); }
        return [
            GLOBAL_STATIC_CONTRACT,
            "This request is explicit-edit-eligible. Return only a localProposal envelope; text is invalid for this request.",
            "Extract the single opacity target from the current user message. Use capabilityId " + projection.capabilityId + " and only params.opacity. The target must come from the current user message, never trusted context, history, or a fallback.",
            "Your role is to propose this supported edit. Trusted local review and approval happen later; do not add text, explanations, or extra fields."
        ].join(" ");
    }
    function buildTurnContract(modelProjection, requestId, model, requestProfile) {
        var projection;
        var exampleParams;
        var proposal57Example;
        projection = assertProjection(modelProjection);
        requestId = assertRequestId(requestId);
        model = assertModel(model);
        requestProfile = assertRequestProfile(requestProfile);
        exampleParams = {};
        exampleParams[ownData(projection, "modelPolicy").modelMaySupply[0].slice("params.".length)] = 57.5;
        proposal57Example = rootEnvelope(requestId, model, { type: "localProposal", proposal: { capabilityId: projection.capabilityId, params: exampleParams } });
        if (requestProfile === PROFILES.TEXT_ONLY) { return [
            "Turn response contract: profile " + requestProfile + ".",
            "Use requestId " + requestId + ", provider " + PROVIDER_ID + ", and model " + model + ".",
            "Concrete valid response example: " + rootEnvelope(requestId, model, { type: "text", text: "A concise answer." })
        ].join(" "); }
        if (requestProfile === PROFILES.PROPOSAL_CAPABLE_UNION) { return [
            "Turn response contract: profile " + requestProfile + ".",
            "Use requestId " + requestId + ", provider " + PROVIDER_ID + ", and model " + model + ".",
            "Concrete valid text example: " + rootEnvelope(requestId, model, { type: "text", text: "A concise answer." }),
            "Concrete valid proposal example: " + proposal57Example
        ].join(" "); }
        return [
            "Turn response contract: profile " + requestProfile + ".",
            "Use requestId " + requestId + ", provider " + PROVIDER_ID + ", and model " + model + ".",
            "Concrete valid response example: " + proposal57Example
        ].join(" ");
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, GLOBAL_STATIC_CONTRACT: GLOBAL_STATIC_CONTRACT, buildSystemPrompt: buildSystemPrompt, buildTurnContract: buildTurnContract });
}));
