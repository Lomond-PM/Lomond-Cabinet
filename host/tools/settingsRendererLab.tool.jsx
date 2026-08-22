(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.settingsRendererLab = AEToolbox.tools.settingsRendererLab || {};

    AEToolbox.tools.settingsRendererLab.preview = function (paramsJson) {
        var params = {};
        try {
            params = AEToolbox.parseJson(paramsJson || "{}");
        } catch (err) {
            params = {};
        }
        return AEToolbox.stringify({
            ok: true,
            messageKey: "tools.settingsRendererLab.status.previewed",
            received: params
        });
    };

    AEToolbox.tools.settingsRendererLab.resetSandbox = function (paramsJson) {
        var params = {};
        try {
            params = AEToolbox.parseJson(paramsJson || "{}");
        } catch (err) {
            params = {};
        }
        return AEToolbox.stringify({
            ok: true,
            messageKey: "tools.settingsRendererLab.status.resetRequested",
            received: params
        });
    };

    AEToolbox.registerTool({
        id: "settingsRendererLab",
        titleKey: "tools.settingsRendererLab.title",
        descriptionKey: "tools.settingsRendererLab.description",
        category: "debug",
        iconText: "S",
        developerOnly: true,
        storageKey: "AEToolbox.settingsLab.v1",
        sections: [
            {
                id: "general",
                labelKey: "tools.settingsRendererLab.sections.general",
                descriptionKey: "tools.settingsRendererLab.sections.generalDescription",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.settingsRendererLab.notes.sandbox"
                    },
                    {
                        type: "select",
                        key: "language",
                        labelKey: "common.language",
                        hintKey: "tools.settingsRendererLab.hints.portalSelect",
                        defaultValue: "en",
                        options: [
                            { value: "en", labelKey: "settings.language.en" },
                            { value: "zh-CN", labelKey: "settings.language.zhCN" }
                        ]
                    },
                    {
                        type: "switch",
                        key: "registryDebugTools",
                        labelKey: "label.registryDebugTools",
                        hintKey: "helper.registryDebugTools",
                        defaultValue: true
                    }
                ]
            },
            {
                id: "motion",
                labelKey: "section.motion",
                descriptionKey: "tools.settingsRendererLab.sections.motionDescription",
                collapsible: true,
                fields: [
                    {
                        type: "range",
                        key: "motionSpeed",
                        labelKey: "label.motionSpeed",
                        hintKey: "helper.motionSpeed",
                        defaultValue: 1,
                        min: 0.75,
                        max: 1.35,
                        step: 0.05
                    },
                    {
                        type: "range",
                        key: "uiScale",
                        labelKey: "label.uiScale",
                        hintKey: "helper.uiScale",
                        defaultValue: 0.92,
                        min: 0.62,
                        max: 1.18,
                        step: 0.02
                    },
                    {
                        type: "number",
                        key: "testNumber",
                        labelKey: "tools.settingsRendererLab.fields.testNumber",
                        hintKey: "tools.settingsRendererLab.hints.testNumber",
                        defaultValue: 24,
                        min: 0,
                        max: 100,
                        step: 1
                    }
                ]
            },
            {
                id: "theme",
                labelKey: "section.theme",
                descriptionKey: "tools.settingsRendererLab.sections.themeDescription",
                fields: [
                    {
                        type: "color",
                        key: "themeAccent",
                        labelKey: "label.accentColor",
                        hintKey: "helper.accentColor",
                        defaultValue: "#d6b25e"
                    },
                    {
                        type: "color",
                        key: "homeBackground",
                        labelKey: "label.homeBaseColor",
                        hintKey: "helper.homeBaseColor",
                        defaultValue: "#050403"
                    }
                ]
            },
            {
                id: "backgroundEngine",
                labelKey: "section.backgroundEngine",
                descriptionKey: "tools.settingsRendererLab.sections.backgroundDescription",
                toggleKey: "enableBackgroundLab",
                defaultEnabled: true,
                collapsible: true,
                fields: [
                    {
                        type: "select",
                        key: "preset",
                        labelKey: "label.preset",
                        hintKey: "tools.settingsRendererLab.hints.backgroundPreset",
                        defaultValue: "blackGold",
                        options: [
                            { value: "custom", labelKey: "settings.backgroundPreset.custom" },
                            { value: "blackGold", labelKey: "settings.backgroundPreset.blackGold" },
                            { value: "solarGrid", labelKey: "settings.backgroundPreset.solarGrid" },
                            { value: "obsidianRings", labelKey: "settings.backgroundPreset.obsidianRings" },
                            { value: "midnightBlueprint", labelKey: "settings.backgroundPreset.midnightBlueprint" },
                            { value: "minimalDark", labelKey: "settings.backgroundPreset.minimalDark" }
                        ]
                    },
                    {
                        type: "range",
                        key: "glowOpacity",
                        labelKey: "label.glowIntensity",
                        defaultValue: 0.22,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "gridSize",
                        labelKey: "label.gridSize",
                        defaultValue: 36,
                        min: 16,
                        max: 80,
                        step: 1
                    },
                    {
                        type: "switch",
                        key: "motionEnable",
                        labelKey: "label.enableMotion",
                        hintKey: "helper.enableMotion",
                        defaultValue: false
                    }
                ]
            },
            {
                id: "actions",
                labelKey: "tools.settingsRendererLab.sections.actions",
                descriptionKey: "tools.settingsRendererLab.sections.actionsDescription",
                fields: [
                    {
                        type: "button",
                        key: "previewButton",
                        labelKey: "tools.settingsRendererLab.actions.preview",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "preview"
                    },
                    {
                        type: "button",
                        key: "resetSandboxButton",
                        labelKey: "tools.settingsRendererLab.actions.resetSandbox",
                        variant: "secondary",
                        fullWidth: true,
                        clientAction: "resetFields",
                        resetKeys: [
                            "language",
                            "registryDebugTools",
                            "motionSpeed",
                            "uiScale",
                            "testNumber",
                            "themeAccent",
                            "homeBackground",
                            "preset",
                            "glowOpacity",
                            "gridSize",
                            "motionEnable"
                        ]
                    }
                ]
            }
        ],
        actions: [
            {
                id: "preview",
                labelKey: "tools.settingsRendererLab.actions.preview",
                hostFunction: "AEToolbox.tools.settingsRendererLab.preview",
                style: "primary",
                pendingMessageKey: "tools.settingsRendererLab.status.previewPending",
                successMessageKey: "tools.settingsRendererLab.status.previewed",
                errorMessageKey: "tools.settingsRendererLab.status.previewFailed"
            },
            {
                id: "resetSandbox",
                labelKey: "tools.settingsRendererLab.actions.resetSandbox",
                hostFunction: "AEToolbox.tools.settingsRendererLab.resetSandbox",
                hidden: true,
                fieldOnly: true
            }
        ],
        i18n: {
            en: {
                "tools.settingsRendererLab.title": "Settings Renderer Lab",
                "tools.settingsRendererLab.description": "Developer-only sandbox for testing the future app-level Settings schema renderer.",
                "tools.settingsRendererLab.sections.general": "General",
                "tools.settingsRendererLab.sections.generalDescription": "Language, Developer Mode, and sandbox-only state.",
                "tools.settingsRendererLab.sections.motionDescription": "Range, number, and collapse behavior for global motion-style settings.",
                "tools.settingsRendererLab.sections.themeDescription": "Color controls using the shared registry color picker.",
                "tools.settingsRendererLab.sections.backgroundDescription": "Sandbox Background Engine controls. This does not affect the real BackgroundEngine.",
                "tools.settingsRendererLab.sections.actions": "Sandbox Actions",
                "tools.settingsRendererLab.sections.actionsDescription": "Buttons operate only on lab values and do not write production Settings keys.",
                "tools.settingsRendererLab.fields.testNumber": "Number Test",
                "tools.settingsRendererLab.actions.preview": "Preview Lab Values",
                "tools.settingsRendererLab.actions.resetSandbox": "Reset Sandbox Values",
                "tools.settingsRendererLab.status.previewPending": "Reading Settings Lab values...",
                "tools.settingsRendererLab.status.previewed": "Settings Lab values received.",
                "tools.settingsRendererLab.status.previewFailed": "Settings Lab preview failed.",
                "tools.settingsRendererLab.status.resetRequested": "Settings Lab sandbox reset requested.",
                "tools.settingsRendererLab.notes.sandbox": "This lab uses AEToolbox.settingsLab.v1 and does not modify production Settings.",
                "tools.settingsRendererLab.hints.portalSelect": "Open and close this select repeatedly to test portal select lifecycle.",
                "tools.settingsRendererLab.hints.testNumber": "Tests number input drag, typing, and persistence.",
                "tools.settingsRendererLab.hints.backgroundPreset": "This tests the preset select UI without touching the real Background Engine.",
                "settings.language.en": "English",
                "settings.language.zhCN": "Simplified Chinese",
                "settings.backgroundPreset.custom": "Custom",
                "settings.backgroundPreset.blackGold": "Black Gold Default",
                "settings.backgroundPreset.solarGrid": "Solar Grid",
                "settings.backgroundPreset.obsidianRings": "Obsidian Rings",
                "settings.backgroundPreset.midnightBlueprint": "Midnight Blueprint",
                "settings.backgroundPreset.minimalDark": "Minimal Dark"
            },
            "zh-CN": {
                "tools.settingsRendererLab.title": "\u8bbe\u7f6e\u6e32\u67d3\u5b9e\u9a8c\u5ba4",
                "tools.settingsRendererLab.description": "\u4ec5\u7528\u4e8e\u5f00\u53d1\u8005\u6a21\u5f0f\uff0c\u6d4b\u8bd5\u672a\u6765\u5168\u5c40\u8bbe\u7f6e schema renderer\u3002",
                "tools.settingsRendererLab.sections.general": "\u901a\u7528",
                "tools.settingsRendererLab.sections.generalDescription": "\u8bed\u8a00\u3001\u5f00\u53d1\u8005\u6a21\u5f0f\u548c\u4ec5\u9650 sandbox \u7684\u72b6\u6001\u3002",
                "tools.settingsRendererLab.sections.motionDescription": "\u6d4b\u8bd5\u5168\u5c40\u52a8\u6548\u7c7b\u8bbe\u7f6e\u7684\u6ed1\u6746\u3001\u6570\u503c\u548c\u6298\u53e0\u884c\u4e3a\u3002",
                "tools.settingsRendererLab.sections.themeDescription": "\u4f7f\u7528\u5171\u7528 registry \u53d6\u8272\u5668\u6d4b\u8bd5\u989c\u8272\u63a7\u4ef6\u3002",
                "tools.settingsRendererLab.sections.backgroundDescription": "Sandbox \u80cc\u666f\u5f15\u64ce\u63a7\u4ef6\uff0c\u4e0d\u5f71\u54cd\u771f\u5b9e BackgroundEngine\u3002",
                "tools.settingsRendererLab.sections.actions": "Sandbox \u64cd\u4f5c",
                "tools.settingsRendererLab.sections.actionsDescription": "\u6309\u94ae\u53ea\u64cd\u4f5c\u5b9e\u9a8c\u5ba4\u53c2\u6570\uff0c\u4e0d\u5199\u5165\u6b63\u5f0f Settings key\u3002",
                "tools.settingsRendererLab.fields.testNumber": "\u6570\u503c\u6d4b\u8bd5",
                "tools.settingsRendererLab.actions.preview": "\u9884\u89c8\u5b9e\u9a8c\u5ba4\u53c2\u6570",
                "tools.settingsRendererLab.actions.resetSandbox": "\u91cd\u7f6e Sandbox \u53c2\u6570",
                "tools.settingsRendererLab.status.previewPending": "\u6b63\u5728\u8bfb\u53d6 Settings Lab \u53c2\u6570...",
                "tools.settingsRendererLab.status.previewed": "Settings Lab \u53c2\u6570\u5df2\u63a5\u6536\u3002",
                "tools.settingsRendererLab.status.previewFailed": "Settings Lab \u9884\u89c8\u5931\u8d25\u3002",
                "tools.settingsRendererLab.status.resetRequested": "Settings Lab sandbox \u5df2\u8bf7\u6c42\u91cd\u7f6e\u3002",
                "tools.settingsRendererLab.notes.sandbox": "\u6b64\u5b9e\u9a8c\u5ba4\u4f7f\u7528 AEToolbox.settingsLab.v1\uff0c\u4e0d\u4fee\u6539\u6b63\u5f0f Settings\u3002",
                "tools.settingsRendererLab.hints.portalSelect": "\u53cd\u590d\u6253\u5f00\u548c\u5173\u95ed\u8be5\u4e0b\u62c9\u83dc\u5355\uff0c\u7528\u4e8e\u6d4b\u8bd5 portal select \u751f\u547d\u5468\u671f\u3002",
                "tools.settingsRendererLab.hints.testNumber": "\u6d4b\u8bd5\u6570\u503c\u8f93\u5165\u7684\u62d6\u52a8\u3001\u952e\u5165\u548c\u6301\u4e45\u5316\u3002",
                "tools.settingsRendererLab.hints.backgroundPreset": "\u8be5\u9879\u53ea\u6d4b\u8bd5\u9884\u8bbe\u4e0b\u62c9 UI\uff0c\u4e0d\u4f1a\u4fee\u6539\u771f\u5b9e\u80cc\u666f\u5f15\u64ce\u3002",
                "settings.language.en": "English",
                "settings.language.zhCN": "\u7b80\u4f53\u4e2d\u6587",
                "settings.backgroundPreset.custom": "\u81ea\u5b9a\u4e49",
                "settings.backgroundPreset.blackGold": "\u9ed1\u91d1\u9ed8\u8ba4",
                "settings.backgroundPreset.solarGrid": "\u592a\u9633\u7f51\u683c",
                "settings.backgroundPreset.obsidianRings": "\u9ed1\u66dc\u77f3\u5706\u73af",
                "settings.backgroundPreset.midnightBlueprint": "\u6df1\u591c\u84dd\u56fe",
                "settings.backgroundPreset.minimalDark": "\u6781\u7b80\u6df1\u8272"
            }
        }
    });
}());
