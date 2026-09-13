"use strict";
// Actual stores/resolvers/router/workspace; faults only at the storage boundary.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Palette = require("../client/js/palette/paletteStore.js");
const AppearanceStore = require("../client/js/appearance/appearanceStateStore.js").AppearanceStateStore;
const Appearance = require("../client/js/appearance/appearanceResolver.js").AppearanceResolver;
const Registry = require("../client/js/appearance/appearanceParameterRegistry.js").AppearanceParameterRegistry;
const TuningStore = require("../client/js/designTuning/designTuningStateStore.js");
const Tuning = require("../client/js/designTuning/designTuningResolver.js");
const TuningRegistry = require("../client/js/designTuning/designTuningParameterRegistry.js");
const Router = require("../client/js/system/systemSurfaceRouter.js");
const Store = require("../client/js/proceduralPaletteStore.js");
const Workspace = require("../client/js/proceduralPaletteWorkspace.js");
const Editor = require("../client/js/proceduralPaletteEditor.js");
const Library = require("../client/js/proceduralPaletteLibrary.js");
const fixture = require("./test-palette-workspace-continuity.js");
const CoreUI = require("../client/js/ui/coreUi.js");
let assertions = 0;
function eq(a, b, message) { assertions++; assert.deepStrictEqual(a, b, message); }
function ok(value, message) { assertions++; assert.ok(value, message); }
function memory(initial = {}) {
    const values = { ...initial }; const calls = [];
    const control = { readFail: false, writeFail: false };
    return { values, calls, control,
        getItem(k) { calls.push("read"); if (control.readFail) throw Error("read-fault"); return Object.hasOwn(values, k) ? values[k] : null; },
        setItem(k, v) { calls.push("write"); if (control.writeFail) throw Error("write-fault"); values[k] = String(v); },
        removeItem(k) { calls.push("remove"); delete values[k]; }
    };
}

for (const previous of [null, "old-asset"]) {
    for (const mode of ["read", "before-write", "after-write", "restore-fails", "success"]) {
        let value = previous; let writes = 0; let removes = 0;
        const storage = {
            getItem() { if (mode === "read") throw Error("read-fault"); return value; },
            setItem(k, v) { writes++; if (mode === "before-write") throw Error("write-fault"); if (writes > 1 && mode === "restore-fails") throw Error("restore-fault"); value = v; if (writes === 1 && ["after-write", "restore-fails"].includes(mode)) throw Error("write-after-effect"); },
            removeItem() { removes++; if (mode === "restore-fails") throw Error("restore-fault"); value = null; }
        };
        const store = Palette.create({ storage });
        const result = store.importData(Palette.emptyEnvelope(), { mode: "replace" });
        eq(result.ok, mode === "success", mode);
        if (mode === "read") { eq([writes, removes], [0, 0]); eq(result.transaction.oldValueReadSucceeded, false); }
        if (mode === "before-write") { eq(removes, 0); eq(result.transaction.writeSucceeded, false); eq(result.transaction.rollbackAttempted, false); }
        if (mode === "after-write") { eq(result.transaction.rollbackSucceeded, true); eq(result.transaction.writeSucceeded, true); }
        if (mode === "restore-fails") { eq(result.transaction.rollbackSucceeded, false); eq(result.errors.map(x => x.code), ["STORAGE_WRITE_FAILED", "STORAGE_ROLLBACK_FAILED"]); }
        if (!["restore-fails", "success"].includes(mode)) eq(value, previous, "preserve reliable prior asset");
        if (mode !== "success") eq(store.getSnapshot().customPalettes, []);
    }
}
for (const storage of [undefined, { setItem() { throw Error("must not write"); } }]) {
    const result = Palette.create({ storage }).importData(Palette.emptyEnvelope(), { mode: "replace" });
    eq(result.persisted, false); eq(result.transaction.writeAttempted, false);
}

