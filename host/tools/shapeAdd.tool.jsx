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
    var STROKE_FILL_KEYS = [
        "strokeWidth",
        "miterLimit",
        "strokeColor",
        "fillColor",
        "trimStart",
        "trimEnd",
        "trimOffset",
        "taperStartLength",
        "taperEndLength",
        "taperStartWidth",
        "taperEndWidth",
        "taperStartEase",
        "taperEndEase"
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

    TOOL.createStrokeFillRegistryLayer = function (paramsJson) {
        var result = {};

        if (!TOOL.createStrokeFillLayer) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAdd.status.hostUnavailable"
            });
        }

        try {
            result = normalizeStateResult(TOOL.createStrokeFillLayer(paramsJson || "{}"));
        } catch (err) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.shapeAdd.status.createStrokeFillFailed"
            });
        }

        return AEToolbox.stringify({
            ok: !!result.ok,
            messageKey: result.ok ? "tools.shapeAdd.status.createdStrokeFillLayer" : (result.hasComp === false ? "tools.shapeAdd.status.openComp" : "tools.shapeAdd.status.createStrokeFillFailed"),
            layerName: result.layerName || "",
            expressionLinks: result.expressionLinks || 0
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

    function rangeField(key, labelKey, defaultValue, min, max, step) {
        return {
            type: "range",
            key: key,
            labelKey: labelKey,
            defaultValue: defaultValue,
            min: min,
            max: max,
            step: step
        };
    }

    AEToolbox.registerTool({
        id: "shapeAdd",
        titleKey: "tools.shapeAdd.title",
        descriptionKey: "tools.shapeAdd.description",
        category: "shape",
        iconText: "S",
        hideRestoreDefaults: true,
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
            },
            {
                id: "strokeFillCreate",
                labelKey: "tools.shapeAdd.sections.strokeFill",
                descriptionKey: "tools.shapeAdd.sections.strokeFillDescription",
                fields: [
                    {
                        type: "button",
                        key: "createStrokeFillLayer",
                        labelKey: "tools.shapeAdd.actions.createStrokeFillLayer",
                        variant: "primary",
                        fullWidth: true,
                        actionId: "createStrokeFillLayer",
                        enabledWhen: {
                            stateKey: "hasComp",
                            equals: true
                        },
                        refreshStateAfterRun: true,
                        pendingMessageKey: "tools.shapeAdd.status.creatingStrokeFillLayer",
                        successMessageKey: "tools.shapeAdd.status.createdStrokeFillLayer",
                        errorMessageKey: "tools.shapeAdd.status.createStrokeFillFailed"
                    }
                ]
            },
            {
                id: "strokeFillSettings",
                labelKey: "tools.shapeAdd.sections.strokeFillSettings",
                descriptionKey: "tools.shapeAdd.sections.strokeFillSettingsDescription",
                collapsible: true,
                defaultCollapsed: true,
                fields: [
                    rangeField("strokeWidth", "tools.shapeAdd.fields.strokeWidth", 7, 0, 200, 0.1),
                    rangeField("miterLimit", "tools.shapeAdd.fields.miterLimit", 14, 0, 100, 0.1),
                    {
                        type: "color",
                        key: "strokeColor",
                        labelKey: "tools.shapeAdd.fields.strokeColor",
                        defaultValue: "#ffffff"
                    },
                    {
                        type: "color",
                        key: "fillColor",
                        labelKey: "tools.shapeAdd.fields.fillColor",
                        defaultValue: "#d6b25e"
                    },
                    {
                        type: "info",
                        labelKey: "tools.shapeAdd.sections.trimPaths"
                    },
                    rangeField("trimStart", "tools.shapeAdd.fields.trimStart", 0, 0, 100, 0.1),
                    rangeField("trimEnd", "tools.shapeAdd.fields.trimEnd", 100, 0, 100, 0.1),
                    rangeField("trimOffset", "tools.shapeAdd.fields.trimOffset", 0, -360, 360, 0.1),
                    {
                        type: "info",
                        labelKey: "tools.shapeAdd.sections.strokeTaper"
                    },
                    rangeField("taperStartLength", "tools.shapeAdd.fields.taperStartLength", 15, 0, 100, 0.1),
                    rangeField("taperEndLength", "tools.shapeAdd.fields.taperEndLength", 15, 0, 100, 0.1),
                    rangeField("taperStartWidth", "tools.shapeAdd.fields.taperStartWidth", 0, 0, 100, 0.1),
                    rangeField("taperEndWidth", "tools.shapeAdd.fields.taperEndWidth", 0, 0, 100, 0.1),
                    rangeField("taperStartEase", "tools.shapeAdd.fields.taperStartEase", 30, 0, 100, 0.1),
                    rangeField("taperEndEase", "tools.shapeAdd.fields.taperEndEase", 30, 0, 100, 0.1),
                    {
                        type: "button",
                        key: "resetStrokeFillDefaults",
                        labelKey: "tools.shapeAdd.actions.resetStrokeFillDefaults",
                        variant: "secondary",
                        fullWidth: true,
                        clientAction: "resetFields",
                        resetKeys: STROKE_FILL_KEYS
                    }
                ]
            }
        ],
        actions: [
            {
                id: "addItem",
                labelKey: "tools.shapeAdd.actions.addItem",
                hostFunction: "AEToolbox.tools.shapeAdd.addRegistryItem",
                hidden: true,
                fieldOnly: true
            },
            {
                id: "createStrokeFillLayer",
                labelKey: "tools.shapeAdd.actions.createStrokeFillLayer",
                hostFunction: "AEToolbox.tools.shapeAdd.createStrokeFillRegistryLayer",
                hidden: true,
                fieldOnly: true
            }
        ],
        i18n: {
            en: {
                "tools.shapeAdd.sections.state": "Shape Target",
                "tools.shapeAdd.sections.nativeItems": "Native Shape Items",
                "tools.shapeAdd.sections.nativeItemsDescription": "Add native shape contents to the selected Shape Layer target.",
                "tools.shapeAdd.sections.strokeFill": "Stroke / Fill Shape Layer",
                "tools.shapeAdd.sections.strokeFillDescription": "Create a new shape layer with linked Fill and Stroke paths.",
                "tools.shapeAdd.sections.strokeFillSettings": "Stroke / Fill Settings",
                "tools.shapeAdd.sections.strokeFillSettingsDescription": "Defaults used only by the Stroke / Fill Shape Layer button above.",
                "tools.shapeAdd.sections.trimPaths": "Trim Paths",
                "tools.shapeAdd.sections.trimPathsDescription": "Defaults for the Trim Paths operator inserted between the Stroke path and Stroke.",
                "tools.shapeAdd.sections.strokeTaper": "Stroke Taper",
                "tools.shapeAdd.sections.strokeTaperDescription": "Defaults for the Stroke taper controls exposed on the generated layer.",
                "tools.shapeAdd.actions.addItem": "Add Shape Item",
                "tools.shapeAdd.actions.createStrokeFillLayer": "New Stroke / Fill Shape Layer",
                "tools.shapeAdd.actions.resetStrokeFillDefaults": "Reset Stroke / Fill Defaults",
                "tools.shapeAdd.fields.strokeWidth": "Stroke Width",
                "tools.shapeAdd.fields.miterLimit": "Miter Limit",
                "tools.shapeAdd.fields.strokeColor": "Stroke Color",
                "tools.shapeAdd.fields.fillColor": "Fill Color",
                "tools.shapeAdd.fields.trimStart": "Trim Start",
                "tools.shapeAdd.fields.trimEnd": "Trim End",
                "tools.shapeAdd.fields.trimOffset": "Trim Offset",
                "tools.shapeAdd.fields.taperStartLength": "Start Length",
                "tools.shapeAdd.fields.taperEndLength": "End Length",
                "tools.shapeAdd.fields.taperStartWidth": "Start Width",
                "tools.shapeAdd.fields.taperEndWidth": "End Width",
                "tools.shapeAdd.fields.taperStartEase": "Start Ease",
                "tools.shapeAdd.fields.taperEndEase": "End Ease",
                "tools.shapeAdd.state.target": "Target",
                "tools.shapeAdd.state.source": "Source",
                "tools.shapeAdd.status.targetReady": "Shape Add target ready.",
                "tools.shapeAdd.status.noTarget": "Select a shape layer or shape group target.",
                "tools.shapeAdd.status.openComp": "Open a composition first.",
                "tools.shapeAdd.status.hostUnavailable": "Shape Add host action is unavailable.",
                "tools.shapeAdd.status.addingItem": "Adding shape item...",
                "tools.shapeAdd.status.itemAdded": "Shape item added.",
                "tools.shapeAdd.status.addFailed": "Shape Add failed.",
                "tools.shapeAdd.status.creatingStrokeFillLayer": "Creating Stroke / Fill shape layer...",
                "tools.shapeAdd.status.createdStrokeFillLayer": "Created Stroke / Fill shape layer.",
                "tools.shapeAdd.status.createStrokeFillFailed": "Failed to create Stroke / Fill shape layer."
            },
            "zh-CN": {
                "tools.shapeAdd.sections.state": "\u5f62\u72b6\u76ee\u6807",
                "tools.shapeAdd.sections.nativeItems": "\u539f\u751f\u5f62\u72b6\u5143\u7d20",
                "tools.shapeAdd.sections.nativeItemsDescription": "\u5c06\u539f\u751f\u5f62\u72b6\u5185\u5bb9\u6dfb\u52a0\u5230\u5df2\u9009\u7684 Shape Layer \u76ee\u6807\u3002",
                "tools.shapeAdd.sections.strokeFill": "Stroke / Fill \u5f62\u72b6\u56fe\u5c42",
                "tools.shapeAdd.sections.strokeFillDescription": "\u65b0\u5efa\u4e00\u4e2a Fill \u4e0e Stroke \u8def\u5f84\u8054\u52a8\u7684\u5f62\u72b6\u56fe\u5c42\u3002",
                "tools.shapeAdd.sections.strokeFillSettings": "Stroke / Fill \u8bbe\u7f6e",
                "tools.shapeAdd.sections.strokeFillSettingsDescription": "\u4ec5\u7528\u4e8e\u4e0a\u65b9 Stroke / Fill \u5f62\u72b6\u56fe\u5c42\u6309\u94ae\u7684\u9ed8\u8ba4\u503c\u3002",
                "tools.shapeAdd.sections.trimPaths": "\u4fee\u526a\u8def\u5f84",
                "tools.shapeAdd.sections.trimPathsDescription": "\u63d2\u5165\u5728 Stroke \u8def\u5f84\u4e0e Stroke \u4e4b\u95f4\u7684 Trim Paths \u9ed8\u8ba4\u503c\u3002",
                "tools.shapeAdd.sections.strokeTaper": "Stroke \u9525\u5ea6",
                "tools.shapeAdd.sections.strokeTaperDescription": "\u751f\u6210\u56fe\u5c42\u4e0a Stroke \u9525\u5ea6\u6548\u679c\u63a7\u4ef6\u7684\u9ed8\u8ba4\u503c\u3002",
                "tools.shapeAdd.actions.addItem": "\u6dfb\u52a0\u5f62\u72b6\u5143\u7d20",
                "tools.shapeAdd.actions.createStrokeFillLayer": "\u65b0\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42",
                "tools.shapeAdd.actions.resetStrokeFillDefaults": "\u6062\u590d Stroke / Fill \u9ed8\u8ba4\u503c",
                "tools.shapeAdd.fields.strokeWidth": "\u63cf\u8fb9\u5bbd\u5ea6",
                "tools.shapeAdd.fields.miterLimit": "\u5c16\u89d2\u9650\u5236",
                "tools.shapeAdd.fields.strokeColor": "Stroke \u989c\u8272",
                "tools.shapeAdd.fields.fillColor": "Fill \u989c\u8272",
                "tools.shapeAdd.fields.trimStart": "\u4fee\u526a\u5f00\u59cb",
                "tools.shapeAdd.fields.trimEnd": "\u4fee\u526a\u7ed3\u675f",
                "tools.shapeAdd.fields.trimOffset": "\u4fee\u526a\u504f\u79fb",
                "tools.shapeAdd.fields.taperStartLength": "\u8d77\u59cb\u957f\u5ea6",
                "tools.shapeAdd.fields.taperEndLength": "\u7ed3\u675f\u957f\u5ea6",
                "tools.shapeAdd.fields.taperStartWidth": "\u8d77\u59cb\u5bbd\u5ea6",
                "tools.shapeAdd.fields.taperEndWidth": "\u7ed3\u675f\u5bbd\u5ea6",
                "tools.shapeAdd.fields.taperStartEase": "\u8d77\u59cb\u7f13\u548c",
                "tools.shapeAdd.fields.taperEndEase": "\u7ed3\u675f\u7f13\u548c",
                "tools.shapeAdd.state.target": "\u76ee\u6807",
                "tools.shapeAdd.state.source": "\u6765\u6e90",
                "tools.shapeAdd.status.targetReady": "Shape Add \u76ee\u6807\u5df2\u5c31\u7eea\u3002",
                "tools.shapeAdd.status.noTarget": "\u8bf7\u9009\u62e9\u5f62\u72b6\u56fe\u5c42\u6216\u5f62\u72b6\u7ec4\u76ee\u6807\u3002",
                "tools.shapeAdd.status.openComp": "\u8bf7\u5148\u6253\u5f00\u5408\u6210\u3002",
                "tools.shapeAdd.status.hostUnavailable": "Shape Add host action \u4e0d\u53ef\u7528\u3002",
                "tools.shapeAdd.status.addingItem": "\u6b63\u5728\u6dfb\u52a0\u5f62\u72b6\u5143\u7d20...",
                "tools.shapeAdd.status.itemAdded": "\u5f62\u72b6\u5143\u7d20\u5df2\u6dfb\u52a0\u3002",
                "tools.shapeAdd.status.addFailed": "Shape Add \u5931\u8d25\u3002",
                "tools.shapeAdd.status.creatingStrokeFillLayer": "\u6b63\u5728\u521b\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42...",
                "tools.shapeAdd.status.createdStrokeFillLayer": "\u5df2\u521b\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42\u3002",
                "tools.shapeAdd.status.createStrokeFillFailed": "\u521b\u5efa Stroke / Fill \u5f62\u72b6\u56fe\u5c42\u5931\u8d25\u3002"
            }
        }
    });
})();
