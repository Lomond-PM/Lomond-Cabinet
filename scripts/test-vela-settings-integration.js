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
    const velaSection = schemaSource.match(/\{\s*id: "vela",[\s\S]*?(?=\n\s*\{\s*id: "proceduralAppearance")/);
    const collectSettings = sliceFunction("collectSettings", "saveSettings");
    const openSettings = sliceFunction("openSettingsPanel", "closeSettingsPanel");
    const renderVela = sliceFunction("renderSettingsVela", "renderSettingsDeveloperMode");
    const sharedTextInput = sliceFunction("createSharedSettingsTextInput", "dispatchSettingsControlEvent");

    check(!!velaSection && /titleKey: "settings\.sections\.vela"/.test(velaSection[0]), "Settings schema declares the formal Vela section.");
    check(/key: "velaProviderModel"[\s\S]*type: "text"[\s\S]*defaultValue: "qwen3\.5-4b"[\s\S]*maxLength: 256/.test(velaSection[0]), "Vela section declares the bounded text model field with the existing default.");
    check(/key: "velaProviderEndpoint"[\s\S]*type: "text"[\s\S]*defaultValue: "http:\/\/127\.0\.0\.1:1234"[\s\S]*maxLength: 512/.test(velaSection[0]), "Vela section declares the persisted bounded local base endpoint field.");
    check(!/\bkey: "[^"\n]*(?:credential|api.?key|network.?permission|experimentalEnabled|acknowledgement)[^"\n]*"/i.test(velaSection[0]), "Vela Settings schema persists no credential, network permission, acknowledgement, or session enablement field.");
    check(/descriptionKey: "settings\.vela\.experimentalDescription"/.test(velaSection[0]), "The Vela section declares the fixed experimental and not-qualified status.");
    ["settings.sections.vela", "settings.vela.model", "settings.vela.modelDescription", "settings.vela.experimentalDescription", "settings.vela.endpoint", "settings.vela.endpointDescription", "settings.vela.acknowledgement", "settings.vela.enableSession", "settings.vela.disableSession", "settings.vela.endpointInvalid", "settings.vela.networkFailed", "settings.vela.httpFailed", "settings.vela.responseInvalid", "settings.vela.modelNotFound", "settings.vela.modelNotLoaded"].forEach((key) => check((i18nSource.match(new RegExp('"' + key.replace(/\./g, "\\.") + '"', "g")) || []).length === 2, "Vela Settings key is localized in English and Simplified Chinese: " + key));

    equal(normalizeModel("  local-model  "), "local-model", "Model normalization trims surrounding whitespace.");
    equal(normalizeModel("   "), "qwen3.5-4b", "Blank model values fall back to the existing default.");
    equal(normalizeModel("模型-a"), "模型-a", "UTF-8 multibyte model identifiers remain valid below the byte limit.");
    equal(normalizeModel("界".repeat(129)), "qwen3.5-4b", "Oversized UTF-8 model identifiers fall back using the existing 256-byte contract.");
    equal(normalizeModel({}), "qwen3.5-4b", "Non-string model values fall back to the existing default.");

    check(/function createSharedSettingsTextInput/.test(sharedTextInput) && /registry-text-input settings-text-input/.test(sharedTextInput), "Vela Settings reuses the shared Settings text-input primitive and existing Registry text styling.");
    check(/renderSettingsBackgroundText[\s\S]*createSharedSettingsTextInput/.test(mainSource), "The shared text-input primitive has a second existing Settings caller.");
    check(/function renderSettingsVela[\s\S]*findSettingsSchemaSection\("vela"\)[\s\S]*normalizeVelaExperimentalModel[\s\S]*normalizeVelaProviderEndpoint[\s\S]*saveSettings[\s\S]*createSharedSettingsFieldRow\("text"[\s\S]*createSharedSettingsTextInput/.test(renderVela), "Vela Settings renders endpoint and model through the global schema, shared rows, normalization, and existing persistence path.");
    check(/normalizeVelaProviderEndpoint[\s\S]*127\\\.0\\\.0\\\.1\|localhost\|\\\[::1\\\][\s\S]*v1\\\/chat\\\/completions/.test(mainSource), "Settings canonicalizes base, trailing-slash, and complete chat loopback endpoints without accepting non-loopback hosts.");
    check(/velaProviderModel: VelaProviderModel/.test(collectSettings) && /velaProviderEndpoint: VelaProviderEndpoint/.test(collectSettings) && !/experimentalEnabled|Acknowledged|readiness/.test(collectSettings), "Settings persists only endpoint/model configuration, never session authority or acknowledgement.");
    check(/VelaExperimentalAcknowledged = false/.test(mainSource) && !/velaExperimentalAcknowledgement:/.test(collectSettings), "Every bootstrap starts with acknowledgement false and cannot restore it from Settings.");
    check(/VelaProviderModel = typeof data\.velaProviderModel[\s\S]*VelaProviderEndpoint = typeof data\.velaProviderEndpoint[\s\S]*byId\("velaProviderModel"\)\.value = VelaProviderModel[\s\S]*byId\("velaProviderEndpoint"\)\.value = VelaProviderEndpoint/.test(sliceFunction("applySettings", "loadPersistentState")), "Stored endpoint/model configuration repopulates Settings without restoring session opt-in.");
    check(/ActivationPolicy:\s*window\.VelaActivationPolicy/.test(mainSource) && /checkProviderReadiness/.test(mainSource) && !/productionEnabled\s*=/.test(renderVela), "Production activation comes only from the trusted policy while readiness remains an explicit Runtime action outside Settings.");

    check(/openSettings: openVelaSettingsPanel/.test(mainSource) && /function openVelaSettingsPanel\(\)[\s\S]*openSettingsPanel\("vela"\)/.test(mainSource), "Surface Settings uses the controlled Vela Settings entry point.");
    check(/function openSettingsPanel\(focusSectionId\)[\s\S]*view\.classList\.contains\("is-open"\)[\s\S]*focusPendingSettingsSection/.test(openSettings), "An already-open Settings panel repositions Vela without rebuilding Settings content.");
    check(/finishOpenSettingsTransition[\s\S]*revealSettingsContent\(\);[\s\S]*focusPendingSettingsSection\(\);/.test(mainSource) && !/setTimeout/.test(sliceFunction("openVelaSettingsPanel", "openSettingsPanel")), "Vela positioning runs after the existing reveal completion path without a guessed timer.");
    check(/function focusSettingsSection[\s\S]*scrollIntoView[\s\S]*input\.focus/.test(mainSource), "Vela Settings positioning scrolls into view and gives the model input accessible transient focus.");
    check(/renderSettingsContent[\s\S]*settingsVelaMount/.test(mainSource) && /renderSettingsVela\(\);/.test(mainSource), "Settings creates the Vela section once during normal Settings rendering.");
    console.log("test-vela-settings-integration: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
