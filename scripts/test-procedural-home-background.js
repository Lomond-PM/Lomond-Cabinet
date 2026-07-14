#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const background = require(path.resolve(__dirname, "..", "client", "js", "proceduralHomeBackground.js"));

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function makeClassList() {
    const values = {};
    return {
        add(name) {
            values[name] = true;
        },
        remove(name) {
            delete values[name];
        },
        contains(name) {
            return !!values[name];
        }
    };
}

function makeEnvironment(engine, paletteResolver, themeMap) {
    const frames = [];
    const cancelled = {};
    let nextFrameId = 1;
    const listeners = {};
    const observerInstances = [];
    const homeView = { classList: makeClassList() };
    const shell = {
        classList: makeClassList(),
        getBoundingClientRect() {
            return { width: this.width || 640, height: this.height || 360 };
        },
        width: 640,
        height: 360
    };
    function makeCanvas() {
        const canvas = { style: {}, width: 0, height: 0, _pixels: null };
        function ensurePixels() {
            const length = Math.max(0, canvas.width * canvas.height * 4);
            if (!canvas._pixels || canvas._pixels.length !== length) {
                canvas._pixels = new Uint8ClampedArray(length);
            }
        }
        canvas.getContext = () => ({
            getImageData() {
                ensurePixels();
                return { data: new Uint8ClampedArray(canvas._pixels), width: canvas.width, height: canvas.height };
            },
            createImageData(width, height) {
                return { data: new Uint8ClampedArray(width * height * 4), width, height };
            },
            putImageData(image) {
                canvas._pixels = new Uint8ClampedArray(image.data);
            },
            clearRect() {
                ensurePixels();
                canvas._pixels.fill(0);
            },
            drawImage(source) {
                canvas._pixels = new Uint8ClampedArray(source._pixels || []);
            }
        });
        return canvas;
    }
    const canvas = makeCanvas();
    homeView.classList.add("is-active");
    const document = {
        hidden: false,
        getElementById(id) {
            if (id === "homeView") return homeView;
            if (id === "appShell") return shell;
            if (id === "proceduralHomeBackgroundCanvas") return canvas;
            return null;
        },
        createElement(tagName) {
            return tagName === "canvas" ? makeCanvas() : { style: {} };
        },
        addEventListener(type, callback) {
            listeners[type] = callback;
        },
        removeEventListener(type, callback) {
            if (listeners[type] === callback) delete listeners[type];
        }
    };
    function FakeResizeObserver(callback) {
        this.callback = callback;
        this.disconnected = false;
        this.observe = () => {};
        this.disconnect = () => {
            this.disconnected = true;
        };
        observerInstances.push(this);
    }
    return {
        document,
        shell,
        canvas,
        homeView,
        frames,
        cancelled,
        listeners,
        observerInstances,
        devicePixelRatio: 2.5,
        ProceduralAppearance: engine,
        ProceduralPaletteStore: paletteResolver,
        ProceduralThemeMap: themeMap,
        ResizeObserver: FakeResizeObserver,
        requestAnimationFrame(callback) {
            const id = nextFrameId++;
            frames.push({ id, callback });
            return id;
        },
        cancelAnimationFrame(id) {
            cancelled[id] = true;
        },
        runFrames() {
            while (frames.length) {
                const frame = frames.shift();
                if (!cancelled[frame.id]) frame.callback();
            }
        },
        emit(type) {
            if (listeners[type]) listeners[type]();
        },
        console: { warn() {} }
    };
}

