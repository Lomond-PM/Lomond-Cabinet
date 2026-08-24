"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const style = fs.readFileSync(path.join(__dirname, "../client/css/style.css"), "utf8");
const resolver = fs.readFileSync(path.join(__dirname, "../client/js/appearance/appearanceResolver.js"), "utf8");
let assertions = 0;
function ok(value, message) { assertions += 1; assert.ok(value, message); }

const aliases = {
    "interaction-focus-ring": "gold-focus",
    "interaction-focus-border": "gold-focus",
    "interaction-hover-border": "gold-focus",
    "interaction-hover-surface": "gold-track",
    "interaction-selected-surface": "gold-track",
    "interaction-selected-foreground": "gold-hot",
    "interaction-checked-surface": "gold-track",
    "action-primary-surface": "gold-button",
    "action-primary-hover-surface": "gold-hot",
    "action-primary-foreground": "text-on-accent",
    "selection-indicator-surface": "selection-bg"
};
for (const [semantic, source] of Object.entries(aliases)) {
    ok(style.includes("--" + semantic + ": var(--" + source + ");"), semantic + " preserves its compatibility source");
    ok(resolver.includes('"' + semantic.replace(/-/g, ".").replace("interaction.focus.ring", "interaction.focus.ring") + '"') || resolver.includes('"--' + semantic + '"'), semantic + " has a resolver mapping");
}
const aliasGraph = {};
for (const match of style.matchAll(/--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\);/g)) {
    aliasGraph[match[1]] = match[2];
}
for (const start of Object.keys(aliasGraph)) {
    const seen = new Set();
    let current = start;
    while (aliasGraph[current]) {
        ok(!seen.has(current), start + " has no alias cycle");
        seen.add(current);
        current = aliasGraph[current];
    }
}
ok(/\.select-input:focus\s*\{[^}]*var\(--interaction-focus-border\)/.test(style), "native select focus uses focus-border semantic");
ok(/\.num-input:focus\s*\{[^}]*var\(--interaction-focus-border\)/.test(style), "number input focus uses focus-border semantic");
ok(/\.select-option\.is-selected\s*\{[^}]*var\(--interaction-selected-surface\)[^}]*var\(--interaction-selected-foreground\)/.test(style), "selected option uses selected semantics");
ok(/\.switch input:checked \+ \.switch-track\s*\{[^}]*var\(--interaction-checked-surface\)/.test(style), "checked switch uses checked semantic");
ok(/\.ui-button--primary\s*\{[^}]*var\(--action-primary-surface\)[^}]*var\(--action-primary-foreground\)/.test(style), "CoreUI primary action uses action semantics");
ok(/\.segmented-thumb\s*\{[^}]*var\(--selection-indicator-surface\)/.test(style), "segmented thumb uses selection indicator semantic");
for (const legacy of ["--gold:", "--gold-soft:", "--gold-hot:", "--gold-track:", "--gold-focus:", "--gold-button:", "--selection-bg:"]) {
    ok(style.includes(legacy), legacy + " compatibility source remains declared");
}
console.log("test-interaction-semantic-contract: " + assertions + " assertions passed.");
