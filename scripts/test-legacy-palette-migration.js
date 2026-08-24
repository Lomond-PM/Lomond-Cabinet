"use strict";

const path = require("path");
const root = path.resolve(__dirname, "..");
const migration = require(path.join(root, "client", "js", "palette", "legacyPaletteMigration.js"));
const storeModule = require(path.join(root, "client", "js", "palette", "paletteStore.js"));
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
        failWrite: false,
        getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
        setItem(key, value) { if (this.failWrite) throw new Error("write failed"); data[key] = String(value); },
        removeItem(key) { delete data[key]; }
    };
}

const legacyBuiltIns = legacyLibrary.listPalettes();
const builtInPalettes = legacyBuiltIns.map((palette) => migration.convertLegacyPalette(palette, "builtIn", { registry }).palette);
const fixedClock = () => "2026-08-22T00:00:00.000Z";
const validateV2 = (value) => storeModule.validateEnvelope(value, { builtInPalettes, registry });

function legacyCustom(id) {
    return {
        id,
        version: 3,
        family: "userCustom",
        displayName: "Migrated Custom",
        colors: { shadow: "#102030", base: "#405060", secondary: "#708090", highlight: "#abcdef" },
        stops: [0, 0.3, 0.8, 1],
        weights: { shadow: 0.2, base: 0.5, secondary: 0.2, highlight: 0.1 },
        saturationBias: 0.1,
        luminanceBias: -0.05,
        contrastBias: 0.2
    };
}

function legacyEnvelope() {
    return {
        format: "lomond.proceduralPaletteStore",
        schemaVersion: 1,
        customPalettes: [legacyCustom("customStable")],
        builtInOverrides: {
            pacificCyan: {
                displayName: "Pacific Modified",
                family: "coolLuminous",
                colors: { shadow: "#111111", base: "#224466", secondary: "#6699AA", highlight: "#DDEEFF" },
                stops: [0, 0.25, 0.75, 1],
                weights: { shadow: 0.25, base: 0.45, secondary: 0.2, highlight: 0.1 },
                saturationBias: 0.2,
                luminanceBias: 0.1,
                contrastBias: -0.1
            }
        },
        hiddenBuiltInPaletteIds: ["mossGold", "temporarilyUnknownBuiltIn"],
        toolPaletteMap: { shapeAdd: "customStable", selectionInfo: "pacificCyan" },
        updatedAt: "2026-08-01T10:00:00.000Z"
    };
}

function migrationOptions(storage) {
    return { storage, legacyBuiltInPalettes: legacyBuiltIns, builtInPalettes, registry, clock: fixedClock, validateV2 };
}

let storage = memoryStorage();
let result = migration.migrateStorage(migrationOptions(storage));
assert(result.ok && result.status === "NO_LEGACY_DATA", "No legacy data must return NO_LEGACY_DATA.");
assert(!storage.getItem(migration.v2Key), "No legacy data must not write an empty v2 envelope.");

