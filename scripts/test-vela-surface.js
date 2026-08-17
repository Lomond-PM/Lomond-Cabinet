#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ResizeController = require(path.join(ROOT, "client/js/vela/velaResizeController.js")).VelaResizeController;
const Surface = require(path.join(ROOT, "client/js/vela/velaSurface.js")).VelaSurface;
const PresentationModel = require(path.join(ROOT, "client/js/vela/velaPresentationModel.js")).VelaPresentationModel;
const TranscriptView = require(path.join(ROOT, "client/js/vela/velaTranscriptView.js")).VelaTranscriptView;
const ComposerView = require(path.join(ROOT, "client/js/vela/velaComposerView.js")).VelaComposerView;
const ConfirmationView = require(path.join(ROOT, "client/js/vela/velaConfirmationView.js")).VelaConfirmationView;
const SurfaceController = require(path.join(ROOT, "client/js/vela/velaSurfaceController.js")).VelaSurfaceController;
const ActivationPolicy = require(path.join(ROOT, "client/js/vela/velaActivationPolicy.js")).VelaActivationPolicy;
let assertions = 0;

function ok(value, message) {
    assertions += 1;
    assert.ok(value, message);
}

function equal(actual, expected, message) {
    assertions += 1;
    assert.strictEqual(actual, expected, message);
}

function classList(owner) {
    const values = {};
    return {
        add: function () { Array.prototype.forEach.call(arguments, function (value) { values[value] = true; }); },
        remove: function () { Array.prototype.forEach.call(arguments, function (value) { delete values[value]; }); },
        contains: function (value) { return values[value] === true; },
        toggle: function (value, force) {
            owner.classToggleCount = (owner.classToggleCount || 0) + 1;
            const next = force === undefined ? !values[value] : !!force;
            if (next) { values[value] = true; } else { delete values[value]; }
            owner.className = Object.keys(values).join(" ");
            return next;
        }
    };
}

function defaultHeight(node) {
    if (/vela-composer-slot/.test(node.className)) { return 52; }
    if (/vela-status-slot/.test(node.className)) { return 30; }
    if (/vela-bottom-controls/.test(node.className)) { return 30; }
    if (/vela-resize-handle/.test(node.className)) { return 20; }
    if (/tool-app/.test(node.className)) { return 124; }
    return 0;
}

function defaultWidth(node) {
    if (/vela-status-dot/.test(node.className)) { return 8; }
    if (/vela-settings-button/.test(node.className)) { return 88; }
    if (/vela-status-text/.test(node.className)) { return 108; }
    return node._rect.width;
}

function FakeNode(documentRef, tag) {
    this.ownerDocument = documentRef;
    this.tagName = String(tag || "div").toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.style = {
        values: {},
        setProperty: (name, value) => {
            this.styleWriteCount = (this.styleWriteCount || 0) + 1;
            this.style.values[name] = String(value);
            if (name === "--vela-surface-height") { this._rect.height = Number(String(value).replace("px", "")); }
        },
        getPropertyValue: (name) => this.style.values[name] || ""
    };
    this.className = "";
    this.classList = classList(this);
    this._rect = { width: 420, height: 0 };
    this.scrollWidth = 0;
    this.scrollTop = 0;
    this.value = "";
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.focused = false;
    this.capturedPointer = null;
}

FakeNode.prototype.appendChild = function (child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
};
FakeNode.prototype.removeChild = function (child) {
    const index = this.children.indexOf(child);
    if (index !== -1) { this.children.splice(index, 1); child.parentNode = null; }
    return child;
};
FakeNode.prototype.setAttribute = function (name, value) { this.attributeWriteCount = (this.attributeWriteCount || 0) + 1; this.attributes[name] = String(value); };
FakeNode.prototype.getAttribute = function (name) { return this.attributes[name] || null; };
FakeNode.prototype.addEventListener = function (type, handler) { (this.listeners[type] || (this.listeners[type] = [])).push(handler); };
FakeNode.prototype.removeEventListener = function (type, handler) {
    const list = this.listeners[type] || [];
    const index = list.indexOf(handler);
    if (index !== -1) { list.splice(index, 1); }
};
FakeNode.prototype.emit = function (type, event) { (this.listeners[type] || []).slice().forEach(function (handler) { handler(event || {}); }); };
FakeNode.prototype.getBoundingClientRect = function () {
    return { width: defaultWidth(this), height: this._rect.height || defaultHeight(this), left: 0, top: 0 };
};
FakeNode.prototype.setPointerCapture = function (pointerId) { this.capturedPointer = pointerId; };
FakeNode.prototype.releasePointerCapture = function (pointerId) { if (this.capturedPointer === pointerId) { this.capturedPointer = null; } };
FakeNode.prototype.focus = function () { this.focused = true; };
FakeNode.prototype.setSelectionRange = function (start, end) { this.selectionStart = start; this.selectionEnd = end; };

