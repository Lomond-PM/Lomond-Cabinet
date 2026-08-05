#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");

const icons = require(path.resolve(__dirname, "..", "client", "js", "proceduralHomeIcons.js"));
const STYLE_CSS = fs.readFileSync(path.resolve(__dirname, "..", "client", "css", "style.css"), "utf8");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return "[" + value.map(stableStringify).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
}

function makeCard(toolId, extra) {
    const attrs = Object.assign({ "data-tool": toolId }, extra || {});
    return {
        parentNode: {},
        getAttribute(name) {
            return attrs[name] || "";
        },
        querySelector() {
            return null;
        }
    };
}

function makeRoot(cards) {
    return {
        querySelectorAll(selector) {
            if (selector !== ".tool-app[data-tool]:not(.is-disabled)") {
                return [];
            }
            return cards;
        }
    };
}

function makeClassList() {
    const classes = {};
    return {
        add(name) {
            classes[name] = true;
        },
        remove(name) {
            delete classes[name];
        },
        contains(name) {
            return !!classes[name];
        }
    };
}

function makeIcon(width, height) {
    return {
        classList: makeClassList(),
        ownerDocument: {
            createElement() {
                return makeCanvas();
            }
        },
        insertBefore(child) {
            this.child = child;
            return child;
        },
        firstChild: null,
        querySelector(selector) {
            if (selector === ".procedural-home-icon-canvas") {
                return this.child || null;
            }
            return null;
        },
        getBoundingClientRect() {
            return {
                width,
                height
            };
        }
    };
}

function makeCanvas() {
    const attrs = {};
    return {
        className: "",
        width: 0,
        height: 0,
        style: {},
        setAttribute(name, value) {
            attrs[name] = String(value);
        },
        getAttribute(name) {
            return attrs[name] || "";
        },
        getContext(type) {
            if (type !== "2d") {
                return null;
            }
            return {
                clearRect() {},
                drawImage() {}
            };
        }
    };
}

function makeRenderableCard(toolId, icon) {
    const card = makeCard(toolId);
    card.querySelector = function (selector) {
        return selector === ".tool-icon" ? icon : null;
    };
    return card;
}

