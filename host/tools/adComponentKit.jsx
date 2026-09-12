(function () {
    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.adComponentKit = AEToolbox.tools.adComponentKit || {};

    var ICON_GRID_VERSION = "ICON_GRID_SCALE_FIX_OLD_SCALE_V1";
    var ICON_GRID_FUNCTION_NAME = "AEToolbox.tools.adComponentKit.createIconGrid";
    var ICON_GRID_FILE = "host/tools/adComponentKit.jsx";
    var ARTIFACT_METADATA_PREFIX = "LOMOND_CABINET_ARTIFACT_V1:";
    var EXPRESSION_BINDING_PREFIX = "// LOMOND_CABINET_BINDING_V1";

    function jsonResult(ok, message, extra) {
        var s = "{\"ok\":" + (ok ? "true" : "false") + ",\"message\":\"" + AEToolbox.jsonEscape(message) + "\"";
        if (extra) {
            s += "," + extra;
        }
        return s + "}";
    }

    function num(v, fallback) {
        var n = parseFloat(v);
        return isNaN(n) ? fallback : n;
    }

    function boolValue(v, fallback) {
        if (typeof v === "boolean") {
            return v;
        }
        if (v === "true") {
            return true;
        }
        if (v === "false") {
            return false;
        }
        return fallback;
    }

    function paramsFromJson(paramsJson) {
        var p = {};
        try {
            p = AEToolbox.parseJson(paramsJson || "{}");
        } catch (err) {
            p = {};
        }
        p.gap = num(p.gap, 14);
        p.paddingX = num(p.paddingX, 24);
        p.paddingY = num(p.paddingY, 12);
        p.cornerRadius = num(p.cornerRadius, 28);
        p.pillWidthMode = p.pillWidthMode || "auto";
        p.fixedWidth = num(p.fixedWidth, 320);
        p.fillColor = p.fillColor || "#D6B25E";
        p.gradientEnable = boolValue(p.gradientEnable, false);
        p.textAlign = p.textAlign || "center";
        p.sortMode = p.sortMode || "yPosition";
        p.columns = Math.max(1, Math.round(num(p.columns, 4)));
        p.targetWidth = num(p.targetWidth, 72);
        p.targetHeight = num(p.targetHeight, 72);
        p.cellWidth = num(p.cellWidth, 100);
        p.cellHeight = num(p.cellHeight, 118);
        p.gapX = num(p.gapX, 28);
        p.gapY = num(p.gapY, 24);
        p.lastRowAlign = p.lastRowAlign || "center";
        p.normalizeMode = p.normalizeMode || "fitBox";
        p.gridSortMode = p.gridSortMode || "rowMajor";
        return p;
    }

    function getComp() {
        var comp = app.project && app.project.activeItem;
        return comp && comp instanceof CompItem ? comp : null;
    }

    function area(left, top, right, bottom) {
        return {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            width: Math.max(0, right - left),
            height: Math.max(0, bottom - top),
            centerX: (left + right) / 2,
            centerY: (top + bottom) / 2
        };
    }

    function measurementError(reason) {
        // Keep the public action envelope; never depend on a thrown API value for the reason.
        return new Error("ACK_MEASUREMENT_" + reason);
    }

    function measurementNumber(value) {
        return typeof value === "number" && isFinite(value);
    }

    function requireMeasurementCurrentTime(layer, time) {
        var comp;
        var currentTime;
        // sourcePointToComp uses current comp.time. This absolute seconds epsilon
        // permits float representation noise only; it is not a frame/geometry tolerance.
        var timeEpsilon = 1e-9;
        if (!measurementNumber(time)) { throw measurementError("INVALID_TIME"); }
        try {
            comp = layer.containingComp;
            currentTime = comp.time;
        } catch (timeError) { throw measurementError("TIME_UNAVAILABLE"); }
        if (!measurementNumber(currentTime)) { throw measurementError("TIME_UNAVAILABLE"); }
        if (Math.abs(currentTime - time) > timeEpsilon) { throw measurementError("TIME_MISMATCH"); }
    }

    function convertMeasurementSourcePointToComp(layer, point, time) {
        var result;
        requireMeasurementCurrentTime(layer, time);
        try {
            if (typeof layer.sourcePointToComp !== "function") { throw measurementError("TO_COMP_UNAVAILABLE"); }
            result = layer.sourcePointToComp([point[0], point[1]]);
        } catch (conversionError) { throw measurementError("TO_COMP_FAILED"); }
        try {
            if (!result || !measurementNumber(result.length) || result.length < 2 ||
                    !measurementNumber(result[0]) || !measurementNumber(result[1])) {
                throw measurementError("INVALID_COMP_POINT");
            }
            return [result[0], result[1]];
        } catch (pointError) { throw measurementError("INVALID_COMP_POINT"); }
    }

    function checkedMeasurementBounds(left, top, right, bottom) {
        var bounds = area(left, top, right, bottom);
        var keys = ["left", "top", "right", "bottom", "width", "height", "centerX", "centerY"];
        var i;
        for (i = 0; i < keys.length; i++) {
            if (!measurementNumber(bounds[keys[i]])) { throw measurementError("NON_FINITE_BOUNDS"); }
        }
        if (bounds.width <= 0 || bounds.height <= 0) { throw measurementError("ZERO_SIZE_BOUNDS"); }
        return bounds;
    }

    function readMeasurementRect(layer, time) {
        var rect = null;
        var width;
        var height;
        try {
            if (!layer) { throw measurementError("SOURCE_UNAVAILABLE"); }
            if (typeof layer.sourceRectAtTime === "function") {
                rect = layer.sourceRectAtTime(time, false);
            }
        } catch (sourceError) { throw measurementError("SOURCE_RECT_UNREADABLE"); }
        if (rect === null || typeof rect === "undefined") {
            // Only an AV source's explicit dimensions have the retained rectangular fallback.
            // A thrown read or an existing invalid rect is never replaced with another geometry.
            try {
                if (layer.matchName !== "ADBE AV Layer" || !layer.source || layer.nullLayer) {
                    throw measurementError("SOURCE_RECT_UNAVAILABLE");
                }
                width = layer.width;
                height = layer.height;
            } catch (sizeError) { throw measurementError("SOURCE_RECT_UNAVAILABLE"); }
            rect = { left: 0, top: 0, width: width, height: height };
        }
        try {
            rect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        } catch (rectError) { throw measurementError("SOURCE_RECT_UNREADABLE"); }
        if (!measurementNumber(rect.left) || !measurementNumber(rect.top) ||
                !measurementNumber(rect.width) || !measurementNumber(rect.height) ||
                !measurementNumber(rect.left + rect.width) || !measurementNumber(rect.top + rect.height)) {
            throw measurementError("INVALID_SOURCE_RECT");
        }
        if (rect.width <= 0 || rect.height <= 0) { throw measurementError("ZERO_SIZE_SOURCE_RECT"); }
        return rect;
    }

    function measureLayerVisualBoundsInComp(layer, time) {
        var rect;
        var pts;
        var converted = [];
        var i;
        var p;
        var left;
        var top;
        var right;
        var bottom;
        requireMeasurementCurrentTime(layer, time);
        rect = readMeasurementRect(layer, time);
        pts = [[rect.left, rect.top], [rect.left + rect.width, rect.top],
            [rect.left + rect.width, rect.top + rect.height], [rect.left, rect.top + rect.height]];
        for (i = 0; i < pts.length; i++) {
            p = convertMeasurementSourcePointToComp(layer, pts[i], time);
            converted[i] = p;
            if (i === 0) { left = right = p[0]; top = bottom = p[1]; }
            left = Math.min(left, p[0]);
            top = Math.min(top, p[1]);
            right = Math.max(right, p[0]);
            bottom = Math.max(bottom, p[1]);
        }
        return { rect: rect, points: converted, bounds: checkedMeasurementBounds(left, top, right, bottom) };
    }

    function getLayerVisualBoundsInComp(layer, time) {
        // Success shape is unchanged. Failure now throws instead of manufacturing comp bounds.
        return measureLayerVisualBoundsInComp(layer, time).bounds;
    }

    function gridFiniteNumber(value) {
        return typeof value === "number" && isFinite(value);
    }

    function gridFinitePoint(value) {
        return value && value.length >= 2 && gridFiniteNumber(value[0]) && gridFiniteNumber(value[1]);
    }

    function convertGridSourcePointToCompStrict(layer, point) {
        var result;
        if (!layer || typeof layer.sourcePointToComp !== "function") {
            return gridFailure("GRID_TO_COMP_FAILED");
        }
        try {
            result = layer.sourcePointToComp([point[0], point[1]]);
        } catch (err) {
            return gridFailure("GRID_TO_COMP_FAILED");
        }
        if (!gridFinitePoint(result)) {
            return gridFailure("GRID_NON_FINITE_BOUNDS");
        }
        return { ok: true, point: [result[0], result[1]] };
    }

    function gridFailure(reason) {
        return { ok: false, reason: reason };
    }

    function classifyGridLayer(layer) {
        var matchName;
        if (!layer) { return "unsupported"; }
        try { matchName = String(layer.matchName || ""); } catch (err) { return "unsupported"; }
        if (matchName === "ADBE Vector Layer") { return "shape"; }
        if (matchName === "ADBE Text Layer") { return "text"; }
        if (matchName === "ADBE AV Layer") { return "av"; }
        return "unsupported";
    }

    function gridSourceSizeRect(layer) {
        var width;
        var height;
        if (!layer || layer.matchName !== "ADBE AV Layer") {
            return null;
        }
        try {
            width = layer.width;
            height = layer.height;
        } catch (err) {
            return null;
        }
        if (!gridFiniteNumber(width) || !gridFiniteNumber(height)) {
            return { invalid: "GRID_NON_FINITE_BOUNDS" };
        }
        if (width <= 0 || height <= 0) {
            return { invalid: "GRID_ZERO_SIZE_BOUNDS" };
        }
        return { left: 0, top: 0, width: width, height: height };
    }

    function getGridVisualBoundsInComp(layer, comp, time) {
        var rect = null;
        var sourceReadFailed = false;
        var layerType = classifyGridLayer(layer);
        var pts;
        var i;
        var p;
        var converted;
        var left = 9999999;
        var top = 9999999;
        var right = -9999999;
        var bottom = -9999999;
        var fallback;
        var bounds;
        if (!layer || !comp) {
            return gridFailure("GRID_INVALID_SOURCE_BOUNDS");
        }
        try {
            if (layer.containingComp !== comp || !gridFiniteNumber(layer.index) || layer.index < 1 || comp.layer(layer.index) !== layer) {
                return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
            }
        } catch (membershipError) {
            return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
        }
        try {
            if (typeof layer.sourceRectAtTime === "function") {
                rect = layer.sourceRectAtTime(time, false);
            } else {
                sourceReadFailed = true;
            }
        } catch (sourceError) {
            sourceReadFailed = true;
        }
        if (!rect) {
            if (layerType === "text" || layerType === "shape") {
                return gridFailure("GRID_INVALID_SOURCE_BOUNDS");
            }
            fallback = gridSourceSizeRect(layer);
            if (!fallback) {
                return gridFailure("GRID_INVALID_SOURCE_BOUNDS");
            }
            if (fallback.invalid) {
                return gridFailure(fallback.invalid);
            }
            rect = fallback;
        } else if (sourceReadFailed) {
            return gridFailure("GRID_INVALID_SOURCE_BOUNDS");
        }
        if (!gridFiniteNumber(rect.left) || !gridFiniteNumber(rect.top) || !gridFiniteNumber(rect.width) || !gridFiniteNumber(rect.height)) {
            return gridFailure("GRID_NON_FINITE_BOUNDS");
        }
        if (rect.width <= 0 || rect.height <= 0) {
            return gridFailure("GRID_ZERO_SIZE_BOUNDS");
        }
        pts = [
            [rect.left, rect.top],
            [rect.left + rect.width, rect.top],
            [rect.left + rect.width, rect.top + rect.height],
            [rect.left, rect.top + rect.height]
        ];
        for (i = 0; i < pts.length; i++) {
            converted = convertGridSourcePointToCompStrict(layer, pts[i]);
            if (!converted.ok) { return converted; }
            p = converted.point;
            left = Math.min(left, p[0]);
            top = Math.min(top, p[1]);
            right = Math.max(right, p[0]);
            bottom = Math.max(bottom, p[1]);
        }
        if (!gridFiniteNumber(left) || !gridFiniteNumber(top) || !gridFiniteNumber(right) || !gridFiniteNumber(bottom)) {
            return gridFailure("GRID_NON_FINITE_BOUNDS");
        }
        bounds = area(left, top, right, bottom);
        if (!gridFiniteNumber(bounds.width) || !gridFiniteNumber(bounds.height) || !gridFiniteNumber(bounds.centerX) || !gridFiniteNumber(bounds.centerY)) {
            return gridFailure("GRID_NON_FINITE_BOUNDS");
        }
        if (bounds.width <= 0 || bounds.height <= 0) {
            return gridFailure("GRID_ZERO_SIZE_BOUNDS");
        }
        return { ok: true, bounds: bounds };
    }

    function gridPropertyWritable(prop) {
        return !!(prop && typeof prop.setValue === "function");
    }

    function gridPropertyHasExpression(prop) {
        try {
            return !!(prop && prop.expressionEnabled);
        } catch (err) {
            return true;
        }
    }

    function validateGridLayer(layer, comp, time) {
        var tr;
        var anchor;
        var position;
        var scale;
        var rotation;
        var positionX;
        var positionY;
        var anchorValue;
        var positionValue;
        var scaleValue;
        var rotationValue;
        var boundsResult;
        var separated = false;
        var layerType = classifyGridLayer(layer);
        if (!layer) { return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE"); }
        try { if (layer.threeDLayer) { return gridFailure("GRID_UNSUPPORTED_3D_LAYER"); } } catch (threeDError) { return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE"); }
        try { if (layer.parent) { return gridFailure("GRID_UNSUPPORTED_PARENTED_LAYER"); } } catch (parentError) { return gridFailure("GRID_UNSUPPORTED_PARENTED_LAYER"); }
        try { if (layer.locked) { return gridFailure("GRID_LOCKED_LAYER"); } } catch (lockError) { return gridFailure("GRID_LOCKED_LAYER"); }
        try {
            if (layer.nullLayer || layer.adjustmentLayer || layer.matchName === "ADBE Camera Layer" || layer.matchName === "ADBE Light Layer") {
                return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
            }
            if (layerType === "av" && (layer.collapseTransformation === true || layer.continuouslyRasterize === true)) {
                return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
            }
        } catch (typeError) {
            return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
        }
        if (layerType === "unsupported") {
            return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
        }
        try {
            tr = layer.property("ADBE Transform Group");
            anchor = tr && tr.property("ADBE Anchor Point");
            position = tr && tr.property("ADBE Position");
            scale = tr && tr.property("ADBE Scale");
            rotation = tr && tr.property("ADBE Rotate Z");
        } catch (transformError) {
            return gridFailure("GRID_TRANSFORM_NOT_WRITABLE");
        }
        if (!gridPropertyWritable(anchor) || !gridPropertyWritable(position) || !gridPropertyWritable(scale) || !gridPropertyWritable(rotation)) {
            return gridFailure("GRID_TRANSFORM_NOT_WRITABLE");
        }
        if (gridPropertyHasExpression(anchor) || gridPropertyHasExpression(position) || gridPropertyHasExpression(scale) || gridPropertyHasExpression(rotation)) {
            return gridFailure("GRID_TRANSFORM_EXPRESSION");
        }
        try {
            anchorValue = anchor.value;
            positionValue = position.value;
            scaleValue = scale.value;
            rotationValue = rotation.value;
            separated = position.dimensionsSeparated === true;
        } catch (valueError) {
            return gridFailure("GRID_TRANSFORM_NOT_WRITABLE");
        }
        if (!gridFinitePoint(anchorValue) || !gridFinitePoint(positionValue) || !gridFinitePoint(scaleValue) || !gridFiniteNumber(rotationValue)) {
            return gridFailure("GRID_TRANSFORM_NOT_WRITABLE");
        }
        if (Math.abs(rotationValue) > 0.001) {
            return gridFailure("GRID_UNSUPPORTED_ROTATION");
        }
        if (scaleValue[0] <= 0 || scaleValue[1] <= 0) {
            return gridFailure("GRID_UNSUPPORTED_NEGATIVE_SCALE");
        }
        if (separated) {
            try {
                positionX = tr.property("ADBE Position_0");
                positionY = tr.property("ADBE Position_1");
            } catch (separatedError) {
                return gridFailure("GRID_TRANSFORM_NOT_WRITABLE");
            }
            if (!gridPropertyWritable(positionX) || !gridPropertyWritable(positionY) || gridPropertyHasExpression(positionX) || gridPropertyHasExpression(positionY)) {
                return gridFailure(gridPropertyHasExpression(positionX) || gridPropertyHasExpression(positionY) ? "GRID_TRANSFORM_EXPRESSION" : "GRID_TRANSFORM_NOT_WRITABLE");
            }
        }
        boundsResult = getGridVisualBoundsInComp(layer, comp, time);
        if (!boundsResult.ok) { return boundsResult; }
        return {
            ok: true,
            candidate: {
                layer: layer,
                bounds: boundsResult.bounds,
                scaleX: scaleValue[0],
                scaleY: scaleValue[1]
            }
        };
    }

    function gridFailureJson(reason, invalidCount, layer, fallbackMessage) {
        var layerIndex = 0;
        var layerName = "";
        try { layerIndex = layer && gridFiniteNumber(layer.index) ? layer.index : 0; } catch (indexError) {}
        try { layerName = layer ? String(layer.name || "") : ""; } catch (nameError) {}
        return jsonResult(false, fallbackMessage || "Icon Grid input is not supported.",
            "\"reason\":\"" + AEToolbox.jsonEscape(reason || "GRID_TRANSFORM_NOT_WRITABLE") + "\"," +
            "\"invalidLayerCount\":" + Math.max(0, invalidCount || 0) + "," +
            "\"firstInvalidLayerIndex\":" + layerIndex + "," +
            "\"firstInvalidLayerName\":\"" + AEToolbox.jsonEscape(layerName) + "\"");
    }

    function isShapeLayer(layer) {
        try {
            return !!layer.property("ADBE Root Vectors Group");
        } catch (err) {
            return false;
        }
    }

    function getTextVisualBounds2D(layer, time, measuredRect) {
        var rect = measuredRect || readMeasurementRect(layer, time);
        var tr = layer.property("ADBE Transform Group");
        var pos = tr.property("ADBE Position").value;
        var anchor = tr.property("ADBE Anchor Point").value;
        var scale = tr.property("ADBE Scale").value;
        if (!pos || !anchor || !scale || !measurementNumber(pos[0]) || !measurementNumber(pos[1]) ||
                !measurementNumber(anchor[0]) || !measurementNumber(anchor[1]) ||
                !measurementNumber(scale[0]) || !measurementNumber(scale[1])) {
            throw measurementError("INVALID_SIMPLE_2D_TRANSFORM");
        }
        var left = pos[0] + (rect.left - anchor[0]) * scale[0] / 100;
        var top = pos[1] + (rect.top - anchor[1]) * scale[1] / 100;
        var right = left + rect.width * scale[0] / 100;
        var bottom = top + rect.height * scale[1] / 100;
        if (left > right) {
            left = right + left;
            right = left - right;
            left = left - right;
        }
        if (top > bottom) {
            top = bottom + top;
            bottom = top - bottom;
            top = top - bottom;
        }
        return checkedMeasurementBounds(left, top, right, bottom);
    }

    function canUseTextBounds2D(layer) {
        var tr;
        var rot;
        if (!isTextLayer(layer) || layer.threeDLayer || layer.parent) {
            return false;
        }
        tr = layer.property("ADBE Transform Group");
        if (!tr) {
            return false;
        }
        try {
            rot = tr.property("ADBE Rotate Z").value;
        } catch (err) {
            return false;
        }
        return Math.abs(rot) < 0.001;
    }

    function unionTextBounds2D(layers, comp, measurements) {
        var i;
        var b;
        var left = 999999;
        var top = 999999;
        var right = -999999;
        var bottom = -999999;
        for (i = 0; i < layers.length; i++) {
            b = getTextVisualBounds2D(layers[i], comp.time, measurements && measurements[i].measurement.rect);
            if (i === 0) { left = b.left; top = b.top; right = b.right; bottom = b.bottom; }
            left = Math.min(left, b.left);
            top = Math.min(top, b.top);
            right = Math.max(right, b.right);
            bottom = Math.max(bottom, b.bottom);
        }
        if (!layers.length) { throw measurementError("NO_SOURCE_LAYERS"); }
        return checkedMeasurementBounds(left, top, right, bottom);
    }

    function unionOriginalFeatureTextBounds(layers, comp, measurements) {
        var i;
        var allSimple2D = true;
        var warning = "";
        var bounds;
        for (i = 0; i < layers.length; i++) {
            if (!canUseTextBounds2D(layers[i])) {
                allSimple2D = false;
                break;
            }
        }
        if (allSimple2D) {
            bounds = unionTextBounds2D(layers, comp, measurements);
        } else {
            bounds = unionBoundsForLayers(layers, comp, measurements);
            warning = "Used comp-space bounds fallback for parented, rotated, or non-simple text layers.";
        }
        return {
            bounds: bounds,
            warning: warning
        };
    }

    function layerPositionDistanceFromOrigin(layer) {
        var p = positionProp(layer);
        var v;
        if (!p) {
            return 0;
        }
        v = p.value;
        return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    }

    function positionProp(layer) {
        var tr = layer.property("ADBE Transform Group");
        return tr ? tr.property("ADBE Position") : null;
    }

    function scaleProp(layer) {
        var tr = layer.property("ADBE Transform Group");
        return tr ? tr.property("ADBE Scale") : null;
    }

    function hasTransformExpression(layer, propName) {
        var tr = layer.property("ADBE Transform Group");
        var prop = tr ? tr.property(propName) : null;
        try {
            return !!(prop && prop.expressionEnabled);
        } catch (err) {
            return false;
        }
    }

    function getScale2D(layer) {
        var s = scaleProp(layer);
        var v;
        if (!s) {
            return [100, 100];
        }
        v = s.value;
        return [v[0], v[1]];
    }

    function translateLayerBy(layer, dx, dy) {
        var p = positionProp(layer);
        var v;
        if (!p) {
            return;
        }
        v = p.value;
        if (v.length > 2) {
            p.setValue([v[0] + dx, v[1] + dy, v[2]]);
        } else {
            p.setValue([v[0] + dx, v[1] + dy]);
        }
    }

    function moveLayerBoundsCenterTo(layer, x, y) {
        var b = getLayerVisualBoundsInComp(layer, layer.containingComp.time);
        translateLayerBy(layer, x - b.centerX, y - b.centerY);
    }

    function moveLayerVisualCenterToComp(layer, targetX, targetY) {
        var b = getLayerVisualBoundsInComp(layer, layer.containingComp.time);
        translateLayerBy(layer, targetX - b.centerX, targetY - b.centerY);
    }

    function setAnchorToVisualCenter(layer) {
        var tr = layer.property("ADBE Transform Group");
        var anchor = tr ? tr.property("ADBE Anchor Point") : null;
        var position = tr ? tr.property("ADBE Position") : null;
        var rect = null;
        var oldCenter;
        var localCenter;
        var posValue;
        if (!anchor || !position || !layer.sourceRectAtTime) {
            return;
        }
        oldCenter = getLayerVisualBoundsInComp(layer, layer.containingComp.time);
        try {
            rect = layer.sourceRectAtTime(layer.containingComp.time, false);
        } catch (err) {
            rect = null;
        }
        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return;
        }
        localCenter = [rect.left + rect.width / 2, rect.top + rect.height / 2];
        if (anchor.value.length > 2) {
            anchor.setValue([localCenter[0], localCenter[1], anchor.value[2]]);
        } else {
            anchor.setValue(localCenter);
        }
        posValue = position.value;
        if (posValue.length > 2) {
            position.setValue([posValue[0], posValue[1], posValue[2]]);
        } else {
            position.setValue([posValue[0], posValue[1]]);
        }
        moveLayerBoundsCenterTo(layer, oldCenter.centerX, oldCenter.centerY);
    }

    function centerTextAnchor(layer, time, measuredRect) {
        var tr = layer.property("ADBE Transform Group");
        var anchor = tr ? tr.property("ADBE Anchor Point") : null;
        var rect;
        var newAnchor;
        if (!anchor || !layer.sourceRectAtTime) {
            return;
        }
        rect = measuredRect || layer.sourceRectAtTime(time, false);
        newAnchor = [rect.left + rect.width / 2, rect.top + rect.height / 2];
        if (anchor.value.length > 2) {
            anchor.setValue([newAnchor[0], newAnchor[1], anchor.value[2]]);
        } else {
            anchor.setValue(newAnchor);
        }
    }

    function centerLayerAnchorToVisualCenter(layer, time) {
        var tr = layer.property("ADBE Transform Group");
        var anchor = tr ? tr.property("ADBE Anchor Point") : null;
        var rect = null;
        var newAnchor;
        if (!anchor) {
            return;
        }
        try {
            if (layer.sourceRectAtTime) {
                rect = layer.sourceRectAtTime(time, false);
            }
        } catch (err1) {
            rect = null;
        }
        if (rect && rect.width > 0 && rect.height > 0) {
            newAnchor = [rect.left + rect.width / 2, rect.top + rect.height / 2];
        } else {
            newAnchor = [(layer.width || 0) / 2, (layer.height || 0) / 2];
        }
        if (anchor.value.length > 2) {
            anchor.setValue([newAnchor[0], newAnchor[1], anchor.value[2]]);
        } else {
            anchor.setValue(newAnchor);
        }
    }

    function setLayerLocalPosition(layer, x, y) {
        var p = positionProp(layer);
        var v;
        if (!p) {
            return;
        }
        try {
            if (p.dimensionsSeparated) {
                var tr = layer.property("ADBE Transform Group");
                var px = tr.property("ADBE Position_0");
                var py = tr.property("ADBE Position_1");
                if (px) {
                    px.setValue(x);
                }
                if (py) {
                    py.setValue(y);
                }
                return;
            }
        } catch (sepErr) {
        }
        v = p.value;
        if (v.length > 2) {
            p.setValue([x, y, v[2]]);
        } else {
            p.setValue([x, y]);
        }
    }

    function fitLayerToArea(layer, target) {
        var b = getLayerVisualBoundsInComp(layer, layer.containingComp.time);
        var s;
        var v;
        var factor;
        if (b.width <= 0 || b.height <= 0) {
            return;
        }
        s = scaleProp(layer);
        if (!s) {
            return;
        }
        factor = Math.min(target.width / b.width, target.height / b.height);
        v = s.value;
        if (v.length > 2) {
            s.setValue([v[0] * factor, v[1] * factor, v[2]]);
        } else {
            s.setValue([v[0] * factor, v[1] * factor]);
        }
        moveLayerBoundsCenterTo(layer, target.centerX, target.centerY);
    }

    function isTextLayer(layer) {
        try {
            return !!layer.property("ADBE Text Properties");
        } catch (err) {
            return false;
        }
    }

    function metadata(componentId, componentType, role, index) {
        return "{\"aetoolbox\":true,\"componentId\":\"" + AEToolbox.jsonEscape(componentId) + "\",\"componentType\":\"" + AEToolbox.jsonEscape(componentType) + "\",\"role\":\"" + AEToolbox.jsonEscape(role) + "\",\"index\":" + index + "}";
    }

    function pad2(n) {
        n = Math.floor(Math.abs(n));
        return n < 10 ? "0" + n : String(n);
    }

    function createArtifactId(kind) {
        var d = new Date();
        var random = Math.floor(Math.random() * 1000000);
        return "ack_" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "_" + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) + "_" + String(random);
    }

    function createdAtString() {
        var d = new Date();
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
    }

    function encodeText(value) {
        try {
            return encodeURIComponent(String(value || ""));
        } catch (err) {
            return "";
        }
    }

    function decodeText(value) {
        try {
            return decodeURIComponent(String(value || ""));
        } catch (err) {
            return "";
        }
    }

    function buildArtifactMetadata(data) {
        var out = {
            owner: "Lomond Cabinet / AEToolbox",
            tool: "adComponentKit",
            kind: data.kind || data.componentType || "",
            artifactId: data.artifactId || data.componentId || "",
            componentId: data.componentId || data.artifactId || "",
            componentType: data.componentType || data.kind || "",
            role: data.role || "",
            index: typeof data.index === "number" ? data.index : 0,
            createdAt: data.createdAt || createdAtString()
        };
        if (typeof data.previousCommentEncoded === "string") {
            out.previousCommentEncoded = data.previousCommentEncoded;
        }
        return ARTIFACT_METADATA_PREFIX + AEToolbox.stringify(out);
    }

    function parseArtifactMetadata(comment) {
        var raw = String(comment || "");
        var json;
        var data;
        if (raw.indexOf(ARTIFACT_METADATA_PREFIX) !== 0) {
            return null;
        }
        json = raw.substr(ARTIFACT_METADATA_PREFIX.length);
        try {
            data = AEToolbox.parseJson(json);
        } catch (err) {
            return null;
        }
        if (!data || data.tool !== "adComponentKit" || !data.artifactId) {
            return null;
        }
        data.aetoolbox = true;
        data.componentId = data.componentId || data.artifactId;
        data.componentType = data.componentType || data.kind;
        data.kind = data.kind || data.componentType;
        return data;
    }

    function setLayerArtifactMetadata(layer, data) {
        var raw = "";
        var existing;
        if (!layer) {
            return;
        }
        if (data.role === "sourceLayerBinding") {
            // A missing comment read is not evidence of an empty original comment.
            raw = layer.comment;
            if (typeof raw !== "string") {
                throw new Error("Source comment is unavailable.");
            }
            existing = parseMetadata(layer);
            if (existing) {
                if (existing.role !== "sourceLayerBinding" && existing.role !== "itemText") {
                    throw new Error("Source comment belongs to another component role.");
                }
                restoredDetachComment(existing);
                data.previousCommentEncoded = existing.previousCommentEncoded;
            } else {
                if (raw.indexOf(ARTIFACT_METADATA_PREFIX) === 0) {
                    throw new Error("Source metadata cannot be safely replaced.");
                }
                // Encode once, including explicit empty originals; encoding failures propagate.
                data.previousCommentEncoded = encodeURIComponent(raw);
            }
            layer.comment = buildArtifactMetadata(data);
            return;
        }
        try {
            raw = layer.comment || "";
        } catch (err1) {
            raw = "";
        }
        try {
            layer.comment = buildArtifactMetadata(data);
        } catch (err2) {
        }
    }

    function parseMetadata(layer) {
        var raw = layer ? layer.comment : "";
        var data;
        data = parseArtifactMetadata(raw);
        if (data) {
            return data;
        }
        if (!raw || raw.indexOf("\"aetoolbox\"") < 0) {
            return null;
        }
        try {
            data = AEToolbox.parseJson(raw);
        } catch (err) {
            return null;
        }
        return data && data.aetoolbox ? data : null;
    }

    function nextComponentId(comp, prefix) {
        var max = 0;
        var i;
        var m;
        var data;
        for (i = 1; i <= comp.numLayers; i++) {
            data = parseMetadata(comp.layer(i));
            if (data && String(data.componentId).indexOf(prefix + "_") === 0) {
                m = String(data.componentId).match(/_(\d+)$/);
                if (m) {
                    max = Math.max(max, parseInt(m[1], 10));
                }
            }
        }
        max++;
        return prefix + "_" + (max < 10 ? "00" + max : (max < 100 ? "0" + max : String(max)));
    }

    function addSlider(ctrl, name, value) {
        var e = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
        e.name = name;
        e.property(1).setValue(value);
        return e;
    }

    function addCheckbox(ctrl, name, value) {
        var e = ctrl.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
        e.name = name;
        e.property(1).setValue(value ? 1 : 0);
        return e;
    }

    function addColor(ctrl, name, hex) {
        var e = ctrl.property("ADBE Effect Parade").addProperty("ADBE Color Control");
        e.name = name;
        e.property(1).setValue(AEToolbox.hexToColorArray(hex));
        return e;
    }

    function effectValue(ctrl, name, fallback) {
        var effects = ctrl.property("ADBE Effect Parade");
        var i;
        var e;
        if (!effects) {
            return fallback;
        }
        for (i = 1; i <= effects.numProperties; i++) {
            e = effects.property(i);
            if (e && e.name === name) {
                try {
                    return e.property(1).value;
                } catch (err) {
                    return fallback;
                }
            }
        }
        return fallback;
    }

    function createController(comp, name, componentId, componentType, centerX, centerY, p) {
        var ctrl = comp.layers.addNull();
        ctrl.name = name;
        ctrl.comment = metadata(componentId, componentType, "controller", 0);
        ctrl.guideLayer = true;
        positionProp(ctrl).setValue([centerX, centerY]);
        if (componentType === "featureStack") {
            addSlider(ctrl, "Gap", p.gap);
            addSlider(ctrl, "Padding X", p.paddingX);
            addSlider(ctrl, "Padding Y", p.paddingY);
            addSlider(ctrl, "Corner Radius", p.cornerRadius);
            addSlider(ctrl, "Fixed Width", p.fixedWidth);
            addSlider(ctrl, "Text Align", p.textAlign === "left" ? 0 : 1);
            addSlider(ctrl, "Pill Width Mode", p.pillWidthMode === "fixed" ? 1 : 0);
            addCheckbox(ctrl, "Gradient Enable", p.gradientEnable);
            addColor(ctrl, "Fill Color", p.fillColor);
        } else {
            addSlider(ctrl, "Columns", p.columns);
            addSlider(ctrl, "Target Width", p.targetWidth);
            addSlider(ctrl, "Target Height", p.targetHeight);
            addSlider(ctrl, "Cell Width", p.cellWidth);
            addSlider(ctrl, "Cell Height", p.cellHeight);
            addSlider(ctrl, "Gap X", p.gapX);
            addSlider(ctrl, "Gap Y", p.gapY);
            addSlider(ctrl, "Normalize Mode", p.normalizeMode === "none" ? 0 : (p.normalizeMode === "uniformHeight" ? 1 : (p.normalizeMode === "uniformWidth" ? 2 : 3)));
            addSlider(ctrl, "Last Row Align", p.lastRowAlign === "left" ? 0 : (p.lastRowAlign === "right" ? 2 : 1));
            addSlider(ctrl, "Sort", p.gridSortMode === "timeline" ? 0 : (p.gridSortMode === "xPosition" ? 1 : (p.gridSortMode === "yPosition" ? 2 : 3)));
        }
        return ctrl;
    }

    function createRectLayer(comp, name, rectArea, color, roundness) {
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        var vectors;
        var rect;
        var fill;
        var tr;
        layer.name = name;
        group.name = "Pill";
        vectors = group.property("ADBE Vectors Group");
        rect = vectors.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([rectArea.width, rectArea.height]);
        rect.property("ADBE Vector Rect Roundness").setValue(roundness || 0);
        fill = vectors.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color || [0.84, 0.70, 0.37, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
        tr = layer.property("ADBE Transform Group");
        tr.property("ADBE Position").setValue([rectArea.centerX, rectArea.centerY]);
        return layer;
    }

    function createCenteredPillLayer(comp, name, centerX, centerY, width, height, color, roundness) {
        var layer = comp.layers.addShape();
        var root;
        var group;
        var vectors;
        var rect;
        var fill;
        var tr;
        layer.name = name;
        root = layer.property("ADBE Root Vectors Group");
        group = root.addProperty("ADBE Vector Group");
        group.name = "Pill";
        vectors = group.property("ADBE Vectors Group");
        rect = vectors.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Position").setValue([0, 0]);
        rect.property("ADBE Vector Rect Size").setValue([width, height]);
        rect.property("ADBE Vector Rect Roundness").setValue(roundness || 0);
        fill = vectors.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color || [0.84, 0.70, 0.37, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
        tr = layer.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").setValue([0, 0]);
        tr.property("ADBE Position").setValue([centerX, centerY]);
        return layer;
    }

    function createLocalPillLayer(comp, name, width, height, color, roundness) {
        var layer = comp.layers.addShape();
        var root;
        var group;
        var vectors;
        var rect;
        var fill;
        var tr;
        layer.name = name;
        layer.threeDLayer = false;
        root = layer.property("ADBE Root Vectors Group");
        group = root.addProperty("ADBE Vector Group");
        group.name = "Pill";
        vectors = group.property("ADBE Vectors Group");
        rect = vectors.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Position").setValue([0, 0]);
        rect.property("ADBE Vector Rect Size").setValue([width, height]);
        rect.property("ADBE Vector Rect Roundness").setValue(roundness || 0);
        fill = vectors.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color || [0.84, 0.70, 0.37, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
        tr = layer.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").setValue([0, 0]);
        tr.property("ADBE Position").setValue([0, 0]);
        tr.property("ADBE Scale").setValue([100, 100]);
        tr.property("ADBE Rotate Z").setValue(0);
        return layer;
    }

    function setExpressionSafe(prop, expressionText) {
        if (!prop) {
            return;
        }
        try {
            prop.expression = expressionText;
        } catch (err) {
        }
    }

    function buildExpressionSignature(options) {
        return [
            EXPRESSION_BINDING_PREFIX,
            "// tool=adComponentKit",
            "// artifactId=" + String(options.artifactId || ""),
            "// kind=" + String(options.kind || ""),
            "// role=" + String(options.role || ""),
            "// previousExpressionEnabled=" + (options.previousExpressionEnabled ? "true" : "false"),
            "// previousExpressionEncoded=" + encodeText(options.previousExpression || "")
        ].join("\n");
    }

    function signedExpressionBody(expressionText, options) {
        return buildExpressionSignature(options) + "\n" + expressionText;
    }

    function setSignedExpressionSafe(prop, expressionText, options) {
        var previousExpression = "";
        var previousEnabled = false;
        if (!prop) {
            return;
        }
        try {
            previousExpression = prop.expression || "";
        } catch (err1) {
            previousExpression = "";
        }
        try {
            previousEnabled = !!prop.expressionEnabled;
        } catch (err2) {
            previousEnabled = false;
        }
        if (previousExpression && previousExpression.indexOf(EXPRESSION_BINDING_PREFIX) === 0) {
            previousEnabled = signedExpressionValue(previousExpression, "previousExpressionEnabled") === "true";
            previousExpression = decodeText(signedExpressionValue(previousExpression, "previousExpressionEncoded"));
        }
        options = options || {};
        options.previousExpression = previousExpression;
        options.previousExpressionEnabled = previousEnabled;
        setExpressionSafe(prop, signedExpressionBody(expressionText, options));
    }

    function signedExpressionValue(expression, key) {
        var lines = String(expression || "").split("\n");
        var prefix = "// " + key + "=";
        var i;
        for (i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(prefix) === 0) {
                return lines[i].substr(prefix.length);
            }
        }
        return "";
    }

    function isToolOwnedExpression(expression, artifactId) {
        var text = String(expression || "");
        if (text.indexOf(EXPRESSION_BINDING_PREFIX) !== 0) {
            return false;
        }
        if (artifactId && signedExpressionValue(text, "artifactId") !== artifactId) {
            return false;
        }
        return signedExpressionValue(text, "tool") === "adComponentKit";
    }

    function restoreOrClearSignedExpression(prop, artifactId) {
        var expression = "";
        var previousExpression = "";
        var previousEnabled = false;
        if (!prop) {
            return "skipped";
        }
        try {
            expression = prop.expression || "";
        } catch (err1) {
            return "skipped";
        }
        if (!isToolOwnedExpression(expression, artifactId)) {
            return "skipped";
        }
        previousEnabled = signedExpressionValue(expression, "previousExpressionEnabled") === "true";
        previousExpression = decodeText(signedExpressionValue(expression, "previousExpressionEncoded"));
        try {
            if (previousExpression) {
                prop.expression = previousExpression;
                prop.expressionEnabled = previousEnabled;
                return "restored";
            }
            prop.expression = "";
            prop.expressionEnabled = false;
            return "cleared";
        } catch (err2) {
            return "skipped";
        }
    }

    function expressionString(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    }

    function layerRefsExpression(layers) {
        var refs = [];
        var i;
        for (i = 0; i < layers.length; i++) {
            refs[refs.length] = "{i:" + layers[i].index + ",n:\"" + expressionString(layers[i].name) + "\"}";
        }
        return "[" + refs.join(",") + "]";
    }

    // LEGACY/V1: retained byte-for-byte bodies for exact Refresh/Detach recognition.
    function legacyFeatureTextPositionExpression(refs, itemIndex) {
        return [
            "var ctrl = parent;",
            "if (ctrl) {",
            "  var refs = " + refs + ";",
            "  var itemIndex = " + itemIndex + ";",
            "  function layerFromRef(ref) {",
            "    try {",
            "      var byIndex = thisComp.layer(ref.i);",
            "      if (byIndex && byIndex.name == ref.n) { return byIndex; }",
            "    } catch (e1) {}",
            "    try { return thisComp.layer(ref.n); } catch (e2) {}",
            "    return null;",
            "  }",
            "  var gap = ctrl.effect(\"Gap\")(1);",
            "  var px = ctrl.effect(\"Padding X\")(1);",
            "  var py = ctrl.effect(\"Padding Y\")(1);",
            "  var fixedW = ctrl.effect(\"Fixed Width\")(1);",
            "  var mode = Math.round(ctrl.effect(\"Pill Width Mode\")(1));",
            "  var align = Math.round(ctrl.effect(\"Text Align\")(1));",
            "  function rectForLayer(l) {",
            "    if (!l) { return {left:0, top:0, width:0, height:0}; }",
            "    return l.sourceRectAtTime(time, false);",
            "  }",
            "  function scaleForLayer(l, axis) {",
            "    try {",
            "      var s = Math.abs(l.transform.scale[axis]) / 100;",
            "      return s > 0.0001 ? s : 1;",
            "    } catch (e) {",
            "      return 1;",
            "    }",
            "  }",
            "  function pillHeightForLayer(l) {",
            "    var r = rectForLayer(l);",
            "    var sy = scaleForLayer(l, 1);",
            "    return Math.max(0, r.height * sy + py * 2);",
            "  }",
            "  var totalH = 0;",
            "  for (var i = 0; i < refs.length; i++) {",
            "    totalH += pillHeightForLayer(layerFromRef(refs[i]));",
            "    if (i > 0) { totalH += gap; }",
            "  }",
            "  var y = -totalH / 2;",
            "  for (var j = 0; j < itemIndex; j++) {",
            "    y += pillHeightForLayer(layerFromRef(refs[j])) + gap;",
            "  }",
            "  var ownRect = rectForLayer(thisLayer);",
            "  var ownScaleX = scaleForLayer(thisLayer, 0);",
            "  var ownScaleY = scaleForLayer(thisLayer, 1);",
            "  var ownTextW = ownRect.width * ownScaleX;",
            "  var ownH = Math.max(0, ownRect.height * ownScaleY + py * 2);",
            "  var ownW = (mode == 1) ? fixedW : ownTextW + px * 2;",
            "  y += ownH / 2;",
            "  var x = 0;",
            "  if (align == 0) {",
            "    x = -ownW / 2 + px + ownTextW / 2;",
            "  }",
            "  [x, y];",
            "} else {",
            "  value;",
            "}"
        ].join("\n");
    }

    function bindFeatureTextPositionToController(layer, allTextLayers, itemIndex, artifactId) {
        var pos = positionProp(layer);
        var refs = layerRefsExpression(allTextLayers);
        var expressionText;
        if (!pos) {
            return;
        }
        expressionText = featureTextPositionExpression(refs, itemIndex);
        if (artifactId) {
            setSignedExpressionSafe(pos, expressionText, {
                artifactId: artifactId,
                kind: "featureStack",
                role: "sourceLayerBinding"
            });
        } else {
            setExpressionSafe(pos, expressionText);
        }
    }

    function bindFeatureTextPositionsToController(texts, artifactId) {
        var compact = [];
        var i;
        for (i = 0; i < texts.length; i++) {
            if (texts[i]) {
                compact[compact.length] = texts[i];
            }
        }
        for (i = 0; i < compact.length; i++) {
            if (compact[i]) {
                bindFeatureTextPositionToController(compact[i], compact, i, artifactId);
            }
        }
    }

    function legacyFeaturePillExpressions() {
        var positionExpression, sizeExpression, roundExpression, colorExpression;
        positionExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (txt && ctrl && txt.sourceRectAtTime) {",
            "  txt.fromComp(ctrl.toComp([0, txt.position[1]]));",
            "} else {",
            "  value;",
            "}"
        ].join("\n");

        sizeExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }",
            "if (txt && ctrl && txt.sourceRectAtTime) {",
            "  var r = txt.sourceRectAtTime(time, false);",
            "  var px = ctrl.effect(\"Padding X\")(1);",
            "  var py = ctrl.effect(\"Padding Y\")(1);",
            "  var fixedW = ctrl.effect(\"Fixed Width\")(1);",
            "  var mode = Math.round(ctrl.effect(\"Pill Width Mode\")(1));",
            "  function scaleForLayer(l, axis) {",
            "    try {",
            "      var s = Math.abs(l.transform.scale[axis]) / 100;",
            "      return s > 0.0001 ? s : 1;",
            "    } catch (e) {",
            "      return 1;",
            "    }",
            "  }",
            "  var sx = scaleForLayer(txt, 0);",
            "  var sy = scaleForLayer(txt, 1);",
            "  var w = (mode == 1) ? fixedW : r.width * sx + px * 2;",
            "  var h = r.height * sy + py * 2;",
            "  [Math.max(0, w / sx), Math.max(0, h / sy)];",
            "} else {",
            "  value;",
            "}"
        ].join("\n");

        roundExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }",
            "ctrl ? ctrl.effect(\"Corner Radius\")(1) : value;"
        ].join("\n");

        colorExpression = [
            "var txt = thisLayer.parent;",
            "var ctrl = txt ? txt.parent : null;",
            "if (!ctrl && thisLayer.parent) { ctrl = thisLayer.parent; }",
            "ctrl ? ctrl.effect(\"Fill Color\")(1) : value;"
        ].join("\n");

        return [positionExpression, sizeExpression, roundExpression, colorExpression];
    }

    // CURRENT/V2: D0 A1 geometry verbatim; only literal refs, version and parameter guard differ.
    function featureTextPositionExpression(refs, itemIndex) {
        return [
            "// ACK_FEATURE_GEOMETRY_V2",
            "var ctrl=parent;",
            "if (!ctrl || Number(ctrl.effect(\"Pill Width Mode\")(1))!==0 || Number(ctrl.effect(\"Text Align\")(1))!==1) { throw new Error(\"ACK_FEATURE_UNSUPPORTED_PARAMETERS: auto/center required\"); }",
            "  var refs = " + refs + ";",
            "  var itemIndex = " + itemIndex + ";",
            "  function layerFromRef(ref) {",
            "    try {",
            "      var byIndex = thisComp.layer(ref.i);",
            "      if (byIndex && byIndex.name == ref.n) { return byIndex; }",
            "    } catch (e1) {}",
            "    return thisComp.layer(ref.n);",
            "  }",
            "  for (var refIndex=0;refIndex<refs.length;refIndex++) { refs[refIndex]=layerFromRef(refs[refIndex]); }",
            "var gap=ctrl.effect(\"Gap\")(1),py=ctrl.effect(\"Padding Y\")(1);",
            "function geometry(l){",
            " var r=l.sourceRectAtTime(time,false),s=l.transform.scale,a=l.transform.anchorPoint,z=l.transform.rotation*Math.PI/180;",
            " var c=Math.cos(z),n=Math.sin(z),w=r.width*s[0]/100,h=r.height*s[1]/100;",
            " var x=(r.left+r.width/2-a[0])*s[0]/100,y=(r.top+r.height/2-a[1])*s[1]/100;",
            " return {height:Math.abs(w*n)+Math.abs(h*c),offset:[c*x-n*y,n*x+c*y]};",
            "}",
            "var total=gap*(refs.length-1),preceding=0,own;",
            "for(var i=0;i<refs.length;i++){var g=geometry(refs[i]),h=g.height+2*py;total+=h;if(i<itemIndex)preceding+=h+gap;if(i===itemIndex)own=g;}",
            "[-own.offset[0],-total/2+preceding+(own.height+2*py)/2-own.offset[1]];"
        ].join("\n");
    }

    function featurePillExpressions() {
        var legacy = legacyFeaturePillExpressions();
        return [[
            "// ACK_FEATURE_GEOMETRY_V2",
            "var txt=parent;",
            "var ctrl=txt.parent;",
            "if (!ctrl || Number(ctrl.effect(\"Pill Width Mode\")(1))!==0 || Number(ctrl.effect(\"Text Align\")(1))!==1) { throw new Error(\"ACK_FEATURE_UNSUPPORTED_PARAMETERS: auto/center required\"); }",
            "var r=txt.sourceRectAtTime(time,false);",
            "var q=[txt.toComp([r.left,r.top]),txt.toComp([r.left+r.width,r.top]),txt.toComp([r.left+r.width,r.top+r.height]),txt.toComp([r.left,r.top+r.height])];",
            "var left=q[0][0],right=left,top=q[0][1],bottom=top;",
            "for(var i=1;i<4;i++){left=Math.min(left,q[i][0]);right=Math.max(right,q[i][0]);top=Math.min(top,q[i][1]);bottom=Math.max(bottom,q[i][1]);}",
            "var center=[(left+right)/2,(top+bottom)/2];",
            "var p=txt.fromComp(center);",
            "[p[0],p[1]];"
        ].join("\n"), [
            "// ACK_FEATURE_GEOMETRY_V2",
            "var txt=parent;",
            "var ctrl=txt.parent;",
            "if (!ctrl || Number(ctrl.effect(\"Pill Width Mode\")(1))!==0 || Number(ctrl.effect(\"Text Align\")(1))!==1) { throw new Error(\"ACK_FEATURE_UNSUPPORTED_PARAMETERS: auto/center required\"); }",
            "var r=txt.sourceRectAtTime(time,false);",
            "var q=[txt.toComp([r.left,r.top]),txt.toComp([r.left+r.width,r.top]),txt.toComp([r.left+r.width,r.top+r.height]),txt.toComp([r.left,r.top+r.height])];",
            "var left=q[0][0],right=left,top=q[0][1],bottom=top;",
            "for(var i=1;i<4;i++){left=Math.min(left,q[i][0]);right=Math.max(right,q[i][0]);top=Math.min(top,q[i][1]);bottom=Math.max(bottom,q[i][1]);}",
            "var px=ctrl.effect(\"Padding X\")(1),py=ctrl.effect(\"Padding Y\")(1);",
            "left-=px;right+=px;top-=py;bottom+=py;",
            "var p=[thisLayer.fromComp([left,top]),thisLayer.fromComp([right,top]),thisLayer.fromComp([right,bottom]),thisLayer.fromComp([left,bottom])];",
            "var x0=p[0][0],x1=x0,y0=p[0][1],y1=y0;",
            "for(var j=1;j<4;j++){x0=Math.min(x0,p[j][0]);x1=Math.max(x1,p[j][0]);y0=Math.min(y0,p[j][1]);y1=Math.max(y1,p[j][1]);}",
            "[x1-x0,y1-y0];"
        ].join("\n"), legacy[2], legacy[3]];
    }

    function bindFeaturePillToController(layer, artifactId) {
        var root = layer.property("ADBE Root Vectors Group");
        var group = root ? root.property(1) : null;
        var vectors = group ? group.property("ADBE Vectors Group") : null;
        var rect = vectors ? vectors.property("ADBE Vector Shape - Rect") : null;
        var fill = vectors ? vectors.property("ADBE Vector Graphic - Fill") : null;
        var position = positionProp(layer);
        var sizeProp = rect ? rect.property("ADBE Vector Rect Size") : null;
        var roundProp = rect ? rect.property("ADBE Vector Rect Roundness") : null;
        var colorProp = fill ? fill.property("ADBE Vector Fill Color") : null;
        var positionExpression;
        var sizeExpression;
        var roundExpression;
        var colorExpression;

        var templates = featurePillExpressions();
        positionExpression = templates[0];
        sizeExpression = templates[1];
        roundExpression = templates[2];
        colorExpression = templates[3];

        if (artifactId) {
            setSignedExpressionSafe(position, positionExpression, { artifactId: artifactId, kind: "featureStack", role: "generatedLayer" });
            setSignedExpressionSafe(sizeProp, sizeExpression, { artifactId: artifactId, kind: "featureStack", role: "generatedLayer" });
            setSignedExpressionSafe(roundProp, roundExpression, { artifactId: artifactId, kind: "featureStack", role: "generatedLayer" });
            setSignedExpressionSafe(colorProp, colorExpression, { artifactId: artifactId, kind: "featureStack", role: "generatedLayer" });
        } else {
            setExpressionSafe(position, positionExpression);
            setExpressionSafe(sizeProp, sizeExpression);
            setExpressionSafe(roundProp, roundExpression);
            setExpressionSafe(colorProp, colorExpression);
        }
    }

    function debugNumber(n) {
        return String(Math.round(n * 100) / 100);
    }

    function featureDebugJson(originalCenterX, originalCenterY, itemCount, items, warning) {
        var parts = [];
        var i;
        var item;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            parts[parts.length] = "{\"textName\":\"" + AEToolbox.jsonEscape(item.textName) + "\"," +
                "\"targetCenter\":[" + debugNumber(item.targetX) + "," + debugNumber(item.targetY) + "]," +
                "\"textCenterAfter\":[" + debugNumber(item.textCenterX) + "," + debugNumber(item.textCenterY) + "]," +
                "\"pillCenterAfter\":[" + debugNumber(item.pillCenterX) + "," + debugNumber(item.pillCenterY) + "]," +
                "\"centerDelta\":[" + debugNumber(item.deltaX) + "," + debugNumber(item.deltaY) + "]}";
        }
        return "\"originalCenter\":[" + debugNumber(originalCenterX) + "," + debugNumber(originalCenterY) + "]," +
            "\"itemCount\":" + itemCount + "," +
            "\"items\":[" + parts.join(",") + "]," +
            "\"warning\":\"" + AEToolbox.jsonEscape(warning || "") + "\"";
    }

    function featureLocalDebugJson(originalCenterX, originalCenterY, ctrlX, ctrlY, ctrlAnchorX, ctrlAnchorY, items, warning) {
        var parts = [];
        var i;
        var item;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            parts[parts.length] = "{\"textName\":\"" + AEToolbox.jsonEscape(item.textName) + "\"," +
                "\"localPosition\":[0," + debugNumber(item.localY) + "]," +
                "\"pillSize\":[" + debugNumber(item.pillWidth) + "," + debugNumber(item.pillHeight) + "]}";
        }
        return "\"originalCenter\":[" + debugNumber(originalCenterX) + "," + debugNumber(originalCenterY) + "]," +
            "\"controllerPosition\":[" + debugNumber(ctrlX) + "," + debugNumber(ctrlY) + "]," +
            "\"controllerAnchor\":[" + debugNumber(ctrlAnchorX) + "," + debugNumber(ctrlAnchorY) + "]," +
            "\"itemCount\":" + items.length + "," +
            "\"items\":[" + parts.join(",") + "]," +
            "\"warning\":\"" + AEToolbox.jsonEscape(warning || "") + "\"";
    }

    function updateRectLayer(layer, rectArea, color, roundness) {
        var root = layer.property("ADBE Root Vectors Group");
        var group = root ? root.property(1) : null;
        var vectors = group ? group.property("ADBE Vectors Group") : null;
        var rect = vectors ? vectors.property("ADBE Vector Shape - Rect") : null;
        var fill = vectors ? vectors.property("ADBE Vector Graphic - Fill") : null;
        if (rect) {
            rect.property("ADBE Vector Rect Size").setValue([rectArea.width, rectArea.height]);
            rect.property("ADBE Vector Rect Roundness").setValue(roundness || 0);
        }
        if (fill && color) {
            fill.property("ADBE Vector Fill Color").setValue(color);
        }
        moveLayerBoundsCenterTo(layer, rectArea.centerX, rectArea.centerY);
    }

    function componentLayers(comp, componentId) {
        var layers = [];
        var i;
        var data;
        for (i = 1; i <= comp.numLayers; i++) {
            data = parseMetadata(comp.layer(i));
            if (data && data.componentId === componentId) {
                layers[layers.length] = { layer: comp.layer(i), data: data };
            }
        }
        return layers;
    }

    function findArtifactIdFromSelectedLayers(comp) {
        var selected = comp && comp.selectedLayers ? comp.selectedLayers : [];
        var i;
        var data;
        for (i = 0; i < selected.length; i++) {
            data = parseArtifactMetadata(selected[i].comment);
            if (data && data.tool === "adComponentKit" && data.artifactId) {
                return {
                    artifactId: data.artifactId,
                    kind: data.kind || data.componentType || "",
                    data: data
                };
            }
        }
        return null;
    }

    function findLayersByArtifactId(comp, artifactId) {
        var layers = [];
        var i;
        var data;
        for (i = 1; i <= comp.numLayers; i++) {
            data = parseArtifactMetadata(comp.layer(i).comment);
            if (data && data.artifactId === artifactId && data.tool === "adComponentKit") {
                layers[layers.length] = {
                    layer: comp.layer(i),
                    data: data
                };
            }
        }
        return layers;
    }

    function scanSignedExpressionsInGroup(group, artifactId, result) {
        var i;
        var child;
        var action;
        if (!group) {
            return;
        }
        try {
            action = restoreOrClearSignedExpression(group, artifactId);
            if (action === "restored") {
                result.restoredExpressions++;
            } else if (action === "cleared") {
                result.clearedExpressions++;
            }
        } catch (propErr) {
            result.skippedItems++;
        }
        try {
            if (!group.numProperties) {
                return;
            }
            for (i = 1; i <= group.numProperties; i++) {
                try {
                    child = group.property(i);
                    scanSignedExpressionsInGroup(child, artifactId, result);
                } catch (childErr) {
                    result.skippedItems++;
                }
            }
        } catch (err) {
        }
    }

    function restoreOrClearArtifactExpressions(comp, artifactId, result) {
        var i;
        for (i = 1; i <= comp.numLayers; i++) {
            try {
                scanSignedExpressionsInGroup(comp.layer(i), artifactId, result);
            } catch (err) {
                result.skippedItems++;
            }
        }
    }

    function restoreSourceLayerBinding(item, result) {
        var previousComment;
        try {
            item.layer.parent = null;
        } catch (err1) {
        }
        previousComment = decodeText(item.data.previousCommentEncoded || "");
        try {
            item.layer.comment = previousComment;
        } catch (err2) {
            result.skippedItems++;
        }
    }

    function shouldDeleteArtifactLayer(role) {
        return role === "controller" || role === "generatedLayer" || role === "helperLayer" || role === "item" || role === "itemBg" || role === "icon";
    }

    function removeArtifactById(comp, artifactId) {
        var layers = findLayersByArtifactId(comp, artifactId);
        var result = {
            removedLayers: 0,
            restoredExpressions: 0,
            clearedExpressions: 0,
            skippedItems: 0,
            artifactId: artifactId,
            kind: "",
            layerCount: layers.length
        };
        var deleteItems = [];
        var i;
        var item;

        for (i = 0; i < layers.length; i++) {
            item = layers[i];
            if (!result.kind) {
                result.kind = item.data.kind || item.data.componentType || "";
            }
            if (item.data.role === "sourceLayerBinding") {
                restoreSourceLayerBinding(item, result);
            } else if (shouldDeleteArtifactLayer(item.data.role)) {
                deleteItems[deleteItems.length] = item.layer;
            }
        }

        restoreOrClearArtifactExpressions(comp, artifactId, result);

        deleteItems.sort(function (a, b) {
            return b.index - a.index;
        });
        for (i = 0; i < deleteItems.length; i++) {
            try {
                deleteItems[i].remove();
                result.removedLayers++;
            } catch (err) {
                result.skippedItems++;
            }
        }
        return result;
    }

    function removeArtifactBySelectedLayer() {
        var comp = getComp();
        var selectedInfo;
        var result;
        if (!comp) {
            return jsonResult(false, "Open a composition before removing a generated component.");
        }
        selectedInfo = findArtifactIdFromSelectedLayers(comp);
        if (!selectedInfo || !selectedInfo.artifactId) {
            return jsonResult(false, "Select a new Ad Component Kit generated layer or controller with Lomond metadata.");
        }
        app.beginUndoGroup("AE Toolbox Remove Generated Component");
        try {
            result = removeArtifactById(comp, selectedInfo.artifactId);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Remove generated component failed: " + err.toString());
        }
        app.endUndoGroup();
        if (!result.removedLayers && !result.restoredExpressions && !result.clearedExpressions) {
            return jsonResult(false, "No removable generated component content found for selected artifact.", "\"artifactId\":\"" + AEToolbox.jsonEscape(selectedInfo.artifactId) + "\"");
        }
        return jsonResult(true, "Removed generated component. Layers: " + result.removedLayers + ", restored expressions: " + result.restoredExpressions + ", cleared expressions: " + result.clearedExpressions + ".", "\"artifactId\":\"" + AEToolbox.jsonEscape(result.artifactId) + "\",\"kind\":\"" + AEToolbox.jsonEscape(result.kind || selectedInfo.kind || "") + "\",\"removedLayers\":" + result.removedLayers + ",\"restoredExpressions\":" + result.restoredExpressions + ",\"clearedExpressions\":" + result.clearedExpressions + ",\"skippedItems\":" + result.skippedItems);
    }

    function unionBoundsForLayers(layers, comp, measurements) {
        var i;
        var b;
        var left = 999999;
        var top = 999999;
        var right = -999999;
        var bottom = -999999;
        for (i = 0; i < layers.length; i++) {
            if (!layers[i]) {
                throw measurementError("SOURCE_UNAVAILABLE");
            }
            b = measurements ? measurements[i].measurement.bounds : getLayerVisualBoundsInComp(layers[i], comp.time);
            if (i === 0) { left = b.left; top = b.top; right = b.right; bottom = b.bottom; }
            left = Math.min(left, b.left);
            top = Math.min(top, b.top);
            right = Math.max(right, b.right);
            bottom = Math.max(bottom, b.bottom);
        }
        if (!layers.length) { throw measurementError("NO_SOURCE_LAYERS"); }
        return checkedMeasurementBounds(left, top, right, bottom);
    }

    function measuredFeatureTexts(texts, sortMode, time) {
        var entries = [];
        var i;
        for (i = 0; i < texts.length; i++) {
            entries[i] = { layer: texts[i], measurement: measureLayerVisualBoundsInComp(texts[i], time) };
        }
        entries.sort(function (a, b) {
            if (sortMode === "timeline") {
                return b.layer.index - a.layer.index;
            }
            return a.measurement.bounds.centerY - b.measurement.bounds.centerY;
        });
        return entries;
    }

    function selectedTextLayers(comp) {
        var out = [];
        var selected = comp.selectedLayers || [];
        var i;
        for (i = 0; i < selected.length; i++) {
            if (isTextLayer(selected[i])) {
                out[out.length] = selected[i];
            }
        }
        return out;
    }

    function selectedLayers(comp) {
        var selected = comp.selectedLayers || [];
        var out = [];
        var i;
        for (i = 0; i < selected.length; i++) {
            out[out.length] = selected[i];
        }
        return out;
    }

    // Feature V2 only; not a Grid gate or a general transform adapter.
    // Fixed before probing: degrees/identity 1e-8, scale ratio 1e-8, comp basis 1e-4 AE unit.
    var FEATURE_TRANSFORM_EPSILON = 1e-8;
    var FEATURE_BASIS_EPSILON = 1e-4;

    function featureReject(reason) { throw measurementError("FEATURE_UNSUPPORTED_" + reason); }

    function featureVector(value, neutralZ) {
        if (!value || (value.length !== 2 && value.length !== 3) ||
                !measurementNumber(value[0]) || !measurementNumber(value[1]) ||
                (value.length === 3 && value[2] !== neutralZ)) { featureReject("2D_VALUE"); }
        return [value[0], value[1]];
    }

    function featureStatic(prop, positionBinding) {
        if (!prop || prop.numKeys !== 0 || prop.dimensionsSeparated || prop.expressionError ||
                (!positionBinding && (prop.expression || prop.expressionEnabled))) { featureReject("STATIC_TRANSFORM"); }
        return prop.value;
    }

    function featureTransform(layer, positionBinding) {
        var tr, kind;
        if (!layer || layer.threeDLayer !== false || layer.locked) { featureReject("LAYER_SPACE"); }
        kind = layer.matchName;
        if (kind !== "ADBE Text Layer" && kind !== "ADBE Vector Layer" && kind !== "ADBE AV Layer") { featureReject("LAYER_TYPE"); }
        if (kind === "ADBE AV Layer" && (layer.collapseTransformation || layer.continuouslyRasterize)) { featureReject("PARENT_SPACE"); }
        tr = layer.property("ADBE Transform Group");
        if (!tr) { featureReject("TRANSFORM_UNAVAILABLE"); }
        return {
            anchor: featureVector(featureStatic(tr.property("ADBE Anchor Point"), false), 0),
            position: featureVector(featureStatic(tr.property("ADBE Position"), positionBinding), 0),
            scale: featureVector(featureStatic(tr.property("ADBE Scale"), false), 100),
            rotation: featureStatic(tr.property("ADBE Rotate Z"), false)
        };
    }

    function featureTranslation(layer) {
        var t = featureTransform(layer, false);
        if (!measurementNumber(t.rotation) || Math.abs(t.rotation) > FEATURE_TRANSFORM_EPSILON ||
                Math.abs(t.scale[0] - 100) > FEATURE_TRANSFORM_EPSILON ||
                Math.abs(t.scale[1] - 100) > FEATURE_TRANSFORM_EPSILON) { featureReject("TRANSLATION_PARENT"); }
        return t;
    }

    function featureControllerOffset(ctrl) {
        var t = featureTranslation(ctrl), p, result;
        result = [t.position[0] - t.anchor[0], t.position[1] - t.anchor[1]];
        if (ctrl.parent) {
            if (ctrl.parent === ctrl || ctrl.parent.parent) { featureReject("PARENT_CHAIN"); }
            p = featureTranslation(ctrl.parent);
            result = [result[0] + p.position[0] - p.anchor[0], result[1] + p.position[1] - p.anchor[1]];
        }
        return result;
    }

    function featureSourceEnvelope(layer, ctrl) {
        var t = featureTransform(layer, !!ctrl), parent;
        if (!isTextLayer(layer) || !measurementNumber(t.rotation) || t.scale[0] <= 0 || t.scale[1] <= 0) { featureReject("TEXT_TRANSFORM"); }
        if (Math.abs(t.rotation) > FEATURE_TRANSFORM_EPSILON &&
                Math.abs(t.scale[0] / t.scale[1] - 1) > FEATURE_TRANSFORM_EPSILON) { featureReject("NONUNIFORM_ROTATION"); }
        if (ctrl) {
            if (layer.parent !== ctrl) { featureReject("SOURCE_PARENT"); }
        } else if (layer.parent) {
            parent = layer.parent;
            if (parent === layer || parent.parent) { featureReject("PARENT_CHAIN"); }
            featureTranslation(parent);
        }
    }

    function featureParameterEnvelope(p, ctrl) {
        var names, i, effect, value;
        if (ctrl) {
            names = ["Pill Width Mode", "Text Align", "Gap", "Padding X", "Padding Y", "Fixed Width", "Corner Radius"];
            for (i = 0; i < names.length; i++) {
                effect = ctrl.property("ADBE Effect Parade").property(names[i]);
                value = featureStatic(effect && effect.property(1), false);
                if (!measurementNumber(value) || value < 0 || (i === 0 && value !== 0) || (i === 1 && value !== 1)) { featureReject("PARAMETERS"); }
            }
        }
        if (p.pillWidthMode !== "auto" || p.textAlign !== "center" ||
                !measurementNumber(p.gap) || p.gap < 0 || !measurementNumber(p.paddingX) || p.paddingX < 0 ||
                !measurementNumber(p.paddingY) || p.paddingY < 0 || !measurementNumber(p.cornerRadius) || p.cornerRadius < 0) {
            featureReject("PARAMETERS_AUTO_CENTER_REQUIRED");
        }
    }

    function featureBackgroundEnvelope(bg, source, comp) {
        var t = featureTransform(bg, true), root, group, vectors, gt, rect, fill, i, v;
        var measurementTime = comp.time;
        var names = ["ADBE Vector Anchor", "ADBE Vector Position", "ADBE Vector Scale", "ADBE Vector Skew", "ADBE Vector Skew Axis", "ADBE Vector Rotation", "ADBE Vector Group Opacity"];
        var expected = [[0, 0], [0, 0], [100, 100], 0, 0, 0, 100];
        var origin, x, y;
        if (bg.matchName !== "ADBE Vector Layer" || bg.parent !== source || t.anchor[0] !== 0 || t.anchor[1] !== 0 || !measurementNumber(t.rotation)) { featureReject("BACKGROUND_TRANSFORM"); }
        root = bg.property("ADBE Root Vectors Group"); group = root && root.property(1);
        vectors = group && group.property("ADBE Vectors Group"); gt = group && group.property("ADBE Vector Transform Group");
        rect = vectors && vectors.property("ADBE Vector Shape - Rect"); fill = vectors && vectors.property("ADBE Vector Graphic - Fill");
        if (!root || root.numProperties !== 1 || !group || group.matchName !== "ADBE Vector Group" || group.name !== "Pill" ||
                !vectors || vectors.numProperties !== 2 || !gt || !rect || rect.matchName !== "ADBE Vector Shape - Rect" ||
                !fill || fill.matchName !== "ADBE Vector Graphic - Fill") { featureReject("CANONICAL_PILL"); }
        for (i = 0; i < names.length; i++) {
            v = featureStatic(gt.property(names[i]), false);
            if (i < 3) {
                v = featureVector(v, i === 2 ? 100 : 0);
                if (v[0] !== expected[i][0] || v[1] !== expected[i][1]) { featureReject("GROUP_IDENTITY"); }
            } else if (v !== expected[i]) { featureReject("GROUP_IDENTITY"); }
        }
        v = featureVector(featureStatic(rect.property("ADBE Vector Rect Position"), false), 0);
        if (v[0] !== 0 || v[1] !== 0 || featureStatic(fill.property("ADBE Vector Fill Opacity"), false) !== 100) { featureReject("CANONICAL_PILL"); }
        // Host evidence, at the same requested/current time as measurement. No inverse Host API.
        origin = convertMeasurementSourcePointToComp(bg, [0, 0], measurementTime);
        x = convertMeasurementSourcePointToComp(bg, [1, 0], measurementTime);
        y = convertMeasurementSourcePointToComp(bg, [0, 1], measurementTime);
        if (Math.abs(x[0] - origin[0] - 1) > FEATURE_BASIS_EPSILON || Math.abs(x[1] - origin[1]) > FEATURE_BASIS_EPSILON ||
                Math.abs(y[0] - origin[0]) > FEATURE_BASIS_EPSILON || Math.abs(y[1] - origin[1] - 1) > FEATURE_BASIS_EPSILON) {
            featureReject("BACKGROUND_COMP_BASIS");
        }
    }

    function featureRefreshSourceTemplates(layer, texts, itemIndex) {
        var expression = positionProp(layer).expression;
        var match = typeof expression === "string" ? /\n  var refs = (\[[^\r\n]*\]);\n  var itemIndex = ([0-9]+);\n/.exec(expression) : null;
        var cursor, token, n = 0, j, count, name, refs = [];
        if (!match || Number(match[2]) !== itemIndex) { featureReject("SOURCE_REFERENCE_TEMPLATE"); }
        cursor = match[1].substring(1, match[1].length - 1);
        while (cursor.length) {
            token = /^\{i:([0-9]+),n:("(?:[^"\\]|\\.)*")}([,]?)/.exec(cursor);
            if (!token || Number(token[1]) < 1 || n >= texts.length) { featureReject("SOURCE_REFERENCES"); }
            name = AEToolbox.parseJson(token[2]);
            refs[refs.length] = { index: Number(token[1]), name: name };
            if (texts[n].name !== name) { featureReject("SOURCE_REFERENCES"); }
            count = 0;
            for (j = 1; j <= layer.containingComp.numLayers; j++) { if (layer.containingComp.layer(j).name === name) { count++; } }
            if (count !== 1) { featureReject("AMBIGUOUS_SOURCE_NAME"); }
            n++;
            cursor = cursor.substring(token[0].length);
            if (cursor.length && token[3] !== ",") { featureReject("SOURCE_REFERENCES"); }
        }
        if (n !== texts.length || layerRefsExpression(refs) !== match[1]) { featureReject("SOURCE_REFERENCES"); }
        // Stored indices can age as unrelated layers are inserted; names and membership
        // are verified above, then the entire original literal body is matched exactly.
        return [featureTextPositionExpression(match[1], itemIndex), legacyFeatureTextPositionExpression(match[1], itemIndex)];
    }

    function featureCreateSourcesEnvelope(texts, comp) {
        var i, j, layer, prop, data, ctrl, ctrlData, checked = [], found, count;
        for (i = 0; i < texts.length; i++) {
            layer = texts[i]; prop = positionProp(layer);
            count = 0;
            for (j = 1; j <= comp.numLayers; j++) { if (comp.layer(j).name === layer.name) { count++; } }
            if (count !== 1 || /[\r\n\u2028\u2029]/.test(layer.name)) { featureReject("AMBIGUOUS_SOURCE_NAME"); }
            if (prop && (prop.expression || prop.expressionEnabled)) {
                // Retain the existing exact tool rebind path. A signature prefix alone
                // cannot admit a Position driver: its entire owning Feature must pass.
                data = parseMetadata(layer); ctrl = layer.parent; ctrlData = ctrl && parseMetadata(ctrl);
                if (!data || data.role !== "sourceLayerBinding" || !ctrlData || ctrlData.role !== "controller" ||
                        data.componentType !== "featureStack" || ctrlData.componentType !== "featureStack" ||
                        data.artifactId !== ctrlData.artifactId || data.componentId !== ctrlData.componentId) { featureReject("SOURCE_POSITION_EXPRESSION"); }
                found = false;
                for (j = 0; j < checked.length; j++) { if (checked[j] === ctrl) { found = true; } }
                if (!found) { planFeatureRefresh(comp, ctrl, ctrlData); checked[checked.length] = ctrl; }
                featureSourceEnvelope(layer, ctrl);
            } else { featureSourceEnvelope(layer, null); }
        }
    }

    AEToolbox.tools.adComponentKit.createFeatureStack = function (paramsJson) {
        var comp = getComp();
        var p = paramsFromJson(paramsJson);
        var selected;
        var texts = [];
        var skipped = 0;
        var componentId;
        var artifactId;
        var createdAt;
        var selectionBounds;
        var originalInfo;
        var i;
        var ctrl;
        var bg;
        var textBounds = [];
        var measuredTexts;
        var pillWidths = [];
        var pillHeights = [];
        var totalHeight = 0;
        var currentY;
        var itemY;
        var ctrlTr;
        var ctrlPositionValue;
        var ctrlAnchorValue;
        var farthestPosition = 0;
        var debugItems = [];
        var parentPairs = [];
        var warning = "";
        if (!comp) {
            return jsonResult(false, "Open a composition before creating a feature stack.");
        }
        selected = comp.selectedLayers || [];
        for (i = 0; i < selected.length; i++) {
            if (isTextLayer(selected[i])) {
                if (selected[i].threeDLayer) {
                    return jsonResult(false, "Create feature stack preflight failed; no changes made: ACK_MEASUREMENT_FEATURE_UNSUPPORTED_LAYER_SPACE");
                } else {
                    texts[texts.length] = selected[i];
                }
            }
        }
        if (!texts.length) {
            return jsonResult(false, "Select one or more text layers first.");
        }
        try {
            measuredTexts = measuredFeatureTexts(texts, p.sortMode, comp.time);
            featureParameterEnvelope(p, null);
            featureCreateSourcesEnvelope(texts, comp);
            for (i = 0; i < measuredTexts.length; i++) { texts[i] = measuredTexts[i].layer; }
            originalInfo = unionOriginalFeatureTextBounds(texts, comp, measuredTexts);
            selectionBounds = originalInfo.bounds;
            warning = originalInfo.warning;
            for (i = 0; i < texts.length; i++) {
                farthestPosition = Math.max(farthestPosition, layerPositionDistanceFromOrigin(texts[i]));
            }
            if (Math.abs(selectionBounds.centerX) < 0.001 && Math.abs(selectionBounds.centerY) < 0.001 && farthestPosition > 50) {
                warning = warning ? warning + " Original center calculation failed." : "Original center calculation failed.";
            }
            for (i = 0; i < texts.length; i++) {
                textBounds[i] = measuredTexts[i].measurement.bounds;
                pillWidths[i] = p.pillWidthMode === "fixed" ? p.fixedWidth : textBounds[i].width + p.paddingX * 2;
                pillHeights[i] = textBounds[i].height + p.paddingY * 2;
                if (!measurementNumber(pillWidths[i]) || !measurementNumber(pillHeights[i]) || pillWidths[i] <= 0 || pillHeights[i] <= 0) {
                    throw measurementError("INVALID_FEATURE_GEOMETRY");
                }
                totalHeight += pillHeights[i];
                if (i > 0) {
                    totalHeight += p.gap;
                }
            }
            if (!measurementNumber(totalHeight) || totalHeight <= 0) { throw measurementError("INVALID_FEATURE_GEOMETRY"); }
        } catch (measurementFailure) {
            return jsonResult(false, "Create feature stack preflight failed; no changes made: " + String(measurementFailure));
        }
        componentId = nextComponentId(comp, "featureStack");
        artifactId = createArtifactId("featureStack");
        createdAt = createdAtString();
        app.beginUndoGroup("AE Toolbox Create Feature Stack");
        try {
            ctrl = createController(comp, "FEATURE_STACK_CTRL", componentId, "featureStack", 0, 0, p);
            setLayerArtifactMetadata(ctrl, {
                kind: "featureStack",
                componentType: "featureStack",
                artifactId: artifactId,
                componentId: componentId,
                role: "controller",
                index: 0,
                createdAt: createdAt
            });
            ctrl.parent = null;
            ctrl.threeDLayer = false;
            ctrlTr = ctrl.property("ADBE Transform Group");
            ctrlTr.property("ADBE Anchor Point").setValue([0, 0]);
            ctrlTr.property("ADBE Position").setValue([selectionBounds.centerX, selectionBounds.centerY]);
            ctrlTr.property("ADBE Scale").setValue([100, 100]);
            ctrlTr.property("ADBE Rotate Z").setValue(0);

            currentY = -totalHeight / 2;
            for (i = 0; i < texts.length; i++) {
                itemY = currentY + pillHeights[i] / 2;
                setLayerArtifactMetadata(texts[i], {
                    kind: "featureStack",
                    componentType: "featureStack",
                    artifactId: artifactId,
                    componentId: componentId,
                    role: "sourceLayerBinding",
                    index: i + 1,
                    createdAt: createdAt
                });
                centerTextAnchor(texts[i], comp.time, measuredTexts[i].measurement.rect);

                bg = createLocalPillLayer(comp, texts[i].name + "_PILL_BG", pillWidths[i], pillHeights[i], AEToolbox.hexToColorArray(p.fillColor), p.cornerRadius);
                setLayerArtifactMetadata(bg, {
                    kind: "featureStack",
                    componentType: "featureStack",
                    artifactId: artifactId,
                    componentId: componentId,
                    role: "generatedLayer",
                    index: i + 1,
                    createdAt: createdAt
                });
                bg.moveAfter(texts[i]);

                texts[i].parent = ctrl;
                bg.parent = ctrl;
                setLayerLocalPosition(texts[i], 0, itemY);
                setLayerLocalPosition(bg, 0, itemY);
                parentPairs[parentPairs.length] = {
                    text: texts[i],
                    bg: bg
                };

                debugItems[debugItems.length] = {
                    textName: texts[i].name,
                    localY: itemY,
                    pillWidth: pillWidths[i],
                    pillHeight: pillHeights[i]
                };
                currentY += pillHeights[i] + p.gap;
            }
            parentBackgroundsToTextLayers(parentPairs, artifactId);
            bindFeatureTextPositionsToController(texts, artifactId);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Create feature stack failed: " + err.toString());
        }
        app.endUndoGroup();
        if (skipped > 0) {
            warning = warning ? warning + " Skipped " + skipped + " 3D text layer(s)." : "Skipped " + skipped + " 3D text layer(s).";
        }
        ctrlPositionValue = positionProp(ctrl).value;
        ctrlAnchorValue = ctrl.property("ADBE Transform Group").property("ADBE Anchor Point").value;
        if (Math.abs(ctrlPositionValue[0] - selectionBounds.centerX) > 0.5 || Math.abs(ctrlPositionValue[1] - selectionBounds.centerY) > 0.5) {
            warning = warning ? warning + " Controller position does not match original center." : "Controller position does not match original center.";
        }
        return jsonResult(true, "Feature Stack created with " + texts.length + " item(s).", "\"componentId\":\"" + AEToolbox.jsonEscape(componentId) + "\",\"artifactId\":\"" + AEToolbox.jsonEscape(artifactId) + "\"," + featureLocalDebugJson(selectionBounds.centerX, selectionBounds.centerY, ctrlPositionValue[0], ctrlPositionValue[1], ctrlAnchorValue[0], ctrlAnchorValue[1], debugItems, warning));
    };

    function readFeatureParams(ctrl) {
        var align = Math.round(num(effectValue(ctrl, "Text Align", 1), 1));
        var mode = Math.round(num(effectValue(ctrl, "Pill Width Mode", 0), 0));
        var color = effectValue(ctrl, "Fill Color", [0.84, 0.70, 0.37, 1]);
        return {
            gap: num(effectValue(ctrl, "Gap", 14), 14),
            paddingX: num(effectValue(ctrl, "Padding X", 24), 24),
            paddingY: num(effectValue(ctrl, "Padding Y", 12), 12),
            cornerRadius: num(effectValue(ctrl, "Corner Radius", 28), 28),
            fixedWidth: num(effectValue(ctrl, "Fixed Width", 320), 320),
            textAlign: align === 0 ? "left" : "center",
            pillWidthMode: mode === 1 ? "fixed" : "auto",
            fillColor: AEToolbox.colorArrayToHex(color),
            gradientEnable: effectValue(ctrl, "Gradient Enable", 0) === 1
        };
    }

    function planFeatureRefresh(comp, ctrl, data) {
        var layers = componentLayers(comp, data.componentId);
        var texts = [];
        var bgs = [];
        var stackLayers = [];
        var stackBounds;
        var parentPairs = [];
        var i;
        var item;
        var p = readFeatureParams(ctrl);
        var measurements = [];
        var textMeasurements = [];
        var bgMeasurements = [];
        var steps = [];
        var templates = featurePillExpressions();
        var legacyTemplates = legacyFeaturePillExpressions();
        var allowedSource, allowedBackground, version = null, currentVersion;
        var compactTexts = [];
        var totalHeight = 0;
        var y;
        var width;
        var height;
        var offset;
        var tr;
        var anchor;
        var position;
        var newAnchor;
        var nextPosition;
        var root;
        var group;
        var vectors;
        var rect;
        var fill;
        var equalRectCenter;
        var artifactId = data.artifactId || data.componentId;

        function vector(value) {
            if (!value || (value.length !== 2 && (value.length !== 3 || value[2] !== 0)) || !measurementNumber(value[0]) || !measurementNumber(value[1])) {
                throw measurementError("REFRESH_INVALID_2D_VALUE");
            }
            return [value[0], value[1]];
        }
        function writable(prop) {
            if (!prop || typeof prop.setValue !== "function" || prop.numKeys !== 0) {
                throw measurementError("REFRESH_PROPERTY_NOT_STATIC_WRITABLE");
            }
            return prop;
        }
        function requireTemplate(prop, allowed) {
            var n, expression, expected;
            writable(prop);
            if (prop.canSetExpression !== true || prop.expressionEnabled !== true || prop.expressionError) { featureReject("EXACT_TEMPLATE"); }
            expression = prop.expression;
            for (n = 0; n < allowed.length; n++) {
                expected = signedExpressionBody(allowed[n].body, { artifactId: artifactId, kind: "featureStack", role: allowed[n].role,
                    previousExpression: decodeText(signedExpressionValue(expression, "previousExpressionEncoded")),
                    previousExpressionEnabled: signedExpressionValue(expression, "previousExpressionEnabled") === "true" });
                if (prop.matchName === allowed[n].name && expression === expected) { return n; }
            }
            featureReject("EXACT_TEMPLATE");
        }
        function knownExpressions(container, allowed, depth) {
            var n;
            if (!container || depth > 64) { throw measurementError("REFRESH_PROPERTY_TREE_UNAVAILABLE"); }
            if (container.expression || container.expressionEnabled) { requireTemplate(container, allowed); }
            for (n = 1; n <= (container.numProperties || 0); n++) { knownExpressions(container.property(n), allowed, depth + 1); }
        }
        function layerSpace(layer) {
            var kind = layer.matchName;
            if (layer.threeDLayer !== false || layer.locked ||
                    (kind !== "ADBE Text Layer" && kind !== "ADBE Vector Layer" && kind !== "ADBE AV Layer")) {
                throw measurementError("REFRESH_UNSUPPORTED_LAYER_SPACE");
            }
            if (kind === "ADBE AV Layer" && (layer.collapseTransformation || layer.continuouslyRasterize)) {
                throw measurementError("REFRESH_UNSUPPORTED_LAYER_SPACE");
            }
        }
        for (i = 0; i < layers.length; i++) {
            item = layers[i];
            if (item.data.role === "itemText" || item.data.role === "sourceLayerBinding") {
                texts[item.data.index - 1] = item.layer;
            } else if (item.data.role === "itemBg" || item.data.role === "generatedLayer") {
                bgs[item.data.index - 1] = item.layer;
            }
        }
        for (i = 0; i < texts.length; i++) {
            if (texts[i]) {
                textMeasurements[i] = measureLayerVisualBoundsInComp(texts[i], comp.time);
                measurements[measurements.length] = { measurement: textMeasurements[i] };
                stackLayers[stackLayers.length] = texts[i];
                compactTexts[compactTexts.length] = texts[i];
            }
            if (bgs[i]) {
                bgMeasurements[i] = measureLayerVisualBoundsInComp(bgs[i], comp.time);
                measurements[measurements.length] = { measurement: bgMeasurements[i] };
                stackLayers[stackLayers.length] = bgs[i];
            }
        }
        if (!texts.length) { throw measurementError("NO_SOURCE_LAYERS"); }
        stackBounds = unionBoundsForLayers(stackLayers, comp, measurements);
        featureParameterEnvelope(p, ctrl);
        offset = featureControllerOffset(ctrl);
        if (layers.length !== texts.length * 2 + 1 || bgs.length !== texts.length) { featureReject("COMPONENT_MEMBERS"); }
        for (i = 0; i < texts.length; i++) {
            if (!texts[i] || !bgs[i]) { throw measurementError("REFRESH_INCOMPLETE_COMPONENT"); }
            layerSpace(texts[i]); layerSpace(bgs[i]);
            featureSourceEnvelope(texts[i], ctrl);
            currentVersion = featureRefreshSourceTemplates(texts[i], compactTexts, i);
            allowedSource = [{ name: "ADBE Position", body: currentVersion[0], role: "sourceLayerBinding" },
                { name: "ADBE Position", body: currentVersion[1], role: "sourceLayerBinding" }];
            currentVersion = requireTemplate(positionProp(texts[i]), allowedSource);
            if (version !== null && version !== currentVersion) { featureReject("MIXED_TEMPLATE_VERSION"); }
            version = currentVersion;
            allowedBackground = [{ name: "ADBE Position", body: templates[0], role: "generatedLayer" },
                { name: "ADBE Position", body: legacyTemplates[0], role: "generatedLayer" },
                { name: "ADBE Vector Rect Size", body: templates[1], role: "generatedLayer" },
                { name: "ADBE Vector Rect Size", body: legacyTemplates[1], role: "generatedLayer" },
                { name: "ADBE Vector Rect Roundness", body: templates[2], role: "generatedLayer" },
                { name: "ADBE Vector Fill Color", body: templates[3], role: "generatedLayer" }];
            knownExpressions(texts[i], allowedSource, 0);
            knownExpressions(bgs[i], allowedBackground, 0);
            featureBackgroundEnvelope(bgs[i], texts[i], comp);
            root = bgs[i].property("ADBE Root Vectors Group");
            vectors = root.property(1).property("ADBE Vectors Group");
            rect = vectors.property("ADBE Vector Shape - Rect"); fill = vectors.property("ADBE Vector Graphic - Fill");
            if (requireTemplate(positionProp(bgs[i]), allowedBackground.slice(0, 2)) !== version ||
                    requireTemplate(rect.property("ADBE Vector Rect Size"), allowedBackground.slice(2, 4)) !== version) { featureReject("MIXED_TEMPLATE_VERSION"); }
            requireTemplate(rect.property("ADBE Vector Rect Roundness"), allowedBackground.slice(4, 5));
            requireTemplate(fill.property("ADBE Vector Fill Color"), allowedBackground.slice(5, 6));
            width = p.pillWidthMode === "fixed" ? p.fixedWidth : textMeasurements[i].bounds.width + p.paddingX * 2;
            height = textMeasurements[i].bounds.height + p.paddingY * 2;
            if (!measurementNumber(width) || !measurementNumber(height) || width <= 0 || height <= 0) {
                throw measurementError("INVALID_FEATURE_GEOMETRY");
            }
            steps[i] = { layer: texts[i], bg: bgs[i], width: width, height: height };
            totalHeight += height + (i > 0 ? p.gap : 0);
        }
        if (!measurementNumber(totalHeight) || totalHeight <= 0) { throw measurementError("INVALID_FEATURE_GEOMETRY"); }
        y = stackBounds.centerY - totalHeight / 2;
        // Freeze source Anchor/Position targets before planning Text-local background centers.
        for (i = 0; i < texts.length; i++) {
            tr = texts[i].property("ADBE Transform Group");
            anchor = writable(tr.property("ADBE Anchor Point"));
            position = writable(tr.property("ADBE Position"));
            vector(anchor.value); vector(position.value);
            if (position.dimensionsSeparated) { throw measurementError("REFRESH_SEPARATED_POSITION_UNSUPPORTED"); }
            offset = featureControllerOffset(ctrl);
            rect = textMeasurements[i].rect;
            newAnchor = vector([rect.left + rect.width / 2, rect.top + rect.height / 2]);
            steps[i].center = vector([stackBounds.centerX, y + steps[i].height / 2]);
            nextPosition = vector([steps[i].center[0] - offset[0], steps[i].center[1] - offset[1]]);
            steps[i].anchor = anchor; steps[i].anchorValue = newAnchor;
            steps[i].position = position; steps[i].positionValue = nextPosition;
            y += steps[i].height + p.gap;
        }
        for (i = 0; i < texts.length; i++) {
            root = bgs[i].property("ADBE Root Vectors Group");
            group = root && root.property(1);
            vectors = group && group.property("ADBE Vectors Group");
            rect = vectors && vectors.property("ADBE Vector Shape - Rect");
            fill = vectors && vectors.property("ADBE Vector Graphic - Fill");
            if (!root || root.numProperties !== 1 || !vectors || vectors.numProperties !== 2 || !rect || !fill ||
                    group.matchName !== "ADBE Vector Group" || rect.matchName !== "ADBE Vector Shape - Rect" ||
                    fill.matchName !== "ADBE Vector Graphic - Fill") {
                throw measurementError("REFRESH_UNKNOWN_RECTANGLE");
            }
            equalRectCenter = vector(rect.property("ADBE Vector Rect Position").value);
            if (equalRectCenter[0] !== 0 || equalRectCenter[1] !== 0 ||
                    bgMeasurements[i].rect.left + bgMeasurements[i].rect.width / 2 !== 0 ||
                    bgMeasurements[i].rect.top + bgMeasurements[i].rect.height / 2 !== 0) {
                throw measurementError("REFRESH_RECTANGLE_CENTER_UNSUPPORTED");
            }
            position = writable(positionProp(bgs[i]));
            if (position.dimensionsSeparated) { throw measurementError("REFRESH_SEPARATED_POSITION_UNSUPPORTED"); }
            nextPosition = vector(position.value);
            // Canonical unit comp basis and centered Rect: the new source Anchor is the
            // background's immediate Text-parent center. V2 then derives it dynamically.
            steps[i].bgPosition = position;
            steps[i].bgPositionValue = [steps[i].anchorValue[0], steps[i].anchorValue[1]];
            steps[i].size = writable(rect.property("ADBE Vector Rect Size"));
            steps[i].roundness = writable(rect.property("ADBE Vector Rect Roundness"));
            steps[i].fill = writable(fill.property("ADBE Vector Fill Color"));
            parentPairs[parentPairs.length] = { text: texts[i], bg: bgs[i] };
        }
        return { steps: steps, texts: texts, parentPairs: parentPairs, artifactId: artifactId,
            color: AEToolbox.hexToColorArray(p.fillColor), roundness: p.cornerRadius };
    }

    function applyFeatureRefresh(plan) {
        var i;
        var step;
        for (i = 0; i < plan.steps.length; i++) {
            step = plan.steps[i];
            step.anchor.setValue(step.anchorValue);
            step.position.setValue(step.positionValue);
        }
        for (i = 0; i < plan.steps.length; i++) {
            step = plan.steps[i];
            step.size.setValue([step.width, step.height]);
            step.roundness.setValue(plan.roundness || 0);
            step.fill.setValue(plan.color);
            step.bgPosition.setValue(step.bgPositionValue);
        }
        // Relationships and basis were admitted in preflight. Rebind only after every read succeeds.
        for (i = 0; i < plan.parentPairs.length; i++) { bindFeaturePillToController(plan.parentPairs[i].bg, plan.artifactId); }
        bindFeatureTextPositionsToController(plan.texts, plan.artifactId);
        return plan.steps.length;
    }

    function shouldSkipGridLayer(layer) {
        var data = parseMetadata(layer);
        var name = layer.name || "";
        if (data && data.aetoolbox) {
            return true;
        }
        if (name === "ICON_GRID_CTRL" || name === "FEATURE_STACK_CTRL") {
            return true;
        }
        if (name.indexOf("GUIDE") >= 0 || name.indexOf("DEBUG") >= 0 || name.indexOf("PREVIEW") >= 0 || name.indexOf("BOUNDS") >= 0) {
            return true;
        }
        if (name.indexOf("_BG") >= 0 || name.indexOf("_PILL_BG") >= 0) {
            return true;
        }
        return false;
    }

    function sortGridItems(items, sortMode) {
        items.sort(function (a, b) {
            var ba;
            var bb;
            var rowThreshold;
            if (sortMode === "timeline") {
                return b.layer.index - a.layer.index;
            }
            ba = a.bounds;
            bb = b.bounds;
            if (sortMode === "xPosition") {
                return ba.centerX - bb.centerX;
            }
            if (sortMode === "yPosition") {
                return ba.centerY - bb.centerY;
            }
            rowThreshold = Math.max(12, Math.min(ba.height || 12, bb.height || 12) * 0.7);
            if (Math.abs(ba.centerY - bb.centerY) > rowThreshold) {
                return ba.centerY - bb.centerY;
            }
            return ba.centerX - bb.centerX;
        });
    }

    function unionBoundsForGridItems(items) {
        var i;
        var b;
        var left = 999999;
        var top = 999999;
        var right = -999999;
        var bottom = -999999;
        for (i = 0; i < items.length; i++) {
            b = items[i].bounds;
            left = Math.min(left, b.left);
            top = Math.min(top, b.top);
            right = Math.max(right, b.right);
            bottom = Math.max(bottom, b.bottom);
        }
        if (left === 999999) {
            return area(0, 0, 0, 0);
        }
        return area(left, top, right, bottom);
    }

    function gridScaleFactorFromBounds(bounds, p) {
        var mode = p.normalizeMode || "fitBox";
        var sx;
        var sy;
        if (mode === "none" || bounds.width <= 0 || bounds.height <= 0) {
            return 1;
        }
        if (mode === "uniformHeight") {
            return p.targetHeight / bounds.height;
        }
        if (mode === "uniformWidth") {
            return p.targetWidth / bounds.width;
        }
        sx = p.targetWidth / bounds.width;
        sy = p.targetHeight / bounds.height;
        return Math.min(sx, sy);
    }

    function setLayerScaleFromOriginal(layer, scaleX, scaleY, factor) {
        var s = scaleProp(layer);
        var v;
        if (!s) {
            return;
        }
        v = s.value;
        if (v.length > 2) {
            s.setValue([scaleX * factor, scaleY * factor, v[2]]);
        } else {
            s.setValue([scaleX * factor, scaleY * factor]);
        }
    }

    function parentBackgroundsToTextLayers(pairs, artifactId) {
        var i;
        for (i = 0; i < pairs.length; i++) {
            try {
                if (pairs[i].bg && pairs[i].text) {
                    pairs[i].bg.parent = pairs[i].text;
                    setLayerLocalPosition(pairs[i].bg, 0, 0);
                    bindFeaturePillToController(pairs[i].bg, artifactId);
                }
            } catch (err) {
            }
        }
    }

    function layoutIconGridLocal(items, p, applyScale) {
        var columns = Math.max(1, Math.min(items.length, p.columns));
        var rows = Math.ceil(items.length / columns);
        var cellStepX = p.cellWidth + p.gapX;
        var cellStepY = p.cellHeight + p.gapY;
        var gridHeight = (rows - 1) * cellStepY;
        var startY = -gridHeight / 2;
        var debugItems = [];
        var i;
        var col;
        var row;
        var rowStart;
        var rowItemCount;
        var rowWidth;
        var startX;
        var x;
        var y;
        var factor;
        var item;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            col = i % columns;
            row = Math.floor(i / columns);
            rowStart = row * columns;
            rowItemCount = Math.min(columns, items.length - rowStart);
            rowWidth = (rowItemCount - 1) * cellStepX;
            if (p.lastRowAlign === "left" && row === rows - 1) {
                startX = -((columns - 1) * cellStepX) / 2;
            } else if (p.lastRowAlign === "right" && row === rows - 1) {
                startX = ((columns - 1) * cellStepX) / 2 - rowWidth;
            } else {
                startX = -rowWidth / 2;
            }
            x = startX + col * cellStepX;
            y = startY + row * cellStepY;
            factor = gridScaleFactorFromBounds(item.bounds, p);
            if (applyScale !== false) {
                setLayerScaleFromOriginal(item.layer, item.scaleX, item.scaleY, factor);
            }
            setLayerLocalPosition(item.layer, x, y);
            debugItems[debugItems.length] = {
                layerName: item.layer.name,
                width: item.bounds.width,
                height: item.bounds.height,
                scaleX: item.scaleX,
                scaleY: item.scaleY,
                scaleFactor: factor,
                newScaleX: item.scaleX * factor,
                newScaleY: item.scaleY * factor,
                x: x,
                y: y
            };
        }
        return {
            rows: rows,
            items: debugItems
        };
    }

    function computeIconGridWorldLayout(items, p, centerX, centerY) {
        var columns = Math.max(1, Math.min(items.length, p.columns));
        var rows = Math.ceil(items.length / columns);
        var cellStepX = p.cellWidth + p.gapX;
        var cellStepY = p.cellHeight + p.gapY;
        var gridHeight = (rows - 1) * cellStepY;
        var startY = -gridHeight / 2;
        var debugItems = [];
        var i;
        var col;
        var row;
        var rowStart;
        var rowItemCount;
        var rowWidth;
        var startX;
        var localX;
        var localY;
        var factor;
        var item;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            col = i % columns;
            row = Math.floor(i / columns);
            rowStart = row * columns;
            rowItemCount = Math.min(columns, items.length - rowStart);
            rowWidth = (rowItemCount - 1) * cellStepX;
            if (p.lastRowAlign === "left" && row === rows - 1) {
                startX = -((columns - 1) * cellStepX) / 2;
            } else if (p.lastRowAlign === "right" && row === rows - 1) {
                startX = ((columns - 1) * cellStepX) / 2 - rowWidth;
            } else {
                startX = -rowWidth / 2;
            }
            localX = startX + col * cellStepX;
            localY = startY + row * cellStepY;
            factor = gridScaleFactorFromBounds(item.bounds, p);
            item.localX = localX;
            item.localY = localY;
            item.targetCompX = centerX + localX;
            item.targetCompY = centerY + localY;
            item.scaleFactor = factor;
            item.newScaleX = item.scaleX * factor;
            item.newScaleY = item.scaleY * factor;
            item.finalCompX = item.targetCompX;
            item.finalCompY = item.targetCompY;
            debugItems[debugItems.length] = {
                layerName: item.layer.name,
                width: item.bounds.width,
                height: item.bounds.height,
                scaleX: item.scaleX,
                scaleY: item.scaleY,
                scaleFactor: factor,
                newScaleX: item.newScaleX,
                newScaleY: item.newScaleY,
                x: localX,
                y: localY,
                targetCompX: item.targetCompX,
                targetCompY: item.targetCompY,
                finalCompX: item.targetCompX,
                finalCompY: item.targetCompY
            };
        }
        return {
            rows: rows,
            columns: columns,
            items: debugItems
        };
    }

    function gridDebugJson(originalCenterX, originalCenterY, ctrlX, ctrlY, itemCount, columns, rows, normalizeMode, items, warning) {
        var parts = [];
        var i;
        var item;
        for (i = 0; i < items.length; i++) {
            item = items[i];
            parts[parts.length] = "{\"layerName\":\"" + AEToolbox.jsonEscape(item.layerName) + "\"," +
                "\"originalSize\":[" + debugNumber(item.width) + "," + debugNumber(item.height) + "]," +
                "\"originalScale\":[" + debugNumber(item.scaleX) + "," + debugNumber(item.scaleY) + "]," +
                "\"scaleFactor\":" + debugNumber(item.scaleFactor) + "," +
                "\"newScale\":[" + debugNumber(item.newScaleX) + "," + debugNumber(item.newScaleY) + "]," +
                "\"localPosition\":[" + debugNumber(item.x) + "," + debugNumber(item.y) + "]," +
                "\"targetCompPosition\":[" + debugNumber(item.targetCompX) + "," + debugNumber(item.targetCompY) + "]," +
                "\"finalCompCenter\":[" + debugNumber(item.finalCompX) + "," + debugNumber(item.finalCompY) + "]}";
        }
        return "\"originalCenter\":[" + debugNumber(originalCenterX) + "," + debugNumber(originalCenterY) + "]," +
            "\"version\":\"" + ICON_GRID_VERSION + "\"," +
            "\"functionName\":\"" + ICON_GRID_FUNCTION_NAME + "\"," +
            "\"file\":\"" + ICON_GRID_FILE + "\"," +
            "\"controllerPosition\":[" + debugNumber(ctrlX) + "," + debugNumber(ctrlY) + "]," +
            "\"itemCount\":" + itemCount + "," +
            "\"columns\":" + columns + "," +
            "\"rows\":" + rows + "," +
            "\"normalizeMode\":\"" + AEToolbox.jsonEscape(normalizeMode || "fitBox") + "\"," +
            "\"items\":[" + parts.join(",") + "]," +
            "\"warning\":\"" + AEToolbox.jsonEscape(warning || "") + "\"";
    }

    AEToolbox.tools.adComponentKit.createIconGrid = function (paramsJson) {
        var activeIconGridVersion = ICON_GRID_VERSION;
        var comp = getComp();
        var p = paramsFromJson(paramsJson);
        var layers;
        var gridLayers = [];
        var gridItems = [];
        var invalidCount = 0;
        var firstInvalidLayer = null;
        var firstInvalidReason = "";
        var componentId;
        var artifactId;
        var createdAt;
        var i;
        var b;
        var scale;
        var selectionBounds;
        var ctrl;
        var ctrlTr;
        var ctrlPositionValue;
        var finalBounds;
        var finalBoundsResult;
        var layoutResult;
        var warning = "";
        var validation;
        if (!comp) {
            return jsonResult(false, "Open a composition before creating an icon grid.", "\"version\":\"" + activeIconGridVersion + "\",\"functionName\":\"" + ICON_GRID_FUNCTION_NAME + "\",\"file\":\"" + ICON_GRID_FILE + "\"");
        }
        layers = selectedLayers(comp);
        if (!layers.length) {
            return gridFailureJson("GRID_NO_SELECTION", 0, null, "Select one or more supported 2D layers for the icon grid.");
        }
        for (i = 0; i < layers.length; i++) {
            if (shouldSkipGridLayer(layers[i])) {
                validation = gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
            } else {
                validation = validateGridLayer(layers[i], comp, comp.time);
            }
            if (!validation.ok) {
                invalidCount++;
                if (!firstInvalidLayer) {
                    firstInvalidLayer = layers[i];
                    firstInvalidReason = validation.reason;
                }
            } else {
                gridLayers[gridLayers.length] = layers[i];
                gridItems[gridItems.length] = validation.candidate;
            }
        }
        if (invalidCount > 0) {
            return gridFailureJson(firstInvalidReason, invalidCount, firstInvalidLayer, "Icon Grid rejected the selection before making changes.");
        }
        if (!gridItems.length) {
            return gridFailureJson("GRID_NO_SELECTION", 0, null, "Select one or more supported 2D layers for the icon grid.");
        }
        sortGridItems(gridItems, p.gridSortMode);
        gridLayers = [];
        for (i = 0; i < gridItems.length; i++) {
            gridLayers[gridLayers.length] = gridItems[i].layer;
        }
        selectionBounds = unionBoundsForGridItems(gridItems);
        componentId = nextComponentId(comp, "iconGrid");
        artifactId = createArtifactId("iconGrid");
        createdAt = createdAtString();
        app.beginUndoGroup("AE Toolbox Create Icon Grid");
        try {
            layoutResult = computeIconGridWorldLayout(gridItems, p, selectionBounds.centerX, selectionBounds.centerY);
            try {
                if (!comp.layers || typeof comp.layers.addNull !== "function") {
                    throw new Error("controller-unavailable");
                }
                ctrl = createController(comp, "ICON_GRID_CTRL", componentId, "iconGrid", 0, 0, p);
                if (!ctrl) {
                    throw new Error("controller-unavailable");
                }
                ctrl.parent = null;
                ctrl.threeDLayer = false;
                ctrlTr = ctrl.property("ADBE Transform Group");
                if (!ctrlTr || !gridPropertyWritable(ctrlTr.property("ADBE Anchor Point")) || !gridPropertyWritable(ctrlTr.property("ADBE Position")) || !gridPropertyWritable(ctrlTr.property("ADBE Scale")) || !gridPropertyWritable(ctrlTr.property("ADBE Rotate Z"))) {
                    throw new Error("controller-transform-unavailable");
                }
                ctrlTr.property("ADBE Anchor Point").setValue([0, 0]);
                ctrlTr.property("ADBE Position").setValue([selectionBounds.centerX, selectionBounds.centerY]);
                ctrlTr.property("ADBE Scale").setValue([100, 100]);
                ctrlTr.property("ADBE Rotate Z").setValue(0);
            } catch (controllerError) {
                try { if (ctrl && typeof ctrl.remove === "function") { ctrl.remove(); } } catch (removeControllerError) {}
                app.endUndoGroup();
                return gridFailureJson("GRID_CONTROLLER_CREATE_FAILED", 0, null, "Icon Grid controller could not be created.");
            }
            for (i = 0; i < gridItems.length; i++) {
                centerLayerAnchorToVisualCenter(gridItems[i].layer, comp.time);
                setLayerScaleFromOriginal(gridItems[i].layer, gridItems[i].scaleX, gridItems[i].scaleY, gridItems[i].scaleFactor);
                setLayerLocalPosition(gridItems[i].layer, gridItems[i].targetCompX, gridItems[i].targetCompY);
            }
            for (i = 0; i < gridItems.length; i++) {
                finalBoundsResult = getGridVisualBoundsInComp(gridItems[i].layer, comp, comp.time);
                if (!finalBoundsResult.ok) { throw new Error(finalBoundsResult.reason); }
                finalBounds = finalBoundsResult.bounds;
                gridItems[i].finalCompX = finalBounds.centerX;
                gridItems[i].finalCompY = finalBounds.centerY;
                layoutResult.items[i].finalCompX = finalBounds.centerX;
                layoutResult.items[i].finalCompY = finalBounds.centerY;
            }
            for (i = 0; i < gridItems.length; i++) {
                gridItems[i].layer.parent = ctrl;
                setLayerArtifactMetadata(gridItems[i].layer, {
                    kind: "iconGrid",
                    componentType: "iconGrid",
                    artifactId: artifactId,
                    componentId: componentId,
                    role: "sourceLayerBinding",
                    index: i + 1,
                    createdAt: createdAt
                });
            }
            setLayerArtifactMetadata(ctrl, {
                kind: "iconGrid",
                componentType: "iconGrid",
                artifactId: artifactId,
                componentId: componentId,
                role: "controller",
                index: 0,
                createdAt: createdAt
            });
            for (i = 0; i < gridItems.length; i++) {
                finalBoundsResult = getGridVisualBoundsInComp(gridItems[i].layer, comp, comp.time);
                if (!finalBoundsResult.ok) { throw new Error(finalBoundsResult.reason); }
                finalBounds = finalBoundsResult.bounds;
                gridItems[i].finalCompX = finalBounds.centerX;
                gridItems[i].finalCompY = finalBounds.centerY;
                layoutResult.items[i].finalCompX = finalBounds.centerX;
                layoutResult.items[i].finalCompY = finalBounds.centerY;
            }
        } catch (err) {
            app.endUndoGroup();
            return gridFailureJson("GRID_TRANSFORM_NOT_WRITABLE", 0, null, "Icon Grid could not apply the validated layout.");
        }
        app.endUndoGroup();
        ctrlPositionValue = positionProp(ctrl).value;
        if (Math.abs(ctrlPositionValue[0] - selectionBounds.centerX) > 0.5 || Math.abs(ctrlPositionValue[1] - selectionBounds.centerY) > 0.5) {
            warning = warning ? warning + " Controller position does not match original center." : "Controller position does not match original center.";
        }
        for (i = 0; i < layoutResult.items.length; i++) {
            if (Math.abs(layoutResult.items[i].finalCompX - layoutResult.items[i].targetCompX) > 1 || Math.abs(layoutResult.items[i].finalCompY - layoutResult.items[i].targetCompY) > 1) {
                warning = warning ? warning + " Final comp center mismatch detected." : "Final comp center mismatch detected.";
                break;
            }
        }
        return jsonResult(true, "Icon Grid created with " + gridItems.length + " item(s).", "\"componentId\":\"" + AEToolbox.jsonEscape(componentId) + "\",\"artifactId\":\"" + AEToolbox.jsonEscape(artifactId) + "\"," + gridDebugJson(selectionBounds.centerX, selectionBounds.centerY, ctrlPositionValue[0], ctrlPositionValue[1], gridItems.length, Math.max(1, Math.min(gridItems.length, p.columns)), layoutResult.rows, p.normalizeMode, layoutResult.items, warning));
    };

    function readIconParams(ctrl) {
        var align = Math.round(num(effectValue(ctrl, "Last Row Align", 1), 1));
        var mode = Math.round(num(effectValue(ctrl, "Normalize Mode", 3), 3));
        var sort = Math.round(num(effectValue(ctrl, "Sort", 3), 3));
        return {
            columns: Math.max(1, Math.round(num(effectValue(ctrl, "Columns", 4), 4))),
            targetWidth: num(effectValue(ctrl, "Target Width", 72), 72),
            targetHeight: num(effectValue(ctrl, "Target Height", 72), 72),
            cellWidth: num(effectValue(ctrl, "Cell Width", 100), 100),
            cellHeight: num(effectValue(ctrl, "Cell Height", 118), 118),
            gapX: num(effectValue(ctrl, "Gap X", 28), 28),
            gapY: num(effectValue(ctrl, "Gap Y", 24), 24),
            normalizeMode: mode === 0 ? "none" : (mode === 1 ? "uniformHeight" : (mode === 2 ? "uniformWidth" : "fitBox")),
            lastRowAlign: align === 0 ? "left" : (align === 2 ? "right" : "center"),
            gridSortMode: sort === 0 ? "timeline" : (sort === 1 ? "xPosition" : (sort === 2 ? "yPosition" : "rowMajor"))
        };
    }

    function validateGridRefreshController(ctrl) {
        var tr;
        var anchor;
        var position;
        var scale;
        var rotation;
        try {
            if (!ctrl || ctrl.threeDLayer || ctrl.parent || ctrl.locked) { return false; }
            tr = ctrl.property("ADBE Transform Group");
            anchor = tr && tr.property("ADBE Anchor Point");
            position = tr && tr.property("ADBE Position");
            scale = tr && tr.property("ADBE Scale");
            rotation = tr && tr.property("ADBE Rotate Z");
            if (!gridPropertyWritable(anchor) || !gridPropertyWritable(position) || !gridPropertyWritable(scale) || !gridPropertyWritable(rotation)) { return false; }
            if (gridPropertyHasExpression(anchor) || gridPropertyHasExpression(position) || gridPropertyHasExpression(scale) || gridPropertyHasExpression(rotation)) { return false; }
            if (!gridFinitePoint(anchor.value) || !gridFinitePoint(position.value) || !gridFinitePoint(scale.value) || !gridFiniteNumber(rotation.value)) { return false; }
            if (scale.value[0] <= 0 || scale.value[1] <= 0) { return false; }
        } catch (err) {
            return false;
        }
        return true;
    }

    function getGridRefreshLocalBounds(layer, ctrl, time) {
        var layerType = classifyGridLayer(layer);
        var rect = null;
        var fallback;
        var tr;
        var anchor;
        var position;
        var scale;
        var rotation;
        var width;
        var height;
        var centerX;
        var centerY;
        try {
            if (!layer || layer.parent !== ctrl || layer.threeDLayer || layer.locked || layer.nullLayer || layer.adjustmentLayer) {
                return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
            }
            if (layerType === "unsupported") { return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE"); }
            if (layerType === "av" && (layer.collapseTransformation === true || layer.continuouslyRasterize === true)) {
                return gridFailure("GRID_UNSUPPORTED_LAYER_TYPE");
            }
            tr = layer.property("ADBE Transform Group");
            anchor = tr && tr.property("ADBE Anchor Point");
            position = tr && tr.property("ADBE Position");
            scale = tr && tr.property("ADBE Scale");
            rotation = tr && tr.property("ADBE Rotate Z");
            if (!gridPropertyWritable(anchor) || !gridPropertyWritable(position) || !gridPropertyWritable(scale) || !gridPropertyWritable(rotation)) { return gridFailure("GRID_TRANSFORM_NOT_WRITABLE"); }
            if (gridPropertyHasExpression(anchor) || gridPropertyHasExpression(position) || gridPropertyHasExpression(scale) || gridPropertyHasExpression(rotation)) { return gridFailure("GRID_TRANSFORM_EXPRESSION"); }
            if (!gridFinitePoint(anchor.value) || !gridFinitePoint(position.value) || !gridFinitePoint(scale.value) || !gridFiniteNumber(rotation.value)) { return gridFailure("GRID_TRANSFORM_NOT_WRITABLE"); }
            if (scale.value[0] <= 0 || scale.value[1] <= 0) { return gridFailure("GRID_UNSUPPORTED_NEGATIVE_SCALE"); }
            if (Math.abs(rotation.value) > 0.001) { return gridFailure("GRID_UNSUPPORTED_ROTATION"); }
            if (typeof layer.sourceRectAtTime === "function") { rect = layer.sourceRectAtTime(time, false); }
        } catch (err) {
            return gridFailure("GRID_INVALID_SOURCE_BOUNDS");
        }
        if (!rect) {
            if (layerType === "shape" || layerType === "text") { return gridFailure("GRID_INVALID_SOURCE_BOUNDS"); }
            fallback = gridSourceSizeRect(layer);
            if (!fallback) { return gridFailure("GRID_INVALID_SOURCE_BOUNDS"); }
            if (fallback.invalid) { return gridFailure(fallback.invalid); }
            rect = fallback;
        }
        if (!gridFiniteNumber(rect.left) || !gridFiniteNumber(rect.top) || !gridFiniteNumber(rect.width) || !gridFiniteNumber(rect.height)) {
            return gridFailure("GRID_NON_FINITE_BOUNDS");
        }
        if (rect.width <= 0 || rect.height <= 0) { return gridFailure("GRID_ZERO_SIZE_BOUNDS"); }
        width = rect.width * scale.value[0] / 100;
        height = rect.height * scale.value[1] / 100;
        if (!gridFiniteNumber(width) || !gridFiniteNumber(height)) { return gridFailure("GRID_NON_FINITE_BOUNDS"); }
        if (width <= 0 || height <= 0) { return gridFailure("GRID_ZERO_SIZE_BOUNDS"); }
        centerX = position.value[0] + (rect.left + rect.width / 2 - anchor.value[0]) * scale.value[0] / 100;
        centerY = position.value[1] + (rect.top + rect.height / 2 - anchor.value[1]) * scale.value[1] / 100;
        if (!gridFiniteNumber(centerX) || !gridFiniteNumber(centerY)) { return gridFailure("GRID_NON_FINITE_BOUNDS"); }
        return { ok: true, bounds: area(centerX - width / 2, centerY - height / 2, centerX + width / 2, centerY + height / 2), scaleX: scale.value[0], scaleY: scale.value[1] };
    }

    function refreshIconGrid(comp, ctrl, data) {
        var layers = componentLayers(comp, data.componentId);
        var items = [];
        var i;
        var item;
        var measurement;
        var gridItems = [];
        var p = readIconParams(ctrl);
        if (!validateGridRefreshController(ctrl)) { throw new Error("GRID_REFRESH_CONTROLLER_UNSUPPORTED"); }
        for (i = 0; i < layers.length; i++) {
            item = layers[i];
            if (item.data.role === "item" || item.data.role === "icon" || item.data.role === "generatedLayer" || item.data.role === "sourceLayerBinding") {
                items[item.data.index - 1] = item.layer;
            }
        }
        for (i = items.length - 1; i >= 0; i--) {
            if (!items[i]) {
                items.splice(i, 1);
            }
        }
        if (!items.length) {
            return 0;
        }
        for (i = 0; i < items.length; i++) {
            measurement = getGridRefreshLocalBounds(items[i], ctrl, comp.time);
            if (!measurement.ok) { throw new Error(measurement.reason); }
            gridItems[gridItems.length] = {
                layer: items[i],
                bounds: measurement.bounds,
                scaleX: measurement.scaleX,
                scaleY: measurement.scaleY
            };
        }
        sortGridItems(gridItems, p.gridSortMode);
        layoutIconGridLocal(gridItems, p, true);
        return items.length;
    }

    AEToolbox.tools.adComponentKit.refreshSelectedComponent = function () {
        var comp = getComp();
        var selected;
        var ctrl;
        var data;
        var count = 0;
        var featurePlan = null;
        if (!comp) {
            return jsonResult(false, "Open a composition before refreshing a component.");
        }
        selected = comp.selectedLayers || [];
        if (!selected.length) {
            return jsonResult(false, "Select a component controller first.");
        }
        ctrl = selected[0];
        data = parseMetadata(ctrl);
        if (!data || data.role !== "controller") {
            return jsonResult(false, "Selected layer is not an AE Toolbox component controller.");
        }
        if (data.componentType === "featureStack") {
            try { featurePlan = planFeatureRefresh(comp, ctrl, data); }
            catch (measurementFailure) {
                return jsonResult(false, "Refresh component preflight failed; no changes made: " + String(measurementFailure));
            }
        }
        app.beginUndoGroup("AE Toolbox Refresh Component");
        try {
            if (data.componentType === "featureStack") {
                count = applyFeatureRefresh(featurePlan);
            } else if (data.componentType === "iconGrid") {
                count = refreshIconGrid(comp, ctrl, data);
            } else {
                app.endUndoGroup();
                return jsonResult(false, "Unsupported component type: " + data.componentType);
            }
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Refresh component failed: " + err.toString() + (featurePlan ? "; changes may be partial; no rollback performed." : ""));
        }
        app.endUndoGroup();
        return jsonResult(true, "Component refreshed (" + count + " item(s)).");
    };

    AEToolbox.tools.adComponentKit.selectComponentLayers = function () {
        var comp = getComp();
        var selected;
        var ctrl;
        var data;
        var layers;
        var i;
        if (!comp) {
            return jsonResult(false, "Open a composition before selecting component layers.");
        }
        selected = comp.selectedLayers || [];
        if (!selected.length) {
            return jsonResult(false, "Select a component controller first.");
        }
        ctrl = selected[0];
        data = parseMetadata(ctrl);
        if (!data || data.role !== "controller") {
            return jsonResult(false, "Selected layer is not an AE Toolbox component controller.");
        }
        layers = componentLayers(comp, data.componentId);
        for (i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        for (i = 0; i < layers.length; i++) {
            layers[i].layer.selected = true;
        }
        return jsonResult(true, "Selected " + layers.length + " component layer(s).");
    };

    function restoredDetachComment(data) {
        if (typeof data.previousCommentEncoded !== "string") {
            throw new Error("Original source comment is missing or has an unsupported type.");
        }
        try {
            return decodeURIComponent(data.previousCommentEncoded);
        } catch (err) {
            throw new Error("Original source comment encoding is invalid.");
        }
    }

    // Detach F1 is deliberately bounded to translation-only 2D parent chains.
    // Samples are post-expression at one comp time; metadata is retained until verification.
    function detachFeaturePlan(plan, ctrl, artifactId, time) {
        var samples = [], edits = [], releases = [], templates = featurePillExpressions(), legacyTemplates = legacyFeaturePillExpressions();
        var i, j, entry, layer, root, group, vectors, rect, fill, source, refs, text, match, names, cursor, token, resolved;
        var release, releaseLocator, plannedEdit;
        if (typeof time !== "number" || !isFinite(time) || !artifactId) { throw new Error("Unsupported Feature Detach time or legacy expression ownership."); }
        function fail(label) { throw new Error("Feature Detach: " + label); }
        function positiveInteger(value) {
            return typeof value === "number" && isFinite(value) && value > 0 && Math.floor(value) === value;
        }
        // Preflight identity only. Keep edit.prop for all sampling and execution;
        // native AE can return different wrappers for the same structural Property.
        function propertyLocator(prop, expectedLayer) {
            var compId, layerId, depth, remaining, node = prop, path = [], index, matchName;
            try {
                compId = ctrl.containingComp.id; layerId = expectedLayer.id;
                if (!positiveInteger(compId) || !positiveInteger(layerId) || expectedLayer.containingComp.id !== compId) {
                    fail("property locator invalid comp/layer identity");
                }
                depth = prop.propertyDepth;
                if (!positiveInteger(depth) || depth > 21) { fail("property locator invalid depth"); }
                remaining = depth;
                while (remaining > 0) {
                    if (!node || node.propertyDepth !== remaining) { fail("property locator inconsistent parent depth"); }
                    index = node.propertyIndex; matchName = node.matchName;
                    if (!positiveInteger(index) || typeof matchName !== "string" || !matchName.length) {
                        fail("property locator invalid index/matchName");
                    }
                    path.unshift({ propertyIndex: index, matchName: matchName });
                    node = node.parentProperty;
                    remaining--;
                }
                if (!node || node.propertyDepth !== 0 || node.id !== layerId || !node.containingComp || node.containingComp.id !== compId) {
                    fail("property locator does not reach expected layer/comp");
                }
            } catch (locatorError) {
                // No name, layer index, String(prop), or reference-identity fallback.
                throw new Error("Feature Detach: property locator unavailable or invalid: " + String(locatorError));
            }
            return { compId: compId, layerId: layerId, path: path };
        }
        function samePropertyLocator(a, b) {
            var n;
            if (a.compId !== b.compId || a.layerId !== b.layerId || a.path.length !== b.path.length) { return false; }
            for (n = 0; n < a.path.length; n++) {
                if (a.path[n].propertyIndex !== b.path[n].propertyIndex || a.path[n].matchName !== b.path[n].matchName) { return false; }
            }
            return true;
        }
        function member(l) {
            var n;
            for (n = 0; n < plan.length; n++) { if (plan[n].layer === l) { return plan[n]; } }
            return null;
        }
        function admitLayerSpace(l, label, checkLocked) {
            var kind = classifyGridLayer(l), threeD, collapse, canSetCollapse, locked, source, isNull, continuous;
            if (kind === "unsupported") { fail(label + " unknown/unreadable layer type"); }
            try {
                threeD = l.threeDLayer; collapse = l.collapseTransformation;
                canSetCollapse = l.canSetCollapseTransformation;
                if (checkLocked) { locked = l.locked; }
            } catch (flagError) { fail(label + " unreadable layer flags"); }
            if (typeof threeD !== "boolean" || typeof collapse !== "boolean" || typeof canSetCollapse !== "boolean" || (checkLocked && typeof locked !== "boolean")) {
                fail(label + " unavailable layer flags");
            }
            if (checkLocked && locked) { fail(label + " locked layer"); }
            if (threeD) { fail(label + " unsupported 3D layer"); }
            // Host matchName identifies Text/Shape. Their inherent collapse=true,
            // canSet=false flags do not mean a collapsed precomp or unsafe parent space.
            if (kind === "text" || kind === "shape") { return; }
            try {
                source = l.source; isNull = l.nullLayer; continuous = l.continuouslyRasterize;
            } catch (sourceError) { fail(label + " unreadable AV source/space flags"); }
            if (typeof isNull !== "boolean" || (typeof continuous !== "undefined" && typeof continuous !== "boolean")) { fail(label + " unavailable AV space flags"); }
            if (source instanceof CompItem) {
                if (collapse) { fail(label + " unsupported collapsed precomp"); }
            } else if (!isNull && !(typeof FootageItem !== "undefined" && source instanceof FootageItem)) {
                fail(label + " unknown AV source type");
            }
            if (collapse || continuous === true) { fail(label + " unsupported rasterized AV space"); }
        }
        function numeric(value, size, label) {
            var n, result = [];
            if (!size) {
                if (typeof value !== "number" || !isFinite(value)) { fail(label + " invalid number"); }
                return value;
            }
            if (!value || (size === -2 ? value.length !== 2 && value.length !== 3 : value.length !== size)) { fail(label + " invalid dimension"); }
            for (n = 0; n < value.length; n++) {
                if (typeof value[n] !== "number" || !isFinite(value[n])) { fail(label + " invalid number"); }
                result[n] = value[n];
            }
            return result;
        }
        function sample(prop, size, label) {
            var n, value;
            if (!prop || typeof prop.valueAtTime !== "function") { fail(label + " unreadable"); }
            for (n = 0; n < samples.length; n++) { if (samples[n].prop === prop) { return samples[n].value; } }
            if (prop.expressionError) { fail(label + " expression error"); }
            value = numeric(prop.valueAtTime(time, false), size, label);
            if (prop.expressionError) { fail(label + " expression error after evaluation"); }
            samples[samples.length] = { prop: prop, value: value };
            return value;
        }
        function writable(prop, label) {
            if (!prop || typeof prop.setValue !== "function" || prop.numKeys !== 0 || prop.dimensionsSeparated) {
                fail(label + " not writable without changing keyframes/separated dimensions");
            }
        }
        function expressionEdit(l, prop, body, role, size, label, legacyBody) {
            var expected = signedExpressionBody(body, { artifactId: artifactId, kind: "featureStack", role: role,
                previousExpression: "", previousExpressionEnabled: false });
            var value;
            if (legacyBody && prop && prop.expression !== expected) {
                expected = signedExpressionBody(legacyBody, { artifactId: artifactId, kind: "featureStack", role: role,
                    previousExpression: "", previousExpressionEnabled: false });
            }
            writable(prop, label);
            // Full signature and full body, including empty protected history. No prefix-only admission.
            if (l.locked || prop.canSetExpression !== true || prop.expression !== expected || prop.expressionEnabled !== true) {
                fail(label + " unknown/edited expression, protected history or locked layer");
            }
            value = sample(prop, size, label);
            if (size === -2 && value.length === 3 && value[2] !== 0) { fail(label + " unsupported 2D Z component"); }
            if ((label.indexOf("/Rect Size") >= 0 && (value[0] < 0 || value[1] < 0)) || (label.indexOf("/Roundness") >= 0 && value < 0)) { fail(label + " invalid geometry value"); }
            edits[edits.length] = { prop: prop, locator: propertyLocator(prop, l), expression: expected, value: value, size: size === -2 ? value.length : size, label: label };
        }
        function translation(l, seen) {
            var n, transform, p, a, scale, rotation, parentOffset;
            for (n = 0; n < seen.length; n++) { if (seen[n] === l) { fail("parent cycle"); } }
            admitLayerSpace(l, "parent space", false);
            seen[seen.length] = l;
            transform = l.property("ADBE Transform Group");
            p = sample(positionProp(l), -2, l.name + "/Position");
            a = sample(transform.property("ADBE Anchor Point"), -2, l.name + "/Anchor");
            scale = sample(transform.property("ADBE Scale"), -2, l.name + "/Scale");
            rotation = sample(transform.property("ADBE Rotate Z"), 0, l.name + "/Rotation");
            // No affine decomposition or arbitrary A09 coordinate conversion in this slice.
            if (scale[0] !== 100 || scale[1] !== 100 || rotation !== 0 || (scale.length === 3 && scale[2] !== 100) || (p.length === 3 && p[2] !== 0) || (a.length === 3 && a[2] !== 0)) { fail(l.name + " parent requires unit scale, zero rotation and neutral 2D Z"); }
            parentOffset = l.parent ? translation(l.parent, seen) : [0, 0];
            return [parentOffset[0] + p[0] - a[0], parentOffset[1] + p[1] - a[1]];
        }
        function checkAdditionalBindings(container, depth, releasing, owningLayer) {
            var n, k, prop, known, scanLocator;
            if (depth > 20) { fail("property hierarchy too deep"); }
            for (n = 1; n <= container.numProperties; n++) {
                prop = container.property(n);
                if (!prop) { fail("property unavailable"); }
                scanLocator = propertyLocator(prop, owningLayer);
                if (prop.canSetExpression && (isToolOwnedExpression(prop.expression, artifactId) || (releasing && prop.expressionEnabled))) {
                    known = false;
                    for (k = 0; k < edits.length; k++) { if (samePropertyLocator(edits[k].locator, scanLocator)) { known = true; } }
                    if (!known) { fail("unknown dependency or tool binding on an unsupported property"); }
                }
                if (prop.numProperties) { checkAdditionalBindings(prop, depth + 1, releasing, owningLayer); }
            }
        }
        root = ctrl.property("ADBE Effect Parade");
        names = ["Gap", "Padding X", "Padding Y", "Fixed Width", "Text Align", "Pill Width Mode", "Corner Radius", "Fill Color"];
        for (i = 0; i < names.length; i++) {
            source = root ? root.property(names[i]) : null;
            sample(source ? source.property(1) : null, names[i] === "Fill Color" ? 4 : 0, "controller/" + names[i]);
        }
        for (i = 0; i < plan.length; i++) {
            entry = plan[i]; layer = entry.layer;
            admitLayerSpace(layer, layer.name, true);
            if (entry.data.role === "sourceLayerBinding") {
                if (entry.parent !== ctrl || !entry.clearParent) { fail(layer.name + " source parent is outside the recognized template"); }
                text = positionProp(layer).expression;
                // Parse only the template's literal reference list, never execute it.
                match = typeof text === "string" ? /\n  var refs = (\[[^\r\n]*\]);\n  var itemIndex = ([0-9]+);\n/.exec(text) : null;
                if (!match) { fail(layer.name + " source reference template unavailable"); }
                refs = []; names = []; cursor = match[1].substring(1, match[1].length - 1);
                while (cursor.length) {
                    token = /^\{i:([0-9]+),n:("(?:[^"\\]|\\.)*")}([,]?)/.exec(cursor);
                    if (!token || Number(token[1]) < 1) { fail(layer.name + " invalid source references"); }
                    source = { index: Number(token[1]), name: AEToolbox.parseJson(token[2]) };
                    resolved = null;
                    for (j = 1; j <= layer.containingComp.numLayers; j++) {
                        if (layer.containingComp.layer(j).name === source.name) {
                            if (resolved) { fail("ambiguous source name"); }
                            resolved = layer.containingComp.layer(j);
                        }
                    }
                    if (!resolved || !member(resolved) || member(resolved).data.role !== "sourceLayerBinding" || resolved.parent !== ctrl) { fail("source reference outside artifact"); }
                    for (j = 0; j < names.length; j++) { if (names[j] === resolved) { fail("duplicate source reference"); } }
                    names[names.length] = resolved; refs[refs.length] = source;
                    cursor = cursor.substring(token[0].length);
                    if (cursor.length && token[3] !== ",") { fail("invalid source separator"); }
                }
                if (names[Number(match[2])] !== layer) { fail("source item identity mismatch"); }
                expressionEdit(layer, positionProp(layer), featureTextPositionExpression(layerRefsExpression(refs), Number(match[2])), "sourceLayerBinding", -2, layer.name + "/Position", legacyFeatureTextPositionExpression(layerRefsExpression(refs), Number(match[2])));
            } else if (entry.data.role === "generatedLayer") {
                source = member(entry.parent);
                if (!source || source.data.role !== "sourceLayerBinding" || source.parent !== ctrl) { fail(layer.name + " background dependency outside artifact"); }
                root = layer.property("ADBE Root Vectors Group"); group = root ? root.property(1) : null;
                vectors = group ? group.property("ADBE Vectors Group") : null;
                rect = vectors ? vectors.property("ADBE Vector Shape - Rect") : null;
                fill = vectors ? vectors.property("ADBE Vector Graphic - Fill") : null;
                expressionEdit(layer, positionProp(layer), templates[0], "generatedLayer", -2, layer.name + "/Position", legacyTemplates[0]);
                expressionEdit(layer, rect ? rect.property("ADBE Vector Rect Size") : null, templates[1], "generatedLayer", 2, layer.name + "/Rect Size", legacyTemplates[1]);
                expressionEdit(layer, rect ? rect.property("ADBE Vector Rect Roundness") : null, templates[2], "generatedLayer", 0, layer.name + "/Roundness");
                expressionEdit(layer, fill ? fill.property("ADBE Vector Fill Color") : null, templates[3], "generatedLayer", 4, layer.name + "/Fill Color");
            } else if (layer !== ctrl || entry.data.role !== "controller") {
                fail(layer.name + " unsupported Feature member role");
            }
        }
        // Identity does not grant authority: every edit above passed exact template,
        // artifact/role, protected-history and keyframe admission. Reject ambiguity.
        for (i = 0; i < edits.length; i++) {
            for (j = i + 1; j < edits.length; j++) {
                if (samePropertyLocator(edits[i].locator, edits[j].locator)) { fail("duplicate planned property locator"); }
            }
        }
        for (i = 0; i < plan.length; i++) {
            entry = plan[i]; layer = entry.layer;
            checkAdditionalBindings(layer, 0, entry.clearParent, layer);
            if (!entry.clearParent) { continue; }
            root = layer.property("ADBE Transform Group");
            names = ["ADBE Anchor Point", "ADBE Scale", "ADBE Rotate Z"];
            for (j = 0; j < names.length; j++) {
                source = root.property(names[j]);
                if (!source || source.expression) { fail(layer.name + "/" + names[j] + " protected transform expression"); }
            }
            if (typeof layer.setParentWithJump !== "function") { fail(layer.name + " cannot release parent without implicit transform writes"); }
            writable(positionProp(layer), layer.name + "/Position");
            source = translation(entry.parent, [layer]);
            text = sample(positionProp(layer), -2, layer.name + "/Position");
            refs = [text[0] + source[0], text[1] + source[1]];
            if (text.length === 3) { refs[2] = text[2]; }
            release = { layer: layer, prop: positionProp(layer), value: refs, size: text.length, label: layer.name + "/comp Position" };
            releaseLocator = propertyLocator(release.prop, layer);
            plannedEdit = null;
            for (j = 0; j < edits.length; j++) {
                if (samePropertyLocator(edits[j].locator, releaseLocator)) { plannedEdit = edits[j]; }
            }
            if (!plannedEdit || plannedEdit.release) { fail("parent release has no unique planned property"); }
            // Preflight association only: verification uses the already sampled target,
            // never native wrapper equality or execution-time locator re-resolution.
            plannedEdit.release = release;
            releases[releases.length] = release;
        }
        return { edits: edits, releases: releases, time: time };
    }

    function verifyDetachValue(edit, time) {
        // Fixed before real revalidation: geometry 1e-4 AE units, color channels 1e-6.
        var actual = edit.prop.valueAtTime(time, false), i, tolerance = edit.size === 4 ? 0.000001 : 0.0001;
        if (edit.prop.expression || edit.prop.expressionEnabled || edit.prop.expressionError) { throw new Error(edit.label + " expression remains"); }
        if (edit.size) {
            if (!actual || actual.length !== edit.size) { throw new Error(edit.label + " verification dimension mismatch"); }
            for (i = 0; i < edit.size; i++) {
                if (typeof actual[i] !== "number" || !isFinite(actual[i]) || Math.abs(actual[i] - edit.value[i]) > tolerance) { throw new Error(edit.label + " verification mismatch"); }
            }
        } else if (typeof actual !== "number" || !isFinite(actual) || Math.abs(actual - edit.value) > tolerance) { throw new Error(edit.label + " verification mismatch"); }
    }

    AEToolbox.tools.adComponentKit.detachSelectedComponent = function () {
        var comp = getComp();
        var selected;
        var ctrl;
        var data;
        var layers;
        var i;
        var j;
        var item;
        var raw;
        var modern;
        var plan = [];
        var completed = 0;
        var writes = 0;
        var finalization = null;
        var edit;
        if (!comp) {
            return jsonResult(false, "Open a composition before detaching a component.");
        }
        selected = comp.selectedLayers || [];
        if (!selected.length) {
            return jsonResult(false, "Select a component controller first.");
        }
        ctrl = selected[0];
        try {
            data = parseMetadata(ctrl);
            if (!data || data.role !== "controller" || typeof data.componentId !== "string" || !data.componentId) {
                return jsonResult(false, "Selected layer is not an AE Toolbox component controller.");
            }
            modern = !!parseArtifactMetadata(ctrl.comment);
            if (!modern && (data.aetoolbox !== true || data.artifactId || (data.tool && data.tool !== "adComponentKit"))) {
                throw new Error("Controller ownership is ambiguous.");
            }
            layers = componentLayers(comp, data.componentId);
            for (i = 0; i < layers.length; i++) {
                item = layers[i];
                raw = item.layer.comment;
                if (modern) {
                    if (!parseArtifactMetadata(raw) || item.data.artifactId !== data.artifactId) { continue; }
                } else if (parseArtifactMetadata(raw) || item.data.artifactId || item.data.aetoolbox !== true || (item.data.tool && item.data.tool !== "adComponentKit")) {
                    continue;
                }
                if (item.data.componentType !== data.componentType) {
                    throw new Error("Component type ownership is ambiguous.");
                }
                if (item.data.role !== "sourceLayerBinding" && item.data.role !== "itemText" && !shouldDeleteArtifactLayer(item.data.role)) {
                    throw new Error("Component contains an unsupported role.");
                }
                plan[plan.length] = { layer: item.layer, data: item.data, raw: raw,
                    comment: item.data.role === "sourceLayerBinding" || item.data.role === "itemText" ? restoredDetachComment(item.data) : "",
                    parent: item.layer.parent, clearParent: false };
            }
            // Only release relationships whose parent also belongs to this component.
            for (i = 0; i < plan.length; i++) {
                for (j = 0; j < plan.length; j++) {
                    if (plan[i].parent === plan[j].layer) { plan[i].clearParent = true; }
                }
            }
            if (data.componentType === "featureStack") {
                finalization = detachFeaturePlan(plan, ctrl, data.artifactId, comp.time);
            }
        } catch (err) {
            return jsonResult(false, "Detach preflight failed; no changes made: " + err.toString());
        }
        // Keep the selected controller metadata until the other layers have completed.
        for (i = 0; i < plan.length; i++) {
            if (plan[i].layer === ctrl) { item = plan.splice(i, 1)[0]; plan[plan.length] = item; break; }
        }
        app.beginUndoGroup("AE Toolbox Detach Component");
        try {
            if (finalization) {
                for (i = 0; i < plan.length; i++) {
                    if (plan[i].layer.comment !== plan[i].raw || plan[i].layer.parent !== plan[i].parent) { throw new Error("Component data changed after preflight."); }
                }
                for (i = 0; i < finalization.edits.length; i++) {
                    edit = finalization.edits[i];
                    if (edit.prop.expression !== edit.expression || edit.prop.numKeys !== 0) { throw new Error(edit.label + " changed after preflight"); }
                    edit.prop.expression = ""; writes++;
                    edit.prop.setValue(edit.value); writes++;
                }
                for (i = 0; i < finalization.releases.length; i++) {
                    edit = finalization.releases[i];
                    edit.layer.setParentWithJump(null); writes++;
                    edit.prop.setValue(edit.value); writes++;
                }
                for (i = 0; i < finalization.edits.length; i++) {
                    edit = finalization.edits[i];
                    // Preflight linked Position to its sampled comp-space target.
                    verifyDetachValue(edit.release || edit, finalization.time);
                }
            }
            for (i = 0; i < plan.length; i++) {
                item = plan[i];
                if (item.layer.comment !== item.raw || item.layer.parent !== (finalization && item.clearParent ? null : item.parent)) {
                    throw new Error("Component data changed after preflight.");
                }
                if (item.clearParent && !finalization) { item.layer.parent = null; writes++; }
                item.layer.comment = item.comment;
                writes++;
                completed++;
            }
        } catch (writeError) {
            return jsonResult(false, "Detach incomplete; completed layers: " + completed + ", confirmed writes: " + writes + ". A failing write may have changed data; no rollback performed: " + writeError.toString());
        } finally {
            app.endUndoGroup();
        }
        return jsonResult(true, "Component detached. Layers will no longer refresh as a kit component.");
    };

    AEToolbox.tools.adComponentKit.removeSelectedGeneratedComponent = function () {
        return removeArtifactBySelectedLayer();
    };

    AEToolbox.tools.adComponentKit.getState = function () {
        var comp = getComp();
        var selected;
        var i;
        var layer;
        var bounds;
        var textLayerCount = 0;
        var twoDLayerCount = 0;
        var selectedControllerType = null;
        var selectedArtifactInfo = null;
        var data;
        var hasComp = !!comp;
        var selectionCount = 0;
        var messageKey = "tools.adComponentKit.state.noComp";

        if (comp && comp.selectedLayers) {
            selected = comp.selectedLayers;
            selectionCount = selected.length;
        } else {
            selected = [];
        }

        if (selected.length) {
            data = parseMetadata(selected[0]);
            if (data && data.role === "controller") {
                selectedControllerType = data.componentType || null;
            }
            selectedArtifactInfo = findArtifactIdFromSelectedLayers(comp);
        }

        for (i = 0; i < selected.length; i++) {
            layer = selected[i];
            try {
                if (!layer.threeDLayer) {
                    bounds = getLayerVisualBoundsInComp(layer, comp.time);
                    if (isTextLayer(layer)) { textLayerCount++; }
                    if (!layer.parent && !shouldSkipGridLayer(layer) && !hasTransformExpression(layer, "ADBE Position") && !hasTransformExpression(layer, "ADBE Scale")) {
                        twoDLayerCount++;
                    }
                }
            } catch (gridErr) {
            }
        }

        if (!hasComp) {
            messageKey = "tools.adComponentKit.state.noComp";
        } else if (textLayerCount > 0) {
            messageKey = "tools.adComponentKit.state.featureReady";
        } else if (selectionCount > 0) {
            messageKey = "tools.adComponentKit.state.noTextSelection";
        } else {
            messageKey = "tools.adComponentKit.state.noSelection";
        }

        return AEToolbox.stringify({
            ok: true,
            messageKey: messageKey,
            state: {
                hasComp: hasComp,
                activeComp: hasComp ? comp.name : "",
                selectionCount: selectionCount,
                textLayerCount: textLayerCount,
                twoDLayerCount: twoDLayerCount,
                selectedControllerType: selectedControllerType,
                canCreateFeatureStack: hasComp && textLayerCount > 0,
                canCreateIconGrid: hasComp && twoDLayerCount > 0,
                canRefresh: hasComp && !!selectedControllerType,
                canSelectLayers: hasComp && !!selectedControllerType,
                canDetach: hasComp && !!selectedControllerType,
                canRemoveGeneratedComponent: hasComp && !!selectedArtifactInfo
            }
        });
    };

    AEToolbox.tools.adComponentKit.getLayerVisualBoundsInComp = getLayerVisualBoundsInComp;
})();
