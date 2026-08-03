(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaExecutionGuard";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertProtocolModule(dependency) {
        if (!dependency || typeof dependency.createProtocol !== "function" || typeof dependency.isTrustedProtocol !== "function" || !dependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionGuard requires VelaProtocol.");
        }
        return dependency;
    }

    function assertPlanModule(dependency) {
        if (!dependency || typeof dependency.isTrustedPlanStore !== "function" || typeof dependency.isTrustedPlanStoreForProtocol !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionGuard requires VelaPlan.");
        }
        return dependency;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionGuard requires the Vela protocol bootstrap."); }
        var bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "The Vela protocol bootstrap is invalid."); }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered."); }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with the loaded module."); }
        var protocolDependency = assertProtocolModule(bootstrap.getModule("VelaProtocol"));
        var planDependency = assertPlanModule(bootstrap.getModule("VelaPlan"));
        var exported = Object.freeze(create(protocolDependency, planDependency));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol")), assertPlanModule(require("./velaPlan"))));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, planModule) {
    "use strict";

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.canonicalStringify !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return protocol;
    }

    function permissionSnapshotsEqual(protocol, left, right) {
        try {
            return protocol.canonicalStringify(protocol.validatePermissionSnapshot(left)) === protocol.canonicalStringify(protocol.validatePermissionSnapshot(right));
        } catch (error) {
            return false;
        }
    }

    function replayKeyFor(candidateId, planRevision, actionIndex) {
        if (typeof candidateId !== "string" || !Number.isInteger(planRevision) || !Number.isInteger(actionIndex)) {
            return null;
        }
        return candidateId + ":" + planRevision + ":" + actionIndex;
    }

    function requirePlanStore(store) {
        if (!planModule.isTrustedPlanStore(store)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.UNTRUSTED_PLAN_STORE, "ExecutionGuard requires a trusted PlanStore.", { stage: "execution-guard" });
        }
        return store;
    }

    function ExecutionGuard(store) {
        store = requirePlanStore(store);
        Object.defineProperty(this, "check", {
            enumerable: false,
            value: function (planId, stepIndex, current) {
                return store.checkStep(planId, stepIndex, current);
            }
        });
        Object.defineProperty(this, "reserve", {
            enumerable: false,
            value: function (planId, stepIndex, current) {
                return store.reserveStep(planId, stepIndex, current);
            }
        });
        Object.defineProperty(this, "complete", {
            enumerable: false,
            value: function (reservation, result) {
                return store.completeStep(reservation, result);
            }
        });
        Object.defineProperty(this, "fail", {
            enumerable: false,
            value: function (reservation, error) {
                return store.failStep(reservation, error);
            }
        });
        Object.defineProperty(this, "abort", {
            enumerable: false,
            value: function (reservation, errorCode) {
                return store.abortStep(reservation, errorCode);
            }
        });
        Object.freeze(this);
    }

    function createExecutionGuard(store) {
        return new ExecutionGuard(store);
    }

    return {
        ExecutionGuard: ExecutionGuard,
        createExecutionGuard: createExecutionGuard,
        permissionSnapshotsEqual: permissionSnapshotsEqual,
        replayKeyFor: replayKeyFor
    };
}));
