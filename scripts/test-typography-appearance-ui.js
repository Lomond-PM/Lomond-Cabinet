"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
var core = fs.readFileSync(path.join(root, "client/js/ui/coreUi.js"), "utf8");
var css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
var i18n = fs.readFileSync(path.join(root, "client/js/i18n.js"), "utf8");
var Registry = require(path.join(root, "client/js/appearance/appearanceParameterRegistry.js")).AppearanceParameterRegistry;
var ids = ["typography.title.size", "typography.sectionTitle.size", "typography.fieldLabel.size", "typography.body.size", "typography.supporting.size", "typography.code.size"];

ids.forEach(function (id) {
    var parameter = Registry.get(id);
    assert(parameter && parameter.controlType === "range-number", id + " dispatches to RangeNumber");
    assert(i18n.indexOf('"' + parameter.labelKey + '"') >= 0, id + " has localized label copy");
    assert(i18n.indexOf('"' + parameter.descriptionKey + '"') >= 0, id + " has localized description copy");
});
assert(/color:\s*createAppearanceColorControl/.test(main));
assert(/"range-number":\s*createAppearanceRangeNumberControl/.test(main));
assert(/window\.CoreUI\.createColorField/.test(main), "existing colors retain Core ColorField");
assert(/window\.CoreUI\.createRangeNumber/.test(main), "Typography consumes Core RangeNumber");
assert(/parameter\.category !== "typography"/.test(main));
assert(/subgroup = parameter\.subgroup/.test(main));
assert(!/(?:startsWith|indexOf)\("typography\."/.test(main), "renderer does not group by parsing Parameter IDs");
assert(/valueToDisplay:\s*function \(value\) \{ return Math\.round\(Number\(value\) \* 100\); \}/.test(main));
assert(/displayToValue:\s*function \(value\) \{ return Math\.round\(Number\(value\)\) \/ 100; \}/.test(main));
assert(/displayStep:\s*1/.test(main));
assert(/unitText:\s*tr\("settings\.appearance\.percentageUnit"\)/.test(main));
assert(/valueCluster\.appendChild\(number\);[\s\S]*valueCluster\.appendChild\(unit\);[\s\S]*wrap\.appendChild\(valueCluster\);/.test(core), "unit and number share the generic value composition");
assert(/\.ui-range-number-value\s*\{[^}]*display:\s*inline-flex;[^}]*white-space:\s*nowrap/.test(css), "unit composition stays on one line");
assert(/CoreAppearance\.getOverride\(parameter\.id\) !== null/.test(main), "override state uses key presence, not value equality");
assert(/clearAppearancePreview\(parameter\.id\); CoreAppearance\.reset\(parameter\.id\)/.test(main), "Reset clears preview then removes override");
assert(/scheduleAppearancePreview/.test(main) && /requestAnimationFrame/.test(main), "range preview is frame-coalesced");
assert(/cancelAppearancePreviewFrame\(parameter\.id\)[\s\S]*CoreAppearance && CoreAppearance\.commit/.test(main), "commit cancels pending preview before persistence");
assert(/pageId !== "appearance"\) clearAppearancePreviews/.test(main));
assert(/clearAppearancePreviews\(\);[\s\S]{0,160}if \(!view/.test(main), "Settings close clears transient previews");
assert(/if \(!renderers\[parameter\.controlType\]\)/.test(main), "unsupported controls fail closed");
assert(/\.appearance-range-number\s*\{[^}]*grid-column:\s*2/.test(css));
assert(/@media \(max-width: 380px\)[\s\S]*\.settings-field\.appearance-advanced-field > \.appearance-range-number\s*\{[^}]*grid-row:\s*2;[^}]*width:\s*100%/.test(css));
assert(/\.settings-content[\s\S]*overflow-y:\s*auto/.test(css), "existing Settings scroll owner remains");
assert(core.indexOf("valueToDisplay") >= 0 && core.indexOf("displayToValue") >= 0, "Core adapter is generic and optional");
assert(core.indexOf("typography") < 0 && core.indexOf('unitText = "%"') < 0, "CoreUI has no Typography or percent specialization");

console.log("Typography Appearance UI contract tests passed.");