function run() {
    let assertions = 0;

    const base = icons.createIconInput({
        toolId: "shapeAdd",
        label: "Shape Builder",
        language: "en",
        theme: "#ffffff",
        index: 0
    });
    const translated = icons.createIconInput({
        toolId: "shapeAdd",
        label: "添加形状",
        language: "zh-CN",
        theme: "#0066ff",
        index: 8
    });
    assert(stableStringify(base) === stableStringify(translated), "Label, language, theme, or index changed icon input.");
    assertions += 1;

    assert(base.seed === "shapeAdd" && base.target === "icon", "Tool id should be the seed source for icon input.");
    assert(base.params.paletteId === icons.resolveHomePaletteId("shapeAdd"), "Home icon input should include only the stable palette id color source.");
    assertions += 2;

    const dynamicAdCard = makeCard("ecommerceLayout", { "data-dynamic-tool": "true" });
    const dynamicDuplicate = makeCard("ecommerceLayout", { "data-dynamic-tool": "true" });
    const shapeCard = makeCard("shapeAdd");
    const invalidCard = makeCard("");
    const collected = icons.collectUniqueToolCards(makeRoot([dynamicAdCard, dynamicDuplicate, shapeCard, invalidCard]));
    assert(collected.length === 2, "Dynamic duplicate or invalid card was not filtered.");
    assert(collected[0].toolId === "ecommerceLayout" && collected[0].card === dynamicAdCard && collected[1].toolId === "shapeAdd", "Dynamic Ad Component Kit card is accepted without static DOM and unique order is preserved.");
    assertions += 2;

    const ids = icons.uniqueToolIds([
        { toolId: "shapeAdd", label: "A" },
        { toolId: "selectionInfo", label: "B" },
        { toolId: "shapeAdd", label: "C" },
        { toolId: "" }
    ]);
    assert(stableStringify(ids) === stableStringify(["shapeAdd", "selectionInfo"]), "Tool id dedupe failed.");
    assertions += 1;

    const adInput = icons.createIconInput({ toolId: "adComponentKit" });
    const textInput = icons.createIconInput({ toolId: "textBackgroundBox" });
    assert(adInput.seed !== textInput.seed, "Different tool ids should produce different seed input.");
    assertions += 1;

    const beforeDeveloper = [
        icons.createIconInput({ toolId: "shapeAdd" }),
        icons.createIconInput({ toolId: "selectionInfo" })
    ];
    const afterDeveloper = [
        icons.createIconInput({ toolId: "shapeAdd" }),
        icons.createIconInput({ toolId: "selectionInfo" }),
        icons.createIconInput({ toolId: "proceduralAppearanceLab" })
    ];
    assert(stableStringify(beforeDeveloper[0]) === stableStringify(afterDeveloper[0]), "Developer Mode tool changed an existing icon identity.");
    assert(stableStringify(beforeDeveloper[1]) === stableStringify(afterDeveloper[1]), "Developer Mode tool changed another existing icon identity.");
    assertions += 2;

    const originalOrder = [
        icons.createIconInput({ toolId: "shapeAdd" }),
        icons.createIconInput({ toolId: "selectionInfo" }),
        icons.createIconInput({ toolId: "ecommerceLayout" })
    ];
    const reordered = [
        icons.createIconInput({ toolId: "ecommerceLayout" }),
        icons.createIconInput({ toolId: "shapeAdd" }),
        icons.createIconInput({ toolId: "selectionInfo" })
    ];
    assert(stableStringify(originalOrder[0]) === stableStringify(reordered[1]), "Home reorder changed shapeAdd identity.");
    assert(stableStringify(originalOrder[2]) === stableStringify(reordered[0]), "Home reorder changed ecommerceLayout identity.");
    assertions += 2;

    assert(icons.createIconInput({ label: "No id" }) === null, "Invalid cards should be ignored safely.");
    assert(icons.resolveToolId(makeCard("  textBackgroundBox  ")) === "textBackgroundBox", "Tool id should be trimmed.");
    assertions += 2;

    assert(icons.shouldRenderTool({ rendered: { shapeAdd: true } }, "shapeAdd") === false, "Rendered tools should not be treated as first render.");
    assert(icons.shouldRenderTool({ rendered: { shapeAdd: true } }, "selectionInfo") === true, "New tools should be treated as renderable.");
    assertions += 2;

    const scaleOne = makeIcon(76, 76);
    const scaleLarge = makeIcon(114, 114);
    const fakeEngine = {
        normalizeRenderScale(value) {
            return value > 2 ? 2 : (value < 1 ? 1 : value);
        }
    };
    const sizeOne = icons.getIconRenderSize(scaleOne, fakeEngine);
    const sizeLarge = icons.getIconRenderSize(scaleLarge, fakeEngine);
    assert(sizeOne.logicalWidth === 76 && sizeOne.logicalHeight === 76, "Logical size should come from the icon slot.");
    assert(sizeLarge.logicalWidth === 114 && sizeLarge.logicalHeight === 114, "UI Scale size change should update logical size.");
    assert(base.seed === icons.createIconInput({ toolId: "shapeAdd", uiScale: 1.5 }).seed, "UI Scale must not affect icon seed identity.");
    assert(sizeOne.width !== sizeLarge.width && sizeOne.height !== sizeLarge.height, "UI Scale should change raster dimensions.");
    assertions += 4;

    const nonSquare = icons.getIconRenderSize(makeIcon(96, 72), fakeEngine);
    assert(nonSquare.logicalWidth === nonSquare.logicalHeight, "Non-square slot input should be normalized to a square icon size.");
    assert(nonSquare.width === nonSquare.height, "Non-square slot input should produce square backing dimensions.");
    assertions += 2;

    const stateIcon = makeIcon(76, 76);
    icons.setIconRenderState(stateIcon, true);
    assert(stateIcon.classList.contains("procedural-icon-ready"), "Successful render should mark ready state.");
    assert(!stateIcon.classList.contains("procedural-icon-fallback"), "Successful render should clear fallback state.");
    icons.setIconRenderState(stateIcon, false);
    assert(!stateIcon.classList.contains("procedural-icon-ready"), "Failed render should clear ready state.");
    assert(stateIcon.classList.contains("procedural-icon-fallback"), "Failed render should restore fallback state.");
    assertions += 4;

    const moreTools = makeCard("");
    const onlyTools = icons.collectUniqueToolCards(makeRoot([makeCard("shapeAdd"), moreTools]));
    assert(onlyTools.length === 1 && onlyTools[0].toolId === "shapeAdd", "More Tools or non-tool cards should not generate procedural canvases.");
    assertions += 1;

    const staticSize = icons.getIconRenderSize(makeIcon(76, 76), fakeEngine);
    const dynamicSize = icons.getIconRenderSize(makeIcon(76, 76), fakeEngine);
    assert(stableStringify(staticSize) === stableStringify(dynamicSize), "Static and dynamic cards should share the same sizing contract.");
    assertions += 1;

    let renderOptions = null;
    const renderIcon = makeIcon(76, 76);
    const renderCard = makeRenderableCard("shapeAdd", renderIcon);
    const parameterEngine = {
        normalizeParams(value) {
            return Object.assign({ warp: 1, brightness: 0.88 }, value || {});
        },
        normalizeRenderScale() {
            return 1;
        },
        render(canvas, options) {
            renderOptions = options;
            canvas.width = 76;
            canvas.height = 76;
        }
    };
    icons.initialize({ root: makeRoot([]), engine: parameterEngine, params: { warp: 0.42 } });
    const renderOk = icons.renderTool(renderCard, "shapeAdd", {
        normalizeParams: parameterEngine.normalizeParams,
        render: parameterEngine.render,
        normalizeRenderScale: parameterEngine.normalizeRenderScale
    });
    assert(renderOk === true, "Renderable Home icon card should render successfully.");
    assert(renderOptions.params.paletteId === icons.resolveHomePaletteId("shapeAdd"), "Home icon render should pass stable paletteId without changing seed.");
    assert(renderOptions.params.warp === 0.42, "Home icon render should use the shared normalized parameter object.");
    assert(renderOptions && renderOptions.clipToCanvas === false, "Home icon render should disable internal engine clipping so shell radius is authoritative.");
    icons.updateParameters({ warp: 0.73 });
    icons.renderTool(renderCard, "shapeAdd", parameterEngine);
    assert(renderOptions.params.warp === 0.73, "Updating shared parameters should invalidate and pass the new source parameters.");
    assertions += 5;

    assert(/--radius-home-icon:\s*25\.5%;/.test(STYLE_CSS), "Home icon radius should use the shared proportional token.");
    assert(/--home-tool-icon-radius:\s*var\(--radius-home-icon\);/.test(STYLE_CSS), "Legacy Home icon alias should reference the shared radius token.");
    assert(/--tool-icon-radius:\s*var\(--home-tool-icon-radius\);/.test(STYLE_CSS), "Tool icon radius should reference the Home radius token.");
    assert(/\.procedural-home-icon-canvas\s*\{[\s\S]*border-radius:\s*0;/.test(STYLE_CSS), "Canvas contract should not define an independent radius.");
    assertions += 4;

    const readyBlock = STYLE_CSS.match(/\.tool-icon\.procedural-icon-ready\s*\{[\s\S]*?\}/);
    assert(readyBlock && /border:\s*0;/.test(readyBlock[0]), "Ready state should remove the real border.");
    assert(readyBlock && /outline:\s*0;/.test(readyBlock[0]), "Ready state should remove outline decoration.");
    assert(readyBlock && /box-shadow:\s*none;/.test(readyBlock[0]), "Ready state should remove icon shell shadow decoration.");
    assertions += 3;

    assert(/\.tool-icon\.procedural-icon-ready\s*>\s*:not\(\.procedural-home-icon-canvas\)\s*\{[\s\S]*display:\s*none;/.test(STYLE_CSS), "Ready state should hide fallback glyph/frame content.");
    assert(/\.tool-icon\.procedural-icon-fallback\s+\.procedural-home-icon-canvas\s*\{[\s\S]*display:\s*none;/.test(STYLE_CSS), "Fallback state should hide the procedural canvas.");
    assert(/\.tool-app:hover\s+\.tool-icon\.procedural-icon-ready[\s\S]*box-shadow:\s*none;/.test(STYLE_CSS), "Hover/edit selectors should not restore ready-state frame decoration.");
    assertions += 3;

    icons.initialize({
        root: makeRoot([makeCard("shapeAdd"), makeCard("selectionInfo")]),
        engine: null,
        batchSize: 1
    });
    icons.teardown();
    const stats = icons.getStats();
    assert(stats.initialized === false, "Teardown should clear initialized state.");
    assert(stats.queuedCount === 0, "Teardown should stop and clear the queue.");
    assertions += 2;

    console.log("PASS procedural Home icons: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural Home icons - " + error.message);
    process.exitCode = 1;
}