function run() {
    let assertions = 0;
    const controllerSource = fs.readFileSync(path.resolve(__dirname, "..", "client", "js", "proceduralHomeBackground.js"), "utf8");
    const palette = {
        id: "pacificCyan",
        colors: { shadow: "#102936", base: "#26728D", secondary: "#69B9CC", highlight: "#D8F7FF" }
    };
    const warmPalette = {
        id: "warmCoral",
        colors: { shadow: "#402127", base: "#A54F59", secondary: "#E28A79", highlight: "#FFE0C5" }
    };
    const resolver = {
        getResolvedPalette(id) {
            return id === "pacificCyan" ? palette : (id === "warmCoral" ? warmPalette : null);
        },
        getResolvedPaletteSignature(id) {
            return id === "pacificCyan" ? "pacificCyan-v1" : (id === "warmCoral" ? "warmCoral-v1" : "algorithmDefault");
        }
    };
    const inputA = background.buildBackgroundInput({ seed: "background-demo-01", paletteId: "pacificCyan", paletteResolver: resolver });
    const inputB = background.buildBackgroundInput({ seed: "background-demo-01", paletteId: "pacificCyan", paletteResolver: resolver });
    const inputSeed = background.buildBackgroundInput({ seed: "background-demo-02", paletteId: "pacificCyan", paletteResolver: resolver });
    const inputPalette = background.buildBackgroundInput({ seed: "background-demo-01", paletteId: "algorithmDefault", paletteResolver: resolver });
    const sharedParams = { warp: 0.42, brightness: 0.84, paletteStrategy: "curatedLuminous" };
    const sharedInput = background.buildBackgroundInput({ params: { ignored: true }, normalizeParams: () => sharedParams });
    assert(background.normalizeMode() === "followIconTheme", "Background mode must default to followIconTheme.");
    assert(background.normalizeMode("classic") === "classic" && background.normalizeMode("procedural") === "procedural", "Classic and manual procedural modes must remain compatible.");
    assertions += 2;
    assert(inputA.target === "background", "Background input must use the background target.");
    assert(JSON.stringify(inputA) === JSON.stringify(inputB), "Same seed and palette must produce stable background input.");
    assert(inputA.seed !== inputSeed.seed && inputA.paletteId !== inputPalette.paletteId, "Seed and palette must participate in background identity.");
    assert(JSON.stringify(sharedInput.params) === JSON.stringify(sharedParams), "Background input must use the shared normalized parameter object and exclude unrelated values.");
    assert(!/DEFAULT_PARAMS|copyParams/.test(controllerSource), "Background controller must not maintain an independent parameter default table.");
    assertions += 5;

    const size = background.getRenderSize({ getBoundingClientRect: () => ({ width: 500.5, height: 280.25 }) }, 3);
    assert(size.logicalWidth === 500.5 && size.logicalHeight === 280.25, "Logical size must come from the background slot.");
    assert(size.renderScale === 1.25 && size.backingWidth === 626 && size.backingHeight === 350, "Background DPR must clamp at 1.25 and produce matching backing dimensions.");
    const sigA = background.getSourceSignature(inputA, size, "procedural-appearance-v7");
    const sigB = background.getSourceSignature(inputSeed, size, "procedural-appearance-v7");
    const sigSize = background.getSourceSignature(inputA, Object.assign({}, size, { backingWidth: 800 }), "procedural-appearance-v7");
    assert(sigA !== sigB && sigA !== sigSize, "Seed and raster size must change source identity.");
    assertions += 3;

    let renderCount = 0;
    let clearCacheCount = 0;
    let lastRenderOptions = null;
    const engine = {
        engineVersion: "procedural-appearance-v7",
        clearCache() {
            clearCacheCount += 1;
        },
        render(canvas, options) {
            renderCount += 1;
            lastRenderOptions = options;
            canvas.width = Math.round(options.logicalWidth * options.renderScale);
            canvas.height = Math.round(options.logicalHeight * options.renderScale);
            const context = canvas.getContext("2d");
            const image = context.createImageData(canvas.width, canvas.height);
            for (let i = 0; i < image.data.length; i += 4) {
                const value = (i / 4) % 3 === 0 ? 32 : ((i / 4) % 3 === 1 ? 128 : 240);
                image.data[i] = value;
                image.data[i + 1] = value;
                image.data[i + 2] = value;
                image.data[i + 3] = (i / 4) % 3 === 2 ? 128 : 255;
            }
            context.putImageData(image, 0, 0);
            return { ok: true };
        }
    };
    const env = makeEnvironment(engine, resolver);
    const controller = background.createController(env);
    controller.initialize({ mode: "classic", seed: "classic-seed", paletteId: "pacificCyan", intensity: 0.3 });
    env.runFrames();
    assert(renderCount === 0 && !env.shell.classList.contains("procedural-background-active"), "Classic must be the default and must not render the procedural canvas.");
    assertions += 1;

    controller.update({ mode: "procedural", seed: "background-demo-01", paletteId: "pacificCyan", intensity: 0.3 });
    env.runFrames();
    assert(renderCount === 1 && clearCacheCount === 0 && env.canvas.width === 800 && env.canvas.height === 450, "Procedural mode should render one source field at the clamped background resolution without clearing engine cache.");
    assert(lastRenderOptions.target === "background" && lastRenderOptions.clipToCanvas === false, "Procedural background must use the background target without icon clipping.");
    assert(env.shell.classList.contains("procedural-background-active") && env.canvas.style.pointerEvents !== "auto", "Successful render should activate the non-interactive background surface.");
    assertions += 3;

    controller.update({ mode: "procedural", seed: "background-demo-01", paletteId: "pacificCyan", intensity: 0.4 });
    env.runFrames();
    assert(renderCount === 1 && env.canvas.style.opacity === "0.4", "Intensity should update presentation without rerendering the source.");
    assertions += 1;

    env.shell.width = 700;
    env.observerInstances[0].callback();
    env.runFrames();
    assert(renderCount === 2 && controller.getState().sourceGenerationCount === 2, "Resize should schedule a merged source refresh for the new dimensions.");
    assertions += 1;

    env.document.hidden = true;
    controller.update({ seed: "hidden-seed" });
    env.runFrames();
    assert(renderCount === 2 && !env.shell.classList.contains("procedural-background-active"), "Hidden Home must not continue rendering the procedural background.");
    assertions += 1;
    env.document.hidden = false;
    env.emit("visibilitychange");
    env.runFrames();
    assert(renderCount === 3, "Returning to a visible Home should resume rendering.");
    assertions += 1;

    const observer = env.observerInstances[0];
    const generationBeforeTeardown = controller.getState().generation;
    controller.teardown();
    env.runFrames();
    assert(observer.disconnected && !env.shell.classList.contains("procedural-background-active") && controller.getState().generation > generationBeforeTeardown && !controller.getState().hasSourceField && !controller.getState().hasSourceCanvas && !controller.getState().hasLut, "Teardown must disconnect observers, invalidate stale work, hide the surface, and release source references.");
    assertions += 1;

    const failingEnv = makeEnvironment({
        engineVersion: "procedural-appearance-v7",
        render() {
            throw new Error("test-render-failure");
        }
    }, resolver);
    const failingController = background.createController(failingEnv);
    failingController.initialize({ mode: "procedural" });
    failingEnv.runFrames();
    assert(!failingEnv.shell.classList.contains("procedural-background-active") && failingController.getState().lastError === "test-render-failure", "Render failure must fall back to classic without an uncaught error.");
    assertions += 1;

    let themeRenderCount = 0;
    let lutBuildCount = 0;
    const themeEngine = {
        engineVersion: "procedural-appearance-v7",
        render(canvas, options) {
            themeRenderCount += 1;
            canvas.width = Math.round(options.logicalWidth * options.renderScale);
            canvas.height = Math.round(options.logicalHeight * options.renderScale);
            const context = canvas.getContext("2d");
            const image = context.createImageData(canvas.width, canvas.height);
            for (let i = 0; i < image.data.length; i += 4) {
                const value = (i / 4) % 3 === 0 ? 32 : ((i / 4) % 3 === 1 ? 128 : 240);
                image.data[i] = value;
                image.data[i + 1] = value;
                image.data[i + 2] = value;
                image.data[i + 3] = (i / 4) % 3 === 2 ? 128 : 255;
            }
            context.putImageData(image, 0, 0);
            return { ok: true };
        }
    };
    const themeMap = {
        getThemeMapSignature(options) {
            return "theme-map-v2|" + options.darkColor + "|" + options.midColor + "|" + options.lightColor + "|" + (options.paletteId || "") + "|" + (options.paletteSignature || "") + "|" + JSON.stringify(options.mappingParams || {});
        },
        getRelativeLuminance(r, g, b) {
            const value = typeof r === "object" ? (r.r + r.g + r.b) / 3 : (r + g + b) / 3;
            return value / 255;
        },
        mapLuminanceToColor(value, dark, light, mid) {
            lutBuildCount += 1;
            if (value <= 0.5) return value < 0.25 ? dark : mid;
            return value > 0.75 ? light : mid;
        },
        derivePaletteScaleColors() {
            return { dark: "#07131a", mid: "#3d8fa5", light: "#e5fbff" };
        }
    };
    const themeEnv = makeEnvironment(themeEngine, resolver, themeMap);
    const themeController = background.createController(themeEnv);
    themeController.initialize({
        mode: "followIconTheme",
        seed: "background-theme",
        paletteId: "algorithmDefault",
        iconAppearance: {
            mode: "themeMapped",
            darkSourceMode: "manualEndpoints",
            darkColor: "#101010",
            lightColor: "#f0d080"
        }
    });
    themeEnv.runFrames();
    const sourceBeforeThemeChange = themeController.getState().sourceSignature;
    assert(themeRenderCount === 1 && themeController.getState().sourceGenerationCount === 1 && themeController.getState().presentationGenerationCount === 1 && themeEnv.canvas._pixels[11] === 128, "Follow Icon Theme must map the procedural background after one source render while preserving alpha.");
    themeController.update({ iconAppearance: { mode: "themeMapped", darkSourceMode: "manualEndpoints", darkColor: "#202020", lightColor: "#ffe0a0" } });
    themeEnv.runFrames();
    assert(themeRenderCount === 1 && themeController.getState().presentationGenerationCount === 2 && lutBuildCount === 514 && themeController.getState().sourceSignature === sourceBeforeThemeChange, "Changing icon endpoints must refresh presentation without changing background source identity.");
    assertions += 2;

    themeController.update({ iconAppearance: { mode: "themeMapped", darkSourceMode: "manualEndpoints", darkColor: "#303030", lightColor: "#ffe0a0" } });
    themeController.update({ iconAppearance: { mode: "themeMapped", darkSourceMode: "manualEndpoints", darkColor: "#404040", lightColor: "#ffe0a0" } });
    themeEnv.runFrames();
    assert(themeRenderCount === 1 && themeController.getState().presentationGenerationCount === 3 && themeController.getState().presentationSignature.indexOf("#404040") !== -1 && clearCacheCount === 0, "Rapid theme updates must coalesce to the last presentation without regenerating the source or clearing engine cache.");
    assertions += 1;

    const sourceBeforeMappingChange = themeController.getState().sourceSignature;
    themeController.update({ iconAppearance: { mode: "themeMapped", darkSourceMode: "manualEndpoints", darkColor: "#404040", lightColor: "#ffe0a0", mappingParams: { paletteMapContrast: 1.2 } } });
    themeEnv.runFrames();
    assert(themeRenderCount === 1 && themeController.getState().sourceSignature === sourceBeforeMappingChange && themeController.getState().presentationSignature.indexOf("1.2") !== -1, "Palette mapping parameter changes must refresh background presentation without regenerating the source field.");
    assertions += 1;

    const paletteThemeEnv = makeEnvironment(themeEngine, resolver, themeMap);
    const paletteThemeController = background.createController(paletteThemeEnv);
    paletteThemeController.initialize({
        mode: "followIconTheme",
        seed: "background-palette-theme",
        iconAppearance: { mode: "themeMapped", darkSourceMode: "paletteScale", darkPaletteId: "pacificCyan" }
    });
    paletteThemeEnv.runFrames();
    assert(paletteThemeController.getState().config.iconAppearance.darkSourceMode === "paletteScale" && themeRenderCount === 2, "Palette Scale follow mode must reuse the selected source palette relationship.");
    const paletteSourceBeforeSwitch = paletteThemeController.getState().sourceSignature;
    const palettePresentationBeforeSwitch = paletteThemeController.getState().presentationSignature;
    paletteThemeController.update({
        iconAppearance: { mode: "themeMapped", darkSourceMode: "paletteScale", darkPaletteId: "warmCoral" }
    });
    paletteThemeEnv.runFrames();
    assert(themeRenderCount === 2 && clearCacheCount === 0 && paletteThemeController.getState().sourceGenerationCount === 1 && paletteThemeController.getState().presentationGenerationCount === 2 && paletteThemeController.getState().sourceSignature === paletteSourceBeforeSwitch && paletteThemeController.getState().presentationSignature !== palettePresentationBeforeSwitch && paletteThemeController.getState().presentationSignature.indexOf("warmCoral") !== -1, "Switching followIconTheme paletteScale palettes must refresh presentation without regenerating the palette-independent source field or clearing the engine cache.");
    assertions += 2;

    console.log("Procedural Home Background tests passed: " + assertions + " assertions.");
}

run();
