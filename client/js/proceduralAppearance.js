(function () {
    "use strict";

    var engineVersion = "procedural-appearance-v7";
    // 128 keeps several Lab seed/parameter variants hot while bounding CEP memory use.
    var RECIPE_CACHE_LIMIT = 128;
    var RASTER_CACHE_LIMIT = 24;
    var cacheTools = window.ProceduralCache;
    var recipeCache = cacheTools.createLruCache(RECIPE_CACHE_LIMIT);
    var rasterCache = cacheTools.createLruCache(RASTER_CACHE_LIMIT);

    function clamp(value, min, max) {
        var numeric = Number(value);
        if (isNaN(numeric)) {
            numeric = min;
        }
        return Math.max(min, Math.min(max, numeric));
    }

    function roundNumber(value, fallback) {
        var numeric = Number(value);
        if (isNaN(numeric)) {
            numeric = fallback;
        }
        return Math.round(numeric * 10000) / 10000;
    }

    function hashString(input) {
        var str = String(input || "");
        var hash = 2166136261;
        var i;
        for (i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function createRandom(seed) {
        var state = seed >>> 0;
        return function () {
            state += 0x6D2B79F5;
            var t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function normalizePaletteStrategy(value) {
        var strategy = String(value || "curatedLuminous");
        if (strategy === "spectral") {
            return "curatedLuminous";
        }
        if (strategy === "analog") {
            return "coolLuminous";
        }
        if (strategy === "duotone") {
            return "warmLuminous";
        }
        if (strategy === "warmCool") {
            return "restrainedContrast";
        }
        if (strategy !== "coolLuminous" && strategy !== "warmLuminous" && strategy !== "restrainedContrast") {
            return "curatedLuminous";
        }
        return strategy;
    }

    function normalizeParams(params) {
        var input = params || {};
        return {
            warp: clamp(roundNumber(input.warp, 1), 0, 1),
            warpIrregularity: clamp(roundNumber(input.warpIrregularity, 1), 0, 1),
            flowComplexity: clamp(roundNumber(input.flowComplexity, 1), 0, 1),
            flowContinuity: clamp(roundNumber(input.flowContinuity, 1), 0, 1),
            ribbonWidth: clamp(roundNumber(input.ribbonWidth, 0.14), 0.06, 0.22),
            gradientBias: clamp(roundNumber(input.gradientBias, 0.7), 0.15, 0.75),
            highlightConcentration: clamp(roundNumber(input.highlightConcentration, 0.35), 0.35, 1),
            highlightArea: clamp(roundNumber(input.highlightArea, 0.08), 0.04, 0.12),
            secondaryHueInfluence: clamp(roundNumber(input.secondaryHueInfluence, 0.58), 0, 1),
            accentPresence: clamp(roundNumber(input.accentPresence, 0.46), 0, 1),
            highlightTintShift: clamp(roundNumber(input.highlightTintShift, 0.62), 0, 1),
            contrast: clamp(roundNumber(input.contrast, 0.88), 0, 1),
            depth: clamp(roundNumber(input.depth, 0.75), 0, 1),
            hueShift: clamp(roundNumber(input.hueShift, 0), -30, 30),
            saturation: clamp(roundNumber(input.saturation, 0.84), 0, 1.4),
            brightness: clamp(roundNumber(input.brightness, 0.84), 0.2, 1.4),
            grain: clamp(roundNumber(input.grain, 0.05), 0, 0.5),
            paletteStrategy: normalizePaletteStrategy(input.paletteStrategy)
        };
    }

    function normalizeTarget(target) {
        return target === "background" ? "background" : "icon";
    }

    function cacheKey(options) {
        var target = normalizeTarget(options && options.target);
        var seed = String(options && options.seed ? options.seed : "shapeAdd");
        var params = normalizeParams(options && options.params);
        var paletteIdentity = getPaletteCacheIdentity(options && options.params);
        var key = engineVersion + "|" + target + "|" + seed + "|" + JSON.stringify(params);
        return paletteIdentity ? key + "|palette:" + paletteIdentity : key;
    }

    function clearCache() {
        recipeCache.clear();
        rasterCache.clear();
    }

    function getCacheStats() {
        return {
            recipe: recipeCache.stats(),
            raster: rasterCache.stats()
        };
    }

    function normalizeRenderScale(value) {
        return cacheTools.normalizeRenderScale(value);
    }

    var SAFE_COLOR_FAMILIES = [
        { id: "cobalt", hue: 258, chroma: 0.15 },
        { id: "indigo", hue: 278, chroma: 0.145 },
        { id: "violet", hue: 305, chroma: 0.14 },
        { id: "cyan", hue: 216, chroma: 0.125 },
        { id: "teal", hue: 184, chroma: 0.115 },
        { id: "coral", hue: 34, chroma: 0.14 },
        { id: "amber", hue: 76, chroma: 0.125 },
        { id: "rose", hue: 8, chroma: 0.135 }
    ];

    var HARMONY_PAIRS = {
        cobalt: { secondary: [184, 216], accent: [34, 8] },
        indigo: { secondary: [205, 184], accent: [8, 34] },
        violet: { secondary: [216, 184], accent: [34, 8] },
        cyan: { secondary: [278, 258], accent: [34, 8] },
        teal: { secondary: [258, 278], accent: [34, 8] },
        coral: { secondary: [184, 216, 258], accent: [76, 305] },
        amber: { secondary: [205, 216, 258], accent: [305, 8] },
        rose: { secondary: [184, 205, 216], accent: [34, 76] }
    };

    function familyPool(strategy) {
        if (strategy === "coolLuminous") {
            return SAFE_COLOR_FAMILIES.slice(0, 5);
        }
        if (strategy === "warmLuminous") {
            return SAFE_COLOR_FAMILIES.slice(5);
        }
        return SAFE_COLOR_FAMILIES;
    }

    function oklabToLinearRgb(L, a, b) {
        var l = L + 0.3963377774 * a + 0.2158037573 * b;
        var m = L - 0.1055613458 * a - 0.0638541728 * b;
        var s = L - 0.0894841775 * a - 1.291485548 * b;
        var l3 = l * l * l;
        var m3 = m * m * m;
        var s3 = s * s * s;
        return {
            r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
            g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
            b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
        };
    }

    function makeOklchColor(lightness, chroma, hue) {
        var radians = (((hue % 360) + 360) % 360) * Math.PI / 180;
        var safeChroma = Math.max(0, chroma);
        var a;
        var b;
        var rgb;
        var attempts = 0;
        do {
            a = safeChroma * Math.cos(radians);
            b = safeChroma * Math.sin(radians);
            rgb = oklabToLinearRgb(lightness, a, b);
            safeChroma *= 0.88;
            attempts += 1;
        } while (attempts < 12 && (rgb.r < 0 || rgb.r > 1 || rgb.g < 0 || rgb.g > 1 || rgb.b < 0 || rgb.b > 1));
        return {
            L: lightness,
            a: a,
            bLab: b,
            r: clamp(rgb.r, 0, 1),
            g: clamp(rgb.g, 0, 1),
            b: clamp(rgb.b, 0, 1)
        };
    }

    function normalizeHue(hue) {
        return ((hue % 360) + 360) % 360;
    }

    function lerpHue(from, to, amount) {
        var start = normalizeHue(from);
        var end = normalizeHue(to);
        var delta = ((end - start + 540) % 360) - 180;
        return normalizeHue(start + delta * clamp(amount, 0, 1));
    }

    function mixOklab(from, to, amount) {
        var t = clamp(amount, 0, 1);
        var L = from.L + (to.L - from.L) * t;
        var a = from.a + (to.a - from.a) * t;
        var b = from.bLab + (to.bLab - from.bLab) * t;
        var rgb = oklabToLinearRgb(L, a, b);
        return {
            L: L,
            a: a,
            bLab: b,
            r: clamp(rgb.r, 0, 1),
            g: clamp(rgb.g, 0, 1),
            b: clamp(rgb.b, 0, 1)
        };
    }

    function linearToSrgb(value) {
        var clamped = clamp(value, 0, 1);
        return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    }

    function srgbToLinear(value) {
        var clamped = clamp(value, 0, 1);
        return clamped <= 0.04045 ? clamped / 12.92 : Math.pow((clamped + 0.055) / 1.055, 2.4);
    }

    function linearRgbToOklab(r, g, b) {
        var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return {
            L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            bLab: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
            r: clamp(r, 0, 1),
            g: clamp(g, 0, 1),
            b: clamp(b, 0, 1)
        };
    }

    function hexToColor(hex) {
        var value = String(hex || "#000000").replace("#", "");
        var r = parseInt(value.slice(0, 2), 16);
        var g = parseInt(value.slice(2, 4), 16);
        var b = parseInt(value.slice(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            r = 0;
            g = 0;
            b = 0;
        }
        return linearRgbToOklab(srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255));
    }

    function getPaletteLibrary() {
        return window.ProceduralPaletteLibrary || null;
    }

    function normalizePaletteId(params) {
        var id = String(params && params.paletteId ? params.paletteId : "");
        id = id.replace(/^\s+|\s+$/g, "");
        if (!id || id === "algorithmDefault") {
            return "";
        }
        return id;
    }

    function resolvePalette(params) {
        var id = normalizePaletteId(params);
        var library = getPaletteLibrary();
        var palette;
        if (!id || !library || typeof library.getPalette !== "function") {
            return null;
        }
        palette = library.getPalette(id);
        if (!palette) {
            return null;
        }
        return {
            id: id,
            palette: palette,
            signature: typeof library.getPaletteSignature === "function" ? library.getPaletteSignature(id) : id
        };
    }

    function getPaletteCacheIdentity(params) {
        var resolved = resolvePalette(params);
        return resolved ? resolved.signature : "";
    }

    function createPalette(seedText, params) {
        var strategy = params.paletteStrategy;
        var paletteSeed = hashString(engineVersion + "|palette|" + seedText + "|" + strategy);
        var random = createRandom(paletteSeed);
        var families = familyPool(strategy);
        var family = families[Math.floor(random() * families.length)];
        var direction;
        var hueJitter = (random() - 0.5) * 6;
        var baseHue = family.hue + params.hueShift + hueJitter;
        var pair = HARMONY_PAIRS[family.id] || HARMONY_PAIRS.cobalt;
        var adjacentHue;
        var secondaryTarget;
        var accentTarget;
        var secondaryHue;
        var accentHue;
        var chromaScale = clamp(0.54 + params.saturation * 0.42, 0.46, 1.08);
        var brightnessShift = (params.brightness - 0.84) * 0.22;
        var baseChroma = family.chroma * chromaScale;

        if (family.id === "teal" || family.id === "rose") {
            direction = 1;
        } else if (family.id === "amber" || family.id === "violet") {
            direction = -1;
        } else {
            direction = random() < 0.5 ? -1 : 1;
        }
        adjacentHue = baseHue + direction * (18 + random() * 8);
        secondaryTarget = pair.secondary[Math.floor(random() * pair.secondary.length)] + params.hueShift * 0.28 + (random() - 0.5) * 8;
        accentTarget = pair.accent[Math.floor(random() * pair.accent.length)] + params.hueShift * 0.18 + (random() - 0.5) * 7;
        if (strategy === "coolLuminous" && family.hue < 120) {
            secondaryTarget = 216 + (random() - 0.5) * 22;
        }
        if (strategy === "warmLuminous" && family.hue > 120) {
            secondaryTarget = 28 + (random() - 0.5) * 18;
        }
        secondaryHue = lerpHue(adjacentHue, secondaryTarget, 0.6 + params.secondaryHueInfluence * 0.34);
        accentHue = lerpHue(baseHue + direction * 30, accentTarget, strategy === "restrainedContrast" ? 0.78 : 0.62 + params.accentPresence * 0.25);

        return {
            strategy: strategy,
            familyId: family.id,
            paletteSeed: paletteSeed,
            shadow: makeOklchColor(clamp(0.24 + brightnessShift * 0.55, 0.16, 0.36), baseChroma * 0.36, baseHue - direction * 3),
            base: makeOklchColor(clamp(0.47 + brightnessShift, 0.34, 0.6), baseChroma * 0.82, baseHue),
            secondary: makeOklchColor(clamp(0.62 + brightnessShift, 0.5, 0.72), baseChroma * (0.7 + params.secondaryHueInfluence * 0.18), secondaryHue),
            highlight: makeOklchColor(clamp(0.83 + brightnessShift * 0.72, 0.72, 0.9), baseChroma * 0.46, lerpHue(baseHue, secondaryHue, 0.24 + params.highlightTintShift * 0.38)),
            accent: makeOklchColor(clamp(0.7 + brightnessShift, 0.6, 0.8), baseChroma * (0.78 + params.accentPresence * 0.18), accentHue)
        };
    }

    function createFixedPalette(resolved) {
        var palette = resolved.palette;
        var shadow = hexToColor(palette.colors.shadow);
        var base = hexToColor(palette.colors.base);
        var secondary = hexToColor(palette.colors.secondary);
        var highlight = hexToColor(palette.colors.highlight);
        return {
            fixedPalette: true,
            paletteId: resolved.id,
            paletteSignature: resolved.signature,
            familyId: palette.family,
            shadow: shadow,
            base: base,
            secondary: secondary,
            highlight: highlight,
            accent: mixOklab(secondary, highlight, 0.42),
            stops: palette.stops.slice(0),
            weights: {
                shadow: Number(palette.weights.shadow),
                base: Number(palette.weights.base),
                secondary: Number(palette.weights.secondary),
                highlight: Number(palette.weights.highlight)
            }
        };
    }

    function createRecipe(options) {
        var target = normalizeTarget(options && options.target);
        var seedText = String(options && options.seed ? options.seed : "shapeAdd");
        var params = normalizeParams(options && options.params);
        var resolvedPalette = resolvePalette(options && options.params);
        var seed = hashString(engineVersion + "|" + target + "|" + seedText);
        var random = createRandom(seed);
        var palette = resolvedPalette ? createFixedPalette(resolvedPalette) : createPalette(seedText, params);
        var ribbonCount = target === "background" ? 2 : 3;
        var ribbons = [];
        var vortices = [];
        var direction = random() * Math.PI * 2;
        var compositionWidth = target === "background" ? 2.25 : 1;
        var i;

        for (i = 0; i < ribbonCount; i++) {
            ribbons.push({
                offset: -0.28 + (i + 0.5) * (0.56 / ribbonCount) + (random() - 0.5) * 0.08,
                widthScale: 0.74 + random() * 0.52,
                frequencyA: 1.25 + random() * 1.1,
                frequencyB: 2.4 + random() * 1.7,
                amplitudeA: 0.09 + random() * 0.09,
                amplitudeB: 0.025 + random() * 0.045,
                phaseA: random() * Math.PI * 2,
                phaseB: random() * Math.PI * 2,
                polarity: random() < 0.5 ? -1 : 1
            });
        }

        for (i = 0; i < 2; i++) {
            vortices.push({
                x: 0.08 + random() * 0.84,
                y: 0.08 + random() * 0.84,
                radius: 0.22 + random() * 0.32,
                strength: (random() < 0.5 ? -1 : 1) * (0.28 + random() * 0.58)
            });
        }

        return {
            version: engineVersion,
            target: target,
            seed: seedText,
            seedHash: seed,
            params: params,
            palette: palette,
            ribbons: ribbons,
            accentRibbonIndex: seed % ribbonCount,
            vortices: vortices,
            highlight: {
                x: 0.5 - compositionWidth * 0.36 + random() * compositionWidth * 0.72,
                y: 0.18 + random() * 0.64,
                stretch: 0.72 + random() * 0.56,
                angle: direction + (random() - 0.5) * 1.2
            },
            direction: direction,
            phaseA: random() * Math.PI * 2,
            phaseB: random() * Math.PI * 2,
            phaseC: random() * Math.PI * 2,
            cacheKey: cacheKey({ target: target, seed: seedText, params: options && options.params })
        };
    }

    function recipeFor(options) {
        var key = cacheKey(options || {});
        var recipe = recipeCache.get(key);
        if (recipe) {
            return recipe;
        }
        recipe = createRecipe(options || {});
        recipeCache.set(key, recipe);
        return recipe;
    }

    function resizeCanvas(canvas, width, height) {
        var ratio = normalizeRenderScale(window.devicePixelRatio);
        var displayWidth = Math.max(1, Math.round(width));
        var displayHeight = Math.max(1, Math.round(height));
        canvas.width = Math.max(1, Math.round(displayWidth * ratio));
        canvas.height = Math.max(1, Math.round(displayHeight * ratio));
        return {
            ratio: ratio,
            width: canvas.width,
            height: canvas.height
        };
    }

    function clipRoundedRect(ctx, width, height, radius) {
        var r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(width - r, 0);
        ctx.quadraticCurveTo(width, 0, width, r);
        ctx.lineTo(width, height - r);
        ctx.quadraticCurveTo(width, height, width - r, height);
        ctx.lineTo(r, height);
        ctx.quadraticCurveTo(0, height, 0, height - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();
    }

    function smoothstep(edge0, edge1, value) {
        var t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function sampleFlowPalette(palette, position, ribbonEnergy, params, target) {
        var value = clamp(position, 0, 1);
        var secondaryWindow = Math.pow(Math.sin(value * Math.PI), 0.74);
        var transition = Math.sin(value * Math.PI);
        var secondaryAmount = 0.12 * params.secondaryHueInfluence;
        var stops;
        var shadowAmount;
        var fixedSecondary;
        var fixedHighlightLean;
        var fixedMapped;
        if (palette.fixedPalette) {
            stops = palette.stops || [0, 0.34, 0.74, 1];
            shadowAmount = smoothstep(stops[1], stops[0], value) * clamp(palette.weights.shadow * 2.15, 0.18, 0.66);
            fixedSecondary = smoothstep(stops[1], stops[2], value) * (1 - smoothstep(stops[2], stops[3], value));
            fixedSecondary += secondaryWindow * clamp(palette.weights.secondary * 2.4, 0.18, 0.52);
            fixedSecondary += clamp(ribbonEnergy, 0, 1) * (target === "background" ? 0.14 : 0.22);
            fixedHighlightLean = smoothstep(stops[2], stops[3], value) * clamp(palette.weights.highlight * 1.8, 0.05, 0.18);
            fixedMapped = mixOklab(palette.base, palette.shadow, clamp(shadowAmount, 0, 0.58));
            fixedMapped = mixOklab(fixedMapped, palette.secondary, clamp(fixedSecondary, 0, target === "background" ? 0.46 : 0.62));
            return mixOklab(fixedMapped, palette.highlight, clamp(fixedHighlightLean, 0, target === "background" ? 0.1 : 0.16));
        }
        secondaryAmount += secondaryWindow * (0.34 + params.secondaryHueInfluence * 0.36);
        secondaryAmount += clamp(ribbonEnergy, 0, 1) * (target === "background" ? 0.16 : 0.24) * params.secondaryHueInfluence;
        secondaryAmount += transition * 0.1 * params.secondaryHueInfluence;
        return mixOklab(palette.base, palette.secondary, clamp(secondaryAmount, 0, target === "background" ? 0.72 : 0.84));
    }

    function colorWithLightness(color, lightness, chromaScale) {
        var L = clamp(lightness, 0.16, 0.9);
        var scale = clamp(chromaScale, 0.3, 1.08);
        var a;
        var b;
        var rgb;
        var attempts = 0;
        do {
            a = color.a * scale;
            b = color.bLab * scale;
            rgb = oklabToLinearRgb(L, a, b);
            scale *= 0.88;
            attempts += 1;
        } while (attempts < 10 && (rgb.r < 0 || rgb.r > 1 || rgb.g < 0 || rgb.g > 1 || rgb.b < 0 || rgb.b > 1));
        return {
            L: L,
            a: a,
            bLab: b,
            r: clamp(rgb.r, 0, 1),
            g: clamp(rgb.g, 0, 1),
            b: clamp(rgb.b, 0, 1)
        };
    }

    function warpPoint(x, y, recipe) {
        var params = recipe.params;
        var strength = params.warp;
        var irregularity = params.warpIrregularity;
        var complexity = params.flowComplexity;
        var directionX = Math.cos(recipe.direction);
        var directionY = Math.sin(recipe.direction);
        var large = Math.sin((x * directionY + y * directionX) * (2.1 + complexity * 1.8) + recipe.phaseA);
        var cross = Math.cos((x * directionX - y * directionY) * (3.4 + complexity * 2.4) + recipe.phaseB);
        var px = x + directionX * large * strength * 0.16 + directionY * cross * strength * irregularity * 0.08;
        var py = y + directionY * large * strength * 0.13 - directionX * cross * strength * irregularity * 0.09;
        var i;
        var vortex;
        var dx;
        var dy;
        var distance;
        var influence;
        var angle;

        px += Math.sin(y * (5.7 + complexity * 4.2) + recipe.phaseC + Math.sin(x * 3.1 + recipe.phaseA)) * strength * irregularity * 0.045;
        py += Math.cos(x * (4.9 + complexity * 3.6) - recipe.phaseC + Math.cos(y * 2.7 + recipe.phaseB)) * strength * irregularity * 0.04;

        for (i = 0; i < recipe.vortices.length; i++) {
            vortex = recipe.vortices[i];
            dx = px - vortex.x;
            dy = py - vortex.y;
            distance = Math.sqrt(dx * dx + dy * dy);
            influence = Math.exp(-Math.pow(distance / vortex.radius, 2.2)) * strength * irregularity;
            angle = vortex.strength * influence * (1.2 + complexity * 1.8);
            px = vortex.x + dx * Math.cos(angle) - dy * Math.sin(angle);
            py = vortex.y + dx * Math.sin(angle) + dy * Math.cos(angle);
            px += dx * influence * vortex.strength * 0.12;
            py += dy * influence * vortex.strength * 0.12;
        }

        return [px, py];
    }

    function sampleRibbon(x, y, ribbon, recipe) {
        var cosA = Math.cos(recipe.direction);
        var sinA = Math.sin(recipe.direction);
        var localX = (x - 0.5) * cosA + (y - 0.5) * sinA;
        var localY = -(x - 0.5) * sinA + (y - 0.5) * cosA;
        var continuity = recipe.params.flowContinuity;
        var curve = ribbon.offset;
        var width = recipe.params.ribbonWidth * ribbon.widthScale;
        var distance;

        curve += Math.sin(localX * ribbon.frequencyA * Math.PI + ribbon.phaseA) * ribbon.amplitudeA;
        curve += Math.sin(localX * ribbon.frequencyB * Math.PI + ribbon.phaseB) * ribbon.amplitudeB * (0.45 + continuity * 0.55);
        distance = Math.abs(localY - curve);
        return Math.exp(-Math.pow(distance / Math.max(0.025, width), 2.2 + continuity * 1.3));
    }

    function coordinateNoise(x, y, seed) {
        var n = Math.imul((x + 1) ^ seed, 374761393) + Math.imul((y + 1) ^ (seed >>> 8), 668265263);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    function renderField(width, height, recipe) {
        var rasterKey = recipe.cacheKey + "|" + width + "x" + height;
        var canvas;
        var ctx;
        var image;
        var data;
        var params = recipe.params;
        var target = recipe.target;
        var aspect = width / height;
        var x;
        var y;
        var index;
        var point;
        var nx;
        var ny;
        var flowX;
        var flowY;
        var largeA;
        var largeB;
        var fineFlow;
        var colorPosition;
        var centeredPosition;
        var ribbonEnergy;
        var ribbonProfile;
        var accentProfile;
        var accentAmount;
        var highlight;
        var calm;
        var ribbon;
        var highlightDx;
        var highlightDy;
        var highlightCos;
        var highlightSin;
        var highlightX;
        var highlightY;
        var highlightRadius;
        var highlightDistance;
        var mapped;
        var tone;
        var chromaScale;
        var r;
        var g;
        var b;
        var grain;
        var i;

        canvas = rasterCache.get(rasterKey);
        if (canvas) {
            return canvas;
        }
        canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        image = ctx.createImageData(width, height);
        data = image.data;

        for (y = 0; y < height; y++) {
            for (x = 0; x < width; x++) {
                nx = x / Math.max(1, width - 1);
                ny = y / Math.max(1, height - 1);
                point = warpPoint((nx - 0.5) * aspect + 0.5, ny, recipe);
                flowX = (point[0] - 0.5) * Math.cos(recipe.direction) + (point[1] - 0.5) * Math.sin(recipe.direction);
                flowY = -(point[0] - 0.5) * Math.sin(recipe.direction) + (point[1] - 0.5) * Math.cos(recipe.direction);
                largeA = Math.sin((flowX * 1.7 + flowY * 0.62) * Math.PI + recipe.phaseA);
                largeB = Math.sin((flowX * -0.92 + flowY * 2.15) * Math.PI + recipe.phaseB + largeA * (0.28 + params.flowContinuity * 0.42));
                fineFlow = Math.sin((flowX * 3.7 - flowY * 2.55) * Math.PI + recipe.phaseC + largeB * 0.72);
                colorPosition = 0.5 + largeA * 0.2 + largeB * 0.16;
                colorPosition += fineFlow * (0.025 + (1 - params.flowContinuity) * 0.045);
                ribbonEnergy = 0;
                accentProfile = 0;

                for (i = 0; i < recipe.ribbons.length; i++) {
                    ribbon = recipe.ribbons[i];
                    ribbonProfile = sampleRibbon(point[0], point[1], ribbon, recipe);
                    ribbonEnergy = Math.min(1, ribbonEnergy + ribbonProfile * 0.48);
                    colorPosition += ribbonProfile * ribbon.polarity * (0.055 + params.flowComplexity * 0.04);
                    if (i === recipe.accentRibbonIndex) {
                        accentProfile = ribbonProfile;
                    }
                }

                centeredPosition = clamp(colorPosition, 0, 1) * 2 - 1;
                centeredPosition = (centeredPosition < 0 ? -1 : 1) * Math.pow(Math.abs(centeredPosition), 0.86 + params.gradientBias * 0.28);
                colorPosition = centeredPosition * 0.5 + 0.5;

                highlightDx = point[0] - recipe.highlight.x;
                highlightDy = point[1] - recipe.highlight.y;
                highlightCos = Math.cos(recipe.highlight.angle);
                highlightSin = Math.sin(recipe.highlight.angle);
                highlightX = (highlightDx * highlightCos + highlightDy * highlightSin) / recipe.highlight.stretch;
                highlightY = (-highlightDx * highlightSin + highlightDy * highlightCos) * recipe.highlight.stretch;
                highlightRadius = Math.sqrt(params.highlightArea / Math.PI) * (target === "background" ? 1.05 : 0.94);
                highlightDistance = Math.sqrt(highlightX * highlightX + highlightY * highlightY) / Math.max(0.06, highlightRadius);
                highlight = Math.exp(-Math.pow(highlightDistance, 3.4 + params.highlightConcentration * 2.8));

                calm = target === "background" ? 0.84 + smoothstep(0.08, 0.78, nx) * 0.12 : 1;
                tone = 0.46 + largeA * 0.105 + largeB * 0.085;
                tone += fineFlow * 0.018 + ribbonEnergy * (0.035 + params.depth * 0.025);
                tone += highlight * (0.13 + params.depth * 0.07);
                tone = 0.5 + (tone - 0.5) * (0.82 + params.contrast * 0.42);
                tone = 0.44 + (tone - 0.44) * calm;
                tone = clamp(tone, 0.24, 0.84);

                mapped = sampleFlowPalette(recipe.palette, colorPosition, ribbonEnergy, params, target);
                accentAmount = Math.pow(clamp(accentProfile, 0, 1), 2.65) * (target === "background" ? 0.08 : 0.15) * (0.45 + params.accentPresence * 0.75);
                accentAmount += Math.pow(highlight, 2.1) * (target === "background" ? 0.025 : 0.045) * params.accentPresence;
                accentAmount = clamp(accentAmount, 0, target === "background" ? 0.12 : 0.2);
                mapped = mixOklab(mapped, recipe.palette.accent, accentAmount);
                mapped = mixOklab(mapped, recipe.palette.highlight, highlight * (0.1 + params.highlightTintShift * 0.1));
                chromaScale = 0.58 + smoothstep(0.24, 0.58, tone) * 0.42;
                mapped = colorWithLightness(mapped, tone, chromaScale);
                r = mapped.r;
                g = mapped.g;
                b = mapped.b;

                if (params.grain > 0) {
                    grain = (coordinateNoise(x, y, recipe.seedHash) - 0.5) * params.grain * 0.08;
                    r += grain;
                    g += grain;
                    b += grain;
                }

                index = (y * width + x) * 4;
                data[index] = Math.round(linearToSrgb(r) * 255);
                data[index + 1] = Math.round(linearToSrgb(g) * 255);
                data[index + 2] = Math.round(linearToSrgb(b) * 255);
                data[index + 3] = 255;
            }
        }

        ctx.putImageData(image, 0, 0);
        rasterCache.set(rasterKey, canvas);
        return canvas;
    }

    function render(canvas, options) {
        var target = normalizeTarget(options && options.target);
        var logicalWidth = options && options.logicalWidth ? options.logicalWidth : (target === "background" ? 360 : 180);
        var logicalHeight = options && options.logicalHeight ? options.logicalHeight : (target === "background" ? 160 : 180);
        var size = resizeCanvas(canvas, logicalWidth, logicalHeight);
        var ctx = canvas.getContext("2d");
        var recipe = recipeFor(options || {});
        var fieldCanvas = renderField(size.width, size.height, recipe);
        var shouldClip = !options || options.clipToCanvas !== false;

        ctx.save();
        ctx.clearRect(0, 0, size.width, size.height);
        if (shouldClip) {
            clipRoundedRect(ctx, size.width, size.height, target === "background" ? 26 * size.ratio : 36 * size.ratio);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(fieldCanvas, 0, 0, size.width, size.height);
        ctx.restore();

        return {
            engineVersion: engineVersion,
            target: recipe.target,
            seed: recipe.seed,
            seedHash: recipe.seedHash,
            params: recipe.params,
            cacheKey: recipe.cacheKey
        };
    }

    window.ProceduralAppearance = {
        engineVersion: engineVersion,
        hashString: hashString,
        createRandom: createRandom,
        normalizeParams: normalizeParams,
        normalizeRenderScale: normalizeRenderScale,
        cacheKey: cacheKey,
        createRecipe: createRecipe,
        render: render,
        clearCache: clearCache,
        getCacheStats: getCacheStats
    };
}());
