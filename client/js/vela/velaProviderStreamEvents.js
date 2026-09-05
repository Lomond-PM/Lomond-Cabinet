(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && root.self === root && !Object.prototype.hasOwnProperty.call(root, "VelaProviderStreamEvents")) {
        Object.defineProperty(root, "VelaProviderStreamEvents", { configurable: false, enumerable: true, value: exported, writable: false });
        if (root.__velaProtocolCoreBootstrapV1 && typeof root.__velaProtocolCoreBootstrapV1.registerModule === "function") { root.__velaProtocolCoreBootstrapV1.registerModule("VelaProviderStreamEvents", exported); }
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MODULE_REVISION = "vela-provider-stream-events-v1";
    var EVENT_TYPES = Object.freeze(["stream-started", "reasoning-delta", "text-delta", "stream-completed", "stream-failed", "stream-cancelled"]);
    var BASE_KEYS = Object.freeze(["type", "requestId", "generation", "providerId", "modelId"]);
    var DELTA_KEYS = Object.freeze(["type", "requestId", "generation", "providerId", "modelId", "text"]);
    var FAILURE_KEYS = Object.freeze(["type", "requestId", "generation", "providerId", "modelId", "errorCode", "failureBoundary"]);
    var FORBIDDEN_KEYS = Object.freeze(["terminalResponse", "structuredResponse", "logicalPlan", "proposal", "capabilityIntent", "hostPayload", "raw", "chunk", "delta"]);

    function fail(message) { var error = new Error(message); error.code = "VELA_PROVIDER_STREAM_EVENT_INVALID"; throw error; }
    function hasOwn(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function isPlainObject(value) { if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; } return Object.getPrototypeOf ? Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null : true; }
    function ownString(value, key, required) { if (!hasOwn(value, key)) { if (required) { fail("Missing stream event field: " + key); } return null; } if (typeof value[key] !== "string" || !value[key].trim()) { fail("Invalid stream event string field: " + key); } return value[key]; }
    function assertKeys(value, allowed) { Object.keys(value).forEach(function (key) { if (allowed.indexOf(key) === -1 || FORBIDDEN_KEYS.indexOf(key) !== -1) { fail("Unknown or forbidden stream event field: " + key); } }); }
    function deepFreeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; } Object.keys(value).forEach(function (key) { deepFreeze(value[key]); }); return Object.freeze(value); }

    function canonicalize(input) {
        var type;
        var allowed;
        var result;
        if (!isPlainObject(input)) { fail("Stream event must be a plain object."); }
        type = ownString(input, "type", true);
        if (EVENT_TYPES.indexOf(type) === -1) { fail("Unknown stream event type."); }
        allowed = type === "reasoning-delta" || type === "text-delta" ? DELTA_KEYS : type === "stream-failed" ? FAILURE_KEYS : BASE_KEYS;
        assertKeys(input, allowed);
        result = { type: type, requestId: ownString(input, "requestId", true), generation: input.generation };
        if (!Number.isSafeInteger(result.generation) || result.generation < 1) { fail("Invalid stream event generation."); }
        result.providerId = ownString(input, "providerId", true);
        result.modelId = ownString(input, "modelId", true);
        if (type === "reasoning-delta" || type === "text-delta") {
            // Whitespace is meaningful incremental content, unlike identity fields.
            if (typeof input.text !== "string" || input.text.length === 0) { fail("Invalid stream event text."); }
            result.text = input.text;
        }
        if (type === "stream-failed") { result.errorCode = ownString(input, "errorCode", true); result.failureBoundary = ownString(input, "failureBoundary", false); }
        return deepFreeze(result);
    }

    function isCanonical(value) {
        var canonical;
        try {
            if (!Object.isFrozen(value)) { return false; }
            canonical = canonicalize(value);
            return JSON.stringify(canonical) === JSON.stringify(value);
        } catch (error) { return false; }
    }

    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, EVENT_TYPES: EVENT_TYPES, canonicalize: canonicalize, isCanonical: isCanonical });
}));
