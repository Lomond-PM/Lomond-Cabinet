(function (root, factory) {
    "use strict";

    var api = factory(root);
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralPaletteStore = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
    "use strict";

    var STORAGE_KEY = "lomond.proceduralPaletteStore.v1";
    var SCHEMA_VERSION = 1;
    var SAVE_DEBOUNCE_MS = 250;
    var HOME_FALLBACK_MAP = {
        ecommerceLayout: "warmCoral",
        shapeAdd: "pacificCyan",
        textBackgroundBox: "blueLavender",
        selectionInfo: "graphiteSilver",
        proceduralAppearanceLab: "tealLuminous",
        registryControlLab: "slateIce",
        settingsRendererLab: "plumRose"
    };
    var saveTimer = null;
    var listeners = [];
    var library = null;
    var storage = null;
    var state = createEmptyState();
    var initialized = false;

    function createEmptyState() {
        return {
            schemaVersion: SCHEMA_VERSION,
            customPalettes: [],
            builtInOverrides: {},
            hiddenBuiltInPaletteIds: [],
            toolPaletteMap: {},
            updatedAt: ""
        };
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function clone(value) {
        if (value === null || typeof value !== "object") {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(clone);
        }
        var copy = {};
        Object.keys(value).forEach(function (key) {
            copy[key] = clone(value[key]);
        });
        return copy;
    }

    function trim(value) {
        return String(value || "").replace(/^\s+|\s+$/g, "");
    }

    function hashString(input) {
        var str = String(input || "");
        var hash = 2166136261;
        var i;
        for (i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    function getStorage() {
        if (storage) {
            return storage;
        }
        if (root && root.localStorage) {
            return root.localStorage;
        }
        return null;
    }

    function getLibrary() {
        return library || (root && root.ProceduralPaletteLibrary) || null;
    }

    function isBuiltInPalette(id) {
        var lib = getLibrary();
        return !!(lib && typeof lib.hasPalette === "function" && lib.hasPalette(id));
    }

    function listFactoryPaletteIds() {
        var lib = getLibrary();
        if (!lib || typeof lib.listPalettes !== "function") {
            return [];
        }
        return lib.listPalettes().map(function (palette) {
            return palette.id;
        });
    }

    function normalizeWeights(weights) {
        var roles = ["shadow", "base", "secondary", "highlight"];
        var normalized = {};
        var total = 0;
        var i;
        var value;
        weights = weights || {};
        for (i = 0; i < roles.length; i++) {
            value = Number(weights[roles[i]]);
            if (!isFinite(value) || value < 0) {
                value = 0;
            }
            normalized[roles[i]] = value;
            total += value;
        }
        if (total <= 0) {
            normalized = { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 };
            total = 1;
        }
        for (i = 0; i < roles.length; i++) {
            normalized[roles[i]] = Math.round((normalized[roles[i]] / total) * 10000) / 10000;
        }
        total = normalized.shadow + normalized.base + normalized.secondary + normalized.highlight;
        normalized.highlight = Math.round((normalized.highlight + (1 - total)) * 10000) / 10000;
        return normalized;
    }

    function sanitizePalette(input, existingId) {
        var palette = clone(input || {});
        var roles = ["shadow", "base", "secondary", "highlight"];
        var i;
        palette.id = existingId || trim(palette.id);
        palette.version = Number(palette.version) > 0 ? Math.floor(Number(palette.version)) : 1;
        palette.family = trim(palette.family) || "userCustom";
        palette.displayName = trim(palette.displayName) || palette.id;
        palette.colors = palette.colors || {};
        for (i = 0; i < roles.length; i++) {
            palette.colors[roles[i]] = normalizeHexColor(palette.colors[roles[i]]);
        }
        palette.stops = Array.isArray(palette.stops) ? palette.stops.slice(0, 4).map(function (value) {
            return Math.round(Number(value) * 10000) / 10000;
        }) : [0, 0.34, 0.74, 1];
        palette.weights = normalizeWeights(palette.weights);
        if (typeof palette.saturationBias !== "undefined") {
            palette.saturationBias = Number(palette.saturationBias);
        }
        if (typeof palette.luminanceBias !== "undefined") {
            palette.luminanceBias = Number(palette.luminanceBias);
        }
        if (typeof palette.contrastBias !== "undefined") {
            palette.contrastBias = Number(palette.contrastBias);
        }
        return palette;
    }

    function normalizeHexColor(value) {
        var raw = trim(value);
        if (/^#?[0-9a-fA-F]{6}$/.test(raw)) {
            return ("#" + raw.replace("#", "")).toUpperCase();
        }
        return "";
    }

    function validatePaletteData(palette) {
        var lib = getLibrary();
        var sanitized = sanitizePalette(palette, palette && palette.id);
        var validation;
        if (!sanitized.id) {
            return { ok: false, errors: ["Palette id is required."] };
        }
        if (sanitized.colors.shadow === "" || sanitized.colors.base === "" || sanitized.colors.secondary === "" || sanitized.colors.highlight === "") {
            return { ok: false, errors: ["Palette colors must be valid #RRGGBB values."] };
        }
        if (!(sanitized.stops[0] === 0 && sanitized.stops[3] === 1 && sanitized.stops[0] < sanitized.stops[1] && sanitized.stops[1] < sanitized.stops[2] && sanitized.stops[2] < sanitized.stops[3])) {
            return { ok: false, errors: ["Palette stops must be four increasing values from 0 to 1."] };
        }
        if (lib && typeof lib.validatePalette === "function") {
            validation = lib.validatePalette(sanitized);
            if (!validation.ok) {
                return validation;
            }
            return { ok: true, errors: [], palette: sanitized, signature: validation.signature };
        }
        return { ok: true, errors: [], palette: sanitized, signature: hashString(JSON.stringify(sanitized)) };
    }

    function signatureForPalette(palette) {
        var validation = validatePaletteData(palette);
        return validation.ok ? validation.signature : "";
    }

    function paletteExists(id) {
        var i;
        if (isBuiltInPalette(id)) {
            return true;
        }
        for (i = 0; i < state.customPalettes.length; i++) {
            if (state.customPalettes[i].id === id) {
                return true;
            }
        }
        return false;
    }

    function generatePaletteId() {
        var base = "userPalette_" + Date.now().toString(36);
        var suffix = 0;
        var id = base;
        while (paletteExists(id)) {
            suffix += 1;
            id = base + "_" + suffix;
        }
        return id;
    }

    function mergeBuiltInPalette(factoryPalette) {
        var override = state.builtInOverrides[factoryPalette.id];
        var merged = clone(factoryPalette);
        if (override) {
            merged = Object.assign(merged, clone(override));
            merged.id = factoryPalette.id;
            merged.version = factoryPalette.version;
            merged.family = override.family || factoryPalette.family;
            merged.displayName = override.displayName || factoryPalette.displayName || factoryPalette.id;
            merged.colors = Object.assign({}, factoryPalette.colors, override.colors || {});
            merged.stops = override.stops ? override.stops.slice(0) : factoryPalette.stops.slice(0);
            merged.weights = Object.assign({}, factoryPalette.weights, override.weights || {});
            merged.isModified = true;
        }
        merged.isBuiltIn = true;
        merged.isCustom = false;
        merged.isHidden = state.hiddenBuiltInPaletteIds.indexOf(factoryPalette.id) !== -1;
        return sanitizePalette(merged, factoryPalette.id);
    }

    function listResolvedPalettes(includeHidden) {
        var lib = getLibrary();
        var result = [];
        var i;
        var palette;
        if (lib && typeof lib.listPalettes === "function") {
            lib.listPalettes().forEach(function (factoryPalette) {
                var merged = mergeBuiltInPalette(factoryPalette);
                if (includeHidden || !merged.isHidden) {
                    result.push(merged);
                }
            });
        }
        for (i = 0; i < state.customPalettes.length; i++) {
            palette = sanitizePalette(state.customPalettes[i], state.customPalettes[i].id);
            palette.isBuiltIn = false;
            palette.isCustom = true;
            palette.isModified = false;
            result.push(palette);
        }
        return clone(result);
    }

    function getResolvedPalette(id) {
        var palettes = listResolvedPalettes(true);
        var i;
        for (i = 0; i < palettes.length; i++) {
            if (palettes[i].id === id) {
                return clone(palettes[i]);
            }
        }
        return null;
    }

    function getResolvedPaletteSignature(id) {
        var palette = getResolvedPalette(id);
        return palette ? signatureForPalette(palette) : "";
    }

    function createPalette(input) {
        var palette = sanitizePalette(input || {}, generatePaletteId());
        var validation;
        palette.isCustom = true;
        palette.isBuiltIn = false;
        validation = validatePaletteData(palette);
        if (!validation.ok || paletteExists(palette.id)) {
            return { ok: false, errors: validation.errors.length ? validation.errors : ["Palette id already exists."] };
        }
        state.customPalettes.push(validation.palette);
        touchAndSave();
        notify();
        return { ok: true, palette: clone(validation.palette) };
    }

    function duplicatePalette(id) {
        var source = getResolvedPalette(id);
        var input;
        if (!source) {
            return { ok: false, errors: ["Palette not found."] };
        }
        input = clone(source);
        input.id = generatePaletteId();
        input.displayName = (source.displayName || source.id) + " Copy";
        input.family = source.family || "userCustom";
        delete input.isBuiltIn;
        delete input.isCustom;
        delete input.isModified;
        delete input.isHidden;
        return createPalette(input);
    }

    function updatePalette(id, patch) {
        var source = getResolvedPalette(id);
        var merged;
        var validation;
        var i;
        if (!source) {
            return { ok: false, errors: ["Palette not found."] };
        }
        merged = Object.assign({}, source, clone(patch || {}));
        merged.id = id;
        merged.colors = Object.assign({}, source.colors, (patch && patch.colors) || {});
        merged.weights = Object.assign({}, source.weights, (patch && patch.weights) || {});
        if (patch && patch.stops) {
            merged.stops = patch.stops.slice(0);
        }
        validation = validatePaletteData(merged);
        if (!validation.ok) {
            return { ok: false, errors: validation.errors };
        }
        if (isBuiltInPalette(id)) {
            state.builtInOverrides[id] = buildOverrideForPalette(validation.palette);
        } else {
            for (i = 0; i < state.customPalettes.length; i++) {
                if (state.customPalettes[i].id === id) {
                    state.customPalettes[i] = validation.palette;
                    break;
                }
            }
        }
        touchAndSave();
        notify();
        return { ok: true, palette: clone(validation.palette) };
    }

    function buildOverrideForPalette(palette) {
        return {
            displayName: palette.displayName,
            family: palette.family,
            colors: clone(palette.colors),
            stops: palette.stops.slice(0),
            weights: clone(palette.weights),
            saturationBias: palette.saturationBias,
            luminanceBias: palette.luminanceBias,
            contrastBias: palette.contrastBias
        };
    }

    function deletePalette(id) {
        var index = -1;
        var i;
        if (isBuiltInPalette(id)) {
            return { ok: false, errors: ["Built-in palettes cannot be deleted."] };
        }
        for (i = 0; i < state.customPalettes.length; i++) {
            if (state.customPalettes[i].id === id) {
                index = i;
                break;
            }
        }
        if (index < 0) {
            return { ok: false, errors: ["Palette not found."] };
        }
        state.customPalettes.splice(index, 1);
        Object.keys(state.toolPaletteMap).forEach(function (toolId) {
            if (state.toolPaletteMap[toolId] === id) {
                delete state.toolPaletteMap[toolId];
            }
        });
        touchAndSave();
        notify();
        return { ok: true };
    }

    function resetBuiltInPalette(id) {
        if (!isBuiltInPalette(id)) {
            return { ok: false, errors: ["Palette is not built in."] };
        }
        delete state.builtInOverrides[id];
        touchAndSave();
        notify();
        return { ok: true, palette: getResolvedPalette(id) };
    }

    function hideBuiltInPalette(id, hidden) {
        var index;
        if (!isBuiltInPalette(id)) {
            return { ok: false, errors: ["Palette is not built in."] };
        }
        index = state.hiddenBuiltInPaletteIds.indexOf(id);
        if (hidden && index === -1) {
            state.hiddenBuiltInPaletteIds.push(id);
        } else if (!hidden && index !== -1) {
            state.hiddenBuiltInPaletteIds.splice(index, 1);
        }
        touchAndSave();
        notify();
        return { ok: true };
    }

    function resolveFallbackToolPalette(toolId) {
        var id = trim(toolId);
        var builtIns = listFactoryPaletteIds();
        if (!id) {
            return "";
        }
        if (HOME_FALLBACK_MAP[id]) {
            return HOME_FALLBACK_MAP[id];
        }
        return builtIns.length ? builtIns[parseInt(hashString(id), 16) % builtIns.length] : "";
    }

    function setToolPalette(toolId, paletteId) {
        var tool = trim(toolId);
        var palette = trim(paletteId);
        if (!tool) {
            return { ok: false, errors: ["Tool id is required."] };
        }
        if (!palette || !getResolvedPalette(palette)) {
            delete state.toolPaletteMap[tool];
        } else {
            state.toolPaletteMap[tool] = palette;
        }
        touchAndSave();
        notify();
        return { ok: true, paletteId: getToolPalette(tool) };
    }

    function getToolPalette(toolId) {
        var tool = trim(toolId);
        var stored = state.toolPaletteMap[tool];
        if (stored && getResolvedPalette(stored)) {
            return stored;
        }
        return resolveFallbackToolPalette(tool);
    }

    function exportData() {
        return {
            format: "lomond.proceduralPaletteStore",
            schemaVersion: SCHEMA_VERSION,
            customPalettes: clone(state.customPalettes),
            builtInOverrides: clone(state.builtInOverrides),
            hiddenBuiltInPaletteIds: state.hiddenBuiltInPaletteIds.slice(0),
            toolPaletteMap: clone(state.toolPaletteMap),
            updatedAt: state.updatedAt
        };
    }

    function importData(json, options) {
        var data = typeof json === "string" ? JSON.parse(json) : clone(json);
        var mode = options && options.mode === "merge" ? "merge" : "replace";
        var imported = sanitizeState(data);
        var existingIds = {};
        if (!imported.ok) {
            return imported;
        }
        if (mode === "replace") {
            state = imported.state;
        } else {
            listResolvedPalettes(true).forEach(function (palette) {
                existingIds[palette.id] = true;
            });
            imported.state.customPalettes.forEach(function (palette) {
                var copy = clone(palette);
                if (existingIds[copy.id]) {
                    copy.id = generatePaletteId();
                }
                state.customPalettes.push(copy);
                existingIds[copy.id] = true;
            });
            Object.keys(imported.state.builtInOverrides).forEach(function (id) {
                state.builtInOverrides[id] = imported.state.builtInOverrides[id];
            });
            Object.keys(imported.state.toolPaletteMap).forEach(function (toolId) {
                state.toolPaletteMap[toolId] = imported.state.toolPaletteMap[toolId];
            });
            imported.state.hiddenBuiltInPaletteIds.forEach(function (id) {
                if (state.hiddenBuiltInPaletteIds.indexOf(id) === -1) {
                    state.hiddenBuiltInPaletteIds.push(id);
                }
            });
        }
        touchAndSave();
        notify();
        return { ok: true, data: exportData() };
    }

    function clearUserData() {
        state = createEmptyState();
        touchAndSave();
        notify();
        return { ok: true };
    }

    function sanitizeState(data) {
        var next = createEmptyState();
        var validation;
        var seen = {};
        if (!data || Number(data.schemaVersion) !== SCHEMA_VERSION) {
            return { ok: false, errors: ["Unsupported palette store schema version."] };
        }
        (data.customPalettes || []).forEach(function (palette) {
            validation = validatePaletteData(palette);
            if (validation.ok && !seen[validation.palette.id] && !isBuiltInPalette(validation.palette.id)) {
                next.customPalettes.push(validation.palette);
                seen[validation.palette.id] = true;
            }
        });
        Object.keys(data.builtInOverrides || {}).forEach(function (id) {
            var factory = getLibrary() && getLibrary().getPalette ? getLibrary().getPalette(id) : null;
            if (!factory) {
                return;
            }
            validation = validatePaletteData(Object.assign({}, factory, data.builtInOverrides[id], { id: id, version: factory.version }));
            if (validation.ok) {
                next.builtInOverrides[id] = buildOverrideForPalette(validation.palette);
            }
        });
        (data.hiddenBuiltInPaletteIds || []).forEach(function (id) {
            if (isBuiltInPalette(id) && next.hiddenBuiltInPaletteIds.indexOf(id) === -1) {
                next.hiddenBuiltInPaletteIds.push(id);
            }
        });
        Object.keys(data.toolPaletteMap || {}).forEach(function (toolId) {
            var paletteId = data.toolPaletteMap[toolId];
            if (getResolvedPalette(paletteId) || isBuiltInPalette(paletteId) || seen[paletteId]) {
                next.toolPaletteMap[toolId] = paletteId;
            }
        });
        next.updatedAt = data.updatedAt || nowIso();
        return { ok: true, state: next };
    }

    function load() {
        var raw;
        var parsed;
        var sanitized;
        var target = getStorage();
        if (!target || !target.getItem) {
            state = createEmptyState();
            return;
        }
        try {
            raw = target.getItem(STORAGE_KEY);
            if (!raw) {
                state = createEmptyState();
                return;
            }
            parsed = JSON.parse(raw);
            sanitized = sanitizeState(parsed);
            state = sanitized.ok ? sanitized.state : createEmptyState();
        } catch (error) {
            state = createEmptyState();
        }
    }

    function saveNow() {
        var target = getStorage();
        if (saveTimer && root && root.clearTimeout) {
            root.clearTimeout(saveTimer);
            saveTimer = null;
        }
        if (!target || !target.setItem) {
            return;
        }
        target.setItem(STORAGE_KEY, JSON.stringify(exportData()));
    }

    function scheduleSave() {
        if (!root || !root.setTimeout) {
            saveNow();
            return;
        }
        if (saveTimer) {
            root.clearTimeout(saveTimer);
        }
        saveTimer = root.setTimeout(saveNow, SAVE_DEBOUNCE_MS);
    }

    function touchAndSave() {
        state.updatedAt = nowIso();
        scheduleSave();
    }

    function notify() {
        listeners.slice(0).forEach(function (listener) {
            try {
                listener(exportData());
            } catch (error) {
            }
        });
    }

    function subscribe(listener) {
        if (typeof listener === "function" && listeners.indexOf(listener) === -1) {
            listeners.push(listener);
        }
    }

    function unsubscribe(listener) {
        var index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    function initialize(options) {
        options = options || {};
        library = options.library || getLibrary();
        storage = options.storage || storage || null;
        load();
        initialized = true;
        return { ok: true, data: exportData() };
    }

    function flush() {
        saveNow();
    }

    return {
        storageKey: STORAGE_KEY,
        schemaVersion: SCHEMA_VERSION,
        initialize: initialize,
        listResolvedPalettes: listResolvedPalettes,
        getResolvedPalette: getResolvedPalette,
        getResolvedPaletteSignature: getResolvedPaletteSignature,
        createPalette: createPalette,
        duplicatePalette: duplicatePalette,
        updatePalette: updatePalette,
        deletePalette: deletePalette,
        resetBuiltInPalette: resetBuiltInPalette,
        hideBuiltInPalette: hideBuiltInPalette,
        setToolPalette: setToolPalette,
        getToolPalette: getToolPalette,
        exportData: exportData,
        importData: importData,
        clearUserData: clearUserData,
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        flush: flush,
        validatePalette: validatePaletteData,
        signatureForPalette: signatureForPalette,
        _isInitialized: function () { return initialized; }
    };
}));
