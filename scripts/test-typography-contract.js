"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
var paletteSource = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");
var appearanceRegistrySource = fs.readFileSync(path.join(root, "client/js/appearance/appearanceParameterRegistry.js"), "utf8");
var appearanceResolverSource = fs.readFileSync(path.join(root, "client/js/appearance/appearanceResolver.js"), "utf8");
var mainSource = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

function declaration(name, valuePattern) {
    return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*" + valuePattern + "\\s*;").test(css);
}

function rule(selectorPattern, declarationPattern, source) {
    return new RegExp(selectorPattern + "\\s*\\{[^}]*" + declarationPattern, "m").test(source || css);
}

assert(declaration("--font-ui", '"Segoe UI", Arial, sans-serif'));
assert(declaration("--font-mono", '"Consolas", "Courier New", monospace'));
assert(rule("html,\\s*\\nbody", "font-family:\\s*var\\(--font-ui\\)"));
assert(/\.ui-textarea\.palette-json-box,\s*\n\.registry-textarea\.palette-json-box\s*\{[^}]*font-family:\s*var\(--font-mono\);[^}]*font-size:\s*var\(--type-code-size\);[^}]*font-weight:\s*var\(--type-code-weight\);[^}]*line-height:\s*var\(--type-code-line-height\);/.test(css));
assert(/CoreUI\.createTextarea[\s\S]{0,240}classNames:\s*"registry-textarea palette-json-box palette-json-(?:export|import)"/.test(paletteSource), "Palette JSON must compose the Core textarea with its code specialization class");

var genericTextareaTypography = css.indexOf(".ui-text-input,\n.ui-textarea,");
var paletteCodeTypography = css.indexOf(".ui-textarea.palette-json-box,");
assert(genericTextareaTypography >= 0 && paletteCodeTypography > genericTextareaTypography, "generic textarea typography must precede Palette code specialization");
css.replace(/([^{}]+)\{([^{}]*)\}/g, function (_, selectors, declarations, offset) {
    if (offset > paletteCodeTypography && /\.(?:ui|registry)-textarea(?:[\s,:.{]|$)/.test(selectors) && /font-(?:family|size|weight)|line-height|font\s*:/.test(declarations)) {
        assert.fail("later textarea typography conflicts with Palette code specialization: " + selectors.trim());
    }
    return _;
});

[
    "page-title",
    "surface-title",
    "section-title",
    "body",
    "control",
    "supporting",
    "eyebrow",
    "code"
].forEach(function (role) {
    assert(declaration("--type-" + role + "-size", "[^;]+"), role + " size token missing");
    assert(declaration("--type-" + role + "-weight", "[^;]+"), role + " weight token missing");
    assert(declaration("--type-" + role + "-line-height", "[^;]+"), role + " line-height token missing");
});

assert(declaration("--font-h1", "var\\(--type-page-title-size\\)"));
assert(declaration("--font-h2", "var\\(--type-surface-title-size\\)"));
assert(declaration("--font-h3", "var\\(--type-section-title-size\\)"));
assert(declaration("--font-body", "var\\(--type-body-size\\)"));
assert(declaration("--font-small", "var\\(--type-supporting-size\\)"));
assert(declaration("--type-field-label-size", "var\\(--type-body-size\\)"));
assert(declaration("--type-supporting-size", "calc\\(10\\.5px \\* var\\(--ui-scale\\)\\)"));
assert(declaration("--type-section-title-size", "calc\\(14px \\* var\\(--ui-scale\\)\\)"));
assert(declaration("--type-section-title-weight", "700"));
assert(declaration("--type-field-label-weight", "650"));
assert(declaration("--type-settings-field-label-weight", "800"));
assert(declaration("--type-registry-field-weight", "600"));
assert(declaration("--type-registry-supporting-weight", "400"));

assert(rule("h1", "font-size:\\s*var\\(--type-page-title-size\\)"));
assert(rule("h2", "font-weight:\\s*var\\(--type-surface-title-weight\\)"));
assert(rule("h3", "line-height:\\s*var\\(--type-section-title-line-height\\)"));
assert(rule("p", "line-height:\\s*var\\(--type-body-line-height\\)"));
assert(rule("\\.overline", "font-size:\\s*var\\(--type-eyebrow-size\\)"));

assert(/\.ui-text-input,[\s\S]*?\.ui-button\s*\{[^}]*font-size:\s*var\(--type-control-size\)/.test(css));
assert(rule("\\.ui-field-label", "font-weight:\\s*var\\(--type-field-label-weight\\)"));
assert(rule("\\.ui-field-label", "color:\\s*var\\(--text-primary\\)"));
assert(rule("\\.ui-field-description", "font-size:\\s*var\\(--type-supporting-size\\)"));
assert(rule("\\.ui-field-description", "color:\\s*var\\(--text-tertiary\\)"));
assert(rule("\\.settings-field-label", "font-weight:\\s*var\\(--type-settings-field-label-weight\\)"));
assert(rule("\\.settings-field-label", "color:\\s*var\\(--text-primary\\)"));
assert(rule("\\.registry-title-primary", "line-height:\\s*1\\.05"));
assert(rule("\\.registry-text-body", "font-weight:\\s*var\\(--type-registry-field-weight\\)"));
assert(rule("\\.registry-text-muted", "font-size:\\s*var\\(--type-registry-supporting-size\\)"));
assert(rule("\\.registry-text-muted", "color:\\s*var\\(--text-tertiary\\)"));
assert(/\.registry-label-column \.control-label\s*\{[^}]*color:\s*var\(--text-primary\);[^}]*font-size:\s*var\(--type-field-label-size\);[^}]*font-weight:\s*var\(--type-registry-field-weight\);[^}]*line-height:\s*var\(--type-registry-field-line-height\);/.test(css));
assert(/label\.className\s*=\s*"control-label registry-text-body"/.test(mainSource), "test must cover the real Registry Field Label class composition");

