var AEToolbox = AEToolbox || {};

(function () {
    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.shapeAdd = AEToolbox.tools.shapeAdd || {};

    var TOOL = AEToolbox.tools.shapeAdd;
    var SHAPE_LAYER_REQUIRED = "请选择形状图层";
    var rememberedTarget = null;

    var ITEMS = [
        { label: "组", key: "group", matchName: "ADBE Vector Group" },
        { label: "矩形", key: "rectangle", matchName: "ADBE Vector Shape - Rect" },
        { label: "椭圆", key: "ellipse", matchName: "ADBE Vector Shape - Ellipse" },
        { label: "多边星形", key: "star", matchName: "ADBE Vector Shape - Star" },
        { label: "路径", key: "path", matchName: "ADBE Vector Shape - Group" },
        { label: "填充", key: "fill", matchName: "ADBE Vector Graphic - Fill" },
        { label: "描边", key: "stroke", matchName: "ADBE Vector Graphic - Stroke" },
        { label: "渐变填充", key: "gradientFill", matchName: "ADBE Vector Graphic - G-Fill" },
        { label: "渐变描边", key: "gradientStroke", matchName: "ADBE Vector Graphic - G-Stroke" },
        { label: "合并路径", key: "mergePaths", matchName: "ADBE Vector Filter - Merge" },
        { label: "位移路径", key: "offsetPaths", matchName: "ADBE Vector Filter - Offset" },
        { label: "收缩和膨胀", key: "puckerBloat", matchName: "ADBE Vector Filter - PB" },
        { label: "中继器", key: "repeater", matchName: "ADBE Vector Filter - Repeater" },
        { label: "圆角", key: "roundCorners", matchName: "ADBE Vector Filter - RC" },
        { label: "修剪路径", key: "trimPaths", matchName: "ADBE Vector Filter - Trim" },
        { label: "扭转", key: "twist", matchName: "ADBE Vector Filter - Twist" },
        { label: "摆动路径", key: "wigglePaths", matchName: "ADBE Vector Filter - Roughen" },
        { label: "摆动变换", key: "wiggleTransform", matchName: "ADBE Vector Filter - Wiggler" },
        { label: "Z 字形", key: "zigZag", matchName: "ADBE Vector Filter - Zigzag" }
    ];

    function jsonResult(ok, canAdd, message, targetLabel, extra) {
        var s = "{\"ok\":" + (ok ? "true" : "false") +
            ",\"canAdd\":" + (canAdd ? "true" : "false") +
            ",\"message\":\"" + AEToolbox.jsonEscape(message || "") + "\"" +
            ",\"targetLabel\":\"" + AEToolbox.jsonEscape(targetLabel || "") + "\"";
        if (extra) {
            s += "," + extra;
        }
        return s + "}";
    }

    function activeCompJsonResult(ok, canAdd, message, targetLabel, comp, extra) {
        var more = "\"hasComp\":" + (comp ? "true" : "false");
        if (extra) {
            more += "," + extra;
        }
        return jsonResult(ok, canAdd, message, targetLabel, more);
    }

    function compKey(comp) {
        try {
            if (comp && comp.id !== undefined) {
                return String(comp.id);
            }
        } catch (err1) {
        }
        try {
            return String(comp.name);
        } catch (err2) {
        }
        return "";
    }

    function getComp() {
        var comp = app.project && app.project.activeItem;
        return comp && comp instanceof CompItem ? comp : null;
    }

    function getItemByKeyOrMatchName(key, matchName) {
        var i;
        for (i = 0; i < ITEMS.length; i++) {
            if (ITEMS[i].key === key || ITEMS[i].matchName === matchName) {
                return ITEMS[i];
            }
        }
        return {
            label: key || matchName || "Item",
            key: key || "",
            matchName: matchName || ""
        };
    }

    function isShapeLayer(layer) {
        try {
            return !!(layer && layer.property("ADBE Root Vectors Group"));
        } catch (err) {
            return false;
        }
    }

    function rootVectors(layer) {
        try {
            return layer.property("ADBE Root Vectors Group");
        } catch (err) {
            return null;
        }
    }

    function vectorsFromGroup(group) {
        try {
            return group.property("ADBE Vectors Group");
        } catch (err) {
            return null;
        }
    }

    function isUsableTarget(target) {
        try {
            return !!(target && target.numProperties !== undefined && target.canAddProperty);
        } catch (err) {
            return false;
        }
    }

    function getSelectedShapeLayers(comp) {
        var layers = comp.selectedLayers || [];
        var out = [];
        var i;
        for (i = 0; i < layers.length; i++) {
            if (isShapeLayer(layers[i])) {
                out[out.length] = layers[i];
            }
        }
        return out;
    }

    function findNearestShapeTarget(prop) {
        var cur = prop;
        var vectors;
        while (cur) {
            try {
                if (cur.matchName === "ADBE Vector Group") {
                    vectors = vectorsFromGroup(cur);
                    if (isUsableTarget(vectors)) {
                        return {
                            target: vectors,
                            label: "Group: " + cur.name,
                            group: cur
                        };
                    }
                }
                if (cur.matchName === "ADBE Root Vectors Group" && isUsableTarget(cur)) {
                    return {
                        target: cur,
                        label: "Root Contents",
                        group: null
                    };
                }
                cur = cur.propertyGroup();
            } catch (err) {
                cur = null;
            }
        }
        return null;
    }

    function findExplicitTarget(comp) {
        var props = comp.selectedProperties || [];
        var i;
        var target;
        var rootTarget = null;
        for (i = 0; i < props.length; i++) {
            target = findNearestShapeTarget(props[i]);
            if (target && target.group) {
                return target;
            }
            if (target && !rootTarget) {
                rootTarget = target;
            }
        }
        return rootTarget;
    }

    function isSelectedProperty(prop) {
        try {
            return !!(prop && prop.selected);
        } catch (err) {
            return false;
        }
    }

    function propertyTreeHasSelection(prop) {
        var i;
        var child;
        if (!prop) {
            return false;
        }
        if (isSelectedProperty(prop)) {
            return true;
        }
        try {
            for (i = 1; i <= prop.numProperties; i++) {
                child = prop.property(i);
                if (propertyTreeHasSelection(child)) {
                    return true;
                }
            }
        } catch (err) {
        }
        return false;
    }

    function findSelectedGroupInVectors(vectors) {
        var i;
        var prop;
        var nested;
        var groupVectors;
        if (!vectors) {
            return null;
        }
        try {
            for (i = 1; i <= vectors.numProperties; i++) {
                prop = vectors.property(i);
                if (!prop) {
                    continue;
                }
                if (prop.matchName === "ADBE Vector Group") {
                    groupVectors = vectorsFromGroup(prop);
                    nested = findSelectedGroupInVectors(groupVectors);
                    if (nested) {
                        return nested;
                    }
                    if (isSelectedProperty(prop) || propertyTreeHasSelection(prop)) {
                        if (isUsableTarget(groupVectors)) {
                            return {
                                target: groupVectors,
                                label: "Group: " + prop.name,
                                group: prop
                            };
                        }
                    }
                }
            }
        } catch (err) {
        }
        return null;
    }

    function findSelectedGroupTarget(selectedShapeLayers) {
        var i;
        var target;
        var root;
        for (i = 0; i < selectedShapeLayers.length; i++) {
            root = rootVectors(selectedShapeLayers[i]);
            target = findSelectedGroupInVectors(root);
            if (target) {
                target.layerIndex = selectedShapeLayers[i].index;
                return target;
            }
        }
        return null;
    }

    function selectedLayersIncludeIndex(layers, layerIndex) {
        var i;
        if (!layerIndex) {
            return false;
        }
        for (i = 0; i < layers.length; i++) {
            if (layers[i].index === layerIndex) {
                return true;
            }
        }
        return false;
    }

    function rememberGroup(comp, group, layerIndex) {
        rememberedTarget = {
            compKey: compKey(comp),
            group: group,
            layerIndex: layerIndex || 0,
            label: "Group: " + group.name
        };
    }

    function clearRememberedTarget() {
        rememberedTarget = null;
    }

    function getRememberedTarget(comp, selectedShapeLayers) {
        var vectors;
        if (!rememberedTarget || rememberedTarget.compKey !== compKey(comp)) {
            return null;
        }
        if (selectedShapeLayers.length > 1) {
            clearRememberedTarget();
            return null;
        }
        if (selectedShapeLayers.length === 1 && !selectedLayersIncludeIndex(selectedShapeLayers, rememberedTarget.layerIndex)) {
            clearRememberedTarget();
            return null;
        }
        try {
            vectors = vectorsFromGroup(rememberedTarget.group);
            if (isUsableTarget(vectors)) {
                return {
                    targets: [{
                        target: vectors,
                        label: rememberedTarget.label,
                        layerIndex: rememberedTarget.layerIndex
                    }],
                    targetLabel: rememberedTarget.label,
                    source: "remembered"
                };
            }
        } catch (err) {
        }
        clearRememberedTarget();
        return null;
    }

    function resolveTargets(comp) {
        var selectedShapeLayers = getSelectedShapeLayers(comp);
        var selectedGroupTarget = findSelectedGroupTarget(selectedShapeLayers);
        var explicitTarget = findExplicitTarget(comp);
        var remembered;
        var targets = [];
        var i;
        var root;

        if (selectedGroupTarget) {
            rememberGroup(comp, selectedGroupTarget.group, selectedGroupTarget.layerIndex);
            return {
                targets: [{
                    target: selectedGroupTarget.target,
                    label: selectedGroupTarget.label,
                    layerIndex: selectedGroupTarget.layerIndex
                }],
                targetLabel: selectedGroupTarget.label,
                source: "selectedGroup"
            };
        }

        if (explicitTarget) {
            if (explicitTarget.group && selectedShapeLayers.length === 1) {
                rememberGroup(comp, explicitTarget.group, selectedShapeLayers[0].index);
            } else if (!explicitTarget.group) {
                clearRememberedTarget();
            }
            return {
                targets: [{
                    target: explicitTarget.target,
                    label: explicitTarget.label,
                    layerIndex: selectedShapeLayers.length === 1 ? selectedShapeLayers[0].index : 0
                }],
                targetLabel: explicitTarget.label,
                source: "selection"
            };
        }

        remembered = getRememberedTarget(comp, selectedShapeLayers);
        if (remembered) {
            return remembered;
        }

        if (selectedShapeLayers.length > 0) {
            clearRememberedTarget();
            for (i = 0; i < selectedShapeLayers.length; i++) {
                root = rootVectors(selectedShapeLayers[i]);
                if (isUsableTarget(root)) {
                    targets[targets.length] = {
                        target: root,
                        label: "Root Contents",
                        layerIndex: selectedShapeLayers[i].index
                    };
                }
            }
            return {
                targets: targets,
                targetLabel: targets.length > 1 ? targets.length + " Root Contents" : "Root Contents",
                source: "layers"
            };
        }

        return {
            targets: [],
            targetLabel: "",
            source: "none"
        };
    }

    function setSelectedProperty(prop) {
        try {
            prop.selected = true;
        } catch (err) {
        }
    }

    function clearSelectedProperties(comp) {
        var props = comp.selectedProperties || [];
        var i;
        for (i = 0; i < props.length; i++) {
            try {
                props[i].selected = false;
            } catch (err) {
            }
        }
    }

    function clearSelectedLayers(comp) {
        var layers = comp.selectedLayers || [];
        var i;
        for (i = 0; i < layers.length; i++) {
            try {
                layers[i].selected = false;
            } catch (err) {
            }
        }
    }

    function revealCreatedProperties(comp, createdInfos) {
        var i;
        var layer;
        if (!createdInfos || !createdInfos.length) {
            return;
        }
        clearSelectedProperties(comp);
        clearSelectedLayers(comp);
        for (i = 0; i < createdInfos.length; i++) {
            try {
                if (createdInfos[i].layerIndex) {
                    layer = comp.layer(createdInfos[i].layerIndex);
                    if (layer) {
                        layer.selected = true;
                    }
                }
            } catch (layerErr) {
            }
        }
        for (i = 0; i < createdInfos.length; i++) {
            try {
                setSelectedProperty(createdInfos[i].prop);
            } catch (propErr) {
            }
        }
    }

    function executeRevealCommand(commandId) {
        try {
            app.executeCommand(commandId);
            return true;
        } catch (err) {
        }
        return false;
    }

    function revealCreatedPropertiesInTimeline(comp, createdInfos) {
        revealCreatedProperties(comp, createdInfos);

        // AE has no public scripting API for twirling timeline property groups open.
        // Avoid command 2771 (Reveal All Modified Properties): it switches the
        // timeline into modified-only display and can collapse existing groups.
        // Command 2536 (Reveal in Timeline) is a lighter best-effort locator.
        executeRevealCommand(2536);

        // Restore the newly-created property selection after the reveal command.
        revealCreatedProperties(comp, createdInfos);
    }

    function addSlider(layer, name, value) {
        var effects = layer.property("ADBE Effect Parade");
        var effect = effects.addProperty("ADBE Slider Control");
        effect.name = name;
        effect.property(1).setValue(value);
        return effect;
    }

    function addColor(layer, name, value) {
        var effects = layer.property("ADBE Effect Parade");
        var effect = effects.addProperty("ADBE Color Control");
        effect.name = name;
        effect.property(1).setValue(value);
        return effect;
    }

    function setExpressionSafe(prop, expressionText) {
        if (!prop) {
            return false;
        }
        try {
            prop.expression = expressionText;
            return true;
        } catch (err) {
        }
        return false;
    }

    function setValueSafe(prop, value) {
        if (!prop) {
            return false;
        }
        try {
            prop.setValue(value);
            return true;
        } catch (err) {
        }
        return false;
    }

    function shapeProp(parent, matchName) {
        var i;
        var child;
        try {
            child = parent ? parent.property(matchName) : null;
            if (child) {
                return child;
            }
        } catch (err) {
        }
        try {
            if (!parent || !parent.numProperties) {
                return null;
            }
            for (i = 1; i <= parent.numProperties; i++) {
                child = parent.property(i);
                if (child && child.matchName === matchName) {
                    return child;
                }
            }
        } catch (err2) {
        }
        return null;
    }

    function findPropByMatchName(parent, matchName) {
        var found = shapeProp(parent, matchName);
        var i;
        var child;
        if (found) {
            return found;
        }
        try {
            if (!parent || !parent.numProperties) {
                return null;
            }
            for (i = 1; i <= parent.numProperties; i++) {
                child = parent.property(i);
                if (child && child.numProperties) {
                    found = findPropByMatchName(child, matchName);
                    if (found) {
                        return found;
                    }
                }
            }
        } catch (err) {
        }
        return null;
    }

    function addPathGroup(vectors) {
        var path = vectors.addProperty("ADBE Vector Shape - Group");
        path.name = "Path";
        return path;
    }

    function addVectorItemIndex(vectors, matchName, name) {
        var item = vectors.addProperty(matchName);
        item.name = name;
        return item.propertyIndex;
    }

    function addStrokeFillGroup(root, name) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        return group;
    }

    function addStrokeFillGroupIndex(root, name) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        return group.propertyIndex;
    }

    function indexedProp(parent, index) {
        try {
            return parent ? parent.property(index) : null;
        } catch (err) {
        }
        return null;
    }

    function vectorShapePathProperty(pathGroup) {
        var prop = shapeProp(pathGroup, "ADBE Vector Shape");
        if (prop) {
            return prop;
        }
        try {
            return pathGroup ? pathGroup.property(1) : null;
        } catch (err) {
        }
        return null;
    }

    function optionNumber(raw, key, fallback, min, max) {
        var n = parseFloat(raw && raw[key]);
        if (isNaN(n)) {
            n = fallback;
        }
        if (typeof min === "number" && n < min) {
            n = min;
        }
        if (typeof max === "number" && n > max) {
            n = max;
        }
        return n;
    }

    function sanitizeStrokeFillOptions(raw) {
        raw = raw || {};
        return {
            strokeWidth: optionNumber(raw, "strokeWidth", 7, 0),
            miterLimit: optionNumber(raw, "miterLimit", 14, 0),
            trimStart: optionNumber(raw, "trimStart", 0, 0, 100),
            trimEnd: optionNumber(raw, "trimEnd", 100, 0, 100),
            trimOffset: optionNumber(raw, "trimOffset", 0, -360, 360),
            taperStartLength: optionNumber(raw, "taperStartLength", 15, 0),
            taperEndLength: optionNumber(raw, "taperEndLength", 15, 0),
            taperStartWidth: optionNumber(raw, "taperStartWidth", 0, 0),
            taperEndWidth: optionNumber(raw, "taperEndWidth", 0, 0),
            taperStartEase: optionNumber(raw, "taperStartEase", 30, 0, 100),
            taperEndEase: optionNumber(raw, "taperEndEase", 30, 0, 100),
            strokeColor: AEToolbox.normalizeHexColor(raw.strokeColor || "#FFFFFF"),
            fillColor: AEToolbox.normalizeHexColor(raw.fillColor || "#D6B25E")
        };
    }

    function getTopSelectedLayer(comp) {
        var selected;
        var topLayer = null;
        var i;
        if (!comp || !comp.selectedLayers || comp.selectedLayers.length < 1) {
            return null;
        }
        selected = comp.selectedLayers;
        for (i = 0; i < selected.length; i++) {
            if (!topLayer || selected[i].index < topLayer.index) {
                topLayer = selected[i];
            }
        }
        return topLayer;
    }

    function createStrokeFillLayerContents(layer, opt) {
        var root = layer.property("ADBE Root Vectors Group");
        var strokeGroupIndex = addStrokeFillGroupIndex(root, "Stroke");
        var fillGroupIndex = addStrokeFillGroupIndex(root, "Fill");
        var strokeGroup = indexedProp(root, strokeGroupIndex);
        var fillGroup = indexedProp(root, fillGroupIndex);
        var strokeVectors = shapeProp(strokeGroup, "ADBE Vectors Group");
        var fillVectors = shapeProp(fillGroup, "ADBE Vectors Group");
        var strokePathIndex = addVectorItemIndex(strokeVectors, "ADBE Vector Shape - Group", "Path");
        var strokeTrimIndex = addVectorItemIndex(strokeVectors, "ADBE Vector Filter - Trim", "Trim Paths");
        var strokeGraphicIndex = addVectorItemIndex(strokeVectors, "ADBE Vector Graphic - Stroke", "Stroke");
        var fillPathIndex = addVectorItemIndex(fillVectors, "ADBE Vector Shape - Group", "Path");
        var fillGraphicIndex = addVectorItemIndex(fillVectors, "ADBE Vector Graphic - Fill", "Fill");
        var strokePath;
        var strokeTrim;
        var strokeGraphic;
        var fillPath;
        var fillGraphic;
        var strokePathValue;
        var fillPathValue;
        var strokeWidthProp;
        var strokeMiterLimitProp;
        var strokeColorProp;
        var fillColorProp;
        var taperStartLengthProp;
        var taperEndLengthProp;
        var taperStartWidthProp;
        var taperEndWidthProp;
        var taperStartEaseProp;
        var taperEndEaseProp;
        var trimStartProp;
        var trimEndProp;
        var trimOffsetProp;
        var taper;
        var exprOkCount = 0;

        // Reacquire every indexed-property reference after all addProperty calls.
        // AE can invalidate cached Shape property objects when siblings are added.
        root = layer.property("ADBE Root Vectors Group");
        strokeGroup = indexedProp(root, strokeGroupIndex);
        fillGroup = indexedProp(root, fillGroupIndex);
        strokeVectors = shapeProp(strokeGroup, "ADBE Vectors Group");
        fillVectors = shapeProp(fillGroup, "ADBE Vectors Group");
        strokePath = indexedProp(strokeVectors, strokePathIndex);
        strokeTrim = indexedProp(strokeVectors, strokeTrimIndex);
        strokeGraphic = indexedProp(strokeVectors, strokeGraphicIndex);
        fillPath = indexedProp(fillVectors, fillPathIndex);
        fillGraphic = indexedProp(fillVectors, fillGraphicIndex);
        fillGraphic.name = "Fill";
        strokeTrim.name = "Trim Paths";
        strokeGraphic.name = "Stroke";
        strokePathValue = vectorShapePathProperty(strokePath);
        fillPathValue = vectorShapePathProperty(fillPath);

        strokeWidthProp = findPropByMatchName(strokeGraphic, "ADBE Vector Stroke Width");
        strokeMiterLimitProp = findPropByMatchName(strokeGraphic, "ADBE Vector Stroke Miter Limit");
        strokeColorProp = findPropByMatchName(strokeGraphic, "ADBE Vector Stroke Color");
        fillColorProp = findPropByMatchName(fillGraphic, "ADBE Vector Fill Color");
        trimStartProp = findPropByMatchName(strokeTrim, "ADBE Vector Trim Start");
        trimEndProp = findPropByMatchName(strokeTrim, "ADBE Vector Trim End");
        trimOffsetProp = findPropByMatchName(strokeTrim, "ADBE Vector Trim Offset");
        taper = findPropByMatchName(strokeGraphic, "ADBE Vector Stroke Taper");

        setValueSafe(strokeWidthProp, opt.strokeWidth);
        setValueSafe(strokeMiterLimitProp, opt.miterLimit);
        setValueSafe(trimStartProp, opt.trimStart);
        setValueSafe(trimEndProp, opt.trimEnd);
        setValueSafe(trimOffsetProp, opt.trimOffset);
        if (taper) {
            taperStartLengthProp = findPropByMatchName(taper, "ADBE Vector Taper Start Length");
            taperEndLengthProp = findPropByMatchName(taper, "ADBE Vector Taper End Length");
            taperStartWidthProp = findPropByMatchName(taper, "ADBE Vector Taper Start Width");
            taperEndWidthProp = findPropByMatchName(taper, "ADBE Vector Taper End Width");
            taperStartEaseProp = findPropByMatchName(taper, "ADBE Vector Taper Start Ease");
            taperEndEaseProp = findPropByMatchName(taper, "ADBE Vector Taper End Ease");
            setValueSafe(taperStartLengthProp, opt.taperStartLength);
            setValueSafe(taperEndLengthProp, opt.taperEndLength);
            setValueSafe(taperStartWidthProp, opt.taperStartWidth);
            setValueSafe(taperEndWidthProp, opt.taperEndWidth);
            setValueSafe(taperStartEaseProp, opt.taperStartEase);
            setValueSafe(taperEndEaseProp, opt.taperEndEase);
        }

        exprOkCount += setExpressionSafe(strokePathValue, "thisLayer.content(\"Fill\").content(\"Path\").path") ? 1 : 0;
        exprOkCount += setExpressionSafe(trimStartProp, "effect(\"Trim Start\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(trimEndProp, "effect(\"Trim End\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(trimOffsetProp, "effect(\"Trim Offset\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(strokeWidthProp, "effect(\"Stroke Width\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(strokeMiterLimitProp, "effect(\"Miter Limit\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(strokeColorProp, "effect(\"Stroke Color\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(taperStartLengthProp, "effect(\"Taper Start Length\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(taperEndLengthProp, "effect(\"Taper End Length\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(taperStartWidthProp, "effect(\"Taper Start Width\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(taperEndWidthProp, "effect(\"Taper End Width\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(taperStartEaseProp, "effect(\"Taper Start Ease\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(taperEndEaseProp, "effect(\"Taper End Ease\")(1)") ? 1 : 0;
        exprOkCount += setExpressionSafe(fillColorProp, "effect(\"Fill Color\")(1)") ? 1 : 0;

        return {
            fillGroup: fillGroup,
            fillPath: fillPath,
            fillPathValue: fillPathValue,
            strokeGroup: strokeGroup,
            strokePath: strokePath,
            strokePathValue: strokePathValue,
            strokeTrim: strokeTrim,
            exprOkCount: exprOkCount,
            exprFailCount: 14 - exprOkCount
        };
    }

    TOOL.createStrokeFillLayer = function (paramsJson) {
        var comp = getComp();
        var layer;
        var created;
        var opt;
        var insertionLayer;
        var i;
        if (!comp) {
            return activeCompJsonResult(false, false, "请打开合成", "", null);
        }

        try {
            opt = sanitizeStrokeFillOptions(paramsJson ? AEToolbox.parseJson(paramsJson) : {});
        } catch (parseErr) {
            return activeCompJsonResult(false, false, "Stroke / Fill 默认参数无效：" + parseErr.toString(), "", comp);
        }

        app.beginUndoGroup("AE Toolbox Create Stroke Fill Shape Layer");
        try {
            insertionLayer = getTopSelectedLayer(comp);
            layer = comp.layers.addShape();
            layer.name = "Stroke / Fill Shape";
            if (insertionLayer && insertionLayer !== layer) {
                try {
                    layer.moveBefore(insertionLayer);
                } catch (moveErr) {
                }
            }
            addSlider(layer, "Stroke Width", opt.strokeWidth);
            addSlider(layer, "Miter Limit", opt.miterLimit);
            addSlider(layer, "Trim Start", opt.trimStart);
            addSlider(layer, "Trim End", opt.trimEnd);
            addSlider(layer, "Trim Offset", opt.trimOffset);
            addSlider(layer, "Taper Start Length", opt.taperStartLength);
            addSlider(layer, "Taper End Length", opt.taperEndLength);
            addSlider(layer, "Taper Start Width", opt.taperStartWidth);
            addSlider(layer, "Taper End Width", opt.taperEndWidth);
            addSlider(layer, "Taper Start Ease", opt.taperStartEase);
            addSlider(layer, "Taper End Ease", opt.taperEndEase);
            addColor(layer, "Stroke Color", AEToolbox.hexToColorArray(opt.strokeColor));
            addColor(layer, "Fill Color", AEToolbox.hexToColorArray(opt.fillColor));
            created = createStrokeFillLayerContents(layer, opt);

            for (i = 1; i <= comp.numLayers; i++) {
                comp.layer(i).selected = false;
            }
            layer.selected = true;
        } catch (err) {
            app.endUndoGroup();
            return activeCompJsonResult(false, false, "创建 Stroke / Fill 形状图层失败：" + err.toString(), "", comp);
        }
        app.endUndoGroup();

        revealCreatedProperties(comp, [{
            prop: created.fillPathValue || created.fillPath,
            layerIndex: layer.index
        }]);

        return activeCompJsonResult(true, true, "已新建 Stroke / Fill 形状图层", "Stroke / Fill Shape", comp, "\"layerName\":\"" + AEToolbox.jsonEscape(layer.name) + "\",\"expressionLinks\":" + created.exprOkCount);
    };

    TOOL.getState = function () {
        var comp = getComp();
        var resolved;
        if (!comp) {
            return activeCompJsonResult(false, false, "请打开合成", "", null);
        }
        resolved = resolveTargets(comp);
        if (!resolved.targets.length) {
            return activeCompJsonResult(false, false, SHAPE_LAYER_REQUIRED, "", comp);
        }
        return activeCompJsonResult(true, true, "当前目标：" + resolved.targetLabel, resolved.targetLabel, comp, "\"source\":\"" + resolved.source + "\"");
    };

    TOOL.add = function (matchName, key) {
        var comp = getComp();
        var item = getItemByKeyOrMatchName(key, matchName);
        var resolved;
        var created = [];
        var createdInfos = [];
        var errors = [];
        var i;
        var targetInfo;
        var prop;
        var rememberedGroup = null;
        var rememberedLayerIndex = 0;

        if (!comp) {
            return jsonResult(false, false, SHAPE_LAYER_REQUIRED, "");
        }
        if (!item.matchName) {
            return jsonResult(false, false, "未知 Shape Add 项目", "");
        }

        resolved = resolveTargets(comp);
        if (!resolved.targets.length) {
            return jsonResult(false, false, SHAPE_LAYER_REQUIRED, "");
        }

        app.beginUndoGroup("AE Toolbox Shape Add " + item.label);
        try {
            for (i = 0; i < resolved.targets.length; i++) {
                targetInfo = resolved.targets[i];
                try {
                    if (!targetInfo.target.canAddProperty(item.matchName)) {
                        errors[errors.length] = targetInfo.label + " cannot add " + item.label;
                        continue;
                    }
                    prop = targetInfo.target.addProperty(item.matchName);
                    created[created.length] = prop;
                    createdInfos[createdInfos.length] = {
                        prop: prop,
                        layerIndex: targetInfo.layerIndex
                    };
                    if (item.key === "group" && resolved.targets.length === 1 && prop && prop.matchName === "ADBE Vector Group") {
                        rememberedGroup = prop;
                        rememberedLayerIndex = targetInfo.layerIndex;
                    }
                } catch (addErr) {
                    errors[errors.length] = targetInfo.label + ": " + addErr.toString();
                }
            }
            if (rememberedGroup) {
                rememberGroup(comp, rememberedGroup, rememberedLayerIndex);
            }
        } catch (err) {
            errors[errors.length] = err.toString();
        } finally {
            app.endUndoGroup();
        }

        if (!created.length) {
            return jsonResult(false, true, errors.length ? errors.join("; ") : "无法添加 " + item.label, resolved.targetLabel);
        }

        revealCreatedPropertiesInTimeline(comp, createdInfos);

        return jsonResult(true, true, "已添加：" + item.label, resolved.targetLabel, "\"createdCount\":" + created.length);
    };
})();
