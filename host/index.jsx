#target aftereffects

var AEToolbox = AEToolbox || {};

AEToolbox.ping = function () {
    return "AEToolbox host loaded";
};

(function () {
    AEToolbox.hostApiVersion = "1.0.0";
    AEToolbox.projectVersion = "0.3.6";
    AEToolbox.version = AEToolbox.hostApiVersion;
    AEToolbox.tools = AEToolbox.tools || {};

    AEToolbox.jsonEscape = function (s) {
        return String(s)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, "\\\"")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
    };

    AEToolbox.toJson = function (obj) {
        var parts = [];
        var k;
        for (k in obj) {
            if (!obj.hasOwnProperty(k)) {
                continue;
            }
            if (typeof obj[k] === "number") {
                parts[parts.length] = "\"" + k + "\":" + obj[k];
            } else if (typeof obj[k] === "boolean") {
                parts[parts.length] = "\"" + k + "\":" + (obj[k] ? "true" : "false");
            } else {
                parts[parts.length] = "\"" + k + "\":\"" + AEToolbox.jsonEscape(obj[k]) + "\"";
            }
        }
        return "{" + parts.join(",") + "}";
    };

    AEToolbox.stringify = function (value) {
        var parts = [];
        var k;
        var i;

        if (value === null || typeof value === "undefined") {
            return "null";
        }
        if (typeof value === "number") {
            return isFinite(value) ? String(value) : "0";
        }
        if (typeof value === "boolean") {
            return value ? "true" : "false";
        }
        if (typeof value === "string") {
            return "\"" + AEToolbox.jsonEscape(value) + "\"";
        }
        if (value instanceof Array) {
            for (i = 0; i < value.length; i++) {
                parts[parts.length] = AEToolbox.stringify(value[i]);
            }
            return "[" + parts.join(",") + "]";
        }
        if (typeof value === "object") {
            for (k in value) {
                if (value.hasOwnProperty(k) && typeof value[k] !== "function" && k.charAt(0) !== "_") {
                    parts[parts.length] = "\"" + AEToolbox.jsonEscape(k) + "\":" + AEToolbox.stringify(value[k]);
                }
            }
            return "{" + parts.join(",") + "}";
        }
        return "\"\"";
    };

    AEToolbox._registeredTools = AEToolbox._registeredTools instanceof Array ? AEToolbox._registeredTools : [];
    AEToolbox._registeredToolMap = AEToolbox._registeredToolMap && typeof AEToolbox._registeredToolMap === "object" ? AEToolbox._registeredToolMap : {};
    AEToolbox._registeredToolLoadErrors = AEToolbox._registeredToolLoadErrors instanceof Array ? AEToolbox._registeredToolLoadErrors : [];
    AEToolbox._hasValidRegisteredToolCatalog = typeof AEToolbox._hasValidRegisteredToolCatalog === "boolean" ? AEToolbox._hasValidRegisteredToolCatalog : AEToolbox._registeredTools.length > 0;
    AEToolbox._registeredToolRegistryRevision = typeof AEToolbox._registeredToolRegistryRevision === "number" ? AEToolbox._registeredToolRegistryRevision : 0;
    AEToolbox._registeredToolLastAttemptSucceeded = typeof AEToolbox._registeredToolLastAttemptSucceeded === "boolean" ? AEToolbox._registeredToolLastAttemptSucceeded : AEToolbox._hasValidRegisteredToolCatalog;
    AEToolbox._registryTransaction = null;

    AEToolbox.beginRegistryTransaction = function () {
        if (AEToolbox._registryTransaction) {
            return false;
        }
        AEToolbox._registryTransaction = {
            tools: [],
            map: {},
            errors: [],
            currentFileName: ""
        };
        return true;
    };

    AEToolbox.addRegistryTransactionError = function (code, fileName) {
        var transaction = AEToolbox._registryTransaction;
        var safeName = String(fileName || transaction && transaction.currentFileName || "unknown.tool.jsx").replace(/^.*[\\\/]/, "");
        if (!transaction) {
            return false;
        }
        transaction.errors[transaction.errors.length] = String(code || "REGISTRY_DEFINITION_INVALID") + ": " + safeName;
        return true;
    };

    AEToolbox.registerTool = function (toolDef) {
        var id;
        var transaction = AEToolbox._registryTransaction;
        if (!transaction) {
            return false;
        }
        if (!toolDef || typeof toolDef.id !== "string") {
            AEToolbox.addRegistryTransactionError("REGISTRY_TOOL_INVALID", transaction.currentFileName);
            return false;
        }
        id = String(toolDef.id).replace(/^\s+|\s+$/g, "");
        if (!id) {
            AEToolbox.addRegistryTransactionError("REGISTRY_TOOL_INVALID", transaction.currentFileName);
            return false;
        }
        toolDef.id = id;
        if (transaction.map.hasOwnProperty(id)) {
            AEToolbox.addRegistryTransactionError("REGISTRY_TOOL_DUPLICATE", transaction.currentFileName);
            return false;
        }
        transaction.tools[transaction.tools.length] = toolDef;
        transaction.map[id] = toolDef;
        return true;
    };

    AEToolbox.validateRegistryTransaction = function () {
        var transaction = AEToolbox._registryTransaction;
        var mapCount = 0;
        var i;
        var id;
        if (!transaction || transaction.errors.length) {
            return false;
        }
        if (!transaction.tools.length) {
            AEToolbox.addRegistryTransactionError("REGISTRY_EMPTY_CATALOG", "registry");
            return false;
        }
        for (id in transaction.map) {
            if (transaction.map.hasOwnProperty(id)) {
                mapCount += 1;
            }
        }
        if (mapCount !== transaction.tools.length) {
            AEToolbox.addRegistryTransactionError("REGISTRY_MAP_MISMATCH", "registry");
            return false;
        }
        for (i = 0; i < transaction.tools.length; i++) {
            id = transaction.tools[i] && transaction.tools[i].id;
            if (!id || transaction.map[id] !== transaction.tools[i]) {
                AEToolbox.addRegistryTransactionError("REGISTRY_MAP_MISMATCH", "registry");
                return false;
            }
        }
        return true;
    };

    AEToolbox.commitRegistryTransaction = function () {
        var transaction = AEToolbox._registryTransaction;
        if (!transaction || !AEToolbox.validateRegistryTransaction()) {
            return false;
        }
        AEToolbox._registeredTools = transaction.tools;
        AEToolbox._registeredToolMap = transaction.map;
        AEToolbox._registeredToolLoadErrors = [];
        AEToolbox._hasValidRegisteredToolCatalog = true;
        AEToolbox._registeredToolLastAttemptSucceeded = true;
        AEToolbox._registeredToolRegistryRevision += 1;
        AEToolbox._registryTransaction = null;
        return true;
    };

    AEToolbox.rollbackRegistryTransaction = function () {
        var transaction = AEToolbox._registryTransaction;
        if (!transaction) {
            return false;
        }
        AEToolbox._registeredToolLoadErrors = transaction.errors.slice(0);
        AEToolbox._registeredToolLastAttemptSucceeded = false;
        AEToolbox._registryTransaction = null;
        return true;
    };

    AEToolbox.getRegisteredTools = function () {
        return AEToolbox.stringify({
            ok: AEToolbox._hasValidRegisteredToolCatalog === true,
            tools: AEToolbox._registeredTools,
            loadErrors: AEToolbox._registeredToolLoadErrors,
            registryRevision: AEToolbox._registeredToolRegistryRevision,
            lastAttemptSucceeded: AEToolbox._registeredToolLastAttemptSucceeded === true
        });
    };

    AEToolbox.resolveFunction = function (path) {
        var parts = String(path || "").split(".");
        var current = $.global;
        var i;
        for (i = 0; i < parts.length; i++) {
            if (!parts[i]) {
                continue;
            }
            current = current[parts[i]];
            if (!current) {
                return null;
            }
        }
        return typeof current === "function" ? current : null;
    };

    AEToolbox.runRegisteredToolAction = function (toolId, actionId, paramsJson) {
        var tool = AEToolbox._registeredToolMap[String(toolId || "")];
        var actions;
        var action = null;
        var fn;
        var i;

        if (!tool) {
            return AEToolbox.toJson({
                ok: false,
                message: "Registered tool not found."
            });
        }

        actions = tool.actions || [];
        for (i = 0; i < actions.length; i++) {
            if (actions[i] && actions[i].id === actionId) {
                action = actions[i];
                break;
            }
        }

        if (!action || !action.hostFunction) {
            return AEToolbox.toJson({
                ok: false,
                message: "Registered tool action not found."
            });
        }

        fn = AEToolbox.resolveFunction(action.hostFunction);
        if (!fn) {
            return AEToolbox.toJson({
                ok: false,
                message: "Registered tool host function not found."
            });
        }

        try {
            return fn(paramsJson || "{}");
        } catch (e) {
            return AEToolbox.toJson({
                ok: false,
                message: "Registered tool action failed: " + e.toString()
            });
        }
    };

    AEToolbox.parseJson = function (json) {
        if (typeof JSON !== "undefined" && JSON.parse) {
            return JSON.parse(json);
        }
        return eval("(" + json + ")");
    };

    AEToolbox.normalizeHexColor = function (hex) {
        var s = String(hex || "#ffffff").replace("#", "");
        if (s.length !== 6) {
            s = "ffffff";
        }
        return "#" + s.toUpperCase();
    };

    AEToolbox.hexToColorArray = function (hex) {
        var s = AEToolbox.normalizeHexColor(hex).replace("#", "");
        var r = parseInt(s.substr(0, 2), 16) / 255;
        var g = parseInt(s.substr(2, 2), 16) / 255;
        var b = parseInt(s.substr(4, 2), 16) / 255;
        return [r, g, b, 1];
    };

    AEToolbox.colorArrayToHex = function (color) {
        var r = Math.max(0, Math.min(255, Math.round(Number(color[0]) * 255)));
        var g = Math.max(0, Math.min(255, Math.round(Number(color[1]) * 255)));
        var b = Math.max(0, Math.min(255, Math.round(Number(color[2]) * 255)));
        var s = ((r << 16) | (g << 8) | b).toString(16).toUpperCase();
        while (s.length < 6) {
            s = "0" + s;
        }
        return "#" + s;
    };

    AEToolbox.pickColor = function (hex) {
        var comp = app.project && app.project.activeItem;
        var selectedLayers = [];
        var tempLayer = null;
        var originalHex = AEToolbox.normalizeHexColor(hex);
        var pickedHex;
        var effect;
        var colorProp;
        var color;
        var i;

        if (!comp || !(comp instanceof CompItem)) {
            return AEToolbox.toJson({
                ok: false,
                message: "Open a composition before using the AE color picker."
            });
        }

        try {
            for (i = 0; i < comp.selectedLayers.length; i++) {
                selectedLayers[selectedLayers.length] = comp.selectedLayers[i];
            }

            for (i = 1; i <= comp.numLayers; i++) {
                comp.layer(i).selected = false;
            }

            tempLayer = comp.layers.addNull();
            tempLayer.name = "__AE_Toolbox_Color_Picker__";
            tempLayer.guideLayer = true;
            tempLayer.selected = true;

            effect = tempLayer.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            colorProp = effect.property(1);
            colorProp.setValue(AEToolbox.hexToColorArray(hex));
            colorProp.selected = true;

            app.executeCommand(2240);
            color = colorProp.value;
            pickedHex = AEToolbox.colorArrayToHex(color);

            tempLayer.remove();
            tempLayer = null;

            for (i = 0; i < selectedLayers.length; i++) {
                try {
                    selectedLayers[i].selected = true;
                } catch (restoreErr) {
                }
            }

            return AEToolbox.toJson({
                ok: true,
                cancelled: pickedHex === originalHex,
                color: pickedHex,
                message: pickedHex === originalHex ? "Color unchanged." : "Color updated."
            });
        } catch (err) {
            if (tempLayer) {
                try {
                    tempLayer.remove();
                } catch (removeErr) {
                }
            }

            for (i = 0; i < selectedLayers.length; i++) {
                try {
                    selectedLayers[i].selected = true;
                } catch (restoreErr2) {
                }
            }

            return AEToolbox.toJson({
                ok: false,
                message: "AE color picker failed: " + err.toString()
            });
        }
    };
})();

