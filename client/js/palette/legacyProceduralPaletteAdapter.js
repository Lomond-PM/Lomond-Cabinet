(function (root, factory) {
    "use strict";

    var model = typeof module !== "undefined" && module.exports ? require("./paletteModel.js") : root.PaletteModel;
    var resolver = typeof module !== "undefined" && module.exports ? require("./paletteResolver.js") : root.PaletteResolver;
    var derivations = typeof module !== "undefined" && module.exports ? require("./colorDerivationRegistry.js") : root.ColorDerivationRegistry;
    var migration = typeof module !== "undefined" && module.exports ? require("./legacyPaletteMigration.js") : root.LegacyPaletteMigration;
    var api = Object.freeze(factory(model, resolver, derivations, migration));
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root && root.document && !root.LegacyProceduralPaletteAdapter) root.LegacyProceduralPaletteAdapter = api;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (PaletteModel, PaletteResolver, DefaultDerivations, LegacyPaletteMigration) {
    "use strict";

    var ROLES = Object.freeze(["shadow", "base", "secondary", "highlight"]);
    var BIASES = Object.freeze(["saturationBias", "luminanceBias", "contrastBias"]);
    var CLASSIFICATIONS = Object.freeze({ EDITABLE: "LEGACY_EDITABLE", READ_ONLY: "LEGACY_READ_ONLY" });
    var ERROR_CODES = Object.freeze({
        INVALID_PALETTE: "INVALID_PALETTE",
        MISSING_PROCEDURAL_PROFILE: "MISSING_PROCEDURAL_PROFILE",
        MISSING_BINDING: "MISSING_BINDING",
        INVALID_PROCEDURAL_PROFILE: "INVALID_PROCEDURAL_PROFILE",
        UNRESOLVABLE_PALETTE: "UNRESOLVABLE_PALETTE",
        INVALID_RESOLVED_COLOR: "INVALID_RESOLVED_COLOR",
        INVALID_LEGACY_SOURCE: "INVALID_LEGACY_SOURCE"
    });

    function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
    function finite(value) { return typeof value === "number" && isFinite(value); }
    function clone(value) { return PaletteModel.clone(value); }
    function deepFreeze(value) {
        if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
        Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
        return Object.freeze(value);
    }
    function failure(code, details) {
        return { ok: false, error: deepFreeze(Object.assign({ code: code }, details || {})) };
    }
    function stableStringify(value) {
        if (value === null || typeof value !== "object") return JSON.stringify(value);
        if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
        return "{" + Object.keys(value).sort().map(function (key) {
            return JSON.stringify(key) + ":" + stableStringify(value[key]);
        }).join(",") + "}";
    }
    function hashString(value) {
        var hash = 2166136261;
        var i;
        for (i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).toUpperCase();
    }
    function profileFailure(profile) {
        var role;
        var i;
        if (!isObject(profile)) return failure(ERROR_CODES.MISSING_PROCEDURAL_PROFILE);
        if (!isObject(profile.bindings)) return failure(ERROR_CODES.MISSING_BINDING, { role: "*" });
        for (i = 0; i < ROLES.length; i++) {
            role = ROLES[i];
            if (typeof profile.bindings[role] !== "string" || !profile.bindings[role]) {
                return failure(ERROR_CODES.MISSING_BINDING, { role: role });
            }
        }
        if (!Array.isArray(profile.stops) || profile.stops.length !== 4 || !profile.stops.every(finite) ||
                profile.stops[0] !== 0 || profile.stops[3] !== 1 ||
                !(profile.stops[0] < profile.stops[1] && profile.stops[1] < profile.stops[2] && profile.stops[2] < profile.stops[3])) {
            return failure(ERROR_CODES.INVALID_PROCEDURAL_PROFILE, { path: "stops" });
        }
        if (!isObject(profile.weights) || !ROLES.every(function (name) { return finite(profile.weights[name]) && profile.weights[name] >= 0; }) ||
                Math.abs(ROLES.reduce(function (total, name) { return total + profile.weights[name]; }, 0) - 1) > 0.001) {
            return failure(ERROR_CODES.INVALID_PROCEDURAL_PROFILE, { path: "weights" });
        }
        for (i = 0; i < BIASES.length; i++) {
            if (typeof profile[BIASES[i]] !== "undefined" && !finite(profile[BIASES[i]])) {
                return failure(ERROR_CODES.INVALID_PROCEDURAL_PROFILE, { path: BIASES[i] });
            }
        }
        return null;
    }
    function signaturePayload(palette) {
        var payload = {
            family: palette.family,
            colors: clone(palette.colors),
            stops: palette.stops.slice(0),
            weights: clone(palette.weights)
        };
        BIASES.forEach(function (name) {
            if (typeof palette[name] !== "undefined") payload[name] = palette[name];
        });
        return payload;
    }
    function createCompatibilitySignature(palette) {
        return "legacy-procedural-v2:" + hashString(stableStringify(signaturePayload(palette)));
    }
    function project(input, options) {
        var checked = PaletteModel.validatePalette(input);
        var firstValidation;
        var palette;
        var profile;
        var profileError;
        var resolved;
        var output;
        var role;
        var i;
        if (!checked.ok) {
            firstValidation = checked.errors[0] || {};
            if (/^profiles\.proceduralAppearance\.bindings(?:\.|$)/.test(firstValidation.path || "")) {
                return failure(ERROR_CODES.MISSING_BINDING, {
                    role: (firstValidation.path || "").split(".").pop(),
                    validationErrors: checked.errors.slice(0)
                });
            }
            if (/^profiles\.proceduralAppearance(?:\.|$)/.test(firstValidation.path || "")) {
                return failure(ERROR_CODES.INVALID_PROCEDURAL_PROFILE, {
                    path: firstValidation.path,
                    validationErrors: checked.errors.slice(0)
                });
            }
            return failure(ERROR_CODES.INVALID_PALETTE, { validationErrors: checked.errors.slice(0) });
        }
        palette = checked.palette;
        profile = palette.profiles && palette.profiles.proceduralAppearance;
        profileError = profileFailure(profile);
        if (profileError) return profileError;
        resolved = PaletteResolver.resolvePalette(palette, { registry: options && options.registry || DefaultDerivations });
        if (!resolved.ok) return failure(ERROR_CODES.UNRESOLVABLE_PALETTE, { cause: clone(resolved.error) });
        output = {
            id: palette.id,
            version: palette.revision,
            family: palette.metadata.family,
            displayName: palette.metadata.displayName,
            colors: {},
            stops: profile.stops.slice(0),
            weights: clone(profile.weights)
        };
        for (i = 0; i < ROLES.length; i++) {
            role = ROLES[i];
            output.colors[role] = PaletteModel.normalizeHex(resolved.colors[profile.bindings[role]]);
            if (!output.colors[role]) return failure(ERROR_CODES.INVALID_RESOLVED_COLOR, { role: role, slotId: profile.bindings[role] });
        }
        BIASES.forEach(function (name) {
            if (typeof profile[name] !== "undefined") output[name] = profile[name];
        });
        output.signature = createCompatibilitySignature(output);
        return { ok: true, palette: deepFreeze(output) };
    }
    function collectDependencies(slotId, slots, result, visiting) {
        var slot = slots[slotId];
        if (!slot || visiting[slotId]) return;
        visiting[slotId] = true;
        if (slot.kind === "REFERENCE") {
            result[slot.reference.slotId] = true;
            collectDependencies(slot.reference.slotId, slots, result, visiting);
        } else if (slot.kind === "DERIVED") {
            slot.derivation.sourceSlotIds.forEach(function (sourceId) {
                result[sourceId] = true;
                collectDependencies(sourceId, slots, result, visiting);
            });
        }
        delete visiting[slotId];
    }
    function classifyLegacyEditability(input, options) {
        var projection = project(input, options);
        var checked;
        var palette;
        var profile;
        var slots = Object.create(null);
        var bound = Object.create(null);
        var reasons = [];
        if (!projection.ok) return deepFreeze({ classification: CLASSIFICATIONS.READ_ONLY, reasons: [projection.error.code] });
        checked = PaletteModel.validatePalette(input);
        palette = checked.palette;
        profile = palette.profiles.proceduralAppearance;
        palette.slots.forEach(function (slot) { slots[slot.id] = slot; });
        ROLES.forEach(function (role) {
            var id = profile.bindings[role];
            if (bound[id]) reasons.push("SHARED_BOUND_SLOT");
            bound[id] = true;
            if (slots[id].kind !== "DIRECT") reasons.push("BOUND_SLOT_NOT_DIRECT");
        });
        palette.slots.forEach(function (slot) {
            var dependencies = Object.create(null);
            if (bound[slot.id]) return;
            collectDependencies(slot.id, slots, dependencies, Object.create(null));
            if (Object.keys(dependencies).some(function (id) { return bound[id]; })) reasons.push("BOUND_SLOT_HAS_HIDDEN_DEPENDENT");
        });
        reasons = reasons.filter(function (reason, index) { return reasons.indexOf(reason) === index; });
        return deepFreeze({
            classification: reasons.length ? CLASSIFICATIONS.READ_ONLY : CLASSIFICATIONS.EDITABLE,
            reasons: reasons
        });
    }
    function projectLegacySource(input, origin, options) {
        var converted = LegacyPaletteMigration.convertLegacyPalette(input, origin, options);
        if (!converted.ok) return failure(ERROR_CODES.INVALID_LEGACY_SOURCE, { validationErrors: clone(converted.errors || []) });
        return project(converted.palette, options);
    }

    return {
        roles: ROLES,
        errorCodes: ERROR_CODES,
        classifications: CLASSIFICATIONS,
        project: project,
        projectLegacySource: projectLegacySource,
        classifyLegacyEditability: classifyLegacyEditability,
        createCompatibilitySignature: createCompatibilitySignature
    };
}));
