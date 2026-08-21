#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const palette = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");

function ClassList() { this.values = []; }
ClassList.prototype.add = function (name) { if (this.values.indexOf(name) < 0) this.values.push(name); };
ClassList.prototype.remove = function (name) { const index = this.values.indexOf(name); if (index >= 0) this.values.splice(index, 1); };
ClassList.prototype.contains = function (name) { return this.values.indexOf(name) >= 0; };
ClassList.prototype.toggle = function (name, force) { if (force === true) this.add(name); else if (force === false) this.remove(name); else if (this.contains(name)) this.remove(name); else this.add(name); };

function Element(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.parentNode = null; this.listeners = {}; this.attributes = {}; this.classList = new ClassList(); this.disabled = false; this.selected = false; this.textContent = ""; this.id = ""; this.scrollHeight = 120;
    this.style = { values: {}, setProperty(name, value) { this.values[name] = value; }, removeProperty(name) { delete this.values[name]; } };
    this._value = "";
}
Object.defineProperty(Element.prototype, "options", { get() { return this.tagName === "SELECT" ? this.children.filter(child => child.tagName === "OPTION") : undefined; } });
Object.defineProperty(Element.prototype, "selectedIndex", { get() { const options = this.options || []; const selected = options.findIndex(option => option.selected || option.value === this._value); return selected >= 0 ? selected : (options.length ? 0 : -1); } });
Object.defineProperty(Element.prototype, "value", {
    get() { if (this.tagName !== "SELECT") return this._value; const options = this.options || []; const selected = options[this.selectedIndex]; return selected ? selected._value : this._value; },
    set(value) { this._value = String(value); if (this.tagName === "SELECT") (this.options || []).forEach(option => { option.selected = option._value === this._value; }); }
});
Object.defineProperty(Element.prototype, "innerHTML", { get() { return ""; }, set() { this.children.forEach(child => { child.parentNode = null; }); this.children = []; } });
Element.prototype.setAttribute = function (name, value) { this.attributes[name] = String(value); };
Element.prototype.getAttribute = function (name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; };
Element.prototype.removeAttribute = function (name) { delete this.attributes[name]; };
Element.prototype.appendChild = function (child) { if (child.parentNode) child.parentNode.removeChild(child); this.children.push(child); child.parentNode = this; return child; };
Element.prototype.insertBefore = function (child, reference) { if (child.parentNode) child.parentNode.removeChild(child); const index = this.children.indexOf(reference); if (index < 0) this.children.push(child); else this.children.splice(index, 0, child); child.parentNode = this; return child; };
Element.prototype.removeChild = function (child) { const index = this.children.indexOf(child); if (index >= 0) this.children.splice(index, 1); child.parentNode = null; return child; };
Element.prototype.contains = function (node) { if (node === this) return true; return this.children.some(child => child.contains(node)); };
Element.prototype.addEventListener = function (name, callback) { (this.listeners[name] || (this.listeners[name] = [])).push(callback); };
Element.prototype.removeEventListener = function (name, callback) { const list = this.listeners[name] || []; const index = list.indexOf(callback); if (index >= 0) list.splice(index, 1); };
Element.prototype.dispatch = function (name, event) { event = event || {}; event.target = event.target || this; (this.listeners[name] || []).slice().forEach(callback => callback.call(this, event)); };
Element.prototype.dispatchEvent = function (event) { this.dispatch(event.type, event); };
Element.prototype.focus = function () { this.ownerDocument.activeElement = this; };
Element.prototype.getBoundingClientRect = function () { return { left: 20, top: 30, right: 180, bottom: 62, width: 160, height: 32 }; };
Element.prototype.querySelectorAll = function (selector) {
    const descendants = [];
    function walk(node) { node.children.forEach(child => { descendants.push(child); walk(child); }); }
    walk(this);
    return descendants.filter(node => {
        if (selector === ".select-option") return node.classList.contains("select-option");
        if (selector === ".select-option.is-selected") return node.classList.contains("select-option") && node.classList.contains("is-selected");
        if (selector === ".select-option:not(:disabled)") return node.classList.contains("select-option") && !node.disabled;
        return false;
    });
};
Element.prototype.querySelector = function (selector) { return this.querySelectorAll(selector)[0] || null; };

