var AEToolbox = AEToolbox || {};

(function () {
    var U = AEToolbox.Util;
    var MN = AEToolbox.MN;
    var AE = AEToolbox.AE;
    var FXU = AEToolbox.Effects;
    var SH = AEToolbox.Shape;

    AEToolbox.tools.textBackgroundBox = AEToolbox.tools.textBackgroundBox || {};

    var FX = {
        RECT_SIZE_X: "Rectangle Size X",
        RECT_SIZE_Y: "Rectangle Size Y",
        ROUNDNESS: "Roundness",
        FILL_COLOR: "Fill Color",
        FILL_OPACITY: "Fill Opacity",
        STROKE_COLOR: "Stroke Color",
        STROKE_WIDTH: "Stroke Width",
        STROKE_OPACITY: "Stroke Opacity",
        GRADIENT_START: "Gradient Start",
        GRADIENT_END: "Gradient End"
    };

    function sanitizeOptions(raw) {
        raw = raw || {};
        var fillMode = raw.fillMode === "Gradient Fill" || raw.fillMode === "Solid Fill" ? raw.fillMode : "None";
        var strokeMode = raw.strokeMode === "Gradient Stroke" || raw.strokeMode === "Solid Stroke" ? raw.strokeMode : "None";

        return {
            paddingX: Math.max(0, U.number(raw.paddingX, 40)),
            paddingY: Math.max(0, U.number(raw.paddingY, 20)),
            roundness: Math.max(0, U.number(raw.roundness, 20)),
            fillMode: fillMode,
            fillColor: U.hexToColor(U.normalizeHex(raw.fillColor, "#202020")),
            fillOpacity: U.clamp(U.number(raw.fillOpacity, 80), 0, 100),
            strokeMode: strokeMode,
            strokeColor: U.hexToColor(U.normalizeHex(raw.strokeColor, "#FFFFFF")),
            strokeWidth: Math.max(0, U.number(raw.strokeWidth, 2)),
            strokeOpacity: U.clamp(U.number(raw.strokeOpacity, 100), 0, 100)
        };
    }

    function addControls(layer, rect, opt) {
        FXU.addSlider(layer, FX.RECT_SIZE_X, rect.width + opt.paddingX * 2);
        FXU.addSlider(layer, FX.RECT_SIZE_Y, rect.height + opt.paddingY * 2);
        FXU.addSlider(layer, FX.ROUNDNESS, opt.roundness);

        if (opt.fillMode === "Solid Fill") {
            FXU.addColor(layer, FX.FILL_COLOR, opt.fillColor);
            FXU.addSlider(layer, FX.FILL_OPACITY, opt.fillOpacity);
        } else if (opt.fillMode === "Gradient Fill") {
            FXU.addSlider(layer, FX.FILL_OPACITY, opt.fillOpacity);
        }

        if (opt.strokeMode === "Solid Stroke") {
            FXU.addColor(layer, FX.STROKE_COLOR, opt.strokeColor);
            FXU.addSlider(layer, FX.STROKE_WIDTH, opt.strokeWidth);
            FXU.addSlider(layer, FX.STROKE_OPACITY, opt.strokeOpacity);
        } else if (opt.strokeMode === "Gradient Stroke") {
            FXU.addSlider(layer, FX.STROKE_WIDTH, opt.strokeWidth);
            FXU.addSlider(layer, FX.STROKE_OPACITY, opt.strokeOpacity);
        }

        if (opt.fillMode === "Gradient Fill" || opt.strokeMode === "Gradient Stroke") {
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var w = rect.width + opt.paddingX * 2;
            FXU.addPoint(layer, FX.GRADIENT_START, [cx - w / 2, cy]);
            FXU.addPoint(layer, FX.GRADIENT_END, [cx + w / 2, cy]);
        }
    }

    function bindGradientGraphic(item, isFill, opacityDefault) {
        if (!item) {
            return;
        }

        var opacityProp = U.prop(item, isFill ? MN.FILL_OPACITY : MN.STROKE_OPACITY);
        var widthProp = isFill ? null : U.prop(item, MN.STROKE_WIDTH);
        var startProp = U.prop(item, MN.GRAD_START);
        var endProp = U.prop(item, MN.GRAD_END);

        U.setValueSafe(opacityProp, opacityDefault);

        if (isFill) {
            U.setExpressionSafe(opacityProp, U.lines([
                "effect(\"" + FX.FILL_OPACITY + "\")(1);"
            ]));
        } else {
            U.setExpressionSafe(widthProp, "effect(\"" + FX.STROKE_WIDTH + "\")(1);");
            U.setExpressionSafe(opacityProp, U.lines([
                "effect(\"" + FX.STROKE_OPACITY + "\")(1);"
            ]));
        }

        U.setExpressionSafe(startProp, U.lines([
            "var p = effect(\"" + FX.GRADIENT_START + "\")(1);",
            "[p[0], p[1]];"
        ]));

        U.setExpressionSafe(endProp, U.lines([
            "var p = effect(\"" + FX.GRADIENT_END + "\")(1);",
            "[p[0], p[1]];"
        ]));
    }

    function bindSolidFill(fill, opt) {
        var fillColor = U.prop(fill, MN.FILL_COLOR);
        var fillOpacity = U.prop(fill, MN.FILL_OPACITY);
        U.setColorSafe(fillColor, opt.fillColor);
        U.setValueSafe(fillOpacity, opt.fillOpacity);

        U.setExpressionSafe(fillColor, U.lines([
            "var c = effect(\"" + FX.FILL_COLOR + "\")(1);",
            "[c[0], c[1], c[2], 1];"
        ]));

        U.setExpressionSafe(fillOpacity, U.lines([
            "effect(\"" + FX.FILL_OPACITY + "\")(1);"
        ]));
    }

    function bindSolidStroke(stroke, opt) {
        var strokeColor = U.prop(stroke, MN.STROKE_COLOR);
        var strokeWidth = U.prop(stroke, MN.STROKE_WIDTH);
        var strokeOpacity = U.prop(stroke, MN.STROKE_OPACITY);
        U.setColorSafe(strokeColor, opt.strokeColor);
        U.setValueSafe(strokeWidth, opt.strokeWidth);
        U.setValueSafe(strokeOpacity, opt.strokeOpacity);

        U.setExpressionSafe(strokeColor, U.lines([
            "var c = effect(\"" + FX.STROKE_COLOR + "\")(1);",
            "[c[0], c[1], c[2], 1];"
        ]));

        U.setExpressionSafe(strokeWidth, "effect(\"" + FX.STROKE_WIDTH + "\")(1);");

        U.setExpressionSafe(strokeOpacity, U.lines([
            "effect(\"" + FX.STROKE_OPACITY + "\")(1);"
        ]));
    }

    function buildShapeContents(layer, rect, opt) {
        var contents = U.prop(layer, MN.ROOT_VECTORS);
        var group = SH.addVectorItem(contents, MN.VECTOR_GROUP, "Text BG Group");
        var vectors = U.prop(group, MN.VECTORS_GROUP);

        var rectPath = SH.addVectorItem(vectors, MN.RECT, "Rectangle Path");
        var rectSize = U.prop(rectPath, MN.RECT_SIZE);
        var rectPos = U.prop(rectPath, MN.RECT_POS);
        var rectRound = U.prop(rectPath, MN.RECT_ROUND);

        U.setValueSafe(rectSize, [rect.width + opt.paddingX * 2, rect.height + opt.paddingY * 2]);
        U.setValueSafe(rectPos, [rect.left + rect.width / 2, rect.top + rect.height / 2]);
        U.setValueSafe(rectRound, opt.roundness);

        U.setExpressionSafe(rectSize, U.lines([
            "var x = effect(\"" + FX.RECT_SIZE_X + "\")(1);",
            "var y = effect(\"" + FX.RECT_SIZE_Y + "\")(1);",
            "[x, y];"
        ]));

        U.setExpressionSafe(rectRound, "effect(\"" + FX.ROUNDNESS + "\")(1);");

        if (opt.fillMode === "Solid Fill") {
            bindSolidFill(SH.addVectorItem(vectors, MN.FILL, "Solid Fill"), opt);
        } else if (opt.fillMode === "Gradient Fill") {
            bindGradientGraphic(SH.addVectorItem(vectors, MN.GFILL, "Gradient Fill"), true, opt.fillOpacity);
        }

        if (opt.strokeMode === "Solid Stroke") {
            bindSolidStroke(SH.addVectorItem(vectors, MN.STROKE, "Solid Stroke"), opt);
        } else if (opt.strokeMode === "Gradient Stroke") {
            bindGradientGraphic(SH.addVectorItem(vectors, MN.GSTROKE, "Gradient Stroke"), false, opt.strokeOpacity);
        }
    }

    function setLayerPositionAtVisualCenter(layer, textLayer, center, t) {
        var tr = U.prop(layer, MN.TRANSFORM);
        var anchor = U.prop(tr, MN.ANCHOR);
        var position = U.prop(tr, MN.POSITION);
        var posX = U.prop(tr, MN.POS_X);
        var posY = U.prop(tr, MN.POS_Y);
        var posZ = U.prop(tr, MN.POS_Z);
        var compPoint;
        var targetPos;

        if (!tr) {
            return;
        }

        U.setValueSafe(anchor, AE.fitValueToTarget([center[0], center[1], 0], anchor));

        try {
            compPoint = textLayer.sourcePointToComp([center[0], center[1]]);
        } catch (e1) {
            try {
                compPoint = textLayer.toComp([center[0], center[1], 0]);
            } catch (e2) {
                compPoint = null;
            }
        }

        if (!compPoint) {
            return;
        }

        if (layer.parent) {
            try {
                targetPos = layer.parent.compPointToSource(compPoint);
            } catch (e3) {
                try {
                    targetPos = layer.parent.fromComp(compPoint);
                } catch (e4) {
                    targetPos = compPoint;
                }
            }
        } else {
            targetPos = compPoint;
        }

        if (position) {
            U.setValueSafe(position, AE.fitValueToTarget(targetPos, position));
        }

        if (posX) {
            U.setValueSafe(posX, targetPos[0]);
        }
        if (posY) {
            U.setValueSafe(posY, targetPos[1]);
        }
        if (posZ && targetPos.length > 2) {
            U.setValueSafe(posZ, targetPos[2]);
        }
    }

    function createForTextLayer(comp, textLayer, opt) {
        var t = comp.time;
        var rect = textLayer.sourceRectAtTime(t, false);
        var center = [rect.left + rect.width / 2, rect.top + rect.height / 2];
        var bg = comp.layers.addShape();

        bg.name = AE.uniqueLayerName(comp, textLayer.name + "_BG");

        try {
            bg.startTime = textLayer.startTime;
            bg.inPoint = textLayer.inPoint;
            bg.outPoint = textLayer.outPoint;
        } catch (e) {}

        AE.copyTransformSnapshot(textLayer, bg, t);
        setLayerPositionAtVisualCenter(bg, textLayer, center, t);
        addControls(bg, rect, opt);
        buildShapeContents(bg, rect, opt);

        try {
            bg.moveAfter(textLayer);
        } catch (e1) {}

        return bg;
    }

    function parentBackgroundsToTexts(pairs) {
        var i;
        for (i = 0; i < pairs.length; i++) {
            try {
                if (pairs[i].bg && pairs[i].text) {
                    pairs[i].bg.parent = pairs[i].text;
                }
            } catch (e) {}
        }
    }

    AEToolbox.tools.textBackgroundBox.create = function (paramsJson) {
        var comp = AE.getActiveComp();
        if (!comp) {
            return AEToolbox.toJson({
                ok: false,
                message: "Error: Please open or select a composition first.",
                selectionLabel: "No comp"
            });
        }

        if (!comp.selectedLayers || comp.selectedLayers.length === 0) {
            return AEToolbox.toJson({
                ok: false,
                message: "Error: Please select at least one text layer.",
                selectionLabel: "No selection"
            });
        }

        var textLayers = AE.getSelectedTextLayers(comp);
        if (textLayers.length === 0) {
            return AEToolbox.toJson({
                ok: false,
                message: "Error: Selection contains no text layers.",
                selectionLabel: "No text layers"
            });
        }

        var opt;
        try {
            opt = sanitizeOptions(AEToolbox.parseJson(paramsJson));
        } catch (parseError) {
            return AEToolbox.toJson({
                ok: false,
                message: "Error: Invalid parameters JSON.",
                selectionLabel: textLayers.length + " text layer(s)"
            });
        }

        var errors = [];
        var created = 0;
        var parentPairs = [];
        var bgLayer;

        app.beginUndoGroup("Create Text Background Box");
        try {
            for (var i = 0; i < textLayers.length; i++) {
                try {
                    bgLayer = createForTextLayer(comp, textLayers[i], opt);
                    parentPairs[parentPairs.length] = {
                        text: textLayers[i],
                        bg: bgLayer
                    };
                    created++;
                } catch (e1) {
                    errors[errors.length] = textLayers[i].name + ": " + e1.toString();
                }
            }
            parentBackgroundsToTexts(parentPairs);
        } catch (e2) {
            errors[errors.length] = e2.toString();
        } finally {
            app.endUndoGroup();
        }

        if (errors.length > 0) {
            return AEToolbox.toJson({
                ok: false,
                message: "Created " + created + " box(es), with " + errors.length + " error(s).",
                selectionLabel: textLayers.length + " text layer(s)"
            });
        }

        if (textLayers.length < comp.selectedLayers.length) {
            return AEToolbox.toJson({
                ok: true,
                message: "Created " + created + " background box(es). Non-text layers were ignored.",
                selectionLabel: textLayers.length + " text layer(s)"
            });
        }

        return AEToolbox.toJson({
            ok: true,
            message: "Created " + created + " background box(es).",
            selectionLabel: textLayers.length + " text layer(s)"
        });
    };
})();
