(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaContext";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertProtocolModule(dependency) {
        if (!dependency || typeof dependency.createProtocol !== "function" || typeof dependency.isTrustedProtocol !== "function" || !dependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaContext requires VelaProtocol.");
        }
        return dependency;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaContext requires the Vela protocol bootstrap."); }
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

    var trustedContextApis = new WeakMap();

    var OMIT_KEYS = Object.freeze([
        "capturedAt", "timestamp", "locale", "displayLanguage", "homeOrder", "provider", "model",
        "credentials", "rawCredentials", "unrelatedProjectData"
    ]);
    var EXECUTION_SETTINGS_KEYS = Object.freeze([
        "capabilityPolicyRevision", "registrySchemaRevision", "hostAdapterRevision",
        "expressionTemplateRevision", "scriptRegistryRevision", "targetResolutionRevision"
    ]);

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.assertSafeJson !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return protocol;
    }

    function createContextApi(protocol) {
        protocol = requireProtocol(protocol);

        function stableIdentity(value) {
            if (!value || typeof value !== "object") { return String(value); }
            return String(value.layerId || value.targetId || value.compId || "");
        }

        function requireOwnIdentity(value, key, label) {
            if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, key) ||
                typeof protocol.getOwnDataProperty(value, key) !== "string" || !protocol.getOwnDataProperty(value, key).length) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "A context item has no stable session-local identity.", {
                    stage: "context-fingerprint",
                    details: { field: label }
                });
            }
            return protocol.assertNonEmptyString(protocol.getOwnDataProperty(value, key), label + "." + key);
        }

        function normalizeValue(value, options, key, depth) {
            options = options || {};
            depth = depth || 0;
            if (depth > protocol.HARD_LIMITS.maxNestedDepth) {
                protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Context nesting depth exceeds the protocol limit.", {
                    stage: "context-fingerprint",
                    details: { limit: protocol.HARD_LIMITS.maxNestedDepth }
                });
            }
            if (OMIT_KEYS.indexOf(key) !== -1) { return undefined; }
            if (typeof value === "string") { return protocol.assertString(value, key || "context string"); }
            if (typeof value === "number") { protocol.assertFiniteNumber(value, key || "context number"); return value; }
            if (value === null || typeof value === "boolean") { return value; }
            if (Array.isArray(value)) {
                var normalizedArray = value.map(function (item) { return normalizeValue(item, options, key, depth + 1); });
                if (key === "layerIds" || key === "selectedLayerIds") {
                    return normalizedArray.slice().sort();
                }
                if (key === "selection" && options.selectionOrderMeaningful === false) {
                    return normalizedArray.slice().sort(function (left, right) {
                        return stableIdentity(left).localeCompare(stableIdentity(right));
                    });
                }
                return normalizedArray;
            }
            if (protocol.isPlainObject(value)) {
                var output = Object.create(null);
                Object.keys(value).sort().forEach(function (childKey) {
                    var child = normalizeValue(protocol.getOwnDataProperty(value, childKey), options, childKey, depth + 1);
                    if (child !== undefined) { output[childKey] = child; }
                });
                return output;
            }
            protocol.fail(protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Context contains a non-JSON value.", {
                stage: "context-fingerprint"
            });
        }

        function normalizeActiveComp(activeComp, options) {
            if (activeComp === undefined || activeComp === null) { return undefined; }
            if (!protocol.isPlainObject(activeComp)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "activeComp must be an object."); }
            var allowed = ["compId", "itemType", "type", "width", "height", "duration", "frameRate", "pixelAspect", "name"];
            protocol.assertNoUnknownKeys(activeComp, allowed, "context.activeComp");
            requireOwnIdentity(activeComp, "compId", "activeComp");
            var output = Object.create(null);
            allowed.forEach(function (key) {
                if (key === "name" && !options.bindsToDisplayName) { return; }
                if (Object.prototype.hasOwnProperty.call(activeComp, key)) {
                    output[key] = normalizeValue(protocol.getOwnDataProperty(activeComp, key), options, key, 0);
                }
            });
            return output;
        }

        function normalizeSelection(selection, options) {
            if (selection === undefined) { return undefined; }
            if (!Array.isArray(selection) || selection.length > protocol.HARD_LIMITS.maxArrayLength) {
                protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Selection exceeds the context limit.");
            }
            var allowed = ["layerId", "layerIndex", "matchName", "type", "selectedOrder", "name"];
            var seenLayerIds = Object.create(null);
            return selection.map(function (layer, index) {
                if (!protocol.isPlainObject(layer)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Selection item is invalid.", { details: { index: index } }); }
                protocol.assertNoUnknownKeys(layer, allowed, "context.selection[" + index + "]");
                var layerId = requireOwnIdentity(layer, "layerId", "selection[" + index + "]");
                if (seenLayerIds[layerId]) {
                    protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Selection contains a duplicate stable layer identity.", { details: { index: index } });
                }
                seenLayerIds[layerId] = true;
                var output = Object.create(null);
                allowed.forEach(function (key) {
                    if (key === "name" && !options.bindsToDisplayName) { return; }
                    if (key === "selectedOrder" && options.selectionOrderMeaningful === false) { return; }
                    if (Object.prototype.hasOwnProperty.call(layer, key)) {
                        output[key] = normalizeValue(protocol.getOwnDataProperty(layer, key), options, key, 0);
                    }
                });
                return output;
            }).sort(function (left, right) {
                return options.selectionOrderMeaningful === false ? stableIdentity(left).localeCompare(stableIdentity(right)) : 0;
            });
        }

        function normalizeTarget(target, options) {
            if (target === undefined || target === null) { return undefined; }
            if (!protocol.isPlainObject(target)) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "context.target must be an object."); }
            var allowed = ["targetId", "compId", "layerId", "layerIndex", "layerIndices", "layerIds", "propertyPath", "propertyMatchName", "propertyValueDigest", "expressionDigest", "name"];
            protocol.assertNoUnknownKeys(target, allowed, "context.target");
            var output = Object.create(null);
            allowed.forEach(function (key) {
                if (key === "name" && !options.bindsToDisplayName) { return; }
                if (Object.prototype.hasOwnProperty.call(target, key)) {
                    output[key] = normalizeValue(protocol.getOwnDataProperty(target, key), options, key, 0);
                }
            });
            requireOwnIdentity(output, "compId", "context.target");
            var hasLayerReference = output.layerId !== undefined || output.layerIndex !== undefined ||
                output.layerIndices !== undefined || output.layerIds !== undefined || output.propertyPath !== undefined ||
                output.propertyMatchName !== undefined;
            if (hasLayerReference) {
                requireOwnIdentity(output, "layerId", "context.target");
            }
            var hasPropertyReference = output.propertyPath !== undefined || output.propertyMatchName !== undefined ||
                output.propertyValueDigest !== undefined || output.expressionDigest !== undefined;
            if (hasPropertyReference) {
                if (!Array.isArray(output.propertyPath) || output.propertyPath.length === 0 || output.propertyPath.length > 24 || output.propertyPath.length % 2 !== 0) {
                    protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "context.target propertyPath is invalid.");
                }
                output.propertyPath.forEach(function (part, index) {
                    if (index % 2 === 0) {
                        protocol.assertNonEmptyString(part, "context.target.propertyPath[" + index + "]");
                    } else if (!Number.isInteger(part) || part < 1 || part > protocol.HARD_LIMITS.maxNumberAbs) {
                        protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "context.target property index is invalid.", { details: { index: index } });
                    }
                });
                protocol.assertNonEmptyString(output.propertyMatchName, "context.target.propertyMatchName");
                if (output.propertyPath[output.propertyPath.length - 2] !== output.propertyMatchName) {
                    protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "context.target property match name does not match its path.");
                }
            }
            return output;
        }

        function buildFingerprintInput(snapshot, options) {
            options = options || {};
            if (!protocol.isPlainObject(options)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context options must be an object."); }
            protocol.assertNoUnknownKeys(options, ["selectionOrderMeaningful", "bindsToDisplayName", "requireStableContext"], "context.options");
            options = Object.assign({ selectionOrderMeaningful: true, bindsToDisplayName: false, requireStableContext: false }, options);
            protocol.assertSafeJson(snapshot);
            if (!protocol.isPlainObject(snapshot)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context snapshot must be an object."); }
            protocol.assertNoUnknownKeys(snapshot, [
                "tier", "sessionId", "activeComp", "selection", "target", "relevantToolState", "actionScope", "requiredFields"
            ].concat(OMIT_KEYS), "context.snapshot");
            var tier = snapshot.tier === undefined ? 1 : snapshot.tier;
            if (!Number.isInteger(tier) || tier < 0 || tier > 3) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Context tier is invalid."); }
            if (options.requireStableContext && !snapshot.sessionId) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Executable context requires a session identity."); }
            var input = { fingerprintSchemaVersion: "1", tier: tier };
            if (snapshot.sessionId !== undefined) { input.sessionId = protocol.assertString(snapshot.sessionId, "context.sessionId"); }
            var activeComp = normalizeActiveComp(snapshot.activeComp, options);
            if (activeComp !== undefined) { input.activeComp = activeComp; }
            var selection = normalizeSelection(snapshot.selection, options);
            if (selection !== undefined) { input.selection = selection; }
            var target = normalizeTarget(snapshot.target, options);
            if (target !== undefined) { input.target = target; }
            ["relevantToolState", "actionScope", "requiredFields"].forEach(function (key) {
                if (snapshot[key] !== undefined) {
                    input[key] = normalizeValue(protocol.getOwnDataProperty(snapshot, key), options, key, 0);
                }
            });
            return input;
        }

        function fingerprintContext(snapshot, options) {
            var input = buildFingerprintInput(snapshot, options);
            var canonicalJson = protocol.assertJsonBudget(input, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            return { input: input, canonicalJson: canonicalJson, fingerprint: protocol.sha256Canonical(input, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }) };
        }

        function captureContext(snapshot, options) {
            var result = fingerprintContext(snapshot, options);
            return protocol.deepFreeze({
                snapshot: protocol.cloneJson(result.input, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }),
                fingerprint: result.fingerprint
            });
        }

        function fingerprintSettings(settings) {
            if (settings === undefined) { settings = {}; }
            protocol.assertSafeJson(settings);
            if (!protocol.isPlainObject(settings)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution settings must be an object."); }
            protocol.assertNoUnknownKeys(settings, EXECUTION_SETTINGS_KEYS, "executionSettings");
            var normalized = Object.create(null);
            EXECUTION_SETTINGS_KEYS.forEach(function (key) {
                if (settings[key] !== undefined) { normalized[key] = protocol.assertNonEmptyString(protocol.getOwnDataProperty(settings, key), "executionSettings." + key); }
            });
            return protocol.sha256Canonical(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
        }

        var contextApi = {
            buildFingerprintInput: buildFingerprintInput,
            captureContext: captureContext,
            fingerprintContext: fingerprintContext,
            fingerprintSettings: fingerprintSettings,
            normalizeActiveComp: normalizeActiveComp,
            normalizeSelection: normalizeSelection,
            normalizeTarget: normalizeTarget,
            normalizeValue: normalizeValue
        };
        trustedContextApis.set(contextApi, protocol);
        return Object.freeze(contextApi);
    }

    function isTrustedContextApiForProtocol(contextApi, protocol) {
        return Boolean(contextApi && protocolModule.isTrustedProtocol(protocol) && trustedContextApis.get(contextApi) === protocol);
    }

    return {
        createContextApi: createContextApi,
        isTrustedContextApiForProtocol: isTrustedContextApiForProtocol
    };
}));
