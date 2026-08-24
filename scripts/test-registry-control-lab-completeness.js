#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
const lab = fs.readFileSync(path.join(root, "host/tools/registryControlLab.tool.jsx"), "utf8");
const rendererTypes = ["divider", "separator", "info", "note", "subheading", "proceduralPreview", "button", "actionButton", "checkbox", "switch", "select", "tabs", "textarea", "range", "cubicBezier", "color", "number", "text"];
const registryPath = JSON.parse("[" + (/registryPath:\s*\[([^\]]+)\]/.exec(lab) || [])[1] + "]");
const direct = JSON.parse("[" + (/coreUiDirect:\s*\[([^\]]+)\]/.exec(lab) || [])[1] + "]");
const exempt = Array.from(lab.matchAll(/^\s{16}([A-Za-z]+):\s*"([^"]+)"/gm)).reduce((map, match) => (map[match[1]] = match[2], map), {});
rendererTypes.forEach(type => assert.ok(registryPath.includes(type) || exempt[type], "Registry renderer type lacks Lab specimen/exemption: " + type));
registryPath.forEach(type => assert.ok(rendererTypes.includes(type), "Lab claims unsupported Registry type: " + type));
assert.ok(exempt.proceduralPreview && exempt.proceduralPreview.length > 20, "proceduralPreview exemption is named and reasoned");
assert.ok(/colorFieldAlphaMode:\s*true/.test(lab) && /supportsAlpha:\s*true/.test(main), "generic ColorField alpha mode has a real Control Lab specimen");
const publicVisualFactories = Array.from(core.matchAll(/^\s{8}(create[A-Z][A-Za-z]+):\s*\1,/gm)).map(match => match[1]);
const publicAdapters = ["enhanceSelect"];
const registryFactories = Array.from(main.matchAll(/window\.CoreUI\.(create[A-Z][A-Za-z]+)\(/g)).map(match => match[1]);
publicVisualFactories.forEach(factory => assert.ok(registryFactories.includes(factory) || direct.includes(factory), "CoreUI visual factory lacks Registry or Direct coverage: " + factory));
direct.forEach(factory => {
    assert.ok(publicVisualFactories.includes(factory) || publicAdapters.includes(factory), "Direct specimen is not a public CoreUI factory/adapter: " + factory);
    assert.ok(main.includes("window.CoreUI." + factory + "({"), "Direct specimen does not use canonical CoreUI factory: " + factory);
});
assert.ok(/buttonVariants:\s*\["utility",\s*"navigation"\]/.test(lab), "Control Lab covers Utility and Navigation Button variants");
assert.ok(/type:\s*"subheading"/.test(lab), "Registry Path includes a real subheading specimen");
console.log("Registry Control Lab completeness contract tests passed.");
