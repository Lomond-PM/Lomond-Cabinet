var AEToolbox = AEToolbox || {};

(function () {
    var REQUEST_PROTOCOL = "vela.host-context-request.v1";
    var RESULT_PROTOCOL = "vela.host-context-result.v1";
    var SCHEMA_VERSION = "1.0";
    var HOST_ADAPTER_REVISION = "vela-context-host-v1";
    var MAX_SELECTED_LAYERS = 32;
    var MAX_NUMBER_ABS = 1000000;
    var json = null;
    var jsonBootstrap = null;
    var jsonDescriptor = null;
    var bootstrapDescriptor = null;
    var tokenDescriptor = null;
    var bootstrapJsonDescriptor = null;
    var projectInitialized = false;
    var currentProjectReference = null;
    var projectGeneration = 1;
    var nativeLayerIdObserved = false;
    var sessionResetRequired = false;

    function hostError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    if (Object.prototype.hasOwnProperty.call(AEToolbox, "VelaContext")) {
        throw hostError("VELA_CONTEXT_MODULE_CONFLICT", "The Vela Host context module conflicts with existing state.");
    }
    try {
        jsonDescriptor = Object.getOwnPropertyDescriptor(AEToolbox, "VelaJson");
        bootstrapDescriptor = Object.getOwnPropertyDescriptor(AEToolbox, "__velaHostBootstrapV1");
        jsonBootstrap = bootstrapDescriptor && bootstrapDescriptor.value;
        tokenDescriptor = jsonBootstrap && Object.getOwnPropertyDescriptor(jsonBootstrap, "installToken");
        bootstrapJsonDescriptor = jsonBootstrap && Object.getOwnPropertyDescriptor(jsonBootstrap, "VelaJson");
    } catch (ignoredDependencyDescriptor) {
        jsonBootstrap = null;
    }
    if (!__velaHostJsonInstallTokenV1 || !jsonDescriptor || jsonDescriptor.get || jsonDescriptor.set ||
            !bootstrapDescriptor || bootstrapDescriptor.get || bootstrapDescriptor.set ||
            !tokenDescriptor || tokenDescriptor.get || tokenDescriptor.set ||
            !bootstrapJsonDescriptor || bootstrapJsonDescriptor.get || bootstrapJsonDescriptor.set ||
            tokenDescriptor.value !== __velaHostJsonInstallTokenV1 || bootstrapJsonDescriptor.value !== jsonDescriptor.value) {
        throw hostError("HOST_CONTEXT_UNAVAILABLE", "The Host context JSON dependency is unavailable.");
    }
    json = jsonDescriptor.value;

    function fail(code) {
        var messages = {
            HOST_CONTEXT_REQUEST_INVALID: "The Host context request is invalid.",
            HOST_CONTEXT_OPERATION_UNSUPPORTED: "The Host context operation is unsupported.",
            HOST_CONTEXT_BUDGET_EXCEEDED: "The Host context budget was exceeded.",
            HOST_CONTEXT_UNAVAILABLE: "The requested Host context is unavailable.",
            HOST_CONTEXT_TARGET_NOT_FOUND: "The requested Host context target was not found.",
            HOST_CONTEXT_SESSION_RESET_REQUIRED: "The Host context session must be reset.",
            HOST_CONTEXT_READ_FAILED: "The Host context could not be read."
        };
        throw hostError(code, messages[code] || messages.HOST_CONTEXT_READ_FAILED);
    }

    function own(value, key) {
        return Object.prototype.hasOwnProperty.call(value, key);
    }

    function assertKeys(value, allowed) {
        var key;
        var i;
        var found;
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        for (key in value) {
            if (!own(value, key)) {
                continue;
            }
            found = false;
            for (i = 0; i < allowed.length; i++) {
                if (key === allowed[i]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                fail("HOST_CONTEXT_REQUEST_INVALID");
            }
        }
    }

    function assertLocalId(value, kind) {
        if (typeof value !== "string" || json.utf8ByteLength(value) > 128 ||
            !(new RegExp("^" + kind + "_[a-z0-9]{32,96}$")).test(value)) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        return value;
    }

    function isSafeLocalId(value, kind) {
        try {
            return typeof value === "string" && json.utf8ByteLength(value) <= 128 &&
                (new RegExp("^" + kind + "_[a-z0-9]{32,96}$")).test(value);
        } catch (ignored) {
            return false;
        }
    }

    function assertFiniteNumber(value, integer, minimum, maximum) {
        if (typeof value !== "number" || !isFinite(value) || (value === 0 && 1 / value === -Infinity) ||
            Math.abs(value) > MAX_NUMBER_ABS || (integer && Math.floor(value) !== value) ||
            value < minimum || value > maximum) {
            fail("HOST_CONTEXT_READ_FAILED");
        }
        return value;
    }

    function assertBoundedString(value, maximumBytes, allowEmpty) {
        if (typeof value !== "string" || (!allowEmpty && !value.length) || json.utf8ByteLength(value) > maximumBytes) {
            fail("HOST_CONTEXT_BUDGET_EXCEEDED");
        }
        return value;
    }

    function validateRequest(value) {
        var operation;
        assertKeys(value, ["protocol", "schemaVersion", "requestId", "sessionId", "operation", "tier", "scope"]);
        if (value.protocol !== REQUEST_PROTOCOL || value.schemaVersion !== SCHEMA_VERSION) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        assertLocalId(value.requestId, "req");
        assertLocalId(value.sessionId, "session");
        operation = value.operation;
        if (operation !== "getCapabilities" && operation !== "captureContext") {
            fail("HOST_CONTEXT_OPERATION_UNSUPPORTED");
        }
        if ((value.tier !== 0 && value.tier !== 1) ||
            (operation === "getCapabilities" && value.tier !== 0)) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        assertKeys(value.scope, ["purpose", "selectionOrderMeaningful"]);
        if (value.scope.purpose !== "display" && value.scope.purpose !== "binding") {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        if (typeof value.scope.selectionOrderMeaningful !== "boolean") {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        return value;
    }

    function makeBase(request, ok) {
        var safeOperation = request && (request.operation === "getCapabilities" || request.operation === "captureContext") ? request.operation : "unknown";
        return {
            protocol: RESULT_PROTOCOL,
            schemaVersion: SCHEMA_VERSION,
            requestId: request && isSafeLocalId(request.requestId, "req") ? request.requestId : "unknown",
            sessionId: request && isSafeLocalId(request.sessionId, "session") ? request.sessionId : "unknown",
            operation: safeOperation,
            ok: ok,
            hostAdapterRevision: HOST_ADAPTER_REVISION
        };
    }

    function errorResult(request, code) {
        var messages = {
            HOST_CONTEXT_REQUEST_INVALID: "The Host context request is invalid.",
            HOST_CONTEXT_OPERATION_UNSUPPORTED: "The Host context operation is unsupported.",
            HOST_CONTEXT_BUDGET_EXCEEDED: "The Host context budget was exceeded.",
            HOST_CONTEXT_UNAVAILABLE: "The requested Host context is unavailable.",
            HOST_CONTEXT_TARGET_NOT_FOUND: "The requested Host context target was not found.",
            HOST_CONTEXT_SESSION_RESET_REQUIRED: "The Host context session must be reset.",
            HOST_CONTEXT_READ_FAILED: "The Host context could not be read."
        };
        var result = makeBase(request, false);
        result.error = {
            code: messages[code] ? code : "HOST_CONTEXT_READ_FAILED",
            message: messages[code] || messages.HOST_CONTEXT_READ_FAILED
        };
        return result;
    }

    function getCapabilitiesSnapshot() {
        return {
            tier: 0,
            capabilities: {
                maxTier: 1,
                nativeLayerIdAvailable: sessionResetRequired ? false : nativeLayerIdObserved,
                bindingContextAvailable: sessionResetRequired ? false : nativeLayerIdObserved,
                hostAdapterRevision: HOST_ADAPTER_REVISION
            }
        };
    }

    function reload() {
        projectInitialized = false;
        currentProjectReference = null;
        projectGeneration = 1;
        nativeLayerIdObserved = false;
        sessionResetRequired = false;
        return true;
    }

    function observeProject(project) {
        if (!projectInitialized) {
            currentProjectReference = project;
            projectInitialized = true;
            return;
        }
        if (project !== currentProjectReference) {
            if (projectGeneration >= MAX_NUMBER_ABS) {
                sessionResetRequired = true;
                nativeLayerIdObserved = false;
                fail("HOST_CONTEXT_SESSION_RESET_REQUIRED");
            }
            currentProjectReference = project;
            projectGeneration++;
            nativeLayerIdObserved = false;
        }
    }

    function layerType(matchName) {
        if (matchName === "ADBE Text Layer") {
            return "text";
        }
        if (matchName === "ADBE Vector Layer") {
            return "shape";
        }
        if (matchName === "ADBE Camera Layer") {
            return "camera";
        }
        if (matchName === "ADBE Light Layer") {
            return "light";
        }
        if (matchName === "ADBE AV Layer") {
            return "av";
        }
        return "layer";
    }

    function readNativeLayerId(layer) {
        var value;
        try {
            value = layer.id;
        } catch (ignored) {
            return null;
        }
        if (typeof value !== "number" || !isFinite(value) || Math.floor(value) !== value || value < 1 || value > MAX_NUMBER_ABS) {
            return null;
        }
        return value;
    }

    function readTierOne(request) {
        var project;
        var activeItem;
        var selected;
        var itemId;
        var snapshot;
        var items = [];
        var allNative = true;
        var seenIds = {};
        var i;
        var layer;
        var nativeId;
        var matchName;

        if (sessionResetRequired) {
            fail("HOST_CONTEXT_SESSION_RESET_REQUIRED");
        }
        try {
            project = app && app.project ? app.project : null;
        } catch (ignoredProject) {
            fail("HOST_CONTEXT_READ_FAILED");
        }
        observeProject(project);
        if (!project) {
            if (request.scope.purpose === "binding") {
                fail("HOST_CONTEXT_UNAVAILABLE");
            }
            return {
                tier: 1,
                projectGeneration: projectGeneration,
                activeComp: null,
                selection: { count: 0, identityQuality: "index-only", items: [] }
            };
        }
        try {
            activeItem = project.activeItem;
        } catch (ignoredActive) {
            fail("HOST_CONTEXT_READ_FAILED");
        }
        if (!activeItem || typeof CompItem === "undefined" || !(activeItem instanceof CompItem)) {
            if (request.scope.purpose === "binding") {
                fail("HOST_CONTEXT_UNAVAILABLE");
            }
            return {
                tier: 1,
                projectGeneration: projectGeneration,
                activeComp: null,
                selection: { count: 0, identityQuality: "index-only", items: [] }
            };
        }
        try {
            itemId = assertFiniteNumber(activeItem.id, true, 1, MAX_NUMBER_ABS);
            selected = activeItem.selectedLayers || [];
        } catch (ignoredComp) {
            fail("HOST_CONTEXT_READ_FAILED");
        }
        if (selected.length > MAX_SELECTED_LAYERS) {
            if (request.scope.purpose === "binding") {
                fail("HOST_CONTEXT_BUDGET_EXCEEDED");
            }
            return {
                tier: 1,
                projectGeneration: projectGeneration,
                activeComp: {
                    itemId: itemId,
                    projectGeneration: projectGeneration,
                    type: "CompItem",
                    width: assertFiniteNumber(activeItem.width, true, 1, 30000),
                    height: assertFiniteNumber(activeItem.height, true, 1, 30000),
                    duration: assertFiniteNumber(activeItem.duration, false, 0, MAX_NUMBER_ABS),
                    frameRate: assertFiniteNumber(activeItem.frameRate, false, 0.000001, MAX_NUMBER_ABS)
                },
                selection: {
                    count: assertFiniteNumber(selected.length, true, 0, MAX_NUMBER_ABS),
                    identityQuality: "index-only",
                    omitted: true,
                    omittedReason: "selection-limit",
                    items: []
                }
            };
        }
        for (i = 0; i < selected.length; i++) {
            layer = selected[i];
            nativeId = readNativeLayerId(layer);
            matchName = assertBoundedString(String(layer.matchName || ""), 256, true);
            if (nativeId === null) {
                allNative = false;
            } else {
                if (seenIds[String(nativeId)]) {
                    fail("HOST_CONTEXT_READ_FAILED");
                }
                seenIds[String(nativeId)] = true;
            }
            var item = {
                layerIndex: assertFiniteNumber(layer.index, true, 1, MAX_NUMBER_ABS),
                selectedOrder: i,
                matchName: matchName,
                type: assertBoundedString(layerType(matchName), 256, false)
            };
            if (nativeId !== null) {
                item.nativeLayerId = nativeId;
            }
            items[items.length] = item;
        }
        if (selected.length > 0 && allNative) {
            nativeLayerIdObserved = true;
        }
        if (request.scope.purpose === "binding" && (!nativeLayerIdObserved || !allNative)) {
            fail("HOST_CONTEXT_UNAVAILABLE");
        }
        snapshot = {
            tier: 1,
            projectGeneration: projectGeneration,
            activeComp: {
                itemId: itemId,
                projectGeneration: projectGeneration,
                type: "CompItem",
                width: assertFiniteNumber(activeItem.width, true, 1, 30000),
                height: assertFiniteNumber(activeItem.height, true, 1, 30000),
                duration: assertFiniteNumber(activeItem.duration, false, 0, MAX_NUMBER_ABS),
                frameRate: assertFiniteNumber(activeItem.frameRate, false, 0.000001, MAX_NUMBER_ABS)
            },
            selection: {
                count: selected.length,
                identityQuality: allNative && nativeLayerIdObserved ? "native-layer-id" : "index-only",
                items: items
            }
        };
        return snapshot;
    }

    function handle(requestJson) {
        var request = null;
        var result;
        var code;
        try {
            request = json.parseBounded(requestJson, {
                maxBytes: 32 * 1024,
                maxStringBytes: 8 * 1024,
                maxDepth: 8,
                maxArrayLength: 64,
                maxObjectProperties: 64
            });
            validateRequest(request);
            result = makeBase(request, true);
            if (request.operation === "getCapabilities" || request.tier === 0) {
                result.snapshot = getCapabilitiesSnapshot();
            } else {
                result.snapshot = readTierOne(request);
            }
            return json.stringifyBounded(result, {
                maxBytes: 16 * 1024,
                maxStringBytes: 8 * 1024,
                maxDepth: 5,
                maxArrayLength: 64,
                maxObjectProperties: 64
            });
        } catch (error) {
            code = error && typeof error.code === "string" ? error.code : "HOST_CONTEXT_READ_FAILED";
            try {
                return json.stringifyBounded(errorResult(request, code), {
                    maxBytes: 16 * 1024,
                    maxStringBytes: 8 * 1024,
                    maxDepth: 5,
                    maxArrayLength: 64,
                    maxObjectProperties: 64
                });
            } catch (ignoredResult) {
                return "{\"error\":{\"code\":\"HOST_CONTEXT_READ_FAILED\",\"message\":\"The Host context could not be read.\"},\"hostAdapterRevision\":\"vela-context-host-v1\",\"ok\":false,\"operation\":\"unknown\",\"protocol\":\"vela.host-context-result.v1\",\"requestId\":\"unknown\",\"schemaVersion\":\"1.0\",\"sessionId\":\"unknown\"}";
            }
        }
    }

    if (!json || json.revision !== "vela-json-host-v1" || typeof json.parseBounded !== "function" || typeof json.stringifyBounded !== "function") {
        throw hostError("HOST_CONTEXT_UNAVAILABLE", "The Host context facade is unavailable.");
    }
    var api = {
        hostAdapterRevision: HOST_ADAPTER_REVISION,
        handle: handle,
        reload: reload
    };
    if (typeof Object.freeze === "function") {
        Object.freeze(api);
    }
    if (typeof Object.defineProperty === "function") {
        try {
            Object.defineProperty(AEToolbox, "VelaContext", {
                configurable: false,
                enumerable: true,
                value: api,
                writable: false
            });
        } catch (ignoredInstall) {
            AEToolbox.VelaContext = api;
        }
    } else {
        AEToolbox.VelaContext = api;
    }
    if (AEToolbox.VelaContext !== api) {
        throw hostError("HOST_CONTEXT_UNAVAILABLE", "The Host context facade is unavailable.");
    }
}());
