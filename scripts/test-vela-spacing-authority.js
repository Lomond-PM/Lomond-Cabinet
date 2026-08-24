#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Registry = require("../client/js/designTuning/designTuningParameterRegistry.js");
const StoreModule = require("../client/js/designTuning/designTuningStateStore.js");
const Resolver = require("../client/js/designTuning/designTuningResolver.js");
const CoreUI = require("../client/js/ui/coreUi.js");

const root = path.resolve(__dirname, "..");
const styleCss = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8");

function rule(source, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp("(?:^|\\n)" + escaped + "\\s*\\{([^}]*)\\}"));
    return match ? match[1] : "";
}

const parameter = Registry.get("spacing.content.inlineInset");
const blockParameter = Registry.get("spacing.content.blockInset");
const cardParameter = Registry.get("spacing.card.inset");
const surfaceParameter = Registry.get("spacing.surface.edge");
assert(parameter, "Content Inline Inset must be registered.");
assert(blockParameter, "Content Block Inset must be registered.");
assert.strictEqual(Registry.list().length, 67, "Current Design Tuning Registry count is 67.");
assert.strictEqual(parameter.type, "lengthPx");
assert.strictEqual(parameter.domain, "spacing");
assert.strictEqual(parameter.cssProperty, "--space-content-inline-inset");
assert.strictEqual(parameter.canonicalSource, "computed-style");
assert.strictEqual(parameter.projection, "root-semantic-property");
assert.strictEqual(Registry.validate(parameter.id, 0).valid, true, "Content inset accepts the intrinsic non-negative boundary.");
assert.strictEqual(Registry.validate(parameter.id, -1).valid, false, "Content inset rejects negative values.");
assert(/--space-content-inline-inset:\s*calc\(12px \* var\(--ui-scale\)\)/.test(styleCss), "Canonical Content Inline Inset is UI-scaled 12px.");
assert.strictEqual(blockParameter.type, "lengthPx");
assert.strictEqual(blockParameter.domain, "spacing");
assert.strictEqual(blockParameter.group, "content");
assert.strictEqual(blockParameter.cssProperty, "--space-content-block-inset");
assert.strictEqual(blockParameter.canonicalSource, "computed-style");
assert.strictEqual(blockParameter.projection, "root-semantic-property");
assert.strictEqual(Registry.validate(blockParameter.id, 0).valid, true, "Block inset accepts the intrinsic non-negative boundary.");
assert.strictEqual(Registry.validate(blockParameter.id, -1).valid, false, "Block inset rejects negative values.");
assert(/--space-content-block-inset:\s*calc\(8px \* var\(--ui-scale\)\)/.test(styleCss), "Canonical Content Block Inset is UI-scaled 8px.");

const composer = rule(velaCss, ".vela-composer-input");
const transcript = rule(velaCss, ".vela-transcript-scroll");
const transcriptSlot = rule(velaCss, ".vela-transcript-slot");
assert(/padding-inline:\s*var\(--space-content-inline-inset\)/.test(composer), "Composer text consumes Content Inline Inset on the inline axis.");
assert(/padding-block:\s*var\(--space-content-block-inset\)/.test(composer), "Composer text consumes Content Block Inset on the block axis.");
assert(/padding-inline:\s*var\(--space-content-inline-inset\)/.test(transcript), "Conversation wrapper consumes the same Content Inline Inset authority.");
assert(/padding-block:\s*var\(--space-content-block-inset\)/.test(transcript), "Conversation wrapper consumes the same Content Block Inset authority.");
assert(!/--space-card-inset|--vela-surface-inset/.test(transcript.match(/padding-inline:[^;]+/)?.[0] || ""), "Conversation inline content is isolated from Card Inset.");
assert(!/--space-card-inset|--vela-surface-inset|--vela-inline-gap/.test(transcript.match(/padding-block:[^;]+/)?.[0] || ""), "Conversation block content is isolated from shell and general rhythm authorities.");
assert(!/--vela-inline-gap/.test(composer), "General Vela rhythm no longer owns Composer text padding.");
assert(/padding:\s*var\(--vela-surface-inset\)/.test(transcriptSlot), "Card Inset still owns shell-to-Conversation spacing.");
assert(!/--vela-composer-padding-inline/.test(velaCss), "The local Composer literal authority is retired.");

[".vela-settings-surface", ".vela-settings-header", ".vela-settings-content"].forEach((selector) => {
    const declarations = rule(styleCss, selector);
    assert(/padding:\s*var\(--space-surface-edge\)/.test(declarations), selector + " consumes Surface Edge.");
    assert(!/--space-card-inset|--vela-surface-inset/.test(declarations), selector + " is decoupled from Card Inset.");
});
assert(/\.vela-settings-content\s*\{[^}]*gap:\s*var\(--space-settings-section-stack\)/.test(styleCss), "Vela Settings section stacking retains its existing authority.");

