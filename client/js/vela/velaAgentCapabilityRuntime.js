(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaAgentCapabilityRuntime";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var serializer = browserPage ? root.VelaHostReadSerializer : (typeof module === "object" && module.exports ? require("./velaHostReadSerializer") : null);
    var exported = Object.freeze(factory(serializer));
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function (defaultSerializer) {
    "use strict";
    var runtimeSequence = 0;
    var ERROR_CODES = Object.freeze(["UNKNOWN_CAPABILITY", "CAPABILITY_UNAVAILABLE", "INVALID_INPUT", "ADAPTER_ERROR", "INVALID_OUTPUT", "CANCELLED"]);
    function createError(code) { var value = new Error(code); value.code = code; return value; }
    function isPlainObject(value) { var prototype; if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; } prototype = Object.getPrototypeOf(value); return prototype === null || prototype === Object.prototype; }
    function clone(value) { var result; if (Array.isArray(value)) { return value.map(clone); } if (!value || typeof value !== "object") { return value; } result = {}; Object.keys(value).forEach(function (key) { result[key] = clone(value[key]); }); return result; }
    function freeze(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; } Object.keys(value).forEach(function (key) { freeze(value[key]); }); return Object.freeze(value); }
    function resultFor(invocation, status, data, code) { return freeze({ invocationId: invocation.invocationId, sessionId: invocation.sessionId, turnId: invocation.turnId, capabilityId: invocation.capabilityId, status: status, data: data, error: code ? { code: code } : null }); }

    function createCapabilityRuntime(options) {
        var settings = isPlainObject(options) ? options : {};
        var registry = settings.registry;
        var adapters = isPlainObject(settings.adapters) ? settings.adapters : {};
        var readOwnership = settings.readOwnership;
        var serializer = settings.hostSerializer || defaultSerializer;
        var disposed = false;
        var invocationSequence = 0;
        var records = Object.create(null);
        runtimeSequence += 1;
        if (!registry || typeof registry.getContract !== "function" || typeof registry.validateInput !== "function" || typeof registry.validateOutput !== "function" || typeof registry.getAvailability !== "function" || typeof readOwnership !== "function" || !serializer || typeof serializer.enqueue !== "function") { throw createError("CAPABILITY_RUNTIME_INVALID"); }

        function ownership() {
            var value = readOwnership();
            if (!isPlainObject(value) || typeof value.sessionId !== "string" || !value.sessionId || typeof value.turnId !== "string" || !value.turnId || value.disposed === true) { throw createError("CAPABILITY_RUNTIME_INACTIVE"); }
            return freeze({ sessionId: value.sessionId, turnId: value.turnId, scopeId: typeof value.scopeId === "string" ? value.scopeId : null, agentRevision: typeof value.agentRevision === "number" ? value.agentRevision : null });
        }
        function isCurrent(record) {
            var value;
            if (disposed || record.state !== "active") { return false; }
            try { value = ownership(); } catch (ignored) { return false; }
            return value.sessionId === record.owner.sessionId && value.turnId === record.owner.turnId && value.scopeId === record.owner.scopeId && value.agentRevision === record.owner.agentRevision;
        }
        function settle(record, outcome) {
            if (record.state !== "active") { return false; }
            record.state = "terminal";
            delete records[record.invocation.invocationId];
            record.resolve(outcome);
            return true;
        }
        function discard(record) {
            if (record.state !== "active") { return false; }
            record.state = "discarded";
            delete records[record.invocation.invocationId];
            record.reject(createError("CAPABILITY_RESULT_DISCARDED"));
            return true;
        }
        function invoke(request) {
            var contract;
            var owner;
            var input;
            var availability;
            var invocation;
            var record;
            var adapter;
            var promise;
            if (disposed || !isPlainObject(request) || Object.keys(request).some(function (key) { return key !== "capabilityId" && key !== "input"; }) || typeof request.capabilityId !== "string" || !Object.prototype.hasOwnProperty.call(request, "input")) { return Promise.reject(createError("CAPABILITY_RUNTIME_INACTIVE")); }
            owner = ownership();
            contract = registry.getContract(request.capabilityId);
            if (!contract) {
                invocationSequence += 1;
                invocation = freeze({ invocationId: "inv_" + runtimeSequence + "_" + invocationSequence, sessionId: owner.sessionId, turnId: owner.turnId, capabilityId: request.capabilityId, input: null });
                return Promise.resolve(resultFor(invocation, "error", null, "UNKNOWN_CAPABILITY"));
            }
            try { input = registry.validateInput(request.capabilityId, request.input); } catch (ignoredInput) {
                invocationSequence += 1;
                invocation = freeze({ invocationId: "inv_" + runtimeSequence + "_" + invocationSequence, sessionId: owner.sessionId, turnId: owner.turnId, capabilityId: request.capabilityId, input: null });
                return Promise.resolve(resultFor(invocation, "error", null, "INVALID_INPUT"));
            }
            invocationSequence += 1;
            invocation = freeze({ invocationId: "inv_" + runtimeSequence + "_" + invocationSequence, sessionId: owner.sessionId, turnId: owner.turnId, capabilityId: request.capabilityId, input: input });
            availability = registry.getAvailability(request.capabilityId, owner);
            if (!availability.available) { return Promise.resolve(resultFor(invocation, "unavailable", null, "CAPABILITY_UNAVAILABLE")); }
            adapter = adapters[contract.adapterId];
            if (typeof adapter !== "function") { return Promise.resolve(resultFor(invocation, "error", null, "ADAPTER_ERROR")); }
            promise = new Promise(function (resolve, reject) { record = { invocation: invocation, owner: owner, state: "active", resolve: resolve, reject: reject }; records[invocation.invocationId] = record; });
            function execute() {
                var adapterResult;
                if (!isCurrent(record)) { throw createError("CAPABILITY_RESULT_DISCARDED"); }
                adapterResult = adapter(invocation);
                return adapterResult && typeof adapterResult.then === "function" ? adapterResult : Promise.resolve(adapterResult);
            }
            var operation = contract.executionEnvironment === "host" ? serializer.enqueue(execute, function () { return isCurrent(record); }) : Promise.resolve().then(execute);
            operation.then(function (raw) {
                var output;
                if (!isCurrent(record)) { discard(record); return; }
                try { output = registry.validateOutput(invocation.capabilityId, raw); }
                catch (ignoredOutput) { settle(record, resultFor(invocation, "error", null, "INVALID_OUTPUT")); return; }
                settle(record, resultFor(invocation, "succeeded", output, null));
            }, function (adapterError) {
                if (!isCurrent(record) || (adapterError && adapterError.code === "CAPABILITY_RESULT_DISCARDED")) { discard(record); return; }
                settle(record, resultFor(invocation, "error", null, "ADAPTER_ERROR"));
            });
            promise.invocation = invocation;
            promise.cancel = function () { return cancel(invocation.invocationId); };
            return promise;
        }
        function cancel(invocationId) {
            var record = records[invocationId];
            if (!record || record.state !== "active") { return false; }
            return settle(record, resultFor(record.invocation, "cancelled", null, "CANCELLED"));
        }
        function dispose() {
            if (disposed) { return false; }
            disposed = true;
            Object.keys(records).forEach(function (id) { discard(records[id]); });
            return true;
        }
        return Object.freeze({ invoke: invoke, cancel: cancel, dispose: dispose, isDisposed: function () { return disposed; }, getActiveInvocationIds: function () { return Object.freeze(Object.keys(records)); } });
    }
    return Object.freeze({ MODULE_REVISION: "vela-agent-capability-runtime-0.3.4-v1", ERROR_CODES: ERROR_CODES, createCapabilityRuntime: createCapabilityRuntime });
}));
