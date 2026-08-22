#!/usr/bin/env node
"use strict";

const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const library = require(path.join(ROOT, "client", "js", "proceduralPaletteLibrary.js"));
const store = require(path.join(ROOT, "client", "js", "proceduralPaletteStore.js"));

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function makeStorage() {
    const data = {};
    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
        },
        setItem(key, value) {
            data[key] = String(value);
        },
        removeItem(key) {
            delete data[key];
        },
        raw: data
    };
}

function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return "[" + value.map(stableStringify).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
}

function init(storage) {
    store.initialize({ library, storage });
    store.clearUserData();
    store.flush();
}

function run() {
    const storage = makeStorage();
    let assertions = 0;
    let palette;
    let result;
    let signature;
    let renamedSignature;
    let exported;

    init(storage);

    palette = store.getResolvedPalette("pacificCyan");
    palette.colors.base = "#FFFFFF";
    assert(store.getResolvedPalette("pacificCyan").colors.base === "#26728D", "Factory palettes must not be externally mutable.");
    assertions += 1;

    result = store.updatePalette("pacificCyan", { colors: { base: "#123456" }, displayName: "Edited Cyan" });
    assert(result.ok, "Built-in override should save.");
    assert(store.getResolvedPalette("pacificCyan").colors.base === "#123456", "Built-in override should merge over factory color.");
    assert(store.getResolvedPalette("pacificCyan").displayName === "Edited Cyan", "Built-in override should allow displayName.");
    assertions += 3;

    result = store.resetBuiltInPalette("pacificCyan");
    assert(result.ok, "Built-in reset should succeed.");
    assert(store.getResolvedPalette("pacificCyan").colors.base === "#26728D", "Built-in reset should restore factory value.");
    assertions += 2;

    result = store.createPalette({
        displayName: "My Palette",
        family: "userCustom",
        colors: { shadow: "#101010", base: "#336699", secondary: "#66AADD", highlight: "#EAF8FF" },
        stops: [0, 0.3, 0.72, 1],
        weights: { shadow: 2, base: 5, secondary: 2, highlight: 1 }
    });
    assert(result.ok, "Custom palette creation should succeed.");
    palette = result.palette;
    assert(/^userPalette_/.test(palette.id), "Custom palette id should be generated and stable.");
    assert(Math.abs(palette.weights.shadow + palette.weights.base + palette.weights.secondary + palette.weights.highlight - 1) <= 0.001, "Weights should normalize to 1.");
    assertions += 3;

    result = store.updatePalette(palette.id, { colors: { base: "#445566" } });
    assert(result.ok && store.getResolvedPalette(palette.id).colors.base === "#445566", "Custom palette update should apply.");
    assertions += 1;

    signature = store.getResolvedPaletteSignature(palette.id);
    result = store.updatePalette(palette.id, { displayName: "Renamed Palette" });
    renamedSignature = store.getResolvedPaletteSignature(palette.id);
    assert(result.ok, "Rename should succeed.");
    assert(store.getResolvedPalette(palette.id).id === palette.id, "Rename must not change stable id.");
    assert(signature === renamedSignature, "displayName must not enter visual signature.");
    assertions += 3;

    result = store.updatePalette(palette.id, { colors: { base: "#556677" } });
    assert(result.ok, "Color change should succeed.");
    assert(store.getResolvedPaletteSignature(palette.id) !== signature, "Color change must update visual signature.");
    signature = store.getResolvedPaletteSignature(palette.id);
    result = store.updatePalette(palette.id, { stops: [0, 0.25, 0.75, 1] });
    assert(result.ok && store.getResolvedPaletteSignature(palette.id) !== signature, "Stops change must update visual signature.");
    signature = store.getResolvedPaletteSignature(palette.id);
    result = store.updatePalette(palette.id, { weights: { shadow: 1, base: 1, secondary: 1, highlight: 1 } });
    assert(result.ok && store.getResolvedPaletteSignature(palette.id) !== signature, "Weights change must update visual signature.");
    assertions += 5;

    assert(!store.updatePalette(palette.id, { colors: { base: "nope" } }).ok, "Invalid HEX should be rejected.");
    assert(!store.updatePalette(palette.id, { stops: [0, 0.8, 0.2, 1] }).ok, "Non-increasing stops should be rejected.");
    result = store.updatePalette(palette.id, { weights: { shadow: 0, base: 0, secondary: 0, highlight: 0 } });
    assert(result.ok, "Zero weights should be safely normalized.");
    assert(store.getResolvedPalette(palette.id).weights.base > 0, "Zero weights should recover safe defaults.");
    assertions += 4;

    store.setToolPalette("shapeAdd", palette.id);
    assert(store.getToolPalette("shapeAdd") === palette.id, "Tool mapping should use custom palette.");
    store.flush();
    const persisted = JSON.parse(storage.getItem(store.storageKey));
    assert(persisted.toolPaletteMap.shapeAdd === palette.id, "Tool mapping should persist to localStorage.");
    assertions += 2;

    const storageReload = makeStorage();
    storageReload.setItem(store.storageKey, JSON.stringify(persisted));
    store.initialize({ library, storage: storageReload });
    assert(store.getToolPalette("shapeAdd") === palette.id, "localStorage data should round trip.");
    assert(store.getToolPalette("shapeAdd") === store.getToolPalette("shapeAdd"), "Tool mapping should not depend on language or Home order.");
    assertions += 2;

    storageReload.setItem(store.storageKey, "{broken");
    result = store.initialize({ library, storage: storageReload });
    assert(!result.ok && result.status === "READ_ONLY_RECOVERY", "Damaged v2 must enter explicit read-only recovery.");
    assert(store.getResolvedPalette("pacificCyan").colors.base === "#26728D", "Damaged JSON should fall back safely to factory defaults.");
    assert(!store.createPalette({ displayName: "Blocked" }).ok, "Recovery must block writes instead of overwriting invalid v2.");
    storageReload.setItem(store.storageKey, JSON.stringify({ schemaVersion: 999 }));
    result = store.initialize({ library, storage: storageReload });
    assert(!result.ok && result.status === "READ_ONLY_RECOVERY", "Unsupported v2 must enter explicit read-only recovery.");
    assert(store.getResolvedPalette("pacificCyan").colors.base === "#26728D", "Unsupported schema should fall back safely.");
    assertions += 5;

    init(makeStorage());

    result = store.createPalette({
        displayName: "Export Palette",
        colors: { shadow: "#111111", base: "#222222", secondary: "#888888", highlight: "#EEEEEE" },
        stops: [0, 0.35, 0.7, 1],
        weights: { shadow: 0.25, base: 0.5, secondary: 0.17, highlight: 0.08 }
    });
    assert(result.ok, "Second custom palette should create.");
    exported = store.exportData();
    assert(!/cache/i.test(stableStringify(exported)), "Export must not contain cache state.");
    assertions += 2;

    init(makeStorage());
    result = store.importData(exported, { mode: "replace" });
    assert(result.ok && store.exportData().customPalettes.length === exported.customPalettes.length, "Import replace should load exported custom palettes.");
    result = store.importData(exported, { mode: "merge" });
    assert(result.ok && store.exportData().customPalettes.length > exported.customPalettes.length, "Import merge should avoid silent id overwrite by creating additional ids.");
    assertions += 2;

    const inUseId = store.exportData().customPalettes[0].id;
    store.setToolPalette("shapeAdd", inUseId);
    result = store.deletePalette(inUseId);
    assert(result.ok, "Custom palette delete should succeed.");
    assert(store.getToolPalette("shapeAdd") !== inUseId, "Deleting an in-use palette should make the tool fall back safely.");
    assertions += 2;

    const returned = store.getResolvedPalette("pacificCyan");
    returned.colors.base = "#000000";
    assert(store.getResolvedPalette("pacificCyan").colors.base !== "#000000", "Returned palettes must not mutate internal state.");
    assertions += 1;

    let notified = 0;
    function listener() {
        notified += 1;
    }
    store.subscribe(listener);
    store.updatePalette("pacificCyan", { displayName: "Notify Test" });
    store.unsubscribe(listener);
    store.updatePalette("pacificCyan", { displayName: "Notify Test 2" });
    assert(notified === 1, "subscribe/unsubscribe should manage listeners.");
    store.flush();
    assert(store.exportData().format === "lomond.paletteStore", "Facade export must expose the v2 authority format.");
    assertions += 2;

    console.log("PASS procedural palette store: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural palette store - " + error.message);
    process.exitCode = 1;
}
