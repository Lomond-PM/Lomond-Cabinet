/*
 * Palette Workspace controller.
 * Owns the Settings Palette Library UI runtime while keeping Store and pure editor helpers separate.
 */
(function (root, factory) {
    "use strict";

    var api = factory(root);
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralPaletteWorkspace = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
    "use strict";

    var PaletteLibraryWidthStorageKey = "lomond.paletteEditor.libraryWidth.v1";
    var PaletteEditorPreviewId = "__palette_editor_preview__";
    var selectedPaletteId = "";
    var editorState = null;
    var pendingTransition = null;
    var previewRafs = [];
    var workspaceOpen = false;
    var resizeObserver = null;
    var resizeFrame = 0;
    var resizeFallback = null;
    var splitterCleanup = null;
    var transitionTimer = null;
    var transitionToken = 0;
    var settingsScrollTop = 0;
    var deleteConfirmationId = "";
    var initialized = false;
    var storeListener = null;
    var options = {};

    function noop() {
    }

    function getDocument() {
        return options.document || (root && root.document) || null;
    }

    function getWindow() {
        return options.window || root || {};
    }

    function getStore() {
        return options.PaletteStore || (root && root.ProceduralPaletteStore) || null;
    }

    function getEditorHelper() {
        return options.ProceduralPaletteEditor || (root && root.ProceduralPaletteEditor) || null;
    }

    function getAppearance() {
        return options.ProceduralAppearance || (root && root.ProceduralAppearance) || null;
    }

    function tr(key, params) {
        return options.translate ? options.translate(key, params) : key;
    }

    function byId(id) {
        var doc = getDocument();
        return doc && doc.getElementById ? doc.getElementById(id) : null;
    }

    function query(selector) {
        var doc = getDocument();
        return doc && doc.querySelector ? doc.querySelector(selector) : null;
    }

    function queryAll(selector) {
        var doc = getDocument();
        return doc && doc.querySelectorAll ? doc.querySelectorAll(selector) : [];
    }

    function createElement(tag) {
        var doc = getDocument();
        return doc ? doc.createElement(tag) : null;
    }

    function isPanelShuttingDown() {
        return !!(options.panelShutdownPredicate && options.panelShutdownPredicate());
    }

    function paletteDisplayName(palette) {
        return palette && (palette.displayName || palette.id) ? (palette.displayName || palette.id) : "";
    }

    function setStatus(message, type) {
        if (options.setStatus) {
            options.setStatus(message, type);
        }
    }

    function refreshPaletteDrivenHomeIcons() {
        var appearance = getAppearance();
        if (appearance && typeof appearance.clearCache === "function") {
            appearance.clearCache();
        }
        if (options.invalidateHomeIcons) {
            options.invalidateHomeIcons();
        }
        if (options.refreshHomeIcons) {
            options.refreshHomeIcons();
        }
    }

    function readStorageValue(key) {
        return options.readStorageValue ? options.readStorageValue(key) : null;
    }

    function writeStorageValue(key, value) {
        if (options.writeStorageValue) {
            options.writeStorageValue(key, value);
        }
    }

    function getPaletteLibraryWidth() {
        var helper = getEditorHelper();
        var raw = readStorageValue(PaletteLibraryWidthStorageKey);
        return helper && helper.parseLibraryWidth ? helper.parseLibraryWidth(raw) : 210;
    }

    function savePaletteLibraryWidth(value) {
        writeStorageValue(PaletteLibraryWidthStorageKey, String(value));
    }

    function closeCustomSelectMenus() {
        if (options.closeCustomSelectMenus) {
            options.closeCustomSelectMenus();
        }
    }

    function setupCustomSelectInputs() {
        if (options.setupCustomSelectInputs) {
            options.setupCustomSelectInputs();
        }
    }

    function removePaletteCustomSelectMenus() {
        var menus = queryAll(".select-menu[data-select-menu-for^='paletteToolMap_']");
        var i;
        for (i = 0; i < menus.length; i++) {
            if (menus[i].parentNode) {
                menus[i].parentNode.removeChild(menus[i]);
            }
        }
    }

    function clearPreviewRafs() {
        var win = getWindow();
        var i;
        for (i = 0; i < previewRafs.length; i++) {
            if (win.cancelAnimationFrame) {
                win.cancelAnimationFrame(previewRafs[i]);
            }
        }
        previewRafs.length = 0;
    }

    function clearTransientPreview() {
        var store = getStore();
        if (store && typeof store.clearTransientPalette === "function") {
            store.clearTransientPalette(PaletteEditorPreviewId);
        }
    }

    function clearWorkspaceBindings() {
        var win = getWindow();
        if (resizeFrame && win.cancelAnimationFrame) {
            win.cancelAnimationFrame(resizeFrame);
            resizeFrame = 0;
        }
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        if (resizeFallback && win.removeEventListener) {
            win.removeEventListener("resize", resizeFallback);
            resizeFallback = null;
        }
        if (splitterCleanup) {
            splitterCleanup();
            splitterCleanup = null;
        }
    }

    function initializeEditorState(store, paletteId) {
        var helper = getEditorHelper();
        var palettes = store && store.listResolvedPalettes ? store.listResolvedPalettes(true) : [];
        var nextSelectedId = paletteId || selectedPaletteId || (palettes[0] ? palettes[0].id : "");
        var palette = store && store.getResolvedPalette ? store.getResolvedPalette(nextSelectedId) : null;
        if (!palette || !helper || !helper.createEditorState) {
            return;
        }
        selectedPaletteId = palette.id;
        editorState = helper.createEditorState(palette);
        editorState.selectedPaletteId = palette.id;
        clearTransientPreview();
    }

    function paletteEditorDraftIsValid() {
        var store = getStore();
        var helper = getEditorHelper();
        var draft = editorState && editorState.draft ? editorState.draft : null;
        var candidate;
        var result;
        if (!store || !draft || typeof store.validatePalette !== "function") {
            return false;
        }
        if (helper && helper.hasPositiveWeightTotal && !helper.hasPositiveWeightTotal(draft.weights)) {
            return false;
        }
        candidate = Object.assign({}, draft, { id: draft.id || "paletteEditorDraft" });
        result = store.validatePalette(candidate);
        return !!(result && result.ok);
    }

    function syncDirtyUi() {
        var workspace = query(".palette-workspace");
        var status = query(".palette-editor-draft-status");
        var saveButton = query(".palette-editor-save");
        var dirty = !!(editorState && editorState.dirty);
        var valid = paletteEditorDraftIsValid();
        if (workspace) {
            workspace.classList.toggle("has-unsaved-palette-draft", dirty);
        }
        if (status) {
            status.textContent = dirty ? tr("paletteLibrary.unsavedChanges") : tr("paletteLibrary.saved");
            status.classList.toggle("is-dirty", dirty);
        }
        if (saveButton) {
            saveButton.disabled = !dirty || !valid || !!editorState.saving;
        }
    }

    function renderPalettePreviewCanvas(canvas, target, paletteId) {
        var appearance = getAppearance();
        var rect;
        var shell = canvas ? canvas.parentNode : null;
        if (!canvas || !appearance || typeof appearance.render !== "function") {
            return;
        }
        rect = shell && shell.getBoundingClientRect ? shell.getBoundingClientRect() : null;
        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return;
        }
        try {
            appearance.render(canvas, {
                target: target,
                seed: target === "background" ? "palette-editor-background" : "palette-editor-icon",
                params: { paletteId: paletteId },
                logicalWidth: Math.max(1, Math.round(rect.width)),
                logicalHeight: Math.max(1, Math.round(rect.height))
            });
            if (shell && shell.classList) {
                shell.classList.add("is-rendered");
            }
        } catch (error) {
            if (shell && shell.classList) {
                shell.classList.remove("is-rendered");
            }
        }
    }

    function schedulePreview() {
        var win = getWindow();
        var previewId = PaletteEditorPreviewId;
        if (isPanelShuttingDown() || !workspaceOpen || !win.requestAnimationFrame) {
            return;
        }
        clearPreviewRafs();
        previewRafs.push(win.requestAnimationFrame(function () {
            previewRafs.push(win.requestAnimationFrame(function () {
                var canvases;
                var i;
                if (isPanelShuttingDown() || !workspaceOpen) {
                    return;
                }
                canvases = queryAll(".palette-preview-canvas");
                for (i = 0; i < canvases.length; i++) {
                    renderPalettePreviewCanvas(canvases[i], canvases[i].getAttribute("data-palette-preview-target"), previewId);
                }
            }));
        }));
    }

    function updateEditorDraft(patch) {
        var helper = getEditorHelper();
        var store = getStore();
        var validation;
        if (!editorState || !helper || !helper.updateEditorDraft) {
            return;
        }
        editorState = helper.updateEditorDraft(editorState, patch);
        if (helper.hasPositiveWeightTotal && !helper.hasPositiveWeightTotal(editorState.draft.weights)) {
            clearTransientPreview();
            syncDirtyUi();
            return;
        }
        if (store && typeof store.setTransientPalette === "function") {
            validation = store.setTransientPalette(PaletteEditorPreviewId, Object.assign({}, editorState.draft, { id: PaletteEditorPreviewId }));
            if (!validation.ok) {
                clearTransientPreview();
                syncDirtyUi();
                return;
            }
        }
        syncDirtyUi();
        schedulePreview();
    }

    function createPaletteColorControl(role, value) {
        var controls = createElement("span");
        var shell = createElement("button");
        var input = createElement("input");
        var hexInput = createElement("input");
        var inputId = "paletteEditor" + role.charAt(0).toUpperCase() + role.slice(1);
        var normalizeHex = options.normalizeHex || function (color, fallback) { return color || fallback; };
        var normalized = normalizeHex(value, "#000000");
        if (!controls || !shell || !input || !hexInput) {
            return null;
        }
        controls.className = "control-inputs settings-field-control registry-color-control settings-color-control palette-editor-color-control";
        shell.className = "registry-color-swatch settings-color-pill small-color-shell";
        shell.type = "button";
        shell.style.backgroundColor = normalized;
        shell.setAttribute("data-color-target", inputId);
        input.id = inputId;
        input.className = "native-color-input";
        input.type = "hidden";
        input.value = normalized;
        hexInput.id = inputId + "Hex";
        hexInput.className = "registry-color-hex settings-color-hex";
        hexInput.type = "text";
        hexInput.value = normalized;
        hexInput.setAttribute("spellcheck", "false");
        if (options.bindHexInputSelectBehavior) {
            options.bindHexInputSelectBehavior(hexInput);
        }

        function apply(valueToApply) {
            var color = normalizeHex(valueToApply, input.value || normalized).toUpperCase();
            var patch;
            if (!/^#[0-9A-F]{6}$/.test(color)) {
                return;
            }
            input.value = color;
            hexInput.value = color;
            shell.style.backgroundColor = color;
            patch = { colors: {} };
            patch.colors[role] = color;
            updateEditorDraft(patch);
        }

        hexInput._registryOnValueChange = function () {
            apply(hexInput.value);
        };
        hexInput.addEventListener("input", function () {
            if (/^#?[0-9a-fA-F]{6}$/.test(this.value)) {
                apply(this.value);
            }
        });
        hexInput.addEventListener("change", function () {
            apply(this.value);
        });
        shell.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (options.openRegistryColorPicker) {
                options.openRegistryColorPicker(hexInput, shell, normalizeHex(hexInput.value, normalized));
            }
        });
        shell.appendChild(input);
        controls.appendChild(shell);
        controls.appendChild(hexInput);
        return controls;
    }

    function createPaletteTextInput(value, onChange) {
        var input = createElement("input");
        input.className = "registry-text-input palette-editor-text";
        input.type = "text";
        input.value = value || "";
        input.addEventListener("input", function () {
            onChange(this.value);
        });
        return input;
    }

    function createPaletteNumberInput(value, field, onChange, inputOptions) {
        var input = createElement("input");
        inputOptions = inputOptions || {};
        input.className = "num-input registry-range-number settings-number palette-editor-number";
        input.type = "text";
        input.inputMode = "decimal";
        if (options.applySchemaNumberAttributes) {
            options.applySchemaNumberAttributes(input, field);
        }
        input.value = String(value);
        input.addEventListener("input", function () {
            var isDraft = options.isSchemaNumberDraftValue ? options.isSchemaNumberDraftValue(this.value) : false;
            if (!isDraft && !isNaN(Number(this.value))) {
                onChange(this.value, this, "input");
            }
        });
        if (options.setupRegistryNumberDrag) {
            options.setupRegistryNumberDrag(input, field, function (nextValue) {
                onChange(nextValue, input, "update");
            }, {
                onCommit: function (nextValue) {
                    onChange(nextValue, input, "commit");
                },
                onCancel: function (nextValue) {
                    onChange(nextValue, input, "cancel");
                }
            });
        }
        if (inputOptions.disabled) {
            input.disabled = true;
            input.classList.remove("is-drag-ready");
        }
        return input;
    }

    function renderPaletteEditorField(labelKey, control) {
        var row = createElement("div");
        var label = createElement("strong");
        row.className = "settings-field palette-editor-field";
        label.className = "control-label registry-text-body settings-field-label";
        label.setAttribute("data-i18n", labelKey);
        label.textContent = tr(labelKey);
        row.appendChild(label);
        row.appendChild(control);
        return row;
    }

    function createPalettePreviewBlock() {
        var block = createElement("div");
        var iconShell = createElement("div");
        var backgroundShell = createElement("div");
        var iconCanvas = createElement("canvas");
        var backgroundCanvas = createElement("canvas");
        block.className = "palette-preview-block";
        iconShell.className = "palette-preview-shell palette-preview-shell--icon";
        backgroundShell.className = "palette-preview-shell palette-preview-shell--background";
        iconCanvas.className = "palette-preview-canvas palette-preview-canvas--icon";
        backgroundCanvas.className = "palette-preview-canvas palette-preview-canvas--background";
        iconCanvas.setAttribute("data-palette-preview-target", "icon");
        backgroundCanvas.setAttribute("data-palette-preview-target", "background");
        iconShell.appendChild(iconCanvas);
        backgroundShell.appendChild(backgroundCanvas);
        block.appendChild(iconShell);
        block.appendChild(backgroundShell);
        return block;
    }

    function getPaletteToolRows() {
        return [
            { toolId: "shapeAdd", titleKey: "paletteLibrary.tool.shapeAdd" },
            { toolId: "textBackgroundBox", titleKey: "paletteLibrary.tool.textBackgroundBox" },
            { toolId: "selectionInfo", titleKey: "paletteLibrary.tool.selectionInfo" },
            { toolId: "ecommerceLayout", titleKey: "paletteLibrary.tool.ecommerceLayout" },
            { toolId: "proceduralAppearanceLab", titleKey: "paletteLibrary.tool.proceduralAppearanceLab" },
            { toolId: "registryControlLab", titleKey: "paletteLibrary.tool.registryControlLab" },
            { toolId: "settingsRendererLab", titleKey: "paletteLibrary.tool.settingsRendererLab" }
        ];
    }

    function animationDuration(name) {
        var win = getWindow();
        var view = byId("settingsView");
        if (view && view.classList.contains("no-transition")) {
            return 0;
        }
        try {
            if (win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                return 0;
            }
        } catch (error) {
        }
        return options.duration ? options.duration(name) : 0;
    }

    function clearTransition() {
        var win = getWindow();
        var view = byId("settingsView");
        transitionToken += 1;
        if (transitionTimer && win.clearTimeout) {
            win.clearTimeout(transitionTimer);
            transitionTimer = null;
        }
        if (view) {
            view.classList.remove(
                "is-palette-workspace-transitioning",
                "is-palette-workspace-entering",
                "is-palette-workspace-leaving",
                "is-palette-settings-reveal",
                "is-palette-content-visible"
            );
        }
    }

    function discardTransientEditorState() {
        var store = getStore();
        var restoreId = editorState && (editorState.editorMode === "new" || editorState.editorMode === "duplicate")
            ? editorState.previousSelectedPaletteId
            : selectedPaletteId;
        pendingTransition = null;
        deleteConfirmationId = "";
        editorState = null;
        if (store && restoreId && store.getResolvedPalette && store.getResolvedPalette(restoreId)) {
            selectedPaletteId = restoreId;
        }
        clearTransientPreview();
    }

    function resetWorkspaceDomState(resetOptions) {
        var doc = getDocument();
        var view = byId("settingsView");
        var mount = byId("settingsPaletteLibraryMount");
        var content = query(".settings-content");
        var workspace = query(".palette-workspace");
        var paletteSection = query(".palette-workspace-section");
        var settingsRenderer = query(".settings-renderer");
        resetOptions = resetOptions || {};

        workspaceOpen = false;
        clearTransition();
        clearWorkspaceBindings();
        clearPreviewRafs();
        removePaletteCustomSelectMenus();
        if (resetOptions.discardDraft !== false) {
            discardTransientEditorState();
        } else {
            pendingTransition = null;
            deleteConfirmationId = "";
            clearTransientPreview();
        }

        if (view) {
            view.classList.remove(
                "is-palette-workspace",
                "is-palette-workspace-transitioning",
                "is-palette-workspace-entering",
                "is-palette-workspace-leaving",
                "is-palette-settings-reveal",
                "is-palette-content-visible",
                "is-resizing-palette-layout"
            );
            view.removeAttribute("data-palette-transition");
        }
        if (doc && doc.body && doc.body.classList) {
            doc.body.classList.remove("is-resizing-palette-layout");
        }
        if (workspace) {
            workspace.classList.remove("is-stacked", "has-unsaved-palette-draft");
            workspace.style.removeProperty("--palette-library-width");
            workspace.style.removeProperty("pointer-events");
            workspace.style.removeProperty("opacity");
            workspace.style.removeProperty("transform");
            workspace.setAttribute("aria-hidden", "true");
        }
        if (paletteSection) {
            paletteSection.classList.remove("is-exiting");
            paletteSection.removeAttribute("inert");
            paletteSection.setAttribute("aria-hidden", "true");
        }
        if (settingsRenderer) {
            settingsRenderer.removeAttribute("inert");
            settingsRenderer.setAttribute("aria-hidden", "false");
        }
        if (content) {
            content.scrollTop = resetOptions.restoreSettingsScroll ? settingsScrollTop : 0;
        }
        if (mount && resetOptions.renderLauncher !== false) {
            renderLauncher(mount);
        }
    }

    function openWorkspace() {
        var win = getWindow();
        var view = byId("settingsView");
        var content = query(".settings-content");
        var token;
        var morphDelay;
        if (!view) {
            workspaceOpen = true;
            return;
        }
        if (workspaceOpen && view.classList.contains("is-palette-workspace") && !view.classList.contains("is-palette-workspace-leaving")) {
            return;
        }
        if (content) {
            settingsScrollTop = content.scrollTop;
        }
        resetWorkspaceDomState({ discardDraft: false, renderLauncher: false });
        workspaceOpen = true;
        token = transitionToken;
        view.classList.add("is-palette-workspace-transitioning");
        view.setAttribute("data-palette-transition", String(token));
        if (content) {
            content.scrollTop = 0;
        }
        view.classList.add("is-palette-workspace", "is-palette-workspace-entering");
        refresh();
        if (options.nextFrame) {
            options.nextFrame(function () {
                if (token !== transitionToken) {
                    return;
                }
                view.classList.add("is-palette-content-visible");
                schedulePreview();
            });
        }
        morphDelay = animationDuration("normal");
        transitionTimer = win.setTimeout(function () {
            if (token !== transitionToken) {
                return;
            }
            transitionTimer = null;
            view.classList.remove("is-palette-workspace-transitioning", "is-palette-workspace-entering", "is-palette-content-visible");
            view.removeAttribute("data-palette-transition");
        }, morphDelay);
    }

    function closeWorkspace(closeOptions) {
        var win = getWindow();
        var view = byId("settingsView");
        var workspace;
        var token;
        var exitDelay;
        var morphDelay;
        var reason;
        var animate;
        closeOptions = closeOptions || {};
        reason = closeOptions.reason || (closeOptions.immediate ? "settings-close" : "back");
        animate = closeOptions.animate !== false && !closeOptions.immediate && reason === "back";

        if (!view || !animate || !view.classList.contains("is-palette-workspace")) {
            resetWorkspaceDomState({ discardDraft: true, renderLauncher: true, restoreSettingsScroll: reason === "back" });
            return;
        }

        clearTransition();
        token = transitionToken;
        workspaceOpen = false;
        view.classList.add("is-palette-workspace-transitioning", "is-palette-workspace-leaving");
        view.setAttribute("data-palette-transition", String(token));
        view.classList.remove("is-palette-content-visible");
        workspace = query(".palette-workspace-section");
        if (workspace) {
            workspace.classList.add("is-exiting");
        }
        exitDelay = animationDuration("fast");
        transitionTimer = win.setTimeout(function () {
            if (token !== transitionToken) {
                return;
            }
            resetWorkspaceDomState({ discardDraft: true, renderLauncher: true });
            token = transitionToken;
            view.offsetWidth;
            view.classList.add("is-palette-workspace-transitioning", "is-palette-settings-reveal");
            view.setAttribute("data-palette-transition", String(token));
            morphDelay = animationDuration("normal");
            transitionTimer = win.setTimeout(function () {
                if (token !== transitionToken) {
                    return;
                }
                transitionTimer = null;
                view.classList.remove("is-palette-workspace-transitioning", "is-palette-settings-reveal");
                view.removeAttribute("data-palette-transition");
            }, morphDelay);
        }, exitDelay);
    }

    function applyWorkspaceLayout(workspace) {
        var helper = getEditorHelper();
        var layout;
        if (!workspace || !helper || !helper.getWorkspaceLayout) {
            return;
        }
        layout = helper.getWorkspaceLayout(workspace.getBoundingClientRect().width);
        workspace.classList.toggle("is-stacked", layout === "stacked");
    }

    function setupWorkspaceResize(workspace) {
        var win = getWindow();
        var queue;
        clearWorkspaceBindings();
        if (!workspace) {
            return;
        }
        queue = function () {
            if (!workspaceOpen || resizeFrame || !win.requestAnimationFrame) {
                return;
            }
            resizeFrame = win.requestAnimationFrame(function () {
                resizeFrame = 0;
                if (!workspaceOpen || isPanelShuttingDown()) {
                    return;
                }
                applyWorkspaceLayout(workspace);
                schedulePreview();
            });
        };
        if (win.ResizeObserver) {
            resizeObserver = new win.ResizeObserver(queue);
            resizeObserver.observe(workspace);
        } else if (win.addEventListener) {
            resizeFallback = queue;
            win.addEventListener("resize", resizeFallback);
        }
        applyWorkspaceLayout(workspace);
    }

    function setupWorkspaceSplitter(workspace, splitter) {
        var helper = getEditorHelper();
        var doc = getDocument();
        var view = byId("settingsView");
        var move;
        var stop;
        var start;
        if (!workspace || !splitter || !helper || !helper.clampLibraryWidth || !doc) {
            return;
        }
        move = function (event) {
            var rect = workspace.getBoundingClientRect();
            var next = helper.clampLibraryWidth(event.clientX - rect.left);
            workspace.style.setProperty("--palette-library-width", next + "px");
        };
        stop = function () {
            var width = parseFloat(workspace.style.getPropertyValue("--palette-library-width"));
            doc.removeEventListener("mousemove", move, true);
            doc.removeEventListener("mouseup", stop, true);
            if (view) {
                view.classList.remove("is-resizing-palette-layout");
            }
            if (doc.body && doc.body.classList) {
                doc.body.classList.remove("is-resizing-palette-layout");
            }
            savePaletteLibraryWidth(helper.clampLibraryWidth(width));
        };
        start = function (event) {
            if (workspace.classList.contains("is-stacked")) {
                return;
            }
            event.preventDefault();
            if (view) {
                view.classList.add("is-resizing-palette-layout");
            }
            if (doc.body && doc.body.classList) {
                doc.body.classList.add("is-resizing-palette-layout");
            }
            doc.addEventListener("mousemove", move, true);
            doc.addEventListener("mouseup", stop, true);
        };
        splitter.addEventListener("mousedown", start);
        splitterCleanup = function () {
            splitter.removeEventListener("mousedown", start);
            stop();
        };
    }

    function selectPalette(id) {
        var store = getStore();
        if (!store || !store.getResolvedPalette(id)) {
            return;
        }
        initializeEditorState(store, id);
        refresh();
    }

    function runTransition() {
        var transition = pendingTransition;
        pendingTransition = null;
        if (transition) {
            transition();
        }
    }

    function requestTransition(transition) {
        if (editorState && editorState.dirty) {
            pendingTransition = transition;
            renderActionBar();
            return;
        }
        transition();
    }

    function saveDraft(afterSave) {
        var store = getStore();
        var result;
        var draft;
        if (!store || !editorState || !paletteEditorDraftIsValid()) {
            setStatus(tr("paletteLibrary.invalidPalette"), "error");
            return false;
        }
        draft = editorState.draft;
        editorState.saving = true;
        if (editorState.editorMode === "builtIn") {
            result = store.updateBuiltInOverride(editorState.selectedPaletteId, draft);
        } else if (editorState.editorMode === "custom") {
            result = store.updatePalette(editorState.selectedPaletteId, draft);
        } else {
            result = store.createPalette(draft);
        }
        editorState.saving = false;
        if (!result || !result.ok) {
            setStatus(tr("paletteLibrary.invalidPalette"), "error");
            syncDirtyUi();
            return false;
        }
        selectedPaletteId = result.palette.id;
        initializeEditorState(store, result.palette.id);
        clearTransientPreview();
        refreshPaletteDrivenHomeIcons();
        setStatus(tr("paletteLibrary.saved"), "ok");
        if (afterSave) {
            afterSave();
        } else {
            refresh();
        }
        return true;
    }

    function cancelDraft() {
        var store = getStore();
        var helper = getEditorHelper();
        var restoreId;
        if (!store || !editorState || !helper) {
            return;
        }
        restoreId = editorState.editorMode === "new" || editorState.editorMode === "duplicate" ? editorState.previousSelectedPaletteId : editorState.selectedPaletteId;
        initializeEditorState(store, restoreId);
        clearTransientPreview();
        refresh();
    }

    function discardDraftForTransition() {
        var store = getStore();
        var restoreId;
        if (!store || !editorState) {
            return;
        }
        restoreId = editorState.editorMode === "new" || editorState.editorMode === "duplicate" ? editorState.previousSelectedPaletteId : editorState.selectedPaletteId;
        initializeEditorState(store, restoreId);
        clearTransientPreview();
    }

    function beginNewDraft() {
        var helper = getEditorHelper();
        if (!helper || !helper.createNewEditorState) {
            return;
        }
        editorState = helper.createNewEditorState(selectedPaletteId);
        clearTransientPreview();
        refresh();
    }

    function beginDuplicateDraft() {
        var store = getStore();
        var helper = getEditorHelper();
        var source = store && store.getResolvedPalette(selectedPaletteId);
        if (!source || !helper || !helper.createDuplicateEditorState) {
            return;
        }
        editorState = helper.createDuplicateEditorState(source, selectedPaletteId);
        clearTransientPreview();
        refresh();
    }

    function createButton(labelKey, className, handler) {
        var button = createElement("button");
        button.type = "button";
        button.className = "panel-button registry-large-button " + (className || "");
        button.setAttribute("data-i18n", labelKey);
        button.textContent = tr(labelKey);
        button.addEventListener("click", handler);
        return button;
    }

    function renderActionBar() {
        var actionBar = query(".palette-editor-action-bar");
        var store = getStore();
        var state = editorState;
        var current;
        var currentKind;
        if (!actionBar || !store || !state) {
            return;
        }
        actionBar.innerHTML = "";
        if (deleteConfirmationId) {
            var deletePalette = store.getResolvedPalette(deleteConfirmationId);
            var usageCount = store.getPaletteUsageCount ? store.getPaletteUsageCount(deleteConfirmationId) : 0;
            var deleteNotice = createElement("span");
            deleteNotice.className = "palette-editor-unsaved-notice is-danger";
            deleteNotice.textContent = tr("paletteLibrary.deleteConfirmation", {
                name: paletteDisplayName(deletePalette),
                count: usageCount
            });
            actionBar.appendChild(deleteNotice);
            actionBar.appendChild(createButton("paletteLibrary.deletePalette", "palette-library-action is-danger", function () {
                var palettes = store.listResolvedPalettes(true);
                var deletedIndex = palettes.map(function (palette) { return palette.id; }).indexOf(deleteConfirmationId);
                var remaining = palettes.filter(function (palette) { return palette.id !== deleteConfirmationId; });
                var nextPalette = remaining[Math.min(Math.max(0, deletedIndex), Math.max(0, remaining.length - 1))] || remaining[0] || null;
                var result = store.deletePalette(deleteConfirmationId);
                if (!result.ok) {
                    setStatus(tr("paletteLibrary.invalidPalette"), "error");
                    return;
                }
                deleteConfirmationId = "";
                selectedPaletteId = nextPalette ? nextPalette.id : "";
                editorState = null;
                clearTransientPreview();
                initializeEditorState(store, selectedPaletteId);
                if (store.flush) {
                    store.flush();
                }
                refreshPaletteDrivenHomeIcons();
                setStatus(tr("paletteLibrary.paletteDeleted"), "ok");
                refresh();
            }));
            actionBar.appendChild(createButton("paletteLibrary.cancel", "palette-library-action", function () {
                deleteConfirmationId = "";
                renderActionBar();
            }));
            return;
        }
        if (pendingTransition) {
            var notice = createElement("span");
            notice.className = "palette-editor-unsaved-notice";
            notice.textContent = tr("paletteLibrary.unsavedChanges");
            actionBar.appendChild(notice);
            actionBar.appendChild(createButton("paletteLibrary.saveAndContinue", "palette-library-action is-primary", function () {
                saveDraft(runTransition);
            }));
            actionBar.appendChild(createButton("paletteLibrary.discardChanges", "palette-library-action", function () {
                var transition = pendingTransition;
                pendingTransition = null;
                discardDraftForTransition();
                if (transition) {
                    transition();
                }
            }));
            actionBar.appendChild(createButton("paletteLibrary.cancel", "palette-library-action", function () {
                pendingTransition = null;
                renderActionBar();
            }));
            return;
        }
        current = state.selectedPaletteId ? store.getResolvedPalette(state.selectedPaletteId) : null;
        currentKind = current && store.getPaletteKind ? store.getPaletteKind(current.id) : (current && current.isBuiltIn ? "builtIn" : "custom");
        if (state.dirty || state.editorMode === "custom" || state.editorMode === "new" || state.editorMode === "duplicate" || (current && current.isModified)) {
            var save = createButton("paletteLibrary.save", "palette-library-action is-primary palette-editor-save", function () {
                saveDraft();
            });
            save.disabled = !state.dirty || !paletteEditorDraftIsValid();
            actionBar.appendChild(save);
            actionBar.appendChild(createButton("paletteLibrary.cancel", "palette-library-action", cancelDraft));
        }
        if (state.editorMode !== "new" && state.editorMode !== "duplicate") {
            actionBar.appendChild(createButton("paletteLibrary.duplicatePalette", "palette-library-action", function () {
                requestTransition(beginDuplicateDraft);
            }));
        }
        if (current && currentKind === "builtIn") {
            actionBar.appendChild(createButton("paletteLibrary.restoreDefaults", "palette-library-action", function () {
                requestTransition(function () {
                    store.resetBuiltInPalette(current.id);
                    initializeEditorState(store, current.id);
                    refreshPaletteDrivenHomeIcons();
                    refresh();
                });
            }));
            actionBar.appendChild(createButton(current.isHidden ? "paletteLibrary.show" : "paletteLibrary.hide", "palette-library-action", function () {
                requestTransition(function () {
                    store.hideBuiltInPalette(current.id, !current.isHidden);
                    refresh();
                });
            }));
        } else if (current && currentKind === "custom" && state.editorMode === "custom") {
            actionBar.appendChild(createButton("paletteLibrary.deletePalette", "palette-library-action is-danger", function () {
                requestTransition(function () {
                    deleteConfirmationId = current.id;
                    renderActionBar();
                });
            }));
        }
    }

    function renderEditorPane(editor, palettes, store) {
        var state = editorState;
        var draft = state && state.draft;
        var roles = ["shadow", "base", "secondary", "highlight"];
        var scroll;
        var status;
        var actions;
        var i;
        if (!draft) {
            return;
        }
        scroll = createElement("div");
        scroll.className = "palette-editor-scroll";
        scroll.appendChild(createPalettePreviewBlock());
        status = createElement("div");
        status.className = "palette-editor-draft-status";
        scroll.appendChild(status);
        scroll.appendChild(renderPaletteEditorField("paletteLibrary.displayName", createPaletteTextInput(draft.displayName, function (value) {
            updateEditorDraft({ displayName: value });
        })));
        roles.forEach(function (role) {
            scroll.appendChild(renderPaletteEditorField("paletteLibrary." + role, createPaletteColorControl(role, draft.colors[role])));
        });
        for (i = 0; i < 4; i++) {
            (function (index) {
                scroll.appendChild(renderPaletteEditorField("paletteLibrary.stop" + (index + 1), createPaletteNumberInput(draft.stops[index], {
                    min: 0,
                    max: 1,
                    step: 0.01,
                    defaultValue: draft.stops[index]
                }, function (value, input, phase) {
                    var helper = getEditorHelper();
                    var stops = editorState.draft.stops.slice(0);
                    var clamped = helper.clampStopValue(stops, index, value, 0.01);
                    if (phase !== "input") {
                        input.value = Number(clamped).toFixed(2);
                    }
                    stops[index] = clamped;
                    updateEditorDraft({ stops: stops });
                }, { disabled: index === 0 || index === 3 })));
            }(i));
        }
        roles.forEach(function (role) {
            scroll.appendChild(renderPaletteEditorField("paletteLibrary.weight." + role, createPaletteNumberInput(draft.weights[role], {
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: draft.weights[role]
            }, function (value, input, phase) {
                var weights = Object.assign({}, editorState.draft.weights);
                var normalized = options.normalizeSchemaNumber ? options.normalizeSchemaNumber(value, { min: 0, max: 1, step: 0.01, defaultValue: draft.weights[role] }, draft.weights[role]) : Number(value);
                if (phase !== "input") {
                    input.value = Number(normalized).toFixed(2);
                }
                weights[role] = normalized;
                updateEditorDraft({ weights: weights });
            })));
        });
        renderToolMapping(scroll, palettes, store);
        renderImportExport(scroll, store);
        editor.appendChild(scroll);
        actions = createElement("div");
        actions.className = "palette-editor-action-bar";
        editor.appendChild(actions);
        if (store && typeof store.setTransientPalette === "function") {
            store.setTransientPalette(PaletteEditorPreviewId, Object.assign({}, draft, { id: PaletteEditorPreviewId }));
        }
        syncDirtyUi();
        schedulePreview();
        renderActionBar();
    }

    function renderLauncher(mount) {
        var heading = options.createSettingsSectionHeader ? options.createSettingsSectionHeader("section.procedural", "paletteLibrary.title", "paletteLibrary.description") : createElement("div");
        var button = createButton("paletteLibrary.open", "palette-library-open", function () {
            openWorkspace();
        });
        mount.className = "settings-section settings-section--palette-library";
        mount.innerHTML = "";
        mount.appendChild(heading);
        mount.appendChild(button);
    }

    function refresh() {
        var mount = byId("settingsPaletteLibraryMount");
        var store = getStore();
        var heading;
        var workspace;
        var list;
        var editor;
        var palettes;
        var splitter;
        var listScroll;
        var listToolbar;
        var back;
        var roles = ["shadow", "base", "secondary", "highlight"];

        if (!mount || !store || typeof store.listResolvedPalettes !== "function") {
            return;
        }
        closeCustomSelectMenus();
        removePaletteCustomSelectMenus();
        clearWorkspaceBindings();
        clearPreviewRafs();
        clearTransientPreview();
        if (!workspaceOpen) {
            renderLauncher(mount);
            return;
        }
        palettes = store.listResolvedPalettes(true);
        if (!editorState || (editorState.editorMode !== "new" && editorState.editorMode !== "duplicate" && (!selectedPaletteId || !store.getResolvedPalette(selectedPaletteId)))) {
            initializeEditorState(store, palettes[0] ? palettes[0].id : "");
        }

        mount.innerHTML = "";
        mount.className = "settings-section settings-section--palette-library palette-workspace-section";
        heading = options.createSettingsSectionHeader ? options.createSettingsSectionHeader("section.procedural", "paletteLibrary.title", "paletteLibrary.description") : createElement("div");
        back = createButton("paletteLibrary.backToSettings", "palette-workspace-back", function () {
            if (editorState && editorState.dirty) {
                requestTransition(function () {
                    closeWorkspace({ reason: "back", animate: true });
                });
                return;
            }
            closeWorkspace({ reason: "back", animate: true });
        });
        heading.appendChild(back);
        mount.appendChild(heading);

        workspace = createElement("div");
        workspace.className = "palette-workspace";
        workspace.style.setProperty("--palette-library-width", getPaletteLibraryWidth() + "px");
        list = createElement("div");
        list.className = "palette-library-pane";
        listToolbar = createElement("div");
        listToolbar.className = "palette-library-pane-toolbar";
        listToolbar.appendChild(createButton("paletteLibrary.new", "palette-library-new", function () {
            requestTransition(beginNewDraft);
        }));
        listScroll = createElement("div");
        listScroll.className = "palette-library-list";
        editor = createElement("div");
        editor.className = "palette-editor-pane";
        splitter = createElement("div");
        splitter.className = "palette-splitter";
        splitter.setAttribute("role", "separator");
        splitter.setAttribute("aria-label", tr("paletteLibrary.resizePaletteList"));
        splitter.setAttribute("title", tr("paletteLibrary.resizePaletteList"));

        palettes.forEach(function (palette) {
            var item = createElement("button");
            var label = createElement("span");
            var meta = createElement("small");
            var swatches = createElement("span");
            item.type = "button";
            item.className = "palette-library-item" + (palette.id === selectedPaletteId && editorState && editorState.editorMode !== "new" && editorState.editorMode !== "duplicate" ? " is-selected" : "");
            item.setAttribute("data-palette-id", palette.id);
            label.textContent = paletteDisplayName(palette);
            meta.textContent = palette.isCustom ? tr("paletteLibrary.custom") : (palette.isModified ? tr("paletteLibrary.modified") : tr("paletteLibrary.builtIn"));
            swatches.className = "palette-library-swatches";
            roles.forEach(function (role) {
                var swatch = createElement("span");
                swatch.style.backgroundColor = palette.colors[role];
                swatches.appendChild(swatch);
            });
            item.appendChild(label);
            item.appendChild(swatches);
            item.appendChild(meta);
            item.addEventListener("click", function () {
                var id = this.getAttribute("data-palette-id");
                requestTransition(function () {
                    selectPalette(id);
                });
            });
            listScroll.appendChild(item);
        });
        if (editorState && (editorState.editorMode === "new" || editorState.editorMode === "duplicate")) {
            var draftItem = createElement("div");
            draftItem.className = "palette-library-item is-draft";
            draftItem.textContent = paletteDisplayName(editorState.draft) + " - " + tr("paletteLibrary.unsavedChanges");
            listScroll.appendChild(draftItem);
        }
        list.appendChild(listToolbar);
        list.appendChild(listScroll);
        workspace.appendChild(list);
        workspace.appendChild(splitter);
        workspace.appendChild(editor);
        mount.appendChild(workspace);
        renderEditorPane(editor, palettes, store);
        setupWorkspaceResize(workspace);
        setupWorkspaceSplitter(workspace, splitter);
        setupCustomSelectInputs();
    }

    function escapeHtml(value) {
        if (options.escapeHtml) {
            return options.escapeHtml(value);
        }
        return String(value || "").replace(/[&<>"']/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
        });
    }

    function renderToolMapping(container, palettes, store) {
        var section = createElement("div");
        var title = createElement("h4");
        section.className = "palette-tool-map";
        title.className = "settings-group-label";
        title.setAttribute("data-i18n", "paletteLibrary.toolMapping");
        title.textContent = tr("paletteLibrary.toolMapping");
        section.appendChild(title);
        getPaletteToolRows().forEach(function (tool) {
            var row = createElement("div");
            var label = createElement("span");
            var select = createElement("select");
            row.className = "palette-tool-map-row";
            label.innerHTML = escapeHtml(tr(tool.titleKey)) + "<small>" + escapeHtml(tool.toolId) + "</small>";
            select.id = "paletteToolMap_" + tool.toolId;
            select.className = "select-input settings-select";
            palettes.filter(function (palette) { return !palette.isHidden; }).forEach(function (palette) {
                var option = createElement("option");
                option.value = palette.id;
                option.textContent = paletteDisplayName(palette);
                if (store.getToolPalette(tool.toolId) === palette.id) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            select.addEventListener("change", function () {
                store.setToolPalette(tool.toolId, this.value);
                refreshPaletteDrivenHomeIcons();
            });
            row.appendChild(label);
            row.appendChild(select);
            section.appendChild(row);
        });
        container.appendChild(section);
    }

    function renderImportExport(container, store) {
        var details = createElement("details");
        var summary = createElement("summary");
        var body = createElement("div");
        var exportSection = createElement("section");
        var importSection = createElement("section");
        var exportTitle = createElement("h5");
        var importTitle = createElement("h5");
        var exportDescription = createElement("p");
        var importDescription = createElement("p");
        var exportLabel = createElement("label");
        var importLabel = createElement("label");
        var exportTextarea = createElement("textarea");
        var importTextarea = createElement("textarea");
        var exportActions = createElement("div");
        var importActions = createElement("div");
        var validationStatus = createElement("small");
        var replaceConfirm = createElement("div");

        function setJsonStatus(message, isError) {
            validationStatus.textContent = message || "";
            validationStatus.classList.toggle("is-error", isError === true);
        }

        function validateImport() {
            var validation = store.validateImportData ? store.validateImportData(importTextarea.value) : { ok: false, errors: ["Validation unavailable."] };
            if (!validation.ok) {
                setJsonStatus((validation.errors || []).join(" ") || tr("paletteLibrary.invalidJson"), true);
                setStatus(tr("paletteLibrary.invalidJson"), "error");
                return false;
            }
            setJsonStatus(tr("paletteLibrary.jsonValid"), false);
            return true;
        }

        function completeImport(mode) {
            var result;
            if (!validateImport()) {
                return;
            }
            try {
                result = store.importData(importTextarea.value, { mode: mode });
            } catch (error) {
                setJsonStatus(error.message || tr("paletteLibrary.invalidJson"), true);
                setStatus(tr("paletteLibrary.invalidJson"), "error");
                return;
            }
            if (!result || !result.ok) {
                setJsonStatus((result && result.errors ? result.errors.join(" ") : tr("paletteLibrary.invalidPalette")), true);
                setStatus(tr("paletteLibrary.invalidPalette"), "error");
                return;
            }
            selectedPaletteId = "";
            editorState = null;
            clearTransientPreview();
            initializeEditorState(store, "");
            refreshPaletteDrivenHomeIcons();
            setStatus(tr("paletteLibrary.importSuccessful"), "ok");
            refresh();
        }

        details.className = "palette-import-export palette-json-advanced";
        summary.setAttribute("data-i18n", "paletteLibrary.importExport");
        summary.textContent = tr("paletteLibrary.importExport");
        body.className = "palette-json-workspace";
        exportSection.className = "palette-json-section palette-json-export-section";
        importSection.className = "palette-json-section palette-json-import-section";

        exportTitle.textContent = tr("paletteLibrary.exportConfiguration");
        exportDescription.textContent = tr("paletteLibrary.exportDescription");
        exportLabel.textContent = tr("paletteLibrary.exportResult");
        exportTextarea.className = "registry-textarea palette-json-box palette-json-export";
        exportTextarea.readOnly = true;
        exportTextarea.setAttribute("aria-label", tr("paletteLibrary.exportResult"));
        exportActions.className = "settings-action-row palette-library-actions";
        exportActions.appendChild(createButton("paletteLibrary.generateJson", "palette-library-action", function () {
            exportTextarea.value = JSON.stringify(store.exportData(), null, 2);
            setJsonStatus("", false);
        }));
        exportActions.appendChild(createButton("paletteLibrary.copyJson", "palette-library-action", function () {
            var text = exportTextarea.value || JSON.stringify(store.exportData(), null, 2);
            exportTextarea.value = text;
            if (root && root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
                root.navigator.clipboard.writeText(text).then(function () {
                    setStatus(tr("paletteLibrary.exportCopied"), "ok");
                }, function () {
                    exportTextarea.select();
                    getDocument().execCommand("copy");
                    setStatus(tr("paletteLibrary.exportCopied"), "ok");
                });
            } else {
                exportTextarea.select();
                getDocument().execCommand("copy");
                setStatus(tr("paletteLibrary.exportCopied"), "ok");
            }
        }));

        importTitle.textContent = tr("paletteLibrary.importConfiguration");
        importDescription.textContent = tr("paletteLibrary.importDescription");
        importLabel.textContent = tr("paletteLibrary.importInput");
        importTextarea.className = "registry-textarea palette-json-box palette-json-import";
        importTextarea.placeholder = tr("paletteLibrary.pasteJsonPlaceholder");
        importTextarea.setAttribute("aria-label", tr("paletteLibrary.importInput"));
        validationStatus.className = "palette-json-validation";
        importActions.className = "settings-action-row palette-library-actions";
        importActions.appendChild(createButton("paletteLibrary.validate", "palette-library-action", validateImport));
        importActions.appendChild(createButton("paletteLibrary.mergeImport", "palette-library-action", function () {
            completeImport("merge");
        }));
        importActions.appendChild(createButton("paletteLibrary.replaceImport", "palette-library-action is-danger", function () {
            replaceConfirm.classList.add("is-visible");
        }));
        importActions.appendChild(createButton("paletteLibrary.clear", "palette-library-action", function () {
            importTextarea.value = "";
            replaceConfirm.classList.remove("is-visible");
            setJsonStatus("", false);
        }));

        replaceConfirm.className = "palette-json-replace-confirm";
        var replaceCopy = createElement("span");
        replaceCopy.textContent = tr("paletteLibrary.replaceConfirmation");
        replaceConfirm.appendChild(replaceCopy);
        replaceConfirm.appendChild(createButton("paletteLibrary.replaceImport", "palette-library-action is-danger", function () {
            completeImport("replace");
        }));
        replaceConfirm.appendChild(createButton("paletteLibrary.cancel", "palette-library-action", function () {
            replaceConfirm.classList.remove("is-visible");
        }));

        exportSection.appendChild(exportTitle);
        exportSection.appendChild(exportDescription);
        exportSection.appendChild(exportLabel);
        exportSection.appendChild(exportTextarea);
        exportSection.appendChild(exportActions);
        importSection.appendChild(importTitle);
        importSection.appendChild(importDescription);
        importSection.appendChild(importLabel);
        importSection.appendChild(importTextarea);
        importSection.appendChild(validationStatus);
        importSection.appendChild(importActions);
        importSection.appendChild(replaceConfirm);
        body.appendChild(exportSection);
        body.appendChild(importSection);
        details.appendChild(summary);
        details.appendChild(body);
        container.appendChild(details);
    }

    function handleStoreChange() {
        if (isPanelShuttingDown()) {
            return;
        }
        refreshPaletteDrivenHomeIcons();
        if (workspaceOpen) {
            refresh();
        }
    }

    function initialize(nextOptions) {
        var store;
        options = Object.assign({}, options, nextOptions || {});
        store = getStore();
        if (!initialized) {
            storeListener = handleStoreChange;
            if (store && typeof store.subscribe === "function") {
                store.subscribe(storeListener);
            }
            initialized = true;
        }
        refresh();
        return api;
    }

    function refreshI18n() {
        if (options.applyI18n) {
            options.applyI18n(getDocument());
        }
        refresh();
    }

    function refreshToolMappings() {
        refreshPaletteDrivenHomeIcons();
        if (workspaceOpen) {
            refresh();
        }
    }

    function teardown() {
        var store = getStore();
        closeWorkspace({ reason: "panel-shutdown", animate: false });
        if (store && storeListener && typeof store.unsubscribe === "function") {
            store.unsubscribe(storeListener);
        }
        storeListener = null;
        initialized = false;
        selectedPaletteId = "";
        editorState = null;
        pendingTransition = null;
        deleteConfirmationId = "";
        return api;
    }

    var api = {
        initialize: initialize,
        open: function () {
            openWorkspace();
            return api;
        },
        close: function (closeOptions) {
            closeWorkspace(closeOptions);
            return api;
        },
        ensureClosedState: function () {
            resetWorkspaceDomState({ discardDraft: true, renderLauncher: true });
            return api;
        },
        isOpen: function () {
            return workspaceOpen;
        },
        refresh: function () {
            refresh();
            return api;
        },
        refreshI18n: function () {
            refreshI18n();
            return api;
        },
        selectPalette: function (id) {
            selectPalette(id);
            return api;
        },
        refreshToolMappings: function () {
            refreshToolMappings();
            return api;
        },
        teardown: teardown,
        _debugState: function () {
            return {
                initialized: initialized,
                isOpen: workspaceOpen,
                selectedPaletteId: selectedPaletteId,
                previewRafCount: previewRafs.length,
                hasResizeObserver: !!resizeObserver,
                hasResizeFallback: !!resizeFallback,
                hasSplitterCleanup: !!splitterCleanup,
                hasTransitionTimer: !!transitionTimer,
                hasStoreListener: !!storeListener
            };
        }
    };

    return api;
}));
