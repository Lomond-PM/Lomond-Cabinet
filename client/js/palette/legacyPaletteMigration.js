(function (root, factory) {
    "use strict";

    var model = typeof module !== "undefined" && module.exports ? require("./paletteModel.js") : root.PaletteModel;
    var resolver = typeof module !== "undefined" && module.exports ? require("./paletteResolver.js") : root.PaletteResolver;
    var derivations = typeof module !== "undefined" && module.exports ? require("./colorDerivationRegistry.js") : root.ColorDerivationRegistry;
    var api = Object.freeze(factory(model, resolver, derivations));
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root && root.document && !root.LegacyPaletteMigration) root.LegacyPaletteMigration = api;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (PaletteModel, PaletteResolver, DefaultDerivations) {
    "use strict";

    var V1_KEY = "lomond.proceduralPaletteStore.v1";
    var V2_KEY = "lomond.paletteStore.v2";
    var V1_FORMAT = "lomond.proceduralPaletteStore";
    var V2_FORMAT = "lomond.paletteStore";
    var ROLES = ["shadow", "base", "secondary", "highlight"];
    var STATUS = Object.freeze({
        MIGRATED: "MIGRATED",
        MIGRATED_IN_MEMORY: "MIGRATED_IN_MEMORY",
        NO_LEGACY_DATA: "NO_LEGACY_DATA",
        ALREADY_MIGRATED: "ALREADY_MIGRATED",
        INVALID_LEGACY_JSON: "INVALID_LEGACY_JSON",
        INVALID_LEGACY_SCHEMA: "INVALID_LEGACY_SCHEMA",
        INVALID_LEGACY_PALETTE: "INVALID_LEGACY_PALETTE",
        INVALID_LEGACY_OVERRIDE: "INVALID_LEGACY_OVERRIDE",
        INVALID_MAPPING: "INVALID_MAPPING",
        V2_VALIDATION_FAILED: "V2_VALIDATION_FAILED",
        ROUNDTRIP_FAILED: "ROUNDTRIP_FAILED",
        STORAGE_READ_FAILED: "STORAGE_READ_FAILED",
        STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED",
        INVALID_EXISTING_V2: "INVALID_EXISTING_V2"
    });

    function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
    function clone(value) { return PaletteModel.clone(value); }
    function finite(value) { return typeof value === "number" && isFinite(value); }
    function validText(value) { return typeof value === "string" && !!value.replace(/^\s+|\s+$/g, ""); }
    function validRevision(value) { return finite(value) && value >= 1 && Math.floor(value) === value; }
    function equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
    function now(options) { return options && typeof options.clock === "function" ? String(options.clock()) : new Date().toISOString(); }

    function diagnosticState(sourceKey) {
        return {
            source: { key: sourceKey || V1_KEY, schemaVersion: null, rawPresent: false, parseStatus: "NOT_READ", validationStatus: "NOT_VALIDATED" },
            accepted: { customPalettes: [], builtInOverrides: [], hiddenBuiltInPaletteIds: [], toolPaletteMap: [] },
            rejected: []
        };
    }

    function reject(diagnostics, code, category, id, path, reason) {
        diagnostics.rejected.push({ code: code, category: category, id: id || "", path: path || "", reason: reason });
    }

    function validateLegacyPalette(input) {
        var errors = [];
        var i;
        var total = 0;
        if (!isObject(input)) return { ok: false, errors: [{ path: "", reason: "Palette must be an object." }] };
        if (!validText(input.id)) errors.push({ path: "id", reason: "Palette id is required." });
        if (!validRevision(input.version)) errors.push({ path: "version", reason: "Palette version must be a positive integer." });
        if (!validText(input.displayName)) errors.push({ path: "displayName", reason: "Palette displayName is required." });
        if (!validText(input.family)) errors.push({ path: "family", reason: "Palette family is required." });
        if (!isObject(input.colors)) {
            errors.push({ path: "colors", reason: "Palette colors must be an object." });
        } else {
            ROLES.forEach(function (role) {
                if (!PaletteModel.normalizeHex(input.colors[role])) errors.push({ path: "colors." + role, reason: "Palette color must be #RRGGBB." });
            });
        }
        if (!Array.isArray(input.stops) || input.stops.length !== 4 || !input.stops.every(finite) || input.stops[0] !== 0 || input.stops[3] !== 1 ||
                !(input.stops[0] < input.stops[1] && input.stops[1] < input.stops[2] && input.stops[2] < input.stops[3])) {
            errors.push({ path: "stops", reason: "Palette stops must be four increasing finite values from 0 to 1." });
        }
        if (!isObject(input.weights)) {
            errors.push({ path: "weights", reason: "Palette weights must be an object." });
        } else {
            for (i = 0; i < ROLES.length; i++) {
                if (!finite(input.weights[ROLES[i]]) || input.weights[ROLES[i]] < 0) errors.push({ path: "weights." + ROLES[i], reason: "Palette weight must be finite and non-negative." });
                else total += input.weights[ROLES[i]];
            }
            if (total <= 0) errors.push({ path: "weights", reason: "Palette weights must have a positive total." });
        }
        ["saturationBias", "luminanceBias", "contrastBias"].forEach(function (name) {
            if (typeof input[name] !== "undefined" && !finite(input[name])) errors.push({ path: name, reason: "Palette bias must be finite." });
        });
        return { ok: errors.length === 0, errors: errors };
    }

    function convertLegacyPalette(input, origin, options) {
        var source = clone(input);
        var validation;
        var palette;
        var modelResult;
        var resolution;
        if (origin === "builtIn" && source && !validText(source.displayName) && validText(source.id)) source.displayName = source.id;
        validation = validateLegacyPalette(source);
        if (!validation.ok) return { ok: false, errors: validation.errors };
        palette = {
            id: String(source.id),
            revision: source.version,
            metadata: { displayName: String(source.displayName), family: String(source.family), origin: origin },
            slots: ROLES.map(function (role) {
                return { id: role, label: role, kind: "DIRECT", value: { color: PaletteModel.normalizeHex(source.colors[role]) } };
            }),
            profiles: {
                proceduralAppearance: {
                    bindings: { shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" },
                    stops: source.stops.slice(0),
                    weights: clone(source.weights)
                }
            }
        };
        ["saturationBias", "luminanceBias", "contrastBias"].forEach(function (name) {
            if (typeof source[name] !== "undefined") palette.profiles.proceduralAppearance[name] = source[name];
        });
        modelResult = PaletteModel.validatePalette(palette);
        if (!modelResult.ok) return { ok: false, errors: modelResult.errors };
        resolution = PaletteResolver.resolvePalette(modelResult.palette, { registry: options && options.registry || DefaultDerivations });
        if (!resolution.ok) return { ok: false, errors: [resolution.error] };
        return { ok: true, palette: modelResult.palette };
    }

    function mergeLegacyOverride(factory, override) {
        var merged = Object.assign({}, clone(factory), clone(override));
        merged.id = factory.id;
        merged.version = factory.version;
        merged.colors = Object.assign({}, factory.colors, override.colors || {});
        merged.stops = override.stops ? override.stops.slice(0) : factory.stops.slice(0);
        merged.weights = Object.assign({}, factory.weights, override.weights || {});
        return merged;
    }

    function buildOverrideRecord(canonical, target) {
        var canonicalById = Object.create(null);
        var targetById = Object.create(null);
        var patch = { metadata: {}, slots: {}, removedSlotIds: [] };
        var canonicalOrder = canonical.slots.map(function (slot) { canonicalById[slot.id] = slot; return slot.id; });
        var targetOrder = target.slots.map(function (slot) { targetById[slot.id] = slot; return slot.id; });
        var key;
        if (canonical.metadata.displayName !== target.metadata.displayName) patch.metadata.displayName = target.metadata.displayName;
        if (canonical.metadata.family !== target.metadata.family) patch.metadata.family = target.metadata.family;
        canonical.slots.forEach(function (slot) { if (!targetById[slot.id]) patch.removedSlotIds.push(slot.id); });
        target.slots.forEach(function (slot) { if (!canonicalById[slot.id] || !equal(canonicalById[slot.id], slot)) patch.slots[slot.id] = clone(slot); });
        if (!equal(canonicalOrder, targetOrder)) patch.slotOrder = targetOrder.slice(0);
        if (!equal(canonical.profiles || {}, target.profiles || {})) patch.profiles = clone(target.profiles || {});
        if (!Object.keys(patch.metadata).length) delete patch.metadata;
        if (!Object.keys(patch.slots).length) delete patch.slots;
        if (!patch.removedSlotIds.length) delete patch.removedSlotIds;
        for (key in patch) if (Object.prototype.hasOwnProperty.call(patch, key)) break;
        return { paletteId: canonical.id, baseRevision: canonical.revision, revision: target.revision, patch: patch };
    }

    function indexLegacyBuiltIns(list) {
        var map = Object.create(null);
        (list || []).forEach(function (palette) { if (palette && validText(palette.id)) map[palette.id] = clone(palette); });
        return map;
    }

    function convertLegacyEnvelope(input, options) {
        var diagnostics = diagnosticState(options && options.sourceKey);
        var builtIns = indexLegacyBuiltIns(options && options.legacyBuiltInPalettes);
        var paletteIds = Object.create(null);
        var seenCustom = Object.create(null);
        var output;
        var result;
        var firstStatus = null;
        var convertedBuiltIns = Object.create(null);
        diagnostics.source.rawPresent = true;
        diagnostics.source.parseStatus = "PARSED";
        diagnostics.source.schemaVersion = input && input.schemaVersion;
        if (!isObject(input) || input.schemaVersion !== 1 || (typeof input.format !== "undefined" && input.format !== V1_FORMAT) ||
                !Array.isArray(input.customPalettes) || !isObject(input.builtInOverrides) || !Array.isArray(input.hiddenBuiltInPaletteIds) || !isObject(input.toolPaletteMap)) {
            diagnostics.source.validationStatus = "REJECTED";
            return { ok: false, status: STATUS.INVALID_LEGACY_SCHEMA, diagnostics: diagnostics };
        }
        output = {
            format: V2_FORMAT,
            schemaVersion: 2,
            customPalettes: [],
            builtInOverrides: {},
            hiddenBuiltInPaletteIds: [],
            toolPaletteMap: {},
            updatedAt: validText(input.updatedAt) ? input.updatedAt : now(options),
            migration: { source: options && options.sourceKey || V1_KEY, sourceSchemaVersion: 1, migratedAt: now(options), status: "complete" }
        };
        Object.keys(builtIns).forEach(function (id) {
            result = convertLegacyPalette(builtIns[id], "builtIn", options);
            if (result.ok) { convertedBuiltIns[id] = result.palette; paletteIds[id] = true; }
        });
        input.customPalettes.forEach(function (palette, index) {
            result = convertLegacyPalette(palette, "custom", options);
            if (!result.ok || seenCustom[palette && palette.id] || paletteIds[palette && palette.id]) {
                reject(diagnostics, STATUS.INVALID_LEGACY_PALETTE, "customPalettes", palette && palette.id, "customPalettes[" + index + "]", !result.ok ? "Invalid legacy custom palette." : "Duplicate or reserved Palette id.");
                firstStatus = firstStatus || STATUS.INVALID_LEGACY_PALETTE;
                return;
            }
            seenCustom[result.palette.id] = true;
            paletteIds[result.palette.id] = true;
            output.customPalettes.push(result.palette);
            diagnostics.accepted.customPalettes.push(result.palette.id);
        });
        Object.keys(input.builtInOverrides).forEach(function (id) {
            var factory = builtIns[id];
            var merged;
            var target;
            if (!factory || !isObject(input.builtInOverrides[id])) {
                reject(diagnostics, STATUS.INVALID_LEGACY_OVERRIDE, "builtInOverrides", id, "builtInOverrides." + id, "Override requires a known built-in canonical definition.");
                firstStatus = firstStatus || STATUS.INVALID_LEGACY_OVERRIDE;
                return;
            }
            merged = mergeLegacyOverride(factory, input.builtInOverrides[id]);
            target = convertLegacyPalette(merged, "builtIn", options);
            if (!target.ok || !convertedBuiltIns[id]) {
                reject(diagnostics, STATUS.INVALID_LEGACY_OVERRIDE, "builtInOverrides", id, "builtInOverrides." + id, "Invalid legacy built-in override.");
                firstStatus = firstStatus || STATUS.INVALID_LEGACY_OVERRIDE;
                return;
            }
            output.builtInOverrides[id] = buildOverrideRecord(convertedBuiltIns[id], target.palette);
            diagnostics.accepted.builtInOverrides.push(id);
        });
        input.hiddenBuiltInPaletteIds.forEach(function (id, index) {
            if (!validText(id)) {
                reject(diagnostics, STATUS.INVALID_LEGACY_SCHEMA, "hiddenBuiltInPaletteIds", "", "hiddenBuiltInPaletteIds[" + index + "]", "Hidden built-in id must be a non-empty string.");
                firstStatus = firstStatus || STATUS.INVALID_LEGACY_SCHEMA;
                return;
            }
            if (output.hiddenBuiltInPaletteIds.indexOf(id) === -1) output.hiddenBuiltInPaletteIds.push(id);
            diagnostics.accepted.hiddenBuiltInPaletteIds.push(id);
        });
        Object.keys(input.toolPaletteMap).forEach(function (toolId) {
            var paletteId = input.toolPaletteMap[toolId];
            if (!validText(toolId) || !validText(paletteId) || !paletteIds[paletteId]) {
                reject(diagnostics, STATUS.INVALID_MAPPING, "toolPaletteMap", toolId, "toolPaletteMap." + toolId, "Mapping must reference an existing migrated Palette id.");
                firstStatus = firstStatus || STATUS.INVALID_MAPPING;
                return;
            }
            output.toolPaletteMap[toolId] = paletteId;
            diagnostics.accepted.toolPaletteMap.push(toolId);
        });
        if (diagnostics.rejected.length) {
            diagnostics.source.validationStatus = "REJECTED";
            return { ok: false, status: firstStatus, diagnostics: diagnostics };
        }
        if (options && typeof options.validateV2 === "function") {
            result = options.validateV2(output);
            if (!result.ok) {
                diagnostics.source.validationStatus = "V2_REJECTED";
                return { ok: false, status: STATUS.V2_VALIDATION_FAILED, diagnostics: diagnostics, validation: result };
            }
            output = result.envelope;
        }
        diagnostics.source.validationStatus = "ACCEPTED";
        return { ok: true, status: STATUS.MIGRATED_IN_MEMORY, migratedState: output, diagnostics: diagnostics };
    }

    function migrateStorage(options) {
        var storage = options && options.storage;
        var v1Key = options && options.v1Key || V1_KEY;
        var v2Key = options && options.v2Key || V2_KEY;
        var diagnostics = diagnosticState(v1Key);
        var existing;
        var raw;
        var parsed;
        var converted;
        var serialized;
        var roundtrip;
        var validation;
        if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
            return { ok: false, status: STATUS.STORAGE_READ_FAILED, diagnostics: diagnostics };
        }
        try { existing = storage.getItem(v2Key); } catch (error) { return { ok: false, status: STATUS.STORAGE_READ_FAILED, diagnostics: diagnostics }; }
        if (existing) {
            try { parsed = JSON.parse(existing); } catch (error) { return { ok: false, status: STATUS.INVALID_EXISTING_V2, diagnostics: diagnostics }; }
            validation = options && typeof options.validateV2 === "function" ? options.validateV2(parsed) : { ok: true };
            return validation.ok ? { ok: true, status: STATUS.ALREADY_MIGRATED, migratedState: validation.envelope || parsed, diagnostics: diagnostics } : { ok: false, status: STATUS.INVALID_EXISTING_V2, diagnostics: diagnostics, validation: validation };
        }
        try { raw = storage.getItem(v1Key); } catch (error) { return { ok: false, status: STATUS.STORAGE_READ_FAILED, diagnostics: diagnostics }; }
        diagnostics.source.rawPresent = !!raw;
        if (!raw) return { ok: true, status: STATUS.NO_LEGACY_DATA, diagnostics: diagnostics };
        try { parsed = JSON.parse(raw); diagnostics.source.parseStatus = "PARSED"; } catch (error) {
            diagnostics.source.parseStatus = "INVALID_JSON";
            return { ok: false, status: STATUS.INVALID_LEGACY_JSON, source: { key: v1Key, raw: raw }, diagnostics: diagnostics };
        }
        converted = convertLegacyEnvelope(parsed, Object.assign({}, options, { sourceKey: v1Key }));
        converted.source = { key: v1Key, raw: raw };
        if (!converted.ok) return converted;
        try {
            serialized = JSON.stringify(converted.migratedState);
            roundtrip = JSON.parse(serialized);
        } catch (error) {
            return { ok: false, status: STATUS.ROUNDTRIP_FAILED, source: converted.source, diagnostics: converted.diagnostics };
        }
        validation = options && typeof options.validateV2 === "function" ? options.validateV2(roundtrip) : { ok: true, envelope: roundtrip };
        if (!validation.ok) return { ok: false, status: STATUS.ROUNDTRIP_FAILED, source: converted.source, diagnostics: converted.diagnostics, validation: validation };
        serialized = JSON.stringify(validation.envelope || roundtrip);
        try {
            storage.setItem(v2Key, serialized);
            if (storage.getItem(v2Key) !== serialized) throw new Error("Storage verification failed.");
        } catch (error) {
            try { if (typeof storage.removeItem === "function") storage.removeItem(v2Key); } catch (removeError) {}
            return { ok: false, status: STATUS.STORAGE_WRITE_FAILED, source: converted.source, diagnostics: converted.diagnostics };
        }
        return { ok: true, status: STATUS.MIGRATED, migratedState: validation.envelope || roundtrip, source: converted.source, diagnostics: converted.diagnostics };
    }

    return {
        v1Key: V1_KEY,
        v2Key: V2_KEY,
        v1Format: V1_FORMAT,
        v2Format: V2_FORMAT,
        statusCodes: STATUS,
        validateLegacyPalette: validateLegacyPalette,
        convertLegacyPalette: convertLegacyPalette,
        convertLegacyEnvelope: convertLegacyEnvelope,
        buildOverrideRecord: buildOverrideRecord,
        migrateStorage: migrateStorage
    };
}));
