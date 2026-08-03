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

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol"))));
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
    var HOST_INSTANCE_ID_PATTERN = /^host_[a-f0-9]{48}$/;

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.assertSafeJson !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return protocol;
    }

    function createContextApi(protocol) {
        protocol = requireProtocol(protocol);

        function isNegativeZero(value) { return value === 0 && 1 / value === -Infinity; }

        function assertExactString(value, field, maximumBytes) {
            var index;
            var code;
            if (typeof value !== "string") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, field + " must be a string."); }
            for (index = 0; index < value.length; index += 1) {
                code = value.charCodeAt(index);
                if (code >= 0xD800 && code <= 0xDBFF) {
                    if (index + 1 >= value.length || value.charCodeAt(index + 1) < 0xDC00 || value.charCodeAt(index + 1) > 0xDFFF) {
                        protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, field + " contains an unpaired surrogate.");
                    }
                    index += 1;
                } else if (code >= 0xDC00 && code <= 0xDFFF) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, field + " contains an unpaired surrogate."); }
            }
            if (protocol.utf8ByteLength(value) > maximumBytes) { protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, field + " exceeds its byte budget."); }
            return value;
        }

        function canonicalNumberV1(value) {
            var parts;
            var mantissa;
            var exponent;
            if (typeof value !== "number" || !Number.isFinite(value) || isNegativeZero(value) || Math.abs(value) > protocol.HARD_LIMITS.maxNumberAbs) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Property value number is invalid.");
            }
            if (value === 0) { return "0"; }
            parts = value.toExponential(16).split("e");
            mantissa = parts[0].replace(/0+$/, "").replace(/\.$/, "");
            exponent = parts[1].replace(/^\+/, "").replace(/^(-?)0+(\d)/, "$1$2");
            if (exponent === "" || exponent === "-") { exponent = "0"; }
            return mantissa + "e" + exponent;
        }

        function normalizeNumberArray(value) {
            var lengthDescriptor;
            var names;
            var length;
            var nativeProfile;
            var normalized = [];
            var index;
            var descriptor;
            if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value array is unsupported."); }
            try { lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length"); names = Object.getOwnPropertyNames(value); }
            catch (ignoredDescriptor) { protocol.fail(protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Property value array descriptors are unsafe."); }
            nativeProfile = !lengthDescriptor && names.indexOf("length") === -1;
            if (nativeProfile) { length = value.length; }
            else {
                if (!lengthDescriptor || lengthDescriptor.get || lengthDescriptor.set || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") || names.indexOf("length") === -1) {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value array length is invalid.");
                }
                length = lengthDescriptor.value;
            }
            if (!Number.isInteger(length) || length < 1 || length > 4 || names.length !== length + (nativeProfile ? 0 : 1)) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Property value array length is invalid.");
            }
            for (index = 0; index < length; index += 1) {
                if (names.indexOf(String(index)) === -1) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value array is sparse."); }
                try { descriptor = Object.getOwnPropertyDescriptor(value, String(index)); }
                catch (ignoredIndexDescriptor) { protocol.fail(protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Property value array descriptors are unsafe."); }
                if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.enumerable !== true) {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value array index is invalid.");
                }
                normalized.push(canonicalNumberV1(descriptor.value));
            }
            names.forEach(function (key) {
                if (key !== "length" && !/^(0|[1-9]\d*)$/.test(key)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value array has an extra property."); }
            });
            return normalized;
        }

        function normalizePropertyValue(value) {
            var data;
            if (value === null) { return Object.freeze({ kind: "null", data: null }); }
            if (typeof value === "boolean") { return Object.freeze({ kind: "boolean", data: value }); }
            if (typeof value === "number") { return Object.freeze({ kind: "number", data: canonicalNumberV1(value) }); }
            if (typeof value === "string") { return Object.freeze({ kind: "string", data: assertExactString(value, "propertyValue", 1024) }); }
            if (Array.isArray(value)) { data = normalizeNumberArray(value); return Object.freeze({ kind: "number-array", data: Object.freeze(data) }); }
            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value type is unsupported.");
        }

        function payloadForPropertyValue(kind, data) {
            var output;
            if (kind === "null") { return "null"; }
            if (kind === "boolean") { return data ? "1" : "0"; }
            if (kind === "number" || kind === "string") { return data; }
            if (kind === "number-array") {
                output = "v1\0" + data.length;
                data.forEach(function (item) { output += "\0" + protocol.utf8ByteLength(item) + "\0" + item; });
                return output;
            }
            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value kind is invalid.");
        }

        function digestPropertyValue(kind, value) {
            var normalized = normalizePropertyValue(value);
            var payload;
            if (normalized.kind !== kind) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value kind does not match its payload."); }
            payload = payloadForPropertyValue(normalized.kind, normalized.data);
            return "sha256:" + protocol.sha256Hex("vela-property-value-v1\0" + normalized.kind + "\0" + protocol.utf8ByteLength(payload) + "\0" + payload);
        }

        function describePropertyValue(kind, value) {
            var normalized = normalizePropertyValue(value);
            var payload;
            if (normalized.kind !== kind) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value kind does not match its payload."); }
            payload = payloadForPropertyValue(normalized.kind, normalized.data);
            return Object.freeze({
                valueKind: normalized.kind,
                valueDigest: "sha256:" + protocol.sha256Hex("vela-property-value-v1\0" + normalized.kind + "\0" + protocol.utf8ByteLength(payload) + "\0" + payload),
                payloadBytes: protocol.utf8ByteLength(payload)
            });
        }

        function fingerprintPropertyValueCapture(snapshot) {
            var allowed = ["fingerprintSchemaVersion", "bindingFingerprint", "sessionId", "bridgeLifecycleEpoch", "hostInstanceId", "hostReloadEpoch", "projectGeneration", "compId", "tier", "purpose", "sampleTime", "targetOrderMeaningful", "targets"];
            var normalized;
            var targets;
            protocol.assertSafeJson(snapshot);
            if (!protocol.isPlainObject(snapshot)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value capture fingerprint input is invalid."); }
            protocol.assertNoUnknownKeys(snapshot, allowed, "propertyValueCapture");
            if (protocol.getOwnDataProperty(snapshot, "fingerprintSchemaVersion") !== "property-value-capture-v1" ||
                protocol.getOwnDataProperty(snapshot, "tier") !== 3 || protocol.getOwnDataProperty(snapshot, "purpose") !== "property-value-binding" ||
                protocol.getOwnDataProperty(snapshot, "targetOrderMeaningful") !== true) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value capture fingerprint input is invalid.");
            }
            protocol.assertFingerprint(protocol.getOwnDataProperty(snapshot, "bindingFingerprint"), "propertyValueCapture.bindingFingerprint");
            protocol.assertNonEmptyString(protocol.getOwnDataProperty(snapshot, "sessionId"), "propertyValueCapture.sessionId", protocol.HARD_LIMITS.maxLocalIdBytes);
            if (!Number.isInteger(protocol.getOwnDataProperty(snapshot, "bridgeLifecycleEpoch")) || protocol.getOwnDataProperty(snapshot, "bridgeLifecycleEpoch") < 1 ||
                !Number.isInteger(protocol.getOwnDataProperty(snapshot, "hostReloadEpoch")) || protocol.getOwnDataProperty(snapshot, "hostReloadEpoch") < 1 ||
                !Number.isInteger(protocol.getOwnDataProperty(snapshot, "projectGeneration")) || protocol.getOwnDataProperty(snapshot, "projectGeneration") < 1) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Property value capture fingerprint identity is invalid.");
            }
            protocol.assertNonEmptyString(protocol.getOwnDataProperty(snapshot, "hostInstanceId"), "propertyValueCapture.hostInstanceId", 64);
            protocol.assertNonEmptyString(protocol.getOwnDataProperty(snapshot, "compId"), "propertyValueCapture.compId", 256);
            if (typeof protocol.getOwnDataProperty(snapshot, "sampleTime") !== "number" || !Number.isFinite(protocol.getOwnDataProperty(snapshot, "sampleTime")) ||
                isNegativeZero(protocol.getOwnDataProperty(snapshot, "sampleTime")) || protocol.getOwnDataProperty(snapshot, "sampleTime") < 0) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Property value sample time is invalid.");
            }
            targets = protocol.getOwnDataProperty(snapshot, "targets");
            if (!Array.isArray(targets) || targets.length < 1 || targets.length > 4) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Property value capture targets are invalid."); }
            normalized = {
                fingerprintSchemaVersion: "property-value-capture-v1",
                bindingFingerprint: protocol.getOwnDataProperty(snapshot, "bindingFingerprint"),
                sessionId: protocol.getOwnDataProperty(snapshot, "sessionId"),
                bridgeLifecycleEpoch: protocol.getOwnDataProperty(snapshot, "bridgeLifecycleEpoch"),
                hostInstanceId: protocol.getOwnDataProperty(snapshot, "hostInstanceId"),
                hostReloadEpoch: protocol.getOwnDataProperty(snapshot, "hostReloadEpoch"),
                projectGeneration: protocol.getOwnDataProperty(snapshot, "projectGeneration"),
                compId: protocol.getOwnDataProperty(snapshot, "compId"),
                tier: 3,
                purpose: "property-value-binding",
                sampleTime: protocol.getOwnDataProperty(snapshot, "sampleTime"),
                targetOrderMeaningful: true,
                targets: targets.map(function (target, index) {
                    var allowedTarget = ["layerId", "propertyPath", "propertyMatchName", "valueKind", "valueDigest"];
                    if (!protocol.isPlainObject(target)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value capture target is invalid."); }
                    protocol.assertNoUnknownKeys(target, allowedTarget, "propertyValueCapture.targets[" + index + "]");
                    return {
                        layerId: protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "layerId"), "propertyValueCapture.targets[" + index + "].layerId", 256),
                        propertyPath: normalizePropertyPath(protocol.getOwnDataProperty(target, "propertyPath")),
                        propertyMatchName: protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "propertyMatchName"), "propertyValueCapture.targets[" + index + "].propertyMatchName", 56),
                        valueKind: protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "valueKind"), "propertyValueCapture.targets[" + index + "].valueKind", 32),
                        valueDigest: protocol.assertFingerprint(protocol.getOwnDataProperty(target, "valueDigest"), "propertyValueCapture.targets[" + index + "].valueDigest")
                    };
                })
            };
            return Object.freeze({
                input: protocol.deepFreeze(protocol.cloneJson(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes })),
                fingerprint: protocol.sha256Canonical(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes })
            });
        }

        function normalizePropertyValueTarget(target) {
            var allowed = ["targetOrdinal", "nativeLayerId", "layerIndex", "propertyPath", "propertyMatchName", "value"];
            var value;
            var normalized;
            if (!protocol.isPlainObject(target)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value target is invalid."); }
            protocol.assertNoUnknownKeys(target, allowed, "propertyValueTarget");
            if (!Number.isInteger(protocol.getOwnDataProperty(target, "targetOrdinal")) || protocol.getOwnDataProperty(target, "targetOrdinal") < 0 ||
                    !Number.isInteger(protocol.getOwnDataProperty(target, "nativeLayerId")) || protocol.getOwnDataProperty(target, "nativeLayerId") < 1 ||
                    !Number.isInteger(protocol.getOwnDataProperty(target, "layerIndex")) || protocol.getOwnDataProperty(target, "layerIndex") < 1) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Property value target identity is invalid.");
            }
            value = protocol.getOwnDataProperty(target, "value");
            if (!protocol.isPlainObject(value)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value target payload is invalid."); }
            protocol.assertNoUnknownKeys(value, ["kind", "data"], "propertyValueTarget.value");
            normalized = normalizePropertyValue(protocol.getOwnDataProperty(value, "data"));
            if (normalized.kind !== protocol.getOwnDataProperty(value, "kind")) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value target kind is invalid."); }
            return protocol.deepFreeze({
                targetOrdinal: protocol.getOwnDataProperty(target, "targetOrdinal"), nativeLayerId: protocol.getOwnDataProperty(target, "nativeLayerId"), layerIndex: protocol.getOwnDataProperty(target, "layerIndex"),
                propertyPath: normalizePropertyPath(protocol.getOwnDataProperty(target, "propertyPath")),
                propertyMatchName: protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "propertyMatchName"), "propertyValueTarget.propertyMatchName", 56),
                value: { kind: normalized.kind, data: normalized.data }
            });
        }

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

        function normalizePropertyPath(propertyPath) {
            if (!Array.isArray(propertyPath) || propertyPath.length === 0 || propertyPath.length > 36 || propertyPath.length % 3 !== 0) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "context.target propertyPath is invalid.");
            }
            return propertyPath.map(function (part, index) {
                var offset = index % 3;
                if (offset === 0) {
                    if (part !== "named" && part !== "indexed") {
                        protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "context.target property access mode is invalid.");
                    }
                    return part;
                }
                if (offset === 1) {
                    return protocol.assertNonEmptyString(part, "context.target.propertyPath[" + index + "]", 56);
                }
                if (!Number.isInteger(part) || (propertyPath[index - 2] === "named" ? part !== 0 : part < 1 || part > protocol.HARD_LIMITS.maxNumberAbs)) {
                    protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "context.target property index is invalid.", { details: { index: index } });
                }
                return part;
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
                output.propertyPath = normalizePropertyPath(output.propertyPath);
                output.propertyMatchName = protocol.assertNonEmptyString(output.propertyMatchName, "context.target.propertyMatchName", 56);
                if (output.propertyPath[output.propertyPath.length - 2] !== output.propertyMatchName) {
                    protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "context.target property match name does not match its path.");
                }
            }
            return output;
        }

        function normalizeHostAuthority(snapshot, requireStableContext) {
            var hasInstanceId = Object.prototype.hasOwnProperty.call(snapshot, "hostInstanceId");
            var hasReloadEpoch = Object.prototype.hasOwnProperty.call(snapshot, "hostReloadEpoch");
            if (hasInstanceId !== hasReloadEpoch || (requireStableContext && (!hasInstanceId || !hasReloadEpoch))) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Stable context requires Host authority.", {
                    stage: "context-fingerprint"
                });
            }
            if (!hasInstanceId) { return undefined; }
            var hostInstanceId = protocol.getOwnDataProperty(snapshot, "hostInstanceId");
            var hostReloadEpoch = protocol.getOwnDataProperty(snapshot, "hostReloadEpoch");
            if (typeof hostInstanceId !== "string" || !HOST_INSTANCE_ID_PATTERN.test(hostInstanceId) ||
                protocol.utf8ByteLength(hostInstanceId) !== 53) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Host instance identity is invalid.", {
                    stage: "context-fingerprint"
                });
            }
            if (!Number.isInteger(hostReloadEpoch) || hostReloadEpoch < 1 ||
                hostReloadEpoch > protocol.HARD_LIMITS.maxNumberAbs) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Host reload epoch is invalid.", {
                    stage: "context-fingerprint"
                });
            }
            return { hostInstanceId: hostInstanceId, hostReloadEpoch: hostReloadEpoch };
        }

        function buildFingerprintInput(snapshot, options) {
            options = options || {};
            if (!protocol.isPlainObject(options)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context options must be an object."); }
            protocol.assertNoUnknownKeys(options, ["selectionOrderMeaningful", "bindsToDisplayName", "requireStableContext"], "context.options");
            options = Object.assign({ selectionOrderMeaningful: true, bindsToDisplayName: false, requireStableContext: false }, options);
            protocol.assertSafeJson(snapshot);
            if (!protocol.isPlainObject(snapshot)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context snapshot must be an object."); }
            protocol.assertNoUnknownKeys(snapshot, [
                "tier", "sessionId", "hostInstanceId", "hostReloadEpoch", "activeComp", "selection", "target", "relevantToolState", "actionScope", "requiredFields"
            ].concat(OMIT_KEYS), "context.snapshot");
            var tier = snapshot.tier === undefined ? 1 : snapshot.tier;
            if (!Number.isInteger(tier) || tier < 0 || tier > 3) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Context tier is invalid."); }
            if (options.requireStableContext && !snapshot.sessionId) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Executable context requires a session identity."); }
            var input = { fingerprintSchemaVersion: "1", tier: tier };
            if (snapshot.sessionId !== undefined) { input.sessionId = protocol.assertString(snapshot.sessionId, "context.sessionId"); }
            var hostAuthority = normalizeHostAuthority(snapshot, options.requireStableContext);
            if (hostAuthority) {
                input.hostInstanceId = hostAuthority.hostInstanceId;
                input.hostReloadEpoch = hostAuthority.hostReloadEpoch;
            }
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
            canonicalNumberV1: canonicalNumberV1,
            describePropertyValue: describePropertyValue,
            digestPropertyValue: digestPropertyValue,
            fingerprintPropertyValueCapture: fingerprintPropertyValueCapture,
            normalizePropertyPath: normalizePropertyPath,
            normalizePropertyValue: normalizePropertyValue,
            normalizePropertyValueTarget: normalizePropertyValueTarget,
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
