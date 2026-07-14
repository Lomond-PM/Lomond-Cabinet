#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CACHE_PATH = path.join(ROOT, "client", "js", "proceduralCache.js");
const PALETTE_PATH = path.join(ROOT, "client", "js", "proceduralPaletteLibrary.js");
const ENGINE_PATH = path.join(ROOT, "client", "js", "proceduralAppearance.js");
const HOME_ICONS_PATH = path.join(ROOT, "client", "js", "proceduralHomeIcons.js");
const LAB_TOOL_PATH = path.join(ROOT, "host", "tools", "proceduralAppearanceLab.tool.jsx");

const EXPECTED_PALETTE_IDS = [
    "pacificCyan",
    "blueLavender",
    "tealLuminous",
    "mossGold",
    "plumRose",
    "slateIce",
    "warmCoral",
    "graphiteSilver"
];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
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

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function loadEngine() {
    const cacheCode = fs.readFileSync(CACHE_PATH, "utf8");
    const paletteCode = fs.readFileSync(PALETTE_PATH, "utf8");
    const engineCode = fs.readFileSync(ENGINE_PATH, "utf8");
    const context = {
        window: {},
        console,
        Math,
        JSON,
        Number,
        String,
        Object,
        Array,
        parseInt,
        isNaN,
        isFinite
    };
    vm.createContext(context);
    vm.runInContext(cacheCode, context, { filename: CACHE_PATH });
    vm.runInContext(paletteCode, context, { filename: PALETTE_PATH });
    vm.runInContext(engineCode, context, { filename: ENGINE_PATH });
    assert(context.window.ProceduralPaletteLibrary, "ProceduralPaletteLibrary did not initialize.");
    assert(context.window.ProceduralAppearance, "ProceduralAppearance did not initialize.");
    return {
        paletteLibrary: context.window.ProceduralPaletteLibrary,
        engine: context.window.ProceduralAppearance
    };
}

function geometryProjection(recipe) {
    return {
        version: recipe.version,
        target: recipe.target,
        seed: recipe.seed,
        seedHash: recipe.seedHash,
        ribbons: recipe.ribbons,
        accentRibbonIndex: recipe.accentRibbonIndex,
        vortices: recipe.vortices,
        highlight: recipe.highlight,
        direction: recipe.direction,
        phaseA: recipe.phaseA,
        phaseB: recipe.phaseB,
        phaseC: recipe.phaseC
    };
}

function extractLabPaletteIds() {
    const text = fs.readFileSync(LAB_TOOL_PATH, "utf8");
    const fieldMatch = text.match(/key:\s*"paletteId"[\s\S]*?options:\s*\[([\s\S]*?)\]\s*\}/);
    assert(fieldMatch, "Could not find proceduralAppearanceLab paletteId select options.");
    const values = [];
    const regex = /value:\s*"([^"]+)"/g;
    let match;
    while ((match = regex.exec(fieldMatch[1]))) {
        values.push(match[1]);
    }
    return values;
}

