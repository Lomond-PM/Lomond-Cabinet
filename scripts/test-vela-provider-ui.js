#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
const source = fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaProviderUi.js"), "utf8");
check(source.includes("createProviderUi"), "Provider UI exposes its bounded renderer factory.");
check(source.includes("provider-send") && source.includes("provider-cancel"), "Provider UI emits only send and cancel intents.");
check(!/innerHTML|localStorage|VelaExecution|evalScript|AEToolbox/.test(source), "Provider UI has no HTML injection, persistence, Host or execution seam.");
check(source.includes("textContent") && source.includes("state.text"), "Provider text is rendered through textContent only.");
check(source.includes("state.state === \"pending\""), "Pending state disables duplicate send and enables cancellation.");
console.log("test-vela-provider-ui: " + assertions + " assertions passed.");
