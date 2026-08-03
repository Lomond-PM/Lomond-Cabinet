#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "client", "js", "vela", "velaActivationPolicy.js");
const moduleApi = require(FILE).VelaActivationPolicy;
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }

function run() {
    const policy = moduleApi.getPolicy();
    check(Object.isFrozen(moduleApi) && Object.isFrozen(policy), "Activation module and policy are frozen.");
    equal(policy.releaseMode, "experimental-preview", "Release mode is fixed to Experimental Preview.");
    equal(policy.experimentalOptInAllowed, true, "Explicit experimental session opt-in remains available.");
    equal(policy.productionEnabled, false, "Production activation is locked off.");
    equal(policy.productionBlockReason, "no-qualified-default-model", "Production has the stable local block reason.");
    equal(policy.qualifiedDefaultModelId, null, "No qualified default model is declared.");
    equal(policy.legacyFallbackRetained, true, "Legacy Vela fallback remains retained.");
    equal(policy.formalUiD2Enabled, false, "Formal UI-D2 default enablement remains off.");
    check(moduleApi.isTrustedPolicy(policy), "Only the module-owned policy has trusted identity.");
    check(!moduleApi.isTrustedPolicy(Object.freeze(Object.assign({}, policy))), "A shape-equivalent injected policy is not trusted.");
    check(!Object.keys(policy).some((key) => /proposal|candidate|plan|nonce|digest|authority|host/i.test(key)), "Activation policy holds no execution authority or transient identity.");

    const context = { Object };
    context.self = context;
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(FILE, "utf8"), context, { filename: "velaActivationPolicy.js" });
    const descriptor = Object.getOwnPropertyDescriptor(context, "VelaActivationPolicy");
    check(descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") && !descriptor.get && !descriptor.set, "Browser export is an own data property.");
    equal(descriptor.writable, false, "Browser export is not writable.");
    equal(descriptor.configurable, false, "Browser export is not configurable.");
    check(context.VelaActivationPolicy.isTrustedPolicy(context.VelaActivationPolicy.getPolicy()), "Browser policy retains module-owned identity.");

    const source = fs.readFileSync(FILE, "utf8");
    check(!/localStorage|sessionStorage|fetch|XMLHttpRequest|Provider|transcript|response|readiness|acknowledg/i.test(source), "Policy has no storage, network, model-response, transcript, readiness, or acknowledgement input seam.");
    console.log("test-vela-activation-policy: " + assertions + " assertions passed.");
}

run();
