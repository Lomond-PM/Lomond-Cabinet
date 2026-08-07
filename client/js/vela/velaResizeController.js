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
    var HEIGHT_PREFERENCE_SCHEMA_VERSION = 1;
    var MAX_REASONABLE_PREFERENCE_PX = 100000;

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
        var loadHeightPreference = typeof options.loadHeightPreference === "function" ? options.loadHeightPreference : function () { return null; };
        var saveHeightPreference = typeof options.saveHeightPreference === "function" ? options.saveHeightPreference : function () {};
        var eventTarget = options.eventTarget || null;
        var started = false;
        var suspended = false;
        var disposed = false;
        var dragging = false;
        var pointerId = null;
        var startY = 0;
        var startHeight = 0;
        var pendingHeight = null;
        var preferredHeight = null;
        var dragPreferenceCandidate = null;
        var dragMoved = false;
        var rafId = null;
        var bounds = { min: 0, max: 0 };
        var lastAppliedHeight = null;
        var lastAriaMin = null;
        var lastAriaMax = null;
        var lastAriaNow = null;
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
        function normalizePreference(value) {
            var height = value && value.schemaVersion === HEIGHT_PREFERENCE_SCHEMA_VERSION ? value.heightPx : null;
            return typeof height === "number" && isFinite(height) && height > 0 && height <= MAX_REASONABLE_PREFERENCE_PX ? height : null;
        }
        function normalizeUserPreference(value) {
            return Math.max(1, Math.min(MAX_REASONABLE_PREFERENCE_PX, finite(value, 1)));
        }
        function readPreference() {
            var stored;
            try { stored = loadHeightPreference(); } catch (ignored) { return null; }
            return normalizePreference(stored);
        }
        function persistPreference() {
            if (preferredHeight === null) { return false; }
            try { saveHeightPreference(preferredHeight); return true; } catch (ignored) { return false; }
        }
        function updateAria(value) {
            var min = Math.round(bounds.min);
            var max = Math.round(bounds.max);
            var now = Math.round(value);
            if (lastAriaMin !== min) { handle.setAttribute("aria-valuemin", String(min)); lastAriaMin = min; }
            if (lastAriaMax !== max) { handle.setAttribute("aria-valuemax", String(max)); lastAriaMax = max; }
            if (lastAriaNow !== now) { handle.setAttribute("aria-valuenow", String(now)); lastAriaNow = now; }
        }
        function applyHeight(value) {
            var next = Math.round(clamp(value));
            if (lastAppliedHeight !== next) {
                rootElement.style.setProperty("--vela-surface-height", next + "px");
                lastAppliedHeight = next;
            }
            updateAria(next);
            return next;
        }
        function measureBounds() {
            var s = scale();
            var controlsHeight = Math.max(rectHeight(controls), rectHeight(settings));
            var minimumFixedHeight = rectHeight(composer) + rectHeight(status) + controlsHeight;
            var min = minimumFixedHeight + (TRANSCRIPT_MIN_READABLE_PX * s) + (HOME_VERTICAL_SAFETY_GAP_PX * s);
            var available = rectHeight(homeContainer) - rectHeight(headerElement) - toolPoolMinimumHeight() - (HOME_VERTICAL_SAFETY_GAP_PX * s);
            var measuredMin = Math.max(min, 1);
            return {
                current: getCurrentHeight(),
                min: measuredMin,
                max: Math.max(measuredMin, available)
            };
        }
        function applyMeasurement(measurement) {
            if (!measurement) { return 0; }
            bounds.min = measurement.min;
            bounds.max = measurement.max;
            if (preferredHeight === null) {
                preferredHeight = readPreference();
            }
            return applyHeight(preferredHeight !== null ? preferredHeight : bounds.max * DEFAULT_HEIGHT_RATIO);
        }
        function initializeHeight() {
            return applyMeasurement(measureBounds());
        }
        function refreshBounds() {
            return applyMeasurement(measureBounds());
        }
        function endDrag() {
            if (!dragging) { return; }
            if (dragMoved && dragPreferenceCandidate !== null) {
                preferredHeight = dragPreferenceCandidate;
                applyHeight(preferredHeight);
                persistPreference();
            }
            dragging = false;
            rootElement.classList.remove("is-resizing");
            if (pointerId !== null && typeof handle.releasePointerCapture === "function") {
                try { handle.releasePointerCapture(pointerId); } catch (ignored) {}
            }
            pointerId = null;
            pendingHeight = null;
            dragPreferenceCandidate = null;
            dragMoved = false;
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
            dragPreferenceCandidate = startHeight;
            dragMoved = false;
            rootElement.classList.add("is-resizing");
            if (typeof handle.setPointerCapture === "function" && pointerId !== undefined) {
                try { handle.setPointerCapture(pointerId); } catch (ignored) {}
            }
            if (typeof event.preventDefault === "function") { event.preventDefault(); }
        }
        function onPointerMove(event) {
            if (!dragging || !event || (pointerId !== null && event.pointerId !== undefined && event.pointerId !== pointerId)) { return; }
            dragPreferenceCandidate = normalizeUserPreference(startHeight + (event.clientY - startY));
            dragMoved = true;
            scheduleHeight(dragPreferenceCandidate);
            if (typeof event.preventDefault === "function") { event.preventDefault(); }
        }
        function onKeyDown(event) {
            var step = (event && event.shiftKey ? KEYBOARD_LARGE_STEP_PX : KEYBOARD_STEP_PX) * scale();
            var current = getCurrentHeight();
            if (disposed || suspended || !event) { return; }
            refreshBounds();
            if (event.key === "ArrowUp") { preferredHeight = current - step; }
            else if (event.key === "ArrowDown") { preferredHeight = current + step; }
            else if (event.key === "Home") { preferredHeight = bounds.min; }
            else if (event.key === "End") { preferredHeight = bounds.max; }
            else { return; }
            applyHeight(preferredHeight);
            persistPreference();
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
            if (eventTarget) { add(eventTarget, "blur", endDrag); }
            initializeHeight();
            return true;
        }
        function suspend() { if (disposed || suspended) { return false; } suspended = true; endDrag(); return true; }
        function resume() { if (disposed || !suspended) { return false; } suspended = false; return true; }
        function dispose() {
            if (disposed) { return false; }
            disposed = true;
            endDrag();
            removeAll();
            return true;
        }
        return Object.freeze({ start: start, measureBounds: measureBounds, applyMeasurement: applyMeasurement, refreshBounds: refreshBounds, suspend: suspend, resume: resume, dispose: dispose });
    }

    return Object.freeze({ create: create });
}));
