#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }

const requireAttempts = [];
const context = {
    console,
    document: {},
    module: { exports: { cepSentinel: true } },
    require(specifier) {
        requireAttempts.push(specifier);
        throw new Error("CEP page script must not call Node require: " + specifier);
    }
};
context.self = context;
context.window = context;
vm.createContext(context);

[
    "client/js/vela/velaSessionRuntime.js",
    "client/js/vela/velaAgentRuntime.js",
    "client/js/vela/velaAgentCapabilityRegistry.js",
    "client/js/vela/velaHostReadSerializer.js",
    "client/js/vela/velaAgentCapabilityRuntime.js",
    "client/js/vela/velaActiveCompositionCapability.js",
    "client/js/vela/velaAgentObservationRuntime.js",
    "client/js/vela/velaAgentRuntimeOwner.js"
].forEach((file) => vm.runInContext(read(file), context, { filename: file }));

check(context.VelaSessionRuntime && typeof context.VelaSessionRuntime.createSessionLog === "function", "CEP hybrid page exposes VelaSessionRuntime on browser root");
check(context.VelaAgentRuntime && typeof context.VelaAgentRuntime.createAgent === "function", "CEP hybrid page consumes root Session dependency and exposes VelaAgentRuntime");
check(context.VelaAgentCapabilityRegistry && typeof context.VelaAgentCapabilityRegistry.createRegistry === "function", "CEP hybrid page exposes the read/analyze Capability Registry");
check(context.VelaHostReadSerializer && typeof context.VelaHostReadSerializer.enqueue === "function", "CEP hybrid page owns one Host read serializer module");
check(context.VelaAgentCapabilityRuntime && typeof context.VelaAgentCapabilityRuntime.createCapabilityRuntime === "function", "CEP hybrid page composes Capability Runtime from root serializer");
check(context.VelaActiveCompositionCapability && typeof context.VelaActiveCompositionCapability.create === "function", "CEP hybrid page composes the active composition definition from root Registry");
check(context.VelaAgentObservationRuntime && typeof context.VelaAgentObservationRuntime.createAgentObservationRuntime === "function", "CEP hybrid page exposes Observation Runtime before Owner");
check(context.VelaAgentRuntimeOwner && typeof context.VelaAgentRuntimeOwner.createOwner === "function", "CEP hybrid page consumes root Agent dependency and exposes VelaAgentRuntimeOwner");
equal(requireAttempts.length, 0, "CEP hybrid page execution makes no Node require attempt");
check(context.module.exports.cepSentinel === true && Object.keys(context.module.exports).length === 1, "CEP page scripts do not overwrite ambient Node module exports");

const commonJsAgentRuntime = require("../client/js/vela/velaAgentRuntime");
const commonJsOwner = require("../client/js/vela/velaAgentRuntimeOwner");
check(typeof commonJsAgentRuntime.createAgent === "function", "genuine CommonJS Agent require remains available");
check(typeof commonJsOwner.createOwner === "function", "genuine CommonJS Owner require remains available");
const owner = commonJsOwner.createOwner();
check(owner.getCurrentAgent() && owner.getCurrentProjection(), "CommonJS Owner still composes Agent and Projection");

console.log("test-vela-agent-cep-hybrid-modules: " + assertions + " assertions passed");
