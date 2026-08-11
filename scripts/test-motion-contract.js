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
assert.strictEqual(defaults.easings.spatialMorphExpand, "cubic-bezier(0.16, 1, 0.3, 1)");
assert.strictEqual(defaults.easings.spatialMorphContract, "cubic-bezier(0.32, 0, 0.67, 0)");

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
assert.ok(cssSource.includes("var(--motion-view-content-enter-duration)"));
assert.ok(cssSource.includes("var(--motion-view-content-exit-duration)"));
assert.ok(mainSource.includes('semanticMotionDuration("spatialMorphExpand")'));
assert.ok(mainSource.includes('semanticMotionDuration("spatialMorphContract")'));
assert.ok(mainSource.includes("var previousClassName = home.className"), "measurement must snapshot presentation state");
assert.ok(mainSource.includes("home.className = previousClassName"), "measurement must restore presentation state");
assert.ok(indexSource.indexOf("motionDefaults.js") < indexSource.indexOf("main.js"));
assert.ok(indexSource.indexOf("coreMotion.js") < indexSource.indexOf("main.js"));
assert.ok(!coreSource.includes("is-animating"), "CoreMotion must not depend on the compatibility lock");
assert.ok(!/provider|polling|debounce|long.?press|qualification|procedural/i.test(defaultsSource), "runtime timing must remain outside UI motion defaults");
assert.ok(mainSource.includes('translateY(1px) scale(0.96)') || cssSource.includes('translateY(1px) scale(0.96)'), "press geometry must remain unchanged");
assert.ok(mainSource.includes('motion.speed'));
assert.ok(mainSource.includes("0.75, 1.35"));

console.log("Motion architecture contract tests passed.");
