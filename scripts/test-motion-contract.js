const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const root = require("path").resolve(__dirname, "..");
const defaultsSource = fs.readFileSync(root + "/client/js/ui/motionDefaults.js", "utf8");
const coreSource = fs.readFileSync(root + "/client/js/ui/coreMotion.js", "utf8");
const mainSource = fs.readFileSync(root + "/client/js/main.js", "utf8");
const cssSource = fs.readFileSync(root + "/client/css/style.css", "utf8");
const indexSource = fs.readFileSync(root + "/client/index.html", "utf8");

const context = { window: {}, Promise, Object, Number, Error, isFinite };
context.window.setTimeout = setTimeout;
context.window.clearTimeout = clearTimeout;
vm.createContext(context);
vm.runInContext(defaultsSource, context);
vm.runInContext(coreSource, context);

const defaults = context.window.MotionDefaults;
assert.strictEqual(defaults.resolveDuration("spatialMorphExpand", 1), 480);
assert.strictEqual(defaults.resolveDuration("spatialMorphContract", 1), 360);
assert.strictEqual(defaults.resolveDuration("actionFeedback", 1.35), 160, "action feedback must not consume major-view speed");
assert.strictEqual(defaults.resolveDuration("viewContentEnter", 0.75), 135);
assert.strictEqual(defaults.resolveDuration("toolIdentityOpen", 1), 360);
assert.strictEqual(defaults.resolveDuration("homeHandoffRestore", 1), 260);
assert.deepStrictEqual(Object.assign({}, defaults.curveFamilies), {
    enter: "--motion-curve-enter",
    exit: "--motion-curve-exit",
    standard: "--motion-curve-standard",
    press: "--motion-curve-press"
});
assert.strictEqual(defaults.roleCurveFamily.spatialMorphExpand, "enter");
assert.strictEqual(defaults.roleCurveFamily.spatialMorphContract, "exit");
assert.strictEqual(defaults.roleCurveFamily.actionFeedback, "standard");
assert.strictEqual(defaults.roleCurveFamily.actionPress, "press");

const curveValues = {
    "--motion-curve-enter": " cubic-bezier(0.16, 1, 0.3, 1) ",
    "--motion-curve-exit": "cubic-bezier(0.32, 0, 0.67, 0)",
    "--motion-curve-standard": "cubic-bezier(0.22, 1, 0.36, 1)",
    "--motion-curve-press": "cubic-bezier(0.2, 0, 0, 1)"
};
const curveView = { getComputedStyle: () => ({ getPropertyValue: (name) => curveValues[name] || "" }) };
const curveRoot = { ownerDocument: { defaultView: curveView } };
assert.strictEqual(defaults.resolveEasing("spatialMorphExpand", curveRoot), "cubic-bezier(0.16, 1, 0.3, 1)");
assert.strictEqual(defaults.resolveEasing("homeHandoffRestore", curveRoot), "cubic-bezier(0.16, 1, 0.3, 1)");
curveValues["--motion-curve-enter"] = "cubic-bezier(0.25, 1.2, 0.4, 1)";
assert.strictEqual(defaults.resolveEasing("spatialMorphExpand", curveRoot), "cubic-bezier(0.25, 1.2, 0.4, 1)", "next interaction resolves the live family override");
assert.strictEqual(defaults.resolveEasing("homeHandoffRestore", curveRoot), "cubic-bezier(0.25, 1.2, 0.4, 1)", "roles inheriting one family update together");
assert.strictEqual(defaults.resolveDuration("spatialMorphExpand", 1), 480, "curve override must not alter duration");
assert.strictEqual(defaults.resolveEasing("spatialMorphExpand", curveRoot), "cubic-bezier(0.25, 1.2, 0.4, 1)", "duration resolution must not alter curve");

