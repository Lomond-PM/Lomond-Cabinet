"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

function declaration(source, name, valuePattern) {
    return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*" + valuePattern + "\\s*;").test(source);
}

function rule(source, selectorPattern, declarationPattern) {
    return new RegExp(selectorPattern + "\\s*\\{[^}]*" + declarationPattern, "m").test(source);
}

[
    ["--radius-xl", "calc\\(30px \\* var\\(--ui-scale\\)\\)"],
    ["--radius-lg", "calc\\(22px \\* var\\(--ui-scale\\)\\)"],
    ["--radius-md", "calc\\(16px \\* var\\(--ui-scale\\)\\)"],
    ["--radius-sm", "calc\\(10px \\* var\\(--ui-scale\\)\\)"]
].forEach(function (entry) {
    assert(declaration(css, entry[0], entry[1]), entry[0] + " compatibility primitive missing");
});

assert(declaration(css, "--radius-section-card", "var\\(--radius-lg\\)"));
assert(declaration(css, "--radius-nested-surface", "var\\(--radius-md\\)"));
assert(declaration(css, "--radius-editable-control", "var\\(--radius-sm\\)"));
assert(declaration(css, "--radius-home-tile", "var\\(--radius-lg\\)"));
assert(declaration(css, "--radius-registry-option", "var\\(--radius-nested-surface\\)"));
assert(declaration(css, "--radius-palette-library-item", "var\\(--radius-nested-surface\\)"));
assert(declaration(css, "--radius-palette-json-section", "var\\(--radius-nested-surface\\)"));
assert(declaration(css, "--radius-pill", "999px"));
assert(!/--radius-(?:xs|2xl)\s*:/.test(css), "numeric radius ladder must not expand");

assert(rule(css, "\\.settings-section", "border-radius:\\s*var\\(--radius-section-card\\)"));
assert(rule(css, "\\.info-panel,\\s*\\n\\.panel-card", "border-radius:\\s*var\\(--radius-section-card\\)"));
assert(rule(css, "\\.registry-info-note", "border-radius:\\s*var\\(--radius-nested-surface\\)"));
assert(rule(css, "\\.ui-choice-surface,\\s*\\n\\.registry-option-card", "border-radius:\\s*var\\(--radius-registry-option\\)"));
assert(rule(css, "\\.ui-number-input,\\s*\\n\\.num-input", "border-radius:\\s*var\\(--radius-editable-control\\)"));
assert(rule(css, "\\.ui-text-input,[\\s\\S]*?\\.registry-color-hex", "border-radius:\\s*var\\(--radius-editable-control\\)"));

assert(rule(css, "\\.tool-app", "border-radius:\\s*var\\(--radius-home-tile\\)"));
assert(rule(css, "\\.tool-placeholder", "border-radius:\\s*var\\(--radius-home-tile\\)"));
assert(!/\.tool-app\s*\{[^}]*var\(--radius-section-card\)/.test(css), "Home tile must not consume ordinary section ownership");
assert(declaration(css, "--radius-home-icon", "25\\.5%"));
assert(declaration(css, "--home-tool-icon-radius", "var\\(--radius-home-icon\\)"));
assert(declaration(css, "--tool-icon-radius", "var\\(--home-tool-icon-radius\\)"));
assert(!/--(?:home-tool-icon-radius|tool-icon-radius)\s*:\s*var\(--radius-(?:home-tile|section-card|pill)\)/.test(css));

assert(rule(css, "\\.select-trigger", "border-radius:\\s*var\\(--radius-pill\\)"));
assert(!/\.select-trigger\s*\{[^}]*var\(--radius-editable-control\)/.test(css));
assert(rule(css, "\\.ui-switch-track,\\s*\\n\\.switch-track", "border-radius:\\s*var\\(--radius-pill\\)"));
assert(/border-radius:\s*50%;/.test(css), "circle geometry must remain percentage-based");
assert(!/--radius-circle\s*:/.test(css), "circle must not enter the radius token hierarchy");

assert(declaration(css, "--radius-palette-preview", "var\\(--radius-lg\\)"));
assert(rule(css, "\\.palette-preview-shell", "border-radius:\\s*var\\(--radius-palette-preview\\)"));
assert(rule(css, "\\.palette-preview-canvas", "border-radius:\\s*0"));
assert(rule(css, "\\.palette-library-item", "border-radius:\\s*var\\(--radius-palette-library-item\\)"));
assert(rule(css, "\\.palette-json-section", "border-radius:\\s*var\\(--radius-palette-json-section\\)"));
assert(rule(css, "\\.ui-scroll-frame", "border-radius:\\s*var\\(--radius-editable-control\\)"), "shared editable frame owns control radius");
assert(rule(css, "\\.ui-scroll-frame > \\.ui-editable-scroll", "border-radius:\\s*0"), "Palette JSON inner scroll owner must not duplicate frame radius");

assert(/\.settings-view\s*\{[^}]*--ui-scale:\s*0\.92;/.test(css));
assert(rule(css, "\\.view-detail", "border-radius:\\s*22px"));
assert(rule(css, "\\.select-menu", "border-radius:\\s*14px"));
assert(/snapshotSurfaceIdentity[\s\S]*SurfaceIdentity\.snapshot/.test(main), "morph endpoints consume real computed identity radius");
assert(!/borderRadius:\s*"(?:19|22|24)px"/.test(main), "transition code must not duplicate protected identity radii");

assert(!/--radius-(?:section-card|nested-surface|editable-control|home-tile|registry-option|palette-library-item|palette-json-section|pill)/.test(velaCss), "Vela must remain radius-domain isolated");
assert(/\.vela-surface\s*\{[^}]*border-radius:\s*var\(--radius-md\)/.test(velaCss));
assert(/\.vela-composer-frame\s*\{[^}]*border-radius:\s*var\(--radius-sm\)/.test(velaCss), "Vela composer frame owns editable radius");
assert(/\.vela-composer-input\s*\{[^}]*border-radius:\s*0/.test(velaCss), "Vela composer inner scroll owner does not duplicate frame radius");

console.log("Radius contract tests passed.");
