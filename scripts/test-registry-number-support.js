#!/usr/bin/env node
"use strict";

/*
 * Registry `number` field support contract (Runtime Console Cleanup).
 *
 * `number` is a formally supported Registry field primitive rendered by
 * renderSchemaField via CoreUI.createNumberInput. The unsupported-field diagnostic
 * must exclude `number`, but a genuinely unsupported type must still be flagged.
 *
 * Verifies the renderer contract plus the production tool schemas that declare
 * numeric fields (Text Background Box, Ad Component Kit, Registry Control Lab) so a
 * future change cannot silently push `number` into the unsupported warning path.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

// The field-renderer scope (renderSchemaField -> renderDynamicField).
const schemaStart = main.indexOf("function renderSchemaField");
const schemaEnd = main.indexOf("function renderDynamicField", schemaStart + 1);
assert.ok(schemaStart >= 0 && schemaEnd > schemaStart, "renderSchemaField must be locatable");
const schema = main.slice(schemaStart, schemaEnd);

// Renderer contract: number is a first-class primitive and never enters the diagnostic.
assert.ok(/fieldType === "number" \? window\.CoreUI\.createNumberInput/.test(schema), "renderSchemaField routes number to CoreUI.createNumberInput");
assert.ok(/applySchemaNumberAttributes\(input, field\)/.test(schema), "renderSchemaField applies shared schema number attributes");
assert.ok(/fieldType !== "text" && fieldType !== "number" && window\.console && console\.warn/.test(schema), "unsupported-field diagnostic excludes the supported number type");
assert.ok(/\bconsole\.warn\("\[AE Toolbox\] Unsupported registry field type:"/.test(schema), "a genuinely unsupported type still reaches the unsupported-field warning");

function toolSchema(fileName) {
    return fs.readFileSync(path.join(root, "host/tools", fileName), "utf8");
}
function fieldIsNumber(schemaText, key) {
    // Find each `key: "<key>"` and confirm its owning field object declares type "number".
    const keyIdx = schemaText.indexOf('key: "' + key + '"');
    assert.ok(keyIdx >= 0, "schema should declare key " + key);
    const header = schemaText.slice(Math.max(0, keyIdx - 400), keyIdx + 400);
    return /type:\s*"number"/.test(header);
}

// Text Background Box numeric fields.
{
    const text = toolSchema("textBackgroundBox.tool.jsx");
    ["paddingX", "paddingY", "cornerRadius", "fillOpacity", "strokeWidth", "strokeOpacity"].forEach((key) => {
        assert.ok(fieldIsNumber(text, key), "textBackgroundBox." + key + " is a formal number field");
    });
}
// Ad Component Kit numeric field.
{
    const ad = toolSchema("adComponentKit.tool.jsx");
    assert.ok(fieldIsNumber(ad, "fixedWidth"), "addComponentKit.fixedWidth is a formal number field");
}
// Registry Control Lab numeric fields.
{
    const lab = toolSchema("registryControlLab.tool.jsx");
    ["numberValue", "toggleNumber", "featureOnlyGap", "gridOnlyColumns"].forEach((key) => {
        assert.ok(fieldIsNumber(lab, key), "registryControlLab." + key + " is a formal number field");
    });
}

console.log("Registry number support contract tests passed.");
