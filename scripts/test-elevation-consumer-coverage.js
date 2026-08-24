#!/usr/bin/env node
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var cssDirectory = path.join(root, "client/css");
var css = fs.readdirSync(cssDirectory).filter(function (name) { return /\.css$/i.test(name); }).sort().map(function (name) {
    return "\n/* " + name + " */\n" + fs.readFileSync(path.join(cssDirectory, name), "utf8");
}).join("\n");
var registry = fs.readFileSync(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"), "utf8");
var shadowRule = /([^{}]+)\{[^{}]*box-shadow:\s*([^;]+);/g;
var allowedOpticalSelectors = [
    "button:focus-visible",
    ".tool-app:focus-visible .more-icon",
    ".view-home.home-editing .tool-app.is-dragging .tool-icon",
    ".tool-icon",
    ".color-shell",
    ".ui-choice-surface.is-selected",
    ".registry-option-card.is-selected",
    ".ui-range::-webkit-slider-thumb",
    ".pill-slider::-webkit-slider-thumb",
    ".ui-range:focus-visible::-webkit-slider-thumb",
    ".pill-slider:focus-visible::-webkit-slider-thumb",
    ".ui-checkbox input:focus-visible + .ui-checkbox-mark",
    ".ui-switch-track::after",
    ".switch-track::after",
    ".ui-color-swatch",
    ".registry-color-swatch",
    ".registry-color-plane-handle",
    ".registry-color-axis-handle"
];
var match;
var violations = [];

function isAllowedOptical(selector) {
    return allowedOpticalSelectors.some(function (allowed) { return selector.indexOf(allowed) >= 0; });
}

function requiresExplicitOpticalToken(selector) {
    return selector.indexOf("slider-thumb") >= 0 || selector.indexOf("switch-track::after") >= 0;
}

while ((match = shadowRule.exec(css))) {
    var selector = match[1].trim();
    var value = match[2].trim();
    if (value === "none" || /var\(--elevation-[^)]+\)/.test(value)) continue;
    if (isAllowedOptical(selector)) {
        if (requiresExplicitOpticalToken(selector) && !/var\(--(?:slider|switch)-thumb-optical-shadow\)/.test(value)) violations.push(selector + " => anonymous optical shadow " + value.replace(/\s+/g, " "));
        continue;
    }
    violations.push(selector + " => " + value.replace(/\s+/g, " "));
}

assert.deepStrictEqual(violations, [], "visible production shadows need registered elevation ownership or an explicit optical/transition exception");

[
    ["--elevation-surface-shell", "elevation.surfaceShell"],
    ["--elevation-information-surface", "elevation.informationSurface"],
    ["--elevation-primary-action", "elevation.primaryAction"],
    ["--elevation-utility-action", "elevation.utilityAction"],
    ["--elevation-floating-surface", "elevation.floatingSurface"],
    ["--elevation-floating-picker", "elevation.floatingPicker"],
    ["--elevation-action-container", "elevation.actionContainer"]
].forEach(function (entry) {
    assert(css.indexOf(entry[0] + ":") >= 0, entry[0] + " must have a stylesheet canonical");
    assert(registry.indexOf('id: "' + entry[1] + '"') >= 0, entry[0] + " must be registered for calibration");
});

assert(/id: "elevation\.registryPreviewProminence", disposition: "UNSUPPORTED_WITH_REASON"/.test(registry), "scale-coupled Registry preview shadow remains an explicit typed-editor exception");
assert(/\.ui-button--neutral\s*\{[^}]*box-shadow:\s*none;/.test(css), "Neutral Action is intentionally flat");
assert(/\.ui-button--danger\s*\{[^}]*box-shadow:\s*none;/.test(css), "Danger Action is intentionally flat");
assert(!/\.panel-button:not\(\.utility-action\)\s*\{[^}]*box-shadow:/.test(css), "legacy panel-button literal cannot silently create a fifth Action elevation family");
assert(/--slider-thumb-optical-shadow:\s*0 4px 16px rgba\(92, 191, 255, 0\.79\)/.test(css), "Slider thumb has an explicit component optical authority");
assert(/--switch-thumb-optical-shadow:\s*0 4px 16px rgba\(92, 191, 255, 0\.79\)/.test(css), "Switch thumb has an explicit component optical authority");
assert(/id: "componentOptics\.sliderThumbShadow", type: "shadow", domain: "controls", group: "optics", cssProperty: "--slider-thumb-optical-shadow"/.test(registry), "Slider optical authority is editable in Controls without entering Elevation");
assert(/id: "componentOptics\.switchThumbShadow", type: "shadow", domain: "controls", group: "optics", cssProperty: "--switch-thumb-optical-shadow"/.test(registry), "Switch optical authority is editable in Controls without entering Elevation");
assert(!/id: "elevation\.(?:slider|switch)Thumb/.test(registry), "component optical editability must not create Slider/Switch Elevation roles");
assert(/\.ui-range::-webkit-slider-thumb,[\s\S]*box-shadow:\s*var\(--slider-thumb-optical-shadow\)/.test(css), "resting Slider thumb consumes its optical token");
assert(/\.ui-range:focus-visible::-webkit-slider-thumb,[\s\S]*box-shadow:[^;]*var\(--slider-thumb-optical-shadow\)/.test(css), "focused Slider thumb composes focus ring with the same optical token");
assert(/\.ui-switch-track::after,[\s\S]*box-shadow:\s*var\(--switch-thumb-optical-shadow\)/.test(css), "Switch thumb consumes its independent optical token");
assert.strictEqual((registry.match(/cssProperty: "--slider-thumb-optical-shadow"/g) || []).length, 1, "Slider optical token has one calibration authority");
assert.strictEqual((registry.match(/cssProperty: "--switch-thumb-optical-shadow"/g) || []).length, 1, "Switch optical token has one calibration authority");

console.log("Elevation consumer coverage contract tests passed.");