function FakeDocument() {}
FakeDocument.prototype.createElement = function (tag) { return new FakeNode(this, tag); };

function FakeWindow() {
    this.listeners = {};
    this.frames = [];
    this.nextFrame = 1;
}
FakeWindow.prototype.addEventListener = FakeNode.prototype.addEventListener;
FakeWindow.prototype.removeEventListener = FakeNode.prototype.removeEventListener;
FakeWindow.prototype.emit = FakeNode.prototype.emit;
FakeWindow.prototype.requestAnimationFrame = function (callback) { const id = this.nextFrame++; this.frames.push({ id: id, callback: callback }); return id; };
FakeWindow.prototype.cancelAnimationFrame = function (id) { this.frames = this.frames.filter(function (frame) { return frame.id !== id; }); };
FakeWindow.prototype.flush = function () { const frames = this.frames.slice(); this.frames = []; frames.forEach(function (frame) { frame.callback(); }); };

function FakeResizeObserver(callback) { this.callback = callback; this.nodes = []; FakeResizeObserver.instances.push(this); }
FakeResizeObserver.instances = [];
FakeResizeObserver.prototype.observe = function (node) { this.nodes.push(node); };
FakeResizeObserver.prototype.disconnect = function () { this.nodes = []; this.disconnected = true; };
FakeResizeObserver.prototype.trigger = function () { if (!this.disconnected) { this.callback([]); } };

function event(properties) {
    const result = properties || {};
    result.preventDefault = result.preventDefault || function () { result.defaultPrevented = true; };
    return result;
}

function setup(useResizeObserver, overrides) {
    overrides = overrides || {};
    const documentRef = new FakeDocument();
    const windowRef = new FakeWindow();
    const home = documentRef.createElement("section");
    const header = documentRef.createElement("header");
    const mount = documentRef.createElement("section");
    const pool = documentRef.createElement("div");
    const tool = documentRef.createElement("button");
    let settingsCalls = 0;
    home._rect = { width: 500, height: 600 };
    header._rect = { width: 500, height: 60 };
    pool._rect = { width: 500, height: 150 };
    tool.className = "tool-app";
    pool.appendChild(tool);
    home.appendChild(header);
    home.appendChild(mount);
    home.appendChild(pool);
    const options = {
        mountElement: mount,
        homeContainer: home,
        headerElement: header,
        toolPoolElement: pool,
        openSettings: function () { settingsCalls += 1; },
        t: function (key) { return "t:" + key; },
        getUiScale: overrides.getUiScale || function () { return 1; },
        loadHeightPreference: overrides.loadHeightPreference,
        saveHeightPreference: overrides.saveHeightPreference,
        ResizeController: ResizeController,
        eventTarget: windowRef
    };
    if (useResizeObserver !== false) { options.ResizeObserver = FakeResizeObserver; }
    const surface = Surface.create(options);
    return { documentRef: documentRef, windowRef: windowRef, home: home, header: header, mount: mount, pool: pool, surface: surface, settingsCalls: function () { return settingsCalls; } };
}

function heightValue(nodes) {
    return Number(nodes.root.style.getPropertyValue("--vela-surface-height").replace("px", ""));
}

