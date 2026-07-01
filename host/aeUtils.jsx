var AEToolbox = AEToolbox || {};

(function () {
    AEToolbox.MN = {
        TEXT_PROPS: "ADBE Text Properties",
        EFFECTS: "ADBE Effect Parade",

        TRANSFORM: "ADBE Transform Group",
        ANCHOR: "ADBE Anchor Point",
        POSITION: "ADBE Position",
        POS_X: "ADBE Position_0",
        POS_Y: "ADBE Position_1",
        POS_Z: "ADBE Position_2",
        SCALE: "ADBE Scale",
        ORIENTATION: "ADBE Orientation",
        ROT_X: "ADBE Rotate X",
        ROT_Y: "ADBE Rotate Y",
        ROT_Z: "ADBE Rotate Z",

        ROOT_VECTORS: "ADBE Root Vectors Group",
        VECTOR_GROUP: "ADBE Vector Group",
        VECTORS_GROUP: "ADBE Vectors Group",
        RECT: "ADBE Vector Shape - Rect",
        RECT_SIZE: "ADBE Vector Rect Size",
        RECT_POS: "ADBE Vector Rect Position",
        RECT_ROUND: "ADBE Vector Rect Roundness",

        FILL: "ADBE Vector Graphic - Fill",
        GFILL: "ADBE Vector Graphic - G-Fill",
        STROKE: "ADBE Vector Graphic - Stroke",
        GSTROKE: "ADBE Vector Graphic - G-Stroke",

        FILL_COLOR: "ADBE Vector Fill Color",
        FILL_OPACITY: "ADBE Vector Fill Opacity",
        STROKE_COLOR: "ADBE Vector Stroke Color",
        STROKE_WIDTH: "ADBE Vector Stroke Width",
        STROKE_OPACITY: "ADBE Vector Stroke Opacity",

        GRAD_START: "ADBE Vector Grad Start Pt",
        GRAD_END: "ADBE Vector Grad End Pt"
    };

    AEToolbox.Util = {
        lines: function (a) {
            return a.join("\n");
        },

        prop: function (group, matchName) {
            try {
                return group ? group.property(matchName) : null;
            } catch (e) {
                return null;
            }
        },

        setValueSafe: function (p, v) {
            if (!p) {
                return;
            }
            try {
                p.setValue(v);
            } catch (e) {}
        },

        setColorSafe: function (p, c) {
            if (!p) {
                return;
            }
            try {
                p.setValue([c[0], c[1], c[2], 1]);
            } catch (e1) {
                try {
                    p.setValue([c[0], c[1], c[2]]);
                } catch (e2) {}
            }
        },

        setExpressionSafe: function (p, expr) {
            if (!p) {
                return;
            }
            try {
                if (p.canSetExpression) {
                    p.expression = expr;
                }
            } catch (e) {}
        },

        number: function (v, fallback) {
            var n = parseFloat(String(v).replace(",", "."));
            return isNaN(n) ? fallback : n;
        },

        clamp: function (v, minV, maxV) {
            return Math.max(minV, Math.min(maxV, v));
        },

        normalizeHex: function (s, fallback) {
            s = String(s || "").replace(/^\s+|\s+$/g, "");
            if (s.charAt(0) === "#") {
                s = s.substr(1);
            }
            if (s.length === 3) {
                s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
            }
            if (!/^[0-9a-fA-F]{6}$/.test(s)) {
                return fallback;
            }
            return "#" + s.toUpperCase();
        },

        hexToColor: function (hex) {
            hex = this.normalizeHex(hex, "#FFFFFF").substr(1);
            return [
                parseInt(hex.substr(0, 2), 16) / 255,
                parseInt(hex.substr(2, 2), 16) / 255,
                parseInt(hex.substr(4, 2), 16) / 255,
                1
            ];
        }
    };

    AEToolbox.AE = {
        isComp: function (item) {
            return item && item instanceof CompItem;
        },

        getActiveComp: function () {
            var comp = app.project ? app.project.activeItem : null;
            return this.isComp(comp) ? comp : null;
        },

        isTextLayer: function (layer) {
            return !!AEToolbox.Util.prop(layer, AEToolbox.MN.TEXT_PROPS);
        },

        getSelectedTextLayers: function (comp) {
            var result = [];
            if (!comp || !comp.selectedLayers) {
                return result;
            }
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                if (this.isTextLayer(comp.selectedLayers[i])) {
                    result[result.length] = comp.selectedLayers[i];
                }
            }
            return result;
        },

        layerNameExists: function (comp, name) {
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === name) {
                    return true;
                }
            }
            return false;
        },

        uniqueLayerName: function (comp, base) {
            var name = base;
            var i = 2;
            while (this.layerNameExists(comp, name)) {
                name = base + " " + i;
                i++;
            }
            return name;
        },

        valueAt: function (p, t) {
            try {
                return p.valueAtTime(t, false);
            } catch (e1) {
                try {
                    return p.value;
                } catch (e2) {
                    return null;
                }
            }
        },

        fitValueToTarget: function (v, targetProp) {
            var tv = null;
            if (!v || typeof v.length === "undefined") {
                return v;
            }
            try {
                tv = targetProp.value;
            } catch (e) {}
            if (!tv || typeof tv.length === "undefined") {
                return v;
            }
            if (tv.length === v.length) {
                return v;
            }
            if (tv.length === 2) {
                return [v[0], v[1]];
            }
            if (tv.length === 3 && v.length === 2) {
                return [v[0], v[1], 0];
            }
            return v;
        },

        copyTransformSnapshot: function (src, dst, t) {
            try {
                dst.threeDLayer = src.threeDLayer;
            } catch (e) {}

            if (src.parent) {
                try {
                    dst.setParentWithJump(src.parent);
                } catch (e1) {
                    try {
                        dst.parent = src.parent;
                    } catch (e2) {}
                }
            }

            var U = AEToolbox.Util;
            var MN = AEToolbox.MN;
            var sTr = U.prop(src, MN.TRANSFORM);
            var dTr = U.prop(dst, MN.TRANSFORM);
            if (!sTr || !dTr) {
                return;
            }

            var names = [
                MN.ANCHOR,
                MN.POSITION,
                MN.POS_X,
                MN.POS_Y,
                MN.POS_Z,
                MN.SCALE,
                MN.ORIENTATION,
                MN.ROT_X,
                MN.ROT_Y,
                MN.ROT_Z
            ];

            for (var i = 0; i < names.length; i++) {
                var sp = U.prop(sTr, names[i]);
                var dp = U.prop(dTr, names[i]);
                if (!sp || !dp) {
                    continue;
                }
                var v = this.valueAt(sp, t);
                if (v !== null) {
                    U.setValueSafe(dp, this.fitValueToTarget(v, dp));
                }
            }
        }
    };
})();

