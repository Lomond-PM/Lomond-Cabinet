"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8").replace(/\r\n/g, "\n");
var velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8").replace(/\r\n/g, "\n");
var coreSource = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
var mainSource = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
var AppearanceRegistry = require(path.join(root, "client/js/appearance/appearanceParameterRegistry.js")).AppearanceParameterRegistry;

function element(tagName) {
    var node = {
        tagName: tagName,
        className: "",
        children: [],
        attributes: {},
        appendChild: function (child) { this.children.push(child); return child; },
        setAttribute: function (name, value) { this.attributes[name] = String(value); }
    };
    node.classList = {
        add: function (name) { node.className += (node.className ? " " : "") + name; }
    };
    return node;
}

function rule(selectorPattern, declarationsPattern, source) {
    return new RegExp(selectorPattern + "\\s*\\{[^}]*" + declarationsPattern, "m").test(source || css);
}

function ruleBody(selector, source) {
    var match = (source || css).match(new RegExp(selector + "\\s*\\{([^}]*)\\}", "m"));
    return match ? match[1] : "";
}

var fakeDocument = { createElement: element };
var fakeControl = element("input");
var built = CoreUI.createFieldRow({
    document: fakeDocument,
    labelText: "A deliberately long Field Label",
    descriptionText: "Supporting copy that is semantically allowed to wrap across lines.",
    control: fakeControl,
    contentGrowth: true
});

assert(/\bui-field-row\b/.test(built.row.className));
assert(/\bis-content-growth\b/.test(built.row.className), "CoreUI must project the explicit growth composition modifier");
assert.strictEqual(built.row.children[0], built.copy);
assert.strictEqual(built.row.children[1], fakeControl);
assert.strictEqual(built.copy.children[0], built.label);
assert.strictEqual(built.copy.children[1], built.description);

assert(!/(?:^|;)\s*height\s*:/.test(ruleBody("\\.settings-field", css)), "Settings Field must remain content-driven through min-height");
assert(rule("\\.settings-field", "min-height:\\s*calc\\(38px \\* var\\(--ui-scale\\)\\)[^}]*align-items:\\s*center"));
assert(rule("\\.settings-field\\.is-content-growth", "align-items:\\s*flex-start"));
assert(/contentGrowth:\s*field\.contentGrowth === true/.test(mainSource), "Settings renderer must accept semantic growth ownership");
assert(/@media \(max-width: 380px\)[\s\S]*?\.settings-field\s*\{[^}]*align-items:\s*flex-start;[^}]*flex-wrap:\s*wrap;/.test(css));

assert(!/(?:^|;)\s*height\s*:/.test(ruleBody("\\.registry-field-row,", css)), "Registry Field must keep 46px as min-height, not height");
assert(/\.registry-field-row,[\s\S]*?align-items:\s*center;[\s\S]*?min-height:\s*calc\(46px \* var\(--ui-scale\)\)/.test(css));
assert(rule("\\.registry-tool-panel \\.registry-field-row\\.is-content-growth,[\\s\\S]*?\\.registry-tool-panel \\.registry-switch-row\\.is-content-growth", "align-items:\\s*start"));
assert(/contentGrowth:\s*field\.contentGrowth === true \|\| fieldType === "cubicBezier"/.test(mainSource) && /if \(options\.contentGrowth === true\) row\.className \+= " is-content-growth"/.test(coreSource), "Registry renderer delegates semantic growth ownership to shared FieldRow");
var dividerBody = (css.match(/\.registry-field-row \+ \.registry-field-row,[\s\S]*?\{([^}]*)\}/) || [null, ""])[1];
assert(/border-top:\s*1px solid var\(--separator\)/.test(dividerBody));
assert(!/(?:^|;)\s*(?:position|top|bottom)\s*:/.test(dividerBody), "Registry divider must follow content flow");

var appearanceOwner = css.indexOf(".settings-field.appearance-advanced-field {");
var settingsBase = css.indexOf(".settings-field {", appearanceOwner);
assert(appearanceOwner >= 0 && settingsBase > appearanceOwner, "test must cover the real cascade ordering");
assert(rule("\\.settings-field\\.appearance-advanced-field", "display:\\s*grid;[^}]*grid-template-columns:\\s*minmax\\(72px, 1fr\\) minmax\\(0, 2fr\\)"));
assert(!/\.settings-field\.appearance-advanced-field\s*\{[^}]*!important/.test(css));
assert(/row\.className = "settings-field appearance-advanced-field"/.test(mainSource));
assert(/row\.appendChild\(copy\);\s*row\.appendChild\(control\.root\);\s*row\.appendChild\(state\);\s*row\.appendChild\(reset\);/.test(mainSource));
assert(/@media \(max-width: 380px\)[\s\S]*?\.settings-field\.appearance-advanced-field\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/.test(css));

assert(rule("\\.palette-editor-field", "min-height:\\s*calc\\(32px \\* var\\(--ui-scale\\)\\)"));
assert(rule("\\.tool-app", "min-height:\\s*var\\(--tool-card-min-h\\)"));
assert(rule("\\.vela-transcript-message", "overflow-wrap:\\s*anywhere", velaCss));
assert(rule("\\.vela-status-text", "overflow:\\s*hidden;[^}]*text-overflow:\\s*ellipsis;[^}]*white-space:\\s*nowrap", velaCss));
assert(/--type-field-label-size:\s*calc\(12px \* var\(--appearance-type-field-label-scale\) \* var\(--ui-scale\)\)/.test(css));
assert(/--type-supporting-size:\s*calc\(10\.5px \* var\(--appearance-type-supporting-scale\) \* var\(--ui-scale\)\)/.test(css));
assert(/--type-code-size:\s*calc\(10\.5px \* var\(--appearance-type-code-scale\) \* var\(--ui-scale\)\)/.test(css));

var scaleBounds = AppearanceRegistry.get("layout.scale").validation;
var typographyBounds = {
    "typography.title.size": [0.90, 1.15],
    "typography.sectionTitle.size": [0.90, 1.15],
    "typography.fieldLabel.size": [0.90, 1.20],
    "typography.body.size": [0.95, 1.15],
    "typography.supporting.size": [0.90, 1.20],
    "typography.code.size": [0.90, 1.15]
};
Object.keys(typographyBounds).forEach(function (id) {
    var bounds = AppearanceRegistry.get(id).validation;
    assert.deepStrictEqual([bounds.min, bounds.max], typographyBounds[id], id + " keeps its stress-audited bounds");
    assert(Number.isFinite(scaleBounds.min * bounds.min) && Number.isFinite(scaleBounds.max * bounds.max), id + " composes safely with actual UI Scale bounds");
    assert(Number.isFinite(scaleBounds.min * bounds.min) && scaleBounds.min <= 0.62, id + " composes safely with the shared low-scale Settings boundary");
});

console.log("Typography stress contract tests passed.");