const legacy = legacyEnvelope();
const rawLegacy = JSON.stringify(legacy);
storage = memoryStorage({ [migration.v1Key]: rawLegacy });
result = migration.migrateStorage(migrationOptions(storage));
assert(result.ok && result.status === "MIGRATED", "Valid v1 data must migrate successfully: " + JSON.stringify(result));
assert(storage.getItem(migration.v1Key) === rawLegacy, "Migration must leave raw v1 bytes untouched.");
assert(!!storage.getItem(migration.v2Key), "Successful migration must write one complete v2 envelope.");
assert(result.migratedState.format === "lomond.paletteStore" && result.migratedState.schemaVersion === 2, "Migration must produce the v2 format envelope.");
assert(result.migratedState.migration.status === "complete" && result.migratedState.migration.sourceSchemaVersion === 1, "Completion evidence must live inside the validated v2 envelope.");
assert(result.migratedState.customPalettes[0].id === "customStable", "Custom Palette ID must be preserved.");
assert(result.migratedState.customPalettes[0].revision === 3, "Legacy version must deterministically initialize revision.");
assert(result.migratedState.customPalettes[0].slots.map((slot) => slot.id).join(",") === "shadow,base,secondary,highlight", "Legacy slot IDs must be deterministic role IDs.");
assert(result.migratedState.customPalettes[0].slots[3].value.color === "#ABCDEF", "Legacy colors must normalize deterministically.");
const profile = result.migratedState.customPalettes[0].profiles.proceduralAppearance;
assert(JSON.stringify(profile.bindings) === JSON.stringify({ shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" }), "All four procedural bindings must be preserved.");
assert(JSON.stringify(profile.stops) === JSON.stringify([0, 0.3, 0.8, 1]), "Legacy stops must be preserved.");
assert(JSON.stringify(profile.weights) === JSON.stringify(legacy.customPalettes[0].weights), "Legacy weights must be preserved.");
assert(profile.saturationBias === 0.1 && profile.luminanceBias === -0.05 && profile.contrastBias === 0.2, "Legacy biases must be preserved.");
assert(result.migratedState.hiddenBuiltInPaletteIds[1] === "temporarilyUnknownBuiltIn", "Unknown but well-shaped hidden built-in state must be preserved.");
assert(result.migratedState.toolPaletteMap.shapeAdd === "customStable" && result.migratedState.toolPaletteMap.selectionInfo === "pacificCyan", "Tool Palette live-reference mappings must be preserved.");
assert(result.diagnostics.accepted.customPalettes[0] === "customStable" && result.diagnostics.accepted.builtInOverrides[0] === "pacificCyan", "Migration diagnostics must enumerate accepted entries.");
assert(result.source.raw === rawLegacy && result.diagnostics.source.key === migration.v1Key, "Migration result must retain raw source evidence and source key.");
assert(validateV2(result.migratedState).ok, "Migrated result must validate as a complete v2 envelope.");
assert(result.migratedState.customPalettes.every((palette) => resolver.resolvePalette(palette, { registry }).ok), "Every migrated custom Palette must resolve.");
const overrideRecord = result.migratedState.builtInOverrides.pacificCyan;
assert(overrideRecord.paletteId === "pacificCyan" && overrideRecord.patch && !overrideRecord.metadata, "Built-in override must remain a distinct override record, not a custom Palette.");
const canonicalPacific = builtInPalettes.find((palette) => palette.id === "pacificCyan");
const applied = storeModule.applyOverrideRecord(canonicalPacific, overrideRecord);
assert(applied.ok && applied.palette.metadata.origin === "builtIn" && applied.palette.slots[0].value.color === "#111111", "Override record must resolve through built-in canonical identity.");
assert(JSON.stringify(applied.palette.profiles.proceduralAppearance.stops) === JSON.stringify([0, 0.25, 0.75, 1]), "Built-in override stops must survive migration.");
assert(JSON.stringify(applied.palette.profiles.proceduralAppearance.weights) === JSON.stringify(legacy.builtInOverrides.pacificCyan.weights), "Built-in override weights must survive migration.");
assert(applied.palette.profiles.proceduralAppearance.saturationBias === 0.2 && applied.palette.profiles.proceduralAppearance.luminanceBias === 0.1 && applied.palette.profiles.proceduralAppearance.contrastBias === -0.1, "Built-in override biases must survive migration.");

const firstV2Bytes = storage.getItem(migration.v2Key);
storage.data[migration.v1Key] = JSON.stringify(Object.assign(legacyEnvelope(), { customPalettes: [] }));
result = migration.migrateStorage(migrationOptions(storage));
assert(result.ok && result.status === "ALREADY_MIGRATED", "Existing valid v2 must win over detected v1.");
assert(storage.getItem(migration.v2Key) === firstV2Bytes, "Idempotent migration must not rewrite valid v2.");

storage = memoryStorage({ [migration.v1Key]: "{" });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_LEGACY_JSON", "Invalid v1 JSON must return typed failure.");
assert(!storage.getItem(migration.v2Key) && storage.getItem(migration.v1Key) === "{", "Invalid v1 JSON must not write v2 or alter v1.");
assert(result.source.raw === "{" && result.diagnostics.source.parseStatus === "INVALID_JSON", "Invalid JSON diagnostics must preserve raw evidence.");

storage = memoryStorage({ [migration.v1Key]: JSON.stringify({ schemaVersion: 1 }) });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_LEGACY_SCHEMA" && !storage.getItem(migration.v2Key), "Invalid legacy envelope must fail without v2 write.");

let invalid = legacyEnvelope();
invalid.customPalettes[0].colors.base = "bad";
storage = memoryStorage({ [migration.v1Key]: JSON.stringify(invalid) });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_LEGACY_PALETTE", "Invalid custom Palette must be reported.");
assert(result.diagnostics.rejected[0].category === "customPalettes" && !storage.getItem(migration.v2Key), "Rejected custom entry must be identified without partial migration.");

invalid = legacyEnvelope();
invalid.customPalettes[0].version = "3";
storage = memoryStorage({ [migration.v1Key]: JSON.stringify(invalid) });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_LEGACY_PALETTE", "Legacy migration must not coerce a string version into valid schema.");

invalid = legacyEnvelope();
invalid.builtInOverrides.pacificCyan.colors.shadow = "bad";
storage = memoryStorage({ [migration.v1Key]: JSON.stringify(invalid) });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_LEGACY_OVERRIDE", "Invalid built-in override must be reported.");
assert(result.diagnostics.rejected[0].category === "builtInOverrides", "Rejected override diagnostic must identify its category.");

invalid = legacyEnvelope();
invalid.toolPaletteMap.shapeAdd = "missingPalette";
storage = memoryStorage({ [migration.v1Key]: JSON.stringify(invalid) });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_MAPPING", "Dangling tool mapping must be a typed migration failure.");
assert(!storage.getItem(migration.v2Key), "Invalid mapping must prevent all v2 writes.");

storage = memoryStorage({ [migration.v1Key]: rawLegacy });
storage.failWrite = true;
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "STORAGE_WRITE_FAILED", "Storage write failure must be typed.");
assert(!storage.getItem(migration.v2Key) && storage.getItem(migration.v1Key) === rawLegacy, "Write failure must leave no v2 completion evidence and preserve v1.");

storage = memoryStorage({ [migration.v1Key]: rawLegacy, [migration.v2Key]: "{" });
result = migration.migrateStorage(migrationOptions(storage));
assert(!result.ok && result.status === "INVALID_EXISTING_V2", "Invalid existing v2 must not be overwritten by v1 migration.");
assert(storage.getItem(migration.v2Key) === "{", "Invalid existing v2 evidence must remain untouched for recovery.");

storage = memoryStorage({ [migration.v1Key]: rawLegacy });
let validationCalls = 0;
result = migration.migrateStorage(Object.assign({}, migrationOptions(storage), {
    validateV2(value) {
        validationCalls += 1;
        return validationCalls === 1 ? validateV2(value) : { ok: false, errors: [{ code: "TEST_ROUNDTRIP_FAILURE" }] };
    }
}));
assert(!result.ok && result.status === "ROUNDTRIP_FAILED", "Round-trip validation failure must be typed.");
assert(!storage.getItem(migration.v2Key), "Round-trip failure must not write completion evidence.");

const source = legacyEnvelope();
const sourceBefore = JSON.stringify(source);
const convertedA = migration.convertLegacyEnvelope(source, { sourceKey: migration.v1Key, legacyBuiltInPalettes: legacyBuiltIns, registry, clock: fixedClock, validateV2 });
const convertedB = migration.convertLegacyEnvelope(source, { sourceKey: migration.v1Key, legacyBuiltInPalettes: legacyBuiltIns, registry, clock: fixedClock, validateV2 });
assert(convertedA.ok && storeModule.canonicalSerialize(convertedA.migratedState) === storeModule.canonicalSerialize(convertedB.migratedState), "Repeated migration with fixed clock must have identical semantic serialization.");
assert(JSON.stringify(source) === sourceBefore, "Migration must not mutate parsed legacy input.");

console.log(`PASS legacy palette migration: ${assertions} assertions.`);
