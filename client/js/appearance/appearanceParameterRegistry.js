(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && root.document && !Object.prototype.hasOwnProperty.call(root, "AppearanceParameterRegistry")) {
        Object.defineProperty(root, "AppearanceParameterRegistry", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if ((!root || !root.document) && typeof module === "object" && module.exports) {
        module.exports.AppearanceParameterRegistry = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var definitions = [
        { id: "base.accent", category: "base", tier: "basic", controlType: "color", labelKey: "appearance.base.accent.label", descriptionKey: "appearance.base.accent.description", defaultSource: "settings.themeAccent", classification: "BASE_INPUT", persistence: "settings", userAdjustable: true, resolverTarget: "base.accent", validation: { type: "hex-color" }, livePreview: true, reset: "settings-default" },
        { id: "base.canvas", category: "base", tier: "basic", controlType: "color", labelKey: "appearance.base.canvas.label", descriptionKey: "appearance.base.canvas.description", defaultSource: "settings.homeBackground", classification: "BASE_INPUT", persistence: "settings", userAdjustable: true, resolverTarget: "base.canvas", validation: { type: "hex-color" }, livePreview: true, reset: "settings-default" },
        { id: "layout.scale", category: "layout", tier: "basic", controlType: "range", labelKey: "appearance.layout.scale.label", descriptionKey: "appearance.layout.scale.description", defaultSource: "settings.uiScale", classification: "BASE_INPUT", persistence: "settings", userAdjustable: true, resolverTarget: "layout.scale", validation: { type: "number", min: 0.62, max: 1.18 }, livePreview: true, reset: "settings-default" },
        { id: "motion.speed", category: "motion", tier: "basic", controlType: "range", labelKey: "appearance.motion.speed.label", descriptionKey: "appearance.motion.speed.description", defaultSource: "settings.motionSpeed", classification: "BASE_INPUT", persistence: "settings", userAdjustable: true, resolverTarget: "motion.speed", validation: { type: "number", min: 0.75, max: 1.35 }, livePreview: true, reset: "settings-default" },

        { id: "surface.panel", category: "surfaces", tier: "advanced", controlType: "color", labelKey: "appearance.surface.panel.label", descriptionKey: "appearance.surface.panel.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "surface.panel", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "text.primary", category: "text", tier: "advanced", controlType: "color", labelKey: "appearance.text.primary.label", descriptionKey: "appearance.text.primary.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "text.primary", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "text.secondary", category: "text", tier: "advanced", controlType: "colorAlpha", labelKey: "appearance.text.secondary.label", descriptionKey: "appearance.text.secondary.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "text.secondary", validation: { type: "colorAlpha" }, livePreview: true, reset: "remove-override" },
        { id: "text.tertiary", category: "text", tier: "advanced", controlType: "colorAlpha", labelKey: "appearance.text.tertiary.label", descriptionKey: "appearance.text.tertiary.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "text.tertiary", validation: { type: "colorAlpha" }, livePreview: true, reset: "remove-override" },
        { id: "select.trigger.surface", category: "select", tier: "advanced", controlType: "color", labelKey: "appearance.select.triggerSurface.label", descriptionKey: "appearance.select.triggerSurface.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "select.trigger.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "select.menu.surface", category: "select", tier: "advanced", controlType: "color", labelKey: "appearance.select.menuSurface.label", descriptionKey: "appearance.select.menuSurface.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "select.menu.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },

        { id: "typography.title.size", category: "typography", subgroup: "titles", tier: "advanced", controlType: "range-number", labelKey: "appearance.typography.titleSize.label", descriptionKey: "appearance.typography.titleSize.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "typography.title.sizeMultiplier", validation: { type: "multiplier", min: 0.90, max: 1.15, step: 0.01 }, livePreview: true, reset: "remove-override" },
        { id: "typography.sectionTitle.size", category: "typography", subgroup: "titles", tier: "advanced", controlType: "range-number", labelKey: "appearance.typography.sectionTitleSize.label", descriptionKey: "appearance.typography.sectionTitleSize.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "typography.sectionTitle.sizeMultiplier", validation: { type: "multiplier", min: 0.90, max: 1.15, step: 0.01 }, livePreview: true, reset: "remove-override" },
        { id: "typography.fieldLabel.size", category: "typography", subgroup: "content", tier: "advanced", controlType: "range-number", labelKey: "appearance.typography.fieldLabelSize.label", descriptionKey: "appearance.typography.fieldLabelSize.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "typography.fieldLabel.sizeMultiplier", validation: { type: "multiplier", min: 0.90, max: 1.20, step: 0.01 }, livePreview: true, reset: "remove-override" },
        { id: "typography.body.size", category: "typography", subgroup: "content", tier: "advanced", controlType: "range-number", labelKey: "appearance.typography.bodySize.label", descriptionKey: "appearance.typography.bodySize.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "typography.body.sizeMultiplier", validation: { type: "multiplier", min: 0.95, max: 1.15, step: 0.01 }, livePreview: true, reset: "remove-override" },
        { id: "typography.supporting.size", category: "typography", subgroup: "content", tier: "advanced", controlType: "range-number", labelKey: "appearance.typography.supportingSize.label", descriptionKey: "appearance.typography.supportingSize.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "typography.supporting.sizeMultiplier", validation: { type: "multiplier", min: 0.90, max: 1.20, step: 0.01 }, livePreview: true, reset: "remove-override" },
        { id: "typography.code.size", category: "typography", subgroup: "code", tier: "advanced", controlType: "range-number", labelKey: "appearance.typography.codeSize.label", descriptionKey: "appearance.typography.codeSize.description", defaultSource: "design", classification: "EXPOSE_NOW", persistence: "appearance", userAdjustable: true, resolverTarget: "typography.code.sizeMultiplier", validation: { type: "multiplier", min: 0.90, max: 1.15, step: 0.01 }, livePreview: true, reset: "remove-override" },

        { id: "interaction.focus.ring", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.focusRing.label", descriptionKey: "appearance.interaction.focusRing.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.focus.ring", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "interaction.focus.border", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.focusBorder.label", descriptionKey: "appearance.interaction.focusBorder.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.focus.border", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "interaction.hover.border", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.hoverBorder.label", descriptionKey: "appearance.interaction.hoverBorder.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.hover.border", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "interaction.hover.surface", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.hoverSurface.label", descriptionKey: "appearance.interaction.hoverSurface.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.hover.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "interaction.selected.surface", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.selectedSurface.label", descriptionKey: "appearance.interaction.selectedSurface.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.selected.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "interaction.selected.foreground", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.selectedForeground.label", descriptionKey: "appearance.interaction.selectedForeground.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.selected.foreground", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "interaction.checked.surface", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.interaction.checkedSurface.label", descriptionKey: "appearance.interaction.checkedSurface.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "interaction.checked.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "action.primary.surface", category: "actions", tier: "advanced-later", controlType: "color", labelKey: "appearance.action.primarySurface.label", descriptionKey: "appearance.action.primarySurface.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "action.primary.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "action.primary.hoverSurface", category: "actions", tier: "advanced-later", controlType: "color", labelKey: "appearance.action.primaryHoverSurface.label", descriptionKey: "appearance.action.primaryHoverSurface.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "action.primary.hoverSurface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" },
        { id: "action.primary.foreground", category: "actions", tier: "internal", controlType: "color", labelKey: "appearance.action.primaryForeground.label", descriptionKey: "appearance.action.primaryForeground.description", defaultSource: "design", classification: "INTERNAL", persistence: "none", userAdjustable: false, resolverTarget: "action.primary.foreground", validation: { type: "hex-color" }, livePreview: false, reset: "none" },
        { id: "selection.indicator.surface", category: "interaction", tier: "advanced-later", controlType: "color", labelKey: "appearance.selection.indicatorSurface.label", descriptionKey: "appearance.selection.indicatorSurface.description", defaultSource: "theme-derived", classification: "ADVANCED_LATER", persistence: "appearance", userAdjustable: true, resolverTarget: "selection.indicator.surface", validation: { type: "hex-color" }, livePreview: true, reset: "remove-override" }
    ];
    var byId = {};
    var i;

    function copy(value) {
        var result = {};
        var key;
        for (key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                result[key] = value[key] && typeof value[key] === "object" ? Object.freeze(value[key]) : value[key];
            }
        }
        return Object.freeze(result);
    }

    for (i = 0; i < definitions.length; i++) {
        definitions[i] = copy(definitions[i]);
        byId[definitions[i].id] = definitions[i];
    }
    definitions = Object.freeze(definitions);
    byId = Object.freeze(byId);

    function isValidColorAlphaValue(value) {
        return !!value && typeof value.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value.color) && typeof value.alpha === "number" && isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1;
    }

    function normalizeColorAlphaValue(value, fallback) {
        var candidate = isValidColorAlphaValue(value) ? value : fallback;
        return isValidColorAlphaValue(candidate) ? { color: candidate.color.toLowerCase(), alpha: Number(candidate.alpha) } : null;
    }

    function validateValue(parameter, value) {
        var rule = parameter && parameter.validation;
        var numberValue;
        var colorAlpha;
        if (!rule) { return { valid: false, value: null }; }
        if (rule.type === "hex-color") {
            return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
                ? { valid: true, value: value.toLowerCase() }
                : { valid: false, value: null };
        }
        if (rule.type === "colorAlpha") {
            colorAlpha = normalizeColorAlphaValue(value, null);
            return colorAlpha ? { valid: true, value: colorAlpha } : { valid: false, value: null };
        }
        if (rule.type === "number") {
            numberValue = Number(value);
            return isFinite(numberValue) && numberValue >= rule.min && numberValue <= rule.max
                ? { valid: true, value: numberValue }
                : { valid: false, value: null };
        }
        if (rule.type === "multiplier") {
            return typeof value === "number" && isFinite(value) && value >= rule.min && value <= rule.max
                ? { valid: true, value: value }
                : { valid: false, value: null };
        }
        return { valid: false, value: null };
    }

    return {
        list: function () { return definitions.slice(0); },
        get: function (id) { return byId[String(id || "")] || null; },
        validate: function (id, value) { return validateValue(byId[String(id || "")], value); },
        isAppearanceOverride: function (id) {
            var parameter = byId[String(id || "")];
            return !!parameter && parameter.persistence === "appearance" && parameter.userAdjustable === true;
        }
    };
}));
