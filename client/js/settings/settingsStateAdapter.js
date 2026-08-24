(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root && !root.SettingsStateAdapter) root.SettingsStateAdapter = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function copy(value) { var out = {}; var key; for (key in value) if (Object.prototype.hasOwnProperty.call(value, key)) out[key] = value[key]; return out; }
    function create(options) {
        options = options || {};
        var storage = options.storage;
        var key = options.storageKey || "AEToolbox.settings.v1";
        var defaults = copy(options.defaults || {});
        var state = copy(defaults);
        function normalize(value) { var next = copy(defaults); var name; value = value && typeof value === "object" ? value : {}; for (name in value) if (Object.prototype.hasOwnProperty.call(value, name)) next[name] = value[name]; return next; }
        function load() { try { state = normalize(JSON.parse(storage.getItem(key) || "null")); } catch (error) { state = copy(defaults); } return copy(state); }
        function save() { try { storage.setItem(key, JSON.stringify(state)); return true; } catch (error) { return false; } }
        return Object.freeze({
            load: load,
            initialize: function (value) { state = normalize(value); return copy(state); },
            get: function (name) { return state[name]; },
            set: function (name, value) { state[name] = value; return value; },
            update: function (values) { var name; for (name in values) if (Object.prototype.hasOwnProperty.call(values, name)) state[name] = values[name]; return copy(state); },
            snapshot: function () { return copy(state); },
            save: save
        });
    }
    return { create: create };
}));
