(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaExecutionAdapter";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function fail(code) { var error = new Error(code); error.code = code; throw error; }
    function register(target) {
        var bootstrap;
        var exported;
        if (!target || !Object.prototype.hasOwnProperty.call(target, BOOTSTRAP_NAME)) { fail("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || bootstrap.hasModule(MODULE_NAME) || Object.prototype.hasOwnProperty.call(target, MODULE_NAME)) { fail("MODULE_BOOTSTRAP_CONFLICT"); }
        exported = Object.freeze(factory(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaContext"), bootstrap.getModule("VelaContextBridge")));
        bootstrap.registerModule(MODULE_NAME, exported);
        Object.defineProperty(target, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) { register(root); }
    else if (typeof module === "object" && module.exports) { module.exports = Object.freeze(factory(require("./velaProtocol"), require("./velaContext"), require("./velaContextBridge"))); }
}(typeof self !== "undefined" ? self : this, function (protocolModule, contextModule, bridgeModule) {
    "use strict";
    var HOST_RESULT_PROTOCOL = "vela.host-execution-result.v1";
    var HOST_REVISION = "vela-execution-host-v1";
    var FIXED_FACADE_PREFIX = "AE" + "Toolbox.VelaExecution.handle(";
    var trustedAdapters = new WeakSet();
    var adapterProtocols = new WeakMap();
    function ownFunction(value, key, protocol) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        if (!descriptor || descriptor.get || descriptor.set || typeof descriptor.value !== "function") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        return descriptor.value;
    }
    function quote(value) { return bridgeModule.quoteForExtendScript(value); }
    function error(protocol, code, committed) { var value = new protocol.VelaProtocolError(code, undefined, { stage: "execution-adapter" }); value.committed = committed === true ? true : committed === false ? false : null; return value; }
    function mapHostCode(protocol, code) {
        if (code === "HOST_EXECUTION_AUTHORITY_MISMATCH" || code === "HOST_EXECUTION_VALUE_MISMATCH") { return protocol.ERROR_CODES.CONTEXT_STALE; }
        if (code === "HOST_EXECUTION_TARGET_NOT_FOUND") { return protocol.ERROR_CODES.UNKNOWN_TARGET; }
        if (code === "HOST_EXECUTION_EXPRESSION_ENABLED") { return protocol.ERROR_CODES.CONTEXT_VALUE_EVALUATION_DISALLOWED; }
        if (code === "HOST_EXECUTION_UNAVAILABLE" || code === "HOST_EXECUTION_READ_FAILED") { return protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE; }
        if (code === "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE") { return protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE; }
        if (code === "HOST_EXECUTION_MUTATION_FAILED") { return protocol.ERROR_CODES.PLAN_FAILED; }
        return protocol.ERROR_CODES.PLAN_FAILED;
    }
    function createExecutionAdapter(options) {
        var protocol = options && options.protocol;
        var contextApi;
        var bridge;
        var executionPort;
        var invokeHost;
        if (!protocolModule.isTrustedProtocol(protocol) || !protocol.isPlainObject(options)) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        protocol.assertNoUnknownKeys(options, ["protocol", "contextApi", "contextBridge", "executionPort", "invokeHost", "onTrajectoryFact"], "executionAdapter.options");
        contextApi = protocol.getOwnDataProperty(options, "contextApi");
        bridge = protocol.getOwnDataProperty(options, "contextBridge");
        executionPort = protocol.getOwnDataProperty(options, "executionPort");
        if (!contextModule.isTrustedContextApiForProtocol(contextApi, protocol) || !bridgeModule.isTrustedContextBridgeForProtocol(bridge, protocol)) { throw error(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        if (!bridgeModule.isTrustedExecutionPortForProtocol || !bridgeModule.isTrustedExecutionPortForProtocol(executionPort, protocol) || typeof ownFunction(executionPort, "buildRequest", protocol) !== "function") { throw error(protocol, protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        invokeHost = ownFunction(options, "invokeHost", protocol);
        function executeValidatedAction(action, metadata, trustedExecutionContext) {
            function trajectory(kind, committed, hostCommitted, code, digest, validated) {
                try { if (typeof options.onTrajectoryFact === "function") { options.onTrajectoryFact(protocol.deepFreeze({ kind: kind, producer: "VelaExecutionAdapter", planId: metadata.planId, committed: committed, hostCommitted: hostCommitted, code: code, digest: digest, hostValidated: validated, sourceRequestId: request ? request.requestId : null })); } } catch (ignoredTrajectory) {}
            }
            var request;
            var expectedResultDigest;
            var expectedCapabilityId;
            var expectedValueKind;
            try {
                request = executionPort.buildRequest(action, trustedExecutionContext);
                expectedCapabilityId = request.capabilityId;
                expectedValueKind = expectedCapabilityId === "set-layer-name-v1" ? "string" : "number";
                expectedResultDigest = contextApi.digestPropertyValue(expectedValueKind, expectedValueKind === "string" ? request.scope.params.name : request.scope.params.opacity);
            } catch (cause) { var beforeHostError = cause instanceof protocol.VelaProtocolError ? cause : error(protocol, protocol.ERROR_CODES.PLAN_FAILED); beforeHostError.committed = false; return Promise.reject(beforeHostError); }
            return new Promise(function (resolve, reject) {
                var settled = false;
                function settleFailure(code, committed, validated) { if (!settled) { trajectory("host-result", committed === true ? true : committed === false ? false : null, validated ? committed : null, code, null, validated === true); settled = true; reject(error(protocol, code, committed)); } }
                function callback(raw) {
                    var result;
                    var hostError;
                    if (settled) { return; }
                    try {
                        if (typeof raw !== "string") { settleFailure(protocol.ERROR_CODES.PLAN_FAILED, null); return; }
                        result = JSON.parse(raw);
                        protocol.assertSafeJson(result, { allowDangerousPaths: ["error.code"] });
                        protocol.assertNoUnknownKeys(result, ["protocol", "schemaVersion", "requestId", "sessionId", "operation", "ok", "hostExecutionRevision", "result", "error"], "executionAdapter.hostResult");
                        if (result.protocol !== HOST_RESULT_PROTOCOL || result.schemaVersion !== "1.0" || result.requestId !== request.requestId || result.sessionId !== request.sessionId || result.operation !== "executeCapability" || result.hostExecutionRevision !== HOST_REVISION || typeof result.ok !== "boolean") { settleFailure(protocol.ERROR_CODES.PLAN_FAILED, null); return; }
                        if (!result.ok) { protocol.assertNoUnknownKeys(result.error, ["code", "message", "mutationCommitted"], "executionAdapter.hostResult.error"); if (result.error.mutationCommitted !== true && result.error.mutationCommitted !== false && result.error.mutationCommitted !== null) { settleFailure(protocol.ERROR_CODES.PLAN_FAILED, null); return; } hostError = result.error && result.error.code; settleFailure(mapHostCode(protocol, hostError), result.error.mutationCommitted, true); return; }
                        protocol.assertNoUnknownKeys(result.result, ["capabilityId", "valueKind", "resultingValueDigest"], "executionAdapter.hostResult.result");
                        if (result.result.capabilityId !== expectedCapabilityId || result.result.valueKind !== expectedValueKind || result.result.resultingValueDigest !== expectedResultDigest) { settleFailure(protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE, true, true); return; }
                        trajectory("host-result", true, true, null, result.result.resultingValueDigest, true);
                        settled = true;
                        resolve(protocol.deepFreeze({ ok: true, committed: true, summary: { capabilityId: expectedCapabilityId, resultingValueDigest: result.result.resultingValueDigest } }));
                    } catch (ignored) { settleFailure(protocol.ERROR_CODES.PLAN_FAILED, null); }
                }
                trajectory("host-entered", null, null, null, null, false);
                try { invokeHost(FIXED_FACADE_PREFIX + quote(JSON.stringify(request)) + ")", callback); }
                catch (ignoredInvoke) { settleFailure(protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE, null); }
            });
        }
        var adapter = Object.freeze({ executeValidatedAction: executeValidatedAction });
        trustedAdapters.add(adapter);
        adapterProtocols.set(adapter, protocol);
        return adapter;
    }
    return Object.freeze({
        createExecutionAdapter: createExecutionAdapter,
        isTrustedExecutionAdapterForProtocol: function (adapter, protocol) { return Boolean(adapter && protocolModule.isTrustedProtocol(protocol) && trustedAdapters.has(adapter) && adapterProtocols.get(adapter) === protocol); }
    });
}));
