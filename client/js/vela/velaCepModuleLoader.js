(function (root) {
    "use strict";

    var LOADER_NAME = "VelaCepModuleLoader";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    var MODULES = Object.freeze([
        { name: "VelaProtocol", file: "velaProtocol.js" },
        { name: "VelaResponseParser", file: "velaResponseParser.js" },
        { name: "VelaCapabilityContracts", file: "velaCapabilityContracts.js" },
        { name: "VelaProviderAdapter", file: "velaProviderAdapter.js" },
        { name: "VelaProviderIntentGate", file: "velaProviderIntentGate.js" },
        { name: "VelaLocalTransport", file: "velaLocalTransport.js" },
        { name: "VelaContext", file: "velaContext.js" },
        { name: "VelaValidator", file: "velaValidator.js" },
        { name: "VelaPlan", file: "velaPlan.js" },
        { name: "VelaExecutionGuard", file: "velaExecutionGuard.js" },
        { name: "VelaContextBridge", file: "velaContextBridge.js" },
        { name: "VelaExecutionPreflight", file: "velaExecutionPreflight.js" },
        { name: "VelaExecutionAdapter", file: "velaExecutionAdapter.js" },
        { name: "VelaController", file: "velaController.js" },
        { name: "VelaProviderController", file: "velaProviderController.js" },
        { name: "VelaProviderProposalRouter", file: "velaProviderProposalRouter.js" },
        { name: "VelaRuntime", file: "velaRuntime.js" }
    ]);
    var state = "idle";
    var inFlight = null;
    var readyResult = null;
    var failedResult = null;
    var scriptLocation = null;
    var hasOwn = Object.prototype.hasOwnProperty;

    function frozenResult(ok, code) {
        return Object.freeze({
            ok: ok === true,
            state: ok === true ? "ready" : "failed",
            code: code || null,
            moduleRevision: "vela-cep-module-loader-v1",
            modules: Object.freeze(MODULES.map(function (item) { return item.name; }))
        });
    }

    function failure(code) {
        state = "failed";
        failedResult = frozenResult(false, code || "RUNTIME_CAPABILITY_UNAVAILABLE");
        return failedResult;
    }

    function ownDescriptor(target, key) {
        try { return Object.getOwnPropertyDescriptor(target, key) || null; }
        catch (error) { return null; }
    }

    function commonJsDescriptorSnapshot(target) {
        try {
            return Object.freeze({
                module: Object.getOwnPropertyDescriptor(target, "module") || null,
                exports: Object.getOwnPropertyDescriptor(target, "exports") || null,
                require: Object.getOwnPropertyDescriptor(target, "require") || null
            });
        } catch (error) {
            return null;
        }
    }

    function sameDescriptor(left, right) {
        if (left === right) { return true; }
        if (!left || !right || left.configurable !== right.configurable || left.enumerable !== right.enumerable) { return false; }
        if (hasOwn.call(left, "value") || hasOwn.call(right, "value")) {
            return hasOwn.call(left, "value") && hasOwn.call(right, "value") && left.writable === right.writable && left.value === right.value;
        }
        return left.get === right.get && left.set === right.set;
    }

    function commonJsDescriptorsUnchanged(target, before) {
        try {
            return !!before && sameDescriptor(before.module, ownDescriptor(target, "module")) &&
                sameDescriptor(before.exports, ownDescriptor(target, "exports")) &&
                sameDescriptor(before.require, ownDescriptor(target, "require"));
        } catch (error) {
            return false;
        }
    }

    function captureScriptLocation(documentRef) {
        var current;
        var src;
        var query;
        var pathEnd;
        var slash;
        try {
            current = documentRef && documentRef.currentScript;
            src = current && typeof current.src === "string" ? current.src : "";
            query = src.indexOf("?");
            pathEnd = query >= 0 ? query : src.length;
            slash = src.lastIndexOf("/", pathEnd - 1);
            if (!src || slash < 0 || src.slice(slash + 1, pathEnd) !== "velaCepModuleLoader.js") { return null; }
            return Object.freeze({
                base: src.slice(0, slash + 1),
                query: query >= 0 ? src.slice(query) : ""
            });
        } catch (error) {
            return null;
        }
    }

    function expectedModuleShape(name, value) {
        if (!value || !Object.isFrozen(value)) { return false; }
        if (name === "VelaProtocol") { return typeof value.createProtocol === "function" && typeof value.isTrustedProtocol === "function" && value.ERROR_CODES; }
        if (name === "VelaResponseParser") { return typeof value.createResponseParser === "function"; }
        if (name === "VelaCapabilityContracts") { return typeof value.getModelProjection === "function" && typeof value.getLocalProjection === "function" && typeof value.createRegistry === "function"; }
        if (name === "VelaProviderAdapter") { return typeof value.createLocalOpenAICompatibleProvider === "function"; }
        if (name === "VelaProviderIntentGate") { return typeof value.evaluate === "function"; }
        if (name === "VelaLocalTransport") { return typeof value.createLocalTransport === "function" && typeof value.isTrustedLocalTransportForProtocol === "function"; }
        if (name === "VelaContext") { return typeof value.createContextApi === "function" && typeof value.isTrustedContextApiForProtocol === "function"; }
        if (name === "VelaValidator") { return typeof value.createActionValidator === "function" && typeof value.isTrustedActionValidatorForProtocol === "function"; }
        if (name === "VelaPlan") { return typeof value.createPlanStore === "function" && typeof value.isTrustedPlanStoreForProtocol === "function"; }
        if (name === "VelaExecutionGuard") { return typeof value.createExecutionGuard === "function"; }
        if (name === "VelaContextBridge") { return typeof value.createContextBridge === "function" && typeof value.isTrustedContextBridgeForProtocol === "function" && typeof value.isTrustedExecutionPortForProtocol === "function"; }
        if (name === "VelaExecutionPreflight") { return typeof value.createExecutionPreflight === "function"; }
        if (name === "VelaExecutionAdapter") { return typeof value.createExecutionAdapter === "function" && typeof value.isTrustedExecutionAdapterForProtocol === "function"; }
        if (name === "VelaController") { return typeof value.createController === "function" && typeof value.isTrustedControllerForProtocol === "function"; }
        if (name === "VelaProviderController") { return typeof value.createProviderController === "function" && typeof value.isTrustedProviderControllerForProtocol === "function"; }
        if (name === "VelaProviderProposalRouter") { return typeof value.createProposalRouter === "function" && typeof value.isTrustedProposalRouterForProtocol === "function"; }
        if (name === "VelaRuntime") { return typeof value.createRuntime === "function"; }
        return false;
    }

    function verifyModule(target, name) {
        var bootstrapDescriptor = ownDescriptor(target, BOOTSTRAP_NAME);
        var globalDescriptor = ownDescriptor(target, name);
        var bootstrap;
        var moduleValue;
        try {
            if (!bootstrapDescriptor || bootstrapDescriptor.get || bootstrapDescriptor.set || bootstrapDescriptor.configurable !== false || bootstrapDescriptor.writable !== false) { return false; }
            bootstrap = bootstrapDescriptor.value;
            if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { return false; }
            if (!globalDescriptor || globalDescriptor.get || globalDescriptor.set || globalDescriptor.configurable !== false || globalDescriptor.writable !== false) { return false; }
            moduleValue = globalDescriptor.value;
            return bootstrap.hasModule(name) === true && bootstrap.getModule(name) === moduleValue && expectedModuleShape(name, moduleValue);
        } catch (error) {
            return false;
        }
    }

    function hasPartialOrConflictingState(target) {
        var index;
        if (hasOwn.call(target, BOOTSTRAP_NAME)) { return true; }
        for (index = 0; index < MODULES.length; index += 1) {
            if (hasOwn.call(target, MODULES[index].name)) { return true; }
        }
        return false;
    }

    function injectOne(documentRef, target, module) {
        return new Promise(function (resolve, reject) {
            var host = documentRef.head || documentRef.documentElement;
            var script;
            var commonJsBefore = commonJsDescriptorSnapshot(target);
            var timer = null;
            var settled = false;
            function cleanup() {
                if (timer !== null) { root.clearTimeout(timer); timer = null; }
                if (script) {
                    script.onload = null;
                    script.onerror = null;
                    if (script.parentNode) { script.parentNode.removeChild(script); }
                }
                return commonJsDescriptorsUnchanged(target, commonJsBefore);
            }
            function settle(ok, code) {
                if (settled) { return; }
                settled = true;
                var restored = cleanup();
                if (!restored) { reject("RUNTIME_CAPABILITY_UNAVAILABLE"); return; }
                if (!ok) { reject(code || "RUNTIME_CAPABILITY_UNAVAILABLE"); return; }
                resolve();
            }
            if (!host || typeof documentRef.createElement !== "function" || !commonJsBefore) { settle(false, "RUNTIME_CAPABILITY_UNAVAILABLE"); return; }
            try {
                script = documentRef.createElement("script");
                script.async = false;
                script.src = scriptLocation.base + module.file + scriptLocation.query;
                script.onload = function () { settle(verifyModule(target, module.name), "MODULE_BOOTSTRAP_CONFLICT"); };
                script.onerror = function () { settle(false, "RUNTIME_CAPABILITY_UNAVAILABLE"); };
                timer = root.setTimeout(function () { settle(false, "RUNTIME_CAPABILITY_UNAVAILABLE"); }, 6000);
                host.appendChild(script);
            } catch (error) {
                settle(false, "RUNTIME_CAPABILITY_UNAVAILABLE");
            }
        });
    }

    function load() {
        var documentRef = root["doc" + "ument"];
        if (state === "ready") { return Promise.resolve(readyResult); }
        if (state === "loading") { return inFlight; }
        if (state === "failed") { return Promise.reject(failedResult); }
        if (!documentRef || !scriptLocation) {
            return Promise.reject(failure("RUNTIME_CAPABILITY_UNAVAILABLE"));
        }
        if (hasPartialOrConflictingState(root)) {
            return Promise.reject(failure("MODULE_BOOTSTRAP_CONFLICT"));
        }
        state = "loading";
        inFlight = MODULES.reduce(function (chain, module) {
            return chain.then(function () { return injectOne(documentRef, root, module); });
        }, Promise.resolve()).then(function () {
            readyResult = frozenResult(true, null);
            state = "ready";
            return readyResult;
        }, function (code) {
            throw failure(typeof code === "string" ? code : "RUNTIME_CAPABILITY_UNAVAILABLE");
        });
        return inFlight;
    }

    function getStatus() {
        return Object.freeze({
            state: state,
            moduleRevision: "vela-cep-module-loader-v1",
            lastErrorCode: failedResult ? failedResult.code : null
        });
    }

    scriptLocation = captureScriptLocation(root && root["doc" + "ument"]);
    if (!root || hasOwn.call(root, LOADER_NAME)) { return; }
    Object.defineProperty(root, LOADER_NAME, {
        configurable: false,
        enumerable: true,
        value: Object.freeze({ load: load, getStatus: getStatus }),
        writable: false
    });
}(typeof self !== "undefined" ? self : this));
