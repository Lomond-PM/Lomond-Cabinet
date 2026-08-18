#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8") + "\n" + fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
const context = { self: {}, window: {}, module: { exports: {} }, Object, Number, isFinite, JSON };
context.self = context.window = { document: {}, CoreUI: require(path.join(root, "client/js/ui/coreUi.js")) };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"), "utf8"), context);
const parameters = Array.from(context.window.DesignTuningParameterRegistry.list()).filter(p => !p.protection);
assert.strictEqual(parameters.length, 60, "all 60 editable parameters remain available");
parameters.filter(p => p.cssProperty).forEach(parameter => {
    const uses = (css.match(new RegExp("var\\(" + parameter.cssProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\)", "g")) || []).length;
    assert.ok(uses > 0, parameter.id + " has a real stylesheet consumer");
    assert.ok(parameter.projection === "root-semantic-property", parameter.id + " projects through its semantic token");
    if (parameter.editing) assert.ok(parameter.editing.trackMax - parameter.editing.trackMin >= 12, parameter.id + " includes a practical slider navigation span");
});
const domainSpecific = parameters.filter(p => p.consumerScope === "domain-specific").map(p => p.id);
assert.deepStrictEqual(domainSpecific, [
    "spacing.settings.fieldControl",
    "spacing.registry.cardInset",
    "spacing.registry.introContent",
    "spacing.registry.sectionHeaderContent",
    "spacing.registry.sectionCopy",
    "spacing.registry.fieldCopy",
    "spacing.registry.fieldControl",
    "spacing.palette.fieldControl",
    "spacing.home.toolGrid",
    "spacing.home.majorStack",
    "spacing.home.cardTitle"
], "only explicitly named Settings, Registry, Palette, and Home spacing parameters are domain-specific");
parameters.filter(p => p.consumerScope === "global-common" && p.cssProperty).forEach(parameter => {
    assert.ok((css.match(new RegExp("var\\(" + parameter.cssProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\)", "g")) || []).length > 0, parameter.id + " retains common semantic authority");
});
[
    ["--control-height", [".ui-number-input", ".ui-text-input", ".select-trigger", ".ui-color-swatch"]],
    ["--radius-editable-control", [".ui-number-input", ".ui-text-input", ".ui-bezier-view-selector"]],
    ["--radius-nested-surface", [".registry-info-note", ".ui-bezier-viewport"]],
    ["--button-height", [".ui-button"]],
    ["--button-pad-x", [".ui-button"]],
    ["--space-inline-control", [".control-inputs", ".ui-bezier-field"]],
    ["--space-card-inset", [".settings-section", ".panel-card"]]
].forEach(([token, selectors]) => selectors.forEach(selector => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.ok(new RegExp(escaped + "[\\s\\S]{0,700}var\\(" + token + "\\)").test(css), selector + " consumes " + token);
}));
assert.ok(/--radius-registry-option:\s*var\(--radius-nested-surface\)/.test(css), "ChoiceGroup nested surface alias converges on the common authority");
assert.ok(/\.ui-choice-surface,[\s\S]{0,700}border-radius:\s*var\(--radius-registry-option\)/.test(css), "ChoiceGroup consumes the converged nested surface alias");
assert.ok(/calc\(" \+ value \+ "px \* var\(--ui-scale\)\)/.test(fs.readFileSync(path.join(root, "client/js/designTuning/designTuningResolver.js"), "utf8")), "length projection preserves UI Scale composition");
console.log("Design Tuning effectiveness contract tests passed.");
