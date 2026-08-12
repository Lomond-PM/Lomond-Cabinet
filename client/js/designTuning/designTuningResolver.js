(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (root && root.document && !root.DesignTuningResolver) root.DesignTuningResolver = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function create(options) {
        options = options || {};
        var registry = options.registry;
        var store = options.store;
        var rootStyle = options.rootStyle;
        var readComputed = options.readComputed;
        var isProjectionSafe = options.isProjectionSafe || function () { return true; };
        var onProjectionApplied = options.onProjectionApplied;
        var canonicalCurves = {};
        var pendingRevision = 0;
        var appliedRevision = 0;
        function serialize(value) { return "cubic-bezier(" + value.x1 + ", " + value.y1 + ", " + value.x2 + ", " + value.y2 + ")"; }
        function validComputedCurve(value) {
            var match = /^cubic-bezier\(\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*\)$/i.exec(value);
            return !!match && isFinite(Number(match[1])) && Number(match[1]) >= 0 && Number(match[1]) <= 1 && isFinite(Number(match[2])) && isFinite(Number(match[3])) && Number(match[3]) >= 0 && Number(match[3]) <= 1 && isFinite(Number(match[4]));
        }
        function captureCanonicalCurves() {
            registry.list().forEach(function (parameter) { var value; if (parameter.type !== "cubicBezier") return; value = readComputed(parameter.cssProperty); if (validComputedCurve(value)) canonicalCurves[parameter.id] = value; });
        }
        function applyProjection() {
            var overrides;
            if (!isProjectionSafe()) return false;
            overrides = store.getOverrides();
            registry.list().forEach(function (parameter) {
                if (parameter.type !== "cubicBezier") return;
                if (Object.prototype.hasOwnProperty.call(overrides, parameter.id)) rootStyle.setProperty(parameter.cssProperty, serialize(overrides[parameter.id]));
                else rootStyle.removeProperty(parameter.cssProperty);
            });
            appliedRevision = pendingRevision;
            if (typeof onProjectionApplied === "function") onProjectionApplied();
            return true;
        }
        function requestProjection() { pendingRevision += 1; applyProjection(); return pendingRevision; }
        function resolveDuration(role, canonical) {
            var result = canonical;
            registry.list().some(function (parameter) { var override; if (parameter.motionRole !== role) return false; override = store.getOverride(parameter.id); if (override !== null) result = override; return true; });
            return result;
        }
        function mutate(action) { var changed = action(); if (changed !== false) { store.save(); requestProjection(); } return changed; }
        function evidence() {
            var canonical = {}; var overrides = store.getOverrides(); var resolved = {}; var patch = {};
            registry.list().forEach(function (parameter) { var base = parameter.type === "cubicBezier" ? canonicalCurves[parameter.id] : options.getCanonicalDuration(parameter.motionRole); var value = Object.prototype.hasOwnProperty.call(overrides, parameter.id) ? overrides[parameter.id] : base; canonical[parameter.id] = base; resolved[parameter.id] = value; if (Object.prototype.hasOwnProperty.call(overrides, parameter.id)) patch[parameter.id] = { from: base, to: overrides[parameter.id] }; });
            return { scope: "motion", canonical: canonical, overrides: overrides, resolved: resolved, promotionPatch: patch };
        }
        return Object.freeze({
            initialize: function () { captureCanonicalCurves(); requestProjection(); },
            resolveDuration: resolveDuration,
            flushPendingProjection: function () { return appliedRevision === pendingRevision ? false : applyProjection(); },
            setOverride: function (id, value) { return mutate(function () { return store.setOverride(id, value); }); },
            resetParameter: function (id) { return mutate(function () { return store.removeOverride(id); }); },
            resetMotion: function () { return mutate(function () { return store.clearDomain("motion"); }); },
            resetAll: function () { store.clearAll(); store.save(); requestProjection(); },
            getEvidence: evidence,
            getProjectionState: function () { return { pendingRevision: pendingRevision, appliedRevision: appliedRevision }; }
        });
    }
    return { create: create };
}));
