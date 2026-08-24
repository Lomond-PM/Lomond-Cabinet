"use strict";

const path = require("path");
const root = path.resolve(__dirname, "..");
const registry = require(path.join(root, "client", "js", "palette", "colorDerivationRegistry.js"));

let assertions = 0;

function assert(condition, message) {
    assertions += 1;
    if (!condition) throw new Error(message);
}

function resolve(id, inputs, parameters) {
    return registry.resolve(id, inputs, parameters);
}

assert(registry.version === 1, "Derivation Registry version must be stable.");
assert(registry.list().length === 2, "Foundation Registry must expose exactly two derivations.");
assert(registry.get("mix.v1").inputContract.count === 2, "mix.v1 must declare two color inputs.");
assert(registry.get("oklchAdjust.v1").inputContract.count === 1, "oklchAdjust.v1 must declare one color input.");
assert(registry.get("mix.v1").outputContract.colorSpace === "linear-sRGB", "mix.v1 must declare linear-sRGB mixing.");
const registrySnapshot = registry.createRegistry(registry.definitions);
const listedEntry = registrySnapshot.list()[0];
assert(Object.isFrozen(listedEntry) && Object.isFrozen(listedEntry.parameterSchema), "Registry contracts must be immutable snapshots.");

let result = resolve("mix.v1", ["#000000", "#FFFFFF"], { amount: 0 });
assert(result.ok && result.value === "#000000", "mix amount 0 must return the normalized first endpoint.");
result = resolve("mix.v1", ["#000000", "#ffffff"], { amount: 1 });
assert(result.ok && result.value === "#FFFFFF", "mix amount 1 must return the normalized second endpoint.");
result = resolve("mix.v1", ["#000000", "#FFFFFF"], { amount: 0.5 });
assert(result.ok && result.value === "#BCBCBC", "mix midpoint must use deterministic linear-sRGB interpolation and nearest-byte rounding.");
assert(JSON.stringify(resolve("mix.v1", ["#123456", "#ABCDEF"], { amount: 0.375 })) === JSON.stringify(resolve("mix.v1", ["#123456", "#ABCDEF"], { amount: 0.375 })), "Identical mix input must be byte-stable.");
assert(resolve("mix.v1", ["#000000", "#FFFFFF"], { amount: -0.1 }).error.code === "INVALID_PARAMETERS", "mix amount below zero must fail.");
assert(resolve("mix.v1", ["#000000", "#FFFFFF"], { amount: 1.1 }).error.code === "INVALID_PARAMETERS", "mix amount above one must fail.");
assert(resolve("mix.v1", ["#000000", "#FFFFFF"], { amount: "0.5" }).error.code === "INVALID_PARAMETERS", "mix amount must be a typed number.");
assert(resolve("mix.v1", ["#000000", "#FFFFFF"], { amount: NaN }).error.code === "INVALID_PARAMETERS", "mix amount must be finite.");
assert(resolve("mix.v1", ["#000000", "bad"], { amount: 0.5 }).error.code === "INVALID_DIRECT_COLOR", "mix invalid color input must fail closed.");
assert(resolve("missing.v1", ["#000000"], {}).error.code === "INVALID_DERIVATION", "Missing derivation must fail closed.");

const zero = { hueDelta: 0, lightnessDelta: 0, chromaScale: 1 };
result = resolve("oklchAdjust.v1", ["#1a2b3c"], zero);
assert(result.ok && result.value === "#1A2B3C", "Zero OKLCH adjustment must preserve normalized input exactly.");
const wrapPositive = resolve("oklchAdjust.v1", ["#4A7FC1"], { hueDelta: 360, lightnessDelta: 0, chromaScale: 1 });
const wrapNegative = resolve("oklchAdjust.v1", ["#4A7FC1"], { hueDelta: -360, lightnessDelta: 0, chromaScale: 1 });
assert(wrapPositive.ok && wrapPositive.value === "#4A7FC1", "Positive full hue rotation must wrap exactly.");
assert(wrapNegative.ok && wrapNegative.value === "#4A7FC1", "Negative full hue rotation must wrap exactly.");
const hueShift = resolve("oklchAdjust.v1", ["#E05040"], { hueDelta: 120, lightnessDelta: 0, chromaScale: 1 });
assert(hueShift.ok && /^#[0-9A-F]{6}$/.test(hueShift.value) && hueShift.value !== "#E05040", "Hue adjustment must return a normalized changed color.");
const whiteClamp = resolve("oklchAdjust.v1", ["#224466"], { hueDelta: 0, lightnessDelta: 1, chromaScale: 1 });
const blackClamp = resolve("oklchAdjust.v1", ["#AACCEE"], { hueDelta: 0, lightnessDelta: -1, chromaScale: 1 });
assert(whiteClamp.ok && whiteClamp.value === "#FFFFFF", "Lightness must clamp at one.");
assert(blackClamp.ok && blackClamp.value === "#000000", "Lightness must clamp at zero.");
const achromatic = resolve("oklchAdjust.v1", ["#E05040"], { hueDelta: 0, lightnessDelta: 0, chromaScale: 0 });
assert(achromatic.ok && /^#[0-9A-F]{6}$/.test(achromatic.value), "Zero chroma scale must produce a valid in-gamut color.");
const highChroma = resolve("oklchAdjust.v1", ["#7F60A0"], { hueDelta: 45, lightnessDelta: 0.1, chromaScale: 4 });
assert(highChroma.ok && /^#[0-9A-F]{6}$/.test(highChroma.value), "High bounded chroma must be deterministically gamut mapped.");
assert(JSON.stringify(highChroma) === JSON.stringify(resolve("oklchAdjust.v1", ["#7F60A0"], { hueDelta: 45, lightnessDelta: 0.1, chromaScale: 4 })), "OKLCH gamut mapping must be byte-stable.");
assert(resolve("oklchAdjust.v1", ["#123456"], { hueDelta: Infinity, lightnessDelta: 0, chromaScale: 1 }).error.code === "INVALID_PARAMETERS", "Infinite hueDelta must fail.");
assert(resolve("oklchAdjust.v1", ["#123456"], { hueDelta: 0, lightnessDelta: "0", chromaScale: 1 }).error.code === "INVALID_PARAMETERS", "lightnessDelta must be a typed number.");
assert(resolve("oklchAdjust.v1", ["#123456"], { hueDelta: 0, lightnessDelta: 0, chromaScale: -1 }).error.code === "INVALID_PARAMETERS", "Negative chromaScale must fail.");
assert(resolve("oklchAdjust.v1", ["#123456"], { hueDelta: 0, lightnessDelta: 0, chromaScale: 1, extra: 1 }).error.code === "INVALID_PARAMETERS", "Unknown derivation parameters must fail strict validation.");

console.log(`PASS color derivation registry: ${assertions} assertions.`);