const core = context.window.CoreMotion.create();
let staleRan = false;
let cleanupCount = 0;
const first = core.run("tool:A:presentation", { run(tx) { tx.addCleanup(() => { cleanupCount += 1; }); } });
const second = core.run("tool:A:presentation", { run() {} });
first.guard(() => { staleRan = true; })();
first.cancel("again");
assert.strictEqual(staleRan, false, "stale completion must be rejected");
assert.strictEqual(cleanupCount, 1, "cleanup must be idempotent");
assert.strictEqual(core.current("tool:A:presentation"), second);
const parallel = core.run("tool:B:presentation", { run() {} });
assert.ok(core.current("tool:A:presentation") && core.current("tool:B:presentation"), "different scopes must coexist");
let resizePolicyRan = false;
assert.strictEqual(core.handleResize("tool:B:presentation", (tx) => { resizePolicyRan = tx.isCurrent(); tx.cancel("resize-snap"); }), true);
assert.strictEqual(resizePolicyRan, true, "resize policy must remain domain-owned");
parallel.cancel("dom-removed");
second.cancel("route-replaced");

let reducedFinalized = false;
const reducedCore = context.window.CoreMotion.create({ shouldReduceMotion: () => true });
reducedCore.run("surface:preview", {
    run() { throw new Error("reduced motion must not start presentation"); },
    finalizeReducedMotion() { reducedFinalized = true; }
});
assert.strictEqual(reducedFinalized, true);

