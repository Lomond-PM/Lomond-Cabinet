(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (root && root.document) root.SemanticStyleResolver = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    // C1 owns only the three overlapping border roles, not component geometry.
    var definitions = Object.freeze({
        "border.panel": Object.freeze({ cssProperty: "--panel-border", alpha: 0.22 }),
        "border.input": Object.freeze({ cssProperty: "--input-border", alpha: 0.16 }),
        "border.separator": Object.freeze({ cssProperty: "--separator", alpha: 0.16 })
    });
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function freeze(value) { if (value && typeof value === "object") { Object.keys(value).forEach(function (key) { freeze(value[key]); }); Object.freeze(value); } return value; }
    function color(value) {
        if (!value || typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color) || typeof value.alpha !== "number" || !isFinite(value.alpha) || value.alpha < 0 || value.alpha > 1) throw new TypeError("Invalid semantic color/alpha");
        return { color: value.color.toLowerCase(), alpha: value.alpha };
    }
    function serialize(value) {
        value = color(value);
        return "rgba(" + [1, 3, 5].map(function (i) { return parseInt(value.color.slice(i, i + 2), 16); }).join(", ") + ", " + value.alpha + ")";
    }
    function legacyDefaults() {
        var values = {};
        Object.keys(definitions).forEach(function (id) { values[id] = { color: "#d6b25e", alpha: definitions[id].alpha }; });
        return values;
    }
    function owns(id) { return Object.prototype.hasOwnProperty.call(definitions, id); }
    function select(source) {
        var out = {};
        Object.keys(source || {}).forEach(function (id) { if (owns(id)) out[id] = color(source[id]); });
        return out;
    }
    function resolve(input) {
        input = input || {};
        var defaults = input.defaults || legacyDefaults();
        var theme = input.themePreview !== null && input.themePreview !== undefined ? input.themePreview : (input.theme || {});
        var calibration = select(input.calibration), preview = select(input.calibrationPreview);
        var values = {}, provenance = {};
        if (theme.accent !== undefined && !/^#[0-9a-f]{6}$/i.test(theme.accent)) throw new TypeError("Invalid semantic theme accent");
        Object.keys(definitions).forEach(function (id) {
            var base = color(defaults[id]), derived = theme.accent ? color({ color: theme.accent, alpha: definitions[id].alpha }) : base;
            var explicit = Object.prototype.hasOwnProperty.call(calibration, id), transient = Object.prototype.hasOwnProperty.call(preview, id);
            var value = transient ? preview[id] : explicit ? calibration[id] : derived;
            values[id] = serialize(value);
            provenance[id] = {
                defaultValue: base, defaultSource: input.defaultSource || "legacy-design",
                themeInput: clone(input.theme || {}), theme: clone(theme), themeDerived: derived,
                calibration: explicit ? calibration[id] : null,
                preview: { theme: input.themePreview || null, calibration: transient ? preview[id] : null },
                source: transient ? "design-tuning-preview" : explicit ? "design-tuning-override" : theme.accent ? (input.themePreview ? "settings-preview-derived" : "settings-derived") : "design-default",
                value: value, cssValue: values[id],
                persistenceOwner: explicit || transient ? "design-tuning" : theme.accent ? "settings" : null
            };
        });
        return freeze({ values: values, provenance: provenance });
    }
    return { definitions: definitions, owns: owns, select: select, color: color, serialize: serialize, legacyDefaults: legacyDefaults, resolve: resolve, clone: clone, freeze: freeze };
}));
