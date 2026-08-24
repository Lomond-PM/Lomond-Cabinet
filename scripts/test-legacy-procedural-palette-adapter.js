"use strict";

const assert = require("assert");
const Adapter = require("../client/js/palette/legacyProceduralPaletteAdapter.js");
const Migration = require("../client/js/palette/legacyPaletteMigration.js");
const Store = require("../client/js/palette/paletteStore.js");
const Library = require("../client/js/proceduralPaletteLibrary.js");

function legacy(id) {
    return {
        id: id || "customParity", version: 1, displayName: "Custom Parity", family: "testFamily",
        colors: { shadow: "#101820", base: "#245060", secondary: "#68AABB", highlight: "#DDF8FF" },
        stops: [0, 0.3, 0.72, 1], weights: { shadow: 0.25, base: 0.5, secondary: 0.17, highlight: 0.08 },
        saturationBias: 0.1, luminanceBias: -0.05, contrastBias: 0.2
    };
}
function convert(source, origin) {
    const result = Migration.convertLegacyPalette(source, origin || "custom");
    assert.strictEqual(result.ok, true);
    return result.palette;
}
function projected(palette) {
    const result = Adapter.project(palette);
    assert.strictEqual(result.ok, true, result.error && result.error.code);
    return result.palette;
}
function comparable(source) {
    return {
        id: source.id, version: source.version, family: source.family,
        displayName: source.displayName || source.id,
        colors: Object.fromEntries(Object.entries(source.colors).map(([key, value]) => [key, value.toUpperCase()])),
        stops: source.stops, weights: source.weights,
        ...(typeof source.saturationBias !== "undefined" ? { saturationBias: source.saturationBias } : {}),
        ...(typeof source.luminanceBias !== "undefined" ? { luminanceBias: source.luminanceBias } : {}),
        ...(typeof source.contrastBias !== "undefined" ? { contrastBias: source.contrastBias } : {})
    };
}
function withoutSignature(value) {
    const copy = JSON.parse(JSON.stringify(value));
    delete copy.signature;
    return copy;
}

const realBuiltIns = Library.listPalettes();
realBuiltIns.forEach((source) => assert.deepStrictEqual(withoutSignature(projected(convert(source, "builtIn"))), comparable(source)));
assert.ok(realBuiltIns.length > 0);

const custom = legacy();
assert.deepStrictEqual(withoutSignature(projected(convert(custom))), comparable(custom));
assert.strictEqual(Adapter.classifyLegacyEditability(convert(custom)).classification, "LEGACY_EDITABLE");
assert.strictEqual(Adapter.projectLegacySource(custom, "custom").ok, true);

