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
const cssSource = fs.readFileSync(path.join(ROOT, "client", "css", "style.css"), "utf8");
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
    const renderVela = sliceFunction("renderVelaSettingsContent", "renderSettingsDeveloperMode");
    const sharedTextInput = sliceFunction("createSharedSettingsTextInput", "dispatchSettingsControlEvent");

    check(!!velaSection && /titleKey: "settings\.sections\.vela"/.test(velaSection[0]), "Settings schema declares the formal Vela section.");
    check(/key: "velaProviderModel"[\s\S]*type: "text"[\s\S]*defaultValue: "qwen3\.5-4b"[\s\S]*maxLength: 256/.test(velaSection[0]), "Vela section declares the bounded text model field with the existing default.");
    check(/key: "velaProviderEndpoint"[\s\S]*type: "text"[\s\S]*defaultValue: "http:\/\/127\.0\.0\.1:1234"[\s\S]*maxLength: 512/.test(velaSection[0]), "Vela section declares the persisted bounded local base endpoint field.");
    check(!/\bkey: "[^"\n]*(?:credential|api.?key|network.?permission|experimentalEnabled|acknowledgement)[^"\n]*"/i.test(velaSection[0]), "Vela Settings schema persists no credential, network permission, acknowledgement, or session enablement field.");
    check(/descriptionKey: "settings\.vela\.experimentalDescription"/.test(velaSection[0]), "The Vela section declares the fixed experimental and not-qualified status.");
    ["common.close", "settings.vela.title", "settings.sections.vela", "settings.vela.model", "settings.vela.modelDescription", "settings.vela.experimentalDescription", "settings.vela.endpoint", "settings.vela.endpointDescription", "settings.vela.acknowledgement", "settings.vela.enableSession", "settings.vela.disableSession", "settings.vela.endpointInvalid", "settings.vela.networkFailed", "settings.vela.httpFailed", "settings.vela.responseInvalid", "settings.vela.modelNotFound", "settings.vela.modelNotLoaded"].forEach((key) => check((i18nSource.match(new RegExp('"' + key.replace(/\./g, "\\.") + '"', "g")) || []).length === 2, "Vela Settings key is localized in English and Simplified Chinese: " + key));

    equal(normalizeModel("  local-model  "), "local-model", "Model normalization trims surrounding whitespace.");
    equal(normalizeModel("   "), "qwen3.5-4b", "Blank model values fall back to the existing default.");
    equal(normalizeModel("模型-a"), "模型-a", "UTF-8 multibyte model identifiers remain valid below the byte limit.");
    equal(normalizeModel("界".repeat(129)), "qwen3.5-4b", "Oversized UTF-8 model identifiers fall back using the existing 256-byte contract.");
    equal(normalizeModel({}), "qwen3.5-4b", "Non-string model values fall back to the existing default.");

    check(/function createSharedSettingsTextInput/.test(sharedTextInput) && /registry-text-input settings-text-input/.test(sharedTextInput), "Vela Settings reuses the shared Settings text-input primitive and existing Registry text styling.");
    check(/renderSettingsBackgroundText[\s\S]*createSharedSettingsTextInput/.test(mainSource), "The shared text-input primitive has a second existing Settings caller.");
    check(/function renderVelaSettingsContent\(mount\)[\s\S]*findSettingsSchemaSection\("vela"\)[\s\S]*normalizeVelaExperimentalModel[\s\S]*normalizeVelaProviderEndpoint[\s\S]*saveSettings[\s\S]*createSharedSettingsFieldRow\("text"[\s\S]*createSharedSettingsTextInput/.test(renderVela), "Vela-owned content renders endpoint and model through the existing schema, shared rows, normalization, and persistence authority.");
    check(/normalizeVelaProviderEndpoint[\s\S]*127\\\.0\\\.0\\\.1\|localhost\|\\\[::1\\\][\s\S]*v1\\\/chat\\\/completions/.test(mainSource), "Settings canonicalizes base, trailing-slash, and complete chat loopback endpoints without accepting non-loopback hosts.");
    check(/velaProviderModel: VelaProviderModel/.test(collectSettings) && /velaProviderEndpoint: VelaProviderEndpoint/.test(collectSettings) && !/velaExperimentalAcknowledged|experimentalEnabled|readiness/.test(collectSettings), "Settings persists Vela configuration but never acknowledgement, Provider readiness, or runtime authority.");
    check(/VelaExperimentalAcknowledged = false/.test(mainSource) && !/velaExperimentalAcknowledged:/.test(collectSettings), "Acknowledgement remains session-only and defaults off on every load.");
    check(/VelaProviderModel = typeof data\.velaProviderModel[\s\S]*VelaProviderEndpoint = typeof data\.velaProviderEndpoint[\s\S]*VelaExperimentalAcknowledged = false[\s\S]*byId\("velaProviderModel"\)\.value = VelaProviderModel[\s\S]*byId\("velaProviderEndpoint"\)\.value = VelaProviderEndpoint/.test(sliceFunction("applySettings", "loadPersistentState")), "Stored endpoint and model repopulate Settings without restoring acknowledgement or Provider session readiness.");
    check(/ActivationPolicy:\s*window\.VelaActivationPolicy/.test(mainSource) && /checkProviderReadiness/.test(mainSource) && !/productionEnabled\s*=/.test(renderVela), "Production activation comes only from the trusted policy while readiness remains an explicit Runtime action outside Settings.");

    check(/openSettings: openVelaSettingsSurface/.test(mainSource) && /function openVelaSettingsSurface\(launchSource\)[\s\S]*ensureVelaSettingsSurface\(\)[\s\S]*renderVelaSettingsContent\(surface\.content\)/.test(mainSource), "The fixed Vela Settings button opens the lazy Vela-owned surface directly.");
    check(/function ensureVelaSettingsSurface[\s\S]*role", "dialog"[\s\S]*aria-modal", "true"[\s\S]*content\.id = "velaSettingsContent"/.test(mainSource), "Vela owns an accessible popup composition without cloning Global Settings.");
    check(/function closeVelaSettingsSurface[\s\S]*root\.hidden = true[\s\S]*returnFocus\.focus/.test(mainSource), "Close returns focus to the Vela entry without reinitializing the surface or runtime.");
    check(!/renderSettingsVela|settingsVelaMount|settingsCategoryVela|createSettingsCategory\("vela"|SystemRouter\.open\("settings", "vela"/.test(mainSource), "Global Settings owns no Vela renderer, mount, category, or route.");
    check(/pages: \["root", "appearance"\]/.test(mainSource) && !/pages: \[[^\]]*"vela"/.test(mainSource), "No permanent settings/vela route exists.");
    check(/renderVelaSettingsContent\(surface\.content\)/.test(mainSource) && !/renderVelaSettingsContent/.test(sliceFunction("bindEvents", "document.addEventListener")), "Vela Settings composition is lazy and outside startup-critical pre-render.");
    check(/data-i18n", "settings\.vela\.title"/.test(mainSource) && /applyI18n\(surface\.root\)/.test(mainSource) && /data-i18n-aria-label", "common\.close"/.test(mainSource), "Lazy creation and reopen project the current locale through the formal i18n seam without literal keys.");
    check(/heading = document\.createElement\("p"\)[\s\S]*section\.descriptionKey/.test(renderVela) && !/createSettingsSectionHeader/.test(renderVela), "Content preserves qualification copy without creating a duplicate Vela heading.");
    check(/--space-card-inset/.test(cssSource.slice(cssSource.indexOf(".vela-settings-surface"), cssSource.indexOf("h1,"))) && /--radius-section-card/.test(cssSource) && /--surface-panel/.test(cssSource) && /--panel-border/.test(cssSource) && /--elevation-floating-surface/.test(cssSource), "The modal consumes shared spacing, radius, surface, border, and elevation authorities.");
    check(/semanticMotionDuration\("viewContentEnter"\)[\s\S]*semanticMotionEasing\("viewContentEnter"\)/.test(sliceFunction("openVelaSettingsSurface", "closeVelaSettingsSurface")) && /semanticMotionDuration\("viewContentExit"\)[\s\S]*semanticMotionEasing\("viewContentExit"\)/.test(sliceFunction("closeVelaSettingsSurface", "openSettingsPanel")), "Open and close snapshot formal View Content motion roles.");
    check(/backdrop\.addEventListener\("click", closeVelaSettingsSurface\)[\s\S]*close\.addEventListener\("click", closeVelaSettingsSurface\)/.test(mainSource) && /if \(closeVelaSettingsSurface\(\)\) return/.test(mainSource), "Close button, backdrop, and Escape share one animated close lifecycle.");
    console.log("test-vela-settings-integration: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
