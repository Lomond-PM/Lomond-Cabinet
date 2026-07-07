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
        if (runtime.canCreateIconGrid) {
            return "tools.adComponentKitProbe.status.iconGridReady";
        }
        if (runtime.selectionCount > 0) {
            return "tools.adComponentKitProbe.status.noSupportedSelection";
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
                    canCreateFeatureStack: false,
                    canCreateIconGrid: false,
                    canRefresh: false,
                    canSelectLayers: false,
                    canDetach: false
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
                canCreateFeatureStack: false,
                canCreateIconGrid: false,
                canRefresh: false,
                canSelectLayers: false,
                canDetach: false
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

    AEToolbox.tools.adComponentKitProbe.createIconGrid = function (paramsJson) {
        var result = {};

        if (!AEToolbox.tools.adComponentKit || !AEToolbox.tools.adComponentKit.createIconGrid) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.adComponentKitProbe.status.hostUnavailable"
            });
        }

        try {
            result = AEToolbox.parseJson(AEToolbox.tools.adComponentKit.createIconGrid(paramsJson || "{}") || "{}");
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.adComponentKitProbe.status.createIconGridFailed"
            });
        }

        return AEToolbox.stringify({
            ok: !!result.ok,
            messageKey: result.ok ? "tools.adComponentKitProbe.status.createdIconGrid" : "tools.adComponentKitProbe.status.noIconGridSelection",
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
                    stateKey: "twoDLayerCount",
                    labelKey: "tools.adComponentKitProbe.state.twoDLayerCount"
                },
                {
                    stateKey: "selectedControllerType",
                    labelKey: "tools.adComponentKitProbe.state.selectedControllerType"
                },
                {
                    stateKey: "canCreateFeatureStack",
                    labelKey: "tools.adComponentKitProbe.state.canCreateFeatureStack"
                },
                {
                    stateKey: "canCreateIconGrid",
                    labelKey: "tools.adComponentKitProbe.state.canCreateIconGrid"
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
                        type: "tabs",
                        key: "componentKind",
                        labelKey: "tools.adComponentKitProbe.fields.componentKind",
                        defaultValue: "featureStack",
                        options: [
                            {
                                value: "featureStack",
                                labelKey: "tools.adComponentKitProbe.options.featureStack",
                                descriptionKey: "tools.adComponentKitProbe.options.featureStackDescription",
                                iconText: "F"
                            },
                            {
                                value: "iconGrid",
                                labelKey: "tools.adComponentKitProbe.options.iconGrid",
                                descriptionKey: "tools.adComponentKitProbe.options.iconGridDescription",
                                iconText: "I"
                            }
                        ]
                    },
                    {
                        type: "range",
                        key: "gap",
                        labelKey: "tools.adComponentKitProbe.fields.gap",
                        defaultValue: 14,
                        min: 0,
                        max: 100,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "range",
                        key: "paddingX",
                        labelKey: "tools.adComponentKitProbe.fields.paddingX",
                        defaultValue: 24,
                        min: 0,
                        max: 160,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "range",
                        key: "paddingY",
                        labelKey: "tools.adComponentKitProbe.fields.paddingY",
                        defaultValue: 12,
                        min: 0,
                        max: 100,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "range",
                        key: "cornerRadius",
                        labelKey: "tools.adComponentKitProbe.fields.cornerRadius",
                        defaultValue: 28,
                        min: 0,
                        max: 140,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "select",
                        key: "pillWidthMode",
                        labelKey: "tools.adComponentKitProbe.fields.pillWidthMode",
                        defaultValue: "auto",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
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
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.adComponentKitProbe.fields.fillColor",
                        defaultValue: "#d6b25e",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "checkbox",
                        key: "gradientEnable",
                        labelKey: "tools.adComponentKitProbe.fields.gradientEnable",
                        defaultValue: false,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "select",
                        key: "textAlign",
                        labelKey: "tools.adComponentKitProbe.fields.textAlign",
                        defaultValue: "center",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
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
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
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
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
                        enabledWhen: {
                            stateKey: "canCreateFeatureStack",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKitProbe.status.creatingFeatureStack",
                        successMessageKey: "tools.adComponentKitProbe.status.createdFeatureStack",
                        errorMessageKey: "tools.adComponentKitProbe.status.noTextSelection"
                    },
                    {
                        type: "range",
                        key: "columns",
                        labelKey: "tools.adComponentKitProbe.fields.columns",
                        defaultValue: 4,
                        min: 1,
                        max: 12,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "select",
                        key: "normalizeMode",
                        labelKey: "tools.adComponentKitProbe.fields.normalizeMode",
                        defaultValue: "fitBox",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        options: [
                            {
                                value: "none",
                                labelKey: "common.none"
                            },
                            {
                                value: "fitBox",
                                labelKey: "common.fitBox"
                            },
                            {
                                value: "uniformHeight",
                                labelKey: "common.uniformHeight"
                            },
                            {
                                value: "uniformWidth",
                                labelKey: "common.uniformWidth"
                            }
                        ]
                    },
                    {
                        type: "range",
                        key: "targetWidth",
                        labelKey: "tools.adComponentKitProbe.fields.targetWidth",
                        defaultValue: 72,
                        min: 1,
                        max: 400,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "range",
                        key: "targetHeight",
                        labelKey: "tools.adComponentKitProbe.fields.targetHeight",
                        defaultValue: 72,
                        min: 1,
                        max: 400,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "range",
                        key: "cellWidth",
                        labelKey: "tools.adComponentKitProbe.fields.cellWidth",
                        defaultValue: 100,
                        min: 1,
                        max: 600,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "range",
                        key: "cellHeight",
                        labelKey: "tools.adComponentKitProbe.fields.cellHeight",
                        defaultValue: 118,
                        min: 1,
                        max: 600,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "range",
                        key: "gapX",
                        labelKey: "tools.adComponentKitProbe.fields.gapX",
                        defaultValue: 28,
                        min: 0,
                        max: 240,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "range",
                        key: "gapY",
                        labelKey: "tools.adComponentKitProbe.fields.gapY",
                        defaultValue: 24,
                        min: 0,
                        max: 240,
                        step: 1,
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "select",
                        key: "lastRowAlign",
                        labelKey: "tools.adComponentKitProbe.fields.lastRowAlign",
                        defaultValue: "center",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        options: [
                            {
                                value: "left",
                                labelKey: "common.left"
                            },
                            {
                                value: "center",
                                labelKey: "common.center"
                            },
                            {
                                value: "right",
                                labelKey: "common.right"
                            }
                        ]
                    },
                    {
                        type: "select",
                        key: "gridSortMode",
                        labelKey: "tools.adComponentKitProbe.fields.gridSortMode",
                        defaultValue: "rowMajor",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        options: [
                            {
                                value: "rowMajor",
                                labelKey: "common.rowMajor"
                            },
                            {
                                value: "xPosition",
                                labelKey: "common.xPosition"
                            },
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
                        key: "createIconGrid",
                        labelKey: "tools.adComponentKitProbe.actions.createIconGrid",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "createIconGrid",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        enabledWhen: {
                            stateKey: "canCreateIconGrid",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKitProbe.status.creatingIconGrid",
                        successMessageKey: "tools.adComponentKitProbe.status.createdIconGrid",
                        errorMessageKey: "tools.adComponentKitProbe.status.noIconGridSelection"
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
            },
            {
                id: "createIconGrid",
                labelKey: "tools.adComponentKitProbe.actions.createIconGrid",
                hostFunction: "AEToolbox.tools.adComponentKitProbe.createIconGrid",
                style: "primary",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKitProbe.status.creatingIconGrid",
                successMessageKey: "tools.adComponentKitProbe.status.createdIconGrid",
                errorMessageKey: "tools.adComponentKitProbe.status.noIconGridSelection",
                hidden: true,
                fieldOnly: true
            }
        ],
        i18n: {
            en: {
                "tools.adComponentKitProbe.title": "Ad Component Kit Probe",
                "tools.adComponentKitProbe.description": "Developer Mode probe that calls legacy Feature Stack and Icon Grid host actions through the registry renderer.",
                "tools.adComponentKitProbe.sections.state": "Ad Component Kit State",
                "tools.adComponentKitProbe.sections.featureStack": "Feature Stack Probe",
                "tools.adComponentKitProbe.sections.featureStackDescription": "Validates registry actions without replacing the production Ad Component Kit.",
                "tools.adComponentKitProbe.state.activeComp": "Active Comp",
                "tools.adComponentKitProbe.state.selectionCount": "Selection",
                "tools.adComponentKitProbe.state.textLayerCount": "Text Layers",
                "tools.adComponentKitProbe.state.twoDLayerCount": "2D Layers",
                "tools.adComponentKitProbe.state.selectedControllerType": "Controller",
                "tools.adComponentKitProbe.state.canCreateFeatureStack": "Can Create Feature Stack",
                "tools.adComponentKitProbe.state.canCreateIconGrid": "Can Create Icon Grid",
                "tools.adComponentKitProbe.fields.componentKind": "Component Type",
                "tools.adComponentKitProbe.options.featureStack": "Feature Stack",
                "tools.adComponentKitProbe.options.featureStackDescription": "Create text-based pill rows.",
                "tools.adComponentKitProbe.options.iconGrid": "Icon Grid",
                "tools.adComponentKitProbe.options.iconGridDescription": "Arrange selected 2D layers into a grid.",
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
                "tools.adComponentKitProbe.fields.columns": "Columns",
                "tools.adComponentKitProbe.fields.normalizeMode": "Normalize Mode",
                "tools.adComponentKitProbe.fields.targetWidth": "Target Width",
                "tools.adComponentKitProbe.fields.targetHeight": "Target Height",
                "tools.adComponentKitProbe.fields.cellWidth": "Cell Width",
                "tools.adComponentKitProbe.fields.cellHeight": "Cell Height",
                "tools.adComponentKitProbe.fields.gapX": "Gap X",
                "tools.adComponentKitProbe.fields.gapY": "Gap Y",
                "tools.adComponentKitProbe.fields.lastRowAlign": "Last Row Align",
                "tools.adComponentKitProbe.fields.gridSortMode": "Sort",
                "tools.adComponentKitProbe.actions.createFeatureStack": "Create Feature Stack",
                "tools.adComponentKitProbe.actions.createIconGrid": "Create Icon Grid",
                "tools.adComponentKitProbe.notes.debugOnly": "Debug-only probe. It does not replace the production Ad Component Kit.",
                "tools.adComponentKitProbe.status.stateReady": "Ad Component Kit probe state refreshed.",
                "tools.adComponentKitProbe.status.stateFailed": "Unable to read Ad Component Kit state.",
                "tools.adComponentKitProbe.status.hostUnavailable": "Ad Component Kit host action is unavailable.",
                "tools.adComponentKitProbe.status.noComp": "Open a composition.",
                "tools.adComponentKitProbe.status.noSelection": "Select one or more text layers.",
                "tools.adComponentKitProbe.status.noTextSelection": "Select one or more text layers.",
                "tools.adComponentKitProbe.status.noSupportedSelection": "Select text layers for Feature Stack or 2D layers for Icon Grid.",
                "tools.adComponentKitProbe.status.noIconGridSelection": "Select one or more supported 2D layers.",
                "tools.adComponentKitProbe.status.featureReady": "Feature Stack text selection ready.",
                "tools.adComponentKitProbe.status.iconGridReady": "Icon Grid layer selection ready.",
                "tools.adComponentKitProbe.status.creatingFeatureStack": "Creating Feature Stack through probe...",
                "tools.adComponentKitProbe.status.createdFeatureStack": "Feature Stack created through probe.",
                "tools.adComponentKitProbe.status.createFailed": "Feature Stack probe failed.",
                "tools.adComponentKitProbe.status.creatingIconGrid": "Creating Icon Grid through probe...",
                "tools.adComponentKitProbe.status.createdIconGrid": "Icon Grid created through probe.",
                "tools.adComponentKitProbe.status.createIconGridFailed": "Icon Grid probe failed."
            },
            "zh-CN": {
                "tools.adComponentKitProbe.title": "\u7535\u5546\u7ec4\u4ef6\u63a2\u9488",
                "tools.adComponentKitProbe.description": "\u5f00\u53d1\u8005\u6a21\u5f0f\u63a2\u9488\uff0c\u901a\u8fc7 registry renderer \u8c03\u7528 legacy Feature Stack \u4e0e Icon Grid host action\u3002",
                "tools.adComponentKitProbe.sections.state": "\u7535\u5546\u7ec4\u4ef6\u72b6\u6001",
                "tools.adComponentKitProbe.sections.featureStack": "\u5356\u70b9\u80f6\u56ca\u63a2\u9488",
                "tools.adComponentKitProbe.sections.featureStackDescription": "\u9a8c\u8bc1 registry action\uff0c\u4e0d\u66ff\u6362\u6b63\u5f0f\u7535\u5546\u7ec4\u4ef6\u5de5\u5177\u7bb1\u3002",
                "tools.adComponentKitProbe.state.activeComp": "\u6fc0\u6d3b\u5408\u6210",
                "tools.adComponentKitProbe.state.selectionCount": "\u9009\u4e2d\u6570\u91cf",
                "tools.adComponentKitProbe.state.textLayerCount": "\u6587\u672c\u5c42",
                "tools.adComponentKitProbe.state.twoDLayerCount": "2D \u56fe\u5c42",
                "tools.adComponentKitProbe.state.selectedControllerType": "\u63a7\u5236\u5668",
                "tools.adComponentKitProbe.state.canCreateFeatureStack": "\u53ef\u521b\u5efa\u5356\u70b9\u80f6\u56ca",
                "tools.adComponentKitProbe.state.canCreateIconGrid": "\u53ef\u521b\u5efa\u56fe\u6807\u7f51\u683c",
                "tools.adComponentKitProbe.fields.componentKind": "\u7ec4\u4ef6\u7c7b\u578b",
                "tools.adComponentKitProbe.options.featureStack": "\u5356\u70b9\u80f6\u56ca",
                "tools.adComponentKitProbe.options.featureStackDescription": "\u521b\u5efa\u57fa\u4e8e\u6587\u672c\u7684\u80f6\u56ca\u884c\u3002",
                "tools.adComponentKitProbe.options.iconGrid": "\u56fe\u6807\u7f51\u683c",
                "tools.adComponentKitProbe.options.iconGridDescription": "\u5c06\u9009\u4e2d\u7684 2D \u56fe\u5c42\u6392\u5217\u4e3a\u7f51\u683c\u3002",
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
                "tools.adComponentKitProbe.fields.columns": "\u5217\u6570",
                "tools.adComponentKitProbe.fields.normalizeMode": "\u7edf\u4e00\u5c3a\u5bf8\u6a21\u5f0f",
                "tools.adComponentKitProbe.fields.targetWidth": "\u76ee\u6807\u5bbd\u5ea6",
                "tools.adComponentKitProbe.fields.targetHeight": "\u76ee\u6807\u9ad8\u5ea6",
                "tools.adComponentKitProbe.fields.cellWidth": "\u5355\u5143\u683c\u5bbd\u5ea6",
                "tools.adComponentKitProbe.fields.cellHeight": "\u5355\u5143\u683c\u9ad8\u5ea6",
                "tools.adComponentKitProbe.fields.gapX": "\u95f4\u8ddd X",
                "tools.adComponentKitProbe.fields.gapY": "\u95f4\u8ddd Y",
                "tools.adComponentKitProbe.fields.lastRowAlign": "\u6700\u540e\u4e00\u884c\u5bf9\u9f50",
                "tools.adComponentKitProbe.fields.gridSortMode": "\u7f51\u683c\u6392\u5e8f",
                "tools.adComponentKitProbe.actions.createFeatureStack": "\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u6761",
                "tools.adComponentKitProbe.actions.createIconGrid": "\u521b\u5efa\u56fe\u6807\u7f51\u683c",
                "tools.adComponentKitProbe.notes.debugOnly": "\u8fd9\u662f\u4ec5\u7528\u4e8e\u8c03\u8bd5\u7684\u63a2\u9488\uff0c\u4e0d\u66ff\u6362\u6b63\u5f0f\u7535\u5546\u7ec4\u4ef6\u5de5\u5177\u7bb1\u3002",
                "tools.adComponentKitProbe.status.stateReady": "\u7535\u5546\u7ec4\u4ef6\u63a2\u9488\u72b6\u6001\u5df2\u5237\u65b0\u3002",
                "tools.adComponentKitProbe.status.stateFailed": "\u65e0\u6cd5\u8bfb\u53d6\u7535\u5546\u7ec4\u4ef6\u72b6\u6001\u3002",
                "tools.adComponentKitProbe.status.hostUnavailable": "\u7535\u5546\u7ec4\u4ef6 host action \u4e0d\u53ef\u7528\u3002",
                "tools.adComponentKitProbe.status.noComp": "\u8bf7\u6253\u5f00\u5408\u6210\u3002",
                "tools.adComponentKitProbe.status.noSelection": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u6587\u672c\u5c42\u3002",
                "tools.adComponentKitProbe.status.noTextSelection": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u6587\u672c\u5c42\u3002",
                "tools.adComponentKitProbe.status.noSupportedSelection": "\u8bf7\u9009\u62e9\u6587\u672c\u5c42\u521b\u5efa\u5356\u70b9\u80f6\u56ca\uff0c\u6216\u9009\u62e9 2D \u56fe\u5c42\u521b\u5efa\u56fe\u6807\u7f51\u683c\u3002",
                "tools.adComponentKitProbe.status.noIconGridSelection": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u53d7\u652f\u6301\u7684 2D \u56fe\u5c42\u3002",
                "tools.adComponentKitProbe.status.featureReady": "\u5356\u70b9\u80f6\u56ca\u6587\u672c\u9009\u533a\u5df2\u5c31\u7eea\u3002",
                "tools.adComponentKitProbe.status.iconGridReady": "\u56fe\u6807\u7f51\u683c\u56fe\u5c42\u9009\u533a\u5df2\u5c31\u7eea\u3002",
                "tools.adComponentKitProbe.status.creatingFeatureStack": "\u6b63\u5728\u901a\u8fc7\u63a2\u9488\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u6761...",
                "tools.adComponentKitProbe.status.createdFeatureStack": "\u5df2\u901a\u8fc7\u63a2\u9488\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u6761\u3002",
                "tools.adComponentKitProbe.status.createFailed": "\u5356\u70b9\u80f6\u56ca\u63a2\u9488\u5931\u8d25\u3002",
                "tools.adComponentKitProbe.status.creatingIconGrid": "\u6b63\u5728\u901a\u8fc7\u63a2\u9488\u521b\u5efa\u56fe\u6807\u7f51\u683c...",
                "tools.adComponentKitProbe.status.createdIconGrid": "\u5df2\u901a\u8fc7\u63a2\u9488\u521b\u5efa\u56fe\u6807\u7f51\u683c\u3002",
                "tools.adComponentKitProbe.status.createIconGridFailed": "\u56fe\u6807\u7f51\u683c\u63a2\u9488\u5931\u8d25\u3002"
            }
        }
    });
})();
