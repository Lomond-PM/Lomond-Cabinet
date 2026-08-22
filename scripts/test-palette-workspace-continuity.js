#!/usr/bin/env node
"use strict";

/*
 * Phase 4 Dynamic Palette Workspace — update / projection seam regression.
 *
 * Drives the real ProceduralPaletteWorkspace controller against a minimal DOM +
 * CoreUI harness and proves the UI-bridge contracts that real AE acceptance
 * broke:
 *
 *   1. Ordinary draft mutations (ranged number, direct color, source select,
 *      profile binding) project the freshly resolved graph onto the slot cards
 *      WITHOUT rebuilding the Workspace root or its scroll owner.
 *   2. Structural slot edits (add/delete/move/kind/derivation) rebuild only the
 *      editor scroll region and keep the .palette-editor-scroll element identity
 *      AND its scroll position.
 *   3. mix.v1 amount 0 / 0.5 / 1 drives the resolved preview #000000 / #BCBCBC /
 *      #FFFFFF through the resolver, not a palette-specific recompute.
 *   4. Dependency propagation: changing DIRECT A updates REFERENCE B and
 *      DERIVED C previews.
 *
 * On the pre-fix code each of these fails: mutations called refresh(), which did
 * mount.innerHTML = "" (new .palette-editor-scroll at scrollTop 0), and field
 * edits never projected the re-resolved colors onto the swatches.
 */

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const Store = require(path.join(ROOT, "client/js/proceduralPaletteStore.js"));
const Library = require(path.join(ROOT, "client/js/proceduralPaletteLibrary.js"));
const Editor = require(path.join(ROOT, "client/js/proceduralPaletteEditor.js"));
const Workspace = require(path.join(ROOT, "client/js/proceduralPaletteWorkspace.js"));

/* ------------------------------------------------------------------ *
 * Minimal fake DOM (enough for the workspace controller's selectors
 * and element operations; no HTML parsing).
 * ------------------------------------------------------------------ */

class FakeClassList {
    constructor(el) { this.el = el; }
    add() { for (let i = 0; i < arguments.length; i++) this.el._classSet.add(arguments[i]); this.el._syncClass(); }
    remove() { for (let i = 0; i < arguments.length; i++) this.el._classSet.delete(arguments[i]); this.el._syncClass(); }
    toggle(name, force) {
        const has = this.el._classSet.has(name);
        const want = force === undefined ? !has : !!force;
        if (want) this.el._classSet.add(name); else this.el._classSet.delete(name);
        this.el._syncClass();
        return want;
    }
    contains(name) { return this.el._classSet.has(name); }
}

class FakeStyle {
    constructor(el) { this.el = el; }
    setProperty(name, value) { this[name] = String(value); }
    removeProperty(name) { delete this[name]; }
    getPropertyValue(name) { return Object.prototype.hasOwnProperty.call(this, name) ? this[name] : ""; }
}

