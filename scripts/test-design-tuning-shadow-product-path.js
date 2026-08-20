#!/usr/bin/env node
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
global.self = { CoreUI: CoreUI };
var Registry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));
var StateStore = require(path.join(root, "client/js/designTuning/designTuningStateStore.js"));
var Resolver = require(path.join(root, "client/js/designTuning/designTuningResolver.js"));
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

function ClassList() { this.values = []; }
ClassList.prototype.add = function (name) { if (this.values.indexOf(name) < 0) this.values.push(name); };
ClassList.prototype.remove = function (name) { var index = this.values.indexOf(name); if (index >= 0) this.values.splice(index, 1); };
ClassList.prototype.contains = function (name) { return this.values.indexOf(name) >= 0; };
ClassList.prototype.toggle = function (name, force) { if (force === true) this.add(name); else if (force === false) this.remove(name); else if (this.contains(name)) this.remove(name); else this.add(name); };

function Element(tag, doc) {
    this.tagName = String(tag).toUpperCase(); this.ownerDocument = doc; this.children = []; this.listeners = {}; this.attributes = {}; this.classList = new ClassList(); this.style = {}; this.value = ""; this.disabled = false; this.parentNode = null;
}
Element.prototype.setAttribute = function (name, value) { this.attributes[name] = String(value); if (name === "id") this.id = String(value); };
Element.prototype.appendChild = function (child) { this.children.push(child); child.parentNode = this; return child; };
Element.prototype.addEventListener = function (name, callback) { (this.listeners[name] || (this.listeners[name] = [])).push(callback); };
Element.prototype.removeEventListener = function (name, callback) { var list = this.listeners[name] || []; var index = list.indexOf(callback); if (index >= 0) list.splice(index, 1); };
Element.prototype.dispatch = function (name, event) { event = event || {}; if (!event.preventDefault) event.preventDefault = function () {}; if (!event.stopPropagation) event.stopPropagation = function () {}; (this.listeners[name] || []).slice().forEach(function (callback) { callback.call(this, event); }, this); };
Element.prototype.focus = function () { this.ownerDocument.activeElement = this; this.dispatch("focus"); };
Element.prototype.blur = function () { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; this.dispatch("blur"); };
Element.prototype.select = function () {};

function FakeDocument() {
    this.listeners = {}; this.activeElement = null; this.body = new Element("body", this); this.defaultView = { setTimeout: function (fn) { fn(); }, addEventListener: function () {}, removeEventListener: function () {} };
}
FakeDocument.prototype.createElement = function (tag) { return new Element(tag, this); };
FakeDocument.prototype.addEventListener = Element.prototype.addEventListener;
FakeDocument.prototype.removeEventListener = Element.prototype.removeEventListener;
FakeDocument.prototype.dispatch = Element.prototype.dispatch;

function MemoryStorage() { this.data = {}; }
MemoryStorage.prototype.getItem = function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; };
MemoryStorage.prototype.setItem = function (key, value) { this.data[key] = String(value); };

function RootStyle() { this.values = {}; }
RootStyle.prototype.setProperty = function (name, value) { this.values[name] = String(value); };
RootStyle.prototype.removeProperty = function (name) { delete this.values[name]; };

var canonicalShadows = {
    "--elevation-surface-shell": "0px 18px 48px rgba(0, 0, 0, 0.38)",
    "--elevation-primary-action": "0px 4px 10px rgba(0, 0, 0, 0.18)",
    "--elevation-utility-action": "0px 12px 30px rgba(0, 0, 0, 0.28)",
    "--elevation-floating-surface": "0px 12px 26px rgba(0, 0, 0, 0.34)",
    "--elevation-floating-picker": "0px 14px 28px rgba(0, 0, 0, 0.42)",
    "--elevation-action-container": "0px 12px 30px rgba(0, 0, 0, 0.28)",
    "--slider-thumb-optical-shadow": "0px 2px 8px rgba(0, 0, 0, 0.32)",
    "--switch-thumb-optical-shadow": "0px 2px 8px rgba(0, 0, 0, 0.28)"
};
var storage = new MemoryStorage();
var rootStyle = new RootStyle();
var store = StateStore.create({ storage: storage, registry: Registry });
store.load();
var resolver = Resolver.create({
    registry: Registry,
    store: store,
    rootStyle: rootStyle,
    readComputed: function (property) { return canonicalShadows[property] || "0"; },
    getCanonicalDuration: function () { return 260; },
    parseShadow: CoreUI.parseShadowValue,
    serializeShadow: CoreUI.serializeShadowValue,
    parseColorAlpha: CoreUI.parseColorAlphaValue,
    serializeColorAlpha: CoreUI.serializeColorAlphaValue
});
resolver.initialize();

