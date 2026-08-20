"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIBRARY_PATH = path.join(ROOT, "client", "js", "proceduralPaletteLibrary.js");
const STORE_PATH = path.join(ROOT, "client", "js", "proceduralPaletteStore.js");
const EDITOR_PATH = path.join(ROOT, "client", "js", "proceduralPaletteEditor.js");
const WORKSPACE_PATH = path.join(ROOT, "client", "js", "proceduralPaletteWorkspace.js");
const MAIN_PATH = path.join(ROOT, "client", "js", "main.js");
const CSS_PATH = path.join(ROOT, "client", "css", "style.css");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function makeStorage() {
    const values = {};
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        removeItem(key) { delete values[key]; }
    };
}

function countIds(palettes) {
    return new Set(palettes.map((palette) => palette.id)).size;
}

function run() {
    delete require.cache[require.resolve(LIBRARY_PATH)];
    delete require.cache[require.resolve(STORE_PATH)];
    delete require.cache[require.resolve(EDITOR_PATH)];
    const library = require(LIBRARY_PATH);
    const store = require(STORE_PATH);
    const editor = require(EDITOR_PATH);
    const storage = makeStorage();
    const mainText = fs.readFileSync(MAIN_PATH, "utf8");
    const workspaceText = fs.readFileSync(WORKSPACE_PATH, "utf8");
    const cssText = fs.readFileSync(CSS_PATH, "utf8");
    let assertions = 0;
    let result;

    store.initialize({ library, storage });
    const initialCount = store.listResolvedPalettes(true).length;
    const factory = store.getResolvedPalette("pacificCyan");

    result = store.updateBuiltInOverride("pacificCyan", { displayName: "Pacific Test", colors: { base: "#315F78" } });
    assert(result.ok, "Built-in override save should succeed.");
    assert(store.hasBuiltInOverride("pacificCyan"), "Built-in override should be explicit.");
    assert(store.getPaletteKind("pacificCyan") === "builtIn", "Built-in kind should remain builtIn.");
    assert(store.listResolvedPalettes(true).length === initialCount, "Built-in save must not increase palette count.");
    assert(countIds(store.listResolvedPalettes(true)) === initialCount, "Resolved palette ids must remain unique.");
    assertions += 5;

    result = store.createPalette(Object.assign({}, factory, { displayName: "Custom A" }));
    assert(result.ok, "Custom palette creation should succeed.");
    const customId = result.palette.id;
    const countAfterCreate = store.listResolvedPalettes(true).length;
    const customIndex = store.listResolvedPalettes(true).map((palette) => palette.id).indexOf(customId);
    result = store.updatePalette(customId, { displayName: "Custom A Saved", colors: { secondary: "#79B8C7" } });
    assert(result.ok && result.palette.id === customId, "Custom save must preserve stable id.");
    assert(store.listResolvedPalettes(true).length === countAfterCreate, "Custom save must not add a palette.");
    assert(store.listResolvedPalettes(true).map((palette) => palette.id).indexOf(customId) === customIndex, "Custom save must preserve list order.");
    assert(store.getPaletteKind(customId) === "custom", "Custom kind should be explicit.");
    assertions += 5;

    const beforeNew = store.listResolvedPalettes(true).length;
    let state = editor.createNewEditorState(customId);
    assert(state.editorMode === "new" && state.dirty, "New should create an unsaved in-memory draft.");
    assert(store.listResolvedPalettes(true).length === beforeNew, "Entering New must not write to Store.");
    const canceledNewCount = store.listResolvedPalettes(true).length;
    assert(canceledNewCount === beforeNew, "Canceling New must leave palette count unchanged.");
    result = store.createPalette(state.draft);
    assert(result.ok && store.listResolvedPalettes(true).length === beforeNew + 1, "Saving New should create exactly one palette.");
    assertions += 4;

    const duplicateSource = store.getResolvedPalette(customId);
    const beforeDuplicate = store.listResolvedPalettes(true).length;
    state = editor.createDuplicateEditorState(duplicateSource, customId);
    assert(state.editorMode === "duplicate" && state.dirty, "Duplicate should create an unsaved draft.");
    assert(store.listResolvedPalettes(true).length === beforeDuplicate, "Entering Duplicate must not write to Store.");
    result = store.createPalette(state.draft);
    assert(result.ok && store.listResolvedPalettes(true).length === beforeDuplicate + 1, "Saving Duplicate should create exactly one palette.");
    assert(store.getResolvedPalette(customId).displayName === duplicateSource.displayName, "Duplicate must not modify its source.");
    assertions += 4;

    result = store.resetBuiltInPalette("pacificCyan");
    assert(result.ok && !store.hasBuiltInOverride("pacificCyan"), "Reset should remove built-in override.");
    assert(store.getResolvedPalette("pacificCyan").colors.base === factory.colors.base, "Reset should restore factory content.");
    assertions += 2;

    store.setToolPalette("shapeAdd", customId);
    result = store.deletePalette(customId);
    assert(result.ok, "Custom delete should succeed.");
    assert(store.getToolPalette("shapeAdd") !== customId, "Deleting an in-use palette should fall back safely.");
    assert(countIds(store.listResolvedPalettes(true)) === store.listResolvedPalettes(true).length, "Resolved list must stay de-duplicated after CRUD.");
    assert(store.listResolvedPalettes(true).filter((palette) => palette.id === "pacificCyan").length === 1, "Built-in override must not become a second list item.");
    assertions += 4;

    state = editor.createEditorState(factory);
    const originalSignature = state.sourceSignature;
    state = editor.updateEditorDraft(state, { displayName: "Draft Only" });
    assert(state.dirty, "Draft changes should set dirty.");
    assert(store.getResolvedPalette("pacificCyan").displayName !== "Draft Only", "Draft changes must not mutate Store.");
    state = editor.discardEditorDraft(state, factory);
    assert(!state.dirty && state.sourceSignature === originalSignature, "Cancel should restore the source draft.");
    state = editor.updateEditorDraft(state, { colors: { base: "invalid" } });
    assert(!store.validatePalette(Object.assign({}, state.draft, { id: "draft" })).ok, "Invalid draft should fail validation.");
    assertions += 4;

    assert(editor.getWorkspaceLayout(900) === "split", "Wide workspace should use split layout.");
    assert(editor.getWorkspaceLayout(520) === "stacked", "Narrow workspace should use stacked layout.");
    assert(editor.clampLibraryWidth(100) === 150, "Splitter width should clamp to minimum.");
    assert(editor.clampLibraryWidth(500) === 340, "Splitter width should clamp to maximum.");
    assert(editor.clampLibraryWidth(218) === 218, "Splitter width should preserve in-range values.");
    assert(editor.parseLibraryWidth("broken") === 210, "Damaged persisted width should use default.");
    assertions += 6;

    assert(editor.clampStopValue([0, 0.3, 0.7, 1], 0, 0.2, 0.01) === 0, "Stop 1 should remain fixed at zero.");
    assert(editor.clampStopValue([0, 0.3, 0.7, 1], 3, 0.8, 0.01) === 1, "Stop 4 should remain fixed at one.");
    assert(editor.clampStopValue([0, 0.3, 0.7, 1], 1, 0.9, 0.01) === 0.69, "Stop 2 should clamp below its next neighbor.");
    assert(editor.clampStopValue([0, 0.3, 0.7, 1], 2, 0.1, 0.01) === 0.31, "Stop 3 should clamp above its previous neighbor.");
    assert(!editor.hasPositiveWeightTotal({ shadow: 0, base: 0, secondary: 0, highlight: 0 }), "Zero weights must not be saveable.");
    assert(editor.hasPositiveWeightTotal({ shadow: 0, base: 0.5, secondary: 0, highlight: 0 }), "A positive weight total should be saveable.");
    assertions += 6;

    assert(/className\s*=\s*"registry-text-input palette-editor-text"/.test(workspaceText), "Display name must use the internal text input class.");
    assert(/className\s*=\s*"registry-textarea palette-json-box palette-json-(?:export|import)"/.test(workspaceText), "JSON must use the internal textarea class.");
    assert(/className\s*=\s*"palette-editor-action-bar"/.test(workspaceText), "Sticky action bar class must exist.");
    assert(/clearWorkspaceBindings[\s\S]*disconnect\(\)/.test(workspaceText), "Workspace teardown must disconnect resize observation.");
    assert(/\.palette-workspace\.is-stacked\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow-y:\s*auto/.test(cssText), "Stacked layout must become one vertical scroll composition.");
    assert(/\.palette-editor-action-bar\s*\{[\s\S]*flex:\s*0 0 auto/.test(cssText), "Action bar must remain visible outside the editor scroller.");
    assert(!/palette-editor-text[^\{]*\{[^\}]*background:\s*white/i.test(cssText), "Palette text input must not use a browser-default white background.");
    assert(/--radius-palette-preview:\s*var\(--radius-lg\)/.test(cssText), "Palette previews must expose one shared outer radius token.");
    assert(/\.palette-preview-shell\s*\{[^}]*border-radius:\s*var\(--radius-palette-preview\)/.test(cssText), "Icon and background preview shells must inherit the same outer radius.");
    assert(!/\.palette-preview-shell--(?:icon|background)\s*\{[^}]*border-radius:/.test(cssText), "Target-specific preview shells must not override the shared radius.");
    assert(/\.palette-preview-canvas\s*\{[\s\S]*border-radius:\s*0/.test(cssText), "Preview canvas must not own a radius.");
    assert(/\.palette-preview-shell\s*\{[\s\S]*overflow:\s*hidden/.test(cssText), "Preview shell must be the clipping owner.");
    assert(/\.palette-workspace\.is-stacked \.palette-editor-field\s*\{[^}]*gap:\s*calc\(8px \* var\(--ui-scale\)\)/.test(cssText), "Stacked fields must preserve readable label-to-control spacing.");
    assert(/\.palette-workspace\.is-stacked \.palette-editor-color-control\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(calc\(82px \* var\(--ui-scale\)\), 0\.55fr\)/.test(cssText), "Stacked color controls must reserve usable swatch and Hex widths.");
    assert(/requestAnimationFrame\(function \(\) \{[\s\S]*requestAnimationFrame\(function \(\)/.test(workspaceText), "Initial preview should wait for stable layout frames.");
    assert(/ResizeObserver[\s\S]*schedulePreview\(\)/.test(workspaceText), "Workspace resize should schedule preview raster redraw.");
    assert(/clearWorkspaceBindings[\s\S]*resizeObserver\.disconnect/.test(workspaceText), "Teardown should stop preview resize observation.");
    assert(/palette-editor-scroll ui-scroll-region/.test(workspaceText) && /palette-library-list ui-scroll-region/.test(workspaceText), "Wide Palette panes retain their intentional scroll declarations.");
    assert(/\.palette-workspace\.is-stacked \.palette-library-list,\s*\.palette-workspace\.is-stacked \.palette-editor-scroll\s*\{[^}]*overflow:\s*visible/.test(cssText), "Stacked Palette removes nested pane scrolling in favor of the workspace scroll owner.");
    assert(/workspace\.className\s*=\s*"palette-workspace"/.test(workspaceText), "Stacked workspace scroll ownership must be independent from scrollbar presentation opt-in.");
    assert(/ui-field-row--aligned/.test(workspaceText) && /settings-field-copy palette-editor-field-copy/.test(workspaceText), "Palette rows must consume CoreUI aligned FieldRow containment.");
    assert(/CoreUI\.createTextarea\(\{[\s\S]*palette-json-box palette-json-export[\s\S]*resizeDirection: "vertical"/.test(workspaceText) && /CoreUI\.createTextarea\(\{[\s\S]*palette-json-box palette-json-import[\s\S]*resizeDirection: "vertical"/.test(workspaceText), "Palette JSON surfaces use the shared editable textarea/frame contract.");
    assert(/(?:^|\n)\*\s*\{[^}]*scrollbar-color/.test(cssText), "Document scope owns native scrollbar presentation without consumer opt-in.");
    assert(!/\.palette-(?:library-list|editor-scroll|json-box)(?:::-webkit-scrollbar[^\{]*)?\s*\{[^}]*scrollbar-(?:color|width)|\.palette-(?:library-list|editor-scroll|json-box)::-webkit-scrollbar/.test(cssText), "Palette does not duplicate feature-specific scrollbar skin.");
    assert(/createPaletteNumberInput[\s\S]*setupRegistryNumberDrag/.test(workspaceText), "Palette numeric inputs must reuse the shared number helper.");
    assert(/setupRegistryNumberDrag[\s\S]*keyCode === 13[\s\S]*keyCode === 27[\s\S]*keyCode === 38/.test(mainText), "Shared number helper must cover Enter, Escape, and arrow stepping.");
    assert(/palette-editor-number/.test(workspaceText) && /registry-range-number/.test(workspaceText), "Palette numbers must use internal number input classes.");
    assert(/is-palette-workspace-entering/.test(workspaceText) && /is-palette-workspace-leaving/.test(workspaceText), "Settings and Palette Workspace must have symmetric transition states.");
    assert(/clearTransition/.test(workspaceText) && /is-palette-workspace-transitioning/.test(cssText), "Workspace transition cleanup and pointer blocking must exist.");
    assert(/palette-json-export/.test(workspaceText) && /readOnly\s*=\s*true/.test(workspaceText), "Export JSON must use a read-only output area.");
    assert(/palette-json-import/.test(workspaceText) && /pasteJsonPlaceholder/.test(workspaceText), "Import JSON must use a distinct editable input area.");
    assertions += 31;

    const deleteCandidate = store.createPalette(Object.assign({}, factory, { displayName: "Delete Persisted" })).palette;
    const countBeforeDelete = store.listResolvedPalettes(true).length;
    store.setToolPalette("textBackgroundBox", deleteCandidate.id);
    assert(store.getPaletteUsageCount(deleteCandidate.id) === 1, "Delete confirmation should report explicit tool usage.");
    result = store.deletePalette(deleteCandidate.id);
    assert(result.ok && result.removedToolMappings.length === 1, "Delete should report removed tool mappings.");
    assert(store.listResolvedPalettes(true).length === countBeforeDelete - 1, "Custom delete should reduce palette count by one.");
    assert(!store.listResolvedPalettes(true).some((palette) => palette.id === deleteCandidate.id), "Deleted palette must disappear from the UI source list.");
    assert(store.getToolPalette("textBackgroundBox") !== deleteCandidate.id, "Deleted palette mapping must fall back.");
    store.flush();
    store.initialize({ library, storage });
    assert(!store.getResolvedPalette(deleteCandidate.id), "Deleted palette must not return after Store reload.");
    assert(/currentKind === "builtIn"[\s\S]*restoreDefaults/.test(workspaceText), "Built-in action policy should use Restore Defaults.");
    assert(/currentKind === "custom"[\s\S]*deletePalette/.test(workspaceText), "Delete action must be limited to custom palettes.");
    assertions += 8;

    const beforeInvalidImport = JSON.stringify(store.exportData());
    result = store.validateImportData("{broken");
    assert(!result.ok, "Invalid JSON validation should fail.");
    assert(JSON.stringify(store.exportData()) === beforeInvalidImport, "Invalid JSON validation must not mutate Store.");
    const exported = store.exportData();
    assert(!/cache/i.test(JSON.stringify(exported)) && JSON.stringify(exported).indexOf("__palette_editor_preview__") === -1, "Export must exclude cache and transient draft data.");
    result = store.importData(exported, { mode: "merge" });
    assert(result.ok && store.getResolvedPalette("pacificCyan"), "Merge must retain current data and factory palettes.");
    result = store.importData(exported, { mode: "replace" });
    assert(result.ok && store.getResolvedPalette("pacificCyan"), "Replace must retain factory palettes.");
    assertions += 5;

    store.setTransientPalette("previewDraft", Object.assign({}, factory, { id: "previewDraft", colors: Object.assign({}, factory.colors, { base: "#335577" }) }));
    assert(store.getPaletteKind("previewDraft") === "transient", "Transient preview should have an explicit kind.");
    assert(store.listResolvedPalettes(true).every((palette) => palette.id !== "previewDraft"), "Transient preview must not enter the resolved list.");
    store.clearTransientPalette("previewDraft");
    assert(store.getResolvedPalette("previewDraft") === null, "Transient preview should clear cleanly.");
    assertions += 3;

    console.log("PASS procedural palette editor: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural palette editor - " + error.message);
    process.exitCode = 1;
}
