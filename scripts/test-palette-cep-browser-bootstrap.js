#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const scripts = [
    "client/js/proceduralPaletteLibrary.js",
    "client/js/palette/paletteModel.js",
    "client/js/palette/colorDerivationRegistry.js",
    "client/js/palette/paletteResolver.js",
    "client/js/palette/legacyPaletteMigration.js",
    "client/js/palette/paletteStore.js",
    "client/js/palette/legacyProceduralPaletteAdapter.js",
    "client/js/proceduralPaletteStore.js"
];

function storage(initial) {
    const data = Object.assign({}, initial || {});
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
        setItem(key, value) { data[key] = String(value); },
        removeItem(key) { delete data[key]; },
        data
    };
}

function browserRuntime(targetStorage) {
    const context = {
        console,
        document: {},
        localStorage: targetStorage,
        module: { exports: {} },
        require(request) { throw new Error("CEP CommonJS require must not run for browser scripts: " + request); }
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    scripts.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
    return context;
}

let target = storage();
let browser = browserRuntime(target);
let result = browser.ProceduralPaletteStore.initialize({ library: browser.ProceduralPaletteLibrary, storage: target, clock: () => "2026-08-22T00:00:00.000Z" });
assert.strictEqual(result.status, "V2_CREATED");
assert.strictEqual(browser.ProceduralPaletteLibrary.listPalettes().length, 8);
assert.strictEqual(browser.ProceduralPaletteStore.getV2Snapshot().customPalettes.length, 0);
assert.strictEqual(browser.ProceduralPaletteStore.listResolvedPalettes(false).length, 8);

const emptyV2 = target.getItem(browser.ProceduralPaletteStore.storageKey);
target = storage({ [browser.ProceduralPaletteStore.storageKey]: emptyV2 });
browser = browserRuntime(target);
result = browser.ProceduralPaletteStore.initialize({ library: browser.ProceduralPaletteLibrary, storage: target });
assert.strictEqual(result.status, "V2_LOADED");
assert.strictEqual(browser.ProceduralPaletteStore.listResolvedPalettes(false).length, 8);

target = storage({ [browser.ProceduralPaletteStore.storageKey]: "{invalid" });
browser = browserRuntime(target);
result = browser.ProceduralPaletteStore.initialize({ library: browser.ProceduralPaletteLibrary, storage: target });
assert.strictEqual(result.status, "READ_ONLY_RECOVERY");
assert.strictEqual(browser.ProceduralPaletteStore.listResolvedPalettes(false).length, 8);
assert.strictEqual(target.getItem(browser.ProceduralPaletteStore.storageKey), "{invalid");

const legacyCustom = {
    id: "browserMigrated", version: 1, displayName: "Browser Migrated", family: "custom",
    colors: { shadow: "#111111", base: "#335577", secondary: "#77AACC", highlight: "#EEFFFF" },
    stops: [0, 0.3, 0.72, 1], weights: { shadow: 0.25, base: 0.5, secondary: 0.17, highlight: 0.08 }
};
const legacy = JSON.stringify({ format: "lomond.proceduralPaletteStore", schemaVersion: 1, customPalettes: [legacyCustom], builtInOverrides: {}, hiddenBuiltInPaletteIds: [], toolPaletteMap: {}, updatedAt: "" });
target = storage({ "lomond.proceduralPaletteStore.v1": legacy });
browser = browserRuntime(target);
result = browser.ProceduralPaletteStore.initialize({ library: browser.ProceduralPaletteLibrary, storage: target });
assert.strictEqual(result.status, "V1_MIGRATED");
assert.strictEqual(browser.ProceduralPaletteStore.listResolvedPalettes(false).length, 9);
assert.strictEqual(target.getItem("lomond.proceduralPaletteStore.v1"), legacy);

console.log("PASS Palette CEP browser bootstrap: CommonJS globals do not hijack browser dependency resolution.");
