(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaCapabilityContracts";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.registerModule !== "function" || typeof bootstrap.hasModule !== "function" || bootstrap.hasModule(name)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        exported = Object.freeze(create());
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var MODULE_REVISION = "vela-capability-contracts-v1";
    var FORBIDDEN_KEYS = Object.freeze(["target", "targetid", "layerid", "compositionid", "binding", "fingerprint", "propertypath", "matchname", "candidate", "plan", "nonce", "digest", "confirmation", "authority", "host", "hostpayload", "execute", "execution", "callback", "transcript", "history", "requestid"]);
    var FORBIDDEN_TOKEN_SEQUENCES = Object.freeze([["target"], ["target", "id"], ["layer", "id"], ["composition", "id"], ["binding"], ["fingerprint"], ["property", "path"], ["match", "name"], ["candidate"], ["plan"], ["nonce"], ["digest"], ["confirmation"], ["authority"], ["host"], ["host", "payload"], ["execute"], ["execution"], ["callback"], ["transcript"], ["history"], ["request", "id"]]);
    var COMPACT_IDENTIFIER_AFFIXES = Object.freeze(["selected", "current", "value", "values", "id", "ids", "payload", "config", "handler", "entry", "entries", "data", "info", "state", "context", "property", "layer", "composition", "request", "host", "target", "candidate", "plan", "execution", "callback", "transcript", "history", "authority", "binding", "match", "path"]);
    var OBJECT_KEYS = Object.freeze(["type", "properties", "required", "additionalProperties"]);
    var NUMBER_KEYS = Object.freeze(["type", "minimum", "maximum", "unit", "enum"]);
    var STRING_KEYS = Object.freeze(["type", "enum"]);
    var BOOLEAN_KEYS = Object.freeze(["type", "enum"]);
    var MODEL_POLICY_KEYS = Object.freeze(["responseType", "branchPolicy", "modelMaySupply", "groundingField", "unavailableBehavior"]);
    var LOCAL_POLICY_KEYS = Object.freeze(["parameterValidatorId", "intentValidatorId", "routerId"]);
    var REGISTERED_ACTION_KEYS = Object.freeze(["toolId", "actionId"]);
    var UNSAFE_PATH_SEGMENTS = Object.freeze(["__proto__", "prototype", "constructor"]);
    function fail(message) { throw new Error("CAPABILITY_CONTRACT_INVALID: " + message); }
    function ownData(value, key) { var descriptor; try { descriptor = Object.getOwnPropertyDescriptor(value, key); } catch (error) { return undefined; } return descriptor && !descriptor.get && !descriptor.set && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined; }
    function isPlainObject(value) {
        var prototype;
        var constructor;
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; }
        prototype = Object.getPrototypeOf(value);
        if (prototype === null || prototype === Object.prototype) { return true; }
        constructor = ownData(prototype, "constructor");
        return typeof constructor === "function" && Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
    }
    function stableKey(value) { return String(value).replace(/[^a-z0-9]/gi, "").toLowerCase(); }
    function compareStrings(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
    function hasOwn(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function splitContractIdentifier(name) {
        return String(name).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([A-Za-z])([0-9])/g, "$1 $2").replace(/([0-9])([A-Za-z])/g, "$1 $2").split(/[\s_-]+/).filter(function (part) { return part.length > 0; }).map(function (part) { return part.toLowerCase(); });
    }
    function startsWithKnownCompactAffix(value) { return COMPACT_IDENTIFIER_AFFIXES.some(function (affix) { return value.indexOf(affix) === 0; }); }
    function endsWithKnownCompactAffix(value) { return COMPACT_IDENTIFIER_AFFIXES.some(function (affix) { return value.slice(value.length - affix.length) === affix; }); }
    function containsForbiddenCompactConcept(token) {
        var normalized = token.toLowerCase();
        return FORBIDDEN_KEYS.some(function (concept) {
            var suffix;
            var prefix;
            if (normalized === concept) { return true; }
            if (normalized.indexOf(concept) === 0) { suffix = normalized.slice(concept.length); return suffix.length > 0 && startsWithKnownCompactAffix(suffix); }
            if (normalized.slice(Math.max(0, normalized.length - concept.length)) === concept) { prefix = normalized.slice(0, normalized.length - concept.length); return prefix.length > 0 && endsWithKnownCompactAffix(prefix); }
            return false;
        });
    }
    function containsForbiddenContractConcept(name) {
        var tokens = splitContractIdentifier(name);
        var normalized = stableKey(name);
        var sequenceMatch = FORBIDDEN_TOKEN_SEQUENCES.some(function (sequence) {
            var index;
            for (index = 0; index <= tokens.length - sequence.length; index += 1) {
                if (sequence.every(function (token, offset) { return tokens[index + offset] === token; })) { return true; }
            }
            return false;
        });
        return sequenceMatch || (tokens.length === 1 && containsForbiddenCompactConcept(normalized));
    }
    function assertSafeContractIdentifier(name, path) {
        if (typeof name !== "string" || !/^[a-z][A-Za-z0-9]*$/.test(name) || containsForbiddenContractConcept(name)) { fail(path + " has an unsafe identifier."); }
        return name;
    }
    function assertSafeValue(value, path, seen) {
        var type = typeof value;
        if (value === undefined || type === "function" || type === "symbol" || type === "bigint" || (type === "number" && !isFinite(value))) { fail(path + " is not JSON-safe."); }
        if (value === null || type !== "object") { return; }
        if (seen.indexOf(value) !== -1) { fail(path + " is cyclic."); }
        if (Array.isArray(value)) { seen.push(value); value.forEach(function (item, index) { assertSafeValue(item, path + "[" + index + "]", seen); }); seen.pop(); return; }
        if (!isPlainObject(value)) { fail(path + " must be a plain object."); }
        seen.push(value);
        Object.keys(value).forEach(function (key) { if (containsForbiddenContractConcept(key)) { fail(path + "." + key + " is forbidden."); } assertSafeValue(ownData(value, key), path + "." + key, seen); });
        seen.pop();
    }
    function deepFreeze(value, seen) { var values = seen || []; if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; } if (values.indexOf(value) !== -1) { fail("Cannot freeze cyclic contract."); } values.push(value); Object.keys(value).forEach(function (key) { deepFreeze(value[key], values); }); values.pop(); return Object.freeze(value); }
    function copyValue(value) {
        var result;
        if (Array.isArray(value)) { return value.map(copyValue); }
        if (!value || typeof value !== "object") { return value; }
        result = {};
        Object.keys(value).forEach(function (key) { result[key] = copyValue(ownData(value, key)); });
        return result;
    }
    function assertOnlyKeys(value, allowed, path) { Object.keys(value).forEach(function (key) { if (allowed.indexOf(key) === -1) { fail(path + " has unknown key " + key + "."); } }); }
    function canonicalEnum(values, type, path) {
        var result;
        if (!Array.isArray(values) || values.length === 0) { fail(path + " must be a non-empty array."); }
        values.forEach(function (value, index) {
            if (typeof value !== type || (type === "number" && !isFinite(value)) || values.indexOf(value) !== index) { fail(path + " has invalid values."); }
        });
        result = values.slice();
        result.sort(type === "number" ? function (left, right) { return left - right; } : type === "boolean" ? function (left, right) { return left === right ? 0 : left ? 1 : -1; } : compareStrings);
        return result;
    }
    function canonicalSchema(schema, path) {
        var type;
        var properties;
        var required;
        var result;
        if (!isPlainObject(schema)) { fail(path + " must be an object."); }
        type = ownData(schema, "type");
        if (["object", "number", "boolean", "string"].indexOf(type) === -1) { fail(path + ".type is unsupported."); }
        assertOnlyKeys(schema, type === "object" ? OBJECT_KEYS : type === "number" ? NUMBER_KEYS : type === "string" ? STRING_KEYS : BOOLEAN_KEYS, path);
        if (type === "object") {
            if (ownData(schema, "additionalProperties") !== false) { fail(path + ".additionalProperties must be false."); }
            properties = ownData(schema, "properties");
            required = ownData(schema, "required");
            if (!isPlainObject(properties) || !Array.isArray(required)) { fail(path + " object schema is incomplete."); }
            result = { type: "object", properties: {}, required: null, additionalProperties: false };
            Object.keys(properties).sort(compareStrings).forEach(function (key) {
                assertSafeContractIdentifier(key, path + ".properties");
                result.properties[key] = canonicalSchema(ownData(properties, key), path + ".properties." + key);
            });
            required.forEach(function (key, index) { if (typeof key !== "string" || !hasOwn(properties, key) || required.indexOf(key) !== index) { fail(path + ".required is invalid."); } });
            result.required = required.slice().sort(compareStrings);
            return result;
        }
        if (type === "number") {
            if (typeof ownData(schema, "minimum") !== "number" || !isFinite(ownData(schema, "minimum")) || typeof ownData(schema, "maximum") !== "number" || !isFinite(ownData(schema, "maximum")) || ownData(schema, "minimum") > ownData(schema, "maximum")) { fail(path + " number range is invalid."); }
            result = { type: "number", minimum: ownData(schema, "minimum"), maximum: ownData(schema, "maximum") };
            if (ownData(schema, "unit") !== undefined) { if (typeof ownData(schema, "unit") !== "string" || !/^[a-z][a-z-]*$/.test(ownData(schema, "unit"))) { fail(path + ".unit is invalid."); } result.unit = ownData(schema, "unit"); }
            if (ownData(schema, "enum") !== undefined) { result.enum = canonicalEnum(ownData(schema, "enum"), "number", path + ".enum"); }
            return result;
        }
        result = { type: type };
        if (ownData(schema, "enum") !== undefined) { result.enum = canonicalEnum(ownData(schema, "enum"), type, path + ".enum"); }
        return result;
    }
    function canonicalPath(path, parameters) {
        var parts;
        var schema;
        if (typeof path !== "string" || !path) { fail("modelMaySupply path is invalid."); }
        parts = path.split(".");
        if (parts.length < 2 || parts[0] !== "params") { fail("modelMaySupply must begin with params."); }
        schema = parameters;
        parts.slice(1).forEach(function (part) {
            if (UNSAFE_PATH_SEGMENTS.indexOf(part) !== -1 || !schema || schema.type !== "object" || !hasOwn(schema.properties, part)) { fail("modelMaySupply path is invalid."); }
            assertSafeContractIdentifier(part, "modelMaySupply path");
            schema = schema.properties[part];
        });
        return parts.join(".");
    }
    function canonicalModelPolicy(policy, parameters) {
        var paths;
        var result;
        if (!isPlainObject(policy)) { fail("modelPolicy is invalid."); }
        assertOnlyKeys(policy, MODEL_POLICY_KEYS, "modelPolicy");
        if (ownData(policy, "responseType") !== "localProposal" || typeof ownData(policy, "branchPolicy") !== "string" || typeof ownData(policy, "groundingField") !== "string" || typeof ownData(policy, "unavailableBehavior") !== "string") { fail("modelPolicy is incomplete."); }
        if (!/^[a-z][a-z0-9-]*$/.test(ownData(policy, "branchPolicy")) || !/^[a-z][A-Za-z0-9.]*$/.test(ownData(policy, "groundingField")) || !/^[a-z][a-z0-9-]*$/.test(ownData(policy, "unavailableBehavior"))) { fail("modelPolicy is invalid."); }
        if (!Array.isArray(ownData(policy, "modelMaySupply")) || ownData(policy, "modelMaySupply").length === 0) { fail("modelMaySupply is invalid."); }
        paths = ownData(policy, "modelMaySupply").map(function (path) { return canonicalPath(path, parameters); });
        paths.forEach(function (path, index) { if (paths.indexOf(path) !== index) { fail("modelMaySupply contains duplicates."); } });
        paths.sort(compareStrings);
        result = { responseType: "localProposal", branchPolicy: ownData(policy, "branchPolicy"), modelMaySupply: paths, groundingField: ownData(policy, "groundingField"), unavailableBehavior: ownData(policy, "unavailableBehavior") };
        return result;
    }
    function canonicalLocalPolicy(policy) {
        var result = {};
        if (!isPlainObject(policy)) { fail("localPolicy is invalid."); }
        assertOnlyKeys(policy, LOCAL_POLICY_KEYS, "localPolicy");
        ["parameterValidatorId", "intentValidatorId", "routerId"].forEach(function (key) {
            if (typeof ownData(policy, key) !== "string" || !/^[a-z][a-z0-9-]*-v[1-9][0-9]*$/.test(ownData(policy, key))) { fail("localPolicy is incomplete."); }
            result[key] = ownData(policy, key);
        });
        return result;
    }
    function canonicalRegisteredAction(identity) {
        var toolId;
        var actionId;
        if (!isPlainObject(identity)) { fail("registeredAction is invalid."); }
        assertOnlyKeys(identity, REGISTERED_ACTION_KEYS, "registeredAction");
        toolId = ownData(identity, "toolId");
        actionId = ownData(identity, "actionId");
        if (typeof toolId !== "string" || !/^[a-z][a-z0-9-]*$/.test(toolId) || typeof actionId !== "string" || !/^[a-z][a-z0-9-]*-v[1-9][0-9]*$/.test(actionId)) { fail("registeredAction identity is invalid."); }
        return { toolId: toolId, actionId: actionId };
    }
    function canonicalContract(contract) {
        var allowed = ["capabilityId", "revision", "parameters", "modelPolicy", "localPolicy", "registeredAction"];
        var parameters;
        var registeredAction;
        if (!isPlainObject(contract)) { fail("Contract must be an object."); }
        assertSafeValue(contract, "contract", []);
        assertOnlyKeys(contract, allowed, "contract");
        if (typeof ownData(contract, "capabilityId") !== "string" || !/^[a-z][a-z0-9-]*-v[1-9][0-9]*$/.test(ownData(contract, "capabilityId"))) { fail("capabilityId is invalid."); }
        if (typeof ownData(contract, "revision") !== "string" || !/^vela-capability-contract-v[1-9][0-9]*$/.test(ownData(contract, "revision"))) { fail("revision is invalid."); }
        parameters = canonicalSchema(ownData(contract, "parameters"), "parameters");
        registeredAction = ownData(contract, "registeredAction") === undefined ? null : canonicalRegisteredAction(ownData(contract, "registeredAction"));
        return { capabilityId: ownData(contract, "capabilityId"), revision: ownData(contract, "revision"), parameters: parameters, modelPolicy: canonicalModelPolicy(ownData(contract, "modelPolicy"), parameters), localPolicy: canonicalLocalPolicy(ownData(contract, "localPolicy")), registeredAction: registeredAction };
    }
    function validateSchemaValue(schema, value, path) {
        var result;
        var keys;
        if (schema.type === "object") {
            if (!isPlainObject(value)) { fail(path + " must be an object."); }
            keys = Object.keys(value).sort(compareStrings);
            if (keys.some(function (key) { return !hasOwn(schema.properties, key); })) { fail(path + " has unsupported parameters."); }
            schema.required.forEach(function (key) { if (!hasOwn(value, key)) { fail(path + " is missing a required parameter."); } });
            result = {};
            keys.forEach(function (key) { result[key] = validateSchemaValue(schema.properties[key], ownData(value, key), path + "." + key); });
            return result;
        }
        if (typeof value !== schema.type || (schema.type === "number" && !isFinite(value))) { fail(path + " has an invalid type."); }
        if (schema.type === "number" && (value < schema.minimum || value > schema.maximum)) { fail(path + " is out of range."); }
        if (schema.enum && schema.enum.indexOf(value) === -1) { fail(path + " is not an allowed value."); }
        return value;
    }
    function validateCapabilityParams(projection, params) {
        var schema;
        if (!isPlainObject(projection)) { fail("Capability projection is invalid."); }
        if (ownData(projection, "capabilityId") === "set-layer-name-v1") { return validateLayerNameParams(params); }
        assertSafeValue(projection, "projection", []);
        schema = canonicalSchema(ownData(projection, "parameters"), "projection.parameters");
        assertSafeValue(params, "params", []);
        return deepFreeze(validateSchemaValue(schema, params, "params"));
    }
    function utf8ByteLengthExact(value) {
        var index;
        var code;
        var next;
        var bytes = 0;
        for (index = 0; index < value.length; index += 1) {
            code = value.charCodeAt(index);
            if (code < 0x80) { bytes += 1; }
            else if (code < 0x800) { bytes += 2; }
            else if (code >= 0xD800 && code <= 0xDBFF) {
                next = value.charCodeAt(index + 1);
                if (next < 0xDC00 || next > 0xDFFF) { fail("Layer name contains an invalid Unicode scalar."); }
                bytes += 4; index += 1;
            } else if (code >= 0xDC00 && code <= 0xDFFF) { fail("Layer name contains an invalid Unicode scalar."); }
            else { bytes += 3; }
        }
        return bytes;
    }
    function validateLayerNameParams(params) {
        var name;
        if (!isPlainObject(params) || Object.keys(params).length !== 1 || !hasOwn(params, "name")) { fail("Layer name parameters must contain exactly name."); }
        name = ownData(params, "name");
        if (typeof name !== "string" || name.length === 0 || /^\s+$/.test(name) || /[\u0000-\u001f\u007f-\u009f]/.test(name)) { fail("Layer name is invalid."); }
        if (utf8ByteLengthExact(name) > 256) { fail("Layer name exceeds its UTF-8 byte limit."); }
        return deepFreeze({ name: name });
    }
    function createRegistry(definitions, options) {
        var values;
        var byId = Object.create(null);
        var allowEmpty = options && ownData(options, "allowEmpty") === true;
        if (!Array.isArray(definitions) || (!allowEmpty && definitions.length === 0)) { fail("Registry definitions are invalid."); }
        values = definitions.map(function (definition) { return deepFreeze(canonicalContract(definition)); }).sort(function (left, right) { return compareStrings(left.capabilityId, right.capabilityId); });
        values.forEach(function (contract, index) { if (index && values[index - 1].capabilityId === contract.capabilityId) { fail("Duplicate capabilityId."); } byId[contract.capabilityId] = contract; });
        function projection(id, local) { var contract = byId[id]; var result; if (!contract) { return null; } result = { capabilityId: contract.capabilityId, revision: contract.revision, parameters: copyValue(contract.parameters) }; result[local ? "localPolicy" : "modelPolicy"] = copyValue(contract[local ? "localPolicy" : "modelPolicy"]); if (local) { result.registeredAction = copyValue(contract.registeredAction); } return deepFreeze(result); }
        function resolveRegisteredAction(id) { var contract = typeof id === "string" ? byId[id] : null; return contract && contract.registeredAction ? deepFreeze(copyValue(contract.registeredAction)) : null; }
        return Object.freeze({ listCapabilityIds: function () { return Object.freeze(values.map(function (contract) { return contract.capabilityId; })); }, getContract: function (id) { return typeof id === "string" && byId[id] ? deepFreeze(copyValue(byId[id])) : null; }, getModelProjection: function (id) { return projection(id, false); }, getLocalProjection: function (id) { return projection(id, true); }, resolveRegisteredAction: resolveRegisteredAction });
    }
    var productionRegistry = createRegistry([{
        capabilityId: "set-opacity-v1", revision: "vela-capability-contract-v1",
        parameters: { type: "object", additionalProperties: false, required: ["opacity"], properties: { opacity: { type: "number", minimum: 0, maximum: 100, unit: "percent" } } },
        modelPolicy: { responseType: "localProposal", branchPolicy: "direct-single-target-edit-only", modelMaySupply: ["params.opacity"], groundingField: "selection.selectedLayerOpacity", unavailableBehavior: "respond-with-text-without-guessing" },
        localPolicy: { parameterValidatorId: "opacity-percent-v1", intentValidatorId: "set-opacity-direct-edit-v1", routerId: "set-opacity-v1" },
        registeredAction: { toolId: "vela", actionId: "set-opacity-v1" }
    }, {
        capabilityId: "set-layer-name-v1", revision: "vela-capability-contract-v1",
        parameters: { type: "object", additionalProperties: false, required: ["name"], properties: { name: { type: "string" } } },
        modelPolicy: { responseType: "localProposal", branchPolicy: "direct-single-target-edit-only", modelMaySupply: ["params.name"], groundingField: "selection.selectedLayerName", unavailableBehavior: "respond-with-text-without-guessing" },
        localPolicy: { parameterValidatorId: "layer-name-bounded-v1", intentValidatorId: "set-layer-name-direct-edit-v1", routerId: "set-layer-name-v1" },
        registeredAction: { toolId: "vela", actionId: "set-layer-name-v1" }
    }]);
    function getRepresentationContract(id) { return productionRegistry.getContract(id); }
    function getRepresentationModelProjection(id) { return productionRegistry.getModelProjection(id); }
    function getRepresentationLocalProjection(id) { return productionRegistry.getLocalProjection(id); }
    function validateRepresentationCapabilityParams(id, params) {
        var projection = getRepresentationLocalProjection(id);
        if (!projection) { fail("Representation capability is unavailable."); }
        return id === "set-layer-name-v1" ? validateLayerNameParams(params) : validateCapabilityParams(projection, params);
    }
    return Object.freeze({ MODULE_REVISION: MODULE_REVISION, createRegistry: createRegistry, validateCapabilityParams: validateCapabilityParams, validateRepresentationCapabilityParams: validateRepresentationCapabilityParams, getContract: productionRegistry.getContract, getModelProjection: productionRegistry.getModelProjection, getLocalProjection: productionRegistry.getLocalProjection, listCapabilityIds: productionRegistry.listCapabilityIds, resolveRegisteredAction: productionRegistry.resolveRegisteredAction, getRepresentationContract: getRepresentationContract, getRepresentationModelProjection: getRepresentationModelProjection, getRepresentationLocalProjection: getRepresentationLocalProjection });
}));
