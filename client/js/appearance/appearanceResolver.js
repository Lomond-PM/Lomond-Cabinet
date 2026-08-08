(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && root.document && !Object.prototype.hasOwnProperty.call(root, "AppearanceResolver")) {
        Object.defineProperty(root, "AppearanceResolver", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if ((!root || !root.document) && typeof module === "object" && module.exports) {
        module.exports.AppearanceResolver = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var DESIGN_DEFAULTS = Object.freeze({
        "base.accent": "#d6b25e",
        "base.canvas": "#050403",
        "layout.scale": 0.92,
        "motion.speed": 1,
        "surface.panel": "#0b0a08",
        "surface.card": "#0f0e0b",
        "text.primary": "#f6f0df",
        "select.trigger.surface": "#0b0a08",
        "select.menu.surface": "#0b0a08",
        "action.primary.foreground": "#130f08"
    });
    var CSS_TARGETS = Object.freeze({
        "surface.panel": "--surface-panel",
        "surface.card": "--surface-card",
        "text.primary": "--text-primary",
        "select.trigger.surface": "--select-trigger-surface",
        "select.menu.surface": "--select-menu-surface",
        "interaction.focus.ring": "--interaction-focus-ring",
        "interaction.focus.border": "--interaction-focus-border",
        "interaction.hover.border": "--interaction-hover-border",
        "interaction.hover.surface": "--interaction-hover-surface",
        "interaction.selected.surface": "--interaction-selected-surface",
        "interaction.selected.foreground": "--interaction-selected-foreground",
        "interaction.checked.surface": "--interaction-checked-surface",
        "action.primary.surface": "--action-primary-surface",
        "action.primary.hoverSurface": "--action-primary-hover-surface",
        "action.primary.foreground": "--action-primary-foreground",
        "selection.indicator.surface": "--selection-indicator-surface"
    });

    function normalizeHex(value, fallback) {
        return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
    }
    function hexToRgb(hex) {
        return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
    }
    function channel(value) {
        var text = Math.max(0, Math.min(255, Math.round(value))).toString(16);
        return text.length < 2 ? "0" + text : text;
    }
    function mixHex(a, b, amount) {
        var left = hexToRgb(a);
        var right = hexToRgb(b);
        return "#" + channel(left.r + (right.r - left.r) * amount) + channel(left.g + (right.g - left.g) * amount) + channel(left.b + (right.b - left.b) * amount);
    }
    function rgba(hex, alpha) {
        var color = hexToRgb(hex);
        return "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + alpha + ")";
    }
    function copy(source) {
        var result = {};
        var key;
        for (key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { result[key] = source[key]; } }
        return result;
    }

    function create(options) {
        options = options || {};
        var registry = options.registry;
        var store = options.store;
        var rootStyle = options.rootStyle;
        var runtime = options.runtime || {};
        var baseInputs = copy(DESIGN_DEFAULTS);
        var previewOverrides = {};
        var resolved = {};

        function themeDefaults() {
            var accent = normalizeHex(baseInputs["base.accent"], DESIGN_DEFAULTS["base.accent"]);
            var hot = mixHex(accent, "#ffffff", 0.24);
            return {
                accent: accent,
                hot: hot,
                dark: mixHex(accent, "#000000", 0.58),
                soft: rgba(accent, 0.72),
                track: rgba(accent, 0.24),
                focus: rgba(hot, 0.62),
                button: rgba(accent, 0.86),
                separator: rgba(accent, 0.16),
                panelBorder: rgba(accent, 0.22),
                inputBorder: rgba(accent, 0.16)
            };
        }

        function semanticDefaults(theme) {
            var values = copy(DESIGN_DEFAULTS);
            values["interaction.focus.ring"] = theme.focus;
            values["interaction.focus.border"] = theme.focus;
            values["interaction.hover.border"] = theme.focus;
            values["interaction.hover.surface"] = theme.track;
            values["interaction.selected.surface"] = theme.track;
            values["interaction.selected.foreground"] = theme.hot;
            values["interaction.checked.surface"] = theme.track;
            values["action.primary.surface"] = theme.button;
            values["action.primary.hoverSurface"] = theme.hot;
            values["selection.indicator.surface"] = theme.dark;
            return values;
        }

        function write(name, value) {
            if (rootStyle && typeof rootStyle.setProperty === "function") { rootStyle.setProperty(name, String(value)); }
        }

        function resolveAndApply() {
            var theme = themeDefaults();
            var values = semanticDefaults(theme);
            var overrides = store ? store.getOverrides() : {};
            var key;
            for (key in baseInputs) { if (Object.prototype.hasOwnProperty.call(baseInputs, key)) { values[key] = baseInputs[key]; } }
            for (key in overrides) { if (Object.prototype.hasOwnProperty.call(overrides, key)) { values[key] = overrides[key]; } }
            for (key in previewOverrides) { if (Object.prototype.hasOwnProperty.call(previewOverrides, key)) { values[key] = previewOverrides[key]; } }

            write("--gold", theme.accent);
            write("--gold-hot", theme.hot);
            write("--gold-soft", theme.soft);
            write("--gold-track", theme.track);
            write("--gold-focus", theme.focus);
            write("--gold-button", theme.button);
            write("--separator", theme.separator);
            write("--panel-border", theme.panelBorder);
            write("--input-border", theme.inputBorder);
            write("--selection-bg", theme.dark);
            write("--bg-main", values["base.canvas"]);
            write("--ui-scale", values["layout.scale"]);
            for (key in CSS_TARGETS) {
                if (Object.prototype.hasOwnProperty.call(CSS_TARGETS, key) && typeof values[key] !== "undefined") {
                    write(CSS_TARGETS[key], values[key]);
                }
            }
            if (typeof runtime.applyMotionSpeed === "function") { runtime.applyMotionSpeed(values["motion.speed"]); }
            resolved = values;
            return copy(resolved);
        }

        function setBaseInput(id, value) {
            var parameter = registry && registry.get(id);
            var checked = registry && registry.validate(id, value);
            if (!parameter || parameter.persistence !== "settings" || !checked || !checked.valid) { return false; }
            baseInputs[id] = checked.value;
            resolveAndApply();
            return true;
        }

        function preview(id, value) {
            var checked = registry && registry.validate(id, value);
            if (!registry || !registry.isAppearanceOverride(id) || !checked || !checked.valid) { return false; }
            previewOverrides[id] = checked.value;
            resolveAndApply();
            return true;
        }

        function commit(id, value) {
            var parameter = registry && registry.get(id);
            var checked = registry && registry.validate(id, value);
            if (!parameter || !checked || !checked.valid) { return false; }
            if (parameter.persistence === "settings") {
                if (typeof runtime.commitBaseInput !== "function" || runtime.commitBaseInput(id, checked.value) !== true) { return false; }
                return setBaseInput(id, checked.value);
            }
            if (!store || !store.setOverride(id, checked.value)) { return false; }
            delete previewOverrides[id];
            store.save();
            resolveAndApply();
            return true;
        }

        function reset(id) {
            delete previewOverrides[id];
            if (!store || !store.removeOverride(id)) { resolveAndApply(); return false; }
            store.save();
            resolveAndApply();
            return true;
        }

        return Object.freeze({
            initialize: function (inputs) {
                var key;
                if (store) { store.load(); }
                inputs = inputs || {};
                for (key in inputs) { if (Object.prototype.hasOwnProperty.call(inputs, key)) { setBaseInput(key, inputs[key]); } }
                return resolveAndApply();
            },
            getParameter: function (id) { return registry ? registry.get(id) : null; },
            getResolvedValue: function (id) { return Object.prototype.hasOwnProperty.call(resolved, id) ? resolved[id] : null; },
            getOverride: function (id) { return store ? store.getOverride(id) : null; },
            setBaseInput: setBaseInput,
            preview: preview,
            clearPreview: function (id) { delete previewOverrides[id]; resolveAndApply(); },
            commit: commit,
            reset: reset,
            resetCategory: function (category) { if (store) { store.resetCategory(category); store.save(); } previewOverrides = {}; return resolveAndApply(); },
            resetAll: function () { if (store) { store.resetAll(); store.save(); } previewOverrides = {}; return resolveAndApply(); },
            resolve: resolveAndApply,
            getOverrides: function () { return store ? store.getOverrides() : {}; }
        });
    }

    return { designDefaults: DESIGN_DEFAULTS, cssTargets: CSS_TARGETS, create: create };
}));
