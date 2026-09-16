(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (root && root.document && !root.DesignTuningStateStore) root.DesignTuningStateStore = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var STORAGE_KEY = "AEToolbox.designTuning.v1";
    var LEGACY_ID_MAP = { "surface.navigationAction": "surface.utilityAction" };
    function create(options) {
        options = options || {};
        var storage = options.storage;
        var registry = options.registry;
        var overrides = {};
        function copy(source) { var out = {}; var key; for (key in source) if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = registry.cloneValue(source[key]); return out; }
        function normalize(candidate) {
            var source = candidate && candidate.version === 1 && candidate.overrides && typeof candidate.overrides === "object" ? candidate.overrides : {};
            var out = {}; var key; var checked; var target;
            for (key in source) if (Object.prototype.hasOwnProperty.call(source, key) && !LEGACY_ID_MAP[key]) { checked = registry.validate(key, source[key]); if (checked.valid) out[key] = checked.value; }
            for (key in source) if (Object.prototype.hasOwnProperty.call(source, key) && LEGACY_ID_MAP[key]) { target = LEGACY_ID_MAP[key]; if (!Object.prototype.hasOwnProperty.call(out, target)) { checked = registry.validate(target, source[key]); if (checked.valid) out[target] = checked.value; } }
            return { version: 1, overrides: out };
        }
        var savedOverrides = null;
        var lastError = null;
        function readSaved() {
            if (!storage || typeof storage.getItem !== "function") throw new Error("STORAGE_UNAVAILABLE");
            var raw = storage.getItem(STORAGE_KEY);
            if (raw !== null && typeof raw !== "string") throw new Error("STORAGE_READ_FAILED");
            var parsed = raw === null ? null : JSON.parse(raw);
            if (raw !== null && (!parsed || parsed.version !== 1 || !parsed.overrides || typeof parsed.overrides !== "object" || Array.isArray(parsed.overrides))) throw new Error("INVALID_STORED_DATA");
            return normalize(parsed).overrides;
        }
        function persistenceState() {
            return { persisted: !lastError && savedOverrides !== null && JSON.stringify(overrides) === JSON.stringify(savedOverrides),
                dirty: !!lastError || savedOverrides === null || JSON.stringify(overrides) !== JSON.stringify(savedOverrides),
                canRestore: savedOverrides !== null, error: lastError };
        }
        function load() {
            try { savedOverrides = readSaved(); overrides = copy(savedOverrides); lastError = null; var raw = JSON.parse(storage.getItem(STORAGE_KEY) || "null"); if (raw && raw.overrides && Object.keys(LEGACY_ID_MAP).some(function (id) { return Object.prototype.hasOwnProperty.call(raw.overrides, id); })) save(); }
            catch (error) { lastError = String(error.message || error); }
            return copy(overrides);
        }
        function save() {
            try {
                // Confirm a readable, valid prior state before replacing this owned key.
                var prior = readSaved();
                savedOverrides = copy(prior);
                if (!storage || typeof storage.setItem !== "function") throw new Error("STORAGE_UNAVAILABLE");
                storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, overrides: overrides }));
                savedOverrides = copy(overrides); lastError = null;
                return { accepted: true, persisted: true, version: 1, overrides: copy(overrides) };
            } catch (error) {
                lastError = String(error.message || error);
                return { accepted: true, persisted: false, version: 1, overrides: copy(overrides), error: lastError };
            }
        }
        function restoreSaved() {
            try { var latest = readSaved(); savedOverrides = copy(latest); overrides = copy(latest); lastError = null; return { accepted: true, persisted: true }; }
            catch (error) { lastError = String(error.message || error); return { accepted: false, persisted: false, error: lastError }; }
        }

        return Object.freeze({
            storageKey: STORAGE_KEY,
            load: load,
            getPersistenceState: persistenceState,
            restoreSaved: restoreSaved,
            normalize: normalize,
            save: save,
            getOverride: function (id) { return Object.prototype.hasOwnProperty.call(overrides, id) ? registry.cloneValue(overrides[id]) : null; },
            getOverrides: function () { return copy(overrides); },
            setOverride: function (id, value) { var checked = registry.validate(id, value); if (!checked.valid) return false; overrides[id] = checked.value; return true; },
            removeOverride: function (id) { if (!Object.prototype.hasOwnProperty.call(overrides, id)) return false; delete overrides[id]; return true; },
            clearDomain: function (domain) { var key; var changed = false; for (key in overrides) if (Object.prototype.hasOwnProperty.call(overrides, key) && registry.get(key).domain === domain) { delete overrides[key]; changed = true; } return changed; },
            clearAll: function () { overrides = {}; },
            getSnapshot: function () { return { version: 1, overrides: copy(overrides) }; }
        });
    }
    return { storageKey: STORAGE_KEY, create: create };
}));
