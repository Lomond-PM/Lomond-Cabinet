(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.adComponentKit = AEToolbox.tools.adComponentKit || {};

    AEToolbox.registerTool({
        id: "ecommerceLayout",
        titleKey: "tools.adComponentKit.title",
        descriptionKey: "tools.adComponentKit.description",
        category: "layout",
        iconText: "A",
        storageKey: "AEToolbox.ecommerceLayout.v1",
        stateAction: {
            hostFunction: "AEToolbox.tools.adComponentKit.getState",
            intervalMs: 1000
        },
        stateCard: {
            titleKey: "tools.adComponentKit.sections.state",
            fields: [
                {
                    stateKey: "activeComp",
                    labelKey: "tools.adComponentKit.state.activeComp"
                },
                {
                    stateKey: "selectionCount",
                    labelKey: "tools.adComponentKit.state.selectionCount"
                },
                {
                    stateKey: "textLayerCount",
                    labelKey: "tools.adComponentKit.state.textLayerCount"
                },
                {
                    stateKey: "twoDLayerCount",
                    labelKey: "tools.adComponentKit.state.twoDLayerCount"
                },
                {
                    stateKey: "selectedControllerType",
                    labelKey: "tools.adComponentKit.state.selectedControllerType"
                },
                {
                    stateKey: "canCreateFeatureStack",
                    labelKey: "tools.adComponentKit.state.canCreateFeatureStack"
                },
                {
                    stateKey: "canCreateIconGrid",
                    labelKey: "tools.adComponentKit.state.canCreateIconGrid"
                },
                {
                    stateKey: "canRemoveGeneratedComponent",
                    labelKey: "tools.adComponentKit.state.canRemoveGeneratedComponent"
                }
            ]
        },
        sections: [
            {
                id: "component",
                labelKey: "tools.adComponentKit.sections.component",
                descriptionKey: "tools.adComponentKit.sections.componentDescription",
                fields: [
                    {
                        type: "tabs",
                        key: "componentKind",
                        labelKey: "tools.adComponentKit.fields.componentKind",
                        defaultValue: "featureStack",
                        options: [
                            {
                                value: "featureStack",
                                labelKey: "tools.adComponentKit.options.featureStack",
                                descriptionKey: "tools.adComponentKit.options.featureStackDescription",
                                iconText: "F"
                            },
                            {
                                value: "iconGrid",
                                labelKey: "tools.adComponentKit.options.iconGrid",
                                descriptionKey: "tools.adComponentKit.options.iconGridDescription",
                                iconText: "I"
                            }
                        ]
                    },
                    {
                        type: "divider",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "range",
                        key: "gap",
                        labelKey: "tools.adComponentKit.fields.gap",
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
                        labelKey: "tools.adComponentKit.fields.paddingX",
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
                        labelKey: "tools.adComponentKit.fields.paddingY",
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
                        labelKey: "tools.adComponentKit.fields.cornerRadius",
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
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.adComponentKit.fields.fillColor",
                        defaultValue: "#d6b25e",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        }
                    },
                    {
                        type: "select",
                        key: "pillWidthMode",
                        labelKey: "tools.adComponentKit.fields.pillWidthMode",
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
                        type: "number",
                        key: "fixedWidth",
                        labelKey: "tools.adComponentKit.fields.fixedWidth",
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
                        type: "select",
                        key: "textAlign",
                        labelKey: "tools.adComponentKit.fields.textAlign",
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
                        labelKey: "tools.adComponentKit.fields.sortMode",
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
                        labelKey: "tools.adComponentKit.actions.createFeatureStack",
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
                        pendingMessageKey: "tools.adComponentKit.status.creatingFeatureStack",
                        successMessageKey: "tools.adComponentKit.status.createdFeatureStack",
                        errorMessageKey: "tools.adComponentKit.status.createFeatureStackFailed"
                    },
                    {
                        type: "button",
                        key: "refreshSelectedComponentFeature",
                        labelKey: "tools.adComponentKit.actions.refreshSelectedComponent",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "refreshSelectedComponent",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
                        enabledWhen: {
                            stateKey: "canRefresh",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKit.status.refreshingComponent",
                        successMessageKey: "tools.adComponentKit.status.componentRefreshed",
                        errorMessageKey: "tools.adComponentKit.status.componentMaintenanceFailed"
                    },
                    {
                        type: "button",
                        key: "selectComponentLayersFeature",
                        labelKey: "tools.adComponentKit.actions.selectComponentLayers",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "selectComponentLayers",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
                        enabledWhen: {
                            stateKey: "canSelectLayers",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKit.status.selectingComponentLayers",
                        successMessageKey: "tools.adComponentKit.status.componentLayersSelected",
                        errorMessageKey: "tools.adComponentKit.status.componentMaintenanceFailed"
                    },
                    {
                        type: "button",
                        key: "removeSelectedGeneratedComponentFeature",
                        labelKey: "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "removeSelectedGeneratedComponent",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "featureStack"
                        },
                        enabledWhen: {
                            stateKey: "canRemoveGeneratedComponent",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKit.status.removingGeneratedComponent",
                        successMessageKey: "tools.adComponentKit.status.generatedComponentRemoved",
                        errorMessageKey: "tools.adComponentKit.status.generatedComponentRemoveFailed"
                    },
                    {
                        type: "info",
                        labelKey: "tools.adComponentKit.notes.iconGridAdvanced",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        }
                    },
                    {
                        type: "range",
                        key: "columns",
                        labelKey: "tools.adComponentKit.fields.columns",
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
                        labelKey: "tools.adComponentKit.fields.normalizeMode",
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
                        labelKey: "tools.adComponentKit.fields.targetWidth",
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
                        labelKey: "tools.adComponentKit.fields.targetHeight",
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
                        labelKey: "tools.adComponentKit.fields.cellWidth",
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
                        labelKey: "tools.adComponentKit.fields.cellHeight",
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
                        labelKey: "tools.adComponentKit.fields.gapX",
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
                        labelKey: "tools.adComponentKit.fields.gapY",
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
                        labelKey: "tools.adComponentKit.fields.lastRowAlign",
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
                        labelKey: "tools.adComponentKit.fields.gridSortMode",
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
                        labelKey: "tools.adComponentKit.actions.createIconGrid",
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
                        pendingMessageKey: "tools.adComponentKit.status.creatingIconGrid",
                        successMessageKey: "tools.adComponentKit.status.createdIconGrid",
                        errorMessageKey: "tools.adComponentKit.status.createIconGridFailed"
                    },
                    {
                        type: "button",
                        key: "refreshSelectedComponentIcon",
                        labelKey: "tools.adComponentKit.actions.refreshSelectedComponent",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "refreshSelectedComponent",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        enabledWhen: {
                            stateKey: "canRefresh",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKit.status.refreshingComponent",
                        successMessageKey: "tools.adComponentKit.status.componentRefreshed",
                        errorMessageKey: "tools.adComponentKit.status.componentMaintenanceFailed"
                    },
                    {
                        type: "button",
                        key: "selectComponentLayersIcon",
                        labelKey: "tools.adComponentKit.actions.selectComponentLayers",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "selectComponentLayers",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        enabledWhen: {
                            stateKey: "canSelectLayers",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKit.status.selectingComponentLayers",
                        successMessageKey: "tools.adComponentKit.status.componentLayersSelected",
                        errorMessageKey: "tools.adComponentKit.status.componentMaintenanceFailed"
                    },
                    {
                        type: "button",
                        key: "removeSelectedGeneratedComponentIcon",
                        labelKey: "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "removeSelectedGeneratedComponent",
                        visibleWhen: {
                            key: "componentKind",
                            equals: "iconGrid"
                        },
                        enabledWhen: {
                            stateKey: "canRemoveGeneratedComponent",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.adComponentKit.status.removingGeneratedComponent",
                        successMessageKey: "tools.adComponentKit.status.generatedComponentRemoved",
                        errorMessageKey: "tools.adComponentKit.status.generatedComponentRemoveFailed"
                    }
                ]
            }
        ],
        actions: [
            {
                id: "createFeatureStack",
                labelKey: "tools.adComponentKit.actions.createFeatureStack",
                hostFunction: "AEToolbox.tools.adComponentKit.createFeatureStack",
                style: "primary",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKit.status.creatingFeatureStack",
                successMessageKey: "tools.adComponentKit.status.createdFeatureStack",
                errorMessageKey: "tools.adComponentKit.status.createFeatureStackFailed",
                hidden: true,
                fieldOnly: true
            },
            {
                id: "createIconGrid",
                labelKey: "tools.adComponentKit.actions.createIconGrid",
                hostFunction: "AEToolbox.tools.adComponentKit.createIconGrid",
                style: "primary",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKit.status.creatingIconGrid",
                successMessageKey: "tools.adComponentKit.status.createdIconGrid",
                errorMessageKey: "tools.adComponentKit.status.createIconGridFailed",
                hidden: true,
                fieldOnly: true
            },
            {
                id: "refreshSelectedComponent",
                labelKey: "tools.adComponentKit.actions.refreshSelectedComponent",
                hostFunction: "AEToolbox.tools.adComponentKit.refreshSelectedComponent",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKit.status.refreshingComponent",
                successMessageKey: "tools.adComponentKit.status.componentRefreshed",
                errorMessageKey: "tools.adComponentKit.status.componentMaintenanceFailed",
                hidden: true,
                fieldOnly: true
            },
            {
                id: "selectComponentLayers",
                labelKey: "tools.adComponentKit.actions.selectComponentLayers",
                hostFunction: "AEToolbox.tools.adComponentKit.selectComponentLayers",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKit.status.selectingComponentLayers",
                successMessageKey: "tools.adComponentKit.status.componentLayersSelected",
                errorMessageKey: "tools.adComponentKit.status.componentMaintenanceFailed",
                hidden: true,
                fieldOnly: true
            },
            {
                id: "removeSelectedGeneratedComponent",
                labelKey: "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
                hostFunction: "AEToolbox.tools.adComponentKit.removeSelectedGeneratedComponent",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.adComponentKit.status.removingGeneratedComponent",
                successMessageKey: "tools.adComponentKit.status.generatedComponentRemoved",
                errorMessageKey: "tools.adComponentKit.status.generatedComponentRemoveFailed",
                hidden: true,
                fieldOnly: true
            }
        ],
        i18n: {
            en: {
                "tools.adComponentKit.title": "Ad Component Kit",
                "tools.adComponentKit.description": "Create text feature stacks, icon grids, and maintain generated ad components.",
                "tools.adComponentKit.sections.state": "Component State",
                "tools.adComponentKit.sections.component": "Component Builder",
                "tools.adComponentKit.sections.componentDescription": "Choose one component type and tune only the relevant settings.",
                "tools.adComponentKit.state.activeComp": "Active Comp",
                "tools.adComponentKit.state.selectionCount": "Selection",
                "tools.adComponentKit.state.textLayerCount": "Text Layers",
                "tools.adComponentKit.state.twoDLayerCount": "2D Layers",
                "tools.adComponentKit.state.selectedControllerType": "Controller",
                "tools.adComponentKit.state.canCreateFeatureStack": "Can Create Feature Stack",
                "tools.adComponentKit.state.canCreateIconGrid": "Can Create Icon Grid",
                "tools.adComponentKit.state.canRemoveGeneratedComponent": "Can Remove Generated Component",
                "tools.adComponentKit.fields.componentKind": "Component Type",
                "tools.adComponentKit.options.featureStack": "Feature Stack",
                "tools.adComponentKit.options.featureStackDescription": "Create centered pill rows from selected text layers.",
                "tools.adComponentKit.options.iconGrid": "Icon Grid",
                "tools.adComponentKit.options.iconGridDescription": "Arrange selected 2D layers into a normalized grid.",
                "tools.adComponentKit.fields.gap": "Gap",
                "tools.adComponentKit.fields.paddingX": "Padding X",
                "tools.adComponentKit.fields.paddingY": "Padding Y",
                "tools.adComponentKit.fields.cornerRadius": "Corner Radius",
                "tools.adComponentKit.fields.fillColor": "Fill Color",
                "tools.adComponentKit.fields.pillWidthMode": "Pill Width Mode",
                "tools.adComponentKit.fields.fixedWidth": "Fixed Width",
                "tools.adComponentKit.fields.textAlign": "Text Align",
                "tools.adComponentKit.fields.sortMode": "Sort",
                "tools.adComponentKit.fields.columns": "Columns",
                "tools.adComponentKit.fields.normalizeMode": "Normalize Mode",
                "tools.adComponentKit.fields.targetWidth": "Target Width",
                "tools.adComponentKit.fields.targetHeight": "Target Height",
                "tools.adComponentKit.fields.cellWidth": "Cell Width",
                "tools.adComponentKit.fields.cellHeight": "Cell Height",
                "tools.adComponentKit.fields.gapX": "Gap X",
                "tools.adComponentKit.fields.gapY": "Gap Y",
                "tools.adComponentKit.fields.lastRowAlign": "Last Row Align",
                "tools.adComponentKit.fields.gridSortMode": "Sort",
                "tools.adComponentKit.notes.iconGridAdvanced": "Icon Grid is kept in this unified tool, but it remains an advanced workflow.",
                "tools.adComponentKit.actions.createFeatureStack": "Create Feature Stack",
                "tools.adComponentKit.actions.createIconGrid": "Create Icon Grid",
                "tools.adComponentKit.actions.refreshSelectedComponent": "Refresh Selected Component",
                "tools.adComponentKit.actions.selectComponentLayers": "Select Component Layers",
                "tools.adComponentKit.actions.removeSelectedGeneratedComponent": "Remove Selected Generated Component",
                "tools.adComponentKit.status.creatingFeatureStack": "Creating Feature Stack...",
                "tools.adComponentKit.status.createdFeatureStack": "Feature Stack created.",
                "tools.adComponentKit.status.createFeatureStackFailed": "Select one or more text layers.",
                "tools.adComponentKit.status.creatingIconGrid": "Creating Icon Grid...",
                "tools.adComponentKit.status.createdIconGrid": "Icon Grid created.",
                "tools.adComponentKit.status.createIconGridFailed": "Select one or more supported 2D layers.",
                "tools.adComponentKit.status.refreshingComponent": "Refreshing selected component...",
                "tools.adComponentKit.status.componentRefreshed": "Component refreshed.",
                "tools.adComponentKit.status.selectingComponentLayers": "Selecting component layers...",
                "tools.adComponentKit.status.componentLayersSelected": "Component layers selected.",
                "tools.adComponentKit.status.removingGeneratedComponent": "Removing generated component...",
                "tools.adComponentKit.status.generatedComponentRemoved": "Generated component removed.",
                "tools.adComponentKit.status.generatedComponentRemoveFailed": "Select a new generated component layer with Lomond metadata.",
                "tools.adComponentKit.status.componentMaintenanceFailed": "Select a generated component controller."
            },
            "zh-CN": {
                "tools.adComponentKit.title": "\u7535\u5546\u7ec4\u4ef6\u5de5\u5177\u7bb1",
                "tools.adComponentKit.description": "\u521b\u5efa\u5356\u70b9\u80f6\u56ca\u3001\u56fe\u6807\u7f51\u683c\uff0c\u5e76\u7ef4\u62a4\u5df2\u751f\u6210\u7684\u7535\u5546\u7ec4\u4ef6\u3002",
                "tools.adComponentKit.sections.state": "\u7ec4\u4ef6\u72b6\u6001",
                "tools.adComponentKit.sections.component": "\u7ec4\u4ef6\u6784\u5efa",
                "tools.adComponentKit.sections.componentDescription": "\u9009\u62e9\u4e00\u79cd\u7ec4\u4ef6\u7c7b\u578b\uff0c\u53ea\u8c03\u6574\u76f8\u5173\u53c2\u6570\u3002",
                "tools.adComponentKit.state.activeComp": "\u6fc0\u6d3b\u5408\u6210",
                "tools.adComponentKit.state.selectionCount": "\u9009\u4e2d\u6570\u91cf",
                "tools.adComponentKit.state.textLayerCount": "\u6587\u672c\u5c42",
                "tools.adComponentKit.state.twoDLayerCount": "2D \u56fe\u5c42",
                "tools.adComponentKit.state.selectedControllerType": "\u63a7\u5236\u5668",
                "tools.adComponentKit.state.canCreateFeatureStack": "\u53ef\u521b\u5efa\u5356\u70b9\u80f6\u56ca",
                "tools.adComponentKit.state.canCreateIconGrid": "\u53ef\u521b\u5efa\u56fe\u6807\u7f51\u683c",
                "tools.adComponentKit.state.canRemoveGeneratedComponent": "\u53ef\u79fb\u9664\u751f\u6210\u7ec4\u4ef6",
                "tools.adComponentKit.fields.componentKind": "\u7ec4\u4ef6\u7c7b\u578b",
                "tools.adComponentKit.options.featureStack": "\u5356\u70b9\u80f6\u56ca",
                "tools.adComponentKit.options.featureStackDescription": "\u5c06\u9009\u4e2d\u6587\u672c\u5c42\u521b\u5efa\u4e3a\u5c45\u4e2d\u80f6\u56ca\u884c\u3002",
                "tools.adComponentKit.options.iconGrid": "\u56fe\u6807\u7f51\u683c",
                "tools.adComponentKit.options.iconGridDescription": "\u5c06\u9009\u4e2d\u7684 2D \u56fe\u5c42\u6392\u5217\u4e3a\u7edf\u4e00\u7f51\u683c\u3002",
                "tools.adComponentKit.fields.gap": "\u95f4\u8ddd",
                "tools.adComponentKit.fields.paddingX": "Padding X",
                "tools.adComponentKit.fields.paddingY": "Padding Y",
                "tools.adComponentKit.fields.cornerRadius": "\u5706\u89d2\u534a\u5f84",
                "tools.adComponentKit.fields.fillColor": "\u586b\u5145\u989c\u8272",
                "tools.adComponentKit.fields.pillWidthMode": "\u80f6\u56ca\u5bbd\u5ea6\u6a21\u5f0f",
                "tools.adComponentKit.fields.fixedWidth": "\u56fa\u5b9a\u5bbd\u5ea6",
                "tools.adComponentKit.fields.textAlign": "\u6587\u672c\u5bf9\u9f50",
                "tools.adComponentKit.fields.sortMode": "\u6392\u5e8f",
                "tools.adComponentKit.fields.columns": "\u5217\u6570",
                "tools.adComponentKit.fields.normalizeMode": "\u7edf\u4e00\u5c3a\u5bf8\u6a21\u5f0f",
                "tools.adComponentKit.fields.targetWidth": "\u76ee\u6807\u5bbd\u5ea6",
                "tools.adComponentKit.fields.targetHeight": "\u76ee\u6807\u9ad8\u5ea6",
                "tools.adComponentKit.fields.cellWidth": "\u5355\u5143\u683c\u5bbd\u5ea6",
                "tools.adComponentKit.fields.cellHeight": "\u5355\u5143\u683c\u9ad8\u5ea6",
                "tools.adComponentKit.fields.gapX": "\u95f4\u8ddd X",
                "tools.adComponentKit.fields.gapY": "\u95f4\u8ddd Y",
                "tools.adComponentKit.fields.lastRowAlign": "\u6700\u540e\u4e00\u884c\u5bf9\u9f50",
                "tools.adComponentKit.fields.gridSortMode": "\u7f51\u683c\u6392\u5e8f",
                "tools.adComponentKit.notes.iconGridAdvanced": "\u56fe\u6807\u7f51\u683c\u4fdd\u7559\u5728\u7edf\u4e00\u5de5\u5177\u4e2d\uff0c\u4f46\u4ecd\u5c5e\u4e8e\u8fdb\u9636\u5de5\u4f5c\u6d41\u3002",
                "tools.adComponentKit.actions.createFeatureStack": "\u521b\u5efa\u5356\u70b9\u80f6\u56ca",
                "tools.adComponentKit.actions.createIconGrid": "\u521b\u5efa\u56fe\u6807\u7f51\u683c",
                "tools.adComponentKit.actions.refreshSelectedComponent": "\u5237\u65b0\u9009\u4e2d\u7ec4\u4ef6",
                "tools.adComponentKit.actions.selectComponentLayers": "\u9009\u62e9\u7ec4\u4ef6\u56fe\u5c42",
                "tools.adComponentKit.actions.removeSelectedGeneratedComponent": "\u79fb\u9664\u9009\u4e2d\u751f\u6210\u7ec4\u4ef6",
                "tools.adComponentKit.status.creatingFeatureStack": "\u6b63\u5728\u521b\u5efa\u5356\u70b9\u80f6\u56ca...",
                "tools.adComponentKit.status.createdFeatureStack": "\u5356\u70b9\u80f6\u56ca\u5df2\u521b\u5efa\u3002",
                "tools.adComponentKit.status.createFeatureStackFailed": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u6587\u672c\u5c42\u3002",
                "tools.adComponentKit.status.creatingIconGrid": "\u6b63\u5728\u521b\u5efa\u56fe\u6807\u7f51\u683c...",
                "tools.adComponentKit.status.createdIconGrid": "\u56fe\u6807\u7f51\u683c\u5df2\u521b\u5efa\u3002",
                "tools.adComponentKit.status.createIconGridFailed": "\u8bf7\u9009\u62e9\u4e00\u4e2a\u6216\u591a\u4e2a\u53d7\u652f\u6301\u7684 2D \u56fe\u5c42\u3002",
                "tools.adComponentKit.status.refreshingComponent": "\u6b63\u5728\u5237\u65b0\u9009\u4e2d\u7ec4\u4ef6...",
                "tools.adComponentKit.status.componentRefreshed": "\u7ec4\u4ef6\u5df2\u5237\u65b0\u3002",
                "tools.adComponentKit.status.selectingComponentLayers": "\u6b63\u5728\u9009\u62e9\u7ec4\u4ef6\u56fe\u5c42...",
                "tools.adComponentKit.status.componentLayersSelected": "\u5df2\u9009\u62e9\u7ec4\u4ef6\u56fe\u5c42\u3002",
                "tools.adComponentKit.status.removingGeneratedComponent": "\u6b63\u5728\u79fb\u9664\u751f\u6210\u7ec4\u4ef6...",
                "tools.adComponentKit.status.generatedComponentRemoved": "\u751f\u6210\u7ec4\u4ef6\u5df2\u79fb\u9664\u3002",
                "tools.adComponentKit.status.generatedComponentRemoveFailed": "\u8bf7\u9009\u62e9\u5e26\u6709 Lomond metadata \u7684\u65b0\u751f\u6210\u7ec4\u4ef6\u56fe\u5c42\u3002",
                "tools.adComponentKit.status.componentMaintenanceFailed": "\u8bf7\u9009\u62e9\u5df2\u751f\u6210\u7684\u7ec4\u4ef6\u63a7\u5236\u5668\u3002"
            }
        }
    });
})();
