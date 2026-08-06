#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const hostSource = fs.readFileSync(path.join(ROOT, "host/tools/adComponentKit.jsx"), "utf8");
const schemaSource = fs.readFileSync(path.join(ROOT, "host/tools/adComponentKit.tool.jsx"), "utf8");
const mainSource = fs.readFileSync(path.join(ROOT, "client/js/main.js"), "utf8");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }

function property(value, options) {
    options = options || {};
    return {
        value: Array.isArray(value) ? value.slice() : value,
        expressionEnabled: options.expressionEnabled === true,
        dimensionsSeparated: options.dimensionsSeparated === true,
        writes: 0,
        setValue: options.writable === false ? null : function (next) {
            this.writes += 1;
            this.value = Array.isArray(next) ? next.slice() : next;
        }
    };
}

function makeLayer(kind, options) {
    options = options || {};
    const anchor = property(options.anchor || [0, 0], { expressionEnabled: options.anchorExpression });
    const position = property(options.position || [400, 300], { expressionEnabled: options.positionExpression, dimensionsSeparated: options.separated });
    const scale = property(options.scale || [100, 100], { expressionEnabled: options.scaleExpression });
    const rotation = property(options.rotation || 0, { expressionEnabled: options.rotationExpression });
    const positionX = property(position.value[0], { writable: options.separatedWritable !== false, expressionEnabled: options.positionExpression });
    const positionY = property(position.value[1], { writable: options.separatedWritable !== false, expressionEnabled: options.positionExpression });
    const effects = { addProperty: function () { return { name: "", property: function () { return property(0); } }; } };
    const transform = {
        property: function (name) {
            return { "ADBE Anchor Point": anchor, "ADBE Position": position, "ADBE Scale": scale, "ADBE Rotate Z": rotation, "ADBE Position_0": positionX, "ADBE Position_1": positionY }[name] || null;
        }
    };
    let parentValue = options.parent || null;
    let commentValue = options.comment || "";
    const layer = {
        name: options.name || kind,
        matchName: kind === "text" ? "ADBE Text Layer" : (kind === "shape" ? "ADBE Vector Layer" : (kind === "camera" ? "ADBE Camera Layer" : (kind === "light" ? "ADBE Light Layer" : "ADBE AV Layer"))),
        threeDLayer: options.threeD === true,
        locked: options.locked === true,
        nullLayer: options.nullLayer === true || kind === "null",
        adjustmentLayer: options.adjustment === true,
        collapseTransformation: options.collapse === true,
        continuouslyRasterize: options.continuous === undefined ? kind === "shape" : options.continuous === true,
        sourceSizeReads: 0,
        writes: 0,
        properties: { anchor, position, scale, rotation, positionX, positionY },
        property: function (name) {
            if (name === "ADBE Transform Group") { return transform; }
            if (name === "ADBE Text Properties") { return kind === "text" ? {} : null; }
            if (name === "ADBE Root Vectors Group") { return kind === "shape" ? {} : null; }
            if (name === "ADBE Effect Parade") { return effects; }
            return null;
        },
        sourceRectCalls: 0,
        sourceRectAtTime: options.noSourceRect ? null : function () {
            this.sourceRectCalls += 1;
            if (options.sourceThrows) { throw new Error("source unavailable"); }
            return options.rect || { left: -50, top: -40, width: 100, height: 80 };
        },
        sourcePointToCompCalls: 0,
        sourcePointToComp: options.noSourcePointToComp ? null : function (point) {
            this.sourcePointToCompCalls += 1;
            if (options.sourcePointThrowsAt === this.sourcePointToCompCalls) { throw new Error("transport failed"); }
            if (options.sourcePointNull) { return null; }
            if (options.sourcePointShort) { return [1]; }
            if (options.sourcePointNaN) { return [NaN, 1]; }
            if (options.sourcePointInfinity) { return [Infinity, 1]; }
            return [position.value[0] + (point[0] - anchor.value[0]) * scale.value[0] / 100, position.value[1] + (point[1] - anchor.value[1]) * scale.value[1] / 100];
        }
    };
    Object.defineProperty(layer, "width", { get: function () { layer.sourceSizeReads += 1; if (options.sourceSizeThrows) { throw new Error("source size must not be read"); } return options.width === undefined ? 100 : options.width; } });
    Object.defineProperty(layer, "height", { get: function () { layer.sourceSizeReads += 1; if (options.sourceSizeThrows) { throw new Error("source size must not be read"); } return options.height === undefined ? 80 : options.height; } });
    Object.defineProperty(layer, "parent", { get: function () { return parentValue; }, set: function (value) { layer.writes += 1; parentValue = value; } });
    Object.defineProperty(layer, "comment", { get: function () { return commentValue; }, set: function (value) { layer.writes += 1; commentValue = value; } });
    return layer;
}

