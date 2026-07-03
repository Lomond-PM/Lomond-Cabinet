(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.shapeAdd = AEToolbox.tools.shapeAdd || {};

    var TOOL = AEToolbox.tools.shapeAdd;
    var ITEMS = [
        { labelKey: "shapeAdd.item.group", key: "group", matchName: "ADBE Vector Group", secondaryText: "group" },
        { labelKey: "shapeAdd.item.rectangle", key: "rectangle", matchName: "ADBE Vector Shape - Rect", secondaryText: "rectangle" },
        { labelKey: "shapeAdd.item.ellipse", key: "ellipse", matchName: "ADBE Vector Shape - Ellipse", secondaryText: "ellipse" },
        { labelKey: "shapeAdd.item.star", key: "star", matchName: "ADBE Vector Shape - Star", secondaryText: "star" },
        { labelKey: "shapeAdd.item.path", key: "path", matchName: "ADBE Vector Shape - Group", secondaryText: "path" },
        { labelKey: "shapeAdd.item.fill", key: "fill", matchName: "ADBE Vector Graphic - Fill", secondaryText: "fill" },
        { labelKey: "shapeAdd.item.stroke", key: "stroke", matchName: "ADBE Vector Graphic - Stroke", secondaryText: "stroke" },
        { labelKey: "shapeAdd.item.gradientFill", key: "gradientFill", matchName: "ADBE Vector Graphic - G-Fill", secondaryText: "gradientFill" },
        { labelKey: "shapeAdd.item.gradientStroke", key: "gradientStroke", matchName: "ADBE Vector Graphic - G-Stroke", secondaryText: "gradientStroke" },
        { labelKey: "shapeAdd.item.mergePaths", key: "mergePaths", matchName: "ADBE Vector Filter - Merge", secondaryText: "mergePaths" },
        { labelKey: "shapeAdd.item.offsetPaths", key: "offsetPaths", matchName: "ADBE Vector Filter - Offset", secondaryText: "offsetPaths" },
        { labelKey: "shapeAdd.item.puckerBloat", key: "puckerBloat", matchName: "ADBE Vector Filter - PB", secondaryText: "puckerBloat" },
        { labelKey: "shapeAdd.item.repeater", key: "repeater", matchName: "ADBE Vector Filter - Repeater", secondaryText: "repeater" },
        { labelKey: "shapeAdd.item.roundCorners", key: "roundCorners", matchName: "ADBE Vector Filter - RC", secondaryText: "roundCorners" },
        { labelKey: "shapeAdd.item.trimPaths", key: "trimPaths", matchName: "ADBE Vector Filter - Trim", secondaryText: "trimPaths" },
        { labelKey: "shapeAdd.item.twist", key: "twist", matchName: "ADBE Vector Filter - Twist", secondaryText: "twist" },
        { labelKey: "shapeAdd.item.wigglePaths", key: "wigglePaths", matchName: "ADBE Vector Filter - Roughen", secondaryText: "wigglePaths" },
        { labelKey: "shapeAdd.item.wiggleTransform", key: "wiggleTransform", matchName: "ADBE Vector Filter - Wiggler", secondaryText: "wiggleTransform" },
        { labelKey: "shapeAdd.item.zigZag", key: "zigZag", matchName: "ADBE Vector Filter - Zigzag", secondaryText: "zigZag" }
    ];

    function normalizeStateResult(raw) {
        var state = {};
        try {
            state = AEToolbox.parseJson(raw || "{}");
        } catch (err) {
            state = {};
        }
        return state;
    }

    TOOL.getRegistryState = function () {
        var state;
        if (!TOOL.getState) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAdd.status.hostUnavailable",
                state: {
                    hasComp: false,
                    canAdd: false,
                    targetLabel: "",
                    source: ""
                }
            });
        }
        state = normalizeStateResult(TOOL.getState());
        return AEToolbox.stringify({
            ok: !!state.ok,
            messageKey: state.ok ? "tools.shapeAdd.status.targetReady" : "tools.shapeAdd.status.noTarget",
            state: {
                hasComp: !!state.hasComp,
                canAdd: !!state.canAdd,
                targetLabel: state.targetLabel || "",
                source: state.source || ""
            }
        });
    };

    TOOL.addRegistryItem = function (paramsJson) {
        var params = {};
        var result = {};
        var key;
        var matchName;

        try {
            params = AEToolbox.parseJson(paramsJson || "{}");
        } catch (parseErr) {
            params = {};
        }

        key = params.key || "";
        matchName = params.matchName || "";

        if (!TOOL.add) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAdd.status.hostUnavailable"
            });
        }

        try {
            result = normalizeStateResult(TOOL.add(matchName, key));
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAdd.status.addFailed"
            });
        }

        return AEToolbox.stringify({
            ok: !!result.ok,
            messageKey: result.ok ? "tools.shapeAdd.status.itemAdded" : "tools.shapeAdd.status.noTarget",
            createdCount: result.createdCount || 0,
            targetLabel: result.targetLabel || "",
            canAdd: !!result.canAdd
        });
    };

    function makeButton(item) {
        return {
            type: "button",
            key: "add_" + item.key,
            labelKey: item.labelKey,
            secondaryText: item.secondaryText,
            secondaryTextType: "matchName",
            textLayout: "bilingualMatchName",
            variant: "secondary",
            fullWidth: true,
            actionId: "addItem",
            actionPayload: {
                key: item.key,
                matchName: item.matchName
            },
            enabledWhen: {
                stateKey: "canAdd",
                equals: true
            },
            refreshStateAfterRun: true,
            pendingMessageKey: "tools.shapeAdd.status.addingItem",
            successMessageKey: "tools.shapeAdd.status.itemAdded",
            errorMessageKey: "tools.shapeAdd.status.noTarget"
        };
    }

    function buildFields() {
        var fields = [];
        var i;
        for (i = 0; i < ITEMS.length; i++) {
            fields[fields.length] = makeButton(ITEMS[i]);
        }
        return fields;
    }

    AEToolbox.registerTool({
        id: "shapeAdd",
        titleKey: "tools.shapeAdd.title",
        descriptionKey: "tools.shapeAdd.description",
        category: "shape",
        iconText: "S",
        stateAction: {
            hostFunction: "AEToolbox.tools.shapeAdd.getRegistryState",
            intervalMs: 1000
        },
        stateCard: {
            titleKey: "tools.shapeAdd.sections.state",
            fields: [
                {
                    stateKey: "targetLabel",
                    labelKey: "tools.shapeAdd.state.target"
                },
                {
                    stateKey: "source",
                    labelKey: "tools.shapeAdd.state.source"
                }
            ]
        },
        sections: [
            {
                id: "nativeItems",
                labelKey: "tools.shapeAdd.sections.nativeItems",
                descriptionKey: "tools.shapeAdd.sections.nativeItemsDescription",
                fields: buildFields()
            }
        ],
        actions: [
            {
                id: "addItem",
                labelKey: "tools.shapeAdd.actions.addItem",
                hostFunction: "AEToolbox.tools.shapeAdd.addRegistryItem",
                hidden: true,
                fieldOnly: true
            }
        ],
        i18n: {
            en: {
                "tools.shapeAdd.sections.state": "Shape Target",
                "tools.shapeAdd.sections.nativeItems": "Native Shape Items",
                "tools.shapeAdd.sections.nativeItemsDescription": "Add native shape contents to the selected Shape Layer target.",
                "tools.shapeAdd.actions.addItem": "Add Shape Item",
                "tools.shapeAdd.state.target": "Target",
                "tools.shapeAdd.state.source": "Source",
                "tools.shapeAdd.status.targetReady": "Shape Add target ready.",
                "tools.shapeAdd.status.noTarget": "Select a shape layer or shape group target.",
                "tools.shapeAdd.status.hostUnavailable": "Shape Add host action is unavailable.",
                "tools.shapeAdd.status.addingItem": "Adding shape item...",
                "tools.shapeAdd.status.itemAdded": "Shape item added.",
                "tools.shapeAdd.status.addFailed": "Shape Add failed."
            },
            "zh-CN": {
                "tools.shapeAdd.sections.state": "\u5f62\u72b6\u76ee\u6807",
                "tools.shapeAdd.sections.nativeItems": "\u539f\u751f\u5f62\u72b6\u5143\u7d20",
                "tools.shapeAdd.sections.nativeItemsDescription": "\u5c06\u539f\u751f\u5f62\u72b6\u5185\u5bb9\u6dfb\u52a0\u5230\u5df2\u9009\u7684 Shape Layer \u76ee\u6807\u3002",
                "tools.shapeAdd.actions.addItem": "\u6dfb\u52a0\u5f62\u72b6\u5143\u7d20",
                "tools.shapeAdd.state.target": "\u76ee\u6807",
                "tools.shapeAdd.state.source": "\u6765\u6e90",
                "tools.shapeAdd.status.targetReady": "Shape Add \u76ee\u6807\u5df2\u5c31\u7eea\u3002",
                "tools.shapeAdd.status.noTarget": "\u8bf7\u9009\u62e9\u5f62\u72b6\u56fe\u5c42\u6216\u5f62\u72b6\u7ec4\u76ee\u6807\u3002",
                "tools.shapeAdd.status.hostUnavailable": "Shape Add host action \u4e0d\u53ef\u7528\u3002",
                "tools.shapeAdd.status.addingItem": "\u6b63\u5728\u6dfb\u52a0\u5f62\u72b6\u5143\u7d20...",
                "tools.shapeAdd.status.itemAdded": "\u5f62\u72b6\u5143\u7d20\u5df2\u6dfb\u52a0\u3002",
                "tools.shapeAdd.status.addFailed": "Shape Add \u5931\u8d25\u3002"
            }
        }
    });
})();