class FakeElement {
    constructor(tagName, ownerDoc) {
        this.nodeType = 1;
        this.tagName = String(tagName || "div").toUpperCase();
        this.ownerDocument = ownerDoc;
        this.childNodes = [];
        this.parentNode = null;
        this.attributes = {};
        this._classSet = new Set();
        this._className = "";
        this.id = "";
        this.value = "";
        this.type = "";
        this.title = "";
        this.disabled = false;
        this.hidden = false;
        this.readOnly = false;
        this.scrollTop = 0;
        this.scrollLeft = 0;
        this._text = "";
        this.style = new FakeStyle(this);
        this.classList = new FakeClassList(this);
        this._listeners = {};
        this._coreFrame = null;
    }
    _syncClass() { this._className = Array.from(this._classSet).join(" "); }
    get className() { return this._className; }
    set className(v) { this._className = String(v); this._classSet = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
    get firstChild() { return this.childNodes.length ? this.childNodes[0] : null; }
    get lastChild() { return this.childNodes.length ? this.childNodes[this.childNodes.length - 1] : null; }
    get nextSibling() { if (!this.parentNode) return null; const idx = this.parentNode.childNodes.indexOf(this); return this.parentNode.childNodes[idx + 1] || null; }
    get previousSibling() { if (!this.parentNode) return null; const idx = this.parentNode.childNodes.indexOf(this); return idx > 0 ? this.parentNode.childNodes[idx - 1] : null; }
    get offsetWidth() { return 100; }
    appendChild(child) { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.childNodes.push(child); return child; }
    insertBefore(child, ref) { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; let idx = ref ? this.childNodes.indexOf(ref) : -1; if (idx < 0) this.childNodes.push(child); else this.childNodes.splice(idx, 0, child); return child; }
    removeChild(child) { const idx = this.childNodes.indexOf(child); if (idx >= 0) { this.childNodes.splice(idx, 1); child.parentNode = null; } return child; }
    setAttribute(name, value) { const v = String(value); this.attributes[name] = v; if (name === "id") this.id = v; if (name === "class") this.className = v; }
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : (name === "id" ? (this.id || null) : (name === "class" ? (this._className || null) : null)); }
    removeAttribute(name) { delete this.attributes[name]; if (name === "id") this.id = ""; }
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
    removeEventListener(type, fn) { const a = this._listeners[type]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
    dispatchEvent(evt) { evt.target = evt.target || this; (this._listeners[evt.type] || []).slice().forEach((fn) => fn.call(this, evt)); }
    focus() {}
    select() {}
    contains(other) { let cur = other; while (cur) { if (cur === this) return true; cur = cur.parentNode; } return false; }
    getBoundingClientRect() { return { width: 100, height: 100, left: 0, top: 0, right: 100, bottom: 100 }; }
    querySelector(sel) { return this._find(sel)[0] || null; }
    querySelectorAll(sel) { return this._find(sel); }
    _matches(sel) {
        if (sel.charAt(0) === ".") return this.classList.contains(sel.slice(1));
        if (sel.charAt(0) === "#") return this.id === sel.slice(1);
        return false;
    }
    _find(sel) {
        const out = [];
        const walk = (node) => {
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = node.childNodes[i];
                if (child.nodeType === 1) {
                    if (child._matches(sel)) out.push(child);
                    walk(child);
                }
            }
        };
        walk(this);
        return out;
    }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
    set textContent(v) { this.childNodes.forEach((c) => { c.parentNode = null; }); this.childNodes = []; this._text = String(v); }
    get innerHTML() { return this.children.map((c) => c.outerHTML || "").join(""); }
    set innerHTML(v) { this.childNodes.forEach((c) => { c.parentNode = null; }); this.childNodes = []; if (v && v !== "") this._text = String(v); }
}

class FakeDocument {
    constructor() {
        this.documentElement = new FakeElement("html", this);
        this.body = new FakeElement("body", this);
        this.documentElement.appendChild(this.body);
        this._nextRaf = 1;
    }
    createElement(tag) { return new FakeElement(tag, this); }
    createTextNode(text) { const n = new FakeElement("text", this); n.nodeType = 3; n._text = String(text); return n; }
    getElementById(id) { return this._walk().find((el) => el.id === id) || null; }
    querySelector(sel) { return this._find(sel)[0] || null; }
    querySelectorAll(sel) { return this._find(sel); }
    addEventListener() {}
    removeEventListener() {}
    _walk() { const out = []; const walk = (node) => { out.push(node); for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]); }; walk(this.documentElement); return out; }
    _find(sel) { const out = []; const walk = (node) => { for (let i = 0; i < node.childNodes.length; i++) { const child = node.childNodes[i]; if (child.nodeType === 1) { if (child._matches(sel)) out.push(child); walk(child); } } }; walk(this.documentElement); return out; }
}

/* ------------------------------------------------------------------ *
 * Fake CoreUI (records the callback contracts the workspace consumes).
 * ------------------------------------------------------------------ */