function testHeightPersistence() {
    FakeResizeObserver.instances = [];
    let stored = null;
    let saves = [];
    let uiScale = 1;
    const storage = {
        loadHeightPreference: function () { return stored; },
        saveHeightPreference: function (height) { saves.push(height); stored = { schemaVersion: 1, heightPx: height }; },
        getUiScale: function () { return uiScale; }
    };
    let fixture = setup(true, storage);
    fixture.surface.mount();
    let nodes = fixture.surface.getElementsForTest();
    equal(heightValue(nodes), 196, "missing preference uses the formal bounded default");
    equal(saves.length, 0, "mount does not forge a user height commit");
    fixture.surface.dispose();

    stored = { schemaVersion: 1, heightPx: 300 };
    fixture = setup(true, storage);
    fixture.surface.mount();
    nodes = fixture.surface.getElementsForTest();
    equal(heightValue(nodes), 300, "a valid persisted height is restored on a new page instance");
    nodes.handle.emit("pointerdown", event({ pointerId: 40, clientY: 100 }));
    nodes.handle.emit("pointermove", event({ pointerId: 40, clientY: 125 }));
    nodes.handle.emit("pointermove", event({ pointerId: 40, clientY: 140 }));
    equal(saves.length, 0, "pointermove never writes persistent storage");
    fixture.windowRef.flush();
    nodes.handle.emit("pointerup", event({ pointerId: 40 }));
    equal(saves.length, 1, "drag end persists exactly one user preference");
    equal(saves[0], 340, "drag end saves the unclamped CSS-pixel preference");

    stored = { schemaVersion: 1, heightPx: 420 };
    FakeResizeObserver.instances[FakeResizeObserver.instances.length - 1].trigger();
    fixture.windowRef.flush();
    equal(heightValue(nodes), 340, "external storage changes do not mutate a mounted Surface preference");
    fixture.surface.dispose();
    fixture = setup(true, storage);
    fixture.home._rect.height = 470;
    fixture.surface.mount();
    nodes = fixture.surface.getElementsForTest();
    equal(heightValue(nodes), 274, "small viewport temporarily clamps a larger stored preference");
    equal(saves.length, 1, "viewport clamp does not overwrite the stored preference");
    fixture.home._rect.height = 700;
    FakeResizeObserver.instances[FakeResizeObserver.instances.length - 1].trigger();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(heightValue(nodes), 420, "panel growth restores the original unclamped preference");
    nodes.root._rect.width = 320;
    fixture.surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(heightValue(nodes), 420, "narrow layout retains the same preference");
    uiScale = 1.18;
    fixture.surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(heightValue(nodes), 420, "UI scale recalculates bounds without accumulating height error");
    equal(saves.length, 1, "responsive and UI-scale refreshes do not persist");
    fixture.surface.dispose();
    nodes.handle.emit("pointerdown", event({ pointerId: 41, clientY: 100 }));
    nodes.handle.emit("pointermove", event({ pointerId: 41, clientY: 160 }));
    nodes.handle.emit("pointerup", event({ pointerId: 41 }));
    equal(saves.length, 1, "disposed Surface no longer handles drag events");

    [null, "", "420", NaN, Infinity, -1, 0, { schemaVersion: 0, heightPx: 300 }, { schemaVersion: 1, heightPx: "300" }, { schemaVersion: 1, heightPx: 100001 }].forEach(function (invalid) {
        const invalidFixture = setup(true, { loadHeightPreference: function () { return invalid; } });
        invalidFixture.surface.mount();
        equal(heightValue(invalidFixture.surface.getElementsForTest()), 196, "invalid preference falls back to the default");
        invalidFixture.surface.dispose();
    });
    const throwingFixture = setup(true, { loadHeightPreference: function () { throw new Error("storage denied"); }, saveHeightPreference: function () { throw new Error("storage denied"); } });
    ok(throwingFixture.surface.mount(), "storage access failure does not block Surface mount");
    throwingFixture.surface.dispose();

    const smallFixture = setup(true, { loadHeightPreference: function () { return { schemaVersion: 1, heightPx: 10 }; } });
    smallFixture.surface.mount();
    const smallNodes = smallFixture.surface.getElementsForTest();
    equal(heightValue(smallNodes), Number(smallNodes.handle.getAttribute("aria-valuemin")), "small positive preference clamps to the current minimum");
    smallFixture.surface.dispose();
}

