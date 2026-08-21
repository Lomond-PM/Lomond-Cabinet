#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");

const renderer = main.slice(main.indexOf("function renderSchemaField"), main.indexOf("function renderDynamicField"));
const formalTypes = ["text", "textarea", "number", "range", "select", "switch", "checkbox", "tabs", "color", "cubicBezier"];

assert.ok(/builtRow\s*=\s*window\.CoreUI\.createFieldRow\(/.test(renderer), "Registry formal fields must use the shared FieldRow factory");
assert.ok(/control:\s*wrap/.test(renderer), "FieldRow receives the real Registry control composition");
assert.ok(/contentGrowth:\s*field\.contentGrowth\s*===\s*true\s*\|\|\s*fieldType\s*===\s*"cubicBezier"/.test(renderer), "contentGrowth remains schema-driven with the Bezier composite exception");
assert.ok(/labelFor:\s*fieldType\s*===\s*"checkbox"\s*\|\|\s*fieldType\s*===\s*"switch"\s*\?\s*fieldId/.test(renderer), "toggle copy retains its explicit label association");
assert.ok(/descriptionText:\s*hintText/.test(renderer), "schema helper copy is composed by FieldRow");
assert.ok(!/labelColumn\s*=\s*document\.createElement/.test(renderer), "Registry must not duplicate the shared label-column composition");
formalTypes.forEach(type => assert.ok(renderer.includes('fieldType === "' + type + '"') || type === "text", type + " remains on the formal FieldRow path"));
assert.ok(/copyTag\s*\|\|\s*"span"/.test(core) && /options\.labelFor/.test(core), "FieldRow exposes generic copy-tag and label association capabilities");

console.log("Registry FieldRow provenance contract tests passed.");