function makeCoreUI() {
    function element(doc, tag, classNames) { const el = doc.createElement(tag); if (classNames) el.className = classNames; return el; }
    return {
        createButton(options) {
            const el = element(options.document, "button", options.classNames);
            el.type = "button";
            el.__onClick = options.onClick;
            return el;
        },
        createSelect(options) {
            const el = element(options.document, "select", options.classNames);
            el.__onChange = options.onChange;
            return el;
        },
        createTextInput(options) {
            const el = element(options.document, "input", options.classNames);
            el.type = "text";
            el.value = options.value || "";
            el.__onInput = options.onInput;
            return el;
        },
        createTextarea(options) {
            const el = element(options.document, "textarea", options.classNames);
            el._coreFrame = el;
            return el;
        },
        createNumberInput(options) {
            const el = element(options.document, "input", options.classNames);
            el.type = "text";
            el.inputMode = "decimal";
            el.value = String(options.value === null || options.value === undefined ? "" : options.value);
            el.__onInput = options.onInput;
            el.__onDragValue = options.onDragValue;
            el.__onCommit = options.onCommit;
            el.__onCancel = options.onCancel;
            return el;
        },
        createFieldRow(options) {
            const row = element(options.document, "div", options.classNames);
            if (options.control) row.appendChild(options.control);
            return { row };
        },
        createColorField(options) {
            const root = element(options.document, "span", options.classNames);
            const hex = element(options.document, "input", options.hexClassNames);
            hex.value = options.value || "";
            root.__colorField = { hex };
            root.__onPreview = options.onPreview;
            root.__onCommit = options.onCommit;
            root.hex = hex;
            return { root, hex };
        }
    };
}

/* ------------------------------------------------------------------ *
 * A non-resetting appearance stub (preview canvases are a noop here).
 * ------------------------------------------------------------------ */

function makeAppearance() {
    return { clearCache() {}, render() {} };
}

function storage() {
    const values = {};
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        removeItem(key) { delete values[key]; },
        values
    };
}

function makeWindow(doc) {
    const rafs = [];
    const timers = [];
    return {
        rafs,
        timers,
        innerWidth: 1000,
        innerHeight: 800,
        requestAnimationFrame(cb) { rafs.push(cb); return rafs.length; },
        cancelAnimationFrame() {},
        setTimeout(cb, delay) { timers.push(cb); return timers.length; },
        clearTimeout() {},
        addEventListener() {},
        removeEventListener() {},
        matchMedia() { return { matches: false }; },
        flushRaf() { const q = rafs.splice(0, rafs.length); q.forEach((cb) => cb()); }
    };
}

function makeDraft() {
    return {
        id: "mixTest",
        revision: 1,
        metadata: { displayName: "Mix Test", family: "userCustom", origin: "custom" },
        slots: [
            { id: "A", label: "A", kind: "DIRECT", value: { color: "#000000" } },
            { id: "B", label: "B", kind: "DIRECT", value: { color: "#FFFFFF" } },
            { id: "C", label: "C", kind: "DERIVED", derivation: { derivationId: "mix.v1", sourceSlotIds: ["A", "B"], parameters: { amount: 0.5 } } }
        ],
        profiles: { proceduralAppearance: {
            bindings: { shadow: "A", base: "A", secondary: "B", highlight: "B" },
            stops: [0, 0.34, 0.74, 1],
            weights: { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 },
            saturationBias: 0, luminanceBias: 0, contrastBias: 0
        } }
    };
}

function findCard(doc, slotId) {
    const cards = doc.querySelectorAll(".palette-slot-card");
    for (const card of cards) if (card.getAttribute("data-slot-id") === slotId) return card;
    return null;
}

function swatchColor(card) {
    const swatch = card.querySelector(".palette-slot-resolved-swatch");
    return swatch ? swatch.style.backgroundColor : null;
}

function slotErrorCode(card) {
    const error = card.querySelector(".palette-slot-resolution-error");
    return error ? error.textContent : null;
}

function optionValues(select) {
    return select.children.filter((c) => c.tagName === "OPTION").map((c) => c.value);
}

function findKindSelect(card) {
    for (const sel of card.querySelectorAll(".palette-editor-select")) {
        const vals = optionValues(sel);
        if (vals.indexOf("DIRECT") >= 0 && vals.indexOf("REFERENCE") >= 0 && vals.indexOf("DERIVED") >= 0) return sel;
    }
    return null;
}

function findDerivationSelect(card) {
    for (const sel of card.querySelectorAll(".palette-editor-select")) {
        if (optionValues(sel).indexOf("mix.v1") >= 0) return sel;
    }
    return null;
}

function findSourceSelect(card, targetSlotId) {
    for (const sel of card.querySelectorAll(".palette-editor-select")) {
        if (optionValues(sel).indexOf(targetSlotId) >= 0) return sel;
    }
    return null;
}

