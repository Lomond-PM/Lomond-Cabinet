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
    var activeToolId = "textBackgroundBox";
    var activeValues = {
        fillMode: "Solid Fill",
        strokeMode: "None"
    };
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
        tool: "AEToolbox.textBackgroundBox.v1",
        ecommerce: "AEToolbox.ecommerceLayout.v1",
        settings: "AEToolbox.settings.v1",
        background: "AEToolbox.background.v1",
        backgroundCollapsed: "AEToolbox.backgroundSettingsCollapsed.v1",
        shapeAddStrokeFill: "AEToolbox.shapeAdd.strokeFillDefaults.v1",
        shapeAddItemsCollapsed: "AEToolbox.shapeAdd.itemsCollapsed.v1",
        shapeAddStrokeFillSettingsCollapsed: "AEToolbox.shapeAdd.strokeFillSettingsCollapsed.v1",
        language: "aeToolbox.language",
        homeOrder: "aeToolbox.homeToolOrder"
    };
    var ToolRegistry = {
        textBackgroundBox: {
            titleKey: "tools.textBackgroundBox.title",
            descriptionKey: "tools.textBackgroundBox.description",
            selectionMode: "layers"
        },
        selectionInfo: {
            titleKey: "tools.selectionInfo.title",
            descriptionKey: "tools.selectionInfo.description",
            selectionMode: "layers"
        },
        ecommerceLayout: {
            titleKey: "tools.adComponentKit.title",
            descriptionKey: "tools.adComponentKit.description",
            selectionMode: "layers"
        },
        shapeAdd: {
            titleKey: "tools.shapeAdd.title",
            descriptionKey: "tools.shapeAdd.description",
            selectionMode: "shape"
        }
    };
    var DynamicTools = {};
    var DynamicToolOrder = [];
    var DefaultToolParams = {
        paddingX: 40,
        paddingY: 20,
        roundness: 20,
        fillMode: "Solid Fill",
        fillColor: "#202020",
        fillOpacity: 80,
        strokeMode: "None",
        strokeColor: "#ffffff",
        strokeWidth: 2,
        strokeOpacity: 100
    };
    var DefaultShapeStrokeFillParams = {
        strokeWidth: 7,
        miterLimit: 14,
        trimStart: 0,
        trimEnd: 100,
        trimOffset: 0,
        taperStartLength: 15,
        taperEndLength: 15,
        taperStartWidth: 0,
        taperEndWidth: 0,
        taperStartEase: 30,
        taperEndEase: 30,
        strokeColor: "#FFFFFF",
        fillColor: "#D6B25E"
    };
    var DefaultEcommerceParams = {
        componentKind: "featureStack",
        gap: 14,
        paddingX: 24,
        paddingY: 12,
        cornerRadius: 28,
        pillWidthMode: "auto",
        fixedWidth: 320,
        fillColor: "#d6b25e",
        gradientEnable: false,
        textAlign: "center",
        sortMode: "yPosition",
        columns: 4,
        normalizeMode: "fitBox",
        targetWidth: 72,
        targetHeight: 72,
        cellWidth: 100,
        cellHeight: 118,
        gapX: 28,
        gapY: 24,
        lastRowAlign: "center",
        gridSortMode: "rowMajor"
    };
    var ShapeAddItems = [
        { labelKey: "shapeAdd.item.group", key: "group", matchName: "ADBE Vector Group" },
        { labelKey: "shapeAdd.item.rectangle", key: "rectangle", matchName: "ADBE Vector Shape - Rect" },
        { labelKey: "shapeAdd.item.ellipse", key: "ellipse", matchName: "ADBE Vector Shape - Ellipse" },
        { labelKey: "shapeAdd.item.star", key: "star", matchName: "ADBE Vector Shape - Star" },
        { labelKey: "shapeAdd.item.path", key: "path", matchName: "ADBE Vector Shape - Group" },
        { labelKey: "shapeAdd.item.fill", key: "fill", matchName: "ADBE Vector Graphic - Fill" },
        { labelKey: "shapeAdd.item.stroke", key: "stroke", matchName: "ADBE Vector Graphic - Stroke" },
        { labelKey: "shapeAdd.item.gradientFill", key: "gradientFill", matchName: "ADBE Vector Graphic - G-Fill" },
        { labelKey: "shapeAdd.item.gradientStroke", key: "gradientStroke", matchName: "ADBE Vector Graphic - G-Stroke" },
        { labelKey: "shapeAdd.item.mergePaths", key: "mergePaths", matchName: "ADBE Vector Filter - Merge" },
        { labelKey: "shapeAdd.item.offsetPaths", key: "offsetPaths", matchName: "ADBE Vector Filter - Offset" },
        { labelKey: "shapeAdd.item.puckerBloat", key: "puckerBloat", matchName: "ADBE Vector Filter - PB" },
        { labelKey: "shapeAdd.item.repeater", key: "repeater", matchName: "ADBE Vector Filter - Repeater" },
        { labelKey: "shapeAdd.item.roundCorners", key: "roundCorners", matchName: "ADBE Vector Filter - RC" },
        { labelKey: "shapeAdd.item.trimPaths", key: "trimPaths", matchName: "ADBE Vector Filter - Trim" },
        { labelKey: "shapeAdd.item.twist", key: "twist", matchName: "ADBE Vector Filter - Twist" },
        { labelKey: "shapeAdd.item.wigglePaths", key: "wigglePaths", matchName: "ADBE Vector Filter - Roughen" },
        { labelKey: "shapeAdd.item.wiggleTransform", key: "wiggleTransform", matchName: "ADBE Vector Filter - Wiggler" },
        { labelKey: "shapeAdd.item.zigZag", key: "zigZag", matchName: "ADBE Vector Filter - Zigzag" }
    ];
    var DefaultSettings = {
        motionSpeed: 1,
        uiScale: 0.92,
        themeAccent: "#d6b25e",
        homeBackground: "#050403",
        toolIconColor: "#15120c",
        toolIconLine: "#fff0be",
        autoStatus: true
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

    var HomeLayoutManager = {
        toolOrder: [],
        isEditing: false,
        dragState: null,

        init: function () {
            this.loadOrder();
            this.renderOrder();
            this.bindIconEvents();
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
            saveStoredJson(StorageKeys.homeOrder, this.toolOrder);
        },

        renderOrder: function () {
            var grid = byId("toolGrid");
            var more = grid ? grid.querySelector(".tool-app.is-disabled") : null;
            var i;
            var button;

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

            if (this.isEditing) {
                return;
            }
            this.isEditing = true;
            home.classList.add("home-editing");
            if (editButton) {
                editButton.textContent = tr("common.done");
                editButton.setAttribute("aria-label", tr("common.done"));
            }
            setStatus(tr("status.homeEditing"));
        },

        exitEditMode: function () {
            var home = byId("homeView");
            var tools = this.getToolButtons();
            var editButton = byId("editHomeBtn");
            var i;

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
            this.saveOrder();
            setStatus(tr("status.homeLayoutSaved"));
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
                tools[i].addEventListener(startEvent, function (event) {
                    self.startDrag(event, event.currentTarget);
                });
                tools[i].addEventListener("click", function (event) {
                    event.preventDefault();
                });
            }

            byId("editHomeBtn").addEventListener("click", function () {
                if (self.isEditing) {
                    self.exitEditMode();
                } else {
                    self.enterEditMode();
                }
            });
            byId("homeView").addEventListener("click", function (event) {
                if (!self.isEditing || self.dragState) {
                    return;
                }
                if (hasAncestorWithClass(event.target, "tool-app", this) ||
                        hasAncestorWithClass(event.target, "home-edit-button", this) ||
                        hasAncestorWithClass(event.target, "settings-entry", this)) {
                    return;
                }
                self.exitEditMode();
            });
            document.addEventListener(moveEvent, function (event) {
                self.updateDrag(event);
            });
            document.addEventListener(endEvent, function (event) {
                self.endDrag(event);
            });
        },

        startDrag: function (event, toolButton) {
            var point;
            var self = this;
            var rect;

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

            this.dragState.longPressTimer = window.setTimeout(function () {
                if (self.dragState && !self.dragState.moved) {
                    self.enterEditMode();
                    self.beginDragging();
                }
            }, 520);
        },

        beginDragging: function () {
            var state = this.dragState;
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

            if (!state || state.rafPending) {
                return;
            }
            state.rafPending = true;
            nextFrame(function () {
                self.processDragFrame();
            });
        },

        processDragFrame: function () {
            var state = this.dragState;
            var targetIndex;
            var now;

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

            window.setTimeout(function () {
                var current = document.querySelectorAll("#toolGrid .tool-app.is-reordering");
                for (i = 0; i < current.length; i++) {
                    current[i].classList.remove("is-reordering");
                }
            }, duration("normal") + 30);

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
        return DynamicTools[toolId] || ToolRegistry[toolId] || ToolRegistry.textBackgroundBox;
    }

    function isDynamicTool(toolId) {
        return !!DynamicTools[toolId];
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

        if (!grid) {
            return;
        }

        oldTools = grid.querySelectorAll(".tool-app[data-dynamic-tool='true']");
        for (i = 0; i < oldTools.length; i++) {
            oldTools[i].parentNode.removeChild(oldTools[i]);
        }

        for (i = 0; i < DynamicToolOrder.length; i++) {
            tool = DynamicTools[DynamicToolOrder[i]];
            if (!tool || tool.hidden) {
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
    }

    function mergeDynamicToolI18n(tool) {
        if (tool && tool.i18n && window.I18n && window.I18n.mergeDictionaries) {
            window.I18n.mergeDictionaries(tool.i18n);
        }
    }

    function loadRegisteredToolsFromHost() {
        evalHost("AEToolbox.getRegisteredTools()", function (raw) {
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
            hostLoaded = true;
            cs.evalScript("AEToolbox.ping()", function (result) {
                if (window.console && console.log) {
                    console.log(result);
                }
                if (loadResult === "EvalScript error." || result === "EvalScript error.") {
                    setStatus(tr("status.hostLoadError"), "error");
                    return;
                }
                cs.evalScript("AEToolbox.getHostLoadInfo()", function (infoRaw) {
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

        resetDetailMorphStyles();
        clearDetailContentClasses();
        detail.classList.remove("is-active", "is-closing", "is-entering", "is-morphing");
        home.classList.add("is-active", "is-returning");
        window.setTimeout(function () {
            home.classList.remove("is-returning");
        }, duration("normal"));
    }

    function getActiveToolButton() {
        return HomeLayoutManager.getButtonByToolId(activeToolId) || byId("openTextBgTool");
    }

    function dynamicFieldId(toolId, key) {
        return "dynamic_" + toolId + "_" + key;
    }

    function renderDynamicField(toolId, field) {
        var row = document.createElement("label");
        var label = document.createElement("span");
        var wrap = document.createElement("span");
        var input;
        var i;
        var option;

        row.className = field.type === "checkbox" ? "switch-row" : "control-row";
        label.className = "control-label";
        label.textContent = tr(field.labelKey || field.key || "");
        wrap.className = "control-inputs";

        if (field.type === "checkbox") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.id = dynamicFieldId(toolId, field.key);
            input.checked = !!field.defaultValue;
        } else if (field.type === "select") {
            input = document.createElement("select");
            input.className = "select-input";
            input.id = dynamicFieldId(toolId, field.key);
            for (i = 0; field.options && i < field.options.length; i++) {
                option = document.createElement("option");
                option.value = field.options[i].value;
                option.textContent = tr(field.options[i].labelKey || field.options[i].value);
                if (field.options[i].value === field.defaultValue) {
                    option.selected = true;
                }
                input.appendChild(option);
            }
        } else {
            input = document.createElement("input");
            input.id = dynamicFieldId(toolId, field.key);
            input.className = field.type === "number" ? "num-input" : "text-input";
            input.type = field.type === "number" ? "number" : "text";
            if (typeof field.min !== "undefined") {
                input.min = field.min;
            }
            if (typeof field.max !== "undefined") {
                input.max = field.max;
            }
            if (typeof field.step !== "undefined") {
                input.step = field.step;
            }
            input.value = typeof field.defaultValue !== "undefined" ? field.defaultValue : "";
        }

        wrap.appendChild(input);
        row.appendChild(label);
        row.appendChild(wrap);
        return row;
    }

    function collectDynamicToolParams(toolId) {
        var tool = DynamicTools[toolId];
        var schema = tool && tool.uiSchema ? tool.uiSchema : [];
        var params = {};
        var i;
        var field;
        var input;

        for (i = 0; i < schema.length; i++) {
            field = schema[i];
            if (!field || !field.key) {
                continue;
            }
            input = byId(dynamicFieldId(toolId, field.key));
            if (!input) {
                continue;
            }
            if (field.type === "checkbox") {
                params[field.key] = !!input.checked;
            } else if (field.type === "number") {
                params[field.key] = Number(input.value);
            } else {
                params[field.key] = input.value;
            }
        }
        return params;
    }

    function runDynamicToolAction(toolId, actionId) {
        var json = JSON.stringify(collectDynamicToolParams(toolId));
        setStatus(tr("status.loadingHost"), "busy", true);
        evalHost("AEToolbox.runRegisteredToolAction('" + jsxQuote(toolId) + "','" + jsxQuote(actionId) + "','" + jsxQuote(json) + "')", function (raw) {
            var result = parseResult(raw);
            setStatus(resultMessage(result, "status.ready"), result.ok ? "ok" : "error");
        });
    }

    function renderDynamicToolDetail(toolId) {
        var tool = DynamicTools[toolId];
        var panel = byId("registryToolPanel");
        var actions = byId("registryToolActions");
        var intro;
        var title;
        var desc;
        var card;
        var heading;
        var i;
        var action;
        var button;
        var oldMenus;

        if (!tool || !panel || !actions) {
            return;
        }

        oldMenus = document.querySelectorAll(".select-menu[data-select-menu-for^='dynamic_']");
        for (i = 0; i < oldMenus.length; i++) {
            oldMenus[i].parentNode.removeChild(oldMenus[i]);
        }

        panel.innerHTML = "";
        actions.innerHTML = "";

        intro = document.createElement("section");
        intro.className = "info-panel intro-panel dynamic-tool-intro";
        title = document.createElement("h3");
        title.textContent = tr(tool.titleKey || tool.id);
        desc = document.createElement("p");
        desc.textContent = tr(tool.descriptionKey || "");
        intro.appendChild(title);
        intro.appendChild(desc);
        panel.appendChild(intro);

        card = document.createElement("section");
        card.className = "panel-card control-card";
        heading = document.createElement("div");
        heading.className = "card-heading";
        heading.innerHTML = '<div><p class="overline">Registry</p><h3>Parameters</h3></div>';
        card.appendChild(heading);
        for (i = 0; tool.uiSchema && i < tool.uiSchema.length; i++) {
            card.appendChild(renderDynamicField(toolId, tool.uiSchema[i]));
        }
        panel.appendChild(card);

        for (i = 0; tool.actions && i < tool.actions.length; i++) {
            action = tool.actions[i];
            button = document.createElement("button");
            button.type = "button";
            button.className = action.style === "secondary" ? "panel-button secondary-action" : "primary-action";
            button.textContent = tr(action.labelKey || action.id);
            button.setAttribute("data-dynamic-action", action.id);
            button.addEventListener("click", function () {
                runDynamicToolAction(toolId, this.getAttribute("data-dynamic-action"));
            });
            actions.appendChild(button);
        }

        setupCustomSelectInputs();
    }

    function configureToolDetail(toolId) {
        var meta = getToolMeta(toolId);
        var panels = document.querySelectorAll(".tool-panel");
        var actions = document.querySelectorAll(".tool-actions");
        var i;
        var dynamic = isDynamicTool(toolId);

        activeToolId = toolId || "textBackgroundBox";
        byId("detailHeading").textContent = tr(meta.titleKey || "tools.textBackgroundBox.title");

        if (dynamic) {
            renderDynamicToolDetail(activeToolId);
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
            if (meta && meta.titleKey) {
                labels[i].textContent = tr(meta.titleKey);
            }
        }
    }

    function refreshLanguage() {
        var editButton = byId("editHomeBtn");
        var languageSelect = byId("languageSelect");

        applyI18n(document);
        updateHomeToolLabels();
        configureToolDetail(activeToolId);
        renderShapeAddButtons();
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
        if (activeToolId === "selectionInfo") {
            refreshSelectionInfo();
            return;
        }
        if (activeToolId === "shapeAdd") {
            refreshShapeAddState();
            return;
        }
        refreshSelection();
    }

    function renderShapeAddButtons() {
        var list = byId("shapeAddButtonList");
        var i;
        var button;
        var label;
        var meta;
        if (!list) {
            return;
        }
        if (list.getAttribute("data-rendered") !== "true") {
            for (i = 0; i < ShapeAddItems.length; i++) {
                button = document.createElement("button");
                button.type = "button";
                button.className = "panel-button shape-add-button";
                button.disabled = true;
                button.setAttribute("data-shape-key", ShapeAddItems[i].key);
                button.setAttribute("data-shape-match-name", ShapeAddItems[i].matchName);
                button.setAttribute("data-shape-label-key", ShapeAddItems[i].labelKey);

                label = document.createElement("span");
                label.className = "button-label";

                meta = document.createElement("span");
                meta.className = "button-meta";
                meta.textContent = ShapeAddItems[i].key;

                button.appendChild(label);
                button.appendChild(meta);
                button.addEventListener("click", function () {
                    addShapeItem(
                        this.getAttribute("data-shape-match-name"),
                        this.getAttribute("data-shape-key"),
                        tr(this.getAttribute("data-shape-label-key"))
                    );
                });
                list.appendChild(button);
            }
            list.setAttribute("data-rendered", "true");
        }
        for (i = 0; i < ShapeAddItems.length; i++) {
            button = list.querySelector('[data-shape-key="' + ShapeAddItems[i].key + '"]');
            if (button) {
                label = button.querySelector(".button-label");
                if (label) {
                    label.textContent = tr(ShapeAddItems[i].labelKey);
                }
            }
        }
    }

    function setShapeAddButtonsEnabled(enabled) {
        var buttons = document.querySelectorAll(".shape-add-button");
        var i;
        for (i = 0; i < buttons.length; i++) {
            buttons[i].disabled = !enabled;
        }
    }

    var shapeAddHasComp = false;

    function setStrokeFillButtonEnabled(enabled) {
        var button = byId("createStrokeFillLayerBtn");
        if (button) {
            button.disabled = !enabled;
        }
    }

    function setShapeAddState(result) {
        var card = byId("shapeAddStatus");
        var canAdd = !!(result && result.canAdd);
        var message = resultMessage(result, "status.selectShapeLayer");
        if (card) {
            card.textContent = message;
            card.classList.toggle("is-ready", canAdd);
            card.classList.toggle("is-error", !canAdd);
        }
        setShapeAddButtonsEnabled(canAdd);
        if (result && typeof result.hasComp === "boolean") {
            shapeAddHasComp = result.hasComp;
        }
        setStrokeFillButtonEnabled(shapeAddHasComp);
        if (byId("selectionPill")) {
            byId("selectionPill").textContent = canAdd ? (result.targetLabel || tr("selection.shapeTarget")) : tr("selection.noShapeTarget");
        }
    }

    function refreshShapeAddState(callback) {
        evalHost("shapeAdd_getState()", function (raw) {
            var result = parseResult(raw);
            setShapeAddState(result);
            if (callback) {
                callback(result);
            }
        });
    }

    function addShapeItem(matchName, key, label) {
        refreshShapeAddState(function (state) {
            var script;
            if (!state || !state.canAdd) {
                setStatus(resultMessage(state, "status.selectShapeLayer"), "error");
                return;
            }
            script = "shapeAdd_add('" + jsxQuote(matchName) + "','" + jsxQuote(key) + "')";
            setStatus(tr("status.addingShape", { label: label }), "busy", true);
            evalHost(script, function (raw) {
                var result = parseResult(raw);
                setShapeAddState(result);
                setStatus(result.ok && !result.messageKey ? tr("status.addedShape", { label: label }) : resultMessage(result, "status.addedShape", { label: label }), result.ok ? "ok" : "error");
            });
        });
    }

    function createStrokeFillLayer() {
        var params;
        var json;
        if (!shapeAddHasComp) {
            setStatus(tr("status.openComp"), "error");
            refreshShapeAddState();
            return;
        }
        params = collectShapeStrokeFillParams();
        json = JSON.stringify(params);
        saveShapeStrokeFillParams();
        setStatus(tr("status.creatingStrokeFillLayer"), "busy", true);
        evalHost("shapeAdd_createStrokeFillLayer('" + jsxQuote(json) + "')", function (raw) {
            var result = parseResult(raw);
            setStatus(actionMessage(result, "status.createdStrokeFillLayer"), result.ok ? "ok" : "error");
            if (!result.ok) {
                setShapeAddState(result);
            } else {
                refreshShapeAddState();
            }
        });
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

        if (byId("appShell").classList.contains("is-animating")) {
            return;
        }

        // Keep this at least as long as the CSS press transition (--dur-instant).
        // Quick mode used to start the launch at 90ms while the source icon was
        // still scaling, so the measured launch rect could be a transient frame.
        pressDelay = Math.max(120, Math.min(140, duration("fast") - 40));
        toolButton.classList.add("is-pressed");

        window.setTimeout(function () {
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

        }, pressDelay);
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
        if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
            return fallback || "#ffffff";
        }
        return value.toUpperCase();
    }

    function hexToRgb(hex) {
        var normalized = normalizeHex(hex, "#ffffff");
        return {
            r: parseInt(normalized.substr(1, 2), 16),
            g: parseInt(normalized.substr(3, 2), 16),
            b: parseInt(normalized.substr(5, 2), 16)
        };
    }

    function rgbToHex(r, g, b) {
        function part(v) {
            var n = Math.max(0, Math.min(255, Math.round(v)));
            var s = n.toString(16);
            return s.length < 2 ? "0" + s : s;
        }
        return ("#" + part(r) + part(g) + part(b)).toUpperCase();
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

    function setupSegmentedControls() {
        var groups = document.querySelectorAll(".segmented");
        for (var i = 0; i < groups.length; i++) {
            ensureSegmentedThumb(groups[i]);
            updateSegmentedThumb(groups[i], false);
            groups[i].addEventListener("click", function (event) {
                var button = event.target;
                var siblings;
                var j;

                if (!button || button.tagName !== "BUTTON") {
                    return;
                }
                siblings = button.parentNode.querySelectorAll("button");
                for (j = 0; j < siblings.length; j++) {
                    siblings[j].classList.remove("is-active");
                }
                button.classList.add("is-active");
                activeValues[button.parentNode.getAttribute("data-name")] = button.getAttribute("data-value");
                updateSegmentedThumb(button.parentNode, true);
                updateConditionalFields();
                saveToolParams();
            });
        }

        window.addEventListener("resize", function () {
            for (var j = 0; j < groups.length; j++) {
                updateSegmentedThumb(groups[j], false);
            }
        });
    }

    function ensureSegmentedThumb(group) {
        var thumb = group.querySelector(".segmented-thumb");
        if (!thumb) {
            thumb = document.createElement("span");
            thumb.className = "segmented-thumb";
            group.insertBefore(thumb, group.firstChild);
        }
        return thumb;
    }

    function updateSegmentedThumb(group, animate) {
        var thumb = ensureSegmentedThumb(group);
        var active = group.querySelector("button.is-active");
        var groupRect;
        var activeRect;
        var x;

        if (!active) {
            thumb.style.opacity = "0";
            return;
        }

        groupRect = group.getBoundingClientRect();
        activeRect = active.getBoundingClientRect();
        x = activeRect.left - groupRect.left;

        if (!animate) {
            thumb.style.transition = "none";
        } else {
            thumb.style.transition = "";
        }

        thumb.style.width = activeRect.width + "px";
        thumb.style.transform = "translateX(" + x + "px)";
        thumb.style.opacity = "1";

        if (!animate) {
            window.setTimeout(function () {
                thumb.style.transition = "";
            }, 20);
        }
    }

    function updateConditionalFields() {
        var fillIsSolid = activeValues.fillMode === "Solid Fill";
        var fillIsNone = activeValues.fillMode === "None";
        var strokeIsSolid = activeValues.strokeMode === "Solid Stroke";
        var strokeIsNone = activeValues.strokeMode === "None";

        byId("fillColorField").style.display = fillIsSolid ? "flex" : "none";
        byId("fillOpacityField").style.display = fillIsNone ? "none" : "flex";

        byId("strokeColorField").style.display = strokeIsSolid ? "flex" : "none";
        byId("strokeWidthField").style.display = strokeIsNone ? "none" : "flex";
        byId("strokeOpacityField").style.display = strokeIsNone ? "none" : "flex";
    }

    function collectParams() {
        return {
            paddingX: clampNumber(byId("paddingXNumber").value, 40, 0),
            paddingY: clampNumber(byId("paddingYNumber").value, 20, 0),
            roundness: clampNumber(byId("roundnessNumber").value, 20, 0),
            fillMode: activeValues.fillMode,
            fillColor: byId("fillColor").value,
            fillOpacity: clampNumber(byId("fillOpacityNumber").value, 80, 0, 100),
            strokeMode: activeValues.strokeMode,
            strokeColor: byId("strokeColor").value,
            strokeWidth: clampNumber(byId("strokeWidthNumber").value, 2, 0),
            strokeOpacity: clampNumber(byId("strokeOpacityNumber").value, 100, 0, 100)
        };
    }

    function setToolParams(params, animateSegments) {
        var data = params || DefaultToolParams;

        byId("paddingX").value = clampNumber(data.paddingX, DefaultToolParams.paddingX, 0);
        byId("paddingXNumber").value = byId("paddingX").value;
        byId("paddingY").value = clampNumber(data.paddingY, DefaultToolParams.paddingY, 0);
        byId("paddingYNumber").value = byId("paddingY").value;
        byId("roundness").value = clampNumber(data.roundness, DefaultToolParams.roundness, 0);
        byId("roundnessNumber").value = byId("roundness").value;
        setColorValue("fillColor", data.fillColor || DefaultToolParams.fillColor);
        byId("fillOpacity").value = clampNumber(data.fillOpacity, DefaultToolParams.fillOpacity, 0, 100);
        byId("fillOpacityNumber").value = byId("fillOpacity").value;
        setColorValue("strokeColor", data.strokeColor || DefaultToolParams.strokeColor);
        byId("strokeWidth").value = clampNumber(data.strokeWidth, DefaultToolParams.strokeWidth, 0);
        byId("strokeWidthNumber").value = byId("strokeWidth").value;
        byId("strokeOpacity").value = clampNumber(data.strokeOpacity, DefaultToolParams.strokeOpacity, 0, 100);
        byId("strokeOpacityNumber").value = byId("strokeOpacity").value;

        activeValues.fillMode = data.fillMode || DefaultToolParams.fillMode;
        activeValues.strokeMode = data.strokeMode || DefaultToolParams.strokeMode;
        setSegmentedValue("fillMode", activeValues.fillMode, animateSegments);
        setSegmentedValue("strokeMode", activeValues.strokeMode, animateSegments);
        updateConditionalFields();
    }

    function saveToolParams() {
        saveStoredJson(StorageKeys.tool, collectParams());
    }

    function collectShapeStrokeFillParams() {
        return {
            strokeWidth: clampNumber(byId("sfStrokeWidthNumber").value, DefaultShapeStrokeFillParams.strokeWidth, 0),
            miterLimit: clampNumber(byId("sfMiterLimitNumber").value, DefaultShapeStrokeFillParams.miterLimit, 0),
            trimStart: clampNumber(byId("sfTrimStartNumber").value, DefaultShapeStrokeFillParams.trimStart, 0, 100),
            trimEnd: clampNumber(byId("sfTrimEndNumber").value, DefaultShapeStrokeFillParams.trimEnd, 0, 100),
            trimOffset: clampNumber(byId("sfTrimOffsetNumber").value, DefaultShapeStrokeFillParams.trimOffset, -360, 360),
            taperStartLength: clampNumber(byId("sfTaperStartLengthNumber").value, DefaultShapeStrokeFillParams.taperStartLength, 0),
            taperEndLength: clampNumber(byId("sfTaperEndLengthNumber").value, DefaultShapeStrokeFillParams.taperEndLength, 0),
            taperStartWidth: clampNumber(byId("sfTaperStartWidthNumber").value, DefaultShapeStrokeFillParams.taperStartWidth, 0),
            taperEndWidth: clampNumber(byId("sfTaperEndWidthNumber").value, DefaultShapeStrokeFillParams.taperEndWidth, 0),
            taperStartEase: clampNumber(byId("sfTaperStartEaseNumber").value, DefaultShapeStrokeFillParams.taperStartEase, 0, 100),
            taperEndEase: clampNumber(byId("sfTaperEndEaseNumber").value, DefaultShapeStrokeFillParams.taperEndEase, 0, 100),
            strokeColor: normalizeHex(byId("sfStrokeColor").value, DefaultShapeStrokeFillParams.strokeColor),
            fillColor: normalizeHex(byId("sfFillColor").value, DefaultShapeStrokeFillParams.fillColor)
        };
    }

    function setShapeStrokeFillParams(params) {
        var data = params || DefaultShapeStrokeFillParams;

        setLinkedRangeValue("sfStrokeWidth", data.strokeWidth, DefaultShapeStrokeFillParams.strokeWidth);
        setLinkedRangeValue("sfMiterLimit", data.miterLimit, DefaultShapeStrokeFillParams.miterLimit);
        setLinkedRangeValue("sfTrimStart", data.trimStart, DefaultShapeStrokeFillParams.trimStart);
        setLinkedRangeValue("sfTrimEnd", data.trimEnd, DefaultShapeStrokeFillParams.trimEnd);
        setLinkedRangeValue("sfTrimOffset", data.trimOffset, DefaultShapeStrokeFillParams.trimOffset);
        setLinkedRangeValue("sfTaperStartLength", data.taperStartLength, DefaultShapeStrokeFillParams.taperStartLength);
        setLinkedRangeValue("sfTaperEndLength", data.taperEndLength, DefaultShapeStrokeFillParams.taperEndLength);
        setLinkedRangeValue("sfTaperStartWidth", data.taperStartWidth, DefaultShapeStrokeFillParams.taperStartWidth);
        setLinkedRangeValue("sfTaperEndWidth", data.taperEndWidth, DefaultShapeStrokeFillParams.taperEndWidth);
        setLinkedRangeValue("sfTaperStartEase", data.taperStartEase, DefaultShapeStrokeFillParams.taperStartEase);
        setLinkedRangeValue("sfTaperEndEase", data.taperEndEase, DefaultShapeStrokeFillParams.taperEndEase);
        setColorValue("sfStrokeColor", data.strokeColor || DefaultShapeStrokeFillParams.strokeColor);
        setColorValue("sfFillColor", data.fillColor || DefaultShapeStrokeFillParams.fillColor);
    }

    function saveShapeStrokeFillParams() {
        saveStoredJson(StorageKeys.shapeAddStrokeFill, collectShapeStrokeFillParams());
    }

    function collectEcommerceParams() {
        return {
            componentKind: getActiveComponentKind(),
            gap: clampNumber(byId("ackFeatureGapNumber").value, DefaultEcommerceParams.gap, 0),
            paddingX: clampNumber(byId("ackFeaturePaddingXNumber").value, DefaultEcommerceParams.paddingX, 0),
            paddingY: clampNumber(byId("ackFeaturePaddingYNumber").value, DefaultEcommerceParams.paddingY, 0),
            cornerRadius: clampNumber(byId("ackFeatureRadiusNumber").value, DefaultEcommerceParams.cornerRadius, 0),
            pillWidthMode: byId("ackFeatureWidthMode").value,
            fixedWidth: clampNumber(byId("ackFeatureFixedWidthNumber").value, DefaultEcommerceParams.fixedWidth, 1),
            fillColor: byId("ackFeatureFillColor").value,
            gradientEnable: !!byId("ackFeatureGradient").checked,
            textAlign: byId("ackFeatureTextAlign").value,
            sortMode: byId("ackFeatureSort").value,
            columns: clampNumber(byId("ackIconColumnsNumber").value, DefaultEcommerceParams.columns, 1, 12),
            normalizeMode: byId("ackIconNormalizeMode").value,
            targetWidth: clampNumber(byId("ackIconTargetWidthNumber").value, DefaultEcommerceParams.targetWidth, 1),
            targetHeight: clampNumber(byId("ackIconTargetHeightNumber").value, DefaultEcommerceParams.targetHeight, 1),
            cellWidth: clampNumber(byId("ackIconCellWidthNumber").value, DefaultEcommerceParams.cellWidth, 1),
            cellHeight: clampNumber(byId("ackIconCellHeightNumber").value, DefaultEcommerceParams.cellHeight, 1),
            gapX: clampNumber(byId("ackIconGapXNumber").value, DefaultEcommerceParams.gapX, 0),
            gapY: clampNumber(byId("ackIconGapYNumber").value, DefaultEcommerceParams.gapY, 0),
            lastRowAlign: byId("ackIconLastRowAlign").value,
            gridSortMode: byId("ackIconSort").value
        };
    }

    function setEcommerceParams(params) {
        var data = params || DefaultEcommerceParams;
        setLinkedRangeValue("ackFeatureGap", data.gap, DefaultEcommerceParams.gap);
        setLinkedRangeValue("ackFeaturePaddingX", data.paddingX, DefaultEcommerceParams.paddingX);
        setLinkedRangeValue("ackFeaturePaddingY", data.paddingY, DefaultEcommerceParams.paddingY);
        setLinkedRangeValue("ackFeatureRadius", data.cornerRadius, DefaultEcommerceParams.cornerRadius);
        setLinkedRangeValue("ackFeatureFixedWidth", data.fixedWidth, DefaultEcommerceParams.fixedWidth);
        setLinkedRangeValue("ackIconColumns", data.columns, DefaultEcommerceParams.columns);
        setLinkedRangeValue("ackIconTargetWidth", data.targetWidth, DefaultEcommerceParams.targetWidth);
        setLinkedRangeValue("ackIconTargetHeight", data.targetHeight, DefaultEcommerceParams.targetHeight);
        setLinkedRangeValue("ackIconCellWidth", data.cellWidth, DefaultEcommerceParams.cellWidth);
        setLinkedRangeValue("ackIconCellHeight", data.cellHeight, DefaultEcommerceParams.cellHeight);
        setLinkedRangeValue("ackIconGapX", data.gapX, DefaultEcommerceParams.gapX);
        setLinkedRangeValue("ackIconGapY", data.gapY, DefaultEcommerceParams.gapY);
        byId("ackFeatureWidthMode").value = data.pillWidthMode || DefaultEcommerceParams.pillWidthMode;
        byId("ackFeatureTextAlign").value = data.textAlign || DefaultEcommerceParams.textAlign;
        byId("ackFeatureSort").value = data.sortMode || DefaultEcommerceParams.sortMode;
        byId("ackIconNormalizeMode").value = data.normalizeMode || DefaultEcommerceParams.normalizeMode;
        byId("ackIconLastRowAlign").value = data.lastRowAlign || data.gridAlign || DefaultEcommerceParams.lastRowAlign;
        byId("ackIconSort").value = data.gridSortMode || DefaultEcommerceParams.gridSortMode;
        byId("ackFeatureGradient").checked = !!data.gradientEnable;
        setColorValue("ackFeatureFillColor", data.fillColor || DefaultEcommerceParams.fillColor);
        setActiveComponentKind(data.componentKind || DefaultEcommerceParams.componentKind, false);
        syncAllCustomSelects();
    }

    function saveEcommerceParams() {
        saveStoredJson(StorageKeys.ecommerce, collectEcommerceParams());
    }

    function getActiveComponentKind() {
        var active = document.querySelector(".component-type-card.is-active");
        return active ? active.getAttribute("data-component-kind") : DefaultEcommerceParams.componentKind;
    }

    function updateComponentActionButtons(kind) {
        var selectedKind = kind === "iconGrid" ? "iconGrid" : "featureStack";
        var buttons = document.querySelectorAll(".component-action-button[data-component-action]");
        var i;
        for (i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-component-action") === selectedKind);
        }
    }

    function setActiveComponentKind(kind, announce) {
        var selectedKind = kind === "iconGrid" ? "iconGrid" : "featureStack";
        var cards = document.querySelectorAll(".component-type-card[data-component-kind]");
        var builders = document.querySelectorAll(".component-builder[data-component-builder]");
        var i;

        for (i = 0; i < cards.length; i++) {
            cards[i].classList.toggle("is-active", cards[i].getAttribute("data-component-kind") === selectedKind);
            cards[i].setAttribute("aria-selected", cards[i].getAttribute("data-component-kind") === selectedKind ? "true" : "false");
        }
        for (i = 0; i < builders.length; i++) {
            builders[i].classList.toggle("is-active", builders[i].getAttribute("data-component-builder") === selectedKind);
        }
        updateComponentActionButtons(selectedKind);
        saveEcommerceParams();
        if (announce !== false) {
            if (selectedKind === "iconGrid") {
                setComponentKitStatus("Icon Grid selected. Choose any 2D layers in AE.");
            } else {
                setComponentKitStatus("Feature Stack selected. Choose one or more text layers in AE.");
            }
        }
    }

    function setComponentKitStatus(message, isError) {
        var card = byId("componentKitStatus");
        if (!card) {
            return;
        }
        card.textContent = message || tr("status.readyPeriod");
        card.classList.toggle("is-error", !!isError);
    }

    function createFeatureStack() {
        var json = JSON.stringify(collectEcommerceParams());
        saveEcommerceParams();
        setStatus(tr("status.creatingFeatureStack"), "busy", true);
        evalHost("AEToolbox.tools.adComponentKit.createFeatureStack('" + jsxQuote(json) + "')", function (raw) {
            var result = parseResult(raw);
            var message = actionMessage(result, "status.createdFeatureStack");
            setStatus(message, result.ok ? "ok" : "error");
            setComponentKitStatus(message, !result.ok);
        });
    }

    function createIconGrid() {
        var json = JSON.stringify(collectEcommerceParams());
        var script = "AEToolbox.tools.adComponentKit.createIconGrid('" + jsxQuote(json) + "')";
        saveEcommerceParams();
        setStatus(tr("status.creatingIconGrid"), "busy", true);
        if (window.console && console.log) {
            console.log("[AE Toolbox] Create Icon Grid evalScript:", script);
            console.log("[AE Toolbox] Create Icon Grid params:", json);
        }
        evalHost(script, function (raw) {
            var result = parseResult(raw);
            var version = result.version ? " [" + result.version + "]" : " [NO ICON GRID VERSION]";
            var message = actionMessage(result, "status.createdIconGrid") + version;
            if (window.console && console.log) {
                console.log("[AE Toolbox] Create Icon Grid raw result:", raw);
                console.log("[AE Toolbox] Create Icon Grid parsed result:", result);
            }
            setStatus(message, result.ok ? "ok" : "error");
            setComponentKitStatus(message, !result.ok);
        });
    }

    function refreshSelectedComponent() {
        var json = JSON.stringify(collectEcommerceParams());
        saveEcommerceParams();
        setStatus(tr("status.refreshingComponent"), "busy", true);
        evalHost("AEToolbox.tools.adComponentKit.refreshSelectedComponent('" + jsxQuote(json) + "')", function (raw) {
            var result = parseResult(raw);
            var message = actionMessage(result, "status.componentRefreshed");
            setStatus(message, result.ok ? "ok" : "error");
            setComponentKitStatus(message, !result.ok);
        });
    }

    function selectComponentLayers() {
        setStatus(tr("status.selectingComponentLayers"), "busy", true);
        evalHost("AEToolbox.tools.adComponentKit.selectComponentLayers()", function (raw) {
            var result = parseResult(raw);
            var message = actionMessage(result, "status.componentLayersSelected");
            setStatus(message, result.ok ? "ok" : "error");
            setComponentKitStatus(message, !result.ok);
        });
    }

    function detachSelectedComponent() {
        setStatus(tr("status.detachingComponent"), "busy", true);
        evalHost("AEToolbox.tools.adComponentKit.detachSelectedComponent()", function (raw) {
            var result = parseResult(raw);
            var message = actionMessage(result, "status.componentDetached");
            setStatus(message, result.ok ? "ok" : "error");
            setComponentKitStatus(message, !result.ok);
        });
    }

    function createBackgroundBox() {
        var params = collectParams();
        var json = JSON.stringify(params);
        setStatus(tr("status.creatingBackgroundBox"), "busy", true);
        evalHost("AEToolbox.tools.textBackgroundBox.create('" + jsxQuote(json) + "')", function (raw) {
            var result = parseResult(raw);
            setStatus(actionMessage(result, "status.createdBackgroundBoxes"), result.ok ? "ok" : "error");
            if (result.selectionLabel) {
                byId("selectionPill").textContent = result.selectionLabel;
            }
        });
    }

    function refreshSelection() {
        if (!hostLoaded) {
            return;
        }
        evalHost("AEToolbox.getSelectionSummary()", function (raw) {
            var result = parseResult(raw);
            if (result.selectionLabel) {
                byId("selectionPill").textContent = result.selectionLabel;
            }
            if (result.ok && byId("autoStatus").checked) {
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

    function renderSelectionInfo(result) {
        var box = byId("selectionInfoResult");
        var html = "";
        var layers;
        var i;
        var layer;

        if (!box) {
            return;
        }

        if (!result.ok) {
            box.innerHTML = '<p class="empty-result">' + escapeHtml(resultMessage(result, "status.unableReadSelection")) + "</p>";
            return;
        }

        layers = result.layers || [];
        if (!layers.length) {
            box.innerHTML = '<p class="empty-result">' + escapeHtml(tr("status.noSelectedLayers")) + "</p>";
            return;
        }

        for (i = 0; i < layers.length; i++) {
            layer = layers[i];
            html += '<div class="selection-layer-row">' +
                '<span class="selection-layer-main">' +
                '<span class="selection-layer-name">' + escapeHtml(layer.name || "Layer") + "</span>" +
                '<span class="selection-layer-meta">' + escapeHtml(layer.type || "Layer") + "</span>" +
                "</span>" +
                '<span class="selection-layer-index">#' + escapeHtml(layer.index) + "</span>" +
                "</div>";
        }
        box.innerHTML = html;
    }

    function refreshSelectionInfo() {
        if (!hostLoaded) {
            setStatus(tr("status.hostLoading"), "busy", true);
            return;
        }

        setStatus(tr("status.readingSelection"), "busy", true);
        evalHost("AEToolbox.tools.selectionInfo.get()", function (raw) {
            var result = parseResult(raw);
            renderSelectionInfo(result);
            if (result.ok) {
                byId("selectionPill").textContent = tr("selection.layerCount", { count: result.count });
            }
            setStatus(resultMessage(result, "status.selectionUpdated"), result.ok ? "ok" : "error");
        });
    }

    function setColorValue(inputId, hex) {
        var input = byId(inputId);
        var shell = input.parentNode;
        var normalized = normalizeHex(hex, "#ffffff");

        input.value = normalized;
        if (shell) {
            shell.style.backgroundColor = normalized;
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
    }

    function pickColorWithAE(inputId) {
        var input = byId(inputId);
        var current = input.value;

        if (!hostLoaded) {
            setStatus(tr("status.hostLoading"), "busy", true);
            return;
        }

        setStatus(tr("status.colorPickerOpening"), "busy", true);
        evalHost("AEToolbox.pickColor('" + jsxQuote(current) + "')", function (raw) {
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
                } else if (inputId === "sfStrokeColor" || inputId === "sfFillColor") {
                    saveShapeStrokeFillParams();
                } else {
                    saveToolParams();
                }
                setStatus(resultMessage(result, "status.colorUpdated"));
                return;
            }
            setStatus(resultMessage(result, "status.colorUnchanged"), result.ok ? "ok" : "error");
        });
    }

    function resetDefaults() {
        setToolParams(DefaultToolParams, true);
        saveToolParams();
        setStatus(tr("status.defaultsRestored"));
    }

    function setSegmentedValue(name, value, animate) {
        var group = document.querySelector('.segmented[data-name="' + name + '"]');
        var buttons = group.querySelectorAll("button");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-value") === value);
        }
        updateSegmentedThumb(group, animate !== false);
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

        for (i = 0; i < select.options.length; i++) {
            option = select.options[i];
            optionButton = document.createElement("button");
            optionButton.type = "button";
            optionButton.className = "select-option";
            optionButton.setAttribute("role", "option");
            optionButton.setAttribute("data-value", option.value);
            if (option.getAttribute("data-i18n")) {
                optionButton.setAttribute("data-option-i18n", option.getAttribute("data-i18n"));
            }
            optionButton.textContent = getSelectOptionLabel(option);
            optionButton.addEventListener("click", function () {
                setNativeSelectValue(select, this.getAttribute("data-value"), true);
                closeCustomSelectMenus();
            });
            menu.appendChild(optionButton);
        }

        document.body.appendChild(menu);
        select.parentNode.insertBefore(control, select.nextSibling);

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
        var i;
        for (i = 0; i < selects.length; i++) {
            createCustomSelect(selects[i], i);
        }
        document.addEventListener("click", function (event) {
            if (!hasAncestorWithClass(event.target, "custom-select", document) && !hasAncestorWithClass(event.target, "select-menu", document)) {
                closeCustomSelectMenus();
            }
        });
        window.addEventListener("resize", function () {
            closeCustomSelectMenus();
        });
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

    function setupShapeAddCollapsibles() {
        setupStoredCollapsible("shapeAddItemsCard", "shapeAddItemsToggle", StorageKeys.shapeAddItemsCollapsed, false);
        setupStoredCollapsible("strokeFillSettingsCard", "strokeFillSettingsToggle", StorageKeys.shapeAddStrokeFillSettingsCollapsed, true);
    }

    function collectSettings() {
        return {
            motionSpeed: clampNumber(byId("motionSpeedNumber").value, DefaultSettings.motionSpeed, 0.75, 1.35),
            uiScale: clampNumber(byId("uiScaleNumber").value, DefaultSettings.uiScale, 0.62, 1.18),
            themeAccent: normalizeHex(byId("themeAccent").value, DefaultSettings.themeAccent),
            homeBackground: normalizeHex(byId("homeBackground").value, DefaultSettings.homeBackground),
            toolIconColor: normalizeHex(byId("toolIconColor").value, DefaultSettings.toolIconColor),
            toolIconLine: normalizeHex(byId("toolIconLine").value, DefaultSettings.toolIconLine),
            autoStatus: !!byId("autoStatus").checked
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
        byId("autoStatus").checked = data.autoStatus !== false;
        applyThemeAccent(data.themeAccent || DefaultSettings.themeAccent);
        applyHomeBackground(data.homeBackground || DefaultSettings.homeBackground);
        applyToolIconTheme(data.toolIconColor || DefaultSettings.toolIconColor, data.toolIconLine || DefaultSettings.toolIconLine);
    }

    function loadPersistentState() {
        applySettings(loadStoredJson(StorageKeys.settings, DefaultSettings));
        setToolParams(loadStoredJson(StorageKeys.tool, DefaultToolParams), false);
        setEcommerceParams(loadStoredJson(StorageKeys.ecommerce, DefaultEcommerceParams));
        setShapeStrokeFillParams(loadStoredJson(StorageKeys.shapeAddStrokeFill, DefaultShapeStrokeFillParams));
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
        var componentTypeCards;
        var componentSelects;
        var componentRangeIds;
        var strokeFillRangeIds;
        var i;

        linkPersistedRange("paddingX", "paddingXNumber", 0, null, saveToolParams);
        linkPersistedRange("paddingY", "paddingYNumber", 0, null, saveToolParams);
        linkPersistedRange("roundness", "roundnessNumber", 0, null, saveToolParams);
        linkPersistedRange("fillOpacity", "fillOpacityNumber", 0, 100, saveToolParams);
        linkPersistedRange("strokeWidth", "strokeWidthNumber", 0, null, saveToolParams);
        linkPersistedRange("strokeOpacity", "strokeOpacityNumber", 0, 100, saveToolParams);
        componentRangeIds = [
            ["ackFeatureGap", 0, null],
            ["ackFeaturePaddingX", 0, null],
            ["ackFeaturePaddingY", 0, null],
            ["ackFeatureRadius", 0, null],
            ["ackFeatureFixedWidth", 1, null],
            ["ackIconColumns", 1, 12],
            ["ackIconTargetWidth", 1, null],
            ["ackIconTargetHeight", 1, null],
            ["ackIconCellWidth", 1, null],
            ["ackIconCellHeight", 1, null],
            ["ackIconGapX", 0, null],
            ["ackIconGapY", 0, null]
        ];
        for (i = 0; i < componentRangeIds.length; i++) {
            linkPersistedRange(componentRangeIds[i][0], componentRangeIds[i][0] + "Number", componentRangeIds[i][1], componentRangeIds[i][2], saveEcommerceParams);
        }
        strokeFillRangeIds = [
            ["sfStrokeWidth", 0, null],
            ["sfMiterLimit", 0, null],
            ["sfTrimStart", 0, 100],
            ["sfTrimEnd", 0, 100],
            ["sfTrimOffset", -360, 360],
            ["sfTaperStartLength", 0, null],
            ["sfTaperEndLength", 0, null],
            ["sfTaperStartWidth", 0, null],
            ["sfTaperEndWidth", 0, null],
            ["sfTaperStartEase", 0, 100],
            ["sfTaperEndEase", 0, 100]
        ];
        for (i = 0; i < strokeFillRangeIds.length; i++) {
            linkPersistedRange(strokeFillRangeIds[i][0], strokeFillRangeIds[i][0] + "Number", strokeFillRangeIds[i][1], strokeFillRangeIds[i][2], saveShapeStrokeFillParams);
        }

        setupSegmentedControls();
        renderShapeAddButtons();
        setupColorControls();
        setupMotionSpeed();
        setupUiScale();
        loadPersistentState();
        setupLanguageSelector();
        setupCollapsibleSettings();
        setupShapeAddCollapsibles();
        BackgroundEngine.init();
        setupCustomSelectInputs();
        HomeLayoutManager.init();
        configureToolDetail(activeToolId);
        updateConditionalFields();
        refreshLanguage();

        byId("backBtn").addEventListener("click", function () {
            closeToolWithLaunchTransition();
        });
        byId("createBtn").addEventListener("click", createBackgroundBox);
        byId("resetBtn").addEventListener("click", resetDefaults);
        byId("refreshSelectionInfoBtn").addEventListener("click", refreshSelectionInfo);
        byId("createStrokeFillLayerBtn").addEventListener("click", createStrokeFillLayer);
        byId("createFeatureStackBtn").addEventListener("click", createFeatureStack);
        byId("createIconGridBtn").addEventListener("click", createIconGrid);
        byId("refreshComponentBtn").addEventListener("click", refreshSelectedComponent);
        byId("selectComponentLayersBtn").addEventListener("click", selectComponentLayers);
        byId("detachComponentBtn").addEventListener("click", detachSelectedComponent);

        componentTypeCards = document.querySelectorAll(".component-type-card[data-component-kind]");
        for (i = 0; i < componentTypeCards.length; i++) {
            componentTypeCards[i].addEventListener("click", function () {
                setActiveComponentKind(this.getAttribute("data-component-kind"), true);
            });
        }

        componentSelects = document.querySelectorAll(".tool-panel[data-tool-panel='ecommerceLayout'] select");
        for (i = 0; i < componentSelects.length; i++) {
            componentSelects[i].addEventListener("change", saveEcommerceParams);
        }
        byId("ackFeatureGradient").addEventListener("change", saveEcommerceParams);

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
        byId("autoStatus").addEventListener("change", saveSettings);
        document.addEventListener("keydown", function (event) {
            if (event.keyCode === 27) {
                closeSettingsPanel();
            }
        });
        window.addEventListener("focus", function () {
            refreshActiveTool();
        });

        window.setInterval(function () {
            if (byId("autoStatus").checked) {
                refreshActiveTool();
            }
        }, 2200);
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


