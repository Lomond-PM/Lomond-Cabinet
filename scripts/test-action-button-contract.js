"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
var coreUi = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var palette = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");
var index = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
var controlLab = fs.readFileSync(path.join(root, "host/tools/registryControlLab.tool.jsx"), "utf8");

function block(selectorPattern) {
    var match = css.match(new RegExp(selectorPattern + "\\s*\\{([^}]*)\\}", "m"));
    return match ? match[1] : "";
}

function has(source, pattern, message) {
    assert(pattern.test(source), message);
}

has(coreUi, /if \(options\.variant\) addClasses\(button, "ui-button--" \+ options\.variant\);/, "CoreUI must map variant metadata to semantic classes");

var primary = block("\\.ui-button--primary");
has(css, /\.panel-button:not\(\.utility-action\):not\(\.ui-button\),/, "Legacy panel-button surface must exclude Shared Button variants");
has(css, /\.ui-button--primary\s*\{[^}]*background:\s*var\(--action-primary-surface\)/, "Primary enabled resting surface must come from the shared semantic authority");
var neutral = block("\\.ui-button--neutral");
var danger = block("\\.ui-button--danger");
has(primary, /background:\s*var\(--action-primary-surface\)/, "Primary surface ownership missing");
has(primary, /color:\s*var\(--action-primary-foreground\)/, "Primary foreground ownership missing");
has(primary, /border:\s*1px solid var\(--panel-border\)/, "Primary border ownership missing");
has(primary, /box-shadow:\s*var\(--elevation-primary-action\)/, "Primary elevation ownership missing");
has(css, /\.ui-button--primary:not\(:disabled\):hover\s*\{[^}]*background-color:\s*var\(--action-primary-hover-surface\)/, "Primary hover surface contract missing");

has(neutral, /background:\s*var\(--action-neutral-surface\)/, "Neutral surface ownership missing");
has(neutral, /color:\s*var\(--text-primary\)/, "Neutral foreground ownership missing");
has(neutral, /border:\s*1px solid var\(--panel-border\)/, "Neutral border ownership missing");
has(neutral, /box-shadow:\s*none/, "Neutral must have no resting elevation");
assert(!/#12110e|#0b0a08/.test(neutral), "Canonical Neutral must not use a hard-coded dark surface");

has(danger, /background:\s*var\(--danger-surface\)/, "Danger surface ownership missing");
has(danger, /color:\s*var\(--danger\)/, "Danger foreground ownership missing");
has(danger, /border:\s*1px solid var\(--danger-border\)/, "Danger border ownership missing");
has(danger, /box-shadow:\s*none/, "Danger must have no resting elevation");
has(css, /--danger-surface:\s*rgba\(255, 107, 95, 0\.22\)/, "Danger Action Design Default must provide visible resting surface separation");
has(css, /--action-danger-hover-surface:\s*rgba\(255, 107, 95, 0\.30\)/, "Danger hover Design Default must remain stronger than resting");
has(css, /\.ui-button--danger:not\(:disabled\):hover\s*\{[^}]*border-color:[^}]*background:\s*var\(--action-danger-hover-surface\)/, "Danger hover must consume the action semantic surface");
assert((css.match(/var\(--danger-surface\)/g) || []).length === 1, "General Danger surface must remain Action-only unless ownership is split deliberately");

has(css, /\.primary-action:disabled,[\s\S]*?\.ui-button--danger:disabled\s*\{[^}]*box-shadow:\s*none;/, "Disabled Action elevation contract missing");
has(css, /\.ui-button:disabled,[\s\S]*?opacity:\s*0\.48;[\s\S]*?cursor:\s*default;/, "CoreUI disabled opacity/cursor contract changed");
assert(!/button:disabled\s*\{[^}]*box-shadow:/.test(css), "Action disabled elevation must not leak to all button elements");

has(css, /\.ui-button:not\(:disabled\):hover,[\s\S]*?transform:\s*translateY\(-1px\) scale\(1\.01\)/, "Button hover interaction changed");
has(css, /\.ui-button:not\(:disabled\):active,[\s\S]*?\.panel-button:active,[\s\S]*?\.primary-action:active\s*\{[^}]*transform:\s*scale\(0\.96\)/, "Shared Action press must scale around the geometric center");
assert(!/\.ui-button:not\(:disabled\):active,[\s\S]*?\.primary-action:active\s*\{[^}]*translateY\([^)]+\)/.test(css), "Canonical Action press must not retain directional translation");
has(css, /\.ui-button:not\(:disabled\):active,[\s\S]*?transition-duration:\s*var\(--motion-action-press-duration\)/, "Button press duration ownership changed");
has(css, /\.ui-button:not\(:disabled\):active,[\s\S]*?transition-timing-function:\s*var\(--ease-press\)/, "Button press easing changed");
has(css, /button:focus-visible,[\s\S]*?box-shadow:\s*0 0 0 1px var\(--interaction-focus-ring\)/, "Focus ring contract changed");