#include "aeUtils.jsx"
#include "effectUtils.jsx"
#include "shapeUtils.jsx"
(function (velaHostNamespace) {
    var RUNTIME_REVISION = "vela-host-runtime-v5";
    var runtimeDescriptor;
    var jsonDescriptor;
    var contextDescriptor;
    var executionDescriptor;
    var existingRuntime;
    var staging;
    var stagedJson;
    var stagedContext;
    var stagedExecution;
    var stagedDigest;
    var stagedAuthorityVerifier;
    var runtime;
    var existingJson;
    var existingContext;
    var existingExecution;
    var existingReload;

    function runtimeError() {
        var error = new Error("The Vela Host runtime conflicts with existing state.");
        error.code = "VELA_HOST_RUNTIME_CONFLICT";
        return error;
    }

    function ownDataDescriptor(value, key) {
        var descriptor;
        try {
            descriptor = Object.getOwnPropertyDescriptor(value, key);
        } catch (ignoredDescriptor) {
            throw runtimeError();
        }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
            throw runtimeError();
        }
        return descriptor;
    }

    function optionalOwnDataDescriptor(value, key) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
            return null;
        }
        return ownDataDescriptor(value, key);
    }

    function validateJson(json) {
        return json && ownDataDescriptor(json, "revision").value === "vela-json-host-v1" &&
            typeof ownDataDescriptor(json, "parseBounded").value === "function" &&
            typeof ownDataDescriptor(json, "stringifyBounded").value === "function" &&
            typeof ownDataDescriptor(json, "utf8ByteLength").value === "function";
    }

    function validateContext(context) {
        return context && ownDataDescriptor(context, "hostAdapterRevision").value === "vela-context-host-v4" &&
            typeof ownDataDescriptor(context, "handle").value === "function" &&
            typeof ownDataDescriptor(context, "reload").value === "function";
    }

    function validateExecution(execution) {
        return execution && ownDataDescriptor(execution, "hostExecutionRevision").value === "vela-execution-host-v1" &&
            typeof ownDataDescriptor(execution, "handle").value === "function";
    }

    function publish(name, value, enumerable) {
        try {
            Object.defineProperty(velaHostNamespace, name, {
                configurable: false,
                enumerable: enumerable,
                value: value,
                writable: false
            });
        } catch (ignoredPublish) {
            throw runtimeError();
        }
        if (velaHostNamespace[name] !== value) {
            throw runtimeError();
        }
    }

    runtimeDescriptor = optionalOwnDataDescriptor(velaHostNamespace, "__velaHostRuntimeV1");
    jsonDescriptor = optionalOwnDataDescriptor(velaHostNamespace, "VelaJson");
    contextDescriptor = optionalOwnDataDescriptor(velaHostNamespace, "VelaContext");
    executionDescriptor = optionalOwnDataDescriptor(velaHostNamespace, "VelaExecution");

    if (runtimeDescriptor) {
        existingRuntime = runtimeDescriptor.value;
        existingJson = existingRuntime && ownDataDescriptor(existingRuntime, "json").value;
        existingContext = existingRuntime && ownDataDescriptor(existingRuntime, "context").value;
        existingExecution = existingRuntime && ownDataDescriptor(existingRuntime, "execution").value;
        existingReload = existingRuntime && ownDataDescriptor(existingRuntime, "reload").value;
        if (!existingRuntime || ownDataDescriptor(existingRuntime, "revision").value !== RUNTIME_REVISION ||
                !validateJson(existingJson) || !validateContext(existingContext) || !validateExecution(existingExecution) ||
                typeof existingReload !== "function" ||
                !jsonDescriptor || jsonDescriptor.value !== existingJson ||
                !contextDescriptor || contextDescriptor.value !== existingContext || !executionDescriptor || executionDescriptor.value !== existingExecution) {
            throw runtimeError();
        }
        existingReload();
        return;
    }

    if (jsonDescriptor || contextDescriptor || executionDescriptor ||
            Object.prototype.hasOwnProperty.call(velaHostNamespace, "__velaHostBootstrapV1")) {
        throw runtimeError();
    }
    if (typeof Object.defineProperty !== "function" ||
            (typeof Object.isExtensible === "function" && !Object.isExtensible(velaHostNamespace))) {
        throw runtimeError();
    }

    staging = {};
    (function (AEToolbox) {
#include "vela/velaJson.jsx"
#include "vela/velaContext.jsx"
    }(staging));

    stagedJson = staging.VelaJson;
    stagedContext = staging.VelaContext;
    stagedDigest = ownDataDescriptor(staging, "__velaPropertyValueDigestV1").value;
    stagedAuthorityVerifier = ownDataDescriptor(staging, "__velaVerifyExecutionAuthorityV1").value;
    if (typeof stagedDigest !== "function" || typeof stagedAuthorityVerifier !== "function") {
        throw runtimeError();
    }
    delete staging.__velaPropertyValueDigestV1;
    delete staging.__velaVerifyExecutionAuthorityV1;
    if (Object.prototype.hasOwnProperty.call(staging, "__velaPropertyValueDigestV1") || Object.prototype.hasOwnProperty.call(staging, "__velaVerifyExecutionAuthorityV1")) {
        throw runtimeError();
    }
    (function (AEToolbox, VelaPropertyValueDigest, VelaVerifyExecutionAuthority) {
#include "vela/velaExecution.jsx"
    }(staging, stagedDigest, stagedAuthorityVerifier));
    stagedExecution = staging.VelaExecution;
    if (!validateJson(stagedJson) || !validateContext(stagedContext) || !validateExecution(stagedExecution)) {
        throw runtimeError();
    }

    runtime = {
        revision: RUNTIME_REVISION,
        json: stagedJson,
        context: stagedContext,
        execution: stagedExecution,
        reload: function () {
            return stagedContext.reload();
        }
    };
    if (typeof Object.freeze === "function") {
        Object.freeze(runtime);
    }

    publish("VelaJson", stagedJson, true);
    publish("VelaContext", stagedContext, true);
    publish("VelaExecution", stagedExecution, true);
    publish("__velaHostRuntimeV1", runtime, false);
}(AEToolbox));
#include "tools/textBackgroundBox.jsx"
#include "tools/adComponentKit.jsx"
#include "tools/shapeAdd.jsx"

