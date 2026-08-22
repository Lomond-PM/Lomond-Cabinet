#!/usr/bin/env node
"use strict";

/*
 * Canonical Promotion contract.
 *
 * Validates that the 37 A-calibrated values from the Full Design Calibration
 * worksheet have been promoted to the true canonical authorities:
 *  - Motion durations -> MotionDefaults.durations
 *  - Motion curves / spacing / radius / geometry / optical shadows / elevation /
 *    surface colors -> canonical CSS custom-property values
 *
 * It re-reads the canonical (clean-state, no override) resolved value for each A
 * parameter and asserts typed equality with the worksheet Calibrated Value, plus
 * the protected set is unchanged. This is the "promotion parity" guard: the default
 * result after clearing calibration overrides must reproduce the accepted snapshot.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const Registry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));
const Store = require(path.join(root, "client/js/designTuning/designTuningStateStore.js"));
const Resolver = require(path.join(root, "client/js/designTuning/designTuningResolver.js"));
const CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const worksheet = fs.readFileSync(path.join(root, "docs/reports/FULL_DESIGN_CALIBRATION_WORKSHEET.md"), "utf8");

// MotionDefaults is a browser UMD (references window); load it in a pristine context.
const mdContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, "client/js/ui/motionDefaults.js"), "utf8"), mdContext, { filename: "motionDefaults.js" });
const MotionDefaults = mdContext.window.MotionDefaults;

function parseCubicBezier(value) {
    const m = /cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(value || "");
    return m ? { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) } : null;
}
function parseNumeric(value) {
    const m = /-?(?:\d+\.?\d*|\.\d+)/.exec(String(value || ""));
    return m ? Number(m[0]) : null;
}
function cssDeclaration(property) {
    const re = new RegExp(property + ":\\s*([^;]+);");
    const m = css.match(re);
    return m ? m[1].trim() : null;
}

// Parse the worksheet Promotion Summary into a manifest (A items).
const manifest = [];
const rowRe = /^\|\s*`([^`]+)`\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*PROMOTE CURRENT VALUE\s*\|/gm;
let row;
while ((row = rowRe.exec(worksheet))) {
    manifest.push({ id: row[1].trim(), before: row[2].trim(), after: row[3].trim() });
}
assert.strictEqual(manifest.length, 37, "worksheet Promotion Summary must contain exactly 37 A items");

const PROTECTED = ["radius.sectionCard", "radius.homeTile", "radius.homeIcon"];

function typedCanonical(parameter) {
    if (parameter.motionRole) return MotionDefaults.durations[parameter.motionRole];
    if (parameter.type === "cubicBezier") {
        const v = cssDeclaration(parameter.cssProperty);
        return parseCubicBezier(v);
    }
    if (parameter.type === "shadow") return CoreUI.parseShadowValue(cssDeclaration(parameter.cssProperty));
    if (parameter.type === "colorAlpha") return CoreUI.parseColorAlphaValue(cssDeclaration(parameter.cssProperty));
    if (parameter.type === "lengthPx") return parseNumeric(cssDeclaration(parameter.cssProperty));
    if (parameter.type === "percentage") return parseNumeric(cssDeclaration(parameter.cssProperty));
    throw new Error("unhandled A type " + parameter.type);
}
function typedWorksheet(value, parameter) {
    if (parameter.motionRole) return Number(String(value).replace(/ms$/, ""));
    if (parameter.type === "cubicBezier") return parseCubicBezier(value);
    if (parameter.type === "shadow") return CoreUI.parseShadowValue(value);
    if (parameter.type === "colorAlpha") return CoreUI.parseColorAlphaValue(value);
    if (parameter.type === "lengthPx") return parseNumeric(value);
    if (parameter.type === "percentage") return parseNumeric(value);
    throw new Error("unhandled A type " + parameter.type);
}
function deepEqual(a, b) {
    if (a && b && typeof a === "object") {
        const ka = Object.keys(a).sort(); const kb = Object.keys(b).sort();
        if (ka.length !== kb.length) return false;
        return ka.every((k) => deepEqual(a[k], b[k]));
    }
    return a === b;
}
// The resolver stores cubicBezier canonicals as the serialized string; everything else
// is a structured/number value. Return the worksheet Calibrated Value in the form the
// resolver's evidence exposes it for a given parameter type.
function worksheetForm(value, parameter) {
    if (parameter.type === "cubicBezier") return value;
    return typedWorksheet(value, parameter);
}

// 1. Every A parameter is a single registry authority and has promoted canonical == calibrated.
const seen = new Set();
manifest.forEach((item) => {
    const parameter = Registry.get(item.id);
    assert.ok(parameter, item.id + " must be a registered Design Tuning parameter");
    assert.ok(parameter.disposition === "EDITABLE", item.id + " must be an editable promoted parameter");
    const canonical = typedCanonical(parameter);
    const calibrated = typedWorksheet(item.after, parameter);
    assert.ok(deepEqual(canonical, calibrated), item.id + " promoted canonical (" + JSON.stringify(canonical) + ") must equal worksheet calibrated (" + JSON.stringify(calibrated) + ")");
    seen.add(item.id);
});
assert.strictEqual(seen.size, 37, "no duplicate A IDs");

// 2. Protected set is unchanged (canonical still the protected values).
assert.strictEqual(parseNumeric(cssDeclaration("--radius-lg")), 22, "radius-lg baseline (Protected sectionCard/homeTile) unchanged");
assert.strictEqual(parseNumeric(cssDeclaration("--radius-md")), 16, "radius-md baseline unchanged");
assert.strictEqual(parseNumeric(cssDeclaration("--radius-sm")), 10, "radius-sm baseline unchanged");
assert.ok(/--radius-home-icon:\s*25\.5%/.test(css), "radius.homeIcon protected value unchanged");
assert.strictEqual(cssDeclaration("--radius-section-card"), "var(--radius-lg)", "section-card stays a radius-lg alias");
assert.strictEqual(cssDeclaration("--radius-home-tile"), "var(--radius-lg)", "home-tile stays a radius-lg alias");

// 2b. U parameters must have no semantic canonical change (spot-check across domains).
const unchanged = {
    "motion.curve.enter": "cubic-bezier(0.16, 1, 0.3, 1)",
    "text.secondary": "rgba(246, 240, 223, 0.66)",
    "text.tertiary": "rgba(246, 240, 223, 0.42)",
    "border.separator": "rgba(214, 178, 94, 0.16)",
    "border.panel": "rgba(214, 178, 94, 0.22)",
    "border.input": "rgba(214, 178, 94, 0.16)",
    "surface.field": "rgba(5, 4, 3, 0.5)",
    "surface.dangerAction": "rgba(255, 107, 95, 0.22)",
    "elevation.surfaceShell": "0 18px 48px rgba(0, 0, 0, 0.38)"
};
Object.keys(unchanged).forEach((id) => {
    const parameter = Registry.get(id);
    assert.ok(parameter, id + " is a registered U parameter");
    const canonical = parameter.motionRole ? MotionDefaults.durations[parameter.motionRole] : cssDeclaration(parameter.cssProperty);
    assert.ok(deepEqual(canonical, unchanged[id]), id + " accepted-unchanged canonical must stay " + JSON.stringify(unchanged[id]));
});
assert.strictEqual(MotionDefaults.durations.actionFeedback, 160, "U duration actionFeedback unchanged");

// 3. Clean-state default (no overrides) reproduces the accepted snapshot for every A.
const store = Store.create({ storage: (() => { const v = { value: "null", getItem() { return this.value; }, setItem(k, val) { this.value = val; } }; return v; })(), registry: Registry });
store.load();
const resolver = Resolver.create({
    registry: Registry,
    store,
    rootStyle: { setProperty() {}, removeProperty() {} },
    readComputed(property) { return cssDeclaration(property); },
    getCanonicalDuration: (role) => MotionDefaults.durations[role],
    parseShadow: CoreUI.parseShadowValue,
    serializeShadow: CoreUI.serializeShadowValue,
    parseColorAlpha: CoreUI.parseColorAlphaValue,
    serializeColorAlpha: CoreUI.serializeColorAlphaValue
});
resolver.initialize();
const evidence = resolver.getEvidence();
manifest.forEach((item) => {
    const parameter = Registry.get(item.id);
    const resolved = evidence.resolved[item.id];
    const calibrated = worksheetForm(item.after, parameter);
    assert.ok(deepEqual(resolved, calibrated), item.id + " clean-state resolved (" + JSON.stringify(resolved) + ") must equal calibrated (" + JSON.stringify(calibrated) + ")");
});
assert.strictEqual(Object.keys(evidence.overrides).length, 0, "clean state must have no overrides");

// 4. Reset contract: resetAll is idempotent on a clean state; resolved still equals calibrated.
resolver.resetAll();
const resetEvidence = resolver.getEvidence();
assert.strictEqual(Object.keys(resetEvidence.overrides).length, 0, "resetAll leaves no calibration overrides");
manifest.forEach((item) => {
    const parameter = Registry.get(item.id);
    const resolved = resetEvidence.resolved[item.id];
    const calibrated = worksheetForm(item.after, parameter);
    assert.ok(deepEqual(resolved, calibrated), item.id + " reset-then-resolve (" + JSON.stringify(resolved) + ") must equal calibrated (" + JSON.stringify(calibrated) + ")");
});

console.log("Canonical Promotion contract tests passed: " + manifest.length + " A params promoted with typed parity, 3 Protected unchanged, reset parity verified.");

