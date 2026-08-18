"use strict";

const assert = require("assert");
const Registry = require("../client/js/appearance/appearanceParameterRegistry.js").AppearanceParameterRegistry;
const StoreModule = require("../client/js/appearance/appearanceStateStore.js").AppearanceStateStore;
const ResolverModule = require("../client/js/appearance/appearanceResolver.js").AppearanceResolver;
let assertions = 0;
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message) { assertions += 1; assert.ok(value, message); }
function createHarness(saved, runtime) {
    const values = saved ? { [StoreModule.storageKey]: JSON.stringify(saved) } : {};
    const storage = { getItem(key) { return values[key] || null; }, setItem(key, value) { values[key] = value; } };
    const css = {};
    const store = StoreModule.create({ storage, registry: Registry });
    const resolver = ResolverModule.create({ registry: Registry, store, rootStyle: { setProperty(name, value) { css[name] = value; } }, runtime: runtime || { applyMotionSpeed(value) { css.motionSpeed = value; } } });
    return { resolver, store, css, values };
}

let harness = createHarness();
harness.resolver.initialize({ "base.accent": "#d6b25e", "base.canvas": "#050403", "layout.scale": 0.92, "motion.speed": 1 });
equal(harness.css["--bg-main"], "#050403", "base canvas resolves to its runtime target");
equal(harness.css["--surface-panel"], "#0b0a08", "design semantic default is applied");
equal(harness.css["--interaction-focus-ring"], harness.css["--gold-focus"], "focus alias is computed-equivalent to its legacy source");
equal(harness.css["--interaction-selected-surface"], harness.css["--gold-track"], "selected surface matches its legacy source");
equal(harness.css["--selection-indicator-surface"], harness.css["--selection-bg"], "selection indicator matches its compatibility source");

const oldFocus = harness.css["--interaction-focus-ring"];
harness.resolver.setBaseInput("base.accent", "#336699");
ok(harness.css["--interaction-focus-ring"] !== oldFocus, "accent change updates an unoverridden derived semantic");
harness.resolver.commit("interaction.focus.ring", "#abcdef");
equal(harness.css["--interaction-focus-ring"], "#abcdef", "explicit semantic override wins");
harness.resolver.setBaseInput("base.accent", "#884422");
equal(harness.css["--interaction-focus-ring"], "#abcdef", "accent change does not replace an explicit override");
harness.resolver.reset("interaction.focus.ring");
equal(harness.css["--interaction-focus-ring"], harness.css["--gold-focus"], "reset returns to the current derived value");

ok(harness.resolver.preview("surface.panel", "#202020"), "valid preview is accepted");
equal(harness.css["--surface-panel"], "#202020", "preview applies without persistence");
equal(harness.resolver.getOverride("surface.panel"), null, "preview does not persist");
harness.resolver.clearPreview("surface.panel");
equal(harness.css["--surface-panel"], "#0b0a08", "clearing preview restores design default");
ok(!harness.resolver.preview("surface.panel", "calc(1px)"), "arbitrary CSS preview is rejected");

harness = createHarness({ version: 1, overrides: { "surface.card": "#222222", unknown: "#ffffff" } });
harness.resolver.initialize({ "base.accent": "#d6b25e" });
equal(harness.css["--surface-card"], undefined, "startup ignores the retired test-only Card Surface override");
equal(harness.resolver.getResolvedValue("surface.card"), null, "retired Card Surface is no longer resolvable");
equal(harness.resolver.getResolvedValue("unknown"), null, "unknown persisted target is not resolved");

harness = createHarness({ version: 1, overrides: { "surface.panel": "#121212", "text.primary": "#eeeeee" } });
harness.resolver.initialize({ "base.accent": "#d6b25e" });
harness.resolver.preview("surface.panel", "#343434");
equal(harness.css["--text-primary"], "#eeeeee", "previewing authority A preserves persisted authority B at runtime");
harness.resolver.clearPreview("surface.panel");
equal(harness.css["--surface-panel"], "#121212", "clearing transient A reveals persisted A rather than canonical");
harness.resolver.commit("surface.panel", "#454545");
equal(harness.css["--text-primary"], "#eeeeee", "committing authority A preserves unrelated authority B");

let committedCanvas = null;
harness = createHarness(null, { commitBaseInput(id, value) { committedCanvas = { id, value }; return true; } });
harness.resolver.initialize({ "base.canvas": "#050403" });
harness.resolver.preview("base.canvas", "#101010");
ok(harness.resolver.commit("base.canvas", "#202020"), "settings-backed authority commit succeeds through existing runtime authority");
equal(harness.css["--bg-main"], "#202020", "settings-backed commit clears transient state and immediately projects committed value");
equal(committedCanvas.id + ":" + committedCanvas.value, "base.canvas:#202020", "settings-backed persistence callback receives the committed authority value");
console.log("test-appearance-resolver: " + assertions + " assertions passed.");
