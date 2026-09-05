var AEToolbox = AEToolbox || {};

(function () {
    var REQUEST_PROTOCOL = "vela.host-execution-request.v1";
    var RESULT_PROTOCOL = "vela.host-execution-result.v1";
    var SCHEMA_VERSION = "1.0";
    var HOST_EXECUTION_REVISION = "vela-execution-host-v1";
    var OPACITY_CAPABILITY_ID = "set-opacity-v1";
    var LAYER_NAME_CAPABILITY_ID = "set-layer-name-v1";
    var OPACITY_PATH = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
    var json = AEToolbox.VelaJson;
    var propertyValueDigest = VelaPropertyValueDigest;
    var verifyExecutionAuthority = VelaVerifyExecutionAuthority;

    function hostError(code) { var error = new Error(code); error.code = code; return error; }
    function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function isNegativeZero(value) { return value === 0 && 1 / value === -Infinity; }
    function isSafeId(value, kind) { return typeof value === "string" && (new RegExp("^" + kind + "_[a-f0-9]{16,96}$")).test(value); }
    function assertKeys(value, keys) {
        var key;
        var i;
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") { throw hostError("HOST_EXECUTION_REQUEST_INVALID"); }
        for (key in value) {
            if (own(value, key)) {
                for (i = 0; i < keys.length && key !== keys[i]; i++) {}
                if (i === keys.length) { throw hostError("HOST_EXECUTION_REQUEST_INVALID"); }
            }
        }
    }
    function assertExactPath(path) {
        var i;
        if (Object.prototype.toString.call(path) !== "[object Array]" || path.length !== OPACITY_PATH.length) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        for (i = 0; i < OPACITY_PATH.length; i++) { if (path[i] !== OPACITY_PATH[i]) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); } }
    }
    function isPropertyType(value, name) {
        try { return typeof PropertyType !== "undefined" && value === PropertyType[name]; }
        catch (ignored) { return false; }
    }
    function validateRequest(request) {
        var scope;
        var target;
        var params;
        assertKeys(request, ["protocol", "schemaVersion", "requestId", "sessionId", "operation", "capabilityId", "scope"]);
        if (request.protocol !== REQUEST_PROTOCOL || request.schemaVersion !== SCHEMA_VERSION || !isSafeId(request.requestId, "req") || !isSafeId(request.sessionId, "session") ||
                request.operation !== "executeCapability" || (request.capabilityId !== OPACITY_CAPABILITY_ID && request.capabilityId !== LAYER_NAME_CAPABILITY_ID)) { throw hostError("HOST_EXECUTION_REQUEST_INVALID"); }
        scope = request.scope;
        assertKeys(scope, ["expectedHostInstanceId", "expectedHostReloadEpoch", "expectedProjectGeneration", "target", "params"]);
        target = scope.target;
        params = scope.params;
        assertKeys(target, request.capabilityId === LAYER_NAME_CAPABILITY_ID ? ["itemId", "nativeLayerId", "layerIndex", "targetKind", "attribute", "expectedValueDigest"] : ["itemId", "nativeLayerId", "layerIndex", "propertyPath", "propertyMatchName", "expectedValueDigest"]);
        assertKeys(params, request.capabilityId === LAYER_NAME_CAPABILITY_ID ? ["name"] : ["opacity"]);
        if (typeof scope.expectedHostInstanceId !== "string" || typeof scope.expectedHostReloadEpoch !== "number" || typeof scope.expectedProjectGeneration !== "number" ||
                typeof target.itemId !== "number" || !isFinite(target.itemId) || Math.floor(target.itemId) !== target.itemId || target.itemId < 1 ||
                typeof target.nativeLayerId !== "number" || !isFinite(target.nativeLayerId) || Math.floor(target.nativeLayerId) !== target.nativeLayerId || target.nativeLayerId < 1 ||
                typeof target.layerIndex !== "number" || !isFinite(target.layerIndex) || Math.floor(target.layerIndex) !== target.layerIndex || target.layerIndex < 1 ||
                typeof target.expectedValueDigest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(target.expectedValueDigest)) {
            throw hostError("HOST_EXECUTION_REQUEST_INVALID");
        }
        if (request.capabilityId === LAYER_NAME_CAPABILITY_ID) {
            if (target.targetKind !== "layer-attribute" || target.attribute !== "name" || typeof params.name !== "string" || !params.name.length || /^\s+$/.test(params.name) || /[\u0000-\u001f\u007f-\u009f]/.test(params.name) || json.utf8ByteLength(params.name) > 256) { throw hostError("HOST_EXECUTION_REQUEST_INVALID"); }
            return { capabilityId: LAYER_NAME_CAPABILITY_ID, scope: scope, target: target, valueKind: "string", value: params.name };
        }
        if (target.propertyMatchName !== "ADBE Opacity" || typeof params.opacity !== "number" || !isFinite(params.opacity) || isNegativeZero(params.opacity) || params.opacity < 0 || params.opacity > 100) { throw hostError("HOST_EXECUTION_REQUEST_INVALID"); }
        assertExactPath(target.propertyPath);
        return { capabilityId: OPACITY_CAPABILITY_ID, scope: scope, target: target, valueKind: "number", value: params.opacity };
    }
    function readNativeLayerId(layer) {
        var id;
        try { id = layer.id; }
        catch (ignored) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        if (typeof id !== "number" || !isFinite(id) || Math.floor(id) !== id || id < 1) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        return id;
    }
    function resolveOpacity(activeItem, target) {
        var layer;
        var transform;
        var opacity;
        try { layer = activeItem.layer(target.layerIndex); }
        catch (ignoredLayer) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        if (!layer || layer.index !== target.layerIndex || readNativeLayerId(layer) !== target.nativeLayerId) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        try { transform = layer.property("ADBE Transform Group"); }
        catch (ignoredTransform) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        if (!transform || !isPropertyType(transform.propertyType, "NAMED_GROUP") || transform.matchName !== "ADBE Transform Group") { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        try { opacity = transform.property("ADBE Opacity"); }
        catch (ignoredOpacity) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        if (!opacity || !isPropertyType(opacity.propertyType, "PROPERTY") || opacity.matchName !== "ADBE Opacity") { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        return opacity;
    }
    function resolveLayer(activeItem, target) {
        var layer;
        try { layer = activeItem.layer(target.layerIndex); }
        catch (ignoredLayer) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        if (!layer || layer.index !== target.layerIndex || readNativeLayerId(layer) !== target.nativeLayerId) { throw hostError("HOST_EXECUTION_TARGET_NOT_FOUND"); }
        return layer;
    }
    function assertExpressionDisabled(property) {
        var canSet;
        var enabled;
        try { canSet = property.canSetExpression; }
        catch (ignoredCanSet) { throw hostError("HOST_EXECUTION_READ_FAILED"); }
        if (typeof canSet !== "boolean") { throw hostError("HOST_EXECUTION_READ_FAILED"); }
        if (canSet) {
            try { enabled = property.expressionEnabled; }
            catch (ignoredEnabled) { throw hostError("HOST_EXECUTION_READ_FAILED"); }
            if (enabled !== false) { throw hostError("HOST_EXECUTION_EXPRESSION_ENABLED"); }
        }
    }
    function readDigest(property, committed) {
        var value;
        try { value = property.value; }
        catch (ignoredValue) { throw hostError(committed ? "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE" : "HOST_EXECUTION_READ_FAILED"); }
        try { return propertyValueDigest(value); }
        catch (ignoredDigest) { throw hostError(committed ? "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE" : "HOST_EXECUTION_READ_FAILED"); }
    }
    function base(request, ok) {
        return { protocol: RESULT_PROTOCOL, schemaVersion: SCHEMA_VERSION, requestId: request && isSafeId(request.requestId, "req") ? request.requestId : "unknown", sessionId: request && isSafeId(request.sessionId, "session") ? request.sessionId : "unknown", operation: "executeCapability", ok: ok === true, hostExecutionRevision: HOST_EXECUTION_REVISION };
    }
    function serialize(value) { return json.stringifyBounded(value, { maxBytes: 4096, maxStringBytes: 512, maxDepth: 5, maxArrayLength: 16, maxObjectProperties: 16 }); }
    function handle(requestJson) {
        var request = null;
        var normalized;
        var authority;
        var activeItem;
        var property;
        var layer;
        var beforeDigest;
        var resultingDigest;
        var undoOpen = false;
        var mutationCommitted = false;
        var result;
        var code;
        try {
            request = json.parseBounded(requestJson, { maxBytes: 8192, maxStringBytes: 1024, maxDepth: 6, maxArrayLength: 16, maxObjectProperties: 16 });
            normalized = validateRequest(request);
            authority = verifyExecutionAuthority({ expectedHostInstanceId: normalized.scope.expectedHostInstanceId, expectedHostReloadEpoch: normalized.scope.expectedHostReloadEpoch, expectedProjectGeneration: normalized.scope.expectedProjectGeneration });
            if (!authority || authority.ok !== true) { throw hostError("HOST_EXECUTION_AUTHORITY_MISMATCH"); }
            try { activeItem = app && app.project && app.project.activeItem; }
            catch (ignoredActive) { throw hostError("HOST_EXECUTION_READ_FAILED"); }
            if (!activeItem || typeof CompItem === "undefined" || !(activeItem instanceof CompItem) || activeItem.id !== normalized.target.itemId) { throw hostError("HOST_EXECUTION_AUTHORITY_MISMATCH"); }
            if (normalized.capabilityId === LAYER_NAME_CAPABILITY_ID) {
                layer = resolveLayer(activeItem, normalized.target);
                try { beforeDigest = propertyValueDigest(layer.name); }
                catch (ignoredNameRead) { throw hostError("HOST_EXECUTION_READ_FAILED"); }
            } else {
                property = resolveOpacity(activeItem, normalized.target);
                assertExpressionDisabled(property);
                beforeDigest = readDigest(property, false);
            }
            if (beforeDigest !== normalized.target.expectedValueDigest) { throw hostError("HOST_EXECUTION_VALUE_MISMATCH"); }
            try {
                app.beginUndoGroup(undoGroupLabel(normalized.capabilityId));
                undoOpen = true;
                try {
                    if (normalized.capabilityId === LAYER_NAME_CAPABILITY_ID) { layer.name = normalized.value; }
                    else { property.setValue(normalized.value); }
                } catch (ignoredSetValue) { throw hostError("HOST_EXECUTION_MUTATION_FAILED"); }
                mutationCommitted = true;
                if (normalized.capabilityId === LAYER_NAME_CAPABILITY_ID) {
                    try { resultingDigest = propertyValueDigest(layer.name); }
                    catch (ignoredNameResult) { throw hostError("HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE"); }
                } else { resultingDigest = readDigest(property, true); }
            }
            finally {
                if (undoOpen) { try { app.endUndoGroup(); } catch (ignoredUndoEnd) { if (mutationCommitted) { throw hostError("HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE"); } } }
            }
            result = base(request, true);
            result.result = { capabilityId: normalized.capabilityId, valueKind: normalized.valueKind, resultingValueDigest: resultingDigest };
            try { return serialize(result); }
            catch (ignoredSerialize) { if (mutationCommitted) { throw hostError("HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE"); } throw ignoredSerialize; }
        } catch (error) {
            code = error && typeof error.code === "string" ? error.code : "HOST_EXECUTION_FAILED";
            try { result = base(request, false); result.error = { code: code, message: "The Vela Host execution request was rejected.", mutationCommitted: mutationCommitted ? true : code === "HOST_EXECUTION_MUTATION_FAILED" ? null : false }; return serialize(result); }
            catch (ignoredResult) {
                code = code === "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE" ? code : "HOST_EXECUTION_FAILED";
                return "{\"error\":{\"code\":\"" + code + "\",\"message\":\"The Vela Host execution request was rejected.\",\"mutationCommitted\":" + (mutationCommitted ? "true" : code === "HOST_EXECUTION_MUTATION_FAILED" ? "null" : "false") + "},\"hostExecutionRevision\":\"vela-execution-host-v1\",\"ok\":false,\"operation\":\"executeCapability\",\"protocol\":\"vela.host-execution-result.v1\",\"requestId\":\"unknown\",\"schemaVersion\":\"1.0\",\"sessionId\":\"unknown\"}";
            }
        }
    }
    function undoGroupLabel(capabilityId) {
        return capabilityId === LAYER_NAME_CAPABILITY_ID ? "Vela: Rename Layer" : "Vela: Set Opacity";
    }
    if (!json || json.revision !== "vela-json-host-v1" || typeof propertyValueDigest !== "function" || typeof verifyExecutionAuthority !== "function") { throw hostError("HOST_EXECUTION_UNAVAILABLE"); }
    AEToolbox.VelaExecution = { hostExecutionRevision: HOST_EXECUTION_REVISION, handle: handle };
    if (typeof Object.freeze === "function") { Object.freeze(AEToolbox.VelaExecution); }
}());
