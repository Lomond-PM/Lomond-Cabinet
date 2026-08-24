"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var procedural = fs.readFileSync(path.join(root, "client/js/proceduralAppearance.js"), "utf8");
var paletteWorkspace = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");
var registryControlLab = fs.readFileSync(path.join(root, "host/tools/registryControlLab.tool.jsx"), "utf8");

function declaration(source, name, valuePattern) {
    return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*" + valuePattern + "\\s*;").test(source);
}

function block(source, selectorPattern) {
    var match = source.match(new RegExp(selectorPattern + "\\s*\\{([^}]*)\\}", "m"));
    return match ? match[1] : "";
}

function hasShadow(source, selectorPattern, valuePattern) {
    return new RegExp(selectorPattern + "\\s*\\{[^}]*box-shadow:\\s*" + valuePattern + "\\s*;", "m").test(source);
}

assert(declaration(css, "--elevation-surface-shell", "0 18px 48px rgba\\(0, 0, 0, 0\\.38\\)"));
assert(declaration(css, "--elevation-information-surface", "0 12px 30px rgba\\(0, 0, 0, 0\\.28\\)"));
assert(declaration(css, "--elevation-primary-action", "0 4px 10px rgba\\(0, 0, 0, 0\\.18\\)"));
assert(declaration(css, "--elevation-utility-action", "0 8px 28px rgba\\(48, 196, 255, 0\\.46\\)"));
assert(declaration(css, "--elevation-floating-surface", "0 10px 48px rgba\\(72, 146, 214, 0\\.51\\)"));
assert(declaration(css, "--elevation-floating-picker", "0 10px 48px rgba\\(72, 146, 214, 0\\.51\\)"));
assert(declaration(css, "--elevation-action-container", "0 8px 30px rgba\\(113, 224, 255, 0\\.32\\)"));
assert(declaration(css, "--elevation-registry-preview-prominence", "0 calc\\(12px \\* var\\(--ui-scale\\)\\) calc\\(24px \\* var\\(--ui-scale\\)\\) rgba\\(0, 0, 0, 0\\.24\\)"));
assert(declaration(css, "--action-neutral-surface", "rgba\\(60, 82, 105, 1\\)"), "neutral action retains its canonical surface without borrowing container ownership");
assert(!/--elevation-[0-9]+\s*:|--shadow-(?:sm|md|lg)\s*:/.test(css), "numeric elevation ladder must remain absent");

assert(hasShadow(css, "\\.view-detail", "var\\(--elevation-surface-shell\\)"));
assert(hasShadow(css, "\\.info-panel", "var\\(--elevation-information-surface\\)"));
assert(hasShadow(css, "\\.ui-button--primary", "var\\(--elevation-primary-action\\)"));
assert(hasShadow(css, "\\.ui-button--navigation,[\\s\\S]*?\\.utility-action", "var\\(--elevation-utility-action\\)"));
assert(hasShadow(css, "\\.secondary-action,[\\s\\S]*?\\.registry-secondary-action", "none"));
assert(hasShadow(css, "\\.ui-button--danger", "none"));
assert(hasShadow(css, "\\.primary-action:disabled,[\\s\\S]*?\\.ui-button--danger:disabled", "none"));
assert(/\.primary-action:disabled,[\s\S]*?\.secondary-action:disabled,[\s\S]*?\.registry-secondary-action:disabled,[\s\S]*?\.panel-local-action:disabled,[\s\S]*?\.ui-button--primary:disabled,[\s\S]*?\.ui-button--neutral:disabled,[\s\S]*?\.ui-button--navigation:disabled,[\s\S]*?\.ui-button--danger:disabled\s*\{[^}]*box-shadow:\s*none;/.test(css), "all Action Button disabled variants must resolve to no resting elevation");
assert(hasShadow(css, "\\.select-menu", "var\\(--elevation-floating-surface\\)"));
assert(hasShadow(css, "\\.settings-view\\.is-peek-preview \\.settings-root-page \\.is-settings-peek-anchor", "var\\(--elevation-floating-surface\\)"));
assert(hasShadow(css, "\\.registry-color-picker-popover", "var\\(--elevation-floating-picker\\)"));
assert(hasShadow(css, "\\.action-sheet", "var\\(--elevation-action-container\\)"));
assert(hasShadow(css, "\\.registry-procedural-preview", "var\\(--elevation-registry-preview-prominence\\)"));