(function () {
    function sortFiles(files) {
        try {
            files.sort(function (a, b) {
                var an = String(a.name).toLowerCase();
                var bn = String(b.name).toLowerCase();
                if (an < bn) {
                    return -1;
                }
                if (an > bn) {
                    return 1;
                }
                return 0;
            });
        } catch (e) {}
        return files;
    }

    AEToolbox.loadRegisteredToolFiles = function () {
        var baseFile = File($.fileName);
        var toolsFolder = Folder(baseFile.parent.fsName + "/tools");
        var files;
        var i;

        if (!AEToolbox.beginRegistryTransaction()) {
            return false;
        }
        try {
            if (!toolsFolder.exists) {
                AEToolbox.addRegistryTransactionError("REGISTRY_DIRECTORY_UNAVAILABLE", "tools");
            } else {
                files = sortFiles(toolsFolder.getFiles(function (file) {
                    return file instanceof File && /\.tool\.jsx$/i.test(file.name);
                }));
                for (i = 0; i < files.length; i++) {
                    AEToolbox._registryTransaction.currentFileName = String(files[i].name || "unknown.tool.jsx").replace(/^.*[\\\/]/, "");
                    try {
                        $.evalFile(files[i]);
                    } catch (e) {
                        AEToolbox.addRegistryTransactionError("REGISTRY_DEFINITION_LOAD_FAILED", AEToolbox._registryTransaction.currentFileName);
                    }
                }
            }
            if (AEToolbox.validateRegistryTransaction()) {
                return AEToolbox.commitRegistryTransaction();
            }
            return false;
        } finally {
            if (AEToolbox._registryTransaction) {
                AEToolbox.rollbackRegistryTransaction();
            }
        }
    };

    AEToolbox.loadRegisteredToolFiles();
})();

