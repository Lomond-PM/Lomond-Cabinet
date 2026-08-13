#!/usr/bin/env node
"use strict";
const assert = require("assert"); const fs = require("fs"); const path = require("path"); const root = path.resolve(__dirname, "..");
const CoreUI = require(path.join(root, "client/js/ui/coreUi.js")); const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
function element(tag, doc) { return { tagName: tag.toUpperCase(), ownerDocument: doc, children: [], style: {}, className: "", classList: { add() {} }, setAttribute() {}, addEventListener() {}, removeEventListener() {}, appendChild(child) { this.children.push(child); child.parentNode = this; return child; } }; }
const doc = { body: { classList: { add() {}, remove() {} }, style: {} }, defaultView: { addEventListener() {}, removeEventListener() {} }, createElement(tag) { return element(tag, this); } };
let hostStarted = false;
function criticalStartupPrebuild() {
    const evidence = CoreUI.createTextarea({ document: doc, classNames: "settings-design-tuning-evidence", rows: 8, value: "{}", resizeDirection: "vertical" });
    assert.ok(evidence._coreFrame && evidence._coreResizeGrip, "startup-created Evidence exposes its frame and project grip");
    assert.strictEqual(evidence._coreFrame.children[0], evidence, "legacy textarea remains the returned control inside the composition root");
}
assert.doesNotThrow(function () { criticalStartupPrebuild(); hostStarted = true; }, "critical synchronous UI prebuild reaches host bootstrap");
assert.strictEqual(hostStarted, true, "host bootstrap remains reachable after Settings/Design Tuning prebuild");
assert.ok(!/\bgetUiScale\s*\(\s*\)/.test(main), "startup path contains no call to the nonexistent getUiScale function");
assert.ok(/fieldType === "select"[\s\S]*?wrap\.appendChild\(input\);[\s\S]*?fieldType === "tabs"/.test(main), "legacy Select mounts its returned element directly");
assert.ok(/fieldType === "textarea"[\s\S]*?wrap\.appendChild\(input\._coreFrame\)/.test(main), "Textarea alone mounts the new composition root");
assert.ok(/bindEvents\(\);[\s\S]*loadHost\(\);/.test(main.slice(main.indexOf('document.addEventListener("DOMContentLoaded"'))), "production readiness entry follows successful synchronous prebuild");
console.log("Startup readiness contract tests passed.");
