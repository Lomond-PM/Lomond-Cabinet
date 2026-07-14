(function (root, factory) {
    "use strict";

    var api = factory(root);
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralHomeIcons = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
    "use strict";

    var ICON_TARGET = "icon";
    var DEFAULT_BATCH_SIZE = 2;
    var HOME_ICON_PALETTE_IDS = [
        "pacificCyan",
        "blueLavender",
        "tealLuminous",
        "mossGold",
        "plumRose",
        "slateIce",
        "warmCoral",
        "graphiteSilver"
    ];
    var HOME_ICON_PALETTE_MAP = {
        ecommerceLayout: "warmCoral",
        shapeAdd: "pacificCyan",
        textBackgroundBox: "blueLavender",
        selectionInfo: "graphiteSilver",
        proceduralAppearanceLab: "tealLuminous",
        registryControlLab: "slateIce",
        settingsRendererLab: "plumRose"
    };
    var warned = {};
    var state = {
        initialized: false,
        root: null,
        engine: null,
        rendered: {},
        queued: {},
        queue: [],
        rafId: null,
        resizeObserver: null,
        resizeRafId: null,
        batchSize: DEFAULT_BATCH_SIZE,
        shuttingDown: false,
        generatedCount: 0,
        params: {},
        appearance: {
            mode: "colorful",
            darkColor: "#15120c",
            lightColor: "#fff0be"
        }
    };
    var storeSubscriptionBound = false;

    function warnOnce(code, message, data) {
        if (warned[code]) {
            return;
        }
        warned[code] = true;
        if (root && root.console && root.console.warn) {
            if (typeof data !== "undefined") {
                root.console.warn("[ProceduralHomeIcons] " + message, data);
            } else {
                root.console.warn("[ProceduralHomeIcons] " + message);
            }
        }
    }

    function trimToolId(value) {
        var id = String(value || "").replace(/^\s+|\s+$/g, "");
        return id || "";
    }

    function hashString(input) {
        var str = String(input || "");
        var hash = 2166136261;
        var i;
        for (i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function resolveToolId(input) {
        if (!input) {
            return "";
        }
        if (typeof input.getAttribute === "function") {
            return trimToolId(input.getAttribute("data-tool") || input.getAttribute("data-tool-id"));
        }
        return trimToolId(input.toolId || input.id || input.seed);
    }

    function resolveHomePaletteId(toolId) {
        var id = trimToolId(toolId);
        var store = root && root.ProceduralPaletteStore;
        var paletteId;
        if (!id) {
            return "";
        }
        if (store && typeof store.getToolPalette === "function") {
            paletteId = store.getToolPalette(id);
            if (paletteId) {
                return paletteId;
            }
        }
        paletteId = HOME_ICON_PALETTE_MAP[id];
        if (paletteId) {
            return paletteId;
        }
        return HOME_ICON_PALETTE_IDS[hashString(id) % HOME_ICON_PALETTE_IDS.length];
    }

    function getHomeIconPaletteMap() {
        var copy = {};
        Object.keys(HOME_ICON_PALETTE_MAP).forEach(function (key) {
            copy[key] = HOME_ICON_PALETTE_MAP[key];
        });
        return copy;
    }

    function getThemeMap() {
        return root && root.ProceduralThemeMap;
    }

    function normalizeAppearance(next) {
        var themeMap = getThemeMap();
        var input = next || {};
        var mode = themeMap && typeof themeMap.normalizeMode === "function"
            ? themeMap.normalizeMode(input.mode)
            : (input.mode === "themeMapped" ? "themeMapped" : "colorful");
        var normalizeHex = themeMap && typeof themeMap.normalizeHexColor === "function"
            ? themeMap.normalizeHexColor
            : function (value, fallback) { return value || fallback; };
        var mappingParams = themeMap && typeof themeMap.normalizeMappingParams === "function"
            ? themeMap.normalizeMappingParams(input.mappingParams || {})
            : (input.mappingParams || {});
        return {
            mode: mode,
            darkColor: normalizeHex(input.darkColor, "#15120c"),
            midColor: input.midColor ? normalizeHex(input.midColor, "#15120c") : "",
            lightColor: normalizeHex(input.lightColor, "#fff0be"),
            mappingParams: mappingParams
        };
    }

    function getThemeMapSignature(appearance) {
        var themeMap = getThemeMap();
        if (themeMap && typeof themeMap.getThemeMapSignature === "function") {
            return themeMap.getThemeMapSignature(appearance);
        }
        return "theme-map-v2|" + appearance.mode + "|" + appearance.darkColor + "|" + (appearance.midColor || "") + "|" + appearance.lightColor;
    }

    function getEngine() {
        return state.engine || (root && root.ProceduralAppearance) || null;
    }

    function normalizeParameters(value, engineOverride) {
        var engine = engineOverride || getEngine();
        if (engine && typeof engine.normalizeParams === "function") {
            try {
                return engine.normalizeParams(value || {});
            } catch (error) {
                return {};
            }
        }
        return value || {};
    }

    function getIconParams(toolId, engineOverride) {
        var params = normalizeParameters(state.params || {}, engineOverride);
        params.paletteId = resolveHomePaletteId(toolId);
        return params;
    }

    function getSourceSignature(toolId, size, params) {
        return [
            "source-v1",
            trimToolId(toolId),
            resolveHomePaletteId(toolId),
            size.logicalWidth,
            size.logicalHeight,
            size.width,
            size.height,
            size.ratio,
            JSON.stringify(params || {})
        ].join("|");
    }

    function getPresentationSignature(sourceSignature, appearance) {
        return sourceSignature + "|presentation|" + getThemeMapSignature(appearance);
    }

    function invalidatePresentation() {
        state.rendered = {};
        if (state.initialized && !state.shuttingDown) {
            refresh({ root: state.root });
        }
    }

    function invalidateSource() {
        state.rendered = {};
        if (state.initialized && !state.shuttingDown) {
            refresh({ root: state.root });
        }
    }

    function invalidateRendered() {
        invalidateSource();
    }

    function createIconInput(input) {
        var toolId = resolveToolId(input);
        if (!toolId) {
            return null;
        }
        return {
            target: ICON_TARGET,
            seed: toolId,
            params: {
                paletteId: resolveHomePaletteId(toolId)
            }
        };
    }

    function collectUniqueToolCards(rootNode) {
        var scope = rootNode || (root && root.document);
        var nodes;
        var seen = {};
        var cards = [];
        var i;
        var id;

        if (!scope || typeof scope.querySelectorAll !== "function") {
            return cards;
        }
        nodes = scope.querySelectorAll(".tool-app[data-tool]:not(.is-disabled)");
        for (i = 0; i < nodes.length; i++) {
            id = resolveToolId(nodes[i]);
            if (!id || seen[id]) {
                continue;
            }
            seen[id] = true;
            cards[cards.length] = {
                toolId: id,
                card: nodes[i]
            };
        }
        return cards;
    }

    function uniqueToolIds(items) {
        var seen = {};
        var ids = [];
        var i;
        var id;
        for (i = 0; i < (items || []).length; i++) {
            id = resolveToolId(items[i]);
            if (!id || seen[id]) {
                continue;
            }
            seen[id] = true;
            ids[ids.length] = id;
        }
        return ids;
    }

    function shouldRenderTool(renderState, toolId) {
        var id = trimToolId(toolId);
        if (!id) {
            return false;
        }
        if (!renderState) {
            return true;
        }
        return renderState.rendered && renderState.rendered[id] ? false : true;
    }

    function getIconContainer(card) {
        return card && typeof card.querySelector === "function" ? card.querySelector(".tool-icon") : null;
    }

    function getOrCreateCanvas(icon) {
        var doc;
        var canvas;
        if (!icon) {
            return null;
        }
        canvas = icon.querySelector(".procedural-home-icon-canvas");
        if (canvas) {
            return canvas;
        }
        doc = icon.ownerDocument || (root && root.document);
        if (!doc) {
            return null;
        }
        canvas = doc.createElement("canvas");
        canvas.className = "procedural-home-icon-canvas";
        canvas.setAttribute("aria-hidden", "true");
        icon.insertBefore(canvas, icon.firstChild);
        return canvas;
    }

    function normalizeRenderScale(engine) {
        var ratio = root && root.devicePixelRatio ? root.devicePixelRatio : 1;
        if (engine && typeof engine.normalizeRenderScale === "function") {
            return engine.normalizeRenderScale(ratio);
        }
        ratio = Number(ratio);
        if (!isFinite(ratio) || isNaN(ratio) || ratio < 1) {
            ratio = 1;
        }
        return Math.max(1, Math.min(2, ratio));
    }

    function getIconRenderSize(icon, engine) {
        var rect = icon && typeof icon.getBoundingClientRect === "function" ? icon.getBoundingClientRect() : null;
        var logicalWidth = rect && rect.width ? rect.width : (icon && icon.offsetWidth ? icon.offsetWidth : 0);
        var logicalHeight = rect && rect.height ? rect.height : (icon && icon.offsetHeight ? icon.offsetHeight : 0);
        var ratio = normalizeRenderScale(engine);
        var logicalSize = Math.max(1, Math.round(Math.min(logicalWidth || 0, logicalHeight || 0) || logicalWidth || logicalHeight || 1));
        return {
            ratio: ratio,
            logicalWidth: logicalSize,
            logicalHeight: logicalSize,
            width: Math.max(1, Math.round(logicalSize * ratio)),
            height: Math.max(1, Math.round(logicalSize * ratio))
        };
    }

    function isCanvasSizeCurrent(canvas, size) {
        if (!canvas || !size) {
            return false;
        }
        return String(size.width) === canvas.getAttribute("data-procedural-home-icon-width") &&
            String(size.height) === canvas.getAttribute("data-procedural-home-icon-height");
    }

    function markCanvasSize(canvas, size) {
        canvas.setAttribute("data-procedural-home-icon-width", String(size.width));
        canvas.setAttribute("data-procedural-home-icon-height", String(size.height));
    }

    function markRendered(icon) {
        if (icon && icon.classList) {
            icon.classList.add("procedural-icon-ready");
            icon.classList.remove("procedural-icon-fallback");
        }
    }

    function markFallback(icon) {
        if (icon && icon.classList) {
            icon.classList.remove("procedural-icon-ready");
            icon.classList.add("procedural-icon-fallback");
        }
    }

    function setIconRenderState(icon, success) {
        if (success) {
            markRendered(icon);
        } else {
            markFallback(icon);
        }
    }

    function renderTool(card, toolId, engineOverride) {
        var engine = engineOverride || state.engine || (root && root.ProceduralAppearance);
        var id = trimToolId(toolId);
        var icon;
        var canvas;
        var ctx;
        var size;
        var sourceSignature;
        var presentationSignature;
        var themeMap;

        if (state.shuttingDown || !id || !card || !card.parentNode) {
            return false;
        }
        if (!engine || typeof engine.render !== "function") {
            warnOnce("missing-engine", "ProceduralAppearance is not available; using existing Home icon fallback.");
            markFallback(getIconContainer(card));
            return false;
        }
        icon = getIconContainer(card);
        canvas = getOrCreateCanvas(icon);
        if (!canvas || typeof canvas.getContext !== "function") {
            warnOnce("missing-canvas", "Could not create Home icon canvas for " + id + ".");
            markFallback(icon);
            return false;
        }
        ctx = canvas.getContext("2d");
        if (!ctx) {
            warnOnce("missing-context", "Canvas 2D context is unavailable for " + id + ".");
            markFallback(icon);
            return false;
        }
        try {
            size = getIconRenderSize(icon, engine);
            sourceSignature = getSourceSignature(id, size, getIconParams(id, engine));
            presentationSignature = getPresentationSignature(sourceSignature, state.appearance);
            engine.render(canvas, {
                target: ICON_TARGET,
                seed: id,
                params: getIconParams(id, engine),
                logicalWidth: size.logicalWidth,
                logicalHeight: size.logicalHeight,
                clipToCanvas: false
            });
            markCanvasSize(canvas, size);
            if (state.appearance.mode === "themeMapped") {
                themeMap = getThemeMap();
                if (themeMap && typeof themeMap.applyToCanvas === "function") {
                    try {
                        if (!themeMap.applyToCanvas(canvas, state.appearance.darkColor, state.appearance.lightColor, state.appearance.midColor, state.appearance.mappingParams)) {
                            warnOnce("theme-map-unavailable", "Theme-mapped presentation is unavailable; keeping the Colorful source image.");
                        }
                    } catch (mapError) {
                        warnOnce("theme-map-error", "Theme-mapped Home icon presentation failed; keeping the Colorful source image.", mapError);
                    }
                } else {
                    warnOnce("missing-theme-map", "Theme Map is not available; keeping the Colorful source image.");
                }
            }
            markRendered(icon);
            state.rendered[id] = {
                sourceSignature: sourceSignature,
                presentationSignature: presentationSignature
            };
            state.generatedCount += 1;
            return true;
        } catch (error) {
            warnOnce("render-error-" + id, "Failed to render procedural Home icon for " + id + ".", error);
            markFallback(icon);
            return false;
        }
    }

    function scheduleFrame(callback) {
        if (root && typeof root.requestAnimationFrame === "function") {
            return root.requestAnimationFrame(callback);
        }
        return setTimeout(callback, 16);
    }

    function cancelFrame(id) {
        if (id === null || typeof id === "undefined") {
            return;
        }
        if (root && typeof root.cancelAnimationFrame === "function") {
            root.cancelAnimationFrame(id);
        } else {
            clearTimeout(id);
        }
    }

    function processQueue() {
        var count = 0;
        var item;
        state.rafId = null;
        if (state.shuttingDown) {
            state.queue.length = 0;
            state.queued = {};
            return;
        }
        while (count < state.batchSize && state.queue.length) {
            item = state.queue.shift();
            delete state.queued[item.toolId];
            if (item.card && item.card.parentNode) {
                renderTool(item.card, item.toolId);
            }
            count += 1;
        }
        if (state.queue.length) {
            state.rafId = scheduleFrame(processQueue);
        }
    }

    function enqueueCards(cards) {
        var i;
        var item;
        var icon;
        var canvas;
        var engine = state.engine || (root && root.ProceduralAppearance);
        for (i = 0; i < (cards || []).length; i++) {
            item = cards[i];
            if (!item || !item.toolId || state.queued[item.toolId]) {
                continue;
            }
            icon = getIconContainer(item.card);
            canvas = icon ? icon.querySelector(".procedural-home-icon-canvas") : null;
            if (canvas && isCanvasSizeCurrent(canvas, getIconRenderSize(icon, engine))) {
                var size = getIconRenderSize(icon, engine);
                var sourceSignature = getSourceSignature(item.toolId, size, getIconParams(item.toolId));
                var presentationSignature = getPresentationSignature(sourceSignature, state.appearance);
                if (state.rendered[item.toolId] && state.rendered[item.toolId].presentationSignature === presentationSignature) {
                    continue;
                }
            }
            state.queued[item.toolId] = true;
            state.queue[state.queue.length] = item;
        }
        if (state.queue.length && state.rafId === null) {
            state.rafId = scheduleFrame(processQueue);
        }
    }

    function refresh(options) {
        var cards;
        if (state.shuttingDown || (options && options.shuttingDown)) {
            return;
        }
        state.root = (options && options.root) || state.root || (root && root.document);
        cards = collectUniqueToolCards(state.root);
        enqueueCards(cards);
        observeIconShells(cards);
    }

    function scheduleResizeRefresh() {
        if (state.shuttingDown || state.resizeRafId !== null) {
            return;
        }
        state.resizeRafId = scheduleFrame(function () {
            state.resizeRafId = null;
            refresh({ root: state.root });
        });
    }

    function observeIconShells(cards) {
        var ResizeObserverCtor = root && root.ResizeObserver;
        var i;
        var icon;
        if (!ResizeObserverCtor) {
            return;
        }
        if (!state.resizeObserver) {
            state.resizeObserver = new ResizeObserverCtor(function () {
                scheduleResizeRefresh();
            });
        }
        for (i = 0; i < (cards || []).length; i++) {
            icon = getIconContainer(cards[i].card);
            if (icon) {
                state.resizeObserver.observe(icon);
            }
        }
    }

    function initialize(options) {
        options = options || {};
        if (state.initialized) {
            if (typeof options.params !== "undefined") {
                updateParameters(options.params);
            }
            refresh(options);
            return;
        }
        state.initialized = true;
        state.shuttingDown = false;
        state.root = options.root || (root && root.document);
        state.engine = options.engine || (root && root.ProceduralAppearance);
        state.params = normalizeParameters(options.params || {});
        state.batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
        if (!storeSubscriptionBound && root && root.ProceduralPaletteStore && typeof root.ProceduralPaletteStore.subscribe === "function") {
            storeSubscriptionBound = true;
            root.ProceduralPaletteStore.subscribe(function () {
                invalidateRendered();
                refresh({ root: state.root });
            });
        }
        refresh(options);
    }

    function updateAppearance(next) {
        var normalized = normalizeAppearance(next);
        var previous = state.appearance;
        if (previous.mode === normalized.mode && previous.darkColor === normalized.darkColor && previous.midColor === normalized.midColor && previous.lightColor === normalized.lightColor && JSON.stringify(previous.mappingParams) === JSON.stringify(normalized.mappingParams)) {
            return false;
        }
        state.appearance = normalized;
        invalidatePresentation();
        return true;
    }

    function updateParameters(next) {
        var normalized = normalizeParameters(next || {});
        var previous = JSON.stringify(state.params || {});
        state.params = normalized;
        if (previous === JSON.stringify(normalized)) {
            return false;
        }
        invalidateSource();
        return true;
    }

    function teardown() {
        state.shuttingDown = true;
        if (state.rafId !== null) {
            cancelFrame(state.rafId);
            state.rafId = null;
        }
        if (state.resizeRafId !== null) {
            cancelFrame(state.resizeRafId);
            state.resizeRafId = null;
        }
        if (state.resizeObserver && typeof state.resizeObserver.disconnect === "function") {
            state.resizeObserver.disconnect();
        }
        state.queue.length = 0;
        state.queued = {};
        state.resizeObserver = null;
        state.root = null;
        state.engine = null;
        state.params = {};
        state.initialized = false;
        state.appearance = normalizeAppearance({ mode: "colorful" });
    }

    function getStats() {
        return {
            initialized: state.initialized,
            generatedCount: state.generatedCount,
            renderedCount: Object.keys(state.rendered).length,
            queuedCount: state.queue.length
        };
    }

    return {
        resolveToolId: resolveToolId,
        resolveHomePaletteId: resolveHomePaletteId,
        getHomeIconPaletteMap: getHomeIconPaletteMap,
        invalidateRendered: invalidateRendered,
        invalidatePresentation: invalidatePresentation,
        invalidateSource: invalidateSource,
        updateAppearance: updateAppearance,
        updateParameters: updateParameters,
        getAppearance: function () { return normalizeAppearance(state.appearance); },
        getSourceSignature: getSourceSignature,
        getPresentationSignature: getPresentationSignature,
        createIconInput: createIconInput,
        getIconRenderSize: getIconRenderSize,
        setIconRenderState: setIconRenderState,
        collectUniqueToolCards: collectUniqueToolCards,
        uniqueToolIds: uniqueToolIds,
        shouldRenderTool: shouldRenderTool,
        initialize: initialize,
        refresh: refresh,
        renderTool: renderTool,
        teardown: teardown,
        getStats: getStats
    };
}));
