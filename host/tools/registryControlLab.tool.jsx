(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.registryControlLab = AEToolbox.tools.registryControlLab || {};
    AEToolbox.tools.registryControlLab._stateCount = AEToolbox.tools.registryControlLab._stateCount || 0;

    AEToolbox.tools.registryControlLab.getState = function () {
        var comp = app.project && app.project.activeItem;
        var hasComp = !!(comp && comp instanceof CompItem);
        var selectedCount = 0;

        AEToolbox.tools.registryControlLab._stateCount += 1;
        if (hasComp && comp.selectedLayers) {
            selectedCount = comp.selectedLayers.length;
        }

        return AEToolbox.stringify({
            ok: true,
            messageKey: "tools.registryControlLab.status.stateRefreshed",
            state: {
                hasComp: hasComp,
                compName: hasComp ? comp.name : "",
                selectedCount: selectedCount,
                refreshCount: AEToolbox.tools.registryControlLab._stateCount
            }
        });
    };

    AEToolbox.tools.registryControlLab.previewValues = function (paramsJson) {
        var params = {};

        try {
            params = AEToolbox.parseJson(paramsJson || "{}");
        } catch (err) {
            params = {};
        }

        if (params.forceError) {
            return AEToolbox.stringify({
                ok: false,
                received: params
            });
        }

        if (params.omitMessageKey) {
            return AEToolbox.stringify({
                ok: true,
                received: params
            });
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
        stateAction: {
            hostFunction: "AEToolbox.tools.registryControlLab.getState",
            intervalMs: 1200
        },
        stateCard: {
            titleKey: "tools.registryControlLab.sections.state",
            fields: [
                {
                    stateKey: "compName",
                    labelKey: "tools.registryControlLab.state.compName"
                },
                {
                    stateKey: "selectedCount",
                    labelKey: "tools.registryControlLab.state.selectedCount"
                },
                {
                    stateKey: "refreshCount",
                    labelKey: "tools.registryControlLab.state.refreshCount"
                }
            ]
        },
        sections: [
            {
                id: "basic",
                labelKey: "tools.registryControlLab.sections.basic",
                descriptionKey: "tools.registryControlLab.sections.basicDescription",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.registryControlLab.notes.basic"
                    },
                    {
                        type: "text",
                        key: "textValue",
                        labelKey: "tools.registryControlLab.fields.textValue",
                        hintKey: "tools.registryControlLab.hints.textValue",
                        defaultValue: "Sample text"
                    },
                    {
                        type: "textarea",
                        key: "noteValue",
                        labelKey: "tools.registryControlLab.fields.noteValue",
                        hintKey: "tools.registryControlLab.hints.noteValue",
                        defaultValue: "Multiline note"
                    },
                    {
                        type: "divider"
                    },
                    {
                        type: "number",
                        key: "numberValue",
                        labelKey: "tools.registryControlLab.fields.numberValue",
                        hintKey: "tools.registryControlLab.hints.numberValue",
                        defaultValue: 12,
                        min: 0,
                        max: 100,
                        step: 1
                    },
                    {
                        type: "range",
                        key: "rangeValue",
                        labelKey: "tools.registryControlLab.fields.rangeValue",
                        hintKey: "tools.registryControlLab.hints.rangeValue",
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
                descriptionKey: "tools.registryControlLab.sections.optionsDescription",
                fields: [
                    {
                        type: "checkbox",
                        key: "enabled",
                        labelKey: "tools.registryControlLab.fields.enabled",
                        hintKey: "tools.registryControlLab.hints.enabled",
                        defaultValue: true
                    },
                    {
                        type: "select",
                        key: "mode",
                        labelKey: "tools.registryControlLab.fields.mode",
                        hintKey: "tools.registryControlLab.hints.mode",
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
                descriptionKey: "tools.registryControlLab.sections.colorsDescription",
                fields: [
                    {
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.registryControlLab.fields.fillColor",
                        hintKey: "tools.registryControlLab.hints.fillColor",
                        defaultValue: "#c9a452"
                    },
                    {
                        type: "color",
                        key: "strokeColor",
                        labelKey: "tools.registryControlLab.fields.strokeColor",
                        hintKey: "tools.registryControlLab.hints.strokeColor",
                        defaultValue: "#ffffff"
                    }
                ]
            },
            {
                id: "togglePanel",
                labelKey: "tools.registryControlLab.sections.togglePanel",
                descriptionKey: "tools.registryControlLab.sections.togglePanelDescription",
                toggleKey: "enableTogglePanel",
                defaultEnabled: true,
                collapsible: true,
                fields: [
                    {
                        type: "text",
                        key: "toggleText",
                        labelKey: "tools.registryControlLab.fields.toggleText",
                        hintKey: "tools.registryControlLab.hints.toggleText",
                        defaultValue: "Enabled section"
                    },
                    {
                        type: "number",
                        key: "toggleNumber",
                        labelKey: "tools.registryControlLab.fields.toggleNumber",
                        hintKey: "tools.registryControlLab.hints.toggleNumber",
                        defaultValue: 8,
                        min: 0,
                        max: 20,
                        step: 1
                    }
                ]
            },
            {
                id: "actions",
                labelKey: "tools.registryControlLab.sections.actions",
                descriptionKey: "tools.registryControlLab.sections.actionsDescription",
                fields: [
                    {
                        type: "button",
                        key: "secondaryButton",
                        labelKey: "tools.registryControlLab.actions.secondaryButton",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "previewValues"
                    },
                    {
                        type: "button",
                        key: "primaryButton",
                        labelKey: "tools.registryControlLab.actions.primaryButton",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "previewValues"
                    },
                    {
                        type: "button",
                        key: "bilingualButton",
                        labelKey: "tools.registryControlLab.actions.bilingualButton",
                        secondaryText: "rectangle",
                        secondaryTextType: "matchName",
                        textLayout: "centerAxisPair",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "previewValues"
                    }
                ]
            },
            {
                id: "actionState",
                labelKey: "tools.registryControlLab.sections.actionState",
                descriptionKey: "tools.registryControlLab.sections.actionStateDescription",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.registryControlLab.notes.actionState"
                    },
                    {
                        type: "button",
                        key: "payloadButton",
                        labelKey: "tools.registryControlLab.actions.payloadButton",
                        secondaryText: "payload",
                        textLayout: "centerAxisPair",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "previewValues",
                        actionPayload: {
                            payloadKey: "rectangle",
                            matchName: "ADBE Vector Shape - Rect",
                            omitMessageKey: true
                        },
                        pendingMessageKey: "tools.registryControlLab.status.payloadPending",
                        successMessageKey: "tools.registryControlLab.status.payloadReceived",
                        errorMessageKey: "tools.registryControlLab.status.payloadFailed"
                    },
                    {
                        type: "button",
                        key: "stateDisabledButton",
                        labelKey: "tools.registryControlLab.actions.stateDisabledButton",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "previewValues",
                        enabledWhen: {
                            stateKey: "hasComp",
                            equals: true
                        },
                        actionPayload: {
                            source: "stateDisabledButton"
                        },
                        pendingMessageKey: "tools.registryControlLab.status.stateButtonPending",
                        successMessageKey: "tools.registryControlLab.status.stateButtonSuccess"
                    },
                    {
                        type: "button",
                        key: "fallbackErrorButton",
                        labelKey: "tools.registryControlLab.actions.fallbackErrorButton",
                        variant: "secondary",
                        fullWidth: true,
                        actionId: "previewValues",
                        actionPayload: {
                            source: "fallbackErrorButton",
                            forceError: true
                        },
                        pendingMessageKey: "tools.registryControlLab.status.fallbackErrorPending",
                        errorMessageKey: "tools.registryControlLab.status.fallbackErrorShown"
                    },
                    {
                        type: "button",
                        key: "refreshAfterRunButton",
                        labelKey: "tools.registryControlLab.actions.refreshAfterRunButton",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "previewValues",
                        refreshStateAfterRun: true,
                        actionPayload: {
                            source: "refreshAfterRunButton"
                        },
                        pendingMessageKey: "tools.registryControlLab.status.refreshAfterRunPending",
                        successMessageKey: "tools.registryControlLab.status.refreshAfterRunSuccess"
                    }
                ]
            },
            {
                id: "tabs",
                labelKey: "tools.registryControlLab.sections.tabs",
                descriptionKey: "tools.registryControlLab.sections.tabsDescription",
                fields: [
                    {
                        type: "tabs",
                        key: "componentType",
                        labelKey: "tools.registryControlLab.fields.componentType",
                        hintKey: "tools.registryControlLab.hints.componentType",
                        defaultValue: "feature",
                        options: [
                            {
                                value: "feature",
                                labelKey: "tools.registryControlLab.options.feature",
                                descriptionKey: "tools.registryControlLab.options.featureDescription",
                                iconText: "F"
                            },
                            {
                                value: "grid",
                                labelKey: "tools.registryControlLab.options.grid",
                                descriptionKey: "tools.registryControlLab.options.gridDescription",
                                iconText: "G"
                            }
                        ]
                    },
                    {
                        type: "number",
                        key: "featureOnlyGap",
                        labelKey: "tools.registryControlLab.fields.featureOnlyGap",
                        defaultValue: 24,
                        min: 0,
                        step: 1,
                        visibleWhen: {
                            key: "componentType",
                            equals: "feature"
                        }
                    },
                    {
                        type: "number",
                        key: "gridOnlyColumns",
                        labelKey: "tools.registryControlLab.fields.gridOnlyColumns",
                        defaultValue: 4,
                        min: 1,
                        max: 12,
                        step: 1,
                        visibleWhen: {
                            key: "componentType",
                            equals: "grid"
                        }
                    }
                ]
            }
        ],
        actions: [
            {
                id: "previewValues",
                labelKey: "tools.registryControlLab.actions.previewValues",
                hostFunction: "AEToolbox.tools.registryControlLab.previewValues",
                style: "primary",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.registryControlLab.status.previewPending",
                successMessageKey: "tools.registryControlLab.status.previewed",
                errorMessageKey: "tools.registryControlLab.status.previewFailed"
            }
        ],
        i18n: {
            en: {
                "tools.registryControlLab.title": "Registry Control Lab",
                "tools.registryControlLab.description": "Test the shared registry renderer with every standard control type.",
                "tools.registryControlLab.sections.basic": "Basic Controls",
                "tools.registryControlLab.sections.basicDescription": "Text, textarea, numeric entry, and slider behavior.",
                "tools.registryControlLab.sections.colors": "Colors",
                "tools.registryControlLab.sections.colorsDescription": "Color pills, hex values, and the HSV picker.",
                "tools.registryControlLab.sections.options": "Options",
                "tools.registryControlLab.sections.optionsDescription": "Switch and select controls using the shared black-gold UI.",
                "tools.registryControlLab.sections.togglePanel": "Toggle Section",
                "tools.registryControlLab.sections.togglePanelDescription": "Tests section-level enable and collapse behavior.",
                "tools.registryControlLab.sections.actions": "Large Buttons",
                "tools.registryControlLab.sections.actionsDescription": "Tests full-width registry action buttons and center-axis text layout.",
                "tools.registryControlLab.sections.tabs": "Tabs",
                "tools.registryControlLab.sections.tabsDescription": "Tests option cards and conditional field visibility.",
                "tools.registryControlLab.sections.state": "Host State",
                "tools.registryControlLab.sections.actionState": "Action and State",
                "tools.registryControlLab.sections.actionStateDescription": "Action payloads, state-driven disabled buttons, and state refresh hooks.",
                "tools.registryControlLab.fields.textValue": "Text",
                "tools.registryControlLab.fields.noteValue": "Note",
                "tools.registryControlLab.fields.numberValue": "Number",
                "tools.registryControlLab.fields.rangeValue": "Range",
                "tools.registryControlLab.fields.enabled": "Enabled",
                "tools.registryControlLab.fields.mode": "Mode",
                "tools.registryControlLab.fields.fillColor": "Fill Color",
                "tools.registryControlLab.fields.strokeColor": "Stroke Color",
                "tools.registryControlLab.fields.toggleText": "Toggle Text",
                "tools.registryControlLab.fields.toggleNumber": "Toggle Number",
                "tools.registryControlLab.fields.componentType": "Component Type",
                "tools.registryControlLab.fields.featureOnlyGap": "Feature Gap",
                "tools.registryControlLab.fields.gridOnlyColumns": "Grid Columns",
                "tools.registryControlLab.actions.previewValues": "Preview Values",
                "tools.registryControlLab.actions.secondaryButton": "Secondary Full-width Button",
                "tools.registryControlLab.actions.primaryButton": "Primary Full-width Button",
                "tools.registryControlLab.actions.bilingualButton": "Rectangle",
                "tools.registryControlLab.actions.payloadButton": "Send Payload",
                "tools.registryControlLab.actions.stateDisabledButton": "Requires Active Comp",
                "tools.registryControlLab.actions.fallbackErrorButton": "Test Error Fallback",
                "tools.registryControlLab.actions.refreshAfterRunButton": "Run and Refresh State",
                "tools.registryControlLab.options.feature": "Feature",
                "tools.registryControlLab.options.grid": "Grid",
                "tools.registryControlLab.options.featureDescription": "Show feature-only fields.",
                "tools.registryControlLab.options.gridDescription": "Show grid-only fields.",
                "tools.registryControlLab.status.previewed": "Received registry control values.",
                "tools.registryControlLab.status.previewPending": "Sending registry control values...",
                "tools.registryControlLab.status.previewFailed": "Registry control preview failed.",
                "tools.registryControlLab.status.stateRefreshed": "Registry host state refreshed.",
                "tools.registryControlLab.status.payloadPending": "Sending action payload...",
                "tools.registryControlLab.status.payloadReceived": "Action payload received.",
                "tools.registryControlLab.status.payloadFailed": "Action payload failed.",
                "tools.registryControlLab.status.stateButtonPending": "Running state-gated action...",
                "tools.registryControlLab.status.stateButtonSuccess": "State-gated action completed.",
                "tools.registryControlLab.status.fallbackErrorPending": "Testing error fallback...",
                "tools.registryControlLab.status.fallbackErrorShown": "Action-specific error fallback shown.",
                "tools.registryControlLab.status.refreshAfterRunPending": "Running action and refreshing state...",
                "tools.registryControlLab.status.refreshAfterRunSuccess": "Action completed and state refreshed.",
                "tools.registryControlLab.state.compName": "Comp",
                "tools.registryControlLab.state.selectedCount": "Selected Layers",
                "tools.registryControlLab.state.refreshCount": "Refresh Count",
                "tools.registryControlLab.notes.basic": "This lab validates shared controls only. It does not modify After Effects layers.",
                "tools.registryControlLab.notes.actionState": "Open a composition to enable the state-gated button. Payload values are sent only with that action and are not persisted.",
                "tools.registryControlLab.hints.textValue": "Single-line text input.",
                "tools.registryControlLab.hints.noteValue": "Multiline text area.",
                "tools.registryControlLab.hints.numberValue": "Type a value or drag horizontally.",
                "tools.registryControlLab.hints.rangeValue": "Number box and slider stay synchronized.",
                "tools.registryControlLab.hints.enabled": "Keeps the existing switch visual style.",
                "tools.registryControlLab.hints.mode": "Uses the existing custom select menu.",
                "tools.registryControlLab.hints.fillColor": "Opens the custom HSV color picker.",
                "tools.registryControlLab.hints.strokeColor": "Returns a normalized #rrggbb value.",
                "tools.registryControlLab.hints.toggleText": "This field is muted while the section is disabled.",
                "tools.registryControlLab.hints.toggleNumber": "The toggle value is still collected with form values.",
                "tools.registryControlLab.hints.componentType": "Switch tabs to test visibleWhen field behavior."
            },
            "zh-CN": {
                "tools.registryControlLab.title": "\u63a7\u4ef6\u6d4b\u8bd5\u5b9e\u9a8c\u5ba4",
                "tools.registryControlLab.description": "\u7528\u4e8e\u9a8c\u8bc1\u5171\u7528 registry renderer \u7684\u6240\u6709\u6807\u51c6\u63a7\u4ef6\u7c7b\u578b\u3002",
                "tools.registryControlLab.sections.basic": "\u57fa\u7840\u63a7\u4ef6",
                "tools.registryControlLab.sections.basicDescription": "\u9a8c\u8bc1\u6587\u672c\u3001\u591a\u884c\u6587\u672c\u3001\u6570\u503c\u8f93\u5165\u548c\u6ed1\u6746\u884c\u4e3a\u3002",
                "tools.registryControlLab.sections.colors": "\u989c\u8272",
                "tools.registryControlLab.sections.colorsDescription": "\u9a8c\u8bc1\u8272\u5757\u3001Hex \u503c\u548c HSV \u53d6\u8272\u5668\u3002",
                "tools.registryControlLab.sections.options": "\u9009\u9879",
                "tools.registryControlLab.sections.optionsDescription": "\u4f7f\u7528\u5171\u7528\u9ed1\u91d1 UI \u7684\u5f00\u5173\u548c\u4e0b\u62c9\u63a7\u4ef6\u3002",
                "tools.registryControlLab.sections.togglePanel": "\u5206\u533a\u5f00\u5173",
                "tools.registryControlLab.sections.togglePanelDescription": "\u9a8c\u8bc1\u5206\u533a\u7ea7\u542f\u7528\u548c\u6298\u53e0\u884c\u4e3a\u3002",
                "tools.registryControlLab.sections.actions": "\u5927\u578b\u6309\u94ae",
                "tools.registryControlLab.sections.actionsDescription": "\u9a8c\u8bc1\u6a2a\u5411\u586b\u6ee1\u7684 registry action button \u548c\u4e2d\u8f74\u53cc\u6587\u672c\u5e03\u5c40\u3002",
                "tools.registryControlLab.sections.tabs": "\u6807\u7b7e\u9875",
                "tools.registryControlLab.sections.tabsDescription": "\u9a8c\u8bc1\u9009\u9879\u5361\u548c\u6761\u4ef6\u5b57\u6bb5\u663e\u9690\u3002",
                "tools.registryControlLab.sections.state": "Host \u72b6\u6001",
                "tools.registryControlLab.sections.actionState": "\u64cd\u4f5c\u4e0e\u72b6\u6001",
                "tools.registryControlLab.sections.actionStateDescription": "\u9a8c\u8bc1 action payload\u3001\u72b6\u6001\u9a71\u52a8\u7684\u7981\u7528\u6309\u94ae\u548c\u6267\u884c\u540e\u72b6\u6001\u5237\u65b0\u3002",
                "tools.registryControlLab.fields.textValue": "\u6587\u672c",
                "tools.registryControlLab.fields.noteValue": "\u5907\u6ce8",
                "tools.registryControlLab.fields.numberValue": "\u6570\u503c",
                "tools.registryControlLab.fields.rangeValue": "\u6ed1\u6746",
                "tools.registryControlLab.fields.enabled": "\u542f\u7528",
                "tools.registryControlLab.fields.mode": "\u6a21\u5f0f",
                "tools.registryControlLab.fields.fillColor": "\u586b\u5145\u989c\u8272",
                "tools.registryControlLab.fields.strokeColor": "\u63cf\u8fb9\u989c\u8272",
                "tools.registryControlLab.fields.toggleText": "\u5f00\u5173\u6587\u672c",
                "tools.registryControlLab.fields.toggleNumber": "\u5f00\u5173\u6570\u503c",
                "tools.registryControlLab.fields.componentType": "\u7ec4\u4ef6\u7c7b\u578b",
                "tools.registryControlLab.fields.featureOnlyGap": "\u5356\u70b9\u95f4\u8ddd",
                "tools.registryControlLab.fields.gridOnlyColumns": "\u7f51\u683c\u5217\u6570",
                "tools.registryControlLab.actions.previewValues": "\u9884\u89c8\u53c2\u6570",
                "tools.registryControlLab.actions.secondaryButton": "\u6b21\u8981\u6a2a\u5411\u6309\u94ae",
                "tools.registryControlLab.actions.primaryButton": "\u4e3b\u8981\u6a2a\u5411\u6309\u94ae",
                "tools.registryControlLab.actions.bilingualButton": "\u77e9\u5f62",
                "tools.registryControlLab.actions.payloadButton": "\u53d1\u9001 Payload",
                "tools.registryControlLab.actions.stateDisabledButton": "\u9700\u8981\u6fc0\u6d3b\u5408\u6210",
                "tools.registryControlLab.actions.fallbackErrorButton": "\u6d4b\u8bd5\u9519\u8bef Fallback",
                "tools.registryControlLab.actions.refreshAfterRunButton": "\u6267\u884c\u5e76\u5237\u65b0\u72b6\u6001",
                "tools.registryControlLab.options.feature": "\u5356\u70b9",
                "tools.registryControlLab.options.grid": "\u7f51\u683c",
                "tools.registryControlLab.options.featureDescription": "\u663e\u793a\u5356\u70b9\u4e13\u5c5e\u5b57\u6bb5\u3002",
                "tools.registryControlLab.options.gridDescription": "\u663e\u793a\u7f51\u683c\u4e13\u5c5e\u5b57\u6bb5\u3002",
                "tools.registryControlLab.status.previewed": "\u5df2\u63a5\u6536 registry \u63a7\u4ef6\u53c2\u6570\u3002",
                "tools.registryControlLab.status.previewPending": "\u6b63\u5728\u53d1\u9001 registry \u63a7\u4ef6\u53c2\u6570...",
                "tools.registryControlLab.status.previewFailed": "Registry \u63a7\u4ef6\u9884\u89c8\u5931\u8d25\u3002",
                "tools.registryControlLab.status.stateRefreshed": "Registry host \u72b6\u6001\u5df2\u5237\u65b0\u3002",
                "tools.registryControlLab.status.payloadPending": "\u6b63\u5728\u53d1\u9001 action payload...",
                "tools.registryControlLab.status.payloadReceived": "Action payload \u5df2\u63a5\u6536\u3002",
                "tools.registryControlLab.status.payloadFailed": "Action payload \u5931\u8d25\u3002",
                "tools.registryControlLab.status.stateButtonPending": "\u6b63\u5728\u6267\u884c\u72b6\u6001\u9650\u5236\u64cd\u4f5c...",
                "tools.registryControlLab.status.stateButtonSuccess": "\u72b6\u6001\u9650\u5236\u64cd\u4f5c\u5df2\u5b8c\u6210\u3002",
                "tools.registryControlLab.status.fallbackErrorPending": "\u6b63\u5728\u6d4b\u8bd5\u9519\u8bef fallback...",
                "tools.registryControlLab.status.fallbackErrorShown": "\u5df2\u663e\u793a action \u4e13\u5c5e\u9519\u8bef fallback\u3002",
                "tools.registryControlLab.status.refreshAfterRunPending": "\u6b63\u5728\u6267\u884c\u5e76\u5237\u65b0\u72b6\u6001...",
                "tools.registryControlLab.status.refreshAfterRunSuccess": "\u64cd\u4f5c\u5df2\u5b8c\u6210\uff0c\u72b6\u6001\u5df2\u5237\u65b0\u3002",
                "tools.registryControlLab.state.compName": "\u5408\u6210",
                "tools.registryControlLab.state.selectedCount": "\u9009\u4e2d\u56fe\u5c42",
                "tools.registryControlLab.state.refreshCount": "\u5237\u65b0\u6b21\u6570",
                "tools.registryControlLab.notes.basic": "\u8be5\u5b9e\u9a8c\u5ba4\u53ea\u9a8c\u8bc1\u5171\u7528\u63a7\u4ef6\uff0c\u4e0d\u4fee\u6539 After Effects \u56fe\u5c42\u3002",
                "tools.registryControlLab.notes.actionState": "\u6253\u5f00\u5408\u6210\u540e\uff0c\u72b6\u6001\u9650\u5236\u6309\u94ae\u4f1a\u53d8\u4e3a\u53ef\u7528\u3002Payload \u53ea\u968f\u672c\u6b21 action \u53d1\u9001\uff0c\u4e0d\u4f1a\u6301\u4e45\u5316\u3002",
                "tools.registryControlLab.hints.textValue": "\u5355\u884c\u6587\u672c\u8f93\u5165\u3002",
                "tools.registryControlLab.hints.noteValue": "\u591a\u884c\u6587\u672c\u533a\u57df\u3002",
                "tools.registryControlLab.hints.numberValue": "\u53ef\u8f93\u5165\u6570\u503c\uff0c\u4e5f\u53ef\u6a2a\u5411\u62d6\u52a8\u4fee\u6539\u3002",
                "tools.registryControlLab.hints.rangeValue": "\u6570\u503c\u6846\u548c\u6ed1\u6746\u4fdd\u6301\u540c\u6b65\u3002",
                "tools.registryControlLab.hints.enabled": "\u4fdd\u7559\u73b0\u6709\u5f00\u5173\u89c6\u89c9\u98ce\u683c\u3002",
                "tools.registryControlLab.hints.mode": "\u4f7f\u7528\u73b0\u6709\u81ea\u5b9a\u4e49\u4e0b\u62c9\u83dc\u5355\u3002",
                "tools.registryControlLab.hints.fillColor": "\u6253\u5f00\u81ea\u5b9a\u4e49 HSV \u53d6\u8272\u5668\u3002",
                "tools.registryControlLab.hints.strokeColor": "\u8fd4\u56de\u6807\u51c6\u5316\u7684 #rrggbb \u503c\u3002",
                "tools.registryControlLab.hints.toggleText": "\u5206\u533a\u5173\u95ed\u65f6\u8be5\u5b57\u6bb5\u4f1a\u5f31\u5316\u663e\u793a\u3002",
                "tools.registryControlLab.hints.toggleNumber": "\u5206\u533a\u5f00\u5173\u503c\u4f1a\u968f\u8868\u5355\u53c2\u6570\u4e00\u8d77\u6536\u96c6\u3002",
                "tools.registryControlLab.hints.componentType": "\u5207\u6362\u6807\u7b7e\u9875\u4ee5\u6d4b\u8bd5 visibleWhen \u5b57\u6bb5\u663e\u9690\u3002"
            }
        }
    });
})();
