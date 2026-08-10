"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var palette = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");
var index = fs.readFileSync(path.join(root, "client/index.html"), "utf8");

function Element(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.listeners = {}; this.attributes = {}; this.style = {}; this.value = ""; this.disabled = false;
    this.classList = { values: [], add: function (name) { if (this.values.indexOf(name) < 0) this.values.push(name); }, contains: function (name) { return this.values.indexOf(name) >= 0; }, remove: function (name) { var i = this.values.indexOf(name); if (i >= 0) this.values.splice(i, 1); } };
}
Element.prototype.setAttribute = function (name, value) { this.attributes[name] = String(value); };
Element.prototype.appendChild = function (child) { this.children.push(child); child.parentNode = this; };
Element.prototype.addEventListener = function (name, callback) { (this.listeners[name] || (this.listeners[name] = [])).push(callback); };
Element.prototype.dispatch = function (name, event) { (this.listeners[name] || []).forEach(function (callback) { callback.call(this, event || {}); }, this); };
var doc = { createElement: function (tag) { return new Element(tag, doc); }, body: { style: {} }, activeElement: null, defaultView: { setTimeout: function (fn) { fn(); }, addEventListener: function () {}, removeEventListener: function () {} } };

var opened = null;
var previews = [];
var commits = [];
var field = CoreUI.createColorField({ document: doc, id: "accent", value: "#69B9CC", fallback: "#D6B25E", normalize: function (value, fallback) { return /^#[0-9a-f]{6}$/i.test(value || "") ? String(value).toUpperCase() : fallback; }, isValid: function (value) { return /^#[0-9a-f]{6}$/i.test(value); }, disabled: true, variant: "neutral", onPreview: function (value) { previews.push(value); }, onCommit: function (value) { commits.push(value); }, openPicker: function (options) { opened = options; } });
assert(field.root.classList.contains("ui-color-field"));
assert(field.swatch.classList.contains("ui-color-swatch"));
assert(field.hex.classList.contains("ui-color-hex"));
assert.strictEqual(field.input.disabled, true);
assert.strictEqual(field.hex.disabled, true);
assert.strictEqual(field.swatch.disabled, true);
assert.strictEqual(field.input.value, "#69B9CC");
assert.strictEqual(field.hex.value, "#69B9CC");
assert.strictEqual(field.swatch.style.backgroundColor, "#69B9CC");
assert.strictEqual(field.root.style.backgroundColor, undefined, "dynamic color must not leak onto the neutral wrapper");
field.swatch.dispatch("click", { preventDefault: function () {}, stopPropagation: function () {} });
assert(opened && opened.hexInput === field.hex && opened.swatch === field.swatch, "ColorField must inject its real DOM into the picker seam");
assert.strictEqual(opened.value, "#69B9CC", "picker must open from the current value, not the constructor fallback");
opened.onPreview("#445566");
opened.onCommit("#778899");
assert.deepStrictEqual(previews, ["#445566"]);
assert.deepStrictEqual(commits, ["#778899"]);
assert.strictEqual(field.input.value, "#778899");
assert.strictEqual(field.hex.value, "#778899");
field.setValue("#69B9CC");
assert.strictEqual(field.input.value, "#69B9CC");
assert.strictEqual(field.hex.value, "#69B9CC");
assert.strictEqual(field.swatch.style.backgroundColor, "#69B9CC");
assert.strictEqual(typeof field.input._coreColorFieldSetValue, "function", "app refresh paths need the unified Core value seam");

var danger = CoreUI.createButton({ document: doc, variant: "danger", disabled: true });
assert(danger.classList.contains("ui-button") && danger.classList.contains("ui-button--danger") && danger.disabled);

function sharedRule(left, right) {
    var pattern = new RegExp("[^{}]*\\." + left.replace(/\./g, "\\.") + "[^{}]*\\." + right.replace(/\./g, "\\.") + "[^{}]*\\{");
    return pattern.test(css);
}
assert(sharedRule("ui-text-input", "registry-text-input"));
assert(sharedRule("ui-textarea", "registry-textarea"));
assert(sharedRule("ui-select", "select-input"));
assert(sharedRule("ui-switch-track", "switch-track"));
assert(sharedRule("ui-color-swatch", "registry-color-swatch"));
assert(sharedRule("ui-choice-surface", "registry-option-card"));
assert(/\.ui-number-input,\s*\n\.num-input\s*\{[\s\S]*?border: 1px solid var\(--field-border\)/.test(css));
assert(/\.ui-range,\s*\n\.pill-slider\s*\{[\s\S]*?-webkit-appearance: none/.test(css));
assert(/\.ui-color-field,\s*\n\.registry-color-control\s*\{[\s\S]*?grid-template-columns/.test(css));
assert(/\.registry-color-channel-sliders\s*\{[\s\S]*?grid-template-rows:\s*repeat\(3, auto\);[\s\S]*?grid-auto-flow:\s*column;/.test(css), "channel source order H S V R G B must flow as HSV | RGB columns");
assert(/\.settings-field-control[\s\S]*?flex: 0 1 158px/.test(css), "Settings layout ownership must remain");
assert(/\.palette-workspace[\s\S]*?grid-template-columns/.test(css), "Palette layout ownership must remain");

assert(/function openCoreColorPicker/.test(main));
assert(/typeof input\._coreColorFieldSetValue === "function"[\s\S]*?input\._coreColorFieldSetValue\(normalized\);[\s\S]*?return;/.test(main), "Settings refresh must use the Core ColorField synchronization seam");
assert(/onPreview:[\s\S]*onCommit:[\s\S]*onCancel:/.test(main));
assert(/hasUncommittedPreview/.test(main) && /commitColor/.test(main));
assert(/closeRegistryColorPicker\("route-change"\)/.test(main));
assert(/closeColorPicker\("palette-close"\)/.test(palette));
assert(/CoreUI\.createColorField/.test(palette));
assert(/CoreUI\.createTextarea/.test(palette));
assert(/CoreUI\.createSelect/.test(palette));
assert(/CoreUI\.createButton/.test(palette));
assert(/id="settingsBackLabel"/.test(index));
assert(/pageId === "appearance" \? "common.settings" : "common.home"/.test(main));
assert(/requestBack:[\s\S]*requestWorkspaceBack/.test(palette));
assert(!/heading\.appendChild\(back\)/.test(palette), "Palette back navigation must not remain in the right action slot");

console.log("Core UI visual contract tests passed.");
