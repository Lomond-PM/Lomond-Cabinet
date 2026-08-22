"use strict";

const path = require("path");
const root = path.resolve(__dirname, "..");
const storeModule = require(path.join(root, "client", "js", "palette", "paletteStore.js"));
const migration = require(path.join(root, "client", "js", "palette", "legacyPaletteMigration.js"));
const resolver = require(path.join(root, "client", "js", "palette", "paletteResolver.js"));
const registry = require(path.join(root, "client", "js", "palette", "colorDerivationRegistry.js"));
const legacyLibrary = require(path.join(root, "client", "js", "proceduralPaletteLibrary.js"));

let assertions = 0;
function assert(condition, message) { assertions += 1; if (!condition) throw new Error(message); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function memoryStorage(initial) {
    const data = Object.assign({}, initial || {});
    return {
        data,
        writes: 0,
        failWrite: false,
        failNextWriteAfterSet: false,
        getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
        setItem(key, value) { if (this.failWrite) throw new Error("write failed"); this.writes += 1; data[key] = String(value); if (this.failNextWriteAfterSet) { this.failNextWriteAfterSet = false; throw new Error("partial write failed"); } },
        removeItem(key) { delete data[key]; }
    };
}

const legacyBuiltInPalettes = legacyLibrary.listPalettes();
const builtInPalettes = legacyBuiltInPalettes.map((palette) => migration.convertLegacyPalette(palette, "builtIn", { registry }).palette);
let clockTick = 0;
const clock = () => `2026-08-22T00:00:${String(clockTick++).padStart(2, "0")}.000Z`;
function createStore(storage) { return storeModule.create({ storage, builtInPalettes, legacyBuiltInPalettes, registry, clock }); }
function direct(id, color) { return { id, label: id, kind: "DIRECT", value: { color } }; }
function reference(id, target) { return { id, label: id, kind: "REFERENCE", reference: { slotId: target } }; }
function customPalette(id, color) {
    return { id, revision: 1, metadata: { displayName: id, family: "custom", origin: "custom" }, slots: [direct("base", color || "#123456")] };
}
function legacyEnvelope() {
    return {
        format: migration.v1Format,
        schemaVersion: 1,
        customPalettes: [{
            id: "legacyImport", version: 1, family: "custom", displayName: "Legacy Import",
            colors: { shadow: "#101010", base: "#303030", secondary: "#808080", highlight: "#F0F0F0" },
            stops: [0, 0.3, 0.7, 1], weights: { shadow: 0.2, base: 0.5, secondary: 0.2, highlight: 0.1 }
        }],
        builtInOverrides: {}, hiddenBuiltInPaletteIds: [], toolPaletteMap: { legacyTool: "legacyImport" }, updatedAt: ""
    };
}

let storage = memoryStorage();
let store = createStore(storage);
let result = store.load();
assert(result.ok && result.status === "EMPTY", "Empty storage must load an empty v2 Store.");
assert(store.listPalettes(true).length === builtInPalettes.length, "Empty user Store must still expose injected built-in canonicals.");
assert(!storage.getItem(storeModule.storageKey), "Empty load must not eagerly persist state.");

result = store.createCustomPalette(customPalette("customA", "#123456"));
assert(result.ok && !!storage.getItem(storeModule.storageKey), "Valid custom creation must persist a complete v2 envelope.");
assert(store.getPalette("customA").metadata.origin === "custom", "Created custom Palette must be retrievable.");
const savedBytes = storage.getItem(storeModule.storageKey);
const reloaded = createStore(storage);
result = reloaded.load();
assert(result.ok && result.status === "LOADED" && reloaded.getPalette("customA").slots[0].value.color === "#123456", "Valid v2 state must round-trip through storage.");

const badStorage = memoryStorage({ [storeModule.storageKey]: "{" });
const badStore = createStore(badStorage);
result = badStore.load();
assert(!result.ok && result.errors[0].code === "INVALID_V2", "Invalid v2 JSON must be rejected.");
assert(badStorage.getItem(storeModule.storageKey) === "{", "Invalid load must not overwrite recovery evidence.");

const writesBeforeInvalid = storage.writes;
result = store.createCustomPalette(customPalette("bad id", "#123456"));
assert(!result.ok && storage.writes === writesBeforeInvalid, "Invalid write input must be rejected before storage.");
result = store.createCustomPalette(customPalette("customA", "#654321"));
assert(!result.ok && result.errors[0].code === "DUPLICATE_PALETTE_ID", "Duplicate Palette ID must be rejected.");

const updated = customPalette("customA", "#ABCDEF");
updated.revision = 2;
result = store.updateCustomPalette("customA", updated);
assert(result.ok && store.getPalette("customA").revision === 2 && store.getPalette("customA").slots[0].value.color === "#ABCDEF", "Custom update must preserve identity and persist new content.");
result = store.updateCustomPalette("customA", customPalette("renamedId", "#FFFFFF"));
assert(!result.ok && result.errors[0].code === "PALETTE_KIND_MISMATCH", "Custom update must not change Palette identity.");

result = store.setToolPaletteMapping("toolA", "customA");
assert(result.ok && store.getSnapshot().toolPaletteMap.toolA === "customA", "Tool mapping must persist paletteId live reference.");
result = store.setToolPaletteMapping("toolMissing", "missingPalette");
assert(!result.ok && result.errors[0].code === "INVALID_MAPPING", "Dangling tool mapping must be rejected.");
result = store.deleteCustomPalette("customA");
assert(result.ok && result.removedToolMappings[0] === "toolA" && !store.getPalette("customA"), "Deleting custom Palette must remove its tool mappings.");
assert(!Object.prototype.hasOwnProperty.call(store.getSnapshot().toolPaletteMap, "toolA"), "Custom delete must leave no dangling mapping.");

const canonical = store.getPalette("pacificCyan");
const override = clone(canonical);
override.revision += 1;
override.metadata.displayName = "Pacific Override";
override.slots[0].value.color = "#111111";
result = store.setBuiltInOverride("pacificCyan", override);
assert(result.ok, "Valid built-in override must persist.");
assert(store.getSnapshot().builtInOverrides.pacificCyan.paletteId === "pacificCyan", "Built-in override must remain an override record.");
assert(store.getPalette("pacificCyan").metadata.origin === "builtIn" && store.getPalette("pacificCyan").slots[0].value.color === "#111111", "Resolved override must retain built-in identity.");
result = store.removeBuiltInOverride("pacificCyan");
assert(result.ok && store.getPalette("pacificCyan").slots[0].value.color === canonical.slots[0].value.color, "Removing override must represent Reset to canonical.");

result = store.setBuiltInHidden("temporarilyUnknownBuiltIn", true);
assert(result.ok && store.getSnapshot().hiddenBuiltInPaletteIds[0] === "temporarilyUnknownBuiltIn", "Well-shaped unknown hidden built-in id must be preserved.");
result = store.setBuiltInHidden("temporarilyUnknownBuiltIn", false);
assert(result.ok && store.getSnapshot().hiddenBuiltInPaletteIds.length === 0, "Hidden built-in state must support unhide.");
result = store.setBuiltInHidden("mossGold", true);
assert(result.ok && store.listPalettes(false).length === store.listPalettes(true).length - 1, "Known hidden built-in must be excluded only from the default list.");
store.setBuiltInHidden("mossGold", false);
result = store.setToolPaletteMapping("builtInTool", "pacificCyan");
assert(result.ok && store.getSnapshot().toolPaletteMap.builtInTool === "pacificCyan", "Tool mapping must support built-in Palette IDs.");
result = store.removeToolPaletteMapping("builtInTool");
assert(result.ok && !Object.prototype.hasOwnProperty.call(store.getSnapshot().toolPaletteMap, "builtInTool"), "Tool mapping removal must persist without fallback materialization.");

result = store.createCustomPalette(customPalette("exported", "#224466"));
assert(result.ok, "Export fixture custom Palette must be created.");
const exportedA = store.exportData();
const exportedB = store.exportData();
assert(exportedA.ok && exportedA.data.format === "lomond.paletteStore" && exportedA.data.schemaVersion === 2, "Export must use versioned v2 format.");
assert(exportedA.json === exportedB.json, "Unchanged Store export must use deterministic canonical serialization.");
assert(storeModule.validateEnvelope(JSON.parse(exportedA.json), { builtInPalettes, registry }).ok, "Export JSON must validate as v2.");

storage = memoryStorage();
store = createStore(storage);
store.load();
result = store.importData(exportedA.json, { mode: "replace" });
assert(result.ok && store.getPalette("exported"), "v2 replace import must transactionally replace user state.");

const importEnvelope = storeModule.emptyEnvelope();
const referencePalette = customPalette("exported", "#112233");
referencePalette.slots.push(reference("alias", "base"));
importEnvelope.customPalettes.push(referencePalette);
importEnvelope.toolPaletteMap.importTool = "exported";
storage = memoryStorage();
store = createStore(storage);
store.load();
store.createCustomPalette(customPalette("exported", "#445566"));
result = store.importData(importEnvelope, { mode: "merge" });
assert(result.ok && result.remappedPaletteIds.exported === "exported_imported", "Merge collision must use deterministic Palette ID remap.");
const remappedPalette = store.getPalette("exported_imported");
assert(remappedPalette && remappedPalette.slots[1].reference.slotId === "base", "Same-Palette slot references must survive Palette ID remap unchanged.");
assert(resolver.resolvePalette(remappedPalette, { registry }).colors.alias === "#112233", "Remapped Palette dependency graph must still resolve.");
assert(store.getSnapshot().toolPaletteMap.importTool === "exported_imported", "Imported tool mappings must follow deterministic Palette ID remap.");

storage = memoryStorage();
store = createStore(storage);
store.load();
result = store.importData(legacyEnvelope(), { mode: "replace" });
assert(result.ok && store.getPalette("legacyImport") && store.getSnapshot().toolPaletteMap.legacyTool === "legacyImport", "v2 importer must support in-memory v1 compatibility migration.");
assert(result.migrationDiagnostics && result.migrationDiagnostics.accepted.customPalettes[0] === "legacyImport", "v1 import compatibility must retain migration diagnostics.");
assert(!storage.getItem(migration.v1Key), "v1 import compatibility must not require or create global v1 storage.");

storage = memoryStorage({ [migration.v1Key]: JSON.stringify(legacyEnvelope()) });
store = createStore(storage);
result = store.migrateLegacy();
assert(result.ok && result.status === "MIGRATED" && store.getPalette("legacyImport"), "Store migration facade must adopt a fully validated migrated envelope.");
assert(storage.getItem(migration.v1Key) === JSON.stringify(legacyEnvelope()), "Store migration facade must preserve v1 source bytes.");

storage = memoryStorage();
store = createStore(storage);
store.load();
store.createCustomPalette(customPalette("stableBeforeFailure", "#778899"));
const snapshotBeforeFailure = JSON.stringify(store.getSnapshot());
storage.failWrite = true;
result = store.createCustomPalette(customPalette("mustNotCommit", "#AABBCC"));
assert(!result.ok && result.errors[0].code === "STORAGE_WRITE_FAILED", "CRUD storage failure must be typed.");
assert(JSON.stringify(store.getSnapshot()) === snapshotBeforeFailure && !store.getPalette("mustNotCommit"), "Storage failure must not mutate in-memory committed state.");

storage.failWrite = false;
const bytesBeforePartialFailure = storage.getItem(storeModule.storageKey);
storage.failNextWriteAfterSet = true;
result = store.createCustomPalette(customPalette("partialMustRollback", "#CCDDEE"));
assert(!result.ok && storage.getItem(storeModule.storageKey) === bytesBeforePartialFailure, "A partial adapter write failure must restore the previous complete v2 envelope.");
assert(!store.getPalette("partialMustRollback"), "Partial write rollback must preserve committed in-memory state.");

const invalidEnvelope = storeModule.emptyEnvelope();
invalidEnvelope.toolPaletteMap.badTool = "missing";
assert(!storeModule.validateEnvelope(invalidEnvelope, { builtInPalettes, registry }).ok, "Complete v2 validation must reject dangling mappings.");

console.log(`PASS palette store v2: ${assertions} assertions.`);
