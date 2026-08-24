#!/usr/bin/env node
"use strict";
const assert = require("assert");
const CoreUI = require("../client/js/ui/coreUi.js");
const canonical = [
    "0 18px 48px rgba(0, 0, 0, 0.38)",
    "0 4px 10px rgba(0, 0, 0, 0.18)",
    "0 12px 26px rgba(0, 0, 0, 0.34)",
    "0 14px 28px rgba(0, 0, 0, 0.42)",
    "0 12px 30px rgba(0, 0, 0, 0.28)"
];
canonical.forEach(value => {
    const parsed = CoreUI.parseShadowValue(value);
    assert.ok(parsed && CoreUI.isValidShadowValue(parsed), value + " parses as the bounded contract");
    assert.ok(CoreUI.parseShadowValue(CoreUI.serializeShadowValue(parsed)), value + " round-trips");
});
assert.strictEqual(CoreUI.parseShadowValue("inset 0 1px 2px #000"), null, "inset is rejected");
assert.strictEqual(CoreUI.parseShadowValue("0 1px 2px #000, 0 2px 4px #000"), null, "multi-layer is rejected");
assert.strictEqual(CoreUI.parseShadowValue("0 var(--y) 2px rgba(0,0,0,.2)"), null, "CSS functions are rejected");
assert.strictEqual(CoreUI.serializeShadowValue({ offsetX: 0, offsetY: 1, blur: -1, spread: 0, color: "#000000", alpha: 1 }), "", "invalid structured values do not serialize");
assert.strictEqual(typeof CoreUI.createShadowField, "function", "ShadowField is a generic CoreUI component");
console.log("CoreUI ShadowField contract tests passed.");
