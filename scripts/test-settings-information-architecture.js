#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
const palette = fs.readFileSync(path.join(root, "client/js/proceduralPaletteWorkspace.js"), "utf8");
const surface = fs.readFileSync(path.join(root, "client/js/vela/velaSurface.js"), "utf8");
let assertions = 0;
function check(value, message) { assertions += 1; if (!value) throw new Error(message); }

check(/pages: \["root", "appearance"\]/.test(main), "only root plus the historical Appearance compatibility alias remain");
check(!/pages: \[[^\]]*"(?:background|advanced|developer|vela)"/.test(main), "categories are not secondary routes");
check(/function createSettingsCategory[\s\S]*createDisclosureController/.test(main), "Settings categories reuse CoreUI Disclosure");
check(/trigger\.type = "button"[\s\S]*body\.id = "settingsCategoryBody-"/.test(main), "Disclosure uses native buttons and controlled content ids");
["appearance", "advanced", "developer"].forEach((category) => {
    check(new RegExp('createSettingsCategory\\("' + category + '"').test(main), "stacked category exists: " + category);
});
check((main.match(/className = "settings-renderer settings-root-page"/g) || []).length === 1, "one Settings root composition");
check(!/settingsDestinationsMount|createSettingsNavigationButton|data-settings-destination/.test(main), "no user-facing destination navigation cards");
check(/settingsCategoryAppearance[\s\S]*_coreDisclosure\.setExpanded\(true\)/.test(main), "historical Appearance route aliases root and expands the category");
check(/appearance\.body\.appendChild\(createSettingsSectionMount\("settingsLanguageMount"/.test(main), "Language belongs to Appearance");
check(/settingsCoreAppearanceMount[\s\S]*settingsInterfaceMount[\s\S]*settingsMotionMount[\s\S]*settingsAppearanceParametersMount[\s\S]*settingsProceduralAppearanceMount[\s\S]*backgroundSettingsCard[\s\S]*settingsPaletteLibraryMount/.test(main), "Appearance owns Theme, Interface, Motion, semantic Appearance, Tool Icons, Background, and Palette");
check(/fields\[i\]\.key === "uiScale"[\s\S]*interfaceMount\.appendChild/.test(main), "UI Scale belongs to Interface");
check(/fields\[i\]\.key === "motionSpeed"[\s\S]*mount\.appendChild/.test(main), "Major View Motion Speed remains in Motion");
check(!/settingsProceduralPreferencesMount/.test(main), "no ordinary Appearance procedural-preferences group remains");
check(/proceduralMount\.appendChild\(proceduralGroup\.root\)/.test(main), "all procedural parameters belong to Developer Procedural Appearance");
check(/settings-theme-group--first/.test(main) && /\.settings-theme-group--first[\s\S]*border-top: 0/.test(css), "first semantic groups do not render a separator");
check(/\.settings-appearance-parameters[\s\S]*gap: var\(--space-settings-section-stack\)/.test(css), "Interface Appearance and Typography share the semantic parent stack gap");
check(!/createSettingsCategory\("vela"|settingsVelaMount|settingsCategoryVela|settings\.vela"/.test(main), "Global Settings owns no Vela category, mount, or disclosure key");
check(/openSettings: openVelaSettingsSurface/.test(main), "Vela gear opens the Vela-owned surface directly");
check(!/createSettingsCategory\("background"/.test(main) && /appearance\.body\.appendChild\(createSettingsSectionMount\("backgroundSettingsCard"/.test(main), "Background is a nested Appearance disclosure rather than a root category");
check(/createSettingsCategory\("advanced"[\s\S]*settingsDeveloperModeMount/.test(main), "Advanced owns Developer Access");
check(/createSettingsCategory\("developer"[\s\S]*settingsDeveloperCalibrationMount[\s\S]*settingsDeveloperProceduralMount/.test(main), "gated Developer disclosure owns Home Calibration and Procedural Appearance");
check(/openSettings\(settingsButton\)/.test(surface), "Vela gear supplies its real launch source");
check(!/settingsDeveloperLabsMount|data-developer-lab|requestSettingsToolHandoff|SettingsToolHandoff/.test(main), "Developer Settings exposes no Lab quick-launch entry or Settings-specific handoff seam");
check(/\.settings-category > \.settings-category-content\s*\{[\s\S]*max-height: none;[\s\S]*overflow: visible;/.test(css), "expanded Settings categories return to natural-flow height and visible overflow");
check(/\.settings-category\.is-collapsed > \.settings-category-content\s*\{[\s\S]*max-height: 0;[\s\S]*overflow: hidden;/.test(css), "only collapsed Settings categories own clipping geometry");
check(/\.settings-content\s*\{[\s\S]*overflow-y: auto;/.test(css), "Settings content remains the ordinary vertical scroll owner");
check(!/\.settings-category > \.settings-category-content\s*\{[^}]*max-height: \d+px/.test(css), "expanded category geometry cannot become stale after nested or responsive reflow");
check(/settingsScrollTop = content\.scrollTop/.test(palette), "Palette entry snapshots Settings scrollTop");
check(/restoreSettingsScroll: true/.test(palette), "Palette exit restores Settings scrollTop");
check(/is-palette-workspace \.settings-content[\s\S]*overflow: hidden/.test(css), "Settings content relinquishes scroll ownership in Palette mode");
check(/\.palette-library-list[\s\S]*overflow-y: auto/.test(css) && /\.palette-editor-scroll[\s\S]*overflow-y: auto/.test(css), "Palette panes own workspace scrolling");
check(/settings-category--appearance > \.settings-category-content[\s\S]*min-height: 0[\s\S]*flex: 1 1 auto/.test(css), "nested Palette workspace receives a bounded flex height");
["settingsLanguageMount", "settingsCoreAppearanceMount", "settingsInterfaceMount", "settingsMotionMount", "backgroundSettingsCard", "settingsDeveloperModeMount", "settingsDeveloperProceduralMount"].forEach((id) => {
    check((main.match(new RegExp('createSettingsSectionMount\\("' + id + '"', "g")) || []).length === 1, "single editor mount: " + id);
});

console.log("Settings Information Architecture tests passed: " + assertions + " assertions.");
