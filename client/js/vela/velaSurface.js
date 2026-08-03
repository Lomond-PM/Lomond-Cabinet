(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaSurface")) {
        Object.defineProperty(root, "VelaSurface", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var LAYOUT_SAFETY_GAP_PX = 16;
    var STATUS_MIN_VISIBLE_CHARS = 8;

    function create(options) {
        options = options || {};
        var mountElement = options.mountElement;
        var homeContainer = options.homeContainer;
        var headerElement = options.headerElement;
        var toolPoolElement = options.toolPoolElement;
        var openSettings = typeof options.openSettings === "function" ? options.openSettings : function () {};
        var t = typeof options.t === "function" ? options.t : function (key) { return key; };
        var getUiScale = typeof options.getUiScale === "function" ? options.getUiScale : function () { return 1; };
        var composerReadOnly = options.composerReadOnly !== false;
        var ResizeController = options.ResizeController;
        var ResizeObserverCtor = options.ResizeObserver || (typeof ResizeObserver !== "undefined" ? ResizeObserver : null);
        var eventTarget = options.eventTarget || null;
        var rootElement = null;
        var elements = null;
        var resizeController = null;
        var observer = null;
        var observerFrame = null;
        var mounted = false;
        var suspended = false;
        var disposed = false;
        var settingsHandler = null;

        if (!mountElement || !homeContainer || !headerElement || !toolPoolElement || !ResizeController || typeof ResizeController.create !== "function") {
            throw new Error("VelaSurface requires Home layout dependencies.");
        }

        function node(tag, className, text) {
            var value = mountElement.ownerDocument.createElement(tag);
            if (className) { value.className = className; }
            if (text !== undefined) { value.textContent = text; }
            return value;
        }
        function scale() { var value = Number(getUiScale()); return typeof value === "number" && isFinite(value) && value > 0 ? value : 1; }
        function cancelObserverFrame() {
            if (observerFrame === null) { return; }
            if (eventTarget && typeof eventTarget.cancelAnimationFrame === "function") { eventTarget.cancelAnimationFrame(observerFrame); }
            else if (eventTarget && typeof eventTarget.clearTimeout === "function") { eventTarget.clearTimeout(observerFrame); }
            observerFrame = null;
        }
        function scheduleLayout() {
            if (disposed || suspended || observerFrame !== null) { return; }
            if (eventTarget && typeof eventTarget.requestAnimationFrame === "function") {
                observerFrame = eventTarget.requestAnimationFrame(function () { observerFrame = null; refreshLayout(); });
            } else if (eventTarget && typeof eventTarget.setTimeout === "function") {
                observerFrame = eventTarget.setTimeout(function () { observerFrame = null; refreshLayout(); }, 0);
            } else { refreshLayout(); }
        }
        function contentWidth(nodeRef) {
            var rect = nodeRef && typeof nodeRef.getBoundingClientRect === "function" ? nodeRef.getBoundingClientRect() : null;
            return Math.max(nodeRef && nodeRef.scrollWidth || 0, rect && rect.width || 0, nodeRef && nodeRef.offsetWidth || 0, 0);
        }
        function updateLayoutMode() {
            var controlsWidth;
            var settingsWidth;
            var statusWidth;
            var requiredWidth;
            if (!elements) { return; }
            controlsWidth = contentWidth(elements.controls);
            settingsWidth = contentWidth(elements.settingsButton);
            statusWidth = Math.max(contentWidth(elements.statusDot) + Math.min(contentWidth(elements.statusText), STATUS_MIN_VISIBLE_CHARS * 8 * scale()), 1);
            requiredWidth = settingsWidth + statusWidth + (LAYOUT_SAFETY_GAP_PX * scale());
            rootElement.classList.toggle("is-narrow", controlsWidth > 0 && controlsWidth < requiredWidth);
        }
        function refreshLocale() {
            if (!elements) { return; }
            rootElement.setAttribute("aria-label", t("vela.surfaceLabel"));
            elements.transcriptMessage.textContent = t("vela.surfaceTranscriptIntro");
            elements.composer.setAttribute("placeholder", t("vela.surfaceComposerPlaceholder"));
            elements.statusText.textContent = t("vela.surfaceStatusSetup");
            elements.experimentalText.textContent = t("vela.surfaceExperimentalStatus");
            elements.settingsButton.setAttribute("title", t("vela.surfaceSettings"));
            elements.settingsButton.setAttribute("aria-label", t("vela.surfaceSettings"));
            elements.settingsButton.textContent = t("vela.surfaceSettings");
            elements.handle.setAttribute("aria-label", t("vela.surfaceResize"));
            updateLayoutMode();
        }
        function refreshLayout() {
            if (disposed || !elements) { return; }
            updateLayoutMode();
            if (resizeController) { resizeController.refreshBounds(); }
        }
        function mount() {
            var transcriptSlot;
            var transcriptScroll;
            var transcriptMessage;
            var composerSlot;
            var composer;
            var statusSlot;
            var statusDot;
            var statusText;
            var controls;
            var settingsSlot;
            var settingsButton;
            var actionSlot;
            var handle;
            var grip;
            if (disposed || mounted) { return false; }
            rootElement = node("section", "vela-surface");
            rootElement.id = "velaSurface";
            rootElement.setAttribute("data-vela-surface", "true");
            transcriptSlot = node("div", "vela-transcript-slot");
            transcriptScroll = node("div", "vela-transcript-scroll");
            transcriptScroll.setAttribute("tabindex", "0");
            transcriptMessage = node("p", "vela-transcript-intro");
            transcriptScroll.appendChild(transcriptMessage);
            transcriptSlot.appendChild(transcriptScroll);
            composerSlot = node("div", "vela-composer-slot");
            composer = node("textarea", "vela-composer-input");
            composer.readOnly = composerReadOnly;
            composer.setAttribute("aria-readonly", composerReadOnly ? "true" : "false");
            composer.setAttribute("rows", "2");
            composerSlot.appendChild(composer);
            statusSlot = node("div", "vela-status-slot");
            statusSlot.setAttribute("role", "status");
            statusSlot.setAttribute("aria-live", "polite");
            statusSlot.setAttribute("aria-atomic", "true");
            statusDot = node("span", "vela-status-dot");
            statusDot.setAttribute("aria-hidden", "true");
            statusText = node("span", "vela-status-text");
            var experimentalText = node("span", "vela-experimental-status");
            statusSlot.appendChild(statusDot);
            statusSlot.appendChild(statusText);
            statusSlot.appendChild(experimentalText);
            controls = node("div", "vela-bottom-controls");
            settingsSlot = node("div", "vela-settings-slot");
            settingsButton = node("button", "panel-button vela-settings-button");
            settingsButton.type = "button";
            settingsSlot.appendChild(settingsButton);
            actionSlot = node("div", "vela-action-slot");
            controls.appendChild(settingsSlot);
            controls.appendChild(actionSlot);
            handle = node("div", "vela-resize-handle");
            handle.setAttribute("role", "separator");
            handle.setAttribute("aria-orientation", "horizontal");
            handle.setAttribute("tabindex", "0");
            grip = node("span", "vela-resize-grip");
            grip.setAttribute("aria-hidden", "true");
            handle.appendChild(grip);
            rootElement.appendChild(transcriptSlot);
            rootElement.appendChild(composerSlot);
            rootElement.appendChild(statusSlot);
            rootElement.appendChild(controls);
            rootElement.appendChild(handle);
            mountElement.appendChild(rootElement);
            elements = { root: rootElement, transcriptSlot: transcriptSlot, transcriptScroll: transcriptScroll, transcriptMessage: transcriptMessage, composerSlot: composerSlot, composer: composer, statusSlot: statusSlot, statusDot: statusDot, statusText: statusText, experimentalText: experimentalText, controls: controls, settingsSlot: settingsSlot, settingsButton: settingsButton, actionSlot: actionSlot, handle: handle, grip: grip };
            settingsHandler = function () { openSettings(); };
            settingsButton.addEventListener("click", settingsHandler);
            resizeController = ResizeController.create({ root: rootElement, handle: handle, transcript: transcriptScroll, composer: composerSlot, status: statusSlot, controls: controls, settings: settingsSlot, homeContainer: homeContainer, headerElement: headerElement, toolPoolElement: toolPoolElement, getUiScale: getUiScale, eventTarget: eventTarget });
            resizeController.start();
            if (ResizeObserverCtor) {
                observer = new ResizeObserverCtor(scheduleLayout);
                observer.observe(rootElement);
                observer.observe(controls);
            }
            mounted = true;
            refreshLocale();
            refreshLayout();
            return true;
        }
        function suspend() {
            if (disposed || !mounted || suspended) { return false; }
            suspended = true;
            rootElement.classList.add("is-suspended");
            if (resizeController) { resizeController.suspend(); }
            cancelObserverFrame();
            return true;
        }
        function resume() {
            if (disposed || !mounted || !suspended) { return false; }
            suspended = false;
            rootElement.classList.remove("is-suspended");
            if (resizeController) { resizeController.resume(); }
            refreshLayout();
            return true;
        }
        function getElementsForTest() { return elements; }
        function dispose() {
            if (disposed) { return false; }
            disposed = true;
            cancelObserverFrame();
            if (observer) { observer.disconnect(); observer = null; }
            if (resizeController) { resizeController.dispose(); resizeController = null; }
            if (elements && settingsHandler) { elements.settingsButton.removeEventListener("click", settingsHandler); }
            if (rootElement && rootElement.parentNode) { rootElement.parentNode.removeChild(rootElement); }
            settingsHandler = null;
            elements = null;
            rootElement = null;
            return true;
        }
        return Object.freeze({ mount: mount, resume: resume, suspend: suspend, refreshLayout: refreshLayout, refreshLocale: refreshLocale, getElementsForTest: getElementsForTest, dispose: dispose });
    }

    return Object.freeze({ create: create });
}));
