#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
const registrySource = fs.readFileSync(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"), "utf8");
const i18n = fs.readFileSync(path.join(root, "client/js/i18n.js"), "utf8");
const index = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
const velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
const velaComposer = fs.readFileSync(path.join(root, "client/js/vela/velaComposerView.js"), "utf8");
const velaConfirmation = fs.readFileSync(path.join(root, "client/js/vela/velaConfirmationView.js"), "utf8");
const registry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));

// Custom Select has a surface shell and a separate inset scroll viewport.
assert.ok(/\.select-menu\s*\{[^}]*overflow:\s*hidden[^}]*border-radius:[^}]*box-shadow:\s*var\(--elevation-floating-surface\)/.test(css), "popup shell owns radius, clipping, and elevation");
assert.ok(/\.select-menu-viewport\s*\{[^}]*max-height:[^}]*margin-block:\s*var\(--select-menu-viewport-inset\)[^}]*overflow-y:\s*auto/.test(css), "inner viewport owns scrolling with top and bottom inset");
assert.ok(/viewport\.className = "select-menu-viewport";[\s\S]*menu\.appendChild\(viewport\)[\s\S]*document\.body\.appendChild\(menu\)/.test(main), "body portal mounts the layered popup surface");
assert.ok(/viewport\.appendChild\(optionButton\)/.test(main), "options belong to the scroll viewport");
assert.ok(/desiredHeight = Math\.min\(viewport\.scrollHeight/.test(main) && /--select-menu-available-height/.test(main), "placement derives available height from the real viewport content");
assert.ok(!/\.select-menu(?:::-webkit-scrollbar|\s+::-webkit-scrollbar)|\.select-menu-viewport(?:::-webkit-scrollbar|\s+::-webkit-scrollbar)/.test(css), "Select does not own a feature-local scrollbar skin");

// Every elevation parameter carries generic presentation metadata and bilingual copy.
const elevations = registry.list().filter(parameter => parameter.domain === "elevation");
assert.strictEqual(elevations.length, 7, "all seven canonical elevation roles remain registered");
elevations.forEach(parameter => {
    assert.ok(parameter.presentation && parameter.presentation.labelKey && parameter.presentation.descriptionKey, parameter.id + " has complete presentation metadata");
    assert.ok(i18n.split(parameter.presentation.descriptionKey).length >= 3, parameter.id + " description exists in both locales");
});
assert.ok(/var presentation = parameter\.presentation \|\| \{\}/.test(main), "renderer consumes generic parameter presentation metadata");
assert.ok(/presentation\.descriptionKey[\s\S]*className = "settings-field-description"/.test(main), "description uses existing supporting text presentation");
assert.ok(!/if\s*\(\s*parameter\.id\s*===\s*"elevation\./.test(main), "renderer contains no elevation-id presentation special case");
assert.ok(/"settings\.designTuning\.elevation\.title": "\\u89c6\\u89c9\\u5c42\\u7ea7 \/ \\u9634\\u5f71"/.test(i18n), "Chinese category names visual depth instead of geometry height");

// Resting navigation elevation owns a stable stacking layer before hover creates a transform.
assert.ok(/\.settings-header\s*\{[^}]*position:\s*relative[^}]*z-index:\s*2/.test(css), "Settings header has stable action-layer stacking ownership");
assert.ok(/\.home-header,\s*\.detail-header\s*\{[^}]*position:\s*relative[^}]*z-index:\s*2/.test(css), "Tool header retains stable action-layer stacking ownership");
assert.ok(/\.back-button\s*\{[^}]*position:\s*relative[^}]*z-index:\s*1/.test(css), "Back button elevation is positioned in the resting state");
assert.ok(!/\.back-button:hover\s*\{[^}]*z-index/.test(css), "Back visibility never depends on a hover-only z-index repair");
assert.ok(/\.panel-button:hover[\s\S]{0,180}transform:\s*translateY\(-1px\) scale\(1\.01\)/.test(css), "existing hover interaction remains intact");
assert.ok(/\.app-shell\.is-animating \.panel-button[\s\S]{0,180}box-shadow:\s*none/.test(css), "transition guard still suppresses transient button shadows");

