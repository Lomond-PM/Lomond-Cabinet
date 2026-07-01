#target aftereffects

var AEToolbox = AEToolbox || {};

AEToolbox.ping = function () {
    return "AEToolbox host loaded";
};

(function () {
    AEToolbox.version = "1.0.0";
    AEToolbox.tools = AEToolbox.tools || {};

    AEToolbox.jsonEscape = function (s) {
        return String(s)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, "\\\"")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
    };

    AEToolbox.toJson = function (obj) {
        var parts = [];
        var k;
        for (k in obj) {
            if (!obj.hasOwnProperty(k)) {
                continue;
            }
            if (typeof obj[k] === "number") {
                parts[parts.length] = "\"" + k + "\":" + obj[k];
            } else if (typeof obj[k] === "boolean") {
                parts[parts.length] = "\"" + k + "\":" + (obj[k] ? "true" : "false");
            } else {
                parts[parts.length] = "\"" + k + "\":\"" + AEToolbox.jsonEscape(obj[k]) + "\"";
            }
        }
        return "{" + parts.join(",") + "}";
    };

    AEToolbox.parseJson = function (json) {
        if (typeof JSON !== "undefined" && JSON.parse) {
            return JSON.parse(json);
        }
        return eval("(" + json + ")");
    };

    AEToolbox.normalizeHexColor = function (hex) {
        var s = String(hex || "#ffffff").replace("#", "");
        if (s.length !== 6) {
            s = "ffffff";
        }
        return "#" + s.toUpperCase();
    };

    AEToolbox.hexToColorArray = function (hex) {
        var s = AEToolbox.normalizeHexColor(hex).replace("#", "");
        var r = parseInt(s.substr(0, 2), 16) / 255;
        var g = parseInt(s.substr(2, 2), 16) / 255;
        var b = parseInt(s.substr(4, 2), 16) / 255;
        return [r, g, b, 1];
    };

    AEToolbox.colorArrayToHex = function (color) {
        var r = Math.max(0, Math.min(255, Math.round(Number(color[0]) * 255)));
        var g = Math.max(0, Math.min(255, Math.round(Number(color[1]) * 255)));
        var b = Math.max(0, Math.min(255, Math.round(Number(color[2]) * 255)));
        var s = ((r << 16) | (g << 8) | b).toString(16).toUpperCase();
        while (s.length < 6) {
            s = "0" + s;
        }
        return "#" + s;
    };

    AEToolbox.pickColor = function (hex) {
        var comp = app.project && app.project.activeItem;
        var selectedLayers = [];
        var tempLayer = null;
        var originalHex = AEToolbox.normalizeHexColor(hex);
        var pickedHex;
        var effect;
        var colorProp;
        var color;
        var i;

        if (!comp || !(comp instanceof CompItem)) {
            return AEToolbox.toJson({
                ok: false,
                message: "Open a composition before using the AE color picker."
            });
        }

        try {
            for (i = 0; i < comp.selectedLayers.length; i++) {
                selectedLayers[selectedLayers.length] = comp.selectedLayers[i];
            }

            for (i = 1; i <= comp.numLayers; i++) {
                comp.layer(i).selected = false;
            }

            tempLayer = comp.layers.addNull();
            tempLayer.name = "__AE_Toolbox_Color_Picker__";
            tempLayer.guideLayer = true;
            tempLayer.selected = true;

            effect = tempLayer.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            colorProp = effect.property(1);
            colorProp.setValue(AEToolbox.hexToColorArray(hex));
            colorProp.selected = true;

            app.executeCommand(2240);
            color = colorProp.value;
            pickedHex = AEToolbox.colorArrayToHex(color);

            tempLayer.remove();
            tempLayer = null;

            for (i = 0; i < selectedLayers.length; i++) {
                try {
                    selectedLayers[i].selected = true;
                } catch (restoreErr) {
                }
            }

            return AEToolbox.toJson({
                ok: true,
                cancelled: pickedHex === originalHex,
                color: pickedHex,
                message: pickedHex === originalHex ? "Color unchanged." : "Color updated."
            });
        } catch (err) {
            if (tempLayer) {
                try {
                    tempLayer.remove();
                } catch (removeErr) {
                }
            }

            for (i = 0; i < selectedLayers.length; i++) {
                try {
                    selectedLayers[i].selected = true;
                } catch (restoreErr2) {
                }
            }

            return AEToolbox.toJson({
                ok: false,
                message: "AE color picker failed: " + err.toString()
            });
        }
    };
})();

#include "aeUtils.jsx"
#include "effectUtils.jsx"
#include "shapeUtils.jsx"
#include "tools/textBackgroundBox.jsx"
#include "tools/selectionInfo.jsx"
#include "tools/ecommerceLayout.jsx"
#include "tools/adComponentKit.jsx"
#include "tools/shapeAdd.jsx"

(function () {
    AEToolbox.getSelectionSummary = function () {
        var comp = AEToolbox.AE.getActiveComp();
        if (!comp) {
            return AEToolbox.toJson({
                ok: true,
                message: "Ready. Open a composition to begin.",
                selectionLabel: "No comp"
            });
        }

        var selectedCount = comp.selectedLayers ? comp.selectedLayers.length : 0;
        var textCount = AEToolbox.AE.getSelectedTextLayers(comp).length;
        var message = "Selected " + selectedCount + " layer(s), " + textCount + " text layer(s).";
        var label = textCount > 0 ? textCount + " text layer(s)" : "No text layers";

        return AEToolbox.toJson({
            ok: true,
            message: message,
            selectionLabel: label
        });
    };

    AEToolbox.getHostLoadInfo = function () {
        return AEToolbox.toJson({
            ok: true,
            message: "Host load info ready.",
            hostFile: "host/index.jsx",
            includesAdComponentKit: true,
            hasAdComponentKitCreateIconGrid: !!(AEToolbox.tools && AEToolbox.tools.adComponentKit && AEToolbox.tools.adComponentKit.createIconGrid)
        });
    };
})();
