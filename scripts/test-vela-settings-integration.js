#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const schemaSource = fs.readFileSync(path.join(ROOT, "client", "js", "settingsSchema.js"), "utf8");
const mainSource = fs.readFileSync(path.join(ROOT, "client", "js", "main.js"), "utf8");
const i18nSource = fs.readFileSync(path.join(ROOT, "client", "js", "i18n.js"), "utf8");
let assertions = 0;

function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function sliceFunction(name, nextName) {
    const start = mainSource.indexOf("function " + name);
    const end = mainSource.indexOf("function " + nextName, start + 1);
    return start === -1 ? "" : mainSource.slice(start, end === -1 ? mainSource.length : end);
}

function normalizeModel(value) {
    const start = mainSource.indexOf("function normalizeVelaProviderModel(value) {");
    const end = mainSource.indexOf("    var BackgroundEngine =", start);
    const sandbox = { DefaultSettings: { velaProviderModel: "qwen3.5-4b" }, unescape, encodeURIComponent };
    vm.createContext(sandbox);
    vm.runInContext(mainSource.slice(start, end), sandbox, { filename: "vela-model-normalizer.js" });
    return sandbox.normalizeVelaProviderModel(value);
}

function run() {
    const velaSection = schemaSource.match(/\{\s*id: "vela",[\s\S]*?\n\s*\},\n\s*\{/);
    const collectSettings = sliceFunction("collectSettings", "saveSettings");
    const openSettings = sliceFunction("openSettingsPanel", "closeSettingsPanel");
    const renderVela = sliceFunction("renderSettingsVela", "renderSettingsDeveloperMode");
    const sharedTextInput = sliceFunction("createSharedSettingsTextInput", "dispatchSettingsControlEvent");

    check(!!velaSection && /titleKey: "settings\.sections\.vela"/.test(velaSection[0]), "Settings schema declares the formal Vela section.");
    check(/key: "velaProviderModel"[\s\S]*type: "text"[\s\S]*defaultValue: "qwen3\.5-4b"[\s\S]*maxLength: 256/.test(velaSection[0]), "Vela section declares the bounded text model field with the existing default.");
    check(!/\bkey: "[^"\n]*(?:endpoint|credential|api.?key|network)[^"\n]*"/i.test(velaSection[0]), "Vela Settings schema contains no endpoint, credential, or network-permission field.");
    check(/descriptionKey: "settings\.vela\.fixedEndpoint"/.test(velaSection[0]), "The fixed localhost endpoint is a read-only section description, not a persisted field.");
    ["settings.sections.vela", "settings.vela.model", "settings.vela.modelDescription", "settings.vela.fixedEndpoint"].forEach((key) => check((i18nSource.match(new RegExp('"' + key.replace(/\./g, "\\.") + '"', "g")) || []).length === 2, "Vela Settings key is localized in English and Simplified Chinese: " + key));

    equal(normalizeModel("  local-model  "), "local-model", "Model normalization trims surrounding whitespace.");
    equal(normalizeModel("   "), "qwen3.5-4b", "Blank model values fall back to the existing default.");
    equal(normalizeModel("模型-a"), "模型-a", "UTF-8 multibyte model identifiers remain valid below the byte limit.");
    equal(normalizeModel("界".repeat(129)), "qwen3.5-4b", "Oversized UTF-8 model identifiers fall back using the existing 256-byte contract.");
    equal(normalizeModel({}), "qwen3.5-4b", "Non-string model values fall back to the existing default.");

    check(/function createSharedSettingsTextInput/.test(sharedTextInput) && /registry-text-input settings-text-input/.test(sharedTextInput), "Vela Settings reuses the shared Settings text-input primitive and existing Registry text styling.");
    check(/renderSettingsBackgroundText[\s\S]*createSharedSettingsTextInput/.test(mainSource), "The shared text-input primitive has a second existing Settings caller.");
    check(/function renderSettingsVela[\s\S]*findSettingsSchemaSection\("vela"\)[\s\S]*normalizeVelaProviderModel[\s\S]*saveSettings[\s\S]*createSharedSettingsFieldRow\("text"[\s\S]*createSharedSettingsTextInput/.test(renderVela), "Vela Settings renders through the global schema, shared row, normalization, and existing persistence path.");
    check(/velaProviderModel: VelaProviderModel/.test(collectSettings) && !/endpoint/i.test(collectSettings), "Settings persistence writes only the existing Vela model value and no endpoint.");
    check(/VelaProviderModel = normalizeVelaProviderModel\(data\.velaProviderModel\)[\s\S]*byId\("velaProviderModel"\)\.value = VelaProviderModel/.test(sliceFunction("applySettings", "loadPersistentState")), "Stored model values normalize and repopulate the formal Settings input on reload.");

    check(/openSettings: openVelaSettingsPanel/.test(mainSource) && /function openVelaSettingsPanel\(\)[\s\S]*openSettingsPanel\("vela"\)/.test(mainSource), "Surface Settings uses the controlled Vela Settings entry point.");
    check(/function openSettingsPanel\(focusSectionId\)[\s\S]*view\.classList\.contains\("is-open"\)[\s\S]*focusPendingSettingsSection/.test(openSettings), "An already-open Settings panel repositions Vela without rebuilding Settings content.");
    check(/finishOpenSettingsTransition[\s\S]*revealSettingsContent\(\);[\s\S]*focusPendingSettingsSection\(\);/.test(mainSource) && !/setTimeout/.test(sliceFunction("openVelaSettingsPanel", "openSettingsPanel")), "Vela positioning runs after the existing reveal completion path without a guessed timer.");
    check(/function focusSettingsSection[\s\S]*scrollIntoView[\s\S]*input\.focus/.test(mainSource), "Vela Settings positioning scrolls into view and gives the model input accessible transient focus.");
    check(/renderSettingsContent[\s\S]*settingsVelaMount/.test(mainSource) && /renderSettingsVela\(\);/.test(mainSource), "Settings creates the Vela section once during normal Settings rendering.");
    console.log("test-vela-settings-integration: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
