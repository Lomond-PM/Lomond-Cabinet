(function (root, factory) {
    "use strict";

    var model = typeof module !== "undefined" && module.exports ? require("./paletteModel.js") : root.PaletteModel;
    var api = Object.freeze(factory(model));
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root && root.document && !root.PaletteResolver) {
        root.PaletteResolver = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (PaletteModel) {
    "use strict";

    var ERROR_CODES = Object.freeze({
        MISSING_SLOT: "MISSING_SLOT",
        SELF_REFERENCE: "SELF_REFERENCE",
        DEPENDENCY_CYCLE: "DEPENDENCY_CYCLE",
        INVALID_DERIVATION: "INVALID_DERIVATION",
        INVALID_PARAMETERS: "INVALID_PARAMETERS",
        INVALID_DIRECT_COLOR: "INVALID_DIRECT_COLOR",
        UNRESOLVED_SOURCE: "UNRESOLVED_SOURCE",
        DUPLICATE_SLOT_ID: "DUPLICATE_SLOT_ID",
        INVALID_PALETTE: "INVALID_PALETTE",
        INVALID_METADATA: "INVALID_METADATA",
        INVALID_SLOT_KIND: "INVALID_SLOT_KIND",
        INVALID_SLOT_PAYLOAD: "INVALID_SLOT_PAYLOAD",
        INVALID_REFERENCE: "INVALID_REFERENCE",
        INVALID_DERIVATION_SHAPE: "INVALID_DERIVATION_SHAPE",
        INVALID_PROFILE_BINDING: "INVALID_PROFILE_BINDING"
    });

    function failure(code, properties) {
        var error = { code: code };
        var key;
        properties = properties || {};
        for (key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                error[key] = properties[key];
            }
        }
        return { ok: false, error: error };
    }

    function schemaFailure(validation) {
        var first = validation && validation.errors && validation.errors[0];
        return failure(first && first.code ? first.code : ERROR_CODES.INVALID_PALETTE, {
            path: first ? first.path : "",
            validationErrors: validation && validation.errors ? validation.errors.slice(0) : []
        });
    }

    function createContext(palette, registry) {
        var slots = Object.create(null);
        var states = Object.create(null);
        var colors = Object.create(null);
        palette.slots.forEach(function (slot) {
            slots[slot.id] = slot;
            states[slot.id] = "unvisited";
        });
        return { palette: palette, registry: registry, slots: slots, states: states, colors: colors, stack: [] };
    }

    function dependencyFailure(ownerSlotId, sourceSlotId, result) {
        var code = result && result.error ? result.error.code : ERROR_CODES.UNRESOLVED_SOURCE;
        if (code === ERROR_CODES.MISSING_SLOT || code === ERROR_CODES.SELF_REFERENCE || code === ERROR_CODES.DEPENDENCY_CYCLE) {
            return result;
        }
        return failure(ERROR_CODES.UNRESOLVED_SOURCE, {
            slotId: ownerSlotId,
            sourceSlotId: sourceSlotId,
            cause: result && result.error ? result.error : null
        });
    }

    function resolveSlotInContext(context, slotId) {
        var slot = context.slots[slotId];
        var targetId;
        var sourceIds;
        var inputs;
        var sourceResult;
        var derivationResult;
        var i;
        if (!slot) {
            return failure(ERROR_CODES.MISSING_SLOT, { paletteId: context.palette.id, slotId: slotId });
        }
        if (context.states[slotId] === "resolved") {
            return { ok: true, value: context.colors[slotId] };
        }
        if (context.states[slotId] === "visiting") {
            return failure(ERROR_CODES.DEPENDENCY_CYCLE, {
                paletteId: context.palette.id,
                slotId: slotId,
                dependencyPath: context.stack.concat([slotId])
            });
        }

        context.states[slotId] = "visiting";
        context.stack.push(slotId);

        if (slot.kind === PaletteModel.slotKinds.DIRECT) {
            context.colors[slotId] = PaletteModel.normalizeHex(slot.value.color);
            context.states[slotId] = "resolved";
            context.stack.pop();
            return { ok: true, value: context.colors[slotId] };
        }

        if (slot.kind === PaletteModel.slotKinds.REFERENCE) {
            targetId = slot.reference.slotId;
            if (targetId === slotId) {
                context.states[slotId] = "unvisited";
                context.stack.pop();
                return failure(ERROR_CODES.SELF_REFERENCE, { paletteId: context.palette.id, slotId: slotId });
            }
            sourceResult = resolveSlotInContext(context, targetId);
            if (!sourceResult.ok) {
                context.states[slotId] = "unvisited";
                context.stack.pop();
                return dependencyFailure(slotId, targetId, sourceResult);
            }
            context.colors[slotId] = sourceResult.value;
            context.states[slotId] = "resolved";
            context.stack.pop();
            return { ok: true, value: sourceResult.value };
        }

        sourceIds = slot.derivation.sourceSlotIds;
        inputs = [];
        for (i = 0; i < sourceIds.length; i++) {
            if (sourceIds[i] === slotId) {
                context.states[slotId] = "unvisited";
                context.stack.pop();
                return failure(ERROR_CODES.SELF_REFERENCE, { paletteId: context.palette.id, slotId: slotId });
            }
            sourceResult = resolveSlotInContext(context, sourceIds[i]);
            if (!sourceResult.ok) {
                context.states[slotId] = "unvisited";
                context.stack.pop();
                return dependencyFailure(slotId, sourceIds[i], sourceResult);
            }
            inputs.push(sourceResult.value);
        }
        if (!context.registry || typeof context.registry.resolve !== "function") {
            context.states[slotId] = "unvisited";
            context.stack.pop();
            return failure(ERROR_CODES.INVALID_DERIVATION, { slotId: slotId, derivationId: slot.derivation.derivationId });
        }
        derivationResult = context.registry.resolve(slot.derivation.derivationId, inputs, slot.derivation.parameters);
        if (!derivationResult || !derivationResult.ok) {
            context.states[slotId] = "unvisited";
            context.stack.pop();
            return failure(derivationResult && derivationResult.error && derivationResult.error.code ? derivationResult.error.code : ERROR_CODES.INVALID_DERIVATION, {
                slotId: slotId,
                derivationId: slot.derivation.derivationId,
                derivationError: derivationResult && derivationResult.error ? derivationResult.error : null
            });
        }
        context.colors[slotId] = PaletteModel.normalizeHex(derivationResult.value);
        if (!context.colors[slotId]) {
            context.states[slotId] = "unvisited";
            context.stack.pop();
            return failure(ERROR_CODES.INVALID_DERIVATION, { slotId: slotId, derivationId: slot.derivation.derivationId, reason: "INVALID_OUTPUT" });
        }
        context.states[slotId] = "resolved";
        context.stack.pop();
        return { ok: true, value: context.colors[slotId] };
    }

    function prepare(palette, registry) {
        var validation;
        if (!PaletteModel || typeof PaletteModel.validatePalette !== "function") {
            return failure(ERROR_CODES.INVALID_PALETTE, { reason: "MODEL_UNAVAILABLE" });
        }
        validation = PaletteModel.validatePalette(palette);
        if (!validation.ok) {
            return schemaFailure(validation);
        }
        return { ok: true, context: createContext(validation.palette, registry) };
    }

    function resolvePalette(palette, options) {
        var prepared = prepare(palette, options && options.registry);
        var context;
        var order;
        var i;
        var result;
        if (!prepared.ok) {
            return prepared;
        }
        context = prepared.context;
        order = context.palette.slots.map(function (slot) { return slot.id; });
        for (i = 0; i < order.length; i++) {
            result = resolveSlotInContext(context, order[i]);
            if (!result.ok) {
                return result;
            }
        }
        return {
            ok: true,
            paletteId: context.palette.id,
            revision: context.palette.revision,
            order: order.slice(0),
            colors: PaletteModel.clone(context.colors)
        };
    }

    function resolveSlot(palette, slotId, options) {
        var prepared = prepare(palette, options && options.registry);
        var result;
        if (!prepared.ok) {
            return prepared;
        }
        result = resolveSlotInContext(prepared.context, slotId);
        return result.ok ? { ok: true, paletteId: prepared.context.palette.id, slotId: slotId, value: result.value } : result;
    }

    return {
        errorCodes: ERROR_CODES,
        resolvePalette: resolvePalette,
        resolveSlot: resolveSlot
    };
}));
