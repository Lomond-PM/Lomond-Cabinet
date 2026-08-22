"use strict";

const path = require("path");
const root = path.resolve(__dirname, "..");
const resolver = require(path.join(root, "client", "js", "palette", "paletteResolver.js"));
const registry = require(path.join(root, "client", "js", "palette", "colorDerivationRegistry.js"));

let assertions = 0;

function assert(condition, message) {
    assertions += 1;
    if (!condition) throw new Error(message);
}

function direct(id, color) {
    return { id, label: id, kind: "DIRECT", value: { color } };
}

function reference(id, target) {
    return { id, label: id, kind: "REFERENCE", reference: { slotId: target } };
}

function derived(id, derivationId, sources, parameters) {
    return { id, label: id, kind: "DERIVED", derivation: { derivationId, sourceSlotIds: sources, parameters } };
}

function palette(slots) {
    return {
        id: "resolverPalette",
        revision: 1,
        metadata: { displayName: "Resolver Palette", family: "test", origin: "custom" },
        slots
    };
}

function resolve(value, selectedRegistry) {
    return resolver.resolvePalette(value, { registry: selectedRegistry || registry });
}

let source = palette([direct("a", "#102030")]);
let result = resolve(source);
assert(result.ok && result.colors.a === "#102030", "DIRECT slot must resolve.");

source = palette([reference("b", "a"), direct("a", "#204060")]);
result = resolve(source);
assert(result.ok && result.colors.b === "#204060", "One-hop REFERENCE must resolve independent of array order.");
source = palette([reference("c", "b"), reference("b", "a"), direct("a", "#305070")]);
result = resolve(source);
assert(result.ok && result.colors.c === "#305070", "Multi-hop REFERENCE must resolve.");
source = palette([reference("a", "missing")]);
result = resolve(source);
assert(!result.ok && result.error.code === "MISSING_SLOT", "Missing REFERENCE dependency must fail with MISSING_SLOT.");
source = palette([reference("a", "a")]);
result = resolve(source);
assert(!result.ok && result.error.code === "SELF_REFERENCE", "Self REFERENCE must fail with SELF_REFERENCE.");
source = palette([reference("a", "b"), reference("b", "c"), reference("c", "a")]);
result = resolve(source);
assert(!result.ok && result.error.code === "DEPENDENCY_CYCLE", "Reference cycle must fail with DEPENDENCY_CYCLE.");
assert(result.error.dependencyPath.join(",") === "a,b,c,a", "Cycle error must include deterministic dependency path.");
source = palette([
    derived("a", "oklchAdjust.v1", ["b"], { hueDelta: 0, lightnessDelta: 0, chromaScale: 1 }),
    reference("b", "a")
]);
result = resolve(source);
assert(!result.ok && result.error.code === "DEPENDENCY_CYCLE", "Mixed DERIVED/REFERENCE cycle must fail with DEPENDENCY_CYCLE.");

source = palette([
    derived("lighter", "oklchAdjust.v1", ["base"], { hueDelta: 0, lightnessDelta: 0.1, chromaScale: 1 }),
    direct("base", "#406080")
]);
result = resolve(source);
assert(result.ok && result.colors.lighter !== result.colors.base, "One-source DERIVED slot must resolve.");
source = palette([
    derived("mix", "mix.v1", ["a", "b"], { amount: 0.5 }),
    direct("a", "#000000"),
    direct("b", "#FFFFFF")
]);
result = resolve(source);
assert(result.ok && result.colors.mix === "#BCBCBC", "Multi-source DERIVED slot must resolve.");
source = palette([
    derived("mix", "mix.v1", ["alias", "b"], { amount: 0.5 }),
    reference("alias", "a"),
    direct("a", "#000000"),
    direct("b", "#FFFFFF")
]);
result = resolve(source);
assert(result.ok && result.colors.mix === "#BCBCBC", "DERIVED slot depending on REFERENCE must resolve.");
source = palette([
    reference("alias", "mix"),
    derived("mix", "mix.v1", ["a", "b"], { amount: 0.25 }),
    direct("a", "#102030"),
    direct("b", "#A0B0C0")
]);
result = resolve(source);
assert(result.ok && result.colors.alias === result.colors.mix, "REFERENCE pointing to DERIVED must resolve.");
source = palette([
    reference("final", "adjusted"),
    derived("adjusted", "oklchAdjust.v1", ["mixedAlias"], { hueDelta: 30, lightnessDelta: 0.05, chromaScale: 0.9 }),
    reference("mixedAlias", "mixed"),
    derived("mixed", "mix.v1", ["a", "b"], { amount: 0.4 }),
    direct("a", "#123456"),
    direct("b", "#ABCDEF")
]);
result = resolve(source);
assert(result.ok && result.colors.final === result.colors.adjusted, "Mixed multi-hop graph must resolve deterministically.");

