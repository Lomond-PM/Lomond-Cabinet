(function () {
    AEToolbox.tools = AEToolbox.tools || {};
    AEToolbox.tools.ecommerceLayout = AEToolbox.tools.ecommerceLayout || {};

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
        p.template = p.template || "leftTextRightProduct";
        p.marginX = num(p.marginX, 40);
        p.marginY = num(p.marginY, 40);
        p.insetX = num(p.insetX, 24);
        p.insetY = num(p.insetY, 18);
        p.productMode = p.productMode || "keepFixed";
        p.productScale = num(p.productScale, 100);
        p.titleAreaWidth = num(p.titleAreaWidth, 100);
        p.titleAlign = p.titleAlign || "left";
        p.pillsEnable = boolValue(p.pillsEnable, true);
        p.pillGap = num(p.pillGap, 14);
        p.pillPaddingX = num(p.pillPaddingX, 24);
        p.pillPaddingY = num(p.pillPaddingY, 12);
        p.pillRadius = num(p.pillRadius, 32);
        p.pillWidthMode = p.pillWidthMode || "auto";
        p.pillGradient = boolValue(p.pillGradient, false);
        p.iconGridEnable = boolValue(p.iconGridEnable, true);
        p.iconColumns = Math.max(1, Math.round(num(p.iconColumns, 4)));
        p.iconRows = Math.max(1, Math.round(num(p.iconRows, 2)));
        p.iconGapX = num(p.iconGapX, 28);
        p.iconGapY = num(p.iconGapY, 24);
        p.iconSize = num(p.iconSize, 72);
        p.iconLabelGap = num(p.iconLabelGap, 12);
        p.variantEnable = boolValue(p.variantEnable, true);
        p.variantSize = num(p.variantSize, 92);
        p.variantGap = num(p.variantGap, 18);
        p.variantAlign = p.variantAlign || "center";
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

    function insetArea(a, insetX, insetY) {
        var ix = Math.min(Math.max(0, insetX), a.width / 2);
        var iy = Math.min(Math.max(0, insetY), a.height / 2);
        return area(a.left + ix, a.top + iy, a.right - ix, a.bottom - iy);
    }

    function templateAreas(comp, p) {
        var w = comp.width;
        var h = comp.height;
        var mx = p.marginX;
        var my = p.marginY;
        var a = {};

        if (p.template === "topTitleCenterProductBottomIcons") {
            a.title = area(mx, my, w - mx, h * 0.14);
            a.subtitle = area(mx, h * 0.14, w - mx, h * 0.23);
            a.product = area(w * 0.15, h * 0.24, w * 0.85, h * 0.68);
            a.features = area(mx, h * 0.68, w - mx, h * 0.78);
            a.icons = area(mx, h * 0.70, w - mx, h - my);
            a.variants = area(mx, h * 0.84, w - mx, h - my);
            return a;
        }

        a.title = area(w * 0.05, h * 0.08, w * 0.52, h * 0.30);
        a.subtitle = area(w * 0.05, h * 0.30, w * 0.52, h * 0.44);
        a.product = area(w * 0.45, h * 0.12, w * 0.96, h * 0.88);
        a.features = area(w * 0.05, h * 0.52, w * 0.48, h * 0.80);
        a.icons = area(mx, h * 0.70, w - mx, h - my);
        a.variants = area(w * 0.05, h * 0.82, w * 0.50, h - my);
        return a;
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

    function positionProp(layer) {
        var tr = layer.property("ADBE Transform Group");
        return tr ? tr.property("ADBE Position") : null;
    }

    function scaleProp(layer) {
        var tr = layer.property("ADBE Transform Group");
        return tr ? tr.property("ADBE Scale") : null;
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

    function scaleLayerBy(layer, factor) {
        var s = scaleProp(layer);
        var v;
        if (!s || factor === 1) {
            return;
        }
        v = s.value;
        if (v.length > 2) {
            s.setValue([v[0] * factor, v[1] * factor, v[2]]);
        } else {
            s.setValue([v[0] * factor, v[1] * factor]);
        }
    }

    function fitLayerToArea(layer, target, allowEnlarge, percent) {
        var b = getLayerVisualBoundsInComp(layer, layer.containingComp.time);
        var factor;
        if (b.width <= 0 || b.height <= 0) {
            return;
        }
        factor = Math.min(target.width / b.width, target.height / b.height) * (percent / 100);
        if (!allowEnlarge) {
            factor = Math.min(1, factor);
        }
        scaleLayerBy(layer, factor);
        moveLayerBoundsCenterTo(layer, target.centerX, target.centerY);
    }

    function placeLayerInArea(layer, target, alignH, alignV) {
        var b = getLayerVisualBoundsInComp(layer, layer.containingComp.time);
        var x;
        var y;
        if (alignH === "right") {
            x = target.right - b.width / 2;
        } else if (alignH === "center") {
            x = target.centerX;
        } else {
            x = target.left + b.width / 2;
        }
        if (alignV === "bottom") {
            y = target.bottom - b.height / 2;
        } else if (alignV === "center") {
            y = target.centerY;
        } else {
            y = target.top + b.height / 2;
        }
        moveLayerBoundsCenterTo(layer, x, y);
    }

    function layerMatches(layer, base) {
        var suffix;
        if (layer.name === base) {
            return true;
        }
        if (layer.name.indexOf(base + "_") !== 0) {
            return false;
        }
        suffix = layer.name.substr(base.length + 1);
        return /^[0-9]+$/.test(suffix);
    }

    function numericSuffix(name) {
        var m = name.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
    }

    function sortBySuffix(a, b) {
        return numericSuffix(a.name) - numericSuffix(b.name);
    }

    function collectRoles(comp) {
        var roles = { title: null, subtitle: null, product: null, features: [], pills: [], icons: [], iconLabels: [], variants: [] };
        var i;
        var layer;
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i);
            if (layer.name === "TITLE") {
                roles.title = layer;
            } else if (layer.name === "SUBTITLE") {
                roles.subtitle = layer;
            } else if (layer.name === "PRODUCT_MAIN") {
                roles.product = layer;
            } else if (layerMatches(layer, "FEATURE")) {
                roles.features[roles.features.length] = layer;
            } else if (layerMatches(layer, "PILL")) {
                roles.pills[roles.pills.length] = layer;
            } else if (layerMatches(layer, "ICON_LABEL")) {
                roles.iconLabels[roles.iconLabels.length] = layer;
            } else if (layerMatches(layer, "ICON")) {
                roles.icons[roles.icons.length] = layer;
            } else if (layerMatches(layer, "VARIANT")) {
                roles.variants[roles.variants.length] = layer;
            }
        }
        roles.features.sort(sortBySuffix);
        roles.pills.sort(sortBySuffix);
        roles.icons.sort(sortBySuffix);
        roles.iconLabels.sort(sortBySuffix);
        roles.variants.sort(sortBySuffix);
        return roles;
    }

    function collectGuides(comp) {
        var guides = {};
        var names = ["TITLE", "SUBTITLE", "FEATURES", "ICONS", "VARIANTS", "PRODUCT"];
        var i;
        var layer;
        for (i = 0; i < names.length; i++) {
            layer = findLayerByName(comp, "GUIDE_" + names[i]);
            if (layer) {
                guides[names[i].toLowerCase()] = getLayerVisualBoundsInComp(layer, comp.time);
            }
        }
        return guides;
    }

    function guidePresence(comp) {
        var names = ["GUIDE_TITLE", "GUIDE_SUBTITLE", "GUIDE_FEATURES", "GUIDE_ICONS", "GUIDE_VARIANTS", "GUIDE_PRODUCT"];
        var parts = [];
        var i;
        for (i = 0; i < names.length; i++) {
            parts[parts.length] = "\"" + names[i] + "\":" + (findLayerByName(comp, names[i]) ? "true" : "false");
        }
        return parts.join(",");
    }

    function warningsJson(parts) {
        var out = [];
        var i;
        for (i = 0; i < parts.length; i++) {
            out[out.length] = "\"" + AEToolbox.jsonEscape(parts[i]) + "\"";
        }
        return "[" + out.join(",") + "]";
    }

    function layoutCountsJson(roles) {
        return "\"layers\":{" +
            "\"PRODUCT_MAIN\":" + (roles.product ? 1 : 0) + "," +
            "\"TITLE\":" + (roles.title ? 1 : 0) + "," +
            "\"SUBTITLE\":" + (roles.subtitle ? 1 : 0) + "," +
            "\"FEATURE\":" + roles.features.length + "," +
            "\"PILL\":" + roles.pills.length + "," +
            "\"ICON\":" + roles.icons.length + "," +
            "\"ICON_LABEL\":" + roles.iconLabels.length + "," +
            "\"VARIANT\":" + roles.variants.length +
        "}";
    }

    function performLayout(comp, p) {
        var data = contentAreasFromGuides(comp, p);
        var roles = collectRoles(comp);
        layoutTitle(roles, data.areas, p);
        if (roles.product && data.guides.product && p.productMode === "fitToGuide") {
            fitLayerToArea(roles.product, data.areas.productInner, true, p.productScale);
        } else if (roles.product && data.guides.product && p.productMode === "centerToGuide") {
            moveLayerBoundsCenterTo(roles.product, data.areas.productInner.centerX, data.areas.productInner.centerY);
        }
        layoutPills(comp, roles, data.areas, p);
        layoutIconGrid(roles, data.areas, p);
        layoutVariants(roles, data.areas, p);
        return roles;
    }

    function hideGuideLayers(comp) {
        var names = ["GUIDE_TITLE", "GUIDE_SUBTITLE", "GUIDE_FEATURES", "GUIDE_ICONS", "GUIDE_VARIANTS", "GUIDE_PRODUCT"];
        var i;
        var layer;
        for (i = 0; i < names.length; i++) {
            layer = findLayerByName(comp, names[i]);
            if (layer) {
                layer.enabled = false;
            }
        }
    }

    function contentAreasFromGuides(comp, p) {
        var areas = templateAreas(comp, p);
        var guides = collectGuides(comp);
        var k;
        for (k in guides) {
            if (guides.hasOwnProperty(k)) {
                areas[k] = guides[k];
            }
        }
        areas.titleInner = insetArea(areas.title, p.insetX, p.insetY);
        areas.subtitleInner = insetArea(areas.subtitle, p.insetX, p.insetY);
        areas.featuresInner = insetArea(areas.features, p.insetX, p.insetY);
        areas.iconsInner = insetArea(areas.icons, p.insetX, p.insetY);
        areas.variantsInner = insetArea(areas.variants, p.insetX, p.insetY);
        areas.productInner = insetArea(areas.product, p.insetX, p.insetY);
        return { areas: areas, guides: guides };
    }

    function createRectLayer(comp, name, rectArea, color, opacity, roundness, guide) {
        var layer = comp.layers.addShape();
        var root;
        var group;
        var vectors;
        var rect;
        var fill;
        var stroke;
        var tr;
        layer.name = name;
        layer.guideLayer = !!guide;
        root = layer.property("ADBE Root Vectors Group");
        group = root.addProperty("ADBE Vector Group");
        group.name = name + " Group";
        vectors = group.property("ADBE Vectors Group");
        rect = vectors.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([rectArea.width, rectArea.height]);
        rect.property("ADBE Vector Rect Roundness").setValue(roundness || 0);
        fill = vectors.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(color || [0.84, 0.70, 0.37, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(opacity);
        stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
        stroke.property("ADBE Vector Stroke Color").setValue(color || [0.84, 0.70, 0.37, 1]);
        stroke.property("ADBE Vector Stroke Width").setValue(2);
        stroke.property("ADBE Vector Stroke Opacity").setValue(guide ? 70 : 45);
        tr = layer.property("ADBE Transform Group");
        tr.property("ADBE Position").setValue([rectArea.centerX, rectArea.centerY]);
        return layer;
    }

    function findLayerByName(comp, name) {
        var i;
        for (i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) {
                return comp.layer(i);
            }
        }
        return null;
    }

    function removeLayerByName(comp, name) {
        var layer = findLayerByName(comp, name);
        if (layer) {
            layer.remove();
        }
    }

    function removeLayersWithPrefix(comp, prefix) {
        var i;
        for (i = comp.numLayers; i >= 1; i--) {
            if (comp.layer(i).name.indexOf(prefix) === 0) {
                comp.layer(i).remove();
            }
        }
    }

    function layoutTitle(roles, areas, p) {
        var maxFactor;
        if (roles.title) {
            maxFactor = Math.min(1, p.titleAreaWidth / 100);
            fitLayerToArea(roles.title, area(areas.titleInner.left, areas.titleInner.top, areas.titleInner.left + areas.titleInner.width * maxFactor, areas.titleInner.bottom), false, 100);
            placeLayerInArea(roles.title, areas.titleInner, p.titleAlign, "top");
        }
        if (roles.subtitle) {
            fitLayerToArea(roles.subtitle, areas.subtitleInner, false, 100);
            placeLayerInArea(roles.subtitle, areas.subtitleInner, p.titleAlign, "top");
        }
    }

    function layoutPills(comp, roles, areas, p) {
        var items = roles.features.length ? roles.features : roles.pills;
        var count = items.length;
        var widths = [];
        var heights = [];
        var maxWidth = 0;
        var i;
        var b;
        var x;
        var y = areas.featuresInner.top;
        var layer;
        var bgArea;
        var bgName;
        var bg;
        if (!p.pillsEnable || !count) {
            return;
        }
        for (i = 0; i < count; i++) {
            b = getLayerVisualBoundsInComp(items[i], comp.time);
            widths[i] = Math.min(areas.featuresInner.width, b.width + p.pillPaddingX * 2);
            heights[i] = b.height + p.pillPaddingY * 2;
            maxWidth = Math.max(maxWidth, widths[i]);
        }
        for (i = 0; i < count; i++) {
            layer = items[i];
            if (p.pillWidthMode === "fixed") {
                widths[i] = Math.min(areas.featuresInner.width, maxWidth);
            }
            if (y + heights[i] > areas.featuresInner.bottom) {
                break;
            }
            x = areas.featuresInner.left + widths[i] / 2;
            moveLayerBoundsCenterTo(layer, x, y + heights[i] / 2);
            if (roles.features.length) {
                bgName = layer.name + "_BG";
                removeLayerByName(comp, bgName);
                bgArea = area(x - widths[i] / 2, y, x + widths[i] / 2, y + heights[i]);
                bg = createRectLayer(comp, bgName, bgArea, p.pillGradient ? [0.95, 0.82, 0.42, 1] : [0.84, 0.70, 0.37, 1], 70, p.pillRadius, false);
                bg.moveAfter(layer);
            }
            y += heights[i] + p.pillGap;
        }
    }

    function findLabelForIndex(labels, index) {
        var suffix = "_" + (index < 10 ? "0" + index : String(index));
        var i;
        for (i = 0; i < labels.length; i++) {
            if (labels[i].name.indexOf(suffix) >= 0) {
                return labels[i];
            }
        }
        return null;
    }

    function layoutIconGrid(roles, areas, p) {
        var count = Math.min(roles.icons.length, p.iconColumns * p.iconRows);
        var cellW;
        var cellH;
        var iconSize;
        var i;
        var col;
        var row;
        var x;
        var y;
        var iconBox;
        var label;
        if (!p.iconGridEnable || !count) {
            return;
        }
        cellW = (areas.iconsInner.width - p.iconGapX * (p.iconColumns - 1)) / p.iconColumns;
        cellH = (areas.iconsInner.height - p.iconGapY * (p.iconRows - 1)) / p.iconRows;
        iconSize = Math.max(1, Math.min(p.iconSize, cellW, cellH - p.iconLabelGap - 16));
        for (i = 0; i < count; i++) {
            col = i % p.iconColumns;
            row = Math.floor(i / p.iconColumns);
            x = areas.iconsInner.left + col * (cellW + p.iconGapX) + cellW / 2;
            y = areas.iconsInner.top + row * (cellH + p.iconGapY) + iconSize / 2;
            iconBox = area(x - iconSize / 2, y - iconSize / 2, x + iconSize / 2, y + iconSize / 2);
            fitLayerToArea(roles.icons[i], iconBox, false, 100);
            label = findLabelForIndex(roles.iconLabels, i + 1);
            if (label) {
                fitLayerToArea(label, area(x - cellW / 2, y + iconSize / 2 + p.iconLabelGap, x + cellW / 2, areas.iconsInner.top + (row + 1) * cellH + row * p.iconGapY), false, 100);
                placeLayerInArea(label, area(x - cellW / 2, y + iconSize / 2 + p.iconLabelGap, x + cellW / 2, areas.iconsInner.top + (row + 1) * cellH + row * p.iconGapY), "center", "top");
            }
        }
    }

    function layoutVariants(roles, areas, p) {
        var count = roles.variants.length;
        var thumb = Math.min(p.variantSize, areas.variantsInner.height, areas.variantsInner.width);
        var total = count * thumb + Math.max(0, count - 1) * p.variantGap;
        var startX;
        var y;
        var i;
        var x;
        if (!p.variantEnable || !count) {
            return;
        }
        if (p.variantAlign === "right") {
            startX = areas.variantsInner.right - total;
        } else if (p.variantAlign === "center") {
            startX = areas.variantsInner.centerX - total / 2;
        } else {
            startX = areas.variantsInner.left;
        }
        y = areas.variantsInner.centerY;
        for (i = 0; i < count; i++) {
            x = startX + i * (thumb + p.variantGap) + thumb / 2;
            if (x - thumb / 2 < areas.variantsInner.left || x + thumb / 2 > areas.variantsInner.right) {
                continue;
            }
            fitLayerToArea(roles.variants[i], area(x - thumb / 2, y - thumb / 2, x + thumb / 2, y + thumb / 2), false, 100);
        }
    }

    function nextRoleName(comp, roleName) {
        var base = roleName;
        var i = 1;
        var candidate;
        if (roleName === "FEATURE" || roleName === "PILL" || roleName === "ICON" || roleName === "ICON_LABEL" || roleName === "VARIANT") {
            while (true) {
                candidate = base + "_" + (i < 10 ? "0" + i : String(i));
                if (!findLayerByName(comp, candidate)) {
                    return candidate;
                }
                i++;
            }
        }
        candidate = base;
        i = 2;
        while (findLayerByName(comp, candidate)) {
            candidate = base + "_" + (i < 10 ? "0" + i : String(i));
            i++;
        }
        return candidate;
    }

    function drawStandardGuides(comp, p) {
        var areas = templateAreas(comp, p);
        removeLayerByName(comp, "GUIDE_TITLE");
        removeLayerByName(comp, "GUIDE_SUBTITLE");
        removeLayerByName(comp, "GUIDE_PRODUCT");
        removeLayerByName(comp, "GUIDE_FEATURES");
        removeLayerByName(comp, "GUIDE_ICONS");
        removeLayerByName(comp, "GUIDE_VARIANTS");
        createRectLayer(comp, "GUIDE_TITLE", areas.title, [0.95, 0.82, 0.42, 1], 12, 0, true);
        createRectLayer(comp, "GUIDE_SUBTITLE", areas.subtitle, [0.95, 0.72, 0.42, 1], 10, 0, true);
        createRectLayer(comp, "GUIDE_PRODUCT", areas.product, [0.42, 0.68, 1, 1], 10, 0, true);
        createRectLayer(comp, "GUIDE_FEATURES", areas.features, [0.55, 1, 0.58, 1], 10, 0, true);
        createRectLayer(comp, "GUIDE_ICONS", areas.icons, [1, 0.55, 0.38, 1], 10, 0, true);
        createRectLayer(comp, "GUIDE_VARIANTS", areas.variants, [0.75, 0.55, 1, 1], 10, 0, true);
    }

    function drawPreview(comp, p) {
        var data = contentAreasFromGuides(comp, p);
        removeLayersWithPrefix(comp, "PREVIEW_LAYOUT_");
        createRectLayer(comp, "PREVIEW_LAYOUT_TITLE", data.areas.titleInner, [0.95, 0.82, 0.42, 1], 8, 0, true);
        createRectLayer(comp, "PREVIEW_LAYOUT_SUBTITLE", data.areas.subtitleInner, [0.95, 0.72, 0.42, 1], 8, 0, true);
        createRectLayer(comp, "PREVIEW_LAYOUT_FEATURES", data.areas.featuresInner, [0.55, 1, 0.58, 1], 8, 0, true);
        createRectLayer(comp, "PREVIEW_LAYOUT_ICONS", data.areas.iconsInner, [1, 0.55, 0.38, 1], 8, 0, true);
        createRectLayer(comp, "PREVIEW_LAYOUT_VARIANTS", data.areas.variantsInner, [0.75, 0.55, 1, 1], 8, 0, true);
        if (data.guides.product) {
            createRectLayer(comp, "PREVIEW_LAYOUT_PRODUCT_REFERENCE", data.areas.productInner, [0.42, 0.68, 1, 1], 6, 0, true);
        }
    }

    function drawComputedBounds(comp) {
        var roles = collectRoles(comp);
        var guideNames = ["GUIDE_TITLE", "GUIDE_SUBTITLE", "GUIDE_FEATURES", "GUIDE_ICONS", "GUIDE_VARIANTS", "GUIDE_PRODUCT"];
        var layer;
        var i;
        removeLayersWithPrefix(comp, "BOUNDS_");
        for (i = 0; i < guideNames.length; i++) {
            layer = findLayerByName(comp, guideNames[i]);
            if (layer) {
                createRectLayer(comp, "BOUNDS_" + guideNames[i], getLayerVisualBoundsInComp(layer, comp.time), [0.35, 0.7, 1, 1], 5, 0, true);
            }
        }
        if (roles.title) {
            createRectLayer(comp, "BOUNDS_TITLE", getLayerVisualBoundsInComp(roles.title, comp.time), [0.95, 0.82, 0.42, 1], 7, 0, true);
        }
        if (roles.subtitle) {
            createRectLayer(comp, "BOUNDS_SUBTITLE", getLayerVisualBoundsInComp(roles.subtitle, comp.time), [0.95, 0.72, 0.42, 1], 7, 0, true);
        }
        for (i = 0; i < roles.features.length; i++) {
            createRectLayer(comp, "BOUNDS_" + roles.features[i].name, getLayerVisualBoundsInComp(roles.features[i], comp.time), [0.55, 1, 0.58, 1], 6, 0, true);
        }
        for (i = 0; i < roles.pills.length; i++) {
            createRectLayer(comp, "BOUNDS_" + roles.pills[i].name, getLayerVisualBoundsInComp(roles.pills[i], comp.time), [0.55, 1, 0.58, 1], 6, 0, true);
        }
        for (i = 0; i < roles.icons.length; i++) {
            createRectLayer(comp, "BOUNDS_" + roles.icons[i].name, getLayerVisualBoundsInComp(roles.icons[i], comp.time), [1, 0.55, 0.38, 1], 6, 0, true);
        }
        for (i = 0; i < roles.iconLabels.length; i++) {
            createRectLayer(comp, "BOUNDS_" + roles.iconLabels[i].name, getLayerVisualBoundsInComp(roles.iconLabels[i], comp.time), [1, 0.72, 0.38, 1], 6, 0, true);
        }
        for (i = 0; i < roles.variants.length; i++) {
            createRectLayer(comp, "BOUNDS_" + roles.variants[i].name, getLayerVisualBoundsInComp(roles.variants[i], comp.time), [0.75, 0.55, 1, 1], 6, 0, true);
        }
    }

    AEToolbox.tools.ecommerceLayout.assignRole = function (roleName) {
        var comp = getComp();
        var selected;
        var role = String(roleName || "");
        var i;
        if (!comp) {
            return jsonResult(false, "Open a composition before assigning roles.");
        }
        selected = comp.selectedLayers || [];
        if (!selected.length) {
            return jsonResult(false, "Select one or more layers first.");
        }
        app.beginUndoGroup("AE Toolbox Assign E-commerce Role");
        try {
            for (i = 0; i < selected.length; i++) {
                if (role.indexOf("GUIDE_") === 0) {
                    selected[i].name = i === 0 ? role : role + "_" + (i + 1);
                    selected[i].guideLayer = true;
                } else {
                    selected[i].name = nextRoleName(comp, role);
                }
            }
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Assign role failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Assigned " + selected.length + " layer(s) as " + role + ".");
    };

    AEToolbox.tools.ecommerceLayout.applyLayout = function (paramsJson) {
        var comp = getComp();
        var p;
        var roles;
        if (!comp) {
            return jsonResult(false, "Open a composition before applying layout.");
        }
        p = paramsFromJson(paramsJson);
        app.beginUndoGroup("AE Toolbox E-commerce Guide Layout v2");
        try {
            roles = performLayout(comp, p);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Guide layout failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Guide layout v2 applied.", "\"details\":{\"productMode\":\"" + AEToolbox.jsonEscape(p.productMode) + "\",\"features\":" + roles.features.length + ",\"icons\":" + roles.icons.length + ",\"variants\":" + roles.variants.length + "}");
    };

    AEToolbox.tools.ecommerceLayout.createGuideFrames = function (paramsJson) {
        var comp = getComp();
        var p;
        if (!comp) {
            return jsonResult(false, "Open a composition before creating guide frames.");
        }
        p = paramsFromJson(paramsJson);
        app.beginUndoGroup("AE Toolbox Standard Guide Set");
        try {
            drawStandardGuides(comp, p);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Create guide set failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Standard GUIDE_* set created.");
    };

    AEToolbox.tools.ecommerceLayout.previewLayout = function (paramsJson) {
        var comp = getComp();
        var p;
        if (!comp) {
            return jsonResult(false, "Open a composition before previewing layout.");
        }
        p = paramsFromJson(paramsJson);
        app.beginUndoGroup("AE Toolbox Preview Guide Layout");
        try {
            drawPreview(comp, p);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Preview failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Layout preview created.");
    };

    AEToolbox.tools.ecommerceLayout.showComputedBounds = function () {
        var comp = getComp();
        if (!comp) {
            return jsonResult(false, "Open a composition before showing bounds.");
        }
        app.beginUndoGroup("AE Toolbox Show Computed Bounds");
        try {
            drawComputedBounds(comp);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Show bounds failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Computed comp-space bounds drawn.");
    };

    AEToolbox.tools.ecommerceLayout.inspectLayoutState = function () {
        var comp = getComp();
        var roles;
        var warnings = [];
        var guides;
        var found = 0;
        var guideNames = ["GUIDE_TITLE", "GUIDE_SUBTITLE", "GUIDE_FEATURES", "GUIDE_ICONS", "GUIDE_VARIANTS", "GUIDE_PRODUCT"];
        var i;
        if (!comp) {
            return jsonResult(false, "Open a composition before detecting guides and layers.");
        }
        roles = collectRoles(comp);
        guides = guidePresence(comp);
        for (i = 0; i < guideNames.length; i++) {
            if (findLayerByName(comp, guideNames[i])) {
                found++;
            }
        }
        if (!findLayerByName(comp, "GUIDE_TITLE")) {
            warnings[warnings.length] = "Missing GUIDE_TITLE.";
        }
        if (!findLayerByName(comp, "GUIDE_FEATURES")) {
            warnings[warnings.length] = "Missing GUIDE_FEATURES.";
        }
        if (!roles.title) {
            warnings[warnings.length] = "No TITLE layer assigned.";
        }
        if (!roles.features.length && !roles.pills.length && !roles.icons.length && !roles.variants.length) {
            warnings[warnings.length] = "No feature, icon, or variant layers assigned.";
        }
        return "{\"ok\":true,\"message\":\"Detected " + found + " guide frame(s).\",\"guides\":{" + guides + "}," + layoutCountsJson(roles) + ",\"warnings\":" + warningsJson(warnings) + "}";
    };

    AEToolbox.tools.ecommerceLayout.clearPreview = function () {
        var comp = getComp();
        if (!comp) {
            return jsonResult(false, "Open a composition before clearing preview layers.");
        }
        app.beginUndoGroup("AE Toolbox Clear E-commerce Preview");
        try {
            removeLayersWithPrefix(comp, "PREVIEW_LAYOUT_");
            removeLayersWithPrefix(comp, "BOUNDS_");
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Clear preview failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Preview and bounds layers cleared.");
    };

    AEToolbox.tools.ecommerceLayout.applyLayoutAndHideGuides = function (paramsJson) {
        var comp = getComp();
        var p;
        var roles;
        if (!comp) {
            return jsonResult(false, "Open a composition before applying layout.");
        }
        p = paramsFromJson(paramsJson);
        app.beginUndoGroup("AE Toolbox E-commerce Layout And Hide Guides");
        try {
            roles = performLayout(comp, p);
            hideGuideLayers(comp);
        } catch (err) {
            app.endUndoGroup();
            return jsonResult(false, "Apply and hide guides failed: " + err.toString());
        }
        app.endUndoGroup();
        return jsonResult(true, "Layout applied and guide layers hidden.", "\"details\":{\"productMode\":\"" + AEToolbox.jsonEscape(p.productMode) + "\",\"features\":" + roles.features.length + ",\"icons\":" + roles.icons.length + ",\"variants\":" + roles.variants.length + "}");
    };

    AEToolbox.tools.ecommerceLayout.getLayerVisualBoundsInComp = getLayerVisualBoundsInComp;
})();