for (const kind of ["appearance", "tuning"]) {
    const module = kind === "appearance" ? AppearanceStore : TuningStore;
    const registry = kind === "appearance" ? Registry : TuningRegistry;
    const id = kind === "appearance" ? "text.secondary" : "motion.curve.enter";
    const value = kind === "appearance" ? { color: "#112233", alpha: 0.6 } : { x1: 0.2, y1: 1, x2: 0.4, y2: 1 };
    const storage = memory(); const store = module.create({ storage, registry }); store.load();
    const resolver = kind === "appearance" ? Appearance.create({ store, registry }) : Tuning.create({ store, registry, rootStyle: { setProperty() {}, removeProperty() {} }, readComputed() { return ""; }, parseShadow() { return {}; }, parseColorAlpha() { return {}; }, getCanonicalDuration() { return 100; } });
    resolver.initialize();
    const commit = kind === "appearance" ? resolver.commit : resolver.setOverride;
    storage.control.writeFail = true;
    const result = commit(id, value);
    eq([result.accepted, result.applied, result.persisted], [true, true, false], kind);
    eq(store.getPersistenceState().dirty, true); eq(store.getPersistenceState().canRestore, true);
    const snapshot = store.getOverrides(); const original = { ...value };
    value[kind === "appearance" ? "alpha" : "x1"] = 0.9;
    snapshot[id][kind === "appearance" ? "alpha" : "x1"] = 0.8;
    eq(store.getOverride(id), original, "input and output are independent");
    storage.control.writeFail = false;
    eq(resolver.retrySave().persisted, true); eq(store.getPersistenceState().dirty, false);
    eq(JSON.parse(storage.values[module.storageKey]).overrides[id], original);
    storage.control.writeFail = true;
    const reset = kind === "appearance" ? resolver.reset : resolver.resetParameter;
    eq(reset(id).persisted, false); eq(store.getPersistenceState().dirty, true);
    eq(resolver.restoreSaved().persisted, true); eq(store.getOverride(id), original);
    storage.control.readFail = true;
    const count = storage.calls.filter(x => x === "write").length;
    eq(resolver.retrySave().persisted, false); eq(storage.calls.filter(x => x === "write").length, count);
    eq(resolver.restoreSaved().accepted, false); eq(store.getOverride(id), original);
    const missing = module.create({ registry }); missing.setOverride(id, original);
    eq(missing.save().persisted, false); eq(missing.getPersistenceState().canRestore, false); eq(missing.restoreSaved().accepted, false);
    const unreadable = memory({ [module.storageKey]: "not-json" }); const bad = module.create({ storage: unreadable, registry }); bad.load(); bad.setOverride(id, original);
    eq(bad.save().persisted, false); eq(unreadable.values[module.storageKey], "not-json");
    eq(unreadable.calls.includes("write"), false);
}
ok(Object.isFrozen(Appearance.designDefaults["text.secondary"]));
{
    const doc = new fixture.FakeDocument(); const mount = doc.createElement("section"); doc.body.appendChild(mount);
    const io = memory(); const store = AppearanceStore.create({storage:io,registry:Registry});
    let owner;
    const render = () => CoreUI.renderAssetPersistenceNotice({ owner, document:doc, mount, translate:key=>key });
    owner = Appearance.create({ store, registry:Registry, onPersistenceResult:render }); owner.initialize();
    io.control.writeFail=true; owner.commit("text.secondary",{color:"#112233",alpha:0.5});
    ok(mount.querySelector(".asset-persistence-notice"), "actual shared consumer shows failed receipt");
    function click(key) { const button=doc._walk().find(el=>el.getAttribute("data-i18n")===key); ok(button); button.dispatchEvent({type:"click"}); }
    io.control.writeFail=false; click("common.retry"); eq(!!mount.querySelector(".asset-persistence-notice"),false); eq(store.getPersistenceState().persisted,true);
    io.control.writeFail=true; owner.reset("text.secondary"); click("assets.restoreSaved");
    eq(store.getOverride("text.secondary").alpha,0.5); eq(!!mount.querySelector(".asset-persistence-notice"),false);
}
const a = Appearance.create({ registry: Registry }); a.initialize();
const b = Appearance.create({ registry: Registry }); b.initialize();
a.getResolvedValue("text.secondary").alpha = 0;
eq(b.getResolvedValue("text.secondary").alpha, 0.66);

