#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const Registry = require(path.join(root, "client/js/designTuning/designTuningParameterRegistry.js"));
const Store = require(path.join(root, "client/js/designTuning/designTuningStateStore.js"));
const Resolver = require(path.join(root, "client/js/designTuning/designTuningResolver.js"));
const CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");
const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

const roles = {
    "surface.conversation": { property: "--surface-conversation", canonical: "rgba(17, 16, 12, 1)", structured: { color: "#11100c", alpha: 1 } },
    "surface.utilityChrome": { property: "--surface-utility-chrome", canonical: "rgba(18, 17, 14, 1)", structured: { color: "#12110e", alpha: 1 } },
    "surface.utilityAction": { property: "--surface-utility-action", canonical: "rgba(16, 63, 103, 1)", structured: { color: "#103f67", alpha: 1 } },
    "surface.neutralAction": { property: "--action-neutral-surface", canonical: "rgba(60, 82, 105, 1)", structured: { color: "#3c5269", alpha: 1 } },
    "surface.dangerAction": { property: "--danger-surface", canonical: "rgba(255, 107, 95, 0.22)", structured: { color: "#ff6b5f", alpha: 0.22 } }
};
Object.keys(roles).forEach(id => {
    const parameter = Registry.get(id);
    assert.ok(parameter && parameter.type === "colorAlpha" && parameter.cssProperty === roles[id].property, id + " is a reusable typed authority");
    assert.strictEqual(parameter.validity, undefined, id + " adds no Design-Tuning-specific bounds");
    assert.ok(css.includes(roles[id].property + ": " + roles[id].canonical), id + " preserves its canonical color");
    assert.deepStrictEqual(CoreUI.parseColorAlphaValue(roles[id].canonical), roles[id].structured, id + " canonical is valid before startup Settings calibration rendering");
});
assert.ok(/\.vela-surface\s*\{[\s\S]{0,1800}background:\s*var\(--surface-conversation\)/.test(velaCss), "Vela main surface consumes Conversation Surface");
assert.ok(/\.status-pill\s*\{[\s\S]{0,900}background:\s*var\(--surface-utility-chrome\)/.test(css), "Global Status consumes Utility Chrome Surface");
assert.ok(/\.ui-button--navigation,\s*\.utility-action\s*\{[\s\S]{0,400}background:\s*var\(--surface-utility-action\)/.test(css), "generic navigation and all explicit utility actions share Utility Action Surface");
[
    /class="[^"]*utility-action[^"]*home-edit-button[^"]*"\s+id="editHomeBtn"/,
    /class="[^"]*utility-action[^"]*tool-bootstrap-retry[^"]*"\s+id="toolBootstrapRetry"/,
    /class="[^"]*utility-action[^"]*back-button[^"]*"\s+id="backBtn"/,
    /class="[^"]*utility-action[^"]*back-button[^"]*"\s+id="closeSettingsBtn"/
].forEach(pattern => assert.ok(pattern.test(html), "static utility action consumer is connected"));
assert.ok(/panel-button utility-action vela-settings-button/.test(fs.readFileSync(path.join(root, "client/js/vela/velaSurface.js"), "utf8")), "Vela Settings consumes Utility Action Surface");
assert.ok(/panel-button utility-action vela-surface-action/.test(fs.readFileSync(path.join(root, "client/js/vela/velaComposerView.js"), "utf8")), "Vela Send/Cancel consume Utility Action Surface");
assert.ok(/panel-button utility-action vela-surface-action/.test(fs.readFileSync(path.join(root, "client/js/vela/velaConfirmationView.js"), "utf8")), "Vela Review/Approve/Reject consume Utility Action Surface");
const velaConfirmation = fs.readFileSync(path.join(root, "client/js/vela/velaConfirmationView.js"), "utf8");
assert.ok(/approve\.className = "panel-button utility-action vela-surface-action vela-compact-action"/.test(velaConfirmation), "Vela Approve retains the unchanged Utility Action presentation");
assert.ok(/reject\.className = "panel-button utility-action vela-surface-action vela-compact-action vela-reject-action"/.test(velaConfirmation), "Vela Reject retains Utility structure and adds only its destructive fill modifier");
assert.ok(/\.vela-reject-action\s*\{[^}]*background:\s*var\(--danger-surface\);[^}]*\}/.test(velaCss), "Vela Reject resting fill consumes Danger Action Surface");
assert.ok(/\.vela-reject-action:not\(:disabled\):hover\s*\{[^}]*background:\s*var\(--action-danger-hover-surface\);[^}]*\}/.test(velaCss), "Vela Reject hover fill consumes the existing Danger hover authority");
const rejectRule = (/\.vela-reject-action\s*\{([^}]*)\}/.exec(velaCss) || ["", ""])[1];
assert.ok(!/(?:border|color|radius|padding|width|height|shadow|transform)\s*:/.test(rejectRule), "Reject modifier owns no Utility border, foreground, geometry, elevation, or interaction structure");
assert.ok(!/ui-button--danger/.test(velaConfirmation), "Reject is not remapped to the complete Danger button variant");
assert.ok(/byId\("toolBootstrapRetry"\)\.addEventListener\("click", function \(\) \{[\s\S]{0,240}coreBootstrapController\.retry\(\)/.test(main), "Retry keeps its existing recovery behavior and routing");
assert.ok(!/surface\.recoveryAction|--surface-recovery-action|retry-(?:button-)?(?:surface|color)/i.test(css + velaCss + html + main), "no recovery-specific color authority is introduced");
assert.ok(/\.info-panel\s*\{[^}]*border:\s*1px solid var\(--field-border\);[^}]*background:\s*var\(--field-surface\);/.test(css), "Tool Description and Host Status cards consume Field presentation tokens");
assert.ok(/\.registry-text-input,[\s\S]{0,500}background:\s*var\(--field-surface\)/.test(css), "Registry Path remains the editable Field Surface negative control");
assert.ok(/fieldType === "info" \|\| fieldType === "note"[\s\S]{0,180}row\.className = "registry-info-note registry-schema-field"/.test(main), "Registry info/note schema fields render the read-only helper-card consumer");
assert.ok(/\.registry-info-note:not\(\.registry-procedural-preview\)\s*\{[^}]*border:\s*1px solid var\(--field-border\);[^}]*background:\s*var\(--field-surface\);/.test(css), "Registry description/helper cards consume Field presentation directly");
assert.ok(!/\.registry-info-note\s*\{[^}]*(?:background:\s*#080706|border:\s*1px solid var\(--separator\))/.test(css), "Registry helper-card base no longer owns the legacy black surface");
assert.ok(/\.registry-info-note\s*\{[^}]*color:\s*var\(--text-tertiary\)/.test(css), "Registry helper copy retains the existing semantic supporting-text foreground");
assert.ok(!/fieldType === "info" \|\| fieldType === "note"[\s\S]{0,420}(?:createTextInput|contenteditable|role\s*=\s*["']textbox)/.test(main), "Registry description/helper cards gain no editable input behavior");
assert.ok(!/(?:surface|color)\.(?:description|helper|registryDescription|registryHelp)|--(?:description|helper|registry-description|registry-help)-(?:surface|color)/i.test(css + velaCss + html + main), "no Description or Helper color authority is introduced");
assert.strictEqual(Registry.get("surface.card"), null, "Control-Lab-only Card Surface is not exposed as a Design Tuning mirror");
assert.ok(!/--surface-card\s*:|var\(--surface-card\)/.test(css), "retired Card Surface property has no orphan declaration or consumer");
assert.ok(/\.panel-card\s*\{[^}]*background:\s*var\(--surface-panel\)/.test(css), "Control Lab direct card consumes the production Panel Surface contract");
assert.ok(/--action-neutral-surface:\s*rgba\(60, 82, 105, 1\)/.test(css) && /\.ui-button--neutral\s*\{[^}]*background:\s*var\(--action-neutral-surface\)/.test(css), "neutral buttons consume their independently calibratable action surface");
assert.ok(/\.ui-button--danger\s*\{[^}]*background:\s*var\(--danger-surface\)/.test(css), "danger buttons consume their independently calibratable base surface");
assert.ok(/\.ui-button--danger:not\(:disabled\):hover\s*\{[^}]*background:\s*var\(--action-danger-hover-surface\)/.test(css), "Danger hover remains independent from the calibrated base surface");
assert.ok(/\.vela-reject-action\s*\{[^}]*var\(--danger-surface\)/.test(velaCss) && !/\.vela-reject-action\s*\{[^}]*var\(--surface-utility-action\)/.test(velaCss), "Reject fill follows Danger calibration rather than Utility Action Surface");
assert.ok(Registry.coverage().some(item => item.id === "appearance.action.primary.surface" && item.disposition === "MIRROR_EXISTING_AUTHORITY"), "Primary Action remains exposed through its existing Appearance authority");
assert.ok(/\.ui-number-input,[\s\S]{0,240}background:\s*var\(--field-surface\)/.test(css), "number and editable controls consume Field Surface independently");
assert.ok(/\.ui-bezier-view-selector\s*\{[^}]*background:\s*var\(--field-surface\)/.test(css) && /\.ui-bezier-viewport\s*\{[^}]*background:\s*var\(--field-surface\)/.test(css), "Bezier child controls consume Field Surface instead of a container token");
assert.ok(/\.ui-shadow-field\s*\{[^}]*display:\s*grid/.test(css) && !/\.ui-shadow-field\s*\{[^}]*surface-card/.test(css), "ShadowField layout has no Card Surface fallback");
assert.ok(!/"surface\.card"/.test(fs.readFileSync(path.join(root, "client/js/appearance/appearanceParameterRegistry.js"), "utf8")), "Appearance no longer exposes the test-fixture authority");
assert.ok(!/selectionPill|selection-chip/.test(html + main + css), "redundant top-right selection status consumer and updater are removed");
assert.ok(/function renderSelectionSummary[\s\S]{0,500}setStatus\(presentation\.status/.test(main), "selection summary continues projecting through Global Status");
assert.ok(/\.status-pill\[data-tone="processing"\] \.status-light\s*\{[\s\S]{0,160}var\(--status-tone-processing\)/.test(css), "status tone remains independent from base chrome presentation");
assert.ok(/\.status-pill\[data-tone="error"\] \.status-light\s*\{[^}]*var\(--status-tone-error\)/.test(css), "error tone remains independent from base chrome presentation");
assert.strictEqual(Registry.get("radius.pill"), null, "pill radius remains outside the editable registry");
assert.ok(Registry.coverage().some(item => item.id === "radius.pill" && item.disposition === "INTENTIONALLY_NOT_TUNABLE"), "pill radius remains explicitly protected by the coverage contract");
assert.strictEqual(Registry.get("surface.navigationAction"), null, "the pre-merge narrow authority is no longer registered");
const legacyValue = { color: "#334455", alpha: 0.72 };
const legacyMemory = { value: JSON.stringify({ version: 1, overrides: { "surface.navigationAction": legacyValue } }), writes: 0, getItem() { return this.value; }, setItem(key, value) { this.value = value; this.writes += 1; } };
const migratedStore = Store.create({ storage: legacyMemory, registry: Registry });
migratedStore.load();
assert.deepStrictEqual(migratedStore.getOverride("surface.utilityAction"), legacyValue, "local pre-merge Navigation Action override migrates to Utility Action");
assert.strictEqual(JSON.parse(legacyMemory.value).overrides["surface.navigationAction"], undefined, "legacy authority is removed from persisted storage");
assert.deepStrictEqual(JSON.parse(legacyMemory.value).overrides["surface.utilityAction"], legacyValue, "migration persists only the final authority");

const memory = { value: null, writes: 0, getItem() { return this.value; }, setItem(key, value) { this.value = value; this.writes += 1; } };
let store = Store.create({ storage: memory, registry: Registry });
store.load();
const style = { values: {}, setProperty(key, value) { this.values[key] = value; }, removeProperty(key) { delete this.values[key]; } };
function createResolver(currentStore) {
    return Resolver.create({
        registry: Registry,
        store: currentStore,
        rootStyle: style,
        readComputed(property) {
            const role = Object.values(roles).find(item => item.property === property);
            return role ? role.canonical : "12px";
        },
        getCanonicalDuration() { return 160; },
        parseShadow: CoreUI.parseShadowValue,
        serializeShadow: CoreUI.serializeShadowValue,
        parseColorAlpha: CoreUI.parseColorAlphaValue,
        serializeColorAlpha: CoreUI.serializeColorAlphaValue
    });
}
let resolver = createResolver(store);
resolver.initialize();
const next = { color: "#345678", alpha: 0.41 };
const writes = memory.writes;
assert.strictEqual(resolver.setTransientOverride("surface.neutralAction", next), true, "Neutral Action accepts an isolated transient calibration");
assert.strictEqual(style.values["--action-neutral-surface"], "rgba(52, 86, 120, 0.41)", "Neutral Action projects live to its own property");
assert.strictEqual(style.values["--surface-utility-action"], undefined, "Neutral Action transient does not affect Utility Action");
assert.strictEqual(style.values["--surface-panel"], undefined, "Neutral Action transient does not affect Panel Surface");
assert.strictEqual(style.values["--field-surface"], undefined, "Neutral Action transient does not affect Field Surface");
resolver.clearTransientOverride("surface.neutralAction");
Object.keys(roles).forEach(id => assert.strictEqual(resolver.setTransientOverride(id, next), true, id + " accepts transient calibration"));
Object.values(roles).forEach(role => assert.strictEqual(style.values[role.property], "rgba(52, 86, 120, 0.41)", role.property + " projects live"));
assert.strictEqual(style.values["--surface-panel"], undefined, "Action calibration does not project Panel Surface");
assert.strictEqual(style.values["--field-surface"], undefined, "Action calibration does not project Field Surface");
assert.strictEqual(memory.writes, writes, "transient calibration does not persist");
Object.keys(roles).forEach(id => assert.strictEqual(resolver.commitTransientOverride(id, next), true, id + " commits through the shared store"));
store = Store.create({ storage: memory, registry: Registry });
store.load();
Object.keys(roles).forEach(id => assert.deepStrictEqual(store.getOverride(id), next, id + " reloads its persisted structured value"));
resolver = createResolver(store);
resolver.initialize();
Object.keys(roles).forEach(id => resolver.resetParameter(id));
Object.values(roles).forEach(role => assert.strictEqual(style.values[role.property], undefined, role.property + " reset restores stylesheet canonical ownership"));

console.log("Calibration consumer gap tests passed.");
