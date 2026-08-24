#!/usr/bin/env node
"use strict";

const assert = require("assert");
const Library = require("../client/js/proceduralPaletteLibrary.js");
const Facade = require("../client/js/proceduralPaletteStore.js");
const Migration = require("../client/js/palette/legacyPaletteMigration.js");

function storage(initial) {
    const values = Object.assign({}, initial || {});
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        removeItem(key) { delete values[key]; },
        values
    };
}
function custom(id) {
    return {
        id, version: 1, displayName: "Migrated Custom", family: "custom",
        colors: { shadow: "#111111", base: "#335577", secondary: "#77AACC", highlight: "#EEFFFF" },
        stops: [0, 0.3, 0.72, 1], weights: { shadow: 0.25, base: 0.5, secondary: 0.17, highlight: 0.08 }
    };
}
function legacyEnvelope() {
    return {
        format: Migration.v1Format, schemaVersion: 1,
        customPalettes: [custom("legacyCustom")], builtInOverrides: {}, hiddenBuiltInPaletteIds: ["plumRose"],
        toolPaletteMap: { shapeAdd: "legacyCustom" }, updatedAt: "2026-01-01T00:00:00.000Z"
    };
}
function init(target) { return Facade.initialize({ library: Library, storage: target, clock: () => "2026-08-22T00:00:00.000Z" }); }

let target = storage();
let result = init(target);
assert.strictEqual(result.status, "V2_CREATED");
assert.ok(target.getItem(Facade.storageKey));
assert.strictEqual(target.getItem(Facade.legacyStorageKey), null);

const v1 = JSON.stringify(legacyEnvelope());
target = storage({ [Facade.legacyStorageKey]: v1 });
result = init(target);
assert.strictEqual(result.status, "V1_MIGRATED");
assert.strictEqual(target.getItem(Facade.legacyStorageKey), v1);
assert.strictEqual(Facade.getResolvedPalette("legacyCustom").colors.base, "#335577");
assert.strictEqual(Facade.getToolPalette("shapeAdd"), "legacyCustom");
assert.strictEqual(Facade.getResolvedPalette("plumRose").isHidden, true);
const migratedBytes = target.getItem(Facade.storageKey);
result = init(target);
assert.strictEqual(result.status, "V2_LOADED");
assert.strictEqual(target.getItem(Facade.storageKey), migratedBytes);
assert.strictEqual(target.getItem(Facade.legacyStorageKey), v1);

const conflictingV1 = legacyEnvelope();
conflictingV1.customPalettes[0].colors.base = "#FFFFFF";
target.setItem(Facade.legacyStorageKey, JSON.stringify(conflictingV1));
result = init(target);
assert.strictEqual(result.status, "V2_LOADED");
assert.strictEqual(Facade.getResolvedPalette("legacyCustom").colors.base, "#335577");

target = storage({ [Facade.storageKey]: "{invalid", [Facade.legacyStorageKey]: v1 });
const invalidV2Bytes = target.getItem(Facade.storageKey);
result = init(target);
assert.strictEqual(result.status, "READ_ONLY_RECOVERY");
assert.strictEqual(result.recovery.code, "INVALID_V2");
assert.strictEqual(target.getItem(Facade.storageKey), invalidV2Bytes);
assert.strictEqual(target.getItem(Facade.legacyStorageKey), v1);
assert.strictEqual(Facade.updatePalette("pacificCyan", { colors: { base: "#FFFFFF" } }).ok, false);

target = storage({ [Facade.legacyStorageKey]: "{invalid" });
const invalidV1Bytes = target.getItem(Facade.legacyStorageKey);
result = init(target);
assert.strictEqual(result.status, "READ_ONLY_RECOVERY");
assert.strictEqual(result.recovery.code, "INVALID_V1");
assert.strictEqual(target.getItem(Facade.storageKey), null);
assert.strictEqual(target.getItem(Facade.legacyStorageKey), invalidV1Bytes);

target = storage();
init(target);
const beforePreview = target.getItem(Facade.storageKey);
result = Facade.setTransientPalette("__palette_editor_preview__", custom("ignoredPreviewId"));
assert.strictEqual(result.ok, true);
assert.strictEqual(result.palette.id, "__palette_editor_preview__");
assert.strictEqual(Facade.getResolvedPalette("__palette_editor_preview__").colors.base, "#335577");
assert.strictEqual(target.getItem(Facade.storageKey), beforePreview);
assert.ok(!target.getItem(Facade.storageKey).includes("paletteEditorPreview"));
Facade.clearTransientPalette("__palette_editor_preview__");
assert.strictEqual(Facade.getResolvedPalette("__palette_editor_preview__"), null);

const editable = Migration.convertLegacyPalette(custom("editableComplex"), "custom").palette;
editable.slots.push({ id: "unrelatedAccent", label: "Accent", kind: "DIRECT", value: { color: "#AA00CC" } });
let envelope = Facade.exportData();
envelope.customPalettes.push(editable);
target = storage({ [Facade.storageKey]: JSON.stringify(envelope) });
init(target);
assert.strictEqual(Facade.getLegacyEditability("editableComplex").classification, "LEGACY_EDITABLE");
result = Facade.updatePalette("editableComplex", { colors: { base: "#224466" }, displayName: "Edited Safely" });
assert.strictEqual(result.ok, true);
assert.strictEqual(Facade.getV2Palette("editableComplex").slots.find((slot) => slot.id === "unrelatedAccent").value.color, "#AA00CC");

const readOnly = Facade.getV2Palette("editableComplex");
readOnly.slots.find((slot) => slot.id === "secondary").kind = "REFERENCE";
delete readOnly.slots.find((slot) => slot.id === "secondary").value;
readOnly.slots.find((slot) => slot.id === "secondary").reference = { slotId: "base" };
envelope = Facade.exportData();
envelope.customPalettes = envelope.customPalettes.filter((palette) => palette.id !== readOnly.id).concat([readOnly]);
target = storage({ [Facade.storageKey]: JSON.stringify(envelope) });
init(target);
assert.strictEqual(Facade.getLegacyEditability("editableComplex").classification, "LEGACY_READ_ONLY");
const beforeBlockedSave = target.getItem(Facade.storageKey);
result = Facade.updatePalette("editableComplex", { colors: { secondary: "#FFFFFF" } });
assert.strictEqual(result.ok, false);
assert.match(result.errors[0], /LEGACY_READ_ONLY/);
assert.strictEqual(target.getItem(Facade.storageKey), beforeBlockedSave);
result = Facade.duplicatePalette("editableComplex");
assert.strictEqual(result.ok, true);
assert.strictEqual(Facade.getLegacyEditability(result.palette.id).classification, "LEGACY_READ_ONLY");

let notifications = 0;
function listener() { notifications += 1; }
Facade.subscribe(listener);
Facade.hideBuiltInPalette("pacificCyan", true);
Facade.unsubscribe(listener);
assert.strictEqual(notifications, 1);

console.log("PASS Palette production integration: startup, migration, recovery, preview, lossless bridge, read-only guard.");