var pickerOptions = null;
function mount(parameterId) {
    var doc = new FakeDocument();
    var parameter = Registry.get(parameterId);
    var evidence = resolver.getEvidence(parameter.domain);
    var control;
    control = CoreUI.createShadowField({
        document: doc,
        id: "designTuning-" + parameterId.replace(/\./g, "-"),
        value: evidence.resolved[parameterId],
        labels: { offsetX: "X", offsetY: "Y", blur: "Blur", spread: "Spread", color: "Color", alpha: "Opacity" },
        openPicker: function (options) { pickerOptions = options; },
        onPreview: function (next) { resolver.setTransientOverride(parameterId, next); },
        onCommit: function (next) { resolver.commitTransientOverride(parameterId, next); },
        onCancel: function () { resolver.clearTransientOverride(parameterId); control.setValue(resolver.getEvidence(parameter.domain).resolved[parameterId]); }
    });
    return { document: doc, parameter: parameter, control: control, resetDisabled: !Object.prototype.hasOwnProperty.call(evidence.overrides, parameterId) };
}

function scrub(mounted, key, pixels) {
    var input = mounted.control.inputs[key];
    input.dispatch("mousedown", { button: 0, clientX: 10 });
    mounted.document.dispatch("mousemove", { clientX: 10 + pixels });
    mounted.document.dispatch("mouseup", {});
}

var surface = mount("elevation.surfaceShell");
scrub(surface, "blur", 40);
var persisted = resolver.getEvidence("elevation").overrides["elevation.surfaceShell"];
assert.strictEqual(persisted.blur, 53, "numeric scrub commits the complete Shadow value through the rendered control callbacks");
assert.deepStrictEqual(resolver.getTransientOverrides(), {}, "numeric scrub clears its transient after commit");
assert.strictEqual(rootStyle.values["--elevation-surface-shell"], "0px 18px 53px rgba(0, 0, 0, 0.38)", "numeric commit reaches runtime CSS projection");

surface = mount("elevation.surfaceShell");
assert.strictEqual(surface.control.inputs.blur.value, "53", "Settings remount restores the committed numeric override");
surface.control.color.swatch.dispatch("click", { preventDefault: function () {}, stopPropagation: function () {} });
assert.ok(pickerOptions && pickerOptions.hexInput === surface.control.color.hex, "ShadowField forwards its real ColorField to the shared picker seam");
pickerOptions.onPreview("#112233");
assert.strictEqual(rootStyle.values["--elevation-surface-shell"], "0px 18px 53px rgba(17, 34, 51, 0.38)", "picker preview projects a complete transient Shadow value");
pickerOptions.onCommit("#445566");
persisted = resolver.getEvidence("elevation").overrides["elevation.surfaceShell"];
assert.strictEqual(persisted.color, "#445566", "picker commit persists color through the parent Shadow model");

surface = mount("elevation.surfaceShell");
assert.strictEqual(surface.control.color.hex.value, "#445566", "Settings remount restores the committed shadow color");
surface.control.color.hex.value = "#667788";
surface.control.color.hex.dispatch("input");
assert.strictEqual(resolver.getTransientOverrides()["elevation.surfaceShell"].color, "#667788", "manual HEX input previews through the complete parent Shadow model");
surface.control.color.hex.dispatch("change");
assert.strictEqual(resolver.getEvidence("elevation").overrides["elevation.surfaceShell"].color, "#667788", "manual HEX change commits through the same authority seam as the picker");
scrub(surface, "alpha", 16);
persisted = resolver.getEvidence("elevation").overrides["elevation.surfaceShell"];
assert.strictEqual(persisted.alpha, 0.4, "alpha scrub commits through the same structured Shadow lifecycle");
assert.strictEqual(surface.resetDisabled, false, "a remounted field derives enabled Reset state from active override ownership");

resolver.resetParameter("elevation.surfaceShell");
surface = mount("elevation.surfaceShell");
assert.strictEqual(surface.resetDisabled, true, "Reset enabled state derives from fresh override ownership");
assert.deepStrictEqual(surface.control.getValue(), CoreUI.parseShadowValue(canonicalShadows["--elevation-surface-shell"]), "Reset/remount restores all canonical Shadow subfields");
assert.strictEqual(rootStyle.values["--elevation-surface-shell"], undefined, "Reset removes inline projection so stylesheet canonical wins");

var elevationIds = Registry.list().filter(function (parameter) { return parameter.domain === "elevation"; }).map(function (parameter) { return parameter.id; });
assert.ok(elevationIds.indexOf("elevation.utilityAction") >= 0, "Utility Action elevation participates in the actual elevation-domain enumeration");
assert.strictEqual(mount("elevation.utilityAction").control.getValue().blur, 30, "the enumerated Utility Action field mounts from its canonical value");

