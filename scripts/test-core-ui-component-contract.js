"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var i18n = fs.readFileSync(path.join(root, "client/js/i18n.js"), "utf8");
var palette = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");
var controlLab = fs.readFileSync(path.join(root, "host/tools/registryControlLab.tool.jsx"), "utf8");
var settingsLab = fs.readFileSync(path.join(root, "host/tools/settingsRendererLab.tool.jsx"), "utf8");
var api = require(path.join(root, "client/js/ui/coreUi.js"));
var factories = ["createTextInput", "createTextarea", "createNumberInput", "createRangeNumber", "createSelect", "createSwitch", "createCheckbox", "createChoiceGroup", "createBezierCurveField", "createDisclosureController", "createColorField", "createButton", "createFieldRow"];
var forbidden = ["localStorage", "SettingsStateAdapter", "ToolRegistry", "ToolCatalog", "evalScript", "PaletteStore", "Vela"];

factories.forEach(function (name) { assert.strictEqual(typeof api[name], "function", name + " must be public"); });
forbidden.forEach(function (name) { assert.strictEqual(source.indexOf(name), -1, "CoreUI must not depend on " + name); });
["ui-text-input", "ui-textarea", "ui-number-input", "ui-range-number", "ui-select", "ui-switch", "ui-checkbox", "ui-choice-group", "ui-color-field", "ui-button", "ui-field-row"].forEach(function (name) {
    assert(source.indexOf(name) >= 0, name + " semantic class must exist");
});
["registry-text-input", "registry-textarea", "registry-color-hex", "registry-color-swatch", "registry-number-input", "registry-range-number", "registry-large-button", "registry-option-card"].forEach(function (name) {
    assert(css.indexOf(name) >= 0, name + " compatibility alias must remain");
});
assert(main.indexOf("window.CoreUI.createRangeNumber") >= 0, "Settings must consume Core RangeNumber");
assert(main.indexOf("window.CoreUI.createSwitch") >= 0, "Registry/Settings must consume Core Switch");
assert(main.indexOf("window.CoreUI.createCheckbox") >= 0, "Registry/Vela acknowledgement must consume Core Checkbox");
assert(main.indexOf("window.CoreUI.createChoiceGroup") >= 0, "Registry tabs must consume Core ChoiceGroup");
assert(main.indexOf("window.CoreUI.createDisclosureController") >= 0, "Registry/Settings collapsibles must consume Core Disclosure");
assert(/fieldType === "cubicBezier"[\s\S]*?CoreUI\.createBezierCurveField/.test(main), "Registry cubicBezier must consume Core BezierCurveField");
assert(/speedHint:\s*tr\("core\.bezier\.speedInfluenceHint"\)/.test(main), "Registry cubicBezier must supply the shared localized Speed interaction hint");
assert(i18n.indexOf('"core.bezier.speedInfluenceHint": "Shift + horizontal drag: influence only"') >= 0 && i18n.indexOf('"core.bezier.speedInfluenceHint": "Shift + \\u6c34\\u5e73\\u62d6\\u52a8\\uff1a\\u4ec5\\u8c03\\u6574\\u5f71\\u54cd\\u8303\\u56f4"') >= 0, "Bezier Speed hint must retain formal English and Chinese i18n ownership");
assert(/field\.type === "cubicBezier"[\s\S]*?_coreBezierFieldGetValue/.test(main), "Registry cubicBezier must collect the structured canonical value");
assert(!/fieldType === "checkbox"[\s\S]{0,200}createSwitch/.test(main), "Registry checkbox must not map to Switch");
assert(/function createRegistrySectionToggle[\s\S]*?CoreUI\.createSwitch/.test(main), "Registry section toggles must consume Core Switch");
assert(/createCheckbox\(\{[^}]*id: "velaExperimentalAcknowledgement"/.test(main), "Vela acknowledgement must consume Core Checkbox");
assert(/type: "switch",\s*key: "enabled"/.test(controlLab) && /type: "checkbox",\s*key: "acknowledged"/.test(controlLab), "Control Lab must distinguish Switch and Checkbox schemas");
assert(/value: "longDisabled"[\s\S]*?disabled: true/.test(controlLab), "Control Lab ChoiceGroup must include disabled long-content stress");
assert(/type: "cubicBezier",\s*key: "defaultCurve"/.test(controlLab), "Control Lab must expose the real Registry cubicBezier path");
assert(/key: "overshootCurve"[\s\S]*?y1: -0\.4[\s\S]*?y2: 1\.45/.test(controlLab), "Control Lab must include legal overshoot/anticipation data");
assert(/key: "readonlyCurve"[\s\S]*?readonly: true/.test(controlLab) && /key: "disabledCurve"[\s\S]*?disabled: true/.test(controlLab), "Control Lab must cover readonly and disabled curves");
assert(source.indexOf("MotionDefaults") < 0 && source.indexOf("AppearanceStateStore") < 0 && source.indexOf("Design Tuning") < 0, "BezierCurveField must remain domain-isolated");
assert(source.indexOf("SPEED_INFLUENCE_VISUAL_SPAN = 0.5") >= 0 && source.indexOf("mapSpeedInfluenceX") >= 0 && source.indexOf("unmapSpeedInfluence") >= 0, "Speed Influence forward and inverse geometry must share the half-width presentation authority");
assert(css.indexOf(".ui-bezier-viewport") >= 0 && css.indexOf(".ui-bezier-numeric-grid") >= 0, "BezierCurveField responsive visual contract must exist");
assert(/type: "switch",\s*key: "registryDebugTools"/.test(settingsLab) && /type: "switch",\s*key: "motionEnable"/.test(settingsLab), "persistent Settings Lab booleans must use switch semantics");
assert(palette.indexOf("options.CoreUI.createNumberInput") >= 0, "Palette number fields must consume CoreUI");
assert(source.indexOf("Math.abs(delta) < 4") >= 0, "number scrub threshold must remain 4px");
assert(main.indexOf("SETTINGS_PEEK_DELAY_MS = 300") >= 0, "UI Scale Peek delay must remain 300ms");

console.log("Core UI component contract tests passed.");