const direct = convert(custom);
const mixed = JSON.parse(JSON.stringify(direct));
mixed.slots.find((slot) => slot.id === "secondary").kind = "REFERENCE";
delete mixed.slots.find((slot) => slot.id === "secondary").value;
mixed.slots.find((slot) => slot.id === "secondary").reference = { slotId: "base" };
mixed.slots.find((slot) => slot.id === "highlight").kind = "DERIVED";
delete mixed.slots.find((slot) => slot.id === "highlight").value;
mixed.slots.find((slot) => slot.id === "highlight").derivation = {
    derivationId: "mix.v1", sourceSlotIds: ["base", "shadow"], parameters: { amount: 0.25 }
};
const mixedOutput = projected(mixed);
assert.strictEqual(mixedOutput.colors.secondary, mixedOutput.colors.base);
assert.match(mixedOutput.colors.highlight, /^#[0-9A-F]{6}$/);
assert.strictEqual(Adapter.classifyLegacyEditability(mixed).classification, "LEGACY_READ_ONLY");

const dynamic = JSON.parse(JSON.stringify(direct));
dynamic.slots.push({ id: "accentIndependent", label: "Accent", kind: "DIRECT", value: { color: "#AA00CC" } });
dynamic.slots.push({ id: "accentReference", label: "Accent Reference", kind: "REFERENCE", reference: { slotId: "accentIndependent" } });
const dynamicBefore = JSON.stringify(dynamic);
const dynamicOutput = projected(dynamic);
assert.strictEqual(JSON.stringify(dynamic), dynamicBefore);
assert.strictEqual(Object.keys(dynamicOutput.colors).length, 4);
assert.strictEqual(Adapter.classifyLegacyEditability(dynamic).classification, "LEGACY_EDITABLE");

const lossy = JSON.parse(JSON.stringify(dynamic));
lossy.slots.find((slot) => slot.id === "accentReference").reference.slotId = "base";
assert.strictEqual(Adapter.classifyLegacyEditability(lossy).classification, "LEGACY_READ_ONLY");

const missingProfile = JSON.parse(JSON.stringify(direct));
delete missingProfile.profiles.proceduralAppearance;
assert.strictEqual(Adapter.project(missingProfile).error.code, "MISSING_PROCEDURAL_PROFILE");
const missingBinding = JSON.parse(JSON.stringify(direct));
delete missingBinding.profiles.proceduralAppearance.bindings.highlight;
assert.strictEqual(Adapter.project(missingBinding).error.code, "MISSING_BINDING");
const unresolved = JSON.parse(JSON.stringify(mixed));
let failed;
unresolved.slots.find((slot) => slot.id === "secondary").reference.slotId = "absent";
failed = Adapter.project(unresolved);
assert.strictEqual(failed.error.code, "UNRESOLVABLE_PALETTE");
assert.strictEqual(failed.error.cause.code, "MISSING_SLOT");
const cycle = JSON.parse(JSON.stringify(mixed));
cycle.slots.find((slot) => slot.id === "base").kind = "REFERENCE";
delete cycle.slots.find((slot) => slot.id === "base").value;
cycle.slots.find((slot) => slot.id === "base").reference = { slotId: "secondary" };
failed = Adapter.project(cycle);
assert.strictEqual(failed.error.code, "UNRESOLVABLE_PALETTE");
assert.strictEqual(failed.error.cause.code, "DEPENDENCY_CYCLE");
const invalidDerivation = JSON.parse(JSON.stringify(mixed));
invalidDerivation.slots.find((slot) => slot.id === "highlight").derivation.derivationId = "unknown.v1";
failed = Adapter.project(invalidDerivation);
assert.strictEqual(failed.error.code, "UNRESOLVABLE_PALETTE");
assert.strictEqual(failed.error.cause.code, "INVALID_DERIVATION");
const invalidStops = JSON.parse(JSON.stringify(direct));
invalidStops.profiles.proceduralAppearance.stops = [0, 0.5, 0.4, 1];
assert.strictEqual(Adapter.project(invalidStops).error.code, "INVALID_PROCEDURAL_PROFILE");
const invalidWeights = JSON.parse(JSON.stringify(direct));
invalidWeights.profiles.proceduralAppearance.weights.base = 0.2;
assert.strictEqual(Adapter.project(invalidWeights).error.code, "INVALID_PROCEDURAL_PROFILE");

const signatureBase = projected(direct).signature;
assert.strictEqual(projected(direct).signature, signatureBase);
const colorChanged = JSON.parse(JSON.stringify(direct));
colorChanged.slots.find((slot) => slot.id === "base").value.color = "#335577";
assert.notStrictEqual(projected(colorChanged).signature, signatureBase);
["stops", "weights", "saturationBias"].forEach((field) => {
    const changed = JSON.parse(JSON.stringify(direct));
    if (field === "stops") changed.profiles.proceduralAppearance.stops = [0, 0.31, 0.72, 1];
    if (field === "weights") changed.profiles.proceduralAppearance.weights = { shadow: 0.24, base: 0.51, secondary: 0.17, highlight: 0.08 };
    if (field === "saturationBias") changed.profiles.proceduralAppearance.saturationBias = 0.11;
    assert.notStrictEqual(projected(changed).signature, signatureBase);
});
const metadataChanged = JSON.parse(JSON.stringify(dynamic));
metadataChanged.slots.find((slot) => slot.id === "accentIndependent").label = "Unrelated renamed slot";
metadataChanged.metadata.displayName = "Renamed display metadata";
assert.strictEqual(projected(metadataChanged).signature, projected(dynamic).signature);

const factorySource = realBuiltIns[0];
const legacyOverride = { colors: { base: "#123456" }, stops: [0, 0.25, 0.7, 1] };
const mergedSource = Object.assign({}, factorySource, legacyOverride, {
    displayName: factorySource.id,
    colors: Object.assign({}, factorySource.colors, legacyOverride.colors),
    weights: Object.assign({}, factorySource.weights)
});
const canonicalV2 = convert(factorySource, "builtIn");
const targetV2 = convert(mergedSource, "builtIn");
const record = Migration.buildOverrideRecord(canonicalV2, targetV2);
const applied = Store.applyOverrideRecord(canonicalV2, record);
assert.strictEqual(applied.ok, true);
assert.deepStrictEqual(withoutSignature(projected(applied.palette)), comparable(mergedSource));
assert.strictEqual(projected(applied.palette).signature, projected(applied.palette).signature);
assert.deepStrictEqual(
    Adapter.project(applied.palette, { hiddenBuiltInPaletteIds: [factorySource.id], toolPaletteMap: { shapeAdd: factorySource.id } }).palette,
    Adapter.project(applied.palette).palette
);

const immutable = projected(direct);
assert.strictEqual(Object.isFrozen(immutable), true);
assert.strictEqual(Object.isFrozen(immutable.colors), true);

console.log("Legacy procedural Palette adapter tests passed.");
console.log("Built-in parity count: " + realBuiltIns.length);
console.log("Failures: 0");