assert(/\.settings-view\.is-peek-preview \.settings-panel\s*\{[^}]*overflow:\s*visible;/.test(css), "Peek panel must expose the retained card shadow");
assert(/\.settings-view\.is-peek-preview \.settings-content\s*\{[^}]*overflow:\s*visible;/.test(css), "Peek content must not clip the retained card shadow");
assert(/\.settings-content\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/.test(css), "normal Settings must retain scroll and clipping ownership");
assert(/\.settings-section\s*\{[^}]*overflow:\s*hidden;/.test(css), "Settings sections must retain rounded-surface clipping");
assert(/\.collapsible-card\s*\{[^}]*overflow:\s*hidden;/.test(css), "collapsible cards must retain their clipping boundary");
assert(/\.collapsible-body\s*\{[^}]*overflow:\s*hidden;/.test(css), "collapsible bodies must retain collapse-animation clipping");
assert(!/\.settings-source-summary\s*\{[^}]*(?:padding-bottom|margin-bottom):\s*28px;/.test(css), "source summary must not compensate for legacy shadow geometry");
assert(!/\.background-procedural-controls\s*\{[^}]*(?:padding-bottom|margin-bottom):/.test(css), "procedural controls must not compensate for legacy shadow geometry");
assert(/\.palette-editor-action-bar\s*\{[^}]*background:\s*var\(--surface-panel\);/.test(css), "Palette footer must follow its panel surface");
assert(/\.ui-button--neutral\s*\{[^}]*background:\s*var\(--action-neutral-surface\);/.test(css), "Palette neutral actions must inherit canonical semantic identity");
assert(/\.ui-button--primary\s*\{[^}]*background:\s*var\(--action-primary-surface\);/.test(css), "Palette primary actions must inherit the canonical Primary contract");
assert(/\.ui-button--danger\s*\{[^}]*background:\s*var\(--danger-surface\);/.test(css), "Palette danger actions must inherit the canonical Danger contract");
assert(!/\.palette-editor-action-bar \.palette-library-action[^}]*background:/.test(css), "Palette footer must not redefine canonical action surfaces");

