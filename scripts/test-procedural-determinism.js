#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const ENGINE_PATH = path.join(ROOT, "client", "js", "proceduralAppearance.js");
const TOOL_IDS = ["shapeAdd", "textBackgroundBox", "selectionInfo", "ecommerceLayout"];
const EXPECTED_SEED_HASHES = {
    "shapeAdd|icon": 3120947250,
    "shapeAdd|background": 2313058817,
    "textBackgroundBox|icon": 68015086,
    "textBackgroundBox|background": 3802098903,
    "selectionInfo|icon": 951718544,
    "selectionInfo|background": 1015591401,
    "ecommerceLayout|icon": 2757779668,
    "ecommerceLayout|background": 4256163341
};

function fail(message) {
    throw new Error(message);
}

function assert(condition, message) {
    if (!condition) {
        fail(message);
    }
}

function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return "[" + value.map(stableStringify).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
}

function assertFiniteTree(value, pathLabel) {
    if (typeof value === "number") {
        assert(Number.isFinite(value), pathLabel + " contains a non-finite number.");
        return;
    }
    if (!value || typeof value !== "object") {
        return;
    }
    Object.keys(value).forEach((key) => assertFiniteTree(value[key], pathLabel + "." + key));
}

function loadEngine() {
    const code = fs.readFileSync(ENGINE_PATH, "utf8");
    const context = {
        window: {},
        console,
        Math,
        JSON,
        Number,
        String,
        Object,
        Array,
        isNaN,
        isFinite
    };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: ENGINE_PATH });
    assert(context.window.ProceduralAppearance, "ProceduralAppearance did not initialize.");
    return context.window.ProceduralAppearance;
}

function run() {
    const engine = loadEngine();
    const defaultParams = engine.normalizeParams({});
    let assertions = 0;

    assert(engine.engineVersion === "procedural-appearance-v7", "Unexpected engineVersion; update snapshots intentionally when the visual identity algorithm changes.");
    assertions += 1;

    TOOL_IDS.forEach((toolId) => {
        ["icon", "background"].forEach((target) => {
            const options = { target, seed: toolId, params: defaultParams };
            const first = engine.createRecipe(options);
            const firstJson = stableStringify(first);
            const firstKey = engine.cacheKey(options);

            for (let i = 0; i < 100; i += 1) {
                const next = engine.createRecipe(options);
                assert(stableStringify(next) === firstJson, toolId + " " + target + " recipe changed across repeated runs.");
                assert(engine.cacheKey(options) === firstKey, toolId + " " + target + " cache key changed across repeated runs.");
                assertions += 2;
            }

            assert(first.seed === toolId, toolId + " " + target + " did not preserve the stable seed text.");
            assert(first.target === target, toolId + " " + target + " normalized to the wrong target.");
            assert(first.seedHash === EXPECTED_SEED_HASHES[toolId + "|" + target], toolId + " " + target + " seedHash snapshot changed.");
            assert(first.cacheKey === firstKey, toolId + " " + target + " recipe cacheKey differs from public cacheKey().");
            assertFiniteTree(first, toolId + "." + target);
            assertions += 4;
        });

        const icon = engine.createRecipe({ target: "icon", seed: toolId, params: defaultParams });
        const background = engine.createRecipe({ target: "background", seed: toolId, params: defaultParams });
        assert(stableStringify(icon) !== stableStringify(background), toolId + " icon and background recipes must differ.");
        assertions += 1;
    });

    const normalized = engine.normalizeParams({
        warp: -999,
        ribbonWidth: 999,
        hueShift: 999,
        brightness: "not-a-number",
        paletteStrategy: "unknown"
    });
    assert(normalized.warp === 0, "warp lower clamp changed.");
    assert(normalized.ribbonWidth === 0.22, "ribbonWidth upper clamp changed.");
    assert(normalized.hueShift === 30, "hueShift upper clamp changed.");
    assert(normalized.brightness === 0.84, "brightness invalid-input fallback changed.");
    assert(normalized.paletteStrategy === "curatedLuminous", "palette strategy fallback changed.");
    assertions += 5;

    const themeIndependentA = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: defaultParams });
    const themeIndependentB = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: Object.assign({}, defaultParams, {
        themeAccent: "#ff0000",
        homeBackground: "#0000ff",
        language: "zh-CN",
        toolOrder: 999
    }) });
    assert(stableStringify(themeIndependentA) === stableStringify(themeIndependentB), "Unrecognized UI/theme inputs changed the colorful recipe identity.");
    assertions += 1;

    console.log("PASS procedural appearance determinism: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural appearance determinism - " + error.message);
    process.exitCode = 1;
}
