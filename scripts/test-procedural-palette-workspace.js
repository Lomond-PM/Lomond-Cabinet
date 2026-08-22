"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKSPACE_PATH = path.join(ROOT, "client", "js", "proceduralPaletteWorkspace.js");
const MAIN_PATH = path.join(ROOT, "client", "js", "main.js");
const STORE_PATH = path.join(ROOT, "client", "js", "proceduralPaletteStore.js");
const EDITOR_PATH = path.join(ROOT, "client", "js", "proceduralPaletteEditor.js");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function makeStore() {
    const listeners = [];
    return {
        subscribeCount: 0,
        unsubscribeCount: 0,
        subscribe(listener) {
            this.subscribeCount += 1;
            if (listeners.indexOf(listener) === -1) {
                listeners.push(listener);
            }
        },
        unsubscribe(listener) {
            const index = listeners.indexOf(listener);
            this.unsubscribeCount += 1;
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        },
        emit() {
            listeners.slice().forEach((listener) => listener({}));
        },
        listenerCount() {
            return listeners.length;
        },
        listResolvedPalettes() {
            return [];
        },
        clearTransientPalette() {
        }
    };
}

function makeWindow() {
    const canceledRafs = [];
    const clearedTimers = [];
    const removed = [];
    return {
        canceledRafs,
        clearedTimers,
        removed,
        requestAnimationFrame(callback) {
            return 100 + canceledRafs.length;
        },
        cancelAnimationFrame(id) {
            canceledRafs.push(id);
        },
        setTimeout(callback, delay) {
            return 200 + clearedTimers.length;
        },
        clearTimeout(id) {
            clearedTimers.push(id);
        },
        addEventListener(type, listener) {
        },
        removeEventListener(type, listener) {
            removed.push(type);
        },
        matchMedia() {
            return { matches: false };
        }
    };
}

