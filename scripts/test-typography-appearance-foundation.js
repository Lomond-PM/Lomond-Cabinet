"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var Registry = require(path.join(root, "client/js/appearance/appearanceParameterRegistry.js")).AppearanceParameterRegistry;
var StoreModule = require(path.join(root, "client/js/appearance/appearanceStateStore.js")).AppearanceStateStore;
var ResolverModule = require(path.join(root, "client/js/appearance/appearanceResolver.js")).AppearanceResolver;
var cssSource = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var mainSource = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var specifications = {
    "typography.title.size": { subgroup: "titles", target: "typography.title.sizeMultiplier", min: 0.90, max: 1.15, css: "--appearance-type-title-scale" },
    "typography.sectionTitle.size": { subgroup: "titles", target: "typography.sectionTitle.sizeMultiplier", min: 0.90, max: 1.15, css: "--appearance-type-section-title-scale" },
    "typography.fieldLabel.size": { subgroup: "content", target: "typography.fieldLabel.sizeMultiplier", min: 0.90, max: 1.20, css: "--appearance-type-field-label-scale" },
    "typography.body.size": { subgroup: "content", target: "typography.body.sizeMultiplier", min: 0.95, max: 1.15, css: "--appearance-type-body-scale" },
    "typography.supporting.size": { subgroup: "content", target: "typography.supporting.sizeMultiplier", min: 0.90, max: 1.20, css: "--appearance-type-supporting-scale" },
    "typography.code.size": { subgroup: "code", target: "typography.code.sizeMultiplier", min: 0.90, max: 1.15, css: "--appearance-type-code-scale" }
};

function memoryStorage(payload) {
    var values = {};
    if (payload) { values[StoreModule.storageKey] = JSON.stringify(payload); }
    return { getItem: function (key) { return values[key] || null; }, setItem: function (key, value) { values[key] = value; }, values: values };
}
function harness(payload) {
    var storage = memoryStorage(payload);
    var store = StoreModule.create({ storage: storage, registry: Registry });
    var written = {};
    var resolver = ResolverModule.create({ registry: Registry, store: store, rootStyle: { setProperty: function (name, value) { written[name] = value; } } });
    resolver.initialize({ "layout.scale": 1.18 });
    return { storage: storage, store: store, resolver: resolver, written: written };
}

var typographyIds = Registry.list().filter(function (parameter) { return parameter.id.indexOf("typography.") === 0; }).map(function (parameter) { return parameter.id; });
assert.deepStrictEqual(typographyIds.sort(), Object.keys(specifications).sort(), "only the six approved stable Typography IDs exist");
Object.keys(specifications).forEach(function (id) {
    var parameter = Registry.get(id);
    var specification = specifications[id];
    assert.strictEqual(parameter.category, "typography");
    assert.strictEqual(parameter.subgroup, specification.subgroup);
    assert.strictEqual(parameter.classification, "EXPOSE_NOW");
    assert.strictEqual(parameter.persistence, "appearance");
    assert.strictEqual(parameter.userAdjustable, true);
    assert.strictEqual(parameter.controlType, "range-number");
    assert.strictEqual(parameter.resolverTarget, specification.target);
    assert.strictEqual(parameter.reset, "remove-override");
    assert.strictEqual(parameter.livePreview, true);
    assert.deepStrictEqual(parameter.validation, { type: "multiplier", min: specification.min, max: specification.max, step: 0.01 });
    assert.strictEqual(Registry.validate(id, specification.min).valid, true);
    assert.strictEqual(Registry.validate(id, specification.max).valid, true);
    assert.strictEqual(Registry.validate(id, specification.min - 0.01).valid, false);
    assert.strictEqual(Registry.validate(id, specification.max + 0.01).valid, false);
    assert.strictEqual(Registry.validate(id, "1.1").valid, false);
    assert.strictEqual(Registry.validate(id, NaN).valid, false);
    assert.strictEqual(Registry.validate(id, Infinity).valid, false);
    assert.strictEqual(Registry.validate(id, -Infinity).valid, false);
});

var run = harness({ version: 1, overrides: { "surface.panel": "#101010", "typography.body.size": 1.05, "typography.code.size": 99, unknown: 1 } });
assert.deepStrictEqual(run.store.getOverrides(), { "surface.panel": "#101010", "typography.body.size": 1.05 });
assert.strictEqual(run.written["--appearance-type-body-scale"], "1.05");
assert.strictEqual(run.written["--appearance-type-field-label-scale"], "1");
assert.strictEqual(run.written["--ui-scale"], "1.18", "Resolver writes layout scale once and multiplier separately");
assert.strictEqual(run.resolver.commit("typography.supporting.size", 1.05), true);
assert.strictEqual(run.resolver.preview("typography.supporting.size", 1.12), true);
assert.strictEqual(run.written["--appearance-type-supporting-scale"], "1.12", "preview wins over persisted override");
run.resolver.clearPreview("typography.supporting.size");
assert.strictEqual(run.written["--appearance-type-supporting-scale"], "1.05", "clearing preview restores persisted override");
run.resolver.reset("typography.supporting.size");
assert.strictEqual(run.written["--appearance-type-supporting-scale"], "1", "reset restores the neutral multiplier");
assert.strictEqual(run.store.getOverride("typography.supporting.size"), null, "reset removes the persisted key");
assert.strictEqual(run.resolver.commit("typography.title.size", 1), true, "explicit multiplier 1 remains a valid low-level override");
assert.strictEqual(run.store.getOverride("typography.title.size"), 1);
run.resolver.reset("typography.title.size");
assert.strictEqual(run.store.getOverride("typography.title.size"), null);
assert.strictEqual(JSON.parse(run.storage.values[StoreModule.storageKey]).version, 1);

Object.keys(specifications).forEach(function (id) {
    assert.ok(cssSource.indexOf(specifications[id].css + ": 1;") >= 0, id + " has a neutral CSS multiplier seam");
});
assert.ok(/--type-page-title-size:\s*calc\(24px \* var\(--appearance-type-title-scale\) \* var\(--ui-scale\)\)/.test(cssSource));
assert.ok(/--type-surface-title-size:\s*calc\(21px \* var\(--appearance-type-title-scale\) \* var\(--ui-scale\)\)/.test(cssSource));
assert.ok(/--type-control-size:\s*var\(--type-body-size\)/.test(cssSource), "Control intentionally follows effective Body size");
assert.ok(/--type-eyebrow-size:\s*var\(--type-supporting-size\)/.test(cssSource), "Eyebrow intentionally follows effective Supporting size");
assert.ok(!/--type-field-label-size:\s*var\(--type-body-size\)/.test(cssSource), "Field Label is independent from Body size");
assert.ok(!/--type-code-size:\s*var\(--type-supporting-size\)/.test(cssSource), "Code is independent from Supporting size");
assert.ok(/"range-number": createAppearanceRangeNumberControl/.test(mainSource), "Phase 2 renderer consumes the Phase 1 range-number contract");
assert.ok(/if \(!renderers\[parameter\.controlType\]\)/.test(mainSource), "unsupported control types fail closed");

console.log("Typography Appearance foundation contract tests passed.");
