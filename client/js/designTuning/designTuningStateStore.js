(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (root && root.document && !root.DesignTuningStateStore) root.DesignTuningStateStore = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var STORAGE_KEY = "AEToolbox.designTuning.v1";
    function create(options) {
        options = options || {};
        var storage = options.storage;
        var registry = options.registry;
        var overrides = {};
        function copy(source) { var out = {}; var key; for (key in source) if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = registry.cloneValue(source[key]); return out; }
        function normalize(candidate) {
            var source = candidate && candidate.version === 1 && candidate.overrides && typeof candidate.overrides === "object" ? candidate.overrides : {};
            var out = {}; var key; var checked;
            for (key in source) if (Object.prototype.hasOwnProperty.call(source, key)) { checked = registry.validate(key, source[key]); if (checked.valid) out[key] = checked.value; }
            return { version: 1, overrides: out };
        }
        function save() { try { if (storage) storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, overrides: overrides })); return true; } catch (error) { return false; } }
        return Object.freeze({
            storageKey: STORAGE_KEY,
            load: function () { var parsed = null; try { parsed = JSON.parse(storage && storage.getItem(STORAGE_KEY) || "null"); } catch (error) {} overrides = normalize(parsed).overrides; return copy(overrides); },
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
