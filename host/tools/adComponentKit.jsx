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

    function getLayerVisualBoundsInComp(layer, time) {
        var rect = null;
        var pts;
        var i;
        var p;
        var left = 9999999;
        var top = 9999999;
        var right = -9999999;
        var bottom = -9999999;

        try {
            if (layer.sourceRectAtTime) {
                rect = layer.sourceRectAtTime(time, false);
            }
        } catch (err1) {
            rect = null;
        }

        if (rect && rect.width > 0 && rect.height > 0) {
            pts = [
                [rect.left, rect.top],
                [rect.left + rect.width, rect.top],
                [rect.left + rect.width, rect.top + rect.height],
                [rect.left, rect.top + rect.height]
            ];
        } else {
            pts = [
                [0, 0],
                [layer.width || 0, 0],
                [layer.width || 0, layer.height || 0],
                [0, layer.height || 0]
            ];
        }

        for (i = 0; i < pts.length; i++) {
            try {
                p = layer.toComp(pts[i]);
            } catch (err2) {
                p = pts[i];
            }
            left = Math.min(left, p[0]);
            top = Math.min(top, p[1]);
            right = Math.max(right, p[0]);
            bottom = Math.max(bottom, p[1]);
        }

        if (left === 9999999) {
            left = 0;
            top = 0;
            right = 0;
            bottom = 0;
        }
        return area(left, top, right, bottom);
    }

    function isShapeLayer(layer) {
        try {
            return !!layer.property("ADBE Root Vectors Group");
        } catch (err) {
            return false;
        }
    }

    function getTextVisualBounds2D(layer, time) {
        var rect = layer.sourceRectAtTime(time, false);
        var tr = layer.property("ADBE Transform Group");
        var pos = tr.property("ADBE Position").value;
        var anchor = tr.property("ADBE Anchor Point").value;
        var scale = tr.property("ADBE Scale").value;
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
        return area(left, top, right, bottom);
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
            rot = 0;
        }
        return Math.abs(rot) < 0.001;
    }

    function unionTextBounds2D(layers, comp) {
        var i;
        var b;
        var left = 999999;
        var top = 999999;
        var right = -999999;
        var bottom = -999999;
        for (i = 0; i < layers.length; i++) {
            b = getTextVisualBounds2D(layers[i], comp.time);
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

    function unionOriginalFeatureTextBounds(layers, comp) {
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
            bounds = unionTextBounds2D(layers, comp);
        } else {
            bounds = unionBoundsForLayers(layers, comp);
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

    function centerTextAnchor(layer, time) {
        var tr = layer.property("ADBE Transform Group");
        var anchor = tr ? tr.property("ADBE Anchor Point") : null;
        var rect;
        var newAnchor;
        if (!anchor || !layer.sourceRectAtTime) {
            return;
        }
        rect = layer.sourceRectAtTime(time, false);
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
        if (!layer) {
            return;
        }
        try {
            raw = layer.comment || "";
        } catch (err1) {
            raw = "";
        }
        if (data.role === "sourceLayerBinding" && raw && raw.indexOf(ARTIFACT_METADATA_PREFIX) !== 0) {
            data.previousCommentEncoded = encodeText(raw);
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

    function bindFeatureTextPositionToController(layer, allTextLayers, itemIndex, artifactId) {
        var pos = positionProp(layer);
        var refs = layerRefsExpression(allTextLayers);
        var expressionText;
        if (!pos) {
            return;
        }
        expressionText = [
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

    function unionBoundsForLayers(layers, comp) {
        var i;
        var b;
        var left = 999999;
        var top = 999999;
        var right = -999999;
        var bottom = -999999;
        for (i = 0; i < layers.length; i++) {
            if (!layers[i]) {
                continue;
            }
            b = getLayerVisualBoundsInComp(layers[i], comp.time);
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

    function sortTexts(texts, sortMode, comp) {
        texts.sort(function (a, b) {
            var ba;
            var bb;
            if (sortMode === "timeline") {
                return b.index - a.index;
            }
            ba = getLayerVisualBoundsInComp(a, comp.time);
            bb = getLayerVisualBoundsInComp(b, comp.time);
            return ba.centerY - bb.centerY;
        });
    }

    function layoutFeatureItems(comp, items, backgrounds, p, centerX, centerY) {
        var color = AEToolbox.hexToColorArray(p.fillColor);
        var widths = [];
        var heights = [];
        var totalHeight = 0;
        var i;
        var b;
        var w;
        var h;
        var y;
        var pill;
        var bg;
        for (i = 0; i < items.length; i++) {
            if (!items[i]) {
                widths[i] = 0;
                heights[i] = 0;
                continue;
            }
            setAnchorToVisualCenter(items[i]);
            b = getLayerVisualBoundsInComp(items[i], comp.time);
            w = p.pillWidthMode === "fixed" ? p.fixedWidth : b.width + p.paddingX * 2;
            h = b.height + p.paddingY * 2;
            widths[i] = w;
            heights[i] = h;
            totalHeight += h;
            if (i > 0) {
                totalHeight += p.gap;
            }
        }
        y = centerY - totalHeight / 2;
        for (i = 0; i < items.length; i++) {
            if (!items[i]) {
                continue;
            }
            pill = area(centerX - widths[i] / 2, y, centerX + widths[i] / 2, y + heights[i]);
            bg = backgrounds[i];
            if (bg) {
                updateRectLayer(bg, pill, color, p.cornerRadius);
            }
            moveLayerBoundsCenterTo(items[i], pill.centerX, pill.centerY);
            y += heights[i] + p.gap;
        }
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
                    skipped++;
                } else {
                    texts[texts.length] = selected[i];
                }
            }
        }
        if (!texts.length) {
            return jsonResult(false, "Select one or more text layers first.");
        }
        sortTexts(texts, p.sortMode, comp);
        originalInfo = unionOriginalFeatureTextBounds(texts, comp);
        selectionBounds = originalInfo.bounds;
        warning = originalInfo.warning;
        for (i = 0; i < texts.length; i++) {
            farthestPosition = Math.max(farthestPosition, layerPositionDistanceFromOrigin(texts[i]));
        }
        if (Math.abs(selectionBounds.centerX) < 0.001 && Math.abs(selectionBounds.centerY) < 0.001 && farthestPosition > 50) {
            warning = warning ? warning + " Original center calculation failed." : "Original center calculation failed.";
        }
        for (i = 0; i < texts.length; i++) {
            textBounds[i] = getLayerVisualBoundsInComp(texts[i], comp.time);
            pillWidths[i] = p.pillWidthMode === "fixed" ? p.fixedWidth : textBounds[i].width + p.paddingX * 2;
            pillHeights[i] = textBounds[i].height + p.paddingY * 2;
            totalHeight += pillHeights[i];
            if (i > 0) {
                totalHeight += p.gap;
            }
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
                centerTextAnchor(texts[i], comp.time);

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

    function refreshFeatureStack(comp, ctrl, data) {
        var layers = componentLayers(comp, data.componentId);
        var texts = [];
        var bgs = [];
        var stackLayers = [];
        var stackBounds;
        var parentPairs = [];
        var i;
        var item;
        var p = readFeatureParams(ctrl);
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
                stackLayers[stackLayers.length] = texts[i];
            }
            if (bgs[i]) {
                stackLayers[stackLayers.length] = bgs[i];
            }
        }
        stackBounds = unionBoundsForLayers(stackLayers, comp);
        if (stackBounds.width <= 0 && stackBounds.height <= 0) {
            return 0;
        }
        layoutFeatureItems(comp, texts, bgs, p, stackBounds.centerX, stackBounds.centerY);
        for (i = 0; i < texts.length; i++) {
            if (texts[i] && bgs[i]) {
                parentPairs[parentPairs.length] = {
                    text: texts[i],
                    bg: bgs[i]
                };
            }
        }
        parentBackgroundsToTextLayers(parentPairs, data.artifactId || data.componentId);
        bindFeatureTextPositionsToController(texts, data.artifactId || data.componentId);
        return texts.length;
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
        var skipped = 0;
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
        var layoutResult;
        var warning = "";
        if (!comp) {
            return jsonResult(false, "Open a composition before creating an icon grid.", "\"version\":\"" + activeIconGridVersion + "\",\"functionName\":\"" + ICON_GRID_FUNCTION_NAME + "\",\"file\":\"" + ICON_GRID_FILE + "\"");
        }
        layers = selectedLayers(comp);
        for (i = 0; i < layers.length; i++) {
            if (layers[i].threeDLayer || layers[i].parent || shouldSkipGridLayer(layers[i]) || hasTransformExpression(layers[i], "ADBE Position") || hasTransformExpression(layers[i], "ADBE Scale")) {
                skipped++;
            } else {
                b = getLayerVisualBoundsInComp(layers[i], comp.time);
                if (b.width <= 0 || b.height <= 0) {
                    skipped++;
                } else {
                    scale = getScale2D(layers[i]);
                    gridLayers[gridLayers.length] = layers[i];
                    gridItems[gridItems.length] = {
                        layer: layers[i],
                        bounds: b,
                        scaleX: scale[0],
                        scaleY: scale[1]
                    };
                }
            }
        }
        if (!gridItems.length) {
            return jsonResult(false, "Select one or more 2D layers for the icon grid.", "\"version\":\"" + activeIconGridVersion + "\",\"functionName\":\"" + ICON_GRID_FUNCTION_NAME + "\",\"file\":\"" + ICON_GRID_FILE + "\"");
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
            for (i = 0; i < gridItems.length; i++) {
                centerLayerAnchorToVisualCenter(gridItems[i].layer, comp.time);
                setLayerScaleFromOriginal(gridItems[i].layer, gridItems[i].scaleX, gridItems[i].scaleY, gridItems[i].scaleFactor);
                setLayerLocalPosition(gridItems[i].layer, gridItems[i].targetCompX, gridItems[i].targetCompY);
            }
            for (i = 0; i < gridItems.length; i++) {
                finalBounds = getLayerVisualBoundsInComp(gridItems[i].layer, comp.time);
                gridItems[i].finalCompX = finalBounds.centerX;
                gridItems[i].finalCompY = finalBounds.centerY;
                layoutResult.items[i].finalCompX = finalBounds.centerX;
                layoutResult.items[i].finalCompY = finalBounds.centerY;
            }
            ctrl = createController(comp, "ICON_GRID_CTRL", componentId, "iconGrid", 0, 0, p);
            setLayerArtifactMetadata(ctrl, {
                kind: "iconGrid",
                componentType: "iconGrid",
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
            for (i = 0; i < gridItems.length; i++) {
                setLayerArtifactMetadata(gridItems[i].layer, {
                    kind: "iconGrid",
                    componentType: "iconGrid",
                    artifactId: artifactId,
                    componentId: componentId,
                    role: "sourceLayerBinding",
                    index: i + 1,
                    createdAt: createdAt
                });
                gridItems[i].layer.parent = ctrl;
            }
            for (i = 0; i < gridItems.length; i++) {
                finalBounds = getLayerVisualBoundsInComp(gridItems[i].layer, comp.time);
                gridItems[i].finalCompX = finalBounds.centerX;
                gridItems[i].finalCompY = finalBounds.centerY;
                layoutResult.items[i].finalCompX = finalBounds.centerX;
                layoutResult.items[i].finalCompY = finalBounds.centerY;
            }
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Create icon grid failed: " + err.toString(), "\"version\":\"" + activeIconGridVersion + "\",\"functionName\":\"" + ICON_GRID_FUNCTION_NAME + "\",\"file\":\"" + ICON_GRID_FILE + "\"");
        }
        app.endUndoGroup();
        if (skipped > 0) {
            warning = "Skipped " + skipped + " unsupported, generated, parented, expression-driven, 3D, or zero-size layer(s).";
        }
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

    function refreshIconGrid(comp, ctrl, data) {
        var layers = componentLayers(comp, data.componentId);
        var items = [];
        var i;
        var item;
        var b;
        var scale;
        var gridItems = [];
        var p = readIconParams(ctrl);
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
            b = getLayerVisualBoundsInComp(items[i], comp.time);
            scale = getScale2D(items[i]);
            gridItems[gridItems.length] = {
                layer: items[i],
                bounds: b,
                scaleX: scale[0],
                scaleY: scale[1]
            };
        }
        layoutIconGridLocal(gridItems, p, true);
        return items.length;
    }

    AEToolbox.tools.adComponentKit.refreshSelectedComponent = function () {
        var comp = getComp();
        var selected;
        var ctrl;
        var data;
        var count = 0;
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
        app.beginUndoGroup("AE Toolbox Refresh Component");
        try {
            if (data.componentType === "featureStack") {
                count = refreshFeatureStack(comp, ctrl, data);
            } else if (data.componentType === "iconGrid") {
                count = refreshIconGrid(comp, ctrl, data);
            } else {
                app.endUndoGroup();
                return jsonResult(false, "Unsupported component type: " + data.componentType);
            }
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Refresh component failed: " + err.toString());
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

    AEToolbox.tools.adComponentKit.detachSelectedComponent = function () {
        var comp = getComp();
        var selected;
        var ctrl;
        var data;
        var layers;
        var i;
        if (!comp) {
            return jsonResult(false, "Open a composition before detaching a component.");
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
        app.beginUndoGroup("AE Toolbox Detach Component");
        try {
            layers = componentLayers(comp, data.componentId);
            for (i = 0; i < layers.length; i++) {
                layers[i].layer.parent = null;
                layers[i].layer.comment = "";
            }
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Detach component failed: " + err.toString());
        }
        app.endUndoGroup();
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
            if (isTextLayer(layer) && !layer.threeDLayer) {
                textLayerCount++;
            }
            try {
                if (!layer.threeDLayer && !layer.parent && !shouldSkipGridLayer(layer) && !hasTransformExpression(layer, "ADBE Position") && !hasTransformExpression(layer, "ADBE Scale")) {
                    bounds = getLayerVisualBoundsInComp(layer, comp.time);
                    if (bounds.width > 0 && bounds.height > 0) {
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