["actionFeedback", "surfaceState", "structuralCollapse", "viewContentEnter", "viewContentExit", "spatialMorphExpand", "spatialMorphContract"].forEach((role) => {
    assert.strictEqual(typeof defaults.durations[role], "number", role + " requires semantic duration ownership");
});
assert.ok(cssSource.includes("--motion-action-feedback-duration"));
assert.ok(cssSource.includes("--motion-collapse-duration"));
[
    ["enter", "cubic-bezier(0.16, 1, 0.3, 1)"],
    ["exit", "cubic-bezier(0.32, 0, 0.67, 0)"],
    ["standard", "cubic-bezier(0.22, 1, 0.36, 1)"],
    ["press", "cubic-bezier(0.2, 0, 0, 1)"]
].forEach(([family, value]) => {
    assert.strictEqual((cssSource.match(new RegExp("--motion-curve-" + family + ":\\s*" + value.replace(/[().]/g, "\\$&"), "g")) || []).length, 1, family + " has one canonical CSS default");
});
assert.ok(cssSource.includes("--ease-apple-out: var(--motion-curve-enter)"), "legacy CSS name is forwarding-only");
assert.ok(cssSource.includes("--ease-apple-in: var(--motion-curve-exit)"), "legacy CSS name is forwarding-only");
assert.ok(!/cubic-bezier\s*\(/.test(mainSource), "main must not own raw curve defaults");
assert.ok(!/cubic-bezier\s*\(/.test(defaultsSource), "MotionDefaults must map families without raw curve defaults");
assert.ok(mainSource.includes('semanticMotionEasing("spatialMorphExpand")'));
assert.ok(mainSource.includes('semanticMotionEasing("spatialMorphContract")'));
assert.ok(!mainSource.includes("MotionDefaults.easings"));
assert.ok(cssSource.includes("--procedural-background-drift-curve: cubic-bezier(0.22, 1, 0.36, 1)"));
assert.strictEqual((cssSource.match(/bg(?:Glow|Ring|Accent)Drift[^;]+var\(--procedural-background-drift-curve\)/g) || []).length, 3, "procedural drift owns its local curve");
assert.ok(!/bg(?:Glow|Ring|Accent)Drift[^;]+var\(--motion-curve-standard\)/.test(cssSource), "UI Standard override must not affect procedural drift");
assert.ok(cssSource.includes("statusTonePulse 1.2s ease-in-out"), "status pulse remains domain-local");
assert.ok(cssSource.includes("@media (prefers-reduced-motion: reduce)"), "CSS reduced-motion policy remains present");
assert.ok(coreSource.includes("finalizeReducedMotion"), "CoreMotion reduced-motion finalization remains present");
assert.ok(cssSource.includes("var(--motion-view-content-enter-duration)"));
assert.ok(cssSource.includes("var(--motion-view-content-exit-duration)"));
assert.ok(mainSource.includes('semanticMotionDuration("spatialMorphExpand")'));
assert.ok(mainSource.includes('semanticMotionDuration("spatialMorphContract")'));
assert.strictEqual((mainSource.match(/var previousClassName = home\.className/g) || []).length, 2, "both Home measurement helpers must snapshot presentation state");
assert.strictEqual((mainSource.match(/home\.className = previousClassName/g) || []).length, 2, "both Home measurement helpers must restore presentation state");
assert.ok(indexSource.indexOf("motionDefaults.js") < indexSource.indexOf("main.js"));
assert.ok(indexSource.indexOf("coreMotion.js") < indexSource.indexOf("main.js"));
assert.ok(!coreSource.includes("is-animating"), "CoreMotion must not depend on the compatibility lock");
assert.ok(!/provider|polling|debounce|long.?press|qualification|procedural/i.test(defaultsSource), "runtime timing must remain outside UI motion defaults");
assert.ok(cssSource.includes("transform: scale(0.96)"), "Action press scale must remain 0.96");
assert.ok(!cssSource.includes("translateY(1px) scale(0.96)"), "Action press must not retain positive translation");
assert.ok(mainSource.includes('motion.speed'));
assert.ok(mainSource.includes("0.75, 1.35"));

[0.75, 1, 1.35].forEach((scale) => {
    const expand = defaults.resolveDuration("spatialMorphExpand", scale);
    const identity = defaults.resolveDuration("toolIdentityOpen", scale);
    const content = defaults.resolveDuration("viewContentEnter", scale);
    const restore = defaults.resolveDuration("homeHandoffRestore", scale);
    const contract = defaults.resolveDuration("spatialMorphContract", scale);
    const contentStart = Math.max(0, expand - content);
    const restoreStart = Math.max(0, contract - restore);
    assert.strictEqual(contentStart + content, expand, "content completion must align with expand at scale " + scale);
    assert.ok(identity > contentStart, "identity/content overlap required at scale " + scale);
    assert.strictEqual(restoreStart + restore, contract, "Home restore must align with contract at scale " + scale);
});
assert.ok(mainSource.includes('semanticMotionDuration("spatialMorphExpand") - semanticMotionDuration("viewContentEnter")'), "content start must be derived from semantic durations");
assert.ok(mainSource.includes('semanticMotionDuration("spatialMorphContract") - semanticMotionDuration("homeHandoffRestore")'), "restore delay must be derived from semantic durations");
assert.strictEqual((mainSource.match(/semanticMotionDuration\("spatialMorphContract"\) - semanticMotionDuration\("homeHandoffRestore"\)/g) || []).length, 2, "Tool and Settings close must share completion-aligned restore timing");
assert.ok(!/schedule(?:ToolContentHandoff|HomeRestore)\([^;]+,\s*(?:100|300)\s*\)/.test(mainSource), "handoff calls must not hard-code default offsets");
assert.ok(mainSource.includes("transaction.guard(start)"), "scheduled handoffs must be stale-safe");
assert.ok(mainSource.includes("transaction.addCleanup"), "scheduled handoffs must be cancel-safe");
assert.ok(mainSource.includes('result.status === "cancelled"'), "started handoffs must clean presentation state after cancellation");
assert.ok(mainSource.includes("prepareDetailDestinationContentLayout(detail, targetRect)"), "Tool open content stage must consume the existing destination rect");
assert.ok(mainSource.includes("layoutWidth = Math.max(1, detail.clientWidth)"), "content stage must resolve final inner geometry from the destination-sized shell");
assert.ok(mainSource.includes("bindDetailDestinationContentLayout(detail, spatialMotion.transaction)"), "temporary destination layout must be transaction-bound");
assert.ok(mainSource.includes("clearDetailDestinationContentLayout(detail)"), "temporary destination layout must have idempotent cleanup");
assert.ok(cssSource.includes(".view-detail.has-destination-content-layout .detail-ui-layer"), "destination content must remain non-interactive during morph");
assert.ok(mainSource.includes('stage.setAttribute("inert", "")') && mainSource.includes('stage.removeAttribute("inert")'), "destination content focus authority must be transaction-scoped");
assert.ok(cssSource.includes(".view-detail.has-destination-content-layout .detail-content::-webkit-scrollbar"), "destination stage must suppress transitional scrollbars");
assert.ok(!/cloneNode\([^)]*detail|renderDynamicToolDetail\([^)]*\)[\s\S]{0,100}renderDynamicToolDetail/i.test(mainSource), "destination stage must not duplicate business DOM");
assert.ok(!/Timeline|SequenceEngine|AnimationTimeline/.test(mainSource + defaultsSource + coreSource), "generic timeline infrastructure is out of scope");

console.log("Motion architecture contract tests passed.");