// ShadowField owns subfield semantics; Design Tuning only supplies translated presentation metadata.
["offsetX", "offsetY", "blur", "spread", "color", "alpha"].forEach(function (key) {
    assert.ok(new RegExp('createSubfield\\("' + key + '"|addNumber\\("' + key + '"').test(core), "ShadowField binds the " + key + " semantic subfield");
    assert.ok(i18n.split('"settings.designTuning.shadow.' + key + '"').length >= 3, key + " has bilingual presentation copy");
});
assert.ok(/function createShadowField[\s\S]*classNames: "ui-shadow-subfield ui-shadow-subfield--" \+ key/.test(core), "subfield grouping is owned by shared ShadowField");
assert.ok(/label\.setAttribute\("for", control\.id\)/.test(core) && /wrapper\.setAttribute\("role", "group"\)/.test(core), "visible labels and accessible names share the same semantic source");
assert.ok(/labels:\s*\{\s*offsetX:\s*tr\("settings\.designTuning\.shadow\.offsetX"\)[\s\S]*color:\s*tr\("settings\.designTuning\.shadow\.color"\)[\s\S]*alpha:\s*tr\("settings\.designTuning\.shadow\.alpha"\)/.test(main), "Design Tuning adapts i18n labels without an elevation-id special case");
assert.ok(/\.ui-shadow-subfield--color\s*\{[^}]*grid-column:\s*span 3/.test(css) && /@media \(max-width: 380px\)[\s\S]*\.ui-shadow-subfield--color\s*\{\s*grid-column:\s*span 2/.test(css), "Color and Opacity retain stable wide and narrow grouping");
assert.ok(/registryControlLabShadowField[\s\S]{0,1200}openPicker:\s*openCoreColorPicker[\s\S]{0,500}onPreview:[\s\S]{0,500}onCommit:[\s\S]{0,500}onCancel:/.test(main), "Control Lab ShadowField injects the production picker and complete specimen lifecycle");
assert.ok(/registryControlLabColorAlphaField[\s\S]{0,500}openPicker:\s*openCoreColorPicker[\s\S]{0,500}onPreview:[\s\S]{0,500}onCommit:[\s\S]{0,500}onCancel:/.test(main), "Control Lab Color + Alpha uses the same production picker lifecycle");
assert.ok(!/registry-control-lab[^}]*\.ui-(?:shadow|color)-field\s*\{/.test(css), "Control Lab has no private composite-control visual patch");
assert.ok(!/\.settings-view\s*\{[^}]*--ui-scale:/.test(css), "Settings inherits the live application UI Scale instead of shadowing it");
assert.ok(/\.ui-color-field,[\s\S]{0,180}grid-template-columns:\s*minmax\(calc\(88px \* var\(--ui-scale\)\), 1fr\)/.test(css), "ColorField intrinsic columns scale at the global low-scale boundary");
assert.ok(/\.ui-color-hex,[\s\S]{0,100}\.registry-color-hex\s*\{[^}]*min-width:\s*calc\(78px \* var\(--ui-scale\)\)/.test(css), "HEX companion cannot retain an unscaled low-scale minimum");
assert.ok(/\.ui-color-swatch,[\s\S]{0,100}\.registry-color-swatch\s*\{[^}]*height:\s*var\(--control-height\)[^}]*min-height:\s*var\(--control-height\)/.test(css), "Color swatch opts out of action-button minimum height and aligns with field controls");

// Reset actions use the shared Neutral Button family; only per-parameter actions use compact sizing.
assert.ok(/createDesignTuningFieldShell[\s\S]*CoreUI\.createButton\(\{ document: document, variant: "neutral", size: "compact"/.test(main), "parameter Reset uses shared compact Neutral Button");
assert.ok(/createAppearanceAdvancedField[\s\S]*CoreUI\.createButton\(\{ document: document, variant: "neutral", size: "compact"/.test(main), "Appearance mirror Reset uses the same shared component path");
assert.ok(/resetDomain = window\.CoreUI\.createButton\(\{ document: document, variant: "neutral"/.test(main), "domain Reset uses standard-size shared Neutral Button");
assert.ok(/resetAll = window\.CoreUI\.createButton\(\{ document: document, variant: "neutral"/.test(main), "Reset All uses standard-size shared Neutral Button");
assert.ok(/function createButton[\s\S]*options\.size[\s\S]*"ui-button--" \+ options\.size/.test(core), "compact sizing is a generic CoreUI Button capability");
assert.ok(/\.ui-button--compact\s*\{[^}]*min-width:[^}]*min-height:[^}]*padding-inline:/.test(css), "compact Button remains content-padded and cannot collapse into square geometry");
assert.ok(!/\.appearance-reset-button\s*\{[^}]*border-radius|\.appearance-reset-button\s*\{[^}]*width:\s*var\(--button-height\)/.test(css), "Reset owns neither a private radius nor fixed-square width");
assert.ok(/\.settings-design-tuning-field > \.appearance-reset-button\s*\{[^}]*align-self:\s*start/.test(css), "parameter Reset opts out of grid track stretch without owning private dimensions");
assert.ok(!/\.ui-button--compact\s*\{[^}]*aspect-ratio:\s*1/.test(css), "compact Button never imposes square aspect ratio");

// Production Utility Actions share one independent resting elevation authority.
const utilityElevation = registry.get("elevation.utilityAction");
assert.ok(utilityElevation && utilityElevation.cssProperty === "--elevation-utility-action", "Utility Action elevation is a registered typed authority");
assert.ok(utilityElevation.presentation && utilityElevation.presentation.labelKey && utilityElevation.presentation.descriptionKey, "Utility Action elevation has complete presentation metadata");
assert.ok(i18n.split(utilityElevation.presentation.descriptionKey).length >= 3, "Utility Action elevation description is bilingual");
assert.ok(/--elevation-utility-action:\s*0 12px 30px rgba\(0, 0, 0, 0\.28\)/.test(css), "canonical Utility shadow preserves the existing computed value");
assert.ok(/\.ui-button--navigation,[\s\S]*?\.utility-action\s*\{[^}]*box-shadow:\s*var\(--elevation-utility-action\)/.test(css), "shared Utility structure consumes the authority");
["backBtn", "closeSettingsBtn", "editHomeBtn", "toolBootstrapRetry"].forEach(function (id) { assert.ok(new RegExp('id="' + id + '"[^>]*class="[^"]*utility-action|class="[^"]*utility-action[^"]*"[^>]*id="' + id + '"').test(index), id + " is an intended Utility consumer"); });
assert.ok(/panel-button utility-action vela-settings-button/.test(fs.readFileSync(path.join(root, "client/js/vela/velaSurface.js"), "utf8")), "Vela Settings is an intended Utility consumer");
assert.ok(/panel-button utility-action vela-surface-action/.test(velaComposer) && /panel-button utility-action vela-surface-action/.test(velaConfirmation), "Vela Send/Cancel/Approve/Reject share Utility structure");
assert.ok(!/\.vela-(?:settings-button|surface-action)\s*\{[^}]*box-shadow:/.test(velaCss), "Vela composition does not suppress or redefine shared elevation");
assert.ok(!/--elevation-utility-action:\s*var\(--elevation-(?:primary-action|action-container)\)/.test(css), "Utility Action elevation is independent from Primary and Action Container");
assert.ok(/\.ui-button--neutral\s*\{[^}]*box-shadow:\s*none/.test(css) && /\.ui-button--danger\s*\{[^}]*box-shadow:\s*none/.test(css), "Neutral and Danger remain negative controls");

console.log("Settings control follow-up contract tests passed.");
