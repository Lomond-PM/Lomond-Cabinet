(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.shapeAddProbe = AEToolbox.tools.shapeAddProbe || {};

    AEToolbox.tools.shapeAddProbe.getState = function () {
        var state = {};

        try {
            if (AEToolbox.tools.shapeAdd && AEToolbox.tools.shapeAdd.getState) {
                state = AEToolbox.parseJson(AEToolbox.tools.shapeAdd.getState() || "{}");
            }
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAddProbe.status.stateFailed",
                state: {
                    hasComp: false,
                    canAdd: false,
                    targetLabel: "",
                    source: ""
                }
            });
        }

        return AEToolbox.stringify({
            ok: !!state.ok,
            messageKey: state.ok ? "tools.shapeAddProbe.status.targetReady" : "tools.shapeAddProbe.status.noTarget",
            state: {
                hasComp: !!state.hasComp,
                canAdd: !!state.canAdd,
                targetLabel: state.targetLabel || "",
                source: state.source || ""
            }
        });
    };

    AEToolbox.tools.shapeAddProbe.addRectangle = function (paramsJson) {
        var params = {};
        var result = {};
        var matchName;
        var key;

        try {
            params = AEToolbox.parseJson(paramsJson || "{}");
        } catch (parseErr) {
            params = {};
        }

        matchName = params.matchName || "ADBE Vector Shape - Rect";
        key = params.key || "rectangle";

        try {
            if (!AEToolbox.tools.shapeAdd || !AEToolbox.tools.shapeAdd.add) {
                return AEToolbox.stringify({
                    ok: false,
                    messageKey: "tools.shapeAddProbe.status.hostUnavailable"
                });
            }

            result = AEToolbox.parseJson(AEToolbox.tools.shapeAdd.add(matchName, key) || "{}");
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAddProbe.status.addFailed"
            });
        }

        return AEToolbox.stringify({
            ok: !!result.ok,
            messageKey: result.ok ? "tools.shapeAddProbe.status.rectangleAdded" : "tools.shapeAddProbe.status.noTarget",
            createdCount: result.createdCount || 0,
            targetLabel: result.targetLabel || "",
            canAdd: !!result.canAdd
        });
    };

    AEToolbox.registerTool({
        id: "shapeAddProbe",
        titleKey: "tools.shapeAddProbe.title",
        descriptionKey: "tools.shapeAddProbe.description",
        category: "debug",
        iconText: "P",
        debugOnly: true,
        stateAction: {
            hostFunction: "AEToolbox.tools.shapeAddProbe.getState",
            intervalMs: 1000
        },
        stateCard: {
            titleKey: "tools.shapeAddProbe.sections.state",
            fields: [
                {
                    stateKey: "targetLabel",
                    labelKey: "tools.shapeAddProbe.state.target"
                },
                {
                    stateKey: "source",
                    labelKey: "tools.shapeAddProbe.state.source"
                },
                {
                    stateKey: "canAdd",
                    labelKey: "tools.shapeAddProbe.state.canAdd"
                }
            ]
        },
        sections: [
            {
                id: "actions",
                labelKey: "tools.shapeAddProbe.sections.actions",
                descriptionKey: "tools.shapeAddProbe.sections.actionsDescription",
                fields: [
                    {
                        type: "info",
                        labelKey: "tools.shapeAddProbe.notes.debugOnly"
                    },
                    {
                        type: "button",
                        key: "addRectangle",
                        labelKey: "tools.shapeAddProbe.actions.addRectangle",
                        secondaryText: "rectangle",
                        secondaryTextType: "matchName",
                        textLayout: "centerAxisPair",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "addRectangle",
                        actionPayload: {
                            key: "rectangle",
                            matchName: "ADBE Vector Shape - Rect"
                        },
                        enabledWhen: {
                            stateKey: "canAdd",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.shapeAddProbe.status.addingRectangle",
                        successMessageKey: "tools.shapeAddProbe.status.rectangleAdded",
                        errorMessageKey: "tools.shapeAddProbe.status.noTarget"
                    }
                ]
            }
        ],
        actions: [
            {
                id: "addRectangle",
                labelKey: "tools.shapeAddProbe.actions.addRectangle",
                hostFunction: "AEToolbox.tools.shapeAddProbe.addRectangle",
                style: "primary",
                refreshStateAfterRun: true,
                pendingMessageKey: "tools.shapeAddProbe.status.addingRectangle",
                successMessageKey: "tools.shapeAddProbe.status.rectangleAdded",
                errorMessageKey: "tools.shapeAddProbe.status.noTarget"
            }
        ],
        i18n: {
            en: {
                "tools.shapeAddProbe.title": "Shape Add Probe",
                "tools.shapeAddProbe.description": "Debug-only registry probe that calls the legacy Shape Add rectangle action.",
                "tools.shapeAddProbe.sections.state": "Shape Target",
                "tools.shapeAddProbe.sections.actions": "Probe Action",
                "tools.shapeAddProbe.sections.actionsDescription": "Uses registry action payload and legacy Shape Add host logic.",
                "tools.shapeAddProbe.state.target": "Target",
                "tools.shapeAddProbe.state.source": "Source",
                "tools.shapeAddProbe.state.canAdd": "Can Add",
                "tools.shapeAddProbe.actions.addRectangle": "Add Rectangle",
                "tools.shapeAddProbe.notes.debugOnly": "Debug-only probe. It does not replace the normal Shape Add tool.",
                "tools.shapeAddProbe.status.targetReady": "Shape Add target ready.",
                "tools.shapeAddProbe.status.noTarget": "Select a shape layer or shape group target.",
                "tools.shapeAddProbe.status.stateFailed": "Unable to read Shape Add state.",
                "tools.shapeAddProbe.status.hostUnavailable": "Shape Add host action is unavailable.",
                "tools.shapeAddProbe.status.addingRectangle": "Adding rectangle through Shape Add probe...",
                "tools.shapeAddProbe.status.rectangleAdded": "Rectangle added through Shape Add probe.",
                "tools.shapeAddProbe.status.addFailed": "Shape Add probe failed to add rectangle."
            },
            "zh-CN": {
                "tools.shapeAddProbe.title": "Shape Add \u63a2\u9488",
                "tools.shapeAddProbe.description": "\u4ec5\u7528\u4e8e\u8c03\u8bd5\u7684 registry \u63a2\u9488\uff0c\u7528\u6765\u8c03\u7528 legacy Shape Add \u77e9\u5f62 action\u3002",
                "tools.shapeAddProbe.sections.state": "\u5f62\u72b6\u76ee\u6807",
                "tools.shapeAddProbe.sections.actions": "\u63a2\u9488\u64cd\u4f5c",
                "tools.shapeAddProbe.sections.actionsDescription": "\u4f7f\u7528 registry action payload \u548c legacy Shape Add host \u903b\u8f91\u3002",
                "tools.shapeAddProbe.state.target": "\u76ee\u6807",
                "tools.shapeAddProbe.state.source": "\u6765\u6e90",
                "tools.shapeAddProbe.state.canAdd": "\u53ef\u6dfb\u52a0",
                "tools.shapeAddProbe.actions.addRectangle": "\u6dfb\u52a0\u77e9\u5f62",
                "tools.shapeAddProbe.notes.debugOnly": "\u8fd9\u662f\u4ec5\u7528\u4e8e\u8c03\u8bd5\u7684\u63a2\u9488\uff0c\u4e0d\u66ff\u6362\u6b63\u5f0f Shape Add \u5de5\u5177\u3002",
                "tools.shapeAddProbe.status.targetReady": "Shape Add \u76ee\u6807\u5df2\u5c31\u7eea\u3002",
                "tools.shapeAddProbe.status.noTarget": "\u8bf7\u9009\u62e9\u5f62\u72b6\u56fe\u5c42\u6216\u5f62\u72b6\u7ec4\u76ee\u6807\u3002",
                "tools.shapeAddProbe.status.stateFailed": "\u65e0\u6cd5\u8bfb\u53d6 Shape Add \u72b6\u6001\u3002",
                "tools.shapeAddProbe.status.hostUnavailable": "Shape Add host action \u4e0d\u53ef\u7528\u3002",
                "tools.shapeAddProbe.status.addingRectangle": "\u6b63\u5728\u901a\u8fc7 Shape Add \u63a2\u9488\u6dfb\u52a0\u77e9\u5f62...",
                "tools.shapeAddProbe.status.rectangleAdded": "\u5df2\u901a\u8fc7 Shape Add \u63a2\u9488\u6dfb\u52a0\u77e9\u5f62\u3002",
                "tools.shapeAddProbe.status.addFailed": "Shape Add \u63a2\u9488\u6dfb\u52a0\u77e9\u5f62\u5931\u8d25\u3002"
            }
        }
    });
})();
