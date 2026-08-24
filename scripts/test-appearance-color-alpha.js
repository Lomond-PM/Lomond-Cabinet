#!/usr/bin/env node
"use strict";

/*
 * Appearance colorAlpha authority test.
 *
 * User-approved Option 1: text.secondary / text.tertiary are formal typed
 * colorAlpha AppearanceParameterRegistry parameters. The Appearance authority
 * (registry / state store / resolver / CSS projection) owns them as {color, alpha},
 * reusing the project Color+Alpha typed primitive. The Design Tuning side is
 * retired and covered by the Existing Appearance mirror (no independent value).
 *
 * Must prove: canonical parity with the historical Design Tuning values
 * (rgba(246,240,223,0.66) / rgba(246,240,223,0.42)), commit -> persist -> reload ->
 * getResolvedValue -> CSS projection are semantically identical, reset restores
 * canonical, and there is exactly one owner (Appearance). No second state.
 */
const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "..");
const Registry = require(path.join(root, "client/js/appearance/appearanceParameterRegistry.js")).AppearanceParameterRegistry;
const StoreModule = require(path.join(root, "client/js/appearance/appearanceStateStore.js")).AppearanceStateStore;
const ResolverModule = require(path.join(root, "client/js/appearance/appearanceResolver.js")).AppearanceResolver;
const DTRegistry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));

let assertions = 0;
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEqual(actual, expected, message) { assertions += 1; assert.deepStrictEqual(actual, expected, message); }
function ok(value, message) { assertions += 1; assert.ok(value, message); }

// 1. Registry: both are typed colorAlpha, user-adjustable appearance params.
const secondary = Registry.get("text.secondary");
const tertiary = Registry.get("text.tertiary");
ok(secondary && secondary.controlType === "colorAlpha" && secondary.validation.type === "colorAlpha", "text.secondary is a typed colorAlpha Appearance parameter");
ok(tertiary && tertiary.controlType === "colorAlpha" && tertiary.validation.type === "colorAlpha", "text.tertiary is a typed colorAlpha Appearance parameter");
ok(secondary.classification === "EXPOSE_NOW" && secondary.persistence === "appearance" && secondary.userAdjustable === true, "text.secondary is exposed, appearance-persisted, user-adjustable");
ok(Registry.isAppearanceOverride("text.secondary") && Registry.isAppearanceOverride("text.tertiary"), "both are Appearance overrides");
ok(!Registry.validate("text.secondary", { color: "#123456", alpha: 1.5 }).valid, "out-of-range alpha is rejected");
ok(!Registry.validate("text.secondary", "#123456").valid, "raw hex is rejected for a colorAlpha parameter");
deepEqual(Registry.validate("text.secondary", { color: "#ABCDEF", alpha: 0.37 }).value, { color: "#abcdef", alpha: 0.37 }, "validation normalizes case and returns the typed value");

// 2. Resolver canonical parity with the historical Design Tuning accepted values.
const memory = { value: null, getItem() { return this.value; }, setItem(k, v) { this.value = v; } };
const css = {};
const store = StoreModule.create({ storage: memory, registry: Registry });
const resolver = ResolverModule.create({ registry: Registry, store, rootStyle: { setProperty(n, v) { css[n] = v; } }, runtime: { applyMotionSpeed(v) { css.motionSpeed = v; } } });
resolver.initialize({ "base.accent": "#d6b25e", "base.canvas": "#050403", "layout.scale": 0.92, "motion.speed": 1 });
equal(css["--text-secondary"], "rgba(246, 240, 223, 0.66)", "secondary canonical parity with historical Design Tuning value");
equal(css["--text-tertiary"], "rgba(246, 240, 223, 0.42)", "tertiary canonical parity with historical Design Tuning value");

// 3. Commit a typed colorAlpha value -> persist -> reload -> identical resolved value + projection.
const edited = { color: "#336699", alpha: 0.5 };
ok(resolver.preview("text.secondary", edited), "valid colorAlpha preview accepted");
equal(css["--text-secondary"], "rgba(51, 102, 153, 0.5)", "preview projects rgba without persistence");
equal(resolver.getOverride("text.secondary"), null, "preview does not persist");
resolver.clearPreview("text.secondary");
equal(css["--text-secondary"], "rgba(246, 240, 223, 0.66)", "clearing preview restores canonical");

ok(resolver.commit("text.secondary", edited), "colorAlpha commit accepted");
deepEqual(resolver.getOverride("text.secondary"), edited, "override stores the typed {color, alpha}");
deepEqual(resolver.getResolvedValue("text.secondary"), { color: "#336699", alpha: 0.5 }, "resolved value is the typed colorAlpha");
equal(css["--text-secondary"], "rgba(51, 102, 153, 0.5)", "committed colorAlpha projects rgba");

// reload from persisted state.
const reloadStore = StoreModule.create({ storage: memory, registry: Registry });
reloadStore.load();
const reloadRes = ResolverModule.create({ registry: Registry, store: reloadStore, rootStyle: { setProperty(n, v) { css[n] = v; } }, runtime: { applyMotionSpeed(v) { css.motionSpeed = v; } } });
reloadRes.initialize({ "base.accent": "#d6b25e", "base.canvas": "#050403", "layout.scale": 0.92, "motion.speed": 1 });
deepEqual(reloadRes.getOverride("text.secondary"), { color: "#336699", alpha: 0.5 }, "persisted colorAlpha round-trips after reload");
deepEqual(reloadRes.getResolvedValue("text.secondary"), { color: "#336699", alpha: 0.5 }, "reloaded resolved value is identical");
equal(css["--text-secondary"], "rgba(51, 102, 153, 0.5)", "reloaded projection is identical");

// 4. reset/default restores the canonical rgba.
reloadRes.reset("text.secondary");
equal(css["--text-secondary"], "rgba(246, 240, 223, 0.66)", "reset restores canonical rgba");

// 5. Single owner: Design Tuning no longer owns these; they are Appearance mirrors.
ok(DTRegistry.get("text.secondary") === null && DTRegistry.get("text.tertiary") === null, "Design Tuning registry no longer owns text.secondary/tertiary");
const mirror = DTRegistry.coverage().filter(c => c.appearanceId === "text.secondary" || c.appearanceId === "text.tertiary");
equal(mirror.length, 2, "both are covered as Existing Appearance mirrors");
mirror.forEach(c => equal(c.disposition, "MIRROR_EXISTING_AUTHORITY", c.appearanceId + " calibrates through the Appearance authority"));

console.log("Appearance colorAlpha authority tests passed: " + assertions + " assertions.");
