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
        var enableFill = raw.enableFill === false ? false : true;
        var enableStroke = raw.enableStroke === true ? true : false;
        var fillMode = raw.fillMode === "Gradient Fill" || raw.fillMode === "Solid Fill" ? raw.fillMode : "Solid Fill";
        var strokeMode = raw.strokeMode === "Gradient Stroke" || raw.strokeMode === "Solid Stroke" ? raw.strokeMode : "Solid Stroke";
        var roundnessValue = typeof raw.cornerRadius !== "undefined" ? raw.cornerRadius : raw.roundness;

        return {
            paddingX: Math.max(0, U.number(raw.paddingX, 40)),
            paddingY: Math.max(0, U.number(raw.paddingY, 20)),
            roundness: Math.max(0, U.number(roundnessValue, 20)),
            enableFill: enableFill,
            fillMode: enableFill ? fillMode : "None",
            fillColor: U.hexToColor(U.normalizeHex(raw.fillColor, "#202020")),
            fillOpacity: U.clamp(U.number(raw.fillOpacity, 80), 0, 100),
            enableStroke: enableStroke,
            strokeMode: enableStroke ? strokeMode : "None",
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
        var group = SH.addVectorItem(contents, MN.VECTOR_GROUP, "Rounded Rect Group");
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

    function layerVisualBoundsInComp(layer, t) {
        var rect = null;
        var points = [];
        var compPoints = [];
        var left;
        var right;
        var top;
        var bottom;
        var i;
        var p;

        try {
            if (layer.sourceRectAtTime) {
                rect = layer.sourceRectAtTime(t, false);
            }
        } catch (e1) {
            rect = null;
        }

        if (!rect || rect.width <= 0 || rect.height <= 0) {
            try {
                if (layer.width && layer.height) {
                    rect = {
                        left: 0,
                        top: 0,
                        width: layer.width,
                        height: layer.height
                    };
                }
            } catch (e2) {
                rect = null;
            }
        }

        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return null;
        }

        points[0] = [rect.left, rect.top, 0];
        points[1] = [rect.left + rect.width, rect.top, 0];
        points[2] = [rect.left + rect.width, rect.top + rect.height, 0];
        points[3] = [rect.left, rect.top + rect.height, 0];

        for (i = 0; i < points.length; i++) {
            try {
                compPoints[i] = layer.toComp(points[i]);
            } catch (e3) {
                return null;
            }
        }

        left = compPoints[0][0];
        right = compPoints[0][0];
        top = compPoints[0][1];
        bottom = compPoints[0][1];

        for (i = 1; i < compPoints.length; i++) {
            p = compPoints[i];
            left = Math.min(left, p[0]);
            right = Math.max(right, p[0]);
            top = Math.min(top, p[1]);
            bottom = Math.max(bottom, p[1]);
        }

        return {
            left: left,
            top: top,
            width: right - left,
            height: bottom - top,
            centerX: (left + right) / 2,
            centerY: (top + bottom) / 2
        };
    }

    function createCenteredRoundedRect(comp, name, centerX, centerY, width, height, opt, sourceLayer) {
        var rect = {
            left: -width / 2,
            top: -height / 2,
            width: width,
            height: height
        };
        var bg = comp.layers.addShape();
        var tr = U.prop(bg, MN.TRANSFORM);
        var pos = U.prop(tr, MN.POSITION);
        var anchor = U.prop(tr, MN.ANCHOR);

        bg.name = AE.uniqueLayerName(comp, name);

        if (sourceLayer) {
            try {
                bg.startTime = sourceLayer.startTime;
                bg.inPoint = sourceLayer.inPoint;
                bg.outPoint = sourceLayer.outPoint;
            } catch (e1) {}
        }

        U.setValueSafe(anchor, AE.fitValueToTarget([0, 0, 0], anchor));
        U.setValueSafe(pos, AE.fitValueToTarget([centerX, centerY, 0], pos));

        addControls(bg, rect, opt);
        buildShapeContents(bg, rect, opt);

        if (sourceLayer) {
            try {
                bg.moveAfter(sourceLayer);
            } catch (e2) {}
        }

        return bg;
    }

    function createForVisualLayer(comp, sourceLayer, opt) {
        var t = comp.time;
        var bounds = layerVisualBoundsInComp(sourceLayer, t);
        if (!bounds) {
            throw new Error("Unable to read visual bounds.");
        }
        return createCenteredRoundedRect(
            comp,
            sourceLayer.name + "_BG",
            bounds.centerX,
            bounds.centerY,
            bounds.width,
            bounds.height,
            opt,
            sourceLayer
        );
    }

    function createDefaultRoundedRect(comp, opt) {
        var defaultOpt = {};
        var k;
        for (k in opt) {
            if (opt.hasOwnProperty(k)) {
                defaultOpt[k] = opt[k];
            }
        }
        defaultOpt.paddingX = 0;
        defaultOpt.paddingY = 0;
        defaultOpt.roundness = 15;
        return createCenteredRoundedRect(
            comp,
            "Background Rounded Rectangle",
            comp.width / 2,
            comp.height / 2,
            100,
            100,
            defaultOpt,
            null
        );
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

    function createForSelectedLayer(comp, layer, opt) {
        if (AE.isTextLayer(layer)) {
            return createForTextLayer(comp, layer, opt);
        }
        return createForVisualLayer(comp, layer, opt);
    }

    function parentBackgroundsToSources(pairs) {
        var i;
        for (i = 0; i < pairs.length; i++) {
            try {
                if (pairs[i].bg && pairs[i].source) {
                    pairs[i].bg.parent = pairs[i].source;
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

        var opt;
        try {
            opt = sanitizeOptions(AEToolbox.parseJson(paramsJson));
        } catch (parseError) {
            return AEToolbox.toJson({
                ok: false,
                message: "Error: Invalid parameters JSON.",
                selectionLabel: "Invalid params"
            });
        }

        var selectedLayers = comp.selectedLayers || [];
        var errors = [];
        var created = 0;
        var parentPairs = [];
        var bgLayer;
        var i;

        app.beginUndoGroup("Create Background Rounded Rectangle");
        try {
            if (selectedLayers.length === 0) {
                createDefaultRoundedRect(comp, opt);
                created = 1;
            }
            for (i = 0; i < selectedLayers.length; i++) {
                try {
                    bgLayer = createForSelectedLayer(comp, selectedLayers[i], opt);
                    parentPairs[parentPairs.length] = {
                        source: selectedLayers[i],
                        bg: bgLayer
                    };
                    created++;
                } catch (e1) {
                    errors[errors.length] = selectedLayers[i].name + ": " + e1.toString();
                }
            }
            parentBackgroundsToSources(parentPairs);
        } catch (e2) {
            errors[errors.length] = e2.toString();
        } finally {
            app.endUndoGroup();
        }

        if (errors.length > 0) {
            return AEToolbox.toJson({
                ok: false,
                message: "Created " + created + " rounded rectangle(s), with " + errors.length + " error(s).",
                count: created,
                selectionLabel: selectedLayers.length ? selectedLayers.length + " layer(s)" : "No selection"
            });
        }

        if (selectedLayers.length === 0) {
            return AEToolbox.toJson({
                ok: true,
                messageKey: "tools.textBackgroundBox.status.noLayerSelected",
                message: "Created default 100x100 rounded rectangle.",
                count: created,
                selectionLabel: "Default 100x100"
            });
        }

        return AEToolbox.toJson({
            ok: true,
            messageKey: "tools.textBackgroundBox.status.created",
            message: "Created " + created + " background rounded rectangle(s).",
            count: created,
            selectionLabel: selectedLayers.length + " layer(s)"
        });
    };
})();
