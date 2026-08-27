(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaAgentCapabilityRegistry";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var exported = Object.freeze(factory());
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var MODULE_REVISION = "vela-agent-capability-registry-0.3.4-v1";
    var DEFINITION_KEYS = Object.freeze(["capabilityId", "kind", "inputSchema", "outputSchema", "executionEnvironment", "adapterId", "concurrency", "cancellation"]);
    var SCHEMA_KEYS = Object.freeze(["type", "properties", "required", "additionalProperties", "enum", "minimum", "maximum", "nullable"]);
    var KINDS = Object.freeze(["read", "analyze"]);
    var ENVIRONMENTS = Object.freeze(["host", "client"]);
    var CONCURRENCY = Object.freeze(["exclusive", "parallel-safe"]);
    var CANCELLATION = Object.freeze(["cooperative", "commit-only"]);

    function error(code) { var value = new Error(code); value.code = code; return value; }
    function isPlainObject(value) { var prototype; if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; } prototype = Object.getPrototypeOf(value); return prototype === null || prototype === Object.prototype; }
    function assertOnlyKeys(value, allowed, code) { Object.keys(value).forEach(function (key) { if (allowed.indexOf(key) === -1) { throw error(code); } }); }
    function clone(value) { var result; if (Array.isArray(value)) { return value.map(clone); } if (!value || typeof value !== "object") { return value; } result = {}; Object.keys(value).forEach(function (key) { result[key] = clone(value[key]); }); return result; }
    function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; } Object.keys(value).forEach(function (key) { freeze(value[key]); }); return Object.freeze(value); }

    function canonicalSchema(schema) {
        var result;
        if (!isPlainObject(schema)) { throw error("CAPABILITY_DEFINITION_INVALID"); }
        assertOnlyKeys(schema, SCHEMA_KEYS, "CAPABILITY_DEFINITION_INVALID");
        if (["object", "string", "number", "boolean"].indexOf(schema.type) === -1 || (schema.nullable !== undefined && typeof schema.nullable !== "boolean")) { throw error("CAPABILITY_DEFINITION_INVALID"); }
        result = { type: schema.type };
        if (schema.nullable === true) { result.nullable = true; }
        if (schema.type === "object") {
            if (!isPlainObject(schema.properties) || !Array.isArray(schema.required) || schema.additionalProperties !== false) { throw error("CAPABILITY_DEFINITION_INVALID"); }
            result.properties = {};
            Object.keys(schema.properties).sort().forEach(function (key) { result.properties[key] = canonicalSchema(schema.properties[key]); });
            result.required = schema.required.slice().sort();
            if (result.required.some(function (key, index) { return !Object.prototype.hasOwnProperty.call(result.properties, key) || result.required.indexOf(key) !== index; })) { throw error("CAPABILITY_DEFINITION_INVALID"); }
            result.additionalProperties = false;
        } else {
            if (schema.properties !== undefined || schema.required !== undefined || schema.additionalProperties !== undefined) { throw error("CAPABILITY_DEFINITION_INVALID"); }
            if (schema.enum !== undefined) {
                if (!Array.isArray(schema.enum) || !schema.enum.length) { throw error("CAPABILITY_DEFINITION_INVALID"); }
                result.enum = schema.enum.slice();
            }
            if (schema.type === "number") {
                if (schema.minimum !== undefined) { if (typeof schema.minimum !== "number" || !isFinite(schema.minimum)) { throw error("CAPABILITY_DEFINITION_INVALID"); } result.minimum = schema.minimum; }
                if (schema.maximum !== undefined) { if (typeof schema.maximum !== "number" || !isFinite(schema.maximum)) { throw error("CAPABILITY_DEFINITION_INVALID"); } result.maximum = schema.maximum; }
            } else if (schema.minimum !== undefined || schema.maximum !== undefined) { throw error("CAPABILITY_DEFINITION_INVALID"); }
        }
        return freeze(result);
    }

    function validate(schema, value) {
        var keys;
        if (value === null && schema.nullable === true) { return null; }
        if (schema.type === "object") {
            if (!isPlainObject(value)) { throw error("SCHEMA_VALUE_INVALID"); }
            keys = Object.keys(value);
            if (keys.some(function (key) { return !Object.prototype.hasOwnProperty.call(schema.properties, key); }) || schema.required.some(function (key) { return !Object.prototype.hasOwnProperty.call(value, key); })) { throw error("SCHEMA_VALUE_INVALID"); }
            keys.forEach(function (key) { validate(schema.properties[key], value[key]); });
        } else if (schema.type === "number") {
            if (typeof value !== "number" || !isFinite(value) || (schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum)) { throw error("SCHEMA_VALUE_INVALID"); }
        } else if (typeof value !== schema.type) { throw error("SCHEMA_VALUE_INVALID"); }
        if (schema.enum && schema.enum.indexOf(value) === -1) { throw error("SCHEMA_VALUE_INVALID"); }
        return freeze(clone(value));
    }

    function canonicalDefinition(definition) {
        var value;
        if (!isPlainObject(definition)) { throw error("CAPABILITY_DEFINITION_INVALID"); }
        assertOnlyKeys(definition, DEFINITION_KEYS, "CAPABILITY_DEFINITION_INVALID");
        if (typeof definition.capabilityId !== "string" || !/^[a-z][a-z0-9-]*-v[1-9][0-9]*$/.test(definition.capabilityId) || KINDS.indexOf(definition.kind) === -1 || ENVIRONMENTS.indexOf(definition.executionEnvironment) === -1 || typeof definition.adapterId !== "string" || !/^[a-z][a-z0-9-]*-v[1-9][0-9]*$/.test(definition.adapterId) || CONCURRENCY.indexOf(definition.concurrency) === -1 || CANCELLATION.indexOf(definition.cancellation) === -1) { throw error("CAPABILITY_DEFINITION_INVALID"); }
        if (definition.kind === "analyze" && definition.executionEnvironment !== "client") { throw error("CAPABILITY_DEFINITION_INVALID"); }
        if (definition.executionEnvironment === "host" && definition.concurrency !== "exclusive") { throw error("CAPABILITY_DEFINITION_INVALID"); }
        value = {
            capabilityId: definition.capabilityId,
            kind: definition.kind,
            inputSchema: canonicalSchema(definition.inputSchema),
            outputSchema: canonicalSchema(definition.outputSchema),
            executionEnvironment: definition.executionEnvironment,
            adapterId: definition.adapterId,
            concurrency: definition.concurrency,
            cancellation: definition.cancellation
        };
        return freeze(value);
    }

    function createRegistry(definitions, options) {
        var settings = isPlainObject(options) ? options : {};
        var resolvers = isPlainObject(settings.availabilityResolvers) ? settings.availabilityResolvers : {};
        var contracts = Object.create(null);
        if (!Array.isArray(definitions) || !definitions.length) { throw error("CAPABILITY_DEFINITION_INVALID"); }
        definitions.forEach(function (definition) {
            var value = canonicalDefinition(definition);
            if (contracts[value.capabilityId]) { throw error("CAPABILITY_DUPLICATE"); }
            contracts[value.capabilityId] = value;
        });
        return Object.freeze({
            listCapabilityIds: function () { return Object.freeze(Object.keys(contracts).sort()); },
            getContract: function (capabilityId) { return contracts[capabilityId] || null; },
            getModelProjection: function (capabilityId) { var value = contracts[capabilityId]; return value ? freeze({ capabilityId: value.capabilityId, kind: value.kind, inputSchema: clone(value.inputSchema), outputSchema: clone(value.outputSchema) }) : null; },
            getLocalProjection: function (capabilityId) { return contracts[capabilityId] || null; },
            validateInput: function (capabilityId, input) { var value = contracts[capabilityId]; if (!value) { throw error("UNKNOWN_CAPABILITY"); } try { return validate(value.inputSchema, input); } catch (ignored) { throw error("INVALID_INPUT"); } },
            validateOutput: function (capabilityId, output) { var value = contracts[capabilityId]; if (!value) { throw error("UNKNOWN_CAPABILITY"); } try { return validate(value.outputSchema, output); } catch (ignored) { throw error("INVALID_OUTPUT"); } },
            getAvailability: function (capabilityId, scope) { var resolver; if (!contracts[capabilityId]) { throw error("UNKNOWN_CAPABILITY"); } resolver = resolvers[capabilityId]; if (typeof resolver !== "function") { return freeze({ available: false, code: "CAPABILITY_UNAVAILABLE" }); } try { return resolver(freeze(clone(isPlainObject(scope) ? scope : {}))) === true ? freeze({ available: true, code: null }) : freeze({ available: false, code: "CAPABILITY_UNAVAILABLE" }); } catch (ignored) { return freeze({ available: false, code: "CAPABILITY_UNAVAILABLE" }); } }
        });
    }

    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, createRegistry: createRegistry });
}));
