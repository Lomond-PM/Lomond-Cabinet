(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaProtocol";
    var LEGACY_REGISTRY_NAME = "__velaProtocolCoreModulesV1";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (hasOwn.call(target, BOOTSTRAP_NAME)) {
            var existingBootstrap = target[BOOTSTRAP_NAME];
            var bootstrapDescriptor = Object.getOwnPropertyDescriptor(target, BOOTSTRAP_NAME);
            if (bootstrapDescriptor && bootstrapDescriptor.configurable === false && bootstrapDescriptor.writable === false &&
                existingBootstrap && Object.isFrozen(existingBootstrap) && typeof existingBootstrap.getModule === "function" &&
                existingBootstrap.getModule(name) === target[name]) {
                throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered.");
            }
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap name is already occupied.");
        }
        if (hasOwn.call(target, LEGACY_REGISTRY_NAME) || hasOwn.call(target, name)) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "A Vela protocol global or legacy registry is already present.");
        }
        if (!Object.isExtensible(target)) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The browser global cannot host the Vela protocol bootstrap.");
        }
        var modules = Object.create(null);
        var bootstrap = Object.freeze({
            getModule: function (moduleName) {
                return hasOwn.call(modules, moduleName) ? modules[moduleName] : undefined;
            },
            hasModule: function (moduleName) {
                return hasOwn.call(modules, moduleName);
            },
            registerModule: function (moduleName, value) {
                if (hasOwn.call(modules, moduleName)) {
                    throw bootstrapError("MODULE_ALREADY_REGISTERED", moduleName + " is already registered.");
                }
                Object.defineProperty(modules, moduleName, {
                    configurable: false,
                    enumerable: true,
                    value: value,
                    writable: false
                });
                return value;
            }
        });
        var exported = Object.freeze(create());
        Object.defineProperty(target, BOOTSTRAP_NAME, {
            configurable: false,
            enumerable: false,
            value: bootstrap,
            writable: false
        });
        Object.defineProperty(target, name, {
            configurable: false,
            enumerable: true,
            value: exported,
            writable: false
        });
        bootstrap.registerModule(name, exported);
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory());
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var LEGACY_SCHEMA_VERSION = "1.0";
    var SCHEMA_VERSION = "1.1";
    var trustedProtocols = new WeakSet();
    var SUPPORTED_SCHEMA_VERSIONS = Object.freeze([LEGACY_SCHEMA_VERSION, SCHEMA_VERSION]);
    var PROTOCOLS = Object.freeze({
        REQUEST: "vela.model-request.v1",
        RESPONSE: "vela.model-response.v1"
    });
    var ENVELOPE_TYPES = Object.freeze({
        TEXT: "text",
        PLAN: "plan",
        ACTION_CANDIDATE: "actionCandidate",
        LOCAL_PROPOSAL: "localProposal",
        LOGICAL_PLAN_PROPOSAL: "logicalPlanProposal",
        ERROR: "error"
    });
    var ACTION_KINDS = Object.freeze(["tool", "expression", "script"]);
    var RISK_LEVELS = Object.freeze(["read", "write", "destructive", "script", "external"]);
    var PERMISSION_MODES = Object.freeze(["confirm-every-action", "confirm-plan", "full-access"]);
    var ERROR_CODES = Object.freeze({
        JSON_PARSE_FAILED: "JSON_PARSE_FAILED",
        DUPLICATE_JSON_KEY: "DUPLICATE_JSON_KEY",
        FENCED_JSON_AMBIGUOUS: "FENCED_JSON_AMBIGUOUS",
        SCHEMA_VERSION_UNSUPPORTED: "SCHEMA_VERSION_UNSUPPORTED",
        SCHEMA_VALIDATION_FAILED: "SCHEMA_VALIDATION_FAILED",
        UNSAFE_JSON_VALUE: "UNSAFE_JSON_VALUE",
        RUNTIME_CAPABILITY_UNAVAILABLE: "RUNTIME_CAPABILITY_UNAVAILABLE",
        MODULE_BOOTSTRAP_CONFLICT: "MODULE_BOOTSTRAP_CONFLICT",
        MODULE_ALREADY_REGISTERED: "MODULE_ALREADY_REGISTERED",
        UNTRUSTED_PLAN_STORE: "UNTRUSTED_PLAN_STORE",
        PROTOCOL_AUTHORITY_MISMATCH: "PROTOCOL_AUTHORITY_MISMATCH",
        PROVIDER_CONFIG_INVALID: "PROVIDER_CONFIG_INVALID",
        PROVIDER_REQUEST_IN_FLIGHT: "PROVIDER_REQUEST_IN_FLIGHT",
        PROVIDER_REQUEST_ABORTED: "PROVIDER_REQUEST_ABORTED",
        PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
        PROVIDER_CONNECTION_FAILED: "PROVIDER_CONNECTION_FAILED",
        PROVIDER_HTTP_ERROR: "PROVIDER_HTTP_ERROR",
        PROVIDER_RESPONSE_INVALID: "PROVIDER_RESPONSE_INVALID",
        PROVIDER_RESPONSE_TOO_LARGE: "PROVIDER_RESPONSE_TOO_LARGE",
        UNKNOWN_ACTION_KIND: "UNKNOWN_ACTION_KIND",
        UNKNOWN_TOOL: "UNKNOWN_TOOL",
        UNKNOWN_TOOL_ACTION: "UNKNOWN_TOOL_ACTION",
        UNKNOWN_TARGET: "UNKNOWN_TARGET",
        PARAM_OUT_OF_RANGE: "PARAM_OUT_OF_RANGE",
        PAYLOAD_BUDGET_EXCEEDED: "PAYLOAD_BUDGET_EXCEEDED",
        CAPABILITY_BUDGET_EXCEEDED: "CAPABILITY_BUDGET_EXCEEDED",
        CONTEXT_STALE: "CONTEXT_STALE",
        CONTEXT_VALUE_EVALUATION_DISALLOWED: "CONTEXT_VALUE_EVALUATION_DISALLOWED",
        CONTEXT_VALUE_UNSUPPORTED: "CONTEXT_VALUE_UNSUPPORTED",
        CONTEXT_VALUE_INVALID: "CONTEXT_VALUE_INVALID",
        PERMISSION_DENIED: "PERMISSION_DENIED",
        ACTION_NOT_EXECUTABLE: "ACTION_NOT_EXECUTABLE",
        EXPRESSION_NOT_ALLOWLISTED: "EXPRESSION_NOT_ALLOWLISTED",
        SCRIPT_NOT_ALLOWLISTED: "SCRIPT_NOT_ALLOWLISTED",
        VALIDATION_AUTHORITY_REQUIRED: "VALIDATION_AUTHORITY_REQUIRED",
        CANDIDATE_NOT_FOUND: "CANDIDATE_NOT_FOUND",
        CANDIDATE_STATE_INVALID: "CANDIDATE_STATE_INVALID",
        CANDIDATE_REPLAY: "CANDIDATE_REPLAY",
        LIFECYCLE_BLOCKED: "LIFECYCLE_BLOCKED",
        EXECUTION_BUSY: "EXECUTION_BUSY",
        VERIFICATION_UNAVAILABLE: "VERIFICATION_UNAVAILABLE",
        RESERVATION_INVALID: "RESERVATION_INVALID",
        PLAN_INVALID: "PLAN_INVALID",
        PLAN_FAILED: "PLAN_FAILED"
    });
    var STRUCTURED_ERROR_CODES = new Set(Object.keys(ERROR_CODES).map(function (key) {
        return ERROR_CODES[key];
    }));
    var HARD_LIMITS = Object.freeze({
        maxRequestJsonBytes: 64 * 1024,
        maxResponseJsonBytes: 256 * 1024,
        maxMessageBytes: 16 * 1024,
        maxStringBytes: 8 * 1024,
        maxTitleBytes: 256,
        maxUndoGroupLabelBytes: 128,
        maxRationaleBytes: 2 * 1024,
        maxErrorDetailsJsonBytes: 4 * 1024,
        maxArrayLength: 64,
        maxObjectProperties: 64,
        maxNestedDepth: 8,
        maxNumberAbs: 1000000,
        maxActionPayloadBytes: 16 * 1024,
        maxPlanPayloadBytes: 64 * 1024,
        maxExpressionBytes: 2 * 1024,
        maxDisplayScriptSourceBytes: 4 * 1024,
        maxScriptIdBytes: 128,
        maxScriptArgsBytes: 8 * 1024,
        maxPlanSteps: 8,
        maxLocalIdBytes: 128,
        maxIdCollisionRetries: 4
    });
    var LOCAL_ID_KINDS = Object.freeze(["session", "plan", "cand", "res", "confirm", "req"]);
    var TARGET_KEYS = Object.freeze([
        "contextFingerprint", "contextTier", "compId", "targetId", "layerId", "layerIndex",
        "layerIndices", "layerIds", "targetKind", "attribute", "propertyPath", "propertyMatchName", "propertyValueDigest",
        "expressionDigest", "name"
    ]);
    var RAW_ACTION_KEYS = Object.freeze([
        "providerActionId", "kind", "title", "rationale", "risk", "target", "payload",
        "undoGroupLabel", "requiresConfirmation"
    ]);
    var NORMALIZED_ACTION_KEYS = Object.freeze([
        "providerActionId", "kind", "title", "rationale", "risk", "target", "payload",
        "undoGroupLabel", "requiresConfirmation", "targetScope", "capabilityRevision",
        "definitionRevision"
    ]);
    var DANGEROUS_KEYS = new Set([
        "candidateid", "hostfunction", "evalscript", "source", "code", "scriptsource",
        "functionname", "method", "command", "jsx", "extendscript", "functionpath", "tojson",
        "hostpath", "filepath", "shell", "process", "network", "url", "prototype",
        "constructor", "__proto__"
    ]);
    var ERROR_DETAIL_KEYS = new Set([
        "field", "stage", "expected", "actualType", "limit", "count", "actionKind", "toolId",
        "actionId", "targetType", "schemaVersion", "type", "replayKey", "state", "lifecycle",
        "index", "totalSteps", "candidateId", "reason", "templateId", "scriptId", "required",
        "path", "minimum", "maximum"
    ]);
    var SAFE_ERROR_MESSAGES = Object.freeze({
        JSON_PARSE_FAILED: "Provider JSON could not be parsed.",
        DUPLICATE_JSON_KEY: "Provider JSON contains a duplicate key.",
        FENCED_JSON_AMBIGUOUS: "Provider JSON framing is ambiguous.",
        SCHEMA_VERSION_UNSUPPORTED: "The Vela schema version is not supported.",
        SCHEMA_VALIDATION_FAILED: "The Vela value failed schema validation.",
        UNSAFE_JSON_VALUE: "The Vela value is not safe JSON data.",
        RUNTIME_CAPABILITY_UNAVAILABLE: "Required protocol runtime capability is unavailable.",
        MODULE_BOOTSTRAP_CONFLICT: "The Vela browser module bootstrap conflicts with existing state.",
        MODULE_ALREADY_REGISTERED: "The Vela browser module is already registered.",
        UNTRUSTED_PLAN_STORE: "The execution guard requires a trusted plan store.",
        PROTOCOL_AUTHORITY_MISMATCH: "The validator authority belongs to another protocol instance.",
        PROVIDER_CONFIG_INVALID: "The local provider configuration is invalid.",
        PROVIDER_REQUEST_IN_FLIGHT: "A local provider request is already in flight.",
        PROVIDER_REQUEST_ABORTED: "The local provider request was cancelled.",
        PROVIDER_TIMEOUT: "The local provider request timed out.",
        PROVIDER_CONNECTION_FAILED: "The local provider connection failed.",
        PROVIDER_HTTP_ERROR: "The local provider returned an HTTP error.",
        PROVIDER_RESPONSE_INVALID: "The local provider response is invalid.",
        PROVIDER_RESPONSE_TOO_LARGE: "The local provider response exceeded its size limit.",
        UNKNOWN_ACTION_KIND: "The action kind is not supported.",
        UNKNOWN_TOOL: "The local tool is not available.",
        UNKNOWN_TOOL_ACTION: "The local tool action is not available.",
        UNKNOWN_TARGET: "The action target is not explicit and stable.",
        PARAM_OUT_OF_RANGE: "An action parameter is outside its allowed range.",
        PAYLOAD_BUDGET_EXCEEDED: "The protocol payload budget was exceeded.",
        CAPABILITY_BUDGET_EXCEEDED: "The capability budget was exceeded.",
        CONTEXT_STALE: "The bound context is stale.",
        CONTEXT_VALUE_EVALUATION_DISALLOWED: "The property value cannot be read while evaluation is enabled.",
        CONTEXT_VALUE_UNSUPPORTED: "The requested property value type is not supported.",
        CONTEXT_VALUE_INVALID: "The Host returned an invalid property value.",
        PERMISSION_DENIED: "The current permission snapshot does not allow execution.",
        ACTION_NOT_EXECUTABLE: "The local action is not executable.",
        EXPRESSION_NOT_ALLOWLISTED: "The expression template is not locally allowlisted.",
        SCRIPT_NOT_ALLOWLISTED: "The script is not locally allowlisted.",
        VALIDATION_AUTHORITY_REQUIRED: "A local validation authority is required.",
        CANDIDATE_NOT_FOUND: "The local candidate was not found.",
        CANDIDATE_STATE_INVALID: "The candidate lifecycle state is invalid.",
        CANDIDATE_REPLAY: "The candidate execution key has already been used.",
        LIFECYCLE_BLOCKED: "The application lifecycle does not permit execution.",
        EXECUTION_BUSY: "Another Vela execution is active.",
        VERIFICATION_UNAVAILABLE: "A mutation verifier is unavailable.",
        RESERVATION_INVALID: "The execution reservation is invalid.",
        PLAN_INVALID: "The immutable plan is invalid.",
        PLAN_FAILED: "The plan has already failed or been spent."
    });

    function VelaProtocolError(code, message, options) {
        options = options || {};
        this.name = "VelaProtocolError";
        this.code = code;
        this.stage = options.stage || "protocol";
        this.retryable = Boolean(options.retryable);
        this.details = options.details === undefined ? {} : options.details;
        this.message = message || SAFE_ERROR_MESSAGES[code] || "Vela protocol validation failed.";
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, VelaProtocolError);
        }
    }
    VelaProtocolError.prototype = Object.create(Error.prototype);
    VelaProtocolError.prototype.constructor = VelaProtocolError;

    function fail(code, message, options) {
        throw new VelaProtocolError(code, message, options);
    }

    function isPlainObject(value) {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }
        try {
            var prototype = Object.getPrototypeOf(value);
            return prototype === Object.prototype || prototype === null;
        } catch (error) {
            return false;
        }
    }

    function makeRuntimeError() {
        return new VelaProtocolError(ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, SAFE_ERROR_MESSAGES.RUNTIME_CAPABILITY_UNAVAILABLE, {
            stage: "runtime"
        });
    }

    function isTrustedProtocol(protocol) {
        return Boolean(protocol && trustedProtocols.has(protocol));
    }

    function createProtocol(runtime) {
        if (!runtime || typeof runtime.utf8ByteLength !== "function" || typeof runtime.sha256Hex !== "function" ||
            typeof runtime.randomId !== "function" || typeof runtime.now !== "function") {
            throw makeRuntimeError();
        }
        var utf8ByteLengthProvider = runtime.utf8ByteLength;
        var sha256HexProvider = runtime.sha256Hex;
        var randomIdProvider = runtime.randomId;
        var nowProvider = runtime.now;
        var logicalPlanValidator = null;
        function attachLogicalPlanContracts(module) {
            if (!module || !Object.isFrozen(module) || module.MODULE_REVISION !== "vela-logical-plan-contracts-v1" || typeof module.validateLogicalPlanProposal !== "function" || typeof module.isValidatedLogicalPlan !== "function") { throw makeRuntimeError(); }
            if (logicalPlanValidator === module.validateLogicalPlanProposal) { return true; }
            if (logicalPlanValidator) { throw makeRuntimeError(); }
            logicalPlanValidator = module.validateLogicalPlanProposal;
            return true;
        }
        function utf8ByteLength(value) {
            if (typeof value !== "string") {
                throw makeRuntimeError();
            }
            try {
                var result = utf8ByteLengthProvider(value);
                if (!Number.isInteger(result) || result < 0) {
                    throw makeRuntimeError();
                }
                return result;
            } catch (error) {
                if (error instanceof VelaProtocolError) {
                    throw error;
                }
                throw makeRuntimeError();
            }
        }
        function sha256Hex(value) {
            if (typeof value !== "string") {
                throw makeRuntimeError();
            }
            try {
                var result = sha256HexProvider(value);
                if (typeof result !== "string" || !/^[0-9a-f]{64}$/.test(result)) {
                    throw makeRuntimeError();
                }
                return result;
            } catch (error) {
                if (error instanceof VelaProtocolError) {
                    throw error;
                }
                throw makeRuntimeError();
            }
        }
        function randomId(prefix) {
            try {
                var kind = prefix;
                if (LOCAL_ID_KINDS.indexOf(kind) === -1) { throw makeRuntimeError(); }
                return assertLocalId(randomIdProvider(kind), kind);
            } catch (error) {
                if (error instanceof VelaProtocolError) {
                    throw makeRuntimeError();
                }
                throw makeRuntimeError();
            }
        }
        function now() {
            try {
                var result = nowProvider();
                if (typeof result !== "number" || !Number.isFinite(result) || Object.is(result, -0)) {
                    throw makeRuntimeError();
                }
                return result;
            } catch (error) {
                if (error instanceof VelaProtocolError) {
                    throw error;
                }
                throw makeRuntimeError();
            }
        }

        function normalizeString(value) {
            return value.normalize ? value.normalize("NFC") : value;
        }

        function effectiveLimit(requested, hard) {
            if (requested === undefined) {
                return hard;
            }
            if (!Number.isInteger(requested) || requested < 0) {
                fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "A protocol limit is invalid.");
            }
            return Math.min(requested, hard);
        }

        function assertString(value, label, maxBytes) {
            if (typeof value !== "string") {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A protocol string is invalid.", {
                    details: { field: label, actualType: typeof value }
                });
            }
            var normalized = normalizeString(value);
            var limit = maxBytes === undefined ? HARD_LIMITS.maxStringBytes : effectiveLimit(maxBytes, HARD_LIMITS.maxMessageBytes);
            if (utf8ByteLength(normalized) > limit) {
                fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "A protocol string exceeds its byte limit.", {
                    details: { field: label, limit: limit }
                });
            }
            return normalized;
        }

        function assertNonEmptyString(value, label, maxBytes) {
            var normalized = assertString(value, label, maxBytes);
            if (normalized.length === 0) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A required protocol string is empty.", {
                    details: { field: label }
                });
            }
            return normalized;
        }

        function assertFingerprint(value, label) {
            var normalized = assertNonEmptyString(value, label);
            if (!/^sha256:[0-9a-f]{64}$/.test(normalized)) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A fingerprint is not canonical SHA-256.", {
                    details: { field: label }
                });
            }
            return normalized;
        }

        function assertLocalId(value, kind) {
            if (LOCAL_ID_KINDS.indexOf(kind) === -1 || typeof value !== "string") {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local id is invalid.", { details: { field: kind } });
            }
            if (utf8ByteLength(value) > HARD_LIMITS.maxLocalIdBytes ||
                !new RegExp("^" + kind + "_[a-z0-9]{32,96}$").test(value)) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local id is invalid.", { details: { field: kind } });
            }
            return value;
        }

        function assertFiniteNumber(value, label) {
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A protocol number is not finite JSON data.", {
                    details: { field: label, actualType: typeof value }
                });
            }
            if (Math.abs(value) > HARD_LIMITS.maxNumberAbs) {
                fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "A protocol number exceeds its range.", {
                    details: { field: label, limit: HARD_LIMITS.maxNumberAbs }
                });
            }
        }

        function isDangerousKey(key) {
            return DANGEROUS_KEYS.has(String(key).toLowerCase());
        }

        function pathMatches(path, pattern) {
            var actual = path.join(".");
            var expected = pattern.split(".");
            var actualParts = actual ? actual.split(".") : [];
            if (expected.length !== actualParts.length) {
                return false;
            }
            return expected.every(function (part, index) {
                return part === "*" || part === actualParts[index];
            });
        }

        function dangerousPathAllowed(path, options) {
            return (options.allowDangerousPaths || []).some(function (pattern) {
                return pathMatches(path, pattern);
            });
        }

        function ownNames(value) {
            try {
                if (typeof Reflect !== "undefined" && Reflect.ownKeys) {
                    var keys = Reflect.ownKeys(value);
                    if (keys.some(function (key) { return typeof key !== "string"; })) {
                        fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Symbol properties are not JSON data.");
                    }
                    return keys;
                }
                return Object.getOwnPropertyNames(value);
            } catch (error) {
                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Object property inspection failed.");
            }
        }

        function dataDescriptor(value, key, path) {
            var descriptor;
            try {
                descriptor = Object.getOwnPropertyDescriptor(value, key);
            } catch (error) {
                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Object property inspection failed.", {
                    details: { path: path.join(".") }
                });
            }
            if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Accessor properties are not JSON data.", {
                    details: { path: path.join(".") }
                });
            }
            if (!descriptor.enumerable) {
                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Non-enumerable properties are not JSON data.", {
                    details: { path: path.join(".") }
                });
            }
            return descriptor.value;
        }

        function assertSafeJson(value, options) {
            options = options || {};
            var maxDepth = effectiveLimit(options.maxDepth, HARD_LIMITS.maxNestedDepth);
            var maxStringBytes = options.maxStringBytes === undefined ? HARD_LIMITS.maxStringBytes : effectiveLimit(options.maxStringBytes, HARD_LIMITS.maxMessageBytes);
            var active = typeof WeakSet !== "undefined" ? new WeakSet() : [];
            function isActive(item) {
                return active instanceof Array ? active.indexOf(item) !== -1 : active.has(item);
            }
            function addActive(item) {
                if (active instanceof Array) { active.push(item); } else { active.add(item); }
            }
            function removeActive(item) {
                if (active instanceof Array) { active.splice(active.indexOf(item), 1); } else { active.delete(item); }
            }
            function visit(item, depth, path) {
                if (depth > maxDepth) {
                    fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "JSON nesting depth exceeds the protocol limit.", {
                        details: { limit: maxDepth, path: path.join(".") }
                    });
                }
                if (item === null) {
                    return;
                }
                if (typeof item === "string") {
                    if (utf8ByteLength(normalizeString(item)) > maxStringBytes) {
                        fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "A JSON string exceeds the protocol limit.", {
                            details: { limit: maxStringBytes, path: path.join(".") }
                        });
                    }
                    return;
                }
                if (typeof item === "number") {
                    assertFiniteNumber(item, path.join(".") || "number");
                    return;
                }
                if (typeof item === "boolean") {
                    return;
                }
                if (typeof item !== "object") {
                    fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Only JSON-compatible primitive values are allowed.", {
                        details: { actualType: typeof item, path: path.join(".") }
                    });
                }
                if (isActive(item)) {
                    fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Circular references are not JSON data.", {
                        details: { path: path.join(".") }
                    });
                }
                addActive(item);
                try {
                    if (Array.isArray(item)) {
                        var arrayLengthDescriptor;
                        try { arrayLengthDescriptor = Object.getOwnPropertyDescriptor(item, "length"); }
                        catch (error) { fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Array inspection failed."); }
                        if (!arrayLengthDescriptor || arrayLengthDescriptor.get || arrayLengthDescriptor.set || !Object.prototype.hasOwnProperty.call(arrayLengthDescriptor, "value")) {
                            fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Array length must be a data property.");
                        }
                        var arrayLength = arrayLengthDescriptor.value;
                        if (!Number.isInteger(arrayLength) || arrayLength < 0 || arrayLength > HARD_LIMITS.maxArrayLength) {
                            fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "An array exceeds the protocol limit.", {
                                details: { limit: HARD_LIMITS.maxArrayLength, path: path.join(".") }
                            });
                        }
                        var arrayKeys = ownNames(item);
                        arrayKeys.forEach(function (key) {
                            if (key === "length") {
                                return;
                            }
                            if (!/^\d+$/.test(key) || Number(key) >= arrayLength) {
                                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Arrays may contain only indexed JSON values.", {
                                    details: { path: path.concat([key]).join(".") }
                                });
                            }
                            if (isDangerousKey(key)) {
                                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "A dangerous JSON key is not allowed.", {
                                    details: { path: path.concat([key]).join(".") }
                                });
                            }
                            visit(dataDescriptor(item, key, path.concat([key])), depth + 1, path.concat([key]));
                        });
                        for (var index = 0; index < arrayLength; index += 1) {
                            if (arrayKeys.indexOf(String(index)) === -1) {
                                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Sparse arrays are not JSON data.", {
                                    details: { path: path.concat([String(index)]).join(".") }
                                });
                            }
                        }
                    } else {
                        if (!isPlainObject(item)) {
                            fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Only ordinary JSON objects are allowed.", {
                                details: { path: path.join(".") }
                            });
                        }
                        var objectKeys = ownNames(item);
                        if (objectKeys.length > HARD_LIMITS.maxObjectProperties) {
                            fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "An object exceeds the protocol property limit.", {
                                details: { limit: HARD_LIMITS.maxObjectProperties, path: path.join(".") }
                            });
                        }
                        var normalizedKeys = Object.create(null);
                        objectKeys.forEach(function (key) {
                            var normalizedKey = normalizeString(key);
                            if (isDangerousKey(key) && !dangerousPathAllowed(path.concat([key]), options)) {
                                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "A dangerous JSON key is not allowed.", {
                                    details: { path: path.concat([key]).join(".") }
                                });
                            }
                            if (normalizedKeys[normalizedKey]) {
                                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unicode-normalized object keys collide.", {
                                    details: { path: path.join(".") }
                                });
                            }
                            normalizedKeys[normalizedKey] = true;
                            visit(dataDescriptor(item, key, path.concat([key])), depth + 1, path.concat([key]));
                        });
                    }
                } finally {
                    removeActive(item);
                }
            }
            visit(value, 0, []);
            return value;
        }

        function assertNoUnknownKeys(value, allowedKeys, label) {
            if (!isPlainObject(value)) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "An object is required.", {
                    details: { field: label }
                });
            }
            var allowed = new Set(allowedKeys);
            ownNames(value).forEach(function (key) {
                if (!allowed.has(key)) {
                    fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "An unknown field was supplied.", {
                        details: { field: label + "." + key }
                    });
                }
            });
        }

        function getOwnDataProperty(value, key) {
            return dataDescriptor(value, key, [String(key)]);
        }

        function canonicalStringify(value, options) {
            options = options || {};
            assertSafeJson(value, options);
            var maxStringBytes = options.maxStringBytes === undefined ? HARD_LIMITS.maxStringBytes : effectiveLimit(options.maxStringBytes, HARD_LIMITS.maxMessageBytes);
            function stringify(item, depth) {
                if (depth > effectiveLimit(options.maxDepth, HARD_LIMITS.maxNestedDepth)) {
                    fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "JSON nesting depth exceeds the protocol limit.", {
                        details: { limit: HARD_LIMITS.maxNestedDepth }
                    });
                }
                if (item === null) { return "null"; }
                if (typeof item === "string") {
                    var normalizedString = normalizeString(item);
                    if (utf8ByteLength(normalizedString) > maxStringBytes) {
                        fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "A JSON string exceeds the protocol limit.", {
                            details: { limit: maxStringBytes }
                        });
                    }
                    return JSON.stringify(normalizedString);
                }
                if (typeof item === "number") {
                    assertFiniteNumber(item, "number");
                    return JSON.stringify(item);
                }
                if (typeof item === "boolean") { return item ? "true" : "false"; }
                if (Array.isArray(item)) {
                    var arrayValues = ownNames(item).filter(function (key) { return key !== "length"; }).sort(function (left, right) { return Number(left) - Number(right); });
                    return "[" + arrayValues.map(function (key) { return stringify(dataDescriptor(item, key, [key]), depth + 1); }).join(",") + "]";
                }
                var pairs = ownNames(item).map(function (key) {
                    return { key: normalizeString(key), value: dataDescriptor(item, key, [key]) };
                }).sort(function (left, right) {
                    return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
                });
                return "{" + pairs.map(function (pair) {
                    return JSON.stringify(pair.key) + ":" + stringify(pair.value, depth + 1);
                }).join(",") + "}";
            }
            return stringify(value, 0);
        }

        function assertJsonBudget(value, options) {
            options = options || {};
            var json = canonicalStringify(value, options);
            var limit = effectiveLimit(options.maxBytes, HARD_LIMITS.maxResponseJsonBytes);
            var actual = utf8ByteLength(json);
            if (actual > limit) {
                fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Canonical JSON exceeds the protocol budget.", {
                    details: { limit: limit, count: actual }
                });
            }
            return json;
        }

        function cloneJson(value, options) {
            return JSON.parse(assertJsonBudget(value, options));
        }

        function deepFreeze(value, active) {
            if (!value || typeof value !== "object" || Object.isFrozen(value)) {
                return value;
            }
            active = active || [];
            if (active.indexOf(value) !== -1) {
                fail(ERROR_CODES.UNSAFE_JSON_VALUE, "Circular references are not JSON data.");
            }
            active.push(value);
            ownNames(value).forEach(function (key) {
                if (Array.isArray(value) && key === "length") { return; }
                deepFreeze(dataDescriptor(value, key, [key]), active);
            });
            active.pop();
            return Object.freeze(value);
        }

        function assertSchemaVersion(value) {
            if (typeof value !== "string" || !/^\d+\.\d+$/.test(value) || SUPPORTED_SCHEMA_VERSIONS.indexOf(value) === -1) {
                fail(ERROR_CODES.SCHEMA_VERSION_UNSUPPORTED, SAFE_ERROR_MESSAGES.SCHEMA_VERSION_UNSUPPORTED, {
                    details: { schemaVersion: typeof value === "string" ? value : null }
                });
            }
            return value;
        }
        function assertProtocol(value, expected, label) {
            if (value !== expected) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "The protocol discriminator is invalid.", {
                    details: { field: label, expected: expected }
                });
            }
        }
        function assertEnum(value, allowed, label) {
            if (allowed.indexOf(value) === -1) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "An enum value is unsupported.", {
                    details: { field: label, actualType: typeof value }
                });
            }
            return value;
        }

        function validateTarget(target) {
            assertSafeJson(target);
            if (!isPlainObject(target)) {
                fail(ERROR_CODES.UNKNOWN_TARGET, SAFE_ERROR_MESSAGES.UNKNOWN_TARGET);
            }
            assertNoUnknownKeys(target, TARGET_KEYS, "target");
            assertFingerprint(target.contextFingerprint, "target.contextFingerprint");
            if (target.contextTier !== undefined && (!Number.isInteger(target.contextTier) || target.contextTier < 0 || target.contextTier > 3)) {
                fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "The target context tier is invalid.");
            }
            ["compId", "targetId", "layerId", "targetKind", "attribute", "propertyMatchName", "propertyValueDigest", "expressionDigest", "name"].forEach(function (key) {
                if (target[key] !== undefined) { assertString(target[key], "target." + key); }
            });
            if (target.layerIndex !== undefined && (!Number.isInteger(target.layerIndex) || target.layerIndex < 1 || target.layerIndex > HARD_LIMITS.maxNumberAbs)) {
                fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "The target layer index is invalid.");
            }
            ["layerIndices", "layerIds"].forEach(function (key) {
                if (target[key] !== undefined) {
                    if (!Array.isArray(target[key]) || target[key].length > HARD_LIMITS.maxArrayLength) {
                        fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "The target array exceeds its limit.");
                    }
                    target[key].forEach(function (item, index) {
                        if (key === "layerIndices") {
                            if (!Number.isInteger(item) || item < 1 || item > HARD_LIMITS.maxNumberAbs) {
                                fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "A target layer index is invalid.", { details: { index: index } });
                            }
                        } else {
                            assertString(item, "target.layerIds[" + index + "]");
                        }
                    });
                }
            });
            if (target.propertyPath !== undefined) {
                if (!Array.isArray(target.propertyPath) || target.propertyPath.length === 0 || target.propertyPath.length > HARD_LIMITS.maxArrayLength) {
                    fail(ERROR_CODES.UNKNOWN_TARGET, "The target property path is invalid.");
                }
                target.propertyPath.forEach(function (part, index) {
                    if (typeof part === "string") { assertString(part, "target.propertyPath[" + index + "]"); }
                    else if (!Number.isInteger(part)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "The target property path is invalid."); }
                });
            }
            if (!target.targetId && !target.compId && !target.layerId && !target.layerIndex &&
                !(target.layerIndices && target.layerIndices.length) && !(target.layerIds && target.layerIds.length) &&
                !target.propertyPath && !target.propertyMatchName && !(target.targetKind === "layer-attribute" && target.attribute === "name")) {
                fail(ERROR_CODES.UNKNOWN_TARGET, "The target has no stable explicit reference.");
            }
            return target;
        }

        function validateRawAction(action) {
            assertSafeJson(action, { allowDangerousPaths: ["payload.source", "payload.expressionText"] });
            if (!isPlainObject(action)) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Action proposal must be an object.");
            }
            assertNoUnknownKeys(action, RAW_ACTION_KEYS, "action");
            if (action.providerActionId !== undefined) { assertString(action.providerActionId, "action.providerActionId"); }
            if (ACTION_KINDS.indexOf(action.kind) === -1) {
                fail(ERROR_CODES.UNKNOWN_ACTION_KIND, SAFE_ERROR_MESSAGES.UNKNOWN_ACTION_KIND, { details: { actionKind: action.kind } });
            }
            assertNonEmptyString(action.title, "action.title", HARD_LIMITS.maxTitleBytes);
            assertString(action.rationale, "action.rationale", HARD_LIMITS.maxRationaleBytes);
            assertEnum(action.risk, RISK_LEVELS, "action.risk");
            validateTarget(action.target);
            if (!isPlainObject(action.payload)) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Action payload must be an object.");
            }
            assertJsonBudget(action.payload, {
                maxBytes: HARD_LIMITS.maxActionPayloadBytes,
                allowDangerousPaths: ["source", "expressionText"]
            });
            assertNonEmptyString(action.undoGroupLabel, "action.undoGroupLabel", HARD_LIMITS.maxUndoGroupLabelBytes);
            if (typeof action.requiresConfirmation !== "boolean") {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Action confirmation flag is invalid.");
            }
            return action;
        }

        function validateNormalizedAction(action) {
            assertSafeJson(action);
            if (!isPlainObject(action)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Normalized action must be an object."); }
            assertNoUnknownKeys(action, NORMALIZED_ACTION_KEYS, "normalizedAction");
            if (ACTION_KINDS.indexOf(action.kind) === -1) { fail(ERROR_CODES.UNKNOWN_ACTION_KIND, SAFE_ERROR_MESSAGES.UNKNOWN_ACTION_KIND); }
            assertNonEmptyString(action.title, "normalizedAction.title", HARD_LIMITS.maxTitleBytes);
            assertString(action.rationale, "normalizedAction.rationale", HARD_LIMITS.maxRationaleBytes);
            assertEnum(action.risk, RISK_LEVELS.filter(function (risk) { return risk !== "external"; }), "normalizedAction.risk");
            validateTarget(action.target);
            if (!isPlainObject(action.payload)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Normalized action payload must be an object."); }
            assertJsonBudget(action.payload, { maxBytes: HARD_LIMITS.maxActionPayloadBytes });
            assertNonEmptyString(action.undoGroupLabel, "normalizedAction.undoGroupLabel", HARD_LIMITS.maxUndoGroupLabelBytes);
            if (typeof action.requiresConfirmation !== "boolean") { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Normalized action confirmation flag is invalid."); }
            if (typeof action.targetScope !== "string" && !Array.isArray(action.targetScope)) {
                fail(ERROR_CODES.UNKNOWN_TARGET, "Normalized action target scope is required.");
            }
            if (action.capabilityRevision === undefined && action.definitionRevision === undefined) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Normalized action capability revision is required.");
            }
            if (action.capabilityRevision !== undefined) { assertNonEmptyString(action.capabilityRevision, "normalizedAction.capabilityRevision"); }
            if (action.definitionRevision !== undefined) { assertNonEmptyString(action.definitionRevision, "normalizedAction.definitionRevision"); }
            return action;
        }

        function validateCanonicalRequest(request) {
            assertSafeJson(request);
            if (!isPlainObject(request)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Canonical request must be an object."); }
            assertNoUnknownKeys(request, ["protocol", "schemaVersion", "requestId", "model", "messages", "responseFormat", "context"], "request");
            assertProtocol(request.protocol, PROTOCOLS.REQUEST, "request.protocol");
            assertSchemaVersion(request.schemaVersion);
            assertNonEmptyString(request.requestId, "request.requestId");
            assertNonEmptyString(request.model, "request.model");
            if (!Array.isArray(request.messages) || request.messages.length > HARD_LIMITS.maxArrayLength) { fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Request messages exceed the limit."); }
            request.messages.forEach(function (message, index) {
                if (!isPlainObject(message)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A request message is invalid.", { details: { index: index } }); }
                assertNoUnknownKeys(message, ["role", "content"], "request.messages[" + index + "]");
                assertEnum(message.role, ["system", "user", "assistant"], "request.messages[" + index + "].role");
                assertString(message.content, "request.messages[" + index + "].content", HARD_LIMITS.maxMessageBytes);
            });
            if (!isPlainObject(request.responseFormat)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Request responseFormat is invalid."); }
            assertNoUnknownKeys(request.responseFormat, ["type", "schemaId"], "request.responseFormat");
            assertEnum(request.responseFormat.type, ["json_object"], "request.responseFormat.type");
            assertNonEmptyString(request.responseFormat.schemaId, "request.responseFormat.schemaId");
            if (!isPlainObject(request.context)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Request context is invalid."); }
            assertNoUnknownKeys(request.context, ["contextId", "fingerprint", "tier"], "request.context");
            assertNonEmptyString(request.context.contextId, "request.context.contextId");
            assertFingerprint(request.context.fingerprint, "request.context.fingerprint");
            if (!Number.isInteger(request.context.tier) || request.context.tier < 0 || request.context.tier > 3) { fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "Request context tier is invalid."); }
            assertJsonBudget(request, { maxBytes: HARD_LIMITS.maxRequestJsonBytes, maxStringBytes: HARD_LIMITS.maxMessageBytes });
            return request;
        }

        function normalizePermissionSnapshot(snapshot) {
            assertSafeJson(snapshot);
            if (!isPlainObject(snapshot)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Permission snapshot must be an object."); }
            assertNoUnknownKeys(snapshot, ["mode", "grants", "policyRevision"], "permissionSnapshot");
            assertEnum(snapshot.mode, PERMISSION_MODES, "permissionSnapshot.mode");
            if (!Array.isArray(snapshot.grants) || snapshot.grants.length > HARD_LIMITS.maxArrayLength) { fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Permission grants exceed the limit."); }
            var grants = snapshot.grants.map(function (grant, index) { return assertNonEmptyString(grant, "permissionSnapshot.grants[" + index + "]"); });
            grants = Array.from(new Set(grants)).sort();
            var normalized = { mode: snapshot.mode, grants: grants, policyRevision: assertNonEmptyString(snapshot.policyRevision, "permissionSnapshot.policyRevision") };
            assertJsonBudget(normalized, { maxBytes: HARD_LIMITS.maxActionPayloadBytes });
            return normalized;
        }

        function validatePermissionSnapshot(snapshot) { return normalizePermissionSnapshot(snapshot); }

        function validateStructuredError(errorValue) {
            assertSafeJson(errorValue, { allowDangerousPaths: ["code", "stage", "message", "details.candidateId"] });
            if (!isPlainObject(errorValue)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Structured error is invalid."); }
            assertNoUnknownKeys(errorValue, ["code", "stage", "retryable", "message", "details"], "error");
            if (!STRUCTURED_ERROR_CODES.has(errorValue.code)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Structured error code is invalid."); }
            assertNonEmptyString(errorValue.stage, "error.stage");
            if (typeof errorValue.retryable !== "boolean") { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Structured error retryable flag is invalid."); }
            assertString(errorValue.message, "error.message", HARD_LIMITS.maxRationaleBytes);
            if (errorValue.details !== undefined) {
                if (!isPlainObject(errorValue.details)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Structured error details are invalid."); }
                assertNoUnknownKeys(errorValue.details, Array.from(ERROR_DETAIL_KEYS), "error.details");
                assertJsonBudget(errorValue.details, {
                    maxBytes: HARD_LIMITS.maxErrorDetailsJsonBytes,
                    allowDangerousPaths: ["candidateId"]
                });
            }
            return errorValue;
        }

        function validateLocalProposal(proposal) {
            var name;
            if (!isPlainObject(proposal)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local proposal is invalid."); }
            assertNoUnknownKeys(proposal, ["capabilityId", "params"], "response.envelope.proposal");
            if (!isPlainObject(proposal.params)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local proposal parameters are invalid."); }
            if (proposal.capabilityId === "set-opacity-v1") {
                assertNoUnknownKeys(proposal.params, ["opacity"], "response.envelope.proposal.params");
                if (Object.keys(proposal.params).length !== 1) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local proposal opacity is required."); }
                assertFiniteNumber(proposal.params.opacity, "response.envelope.proposal.params.opacity");
                if (Object.is(proposal.params.opacity, -0) || proposal.params.opacity < 0 || proposal.params.opacity > 100) { fail(ERROR_CODES.PARAM_OUT_OF_RANGE, "Local proposal opacity is out of range."); }
            } else if (proposal.capabilityId === "set-layer-name-v1") {
                assertNoUnknownKeys(proposal.params, ["name"], "response.envelope.proposal.params");
                if (Object.keys(proposal.params).length !== 1) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local proposal layer name is required."); }
                name = getOwnDataProperty(proposal.params, "name");
                if (typeof name !== "string" || name.length === 0 || /^\s+$/.test(name) || /[\u0000-\u001f\u007f-\u009f]/.test(name)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local proposal layer name is invalid."); }
                if (utf8ByteLength(name) > 256) { fail(ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Local proposal layer name exceeds its UTF-8 byte limit."); }
            } else {
                fail(ERROR_CODES.UNKNOWN_TOOL_ACTION, "Local proposal capability is unavailable.");
            }
            return proposal;
        }

        function validateEnvelope(envelope, schemaVersion) {
            if (!isPlainObject(envelope)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Response envelope is invalid."); }
            if (typeof envelope.type !== "string") { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Response envelope type is required."); }
            if (envelope.type === ENVELOPE_TYPES.TEXT) {
                assertNoUnknownKeys(envelope, ["type", "text"], "response.envelope");
                assertString(envelope.text, "response.envelope.text", HARD_LIMITS.maxMessageBytes);
            } else if (envelope.type === ENVELOPE_TYPES.PLAN) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider plans are not accepted by this protocol version.");
                assertNoUnknownKeys(envelope, ["type", "summary", "proposals"], "response.envelope");
                assertString(envelope.summary, "response.envelope.summary", HARD_LIMITS.maxMessageBytes);
                if (!Array.isArray(envelope.proposals) || envelope.proposals.length > HARD_LIMITS.maxPlanSteps) { fail(ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Plan steps exceed the limit."); }
                envelope.proposals.forEach(validateRawAction);
                assertJsonBudget(envelope.proposals.map(function (proposal) { return proposal.payload; }), { maxBytes: HARD_LIMITS.maxPlanPayloadBytes });
            } else if (envelope.type === ENVELOPE_TYPES.ACTION_CANDIDATE) {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider action candidates are not accepted by this protocol version.");
                assertNoUnknownKeys(envelope, ["type", "proposal"], "response.envelope");
                validateRawAction(envelope.proposal);
            } else if (envelope.type === ENVELOPE_TYPES.LOCAL_PROPOSAL) {
                if (schemaVersion !== SCHEMA_VERSION) { fail(ERROR_CODES.SCHEMA_VERSION_UNSUPPORTED, SAFE_ERROR_MESSAGES.SCHEMA_VERSION_UNSUPPORTED); }
                assertNoUnknownKeys(envelope, ["type", "proposal"], "response.envelope");
                validateLocalProposal(envelope.proposal);
            } else if (envelope.type === ENVELOPE_TYPES.LOGICAL_PLAN_PROPOSAL) {
                if (schemaVersion !== SCHEMA_VERSION) { fail(ERROR_CODES.SCHEMA_VERSION_UNSUPPORTED, SAFE_ERROR_MESSAGES.SCHEMA_VERSION_UNSUPPORTED); }
                if (!logicalPlanValidator) { fail(ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, SAFE_ERROR_MESSAGES.RUNTIME_CAPABILITY_UNAVAILABLE); }
                try { logicalPlanValidator(envelope); }
                catch (logicalPlanError) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Logical plan proposal is invalid."); }
            } else if (envelope.type === ENVELOPE_TYPES.ERROR) {
                assertNoUnknownKeys(envelope, ["type", "error"], "response.envelope");
                validateStructuredError(envelope.error);
            } else {
                fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Response envelope type is unsupported.", { details: { type: envelope.type } });
            }
            return envelope;
        }

        function validateCanonicalResponse(response) {
            assertSafeJson(response, {
                allowDangerousPaths: [
                    "envelope.proposal.payload.source", "envelope.proposal.payload.expressionText",
                    "envelope.proposals.*.payload.source", "envelope.proposals.*.payload.expressionText",
                    "envelope.error.code", "envelope.error.stage", "envelope.error.message",
                    "envelope.error.details.candidateId"
                ]
            });
            if (!isPlainObject(response)) { fail(ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Canonical response must be an object."); }
            assertNoUnknownKeys(response, ["protocol", "schemaVersion", "requestId", "provider", "model", "envelope"], "response");
            assertProtocol(response.protocol, PROTOCOLS.RESPONSE, "response.protocol");
            assertSchemaVersion(response.schemaVersion);
            assertNonEmptyString(response.requestId, "response.requestId");
            assertNonEmptyString(response.provider, "response.provider");
            assertNonEmptyString(response.model, "response.model");
            validateEnvelope(response.envelope, response.schemaVersion);
            assertJsonBudget(response, {
                maxBytes: HARD_LIMITS.maxResponseJsonBytes,
                maxStringBytes: HARD_LIMITS.maxMessageBytes,
                allowDangerousPaths: [
                    "envelope.proposal.payload.source", "envelope.proposal.payload.expressionText",
                    "envelope.proposals.*.payload.source", "envelope.proposals.*.payload.expressionText",
                    "envelope.error.code", "envelope.error.stage", "envelope.error.message",
                    "envelope.error.details.candidateId"
                ]
            });
            if (response.envelope.type === ENVELOPE_TYPES.ERROR) {
                var providerError = response.envelope.error;
                var safeResponse = {
                    protocol: response.protocol,
                    schemaVersion: response.schemaVersion,
                    requestId: response.requestId,
                    provider: response.provider,
                    model: response.model,
                    envelope: {
                        type: ENVELOPE_TYPES.ERROR,
                        error: {
                            code: providerError.code,
                            stage: providerError.stage,
                            retryable: providerError.retryable,
                            message: SAFE_ERROR_MESSAGES[providerError.code] || "The provider returned an error response.",
                            details: {}
                        }
                    }
                };
                validateEnvelope(safeResponse.envelope, safeResponse.schemaVersion);
                return deepFreeze(cloneJson(safeResponse, {
                    maxBytes: HARD_LIMITS.maxResponseJsonBytes,
                    allowDangerousPaths: ["envelope.error.code", "envelope.error.stage", "envelope.error.message", "envelope.error.details.candidateId"]
                }));
            }
            return response;
        }

        function sanitizeErrorDetails(details) {
            if (!isPlainObject(details)) { return {}; }
            var output = Object.create(null);
            Object.keys(details).forEach(function (key) {
                if (!ERROR_DETAIL_KEYS.has(key)) { return; }
                var descriptor;
                try { descriptor = Object.getOwnPropertyDescriptor(details, key); }
                catch (error) { return; }
                if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) { return; }
                var value = descriptor.value;
                if (typeof value === "string") {
                    try { output[key] = assertString(value, "error.details." + key, HARD_LIMITS.maxStringBytes); }
                    catch (error) { return; }
                } else if (typeof value === "number") {
                    try { assertFiniteNumber(value, "error.details." + key); output[key] = value; }
                    catch (error) { return; }
                } else if (typeof value === "boolean") {
                    output[key] = value;
                }
            });
            return output;
        }

        function createErrorEnvelope(error, options) {
            options = options || {};
            var source = error instanceof VelaProtocolError ? error : new VelaProtocolError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, SAFE_ERROR_MESSAGES.SCHEMA_VALIDATION_FAILED, { stage: options.stage || "protocol" });
            var safeStage = typeof source.stage === "string" && source.stage.length ? source.stage : "protocol";
            var errorValue = {
                code: STRUCTURED_ERROR_CODES.has(source.code) ? source.code : ERROR_CODES.SCHEMA_VALIDATION_FAILED,
                stage: assertString(safeStage, "error.stage"),
                retryable: Boolean(source.retryable),
                message: SAFE_ERROR_MESSAGES[source.code] || SAFE_ERROR_MESSAGES.SCHEMA_VALIDATION_FAILED,
                details: sanitizeErrorDetails(source.details)
            };
            validateStructuredError(errorValue);
            return deepFreeze(cloneJson({ type: ENVELOPE_TYPES.ERROR, error: errorValue }, {
                maxBytes: HARD_LIMITS.maxErrorDetailsJsonBytes + HARD_LIMITS.maxRationaleBytes,
                allowDangerousPaths: ["error.code", "error.stage", "error.message", "error.details.candidateId"]
            }));
        }

        function createCanonicalErrorResponse(error, metadata) {
            metadata = metadata || {};
            var requestId = typeof metadata.requestId === "string" && metadata.requestId.length ? metadata.requestId : "unknown";
            var provider = typeof metadata.provider === "string" && metadata.provider.length ? metadata.provider : "unknown";
            var model = typeof metadata.model === "string" && metadata.model.length ? metadata.model : "unknown";
            assertString(requestId, "response.requestId");
            assertString(provider, "response.provider");
            assertString(model, "response.model");
            var response = {
                protocol: PROTOCOLS.RESPONSE,
                schemaVersion: SCHEMA_VERSION,
                requestId: requestId,
                provider: provider,
                model: model,
                envelope: createErrorEnvelope(error, metadata)
            };
            return deepFreeze(cloneJson(response, {
                maxBytes: HARD_LIMITS.maxResponseJsonBytes,
                allowDangerousPaths: ["envelope.error.code", "envelope.error.stage", "envelope.error.message", "envelope.error.details.candidateId"]
            }));
        }

        function sha256Canonical(value, options) {
            var canonical = assertJsonBudget(value, options);
            return "sha256:" + sha256Hex(canonical);
        }

        var protocolApi = {
            ACTION_KINDS: ACTION_KINDS,
            ACTION_KEYS: RAW_ACTION_KEYS,
            NORMALIZED_ACTION_KEYS: NORMALIZED_ACTION_KEYS,
            ENVELOPE_TYPES: ENVELOPE_TYPES,
            ERROR_CODES: ERROR_CODES,
            HARD_LIMITS: HARD_LIMITS,
            PERMISSION_MODES: PERMISSION_MODES,
            PROTOCOLS: PROTOCOLS,
            RISK_LEVELS: RISK_LEVELS,
            SCHEMA_VERSION: SCHEMA_VERSION,
            SUPPORTED_SCHEMA_VERSIONS: SUPPORTED_SCHEMA_VERSIONS,
            TARGET_KEYS: TARGET_KEYS,
            VelaProtocolError: VelaProtocolError,
            assertEnum: assertEnum,
            assertFingerprint: assertFingerprint,
            assertFiniteNumber: assertFiniteNumber,
            assertJsonBudget: assertJsonBudget,
            assertLocalId: assertLocalId,
            assertNoUnknownKeys: assertNoUnknownKeys,
            assertNonEmptyString: assertNonEmptyString,
            assertSafeJson: assertSafeJson,
            assertSchemaVersion: assertSchemaVersion,
            assertString: assertString,
            attachLogicalPlanContracts: attachLogicalPlanContracts,
            canonicalStringify: canonicalStringify,
            cloneJson: cloneJson,
            createCanonicalErrorResponse: createCanonicalErrorResponse,
            createErrorEnvelope: createErrorEnvelope,
            deepFreeze: deepFreeze,
            fail: fail,
            getOwnDataProperty: getOwnDataProperty,
            isPlainObject: isPlainObject,
            normalizeString: normalizeString,
            now: now,
            randomId: randomId,
            sha256Canonical: sha256Canonical,
            sha256Hex: sha256Hex,
            utf8ByteLength: utf8ByteLength,
            validateActionProposal: validateRawAction,
            validateNormalizedAction: validateNormalizedAction,
            validateCanonicalRequest: validateCanonicalRequest,
            validateCanonicalResponse: validateCanonicalResponse,
            validateEnvelope: validateEnvelope,
            validatePermissionSnapshot: validatePermissionSnapshot,
            validateStructuredError: validateStructuredError,
            validateTarget: validateTarget
        };
        trustedProtocols.add(protocolApi);
        return Object.freeze(protocolApi);
    }

    return {
        ACTION_KINDS: ACTION_KINDS,
        ACTION_KEYS: RAW_ACTION_KEYS,
        NORMALIZED_ACTION_KEYS: NORMALIZED_ACTION_KEYS,
        ENVELOPE_TYPES: ENVELOPE_TYPES,
        ERROR_CODES: ERROR_CODES,
        HARD_LIMITS: HARD_LIMITS,
        LOCAL_ID_KINDS: LOCAL_ID_KINDS,
        PERMISSION_MODES: PERMISSION_MODES,
        PROTOCOLS: PROTOCOLS,
        RISK_LEVELS: RISK_LEVELS,
        SCHEMA_VERSION: SCHEMA_VERSION,
        SUPPORTED_SCHEMA_VERSIONS: SUPPORTED_SCHEMA_VERSIONS,
        TARGET_KEYS: TARGET_KEYS,
        VelaProtocolError: VelaProtocolError,
        createProtocol: createProtocol,
        isTrustedProtocol: isTrustedProtocol
    };
}));
