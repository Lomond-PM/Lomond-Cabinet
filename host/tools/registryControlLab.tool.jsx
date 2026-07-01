(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.registryControlLab = AEToolbox.tools.registryControlLab || {};

    AEToolbox.tools.registryControlLab.previewValues = function (paramsJson) {
        var params = {};

        try {
            params = AEToolbox.parseJson(paramsJson || "{}");
        } catch (err) {
            params = {};
        }

        return AEToolbox.stringify({
            ok: true,
            messageKey: "tools.registryControlLab.status.previewed",
            received: params
        });
    };

    AEToolbox.registerTool({
        id: "registryControlLab",
        titleKey: "tools.registryControlLab.title",
        descriptionKey: "tools.registryControlLab.description",
        category: "debug",
        iconText: "C",
        sections: [
            {
                id: "basic",
                labelKey: "tools.registryControlLab.sections.basic",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.registryControlLab.notes.basic"
                    },
                    {
                        type: "text",
                        key: "textValue",
                        labelKey: "tools.registryControlLab.fields.textValue",
                        defaultValue: "Sample text"
                    },
                    {
                        type: "textarea",
                        key: "noteValue",
                        labelKey: "tools.registryControlLab.fields.noteValue",
                        defaultValue: "Multiline note"
                    },
                    {
                        type: "divider"
                    },
                    {
                        type: "number",
                        key: "numberValue",
                        labelKey: "tools.registryControlLab.fields.numberValue",
                        defaultValue: 12,
                        min: 0,
                        max: 100,
                        step: 1
                    },
                    {
                        type: "range",
                        key: "rangeValue",
                        labelKey: "tools.registryControlLab.fields.rangeValue",
                        defaultValue: 42,
                        min: 0,
                        max: 100,
                        step: 1
                    }
                ]
            },
            {
                id: "options",
                labelKey: "tools.registryControlLab.sections.options",
                fields: [
                    {
                        type: "checkbox",
                        key: "enabled",
                        labelKey: "tools.registryControlLab.fields.enabled",
                        defaultValue: true
                    },
                    {
                        type: "select",
                        key: "mode",
                        labelKey: "tools.registryControlLab.fields.mode",
                        defaultValue: "solid",
                        options: [
                            {
                                value: "none",
                                labelKey: "common.none"
                            },
                            {
                                value: "solid",
                                labelKey: "common.solid"
                            },
                            {
                                value: "gradient",
                                labelKey: "common.gradient"
                            }
                        ]
                    }
                ]
            },
            {
                id: "colors",
                labelKey: "tools.registryControlLab.sections.colors",
                fields: [
                    {
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.registryControlLab.fields.fillColor",
                        defaultValue: "#c9a452"
                    },
                    {
                        type: "color",
                        key: "strokeColor",
                        labelKey: "tools.registryControlLab.fields.strokeColor",
                        defaultValue: "#ffffff"
                    }
                ]
            }
        ],
        actions: [
            {
                id: "previewValues",
                labelKey: "tools.registryControlLab.actions.previewValues",
                hostFunction: "AEToolbox.tools.registryControlLab.previewValues",
                style: "primary"
            }
        ],
        i18n: {
            en: {
                "tools.registryControlLab.title": "Registry Control Lab",
                "tools.registryControlLab.description": "Test the shared registry renderer with every standard control type.",
                "tools.registryControlLab.sections.basic": "Basic Controls",
                "tools.registryControlLab.sections.colors": "Colors",
                "tools.registryControlLab.sections.options": "Options",
                "tools.registryControlLab.fields.textValue": "Text",
                "tools.registryControlLab.fields.noteValue": "Note",
                "tools.registryControlLab.fields.numberValue": "Number",
                "tools.registryControlLab.fields.rangeValue": "Range",
                "tools.registryControlLab.fields.enabled": "Enabled",
                "tools.registryControlLab.fields.mode": "Mode",
                "tools.registryControlLab.fields.fillColor": "Fill Color",
                "tools.registryControlLab.fields.strokeColor": "Stroke Color",
                "tools.registryControlLab.actions.previewValues": "Preview Values",
                "tools.registryControlLab.status.previewed": "Received registry control values.",
                "tools.registryControlLab.notes.basic": "This lab validates shared controls only. It does not modify After Effects layers."
            },
            "zh-CN": {
                "tools.registryControlLab.title": "\u63a7\u4ef6\u6d4b\u8bd5\u5b9e\u9a8c\u5ba4",
                "tools.registryControlLab.description": "\u7528\u4e8e\u9a8c\u8bc1\u5171\u7528 registry renderer \u7684\u6240\u6709\u6807\u51c6\u63a7\u4ef6\u7c7b\u578b\u3002",
                "tools.registryControlLab.sections.basic": "\u57fa\u7840\u63a7\u4ef6",
                "tools.registryControlLab.sections.colors": "\u989c\u8272",
                "tools.registryControlLab.sections.options": "\u9009\u9879",
                "tools.registryControlLab.fields.textValue": "\u6587\u672c",
                "tools.registryControlLab.fields.noteValue": "\u5907\u6ce8",
                "tools.registryControlLab.fields.numberValue": "\u6570\u503c",
                "tools.registryControlLab.fields.rangeValue": "\u6ed1\u6746",
                "tools.registryControlLab.fields.enabled": "\u542f\u7528",
                "tools.registryControlLab.fields.mode": "\u6a21\u5f0f",
                "tools.registryControlLab.fields.fillColor": "\u586b\u5145\u989c\u8272",
                "tools.registryControlLab.fields.strokeColor": "\u63cf\u8fb9\u989c\u8272",
                "tools.registryControlLab.actions.previewValues": "\u9884\u89c8\u53c2\u6570",
                "tools.registryControlLab.status.previewed": "\u5df2\u63a5\u6536 registry \u63a7\u4ef6\u53c2\u6570\u3002",
                "tools.registryControlLab.notes.basic": "\u8be5\u5b9e\u9a8c\u5ba4\u53ea\u9a8c\u8bc1\u5171\u7528\u63a7\u4ef6\uff0c\u4e0d\u4fee\u6539 After Effects \u56fe\u5c42\u3002"
            }
        }
    });
})();
