#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
const runtime = fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaRuntime.js"), "utf8");
const controller = fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaProviderController.js"), "utf8");
const loader = fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaCepModuleLoader.js"), "utf8");
check(runtime.includes("sendProviderMessage") && runtime.includes("getProviderUiState"), "Runtime exposes only bounded provider UI operations.");
check(!/getProvider\(|getTransport\(|getCapture\(/.test(runtime), "Runtime does not expose provider, transport or capture objects.");
check(controller.includes('envelope.type !== "text" && envelope.type !== "error"') && controller.includes("PROVIDER_RESPONSE_INVALID"), "Plan and actionCandidate envelopes fail closed before public state.");
check(!/VelaExecution|createExecutionPreflight|createPlanStore|createActionValidator/.test(controller), "Provider controller cannot enter execution, plan or validator paths.");
check(loader.indexOf("VelaResponseParser") < loader.indexOf("VelaProviderAdapter") && loader.indexOf("VelaProviderAdapter") < loader.indexOf("VelaLocalTransport") && loader.indexOf("VelaLocalTransport") < loader.indexOf("VelaContext"), "Loader preserves provider dependency order before Context.");
console.log("test-vela-local-provider-flow: " + assertions + " assertions passed.");
