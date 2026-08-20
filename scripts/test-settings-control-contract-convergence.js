#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");

// Slider construction and presentation are CoreUI-owned for Settings parameters.
assert.ok(/function createRangeNumber[\s\S]*classNames: "ui-range "/.test(core), "RangeNumber always assigns the structural ui-range class");
assert.ok(/createAppearanceRangeNumberControl[\s\S]*CoreUI\.createRangeNumber/.test(main), "Appearance Settings ranges use CoreUI RangeNumber");
assert.ok(/createDesignTuningDurationField[\s\S]*CoreUI\.createRangeNumber/.test(main), "Design Tuning duration ranges use CoreUI RangeNumber");
assert.ok(/createDesignTuningScalarField[\s\S]*CoreUI\.createRangeNumber/.test(main), "Design Tuning scalar ranges use CoreUI RangeNumber");
assert.ok(/createColorField[\s\S]*createRangeNumber\(\{[\s\S]*unitText: "%"/.test(core), "Color + Alpha composes its alpha slider through CoreUI RangeNumber");
assert.ok(/\.ui-range::-webkit-slider-thumb,[\s\S]*?\.pill-slider::-webkit-slider-thumb\s*\{[^}]*width:\s*calc\(26px[^}]*height:\s*calc\(14px[^}]*border-radius:\s*var\(--radius-pill\)/.test(css), "the base CoreUI slider owns the capsule thumb");
assert.ok(!/\.registry-range::-webkit-slider-thumb/.test(css), "no consumer-specific Registry thumb patch remains");
assert.ok(/\.ui-range:focus-visible::-webkit-slider-thumb[\s\S]*interaction-focus-ring/.test(css), "CoreUI slider owns keyboard focus presentation");
assert.ok(/\.ui-range:disabled\s*\{[^}]*cursor:\s*default[^}]*opacity:\s*0\.48/.test(css), "CoreUI slider owns disabled presentation");

const directRanges = Array.from(main.matchAll(/\.type\s*=\s*"range"/g));
assert.strictEqual(directRanges.length, 1, "main.js has only one explicitly exempt direct range implementation");
assert.ok(/slider\.type = "range";[\s\S]{0,100}slider\.className = "registry-color-channel-slider"/.test(main), "the sole direct range is the specialized color-channel editor");
assert.ok(/trackMin[\s\S]*trackMax[\s\S]*range\.min = trackMin; range\.max = trackMax/.test(core), "editing track bounds remain distinct from accepted field bounds");

// Scrollbar skin is document-global so app-owned portals appended outside app-shell converge.
assert.ok(/(?:^|\n)\*\s*\{[^}]*scrollbar-color:[^}]*scrollbar-width:\s*thin/.test(css), "one document-global scrollbar contract covers app-owned dynamic mounts");
assert.ok(/\*::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gold-soft\)/.test(css), "the shared WebKit thumb uses the canonical presentation");
assert.ok(/menu\.className = "select-menu"[\s\S]*document\.body\.appendChild\(menu\)/.test(main), "custom Select menu is an app-owned body portal");
assert.ok(/\.select-menu-viewport\s*\{[^}]*overflow-y:\s*auto/.test(css), "custom Select viewport is the real scroll owner");
assert.ok(!/\.select-menu::-webkit-scrollbar/.test(css), "portaled Select does not duplicate the global skin");

// Reset is atomic: authority resets first, then resolved state is written into mounted controls.
assert.ok(/DesignTuning\.resetParameter\(parameter\.id\); refreshDesignTuningFields\(parameter\.domain\)/.test(main), "parameter reset refreshes from resolver authority");
assert.ok(/refreshDesignTuningFields[\s\S]*binding\.update\(evidence\.resolved\[id\]\)[\s\S]*binding\.state\.setAttribute/.test(main), "control value is synchronized before reset presentation state");
assert.ok(/createDesignTuningCurveField[\s\S]*\.update = function \(next\) \{ control\.setValue\(next\); \}/.test(main), "Bezier control exposes the reset synchronization seam");
assert.ok(/createDesignTuningDurationField[\s\S]*\.update = function \(next\) \{ control\.setValue\(next\); \}/.test(main), "RangeNumber control exposes the reset synchronization seam");
assert.ok(/createDesignTuningScalarField[\s\S]*\.update = function \(next\) \{ control\.setValue\(next\); \}/.test(main), "scalar, color-alpha, and shadow controls share the reset synchronization seam");
assert.ok(/function createShadowField[\s\S]*function setValue\(next\)[\s\S]*color\.setValue\(value\.color\)[\s\S]*setValue: setValue/.test(core), "generic ShadowField can project resolved reset state into every subcontrol");
assert.ok(/CoreAppearance\.reset\(parameter\.id\);[\s\S]*notifyAppearanceFieldBindings\(parameter\.id\)/.test(main), "Existing Authority mirrors reset through Appearance and notify their mounted bindings");

console.log("Settings control contract convergence tests passed.");
