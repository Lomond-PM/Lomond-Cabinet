#!/usr/bin/env node
"use strict";

const assert = require("assert");
const Editor = require("../client/js/proceduralPaletteEditor.js");
const Library = require("../client/js/proceduralPaletteLibrary.js");
const Store = require("../client/js/proceduralPaletteStore.js");

function storage() {
    const values = {};
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem(key, value) { values[key] = String(value); },
        removeItem(key) { delete values[key]; },
        values
    };
}

const target = storage();
Store.initialize({ library: Library, storage: target, clock: () => "2026-08-22T00:00:00.000Z" });
let state = Editor.createNativeEditorState(Store.getV2Palette("pacificCyan"));
assert.strictEqual(state.draft.slots.length, 4);
assert.strictEqual(state.dirty, false);

state = Editor.addNativeSlot(state, "DIRECT");
const directId = state.draft.slots[state.draft.slots.length - 1].id;
assert.ok(/^slot_[a-z0-9]+_[a-z0-9]+$/.test(directId));
state = Editor.updateNativeSlot(state, directId, { label: "Tint", value: { color: "#ABCDEF" } });
assert.strictEqual(state.dirty, true);

state = Editor.addNativeSlot(state, "REFERENCE");
const referenceId = state.draft.slots[state.draft.slots.length - 1].id;
state = Editor.updateNativeSlot(state, referenceId, { reference: { slotId: directId } });
state = Editor.addNativeSlot(state, "DERIVED");
const derivedId = state.draft.slots[state.draft.slots.length - 1].id;
state = Editor.updateNativeSlot(state, derivedId, { derivationId: "mix.v1" });
state = Editor.updateNativeSlot(state, derivedId, { derivation: { derivationId: "mix.v1", sourceSlotIds: [directId, referenceId], parameters: { amount: 0.25 } } });
let validation = Editor.validateNativeDraft(state.draft);
assert.strictEqual(validation.ok, true);
assert.strictEqual(validation.resolution.colors[directId], "#ABCDEF");
assert.ok(/^#[0-9A-F]{6}$/.test(validation.resolution.colors[derivedId]));
const sameColorGraph = Editor.createNativeEditorState(state.draft);
const graphChanged = Editor.updateNativeSlot(sameColorGraph, referenceId, { reference: { slotId: "highlight" } });
assert.strictEqual(graphChanged.dirty, true, "Graph-only changes must be dirty even when presentation can match.");

const idsBefore = state.draft.slots.map((slot) => slot.id).sort();
state = Editor.moveNativeSlot(state, derivedId, -1);
assert.deepStrictEqual(state.draft.slots.map((slot) => slot.id).sort(), idsBefore);
let deletion = Editor.deleteNativeSlot(state, directId);
assert.strictEqual(deletion.ok, false);
assert.deepStrictEqual(deletion.dependents.map((item) => item.id).sort(), [derivedId, referenceId].sort());

state = Editor.updateNativeSlot(state, derivedId, { derivationId: "oklchAdjust.v1" });
validation = Editor.validateNativeDraft(state.draft);
assert.strictEqual(validation.ok, true);
assert.deepStrictEqual(Object.keys(state.draft.slots.find((slot) => slot.id === derivedId).derivation.parameters).sort(), ["chromaScale", "hueDelta", "lightnessDelta"]);

const bytesBeforePreview = target.getItem(Store.storageKey);
assert.strictEqual(Store.setTransientV2Palette("preview", state.draft).ok, true);
assert.strictEqual(target.getItem(Store.storageKey), bytesBeforePreview);
assert.strictEqual(Store.getResolvedPalette("preview").isTransient, true);
assert.strictEqual(Store.getV2Snapshot().customPalettes.some((palette) => palette.id === "preview"), false);
Store.clearTransientPalette("preview");

const saved = Store.saveV2Palette("pacificCyan", state.draft);
assert.strictEqual(saved.ok, true);
assert.strictEqual(Store.getV2Palette("pacificCyan").slots.some((slot) => slot.id === derivedId), true);
assert.strictEqual(Store.getV2Palette("pacificCyan").revision, state.draft.revision + 1);
assert.strictEqual(Store.resetBuiltInPalette("pacificCyan").ok, true);
assert.strictEqual(Store.getV2Palette("pacificCyan").slots.some((slot) => slot.id === derivedId), false);

const createdState = Editor.createNativeNewEditorState("pacificCyan");
const created = Store.createV2Palette(createdState.draft);
assert.strictEqual(created.ok, true);
assert.strictEqual(created.v2Palette.metadata.origin, "custom");
const duplicateState = Editor.createNativeDuplicateEditorState(created.v2Palette, created.v2Palette.id);
assert.strictEqual(duplicateState.draft.slots.length, created.v2Palette.slots.length);
assert.notStrictEqual(duplicateState.draft.id, created.v2Palette.id);
assert.strictEqual(Store.deletePalette(created.v2Palette.id).ok, true);

console.log("PASS Palette Workspace v2: dynamic graph, dependency guard, derivations, native preview/save/reset.");
