(function (root, factory) {
    "use strict";
    var api = factory(root,
        typeof module !== "undefined" && module.exports ? require("./palette/paletteModel.js") : root.PaletteModel,
        typeof module !== "undefined" && module.exports ? require("./palette/colorDerivationRegistry.js") : root.ColorDerivationRegistry,
        typeof module !== "undefined" && module.exports ? require("./palette/legacyPaletteMigration.js") : root.LegacyPaletteMigration,
        typeof module !== "undefined" && module.exports ? require("./palette/paletteStore.js") : root.PaletteStore,
        typeof module !== "undefined" && module.exports ? require("./palette/legacyProceduralPaletteAdapter.js") : root.LegacyProceduralPaletteAdapter);
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (root) root.ProceduralPaletteStore = api;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root, Model, Derivations, Migration, StoreV2, Adapter) {
    "use strict";
    var LEGACY_KEY = "lomond.proceduralPaletteStore.v1";
    var TRANSIENT_ID = "paletteEditorPreview";
    var FALLBACKS = { ecommerceLayout: "warmCoral", shapeAdd: "pacificCyan", textBackgroundBox: "blueLavender", selectionInfo: "graphiteSilver", proceduralAppearanceLab: "tealLuminous", registryControlLab: "slateIce", settingsRendererLab: "plumRose" };
    var authority = null;
    var library = null;
    var builtIns = [];
    var listeners = [];
    var transients = Object.create(null);
    var startup = null;
    var recovery = null;
    var initialized = false;

    function clone(value) { return Model.clone(value); }
    function trim(value) { return String(value || "").replace(/^\s+|\s+$/g, ""); }
    function normalizeWeights(weights) {
        var roles = ["shadow", "base", "secondary", "highlight"];
        var fallback = { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 };
        var output = {};
        var total = 0;
        roles.forEach(function (role) { var value = Number(weights && weights[role]); output[role] = isFinite(value) && value >= 0 ? value : 0; total += output[role]; });
        if (total <= 0) return fallback;
        roles.forEach(function (role) { output[role] = Math.round(output[role] / total * 10000) / 10000; });
        total = output.shadow + output.base + output.secondary + output.highlight;
        output.highlight = Math.round((output.highlight + 1 - total) * 10000) / 10000;
        return output;
    }
    function errors(result, fallback) { return result && result.errors ? result.errors.map(function (item) { return item.reason || item.message || item.code; }) : [fallback]; }
    function blocked() { return recovery ? { ok: false, errors: ["Palette Store is read-only: " + recovery.code], recovery: clone(recovery) } : null; }
    function legacyBuiltIns() { return library && library.listPalettes ? library.listPalettes() : []; }
    function snapshot() { return authority ? authority.getSnapshot() : StoreV2.emptyEnvelope(); }
    function find(id) { return authority ? authority.getPalette(id) : null; }
    function isBuiltIn(id) { return builtIns.some(function (palette) { return palette.id === id; }); }
    function project(source) { var result = source && Adapter.project(source, { registry: Derivations }); return result && result.ok ? clone(result.palette) : null; }
    function decorate(source) {
        var envelope = snapshot();
        var output = project(source);
        var builtIn = source.metadata.origin === "builtIn";
        if (!output) return null;
        output.isBuiltIn = builtIn;
        output.isCustom = !builtIn;
        output.isModified = builtIn && Object.prototype.hasOwnProperty.call(envelope.builtInOverrides, source.id);
        output.isHidden = builtIn && envelope.hiddenBuiltInPaletteIds.indexOf(source.id) >= 0;
        output.legacyEditability = Adapter.classifyLegacyEditability(source, { registry: Derivations }).classification;
        return output;
    }
    function notify(change) { var data = exportData(); listeners.slice(0).forEach(function (listener) { try { listener(data, change); } catch (error) {} }); }
    function convert(input, origin, forcedId) {
        var source = clone(input || {});
        if (forcedId) source.id = forcedId;
        source.version = Number(source.version) > 0 ? Math.floor(Number(source.version)) : 1;
        source.displayName = trim(source.displayName) || source.id;
        source.family = trim(source.family) || "userCustom";
        source.stops = Array.isArray(source.stops) ? source.stops.slice(0) : [0, 0.34, 0.74, 1];
        source.weights = normalizeWeights(source.weights);
        return Migration.convertLegacyPalette(source, origin, { registry: Derivations });
    }
    function listResolvedPalettes(includeHidden) { return authority ? authority.listPalettes(!!includeHidden).map(decorate).filter(Boolean) : []; }
    function getResolvedPalette(id) { return transients[id] ? clone(transients[id]) : (find(id) ? decorate(find(id)) : null); }
    function getResolvedPaletteSignature(id) { var palette = getResolvedPalette(id); return palette ? palette.signature : ""; }
    function generateId() { var base = "userPalette_" + Date.now().toString(36); var id = base; var i = 1; while (find(id)) { i += 1; id = base + "_" + i; } return id; }
    function createPalette(input) {
        var guard = blocked(); var source = clone(input || {}); var converted; var result;
        if (guard) return guard;
        source.id = generateId(); source.displayName = trim(source.displayName) || source.id;
        converted = convert(source, "custom");
        if (!converted.ok) return { ok: false, errors: errors(converted, "Invalid Palette.") };
        result = authority.createCustomPalette(converted.palette);
        if (!result.ok) return { ok: false, errors: errors(result, "Unable to create Palette.") };
        notify({ type: "create", paletteId: source.id }); return { ok: true, palette: getResolvedPalette(source.id) };
    }
    function duplicatePalette(id) {
        var guard = blocked(); var source = find(id); var copy; var result; var newId;
        if (guard) return guard; if (!source) return { ok: false, errors: ["Palette not found."] };
        newId = generateId(); copy = clone(source); copy.id = newId; copy.revision = 1; copy.metadata.origin = "custom"; copy.metadata.displayName = source.metadata.displayName + " Copy";
        result = authority.createCustomPalette(copy); if (!result.ok) return { ok: false, errors: errors(result, "Unable to duplicate Palette.") };
        notify({ type: "duplicate", paletteId: newId, sourcePaletteId: id }); return { ok: true, palette: getResolvedPalette(newId) };
    }
    function losslessPatch(source, patch) {
        var capability = Adapter.classifyLegacyEditability(source, { registry: Derivations }); var next; var profile; var slots = Object.create(null);
        if (capability.classification !== Adapter.classifications.EDITABLE) return { ok: false, errors: ["Palette is LEGACY_READ_ONLY and cannot be saved by the legacy editor."], classification: capability };
        next = clone(source); profile = next.profiles.proceduralAppearance; next.slots.forEach(function (slot) { slots[slot.id] = slot; });
        if (patch.displayName) next.metadata.displayName = trim(patch.displayName) || next.metadata.displayName;
        if (patch.family) next.metadata.family = trim(patch.family) || next.metadata.family;
        if (patch.colors) Object.keys(profile.bindings).forEach(function (role) { if (Object.prototype.hasOwnProperty.call(patch.colors, role)) slots[profile.bindings[role]].value.color = patch.colors[role]; });
        if (patch.stops) profile.stops = patch.stops.slice(0);
        if (patch.weights) profile.weights = normalizeWeights(Object.assign({}, profile.weights, clone(patch.weights)));
        ["saturationBias", "luminanceBias", "contrastBias"].forEach(function (name) { if (Object.prototype.hasOwnProperty.call(patch, name)) profile[name] = patch[name]; });
        next.revision += 1; return { ok: true, palette: next };
    }
    function updatePalette(id, patch) {
        var guard = blocked(); var source = find(id); var next; var result;
        if (guard) return guard; if (!source) return { ok: false, errors: ["Palette not found."] };
        next = losslessPatch(source, patch || {}); if (!next.ok) return next;
        result = isBuiltIn(id) ? authority.setBuiltInOverride(id, next.palette) : authority.updateCustomPalette(id, next.palette);
        if (!result.ok) return { ok: false, errors: errors(result, "Unable to update Palette.") };
        notify({ type: "update", paletteId: id }); return { ok: true, palette: getResolvedPalette(id) };
    }
    function setTransientPalette(externalId, input) {
        var converted = convert(input, "custom", TRANSIENT_ID); var projected;
        if (!externalId || !converted.ok) return { ok: false, errors: errors(converted, "Invalid transient Palette.") };
        projected = Adapter.project(converted.palette, { registry: Derivations }); if (!projected.ok) return { ok: false, errors: [projected.error.code] };
        transients[externalId] = Object.assign({}, clone(projected.palette), { id: externalId, isTransient: true, isBuiltIn: false, isCustom: false });
        return { ok: true, palette: clone(transients[externalId]) };
    }
    function clearTransientPalette(id) { if (id) delete transients[id]; else transients = Object.create(null); }
    function deletePalette(id) {
        var guard = blocked(); var result; if (guard) return guard; if (isBuiltIn(id)) return { ok: false, errors: ["Built-in palettes cannot be deleted."] };
        result = authority.deleteCustomPalette(id); if (!result.ok) return { ok: false, errors: errors(result, "Unable to delete Palette.") };
        notify({ type: "delete", paletteId: id, removedToolMappings: result.removedToolMappings || [], externalReferencesRequireValidation: true });
        return { ok: true, removedToolMappings: result.removedToolMappings || [], externalReferencesRequireValidation: true };
    }
    function resetBuiltInPalette(id) {
        var guard = blocked(); var result; if (guard) return guard; if (!isBuiltIn(id)) return { ok: false, errors: ["Palette is not built in."] };
        if (!hasBuiltInOverride(id)) return { ok: true, palette: getResolvedPalette(id) };
        result = authority.removeBuiltInOverride(id); if (!result.ok) return { ok: false, errors: errors(result, "Unable to reset Palette.") };
        notify({ type: "reset", paletteId: id }); return { ok: true, palette: getResolvedPalette(id) };
    }
    function hideBuiltInPalette(id, hidden) {
        var guard = blocked(); var result; if (guard) return guard; if (!isBuiltIn(id)) return { ok: false, errors: ["Palette is not built in."] };
        result = authority.setBuiltInHidden(id, !!hidden); if (!result.ok) return { ok: false, errors: errors(result, "Unable to change Palette visibility.") };
        notify({ type: "visibility", paletteId: id, hidden: !!hidden }); return { ok: true };
    }
    function fallbackToolPalette(toolId) { var id = trim(toolId); var ids = builtIns.map(function (palette) { return palette.id; }); if (FALLBACKS[id] && find(FALLBACKS[id])) return FALLBACKS[id]; return id && ids.length ? ids[parseInt(hashString(id), 16) % ids.length] : ""; }
    function hashString(input) { var value = String(input || ""); var hash = 2166136261; var i; for (i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16); }
    function getToolPalette(toolId) { var value = snapshot().toolPaletteMap[trim(toolId)]; return value && find(value) ? value : fallbackToolPalette(toolId); }
    function setToolPalette(toolId, paletteId) {
        var guard = blocked(); var tool = trim(toolId); var id = trim(paletteId); var result; if (guard) return guard; if (!tool) return { ok: false, errors: ["Tool id is required."] };
        result = id ? authority.setToolPaletteMapping(tool, id) : (Object.prototype.hasOwnProperty.call(snapshot().toolPaletteMap, tool) ? authority.removeToolPaletteMapping(tool) : { ok: true });
        if (!result.ok) return { ok: false, errors: errors(result, "Unable to set tool Palette.") };
        notify({ type: "toolMapping", toolId: tool, paletteId: id }); return { ok: true, paletteId: getToolPalette(tool) };
    }
    function exportData() { var result = authority && authority.exportData(); return result && result.ok ? result.data : StoreV2.emptyEnvelope(); }
    function importData(input, options) { var guard = blocked(); var result; if (guard) return guard; result = authority.importData(input, options); if (!result.ok) return result; notify({ type: "import" }); return { ok: true, data: exportData(), remappedPaletteIds: result.remappedPaletteIds || {} }; }
    function validateImportData(input) { var memory = { getItem: function () { return null; }, setItem: function () {} }; return StoreV2.create({ storage: memory, builtInPalettes: builtIns, legacyBuiltInPalettes: legacyBuiltIns(), registry: Derivations }).importData(input, { mode: "replace" }); }
    function clearUserData() { var guard = blocked(); var result; if (guard) return guard; result = authority.importData(StoreV2.emptyEnvelope(), { mode: "replace" }); if (result.ok) notify({ type: "clear" }); return result.ok ? { ok: true } : result; }
    function initialize(options) {
        var converted = []; var conversionFailure = null; var storage; var load; var migration; var saved;
        options = options || {}; library = options.library || (root && root.ProceduralPaletteLibrary); storage = options.storage || (root && root.localStorage);
        legacyBuiltIns().forEach(function (palette) { var result = Migration.convertLegacyPalette(palette, "builtIn", { registry: Derivations }); if (result.ok) converted.push(result.palette); else conversionFailure = result; });
        builtIns = converted; transients = Object.create(null); recovery = null;
        if (conversionFailure) { recovery = { code: "INVALID_BUILT_IN_CANONICAL", errors: clone(conversionFailure.errors || []) }; startup = { ok: false, status: "READ_ONLY_RECOVERY", recovery: clone(recovery) }; return startup; }
        authority = StoreV2.create({ storage: storage, clock: options.clock, builtInPalettes: builtIns, legacyBuiltInPalettes: legacyBuiltIns(), registry: Derivations });
        load = authority.load();
        if (!load.ok) { recovery = { code: "INVALID_V2", errors: clone(load.errors || []) }; startup = { ok: false, status: "READ_ONLY_RECOVERY", recovery: clone(recovery) }; initialized = true; return clone(startup); }
        if (load.status === "LOADED") { startup = { ok: true, status: "V2_LOADED" }; initialized = true; return clone(startup); }
        migration = authority.migrateLegacy();
        if (migration.ok && migration.status === Migration.statusCodes.MIGRATED) startup = { ok: true, status: "V1_MIGRATED", diagnostics: clone(migration.diagnostics || null) };
        else if (migration.ok && migration.status === Migration.statusCodes.NO_LEGACY_DATA) { saved = authority.save(); if (saved.ok) startup = { ok: true, status: "V2_CREATED" }; else { recovery = { code: "V2_INITIALIZATION_WRITE_FAILED", errors: clone(saved.errors || []) }; startup = { ok: false, status: "READ_ONLY_RECOVERY", recovery: clone(recovery) }; } }
        else { recovery = { code: "INVALID_V1", status: migration.status, diagnostics: clone(migration.diagnostics || null) }; startup = { ok: false, status: "READ_ONLY_RECOVERY", recovery: clone(recovery) }; }
        initialized = true; return clone(startup);
    }
    function validatePalette(input) { var result = convert(input, "custom"); var output = result.ok && project(result.palette); return output ? { ok: true, errors: [], palette: clone(input), signature: output.signature } : { ok: false, errors: errors(result, "Invalid Palette.") }; }
    function hasBuiltInOverride(id) { return isBuiltIn(id) && Object.prototype.hasOwnProperty.call(snapshot().builtInOverrides, id); }
    function getPaletteUsageCount(id) { var map = snapshot().toolPaletteMap; return Object.keys(map).filter(function (toolId) { return map[toolId] === id; }).length; }
    return Object.freeze({
        storageKey: StoreV2.storageKey, legacyStorageKey: LEGACY_KEY, schemaVersion: StoreV2.schemaVersion,
        initialize: initialize, listResolvedPalettes: listResolvedPalettes, getResolvedPalette: getResolvedPalette, getResolvedPaletteSignature: getResolvedPaletteSignature,
        createPalette: createPalette, duplicatePalette: duplicatePalette, updatePalette: updatePalette, updateBuiltInOverride: updatePalette,
        getPaletteKind: function (id) { return transients[id] ? "transient" : (find(id) ? find(id).metadata.origin : "unknown"); }, hasBuiltInOverride: hasBuiltInOverride,
        setTransientPalette: setTransientPalette, clearTransientPalette: clearTransientPalette, deletePalette: deletePalette, getPaletteUsageCount: getPaletteUsageCount,
        resetBuiltInPalette: resetBuiltInPalette, hideBuiltInPalette: hideBuiltInPalette, setToolPalette: setToolPalette, getToolPalette: getToolPalette,
        exportData: exportData, importData: importData, validateImportData: validateImportData, clearUserData: clearUserData,
        subscribe: function (listener) { if (typeof listener === "function" && listeners.indexOf(listener) < 0) listeners.push(listener); },
        unsubscribe: function (listener) { var index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1); }, flush: function () {}, validatePalette: validatePalette,
        signatureForPalette: function (palette) { var result = validatePalette(palette); return result.ok ? result.signature : ""; },
        getStartupState: function () { return clone(startup); }, getRecoveryState: function () { return clone(recovery); }, getV2Snapshot: function () { return snapshot(); }, getV2Palette: function (id) { return find(id); },
        getLegacyEditability: function (id) { var palette = find(id); return palette ? Adapter.classifyLegacyEditability(palette, { registry: Derivations }) : { classification: Adapter.classifications.READ_ONLY, reasons: ["PALETTE_NOT_FOUND"] }; },
        _isInitialized: function () { return initialized; }
    });
}));
