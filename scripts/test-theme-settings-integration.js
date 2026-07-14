"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const schemaText = fs.readFileSync(path.join(ROOT, "client", "js", "settingsSchema.js"), "utf8");
const mainText = fs.readFileSync(path.join(ROOT, "client", "js", "main.js"), "utf8");
const cssText = fs.readFileSync(path.join(ROOT, "client", "css", "style.css"), "utf8");
const i18nText = fs.readFileSync(path.join(ROOT, "client", "js", "i18n.js"), "utf8");
const storeText = fs.readFileSync(path.join(ROOT, "client", "js", "proceduralPaletteStore.js"), "utf8");
const workspaceText = fs.readFileSync(path.join(ROOT, "client", "js", "proceduralPaletteWorkspace.js"), "utf8");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function functionSlice(source, name, nextName) {
    const start = source.indexOf("function " + name);
    const end = nextName ? source.indexOf("function " + nextName, start + 1) : source.length;
    return start === -1 ? "" : source.slice(start, end === -1 ? source.length : end);
}

function run() {
    let assertions = 0;

    assert(/id: "interfaceAppearance"[\s\S]*fields: \["themeAccent", "homeBackground"\]/.test(schemaText), "Theme schema must group interface appearance fields.");
    assert(/id: "toolIconAppearance"[\s\S]*fields: \["proceduralIconMode"\]/.test(schemaText), "Theme schema must declare Tool Icon Appearance.");
    assert(schemaText.indexOf('fields: ["proceduralIconMode"]') < schemaText.indexOf('fields: ["toolIconDarkSourceMode", "toolIconDarkPaletteId", "toolIconColor", "toolIconLine"]'), "Mode must precede icon endpoint fields.");
    assert(/key: "proceduralIconMode"[\s\S]*defaultValue: "colorful"/.test(schemaText), "Colorful must remain the default mode.");
    assert(/key: "toolIconDarkSourceMode"[\s\S]*defaultValue: "manualEndpoints"/.test(schemaText), "Dark source mode must default to manualEndpoints.");
    assert(/value: "manualEndpoints"[\s\S]*value: "paletteScale"/.test(schemaText), "Dark source mode must expose manualEndpoints and paletteScale.");
    assert(/key: "toolIconDarkPaletteId"[\s\S]*optionsProvider: "proceduralPalettes"/.test(schemaText), "Dark palette selection must use the dynamic palette provider.");
    assert(/value: "colorful"/.test(schemaText) && /value: "themeMapped"/.test(schemaText), "Mode schema must contain exactly the supported values.");
    assert(/type: "paletteSummary"[\s\S]*settings\.palette\.manage/.test(schemaText), "Colorful mode must expose a Palette Library summary presentation.");
    assert(/id: "iconColors"[\s\S]*openWhen: \{ key: "proceduralIconMode", equals: "themeMapped" \}/.test(schemaText), "Theme-mapped endpoint group must open for Theme-mapped mode.");
    assert(/type: "colorRampPreview"/.test(schemaText), "Theme schema must declare the generic color ramp presentation.");
    assert(/type: "note"[\s\S]*helper\.proceduralIconSource/.test(schemaText), "Theme-mapped mode must explain the source palette relationship.");
    assertions += 12;

    assert(/id: "proceduralAppearance"[\s\S]*developerOnly: true[\s\S]*collapsible: true[\s\S]*defaultCollapsed: true/.test(schemaText), "Procedural appearance controls must be a Developer-only collapsible Settings section.");
    [
        "warp", "warpIrregularity", "flowComplexity", "flowContinuity", "ribbonWidth", "gradientBias",
        "highlightConcentration", "highlightArea", "secondaryHueInfluence", "accentPresence", "highlightTintShift",
        "contrast", "depth", "saturation", "brightness", "grain", "paletteDarkness", "paletteMidLift",
        "paletteLightLift", "paletteDarkChroma", "paletteLightChroma", "paletteMapMidpoint", "paletteMapContrast"
    ].forEach((key) => {
        const fieldPattern = new RegExp('key: "' + key + '"[\\s\\S]*?type: "range"[\\s\\S]*?defaultProvider: "proceduralAppearance"');
        assert(fieldPattern.test(schemaText), "Procedural parameter is missing shared default provider: " + key);
        assertions += 1;
    });
    assert(/key: "resetProceduralAppearanceParams"[\s\S]*type: "button"/.test(schemaText), "Procedural appearance controls must expose a reset action.");
    assert(/function getProceduralAppearanceDefaults[\s\S]*getDefaultParams[\s\S]*normalizeParams/.test(mainText), "Settings defaults must come from ProceduralAppearance.");
    assert(/ProceduralAppearanceParams = normalizeProceduralAppearanceParams\(data\.proceduralParams\)/.test(mainText), "Stored procedural params must be normalized through the shared engine.");
    assert(/proceduralParams: collectProceduralAppearanceParamsFromControls/.test(mainText), "Procedural params must use the existing Settings storage object.");
    assert(/function updateProceduralHomeIconAppearance[\s\S]*controller\.updateParameters\(getProceduralAppearanceSourceParams\(\)\)/.test(mainText), "Home icons must receive the shared source params.");
    assert(/controller\.updateAppearance\([\s\S]*mappingParams: getProceduralAppearanceMappingParams\(\)/.test(mainText), "Home icon theme presentation must receive the shared palette mapping params.");
    assert(/getProceduralAppearanceMappingParams\(\)/.test(mainText) && /params: getProceduralAppearanceSourceParams\(\)/g.test(mainText), "Home and background must receive shared source/mapping parameter paths.");
    assert(/getDefaultMappingParams|normalizeMappingParams/.test(mainText), "Palette mapping defaults must use the shared Theme Map normalization path.");
    assert(/PROCEDURAL_APPEARANCE_SOURCE_DEBOUNCE_MS\s*=\s*150/.test(mainText) && /function scheduleProceduralAppearanceSourceUpdate[\s\S]*setTimeout/.test(mainText), "Shared procedural source parameter updates must use a trailing debounce.");
    assert(/function applyProceduralAppearanceParams[\s\S]*scheduleProceduralAppearanceSourceUpdate/.test(mainText) && /function applyToolIconTheme[\s\S]*updateProceduralHomeIconAppearance/.test(mainText), "Source parameter edits must be debounced while Theme endpoint updates remain immediate.");
    assert(/function setupProceduralAppearanceParams[\s\S]*applyProceduralAppearanceParams[\s\S]*false/.test(mainText), "Procedural parameter edits must update in real time without per-input persistence.");
    assert(/function resetProceduralAppearanceParams[\s\S]*getProceduralAppearanceDefaults[\s\S]*applyProceduralAppearanceParams\([\s\S]*true/.test(mainText), "Reset must restore and persist shared defaults.");
    assertions += 10;

    assert(/function settingsVisibleWhenMatches/.test(mainText) && /data-settings-visible-key/.test(mainText), "Settings visibility must use generic schema metadata.");
    assert(/hidden = !visible/.test(mainText) && /is-settings-condition-hidden/.test(mainText), "Hidden Settings fields must leave layout and pointer flow.");
    assert(/function createSettingsThemePresentation/.test(mainText) && /colorRampPreview/.test(mainText), "Color ramp must use a generic Settings presentation helper.");
    assert(/createSettingsThemeGroup[\s\S]*setAttribute\("data-i18n", group\.titleKey/.test(mainText), "Theme group titles must use dynamic i18n metadata.");
    assert(/createSettingsThemePresentation[\s\S]*setAttribute\("data-i18n", presentation\.textKey/.test(mainText), "Theme notes must use dynamic i18n metadata.");
    assert(/function refreshLanguage[\s\S]*refreshSettingsThemePresentation/.test(mainText), "Language changes must refresh dynamic Theme presentations.");
    assert(/linear-gradient\(90deg, var\(--settings-ramp-dark\) 0%, var\(--settings-ramp-light\) 100%\)/.test(cssText), "Color ramp must run exactly from dark 0% to light 100%.");
    assert(/settings-color-ramp-shell[\s\S]*overflow: hidden/.test(cssText), "Color ramp clipping must belong to the outer shell.");
    assert(/\.settings-color-ramp\s*\{[^}]*border-radius/.test(cssText) === false, "Inner color ramp must not define its own radius.");
    assert(/function renderSettingsColorRamp[\s\S]*resolveProceduralThemeColors/.test(mainText) && /settings-ramp-mid/.test(mainText), "Ramp must use resolved dark, mid, and light endpoints.");
    assert(/function normalizeToolIconDarkSourceMode[\s\S]*custom[\s\S]*manualEndpoints[\s\S]*paletteBase[\s\S]*paletteScale/.test(mainText), "Legacy source mode values must normalize to the new modes.");
    assert(/function resolveProceduralPaletteScaleColors[\s\S]*derivePaletteScaleColors/.test(mainText), "Palette scale mode must resolve derived palette endpoints.");
    assert(/function resolveProceduralThemeColors[\s\S]*toolIconColor[\s\S]*toolIconLine/.test(mainText), "Manual mode must preserve both endpoint settings.");
    assert(/toolIconLine[\s\S]*equals: "manualEndpoints"/.test(schemaText), "Palette scale mode must hide the manual light endpoint.");
    assert(/function getResolvedProceduralPalette[\s\S]*getResolvedPalette/.test(mainText), "Palette resolution must use the Store public API.");
    assert(/function bindThemePaletteStore[\s\S]*refreshSettingsPaletteOptions[\s\S]*updateProceduralHomeIconAppearance/.test(mainText), "Palette Store changes must refresh palette options and the resolved dark endpoint.");
    assert(/className = "settings-theme-group-title settings-section-toggle collapsible-heading"/.test(mainText) && /className = "collapse-chevron"/.test(mainText), "Theme disclosure must reuse the shared collapse chevron.");
    assert(!/settings-theme-group--collapsible[\s\S]*content: "v"/.test(cssText) && !/settings-theme-group--collapsible[\s\S]*content: ">"/.test(cssText), "Theme disclosure must not use text-character arrows.");
    assert(/function openPaletteWorkspaceFromSettings[\s\S]*controller\.open\(\)/.test(mainText), "Manage Palettes must call the Workspace controller API.");
    assert(!/openPaletteWorkspaceFromSettings[\s\S]*is-palette-workspace/.test(mainText), "Theme adapter must not manipulate Workspace classes directly.");
    assertions += 19;

    assert(/function getPaletteSummaryData[\s\S]*listResolvedPalettes\(false\)[\s\S]*exportData\(\)/.test(mainText), "Palette summary must use Store public APIs.");
    assert(functionSlice(mainText, "getPaletteSummaryData", "renderPaletteSummaryElement").indexOf("localStorage") === -1, "Palette summary must not read localStorage directly.");
    assert(/function bindThemePaletteStore[\s\S]*store\.subscribe/.test(mainText), "Palette Store updates must refresh the summary.");
    assert(/ThemeSettingsStoreListener[\s\S]*refreshSettingsPaletteSummary/.test(mainText), "Store summary refresh must be isolated from icon source updates.");
    assert(/storageKey: STORAGE_KEY/.test(storeText) && /schemaVersion: SCHEMA_VERSION/.test(storeText), "Palette Store key and schema must remain owned by the Store.");
    assert(/function openWorkspace[\s\S]*settingsScrollTop/.test(workspaceText), "Workspace entry must preserve Settings scroll context.");
    assert(/restoreSettingsScroll: reason === "back"/.test(workspaceText), "Workspace back navigation must restore Settings scroll context.");
    assertions += 7;

    assert(/function applyToolIconTheme[\s\S]*updateProceduralHomeIconAppearance/.test(mainText), "Dark/light endpoint changes must update Home presentation.");
    assert(/function applyProceduralIconMode[\s\S]*updateProceduralHomeIconAppearance/.test(mainText), "Mode changes must update Home presentation.");
    assert(functionSlice(mainText, "applyThemeAccent", "applyHomeBackground").indexOf("updateProceduralHomeIconAppearance") === -1, "Interface accent changes must not invalidate Home icon source/presentation.");
    assert(functionSlice(mainText, "applyHomeBackground", "applyToolIconTheme").indexOf("updateProceduralHomeIconAppearance") === -1, "Home background changes must not invalidate Home icon source/presentation.");
    assert(/function updateProceduralHomeIconAppearance[\s\S]*controller\.updateAppearance/.test(mainText), "Theme adapter must call the Home controller appearance API.");
    assert(/proceduralIconMode: normalizeProceduralIconMode/.test(mainText), "Mode must remain in the existing Settings persistence object.");
    assertions += 6;

    [
        "settings.theme.interfaceAppearance",
        "settings.theme.toolIconAppearance",
        "settings.theme.fallbackIconColors",
        "settings.paletteLibrary",
        "settings.palette.manage",
        "settings.palette.manageSource",
        "helper.proceduralIconModeColorful",
        "helper.proceduralIconModeThemeMapped",
        "helper.proceduralIconSource",
        "label.proceduralIconMode",
        "label.homeBaseColor",
        "label.iconDarkSource",
        "label.sourcePalette",
        "settings.iconDarkSource.manualEndpoints",
        "settings.iconDarkSource.paletteScale",
        "settings.theme.midEndpoint",
        "status.paletteAccentSuggested",
        "helper.sourcePalette"
    ].forEach((key) => {
        assert(i18nText.indexOf('"' + key + '"') !== -1, "Missing i18n key: " + key);
        assertions += 1;
    });
    assert(/@media \(max-width: 520px\)[\s\S]*settings-theme-group \.settings-field[\s\S]*grid-template-columns: minmax\(0, 1fr\)/.test(cssText), "Theme fields must stack on narrow panels.");
    assert(/settings-source-summary-action[\s\S]*width: 100%/.test(cssText), "Summary action must use full width on narrow panels.");
    assert(/\.select-trigger[\s\S]*display: grid[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto[\s\S]*max-width: 100%[\s\S]*box-sizing: border-box/.test(cssText), "Common select triggers must constrain text and preserve the chevron column.");
    assert(/\.select-label[\s\S]*overflow: hidden[\s\S]*text-overflow: ellipsis[\s\S]*white-space: nowrap/.test(cssText), "Common select labels must ellipsize long values.");
    assert(/\.select-option[\s\S]*overflow: hidden[\s\S]*text-overflow: ellipsis[\s\S]*white-space: nowrap/.test(cssText), "Common select options must ellipsize long values.");
    assert(/function positionCustomSelectMenu[\s\S]*maxHeight[\s\S]*availableBelow[\s\S]*availableAbove/.test(mainText), "Portal menus must clamp height and position inside the viewport.");
    assert(/settingsContent\.addEventListener\("scroll"[\s\S]*closeCustomSelectMenus/.test(mainText) && /function closeSettingsPanel[\s\S]*closeCustomSelectMenus/.test(mainText), "Portal menus must close on Settings scroll and close.");
    assertions += 7;

    assert(/\.home-header-actions \.panel-button\s*\{[^}]*border-color: var\(--gold-soft\)[^}]*color: var\(--gold-soft\)/.test(cssText), "Home header controls must use the theme accent variables in their resting state.");
    assert(/\.home-header-actions \.panel-button:hover,[\s\S]*\.home-header-actions \.panel-button:focus-visible[\s\S]*border-color: var\(--gold\)/.test(cssText), "Home header hover and focus states must strengthen the theme accent.");
    assert(/\.settings-glyph\s*\{[^}]*background-color: var\(--gold-soft\)/.test(cssText), "Settings glyph mask must use the theme accent, not tool icon colors.");
    assert(/\.more-icon\s*\{[^}]*border-color: var\(--gold-soft\)[^}]*background: var\(--bg-main\)/.test(cssText) && /\.plus-h,[\s\S]*background: var\(--gold-soft\)/.test(cssText), "More Tools icon and plus must use the theme accent variables.");
    assert(/\.more-icon \+ \.app-card-title\s*\{[^}]*color: var\(--gold-soft\)/.test(cssText), "More Tools text must use the theme accent variables.");
    assert(!/\.home-header-actions \.panel-button\s*\{[^}]*var\(--tool-icon-/.test(cssText) && !/\.settings-glyph\s*\{[^}]*var\(--tool-icon-line\)/.test(cssText), "Home controls must not depend on tool icon color variables.");
    assertions += 6;

    console.log("PASS theme settings integration: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL theme settings integration - " + error.message);
    process.exitCode = 1;
}
