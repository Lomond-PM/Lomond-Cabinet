(function () {
    if (typeof AEToolbox === "undefined" || !AEToolbox.registerTool) {
        return;
    }

    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.selectionInfo = AEToolbox.tools.selectionInfo || {};

    function layerType(layer) {
        if (!layer) {
            return "Layer";
        }

        try {
            if (layer.matchName === "ADBE Text Layer") {
                return "Text";
            }
            if (layer.matchName === "ADBE AV Layer") {
                if (layer.nullLayer) {
                    return "Null";
                }
                if (layer.hasVideo && layer.source) {
                    if (layer.source instanceof CompItem) {
                        return "Precomp";
                    }
                    if (layer.source instanceof FootageItem) {
                        return "Footage";
                    }
                }
                return "AV";
            }
            if (layer.matchName === "ADBE Camera Layer") {
                return "Camera";
            }
            if (layer.matchName === "ADBE Light Layer") {
                return "Light";
            }
            if (layer.matchName === "ADBE Vector Layer") {
                return "Shape";
            }
        } catch (err) {
        }

        return "Layer";
    }

    AEToolbox.tools.selectionInfo.run = function (paramsJson) {
        var comp = app.project && app.project.activeItem;
        var selectedLayers;
        var layers = [];
        var i;
        var layer;

        if (!comp || !(comp instanceof CompItem)) {
            return AEToolbox.stringify({
                ok: false,
                messageKey: "tools.selectionInfo.status.noComp",
                count: 0,
                layers: []
            });
        }

        selectedLayers = comp.selectedLayers || [];
        for (i = 0; i < selectedLayers.length; i++) {
            layer = selectedLayers[i];
            layers[layers.length] = {
                name: layer.name,
                index: layer.index,
                type: layerType(layer)
            };
        }

        return AEToolbox.stringify({
            ok: true,
            messageKey: selectedLayers.length ? "tools.selectionInfo.status.refreshed" : "tools.selectionInfo.status.noSelection",
            compName: comp.name,
            count: selectedLayers.length,
            layers: layers
        });
    };

    AEToolbox.registerTool({
        id: "selectionInfo",
        titleKey: "tools.selectionInfo.title",
        descriptionKey: "tools.selectionInfo.description",
        category: "inspect",
        iconText: "i",
        registrySectionKey: "tools.selectionInfo.sections.registry",
        parametersSectionKey: "tools.selectionInfo.sections.parameters",
        uiSchema: [],
        actions: [
            {
                id: "refresh",
                labelKey: "tools.selectionInfo.actions.refresh",
                hostFunction: "AEToolbox.tools.selectionInfo.run",
                style: "primary"
            }
        ],
        i18n: {
            en: {
                "tools.selectionInfo.title": "Selection Info",
                "tools.selectionInfo.description": "Read the current selection from After Effects and inspect selected layers.",
                "tools.selectionInfo.actions.refresh": "Refresh Selection",
                "tools.selectionInfo.sections.registry": "Registry",
                "tools.selectionInfo.sections.parameters": "Parameters",
                "tools.selectionInfo.status.refreshed": "Selection refreshed: {count} selected layer(s).",
                "tools.selectionInfo.status.noSelection": "No selection",
                "tools.selectionInfo.status.noComp": "Open a composition before reading selection."
            },
            "zh-CN": {
                "tools.selectionInfo.title": "\u9009\u62e9\u4fe1\u606f",
                "tools.selectionInfo.description": "\u4ece After Effects \u4e3b\u673a\u8bfb\u53d6\u5f53\u524d\u5408\u6210\u9009\u62e9\uff0c\u5e76\u663e\u793a\u805a\u96c6\u7684\u56fe\u5c42\u6458\u8981\u3002",
                "tools.selectionInfo.actions.refresh": "\u5237\u65b0\u9009\u62e9",
                "tools.selectionInfo.sections.registry": "\u6ce8\u518c\u4fe1\u606f",
                "tools.selectionInfo.sections.parameters": "\u53c2\u6570",
                "tools.selectionInfo.status.refreshed": "\u5df2\u5237\u65b0\u9009\u62e9\uff1a\u5df2\u9009 {count} \u4e2a\u56fe\u5c42\u3002",
                "tools.selectionInfo.status.noSelection": "\u672a\u9009\u62e9",
                "tools.selectionInfo.status.noComp": "\u8bf7\u5148\u6253\u5f00\u4e00\u4e2a\u5408\u6210\u3002"
            }
        }
    });
})();
