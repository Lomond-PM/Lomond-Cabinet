#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const contextSource = fs.readFileSync(path.join(ROOT, "client/js/vela/velaContext.js"), "utf8");
const bridgeSource = fs.readFileSync(path.join(ROOT, "client/js/vela/velaContextBridge.js"), "utf8");
const hostSource = fs.readFileSync(path.join(ROOT, "host/vela/velaContext.jsx"), "utf8");
const indexSource = fs.readFileSync(path.join(ROOT, "host/index.jsx"), "utf8");
let assertions = 0;

function check(condition, message) {
    assert.ok(condition, message);
    assertions += 1;
}

function run() {
    const tierThreeSource = hostSource.slice(hostSource.indexOf("function resolvePropertyPath"), hostSource.indexOf("function handle"));
    check(/HOST_INSTANCE_ID_PATTERN\s*=\s*\/\^host_\[a-f0-9\]\{48\}\$\//.test(contextSource), "Context core must enforce the fixed Host instance ID format.");
    check(/hostInstanceId/.test(contextSource) && /hostReloadEpoch/.test(contextSource), "Context fingerprint input must include Host authority fields.");
    check(/var captureRecords = new WeakMap\(\)/.test(bridgeSource), "Each bridge must own a private WeakMap capture store.");
    check(/var bridgeToken = Object\.freeze\(\{\}\)/.test(bridgeSource), "Each bridge must own a private token.");
    check(/CONTEXT_CAPTURE_UNTRUSTED/.test(bridgeSource) && /CONTEXT_CAPTURE_NOT_EXECUTABLE/.test(bridgeSource) && /CONTEXT_AUTHORITY_MISMATCH/.test(bridgeSource), "Bridge-local capture rejection reasons must be stable.");
    check(/function captureLayerDetails\(/.test(bridgeSource), "Bridge must expose the fixed Tier 2 capture path.");
    check(/operation:\s*"captureLayerDetails"/.test(bridgeSource), "Tier 2 bridge requests must use the fixed Host operation.");
    check(/HOST_ADAPTER_REVISION\s*=\s*"vela-context-host-v3"/.test(hostSource), "Host context adapter revision must be v3.");
    check(/RUNTIME_REVISION\s*=\s*"vela-host-runtime-v3"/.test(indexSource), "Host root runtime revision must be v3.");
    check(/var hostReloadEpoch = 1;/.test(hostSource) && /hostReloadEpoch\+\+/.test(hostSource), "Host reload authority must start at one and advance explicitly.");
    check(/MAX_TIER_TWO_LAYERS\s*=\s*8/.test(hostSource), "Tier 2 Host selection limit must be eight.");
    check(/layer\.sourceRectAtTime\(time, false\)/.test(hostSource), "Tier 2 bounds must use the fixed read-only sourceRectAtTime call.");
    check(/layer\.property\("ADBE Text Properties"\)/.test(hostSource) && /textProperties\.property\("ADBE Text Document"\)/.test(hostSource), "Tier 2 text preview must use the fixed Text Source path.");
    check(/function resolvePropertyTargets\(/.test(bridgeSource) && /operation:\s*"resolvePropertyTargets"/.test(bridgeSource), "Tier 3 bridge requests must use the fixed target-resolution operation.");
    check(/function resolvePropertyPath\(/.test(hostSource) && /MAX_PROPERTY_PATH_LEVELS\s*=\s*12/.test(hostSource), "Tier 3 Host resolution must use a bounded fixed property-path resolver.");
    check(!/readExpression|expressionDigest|\.expression\b|\.value\b|valueAtTime/.test(tierThreeSource), "Tier 3 target resolution must not read property values or expressions.");
    check(!/\bbeginUndoGroup\s*\(|\bendUndoGroup\s*\(|\.setValue\s*\(|\.setValueAtTime\s*\(|\.addProperty\s*\(|\.remove\s*\(/.test(hostSource), "Vela Host context must contain no mutation API.");
    check(!/\beval\s*\(|\bFunction\s*\(/.test(hostSource), "Vela Host context must contain no dynamic code execution.");
    check(!/(?:CSInterface|evalScript|XMLHttpRequest|WebSocket|fetch\s*\(|localStorage)/.test(contextSource + "\n" + bridgeSource), "Context core and bridge must remain independent of UI, CEP and network globals.");
    console.log("PASS Vela context target foundation: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela context target foundation - " + error.message + "\n" + (error.stack || ""));
    process.exitCode = 1;
}
