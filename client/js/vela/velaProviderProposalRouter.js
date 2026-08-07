(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaProviderProposalRouter";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertDependencies(protocol, providerController, controller, capabilities) {
        if (!protocol || typeof protocol.isTrustedProtocol !== "function" || !providerController || typeof providerController.isTrustedProviderControllerForProtocol !== "function" || typeof providerController.createProposalPort !== "function" || !controller || typeof controller.isTrustedControllerForProtocol !== "function" || !capabilities || typeof capabilities.getLocalProjection !== "function" || typeof capabilities.validateCapabilityParams !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        return { protocol: protocol, providerController: providerController, controller: controller, capabilities: capabilities };
    }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var dependencies;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function" || bootstrap.hasModule(name)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaProviderController"), bootstrap.getModule("VelaController"), bootstrap.getModule("VelaCapabilityContracts"));
        exported = Object.freeze(create(dependencies.protocol, dependencies.providerController, dependencies.controller, dependencies.capabilities));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaProviderController"), require("./velaController"), require("./velaCapabilityContracts"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.providerController, dependencies.controller, dependencies.capabilities));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, providerControllerModule, controllerModule, capabilityContracts) {
    "use strict";
    var trustedRouters = new WeakSet();
    var routerProtocols = new WeakMap();
    function ownData(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { return undefined; }
        return descriptor && !descriptor.get && !descriptor.set && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    }
    function createProposalRouter(options) {
        var protocol = options && ownData(options, "protocol");
        var providerController = options && ownData(options, "providerController");
        var controller = options && ownData(options, "controller");
        var proposalPort;
        var reviewing = false;
        if (!protocolModule.isTrustedProtocol(protocol) || !protocol.isPlainObject(options)) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        protocol.assertNoUnknownKeys(options, ["protocol", "providerController", "controller"], "providerProposalRouter.options");
        if (!providerControllerModule.isTrustedProviderControllerForProtocol(providerController, protocol) || !controllerModule.isTrustedControllerForProtocol(controller, protocol)) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Provider proposal dependencies are unavailable."); }
        proposalPort = providerControllerModule.createProposalPort(providerController, protocol);
        if (!proposalPort || typeof ownData(proposalPort, "beginReview") !== "function" || typeof ownData(proposalPort, "finalizeReview") !== "function") { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Provider proposal port is unavailable."); }
        function stableErrorCode(error) {
            var code = ownData(error, "code");
            var keys = Object.keys(protocol.ERROR_CODES);
            var index;
            for (index = 0; index < keys.length; index += 1) { if (protocol.ERROR_CODES[keys[index]] === code) { return code; } }
            return protocol.ERROR_CODES.PLAN_FAILED;
        }
        function finalize(proposal, outcome, error) {
            if (outcome === "failed") { try { controller.invalidate("idle"); } catch (ignored) {} }
            proposalPort.finalizeReview({ requestId: ownData(proposal, "requestId"), generation: ownData(proposal, "generation"), outcome: outcome, errorCode: outcome === "failed" ? stableErrorCode(error) : null });
        }
        function review() {
            var proposal;
            var capability;
            var parameterName;
            var params;
            var validated;
            if (reviewing) { return Promise.reject(new protocol.VelaProtocolError(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID)); }
            reviewing = true;
            try {
                proposal = proposalPort.beginReview();
                capability = capabilityContracts.getLocalProjection("set-opacity-v1");
                if (!capability || !capability.localPolicy || capability.localPolicy.routerId !== capability.capabilityId || capability.localPolicy.parameterValidatorId !== "opacity-percent-v1" ||
                    !capability.parameters || !Array.isArray(capability.parameters.required) || capability.parameters.required.length !== 1 ||
                    !proposal || typeof ownData(proposal, "requestId") !== "string" || !Number.isInteger(ownData(proposal, "generation")) || ownData(proposal, "capabilityId") !== capability.capabilityId) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Local proposal is invalid."); }
                parameterName = capability.parameters.required[0];
                if (parameterName !== "opacity" || !capability.parameters.properties || !Object.prototype.hasOwnProperty.call(capability.parameters.properties, parameterName)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Local proposal contract is invalid."); }
                params = {};
                params[parameterName] = ownData(proposal, parameterName);
                try { validated = capabilityContracts.validateCapabilityParams(capability, params); }
                catch (error) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Local proposal parameters are invalid."); }
                return Promise.resolve(controller.createBoundOpacityCandidate({ opacity: validated[parameterName], requestId: proposal.requestId, requestGeneration: proposal.generation })).then(function (result) { finalize(proposal, "completed", null); reviewing = false; return result; }, function (error) { finalize(proposal, "failed", error); reviewing = false; throw error; });
            } catch (error) {
                if (proposal) { finalize(proposal, "failed", error); }
                reviewing = false;
                return Promise.reject(error);
            }
        }
        var router = Object.freeze({ review: review });
        trustedRouters.add(router);
        routerProtocols.set(router, protocol);
        return router;
    }
    return Object.freeze({ createProposalRouter: createProposalRouter, isTrustedProposalRouterForProtocol: function (router, protocol) { return trustedRouters.has(router) && routerProtocols.get(router) === protocol && protocolModule.isTrustedProtocol(protocol); } });
}));
