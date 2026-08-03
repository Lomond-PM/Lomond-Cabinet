var AEToolbox = AEToolbox || {};

(function () {
    var REQUEST_PROTOCOL = "vela.host-context-request.v1";
    var RESULT_PROTOCOL = "vela.host-context-result.v1";
    var SCHEMA_VERSION = "1.0";
    var HOST_ADAPTER_REVISION = "vela-context-host-v4";
    var MAX_SELECTED_LAYERS = 32;
    var MAX_TIER_TWO_LAYERS = 8;
    var MAX_PROPERTY_TARGETS = 4;
    var MAX_PROPERTY_PATH_LEVELS = 12;
    var MAX_NUMBER_ABS = 1000000;
    var MAX_PROPERTY_VALUE_BYTES = 1024;
    var MAX_PROPERTY_VALUE_AGGREGATE_BYTES = 4096;
    var HOST_INSTANCE_ID_PATTERN = /^host_[a-f0-9]{48}$/;
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
    var hostReloadEpoch = 1;
    var hostIdCounter = 0;
    var issuedHostInstanceIds = {};
    var hostInstanceId = createHostInstanceId();

    function hostError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function fixedHex(value) {
        var hex = Math.floor(value >>> 0).toString(16);
        while (hex.length < 8) { hex = "0" + hex; }
        return hex.substring(hex.length - 8);
    }

    function createHostInstanceId() {
        var attempts = 5;
        var now;
        var randomA;
        var randomB;
        var randomC;
        var candidate;
        while (attempts > 0) {
            attempts--;
            try {
                now = (new Date()).getTime();
                randomA = Math.floor(Math.random() * 4294967296);
                randomB = Math.floor(Math.random() * 4294967296);
                randomC = Math.floor(Math.random() * 4294967296);
                hostIdCounter++;
            } catch (ignoredRandom) {
                throw hostError("HOST_CONTEXT_UNAVAILABLE", "The Host context authority is unavailable.");
            }
            if (typeof now !== "number" || !isFinite(now) || now < 0 ||
                    typeof randomA !== "number" || !isFinite(randomA) || randomA < 0 || randomA > 4294967295 ||
                    typeof randomB !== "number" || !isFinite(randomB) || randomB < 0 || randomB > 4294967295 ||
                    typeof randomC !== "number" || !isFinite(randomC) || randomC < 0 || randomC > 4294967295) {
                continue;
            }
            candidate = "host_" + fixedHex(Math.floor(now / 4294967296)) + fixedHex(now) +
                fixedHex(randomA) + fixedHex(randomB) + fixedHex(randomC) + fixedHex(hostIdCounter);
            if (HOST_INSTANCE_ID_PATTERN.test(candidate) && !issuedHostInstanceIds[candidate]) {
                issuedHostInstanceIds[candidate] = true;
                return candidate;
            }
        }
        throw hostError("HOST_CONTEXT_UNAVAILABLE", "The Host context authority is unavailable.");
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
            HOST_CONTEXT_READ_FAILED: "The Host context could not be read.",
            HOST_CONTEXT_AUTHORITY_MISMATCH: "The Host context authority changed."
            ,HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED: "The requested property value cannot be read while its expression is enabled."
            ,HOST_CONTEXT_VALUE_UNSUPPORTED: "The requested Host property value type is unsupported."
            ,HOST_CONTEXT_VALUE_INVALID: "The requested Host property value is invalid."
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

    function assertDetails(details) {
        var allowed = { name: true, textPreview: true, bounds: true };
        var seen = {};
        var i;
        if (!(details instanceof Array) || details.length < 1 || details.length > 3) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        for (i = 0; i < details.length; i++) {
            if (typeof details[i] !== "string" || !allowed[details[i]] || seen[details[i]]) {
                fail("HOST_CONTEXT_REQUEST_INVALID");
            }
            seen[details[i]] = true;
        }
        return details;
    }

    function hasDetail(request, detail) {
        var details = request.scope.details;
        var i;
        for (i = 0; i < details.length; i++) {
            if (details[i] === detail) { return true; }
        }
        return false;
    }

    function assertHostAuthority(instanceId, reloadEpoch) {
        if (typeof instanceId !== "string" || !HOST_INSTANCE_ID_PATTERN.test(instanceId) || json.utf8ByteLength(instanceId) !== 53) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        assertFiniteNumber(reloadEpoch, true, 1, MAX_NUMBER_ABS);
    }

    function assertPropertyPath(propertyPath) {
        var i;
        var mode;
        var matchName;
        var propertyIndex;
        if (!(propertyPath instanceof Array) || propertyPath.length < 3 || propertyPath.length > MAX_PROPERTY_PATH_LEVELS * 3 || propertyPath.length % 3 !== 0) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        for (i = 0; i < propertyPath.length; i += 3) {
            mode = propertyPath[i];
            matchName = propertyPath[i + 1];
            propertyIndex = propertyPath[i + 2];
            if ((mode !== "named" && mode !== "indexed") || typeof matchName !== "string" || !matchName.length || json.utf8ByteLength(matchName) > 56) {
                fail("HOST_CONTEXT_REQUEST_INVALID");
            }
            if (mode === "named") {
                if (propertyIndex !== 0) { fail("HOST_CONTEXT_REQUEST_INVALID"); }
            } else {
                if (typeof propertyIndex !== "number" || !isFinite(propertyIndex) || (propertyIndex === 0 && 1 / propertyIndex === -Infinity) ||
                        Math.floor(propertyIndex) !== propertyIndex || propertyIndex < 1 || propertyIndex > MAX_NUMBER_ABS) {
                    fail("HOST_CONTEXT_REQUEST_INVALID");
                }
            }
        }
    }

    function assertPropertyTargets(targets) {
        var i;
        var target;
        if (!(targets instanceof Array) || targets.length < 1 || targets.length > MAX_PROPERTY_TARGETS) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        for (i = 0; i < targets.length; i++) {
            target = targets[i];
            assertKeys(target, ["targetOrdinal", "itemId", "nativeLayerId", "layerIndex", "propertyPath"]);
            if (target.targetOrdinal !== i) { fail("HOST_CONTEXT_REQUEST_INVALID"); }
            assertFiniteNumber(target.itemId, true, 1, MAX_NUMBER_ABS);
            assertFiniteNumber(target.nativeLayerId, true, 1, MAX_NUMBER_ABS);
            assertFiniteNumber(target.layerIndex, true, 1, MAX_NUMBER_ABS);
            assertPropertyPath(target.propertyPath);
        }
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
        if (operation !== "getCapabilities" && operation !== "captureContext" && operation !== "captureLayerDetails" && operation !== "resolvePropertyTargets" && operation !== "capturePropertyValues") {
            fail("HOST_CONTEXT_OPERATION_UNSUPPORTED");
        }
        if ((operation === "getCapabilities" && value.tier !== 0) ||
                (operation === "captureContext" && value.tier !== 1) ||
                (operation === "captureLayerDetails" && value.tier !== 2) ||
                (operation === "resolvePropertyTargets" && value.tier !== 3) ||
                (operation === "capturePropertyValues" && value.tier !== 3)) {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        assertKeys(value.scope, operation === "captureLayerDetails" ? ["purpose", "selectionOrderMeaningful", "details"] :
            ((operation === "resolvePropertyTargets" || operation === "capturePropertyValues") ? ["purpose", "expectedHostInstanceId", "expectedHostReloadEpoch", "expectedProjectGeneration", "targets"] : ["purpose", "selectionOrderMeaningful"]));
        if (value.scope.purpose !== "display" && value.scope.purpose !== "binding") {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        if (operation !== "resolvePropertyTargets" && operation !== "capturePropertyValues" && typeof value.scope.selectionOrderMeaningful !== "boolean") {
            fail("HOST_CONTEXT_REQUEST_INVALID");
        }
        if (operation === "captureLayerDetails") {
            if (value.scope.purpose !== "display") { fail("HOST_CONTEXT_REQUEST_INVALID"); }
            assertDetails(value.scope.details);
        }
        if (operation === "resolvePropertyTargets" || operation === "capturePropertyValues") {
            if (value.scope.purpose !== "binding") { fail("HOST_CONTEXT_REQUEST_INVALID"); }
            assertHostAuthority(value.scope.expectedHostInstanceId, value.scope.expectedHostReloadEpoch);
            assertFiniteNumber(value.scope.expectedProjectGeneration, true, 1, MAX_NUMBER_ABS);
            assertPropertyTargets(value.scope.targets);
        }
        return value;
    }

    function makeBase(request, ok) {
        var safeOperation = request && (request.operation === "getCapabilities" || request.operation === "captureContext" || request.operation === "captureLayerDetails" || request.operation === "resolvePropertyTargets" || request.operation === "capturePropertyValues") ? request.operation : "unknown";
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
            HOST_CONTEXT_READ_FAILED: "The Host context could not be read.",
            HOST_CONTEXT_AUTHORITY_MISMATCH: "The Host context authority changed.",
            HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED: "The requested property value cannot be read while its expression is enabled.",
            HOST_CONTEXT_VALUE_UNSUPPORTED: "The requested Host property value type is unsupported.",
            HOST_CONTEXT_VALUE_INVALID: "The requested Host property value is invalid."
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
            hostInstanceId: hostInstanceId,
            hostReloadEpoch: hostReloadEpoch,
            tier: 0,
            capabilities: {
                maxTier: 3,
                nativeLayerIdAvailable: sessionResetRequired ? false : nativeLayerIdObserved,
                bindingContextAvailable: sessionResetRequired ? false : nativeLayerIdObserved,
                hostAdapterRevision: HOST_ADAPTER_REVISION
            }
        };
    }

    function reload() {
        if (hostReloadEpoch >= MAX_NUMBER_ABS) {
            throw hostError("HOST_CONTEXT_SESSION_RESET_REQUIRED", "The Host context reload epoch is exhausted.");
        }
        hostReloadEpoch++;
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
                hostInstanceId: hostInstanceId,
                hostReloadEpoch: hostReloadEpoch,
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
                hostInstanceId: hostInstanceId,
                hostReloadEpoch: hostReloadEpoch,
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
                hostInstanceId: hostInstanceId,
                hostReloadEpoch: hostReloadEpoch,
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
            hostInstanceId: hostInstanceId,
            hostReloadEpoch: hostReloadEpoch,
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

    function truncateDisplayString(value, maximumBytes) {
        var originalBytes;
        var output = "";
        var outputBytes = 0;
        var i = 0;
        var code;
        var piece;
        var pieceBytes;
        if (typeof value !== "string") { return null; }
        originalBytes = json.utf8ByteLength(value);
        if (typeof originalBytes !== "number" || !isFinite(originalBytes) || originalBytes < 0 || originalBytes > MAX_NUMBER_ABS) {
            return null;
        }
        while (i < value.length) {
            code = value.charCodeAt(i);
            piece = value.charAt(i);
            if (code >= 0xD800 && code <= 0xDBFF) {
                if (i + 1 >= value.length || value.charCodeAt(i + 1) < 0xDC00 || value.charCodeAt(i + 1) > 0xDFFF) {
                    return null;
                }
                piece += value.charAt(i + 1);
            } else if (code >= 0xDC00 && code <= 0xDFFF) {
                return null;
            }
            pieceBytes = json.utf8ByteLength(piece);
            if (outputBytes + pieceBytes > maximumBytes) { break; }
            output += piece;
            outputBytes += pieceBytes;
            i += piece.length;
        }
        return {
            value: output,
            truncated: originalBytes > outputBytes,
            originalBytes: originalBytes
        };
    }

    function addOmitted(item, field) {
        var i;
        for (i = 0; i < item.omittedFields.length; i++) {
            if (item.omittedFields[i] === field) { return; }
        }
        item.omittedFields[item.omittedFields.length] = field;
    }

    function readTextPreview(layer) {
        var textProperties;
        var textDocumentProperty;
        var textDocument;
        var text;
        if (typeof layer.property !== "function") { return null; }
        textProperties = layer.property("ADBE Text Properties");
        if (!textProperties || textProperties.matchName !== "ADBE Text Properties" || typeof textProperties.property !== "function") { return null; }
        textDocumentProperty = textProperties.property("ADBE Text Document");
        if (!textDocumentProperty || textDocumentProperty.matchName !== "ADBE Text Document") { return null; }
        textDocument = textDocumentProperty.value;
        if (!textDocument) { return null; }
        text = textDocument.text;
        if (typeof text !== "string") { return null; }
        return truncateDisplayString(text, 512);
    }

    function readBounds(layer, time) {
        var rect;
        var left;
        var top;
        var width;
        var height;
        if (typeof layer.sourceRectAtTime !== "function") { return null; }
        rect = layer.sourceRectAtTime(time, false);
        if (!rect || typeof rect !== "object") { return null; }
        left = rect.left;
        top = rect.top;
        width = rect.width;
        height = rect.height;
        if (typeof left !== "number" || !isFinite(left) || (left === 0 && 1 / left === -Infinity) || Math.abs(left) > MAX_NUMBER_ABS ||
                typeof top !== "number" || !isFinite(top) || (top === 0 && 1 / top === -Infinity) || Math.abs(top) > MAX_NUMBER_ABS ||
                typeof width !== "number" || !isFinite(width) || (width === 0 && 1 / width === -Infinity) || width < 0 || Math.abs(width) > MAX_NUMBER_ABS ||
                typeof height !== "number" || !isFinite(height) || (height === 0 && 1 / height === -Infinity) || height < 0 || Math.abs(height) > MAX_NUMBER_ABS) {
            return null;
        }
        return { left: left, top: top, width: width, height: height };
    }

    function readTierTwo(request) {
        var project;
        var activeItem;
        var selected;
        var itemId;
        var items = [];
        var allNative = true;
        var seenIds = {};
        var wantsName = hasDetail(request, "name");
        var wantsText = hasDetail(request, "textPreview");
        var wantsBounds = hasDetail(request, "bounds");
        var compTime = null;
        var compTimeAvailable = false;
        var i;
        var layer;
        var nativeId;
        var matchName;
        var item;
        var display;
        var bounds;

        if (sessionResetRequired) { fail("HOST_CONTEXT_SESSION_RESET_REQUIRED"); }
        try { project = app && app.project ? app.project : null; }
        catch (ignoredProject) { fail("HOST_CONTEXT_READ_FAILED"); }
        observeProject(project);
        if (!project) {
            return {
                hostInstanceId: hostInstanceId,
                hostReloadEpoch: hostReloadEpoch,
                tier: 2,
                projectGeneration: projectGeneration,
                activeComp: null,
                selection: { count: 0, identityQuality: "index-only", items: [] }
            };
        }
        try { activeItem = project.activeItem; }
        catch (ignoredActive) { fail("HOST_CONTEXT_READ_FAILED"); }
        if (!activeItem || typeof CompItem === "undefined" || !(activeItem instanceof CompItem)) {
            return {
                hostInstanceId: hostInstanceId,
                hostReloadEpoch: hostReloadEpoch,
                tier: 2,
                projectGeneration: projectGeneration,
                activeComp: null,
                selection: { count: 0, identityQuality: "index-only", items: [] }
            };
        }
        try {
            itemId = assertFiniteNumber(activeItem.id, true, 1, MAX_NUMBER_ABS);
            selected = activeItem.selectedLayers || [];
        } catch (ignoredComp) { fail("HOST_CONTEXT_READ_FAILED"); }
        if (selected.length > MAX_TIER_TWO_LAYERS) { fail("HOST_CONTEXT_BUDGET_EXCEEDED"); }
        if (wantsBounds) {
            try {
                compTime = activeItem.time;
                compTimeAvailable = typeof compTime === "number" && isFinite(compTime) && !(compTime === 0 && 1 / compTime === -Infinity) && Math.abs(compTime) <= MAX_NUMBER_ABS;
            } catch (ignoredTime) { compTimeAvailable = false; }
        }
        for (i = 0; i < selected.length; i++) {
            layer = selected[i];
            nativeId = readNativeLayerId(layer);
            matchName = assertBoundedString(String(layer.matchName || ""), 256, true);
            if (nativeId === null) { allNative = false; }
            else {
                if (seenIds[String(nativeId)]) { fail("HOST_CONTEXT_READ_FAILED"); }
                seenIds[String(nativeId)] = true;
            }
            item = {
                layerIndex: assertFiniteNumber(layer.index, true, 1, MAX_NUMBER_ABS),
                selectedOrder: i,
                matchName: matchName,
                type: assertBoundedString(layerType(matchName), 256, false),
                omittedFields: []
            };
            if (nativeId !== null) { item.nativeLayerId = nativeId; }
            if (wantsName) {
                try { display = truncateDisplayString(layer.name, 256); }
                catch (ignoredName) { display = null; }
                if (display) {
                    item.name = display.value;
                    item.nameTruncated = display.truncated;
                    item.nameOriginalBytes = display.originalBytes;
                } else { addOmitted(item, "name"); }
            }
            if (wantsText) {
                display = null;
                if (matchName === "ADBE Text Layer") {
                    try { display = readTextPreview(layer); }
                    catch (ignoredText) { display = null; }
                }
                if (display) {
                    item.textPreview = display.value;
                    item.textPreviewTruncated = display.truncated;
                    item.textPreviewOriginalBytes = display.originalBytes;
                } else { addOmitted(item, "textPreview"); }
            }
            if (wantsBounds) {
                bounds = null;
                if (compTimeAvailable) {
                    try { bounds = readBounds(layer, compTime); }
                    catch (ignoredBounds) { bounds = null; }
                }
                if (bounds) { item.bounds = bounds; }
                else { addOmitted(item, "bounds"); }
            }
            items[items.length] = item;
        }
        if (selected.length > 0 && allNative) { nativeLayerIdObserved = true; }
        return {
            hostInstanceId: hostInstanceId,
            hostReloadEpoch: hostReloadEpoch,
            tier: 2,
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
    }

    function isPropertyType(value, name) {
        return typeof PropertyType !== "undefined" && value === PropertyType[name];
    }

    function resolvePropertyPath(layer, propertyPath) {
        var current = layer;
        var child;
        var i;
        var mode;
        var matchName;
        var propertyIndex;
        var root = true;
        for (i = 0; i < propertyPath.length; i += 3) {
            mode = propertyPath[i];
            matchName = propertyPath[i + 1];
            propertyIndex = propertyPath[i + 2];
            try {
                if (!current || typeof current.property !== "function") { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
                if (mode === "named") {
                    if (!root && !isPropertyType(current.propertyType, "NAMED_GROUP")) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
                    child = current.property(matchName);
                } else {
                    if (!isPropertyType(current.propertyType, "INDEXED_GROUP")) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
                    child = current.property(propertyIndex);
                }
                if (!child || child.matchName !== matchName) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
                if (mode === "indexed" && child.propertyIndex !== propertyIndex) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
            } catch (error) {
                if (error && error.code) { throw error; }
                fail("HOST_CONTEXT_TARGET_NOT_FOUND");
            }
            current = child;
            root = false;
        }
        if (!current || !isPropertyType(current.propertyType, "PROPERTY")) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
        return current;
    }

    function isNegativeZero(value) {
        return value === 0 && 1 / value === -Infinity;
    }

    function canonicalNumberV1(value) {
        var parts;
        var mantissa;
        var exponent;
        if (typeof value !== "number" || !isFinite(value) || isNegativeZero(value) || Math.abs(value) > MAX_NUMBER_ABS) {
            fail("HOST_CONTEXT_VALUE_INVALID");
        }
        if (value === 0) { return "0"; }
        parts = value.toExponential(16).split("e");
        mantissa = parts[0].replace(/0+$/, "").replace(/\.$/, "");
        exponent = parts[1].replace(/^\+/, "").replace(/^(-?)0+(\d)/, "$1$2");
        if (exponent === "" || exponent === "-") { exponent = "0"; }
        return mantissa + "e" + exponent;
    }

    function assertExactValueString(value) {
        var i;
        var code;
        if (typeof value !== "string") { fail("HOST_CONTEXT_VALUE_UNSUPPORTED"); }
        for (i = 0; i < value.length; i++) {
            code = value.charCodeAt(i);
            if (code >= 0xD800 && code <= 0xDBFF) {
                if (i + 1 >= value.length || value.charCodeAt(i + 1) < 0xDC00 || value.charCodeAt(i + 1) > 0xDFFF) { fail("HOST_CONTEXT_VALUE_INVALID"); }
                i++;
            } else if (code >= 0xDC00 && code <= 0xDFFF) { fail("HOST_CONTEXT_VALUE_INVALID"); }
        }
        if (json.utf8ByteLength(value) > MAX_PROPERTY_VALUE_BYTES) { fail("HOST_CONTEXT_BUDGET_EXCEEDED"); }
        return value;
    }

    function isCanonicalArrayIndex(name) {
        return typeof name === "string" && /^(0|[1-9][0-9]*)$/.test(name);
    }

    function arrayHas(values, expected) {
        var i;
        for (i = 0; i < values.length; i++) {
            if (values[i] === expected) { return true; }
        }
        return false;
    }

    function normalizePropertyNumberArray(value) {
        var lengthDescriptor;
        var names;
        var nativeProfile;
        var length;
        var i;
        var descriptor;
        var name;
        var output = [];
        try {
            if (Object.prototype.toString.call(value) !== "[object Array]" || Object.getPrototypeOf(value) !== Array.prototype) { fail("HOST_CONTEXT_VALUE_UNSUPPORTED"); }
            lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
            names = Object.getOwnPropertyNames(value);
        } catch (ignoredArrayProfile) { fail("HOST_CONTEXT_VALUE_INVALID"); }
        nativeProfile = !lengthDescriptor && !arrayHas(names, "length");
        if (nativeProfile) {
            try { length = value.length; }
            catch (ignoredNativeLength) { fail("HOST_CONTEXT_VALUE_INVALID"); }
        } else {
            if (!lengthDescriptor || lengthDescriptor.get || lengthDescriptor.set || !own(lengthDescriptor, "value") || !arrayHas(names, "length")) { fail("HOST_CONTEXT_VALUE_INVALID"); }
            length = lengthDescriptor.value;
        }
        if (typeof length !== "number" || !isFinite(length) || Math.floor(length) !== length || length < 1 || length > 4 || names.length !== length + (nativeProfile ? 0 : 1)) {
            fail("HOST_CONTEXT_VALUE_INVALID");
        }
        for (i = 0; i < length; i++) {
            name = String(i);
            if (!arrayHas(names, name)) { fail("HOST_CONTEXT_VALUE_INVALID"); }
            try { descriptor = Object.getOwnPropertyDescriptor(value, name); }
            catch (ignoredArrayIndex) { fail("HOST_CONTEXT_VALUE_INVALID"); }
            if (!descriptor || descriptor.get || descriptor.set || !own(descriptor, "value") || descriptor.enumerable !== true) { fail("HOST_CONTEXT_VALUE_INVALID"); }
            output[output.length] = descriptor.value;
            canonicalNumberV1(descriptor.value);
        }
        for (i = 0; i < names.length; i++) {
            if (names[i] !== "length" && !isCanonicalArrayIndex(names[i])) { fail("HOST_CONTEXT_VALUE_INVALID"); }
        }
        return output;
    }

    function propertyValuePayloadBytes(kind, value) {
        var i;
        var payload;
        if (kind === "null") { return 4; }
        if (kind === "boolean") { return 1; }
        if (kind === "number") { return json.utf8ByteLength(canonicalNumberV1(value)); }
        if (kind === "string") { return json.utf8ByteLength(value); }
        if (kind === "number-array") {
            payload = "v1\0" + value.length;
            for (i = 0; i < value.length; i++) { payload += "\0" + json.utf8ByteLength(canonicalNumberV1(value[i])) + "\0" + canonicalNumberV1(value[i]); }
            return json.utf8ByteLength(payload);
        }
        fail("HOST_CONTEXT_VALUE_INVALID");
    }

    function normalizePropertyValue(value) {
        var kind;
        var data;
        var payloadBytes;
        if (value === null) { kind = "null"; data = null; }
        else if (typeof value === "boolean") { kind = "boolean"; data = value; }
        else if (typeof value === "number") { canonicalNumberV1(value); kind = "number"; data = value; }
        else if (typeof value === "string") { kind = "string"; data = assertExactValueString(value); }
        else if (Object.prototype.toString.call(value) === "[object Array]") { kind = "number-array"; data = normalizePropertyNumberArray(value); }
        else { fail("HOST_CONTEXT_VALUE_UNSUPPORTED"); }
        payloadBytes = propertyValuePayloadBytes(kind, data);
        if (payloadBytes > MAX_PROPERTY_VALUE_BYTES) { fail("HOST_CONTEXT_BUDGET_EXCEEDED"); }
        return { kind: kind, data: data, payloadBytes: payloadBytes };
    }

    function payloadForPropertyValue(kind, data) {
        var i;
        var output;
        if (kind === "null") { return "null"; }
        if (kind === "boolean") { return data ? "1" : "0"; }
        if (kind === "number") { return canonicalNumberV1(data); }
        if (kind === "string") { return data; }
        if (kind === "number-array") {
            output = "v1\0" + data.length;
            for (i = 0; i < data.length; i++) {
                output += "\0" + json.utf8ByteLength(canonicalNumberV1(data[i])) + "\0" + canonicalNumberV1(data[i]);
            }
            return output;
        }
        fail("HOST_CONTEXT_VALUE_INVALID");
    }

    /* This is the sole Host SHA-256 implementation.  It is deliberately kept
       inside the VelaContext closure and is only handed to the staging
       transaction below; it is never a VelaContext public API. */
    function sha256Utf8(value) {
        var bytes = [];
        var index;
        var code;
        var bitLength;
        var words = [];
        var output;
        var hash = [1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225];
        var constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        function rightRotate(number, amount) { return (number >>> amount) | (number << (32 - amount)); }
        if (typeof value !== "string") { fail("HOST_CONTEXT_VALUE_INVALID"); }
        for (index = 0; index < value.length; index++) {
            code = value.charCodeAt(index);
            if (code < 0x80) { bytes.push(code); }
            else if (code < 0x800) { bytes.push(0xC0 | (code >>> 6), 0x80 | (code & 0x3F)); }
            else if (code >= 0xD800 && code <= 0xDBFF) {
                if (index + 1 >= value.length || value.charCodeAt(index + 1) < 0xDC00 || value.charCodeAt(index + 1) > 0xDFFF) { fail("HOST_CONTEXT_VALUE_INVALID"); }
                code = 0x10000 + ((code - 0xD800) << 10) + (value.charCodeAt(index + 1) - 0xDC00);
                bytes.push(0xF0 | (code >>> 18), 0x80 | ((code >>> 12) & 0x3F), 0x80 | ((code >>> 6) & 0x3F), 0x80 | (code & 0x3F)); index++;
            } else if (code >= 0xDC00 && code <= 0xDFFF) { fail("HOST_CONTEXT_VALUE_INVALID"); }
            else { bytes.push(0xE0 | (code >>> 12), 0x80 | ((code >>> 6) & 0x3F), 0x80 | (code & 0x3F)); }
        }
        bitLength = bytes.length * 8;
        bytes.push(0x80);
        while ((bytes.length % 64) !== 56) { bytes.push(0); }
        for (index = 7; index >= 0; index--) { bytes.push((bitLength / Math.pow(2, index * 8)) & 0xFF); }
        for (index = 0; index < bytes.length; index += 64) {
            var work = [];
            var i;
            var a;
            var b;
            var c;
            var d;
            var e;
            var f;
            var g;
            var h;
            var t1;
            var t2;
            for (i = 0; i < 16; i++) { work[i] = (bytes[index + i * 4] << 24) | (bytes[index + i * 4 + 1] << 16) | (bytes[index + i * 4 + 2] << 8) | bytes[index + i * 4 + 3]; }
            for (i = 16; i < 64; i++) { work[i] = (rightRotate(work[i - 2], 17) ^ rightRotate(work[i - 2], 19) ^ (work[i - 2] >>> 10)) + work[i - 7] + (rightRotate(work[i - 15], 7) ^ rightRotate(work[i - 15], 18) ^ (work[i - 15] >>> 3)) + work[i - 16]; }
            a = hash[0]; b = hash[1]; c = hash[2]; d = hash[3]; e = hash[4]; f = hash[5]; g = hash[6]; h = hash[7];
            for (i = 0; i < 64; i++) { t1 = h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + constants[i] + work[i]; t2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c)); h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
            hash[0] = (hash[0] + a) | 0; hash[1] = (hash[1] + b) | 0; hash[2] = (hash[2] + c) | 0; hash[3] = (hash[3] + d) | 0; hash[4] = (hash[4] + e) | 0; hash[5] = (hash[5] + f) | 0; hash[6] = (hash[6] + g) | 0; hash[7] = (hash[7] + h) | 0;
        }
        output = "";
        for (index = 0; index < hash.length; index++) { output += fixedHex(hash[index]); }
        return output;
    }

    function propertyValueDigest(value) {
        var normalized = normalizePropertyValue(value);
        var payload = payloadForPropertyValue(normalized.kind, normalized.data);
        return "sha256:" + sha256Utf8("vela-property-value-v1\0" + normalized.kind + "\0" + json.utf8ByteLength(payload) + "\0" + payload);
    }

    function verifyExecutionAuthority(expectedAuthority) {
        var project;
        var key;
        var valid = expectedAuthority && Object.prototype.toString.call(expectedAuthority) === "[object Object]" &&
            own(expectedAuthority, "expectedHostInstanceId") && own(expectedAuthority, "expectedHostReloadEpoch") && own(expectedAuthority, "expectedProjectGeneration");
        if (!valid) { return { ok: false, code: "HOST_EXECUTION_AUTHORITY_MISMATCH" }; }
        try {
            for (key in expectedAuthority) {
                if (own(expectedAuthority, key) && key !== "expectedHostInstanceId" && key !== "expectedHostReloadEpoch" && key !== "expectedProjectGeneration") {
                    return { ok: false, code: "HOST_EXECUTION_AUTHORITY_MISMATCH" };
                }
            }
            if (typeof expectedAuthority.expectedHostInstanceId !== "string" || typeof expectedAuthority.expectedHostReloadEpoch !== "number" ||
                    typeof expectedAuthority.expectedProjectGeneration !== "number" || !isFinite(expectedAuthority.expectedHostReloadEpoch) ||
                    !isFinite(expectedAuthority.expectedProjectGeneration) || Math.floor(expectedAuthority.expectedHostReloadEpoch) !== expectedAuthority.expectedHostReloadEpoch ||
                    Math.floor(expectedAuthority.expectedProjectGeneration) !== expectedAuthority.expectedProjectGeneration) {
                return { ok: false, code: "HOST_EXECUTION_AUTHORITY_MISMATCH" };
            }
            project = app && app.project ? app.project : null;
            observeProject(project);
        } catch (ignoredAuthorityRead) {
            return { ok: false, code: "HOST_EXECUTION_AUTHORITY_MISMATCH" };
        }
        if (sessionResetRequired || expectedAuthority.expectedHostInstanceId !== hostInstanceId ||
                expectedAuthority.expectedHostReloadEpoch !== hostReloadEpoch || expectedAuthority.expectedProjectGeneration !== projectGeneration) {
            return { ok: false, code: "HOST_EXECUTION_AUTHORITY_MISMATCH" };
        }
        return { ok: true };
    }

    function readPropertyValue(terminal) {
        var canSetExpression;
        var expressionEnabled;
        var rawValue;
        try { canSetExpression = terminal.canSetExpression; }
        catch (ignoredCanSetExpression) { fail("HOST_CONTEXT_READ_FAILED"); }
        if (typeof canSetExpression !== "boolean") { fail("HOST_CONTEXT_VALUE_INVALID"); }
        if (canSetExpression) {
            try { expressionEnabled = terminal.expressionEnabled; }
            catch (ignoredExpressionEnabled) { fail("HOST_CONTEXT_READ_FAILED"); }
            if (typeof expressionEnabled !== "boolean") { fail("HOST_CONTEXT_VALUE_INVALID"); }
            if (expressionEnabled) { fail("HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED"); }
        }
        try { rawValue = terminal.value; }
        catch (ignoredValue) { fail("HOST_CONTEXT_READ_FAILED"); }
        return normalizePropertyValue(rawValue);
    }

    function readTierThree(request) {
        var project;
        var activeItem;
        var target;
        var layer;
        var terminal;
        var terminalPropertyIndex;
        var targets = [];
        var i;
        if (sessionResetRequired) { fail("HOST_CONTEXT_SESSION_RESET_REQUIRED"); }
        try { project = app && app.project ? app.project : null; }
        catch (ignoredProject) { fail("HOST_CONTEXT_READ_FAILED"); }
        observeProject(project);
        if (request.scope.expectedHostInstanceId !== hostInstanceId || request.scope.expectedHostReloadEpoch !== hostReloadEpoch || request.scope.expectedProjectGeneration !== projectGeneration) {
            fail("HOST_CONTEXT_AUTHORITY_MISMATCH");
        }
        try { activeItem = project && project.activeItem; }
        catch (ignoredActive) { fail("HOST_CONTEXT_READ_FAILED"); }
        if (!activeItem || typeof CompItem === "undefined" || !(activeItem instanceof CompItem)) { fail("HOST_CONTEXT_UNAVAILABLE"); }
        for (i = 0; i < request.scope.targets.length; i++) {
            target = request.scope.targets[i];
            if (activeItem.id !== target.itemId) { fail("HOST_CONTEXT_AUTHORITY_MISMATCH"); }
            try { layer = activeItem.layer(target.layerIndex); }
            catch (ignoredLayer) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
            if (!layer || readNativeLayerId(layer) !== target.nativeLayerId || layer.index !== target.layerIndex) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
            terminal = resolvePropertyPath(layer, target.propertyPath);
            try { terminalPropertyIndex = assertFiniteNumber(terminal.propertyIndex, true, 1, MAX_NUMBER_ABS); }
            catch (ignoredPropertyIndex) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
            targets[targets.length] = {
                targetOrdinal: target.targetOrdinal,
                nativeLayerId: target.nativeLayerId,
                layerIndex: target.layerIndex,
                propertyPath: target.propertyPath.slice(0),
                propertyMatchName: terminal.matchName,
                propertyIndex: terminalPropertyIndex,
                propertyType: "property"
            };
        }
        return {
            hostInstanceId: hostInstanceId,
            hostReloadEpoch: hostReloadEpoch,
            projectGeneration: projectGeneration,
            tier: 3,
            targets: targets
        };
    }

    function readPropertyValues(request) {
        var project;
        var activeItem;
        var duration;
        var sampleTime;
        var target;
        var layer;
        var terminal;
        var normalizedValue;
        var targets = [];
        var aggregateBytes = 0;
        var i;
        if (sessionResetRequired) { fail("HOST_CONTEXT_SESSION_RESET_REQUIRED"); }
        try { project = app && app.project ? app.project : null; }
        catch (ignoredProject) { fail("HOST_CONTEXT_READ_FAILED"); }
        observeProject(project);
        if (request.scope.expectedHostInstanceId !== hostInstanceId || request.scope.expectedHostReloadEpoch !== hostReloadEpoch || request.scope.expectedProjectGeneration !== projectGeneration) {
            fail("HOST_CONTEXT_AUTHORITY_MISMATCH");
        }
        try { activeItem = project && project.activeItem; }
        catch (ignoredActive) { fail("HOST_CONTEXT_READ_FAILED"); }
        if (!activeItem || typeof CompItem === "undefined" || !(activeItem instanceof CompItem)) { fail("HOST_CONTEXT_UNAVAILABLE"); }
        try {
            duration = activeItem.duration;
            sampleTime = activeItem.time;
        } catch (ignoredTime) { fail("HOST_CONTEXT_READ_FAILED"); }
        if (typeof duration !== "number" || !isFinite(duration) || isNegativeZero(duration) || duration < 0 || duration > MAX_NUMBER_ABS ||
                typeof sampleTime !== "number" || !isFinite(sampleTime) || isNegativeZero(sampleTime) || sampleTime < 0 || sampleTime > duration + 0.0000001) {
            fail("HOST_CONTEXT_READ_FAILED");
        }
        for (i = 0; i < request.scope.targets.length; i++) {
            target = request.scope.targets[i];
            if (activeItem.id !== target.itemId) { fail("HOST_CONTEXT_AUTHORITY_MISMATCH"); }
            try { layer = activeItem.layer(target.layerIndex); }
            catch (ignoredLayer) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
            if (!layer || readNativeLayerId(layer) !== target.nativeLayerId || layer.index !== target.layerIndex) { fail("HOST_CONTEXT_TARGET_NOT_FOUND"); }
            terminal = resolvePropertyPath(layer, target.propertyPath);
            normalizedValue = readPropertyValue(terminal);
            aggregateBytes += normalizedValue.payloadBytes;
            if (aggregateBytes > MAX_PROPERTY_VALUE_AGGREGATE_BYTES) { fail("HOST_CONTEXT_BUDGET_EXCEEDED"); }
            targets[targets.length] = {
                targetOrdinal: target.targetOrdinal,
                nativeLayerId: target.nativeLayerId,
                layerIndex: target.layerIndex,
                propertyPath: target.propertyPath.slice(0),
                propertyMatchName: terminal.matchName,
                value: { kind: normalizedValue.kind, data: normalizedValue.data }
            };
        }
        return {
            hostInstanceId: hostInstanceId,
            hostReloadEpoch: hostReloadEpoch,
            projectGeneration: projectGeneration,
            sampleTime: sampleTime,
            tier: 3,
            targets: targets
        };
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
            if ((request.operation === "resolvePropertyTargets" || request.operation === "capturePropertyValues") && json.utf8ByteLength(requestJson) > 8 * 1024) {
                fail("HOST_CONTEXT_BUDGET_EXCEEDED");
            }
            result = makeBase(request, true);
            if (request.operation === "getCapabilities" || request.tier === 0) {
                result.snapshot = getCapabilitiesSnapshot();
            } else if (request.operation === "captureContext") {
                result.snapshot = readTierOne(request);
            } else if (request.operation === "captureLayerDetails") {
                result.snapshot = readTierTwo(request);
            } else if (request.operation === "resolvePropertyTargets") {
                result.snapshot = readTierThree(request);
            } else {
                result.snapshot = readPropertyValues(request);
            }
            return json.stringifyBounded(result, {
                maxBytes: 16 * 1024,
                maxStringBytes: 8 * 1024,
                maxDepth: 6,
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
                return "{\"error\":{\"code\":\"HOST_CONTEXT_READ_FAILED\",\"message\":\"The Host context could not be read.\"},\"hostAdapterRevision\":\"vela-context-host-v4\",\"ok\":false,\"operation\":\"unknown\",\"protocol\":\"vela.host-context-result.v1\",\"requestId\":\"unknown\",\"schemaVersion\":\"1.0\",\"sessionId\":\"unknown\"}";
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
    /* These configurable staging-only references are removed by host/index.jsx
       before the staging namespace is ever published. */
    try {
        Object.defineProperty(AEToolbox, "__velaPropertyValueDigestV1", { configurable: true, enumerable: false, value: propertyValueDigest, writable: false });
        Object.defineProperty(AEToolbox, "__velaVerifyExecutionAuthorityV1", { configurable: true, enumerable: false, value: verifyExecutionAuthority, writable: false });
    } catch (ignoredPrivateInstall) {
        throw hostError("HOST_CONTEXT_UNAVAILABLE", "The Host execution staging capability is unavailable.");
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
