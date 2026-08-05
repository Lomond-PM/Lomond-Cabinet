(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaSurface")) {
        Object.defineProperty(root, "VelaSurface", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var COMPACT_BREAKPOINT_PX = 520;
    var NARROW_BREAKPOINT_PX = 360;
    var LAYOUT_HYSTERESIS_PX = 12;

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
        var resizeFallback = null;
        var sizeSignalsBound = false;
        var lastLayoutMode = null;
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
                observerFrame = eventTarget.requestAnimationFrame(function () { observerFrame = null; performLayoutRefresh(); });
            } else if (eventTarget && typeof eventTarget.setTimeout === "function") {
                observerFrame = eventTarget.setTimeout(function () { observerFrame = null; performLayoutRefresh(); }, 0);
            } else { performLayoutRefresh(); }
        }
        function layoutWidth(nodeRef) {
            var rect = nodeRef && typeof nodeRef.getBoundingClientRect === "function" ? nodeRef.getBoundingClientRect() : null;
            return Math.max(rect && rect.width || 0, 0);
        }
        function measureLayoutMode() {
            var width;
            var compactAt = COMPACT_BREAKPOINT_PX * scale();
            var narrowAt = NARROW_BREAKPOINT_PX * scale();
            var hysteresis = LAYOUT_HYSTERESIS_PX * scale();
            if (!elements) { return "wide"; }
            width = layoutWidth(rootElement);
            if (lastLayoutMode === "wide") {
                return width < compactAt - hysteresis ? "compact" : "wide";
            }
            if (lastLayoutMode === "compact") {
                if (width >= compactAt + hysteresis) { return "wide"; }
                if (width < narrowAt - hysteresis) { return "narrow"; }
                return "compact";
            }
            if (lastLayoutMode === "narrow") {
                return width >= narrowAt + hysteresis ? "compact" : "narrow";
            }
            if (width < narrowAt) { return "narrow"; }
            if (width < compactAt) { return "compact"; }
            return "wide";
        }
        function applyLayoutMode(mode) {
            if (lastLayoutMode === mode) { return false; }
            rootElement.setAttribute("data-layout", mode);
            lastLayoutMode = mode;
            return true;
        }
        function performLayoutRefresh() {
            var mode;
            var boundsMeasurement;
            if (disposed || suspended || !elements) { return; }
            mode = measureLayoutMode();
            if (applyLayoutMode(mode)) {
                scheduleLayout();
                return;
            }
            boundsMeasurement = resizeController && resizeController.measureBounds ? resizeController.measureBounds() : null;
            if (resizeController && boundsMeasurement) { resizeController.applyMeasurement(boundsMeasurement); }
        }
        function bindSizeSignals() {
            if (sizeSignalsBound || disposed || suspended) { return; }
            if (ResizeObserverCtor) {
                observer = new ResizeObserverCtor(scheduleLayout);
                observer.observe(homeContainer);
                observer.observe(headerElement);
                observer.observe(toolPoolElement);
                observer.observe(elements.controls);
            } else if (eventTarget && typeof eventTarget.addEventListener === "function") {
                resizeFallback = scheduleLayout;
                eventTarget.addEventListener("resize", resizeFallback);
            }
            sizeSignalsBound = true;
        }
        function unbindSizeSignals() {
            if (!sizeSignalsBound) { return; }
            if (observer) { observer.disconnect(); observer = null; }
            if (resizeFallback && eventTarget && typeof eventTarget.removeEventListener === "function") {
                eventTarget.removeEventListener("resize", resizeFallback);
            }
            resizeFallback = null;
            sizeSignalsBound = false;
        }
        function refreshLocale() {
            var completeStatus;
            if (!elements) { return; }
            rootElement.setAttribute("aria-label", t("vela.surfaceLabel"));
            elements.transcriptMessage.textContent = t("vela.surfaceTranscriptIntro");
            elements.composer.setAttribute("placeholder", t("vela.surfaceComposerPlaceholder"));
            elements.statusText.textContent = t("vela.surfaceStatusSetup");
            elements.experimentalText.textContent = t("vela.surfaceExperimentalStatus");
            completeStatus = elements.statusText.textContent === elements.experimentalText.textContent ? elements.statusText.textContent : elements.statusText.textContent + " · " + elements.experimentalText.textContent;
            elements.statusSlot.setAttribute("aria-label", completeStatus);
            elements.statusDot.setAttribute("title", elements.statusText.textContent);
            elements.experimentalText.setAttribute("title", elements.experimentalText.textContent);
            elements.statusSlot.setAttribute("data-detail-empty", elements.experimentalText.textContent ? "false" : "true");
            elements.settingsButton.setAttribute("title", t("vela.surfaceSettings"));
            elements.settingsButton.setAttribute("aria-label", t("vela.surfaceSettings"));
            elements.settingsButton.textContent = t("vela.surfaceSettings");
            elements.handle.setAttribute("aria-label", t("vela.surfaceResize"));
            elements.localToggle.textContent = t("vela.surfaceLocalOpacityOpen");
            elements.localToggle.setAttribute("aria-label", t("vela.surfaceLocalOpacityOpen"));
            elements.localUtility.setAttribute("aria-label", t("vela.surfaceLocalOpacityTitle"));
            elements.localTitle.textContent = t("vela.surfaceLocalOpacityTitle");
            elements.localTargetLabel.textContent = t("vela.surfaceLocalTarget");
            elements.localTypeLabel.textContent = t("vela.surfaceLocalTargetType");
            elements.localCurrentLabel.textContent = t("vela.surfaceLocalCurrentOpacity");
            elements.localInputLabel.textContent = t("vela.surfaceLocalTargetOpacity");
            elements.localInput.setAttribute("placeholder", t("vela.manualOpacityPlaceholder"));
            elements.localRefresh.textContent = t("vela.surfaceLocalRefresh");
            elements.localCreate.textContent = t("vela.surfaceLocalCreateProposal");
            elements.localClose.textContent = t("common.cancel");
            scheduleLayout();
        }
        function refreshLayout() {
            scheduleLayout();
        }
        function mount() {
            var transcriptSlot;
            var transcriptScroll;
            var transcriptMessage;
            var composerSlot;
            var composer;
            var localToolbar;
            var localToggle;
            var localUtility;
            var localHeader;
            var localTitle;
            var localSummary;
            var localTargetLabel;
            var localTargetValue;
            var localTypeLabel;
            var localTypeValue;
            var localCurrentLabel;
            var localCurrentValue;
            var localInputRow;
            var localInputLabel;
            var localInput;
            var localValidation;
            var localNotice;
            var localActions;
            var localRefresh;
            var localCreate;
            var localClose;
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
            localToolbar = node("div", "vela-local-toolbar");
            localToggle = node("button", "panel-button secondary-action vela-local-toggle");
            localToggle.type = "button";
            localToggle.setAttribute("aria-expanded", "false");
            localToolbar.appendChild(localToggle);
            localUtility = node("section", "vela-local-opacity-utility");
            localUtility.hidden = true;
            localHeader = node("div", "vela-local-header");
            localTitle = node("strong", "vela-local-title");
            localHeader.appendChild(localTitle);
            localUtility.appendChild(localHeader);
            localSummary = node("div", "vela-local-summary");
            localTargetLabel = node("span", "vela-local-label");
            localTargetValue = node("span", "vela-local-value");
            localTypeLabel = node("span", "vela-local-label");
            localTypeValue = node("span", "vela-local-value");
            localCurrentLabel = node("span", "vela-local-label");
            localCurrentValue = node("span", "vela-local-value");
            localSummary.appendChild(localTargetLabel);
            localSummary.appendChild(localTargetValue);
            localSummary.appendChild(localTypeLabel);
            localSummary.appendChild(localTypeValue);
            localSummary.appendChild(localCurrentLabel);
            localSummary.appendChild(localCurrentValue);
            localUtility.appendChild(localSummary);
            localInputRow = node("div", "vela-local-input-row");
            localInputLabel = node("label", "vela-local-label");
            localInputLabel.htmlFor = "velaSurfaceLocalOpacityInput";
            localInput = node("input", "registry-text-input registry-number-input vela-local-opacity-input");
            localInput.id = "velaSurfaceLocalOpacityInput";
            localInput.type = "number";
            localInput.min = "0";
            localInput.max = "100";
            localInput.step = "0.1";
            localInput.setAttribute("aria-describedby", "velaSurfaceLocalOpacityValidation");
            localInputRow.appendChild(localInputLabel);
            localInputRow.appendChild(localInput);
            localUtility.appendChild(localInputRow);
            localValidation = node("p", "vela-local-validation");
            localValidation.id = "velaSurfaceLocalOpacityValidation";
            localValidation.setAttribute("aria-live", "polite");
            localUtility.appendChild(localValidation);
            localNotice = node("p", "vela-local-notice");
            localNotice.setAttribute("aria-live", "polite");
            localUtility.appendChild(localNotice);
            localActions = node("div", "vela-local-actions");
            localRefresh = node("button", "panel-button secondary-action");
            localRefresh.type = "button";
            localCreate = node("button", "panel-button primary-action");
            localCreate.type = "button";
            localClose = node("button", "panel-button secondary-action");
            localClose.type = "button";
            localActions.appendChild(localRefresh);
            localActions.appendChild(localCreate);
            localActions.appendChild(localClose);
            localUtility.appendChild(localActions);
            composer = node("textarea", "vela-composer-input");
            composer.readOnly = composerReadOnly;
            composer.setAttribute("aria-readonly", composerReadOnly ? "true" : "false");
            composer.setAttribute("rows", "2");
            composerSlot.appendChild(localToolbar);
            composerSlot.appendChild(localUtility);
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
            handle = node("div", "vela-resize-handle");
            handle.setAttribute("role", "separator");
            handle.setAttribute("aria-orientation", "horizontal");
            handle.setAttribute("tabindex", "0");
            grip = node("span", "vela-resize-grip");
            grip.setAttribute("aria-hidden", "true");
            handle.appendChild(grip);
            rootElement.appendChild(transcriptSlot);
            rootElement.appendChild(composerSlot);
            controls.appendChild(statusSlot);
            controls.appendChild(actionSlot);
            rootElement.appendChild(controls);
            rootElement.appendChild(handle);
            mountElement.appendChild(rootElement);
            elements = { root: rootElement, transcriptSlot: transcriptSlot, transcriptScroll: transcriptScroll, transcriptMessage: transcriptMessage, composerSlot: composerSlot, composer: composer, localToolbar: localToolbar, localToggle: localToggle, localUtility: localUtility, localTitle: localTitle, localTargetLabel: localTargetLabel, localTargetValue: localTargetValue, localTypeLabel: localTypeLabel, localTypeValue: localTypeValue, localCurrentLabel: localCurrentLabel, localCurrentValue: localCurrentValue, localInputLabel: localInputLabel, localInput: localInput, localValidation: localValidation, localNotice: localNotice, localRefresh: localRefresh, localCreate: localCreate, localClose: localClose, statusSlot: statusSlot, statusDot: statusDot, statusText: statusText, experimentalText: experimentalText, controls: controls, settingsSlot: settingsSlot, settingsButton: settingsButton, actionSlot: actionSlot, handle: handle, grip: grip };
            settingsHandler = function () { openSettings(); };
            settingsButton.addEventListener("click", settingsHandler);
            resizeController = ResizeController.create({ root: rootElement, handle: handle, transcript: transcriptScroll, composer: composerSlot, status: statusSlot, controls: controls, settings: settingsSlot, homeContainer: homeContainer, headerElement: headerElement, toolPoolElement: toolPoolElement, getUiScale: getUiScale, eventTarget: eventTarget });
            resizeController.start();
            mounted = true;
            bindSizeSignals();
            refreshLocale();
            return true;
        }
        function suspend() {
            if (disposed || !mounted || suspended) { return false; }
            suspended = true;
            rootElement.classList.add("is-suspended");
            if (resizeController) { resizeController.suspend(); }
            cancelObserverFrame();
            unbindSizeSignals();
            return true;
        }
        function resume() {
            if (disposed || !mounted || !suspended) { return false; }
            suspended = false;
            rootElement.classList.remove("is-suspended");
            if (resizeController) { resizeController.resume(); }
            bindSizeSignals();
            scheduleLayout();
            return true;
        }
        function getElementsForTest() { return elements; }
        function dispose() {
            if (disposed) { return false; }
            disposed = true;
            cancelObserverFrame();
            unbindSizeSignals();
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
