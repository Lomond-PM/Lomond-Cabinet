#!/usr/bin/env node
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");

assert(/function createRangeNumber[\s\S]*classNames: "ui-range-number /m.test(core), "CoreUI RangeNumber owns a stable outer component class");
assert(/\.ui-range-number\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*grid-template-columns:\s*max-content minmax\(0, 1fr\);[^}]*gap:/m.test(css), "RangeNumber owns value plus remaining-track topology");
assert(/\.ui-range-number > \.ui-range\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;/m.test(css), "slider can grow into and shrink within the remaining column");
assert(/\.ui-number-input,[\s\S]*?\.num-input\s*\{[^}]*width:\s*calc\(66px \* var\(--ui-scale\)\);[^}]*min-width:\s*56px;/m.test(css), "numeric control retains a readable component-owned width");
assert(/@media \(max-width: 380px\)[\s\S]*?\.ui-range-number\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/m.test(css), "RangeNumber owns its narrow stacked topology");
assert(!/\.registry-range-control\s*\{[^}]*grid-template-columns:/m.test(css), "Registry cannot duplicate RangeNumber topology");
assert(!/\.settings-field--range \.settings-field-control\s*\{[^}]*(?:display|grid-template-columns|gap):/m.test(css), "Settings cannot override RangeNumber topology");
assert(!/\.(?:settings-design-tuning|registry-control-lab)[^{]*\.ui-range\s*\{/m.test(css), "feature surfaces cannot patch shared slider geometry");
assert(/createSharedSettingsRangeNumber[\s\S]*CoreUI\.createRangeNumber/m.test(main), "Settings range uses CoreUI RangeNumber");
assert(/createDesignTuningDurationField[\s\S]*CoreUI\.createRangeNumber/m.test(main), "Design Tuning range uses CoreUI RangeNumber");
assert(/fieldType === "range"[\s\S]*CoreUI\.createRangeNumber/m.test(main), "Registry range uses CoreUI RangeNumber");
assert(/function createColorField[\s\S]*createRangeNumber\(\{[\s\S]*unitText: "%"/m.test(core), "Color + Alpha uses the same RangeNumber composition");
assert(/trackMin[\s\S]*trackMax[\s\S]*range\.min = trackMin; range\.max = trackMax/m.test(core), "layout does not alter the independent navigation track domain");
assert(/\.ui-range::-webkit-slider-thumb,[\s\S]*?width:\s*calc\(26px \* var\(--ui-scale\)\)/m.test(css), "capsule thumb remains a track-internal visual contract");

console.log("RangeNumber layout contract tests passed.");
