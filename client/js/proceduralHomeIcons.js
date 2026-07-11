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
        generatedCount: 0
    };

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

    function resolveToolId(input) {
        if (!input) {
            return "";
        }
        if (typeof input.getAttribute === "function") {
            return trimToolId(input.getAttribute("data-tool") || input.getAttribute("data-tool-id"));
        }
        return trimToolId(input.toolId || input.id || input.seed);
    }

    function createIconInput(input) {
        var toolId = resolveToolId(input);
        if (!toolId) {
            return null;
        }
        return {
            target: ICON_TARGET,
            seed: toolId,
            params: {}
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
            engine.render(canvas, {
                target: ICON_TARGET,
                seed: id,
                params: {},
                logicalWidth: size.logicalWidth,
                logicalHeight: size.logicalHeight,
                clipToCanvas: false
            });
            markCanvasSize(canvas, size);
            markRendered(icon);
            state.rendered[id] = true;
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
                continue;
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
            refresh(options);
            return;
        }
        state.initialized = true;
        state.shuttingDown = false;
        state.root = options.root || (root && root.document);
        state.engine = options.engine || (root && root.ProceduralAppearance);
        state.batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
        refresh(options);
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
        state.initialized = false;
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
