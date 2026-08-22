/*
 * Palette editor UI state and layout helpers.
 * Keeps draft state independent from the persistent Palette Store.
 */
(function (root, factory) {
    "use strict";
    var browser = !!(root && root.document);
    var api = factory(
        browser ? root.PaletteModel : (typeof module !== "undefined" && module.exports ? require("./palette/paletteModel.js") : root.PaletteModel),
        browser ? root.PaletteResolver : (typeof module !== "undefined" && module.exports ? require("./palette/paletteResolver.js") : root.PaletteResolver),
        browser ? root.ColorDerivationRegistry : (typeof module !== "undefined" && module.exports ? require("./palette/colorDerivationRegistry.js") : root.ColorDerivationRegistry)
    );
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralPaletteEditor = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (Model, Resolver, Derivations) {
    "use strict";

    var ROLE_KEYS = ["shadow", "base", "secondary", "highlight"];
    var DEFAULT_LIBRARY_WIDTH = 210;
    var MIN_LIBRARY_WIDTH = 150;
    var MAX_LIBRARY_WIDTH = 340;
    var STACKED_BREAKPOINT = 620;
    var slotIdSequence = 0;

    function clone(value) {
        if (value === null || typeof value !== "object") {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(clone);
        }
        var result = {};
        Object.keys(value).forEach(function (key) {
            result[key] = clone(value[key]);
        });
        return result;
    }

    function stableStringify(value) {
        if (value === null || typeof value !== "object") {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return "[" + value.map(stableStringify).join(",") + "]";
        }
        return "{" + Object.keys(value).sort().map(function (key) {
            return JSON.stringify(key) + ":" + stableStringify(value[key]);
        }).join(",") + "}";
    }

    function editablePalette(palette) {
        var source = clone(palette || {});
        var draft = {
            id: source.id || "",
            version: source.version || 1,
            family: source.family || "userCustom",
            displayName: source.displayName || source.id || "",
            colors: {},
            stops: Array.isArray(source.stops) ? source.stops.slice(0, 4) : [0, 0.34, 0.74, 1],
            weights: {},
            saturationBias: source.saturationBias,
            luminanceBias: source.luminanceBias,
            contrastBias: source.contrastBias
        };
        ROLE_KEYS.forEach(function (role) {
            draft.colors[role] = source.colors && source.colors[role] ? source.colors[role] : "";
            draft.weights[role] = source.weights && typeof source.weights[role] !== "undefined" ? source.weights[role] : 0;
        });
        return draft;
    }

    function draftSignature(draft) {
        return stableStringify(editablePalette(draft));
    }

    function createEditorState(palette) {
        var draft = editablePalette(palette);
        return {
            selectedPaletteId: palette && palette.id ? palette.id : "",
            previousSelectedPaletteId: palette && palette.id ? palette.id : "",
            editorMode: palette && palette.isBuiltIn ? "builtIn" : "custom",
            draft: draft,
            sourceSignature: draftSignature(draft),
            dirty: false,
            saving: false,
            pendingTransition: null
        };
    }

    function createNewEditorState(previousSelectedPaletteId) {
        var draft = editablePalette({
            displayName: "New Palette",
            family: "userCustom",
            colors: {
                shadow: "#1B2733",
                base: "#426F8A",
                secondary: "#8CB9C9",
                highlight: "#E8F7FF"
            },
            stops: [0, 0.34, 0.74, 1],
            weights: { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 }
        });
        return {
            selectedPaletteId: "",
            previousSelectedPaletteId: previousSelectedPaletteId || "",
            editorMode: "new",
            draft: draft,
            sourceSignature: "",
            dirty: true,
            saving: false,
            pendingTransition: null
        };
    }

    function createDuplicateEditorState(palette, previousSelectedPaletteId) {
        var state = createEditorState(palette);
        state.editorMode = "duplicate";
        state.selectedPaletteId = "";
        state.previousSelectedPaletteId = previousSelectedPaletteId || (palette && palette.id) || "";
        state.draft.id = "";
        state.draft.displayName = (state.draft.displayName || "Palette") + " Copy";
        state.sourceSignature = "";
        state.dirty = true;
        return state;
    }

    function mergeDraftPatch(draft, patch) {
        var next = editablePalette(draft);
        patch = patch || {};
        Object.keys(patch).forEach(function (key) {
            if (key === "colors") {
                next.colors = Object.assign({}, next.colors, clone(patch.colors || {}));
            } else if (key === "weights") {
                next.weights = Object.assign({}, next.weights, clone(patch.weights || {}));
            } else if (key === "stops") {
                next.stops = Array.isArray(patch.stops) ? patch.stops.slice(0, 4) : next.stops;
            } else {
                next[key] = clone(patch[key]);
            }
        });
        return next;
    }

    function updateEditorDraft(state, patch) {
        var next = clone(state || {});
        next.draft = mergeDraftPatch(next.draft, patch);
        next.dirty = draftSignature(next.draft) !== next.sourceSignature;
        return next;
    }

    function discardEditorDraft(state, palette) {
        var next = createEditorState(palette);
        next.previousSelectedPaletteId = state && state.previousSelectedPaletteId ? state.previousSelectedPaletteId : next.previousSelectedPaletteId;
        return next;
    }

    function clampLibraryWidth(value) {
        var numeric = Number(value);
        if (!isFinite(numeric)) {
            return DEFAULT_LIBRARY_WIDTH;
        }
        return Math.max(MIN_LIBRARY_WIDTH, Math.min(MAX_LIBRARY_WIDTH, Math.round(numeric)));
    }

    function parseLibraryWidth(value) {
        var numeric = Number(value);
        return isFinite(numeric) ? clampLibraryWidth(numeric) : DEFAULT_LIBRARY_WIDTH;
    }

    function getWorkspaceLayout(availableWidth) {
        return Number(availableWidth) < STACKED_BREAKPOINT ? "stacked" : "split";
    }

    function clampStopValue(stops, index, value, step) {
        var source = Array.isArray(stops) ? stops.slice(0, 4) : [0, 0.34, 0.74, 1];
        var increment = Number(step);
        var numeric = Number(value);
        var min;
        var max;
        if (!isFinite(increment) || increment <= 0) {
            increment = 0.01;
        }
        if (index <= 0) {
            return 0;
        }
        if (index >= 3) {
            return 1;
        }
        if (!isFinite(numeric)) {
            numeric = Number(source[index]);
        }
        min = Number(source[index - 1]) + increment;
        max = Number(source[index + 1]) - increment;
        return Math.round(Math.max(min, Math.min(max, numeric)) * 10000) / 10000;
    }

    function weightTotal(weights) {
        var total = 0;
        ROLE_KEYS.forEach(function (role) {
            var value = Number(weights && weights[role]);
            if (isFinite(value) && value > 0) {
                total += value;
            }
        });
        return total;
    }

    function hasPositiveWeightTotal(weights) {
        return weightTotal(weights) > 0;
    }

    function fullDraftSignature(draft) {
        return stableStringify(draft || {});
    }

    function createNativeEditorState(palette) {
        var draft = clone(palette || {});
        return {
            selectedPaletteId: draft.id || "",
            previousSelectedPaletteId: draft.id || "",
            editorMode: draft.metadata && draft.metadata.origin === "builtIn" ? "builtIn" : "custom",
            draft: draft,
            sourceSignature: fullDraftSignature(draft),
            dirty: false,
            saving: false,
            pendingTransition: null,
            nextSlotSequence: nextSlotSequence(draft)
        };
    }

    function createDefaultV2Palette(id, displayName) {
        return {
            id: id || "paletteEditorDraft",
            revision: 1,
            metadata: { displayName: displayName || "New Palette", family: "userCustom", origin: "custom" },
            slots: [
                { id: "shadow", label: "Shadow", kind: "DIRECT", value: { color: "#1B2733" } },
                { id: "base", label: "Base", kind: "DIRECT", value: { color: "#426F8A" } },
                { id: "secondary", label: "Secondary", kind: "DIRECT", value: { color: "#8CB9C9" } },
                { id: "highlight", label: "Highlight", kind: "DIRECT", value: { color: "#E8F7FF" } }
            ],
            profiles: { proceduralAppearance: {
                bindings: { shadow: "shadow", base: "base", secondary: "secondary", highlight: "highlight" },
                stops: [0, 0.34, 0.74, 1],
                weights: { shadow: 0.26, base: 0.5, secondary: 0.16, highlight: 0.08 },
                saturationBias: 0, luminanceBias: 0, contrastBias: 0
            } }
        };
    }

    function createNativeNewEditorState(previousSelectedPaletteId) {
        var state = createNativeEditorState(createDefaultV2Palette("paletteEditorDraft", "New Palette"));
        state.selectedPaletteId = "";
        state.previousSelectedPaletteId = previousSelectedPaletteId || "";
        state.editorMode = "new";
        state.sourceSignature = "";
        state.dirty = true;
        return state;
    }

    function createNativeDuplicateEditorState(palette, previousSelectedPaletteId) {
        var state = createNativeEditorState(palette);
        state.selectedPaletteId = "";
        state.previousSelectedPaletteId = previousSelectedPaletteId || (palette && palette.id) || "";
        state.editorMode = "duplicate";
        state.draft.id = "paletteEditorDraft";
        state.draft.revision = 1;
        state.draft.metadata.origin = "custom";
        state.draft.metadata.displayName += " Copy";
        state.sourceSignature = "";
        state.dirty = true;
        return state;
    }

    function nextSlotSequence(palette) {
        var max = 0;
        (palette && palette.slots || []).forEach(function (slot) {
            var match = /^slot_([0-9]+)$/.exec(slot.id || "");
            if (match) max = Math.max(max, Number(match[1]));
        });
        return max + 1;
    }

    function generateSlotId(state) {
        var used = Object.create(null);
        var sequence;
        var id;
        (state.draft.slots || []).forEach(function (slot) { used[slot.id] = true; });
        do {
            slotIdSequence += 1;
            sequence = Math.max(slotIdSequence, Number(state.nextSlotSequence) || 1);
            slotIdSequence = sequence;
            id = "slot_" + Date.now().toString(36) + "_" + sequence.toString(36);
        } while (used[id]);
        state.nextSlotSequence = sequence + 1;
        return id;
    }

    function derivationDefaults(id) {
        var definition = Derivations && Derivations.get ? Derivations.get(id) : null;
        var values = {};
        if (!definition) return values;
        Object.keys(definition.parameterSchema).forEach(function (name) {
            var field = definition.parameterSchema[name];
            values[name] = field.min <= 0 && field.max >= 0 ? 0 : field.min;
            if (name === "chromaScale") values[name] = 1;
            if (name === "amount") values[name] = 0.5;
        });
        return values;
    }

    function sourceDefaults(draft, slotId, count) {
        var ids = (draft.slots || []).filter(function (slot) { return slot.id !== slotId; }).map(function (slot) { return slot.id; });
        var output = [];
        var i;
        for (i = 0; i < count; i++) output.push(ids[i % Math.max(1, ids.length)] || "");
        return output;
    }

    function payloadForKind(draft, slotId, kind, derivationId) {
        var definition;
        if (kind === "DIRECT") return { kind: kind, value: { color: "#808080" } };
        if (kind === "REFERENCE") return { kind: kind, reference: { slotId: sourceDefaults(draft, slotId, 1)[0] } };
        derivationId = derivationId || "mix.v1";
        definition = Derivations && Derivations.get ? Derivations.get(derivationId) : null;
        return { kind: "DERIVED", derivation: {
            derivationId: derivationId,
            sourceSlotIds: sourceDefaults(draft, slotId, definition ? definition.inputContract.count : 1),
            parameters: derivationDefaults(derivationId)
        } };
    }

    function mutateNativeState(state, mutation) {
        var next = clone(state || {});
        mutation(next.draft, next);
        next.dirty = fullDraftSignature(next.draft) !== next.sourceSignature;
        return next;
    }

    function addNativeSlot(state, kind) {
        return mutateNativeState(state, function (draft, next) {
            var id = generateSlotId(next);
            draft.slots.push(Object.assign({ id: id, label: "New Slot" }, payloadForKind(draft, id, kind || "DIRECT")));
        });
    }

    function updateNativeSlot(state, slotId, patch) {
        return mutateNativeState(state, function (draft) {
            var slot = draft.slots.filter(function (candidate) { return candidate.id === slotId; })[0];
            if (!slot) return;
            if (patch.kind && patch.kind !== slot.kind) {
                Object.keys(slot).forEach(function (key) { if (key !== "id" && key !== "label") delete slot[key]; });
                Object.assign(slot, payloadForKind(draft, slot.id, patch.kind, patch.derivationId));
            }
            Object.keys(patch).forEach(function (key) {
                if (key !== "kind" && key !== "derivationId") slot[key] = clone(patch[key]);
            });
            if (patch.derivationId && slot.kind === "DERIVED") Object.assign(slot, payloadForKind(draft, slot.id, "DERIVED", patch.derivationId));
        });
    }

    function dependentsOf(draft, slotId) {
        return (draft.slots || []).filter(function (slot) {
            return (slot.kind === "REFERENCE" && slot.reference.slotId === slotId) ||
                (slot.kind === "DERIVED" && slot.derivation.sourceSlotIds.indexOf(slotId) >= 0);
        }).map(function (slot) { return { id: slot.id, label: slot.label }; });
    }

    function deleteNativeSlot(state, slotId) {
        var dependents = dependentsOf(state.draft, slotId);
        var boundRoles = [];
        var bindings = state.draft.profiles && state.draft.profiles.proceduralAppearance && state.draft.profiles.proceduralAppearance.bindings;
        if (bindings) Object.keys(bindings).forEach(function (role) { if (bindings[role] === slotId) boundRoles.push(role); });
        if (dependents.length || boundRoles.length || state.draft.slots.length <= 1) return { ok: false, dependents: dependents, boundRoles: boundRoles };
        return { ok: true, state: mutateNativeState(state, function (draft) { draft.slots = draft.slots.filter(function (slot) { return slot.id !== slotId; }); }) };
    }

    function moveNativeSlot(state, slotId, delta) {
        return mutateNativeState(state, function (draft) {
            var index = draft.slots.map(function (slot) { return slot.id; }).indexOf(slotId);
            var target = Math.max(0, Math.min(draft.slots.length - 1, index + delta));
            var slot;
            if (index < 0 || index === target) return;
            slot = draft.slots.splice(index, 1)[0]; draft.slots.splice(target, 0, slot);
        });
    }

    function validateNativeDraft(draft) {
        var model = Model && Model.validatePalette ? Model.validatePalette(draft) : { ok: false, errors: [{ code: "MODEL_UNAVAILABLE" }] };
        var resolved = model.ok && Resolver && Resolver.resolvePalette ? Resolver.resolvePalette(model.palette, { registry: Derivations }) : null;
        return model.ok && resolved && resolved.ok ? { ok: true, palette: model.palette, resolution: resolved, errors: [] } : {
            ok: false,
            errors: model.ok ? [resolved && resolved.error ? resolved.error : { code: "RESOLVER_UNAVAILABLE" }] : model.errors,
            resolution: resolved
        };
    }

    return {
        ROLE_KEYS: ROLE_KEYS.slice(0),
        DEFAULT_LIBRARY_WIDTH: DEFAULT_LIBRARY_WIDTH,
        MIN_LIBRARY_WIDTH: MIN_LIBRARY_WIDTH,
        MAX_LIBRARY_WIDTH: MAX_LIBRARY_WIDTH,
        STACKED_BREAKPOINT: STACKED_BREAKPOINT,
        clone: clone,
        editablePalette: editablePalette,
        draftSignature: draftSignature,
        createEditorState: createEditorState,
        createNewEditorState: createNewEditorState,
        createDuplicateEditorState: createDuplicateEditorState,
        mergeDraftPatch: mergeDraftPatch,
        updateEditorDraft: updateEditorDraft,
        discardEditorDraft: discardEditorDraft,
        clampLibraryWidth: clampLibraryWidth,
        parseLibraryWidth: parseLibraryWidth,
        getWorkspaceLayout: getWorkspaceLayout,
        clampStopValue: clampStopValue,
        weightTotal: weightTotal,
        hasPositiveWeightTotal: hasPositiveWeightTotal
        ,fullDraftSignature: fullDraftSignature
        ,createNativeEditorState: createNativeEditorState
        ,createNativeNewEditorState: createNativeNewEditorState
        ,createNativeDuplicateEditorState: createNativeDuplicateEditorState
        ,createDefaultV2Palette: createDefaultV2Palette
        ,mutateNativeState: mutateNativeState
        ,addNativeSlot: addNativeSlot
        ,updateNativeSlot: updateNativeSlot
        ,deleteNativeSlot: deleteNativeSlot
        ,moveNativeSlot: moveNativeSlot
        ,dependentsOf: dependentsOf
        ,validateNativeDraft: validateNativeDraft
        ,derivationDefinitions: function () { return Derivations && Derivations.list ? Derivations.list() : []; }
    };
}));
