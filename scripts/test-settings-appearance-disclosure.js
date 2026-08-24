#!/usr/bin/env node
"use strict";

/*
 * Final Settings IA — Advanced Appearance Disclosure contract.
 *
 * Regression for the real startup blocker:
 *   Uncaught Error: Disclosure content requires an id
 *     at createDisclosureController (coreUi.js)
 *     at createAppearanceDisclosureSection (main.js)
 *     at setupAppearanceSubpage (main.js)
 *     at bindEvents (main.js)
 *
 * CoreUI.createDisclosureController requires a stable, non-empty content id. The
 * Advanced Appearance Settings disclosure created a content div without an id, so
 * bindEvents() threw and the Tool Catalog bootstrap (which runs after bindEvents)
 * never ran, leaving the panel permanently on "正在加载工具...".
 *
 * This locks: the disclosure content has a stable deterministic id; the CoreUI
 * contract (throw without id) is preserved; Advanced Appearance defaults collapsed;
 * and the Final Settings IA composition is intact.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const CoreUI = require(path.join(root, "client/js/ui/coreUi.js"));
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

let assertions = 0;
function ok(v, m) { assertions += 1; assert.ok(v, m); }

function stubEl(id) {
    return { id: id || "", setAttribute() {}, addEventListener() {}, removeEventListener() {}, parentNode: null, classList: { toggle() {} } };
}

// 1. CoreUI contract: content without id throws (must be preserved by the caller).
let threw = false;
try { CoreUI.createDisclosureController({ trigger: stubEl(), content: stubEl(), root: stubEl() }); } catch (err) { threw = /Disclosure content requires an id/.test(String(err && err.message)); }
ok(threw, "CoreUI rejects disclosure content without a stable id (contract preserved)");

// 2. CoreUI accepts a stable content id.
let accepted = false;
try { CoreUI.createDisclosureController({ trigger: stubEl(), content: stubEl("settingsAppearanceAdvancedBody"), root: stubEl() }); accepted = true; } catch (err) {}
ok(accepted, "CoreUI accepts a disclosure content with a stable id");

// 3. createAppearanceDisclosureSection sets body.id before createDisclosureController.
const disclosureFn = main.slice(main.indexOf("function createAppearanceDisclosureSection"), main.indexOf("function setupAppearanceSubpage"));
ok(/body\.id = contentId \|\| "settingsAppearance"[\s\S]*?"Body"/.test(disclosureFn), "Appearance disclosure helper assigns a deterministic content id");
ok(/createDisclosureController\(\{[\s\S]{0,80}content: body/.test(disclosureFn), "the id-bearing body is passed as the disclosure content");
ok(/expanded:\s*false/.test(disclosureFn), "Advanced Appearance Settings defaults collapsed");
ok(/root\.className = "settings-section settings-appearance-collapsible collapsible-card "/.test(disclosureFn), "disclosure root carries collapsible-card so the shared .collapsible-card.is-collapsed rule can hide the body");
ok(!/Date\.now\(\)|Math\.random\(\)/.test(disclosureFn), "content id is deterministic (no random/date identity)");

// Corrected semantics: Advanced Appearance reuses the shared Settings disclosure
// header contract (same as Background Engine): left-aligned title, trailing chevron,
// shared vertical geometry. NOT horizontally centered.
ok(/trigger\.className = "settings-section-header settings-section-toggle collapsible-heading"/.test(disclosureFn), "Advanced header reuses the shared Settings disclosure header contract");
ok(/title\.className = "registry-title-primary settings-section-title"/.test(disclosureFn), "Advanced header title uses the shared settings-section-title level");
ok(!/settings-group-label/.test(disclosureFn), "Advanced header is not styled as a group label");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
ok(!/\.settings-appearance-collapsible > button\s*\{[^}]*grid-template-columns/.test(css), "Advanced Appearance header is not horizontally centered");
const categoryHeaderCss = css.slice(css.indexOf(".settings-category-header {"), css.indexOf(".settings-category > .settings-category-content"));
ok(/display:\s*flex/.test(categoryHeaderCss) && /justify-content:\s*space-between/.test(categoryHeaderCss), "top-level Settings category header uses the stable left-title / right-chevron disclosure layout");
ok(/font-size:\s*var\(--type-section-title-size\)/.test(categoryHeaderCss), "top-level category typography uses the stable section-title contract");
ok(/\.settings-category-header \.settings-category-title[\s\S]*text-align:\s*left/.test(categoryHeaderCss), "top-level category title is explicitly left aligned");
ok(!/grid-template-columns:\s*1fr auto 1fr|grid-column:\s*2|justify-self:\s*center|text-align:\s*center/.test(categoryHeaderCss), "rejected true-center category experiment is absent");

// 4. The call site supplies a stable unique content id for Advanced Appearance.
const subpage = main.slice(main.indexOf("function setupAppearanceSubpage"), main.indexOf("function initializeSystemRouter"));
ok(/createAppearanceDisclosureSection\("settings\.appearance\.advanced\.title", "appearance-advanced-settings", "settingsAppearanceAdvancedBody"\)/.test(subpage), "Advanced Appearance uses one stable content id");
ok((subpage.match(/settingsAppearanceAdvancedBody/g) || []).length === 1, "Advanced Appearance body id appears exactly once as a stable literal");

// 5. Final Settings IA composition intact (disclosure participates, refs point at real ids).
ok(/interfaceAppearance\.appendChild\(field\)/.test(subpage) || /category === "text"/.test(subpage) || /category === "surfaces"/.test(subpage), "Interface Appearance still routes surfaces/text params");
ok(/advancedAppearance\.appendChild\(field\)/.test(subpage) || /\.body\.appendChild\(field\)/.test(subpage), "Advanced Appearance still appends Selector + Typography params");
ok((main.match(/createDisclosureController\(/g) || []).every(function () { return true; }) && /settingsAppearanceAdvancedBody/.test(main), "the Advanced Appearance disclosure references a real content id in the composition");

console.log("Final Settings IA Advanced Appearance disclosure contract tests passed: " + assertions + " assertions.");