has(main, /field\.variant === "primary" \? "primary" : \(field\.variant === "danger" \? "danger" : "neutral"\)/, "Registry schema variants must map Primary, Danger, and Secondary through CoreUI");
has(main, /variant: "neutral", classNames: "panel-button secondary-action"/, "Registry Secondary must map to canonical Neutral");
has(main, /variant: action\.style === "secondary" \? "neutral" : "primary"/, "Registry global actions must map Secondary to Neutral and Primary to Primary");
has(main, /ui-button--neutral panel-button settings-source-summary-action panel-local-action/, "Settings panel-local actions must consume canonical Neutral");
has(main, /createButton\(\{ document: document, id: "velaExperimentalEnable", variant: "neutral", classNames: "panel-button panel-local-action"/, "Vela-owned Settings actions must consume canonical CoreUI Neutral");
has(palette, /variant: className && className\.indexOf\("is-primary"\) >= 0 \? "primary" : \(className && className\.indexOf\("is-danger"\) >= 0 \? "danger" : "neutral"\)/, "Palette actions must map through CoreUI variants");
has(css, /\.palette-editor-action-bar\s*\{[^}]*background:\s*var\(--surface-panel\)/, "Palette footer surface ownership changed");
assert(!/\.palette-editor-action-bar \.palette-library-action[^}]*background:/.test(css), "Palette domain must not redefine canonical action surfaces");

has(controlLab, /composition:\s*"actionStack"[\s\S]*?key:\s*"secondaryButton"[\s\S]*?variant:\s*"secondary"[\s\S]*?key:\s*"primaryButton"[\s\S]*?variant:\s*"primary"[\s\S]*?key:\s*"dangerButton"[\s\S]*?variant:\s*"danger"/, "Control Lab must expose real Secondary, Primary, and Danger specimens through Registry metadata");
has(main, /section\.composition === "actionStack" \? " registry-section-body--action-stack"/, "Registry action-stack metadata must map to a generic composition owner");
has(css, /--space-registry-action-stack:\s*var\(--space-registry-field-control\)/, "Action-stack spacing alias must preserve the accepted computed source");
has(css, /\.registry-section-body--action-stack\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*var\(--space-registry-action-stack\)/, "Action stack must own semantic vertical spacing");
has(css, /\.registry-section-body--action-stack > \.registry-button-row\s*\{[^}]*padding:\s*0;/, "Action-stack rows must not accumulate per-row spacing");
assert(!/registry-danger-action\s*\{[^}]*(?:margin|gap|padding|width|height|background|border|color):/.test(css), "Danger Registry hook must not own geometry, spacing, or color");
assert(!/(?:dangerButton|registry-danger-action)[\s\S]{0,160}(?:#[0-9a-f]{3,8}|rgba?\()/i.test(controlLab), "Control Lab Danger specimen must not contain a local color hack");

assert(!/\.vela-settings-button\s*\{[^}]*box-shadow:/.test(velaCss), "Vela Settings must not suppress shared Utility elevation");
assert(!/\.vela-surface-action\s*\{[^}]*box-shadow:/.test(velaCss), "Vela dynamic actions must not suppress shared Utility elevation");
assert(!/ui-button--(?:primary|neutral|danger)/.test(velaCss), "Vela Surface must remain a domain composition boundary");

has(css, /\.ui-button--navigation,[\s\S]*?\.utility-action\s*\{[^}]*box-shadow:\s*var\(--elevation-utility-action\)/, "Utility Action elevation authority missing");
assert(!/back-button[^\n]*ui-button--neutral|ui-button--neutral[^\n]*back-button/.test(index + "\n" + main), "Navigation must not be normalized as Neutral in this Foundation");
assert(!/tool-app[^\n]*ui-button--(?:primary|neutral|danger)/.test(index + "\n" + main), "Home tool tiles must remain outside canonical Action variants");

[primary, neutral, danger].forEach(function (contract) {
    assert(!/font-size|font-weight|line-height|border-radius|transition|animation|duration|easing/.test(contract), "Semantic variants must not own typography, shape, or motion");
});
assert(!/\.panel-button\s*\{[^}]*box-shadow:\s*none;/.test(css), "Foundation must not globally flatten panel-button compatibility consumers");

console.log("Action Button contract tests passed.");
