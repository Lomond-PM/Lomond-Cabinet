#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const i18nSource = fs.readFileSync(path.join(root, "client/js/i18n.js"), "utf8");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const host = fs.readFileSync(path.join(root, "host/index.jsx"), "utf8");
const sandbox = { window: {}, console };
vm.runInNewContext(i18nSource, sandbox, { filename: "client/js/i18n.js" });
const I18n = sandbox.window.I18n;

function text(lang, key, params) {
    I18n.currentLanguage = lang;
    return I18n.t(key, params);
}

assert.strictEqual(text("zh-CN", "status.oneLayerSelected"), "已选择 1 个图层", "Chinese singular selection is natural and fully localized");
assert.strictEqual(text("zh-CN", "status.multipleLayersSelected", { count: 3 }), "已选择 3 个图层", "Chinese multiple selection is natural and fully localized");
assert.strictEqual(text("en", "status.oneLayerSelected"), "1 layer selected", "English singular selection is grammatical");
assert.strictEqual(text("en", "status.multipleLayersSelected", { count: 3 }), "3 layers selected", "English plural selection is grammatical");

const mainStatusKeys = Array.from(new Set(Array.from(main.matchAll(/tr\("(status\.[^"]+)"/g), match => match[1])));
for (const key of mainStatusKeys) {
    assert.strictEqual(typeof I18n.dictionaries.en[key], "string", key + " has an English Global Status resolution");
    assert.strictEqual(typeof I18n.dictionaries["zh-CN"][key], "string", key + " has a Chinese Global Status resolution");
    assert.notStrictEqual(text("en", key), key, key + " does not leak as a raw key in English");
    assert.notStrictEqual(text("zh-CN", key), key, key + " does not leak as a raw key in Chinese");
}

assert.ok(/statusId:\s*"no-active-comp"[\s\S]*selectedCount:\s*0/.test(host), "AE no-composition adapter returns semantic state data");
assert.ok(/statusId:\s*selectedCount > 0 \? "selection" : "no-selection"[\s\S]*selectedCount:\s*selectedCount/.test(host), "AE selection adapter returns semantic state and count");
assert.ok(!/Selected " \+ selectedCount|layer\(s\)|selectionLabel:/.test(host.slice(host.indexOf("AEToolbox.getSelectionSummary"), host.indexOf("AEToolbox.getHostLoadInfo"))), "AE selection adapter no longer formats English UI copy");
assert.ok(/function selectionSummaryPresentation[\s\S]*status\.oneLayerSelected[\s\S]*status\.multipleLayersSelected/.test(main), "client presentation layer owns selection singular/plural formatting");
assert.ok(/lastSelectionSummary[\s\S]*refreshLanguage\(\);[\s\S]*renderSelectionSummary\(lastSelectionSummary\)/.test(main), "runtime locale changes immediately re-resolve the current selection status");
assert.strictEqual((main.match(/localized !== result\.messageKey/g) || []).length, 2, "result and dynamic-action status formatters both reject raw missing keys");
assert.strictEqual(text("zh-CN", "settings.designTuning.promotionEvidence"), "采纳依据", "Promotion Evidence uses the accepted Chinese term");

console.log("test-global-status-i18n: " + (mainStatusKeys.length * 4 + 12) + " assertions passed.");
