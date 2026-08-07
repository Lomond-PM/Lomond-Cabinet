#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const hostSource = fs.readFileSync(path.resolve(__dirname, "../host/tools/adComponentKit.jsx"), "utf8");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.deepStrictEqual(actual, expected, message); }
function close(actual, expected, message) { assertions += 1; assert.ok(Math.abs(actual - expected) <= 1e-9, message + ": " + actual + " vs " + expected); }

function valueProperty(value) {
    return {
        value: Array.isArray(value) ? value.slice() : value,
        expressionEnabled: false,
        dimensionsSeparated: false,
        writes: 0,
        setValue: function (next) { this.writes += 1; this.value = Array.isArray(next) ? next.slice() : next; }
    };
}

function transform(options) {
    const props = {
        "ADBE Anchor Point": valueProperty(options.anchor || [0, 0]),
        "ADBE Position": valueProperty(options.position || [0, 0]),
        "ADBE Scale": valueProperty(options.scale || [100, 100]),
        "ADBE Rotate Z": valueProperty(options.rotation || 0)
    };
    return { props, property: function (name) { return props[name] || null; } };
}

function effects(values) {
    const names = Object.keys(values);
    const list = names.map(function (name) {
        return { name, property: function () { return valueProperty(values[name]); } };
    });
    return { numProperties: list.length, property: function (index) { return list[index - 1] || null; } };
}

function metadata(role, index, modern) {
    const data = { aetoolbox: true, tool: "adComponentKit", artifactId: "artifact_1", componentId: "iconGrid_001", kind: "iconGrid", componentType: "iconGrid", role, index };
    return modern === false ? JSON.stringify(data) : "LOMOND_CABINET_ARTIFACT_V1:" + JSON.stringify(data);
}

function layer(kind, options) {
    options = options || {};
    const tr = transform(options);
    const item = {
        name: options.name || kind,
        matchName: kind === "shape" ? "ADBE Vector Layer" : (kind === "text" ? "ADBE Text Layer" : "ADBE AV Layer"),
        comment: metadata("sourceLayerBinding", options.index || 1, options.modernMetadata),
        threeDLayer: false,
        locked: false,
        nullLayer: false,
        adjustmentLayer: false,
        collapseTransformation: false,
        continuouslyRasterize: kind === "shape",
        width: options.width || 100,
        height: options.height || 80,
        sourceRectAtTime: function () { return options.rect || { left: -50, top: -40, width: 100, height: 80 }; },
        property: function (name) {
            if (name === "ADBE Transform Group") { return tr; }
            if (name === "ADBE Root Vectors Group") { return kind === "shape" ? {} : null; }
            if (name === "ADBE Text Properties") { return kind === "text" ? {} : null; }
            return null;
        },
        transform: tr
    };
    return item;
}

function makeFixture(options) {
    options = options || {};
    function CompItem() {}
    const ctrlTr = transform({ anchor: options.ctrlAnchor || [7, 9], position: options.ctrlPosition || [500, 400], scale: options.ctrlScale || [100, 100], rotation: options.ctrlRotation || 0 });
    const fx = effects({ Columns: 4, "Target Width": 72, "Target Height": 72, "Cell Width": 100, "Cell Height": 118, "Gap X": 28, "Gap Y": 24, "Normalize Mode": options.mode === undefined ? 3 : options.mode, "Last Row Align": 1, Sort: 3 });
    const ctrl = {
        name: "ICON_GRID_CTRL", comment: metadata("controller", 0, options.modernMetadata), threeDLayer: false, parent: null, locked: false,
        property: function (name) { if (name === "ADBE Transform Group") { return ctrlTr; } if (name === "ADBE Effect Parade") { return fx; } return null; }, transform: ctrlTr
    };
    const members = options.members || [layer("shape", { scale: options.memberScale || [100, 100], index: 1, modernMetadata: options.modernMetadata })];
    members.forEach(function (member) { member.parent = ctrl; });
    const all = [ctrl].concat(members);
    const comp = new CompItem();
    comp.time = 0;
    comp.selectedLayers = [ctrl];
    comp.layer = function (index) { return all[index - 1] || null; };
    Object.defineProperty(comp, "numLayers", { get: function () { return all.length; } });
    all.forEach(function (item, index) { item.index = index + 1; item.containingComp = comp; });
    let undoBegins = 0;
    let undoEnds = 0;
    const AEToolbox = { tools: {}, parseJson: JSON.parse, stringify: JSON.stringify, jsonEscape: function (value) { return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }, hexToColorArray: function () { return [1, 1, 1, 1]; } };
    const context = { AEToolbox, CompItem, app: { project: { activeItem: comp }, beginUndoGroup: function () { undoBegins += 1; }, endUndoGroup: function () { undoEnds += 1; } }, Math, Date, JSON, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent, decodeURIComponent };
    vm.runInNewContext(hostSource, context, { filename: "adComponentKit.jsx" });
    return {
        ctrl, members,
        refresh: function () { return JSON.parse(AEToolbox.tools.adComponentKit.refreshSelectedComponent()); },
        undoCounts: function () { return [undoBegins, undoEnds]; }
    };
}

