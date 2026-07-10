(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.registerTool({
        id: "proceduralAppearanceLab",
        titleKey: "tools.proceduralAppearanceLab.title",
        descriptionKey: "tools.proceduralAppearanceLab.description",
        category: "debug",
        iconText: "~",
        developerOnly: true,
        storageKey: "AEToolbox.proceduralAppearanceLab.v1",
        hideRestoreDefaults: false,
        sections: [
            {
                id: "preview",
                labelKey: "tools.proceduralAppearanceLab.sections.preview",
                descriptionKey: "tools.proceduralAppearanceLab.sections.previewDescription",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.proceduralAppearanceLab.notes.scope"
                    },
                    {
                        type: "proceduralPreview",
                        labelKey: "tools.proceduralAppearanceLab.fields.preview",
                        hintKey: "tools.proceduralAppearanceLab.hints.preview"
                    }
                ]
            },
            {
                id: "identity",
                labelKey: "tools.proceduralAppearanceLab.sections.identity",
                descriptionKey: "tools.proceduralAppearanceLab.sections.identityDescription",
                fields: [
                    {
                        type: "text",
                        key: "seed",
                        labelKey: "tools.proceduralAppearanceLab.fields.seed",
                        hintKey: "tools.proceduralAppearanceLab.hints.seed",
                        defaultValue: "shapeAdd"
                    },
                    {
                        type: "select",
                        key: "target",
                        labelKey: "tools.proceduralAppearanceLab.fields.target",
                        hintKey: "tools.proceduralAppearanceLab.hints.target",
                        defaultValue: "icon",
                        options: [
                            {
                                value: "icon",
                                labelKey: "tools.proceduralAppearanceLab.options.icon"
                            },
                            {
                                value: "background",
                                labelKey: "tools.proceduralAppearanceLab.options.background"
                            }
                        ]
                    },
                    {
                        type: "select",
                        key: "paletteStrategy",
                        labelKey: "tools.proceduralAppearanceLab.fields.paletteStrategy",
                        hintKey: "tools.proceduralAppearanceLab.hints.paletteStrategy",
                        defaultValue: "curatedLuminous",
                        options: [
                            {
                                value: "curatedLuminous",
                                labelKey: "tools.proceduralAppearanceLab.options.curatedLuminous"
                            },
                            {
                                value: "coolLuminous",
                                labelKey: "tools.proceduralAppearanceLab.options.coolLuminous"
                            },
                            {
                                value: "warmLuminous",
                                labelKey: "tools.proceduralAppearanceLab.options.warmLuminous"
                            },
                            {
                                value: "restrainedContrast",
                                labelKey: "tools.proceduralAppearanceLab.options.restrainedContrast"
                            }
                        ]
                    }
                ]
            },
            {
                id: "parameters",
                labelKey: "tools.proceduralAppearanceLab.sections.parameters",
                descriptionKey: "tools.proceduralAppearanceLab.sections.parametersDescription",
                collapsible: true,
                fields: [
                    {
                        type: "range",
                        key: "warp",
                        labelKey: "tools.proceduralAppearanceLab.fields.warp",
                        defaultValue: 0.68,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "warpIrregularity",
                        labelKey: "tools.proceduralAppearanceLab.fields.warpIrregularity",
                        defaultValue: 0.62,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "flowComplexity",
                        labelKey: "tools.proceduralAppearanceLab.fields.flowComplexity",
                        defaultValue: 0.58,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "flowContinuity",
                        labelKey: "tools.proceduralAppearanceLab.fields.flowContinuity",
                        defaultValue: 0.74,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "ribbonWidth",
                        labelKey: "tools.proceduralAppearanceLab.fields.ribbonWidth",
                        defaultValue: 0.14,
                        min: 0.06,
                        max: 0.22,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "gradientBias",
                        labelKey: "tools.proceduralAppearanceLab.fields.gradientBias",
                        defaultValue: 0.46,
                        min: 0.15,
                        max: 0.75,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "highlightConcentration",
                        labelKey: "tools.proceduralAppearanceLab.fields.highlightConcentration",
                        defaultValue: 0.72,
                        min: 0.35,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "highlightArea",
                        labelKey: "tools.proceduralAppearanceLab.fields.highlightArea",
                        defaultValue: 0.08,
                        min: 0.04,
                        max: 0.12,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "secondaryHueInfluence",
                        labelKey: "tools.proceduralAppearanceLab.fields.secondaryHueInfluence",
                        defaultValue: 0.66,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "accentPresence",
                        labelKey: "tools.proceduralAppearanceLab.fields.accentPresence",
                        defaultValue: 0.46,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "highlightTintShift",
                        labelKey: "tools.proceduralAppearanceLab.fields.highlightTintShift",
                        defaultValue: 0.42,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "contrast",
                        labelKey: "tools.proceduralAppearanceLab.fields.contrast",
                        defaultValue: 0.58,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "depth",
                        labelKey: "tools.proceduralAppearanceLab.fields.depth",
                        defaultValue: 0.64,
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "hueShift",
                        labelKey: "tools.proceduralAppearanceLab.fields.hueShift",
                        defaultValue: 0,
                        min: -30,
                        max: 30,
                        step: 1
                    },
                    {
                        type: "range",
                        key: "saturation",
                        labelKey: "tools.proceduralAppearanceLab.fields.saturation",
                        defaultValue: 0.72,
                        min: 0,
                        max: 1.4,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "brightness",
                        labelKey: "tools.proceduralAppearanceLab.fields.brightness",
                        defaultValue: 0.84,
                        min: 0.2,
                        max: 1.4,
                        step: 0.01
                    },
                    {
                        type: "range",
                        key: "grain",
                        labelKey: "tools.proceduralAppearanceLab.fields.grain",
                        defaultValue: 0.05,
                        min: 0,
                        max: 0.5,
                        step: 0.01
                    }
                ]
            }
        ],
        actions: [],
        i18n: {
            en: {
                "tools.proceduralAppearanceLab.title": "Procedural Appearance Lab",
                "tools.proceduralAppearanceLab.description": "Developer-only lab for deterministic procedural icon and background generation.",
                "tools.proceduralAppearanceLab.sections.preview": "Preview",
                "tools.proceduralAppearanceLab.sections.previewDescription": "Static canvas preview using the shared procedural visual engine.",
                "tools.proceduralAppearanceLab.sections.identity": "Seed and Target",
                "tools.proceduralAppearanceLab.sections.identityDescription": "Tool icons use tool id / hash seeds. Background previews can use a manual seed.",
                "tools.proceduralAppearanceLab.sections.parameters": "Generation Parameters",
                "tools.proceduralAppearanceLab.sections.parametersDescription": "These values are normalized into the deterministic cache key.",
                "tools.proceduralAppearanceLab.notes.scope": "Lab only. This does not replace Home icons, the current BackgroundEngine, color picker, or tool behavior.",
                "tools.proceduralAppearanceLab.fields.preview": "Generated Preview",
                "tools.proceduralAppearanceLab.fields.seed": "Seed",
                "tools.proceduralAppearanceLab.fields.target": "Target",
                "tools.proceduralAppearanceLab.fields.paletteStrategy": "Palette Strategy",
                "tools.proceduralAppearanceLab.fields.warp": "Warp",
                "tools.proceduralAppearanceLab.fields.warpIrregularity": "Warp Irregularity",
                "tools.proceduralAppearanceLab.fields.flowComplexity": "Flow Complexity",
                "tools.proceduralAppearanceLab.fields.flowContinuity": "Flow Continuity",
                "tools.proceduralAppearanceLab.fields.ribbonWidth": "Ribbon Width",
                "tools.proceduralAppearanceLab.fields.gradientBias": "Gradient Bias",
                "tools.proceduralAppearanceLab.fields.highlightConcentration": "Highlight Concentration",
                "tools.proceduralAppearanceLab.fields.highlightArea": "Highlight Area",
                "tools.proceduralAppearanceLab.fields.secondaryHueInfluence": "Secondary Hue Influence",
                "tools.proceduralAppearanceLab.fields.accentPresence": "Accent Presence",
                "tools.proceduralAppearanceLab.fields.highlightTintShift": "Highlight Tint Shift",
                "tools.proceduralAppearanceLab.fields.contrast": "Contrast",
                "tools.proceduralAppearanceLab.fields.depth": "Depth",
                "tools.proceduralAppearanceLab.fields.hueShift": "Hue Shift",
                "tools.proceduralAppearanceLab.fields.saturation": "Saturation",
                "tools.proceduralAppearanceLab.fields.brightness": "Brightness",
                "tools.proceduralAppearanceLab.fields.grain": "Grain / Noise",
                "tools.proceduralAppearanceLab.hints.preview": "Same engineVersion + target + seed + normalized params produces the same image.",
                "tools.proceduralAppearanceLab.hints.seed": "Use a tool id such as shapeAdd for icon identity, or any manual seed for background tests.",
                "tools.proceduralAppearanceLab.hints.target": "Icon and background share the engine but use different composition presets.",
                "tools.proceduralAppearanceLab.hints.paletteStrategy": "Uses a curated hue family with controlled shadow, base, secondary, highlight, and accent roles.",
                "tools.proceduralAppearanceLab.options.icon": "Tool Icon",
                "tools.proceduralAppearanceLab.options.background": "Background",
                "tools.proceduralAppearanceLab.options.curatedLuminous": "Curated Luminous",
                "tools.proceduralAppearanceLab.options.coolLuminous": "Cool Luminous",
                "tools.proceduralAppearanceLab.options.warmLuminous": "Warm Luminous",
                "tools.proceduralAppearanceLab.options.restrainedContrast": "Restrained Contrast"
            },
            "zh-CN": {
                "tools.proceduralAppearanceLab.title": "\u7a0b\u5e8f\u5316\u5916\u89c2\u5b9e\u9a8c\u5ba4",
                "tools.proceduralAppearanceLab.description": "\u4ec5\u7528\u4e8e\u5f00\u53d1\u8005\u6a21\u5f0f\uff0c\u6d4b\u8bd5\u786e\u5b9a\u6027\u7a0b\u5e8f\u5316\u56fe\u6807\u548c\u80cc\u666f\u751f\u6210\u3002",
                "tools.proceduralAppearanceLab.sections.preview": "\u9884\u89c8",
                "tools.proceduralAppearanceLab.sections.previewDescription": "\u4f7f\u7528\u5171\u7528\u7a0b\u5e8f\u5316\u89c6\u89c9\u5f15\u64ce\u751f\u6210\u9759\u6001 canvas \u9884\u89c8\u3002",
                "tools.proceduralAppearanceLab.sections.identity": "Seed \u4e0e\u76ee\u6807",
                "tools.proceduralAppearanceLab.sections.identityDescription": "\u5de5\u5177\u56fe\u6807\u4f7f\u7528 tool id / hash seed\uff0c\u80cc\u666f\u9884\u89c8\u53ef\u624b\u52a8\u6307\u5b9a seed\u3002",
                "tools.proceduralAppearanceLab.sections.parameters": "\u751f\u6210\u53c2\u6570",
                "tools.proceduralAppearanceLab.sections.parametersDescription": "\u8fd9\u4e9b\u503c\u4f1a\u88ab\u89c4\u8303\u5316\u540e\u5199\u5165\u786e\u5b9a\u6027 cache key\u3002",
                "tools.proceduralAppearanceLab.notes.scope": "\u4ec5\u5b9e\u9a8c\u5ba4\u3002\u4e0d\u66ff\u6362 Home \u56fe\u6807\u3001\u5f53\u524d BackgroundEngine\u3001\u53d6\u8272\u5668\u6216\u5de5\u5177\u884c\u4e3a\u3002",
                "tools.proceduralAppearanceLab.fields.preview": "\u751f\u6210\u9884\u89c8",
                "tools.proceduralAppearanceLab.fields.seed": "Seed",
                "tools.proceduralAppearanceLab.fields.target": "\u76ee\u6807",
                "tools.proceduralAppearanceLab.fields.paletteStrategy": "\u8c03\u8272\u7b56\u7565",
                "tools.proceduralAppearanceLab.fields.warp": "\u626d\u66f2",
                "tools.proceduralAppearanceLab.fields.warpIrregularity": "\u626d\u66f2\u4e0d\u89c4\u5219\u5ea6",
                "tools.proceduralAppearanceLab.fields.flowComplexity": "\u6d41\u573a\u590d\u6742\u5ea6",
                "tools.proceduralAppearanceLab.fields.flowContinuity": "\u6d41\u52a8\u8fde\u7eed\u6027",
                "tools.proceduralAppearanceLab.fields.ribbonWidth": "\u6d41\u52a8\u8272\u5e26\u5bbd\u5ea6",
                "tools.proceduralAppearanceLab.fields.gradientBias": "\u6e10\u53d8\u504f\u7f6e",
                "tools.proceduralAppearanceLab.fields.highlightConcentration": "\u9ad8\u5149\u805a\u96c6",
                "tools.proceduralAppearanceLab.fields.highlightArea": "\u9ad8\u5149\u9762\u79ef",
                "tools.proceduralAppearanceLab.fields.secondaryHueInfluence": "\u8f85\u8272\u5f71\u54cd",
                "tools.proceduralAppearanceLab.fields.accentPresence": "\u5f3a\u8c03\u8272\u5b58\u5728\u611f",
                "tools.proceduralAppearanceLab.fields.highlightTintShift": "\u9ad8\u5149\u8272\u76f8\u504f\u79fb",
                "tools.proceduralAppearanceLab.fields.contrast": "\u5bf9\u6bd4",
                "tools.proceduralAppearanceLab.fields.depth": "\u6df1\u5ea6",
                "tools.proceduralAppearanceLab.fields.hueShift": "\u8272\u76f8\u504f\u79fb",
                "tools.proceduralAppearanceLab.fields.saturation": "\u9971\u548c\u5ea6",
                "tools.proceduralAppearanceLab.fields.brightness": "\u4eae\u5ea6",
                "tools.proceduralAppearanceLab.fields.grain": "\u9897\u7c92 / \u566a\u58f0",
                "tools.proceduralAppearanceLab.hints.preview": "\u76f8\u540c engineVersion + target + seed + \u89c4\u8303\u5316\u53c2\u6570\u4f1a\u751f\u6210\u76f8\u540c\u56fe\u50cf\u3002",
                "tools.proceduralAppearanceLab.hints.seed": "\u56fe\u6807\u53ef\u4f7f\u7528 shapeAdd \u7b49 tool id\uff0c\u80cc\u666f\u6d4b\u8bd5\u53ef\u4f7f\u7528\u4efb\u610f\u624b\u52a8 seed\u3002",
                "tools.proceduralAppearanceLab.hints.target": "\u56fe\u6807\u548c\u80cc\u666f\u5171\u7528\u5f15\u64ce\uff0c\u4f46\u4f7f\u7528\u4e0d\u540c\u6784\u56fe\u9884\u8bbe\u3002",
                "tools.proceduralAppearanceLab.hints.paletteStrategy": "\u4f7f\u7528\u7b5b\u9009\u8272\u76f8\u5bb6\u65cf\uff0c\u5e76\u4ee5\u53d7\u63a7\u7684\u9634\u5f71\u3001\u4e3b\u8272\u3001\u8f85\u8272\u3001\u9ad8\u5149\u548c\u5f3a\u8c03\u8272\u5c42\u7ea7\u751f\u6210\u989c\u8272\u3002",
                "tools.proceduralAppearanceLab.options.icon": "\u5de5\u5177\u56fe\u6807",
                "tools.proceduralAppearanceLab.options.background": "\u80cc\u666f",
                "tools.proceduralAppearanceLab.options.curatedLuminous": "\u7cbe\u9009\u53d1\u5149",
                "tools.proceduralAppearanceLab.options.coolLuminous": "\u51b7\u8272\u53d1\u5149",
                "tools.proceduralAppearanceLab.options.warmLuminous": "\u6696\u8272\u53d1\u5149",
                "tools.proceduralAppearanceLab.options.restrainedContrast": "\u514b\u5236\u5bf9\u6bd4"
            }
        }
    });
}());
