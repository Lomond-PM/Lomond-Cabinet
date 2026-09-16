var AEToolbox = AEToolbox || {};

(function () {
    var U = AEToolbox.Util;
    var MN = AEToolbox.MN;
    var AE = AEToolbox.AE;
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
        addControl(layer, FX.RECT_SIZE_X, rect.width + opt.paddingX * 2, "ADBE Slider Control");
        addControl(layer, FX.RECT_SIZE_Y, rect.height + opt.paddingY * 2, "ADBE Slider Control");
        addControl(layer, FX.ROUNDNESS, opt.roundness, "ADBE Slider Control");

        if (opt.fillMode === "Solid Fill") {
            addControl(layer, FX.FILL_COLOR, opt.fillColor, "ADBE Color Control");
            addControl(layer, FX.FILL_OPACITY, opt.fillOpacity, "ADBE Slider Control");
        } else if (opt.fillMode === "Gradient Fill") {
            addControl(layer, FX.FILL_OPACITY, opt.fillOpacity, "ADBE Slider Control");
        }

        if (opt.strokeMode === "Solid Stroke") {
            addControl(layer, FX.STROKE_COLOR, opt.strokeColor, "ADBE Color Control");
            addControl(layer, FX.STROKE_WIDTH, opt.strokeWidth, "ADBE Slider Control");
            addControl(layer, FX.STROKE_OPACITY, opt.strokeOpacity, "ADBE Slider Control");
        } else if (opt.strokeMode === "Gradient Stroke") {
            addControl(layer, FX.STROKE_WIDTH, opt.strokeWidth, "ADBE Slider Control");
            addControl(layer, FX.STROKE_OPACITY, opt.strokeOpacity, "ADBE Slider Control");
        }

        if (opt.fillMode === "Gradient Fill" || opt.strokeMode === "Gradient Stroke") {
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var w = rect.width + opt.paddingX * 2;
            addControl(layer, FX.GRADIENT_START, [cx - w / 2, cy], "ADBE Point Control");
            addControl(layer, FX.GRADIENT_END, [cx + w / 2, cy], "ADBE Point Control");
        }
    }

    function bindGradientGraphic(item, isFill, opacityDefault) {
        if (!item) {
            fail("TBB_EXECUTION_FAILED", "Gradient property could not be created.");
        }

        var opacityProp = U.prop(item, isFill ? MN.FILL_OPACITY : MN.STROKE_OPACITY);
        var widthProp = isFill ? null : U.prop(item, MN.STROKE_WIDTH);
        var startProp = U.prop(item, MN.GRAD_START);
        var endProp = U.prop(item, MN.GRAD_END);

        strictValue(opacityProp, opacityDefault);

        if (isFill) {
            strictExpression(opacityProp, U.lines([
                "effect(\"" + FX.FILL_OPACITY + "\")(1);"
            ]));
        } else {
            strictExpression(widthProp, "effect(\"" + FX.STROKE_WIDTH + "\")(1);");
            strictExpression(opacityProp, U.lines([
                "effect(\"" + FX.STROKE_OPACITY + "\")(1);"
            ]));
        }

        strictExpression(startProp, U.lines([
            "var p = effect(\"" + FX.GRADIENT_START + "\")(1);",
            "[p[0], p[1]];"
        ]));

        strictExpression(endProp, U.lines([
            "var p = effect(\"" + FX.GRADIENT_END + "\")(1);",
            "[p[0], p[1]];"
        ]));
    }

    function bindSolidFill(fill, opt) {
        var fillColor = U.prop(fill, MN.FILL_COLOR);
        var fillOpacity = U.prop(fill, MN.FILL_OPACITY);
        strictColor(fillColor, opt.fillColor);
        strictValue(fillOpacity, opt.fillOpacity);

        strictExpression(fillColor, U.lines([
            "var c = effect(\"" + FX.FILL_COLOR + "\")(1);",
            "[c[0], c[1], c[2], 1];"
        ]));

        strictExpression(fillOpacity, U.lines([
            "effect(\"" + FX.FILL_OPACITY + "\")(1);"
        ]));
    }

    function bindSolidStroke(stroke, opt) {
        var strokeColor = U.prop(stroke, MN.STROKE_COLOR);
        var strokeWidth = U.prop(stroke, MN.STROKE_WIDTH);
        var strokeOpacity = U.prop(stroke, MN.STROKE_OPACITY);
        strictColor(strokeColor, opt.strokeColor);
        strictValue(strokeWidth, opt.strokeWidth);
        strictValue(strokeOpacity, opt.strokeOpacity);

        strictExpression(strokeColor, U.lines([
            "var c = effect(\"" + FX.STROKE_COLOR + "\")(1);",
            "[c[0], c[1], c[2], 1];"
        ]));

        strictExpression(strokeWidth, "effect(\"" + FX.STROKE_WIDTH + "\")(1);");

        strictExpression(strokeOpacity, U.lines([
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

        strictValue(rectSize, [rect.width + opt.paddingX * 2, rect.height + opt.paddingY * 2]);
        strictValue(rectPos, [rect.left + rect.width / 2, rect.top + rect.height / 2]);
        strictValue(rectRound, opt.roundness);

        strictExpression(rectSize, U.lines([
            "var x = effect(\"" + FX.RECT_SIZE_X + "\")(1);",
            "var y = effect(\"" + FX.RECT_SIZE_Y + "\")(1);",
            "[x, y];"
        ]));

        strictExpression(rectRound, "effect(\"" + FX.ROUNDNESS + "\")(1);");

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

    // Private TBB contract. These are Host conversions, never expression APIs or affine substitutes.
    var TIME_EPSILON = 1e-9;
    var VALUE_EPSILON = 1e-4;

    function fail(code, detail) {
        throw new Error(code + ": " + detail);
    }

    function finite(value) {
        return typeof value === "number" && isFinite(value);
    }

    function point2(value, code, detail) {
        if (!value || typeof value !== "object" || typeof value.length !== "number" || value.length < 2 || !finite(value[0]) || !finite(value[1])) {
            fail(code, detail);
        }
        return [value[0], value[1]];
    }

    function measurementTime(comp) {
        var current;
        try {
            current = comp.time;
        } catch (error) {
            fail("TBB_TIME_MISMATCH", "comp.time is unavailable.");
        }
        if (!finite(current)) {
            fail("TBB_TIME_MISMATCH", "comp.time must be finite.");
        }
        return current;
    }

    function checkTime(comp, time) {
        if (!finite(time) || Math.abs(time - measurementTime(comp)) > TIME_EPSILON) {
            fail("TBB_TIME_MISMATCH", "Measurement requires the current comp.time.");
        }
    }

    function convert(comp, time, layer, method, input, code) {
        checkTime(comp, time);
        var p = point2(input, "TBB_INVALID_SOURCE_GEOMETRY", "Invalid conversion input.");
        var result;
        try {
            if (!layer || typeof layer[method] !== "function") {
                throw new Error("Host method unavailable.");
            }
            result = layer[method](p);
        } catch (error) {
            fail(code, method + " unavailable or threw.");
        }
        checkTime(comp, time);
        return point2(result, "TBB_INVALID_CONVERSION_RETURN", method + " must return at least two finite numbers.");
    }

    function validRect(rect) {
        if (!rect || !finite(rect.left) || !finite(rect.top) || !finite(rect.width) || !finite(rect.height) || rect.width <= 0 || rect.height <= 0 || !finite(rect.left + rect.width) || !finite(rect.top + rect.height)) {
            fail("TBB_INVALID_SOURCE_GEOMETRY", "Expected finite, positive source geometry.");
        }
        return {left: rect.left, top: rect.top, width: rect.width, height: rect.height};
    }

    function sourceGeometry(layer, kind, comp, time) {
        checkTime(comp, time);
        var rect;
        var unavailable = false;
        try {
            if (typeof layer.sourceRectAtTime !== "function") {
                unavailable = true;
            } else {
                rect = layer.sourceRectAtTime(time, false);
                unavailable = rect === null || typeof rect === "undefined";
            }
        } catch (error) {
            unavailable = true;
        }
        checkTime(comp, time);
        // Only ordinary footage with unavailable sourceRect may use source dimensions.
        // A returned malformed/zero rect is invalid; Text/Shape dimensions cannot hide it.
        if (unavailable && kind === "AV") {
            rect = {left: 0, top: 0, width: layer.width, height: layer.height};
        }
        return validRect(rect);
    }

    function staticValue(group, name, dimensions) {
        var p = U.prop(group, name);
        if (!p || p.numKeys !== 0 || p.expressionEnabled === true || p.expression || p.dimensionsSeparated === true) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Static, unseparated Transform required: " + name);
        }
        var value;
        try {
            value = p.value;
        } catch (error) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Unreadable Transform: " + name);
        }
        if (dimensions === 2) {
            return point2(value, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Nonfinite Transform: " + name);
        }
        if (!finite(value)) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Nonfinite Transform: " + name);
        }
        return value;
    }

    function ordinaryKind(layer, comp) {
        var identity = layerIdentity(layer, false, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE");
        if (identity.compId !== compIdentity(comp, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE") || layer.threeDLayer !== false || layer.locked !== false || layer.adjustmentLayer !== false) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "An unlocked ordinary 2D layer in this comp is required.");
        }
        if (layer.matchName === "ADBE Text Layer" && U.prop(layer, MN.TEXT_PROPS)) {
            return "TEXT";
        }
        if (layer.matchName === "ADBE Vector Layer" && U.prop(layer, MN.ROOT_VECTORS)) {
            return "SHAPE";
        }
        if (layer.matchName === "ADBE AV Layer" && layer.nullLayer === true) {
            return "NULL";
        }
        if (layer.matchName === "ADBE AV Layer" && typeof FootageItem !== "undefined" && layer.source instanceof FootageItem && layer.collapseTransformation === false) {
            return "AV";
        }
        fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Layer type/collapse has not been admitted for M2.");
    }

    function snapshotTransform(layer) {
        var tr = U.prop(layer, MN.TRANSFORM);
        var result = {
            anchor: staticValue(tr, MN.ANCHOR, 2),
            position: staticValue(tr, MN.POSITION, 2),
            scale: staticValue(tr, MN.SCALE, 2),
            rotation: staticValue(tr, MN.ROT_Z, 1)
        };
        if (result.scale[0] <= 0 || result.scale[1] <= 0 || (result.rotation !== 0 && result.scale[0] !== result.scale[1])) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "M2 requires positive Scale; combined nonuniform Scale and Rotation is unverified.");
        }
        return result;
    }

    function canonicalShape(layer) {
        var root = U.prop(layer, MN.ROOT_VECTORS);
        var group = root && root.numProperties === 1 ? root.property(1) : null;
        var tr = U.prop(group, "ADBE Vector Transform Group");
        var vectors = U.prop(group, MN.VECTORS_GROUP);
        if (!group || group.matchName !== MN.VECTOR_GROUP || !vectors) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "M2 Shape requires one canonical rectangle group.");
        }
        var a = staticValue(tr, "ADBE Vector Anchor", 2);
        var p = staticValue(tr, "ADBE Vector Position", 2);
        var s = staticValue(tr, "ADBE Vector Scale", 2);
        if (a[0] !== 0 || a[1] !== 0 || p[0] !== 0 || p[1] !== 0 || s[0] !== 100 || s[1] !== 100 || staticValue(tr, "ADBE Vector Rotation", 1) !== 0 || staticValue(tr, "ADBE Vector Skew", 1) !== 0) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Nonidentity Shape group Transform is unverified.");
        }
        var rectangles = 0;
        var i;
        for (i = 1; i <= vectors.numProperties; i++) {
            var item = vectors.property(i);
            if (item.matchName === MN.RECT) {
                rectangles++;
            } else if (item.matchName !== MN.FILL && item.matchName !== MN.STROKE) {
                fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Nested/complex Shape geometry is unverified.");
            }
        }
        if (rectangles !== 1) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Exactly one rectangle is required.");
        }
    }

    function layerVisualBoundsInComp(comp, layer, rect, time) {
        var points = [[rect.left, rect.top], [rect.left + rect.width, rect.top], [rect.left + rect.width, rect.top + rect.height], [rect.left, rect.top + rect.height]];
        var left, right, top, bottom;
        var i;
        for (i = 0; i < points.length; i++) {
            var p = convert(comp, time, layer, "sourcePointToComp", points[i], "TBB_SOURCE_TO_COMP_FAILED");
            left = i === 0 ? p[0] : Math.min(left, p[0]);
            right = i === 0 ? p[0] : Math.max(right, p[0]);
            top = i === 0 ? p[1] : Math.min(top, p[1]);
            bottom = i === 0 ? p[1] : Math.max(bottom, p[1]);
        }
        return validRect({left: left, top: top, width: right - left, height: bottom - top});
    }

    function planLayer(comp, source, opt, time) {
        // Copy scalar identities before measurement; operation references remain separate.
        var sourceIdentity = layerIdentity(source, false, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE");
        var kind = ordinaryKind(source, comp);
        if (kind === "NULL") {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Null is a parent representative, not visual input.");
        }
        var snapshot = snapshotTransform(source);
        var parent = parentReference(source, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE");
        var parentIdentity = layerIdentity(parent, true, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE");
        if (parent) {
            var parentKind = ordinaryKind(parent, comp);
            var parentSnapshot = snapshotTransform(parent);
            if (kind !== "TEXT" || parentReference(parent, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE") !== null || (parentKind !== "NULL" && parentKind !== "TEXT") || parentSnapshot.scale[0] !== 100 || parentSnapshot.scale[1] !== 100 || parentSnapshot.rotation !== 0) {
                fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "M2 admits one static translation-only Null/Text parent for Text.");
            }
        }
        if (kind === "SHAPE") {
            canonicalShape(source);
        }
        if (kind !== "TEXT" && (snapshot.rotation !== 0 || snapshot.scale[0] !== 100 || snapshot.scale[1] !== 100)) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "M2 visual representatives require Scale 100 and Rotation 0.");
        }
        var rect = sourceGeometry(source, kind, comp, time);
        var center = [rect.left + rect.width / 2, rect.top + rect.height / 2];
        var compCenter;
        var position;
        if (kind === "TEXT") {
            compCenter = convert(comp, time, source, "sourcePointToComp", center, "TBB_SOURCE_TO_COMP_FAILED");
            position = parent ? convert(comp, time, parent, "compPointToSource", compCenter, "TBB_COMP_TO_PARENT_FAILED") : compCenter.slice(0);
        } else {
            var bounds = layerVisualBoundsInComp(comp, source, rect, time);
            compCenter = point2([bounds.left + bounds.width / 2, bounds.top + bounds.height / 2], "TBB_INVALID_SOURCE_GEOMETRY", "Invalid AABB center.");
            position = compCenter.slice(0);
            rect = {left: -bounds.width / 2, top: -bounds.height / 2, width: bounds.width, height: bounds.height};
            center = [0, 0];
        }
        if (!finite(rect.width + opt.paddingX * 2) || !finite(rect.height + opt.paddingY * 2)) {
            fail("TBB_INVALID_SOURCE_GEOMETRY", "Invalid padded size.");
        }
        var plan = {source: source, sourceIdentity: sourceIdentity, kind: kind, time: time, parent: parent, parentIdentity: parentIdentity,
            snapshot: snapshot, rect: rect, localCenter: center, compVisualCenter: compCenter,
            targetPosition: position, targetPositionSpace: parent ? "PARENT_LAYER" : "COMP",
            startTime: source.startTime, inPoint: source.inPoint, outPoint: source.outPoint,
            name: source.name + "_BG"};
        if (!finite(plan.startTime) || !finite(plan.inPoint) || !finite(plan.outPoint) || plan.outPoint <= plan.inPoint) {
            fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Invalid layer timing.");
        }
        checkTime(comp, time);
        return plan;
    }

    function validIdentityId(value) {
        return finite(value) && value > 0 && Math.floor(value) === value;
    }

    function compIdentity(comp, code) {
        var id;
        try {
            id = comp.id;
        } catch (error) {
            fail(code, "Unreadable containingComp identity.");
        }
        if (!validIdentityId(id)) {
            fail(code, "Invalid containingComp identity.");
        }
        return id;
    }

    function layerIdentity(layer, allowNull, code) {
        if (layer === null && allowNull) {
            return null;
        }
        var id, comp;
        try {
            id = layer.id;
            comp = layer.containingComp;
        } catch (error) {
            fail(code, "Unreadable layer identity.");
        }
        if (!validIdentityId(id)) {
            fail(code, "Invalid layer identity.");
        }
        return {layerId: id, compId: compIdentity(comp, code)};
    }

    function parentReference(layer, code) {
        try {
            return layer.parent;
        } catch (error) {
            fail(code, "Unreadable parent reference.");
        }
    }

    function sameIdentity(current, expected) {
        // AE 26.0 mis-evaluates the former ungrouped mixed ||/&& null-parent chain.
        // Only an explicit null denotes no parent; missing/invalid reads fail above.
        if (current === null) {
            return expected === null;
        }
        if (expected === null) {
            return false;
        }
        return current.layerId === expected.layerId && current.compId === expected.compId;
    }

    function strictValue(p, value) {
        if (!p || typeof p.setValue !== "function") {
            fail("TBB_EXECUTION_FAILED", "Required property is not writable.");
        }
        p.setValue(value);
        var actual = p.value;
        var count = typeof value === "number" ? 0 : value.length;
        if (!count) {
            if (!finite(actual) || !finite(value) || Math.abs(actual - value) > VALUE_EPSILON) {
                fail("TBB_EXECUTION_FAILED", "Property write did not take effect.");
            }
        } else {
            if (!actual || actual.length !== count) {
                fail("TBB_EXECUTION_FAILED", "Property dimensions changed.");
            }
            for (var i = 0; i < count; i++) {
                if (!finite(actual[i]) || !finite(value[i]) || Math.abs(actual[i] - value[i]) > VALUE_EPSILON) {
                    fail("TBB_EXECUTION_FAILED", "Property write did not take effect.");
                }
            }
        }
    }

    function strictExpression(p, expression) {
        if (!p || !p.canSetExpression) {
            fail("TBB_EXECUTION_FAILED", "Required expression property is unavailable.");
        }
        p.expression = expression;
        if (p.expression !== expression || p.expressionEnabled !== true || p.expressionError) {
            fail("TBB_EXECUTION_FAILED", "Expression installation failed.");
        }
    }

    function strictColor(p, color) {
        strictValue(p, [color[0], color[1], color[2], 1]);
    }

    function addControl(layer, name, value, type) {
        var fx = U.prop(layer, MN.EFFECTS);
        var item = fx.addProperty(type);
        item.name = name;
        strictValue(item.property(1), value);
    }

    function applyPlan(comp, plan, opt) {
        // No decisive conversion or source snapshot reads after the first project write.
        var bg = comp.layers.addShape();
        bg.name = AE.uniqueLayerName(comp, plan.name);
        if (plan.source) {
            bg.startTime = plan.startTime;
            bg.inPoint = plan.inPoint;
            bg.outPoint = plan.outPoint;
        }
        bg.threeDLayer = false;
        if (plan.targetPositionSpace === "PARENT_LAYER") {
            bg.setParentWithJump(plan.parent);
        }
        if (!sameIdentity(layerIdentity(parentReference(bg, "TBB_EXECUTION_FAILED"), true, "TBB_EXECUTION_FAILED"), plan.parentIdentity) || bg.threeDLayer !== false || (plan.targetPositionSpace === "COMP" && bg.parent)) {
            fail("TBB_EXECUTION_FAILED", "Destination Position space does not match the plan.");
        }
        var tr = U.prop(bg, MN.TRANSFORM);
        if (plan.kind === "TEXT") {
            strictValue(U.prop(tr, MN.SCALE), AE.fitValueToTarget([plan.snapshot.scale[0], plan.snapshot.scale[1], 100], U.prop(tr, MN.SCALE)));
            strictValue(U.prop(tr, MN.ROT_Z), plan.snapshot.rotation);
        }
        strictValue(U.prop(tr, MN.ANCHOR), AE.fitValueToTarget(plan.localCenter, U.prop(tr, MN.ANCHOR)));
        strictValue(U.prop(tr, MN.POSITION), AE.fitValueToTarget(plan.targetPosition, U.prop(tr, MN.POSITION)));
        addControls(bg, plan.rect, opt);
        buildShapeContents(bg, plan.rect, opt);
        if (plan.source) {
            bg.moveAfter(plan.source);
            // Separate AE compensating reparent; it must not mask an earlier wrong-space Position.
            bg.parent = plan.source;
            if (!sameIdentity(layerIdentity(parentReference(bg, "TBB_EXECUTION_FAILED"), false, "TBB_EXECUTION_FAILED"), plan.sourceIdentity)) {
                fail("TBB_EXECUTION_FAILED", "Final source parent assignment failed.");
            }
            point2(U.prop(tr, MN.POSITION).value, "TBB_EXECUTION_FAILED", "Nonfinite Position after parenting.");
            point2(U.prop(tr, MN.SCALE).value, "TBB_EXECUTION_FAILED", "Nonfinite Scale after parenting.");
            if (!finite(U.prop(tr, MN.ROT_Z).value)) {
                fail("TBB_EXECUTION_FAILED", "Nonfinite Rotation after parenting.");
            }
        }
        return bg;
    }

    AEToolbox.tools.textBackgroundBox.create = function (paramsJson) {
        var comp = AE.getActiveComp();
        if (!comp) {
            return AEToolbox.toJson({ok: false, message: "Error: Please open or select a composition first.", selectionLabel: "No comp"});
        }
        var opt;
        try {
            opt = sanitizeOptions(AEToolbox.parseJson(paramsJson));
        } catch (parseError) {
            return AEToolbox.toJson({ok: false, message: "Error: Invalid parameters JSON.", selectionLabel: "Invalid params"});
        }
        var selectedLayers = comp.selectedLayers || [];
        var plans = [];
        var time;
        var i;
        // All selected members are preflighted before even opening the undo group.
        try {
            time = measurementTime(comp);
            checkTime(comp, time);
            if (!comp.layers || typeof comp.layers.addShape !== "function") {
                fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Shape creation is unavailable.");
            }
            var optionNumbers = [opt.paddingX, opt.paddingY, opt.roundness, opt.strokeWidth, opt.fillOpacity, opt.strokeOpacity];
            for (i = 0; i < optionNumbers.length; i++) {
                if (!finite(optionNumbers[i])) {
                    fail("TBB_INVALID_SOURCE_GEOMETRY", "Nonfinite geometry/style parameter.");
                }
            }
            for (i = 0; i < selectedLayers.length; i++) {
                plans[plans.length] = planLayer(comp, selectedLayers[i], opt, time);
            }
            if (!selectedLayers.length) {
                var center = point2([comp.width / 2, comp.height / 2], "TBB_INVALID_SOURCE_GEOMETRY", "Invalid comp size.");
                opt.paddingX = 0;
                opt.paddingY = 0;
                opt.roundness = 15;
                plans[0] = {name: "Background Rounded Rectangle", kind: "DEFAULT", source: null, sourceIdentity: null, parent: null, parentIdentity: null, targetPositionSpace: "COMP", targetPosition: center,
                    localCenter: [0, 0], rect: {left: -50, top: -50, width: 100, height: 100}};
            }
            for (i = 0; i < plans.length; i++) {
                var plan = plans[i];
                if (plan.source && (!sameIdentity(layerIdentity(plan.source, false, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE"), plan.sourceIdentity) || !sameIdentity(layerIdentity(parentReference(plan.source, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE"), true, "TBB_UNSUPPORTED_COORDINATE_ENVELOPE"), plan.parentIdentity))) {
                    fail("TBB_UNSUPPORTED_COORDINATE_ENVELOPE", "Source identity/parent changed during preflight.");
                }
            }
            checkTime(comp, time);
        } catch (preflightError) {
            return AEToolbox.toJson({ok: false, message: "TBB preflight: " + preflightError.toString(), count: 0, selectionLabel: selectedLayers.length + " layer(s)"});
        }
        var created = 0;
        var error = null;
        var began = false;
        try {
            app.beginUndoGroup("Create Background Rounded Rectangle");
            began = true;
            for (i = 0; i < plans.length; i++) {
                applyPlan(comp, plans[i], opt);
                created++;
            }
        } catch (executionError) {
            error = executionError;
        } finally {
            if (began) {
                app.endUndoGroup();
            }
        }
        if (error) {
            return AEToolbox.toJson({ok: false, message: "TBB_EXECUTION_FAILED: Created " + created + " complete background(s); partial changes may remain. " + error.toString(), count: created,
                selectionLabel: selectedLayers.length ? selectedLayers.length + " layer(s)" : "No selection"});
        }
        if (!selectedLayers.length) {
            return AEToolbox.toJson({ok: true, messageKey: "tools.textBackgroundBox.status.noLayerSelected", message: "Created default 100x100 rounded rectangle.", count: created, selectionLabel: "Default 100x100"});
        }
        return AEToolbox.toJson({ok: true, messageKey: "tools.textBackgroundBox.status.created", message: "Created " + created + " background rounded rectangle(s).", count: created, selectionLabel: selectedLayers.length + " layer(s)"});
    };
})();
