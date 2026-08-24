(function (root, factory) {
    "use strict";

    var api = Object.freeze(factory());
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root && root.document && !root.PaletteModel) {
        root.PaletteModel = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    var SCHEMA_VERSION = 2;
    var SLOT_KINDS = Object.freeze({ DIRECT: "DIRECT", REFERENCE: "REFERENCE", DERIVED: "DERIVED" });
    var ORIGINS = Object.freeze({ BUILT_IN: "builtIn", CUSTOM: "custom" });
    var PROFILE_ROLES = Object.freeze(["shadow", "base", "secondary", "highlight"]);
    var ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
    var HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;
    var ERROR_CODES = Object.freeze({
        INVALID_PALETTE: "INVALID_PALETTE",
        INVALID_METADATA: "INVALID_METADATA",
        DUPLICATE_SLOT_ID: "DUPLICATE_SLOT_ID",
        INVALID_SLOT_KIND: "INVALID_SLOT_KIND",
        INVALID_SLOT_PAYLOAD: "INVALID_SLOT_PAYLOAD",
        INVALID_DIRECT_COLOR: "INVALID_DIRECT_COLOR",
        INVALID_REFERENCE: "INVALID_REFERENCE",
        INVALID_DERIVATION_SHAPE: "INVALID_DERIVATION_SHAPE",
        INVALID_PROFILE_BINDING: "INVALID_PROFILE_BINDING"
    });

    function isPlainObject(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function clone(value) {
        var copy;
        var key;
        if (value === null || typeof value !== "object") {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(clone);
        }
        copy = {};
        for (key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                copy[key] = clone(value[key]);
            }
        }
        return copy;
    }

    function normalizeHex(value) {
        var match = typeof value === "string" ? HEX_PATTERN.exec(value) : null;
        return match ? "#" + match[1].toUpperCase() : null;
    }

    function validId(value) {
        return typeof value === "string" && ID_PATTERN.test(value);
    }

    function error(code, path, message) {
        return { code: code, path: path, message: message };
    }

    function validateMetadata(metadata, errors) {
        if (!isPlainObject(metadata)) {
            errors.push(error(ERROR_CODES.INVALID_METADATA, "metadata", "Palette metadata must be an object."));
            return;
        }
        if (typeof metadata.displayName !== "string" || !metadata.displayName.replace(/^\s+|\s+$/g, "")) {
            errors.push(error(ERROR_CODES.INVALID_METADATA, "metadata.displayName", "Palette displayName must be a non-empty string."));
        }
        if (typeof metadata.family !== "string" || !metadata.family.replace(/^\s+|\s+$/g, "")) {
            errors.push(error(ERROR_CODES.INVALID_METADATA, "metadata.family", "Palette family must be a non-empty string."));
        }
        if (metadata.origin !== ORIGINS.BUILT_IN && metadata.origin !== ORIGINS.CUSTOM) {
            errors.push(error(ERROR_CODES.INVALID_METADATA, "metadata.origin", "Palette origin must be builtIn or custom."));
        }
    }

    function validateSlot(slot, index, errors) {
        var path = "slots[" + index + "]";
        var color;
        if (!isPlainObject(slot)) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, path, "Palette slot must be an object."));
            return;
        }
        if (!validId(slot.id)) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, path + ".id", "Slot id must be a stable identifier."));
        }
        if (typeof slot.label !== "string" || !slot.label.replace(/^\s+|\s+$/g, "")) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, path + ".label", "Slot label must be a non-empty string."));
        }
        if (slot.kind !== SLOT_KINDS.DIRECT && slot.kind !== SLOT_KINDS.REFERENCE && slot.kind !== SLOT_KINDS.DERIVED) {
            errors.push(error(ERROR_CODES.INVALID_SLOT_KIND, path + ".kind", "Slot kind must be DIRECT, REFERENCE, or DERIVED."));
            return;
        }
        if (slot.kind === SLOT_KINDS.DIRECT) {
            if (typeof slot.reference !== "undefined" || typeof slot.derivation !== "undefined") {
                errors.push(error(ERROR_CODES.INVALID_SLOT_PAYLOAD, path, "DIRECT slot cannot carry reference or derivation payloads."));
            }
            color = isPlainObject(slot.value) ? normalizeHex(slot.value.color) : null;
            if (!color) {
                errors.push(error(ERROR_CODES.INVALID_DIRECT_COLOR, path + ".value.color", "DIRECT slot color must be #RRGGBB."));
            }
            return;
        }
        if (slot.kind === SLOT_KINDS.REFERENCE) {
            if (typeof slot.value !== "undefined" || typeof slot.derivation !== "undefined") {
                errors.push(error(ERROR_CODES.INVALID_SLOT_PAYLOAD, path, "REFERENCE slot cannot carry direct or derivation payloads."));
            }
            if (!isPlainObject(slot.reference) || !validId(slot.reference.slotId) || Object.prototype.hasOwnProperty.call(slot.reference, "paletteId")) {
                errors.push(error(ERROR_CODES.INVALID_REFERENCE, path + ".reference", "REFERENCE must identify one same-palette slotId."));
            }
            return;
        }
        if (typeof slot.value !== "undefined" || typeof slot.reference !== "undefined") {
            errors.push(error(ERROR_CODES.INVALID_SLOT_PAYLOAD, path, "DERIVED slot cannot carry direct or reference payloads."));
        }
        if (!isPlainObject(slot.derivation) || !validId(slot.derivation.derivationId) ||
                !Array.isArray(slot.derivation.sourceSlotIds) || slot.derivation.sourceSlotIds.length < 1 ||
                !slot.derivation.sourceSlotIds.every(validId) || !isPlainObject(slot.derivation.parameters)) {
            errors.push(error(ERROR_CODES.INVALID_DERIVATION_SHAPE, path + ".derivation", "DERIVED slot requires derivationId, sourceSlotIds, and parameters."));
        }
    }

    function validateProceduralProfile(profile, slotIds, errors) {
        var bindings;
        var stops;
        var weights;
        var i;
        var role;
        var total = 0;
        if (!isPlainObject(profile)) {
            errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance", "Procedural profile must be an object."));
            return;
        }
        bindings = profile.bindings;
        if (!isPlainObject(bindings)) {
            errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance.bindings", "Procedural bindings must be an object."));
        } else {
            for (i = 0; i < PROFILE_ROLES.length; i++) {
                role = PROFILE_ROLES[i];
                if (!validId(bindings[role]) || !slotIds[bindings[role]]) {
                    errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance.bindings." + role, "Procedural binding must point to an existing slot."));
                }
            }
        }
        if (typeof profile.stops !== "undefined") {
            stops = profile.stops;
            if (!Array.isArray(stops) || stops.length !== 4 || !stops.every(function (value) { return typeof value === "number" && isFinite(value); }) ||
                    stops[0] !== 0 || stops[3] !== 1 || !(stops[0] < stops[1] && stops[1] < stops[2] && stops[2] < stops[3])) {
                errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance.stops", "Procedural stops must be four increasing finite values from 0 to 1."));
            }
        }
        if (typeof profile.weights !== "undefined") {
            weights = profile.weights;
            if (!isPlainObject(weights)) {
                errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance.weights", "Procedural weights must be an object."));
            } else {
                for (i = 0; i < PROFILE_ROLES.length; i++) {
                    role = PROFILE_ROLES[i];
                    if (typeof weights[role] !== "number" || !isFinite(weights[role]) || weights[role] < 0) {
                        errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance.weights." + role, "Procedural weights must be finite non-negative numbers."));
                    } else {
                        total += weights[role];
                    }
                }
                if (total <= 0) {
                    errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance.weights", "Procedural weights must have a positive total."));
                }
            }
        }
        ["saturationBias", "luminanceBias", "contrastBias"].forEach(function (name) {
            if (typeof profile[name] !== "undefined" && (typeof profile[name] !== "number" || !isFinite(profile[name]))) {
                errors.push(error(ERROR_CODES.INVALID_PROFILE_BINDING, "profiles.proceduralAppearance." + name, "Procedural bias must be a finite number."));
            }
        });
    }

    function validatePalette(input) {
        var errors = [];
        var palette;
        var slotIds = Object.create(null);
        var i;
        if (!isPlainObject(input)) {
            return { ok: false, errors: [error(ERROR_CODES.INVALID_PALETTE, "", "Palette must be an object.")] };
        }
        palette = clone(input);
        if (!validId(palette.id)) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, "id", "Palette id must be a stable identifier."));
        }
        if (typeof palette.revision !== "number" || !isFinite(palette.revision) || palette.revision < 1 || Math.floor(palette.revision) !== palette.revision) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, "revision", "Palette revision must be a positive integer."));
        }
        validateMetadata(palette.metadata, errors);
        if (!Array.isArray(palette.slots) || palette.slots.length < 1) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, "slots", "Palette slots must be a non-empty array."));
        } else {
            for (i = 0; i < palette.slots.length; i++) {
                validateSlot(palette.slots[i], i, errors);
                if (palette.slots[i] && validId(palette.slots[i].id)) {
                    if (slotIds[palette.slots[i].id]) {
                        errors.push(error(ERROR_CODES.DUPLICATE_SLOT_ID, "slots[" + i + "].id", "Slot ids must be unique within a Palette."));
                    }
                    slotIds[palette.slots[i].id] = true;
                }
            }
        }
        if (typeof palette.profiles !== "undefined" && !isPlainObject(palette.profiles)) {
            errors.push(error(ERROR_CODES.INVALID_PALETTE, "profiles", "Palette profiles must be an object."));
        } else if (palette.profiles && typeof palette.profiles.proceduralAppearance !== "undefined") {
            validateProceduralProfile(palette.profiles.proceduralAppearance, slotIds, errors);
        }
        if (errors.length) {
            return { ok: false, errors: errors };
        }
        palette.slots.forEach(function (slot) {
            if (slot.kind === SLOT_KINDS.DIRECT) {
                slot.value.color = normalizeHex(slot.value.color);
            }
        });
        return { ok: true, errors: [], palette: palette };
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        slotKinds: SLOT_KINDS,
        origins: ORIGINS,
        profileRoles: PROFILE_ROLES,
        errorCodes: ERROR_CODES,
        normalizeHex: normalizeHex,
        validatePalette: validatePalette,
        clone: clone
    };
}));
