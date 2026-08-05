(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaResizeController")) {
        Object.defineProperty(root, "VelaResizeController", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var DEFAULT_HEIGHT_RATIO = 0.46;
    var TRANSCRIPT_MIN_READABLE_PX = 72;
    var HOME_VERTICAL_SAFETY_GAP_PX = 12;
    var KEYBOARD_STEP_PX = 12;
    var KEYBOARD_LARGE_STEP_PX = 36;
    var TOOL_POOL_FALLBACK_CARD_HEIGHT_PX = 124;

    function finite(value, fallback) {
        return typeof value === "number" && isFinite(value) ? value : fallback;
    }

    function rectHeight(node) {
        var rect;
        if (!node) { return 0; }
        if (typeof node.getBoundingClientRect === "function") {
            rect = node.getBoundingClientRect();
            if (rect && finite(rect.height, 0) > 0) { return rect.height; }
        }
        return finite(node.offsetHeight, finite(node.clientHeight, 0));
    }

    function create(options) {
        options = options || {};
        var rootElement = options.root;
        var handle = options.handle;
        var transcript = options.transcript;
        var composer = options.composer;
        var status = options.status;
        var controls = options.controls;
        var settings = options.settings;
        var homeContainer = options.homeContainer;
        var headerElement = options.headerElement;
        var toolPoolElement = options.toolPoolElement;
        var getUiScale = typeof options.getUiScale === "function" ? options.getUiScale : function () { return 1; };
        var ResizeObserverCtor = options.ResizeObserver || (typeof ResizeObserver !== "undefined" ? ResizeObserver : null);
        var eventTarget = options.eventTarget || null;
        var observer = null;
        var started = false;
        var suspended = false;
        var disposed = false;
        var dragging = false;
        var pointerId = null;
        var startY = 0;
        var startHeight = 0;
        var pendingHeight = null;
        var rafId = null;
        var bounds = { min: 0, max: 0 };
        var listeners = [];

        if (!rootElement || !handle || !transcript || !composer || !status || !controls || !homeContainer || !headerElement || !toolPoolElement) {
            throw new Error("VelaResizeController requires surface layout elements.");
        }

        function scale() { return Math.max(0.5, finite(Number(getUiScale()), 1)); }
        function add(node, type, handler) { node.addEventListener(type, handler); listeners.push({ node: node, type: type, handler: handler }); }
        function removeAll() { while (listeners.length) { var item = listeners.pop(); item.node.removeEventListener(item.type, item.handler); } }
        function requestFrame(fn) {
            if (eventTarget && typeof eventTarget.requestAnimationFrame === "function") { return eventTarget.requestAnimationFrame(fn); }
            return eventTarget && typeof eventTarget.setTimeout === "function" ? eventTarget.setTimeout(fn, 0) : null;
        }
        function cancelFrame(id) {
            if (id === null) { return; }
            if (eventTarget && typeof eventTarget.cancelAnimationFrame === "function") { eventTarget.cancelAnimationFrame(id); }
            else if (eventTarget && typeof eventTarget.clearTimeout === "function") { eventTarget.clearTimeout(id); }
        }
        function toolPoolMinimumHeight() {
            var first = toolPoolElement.children && toolPoolElement.children.length ? toolPoolElement.children[0] : null;
            return Math.max(rectHeight(first), TOOL_POOL_FALLBACK_CARD_HEIGHT_PX * scale());
        }
        function getCurrentHeight() {
            var measured = rectHeight(rootElement);
            return measured > 0 ? measured : 0;
        }
        function clamp(value) { return Math.max(bounds.min, Math.min(bounds.max, value)); }
        function updateAria(value) {
            handle.setAttribute("aria-valuemin", String(Math.round(bounds.min)));
            handle.setAttribute("aria-valuemax", String(Math.round(bounds.max)));
            handle.setAttribute("aria-valuenow", String(Math.round(value)));
        }
        function applyHeight(value) {
            var next = clamp(value);
            rootElement.style.setProperty("--vela-surface-height", Math.round(next) + "px");
            updateAria(next);
            return next;
        }
        function computeBounds() {
            var s = scale();
            var controlsHeight = Math.max(rectHeight(controls), rectHeight(settings));
            var minimumFixedHeight = rectHeight(composer) + rectHeight(status) + controlsHeight;
            var min = minimumFixedHeight + (TRANSCRIPT_MIN_READABLE_PX * s) + (HOME_VERTICAL_SAFETY_GAP_PX * s);
            var available = rectHeight(homeContainer) - rectHeight(headerElement) - toolPoolMinimumHeight() - (HOME_VERTICAL_SAFETY_GAP_PX * s);
            bounds.min = Math.max(min, 1);
            bounds.max = Math.max(bounds.min, available);
            return bounds;
        }
        function initializeHeight() {
            var current;
            computeBounds();
            current = getCurrentHeight();
            if (!(current > 0)) { current = bounds.max * DEFAULT_HEIGHT_RATIO; }
            return applyHeight(current);
        }
        function refreshBounds() {
            var current = getCurrentHeight();
            computeBounds();
            return applyHeight(current > 0 ? current : bounds.max * DEFAULT_HEIGHT_RATIO);
        }
        function endDrag() {
            if (!dragging) { return; }
            dragging = false;
            rootElement.classList.remove("is-resizing");
            if (pointerId !== null && typeof handle.releasePointerCapture === "function") {
                try { handle.releasePointerCapture(pointerId); } catch (ignored) {}
            }
            pointerId = null;
            pendingHeight = null;
            if (rafId !== null) { cancelFrame(rafId); rafId = null; }
        }
        function scheduleHeight(value) {
            pendingHeight = value;
            if (rafId !== null) { return; }
            rafId = requestFrame(function () {
                rafId = null;
                if (pendingHeight !== null && !disposed) { applyHeight(pendingHeight); }
            });
        }
        function isInteractiveTarget(target) {
            var node = target;
            var tagName;
            var role;
            while (node) {
                tagName = typeof node.tagName === "string" ? node.tagName.toLowerCase() : "";
                role = typeof node.getAttribute === "function" ? node.getAttribute("role") : null;
                if (tagName === "button" || tagName === "textarea" || tagName === "input" || tagName === "a" || tagName === "select" || role === "button") {
                    return true;
                }
                if (node === handle) { return false; }
                node = node.parentNode;
            }
            return false;
        }
        function onPointerDown(event) {
            if (disposed || suspended || !event || typeof event.clientY !== "number" || isInteractiveTarget(event.target)) { return; }
            refreshBounds();
            dragging = true;
            pointerId = event.pointerId;
            startY = event.clientY;
            startHeight = getCurrentHeight();
            rootElement.classList.add("is-resizing");
            if (typeof handle.setPointerCapture === "function" && pointerId !== undefined) {
                try { handle.setPointerCapture(pointerId); } catch (ignored) {}
            }
            if (typeof event.preventDefault === "function") { event.preventDefault(); }
        }
        function onPointerMove(event) {
            if (!dragging || !event || (pointerId !== null && event.pointerId !== undefined && event.pointerId !== pointerId)) { return; }
            scheduleHeight(startHeight + (event.clientY - startY));
            if (typeof event.preventDefault === "function") { event.preventDefault(); }
        }
        function onKeyDown(event) {
            var step = (event && event.shiftKey ? KEYBOARD_LARGE_STEP_PX : KEYBOARD_STEP_PX) * scale();
            var current = getCurrentHeight();
            if (disposed || suspended || !event) { return; }
            refreshBounds();
            if (event.key === "ArrowUp") { applyHeight(current - step); }
            else if (event.key === "ArrowDown") { applyHeight(current + step); }
            else if (event.key === "Home") { applyHeight(bounds.min); }
            else if (event.key === "End") { applyHeight(bounds.max); }
            else { return; }
            if (typeof event.preventDefault === "function") { event.preventDefault(); }
        }
        function start() {
            if (disposed || started) { return false; }
            started = true;
            suspended = false;
            add(handle, "pointerdown", onPointerDown);
            add(handle, "pointermove", onPointerMove);
            add(handle, "pointerup", endDrag);
            add(handle, "pointercancel", endDrag);
            add(handle, "lostpointercapture", endDrag);
            add(handle, "keydown", onKeyDown);
            if (eventTarget) { add(eventTarget, "blur", endDrag); add(eventTarget, "resize", refreshBounds); }
            if (ResizeObserverCtor) {
                observer = new ResizeObserverCtor(function () {
                    if (!disposed && !suspended) { refreshBounds(); }
                });
                observer.observe(homeContainer);
                observer.observe(headerElement);
                observer.observe(toolPoolElement);
            }
            initializeHeight();
            return true;
        }
        function suspend() { if (disposed || suspended) { return false; } suspended = true; endDrag(); return true; }
        function resume() { if (disposed || !suspended) { return false; } suspended = false; refreshBounds(); return true; }
        function dispose() {
            if (disposed) { return false; }
            disposed = true;
            endDrag();
            if (observer) { observer.disconnect(); observer = null; }
            removeAll();
            return true;
        }
        return Object.freeze({ start: start, refreshBounds: refreshBounds, suspend: suspend, resume: resume, dispose: dispose });
    }

    return Object.freeze({ create: create });
}));
