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
    var MODULE_REVISION = "vela-capability-prompt-builder-v1";
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
            "DECISION: text by default. Return localProposal only for a direct command to set the current or selected layer opacity to one explicit 0–100 target. Return text for greetings, questions, current-value queries, explanations, suggestions, uncertainty, hypotheticals, negations, relative adjustments, ambiguity, or no one target.",
            "Opacity plus a number is not enough: questions, explanations, and suggestions use text. Never guess 50 or another value. A current-value query may state a value only when that exact value is supplied in trusted request context; otherwise say you cannot reliably verify the current opacity and will not guess. For an ambiguous edit, ask for one explicit target from 0 to 100%. A text response never claims an edit was performed, scheduled, or proposed. For an explicit supported opacity command, text is invalid: return the localProposal envelope itself.",
            "默认返回 text。当前值只有在可信请求上下文明确提供时才能回答；否则说明无法可靠确认且不猜测。模糊修改请求只要求提供唯一 0–100% 目标值，text 不得声称已完成、将执行或已提出修改建议。",
            "All responses must be one complete schema envelope: no bare text, Markdown, extra explanation, multiple objects, or fields beyond the schema.",
            "A localProposal uses only capabilityId " + projection.capabilityId + " and params.opacity equal to the requested target. A localProposal is only a suggestion. It does not execute anything.",
            "For 将当前图层不透明度设为 57.5%, return: " + proposal57Example + ". For Set the selected layer opacity to 0% and Change opacity to 100, return localProposal with opacity 0 and 100 respectively.",
            "Text examples: 你好; Hello; What is opacity?; Should I set opacity to 50%?; 透明一些; Maybe reduce opacity. For ambiguous edits, say: Specify a target opacity from 0 to 100%, for example 50%. / 请提供明确的不透明度目标值，例如 50%。"
        ].join(" ");
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, buildSystemPrompt: buildSystemPrompt });
}));