function run() {
    const loaded = loadEngine();
    const library = loaded.paletteLibrary;
    const engine = loaded.engine;
    const homeIcons = require(HOME_ICONS_PATH);
    const palettes = library.listPalettes();
    const ids = palettes.map((palette) => palette.id);
    let assertions = 0;

    assert(stableStringify(ids) === stableStringify(EXPECTED_PALETTE_IDS), "First palette library release must contain exactly the expected 8 palettes in stable order.");
    assertions += 1;

    assert(new Set(ids).size === ids.length, "Palette ids must be unique.");
    assertions += 1;

    palettes.forEach((palette) => {
        const validation = library.validatePalette(palette);
        assert(validation.ok, palette.id + " failed validation: " + validation.errors.join("; "));
        assert(Number.isInteger(palette.version) && palette.version > 0, palette.id + " version must be a positive integer.");
        assert(/^#[0-9A-Fa-f]{6}$/.test(palette.colors.shadow), palette.id + " shadow must be #RRGGBB.");
        assert(/^#[0-9A-Fa-f]{6}$/.test(palette.colors.base), palette.id + " base must be #RRGGBB.");
        assert(/^#[0-9A-Fa-f]{6}$/.test(palette.colors.secondary), palette.id + " secondary must be #RRGGBB.");
        assert(/^#[0-9A-Fa-f]{6}$/.test(palette.colors.highlight), palette.id + " highlight must be #RRGGBB.");
        assert(Array.isArray(palette.stops) && palette.stops.length === 4, palette.id + " must have four stops.");
        assert(palette.stops.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), palette.id + " stops must be in 0-1.");
        assert(palette.stops.every((value, index) => index === 0 || value > palette.stops[index - 1]), palette.id + " stops must be strictly increasing.");
        assert(["shadow", "base", "secondary", "highlight"].every((role) => Object.prototype.hasOwnProperty.call(palette.weights, role)), palette.id + " must have all weights.");
        assert(Object.keys(palette.weights).every((role) => Number.isFinite(palette.weights[role]) && palette.weights[role] >= 0), palette.id + " weights must be finite non-negative numbers.");
        assert(Math.abs(Object.keys(palette.weights).reduce((sum, role) => sum + palette.weights[role], 0) - 1) <= 0.001, palette.id + " weights must sum to 1.");
        assert(validation.signature === library.getPaletteSignature(palette.id), palette.id + " validate signature must match getPaletteSignature.");
        assertions += 12;
    });

    const mutable = library.getPalette("pacificCyan");
    mutable.colors.base = "#FFFFFF";
    assert(library.getPalette("pacificCyan").colors.base === "#26728D", "getPalette must not expose mutable internal palette objects.");
    assertions += 1;

    const listed = library.listPalettes();
    listed.push({ id: "bad" });
    assert(library.listPalettes().length === EXPECTED_PALETTE_IDS.length, "listPalettes must not expose the internal palette array.");
    assertions += 1;

    assert(library.getPalette("missingPalette") === null, "Unknown palette should return null.");
    assert(library.hasPalette("missingPalette") === false, "Unknown palette should not be reported as available.");
    assertions += 2;

    const signature = library.getPaletteSignature("pacificCyan");
    assert(signature === library.getPaletteSignature("pacificCyan"), "Palette signature must be stable.");
    const changedColor = clone(library.getPalette("pacificCyan"));
    changedColor.colors.base = "#26738D";
    assert(library.validatePalette(changedColor).signature !== signature, "Changing palette content must change the signature.");
    const changedVersion = clone(library.getPalette("pacificCyan"));
    changedVersion.version = 2;
    assert(library.validatePalette(changedVersion).signature !== signature, "Changing palette version must change the signature.");
    const reordered = {
        weights: clone(library.getPalette("pacificCyan").weights),
        stops: clone(library.getPalette("pacificCyan").stops),
        colors: clone(library.getPalette("pacificCyan").colors),
        family: "coolLuminous",
        version: 1,
        id: "pacificCyan"
    };
    assert(library.validatePalette(reordered).signature === signature, "Palette signature must not depend on object property order.");
    assertions += 4;

    const noPaletteKey = engine.cacheKey({ target: "icon", seed: "shapeAdd", params: engine.normalizeParams({}) });
    const algorithmDefaultKey = engine.cacheKey({ target: "icon", seed: "shapeAdd", params: Object.assign({}, engine.normalizeParams({}), { paletteId: "algorithmDefault" }) });
    const pacificKey = engine.cacheKey({ target: "icon", seed: "shapeAdd", params: { paletteId: "pacificCyan" } });
    const tealKey = engine.cacheKey({ target: "icon", seed: "shapeAdd", params: { paletteId: "tealLuminous" } });
    assert(noPaletteKey === algorithmDefaultKey, "algorithmDefault must preserve existing cache identity.");
    assert(pacificKey.indexOf(library.getPaletteSignature("pacificCyan")) !== -1, "Palette signature must enter cache identity.");
    assert(pacificKey !== tealKey, "Different paletteId values should produce different color cache identity.");
    assertions += 3;

    const baseRecipe = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: engine.normalizeParams({}) });
    const defaultRecipe = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: Object.assign({}, engine.normalizeParams({}), { paletteId: "algorithmDefault" }) });
    const fixedRecipe = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: { paletteId: "pacificCyan" } });
    const fixedRecipeRepeat = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: { paletteId: "pacificCyan" } });
    const otherPaletteRecipe = engine.createRecipe({ target: "icon", seed: "shapeAdd", params: { paletteId: "blueLavender" } });
    assert(stableStringify(baseRecipe) === stableStringify(defaultRecipe), "algorithmDefault recipe must remain identical to old behavior.");
    assert(fixedRecipe.seed === "shapeAdd" && fixedRecipe.seedHash === baseRecipe.seedHash, "paletteId must not change seed text or seedHash.");
    assert(stableStringify(geometryProjection(fixedRecipe)) === stableStringify(geometryProjection(baseRecipe)), "paletteId must not change geometry recipe fields.");
    assert(stableStringify(geometryProjection(fixedRecipe)) === stableStringify(geometryProjection(otherPaletteRecipe)), "paletteId must not consume or shift geometry PRNG sequence.");
    assert(fixedRecipe.palette.paletteId === "pacificCyan", "Fixed palette recipe should expose the resolved palette id.");
    assert(stableStringify(fixedRecipe) === stableStringify(fixedRecipeRepeat), "Same paletteId should be stable across repeated recipe generation.");
    assertions += 6;

    const map = homeIcons.getHomeIconPaletteMap();
    Object.keys(map).forEach((toolId) => {
        assert(library.hasPalette(map[toolId]), "HOME_ICON_PALETTE_MAP value for " + toolId + " is missing from the palette library.");
        assertions += 1;
    });
    const homeBase = homeIcons.createIconInput({ toolId: "shapeAdd", label: "Shape Builder", language: "en", theme: "#fff", index: 0 });
    const homeTranslated = homeIcons.createIconInput({ toolId: "shapeAdd", label: "形状", language: "zh-CN", theme: "#f00", index: 9 });
    const homeReordered = homeIcons.createIconInput({ toolId: "shapeAdd", index: 100 });
    assert(stableStringify(homeBase) === stableStringify(homeTranslated), "Home palette mapping must not depend on label, language, or theme.");
    assert(stableStringify(homeBase) === stableStringify(homeReordered), "Home palette mapping must not depend on Home order.");
    assert(homeIcons.resolveHomePaletteId("unmapped-tool") === homeIcons.resolveHomePaletteId("unmapped-tool"), "Fallback palette mapping must be deterministic.");
    assertions += 3;

    const labPaletteIds = extractLabPaletteIds();
    assert(stableStringify(labPaletteIds) === stableStringify(["algorithmDefault"].concat(EXPECTED_PALETTE_IDS)), "Lab palette select options must match the fixed palette library.");
    assertions += 1;

    console.log("PASS procedural palette library: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural palette library - " + error.message);
    process.exitCode = 1;
}
