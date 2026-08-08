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

    function copyOverrides(source) {
        var result = {};
        var key;
        source = source && typeof source === "object" ? source : {};
        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) { result[key] = source[key]; }
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

        function load() {
            var parsed = null;
            var raw;
            try {
                raw = storage && typeof storage.getItem === "function" ? storage.getItem(STORAGE_KEY) : null;
                parsed = raw ? JSON.parse(raw) : null;
            } catch (error) {
                parsed = null;
            }
            overrides = normalize(parsed).overrides;
            return copyOverrides(overrides);
        }

        function save() {
            try {
                if (storage && typeof storage.setItem === "function") {
                    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, overrides: overrides }));
                }
            } catch (error) {
                return { version: 1, overrides: copyOverrides(overrides), persisted: false };
            }
            return { version: 1, overrides: copyOverrides(overrides), persisted: true };
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
            getOverrides: function () { return copyOverrides(overrides); },
            getOverride: function (id) { return Object.prototype.hasOwnProperty.call(overrides, id) ? overrides[id] : null; },
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
