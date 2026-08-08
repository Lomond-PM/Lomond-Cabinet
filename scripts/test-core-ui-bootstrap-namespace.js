"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var rootDir = path.resolve(__dirname, "..");
var scripts = [
    "client/js/ui/coreUi.js",
    "client/js/appearance/appearanceParameterRegistry.js",
    "client/js/appearance/appearanceStateStore.js",
    "client/js/appearance/appearanceResolver.js"
];
var documentStub = {
    createElement: function (tag) {
        return {
            tagName: String(tag).toUpperCase(),
            classList: { add: function () {} },
            setAttribute: function () {},
            appendChild: function () {},
            addEventListener: function () {},
            style: {}
        };
    }
};
var browser = { document: documentStub, setTimeout: setTimeout };
var context = vm.createContext({ window: browser, self: browser, document: documentStub, module: { exports: Object.freeze({ priorModule: true }) }, console: console, setTimeout: setTimeout });
var html = fs.readFileSync(path.join(rootDir, "client/index.html"), "utf8");

browser.window = browser;
browser.self = browser;
scripts.forEach(function (file) {
    assert.doesNotThrow(function () {
        vm.runInContext(fs.readFileSync(path.join(rootDir, file), "utf8"), context, { filename: file });
    }, file + " must register without mutating frozen CommonJS exports");
});

assert.strictEqual(Object.isExtensible(browser), true, "browser parent namespace must remain extensible");
assert.strictEqual(typeof browser.CoreUI.createFieldRow, "function", "CoreUI.createFieldRow must be registered on window");
["createTextInput", "createTextarea", "createNumberInput", "createRangeNumber", "createSelect", "createSwitch", "createColorField", "createButton"].forEach(function (name) {
    assert.strictEqual(typeof browser.CoreUI[name], "function", "CoreUI." + name + " must exist");
});
assert(browser.AppearanceParameterRegistry, "AppearanceParameterRegistry must register");
assert(browser.AppearanceStateStore, "AppearanceStateStore must register");
assert(browser.AppearanceResolver, "AppearanceResolver must register");
assert.doesNotThrow(function () { browser.CoreUI.createFieldRow({ document: documentStub, labelText: "Theme" }); });

["js/ui/coreUi.js", "js/appearance/appearanceParameterRegistry.js", "js/appearance/appearanceStateStore.js", "js/appearance/appearanceResolver.js"].forEach(function (dependency) {
    assert(html.indexOf(dependency) >= 0, dependency + " must be loaded");
    assert(html.indexOf(dependency) < html.indexOf("js/main.js"), dependency + " must load before main.js");
});

console.log("Core UI bootstrap namespace tests passed.");