function snapshot(layer) {
    return JSON.stringify({
        anchor: layer.properties.anchor.value,
        position: layer.properties.position.value,
        scale: layer.properties.scale.value,
        parent: layer.parent ? layer.parent.name : null,
        comment: layer.comment,
        writes: layer.writes,
        propertyWrites: layer.properties.anchor.writes + layer.properties.position.writes + layer.properties.scale.writes + layer.properties.rotation.writes
    });
}

function harness(inputLayers, controllerFailure) {
    function CompItem() {}
    const comp = new CompItem();
    const layers = inputLayers.slice();
    let controllerCreates = 0;
    layers.forEach(function (layer, index) { layer.index = index + 1; layer.containingComp = comp; });
    comp.selectedLayers = layers;
    comp.time = 0;
    comp.layer = function (index) { return layers[index - 1] || null; };
    Object.defineProperty(comp, "numLayers", { get: function () { return layers.length; } });
    comp.layers = {
        addNull: function () {
            controllerCreates += 1;
            if (controllerFailure) { throw new Error("controller failed"); }
            const controller = makeLayer("av", { name: "controller", position: [0, 0] });
            controller.index = layers.length + 1;
            controller.containingComp = comp;
            controller.remove = function () {};
            layers.push(controller);
            return controller;
        }
    };
    const AEToolbox = {
        tools: {},
        jsonEscape: function (value) { return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"'); },
        parseJson: JSON.parse,
        stringify: JSON.stringify,
        hexToColorArray: function () { return [1, 1, 1, 1]; }
    };
    const context = { AEToolbox, CompItem, app: { project: { activeItem: comp }, beginUndoGroup: function () {}, endUndoGroup: function () {} }, console, Date, Math, JSON, encodeURIComponent, decodeURIComponent, isFinite, isNaN, parseFloat, parseInt };
    vm.runInNewContext(hostSource, context, { filename: "adComponentKit.jsx" });
    return {
        run: function (params) { return JSON.parse(AEToolbox.tools.adComponentKit.createIconGrid(JSON.stringify(params || { normalizeMode: "none" }))); },
        controllerCreates: function () { return controllerCreates; }
    };
}

function expectFailure(layers, reason, message, controllerFailure) {
    const before = layers.map(snapshot);
    const test = harness(layers, controllerFailure);
    const result = test.run();
    equal(result.ok, false, message + " fails");
    equal(result.reason, reason, message + " has a stable reason");
    equal(test.controllerCreates(), 0, message + " creates no controller");
    layers.forEach(function (layer, index) { equal(snapshot(layer), before[index], message + " leaves input " + index + " unchanged"); });
    return result;
}

function run() {
    const ordinaryShape = makeLayer("shape", { name: "ordinary AE shape", sourceSizeThrows: true });
    equal(ordinaryShape.matchName, "ADBE Vector Layer", "ordinary Shape fixture uses AE's stable matchName");
    equal(ordinaryShape.continuouslyRasterize, true, "ordinary Shape fixture models AE's intrinsic continuous-rasterization semantic");
    check(harness([ordinaryShape]).run({ normalizeMode: "none", columns: 1 }).ok === true, "ordinary continuously-rasterized Shape succeeds");
    check(ordinaryShape.sourceRectCalls > 0, "ordinary Shape reads sourceRectAtTime");
    equal(ordinaryShape.sourceSizeReads, 0, "ordinary Shape never reads AV source-size fallback");
    equal(ordinaryShape.sourcePointToCompCalls, 12, "ordinary Shape converts four corners in each strict bounds sample");

    [makeLayer("shape"), makeLayer("text"), makeLayer("av")].forEach(function (layer) {
        const result = harness([layer]).run({ normalizeMode: "none", columns: 1 });
        check(result.ok === true, layer.name + " succeeds");
    });
    check(harness([makeLayer("shape"), makeLayer("text"), makeLayer("av")]).run({ normalizeMode: "none", columns: 3 }).ok === true, "mixed supported 2D layers succeed together");
    check(harness([makeLayer("shape", { scale: [50, 150] })]).run().ok === true, "positive non-uniform Scale is supported");

    expectFailure([makeLayer("shape", { rect: { left: 0, top: 0, width: "bad", height: 20 } })], "GRID_NON_FINITE_BOUNDS", "non-number source bounds");
    expectFailure([makeLayer("shape", { rect: { left: 0, top: 0, width: 0, height: 20 } })], "GRID_ZERO_SIZE_BOUNDS", "zero-width source bounds");
    expectFailure([makeLayer("shape", { rect: { left: 0, top: 0, width: NaN, height: 20 } })], "GRID_NON_FINITE_BOUNDS", "NaN source bounds");
    expectFailure([makeLayer("shape", { noSourcePointToComp: true })], "GRID_TO_COMP_FAILED", "missing sourcePointToComp");
    const firstThrow = makeLayer("shape", { position: [900, 700], sourcePointThrowsAt: 1 });
    expectFailure([firstThrow], "GRID_TO_COMP_FAILED", "first sourcePointToComp failure");
    equal(firstThrow.sourcePointToCompCalls, 1, "sourcePointToComp failure does not continue with layer-space points");
    expectFailure([makeLayer("shape", { sourcePointThrowsAt: 4 })], "GRID_TO_COMP_FAILED", "fourth sourcePointToComp failure");
    expectFailure([makeLayer("shape", { sourcePointNull: true })], "GRID_NON_FINITE_BOUNDS", "null comp point");
    expectFailure([makeLayer("shape", { sourcePointShort: true })], "GRID_NON_FINITE_BOUNDS", "short comp point");
    expectFailure([makeLayer("shape", { sourcePointNaN: true })], "GRID_NON_FINITE_BOUNDS", "NaN comp point");
    expectFailure([makeLayer("shape", { sourcePointInfinity: true })], "GRID_NON_FINITE_BOUNDS", "infinite comp point");

    const aabbLayer = makeLayer("shape", { rect: { left: 0, top: 0, width: 100, height: 80 }, anchor: [0, 0], position: [900, 700] });
    const aabbResult = harness([aabbLayer]).run({ normalizeMode: "none", columns: 1 });
    equal(JSON.stringify(aabbResult.originalCenter), JSON.stringify([950, 740]), "strict AABB uses mock comp-space coordinates");

    const valid = makeLayer("shape", { name: "valid" });
    const invalid = makeLayer("shape", { name: "invalid", sourcePointThrowsAt: 1 });
    const mixedFailure = expectFailure([valid, invalid], "GRID_TO_COMP_FAILED", "mixed valid and invalid selection");
    equal(mixedFailure.invalidLayerCount, 1, "invalid selection reports its invalid count");
    equal(mixedFailure.firstInvalidLayerName, "invalid", "invalid selection reports its first layer name");
    expectFailure([], "GRID_NO_SELECTION", "empty selection");
    expectFailure([makeLayer("shape", { parent: { name: "parent" } })], "GRID_UNSUPPORTED_PARENTED_LAYER", "parented layer");
    expectFailure([makeLayer("shape", { threeD: true })], "GRID_UNSUPPORTED_3D_LAYER", "3D layer");
    expectFailure([makeLayer("null")], "GRID_UNSUPPORTED_LAYER_TYPE", "Null layer");
    expectFailure([makeLayer("av", { adjustment: true })], "GRID_UNSUPPORTED_LAYER_TYPE", "Adjustment Layer");
    expectFailure([makeLayer("shape", { locked: true })], "GRID_LOCKED_LAYER", "locked layer");
    expectFailure([makeLayer("shape", { positionExpression: true })], "GRID_TRANSFORM_EXPRESSION", "Position expression");
    expectFailure([makeLayer("shape", { anchorExpression: true })], "GRID_TRANSFORM_EXPRESSION", "Anchor expression");
    expectFailure([makeLayer("shape", { rotation: 1 })], "GRID_UNSUPPORTED_ROTATION", "non-zero Rotation");
    expectFailure([makeLayer("shape", { scale: [-100, 100] })], "GRID_UNSUPPORTED_NEGATIVE_SCALE", "negative Scale");
    expectFailure([makeLayer("av", { name: "collapsed precomp", collapse: true })], "GRID_UNSUPPORTED_LAYER_TYPE", "Precomp collapse transformations");
    expectFailure([makeLayer("shape", { separated: true, separatedWritable: false })], "GRID_TRANSFORM_NOT_WRITABLE", "unsafe separated Position");

    const controllerInput = makeLayer("shape");
    const controllerBefore = snapshot(controllerInput);
    const controllerTest = harness([controllerInput], true);
    const controllerResult = controllerTest.run();
    equal(controllerResult.reason, "GRID_CONTROLLER_CREATE_FAILED", "controller creation failure has a stable reason");
    equal(snapshot(controllerInput), controllerBefore, "controller creation failure precedes all input writes");

    check(/cellStepX\s*=\s*p\.cellWidth\s*\+\s*p\.gapX/.test(hostSource) && /cellStepY\s*=\s*p\.cellHeight\s*\+\s*p\.gapY/.test(hostSource), "fixed-cell geometry remains unchanged");
    check(/p\.normalizeMode\s*=\s*p\.normalizeMode\s*\|\|\s*"fitBox"/.test(hostSource), "normalize default remains fitBox");
    check(/p\.lastRowAlign\s*=\s*p\.lastRowAlign\s*\|\|\s*"center"/.test(hostSource), "last-row default remains center");
    check(/id:\s*"ecommerceLayout"/.test(schemaSource) && /id:\s*"createIconGrid"/.test(schemaSource) && /hostFunction:\s*"AEToolbox\.tools\.adComponentKit\.createIconGrid"/.test(schemaSource), "Registry schema retains ecommerceLayout/createIconGrid routing");
    check(/runRegisteredToolAction\('\"\s*\+\s*jsxQuote\(toolId\)/.test(mainSource), "client retains the shared registered-tool action runner");
    var strictBoundsSource = hostSource.slice(
        hostSource.indexOf("function convertGridSourcePointToCompStrict"),
        hostSource.indexOf("function gridPropertyWritable")
    );
    check(strictBoundsSource.indexOf("function getGridVisualBoundsInComp") >= 0, "strict Grid bounds helper is present");
    check(strictBoundsSource.indexOf("sourcePointToComp") >= 0, "strict Grid path uses the ExtendScript sourcePointToComp API");
    check(strictBoundsSource.indexOf(".toComp(") < 0, "strict Grid path never calls the expression-only toComp API");
    check(!/catch\s*\([^)]*\)\s*\{\s*p\s*=\s*pts\[i\]/.test(strictBoundsSource), "strict Grid path never substitutes layer-space points after conversion failure");
    var createGridSource = hostSource.slice(hostSource.indexOf("function createIconGrid"), hostSource.indexOf("function refreshIconGrid"));
    check(createGridSource.indexOf("getLayerVisualBoundsInComp") < 0, "Icon Grid never consumes the legacy fallback bounds helper");
    check(/matchName === "ADBE Vector Layer"/.test(hostSource), "Shape classification uses the stable ADBE Vector Layer matchName");
}

run();
console.log("Grid Host contract tests passed: " + assertions + " assertions.");
