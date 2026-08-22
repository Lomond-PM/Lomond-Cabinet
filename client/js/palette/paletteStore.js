(function (root, factory) {
    "use strict";

    var browser = !!(root && root.document);
    var model = browser ? root.PaletteModel : (typeof module !== "undefined" && module.exports ? require("./paletteModel.js") : root.PaletteModel);
    var resolver = browser ? root.PaletteResolver : (typeof module !== "undefined" && module.exports ? require("./paletteResolver.js") : root.PaletteResolver);
    var derivations = browser ? root.ColorDerivationRegistry : (typeof module !== "undefined" && module.exports ? require("./colorDerivationRegistry.js") : root.ColorDerivationRegistry);
    var migration = browser ? root.LegacyPaletteMigration : (typeof module !== "undefined" && module.exports ? require("./legacyPaletteMigration.js") : root.LegacyPaletteMigration);
    var api = Object.freeze(factory(model, resolver, derivations, migration));
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root && root.document && !root.PaletteStore) root.PaletteStore = api;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (PaletteModel, PaletteResolver, DefaultDerivations, LegacyMigration) {
    "use strict";

    var STORAGE_KEY = "lomond.paletteStore.v2";
    var FORMAT = "lomond.paletteStore";
    var SCHEMA_VERSION = 2;
    var ERROR_CODES = Object.freeze({
        INVALID_V2: "INVALID_V2",
        DUPLICATE_PALETTE_ID: "DUPLICATE_PALETTE_ID",
        INVALID_BUILT_IN_OVERRIDE: "INVALID_BUILT_IN_OVERRIDE",
        INVALID_MAPPING: "INVALID_MAPPING",
        PALETTE_NOT_FOUND: "PALETTE_NOT_FOUND",
        PALETTE_KIND_MISMATCH: "PALETTE_KIND_MISMATCH",
        STORAGE_READ_FAILED: "STORAGE_READ_FAILED",
        STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED",
        INVALID_IMPORT_JSON: "INVALID_IMPORT_JSON",
        UNSUPPORTED_IMPORT: "UNSUPPORTED_IMPORT"
    });

    function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
    function clone(value) { return PaletteModel.clone(value); }
    function validText(value) { return typeof value === "string" && !!value.replace(/^\s+|\s+$/g, ""); }
    function validRevision(value) { return typeof value === "number" && isFinite(value) && value >= 1 && Math.floor(value) === value; }
    function equal(left, right) { return canonicalSerialize(left) === canonicalSerialize(right); }
    function clockValue(clock) { return typeof clock === "function" ? String(clock()) : new Date().toISOString(); }

    function canonicalize(value) {
        var output;
        if (value === null || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(canonicalize);
        output = {};
        Object.keys(value).sort().forEach(function (key) { output[key] = canonicalize(value[key]); });
        return output;
    }

    function canonicalSerialize(value) { return JSON.stringify(canonicalize(value)); }

    function emptyEnvelope() {
        return {
            format: FORMAT,
            schemaVersion: SCHEMA_VERSION,
            customPalettes: [],
            builtInOverrides: {},
            hiddenBuiltInPaletteIds: [],
            toolPaletteMap: {},
            updatedAt: ""
        };
    }

    function error(code, path, reason) { return { code: code, path: path || "", reason: reason }; }

    function indexBuiltIns(list, registry, errors) {
        var map = Object.create(null);
        (list || []).forEach(function (palette, index) {
            var checked = PaletteModel.validatePalette(palette);
            var resolution;
            if (!checked.ok || checked.palette.metadata.origin !== "builtIn" || map[checked.ok && checked.palette.id]) {
                errors.push(error(ERROR_CODES.INVALID_V2, "builtInPalettes[" + index + "]", "Invalid or duplicate built-in canonical Palette."));
                return;
            }
            resolution = PaletteResolver.resolvePalette(checked.palette, { registry: registry });
            if (!resolution.ok) {
                errors.push(error(ERROR_CODES.INVALID_V2, "builtInPalettes[" + index + "]", "Built-in canonical Palette does not resolve."));
                return;
            }
            map[checked.palette.id] = checked.palette;
        });
        return map;
    }

    function applyOverrideRecord(canonical, record) {
        var target;
        var patch;
        var slotMap = Object.create(null);
        var order;
        var seen = Object.create(null);
        var invalidOrder = false;
        var checked;
        if (!canonical || !isObject(record) || record.paletteId !== canonical.id || !validRevision(record.baseRevision) || !validRevision(record.revision) || !isObject(record.patch)) {
            return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical ? canonical.id : "", "Malformed built-in override record.")] };
        }
        patch = record.patch;
        target = clone(canonical);
        target.revision = record.revision;
        if (typeof patch.metadata !== "undefined") {
            if (!isObject(patch.metadata) || (typeof patch.metadata.displayName !== "undefined" && !validText(patch.metadata.displayName)) ||
                    (typeof patch.metadata.family !== "undefined" && !validText(patch.metadata.family))) {
                return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical.id, "Invalid built-in metadata patch.")] };
            }
            if (typeof patch.metadata.displayName !== "undefined") target.metadata.displayName = patch.metadata.displayName;
            if (typeof patch.metadata.family !== "undefined") target.metadata.family = patch.metadata.family;
        }
        target.metadata.origin = "builtIn";
        target.slots.forEach(function (slot) { slotMap[slot.id] = slot; });
        if (typeof patch.removedSlotIds !== "undefined") {
            if (!Array.isArray(patch.removedSlotIds) || !patch.removedSlotIds.every(validText)) return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical.id, "Invalid removedSlotIds patch.")] };
            patch.removedSlotIds.forEach(function (id) { delete slotMap[id]; });
        }
        if (typeof patch.slots !== "undefined") {
            if (!isObject(patch.slots)) return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical.id, "Invalid slots patch.")] };
            Object.keys(patch.slots).forEach(function (id) { slotMap[id] = clone(patch.slots[id]); });
        }
        if (typeof patch.slotOrder !== "undefined") {
            if (!Array.isArray(patch.slotOrder)) return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical.id, "Invalid slotOrder patch.")] };
            order = patch.slotOrder.slice(0);
            order.forEach(function (id) { if (!validText(id) || seen[id] || !slotMap[id]) invalidOrder = true; seen[id] = true; });
            Object.keys(slotMap).forEach(function (id) { if (!seen[id]) invalidOrder = true; });
            if (invalidOrder) return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical.id, "slotOrder must contain every resulting slot exactly once.")] };
        } else {
            order = canonical.slots.map(function (slot) { return slot.id; }).filter(function (id) { return !!slotMap[id]; });
            Object.keys(slotMap).sort().forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
        }
        target.slots = order.map(function (id) { return clone(slotMap[id]); });
        if (typeof patch.profiles !== "undefined") {
            if (!isObject(patch.profiles)) return { ok: false, errors: [error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, canonical.id, "Invalid profiles patch.")] };
            target.profiles = clone(patch.profiles);
        }
        checked = PaletteModel.validatePalette(target);
        return checked.ok ? { ok: true, palette: checked.palette } : { ok: false, errors: checked.errors };
    }

    function validateEnvelope(input, options) {
        var registry = options && options.registry || DefaultDerivations;
        var errors = [];
        var envelope;
        var builtIns = indexBuiltIns(options && options.builtInPalettes, registry, errors);
        var paletteIds = Object.create(null);
        var hidden = Object.create(null);
        if (!isObject(input) || input.format !== FORMAT || input.schemaVersion !== SCHEMA_VERSION || !Array.isArray(input.customPalettes) ||
                !isObject(input.builtInOverrides) || !Array.isArray(input.hiddenBuiltInPaletteIds) || !isObject(input.toolPaletteMap) || typeof input.updatedAt !== "string") {
            return { ok: false, errors: errors.concat([error(ERROR_CODES.INVALID_V2, "", "Invalid Palette Store v2 envelope.")]) };
        }
        envelope = clone(input);
        Object.keys(builtIns).forEach(function (id) { paletteIds[id] = true; });
        envelope.customPalettes.forEach(function (palette, index) {
            var checked = PaletteModel.validatePalette(palette);
            var resolution;
            if (!checked.ok || checked.palette.metadata.origin !== "custom") {
                errors.push(error(ERROR_CODES.INVALID_V2, "customPalettes[" + index + "]", "Invalid custom Palette."));
                return;
            }
            if (paletteIds[checked.palette.id]) {
                errors.push(error(ERROR_CODES.DUPLICATE_PALETTE_ID, "customPalettes[" + index + "].id", "Palette id collides with another Palette."));
                return;
            }
            resolution = PaletteResolver.resolvePalette(checked.palette, { registry: registry });
            if (!resolution.ok) {
                errors.push(error(ERROR_CODES.INVALID_V2, "customPalettes[" + index + "]", "Custom Palette does not resolve."));
                return;
            }
            paletteIds[checked.palette.id] = true;
            envelope.customPalettes[index] = checked.palette;
        });
        Object.keys(envelope.builtInOverrides).forEach(function (id) {
            var applied;
            var resolution;
            if (!builtIns[id]) {
                errors.push(error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, "builtInOverrides." + id, "Override has no built-in canonical Palette."));
                return;
            }
            applied = applyOverrideRecord(builtIns[id], envelope.builtInOverrides[id]);
            if (!applied.ok) {
                errors.push(error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, "builtInOverrides." + id, "Override does not produce a valid Palette."));
                return;
            }
            resolution = PaletteResolver.resolvePalette(applied.palette, { registry: registry });
            if (!resolution.ok) errors.push(error(ERROR_CODES.INVALID_BUILT_IN_OVERRIDE, "builtInOverrides." + id, "Resolved override has invalid dependencies."));
        });
        envelope.hiddenBuiltInPaletteIds.forEach(function (id, index) {
            if (!validText(id) || hidden[id]) errors.push(error(ERROR_CODES.INVALID_V2, "hiddenBuiltInPaletteIds[" + index + "]", "Hidden built-in ids must be unique non-empty strings."));
            else hidden[id] = true;
        });
        Object.keys(envelope.toolPaletteMap).forEach(function (toolId) {
            var paletteId = envelope.toolPaletteMap[toolId];
            if (!validText(toolId) || !validText(paletteId) || !paletteIds[paletteId]) errors.push(error(ERROR_CODES.INVALID_MAPPING, "toolPaletteMap." + toolId, "Tool mapping must reference an existing Palette."));
        });
        if (typeof envelope.migration !== "undefined" && (!isObject(envelope.migration) || !validText(envelope.migration.source) || envelope.migration.sourceSchemaVersion !== 1 ||
                !validText(envelope.migration.migratedAt) || envelope.migration.status !== "complete")) {
            errors.push(error(ERROR_CODES.INVALID_V2, "migration", "Invalid migration completion metadata."));
        }
        return errors.length ? { ok: false, errors: errors } : { ok: true, errors: [], envelope: envelope };
    }

    function create(options) {
        options = options || {};
        var storage = options.storage;
        var registry = options.registry || DefaultDerivations;
        var clock = options.clock;
        var builtInPalettes = clone(options.builtInPalettes || []);
        var legacyBuiltInPalettes = clone(options.legacyBuiltInPalettes || []);
        var state = emptyEnvelope();

        function validate(value) { return validateEnvelope(value, { builtInPalettes: builtInPalettes, registry: registry }); }
        function builtInIndex() {
            var map = Object.create(null);
            builtInPalettes.forEach(function (palette) { map[palette.id] = palette; });
            return map;
        }
        function commit(next) {
            var checked;
            var serialized;
            var previous = null;
            next = clone(next);
            next.updatedAt = clockValue(clock);
            checked = validate(next);
            if (!checked.ok) return checked;
            serialized = canonicalSerialize(checked.envelope);
            try {
                if (!storage || typeof storage.setItem !== "function") throw new Error("Storage unavailable.");
                previous = typeof storage.getItem === "function" ? storage.getItem(STORAGE_KEY) : null;
                storage.setItem(STORAGE_KEY, serialized);
            } catch (exception) {
                try {
                    if (storage && previous !== null && typeof storage.setItem === "function") storage.setItem(STORAGE_KEY, previous);
                    else if (storage && typeof storage.removeItem === "function") storage.removeItem(STORAGE_KEY);
                } catch (rollbackError) {}
                return { ok: false, errors: [error(ERROR_CODES.STORAGE_WRITE_FAILED, STORAGE_KEY, "Unable to persist Palette Store v2.")] };
            }
            state = checked.envelope;
            return { ok: true, envelope: clone(state) };
        }
        function getPalette(id) {
            var builtIns = builtInIndex();
            var i;
            var applied;
            if (builtIns[id]) {
                applied = state.builtInOverrides[id] ? applyOverrideRecord(builtIns[id], state.builtInOverrides[id]) : { ok: true, palette: builtIns[id] };
                return applied.ok ? clone(applied.palette) : null;
            }
            for (i = 0; i < state.customPalettes.length; i++) if (state.customPalettes[i].id === id) return clone(state.customPalettes[i]);
            return null;
        }
        function listPalettes(includeHidden) {
            var hidden = state.hiddenBuiltInPaletteIds;
            var result = [];
            builtInPalettes.forEach(function (palette) {
                var resolved = getPalette(palette.id);
                if (includeHidden || hidden.indexOf(palette.id) === -1) result.push(resolved);
            });
            return result.concat(clone(state.customPalettes));
        }
        function load() {
            var raw;
            var parsed;
            var checked;
            try { raw = storage && storage.getItem(STORAGE_KEY); } catch (exception) { return { ok: false, errors: [error(ERROR_CODES.STORAGE_READ_FAILED, STORAGE_KEY, "Unable to read Palette Store v2.")] }; }
            if (!raw) { state = emptyEnvelope(); return { ok: true, status: "EMPTY", envelope: clone(state) }; }
            try { parsed = JSON.parse(raw); } catch (exception) { return { ok: false, errors: [error(ERROR_CODES.INVALID_V2, STORAGE_KEY, "Palette Store v2 JSON is invalid.")] }; }
            checked = validate(parsed);
            if (!checked.ok) return checked;
            state = checked.envelope;
            return { ok: true, status: "LOADED", envelope: clone(state) };
        }
        function createCustomPalette(palette) {
            var checked = PaletteModel.validatePalette(palette);
            var next;
            if (!checked.ok) return checked;
            if (checked.palette.metadata.origin !== "custom") return { ok: false, errors: [error(ERROR_CODES.PALETTE_KIND_MISMATCH, checked.palette.id, "New Palette must be custom.")] };
            if (getPalette(checked.palette.id)) return { ok: false, errors: [error(ERROR_CODES.DUPLICATE_PALETTE_ID, checked.palette.id, "Palette id already exists.")] };
            next = clone(state); next.customPalettes.push(checked.palette); return commit(next);
        }
        function updateCustomPalette(id, palette) {
            var checked = PaletteModel.validatePalette(palette);
            var next = clone(state);
            var index = -1;
            var i;
            if (!checked.ok) return checked;
            if (checked.palette.id !== id || checked.palette.metadata.origin !== "custom") return { ok: false, errors: [error(ERROR_CODES.PALETTE_KIND_MISMATCH, id, "Custom Palette identity cannot change.")] };
            for (i = 0; i < next.customPalettes.length; i++) if (next.customPalettes[i].id === id) index = i;
            if (index < 0) return { ok: false, errors: [error(ERROR_CODES.PALETTE_NOT_FOUND, id, "Custom Palette not found.")] };
            next.customPalettes[index] = checked.palette; return commit(next);
        }
        function deleteCustomPalette(id) {
            var next = clone(state);
            var index = -1;
            var removedMappings = [];
            var i;
            for (i = 0; i < next.customPalettes.length; i++) if (next.customPalettes[i].id === id) index = i;
            if (index < 0) return { ok: false, errors: [error(ERROR_CODES.PALETTE_NOT_FOUND, id, "Custom Palette not found.")] };
            next.customPalettes.splice(index, 1);
            Object.keys(next.toolPaletteMap).forEach(function (toolId) { if (next.toolPaletteMap[toolId] === id) { delete next.toolPaletteMap[toolId]; removedMappings.push(toolId); } });
            var result = commit(next); if (result.ok) result.removedToolMappings = removedMappings; return result;
        }
        function setBuiltInOverride(id, palette) {
            var builtIns = builtInIndex();
            var checked = PaletteModel.validatePalette(palette);
            var next;
            if (!builtIns[id]) return { ok: false, errors: [error(ERROR_CODES.PALETTE_NOT_FOUND, id, "Built-in Palette not found.")] };
            if (!checked.ok) return checked;
            if (checked.palette.id !== id || checked.palette.metadata.origin !== "builtIn") return { ok: false, errors: [error(ERROR_CODES.PALETTE_KIND_MISMATCH, id, "Override must preserve built-in identity.")] };
            next = clone(state); next.builtInOverrides[id] = LegacyMigration.buildOverrideRecord(builtIns[id], checked.palette); return commit(next);
        }
        function removeBuiltInOverride(id) { var next = clone(state); if (!Object.prototype.hasOwnProperty.call(next.builtInOverrides, id)) return { ok: false, errors: [error(ERROR_CODES.PALETTE_NOT_FOUND, id, "Built-in override not found.")] }; delete next.builtInOverrides[id]; return commit(next); }
        function setBuiltInHidden(id, hidden) { var next = clone(state); var index; if (!validText(id)) return { ok: false, errors: [error(ERROR_CODES.INVALID_V2, id, "Built-in id is required.")] }; index = next.hiddenBuiltInPaletteIds.indexOf(id); if (hidden && index < 0) next.hiddenBuiltInPaletteIds.push(id); if (!hidden && index >= 0) next.hiddenBuiltInPaletteIds.splice(index, 1); return commit(next); }
        function setToolPaletteMapping(toolId, paletteId) { var next = clone(state); if (!validText(toolId) || !getPalette(paletteId)) return { ok: false, errors: [error(ERROR_CODES.INVALID_MAPPING, toolId, "Tool mapping requires an existing Palette.")] }; next.toolPaletteMap[toolId] = paletteId; return commit(next); }
        function removeToolPaletteMapping(toolId) { var next = clone(state); if (!Object.prototype.hasOwnProperty.call(next.toolPaletteMap, toolId)) return { ok: false, errors: [error(ERROR_CODES.INVALID_MAPPING, toolId, "Tool mapping not found.")] }; delete next.toolPaletteMap[toolId]; return commit(next); }
        function exportData() { var checked = validate(state); return checked.ok ? { ok: true, data: clone(checked.envelope), json: canonicalSerialize(checked.envelope) } : checked; }
        function nextImportedId(id, occupied) { var candidate = id + "_imported"; var suffix = 2; while (occupied[candidate]) { candidate = id + "_imported_" + suffix; suffix += 1; } return candidate; }
        function importData(input, importOptions) {
            var parsed;
            var converted;
            var checked;
            var imported;
            var mode = importOptions && importOptions.mode === "merge" ? "merge" : "replace";
            var next;
            var occupied = Object.create(null);
            var remapped = {};
            var importMigrationDiagnostics = null;
            try { parsed = typeof input === "string" ? JSON.parse(input) : clone(input); } catch (exception) { return { ok: false, errors: [error(ERROR_CODES.INVALID_IMPORT_JSON, "", "Import JSON is invalid.")] }; }
            if (parsed && parsed.schemaVersion === 1 && (typeof parsed.format === "undefined" || parsed.format === LegacyMigration.v1Format)) {
                converted = LegacyMigration.convertLegacyEnvelope(parsed, { sourceKey: "import:" + LegacyMigration.v1Format, legacyBuiltInPalettes: legacyBuiltInPalettes, registry: registry, clock: clock, validateV2: validate });
                if (!converted.ok) return converted;
                parsed = converted.migratedState;
                importMigrationDiagnostics = converted.diagnostics;
            } else if (!parsed || parsed.format !== FORMAT || parsed.schemaVersion !== 2) {
                return { ok: false, errors: [error(ERROR_CODES.UNSUPPORTED_IMPORT, "", "Unsupported Palette import format.")] };
            }
            checked = validate(parsed); if (!checked.ok) return checked; imported = checked.envelope;
            if (mode === "replace") { next = clone(imported); next.updatedAt = clockValue(clock); var replaced = commit(next); if (replaced.ok && importMigrationDiagnostics) replaced.migrationDiagnostics = importMigrationDiagnostics; return replaced; }
            next = clone(state);
            builtInPalettes.forEach(function (palette) { occupied[palette.id] = true; });
            next.customPalettes.forEach(function (palette) { occupied[palette.id] = true; });
            imported.customPalettes.forEach(function (palette) { var copy = clone(palette); if (occupied[copy.id]) { remapped[copy.id] = nextImportedId(copy.id, occupied); copy.id = remapped[copy.id]; } occupied[copy.id] = true; next.customPalettes.push(copy); });
            Object.keys(imported.builtInOverrides).forEach(function (id) { if (!Object.prototype.hasOwnProperty.call(next.builtInOverrides, id)) next.builtInOverrides[id] = clone(imported.builtInOverrides[id]); });
            imported.hiddenBuiltInPaletteIds.forEach(function (id) { if (next.hiddenBuiltInPaletteIds.indexOf(id) < 0) next.hiddenBuiltInPaletteIds.push(id); });
            Object.keys(imported.toolPaletteMap).forEach(function (toolId) { if (!Object.prototype.hasOwnProperty.call(next.toolPaletteMap, toolId)) next.toolPaletteMap[toolId] = remapped[imported.toolPaletteMap[toolId]] || imported.toolPaletteMap[toolId]; });
            var result = commit(next); if (result.ok) { result.remappedPaletteIds = remapped; if (importMigrationDiagnostics) result.migrationDiagnostics = importMigrationDiagnostics; } return result;
        }
        function migrateLegacy() {
            var result = LegacyMigration.migrateStorage({ storage: storage, v1Key: LegacyMigration.v1Key, v2Key: STORAGE_KEY, legacyBuiltInPalettes: legacyBuiltInPalettes, builtInPalettes: builtInPalettes, registry: registry, clock: clock, validateV2: validate });
            if (result.ok && (result.status === LegacyMigration.statusCodes.MIGRATED || result.status === LegacyMigration.statusCodes.ALREADY_MIGRATED)) state = clone(result.migratedState);
            return result;
        }

        return Object.freeze({
            storageKey: STORAGE_KEY,
            schemaVersion: SCHEMA_VERSION,
            load: load,
            save: function () { return commit(state); },
            getPalette: getPalette,
            listPalettes: listPalettes,
            createCustomPalette: createCustomPalette,
            updateCustomPalette: updateCustomPalette,
            deleteCustomPalette: deleteCustomPalette,
            setBuiltInOverride: setBuiltInOverride,
            removeBuiltInOverride: removeBuiltInOverride,
            setBuiltInHidden: setBuiltInHidden,
            setToolPaletteMapping: setToolPaletteMapping,
            removeToolPaletteMapping: removeToolPaletteMapping,
            exportData: exportData,
            importData: importData,
            migrateLegacy: migrateLegacy,
            getSnapshot: function () { return clone(state); }
        });
    }

    return {
        storageKey: STORAGE_KEY,
        format: FORMAT,
        schemaVersion: SCHEMA_VERSION,
        errorCodes: ERROR_CODES,
        emptyEnvelope: emptyEnvelope,
        canonicalSerialize: canonicalSerialize,
        applyOverrideRecord: applyOverrideRecord,
        validateEnvelope: validateEnvelope,
        create: create
    };
}));
