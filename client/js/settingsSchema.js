/*
 * Global Settings Schema
 *
 * This file documents the app-level Settings data model.
 * The production panel uses this schema for the migrated Settings
 * sections. Production storage remains v1 for the 0.3.0 release line;
 * behavior adapters still preserve the BackgroundEngine runtime where required.
 */
(function (global) {
    "use strict";

    var AEToolboxSettingsSchema = {
        id: "globalSettings",
        version: 1,
        storageKey: "AEToolbox.settings.v1",
        legacyStorageKeys: [
            "AEToolbox.background.v1",
            "AEToolbox.backgroundSettingsCollapsed.v1",
            "aeToolbox.language"
        ],
        notes: [
            "Settings is an app-level core panel, not a registry tool.",
            "Migrated Settings fields are rendered from this app-level schema.",
            "AEToolbox.settings.v1 remains the formal production Settings storage key for 0.3.0.",
            "No v2 Settings migration is included in the 0.3.0 release preparation.",
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
                id: "vela",
                titleKey: "settings.sections.vela",
                descriptionKey: "settings.vela.experimentalDescription",
                fields: [
                    {
                        key: "velaProviderEndpoint",
                        type: "text",
                        labelKey: "settings.vela.endpoint",
                        descriptionKey: "settings.vela.endpointDescription",
                        defaultValue: "http://127.0.0.1:1234",
                        maxLength: 512,
                        spellcheck: false
                    },
                    {
                        key: "velaProviderModel",
                        type: "text",
                        labelKey: "settings.vela.model",
                        descriptionKey: "settings.vela.modelDescription",
                        defaultValue: "qwen3.5-4b",
                        maxLength: 256,
                        spellcheck: false
                    }
                ]
            },
            {
                id: "proceduralAppearance",
                titleKey: "settings.sections.proceduralAppearance",
                descriptionKey: "helper.proceduralAppearanceParams",
                developerOnly: true,
                collapsible: true,
                defaultCollapsed: true,
                fields: [
                    { key: "warp", type: "range", labelKey: "label.proceduralParam.warp", descriptionKey: "helper.proceduralParam.warp", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "warpIrregularity", type: "range", labelKey: "label.proceduralParam.warpIrregularity", descriptionKey: "helper.proceduralParam.warpIrregularity", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "flowComplexity", type: "range", labelKey: "label.proceduralParam.flowComplexity", descriptionKey: "helper.proceduralParam.flowComplexity", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "flowContinuity", type: "range", labelKey: "label.proceduralParam.flowContinuity", descriptionKey: "helper.proceduralParam.flowContinuity", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "ribbonWidth", type: "range", labelKey: "label.proceduralParam.ribbonWidth", descriptionKey: "helper.proceduralParam.ribbonWidth", defaultProvider: "proceduralAppearance", min: 0.06, max: 0.22, step: 0.01 },
                    { key: "gradientBias", type: "range", labelKey: "label.proceduralParam.gradientBias", descriptionKey: "helper.proceduralParam.gradientBias", defaultProvider: "proceduralAppearance", min: 0.15, max: 0.75, step: 0.01 },
                    { key: "highlightConcentration", type: "range", labelKey: "label.proceduralParam.highlightConcentration", descriptionKey: "helper.proceduralParam.highlightConcentration", defaultProvider: "proceduralAppearance", min: 0.35, max: 1, step: 0.01 },
                    { key: "highlightArea", type: "range", labelKey: "label.proceduralParam.highlightArea", descriptionKey: "helper.proceduralParam.highlightArea", defaultProvider: "proceduralAppearance", min: 0.04, max: 0.12, step: 0.01 },
                    { key: "secondaryHueInfluence", type: "range", labelKey: "label.proceduralParam.secondaryHueInfluence", descriptionKey: "helper.proceduralParam.secondaryHueInfluence", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "accentPresence", type: "range", labelKey: "label.proceduralParam.accentPresence", descriptionKey: "helper.proceduralParam.accentPresence", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "highlightTintShift", type: "range", labelKey: "label.proceduralParam.highlightTintShift", descriptionKey: "helper.proceduralParam.highlightTintShift", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "contrast", type: "range", labelKey: "label.proceduralParam.contrast", descriptionKey: "helper.proceduralParam.contrast", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "depth", type: "range", labelKey: "label.proceduralParam.depth", descriptionKey: "helper.proceduralParam.depth", defaultProvider: "proceduralAppearance", min: 0, max: 1, step: 0.01 },
                    { key: "saturation", type: "range", labelKey: "label.proceduralParam.saturation", descriptionKey: "helper.proceduralParam.saturation", defaultProvider: "proceduralAppearance", min: 0, max: 1.4, step: 0.01 },
                    { key: "brightness", type: "range", labelKey: "label.proceduralParam.brightness", descriptionKey: "helper.proceduralParam.brightness", defaultProvider: "proceduralAppearance", min: 0.2, max: 1.4, step: 0.01 },
                    { key: "grain", type: "range", labelKey: "label.proceduralParam.grain", descriptionKey: "helper.proceduralParam.grain", defaultProvider: "proceduralAppearance", min: 0, max: 0.5, step: 0.01 },
                    { key: "paletteDarkness", type: "range", labelKey: "label.proceduralParam.paletteDarkness", descriptionKey: "helper.proceduralParam.paletteDarkness", defaultProvider: "proceduralAppearance", min: 0, max: 0.12, step: 0.005 },
                    { key: "paletteMidLift", type: "range", labelKey: "label.proceduralParam.paletteMidLift", descriptionKey: "helper.proceduralParam.paletteMidLift", defaultProvider: "proceduralAppearance", min: 0, max: 0.12, step: 0.005 },
                    { key: "paletteLightLift", type: "range", labelKey: "label.proceduralParam.paletteLightLift", descriptionKey: "helper.proceduralParam.paletteLightLift", defaultProvider: "proceduralAppearance", min: 0, max: 0.12, step: 0.005 },
                    { key: "paletteDarkChroma", type: "range", labelKey: "label.proceduralParam.paletteDarkChroma", descriptionKey: "helper.proceduralParam.paletteDarkChroma", defaultProvider: "proceduralAppearance", min: 0.7, max: 1.1, step: 0.01 },
                    { key: "paletteLightChroma", type: "range", labelKey: "label.proceduralParam.paletteLightChroma", descriptionKey: "helper.proceduralParam.paletteLightChroma", defaultProvider: "proceduralAppearance", min: 0.7, max: 1.1, step: 0.01 },
                    { key: "paletteMapMidpoint", type: "range", labelKey: "label.proceduralParam.paletteMapMidpoint", descriptionKey: "helper.proceduralParam.paletteMapMidpoint", defaultProvider: "proceduralAppearance", min: 0.35, max: 0.65, step: 0.01 },
                    { key: "paletteMapContrast", type: "range", labelKey: "label.proceduralParam.paletteMapContrast", descriptionKey: "helper.proceduralParam.paletteMapContrast", defaultProvider: "proceduralAppearance", min: 0.75, max: 1.25, step: 0.01 },
                    { key: "resetProceduralAppearanceParams", type: "button", labelKey: "button.resetProceduralAppearanceParams" }
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
                        labelKey: "label.homeBaseColor",
                        descriptionKey: "helper.homeBaseColor",
                        defaultValue: "#050403"
                    },
                    {
                        key: "toolIconColor",
                        type: "color",
                        labelKey: "label.toolIconColor",
                        descriptionKey: "helper.toolIconColor",
                        defaultValue: "#15120c",
                        visibleWhen: {
                            any: [
                                { key: "proceduralIconMode", equals: "colorful" },
                                {
                                    all: [
                                        { key: "proceduralIconMode", equals: "themeMapped" },
                                        { key: "toolIconDarkSourceMode", equals: "manualEndpoints" }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        key: "toolIconLine",
                        type: "color",
                        labelKey: "label.toolIconLine",
                        descriptionKey: "helper.toolIconLine",
                        defaultValue: "#fff0be",
                        visibleWhen: {
                            any: [
                                { key: "proceduralIconMode", equals: "colorful" },
                                {
                                    all: [
                                        { key: "proceduralIconMode", equals: "themeMapped" },
                                        { key: "toolIconDarkSourceMode", equals: "manualEndpoints" }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        key: "proceduralIconMode",
                        type: "select",
                        labelKey: "label.proceduralIconMode",
                        descriptionKey: "helper.proceduralIconMode",
                        defaultValue: "colorful",
                        options: [
                            { value: "colorful", labelKey: "settings.proceduralIconMode.colorful" },
                            { value: "themeMapped", labelKey: "settings.proceduralIconMode.themeMapped" }
                        ]
                    },
                    {
                        key: "toolIconDarkSourceMode",
                        type: "select",
                        labelKey: "label.iconDarkSource",
                        descriptionKey: "helper.iconDarkSource",
                        defaultValue: "manualEndpoints",
                        options: [
                            { value: "manualEndpoints", labelKey: "settings.iconDarkSource.manualEndpoints" },
                            { value: "paletteScale", labelKey: "settings.iconDarkSource.paletteScale" }
                        ],
                        visibleWhen: { key: "proceduralIconMode", equals: "themeMapped" }
                    },
                    {
                        key: "toolIconDarkPaletteId",
                        type: "select",
                        labelKey: "label.sourcePalette",
                        descriptionKey: "helper.sourcePalette",
                        defaultValue: "",
                        optionsProvider: "proceduralPalettes",
                        visibleWhen: {
                            all: [
                                { key: "proceduralIconMode", equals: "themeMapped" },
                                { key: "toolIconDarkSourceMode", equals: "paletteScale" }
                            ]
                        }
                    }
                ],
                groups: [
                    {
                        id: "interfaceAppearance",
                        titleKey: "settings.theme.interfaceAppearance",
                        fields: ["themeAccent", "homeBackground"]
                    },
                    {
                        id: "toolIconAppearance",
                        titleKey: "settings.theme.toolIconAppearance",
                        fields: ["proceduralIconMode"],
                        presentations: [
                            {
                                type: "note",
                                key: "proceduralIconModeColorfulNote",
                                textKey: "helper.proceduralIconModeColorful",
                                visibleWhen: { key: "proceduralIconMode", equals: "colorful" }
                            },
                            {
                                type: "note",
                                key: "proceduralIconModeThemeNote",
                                textKey: "helper.proceduralIconModeThemeMapped",
                                visibleWhen: { key: "proceduralIconMode", equals: "themeMapped" }
                            },
                            {
                                type: "paletteSummary",
                                key: "proceduralPaletteSummary",
                                actionKey: "settings.palette.manage",
                                visibleWhen: { key: "proceduralIconMode", equals: "colorful" }
                            }
                        ]
                    },
                    {
                        id: "iconColors",
                        titleKey: "settings.theme.iconColors",
                        collapsible: true,
                        defaultCollapsed: true,
                        openWhen: { key: "proceduralIconMode", equals: "themeMapped" },
                        fields: ["toolIconDarkSourceMode", "toolIconDarkPaletteId", "toolIconColor", "toolIconLine"],
                        presentations: [
                            { type: "colorRampPreview", key: "proceduralIconColorRamp", visibleWhen: { key: "proceduralIconMode", equals: "themeMapped" } },
                            { type: "note", key: "proceduralFallbackNote", textKey: "helper.fallbackIconColors", visibleWhen: { key: "proceduralIconMode", equals: "colorful" } },
                            { type: "note", key: "proceduralIconSourceNote", textKey: "helper.proceduralIconSource", visibleWhen: { key: "proceduralIconMode", equals: "themeMapped" } },
                            { type: "paletteSummary", key: "proceduralIconSourcePalettes", actionKey: "settings.palette.manageSource", visibleWhen: { key: "proceduralIconMode", equals: "themeMapped" } }
                        ]
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
                        key: "backgroundSource",
                        type: "select",
                        labelKey: "label.backgroundSource",
                        descriptionKey: "helper.backgroundSource",
                        defaultValue: "followIconTheme",
                        options: [
                            { value: "classic", labelKey: "settings.backgroundSource.classic" },
                            { value: "followIconTheme", labelKey: "settings.backgroundSource.followIconTheme" },
                            { value: "procedural", labelKey: "settings.backgroundSource.procedural" }
                        ]
                    },
                    {
                        key: "proceduralBackgroundSeed",
                        type: "text",
                        labelKey: "label.proceduralBackgroundSeed",
                        descriptionKey: "helper.proceduralBackgroundSeed",
                        defaultValue: "background-demo-01"
                    },
                    {
                        key: "proceduralBackgroundPaletteId",
                        type: "select",
                        labelKey: "label.proceduralBackgroundPalette",
                        descriptionKey: "helper.proceduralBackgroundPalette",
                        defaultValue: "algorithmDefault",
                        optionsProvider: "proceduralBackgroundPalettes"
                    },
                    {
                        key: "proceduralBackgroundIntensity",
                        type: "range",
                        labelKey: "label.proceduralBackgroundIntensity",
                        descriptionKey: "helper.proceduralBackgroundIntensity",
                        defaultValue: 0.28,
                        min: 0.05,
                        max: 0.7,
                        step: 0.01
                    },
                    {
                        key: "proceduralBackgroundRegenerate",
                        type: "button",
                        labelKey: "button.regenerateBackgroundSeed"
                    },
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
