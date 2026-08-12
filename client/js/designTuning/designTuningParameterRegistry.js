(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory(root && root.CoreUI));
    if (root && root.document && !root.DesignTuningParameterRegistry) root.DesignTuningParameterRegistry = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function (CoreUI) {
    "use strict";
    var definitions = [
        { id: "motion.curve.enter", type: "cubicBezier", domain: "motion", family: "enter", cssProperty: "--motion-curve-enter" },
        { id: "motion.curve.exit", type: "cubicBezier", domain: "motion", family: "exit", cssProperty: "--motion-curve-exit" },
        { id: "motion.curve.standard", type: "cubicBezier", domain: "motion", family: "standard", cssProperty: "--motion-curve-standard" },
        { id: "motion.curve.press", type: "cubicBezier", domain: "motion", family: "press", cssProperty: "--motion-curve-press" },
        { id: "motion.duration.spatialExpand", type: "durationMs", domain: "motion", motionRole: "spatialMorphExpand" },
        { id: "motion.duration.spatialContract", type: "durationMs", domain: "motion", motionRole: "spatialMorphContract" },
        { id: "motion.duration.viewContentEnter", type: "durationMs", domain: "motion", motionRole: "viewContentEnter" },
        { id: "motion.duration.viewContentExit", type: "durationMs", domain: "motion", motionRole: "viewContentExit" }
    ];
    var byId = {};
    var i;
    function clone(value) { return value && typeof value === "object" ? { x1: value.x1, y1: value.y1, x2: value.x2, y2: value.y2 } : value; }
    function validBezier(value) {
        if (CoreUI && typeof CoreUI.isValidBezierValue === "function") return CoreUI.isValidBezierValue(value);
        return !!value && [value.x1, value.y1, value.x2, value.y2].every(function (part) { return typeof part === "number" && isFinite(part); }) && value.x1 >= 0 && value.x1 <= 1 && value.x2 >= 0 && value.x2 <= 1;
    }
    for (i = 0; i < definitions.length; i++) byId[definitions[i].id] = Object.freeze(definitions[i]);
    function validate(id, value) {
        var parameter = byId[id];
        var number;
        if (!parameter) return { valid: false };
        if (parameter.type === "cubicBezier") return validBezier(value) ? { valid: true, value: clone(value) } : { valid: false };
        number = Number(value);
        return typeof value !== "boolean" && isFinite(number) && number >= 0 ? { valid: true, value: number } : { valid: false };
    }
    return Object.freeze({ list: function () { return definitions.slice(0); }, get: function (id) { return byId[id] || null; }, validate: validate, cloneValue: clone });
}));
