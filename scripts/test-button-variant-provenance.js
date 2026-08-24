#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const lab = fs.readFileSync(path.join(root, "host/tools/registryControlLab.tool.jsx"), "utf8");
const vela = fs.readFileSync(path.join(root, "client/js/vela/velaConfirmationView.js"), "utf8");

const schemaRenderer = main.slice(main.indexOf("function renderSchemaField"), main.indexOf("function renderDynamicField"));
const toolActions = main.slice(main.indexOf("function renderToolActions"), main.indexOf("function renderRegistryStateCard"));

assert.ok(/CoreUI\.createButton\([^\n]+variant:\s*semanticVariant/.test(schemaRenderer), "Registry Action Field uses the shared Button factory and semantic variant");
assert.ok((toolActions.match(/CoreUI\.createButton/g) || []).length >= 2, "Registry Tool Actions use the shared Button factory");
assert.ok(!/document\.createElement\("button"\)/.test(schemaRenderer + toolActions), "Registry action composites do not create raw button primitives");
assert.ok(/\.ui-button--utility,\s*\.ui-button--navigation,\s*\.utility-action\s*\{[^}]*box-shadow:\s*var\(--elevation-utility-action\)/.test(css), "Utility and Navigation share the Utility elevation authority");
assert.ok(/\.ui-button--utility,\s*\.ui-button--navigation,\s*\.utility-action\s*\{[^}]*background:\s*var\(--surface-utility-action\)/.test(css), "Navigation is a semantic subvariant of the Utility presentation family");
assert.ok(/buttonVariants:\s*\["utility",\s*"navigation"\]/.test(lab), "Control Lab exposes both shared semantic variants");
assert.ok(/reject\.className = "panel-button utility-action[^"]*vela-reject-action"/.test(vela), "Reject preserves its Utility skeleton plus Danger-fill modifier");

console.log("Button variant provenance contract tests passed.");
