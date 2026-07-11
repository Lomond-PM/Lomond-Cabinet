(function (root, factory) {
    "use strict";

    var api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralPaletteLibrary = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    var ALGORITHM_DEFAULT_ID = "algorithmDefault";
    var PALETTES = [
        {
            id: "pacificCyan",
            version: 1,
            family: "coolLuminous",
            colors: {
                shadow: "#102936",
                base: "#26728D",
                secondary: "#69B9CC",
                highlight: "#D8F7FF"
            },
            stops: [0, 0.32, 0.70, 1],
            weights: {
                shadow: 0.26,
                base: 0.50,
                secondary: 0.16,
                highlight: 0.08
            }
        },
        {
            id: "blueLavender",
            version: 1,
            family: "coolElegant",
            colors: {
                shadow: "#20243E",
                base: "#53659B",
                secondary: "#9A8BC2",
                highlight: "#F0E8FF"
            },
            stops: [0, 0.34, 0.73, 1],
            weights: {
                shadow: 0.25,
                base: 0.49,
                secondary: 0.18,
                highlight: 0.08
            }
        },
        {
            id: "tealLuminous",
            version: 1,
            family: "coolLuminous",
            colors: {
                shadow: "#073038",
                base: "#087D87",
                secondary: "#44C5C7",
                highlight: "#D5FFFB"
            },
            stops: [0, 0.36, 0.76, 1],
            weights: {
                shadow: 0.28,
                base: 0.49,
                secondary: 0.16,
                highlight: 0.07
            }
        },
        {
            id: "mossGold",
            version: 1,
            family: "warmRestrained",
            colors: {
                shadow: "#29301F",
                base: "#667548",
                secondary: "#B19A61",
                highlight: "#F1E1AE"
            },
            stops: [0, 0.38, 0.76, 1],
            weights: {
                shadow: 0.30,
                base: 0.50,
                secondary: 0.13,
                highlight: 0.07
            }
        },
        {
            id: "plumRose",
            version: 1,
            family: "warmElegant",
            colors: {
                shadow: "#321F38",
                base: "#735678",
                secondary: "#B482A8",
                highlight: "#F5DDEC"
            },
            stops: [0, 0.35, 0.74, 1],
            weights: {
                shadow: 0.27,
                base: 0.51,
                secondary: 0.15,
                highlight: 0.07
            }
        },
        {
            id: "slateIce",
            version: 1,
            family: "coolRestrained",
            colors: {
                shadow: "#172832",
                base: "#436A7D",
                secondary: "#8DB6C8",
                highlight: "#E3F6FF"
            },
            stops: [0, 0.33, 0.72, 1],
            weights: {
                shadow: 0.29,
                base: 0.50,
                secondary: 0.14,
                highlight: 0.07
            }
        },
        {
            id: "warmCoral",
            version: 1,
            family: "warmLuminous",
            colors: {
                shadow: "#402127",
                base: "#A54F59",
                secondary: "#E28A79",
                highlight: "#FFE0C5"
            },
            stops: [0, 0.36, 0.77, 1],
            weights: {
                shadow: 0.28,
                base: 0.50,
                secondary: 0.15,
                highlight: 0.07
            }
        },
        {
            id: "graphiteSilver",
            version: 1,
            family: "neutralRestrained",
            colors: {
                shadow: "#151C24",
                base: "#3D5262",
                secondary: "#829EAE",
                highlight: "#E2EDF2"
            },
            stops: [0, 0.36, 0.74, 1],
            weights: {
                shadow: 0.31,
                base: 0.49,
                secondary: 0.13,
                highlight: 0.07
            }
        }
    ];
    var paletteById = {};

    function clone(value) {
        if (value === null || typeof value !== "object") {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(clone);
        }
        var copy = {};
        Object.keys(value).forEach(function (key) {
            copy[key] = clone(value[key]);
        });
        return copy;
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

    function hashString(input) {
        var str = String(input || "");
        var hash = 2166136261;
        var i;
        for (i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    function isHex(value) {
        return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
    }

    function isFiniteNumber(value) {
        return typeof isFinite === "function" && isFinite(Number(value));
    }

    function validatePalette(palette) {
        var errors = [];
        var stops;
        var weights;
        var weightTotal = 0;
        var roles = ["shadow", "base", "secondary", "highlight"];
        var i;

        if (!palette || typeof palette !== "object") {
            return { ok: false, errors: ["Palette must be an object."], signature: "" };
        }
        if (!palette.id || typeof palette.id !== "string") {
            errors.push("Palette id must be a stable string.");
        }
        if (!isFiniteNumber(palette.version) || Number(palette.version) < 1 || Math.floor(Number(palette.version)) !== Number(palette.version)) {
            errors.push("Palette version must be a positive integer.");
        }
        if (!palette.family || typeof palette.family !== "string") {
            errors.push("Palette family must be a stable string.");
        }
        if (!palette.colors || typeof palette.colors !== "object") {
            errors.push("Palette colors are missing.");
        } else {
            roles.forEach(function (role) {
                if (!isHex(palette.colors[role])) {
                    errors.push("Palette color " + role + " must be #RRGGBB.");
                }
            });
        }
        stops = palette.stops;
        if (!Array.isArray(stops) || stops.length !== 4) {
            errors.push("Palette stops must contain four values.");
        } else {
            for (i = 0; i < stops.length; i++) {
                if (!isFiniteNumber(stops[i]) || Number(stops[i]) < 0 || Number(stops[i]) > 1) {
                    errors.push("Palette stop " + i + " must be in 0-1.");
                }
                if (i > 0 && Number(stops[i]) <= Number(stops[i - 1])) {
                    errors.push("Palette stops must be strictly increasing.");
                }
            }
        }
        weights = palette.weights;
        if (!weights || typeof weights !== "object") {
            errors.push("Palette weights are missing.");
        } else {
            roles.forEach(function (role) {
                var value = Number(weights[role]);
                if (!isFiniteNumber(value) || value < 0) {
                    errors.push("Palette weight " + role + " must be finite and non-negative.");
                } else {
                    weightTotal += value;
                }
            });
            if (Math.abs(weightTotal - 1) > 0.001) {
                errors.push("Palette weights must sum to 1.");
            }
        }
        return {
            ok: errors.length === 0,
            errors: errors,
            signature: errors.length ? "" : createPaletteSignature(palette)
        };
    }

    function signaturePayload(palette) {
        var payload = {
            id: palette.id,
            version: palette.version,
            family: palette.family,
            colors: {
                shadow: String(palette.colors.shadow).toUpperCase(),
                base: String(palette.colors.base).toUpperCase(),
                secondary: String(palette.colors.secondary).toUpperCase(),
                highlight: String(palette.colors.highlight).toUpperCase()
            },
            stops: palette.stops.map(function (value) {
                return Number(value);
            }),
            weights: {
                shadow: Number(palette.weights.shadow),
                base: Number(palette.weights.base),
                secondary: Number(palette.weights.secondary),
                highlight: Number(palette.weights.highlight)
            }
        };
        ["saturationBias", "luminanceBias", "contrastBias"].forEach(function (key) {
            if (typeof palette[key] !== "undefined") {
                payload[key] = Number(palette[key]);
            }
        });
        return payload;
    }

    function createPaletteSignature(palette) {
        var payload = signaturePayload(palette);
        return payload.id + "@v" + payload.version + ":" + hashString(stableStringify(payload));
    }

    function getPalette(id) {
        var palette = paletteById[String(id || "")];
        return palette ? clone(palette) : null;
    }

    function hasPalette(id) {
        return !!paletteById[String(id || "")];
    }

    function listPalettes() {
        return PALETTES.map(clone);
    }

    function getPaletteSignature(id) {
        var palette = paletteById[String(id || "")];
        return palette ? createPaletteSignature(palette) : "";
    }

    function getDefaultPaletteId() {
        return ALGORITHM_DEFAULT_ID;
    }

    PALETTES.forEach(function (palette) {
        paletteById[palette.id] = clone(palette);
    });

    return {
        getPalette: getPalette,
        hasPalette: hasPalette,
        listPalettes: listPalettes,
        getPaletteSignature: getPaletteSignature,
        getDefaultPaletteId: getDefaultPaletteId,
        validatePalette: validatePalette
    };
}));
