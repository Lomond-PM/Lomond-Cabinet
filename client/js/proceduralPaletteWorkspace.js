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

    function enhanceSelect(select) {
        if (options.enhanceSelect) options.enhanceSelect(select);
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
        var palette = store && store.getV2Palette ? store.getV2Palette(nextSelectedId) : null;
        if (!palette || !helper || !helper.createNativeEditorState) {
            return;
        }
        selectedPaletteId = palette.id;
        editorState = helper.createNativeEditorState(palette);
        editorState.selectedPaletteId = palette.id;
        clearTransientPreview();
    }

    function paletteEditorDraftIsValid() {
        var store = getStore();
        var helper = getEditorHelper();
        var draft = editorState && editorState.draft ? editorState.draft : null;
        var result;
        if (!store || !draft || !helper || typeof helper.validateNativeDraft !== "function") {
            return false;
        }
        result = helper.validateNativeDraft(draft);
        return !!(result && result.ok);
    }

    function syncDirtyUi() {
        var workspace = query(".palette-workspace");
        var status = query(".palette-editor-draft-status");
        var saveButton = query(".palette-editor-save");
        var dirty = !!(editorState && editorState.dirty);
        var valid = paletteEditorDraftIsValid();
        var store = getStore();
        if (workspace) {
            workspace.classList.toggle("has-unsaved-palette-draft", dirty);
        }
        if (status) {
            status.textContent = valid ? (dirty ? tr("paletteLibrary.unsavedChanges") : tr("paletteLibrary.saved")) : tr("paletteLibrary.invalidPalette");
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

    // A working Palette draft mutation is a data change followed by a projection update.
    // It must never tear down the Workspace root, its scroll owner, or the rendered slot
    // cards; only the affected presentation is re-projected from the freshly resolved graph.
    function mutateNativeDraft(mutator, rerender) {
        var helper = getEditorHelper();
        var store = getStore();
        var validation;
        if (!editorState || !helper || !helper.mutateNativeState) return;
        editorState = helper.mutateNativeState(editorState, mutator);
        if (rerender) { refresh(); return; }
        validation = helper.validateNativeDraft(editorState.draft);
        if (validation.ok && store && store.setTransientV2Palette) store.setTransientV2Palette(PaletteEditorPreviewId, editorState.draft);
        else clearTransientPreview();
        refreshProjection(validation);
    }

    function mutateDependencySource(mutator) {
        var helper = getEditorHelper(); var trial = helper.mutateNativeState(editorState, mutator); var validation = helper.validateNativeDraft(trial.draft); var code = validation.resolution && validation.resolution.error && validation.resolution.error.code;
        if (code === "DEPENDENCY_CYCLE" || code === "SELF_REFERENCE") { setStatus(code, "error"); return; }
        editorState = trial;
        if (validation.ok && getStore() && getStore().setTransientV2Palette) getStore().setTransientV2Palette(PaletteEditorPreviewId, editorState.draft);
        else clearTransientPreview();
        refreshProjection(validation);
    }

    function createPaletteTextInput(value, onChange) {
        var input;
        if (options.CoreUI) return options.CoreUI.createTextInput({ document: getDocument(), value: value || "", classNames: "registry-text-input palette-editor-text", onInput: function () { onChange(this.value); } });
        input = createElement("input"); input.className = "registry-text-input palette-editor-text"; input.type = "text"; input.value = value || "";
        input.addEventListener("input", function () { onChange(this.value); }); return input;
    }

    function createPaletteNumberInput(value, field, onChange, inputOptions) {
        var input;
        inputOptions = inputOptions || {};
        input = options.CoreUI ? options.CoreUI.createNumberInput({ document: getDocument(), value: String(value), field: field, classNames: "num-input registry-range-number settings-number palette-editor-number", disabled: inputOptions.disabled, onInput: function () {
            var isDraft = options.isSchemaNumberDraftValue ? options.isSchemaNumberDraftValue(this.value) : false;
            if (!isDraft && !isNaN(Number(this.value))) onChange(this.value, this, "input");
        }, onDragValue: function (nextValue) { onChange(nextValue, input, "update"); }, onCommit: function (nextValue) { onChange(nextValue, input, "commit"); }, onCancel: function (nextValue) { onChange(nextValue, input, "cancel"); } }) : createElement("input");
        if (!options.CoreUI) { input.className = "num-input registry-range-number settings-number palette-editor-number"; input.type = "text"; input.inputMode = "decimal"; input.value = String(value); }
        if (options.applySchemaNumberAttributes) {
            options.applySchemaNumberAttributes(input, field);
        }
        if (!options.CoreUI) {
            input.addEventListener("input", function () {
                var isDraft = options.isSchemaNumberDraftValue ? options.isSchemaNumberDraftValue(this.value) : false;
                if (!isDraft && !isNaN(Number(this.value))) onChange(this.value, this, "input");
            });
            if (options.setupRegistryNumberDrag) options.setupRegistryNumberDrag(input, field, function (nextValue) { onChange(nextValue, input, "update"); }, {
                onCommit: function (nextValue) { onChange(nextValue, input, "commit"); },
                onCancel: function (nextValue) { onChange(nextValue, input, "cancel"); }
            });
        }
        if (inputOptions.disabled) {
            input.classList.remove("is-drag-ready");
        }
        return input;
    }

    function renderPaletteEditorField(labelKey, control) {
        var row;
        var copy;
        var label;
        if (options.CoreUI) return options.CoreUI.createFieldRow({ document: getDocument(), labelKey: labelKey, labelText: tr(labelKey), control: control, classNames: "settings-field palette-editor-field ui-field-row--aligned", copyClassNames: "settings-field-copy palette-editor-field-copy", labelClassNames: "control-label registry-text-body settings-field-label" }).row;
        row = createElement("div"); copy = createElement("span"); label = createElement("strong"); row.className = "settings-field palette-editor-field ui-field-row ui-field-row--aligned"; copy.className = "ui-field-copy settings-field-copy palette-editor-field-copy"; label.className = "ui-field-label control-label registry-text-body settings-field-label"; label.setAttribute("data-i18n", labelKey); label.textContent = tr(labelKey); copy.appendChild(label); row.appendChild(copy); row.appendChild(control); return row;
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
        if (options.closeColorPicker) options.closeColorPicker("palette-close");
        clearTransition();
        clearWorkspaceBindings();
        clearPreviewRafs();
        if (options.disposeSelectsWithin && mount) options.disposeSelectsWithin(mount);
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
        if (options.setSettingsBackParent) options.setSettingsBackParent("common.home");
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
        if (options.setSettingsBackParent) options.setSettingsBackParent("common.settings");
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
            resetWorkspaceDomState({ discardDraft: true, renderLauncher: true, restoreSettingsScroll: true });
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
        result = editorState.editorMode === "new" || editorState.editorMode === "duplicate"
            ? store.createV2Palette(draft)
            : store.saveV2Palette(editorState.selectedPaletteId, draft);
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
        if (!helper || !helper.createNativeNewEditorState) {
            return;
        }
        editorState = helper.createNativeNewEditorState(selectedPaletteId);
        clearTransientPreview();
        refresh();
    }

    function beginDuplicateDraft() {
        var store = getStore();
        var helper = getEditorHelper();
        var source = store && store.getV2Palette(selectedPaletteId);
        if (!source || !helper || !helper.createNativeDuplicateEditorState) {
            return;
        }
        editorState = helper.createNativeDuplicateEditorState(source, selectedPaletteId);
        clearTransientPreview();
        refresh();
    }

    function createButton(labelKey, className, handler) {
        var button = options.CoreUI ? options.CoreUI.createButton({ document: getDocument(), variant: className && className.indexOf("is-primary") >= 0 ? "primary" : (className && className.indexOf("is-danger") >= 0 ? "danger" : "neutral"), classNames: "panel-button registry-large-button panel-local-action " + (className || ""), onClick: handler }) : createElement("button");
        if (!options.CoreUI) { button.type = "button"; button.className = "ui-button ui-button--" + (className && className.indexOf("is-primary") >= 0 ? "primary" : (className && className.indexOf("is-danger") >= 0 ? "danger" : "neutral")) + " panel-button registry-large-button panel-local-action " + (className || ""); button.addEventListener("click", handler); }
        button.setAttribute("data-i18n", labelKey);
        button.textContent = tr(labelKey);
        return button;
    }

    function requestWorkspaceBack() {
        if (editorState && editorState.dirty) {
            requestTransition(function () { closeWorkspace({ reason: "back", animate: true }); });
            return;
        }
        closeWorkspace({ reason: "back", animate: true });
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

    function createPaletteSelect(value, choices, onChange) {
        var select = options.CoreUI ? options.CoreUI.createSelect({ document: getDocument(), classNames: "select-input settings-select palette-editor-select", onChange: function () { onChange(this.value); } }) : createElement("select");
        (choices || []).forEach(function (choice) { var option = createElement("option"); option.value = choice.value; option.textContent = choice.label; option.selected = choice.value === value; select.appendChild(option); });
        if (!options.CoreUI) select.addEventListener("change", function () { onChange(this.value); });
        getWindow().setTimeout(function () { if (select.parentNode) enhanceSelect(select); }, 0);
        return select;
    }

    function slotChoices(draft, excludedId) {
        return draft.slots.filter(function (slot) { return slot.id !== excludedId; }).map(function (slot) { return { value: slot.id, label: slot.label }; });
    }

    function createDynamicColorControl(slot) {
        var normalizeHex = options.normalizeHex || function (value, fallback) { return value || fallback; };
        var built = options.CoreUI.createColorField({ document: getDocument(), id: "paletteSlot_" + slot.id, value: slot.value.color, fallback: "#000000", normalize: normalizeHex, isValid: function (value) { return /^#?[0-9a-f]{6}$/i.test(value); }, classNames: "control-inputs settings-field-control settings-color-control palette-editor-color-control", swatchClassNames: "settings-color-pill small-color-shell", valueClassNames: "native-color-input", hexClassNames: "settings-color-hex", openPicker: options.openCoreColorPicker, onPreview: apply, onCommit: apply });
        function apply(value) { var normalized = normalizeHex(value, slot.value.color).toUpperCase(); mutateNativeDraft(function (draft) { draft.slots.filter(function (item) { return item.id === slot.id; })[0].value.color = normalized; }, false); }
        if (options.bindHexInputSelectBehavior) options.bindHexInputSelectBehavior(built.hex);
        return built.root;
    }

    function createNativeNumber(value, contract, apply) {
        return createPaletteNumberInput(value, { min: contract.min, max: contract.max, step: contract.step || 0.01, defaultValue: value }, function (next) { apply(Number(next)); });
    }

    // Project the resolution of a single slot card in place. This is the only authority
    // that writes a slot's resolved swatch / error evidence; both the initial render and
    // the live projection refresh share it, so an update never rebuilds the slot card DOM.
    function applyResolvedSlotProjection(card, slot, validation) {
        var header = card.querySelector(".palette-slot-card-header");
        var resolution = validation && validation.resolution;
        var resolved = resolution && resolution.ok ? resolution.colors[slot.id] : null;
        var swatch = card.querySelector(".palette-slot-resolved-swatch");
        var error = card.querySelector(".palette-slot-resolution-error");
        var code;
        if (resolved) {
            if (!swatch && header) {
                swatch = createElement("span");
                swatch.className = "palette-slot-resolved-swatch";
                header.insertBefore(swatch, header.children[0] ? header.children[0].nextSibling : null);
            }
            if (swatch) {
                swatch.style.backgroundColor = resolved;
                swatch.title = resolved;
            }
            if (error && error.parentNode) error.parentNode.removeChild(error);
        } else {
            code = resolution && resolution.error ? resolution.error.code : (validation && validation.errors && validation.errors[0] && validation.errors[0].code);
            if (swatch && swatch.parentNode) swatch.parentNode.removeChild(swatch);
            if (!error) {
                error = createElement("small");
                error.className = "palette-slot-resolution-error";
                card.appendChild(error);
            }
            error.textContent = code || tr("paletteLibrary.invalidPalette");
        }
    }

    // Re-resolve the current full v2 draft and project every visible slot card's resolved
    // color / error evidence without touching the Workspace root or its scroll owner.
    function refreshProjection(validation) {
        var helper = getEditorHelper();
        var draft = editorState && editorState.draft;
        var cards;
        var i;
        if (!helper || !draft) return;
        validation = validation || helper.validateNativeDraft(draft);
        cards = queryAll(".palette-slot-card");
        for (i = 0; i < cards.length; i++) {
            var slotId = cards[i].getAttribute("data-slot-id");
            var slot = draft.slots.filter(function (item) { return item.id === slotId; })[0];
            if (slot) applyResolvedSlotProjection(cards[i], slot, validation);
        }
        syncDirtyUi();
        schedulePreview();
    }

    function sectionHeading(key) { var heading = createElement("h3"); heading.className = "palette-editor-section-title"; heading.textContent = tr(key); return heading; }

    function renderSlotCard(slot, index, draft, validation) {
        var helper = getEditorHelper(); var card = createElement("section"); var header = createElement("div"); var title = createElement("strong"); var buttons = createElement("span"); var kindChoices = ["DIRECT", "REFERENCE", "DERIVED"].map(function (kind) { return { value: kind, label: kind }; });
        card.className = "palette-slot-card"; card.setAttribute("data-slot-id", slot.id); header.className = "palette-slot-card-header"; title.textContent = slot.label; buttons.className = "palette-slot-order-actions"; header.appendChild(title);
        buttons.appendChild(createButton("paletteLibrary.moveUp", "palette-slot-move", function () { editorState = helper.moveNativeSlot(editorState, slot.id, -1); refreshEditorPane(); }));
        buttons.lastChild.disabled = index === 0;
        buttons.appendChild(createButton("paletteLibrary.moveDown", "palette-slot-move", function () { editorState = helper.moveNativeSlot(editorState, slot.id, 1); refreshEditorPane(); }));
        buttons.lastChild.disabled = index === draft.slots.length - 1;
        buttons.appendChild(createButton("paletteLibrary.delete", "palette-slot-delete is-danger", function () { var result = helper.deleteNativeSlot(editorState, slot.id); if (!result.ok) { setStatus(tr("paletteLibrary.slotDeleteBlocked") + " " + result.dependents.map(function (item) { return item.label; }).concat(result.boundRoles).join(", "), "error"); return; } editorState = result.state; refreshEditorPane(); }));
        header.appendChild(buttons); card.appendChild(header);
        card.appendChild(renderPaletteEditorField("paletteLibrary.slotLabel", createPaletteTextInput(slot.label, function (value) { mutateNativeDraft(function (next) { next.slots[index].label = value; }, false); title.textContent = value; })));
        card.appendChild(renderPaletteEditorField("paletteLibrary.slotKind", createPaletteSelect(slot.kind, kindChoices, function (kind) { editorState = helper.updateNativeSlot(editorState, slot.id, { kind: kind }); refreshEditorPane(); })));
        if (slot.kind === "DIRECT") card.appendChild(renderPaletteEditorField("paletteLibrary.slotColor", createDynamicColorControl(slot)));
        if (slot.kind === "REFERENCE") card.appendChild(renderPaletteEditorField("paletteLibrary.sourceSlot", createPaletteSelect(slot.reference.slotId, slotChoices(draft, slot.id), function (sourceId) { mutateDependencySource(function (next) { next.slots[index].reference.slotId = sourceId; }); })));
        if (slot.kind === "DERIVED") renderDerivedFields(card, slot, index, draft);
        applyResolvedSlotProjection(card, slot, validation);
        return card;
    }

    function renderDerivedFields(card, slot, index, draft) {
        var helper = getEditorHelper(); var definitions = helper.derivationDefinitions(); var definition = definitions.filter(function (item) { return item.id === slot.derivation.derivationId; })[0];
        card.appendChild(renderPaletteEditorField("paletteLibrary.derivation", createPaletteSelect(slot.derivation.derivationId, definitions.map(function (item) { return { value: item.id, label: item.id }; }), function (id) { editorState = helper.updateNativeSlot(editorState, slot.id, { derivationId: id }); refreshEditorPane(); })));
        if (!definition) return;
        slot.derivation.sourceSlotIds.forEach(function (sourceId, sourceIndex) { card.appendChild(renderPaletteEditorField("paletteLibrary.sourceSlot" + (sourceIndex + 1), createPaletteSelect(sourceId, slotChoices(draft, slot.id), function (nextId) { mutateDependencySource(function (next) { next.slots[index].derivation.sourceSlotIds[sourceIndex] = nextId; }); }))); });
        Object.keys(definition.parameterSchema).forEach(function (name) { var contract = definition.parameterSchema[name]; card.appendChild(renderPaletteEditorField("paletteLibrary.parameter." + name, createNativeNumber(slot.derivation.parameters[name], contract, function (value) { mutateNativeDraft(function (next) { next.slots[index].derivation.parameters[name] = value; }, false); }))); });
    }

    function renderProfileFields(scroll, draft) {
        var profile = draft.profiles.proceduralAppearance; var roles = ["shadow", "base", "secondary", "highlight"]; var i;
        scroll.appendChild(sectionHeading("paletteLibrary.proceduralProfile"));
        roles.forEach(function (role) { scroll.appendChild(renderPaletteEditorField("paletteLibrary." + role, createPaletteSelect(profile.bindings[role], slotChoices(draft, ""), function (slotId) { mutateNativeDraft(function (next) { next.profiles.proceduralAppearance.bindings[role] = slotId; }, false); }))); });
        for (i = 0; i < 4; i++) (function (index) { scroll.appendChild(renderPaletteEditorField("paletteLibrary.stop" + (index + 1), createNativeNumber(profile.stops[index], { min: 0, max: 1, step: 0.01 }, function (value) { mutateNativeDraft(function (next) { next.profiles.proceduralAppearance.stops[index] = value; }, false); }))); }(i));
        roles.forEach(function (role) { scroll.appendChild(renderPaletteEditorField("paletteLibrary.weight." + role, createNativeNumber(profile.weights[role], { min: 0, max: 1, step: 0.01 }, function (value) { mutateNativeDraft(function (next) { next.profiles.proceduralAppearance.weights[role] = value; }, false); }))); });
        ["saturationBias", "luminanceBias", "contrastBias"].forEach(function (name) { scroll.appendChild(renderPaletteEditorField("paletteLibrary.parameter." + name, createNativeNumber(profile[name] || 0, { step: 0.01 }, function (value) { mutateNativeDraft(function (next) { next.profiles.proceduralAppearance[name] = value; }, false); }))); });
    }

    // Build the editor pane's scrollable content into an existing scroll container.
    // This is the local rebuild seam for structural slot edits (add/delete/move/kind/derivation):
    // it refreshes the slot cards and their projection but never replaces the scroll owner.
    function buildEditorContent(scroll, palettes, store) {
        var state = editorState; var draft = state && state.draft; var helper = getEditorHelper(); var status; var validation; var addActions;
        if (!draft) return;
        validation = helper.validateNativeDraft(draft);
        scroll.appendChild(createPalettePreviewBlock());
        status = createElement("div"); status.className = "palette-editor-draft-status"; scroll.appendChild(status);
        scroll.appendChild(renderPaletteEditorField("paletteLibrary.displayName", createPaletteTextInput(draft.metadata.displayName, function (value) { mutateNativeDraft(function (next) { next.metadata.displayName = value; }, false); })));
        scroll.appendChild(sectionHeading("paletteLibrary.dynamicSlots"));
        draft.slots.forEach(function (slot, index) { scroll.appendChild(renderSlotCard(slot, index, draft, validation)); });
        addActions = createElement("div"); addActions.className = "palette-slot-add-actions";
        ["DIRECT", "REFERENCE", "DERIVED"].forEach(function (kind) { addActions.appendChild(createButton("paletteLibrary.add" + kind, "palette-slot-add", function () { editorState = helper.addNativeSlot(editorState, kind); refreshEditorPane(); })); }); scroll.appendChild(addActions);
        renderProfileFields(scroll, draft); renderToolMapping(scroll, palettes, store); renderImportExport(scroll, store);
    }

    function syncEditorPresentation() {
        var store = getStore();
        var draft = editorState && editorState.draft;
        if (!store || !draft) return;
        if (paletteEditorDraftIsValid() && store.setTransientV2Palette) store.setTransientV2Palette(PaletteEditorPreviewId, draft);
        else clearTransientPreview();
        syncDirtyUi();
        schedulePreview();
        renderActionBar();
    }

    function disposeEditorPaneSelects(editorPane) {
        if (options.closeCustomSelectMenus) options.closeCustomSelectMenus();
        if (options.disposeSelectsWithin && editorPane) options.disposeSelectsWithin(editorPane);
    }

    function renderEditorPane(editor, palettes, store) {
        var scroll; var actions;
        if (!editorState || !editorState.draft) return;
        scroll = createElement("div"); scroll.className = "palette-editor-scroll ui-scroll-region";
        buildEditorContent(scroll, palettes, store);
        editor.appendChild(scroll);
        actions = createElement("div"); actions.className = "palette-editor-action-bar"; editor.appendChild(actions);
        syncEditorPresentation();
    }

    function refreshEditorPane() {
        var mount = byId("settingsPaletteLibraryMount");
        var store = getStore();
        var editorPane = query(".palette-editor-pane");
        var scroll = query(".palette-editor-scroll");
        if (!mount || !store || !editorPane) return;
        disposeEditorPaneSelects(editorPane);
        if (scroll) {
            scroll.innerHTML = "";
            buildEditorContent(scroll, store.listResolvedPalettes(true), store);
            renderActionBar();
            syncDirtyUi();
            schedulePreview();
        } else {
            renderEditorPane(editorPane, store.listResolvedPalettes(true), store);
        }
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
        if (options.disposeSelectsWithin) options.disposeSelectsWithin(mount);
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
        listScroll.className = "palette-library-list ui-scroll-region";
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
            var select = options.CoreUI ? options.CoreUI.createSelect({ document: getDocument(), id: "paletteToolMap_" + tool.toolId, classNames: "select-input settings-select", onChange: function () {
                store.setToolPalette(tool.toolId, this.value);
                refreshPaletteDrivenHomeIcons();
            } }) : createElement("select");
            row.className = "palette-tool-map-row";
            label.innerHTML = escapeHtml(tr(tool.titleKey)) + "<small>" + escapeHtml(tool.toolId) + "</small>";
            if (!options.CoreUI) { select.id = "paletteToolMap_" + tool.toolId; select.className = "select-input settings-select"; }
            palettes.filter(function (palette) { return !palette.isHidden; }).forEach(function (palette) {
                var option = createElement("option");
                option.value = palette.id;
                option.textContent = paletteDisplayName(palette);
                if (store.getToolPalette(tool.toolId) === palette.id) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            if (!options.CoreUI) select.addEventListener("change", function () { store.setToolPalette(tool.toolId, this.value); refreshPaletteDrivenHomeIcons(); });
            row.appendChild(label);
            row.appendChild(select);
            enhanceSelect(select);
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
        var exportTextarea = options.CoreUI ? options.CoreUI.createTextarea({ document: getDocument(), classNames: "registry-textarea palette-json-box palette-json-export", resizeDirection: "vertical" }) : createElement("textarea");
        var importTextarea = options.CoreUI ? options.CoreUI.createTextarea({ document: getDocument(), classNames: "registry-textarea palette-json-box palette-json-import", resizeDirection: "vertical" }) : createElement("textarea");
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
        if (!options.CoreUI) exportTextarea.className = "registry-textarea palette-json-box palette-json-export";
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
        if (!options.CoreUI) importTextarea.className = "registry-textarea palette-json-box palette-json-import";
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
        exportSection.appendChild(exportTextarea._coreFrame || exportTextarea);
        exportSection.appendChild(exportActions);
        importSection.appendChild(importTitle);
        importSection.appendChild(importDescription);
        importSection.appendChild(importLabel);
        importSection.appendChild(importTextarea._coreFrame || importTextarea);
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
        requestBack: function () {
            requestWorkspaceBack();
            return api;
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
