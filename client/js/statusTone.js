(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (typeof module === "object" && module.exports) { module.exports.StatusToneContract = exported; }
    if (root && !Object.prototype.hasOwnProperty.call(root, "StatusToneContract")) {
        Object.defineProperty(root, "StatusToneContract", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var TONES = Object.freeze(["idle", "processing", "success", "warning", "error", "disabled"]);
    var STATE_TONES = Object.freeze({
        "requesting": "processing", "reviewing": "processing", "checking": "processing", "experimental-checking": "processing", "awaiting-confirmation": "processing", "executing": "processing", "pending": "processing", "generating": "processing", "busy": "processing",
        "successful": "success", "ready": "success", "experimental-ready": "success", "completed": "success", "available": "success", "connected": "success", "ok": "success",
        "selection-required": "warning", "no-selection": "warning", "no-active-comp": "warning", "capability-limited": "warning", "qualification-required": "warning", "experimental-disabled": "warning", "experimental-unavailable": "warning", "experimental-configuring": "warning", "endpoint-invalid": "warning", "configured-model-not-found": "warning", "configured-model-not-loaded": "warning",
        "error": "error", "failed": "error", "execution-failed": "error", "request-failed": "error", "readiness-network-failed": "error", "readiness-http-failed": "error", "readiness-response-invalid": "error",
        "disabled": "disabled", "user-disabled": "disabled"
    });

    function toneForState(state) {
        return typeof state === "string" && Object.prototype.hasOwnProperty.call(STATE_TONES, state) ? STATE_TONES[state] : "idle";
    }
    function toneForLegacyType(type, state) {
        var stateTone = toneForState(state);
        if (stateTone !== "idle" || state === "idle") { return stateTone; }
        return type === "busy" ? "processing" : type === "ok" ? "success" : type === "error" ? "error" : type === "disabled" ? "disabled" : "idle";
    }
    return Object.freeze({ tones: TONES, toneForState: toneForState, toneForLegacyType: toneForLegacyType });
}));
