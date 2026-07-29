(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaCapabilityPromptBuilder";
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
    var MODULE_REVISION = "vela-capability-prompt-builder-v2";
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
    function buildSystemPrompt(modelProjection, requestId, model) {
        var projection;
        var exampleParams;
        var proposal57Example;
        projection = assertProjection(modelProjection);
        requestId = assertRequestId(requestId);
        model = assertModel(model);
        exampleParams = {};
        exampleParams[ownData(projection, "modelPolicy").modelMaySupply[0].slice("params.".length)] = 57.5;
        proposal57Example = JSON.stringify({ protocol: RESPONSE_PROTOCOL, schemaVersion: RESPONSE_SCHEMA_VERSION, requestId: requestId, provider: PROVIDER_ID, model: model, envelope: { type: "localProposal", proposal: { capabilityId: projection.capabilityId, params: exampleParams } } });
        return [
            "Return exactly one complete JSON object and nothing else.",
            "Follow the attached json_schema exactly; it is format guidance and the local Parser will validate again.",
            "Use protocol " + RESPONSE_PROTOCOL + " and schemaVersion " + RESPONSE_SCHEMA_VERSION + ".",
            "Use requestId " + requestId + ", provider " + PROVIDER_ID + ", and model " + model + ".",
            "FIRST choose exactly one response branch before writing JSON. Default to text. When uncertain whether to use text or localProposal, use text. A schema-valid localProposal can still be semantically wrong.",
            "Use localProposal only when ALL conditions hold: the user directly commands one edit supported by the current capability; one property is explicit; exactly one in-range target value appears in the current user message; no target choice is required; and the request is not a question, advice, explanation, comparison, prediction, hypothetical, conditional, negation, ambiguity, relative adjustment, or current-state query. Otherwise use text.",
            "Use text for greetings, capabilities, current-value/status queries, unavailable grounding, questions, suggestions, whether-to-edit requests, explanations, comparisons, predicted outcomes, hypotheticals, conditions, negations, vague changes, multiple values, multiple possible edits, or any uncertainty. Do not guess a current value or a target. A text response never claims an edit was performed, scheduled, or proposed.",
            "Trusted context may answer a current-value query only as text. A proposal target must come from the current user message, never from trusted context. If the current value is unavailable, say it cannot be reliably confirmed and do not guess; an explicit user target may still be proposed.",
            "All responses must be one complete schema envelope: no bare text, Markdown, extra explanation, multiple objects, or fields beyond the schema.",
            "A localProposal uses only capabilityId " + projection.capabilityId + " and params.opacity equal to the requested target. A localProposal is only a suggestion. It does not execute anything.",
            "Example direct edit: set the current layer opacity to 57.5% -> " + proposal57Example + ".",
            "Text examples: What is the current opacity?; Should I set opacity to 50%?; If opacity were 50%, what would happen?; Do not change opacity; Make it more transparent; Set it to 25% or 50%; Hello."
        ].join(" ");
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, buildSystemPrompt: buildSystemPrompt });
}));
