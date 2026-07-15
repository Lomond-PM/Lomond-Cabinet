(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaValidator";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertProtocolModule(dependency) {
        if (!dependency || typeof dependency.createProtocol !== "function" || typeof dependency.isTrustedProtocol !== "function" || !dependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaValidator requires VelaProtocol.");
        }
        return dependency;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaValidator requires the Vela protocol bootstrap."); }
        var bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "The Vela protocol bootstrap is invalid."); }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered."); }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with the loaded module."); }
        var dependency = assertProtocolModule(bootstrap.getModule("VelaProtocol"));
        var exported = Object.freeze(create(dependency));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol"))));
    } else if (root) {
        registerBrowserModule(root, MODULE_NAME, factory);
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule) {
    "use strict";

    var trustedAuthorities = new WeakSet();
    var authorityProtocols = new WeakMap();

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.validateNormalizedAction !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return protocol;
    }

    function own(value, key) {
        return Object.prototype.hasOwnProperty.call(value, key);
    }

    function ownData(protocol, value, key, code, message) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { protocol.fail(code, message); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
            protocol.fail(code, message);
        }
        return descriptor.value;
    }

    function isTrustedAuthority(authority) {
        return Boolean(authority && trustedAuthorities.has(authority));
    }

    function isTrustedAuthorityForProtocol(authority, protocol) {
        return Boolean(isTrustedAuthority(authority) && protocolModule.isTrustedProtocol(protocol) && authorityProtocols.get(authority) === protocol);
    }

    function isolatePlainData(value) {
        if (Array.isArray(value)) { return value.map(isolatePlainData); }
        if (value && typeof value === "object") {
            var output = Object.create(null);
            Object.keys(value).forEach(function (key) { output[key] = isolatePlainData(value[key]); });
            return output;
        }
        return value;
    }

    function targetType(target) {
        if (target.propertyPath || target.propertyMatchName) { return "property"; }
        if (target.layerId || target.layerIndex || target.layerIds || target.layerIndices) { return "layer"; }
        if (target.compId) { return "comp"; }
        if (target.targetId) { return "target"; }
        return "unknown";
    }

    function createActionValidator(protocol, capabilities) {
        protocol = requireProtocol(protocol);
        capabilities = capabilities || {};
        protocol.assertSafeJson(capabilities);
        if (!protocol.isPlainObject(capabilities)) {
            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local capabilities must be a plain data object.");
        }
        var validatedActions = new WeakSet();

        function normalizeScope(scope, label) {
            protocol.assertSafeJson(scope);
            var values = Array.isArray(scope) ? scope.slice() : [scope];
            if (!values.length) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "A local target scope is required."); }
            values.forEach(function (value) { protocol.assertNonEmptyString(value, label); });
            return Object.freeze(values.slice().sort());
        }

        function validateSchemaDefinition(schema, path, depth) {
            path = path || "localSchema";
            depth = depth || 0;
            if (!protocol.isPlainObject(schema) || depth > protocol.HARD_LIMITS.maxNestedDepth) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local parameter schema is invalid.", { details: { field: path } });
            }
                protocol.assertSafeJson(schema);
            protocol.assertNoUnknownKeys(schema, ["type", "enum", "required", "properties", "items", "additionalProperties", "minItems", "maxItems", "minLength", "maxLength", "minByteLength", "maxByteLength", "minimum", "maximum"], path);
            var schemaType = ownData(protocol, schema, "type", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local parameter schema type is required.");
            if (typeof schemaType !== "string") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local parameter schema type is required.", { details: { field: path } }); }
            if (schema.enum !== undefined) {
                if (!Array.isArray(schema.enum) || schema.enum.length > protocol.HARD_LIMITS.maxArrayLength) { protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "A local enum exceeds the limit."); }
                schema.enum.forEach(function (item) { protocol.assertSafeJson(item); });
            }
            if (schemaType === "object") {
                if (schema.additionalProperties === true) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local schemas must be fail-closed.", { details: { field: path } }); }
                if (schema.required !== undefined) {
                    if (!Array.isArray(schema.required)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local schema required is invalid."); }
                    schema.required.forEach(function (key) {
                        protocol.assertNonEmptyString(key, path + ".required");
                        if (schema.properties !== undefined && !own(schema.properties, key)) {
                            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A required schema field has no property definition.", { details: { field: path + "." + key } });
                        }
                    });
                }
                if (schema.properties !== undefined) {
                    if (!protocol.isPlainObject(schema.properties)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local schema properties are invalid."); }
                    protocol.assertNoUnknownKeys(schema, ["type", "enum", "required", "properties", "items", "additionalProperties", "minItems", "maxItems", "minLength", "maxLength", "minByteLength", "maxByteLength", "minimum", "maximum"], path);
                    Object.keys(schema.properties).forEach(function (key) {
                        validateSchemaDefinition(protocol.getOwnDataProperty(schema.properties, key), path + ".properties." + key, depth + 1);
                    });
                }
            } else if (schemaType === "array") {
                if (!schema.items) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local array schemas require items."); }
                validateSchemaDefinition(schema.items, path + ".items", depth + 1);
                if (schema.maxItems !== undefined && (!Number.isInteger(schema.maxItems) || schema.maxItems > protocol.HARD_LIMITS.maxArrayLength || schema.maxItems < 0)) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Local array maxItems is invalid."); }
                if (schema.minItems !== undefined && (!Number.isInteger(schema.minItems) || schema.minItems < 0)) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Local array minItems is invalid."); }
            } else if (["string", "number", "integer", "boolean", "null"].indexOf(schemaType) === -1) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unsupported local parameter schema type.", { details: { field: path } });
            }
            if (schema.maxByteLength !== undefined && (!Number.isInteger(schema.maxByteLength) || schema.maxByteLength > protocol.HARD_LIMITS.maxStringBytes || schema.maxByteLength < 0)) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Local string maxByteLength is invalid."); }
            if (schema.minimum !== undefined) { protocol.assertFiniteNumber(schema.minimum, path + ".minimum"); }
            if (schema.maximum !== undefined) { protocol.assertFiniteNumber(schema.maximum, path + ".maximum"); }
        }

        function validateSchemaValue(value, schema, path) {
            path = path || "params";
            if (!schema || !protocol.isPlainObject(schema)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local schema is required.", { details: { field: path } }); }
            protocol.assertSafeJson(value);
            if (schema.enum && schema.enum.every(function (item) { return protocol.canonicalStringify(item) !== protocol.canonicalStringify(value); })) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "A value is not in its local enum.", { details: { field: path } });
            }
            switch (schema.type) {
            case "object":
                if (!protocol.isPlainObject(value)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A schema value must be an object.", { details: { field: path } }); }
                protocol.assertNoUnknownKeys(value, Object.keys(schema.properties || {}), path);
                (schema.required || []).forEach(function (key) {
                    if (!own(value, key)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A required parameter is missing.", { details: { field: path + "." + key } }); }
                });
                Object.keys(schema.properties || {}).forEach(function (key) {
                    if (own(value, key)) { validateSchemaValue(protocol.getOwnDataProperty(value, key), protocol.getOwnDataProperty(schema.properties, key), path + "." + key); }
                });
                break;
            case "array":
                if (!Array.isArray(value)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A schema value must be an array.", { details: { field: path } }); }
                if (value.length > protocol.HARD_LIMITS.maxArrayLength || (schema.maxItems !== undefined && value.length > schema.maxItems) || (schema.minItems !== undefined && value.length < schema.minItems)) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "An array parameter is outside its bounds.", { details: { field: path } }); }
                value.forEach(function (item, index) { validateSchemaValue(item, schema.items, path + "[" + index + "]"); });
                break;
            case "string":
                var normalized = protocol.assertString(value, path, schema.maxByteLength === undefined ? undefined : schema.maxByteLength);
                if (schema.minLength !== undefined && normalized.length < schema.minLength) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "A string parameter is too short.", { details: { field: path } }); }
                if (schema.maxLength !== undefined && normalized.length > schema.maxLength) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "A string parameter is too long.", { details: { field: path } }); }
                if (schema.minByteLength !== undefined && protocol.utf8ByteLength(normalized) < schema.minByteLength) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "A string parameter is below its byte bound.", { details: { field: path } }); }
                break;
            case "integer":
                if (!Number.isInteger(value)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "An integer parameter is invalid.", { details: { field: path } }); }
                protocol.assertFiniteNumber(value, path);
                validateNumberBounds(value, schema, path);
                break;
            case "number":
                protocol.assertFiniteNumber(value, path);
                validateNumberBounds(value, schema, path);
                break;
            case "boolean":
                if (typeof value !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A boolean parameter is invalid.", { details: { field: path } }); }
                break;
            case "null":
                if (value !== null) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A null parameter is invalid.", { details: { field: path } }); }
                break;
            default:
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unsupported local parameter schema type.", { details: { field: path } });
            }
        }

        function validateNumberBounds(value, schema, path) {
            if (schema.minimum !== undefined && value < schema.minimum) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "A number is below its local minimum.", { details: { field: path, minimum: schema.minimum } }); }
            if (schema.maximum !== undefined && value > schema.maximum) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "A number is above its local maximum.", { details: { field: path, maximum: schema.maximum } }); }
        }

        function snapshotTool(tool, toolId) {
            if (!protocol.isPlainObject(tool)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool definition is invalid."); }
            var declaredToolId = ownData(protocol, tool, "id", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool id must be an own data property.");
            if (declaredToolId !== toolId) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool id is inconsistent."); }
            var actions = ownData(protocol, tool, "actions", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local tool actions must be an own data property.");
            var actionList = Array.isArray(actions) ? actions : Object.keys(actions || {}).map(function (id) { return protocol.getOwnDataProperty(actions, id); });
            var outputActions = Object.create(null);
            actionList.forEach(function (action) {
                if (!protocol.isPlainObject(action)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool action definition is invalid."); }
                var actionId = ownData(protocol, action, "id", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local action id must be an own data property.");
                if (typeof actionId !== "string") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool action definition is invalid."); }
                if (outputActions[actionId]) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool action id is duplicated."); }
                var executable = ownData(protocol, action, "executable", protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE, "A local action must explicitly declare executable true.");
                if (executable !== true) { protocol.fail(protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE, "A local action must explicitly declare executable true.", { details: { actionId: actionId } }); }
                var paramsSchema = ownData(protocol, action, "paramsSchema", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local action schema is required.");
                var clonedParamsSchema = isolatePlainData(protocol.cloneJson(paramsSchema, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }));
                validateSchemaDefinition(clonedParamsSchema, "registry." + toolId + "." + actionId + ".paramsSchema");
                var actionParamsSchema = protocol.deepFreeze(clonedParamsSchema);
                var risk = ownData(protocol, action, "risk", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local action risk must be an own data property.");
                var targetScope = ownData(protocol, action, "targetScope", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local action target scope must be an own data property.");
                var capabilityRevision = ownData(protocol, action, "capabilityRevision", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local action revision must be an own data property.");
                protocol.assertEnum(risk, protocol.RISK_LEVELS, "local action risk");
                if (risk === "external") { protocol.fail(protocol.ERROR_CODES.PERMISSION_DENIED, "External local actions are denied."); }
                outputActions[actionId] = Object.freeze({
                    id: actionId,
                    executable: true,
                    risk: risk,
                    targetScope: normalizeScope(targetScope, "local action targetScope"),
                    paramsSchema: actionParamsSchema,
                    capabilityRevision: protocol.assertNonEmptyString(capabilityRevision, "local action capabilityRevision")
                });
            });
            return Object.freeze({ id: toolId, actions: outputActions });
        }

        function snapshotDefinitions(definitions, kind) {
            var list = Array.isArray(definitions) ? definitions : Object.keys(definitions || {}).map(function (id) { return protocol.getOwnDataProperty(definitions, id); });
            var result = Object.create(null);
            list.forEach(function (definition) {
                if (!protocol.isPlainObject(definition)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability definition is invalid."); }
                var idKey = kind === "expression" ? "templateId" : "scriptId";
                var id = ownData(protocol, definition, idKey, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability id must be an own data property.");
                protocol.assertNonEmptyString(id, "local " + kind + " id");
                if (result[id]) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability id is duplicated."); }
                var sourceArgsSchema = ownData(protocol, definition, "argsSchema", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability args schema is required.");
                var clonedArgsSchema = isolatePlainData(protocol.cloneJson(sourceArgsSchema, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }));
                validateSchemaDefinition(clonedArgsSchema, "" + kind + "." + id + ".argsSchema");
                var argsSchema = protocol.deepFreeze(clonedArgsSchema);
                var risk = ownData(protocol, definition, "risk", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability risk must be an own data property.");
                var targetScope = ownData(protocol, definition, "targetScope", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability target scope must be an own data property.");
                var definitionRevision = ownData(protocol, definition, "definitionRevision", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local capability revision must be an own data property.");
                if (kind === "expression") {
                    if (risk !== "write" && risk !== "destructive") { protocol.fail(protocol.ERROR_CODES.EXPRESSION_NOT_ALLOWLISTED, "Expression risk must be local write or destructive."); }
                } else if (risk !== "script" && risk !== "destructive") {
                    protocol.fail(protocol.ERROR_CODES.SCRIPT_NOT_ALLOWLISTED, "Script risk must be local script or destructive.");
                }
                result[id] = Object.freeze({
                    id: id,
                    risk: risk,
                    targetScope: normalizeScope(targetScope, "local " + kind + " targetScope"),
                    argsSchema: argsSchema,
                    definitionRevision: protocol.assertNonEmptyString(definitionRevision, "local " + kind + " definitionRevision")
                });
            });
            return result;
        }

        var registry = Object.create(null);
        var registrySource = own(capabilities, "registry")
            ? ownData(protocol, capabilities, "registry", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "The local registry must be an own data property.")
            : {};
        (Array.isArray(registrySource) ? registrySource : Object.keys(registrySource).map(function (id) { return protocol.getOwnDataProperty(registrySource, id); })).forEach(function (tool) {
            if (!protocol.isPlainObject(tool)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool definition is invalid."); }
            var id = ownData(protocol, tool, "id", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local tool id must be an own data property.");
            protocol.assertNonEmptyString(id, "local tool id");
            registry[id] = snapshotTool(tool, id);
        });
        var expressionSource = own(capabilities, "expressionTemplates")
            ? ownData(protocol, capabilities, "expressionTemplates", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Expression templates must be an own data property.")
            : {};
        var scriptSource = own(capabilities, "scriptAllowlist")
            ? ownData(protocol, capabilities, "scriptAllowlist", protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "The script allowlist must be an own data property.")
            : {};
        var expressionTemplates = snapshotDefinitions(expressionSource, "expression");
        var scriptAllowlist = snapshotDefinitions(scriptSource, "script");

        function getTool(toolId) { return own(registry, toolId) ? registry[toolId] : null; }
        function getAction(tool, actionId) { return tool && own(tool.actions, actionId) ? tool.actions[actionId] : null; }
        function getDefinition(definitions, id) { return own(definitions, id) ? definitions[id] : null; }

        function ensureExpectedContext(target, expected) {
            if (expected !== undefined && target.contextFingerprint !== expected) { protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Proposal context fingerprint is stale.", { stage: "action-validate" }); }
        }

        function ensureTargetScope(target, allowed) {
            var type = targetType(target);
            if (allowed.indexOf("any") === -1 && allowed.indexOf(type) === -1) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "The target type is outside the local action scope.", { details: { targetType: type } });
            }
            return type;
        }

        function freezeValidatedAction(action) {
            protocol.validateNormalizedAction(action);
            var frozen = protocol.deepFreeze(protocol.cloneJson(action, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }));
            validatedActions.add(frozen);
            return frozen;
        }

        function validateToolAction(proposal, expectedContext) {
            var payload = proposal.payload;
            protocol.assertNoUnknownKeys(payload, ["toolId", "actionId", "params"], "action.payload");
            protocol.assertNonEmptyString(payload.toolId, "action.payload.toolId");
            protocol.assertNonEmptyString(payload.actionId, "action.payload.actionId");
            var tool = getTool(payload.toolId);
            if (!tool) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TOOL, "The local tool is not available.", { details: { toolId: payload.toolId } }); }
            var action = getAction(tool, payload.actionId);
            if (!action) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "The local tool action is not available.", { details: { toolId: payload.toolId, actionId: payload.actionId } }); }
            ensureExpectedContext(proposal.target, expectedContext);
            ensureTargetScope(proposal.target, action.targetScope);
            validateSchemaValue(payload.params, action.paramsSchema, "action.payload.params");
            var normalizedAction = {
                providerActionId: proposal.providerActionId,
                kind: "tool",
                title: proposal.title,
                rationale: proposal.rationale,
                risk: action.risk,
                target: protocol.cloneJson(proposal.target),
                payload: { toolId: payload.toolId, actionId: payload.actionId, params: protocol.cloneJson(payload.params, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }) },
                undoGroupLabel: proposal.undoGroupLabel,
                requiresConfirmation: action.risk !== "read",
                targetScope: action.targetScope,
                capabilityRevision: action.capabilityRevision
            };
            return { action: freezeValidatedAction(normalizedAction), definition: action, computedRisk: action.risk };
        }

        function validateExpressionAction(proposal, expectedContext) {
            var payload = proposal.payload;
            protocol.assertNoUnknownKeys(payload, ["templateId", "args", "expressionText", "preview"], "action.payload");
            protocol.assertNonEmptyString(payload.templateId, "action.payload.templateId");
            var definition = getDefinition(expressionTemplates, payload.templateId);
            if (!definition) { protocol.fail(protocol.ERROR_CODES.EXPRESSION_NOT_ALLOWLISTED, "The expression template is not locally allowlisted.", { details: { templateId: payload.templateId } }); }
            ensureExpectedContext(proposal.target, expectedContext);
            ensureTargetScope(proposal.target, definition.targetScope);
            if (!protocol.isPlainObject(payload.preview) || !own(payload.preview, "before") || !own(payload.preview, "after")) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Expression actions require a before/after preview."); }
            validateSchemaValue(payload.args, definition.argsSchema, "action.payload.args");
            protocol.assertJsonBudget(payload.preview, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            var display = {};
            if (payload.expressionText !== undefined) { display.displayExpressionPreview = protocol.assertString(payload.expressionText, "action.payload.expressionText", protocol.HARD_LIMITS.maxExpressionBytes); }
            var normalizedAction = {
                providerActionId: proposal.providerActionId,
                kind: "expression",
                title: proposal.title,
                rationale: proposal.rationale,
                risk: definition.risk,
                target: protocol.cloneJson(proposal.target),
                payload: { templateId: payload.templateId, args: protocol.cloneJson(payload.args, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }), preview: protocol.cloneJson(payload.preview, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }) },
                undoGroupLabel: proposal.undoGroupLabel,
                requiresConfirmation: true,
                targetScope: definition.targetScope,
                definitionRevision: definition.definitionRevision
            };
            return { action: freezeValidatedAction(normalizedAction), definition: definition, computedRisk: definition.risk, display: Object.freeze(display) };
        }

        function validateScriptAction(proposal, expectedContext) {
            var payload = proposal.payload;
            protocol.assertNoUnknownKeys(payload, ["scriptId", "args", "source"], "action.payload");
            protocol.assertNonEmptyString(payload.scriptId, "action.payload.scriptId", protocol.HARD_LIMITS.maxScriptIdBytes);
            var definition = getDefinition(scriptAllowlist, payload.scriptId);
            if (!definition) { protocol.fail(protocol.ERROR_CODES.SCRIPT_NOT_ALLOWLISTED, "The script is not locally allowlisted.", { details: { scriptId: payload.scriptId } }); }
            ensureExpectedContext(proposal.target, expectedContext);
            ensureTargetScope(proposal.target, definition.targetScope);
            validateSchemaValue(payload.args, definition.argsSchema, "action.payload.args");
            protocol.assertJsonBudget(payload.args, { maxBytes: protocol.HARD_LIMITS.maxScriptArgsBytes });
            var display = {};
            if (payload.source !== undefined) { display.displaySourcePreview = protocol.assertString(payload.source, "action.payload.source", protocol.HARD_LIMITS.maxDisplayScriptSourceBytes); }
            var normalizedAction = {
                providerActionId: proposal.providerActionId,
                kind: "script",
                title: proposal.title,
                rationale: proposal.rationale,
                risk: definition.risk,
                target: protocol.cloneJson(proposal.target),
                payload: { scriptId: payload.scriptId, args: protocol.cloneJson(payload.args, { maxBytes: protocol.HARD_LIMITS.maxScriptArgsBytes }) },
                undoGroupLabel: proposal.undoGroupLabel,
                requiresConfirmation: true,
                targetScope: definition.targetScope,
                definitionRevision: definition.definitionRevision
            };
            return { action: freezeValidatedAction(normalizedAction), definition: definition, computedRisk: definition.risk, display: Object.freeze(display) };
        }

        var authority = Object.freeze({
            isValidatedAction: function (action) { return Boolean(action && validatedActions.has(action)); }
        });
        trustedAuthorities.add(authority);
        authorityProtocols.set(authority, protocol);

        function validateActionProposal(proposal, options) {
            options = options || {};
            protocol.validateActionProposal(proposal);
            if (proposal.kind !== "script" && Object.prototype.hasOwnProperty.call(proposal.payload, "source")) {
                protocol.fail(protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Raw script source is only accepted by the script validator.");
            }
            if (proposal.kind !== "expression" && Object.prototype.hasOwnProperty.call(proposal.payload, "expressionText")) {
                protocol.fail(protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Raw expression previews are only accepted by the expression validator.");
            }
            if (proposal.kind === "tool") { return validateToolAction(proposal, options.expectedContextFingerprint); }
            if (proposal.kind === "expression") { return validateExpressionAction(proposal, options.expectedContextFingerprint); }
            if (proposal.kind === "script") { return validateScriptAction(proposal, options.expectedContextFingerprint); }
            protocol.fail(protocol.ERROR_CODES.UNKNOWN_ACTION_KIND, "The action kind is not supported.");
        }

        function tryValidateActionProposal(proposal, options) {
            try { return { ok: true, value: validateActionProposal(proposal, options) }; }
            catch (error) {
                var normalized = error instanceof protocol.VelaProtocolError ? error : new protocol.VelaProtocolError(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Action validation failed.", { stage: "action-validate" });
                return Object.freeze({ ok: false, error: protocol.createErrorEnvelope(normalized).error });
            }
        }

        return Object.freeze({
            authority: authority,
            getAction: getAction,
            getTool: getTool,
            isValidatedAction: authority.isValidatedAction,
            validateActionProposal: validateActionProposal,
            validateNumberBounds: validateNumberBounds,
            validateSchemaValue: validateSchemaValue,
            tryValidateActionProposal: tryValidateActionProposal
        });
    }

    return {
        createActionValidator: createActionValidator,
        isTrustedAuthority: isTrustedAuthority,
        isTrustedAuthorityForProtocol: isTrustedAuthorityForProtocol
    };
}));