var registryBodyRule = css.indexOf(".registry-text-body {");
var registryFieldToneRule = css.indexOf(".registry-label-column .control-label {");
var registryFieldToneRuleEnd = css.indexOf("}", registryFieldToneRule) + 1;
assert(registryBodyRule >= 0 && registryFieldToneRule > registryBodyRule, "Field Label semantic tone must follow the Registry body compatibility rule");
assert(!/(?:\.control-label|\.registry-text-body)[^{]*\{[^}]*color:\s*var\(--text-secondary\)/.test(css.slice(registryFieldToneRuleEnd)), "no later matching label/body rule may restore secondary tone");

assert(/id:\s*"text\.primary"[\s\S]*?classification:\s*"EXPOSE_NOW"[\s\S]*?persistence:\s*"appearance"[\s\S]*?userAdjustable:\s*true[\s\S]*?resolverTarget:\s*"text\.primary"/.test(appearanceRegistrySource));
assert(!/id:\s*"text\.(?:secondary|tertiary)"/.test(appearanceRegistrySource), "secondary and tertiary text must remain future candidates, not Appearance parameters");
assert(/"text\.primary"[\s\S]*?"--text-primary"/.test(appearanceResolverSource), "Field Labels must remain downstream of the existing text.primary resolver output");

assert(declaration("--type-home-card-title-size", "calc\\(13px \\* var\\(--ui-scale\\)\\)"));
assert(rule("\\.app-card-title", "font-size:\\s*var\\(--type-home-card-title-size\\)"));
assert(/\.tool-bootstrap-status\s*\{[^}]*font-size:\s*12px;/.test(css));
assert(/\.info-glyph\s*\{[^}]*font-size:\s*calc\(34px \* var\(--ui-scale\)\)/.test(css));

assert(rule("\\.vela-transcript-message", "line-height:\\s*1\\.5", velaCss));
assert(rule("\\.vela-experimental-status", "font-size:\\s*calc\\(10px \\* var\\(--ui-scale\\)\\)", velaCss));
assert(rule("\\.vela-surface-action", "line-height:\\s*1", velaCss));

assert(/\.ui-number-input,[\s\S]*?font-variant-numeric:\s*tabular-nums;/.test(css));
assert(rule("\\.ui-color-hex,\\s*\\n\\.registry-color-hex", "font-variant-numeric:\\s*tabular-nums"));
assert(/\.settings-view\s*\{[^}]*--ui-scale:\s*0\.92;/.test(css));

console.log("Typography contract tests passed.");
