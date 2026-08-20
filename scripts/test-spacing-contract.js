"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");

function declaration(source, name, valuePattern) {
    return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*" + valuePattern + "\\s*;").test(source);
}

function rule(source, selectorPattern, declarationPattern) {
    return new RegExp(selectorPattern + "\\s*\\{[^}]*" + declarationPattern, "m").test(source);
}

function finalDeclaration(source, selector, property) {
    var value = null;
    source.replace(/([^{}]+)\{([^{}]*)\}/g, function (_, selectors, declarations) {
        var matchesSelector = selectors.split(",").some(function (candidate) {
            return candidate.trim() === selector;
        });
        var match;
        if (matchesSelector) {
            match = declarations.match(new RegExp("(?:^|;)\\s*" + property + "\\s*:\\s*([^;]+)", "m"));
            if (match) value = match[1].trim();
        }
        return _;
    });
    return value;
}

[
    ["--space-surface-edge", "calc\\(18px \\* var\\(--ui-scale\\)\\)"],
    ["--space-card-inset", "calc\\(12px \\* var\\(--ui-scale\\)\\)"],
    ["--space-section-stack", "calc\\(12px \\* var\\(--ui-scale\\)\\)"],
    ["--space-section-header-content", "calc\\(11px \\* var\\(--ui-scale\\)\\)"],
    ["--space-field-copy", "calc\\(2px \\* var\\(--ui-scale\\)\\)"],
    ["--space-field-block", "calc\\(7px \\* var\\(--ui-scale\\)\\)"],
    ["--space-inline-control", "calc\\(8px \\* var\\(--ui-scale\\)\\)"]
].forEach(function (entry) {
    assert(declaration(css, entry[0], entry[1]), entry[0] + " public/component contract missing");
});

assert(!/--space-[123]\s*:/.test(css), "primitive spacing scale must remain absent");
assert(declaration(css, "--card-pad", "var\\(--space-card-inset\\)"));
assert(declaration(css, "--view-pad", "var\\(--space-surface-edge\\)"));
assert(declaration(css, "--tool-gap", "var\\(--space-home-tool-grid\\)"));
assert(declaration(css, "--view-inset", "calc\\(16px \\* var\\(--ui-scale\\)\\)"), "view inset must remain a layout constraint");
assert(!/--space-[^:;]*:\s*var\(--view-inset\)/.test(css), "semantic spacing must not alias the layout inset");

assert(rule(css, "\\.settings-renderer", "gap:\\s*var\\(--space-settings-section-stack\\)"));
assert(rule(css, "\\.settings-section-header", "margin-bottom:\\s*var\\(--space-settings-section-header-content\\)"));
assert(rule(css, "\\.settings-field-description", "margin-top:\\s*var\\(--space-settings-field-copy\\)"));
assert(rule(css, "\\.settings-field", "gap:\\s*var\\(--space-settings-field-control\\);[^}]*padding:\\s*var\\(--space-settings-field-block\\) 0"));
assert.strictEqual(finalDeclaration(css, ".settings-field", "gap"), "var(--space-settings-field-control)");
assert.strictEqual(finalDeclaration(css, ".settings-field", "padding"), "var(--space-settings-field-block) 0");
assert(!/\.settings-view\s*\{[^}]*--ui-scale:/.test(css), "Settings spacing consumes the live application UI Scale");

assert(rule(css, "\\.registry-tool-panel \\.dynamic-tool-intro", "margin-bottom:\\s*var\\(--space-registry-intro-content\\)"));
assert(rule(css, "\\.registry-params-card", "padding:\\s*var\\(--space-registry-card-inset\\)"));
assert(rule(css, "\\.registry-section-heading", "margin-bottom:\\s*var\\(--space-registry-section-header-content\\)"));
assert(rule(css, "\\.registry-label-column", "gap:\\s*var\\(--space-registry-field-copy\\)"));
assert.strictEqual(finalDeclaration(css, ".registry-label-column", "gap"), "var(--space-registry-field-copy)");
assert(/\.registry-field-row,[\s\S]*?gap:\s*var\(--space-registry-field-control\);[\s\S]*?min-height:\s*calc\(46px \* var\(--ui-scale\)\);[\s\S]*?padding:\s*var\(--space-registry-field-block\) 0;/.test(css));

assert(rule(css, "\\.palette-editor-field", "--ui-field-row-control-gap:\\s*var\\(--space-palette-field-control\\)"));
assert(rule(css, "\\.palette-editor-field", "padding-block:\\s*calc\\([^)]*var\\(--ui-scale\\)\\)"), "Palette FieldRow internal rhythm must remain a domain-local consumer");
assert(rule(css, "\\.ui-field-row--aligned", "gap:\\s*var\\(--ui-field-row-control-gap, var\\(--space-settings-field-control\\)\\)"));
assert(/\.palette-library-list\s*\{[^}]*gap:\s*calc\(8px \* var\(--ui-scale\)\)/.test(css), "Palette Library spacing must remain domain-local");
assert(/\.palette-editor-scroll\s*\{[^}]*gap:\s*calc\([^)]*var\(--ui-scale\)\)/.test(css), "Palette Editor stack spacing must remain domain-local");

assert(rule(css, "\\.tool-grid", "gap:\\s*var\\(--space-home-tool-grid\\)"));
assert(rule(css, "\\.app-card-title", "margin-top:\\s*var\\(--space-home-card-title\\)"));
assert(/@media[\s\S]*?\.tool-grid\s*\{[^}]*gap:\s*calc\(12px \* var\(--ui-scale\)\)/.test(css), "Home narrow gap remains a responsive override");
assert(/--tool-card-w:\s*calc\(92px \* var\(--ui-scale\)\);/.test(css));
assert(/--tool-card-min-h:\s*calc\(124px \* var\(--ui-scale\)\);/.test(css));

assert(!/var\(--tool-gap\)/.test(velaCss), "Vela must not consume the Home tool-grid compatibility alias");
assert(!/var\(--card-pad\)/.test(velaCss), "Vela controls must not consume the Card inset compatibility alias");
assert(declaration(velaCss, "--vela-controls-column-gap", "calc\\(16px \\* var\\(--ui-scale\\)\\)"));
assert(declaration(velaCss, "--vela-composer-padding-inline", "calc\\(12px \\* var\\(--ui-scale\\)\\)"));
assert(rule(velaCss, "\\.vela-bottom-controls", "column-gap:\\s*var\\(--vela-controls-column-gap\\)"));
assert.strictEqual(finalDeclaration(velaCss, ".vela-bottom-controls", "column-gap"), "var(--vela-controls-column-gap)");
assert(/\.vela-surface\[data-layout="compact"\]/.test(velaCss));
assert(/\.vela-surface\[data-layout="narrow"\]/.test(velaCss));

assert(!/padding:\s*var\(--space-card-inset\)/.test(velaCss.match(/\.vela-composer-input\s*\{[^}]*\}/)[0]), "composer padding must remain component-owned");

console.log("Spacing contract tests passed.");