function run() {
    delete require.cache[require.resolve(WORKSPACE_PATH)];
    const workspace = require(WORKSPACE_PATH);
    const storeModule = require(STORE_PATH);
    const editorModule = require(EDITOR_PATH);
    const workspaceText = fs.readFileSync(WORKSPACE_PATH, "utf8");
    const mainText = fs.readFileSync(MAIN_PATH, "utf8");
    let assertions = 0;

    workspace.teardown();

    const store = makeStore();
    const fakeWindow = makeWindow();
    let refreshHomeCount = 0;
    workspace.initialize({
        window: fakeWindow,
        document: null,
        PaletteStore: store,
        ProceduralPaletteEditor: editorModule,
        translate(key) { return key; },
        refreshHomeIcons() { refreshHomeCount += 1; },
        invalidateHomeIcons() { refreshHomeCount += 1; },
        panelShutdownPredicate() { return false; }
    });
    workspace.initialize({
        window: fakeWindow,
        document: null,
        PaletteStore: store,
        ProceduralPaletteEditor: editorModule,
        translate(key) { return key; },
        refreshHomeIcons() { refreshHomeCount += 1; },
        invalidateHomeIcons() { refreshHomeCount += 1; },
        panelShutdownPredicate() { return false; }
    });
    assert(store.subscribeCount === 1, "Repeated initialize should bind Store subscription once.");
    assert(store.listenerCount() === 1, "Initialize should leave exactly one active Store listener.");
    assertions += 2;

    workspace.open();
    assert(workspace.isOpen() === true, "open should set workspace state.");
    workspace.close({ reason: "back", animate: true });
    assert(workspace.isOpen() === false, "close should clear workspace state.");
    workspace.open();
    workspace.close({ reason: "settings-close", animate: false });
    assert(workspace.isOpen() === false, "immediate close should clear workspace state.");
    workspace.close({ reason: "settings-close", animate: false });
    assert(workspace.isOpen() === false, "Repeated immediate close should remain safe.");
    workspace.ensureClosedState();
    assert(workspace.isOpen() === false, "Defensive closed-state restoration should remain closed.");
    assertions += 5;

    store.emit();
    assert(refreshHomeCount === 2, "Store change should refresh invalidated Home icons through callbacks.");
    workspace.teardown();
    workspace.teardown();
    assert(store.unsubscribeCount === 1, "Repeated teardown should unsubscribe once.");
    assert(store.listenerCount() === 0, "Teardown should remove Store listener.");
    store.emit();
    assert(refreshHomeCount === 2, "Store emit after teardown should not refresh Home icons.");
    assertions += 4;

    assert(/clearPreviewRafs[\s\S]*cancelAnimationFrame/.test(workspaceText), "Teardown path should cancel preview RAFs.");
    assert(/teardown[\s\S]*closeWorkspace\(\{\s*reason:\s*"panel-shutdown",\s*animate:\s*false\s*\}\)/.test(workspaceText), "Teardown should use the unified immediate close path.");
    assert(/resetWorkspaceDomState[\s\S]*clearPreviewRafs\(\)/.test(workspaceText), "Atomic DOM reset should cancel preview RAFs.");
    assert(/resizeObserver\.disconnect\(\)/.test(workspaceText), "ResizeObserver should disconnect.");
    assert(/removeEventListener\("resize",\s*resizeFallback/.test(workspaceText), "Window resize fallback should be removed.");
    assert(/removeEventListener\("mousemove",\s*move,\s*true\)/.test(workspaceText), "Splitter mousemove listener should be removed.");
    assert(/removeEventListener\("mouseup",\s*stop,\s*true\)/.test(workspaceText), "Splitter mouseup listener should be removed.");
    assert(/clearTimeout\(transitionTimer\)/.test(workspaceText), "Transition timer should be cleared.");
    assert(/isPanelShuttingDown\(\)\s*\|\|\s*!workspaceOpen\s*\|\|\s*!win\.requestAnimationFrame/.test(workspaceText), "Panel shutdown should block scheduling preview renders.");
    assert(/if \(!workspaceOpen \|\| resizeFrame/.test(workspaceText), "Hidden workspace should not schedule resize work.");
    assert(/if \(!workspaceOpen \|\| isPanelShuttingDown\(\)\)/.test(workspaceText), "Queued resize callback should stop after close or shutdown.");
    assertions += 11;

    [
        "PaletteEditorSelectedId",
        "PaletteEditorState",
        "PaletteEditorPendingTransition",
        "PaletteEditorPreviewRafs",
        "PaletteWorkspaceOpen",
        "PaletteWorkspaceResizeObserver",
        "PaletteWorkspaceResizeFrame",
        "PaletteWorkspaceResizeFallback",
        "PaletteWorkspaceSplitterCleanup",
        "PaletteWorkspaceTransitionTimer",
        "PaletteWorkspaceTransitionToken",
        "PaletteEditorDeleteConfirmationId",
        "PaletteLibraryWidthStorageKey",
        "PaletteEditorPreviewId"
    ].forEach((name) => {
        assert(mainText.indexOf("var " + name) === -1, "main.js should not declare old Palette Workspace state: " + name);
    });
    assertions += 14;

    assert(/ProceduralPaletteWorkspace/.test(mainText), "main.js should initialize the Palette Workspace controller.");
    assert(/renderPaletteLibrarySettings[\s\S]*controller\.refresh\(\)/.test(mainText), "main.js should refresh Palette Workspace through controller API.");
    assert(/closePaletteWorkspace[\s\S]*controller\.close\(options\)/.test(mainText), "main.js should close Palette Workspace through controller API.");
    assert(/closeSettingsPanel[\s\S]*closePaletteWorkspace\(\{\s*reason:\s*"settings-close",\s*animate:\s*false\s*\}\)[\s\S]*beginAnimation\(\)/.test(mainText), "Settings close should reset Palette Workspace before parent close animation.");
    assert(/openSettingsPanel[\s\S]*ensurePaletteWorkspaceClosed\(\)[\s\S]*beginAnimation\(\)/.test(mainText), "Settings open should defensively restore the closed workspace state.");
    assert(/teardownPaletteWorkspace[\s\S]*controller\.teardown\(\)/.test(mainText), "main.js should teardown Palette Workspace through controller API.");
    assert(!/querySelector\(".*palette-|querySelectorAll\(".*palette-/.test(mainText), "main.js should not query Palette Workspace internal DOM.");
    assert(!/setTransientPalette|updateBuiltInOverride|deletePalette|importData\(/.test(mainText), "main.js should not call Palette Store palette mutation APIs directly.");
    assertions += 8;

    assert(/function resetWorkspaceDomState/.test(workspaceText), "Controller should expose one atomic DOM reset implementation internally.");
    assert(/closeWorkspace\(\{ reason: "back", animate: true \}\)/.test(workspaceText), "Back button should use the unified animated close API.");
    assert(/reason === "back"/.test(workspaceText), "Only back navigation should use the internal reverse animation.");
    assert(/view\.classList\.remove\([\s\S]*"is-palette-workspace"[\s\S]*"is-palette-workspace-transitioning"[\s\S]*"is-resizing-palette-layout"/.test(workspaceText), "Atomic reset should clear workspace, transition, and resize classes.");
    assert(/workspace\.setAttribute\("aria-hidden", "true"\)/.test(workspaceText), "Atomic reset should hide stale workspace accessibility state.");
    assert(/settingsRenderer\.setAttribute\("aria-hidden", "false"\)/.test(workspaceText), "Atomic reset should restore ordinary Settings accessibility state.");
    assert(/discardTransientEditorState/.test(workspaceText), "Direct close should discard transient unsaved editor state.");
    assertions += 7;

    assert(!/localStorage/.test(workspaceText), "Controller should not directly use localStorage.");
    assert(!/ProceduralPaletteLibrary|listPalettes\(|getPalette\(/.test(workspaceText), "Controller should not modify or read factory palette library internals.");
    assert(/readStorageValue/.test(workspaceText) && /writeStorageValue/.test(workspaceText), "Controller should persist UI width only through injected storage callbacks.");
    assert(storeModule.storageKey === "lomond.paletteStore.v2", "Production Palette Store must use the v2 authority key.");
    assert(storeModule.legacyStorageKey === "lomond.proceduralPaletteStore.v1", "The v1 key must remain migration-only evidence.");
    assert(storeModule.schemaVersion === 2, "Production Palette Store schema must be v2.");
    assertions += 5;

    assert(/createNativeNewEditorState/.test(workspaceText), "Controller should use the native v2 New transient draft workflow.");
    assert(/createNativeDuplicateEditorState/.test(workspaceText), "Controller should use the native v2 Duplicate transient draft workflow.");
    assert(/pendingTransition/.test(workspaceText), "Controller should preserve dirty transition guard.");
    assert(/deleteConfirmationId/.test(workspaceText), "Controller should preserve delete confirmation state.");
    assert(/importData\(importTextarea\.value,\s*\{\s*mode:\s*mode\s*\}\)/.test(workspaceText), "Controller should preserve JSON merge/replace import.");
    assert(/setToolPalette/.test(workspaceText), "Controller should preserve Home tool palette mapping.");
    assertions += 6;

    // ---- Phase 4 update / projection seam (Issue 1 & Issue 2 regression guards) ----
    assert(/function applyResolvedSlotProjection/.test(workspaceText), "Controller should expose an in-place slot projection helper.");
    assert(/function refreshProjection/.test(workspaceText), "Controller should expose a live projection seam.");
    assert(/function refreshEditorPane/.test(workspaceText), "Controller should expose a local editor-scroll rebuild seam.");
    assert(/refreshEditorPane\(\)\s*\{[\s\S]*scroll\.innerHTML = ""[\s\S]*buildEditorContent\(scroll/.test(workspaceText), "Structural rebuild must reuse the existing .palette-editor-scroll (not mount.innerHTML).");

    // Structural slot edits must rebuild only the editor scroll region.
    assert(/moveNativeSlot\(editorState, slot\.id, -1\); refreshEditorPane\(\)/.test(workspaceText), "Move Up must use the local editor rebuild.");
    assert(/moveNativeSlot\(editorState, slot\.id, 1\); refreshEditorPane\(\)/.test(workspaceText), "Move Down must use the local editor rebuild.");
    assert(/editorState = result\.state; refreshEditorPane\(\)/.test(workspaceText), "Delete Slot must use the local editor rebuild.");
    assert(/\{ kind: kind \}\); refreshEditorPane\(\)/.test(workspaceText), "Kind change must use the local editor rebuild.");
    assert(/\{ derivationId: id \}\); refreshEditorPane\(\)/.test(workspaceText), "Derivation change must use the local editor rebuild.");
    assert(/addNativeSlot\(editorState, kind\); refreshEditorPane\(\)/.test(workspaceText), "Add Slot must use the local editor rebuild.");
    assert(!/slot\.id, (-1|1)\); refresh\(\)/.test(workspaceText), "Move must not route to a full workspace rebuild.");

    // Ordinary field edits must take the projection path (never a full render).
    assert(/next\.slots\[index\]\.derivation\.parameters\[name\] = value; \}, false\)/.test(workspaceText), "DERIVED parameter edits must take the projection path.");
    assert(/value\.color = normalized; \}, false\)/.test(workspaceText), "DIRECT color edits must take the projection path.");
    assert(/next\.profiles\.proceduralAppearance\.bindings\[role\] = slotId; \}, false\)/.test(workspaceText), "Profile binding edits must take the projection path.");
    assert(/refreshProjection\(validation\)/.test(workspaceText), "Draft mutations must re-project from the freshly resolved graph.");
    assert(/function mutateNativeDraft[\s\S]*if \(rerender\) \{ refresh\(\); return; \}[\s\S]*refreshProjection\(validation\)/.test(workspaceText), "Ordinary draft mutation must project without a full workspace rebuild.");
    assert(/function mutateDependencySource[\s\S]*refreshProjection\(validation\)/.test(workspaceText), "Source select changes must project (not rebuild) on the success path.");
    assert(/card\.setAttribute\("data-slot-id", slot\.id\)/.test(workspaceText), "Slot cards must carry a stable data-slot-id for in-place projection.");
    assertions += 18;

    console.log("PASS procedural palette workspace: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural palette workspace - " + error.message);
    process.exitCode = 1;
}
