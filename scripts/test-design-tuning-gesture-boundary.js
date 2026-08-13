#!/usr/bin/env node
"use strict";
const assert = require("assert"); const fs = require("fs"); const path = require("path"); const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8"); const registry = fs.readFileSync(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"), "utf8");
assert.ok(/calibrationChromeIsolation/.test(registry), "interaction-critical parameters declare generic chrome isolation metadata");
assert.ok(/establishDesignTuningCalibrationChromeBaseline\(parameters\)/.test(main), "mounted Design Tuning establishes one session baseline");
assert.ok(/establishDesignTuningCalibrationChromeBaseline[\s\S]*parameter\.calibrationChromeIsolation[\s\S]*mount\.style\.setProperty/.test(main), "baseline freezes only interaction-critical semantic properties");
const begin = main.slice(main.indexOf("function beginDesignTuningCalibrationGesture"), main.indexOf("function updateDesignTuningCalibrationGesture"));
const finish = main.slice(main.indexOf("function finishDesignTuningCalibrationGesture"), main.indexOf("function cancelDesignTuningCalibrationGesture"));
assert.ok(!/style\.setProperty|style\.removeProperty|setTransientOverride/.test(begin), "pointerdown with no movement changes no semantic/style authority");
assert.ok(!/style\.removeProperty/.test(finish), "pointerup does not remove session baseline");
assert.ok(/finishCloseSettingsTransition[\s\S]*clearDesignTuningCalibrationChromeBaseline/.test(main), "Settings teardown destroys the mounted calibration baseline");
assert.ok(/lastValue = .*cloneValue\(value\)[\s\S]*setTransientOverride/.test(main), "validated source draft owns every gesture update");
assert.ok(/finalValue = .*lastValue[\s\S]*commitTransientOverride\(parameter\.id, finalValue\)/.test(finish), "finish commits the last source draft without recomputing pointer value");
assert.ok(!/refreshDesignTuningFields/.test(main.slice(main.indexOf("function updateDesignTuningCalibrationGesture"), main.indexOf("function finishDesignTuningCalibrationGesture"))), "active gesture does not refresh bindings over source draft");
console.log("Design Tuning gesture boundary contract tests passed.");
