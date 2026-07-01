(function () {
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

    function layerToJson(layer) {
        return "{" +
            "\"name\":\"" + AEToolbox.jsonEscape(layer.name) + "\"," +
            "\"index\":" + layer.index + "," +
            "\"type\":\"" + AEToolbox.jsonEscape(layerType(layer)) + "\"" +
            "}";
    }

    AEToolbox.tools.selectionInfo.get = function () {
        var comp = app.project && app.project.activeItem;
        var selectedLayers;
        var parts = [];
        var i;
        var message;

        if (!comp || !(comp instanceof CompItem)) {
            return "{" +
                "\"ok\":false," +
                "\"count\":0," +
                "\"layers\":[]," +
                "\"message\":\"Open a composition before reading selection.\"" +
                "}";
        }

        selectedLayers = comp.selectedLayers || [];
        for (i = 0; i < selectedLayers.length; i++) {
            parts[parts.length] = layerToJson(selectedLayers[i]);
        }

        message = selectedLayers.length === 1 ? "Selected 1 layer." : "Selected " + selectedLayers.length + " layer(s).";

        return "{" +
            "\"ok\":true," +
            "\"count\":" + selectedLayers.length + "," +
            "\"layers\":[" + parts.join(",") + "]," +
            "\"message\":\"" + AEToolbox.jsonEscape(message) + "\"" +
            "}";
    };
})();
