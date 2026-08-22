#!/usr/bin/env node
"use strict";

/*
 * Registry Tool Schema i18n resolution contract (Runtime Console Cleanup).
 *
 * A production Registry Tool schema declares labelKey / hintKey / descriptionKey /
 * titleKey references. Each must resolve through the merged tool-local dictionary OR
 * the global dictionary; a reference resolving in neither surfaces as a runtime
 * missing-key warning. This test verifies the specific homeBackground field fix plus
 * the whole-schema resolvability contract, and that the report machinery would fail
 * on a genuinely unresolvable reference.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const Report = require("./report-i18n-usage.js");

const GLOBAL_I18N = path.join(root, "client/js/i18n.js");
const SETTINGS_LAB = "host/tools/settingsRendererLab.tool.jsx";

function loadGlobalEn() {
    const code = fs.readFileSync(GLOBAL_I18N, "utf8");
    const ctx = { window: {}, document: { documentElement: { lang: "" }, body: { classList: { add: function () {} } }, querySelectorAll: function () { return []; } }, localStorage: { getItem: function () { return null; }, setItem: function () {} }, console: { warn: function () {}, log: function () {}, error: function () {} } };
    vm.createContext(ctx);
    vm.runInContext(code, ctx, { filename: GLOBAL_I18N });
    return ctx.window.I18n.dictionaries.en;
}

function loadToolDef() {
    const code = fs.readFileSync(path.join(root, SETTINGS_LAB), "utf8");
    const registered = [];
    const ctx = { AEToolbox: { registerTool: (d) => registered.push(d), tools: {} }, $: {}, app: {}, JSON: JSON };
    vm.createContext(ctx);
    vm.runInContext(code, ctx, { filename: SETTINGS_LAB });
    return registered[registered.length - 1];
}

const en = loadGlobalEn();

// 1. The settingsRendererLab homeBackground field resolves to the existing global keys.
{
    const def = loadToolDef();
    assert.strictEqual(def.id, "settingsRendererLab");
    const theme = def.sections.find((section) => section.id === "theme");
    const field = theme.fields.find((field) => field.key === "homeBackground");
    assert.ok(field, "settingsRendererLab must declare a homeBackground field");
    assert.strictEqual(field.labelKey, "label.homeBaseColor", "homeBackground label uses the existing global Home Base Color key");
    assert.strictEqual(field.hintKey, "helper.homeBaseColor", "homeBackground hint uses the existing global Home Base Color helper key");
    assert.ok(en[field.labelKey], "homeBackground labelKey is present in the global dictionary");
    assert.ok(en[field.hintKey], "homeBackground hintKey is present in the global dictionary");
    assert.ok(!/"label\.homeBackground"/.test(fs.readFileSync(path.join(root, SETTINGS_LAB), "utf8")), "stale label.homeBackground reference is removed from the schema");
}

// 2. Every production Registry Tool schema i18n reference resolves (global OR tool-local).
const built = Report.buildReport();
assert.ok(Array.isArray(built.schemaMissingKeys), "schema resolvability inventory is an array");
assert.strictEqual(built.schemaMissingKeys.length, 0, "no Registry Tool schema i18n reference is unresolvable: " + built.schemaMissingKeys.join(", "));
assert.strictEqual(built.summary.schemaMissingKeyCount, 0, "report summary records zero unresolvable schema keys");
assert.ok(built.content.includes("No Registry Tool schema i18n reference is unresolvable"), "report's schema coverage section documents a clean state");

// 3. The shared check fails when a schema reference is unresolvable.
// Inject an already-nonempty schema inventory via a stale/nonmatching report target:
// the check must reject a target whose content does not match the freshly built report.
const os = require("os");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aetoolbox-schema-i18n-"));
try {
    const bad = built.content.replace("No Registry Tool schema i18n reference is unresolvable", "label.homeBackground [en] canary");
    const tempReport = path.join(tempDir, "report.md");
    fs.writeFileSync(tempReport, built.content, "utf8"); // fresh content
    assert.strictEqual(Report.checkReport(tempReport, built.content).ok, true, "fresh report passes the check");
    fs.writeFileSync(tempReport, bad, "utf8"); // content diverges (schema-missing canary)
    const result = Report.checkReport(tempReport, built.content);
    assert.strictEqual(result.ok, false, "divergent schema coverage is rejected");
    assert.strictEqual(result.reason, "out-of-date", "divergent report content is flagged as out-of-date");
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("Registry Tool Schema i18n resolution contract tests passed.");
