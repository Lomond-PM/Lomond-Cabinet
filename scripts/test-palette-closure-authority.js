#!/usr/bin/env node
"use strict";

/*
 * Phase 5 — Palette System Foundation authority closure.
 *
 * Proves the final production authority contract:
 *   1. v2 (`lomond.paletteStore.v2`) is the only persisted Palette authority; the v1
 *      key stays byte-identical through normal production writes / overrides / mapping.
 *   2. The facade delegates persistence to the v2 authority.
 *   3. Transient preview never enters the persisted envelope, export, or tool map.
 *   4. A complex v2 graph (DIRECT / REFERENCE / DERIVED + procedural profile bindings)
 *      survives export -> import roundtrip without degrading.
 *   5. LegacyProceduralPaletteAdapter is a pure projection (no storage path).
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const Library = require(path.join(ROOT, "client/js/proceduralPaletteLibrary.js"));
const Store = require(path.join(ROOT, "client/js/proceduralPaletteStore.js"));

function storage() {
    const values = {};
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        removeItem(key) { delete values[key]; },
        values
    };
}

function complexDraft() {
    return {
        id: "closureGraph",
        revision: 2,
        metadata: { displayName: "Closure Graph", family: "userCustom", origin: "custom" },
        slots: [
            { id: "A", label: "A", kind: "DIRECT", value: { color: "#112233" } },
            { id: "B", label: "B", kind: "DIRECT", value: { color: "#EEFFEE" } },
            { id: "C", label: "C", kind: "REFERENCE", reference: { slotId: "A" } },
            { id: "D", label: "D", kind: "DERIVED", derivation: { derivationId: "mix.v1", sourceSlotIds: ["A", "B"], parameters: { amount: 0.5 } } }
        ],
        profiles: { proceduralAppearance: {
            bindings: { shadow: "A", base: "C", secondary: "D", highlight: "B" },
            stops: [0, 0.34, 0.74, 1],
            weights: { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 },
            saturationBias: 0.1, luminanceBias: -0.05, contrastBias: 0
        } }
    };
}

function flat(draft) {
    return JSON.stringify((draft.slots || []).map((slot) => slot.id));
}

function run() {
    // ---- 1. v2 is the only persisted authority; v1 is never written by production. ----
    const target = storage();
    let result = Store.initialize({ library: Library, storage: target, clock: () => "2026-08-22T00:00:00.000Z" });
    assert(result && (result.status === "V2_CREATED" || result.status === "V2_LOADED"), "Facade should initialize against an empty v2 authority.");
    assert.strictEqual(result.status, "V2_CREATED", "An empty store should create the v2 envelope.");
    assert.strictEqual(Store.storageKey, "lomond.paletteStore.v2", "Facade exposes the v2 authority key.");
    assert.strictEqual(Store.legacyStorageKey, "lomond.proceduralPaletteStore.v1", "Facade exposes the v1 key only as legacy evidence.");

    const created = Store.createV2Palette(complexDraft());
    assert.strictEqual(created.ok, true, "A complex v2 graph should create.");
    const paletteId = created.v2Palette.id;

    // Built-in override + hide + tool mapping + save are all production writes.
    assert.strictEqual(Store.resetBuiltInPalette("pacificCyan").ok, true);
    assert.strictEqual(Store.hideBuiltInPalette("warmCoral", true).ok, true);
    assert.strictEqual(Store.setToolPalette("shapeAdd", paletteId).ok, true);
    assert.strictEqual(Store.saveV2Palette(paletteId, Object.assign({}, Store.getV2Palette(paletteId), { revision: 3 })).ok, true);

    assert.strictEqual(target.getItem("lomond.proceduralPaletteStore.v1"), null, "Production writes must never create or write the v1 key.");
    assert(target.getItem("lomond.paletteStore.v2"), "The v2 key must be populated by production writes.");

    // ---- 2. Transient preview is memory-only. ----
    Store.clearTransientPalette("preview");
    const transient = Store.setTransientV2Palette("preview", complexDraft());
    assert.strictEqual(transient.ok, true, "Transient preview should validate.");
    const snapshot = Store.getV2Snapshot();
    const exported = Store.exportData();
    assert(!(snapshot.customPalettes || []).some((palette) => palette.id === "preview"), "Transient must not enter the persisted customPalettes.");
    assert(!(snapshot.builtInOverrides || {})["preview"], "Transient must not enter builtInOverrides.");
    assert(!(snapshot.toolPaletteMap || {})["preview"], "Transient must not enter toolPaletteMap.");
    assert(!(exported.customPalettes || []).some((palette) => palette.id === "preview"), "Transient must not be exported.");
    assert.strictEqual(target.getItem("lomond.proceduralPaletteStore.v1"), null, "Transient preview must not write the v1 key.");
    Store.clearTransientPalette("preview");
    assert(!(Store.getV2Snapshot().customPalettes || []).some((palette) => palette.id === "preview"), "Cancel should fully clear the transient effect.");

    // ---- 3. Complex graph roundtrip via v2 export/import. ----
    const saved = Store.getV2Palette(paletteId);
    const envelope = Store.exportData();
    const roundtrip = Store.importData(JSON.stringify(envelope), { mode: "replace" });
    assert.strictEqual(roundtrip.ok, true, "Export -> import replace should succeed.");
    const imported = Store.getV2Palette(paletteId);
    assert.strictEqual(flat(imported), flat(saved), "Slot order/identity must survive a v2 roundtrip.");
    assert.strictEqual(imported.slots.find((slot) => slot.id === "C").kind, "REFERENCE", "REFERENCE must survive roundtrip.");
    assert.strictEqual(imported.slots.find((slot) => slot.id === "C").reference.slotId, "A", "Same-palette REFERENCE target must survive roundtrip.");
    const derived = imported.slots.find((slot) => slot.id === "D");
    assert.strictEqual(derived.derivation.derivationId, "mix.v1", "DERIVED derivation must survive roundtrip.");
    assert.deepStrictEqual(derived.derivation.sourceSlotIds, ["A", "B"], "DERIVED source list must survive roundtrip.");
    assert.deepStrictEqual(imported.profiles.proceduralAppearance.bindings, { shadow: "A", base: "C", secondary: "D", highlight: "B" }, "Procedural profile bindings must survive roundtrip.");
    assert.strictEqual(target.getItem("lomond.proceduralPaletteStore.v1"), null, "v1 must remain untouched by import.");

    // ---- 4. Legacy v1 import still migrates to v2 and leaves v1 intact. ----
    const v1Target = storage();
    const legacyCustom = {
        id: "legacyCustom", version: 1, displayName: "Legacy Custom", family: "custom",
        colors: { shadow: "#112233", base: "#445566", secondary: "#778899", highlight: "#AABBCC" },
        stops: [0, 0.34, 0.74, 1], weights: { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 }
    };
    const v1 = JSON.stringify({ format: "lomond.proceduralPaletteStore", schemaVersion: 1, customPalettes: [legacyCustom], builtInOverrides: {}, hiddenBuiltInPaletteIds: [], toolPaletteMap: {}, updatedAt: "" });
    v1Target.setItem("lomond.proceduralPaletteStore.v1", v1);
    let v1Result = Store.initialize({ library: Library, storage: v1Target, clock: () => "2026-08-22T00:00:00.000Z" });
    assert.strictEqual(v1Result.status, "V1_MIGRATED", "v1 must migrate to v2 on initialization.");
    assert(v1Target.getItem("lomond.paletteStore.v2"), "Migration should populate the v2 envelope.");
    assert.strictEqual(v1Target.getItem("lomond.proceduralPaletteStore.v1"), v1, "Migration must preserve the v1 rollback evidence.");

    // ---- 5. Legacy adapter is a pure compatibility projection (no storage path). ----
    const adapterText = fs.readFileSync(path.join(ROOT, "client/js/palette/legacyProceduralPaletteAdapter.js"), "utf8");
    assert(!/setItem|getItem|localStorage/.test(adapterText), "LegacyProceduralPaletteAdapter must hold no persistence path.");

    console.log("PASS Palette closure authority: v2 sole authority, v1 immutable, transient isolated, complex graph roundtrip, v1 migration, adapter projection-only.");
}

try {
    run();
} catch (error) {
    console.error("FAIL Palette closure authority - " + (error && error.stack ? error.stack : error.message));
    process.exitCode = 1;
}
