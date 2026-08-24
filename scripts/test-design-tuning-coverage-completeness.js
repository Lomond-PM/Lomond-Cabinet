#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const registry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));
const Appearance = require(path.join(root, "client/js/appearance/appearanceParameterRegistry.js")).AppearanceParameterRegistry;
const motionContext = { window: {} };
vm.createContext(motionContext);
vm.runInContext(fs.readFileSync(path.join(root, "client/js/ui/motionDefaults.js"), "utf8"), motionContext);
const MotionDefaults = motionContext.window.MotionDefaults;
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8") + "\n" + fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const coverage = registry.coverage();
const ids = coverage.map(item => item.id);
const dispositions = new Set(["EDITABLE", "MIRROR_EXISTING_AUTHORITY", "PROTECTED", "UNSUPPORTED_WITH_REASON", "INTENTIONALLY_NOT_TUNABLE"]);
assert.strictEqual(new Set(ids).size, ids.length, "coverage IDs are unique");
coverage.forEach(item => {
    assert.ok(dispositions.has(item.disposition), item.id + " has a supported disposition");
    if (item.disposition === "PROTECTED" || item.disposition === "UNSUPPORTED_WITH_REASON" || item.disposition === "INTENTIONALLY_NOT_TUNABLE") assert.ok(item.reason, item.id + " has a reason");
    if (item.derivedFrom) assert.notStrictEqual(item.disposition, "EDITABLE", item.id + " derived alias cannot own an override");
});
const motionRoles = Object.keys(MotionDefaults.durations).sort();
const coveredMotionRoles = registry.list().filter(item => item.type === "durationMs").map(item => item.motionRole).sort();
assert.deepStrictEqual(coveredMotionRoles, motionRoles, "every MotionDefaults duration role is covered");
registry.list().forEach(item => {
    assert.ok(["cubicBezier", "durationMs", "lengthPx", "percentage", "shadow", "colorAlpha"].includes(item.type), item.id + " uses a supported typed editor");
    if (item.cssProperty) {
        assert.ok(css.includes(item.cssProperty + ":"), item.id + " canonical CSS property exists");
        assert.ok((css.match(new RegExp("var\\(" + item.cssProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\)", "g")) || []).length > 0, item.id + " has a real consumer");
    }
});
const mirrors = coverage.filter(item => item.disposition === "MIRROR_EXISTING_AUTHORITY");
mirrors.forEach(item => {
    const authority = Appearance.get(item.appearanceId);
    assert.ok(authority && authority.persistence === "appearance" && authority.userAdjustable, item.id + " references an existing user authority");
    assert.strictEqual(registry.get(item.id), null, item.id + " never enters Design Tuning Store registry");
});
assert.ok(main.includes('classification !== "EXPOSE_NOW" && appearanceParameters[i].classification !== "ADVANCED_LATER"'), "calibration UI includes all visual Appearance mirrors");
assert.strictEqual(coverage.filter(item => !item.disposition).length, 0, "Unclassified / Not Yet Exposed = 0");
console.log("Design Tuning coverage completeness tests passed.");
