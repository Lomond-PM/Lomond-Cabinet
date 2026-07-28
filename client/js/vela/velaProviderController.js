(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaProviderController";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var dependencies;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        dependencies = { protocol: bootstrap.getModule("VelaProtocol"), bridge: bootstrap.getModule("VelaContextBridge"), adapter: bootstrap.getModule("VelaProviderAdapter"), transport: bootstrap.getModule("VelaLocalTransport"), intentGate: bootstrap.getModule("VelaProviderIntentGate") };
        if (!dependencies.protocol || !dependencies.bridge || !dependencies.adapter || !dependencies.transport || !dependencies.intentGate) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        exported = Object.freeze(create(dependencies.protocol, dependencies.bridge, dependencies.adapter, dependencies.transport, dependencies.intentGate));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaProtocol"), require("./velaContextBridge"), require("./velaProviderAdapter"), require("./velaLocalTransport"), require("./velaProviderIntentGate")));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, bridgeModule, adapterModule, transportModule, intentGateModule) {
    "use strict";
    var MODULE_REVISION = "vela-provider-controller-v1";
    var trustedControllers = new WeakSet();
    var controllerProtocols = new WeakMap();
    var controllerProposalPorts = new WeakMap();
    var controllerContextRefreshPorts = new WeakMap();
    var hasOwn = Object.prototype.hasOwnProperty;
    function ownData(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { return undefined; }
        return descriptor && !descriptor.get && !descriptor.set && hasOwn.call(descriptor, "value") ? descriptor.value : undefined;
    }
    function safeCode(protocol, error) {
        var code = ownData(error, "code");
        return typeof code === "string" && Object.keys(protocol.ERROR_CODES).some(function (key) { return protocol.ERROR_CODES[key] === code; }) ? code : protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID;
    }
    function createProviderController(options) {
        options = options || {};
        var protocol = ownData(options, "protocol");
        var bridge = ownData(options, "contextBridge");
        var transport = ownData(options, "transport");
        var providerRuntime = ownData(options, "runtime");
        if (!protocolModule.isTrustedProtocol(protocol) || !bridgeModule.isTrustedContextBridgeForProtocol(bridge, protocol) || !transportModule.isTrustedLocalTransportForProtocol(transport, protocol) || !intentGateModule || typeof intentGateModule.evaluate !== "function" || !protocol.isPlainObject(options)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        protocol.assertNoUnknownKeys(options, ["protocol", "contextBridge", "transport", "runtime"], "providerController.options");
        if (!providerRuntime || typeof ownData(providerRuntime, "setTimeout") !== "function" || typeof ownData(providerRuntime, "clearTimeout") !== "function" || typeof ownData(providerRuntime, "createAbortController") !== "function" || typeof ownData(providerRuntime, "parseUrl") !== "function" || typeof ownData(providerRuntime, "nowMs") !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Provider runtime dependencies are unavailable.");
        }
        var state = "idle";
        var active = null;
        var activeProposal = null;
        var generation = 1;
        var publicState = protocol.deepFreeze({ state: state, requestId: null, text: null, errorCode: null, proposalCapabilityId: null, suggestedOpacity: null, providerId: "lmstudio", modelId: null, moduleRevision: MODULE_REVISION });
        function publish(nextState, requestId, text, errorCode, model, proposal) {
            state = nextState;
            if (nextState !== "proposal-ready") { activeProposal = null; }
            publicState = protocol.deepFreeze({ state: nextState, requestId: requestId || null, text: text || null, errorCode: errorCode || null,
                proposalCapabilityId: proposal ? proposal.capabilityId : null, suggestedOpacity: proposal ? proposal.opacity : null,
                providerId: "lmstudio", modelId: model || null, moduleRevision: MODULE_REVISION });
            return publicState;
        }
        function summaryFromCapture(capture) {
            var snapshot = capture && ownData(capture, "snapshot");
            var activeComp = snapshot && ownData(snapshot, "activeComp");
            var selection = snapshot && ownData(snapshot, "selection");
            var count = Array.isArray(selection) ? selection.length : 0;
            var type = count && selection[0] && typeof ownData(selection[0], "type") === "string" ? ownData(selection[0], "type") : "none";
            var compType = activeComp && typeof ownData(activeComp, "type") === "string" ? ownData(activeComp, "type") : "none";
            return "Tier 1 display context: active composition type " + compType + "; selected layers " + count + "; first selected layer type " + type + ".";
        }
        function validateInput(input) {
            protocol.assertSafeJson(input);
            if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider request input is invalid."); }
            protocol.assertNoUnknownKeys(input, ["message", "endpoint", "model"], "providerController.send");
            var message = protocol.assertNonEmptyString(input.message, "provider message", protocol.HARD_LIMITS.maxMessageBytes);
            if (!/\S/.test(message)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider messages must contain non-whitespace text."); }
            return {
                message: message,
                endpoint: protocol.assertNonEmptyString(input.endpoint, "provider endpoint", protocol.HARD_LIMITS.maxStringBytes),
                model: protocol.assertNonEmptyString(input.model, "provider model", 256)
            };
        }
        function send(input) {
            var values;
            var capturedGeneration;
            if (state === "pending") { return Promise.reject(new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_REQUEST_IN_FLIGHT)); }
            try { values = validateInput(input); }
            catch (error) { publish("failed", null, null, safeCode(protocol, error), null); return Promise.reject(error); }
            capturedGeneration = generation + 1;
            generation = capturedGeneration;
            publish("pending", null, null, null, values.model);
            return bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true }).then(function (capture) {
                var provider;
                var started;
                if (capturedGeneration !== generation || state !== "pending") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                provider = adapterModule.createLocalOpenAICompatibleProvider({ protocol: protocol, transport: transport, runtime: providerRuntime, endpoint: values.endpoint, model: values.model, responseFormatMode: "json-schema" });
                started = provider.start({ messages: [{ role: "assistant", content: summaryFromCapture(capture) }, { role: "user", content: values.message }], context: { contextId: capture.contextId, fingerprint: capture.fingerprint, tier: 1 } });
                active = { generation: capturedGeneration, requestId: started.requestId, provider: provider };
                publish("pending", started.requestId, null, null, values.model);
                return started.promise;
            }).then(function (response) {
                var envelope;
                if (!active || active.generation !== capturedGeneration || capturedGeneration !== generation || state !== "pending") { return publicState; }
                active = null;
                envelope = response && ownData(response, "envelope");
                if (!envelope || (envelope.type !== "text" && envelope.type !== "error" && envelope.type !== "localProposal")) { return publish("failed", publicState.requestId, null, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, values.model); }
                if (envelope.type === "error") { return publish("failed", publicState.requestId, null, safeCode(protocol, ownData(envelope, "error")), values.model); }
                if (envelope.type === "localProposal") {
                    var proposal = ownData(envelope, "proposal");
                    var capabilityId = ownData(proposal, "capabilityId");
                    var opacity = ownData(ownData(proposal, "params"), "opacity");
                    var intent = intentGateModule.evaluate({ message: values.message, capabilityId: capabilityId, proposedOpacity: opacity });
                    if (!intent || intent.allowed !== true) {
                        activeProposal = null;
                        return publish("intent-rejected", publicState.requestId, null, null, values.model);
                    }
                    activeProposal = protocol.deepFreeze({ capabilityId: capabilityId, opacity: opacity });
                    return publish("proposal-ready", publicState.requestId, null, null, values.model, { capabilityId: capabilityId, opacity: opacity });
                }
                return publish("completed", publicState.requestId, protocol.assertString(ownData(envelope, "text"), "provider text", protocol.HARD_LIMITS.maxMessageBytes), null, values.model);
            }, function (error) {
                if (capturedGeneration !== generation || state !== "pending") { return publicState; }
                active = null;
                return publish("failed", publicState.requestId, null, safeCode(protocol, error), values.model);
            });
        }
        function cancel(input) {
            var requestId;
            if (!protocol.isPlainObject(input)) { return false; }
            try { protocol.assertNoUnknownKeys(input, ["requestId"], "providerController.cancel"); requestId = protocol.assertNonEmptyString(input.requestId, "provider requestId", 256); }
            catch (error) { return false; }
            if (!active || state !== "pending" || active.requestId !== requestId) { return false; }
            generation += 1;
            active.provider.cancel(requestId);
            active = null;
            publish("cancelled", requestId, null, protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED, publicState.modelId);
            return true;
        }
        function invalidate(nextState) {
            generation += 1;
            if (active) { try { active.provider.cancel(active.requestId); } catch (ignored) {} }
            active = null;
            return publish(nextState || "idle", null, null, nextState === "failed" ? protocol.ERROR_CODES.LIFECYCLE_BLOCKED : null, null);
        }
        var proposalPort = Object.freeze({
            consume: function () {
                var proposal;
                if (state !== "proposal-ready" || !activeProposal) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "No local proposal is available."); }
                proposal = activeProposal;
                activeProposal = null;
                publish("idle", null, null, null, publicState.modelId);
                return proposal;
            }
        });
        var contextRefreshPort = Object.freeze({
            discardActiveProposalForContextRefresh: function () {
                if (state !== "proposal-ready" || !activeProposal) { return false; }
                activeProposal = null;
                publish("idle", null, null, null, publicState.modelId);
                return true;
            }
        });
        var controller = Object.freeze({ send: send, cancel: cancel, invalidate: invalidate, getUiState: function () { return publicState; } });
        trustedControllers.add(controller);
        controllerProtocols.set(controller, protocol);
        controllerProposalPorts.set(controller, proposalPort);
        controllerContextRefreshPorts.set(controller, contextRefreshPort);
        return controller;
    }
    function isTrustedProviderControllerForProtocol(value, protocol) { return trustedControllers.has(value) && controllerProtocols.get(value) === protocol && protocolModule.isTrustedProtocol(protocol); }
    function createProposalPort(controller, protocol) {
        var port;
        if (!isTrustedProviderControllerForProtocol(controller, protocol)) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        port = controllerProposalPorts.get(controller);
        if (!port) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        return port;
    }
    function createContextRefreshPort(controller, protocol) {
        var port;
        if (!isTrustedProviderControllerForProtocol(controller, protocol)) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        port = controllerContextRefreshPorts.get(controller);
        if (!port) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        return port;
    }
    return Object.freeze({ createProviderController: createProviderController, isTrustedProviderControllerForProtocol: isTrustedProviderControllerForProtocol, createProposalPort: createProposalPort, createContextRefreshPort: createContextRefreshPort });
}));
