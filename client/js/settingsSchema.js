/*
 * Global Settings Schema
 *
 * This file documents the future app-level Settings data model.
 * The production panel now uses this schema for the migrated Settings
 * sections. Behavior adapters still preserve legacy storage and the
 * BackgroundEngine runtime where required.
 */
(function (global) {
    "use strict";

    var AEToolboxSettingsSchema = {
        id: "globalSettings",
        version: 1,
        storageKey: "AEToolbox.settings.v2",
        legacyStorageKeys: [
            "AEToolbox.settings.v1",
            "AEToolbox.background.v1",
            "AEToolbox.backgroundSettingsCollapsed.v1",
            "aeToolbox.language"
        ],
        notes: [
            "Settings is an app-level core panel, not a registry tool.",
            "Migrated Settings fields are rendered from this app-level schema.",
            "Behavior adapters preserve legacy storage keys where required.",
            "Developer Mode is a core setting for debug/probe/lab registry tool visibility.",
            "Background Engine UI is schema-rendered; BackgroundEngine behavior remains the runtime authority."
        ],
        sections: [
            {
                id: "general",
                titleKey: "settings.sections.general",
                fields: [
                    {
                        key: "language",
                        type: "select",
                        labelKey: "common.language",
                        defaultValue: "en",
                        storageSource: "aeToolbox.language",
                        options: [
                            { value: "en", labelKey: "settings.language.en" },
                            { value: "zh-CN", labelKey: "settings.language.zhCN" }
                        ]
                    },
                    {
                        key: "registryDebugTools",
                        type: "switch",
                        labelKey: "label.registryDebugTools",
                        descriptionKey: "helper.registryDebugTools",
                        defaultValue: false,
                        rules: [
                            "Controls debug/probe/lab registry tool visibility.",
                            "Must not be implemented as a shapeAddProbe-specific condition.",
                            "Disabling Developer Mode must not corrupt saved Home tool order."
                        ]
                    },
                    {
                        key: "homeIconRadius",
                        type: "range",
                        labelKey: "label.homeIconRadius",
                        descriptionKey: "helper.homeIconRadius",
                        defaultValue: 25.5,
                        min: 18,
                        max: 40,
                        step: 0.5,
                        developerOnly: true,
                        rules: [
                            "Controls the shared proportional radius token for Home procedural tool icons.",
                            "Visible only when Developer Mode is enabled.",
                            "Default preserves the current Home icon geometry."
                        ]
                    },
                    {
                        key: "homeDragShadowIntensity",
                        type: "range",
                        labelKey: "label.homeDragShadowIntensity",
                        descriptionKey: "helper.homeDragShadowIntensity",
                        defaultValue: 1,
                        min: 0,
                        max: 1.5,
                        step: 0.05,
                        developerOnly: true,
                        rules: [
                            "Controls the Home edit drag shadow intensity.",
                            "Visible only when Developer Mode is enabled.",
                            "Default preserves the current drag shadow."
                        ]
                    }
                ]
            },
            {
                id: "motion",
                titleKey: "section.motion",
                fields: [
                    {
                        key: "motionSpeed",
                        type: "range",
                        labelKey: "label.motionSpeed",
                        descriptionKey: "helper.motionSpeed",
                        defaultValue: 1,
                        min: 0.75,
                        max: 1.35,
                        step: 0.05
                    },
                    {
                        key: "uiScale",
                        type: "range",
                        labelKey: "label.uiScale",
                        descriptionKey: "helper.uiScale",
                        defaultValue: 0.92,
                        min: 0.62,
                        max: 1.18,
                        step: 0.02
                    }
                ]
            },
            {
                id: "theme",
                titleKey: "section.theme",
                fields: [
                    {
                        key: "themeAccent",
                        type: "color",
                        labelKey: "label.accentColor",
                        descriptionKey: "helper.accentColor",
                        defaultValue: "#d6b25e"
                    },
                    {
                        key: "homeBackground",
                        type: "color",
                        labelKey: "label.homeBackground",
                        descriptionKey: "helper.homeBackground",
                        defaultValue: "#050403"
                    },
                    {
                        key: "toolIconColor",
                        type: "color",
                        labelKey: "label.toolIconColor",
                        descriptionKey: "helper.toolIconColor",
                        defaultValue: "#15120c"
                    },
                    {
                        key: "toolIconLine",
                        type: "color",
                        labelKey: "label.toolIconLine",
                        descriptionKey: "helper.toolIconLine",
                        defaultValue: "#fff0be"
                    }
                ]
            },
            {
                id: "backgroundEngine",
                titleKey: "section.backgroundEngine",
                collapsible: true,
                legacyBehavior: "BackgroundEngine",
                migrationRisk: [
                    "BackgroundEngine.applyPreset remains the behavior layer",
                    "BackgroundEngine.save remains the behavior layer",
                    "BackgroundEngine.syncControls remains the behavior layer"
                ],
                fields: [
                    {
                        key: "preset",
                        type: "select",
                        labelKey: "label.preset",
                        descriptionKey: "helper.preset",
                        defaultValue: "blackGold",
                        capabilityRequired: "stablePortalSelect",
                        options: [
                            { value: "custom", labelKey: "settings.backgroundPreset.custom" },
                            { value: "blackGold", labelKey: "settings.backgroundPreset.blackGold" },
                            { value: "solarGrid", labelKey: "settings.backgroundPreset.solarGrid" },
                            { value: "obsidianRings", labelKey: "settings.backgroundPreset.obsidianRings" },
                            { value: "midnightBlueprint", labelKey: "settings.backgroundPreset.midnightBlueprint" },
                            { value: "minimalDark", labelKey: "settings.backgroundPreset.minimalDark" }
                        ]
                    },
                    { key: "baseColor", type: "color", labelKey: "label.background", defaultValue: "#050403" },
                    { key: "secondaryColor", type: "color", labelKey: "label.secondary", defaultValue: "#11100c" },
                    { key: "accentColor", type: "color", labelKey: "label.accent", defaultValue: "#c9a452" },
                    { key: "accent2Color", type: "color", labelKey: "label.accent2", defaultValue: "#f3d37a" },
                    { key: "lineColor", type: "color", labelKey: "label.line", defaultValue: "#d6b25e" },
                    { key: "glowColor", type: "color", labelKey: "label.glow", defaultValue: "#c9a452" },
                    { key: "glowOpacity", type: "range", labelKey: "label.glowIntensity", defaultValue: 0.22, min: 0, max: 1, step: 0.01 },
                    { key: "glowSize", type: "range", labelKey: "label.glowSize", defaultValue: 80, min: 20, max: 140, step: 1 },
                    { key: "glowX", type: "range", labelKey: "label.glowX", defaultValue: 74, min: 0, max: 100, step: 1 },
                    { key: "glowY", type: "range", labelKey: "label.glowY", defaultValue: 18, min: 0, max: 100, step: 1 },
                    { key: "gridOpacity", type: "range", labelKey: "label.gridOpacity", defaultValue: 0.12, min: 0, max: 1, step: 0.01 },
                    { key: "gridSize", type: "range", labelKey: "label.gridSize", defaultValue: 36, min: 12, max: 96, step: 1 },
                    { key: "lineOpacity", type: "range", labelKey: "label.lineOpacity", defaultValue: 0.18, min: 0, max: 1, step: 0.01 },
                    { key: "ringOpacity", type: "range", labelKey: "label.ringOpacity", defaultValue: 0.1, min: 0, max: 1, step: 0.01 },
                    { key: "ringScale", type: "range", labelKey: "label.ringScale", defaultValue: 1, min: 0.5, max: 2.5, step: 0.05 },
                    { key: "accentAngle", type: "range", labelKey: "label.accentAngle", defaultValue: 135, min: 0, max: 360, step: 1 },
                    { key: "patternDensity", type: "range", labelKey: "label.patternDensity", defaultValue: 1, min: 0.4, max: 2, step: 0.05 },
                    { key: "contrast", type: "range", labelKey: "label.contrast", defaultValue: 0.45, min: 0, max: 1, step: 0.01 },
                    { key: "motionEnable", type: "switch", labelKey: "label.enableMotion", descriptionKey: "helper.enableMotion", defaultValue: false },
                    { key: "motionSpeed", type: "range", labelKey: "label.motionSpeed", defaultValue: 1, min: 0.5, max: 2, step: 0.05 },
                    { key: "motionAmount", type: "range", labelKey: "label.motionAmount", defaultValue: 0.35, min: 0, max: 1, step: 0.01 },
                    {
                        key: "randomize",
                        type: "button",
                        labelKey: "button.randomize",
                        capabilityRequired: "legacyBackgroundEngineAction"
                    },
                    {
                        key: "reset",
                        type: "button",
                        labelKey: "button.resetDefaults",
                        capabilityRequired: "legacyBackgroundEngineAction"
                    }
                ]
            }
        ]
    };

    function eachSchemaField(schema, callback) {
        var sections = schema && schema.sections ? schema.sections : [];
        var i;
        var j;
        var fields;
        for (i = 0; i < sections.length; i += 1) {
            fields = sections[i].fields || [];
            for (j = 0; j < fields.length; j += 1) {
                callback(fields[j], sections[i]);
            }
        }
    }

    function getDefaultSettingsFromSchema(schema) {
        var defaults = {};
        eachSchemaField(schema, function (field) {
            if (field && field.key && Object.prototype.hasOwnProperty.call(field, "defaultValue")) {
                defaults[field.key] = field.defaultValue;
            }
        });
        return defaults;
    }

    function mergeSettingsDefaults(defaults, saved) {
        var merged = {};
        var key;
        defaults = defaults || {};
        saved = saved || {};
        for (key in defaults) {
            if (Object.prototype.hasOwnProperty.call(defaults, key)) {
                merged[key] = Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : defaults[key];
            }
        }
        return merged;
    }

    function normalizeSettingsValue(field, value) {
        var numberValue;
        if (!field) {
            return value;
        }
        if (field.type === "number" || field.type === "range") {
            numberValue = parseFloat(value);
            if (isNaN(numberValue)) {
                numberValue = parseFloat(field.defaultValue);
            }
            if (typeof field.min === "number" && numberValue < field.min) {
                numberValue = field.min;
            }
            if (typeof field.max === "number" && numberValue > field.max) {
                numberValue = field.max;
            }
            return numberValue;
        }
        if (field.type === "checkbox" || field.type === "switch") {
            return value === true;
        }
        return value;
    }

    function migrateLegacySettingsDraft() {
        return {
            applied: false,
            reason: "Draft only. Legacy storage keys are documented but not migrated in runtime."
        };
    }

    function saveSettingsDraft(values) {
        return {
            applied: false,
            reason: "Draft only. Runtime saving still uses legacy Settings storage.",
            values: values || {}
        };
    }

    global.AEToolboxSettingsSchema = AEToolboxSettingsSchema;
    global.AEToolboxSettingsSchemaDraft = {
        getDefaultSettingsFromSchema: getDefaultSettingsFromSchema,
        mergeSettingsDefaults: mergeSettingsDefaults,
        normalizeSettingsValue: normalizeSettingsValue,
        migrateLegacySettingsDraft: migrateLegacySettingsDraft,
        saveSettingsDraft: saveSettingsDraft
    };
}(this));
