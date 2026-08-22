"use strict";

const path = require("path");
const root = path.resolve(__dirname, "..");
const model = require(path.join(root, "client", "js", "palette", "paletteModel.js"));

let assertions = 0;

function assert(condition, message) {
    assertions += 1;
    if (!condition) throw new Error(message);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function direct(id, color, label) {
    return { id, label: label || id, kind: "DIRECT", value: { color } };
}

function validPalette() {
    return {
        id: "foundationPalette",
        revision: 1,
        metadata: { displayName: "Foundation Palette", family: "test", origin: "custom" },
        slots: [
            direct("shadow", "#102030"),
            direct("base", "#405060"),
            direct("secondary", "#708090"),
            direct("highlight", "#abcdef")
        ],
        profiles: {
            proceduralAppearance: {
                bindings: { shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" },
                stops: [0, 0.34, 0.74, 1],
                weights: { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 },
                saturationBias: 0,
                luminanceBias: 0,
                contrastBias: 0
            }
        }
    };
}

function hasCode(result, code) {
    return !result.ok && result.errors.some((item) => item.code === code);
}

const source = validPalette();
const sourceJson = JSON.stringify(source);
const valid = model.validatePalette(source);
assert(model.schemaVersion === 2, "Palette model must expose schema version 2.");
assert(valid.ok, "Valid Palette v2 schema must pass.");
assert(valid.palette.slots[3].value.color === "#ABCDEF", "HEX normalization must be deterministic uppercase #RRGGBB.");
assert(JSON.stringify(source) === sourceJson, "Validation must not mutate source Palette data.");
assert(model.slotKinds.DIRECT === "DIRECT" && model.slotKinds.REFERENCE === "REFERENCE" && model.slotKinds.DERIVED === "DERIVED", "All formal slot kinds must exist.");
assert(model.origins.BUILT_IN === "builtIn" && model.origins.CUSTOM === "custom", "Both formal origins must exist.");

assert(hasCode(model.validatePalette(null), "INVALID_PALETTE"), "Non-object Palette must be rejected.");
let candidate = validPalette();
candidate.id = "bad id";
assert(hasCode(model.validatePalette(candidate), "INVALID_PALETTE"), "Invalid Palette id must be rejected.");
candidate = validPalette();
candidate.revision = 0;
assert(hasCode(model.validatePalette(candidate), "INVALID_PALETTE"), "Non-positive revision must be rejected.");
candidate = validPalette();
candidate.metadata.origin = "legacy";
assert(hasCode(model.validatePalette(candidate), "INVALID_METADATA"), "Unknown metadata origin must be rejected.");
candidate = validPalette();
candidate.metadata.displayName = "";
assert(hasCode(model.validatePalette(candidate), "INVALID_METADATA"), "Empty displayName must be rejected.");
candidate = validPalette();
candidate.slots.push(direct("base", "#FFFFFF"));
assert(hasCode(model.validatePalette(candidate), "DUPLICATE_SLOT_ID"), "Duplicate slot id must be rejected.");
candidate = validPalette();
candidate.slots[0].kind = "COLOR";
assert(hasCode(model.validatePalette(candidate), "INVALID_SLOT_KIND"), "Unknown slot kind must be rejected.");
candidate = validPalette();
candidate.slots[0].reference = { slotId: "base" };
assert(hasCode(model.validatePalette(candidate), "INVALID_SLOT_PAYLOAD"), "Conflicting slot-kind payloads must be rejected.");
candidate = validPalette();
candidate.slots[0].value.color = "red";
assert(hasCode(model.validatePalette(candidate), "INVALID_DIRECT_COLOR"), "Invalid direct color must be rejected.");
candidate = validPalette();
candidate.slots[0] = { id: "shadow", label: "Shadow", kind: "REFERENCE", reference: { paletteId: "other", slotId: "base" } };
assert(hasCode(model.validatePalette(candidate), "INVALID_REFERENCE"), "Cross-Palette reference shape must be rejected.");
candidate = validPalette();
candidate.slots[0] = { id: "shadow", label: "Shadow", kind: "DERIVED", derivation: { derivationId: "mix.v1", sourceSlotIds: [], parameters: {} } };
assert(hasCode(model.validatePalette(candidate), "INVALID_DERIVATION_SHAPE"), "Malformed derivation shape must be rejected.");
candidate = validPalette();
candidate.profiles.proceduralAppearance.bindings.highlight = "missingSlot";
assert(hasCode(model.validatePalette(candidate), "INVALID_PROFILE_BINDING"), "Procedural binding to a missing slot must be rejected.");
candidate = validPalette();
candidate.profiles.proceduralAppearance.stops = [0, 0.7, 0.4, 1];
assert(hasCode(model.validatePalette(candidate), "INVALID_PROFILE_BINDING"), "Invalid procedural stops must be rejected.");
candidate = validPalette();
candidate.profiles.proceduralAppearance.weights.shadow = -1;
assert(hasCode(model.validatePalette(candidate), "INVALID_PROFILE_BINDING"), "Invalid procedural weights must be rejected.");
candidate = validPalette();
candidate.profiles.proceduralAppearance.contrastBias = Infinity;
assert(hasCode(model.validatePalette(candidate), "INVALID_PROFILE_BINDING"), "Non-finite procedural bias must be rejected.");

const reordered = validPalette();
reordered.slots = [reordered.slots[3], reordered.slots[0], reordered.slots[2], reordered.slots[1]];
reordered.slots[0].label = "Renamed Highlight";
const reorderedResult = model.validatePalette(reordered);
assert(reorderedResult.ok, "Reorder and label rename must preserve schema validity.");
assert(reorderedResult.palette.slots.map((slot) => slot.id).join(",") === "highlight,shadow,secondary,base", "Reorder must preserve every stable slot id.");
assert(reorderedResult.palette.slots[0].id === "highlight", "Label rename must not alter slot identity.");
const inheritedName = validPalette();
inheritedName.slots.push(direct("constructor", "#112233"));
assert(model.validatePalette(inheritedName).ok, "Valid ids matching Object prototype names must retain ordinary slot identity.");

const reference = validPalette();
reference.slots[0] = { id: "shadow", label: "Shadow", kind: "REFERENCE", reference: { slotId: "base" } };
assert(model.validatePalette(reference).ok, "Structurally valid same-Palette reference must pass model validation.");
const derived = validPalette();
derived.slots[0] = { id: "shadow", label: "Shadow", kind: "DERIVED", derivation: { derivationId: "mix.v1", sourceSlotIds: ["base", "secondary"], parameters: { amount: 0.5 } } };
assert(model.validatePalette(derived).ok, "Structurally valid derived slot must pass model validation.");
assert(JSON.stringify(clone(valid.palette)) === JSON.stringify(valid.palette), "Validated Palette output must remain serializable plain data.");

console.log(`PASS palette model: ${assertions} assertions.`);
