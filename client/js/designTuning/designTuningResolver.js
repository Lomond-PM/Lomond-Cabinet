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
        var canonicals = {};
        var transientOverrides = {};
        var pendingRevision = 0;
        var appliedRevision = 0;
        function serialize(value) { return "cubic-bezier(" + value.x1 + ", " + value.y1 + ", " + value.x2 + ", " + value.y2 + ")"; }
        function validComputedCurve(value) {
            var match = /^cubic-bezier\(\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*\)$/i.exec(value);
            return !!match && isFinite(Number(match[1])) && Number(match[1]) >= 0 && Number(match[1]) <= 1 && isFinite(Number(match[2])) && isFinite(Number(match[3])) && Number(match[3]) >= 0 && Number(match[3]) <= 1 && isFinite(Number(match[4]));
        }
        function parseNumeric(value) { var match = /-?(?:\d+\.?\d*|\.\d+)/.exec(String(value || "")); return match ? Number(match[0]) : null; }
        function captureCanonicals() {
            registry.list().forEach(function (parameter) {
                var value;
                if (parameter.cssProperty) {
                    value = readComputed(parameter.cssProperty);
                    canonicals[parameter.id] = parameter.type === "cubicBezier" && validComputedCurve(value) ? value : (parameter.type === "shadow" ? options.parseShadow(value) : (parameter.type === "colorAlpha" ? options.parseColorAlpha(value) : (parameter.type === "lengthPx" || parameter.type === "percentage" ? parseNumeric(value) : value)));
                } else if (parameter.motionRole) canonicals[parameter.id] = options.getCanonicalDuration(parameter.motionRole);
            });
        }
        function serializeCss(parameter, value) {
            if (parameter.type === "cubicBezier") return serialize(value);
            if (parameter.type === "shadow") return options.serializeShadow(value);
            if (parameter.type === "colorAlpha") return options.serializeColorAlpha(value);
            if (parameter.type === "percentage") return value + "%";
            if (parameter.type === "lengthPx") return "calc(" + value + "px * var(--ui-scale))";
            return String(value);
        }
        function applyProjection() {
            var overrides;
            if (!isProjectionSafe()) return false;
            overrides = store.getOverrides();
            registry.list().forEach(function (parameter) {
                if (!parameter.cssProperty || parameter.protection) return;
                if (Object.prototype.hasOwnProperty.call(transientOverrides, parameter.id)) rootStyle.setProperty(parameter.cssProperty, serializeCss(parameter, transientOverrides[parameter.id]));
                else if (Object.prototype.hasOwnProperty.call(overrides, parameter.id)) rootStyle.setProperty(parameter.cssProperty, serializeCss(parameter, overrides[parameter.id]));
                else rootStyle.removeProperty(parameter.cssProperty);
            });
            appliedRevision = pendingRevision;
            if (typeof onProjectionApplied === "function") onProjectionApplied();
            return true;
        }
        function requestProjection() { pendingRevision += 1; applyProjection(); return pendingRevision; }
        function resolveDuration(role, canonical) {
            var result = canonical;
            registry.list().some(function (parameter) { var override; if (parameter.motionRole !== role) return false; if (Object.prototype.hasOwnProperty.call(transientOverrides, parameter.id)) result = transientOverrides[parameter.id]; else { override = store.getOverride(parameter.id); if (override !== null) result = override; } return true; });
            return result;
        }
        function mutate(action) { var changed = action(); if (changed !== false) { store.save(); requestProjection(); } return changed; }
        function evidence(domain) {
            var canonical = {}; var overrides = store.getOverrides(); var resolved = {}; var patch = {};
            var scopedOverrides = {};
            registry.list().forEach(function (parameter) { var base; var value; if (domain && parameter.domain !== domain) return; base = canonicals[parameter.id]; value = Object.prototype.hasOwnProperty.call(overrides, parameter.id) ? overrides[parameter.id] : base; canonical[parameter.id] = base; resolved[parameter.id] = value; if (Object.prototype.hasOwnProperty.call(overrides, parameter.id)) { scopedOverrides[parameter.id] = overrides[parameter.id]; patch[parameter.id] = { from: base, to: overrides[parameter.id] }; } });
            return { scope: domain || "all", canonical: canonical, overrides: scopedOverrides, resolved: resolved, promotionPatch: patch };
        }
        return Object.freeze({
            initialize: function () { captureCanonicals(); requestProjection(); },
            resolveDuration: resolveDuration,
            flushPendingProjection: function () { return appliedRevision === pendingRevision ? false : applyProjection(); },
            setOverride: function (id, value) { return mutate(function () { return store.setOverride(id, value); }); },
            setTransientOverride: function (id, value) { var checked = registry.validate(id, value); if (!checked.valid) return false; transientOverrides[id] = checked.value; requestProjection(); return true; },
            clearTransientOverride: function (id) { if (!Object.prototype.hasOwnProperty.call(transientOverrides, id)) return false; delete transientOverrides[id]; requestProjection(); return true; },
            clearTransientOverrides: function () { transientOverrides = {}; requestProjection(); },
            commitTransientOverride: function (id, value) { var checked = registry.validate(id, value); if (!checked.valid) return false; store.setOverride(id, checked.value); store.save(); delete transientOverrides[id]; requestProjection(); return true; },
            getTransientOverrides: function () { var out = {}; var key; for (key in transientOverrides) if (Object.prototype.hasOwnProperty.call(transientOverrides, key)) out[key] = registry.cloneValue(transientOverrides[key]); return out; },
            resetParameter: function (id) { return mutate(function () { return store.removeOverride(id); }); },
            resetMotion: function () { return mutate(function () { return store.clearDomain("motion"); }); },
            resetDomain: function (domain) { return mutate(function () { return store.clearDomain(domain); }); },
            resetAll: function () { store.clearAll(); store.save(); requestProjection(); },
            getEvidence: evidence,
            getProjectionState: function () { return { pendingRevision: pendingRevision, appliedRevision: appliedRevision }; }
        });
    }
    return { create: create };
}));
