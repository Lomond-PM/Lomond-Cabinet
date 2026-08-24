"use strict";

const assert = require("assert");
const Registry = require("../client/js/appearance/appearanceParameterRegistry.js").AppearanceParameterRegistry;
const Resolver = require("../client/js/appearance/appearanceResolver.js").AppearanceResolver;
const definitions = Registry.list();
const ids = new Set();
let assertions = 0;
function ok(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }

ok(definitions.length >= 20, "registry contains the DS-3A foundation parameters");
for (const parameter of definitions) {
    ok(/^[a-z][a-zA-Z]*(?:\.[a-z][a-zA-Z]*)+$/.test(parameter.id), parameter.id + " uses stable dot notation");
    ok(!ids.has(parameter.id), parameter.id + " is unique");
    ids.add(parameter.id);
    for (const key of ["category", "tier", "controlType", "labelKey", "descriptionKey", "defaultSource", "classification", "persistence", "resolverTarget", "validation", "reset"]) {
        ok(parameter[key] !== undefined && parameter[key] !== null, parameter.id + " declares " + key);
    }
    ok(parameter.resolverTarget.indexOf("--") !== 0, parameter.id + " does not expose a CSS property as its resolver target");
    ok(
        Object.prototype.hasOwnProperty.call(Resolver.cssTargets, parameter.resolverTarget) ||
        Object.prototype.hasOwnProperty.call(Resolver.designDefaults, parameter.resolverTarget) ||
        parameter.defaultSource === "theme-derived",
        parameter.id + " has a known logical resolver target"
    );
}
equal(Registry.get("base.canvas").persistence, "settings", "base canvas remains settings-owned");
equal(Registry.get("surface.panel").classification, "EXPOSE_NOW", "panel surface is approved for the future UI");
equal(Registry.get("interaction.focus.ring").classification, "ADVANCED_LATER", "interaction override remains UI-deferred");
equal(Registry.validate("surface.panel", "#ABCDEF").value, "#abcdef", "hex values normalize");
ok(!Registry.validate("surface.panel", "var(--danger)").valid, "arbitrary CSS values are rejected");
ok(!Registry.validate("layout.scale", 2).valid, "numeric ranges are enforced");
ok(!Registry.isAppearanceOverride("base.accent"), "base inputs cannot enter appearance overrides");
console.log("test-appearance-parameter-registry: " + assertions + " assertions passed.");
