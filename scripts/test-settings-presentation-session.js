#!/usr/bin/env node
"use strict";
const assert = require("assert"); const fs = require("fs"); const path = require("path"); const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
assert.ok(/SurfacePresentationSessions = \{\}/.test(main), "shared surface presentation owner is session memory only");
assert.ok(!/SurfacePresentationSessions[\s\S]{0,300}localStorage/.test(main), "presentation state is not persisted");
assert.ok(/"settings\." \+ id/.test(main), "category disclosure identity derives from stable schema id");
["settings.appearance.background", "settings.developer.designTuning."].forEach(key => assert.ok(main.includes(key), "stable semantic disclosure key exists: " + key));
assert.ok(/captureSettingsPresentationSession[\s\S]*\.settings-content[\s\S]*data-settings-disclosure-key[\s\S]*captureSurfacePresentationSession\("settings", content/.test(main), "capture owns only main Settings scroll and semantic disclosures");
assert.ok(/restoreSurfacePresentationSession[\s\S]*restorePayload[\s\S]*scrollHeight - scrollElement\.clientHeight[\s\S]*scrollElement\.scrollTop = target/.test(main), "shared restore applies payload first and clamps scroll last");
assert.ok(/finishOpenSettingsTransition[\s\S]*restoreSettingsPresentationSession\(\)[\s\S]*view\.classList\.remove\("no-transition"\)/.test(main), "restoration occurs before first transitioned visible frame");
assert.ok(/closeSettingsPanel[\s\S]*endSettingsPeekManipulation\(\)[\s\S]*cancelDesignTuningCalibrationGesture\(\)[\s\S]*captureSettingsPresentationSession\(\)/.test(main), "Peek and transient gesture are excluded before snapshot");
assert.ok(!/SurfacePresentationSessions[\s\S]{0,300}(?:focus|peek|transient|gesture)/i.test(main.slice(main.indexOf("var SurfacePresentationSessions"), main.indexOf("var SettingsState"))), "snapshot stores no ephemeral references");
assert.ok(/captureSurfacePresentationSession\("tool:" \+ activeToolId/.test(main) && /restoreSurfacePresentationSession\("tool:" \+ toolId/.test(main), "Tool Detail consumes the same surface session seam with independent identity");
assert.ok(!/textContent[\s\S]{0,100}data-settings-disclosure-key/.test(main), "disclosure identity does not use translated text");
console.log("Settings presentation session contract tests passed.");
