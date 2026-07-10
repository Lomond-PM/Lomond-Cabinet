(function (root, factory) {
    "use strict";

    var api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralPreviewContract = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    function getToolSections(toolDef) {
        if (toolDef && toolDef.sections && toolDef.sections.length) {
            return toolDef.sections;
        }
        if (toolDef && toolDef.uiSchema && toolDef.uiSchema.length) {
            return [
                {
                    id: "parameters",
                    fields: toolDef.uiSchema
                }
            ];
        }
        return [];
    }

    function findProceduralPreviewField(toolDef) {
        var sections = getToolSections(toolDef);
        var i;
        var j;
        var fields;
        for (i = 0; i < sections.length; i++) {
            fields = sections[i] && sections[i].fields ? sections[i].fields : [];
            for (j = 0; j < fields.length; j++) {
                if (fields[j] && fields[j].type === "proceduralPreview") {
                    return fields[j];
                }
            }
        }
        return null;
    }

    function uniqueStrings(values) {
        var out = [];
        var seen = {};
        var i;
        var value;
        for (i = 0; values && i < values.length; i++) {
            value = values[i];
            if (typeof value !== "string" || !value || seen[value]) {
                continue;
            }
            seen[value] = true;
            out[out.length] = value;
        }
        return out;
    }

    function getProceduralPreviewDependencies(field) {
        var deps = [];
        if (!field || field.type !== "proceduralPreview") {
            return [];
        }
        deps[deps.length] = field.targetKey;
        deps[deps.length] = field.seedKey;
        return uniqueStrings(deps.concat(field.parameterKeys || []));
    }

    function shouldRefreshProceduralPreview(field, changedKey) {
        var deps;
        var i;
        if (!field || field.type !== "proceduralPreview") {
            return false;
        }
        if (!changedKey) {
            return true;
        }
        deps = getProceduralPreviewDependencies(field);
        for (i = 0; i < deps.length; i++) {
            if (deps[i] === changedKey) {
                return true;
            }
        }
        return false;
    }

    function normalizeTarget(target) {
        return target === "background" || target === "icon" ? target : "";
    }

    function extractProceduralPreviewInput(field, values) {
        var source = values || {};
        var engine = field && field.engine ? String(field.engine) : "proceduralAppearance";
        var targetKey = field && field.targetKey;
        var seedKey = field && field.seedKey;
        var parameterKeys = uniqueStrings(field && field.parameterKeys ? field.parameterKeys : []);
        var params = {};
        var i;
        var key;
        var seed;
        var target;

        if (!field || field.type !== "proceduralPreview") {
            return {
                ok: false,
                errorCode: "NO_PREVIEW_FIELD",
                message: "Missing proceduralPreview field."
            };
        }
        if (!targetKey || !seedKey) {
            return {
                ok: false,
                engine: engine,
                errorCode: "MISSING_CONTRACT_KEYS",
                message: "proceduralPreview requires targetKey and seedKey."
            };
        }

        seed = source[seedKey];
        seed = typeof seed === "undefined" || seed === null ? "" : String(seed).trim();
        target = normalizeTarget(source[targetKey]);

        if (!seed) {
            return {
                ok: false,
                engine: engine,
                errorCode: "INVALID_SEED",
                message: "proceduralPreview seed is empty."
            };
        }
        if (!target) {
            return {
                ok: false,
                engine: engine,
                errorCode: "INVALID_TARGET",
                message: "proceduralPreview target must be icon or background."
            };
        }

        for (i = 0; i < parameterKeys.length; i++) {
            key = parameterKeys[i];
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                params[key] = source[key];
            }
        }

        return {
            ok: true,
            engine: engine,
            target: target,
            seed: seed,
            params: params,
            dependencies: getProceduralPreviewDependencies(field)
        };
    }

    return {
        findProceduralPreviewField: findProceduralPreviewField,
        getProceduralPreviewDependencies: getProceduralPreviewDependencies,
        extractProceduralPreviewInput: extractProceduralPreviewInput,
        shouldRefreshProceduralPreview: shouldRefreshProceduralPreview
    };
}));
