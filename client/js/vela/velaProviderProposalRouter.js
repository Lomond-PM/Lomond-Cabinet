(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaProviderProposalRouter";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertDependencies(protocol, providerController, controller) {
        if (!protocol || typeof protocol.isTrustedProtocol !== "function" || !providerController || typeof providerController.isTrustedProviderControllerForProtocol !== "function" || typeof providerController.createProposalPort !== "function" || !controller || typeof controller.isTrustedControllerForProtocol !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        return { protocol: protocol, providerController: providerController, controller: controller };
    }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var dependencies;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function" || bootstrap.hasModule(name)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaProviderController"), bootstrap.getModule("VelaController"));
        exported = Object.freeze(create(dependencies.protocol, dependencies.providerController, dependencies.controller));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaProviderController"), require("./velaController"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.providerController, dependencies.controller));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, providerControllerModule, controllerModule) {
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
        if (!proposalPort || typeof ownData(proposalPort, "consume") !== "function") { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Provider proposal port is unavailable."); }
        function review() {
            var proposal;
            if (reviewing) { return Promise.reject(new protocol.VelaProtocolError(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID)); }
            reviewing = true;
            try {
                proposal = proposalPort.consume();
                if (!proposal || ownData(proposal, "capabilityId") !== "set-opacity-v1" || typeof ownData(proposal, "opacity") !== "number") { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Local proposal is invalid."); }
                return Promise.resolve(controller.createOpacityCandidate({ opacity: ownData(proposal, "opacity") })).then(function (result) { reviewing = false; return result; }, function (error) { reviewing = false; throw error; });
            } catch (error) {
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