function testSurface() {
    const fixture = setup();
    const surface = fixture.surface;
    const mounted = surface.mount();
    const nodes = surface.getElementsForTest();
    const root = nodes.root;
    const initialHeight = root.style.getPropertyValue("--vela-surface-height");
    const initialInput = nodes.composer;
    const initialScroll = nodes.transcriptScroll;
    const initialSettings = nodes.settingsButton;
    const initialHandle = nodes.handle;
    const initialGrip = nodes.grip;

    ok(mounted, "mount creates the Surface once");
    equal(surface.mount(), false, "mount is idempotent");
    equal(fixture.mount.children.length, 1, "mount contains exactly one Surface root");
    equal(root.id, "velaSurface", "Surface has its stable root id");
    ok(nodes.transcriptSlot && nodes.transcriptScroll && nodes.composerSlot && nodes.composer && nodes.statusSlot && nodes.experimentalText && nodes.controls && nodes.settingsSlot && nodes.settingsButton && nodes.actionSlot && nodes.handle && nodes.grip, "all fixed slots exist");
    equal(root.parentNode, fixture.mount, "Surface is mounted outside the tool pool");
    equal(fixture.home.children.indexOf(fixture.header) < fixture.home.children.indexOf(fixture.mount), true, "mount follows Home header");
    equal(fixture.home.children.indexOf(fixture.mount) < fixture.home.children.indexOf(fixture.pool), true, "mount precedes tool pool");
    equal(root.getAttribute("data-tool"), null, "Surface is not a registry tool");
    equal(nodes.composer.readOnly, true, "Surface preserves its safe readonly default until a controller enables composition");
    const interactiveSurface = Surface.create({
        mountElement: fixture.documentRef.createElement("section"), homeContainer: fixture.home, headerElement: fixture.header, toolPoolElement: fixture.pool,
        openSettings: function () {}, t: function (key) { return key; }, getUiScale: function () { return 1; }, composerReadOnly: false,
        ResizeController: ResizeController, ResizeObserver: FakeResizeObserver, eventTarget: fixture.windowRef
    });
    interactiveSurface.mount();
    equal(interactiveSurface.getElementsForTest().composer.readOnly, false, "UI-B can enable the stable Composer without changing Surface business ownership");
    interactiveSurface.dispose();
    equal(nodes.composer.getAttribute("aria-readonly"), "true", "composer has readonly accessibility state");
    equal(nodes.actionSlot.children.length, 0, "dynamic action slot starts empty");
    equal(nodes.transcriptMessage.textContent, "t:vela.surfaceTranscriptIntro", "transcript uses i18n text");
    equal(nodes.statusText.textContent, "t:vela.surfaceStatusSetup", "status uses i18n text");
    equal(nodes.statusSlot.getAttribute("role"), "status", "status has an explicit accessibility role");
    equal(nodes.statusSlot.getAttribute("aria-live"), "polite", "state changes use a polite live region");
    equal(nodes.statusSlot.getAttribute("aria-atomic"), "true", "status and experimental qualification text are announced atomically");
    equal(nodes.experimentalText.textContent, "t:vela.surfaceExperimentalStatus", "experimental and not-qualified status is fixed local i18n text");
    equal(nodes.statusSlot.getAttribute("aria-label"), "t:vela.surfaceStatusSetup · t:vela.surfaceExperimentalStatus", "complete status remains available as the live region accessible name");
    equal(nodes.statusDot.getAttribute("title"), "t:vela.surfaceStatusSetup", "visible status dot title uses the short summary");
    equal(nodes.experimentalText.getAttribute("title"), "t:vela.surfaceExperimentalStatus", "detail title preserves the complete untruncated status");
    equal(nodes.handle.getAttribute("role"), "separator", "resize handle has separator role");
    equal(nodes.handle.getAttribute("aria-orientation"), "horizontal", "resize handle has horizontal orientation");
    equal(nodes.handle.getBoundingClientRect().height, 20, "resize handle retains its overlay hit area");
    equal(nodes.grip.parentNode, nodes.handle, "resize grip stays inside the non-layout handle overlay");
    equal(nodes.grip.getAttribute("aria-hidden"), "true", "resize grip is decorative rather than a second control");
    ok(Number(initialHeight.replace("px", "")) > 0, "initial height is measured and bounded");

    nodes.composer.value = "draft retained locally";
    nodes.composer.focus();
    nodes.composer.setSelectionRange(2, 7);
    nodes.transcriptScroll.scrollTop = 19;
    root._rect.width = 600;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "wide", "wide mode derives from the Surface container width");
    root._rect.width = 400;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "compact", "intermediate Surface width selects compact mode");
    root._rect.width = 320;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "narrow", "very small Surface width selects narrow mode");
    root._rect.width = 400;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "compact", "narrow returns through compact when width grows");
    root._rect.width = 600;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "wide", "compact returns to wide when sufficient width is restored");
    const writesBeforeWideBand = root.attributeWriteCount;
    root._rect.width = 515;
    surface.refreshLayout();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "wide", "wide mode remains stable inside the compact hysteresis band");
    equal(root.attributeWriteCount, writesBeforeWideBand, "stable hysteresis does not rewrite the layout attribute");
    root._rect.width = 507;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "compact", "wide enters compact below the lower hysteresis boundary");
    root._rect.width = 525;
    surface.refreshLayout();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "compact", "compact remains stable below the wide return boundary");
    root._rect.width = 347;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "narrow", "compact enters narrow below the lower hysteresis boundary");
    root._rect.width = 365;
    surface.refreshLayout();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "narrow", "narrow remains stable below the compact return boundary");
    root._rect.width = 372;
    surface.refreshLayout();
    fixture.windowRef.flush();
    fixture.windowRef.flush();
    equal(root.getAttribute("data-layout"), "compact", "narrow returns to compact at the upper hysteresis boundary");
    equal(nodes.composer, initialInput, "layout changes preserve textarea identity");
    equal(nodes.transcriptScroll, initialScroll, "layout changes preserve transcript identity");
    equal(nodes.composer.value, "draft retained locally", "layout changes preserve textarea value");
    equal(nodes.composer.selectionStart, 2, "layout changes preserve selection start");
    equal(nodes.composer.selectionEnd, 7, "layout changes preserve selection end");
    equal(nodes.transcriptScroll.scrollTop, 19, "layout changes preserve transcript scroll position");
    equal(nodes.controls.children[0], nodes.settingsSlot, "Settings remains first in the shared controls DOM");
    equal(nodes.controls.children[1], nodes.statusSlot, "status follows Settings in the shared controls DOM");
    equal(nodes.controls.children[2], nodes.actionSlot, "dynamic actions remain last in the shared controls DOM");
    nodes.settingsButton.emit("click", event());
    equal(fixture.settingsCalls(), 1, "settings button only forwards the Settings callback");

    nodes.handle.emit("pointerdown", event({ pointerId: 3, clientY: 100, target: nodes.settingsButton }));
    equal(nodes.handle.capturedPointer, null, "Settings pointerdown never starts resize");
    nodes.settingsButton.emit("click", event());
    equal(fixture.settingsCalls(), 2, "Settings click remains isolated from the resize overlay");
    const futureAction = fixture.documentRef.createElement("button");
    nodes.actionSlot.appendChild(futureAction);
    nodes.handle.emit("pointerdown", event({ pointerId: 31, clientY: 100, target: futureAction }));
    equal(nodes.handle.capturedPointer, null, "future action buttons never start resize");
    nodes.handle.emit("pointerdown", event({ pointerId: 32, clientY: 100, target: nodes.composer }));
    equal(nodes.handle.capturedPointer, null, "textarea pointerdown never starts resize");
    nodes.handle.emit("pointerdown", event({ pointerId: 33, clientY: 100, target: nodes.statusSlot }));
    equal(nodes.handle.capturedPointer, 33, "non-interactive status area can pass through to the resize hot zone");
    nodes.handle.emit("pointerup", event({ pointerId: 33 }));

    const beforeDrag = Number(root.style.getPropertyValue("--vela-surface-height").replace("px", ""));
    nodes.handle.emit("pointerdown", event({ pointerId: 4, clientY: 100 }));
    equal(nodes.handle.capturedPointer, 4, "pointer drag captures the pointer");
    nodes.handle.emit("pointermove", event({ pointerId: 4, clientY: 160 }));
    fixture.windowRef.flush();
    ok(Number(root.style.getPropertyValue("--vela-surface-height").replace("px", "")) > beforeDrag, "downward drag grows the Surface");
    nodes.handle.emit("pointerup", event({ pointerId: 4 }));
    equal(nodes.handle.capturedPointer, null, "pointerup releases pointer capture");
    const afterPointerUp = root.style.getPropertyValue("--vela-surface-height");
    nodes.handle.emit("pointermove", event({ pointerId: 4, clientY: 280 }));
    fixture.windowRef.flush();
    equal(root.style.getPropertyValue("--vela-surface-height"), afterPointerUp, "pointerup stops further dragging");
    nodes.handle.emit("pointerdown", event({ pointerId: 5, clientY: 160 }));
    nodes.handle.emit("pointercancel", event({ pointerId: 5 }));
    equal(nodes.handle.capturedPointer, null, "pointercancel releases pointer capture");
    nodes.handle.emit("pointerdown", event({ pointerId: 6, clientY: 160 }));
    nodes.handle.emit("lostpointercapture", event({ pointerId: 6 }));
    equal(nodes.handle.capturedPointer, null, "lost pointer capture ends dragging");
    nodes.handle.emit("pointerdown", event({ pointerId: 7, clientY: 160 }));
    fixture.windowRef.emit("blur", event());
    equal(nodes.handle.capturedPointer, null, "panel blur ends dragging");
    nodes.handle.emit("keydown", event({ key: "ArrowDown" }));
    ok(Number(root.style.getPropertyValue("--vela-surface-height").replace("px", "")) >= Number(afterPointerUp.replace("px", "")), "ArrowDown grows the Surface");
    const beforeLargeStep = Number(root.style.getPropertyValue("--vela-surface-height").replace("px", ""));
    nodes.handle.emit("keydown", event({ key: "ArrowDown", shiftKey: true }));
    ok(Number(root.style.getPropertyValue("--vela-surface-height").replace("px", "")) >= beforeLargeStep + 12, "Shift ArrowDown uses the larger keyboard step");
    nodes.handle.emit("keydown", event({ key: "Home" }));
    equal(nodes.handle.getAttribute("aria-valuenow"), nodes.handle.getAttribute("aria-valuemin"), "Home moves to the minimum height");
    nodes.handle.emit("keydown", event({ key: "End" }));
    equal(nodes.handle.getAttribute("aria-valuenow"), nodes.handle.getAttribute("aria-valuemax"), "End moves to the maximum height");

    fixture.home._rect.height = 360;
    FakeResizeObserver.instances.forEach(function (observer) { observer.trigger(); });
    fixture.windowRef.flush();
    ok(Number(nodes.handle.getAttribute("aria-valuenow")) <= Number(nodes.handle.getAttribute("aria-valuemax")), "container resize reclamps height");
    const sessionHeight = root.style.getPropertyValue("--vela-surface-height");
    surface.suspend();
    ok(root.classList.contains("is-suspended"), "suspend retains DOM while disabling interaction");
    equal(nodes.composer, initialInput, "suspend preserves textarea identity");
    nodes.handle.emit("pointerdown", event({ pointerId: 8, clientY: 120 }));
    equal(nodes.handle.capturedPointer, null, "suspended Surface does not begin a new drag");
    surface.resume();
    ok(!root.classList.contains("is-suspended"), "resume restores interaction");
    equal(root.style.getPropertyValue("--vela-surface-height"), sessionHeight, "resume keeps session-only height");
    equal(nodes.settingsButton, initialSettings, "resume preserves Settings button identity");
    equal(nodes.handle, initialHandle, "resume preserves resize handle identity");
    equal(nodes.grip, initialGrip, "resume preserves resize grip identity");
    const provider = { send: function () {}, cancel: function () {}, getState: function () { return { state: "idle", text: null, errorCode: null }; } };
    const confirmation = { review: function () {}, approve: function () {}, reject: function () {}, getState: function () { return { state: "idle", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: "test" }; } };
    const controller = SurfaceController.create({ surface: surface, provider: provider, confirmation: confirmation, t: function (key) { return "t:" + key; }, PresentationModel: PresentationModel, TranscriptView: TranscriptView, ComposerView: ComposerView, ConfirmationView: ConfirmationView, ActivationPolicy: ActivationPolicy });
    controller.mount();
    const actionNodes = nodes.actionSlot.children.slice(-6);
    const idleSend = actionNodes[0];
    fixture.home._rect.height = 420;
    FakeResizeObserver.instances.forEach(function (observer) { observer.trigger(); });
    fixture.windowRef.flush();
    controller.refreshLocale();
    ok(!nodes.actionSlot.hidden && !idleSend.hidden, "container resize and locale refresh retain the idle Send action");
    equal(actionNodes[0], nodes.actionSlot.children[nodes.actionSlot.children.length - 6], "container resize preserves Send DOM identity");
    controller.dispose();
    ok(surface.dispose(), "dispose cleans Surface resources");
    equal(fixture.mount.children.length, 0, "dispose removes the Surface root");
    equal(surface.dispose(), false, "dispose is idempotent");
}

