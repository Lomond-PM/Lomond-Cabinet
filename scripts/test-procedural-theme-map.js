"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const themeMap = require(path.join(ROOT, "client", "js", "proceduralThemeMap.js"));
const paletteLibrary = require(path.join(ROOT, "client", "js", "proceduralPaletteLibrary.js"));
const homePath = path.join(ROOT, "client", "js", "proceduralHomeIcons.js");
const mainPath = path.join(ROOT, "client", "js", "main.js");
const schemaPath = path.join(ROOT, "client", "js", "settingsSchema.js");
const appearancePath = path.join(ROOT, "client", "js", "proceduralAppearance.js");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function run() {
    const homeText = fs.readFileSync(homePath, "utf8");
    const mainText = fs.readFileSync(mainPath, "utf8");
    const schemaText = fs.readFileSync(schemaPath, "utf8");
    const appearanceText = fs.readFileSync(appearancePath, "utf8");
    delete require.cache[require.resolve(homePath)];
    global.ProceduralThemeMap = themeMap;
    const home = require(homePath);
    let assertions = 0;

    assert(themeMap.normalizeMode("colorful") === "colorful", "Colorful must be the default mode.");
    assert(themeMap.normalizeMode("unknown") === "colorful", "Unknown mode must fall back to Colorful.");
    assert(themeMap.normalizeMode("themeMapped") === "themeMapped", "Theme-mapped mode must normalize safely.");
    assert(themeMap.normalizeHexColor("#ABCDEF", "#000000") === "#abcdef", "Valid HEX should normalize.");
    assert(themeMap.normalizeHexColor("bad", "#123456") === "#123456", "Invalid HEX should use fallback.");
    assertions += 5;

    assert(themeMap.mapLuminanceToColor(0, "#102030", "#e0d0c0") === "#102030", "Black source must map to the dark endpoint.");
    assert(themeMap.mapLuminanceToColor(1, "#102030", "#e0d0c0") === "#e0d0c0", "White source must map to the light endpoint.");
    const middle = themeMap.mapLuminanceToColor(0.5, "#102030", "#e0d0c0");
    assert(middle !== "#102030" && middle !== "#e0d0c0", "Mid luminance must interpolate between endpoints.");
    assert(themeMap.getRelativeLuminance(255, 255, 255) > 0.99, "White luminance must be near one.");
    assert(themeMap.getRelativeLuminance(0, 0, 0) === 0, "Black luminance must be zero.");
    const paletteScale = themeMap.derivePaletteScaleColors({
        colors: {
            shadow: "#102936",
            base: "#26728d",
            secondary: "#69b9cc",
            highlight: "#d8f7ff"
        }
    });
    const paletteRgb = (hex) => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    });
    assert(paletteScale.mid !== "#26728d", "Palette scale mid must lift the resolved base color.");
    assert(themeMap.getRelativeLuminance(paletteRgb(paletteScale.mid)) > themeMap.getRelativeLuminance(paletteRgb("#26728d")), "Palette scale mid must be brighter than the resolved base color.");
    assert(themeMap.getRelativeLuminance(paletteRgb(paletteScale.dark)) < themeMap.getRelativeLuminance(paletteRgb(paletteScale.mid)), "Palette scale dark must be darker than base.");
    assert(themeMap.getRelativeLuminance(paletteRgb(paletteScale.mid)) < themeMap.getRelativeLuminance(paletteRgb(paletteScale.light)), "Palette scale light must be lighter than base.");
    assert(themeMap.mapLuminanceToColor(0, paletteScale) === paletteScale.dark, "Palette scale luminance zero must map to dark.");
    assert(themeMap.mapLuminanceToColor(0.5, paletteScale) === paletteScale.mid, "Palette scale luminance midpoint must map to derived mid.");
    assert(themeMap.mapLuminanceToColor(1, paletteScale) === paletteScale.light, "Palette scale luminance one must map to light.");
    const mappingDefaults = themeMap.getDefaultMappingParams();
    assert(mappingDefaults.paletteDarkness === 0.035 && mappingDefaults.paletteMidLift === 0.045 && mappingDefaults.paletteLightLift === 0.035, "Palette endpoint mapping defaults must remain stable.");
    assert(mappingDefaults.paletteDarkChroma === 0.94 && mappingDefaults.paletteLightChroma === 0.96, "Palette endpoint chroma defaults must remain stable.");
    assert(mappingDefaults.paletteMapMidpoint === 0.5 && mappingDefaults.paletteMapContrast === 1, "Palette luminance mapping defaults must preserve the existing midpoint response.");
    const tunedPaletteScale = themeMap.derivePaletteScaleColors({ colors: { shadow: "#102936", base: "#26728d", highlight: "#d8f7ff" } }, { paletteMidLift: 0.08 });
    assert(tunedPaletteScale.mid !== paletteScale.mid, "Mapping parameters must change derived presentation colors.");
    assert(themeMap.mapLuminanceToColor(0.4, paletteScale.dark, paletteScale.light, paletteScale.mid, { paletteMapMidpoint: 0.4 }) === paletteScale.mid, "Mapping midpoint must control the source luminance for the middle stop.");
    assert(themeMap.getThemeMapSignature({ mode: "themeMapped", darkColor: "#101010", lightColor: "#f0d080", mappingParams: { paletteMapContrast: 1.2 } }) !== themeMap.getThemeMapSignature({ mode: "themeMapped", darkColor: "#101010", lightColor: "#f0d080" }), "Mapping parameters must enter presentation identity.");
    paletteLibrary.listPalettes().forEach((palette) => {
        const derived = themeMap.derivePaletteScaleColors(palette);
        const darkLuminance = themeMap.getRelativeLuminance(paletteRgb(derived.dark));
        const midLuminance = themeMap.getRelativeLuminance(paletteRgb(derived.mid));
        const lightLuminance = themeMap.getRelativeLuminance(paletteRgb(derived.light));
        const baseLuminance = themeMap.getRelativeLuminance(paletteRgb(palette.colors.base));
        assert(midLuminance > baseLuminance, "Every palette scale mid must be brighter than its base color.");
        assert(darkLuminance < midLuminance && midLuminance < lightLuminance, "Every palette scale must have ordered dark/mid/light luminance.");
        assertions += 2;
    });
    assertions += 19;

    const source = {
        data: new Uint8ClampedArray([0, 0, 0, 17, 255, 255, 255, 129, 128, 128, 128, 255]),
        width: 3,
        height: 1
    };
    const mapped = themeMap.mapImageData(source, "#102030", "#e0d0c0");
    assert(mapped.width === 3 && mapped.height === 1, "Theme mapping must preserve dimensions.");
    assert(mapped.data[0] === 0x10 && mapped.data[1] === 0x20 && mapped.data[2] === 0x30, "Mapped black pixel must use dark endpoint.");
    assert(mapped.data[4] === 0xe0 && mapped.data[5] === 0xd0 && mapped.data[6] === 0xc0, "Mapped white pixel must use light endpoint.");
    assert(mapped.data[3] === 17 && mapped.data[7] === 129 && mapped.data[11] === 255, "Theme mapping must preserve alpha.");
    assert(themeMap.mapImageData(source, "#102030", "#e0d0c0").data.join(",") === mapped.data.join(","), "Repeated mapping must be deterministic.");
    const canvasState = { data: source.data.slice() };
    const fakeContext = {
        getImageData() { return { data: canvasState.data, width: 3, height: 1 }; },
        createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4), width, height }; },
        putImageData(value) { canvasState.data = value.data; }
    };
    assert(themeMap.applyToCanvas({ width: 3, height: 1, getContext() { return fakeContext; } }, "#102030", "#e0d0c0") === true, "Canvas mapping should use a real ImageData-compatible output.");
    assert(canvasState.data[3] === 17 && canvasState.data[7] === 129, "Canvas mapping must preserve alpha.");
    assert(themeMap.applyToCanvas({ width: 1, height: 1, getContext() { return { getImageData() { throw new Error("blocked"); }, putImageData() {}, createImageData() {} }; } }, "#102030", "#e0d0c0") === false, "Canvas read failure should return a safe failure result.");
    assertions += 8;

    const colorfulInput = home.createIconInput({ toolId: "shapeAdd" });
    assert(colorfulInput.seed === "shapeAdd" && colorfulInput.params.paletteId === "pacificCyan", "Colorful Home input must retain stable seed and palette.");
    assert(!Object.prototype.hasOwnProperty.call(colorfulInput.params, "mode"), "Theme mode must not enter the source engine params.");
    const size = { logicalWidth: 76, logicalHeight: 76, width: 152, height: 152, ratio: 2 };
    const sourceSignature = home.getSourceSignature("shapeAdd", size);
    const colorfulPresentation = home.getPresentationSignature(sourceSignature, { mode: "colorful", darkColor: "#111111", lightColor: "#eeeeee" });
    const mappedPresentation = home.getPresentationSignature(sourceSignature, { mode: "themeMapped", darkColor: "#111111", lightColor: "#eeeeee" });
    const changedColorPresentation = home.getPresentationSignature(sourceSignature, { mode: "themeMapped", darkColor: "#222222", lightColor: "#eeeeee" });
    assert(sourceSignature.indexOf("#") === -1 && sourceSignature.indexOf("themeMapped") === -1, "Source signature must exclude Theme Map values.");
    assert(colorfulPresentation !== mappedPresentation && mappedPresentation !== changedColorPresentation, "Mode and theme colors must affect presentation signature.");
    assert(home.getSourceSignature("shapeAdd", size) === sourceSignature, "Repeated source signature must be stable.");
    assert(home.getHomeIconPaletteMap().shapeAdd === "pacificCyan", "Existing Home palette mapping must remain unchanged.");
    assertions += 7;

    assert(/function updateAppearance[\s\S]*invalidatePresentation\(\)/.test(homeText), "Appearance updates must invalidate presentation only.");
    assert(/function invalidatePresentation[\s\S]*function invalidateSource/.test(homeText) && !/function invalidatePresentation[\s\S]*clearCache/.test(homeText), "Presentation invalidation must not clear engine cache.");
    assert(/function invalidateSource[\s\S]*function invalidateRendered/.test(homeText), "Source invalidation must be a separate controller path.");
    assert(/themeMap\.applyToCanvas[\s\S]*keeping the Colorful source image/.test(homeText), "Theme mapping failure must retain the Colorful source image.");
    assert(/state\.shuttingDown/.test(homeText) && /cancelFrame\(state\.rafId\)/.test(homeText), "Shutdown must stop pending Home icon work.");
    assertions += 5;

    assert(/key: "proceduralIconMode"/.test(schemaText), "Settings schema must declare proceduralIconMode.");
    assert(/defaultValue: "colorful"/.test(schemaText), "Settings default mode must be Colorful.");
    assert(/value: "colorful"/.test(schemaText) && /value: "themeMapped"/.test(schemaText), "Settings schema must expose both modes.");
    assert(/proceduralIconMode: "colorful"/.test(mainText), "Legacy settings data must default to Colorful.");
    assert(/proceduralIconMode: normalizeProceduralIconMode/.test(mainText), "Settings persistence must collect the normalized mode.");
    assert(/applyProceduralIconMode\(data\.proceduralIconMode/.test(mainText), "Persisted mode must be applied safely.");
    assert(/updateProceduralHomeIconAppearance/.test(mainText), "Settings changes must notify the Home controller through one adapter.");
    assert(!/themeMapped|toolIconColor|toolIconLine/.test(appearanceText), "Theme colors and mode must not enter ProceduralAppearance.");
    assert(/function suggestThemeAccentFromPalette[\s\S]*colors\.secondary[\s\S]*applyThemeAccent/.test(mainText), "Palette selection must offer the secondary color through the normal accent path.");
    assert(/toolIconDarkPaletteId[\s\S]*suggestThemeAccent: true/.test(mainText), "Only active palette selection should suggest an accent update.");
    const storeListenerSlice = mainText.slice(mainText.indexOf("function bindThemePaletteStore"), mainText.indexOf("function unbindThemePaletteStore"));
    assert(storeListenerSlice.indexOf("suggestThemeAccent") === -1, "Store refreshes must not reapply the accent suggestion.");
    assertions += 11;

    console.log("PASS procedural theme map: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural theme map - " + error.message);
    process.exitCode = 1;
}
