#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
let assertions = 0;
function check(value, message) { assertions += 1; if (!value) throw new Error(message); }
function sliceFunction(name, nextName) {
    const start = main.indexOf("function " + name);
    const end = main.indexOf("function " + nextName, start + 1);
    return start === -1 ? "" : main.slice(start, end === -1 ? main.length : end);
}

const renderContent = sliceFunction("renderSettingsContent", "createSettingsSectionHeader");
const renderTheme = sliceFunction("renderSettingsTheme", "refreshPaletteDrivenHomeIcons");
const bindEvents = sliceFunction("bindEvents", "");
const domReady = main.slice(main.indexOf('document.addEventListener("DOMContentLoaded"'));
const commitCatalog = sliceFunction("commitDynamicToolCatalog", "updateCoreBootstrapState");

check(/id="toolBootstrapStatus"/.test(html) && /bootstrap\.loadingTools/.test(html), "production HTML owns the startup loading placeholder");
check(/settingsRootPage/.test(renderContent) && !/settingsAppearancePage|settingsBackgroundPage|settingsAdvancedPage|settingsDeveloperPage/.test(renderContent), "single-surface Settings mounts without deleted secondary pages");
check(/createSettingsCategory\("appearance"/.test(renderContent) && /createSettingsCategory\("developer"/.test(renderContent), "Settings Disclosure creation is part of the real startup composition");
check(/var appearanceGroupCount = 0;/.test(renderTheme), "renderSettingsTheme declares its semantic group counter in local scope");
check(!/appearanceGroupCount/.test(sliceFunction("findSettingsSchemaField", "findSettingsSchemaSection")), "the Theme renderer counter is not leaked into an unrelated function scope");
check(/renderSettingsContent\(\);[\s\S]*renderSettingsTheme\(\);[\s\S]*HomeLayoutManager\.init\(\)/.test(bindEvents), "real startup initializes Settings before Home without skipping Home initialization");
check(/bindEvents\(\);[\s\S]*loadHost\(\);/.test(domReady), "production DOMContentLoaded starts Registry bootstrap after synchronous UI initialization");
check(/onCatalog:[\s\S]*commitDynamicToolCatalog/.test(sliceFunction("loadHost", "invokeVelaHost")), "Core bootstrap publishes the resolved catalog to the production commit boundary");
check(/toolCatalog\.setRegistryTools/.test(commitCatalog) && /renderDynamicToolHome\(\)/.test(commitCatalog), "catalog commit invokes the Home renderer");
check(/snapshot\.state === "ready"[\s\S]*root\.hidden = true/.test(sliceFunction("renderCoreBootstrapState", "commitDynamicToolCatalog")), "tools-ready removes the loading placeholder");
check(/getHomeEntries\(\{ developerMode: window\.AETOOLBOX_DEBUG_REGISTRY === true \}\)/.test(sliceFunction("renderDynamicToolHome", "refreshProceduralHomeIcons")), "Developer Mode only filters the catalog projection and cannot suppress production bootstrap");
check(/createSettingsCategory/.test(renderContent) && /createDisclosureController/.test(sliceFunction("createSettingsCategory", "renderSettingsContent")), "Disclosure initialization remains within Settings and does not replace Registry bootstrap authority");

console.log("Settings startup bootstrap regression tests passed: " + assertions + " assertions.");
