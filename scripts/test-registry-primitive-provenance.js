#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

function body(name, nextName) {
    const start = main.indexOf("function " + name);
    const end = main.indexOf("function " + nextName, start + 1);
    assert.ok(start >= 0 && end > start, "Unable to locate provenance scope " + name);
    return main.slice(start, end);
}

const schema = body("renderSchemaField", "renderDynamicField");
const sections = body("renderToolSection", "setToolActionsVisible");
const actions = body("renderToolActions", "renderRegistryStateCard");
const picker = main.slice(main.indexOf("function openRegistryColorPicker"), main.indexOf("function renderSchemaField"));

[schema, sections, actions].forEach((scope, index) => {
    assert.ok(!/document\.createElement\("(?:button|input|select|textarea)"\)/.test(scope), "Registry presentation scope " + index + " introduces a LOCAL-UNREGISTERED primitive");
});
assert.ok(/option\s*=\s*document\.createElement\("option"\)/.test(schema), "native option remains the explicit Select platform boundary");
assert.strictEqual((picker.match(/document\.createElement\("input"\)/g) || []).length, 1, "Color Picker has exactly one raw input family: specialized channel sliders");
assert.ok(/slider\.type\s*=\s*"range"/.test(picker) && /registry-color-channel-slider/.test(picker), "the enumerated raw input is the Color Picker internal channel slider");
assert.ok(!/document\.createElement\("button"\)/.test(picker), "Color Picker buttons consume the shared Button primitive");
assert.ok(!/hexEdit\s*=\s*document\.createElement\("input"\)/.test(picker), "Color Picker HEX editing consumes shared TextInput");

// `number` is a formally supported Registry field primitive. It must be handled by
// renderSchemaField and must NEVER enter the "unsupported field type" diagnostic.
assert.ok(/fieldType === "number" \? window\.CoreUI\.createNumberInput/.test(schema), "renderSchemaField formally supports the number primitive via CoreUI");
assert.ok(/applySchemaNumberAttributes\(input, field\)/.test(schema), "renderSchemaField applies the shared schema number attributes");
assert.ok(/fieldType !== "text" && fieldType !== "number" && window\.console && console\.warn/.test(schema), "unsupported field diagnostic excludes the supported number primitive");

console.log("Registry Primitive Provenance Gate passed: LOCAL-UNREGISTERED = 0.");
