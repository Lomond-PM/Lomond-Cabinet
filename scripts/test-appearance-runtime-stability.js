#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client", "js", "main.js"), "utf8");
const background = fs.readFileSync(path.join(root, "client", "js", "proceduralHomeBackground.js"), "utf8");
const index = fs.readFileSync(path.join(root, "client", "index.html"), "utf8");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }

check(/function commitAppearanceBaseInput[\s\S]*return true;[\s\S]*function ensureCoreAppearance/.test(main) && !/function commitAppearanceBaseInput[\s\S]*saveSettings\(\)[\s\S]*function ensureCoreAppearance/.test(main), "base authority callback does not persist a stale pre-resolution snapshot");
check(/changed = CoreAppearance && CoreAppearance\.commit\(parameter\.id, value\);[\s\S]*parameter\.persistence === "settings"\) saveSettings\(\)/.test(main), "settings authority persists only after successful resolver commit");
check(/function applyBackgroundSource[\s\S]*source !== "classic"[\s\S]*controller\.activate/.test(main), "non-procedural to procedural selection enters the shared activation boundary");
check(/function activate\(options\)[\s\S]*state\.canvas !== currentCanvas[\s\S]*return initialize\([\s\S]*state\.config = config[\s\S]*invalidateSource/.test(background), "activation remounts stale DOM or updates selected config before invalidating a mounted runtime");
check(/ProceduralHomeBackground\.activate[\s\S]*rootElement: byId\("appShell"\)[\s\S]*canvas: byId\("proceduralHomeBackgroundCanvas"\)/.test(main), "startup and runtime activation resolve the current real DOM mount through one seam");
check(/function isEnvironmentRenderable\(\)[\s\S]*doc && doc\.hidden[\s\S]*state\.shell\.isConnected === false[\s\S]*state\.canvas\.isConnected === false/.test(background) && !/function isVisible\(/.test(background), "background renderability belongs to the persistent environment rather than Home active state");
check(!/function finishCloseSettingsTransition\(\)[\s\S]*backgroundController\.refresh\(\)/.test(main), "Settings close owns no procedural catch-up generation");
check(!/\.app-shell\.is-animating \.home-background\s*\{[\s\S]*?opacity\s*:/.test(fs.readFileSync(path.join(root, "client", "css", "style.css"), "utf8")), "spatial transitions do not multiply persistent background opacity");
check(/<div class="app-shell" id="appShell">[\s\S]*?<div class="home-background"[\s\S]*?<\/div>[\s\S]*?<section class="view view-home/.test(index), "persistent background environment is an App Shell child preceding the independent Home content view");
check(/token !== state\.generation[\s\S]*return false/.test(background), "stale render generation cannot overwrite newer runtime state");
check(/applyThemeAccent\(palette\.colors\.secondary\);[\s\S]*applyHomeBackground\(palette\.colors\.shadow\)/.test(main), "explicit palette application assigns accent and existing Home canvas authority together");
check(!/paletteCanvasOverride|palette\.shadow.*--bg-main|base\.canvas.*derivedFrom.*shadow/.test(main), "palette canvas assignment creates no permanent derived alias or second authority");
console.log("Appearance runtime stability contract tests passed: " + assertions + " assertions.");
