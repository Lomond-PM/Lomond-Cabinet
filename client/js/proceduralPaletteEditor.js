/*
 * Palette editor UI state and layout helpers.
 * Keeps draft state independent from the persistent Palette Store.
 */
(function (root, factory) {
    "use strict";
    var api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralPaletteEditor = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    var ROLE_KEYS = ["shadow", "base", "secondary", "highlight"];
    var DEFAULT_LIBRARY_WIDTH = 210;
    var MIN_LIBRARY_WIDTH = 150;
    var MAX_LIBRARY_WIDTH = 340;
    var STACKED_BREAKPOINT = 620;

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
    };
}));
