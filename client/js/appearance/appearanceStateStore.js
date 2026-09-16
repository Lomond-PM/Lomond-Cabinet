(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && root.document && !Object.prototype.hasOwnProperty.call(root, "AppearanceStateStore")) {
        Object.defineProperty(root, "AppearanceStateStore", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if ((!root || !root.document) && typeof module === "object" && module.exports) {
        module.exports.AppearanceStateStore = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var STORAGE_KEY = "AEToolbox.appearance.v1";

    function clone(value) {
        if (!value || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(clone);
        var out = {}; Object.keys(value).forEach(function (key) { out[key] = clone(value[key]); }); return out;
    }

    function copyOverrides(source) {
        var result = {};
        var key;
        source = source && typeof source === "object" ? source : {};
        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) { result[key] = clone(source[key]); }
        }
        return result;
    }

    function create(options) {
        options = options || {};
        var storage = options.storage;
        var registry = options.registry;
        var overrides = {};

        function normalize(candidate) {
            var result = {};
            var source = candidate && candidate.version === 1 && candidate.overrides && typeof candidate.overrides === "object" ? candidate.overrides : {};
            var key;
            var checked;
            for (key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key) && registry && registry.isAppearanceOverride(key)) {
                    checked = registry.validate(key, source[key]);
                    if (checked.valid) { result[key] = checked.value; }
                }
            }
            return { version: 1, overrides: result };
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
            try { savedOverrides = readSaved(); overrides = copyOverrides(savedOverrides); lastError = null; }
            catch (error) { lastError = String(error.message || error); }
            return copyOverrides(overrides);
        }
        function save() {
            try {
                // Confirm a readable, valid prior state before replacing this owned key.
                var prior = readSaved();
                savedOverrides = copyOverrides(prior);
                if (!storage || typeof storage.setItem !== "function") throw new Error("STORAGE_UNAVAILABLE");
                storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, overrides: overrides }));
                savedOverrides = copyOverrides(overrides); lastError = null;
                return { accepted: true, persisted: true, version: 1, overrides: copyOverrides(overrides) };
            } catch (error) {
                lastError = String(error.message || error);
                return { accepted: true, persisted: false, version: 1, overrides: copyOverrides(overrides), error: lastError };
            }
        }
        function restoreSaved() {
            try { var latest = readSaved(); savedOverrides = copyOverrides(latest); overrides = copyOverrides(latest); lastError = null; return { accepted: true, persisted: true }; }
            catch (error) { lastError = String(error.message || error); return { accepted: false, persisted: false, error: lastError }; }
        }

        function setOverride(id, value) {
            var checked;
            if (!registry || !registry.isAppearanceOverride(id)) { return false; }
            checked = registry.validate(id, value);
            if (!checked.valid) { return false; }
            overrides[id] = checked.value;
            return true;
        }

        function removeOverride(id) {
            if (!Object.prototype.hasOwnProperty.call(overrides, id)) { return false; }
            delete overrides[id];
            return true;
        }

        return Object.freeze({
            storageKey: STORAGE_KEY,
            load: load,
            normalize: normalize,
            save: save,
            getPersistenceState: persistenceState,
            restoreSaved: restoreSaved,
            getOverrides: function () { return copyOverrides(overrides); },
            getOverride: function (id) { return Object.prototype.hasOwnProperty.call(overrides, id) ? clone(overrides[id]) : null; },
            setOverride: setOverride,
            removeOverride: removeOverride,
            resetCategory: function (category) {
                var key;
                var parameter;
                var changed = false;
                for (key in overrides) {
                    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
                        parameter = registry.get(key);
                        if (parameter && parameter.category === category) { delete overrides[key]; changed = true; }
                    }
                }
                return changed;
            },
            resetAll: function () { overrides = {}; },
            snapshot: function () { return { version: 1, overrides: copyOverrides(overrides) }; }
        });
    }

    return { storageKey: STORAGE_KEY, create: create };
}));
