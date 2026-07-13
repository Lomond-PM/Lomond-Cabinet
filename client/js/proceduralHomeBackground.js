(function (root, factory) {
    "use strict";

    var api = factory(root);
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralHomeBackground = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
    "use strict";

    var CONTROLLER_VERSION = "procedural-home-background-v1";
    var DEFAULT_MODE = "followIconTheme";
    var DEFAULT_SEED = "background-demo-01";
    var DEFAULT_PALETTE_ID = "algorithmDefault";
    var DEFAULT_INTENSITY = 0.28;
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeMode(value) {
        if (value === "classic") {
            return "classic";
        }
        if (value === "procedural" || value === "manual") {
            return "procedural";
        }
        return DEFAULT_MODE;
    }

    function normalizeSeed(value) {
        var seed = String(value || "").replace(/^\s+|\s+$/g, "");
        return seed || DEFAULT_SEED;
    }

    function normalizePaletteId(value) {
        var id = String(value || "").replace(/^\s+|\s+$/g, "");
        return id || DEFAULT_PALETTE_ID;
    }

    function normalizeIntensity(value) {
        var number = Number(value);
        if (!isFinite(number)) {
            return DEFAULT_INTENSITY;
        }
        return Math.round(clamp(number, 0.05, 0.7) * 100) / 100;
    }

    function normalizeRenderScale(value) {
        var number = Number(value);
        if (!isFinite(number) || number < 1) {
            return 1;
        }
        return clamp(number, 1, 1.25);
    }

    function normalizeThemeMappingParams(value) {
        var themeMap = root && root.ProceduralThemeMap;
        if (themeMap && typeof themeMap.normalizeMappingParams === "function") {
            return themeMap.normalizeMappingParams(value || {});
        }
        return value || {};
    }

    function normalizeIconAppearance(options) {
        var input = options || {};
        return {
            mode: input.mode === "themeMapped" ? "themeMapped" : "colorful",
            darkSourceMode: input.darkSourceMode === "paletteScale" ? "paletteScale" : "manualEndpoints",
            darkPaletteId: normalizePaletteId(input.darkPaletteId),
            darkColor: String(input.darkColor || "#15120c").toLowerCase(),
            midColor: String(input.midColor || "").toLowerCase(),
            lightColor: String(input.lightColor || "#fff0be").toLowerCase(),
            mappingParams: normalizeThemeMappingParams(input.mappingParams)
        };
    }

    function getSharedParams(options) {
        var config = options || {};
        var normalizer = config.normalizeParams;
        var engine = root && root.ProceduralAppearance;
        if (typeof normalizer !== "function" && engine && typeof engine.normalizeParams === "function") {
            normalizer = engine.normalizeParams;
        }
        if (typeof normalizer === "function") {
            return normalizer(config.params || {});
        }
        return config.params || {};
    }

    function resolvePalette(options, paletteId) {
        var resolver = options && options.paletteResolver;
        var palette;
        var signature;

        if (!resolver) {
            resolver = root && root.ProceduralPaletteStore;
        }
        if (!resolver && root) {
            resolver = root.ProceduralPaletteLibrary;
        }
        if (!resolver || paletteId === DEFAULT_PALETTE_ID) {
            return {
                id: DEFAULT_PALETTE_ID,
                signature: DEFAULT_PALETTE_ID,
                palette: null
            };
        }
        try {
            if (typeof resolver.getResolvedPalette === "function") {
                palette = resolver.getResolvedPalette(paletteId);
            } else if (typeof resolver.getPalette === "function") {
                palette = resolver.getPalette(paletteId);
            }
            if (!palette) {
                return {
                    id: DEFAULT_PALETTE_ID,
                    signature: DEFAULT_PALETTE_ID,
                    palette: null
                };
            }
            if (typeof resolver.getResolvedPaletteSignature === "function") {
                signature = resolver.getResolvedPaletteSignature(paletteId);
            } else if (typeof resolver.getPaletteSignature === "function") {
                signature = resolver.getPaletteSignature(paletteId);
            }
            return {
                id: paletteId,
                signature: String(signature || paletteId),
                palette: palette
            };
        } catch (error) {
            return {
                id: DEFAULT_PALETTE_ID,
                signature: DEFAULT_PALETTE_ID,
                palette: null
            };
        }
    }

    function buildBackgroundInput(options) {
        var config = options || {};
        var paletteId = normalizePaletteId(config.paletteId);
        var resolved = resolvePalette(config, paletteId);
        var params = getSharedParams(config);

        if (resolved.id !== DEFAULT_PALETTE_ID) {
            params.paletteId = resolved.id;
        }
        return {
            controllerVersion: CONTROLLER_VERSION,
            target: "background",
            seed: normalizeSeed(config.seed),
            paletteId: resolved.id,
            paletteSignature: resolved.signature,
            params: params
        };
    }

    function getSourceSignature(input, size, engineVersion) {
        var source = input || buildBackgroundInput({});
        var dimensions = size || {};
        return [
            String(engineVersion || "unknown"),
            source.controllerVersion,
            source.target,
            source.seed,
            source.paletteId,
            source.paletteSignature,
            Number(dimensions.logicalWidth) || 0,
            Number(dimensions.logicalHeight) || 0,
            Number(dimensions.renderScale) || 1,
            Number(dimensions.backingWidth) || 0,
            Number(dimensions.backingHeight) || 0,
            JSON.stringify(source.params)
        ].join("|");
    }

    function getRenderSize(shell, devicePixelRatio) {
        var rect;
        var width;
        var height;
        var renderScale = normalizeRenderScale(devicePixelRatio);
        if (!shell || typeof shell.getBoundingClientRect !== "function") {
            return null;
        }
        rect = shell.getBoundingClientRect();
        width = Number(rect && rect.width);
        height = Number(rect && rect.height);
        if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }
        return {
            logicalWidth: width,
            logicalHeight: height,
            renderScale: renderScale,
            backingWidth: Math.max(1, Math.round(width * renderScale)),
            backingHeight: Math.max(1, Math.round(height * renderScale))
        };
    }

    function createRegeneratedSeed(previousSeed) {
        var base = normalizeSeed(previousSeed);
        var stamp = new Date().getTime().toString(36);
        var seed = "background-" + stamp;
        if (seed === base) {
            seed += "-next";
        }
        return seed;
    }

    function safeClassToggle(element, className, enabled) {
        if (!element || !element.classList) {
            return;
        }
        if (enabled) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    function createController(environment) {
        var env = environment || root || {};
        var state = {
            initialized: false,
            shuttingDown: false,
            shell: null,
            canvas: null,
            resizeObserver: null,
            resizeHandler: null,
            visibilityHandler: null,
            frameId: null,
            generation: 0,
            rendered: false,
            sourceSignature: "",
            presentationSignature: "",
            sourceCanvas: null,
            sourceField: null,
            lut: null,
            sourceGenerationCount: 0,
            presentationGenerationCount: 0,
            lastError: "",
            warnedError: "",
            config: {
                mode: "classic",
                seed: DEFAULT_SEED,
                paletteId: DEFAULT_PALETTE_ID,
                intensity: DEFAULT_INTENSITY,
                iconAppearance: normalizeIconAppearance({})
            }
        };

        function getDocument() {
            return env.document || (env.window && env.window.document) || null;
        }

        function getEngine() {
            return env.ProceduralAppearance || (env.window && env.window.ProceduralAppearance) || (root && root.ProceduralAppearance);
        }

        function getPaletteResolver() {
            return env.ProceduralPaletteStore || env.ProceduralPaletteLibrary ||
                (env.window && (env.window.ProceduralPaletteStore || env.window.ProceduralPaletteLibrary)) || null;
        }

        function getThemeMap() {
            return env.ProceduralThemeMap || (env.window && env.window.ProceduralThemeMap) || (root && root.ProceduralThemeMap);
        }

        function resolvePalette(id) {
            var resolver = getPaletteResolver();
            var palette;
            if (!resolver || !id || id === DEFAULT_PALETTE_ID) {
                return null;
            }
            try {
                if (typeof resolver.getResolvedPalette === "function") {
                    palette = resolver.getResolvedPalette(id);
                } else if (typeof resolver.getPalette === "function") {
                    palette = resolver.getPalette(id);
                }
                return palette || null;
            } catch (error) {
                return null;
            }
        }

        function resolvePresentationColors() {
            var appearance = state.config.iconAppearance;
            var themeMap = getThemeMap();
            var palette;
            var colors;

            if (state.config.mode !== DEFAULT_MODE || appearance.mode !== "themeMapped" || !themeMap) {
                return null;
            }
            if (appearance.darkSourceMode === "paletteScale") {
                palette = resolvePalette(appearance.darkPaletteId);
                if (palette && typeof themeMap.derivePaletteScaleColors === "function") {
                    colors = themeMap.derivePaletteScaleColors(palette, appearance.mappingParams);
                    if (colors) {
                        return colors;
                    }
                }
            }
            colors = {
                dark: appearance.darkColor,
                mid: appearance.midColor,
                light: appearance.lightColor
            };
            if (!colors.mid && typeof themeMap.mapLuminanceToColor === "function") {
                colors.mid = themeMap.mapLuminanceToColor(0.5, colors.dark, colors.light);
            }
            return colors;
        }

        function getEffectivePaletteIdForConfig(config) {
            var input = config || state.config;
            var appearance = input.iconAppearance || normalizeIconAppearance({});
            if (input.mode === DEFAULT_MODE && appearance.mode === "themeMapped" && appearance.darkSourceMode === "paletteScale" && appearance.darkPaletteId !== DEFAULT_PALETTE_ID) {
                return appearance.darkPaletteId;
            }
            if (input.mode === DEFAULT_MODE && appearance.mode === "themeMapped" && appearance.darkSourceMode === "manualEndpoints") {
                return DEFAULT_PALETTE_ID;
            }
            return input.paletteId;
        }

        function getEffectivePaletteId() {
            return getEffectivePaletteIdForConfig(state.config);
        }

        function parseHexColor(value) {
            var hex = String(value || "#000000").replace(/^#/, "");
            return {
                r: parseInt(hex.slice(0, 2), 16) || 0,
                g: parseInt(hex.slice(2, 4), 16) || 0,
                b: parseInt(hex.slice(4, 6), 16) || 0
            };
        }

        function getLuminanceByte(r, g, b, themeMap) {
            if (themeMap && typeof themeMap.getRelativeLuminance === "function") {
                return Math.max(0, Math.min(255, Math.round(themeMap.getRelativeLuminance(r, g, b) * 255)));
            }
            function linear(channel) {
                var value = channel / 255;
                return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
            }
            return Math.max(0, Math.min(255, Math.round((0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)) * 255)));
        }

        function buildLut(colors, mappingParams) {
            var themeMap = getThemeMap();
            var lut = [];
            var i;
            var hex;
            if (!colors || !themeMap || typeof themeMap.mapLuminanceToColor !== "function") {
                return null;
            }
            for (i = 0; i < 256; i++) {
                hex = themeMap.mapLuminanceToColor(i / 255, colors.dark, colors.light, colors.mid, mappingParams);
                lut.push(parseHexColor(hex));
            }
            return lut;
        }

        function getPresentationColorsSignature(colors) {
            var themeMap = getThemeMap();
            if (!colors || !themeMap || typeof themeMap.getThemeMapSignature !== "function") {
                return "colorful";
            }
            return themeMap.getThemeMapSignature({
                mode: "themeMapped",
                darkColor: colors.dark,
                midColor: colors.mid,
                lightColor: colors.light,
                mappingParams: state.config.iconAppearance.mappingParams
            });
        }

        function createSourceCanvas() {
            var doc = getDocument();
            if (!doc || typeof doc.createElement !== "function") {
                return null;
            }
            try {
                return doc.createElement("canvas");
            } catch (error) {
                return null;
            }
        }

        function extractSourceField(sourceCanvas) {
            var context;
            var image;
            var source;
            var luminance;
            var alpha;
            var pixelCount;
            var i;
            var offset;
            var themeMap = getThemeMap();
            if (!sourceCanvas || typeof sourceCanvas.getContext !== "function") {
                throw new Error("BACKGROUND_SOURCE_CONTEXT_MISSING");
            }
            context = sourceCanvas.getContext("2d");
            if (!context || typeof context.getImageData !== "function") {
                throw new Error("BACKGROUND_SOURCE_READ_UNAVAILABLE");
            }
            image = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            source = image && image.data;
            if (!source) {
                throw new Error("BACKGROUND_SOURCE_DATA_MISSING");
            }
            pixelCount = sourceCanvas.width * sourceCanvas.height;
            luminance = new Uint8Array(pixelCount);
            alpha = new Uint8ClampedArray(pixelCount);
            for (i = 0; i < pixelCount; i++) {
                offset = i * 4;
                luminance[i] = getLuminanceByte(source[offset], source[offset + 1], source[offset + 2], themeMap);
                alpha[i] = source[offset + 3];
            }
            return {
                width: sourceCanvas.width,
                height: sourceCanvas.height,
                luminance: luminance,
                alpha: alpha
            };
        }

        function buildSourceLut(colors, mappingParams) {
            return buildLut(colors, mappingParams);
        }

        function ensurePresentationLut(colors, signature, mappingParams) {
            if (!colors) {
                return null;
            }
            if (state.lut && state.lut.signature === signature) {
                return state.lut.values;
            }
            state.lut = {
                signature: signature,
                values: buildSourceLut(colors, mappingParams)
            };
            if (!state.lut.values) {
                throw new Error("BACKGROUND_THEME_LUT_UNAVAILABLE");
            }
            return state.lut.values;
        }

        function renderSourceField(engine, input, size, signature, token) {
            var sourceCanvas = state.sourceCanvas;
            var result;
            var field;
            if (state.sourceField && state.sourceField.signature === signature) {
                return true;
            }
            if (!sourceCanvas) {
                sourceCanvas = createSourceCanvas();
                state.sourceCanvas = sourceCanvas;
            }
            if (!sourceCanvas) {
                throw new Error("BACKGROUND_SOURCE_CANVAS_MISSING");
            }
            result = engine.render(sourceCanvas, {
                target: "background",
                seed: input.seed,
                params: input.params,
                logicalWidth: size.logicalWidth,
                logicalHeight: size.logicalHeight,
                renderScale: size.renderScale,
                clipToCanvas: false
            });
            if (!result) {
                throw new Error("BACKGROUND_RENDER_EMPTY");
            }
            if (token !== state.generation || state.shuttingDown) {
                return false;
            }
            field = extractSourceField(sourceCanvas);
            field.signature = signature;
            state.sourceField = field;
            state.sourceSignature = signature;
            state.sourceGenerationCount += 1;
            state.presentationSignature = "";
            state.lut = null;
            return true;
        }

        function presentSourceField(colors, signature, token) {
            var field = state.sourceField;
            var context;
            var image;
            var data;
            var lut;
            var i;
            var offset;
            var mapped;
            if (!field || !state.canvas || typeof state.canvas.getContext !== "function") {
                throw new Error("BACKGROUND_CANVAS_MISSING");
            }
            if (token !== state.generation || state.shuttingDown) {
                return false;
            }
            context = state.canvas.getContext("2d");
            if (!context) {
                throw new Error("BACKGROUND_CONTEXT_MISSING");
            }
            state.canvas.width = field.width;
            state.canvas.height = field.height;
            if (!colors) {
                if (typeof context.clearRect !== "function" || typeof context.drawImage !== "function") {
                    throw new Error("BACKGROUND_PRESENTATION_DRAW_UNAVAILABLE");
                }
                context.clearRect(0, 0, field.width, field.height);
                context.drawImage(state.sourceCanvas, 0, 0, field.width, field.height);
            } else {
                if (typeof context.createImageData !== "function" || typeof context.putImageData !== "function") {
                    throw new Error("BACKGROUND_PRESENTATION_WRITE_UNAVAILABLE");
                }
                lut = ensurePresentationLut(colors, signature, state.config.iconAppearance.mappingParams);
                image = context.createImageData(field.width, field.height);
                data = image.data;
                for (i = 0; i < field.luminance.length; i++) {
                    offset = i * 4;
                    mapped = lut[field.luminance[i]];
                    data[offset] = mapped.r;
                    data[offset + 1] = mapped.g;
                    data[offset + 2] = mapped.b;
                    data[offset + 3] = field.alpha[i];
                }
                context.putImageData(image, 0, 0);
            }
            if (token !== state.generation || state.shuttingDown) {
                return false;
            }
            state.presentationSignature = signature;
            state.presentationGenerationCount += 1;
            state.lastError = "";
            showSurface();
            return true;
        }

        function getDevicePixelRatio() {
            return env.devicePixelRatio || (env.window && env.window.devicePixelRatio) || (root && root.devicePixelRatio) || 1;
        }

        function getHomeView() {
            var doc = getDocument();
            return doc && typeof doc.getElementById === "function" ? doc.getElementById("homeView") : null;
        }

        function isVisible() {
            var doc = getDocument();
            var home = getHomeView();
            if (doc && doc.hidden) {
                return false;
            }
            if (home && home.classList && typeof home.classList.contains === "function") {
                return home.classList.contains("is-active");
            }
            return true;
        }

        function cancelFrame() {
            if (state.frameId === null) {
                return;
            }
            if (typeof env.cancelAnimationFrame === "function") {
                env.cancelAnimationFrame(state.frameId);
            } else if (env.window && typeof env.window.cancelAnimationFrame === "function") {
                env.window.cancelAnimationFrame(state.frameId);
            } else if (typeof env.clearTimeout === "function") {
                env.clearTimeout(state.frameId);
            }
            state.frameId = null;
        }

        function requestFrame(callback) {
            if (typeof env.requestAnimationFrame === "function") {
                return env.requestAnimationFrame(callback);
            }
            if (env.window && typeof env.window.requestAnimationFrame === "function") {
                return env.window.requestAnimationFrame(callback);
            }
            if (typeof env.setTimeout === "function") {
                return env.setTimeout(callback, 0);
            }
            return null;
        }

        function hideSurface() {
            if (state.canvas && state.canvas.style) {
                state.canvas.style.display = "none";
                state.canvas.style.opacity = "0";
            }
            safeClassToggle(state.shell, "procedural-background-active", false);
            state.rendered = false;
        }

        function showSurface() {
            if (!state.canvas || !state.shell) {
                return;
            }
            if (state.canvas.style) {
                state.canvas.style.display = "block";
                state.canvas.style.opacity = String(state.config.intensity);
            }
            safeClassToggle(state.shell, "procedural-background-active", true);
            state.rendered = true;
        }

        function failRender(code) {
            state.lastError = code || "BACKGROUND_RENDER_ERROR";
            if (!state.rendered) {
                hideSurface();
            }
            if (state.warnedError !== state.lastError) {
                state.warnedError = state.lastError;
                if (env.console && typeof env.console.warn === "function") {
                    env.console.warn("[ProceduralHomeBackground] " + state.lastError);
                } else if (root && root.console && typeof root.console.warn === "function") {
                    root.console.warn("[ProceduralHomeBackground] " + state.lastError);
                }
            }
        }

        function renderNow(token) {
            var engine;
            var size;
            var input;
            var signature;
            var presentationColors;
            var presentationSignature;
            if (state.frameId !== null) {
                state.frameId = null;
            }
            if (typeof token === "undefined") {
                token = state.generation;
            }
            if (token !== state.generation || !state.initialized || state.shuttingDown || state.config.mode === "classic") {
                return false;
            }
            if (!isVisible()) {
                hideSurface();
                return false;
            }
            if (!state.canvas || !state.shell) {
                failRender("BACKGROUND_CANVAS_MISSING");
                return false;
            }
            engine = getEngine();
            if (!engine || typeof engine.render !== "function") {
                failRender("BACKGROUND_ENGINE_MISSING");
                return false;
            }
            size = getRenderSize(state.shell, getDevicePixelRatio());
            if (!size) {
                return false;
            }
            input = buildBackgroundInput({
                seed: state.config.seed,
                paletteId: getEffectivePaletteId(),
                paletteResolver: getPaletteResolver(),
                params: state.config.params,
                normalizeParams: engine.normalizeParams
            });
            signature = getSourceSignature(input, size, engine.engineVersion);
            presentationColors = resolvePresentationColors();
            presentationSignature = getPresentationColorsSignature(presentationColors);
            if (state.rendered && state.sourceSignature === signature && state.presentationSignature === presentationSignature) {
                showSurface();
                return true;
            }
            try {
                if (!renderSourceField(engine, input, size, signature, token)) {
                    return false;
                }
                return presentSourceField(presentationColors, presentationSignature, token);
            } catch (error) {
                failRender(error && error.message ? error.message : "BACKGROUND_RENDER_ERROR");
                return false;
            }
        }

        function schedule() {
            if (!state.initialized || state.shuttingDown || state.config.mode === "classic" || !isVisible()) {
                return;
            }
            if (state.frameId !== null) {
                return;
            }
            (function (token) {
                state.frameId = requestFrame(function () {
                    renderNow(token);
                });
            }(state.generation));
        }

        function bindObservers() {
            var Observer = env.ResizeObserver || (env.window && env.window.ResizeObserver);
            var doc = getDocument();
            state.resizeHandler = schedule;
            if (typeof Observer === "function" && state.shell) {
                state.resizeObserver = new Observer(function () {
                    schedule();
                });
                state.resizeObserver.observe(state.shell);
            } else if (typeof env.addEventListener === "function") {
                env.addEventListener("resize", state.resizeHandler);
            } else if (env.window && typeof env.window.addEventListener === "function") {
                env.window.addEventListener("resize", state.resizeHandler);
            }
            state.visibilityHandler = function () {
                if (isVisible()) {
                    schedule();
                } else {
                    state.generation += 1;
                    hideSurface();
                    cancelFrame();
                }
            };
            if (doc && typeof doc.addEventListener === "function") {
                doc.addEventListener("visibilitychange", state.visibilityHandler);
            }
        }

        function unbindObservers() {
            var doc = getDocument();
            if (state.resizeObserver && typeof state.resizeObserver.disconnect === "function") {
                state.resizeObserver.disconnect();
            }
            state.resizeObserver = null;
            if (state.resizeHandler) {
                if (typeof env.removeEventListener === "function") {
                    env.removeEventListener("resize", state.resizeHandler);
                }
                if (env.window && typeof env.window.removeEventListener === "function") {
                    env.window.removeEventListener("resize", state.resizeHandler);
                }
            }
            if (doc && state.visibilityHandler && typeof doc.removeEventListener === "function") {
                doc.removeEventListener("visibilitychange", state.visibilityHandler);
            }
            state.resizeHandler = null;
            state.visibilityHandler = null;
        }

        function normalizeConfig(options) {
            var next = options || {};
            var engine = getEngine();
            var normalizer = next.normalizeParams || (engine && engine.normalizeParams);
            var params = next.params || {};
            if (typeof normalizer === "function") {
                params = normalizer(params);
            }
            return {
                mode: normalizeMode(next.mode),
                seed: normalizeSeed(next.seed),
                paletteId: normalizePaletteId(next.paletteId),
                intensity: normalizeIntensity(next.intensity),
                params: params,
                iconAppearance: normalizeIconAppearance(next.iconAppearance)
            };
        }

        function initialize(options) {
            var doc = getDocument();
            var next = options || {};
            if (state.initialized) {
                teardown();
            }
            state.shuttingDown = false;
            state.shell = next.rootElement || next.shell || (doc && doc.getElementById ? doc.getElementById("appShell") : null);
            state.canvas = next.canvas || (doc && doc.getElementById ? doc.getElementById("proceduralHomeBackgroundCanvas") : null);
            state.sourceSignature = "";
            state.presentationSignature = "";
            state.lastError = "";
            state.warnedError = "";
            state.rendered = false;
            state.sourceCanvas = null;
            state.sourceField = null;
            state.lut = null;
            state.generation += 1;
            state.config = normalizeConfig(next);
            state.initialized = true;
            bindObservers();
            hideSurface();
            schedule();
            return api;
        }

        function update(options) {
            options = options || {};
            var next = normalizeConfig({
                mode: typeof options.mode === "undefined" ? state.config.mode : options.mode,
                seed: typeof options.seed === "undefined" ? state.config.seed : options.seed,
                paletteId: typeof options.paletteId === "undefined" ? state.config.paletteId : options.paletteId,
                intensity: typeof options.intensity === "undefined" ? state.config.intensity : options.intensity,
                params: typeof options.params === "undefined" ? state.config.params : options.params,
                normalizeParams: options.normalizeParams,
                iconAppearance: typeof options.iconAppearance === "undefined" ? state.config.iconAppearance : options.iconAppearance
            });
            var oldEffectivePaletteId = getEffectivePaletteIdForConfig(state.config);
            var nextEffectivePaletteId = getEffectivePaletteIdForConfig(next);
            var sourceChanged = next.mode !== state.config.mode || next.seed !== state.config.seed ||
                next.paletteId !== state.config.paletteId ||
                nextEffectivePaletteId !== oldEffectivePaletteId ||
                JSON.stringify(next.params) !== JSON.stringify(state.config.params);
            var presentationChanged = JSON.stringify(next.iconAppearance) !== JSON.stringify(state.config.iconAppearance);
            state.config = next;
            if (!state.initialized || state.shuttingDown) {
                return api;
            }
            if (!isVisible()) {
                state.generation += 1;
                cancelFrame();
                hideSurface();
                return api;
            }
            if (state.config.mode === "classic") {
                state.generation += 1;
                cancelFrame();
                hideSurface();
                return api;
            }
            if (sourceChanged) {
                invalidateSource();
            } else if (presentationChanged && state.config.mode === DEFAULT_MODE) {
                invalidatePresentation();
            } else if (!state.rendered) {
                schedule();
            } else if (state.canvas && state.canvas.style) {
                state.canvas.style.opacity = String(state.config.intensity);
            }
            return api;
        }

        function invalidateSource() {
            if (!state.initialized || state.shuttingDown) {
                return api;
            }
            state.generation += 1;
            cancelFrame();
            state.sourceField = null;
            state.sourceSignature = "";
            state.presentationSignature = "";
            state.lut = null;
            schedule();
            return api;
        }

        function invalidatePresentation() {
            if (!state.initialized || state.shuttingDown) {
                return api;
            }
            state.generation += 1;
            cancelFrame();
            state.presentationSignature = "";
            state.lut = null;
            schedule();
            return api;
        }

        function refresh() {
            if (!state.initialized || state.shuttingDown) {
                return api;
            }
            invalidateSource();
            return api;
        }

        function regenerate(seed) {
            var nextSeed = seed || createRegeneratedSeed(state.config.seed);
            update({ seed: nextSeed });
            return state.config.seed;
        }

        function teardown() {
            state.generation += 1;
            cancelFrame();
            unbindObservers();
            hideSurface();
            state.initialized = false;
            state.shuttingDown = true;
            state.shell = null;
            state.canvas = null;
            state.sourceCanvas = null;
            state.sourceField = null;
            state.lut = null;
            state.sourceSignature = "";
            state.presentationSignature = "";
            return api;
        }

        function getState() {
            return {
                initialized: state.initialized,
                shuttingDown: state.shuttingDown,
                rendered: state.rendered,
                sourceSignature: state.sourceSignature,
                presentationSignature: state.presentationSignature,
                sourceGenerationCount: state.sourceGenerationCount,
                presentationGenerationCount: state.presentationGenerationCount,
                generation: state.generation,
                hasSourceField: !!state.sourceField,
                hasSourceCanvas: !!state.sourceCanvas,
                hasLut: !!state.lut,
                lastError: state.lastError,
                config: {
                    mode: state.config.mode,
                    seed: state.config.seed,
                    paletteId: state.config.paletteId,
                    intensity: state.config.intensity,
                    params: state.config.params,
                    iconAppearance: state.config.iconAppearance,
                }
            };
        }

        var api = {
            initialize: initialize,
            update: update,
            invalidateSource: invalidateSource,
            invalidatePresentation: invalidatePresentation,
            refresh: refresh,
            regenerate: regenerate,
            teardown: teardown,
            getState: getState
        };
        return api;
    }

    var singleton = createController(root);
    return {
        version: CONTROLLER_VERSION,
        defaults: {
            mode: DEFAULT_MODE,
            seed: DEFAULT_SEED,
            paletteId: DEFAULT_PALETTE_ID,
            intensity: DEFAULT_INTENSITY
        },
        normalizeMode: normalizeMode,
        normalizeSeed: normalizeSeed,
        normalizePaletteId: normalizePaletteId,
        normalizeIntensity: normalizeIntensity,
        normalizeRenderScale: normalizeRenderScale,
        buildBackgroundInput: buildBackgroundInput,
        getRenderSize: getRenderSize,
        getSourceSignature: getSourceSignature,
        createRegeneratedSeed: createRegeneratedSeed,
        createController: createController,
        initialize: singleton.initialize,
        update: singleton.update,
        invalidateSource: singleton.invalidateSource,
        invalidatePresentation: singleton.invalidatePresentation,
        refresh: singleton.refresh,
        regenerate: singleton.regenerate,
        teardown: singleton.teardown,
        getState: singleton.getState
    };
}));