const memory = { data: {}, getItem(key) { return this.data[key] || null; }, setItem(key, value) { this.data[key] = value; } };
const store = StoreModule.create({ storage: memory, registry: Registry });
store.load();
const projected = {};
const resolver = Resolver.create({
    registry: Registry,
    store,
    rootStyle: { setProperty(key, value) { projected[key] = value; }, removeProperty(key) { delete projected[key]; } },
    readComputed(key) {
        if (key === "--space-content-inline-inset") { return "12px"; }
        if (key === "--space-content-block-inset") { return "8px"; }
        if (key === "--space-card-inset") { return "12px"; }
        if (key === "--space-surface-edge") { return "22px"; }
        return "0px";
    },
    getCanonicalDuration() { return 0; },
    parseShadow: CoreUI.parseShadowValue,
    serializeShadow: CoreUI.serializeShadowValue,
    parseColorAlpha: CoreUI.parseColorAlphaValue,
    serializeColorAlpha: CoreUI.serializeColorAlphaValue
});
resolver.initialize();
assert.strictEqual(resolver.getEvidence("spacing").resolved[parameter.id], 12, "Clean state resolves the 12px canonical.");
assert.strictEqual(resolver.getEvidence("spacing").resolved[blockParameter.id], 8, "Clean state resolves the 8px block canonical.");
assert.strictEqual(resolver.setTransientOverride(parameter.id, 19), true);
assert.strictEqual(projected[parameter.cssProperty], "calc(19px * var(--ui-scale))", "Transient override projects through UI Scale.");
assert.deepStrictEqual(resolver.getTransientOverrides(), { "spacing.content.inlineInset": 19 });
assert.strictEqual(projected[blockParameter.cssProperty], undefined, "Inline calibration does not project the block authority.");
resolver.clearTransientOverride(parameter.id);
assert.strictEqual(projected[parameter.cssProperty], undefined, "Clearing transient state restores stylesheet canonical ownership.");
assert.strictEqual(store.getOverride(parameter.id), null, "Transient isolation leaves persisted overrides clean.");
assert.strictEqual(resolver.setTransientOverride(blockParameter.id, 15), true);
assert.strictEqual(projected[blockParameter.cssProperty], "calc(15px * var(--ui-scale))", "Block transient override projects independently through UI Scale.");
assert.strictEqual(projected[parameter.cssProperty], undefined, "Block calibration does not project the inline authority.");
assert.deepStrictEqual(resolver.getTransientOverrides(), { "spacing.content.blockInset": 15 });
resolver.clearTransientOverride(blockParameter.id);
assert.strictEqual(projected[blockParameter.cssProperty], undefined, "Clearing block transient state restores stylesheet canonical ownership.");
assert.strictEqual(store.getOverride(blockParameter.id), null, "Block transient isolation leaves persisted overrides clean.");
assert.strictEqual(resolver.setTransientOverride(cardParameter.id, 25), true);
assert.strictEqual(projected[cardParameter.cssProperty], "calc(25px * var(--ui-scale))", "Card transient projects only through the shell authority.");
assert.strictEqual(projected[parameter.cssProperty], undefined);
assert.strictEqual(projected[blockParameter.cssProperty], undefined);
assert.strictEqual(projected[surfaceParameter.cssProperty], undefined);
resolver.clearTransientOverride(cardParameter.id);
assert.strictEqual(store.getOverride(cardParameter.id), null, "Card transient leaves persisted overrides clean.");
assert.strictEqual(resolver.setTransientOverride(surfaceParameter.id, 31), true);
assert.strictEqual(projected[surfaceParameter.cssProperty], "calc(31px * var(--ui-scale))", "Surface transient projects only through the Settings edge authority.");
assert.strictEqual(projected[cardParameter.cssProperty], undefined);
assert.strictEqual(projected[parameter.cssProperty], undefined);
assert.strictEqual(projected[blockParameter.cssProperty], undefined);
resolver.clearTransientOverride(surfaceParameter.id);
assert.strictEqual(store.getOverride(surfaceParameter.id), null, "Surface transient leaves persisted overrides clean.");
assert.strictEqual(resolver.setOverride(parameter.id, 17), true, "Commit uses the ordinary typed Design Tuning path.");
assert.strictEqual(store.getOverride(parameter.id), 17);
assert.strictEqual(resolver.resetParameter(parameter.id), true, "Reset uses the ordinary Design Tuning path.");
assert.strictEqual(store.getOverride(parameter.id), null);
assert.strictEqual(projected[parameter.cssProperty], undefined);

console.log("PASS Vela spacing authority convergence: 67-parameter Registry, axis canonical parity, consumer isolation, transient/commit/reset, UI Scale.");
