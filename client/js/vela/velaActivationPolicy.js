(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaActivationPolicy")) {
        Object.defineProperty(root, "VelaActivationPolicy", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var POLICY = Object.freeze({
        releaseMode: "experimental-preview",
        experimentalOptInAllowed: true,
        productionEnabled: false,
        productionBlockReason: "no-qualified-default-model",
        qualifiedDefaultModelId: null,
        legacyFallbackRetained: true,
        formalUiD2Enabled: false,
        moduleRevision: "vela-activation-policy-v1"
    });

    function getPolicy() { return POLICY; }
    function isTrustedPolicy(value) { return value === POLICY; }

    return Object.freeze({ getPolicy: getPolicy, isTrustedPolicy: isTrustedPolicy });
}));
