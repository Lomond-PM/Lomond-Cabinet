(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaActiveCompositionCapability";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var registryModule = browserPage ? root.VelaAgentCapabilityRegistry : (typeof module === "object" && module.exports ? require("./velaAgentCapabilityRegistry") : null);
    var exported = Object.freeze(factory(registryModule));
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function (registryModule) {
    "use strict";
    var CAPABILITY_ID = "observe-active-composition-v1";
    var ADAPTER_ID = "context-bridge-active-composition-v1";
    function deepFreeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; } Object.keys(value).forEach(function (key) { deepFreeze(value[key]); }); return Object.freeze(value); }
    var nullableNumber = { type: "number", nullable: true };
    var nullableString = { type: "string", nullable: true };
    var definition = deepFreeze({
        capabilityId: CAPABILITY_ID,
        kind: "read",
        inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
        outputSchema: {
            type: "object",
            properties: {
                available: { type: "boolean" }, compositionId: nullableString, type: { type: "string", enum: ["CompItem"], nullable: true },
                width: nullableNumber, height: nullableNumber, duration: nullableNumber, frameRate: nullableNumber,
                hostContextId: { type: "string" }, hostInstanceId: { type: "string" }, hostReloadEpoch: { type: "number", minimum: 1 }
            },
            required: ["available", "compositionId", "type", "width", "height", "duration", "frameRate", "hostContextId", "hostInstanceId", "hostReloadEpoch"],
            additionalProperties: false
        },
        executionEnvironment: "host",
        adapterId: ADAPTER_ID,
        concurrency: "exclusive",
        cancellation: "commit-only"
    });

    function create(options) {
        var bridge = options && options.contextBridge;
        var registry;
        var adapters = {};
        if (!registryModule || typeof registryModule.createRegistry !== "function" || !bridge || typeof bridge.capture !== "function") { var failure = new Error("ACTIVE_COMPOSITION_CAPABILITY_UNAVAILABLE"); failure.code = "ACTIVE_COMPOSITION_CAPABILITY_UNAVAILABLE"; throw failure; }
        registry = registryModule.createRegistry([definition], { availabilityResolvers: (function () { var values = {}; values[CAPABILITY_ID] = function () { return typeof bridge.getState === "function" && bridge.getState().state !== "suspended"; }; return values; }()) });
        adapters[ADAPTER_ID] = function () {
            return bridge.capture({ tier: 1, purpose: "display", selectionOrderMeaningful: true }).then(function (capture) {
                var snapshot = capture && capture.snapshot;
                var comp = snapshot && snapshot.activeComp ? snapshot.activeComp : null;
                if (!capture || typeof capture.contextId !== "string" || !snapshot || typeof snapshot.hostInstanceId !== "string" || typeof snapshot.hostReloadEpoch !== "number") { throw new Error("ACTIVE_COMPOSITION_CAPTURE_INVALID"); }
                return Object.freeze({
                    available: !!comp,
                    compositionId: comp ? comp.compId : null,
                    type: comp ? comp.type : null,
                    width: comp ? comp.width : null,
                    height: comp ? comp.height : null,
                    duration: comp ? comp.duration : null,
                    frameRate: comp ? comp.frameRate : null,
                    hostContextId: capture.contextId,
                    hostInstanceId: snapshot.hostInstanceId,
                    hostReloadEpoch: snapshot.hostReloadEpoch
                });
            });
        };
        return Object.freeze({ registry: registry, adapters: Object.freeze(adapters), capabilityId: CAPABILITY_ID });
    }
    return Object.freeze({ MODULE_REVISION: "vela-active-composition-capability-0.3.4-v1", CAPABILITY_ID: CAPABILITY_ID, DEFINITION: definition, create: create });
}));
