/* Presentation-only luminance mapping for procedural Home icons. */
(function (root, factory) {
    "use strict";
    var api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralThemeMap = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    var VERSION = "theme-map-v2";
    var PALETTE_SCALE_MID_LIGHTNESS_DELTA = 0.045;
    var HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeMode(value) {
        return value === "themeMapped" ? "themeMapped" : "colorful";
    }

    function normalizeHexColor(value, fallback) {
        var match = HEX_PATTERN.exec(String(value || ""));
        var safe = HEX_PATTERN.exec(String(fallback || ""));
        return "#" + (match ? match[1] : (safe ? safe[1] : "000000")).toLowerCase();
    }

    function toLinear(channel) {
        var value = clamp(Number(channel) / 255, 0, 1);
        return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }

    function fromLinear(channel) {
        var value = clamp(Number(channel), 0, 1);
        value = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
        return Math.round(clamp(value, 0, 1) * 255);
    }

    function cubeRoot(value) {
        return value < 0 ? -Math.pow(-value, 1 / 3) : Math.pow(value, 1 / 3);
    }

    function hexToRgb(value) {
        var hex = normalizeHexColor(value, "#000000").slice(1);
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    function channelToHex(value) {
        var hex = clamp(Math.round(Number(value) || 0), 0, 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToOklab(rgb) {
        var r = toLinear(rgb.r);
        var g = toLinear(rgb.g);
        var b = toLinear(rgb.b);
        var l = cubeRoot(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        var m = cubeRoot(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        var s = cubeRoot(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return {
            l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
        };
    }

    function oklabToRgb(lab) {
        var l = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
        var m = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
        var s = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
        var red = 4.0767416621 * l * l * l - 3.3077115913 * m * m * m + 0.2309699292 * s * s * s;
        var green = -1.2684380046 * l * l * l + 2.6097574011 * m * m * m - 0.3413193965 * s * s * s;
        var blue = -0.0041960863 * l * l * l - 0.7034186147 * m * m * m + 1.707614701 * s * s * s;
        return {
            r: fromLinear(red),
            g: fromLinear(green),
            b: fromLinear(blue)
        };
    }

    function rgbToHex(rgb) {
        return "#" + channelToHex(rgb.r) + channelToHex(rgb.g) + channelToHex(rgb.b);
    }

    function adjustOklab(hex, lightnessDelta, chromaScale) {
        var lab = rgbToOklab(hexToRgb(hex));
        return rgbToHex(oklabToRgb({
            l: clamp(lab.l + lightnessDelta, 0, 1),
            a: lab.a * chromaScale,
            b: lab.b * chromaScale
        }));
    }

    function getRelativeLuminance(r, g, b) {
        if (typeof r === "object") {
            g = r.g;
            b = r.b;
            r = r.r;
        }
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    function interpolateColor(t, fromColor, toColor) {
        var from = hexToRgb(fromColor);
        var to = hexToRgb(toColor);
        var r = toLinear(from.r) + (toLinear(to.r) - toLinear(from.r)) * t;
        var g = toLinear(from.g) + (toLinear(to.g) - toLinear(from.g)) * t;
        var b = toLinear(from.b) + (toLinear(to.b) - toLinear(from.b)) * t;
        return rgbToHex({ r: fromLinear(r), g: fromLinear(g), b: fromLinear(b) });
    }

    function normalizeColorStops(darkColor, lightColor, midColor) {
        var input = darkColor && typeof darkColor === "object" ? darkColor : null;
        var dark = input ? input.dark : darkColor;
        var mid = input ? input.mid : midColor;
        var light = input ? input.light : lightColor;
        return {
            dark: normalizeHexColor(dark, "#15120c"),
            mid: mid ? normalizeHexColor(mid, "#15120c") : "",
            light: normalizeHexColor(light, "#fff0be")
        };
    }

    function mapLuminanceToStops(luminance, stops) {
        var normalized = normalizeColorStops(stops || {});
        var t = clamp(Number(luminance), 0, 1);
        if (!normalized.mid) {
            return interpolateColor(t, normalized.dark, normalized.light);
        }
        if (t <= 0.5) {
            return interpolateColor(t * 2, normalized.dark, normalized.mid);
        }
        return interpolateColor((t - 0.5) * 2, normalized.mid, normalized.light);
    }

    function mapLuminanceToColor(luminance, darkColor, lightColor, midColor) {
        return mapLuminanceToStops(luminance, normalizeColorStops(darkColor, lightColor, midColor));
    }

    function derivePaletteScaleColors(palette) {
        var colors = palette && palette.colors ? palette.colors : {};
        var shadow = normalizeHexColor(colors.shadow, "#151c24");
        var base = normalizeHexColor(colors.base, "#3d5262");
        var highlight = normalizeHexColor(colors.highlight, "#e2edf2");
        var dark = adjustOklab(shadow, -0.035, 0.94);
        var mid = adjustOklab(base, PALETTE_SCALE_MID_LIGHTNESS_DELTA, 1);
        var light = adjustOklab(highlight, 0.035, 0.96);
        var midLuminance = getRelativeLuminance(hexToRgb(mid));
        var darkLuminance = getRelativeLuminance(hexToRgb(dark));
        var lightLuminance = getRelativeLuminance(hexToRgb(light));
        var i;

        for (i = 0; i < 4 && darkLuminance >= midLuminance; i++) {
            dark = adjustOklab(mid, -0.08 - i * 0.025, 0.9);
            darkLuminance = getRelativeLuminance(hexToRgb(dark));
        }
        for (i = 0; i < 4 && lightLuminance <= midLuminance; i++) {
            light = adjustOklab(mid, 0.08 + i * 0.025, 0.94);
            lightLuminance = getRelativeLuminance(hexToRgb(light));
        }
        if (darkLuminance >= midLuminance) {
            dark = "#000000";
        }
        if (lightLuminance <= midLuminance) {
            light = "#ffffff";
        }
        return { dark: dark, mid: mid, light: light };
    }

    function mapImageData(imageData, darkColor, lightColor, midColor) {
        var source = imageData && imageData.data;
        var mapped;
        var i;
        var color;
        var rgb;
        if (!source) {
            return imageData;
        }
        mapped = new Uint8ClampedArray(source.length);
        for (i = 0; i < source.length; i += 4) {
            color = mapLuminanceToColor(getRelativeLuminance(source[i], source[i + 1], source[i + 2]), darkColor, lightColor, midColor);
            rgb = hexToRgb(color);
            mapped[i] = rgb.r;
            mapped[i + 1] = rgb.g;
            mapped[i + 2] = rgb.b;
            mapped[i + 3] = source[i + 3];
        }
        return { data: mapped, width: imageData.width, height: imageData.height };
    }

    function applyToCanvas(canvas, darkColor, lightColor, midColor) {
        var context;
        var source;
        var mapped;
        var output;
        if (!canvas || typeof canvas.getContext !== "function") {
            return false;
        }
        context = canvas.getContext("2d");
        if (!context || typeof context.getImageData !== "function" || typeof context.putImageData !== "function" || typeof context.createImageData !== "function") {
            return false;
        }
        try {
            source = context.getImageData(0, 0, canvas.width, canvas.height);
            mapped = mapImageData(source, darkColor, lightColor, midColor);
            output = context.createImageData(mapped.width, mapped.height);
            output.data.set(mapped.data);
            context.putImageData(output, 0, 0);
            return true;
        } catch (error) {
            return false;
        }
    }

    function getThemeMapSignature(options) {
        var input = options || {};
        var signature = VERSION + "|" + normalizeMode(input.mode) + "|" +
            normalizeHexColor(input.darkColor, "#15120c") + "|";
        if (input.midColor) {
            signature += normalizeHexColor(input.midColor, "#15120c") + "|";
        }
        return signature + normalizeHexColor(input.lightColor, "#fff0be");
    }

    return {
        version: VERSION,
        normalizeMode: normalizeMode,
        normalizeHexColor: normalizeHexColor,
        getRelativeLuminance: getRelativeLuminance,
        mapLuminanceToColor: mapLuminanceToColor,
        mapLuminanceToStops: mapLuminanceToStops,
        mapImageData: mapImageData,
        applyToCanvas: applyToCanvas,
        derivePaletteScaleColors: derivePaletteScaleColors,
        getThemeMapSignature: getThemeMapSignature
    };
}));