function testResizeScheduling() {
    FakeResizeObserver.instances = [];
    const fixture = setup(true);
    fixture.surface.mount();
    fixture.windowRef.flush();
    const nodes = fixture.surface.getElementsForTest();
    const observer = FakeResizeObserver.instances[0];
    const initialStyleWrites = nodes.root.styleWriteCount || 0;
    const initialAttributeWrites = nodes.handle.attributeWriteCount || 0;
    const initialLayoutWrites = nodes.root.attributeWriteCount || 0;

    equal(FakeResizeObserver.instances.length, 1, "Surface owns one ResizeObserver for external size signals");
    equal((fixture.windowRef.listeners.resize || []).length, 0, "ResizeObserver support avoids an equivalent window resize listener");
    observer.trigger();
    observer.trigger();
    observer.trigger();
    equal(fixture.windowRef.frames.length, 1, "multiple observer signals coalesce into one animation frame");
    fixture.windowRef.flush();
    equal(nodes.root.styleWriteCount || 0, initialStyleWrites, "unchanged height does not rewrite the CSS variable");
    equal(nodes.handle.attributeWriteCount || 0, initialAttributeWrites, "unchanged bounds and value do not rewrite ARIA attributes");
    equal(nodes.root.attributeWriteCount || 0, initialLayoutWrites, "unchanged layout mode does not rewrite its root attribute");

    observer.trigger();
    equal(fixture.windowRef.frames.length, 1, "a pending external refresh can be cancelled");
    fixture.surface.suspend();
    equal(fixture.windowRef.frames.length, 0, "suspend cancels the pending refresh frame");
    ok(observer.disconnected, "suspend disconnects the active observer");
    fixture.surface.resume();
    equal(FakeResizeObserver.instances.length, 2, "resume creates exactly one replacement observer");
    fixture.surface.resume();
    equal(FakeResizeObserver.instances.length, 2, "repeated resume does not duplicate observers");
    fixture.surface.dispose();
    ok(FakeResizeObserver.instances[1].disconnected, "dispose disconnects the resumed observer");
    equal(fixture.windowRef.frames.length, 0, "dispose cancels the resumed refresh frame");

    const fallback = setup(false);
    fallback.surface.mount();
    equal((fallback.windowRef.listeners.resize || []).length, 1, "window resize is bound only as the observer fallback");
    fallback.windowRef.emit("resize", event());
    fallback.windowRef.emit("resize", event());
    equal(fallback.windowRef.frames.length, 1, "fallback resize signals share the same frame scheduler");
    fallback.surface.suspend();
    equal((fallback.windowRef.listeners.resize || []).length, 0, "suspend removes the fallback resize listener");
    fallback.surface.resume();
    equal((fallback.windowRef.listeners.resize || []).length, 1, "resume restores one fallback resize listener");
    fallback.surface.dispose();
    equal((fallback.windowRef.listeners.resize || []).length, 0, "dispose removes the fallback resize listener");
}