function memberState(member) {
    return JSON.stringify({ scale: member.transform.props["ADBE Scale"].value, position: member.transform.props["ADBE Position"].value, anchor: member.transform.props["ADBE Anchor Point"].value, parent: member.parent.name, comment: member.comment });
}

function controllerState(ctrl) {
    return JSON.stringify({ scale: ctrl.transform.props["ADBE Scale"].value, position: ctrl.transform.props["ADBE Position"].value, anchor: ctrl.transform.props["ADBE Anchor Point"].value, rotation: ctrl.transform.props["ADBE Rotate Z"].value, comment: ctrl.comment });
}

function assertRepeated(options, repetitions, label) {
    const fixture = makeFixture(options);
    const ctrlBefore = controllerState(fixture.ctrl);
    const memberInvariants = fixture.members.map(function (member) { return JSON.stringify({ anchor: member.transform.props["ADBE Anchor Point"].value, parent: member.parent.name, comment: member.comment }); });
    check(fixture.refresh().ok, label + " first Refresh succeeds");
    fixture.members.forEach(function (member, index) { equal(JSON.stringify({ anchor: member.transform.props["ADBE Anchor Point"].value, parent: member.parent.name, comment: member.comment }), memberInvariants[index], label + " preserves member Anchor, Parent, and metadata"); });
    const stable = fixture.members.map(memberState);
    for (let i = 1; i < repetitions; i += 1) { check(fixture.refresh().ok, label + " Refresh " + (i + 1) + " succeeds"); }
    fixture.members.forEach(function (member, index) { equal(memberState(member), stable[index], label + " member " + index + " is idempotent"); });
    equal(controllerState(fixture.ctrl), ctrlBefore, label + " preserves Controller transform and metadata");
    equal(fixture.undoCounts(), [repetitions, repetitions], label + " uses one balanced undo group per Refresh");
    return fixture;
}

function run() {
    const fit = assertRepeated({ memberScale: [100, 100], mode: 3 }, 10, "fitBox x10");
    close(fit.members[0].transform.props["ADBE Scale"].value[0], 72, "fitBox absolute X Scale");
    close(fit.members[0].transform.props["ADBE Scale"].value[1], 72, "fitBox absolute Y Scale");
    assertRepeated({ memberScale: [50, 50], mode: 0 }, 5, "normalize none");
    assertRepeated({ memberScale: [200, 200], mode: 1 }, 5, "uniform height");
    assertRepeated({ memberScale: [50, 150], mode: 2 }, 5, "uniform width non-uniform member");
    assertRepeated({ memberScale: [150, 50], mode: 3 }, 5, "fitBox inverse non-uniform member");
    assertRepeated({ ctrlPosition: [1200, 900], ctrlRotation: 37, ctrlScale: [50, 50] }, 5, "moved rotated 50% Controller");
    assertRepeated({ ctrlPosition: [-300, 220], ctrlRotation: -22, ctrlScale: [200, 200] }, 5, "moved rotated 200% Controller");
    assertRepeated({ ctrlScale: [50, 200], ctrlRotation: 19 }, 5, "non-uniform Controller");
    const mixed = [layer("shape", { index: 1, scale: [50, 50] }), layer("text", { index: 2, scale: [200, 200] }), layer("av", { index: 3, scale: [50, 150] })];
    assertRepeated({ members: mixed }, 5, "Shape Text AV mixed");
    const legacy = assertRepeated({ modernMetadata: false, memberScale: [100, 100] }, 2, "legacy metadata");
    check(legacy.members[0].comment.indexOf("LOMOND_CABINET_ARTIFACT_V1:") !== 0, "Refresh does not rewrite legacy member metadata");
    const unsafeController = makeFixture({ ctrlScale: [-100, 100] });
    const unsafeMemberBefore = memberState(unsafeController.members[0]);
    equal(unsafeController.refresh().ok, false, "negative Controller Scale fails closed");
    equal(memberState(unsafeController.members[0]), unsafeMemberBefore, "unsupported Controller causes no member writes");
    check(hostSource.indexOf("getGridRefreshLocalBounds") >= 0, "Refresh has a controller-local measurement seam");
    check(/width\s*=\s*rect\.width\s*\*\s*scale\.value\[0\]\s*\/\s*100/.test(hostSource), "Refresh local width includes current member Scale");
    check(/height\s*=\s*rect\.height\s*\*\s*scale\.value\[1\]\s*\/\s*100/.test(hostSource), "Refresh local height includes current member Scale");
    check(!/function refreshIconGrid[\s\S]*?getLayerVisualBoundsInComp\(items\[i\]/.test(hostSource), "Refresh no longer measures members through comp-space legacy bounds");
    check(/sortGridItems\(gridItems,\s*p\.gridSortMode\)/.test(hostSource), "Refresh reapplies the current Grid sort parameter");
}

run();
console.log("Grid Refresh idempotence tests passed: " + assertions + " assertions.");
