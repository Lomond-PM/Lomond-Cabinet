(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaProviderController";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function ownData(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { return undefined; }
        return descriptor && !descriptor.get && !descriptor.set && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    }
    function browserDependency(target, bootstrap, name) {
        var descriptor;
        var value;
        try {
            descriptor = Object.getOwnPropertyDescriptor(target, name);
            value = descriptor && !descriptor.get && !descriptor.set && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
            if (!descriptor || descriptor.configurable !== false || descriptor.writable !== false || !Object.isFrozen(value) ||
                    bootstrap.hasModule(name) !== true || bootstrap.getModule(name) !== value) { throw new Error(); }
            return value;
        } catch (error) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
    }
    function assertDependencies(protocol, bridge, contracts, policy, adapter, transport, intentGate, logicalPlans) {
        if (!protocol || !Object.isFrozen(protocol) || typeof ownData(protocol, "isTrustedProtocol") !== "function" ||
                !bridge || !Object.isFrozen(bridge) || typeof ownData(bridge, "createProviderContextPort") !== "function" || typeof ownData(bridge, "isTrustedContextBridgeForProtocol") !== "function" ||
                !contracts || !Object.isFrozen(contracts) || typeof ownData(contracts, "getModelProjection") !== "function" ||
                !policy || !Object.isFrozen(policy) || typeof ownData(policy, "createRequestBranchPolicy") !== "function" ||
                !adapter || !Object.isFrozen(adapter) || typeof ownData(adapter, "createLocalOpenAICompatibleProvider") !== "function" ||
                !transport || !Object.isFrozen(transport) || typeof ownData(transport, "isTrustedLocalTransportForProtocol") !== "function" ||
                !intentGate || !Object.isFrozen(intentGate) || typeof ownData(intentGate, "evaluate") !== "function" || typeof ownData(intentGate, "evaluateLogicalPlan") !== "function" ||
                !logicalPlans || !Object.isFrozen(logicalPlans) || typeof ownData(logicalPlans, "validateLogicalPlanProposal") !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE");
        }
        return Object.freeze([protocol, bridge, contracts, policy, adapter, transport, intentGate, logicalPlans]);
    }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var dependencies;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        dependencies = assertDependencies(
            browserDependency(target, bootstrap, "VelaProtocol"),
            browserDependency(target, bootstrap, "VelaContextBridge"),
            browserDependency(target, bootstrap, "VelaCapabilityContracts"),
            browserDependency(target, bootstrap, "VelaProviderRequestBranchPolicy"),
            browserDependency(target, bootstrap, "VelaProviderAdapter"),
            browserDependency(target, bootstrap, "VelaLocalTransport"),
            browserDependency(target, bootstrap, "VelaProviderIntentGate"),
            browserDependency(target, bootstrap, "VelaLogicalPlanContracts")
        );
        exported = Object.freeze(create(dependencies[0], dependencies[1], dependencies[2], dependencies[3], dependencies[4], dependencies[5], dependencies[6], dependencies[7]));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory.apply(null, assertDependencies(require("./velaProtocol"), require("./velaContextBridge"), require("./velaCapabilityContracts"), require("./velaProviderRequestBranchPolicy"), require("./velaProviderAdapter"), require("./velaLocalTransport"), require("./velaProviderIntentGate"), require("./velaLogicalPlanContracts"))));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, bridgeModule, capabilityContracts, requestBranchPolicy, adapterModule, transportModule, intentGateModule, logicalPlanContracts) {
    "use strict";
    var MODULE_REVISION = "vela-provider-controller-v2";
    var trustedControllers = new WeakSet();
    var controllerProtocols = new WeakMap();
    var controllerProposalPorts = new WeakMap();
    var OPACITY_PROPERTY_PATH = Object.freeze(["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0]);
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
        var providerContextPort;
        if (!protocolModule.isTrustedProtocol(protocol) || !bridgeModule.isTrustedContextBridgeForProtocol(bridge, protocol) || !transportModule.isTrustedLocalTransportForProtocol(transport, protocol) || !intentGateModule || typeof intentGateModule.evaluate !== "function" || !protocol.isPlainObject(options)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        protocol.assertNoUnknownKeys(options, ["protocol", "contextBridge", "transport", "runtime", "streaming"], "providerController.options");
        try { protocol.attachLogicalPlanContracts(logicalPlanContracts); } catch (logicalAttachError) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        if (!providerRuntime || typeof ownData(providerRuntime, "setTimeout") !== "function" || typeof ownData(providerRuntime, "clearTimeout") !== "function" || typeof ownData(providerRuntime, "createAbortController") !== "function" || typeof ownData(providerRuntime, "parseUrl") !== "function" || typeof ownData(providerRuntime, "nowMs") !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Provider runtime dependencies are unavailable.");
        }
        try { providerContextPort = bridgeModule.createProviderContextPort(bridge, protocol); }
        catch (error) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        if (!bridgeModule.isTrustedProviderContextPortForProtocol(providerContextPort, protocol) || typeof ownData(providerContextPort, "project") !== "function" || typeof ownData(providerContextPort, "unavailable") !== "function" || typeof ownData(bridge, "getDiagnostics") !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        var modelProjection;
        var requestPolicy;
        var requestPolicyProfiles;
        try {
            modelProjection = capabilityContracts.getModelProjection("set-opacity-v1");
            requestPolicy = requestBranchPolicy.createRequestBranchPolicy(modelProjection);
            requestPolicyProfiles = ownData(requestBranchPolicy, "PROFILES");
            if (!Object.isFrozen(modelProjection) || !Object.isFrozen(requestPolicy) || !Object.isFrozen(requestPolicyProfiles) || typeof ownData(requestPolicy, "classify") !== "function" || requestPolicyProfiles.PROPOSAL_CAPABLE_UNION !== "proposal-capable-union" || requestPolicyProfiles.BOUNDED_LOGICAL_PLAN_ELIGIBLE !== "bounded-logical-plan-eligible") { throw new Error(); }
        } catch (error) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        var state = "idle";
        var active = null;
        var activeProposal = null;
        var reviewingProposal = null;
        var diagnostics = Object.freeze({ moduleRevision: MODULE_REVISION, provisionalProfile: null, contextUnionEligible: false, finalProfile: null, responseSchemaName: null, parsedResponseType: null, intentAllowed: null, intentReason: null, lastTerminalRequestId: null, lastTerminalDisposition: null, lastTerminalFailureBoundary: null, lastTerminalErrorCode: null, lastContextOperation: null, lastContextDisposition: null, lastContextFailureStage: null, lastContextHostErrorCode: null, lastContextHostFailureStage: null, lastContextErrorCode: null, lastContextUnavailableReason: null });
        var generation = 1;
        var streamingEnabled = ownData(options, "streaming") === true;
        var streamListeners = [];
        var publicState = protocol.deepFreeze({ state: state, requestId: null, text: null, errorCode: null, intentReason: null, proposalCapabilityId: null, suggestedOpacity: null, providerId: "lmstudio", modelId: null, moduleRevision: MODULE_REVISION });
        function publish(nextState, requestId, text, errorCode, model, proposal, intentReason) {
            state = nextState;
            if (nextState !== "proposal-ready") { activeProposal = null; }
            publicState = protocol.deepFreeze({ state: nextState, requestId: requestId || null, text: text || null, errorCode: errorCode || null, intentReason: typeof intentReason === "string" ? intentReason : null,
                proposalCapabilityId: proposal ? proposal.capabilityId : null, suggestedOpacity: proposal ? proposal.opacity : null,
                providerId: "lmstudio", modelId: model || null, moduleRevision: MODULE_REVISION });
            return publicState;
        }
        function dispatchStreamEvent(event) {
            var snapshot = streamListeners.slice();
            snapshot.forEach(function (listener) { if (streamListeners.indexOf(listener) !== -1) { try { listener(event); } catch (ignored) {} } });
        }
        function subscribeStreamEvents(listener) {
            var activeSubscription = true;
            if (typeof listener !== "function") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED); }
            streamListeners.push(listener);
            function unsubscribe() { var index; if (!activeSubscription) { return false; } activeSubscription = false; index = streamListeners.indexOf(listener); if (index !== -1) { streamListeners.splice(index, 1); } return true; }
            return Object.freeze({ unsubscribe: unsubscribe, dispose: unsubscribe });
        }
        function summaryFromProjection(projection) {
            return "Trusted request context: active composition type " + projection.activeCompositionType + "; selected layers " + projection.selectedLayerCount + "; first selected layer type " + projection.firstSelectedLayerType + "; selected layer opacity " + (projection.selectedLayerOpacity.available ? String(projection.selectedLayerOpacity.value) : "unavailable") + ".";
        }
        function isUnionEligible(projection) {
            var opacity;
            if (!projection || typeof projection !== "object" || projection.activeCompositionType !== "CompItem" || projection.selectedLayerCount !== 1) { return false; }
            opacity = projection.selectedLayerOpacity;
            return !!opacity && opacity.available === true && typeof opacity.value === "number" && isFinite(opacity.value) && opacity.value >= 0 && opacity.value <= 100;
        }
        function schemaNameForProfile(profile) {
            if (profile === requestPolicyProfiles.TEXT_ONLY) { return null; }
            if (profile === requestPolicyProfiles.EXPLICIT_EDIT_ELIGIBLE) { return "vela_local_proposal_response"; }
            if (profile === requestPolicyProfiles.BOUNDED_LOGICAL_PLAN_ELIGIBLE) { return "vela_bounded_logical_plan_response"; }
            return "vela_bounded_union_response";
        }
        function updateDiagnostics(values) {
            diagnostics = Object.freeze({
                moduleRevision: MODULE_REVISION,
                provisionalProfile: values.provisionalProfile === undefined ? diagnostics.provisionalProfile : values.provisionalProfile,
                contextUnionEligible: values.contextUnionEligible === undefined ? diagnostics.contextUnionEligible : values.contextUnionEligible,
                finalProfile: values.finalProfile === undefined ? diagnostics.finalProfile : values.finalProfile,
                responseSchemaName: values.responseSchemaName === undefined ? diagnostics.responseSchemaName : values.responseSchemaName,
                parsedResponseType: values.parsedResponseType === undefined ? diagnostics.parsedResponseType : values.parsedResponseType,
                intentAllowed: values.intentAllowed === undefined ? diagnostics.intentAllowed : values.intentAllowed,
                intentReason: values.intentReason === undefined ? diagnostics.intentReason : values.intentReason,
                lastTerminalRequestId: values.lastTerminalRequestId === undefined ? diagnostics.lastTerminalRequestId : values.lastTerminalRequestId,
                lastTerminalDisposition: values.lastTerminalDisposition === undefined ? diagnostics.lastTerminalDisposition : values.lastTerminalDisposition,
                lastTerminalFailureBoundary: values.lastTerminalFailureBoundary === undefined ? diagnostics.lastTerminalFailureBoundary : values.lastTerminalFailureBoundary,
                lastTerminalErrorCode: values.lastTerminalErrorCode === undefined ? diagnostics.lastTerminalErrorCode : values.lastTerminalErrorCode,
                lastContextOperation: values.lastContextOperation === undefined ? diagnostics.lastContextOperation : values.lastContextOperation,
                lastContextDisposition: values.lastContextDisposition === undefined ? diagnostics.lastContextDisposition : values.lastContextDisposition,
                lastContextFailureStage: values.lastContextFailureStage === undefined ? diagnostics.lastContextFailureStage : values.lastContextFailureStage,
                lastContextHostErrorCode: values.lastContextHostErrorCode === undefined ? diagnostics.lastContextHostErrorCode : values.lastContextHostErrorCode,
                lastContextHostFailureStage: values.lastContextHostFailureStage === undefined ? diagnostics.lastContextHostFailureStage : values.lastContextHostFailureStage,
                lastContextErrorCode: values.lastContextErrorCode === undefined ? diagnostics.lastContextErrorCode : values.lastContextErrorCode,
                lastContextUnavailableReason: values.lastContextUnavailableReason === undefined ? diagnostics.lastContextUnavailableReason : values.lastContextUnavailableReason
            });
        }
        function syncContextDiagnostics() {
            var context = bridge.getDiagnostics();
            updateDiagnostics({ lastContextOperation: context.lastContextOperation, lastContextDisposition: context.lastContextDisposition, lastContextFailureStage: context.lastContextFailureStage, lastContextHostErrorCode: context.lastContextHostErrorCode, lastContextHostFailureStage: context.lastContextHostFailureStage, lastContextErrorCode: context.lastContextErrorCode, lastContextUnavailableReason: context.lastContextUnavailableReason });
        }
        function recordTerminal(requestId, disposition, failureBoundary, errorCode) {
            updateDiagnostics({ lastTerminalRequestId: requestId || null, lastTerminalDisposition: disposition, lastTerminalFailureBoundary: failureBoundary || null, lastTerminalErrorCode: errorCode || null });
        }
        function unavailableGrounding(capturedGeneration) {
            var contextId = "provider-context-unavailable-" + String(capturedGeneration);
            return {
                projection: providerContextPort.unavailable(),
                requestContext: {
                    contextId: contextId,
                    fingerprint: "sha256:" + protocol.sha256Hex(protocol.canonicalStringify({ available: false, requestGeneration: capturedGeneration })),
                    tier: 0
                }
            };
        }
        function mayContinueWithoutContext(error) {
            var code = ownData(error, "code");
            return code === protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE || code === protocol.ERROR_CODES.UNKNOWN_TARGET;
        }
        function selectionTarget(capture) {
            var snapshot = capture && ownData(capture, "snapshot");
            var selection = snapshot && ownData(snapshot, "selection");
            var first = Array.isArray(selection) && selection.length === 1 ? selection[0] : null;
            var layerId = first && ownData(first, "layerId");
            return typeof layerId === "string" ? { layerId: layerId, propertyPath: OPACITY_PROPERTY_PATH } : null;
        }
        function clearActiveCapture(capturedGeneration) {
            if (active && active.generation === capturedGeneration && active.captureHandle) { active.captureHandle = null; }
        }
        function cancelActiveCapture() {
            if (active && active.captureHandle) { bridge.cancelOwnedCapture(active.captureHandle); active.captureHandle = null; }
        }
        function validateInput(input) {
            var endpoint;
            protocol.assertSafeJson(input);
            if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider request input is invalid."); }
            protocol.assertNoUnknownKeys(input, ["message", "endpoint", "model"], "providerController.send");
            var message = protocol.assertNonEmptyString(input.message, "provider message", protocol.HARD_LIMITS.maxMessageBytes);
            if (!/\S/.test(message)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider messages must contain non-whitespace text."); }
            endpoint = normalizeEndpoint(input.endpoint);
            if (!endpoint) { protocol.fail(protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID); }
            return {
                message: message,
                endpoint: endpoint.chatUrl,
                model: protocol.assertNonEmptyString(input.model, "provider model", 256)
            };
        }
        function normalizeEndpoint(value) {
            var endpoint;
            var match;
            try { endpoint = protocol.assertNonEmptyString(value, "provider endpoint", protocol.HARD_LIMITS.maxStringBytes).replace(/^\s+|\s+$/g, ""); }
            catch (error) { return null; }
            match = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([1-9][0-9]{0,4})(?:\/|\/v1\/chat\/completions)?$/.exec(endpoint);
            if (!match || Number(match[2]) > 65535) { return null; }
            endpoint = "http://" + match[1] + ":" + match[2];
            return { baseUrl: endpoint, chatUrl: endpoint + "/v1/chat/completions", modelsUrl: endpoint + "/api/v1/models" };
        }
        function checkReadiness(input) {
            var endpoint;
            var model;
            var urls;
            var modelsUrl;
            var controller;
            var timer;
            try {
                protocol.assertSafeJson(input);
                if (!protocol.isPlainObject(input)) { throw new Error(); }
                protocol.assertNoUnknownKeys(input, ["endpoint", "model"], "providerController.readiness");
                endpoint = protocol.assertNonEmptyString(input.endpoint, "provider endpoint", protocol.HARD_LIMITS.maxStringBytes);
                model = protocol.assertNonEmptyString(input.model, "provider model", 256);
                urls = normalizeEndpoint(endpoint);
                if (!urls || typeof ownData(transport, "readJson") !== "function") { throw new Error(); }
                modelsUrl = urls.modelsUrl;
                controller = providerRuntime.createAbortController();
                if (!controller || !controller.signal || typeof controller.abort !== "function") { throw new Error(); }
            } catch (error) { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID); error.localReadinessCode = "endpoint-invalid"; return Promise.reject(error); }
            timer = providerRuntime.setTimeout(function () { controller.abort(); }, 5000);
            return transport.readJson({ url: modelsUrl, signal: controller.signal, maxResponseBytes: protocol.HARD_LIMITS.maxResponseJsonBytes }).then(function (response) {
                var parsed;
                var models;
                var selected = null;
                var loaded;
                var quantization;
                var config;
                var contextLength;
                var index;
                var loadedIndex;
                var error;
                if (response.status !== 200 || response.redirected || response.finalUrl !== modelsUrl) { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); error.localReadinessCode = "readiness-http-failed"; throw error; }
                if (!/^application\/json(?:\s*;|$)/i.test(response.contentType)) { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); error.localReadinessCode = "readiness-response-invalid"; throw error; }
                try { parsed = JSON.parse(response.bodyText); }
                catch (ignored) { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); error.localReadinessCode = "readiness-response-invalid"; throw error; }
                models = ownData(parsed, "models");
                if (!protocol.isPlainObject(parsed) || !Array.isArray(models)) { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); error.localReadinessCode = "readiness-response-invalid"; throw error; }
                for (index = 0; index < models.length; index += 1) {
                    if (!protocol.isPlainObject(models[index]) || typeof ownData(models[index], "type") !== "string" || typeof ownData(models[index], "key") !== "string" || !Array.isArray(ownData(models[index], "loaded_instances"))) { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); error.localReadinessCode = "readiness-response-invalid"; throw error; }
                    if (ownData(models[index], "type") !== "llm") { continue; }
                    loaded = ownData(models[index], "loaded_instances");
                    for (loadedIndex = 0; loadedIndex < loaded.length; loadedIndex += 1) { if (!protocol.isPlainObject(loaded[loadedIndex]) || typeof ownData(loaded[loadedIndex], "id") !== "string") { error = new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); error.localReadinessCode = "readiness-response-invalid"; throw error; } }
                    if (ownData(models[index], "key") === model) { selected = models[index]; break; }
                    for (loadedIndex = 0; loadedIndex < loaded.length; loadedIndex += 1) { if (ownData(loaded[loadedIndex], "id") === model) { selected = models[index]; break; } }
                    if (selected) { break; }
                }
                loaded = selected && ownData(selected, "loaded_instances");
                if (!selected) { return protocol.deepFreeze({ ready: false, code: "configured-model-not-found", modelId: model, loadedInstances: 0, quantization: null, contextLength: null, baseUrl: urls.baseUrl, chatUrl: urls.chatUrl, moduleRevision: MODULE_REVISION }); }
                if (loaded.length < 1) { return protocol.deepFreeze({ ready: false, code: "configured-model-not-loaded", modelId: model, loadedInstances: 0, quantization: null, contextLength: null, baseUrl: urls.baseUrl, chatUrl: urls.chatUrl, moduleRevision: MODULE_REVISION }); }
                quantization = ownData(ownData(selected, "quantization"), "name");
                config = ownData(loaded[0], "config");
                contextLength = ownData(config, "context_length");
                return protocol.deepFreeze({ ready: true, code: "experimental-ready", modelId: model, loadedInstances: loaded.length, quantization: typeof quantization === "string" ? quantization : null, contextLength: Number.isInteger(contextLength) && contextLength > 0 ? contextLength : null, baseUrl: urls.baseUrl, chatUrl: urls.chatUrl, moduleRevision: MODULE_REVISION });
            }).then(function (result) { providerRuntime.clearTimeout(timer); return result; }, function (error) { providerRuntime.clearTimeout(timer); if (!error.localReadinessCode) { error.localReadinessCode = error.code === protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED ? "readiness-network-failed" : "readiness-response-invalid"; } throw error; });
        }
        function send(input) {
            var values;
            var capturedGeneration;
            var requestProfile;
            var provisionalProfile;
            if (state === "pending" || reviewingProposal) { return Promise.reject(new protocol.VelaProtocolError(protocol.ERROR_CODES.PROVIDER_REQUEST_IN_FLIGHT)); }
            try { values = validateInput(input); }
            catch (error) { publish("failed", null, null, safeCode(protocol, error), null); return Promise.reject(error); }
            try { provisionalProfile = requestPolicy.classify(values.message); }
            catch (error) { publish("failed", null, null, safeCode(protocol, error), values.model); return Promise.reject(error); }
            requestProfile = provisionalProfile;
            diagnostics = Object.freeze({ moduleRevision: MODULE_REVISION, provisionalProfile: provisionalProfile, contextUnionEligible: false, finalProfile: null, responseSchemaName: null, parsedResponseType: null, intentAllowed: null, intentReason: null, lastTerminalRequestId: diagnostics.lastTerminalRequestId, lastTerminalDisposition: diagnostics.lastTerminalDisposition, lastTerminalFailureBoundary: diagnostics.lastTerminalFailureBoundary, lastTerminalErrorCode: diagnostics.lastTerminalErrorCode, lastContextOperation: diagnostics.lastContextOperation, lastContextDisposition: diagnostics.lastContextDisposition, lastContextFailureStage: diagnostics.lastContextFailureStage, lastContextHostErrorCode: diagnostics.lastContextHostErrorCode, lastContextHostFailureStage: diagnostics.lastContextHostFailureStage, lastContextErrorCode: diagnostics.lastContextErrorCode, lastContextUnavailableReason: diagnostics.lastContextUnavailableReason });
            capturedGeneration = generation + 1;
            generation = capturedGeneration;
            publish("pending", null, null, null, values.model);
            var bindingStart = bridge.beginOwnedCapture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
            active = { generation: capturedGeneration, requestId: null, provider: null, captureHandle: bindingStart.handle, requestProfile: requestProfile };
            return bindingStart.promise.then(function (capture) {
                var provider;
                var started;
                var target;
                var valueStart;
                if (capturedGeneration !== generation || state !== "pending") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                clearActiveCapture(capturedGeneration);
                target = selectionTarget(capture);
                if (!target) { return { projection: providerContextPort.project(capture, null), requestContext: { contextId: capture.contextId, fingerprint: capture.fingerprint, tier: 1 } }; }
                valueStart = bridge.beginOwnedPropertyValueCapture(capture, [target]);
                if (!active || active.generation !== capturedGeneration) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                active.captureHandle = valueStart.handle;
                return valueStart.promise.then(function (valueCapture) {
                    if (capturedGeneration !== generation || state !== "pending") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                    clearActiveCapture(capturedGeneration);
                    return { projection: providerContextPort.project(capture, valueCapture), requestContext: { contextId: capture.contextId, fingerprint: capture.fingerprint, tier: 1 } };
                }, function (error) {
                    if (capturedGeneration !== generation || state !== "pending") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                    clearActiveCapture(capturedGeneration);
                    if (!mayContinueWithoutContext(error)) { throw error; }
                    return unavailableGrounding(capturedGeneration);
                });
            }, function (error) {
                if (capturedGeneration !== generation || state !== "pending") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                clearActiveCapture(capturedGeneration);
                if (!mayContinueWithoutContext(error)) { throw error; }
                return unavailableGrounding(capturedGeneration);
            }).then(function (grounded) {
                var provider;
                var started;
                var contextUnionEligible;
                if (!active || active.generation !== capturedGeneration || capturedGeneration !== generation || state !== "pending") { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                syncContextDiagnostics();
                contextUnionEligible = isUnionEligible(grounded.projection);
                if (provisionalProfile === requestPolicyProfiles.TEXT_ONLY) { requestProfile = requestPolicyProfiles.TEXT_ONLY; }
                updateDiagnostics({ contextUnionEligible: contextUnionEligible, finalProfile: requestProfile, responseSchemaName: schemaNameForProfile(requestProfile) });
                provider = adapterModule.createLocalOpenAICompatibleProvider({ protocol: protocol, transport: transport, runtime: providerRuntime, endpoint: values.endpoint, model: values.model, requestProfile: requestProfile, streaming: streamingEnabled, onStreamEvent: streamingEnabled ? dispatchStreamEvent : null });
                started = provider.start({ messages: [{ role: "assistant", content: summaryFromProjection(grounded.projection) }, { role: "user", content: values.message }], context: grounded.requestContext });
                active = { generation: capturedGeneration, requestId: started.requestId, provider: provider, captureHandle: null, requestProfile: requestProfile };
                publish("pending", started.requestId, null, null, values.model);
                return started.promise;
            }).then(function (response) {
                var envelope;
                var adapterDiagnostics;
                var responseText;
                if (!active || active.generation !== capturedGeneration || capturedGeneration !== generation || state !== "pending") { return publicState; }
                adapterDiagnostics = active.provider && active.provider.getDiagnostics();
                active = null;
                envelope = response && ownData(response, "envelope");
                if (!envelope || (envelope.type !== "text" && envelope.type !== "error" && envelope.type !== "localProposal" && envelope.type !== "logicalPlanProposal")) { recordTerminal(publicState.requestId, "failed", "controller-commit", protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); return publish("failed", publicState.requestId, null, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, values.model); }
                updateDiagnostics({ parsedResponseType: envelope.type });
                if (envelope.type === "error") { var terminalCode = safeCode(protocol, ownData(envelope, "error")); recordTerminal(publicState.requestId, "failed", adapterDiagnostics && adapterDiagnostics.terminalFailureBoundary, terminalCode); return publish("failed", publicState.requestId, null, terminalCode, values.model); }
                if (envelope.type === "localProposal") {
                    var proposal = ownData(envelope, "proposal");
                    var capabilityId = ownData(proposal, "capabilityId");
                    var params = ownData(proposal, "params");
                    var opacity = ownData(params, "opacity");
                    var intent = intentGateModule.evaluate({ message: values.message, capabilityId: capabilityId, params: params, proposedOpacity: opacity });
                    updateDiagnostics({ intentAllowed: !!(intent && intent.allowed === true), intentReason: intent && typeof intent.reason === "string" ? intent.reason : null });
                    if (!intent || intent.allowed !== true) {
                        activeProposal = null;
                        recordTerminal(publicState.requestId, "completed", null, null);
                        return publish("intent-rejected", publicState.requestId, null, null, values.model, null, intent.reason);
                    }
                    activeProposal = protocol.deepFreeze({ requestId: publicState.requestId, generation: capturedGeneration, capabilityId: capabilityId, params: params, opacity: opacity });
                    recordTerminal(publicState.requestId, "completed", null, null);
                    return publish("proposal-ready", publicState.requestId, null, null, values.model, { capabilityId: capabilityId, opacity: opacity });
                }
                if (envelope.type === "logicalPlanProposal") {
                    var validatedLogicalPlan;
                    var logicalIntent;
                    try { validatedLogicalPlan = logicalPlanContracts.validateLogicalPlanProposal(envelope); }
                    catch (logicalError) { recordTerminal(publicState.requestId, "failed", "logical-plan-validation", protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); return publish("failed", publicState.requestId, null, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, values.model); }
                    logicalIntent = intentGateModule.evaluateLogicalPlan({ message: values.message, logicalPlanProposal: validatedLogicalPlan });
                    updateDiagnostics({ intentAllowed: !!(logicalIntent && logicalIntent.allowed === true), intentReason: logicalIntent && typeof logicalIntent.reason === "string" ? logicalIntent.reason : null });
                    if (!logicalIntent || logicalIntent.allowed !== true) { recordTerminal(publicState.requestId, "completed", null, null); publish("intent-rejected", publicState.requestId, null, null, values.model, null, logicalIntent && logicalIntent.reason); return publicState; }
                    recordTerminal(publicState.requestId, "completed", null, null);
                    publish("completed", publicState.requestId, null, null, values.model);
                    return Object.freeze({ state: "logical-plan-ready", logicalPlanProposal: validatedLogicalPlan });
                }
                responseText = protocol.assertString(ownData(envelope, "text"), "provider text", protocol.HARD_LIMITS.maxMessageBytes);
                recordTerminal(publicState.requestId, "completed", null, null);
                return publish("completed", publicState.requestId, responseText, null, values.model);
            }, function (error) {
                if (capturedGeneration !== generation || state !== "pending") { return publicState; }
                syncContextDiagnostics();
                recordTerminal(publicState.requestId, "failed", active && active.provider ? "controller-correlation" : "context-capture", safeCode(protocol, error));
                active = null;
                return publish("failed", publicState.requestId, null, safeCode(protocol, error), values.model);
            });
        }
        function cancel(input) {
            var requestId;
            if (!protocol.isPlainObject(input)) { return false; }
            try {
                protocol.assertNoUnknownKeys(input, ["requestId"], "providerController.cancel");
                requestId = ownData(input, "requestId");
                if (requestId !== null) { requestId = protocol.assertNonEmptyString(requestId, "provider requestId", 256); }
            }
            catch (error) { return false; }
            if (!active || state !== "pending" || active.requestId !== requestId) { return false; }
            generation += 1;
            cancelActiveCapture();
            if (active.provider) { active.provider.cancel(requestId); }
            active = null;
            recordTerminal(requestId, "cancelled", null, protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED);
            publish("cancelled", requestId, null, protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED, publicState.modelId);
            return true;
        }
        function invalidate(nextState) {
            generation += 1;
            cancelActiveCapture();
            if (active && active.provider) { try { active.provider.cancel(active.requestId); } catch (ignored) {} }
            active = null;
            activeProposal = null;
            reviewingProposal = null;
            return publish(nextState || "idle", null, null, nextState === "failed" ? protocol.ERROR_CODES.LIFECYCLE_BLOCKED : null, null);
        }
        var proposalPort = Object.freeze({
            beginReview: function () {
                var proposal;
                if (state !== "proposal-ready" || !activeProposal) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "No local proposal is available."); }
                proposal = activeProposal;
                activeProposal = null;
                reviewingProposal = proposal;
                publish("proposal-reviewing", proposal.requestId, null, null, publicState.modelId);
                return proposal;
            },
            finalizeReview: function (input) {
                var proposal = reviewingProposal;
                var outcome;
                var errorCode;
                var handled;
                if (!protocol.isPlainObject(input)) { return false; }
                try {
                    protocol.assertNoUnknownKeys(input, ["requestId", "generation", "outcome", "errorCode", "handled"], "providerProposal.finalizeReview");
                    if (!proposal || ownData(input, "requestId") !== proposal.requestId || ownData(input, "generation") !== proposal.generation) { return false; }
                    outcome = ownData(input, "outcome");
                    errorCode = ownData(input, "errorCode");
                    handled = ownData(input, "handled") === true;
                    if (outcome !== "completed" && outcome !== "failed") { return false; }
                    if (outcome === "failed" && (typeof errorCode !== "string" || safeCode(protocol, { code: errorCode }) !== errorCode)) { return false; }
                    if (outcome === "failed" && handled) { return false; }
                } catch (error) { return false; }
                reviewingProposal = null;
                publish(outcome === "completed" && handled ? "local-proposal-handled" : "idle", proposal.requestId, null, outcome === "failed" ? errorCode : null, publicState.modelId);
                return true;
            }
        });
        var controller = Object.freeze({ send: send, cancel: cancel, invalidate: invalidate, checkReadiness: checkReadiness, subscribeStreamEvents: subscribeStreamEvents, getUiState: function () { return publicState; }, getDiagnostics: function () { return diagnostics; } });
        trustedControllers.add(controller);
        controllerProtocols.set(controller, protocol);
        controllerProposalPorts.set(controller, proposalPort);
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
    return Object.freeze({ createProviderController: createProviderController, isTrustedProviderControllerForProtocol: isTrustedProviderControllerForProtocol, createProposalPort: createProposalPort });
}));
