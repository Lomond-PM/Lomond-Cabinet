#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const registry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));
const Store = require(path.join(root, "client/js/designTuning/designTuningStateStore.js"));
const Resolver = require(path.join(root, "client/js/designTuning/designTuningResolver.js"));
const CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");

const primary = registry.get("radius.primaryWorkSurface");
assert.ok(primary && primary.cssProperty === "--radius-primary-work-surface" && primary.disposition === "EDITABLE", "Primary Work Surface owns one editable authority");
assert.ok(/--radius-primary-work-surface:\s*calc\(35px \* var\(--ui-scale\)\)/.test(css), "Primary Work Surface canonical is the promoted calibrated 35px value (separate from Protected radius-lg)");
assert.ok(/\.view-detail\s*\{[^}]*border-radius:\s*var\(--radius-primary-work-surface\)/.test(css), "Tool Detail consumes Primary Work Surface radius");
assert.ok(/\.settings-view \.settings-panel\s*\{[^}]*border-radius:\s*var\(--radius-primary-work-surface\)/.test(css), "Global Settings consumes Primary Work Surface radius");
assert.ok(!/--radius-settings-(?:surface|panel)|--settings-(?:surface|panel)-radius/.test(css + main), "no Settings-only duplicate radius authority exists");

assert.strictEqual(registry.validate(primary.id, 96).value, 96, "legal value above the former track max is accepted");
assert.strictEqual(registry.validate(primary.id, 100000).value, 100000, "large finite radius remains inside the open calibration domain");
assert.strictEqual(registry.validate(primary.id, -1).valid, false, "negative radius remains invalid");
assert.strictEqual(registry.validate(primary.id, Infinity).valid, false, "non-finite radius remains invalid");

const memory = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
const store = Store.create({ storage: memory, registry });
store.load();
const projected = {};
const resolver = Resolver.create({ registry, store, rootStyle: { setProperty(key, value) { projected[key] = value; }, removeProperty(key) { delete projected[key]; } }, readComputed(key) { return key === "--radius-primary-work-surface" ? "22px" : "0px"; }, getCanonicalDuration() { return 200; }, parseShadow: CoreUI.parseShadowValue, serializeShadow: CoreUI.serializeShadowValue, parseColorAlpha: CoreUI.parseColorAlphaValue, serializeColorAlpha: CoreUI.serializeColorAlphaValue });
resolver.initialize();
assert.strictEqual(resolver.setTransientOverride(primary.id, 96), true, "transient override accepts an above-track value");
assert.strictEqual(projected[primary.cssProperty], "calc(96px * var(--ui-scale))", "transient override projects through the shared authority");
assert.strictEqual(resolver.commitTransientOverride(primary.id, 96), true, "commit accepts the same open-domain value");
assert.strictEqual(JSON.parse(memory.value).overrides[primary.id], 96, "persisted override preserves the value without shrinking");
const reloaded = Store.create({ storage: memory, registry });
reloaded.load();
assert.strictEqual(reloaded.getOverride(primary.id), 96, "reload round-trips the above-track value");
resolver.resetParameter(primary.id);
assert.strictEqual(projected[primary.cssProperty], undefined, "reset removes inline projection and restores stylesheet canonical ownership");

registry.list().filter(parameter => parameter.disposition === "EDITABLE" && parameter.validity && parameter.type !== "durationMs").forEach(parameter => {
    assert.strictEqual(typeof parameter.validity.max, "undefined", parameter.id + " has no artificial calibration upper bound");
});
registry.list().filter(parameter => parameter.editing).forEach(parameter => {
    assert.ok(typeof parameter.editing.trackMin === "number" && typeof parameter.editing.trackMax === "number", parameter.id + " labels slider bounds as track-only navigation");
    assert.strictEqual(typeof parameter.editing.min, "undefined", parameter.id + " editing metadata does not duplicate accepted min");
    assert.strictEqual(typeof parameter.editing.max, "undefined", parameter.id + " editing metadata does not duplicate accepted max");
});
assert.ok(/trackMin[\s\S]*trackMax/.test(core) && /range\.min = trackMin; range\.max = trackMax/.test(core), "CoreUI RangeNumber separates track navigation from accepted numeric domain");
assert.ok(/addNumber\("offsetX", undefined, undefined[\s\S]*addNumber\("blur", 0, undefined[\s\S]*addNumber\("spread", undefined, undefined/.test(core), "ShadowField retains only intrinsic blur and alpha domains");
assert.strictEqual(registry.list().filter(parameter => parameter.protection).length, 3, "three protected identity radii remain closed");
assert.strictEqual(registry.get("radius.sectionCard").protection, "surface-transition", "Section Card protection remains unchanged");
assert.ok(/snapshotSurfaceIdentity[\s\S]*SurfaceIdentity\.snapshot/.test(main), "Surface Transition still snapshots real computed endpoints");
assert.ok(/validation = parameter\.validation[\s\S]*min: validation\.min[\s\S]*max: validation\.max/.test(main), "Appearance mirrors continue consuming source-authority validation directly");

console.log("Calibration authority convergence tests passed.");
