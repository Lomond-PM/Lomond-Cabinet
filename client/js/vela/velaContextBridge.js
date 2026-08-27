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
    var executionPorts = new WeakMap();
    var executionPortProtocols = new WeakMap();
    var reviewPorts = new WeakMap();
    var reviewPortProtocols = new WeakMap();
    var providerContextPorts = new WeakMap();
    var providerContextPortProtocols = new WeakMap();
    var OPACITY_PROPERTY_PATH = Object.freeze(["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0]);

    function isTrustedContextBridge(bridge) {
        return Boolean(bridge && trustedContextBridges.has(bridge));
    }

    function isTrustedContextBridgeForProtocol(bridge, protocol) {
        return Boolean(isTrustedContextBridge(bridge) && protocolModule.isTrustedProtocol(protocol) && contextBridgeProtocols.get(bridge) === protocol);
    }

    function createExecutionPort(bridge, protocol) {
        var port;
        if (!isTrustedContextBridgeForProtocol(bridge, protocol)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        port = executionPorts.get(bridge);
        if (!port) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        return port;
    }

    function isTrustedExecutionPortForProtocol(port, protocol) {
        return Boolean(port && protocolModule.isTrustedProtocol(protocol) && executionPortProtocols.get(port) === protocol);
    }

    function createReviewPort(bridge, protocol) {
        var port;
        if (!isTrustedContextBridgeForProtocol(bridge, protocol)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        port = reviewPorts.get(bridge);
        if (!port) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        return port;
    }

    function isTrustedReviewPortForProtocol(port, protocol) {
        return Boolean(port && protocolModule.isTrustedProtocol(protocol) && reviewPortProtocols.get(port) === protocol);
    }

    function createProviderContextPort(bridge, protocol) {
        var port;
        if (!isTrustedContextBridgeForProtocol(bridge, protocol)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        port = providerContextPorts.get(bridge);
        if (!port) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        return port;
    }

    function isTrustedProviderContextPortForProtocol(port, protocol) {
        return Boolean(port && protocolModule.isTrustedProtocol(protocol) && providerContextPortProtocols.get(port) === protocol);
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
        var ownedCaptureHandles = new WeakMap();
        var failureDetails = new WeakMap();
        var contextDiagnostics = Object.freeze({ lastContextOperation: null, lastContextDisposition: null, lastContextFailureStage: null, lastContextHostErrorCode: null, lastContextHostFailureStage: null, lastContextErrorCode: null, lastContextUnavailableReason: null });

        function closedOperation(request) {
            if (request && request.operation === "captureContext") { return "capture-context"; }
            if (request && request.operation === "capturePropertyValues") { return "capture-property-values"; }
            return null;
        }

        function closedUnavailableReason(value) {
            return value === "no-project" || value === "no-active-composition" || value === "no-actionable-target" ? value : null;
        }

        function closedHostFailureStage(value) {
            return value === "project-read" || value === "project-transition" || value === "active-item-read" || value === "active-item-classification" ? value : null;
        }

        function rememberFailure(error, stage, hostErrorCode, unavailableReason, hostFailureStage) {
            if (error && (typeof error === "object" || typeof error === "function")) {
                failureDetails.set(error, Object.freeze({ stage: stage || null, hostErrorCode: hostErrorCode || null, hostFailureStage: closedHostFailureStage(hostFailureStage), unavailableReason: closedUnavailableReason(unavailableReason) }));
            }
            return error;
        }

        function recordContextTerminal(record, disposition, details, error) {
            details = details || {};
            contextDiagnostics = Object.freeze({
                lastContextOperation: closedOperation(record && record.request),
                lastContextDisposition: disposition,
                lastContextFailureStage: details.stage || null,
                lastContextHostErrorCode: details.hostErrorCode || null,
                lastContextHostFailureStage: details.hostFailureStage || null,
                lastContextErrorCode: error && typeof error.code === "string" ? error.code : null,
                lastContextUnavailableReason: details.unavailableReason || null
            });
        }

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

        function settle(record, capturedGeneration, error, value, terminalDisposition, terminalDetails) {
            if (!recordMatches(record, capturedGeneration)) { return false; }
            record.settled = true;
            clearRecordTimer(record);
            if (record.ownedHandle) { ownedCaptureHandles.delete(record.ownedHandle); }
            active = null;
            state = "idle";
            recordContextTerminal(record, terminalDisposition || (error ? "failed" : "completed"), terminalDetails || (error && failureDetails.get(error)), error);
            if (error) { record.reject(error); }
            else { record.resolve(value); }
            return true;
        }

        function mapHostError(code, reason) {
            if (code === "HOST_CONTEXT_BUDGET_EXCEEDED") { return protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED; }
            if (code === "HOST_CONTEXT_TARGET_NOT_FOUND") { return protocol.ERROR_CODES.UNKNOWN_TARGET; }
            if (code === "HOST_CONTEXT_UNAVAILABLE") {
                if (reason === "no-project" || reason === "no-active-composition" || reason === "no-actionable-target") {
                    return protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE;
                }
                return protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE;
            }
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
                    valueDigest: target.valueDigest,
                    reviewValue: target.reviewValue === undefined ? null : target.reviewValue
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
            catch (error) { throw rememberFailure(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED), "raw-json", null, null); }
            try {
                protocol.assertSafeJson(result, { allowDangerousPaths: ["error.code"] });
                if (!protocol.isPlainObject(result)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context result is invalid."); }
                var baseKeys = ["protocol", "schemaVersion", "requestId", "sessionId", "operation", "ok", "hostAdapterRevision"];
                protocol.assertNoUnknownKeys(result, baseKeys.concat(result.ok === true ? ["snapshot"] : ["error"]), "hostContext.result");
                if (result.protocol !== RESULT_PROTOCOL || result.schemaVersion !== SCHEMA_VERSION || result.requestId !== request.requestId ||
                    result.sessionId !== request.sessionId || result.operation !== request.operation || result.hostAdapterRevision !== HOST_ADAPTER_REVISION ||
                    typeof result.ok !== "boolean") {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context result metadata is invalid.");
                }
            } catch (error) { throw rememberFailure(error, "raw-envelope", null, null); }
            if (!result.ok) {
                try {
                    if (!protocol.isPlainObject(result.error)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context error is invalid."); }
                    protocol.assertNoUnknownKeys(result.error, ["code", "message", "reason", "stage"], "hostContext.error");
                    if (HOST_ERROR_CODES.indexOf(result.error.code) === -1 || typeof result.error.message !== "string") {
                        protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context error is invalid.");
                    }
                    if (result.error.reason !== undefined && typeof result.error.reason !== "string") {
                        protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context error reason is invalid.");
                    }
                    if (result.error.stage !== undefined && (result.error.code !== "HOST_CONTEXT_READ_FAILED" || closedHostFailureStage(result.error.stage) !== result.error.stage)) {
                        protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host context error stage is invalid.");
                    }
                } catch (error) { throw rememberFailure(error, "raw-envelope", null, null); }
                throw rememberFailure(protocolError(protocol, mapHostError(result.error.code, result.error.reason)), "host-error", result.error.code, result.error.reason, result.error.stage);
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
            try {
                if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 1 context is invalid."); }
                protocol.assertNoUnknownKeys(raw, ["hostInstanceId", "hostReloadEpoch", "tier", "projectGeneration", "activeComp", "selection"], "hostContext.snapshot");
                if (raw.tier !== 1) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 1 context is invalid."); }
            } catch (error) { throw rememberFailure(error, "tier1-base", null, null); }
            var authority;
            try { authority = normalizeHostAuthority(raw); }
            catch (error) { throw rememberFailure(error, "host-authority", null, null); }
            var projectGeneration;
            try { projectGeneration = assertRawNumber(raw.projectGeneration, "projectGeneration", true, 1, protocol.HARD_LIMITS.maxNumberAbs); }
            catch (error) { throw rememberFailure(error, "tier1-base", null, null); }
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

        function beginOwnedCapture(captureOptions) {
            captureOptions = captureOptions || {};
            if (!protocol.isPlainObject(captureOptions)) {
                return Object.freeze({ promise: Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED)), handle: null });
            }
            try { protocol.assertNoUnknownKeys(captureOptions, ["tier", "purpose", "selectionOrderMeaningful"], "contextBridge.capture"); }
            catch (error) { return Object.freeze({ promise: Promise.reject(error), handle: null }); }
            if (state === "suspended") { return Object.freeze({ promise: Promise.reject(protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED)), handle: null }); }
            if (state === "pending") { return Object.freeze({ promise: Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)), handle: null }); }
            var tier = captureOptions.tier === undefined ? 1 : captureOptions.tier;
            var purpose = captureOptions.purpose === undefined ? "display" : captureOptions.purpose;
            var selectionOrderMeaningful = captureOptions.selectionOrderMeaningful === undefined ? true : captureOptions.selectionOrderMeaningful;
            if ((tier !== 0 && tier !== 1) || (purpose !== "display" && purpose !== "binding") || typeof selectionOrderMeaningful !== "boolean") {
                return Object.freeze({ promise: Promise.reject(protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED)), handle: null });
            }
            var requestId;
            try { requestId = nextRequestId(); }
            catch (error) { return Object.freeze({ promise: Promise.reject(error), handle: null }); }
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
            return startRequest(request, tier === 0 ? normalizeTierZero : normalizeTierOne, true);
        }

        function capture(captureOptions) {
            return beginOwnedCapture(captureOptions).promise;
        }

        function startRequest(request, normalizer, exposeOwnership) {
            var requestJson;
            try {
                protocol.assertJsonBudget(request, { maxBytes: 32 * 1024 });
                requestJson = JSON.stringify(request);
            } catch (error) {
                if (exposeOwnership) { return Object.freeze({ promise: Promise.reject(error), handle: null }); }
                return Promise.reject(error);
            }
            requestGeneration++;
            var capturedGeneration = requestGeneration;
            var ownedHandle = exposeOwnership ? Object.freeze({}) : null;
            var promise = new Promise(function (resolve, reject) {
                var record = {
                    requestId: request.requestId,
                    sessionId: sessionId,
                    generation: capturedGeneration,
                    request: request,
                    resolve: resolve,
                    reject: reject,
                    timer: null,
                    settled: false,
                    ownedHandle: ownedHandle
                };
                active = record;
                if (ownedHandle) { ownedCaptureHandles.set(ownedHandle, record); }
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
                            settle(record, capturedGeneration, null, captureResult, "completed", null);
                        } catch (error) {
                            var terminalError = error instanceof protocol.VelaProtocolError || isBridgeLocalError(error) ? error : protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
                            var details = failureDetails.get(error) || null;
                            settle(record, capturedGeneration, terminalError, null, terminalError.code === protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE ? "unavailable" : "failed", details);
                        }
                    });
                } catch (error) {
                    settle(record, capturedGeneration, protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE), null);
                }
            });
            return exposeOwnership ? Object.freeze({ promise: promise, handle: ownedHandle }) : promise;
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
                var dataDescriptor;
                var reviewValue = null;
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
                if (descriptor.valueKind === "number" && target.propertyMatchName === "ADBE Opacity" &&
                        protocol.canonicalStringify(expected.propertyPath) === protocol.canonicalStringify(OPACITY_PROPERTY_PATH)) {
                    try { dataDescriptor = Object.getOwnPropertyDescriptor(target.value, "data"); }
                    catch (error) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Opacity review value is unavailable."); }
                    if (!dataDescriptor || dataDescriptor.get || dataDescriptor.set || !Object.prototype.hasOwnProperty.call(dataDescriptor, "value") ||
                            typeof dataDescriptor.value !== "number" || !Number.isFinite(dataDescriptor.value) || isNegativeZero(dataDescriptor.value) ||
                            dataDescriptor.value < 0 || dataDescriptor.value > 100) {
                        protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Opacity review value is invalid.");
                    }
                    reviewValue = dataDescriptor.value;
                }
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
                    valueDigest: descriptor.valueDigest,
                    reviewValue: reviewValue
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

        function beginOwnedPropertyValueCapture(bindingCapture, targets) {
            try {
                if (state === "suspended") { return Object.freeze({ promise: Promise.reject(protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED)), handle: null }); }
                if (state === "pending") { return Object.freeze({ promise: Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)), handle: null }); }
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
                return startRequest(request, function (result, hostRequest) { return normalizePropertyValueTierThree(result, hostRequest, bindingRecord, normalizedTargets); }, true);
            } catch (error) {
                return Object.freeze({ promise: Promise.reject(error), handle: null });
            }
        }

        function capturePropertyValues(bindingCapture, targets) {
            return beginOwnedPropertyValueCapture(bindingCapture, targets).promise;
        }

        function createPrivateExecutionRequest(action, trustedExecutionContext) {
            var bindingDescriptor;
            var valueDescriptor;
            var bindingCapture;
            var valueCapture;
            var bindingRecord;
            var valueRecord;
            var target;
            var payload;
            var valueTarget;
            var index;
            try {
                bindingDescriptor = Object.getOwnPropertyDescriptor(trustedExecutionContext, "bindingCapture");
                valueDescriptor = Object.getOwnPropertyDescriptor(trustedExecutionContext, "valueCapture");
            } catch (error) { throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE); }
            if (!trustedExecutionContext || !Object.isFrozen(trustedExecutionContext) || !bindingDescriptor || bindingDescriptor.get || bindingDescriptor.set ||
                    !valueDescriptor || valueDescriptor.get || valueDescriptor.set) {
                throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE);
            }
            bindingCapture = bindingDescriptor.value;
            valueCapture = valueDescriptor.value;
            bindingRecord = trustedBindingRecord(bindingCapture);
            valueRecord = captureRecords.get(valueCapture);
            if (!valueRecord || valueRecord.bridgeToken !== bridgeToken || valueRecord.protocol !== protocol || valueRecord.purpose !== "property-value-binding" ||
                    valueRecord.bindingFingerprint !== bindingRecord.fingerprint || valueRecord.sessionId !== sessionId ||
                    valueRecord.bridgeLifecycleEpoch !== bridgeLifecycleEpoch || !currentHostAuthority ||
                    bindingRecord.hostInstanceId !== currentHostAuthority.hostInstanceId || bindingRecord.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch) {
                throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE);
            }
            if (!protocol.isPlainObject(action) || action.kind !== "tool") { throw protocolError(protocol, protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE); }
            target = protocol.getOwnDataProperty(action, "target");
            payload = protocol.getOwnDataProperty(action, "payload");
            if (!protocol.isPlainObject(target) || !protocol.isPlainObject(payload) || payload.toolId !== "vela" || payload.actionId !== "set-opacity-v1" ||
                    !protocol.isPlainObject(payload.params) || typeof protocol.getOwnDataProperty(payload.params, "opacity") !== "number") {
                throw protocolError(protocol, protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE);
            }
            for (index = 0; index < valueRecord.valueTargets.length; index += 1) {
                if (valueRecord.valueTargets[index].layerId === target.layerId && valueRecord.valueTargets[index].propertyMatchName === target.propertyMatchName &&
                        protocol.canonicalStringify(valueRecord.valueTargets[index].propertyPath) === protocol.canonicalStringify(target.propertyPath) &&
                        valueRecord.valueTargets[index].valueDigest === target.propertyValueDigest) {
                    valueTarget = valueRecord.valueTargets[index];
                    break;
                }
            }
            if (!valueTarget) { throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE); }
            return protocol.deepFreeze({
                protocol: "vela.host-execution-request.v1",
                schemaVersion: "1.0",
                requestId: nextRequestId(),
                sessionId: sessionId,
                operation: "executeCapability",
                capabilityId: "set-opacity-v1",
                scope: {
                    expectedHostInstanceId: bindingRecord.hostInstanceId,
                    expectedHostReloadEpoch: bindingRecord.hostReloadEpoch,
                    expectedProjectGeneration: bindingRecord.projectGeneration,
                    target: {
                        itemId: bindingRecord.itemId,
                        nativeLayerId: valueTarget.nativeLayerId,
                        layerIndex: valueTarget.layerIndex,
                        propertyPath: protocol.cloneJson(valueTarget.propertyPath, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }),
                        propertyMatchName: valueTarget.propertyMatchName,
                        expectedValueDigest: valueTarget.valueDigest
                    },
                    params: { opacity: protocol.getOwnDataProperty(payload.params, "opacity") }
                }
            });
        }

        function createPrivateReviewSummary(bindingCapture, valueCapture) {
            var bindingRecord = trustedBindingRecord(bindingCapture);
            var valueRecord = captureRecords.get(valueCapture);
            var valueTarget;
            if (!valueRecord || valueRecord.bridgeToken !== bridgeToken || valueRecord.protocol !== protocol || valueRecord.purpose !== "property-value-binding" ||
                    valueRecord.bindingFingerprint !== bindingRecord.fingerprint || valueRecord.sessionId !== sessionId ||
                    !Object.isFrozen(valueCapture) || protocol.canonicalStringify(valueCapture) !== valueRecord.publicCanonical ||
                    valueRecord.bridgeLifecycleEpoch !== bridgeLifecycleEpoch || !currentHostAuthority ||
                    bindingRecord.hostInstanceId !== currentHostAuthority.hostInstanceId || bindingRecord.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch ||
                    valueRecord.valueTargets.length !== 1) {
                throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE);
            }
            valueTarget = valueRecord.valueTargets[0];
            if (valueTarget.propertyMatchName !== "ADBE Opacity" || valueTarget.valueKind !== "number" ||
                    protocol.canonicalStringify(valueTarget.propertyPath) !== protocol.canonicalStringify(OPACITY_PROPERTY_PATH) ||
                    typeof valueTarget.reviewValue !== "number" || !Number.isFinite(valueTarget.reviewValue) || isNegativeZero(valueTarget.reviewValue) ||
                    valueTarget.reviewValue < 0 || valueTarget.reviewValue > 100) {
                throw protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
            }
            return protocol.deepFreeze({
                valueKind: "number",
                beforeValue: valueTarget.reviewValue
            });
        }

        function createPrivateProviderRequestContext(bindingCapture, valueCapture) {
            var bindingRecord = trustedBindingRecord(bindingCapture);
            var snapshot = bindingCapture.snapshot;
            var selection = snapshot && snapshot.selection;
            var activeComp = snapshot && snapshot.activeComp;
            var first = Array.isArray(selection) && selection.length ? selection[0] : null;
            var projection = {
                activeCompositionType: activeComp && typeof activeComp.type === "string" ? activeComp.type : "none",
                selectedLayerCount: Array.isArray(selection) ? selection.length : 0,
                firstSelectedLayerType: first && typeof first.type === "string" ? first.type : "none",
                selectedLayerOpacity: { available: false }
            };
            var valueRecord;
            var valueTarget;
            if (valueCapture === null || valueCapture === undefined) { return protocol.deepFreeze(projection); }
            valueRecord = captureRecords.get(valueCapture);
            if (!valueRecord || valueRecord.bridgeToken !== bridgeToken || valueRecord.protocol !== protocol || valueRecord.purpose !== "property-value-binding" ||
                    valueRecord.bindingFingerprint !== bindingRecord.fingerprint || valueRecord.sessionId !== sessionId ||
                    valueRecord.bridgeLifecycleEpoch !== bridgeLifecycleEpoch || !Object.isFrozen(valueCapture) ||
                    protocol.canonicalStringify(valueCapture) !== valueRecord.publicCanonical || !currentHostAuthority ||
                    bindingRecord.hostInstanceId !== currentHostAuthority.hostInstanceId || bindingRecord.hostReloadEpoch !== currentHostAuthority.hostReloadEpoch ||
                    valueRecord.valueTargets.length !== 1) {
                throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE);
            }
            valueTarget = valueRecord.valueTargets[0];
            if (projection.selectedLayerCount !== 1 || !first || valueTarget.layerId !== first.layerId ||
                    valueTarget.propertyMatchName !== "ADBE Opacity" || valueTarget.valueKind !== "number" ||
                    protocol.canonicalStringify(valueTarget.propertyPath) !== protocol.canonicalStringify(OPACITY_PROPERTY_PATH) ||
                    typeof valueTarget.reviewValue !== "number" || !Number.isFinite(valueTarget.reviewValue) || isNegativeZero(valueTarget.reviewValue) ||
                    valueTarget.reviewValue < 0 || valueTarget.reviewValue > 100) {
                throw protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
            }
            projection.selectedLayerOpacity = { available: true, value: valueTarget.reviewValue };
            return protocol.deepFreeze(projection);
        }

        function cancel(requestId) {
            if (!active || active.requestId !== requestId || state !== "pending") { return false; }
            return settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null, "cancelled", null);
        }

        function cancelOwnedCapture(handle) {
            var record = ownedCaptureHandles.get(handle);
            if (!record || active !== record || state !== "pending") { return false; }
            return settle(record, record.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null, "cancelled", null);
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

        function getDiagnostics() {
            return Object.freeze({
                lastContextOperation: contextDiagnostics.lastContextOperation,
                lastContextDisposition: contextDiagnostics.lastContextDisposition,
                lastContextFailureStage: contextDiagnostics.lastContextFailureStage,
                lastContextHostErrorCode: contextDiagnostics.lastContextHostErrorCode,
                lastContextHostFailureStage: contextDiagnostics.lastContextHostFailureStage,
                lastContextErrorCode: contextDiagnostics.lastContextErrorCode,
                lastContextUnavailableReason: contextDiagnostics.lastContextUnavailableReason
            });
        }

        var bridge = Object.freeze({
            capture: capture,
            beginOwnedCapture: beginOwnedCapture,
            captureLayerDetails: captureLayerDetails,
            capturePropertyValues: capturePropertyValues,
            beginOwnedPropertyValueCapture: beginOwnedPropertyValueCapture,
            resolvePropertyTargets: resolvePropertyTargets,
            cancel: cancel,
            cancelOwnedCapture: cancelOwnedCapture,
            suspend: suspend,
            resume: resume,
            resetSession: resetSession,
            getSessionId: function () { return sessionId; },
            getState: getState,
            getDiagnostics: getDiagnostics,
            compareCaptures: compareCaptures
        });
        trustedContextBridges.add(bridge);
        contextBridgeProtocols.set(bridge, protocol);
        var executionPort = Object.freeze({ buildRequest: createPrivateExecutionRequest });
        executionPorts.set(bridge, executionPort);
        executionPortProtocols.set(executionPort, protocol);
        var reviewPort = Object.freeze({ summarize: createPrivateReviewSummary });
        reviewPorts.set(bridge, reviewPort);
        reviewPortProtocols.set(reviewPort, protocol);
        var providerContextPort = Object.freeze({
            project: createPrivateProviderRequestContext,
            unavailable: function () {
                return protocol.deepFreeze({
                    activeCompositionType: "none",
                    selectedLayerCount: 0,
                    firstSelectedLayerType: "none",
                    selectedLayerOpacity: { available: false }
                });
            }
        });
        providerContextPorts.set(bridge, providerContextPort);
        providerContextPortProtocols.set(providerContextPort, protocol);
        return bridge;
    }

    return Object.freeze({
        createContextBridge: createContextBridge,
        isTrustedContextBridge: isTrustedContextBridge,
        isTrustedContextBridgeForProtocol: isTrustedContextBridgeForProtocol,
        createExecutionPort: createExecutionPort,
        isTrustedExecutionPortForProtocol: isTrustedExecutionPortForProtocol,
        createReviewPort: createReviewPort,
        isTrustedReviewPortForProtocol: isTrustedReviewPortForProtocol,
        createProviderContextPort: createProviderContextPort,
        isTrustedProviderContextPortForProtocol: isTrustedProviderContextPortForProtocol,
        quoteForExtendScript: quoteForExtendScript
    });
}));
