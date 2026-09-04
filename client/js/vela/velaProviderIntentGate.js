(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaProviderIntentGate";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        var capabilities = bootstrap.getModule("VelaCapabilityContracts");
        if (!capabilities || typeof capabilities.getLocalProjection !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        exported = Object.freeze(create(capabilities));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaCapabilityContracts")));
    }
}(typeof self !== "undefined" ? self : this, function (capabilityContracts) {
    "use strict";

    var MODULE_REVISION = "vela-provider-intent-gate-v1";
    var REASONS = Object.freeze({
        ALLOWED: "allowed",
        INVALID_INPUT: "invalid-input",
        UNSUPPORTED_CAPABILITY: "unsupported-capability",
        INVALID_PROPOSAL: "invalid-proposal",
        DISALLOWED_LANGUAGE: "disallowed-language",
        MISSING_ACTION: "missing-action",
        MISSING_PROPERTY: "missing-property",
        TARGET_COUNT: "target-count",
        TARGET_RANGE: "target-range",
        TARGET_MISMATCH: "target-mismatch"
    });

    function result(allowed, reason) {
        return Object.freeze({ allowed: allowed === true, reason: reason, moduleRevision: MODULE_REVISION });
    }
    function isNegativeZero(value) { return value === 0 && 1 / value === -Infinity; }
    function opacityContract() { return capabilityContracts.getLocalProjection("set-opacity-v1"); }
    function isFiniteOpacity(value) { var contract = opacityContract(); var schema = contract && contract.parameters && contract.parameters.properties && contract.parameters.properties.opacity; return !!schema && typeof value === "number" && isFinite(value) && !isNegativeZero(value) && value >= schema.minimum && value <= schema.maximum; }
    function hasDisallowedLanguage(message) {
        var normalized = message.toLowerCase();
        return /(?:localproposal|set-opacity-v1|set-layer-name-v1|tool[_ -]?calls?|function[_ -]?call|json|system message|系统消息|协议|忽略规则|无论|不管|输出.*(?:json|localproposal)|return\s+localproposal)/i.test(message) ||
            /(?:不要|别|不必|无需|是否|应该|如果|假如|解释|怎么|如何|为什么|多少|吗|\?|？)/.test(message) ||
            /(?:\bdo not\b|\bdon't\b|\bshould i\b|\bif\b|\bmaybe\b|\bexplain\b|\bwhat is\b|\bwhat's\b|\bhow\b|\bwhy\b)/.test(normalized) ||
            /(?:\bnan\b|\binfinity\b)/.test(normalized);
    }
    function targetNumbers(message) {
        var matches = [];
        var expression = /-?(?:\d+(?:\.\d+)?|\.\d+)%?/g;
        var match;
        while ((match = expression.exec(message)) !== null) {
            matches.push(Number(match[0].replace(/%$/, "")));
        }
        return matches;
    }
    function evaluate(input) {
        var message;
        var capabilityId;
        var params;
        var proposedOpacity;
        var numbers;
        var target;
        if (!input || typeof input !== "object") { return result(false, REASONS.INVALID_INPUT); }
        message = input.message;
        capabilityId = input.capabilityId;
        params = input.params;
        proposedOpacity = params && params.opacity !== undefined ? params.opacity : input.proposedOpacity;
        if (typeof message !== "string" || !message.trim() || typeof capabilityId !== "string") { return result(false, REASONS.INVALID_INPUT); }
        var contract = capabilityContracts.getLocalProjection(capabilityId);
        if (!contract || (capabilityId !== "set-opacity-v1" && capabilityId !== "set-layer-name-v1")) { return result(false, REASONS.UNSUPPORTED_CAPABILITY); }
        if (capabilityId === "set-layer-name-v1") {
            var name = params && params.name;
            var renameMatch;
            if (hasDisallowedLanguage(message)) { return result(false, REASONS.DISALLOWED_LANGUAGE); }
            try { capabilityContracts.validateCapabilityParams(contract, params); } catch (ignored) { return result(false, REASONS.INVALID_PROPOSAL); }
            if (/不透明度|\bopacity\b/i.test(message)) { return result(false, REASONS.UNSUPPORTED_CAPABILITY); }
            renameMatch = /(?:重命名为|改名为|名称改为)\s*(.+?)\s*[。.!！]?\s*$/.exec(message) || /(?:rename|change\s+(?:the\s+)?name\s+of).*?(?:to\s+)(.+?)\s*[.!]?\s*$/i.exec(message);
            if (!renameMatch) { return result(false, REASONS.MISSING_ACTION); }
            if (renameMatch[1] !== name) { return result(false, REASONS.TARGET_MISMATCH); }
            return result(true, REASONS.ALLOWED);
        }
        if (contract.localPolicy.intentValidatorId !== "set-opacity-direct-edit-v1") { return result(false, REASONS.UNSUPPORTED_CAPABILITY); }
        if (!isFiniteOpacity(proposedOpacity)) { return result(false, REASONS.INVALID_PROPOSAL); }
        if (hasDisallowedLanguage(message)) { return result(false, REASONS.DISALLOWED_LANGUAGE); }
        if (!/(?:设置|设为|改为|调整为|调整到|调到|改成)/.test(message) && !/\b(?:set|change|adjust)\b/i.test(message)) { return result(false, REASONS.MISSING_ACTION); }
        if (message.indexOf("不透明度") === -1 && !/\bopacity\b/i.test(message)) { return result(false, REASONS.MISSING_PROPERTY); }
        numbers = targetNumbers(message);
        if (numbers.length !== 1) { return result(false, REASONS.TARGET_COUNT); }
        target = numbers[0];
        if (!isFiniteOpacity(target)) { return result(false, REASONS.TARGET_RANGE); }
        if (target !== proposedOpacity) { return result(false, REASONS.TARGET_MISMATCH); }
        return result(true, REASONS.ALLOWED);
    }

    return Object.freeze({ evaluate: evaluate, MODULE_REVISION: MODULE_REVISION });
}));
