(function () {
    "use strict";

    if (window.I18n) {
        window.I18n.init();
    }

    var cs = new CSInterface();
    var hostLoaded = false;
    var statusTimer = null;
    var motionScale = 1;
    var animationWarmupDone = false;
    var activeToolId = "shapeAdd";
    var Motion = {
        appleOut: "cubic-bezier(0.16, 1, 0.3, 1)",
        appleStandard: "cubic-bezier(0.22, 1, 0.36, 1)",
        appleIn: "cubic-bezier(0.32, 0, 0.67, 0)",
        press: "cubic-bezier(0.2, 0, 0, 1)",
        fast: 160,
        normal: 260,
        launch: 480,
        close: 360
    };
    var StorageKeys = {
        ecommerce: "AEToolbox.ecommerceLayout.v1",
        settings: "AEToolbox.settings.v1",
        background: "AEToolbox.background.v1",
        backgroundCollapsed: "AEToolbox.backgroundSettingsCollapsed.v1",
        language: "aeToolbox.language",
        homeOrder: "aeToolbox.homeToolOrder",
        colorPickerAxis: "AEToolbox.colorPicker.axisMode.v1"
    };
    var ToolRegistry = {
        ecommerceLayout: {
            title: "Ad Component Kit",
            description: "Ad Component Kit",
            selectionMode: "layers"
        },
        shapeAdd: {
            title: "Shape Add",
            description: "Shape Add",
            selectionMode: "shape"
        }
    };
    var DynamicTools = {};
    var DynamicToolOrder = [];
    var RegistryToolState = {};
    var RegistrySaveTimers = {};
    var ProceduralPreviewTimers = {};
    var ProceduralPreviewWarnings = {};
    var ProceduralPreviewLastInputKeys = {};
    var PaletteWorkspaceController = null;
    var RegistryRuntimeStates = {};
    var CustomSelectGlobalListenersBound = false;
    var PanelLifecycleListenersBound = false;
    var panelShuttingDown = false;
    var panelSuspended = false;
    var selectionPollTimer = null;
    var ThemeSettingsStoreListener = null;
    var DefaultSettings = {
        motionSpeed: 1,
        uiScale: 0.92,
        themeAccent: "#d6b25e",
        homeBackground: "#050403",
        toolIconColor: "#15120c",
        toolIconLine: "#fff0be",
        proceduralIconMode: "colorful",
        toolIconDarkSourceMode: "manualEndpoints",
        toolIconDarkPaletteId: "",
        homeIconRadius: 25.5,
        homeDragShadowIntensity: 1,
        autoStatus: true,
        registryDebugTools: false
    };
    var BackgroundEngine = {
        defaults: {
            preset: "blackGold",
            baseColor: "#050403",
            secondaryColor: "#11100c",
            accentColor: "#d6b25e",
            accent2Color: "#755f2a",
            lineColor: "#d6b25e",
            glowColor: "#d6b25e",
            glowOpacity: 0.22,
            glowSize: 80,
            glowX: 74,
            glowY: 18,
            gridOpacity: 0.12,
            gridSize: 36,
            lineOpacity: 0.18,
            ringOpacity: 0.1,
            ringScale: 1,
            accentAngle: 135,
            patternDensity: 1,
            contrast: 0.45,
            motionEnable: false,
            motionSpeed: 1,
            motionAmount: 0.35
        },
        presets: {
            blackGold: {
                baseColor: "#050403", secondaryColor: "#11100c", accentColor: "#d6b25e", accent2Color: "#755f2a", lineColor: "#d6b25e", glowColor: "#d6b25e",
                glowOpacity: 0.22, glowSize: 80, glowX: 74, glowY: 18, gridOpacity: 0.12, gridSize: 36, lineOpacity: 0.18, ringOpacity: 0.1, ringScale: 1, accentAngle: 135, patternDensity: 1, contrast: 0.45, motionEnable: false, motionSpeed: 1, motionAmount: 0.35
            },
            solarGrid: {
                baseColor: "#060403", secondaryColor: "#1a1205", accentColor: "#e0b85f", accent2Color: "#8f611f", lineColor: "#d8aa4c", glowColor: "#e0b85f",
                glowOpacity: 0.34, glowSize: 92, glowX: 62, glowY: 34, gridOpacity: 0.28, gridSize: 28, lineOpacity: 0.22, ringOpacity: 0.08, ringScale: 0.9, accentAngle: 112, patternDensity: 1.35, contrast: 0.55, motionEnable: true, motionSpeed: 0.85, motionAmount: 0.36
            },
            obsidianRings: {
                baseColor: "#030303", secondaryColor: "#0d0b0a", accentColor: "#b99756", accent2Color: "#2f2a22", lineColor: "#a88b4e", glowColor: "#7a642f",
                glowOpacity: 0.13, glowSize: 58, glowX: 22, glowY: 80, gridOpacity: 0.02, gridSize: 54, lineOpacity: 0.08, ringOpacity: 0.27, ringScale: 1.45, accentAngle: 30, patternDensity: 0.82, contrast: 0.36, motionEnable: false, motionSpeed: 1.1, motionAmount: 0.28
            },
            midnightBlueprint: {
                baseColor: "#03070d", secondaryColor: "#07111c", accentColor: "#bda35d", accent2Color: "#2d6f9f", lineColor: "#4f86a8", glowColor: "#2d6f9f",
                glowOpacity: 0.18, glowSize: 76, glowX: 18, glowY: 28, gridOpacity: 0.18, gridSize: 32, lineOpacity: 0.16, ringOpacity: 0.12, ringScale: 1.1, accentAngle: 152, patternDensity: 1.2, contrast: 0.42, motionEnable: true, motionSpeed: 1.05, motionAmount: 0.25
            },
            minimalDark: {
                baseColor: "#020202", secondaryColor: "#060504", accentColor: "#7d6a3a", accent2Color: "#11100d", lineColor: "#5e522f", glowColor: "#7d6a3a",
                glowOpacity: 0.06, glowSize: 52, glowX: 78, glowY: 18, gridOpacity: 0.01, gridSize: 64, lineOpacity: 0.03, ringOpacity: 0.02, ringScale: 1, accentAngle: 135, patternDensity: 0.6, contrast: 0.18, motionEnable: false, motionSpeed: 1.2, motionAmount: 0.1
            }
        },
        state: null
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function tr(key, params) {
        if (window.I18n && window.I18n.t) {
            return window.I18n.t(key, params);
        }
        return key;
    }

    function toolText(meta, keyName, fallbackName, defaultValue) {
        if (meta && meta[keyName]) {
            return tr(meta[keyName]);
        }
        return (meta && meta[fallbackName]) || defaultValue || "";
    }

    function applyI18n(root) {
        if (window.I18n && window.I18n.applyToDOM) {
            window.I18n.applyToDOM(root || document);
        }
    }

    function inferredMessageKey(message) {
        var normalized = String(message || "").toLowerCase();
        if (!normalized) {
            return "";
        }
        if (normalized.indexOf("no active composition") >= 0 ||
                normalized.indexOf("no active comp") >= 0) {
            return "status.noActiveComp";
        }
        if (normalized.indexOf("select at least one text layer") >= 0 ||
                normalized.indexOf("no selected text") >= 0) {
            return "status.noTextLayer";
        }
        if (normalized.indexOf("select at least one layer") >= 0 ||
                normalized.indexOf("no selected layer") >= 0) {
            return "status.noLayer";
        }
        if (normalized.indexOf("please select a shape layer") >= 0) {
            return "status.selectShapeLayer";
        }
        return "";
    }

    function resultMessage(result, fallbackKey, fallbackParams) {
        var inferredKey;
        if (result && result.messageKey) {
            return tr(result.messageKey, result);
        }
        inferredKey = inferredMessageKey(result && result.message);
        if (inferredKey) {
            return tr(inferredKey, result || {});
        }
        if (result && result.message) {
            return result.message;
        }
        return tr(fallbackKey || "status.ready", fallbackParams || result || {});
    }

    function actionMessage(result, successKey, fallbackKey) {
        if (result && result.messageKey) {
            return tr(result.messageKey, result);
        }
        if (result && result.ok && successKey) {
            return tr(successKey, result);
        }
        return resultMessage(result, fallbackKey || successKey || "status.ready");
    }

    function duration(name) {
        return Math.max(80, Math.round(Motion[name] * motionScale));
    }

    function loadStoredJson(key, fallback) {
        var raw;
        try {
            raw = window.localStorage.getItem(key);
            if (!raw) {
                return fallback;
            }
            return JSON.parse(raw);
        } catch (err) {
            return fallback;
        }
    }

    function saveStoredJson(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
        }
    }

    function eventPoint(event) {
        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    function hasAncestorWithClass(node, className, stopNode) {
        while (node && node !== stopNode) {
            if (node.classList && node.classList.contains(className)) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    function uiDebug(message, data) {
        if (window.AETOOLBOX_DEBUG_UI === true && window.console && console.log) {
            if (typeof data !== "undefined") {
                console.log("[AE Toolbox UI] " + message, data);
            } else {
                console.log("[AE Toolbox UI] " + message);
            }
        }
    }

    function lifecycleDebug(message, data) {
        if ((window.AETOOLBOX_DEBUG_UI === true || window.AETOOLBOX_DEBUG_REGISTRY === true) && window.console && console.log) {
            if (typeof data !== "undefined") {
                console.log("[AE Toolbox Lifecycle] " + message, data);
            } else {
                console.log("[AE Toolbox Lifecycle] " + message);
            }
        }
    }

    var HomeLayoutManager = {
        toolOrder: [],
        isEditing: false,
        dragState: null,
        globalEventsBound: false,
        initialized: false,
        transientTimers: [],
        globalDragHandlers: null,

        init: function () {
            if (panelShuttingDown) {
                lifecycleDebug("skipped home init because panelShuttingDown");
                return;
            }
            this.loadOrder();
            this.renderOrder();
            this.bindIconEvents();
            this.initialized = true;
        },

        getToolButtons: function () {
            var nodes = document.querySelectorAll("#toolGrid .tool-app[data-tool]");
            var tools = [];
            var i;
            for (i = 0; i < nodes.length; i++) {
                if (!nodes[i].disabled && !nodes[i].classList.contains("is-disabled")) {
                    tools[tools.length] = nodes[i];
                }
            }
            return tools;
        },

        getButtonByToolId: function (toolId) {
            return document.querySelector('#toolGrid .tool-app[data-tool="' + toolId + '"]');
        },

        getLayoutCenter: function (toolButton) {
            var parent = toolButton ? toolButton.offsetParent : null;
            var parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
            return {
                x: parentRect.left + toolButton.offsetLeft + toolButton.offsetWidth / 2,
                y: parentRect.top + toolButton.offsetTop + toolButton.offsetHeight / 2
            };
        },

        getDefaultOrder: function () {
            var tools = this.getToolButtons();
            var order = [];
            var i;
            for (i = 0; i < tools.length; i++) {
                order[order.length] = tools[i].getAttribute("data-tool");
            }
            return order;
        },

        loadOrder: function () {
            var saved = loadStoredJson(StorageKeys.homeOrder, null);
            var defaults = this.getDefaultOrder();
            var valid = [];
            var seen = {};
            var i;
            var id;

            if (saved && saved.length) {
                for (i = 0; i < saved.length; i++) {
                    id = saved[i];
                    if (!seen[id] && this.getButtonByToolId(id)) {
                        valid[valid.length] = id;
                        seen[id] = true;
                    }
                }
            }

            for (i = 0; i < defaults.length; i++) {
                id = defaults[i];
                if (!seen[id]) {
                    valid[valid.length] = id;
                    seen[id] = true;
                }
            }

            this.toolOrder = valid;
        },

        saveOrder: function () {
            if (panelShuttingDown) {
                lifecycleDebug("skipped home layout save because panelShuttingDown");
                return;
            }
            saveStoredJson(StorageKeys.homeOrder, this.toolOrder);
        },

        renderOrder: function () {
            var grid = byId("toolGrid");
            var more = grid ? grid.querySelector(".tool-app.is-disabled") : null;
            var i;
            var button;

            if (panelShuttingDown) {
                lifecycleDebug("skipped home render because panelShuttingDown");
                return;
            }
            if (!grid) {
                return;
            }

            for (i = 0; i < this.toolOrder.length; i++) {
                button = this.getButtonByToolId(this.toolOrder[i]);
                if (button) {
                    grid.insertBefore(button, more);
                }
            }
        },

        enterEditMode: function () {
            var home = byId("homeView");
            var tools = this.getToolButtons();
            var editButton = byId("editHomeBtn");
            var i;

            if (panelShuttingDown) {
                return;
            }
            if (this.isEditing) {
                return;
            }
            uiDebug("enterHomeEditMode");
            this.isEditing = true;
            home.classList.add("home-editing");
            if (editButton) {
                editButton.textContent = tr("common.done");
                editButton.setAttribute("aria-label", tr("common.done"));
            }
            setStatus(tr("status.homeEditing"));
        },

        exitEditMode: function (options) {
            var home = byId("homeView");
            var tools = this.getToolButtons();
            var editButton = byId("editHomeBtn");
            var save = options && options.save === true;
            var announce = !options || options.announce !== false;
            var i;

            if (panelShuttingDown) {
                save = false;
                announce = false;
            }
            uiDebug("exitHomeEditMode", { save: save });
            this.isEditing = false;
            home.classList.remove("home-editing");
            if (editButton) {
                editButton.textContent = tr("common.editHome");
                editButton.setAttribute("aria-label", tr("common.editHome"));
            }
            for (i = 0; i < tools.length; i++) {
                tools[i].classList.remove("is-dragging", "is-reordering");
                tools[i].style.transform = "";
            }
            if (save) {
                this.saveOrder();
                if (announce) {
                    setStatus(tr("status.homeLayoutSaved"));
                }
            } else if (announce) {
                setStatus(tr("status.ready"));
            }
        },

        commitEditMode: function () {
            if (panelShuttingDown) {
                lifecycleDebug("skipped home layout save because panelShuttingDown");
                this.exitEditMode({ save: false, announce: false });
                return;
            }
            uiDebug("saveHomeLayout");
            this.exitEditMode({ save: true, announce: true });
        },

        trackTimer: function (timer) {
            if (timer) {
                this.transientTimers[this.transientTimers.length] = timer;
            }
            return timer;
        },

        clearTransientTimers: function () {
            var i;
            for (i = 0; i < this.transientTimers.length; i++) {
                window.clearTimeout(this.transientTimers[i]);
            }
            this.transientTimers = [];
            if (this.dragState && this.dragState.longPressTimer) {
                window.clearTimeout(this.dragState.longPressTimer);
                this.dragState.longPressTimer = null;
            }
            lifecycleDebug("home timers cleared");
        },

        cancelDragForShutdown: function () {
            var state = this.dragState;
            var home = byId("homeView");
            var current;
            var i;

            if (state && state.longPressTimer) {
                window.clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }
            if (state && state.placeholder && state.placeholder.parentNode) {
                if (state.button && state.placeholder.parentNode) {
                    state.placeholder.parentNode.insertBefore(state.button, state.placeholder);
                }
                state.placeholder.parentNode.removeChild(state.placeholder);
            }
            if (state && state.button) {
                state.button.classList.remove("is-dragging", "is-reordering", "is-pressed");
                state.button.style.position = "";
                state.button.style.left = "";
                state.button.style.top = "";
                state.button.style.width = "";
                state.button.style.height = "";
                state.button.style.transform = "";
                state.button.style.willChange = "";
            }
            current = document.querySelectorAll("#toolGrid .tool-app.is-reordering, #toolGrid .tool-app.is-dragging, #toolGrid .tool-app.is-pressed");
            for (i = 0; i < current.length; i++) {
                current[i].classList.remove("is-reordering", "is-dragging", "is-pressed");
                current[i].style.transform = "";
            }
            if (home) {
                home.classList.remove("home-editing", "is-dragging", "is-opening", "is-returning");
            }
            this.dragState = null;
        },

        removeGlobalDragListeners: function () {
            if (this.globalDragHandlers) {
                document.removeEventListener(this.globalDragHandlers.moveEvent, this.globalDragHandlers.move);
                document.removeEventListener(this.globalDragHandlers.endEvent, this.globalDragHandlers.end);
                this.globalDragHandlers = null;
                this.globalEventsBound = false;
            }
        },

        teardownForShutdown: function () {
            lifecycleDebug("home teardown start");
            this.clearTransientTimers();
            this.cancelDragForShutdown();
            this.removeGlobalDragListeners();
            this.isEditing = false;
            lifecycleDebug("home listeners removed");
            lifecycleDebug("observers disconnected");
            lifecycleDebug("home teardown done");
        },

        bindIconEvents: function () {
            var tools = this.getToolButtons();
            var self = this;
            var hasPointer = !!window.PointerEvent;
            var startEvent = hasPointer ? "pointerdown" : "mousedown";
            var moveEvent = hasPointer ? "pointermove" : "mousemove";
            var endEvent = hasPointer ? "pointerup" : "mouseup";
            var i;

            for (i = 0; i < tools.length; i++) {
                if (tools[i].getAttribute("data-home-events-bound") === "true") {
                    continue;
                }
                tools[i].setAttribute("data-home-events-bound", "true");
                tools[i].addEventListener(startEvent, function (event) {
                    if (panelShuttingDown) {
                        return;
                    }
                    self.startDrag(event, event.currentTarget);
                });
                tools[i].addEventListener("click", function (event) {
                    if (panelShuttingDown) {
                        return;
                    }
                    event.preventDefault();
                });
            }

            if (this.globalEventsBound) {
                return;
            }
            this.globalEventsBound = true;

            byId("editHomeBtn").addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (panelShuttingDown) {
                    return;
                }
                uiDebug("Edit Home click", { isEditing: self.isEditing });
                if (self.isEditing) {
                    self.commitEditMode();
                } else {
                    self.enterEditMode();
                }
            });
            byId("homeView").addEventListener("click", function (event) {
                if (panelShuttingDown) {
                    return;
                }
                if (!self.isEditing || self.dragState) {
                    return;
                }
                if (hasAncestorWithClass(event.target, "tool-app", this) ||
                        hasAncestorWithClass(event.target, "home-edit-button", this) ||
                        hasAncestorWithClass(event.target, "settings-entry", this)) {
                    return;
                }
                self.exitEditMode({ save: false, announce: true });
            });
            this.globalDragHandlers = {
                moveEvent: moveEvent,
                endEvent: endEvent,
                move: function (event) {
                    if (panelShuttingDown) {
                        return;
                    }
                    self.updateDrag(event);
                },
                end: function (event) {
                    if (panelShuttingDown) {
                        return;
                    }
                    self.endDrag(event);
                }
            };
            document.addEventListener(moveEvent, this.globalDragHandlers.move);
            document.addEventListener(endEvent, this.globalDragHandlers.end);
        },

        startDrag: function (event, toolButton) {
            var point;
            var self = this;
            var rect;

            if (panelShuttingDown) {
                return;
            }
            if (typeof event.button !== "undefined" && event.button !== 0) {
                return;
            }
            if (byId("appShell").classList.contains("is-animating")) {
                return;
            }
            if (!toolButton || toolButton.disabled || toolButton.classList.contains("is-disabled")) {
                return;
            }

            event.preventDefault();
            closeCustomSelectMenus();
            point = eventPoint(event);
            rect = toolButton.getBoundingClientRect();
            this.dragState = {
                button: toolButton,
                toolId: toolButton.getAttribute("data-tool"),
                startX: point.x,
                startY: point.y,
                pointerX: point.x,
                pointerY: point.y,
                startLeft: rect.left,
                startTop: rect.top,
                width: rect.width,
                height: rect.height,
                offsetX: point.x - rect.left,
                offsetY: point.y - rect.top,
                isDragging: false,
                moved: false,
                rafPending: false,
                placeholder: null,
                cachedTargets: [],
                startIndex: this.toolOrder.indexOf(toolButton.getAttribute("data-tool")),
                currentIndex: this.toolOrder.indexOf(toolButton.getAttribute("data-tool")),
                lastTargetIndex: -1,
                lastReorderTime: 0,
                longPressTimer: null
            };

            if (this.isEditing) {
                return;
            }

            this.dragState.longPressTimer = this.trackTimer(window.setTimeout(function () {
                if (panelShuttingDown) {
                    return;
                }
                if (self.dragState && !self.dragState.moved) {
                    self.enterEditMode();
                    self.beginDragging();
                }
            }, 520));
        },

        beginDragging: function () {
            var state = this.dragState;
            if (panelShuttingDown) {
                return;
            }
            if (!state || state.isDragging) {
                return;
            }
            state.isDragging = true;
            this.createPlaceholder(state);
            state.button.classList.add("is-dragging");
            byId("homeView").classList.add("is-dragging");
            state.button.style.left = state.startLeft + "px";
            state.button.style.top = state.startTop + "px";
            state.button.style.width = state.width + "px";
            state.button.style.height = state.height + "px";
            this.cacheDropTargets();
            this.scheduleDragFrame();
        },

        updateDrag: function (event) {
            var state = this.dragState;
            var point;
            var dx;
            var dy;
            var targetIndex;

            if (panelShuttingDown) {
                return;
            }
            if (!state) {
                return;
            }

            point = eventPoint(event);
            dx = point.x - state.startX;
            dy = point.y - state.startY;
            state.pointerX = point.x;
            state.pointerY = point.y;

            if (Math.sqrt(dx * dx + dy * dy) > 6) {
                state.moved = true;
                if (state.longPressTimer) {
                    window.clearTimeout(state.longPressTimer);
                    state.longPressTimer = null;
                }
            }

            if (!this.isEditing) {
                return;
            }

            if (!state.isDragging && state.moved) {
                this.beginDragging();
            }
            if (!state.isDragging) {
                return;
            }

            this.scheduleDragFrame();
        },

        scheduleDragFrame: function () {
            var state = this.dragState;
            var self = this;

            if (panelShuttingDown) {
                return;
            }
            if (!state || state.rafPending) {
                return;
            }
            state.rafPending = true;
            nextFrame(function () {
                if (!panelShuttingDown) {
                    self.processDragFrame();
                }
            });
        },

        processDragFrame: function () {
            var state = this.dragState;
            var targetIndex;
            var now;

            if (panelShuttingDown) {
                return;
            }
            if (!state || !state.button) {
                return;
            }

            state.rafPending = false;
            this.updateDraggedTransform();

            now = new Date().getTime();
            if (now - state.lastReorderTime < 100) {
                return;
            }

            targetIndex = this.getToolIndexFromPoint(state.pointerX, state.pointerY);
            if (targetIndex < 0 || targetIndex === state.currentIndex || targetIndex === state.lastTargetIndex) {
                return;
            }

            state.lastTargetIndex = targetIndex;
            state.lastReorderTime = now;
            this.reorderTool(state.currentIndex, targetIndex);
        },

        updateDraggedTransform: function () {
            var state = this.dragState;
            var x;
            var y;

            if (!state || !state.button) {
                return;
            }

            x = state.pointerX - state.offsetX - state.startLeft;
            y = state.pointerY - state.offsetY - state.startTop;
            state.button.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(1.04)";
        },

        endDrag: function (event) {
            var state = this.dragState;
            var shouldOpen;

            if (panelShuttingDown) {
                return;
            }
            if (!state) {
                return;
            }

            if (state.longPressTimer) {
                window.clearTimeout(state.longPressTimer);
                state.longPressTimer = null;
            }

            shouldOpen = !this.isEditing && !state.moved && !state.isDragging;

            this.finishDragging();
            if (this.isEditing) {
                this.saveOrder();
            }
            this.dragState = null;

            if (shouldOpen) {
                openToolWithLaunchTransition(state.button, state.toolId);
            }
        },

        createPlaceholder: function (state) {
            var placeholder = document.createElement("div");
            placeholder.className = "tool-placeholder";
            placeholder.style.width = state.button.offsetWidth + "px";
            placeholder.style.height = state.button.offsetHeight + "px";
            state.button.parentNode.insertBefore(placeholder, state.button);
            state.placeholder = placeholder;
        },

        finishDragging: function () {
            var state = this.dragState;
            var more;

            if (!state || !state.button) {
                return;
            }

            if (state.placeholder && state.placeholder.parentNode) {
                state.placeholder.parentNode.insertBefore(state.button, state.placeholder);
                state.placeholder.parentNode.removeChild(state.placeholder);
            }

            state.button.classList.remove("is-dragging", "is-reordering");
            state.button.style.position = "";
            state.button.style.left = "";
            state.button.style.top = "";
            state.button.style.width = "";
            state.button.style.height = "";
            state.button.style.transform = "";
            state.button.style.willChange = "";
            byId("homeView").classList.remove("is-dragging");
            if (panelShuttingDown) {
                return;
            }
            more = byId("toolGrid").querySelector(".tool-app.is-disabled");
            byId("toolGrid").insertBefore(state.button, more);
            this.renderOrder();
        },

        cacheDropTargets: function () {
            var state = this.dragState;
            var nodes = document.querySelectorAll("#toolGrid .tool-app[data-tool]:not(.is-disabled)");
            var targets = [];
            var i;
            var rect;
            var id;

            if (!state) {
                return;
            }

            for (i = 0; i < nodes.length; i++) {
                if (nodes[i].classList.contains("is-dragging")) {
                    continue;
                }
                id = nodes[i].getAttribute("data-tool");
                rect = nodes[i].getBoundingClientRect();
                targets[targets.length] = {
                    id: id,
                    rect: rect,
                    centerX: rect.left + rect.width / 2,
                    centerY: rect.top + rect.height / 2
                };
            }
            state.cachedTargets = targets;
        },

        getToolIndexFromPoint: function (x, y) {
            var state = this.dragState;
            var targets = state ? state.cachedTargets : [];
            var i;
            var target;
            var dragCenterX;
            var dragCenterY;
            var dx;
            var dy;
            var after;
            var arr;
            var targetIndex;

            if (!state) {
                return -1;
            }

            dragCenterX = x - state.offsetX + state.width / 2;
            dragCenterY = y - state.offsetY + state.height / 2;

            for (i = 0; i < targets.length; i++) {
                target = targets[i];
                dx = dragCenterX - target.centerX;
                dy = dragCenterY - target.centerY;

                if (Math.abs(dx) > target.rect.width * 0.46 || Math.abs(dy) > target.rect.height * 0.46) {
                    continue;
                }

                arr = this.toolOrder.slice(0);
                arr.splice(state.currentIndex, 1);
                targetIndex = arr.indexOf(target.id);
                if (targetIndex < 0) {
                    return -1;
                }
                after = dragCenterY > target.centerY + target.rect.height * 0.18 ||
                    (Math.abs(dy) <= target.rect.height * 0.18 && dragCenterX > target.centerX);
                return targetIndex + (after ? 1 : 0);
            }
            return -1;
        },

        reorderTool: function (fromIndex, toIndex) {
            var grid = byId("toolGrid");
            var before = {};
            var tools = this.getToolButtons();
            var moving;
            var i;
            var id;
            var rect;
            var more;
            var afterRect;
            var dx;
            var dy;

            if (panelShuttingDown) {
                return;
            }
            if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
                return;
            }
            if (!this.dragState || toIndex === this.dragState.currentIndex) {
                return;
            }

            for (i = 0; i < tools.length; i++) {
                id = tools[i].getAttribute("data-tool");
                if (tools[i].classList.contains("is-dragging")) {
                    continue;
                }
                before[id] = tools[i].getBoundingClientRect();
            }

            moving = this.toolOrder.splice(fromIndex, 1)[0];
            toIndex = Math.max(0, Math.min(toIndex, this.toolOrder.length));
            this.toolOrder.splice(toIndex, 0, moving);
            this.dragState.currentIndex = toIndex;
            this.renderOrderDuringDrag();

            tools = this.getToolButtons();
            for (i = 0; i < tools.length; i++) {
                id = tools[i].getAttribute("data-tool");
                if (!before[id] || tools[i].classList.contains("is-dragging")) {
                    continue;
                }
                rect = before[id];
                afterRect = tools[i].getBoundingClientRect();
                dx = rect.left - afterRect.left;
                dy = rect.top - afterRect.top;
                if (dx || dy) {
                    tools[i].classList.add("is-reordering");
                    tools[i].style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
                    tools[i].offsetWidth;
                    tools[i].style.transform = "";
                }
            }

            this.trackTimer(window.setTimeout(function () {
                if (panelShuttingDown) {
                    return;
                }
                var current = document.querySelectorAll("#toolGrid .tool-app.is-reordering");
                for (i = 0; i < current.length; i++) {
                    current[i].classList.remove("is-reordering");
                }
            }, duration("normal") + 30));

            this.cacheDropTargets();
            this.updateDraggedTransform();
        },

        renderOrderDuringDrag: function () {
            var state = this.dragState;
            var grid = byId("toolGrid");
            var more = grid ? grid.querySelector(".tool-app.is-disabled") : null;
            var i;
            var id;
            var button;

            if (panelShuttingDown) {
                lifecycleDebug("skipped home render because panelShuttingDown");
                return;
            }
            if (!state || !grid) {
                return;
            }

            for (i = 0; i < this.toolOrder.length; i++) {
                id = this.toolOrder[i];
                if (id === state.toolId) {
                    grid.insertBefore(state.placeholder, more);
                } else {
                    button = this.getButtonByToolId(id);
                    if (button) {
                        grid.insertBefore(button, more);
                    }
                }
            }
            grid.insertBefore(state.button, more);
        },

        resetHomeLayout: function () {
            if (panelShuttingDown) {
                lifecycleDebug("skipped home layout save because panelShuttingDown");
                return;
            }
            this.toolOrder = this.getDefaultOrder();
            this.renderOrder();
            this.saveOrder();
        }
    };

    function beginAnimation() {
        byId("appShell").classList.add("is-animating");
    }

    function endAnimation() {
        byId("appShell").classList.remove("is-animating");
    }

    function warmUpAnimationPipeline() {
        var probe;
        var animation;

        if (animationWarmupDone) {
            return;
        }
        animationWarmupDone = true;

        try {
            probe = document.createElement("div");
            probe.className = "animation-warmup-probe";

            function cleanup() {
                if (probe && probe.parentNode) {
                    probe.parentNode.removeChild(probe);
                }
                probe = null;
            }

            document.body.appendChild(probe);

            if (probe.animate) {
                animation = probe.animate([
                    { opacity: "0", transform: "translateZ(0) scale(0.95)" },
                    { opacity: "0", transform: "translateZ(0) scale(1)" }
                ], {
                    duration: 100,
                    easing: Motion.appleOut,
                    fill: "none"
                });
                animation.onfinish = cleanup;
                animation.oncancel = cleanup;
                return;
            }

            window.setTimeout(cleanup, 100);
        } catch (err) {
            if (probe && probe.parentNode) {
                probe.parentNode.removeChild(probe);
            }
        }
    }

    function setStatus(message, type, sticky) {
        var pill = byId("statusPill");
        byId("statusText").textContent = message || tr("status.ready");
        pill.classList.remove("is-error", "is-busy");

        if (statusTimer) {
            window.clearTimeout(statusTimer);
            statusTimer = null;
        }

        if (type === "error") {
            pill.classList.add("is-error");
        } else if (type === "busy") {
            pill.classList.add("is-busy");
        }

        pill.classList.add("is-visible");
    }

    function jsxQuote(value) {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, "\\\"")
            .replace(/'/g, "\\'")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n");
    }

    function evalHost(code, callback) {
        if (panelShuttingDown) {
            if (callback) {
                callback('{"ok":false,"message":"Panel runtime is shutting down."}');
            }
            return;
        }
        if (!hostLoaded && code.indexOf("$.evalFile") !== 0) {
            setStatus(tr("status.hostLoading"), "busy", true);
        }
        cs.evalScript(code, callback || function () {});
    }

    function parseResult(raw) {
        if (!raw) {
            return { ok: false, messageKey: "status.noResponse", message: tr("status.noResponse") };
        }
        if (raw === "EvalScript error.") {
            return { ok: false, message: raw };
        }
        try {
            return JSON.parse(raw);
        } catch (err) {
            return { ok: false, message: raw };
        }
    }

    function getToolMeta(toolId) {
        return DynamicTools[toolId] || ToolRegistry[toolId] || ToolRegistry.shapeAdd;
    }

    function isDynamicTool(toolId) {
        return !!DynamicTools[toolId];
    }

    function isDeveloperRegistryTool(tool) {
        var id;
        var titleKey;
        var descriptionKey;
        var haystack;

        if (!tool) {
            return false;
        }
        if (tool.debugOnly === true || tool.developerOnly === true || tool.category === "debug") {
            return true;
        }

        id = String(tool.id || "");
        titleKey = String(tool.titleKey || "");
        descriptionKey = String(tool.descriptionKey || "");
        haystack = (id + " " + titleKey + " " + descriptionKey).toLowerCase();
        return haystack.indexOf("probe") !== -1 ||
            haystack.indexOf("lab") !== -1 ||
            haystack.indexOf("test") !== -1 ||
            haystack.indexOf("debug") !== -1 ||
            haystack.indexOf("controllab") !== -1;
    }

    function renderDynamicToolHome() {
        var grid = byId("toolGrid");
        var more = grid ? grid.querySelector(".tool-app.is-disabled") : null;
        var oldTools;
        var i;
        var tool;
        var button;
        var icon;
        var title;

        if (panelShuttingDown) {
            lifecycleDebug("skipped home render because panelShuttingDown");
            return;
        }
        if (!grid) {
            return;
        }

        oldTools = grid.querySelectorAll(".tool-app[data-dynamic-tool='true']");
        for (i = 0; i < oldTools.length; i++) {
            oldTools[i].parentNode.removeChild(oldTools[i]);
        }

        for (i = 0; i < DynamicToolOrder.length; i++) {
            tool = DynamicTools[DynamicToolOrder[i]];
            if (!tool || tool.hidden || (isDeveloperRegistryTool(tool) && window.AETOOLBOX_DEBUG_REGISTRY !== true)) {
                continue;
            }
            if (grid.querySelector(".tool-app[data-tool='" + tool.id + "']:not([data-dynamic-tool='true'])")) {
                continue;
            }
            button = document.createElement("button");
            button.type = "button";
            button.className = "tool-app app-card";
            button.setAttribute("data-tool", tool.id);
            button.setAttribute("data-dynamic-tool", "true");

            icon = document.createElement("span");
            icon.className = "tool-icon registry-tool-icon";
            icon.textContent = tool.iconText || (tr(tool.titleKey || "").charAt(0) || "T");

            title = document.createElement("span");
            title.className = "app-card-title";
            title.setAttribute("data-tool-title", tool.id);
            title.textContent = tr(tool.titleKey || tool.id);

            button.appendChild(icon);
            button.appendChild(title);
            grid.insertBefore(button, more);
        }
        refreshProceduralHomeIcons();
    }

    function refreshProceduralHomeIcons() {
        if (panelShuttingDown) {
            return;
        }
        if (window.ProceduralHomeIcons && typeof window.ProceduralHomeIcons.refresh === "function") {
            window.ProceduralHomeIcons.refresh({
                root: byId("toolGrid"),
                shuttingDown: panelShuttingDown
            });
        }
    }

    function applyRegistryDebugTools(enabled) {
        window.AETOOLBOX_DEBUG_REGISTRY = enabled === true;
        if (byId("registryDebugTools")) {
            byId("registryDebugTools").checked = window.AETOOLBOX_DEBUG_REGISTRY === true;
        }
        syncSettingsDeveloperOnlyFields();
        if (panelShuttingDown) {
            lifecycleDebug("skipped home render because panelShuttingDown");
            return;
        }
        if (!HomeLayoutManager || !HomeLayoutManager.initialized) {
            return;
        }
        renderDynamicToolHome();
        if (HomeLayoutManager && HomeLayoutManager.loadOrder) {
            HomeLayoutManager.loadOrder();
            HomeLayoutManager.renderOrder();
            HomeLayoutManager.bindIconEvents();
        }
        refreshProceduralHomeIcons();
    }

    function findSettingsSchemaField(key) {
        var schema = window.AEToolboxSettingsSchema;
        var sections = schema && schema.sections ? schema.sections : [];
        var i;
        var j;
        var fields;
        for (i = 0; i < sections.length; i++) {
            fields = sections[i] && sections[i].fields ? sections[i].fields : [];
            for (j = 0; j < fields.length; j++) {
                if (fields[j] && fields[j].key === key) {
                    return fields[j];
                }
            }
        }
        return null;
    }

    function findSettingsSchemaSection(id) {
        var schema = window.AEToolboxSettingsSchema;
        var sections = schema && schema.sections ? schema.sections : [];
        var i;
        for (i = 0; i < sections.length; i++) {
            if (sections[i] && sections[i].id === id) {
                return sections[i];
            }
        }
        return null;
    }

    function createSettingsSectionMount(id, className) {
        var section = document.createElement("section");
        section.id = id;
        section.className = className || "settings-section";
        return section;
    }

    function renderSettingsContent() {
        var content = document.querySelector(".settings-content");
        var renderer;
        if (!content) {
            return;
        }
        content.innerHTML = "";
        content.classList.remove("settings-renderer");
        renderer = document.createElement("div");
        renderer.className = "settings-renderer";
        renderer.appendChild(createSettingsSectionMount("settingsLanguageMount", "settings-section"));
        renderer.appendChild(createSettingsSectionMount("settingsDeveloperModeMount", "settings-section"));
        renderer.appendChild(createSettingsSectionMount("settingsMotionMount", "settings-section"));
        renderer.appendChild(createSettingsSectionMount("settingsThemeMount", "settings-section"));
        renderer.appendChild(createSettingsSectionMount("settingsPaletteLibraryMount", "settings-section settings-section--palette-library"));
        renderer.appendChild(createSettingsSectionMount("backgroundSettingsCard", "settings-section settings-section--background settings-section--collapsible collapsible-card"));
        content.appendChild(renderer);
    }

    function createSettingsSectionHeader(overlineKey, titleKey, descriptionKey) {
        var heading = document.createElement("div");
        var copy = document.createElement("span");
        var title = document.createElement("h3");
        var description;

        heading.className = "settings-section-header";
        copy.className = "settings-section-copy";
        title.className = "registry-title-primary settings-section-title";
        title.setAttribute("data-i18n", titleKey);
        title.textContent = tr(titleKey);
        copy.appendChild(title);
        if (descriptionKey) {
            description = document.createElement("small");
            description.className = "registry-section-description registry-text-muted settings-section-description";
            description.setAttribute("data-i18n", descriptionKey);
            description.textContent = tr(descriptionKey);
            copy.appendChild(description);
        }
        heading.appendChild(copy);
        return heading;
    }

    function createSettingsFieldCopy(labelKey, descriptionKey, fallbackDescription) {
        var copy = document.createElement("span");
        var label = document.createElement("strong");
        var hint = document.createElement("small");

        copy.className = "registry-label-column settings-field-copy";
        label.className = "control-label registry-text-body settings-field-label";
        label.setAttribute("data-i18n", labelKey);
        label.textContent = tr(labelKey);
        hint.className = "registry-field-hint registry-text-muted settings-field-description";
        if (descriptionKey) {
            hint.setAttribute("data-i18n", descriptionKey);
            hint.textContent = tr(descriptionKey);
        } else {
            hint.textContent = fallbackDescription || "";
        }
        copy.appendChild(label);
        if (descriptionKey || fallbackDescription) {
            copy.appendChild(hint);
        }
        return copy;
    }

    function createSettingsGroupLabel(labelKey) {
        var label = document.createElement("div");
        label.className = "settings-group-label";
        label.setAttribute("data-i18n", labelKey);
        label.textContent = tr(labelKey);
        return label;
    }

    function createSharedSettingsFieldRow(type, field, descriptionKey, fallbackDescription) {
        var row = document.createElement(type === "checkbox" ? "label" : "div");
        var copy = createSettingsFieldCopy(field.labelKey, descriptionKey || field.descriptionKey || field.hintKey, fallbackDescription || "");
        var controls = document.createElement("span");

        row.className = type === "checkbox" ? "switch-row registry-switch-row settings-field settings-field--switch" : "control-row registry-field-row settings-field settings-field--" + type;
        controls.className = "control-inputs settings-field-control";
        row.appendChild(copy);
        row.appendChild(controls);
        return {
            row: row,
            controls: controls
        };
    }

    function getProceduralPaletteOptions() {
        var store = window.ProceduralPaletteStore;
        var palettes;
        if (!store || typeof store.listResolvedPalettes !== "function") {
            return [{ value: "", labelKey: "settings.palette.none" }];
        }
        try {
            palettes = store.listResolvedPalettes(false) || [];
        } catch (error) {
            return [{ value: "", labelKey: "settings.palette.none" }];
        }
        palettes = palettes.map(function (palette) {
            return {
                value: palette.id,
                labelText: palette.displayName || palette.id
            };
        });
        return palettes.length ? palettes : [{ value: "", labelKey: "settings.palette.none" }];
    }

    function getSettingsFieldOptions(field) {
        if (field && field.optionsProvider === "proceduralPalettes") {
            return getProceduralPaletteOptions();
        }
        return field && field.options ? field.options : [];
    }

    function appendSettingsSelectOptions(select, field, selectedValue) {
        var options = getSettingsFieldOptions(field);
        var option;
        var i;
        select.innerHTML = "";
        for (i = 0; i < options.length; i++) {
            option = document.createElement("option");
            option.value = options[i].value;
            if (options[i].labelKey) {
                option.setAttribute("data-i18n", options[i].labelKey);
                option.textContent = tr(options[i].labelKey);
            } else {
                option.textContent = options[i].labelText || (options[i].value === "zh-CN" ? "\u7b80\u4f53\u4e2d\u6587" : (options[i].value === "en" ? "English" : options[i].value));
            }
            if (options[i].value === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        if (!select.value && options.length) {
            select.value = options[0].value;
        }
    }

    function createSharedSettingsSelect(id, field, selectedValue) {
        var select = document.createElement("select");

        select.id = id;
        select.className = "select-input settings-select";
        appendSettingsSelectOptions(select, field, selectedValue);
        return select;
    }

    function createSharedSettingsSwitch(id, checked) {
        var switchWrap = document.createElement("span");
        var input = document.createElement("input");
        var track = document.createElement("span");

        switchWrap.className = "switch registry-switch settings-switch";
        input.id = id;
        input.type = "checkbox";
        input.checked = checked === true;
        track.className = "switch-track";
        switchWrap.appendChild(input);
        switchWrap.appendChild(track);
        return switchWrap;
    }

    function dispatchSettingsControlEvent(element, type) {
        var event;
        if (!element) {
            return;
        }
        event = document.createEvent("HTMLEvents");
        event.initEvent(type, true, false);
        element.dispatchEvent(event);
    }

    function bindHexInputSelectBehavior(input) {
        if (!input || input.getAttribute("data-hex-select-bound") === "true") {
            return;
        }
        input.setAttribute("data-hex-select-bound", "true");

        function selectSoon() {
            window.setTimeout(function () {
                if (document.activeElement === input && input.select) {
                    try {
                        input.select();
                    } catch (err) {
                    }
                }
            }, 0);
        }

        input.addEventListener("focus", selectSoon);
        input.addEventListener("click", function () {
            if (document.activeElement === input) {
                selectSoon();
            }
        });
    }

    function createSharedSettingsRangeNumber(field, rangeId, numberId, minValue, maxValue, rangeHookClass, numberHookClass) {
        var controls = document.createElement("span");
        var range = document.createElement("input");
        var number = document.createElement("input");
        var dragField = {
            min: minValue,
            max: maxValue,
            step: field.step,
            defaultValue: field.defaultValue
        };

        controls.className = "control-inputs settings-field-control registry-range-control";
        range.id = rangeId;
        range.className = "pill-slider registry-range settings-slider" + (rangeHookClass ? " " + rangeHookClass : "");
        range.type = "range";
        range.min = String(minValue);
        range.max = String(maxValue);
        range.step = String(field.step);
        range.value = String(field.defaultValue);

        number.id = numberId;
        number.className = "num-input registry-range-number settings-number" + (numberHookClass ? " " + numberHookClass : "");
        number.type = "number";
        number.min = String(minValue);
        number.max = String(maxValue);
        number.step = String(field.step);
        number.value = String(field.defaultValue);

        controls.appendChild(number);
        controls.appendChild(range);
        setupRegistryNumberDrag(number, dragField, function (value) {
            range.value = value;
            dispatchSettingsControlEvent(number, "input");
            dispatchSettingsControlEvent(number, "change");
        });
        return controls;
    }

    function createSharedSettingsColorControl(field, inputId, fallbackColor, shellClassName) {
        var controls = document.createElement("span");
        var shell = document.createElement("button");
        var input = document.createElement("input");
        var hexInput = document.createElement("input");
        var fallback = fallbackColor || "#ffffff";

        controls.className = "control-inputs settings-field-control registry-color-control settings-color-control";
        shell.className = "registry-color-swatch settings-color-pill" + (shellClassName ? " " + shellClassName : "");
        shell.type = "button";
        shell.setAttribute("aria-label", tr(field.labelKey));
        shell.setAttribute("data-color-target", inputId);
        input.id = inputId;
        input.className = "native-color-input";
        input.type = "hidden";
        input.value = normalizeHex(field.defaultValue, fallback);
        hexInput.id = inputId + "Hex";
        hexInput.className = "registry-color-hex settings-color-hex";
        hexInput.type = "text";
        hexInput.value = input.value;
        hexInput.setAttribute("spellcheck", "false");
        bindHexInputSelectBehavior(hexInput);

        function syncColorUi(value) {
            var previous = input.value || fallback;
            var normalized = normalizeHex(value, previous || fallback).toLowerCase();
            input.value = normalized;
            hexInput.value = normalized;
            shell.style.backgroundColor = normalized;
            return normalized;
        }

        function applyHex(value) {
            var normalized = syncColorUi(value);
            if (BackgroundEngine.handleColorChange(inputId, normalized)) {
                return;
            }
            if (inputId === "themeAccent") {
                applyThemeAccent(normalized);
                saveSettings();
            } else if (inputId === "homeBackground") {
                applyHomeBackground(normalized);
                saveSettings();
            } else if (inputId === "toolIconColor" || inputId === "toolIconLine") {
                if (inputId === "toolIconColor") {
                    applyToolIconTheme(normalized, byId("toolIconLine").value);
                } else {
                    applyToolIconTheme(byId("toolIconColor").value, normalized);
                }
                saveSettings();
            }
        }

        hexInput._registryOnValueChange = function () {
            applyHex(hexInput.value);
        };
        hexInput.addEventListener("input", function () {
            if (/^#?[0-9a-fA-F]{6}$/.test(this.value)) {
                applyHex(this.value);
            }
        });
        hexInput.addEventListener("change", function () {
            applyHex(this.value);
        });
        hexInput.addEventListener("blur", function () {
            applyHex(this.value);
        });
        hexInput.addEventListener("keydown", function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                applyHex(this.value);
                this.blur();
            } else if (event.keyCode === 27) {
                event.preventDefault();
                this.value = input.value || fallback;
                this.blur();
            }
        });
        shell.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            openRegistryColorPicker(hexInput, shell, fallback);
        });
        shell.appendChild(input);
        controls.appendChild(shell);
        controls.appendChild(hexInput);
        syncColorUi(input.value);
        return controls;
    }

    function renderSettingsLanguage() {
        var mount = byId("settingsLanguageMount");
        var field = findSettingsSchemaField("language");
        var heading;
        var fieldRow;
        var select;

        if (!mount || !field) {
            return;
        }

        mount.innerHTML = "";
        mount.className = "settings-section";

        heading = createSettingsSectionHeader("common.global", field.labelKey, null);

        fieldRow = createSharedSettingsFieldRow("select", field, null, "English / \u7b80\u4f53\u4e2d\u6587");
        select = createSharedSettingsSelect("languageSelect", field, window.I18n && window.I18n.getLanguage ? window.I18n.getLanguage() : null);
        fieldRow.controls.appendChild(select);
        mount.appendChild(heading);
        mount.appendChild(fieldRow.row);
    }

    function renderSettingsDeveloperMode() {
        var mount = byId("settingsDeveloperModeMount");
        var field = findSettingsSchemaField("registryDebugTools");
        var radiusField = findSettingsSchemaField("homeIconRadius");
        var shadowField = findSettingsSchemaField("homeDragShadowIntensity");
        var heading;
        var fieldRow;
        var switchWrap;
        var radiusRow;
        var radiusControls;
        var shadowRow;
        var shadowControls;

        if (!mount || !field) {
            return;
        }

        mount.innerHTML = "";
        mount.className = "settings-section";

        heading = createSettingsSectionHeader("section.debug", "section.developerTools", null);

        fieldRow = createSharedSettingsFieldRow("checkbox", field, field.descriptionKey, "");
        switchWrap = createSharedSettingsSwitch("registryDebugTools", field.defaultValue === true);
        fieldRow.controls.appendChild(switchWrap);
        mount.appendChild(heading);
        mount.appendChild(fieldRow.row);

        if (radiusField) {
            radiusRow = createSharedSettingsFieldRow("range", radiusField, radiusField.descriptionKey, "");
            radiusRow.row.classList.add("settings-developer-only");
            radiusRow.controls.parentNode && radiusRow.row.removeChild(radiusRow.controls);
            radiusControls = createSharedSettingsRangeNumber(radiusField, "homeIconRadius", "homeIconRadiusNumber", radiusField.min, radiusField.max, "", "");
            radiusRow.row.appendChild(radiusControls);
            mount.appendChild(radiusRow.row);
        }
        if (shadowField) {
            shadowRow = createSharedSettingsFieldRow("range", shadowField, shadowField.descriptionKey, "");
            shadowRow.row.classList.add("settings-developer-only");
            shadowRow.controls.parentNode && shadowRow.row.removeChild(shadowRow.controls);
            shadowControls = createSharedSettingsRangeNumber(shadowField, "homeDragShadowIntensity", "homeDragShadowIntensityNumber", shadowField.min, shadowField.max, "", "");
            shadowRow.row.appendChild(shadowControls);
            mount.appendChild(shadowRow.row);
        }
        syncSettingsDeveloperOnlyFields();
    }

    function renderSettingsRangeRow(field, numberId) {
        var fieldRow;
        var controls;

        fieldRow = createSharedSettingsFieldRow("range", field, field.descriptionKey, "");
        controls = createSharedSettingsRangeNumber(field, field.key, numberId, field.min, field.max, "", "");
        fieldRow.row.removeChild(fieldRow.controls);
        fieldRow.row.appendChild(controls);

        return fieldRow.row;
    }

    function renderSettingsMotion() {
        var mount = byId("settingsMotionMount");
        var section = findSettingsSchemaSection("motion");
        var heading;
        var fields;
        var i;

        if (!mount || !section) {
            return;
        }

        mount.innerHTML = "";
        mount.className = "settings-section";

        heading = createSettingsSectionHeader("section.motion", "section.animation", null);
        mount.appendChild(heading);

        fields = section.fields || [];
        for (i = 0; i < fields.length; i++) {
            if (fields[i] && fields[i].key === "motionSpeed") {
                mount.appendChild(renderSettingsRangeRow(fields[i], "motionSpeedNumber"));
            } else if (fields[i] && fields[i].key === "uiScale") {
                mount.appendChild(renderSettingsRangeRow(fields[i], "uiScaleNumber"));
            }
        }
    }

    function settingsVisibleWhenMatches(rule) {
        var input;
        var value;
        var i;
        if (!rule) {
            return true;
        }
        if (rule.all instanceof Array) {
            for (i = 0; i < rule.all.length; i++) {
                if (!settingsVisibleWhenMatches(rule.all[i])) {
                    return false;
                }
            }
            return true;
        }
        if (rule.any instanceof Array) {
            for (i = 0; i < rule.any.length; i++) {
                if (settingsVisibleWhenMatches(rule.any[i])) {
                    return true;
                }
            }
            return false;
        }
        if (!rule.key) {
            return true;
        }
        input = byId(rule.key);
        if (!input) {
            return false;
        }
        value = input.type === "checkbox" ? !!input.checked : input.value;
        if (typeof rule.equals !== "undefined") {
            return String(value) === String(rule.equals);
        }
        if (rule["in"] instanceof Array) {
            return rule["in"].indexOf(value) !== -1;
        }
        return true;
    }

    function applySettingsVisibilityMetadata(element, rule) {
        if (!element || !rule || (!rule.key && !(rule.all instanceof Array) && !(rule.any instanceof Array))) {
            return;
        }
        if (rule.key) {
            element.setAttribute("data-settings-visible-key", rule.key);
        }
        if (rule.key && typeof rule.equals !== "undefined") {
            element.setAttribute("data-settings-visible-equals", rule.equals);
        }
        if (rule.all instanceof Array || rule.any instanceof Array) {
            element.setAttribute("data-settings-visible-rule", JSON.stringify(rule));
        }
    }

    function applySettingsOpenMetadata(element, rule) {
        if (!element || !rule || !rule.key) {
            return;
        }
        element.setAttribute("data-settings-open-key", rule.key);
        if (typeof rule.equals !== "undefined") {
            element.setAttribute("data-settings-open-equals", rule.equals);
        }
    }

    function refreshSettingsThemeVisibility() {
        var nodes = document.querySelectorAll("[data-settings-visible-key], [data-settings-visible-rule]");
        var i;
        var rule;
        var input;
        var value;
        var equals;
        var visible;
        for (i = 0; i < nodes.length; i++) {
            rule = null;
            if (nodes[i].getAttribute("data-settings-visible-rule")) {
                try {
                    rule = JSON.parse(nodes[i].getAttribute("data-settings-visible-rule"));
                } catch (error) {
                    rule = null;
                }
            }
            if (rule) {
                visible = settingsVisibleWhenMatches(rule);
            } else {
                input = byId(nodes[i].getAttribute("data-settings-visible-key"));
                value = input ? (input.type === "checkbox" ? !!input.checked : input.value) : "";
                equals = nodes[i].getAttribute("data-settings-visible-equals");
                visible = equals === null || String(value) === String(equals);
            }
            nodes[i].hidden = !visible;
            nodes[i].classList.toggle("is-settings-condition-hidden", !visible);
        }
        nodes = document.querySelectorAll("[data-settings-open-key]");
        for (i = 0; i < nodes.length; i++) {
            input = byId(nodes[i].getAttribute("data-settings-open-key"));
            value = input ? input.value : "";
            equals = nodes[i].getAttribute("data-settings-open-equals");
            if (equals !== null) {
                setSettingsThemeGroupOpen(nodes[i], String(value) === String(equals));
            }
        }
    }

    function handleSettingsFieldChange(fieldKey, value) {
        if (fieldKey === "proceduralIconMode") {
            applyProceduralIconMode(value);
            refreshSettingsThemePresentation();
            saveSettings();
        } else if (fieldKey === "toolIconDarkSourceMode") {
            applyProceduralIconDarkSourceMode(value);
            saveSettings();
        } else if (fieldKey === "toolIconDarkPaletteId") {
            applyProceduralIconDarkPaletteId(value, { suggestThemeAccent: true });
            saveSettings();
        }
    }

    function createSettingsThemeField(field) {
        var fieldRow;
        var controls;
        var select;
        if (!field || !field.key) {
            return null;
        }
        if (field.type === "select") {
            fieldRow = createSharedSettingsFieldRow("select", field, field.key === "proceduralIconMode" ? "" : field.descriptionKey, "");
            select = createSharedSettingsSelect(field.key, field, field.defaultValue);
            fieldRow.row.removeChild(fieldRow.controls);
            fieldRow.row.appendChild(select);
            select.addEventListener("change", function () {
                handleSettingsFieldChange(field.key, this.value);
            });
        } else if (field.type === "color") {
            fieldRow = createSharedSettingsFieldRow("color", field, field.descriptionKey, "");
            controls = createSharedSettingsColorControl(field, field.key, "#ffffff", "theme-color-shell");
            fieldRow.row.removeChild(fieldRow.controls);
            fieldRow.row.appendChild(controls);
        } else {
            return null;
        }
        fieldRow.row.setAttribute("data-settings-field-key", field.key);
        applySettingsVisibilityMetadata(fieldRow.row, field.visibleWhen);
        return fieldRow.row;
    }

    function setSettingsThemeGroupOpen(root, open) {
        var toggle;
        if (!root) {
            return;
        }
        root.classList.toggle("is-collapsed", !open);
        toggle = root.querySelector(".settings-theme-group-title");
        if (toggle) {
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        }
    }

    function createSettingsThemeGroup(group) {
        var root = document.createElement("section");
        var body = root;
        var title;
        var titleText;
        var chevron;
        root.className = "settings-theme-group" + (group.collapsible ? " settings-theme-group--collapsible" : "");
        if (group.collapsible) {
            root.className += " collapsible-card";
        }
        root.setAttribute("data-settings-theme-group", group.id || "");
        applySettingsVisibilityMetadata(root, group.visibleWhen);
        applySettingsOpenMetadata(root, group.openWhen);
        if (group.collapsible) {
            title = document.createElement("button");
            title.className = "settings-theme-group-title settings-section-toggle collapsible-heading";
            title.type = "button";
            title.setAttribute("aria-expanded", group.defaultCollapsed === true ? "false" : "true");
            title.setAttribute("aria-controls", "settingsThemeGroupBody-" + (group.id || "group"));
            titleText = document.createElement("span");
            titleText.setAttribute("data-i18n", group.titleKey || "");
            titleText.textContent = tr(group.titleKey || "");
            chevron = document.createElement("span");
            chevron.className = "collapse-chevron";
            chevron.setAttribute("aria-hidden", "true");
            title.appendChild(titleText);
            title.appendChild(chevron);
            root.appendChild(title);
            body = document.createElement("div");
            body.className = "settings-theme-group-body";
            body.classList.add("collapsible-body");
            body.id = "settingsThemeGroupBody-" + (group.id || "group");
            root.appendChild(body);
            title.addEventListener("click", function () {
                setSettingsThemeGroupOpen(root, root.classList.contains("is-collapsed"));
            });
            setSettingsThemeGroupOpen(root, group.defaultCollapsed !== true);
        } else if (group.titleKey) {
            title = document.createElement("h4");
            title.className = "settings-theme-group-title";
            title.setAttribute("data-i18n", group.titleKey);
            title.textContent = tr(group.titleKey);
            root.appendChild(title);
        }
        return { root: root, body: body };
    }

    function openPaletteWorkspaceFromSettings() {
        var controller = initializePaletteWorkspaceController();
        if (controller && typeof controller.open === "function") {
            controller.open();
        }
    }

    function getPaletteSummaryData() {
        var store = window.ProceduralPaletteStore;
        var palettes;
        var exported;
        if (!store || typeof store.listResolvedPalettes !== "function") {
            return { builtIn: 0, custom: 0, overrides: 0, swatches: [] };
        }
        palettes = store.listResolvedPalettes(false);
        exported = typeof store.exportData === "function" ? store.exportData() : {};
        return {
            builtIn: palettes.filter(function (palette) { return palette.isBuiltIn === true; }).length,
            custom: palettes.filter(function (palette) { return palette.isCustom === true; }).length,
            overrides: Object.keys(exported.toolPaletteMap || {}).length,
            swatches: palettes.slice(0, 4).map(function (palette) { return palette.colors.base; })
        };
    }

    function renderPaletteSummaryElement(element) {
        var data = getPaletteSummaryData();
        var title = document.createElement("strong");
        var count = document.createElement("span");
        var swatches = document.createElement("span");
        var button = document.createElement("button");
        var i;
        element.innerHTML = "";
        element.className = "settings-source-summary settings-theme-presentation";
        title.className = "settings-source-summary-title";
        title.textContent = tr("settings.paletteLibrary");
        count.className = "settings-source-summary-count";
        count.textContent = data.builtIn + " " + tr("settings.paletteSummary.builtIn") + " · " + data.custom + " " + tr("settings.paletteSummary.custom") + " · " + data.overrides + " " + tr("settings.paletteSummary.overrides");
        swatches.className = "settings-source-summary-swatches";
        for (i = 0; i < data.swatches.length; i++) {
            var swatch = document.createElement("span");
            swatch.style.backgroundColor = data.swatches[i];
            swatch.setAttribute("aria-hidden", "true");
            swatches.appendChild(swatch);
        }
        button.type = "button";
        button.className = "panel-button settings-source-summary-action";
        button.textContent = tr(element.getAttribute("data-settings-palette-action") || "settings.palette.manage");
        button.addEventListener("click", openPaletteWorkspaceFromSettings);
        element.appendChild(title);
        element.appendChild(count);
        element.appendChild(swatches);
        element.appendChild(button);
    }

    function refreshSettingsPaletteSummary() {
        var summaries = document.querySelectorAll(".settings-source-summary");
        var i;
        for (i = 0; i < summaries.length; i++) {
            renderPaletteSummaryElement(summaries[i]);
        }
    }

    function refreshSettingsPaletteOptions() {
        var field = findSettingsSchemaField("toolIconDarkPaletteId");
        var select = byId("toolIconDarkPaletteId");
        var current;
        var next;
        if (!field || !select || field.optionsProvider !== "proceduralPalettes") {
            return;
        }
        current = select.value;
        appendSettingsSelectOptions(select, field, current);
        next = select.value;
        rebuildCustomSelectOptions(select);
        syncCustomSelect(select);
        if (next !== current) {
            applyProceduralIconDarkPaletteId(next);
            saveSettings();
        }
    }

    function bindThemePaletteStore() {
        var store = window.ProceduralPaletteStore;
        if (!store || typeof store.subscribe !== "function" || ThemeSettingsStoreListener) {
            return;
        }
        ThemeSettingsStoreListener = function () {
            if (!panelShuttingDown) {
                refreshSettingsPaletteOptions();
                refreshSettingsPaletteSummary();
                updateProceduralHomeIconAppearance();
                refreshSettingsThemePresentation();
            }
        };
        store.subscribe(ThemeSettingsStoreListener);
    }

    function unbindThemePaletteStore() {
        var store = window.ProceduralPaletteStore;
        if (store && ThemeSettingsStoreListener && typeof store.unsubscribe === "function") {
            store.unsubscribe(ThemeSettingsStoreListener);
        }
        ThemeSettingsStoreListener = null;
    }

    function getResolvedProceduralPalette(paletteId) {
        var store = window.ProceduralPaletteStore;
        var palettes;
        var i;
        if (!store) {
            return null;
        }
        if (typeof store.getResolvedPalette === "function") {
            try {
                return store.getResolvedPalette(paletteId);
            } catch (error) {
            }
        }
        if (typeof store.listResolvedPalettes !== "function") {
            return null;
        }
        try {
            palettes = store.listResolvedPalettes(false) || [];
        } catch (error) {
            return null;
        }
        for (i = 0; i < palettes.length; i++) {
            if (palettes[i] && palettes[i].id === paletteId) {
                return palettes[i];
            }
        }
        return null;
    }

    function normalizeToolIconDarkSourceMode(value) {
        if (value === "manualEndpoints" || value === "custom") {
            return "manualEndpoints";
        }
        if (value === "paletteScale" || value === "paletteBase") {
            return "paletteScale";
        }
        return "manualEndpoints";
    }

    function resolveProceduralPaletteScaleColors() {
        var paletteInput = byId("toolIconDarkPaletteId");
        var palette = getResolvedProceduralPalette(paletteInput ? paletteInput.value : DefaultSettings.toolIconDarkPaletteId);
        var themeMap = window.ProceduralThemeMap;
        if (themeMap && typeof themeMap.derivePaletteScaleColors === "function" && palette) {
            return themeMap.derivePaletteScaleColors(palette);
        }
        return null;
    }

    function resolveProceduralThemeColors() {
        var customInput = byId("toolIconColor");
        var sourceInput = byId("toolIconDarkSourceMode");
        var lightInput = byId("toolIconLine");
        var customColor = normalizeHex(customInput ? customInput.value : DefaultSettings.toolIconColor, DefaultSettings.toolIconColor);
        var sourceMode = normalizeToolIconDarkSourceMode(sourceInput ? sourceInput.value : DefaultSettings.toolIconDarkSourceMode);
        var lightColor = normalizeHex(lightInput ? lightInput.value : DefaultSettings.toolIconLine, DefaultSettings.toolIconLine);
        var paletteColors;
        if (sourceMode === "paletteScale") {
            paletteColors = resolveProceduralPaletteScaleColors();
            if (paletteColors) {
                return paletteColors;
            }
        }
        return { dark: customColor, mid: "", light: lightColor };
    }

    function resolveProceduralDarkColor() {
        return resolveProceduralThemeColors().dark;
    }

    function applyProceduralIconDarkSourceMode(value) {
        var mode = normalizeToolIconDarkSourceMode(value);
        var select = byId("toolIconDarkSourceMode");
        if (select) {
            select.value = mode;
            syncCustomSelect(select);
        }
        updateProceduralHomeIconAppearance();
        refreshSettingsThemePresentation();
    }

    function applyProceduralIconDarkPaletteId(value) {
        var options = getProceduralPaletteOptions();
        var selected = String(value || "");
        var select = byId("toolIconDarkPaletteId");
        var i;
        var valid = false;
        for (i = 0; i < options.length; i++) {
            if (options[i].value === selected) {
                valid = true;
                break;
            }
        }
        if (!valid) {
            selected = options.length ? options[0].value : "";
        }
        if (select) {
            select.value = selected;
            syncCustomSelect(select);
        }
        if (arguments.length > 1 && arguments[1] && arguments[1].suggestThemeAccent) {
            suggestThemeAccentFromPalette(selected);
        }
        updateProceduralHomeIconAppearance();
        refreshSettingsThemePresentation();
    }

    function suggestThemeAccentFromPalette(paletteId) {
        var palette = getResolvedProceduralPalette(paletteId);
        if (!palette || !palette.colors || !palette.colors.secondary) {
            return;
        }
        applyThemeAccent(palette.colors.secondary);
        setStatus(tr("status.paletteAccentSuggested"));
    }

    function renderSettingsColorRamp(element) {
        var dark = byId("toolIconColor");
        var light = byId("toolIconLine");
        var ramp = element.querySelector(".settings-color-ramp");
        if (!ramp || !dark || !light) {
            return;
        }
        var colors = resolveProceduralThemeColors();
        var midLabel = element.querySelector(".settings-color-ramp-label-mid");
        element.classList.toggle("is-three-stop", !!colors.mid);
        ramp.style.setProperty("--settings-ramp-dark", colors.dark);
        ramp.style.setProperty("--settings-ramp-mid", colors.mid || colors.dark);
        ramp.style.setProperty("--settings-ramp-light", colors.light);
        if (midLabel) {
            midLabel.hidden = !colors.mid;
        }
    }

    function refreshSettingsColorRamps() {
        var ramps = document.querySelectorAll("[data-settings-presentation='colorRampPreview']");
        var i;
        for (i = 0; i < ramps.length; i++) {
            renderSettingsColorRamp(ramps[i]);
        }
    }

    function refreshSettingsThemePresentation() {
        refreshSettingsThemeVisibility();
        refreshSettingsColorRamps();
        refreshSettingsPaletteSummary();
    }

    function createSettingsThemePresentation(presentation) {
        var element = document.createElement("div");
        var label;
        var rampShell;
        var ramp;
        var darkLabel;
        var midLabel;
        var lightLabel;
        element.className = "settings-theme-presentation";
        element.setAttribute("data-settings-presentation", presentation.type);
        applySettingsVisibilityMetadata(element, presentation.visibleWhen);
        if (presentation.type === "note") {
            element.classList.add("settings-theme-note");
            element.setAttribute("data-i18n", presentation.textKey || "");
            element.textContent = tr(presentation.textKey);
        } else if (presentation.type === "colorRampPreview") {
            element.classList.add("settings-color-ramp-preview");
            label = document.createElement("span");
            label.className = "settings-presentation-label";
            label.setAttribute("data-i18n", "settings.theme.colorRamp");
            label.textContent = tr("settings.theme.colorRamp");
            rampShell = document.createElement("span");
            rampShell.className = "settings-color-ramp-shell";
            ramp = document.createElement("span");
            ramp.className = "settings-color-ramp";
            ramp.setAttribute("role", "img");
            ramp.setAttribute("data-i18n-aria-label", "settings.theme.colorRamp");
            ramp.setAttribute("aria-label", tr("settings.theme.colorRamp"));
            rampShell.appendChild(ramp);
            darkLabel = document.createElement("small");
            darkLabel.className = "settings-color-ramp-label-dark";
            darkLabel.setAttribute("data-i18n", "settings.theme.darkEndpoint");
            darkLabel.textContent = tr("settings.theme.darkEndpoint");
            midLabel = document.createElement("small");
            midLabel.className = "settings-color-ramp-label-mid";
            midLabel.setAttribute("data-i18n", "settings.theme.midEndpoint");
            midLabel.textContent = tr("settings.theme.midEndpoint");
            lightLabel = document.createElement("small");
            lightLabel.className = "settings-color-ramp-label-light";
            lightLabel.setAttribute("data-i18n", "settings.theme.lightEndpoint");
            lightLabel.textContent = tr("settings.theme.lightEndpoint");
            element.appendChild(label);
            element.appendChild(darkLabel);
            element.appendChild(midLabel);
            element.appendChild(rampShell);
            element.appendChild(lightLabel);
            renderSettingsColorRamp(element);
        } else if (presentation.type === "paletteSummary") {
            element.setAttribute("data-settings-palette-action", presentation.actionKey || "settings.palette.manage");
            renderPaletteSummaryElement(element);
        }
        return element;
    }

    function renderSettingsTheme() {
        var mount = byId("settingsThemeMount");
        var section = findSettingsSchemaSection("theme");
        var heading;
        var fields;
        var field;
        var fieldMap = {};
        var groups;
        var groupView;
        var group;
        var fieldElement;
        var presentationElement;
        var i;
        var j;

        if (!mount || !section) {
            return;
        }

        mount.innerHTML = "";
        mount.className = "settings-section";

        heading = createSettingsSectionHeader("section.color", section.titleKey, null);
        mount.appendChild(heading);

        fields = section.fields || [];
        for (i = 0; i < fields.length; i++) {
            if (fields[i] && fields[i].key) {
                fieldMap[fields[i].key] = fields[i];
            }
        }
        groups = section.groups || [{ id: "theme", fields: fields.map(function (item) { return item.key; }) }];
        for (i = 0; i < groups.length; i++) {
            group = groups[i];
            groupView = createSettingsThemeGroup(group);
            for (j = 0; j < (group.fields || []).length; j++) {
                field = fieldMap[group.fields[j]] || group.fields[j];
                fieldElement = createSettingsThemeField(field);
                if (fieldElement) {
                    groupView.body.appendChild(fieldElement);
                }
            }
            for (j = 0; j < (group.presentations || []).length; j++) {
                presentationElement = createSettingsThemePresentation(group.presentations[j]);
                groupView.body.appendChild(presentationElement);
            }
            mount.appendChild(groupView.root);
        }
        refreshSettingsThemePresentation();
    }

    function refreshPaletteDrivenHomeIcons() {
        if (window.ProceduralAppearance && typeof window.ProceduralAppearance.clearCache === "function") {
            window.ProceduralAppearance.clearCache();
        }
        if (window.ProceduralHomeIcons && typeof window.ProceduralHomeIcons.invalidateRendered === "function") {
            window.ProceduralHomeIcons.invalidateRendered();
        }
        refreshProceduralHomeIcons();
    }

    function readUiStorageValue(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (error) {
            return null;
        }
    }

    function writeUiStorageValue(key, value) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, String(value));
            }
        } catch (error) {
        }
    }

    function getPaletteWorkspaceController() {
        return PaletteWorkspaceController || window.ProceduralPaletteWorkspace || null;
    }

    function initializePaletteWorkspaceController() {
        var controller = getPaletteWorkspaceController();
        if (!controller || typeof controller.initialize !== "function") {
            return null;
        }
        PaletteWorkspaceController = controller.initialize({
            window: window,
            document: document,
            PaletteStore: window.ProceduralPaletteStore,
            ProceduralAppearance: window.ProceduralAppearance,
            ProceduralPaletteEditor: window.ProceduralPaletteEditor,
            translate: tr,
            setStatus: setStatus,
            refreshHomeIcons: refreshProceduralHomeIcons,
            invalidateHomeIcons: function () {
                if (window.ProceduralHomeIcons && typeof window.ProceduralHomeIcons.invalidateRendered === "function") {
                    window.ProceduralHomeIcons.invalidateRendered();
                }
            },
            panelShutdownPredicate: function () {
                return panelShuttingDown;
            },
            duration: duration,
            nextFrame: nextFrame,
            createSettingsSectionHeader: createSettingsSectionHeader,
            closeCustomSelectMenus: closeCustomSelectMenus,
            setupCustomSelectInputs: setupCustomSelectInputs,
            normalizeHex: normalizeHex,
            bindHexInputSelectBehavior: bindHexInputSelectBehavior,
            openRegistryColorPicker: openRegistryColorPicker,
            applySchemaNumberAttributes: applySchemaNumberAttributes,
            isSchemaNumberDraftValue: isSchemaNumberDraftValue,
            setupRegistryNumberDrag: setupRegistryNumberDrag,
            normalizeSchemaNumber: normalizeSchemaNumber,
            escapeHtml: escapeHtml,
            applyI18n: applyI18n,
            readStorageValue: readUiStorageValue,
            writeStorageValue: writeUiStorageValue
        });
        return PaletteWorkspaceController;
    }

    function renderPaletteLibrarySettings() {
        var controller = initializePaletteWorkspaceController();
        if (controller && typeof controller.refresh === "function") {
            controller.refresh();
        }
    }

    function closePaletteWorkspace(options) {
        var controller = getPaletteWorkspaceController();
        if (controller && typeof controller.close === "function") {
            controller.close(options);
        }
    }

    function ensurePaletteWorkspaceClosed() {
        var controller = initializePaletteWorkspaceController();
        if (controller && typeof controller.ensureClosedState === "function") {
            controller.ensureClosedState();
        }
    }

    function teardownPaletteWorkspace() {
        var controller = getPaletteWorkspaceController();
        if (controller && typeof controller.teardown === "function") {
            controller.teardown();
        }
    }

    function refreshPaletteWorkspaceI18n() {
        var controller = getPaletteWorkspaceController();
        if (controller && typeof controller.refreshI18n === "function") {
            controller.refreshI18n();
        }
    }

    function findSettingsSectionField(section, key) {
        var fields = section && section.fields ? section.fields : [];
        var i;
        for (i = 0; i < fields.length; i++) {
            if (fields[i] && fields[i].key === key) {
                return fields[i];
            }
        }
        return null;
    }

    function renderSettingsBackgroundRange(field, controlId, minValue, maxValue) {
        var fieldRow;
        var controls;

        fieldRow = createSharedSettingsFieldRow("range", field, null, "");
        fieldRow.row.className += " bg-control-row";
        controls = createSharedSettingsRangeNumber(field, controlId, controlId + "Number", minValue, maxValue, "bg-param", "bg-param-number");
        fieldRow.row.removeChild(fieldRow.controls);
        fieldRow.row.appendChild(controls);
        return fieldRow.row;
    }

    function renderSettingsBackgroundColor(field, inputId) {
        var row = createSharedSettingsFieldRow("color", field, null, "");
        var controls = createSharedSettingsColorControl(field, inputId, "#050403", "small-color-shell");
        row.row.className += " settings-field--background-color";
        row.row.removeChild(row.controls);
        row.row.appendChild(controls);
        return row.row;
    }

    function renderSettingsBackgroundEngine() {
        var mount = byId("backgroundSettingsCard");
        var section = findSettingsSchemaSection("backgroundEngine");
        var toggle;
        var toggleCopy;
        var title;
        var chevron;
        var body;
        var field;
        var fieldRow;
        var select;
        var colors;
        var ranges;
        var motionFields;
        var switchWrap;
        var actions;
        var button;
        var i;

        if (!mount || !section) {
            return;
        }

        mount.innerHTML = "";
        mount.className = "settings-section settings-section--background settings-section--collapsible collapsible-card";

        toggle = document.createElement("button");
        toggle.className = "settings-section-header settings-section-toggle collapsible-heading";
        toggle.id = "backgroundSettingsToggle";
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", "true");
        toggleCopy = document.createElement("span");
        title = document.createElement("h3");
        title.className = "registry-title-primary settings-section-title";
        title.setAttribute("data-i18n", section.titleKey);
        title.textContent = tr(section.titleKey);
        toggleCopy.appendChild(title);
        chevron = document.createElement("span");
        chevron.className = "collapse-chevron";
        chevron.setAttribute("aria-hidden", "true");
        toggle.appendChild(toggleCopy);
        toggle.appendChild(chevron);

        body = document.createElement("div");
        body.className = "collapsible-body";
        body.id = "backgroundSettingsBody";

        field = findSettingsSectionField(section, "preset");
        if (field) {
            fieldRow = createSharedSettingsFieldRow("select", field, field.descriptionKey, "");
            select = createSharedSettingsSelect("bgPreset", field, field.defaultValue);
            fieldRow.controls.appendChild(select);
            body.appendChild(fieldRow.row);
        }

        body.appendChild(createSettingsGroupLabel("section.color"));

        colors = [
            ["baseColor", "bgBaseColor"],
            ["secondaryColor", "bgSecondaryColor"],
            ["accentColor", "bgAccentColor"],
            ["accent2Color", "bgAccent2Color"],
            ["lineColor", "bgLineColor"],
            ["glowColor", "bgGlowColor"]
        ];
        for (i = 0; i < colors.length; i++) {
            field = findSettingsSectionField(section, colors[i][0]);
            if (field) {
                body.appendChild(renderSettingsBackgroundColor(field, colors[i][1]));
            }
        }

        body.appendChild(createSettingsGroupLabel("section.shape"));

        ranges = [
            ["glowOpacity", "bgGlowOpacity"],
            ["glowSize", "bgGlowSize"],
            ["glowX", "bgGlowX"],
            ["glowY", "bgGlowY"],
            ["gridOpacity", "bgGridOpacity"],
            ["gridSize", "bgGridSize"],
            ["lineOpacity", "bgLineOpacity"],
            ["ringOpacity", "bgRingOpacity"],
            ["ringScale", "bgRingScale"],
            ["accentAngle", "bgAccentAngle"],
            ["patternDensity", "bgPatternDensity"],
            ["contrast", "bgContrast"]
        ];
        for (i = 0; i < ranges.length; i++) {
            field = findSettingsSectionField(section, ranges[i][0]);
            if (field) {
                body.appendChild(renderSettingsBackgroundRange(field, ranges[i][1], field.min, field.max));
            }
        }

        body.appendChild(createSettingsGroupLabel("section.motion"));

        field = findSettingsSectionField(section, "motionEnable");
        if (field) {
            fieldRow = createSharedSettingsFieldRow("checkbox", field, field.descriptionKey, "");
            switchWrap = createSharedSettingsSwitch("bgMotionEnable", field.defaultValue === true);
            fieldRow.controls.appendChild(switchWrap);
            body.appendChild(fieldRow.row);
        }

        motionFields = [
            ["motionSpeed", "bgMotionSpeed"],
            ["motionAmount", "bgMotionAmount"]
        ];
        for (i = 0; i < motionFields.length; i++) {
            field = findSettingsSectionField(section, motionFields[i][0]);
            if (field) {
                body.appendChild(renderSettingsBackgroundRange(field, motionFields[i][1], field.min, field.max));
            }
        }

        actions = document.createElement("div");
        actions.className = "settings-action-row settings-actions";
        field = findSettingsSectionField(section, "randomize");
        if (field) {
            button = document.createElement("button");
            button.className = "panel-button registry-large-button is-full-width settings-action-button";
            button.id = "bgRandomizeBtn";
            button.type = "button";
            button.setAttribute("data-i18n", field.labelKey);
            button.textContent = tr(field.labelKey);
            actions.appendChild(button);
        }
        field = findSettingsSectionField(section, "reset");
        if (field) {
            button = document.createElement("button");
            button.className = "panel-button registry-large-button is-full-width settings-action-button";
            button.id = "bgResetBtn";
            button.type = "button";
            button.setAttribute("data-i18n", field.labelKey);
            button.textContent = tr(field.labelKey);
            actions.appendChild(button);
        }
        body.appendChild(actions);

        mount.appendChild(toggle);
        mount.appendChild(body);
    }

    function mergeDynamicToolI18n(tool) {
        if (tool && tool.i18n && window.I18n && window.I18n.mergeDictionaries) {
            window.I18n.mergeDictionaries(tool.i18n);
        }
    }

    function loadRegisteredToolsFromHost() {
        evalHost("AEToolbox.getRegisteredTools()", function (raw) {
            if (panelShuttingDown) {
                return;
            }
            var result = parseResult(raw);
            var tools = result.tools || [];
            var loadErrors = result.loadErrors || [];
            var i;
            var tool;

            DynamicTools = {};
            DynamicToolOrder = [];

            if (!result.ok) {
                setStatus("Tool registry failed: " + (result.message || raw), "error");
            } else if (tools.length) {
                for (i = 0; i < tools.length; i++) {
                    tool = tools[i];
                    if (!tool || !tool.id) {
                        continue;
                    }
                    DynamicTools[tool.id] = tool;
                    DynamicToolOrder[DynamicToolOrder.length] = tool.id;
                    mergeDynamicToolI18n(tool);
                }
                setStatus("Tool registry loaded " + DynamicToolOrder.length + " dynamic tool(s).", "ok");
            } else {
                setStatus("Tool registry loaded 0 tools" + (loadErrors.length ? ": " + loadErrors.join("; ") : "."), loadErrors.length ? "error" : "ok");
                if (window.console && console.warn) {
                    console.warn("[AE Toolbox] No dynamic registry tools loaded.", result);
                }
            }

            renderDynamicToolHome();
            if (panelShuttingDown) {
                return;
            }
            HomeLayoutManager.loadOrder();
            HomeLayoutManager.renderOrder();
            HomeLayoutManager.bindIconEvents();
            refreshLanguage();

            if (window.console && console.log) {
                console.log("[AE Toolbox] Dynamic tools:", DynamicToolOrder, result);
            }
        });
    }

    function loadHost() {
        var extensionRoot = cs.getSystemPath(SystemPath.EXTENSION);
        var jsxPath = extensionRoot + "/host/index.jsx";
        jsxPath = jsxPath.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        setStatus(tr("status.loadingHost"), "busy", true);
        cs.evalScript('$.evalFile("' + jsxPath + '")', function (loadResult) {
            if (panelShuttingDown) {
                return;
            }
            hostLoaded = true;
            cs.evalScript("AEToolbox.ping()", function (result) {
                if (panelShuttingDown) {
                    return;
                }
                if (window.console && console.log) {
                    console.log(result);
                }
                if (loadResult === "EvalScript error." || result === "EvalScript error.") {
                    setStatus(tr("status.hostLoadError"), "error");
                    return;
                }
                cs.evalScript("AEToolbox.getHostLoadInfo()", function (infoRaw) {
                    if (panelShuttingDown) {
                        return;
                    }
                    if (window.console && console.log) {
                        console.log("[AE Toolbox] Host load info:", infoRaw);
                    }
                });
                loadRegisteredToolsFromHost();
                refreshSelection();
            });
        });
    }

    function playAnimation(element, keyframes, options, done) {
        var animation;
        var last;
        var name;

        function applyFrame(frame) {
            for (name in frame) {
                if (frame.hasOwnProperty(name)) {
                    element.style[name] = frame[name];
                }
            }
        }

        if (element.animate) {
            animation = element.animate(keyframes, options);
            animation.onfinish = function () {
                applyFrame(keyframes[keyframes.length - 1]);
                animation.oncancel = null;
                try {
                    animation.cancel();
                } catch (cancelErr) {
                }
                if (done) {
                    done();
                }
            };
            animation.oncancel = function () {
                if (done) {
                    done();
                }
            };
            return animation;
        }

        last = keyframes[keyframes.length - 1];
        window.setTimeout(function () {
            applyFrame(last);
            if (done) {
                done();
            }
        }, options.duration || duration("normal"));
        return null;
    }

    function nextFrame(callback) {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(callback);
        } else {
            window.setTimeout(callback, 16);
        }
    }

    function makeAnimationGate(total, done) {
        var remaining = total;
        var completed = false;

        return function () {
            if (completed) {
                return;
            }
            remaining--;
            if (remaining <= 0) {
                completed = true;
                nextFrame(done);
            }
        };
    }

    function getToolDetailTargetRect() {
        var scale = clampNumber(byId("uiScale") ? byId("uiScale").value : DefaultSettings.uiScale, DefaultSettings.uiScale, 0.62, 1.18);
        var margin = Math.max(8, Math.round((window.innerWidth <= 360 ? 12 : 16) * scale));
        return {
            left: margin,
            top: margin,
            width: Math.max(1, window.innerWidth - margin * 2),
            height: Math.max(1, window.innerHeight - margin * 2)
        };
    }

    function getSettingsTargetRect() {
        var margin = 14;
        var bottom = 54;
        var width = Math.min(360, Math.max(1, window.innerWidth - margin * 2));
        return {
            left: Math.max(margin, window.innerWidth - margin - width),
            top: margin,
            width: width,
            height: Math.max(1, window.innerHeight - margin - bottom)
        };
    }

    function getToolIcon(toolButton) {
        var icon = toolButton.querySelector(".tool-icon");
        return icon || toolButton;
    }

    function getHomeToolIconRect(toolButton) {
        var home = byId("homeView");
        var previousTransition = home.style.transition;
        var rect;

        home.style.transition = "none";
        home.classList.add("is-active");
        home.classList.remove("is-opening", "is-returning");
        home.offsetWidth;
        rect = getToolIcon(toolButton).getBoundingClientRect();
        home.style.transition = previousTransition;
        return rect;
    }

    /*
     * Launch transition lock:
     * This block intentionally uses the real detail panel during the app-open
     * morph. Do not replace it with preview clones or transform-only shells in
     * unrelated UI/performance passes; visible continuity is more important here.
     */
    function createMorphIconOverlay(toolButton) {
        var icon = getToolIcon(toolButton);
        var overlay = document.createElement("div");
        var iconClone = icon.cloneNode(true);

        overlay.className = "detail-morph-icon";
        iconClone.removeAttribute("id");
        overlay.appendChild(iconClone);
        return overlay;
    }

    function getDetailContentElements() {
        var detail = byId("detailView");
        return [
            detail.querySelector(".detail-ui-layer")
        ];
    }

    function detailContentFrame(opacity, y, scale, blurPx) {
        return {
            opacity: String(opacity),
            transform: "translateY(" + y + "px) scale(" + scale + ")",
            filter: "blur(" + Math.min(4, Math.max(0, blurPx)) + "px)"
        };
    }

    function setDetailContentState(opacity, y, scale, blurPx) {
        var nodes = getDetailContentElements();
        var frame = detailContentFrame(opacity, y, scale, blurPx);
        var i;
        for (i = 0; i < nodes.length; i++) {
            if (!nodes[i]) {
                continue;
            }
            nodes[i].style.opacity = frame.opacity;
            nodes[i].style.transform = frame.transform;
            nodes[i].style.filter = frame.filter;
        }
    }

    function animateDetailContent(fromOpacity, fromY, fromScale, fromBlur, toOpacity, toY, toScale, toBlur, animDuration, easing, done) {
        var nodes = getDetailContentElements();
        var pending = 0;
        var i;
        for (i = 0; i < nodes.length; i++) {
            if (!nodes[i]) {
                continue;
            }
            pending++;
            playAnimation(nodes[i], [
                detailContentFrame(fromOpacity, fromY, fromScale, fromBlur),
                detailContentFrame(toOpacity, toY, toScale, toBlur)
            ], {
                duration: animDuration,
                easing: easing,
                fill: "forwards"
            }, function () {
                pending--;
                if (pending <= 0 && done) {
                    done();
                }
            });
        }
        if (pending === 0 && done) {
            done();
        }
    }

    function clearDetailContentStyles() {
        var nodes = getDetailContentElements();
        var i;
        for (i = 0; i < nodes.length; i++) {
            if (!nodes[i]) {
                continue;
            }
            nodes[i].style.opacity = "";
            nodes[i].style.transform = "";
            nodes[i].style.filter = "";
        }
    }

    function clearDetailContentClasses() {
        var detail = byId("detailView");
        detail.classList.remove("content-suppressed", "content-reveal", "content-exit");
    }

    function suppressDetailContent() {
        var detail = byId("detailView");
        detail.classList.remove("content-reveal", "content-exit");
        detail.classList.add("content-suppressed");
    }

    function revealDetailContent() {
        var detail = byId("detailView");
        detail.classList.remove("content-suppressed", "content-exit");
        detail.classList.add("content-reveal");
        window.setTimeout(function () {
            detail.classList.remove("content-reveal");
        }, Math.max(190, duration("fast")));
    }

    function exitDetailContent(done) {
        var detail = byId("detailView");
        detail.classList.remove("content-suppressed", "content-reveal");
        detail.classList.add("content-exit");
        window.setTimeout(function () {
            detail.classList.remove("content-exit");
            detail.classList.add("content-suppressed");
            if (done) {
                done();
            }
        }, Math.max(120, Math.min(150, duration("fast"))));
    }

    function clearSettingsContentClasses() {
        var view = byId("settingsView");
        view.classList.remove("content-suppressed", "content-reveal", "content-exit");
    }

    function suppressSettingsContent() {
        var view = byId("settingsView");
        view.classList.remove("content-reveal", "content-exit");
        view.classList.add("content-suppressed");
    }

    function revealSettingsContent() {
        var view = byId("settingsView");
        view.classList.remove("content-suppressed", "content-exit");
        view.classList.add("content-reveal");
        window.setTimeout(function () {
            view.classList.remove("content-reveal");
        }, Math.max(190, duration("fast")));
    }

    function exitSettingsContent(done) {
        var view = byId("settingsView");
        view.classList.remove("content-suppressed", "content-reveal");
        view.classList.add("content-exit");
        window.setTimeout(function () {
            view.classList.remove("content-exit");
            view.classList.add("content-suppressed");
            if (done) {
                done();
            }
        }, Math.max(120, Math.min(150, duration("fast"))));
    }

    function setDetailMorphRect(detail, rect, radius) {
        detail.style.position = "fixed";
        detail.style.inset = "auto";
        detail.style.left = rect.left + "px";
        detail.style.top = rect.top + "px";
        detail.style.width = rect.width + "px";
        detail.style.height = rect.height + "px";
        detail.style.borderRadius = radius;
    }

    function setPanelMorphRect(panel, rect, radius) {
        panel.style.position = "fixed";
        panel.style.inset = "auto";
        panel.style.left = rect.left + "px";
        panel.style.top = rect.top + "px";
        panel.style.width = rect.width + "px";
        panel.style.height = rect.height + "px";
        panel.style.borderRadius = radius;
        panel.style.opacity = "1";
        panel.style.transform = "none";
    }

    function removeMorphOverlay() {
        var detail = byId("detailView");
        var overlay = detail.querySelector(".detail-morph-icon");

        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    function resetDetailMorphStyles(keepOverlay) {
        var detail = byId("detailView");

        if (!keepOverlay) {
            removeMorphOverlay();
        }
        detail.classList.remove("is-morphing");
        clearDetailContentStyles();
        detail.style.position = "";
        detail.style.inset = "";
        detail.style.left = "";
        detail.style.top = "";
        detail.style.width = "";
        detail.style.height = "";
        detail.style.borderRadius = "";
    }

    function finishOpenTransition(shell, toolId) {
        var home = byId("homeView");
        var detail = byId("detailView");

        home.classList.add("no-transition");
        detail.classList.add("no-transition");

        home.classList.remove("is-active", "is-opening", "is-returning");
        detail.classList.add("is-active");
        detail.classList.remove("is-entering", "is-closing");
        detail.style.visibility = "visible";
        detail.style.opacity = "1";
        detail.style.transform = "none";

        resetDetailMorphStyles(true);
        detail.offsetWidth;

        nextFrame(function () {
            removeMorphOverlay();
            detail.style.visibility = "";
            detail.style.opacity = "";
            detail.style.transform = "";

            nextFrame(function () {
                home.classList.remove("no-transition");
                detail.classList.remove("no-transition");
                endAnimation();
                nextFrame(function () {
                    revealDetailContent();
                    refreshActiveTool();
                });
            });
        });
    }

    function finishCloseTransition(shell, toolButton) {
        var home = byId("homeView");
        var detail = byId("detailView");

        home.classList.add("no-transition", "is-active");
        home.classList.remove("is-opening", "is-returning");

        detail.classList.add("no-transition");
        detail.style.visibility = "hidden";
        detail.style.opacity = "0";
        detail.style.transform = "none";
        detail.offsetWidth;

        nextFrame(function () {
            resetDetailMorphStyles();
            detail.classList.remove("is-active", "is-closing", "is-entering", "is-morphing");
            clearDetailContentClasses();
            detail.style.visibility = "";
            detail.style.opacity = "";
            detail.style.transform = "";

            nextFrame(function () {
                home.classList.remove("no-transition");
                detail.classList.remove("no-transition");
                endAnimation();
            });
        });
    }

    function showRealToolDetail(toolId, skipEnterAnimation) {
        var home = byId("homeView");
        var detail = byId("detailView");

        configureToolDetail(toolId);
        resetDetailMorphStyles();
        clearDetailContentClasses();
        home.classList.remove("is-active", "is-opening", "is-returning");
        detail.classList.remove("is-closing", "is-morphing");
        detail.classList.add("is-active");
        if (!skipEnterAnimation) {
            detail.classList.add("is-entering");
            window.setTimeout(function () {
                detail.classList.remove("is-entering");
            }, duration("normal"));
        }
        refreshActiveTool();
    }

    function showHomeView() {
        var home = byId("homeView");
        var detail = byId("detailView");

        stopRegistryStatePolling();
        clearRegistryProceduralPreviewTimer(activeToolId);
        resetDetailMorphStyles();
        clearDetailContentClasses();
        detail.classList.remove("is-active", "is-closing", "is-entering", "is-morphing");
        home.classList.add("is-active", "is-returning");
        window.setTimeout(function () {
            home.classList.remove("is-returning");
        }, duration("normal"));
    }

    function getActiveToolButton() {
        return HomeLayoutManager.getButtonByToolId(activeToolId) || byId("openShapeAddTool");
    }

    function dynamicFieldId(toolId, key) {
        return "dynamic_" + toolId + "_" + key;
    }

    function registryToolStorageKey(toolOrId) {
        if (toolOrId && typeof toolOrId === "object" && toolOrId.storageKey) {
            return toolOrId.storageKey;
        }
        if (toolOrId && typeof toolOrId === "object" && toolOrId.id) {
            return "aeToolbox.registryToolValues." + toolOrId.id;
        }
        return "aeToolbox.registryToolValues." + toolOrId;
    }

    function schemaDefaultValue(field) {
        if (field && typeof field.defaultValue !== "undefined") {
            return field.defaultValue;
        }
        if (field && field.type === "checkbox") {
            return false;
        }
        if (field && (field.type === "number" || field.type === "range")) {
            return 0;
        }
        if (field && field.type === "color") {
            return "#ffffff";
        }
        return "";
    }

    function registrySchemaDefaults(toolDef) {
        var sections = getToolSections(toolDef);
        var values = {};
        var uiState = {
            collapsedSections: {}
        };
        var i;
        var j;
        var section;
        var fields;
        var field;

        for (i = 0; i < sections.length; i++) {
            section = sections[i] || {};
            if (section.toggleKey) {
                values[section.toggleKey] = section.defaultEnabled !== false;
            }
            if (section.id) {
                uiState.collapsedSections[section.id] = !!(section.collapsible && (section.defaultCollapsed === true || section.defaultEnabled === false));
            }
            fields = section.fields || [];
            for (j = 0; j < fields.length; j++) {
                field = fields[j];
                if (field && field.key) {
                    values[field.key] = schemaDefaultValue(field);
                }
            }
        }

        return {
            values: values,
            uiState: uiState
        };
    }

    function loadRegistryToolState(toolDef) {
        var defaults = registrySchemaDefaults(toolDef);
        var saved = loadStoredJson(registryToolStorageKey(toolDef), null);
        var state = {
            version: 1,
            toolId: toolDef.id,
            values: defaults.values,
            uiState: defaults.uiState
        };
        var key;

        if (saved && saved.values) {
            for (key in defaults.values) {
                if (defaults.values.hasOwnProperty(key) && saved.values.hasOwnProperty(key)) {
                    state.values[key] = saved.values[key];
                }
            }
        } else if (saved) {
            for (key in defaults.values) {
                if (defaults.values.hasOwnProperty(key) && saved.hasOwnProperty(key)) {
                    state.values[key] = saved[key];
                }
            }
        }
        if (saved && saved.uiState && saved.uiState.collapsedSections) {
            for (key in defaults.uiState.collapsedSections) {
                if (defaults.uiState.collapsedSections.hasOwnProperty(key) && saved.uiState.collapsedSections.hasOwnProperty(key)) {
                    state.uiState.collapsedSections[key] = !!saved.uiState.collapsedSections[key];
                }
            }
        }

        RegistryToolState[toolDef.id] = state;
        return state;
    }

    function registryFieldValue(toolDef, field) {
        var state = RegistryToolState[toolDef.id] || loadRegistryToolState(toolDef);
        if (field && field.key && state.values && state.values.hasOwnProperty(field.key)) {
            return state.values[field.key];
        }
        return schemaDefaultValue(field);
    }

    function registrySectionToggleValue(toolDef, section) {
        var state = RegistryToolState[toolDef.id] || loadRegistryToolState(toolDef);
        if (section && section.toggleKey && state.values && state.values.hasOwnProperty(section.toggleKey)) {
            return !!state.values[section.toggleKey];
        }
        return !section || section.defaultEnabled !== false;
    }

    function registrySectionCollapsedValue(toolDef, section, enabled) {
        var state = RegistryToolState[toolDef.id] || loadRegistryToolState(toolDef);
        var sectionId = section && section.id ? section.id : "";
        if (sectionId && state.uiState && state.uiState.collapsedSections && state.uiState.collapsedSections.hasOwnProperty(sectionId)) {
            return !!state.uiState.collapsedSections[sectionId];
        }
        return !!(section && section.collapsible && !enabled);
    }

    function collectRegistryUiState(toolDef) {
        var sections = getToolSections(toolDef);
        var collapsedSections = {};
        var i;
        var section;
        var card;

        for (i = 0; i < sections.length; i++) {
            section = sections[i] || {};
            if (!section.id || !section.collapsible) {
                continue;
            }
            card = document.querySelector('[data-registry-section="' + section.id + '"]');
            collapsedSections[section.id] = card ? card.classList.contains("is-section-collapsed") : registrySectionCollapsedValue(toolDef, section, registrySectionToggleValue(toolDef, section));
        }

        return {
            collapsedSections: collapsedSections
        };
    }

    function saveRegistryToolValues(toolDef) {
        var state;
        if (!toolDef || !toolDef.id) {
            return;
        }
        state = {
            version: 1,
            toolId: toolDef.id,
            values: collectSchemaValues(toolDef),
            uiState: collectRegistryUiState(toolDef)
        };
        RegistryToolState[toolDef.id] = state;
        saveStoredJson(registryToolStorageKey(toolDef), state);
    }

    function scheduleRegistryToolSave(toolDef) {
        if (!toolDef || !toolDef.id) {
            return;
        }
        if (panelShuttingDown) {
            return;
        }
        if (RegistrySaveTimers[toolDef.id]) {
            window.clearTimeout(RegistrySaveTimers[toolDef.id]);
        }
        RegistrySaveTimers[toolDef.id] = window.setTimeout(function () {
            RegistrySaveTimers[toolDef.id] = null;
            saveRegistryToolValues(toolDef);
        }, 150);
    }

    function clearRegistrySaveTimers() {
        var key;
        for (key in RegistrySaveTimers) {
            if (Object.prototype.hasOwnProperty.call(RegistrySaveTimers, key) && RegistrySaveTimers[key]) {
                window.clearTimeout(RegistrySaveTimers[key]);
                RegistrySaveTimers[key] = null;
            }
        }
        clearRegistryProceduralPreviewTimer();
    }

    function resetRegistryToolValues(toolId) {
        var tool = DynamicTools[toolId];
        if (!tool) {
            return;
        }
        try {
            window.localStorage.removeItem(registryToolStorageKey(tool));
        } catch (err) {
        }
        delete RegistryToolState[toolId];
        renderRegistryToolDetail(tool);
        setStatus(tr("common.valuesReset"), "ok");
    }

    function findSchemaFieldByKey(toolDef, key) {
        var sections = getToolSections(toolDef);
        var i;
        var j;
        var fields;
        for (i = 0; i < sections.length; i++) {
            fields = sections[i] && sections[i].fields ? sections[i].fields : [];
            for (j = 0; j < fields.length; j++) {
                if (fields[j] && fields[j].key === key) {
                    return fields[j];
                }
            }
        }
        return null;
    }

    function resetRegistryToolFields(toolDef, keys) {
        var state;
        var i;
        var field;
        if (!toolDef || !toolDef.id || !keys || !keys.length) {
            return;
        }
        state = {
            version: 1,
            toolId: toolDef.id,
            values: collectSchemaValues(toolDef),
            uiState: collectRegistryUiState(toolDef)
        };
        for (i = 0; i < keys.length; i++) {
            field = findSchemaFieldByKey(toolDef, keys[i]);
            if (field) {
                state.values[keys[i]] = schemaDefaultValue(field);
            }
        }
        RegistryToolState[toolDef.id] = state;
        saveStoredJson(registryToolStorageKey(toolDef), state);
        renderRegistryToolDetail(toolDef);
        setStatus(tr("common.valuesReset"), "ok");
    }

    function schemaHintText(field) {
        if (!field) {
            return "";
        }
        if (field.hintKey) {
            return tr(field.hintKey);
        }
        if (field.descriptionKey) {
            return tr(field.descriptionKey);
        }
        if (field.helpTextKey) {
            return tr(field.helpTextKey);
        }
        return field.hint || field.description || field.helpText || "";
    }

    function applySchemaNumberAttributes(input, field) {
        if (typeof field.min !== "undefined") {
            input.min = field.min;
        }
        if (typeof field.max !== "undefined") {
            input.max = field.max;
        }
        if (typeof field.step !== "undefined") {
            input.step = field.step;
        }
    }

    function normalizeSchemaNumber(value, field, fallback) {
        var numeric = Number(value);
        var min = typeof field.min !== "undefined" ? Number(field.min) : null;
        var max = typeof field.max !== "undefined" ? Number(field.max) : null;

        if (isNaN(numeric)) {
            numeric = Number(fallback);
        }
        if (isNaN(numeric)) {
            numeric = Number(schemaDefaultValue(field));
        }
        if (isNaN(numeric)) {
            numeric = 0;
        }
        if (min !== null && !isNaN(min)) {
            numeric = Math.max(min, numeric);
        }
        if (max !== null && !isNaN(max)) {
            numeric = Math.min(max, numeric);
        }
        return numeric;
    }

    function setSchemaNumberValue(input, value, field) {
        var step = typeof field.step !== "undefined" ? Number(field.step) : 1;
        var numeric = normalizeSchemaNumber(value, field, input.value);
        var decimals = 0;
        var stepText;

        if (!isNaN(step) && step > 0) {
            stepText = String(step);
            if (stepText.indexOf(".") >= 0) {
                decimals = stepText.length - stepText.indexOf(".") - 1;
            }
        }
        input.value = decimals > 0 ? numeric.toFixed(decimals) : String(Math.round(numeric));
    }

    function isSchemaNumberDraftValue(value) {
        var text = String(value || "").trim();
        return text === "" ||
            text === "-" ||
            text === "+" ||
            text === "." ||
            text === "-." ||
            text === "+." ||
            /\.$/.test(text);
    }

    function commitSchemaNumberInput(input, field, fallback, onCommit) {
        var normalized = normalizeSchemaNumber(input.value, field, fallback);
        setSchemaNumberValue(input, normalized, field);
        if (onCommit) {
            onCommit(input.value);
        }
    }

    function setupRegistryNumberDrag(input, field, onUpdate, options) {
        var suppressNextClick = false;
        var editStartValue = input.value;
        var skipNextBlurCommit = false;
        options = options || null;

        input.classList.add("registry-number-input", "is-drag-ready");

        input.addEventListener("focus", function () {
            editStartValue = input.value;
            input.classList.add("is-editing-number");
        });

        input.addEventListener("blur", function () {
            input.classList.remove("is-editing-number");
            if (options && options.onCommit && !skipNextBlurCommit) {
                commitSchemaNumberInput(input, field, editStartValue, options.onCommit);
            }
            skipNextBlurCommit = false;
        });

        input.addEventListener("click", function (event) {
            if (suppressNextClick) {
                suppressNextClick = false;
                event.preventDefault();
                return;
            }
            input.classList.add("is-editing-number");
            try {
                input.select();
            } catch (err) {
            }
        });

        input.addEventListener("keydown", function (event) {
            if (event.keyCode === 13) {
                if (options && options.onCommit) {
                    commitSchemaNumberInput(input, field, editStartValue, options.onCommit);
                    skipNextBlurCommit = true;
                }
                input.blur();
            } else if (event.keyCode === 27) {
                if (options && options.onCancel) {
                    event.preventDefault();
                    event.stopPropagation();
                    setSchemaNumberValue(input, editStartValue, field);
                    options.onCancel(input.value);
                    skipNextBlurCommit = true;
                }
                input.blur();
            } else if (options && (event.keyCode === 38 || event.keyCode === 40)) {
                var direction = event.keyCode === 38 ? 1 : -1;
                var step = Number(field.step);
                var current = normalizeSchemaNumber(input.value, field, editStartValue);
                event.preventDefault();
                event.stopPropagation();
                if (isNaN(step) || step <= 0) {
                    step = 1;
                }
                setSchemaNumberValue(input, current + direction * step, field);
                if (onUpdate) {
                    onUpdate(input.value);
                }
            }
        });

        input.addEventListener("mousedown", function (event) {
            var startX;
            var startValue;
            var step;
            var dragging = false;
            var previousUserSelect;
            var wasEditing = input.classList.contains("is-editing-number") || document.activeElement === input;

            if (event.button !== 0) {
                return;
            }
            if (wasEditing) {
                return;
            }

            startX = event.clientX;
            startValue = normalizeSchemaNumber(input.value, field, schemaDefaultValue(field));
            step = Number(field.step);
            if (isNaN(step) || step <= 0) {
                step = 1;
            }
            previousUserSelect = document.body.style.userSelect;

            function move(moveEvent) {
                var delta = moveEvent.clientX - startX;
                var next;
                if (Math.abs(delta) < 4 && !dragging) {
                    return;
                }
                dragging = true;
                input.blur();
                input.classList.remove("is-editing-number");
                input.classList.add("is-dragging-number");
                document.body.style.userSelect = "none";
                moveEvent.preventDefault();
                next = startValue + (delta / 8) * step;
                setSchemaNumberValue(input, next, field);
                if (onUpdate) {
                    onUpdate(input.value);
                }
            }

            function up() {
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", up);
                document.body.style.userSelect = previousUserSelect;
                input.classList.remove("is-dragging-number");
                if (dragging) {
                    suppressNextClick = true;
                    window.setTimeout(function () {
                        suppressNextClick = false;
                    }, 0);
                    if (onUpdate) {
                        onUpdate(input.value);
                    }
                }
            }

            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", up);
        });
    }

    function syncRegistryColorField(hexInput, swatch, fallback) {
        var normalized = normalizeHex(hexInput.value, fallback || "#ffffff").toLowerCase();
        hexInput.value = normalized;
        swatch.style.backgroundColor = normalized;
        return normalized;
    }

    function syncRegistryRangeField(rangeInput, numberInput) {
        if (numberInput) {
            numberInput.value = rangeInput.value;
        }
    }

    function currentSchemaValue(toolDef, key) {
        var input = byId(dynamicFieldId(toolDef.id, key));
        if (input) {
            if (input.type === "checkbox") {
                return !!input.checked;
            }
            return input.value;
        }
        return (RegistryToolState[toolDef.id] && RegistryToolState[toolDef.id].values) ? RegistryToolState[toolDef.id].values[key] : undefined;
    }

    function visibleWhenMatches(field, toolDef) {
        var rule = field && field.visibleWhen;
        var value;
        var i;

        if (!rule || !rule.key) {
            return true;
        }

        value = currentSchemaValue(toolDef, rule.key);
        if (typeof rule.equals !== "undefined") {
            return value === rule.equals;
        }
        if (rule["in"] && rule["in"] instanceof Array) {
            for (i = 0; i < rule["in"].length; i++) {
                if (value === rule["in"][i]) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    function applyVisibleWhenMetadata(row, field) {
        var values;
        if (!row || !field || !field.visibleWhen || !field.visibleWhen.key) {
            return;
        }
        row.setAttribute("data-visible-key", field.visibleWhen.key);
        if (typeof field.visibleWhen.equals !== "undefined") {
            row.setAttribute("data-visible-equals", field.visibleWhen.equals);
        }
        if (field.visibleWhen["in"] && field.visibleWhen["in"] instanceof Array) {
            values = [];
            for (var i = 0; i < field.visibleWhen["in"].length; i++) {
                values[values.length] = field.visibleWhen["in"][i];
            }
            row.setAttribute("data-visible-in", values.join("|"));
        }
    }

    function updateRegistryVisibleFields(toolDef) {
        var rows = document.querySelectorAll(".registry-schema-field[data-visible-key]");
        var i;
        var row;
        var key;
        var equalsValue;
        var inValue;
        var current;
        var visible;

        for (i = 0; i < rows.length; i++) {
            row = rows[i];
            key = row.getAttribute("data-visible-key");
            equalsValue = row.getAttribute("data-visible-equals");
            inValue = row.getAttribute("data-visible-in");
            current = currentSchemaValue(toolDef, key);
            visible = true;
            if (equalsValue !== null) {
                visible = current === equalsValue;
            } else if (inValue) {
                visible = ("|" + inValue + "|").indexOf("|" + current + "|") >= 0;
            }
            row.classList.toggle("is-registry-hidden", !visible);
        }
    }

    function getRegistryRuntime(toolId) {
        if (!toolId) {
            return null;
        }
        if (!RegistryRuntimeStates[toolId]) {
            RegistryRuntimeStates[toolId] = {
                state: {},
                lastResult: null,
                timer: null,
                pending: false
            };
        }
        return RegistryRuntimeStates[toolId];
    }

    function stopRegistryStatePolling(toolId) {
        var key;
        var runtime;
        if (toolId) {
            runtime = RegistryRuntimeStates[toolId];
            if (runtime && runtime.timer) {
                window.clearInterval(runtime.timer);
                runtime.timer = null;
            }
            return;
        }
        for (key in RegistryRuntimeStates) {
            if (Object.prototype.hasOwnProperty.call(RegistryRuntimeStates, key)) {
                stopRegistryStatePolling(key);
            }
        }
    }

    function normalizeRegistryStateResult(result) {
        if (!result || typeof result !== "object") {
            return {};
        }
        if (result.state && typeof result.state === "object") {
            return result.state;
        }
        return result;
    }

    function registryStateValue(toolDef, key) {
        var runtime = toolDef && toolDef.id ? getRegistryRuntime(toolDef.id) : null;
        if (!runtime || !runtime.state) {
            return undefined;
        }
        return runtime.state[key];
    }

    function stateValueMatches(value, expected) {
        if (typeof expected === "undefined") {
            return !!value;
        }
        if (typeof expected === "boolean") {
            return !!value === expected;
        }
        if (typeof expected === "number") {
            return Number(value) === expected;
        }
        return String(value) === String(expected);
    }

    function schemaStateDisabled(item, toolDef) {
        var rule;
        var value;
        if (!item) {
            return false;
        }
        rule = item.disabledWhen;
        if (rule && rule.stateKey) {
            value = registryStateValue(toolDef, rule.stateKey);
            if (stateValueMatches(value, rule.equals)) {
                return true;
            }
        }
        rule = item.enabledWhen;
        if (rule && rule.stateKey) {
            value = registryStateValue(toolDef, rule.stateKey);
            if (!stateValueMatches(value, rule.equals)) {
                return true;
            }
        }
        return false;
    }

    function applyStateConditionMetadata(element, item, toolDef) {
        if (!element || !item) {
            return;
        }
        if (toolDef && toolDef.id) {
            element.setAttribute("data-registry-tool-id", toolDef.id);
        }
        if (item.disabledWhen && item.disabledWhen.stateKey) {
            element.setAttribute("data-disabled-state-key", item.disabledWhen.stateKey);
            if (typeof item.disabledWhen.equals !== "undefined") {
                element.setAttribute("data-disabled-state-equals", String(item.disabledWhen.equals));
            }
        }
        if (item.enabledWhen && item.enabledWhen.stateKey) {
            element.setAttribute("data-enabled-state-key", item.enabledWhen.stateKey);
            if (typeof item.enabledWhen.equals !== "undefined") {
                element.setAttribute("data-enabled-state-equals", String(item.enabledWhen.equals));
            }
        }
        if ((item.disabledWhen && item.disabledWhen.stateKey) || (item.enabledWhen && item.enabledWhen.stateKey)) {
            element.setAttribute("data-registry-state-conditioned", "true");
            element.disabled = schemaStateDisabled(item, toolDef);
            element.classList.toggle("is-state-disabled", element.disabled);
        }
    }

    function elementStateDisabled(element, toolDef) {
        var key;
        var expected;
        var value;
        var section = element.closest ? element.closest(".is-section-disabled") : null;

        if (section) {
            return true;
        }

        key = element.getAttribute("data-disabled-state-key");
        if (key) {
            expected = element.hasAttribute("data-disabled-state-equals") ? element.getAttribute("data-disabled-state-equals") : undefined;
            value = registryStateValue(toolDef, key);
            if (stateValueMatches(value, expected)) {
                return true;
            }
        }
        key = element.getAttribute("data-enabled-state-key");
        if (key) {
            expected = element.hasAttribute("data-enabled-state-equals") ? element.getAttribute("data-enabled-state-equals") : undefined;
            value = registryStateValue(toolDef, key);
            if (!stateValueMatches(value, expected)) {
                return true;
            }
        }
        return false;
    }

    function updateRegistryStateCard(toolDef) {
        var card = toolDef && toolDef.id ? document.querySelector('[data-registry-state-card="' + toolDef.id + '"]') : null;
        var runtime = toolDef && toolDef.id ? getRegistryRuntime(toolDef.id) : null;
        var fields = toolDef && toolDef.stateCard && toolDef.stateCard.fields ? toolDef.stateCard.fields : [];
        var i;
        var valueNode;
        var value;

        if (!card || !runtime) {
            return;
        }

        card.classList.toggle("is-ready", !!(runtime.lastResult && runtime.lastResult.ok));
        card.classList.toggle("is-error", !!(runtime.lastResult && runtime.lastResult.ok === false));
        for (i = 0; i < fields.length; i++) {
            valueNode = card.querySelector('[data-state-card-value="' + fields[i].stateKey + '"]');
            if (!valueNode) {
                continue;
            }
            value = registryStateValue(toolDef, fields[i].stateKey);
            valueNode.textContent = (typeof value === "undefined" || value === null || value === "") ?
                tr(fields[i].fallbackKey || "common.unavailable") :
                String(value);
        }
    }

    function updateRegistryStateDependentUi(toolDef) {
        var elements = toolDef && toolDef.id ? document.querySelectorAll('[data-registry-tool-id="' + toolDef.id + '"][data-registry-state-conditioned="true"]') : [];
        var i;
        var disabled;

        for (i = 0; i < elements.length; i++) {
            disabled = elementStateDisabled(elements[i], toolDef);
            elements[i].disabled = disabled;
            elements[i].classList.toggle("is-state-disabled", disabled);
        }
        updateRegistryStateCard(toolDef);
    }

    function refreshRegistryToolState(toolDef, callback) {
        var runtime;
        var hostFunction;

        if (!toolDef || !toolDef.id || !toolDef.stateAction || !toolDef.stateAction.hostFunction) {
            if (callback) {
                callback(null);
            }
            return;
        }

        runtime = getRegistryRuntime(toolDef.id);
        if (panelShuttingDown || panelSuspended) {
            if (callback) {
                callback(null);
            }
            return;
        }
        if (runtime.pending) {
            return;
        }

        runtime.pending = true;
        hostFunction = toolDef.stateAction.hostFunction;
        evalHost(hostFunction + "()", function (raw) {
            var result = parseResult(raw);
            runtime.pending = false;
            if (panelShuttingDown || panelSuspended) {
                return;
            }
            runtime.lastResult = result;
            runtime.state = normalizeRegistryStateResult(result);
            updateRegistryStateDependentUi(toolDef);
            if (callback) {
                callback(result);
            }
        });
    }

    function startRegistryStatePolling(toolDef) {
        var runtime;
        var intervalMs;

        stopRegistryStatePolling();
        if (!toolDef || !toolDef.id || !toolDef.stateAction || !toolDef.stateAction.hostFunction) {
            return;
        }

        runtime = getRegistryRuntime(toolDef.id);
        intervalMs = Number(toolDef.stateAction.intervalMs || 0);
        refreshRegistryToolState(toolDef);
        if (intervalMs > 0) {
            runtime.timer = window.setInterval(function () {
                if (activeToolId === toolDef.id) {
                    refreshRegistryToolState(toolDef);
                }
            }, Math.max(350, intervalMs));
        }
    }

    function mergeActionPayload(params, payload) {
        var out = {};
        var key;
        params = params || {};
        payload = payload || {};
        for (key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                out[key] = params[key];
            }
        }
        for (key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                out[key] = payload[key];
            }
        }
        return out;
    }

    function findRegistryAction(toolDef, actionId) {
        var actions = toolDef && toolDef.actions ? toolDef.actions : [];
        var i;
        for (i = 0; i < actions.length; i++) {
            if (actions[i] && actions[i].id === actionId) {
                return actions[i];
            }
        }
        return null;
    }

    function dynamicActionMessage(result, fallbackKey) {
        if (result && result.messageKey) {
            return tr(result.messageKey, result);
        }
        return tr(fallbackKey || "status.ready", result || {});
    }

    function clamp(value, min, max) {
        var numeric = Number(value);
        if (isNaN(numeric)) {
            numeric = min;
        }
        return Math.max(min, Math.min(max, numeric));
    }

    function normalizeRgbChannel(value) {
        return Math.round(clamp(value, 0, 255));
    }

    function normalizeUnitChannel(value) {
        return clamp(value, 0, 1);
    }

    function normalizeHueChannel(value) {
        var h = Number(value);
        if (isNaN(h)) {
            h = 0;
        }
        h = h % 360;
        if (h < 0) {
            h += 360;
        }
        return h;
    }

    function parseHexColor(hex, fallback) {
        var fallbackColor;
        var value = String(hex || "").replace("#", "").trim();
        var alpha = 255;

        if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) {
            if (fallback && String(fallback) !== String(hex)) {
                return parseHexColor(fallback, "#ffffff");
            }
            fallbackColor = { r: 255, g: 255, b: 255, a: 1 };
            return fallbackColor;
        }
        if (value.length === 8) {
            alpha = parseInt(value.substr(6, 2), 16);
        }
        return {
            r: parseInt(value.substr(0, 2), 16),
            g: parseInt(value.substr(2, 2), 16),
            b: parseInt(value.substr(4, 2), 16),
            a: alpha / 255
        };
    }

    function formatHexPart(value) {
        var text = normalizeRgbChannel(value).toString(16);
        return text.length < 2 ? "0" + text : text;
    }

    function formatHexColor(color, includeAlpha) {
        var alpha = typeof color.a === "number" ? color.a : 1;
        var hex = "#" + formatHexPart(color.r) + formatHexPart(color.g) + formatHexPart(color.b);
        if (includeAlpha) {
            hex += formatHexPart(alpha * 255);
        }
        return hex.toLowerCase();
    }

    function isCompleteHexColor(value) {
        return /^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(String(value || "").trim());
    }

    function hexToRgb(hex) {
        return parseHexColor(hex, "#ffffff");
    }

    function rgbToHex(r, g, b) {
        return formatHexColor({ r: r, g: g, b: b, a: 1 }, false);
    }

    function rgbToHsv(rgb) {
        var r = normalizeRgbChannel(rgb.r) / 255;
        var g = normalizeRgbChannel(rgb.g) / 255;
        var b = normalizeRgbChannel(rgb.b) / 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var d = max - min;
        var h = 0;
        var s = max === 0 ? 0 : d / max;
        var v = max;

        if (d !== 0) {
            if (max === r) {
                h = ((g - b) / d) % 6;
            } else if (max === g) {
                h = (b - r) / d + 2;
            } else {
                h = (r - g) / d + 4;
            }
            h = h * 60;
            if (h < 0) {
                h += 360;
            }
        }
        return {
            h: normalizeHueChannel(h),
            s: normalizeUnitChannel(s),
            v: normalizeUnitChannel(v),
            a: typeof rgb.a === "number" ? normalizeUnitChannel(rgb.a) : 1
        };
    }

    function hsvToRgb(hsv) {
        var h = normalizeHueChannel(hsv.h);
        var s = normalizeUnitChannel(hsv.s);
        var v = normalizeUnitChannel(hsv.v);
        var c = v * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = v - c;
        var r = 0;
        var g = 0;
        var b = 0;

        if (h < 60) {
            r = c; g = x; b = 0;
        } else if (h < 120) {
            r = x; g = c; b = 0;
        } else if (h < 180) {
            r = 0; g = c; b = x;
        } else if (h < 240) {
            r = 0; g = x; b = c;
        } else if (h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        return {
            r: normalizeRgbChannel((r + m) * 255),
            g: normalizeRgbChannel((g + m) * 255),
            b: normalizeRgbChannel((b + m) * 255),
            a: typeof hsv.a === "number" ? normalizeUnitChannel(hsv.a) : 1
        };
    }

    function hsvToHex(hsv) {
        return formatHexColor(hsvToRgb(hsv), false);
    }

    function makeColorStateFromRgb(rgb) {
        var normalized = {
            r: normalizeRgbChannel(rgb.r),
            g: normalizeRgbChannel(rgb.g),
            b: normalizeRgbChannel(rgb.b),
            a: typeof rgb.a === "number" ? normalizeUnitChannel(rgb.a) : 1
        };
        var hsv = rgbToHsv(normalized);
        normalized.h = hsv.h;
        normalized.s = hsv.s;
        normalized.v = hsv.v;
        return normalized;
    }

    function makeColorStateFromHsv(hsv) {
        var rgb = hsvToRgb(hsv);
        return makeColorStateFromRgb({
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: typeof hsv.a === "number" ? hsv.a : rgb.a
        });
    }

    var ColorSampler = (function () {
        var unusableProviders = {};
        var immediateCancelThresholdMs = 500;

        function providerUnavailable(source, errorCode, message, reason) {
            return normalizePickResult({
                ok: false,
                unavailable: true,
                source: source,
                errorCode: errorCode || "PROVIDER_UNAVAILABLE",
                message: message || "",
                reason: reason || ""
            });
        }

        function providerCanceled(source, reason) {
            return normalizePickResult({
                ok: false,
                canceled: true,
                source: source,
                reason: reason || "user-cancel"
            });
        }

        function providerFailed(source, errorCode, message) {
            return normalizePickResult({
                ok: false,
                failed: true,
                source: source,
                errorCode: errorCode || "PROVIDER_FAILED",
                message: message || ""
            });
        }

        function detectNativeEyeDropper() {
            return typeof window !== "undefined" && typeof window.EyeDropper === "function";
        }

        function detectNodeCapability() {
            return !!getNodeRequire();
        }

        function getNodeRequire() {
            if (typeof window !== "undefined" && typeof window.require === "function") {
                return window.require;
            }
            if (typeof require === "function") {
                return require;
            }
            return null;
        }

        function detectChildProcessCapability() {
            var nodeRequire;
            var childProcess;
            nodeRequire = getNodeRequire();
            if (!nodeRequire) {
                return false;
            }
            try {
                childProcess = nodeRequire("child_process");
                return !!(childProcess && typeof childProcess.spawn === "function");
            } catch (err) {
                return false;
            }
        }

        function projectRootPath() {
            var nodeRequire = getNodeRequire();
            var pathModule;
            var locationPath;
            if (typeof window !== "undefined" && window.location && window.location.pathname) {
                locationPath = decodeURIComponent(window.location.pathname);
                if (/^\/[A-Za-z]:\//.test(locationPath)) {
                    locationPath = locationPath.substr(1);
                }
                locationPath = locationPath.replace(/\//g, "\\");
                return locationPath.replace(/\\client\\index\.html$/i, "");
            }
            if (nodeRequire && typeof __dirname === "string") {
                try {
                    pathModule = nodeRequire("path");
                    return pathModule.resolve(__dirname, "..", "..");
                } catch (err) {
                }
            }
            return "";
        }

        function helperScriptPath() {
            var nodeRequire = getNodeRequire();
            var root = projectRootPath();
            if (!root) {
                return "";
            }
            if (nodeRequire) {
                try {
                    return nodeRequire("path").join(root, "helpers", "win", "eyedropper", "windows-eyedropper.ps1");
                } catch (err) {
                }
            }
            return root + "\\helpers\\win\\eyedropper\\windows-eyedropper.ps1";
        }

        var NativeBridge = {
            helperTimeoutMs: 20000,
            runJsonHelper: function (command, args, options) {
                return new Promise(function (resolve) {
                    var nodeRequire = getNodeRequire();
                    var childProcess;
                    var child;
                    var stdout = "";
                    var stderr = "";
                    var completed = false;
                    var timer = null;

                    function finish(result) {
                        if (completed) {
                            return;
                        }
                        completed = true;
                        if (timer) {
                            clearTimeout(timer);
                            timer = null;
                        }
                        resolve(result);
                    }

                    if (!nodeRequire) {
                        finish(providerUnavailable("windows-helper", "NODE_UNAVAILABLE", "Node require is unavailable."));
                        return;
                    }
                    try {
                        childProcess = nodeRequire("child_process");
                    } catch (err) {
                        finish(providerUnavailable("windows-helper", "CHILD_PROCESS_UNAVAILABLE", "child_process is unavailable."));
                        return;
                    }

                    try {
                        child = childProcess.spawn(command, args || [], {
                            windowsHide: true,
                            stdio: ["ignore", "pipe", "pipe"]
                        });
                    } catch (exc) {
                        finish(providerFailed("windows-helper", "SPAWN_FAILED", exc && exc.message ? exc.message : "spawn failed"));
                        return;
                    }

                    timer = setTimeout(function () {
                        try {
                            child.kill();
                        } catch (err) {
                        }
                        finish(providerFailed("windows-helper", "TIMEOUT", "Helper timed out."));
                    }, options && options.timeoutMs ? options.timeoutMs : NativeBridge.helperTimeoutMs);

                    child.stdout.on("data", function (chunk) {
                        stdout += chunk ? String(chunk) : "";
                    });
                    child.stderr.on("data", function (chunk) {
                        stderr += chunk ? String(chunk) : "";
                    });
                    child.on("error", function (error) {
                        finish(providerFailed("windows-helper", "SPAWN_ERROR", error && error.message ? error.message : "spawn error"));
                    });
                    child.on("close", function (code) {
                        var parsed;
                        if (completed) {
                            return;
                        }
                        if (!stdout) {
                            finish(providerFailed("windows-helper", code === 0 ? "EMPTY_OUTPUT" : "HELPER_FAILED", stderr || "Helper returned no output."));
                            return;
                        }
                        try {
                            parsed = JSON.parse(stdout.trim());
                        } catch (err) {
                            finish(providerFailed("windows-helper", "INVALID_JSON", stderr || "Helper returned invalid JSON."));
                            return;
                        }
                        if (!parsed.ok && !parsed.canceled && !parsed.failed && !parsed.unavailable && code !== 0) {
                            parsed.failed = true;
                            parsed.errorCode = parsed.errorCode || "HELPER_FAILED";
                            parsed.message = parsed.message || stderr || "Helper failed.";
                        }
                        finish(normalizePickResult(parsed));
                    });
                });
            }
        };

        function markProviderUnusable(providerId, reason) {
            unusableProviders[providerId] = {
                reason: reason || "unusable",
                at: Date.now()
            };
        }

        function isProviderUnusable(providerId) {
            return !!unusableProviders[providerId];
        }

        function errorName(error) {
            return error && error.name ? String(error.name) : "Error";
        }

        function errorCodeFromName(name) {
            return String(name || "Error").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
        }

        function normalizePickResult(result) {
            var normalized = result || {};
            var hex = normalized.hex || normalized.sRGBHex || "";
            if (normalized.ok && isCompleteHexColor(hex)) {
                normalized.hex = formatHexColor(parseHexColor(hex, "#ffffff"), false);
                normalized.ok = true;
                normalized.source = normalized.source || "unknown";
                return normalized;
            }
            if (normalized.ok) {
                normalized.ok = false;
                normalized.failed = true;
                normalized.errorCode = normalized.errorCode || "INVALID_COLOR";
            }
            normalized.source = normalized.source || "unknown";
            return normalized;
        }

        var NativeEyeDropperProvider = {
            id: "native-eyedropper",
            isAvailable: function () {
                return detectNativeEyeDropper() && !isProviderUnusable(this.id);
            },
            pickColor: function () {
                var picker;
                var startedAt;
                var promise;

                if (!detectNativeEyeDropper()) {
                    return Promise.resolve(providerUnavailable(this.id, "PROVIDER_UNAVAILABLE", "Native EyeDropper is not available."));
                }
                if (isProviderUnusable(this.id)) {
                    return Promise.resolve(providerUnavailable(this.id, "PROVIDER_UNUSABLE", "Native EyeDropper was marked unusable in this session.", "session-unusable"));
                }

                try {
                    picker = new window.EyeDropper();
                    startedAt = Date.now();
                    promise = picker.open();
                } catch (exc) {
                    if (errorName(exc) === "SecurityError" || errorName(exc) === "NotAllowedError" || errorName(exc) === "TypeError") {
                        markProviderUnusable(this.id, errorName(exc));
                        return Promise.resolve(providerUnavailable(this.id, errorCodeFromName(errorName(exc)), errorName(exc), "provider-error"));
                    }
                    return Promise.resolve(providerFailed(this.id, errorCodeFromName(errorName(exc)), errorName(exc)));
                }

                if (!promise || typeof promise.then !== "function") {
                    markProviderUnusable(this.id, "open-returned-non-promise");
                    return Promise.resolve(providerUnavailable(this.id, "PROVIDER_UNUSABLE", "Native EyeDropper did not return a promise.", "open-returned-non-promise"));
                }

                return promise.then(function (result) {
                    return normalizePickResult({
                        ok: true,
                        hex: result && result.sRGBHex,
                        source: NativeEyeDropperProvider.id
                    });
                })["catch"](function (error) {
                    var name = errorName(error);
                    var elapsed = Date.now() - startedAt;

                    if (name === "AbortError" && elapsed <= immediateCancelThresholdMs) {
                        markProviderUnusable(NativeEyeDropperProvider.id, "immediate-abort");
                        return providerUnavailable(NativeEyeDropperProvider.id, "PROVIDER_UNUSABLE", "Native EyeDropper immediately canceled in this CEP runtime.", "immediate-abort");
                    }
                    if (name === "AbortError") {
                        return providerCanceled(NativeEyeDropperProvider.id, "user-cancel");
                    }
                    if (name === "SecurityError" || name === "NotAllowedError" || name === "TypeError") {
                        markProviderUnusable(NativeEyeDropperProvider.id, name);
                        return providerUnavailable(NativeEyeDropperProvider.id, errorCodeFromName(name), name, "provider-error");
                    }
                    return providerFailed(NativeEyeDropperProvider.id, errorCodeFromName(name), name);
                });
            }
        };

        var WindowsHelperProvider = {
            id: "windows-helper",
            isAvailable: function () {
                var nodeRequire = getNodeRequire();
                var fsModule;
                if (!nodeRequire || !detectChildProcessCapability()) {
                    return false;
                }
                if (typeof process !== "undefined" && process.platform && process.platform !== "win32") {
                    return false;
                }
                try {
                    fsModule = nodeRequire("fs");
                    return fsModule.existsSync(helperScriptPath());
                } catch (err) {
                    return false;
                }
            },
            pickColor: function () {
                var nodeRequire = getNodeRequire();
                var fsModule;
                var scriptPath = helperScriptPath();

                if (!nodeRequire || !detectChildProcessCapability()) {
                    return Promise.resolve(providerUnavailable(this.id, "CHILD_PROCESS_UNAVAILABLE", "child_process is unavailable."));
                }
                if (typeof process !== "undefined" && process.platform && process.platform !== "win32") {
                    return Promise.resolve(providerUnavailable(this.id, "WINDOWS_ONLY", "Windows helper is only available on Windows."));
                }
                try {
                    fsModule = nodeRequire("fs");
                    if (!scriptPath || !fsModule.existsSync(scriptPath)) {
                        return Promise.resolve(providerUnavailable(this.id, "HELPER_NOT_FOUND", "Windows eyedropper helper was not found."));
                    }
                } catch (err) {
                    return Promise.resolve(providerUnavailable(this.id, "FS_UNAVAILABLE", "Filesystem access is unavailable."));
                }
                return NativeBridge.runJsonHelper("powershell.exe", [
                    "-NoLogo",
                    "-NoProfile",
                    "-WindowStyle",
                    "Hidden",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    scriptPath,
                    "-TimeoutSeconds",
                    "20"
                ], {
                    timeoutMs: NativeBridge.helperTimeoutMs
                }).then(function (result) {
                    result = normalizePickResult(result);
                    result.source = WindowsHelperProvider.id;
                    if (result.ok || result.canceled || result.unavailable || result.failed) {
                        return result;
                    }
                    return providerFailed(WindowsHelperProvider.id, "HELPER_FAILED", "Windows helper returned an unknown result.");
                });
            }
        };

        var UnavailableProvider = {
            id: "unavailable",
            pickColor: function () {
                return Promise.resolve(providerUnavailable(this.id, "PROVIDER_UNAVAILABLE", "No color sampler provider is available."));
            }
        };

        function pickColor(options) {
            var providers = [NativeEyeDropperProvider, WindowsHelperProvider, UnavailableProvider];
            var index = 0;

            function tryNext() {
                var provider = providers[index];
                index += 1;
                if (!provider) {
                    return Promise.resolve(UnavailableProvider.pickColor(options));
                }
                return provider.pickColor(options).then(function (result) {
                    var normalized = normalizePickResult(result);
                    if (normalized.ok || normalized.canceled || normalized.failed) {
                        return normalized;
                    }
                    if (normalized.unavailable && provider.id !== UnavailableProvider.id) {
                        return tryNext();
                    }
                    return normalized;
                });
            }

            return tryNext();
        }

        return {
            detectNativeEyeDropper: detectNativeEyeDropper,
            detectNodeCapability: detectNodeCapability,
            detectChildProcessCapability: detectChildProcessCapability,
            pickColor: pickColor,
            normalizePickResult: normalizePickResult,
            markProviderUnusable: markProviderUnusable,
            isProviderUnusable: isProviderUnusable,
            NativeEyeDropperProvider: NativeEyeDropperProvider,
            WindowsHelperProvider: WindowsHelperProvider,
            UnavailableProvider: UnavailableProvider
        };
    }());

    function validColorPickerAxisMode(mode) {
        return mode === "hsv-h" || mode === "hsv-s" || mode === "hsv-v" ||
            mode === "rgb-r" || mode === "rgb-g" || mode === "rgb-b";
    }

    function loadColorPickerAxisMode() {
        var saved = null;
        try {
            saved = window.localStorage.getItem(StorageKeys.colorPickerAxis);
        } catch (err) {
        }
        return validColorPickerAxisMode(saved) ? saved : "hsv-v";
    }

    function saveColorPickerAxisMode(mode) {
        if (!validColorPickerAxisMode(mode)) {
            return;
        }
        try {
            window.localStorage.setItem(StorageKeys.colorPickerAxis, mode);
        } catch (err) {
        }
    }

    function getAxisValue(color, axisMode) {
        if (axisMode === "hsv-h") {
            return color.h / 359;
        }
        if (axisMode === "hsv-s") {
            return color.s;
        }
        if (axisMode === "hsv-v") {
            return color.v;
        }
        if (axisMode === "rgb-r") {
            return color.r / 255;
        }
        if (axisMode === "rgb-g") {
            return color.g / 255;
        }
        return color.b / 255;
    }

    function getPlanePoint(color, axisMode) {
        if (axisMode === "hsv-h") {
            return { x: color.s, y: 1 - color.v };
        }
        if (axisMode === "hsv-s") {
            return { x: color.h / 359, y: 1 - color.v };
        }
        if (axisMode === "hsv-v") {
            return { x: color.h / 359, y: 1 - color.s };
        }
        if (axisMode === "rgb-r") {
            return { x: color.g / 255, y: 1 - color.b / 255 };
        }
        if (axisMode === "rgb-g") {
            return { x: color.r / 255, y: 1 - color.b / 255 };
        }
        return { x: color.r / 255, y: 1 - color.g / 255 };
    }

    function colorFromPlanePoint(color, axisMode, x, y) {
        x = normalizeUnitChannel(x);
        y = normalizeUnitChannel(y);
        if (axisMode === "hsv-h") {
            return makeColorStateFromHsv({ h: color.h, s: x, v: 1 - y, a: color.a });
        }
        if (axisMode === "hsv-s") {
            return makeColorStateFromHsv({ h: x * 359, s: color.s, v: 1 - y, a: color.a });
        }
        if (axisMode === "hsv-v") {
            return makeColorStateFromHsv({ h: x * 359, s: 1 - y, v: color.v, a: color.a });
        }
        if (axisMode === "rgb-r") {
            return makeColorStateFromRgb({ r: color.r, g: x * 255, b: (1 - y) * 255, a: color.a });
        }
        if (axisMode === "rgb-g") {
            return makeColorStateFromRgb({ r: x * 255, g: color.g, b: (1 - y) * 255, a: color.a });
        }
        return makeColorStateFromRgb({ r: x * 255, g: (1 - y) * 255, b: color.b, a: color.a });
    }

    function colorFromAxisValue(color, axisMode, value) {
        value = normalizeUnitChannel(value);
        if (axisMode === "hsv-h") {
            return makeColorStateFromHsv({ h: value * 359, s: color.s, v: color.v, a: color.a });
        }
        if (axisMode === "hsv-s") {
            return makeColorStateFromHsv({ h: color.h, s: value, v: color.v, a: color.a });
        }
        if (axisMode === "hsv-v") {
            return makeColorStateFromHsv({ h: color.h, s: color.s, v: value, a: color.a });
        }
        if (axisMode === "rgb-r") {
            return makeColorStateFromRgb({ r: value * 255, g: color.g, b: color.b, a: color.a });
        }
        if (axisMode === "rgb-g") {
            return makeColorStateFromRgb({ r: color.r, g: value * 255, b: color.b, a: color.a });
        }
        return makeColorStateFromRgb({ r: color.r, g: color.g, b: value * 255, a: color.a });
    }

    function sampleColorForPlane(color, axisMode, x, y) {
        return colorFromPlanePoint(color, axisMode, x, y);
    }

    function sampleColorForAxis(color, axisMode, value) {
        return colorFromAxisValue(color, axisMode, value);
    }

    function resizeCanvasToDisplaySize(canvas) {
        var rect = canvas.getBoundingClientRect();
        var ratio = window.devicePixelRatio || 1;
        var width = Math.max(1, Math.round(rect.width * ratio));
        var height = Math.max(1, Math.round(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        return { width: width, height: height };
    }

    function drawColorPickerPlane(canvas, color, axisMode) {
        var size = resizeCanvasToDisplaySize(canvas);
        var ctx = canvas.getContext("2d");
        var image = ctx.createImageData(size.width, size.height);
        var data = image.data;
        var x;
        var y;
        var index;
        var sampled;

        for (y = 0; y < size.height; y++) {
            for (x = 0; x < size.width; x++) {
                sampled = sampleColorForPlane(color, axisMode, size.width <= 1 ? 0 : x / (size.width - 1), size.height <= 1 ? 0 : y / (size.height - 1));
                index = (y * size.width + x) * 4;
                data[index] = sampled.r;
                data[index + 1] = sampled.g;
                data[index + 2] = sampled.b;
                data[index + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    }

    function drawColorPickerAxis(canvas, color, axisMode) {
        var size = resizeCanvasToDisplaySize(canvas);
        var ctx = canvas.getContext("2d");
        var image = ctx.createImageData(size.width, size.height);
        var data = image.data;
        var x;
        var y;
        var index;
        var sampled;

        for (x = 0; x < size.width; x++) {
            sampled = sampleColorForAxis(color, axisMode, size.width <= 1 ? 0 : x / (size.width - 1));
            for (y = 0; y < size.height; y++) {
                index = (y * size.width + x) * 4;
                data[index] = sampled.r;
                data[index + 1] = sampled.g;
                data[index + 2] = sampled.b;
                data[index + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    }

    function closeRegistryColorPicker() {
        var picker = document.querySelector(".registry-color-picker-popover");
        if (picker && picker._cleanupColorPicker) {
            picker._cleanupColorPicker();
        }
        if (picker && picker.parentNode) {
            picker.parentNode.removeChild(picker);
        }
    }

    function openRegistryColorPicker(hexInput, swatch, fallback) {
        var color = makeColorStateFromRgb(parseHexColor(hexInput.value || fallback || "#ffffff", fallback || "#ffffff"));
        var axisMode = loadColorPickerAxisMode();
        var popover;
        var axisControls;
        var planeWrap;
        var planeCanvas;
        var planeHandle;
        var axisWrap;
        var axisCanvas;
        var axisHandle;
        var preview;
        var hexEdit;
        var outputRow;
        var eyedropperButton;
        var eyedropperStatus;
        var axisButtons = [];
        var channelSliders = {};
        var outsideBound = false;
        var outsideHandler = null;

        function applyColor(nextColor, skipNotify) {
            var hex;
            var point;
            color = nextColor || color;
            hex = formatHexColor(color, false);
            hexInput.value = hex;
            hexEdit.value = hex;
            swatch.style.backgroundColor = hex;
            preview.style.backgroundColor = hex;
            drawColorPickerPlane(planeCanvas, color, axisMode);
            drawColorPickerAxis(axisCanvas, color, axisMode);
            point = getPlanePoint(color, axisMode);
            planeHandle.style.left = (point.x * 100) + "%";
            planeHandle.style.top = (point.y * 100) + "%";
            axisHandle.style.left = (getAxisValue(color, axisMode) * 100) + "%";
            syncChannelSliders();
            if (!skipNotify && hexInput._registryOnValueChange) {
                hexInput._registryOnValueChange();
            }
        }

        function syncChannelSliders() {
            if (channelSliders.h) {
                channelSliders.h.value = Math.round(color.h);
            }
            if (channelSliders.s) {
                channelSliders.s.value = Math.round(color.s * 100);
            }
            if (channelSliders.v) {
                channelSliders.v.value = Math.round(color.v * 100);
            }
            if (channelSliders.r) {
                channelSliders.r.value = Math.round(color.r);
            }
            if (channelSliders.g) {
                channelSliders.g.value = Math.round(color.g);
            }
            if (channelSliders.b) {
                channelSliders.b.value = Math.round(color.b);
            }
        }

        function colorFromChannelValue(channel, value) {
            if (channel === "h") {
                return makeColorStateFromHsv({ h: clamp(value, 0, 360), s: color.s, v: color.v, a: color.a });
            }
            if (channel === "s") {
                return makeColorStateFromHsv({ h: color.h, s: clamp(value, 0, 100) / 100, v: color.v, a: color.a });
            }
            if (channel === "v") {
                return makeColorStateFromHsv({ h: color.h, s: color.s, v: clamp(value, 0, 100) / 100, a: color.a });
            }
            if (channel === "r") {
                return makeColorStateFromRgb({ r: clamp(value, 0, 255), g: color.g, b: color.b, a: color.a });
            }
            if (channel === "g") {
                return makeColorStateFromRgb({ r: color.r, g: clamp(value, 0, 255), b: color.b, a: color.a });
            }
            return makeColorStateFromRgb({ r: color.r, g: color.g, b: clamp(value, 0, 255), a: color.a });
        }

        function syncAxisButtons() {
            var i;
            for (i = 0; i < axisButtons.length; i++) {
                axisButtons[i].classList.toggle("is-active", axisButtons[i].getAttribute("data-axis-mode") === axisMode);
                axisButtons[i].setAttribute("aria-pressed", axisButtons[i].getAttribute("data-axis-mode") === axisMode ? "true" : "false");
            }
        }

        function setAxisMode(mode) {
            if (!validColorPickerAxisMode(mode) || mode === axisMode) {
                return;
            }
            axisMode = mode;
            saveColorPickerAxisMode(axisMode);
            syncAxisButtons();
            applyColor(color, true);
        }

        function pointFromEvent(event, element) {
            var box = element.getBoundingClientRect();
            return {
                x: box.width <= 0 ? 0 : normalizeUnitChannel((event.clientX - box.left) / box.width),
                y: box.height <= 0 ? 0 : normalizeUnitChannel((event.clientY - box.top) / box.height)
            };
        }

        function setPlaneFromEvent(event) {
            var point = pointFromEvent(event, planeCanvas);
            applyColor(colorFromPlanePoint(color, axisMode, point.x, point.y));
        }

        function setAxisFromEvent(event) {
            var point = pointFromEvent(event, axisCanvas);
            applyColor(colorFromAxisValue(color, axisMode, point.x));
        }

        function beginDrag(event, updateFn) {
            function move(moveEvent) {
                moveEvent.preventDefault();
                updateFn(moveEvent);
            }
            function up() {
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", up);
            }
            event.preventDefault();
            updateFn(event);
            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", up);
        }

        function renderAll() {
            positionPopover();
            applyColor(color, true);
        }

        function isPopoverMounted() {
            return !!(popover && popover.parentNode);
        }

        function setEyedropperBusy(isBusy) {
            if (!eyedropperButton) {
                return;
            }
            eyedropperButton.classList.toggle("is-busy", !!isBusy);
            eyedropperButton.setAttribute("aria-busy", isBusy ? "true" : "false");
        }

        function setEyedropperStatus(text, tone) {
            if (!eyedropperStatus) {
                return;
            }
            eyedropperStatus.textContent = text || "idle";
            eyedropperStatus.setAttribute("data-tone", tone || "idle");
        }

        function markEyeDropperUnavailable(message) {
            if (eyedropperButton) {
                eyedropperButton.setAttribute("title", message || "Eyedropper is not available in this CEP runtime.");
            }
            setEyedropperBusy(false);
            setEyedropperStatus("unavailable", "warn");
        }

        function runEyeDropper() {
            if (panelShuttingDown || !isPopoverMounted()) {
                return;
            }

            setEyedropperStatus("starting", "busy");
            setEyedropperBusy(true);
            ColorSampler.pickColor({ currentHex: formatHexColor(color, false) }).then(function (result) {
                if (panelShuttingDown || !isPopoverMounted()) {
                    return;
                }
                setEyedropperBusy(false);
                if (result && result.ok && isCompleteHexColor(result.hex)) {
                    applyColor(makeColorStateFromRgb(parseHexColor(result.hex, formatHexColor(color, false))));
                    setEyedropperStatus("picked", "ok");
                    return;
                }
                if (result && result.canceled) {
                    setEyedropperStatus("canceled", "idle");
                    return;
                }
                if (result && result.unavailable) {
                    markEyeDropperUnavailable(result.message || "Eyedropper is not available in this CEP runtime.");
                    return;
                }
                if (result && result.failed) {
                    setEyedropperStatus("failed: " + (result.errorCode || "error"), "error");
                    return;
                }
                setEyedropperStatus("failed", "error");
            })["catch"](function (error) {
                if (!panelShuttingDown && isPopoverMounted()) {
                    setEyedropperBusy(false);
                    setEyedropperStatus("failed: " + (error && error.name ? error.name : "error"), "error");
                }
            });
        }

        function cleanup() {
            setEyedropperBusy(false);
            window.removeEventListener("resize", renderAll);
            window.removeEventListener("scroll", closeRegistryColorPicker, true);
            if (outsideHandler) {
                document.removeEventListener("mousedown", outsideHandler);
                outsideHandler = null;
            }
        }

        function bindOutsideClose() {
            outsideHandler = function (event) {
                if (!popover.contains(event.target) && event.target !== swatch) {
                    closeRegistryColorPicker();
                }
            };
            if (!outsideBound) {
                outsideBound = true;
                document.addEventListener("mousedown", outsideHandler);
            }
        }

        function positionPopover() {
            var triggerRect = swatch.getBoundingClientRect();
            var popupRect = popover.getBoundingClientRect();
            var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 320;
            var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 480;
            var margin = 8;
            var gap = 8;
            var popupWidth = popupRect.width || popover.offsetWidth || 244;
            var popupHeight = popupRect.height || popover.offsetHeight || 260;
            var availableBelow = viewportHeight - triggerRect.bottom - gap - margin;
            var availableAbove = triggerRect.top - gap - margin;
            var left;
            var top;
            var openAbove;

            left = Math.max(margin, Math.min(triggerRect.left, viewportWidth - popupWidth - margin));
            openAbove = availableBelow < popupHeight && availableAbove > availableBelow;
            if (openAbove) {
                top = triggerRect.top - popupHeight - gap;
            } else {
                top = triggerRect.bottom + gap;
            }
            if (availableBelow < popupHeight && availableAbove < popupHeight) {
                if (availableAbove > availableBelow) {
                    top = triggerRect.top - popupHeight - gap;
                } else {
                    top = triggerRect.bottom + gap;
                }
            }
            top = Math.max(margin, Math.min(top, viewportHeight - popupHeight - margin));

            popover.classList.toggle("is-above", top < triggerRect.top);
            popover.style.left = left + "px";
            popover.style.top = top + "px";
        }

        closeRegistryColorPicker();
        popover = document.createElement("div");
        popover.className = "registry-color-picker-popover";
        popover._cleanupColorPicker = cleanup;

        axisControls = document.createElement("div");
        axisControls.className = "registry-color-axis-controls";

        function addAxisButton(mode, label) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "registry-color-axis-button";
            button.textContent = label;
            button.setAttribute("data-axis-mode", mode);
            button.setAttribute("title", mode.indexOf("hsv") === 0 ? "HSV " + label : "RGB " + label);
            button.addEventListener("click", function () {
                setAxisMode(this.getAttribute("data-axis-mode"));
            });
            axisButtons[axisButtons.length] = button;
            axisControls.appendChild(button);
        }

        addAxisButton("hsv-h", "H");
        addAxisButton("hsv-s", "S");
        addAxisButton("hsv-v", "V");
        addAxisButton("rgb-r", "R");
        addAxisButton("rgb-g", "G");
        addAxisButton("rgb-b", "B");

        function createChannelSliders() {
            var wrap = document.createElement("div");

            function addChannel(key, label, maxValue) {
                var row = document.createElement("label");
                var text = document.createElement("span");
                var slider = document.createElement("input");

                row.className = "registry-color-channel-row";
                text.className = "registry-color-channel-label";
                text.textContent = label;
                slider.type = "range";
                slider.className = "registry-color-channel-slider";
                slider.min = "0";
                slider.max = String(maxValue);
                slider.step = "1";
                slider.addEventListener("input", function () {
                    applyColor(colorFromChannelValue(key, this.value));
                });
                channelSliders[key] = slider;
                row.appendChild(text);
                row.appendChild(slider);
                wrap.appendChild(row);
            }

            wrap.className = "registry-color-channel-sliders";
            addChannel("h", "H", 360);
            addChannel("s", "S", 100);
            addChannel("v", "V", 100);
            addChannel("r", "R", 255);
            addChannel("g", "G", 255);
            addChannel("b", "B", 255);
            return wrap;
        }

        planeWrap = document.createElement("div");
        planeWrap.className = "registry-color-plane";
        planeCanvas = document.createElement("canvas");
        planeCanvas.className = "registry-color-plane-canvas";
        planeHandle = document.createElement("span");
        planeHandle.className = "registry-color-plane-handle";
        planeCanvas.addEventListener("mousedown", function (event) {
            beginDrag(event, setPlaneFromEvent);
        });
        planeWrap.appendChild(planeCanvas);
        planeWrap.appendChild(planeHandle);

        axisWrap = document.createElement("div");
        axisWrap.className = "registry-color-axis";
        axisCanvas = document.createElement("canvas");
        axisCanvas.className = "registry-color-axis-canvas";
        axisHandle = document.createElement("span");
        axisHandle.className = "registry-color-axis-handle";
        axisCanvas.addEventListener("mousedown", function (event) {
            beginDrag(event, setAxisFromEvent);
        });
        axisWrap.appendChild(axisCanvas);
        axisWrap.appendChild(axisHandle);

        preview = document.createElement("span");
        preview.className = "registry-hsv-preview";

        eyedropperButton = document.createElement("button");
        eyedropperButton.type = "button";
        eyedropperButton.className = "registry-eyedropper-button";
        eyedropperButton.textContent = "Pick";
        eyedropperButton.setAttribute("aria-label", "Eyedropper");
        eyedropperButton.setAttribute("title", "Pick a color from the screen");
        eyedropperButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            runEyeDropper();
        });

        eyedropperStatus = document.createElement("span");
        eyedropperStatus.className = "registry-eyedropper-status";
        setEyedropperStatus("idle", "idle");

        hexEdit = document.createElement("input");
        hexEdit.className = "registry-color-hex registry-hsv-hex";
        hexEdit.type = "text";
        hexEdit.setAttribute("spellcheck", "false");
        bindHexInputSelectBehavior(hexEdit);
        hexEdit.addEventListener("input", function () {
            if (isCompleteHexColor(this.value)) {
                color = makeColorStateFromRgb(parseHexColor(this.value, fallback || "#ffffff"));
                applyColor(color);
            }
        });
        hexEdit.addEventListener("change", function () {
            color = makeColorStateFromRgb(parseHexColor(this.value, fallback || "#ffffff"));
            applyColor(color);
        });

        outputRow = document.createElement("div");
        outputRow.className = "registry-color-output-row";
        outputRow.appendChild(preview);
        outputRow.appendChild(eyedropperButton);
        outputRow.appendChild(hexEdit);

        popover.appendChild(axisControls);
        popover.appendChild(planeWrap);
        popover.appendChild(axisWrap);
        popover.appendChild(createChannelSliders());
        popover.appendChild(outputRow);
        popover.appendChild(eyedropperStatus);
        document.body.appendChild(popover);

        positionPopover();
        syncAxisButtons();
        applyColor(color, true);
        window.addEventListener("resize", renderAll);
        window.addEventListener("scroll", closeRegistryColorPicker, true);

        window.setTimeout(bindOutsideClose, 0);
    }

    function renderSchemaField(field, toolDef) {
        var row;
        var labelColumn;
        var label;
        var hint;
        var wrap;
        var input;
        var numberInput;
        var swatch;
        var colorValue;
        var hintText;
        var i;
        var controls;
        var k;
        var option;
        var toolId = toolDef && toolDef.id ? toolDef.id : "";
        var fieldType = field && field.type ? field.type : "text";
        var fieldId = field && field.key ? dynamicFieldId(toolId, field.key) : "";
        var value = registryFieldValue(toolDef, field);

        function scheduleSave() {
            scheduleRegistryToolSave(toolDef);
            scheduleRegistryProceduralPreviewUpdate(toolDef, field && field.key);
        }

        if (!field) {
            return document.createDocumentFragment();
        }

        if (fieldType === "divider" || fieldType === "separator") {
            row = document.createElement("div");
            row.className = "registry-field-divider registry-schema-field";
            applyVisibleWhenMetadata(row, field);
            row.classList.toggle("is-registry-hidden", !visibleWhenMatches(field, toolDef));
            return row;
        }

        if (fieldType === "info" || fieldType === "note") {
            row = document.createElement("div");
            row.className = "registry-info-note registry-schema-field";
            row.textContent = tr(field.labelKey || field.textKey || field.text || "");
            applyVisibleWhenMetadata(row, field);
            row.classList.toggle("is-registry-hidden", !visibleWhenMatches(field, toolDef));
            return row;
        }

        if (fieldType === "proceduralPreview") {
            row = document.createElement("div");
            row.className = "registry-info-note registry-schema-field registry-procedural-preview is-preview-icon";
            row.setAttribute("data-procedural-preview-tool", toolId);
            applyVisibleWhenMetadata(row, field);
            row.classList.toggle("is-registry-hidden", !visibleWhenMatches(field, toolDef));

            label = document.createElement("strong");
            label.className = "registry-title-primary";
            label.textContent = tr(field.labelKey || field.key || "");
            row.appendChild(label);

            hintText = schemaHintText(field);
            if (hintText) {
                hint = document.createElement("small");
                hint.className = "registry-field-hint registry-text-muted";
                hint.textContent = hintText;
                row.appendChild(hint);
            }

            input = document.createElement("canvas");
            input.className = "registry-procedural-preview-canvas";
            input.setAttribute("data-procedural-preview-canvas", "true");
            row.appendChild(input);

            hint = document.createElement("span");
            hint.className = "registry-procedural-preview-fallback registry-text-muted";
            hint.setAttribute("data-procedural-preview-fallback", "true");
            hint.setAttribute("role", "status");
            row.appendChild(hint);

            colorValue = document.createElement("code");
            colorValue.className = "registry-text-muted registry-procedural-preview-meta";
            colorValue.setAttribute("data-procedural-preview-meta", "true");
            row.appendChild(colorValue);
            return row;
        }

        if (fieldType === "button" || fieldType === "actionButton") {
            row = document.createElement("div");
            row.className = "registry-button-row registry-schema-field";
            applyVisibleWhenMetadata(row, field);
            row.classList.toggle("is-registry-hidden", !visibleWhenMatches(field, toolDef));

            input = document.createElement("button");
            input.type = "button";
            input.className = field.variant === "primary" ? "primary-action registry-large-button" : "panel-button registry-large-button";
            if (field.fullWidth !== false) {
                input.className += " is-full-width";
            }
            if (field.textLayout === "bilingualMatchName" || field.textLayout === "centerAxisPair" || field.matchName || field.secondaryText) {
                input.className += " registry-large-button--bilingual";
                var pair = document.createElement("span");
                var primaryText = document.createElement("span");
                var secondaryText = document.createElement("span");
                pair.className = "button-text-pair";
                primaryText.className = "button-text-primary";
                secondaryText.className = "button-text-secondary";
                primaryText.textContent = tr(field.labelKey || field.key || "");
                secondaryText.textContent = field.matchName || field.secondaryText || "";
                pair.appendChild(primaryText);
                pair.appendChild(secondaryText);
                input.appendChild(pair);
            } else {
                input.textContent = tr(field.labelKey || field.key || "");
            }
            input.addEventListener("click", function () {
                if (this.disabled) {
                    return;
                }
                if (field.clientAction === "resetFields") {
                    resetRegistryToolFields(toolDef, field.resetKeys || field.keys || []);
                    return;
                }
                if (field.actionId) {
                    runDynamicToolAction(toolDef.id, field.actionId, field.actionPayload || {}, field);
                }
            });
            applyStateConditionMetadata(input, field, toolDef);
            row.appendChild(input);
            return row;
        }

        row = document.createElement("div");
        row.className = fieldType === "checkbox" ? "switch-row registry-switch-row registry-schema-field" : "control-row registry-field-row registry-schema-field";
        applyVisibleWhenMetadata(row, field);
        row.classList.toggle("is-registry-hidden", !visibleWhenMatches(field, toolDef));
        labelColumn = document.createElement("span");
        label = document.createElement("span");
        wrap = document.createElement("span");
        labelColumn.className = "registry-label-column";
        label.className = "control-label registry-text-body";
        label.textContent = tr(field.labelKey || field.key || "");
        hintText = schemaHintText(field);
        if (hintText) {
            hint = document.createElement("small");
            hint.className = "registry-field-hint registry-text-muted";
            hint.textContent = hintText;
        }
        wrap.className = "control-inputs";
        labelColumn.appendChild(label);
        if (hint) {
            labelColumn.appendChild(hint);
        }

        if (fieldType === "checkbox") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.id = fieldId;
            input.checked = !!value;
            input.addEventListener("change", scheduleSave);

            swatch = document.createElement("label");
            swatch.className = "switch registry-switch";
            swatch.setAttribute("for", fieldId);
            colorValue = document.createElement("span");
            colorValue.className = "switch-track";
            swatch.appendChild(input);
            swatch.appendChild(colorValue);
            wrap.appendChild(swatch);
        } else if (fieldType === "select") {
            input = document.createElement("select");
            input.className = "select-input";
            input.id = fieldId;
            for (i = 0; field.options && i < field.options.length; i++) {
                option = document.createElement("option");
                option.value = field.options[i].value;
                option.textContent = tr(field.options[i].labelKey || field.options[i].value);
                if (field.options[i].value === value) {
                    option.selected = true;
                }
                input.appendChild(option);
            }
            input.addEventListener("change", scheduleSave);
            wrap.appendChild(input);
        } else if (fieldType === "tabs") {
            input = document.createElement("input");
            input.type = "hidden";
            input.id = fieldId;
            input.value = value;
            wrap.classList.add("registry-tabs-control");
            wrap.appendChild(input);
            for (i = 0; field.options && i < field.options.length; i++) {
                option = document.createElement("button");
                option.type = "button";
                option.className = "registry-option-card";
                option.setAttribute("data-tab-value", field.options[i].value);
                option.classList.toggle("is-active", field.options[i].value === value);
                if (field.options[i].iconText) {
                    swatch = document.createElement("span");
                    swatch.className = "registry-option-icon";
                    swatch.textContent = field.options[i].iconText;
                    option.appendChild(swatch);
                }
                colorValue = document.createElement("span");
                colorValue.className = "registry-option-copy";
                label = document.createElement("strong");
                label.textContent = tr(field.options[i].labelKey || field.options[i].value);
                colorValue.appendChild(label);
                if (field.options[i].descriptionKey || field.options[i].description) {
                    hint = document.createElement("small");
                    hint.textContent = tr(field.options[i].descriptionKey || field.options[i].description);
                    colorValue.appendChild(hint);
                }
                option.appendChild(colorValue);
                option.addEventListener("click", function () {
                    var buttons = wrap.querySelectorAll(".registry-option-card");
                    var k;
                    input.value = this.getAttribute("data-tab-value");
                    for (k = 0; k < buttons.length; k++) {
                        buttons[k].classList.toggle("is-active", buttons[k] === this);
                    }
                    scheduleSave();
                    updateRegistryVisibleFields(toolDef);
                });
                wrap.appendChild(option);
            }
        } else if (fieldType === "textarea") {
            input = document.createElement("textarea");
            input.id = fieldId;
            input.className = "registry-textarea";
            input.rows = field.rows || 3;
            if (field.placeholderKey) {
                input.placeholder = tr(field.placeholderKey);
            } else if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            input.value = value;
            input.addEventListener("input", scheduleSave);
            input.addEventListener("change", scheduleSave);
            wrap.appendChild(input);
        } else if (fieldType === "range") {
            input = document.createElement("input");
            input.id = fieldId;
            input.className = "pill-slider registry-range";
            input.type = "range";
            numberInput = document.createElement("input");
            numberInput.className = "num-input registry-range-number";
            numberInput.type = "text";
            numberInput.inputMode = "decimal";
            numberInput.id = fieldId + "_number";
            applySchemaNumberAttributes(input, field);
            applySchemaNumberAttributes(numberInput, field);
            input.value = value;
            numberInput.value = input.value;
            input.addEventListener("input", function () {
                syncRegistryRangeField(this, byId(this.id + "_number"));
                scheduleSave();
            });
            input.addEventListener("change", scheduleSave);
            numberInput.addEventListener("input", function () {
                var range = byId(this.id.replace(/_number$/, ""));
                if (range && !isSchemaNumberDraftValue(this.value) && !isNaN(Number(this.value))) {
                    range.value = normalizeSchemaNumber(this.value, field, range.value);
                }
                scheduleSave();
            });
            numberInput.addEventListener("change", function () {
                var range = byId(this.id.replace(/_number$/, ""));
                commitSchemaNumberInput(this, field, range ? range.value : schemaDefaultValue(field), function (value) {
                    if (range) {
                        range.value = value;
                    }
                });
                scheduleSave();
            });
            numberInput.addEventListener("blur", function () {
                var range = byId(this.id.replace(/_number$/, ""));
                commitSchemaNumberInput(this, field, range ? range.value : schemaDefaultValue(field), function (value) {
                    if (range) {
                        range.value = value;
                    }
                });
                scheduleSave();
            });
            setupRegistryNumberDrag(numberInput, field, function (value) {
                input.value = value;
                scheduleSave();
            });
            wrap.classList.add("registry-range-control");
            wrap.appendChild(numberInput);
            wrap.appendChild(input);
        } else if (fieldType === "color") {
            colorValue = normalizeHex(value, "#ffffff").toLowerCase();
            input = document.createElement("input");
            input.id = fieldId;
            input.className = "registry-color-hex";
            input.type = "text";
            input.value = colorValue;
            input.setAttribute("spellcheck", "false");
            bindHexInputSelectBehavior(input);

            swatch = document.createElement("button");
            swatch.type = "button";
            swatch.className = "registry-color-swatch";
            swatch.style.backgroundColor = colorValue;
            swatch.setAttribute("aria-label", tr(field.labelKey || field.key || ""));
            swatch.addEventListener("click", function () {
                var hex = this.parentNode.querySelector(".registry-color-hex");
                openRegistryColorPicker(hex, this, colorValue);
            });
            input._registryOnValueChange = scheduleSave;
            input.addEventListener("input", scheduleSave);
            input.addEventListener("change", function () {
                var parent = this.parentNode;
                syncRegistryColorField(this, parent.querySelector(".registry-color-swatch"), colorValue);
                scheduleSave();
            });
            wrap.classList.add("registry-color-control");
            wrap.appendChild(swatch);
            wrap.appendChild(input);
        } else {
            if (fieldType !== "text" && window.console && console.warn) {
                console.warn("[AE Toolbox] Unsupported registry field type:", fieldType, field);
            }
            input = document.createElement("input");
            input.id = fieldId;
            input.className = fieldType === "number" ? "num-input" : "registry-text-input";
            input.type = "text";
            if (fieldType === "number") {
                input.inputMode = "decimal";
                applySchemaNumberAttributes(input, field);
                setupRegistryNumberDrag(input, field, scheduleSave);
                input.addEventListener("input", scheduleSave);
                input.addEventListener("change", function () {
                    commitSchemaNumberInput(this, field, registryFieldValue(toolDef, field));
                    scheduleSave();
                });
                input.addEventListener("blur", function () {
                    commitSchemaNumberInput(this, field, registryFieldValue(toolDef, field));
                    scheduleSave();
                });
            }
            if (field.placeholderKey) {
                input.placeholder = tr(field.placeholderKey);
            } else if (field.placeholder) {
                input.placeholder = field.placeholder;
            }
            input.value = value;
            if (fieldType !== "number") {
                input.addEventListener("input", scheduleSave);
                input.addEventListener("change", scheduleSave);
            }
            wrap.appendChild(input);
        }

        row.appendChild(labelColumn);
        row.appendChild(wrap);
        controls = row.querySelectorAll("input, select, textarea, button");
        for (k = 0; k < controls.length; k++) {
            applyStateConditionMetadata(controls[k], field, toolDef);
        }
        return row;
    }

    function renderDynamicField(toolId, field) {
        return renderSchemaField(field, { id: toolId });
    }

    function proceduralPreviewContractApi() {
        return window.ProceduralPreviewContract || null;
    }

    function findRegistryProceduralPreviewField(toolDef) {
        var api = proceduralPreviewContractApi();
        var sections;
        var fields;
        var i;
        var j;
        if (api && api.findProceduralPreviewField) {
            return api.findProceduralPreviewField(toolDef);
        }
        sections = getToolSections(toolDef);
        for (i = 0; i < sections.length; i++) {
            fields = sections[i] && sections[i].fields ? sections[i].fields : [];
            for (j = 0; j < fields.length; j++) {
                if (fields[j] && fields[j].type === "proceduralPreview") {
                    return fields[j];
                }
            }
        }
        return null;
    }

    function shouldRefreshRegistryProceduralPreview(toolDef, changedKey) {
        var field = findRegistryProceduralPreviewField(toolDef);
        var api = proceduralPreviewContractApi();
        if (!field) {
            return false;
        }
        if (api && api.shouldRefreshProceduralPreview) {
            return api.shouldRefreshProceduralPreview(field, changedKey);
        }
        return !changedKey;
    }

    function clearRegistryProceduralPreviewTimer(toolId) {
        var key;
        if (toolId) {
            if (ProceduralPreviewTimers[toolId]) {
                window.cancelAnimationFrame(ProceduralPreviewTimers[toolId]);
                ProceduralPreviewTimers[toolId] = null;
            }
            delete ProceduralPreviewLastInputKeys[toolId];
            return;
        }
        for (key in ProceduralPreviewTimers) {
            if (Object.prototype.hasOwnProperty.call(ProceduralPreviewTimers, key) && ProceduralPreviewTimers[key]) {
                window.cancelAnimationFrame(ProceduralPreviewTimers[key]);
                ProceduralPreviewTimers[key] = null;
            }
        }
        ProceduralPreviewLastInputKeys = {};
    }

    function warnProceduralPreviewOnce(code, detail) {
        if (!code || ProceduralPreviewWarnings[code]) {
            return;
        }
        ProceduralPreviewWarnings[code] = true;
        if (window.console && console.warn) {
            console.warn("[AE Toolbox] Procedural preview " + code + (detail ? ": " + detail : ""));
        }
    }

    function setProceduralPreviewFallback(preview, field, code) {
        var canvas = preview ? preview.querySelector("[data-procedural-preview-canvas]") : null;
        var fallback = preview ? preview.querySelector("[data-procedural-preview-fallback]") : null;
        var meta = preview ? preview.querySelector("[data-procedural-preview-meta]") : null;
        if (!preview) {
            return;
        }
        preview.classList.add("is-preview-fallback");
        preview.setAttribute("data-preview-state", "fallback");
        if (canvas) {
            canvas.setAttribute("aria-hidden", "true");
        }
        if (fallback) {
            fallback.textContent = tr((field && field.fallbackKey) || "status.ready");
        }
        if (meta) {
            meta.textContent = code || "";
        }
    }

    function clearProceduralPreviewFallback(preview) {
        var canvas = preview ? preview.querySelector("[data-procedural-preview-canvas]") : null;
        var fallback = preview ? preview.querySelector("[data-procedural-preview-fallback]") : null;
        if (!preview) {
            return;
        }
        preview.classList.remove("is-preview-fallback");
        preview.setAttribute("data-preview-state", "ready");
        if (canvas) {
            canvas.removeAttribute("aria-hidden");
        }
        if (fallback) {
            fallback.textContent = "";
        }
    }

    function getProceduralPreviewEngine(engineName) {
        var name = engineName || "proceduralAppearance";
        if (name === "proceduralAppearance") {
            return window.ProceduralAppearance || null;
        }
        return null;
    }

    function stablePreviewInputKey(input) {
        if (!input || !input.ok) {
            return "";
        }
        return JSON.stringify({
            engine: input.engine,
            target: input.target,
            seed: input.seed,
            params: input.params || {}
        });
    }

    function scheduleRegistryProceduralPreviewUpdate(toolDef, changedKey) {
        if (!toolDef || !toolDef.id || panelShuttingDown) {
            return;
        }
        if (!shouldRefreshRegistryProceduralPreview(toolDef, changedKey)) {
            return;
        }
        if (ProceduralPreviewTimers[toolDef.id]) {
            window.cancelAnimationFrame(ProceduralPreviewTimers[toolDef.id]);
        }
        ProceduralPreviewTimers[toolDef.id] = window.requestAnimationFrame(function () {
            ProceduralPreviewTimers[toolDef.id] = null;
            refreshRegistryProceduralPreviews(toolDef);
        });
    }

    function refreshRegistryProceduralPreviews(toolDef) {
        var previews = toolDef && toolDef.id ? document.querySelectorAll('[data-procedural-preview-tool="' + toolDef.id + '"]') : [];
        var field = findRegistryProceduralPreviewField(toolDef);
        var api = proceduralPreviewContractApi();
        var values;
        var input;
        var inputKey;
        var engine;
        var options;
        var i;
        var canvas;
        var context;
        var meta;
        var result;
        var rendered = false;

        if (panelShuttingDown || !previews.length || !field) {
            return;
        }

        values = collectSchemaValues(toolDef);
        if (!api || !api.extractProceduralPreviewInput) {
            warnProceduralPreviewOnce("CONTRACT_MISSING", "client/js/proceduralPreviewContract.js is not available.");
            input = {
                ok: false,
                errorCode: "CONTRACT_MISSING"
            };
        } else {
            input = api.extractProceduralPreviewInput(field, values);
        }
        if (!input.ok) {
            warnProceduralPreviewOnce(input.errorCode || "INVALID_CONTRACT", input.message || "");
            for (i = 0; i < previews.length; i++) {
                setProceduralPreviewFallback(previews[i], field, input.errorCode || "INVALID_CONTRACT");
            }
            return;
        }

        inputKey = stablePreviewInputKey(input);
        if (ProceduralPreviewLastInputKeys[toolDef.id] === inputKey) {
            return;
        }

        engine = getProceduralPreviewEngine(input.engine);
        if (!engine || !engine.render) {
            warnProceduralPreviewOnce("ENGINE_UNAVAILABLE_" + input.engine, "Unknown or unavailable engine.");
            for (i = 0; i < previews.length; i++) {
                setProceduralPreviewFallback(previews[i], field, "ENGINE_UNAVAILABLE");
            }
            return;
        }

        options = {
            target: input.target,
            seed: input.seed,
            params: input.params
        };

        for (i = 0; i < previews.length; i++) {
            canvas = previews[i].querySelector('[data-procedural-preview-canvas]');
            meta = previews[i].querySelector('[data-procedural-preview-meta]');
            if (!canvas || !document.documentElement.contains(canvas)) {
                setProceduralPreviewFallback(previews[i], field, "CANVAS_MISSING");
                continue;
            }
            if (!canvas.getContext) {
                setProceduralPreviewFallback(previews[i], field, "CANVAS_CONTEXT_UNAVAILABLE");
                continue;
            }
            context = canvas.getContext("2d");
            if (!context) {
                setProceduralPreviewFallback(previews[i], field, "CANVAS_CONTEXT_UNAVAILABLE");
                continue;
            }
            try {
                result = engine.render(canvas, options);
            } catch (err) {
                warnProceduralPreviewOnce("RENDER_FAILED", err && err.message ? err.message : String(err));
                setProceduralPreviewFallback(previews[i], field, "RENDER_FAILED");
                continue;
            }
            clearProceduralPreviewFallback(previews[i]);
            previews[i].classList.toggle("is-preview-background", result.target === "background");
            previews[i].classList.toggle("is-preview-icon", result.target !== "background");
            rendered = true;
            if (meta) {
                meta.textContent = result.engineVersion + " | " + result.target + " | seedHash=" + result.seedHash + " | " + result.cacheKey;
            }
        }
        if (rendered) {
            ProceduralPreviewLastInputKeys[toolDef.id] = inputKey;
        }
    }

    function getToolSections(toolDef) {
        if (toolDef && toolDef.sections && toolDef.sections.length) {
            return toolDef.sections;
        }
        if (toolDef && toolDef.uiSchema && toolDef.uiSchema.length) {
            return [
                {
                    id: "parameters",
                    labelKey: toolDef.parametersSectionKey || "common.parameters",
                    fields: toolDef.uiSchema
                }
            ];
        }
        return [];
    }

    function setRegistrySectionState(card, enabled, collapsed, toolDef) {
        var body = card ? card.querySelector(".registry-section-body") : null;
        var controls;
        var i;

        if (!card || !body) {
            return;
        }

        card.classList.toggle("is-section-disabled", !enabled);
        card.classList.toggle("is-section-collapsed", !!collapsed);
        body.setAttribute("aria-hidden", collapsed ? "true" : "false");

        controls = body.querySelectorAll("input, select, textarea, button");
        for (i = 0; i < controls.length; i++) {
            controls[i].disabled = !enabled;
        }
        if (enabled && toolDef) {
            updateRegistryStateDependentUi(toolDef);
        }
        setupCustomSelectInputs();
    }

    function createRegistrySectionToggle(section, toolDef, card) {
        var fieldId = dynamicFieldId(toolDef.id, section.toggleKey);
        var wrap = document.createElement("label");
        var input = document.createElement("input");
        var track = document.createElement("span");

        wrap.className = "switch registry-section-toggle";
        wrap.setAttribute("for", fieldId);
        input.type = "checkbox";
        input.id = fieldId;
        input.checked = registrySectionToggleValue(toolDef, section);
        input.setAttribute("data-section-toggle", section.id || section.toggleKey);
        track.className = "switch-track";

        input.addEventListener("change", function (event) {
            var enabled = !!this.checked;
            event.stopPropagation();
            setRegistrySectionState(card, enabled, section.collapsible && !enabled, toolDef);
            scheduleRegistryToolSave(toolDef);
        });

        wrap.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        wrap.appendChild(input);
        wrap.appendChild(track);
        return wrap;
    }

    function renderToolSection(section, toolDef) {
        var card = document.createElement("section");
        var heading;
        var headingWrap;
        var headingTitle;
        var headingDesc;
        var headingActions;
        var body;
        var fields = section && section.fields ? section.fields : [];
        var i;
        var enabled = registrySectionToggleValue(toolDef, section);
        var collapsed = registrySectionCollapsedValue(toolDef, section, enabled);

        card.className = "panel-card control-card registry-params-card";
        if (section && section.id) {
            card.setAttribute("data-registry-section", section.id);
        }
        if (section && section.collapsible) {
            card.className += " is-registry-collapsible";
        }

        if (section && (section.labelKey || section.titleKey || section.toggleKey)) {
            heading = document.createElement("div");
            heading.className = "card-heading registry-section-heading";
            if (section.collapsible) {
                heading.setAttribute("role", "button");
                heading.setAttribute("tabindex", "0");
                heading.addEventListener("click", function () {
                    setRegistrySectionState(card, card.classList.contains("is-section-disabled") ? false : true, !card.classList.contains("is-section-collapsed"), toolDef);
                    scheduleRegistryToolSave(toolDef);
                });
                heading.addEventListener("keydown", function (event) {
                    if (event.keyCode === 13 || event.keyCode === 32) {
                        event.preventDefault();
                        setRegistrySectionState(card, card.classList.contains("is-section-disabled") ? false : true, !card.classList.contains("is-section-collapsed"), toolDef);
                        scheduleRegistryToolSave(toolDef);
                    }
                });
            }
            headingWrap = document.createElement("div");
            headingTitle = document.createElement("h3");
            headingTitle.className = "registry-title-primary";
            headingTitle.textContent = tr(section.labelKey || section.titleKey || "");
            headingWrap.appendChild(headingTitle);
            if (section.descriptionKey || section.hintKey || section.description) {
                headingDesc = document.createElement("p");
                headingDesc.className = "registry-section-description registry-text-muted";
                headingDesc.textContent = tr(section.descriptionKey || section.hintKey || section.description);
                headingWrap.appendChild(headingDesc);
            }
            heading.appendChild(headingWrap);
            headingActions = document.createElement("div");
            headingActions.className = "registry-section-actions";
            if (section.toggleKey) {
                headingActions.appendChild(createRegistrySectionToggle(section, toolDef, card));
            }
            if (section.collapsible) {
                var collapseIcon = document.createElement("span");
                collapseIcon.className = "collapse-chevron registry-section-chevron";
                collapseIcon.setAttribute("aria-hidden", "true");
                headingActions.appendChild(collapseIcon);
            }
            if (headingActions.childNodes.length) {
                heading.appendChild(headingActions);
            }
            card.appendChild(heading);
        }

        body = document.createElement("div");
        body.className = "registry-section-body";
        for (i = 0; i < fields.length; i++) {
            body.appendChild(renderSchemaField(fields[i], toolDef));
        }
        card.appendChild(body);
        setRegistrySectionState(card, enabled, collapsed, toolDef);

        return card;
    }

    function collectSchemaValues(toolDef) {
        var sections = getToolSections(toolDef);
        var params = {};
        var i;
        var j;
        var fields;
        var field;
        var input;

        for (i = 0; i < sections.length; i++) {
            if (sections[i] && sections[i].toggleKey) {
                input = byId(dynamicFieldId(toolDef.id, sections[i].toggleKey));
                params[sections[i].toggleKey] = input ? !!input.checked : sections[i].defaultEnabled !== false;
            }
            fields = sections[i] && sections[i].fields ? sections[i].fields : [];
            for (j = 0; j < fields.length; j++) {
                field = fields[j];
                if (!field || !field.key) {
                    continue;
                }
                if (field.type === "button" || field.type === "actionButton") {
                    continue;
                }
                input = byId(dynamicFieldId(toolDef.id, field.key));
                if (!input) {
                    params[field.key] = registryFieldValue(toolDef, field);
                    continue;
                }
                if (field.type === "checkbox") {
                    params[field.key] = !!input.checked;
                } else if (field.type === "number" || field.type === "range") {
                    params[field.key] = normalizeSchemaNumber(input.value, field, registryFieldValue(toolDef, field));
                } else if (field.type === "color") {
                    params[field.key] = normalizeHex(input.value, schemaDefaultValue(field)).toLowerCase();
                } else {
                    params[field.key] = input.value;
                }
            }
        }

        return params;
    }

    function collectDynamicToolParams(toolId) {
        return collectSchemaValues(DynamicTools[toolId] || { id: toolId, uiSchema: [] });
    }

    function renderToolActions(actions, toolDef) {
        var fragment = document.createDocumentFragment();
        var i;
        var action;
        var button;

        if (!toolDef || toolDef.hideRestoreDefaults !== true) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "panel-button secondary-action";
            button.textContent = tr("common.restoreDefaults");
            button.addEventListener("click", function () {
                resetRegistryToolValues(toolDef.id);
            });
            fragment.appendChild(button);
        }

        for (i = 0; actions && i < actions.length; i++) {
            action = actions[i];
            if (!action || !action.id) {
                continue;
            }
            if (action.hidden || action.fieldOnly) {
                continue;
            }
            button = document.createElement("button");
            button.type = "button";
            button.className = action.style === "secondary" ? "panel-button secondary-action" : "primary-action";
            button.textContent = tr(action.labelKey || action.id);
            button.setAttribute("data-dynamic-action", action.id);
            applyStateConditionMetadata(button, action, toolDef);
            button.addEventListener("click", function () {
                if (this.disabled) {
                    return;
                }
                runDynamicToolAction(toolDef.id, this.getAttribute("data-dynamic-action"), {}, findRegistryAction(toolDef, this.getAttribute("data-dynamic-action")));
            });
            fragment.appendChild(button);
        }

        return fragment;
    }

    function renderRegistryStateCard(toolDef) {
        var spec = toolDef ? toolDef.stateCard : null;
        var card;
        var title;
        var fields;
        var row;
        var label;
        var value;
        var i;

        if (!spec || !spec.fields || !spec.fields.length) {
            return null;
        }

        card = document.createElement("section");
        card.className = "info-panel registry-state-card";
        card.setAttribute("data-registry-state-card", toolDef.id);

        if (spec.titleKey || spec.title) {
            title = document.createElement("h3");
            title.className = "registry-title-primary";
            title.textContent = tr(spec.titleKey || spec.title);
            card.appendChild(title);
        }

        fields = spec.fields;
        for (i = 0; i < fields.length; i++) {
            row = document.createElement("div");
            row.className = "registry-state-row";
            label = document.createElement("span");
            label.className = "registry-text-muted";
            label.textContent = tr(fields[i].labelKey || fields[i].stateKey || "");
            value = document.createElement("strong");
            value.className = "registry-text-body";
            value.setAttribute("data-state-card-value", fields[i].stateKey);
            value.textContent = tr(fields[i].fallbackKey || "common.unavailable");
            row.appendChild(label);
            row.appendChild(value);
            card.appendChild(row);
        }

        return card;
    }

    function runDynamicToolAction(toolId, actionId, actionPayload, actionDef) {
        var toolDef = DynamicTools[toolId];
        var action = actionDef || findRegistryAction(toolDef, actionId) || {};
        var params = mergeActionPayload(collectDynamicToolParams(toolId), actionPayload || action.actionPayload || {});
        var json = JSON.stringify(params);
        if (panelShuttingDown) {
            return;
        }
        setStatus(tr(action.pendingMessageKey || "status.loadingHost"), "busy", true);
        evalHost("AEToolbox.runRegisteredToolAction('" + jsxQuote(toolId) + "','" + jsxQuote(actionId) + "','" + jsxQuote(json) + "')", function (raw) {
            if (panelShuttingDown) {
                return;
            }
            var result = parseResult(raw);
            var fallback = result.ok ? (action.successMessageKey || "status.ready") : (action.errorMessageKey || "status.ready");
            setStatus(dynamicActionMessage(result, fallback), result.ok ? "ok" : "error");
            if (toolDef && toolDef.stateAction && (action.refreshStateAfterRun || toolDef.refreshStateAfterRun)) {
                if (result.ok || action.refreshStateAfterError) {
                    refreshRegistryToolState(toolDef);
                }
            }
        });
    }

    function renderRegistryToolDetail(toolDef) {
        var tool = toolDef;
        var panel = byId("registryToolPanel");
        var actions = byId("registryToolActions");
        var intro;
        var desc;
        var stateCard;
        var sections;
        var i;
        var oldMenus;

        if (!tool || !panel || !actions) {
            return;
        }

        closeRegistryColorPicker();
        clearRegistryProceduralPreviewTimer(tool.id);
        oldMenus = document.querySelectorAll(".select-menu[data-select-menu-for^='dynamic_']");
        for (i = 0; i < oldMenus.length; i++) {
            oldMenus[i].parentNode.removeChild(oldMenus[i]);
        }

        panel.innerHTML = "";
        actions.innerHTML = "";

        intro = document.createElement("section");
        intro.className = "info-panel intro-panel dynamic-tool-intro";
        desc = document.createElement("p");
        desc.className = "registry-text-muted";
        desc.textContent = tr(tool.descriptionKey || "");
        intro.appendChild(desc);
        panel.appendChild(intro);

        stateCard = renderRegistryStateCard(tool);
        if (stateCard) {
            panel.appendChild(stateCard);
        }

        sections = getToolSections(tool);
        for (i = 0; i < sections.length; i++) {
            panel.appendChild(renderToolSection(sections[i], tool));
        }

        actions.appendChild(renderToolActions(tool.actions || [], tool));

        setupCustomSelectInputs();
        updateRegistryVisibleFields(tool);
        updateRegistryStateDependentUi(tool);
        refreshRegistryProceduralPreviews(tool);
        startRegistryStatePolling(tool);
    }

    function renderDynamicToolDetail(toolId) {
        renderRegistryToolDetail(DynamicTools[toolId]);
    }

    function configureToolDetail(toolId) {
        var meta = getToolMeta(toolId);
        var panels = document.querySelectorAll(".tool-panel");
        var actions = document.querySelectorAll(".tool-actions");
        var i;
        var dynamic = isDynamicTool(toolId);
        var previousToolId = activeToolId;

        activeToolId = toolId || "shapeAdd";
        if (previousToolId && previousToolId !== activeToolId) {
            clearRegistryProceduralPreviewTimer(previousToolId);
        }
        byId("detailHeading").textContent = toolText(meta, "titleKey", "title", tr("app.title"));

        if (dynamic) {
            renderDynamicToolDetail(activeToolId);
        } else {
            stopRegistryStatePolling();
        }

        for (i = 0; i < panels.length; i++) {
            panels[i].classList.toggle("is-active", panels[i].getAttribute("data-tool-panel") === (dynamic ? "__dynamic" : activeToolId));
        }
        for (i = 0; i < actions.length; i++) {
            actions[i].classList.toggle("is-active", actions[i].getAttribute("data-tool-actions") === (dynamic ? "__dynamic" : activeToolId));
        }
    }

    function updateHomeToolLabels() {
        var labels = document.querySelectorAll("[data-tool-title]");
        var i;
        var toolId;
        var meta;
        for (i = 0; i < labels.length; i++) {
            toolId = labels[i].getAttribute("data-tool-title") || labels[i].getAttribute("data-tool");
            meta = getToolMeta(toolId);
            if (meta && (meta.titleKey || meta.title)) {
                labels[i].textContent = toolText(meta, "titleKey", "title", labels[i].textContent);
            }
        }
    }

    function refreshLanguage() {
        var editButton = byId("editHomeBtn");
        var languageSelect = byId("languageSelect");

        applyI18n(document);
        updateHomeToolLabels();
        configureToolDetail(activeToolId);
        if (HomeLayoutManager.isEditing && editButton) {
            editButton.textContent = tr("common.done");
            editButton.setAttribute("aria-label", tr("common.done"));
        } else if (editButton) {
            editButton.textContent = tr("common.editHome");
            editButton.setAttribute("aria-label", tr("common.editHome"));
        }
        if (languageSelect && window.I18n) {
            languageSelect.value = window.I18n.getLanguage();
        }
        syncAllCustomSelects();
        refreshPaletteWorkspaceI18n();
        refreshSettingsThemePresentation();
    }

    function setupLanguageSelector() {
        var select = byId("languageSelect");
        if (!select || !window.I18n) {
            return;
        }
        select.value = window.I18n.getLanguage();
        select.addEventListener("change", function () {
            window.I18n.setLanguage(this.value);
            refreshLanguage();
            setStatus(tr("status.ready"));
        });
    }

    function refreshActiveTool() {
        if (panelShuttingDown || panelSuspended) {
            return;
        }
        refreshSelection();
    }

    function openToolWithLaunchTransition(toolButton, toolId) {
        var home = byId("homeView");
        var detail = byId("detailView");
        var icon = getToolIcon(toolButton);
        var pressDelay;
        var firstRect;
        var targetRect;
        var overlay;
        var finishGate;

        if (panelShuttingDown) {
            return;
        }
        if (byId("appShell").classList.contains("is-animating")) {
            return;
        }

        // Keep this at least as long as the CSS press transition (--dur-instant).
        // Quick mode used to start the launch at 90ms while the source icon was
        // still scaling, so the measured launch rect could be a transient frame.
        pressDelay = Math.max(120, Math.min(140, duration("fast") - 40));
        toolButton.classList.add("is-pressed");

        HomeLayoutManager.trackTimer(window.setTimeout(function () {
            if (panelShuttingDown) {
                return;
            }
            toolButton.classList.remove("is-pressed");
            configureToolDetail(toolId);
            beginAnimation();
            resetDetailMorphStyles();
            firstRect = icon.getBoundingClientRect();
            targetRect = getToolDetailTargetRect();
            overlay = createMorphIconOverlay(toolButton);

            setDetailMorphRect(detail, firstRect, "24px");
            detail.appendChild(overlay);
            suppressDetailContent();
            detail.classList.add("is-active", "is-morphing");
            detail.classList.remove("is-entering", "is-closing");
            overlay.style.opacity = "1";
            overlay.style.transform = "scale(1)";
            overlay.style.filter = "blur(0px)";
            home.classList.add("is-opening");
            finishGate = makeAnimationGate(2, function () {
                finishOpenTransition(detail, toolId);
            });

            playAnimation(detail, [
                {
                    left: firstRect.left + "px",
                    top: firstRect.top + "px",
                    width: firstRect.width + "px",
                    height: firstRect.height + "px",
                    borderRadius: "24px"
                },
                {
                    left: targetRect.left + "px",
                    top: targetRect.top + "px",
                    width: targetRect.width + "px",
                    height: targetRect.height + "px",
                    borderRadius: "22px"
                }
            ], {
                duration: duration("launch"),
                easing: Motion.appleOut,
                fill: "forwards"
            }, function () {
                finishGate();
            });

            playAnimation(overlay, [
                { opacity: "1", transform: "scale(1)", filter: "blur(0px)" },
                { opacity: "0", transform: "scale(1.12)", filter: "blur(4px)" }
            ], {
                duration: duration("normal"),
                easing: Motion.appleOut,
                fill: "forwards"
            }, function () {
                finishGate();
            });

        }, pressDelay));
    }

    function closeToolWithLaunchTransition() {
        var home = byId("homeView");
        var detail = byId("detailView");
        var toolButton = getActiveToolButton();
        var iconRect;
        var targetRect;
        var overlay;
        var finishGate;

        if (byId("appShell").classList.contains("is-animating")) {
            return;
        }

        clearRegistryProceduralPreviewTimer(activeToolId);
        beginAnimation();
        exitDetailContent(function () {
            iconRect = getHomeToolIconRect(toolButton);
            targetRect = getToolDetailTargetRect();
            overlay = createMorphIconOverlay(toolButton);

            resetDetailMorphStyles();
            suppressDetailContent();
            setDetailMorphRect(detail, targetRect, "22px");
            detail.appendChild(overlay);
            detail.classList.add("is-active", "is-morphing");
            detail.classList.remove("is-closing", "is-entering");
            overlay.style.opacity = "0";
            overlay.style.transform = "scale(1.12)";
            overlay.style.filter = "blur(4px)";
            home.classList.add("is-returning");
            finishGate = makeAnimationGate(2, function () {
                finishCloseTransition(detail, toolButton);
            });

            playAnimation(detail, [
                {
                    left: targetRect.left + "px",
                    top: targetRect.top + "px",
                    width: targetRect.width + "px",
                    height: targetRect.height + "px",
                    borderRadius: "22px"
                },
                {
                    left: iconRect.left + "px",
                    top: iconRect.top + "px",
                    width: iconRect.width + "px",
                    height: iconRect.height + "px",
                    borderRadius: "24px"
                }
            ], {
                duration: duration("close"),
                easing: Motion.appleIn,
                fill: "forwards"
            }, function () {
                finishGate();
            });

            playAnimation(overlay, [
                { opacity: "0", transform: "scale(1.12)", filter: "blur(4px)" },
                { opacity: "1", transform: "scale(1)", filter: "blur(0px)" }
            ], {
                duration: duration("close"),
                easing: Motion.appleIn,
                fill: "forwards"
            }, function () {
                finishGate();
            });

        });
    }

    function clampNumber(value, fallback, min, max) {
        var n = parseFloat(value);
        if (isNaN(n)) {
            n = fallback;
        }
        if (typeof min === "number") {
            n = Math.max(min, n);
        }
        if (typeof max === "number") {
            n = Math.min(max, n);
        }
        return n;
    }

    function normalizeHex(hex, fallback) {
        var value = String(hex || fallback || "#ffffff");
        value = value.replace(/^\s+|\s+$/g, "");
        if (value.charAt(0) !== "#") {
            value = "#" + value;
        }
        if (/^#[0-9a-fA-F]{3}$/.test(value)) {
            value = "#" + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2) + value.charAt(3) + value.charAt(3);
        }
        if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) {
            return formatHexColor(parseHexColor(value, fallback || "#ffffff"), false).toUpperCase();
        }
        return formatHexColor(parseHexColor(fallback || "#ffffff", "#ffffff"), false).toUpperCase();
    }

    function hexToRgb(hex) {
        return parseHexColor(hex, "#ffffff");
    }

    function rgbToHex(r, g, b) {
        return formatHexColor({ r: r, g: g, b: b, a: 1 }, false).toUpperCase();
    }

    function mixHex(hex, target, amount) {
        var a = hexToRgb(hex);
        var b = hexToRgb(target);
        var t = Math.max(0, Math.min(1, amount));
        return rgbToHex(
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t
        );
    }

    function rgba(hex, alpha) {
        var c = hexToRgb(hex);
        return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + alpha + ")";
    }

    BackgroundEngine.merge = function (base, extra) {
        var out = {};
        var k;
        for (k in base) {
            if (base.hasOwnProperty(k)) {
                out[k] = base[k];
            }
        }
        extra = extra || {};
        for (k in extra) {
            if (extra.hasOwnProperty(k)) {
                out[k] = extra[k];
            }
        }
        return out;
    };

    BackgroundEngine.controlMap = [
        ["bgGlowOpacity", "glowOpacity", 0, 1],
        ["bgGlowSize", "glowSize", 20, 140],
        ["bgGlowX", "glowX", 0, 100],
        ["bgGlowY", "glowY", 0, 100],
        ["bgGridOpacity", "gridOpacity", 0, 1],
        ["bgGridSize", "gridSize", 12, 96],
        ["bgLineOpacity", "lineOpacity", 0, 1],
        ["bgRingOpacity", "ringOpacity", 0, 1],
        ["bgRingScale", "ringScale", 0.5, 2.5],
        ["bgAccentAngle", "accentAngle", 0, 360],
        ["bgPatternDensity", "patternDensity", 0.4, 2],
        ["bgContrast", "contrast", 0, 1],
        ["bgMotionSpeed", "motionSpeed", 0.5, 2],
        ["bgMotionAmount", "motionAmount", 0, 1]
    ];

    BackgroundEngine.colorMap = [
        ["bgBaseColor", "baseColor"],
        ["bgSecondaryColor", "secondaryColor"],
        ["bgAccentColor", "accentColor"],
        ["bgAccent2Color", "accent2Color"],
        ["bgLineColor", "lineColor"],
        ["bgGlowColor", "glowColor"]
    ];

    BackgroundEngine.cssName = function (key) {
        var names = {
            baseColor: "--bg-proc-base",
            secondaryColor: "--bg-proc-secondary",
            accentColor: "--bg-proc-accent",
            accent2Color: "--bg-proc-accent-2",
            lineColor: "--bg-proc-line",
            glowColor: "--bg-proc-glow",
            glowOpacity: "--bg-glow-opacity",
            glowSize: "--bg-glow-size",
            glowX: "--bg-glow-x",
            glowY: "--bg-glow-y",
            gridOpacity: "--bg-grid-opacity",
            gridSize: "--bg-grid-size",
            lineOpacity: "--bg-line-opacity",
            ringOpacity: "--bg-ring-opacity",
            ringScale: "--bg-ring-scale",
            accentAngle: "--bg-accent-angle",
            patternDensity: "--bg-pattern-density",
            contrast: "--bg-contrast",
            motionSpeed: "--bg-motion-speed",
            motionAmount: "--bg-motion-amount"
        };
        return names[key];
    };

    BackgroundEngine.applyState = function (state, updateControls) {
        var root = document.documentElement;
        var shell = byId("appShell");
        var s = this.merge(this.defaults, state || {});

        s.baseColor = normalizeHex(s.baseColor, this.defaults.baseColor);
        s.secondaryColor = normalizeHex(s.secondaryColor, this.defaults.secondaryColor);
        s.accentColor = normalizeHex(s.accentColor, this.defaults.accentColor);
        s.accent2Color = normalizeHex(s.accent2Color, this.defaults.accent2Color);
        s.lineColor = normalizeHex(s.lineColor, this.defaults.lineColor);
        s.glowColor = normalizeHex(s.glowColor, this.defaults.glowColor);

        root.style.setProperty("--bg-proc-base", s.baseColor);
        root.style.setProperty("--bg-proc-secondary", s.secondaryColor);
        root.style.setProperty("--bg-proc-accent", rgba(s.accentColor, 0.42));
        root.style.setProperty("--bg-proc-accent-2", rgba(s.accent2Color, 0.24));
        root.style.setProperty("--bg-proc-line", rgba(s.lineColor, 0.58));
        root.style.setProperty("--bg-proc-glow", rgba(s.glowColor, 0.48));
        root.style.setProperty("--bg-glow-opacity", String(s.glowOpacity));
        root.style.setProperty("--bg-glow-size", s.glowSize + "%");
        root.style.setProperty("--bg-glow-x", s.glowX + "%");
        root.style.setProperty("--bg-glow-y", s.glowY + "%");
        root.style.setProperty("--bg-grid-opacity", String(s.gridOpacity));
        root.style.setProperty("--bg-grid-size", s.gridSize + "px");
        root.style.setProperty("--bg-line-opacity", String(s.lineOpacity));
        root.style.setProperty("--bg-ring-opacity", String(s.ringOpacity));
        root.style.setProperty("--bg-ring-scale", String(s.ringScale));
        root.style.setProperty("--bg-accent-angle", s.accentAngle + "deg");
        root.style.setProperty("--bg-pattern-density", String(s.patternDensity));
        root.style.setProperty("--bg-contrast", String(s.contrast));
        root.style.setProperty("--bg-motion-speed", Math.round(24 - s.motionSpeed * 6) + "s");
        root.style.setProperty("--bg-motion-amount", String(s.motionAmount));

        if (shell) {
            shell.classList.toggle("bg-motion", !!s.motionEnable && !window.AEToolboxPerfMode);
        }
        this.state = s;
        if (updateControls !== false) {
            this.syncControls();
        }
    };

    BackgroundEngine.syncControls = function () {
        var s = this.state || this.defaults;
        var i;
        var id;
        var key;

        if (byId("bgPreset")) {
            byId("bgPreset").value = s.preset || "custom";
            syncCustomSelect(byId("bgPreset"));
        }
        for (i = 0; i < this.colorMap.length; i++) {
            id = this.colorMap[i][0];
            key = this.colorMap[i][1];
            if (byId(id)) {
                setColorValue(id, s[key]);
            }
        }
        for (i = 0; i < this.controlMap.length; i++) {
            id = this.controlMap[i][0];
            key = this.controlMap[i][1];
            if (byId(id)) {
                byId(id).value = s[key];
                byId(id + "Number").value = s[key];
            }
        }
        if (byId("bgMotionEnable")) {
            byId("bgMotionEnable").checked = !!s.motionEnable;
        }
    };

    BackgroundEngine.readControls = function () {
        var s = this.merge(this.state || this.defaults, {});
        var i;
        var id;
        var key;
        var n;

        if (byId("bgPreset")) {
            s.preset = byId("bgPreset").value || "custom";
        }
        for (i = 0; i < this.colorMap.length; i++) {
            id = this.colorMap[i][0];
            key = this.colorMap[i][1];
            if (byId(id)) {
                s[key] = normalizeHex(byId(id).value, this.defaults[key]);
            }
        }
        for (i = 0; i < this.controlMap.length; i++) {
            id = this.controlMap[i][0];
            key = this.controlMap[i][1];
            if (byId(id + "Number")) {
                n = clampNumber(byId(id + "Number").value, this.defaults[key], this.controlMap[i][2], this.controlMap[i][3]);
                s[key] = n;
            }
        }
        if (byId("bgMotionEnable")) {
            s.motionEnable = !!byId("bgMotionEnable").checked;
        }
        return s;
    };

    BackgroundEngine.save = function () {
        saveStoredJson(StorageKeys.background, this.state || this.defaults);
    };

    BackgroundEngine.applyPreset = function (name) {
        var preset = this.presets[name] || this.presets.blackGold;
        var state = this.merge(this.defaults, preset);
        state.preset = name || "blackGold";
        this.applyState(state, true);
        this.save();
    };

    BackgroundEngine.randomDark = function () {
        var r = Math.floor(2 + Math.random() * 18);
        var g = Math.floor(2 + Math.random() * 18);
        var b = Math.floor(2 + Math.random() * 22);
        return rgbToHex(r, g, b);
    };

    BackgroundEngine.randomAccent = function () {
        var hue = Math.floor(Math.random() * 360);
        var r = Math.floor(90 + Math.random() * 95);
        var g = Math.floor(70 + Math.random() * 95);
        var b = Math.floor(36 + Math.random() * 90);
        if (hue > 160 && hue < 250) {
            b = Math.floor(96 + Math.random() * 72);
        }
        return rgbToHex(r, g, b);
    };

    BackgroundEngine.randomize = function () {
        var accent = this.randomAccent();
        var accent2 = mixHex(accent, this.randomDark(), 0.45);
        var base = this.randomDark();
        var state = this.merge(this.defaults, {
            preset: "custom",
            baseColor: base,
            secondaryColor: mixHex(base, accent, 0.08),
            accentColor: accent,
            accent2Color: accent2,
            lineColor: mixHex(accent, "#ffffff", 0.08),
            glowColor: accent,
            glowOpacity: +(0.08 + Math.random() * 0.22).toFixed(2),
            glowSize: Math.round(48 + Math.random() * 46),
            glowX: Math.round(12 + Math.random() * 76),
            glowY: Math.round(10 + Math.random() * 78),
            gridOpacity: +(Math.random() * 0.2).toFixed(2),
            gridSize: Math.round(24 + Math.random() * 44),
            lineOpacity: +(0.04 + Math.random() * 0.18).toFixed(2),
            ringOpacity: +(Math.random() * 0.18).toFixed(2),
            ringScale: +(0.75 + Math.random() * 0.85).toFixed(2),
            accentAngle: Math.round(Math.random() * 360),
            patternDensity: +(0.65 + Math.random() * 0.85).toFixed(2),
            contrast: +(0.2 + Math.random() * 0.45).toFixed(2),
            motionEnable: Math.random() > 0.55,
            motionSpeed: +(0.75 + Math.random() * 0.75).toFixed(2),
            motionAmount: +(0.12 + Math.random() * 0.38).toFixed(2)
        });
        this.applyState(state, true);
        this.save();
    };

    BackgroundEngine.handleColorChange = function (inputId, color) {
        var i;
        for (i = 0; i < this.colorMap.length; i++) {
            if (this.colorMap[i][0] === inputId) {
                this.state = this.readControls();
                this.state[this.colorMap[i][1]] = normalizeHex(color, this.defaults[this.colorMap[i][1]]);
                this.state.preset = "custom";
                this.applyState(this.state, true);
                this.save();
                return true;
            }
        }
        return false;
    };

    BackgroundEngine.bindControls = function () {
        var self = this;
        var i;
        var id;

        if (byId("bgPreset")) {
            byId("bgPreset").addEventListener("change", function () {
                self.applyPreset(this.value);
            });
        }
        for (i = 0; i < this.controlMap.length; i++) {
            id = this.controlMap[i][0];
            (function (controlId, minValue, maxValue) {
                linkPersistedRange(controlId, controlId + "Number", minValue, maxValue, function () {
                    self.state = self.readControls();
                    self.state.preset = "custom";
                    self.applyState(self.state, true);
                    self.save();
                });
            })(id, this.controlMap[i][2], this.controlMap[i][3]);
        }
        if (byId("bgMotionEnable")) {
            byId("bgMotionEnable").addEventListener("change", function () {
                self.state = self.readControls();
                self.state.preset = "custom";
                self.applyState(self.state, false);
                self.save();
            });
        }
        if (byId("bgRandomizeBtn")) {
            byId("bgRandomizeBtn").addEventListener("click", function () {
                self.randomize();
                setStatus(tr("status.backgroundRandomized"));
            });
        }
        if (byId("bgResetBtn")) {
            byId("bgResetBtn").addEventListener("click", function () {
                self.applyPreset("blackGold");
                setStatus(tr("status.backgroundDefaultsRestored"));
            });
        }
    };

    BackgroundEngine.init = function () {
        var stored = loadStoredJson(StorageKeys.background, null);
        this.applyState(stored || this.merge(this.defaults, this.presets.blackGold), true);
        this.bindControls();
    };

    function linkRange(rangeId, numberId, min, max) {
        var range = byId(rangeId);
        var number = byId(numberId);

        function syncFromRange() {
            number.value = range.value;
        }

        function syncFromNumber() {
            var n = clampNumber(number.value, parseFloat(range.value), min, max);
            number.value = n;
            range.value = n;
        }

        range.addEventListener("input", syncFromRange);
        number.addEventListener("change", syncFromNumber);
        syncFromRange();
    }

    function linkPersistedRange(rangeId, numberId, min, max, onChange) {
        var range = byId(rangeId);
        var number = byId(numberId);

        if (!range || !number) {
            return;
        }

        function notify() {
            if (onChange) {
                onChange();
            }
        }

        linkRange(rangeId, numberId, min, max);
        range.addEventListener("input", notify);
        number.addEventListener("change", notify);
    }

    function setLinkedRangeValue(baseId, value, fallback) {
        var range = byId(baseId);
        var number = byId(baseId + "Number");
        var v = clampNumber(value, fallback);

        if (range) {
            range.value = v;
        }
        if (number) {
            number.value = v;
        }
    }

    function refreshSelection() {
        if (!hostLoaded || panelShuttingDown || panelSuspended) {
            return;
        }
        evalHost("AEToolbox.getSelectionSummary()", function (raw) {
            if (panelShuttingDown || panelSuspended) {
                return;
            }
            var result = parseResult(raw);
            if (result.selectionLabel) {
                byId("selectionPill").textContent = result.selectionLabel;
            }
            if (result.ok && (!byId("autoStatus") || byId("autoStatus").checked)) {
                setStatus(resultMessage(result, "status.ready"));
            }
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function setColorValue(inputId, hex) {
        var input = byId(inputId);
        var shell;
        var hexInput;
        var normalized = normalizeHex(hex, "#ffffff");

        if (!input) {
            return;
        }

        shell = input.parentNode;
        hexInput = byId(inputId + "Hex");
        input.value = normalized;
        if (shell) {
            shell.style.backgroundColor = normalized;
        }
        if (hexInput) {
            hexInput.value = normalized;
        }
    }

    function applyThemeAccent(hex) {
        var accent = normalizeHex(hex, DefaultSettings.themeAccent);
        var root = document.documentElement;
        var hot = mixHex(accent, "#ffffff", 0.24);
        var dark = mixHex(accent, "#000000", 0.58);

        root.style.setProperty("--gold", accent);
        root.style.setProperty("--gold-hot", hot);
        root.style.setProperty("--gold-soft", rgba(accent, 0.72));
        root.style.setProperty("--gold-track", rgba(accent, 0.24));
        root.style.setProperty("--gold-focus", rgba(hot, 0.62));
        root.style.setProperty("--gold-button", rgba(accent, 0.86));
        root.style.setProperty("--separator", rgba(accent, 0.16));
        root.style.setProperty("--panel-border", rgba(accent, 0.22));
        root.style.setProperty("--input-border", rgba(accent, 0.16));
        root.style.setProperty("--selection-bg", dark);
        setColorValue("themeAccent", accent);
    }

    function applyHomeBackground(hex) {
        var bg = normalizeHex(hex, DefaultSettings.homeBackground);
        document.documentElement.style.setProperty("--bg-main", bg);
        setColorValue("homeBackground", bg);
    }

    function applyToolIconTheme(iconHex, lineHex) {
        var icon = normalizeHex(iconHex, DefaultSettings.toolIconColor);
        var line = normalizeHex(lineHex, DefaultSettings.toolIconLine);
        var root = document.documentElement;

        root.style.setProperty("--tool-icon-bg", icon);
        root.style.setProperty("--tool-icon-hover-bg", rgba(mixHex(icon, line, 0.15), 0.94));
        root.style.setProperty("--tool-icon-line", rgba(line, 0.9));
        root.style.setProperty("--tool-icon-line-soft", rgba(line, 0.64));
        root.style.setProperty("--tool-icon-fill", rgba(line, 0.13));
        setColorValue("toolIconColor", icon);
        setColorValue("toolIconLine", line);
        updateProceduralHomeIconAppearance();
        refreshSettingsThemePresentation();
    }

    function normalizeProceduralIconMode(value) {
        return window.ProceduralThemeMap && typeof window.ProceduralThemeMap.normalizeMode === "function"
            ? window.ProceduralThemeMap.normalizeMode(value)
            : (value === "themeMapped" ? "themeMapped" : "colorful");
    }

    function updateProceduralHomeIconAppearance() {
        var controller = window.ProceduralHomeIcons;
        var modeSelect = byId("proceduralIconMode");
        var colors = resolveProceduralThemeColors();
        if (!controller || typeof controller.updateAppearance !== "function") {
            return;
        }
        controller.updateAppearance({
            mode: normalizeProceduralIconMode(modeSelect ? modeSelect.value : DefaultSettings.proceduralIconMode),
            darkColor: colors.dark,
            midColor: colors.mid,
            lightColor: colors.light
        });
    }

    function applyProceduralIconMode(value) {
        var mode = normalizeProceduralIconMode(value);
        var select = byId("proceduralIconMode");
        if (select) {
            select.value = mode;
            syncCustomSelect(select);
        }
        updateProceduralHomeIconAppearance();
        refreshSettingsThemePresentation();
    }

    function applyHomeIconRadius(value) {
        var radius = clampNumber(value, DefaultSettings.homeIconRadius, 18, 40);
        var range = byId("homeIconRadius");
        var number = byId("homeIconRadiusNumber");

        document.documentElement.style.setProperty("--radius-home-icon", String(radius) + "%");
        if (range) {
            range.value = radius;
        }
        if (number) {
            number.value = radius;
        }
    }

    function setupHomeIconRadius() {
        var input = byId("homeIconRadius");
        var number = byId("homeIconRadiusNumber");

        if (!input || !number) {
            return;
        }

        linkPersistedRange("homeIconRadius", "homeIconRadiusNumber", 18, 40, function () {
            applyHomeIconRadius(number.value);
            saveSettings();
        });
        applyHomeIconRadius(number.value);
    }

    function applyHomeDragShadowIntensity(value) {
        var intensity = clampNumber(value, DefaultSettings.homeDragShadowIntensity, 0, 1.5);
        var range = byId("homeDragShadowIntensity");
        var number = byId("homeDragShadowIntensityNumber");
        var primary = Math.min(0.72, Math.max(0, 0.48 * intensity));
        var secondary = Math.min(0.48, Math.max(0, 0.32 * intensity));

        document.documentElement.style.setProperty("--home-drag-shadow-primary", "rgba(0, 0, 0, " + primary.toFixed(3) + ")");
        document.documentElement.style.setProperty("--home-drag-shadow-secondary", "rgba(0, 0, 0, " + secondary.toFixed(3) + ")");
        if (range) {
            range.value = intensity;
        }
        if (number) {
            number.value = intensity;
        }
    }

    function setupHomeDragShadowIntensity() {
        var input = byId("homeDragShadowIntensity");
        var number = byId("homeDragShadowIntensityNumber");

        if (!input || !number) {
            return;
        }

        linkPersistedRange("homeDragShadowIntensity", "homeDragShadowIntensityNumber", 0, 1.5, function () {
            applyHomeDragShadowIntensity(number.value);
            saveSettings();
        });
        applyHomeDragShadowIntensity(number.value);
    }

    function syncSettingsDeveloperOnlyFields() {
        var enabled = window.AETOOLBOX_DEBUG_REGISTRY === true;
        var rows = document.querySelectorAll(".settings-developer-only");
        var i;
        for (i = 0; i < rows.length; i++) {
            rows[i].hidden = !enabled;
            rows[i].classList.toggle("is-settings-hidden", !enabled);
        }
    }

    function pickColorWithAE(inputId) {
        var input = byId(inputId);
        var current = input.value;

        if (panelShuttingDown) {
            return;
        }
        if (!hostLoaded) {
            setStatus(tr("status.hostLoading"), "busy", true);
            return;
        }

        setStatus(tr("status.colorPickerOpening"), "busy", true);
        evalHost("AEToolbox.pickColor('" + jsxQuote(current) + "')", function (raw) {
            if (panelShuttingDown) {
                return;
            }
            var result = parseResult(raw);
            if (result.ok && !result.cancelled && result.color) {
                setColorValue(inputId, result.color);
                if (BackgroundEngine.handleColorChange(inputId, result.color)) {
                    setStatus(resultMessage(result, "status.colorUpdated"));
                    return;
                }
                if (inputId === "themeAccent") {
                    applyThemeAccent(result.color);
                    saveSettings();
                } else if (inputId === "homeBackground") {
                    applyHomeBackground(result.color);
                    saveSettings();
                } else if (inputId === "toolIconColor" || inputId === "toolIconLine") {
                    if (inputId === "toolIconColor") {
                        applyToolIconTheme(result.color, byId("toolIconLine").value);
                    } else {
                        applyToolIconTheme(byId("toolIconColor").value, result.color);
                    }
                    saveSettings();
                }
                setStatus(resultMessage(result, "status.colorUpdated"));
                return;
            }
            setStatus(resultMessage(result, "status.colorUnchanged"), result.ok ? "ok" : "error");
        });
    }

    function setupColorControls() {
        var shells = document.querySelectorAll(".color-shell");
        var i;

        function bindShell(shell) {
            var target = shell.getAttribute("data-color-target");
            if (target && byId(target)) {
                setColorValue(target, byId(target).value);
            }
            shell.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                pickColorWithAE(shell.getAttribute("data-color-target"));
            });
            shell.addEventListener("keydown", function (event) {
                if (event.keyCode === 13 || event.keyCode === 32) {
                    event.preventDefault();
                    event.stopPropagation();
                    pickColorWithAE(shell.getAttribute("data-color-target"));
                }
            });
        }

        for (i = 0; i < shells.length; i++) {
            bindShell(shells[i]);
        }
    }

    function closeCustomSelectMenus(exceptControl) {
        var controls = document.querySelectorAll(".custom-select");
        var trigger;
        var menu;
        var i;

        for (i = 0; i < controls.length; i++) {
            if (exceptControl && controls[i] === exceptControl) {
                continue;
            }
            controls[i].classList.remove("is-open");
            trigger = controls[i].querySelector(".select-trigger");
            if (trigger) {
                trigger.setAttribute("aria-expanded", "false");
            }
            menu = getCustomSelectMenu(controls[i]);
            if (menu) {
                menu.classList.remove("is-open");
                menu.classList.remove("is-above");
                menu.style.left = "";
                menu.style.top = "";
                menu.style.width = "";
                menu.style.maxHeight = "";
            }
        }
    }

    function cleanupTransientUiState() {
        closeCustomSelectMenus();
    }

    function stopSelectionPolling() {
        if (selectionPollTimer) {
            window.clearInterval(selectionPollTimer);
            selectionPollTimer = null;
        }
    }

    function startSelectionPolling() {
        if (selectionPollTimer || panelShuttingDown || panelSuspended) {
            return;
        }
        selectionPollTimer = window.setInterval(function () {
            if (!panelShuttingDown && !panelSuspended && (!byId("autoStatus") || byId("autoStatus").checked)) {
                refreshActiveTool();
            }
        }, 2200);
    }

    function suspendPanelRuntime() {
        panelSuspended = true;
        stopSelectionPolling();
        stopRegistryStatePolling();
        closeRegistryColorPicker();
        cleanupTransientUiState();
    }

    function resumePanelRuntime() {
        if (panelShuttingDown) {
            return;
        }
        panelSuspended = false;
        startSelectionPolling();
        if (isDynamicTool(activeToolId)) {
            startRegistryStatePolling(DynamicTools[activeToolId]);
        }
        refreshActiveTool();
    }

    function shutdownPanelRuntime() {
        if (panelShuttingDown) {
            return;
        }
        lifecycleDebug("panel close start");
        panelShuttingDown = true;
        stopSelectionPolling();
        stopRegistryStatePolling();
        clearRegistrySaveTimers();
        if (HomeLayoutManager && HomeLayoutManager.teardownForShutdown) {
            HomeLayoutManager.teardownForShutdown();
        }
        if (window.ProceduralHomeIcons && typeof window.ProceduralHomeIcons.teardown === "function") {
            window.ProceduralHomeIcons.teardown();
        }
        if (window.ProceduralPaletteStore && typeof window.ProceduralPaletteStore.flush === "function") {
            window.ProceduralPaletteStore.flush();
        }
        unbindThemePaletteStore();
        teardownPaletteWorkspace();
        if (statusTimer) {
            window.clearTimeout(statusTimer);
            statusTimer = null;
        }
        closeRegistryColorPicker();
        cleanupTransientUiState();
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            suspendPanelRuntime();
        } else {
            resumePanelRuntime();
        }
    }

    function bindPanelLifecycle() {
        if (PanelLifecycleListenersBound) {
            return;
        }
        PanelLifecycleListenersBound = true;
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", shutdownPanelRuntime);
        window.addEventListener("beforeunload", shutdownPanelRuntime);
        window.addEventListener("unload", shutdownPanelRuntime);
    }

    function getCustomSelectMenu(control) {
        var selectId;
        if (!control) {
            return null;
        }
        selectId = control.getAttribute("data-select-for");
        if (!selectId) {
            return null;
        }
        return document.querySelector('.select-menu[data-select-menu-for="' + selectId + '"]');
    }

    function positionCustomSelectMenu(control) {
        var menu = getCustomSelectMenu(control);
        var rect;
        var viewportWidth;
        var viewportHeight;
        var gap = 6;
        var edge = 8;
        var width;
        var left;
        var desiredHeight;
        var availableBelow;
        var availableAbove;
        var openAbove;
        var maxHeight;
        var top;

        if (!control || !menu) {
            return;
        }

        rect = control.getBoundingClientRect();
        viewportWidth = window.innerWidth || document.documentElement.clientWidth || 320;
        viewportHeight = window.innerHeight || document.documentElement.clientHeight || 480;
        width = Math.min(rect.width, viewportWidth - edge * 2);
        left = Math.max(edge, Math.min(rect.left, viewportWidth - width - edge));

        menu.style.width = width + "px";
        menu.style.left = left + "px";
        menu.style.maxHeight = "";

        desiredHeight = Math.min(menu.scrollHeight || 220, 220);
        availableBelow = viewportHeight - rect.bottom - edge - gap;
        availableAbove = rect.top - edge - gap;
        openAbove = availableBelow < desiredHeight && availableAbove > availableBelow;
        maxHeight = Math.max(72, Math.min(desiredHeight, openAbove ? availableAbove : availableBelow));
        top = openAbove ? rect.top - maxHeight - gap : rect.bottom + gap;

        menu.classList.toggle("is-above", openAbove);
        menu.style.top = Math.max(edge, top) + "px";
        menu.style.maxHeight = maxHeight + "px";
    }

    function getSelectOptionLabel(option) {
        if (!option) {
            return "";
        }
        if (option.getAttribute("data-i18n")) {
            return tr(option.getAttribute("data-i18n"));
        }
        return option.textContent;
    }

    function rebuildCustomSelectOptions(select) {
        var control;
        var menu;
        var optionButton;
        var options;
        var i;

        if (!select) {
            return;
        }
        control = select.getAttribute("data-custom-select-id");
        control = control ? document.querySelector('.custom-select[data-select-for="' + control + '"]') : null;
        menu = getCustomSelectMenu(control);
        if (!menu) {
            return;
        }
        menu.innerHTML = "";
        options = select.options || [];
        for (i = 0; i < options.length; i++) {
            optionButton = document.createElement("button");
            optionButton.type = "button";
            optionButton.className = "select-option";
            optionButton.setAttribute("role", "option");
            optionButton.setAttribute("data-value", options[i].value);
            if (options[i].getAttribute("data-i18n")) {
                optionButton.setAttribute("data-option-i18n", options[i].getAttribute("data-i18n"));
            }
            optionButton.textContent = getSelectOptionLabel(options[i]);
            optionButton.addEventListener("click", function () {
                setNativeSelectValue(select, this.getAttribute("data-value"), true);
                closeCustomSelectMenus();
            });
            menu.appendChild(optionButton);
        }
    }

    function syncCustomSelect(select) {
        var control;
        var triggerLabel;
        var options;
        var i;
        var value;
        var option;

        if (!select) {
            return;
        }
        control = select.getAttribute("data-custom-select-id");
        control = control ? document.querySelector('.custom-select[data-select-for="' + control + '"]') : null;
        if (!control) {
            return;
        }

        value = select.value;
        triggerLabel = control.querySelector(".select-label");
        option = select.options[select.selectedIndex] || select.options[0];
        if (triggerLabel) {
            triggerLabel.textContent = getSelectOptionLabel(option);
        }

        control = getCustomSelectMenu(control);
        options = control ? control.querySelectorAll(".select-option") : [];
        for (i = 0; i < options.length; i++) {
            if (options[i].getAttribute("data-option-i18n")) {
                options[i].textContent = tr(options[i].getAttribute("data-option-i18n"));
            }
            options[i].classList.toggle("is-selected", options[i].getAttribute("data-value") === value);
            options[i].setAttribute("aria-selected", options[i].getAttribute("data-value") === value ? "true" : "false");
        }
    }

    function syncAllCustomSelects() {
        var selects = document.querySelectorAll("select.select-input");
        var i;
        for (i = 0; i < selects.length; i++) {
            syncCustomSelect(selects[i]);
        }
    }

    function setNativeSelectValue(select, value, notify) {
        if (!select) {
            return;
        }
        select.value = value;
        syncCustomSelect(select);
        if (notify) {
            var event = document.createEvent("HTMLEvents");
            event.initEvent("change", true, false);
            select.dispatchEvent(event);
        }
    }

    function createCustomSelect(select, index) {
        var control;
        var trigger;
        var label;
        var chevron;
        var menu;
        var optionButton;
        var option;
        var selectId;
        var i;

        if (!select || select.getAttribute("data-customized") === "true") {
            return;
        }

        selectId = select.id || ("customSelect" + index);
        select.setAttribute("data-custom-select-id", selectId);
        select.setAttribute("data-customized", "true");
        select.classList.add("is-native-select-hidden");

        control = document.createElement("span");
        control.className = "custom-select select-input-replacement";
        if (select.classList && select.classList.contains("settings-select")) {
            control.className += " settings-select-control";
        }
        control.setAttribute("data-select-for", selectId);

        trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "select-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");

        label = document.createElement("span");
        label.className = "select-label";
        chevron = document.createElement("span");
        chevron.className = "select-chevron";
        chevron.setAttribute("aria-hidden", "true");

        trigger.appendChild(label);
        trigger.appendChild(chevron);
        control.appendChild(trigger);

        menu = document.createElement("span");
        menu.className = "select-menu";
        menu.setAttribute("role", "listbox");
        menu.setAttribute("data-select-menu-for", selectId);

        document.body.appendChild(menu);
        select.parentNode.insertBefore(control, select.nextSibling);
        rebuildCustomSelectOptions(select);

        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (control.classList.contains("is-open")) {
                closeCustomSelectMenus();
            } else {
                closeCustomSelectMenus(control);
                positionCustomSelectMenu(control);
                control.classList.add("is-open");
                menu.classList.add("is-open");
                trigger.setAttribute("aria-expanded", "true");
            }
        });

        trigger.addEventListener("keydown", function (event) {
            var currentMenu = getCustomSelectMenu(control);
            var options = currentMenu ? currentMenu.querySelectorAll(".select-option") : [];
            var selected = currentMenu ? currentMenu.querySelector(".select-option.is-selected") : null;
            var selectedIndex = 0;
            var nextIndex;
            for (i = 0; i < options.length; i++) {
                if (options[i] === selected) {
                    selectedIndex = i;
                    break;
                }
            }
            if (event.keyCode === 13 || event.keyCode === 32) {
                event.preventDefault();
                trigger.click();
            } else if (event.keyCode === 27) {
                closeCustomSelectMenus();
            } else if (event.keyCode === 38 || event.keyCode === 40) {
                event.preventDefault();
                nextIndex = selectedIndex + (event.keyCode === 40 ? 1 : -1);
                if (nextIndex < 0) {
                    nextIndex = options.length - 1;
                }
                if (nextIndex >= options.length) {
                    nextIndex = 0;
                }
                if (options[nextIndex]) {
                    setNativeSelectValue(select, options[nextIndex].getAttribute("data-value"), true);
                }
            }
        });

        select.addEventListener("change", function () {
            syncCustomSelect(select);
        });

        syncCustomSelect(select);
    }

    function setupCustomSelectInputs() {
        var selects = document.querySelectorAll("select.select-input");
        var settingsContent;
        var i;
        for (i = 0; i < selects.length; i++) {
            createCustomSelect(selects[i], i);
        }
        if (!CustomSelectGlobalListenersBound) {
            CustomSelectGlobalListenersBound = true;
            document.addEventListener("click", function (event) {
                if (!hasAncestorWithClass(event.target, "custom-select", document) && !hasAncestorWithClass(event.target, "select-menu", document)) {
                    closeCustomSelectMenus();
                }
            });
            window.addEventListener("resize", function () {
                closeCustomSelectMenus();
            });
            settingsContent = document.querySelector(".settings-content");
            if (settingsContent) {
                settingsContent.addEventListener("scroll", function () {
                    closeCustomSelectMenus();
                });
            }
        }
        bindPanelLifecycle();
    }

    function setCustomSelectValue(control, value, announce) {
        var input = control.querySelector("input");
        var label = control.querySelector("#motionSpeedLabel");
        var options = control.querySelectorAll(".select-option");
        var text = "";
        var i;

        for (i = 0; i < options.length; i++) {
            if (options[i].getAttribute("data-value") === String(value)) {
                options[i].classList.add("is-selected");
                options[i].setAttribute("aria-selected", "true");
                text = options[i].textContent;
            } else {
                options[i].classList.remove("is-selected");
                options[i].setAttribute("aria-selected", "false");
            }
        }

        if (input) {
            input.value = value;
        }
        control.setAttribute("data-value", value);
        if (label && text) {
            label.textContent = text;
        }

        if (input && input.id === "motionSpeed") {
            motionScale = clampNumber(value, 1, 0.6, 1.5);
            if (announce) {
                setStatus(tr("status.motionSpeedUpdated"));
            }
        }
    }

    function setupMotionSpeed() {
        var input = byId("motionSpeed");
        var number = byId("motionSpeedNumber");

        if (!input || !number) {
            return;
        }

        linkPersistedRange("motionSpeed", "motionSpeedNumber", 0.75, 1.35, function () {
            motionScale = clampNumber(number.value, DefaultSettings.motionSpeed, 0.75, 1.35);
            saveSettings();
        });
        motionScale = clampNumber(number.value, DefaultSettings.motionSpeed, 0.75, 1.35);
    }

    function applyUiScale(value) {
        var scale = clampNumber(value, DefaultSettings.uiScale, 0.62, 1.18);
        var range = byId("uiScale");
        var number = byId("uiScaleNumber");

        document.documentElement.style.setProperty("--ui-scale", String(scale));
        if (range) {
            range.value = scale;
        }
        if (number) {
            number.value = scale;
        }
    }

    function setupUiScale() {
        var input = byId("uiScale");
        var number = byId("uiScaleNumber");

        if (!input || !number) {
            return;
        }

        linkPersistedRange("uiScale", "uiScaleNumber", 0.62, 1.18, function () {
            applyUiScale(number.value);
            saveSettings();
        });
        applyUiScale(number.value);
    }

    function setBackgroundSettingsCollapsed(collapsed) {
        var card = byId("backgroundSettingsCard");
        var toggle = byId("backgroundSettingsToggle");
        var isCollapsed = !!collapsed;

        if (!card || !toggle) {
            return;
        }

        card.classList.toggle("is-collapsed", isCollapsed);
        toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
        saveStoredJson(StorageKeys.backgroundCollapsed, isCollapsed);
    }

    function setupCollapsibleSettings() {
        var card = byId("backgroundSettingsCard");
        var toggle = byId("backgroundSettingsToggle");
        var collapsed;

        if (!card || !toggle) {
            return;
        }

        collapsed = loadStoredJson(StorageKeys.backgroundCollapsed, false) === true;
        setBackgroundSettingsCollapsed(collapsed);
        toggle.addEventListener("click", function (event) {
            event.preventDefault();
            setBackgroundSettingsCollapsed(!card.classList.contains("is-collapsed"));
        });
    }

    function setStoredCollapsible(cardId, toggleId, storageKey, isCollapsed) {
        var card = byId(cardId);
        var toggle = byId(toggleId);
        if (!card || !toggle) {
            return;
        }
        card.classList.toggle("is-collapsed", isCollapsed);
        toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
        saveStoredJson(storageKey, isCollapsed);
    }

    function setupStoredCollapsible(cardId, toggleId, storageKey, defaultCollapsed) {
        var card = byId(cardId);
        var toggle = byId(toggleId);
        var collapsed;
        if (!card || !toggle) {
            return;
        }
        collapsed = loadStoredJson(storageKey, defaultCollapsed) === true;
        setStoredCollapsible(cardId, toggleId, storageKey, collapsed);
        toggle.addEventListener("click", function (event) {
            event.preventDefault();
            setStoredCollapsible(cardId, toggleId, storageKey, !card.classList.contains("is-collapsed"));
        });
    }

    function collectSettings() {
        var autoStatus = byId("autoStatus");
        var registryDebugTools = byId("registryDebugTools");
        return {
            motionSpeed: clampNumber(byId("motionSpeedNumber").value, DefaultSettings.motionSpeed, 0.75, 1.35),
            uiScale: clampNumber(byId("uiScaleNumber").value, DefaultSettings.uiScale, 0.62, 1.18),
            themeAccent: normalizeHex(byId("themeAccent").value, DefaultSettings.themeAccent),
            homeBackground: normalizeHex(byId("homeBackground").value, DefaultSettings.homeBackground),
            toolIconColor: normalizeHex(byId("toolIconColor").value, DefaultSettings.toolIconColor),
            toolIconLine: normalizeHex(byId("toolIconLine").value, DefaultSettings.toolIconLine),
            proceduralIconMode: normalizeProceduralIconMode(byId("proceduralIconMode") ? byId("proceduralIconMode").value : DefaultSettings.proceduralIconMode),
            toolIconDarkSourceMode: normalizeToolIconDarkSourceMode(byId("toolIconDarkSourceMode") ? byId("toolIconDarkSourceMode").value : DefaultSettings.toolIconDarkSourceMode),
            toolIconDarkPaletteId: byId("toolIconDarkPaletteId") ? String(byId("toolIconDarkPaletteId").value || "") : DefaultSettings.toolIconDarkPaletteId,
            homeIconRadius: byId("homeIconRadiusNumber") ? clampNumber(byId("homeIconRadiusNumber").value, DefaultSettings.homeIconRadius, 18, 40) : DefaultSettings.homeIconRadius,
            homeDragShadowIntensity: byId("homeDragShadowIntensityNumber") ? clampNumber(byId("homeDragShadowIntensityNumber").value, DefaultSettings.homeDragShadowIntensity, 0, 1.5) : DefaultSettings.homeDragShadowIntensity,
            autoStatus: autoStatus ? !!autoStatus.checked : true,
            registryDebugTools: registryDebugTools ? !!registryDebugTools.checked : false
        };
    }

    function saveSettings() {
        saveStoredJson(StorageKeys.settings, collectSettings());
    }

    function applySettings(settings) {
        var data = settings || DefaultSettings;
        var speed = clampNumber(data.motionSpeed, DefaultSettings.motionSpeed, 0.75, 1.35);
        byId("motionSpeed").value = speed;
        byId("motionSpeedNumber").value = speed;
        motionScale = speed;
        applyUiScale(data.uiScale || DefaultSettings.uiScale);
        if (byId("autoStatus")) {
            byId("autoStatus").checked = data.autoStatus !== false;
        }
        applyRegistryDebugTools(data.registryDebugTools === true);
        applyThemeAccent(data.themeAccent || DefaultSettings.themeAccent);
        applyHomeBackground(data.homeBackground || DefaultSettings.homeBackground);
        applyToolIconTheme(data.toolIconColor || DefaultSettings.toolIconColor, data.toolIconLine || DefaultSettings.toolIconLine);
        applyProceduralIconDarkSourceMode(data.toolIconDarkSourceMode || DefaultSettings.toolIconDarkSourceMode);
        applyProceduralIconDarkPaletteId(data.toolIconDarkPaletteId || DefaultSettings.toolIconDarkPaletteId);
        applyProceduralIconMode(data.proceduralIconMode || DefaultSettings.proceduralIconMode);
        applyHomeIconRadius(data.homeIconRadius || DefaultSettings.homeIconRadius);
        applyHomeDragShadowIntensity(typeof data.homeDragShadowIntensity !== "undefined" ? data.homeDragShadowIntensity : DefaultSettings.homeDragShadowIntensity);
    }

    function loadPersistentState() {
        applySettings(loadStoredJson(StorageKeys.settings, DefaultSettings));
    }

    function resetSettingsMorphStyles() {
        var view = byId("settingsView");
        var panel = view ? view.querySelector(".settings-panel") : null;
        var backdrop = byId("settingsBackdrop");

        if (panel) {
            panel.style.position = "";
            panel.style.inset = "";
            panel.style.left = "";
            panel.style.top = "";
            panel.style.width = "";
            panel.style.height = "";
            panel.style.borderRadius = "";
            panel.style.opacity = "";
            panel.style.transform = "";
        }
        if (backdrop) {
            backdrop.style.opacity = "";
        }
    }

    function finishOpenSettingsTransition() {
        var view = byId("settingsView");

        view.classList.add("no-transition", "is-open");
        view.classList.remove("is-morphing");
        view.setAttribute("aria-hidden", "false");
        view.offsetWidth;

        nextFrame(function () {
            resetSettingsMorphStyles();
            nextFrame(function () {
                view.classList.remove("no-transition");
                endAnimation();
                nextFrame(function () {
                    revealSettingsContent();
                });
            });
        });
    }

    function finishCloseSettingsTransition() {
        var view = byId("settingsView");

        view.classList.add("no-transition");
        view.classList.remove("is-open", "is-morphing");
        view.setAttribute("aria-hidden", "true");
        view.offsetWidth;

        nextFrame(function () {
            resetSettingsMorphStyles();
            closePaletteWorkspace({ reason: "settings-close", animate: false });
            clearSettingsContentClasses();
            nextFrame(function () {
                view.classList.remove("no-transition");
                endAnimation();
            });
        });
    }

    function openSettingsPanel() {
        var view = byId("settingsView");
        var panel;
        var backdrop;
        var source;
        var target;
        var sourceRect;
        var finishGate;

        if (!view || byId("appShell").classList.contains("is-animating") || view.classList.contains("is-open")) {
            return;
        }
        ensurePaletteWorkspaceClosed();
        closeCustomSelectMenus();
        panel = view.querySelector(".settings-panel");
        backdrop = byId("settingsBackdrop");
        source = byId("settingsBtn");
        sourceRect = source.getBoundingClientRect();
        target = getSettingsTargetRect();

        beginAnimation();
        clearSettingsContentClasses();
        suppressSettingsContent();
        setPanelMorphRect(panel, sourceRect, "19px");
        view.classList.add("is-morphing");
        view.setAttribute("aria-hidden", "false");
        if (backdrop) {
            backdrop.style.opacity = "0";
        }

        finishGate = makeAnimationGate(backdrop ? 2 : 1, function () {
            finishOpenSettingsTransition();
        });

        playAnimation(panel, [
            {
                left: sourceRect.left + "px",
                top: sourceRect.top + "px",
                width: sourceRect.width + "px",
                height: sourceRect.height + "px",
                borderRadius: "19px"
            },
            {
                left: target.left + "px",
                top: target.top + "px",
                width: target.width + "px",
                height: target.height + "px",
                borderRadius: "22px"
            }
        ], {
            duration: duration("launch"),
            easing: Motion.appleOut,
            fill: "forwards"
        }, function () {
            finishGate();
        });

        if (backdrop) {
            playAnimation(backdrop, [
                { opacity: "0" },
                { opacity: "1" }
            ], {
                duration: duration("normal"),
                easing: Motion.appleOut,
                fill: "forwards"
            }, function () {
                finishGate();
            });
        }
    }

    function closeSettingsPanel() {
        var view = byId("settingsView");
        var panel;
        var backdrop;
        var source;
        var sourceRect;
        var currentRect;
        var finishGate;

        if (!view || byId("appShell").classList.contains("is-animating") || !view.classList.contains("is-open")) {
            return;
        }
        closePaletteWorkspace({ reason: "settings-close", animate: false });
        closeCustomSelectMenus();
        beginAnimation();
        exitSettingsContent(function () {
            panel = view.querySelector(".settings-panel");
            backdrop = byId("settingsBackdrop");
            source = byId("settingsBtn");
            sourceRect = source.getBoundingClientRect();
            currentRect = panel.getBoundingClientRect();

            setPanelMorphRect(panel, currentRect, "22px");
            suppressSettingsContent();
            view.classList.add("is-morphing");

            finishGate = makeAnimationGate(backdrop ? 2 : 1, function () {
                finishCloseSettingsTransition();
            });

            playAnimation(panel, [
                {
                    left: currentRect.left + "px",
                    top: currentRect.top + "px",
                    width: currentRect.width + "px",
                    height: currentRect.height + "px",
                    borderRadius: "22px"
                },
                {
                    left: sourceRect.left + "px",
                    top: sourceRect.top + "px",
                    width: sourceRect.width + "px",
                    height: sourceRect.height + "px",
                    borderRadius: "19px"
                }
            ], {
                duration: duration("close"),
                easing: Motion.appleIn,
                fill: "forwards"
            }, function () {
                finishGate();
            });

            if (backdrop) {
                playAnimation(backdrop, [
                    { opacity: "1" },
                    { opacity: "0" }
                ], {
                    duration: duration("close"),
                    easing: Motion.appleIn,
                    fill: "forwards"
                }, function () {
                    finishGate();
                });
            }
        });
    }

    function bindEvents() {
        var settingsBtn;
        var closeSettingsBtn;
        var settingsBackdrop;
        var refreshBtn;

        if (window.ProceduralPaletteStore && typeof window.ProceduralPaletteStore.initialize === "function") {
            window.ProceduralPaletteStore.initialize({
                library: window.ProceduralPaletteLibrary
            });
        }
        bindThemePaletteStore();
        renderSettingsContent();
        renderSettingsTheme();
        renderPaletteLibrarySettings();
        renderSettingsBackgroundEngine();
        setupColorControls();
        renderSettingsMotion();
        setupMotionSpeed();
        setupUiScale();
        renderSettingsLanguage();
        renderSettingsDeveloperMode();
        setupHomeIconRadius();
        setupHomeDragShadowIntensity();
        loadPersistentState();
        setupLanguageSelector();
        setupCollapsibleSettings();
        BackgroundEngine.init();
        setupCustomSelectInputs();
        HomeLayoutManager.init();
        if (window.ProceduralHomeIcons && typeof window.ProceduralHomeIcons.initialize === "function") {
            window.ProceduralHomeIcons.initialize({
                root: byId("toolGrid")
            });
        }
        configureToolDetail(activeToolId);
        refreshLanguage();

        byId("backBtn").addEventListener("click", function () {
            closeToolWithLaunchTransition();
        });
        settingsBtn = byId("settingsBtn");
        closeSettingsBtn = byId("closeSettingsBtn");
        settingsBackdrop = byId("settingsBackdrop");
        refreshBtn = byId("refreshSelectionBtn");

        if (settingsBtn) {
            settingsBtn.addEventListener("click", openSettingsPanel);
        }
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener("click", closeSettingsPanel);
        }
        if (settingsBackdrop) {
            settingsBackdrop.addEventListener("click", closeSettingsPanel);
        }
        if (refreshBtn) {
            refreshBtn.addEventListener("click", refreshSelection);
        }
        if (byId("autoStatus")) {
            byId("autoStatus").addEventListener("change", saveSettings);
        }
        if (byId("registryDebugTools")) {
            byId("registryDebugTools").addEventListener("change", function () {
                applyRegistryDebugTools(!!this.checked);
                saveSettings();
            });
        }
        document.addEventListener("keydown", function (event) {
            if (event.keyCode === 27) {
                closeRegistryColorPicker();
                closeSettingsPanel();
            }
        });
        window.addEventListener("focus", function () {
            if (!panelShuttingDown && !panelSuspended) {
                refreshActiveTool();
            }
        });

        bindPanelLifecycle();
        startSelectionPolling();
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyI18n(document);
        bindEvents();
        refreshLanguage();
        document.body.classList.add("i18n-ready");
        window.setTimeout(warmUpAnimationPipeline, 120);
        loadHost();
    });
})();