function workspaceHarness() {
    const doc = new fixture.FakeDocument(); const win = fixture.makeWindow(doc);
    const view = doc.createElement("div"); view.id = "settingsView";
    const content = doc.createElement("div"); content.className = "settings-content";
    const root = doc.createElement("div"); root.className = "settings-renderer";
    const mount = doc.createElement("div"); mount.id = "settingsPaletteLibraryMount";
    doc.body.appendChild(view); view.appendChild(content); content.appendChild(root); root.appendChild(mount);
    const storage = memory(); const store = Store.create(); store.initialize({ storage, library: Library });
    const created = store.createV2Palette(fixture.makeDraft()); ok(created.persisted);
    const ws = Workspace.create(); const status = [];
    ws.initialize({ document: doc, window: win, PaletteStore: store, ProceduralPaletteEditor: Editor, ProceduralAppearance: fixture.makeAppearance(), CoreUI: fixture.makeCoreUI(), translate: x => x, setStatus: x => status.push(x), duration: () => 0, nextFrame: cb => cb(), createSettingsSectionHeader: () => doc.createElement("div") });
    ws.selectPalette(created.palette.id); ws.open(); win.flushTimers();
    const catalog = { getSystemSurface() { return { id: "settings", definition: { route: { defaultPage: "root", pages: ["root", "appearance"] } } }; } };
    let leaveRequests = 0;
    const router = Router.create({ catalog, beforeLeave(previous, next, done) { leaveRequests++; ws.requestLeave(done); }, callbacks: { close() { ws.close({ animate: false }); }, navigate() { ws.close({ animate: false }); } } }); router.open("settings");
    function button(key) { return doc._walk().find(el => el.getAttribute("data-i18n") === key && el.__onClick); }
    function click(key) { const target = button(key); ok(target, key); target.__onClick(); }
    function edit() { const input = doc.querySelector(".palette-editor-text"); ok(input); input.value = "E temporary draft"; input.__onInput(); }
    return { ws, router, storage, store, doc, status, click, button, edit, id: created.palette.id, get requests() { return leaveRequests; }, cleanup() { router.dispose(); ws.teardown(); } };
}
for (const leave of [h => h.ws.requestBack(), h => h.router.close(), h => h.router.navigate("appearance"), h => h.router.open("settings", "appearance")]) {
    const h = workspaceHarness();
    try {
        h.edit(); const route = h.router.getActiveRoute(); const scroll = h.doc.querySelector(".palette-editor-scroll"); const bytes = h.storage.values[Store.storageKey];
        leave(h); eq(h.ws.isOpen(), true); eq(h.router.getActiveRoute(), route);
        const oldSave = h.button("paletteLibrary.saveAndContinue");
        leave(h); eq(h.button("paletteLibrary.saveAndContinue"), oldSave, "no overlapping leave UI");
        h.click("paletteLibrary.cancel"); eq(h.router.getActiveRoute(), route); eq(h.ws.isOpen(), true); eq(h.doc.querySelector(".palette-editor-scroll"), scroll);
        leave(h); h.storage.control.writeFail = true; h.click("paletteLibrary.saveAndContinue");
        eq(h.ws.isOpen(), true); eq(h.router.getActiveRoute(), route); eq(h.storage.values[Store.storageKey], bytes); ok(h.status.includes("assets.notSaved"));
        h.storage.control.writeFail = false; h.click("paletteLibrary.saveAndContinue");
        // Back uses the existing animation; router close/page replacement is immediate.
        if (h.ws.isOpen()) h.ws.close({ animate: false });
        ok(h.storage.values[Store.storageKey] !== bytes, "normal save persisted before leaving");
        const saved = h.store.getV2Palette(h.id); ok(JSON.parse(h.storage.values[Store.storageKey]).customPalettes.some(p => p.id === saved.id));
        oldSave.__onClick(); eq(h.store.getV2Palette(h.id), saved, "stale confirmation cannot act on a new request");
    } finally { h.cleanup(); }
}
{
    const h = workspaceHarness();
    try { h.edit(); const bytes = h.storage.values[Store.storageKey]; h.router.close(); h.click("paletteLibrary.discardChanges"); eq(h.router.getActiveRoute(), null); eq(h.ws.isOpen(), false); eq(h.storage.values[Store.storageKey], bytes); }
    finally { h.cleanup(); }
}
{
    const h = workspaceHarness();
    try {
        h.edit(); let allowed = null;
        h.ws.requestLeave(value => { allowed = value; });
        h.click("paletteLibrary.saveAndContinue");
        eq(allowed, true);
        eq(!!h.doc.querySelector(".has-unsaved-palette-draft"), false, "save updates projection even if another owner keeps the surface open");
    } finally { h.cleanup(); }
}
{
    const h = workspaceHarness(); h.edit(); const route = h.router.getActiveRoute(); h.router.close(); const stale = h.button("paletteLibrary.saveAndContinue"); h.cleanup(); stale.__onClick(); eq(h.router.getActiveRoute(), null); eq(h.ws._debugState().hasStoreListener, false); ok(route);
}
// Source wiring complements the running production combination; actual keyboard/main
// dispatch is additionally exercised in CEP, not claimed by this source assertion.
const main = fs.readFileSync(path.join(__dirname, "../client/js/main.js"), "utf8");
ok(main.includes("event.keyCode === 27 && !event.defaultPrevented"));
ok(main.includes("beforeLeave: function (previous, next, settle) { requestSettingsLeave(settle); }"));
ok(main.includes('settingsBackdrop.addEventListener("click", requestCloseSettings)'));
ok(main.includes('closeSettingsBtn.addEventListener("click", requestSettingsBack)'));
ok(main.includes("window.CoreUI.renderAssetPersistenceNotice({"));
console.log(`User assets and exit safety: ${assertions} assertions PASS.`);
