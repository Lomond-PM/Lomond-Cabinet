#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CACHE_PATH = path.join(ROOT, "client", "js", "proceduralCache.js");
const ENGINE_PATH = path.join(ROOT, "client", "js", "proceduralAppearance.js");
const cacheTools = require(CACHE_PATH);

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function makeContext() {
    return {
        clearRect() {},
        save() {},
        restore() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        quadraticCurveTo() {},
        closePath() {},
        clip() {},
        drawImage() {},
        putImageData() {},
        createImageData(width, height) {
            return {
                width,
                height,
                data: new Uint8ClampedArray(width * height * 4)
            };
        }
    };
}

function makeCanvas() {
    const context = makeContext();
    return {
        style: {},
        width: 0,
        height: 0,
        getContext(type) {
            return type === "2d" ? context : null;
        }
    };
}

function loadEngine() {
    const cacheCode = fs.readFileSync(CACHE_PATH, "utf8");
    const code = fs.readFileSync(ENGINE_PATH, "utf8");
    const context = {
        window: {
            devicePixelRatio: 1
        },
        document: {
            createElement(tagName) {
                if (tagName !== "canvas") {
                    throw new Error("Unexpected element: " + tagName);
                }
                return makeCanvas();
            }
        },
        console,
        Math,
        JSON,
        Number,
        String,
        Object,
        Array,
        Uint8ClampedArray,
        isNaN,
        isFinite
    };
    vm.createContext(context);
    vm.runInContext(cacheCode, context, { filename: CACHE_PATH });
    vm.runInContext(code, context, { filename: ENGINE_PATH });
    assert(context.window.ProceduralAppearance, "ProceduralAppearance did not initialize.");
    return {
        engine: context.window.ProceduralAppearance,
        windowRef: context.window
    };
}

function render(engine, windowRef, seed, dpr) {
    windowRef.devicePixelRatio = dpr;
    return engine.render(makeCanvas(), {
        target: "icon",
        seed,
        params: engine.normalizeParams({})
    });
}

function run() {
    const loaded = loadEngine();
    const engine = loaded.engine;
    const windowRef = loaded.windowRef;
    let assertions = 0;
    let stats;
    let before;
    let after;
    let keyA;
    let keyB;

    assert(cacheTools.normalizeRenderScale(0) === 1, "DPR 0 should normalize to 1.");
    assert(cacheTools.normalizeRenderScale(1) === 1, "DPR 1 should normalize to 1.");
    assert(cacheTools.normalizeRenderScale(1.25) === 1.25, "DPR 1.25 should be preserved.");
    assert(cacheTools.normalizeRenderScale(2) === 2, "DPR 2 should normalize to 2.");
    assert(cacheTools.normalizeRenderScale(3) === 2, "DPR above 2 should clamp to 2.");
    assert(cacheTools.normalizeRenderScale(NaN) === 1, "DPR NaN should normalize to 1.");
    assert(cacheTools.normalizeRenderScale(undefined) === 1, "Missing DPR should normalize to 1.");
    assertions += 7;

    const lru = cacheTools.createLruCache(3);
    assert(lru.stats().size === 0 && lru.stats().limit === 3, "LRU should initialize empty with the requested limit.");
    lru.set("a", 1);
    lru.set("b", 2);
    lru.set("c", 3);
    assert(lru.stats().size === 3, "LRU should track cache size.");
    assert(lru.get("a") === 1, "LRU should return stored values and count hits.");
    lru.set("d", 4);
    assert(lru.stats().size === 3, "LRU should not exceed capacity.");
    assert(lru.stats().evictions === 1, "LRU should count evictions.");
    assert(lru.get("b") === null, "LRU should evict the oldest untouched key.");
    assert(lru.get("a") === 1, "LRU hit should refresh recent order.");
    lru.set("a", 10);
    assert(lru.stats().size === 3, "Repeated key should not increase LRU size.");
    lru.clear();
    assert(lru.stats().size === 0 && lru.stats().hits === 0 && lru.stats().misses === 0, "LRU clear should reset size and stats.");
    assertions += 9;

    engine.clearCache();
    stats = engine.getCacheStats();
    assert(stats.recipe.size === 0 && stats.raster.size === 0, "clearCache should empty caches.");
    assert(stats.recipe.hits === 0 && stats.recipe.misses === 0, "clearCache should reset recipe stats.");
    assert(stats.raster.hits === 0 && stats.raster.misses === 0, "clearCache should reset raster stats.");
    assertions += 3;

    keyA = engine.cacheKey({ target: "icon", seed: "shapeAdd", params: engine.normalizeParams({}) });
    render(engine, windowRef, "shapeAdd", 1);
    keyB = engine.cacheKey({ target: "icon", seed: "shapeAdd", params: engine.normalizeParams({}) });
    assert(keyA === keyB, "Render should not change public recipe cacheKey.");
    assertions += 1;

    before = engine.getCacheStats();
    render(engine, windowRef, "shapeAdd", 1);
    after = engine.getCacheStats();
    assert(after.recipe.hits === before.recipe.hits + 1, "Repeated render should hit recipe cache.");
    assert(after.raster.hits === before.raster.hits + 1, "Repeated render should hit raster cache.");
    assert(after.recipe.size === before.recipe.size, "Repeated key should not increase recipe cache size.");
    assert(after.raster.size === before.raster.size, "Repeated key should not increase raster cache size.");
    assertions += 4;

    engine.clearCache();
    render(engine, windowRef, "shapeAdd", 1);
    before = engine.getCacheStats();
    render(engine, windowRef, "shapeAdd", 2);
    after = engine.getCacheStats();
    assert(after.recipe.hits === before.recipe.hits + 1, "DPR change should not change recipe identity.");
    assert(after.raster.misses === before.raster.misses + 1, "DPR change should use a distinct raster cache entry.");
    assert(after.raster.size === 2, "DPR 1 and DPR 2 should keep separate raster entries.");
    assertions += 3;

    stats = engine.getCacheStats();
    assert(stats.recipe.limit === 128, "Engine recipe cache limit should be 128.");
    assert(stats.raster.limit === 24, "Engine raster cache limit should remain 24.");
    assert(stats.raster.size <= stats.raster.limit, "Raster cache should not exceed its limit.");
    assertions += 3;

    console.log("PASS procedural cache: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural cache - " + error.message);
    process.exitCode = 1;
}