var sliderOptics = mount("componentOptics.sliderThumbShadow");
scrub(sliderOptics, "blur", 10);
persisted = resolver.getEvidence("controls").overrides["componentOptics.sliderThumbShadow"];
assert.strictEqual(persisted.blur, 9, "Slider optical ShadowField scrub commits through the generic structured lifecycle");
assert.strictEqual(rootStyle.values["--slider-thumb-optical-shadow"], "0px 2px 9px rgba(0, 0, 0, 0.32)", "Slider optical override projects only to its existing semantic token");
assert.strictEqual(rootStyle.values["--switch-thumb-optical-shadow"], undefined, "Slider optical editing does not pollute Switch presentation");
sliderOptics.control.color.swatch.dispatch("click", { preventDefault: function () {}, stopPropagation: function () {} });
pickerOptions.onPreview("#123456");
assert.strictEqual(rootStyle.values["--slider-thumb-optical-shadow"], "0px 2px 9px rgba(18, 52, 86, 0.32)", "Slider optical picker preview uses transient projection");
pickerOptions.onCommit("#234567");
assert.strictEqual(resolver.getEvidence("controls").overrides["componentOptics.sliderThumbShadow"].color, "#234567", "Slider optical picker commit persists the structured value");

var switchOptics = mount("componentOptics.switchThumbShadow");
switchOptics.control.inputs.alpha.focus();
switchOptics.control.inputs.alpha.value = "0.41";
switchOptics.control.inputs.alpha.dispatch("input");
assert.strictEqual(resolver.getTransientOverrides()["componentOptics.switchThumbShadow"].alpha, 0.41, "Switch optical typing previews independently");
switchOptics.control.inputs.alpha.blur();
assert.strictEqual(resolver.getEvidence("controls").overrides["componentOptics.switchThumbShadow"].alpha, 0.41, "Switch optical typing commits through the shared ShadowField");
assert.strictEqual(rootStyle.values["--slider-thumb-optical-shadow"], "0px 2px 9px rgba(35, 69, 103, 0.32)", "Switch optical editing preserves the Slider override");

var reloadedStore = StateStore.create({ storage: storage, registry: Registry });
reloadedStore.load();
assert.strictEqual(reloadedStore.getOverride("componentOptics.sliderThumbShadow").blur, 9, "panel reload restores Slider optical persistence");
assert.strictEqual(reloadedStore.getOverride("componentOptics.switchThumbShadow").alpha, 0.41, "panel reload restores Switch optical persistence");
resolver.resetParameter("componentOptics.sliderThumbShadow");
sliderOptics = mount("componentOptics.sliderThumbShadow");
assert.deepStrictEqual(sliderOptics.control.getValue(), CoreUI.parseShadowValue(canonicalShadows["--slider-thumb-optical-shadow"]), "Slider optical reset restores all six canonical fields");
assert.strictEqual(rootStyle.values["--slider-thumb-optical-shadow"], undefined, "Slider optical reset removes inline projection");
assert.strictEqual(rootStyle.values["--switch-thumb-optical-shadow"], "0px 2px 8px rgba(0, 0, 0, 0.41)", "Slider reset does not remove the independent Switch override");
resolver.resetParameter("componentOptics.switchThumbShadow");
assert.strictEqual(rootStyle.values["--switch-thumb-optical-shadow"], undefined, "Switch optical reset restores stylesheet canonical ownership");

assert.ok(/createShadowField\(\{[\s\S]*?openPicker:\s*openCoreColorPicker[\s\S]*?onPreview:[\s\S]*?onCommit:[\s\S]*?onCancel:/.test(main), "Settings renderer supplies the complete generic ShadowField binding lifecycle");
assert.ok(/function finishDesignTuningCalibrationGesture[\s\S]*?value !== null && value !== undefined[\s\S]*?commitTransientOverride/.test(main), "the commit seam gives authority to the final structured control value");
assert.ok(/parameters\.forEach\(function \(parameter\) \{ if \(parameter\.domain === domain\) domainBody\.appendChild\(createDesignTuningScalarField\(parameter, evidence\)\); \}\)/.test(main), "Settings renders every parameter returned by the selected domain enumeration");
assert.ok(!/if\s*\(\s*parameter\.domain\s*===\s*["']elevation["']/.test(main), "the fix contains no elevation-only lifecycle special case");
assert.ok(!/componentOptics\.(?:slider|switch)ThumbShadow[\s\S]{0,300}createShadowField/.test(main), "Settings has no Slider- or Switch-specific shadow editor path");

console.log("Design Tuning Shadow product-path integration tests passed.");