function run() {
    const target = storage();
    const storeResult = Store.initialize({ library: Library, storage: target, clock: () => "2026-08-22T00:00:00.000Z" });
    assert(storeResult && storeResult.status, "Palette Store v2 should initialize.");

    const created = Store.createV2Palette(makeDraft());
    assert.strictEqual(created.ok, true, "The A/B/C mix fixture should be a valid v2 draft.");
    const paletteId = created.v2Palette.id;

    const doc = new FakeDocument();
    const win = makeWindow(doc);
    const view = doc.createElement("div");
    view.id = "settingsView";
    const content = doc.createElement("div");
    content.className = "settings-content";
    const rootPage = doc.createElement("div");
    rootPage.className = "settings-root-page";
    const paletteSection = doc.createElement("div");
    paletteSection.id = "settingsPaletteLibraryMount";
    paletteSection.className = "settings-section settings-section--palette-library";
    content.appendChild(rootPage);
    doc.body.appendChild(view);
    view.appendChild(content);
    doc.body.appendChild(paletteSection);

    let statusCalls = [];
    Workspace.teardown();
    Workspace.initialize({
        document: doc,
        window: win,
        PaletteStore: Store,
        ProceduralPaletteEditor: Editor,
        ProceduralAppearance: makeAppearance(),
        CoreUI: makeCoreUI(),
        translate(key) { return key; },
        normalizeHex(value, fallback) { return value || fallback; },
        createSettingsSectionHeader() { return doc.createElement("div"); },
        setSettingsBackParent() {},
        setStatus(message, type) { statusCalls.push({ message, type }); },
        closeCustomSelectMenus() {},
        disposeSelectsWithin() {},
        enhanceSelect() {},
        isSchemaNumberDraftValue() { return false; },
        applySchemaNumberAttributes() {},
        bindHexInputSelectBehavior() {},
        duration() { return 0; },
        nextFrame(cb) { cb(); },
        panelShutdownPredicate() { return false; },
        invalidateHomeIcons() {},
        refreshHomeIcons() {},
        openCoreColorPicker() {},
        refreshI18n() {}
    });

    Workspace.open();
    assert.strictEqual(Workspace.isOpen(), true, "open should enter the workspace.");
    Workspace.selectPalette(paletteId);

    const scroll = doc.querySelector(".palette-editor-scroll");
    assert(scroll, "The editor must render a .palette-editor-scroll scroll owner.");
    scroll.scrollTop = 240;

    const cardA = findCard(doc, "A");
    const cardB = findCard(doc, "B");
    const cardC = findCard(doc, "C");
    assert(cardA && cardB && cardC, "All three fixture slots must render cards.");
    assert.strictEqual(swatchColor(cardA), "#000000");
    assert.strictEqual(swatchColor(cardB), "#FFFFFF");
    assert.strictEqual(swatchColor(cardC), "#BCBCBC", "Initial mix.v1 amount 0.5 should resolve to #BCBCBC.");

    /* ---- Issue 2: live DERIVED preview through the resolver ---- */
    const amount = cardC.querySelectorAll(".palette-editor-number")[0];
    assert(amount, "The DERIVED card must own one number field (mix amount).");
    amount.__onDragValue("0");
    assert.strictEqual(swatchColor(cardC), "#000000", "amount=0 should project #000000 live (no full rerender).");
    assert.strictEqual(scroll.scrollTop, 240, "A data mutation must not reset the scroll owner position.");
    amount.__onDragValue("0.5");
    assert.strictEqual(swatchColor(cardC), "#BCBCBC");
    amount.__onDragValue("1");
    assert.strictEqual(swatchColor(cardC), "#FFFFFF");

    // The SAME number element survived the data mutations (it is not rebuilt).
    assert.strictEqual(cardC.querySelectorAll(".palette-editor-number")[0], amount,
        "Ranged parameter edits must keep the focused control element alive.");

    // Reset C back to amount 0.5 so later dependency checks use a meaningful mix.
    amount.__onDragValue("0.5");
    assert.strictEqual(swatchColor(cardC), "#BCBCBC");

    /* ---- Issue 1: structural slot edits keep scroll identity + position ---- */
    const scrollBefore = scroll;
    // Move up.
    const moveButtons = cardC.querySelectorAll(".palette-slot-move");
    assert.strictEqual(moveButtons.length, 2, "Card should own move up + move down.");
    moveButtons[0].__onClick();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore, "Move must keep the scroll owner identity.");
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Move Up must not jump to top.");
    assert.strictEqual(findCard(doc, "A").getAttribute("data-slot-id"), "A");
    assert.strictEqual(findCard(doc, "C").getAttribute("data-slot-id"), "C");

    // Move down.
    const cardC2 = findCard(doc, "C");
    cardC2.querySelectorAll(".palette-slot-move")[1].__onClick();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Move Down must not jump to top.");
    assert.strictEqual(findCard(doc, "C").getAttribute("data-slot-id"), "C");

    // Add slot.
    const addButtons = doc.querySelectorAll(".palette-slot-add");
    addButtons[2].__onClick(); // add DERIVED
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Add Slot must not jump to top.");
    assert.strictEqual(doc.querySelectorAll(".palette-slot-card").length, 4, "Add should append one new slot card.");
    const addedCard = doc.querySelectorAll(".palette-slot-card")[3];
    const newId = addedCard.getAttribute("data-slot-id");
    assert(newId, "The added slot should carry an id.");

    // Delete the newly added derived slot (it depends on nothing).
    const newCard = findCard(doc, newId);
    newCard.querySelectorAll(".palette-slot-delete")[0].__onClick();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Delete Slot must not jump to top.");
    assert.strictEqual(doc.querySelectorAll(".palette-slot-card").length, 3);
    assert(!findCard(doc, newId), "The selected Delete Slot should be removed.");

    // Kind change (rebuild the card fields but not the scroll owner).
    const cardA2 = findCard(doc, "A");
    const kindSelect = findKindSelect(cardA2);
    assert(kindSelect, "A card should host a kind select.");
    kindSelect.value = "REFERENCE";
    kindSelect.__onChange();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Kind Select change must not jump to top.");
    assert.strictEqual(findCard(doc, "A").getAttribute("data-slot-id"), "A");

    // Derivation select change (structural fields change, scroll owner stays).
    const cardC3a = findCard(doc, "C");
    const derivationSelect0 = findDerivationSelect(cardC3a);
    assert(derivationSelect0, "The DERIVED card should host a derivation select.");
    derivationSelect0.value = "mix.v1";
    derivationSelect0.__onChange();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Derivation Select change must not jump to top.");

    // Restore A to DIRECT so the dependency graph is well formed for later checks.
    const cardA3 = findCard(doc, "A");
    const kindSelect2 = findKindSelect(cardA3);
    kindSelect2.value = "DIRECT";
    kindSelect2.__onChange();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Kind select round-trip must keep the scroll position.");

    // Reset A back to black (the DIRECT default payload color from the kind rebuild)
    // and reset C amount to 0.5 through the resolver so dependency checks are exact.
    const cardA4 = findCard(doc, "A");
    cardA4.querySelector(".palette-editor-color-control").__onCommit("#000000");
    const cardC3b = findCard(doc, "C");
    cardC3b.querySelectorAll(".palette-editor-number")[0].__onDragValue("0.5");
    assert.strictEqual(swatchColor(cardC3b), "#BCBCBC");

    /* ---- Dependency propagation: change DIRECT A -> REFERENCE B2 & DERIVED C follow ---- */
    const cardA5 = findCard(doc, "A");
    const colorField = cardA5.querySelector(".palette-editor-color-control");
    assert(colorField, "DIRECT A should expose a color control.");
    colorField.__onPreview("#123456");
    assert.strictEqual(swatchColor(cardA5), "#123456", "A swatch should follow its DIRECT color.");
    assert.strictEqual(swatchColor(findCard(doc, "B")), "#FFFFFF", "B stays white (independent DIRECT).");
    const expectedC = Editor.validateNativeDraft(makeDraftWithAColor("#123456", 0.5)).resolution.colors.C;
    assert.strictEqual(swatchColor(findCard(doc, "C")), expectedC, "DERIVED C must be re-projected from the current resolver draft after A changes.");
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Dependency propagation must not reset the scroll owner.");

    // REFERENCE B2 -> A: create, bind, then change A and verify B2 tracks it.
    const addRef = doc.querySelectorAll(".palette-slot-add")[1]; // add REFERENCE
    addRef.__onClick();
    const listCards = doc.querySelectorAll(".palette-slot-card");
    const b2Id = listCards[listCards.length - 1].getAttribute("data-slot-id");
    const b2SourceSelect = findSourceSelect(findCard(doc, b2Id), "A");
    assert(b2SourceSelect, "REFERENCE B2 should host a source select restricted to slot ids.");
    b2SourceSelect.value = "A";
    b2SourceSelect.__onChange();
    assert.strictEqual(swatchColor(findCard(doc, b2Id)), "#123456", "REFERENCE B2 -> A should resolve to A's color.");
    const cardA6 = findCard(doc, "A");
    cardA6.querySelector(".palette-editor-color-control").__onCommit("#0A0B0C");
    assert.strictEqual(swatchColor(findCard(doc, "A")), "#0A0B0C");
    assert.strictEqual(swatchColor(findCard(doc, b2Id)), "#0A0B0C", "REFERENCE B2 must track the new A color.");
    const expectedC2 = Editor.validateNativeDraft(makeDraftWithAColor("#0A0B0C", 0.5)).resolution.colors.C;
    assert.strictEqual(swatchColor(findCard(doc, "C")), expectedC2, "DERIVED C must track the new A color.");
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Draft edits must preserve the scroll position.");

    /* ---- oklchAdjust live preview ---- */
    const cardC4 = findCard(doc, "C");
    const derivationSelect = findDerivationSelect(cardC4);
    assert(derivationSelect, "The DERIVED card should host a derivation select.");
    derivationSelect.value = "oklchAdjust.v1";
    derivationSelect.__onChange();
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    const cardC5 = findCard(doc, "C");
    assert.strictEqual(cardC5.querySelectorAll(".palette-editor-number").length, 3, "oklchAdjust should surface hueDelta/lightnessDelta/chromaScale.");
    const oklchNumbers = cardC5.querySelectorAll(".palette-editor-number");
    const baseColor = swatchColor(cardC5);
    oklchNumbers[0].__onDragValue("40"); // hueDelta
    assert.notStrictEqual(swatchColor(cardC5), baseColor, "hueDelta change must re-project the derived color live.");
    oklchNumbers[1].__onDragValue("0.1"); // lightnessDelta
    assert.notStrictEqual(swatchColor(cardC5), baseColor, "lightnessDelta change must re-project the derived color live.");
    oklchNumbers[2].__onDragValue("0.8"); // chromaScale
    assert.notStrictEqual(swatchColor(cardC5), baseColor, "chromaScale change must re-project the derived color live.");
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "oklchAdjust edits must preserve the scroll position.");

    /* ---- Rename slot is an ordinary field edit (no rebuild) ---- */
    const cardA7 = findCard(doc, "A");
    const labelInput = cardA7.querySelectorAll(".palette-editor-text")[0];
    assert(labelInput, "Slot card should host a label text input.");
    labelInput.value = "Alpha";
    labelInput.__onInput();
    assert.strictEqual(cardA7.querySelector(".palette-slot-card-header").textContent.indexOf("Alpha") >= 0, true, "Rename should update the title in place.");
    assert.strictEqual(doc.querySelector(".palette-editor-scroll"), scrollBefore);
    assert.strictEqual(doc.querySelector(".palette-editor-scroll").scrollTop, 240, "Rename Slot must preserve the scroll position.");

    Workspace.close({ reason: "settings-close", animate: false });
    assert.strictEqual(Workspace.isOpen(), false);

    console.log("PASS Palette Workspace continuity: scroll identity, live derived preview, dependency propagation, live oklchAdjust, select lifecycle.");
}

function makeDraftWithAColor(aColor, amount) {
    const draft = makeDraft();
    draft.slots[0].value.color = aColor;
    draft.slots[2].derivation.parameters.amount = amount;
    return draft;
}

try {
    run();
} catch (error) {
    console.error("FAIL Palette Workspace continuity - " + (error && error.stack ? error.stack : error.message));
    process.exitCode = 1;
}