function EventTarget() { this.listeners = {}; }
EventTarget.prototype.addEventListener = Element.prototype.addEventListener;
EventTarget.prototype.removeEventListener = Element.prototype.removeEventListener;
EventTarget.prototype.dispatch = Element.prototype.dispatch;

const doc = new EventTarget();
const win = new EventTarget();
doc.defaultView = win; doc.documentElement = { clientWidth: 640, clientHeight: 480 }; doc.activeElement = null;
doc.createElement = tag => new Element(tag, doc);
doc.createEvent = () => ({ type: "", initEvent(name) { this.type = name; } });
doc.body = doc.createElement("body");
win.innerWidth = 640; win.innerHeight = 480;

const mount = doc.createElement("div");
doc.body.appendChild(mount);
const select = CoreUI.createSelect({ document: doc, id: "mode" });
["one", "two", "three"].forEach((value, index) => { const option = doc.createElement("option"); option.value = value; option.textContent = value.toUpperCase(); option.selected = index === 0; select.appendChild(option); });
mount.appendChild(select);
let changes = 0;
select.addEventListener("change", () => { changes += 1; });
const component = CoreUI.enhanceSelect({ document: doc, select });

assert.strictEqual(component.id, "select");
assert(component.root.classList.contains("custom-select") && component.menu.parentNode === doc.body, "creation owns replacement and body portal");
assert.strictEqual(component.viewport.children.length, 3, "dynamic mount builds the complete option viewport");
component.trigger.dispatch("click", { preventDefault() {}, stopPropagation() {} });
assert(component.root.classList.contains("is-open") && component.menu.classList.contains("is-open"), "trigger opens the shared popup");
component.viewport.children[1].dispatch("click");
assert.strictEqual(select.value, "two"); assert.strictEqual(changes, 1); assert(!component.root.classList.contains("is-open"));
component.trigger.dispatch("keydown", { keyCode: 40, preventDefault() {} });
assert.strictEqual(select.value, "three", "Arrow navigation selects through the native authority");
component.open(); doc.dispatch("click", { target: doc.body });
assert(!component.root.classList.contains("is-open"), "outside click closes the portal");
component.open(); component.trigger.dispatch("keydown", { keyCode: 27, preventDefault() {} });
assert(!component.root.classList.contains("is-open") && doc.activeElement === component.trigger, "Escape closes and restores trigger focus");
component.setDisabled(true); component.open();
assert(component.trigger.disabled && !component.root.classList.contains("is-open"), "disabled Select cannot open");
component.setDisabled(false);
select.options[0].textContent = "Updated"; component.rebuild();
assert.strictEqual(component.viewport.children[0].textContent, "Updated", "rerender explicitly rebuilds shared option presentation");
component.dispose();
assert.strictEqual(component.menu.parentNode, null); assert.strictEqual(component.root.parentNode, null); assert(!select.classList.contains("is-native-select-hidden"));
const remounted = CoreUI.enhanceSelect({ document: doc, select });
assert.notStrictEqual(remounted, component, "disposed Select can mount a fresh lifecycle without stale portal state");
remounted.dispose();

assert.ok(/function enhanceSharedSelect[\s\S]*CoreUI\.enhanceSelect/.test(main), "Registry and Settings share one active adapter seam");
assert.ok(/fieldType === "select"[\s\S]*?enhanceSharedSelect\(input\)/.test(main), "Registry invokes the adapter at creation time");
assert.ok(/createSharedSettingsSelect[\s\S]*?enhanceSharedSelect\(select\)/.test(main), "Settings invokes the same adapter seam");
assert.ok(/options\.enhanceSelect/.test(palette) && /enhanceSelect\(select\)/.test(palette), "Palette compatibility wiring actively mounts the same shared adapter");
assert.ok(!/querySelectorAll\("select\.select-input"\)/.test(main), "shared Select ownership no longer relies on a document-wide late scan");
assert.ok(!/function createCustomSelect/.test(main), "main.js no longer owns a duplicate Select component implementation");

console.log("Shared Select lifecycle contract tests passed.");
