(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.adComponentKitProbe = AEToolbox.tools.adComponentKitProbe || {};

    function probeStateMessageKey(state) {
        var runtime = state && state.state ? state.state : {};
        if (!runtime.hasComp) {
            return "tools.adComponentKitProbe.status.noComp";
        }
        if (runtime.canCreateFeatureStack) {
            return "tools.adComponentKitProbe.status.featureReady";
        }
        if (runtime.selectionCount > 0) {
            return "tools.adComponentKitProbe.status.noTextSelection";
        }
        return "tools.adComponentKitProbe.status.noSelection";
    }

    AEToolbox.tools.adComponentKitProbe.getState = function () {
        var state = {};

        try {
            if (AEToolbox.tools.adComponentKit && AEToolbox.tools.adComponentKit.getState) {
                state = AEToolbox.parseJson(AEToolbox.tools.adComponentKit.getState() || "{}");
            }
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.adComponentKitProbe.status.stateFailed",
                state: {
                    hasComp: false,
                    activeComp: "",
                    selectionCount: 0,
                    textLayerCount: 0,
                    twoDLayerCount: 0,
                    selectedControllerType: "",
                    canCreateFeatureStack: false
                }
            });
        }

        return AEToolbox.stringify({
            ok: !!state.ok,
            messageKey: probeStateMessageKey(state),
            state: state.state || {
                hasComp: false,
                activeComp: "",
                selectionCount: 0,
                textLayerCount: 0,
                twoDLayerCount: 0,
                selectedControllerType: "",
                canCreateFeatureStack: false
            }
        });
    };

    AEToolbox.tools.adComponentKitProbe.createFeatureStack = function (paramsJson) {
        var result = {};

        if (!AEToolbox.tools.adComponentKit || !AEToolbox.tools.adComponentKit.createFeatureStack) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.adComponentKitProbe.status.hostUnavailable"
            });
        }

        try {
            result = AEToolbox.parseJson(AEToolbox.tools.adComponentKit.createFeatureStack(paramsJson || "{}") || "{}");
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.adComponentKitProbe.status.createFailed"
            });
        }

        return AEToolbox.stringify({
            ok: !!result.ok,
            messageKey: result.ok ? "tools.adComponentKitProbe.status.createdFeatureStack" : "tools.adComponentKitProbe.status.noTextSelection",
            componentId: result.componentId || "",
            warning: result.warning || ""
        });
    };

    AEToolbox.registerTool({
        id: "adComponentKitProbe",
        titleKey: "tools.adComponentKitProbe.title",
        descriptionKey: "tools.adComponentKitProbe.description",
        category: "debug",
        iconText: "A",
        debugOnly: true,
        storageKey: "AEToolbox.adComponentKitProbe.v1",
        stateAction: {
            hostFunction: "AEToolbox.tools.adComponentKitProbe.getState",
            intervalMs: 1000
        },
        stateCard: {
            titleKey: "tools.adComponentKitProbe.sections.state",
            fields: [
                {
                    stateKey: "activeComp",
                    labelKey: "tools.adComponentKitProbe.state.activeComp"
                },
                {
                    stateKey: "selectionCount",
                    labelKey: "tools.adComponentKitProbe.state.selectionCount"
                },
                {
                    stateKey: "textLayerCount",
                    labelKey: "tools.adComponentKitProbe.state.textLayerCount"
                },
                {
                    stateKey: "canCreateFeatureStack",
                    labelKey: "tools.adComponentKitProbe.state.canCreateFeatureStack"
                }
            ]
        },
        sections: [
            {
                id: "featureStack",
                labelKey: "tools.adComponentKitProbe.sections.featureStack",
                descriptionKey: "tools.adComponentKitProbe.sections.featureStackDescription",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.adComponentKitProbe.notes.debugOnly"
                    },
                    {
                        type: "range",
                        key: "gap",
                        labelKey: "tools.adComponentKitProbe.fields.gap",
                        defaultValue: 14,
                        min: 0,
                        max: 100,
                        step: 1
                    },
                    {
                        type: "range",
                        key: "paddingX",
                        labelKey: "tools.adComponentKitProbe.fields.paddingX",
                        defaultValue: 24,
                        min: 0,
                        max: 160,
                        step: 1
                    },
                    {
                        type: "range",
                        key: "paddingY",
                        labelKey: "tools.adComponentKitProbe.fields.paddingY",
                        defaultValue: 12,
                        min: 0,
                        max: 100,
                        step: 1
                    },
                    {
                        type: "range",
                        key: "cornerRadius",
                        labelKey: "tools.adComponentKitProbe.fields.cornerRadius",
                        defaultValue: 28,
                        min: 0,
                        max: 140,
                        step: 1
                    },
                    {
                        type: "select",
                        key: "pillWidthMode",
                        labelKey: "tools.adComponentKitProbe.fields.pillWidthMode",
                        defaultValue: "auto",
                        options: [
                            {
                                value: "auto",
                                labelKey: "common.auto"
                            },
                            {
                                value: "fixed",
                                labelKey: "common.fixed"
                            }
                        ]
                    },
                    {
                        type: "range",
                        key: "fixedWidth",
                        labelKey: "tools.adComponentKitProbe.fields.fixedWidth",
                        defaultValue: 320,
                        min: 80,
                        max: 900,
                        step: 1
                    },
                    {
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.adComponentKitProbe.fields.fillColor",
                        defaultValue: "#d6b25e"
                    },
                    {
                        type: "checkbox",
                        key: "gradientEnable",
                        labelKey: "tools.adComponentKitProbe.fields.gradientEnable",
                        defaultValue: false
                    },
                    {
                        type: "select",
                        key: "textAlign",
                        labelKey: "tools.adComponentKitProbe.fields.textAlign",
                        defaultValue: "center",
                        options: [
                            {
                                value: "center",
                                labelKey: "common.center"
                            },
                            {
                                value: "left",
                                labelKey: "common.left"
                            }
                        ]
                    },
                    {
                        type: "select",
                        key: "sortMode",
                        labelKey: "tools.adComponentKitProbe.fields.sortMode",
                        defaultValue: "yPosition",
                        options: [
                            {
                                value: "yPosition",
                                labelKey: "common.yPosition"
                            },
                            {
                                value: "timeline",
                                labelKey: "common.timeline"
                            }
                        ]
                    },
                    {
                        type: "button",
                        key: "createFeatureStack",
                        labelKey: "tools.adComponentKitProbe.actions.createFeatureStack",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "createFeatureStack",
                        enabledWhen: {
                            stateKey: "canCreateFeatureStack",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKitProbe.status.creatingFeatureStack",
                        successMessageKey: "tools.adComponentKitProbe.status.createdFeatureStack",
                        errorMessageKey: "tools.adComponentKitProbe.status.noTextSelection"
                    }
                ]
            }
        ],
        actions: [
            {
                id: "createFeatureStack",
                labelKey: "tools.adComponentKitProbe.actions.createFeatureStack",
                hostFunction: "AEToolbox.tools.adComponentKitProbe.createFeatureStack",
                style: "primary",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKitProbe.status.creatingFeatureStack",
                successMessageKey: "tools.adComponentKitProbe.status.createdFeatureStack",
                errorMessageKey: "tools.adComponentKitProbe.status.noTextSelection",
                hidden: true,
                fieldOnly: true
            }
        ],
        i18n: {
            en: {
                "tools.adComponentKitProbe.title": "Ad Component Kit Probe",
                "tools.adComponentKitProbe.description": "Developer Mode probe that calls the legacy Feature Stack host action through the registry renderer.",
                "tools.adComponentKitProbe.sections.state": "Feature Stack State",
                "tools.adComponentKitProbe.sections.featureStack": "Feature Stack Probe",
                "tools.adComponentKitProbe.sections.featureStackDescription": "Validates one registry action without replacing the production Ad Component Kit.",
                "tools.adComponentKitProbe.state.activeComp": "Active Comp",
                "tools.adComponentKitProbe.state.selectionCount": "Selection",
                "tools.adComponentKitProbe.state.textLayerCount": "Text Layers",
                "tools.adComponentKitProbe.state.canCreateFeatureStack": "Can Create",
                "tools.adComponentKitProbe.fields.gap": "Gap",
                "tools.adComponentKitProbe.fields.paddingX": "Padding X",
                "tools.adComponentKitProbe.fields.paddingY": "Padding Y",
                "tools.adComponentKitProbe.fields.cornerRadius": "Corner Radius",
                "tools.adComponentKitProbe.fields.pillWidthMode": "Pill Width Mode",
                "tools.adComponentKitProbe.fields.fixedWidth": "Fixed Width",
                "tools.adComponentKitProbe.fields.fillColor": "Fill Color",
                "tools.adComponentKitProbe.fields.gradientEnable": "Gradient Enable",
                "tools.adComponentKitProbe.fields.textAlign": "Text Align",
                "tools.adComponentKitProbe.fields.sortMode": "Sort",
                "tools.adComponentKitProbe.actions.createFeatureStack": "Create Feature Stack",
                "tools.adComponentKitProbe.notes.debugOnly": "Debug-only probe. It does not replace the production Ad Component Kit.",
                "tools.adComponentKitProbe.status.stateReady": "Ad Component Kit probe state refreshed.",
                "tools.adComponentKitProbe.status.stateFailed": "Unable to read Ad Component Kit state.",
                "tools.adComponentKitProbe.status.hostUnavailable": "Ad Component Kit host action is unavailable.",
                "tools.adComponentKitProbe.status.noComp": "Open a composition.",
                "tools.adComponentKitProbe.status.noSelection": "Select one or more text layers.",
                "tools.adComponentKitProbe.status.noTextSelection": "Select one or more text layers.",
                "tools.adComponentKitProbe.status.featureReady": "Feature Stack text selection ready.",
                "tools.adComponentKitProbe.status.creatingFeatureStack": "Creating Feature Stack through probe...",
                "tools.adComponentKitProbe.status.createdFeatureStack": "Feature Stack created through probe.",
                "tools.adComponentKitProbe.status.createFailed": "Feature Stack probe failed."
            },
            "zh-CN": {
                "tools.adComponentKitProbe.title": "\u7535\u5546\u7ec4\u4ef6\u63a2\u9488",
                "tools.adComponentKitProbe.description": "\u5f00\u53d1\u8005\u6a21\u5f0f\u63a2\u9488\uff0c\u901a\u8fc7 registry renderer \u8c03\u7528 legacy Feature Stack host action\u3002",
                "tools.adComponentKitProbe.sections.state": "\u5356\u70b9\u80f6\u56ca\u72b6\u6001",
                "tools.adComponentKitProbe.sections.featureStack": "\u5356\u70b9\u80f6\u56ca\u63a2\u9488",
                "tools.adComponentKitProbe.sections.featureStackDescription": "\u53ea\u9a8c\u8bc1\u4e00\u4e2a registry action\uff0c\u4e0d\u66ff\u6362\u6b63\u5f0f\u7535\u5546\u7ec4\u4ef6\u5de5\u5177\u7bb1\u3002",
                "tools.adComponentKitProbe.state.activeComp": "\u6fc0\u6d3b\u5408\u6210",
                "tools.adComponentKitProbe.state.selectionCount": "\u9009\u4e2d\u6570\u91cf",
                "tools.adComponentKitProbe.state.textLayerCount": "\u6587\u672c\u5c42",
                "tools.adComponentKitProbe.state.canCreateFeatureStack": "\u53ef\u521b\u5efa",
                "tools.adComponentKitProbe.fields.gap": "\u95f4\u8ddd",
                "tools.adComponentKitProbe.fields.paddingX": "Padding X",
                "tools.adComponentKitProbe.fields.paddingY": "Padding Y",
                "tools.adComponentKitProbe.fields.cornerRadius": "\u5706\u89d2\u534a\u5f84",
                "tools.adComponentKitProbe.fields.pillWidthMode": "\u80f6\u56ca\u5bbd\u5ea6\u6a21\u5f0f",
                "tools.adComponentKitProbe.fields.fixedWidth": "\u56fa\u5b9a\u5bbd\u5ea6",
                "tools.adComponentKitProbe.fields.fillColor": "\u586b\u5145\u989c\u8272",
                "tools.adComponentKitProbe.fields.gradientEnable": "\u542f\u7528\u6e10\u53d8",
                "tools.adComponentKitProbe.fields.textAlign": "\u6587\u672c\u5bf9\u9f50",
                "tools.adComponentKitProbe.fields.sortMode": "\u6392\u5e8f",
                "tools.adComponentKitProbe.actions.createFeatureStack": "\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u6761",
                "tools.adComponentKitProbe.notes.debugOnly": "\u8fd9\u662f\u4ec5\u7528\u4e8e\u8c03\u8bd5\u7684\u63a2\u9488\uff0c\u4e0d\u66ff\u6362\u6b63\u5f0f\u7535\u5546\u7ec4\u4ef6\u5de5\u5177\u7bb1\u3002",
                "tools.adComponentKitProbe.status.stateReady": "\u7535\u5546\u7ec4\u4ef6\u63a2\u9488\u72b6\u6001\u5df2\u5237\u65b0\u3002",
                "tools.adComponentKitProbe.status.stateFailed": "\u65e0\u6cd5\u8bfb\u53d6\u7535\u5546\u7ec4\u4ef6\u72b6\u6001\u3002",
                "tools.adComponentKitProbe.status.hostUnavailable": "\u7535\u5546\u7ec4\u4ef6 host action \u4e0d\u53ef\u7528\u3002",
                "tools.adComponentKitProbe.status.noComp": "\u8bf7\u6253\u5f00\u5408\u6210\u3002",
                "tools.adComponentKitProbe.status.noSelection": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u6587\u672c\u5c42\u3002",
                "tools.adComponentKitProbe.status.noTextSelection": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u6587\u672c\u5c42\u3002",
                "tools.adComponentKitProbe.status.featureReady": "\u5356\u70b9\u80f6\u56ca\u6587\u672c\u9009\u533a\u5df2\u5c31\u7eea\u3002",
                "tools.adComponentKitProbe.status.creatingFeatureStack": "\u6b63\u5728\u901a\u8fc7\u63a2\u9488\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u6761...",
                "tools.adComponentKitProbe.status.createdFeatureStack": "\u5df2\u901a\u8fc7\u63a2\u9488\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u6761\u3002",
                "tools.adComponentKitProbe.status.createFailed": "\u5356\u70b9\u80f6\u56ca\u63a2\u9488\u5931\u8d25\u3002"
            }
        }
    });
})();
