(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.textBackgroundBox = AEToolbox.tools.textBackgroundBox || {};

    AEToolbox.registerTool({
        id: "textBackgroundBox",
        titleKey: "tools.textBackgroundBox.title",
        descriptionKey: "tools.textBackgroundBox.description",
        category: "shape",
        iconText: "R",
        sections: [
            {
                id: "geometry",
                labelKey: "tools.textBackgroundBox.sections.geometry",
                descriptionKey: "tools.textBackgroundBox.sections.geometryDescription",
                fields: [
                    {
                        type: "number",
                        key: "paddingX",
                        labelKey: "tools.textBackgroundBox.fields.paddingX",
                        defaultValue: 40,
                        min: 0,
                        step: 1
                    },
                    {
                        type: "number",
                        key: "paddingY",
                        labelKey: "tools.textBackgroundBox.fields.paddingY",
                        defaultValue: 20,
                        min: 0,
                        step: 1
                    },
                    {
                        type: "number",
                        key: "cornerRadius",
                        labelKey: "tools.textBackgroundBox.fields.cornerRadius",
                        defaultValue: 20,
                        min: 0,
                        step: 1
                    }
                ]
            },
            {
                id: "fill",
                labelKey: "tools.textBackgroundBox.sections.fill",
                descriptionKey: "tools.textBackgroundBox.sections.fillDescription",
                toggleKey: "enableFill",
                defaultEnabled: true,
                collapsible: true,
                fields: [
                    {
                        type: "select",
                        key: "fillMode",
                        labelKey: "tools.textBackgroundBox.fields.fillMode",
                        defaultValue: "Solid Fill",
                        options: [
                            {
                                value: "Solid Fill",
                                labelKey: "tools.textBackgroundBox.options.solidFill"
                            },
                            {
                                value: "Gradient Fill",
                                labelKey: "tools.textBackgroundBox.options.gradientFill"
                            }
                        ]
                    },
                    {
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.textBackgroundBox.fields.fillColor",
                        defaultValue: "#202020"
                    },
                    {
                        type: "number",
                        key: "fillOpacity",
                        labelKey: "tools.textBackgroundBox.fields.fillOpacity",
                        defaultValue: 80,
                        min: 0,
                        max: 100,
                        step: 1
                    }
                ]
            },
            {
                id: "stroke",
                labelKey: "tools.textBackgroundBox.sections.stroke",
                descriptionKey: "tools.textBackgroundBox.sections.strokeDescription",
                toggleKey: "enableStroke",
                defaultEnabled: false,
                collapsible: true,
                fields: [
                    {
                        type: "select",
                        key: "strokeMode",
                        labelKey: "tools.textBackgroundBox.fields.strokeMode",
                        defaultValue: "Solid Stroke",
                        options: [
                            {
                                value: "Solid Stroke",
                                labelKey: "tools.textBackgroundBox.options.solidStroke"
                            },
                            {
                                value: "Gradient Stroke",
                                labelKey: "tools.textBackgroundBox.options.gradientStroke"
                            }
                        ]
                    },
                    {
                        type: "color",
                        key: "strokeColor",
                        labelKey: "tools.textBackgroundBox.fields.strokeColor",
                        defaultValue: "#ffffff"
                    },
                    {
                        type: "number",
                        key: "strokeWidth",
                        labelKey: "tools.textBackgroundBox.fields.strokeWidth",
                        defaultValue: 2,
                        min: 0,
                        step: 1
                    },
                    {
                        type: "number",
                        key: "strokeOpacity",
                        labelKey: "tools.textBackgroundBox.fields.strokeOpacity",
                        defaultValue: 100,
                        min: 0,
                        max: 100,
                        step: 1
                    }
                ]
            }
        ],
        actions: [
            {
                id: "create",
                labelKey: "tools.textBackgroundBox.actions.create",
                hostFunction: "AEToolbox.tools.textBackgroundBox.create",
                style: "primary"
            }
        ],
        i18n: {
            en: {
                "tools.textBackgroundBox.title": "Background Rounded Rectangle",
                "tools.textBackgroundBox.description": "Create a rounded rectangle behind selected layers, or a default 100x100 rounded rectangle when nothing is selected.",
                "tools.textBackgroundBox.sections.geometry": "Geometry",
                "tools.textBackgroundBox.sections.geometryDescription": "Creation-time bounds and corner radius.",
                "tools.textBackgroundBox.sections.fill": "Fill",
                "tools.textBackgroundBox.sections.fillDescription": "Choose no fill, solid fill, or gradient fill.",
                "tools.textBackgroundBox.sections.stroke": "Stroke",
                "tools.textBackgroundBox.sections.strokeDescription": "Choose no stroke, solid stroke, or gradient stroke.",
                "tools.textBackgroundBox.fields.paddingX": "Padding X",
                "tools.textBackgroundBox.fields.paddingY": "Padding Y",
                "tools.textBackgroundBox.fields.cornerRadius": "Corner Radius",
                "tools.textBackgroundBox.fields.enableFill": "Enable Fill",
                "tools.textBackgroundBox.fields.enableStroke": "Enable Stroke",
                "tools.textBackgroundBox.fields.fillMode": "Fill Mode",
                "tools.textBackgroundBox.fields.fillColor": "Fill Color",
                "tools.textBackgroundBox.fields.fillOpacity": "Fill Opacity",
                "tools.textBackgroundBox.fields.strokeMode": "Stroke Mode",
                "tools.textBackgroundBox.fields.strokeColor": "Stroke Color",
                "tools.textBackgroundBox.fields.strokeWidth": "Stroke Width",
                "tools.textBackgroundBox.fields.strokeOpacity": "Stroke Opacity",
                "tools.textBackgroundBox.options.solidFill": "Solid Fill",
                "tools.textBackgroundBox.options.gradientFill": "Gradient Fill",
                "tools.textBackgroundBox.options.solidStroke": "Solid Stroke",
                "tools.textBackgroundBox.options.gradientStroke": "Gradient Stroke",
                "tools.textBackgroundBox.actions.create": "Create Rounded Rectangle",
                "tools.textBackgroundBox.status.created": "Rounded rectangle created.",
                "tools.textBackgroundBox.status.noLayerSelected": "No layer selected. Created default rounded rectangle."
            },
            "zh-CN": {
                "tools.textBackgroundBox.title": "\u80cc\u666f\u5706\u89d2\u77e9\u5f62",
                "tools.textBackgroundBox.description": "\u4e3a\u9009\u4e2d\u56fe\u5c42\u521b\u5efa\u80cc\u666f\u5706\u89d2\u77e9\u5f62\uff1b\u672a\u9009\u4e2d\u56fe\u5c42\u65f6\u521b\u5efa 100x100 \u9ed8\u8ba4\u77e9\u5f62\u3002",
                "tools.textBackgroundBox.sections.geometry": "\u51e0\u4f55",
                "tools.textBackgroundBox.sections.geometryDescription": "\u521b\u5efa\u65f6\u7684\u8fb9\u754c\u548c\u5706\u89d2\u534a\u5f84\u3002",
                "tools.textBackgroundBox.sections.fill": "\u586b\u5145",
                "tools.textBackgroundBox.sections.fillDescription": "\u9009\u62e9\u65e0\u586b\u5145\u3001\u7eaf\u8272\u586b\u5145\u6216\u6e10\u53d8\u586b\u5145\u3002",
                "tools.textBackgroundBox.sections.stroke": "\u63cf\u8fb9",
                "tools.textBackgroundBox.sections.strokeDescription": "\u9009\u62e9\u65e0\u63cf\u8fb9\u3001\u7eaf\u8272\u63cf\u8fb9\u6216\u6e10\u53d8\u63cf\u8fb9\u3002",
                "tools.textBackgroundBox.fields.paddingX": "Padding X",
                "tools.textBackgroundBox.fields.paddingY": "Padding Y",
                "tools.textBackgroundBox.fields.cornerRadius": "\u5706\u89d2\u534a\u5f84",
                "tools.textBackgroundBox.fields.enableFill": "\u542f\u7528\u586b\u5145",
                "tools.textBackgroundBox.fields.enableStroke": "\u542f\u7528\u63cf\u8fb9",
                "tools.textBackgroundBox.fields.fillMode": "\u586b\u5145\u6a21\u5f0f",
                "tools.textBackgroundBox.fields.fillColor": "\u586b\u5145\u989c\u8272",
                "tools.textBackgroundBox.fields.fillOpacity": "\u586b\u5145\u4e0d\u900f\u660e\u5ea6",
                "tools.textBackgroundBox.fields.strokeMode": "\u63cf\u8fb9\u6a21\u5f0f",
                "tools.textBackgroundBox.fields.strokeColor": "\u63cf\u8fb9\u989c\u8272",
                "tools.textBackgroundBox.fields.strokeWidth": "\u63cf\u8fb9\u5bbd\u5ea6",
                "tools.textBackgroundBox.fields.strokeOpacity": "\u63cf\u8fb9\u4e0d\u900f\u660e\u5ea6",
                "tools.textBackgroundBox.options.solidFill": "\u7eaf\u8272\u586b\u5145",
                "tools.textBackgroundBox.options.gradientFill": "\u6e10\u53d8\u586b\u5145",
                "tools.textBackgroundBox.options.solidStroke": "\u7eaf\u8272\u63cf\u8fb9",
                "tools.textBackgroundBox.options.gradientStroke": "\u6e10\u53d8\u63cf\u8fb9",
                "tools.textBackgroundBox.actions.create": "\u521b\u5efa\u5706\u89d2\u77e9\u5f62",
                "tools.textBackgroundBox.status.created": "\u5df2\u521b\u5efa\u5706\u89d2\u77e9\u5f62\u3002",
                "tools.textBackgroundBox.status.noLayerSelected": "\u672a\u9009\u4e2d\u56fe\u5c42\uff0c\u5df2\u521b\u5efa\u9ed8\u8ba4\u5706\u89d2\u77e9\u5f62\u3002"
            }
        }
    });
})();