function testStaticContracts() {
    const surfaceSource = fs.readFileSync(path.join(ROOT, "client/js/vela/velaSurface.js"), "utf8");
    const composerSource = fs.readFileSync(path.join(ROOT, "client/js/vela/velaComposerView.js"), "utf8");
    const resizeSource = fs.readFileSync(path.join(ROOT, "client/js/vela/velaResizeController.js"), "utf8");
    const cssSource = fs.readFileSync(path.join(ROOT, "client/css/velaSurface.css"), "utf8");
    const indexSource = fs.readFileSync(path.join(ROOT, "client/index.html"), "utf8");
    const i18nSource = fs.readFileSync(path.join(ROOT, "client/js/i18n.js"), "utf8");
    const mainSource = fs.readFileSync(path.join(ROOT, "client/js/main.js"), "utf8");
    ok(surfaceSource.indexOf("innerHTML") === -1, "Surface never rebuilds DOM with innerHTML");
    ok(surfaceSource.indexOf("localStorage") === -1 && resizeSource.indexOf("localStorage") === -1, "Surface and resize controller use injected storage callbacks rather than localStorage");
    ok(/velaSurfaceLayout:\s*"AEToolbox\.velaSurfaceLayout\.v1"/.test(mainSource), "height preference uses a namespaced versioned storage key");
    ok(!/provider-send|provider-review|approveCandidate|AEToolbox\.VelaExecution|VelaExecutionPreflight/.test(surfaceSource), "Surface has no provider or execution entry point");
    ok(!/VelaRuntime|ProviderController|PlanStore|ExecutionAdapter/.test(surfaceSource), "Surface has no trusted runtime dependency");
    ok(/\.vela-transcript-scroll[\s\S]*overflow-y: auto/.test(cssSource), "only transcript slot is vertically scrollable");
    ok(/\.vela-surface\[data-layout="compact"\]/.test(cssSource) && /\.vela-surface\[data-layout="narrow"\]/.test(cssSource), "CSS owns explicit compact and narrow root layout states");
    ok(/\.vela-bottom-controls\s*\{[\s\S]*?grid-template-areas:\s*"settings status actions"/.test(cssSource), "wide controls use the fixed Settings, status, actions Grid order");
    ok(/\[data-layout="compact"\][\s\S]*?"status status"[\s\S]*?"settings actions"/.test(cssSource), "compact and narrow controls place status above the Settings and actions row");
    ok(/\[data-layout="narrow"\] \.vela-action-slot[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/.test(cssSource), "narrow actions use a deterministic single-column Grid instead of incidental wrapping");
    ok(/\[data-layout="narrow"\] \.vela-status-text[\s\S]*?position:\s*absolute[\s\S]*?width:\s*1px[\s\S]*?clip:\s*rect\(0, 0, 0, 0\)/.test(cssSource), "narrow visually hides the short summary without retaining intrinsic width");
    ok(/\[data-layout="narrow"\] \.vela-experimental-status[\s\S]*?flex:\s*1 1 auto[\s\S]*?min-width:\s*0/.test(cssSource), "narrow keeps the detail visible and lets it consume remaining width safely");
    ok(/data-detail-empty="true"\] \.vela-status-text[\s\S]*?position:\s*static[\s\S]*?text-overflow:\s*ellipsis/.test(cssSource), "narrow restores the same summary node when detail is empty");
    ok(/data-detail-empty="true"\] \.vela-experimental-status[\s\S]*?display:\s*none/.test(cssSource), "empty narrow detail contributes no intrinsic width");
    ok(!/\[data-layout="(?:wide|compact)"\] \.vela-(?:status-text|experimental-status)/.test(cssSource), "wide and compact retain visible status text without layout-specific hiding");
    ok(/\[data-tone="warning"\] \.vela-status-dot[\s\S]*?background:\s*var\(--status-tone-warning\)/.test(cssSource), "Vela warning consumes the shared warning token");
    ok(!/\.vela-surface\.is-narrow/.test(cssSource), "legacy binary is-narrow layout selectors are removed");
    ok(/@media \(prefers-reduced-motion: reduce\)/.test(cssSource) && /transition:\s*none/.test(cssSource) && /scroll-behavior:\s*auto/.test(cssSource), "reduced-motion disables non-essential Surface transitions and smooth scrolling");
    ok(/\.vela-transcript-scroll[\s\S]*border: 1px solid var\(--separator\)[\s\S]*border-radius: var\(--radius-sm\)/.test(cssSource), "transcript uses the same restrained plate language as the composer");
    ok(/\.vela-settings-button[\s\S]*min-height: calc\(26px \* var\(--ui-scale\)\)/.test(cssSource), "Settings uses the compact Surface button treatment");
    ok(/\.vela-surface-action\s*\{[\s\S]*min-height: calc\(26px \* var\(--ui-scale\)\)/.test(cssSource), "Send and Cancel use the compact Surface action height contract");
    ok(/\.vela-surface-action\s*\{[\s\S]*?min-width:\s*0[\s\S]*?text-overflow:\s*ellipsis/.test(cssSource), "long action labels cannot force horizontal overflow");
    ok(/\.vela-status-text\s*\{[\s\S]*?min-width:\s*0[\s\S]*?text-overflow:\s*ellipsis/.test(cssSource), "long status text remains in its shrinkable Grid area");
    ok(/vela-compact-action/.test(composerSource) && !/primary-action|secondary-action/.test(composerSource), "Send and Cancel do not reuse Tool Detail primary or secondary action classes");
    const sharedScrollCss = fs.readFileSync(path.join(ROOT, "client", "css", "style.css"), "utf8");
    ok(/vela-transcript-scroll ui-scroll-region/.test(surfaceSource) && /\.app-shell \*::-webkit-scrollbar[\s\S]*\.app-shell \*::-webkit-scrollbar-thumb:hover/.test(sharedScrollCss), "Transcript inherits the application-global visible CEP/WebKit scrollbar contract");
    ok(/"vela\.surfaceSettings": "Settings"/.test(i18nSource) && /"vela\.surfaceSettings": "\\u8bbe\\u7f6e"/.test(i18nSource), "Surface Settings label is temporarily localized as Settings / 设置");
    ok(/\.vela-surface-mount[\s\S]*margin-bottom: var\(--space-home-major-stack\)/.test(cssSource), "Surface-to-tool-pool rhythm uses the Home-owned major stack gap");
    const handleRule = (cssSource.match(/\.vela-resize-handle\s*\{([^}]*)\}/) || [])[1] || "";
    const gripRule = (cssSource.match(/\.vela-resize-grip\s*\{([^}]*)\}/) || [])[1] || "";
    const settingsRule = (cssSource.match(/\.vela-settings-slot\s*\{([^}]*)\}/) || [])[1] || "";
    const statusRule = (cssSource.match(/\.vela-status-slot\s*\{([^}]*)\}/) || [])[1] || "";
    const actionRule = (cssSource.match(/\.vela-action-slot\s*\{([^}]*)\}/) || [])[1] || "";
    ok(/position: absolute/.test(handleRule) && /left: 0/.test(handleRule) && /right: 0/.test(handleRule) && /bottom: 0/.test(handleRule) && /cursor: ns-resize/.test(handleRule), "resize handle is an absolute bottom overlay rather than a grid row");
    ok(!/grid-area|border-top/.test(handleRule) && /border:\s*0/.test(handleRule) && /background: transparent/.test(handleRule), "resize handle has neither a grid allocation nor a visible full-width rule");
    ok(!/resize resize|grid-area: resize|vela-resize-handle-height/.test(cssSource), "Surface grids and height math reserve no layout row for resize");
    ok(/position: relative/.test((cssSource.match(/\.vela-surface\s*\{([^}]*)\}/) || [])[1] || ""), "Surface root anchors the overlay locally");
    ok(/padding:[^;]*var\(--vela-surface-inset\)/.test(settingsRule) && /padding:[^;]*var\(--vela-surface-inset\)/.test(statusRule) && /padding:[^;]*var\(--vela-surface-inset\)/.test(actionRule), "bottom controls derive their final inset from the same Surface token");
    ok(/z-index:\s*2/.test(settingsRule) && /z-index:\s*2/.test(actionRule) && /pointer-events:\s*none/.test(statusRule), "interactive controls stay above the overlay while non-interactive status can pass through");
    ok(/width: var\(--vela-resize-grip-width\)/.test(gripRule) && /height: var\(--vela-resize-grip-height\)/.test(gripRule) && /background: var\(--separator\)/.test(gripRule) && /pointer-events: none/.test(gripRule), "short low-contrast grip is decorative and cannot intercept resize input");
    ok(/\.vela-surface\s*\{[\s\S]*?border: 1px solid var\(--panel-border\)/.test(cssSource), "Surface outer border remains the only complete visual boundary");
    ok(indexSource.indexOf("id=\"velaSurfaceMount\"") < indexSource.indexOf("id=\"toolGrid\""), "static mount precedes tool pool in index.html");
    ok(/ActivationPolicy:\s*window\.VelaActivationPolicy/.test(mainSource) && !/experimentalEnabled:\s*true/.test(mainSource), "production bootstrap delegates activation to the trusted policy and never starts an opted-in session");
    ok(!/Qualified|Recommended model|Production ready/.test(i18nSource), "Surface i18n does not claim qualification, recommendation, or production readiness");
}

testSurface();
testResizeScheduling();
testHeightPersistence();
testStaticContracts();
console.log("Vela Surface tests passed: " + assertions + " assertions.");
