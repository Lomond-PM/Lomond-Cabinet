"use strict";

const assert = require("assert");
const Registry = require("../client/js/appearance/appearanceParameterRegistry.js").AppearanceParameterRegistry;
const StoreModule = require("../client/js/appearance/appearanceStateStore.js").AppearanceStateStore;
let assertions = 0;
function ok(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.deepStrictEqual(actual, expected, message); }
function memoryStorage(initial) {
    const values = initial || {};
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = value; },
        values
    };
}

let storage = memoryStorage();
let store = StoreModule.create({ storage, registry: Registry });
equal(store.load(), {}, "missing storage loads empty overrides");

storage = memoryStorage({ [StoreModule.storageKey]: "not json" });
store = StoreModule.create({ storage, registry: Registry });
equal(store.load(), {}, "malformed JSON fails closed");

storage = memoryStorage({ [StoreModule.storageKey]: JSON.stringify({ version: 1, overrides: { "surface.panel": "#10100D", unknown: "#ffffff", "base.accent": "#000000", "surface.card": "bad" } }) });
store = StoreModule.create({ storage, registry: Registry });
equal(store.load(), { "surface.panel": "#10100d" }, "load keeps only known valid semantic overrides");
ok(store.setOverride("surface.card", "#121212"), "valid override is accepted");
ok(!store.setOverride("--surface-card", "#121212"), "raw CSS property ID is rejected");
ok(!store.setOverride("surface.card", "url(test)"), "invalid CSS-like value is rejected");
store.save();
equal(JSON.parse(storage.values[StoreModule.storageKey]), { version: 1, overrides: { "surface.panel": "#10100d", "surface.card": "#121212" } }, "persistence is override-only and round-trips");
ok(store.removeOverride("surface.panel"), "parameter reset removes its override");
store.setOverride("select.trigger.surface", "#111111");
store.setOverride("select.menu.surface", "#222222");
ok(store.resetCategory("select"), "category reset removes matching overrides");
equal(store.getOverride("select.trigger.surface"), null, "category reset removes trigger override");
store.resetAll();
equal(store.getOverrides(), {}, "reset all clears overrides");
console.log("test-appearance-state-store: " + assertions + " assertions passed.");
