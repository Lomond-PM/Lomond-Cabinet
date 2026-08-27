#!/usr/bin/env node
"use strict";

const assert = require("assert");
const ownerModule = require("../client/js/vela/velaAgentRuntimeOwner");
const capabilityRuntime = require("../client/js/vela/velaAgentCapabilityRuntime");
const activeComposition = require("../client/js/vela/velaActiveCompositionCapability");
const observationRuntime = require("../client/js/vela/velaAgentObservationRuntime");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }

(async function () {
    const pending = deferred(); let captures = 0;
    const readPort = Object.freeze({
        getState: () => Object.freeze({ state: "idle" }),
        capture: () => { captures += 1; return pending.promise; }
    });
    const owner = ownerModule.createOwner({ AgentCapabilityRuntime: capabilityRuntime, ActiveCompositionCapability: activeComposition, AgentObservationRuntime: observationRuntime, observationReadPort: readPort });
    owner.activate();
    check(owner.getObservationRuntime(), "Owner composes the focused Observation runtime when all dependencies exist");
    const first = owner.refreshActiveComposition();
    const second = owner.refreshActiveComposition();
    equal(first, second, "Owner preserves Observation single-flight without starting a second turn");
    await Promise.resolve(); await Promise.resolve();
    equal(captures, 1, "single-flight enters the Host read port once");
    pending.resolve(Object.freeze({ contextId: "owner-context", snapshot: Object.freeze({ hostInstanceId: "host-owner", hostReloadEpoch: 1, activeComp: null }) }));
    const accepted = await first;
    equal(accepted.facts.activeComposition.available, false, "composed Owner path accepts no-active-composition fact");
    check(owner.getCurrentAgent().getCurrentTurnId(), "Owner starts one Runtime-owned turn for the refresh");
    check(owner.dispose(), "Owner disposes Observation, Capability Runtime, Agent, and Session once");
    equal(owner.getObservationRuntime().isDisposed(), true, "Owner disposal reaches Observation runtime");
    check(!owner.cancelActiveCompositionRefresh(), "no terminal refresh remains cancellable");
    console.log("test-vela-agent-capability-owner: " + assertions + " assertions passed");
}()).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
