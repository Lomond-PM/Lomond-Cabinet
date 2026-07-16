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

    if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol")), assertContextModule(require("./velaContext"))));
    } else if (root) {
        registerBrowserModule(root, MODULE_NAME, factory);
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, contextModule) {
    "use strict";

    var REQUEST_PROTOCOL = "vela.host-context-request.v1";
    var RESULT_PROTOCOL = "vela.host-context-result.v1";
    var SCHEMA_VERSION = "1.0";
    var HOST_ADAPTER_REVISION = "vela-context-host-v1";
    var FIXED_FACADE_PREFIX = "AE" + "Toolbox.VelaContext.handle(";
    var HOST_ERROR_CODES = Object.freeze([
        "HOST_CONTEXT_REQUEST_INVALID",
        "HOST_CONTEXT_OPERATION_UNSUPPORTED",
        "HOST_CONTEXT_BUDGET_EXCEEDED",
        "HOST_CONTEXT_UNAVAILABLE",
        "HOST_CONTEXT_TARGET_NOT_FOUND",
        "HOST_CONTEXT_SESSION_RESET_REQUIRED",
        "HOST_CONTEXT_READ_FAILED"
    ]);

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

        var usedSessionIds = new Set();
        var usedRequestIds = new Set();
        var sessionId = issueUniqueSessionId(null);
        var generation = 0;
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
            if (code === "HOST_CONTEXT_UNAVAILABLE" || code === "HOST_CONTEXT_TARGET_NOT_FOUND") { return protocol.ERROR_CODES.UNKNOWN_TARGET; }
            if (code === "HOST_CONTEXT_SESSION_RESET_REQUIRED") { return protocol.ERROR_CODES.CONTEXT_STALE; }
            return protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED;
        }

        function assertRawNumber(value, label, integer, minimum, maximum) {
            protocol.assertFiniteNumber(value, label);
            if ((integer && !Number.isInteger(value)) || value < minimum || value > maximum) {
                protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Host context number is outside its allowed range.", { details: { field: label } });
            }
            return value;
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
            protocol.assertNoUnknownKeys(snapshot, ["tier", "capabilities"], "hostContext.snapshot");
            if (snapshot.tier !== 0 || !protocol.isPlainObject(snapshot.capabilities)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 0 context is invalid."); }
            protocol.assertNoUnknownKeys(snapshot.capabilities, ["maxTier", "nativeLayerIdAvailable", "bindingContextAvailable", "hostAdapterRevision"], "hostContext.capabilities");
            if (snapshot.capabilities.maxTier !== 1 || typeof snapshot.capabilities.nativeLayerIdAvailable !== "boolean" ||
                typeof snapshot.capabilities.bindingContextAvailable !== "boolean" || snapshot.capabilities.hostAdapterRevision !== HOST_ADAPTER_REVISION) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 0 capabilities are invalid.");
            }
            return protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 0,
                executable: false,
                fingerprint: null,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: protocol.cloneJson({ sessionId: sessionId, tier: 0, capabilities: snapshot.capabilities }, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes })
            });
        }

        function normalizeTierOne(result, request) {
            var raw = result.snapshot;
            if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 1 context is invalid."); }
            protocol.assertNoUnknownKeys(raw, ["tier", "projectGeneration", "activeComp", "selection"], "hostContext.snapshot");
            if (raw.tier !== 1) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 1 context is invalid."); }
            var projectGeneration = assertRawNumber(raw.projectGeneration, "projectGeneration", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
            var normalized = { sessionId: sessionId, tier: 1 };
            var compId = null;
            if (raw.activeComp !== null) {
                if (!protocol.isPlainObject(raw.activeComp)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host active comp is invalid."); }
                protocol.assertNoUnknownKeys(raw.activeComp, ["itemId", "projectGeneration", "type", "width", "height", "duration", "frameRate"], "hostContext.activeComp");
                var itemId = assertRawNumber(raw.activeComp.itemId, "activeComp.itemId", true, 1, protocol.HARD_LIMITS.maxNumberAbs);
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
                var captured = contextApi.captureContext(normalized, {
                    selectionOrderMeaningful: request.scope.selectionOrderMeaningful,
                    bindsToDisplayName: false,
                    requireStableContext: true
                });
                return protocol.deepFreeze({
                    contextId: request.requestId,
                    requestId: request.requestId,
                    sessionId: sessionId,
                    tier: 1,
                    executable: true,
                    fingerprint: captured.fingerprint,
                    hostAdapterRevision: HOST_ADAPTER_REVISION,
                    snapshot: captured.snapshot
                });
            }
            return protocol.deepFreeze({
                contextId: request.requestId,
                requestId: request.requestId,
                sessionId: sessionId,
                tier: 1,
                executable: false,
                fingerprint: null,
                hostAdapterRevision: HOST_ADAPTER_REVISION,
                snapshot: protocol.cloneJson(normalized, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes })
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
            var requestJson;
            try {
                protocol.assertJsonBudget(request, { maxBytes: 32 * 1024 });
                requestJson = JSON.stringify(request);
            } catch (error) {
                return Promise.reject(error);
            }
            generation++;
            var capturedGeneration = generation;
            return new Promise(function (resolve, reject) {
                var record = {
                    requestId: requestId,
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
                            var captureResult = tier === 0 ? normalizeTierZero(result, request) : normalizeTierOne(result, request);
                            settle(record, capturedGeneration, null, captureResult);
                        } catch (error) {
                            settle(record, capturedGeneration, error instanceof protocol.VelaProtocolError ? error : protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED), null);
                        }
                    });
                } catch (error) {
                    settle(record, capturedGeneration, protocolError(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE), null);
                }
            });
        }

        function cancel(requestId) {
            if (!active || active.requestId !== requestId || state !== "pending") { return false; }
            return settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null);
        }

        function suspend() {
            if (state === "suspended") { return false; }
            if (active) { settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null); }
            generation++;
            state = "suspended";
            return true;
        }

        function resume() {
            if (state !== "suspended") { return false; }
            state = "idle";
            return true;
        }

        function resetSession() {
            var nextSessionId = issueUniqueSessionId(sessionId);
            if (active) { settle(active, active.generation, protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED), null); }
            generation++;
            sessionId = nextSessionId;
            state = "idle";
            return sessionId;
        }

        function compareCaptures(left, right, compareOptions) {
            compareOptions = compareOptions || {};
            protocol.assertSafeJson(left);
            protocol.assertSafeJson(right);
            if (!protocol.isPlainObject(left) || !protocol.isPlainObject(right) || !protocol.isPlainObject(compareOptions)) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context captures are invalid.");
            }
            protocol.assertNoUnknownKeys(compareOptions, ["selectionOrderMeaningful"], "contextBridge.compare");
            var orderMeaningful = compareOptions.selectionOrderMeaningful === undefined ? true : compareOptions.selectionOrderMeaningful;
            if (typeof orderMeaningful !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Context comparison option is invalid."); }
            function comparable(capture) {
                var snapshot = capture.snapshot || {};
                var selection = Array.isArray(snapshot.selection) ? snapshot.selection.map(function (item) {
                    return {
                        identity: item.layerId || ("index:" + item.layerIndex),
                        layerIndex: item.layerIndex,
                        selectedOrder: orderMeaningful ? item.selectedOrder : null,
                        matchName: item.matchName,
                        type: item.type
                    };
                }) : [];
                if (!orderMeaningful) {
                    selection.sort(function (a, b) { return String(a.identity).localeCompare(String(b.identity)); });
                }
                return {
                    sessionId: capture.sessionId,
                    tier: capture.tier,
                    compId: snapshot.activeComp ? snapshot.activeComp.compId : null,
                    selection: selection,
                    fingerprint: capture.fingerprint
                };
            }
            var fresh = protocol.canonicalStringify(comparable(left)) === protocol.canonicalStringify(comparable(right));
            return protocol.deepFreeze({ fresh: fresh, reason: fresh ? null : protocol.ERROR_CODES.CONTEXT_STALE });
        }

        function getState() {
            return protocol.deepFreeze({
                state: state,
                sessionId: sessionId,
                requestId: active ? active.requestId : null,
                generation: generation
            });
        }

        return Object.freeze({
            capture: capture,
            cancel: cancel,
            suspend: suspend,
            resume: resume,
            resetSession: resetSession,
            getSessionId: function () { return sessionId; },
            getState: getState,
            compareCaptures: compareCaptures
        });
    }

    return Object.freeze({
        createContextBridge: createContextBridge,
        quoteForExtendScript: quoteForExtendScript
    });
}));
