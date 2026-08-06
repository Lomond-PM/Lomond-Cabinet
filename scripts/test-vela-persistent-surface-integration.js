#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ToolCatalog = require("../client/js/toolCatalog.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("client/index.html");
const main = read("client/js/main.js");
const surface = read("client/js/vela/velaSurface.js");
const surfaceController = read("client/js/vela/velaSurfaceController.js");
const controller = read("client/js/vela/velaController.js");
const css = read("client/css/velaSurface.css") + read("client/css/style.css");
const i18n = read("client/js/i18n.js");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }

check(!/openVelaTool|data-tool=["']vela["']|vela-tool-icon|commerce-glyph/.test(html), "Home has no visible or hidden Vela legacy card or glyph.");
check(/id="velaSurfaceMount"/.test(html), "Persistent Surface mount remains in Home.");
check(/tools\.moreTools\.title/.test(html) && /tool-app app-card is-disabled/.test(html), "Disabled More Tools placeholder remains.");
check(!/velaUi\.js|velaProviderUi\.js/.test(html), "Legacy detail UI scripts are not loaded.");
check(!/renderVelaDetail|route\.kind === ["']legacy/.test(main), "main has no Vela legacy renderer or route.");
check(!/localOpacity\s*:|refreshContext\(\)|createOpacityCandidate|local-manual-opacity/.test(main), "main exposes no local manual opacity facade.");
check(!/vela-local-|surfaceLocalOpacity|manualOpacity|velaSurfaceLocalOpacityInput/.test(surface + surfaceController + css), "Persistent Surface has no local opacity presentation, input, or CSS.");
check(!/surfaceLocalOpacity|surfaceLocalTarget|surfaceLocalRefresh|manualOpacity|local-manual-opacity/.test(i18n + controller), "Local-only i18n and source markers are absent.");
check(/createBoundOpacityCandidate/.test(controller) && !/createOpacityCandidate/.test(controller), "Model proposal candidate factory has a non-manual internal contract.");

const catalog = ToolCatalog.createCatalog();
catalog.registerSystemSurface({ id: "velaPersistentSurface" });
catalog.registerSystemSurface({ id: "settings" });
catalog.setRegistryTools([
    { id: "alpha", titleKey: "tools.alpha.title", sections: [], actions: [], i18n: { en: {}, "zh-CN": {} } },
    { id: "beta", titleKey: "tools.beta.title", sections: [], actions: [], i18n: { en: {}, "zh-CN": {} } }
]);
const ready = catalog.applyHomeOrder(catalog.getHomeEntries({ developerMode: false }), ["vela", "beta", "missing", "alpha"]);
check(ready.map((entry) => entry.id).join(",") === "beta,alpha", "Saved legacy and unknown IDs are ignored while remaining tool order is preserved.");
check(!ready.some((entry) => entry.id === "vela") && new Set(ready.map((entry) => entry.id)).size === ready.length, "Legacy order creates no ghost, empty slot, or duplicate.");
check(catalog.getRoute("vela").kind === "unknown", "Removed Vela detail ID remains explicitly unknown without fallback.");
check(catalog.getSystemSurface("velaPersistentSurface").kind === "system", "Persistent Surface remains explicitly classified as a system surface.");

console.log("test-vela-persistent-surface-integration: " + assertions + " assertions passed.");
