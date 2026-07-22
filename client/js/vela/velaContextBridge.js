(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaContextBridge";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertProtocolModule(value) {
        if (!value || typeof value.createProtocol !== "function" || typeof value.isTrustedProtocol !== "function" || !value.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaContextBridge requires VelaProtocol.");
        }
        return value;
    }

    function assertContextModule(value) {
        if (!value || typeof value.createContextApi !== "function" || typeof value.isTrustedContextApiForProtocol !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaContextBridge requires VelaContext.");
        }
        return value;
    }

    function ownData(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela module registry cannot be inspected."); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela module registry is invalid.");
        }
        return descriptor.value;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaContextBridge requires the Vela protocol bootstrap.");
        }
        var bootstrap = ownData(target, BOOTSTRAP_NAME);
        if (!bootstrap || !Object.isFrozen(bootstrap)) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap is invalid.");
        }
        var getModule = ownData(bootstrap, "getModule");
        var hasModule = ownData(bootstrap, "hasModule");
        var registerModule = ownData(bootstrap, "registerModule");
        if (typeof getModule !== "function" || typeof hasModule !== "function" || typeof registerModule !== "function") {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap methods are invalid.");
        }
        var protocol = getModule.call(bootstrap, "VelaProtocol");
        var context = getModule.call(bootstrap, "VelaContext");
        if (hasModule.call(bootstrap, "VelaProtocol") !== true || hasModule.call(bootstrap, "VelaContext") !== true ||
            target.VelaProtocol !== protocol || target.VelaContext !== context) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela context bridge dependency identity is invalid.");
        }
        if (hasModule.call(bootstrap, name)) {
            throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered.");
        }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with existing state.");
        }
        var exported = Object.freeze(create(assertProtocolModule(protocol), assertContextModule(context)));
        registerModule.call(bootstrap, name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol")), assertContextModule(require("./velaContext"))));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, contextModule) {
    "use strict";

    var REQUEST_PROTOCOL = "vela.host-context-request.v1";
    var RESULT_PROTOCOL = "vela.host-context-result.v1";
    var SCHEMA_VERSION = "1.0";
    var HOST_ADAPTER_REVISION = "vela-context-host-v4";
    var FIXED_FACADE_PREFIX = "AE" + "Toolbox.VelaContext.handle(";
    var HOST_ERROR_CODES = Object.freeze([
        "HOST_CONTEXT_REQUEST_INVALID",
        "HOST_CONTEXT_OPERATION_UNSUPPORTED",
        "HOST_CONTEXT_BUDGET_EXCEEDED",
        "HOST_CONTEXT_UNAVAILABLE",
        "HOST_CONTEXT_TARGET_NOT_FOUND",
        "HOST_CONTEXT_SESSION_RESET_REQUIRED",
        "HOST_CONTEXT_READ_FAILED",
        "HOST_CONTEXT_AUTHORITY_MISMATCH",
        "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED",
        "HOST_CONTEXT_VALUE_UNSUPPORTED",
        "HOST_CONTEXT_VALUE_INVALID"
    ]);
    var HOST_INSTANCE_ID_PATTERN = /^host_[a-f0-9]{48}$/;
    var CAPTURE_REASON_UNTRUSTED = "CONTEXT_CAPTURE_UNTRUSTED";
    var CAPTURE_REASON_NOT_EXECUTABLE = "CONTEXT_CAPTURE_NOT_EXECUTABLE";
    var CAPTURE_REASON_AUTHORITY_MISMATCH = "CONTEXT_AUTHORITY_MISMATCH";
    var CAPTURE_REASON_INCOMPATIBLE = "CONTEXT_CAPTURE_INCOMPATIBLE";
    var CAPTURE_REASON_STALE = "CONTEXT_STALE";
    var MAX_PROPERTY_VALUE_BYTES = 1024;
    var MAX_PROPERTY_VALUE_AGGREGATE_BYTES = 4096;
    var SAMPLE_TIME_TOLERANCE = 0.0000001;
    var trustedContextBridges = new WeakSet();
    var contextBridgeProtocols = new WeakMap();

    function isTrustedContextBridge(bridge) {
        return Boolean(bridge && trustedContextBridges.has(bridge));
    }

    function isTrustedContextBridgeForProtocol(bridge, protocol) {
        return Boolean(isTrustedContextBridge(bridge) && protocolModule.isTrustedProtocol(protocol) && contextBridgeProtocols.get(bridge) === protocol);
    }

    function protocolError(protocol, code, stage) {
        return new protocol.VelaProtocolError(code, undefined, { stage: stage || "context-bridge" });
    }

    function requireOwnFunction(value, key, protocol) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || typeof descriptor.value !== "function") {
            throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return descriptor.value;
    }

    function quoteForExtendScript(value) {
        var output = "\"";
        var i;
        var code;
        var hex;
        for (i = 0; i < value.length; i++) {
            code = value.charCodeAt(i);
            if (code >= 0x20 && code <= 0x7E && code !== 0x22 && code !== 0x5C) {
                output += value.charAt(i);
            } else if (code === 0x22) {
                output += "\\\"";
            } else if (code === 0x5C) {
                output += "\\\\";
            } else {
                hex = code.toString(16);
                while (hex.length < 4) { hex = "0" + hex; }
                output += "\\u" + hex;
            }
        }
        return output + "\"";
    }

    function createContextBridge(options) {
        var protocolDescriptor;
        try { protocolDescriptor = options && Object.getOwnPropertyDescriptor(options, "protocol"); }
        catch (error) { protocolDescriptor = null; }
        if (!protocolDescriptor || protocolDescriptor.get || protocolDescriptor.set ||
            !Object.prototype.hasOwnProperty.call(protocolDescriptor, "value") || !protocolModule.isTrustedProtocol(protocolDescriptor.value)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        var protocol = protocolDescriptor.value;
        if (!protocol.isPlainObject(options)) {
            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context bridge options must be an object.");
        }
        protocol.assertNoUnknownKeys(options, ["protocol", "contextApi", "invokeHost", "runtime"], "contextBridge.options");
        var contextApi = protocol.getOwnDataProperty(options, "contextApi");
        if (!contextModule.isTrustedContextApiForProtocol(contextApi, protocol)) {
            throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        var invokeHost = requireOwnFunction(options, "invokeHost", protocol);
        if (!protocol.isPlainObject(options.runtime)) {
            throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        protocol.assertNoUnknownKeys(options.runtime, ["setTimeout", "clearTimeout", "timeoutMs"], "contextBridge.runtime");
        var setTimer = requireOwnFunction(options.runtime, "setTimeout", protocol);
        var clearTimer = requireOwnFunction(options.runtime, "clearTimeout", protocol);
        var timeoutMs = protocol.getOwnDataProperty(options.runtime, "timeoutMs");
        if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) {
            protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Context bridge timeout is invalid.");
        }
        if (typeof WeakMap !== "function") {
            throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }

        var usedSessionIds = new Set();
        var usedRequestIds = new Set();
        var bridgeToken = Object.freeze({});
        var captureRecords = new WeakMap();
        var currentHostAuthority = null;
        var sessionId = issueUniqueSessionId(null);
        var requestGeneration = 0;
        var bridgeLifecycleEpoch = 1;
        var state = "idle";
        var active = null;

        function issueUniqueSessionId(currentSessionId) {
            var attempts = 1 + protocol.HARD_LIMITS.maxIdCollisionRetries;
            while (attempts > 0) {
                var nextSessionId = protocol.randomId("session");
                if (nextSessionId !== currentSessionId && !usedSessionIds.has(nextSessionId)) {
                    usedSessionIds.add(nextSessionId);
                    return nextSessionId;
                }
                attempts--;
            }
            throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }

        function nextRequestId() {
            var attempts = 1 + protocol.HARD_LIMITS.maxIdCollisionRetries;
            while (attempts > 0) {
                var requestId = protocol.randomId("req");
                if (!usedRequestIds.has(requestId)) {
                    usedRequestIds.add(requestId);
                    return requestId;
                }
                attempts--;
            }
            throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }

        function clearRecordTimer(record) {
            if (!record || record.timer === null) { return; }
            try { clearTimer(record.timer); }
            catch (ignored) {}
            record.timer = null;
        }

        function recordMatches(record, capturedGeneration) {
            return Boolean(record && active === record && state === "pending" && record.generation === capturedGeneration &&
                record.requestId === active.requestId && record.sessionId === sessionId && !record.settled);
        }

        function settle(record, capturedGeneration, error, value) {
            if (!recordMatches(record, capturedGeneration)) { return false; }
            record.settled = true;
            clearRecordTimer(record);
            active = null;
            state = "idle";
            if (error) { record.reject(error); }
            else { record.resolve(value); }
            return true;
        }

        function mapHostError(code) {
            if (code === "HOST_CONTEXT_BUDGET_EXCEEDED") { return protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED; }
            if (code === "HOST_CONTEXT_TARGET_NOT_FOUND") { return protocol.ERROR_CODES.UNKNOWN_TARGET; }
            if (code === "HOST_CONTEXT_UNAVAILABLE") { return protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE; }
            if (code === "HOST_CONTEXT_SESSION_RESET_REQUIRED" || code === "HOST_CONTEXT_AUTHORITY_MISMATCH") { return protocol.ERROR_CODES.CONTEXT_STALE; }
            if (code === "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED") { return protocol.ERROR_CODES.CONTEXT_VALUE_EVALUATION_DISALLOWED; }
            if (code === "HOST_CONTEXT_VALUE_UNSUPPORTED") { return protocol.ERROR_CODES.CONTEXT_VALUE_UNSUPPORTED; }
            if (code === "HOST_CONTEXT_VALUE_INVALID") { return protocol.ERROR_CODES.CONTEXT_VALUE_INVALID; }
            return protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED;
        }

        function isNegativeZero(value) { return value === 0 && 1 / value === -Infinity; }

        function assertRawNumber(value, label, integer, minimum, maximum) {
            protocol.assertFiniteNumber(value, label);
            if ((integer && !Number.isInteger(value)) || value < minimum || value > maximum) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Host context number is outside its allowed range.", { details: { field: label } });
            }
            return value;
        }

        function normalizeHostAuthority(snapshot) {
            var hostInstanceId = protocol.getOwnDataProperty(snapshot, "hostInstanceId");
            var hostReloadEpoch = protocol.getOwnDataProperty(snapshot, "hostReloadEpoch");
            if (typeof hostInstanceId !== "string" || !HOST_INSTANCE_ID_PATTERN.test(hostInstanceId) ||
                protocol.utf8ByteLength(hostInstanceId) !== 53) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context authority is invalid.");
            }
            assertRawNumber(hostReloadEpoch, "hostReloadEpoch", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
            return { hostInstanceId: hostInstanceId, hostReloadEpoch: hostReloadEpoch };
        }

        function authorityRollbackError() {
            var error = new Error("Validated Host authority moved backwards.");
            error.code = "CONTEXT_AUTHORITY_ROLLBACK";
            return error;
        }

        function isBridgeLocalError(error) {
            return Boolean(error && error.code === "CONTEXT_AUTHORITY_ROLLBACK");
        }

        function observeValidatedHostAuthority(hostInstanceId, hostReloadEpoch) {
            if (currentHostAuthority && currentHostAuthority.hostInstanceId === hostInstanceId) {
                if (hostReloadEpoch < currentHostAuthority.hostReloadEpoch) {
                    throw authorityRollbackError();
                }
                if (hostReloadEpoch === currentHostAuthority.hostReloadEpoch) {
                    return currentHostAuthority;
                }
            }
            currentHostAuthority = Object.freeze({
                hostInstanceId: hostInstanceId,
                hostReloadEpoch: hostReloadEpoch
            });
            return currentHostAuthority;
        }

        function makePrivateRecord(capture, details) {
            var nativeBindings = (details.nativeBindings || []).map(function (binding) {
                return Object.freeze({
                    layerId: binding.layerId,
                    nativeLayerId: binding.nativeLayerId,
                    layerIndex: binding.layerIndex,
                    selectedOrder: binding.selectedOrder,
                    matchName: binding.matchName,
                    type: binding.type
                });
            });
            var valueTargets = (details.valueTargets || []).map(function (target) {
                return Object.freeze({
                    targetOrdinal: target.targetOrdinal,
                    layerId: target.layerId,
                    nativeLayerId: target.nativeLayerId,
                    layerIndex: target.layerIndex,
                    propertyPath: protocol.deepFreeze(protocol.cloneJson(target.propertyPath, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes })),
                    propertyMatchName: target.propertyMatchName,
                    valueKind: target.valueKind,
                    valueDigest: target.valueDigest
                });
            });
            Object.freeze(nativeBindings);
            Object.freeze(valueTargets);
            return Object.freeze({
                protocol: protocol,
                bridgeToken: bridgeToken,
                sessionId: sessionId,
                bridgeLifecycleEpoch: bridgeLifecycleEpoch,
                hostInstanceId: details.hostInstanceId,
                hostReloadEpoch: details.hostReloadEpoch,
                tier: capture.tier,
                purpose: details.purpose,
                executable: capture.executable,
                fingerprint: capture.fingerprint,
                projectGeneration: details.projectGeneration === undefined ? null : details.projectGeneration,
                itemId: details.itemId === undefined ? null : details.itemId,
                compId: details.compId === undefined ? null : details.compId,
                activeCompDuration: details.activeCompDuration === undefined ? null : details.activeCompDuration,
                bindingFingerprint: details.bindingFingerprint === undefined ? null : details.bindingFingerprint,
                selectionOrderMeaningful: details.selectionOrderMeaningful,
                targetOrderMeaningful: details.targetOrderMeaningful === true,
                nativeBindings: nativeBindings,
                valueTargets: valueTargets,
                publicCanonical: protocol.canonicalStringify(capture)
            });
        }

        function registerCapture(capture, details) {
            if (!Object.isFrozen(capture)) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context capture is not immutable.");
            }
            captureRecords.set(capture, makePrivateRecord(capture, details));
            return capture;
        }

        function normalizeRawResult(raw, request) {
            if (typeof raw !== "string" || protocol.utf8ByteLength(raw) > 16 * 1024) {
                protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Host context result exceeds its limit.");
            }
            var result;
            try { result = JSON.parse(raw); }
            catch (error) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context result is invalid."); }
            protocol.assertSafeJson(result, { allowDangerousPaths: ["error.code"] });
            if (!protocol.isPlainObject(result)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context result is invalid."); }
            var baseKeys = ["protocol", "schemaVersion", "requestId", "sessionId", "operation", "ok", "hostAdapterRevision"];
            protocol.assertNoUnknownKeys(result, baseKeys.concat(result.ok === true ? ["snapshot"] : ["error"]), "hostContext.result");
            if (result.protocol !== RESULT_PROTOCOL || result.schemaVersion !== SCHEMA_VERSION || result.requestId !== request.requestId ||
                result.sessionId !== request.sessionId || result.operation !== request.operation || result.hostAdapterRevision !== HOST_ADAPTER_REVISION ||
                typeof result.ok !== "boolean") {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context result metadata is invalid.");
            }
            if (!result.ok) {
                if (!protocol.isPlainObject(result.error)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context error is invalid."); }
                protocol.assertNoUnknownKeys(result.error, ["code", "message"], "hostContext.error");
                if (HOST_ERROR_CODES.indexOf(result.error.code) === -1 || typeof result.error.message !== "string") {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context error is invalid.");
                }
                throw protocolError(protocol, mapHostError(result.error.code));
            }
            return result;
        }

        function normalizeTierZero(result, request) {
            var snapshot = result.snapshot;
            if (!protocol.isPlainObject(snapshot)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 0 context is invalid."); }
            protocol.assertNoUnknownKeys(snapshot, ["hostInstanceId", "hostReloadEpoch", "tier", "capabilities"], "hostContext.snapshot");
            if (snapshot.tier !== 0 || !protocol.isPlainObject(snapshot.capabilities)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 0 context is invalid."); }
            var authority = normalizeHostAuthority(snapshot);
            protocol.assertNoUnknownKeys(snapshot.capabilities, ["maxTier", "nativeLayerIdAvailable", "bindingContextAvailable", "hostAdapterRevision"], "hostContext.capabilities");
            if (snapshot.capabilities.maxTier !== 3 || typeof snapshot.capabilities.nativeLayerIdAvailable !== "boolean" ||
                typeof snapshot.capabilities.bindingContextAvailable !== "boolean" || snapshot.capabilities.hostAdapterRevision !== HOST_ADAPTER_REVISION) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 0 capabilities are invalid.");
            }
            var normalizedSource = { sessionId: sessionId, hostInstanceId: authority.hostInstanceId, hostReloadEpoch: authority.hostReloadEpoch, tier: 0, capabilities: snapshot.capabilities };
            protocol.assertJsonBudget(normalizedSource, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            observeValidatedHostAuthority(authority.hostInstanceId, authority.hostReloadEpoch);
            var normalizedSnapshot = protocol.cloneJson(normalizedSource, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            var capture = protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 0,
                executable: false,
                fingerprint: null,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: normalizedSnapshot
            });
            return registerCapture(capture, {
                hostInstanceId: authority.hostInstanceId,
                hostReloadEpoch: authority.hostReloadEpoch,
                purpose: "display",
                selectionOrderMeaningful: request.scope.selectionOrderMeaningful
            });
        }

        function normalizeTierOne(result, request) {
            var raw = result.snapshot;
            if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 1 context is invalid."); }
            protocol.assertNoUnknownKeys(raw, ["hostInstanceId", "hostReloadEpoch", "tier", "projectGeneration", "activeComp", "selection"], "hostContext.snapshot");
            if (raw.tier !== 1) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 1 context is invalid."); }
            var authority = normalizeHostAuthority(raw);
            var projectGeneration = assertRawNumber(raw.projectGeneration, "projectGeneration", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
            var normalized = { sessionId: sessionId, hostInstanceId: authority.hostInstanceId, hostReloadEpoch: authority.hostReloadEpoch, tier: 1 };
            var compId = null;
            var itemId = null;
            if (raw.activeComp !== null) {
                if (!protocol.isPlainObject(raw.activeComp)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host active comp is invalid."); }
                protocol.assertNoUnknownKeys(raw.activeComp, ["itemId", "projectGeneration", "type", "width", "height", "duration", "frameRate"], "hostContext.activeComp");
                itemId = assertRawNumber(raw.activeComp.itemId, "activeComp.itemId", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
                if (raw.activeComp.projectGeneration !== projectGeneration || raw.activeComp.type !== "CompItem") {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host active comp identity is invalid.");
                }
                compId = "ae-project-" + projectGeneration + "-item-" + itemId;
                normalized.activeComp = {
                    compId: compId,
                    type: "CompItem",
                    width: assertRawNumber(raw.activeComp.width, "activeComp.width", true, 1, 30000),
                    height: assertRawNumber(raw.activeComp.height, "activeComp.height", true, 1, 30000),
                    duration: assertRawNumber(raw.activeComp.duration, "activeComp.duration", false, 0, protocol.HARD_LIMITS.maxNumberAbs),
                    frameRate: assertRawNumber(raw.activeComp.frameRate, "activeComp.frameRate", false, 0.000001, protocol.HARD_LIMITS.maxNumberAbs)
                };
            }
            if (!protocol.isPlainObject(raw.selection)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection is invalid."); }
            protocol.assertNoUnknownKeys(raw.selection, ["count", "identityQuality", "omitted", "omittedReason", "items"], "hostContext.selection");
            var count = assertRawNumber(raw.selection.count, "selection.count", true, 0, protocol.HARD_LIMITS.maxNumberAbs);
            if (raw.selection.identityQuality !== "native-layer-id" && raw.selection.identityQuality !== "index-only") {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection identity quality is invalid.");
            }
            if (!Array.isArray(raw.selection.items) || raw.selection.items.length > 32) {
                protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Host selection exceeds its limit.");
            }
            if (raw.selection.omitted === true) {
                if (raw.selection.omittedReason !== "selection-limit" || raw.selection.items.length !== 0 || request.scope.purpose === "binding") {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection omission is invalid.");
                }
                normalized.selection = [];
                normalized.selectionSummary = { count: count, identityQuality: "index-only", omitted: true, omittedReason: "selection-limit" };
            } else {
                if (raw.selection.omitted !== undefined || raw.selection.omittedReason !== undefined || count !== raw.selection.items.length) {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection count is invalid.");
                }
                var seen = new Set();
                normalized.selection = raw.selection.items.map(function (item, index) {
                    if (!protocol.isPlainObject(item)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection item is invalid."); }
                    protocol.assertNoUnknownKeys(item, ["nativeLayerId", "layerIndex", "selectedOrder", "matchName", "type"], "hostContext.selection.items[" + index + "]");
                    var output = {
                        layerIndex: assertRawNumber(item.layerIndex, "selection.layerIndex", true, 1, protocol.HARD_LIMITS.maxNumberAbs),
                        selectedOrder: assertRawNumber(item.selectedOrder, "selection.selectedOrder", true, 0, 31),
                        matchName: protocol.assertString(item.matchName, "selection.matchName", 256),
                        type: protocol.assertNonEmptyString(item.type, "selection.type", 256)
                    };
                    if (item.nativeLayerId !== undefined) {
                        var nativeLayerId = assertRawNumber(item.nativeLayerId, "selection.nativeLayerId", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
                        var layerId = compId ? compId + "-layer-" + nativeLayerId : null;
                        if (!layerId || seen.has(layerId)) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Host selection layer identity is invalid."); }
                        seen.add(layerId);
                        output.layerId = layerId;
                    }
                    return output;
                });
            }
            if (request.scope.purpose === "binding") {
                if (!compId || raw.selection.identityQuality !== "native-layer-id" || raw.selection.omitted === true ||
                    normalized.selection.some(function (item) { return !item.layerId; })) {
                    protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Binding context requires native layer identities.");
                }
                var fingerprinted = contextApi.fingerprintContext(normalized, {
                    selectionOrderMeaningful: request.scope.selectionOrderMeaningful,
                    bindsToDisplayName: false,
                    requireStableContext: true
                });
                observeValidatedHostAuthority(authority.hostInstanceId, authority.hostReloadEpoch);
                var bindingSnapshot = protocol.cloneJson(fingerprinted.input, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
                var bindingCapture = protocol.deepFreeze({
                    contextId: request.requestId,
                    requestId: request.requestId,
                    sessionId: sessionId,
                    tier: 1,
                    executable: true,
                    fingerprint: fingerprinted.fingerprint,
                    hostAdapterRevision: HOST_ADAPTER_REVISION,
                    snapshot: bindingSnapshot
                });
                return registerCapture(bindingCapture, {
                    hostInstanceId: authority.hostInstanceId,
                    hostReloadEpoch: authority.hostReloadEpoch,
                    purpose: "binding",
                    projectGeneration: projectGeneration,
                    itemId: itemId,
                    compId: compId,
                    activeCompDuration: normalized.activeComp.duration,
                    selectionOrderMeaningful: request.scope.selectionOrderMeaningful,
                    nativeBindings: normalized.selection.map(function (item, index) {
                        return {
                            layerId: item.layerId,
                            nativeLayerId: raw.selection.items[index].nativeLayerId,
                            layerIndex: item.layerIndex,
                            selectedOrder: item.selectedOrder,
                            matchName: item.matchName,
                            type: item.type
                        };
                    })
                });
            }
            protocol.assertJsonBudget(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            observeValidatedHostAuthority(authority.hostInstanceId, authority.hostReloadEpoch);
            var displaySnapshot = protocol.cloneJson(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            var displayCapture = protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 1,
                executable: false,
                fingerprint: null,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: displaySnapshot
            });
            return registerCapture(displayCapture, {
                hostInstanceId: authority.hostInstanceId,
                hostReloadEpoch: authority.hostReloadEpoch,
                purpose: "display",
                projectGeneration: projectGeneration,
                itemId: itemId,
                selectionOrderMeaningful: request.scope.selectionOrderMeaningful
            });
        }

        function detailRequested(request, detail) {
            return request.scope.details.indexOf(detail) !== -1;
        }

        function normalizeDisplayString(item, output, field, maximumBytes, omitted) {
            var truncatedKey = field + "Truncated";
            var originalBytesKey = field + "OriginalBytes";
            var isOmitted = omitted.indexOf(field) !== -1;
            var hasAny = item[field] !== undefined || item[truncatedKey] !== undefined || item[originalBytesKey] !== undefined;
            if (isOmitted) {
                if (hasAny) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Omitted Host display data is inconsistent."); }
                return;
            }
            if (typeof item[field] !== "string" || typeof item[truncatedKey] !== "boolean") {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host display data is invalid.");
            }
            var actualBytes = protocol.utf8ByteLength(item[field]);
            if (actualBytes > maximumBytes) { protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Host display data exceeds its limit."); }
            var originalBytes = assertRawNumber(item[originalBytesKey], "selection." + originalBytesKey, true, 0, protocol.HARD_LIMITS.maxNumberAbs);
            if ((item[truncatedKey] && originalBytes <= actualBytes) || (!item[truncatedKey] && originalBytes !== actualBytes)) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host display truncation metadata is invalid.");
            }
            output[field] = item[field];
            output[truncatedKey] = item[truncatedKey];
            output[originalBytesKey] = originalBytes;
        }

        function normalizeTierTwo(result, request) {
            var raw = result.snapshot;
            if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 2 context is invalid."); }
            protocol.assertNoUnknownKeys(raw, ["hostInstanceId", "hostReloadEpoch", "tier", "projectGeneration", "activeComp", "selection"], "hostContext.snapshot");
            if (raw.tier !== 2) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 2 context is invalid."); }
            var authority = normalizeHostAuthority(raw);
            var projectGeneration = assertRawNumber(raw.projectGeneration, "projectGeneration", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
            var normalized = { sessionId: sessionId, hostInstanceId: authority.hostInstanceId, hostReloadEpoch: authority.hostReloadEpoch, tier: 2 };
            var compId = null;
            var itemId = null;
            if (raw.activeComp !== null) {
                if (!protocol.isPlainObject(raw.activeComp)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host active comp is invalid."); }
                protocol.assertNoUnknownKeys(raw.activeComp, ["itemId", "projectGeneration", "type", "width", "height", "duration", "frameRate"], "hostContext.activeComp");
                itemId = assertRawNumber(raw.activeComp.itemId, "activeComp.itemId", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
                if (raw.activeComp.projectGeneration !== projectGeneration || raw.activeComp.type !== "CompItem") {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host active comp identity is invalid.");
                }
                compId = "ae-project-" + projectGeneration + "-item-" + itemId;
                normalized.activeComp = {
                    compId: compId,
                    type: "CompItem",
                    width: assertRawNumber(raw.activeComp.width, "activeComp.width", true, 1, 30000),
                    height: assertRawNumber(raw.activeComp.height, "activeComp.height", true, 1, 30000),
                    duration: assertRawNumber(raw.activeComp.duration, "activeComp.duration", false, 0, protocol.HARD_LIMITS.maxNumberAbs),
                    frameRate: assertRawNumber(raw.activeComp.frameRate, "activeComp.frameRate", false, 0.000001, protocol.HARD_LIMITS.maxNumberAbs)
                };
            }
            if (!protocol.isPlainObject(raw.selection)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection is invalid."); }
            protocol.assertNoUnknownKeys(raw.selection, ["count", "identityQuality", "items"], "hostContext.selection");
            var count = assertRawNumber(raw.selection.count, "selection.count", true, 0, 8);
            if ((raw.selection.identityQuality !== "native-layer-id" && raw.selection.identityQuality !== "index-only") ||
                !Array.isArray(raw.selection.items) || raw.selection.items.length !== count || raw.selection.items.length > 8) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection is invalid.");
            }
            var seenLayerIds = new Set();
            normalized.selection = raw.selection.items.map(function (item, index) {
                if (!protocol.isPlainObject(item)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection item is invalid."); }
                var allowed = ["nativeLayerId", "layerIndex", "selectedOrder", "matchName", "type", "omittedFields"];
                if (detailRequested(request, "name")) { allowed = allowed.concat(["name", "nameTruncated", "nameOriginalBytes"]); }
                if (detailRequested(request, "textPreview")) { allowed = allowed.concat(["textPreview", "textPreviewTruncated", "textPreviewOriginalBytes"]); }
                if (detailRequested(request, "bounds")) { allowed.push("bounds"); }
                protocol.assertNoUnknownKeys(item, allowed, "hostContext.selection.items[" + index + "]");
                if (!Array.isArray(item.omittedFields) || item.omittedFields.length > 3) {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host omitted fields are invalid.");
                }
                var omittedSeen = new Set();
                var omitted = item.omittedFields.map(function (field) {
                    if ((field !== "name" && field !== "textPreview" && field !== "bounds") ||
                        !detailRequested(request, field) || omittedSeen.has(field)) {
                        protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host omitted fields are invalid.");
                    }
                    omittedSeen.add(field);
                    return field;
                });
                var output = {
                    layerIndex: assertRawNumber(item.layerIndex, "selection.layerIndex", true, 1, protocol.HARD_LIMITS.maxNumberAbs),
                    selectedOrder: assertRawNumber(item.selectedOrder, "selection.selectedOrder", true, 0, 7),
                    matchName: protocol.assertString(item.matchName, "selection.matchName", 256),
                    type: protocol.assertNonEmptyString(item.type, "selection.type", 256),
                    omittedFields: omitted
                };
                if (item.nativeLayerId !== undefined) {
                    var nativeLayerId = assertRawNumber(item.nativeLayerId, "selection.nativeLayerId", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
                    var layerId = compId ? compId + "-layer-" + nativeLayerId : null;
                    if (!layerId || seenLayerIds.has(layerId)) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Host selection layer identity is invalid."); }
                    seenLayerIds.add(layerId);
                    output.layerId = layerId;
                }
                if (detailRequested(request, "name")) { normalizeDisplayString(item, output, "name", 256, omitted); }
                if (detailRequested(request, "textPreview")) { normalizeDisplayString(item, output, "textPreview", 512, omitted); }
                if (detailRequested(request, "bounds") && omitted.indexOf("bounds") === -1) {
                    if (!protocol.isPlainObject(item.bounds)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host bounds are invalid."); }
                    protocol.assertNoUnknownKeys(item.bounds, ["left", "top", "width", "height"], "hostContext.bounds");
                    output.bounds = {
                        left: assertRawNumber(item.bounds.left, "bounds.left", false, -protocol.HARD_LIMITS.maxNumberAbs, protocol.HARD_LIMITS.maxNumberAbs),
                        top: assertRawNumber(item.bounds.top, "bounds.top", false, -protocol.HARD_LIMITS.maxNumberAbs, protocol.HARD_LIMITS.maxNumberAbs),
                        width: assertRawNumber(item.bounds.width, "bounds.width", false, 0, protocol.HARD_LIMITS.maxNumberAbs),
                        height: assertRawNumber(item.bounds.height, "bounds.height", false, 0, protocol.HARD_LIMITS.maxNumberAbs)
                    };
                }
                return output;
            });
            if (raw.selection.identityQuality === "native-layer-id" && normalized.selection.some(function (item) { return !item.layerId; })) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host selection identity quality is invalid.");
            }
            protocol.assertJsonBudget(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            observeValidatedHostAuthority(authority.hostInstanceId, authority.hostReloadEpoch);
            var displaySnapshot = protocol.cloneJson(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            var capture = protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 2,
                executable: false,
                fingerprint: null,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: displaySnapshot
            });
            return registerCapture(capture, {
                hostInstanceId: authority.hostInstanceId,
                hostReloadEpoch: authority.hostReloadEpoch,
                purpose: "display",
                projectGeneration: projectGeneration,
                itemId: itemId,
                selectionOrderMeaningful: request.scope.selectionOrderMeaningful
            });
        }

        function capture(captureOptions) {
            captureOptions = captureOptions || {};
            if (!protocol.isPlainObject(captureOptions)) {
                return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED));
            }
            try { protocol.assertNoUnknownKeys(captureOptions, ["tier", "purpose", "selectionOrderMeaningful"], "contextBridge.capture"); }
            catch (error) { return Promise.reject(error); }
            if (state === "suspended") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED)); }
            if (state === "pending") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
            var tier = captureOptions.tier === undefined ? 1 : captureOptions.tier;
            var purpose = captureOptions.purpose === undefined ? "display" : captureOptions.purpose;
            var selectionOrderMeaningful = captureOptions.selectionOrderMeaningful === undefined ? true : captureOptions.selectionOrderMeaningful;
            if ((tier !== 0 && tier !== 1) || (purpose !== "display" && purpose !== "binding") || typeof selectionOrderMeaningful !== "boolean") {
                return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED));
            }
            var requestId;
            try { requestId = nextRequestId(); }
            catch (error) { return Promise.reject(error); }
            var operation = tier === 0 ? "getCapabilities" : "captureContext";
            var request = {
                protocol: REQUEST_PROTOCOL,
                schemaVersion: SCHEMA_VERSION,
                requestId: requestId,
                sessionId: sessionId,
                operation: operation,
                tier: tier,
                scope: { purpose: purpose, selectionOrderMeaningful: selectionOrderMeaningful }
            };
            return startRequest(request, tier === 0 ? normalizeTierZero : normalizeTierOne);
        }

        function startRequest(request, normalizer) {
            var requestJson;
            try {
                protocol.assertJsonBudget(request, { maxBytes: 32 * 1024 });
                requestJson = JSON.stringify(request);
            } catch (error) { return Promise.reject(error); }
            requestGeneration++;
            var capturedGeneration = requestGeneration;
            return new Promise(function (resolve, reject) {
                var record = {
                    requestId: request.requestId,
                    sessionId: sessionId,
                    generation: capturedGeneration,
                    request: request,
                    resolve: resolve,
                    reject: reject,
                    timer: null,
                    settled: false
                };
                active = record;
                state = "pending";
                try {
                    record.timer = setTimer(function () {
                        settle(record, capturedGeneration, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null);
                    }, timeoutMs);
                } catch (error) {
                    settle(record, capturedGeneration, protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE), null);
                    return;
                }
                var source = FIXED_FACADE_PREFIX + quoteForExtendScript(requestJson) + ")";
                try {
                    invokeHost(source, function (raw) {
                        if (!recordMatches(record, capturedGeneration)) { return; }
                        try {
                            var result = normalizeRawResult(raw, request);
                            var captureResult = normalizer(result, request);
                            settle(record, capturedGeneration, null, captureResult);
                        } catch (error) {
                            settle(record, capturedGeneration, error instanceof protocol.VelaProtocolError || isBridgeLocalError(error) ? error : protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED), null);
                        }
                    });
                } catch (error) {
                    settle(record, capturedGeneration, protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE), null);
                }
            });
        }

        function captureLayerDetails(detailOptions) {
            detailOptions = detailOptions || {};
            try { protocol.assertSafeJson(detailOptions); }
            catch (error) { return Promise.reject(error); }
            if (!protocol.isPlainObject(detailOptions)) {
                return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED));
            }
            try { protocol.assertNoUnknownKeys(detailOptions, ["details", "selectionOrderMeaningful"], "contextBridge.captureLayerDetails"); }
            catch (error) { return Promise.reject(error); }
            if (state === "suspended") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED)); }
            if (state === "pending") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
            var details = protocol.getOwnDataProperty(detailOptions, "details");
            var selectionOrderMeaningful = detailOptions.selectionOrderMeaningful === undefined ? true : detailOptions.selectionOrderMeaningful;
            if (!Array.isArray(details) || details.length < 1 || details.length > 3 || typeof selectionOrderMeaningful !== "boolean") {
                return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED));
            }
            var seen = new Set();
            var normalizedDetails = [];
            var i;
            for (i = 0; i < details.length; i++) {
                if ((details[i] !== "name" && details[i] !== "textPreview" && details[i] !== "bounds") || seen.has(details[i])) {
                    return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED));
                }
                seen.add(details[i]);
                normalizedDetails.push(details[i]);
            }
            var requestId;
            try { requestId = nextRequestId(); }
            catch (error) { return Promise.reject(error); }
            var request = {
                protocol: REQUEST_PROTOCOL,
                schemaVersion: SCHEMA_VERSION,
                requestId: requestId,
                sessionId: sessionId,
                operation: "captureLayerDetails",
                tier: 2,
                scope: {
                    purpose: "display",
                    selectionOrderMeaningful: selectionOrderMeaningful,
                    details: normalizedDetails
                }
            };
            return startRequest(request, normalizeTierTwo);
        }

        function trustedBindingRecord(bindingCapture) {
            var record = captureRecords.get(bindingCapture);
            if (!record || record.bridgeToken !== bridgeToken || record.protocol !== protocol ||
                !Object.isFrozen(bindingCapture) || protocol.canonicalStringify(bindingCapture) !== record.publicCanonical) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property target resolution requires a trusted binding capture.");
            }
            if (record.tier !== 1 || record.purpose !== "binding" || record.executable !== true) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Property target resolution requires an executable Tier 1 binding capture.");
            }
            if (record.sessionId !== sessionId || record.bridgeLifecycleEpoch !== bridgeLifecycleEpoch || !currentHostAuthority ||
                record.hostInstanceId !== currentHostAuthority.hostInstanceId || record.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Property target binding is stale.");
            }
            return record;
        }

        function normalizeTierThree(result, request, bindingRecord, publicTargets) {
            var raw = result.snapshot;
            if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 3 context is invalid."); }
            protocol.assertNoUnknownKeys(raw, ["hostInstanceId", "hostReloadEpoch", "projectGeneration", "tier", "targets"], "hostContext.snapshot");
            if (raw.tier !== 3 || raw.projectGeneration !== bindingRecord.projectGeneration || !Array.isArray(raw.targets) || raw.targets.length !== publicTargets.length) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 3 context is invalid.");
            }
            var authority = normalizeHostAuthority(raw);
            if (authority.hostInstanceId !== bindingRecord.hostInstanceId || authority.hostReloadEpoch !== bindingRecord.hostReloadEpoch ||
                authority.hostInstanceId !== currentHostAuthority.hostInstanceId || authority.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Tier 3 Host authority is stale.");
            }
            var normalizedTargets = raw.targets.map(function (target, index) {
                var expected = publicTargets[index];
                var terminalMode = expected.propertyPath[expected.propertyPath.length - 3];
                var terminalPropertyIndex;
                protocol.assertNoUnknownKeys(target, ["targetOrdinal", "nativeLayerId", "layerIndex", "propertyPath", "propertyMatchName", "propertyIndex", "propertyType"], "hostContext.targets[" + index + "]");
                if (target.targetOrdinal !== index || target.nativeLayerId !== expected.nativeLayerId || target.layerIndex !== expected.layerIndex ||
                    target.propertyType !== "property" || protocol.canonicalStringify(target.propertyPath) !== protocol.canonicalStringify(expected.propertyPath) ||
                    target.propertyMatchName !== expected.propertyPath[expected.propertyPath.length - 2]) {
                    protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Tier 3 property target changed.");
                }
                terminalPropertyIndex = assertRawNumber(target.propertyIndex, "targets[" + index + "].propertyIndex", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
                if (terminalMode === "indexed" && terminalPropertyIndex !== expected.propertyPath[expected.propertyPath.length - 1]) {
                    protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Tier 3 property target changed.");
                }
                return {
                    layerId: expected.layerId,
                    layerIndex: expected.layerIndex,
                    propertyPath: protocol.cloneJson(expected.propertyPath, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }),
                    propertyMatchName: target.propertyMatchName,
                    propertyIndex: terminalPropertyIndex,
                    propertyType: "property"
                };
            });
            var capture = protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 3,
                purpose: "target-resolution",
                executable: false,
                fingerprint: null,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: {
                    hostInstanceId: authority.hostInstanceId,
                    hostReloadEpoch: authority.hostReloadEpoch,
                    projectGeneration: bindingRecord.projectGeneration,
                    activeComp: { compId: bindingRecord.compId },
                    targets: normalizedTargets
                }
            });
            return registerCapture(capture, {
                hostInstanceId: authority.hostInstanceId,
                hostReloadEpoch: authority.hostReloadEpoch,
                purpose: "target-resolution",
                projectGeneration: bindingRecord.projectGeneration,
                itemId: bindingRecord.itemId,
                selectionOrderMeaningful: bindingRecord.selectionOrderMeaningful
            });
        }

        function resolvePropertyTargets(bindingCapture, targets) {
            try {
                if (state === "suspended") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED)); }
                if (state === "pending") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
                var bindingRecord = trustedBindingRecord(bindingCapture);
                protocol.assertSafeJson(targets);
                if (!Array.isArray(targets) || targets.length < 1 || targets.length > 4) {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property target count is invalid.");
                }
                var seen = new Set();
                var normalizedTargets = targets.map(function (target) {
                    if (!protocol.isPlainObject(target)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property target is invalid."); }
                    protocol.assertNoUnknownKeys(target, ["layerId", "propertyPath"], "contextBridge.propertyTarget");
                    var layerId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "layerId"), "contextBridge.propertyTarget.layerId", 256);
                    var propertyPath = contextApi.normalizePropertyPath(protocol.getOwnDataProperty(target, "propertyPath"));
                    var key = layerId + "|" + protocol.canonicalStringify(propertyPath);
                    var nativeBinding = bindingRecord.nativeBindings.filter(function (item) { return item.layerId === layerId; })[0];
                    if (seen.has(key) || !nativeBinding) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Property target is not bound to the current selection."); }
                    seen.add(key);
                    return {
                        layerId: layerId,
                        nativeLayerId: nativeBinding.nativeLayerId,
                        layerIndex: nativeBinding.layerIndex,
                        propertyPath: propertyPath
                    };
                });
                var requestId = nextRequestId();
                var request = {
                    protocol: REQUEST_PROTOCOL,
                    schemaVersion: SCHEMA_VERSION,
                    requestId: requestId,
                    sessionId: sessionId,
                    operation: "resolvePropertyTargets",
                    tier: 3,
                    scope: {
                        purpose: "binding",
                        expectedHostInstanceId: bindingRecord.hostInstanceId,
                        expectedHostReloadEpoch: bindingRecord.hostReloadEpoch,
                        expectedProjectGeneration: bindingRecord.projectGeneration,
                        targets: normalizedTargets.map(function (target, index) {
                            return { targetOrdinal: index, itemId: bindingRecord.itemId, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath };
                        })
                    }
                };
                protocol.assertJsonBudget(request, { maxBytes: 8 * 1024 });
                return startRequest(request, function (result, hostRequest) { return normalizeTierThree(result, hostRequest, bindingRecord, normalizedTargets); });
            } catch (error) {
                return Promise.reject(error);
            }
        }

        function normalizePropertyValueTargets(bindingRecord, targets) {
            var seen = new Set();
            protocol.assertSafeJson(targets);
            if (!Array.isArray(targets) || targets.length < 1 || targets.length > 4) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value target count is invalid.");
            }
            return targets.map(function (target) {
                var layerId;
                var propertyPath;
                var key;
                var nativeBinding;
                if (!protocol.isPlainObject(target)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value target is invalid."); }
                protocol.assertNoUnknownKeys(target, ["layerId", "propertyPath"], "contextBridge.propertyValueTarget");
                layerId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "layerId"), "contextBridge.propertyValueTarget.layerId", 256);
                propertyPath = contextApi.normalizePropertyPath(protocol.getOwnDataProperty(target, "propertyPath"));
                key = layerId + "|" + protocol.canonicalStringify(propertyPath);
                nativeBinding = bindingRecord.nativeBindings.filter(function (item) { return item.layerId === layerId; })[0];
                if (seen.has(key) || !nativeBinding) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Property value target is not bound to the current selection."); }
                seen.add(key);
                return {
                    layerId: layerId,
                    nativeLayerId: nativeBinding.nativeLayerId,
                    layerIndex: nativeBinding.layerIndex,
                    propertyPath: propertyPath
                };
            });
        }

        function normalizePropertyValueTierThree(result, request, bindingRecord, expectedTargets) {
            var raw = result.snapshot;
            var authority;
            var sampleTime;
            var aggregateBytes = 0;
            var valueTargets;
            var fingerprinted;
            var publicTargets;
            var capture;
            if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value context is invalid."); }
            protocol.assertNoUnknownKeys(raw, ["hostInstanceId", "hostReloadEpoch", "projectGeneration", "sampleTime", "tier", "targets"], "hostContext.propertyValueSnapshot");
            if (raw.tier !== 3 || raw.projectGeneration !== bindingRecord.projectGeneration || !Array.isArray(raw.targets) || raw.targets.length !== expectedTargets.length) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value context is invalid.");
            }
            authority = normalizeHostAuthority(raw);
            if (authority.hostInstanceId !== bindingRecord.hostInstanceId || authority.hostReloadEpoch !== bindingRecord.hostReloadEpoch ||
                authority.hostInstanceId !== currentHostAuthority.hostInstanceId || authority.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Property value Host authority is stale.");
            }
            sampleTime = raw.sampleTime;
            if (typeof sampleTime !== "number" || !Number.isFinite(sampleTime) || isNegativeZero(sampleTime) || sampleTime < 0 ||
                sampleTime > bindingRecord.activeCompDuration + SAMPLE_TIME_TOLERANCE) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value sample time is invalid.");
            }
            valueTargets = raw.targets.map(function (target, index) {
                var expected = expectedTargets[index];
                var value;
                var descriptor;
                var terminalMatchName;
                protocol.assertNoUnknownKeys(target, ["targetOrdinal", "nativeLayerId", "layerIndex", "propertyPath", "propertyMatchName", "value"], "hostContext.propertyValueTargets[" + index + "]");
                if (target.targetOrdinal !== index || target.nativeLayerId !== expected.nativeLayerId || target.layerIndex !== expected.layerIndex ||
                    protocol.canonicalStringify(target.propertyPath) !== protocol.canonicalStringify(expected.propertyPath)) {
                    protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Property value target changed.");
                }
                terminalMatchName = expected.propertyPath[expected.propertyPath.length - 2];
                if (target.propertyMatchName !== terminalMatchName || !protocol.isPlainObject(target.value)) {
                    protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Property value target changed.");
                }
                protocol.assertNoUnknownKeys(target.value, ["kind", "data"], "hostContext.propertyValueTargets[" + index + "].value");
                descriptor = contextApi.describePropertyValue(protocol.getOwnDataProperty(target.value, "kind"), protocol.getOwnDataProperty(target.value, "data"));
                if (descriptor.payloadBytes > MAX_PROPERTY_VALUE_BYTES) {
                    protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Property value target exceeds its byte budget.");
                }
                aggregateBytes += descriptor.payloadBytes;
                if (aggregateBytes > MAX_PROPERTY_VALUE_AGGREGATE_BYTES) {
                    protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Property value aggregate exceeds its byte budget.");
                }
                return {
                    targetOrdinal: index,
                    layerId: expected.layerId,
                    nativeLayerId: expected.nativeLayerId,
                    layerIndex: expected.layerIndex,
                    propertyPath: expected.propertyPath,
                    propertyMatchName: terminalMatchName,
                    valueKind: descriptor.valueKind,
                    valueDigest: descriptor.valueDigest
                };
            });
            publicTargets = valueTargets.map(function (target) {
                return {
                    layerId: target.layerId,
                    propertyPath: protocol.cloneJson(target.propertyPath, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }),
                    propertyMatchName: target.propertyMatchName,
                    valueKind: target.valueKind,
                    valueDigest: target.valueDigest
                };
            });
            fingerprinted = contextApi.fingerprintPropertyValueCapture({
                fingerprintSchemaVersion: "property-value-capture-v1",
                bindingFingerprint: bindingRecord.fingerprint,
                sessionId: sessionId,
                bridgeLifecycleEpoch: bridgeLifecycleEpoch,
                hostInstanceId: authority.hostInstanceId,
                hostReloadEpoch: authority.hostReloadEpoch,
                projectGeneration: bindingRecord.projectGeneration,
                compId: bindingRecord.compId,
                tier: 3,
                purpose: "property-value-binding",
                sampleTime: sampleTime,
                targetOrderMeaningful: true,
                targets: publicTargets
            });
            capture = protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 3,
                purpose: "property-value-binding",
                executable: true,
                fingerprint: fingerprinted.fingerprint,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: {
                    hostInstanceId: authority.hostInstanceId,
                    hostReloadEpoch: authority.hostReloadEpoch,
                    projectGeneration: bindingRecord.projectGeneration,
                    activeComp: { compId: bindingRecord.compId },
                    sampleTime: sampleTime,
                    targets: publicTargets
                }
            });
            return registerCapture(capture, {
                hostInstanceId: authority.hostInstanceId,
                hostReloadEpoch: authority.hostReloadEpoch,
                purpose: "property-value-binding",
                projectGeneration: bindingRecord.projectGeneration,
                itemId: bindingRecord.itemId,
                compId: bindingRecord.compId,
                activeCompDuration: bindingRecord.activeCompDuration,
                bindingFingerprint: bindingRecord.fingerprint,
                selectionOrderMeaningful: bindingRecord.selectionOrderMeaningful,
                targetOrderMeaningful: true,
                valueTargets: valueTargets
            });
        }

        function capturePropertyValues(bindingCapture, targets) {
            try {
                if (state === "suspended") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED)); }
                if (state === "pending") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
                var bindingRecord = trustedBindingRecord(bindingCapture);
                var normalizedTargets = normalizePropertyValueTargets(bindingRecord, targets);
                var requestId = nextRequestId();
                var request = {
                    protocol: REQUEST_PROTOCOL,
                    schemaVersion: SCHEMA_VERSION,
                    requestId: requestId,
                    sessionId: sessionId,
                    operation: "capturePropertyValues",
                    tier: 3,
                    scope: {
                        purpose: "binding",
                        expectedHostInstanceId: bindingRecord.hostInstanceId,
                        expectedHostReloadEpoch: bindingRecord.hostReloadEpoch,
                        expectedProjectGeneration: bindingRecord.projectGeneration,
                        targets: normalizedTargets.map(function (target, index) {
                            return { targetOrdinal: index, itemId: bindingRecord.itemId, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath };
                        })
                    }
                };
                protocol.assertJsonBudget(request, { maxBytes: 8 * 1024 });
                return startRequest(request, function (result, hostRequest) { return normalizePropertyValueTierThree(result, hostRequest, bindingRecord, normalizedTargets); });
            } catch (error) {
                return Promise.reject(error);
            }
        }

        function cancel(requestId) {
            if (!active || active.requestId !== requestId || state !== "pending") { return false; }
            return settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null);
        }

        function suspend() {
            if (state === "suspended") { return false; }
            if (bridgeLifecycleEpoch >= protocol.HARD_LIMITS.maxNumberAbs) {
                throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
            }
            if (active) { settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null); }
            requestGeneration++;
            bridgeLifecycleEpoch++;
            state = "suspended";
            return true;
        }

        function resume() {
            if (state !== "suspended") { return false; }
            state = "idle";
            return true;
        }

        function resetSession() {
            if (bridgeLifecycleEpoch >= protocol.HARD_LIMITS.maxNumberAbs) {
                throw protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
            }
            var nextSessionId = issueUniqueSessionId(sessionId);
            if (active) { settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null); }
            requestGeneration++;
            sessionId = nextSessionId;
            bridgeLifecycleEpoch++;
            state = "idle";
            return sessionId;
        }

        function compareCaptures(left, right, compareOptions) {
            compareOptions = compareOptions || {};
            if (!protocol.isPlainObject(compareOptions)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context comparison options are invalid."); }
            protocol.assertNoUnknownKeys(compareOptions, ["selectionOrderMeaningful"], "contextBridge.compare");
            var orderMeaningful = compareOptions.selectionOrderMeaningful === undefined ? true : compareOptions.selectionOrderMeaningful;
            if (typeof orderMeaningful !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context comparison option is invalid."); }
            var leftRecord = captureRecords.get(left);
            var rightRecord = captureRecords.get(right);
            if (!leftRecord || !rightRecord || leftRecord.bridgeToken !== bridgeToken || rightRecord.bridgeToken !== bridgeToken ||
                leftRecord.protocol !== protocol || rightRecord.protocol !== protocol) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_UNTRUSTED });
            }
            if (!Object.isFrozen(left) || !Object.isFrozen(right) ||
                protocol.canonicalStringify(left) !== leftRecord.publicCanonical ||
                protocol.canonicalStringify(right) !== rightRecord.publicCanonical) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_UNTRUSTED });
            }
            if (leftRecord.sessionId !== sessionId || rightRecord.sessionId !== sessionId ||
                leftRecord.bridgeLifecycleEpoch !== bridgeLifecycleEpoch || rightRecord.bridgeLifecycleEpoch !== bridgeLifecycleEpoch ||
                leftRecord.sessionId !== rightRecord.sessionId ||
                leftRecord.bridgeLifecycleEpoch !== rightRecord.bridgeLifecycleEpoch) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_AUTHORITY_MISMATCH });
            }
            if (!currentHostAuthority ||
                leftRecord.hostInstanceId !== currentHostAuthority.hostInstanceId ||
                leftRecord.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch ||
                rightRecord.hostInstanceId !== currentHostAuthority.hostInstanceId ||
                rightRecord.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_AUTHORITY_MISMATCH });
            }
            if (
                leftRecord.hostInstanceId !== rightRecord.hostInstanceId ||
                leftRecord.hostReloadEpoch !== rightRecord.hostReloadEpoch) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_AUTHORITY_MISMATCH });
            }
            function captureClass(record) {
                if (record.tier === 1 && record.purpose === "binding") { return "tier1-binding"; }
                if (record.tier === 3 && record.purpose === "property-value-binding") { return "property-value-binding"; }
                return "tier" + record.tier + "-" + record.purpose;
            }
            if (captureClass(leftRecord) !== captureClass(rightRecord)) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_INCOMPATIBLE });
            }
            if (leftRecord.executable !== true || rightRecord.executable !== true) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_NOT_EXECUTABLE });
            }
            if (captureClass(leftRecord) === "property-value-binding") {
                return protocol.deepFreeze({
                    fresh: leftRecord.fingerprint === rightRecord.fingerprint,
                    reason: leftRecord.fingerprint === rightRecord.fingerprint ? null : CAPTURE_REASON_STALE
                });
            }
            if (leftRecord.selectionOrderMeaningful !== rightRecord.selectionOrderMeaningful) {
                return protocol.deepFreeze({ fresh: false, reason: CAPTURE_REASON_STALE });
            }
            function comparable(record, capture) {
                var bindings = record.nativeBindings.map(function (item) {
                    return {
                        layerId: item.layerId,
                        nativeLayerId: item.nativeLayerId,
                        layerIndex: item.layerIndex,
                        selectedOrder: orderMeaningful ? item.selectedOrder : null,
                        matchName: item.matchName,
                        type: item.type
                    };
                });
                if (!orderMeaningful) {
                    bindings.sort(function (a, b) { return String(a.layerId).localeCompare(String(b.layerId)); });
                }
                return {
                    sessionId: record.sessionId,
                    bridgeLifecycleEpoch: record.bridgeLifecycleEpoch,
                    hostInstanceId: record.hostInstanceId,
                    hostReloadEpoch: record.hostReloadEpoch,
                    tier: record.tier,
                    projectGeneration: record.projectGeneration,
                    itemId: record.itemId,
                    compId: capture.snapshot && capture.snapshot.activeComp ? capture.snapshot.activeComp.compId : null,
                    selectionOrderMeaningful: orderMeaningful,
                    capturedSelectionOrderMeaningful: record.selectionOrderMeaningful,
                    selection: bindings,
                    fingerprint: record.fingerprint
                };
            }
            var fresh = protocol.canonicalStringify(comparable(leftRecord, left)) === protocol.canonicalStringify(comparable(rightRecord, right));
            return protocol.deepFreeze({ fresh: fresh, reason: fresh ? null : CAPTURE_REASON_STALE });
        }

        function getState() {
            return protocol.deepFreeze({
                state: state,
                sessionId: sessionId,
                requestId: active ? active.requestId : null,
                generation: requestGeneration,
                bridgeLifecycleEpoch: bridgeLifecycleEpoch
            });
        }

        var bridge = Object.freeze({
            capture: capture,
            captureLayerDetails: captureLayerDetails,
            capturePropertyValues: capturePropertyValues,
            resolvePropertyTargets: resolvePropertyTargets,
            cancel: cancel,
            suspend: suspend,
            resume: resume,
            resetSession: resetSession,
            getSessionId: function () { return sessionId; },
            getState: getState,
            compareCaptures: compareCaptures
        });
        trustedContextBridges.add(bridge);
        contextBridgeProtocols.set(bridge, protocol);
        return bridge;
    }

    return Object.freeze({
        createContextBridge: createContextBridge,
        isTrustedContextBridge: isTrustedContextBridge,
        isTrustedContextBridgeForProtocol: isTrustedContextBridgeForProtocol,
        quoteForExtendScript: quoteForExtendScript
    });
}));
