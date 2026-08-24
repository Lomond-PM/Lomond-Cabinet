#!/usr/bin/env node
"use strict";

/*
 * Primary Text <- resolved Palette secondary, explicit one-shot assignment.
 *
 * Palette SECONDARY here is the v2 proceduralAppearance role (profiles.proceduralAppearance.bindings.secondary
 * -> resolved color), resolved through PaletteResolver.resolvePalette (handles DIRECT / REFERENCE / DERIVED).
 * It is strictly distinct from Appearance.text.secondary (the colorAlpha parameter).
 *
 * The assignment is one-shot (explicit palette application only): it commits Appearance.text.primary through the
 * Appearance authority (state/resolver/persistence/CSS projection). It is NOT a live-link, is NOT triggered by
 * Palette save / store subscription / startup, and it never maps Appearance.text.secondary / text.tertiary.
 */
const path = require("path");
const root = path.resolve(__dirname, "..");
const fs = require("fs");
const PaletteResolver = require(path.join(root, "client/js/palette/paletteResolver.js"));
const Derivations = require(path.join(root, "client/js/palette/colorDerivationRegistry.js"));
const AppearanceRegistry = require(path.join(root, "client/js/appearance/appearanceParameterRegistry.js")).AppearanceParameterRegistry;
const AppearanceStoreModule = require(path.join(root, "client/js/appearance/appearanceStateStore.js")).AppearanceStateStore;
const AppearanceResolver = require(path.join(root, "client/js/appearance/appearanceResolver.js")).AppearanceResolver;
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

let assertions = 0;
function ok(v, m) { assertions += 1; if (!v) throw new Error(m); }
function eq(a, b, m) { assertions += 1; if (String(a) !== String(b)) throw new Error(m + " expected " + b + " got " + a); }

function direct(id, color) { return { id, label: id, kind: "DIRECT", value: { color } }; }
function reference(id, target) { return { id, label: id, kind: "REFERENCE", reference: { slotId: target } }; }
function derived(id, derivationId, sources, parameters) { return { id, label: id, kind: "DERIVED", derivation: { derivationId, sourceSlotIds: sources, parameters } }; }
function palette(slots, bindings) { return { id: "assignPalette", revision: 1, metadata: { displayName: "Assign Palette", family: "test", origin: "custom" }, slots, profiles: { proceduralAppearance: { bindings } } }; }

function createAppearanceHarness() {
    const mem = { value: null, getItem(k) { return this.value; }, setItem(k, v) { this.value = v; } };
    const css = {};
    const store = AppearanceStoreModule.create({ storage: mem, registry: AppearanceRegistry });
    const resolver = AppearanceResolver.create({ registry: AppearanceRegistry, store, rootStyle: { setProperty(n, v) { css[n] = v; } }, runtime: { applyMotionSpeed() {} } });
    resolver.initialize({ "base.accent": "#d6b25e", "base.canvas": "#050403", "layout.scale": 0.92, "motion.speed": 1 });
    return { store, resolver, css, mem };
}

// 1. DIRECT secondary binding.
let p = palette([direct("shadow", "#111111"), direct("base", "#112233"), direct("secondary", "#AABBCC"), direct("highlight", "#EEFFFF")], { shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" });
let r = PaletteResolver.resolvePalette(p, { registry: Derivations });
ok(r.ok, "DIRECT palette resolves");
eq(r.colors[p.profiles.proceduralAppearance.bindings.secondary], "#AABBCC", "DIRECT secondary role resolves to its direct color");

// 2. REFERENCE secondary (secondary slot REFERENCEs a DIRECT base slot).
p = palette([direct("shadow", "#111111"), direct("base", "#887766"), reference("secondary", "base"), direct("highlight", "#EEFFFF")], { shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" });
r = PaletteResolver.resolvePalette(p, { registry: Derivations });
ok(r.ok, "REFERENCE palette resolves");
eq(r.colors[p.profiles.proceduralAppearance.bindings.secondary], "#887766", "REFERENCE secondary role resolves through its dependency");

// 3. DERIVED secondary (a derived slot that mixes base + highlight through a derivation).
p = palette([direct("shadow", "#111111"), direct("base", "#203040"), direct("highlight", "#E0F0FF"), derived("secondary", "mix.v1", ["base", "highlight"], { amount: 0.5 })], { shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" });
r = PaletteResolver.resolvePalette(p, { registry: Derivations });
ok(r.ok, "DERIVED palette resolves");
ok(!!r.colors[p.profiles.proceduralAppearance.bindings.secondary] && r.colors[p.profiles.proceduralAppearance.bindings.secondary] !== "#203040", "DERIVED secondary role resolves to the derived color (not the raw base slot)");

// 4. Explicit one-shot assignment commits Appearance.text.primary through the Appearance authority.
let harness = createAppearanceHarness();
const secondary = r.colors[p.profiles.proceduralAppearance.bindings.secondary].toLowerCase();
eq(harness.resolver.getResolvedValue("text.primary"), "#f6f0df", "primary starts at canonical before assignment");
ok(harness.resolver.commit("text.primary", secondary), "reassignment commits through the Appearance authority");
eq(harness.resolver.getResolvedValue("text.primary"), secondary, "resolved Primary Text equals the palette resolved secondary");
ok(harness.store.getOverride("text.primary") === secondary, "Assignment persisted to the Appearance store");
ok(harness.css["--text-primary"] === secondary, "Primary Text CSS projection reflects the assignment");

// 5. Failure contract: an invalid secondary must NOT disturb Primary Text.
const before = harness.resolver.getResolvedValue("text.primary");
ok(!harness.resolver.commit("text.primary", ""), "invalid secondary commit returns false");
ok(!harness.resolver.commit("text.primary", "not-a-color"), "malformed secondary commit returns false");
eq(harness.resolver.getResolvedValue("text.primary"), before, "Primary Text is unchanged after failed assignment");
eq(harness.resolver.getOverride("text.primary"), before, "no invalid persisted state on failure");

// 6. Static seam contract (source of truth for the explicit-apply, one-shot semantics).
ok(/function assignPrimaryTextFromPaletteSecondary[\s\S]*CoreAppearance\.commit\("text\.primary"/.test(main), "Primary Text assignment commits through the Appearance authority");
ok(/function suggestThemeAccentFromPalette[\s\S]*assignPrimaryTextFromPaletteSecondary\(palette\.colors\.secondary\)/.test(main), "assignment is invoked on explicit palette application (same seam as Accent)");
var assignFn = main.slice(main.indexOf("function assignPrimaryTextFromPaletteSecondary"), main.indexOf("function renderSettingsColorRamp"));
ok(/CoreAppearance\.commit\("text\.primary"/.test(assignFn), "assignment commits only Appearance.text.primary");
ok(!/text\.(secondary|tertiary)/.test(assignFn), "assignment never maps Appearance.text.secondary/tertiary");
ok(!/subscribe[\s\S]{0,160}text\.primary|\.on\(\s*["']change["'][\s\S]{0,160}text\.primary/.test(main), "no live-link/subscription drives Primary Text");

console.log("Primary Text palette one-shot assignment tests passed: " + assertions + " assertions.");