assert(/\.panel-local-action:not\(\.is-primary\):not\(\.is-danger\)\s*\{[^}]*background:\s*var\(--action-neutral-surface\);[^}]*box-shadow:\s*none;/.test(css), "panel-local neutral actions must use surface plus border without resting elevation");
assert(/panel-button registry-large-button panel-local-action[\s\S]*palette-library-open/.test(paletteWorkspace), "Palette Library single launcher consumes canonical Neutral plus the panel-local composition contract");
assert((main.match(/panel-local-action/g) || []).length >= 5, "Classic, Procedural, source-summary, and Settings-local actions must share the panel-local action contract");
assert(/id: "velaExperimentalEnable", variant: "neutral", classNames: "panel-button panel-local-action"/.test(main), "Vela Settings enable must consume canonical Neutral plus the panel-local contract");
assert(/id: "velaExperimentalDisable", variant: "neutral", classNames: "panel-button panel-local-action"/.test(main), "Vela Settings disable must consume canonical Neutral plus the panel-local contract");
assert(/variant: "neutral", size: "compact", classNames: "panel-button appearance-reset-button panel-local-action"/.test(main), "Appearance Reset must consume the compact Settings panel-local action contract");
assert(/panel-button registry-large-button panel-local-action/.test(paletteWorkspace), "Palette actions must expose the shared panel-local composition seam");
assert(/variant: className && className\.indexOf\("is-primary"\) >= 0 \? "primary"/.test(paletteWorkspace), "Palette primary actions must retain explicit CoreUI primary metadata");
assert(!/back-button[^\n]*panel-local-action|panel-local-action[^\n]*back-button/.test(main), "Settings and Detail navigation must remain outside panel-local action ownership");
assert(/variant: "neutral", classNames: "panel-button secondary-action"/.test(main), "Registry global secondary actions must map to canonical Neutral while retaining their composition seam");
assert(/field\.variant === "primary" \? "primary" : \(field\.variant === "danger" \? "danger" : "neutral"\)/.test(main), "Registry schema actions must map Primary, Danger, and Secondary variants through CoreUI");
assert(/element\.disabled = schemaStateDisabled\(item, toolDef\);[\s\S]*?element\.classList\.toggle\("is-state-disabled", element\.disabled\);/.test(main), "Registry state conditions must map to both HTML disabled and the semantic state class");
assert(/elements\[i\]\.disabled = disabled;[\s\S]*?elements\[i\]\.classList\.toggle\("is-state-disabled", disabled\);/.test(main), "Registry state refresh must preserve both disabled representations");
assert(/key:\s*"stateDisabledButton"[\s\S]*?variant:\s*"secondary"[\s\S]*?enabledWhen:\s*\{[\s\S]*?stateKey:\s*"hasComp"/.test(registryControlLab), "Control Lab state-gated horizontal action is a Secondary action, not a Primary action");
assert(!/\.vela-settings-button\s*\{[^}]*box-shadow:/.test(velaCss), "Vela Settings must inherit Utility Action elevation");
assert(!/\.vela-surface-action\s*\{[^}]*box-shadow:/.test(velaCss), "Vela dynamic actions must inherit Utility Action elevation");

var mixed = block(css, "\\.panel-button:not\\(\\.utility-action\\):not\\(\\.ui-button\\),\\s*\\.tool-icon,\\s*\\.action-sheet");
assert(mixed && !/box-shadow:/.test(mixed), "legacy mixed selector must not own elevation");
assert(!hasShadow(css, "\\.panel-button:not\\(\\.utility-action\\):not\\(\\.ui-button\\)", "0 12px 30px rgba\\(0, 0, 0, 0\\.28\\)"), "legacy panel-button shadow must not bypass Action elevation ownership");
assert(hasShadow(css, "\\.ui-button--neutral", "none"));
assert(!/\.panel-button\s*\{[^}]*box-shadow:\s*none;/.test(css), "global panel buttons must not be flattened");
assert(!/\.(?:secondary-action|registry-secondary-action)\s*\{[^}]*0 12px 30px rgba\(0, 0, 0, 0\.28\)/.test(css), "Registry secondary actions must not consume the legacy raised-button shadow");
assert(!/\.(?:primary-action|secondary-action|registry-secondary-action)\s*\{[^}]*z-index:/.test(css), "action hierarchy must rely on normal sibling paint order without a resting z-index seam");
assert(!/\.registry-button-row(?:::(?:before|after))?\s*\{[^}]*box-shadow:/.test(css), "Registry action row and its pseudo-elements must not own the observed dark edge");
assert(!/!important/.test(block(css, "\\.primary-action:disabled,[\\s\\S]*?\\.ui-button--danger:disabled")), "disabled Action elevation must not require !important");
assert(!/button:disabled\s*\{[^}]*box-shadow:/.test(css), "disabled Action elevation must not use a global button selector");
assert(!/\.panel-local-action:not\(\.is-primary\):not\(\.is-danger\)\s*\{[^}]*var\(--elevation-primary-action\)/.test(css), "neutral panel-local actions must not consume primary elevation");
assert(!/\.(?:ui-color-swatch|registry-color-swatch|ui-choice-surface|registry-option-card|switch-track)[^{]*\{[^}]*var\(--elevation-primary-action\)/.test(css), "accent and selected non-action controls must not consume primary elevation");
assert(!/--elevation-primary-action:\s*0 12px 30px rgba\(0, 0, 0, 0\.28\)/.test(css), "primary elevation must not reuse the legacy raised-button shadow");
assert(!/--elevation-utility-action:\s*var\(--elevation-(?:primary-action|action-container)\)/.test(css), "Utility elevation must not alias Primary or Action Container");
assert(hasShadow(css, "\\.tool-icon", "0 12px 30px rgba\\(0, 0, 0, 0\\.28\\)"), "Home tool identity retains its protected optical shadow");
assert(hasShadow(css, "\\.status-pill", "none"), "status pill is an intentional flat status component");
assert(!/\.selection-chip/.test(css), "removed redundant selection capsule has no stale elevation selector");

assert(hasShadow(css, "\\.panel-card", "none"));
assert(hasShadow(css, "\\.control-card", "none"));
assert(!/\.settings-section\s*\{[^}]*box-shadow:/.test(css));
assert(!/\.ui-choice-surface,[\s\S]*?\.registry-option-card\s*\{[^}]*box-shadow:/.test(css));
assert(!/\.ui-text-input,[\s\S]*?\.registry-color-hex\s*\{[^}]*box-shadow:/.test(css));
assert(!/\.select-trigger\s*\{[^}]*box-shadow:/.test(css));

assert(!/\.tool-app\s*\{[^}]*box-shadow:/.test(css));
assert(hasShadow(css, "\\.tool-icon\\.procedural-icon-ready", "none"));
assert(declaration(css, "--home-drag-shadow-primary", "rgba\\(0, 0, 0, 0\\.48\\)"));
assert(declaration(css, "--home-drag-shadow-secondary", "rgba\\(0, 0, 0, 0\\.32\\)"));
assert(/\.view-home\.home-editing \.tool-app\.is-dragging \.tool-icon\s*\{[^}]*var\(--home-drag-shadow-primary\)[^}]*var\(--home-drag-shadow-secondary\)/.test(css));

assert(hasShadow(css, "button:focus-visible,[\\s\\S]*?\\[role=\"button\"\\]:focus-visible", "0 0 0 1px var\\(--interaction-focus-ring\\)"));
assert(declaration(css, "--slider-thumb-optical-shadow", "0 4px 16px rgba\\(92, 191, 255, 0\\.79\\)"));
assert(declaration(css, "--switch-thumb-optical-shadow", "0 4px 16px rgba\\(92, 191, 255, 0\\.79\\)"));
assert(hasShadow(css, "\\.ui-range::-webkit-slider-thumb,[\\s\\S]*?\\.pill-slider::-webkit-slider-thumb", "var\\(--slider-thumb-optical-shadow\\)"));
assert(hasShadow(css, "\\.ui-switch-track::after,[\\s\\S]*?\\.switch-track::after", "var\\(--switch-thumb-optical-shadow\\)"));
assert(hasShadow(css, "\\.ui-color-swatch,[\\s\\S]*?\\.registry-color-swatch", "inset 0 0 0 1px rgba\\(0, 0, 0, 0\\.3\\)"));

assert(/\.app-shell\.is-animating \.panel-card,[\s\S]*?\.app-shell\.is-animating \.action-sheet\s*\{[^}]*box-shadow:\s*none;/.test(css));
assert(/SurfaceIdentity\.frame\(sourceIdentity\)[\s\S]*SurfaceIdentity\.frame\(destinationIdentity\)/.test(main), "transition elevation and bounded presentation converge through identity snapshots");

assert(!/--elevation-/.test(velaCss), "Vela must inherit shared Utility elevation without a local elevation authority");
assert(/palette\.colors\.shadow/.test(procedural));
assert(!/elevation/.test(procedural), "procedural palette lighting must not consume UI elevation");

console.log("Elevation contract tests passed.");