source = palette([derived("bad", "missing.v1", ["a"], {}), direct("a", "#123456")]);
result = resolve(source);
assert(!result.ok && result.error.code === "INVALID_DERIVATION", "Missing derivation must fail with INVALID_DERIVATION.");
source = palette([derived("bad", "mix.v1", ["a", "b"], { amount: 2 }), direct("a", "#000000"), direct("b", "#FFFFFF")]);
result = resolve(source);
assert(!result.ok && result.error.code === "INVALID_PARAMETERS", "Invalid derivation parameters must fail with INVALID_PARAMETERS.");
source = palette([
    derived("consumer", "oklchAdjust.v1", ["bad"], { hueDelta: 0, lightnessDelta: 0, chromaScale: 1 }),
    derived("bad", "missing.v1", ["a"], {}),
    direct("a", "#123456")
]);
result = resolve(source);
assert(!result.ok && result.error.code === "UNRESOLVED_SOURCE", "A dependent of a failed source must fail with UNRESOLVED_SOURCE.");
assert(result.error.cause.code === "INVALID_DERIVATION", "UNRESOLVED_SOURCE must preserve its typed cause.");
source = palette([derived("bad", "mix.v1", ["missing", "a"], { amount: 0.5 }), direct("a", "#123456")]);
result = resolve(source);
assert(!result.ok && result.error.code === "MISSING_SLOT", "Missing DERIVED source must expose MISSING_SLOT without fallback.");
source = palette([direct("bad", "red")]);
result = resolve(source);
assert(!result.ok && result.error.code === "INVALID_DIRECT_COLOR", "Invalid DIRECT color must remain a typed schema failure.");

source = palette([
    derived("mixed", "mix.v1", ["a", "b"], { amount: 0.33 }),
    direct("a", "#13579B"),
    direct("b", "#FEDCBA")
]);
const before = JSON.stringify(source);
const first = resolve(source);
const second = resolve(source);
assert(first.ok && JSON.stringify(first) === JSON.stringify(second), "Same graph input must resolve byte-stably.");
assert(JSON.stringify(source) === before, "Resolver must not mutate source Palette.");

let calls = 0;
const countingRegistry = registry.createRegistry([{
    id: "count.v1",
    inputContract: { type: "color", count: 1 },
    parameterSchema: {},
    outputContract: { type: "color", format: "#RRGGBB" },
    resolve(inputs) { calls += 1; return inputs[0]; }
}]);
source = palette([
    reference("left", "derivedOnce"),
    reference("right", "derivedOnce"),
    derived("derivedOnce", "count.v1", ["base"], {}),
    direct("base", "#445566")
]);
result = resolve(source, countingRegistry);
assert(result.ok && result.colors.left === "#445566" && result.colors.right === "#445566", "Shared derived dependency must resolve for all consumers.");
assert(calls === 1, "Resolver must cache a completed slot within one resolution.");

const reordered = palette([direct("b", "#FFFFFF"), derived("mix", "mix.v1", ["a", "b"], { amount: 0.5 }), direct("a", "#000000")]);
result = resolve(reordered);
assert(result.ok && result.colors.mix === "#BCBCBC", "Array reorder must not alter stable dependency identity.");
const single = resolver.resolveSlot(reordered, "mix", { registry });
assert(single.ok && single.slotId === "mix" && single.value === "#BCBCBC", "Single-slot resolution API must follow the same graph contract.");
assert(resolver.resolveSlot(reordered, "missing", { registry }).error.code === "MISSING_SLOT", "Single-slot resolution must fail closed for missing target.");
result = resolve(palette([direct("constructor", "#112233"), reference("alias", "constructor")]));
assert(result.ok && result.colors.constructor === "#112233" && result.colors.alias === "#112233", "Resolver maps must not collide with Object prototype names.");

console.log(`PASS palette resolver: ${assertions} assertions.`);
