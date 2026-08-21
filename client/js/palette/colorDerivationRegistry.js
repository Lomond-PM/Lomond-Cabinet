(function (root, factory) {
    "use strict";

    var api = Object.freeze(factory());
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root && root.document && !root.ColorDerivationRegistry) {
        root.ColorDerivationRegistry = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    var VERSION = 1;
    var HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;
    var ERROR_CODES = Object.freeze({
        INVALID_DERIVATION: "INVALID_DERIVATION",
        INVALID_PARAMETERS: "INVALID_PARAMETERS",
        INVALID_DIRECT_COLOR: "INVALID_DIRECT_COLOR"
    });

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeHex(value) {
        var match = typeof value === "string" ? HEX_PATTERN.exec(value) : null;
        return match ? "#" + match[1].toUpperCase() : null;
    }

    function channelToHex(value) {
        var hex = clamp(Math.round(value), 0, 255).toString(16).toUpperCase();
        return hex.length < 2 ? "0" + hex : hex;
    }

    function hexToRgb(hex) {
        var normalized = normalizeHex(hex);
        return normalized ? {
            r: parseInt(normalized.slice(1, 3), 16),
            g: parseInt(normalized.slice(3, 5), 16),
            b: parseInt(normalized.slice(5, 7), 16)
        } : null;
    }

    function rgbToHex(rgb) {
        return "#" + channelToHex(rgb.r) + channelToHex(rgb.g) + channelToHex(rgb.b);
    }

    function toLinearByte(value) {
        var channel = clamp(value / 255, 0, 1);
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    }

    function fromLinear(value) {
        var channel = clamp(value, 0, 1);
        channel = channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
        return clamp(channel, 0, 1) * 255;
    }

    function cubeRoot(value) {
        return value < 0 ? -Math.pow(-value, 1 / 3) : Math.pow(value, 1 / 3);
    }

    function rgbToOklab(rgb) {
        var r = toLinearByte(rgb.r);
        var g = toLinearByte(rgb.g);
        var b = toLinearByte(rgb.b);
        var l = cubeRoot(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        var m = cubeRoot(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        var s = cubeRoot(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return {
            l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
        };
    }

    function oklabToLinearRgb(lab) {
        var l = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
        var m = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
        var s = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
        return {
            r: 4.0767416621 * l * l * l - 3.3077115913 * m * m * m + 0.2309699292 * s * s * s,
            g: -1.2684380046 * l * l * l + 2.6097574011 * m * m * m - 0.3413193965 * s * s * s,
            b: -0.0041960863 * l * l * l - 0.7034186147 * m * m * m + 1.707614701 * s * s * s
        };
    }

    function linearRgbToHex(rgb) {
        return rgbToHex({ r: fromLinear(rgb.r), g: fromLinear(rgb.g), b: fromLinear(rgb.b) });
    }

    function inGamut(rgb) {
        var epsilon = 0.0000001;
        return rgb.r >= -epsilon && rgb.r <= 1 + epsilon && rgb.g >= -epsilon && rgb.g <= 1 + epsilon && rgb.b >= -epsilon && rgb.b <= 1 + epsilon;
    }

    function oklchToLab(lightness, chroma, hueRadians) {
        return { l: lightness, a: chroma * Math.cos(hueRadians), b: chroma * Math.sin(hueRadians) };
    }

    function gamutMappedHex(lightness, chroma, hueRadians) {
        var target = oklabToLinearRgb(oklchToLab(lightness, chroma, hueRadians));
        var low;
        var high;
        var middle;
        var i;
        if (inGamut(target)) {
            return linearRgbToHex(target);
        }
        low = 0;
        high = chroma;
        for (i = 0; i < 24; i++) {
            middle = (low + high) / 2;
            if (inGamut(oklabToLinearRgb(oklchToLab(lightness, middle, hueRadians)))) {
                low = middle;
            } else {
                high = middle;
            }
        }
        return linearRgbToHex(oklabToLinearRgb(oklchToLab(lightness, low, hueRadians)));
    }

    function mixLinearSrgb(inputs, parameters) {
        var amount = parameters.amount;
        var left;
        var right;
        if (amount === 0) {
            return normalizeHex(inputs[0]);
        }
        if (amount === 1) {
            return normalizeHex(inputs[1]);
        }
        left = hexToRgb(inputs[0]);
        right = hexToRgb(inputs[1]);
        return linearRgbToHex({
            r: toLinearByte(left.r) + (toLinearByte(right.r) - toLinearByte(left.r)) * amount,
            g: toLinearByte(left.g) + (toLinearByte(right.g) - toLinearByte(left.g)) * amount,
            b: toLinearByte(left.b) + (toLinearByte(right.b) - toLinearByte(left.b)) * amount
        });
    }

    function adjustOklch(inputs, parameters) {
        var source = normalizeHex(inputs[0]);
        var lab;
        var sourceChroma;
        var sourceHue;
        var hueDelta = ((parameters.hueDelta % 360) + 360) % 360;
        var lightness;
        var chroma;
        var hue;
        if (hueDelta === 0 && parameters.lightnessDelta === 0 && parameters.chromaScale === 1) {
            return source;
        }
        lab = rgbToOklab(hexToRgb(source));
        sourceChroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        sourceHue = sourceChroma < 0.000000000001 ? 0 : Math.atan2(lab.b, lab.a);
        lightness = clamp(lab.l + parameters.lightnessDelta, 0, 1);
        chroma = clamp(sourceChroma * parameters.chromaScale, 0, 0.4);
        hue = sourceHue + hueDelta * Math.PI / 180;
        return gamutMappedHex(lightness, chroma, hue);
    }

    var DEFAULT_DEFINITIONS = Object.freeze([
        Object.freeze({
            id: "mix.v1",
            inputContract: Object.freeze({ type: "color", count: 2 }),
            parameterSchema: Object.freeze({
                amount: Object.freeze({ type: "number", min: 0, max: 1, required: true })
            }),
            outputContract: Object.freeze({ type: "color", format: "#RRGGBB", colorSpace: "linear-sRGB" }),
            resolve: mixLinearSrgb
        }),
        Object.freeze({
            id: "oklchAdjust.v1",
            inputContract: Object.freeze({ type: "color", count: 1 }),
            parameterSchema: Object.freeze({
                hueDelta: Object.freeze({ type: "number", min: -3600, max: 3600, required: true, unit: "degree" }),
                lightnessDelta: Object.freeze({ type: "number", min: -1, max: 1, required: true }),
                chromaScale: Object.freeze({ type: "number", min: 0, max: 4, required: true })
            }),
            outputContract: Object.freeze({ type: "color", format: "#RRGGBB", colorSpace: "sRGB" }),
            resolve: adjustOklch
        })
    ]);

    function validateParameters(schema, parameters) {
        var values = parameters && typeof parameters === "object" && !Array.isArray(parameters) ? parameters : null;
        var keys = Object.keys(schema);
        var supplied;
        var i;
        var name;
        var contract;
        var value;
        if (!values) {
            return false;
        }
        supplied = Object.keys(values);
        if (supplied.some(function (key) { return !Object.prototype.hasOwnProperty.call(schema, key); })) {
            return false;
        }
        for (i = 0; i < keys.length; i++) {
            name = keys[i];
            contract = schema[name];
            value = values[name];
            if (contract.required && !Object.prototype.hasOwnProperty.call(values, name)) {
                return false;
            }
            if (contract.type === "number" && (typeof value !== "number" || !isFinite(value) || value < contract.min || value > contract.max)) {
                return false;
            }
        }
        return true;
    }

    function createRegistry(definitions) {
        var entries = Object.create(null);
        var list = [];
        (definitions || DEFAULT_DEFINITIONS).forEach(function (entry) {
            var parameterSchema = {};
            var copy;
            if (!entry || typeof entry.id !== "string" || entries[entry.id] || !entry.inputContract || !entry.parameterSchema || !entry.outputContract || typeof entry.resolve !== "function") {
                throw new Error("Invalid color derivation registry entry.");
            }
            Object.keys(entry.parameterSchema).forEach(function (key) {
                parameterSchema[key] = Object.freeze(Object.assign({}, entry.parameterSchema[key]));
            });
            copy = Object.freeze({
                id: entry.id,
                inputContract: Object.freeze(Object.assign({}, entry.inputContract)),
                parameterSchema: Object.freeze(parameterSchema),
                outputContract: Object.freeze(Object.assign({}, entry.outputContract)),
                resolve: entry.resolve
            });
            entries[copy.id] = copy;
            list.push(copy);
        });
        list = Object.freeze(list);
        return Object.freeze({
            version: VERSION,
            list: function () { return list.slice(0); },
            get: function (id) { return entries[id] || null; },
            resolve: function (id, inputs, parameters) {
                var entry = entries[id];
                var normalizedInputs;
                var output;
                if (!entry) {
                    return { ok: false, error: { code: ERROR_CODES.INVALID_DERIVATION, derivationId: id } };
                }
                if (!Array.isArray(inputs) || inputs.length !== entry.inputContract.count) {
                    return { ok: false, error: { code: ERROR_CODES.INVALID_PARAMETERS, derivationId: id, reason: "INPUT_CONTRACT" } };
                }
                normalizedInputs = inputs.map(normalizeHex);
                if (normalizedInputs.some(function (color) { return !color; })) {
                    return { ok: false, error: { code: ERROR_CODES.INVALID_DIRECT_COLOR, derivationId: id } };
                }
                if (!validateParameters(entry.parameterSchema, parameters)) {
                    return { ok: false, error: { code: ERROR_CODES.INVALID_PARAMETERS, derivationId: id, reason: "PARAMETER_SCHEMA" } };
                }
                try {
                    output = normalizeHex(entry.resolve(normalizedInputs.slice(0), Object.assign({}, parameters)));
                } catch (exception) {
                    return { ok: false, error: { code: ERROR_CODES.INVALID_DERIVATION, derivationId: id, reason: "RESOLVER_EXCEPTION" } };
                }
                if (!output) {
                    return { ok: false, error: { code: ERROR_CODES.INVALID_DERIVATION, derivationId: id, reason: "INVALID_OUTPUT" } };
                }
                return { ok: true, value: output };
            }
        });
    }

    var defaultRegistry = createRegistry(DEFAULT_DEFINITIONS);

    return {
        version: VERSION,
        errorCodes: ERROR_CODES,
        definitions: DEFAULT_DEFINITIONS,
        createRegistry: createRegistry,
        list: defaultRegistry.list,
        get: defaultRegistry.get,
        resolve: defaultRegistry.resolve,
        normalizeHex: normalizeHex
    };
}));
