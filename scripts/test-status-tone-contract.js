"use strict";

const assert = require("assert");
const Contract = require("../client/js/statusTone.js").StatusToneContract;
const fs = require("fs");
const path = require("path");
let assertions = 0;
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message) { assertions += 1; assert.ok(value, message); }

equal(Contract.tones.join(","), "idle,processing,success,warning,error,disabled", "shared tone vocabulary is exact");
equal(Contract.toneForState("selection-required"), "warning", "selection-required maps to warning");
equal(Contract.toneForState("no-selection"), "warning", "no-selection maps to warning");
equal(Contract.toneForState("experimental-disabled"), "warning", "qualification-blocked experimental state maps to warning");
for (const state of ["requesting", "reviewing", "checking", "executing"]) { equal(Contract.toneForState(state), "processing", state + " maps to processing"); }
for (const state of ["successful", "ready", "completed"]) { equal(Contract.toneForState(state), "success", state + " maps to success"); }
for (const state of ["error", "failed"]) { equal(Contract.toneForState(state), "error", state + " maps to error"); }
for (const state of ["experimental-unavailable", "endpoint-invalid", "configured-model-not-loaded"]) { equal(Contract.toneForState(state), "warning", state + " maps to prerequisite warning"); }
for (const state of ["readiness-network-failed", "readiness-http-failed", "readiness-response-invalid"]) { equal(Contract.toneForState(state), "error", state + " maps to readiness error"); }
equal(Contract.toneForState("user-disabled"), "disabled", "user-disabled maps distinctly to disabled");
equal(Contract.toneForState("idle"), "idle", "ordinary waiting maps to idle");
equal(Contract.toneForState("unknown-state"), "idle", "unknown states safely fall back to idle");
equal(Contract.toneForLegacyType("busy"), "processing", "legacy busy remains processing");
equal(Contract.toneForLegacyType("ok"), "success", "legacy ok remains success");
equal(Contract.toneForLegacyType("error", "selection-required"), "warning", "explicit selection state overrides legacy error presentation");

const style = fs.readFileSync(path.join(__dirname, "../client/css/style.css"), "utf8");
const vela = fs.readFileSync(path.join(__dirname, "../client/css/velaSurface.css"), "utf8");
const main = fs.readFileSync(path.join(__dirname, "../client/js/main.js"), "utf8");
for (const tone of Contract.tones) {
    ok(style.indexOf("--status-tone-" + tone + ":") >= 0, "shared CSS declares " + tone + " token");
    ok(style.indexOf('.status-pill[data-tone="' + tone + '"]') >= 0 || tone === "idle", "global status consumes " + tone + " semantic attribute");
    ok(vela.indexOf('[data-tone="' + tone + '"] .vela-status-dot') >= 0 || tone === "idle", "Vela consumes " + tone + " semantic attribute");
}
const globalDotRule = (style.match(/\.status-light\s*\{([^}]*)\}/) || [])[1] || "";
const velaDotRule = (vela.match(/\.vela-status-dot\s*\{([^}]*)\}/) || [])[1] || "";
ok(/width:\s*var\(--status-dot-size\)/.test(globalDotRule) && /height:\s*var\(--status-dot-size\)/.test(globalDotRule), "global status uses the shared dot size");
ok(/width:\s*var\(--status-dot-size\)/.test(velaDotRule) && /height:\s*var\(--status-dot-size\)/.test(velaDotRule), "Vela uses the shared dot size");
ok(/key === "status\.noLayer"[\s\S]*?return "selection-required"/.test(main), "global status derives selection warning from explicit message keys");
ok(!/toneFor(?:State|LegacyType)\([^)]*(?:statusText|textContent|message\s*\|\|)/.test(main), "global tone mapping does not inspect localized display text");
console.log("test-status-tone-contract: " + assertions + " assertions passed.");
