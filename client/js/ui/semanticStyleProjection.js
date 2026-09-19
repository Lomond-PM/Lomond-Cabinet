(function (root, factory) {
    "use strict";
    var resolver = root && root.SemanticStyleResolver;
    if (!resolver && typeof require === "function") resolver = require("./semanticStyleResolver.js");
    var api = Object.freeze(factory(resolver));
    if (root && root.document) root.SemanticStyleProjection = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function (Resolver) {
    "use strict";
    var roots = new WeakMap();
    function forRoot(style, options) {
        options = options || {};
        if (!style || typeof style.setProperty !== "function") throw new TypeError("Style root required");
        if (roots.has(style)) {
            if (Object.keys(options).length) throw new Error("Semantic root already configured");
            return roots.get(style);
        }
        var inputs = { defaults: Resolver.clone(options.defaults || Resolver.legacyDefaults()), defaultSource: options.defaultSource || "legacy-design", theme: {}, themePreview: null, calibration: {}, calibrationPreview: {} };
        var targets = {}, guards = [], pending = 1, applied = 0, projected = null, resolved = Resolver.resolve(inputs);
        Object.keys(Resolver.definitions).forEach(function (id) { targets[id] = options.targets && options.targets[id] || Resolver.definitions[id].cssProperty; });
        if (new Set(Object.keys(targets).map(function (id) { return targets[id]; })).size !== 3) throw new Error("Semantic targets must be distinct");
        function flush() {
            if (guards.some(function (guard) { return !guard(); })) return false;
            Object.keys(targets).forEach(function (id) {
                if (!projected || projected.values[id] !== resolved.values[id]) style.setProperty(targets[id], resolved.values[id]);
            });
            projected = resolved; applied = pending;
            return true;
        }
        function update(patch) {
            var next = Object.assign({}, inputs);
            Object.keys(patch).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(inputs, key)) throw new Error("Unknown style layer: " + key);
                next[key] = Resolver.clone(patch[key]);
            });
            var result = Resolver.resolve(next); // Validate before accepting any layer.
            if (JSON.stringify(next) !== JSON.stringify(inputs)) { inputs = next; resolved = result; pending += 1; }
            return flush();
        }
        function snapshot() {
            return Resolver.freeze(Resolver.clone({ pendingRevision: pending, appliedRevision: applied, pending: pending !== applied, targets: targets, resolved: resolved, projected: projected }));
        }
        var api = Object.freeze({
            update: update, flush: flush, getState: snapshot,
            owns: Resolver.owns,
            addProjectionGuard: function (guard) { if (guards.indexOf(guard) < 0) guards.push(guard); return function () { var i = guards.indexOf(guard); if (i >= 0) guards.splice(i, 1); }; }
        });
        roots.set(style, api);
        return api;
    }
    return { forRoot: forRoot };
}));