(function () {
    AEToolbox.getSelectionSummary = function () {
        var comp = AEToolbox.AE.getActiveComp();
        if (!comp) {
            return AEToolbox.toJson({
                ok: true,
                statusId: "no-active-comp",
                selectedCount: 0
            });
        }

        var selectedCount = comp.selectedLayers ? comp.selectedLayers.length : 0;

        return AEToolbox.toJson({
            ok: true,
            statusId: selectedCount > 0 ? "selection" : "no-selection",
            selectedCount: selectedCount
        });
    };

    AEToolbox.getHostLoadInfo = function () {
        return AEToolbox.toJson({
            ok: true,
            message: "Host load info ready.",
            hostFile: "host/index.jsx",
            registeredToolCount: AEToolbox._registeredTools ? AEToolbox._registeredTools.length : 0,
            registeredToolLoadErrors: AEToolbox._registeredToolLoadErrors ? AEToolbox._registeredToolLoadErrors.join("; ") : "",
            registeredToolLoadErrorCount: AEToolbox._registeredToolLoadErrors ? AEToolbox._registeredToolLoadErrors.length : 0,
            hasValidRegisteredToolCatalog: AEToolbox._hasValidRegisteredToolCatalog === true,
            registeredToolLastAttemptSucceeded: AEToolbox._registeredToolLastAttemptSucceeded === true,
            registeredToolRegistryRevision: AEToolbox._registeredToolRegistryRevision,
            includesAdComponentKit: true,
            hasAdComponentKitCreateIconGrid: !!(AEToolbox.tools && AEToolbox.tools.adComponentKit && AEToolbox.tools.adComponentKit.createIconGrid)
        });
    };
})();
