(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaRuntime";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertDependencies(protocol, parser, capabilityContracts, providerAdapter, localTransport, context, validator, plan, guard, bridge, preflight, executionAdapter, controller, providerController, proposalRouter, planningContracts, materializer, taskRun, planReviewProjection, planController, confirmedAuthorityComposer, reviewRuntimePort) {
        if (!protocol || !parser || !capabilityContracts || !providerAdapter || !localTransport || !context || !validator || !plan || !guard || !bridge || !preflight || !executionAdapter || !providerController || !proposalRouter || !planningContracts || !materializer || !taskRun || !planReviewProjection || !planController || !confirmedAuthorityComposer || !reviewRuntimePort ||
            typeof protocol.createProtocol !== "function" || typeof context.createContextApi !== "function" ||
            typeof capabilityContracts.getLocalProjection !== "function" || typeof capabilityContracts.resolveRegisteredAction !== "function" || typeof capabilityContracts.listCapabilityIds !== "function" ||
            typeof validator.createActionValidator !== "function" || typeof plan.createPlanStore !== "function" ||
            typeof bridge.createContextBridge !== "function" || typeof bridge.createExecutionPort !== "function" || typeof bridge.createReviewPort !== "function" || typeof preflight.createExecutionPreflight !== "function" || typeof executionAdapter.createExecutionAdapter !== "function" ||
            !controller || typeof controller.createController !== "function" || typeof controller.isTrustedControllerForProtocol !== "function" || typeof proposalRouter.createProposalRouter !== "function" ||
            typeof parser.createResponseParser !== "function" || typeof providerAdapter.createLocalOpenAICompatibleProvider !== "function" || typeof localTransport.createLocalTransport !== "function" || typeof providerController.createProviderController !== "function" ||
            typeof planningContracts.createAuthorizedPlan !== "function" || typeof materializer.createAuthorizedPlanMaterializer !== "function" || typeof taskRun.createTaskRun !== "function" || typeof planReviewProjection.createPlanReviewProjection !== "function" || typeof planController.createPlanController !== "function" || typeof confirmedAuthorityComposer.createConfirmedAuthorityComposer !== "function" || typeof confirmedAuthorityComposer.createReviewedSemantics !== "function" || typeof confirmedAuthorityComposer.createReviewedPolicySemantics !== "function" || typeof confirmedAuthorityComposer.sameReviewedSemantics !== "function" || typeof reviewRuntimePort.createReviewRuntimePort !== "function" || typeof reviewRuntimePort.createObjectiveReviewRuntimePort !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE");
        }
        return { protocol: protocol, parser: parser, capabilityContracts: capabilityContracts, providerAdapter: providerAdapter, localTransport: localTransport, context: context, validator: validator, plan: plan, guard: guard, bridge: bridge, preflight: preflight, executionAdapter: executionAdapter, controller: controller, providerController: providerController, proposalRouter: proposalRouter, planningContracts: planningContracts, materializer: materializer, taskRun: taskRun, planReviewProjection: planReviewProjection, planController: planController, confirmedAuthorityComposer: confirmedAuthorityComposer, reviewRuntimePort: reviewRuntimePort };
    }
    function trustedBrowserModule(target, name) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(target, name); }
        catch (error) { return null; }
        return descriptor && !descriptor.get && !descriptor.set && Object.prototype.hasOwnProperty.call(descriptor, "value") && descriptor.writable === false && descriptor.configurable === false && Object.isFrozen(descriptor.value) ? descriptor.value : null;
    }
    function trustedBrowserActivationPolicy(target) {
        var descriptor;
        var module;
        var policy;
        try { descriptor = Object.getOwnPropertyDescriptor(target, "VelaActivationPolicy"); }
        catch (error) { return null; }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.writable || descriptor.configurable) { return null; }
        module = descriptor.value;
        policy = module && typeof module.getPolicy === "function" ? module.getPolicy() : null;
        return module && typeof module.isTrustedPolicy === "function" && module.isTrustedPolicy(policy) ? module : null;
    }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var dependencies;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED"); }
        dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaResponseParser"), bootstrap.getModule("VelaCapabilityContracts"), bootstrap.getModule("VelaProviderAdapter"), bootstrap.getModule("VelaLocalTransport"), bootstrap.getModule("VelaContext"), bootstrap.getModule("VelaValidator"), bootstrap.getModule("VelaPlan"), bootstrap.getModule("VelaExecutionGuard"), bootstrap.getModule("VelaContextBridge"), bootstrap.getModule("VelaExecutionPreflight"), bootstrap.getModule("VelaExecutionAdapter"), bootstrap.getModule("VelaController"), bootstrap.getModule("VelaProviderController"), bootstrap.getModule("VelaProviderProposalRouter"), trustedBrowserModule(target, "VelaPlanningContracts"), trustedBrowserModule(target, "VelaAuthorizedPlanMaterializer"), trustedBrowserModule(target, "VelaTaskRun"), trustedBrowserModule(target, "VelaPlanReviewProjection"), trustedBrowserModule(target, "VelaPlanController"), trustedBrowserModule(target, "VelaConfirmedAuthorityComposer"), trustedBrowserModule(target, "VelaReviewRuntimePort"));
        var activationPolicy = trustedBrowserActivationPolicy(target);
        if (!activationPolicy) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        exported = Object.freeze(create(dependencies.protocol, dependencies.parser, dependencies.capabilityContracts, dependencies.providerAdapter, dependencies.localTransport, dependencies.context, dependencies.validator, dependencies.plan, dependencies.guard, dependencies.bridge, dependencies.preflight, dependencies.executionAdapter, dependencies.controller, dependencies.providerController, dependencies.proposalRouter, dependencies.planningContracts, dependencies.materializer, dependencies.taskRun, dependencies.planReviewProjection, dependencies.planController, dependencies.confirmedAuthorityComposer, dependencies.reviewRuntimePort, activationPolicy, trustedBrowserModule(target, "VelaSessionRuntime"), trustedBrowserModule(target, "VelaCapabilityCompiler"), trustedBrowserModule(target, "VelaDelegationGrantStore"), trustedBrowserModule(target, "VelaDelegationPolicyEngine"), trustedBrowserModule(target, "VelaAuthorityEvidenceResolver"), trustedBrowserModule(target, "VelaDelegationAuthorityCoordinator"), trustedBrowserModule(target, "VelaAuthorizedPlanAuthorityProducer"), trustedBrowserModule(target, "VelaAuthorityActivationGate"), trustedBrowserModule(target, "VelaAtomicActivationCoordinator")));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaResponseParser"), require("./velaCapabilityContracts"), require("./velaProviderAdapter"), require("./velaLocalTransport"), require("./velaContext"), require("./velaValidator"), require("./velaPlan"), require("./velaExecutionGuard"), require("./velaContextBridge"), require("./velaExecutionPreflight"), require("./velaExecutionAdapter"), require("./velaController"), require("./velaProviderController"), require("./velaProviderProposalRouter"), require("./velaPlanningContracts"), require("./velaAuthorizedPlanMaterializer"), require("./velaTaskRun"), require("./velaPlanReviewProjection"), require("./velaPlanController"), require("./velaConfirmedAuthorityComposer"), require("./velaReviewRuntimePort"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.parser, dependencies.capabilityContracts, dependencies.providerAdapter, dependencies.localTransport, dependencies.context, dependencies.validator, dependencies.plan, dependencies.guard, dependencies.bridge, dependencies.preflight, dependencies.executionAdapter, dependencies.controller, dependencies.providerController, dependencies.proposalRouter, dependencies.planningContracts, dependencies.materializer, dependencies.taskRun, dependencies.planReviewProjection, dependencies.planController, dependencies.confirmedAuthorityComposer, dependencies.reviewRuntimePort, require("./velaActivationPolicy").VelaActivationPolicy, require("./velaSessionRuntime"), require("./velaCapabilityCompiler"), require("./velaDelegationGrantStore"), require("./velaDelegationPolicyEngine"), require("./velaAuthorityEvidenceResolver"), require("./velaDelegationAuthorityCoordinator"), require("./velaAuthorizedPlanAuthorityProducer"), require("./velaAuthorityActivationGate"), require("./velaAtomicActivationCoordinator")));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, parserModule, capabilityContracts, providerAdapterModule, localTransportModule, contextModule, validatorModule, planModule, guardModule, bridgeModule, preflightModule, executionAdapterModule, controllerModule, providerControllerModule, proposalRouterModule, planningContracts, materializerModule, taskRunModule, planReviewProjectionModule, planControllerModule, confirmedAuthorityComposerModule, reviewRuntimePortModule, activationPolicyModule, sessionRuntimeModule, compilerModule, grantStoreModule, policyEngineModule, evidenceResolverModule, authorityCoordinatorModule, authorityProducerModule, activationGateModule, atomicCoordinatorModule) {
    "use strict";

    var MODULE_REVISION = "vela-runtime-v1";
    var HOST_ADAPTER_REVISION = "vela-context-host-v4";
    var hasOwn = Object.prototype.hasOwnProperty;
    var stableErrorCodes = Object.keys(protocolModule.ERROR_CODES).map(function (key) { return protocolModule.ERROR_CODES[key]; });

    function runtimeCapabilityError() { var error = new Error("RUNTIME_CAPABILITY_UNAVAILABLE"); error.code = "RUNTIME_CAPABILITY_UNAVAILABLE"; return error; }
    function ownData(value, key) {
        var descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || descriptor.get || descriptor.set || !hasOwn.call(descriptor, "value")) { return undefined; }
        return descriptor.value;
    }
    function stableErrorCode(error) {
        var descriptor;
        try { descriptor = error && (typeof error === "object" || typeof error === "function") ? Object.getOwnPropertyDescriptor(error, "code") : null; }
        catch (ignored) { return "RUNTIME_CAPABILITY_UNAVAILABLE"; }
        if (!descriptor || descriptor.get || descriptor.set || !hasOwn.call(descriptor, "value") || typeof descriptor.value !== "string" || stableErrorCodes.indexOf(descriptor.value) === -1) {
            return "RUNTIME_CAPABILITY_UNAVAILABLE";
        }
        return descriptor.value;
    }
    function deriveRegisteredActionParamsSchema(capability) {
        var parameters = capability && capability.parameters;
        var opacity = parameters && parameters.properties && parameters.properties.opacity;
        if (!parameters || parameters.type !== "object" || parameters.additionalProperties !== false || !Array.isArray(parameters.required) || parameters.required.length !== 1 || parameters.required[0] !== "opacity" || !opacity || opacity.type !== "number" || typeof opacity.minimum !== "number" || typeof opacity.maximum !== "number") { throw runtimeCapabilityError(); }
        return Object.freeze({ type: "object", additionalProperties: false, required: Object.freeze(["opacity"]), properties: Object.freeze({ opacity: Object.freeze({ type: "number", minimum: opacity.minimum, maximum: opacity.maximum }) }) });
    }
    function validateRegisteredActionMappings(contracts, actionValidator) {
        var mappings = [];
        if (!contracts || typeof contracts.listCapabilityIds !== "function" || typeof contracts.resolveRegisteredAction !== "function" || !actionValidator || typeof actionValidator.getTool !== "function" || typeof actionValidator.getAction !== "function") { throw runtimeCapabilityError(); }
        contracts.listCapabilityIds().forEach(function (capabilityId) {
            var identity = contracts.resolveRegisteredAction(capabilityId);
            var tool;
            if (!identity) { return; }
            tool = actionValidator.getTool(identity.toolId);
            if (!tool || !actionValidator.getAction(tool, identity.actionId)) { throw runtimeCapabilityError(); }
            mappings.push(Object.freeze({ capabilityId: capabilityId, registeredAction: identity }));
        });
        return Object.freeze(mappings);
    }
    function utf8ByteLength(value) {
        var index;
        var code;
        var total = 0;
        for (index = 0; index < value.length; index += 1) {
            code = value.charCodeAt(index);
            if (code < 0x80) { total += 1; }
            else if (code < 0x800) { total += 2; }
            else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xDC00 && value.charCodeAt(index + 1) <= 0xDFFF) { total += 4; index += 1; }
            else { total += 3; }
        }
        return total;
    }
    function sha256Hex(value) {
        var bytes = [];
        var index;
        var code;
        var bitLength;
        var words = [];
        var hash = [1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225];
        var constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        function rightRotate(number, amount) { return (number >>> amount) | (number << (32 - amount)); }
        for (index = 0; index < value.length; index += 1) {
            code = value.charCodeAt(index);
            if (code < 0x80) { bytes.push(code); }
            else if (code < 0x800) { bytes.push(0xC0 | (code >>> 6), 0x80 | (code & 0x3F)); }
            else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xDC00 && value.charCodeAt(index + 1) <= 0xDFFF) { code = 0x10000 + ((code - 0xD800) << 10) + (value.charCodeAt(index + 1) - 0xDC00); bytes.push(0xF0 | (code >>> 18), 0x80 | ((code >>> 12) & 0x3F), 0x80 | ((code >>> 6) & 0x3F), 0x80 | (code & 0x3F)); index += 1; }
            else { bytes.push(0xE0 | (code >>> 12), 0x80 | ((code >>> 6) & 0x3F), 0x80 | (code & 0x3F)); }
        }
        bitLength = bytes.length * 8;
        bytes.push(0x80);
        while ((bytes.length % 64) !== 56) { bytes.push(0); }
        for (index = 7; index >= 0; index -= 1) { bytes.push((bitLength / Math.pow(2, index * 8)) & 0xFF); }
        for (index = 0; index < bytes.length; index += 64) {
            var work = [];
            var i;
            var a;
            var b;
            var c;
            var d;
            var e;
            var f;
            var g;
            var h;
            var t1;
            var t2;
            for (i = 0; i < 16; i += 1) { work[i] = (bytes[index + i * 4] << 24) | (bytes[index + i * 4 + 1] << 16) | (bytes[index + i * 4 + 2] << 8) | bytes[index + i * 4 + 3]; }
            for (i = 16; i < 64; i += 1) { work[i] = (rightRotate(work[i - 2], 17) ^ rightRotate(work[i - 2], 19) ^ (work[i - 2] >>> 10)) + work[i - 7] + (rightRotate(work[i - 15], 7) ^ rightRotate(work[i - 15], 18) ^ (work[i - 15] >>> 3)) + work[i - 16]; }
            a = hash[0]; b = hash[1]; c = hash[2]; d = hash[3]; e = hash[4]; f = hash[5]; g = hash[6]; h = hash[7];
            for (i = 0; i < 64; i += 1) { t1 = h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + constants[i] + work[i]; t2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c)); h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
            hash[0] = (hash[0] + a) | 0; hash[1] = (hash[1] + b) | 0; hash[2] = (hash[2] + c) | 0; hash[3] = (hash[3] + d) | 0; hash[4] = (hash[4] + e) | 0; hash[5] = (hash[5] + f) | 0; hash[6] = (hash[6] + g) | 0; hash[7] = (hash[7] + h) | 0;
        }
        return hash.map(function (item) { return (item >>> 0).toString(16).replace(/^(.{0,7})$/, "0000000$1").slice(-8); }).join("");
    }
    function createSessionProtocolClock(source) {
        var origin = null;
        var lastTimestamp = 0;
        var maxTimestamp = protocolModule.HARD_LIMITS.maxNumberAbs;

        function readSource() {
            var value = source();
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
                throw new Error("clock unavailable");
            }
            return value;
        }
        function reset() {
            origin = readSource();
            lastTimestamp = 0;
        }
        function now() {
            var elapsed = readSource() - origin;
            var timestamp = elapsed > 0 ? Math.floor(elapsed / 1000) : 0;
            if (!Number.isFinite(timestamp) || timestamp > maxTimestamp) {
                throw new Error("protocol clock exhausted");
            }
            if (timestamp < lastTimestamp) { return lastTimestamp; }
            lastTimestamp = timestamp;
            return timestamp;
        }

        reset();
        return Object.freeze({ now: now, reset: reset });
    }
    function createRuntime(options) {
        var invokeHost = options && ownData(options, "invokeHost");
        var environment = options && ownData(options, "environment");
        var exactAgentSession = options && ownData(options, "exactAgentSession");
        var activationPolicy = activationPolicyModule && typeof activationPolicyModule.getPolicy === "function" ? activationPolicyModule.getPolicy() : null;
        var root = typeof self !== "undefined" ? self : (typeof globalThis !== "undefined" ? globalThis : null);
        var state = "new";
        var initPromise = null;
        var initialized = false;
        var suspended = false;
        var disposed = false;
        var epoch = 1;
        var lastErrorCode = null;
        var protocol = null;
        var contextApi = null;
        var validator = null;
        var planStore = null;
        var bridge = null;
        var observationReadPort = null;
        var opacityVerificationPort = null;
        var reviewPort = null;
        var preflight = null;
        var executionAdapter = null;
        var controller = null;
        var providerController = null;
        var providerProposalRouter = null;
        var authorizedPlanMaterializer = null;
        var planReviewProjection = null;
        var planController = null;
        var confirmedAuthorityComposer = null;
        var reviewRuntimePort = null;
        var objectiveReviewRuntimePort = null;
        var protocolClock = null;
        var taskRunSerial = 0;
        var reviewTokenSerial = 0;
        var authorityIdSerial = 0;
        var authorityPlane = null;
        var agentDriverRuntimePort = null;
        var agentDriverProposal = null;
        var agentReasoningGeneration = 0;
        var activeAgentReasoning = null;
        var reviewBarrierGeneration = 0;
        var reviewBarriers = new Map();
        var activeProductionContinuation = null;
        var authorityState = "inactive";
        var authorityErrorCode = null;
        var activePilot = null;
        var lastPilot = null;
        var authorityRemainingActions = null;
        var authorityRouting = false;
        var latestAuthorityDecision = null;
        var latestAuthorityExecution = null;
        var latestAuthorityParamTrace = null;
        var latestAuthorityFailure = null;
        var activeDelegatedTask = null;
        var runtime = environment || {};
        function authorityProjection() {
            var remaining = authorityRemainingActions;
            var projectedPilot;
            if (authorityPlane && activePilot) {
                try {
                    var view = authorityPlane.grantStore.lookup(activePilot.grantId);
                    remaining = view.remainingActions;
                    authorityRemainingActions = remaining;
                    if (view.status !== "active" || remaining === 0) { authorityState = remaining === 0 ? "consumed" : view.status; activePilot = null; }
                } catch (error) {
                    if (authorityState === "active") { authorityState = "expired"; }
                    authorityRemainingActions = 0;
                    activePilot = null;
                }
            }
            projectedPilot = activePilot || lastPilot;
            return Object.freeze({ state: authorityState, active: authorityState === "active" || authorityState === "executing", remainingActions: remaining, capabilityId: projectedPilot ? "set-opacity-v1" : null, expiresAt: projectedPilot ? projectedPilot.expiresAt : null, taskId: projectedPilot ? projectedPilot.taskId : null, errorCode: authorityErrorCode });
        }
        function authorityDiagnostics() {
            if (!(root && root.AETOOLBOX_DEBUG_REGISTRY === true)) { return null; }
            return Object.freeze({ lifecycleState: authorityPlane ? (disposed ? "disposed" : suspended ? "suspended" : initialized ? "ready" : "created") : "unavailable", canonicalComposition: Boolean(authorityPlane), sessionId: authorityPlane ? exactAgentSession.getSessionId() : null, projection: authorityProjection(), latestDecision: latestAuthorityDecision, latestExecution: latestAuthorityExecution, latestParamTrace: latestAuthorityParamTrace, latestFailure: latestAuthorityFailure, moduleRevisions: authorityPlane ? Object.freeze({ compiler: compilerModule.MODULE_REVISION, grantStore: grantStoreModule.MODULE_REVISION, policyEngine: policyEngineModule.MODULE_REVISION, evidenceResolver: evidenceResolverModule.MODULE_REVISION, coordinator: authorityCoordinatorModule.MODULE_REVISION, producer: authorityProducerModule.MODULE_REVISION, activationGate: activationGateModule.MODULE_REVISION, atomicCoordinator: atomicCoordinatorModule.MODULE_REVISION }) : null });
        }
        function makeAuthorityId(kind) { authorityIdSerial += 1; return kind + "_" + authorityIdSerial; }
        function invalidateReviewBarriers() { reviewBarrierGeneration += 1; reviewBarriers.clear(); return true; }
        function invalidateProductionVerification(record) {
            var planId = record && record.verificationPlanId;
            if (!planId || !preflight) { return false; }
            record.verificationPlanId = null;
            try { return preflight.invalidateCommittedVerification({ planId: planId }); }
            catch (ignored) { return false; }
        }
        function closeProductionContinuation(record) {
            if (!record) { return false; }
            invalidateProductionVerification(record);
            record.phase = "terminal";
            if (activeProductionContinuation === record) { activeProductionContinuation = null; }
            return true;
        }
        function invalidateProductionContinuation() {
            var record = activeProductionContinuation;
            if (record) { closeProductionContinuation(record); }
            if (preflight) { try { preflight.invalidateAllCommittedVerifications(); } catch (ignored) {} }
            return Boolean(record);
        }
        function ownCommittedVerification(association) {
            var record = activeProductionContinuation;
            if (!record || record.phase !== "executing" || record.generation !== reviewBarrierGeneration || disposed || state !== "ready" || !association || typeof association.planId !== "string" || association.planId.length === 0 || record.verificationPlanId !== null) { throw safeError("LIFECYCLE_BLOCKED"); }
            record.verificationPlanId = association.planId;
        }
        function verifyCommittedAction(input) {
            var record = activeProductionContinuation;
            var planId;
            if (!input || typeof input.objectiveId !== "string" || typeof input.taskId !== "string" || typeof input.expectedOpacity !== "number" || !isFinite(input.expectedOpacity) || !record || record.phase !== "awaiting-verification" || record.generation !== reviewBarrierGeneration || input.objectiveId !== record.objectiveId || input.taskId !== record.taskId || input.expectedOpacity !== record.expectedOpacity || !record.verificationPlanId || disposed || state !== "ready") { return Promise.resolve(Object.freeze({ state: "blocked", code: record && !record.verificationPlanId ? "VERIFICATION_UNAVAILABLE" : "LIFECYCLE_BLOCKED" })); }
            planId = record.verificationPlanId;
            record.verificationPlanId = null;
            record.phase = "verifying";
            return preflight.verifyCommittedOpacity({ planId: planId, expectedOpacity: record.expectedOpacity }).then(function (verification) {
                if (activeProductionContinuation !== record || record.generation !== reviewBarrierGeneration || disposed || state !== "ready") { return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
                closeProductionContinuation(record);
                return Object.freeze({ state: verification && verification.matches === true ? "verified" : "unverified", code: verification && verification.matches === true ? null : "AGENT_DRIVER_TASK_UNVERIFIED" });
            }, function (error) {
                if (activeProductionContinuation !== record || record.generation !== reviewBarrierGeneration || disposed || state !== "ready") { return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
                closeProductionContinuation(record);
                return Object.freeze({ state: "blocked", code: stableErrorCode(error) === "AGENT_DRIVER_CANCELLED" ? "AGENT_DRIVER_CANCELLED" : "VERIFICATION_UNAVAILABLE" });
            });
        }
        function claimApprovedReview(input) {
            var record = input && typeof input.reviewCorrelation === "string" ? reviewBarriers.get(input.reviewCorrelation) : null;
            var identityMatches = false;
            try { identityMatches = record && record.state === "claimable" && record.generation === reviewBarrierGeneration && input.runtimeGeneration === record.generation && input.objectiveId === record.objectiveId && input.taskId === record.taskId && input.sessionId === record.sessionId && input.turnId === record.turnId && input.taskPlanId === record.taskPlanId && input.taskPlanRevision === record.taskPlanRevision && input.stepId === record.stepId && input.reviewId === record.reviewId && input.reviewRevision === record.reviewRevision && input.capabilityIntent === record.capabilityIntent && input.reviewedSemantics === record.reviewedSemantics && input.reviewPolicySemantics === record.reviewedPolicySemantics && typeof input.freshCandidateId === "string" && confirmedAuthorityComposerModule.sameReviewedSemantics(input.freshSemantics, record.reviewedSemantics); }
            catch (ignoredSemanticMismatch) { identityMatches = false; }
            if (!record || !identityMatches || disposed || state !== "ready") {
                if (record) { record.state = "terminal"; reviewBarriers.delete(record.reviewCorrelation); }
                return Object.freeze({ claimed: false, code: "LIFECYCLE_BLOCKED" });
            }
            record.state = "claimed";
            return Object.freeze({ claimed: true });
        }
        function disposeConfirmedAuthorityComposer() {
            var composer = confirmedAuthorityComposer;
            if (!composer) { return false; }
            try { composer.dispose(); } catch (ignored) {}
            confirmedAuthorityComposer = null;
            return true;
        }
        function createConfirmedAuthorityComposer() {
            if (confirmedAuthorityComposer || !authorityPlane || !planController) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            confirmedAuthorityComposer = confirmedAuthorityComposerModule.createConfirmedAuthorityComposer({ compiler: authorityPlane.compiler, policyEngine: authorityPlane.policyEngine, planController: planController, resolveRegisteredAction: capabilityContracts.resolveRegisteredAction, makePlanId: makeAuthorityId, getRuntimeGeneration: function () { return reviewBarrierGeneration; }, claimApprovedReview: claimApprovedReview });
            return confirmedAuthorityComposer;
        }
        function reviewBarrierError(code) { var value = safeError(code); return value; }
        function captureReviewBarrier(input, reviewedCandidate, reviewedDecision) {
            var capturedGeneration = reviewBarrierGeneration;
            var correlation;
            var opacityPath = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
            if (!input || typeof input.objectiveId !== "string" || typeof input.sessionId !== "string" || input.sessionId !== exactAgentSession.getSessionId() || typeof input.turnId !== "string" || typeof input.taskId !== "string" || typeof input.taskPlanId !== "string" || !Number.isInteger(input.taskPlanRevision) || typeof input.stepId !== "string" || !Number.isInteger(input.reviewRevision) || !planningContracts.isCapabilityIntent(input.capabilityIntent) || input.capabilityIntent.capabilityId !== "set-opacity-v1" || !reviewedCandidate || !reviewedDecision || reviewedDecision.decision !== "REVIEW_REQUIRED" || !bridge) { return Promise.reject(reviewBarrierError("LIFECYCLE_BLOCKED")); }
            try { correlation = protocol.randomId("req"); }
            catch (error) { return Promise.reject(reviewBarrierError("RUNTIME_CAPABILITY_UNAVAILABLE")); }
            if (typeof correlation !== "string" || correlation.length === 0 || reviewBarriers.has(correlation)) { return Promise.reject(reviewBarrierError("RUNTIME_CAPABILITY_UNAVAILABLE")); }
            reviewBarriers.set(correlation, { state: "capturing", generation: capturedGeneration, reviewCorrelation: correlation, objectiveId: input.objectiveId, taskId: input.taskId, sessionId: input.sessionId, turnId: input.turnId, taskPlanId: input.taskPlanId, taskPlanRevision: input.taskPlanRevision, stepId: input.stepId, reviewId: null, reviewRevision: input.reviewRevision, capabilityIntent: input.capabilityIntent, localExpectation: Object.freeze({ opacity: input.capabilityIntent.params.opacity }), reviewedSemantics: confirmedAuthorityComposerModule.createReviewedSemantics(input.capabilityIntent, reviewedCandidate, capabilityContracts.resolveRegisteredAction), reviewedPolicySemantics: confirmedAuthorityComposerModule.createReviewedPolicySemantics(reviewedDecision), contextFingerprint: null, valueDigest: null });
            return bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true }).then(function (bindingCapture) {
                var selection = bindingCapture && bindingCapture.snapshot && bindingCapture.snapshot.selection;
                if (!bindingCapture || bindingCapture.executable !== true || !Array.isArray(selection) || selection.length !== 1 || !selection[0]) { throw reviewBarrierError("UNKNOWN_TARGET"); }
                return bridge.capturePropertyValues(bindingCapture, [{ layerId: selection[0].layerId, propertyPath: opacityPath }]).then(function (valueCapture) { return { bindingCapture: bindingCapture, valueCapture: valueCapture }; });
            }).then(function (captures) {
                var record = reviewBarriers.get(correlation);
                var target = captures.valueCapture && captures.valueCapture.snapshot && captures.valueCapture.snapshot.targets && captures.valueCapture.snapshot.targets[0];
                if (!record || record.state !== "capturing" || disposed || state !== "ready" || reviewBarrierGeneration !== capturedGeneration) { throw reviewBarrierError("LIFECYCLE_BLOCKED"); }
                if (!captures.bindingCapture || typeof captures.bindingCapture.fingerprint !== "string" || !target || typeof target.valueDigest !== "string") { throw reviewBarrierError("VERIFICATION_UNAVAILABLE"); }
                record.state = "ready";
                record.contextFingerprint = captures.bindingCapture.fingerprint;
                record.valueDigest = target.valueDigest;
                return Object.freeze({ reviewCorrelation: correlation });
            }, function (error) { reviewBarriers.delete(correlation); throw error; });
        }
        function continueApprovedReview(input) {
            var record;
            var capturedGeneration;
            var opacityPath = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
            if (!input || typeof input.reviewCorrelation !== "string") { return Promise.resolve(Object.freeze({ state: "blocked", code: "LIFECYCLE_BLOCKED" })); }
            record = reviewBarriers.get(input.reviewCorrelation);
            if (!record || record.state !== "ready" || disposed || state !== "ready" || typeof input.reviewId !== "string" || input.reviewId.length === 0 || input.objectiveId !== record.objectiveId || input.taskId !== record.taskId || input.sessionId !== record.sessionId || input.turnId !== record.turnId || input.taskPlanId !== record.taskPlanId || input.taskPlanRevision !== record.taskPlanRevision || input.stepId !== record.stepId || input.reviewRevision !== record.reviewRevision || !planningContracts.isCapabilityIntent(input.capabilityIntent) || input.capabilityIntent !== record.capabilityIntent) { return Promise.resolve(Object.freeze({ state: "blocked", code: "LIFECYCLE_BLOCKED" })); }
            record.state = "continuing";
            record.reviewId = input.reviewId;
            capturedGeneration = reviewBarrierGeneration;
            return bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true }).then(function (bindingCapture) {
                var selection = bindingCapture && bindingCapture.snapshot && bindingCapture.snapshot.selection;
                if (!bindingCapture || bindingCapture.executable !== true || !Array.isArray(selection) || selection.length !== 1 || !selection[0]) { throw reviewBarrierError("UNKNOWN_TARGET"); }
                return bridge.capturePropertyValues(bindingCapture, [{ layerId: selection[0].layerId, propertyPath: opacityPath }]).then(function (valueCapture) { return { bindingCapture: bindingCapture, valueCapture: valueCapture }; });
            }).then(function (captures) {
                var current = reviewBarriers.get(input.reviewCorrelation);
                var target = captures.valueCapture && captures.valueCapture.snapshot && captures.valueCapture.snapshot.targets && captures.valueCapture.snapshot.targets[0];
                if (!current || current !== record || disposed || state !== "ready" || reviewBarrierGeneration !== capturedGeneration) { return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
                if (!captures.bindingCapture || captures.bindingCapture.fingerprint !== record.contextFingerprint || !target || target.valueDigest !== record.valueDigest) { record.state = "terminal"; reviewBarriers.delete(input.reviewCorrelation); return Object.freeze({ state: "blocked", code: "CONTEXT_STALE" }); }
                record.state = "claimable";
                if (activeProductionContinuation) { record.state = "terminal"; reviewBarriers.delete(input.reviewCorrelation); return Object.freeze({ state: "blocked", code: "LIFECYCLE_BLOCKED" }); }
                activeProductionContinuation = {
                    generation: capturedGeneration,
                    objectiveId: record.objectiveId,
                    taskId: record.taskId,
                    expectedOpacity: record.capabilityIntent.params.opacity,
                    phase: "composing",
                    verificationPlanId: null,
                    committed: false
                };
                var continuation = activeProductionContinuation;
                return confirmedAuthorityComposer.compose({
                    capabilityIntent: record.capabilityIntent,
                    reviewedSemantics: record.reviewedSemantics,
                    reviewPolicySemantics: record.reviewedPolicySemantics,
                    review: {
                        reviewId: record.reviewId,
                        reviewRevision: record.reviewRevision,
                        reviewCorrelation: record.reviewCorrelation,
                        objectiveId: record.objectiveId,
                        taskId: record.taskId,
                        sessionId: record.sessionId,
                        turnId: record.turnId,
                        taskPlanId: record.taskPlanId,
                        taskPlanRevision: record.taskPlanRevision,
                        stepId: record.stepId
                    },
                    policyContext: { sessionId: record.sessionId, taskId: record.taskId }
                }).then(function (composition) {
                    if (activeProductionContinuation !== continuation || continuation.generation !== reviewBarrierGeneration || disposed || state !== "ready") { closeProductionContinuation(continuation); return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
                    if (!composition || composition.state !== "authority-ready") { closeProductionContinuation(continuation); return Object.freeze({ state: composition && composition.state === "cancelled" ? "cancelled" : "blocked", code: composition && composition.code || "LIFECYCLE_BLOCKED" }); }
                    continuation.phase = "executing";
                    return confirmedAuthorityComposer.executeConfirmed().then(function (execution) {
                        var cancelled = execution && execution.state === "cancelled";
                        if (activeProductionContinuation !== continuation || continuation.generation !== reviewBarrierGeneration || disposed || state !== "ready") { closeProductionContinuation(continuation); return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
                        continuation.committed = execution && execution.committed === true ? true : execution && execution.committed === false ? false : null;
                        if (cancelled) { closeProductionContinuation(continuation); return Object.freeze({ state: "cancelled", code: execution.code || "AGENT_DRIVER_CANCELLED" }); }
                        if (continuation.committed === true) {
                            if (!continuation.verificationPlanId) { closeProductionContinuation(continuation); return Object.freeze({ state: "blocked", code: "VERIFICATION_UNAVAILABLE" }); }
                            continuation.phase = "awaiting-verification";
                            return Object.freeze({ state: "verification-required", code: null });
                        }
                        closeProductionContinuation(continuation);
                        return Object.freeze({ state: "blocked", code: execution && execution.code || "PLAN_FAILED" });
                    });
                }).then(function (result) {
                    if (result.state !== "verification-required") { reviewBarriers.delete(record.reviewCorrelation); }
                    return result;
                }, function (error) {
                    closeProductionContinuation(continuation);
                    reviewBarriers.delete(record.reviewCorrelation);
                    return Object.freeze({ state: "blocked", code: stableErrorCode(error) });
                });
            }, function (error) {
                reviewBarriers.delete(input.reviewCorrelation);
                if (reviewBarrierGeneration !== capturedGeneration || disposed || state !== "ready") { return Object.freeze({ state: "cancelled", code: "AGENT_DRIVER_CANCELLED" }); }
                return Object.freeze({ state: "blocked", code: stableErrorCode(error) });
            });
        }
        function disposeAuthorityPlane() {
            if (!authorityPlane) { return false; }
            try { authorityPlane.grantStore.dispose(); } catch (ignored) {}
            authorityPlane = null;
            return true;
        }
        function composeAuthorityPlane(authorityNow) {
            var sessionId;
            var grantStore;
            var resolver;
            var policyEngine;
            var coordinator;
            var producer;
            var gate;
            var delegatedMaterializer;
            var atomicCoordinator;
            var authorityAppender;
            var capabilityResolver;
            var compiler;
            var proposalPort;
            if (!sessionRuntimeModule || !sessionRuntimeModule.isTrustedSessionLog(exactAgentSession) || exactAgentSession.isClosed() || !compilerModule || !grantStoreModule || !policyEngineModule || !evidenceResolverModule || !authorityCoordinatorModule || !authorityProducerModule || !activationGateModule || !atomicCoordinatorModule) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            sessionId = exactAgentSession.getSessionId();
            authorityAppender = sessionRuntimeModule.createAuthorityEventAppender(exactAgentSession);
            grantStore = grantStoreModule.createDelegationGrantStore({ now: authorityNow, idFactory: makeAuthorityId });
            try {
                resolver = evidenceResolverModule.createAuthorityEvidenceResolver({ session: exactAgentSession });
                capabilityResolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilityContracts });
                compiler = compilerModule.createCapabilityCompiler({ resolveCapability: capabilityResolver.resolveCapability, makeId: makeAuthorityId });
                policyEngine = policyEngineModule.createDelegationPolicyEngine({ grantStore: grantStore, resolveCapability: capabilityResolver.resolveCapability, sessionId: sessionId });
                coordinator = authorityCoordinatorModule.createDelegationAuthorityCoordinator({ grantStore: grantStore, session: exactAgentSession, authorityAppender: authorityAppender, evidenceResolver: resolver, issuerId: "local-user" });
                producer = authorityProducerModule.createAuthorizedPlanAuthorityProducer({ policyEngine: policyEngine, grantStore: grantStore, evidenceResolver: resolver, makePlanId: makeAuthorityId });
                gate = activationGateModule.createAuthorityActivationGate({ producer: producer, grantStore: grantStore, sessionId: sessionId, makeActivationId: makeAuthorityId });
                delegatedMaterializer = materializerModule.createAuthorizedPlanMaterializer({ protocol: protocol, planningContracts: planningContracts, capabilityContracts: capabilityContracts, preflight: preflight, authorityProducerModule: authorityProducerModule, authorityProducer: producer, authorityGrantStore: grantStore, authoritySessionId: sessionId });
                atomicCoordinator = atomicCoordinatorModule.createAtomicActivationCoordinator({ protocol: protocol, activationGate: gate, delegatedMaterializer: delegatedMaterializer, preflight: preflight, session: exactAgentSession, authorityAppender: authorityAppender, evidenceResolver: resolver, taskRunIdFactory: makeAuthorityId, now: protocolClock.now });
                proposalPort = providerControllerModule.createProposalPort(providerController, protocol);
                authorityPlane = { grantStore: grantStore, policyEngine: policyEngine, resolver: resolver, coordinator: coordinator, producer: producer, gate: gate, atomicCoordinator: atomicCoordinator, authorityAppender: authorityAppender, compiler: compiler, proposalPort: proposalPort };
            } catch (error) {
                try { grantStore.dispose(); } catch (ignored) {}
                throw error;
            }
        }
        function safeStatus() {
            var bridgeState = bridge ? bridge.getState() : null;
            return Object.freeze({ state: state, initialized: initialized, disposed: disposed, suspended: suspended, moduleRevision: MODULE_REVISION, hostAdapterRevision: initialized ? HOST_ADAPTER_REVISION : null, bridgeState: Object.freeze({ state: bridgeState ? bridgeState.state : null }), lastErrorCode: lastErrorCode, activationPolicy: activationPolicy });
        }
        function safeError(code) { return Object.freeze({ code: code || "RUNTIME_CAPABILITY_UNAVAILABLE" }); }
        function browserRandomId(kind) {
            var cryptoApi = ownData(runtime, "crypto") || (root && root.crypto);
            var values = new Uint8Array(32);
            var index;
            if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") { throw new Error("random unavailable"); }
            cryptoApi.getRandomValues(values);
            var output = kind + "_";
            for (index = 0; index < values.length; index += 1) { output += ("0" + values[index].toString(16)).slice(-2); }
            return output;
        }
        function setup() {
            var mutationCapability;
            var registeredAction;
            var registeredActionSchema;
            var wallClock = typeof ownData(runtime, "now") === "function" ? ownData(runtime, "now") : function () { return new Date().getTime(); };
            protocolClock = createSessionProtocolClock(wallClock);
            var runtimeOptions = {
                utf8ByteLength: typeof ownData(runtime, "utf8ByteLength") === "function" ? ownData(runtime, "utf8ByteLength") : utf8ByteLength,
                sha256Hex: typeof ownData(runtime, "sha256Hex") === "function" ? ownData(runtime, "sha256Hex") : sha256Hex,
                randomId: typeof ownData(runtime, "randomId") === "function" ? ownData(runtime, "randomId") : browserRandomId,
                now: protocolClock.now
            };
            var setTimer = typeof ownData(runtime, "setTimeout") === "function" ? ownData(runtime, "setTimeout") : root && root.setTimeout;
            var clearTimer = typeof ownData(runtime, "clearTimeout") === "function" ? ownData(runtime, "clearTimeout") : root && root.clearTimeout;
            var fetchFn = typeof ownData(runtime, "fetch") === "function" ? ownData(runtime, "fetch") : root && root.fetch;
            var TextDecoderCtor = ownData(runtime, "TextDecoder") || (root && root.TextDecoder);
            var timeoutMs = ownData(runtime, "timeoutMs");
            if (typeof invokeHost !== "function" || typeof setTimer !== "function" || typeof clearTimer !== "function" || !activationPolicyModule || typeof activationPolicyModule.isTrustedPolicy !== "function" || !activationPolicyModule.isTrustedPolicy(activationPolicy) || activationPolicy.productionEnabled !== false || activationPolicy.productionBlockReason !== "no-qualified-default-model" || activationPolicy.qualifiedDefaultModelId !== null) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            if (timeoutMs === undefined) { timeoutMs = 10000; }
            protocol = protocolModule.createProtocol(runtimeOptions);
            contextApi = contextModule.createContextApi(protocol);
            mutationCapability = capabilityContracts.getLocalProjection("set-opacity-v1");
            registeredAction = capabilityContracts.resolveRegisteredAction("set-opacity-v1");
            if (!mutationCapability || !registeredAction) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            registeredActionSchema = deriveRegisteredActionParamsSchema(mutationCapability);
            validator = validatorModule.createActionValidator(protocol, { registry: [{ id: registeredAction.toolId, actions: [{ id: registeredAction.actionId, executable: true, risk: "write", targetScope: ["layer", "property"], capabilityRevision: mutationCapability.capabilityId, paramsSchema: registeredActionSchema }] }], expressionTemplates: [], scriptAllowlist: [] });
            validateRegisteredActionMappings(capabilityContracts, validator);
            planStore = planModule.createPlanStore(protocol, { validatorAuthority: validator.authority });
            bridge = bridgeModule.createContextBridge({ protocol: protocol, contextApi: contextApi, invokeHost: invokeHost, runtime: { setTimeout: setTimer, clearTimeout: clearTimer, timeoutMs: timeoutMs } });
            opacityVerificationPort = bridgeModule.createOpacityVerificationPort(bridge, protocol);
            observationReadPort = Object.freeze({
                capture: function (options) { return bridge.capture(options); },
                getState: function () { return bridge.getState(); }
            });
            reviewPort = bridgeModule.createReviewPort(bridge, protocol);
            executionAdapter = executionAdapterModule.createExecutionAdapter({ protocol: protocol, contextApi: contextApi, contextBridge: bridge, executionPort: bridgeModule.createExecutionPort(bridge, protocol), invokeHost: invokeHost });
            preflight = preflightModule.createExecutionPreflight({
                protocol: protocol,
                actionValidator: validator,
                planStore: planStore,
                contextBridge: bridge,
                reviewPort: reviewPort,
                getCurrentExecutionBinding: function () { return { settingsFingerprint: contextApi.fingerprintSettings({}), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: MODULE_REVISION }, lifecycle: "ready", hasVerifier: true }; },
                executeValidatedAction: executionAdapter.executeValidatedAction,
                onCommittedVerificationAvailable: ownCommittedVerification
            });
            authorizedPlanMaterializer = materializerModule.createAuthorizedPlanMaterializer({ protocol: protocol, planningContracts: planningContracts, capabilityContracts: capabilityContracts, preflight: preflight });
            planReviewProjection = planReviewProjectionModule.createPlanReviewProjection({ protocol: protocol, planningContracts: planningContracts, capabilityContracts: capabilityContracts });
            planController = planControllerModule.createPlanController({ protocol: protocol, materializer: authorizedPlanMaterializer, projectionFactory: planReviewProjection, preflight: preflight, planStore: planStore, taskRunFactory: taskRunModule.createTaskRun, taskRunIdFactory: function () { taskRunSerial += 1; return "task_run_" + taskRunSerial; }, now: protocolClock.now });
            reviewRuntimePort = reviewRuntimePortModule.createReviewRuntimePort({ protocol: protocol, planController: planController, tokenFactory: function () { reviewTokenSerial += 1; return "review_" + reviewTokenSerial; } });
            controller = controllerModule.createController({ protocol: protocol, preflight: preflight });
            if (!controllerModule.isTrustedControllerForProtocol(controller, protocol)) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            if (typeof fetchFn !== "function" || typeof TextDecoderCtor !== "function" || typeof root.AbortController !== "function") { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            var localTransport = localTransportModule.createLocalTransport({ protocol: protocol, fetch: fetchFn, TextDecoder: TextDecoderCtor });
            providerController = providerControllerModule.createProviderController({ protocol: protocol, contextBridge: bridge, transport: localTransport, runtime: { setTimeout: setTimer, clearTimeout: clearTimer, createAbortController: function () { var nativeController = new root.AbortController(); return { signal: nativeController.signal, abort: function () { nativeController.abort(); } }; }, parseUrl: function (value) { var parsed = new root.URL(value); return { protocol: parsed.protocol, hostname: parsed.hostname, port: parsed.port, pathname: parsed.pathname, username: parsed.username, password: parsed.password, search: parsed.search, hash: parsed.hash, href: parsed.href }; }, nowMs: wallClock } });
            providerProposalRouter = proposalRouterModule.createProposalRouter({ protocol: protocol, providerController: providerController, controller: controller });
            composeAuthorityPlane(wallClock);
            createConfirmedAuthorityComposer();
        }
        function cancelActiveDelegatedTask() {
            if (!authorityPlane || !activeDelegatedTask) { return false; }
            try { authorityPlane.atomicCoordinator.cancel(activeDelegatedTask); } catch (ignored) {}
            activeDelegatedTask = null;
            authorityRouting = false;
            return true;
        }
        function grantNextOpacityMutation() {
            var requestId;
            var taskId;
            var issuedAt;
            var permissionEvent;
            var permissionEvidence;
            var issued;
            var grantedEvent;
            if (arguments.length !== 0 || disposed || suspended || state !== "ready" || !authorityPlane || authorityRouting || (activePilot && authorityProjection().active)) { return Promise.reject(safeError("LIFECYCLE_BLOCKED")); }
            try {
                requestId = makeAuthorityId("consent"); taskId = makeAuthorityId("pilot_task"); issuedAt = (typeof ownData(runtime, "now") === "function" ? ownData(runtime, "now") : function () { return new Date().getTime(); })();
                permissionEvent = authorityPlane.authorityAppender.append({ kind: "permission/decided", requestId: requestId, payload: { decision: "approved", issuedBy: "local-user", taskId: taskId } });
                permissionEvidence = authorityPlane.resolver.resolveEvidence({ sessionId: exactAgentSession.getSessionId(), seq: permissionEvent.seq, eventKind: permissionEvent.kind, requestId: requestId });
                issued = authorityPlane.coordinator.issueGrant({ spec: { capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId: taskId, expiresAt: issuedAt + 60000, maxActions: 1, provenance: { source: "local-user", requestId: requestId, issuedAt: issuedAt } }, permissionEvidence: permissionEvidence });
                grantedEvent = authorityPlane.resolver.getVerifiedEvent(issued.evidence);
                authorityPlane.authorityAppender.publishCommitted(permissionEvent);
                authorityPlane.authorityAppender.publishCommitted(grantedEvent);
                activePilot = { grantId: issued.grant.grant.grantId, taskId: taskId, expiresAt: issuedAt + 60000, evidence: issued.evidence };
                lastPilot = { taskId: taskId, expiresAt: issuedAt + 60000 };
                authorityRemainingActions = 1;
                authorityState = "active"; authorityErrorCode = null;
                return Promise.resolve(authorityProjection());
            } catch (error) { authorityState = "failed"; authorityErrorCode = error && error.code || "RUNTIME_CAPABILITY_UNAVAILABLE"; return Promise.reject(error); }
        }
        function revokeOpacityDelegation() {
            var result;
            var event;
            if (arguments.length !== 0 || disposed || !authorityPlane || !activePilot || !authorityProjection().active) { return Promise.reject(safeError("LIFECYCLE_BLOCKED")); }
            try {
                result = authorityPlane.coordinator.revokeGrant({ grantId: activePilot.grantId, taskId: activePilot.taskId, requestId: makeAuthorityId("revoke") });
                event = authorityPlane.resolver.getVerifiedEvent(result.evidence);
                authorityPlane.authorityAppender.publishCommitted(event);
                activePilot = null; authorityRemainingActions = 0; authorityState = "revoked"; authorityErrorCode = null;
                return Promise.resolve(authorityProjection());
            } catch (error) { authorityErrorCode = error && error.code || "RUNTIME_CAPABILITY_UNAVAILABLE"; return Promise.reject(error); }
        }
        function routeActiveProposal() {
            var proposal;
            var intent;
            var candidate;
            var decision;
            var plan;
            var failureStage = "provider-proposal";
            if (authorityRouting || !authorityPlane || !activePilot || !authorityProjection().active) { return Promise.resolve(null); }
            authorityRouting = true;
            try {
                proposal = authorityPlane.proposalPort.beginReview();
                if (!proposal || proposal.capabilityId !== "set-opacity-v1") { throw safeError("PROVIDER_RESPONSE_INVALID"); }
                failureStage = "capability-intent";
                intent = planningContracts.createCapabilityIntent({ intentId: "intent_" + proposal.requestId + "_" + proposal.generation, capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: proposal.opacity } });
                candidate = authorityPlane.compiler.compile(intent);
                failureStage = "policy";
                decision = authorityPlane.policyEngine.evaluate(candidate, { sessionId: exactAgentSession.getSessionId(), taskId: activePilot.taskId });
                latestAuthorityDecision = Object.freeze({ decision: decision.decision, reasonCode: decision.reasonCode, candidateId: candidate.candidateId });
                if (decision.decision === "REVIEW_REQUIRED") {
                    return Promise.resolve(controller.createBoundOpacityCandidate({ opacity: proposal.opacity, requestId: proposal.requestId, requestGeneration: proposal.generation })).then(function (result) { authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: "completed", errorCode: null }); authorityRouting = false; return result; });
                }
                if (decision.decision !== "ALLOW") { throw safeError("PERMISSION_DENIED"); }
                failureStage = "authorized-plan";
                plan = authorityPlane.producer.produce({ candidate: candidate, context: { sessionId: exactAgentSession.getSessionId(), taskId: activePilot.taskId }, delegationGrantedEvidence: activePilot.evidence });
                latestAuthorityParamTrace = Object.freeze({ provider: proposal.opacity, intent: intent.params.opacity, candidate: candidate.params.opacity, authorizedPlan: plan.steps[0].params.opacity, valueType: typeof plan.steps[0].params.opacity, schemaOwner: "VelaCapabilityContracts:set-opacity-v1" });
                latestAuthorityFailure = null;
                authorityState = "executing";
                failureStage = "delegated-activation";
                return authorityPlane.atomicCoordinator.activate(plan, { selectionOrderMeaningful: false }).then(function (handle) {
                    activeDelegatedTask = handle;
                    var armedEvent = exactAgentSession.getEventBySeq(handle.armedEvidenceSeq);
                    authorityPlane.authorityAppender.publishCommitted(armedEvent);
                    latestAuthorityExecution = Object.freeze({ taskId: handle.taskId, planId: handle.planId, activationId: handle.activationId, committed: false });
                    return authorityPlane.atomicCoordinator.run(handle).then(function (result) { latestAuthorityExecution = Object.freeze({ taskId: handle.taskId, planId: handle.planId, activationId: handle.activationId, committed: true }); activeDelegatedTask = null; activePilot = null; authorityRemainingActions = 0; authorityState = "consumed"; authorityRouting = false; authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: "completed", errorCode: null, handled: true }); return result; }, function (error) { var p = authorityProjection(); activeDelegatedTask = null; latestAuthorityExecution = Object.freeze({ taskId: handle.taskId, planId: handle.planId, activationId: handle.activationId, committed: p.remainingActions === 0 }); if (p.remainingActions === 0 || !p.active) { activePilot = null; authorityRemainingActions = 0; authorityState = "failed"; } else { authorityState = "active"; } authorityErrorCode = error && error.code || "PLAN_FAILED"; authorityRouting = false; authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: "failed", errorCode: stableErrorCode(error) }); throw error; });
                }, function (error) { authorityState = activePilot && authorityProjection().active ? "active" : authorityState; authorityErrorCode = error && error.code || "PLAN_FAILED"; latestAuthorityFailure = Object.freeze({ stage: failureStage, sourceStage: error && typeof error.stage === "string" ? error.stage : null, code: authorityErrorCode, field: error && error.details && typeof error.details.field === "string" ? error.details.field : null }); authorityRouting = false; authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: "failed", errorCode: stableErrorCode(error) }); throw error; });
            } catch (error) { authorityRouting = false; authorityErrorCode = error && error.code || "RUNTIME_CAPABILITY_UNAVAILABLE"; latestAuthorityFailure = Object.freeze({ stage: failureStage, sourceStage: error && typeof error.stage === "string" ? error.stage : null, code: authorityErrorCode, field: error && error.details && typeof error.details.field === "string" ? error.details.field : null }); if (proposal) { authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: "failed", errorCode: stableErrorCode(error) }); } return Promise.reject(error); }
        }
        function createAgentDriverRuntimePort() {
            function captureReviewPresentationBaseline() {
                // Presentation only: any future approved continuation must still obtain fresh Observe, binding and Preflight evidence.
                return Promise.resolve(opacityVerificationPort.observe()).then(function (observation) {
                    var opacity = observation && observation.opacity;
                    return typeof opacity === "number" && isFinite(opacity) && opacity >= 0 && opacity <= 100 ? opacity : null;
                }, function () { return null; });
            }
            function settleAgentDriverProposal(outcome, errorCode, handled) {
                var proposal = agentDriverProposal;
                agentDriverProposal = null;
                if (!proposal || !authorityPlane) { return false; }
                return authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: outcome, errorCode: errorCode || null, handled: handled === true });
            }
            function settleDelegatedExecutionFailure(errorCode, settleProposal) {
                var projection;
                activeDelegatedTask = null;
                projection = authorityProjection();
                authorityErrorCode = errorCode || "PLAN_FAILED";
                if (activePilot && projection.remainingActions > 0) {
                    authorityRemainingActions = projection.remainingActions;
                    authorityState = "active";
                } else {
                    activePilot = null;
                    authorityRemainingActions = 0;
                    authorityState = "failed";
                }
                if (settleProposal !== false) { try { settleAgentDriverProposal("failed", authorityErrorCode, false); } catch (ignoredSettlement) {} }
                return authorityProjection();
            }
            if (agentDriverRuntimePort) { return agentDriverRuntimePort; }
            agentDriverRuntimePort = Object.freeze({
                reason: function (input) {
                    var capturedGeneration;
                    if (disposed || state !== "ready" || !providerController || agentDriverProposal) { return Promise.reject(safeError("LIFECYCLE_BLOCKED")); }
                    agentReasoningGeneration += 1;
                    capturedGeneration = agentReasoningGeneration;
                    activeAgentReasoning = Object.freeze({ generation: capturedGeneration });
                    return Promise.resolve(providerController.send(input)).then(function () {
                        var proposal;
                        if (disposed || state !== "ready" || !activeAgentReasoning || activeAgentReasoning.generation !== capturedGeneration || agentReasoningGeneration !== capturedGeneration) {
                            if (authorityPlane && providerController.getUiState().state === "proposal-ready") {
                                proposal = authorityPlane.proposalPort.beginReview();
                                authorityPlane.proposalPort.finalizeReview({ requestId: proposal.requestId, generation: proposal.generation, outcome: "failed", errorCode: "LIFECYCLE_BLOCKED", handled: false });
                            }
                            throw safeError("LIFECYCLE_BLOCKED");
                        }
                        activeAgentReasoning = null;
                        proposal = authorityPlane && authorityPlane.proposalPort.beginReview();
                        if (!proposal || proposal.capabilityId !== "set-opacity-v1") { throw safeError("PROVIDER_RESPONSE_INVALID"); }
                        agentDriverProposal = proposal;
                        return Object.freeze({ capabilityId: proposal.capabilityId, params: Object.freeze({ opacity: proposal.opacity }) });
                    }, function (error) {
                        if (activeAgentReasoning && activeAgentReasoning.generation === capturedGeneration) { activeAgentReasoning = null; }
                        throw error;
                    });
                },
                submitIntent: function (input) {
                    var candidate;
                    var decision;
                    var plan;
                    var proposal = agentDriverProposal;
                    if (disposed || state !== "ready" || !authorityPlane || !proposal || !planningContracts.isCapabilityIntent(input && input.capabilityIntent) || input.sessionId !== exactAgentSession.getSessionId() || input.capabilityIntent.capabilityId !== "set-opacity-v1") { settleAgentDriverProposal("failed", "LIFECYCLE_BLOCKED", false); return Promise.reject(safeError("LIFECYCLE_BLOCKED")); }
                    try {
                        candidate = authorityPlane.compiler.compile(input.capabilityIntent);
                        decision = authorityPlane.policyEngine.evaluate(candidate, { sessionId: exactAgentSession.getSessionId(), taskId: activePilot ? activePilot.taskId : input.taskId });
                        latestAuthorityDecision = Object.freeze({ decision: decision.decision, reasonCode: decision.reasonCode, candidateId: candidate.candidateId });
                        if (decision.decision === "REVIEW_REQUIRED") {
                            settleAgentDriverProposal("completed", null, true);
                            return captureReviewBarrier(input, candidate, decision).then(function (barrier) { return captureReviewPresentationBaseline().then(function (beforeValue) { return Object.freeze({ state: "review-required", committed: false, code: "REVIEW_REQUIRED", beforeValue: beforeValue, reviewCorrelation: barrier.reviewCorrelation }); }); });
                        }
                        if (decision.decision !== "ALLOW") {
                            settleAgentDriverProposal("failed", "PERMISSION_DENIED", false);
                            return Promise.resolve(Object.freeze({ state: "denied", committed: false, code: "PERMISSION_DENIED" }));
                        }
                        if (!activePilot) { throw safeError("LIFECYCLE_BLOCKED"); }
                        plan = authorityPlane.producer.produce({ candidate: candidate, context: { sessionId: exactAgentSession.getSessionId(), taskId: activePilot.taskId }, delegationGrantedEvidence: activePilot.evidence });
                    } catch (error) { settleAgentDriverProposal("failed", stableErrorCode(error), false); return Promise.reject(error); }
                    authorityState = "executing";
                    return authorityPlane.atomicCoordinator.activate(plan, { selectionOrderMeaningful: false }).then(function (handle) {
                        activeDelegatedTask = handle;
                        authorityPlane.authorityAppender.publishCommitted(exactAgentSession.getEventBySeq(handle.armedEvidenceSeq));
                        return authorityPlane.atomicCoordinator.run(handle).then(function (result) {
                            var settlementSucceeded = true;
                            activeDelegatedTask = null; activePilot = null; authorityRemainingActions = 0; authorityState = "consumed";
                            try { settleAgentDriverProposal("completed", null, true); }
                            catch (ignoredSettlement) { settlementSucceeded = false; }
                            return Object.freeze({ state: "executed", committed: true, executionResult: result, transcriptSettled: settlementSucceeded });
                        }, function (runError) {
                            settleDelegatedExecutionFailure(stableErrorCode(runError), true);
                            throw runError;
                        });
                    }, function (activationError) { settleDelegatedExecutionFailure(stableErrorCode(activationError), true); throw activationError; });
                },
                verifyOpacity: function (input) {
                    return opacityVerificationPort.observe().then(function (observation) {
                        return Object.freeze({ fresh: observation.fresh === true, opacity: observation.opacity, matches: observation.opacity === input.expectedOpacity, observationRevision: observation.observationId });
                    });
                },
                verifyCommittedAction: verifyCommittedAction,
                continueApprovedReview: continueApprovedReview,
                cancel: function () {
                    var providerState;
                    var cancelledReasoning = activeAgentReasoning;
                    agentReasoningGeneration += 1;
                    activeAgentReasoning = null;
                    invalidateReviewBarriers();
                    invalidateProductionContinuation();
                    if (confirmedAuthorityComposer) { try { confirmedAuthorityComposer.cancel(); } catch (ignoredComposer) {} }
                    if (agentDriverProposal && authorityPlane) { try { settleAgentDriverProposal("failed", "AGENT_DRIVER_CANCELLED", false); } catch (ignored) {} }
                    if (providerController && cancelledReasoning) {
                        try {
                            providerState = providerController.getUiState();
                            if (providerState && providerState.state === "pending") { providerController.cancel({ requestId: providerState.requestId }); }
                        } catch (ignoredProvider) {}
                    }
                    var cancelled = cancelActiveDelegatedTask();
                    if (cancelled && authorityState === "executing") { settleDelegatedExecutionFailure("AGENT_DRIVER_CANCELLED", false); }
                    return cancelled;
                }
            });
            return agentDriverRuntimePort;
        }
        function initialize() {
            var capturedEpoch;
            if (disposed || state === "failed") { return Promise.reject(safeError(lastErrorCode || "RUNTIME_CAPABILITY_UNAVAILABLE")); }
            if (state === "ready") { return Promise.resolve(safeStatus()); }
            if (state === "initializing") { return initPromise; }
            state = "initializing";
            capturedEpoch = epoch;
            try { setup(); }
            catch (error) { lastErrorCode = stableErrorCode(error); state = "failed"; return Promise.reject(safeError(lastErrorCode)); }
            initPromise = bridge.capture({ tier: 0, purpose: "display", selectionOrderMeaningful: false }).then(function (capture) {
                if (disposed || capturedEpoch !== epoch || !capture || capture.hostAdapterRevision !== HOST_ADAPTER_REVISION) { throw safeError("LIFECYCLE_BLOCKED"); }
                initialized = true;
                state = "ready";
                return safeStatus();
            }, function (error) {
                if (disposed || capturedEpoch !== epoch) { throw safeError("LIFECYCLE_BLOCKED"); }
                lastErrorCode = stableErrorCode(error);
                state = "failed";
                throw safeError(lastErrorCode);
            });
            return initPromise;
        }
        function suspend() {
            if (disposed || state !== "ready") { return false; }
            invalidateReviewBarriers();
            invalidateProductionContinuation();
            if (controller) { controller.invalidate("stale"); }
            if (providerController) { providerController.invalidate("idle"); }
            if (reviewRuntimePort) { reviewRuntimePort.invalidateAll(); }
            disposeConfirmedAuthorityComposer();
            if (planController) { planController.invalidate("suspend"); }
            cancelActiveDelegatedTask();
            if (authorityPlane) { authorityPlane.grantStore.suspend(); }
            activePilot = null; lastPilot = null; authorityRemainingActions = null; authorityState = "inactive"; authorityRouting = false;
            if (bridge) { bridge.suspend(); }
            suspended = true;
            state = "suspended";
            return true;
        }
        function resume() {
            if (disposed || state === "failed" || state !== "suspended") { return false; }
            if (bridge) { bridge.resume(); }
            createConfirmedAuthorityComposer();
            suspended = false;
            state = initialized ? "ready" : "new";
            return true;
        }
        function resetSession() {
            if (disposed || state !== "ready" || !bridge) { return false; }
            invalidateReviewBarriers();
            invalidateProductionContinuation();
            if (controller) { controller.invalidate("idle"); }
            if (providerController) { providerController.invalidate("idle"); }
            if (reviewRuntimePort) { reviewRuntimePort.invalidateAll(); }
            disposeConfirmedAuthorityComposer();
            if (planController) { planController.invalidate("session-reset"); }
            cancelActiveDelegatedTask();
            if (authorityPlane) { authorityPlane.grantStore.resetSession(); }
            activePilot = null; lastPilot = null; authorityRemainingActions = null; authorityState = "inactive"; authorityRouting = false;
            bridge.resetSession();
            try { protocolClock.reset(); }
            catch (error) { lastErrorCode = stableErrorCode(error); state = "failed"; return false; }
            createConfirmedAuthorityComposer();
            return true;
        }
        function dispose() {
            if (disposed) { return false; }
            epoch += 1;
            invalidateReviewBarriers();
            invalidateProductionContinuation();
            disposeConfirmedAuthorityComposer();
            if (bridge) { try { bridge.suspend(); } catch (ignored) {} }
            cancelActiveDelegatedTask();
            disposeAuthorityPlane();
            if (controller) { try { controller.invalidate("idle"); } catch (ignoredController) {} }
            if (providerController) { try { providerController.invalidate("idle"); } catch (ignoredProvider) {} }
            if (reviewRuntimePort) { try { reviewRuntimePort.invalidateAll(); } catch (ignoredReviews) {} }
            if (objectiveReviewRuntimePort) { try { objectiveReviewRuntimePort.invalidate(); } catch (ignoredObjectiveReview) {} }
            if (planController) { try { planController.dispose(); } catch (ignoredPlans) {} }
            protocol = null; contextApi = null; validator = null; planStore = null; bridge = null; reviewPort = null; preflight = null; executionAdapter = null; controller = null; providerController = null; providerProposalRouter = null; authorizedPlanMaterializer = null; planReviewProjection = null; planController = null; confirmedAuthorityComposer = null; reviewRuntimePort = null; objectiveReviewRuntimePort = null; protocolClock = null; agentDriverRuntimePort = null; agentDriverProposal = null; agentReasoningGeneration += 1; activeAgentReasoning = null; activeProductionContinuation = null; opacityVerificationPort = null;
            initialized = false; suspended = false; disposed = true; state = "disposed";
            return true;
        }
        function ensureReadyController() {
            if (disposed || state !== "ready" || !controller) { throw safeError(suspended ? "LIFECYCLE_BLOCKED" : "RUNTIME_CAPABILITY_UNAVAILABLE"); }
            return controller;
        }
        function activeCandidateInput() {
            var source = ensureReadyController().getUiState();
            if (!source || source.state !== "pending-confirmation" || typeof source.candidateId !== "string") { throw safeError("CANDIDATE_STATE_INVALID"); }
            return { candidateId: source.candidateId };
        }
        function approveActiveCandidate() {
            try {
                if (objectiveReviewRuntimePort && objectiveReviewRuntimePort.getProjection().state === "active") { return Promise.resolve(objectiveReviewRuntimePort.resolve("approved")); }
                return ensureReadyController().approveCandidate(activeCandidateInput());
            }
            catch (error) { return Promise.reject(error); }
        }
        function rejectActiveCandidate() {
            try {
                if (objectiveReviewRuntimePort && objectiveReviewRuntimePort.getProjection().state === "active") { return Promise.resolve(objectiveReviewRuntimePort.resolve("rejected")).then(function (result) { invalidateReviewBarriers(); return result; }); }
                return Promise.resolve(ensureReadyController().rejectCandidate(activeCandidateInput()));
            }
            catch (error) { return Promise.reject(error); }
        }
        function attachObjectiveReviewPort(ownerPort) {
            if (disposed || !initialized || objectiveReviewRuntimePort || !reviewRuntimePortModule || typeof reviewRuntimePortModule.createObjectiveReviewRuntimePort !== "function") { return false; }
            try { objectiveReviewRuntimePort = reviewRuntimePortModule.createObjectiveReviewRuntimePort({ protocol: protocol, ownerPort: ownerPort }); return true; }
            catch (error) { objectiveReviewRuntimePort = null; return false; }
        }
        function reviewProviderProposal() {
            try {
                if (disposed || state !== "ready" || !providerProposalRouter) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
                return providerProposalRouter.review();
            } catch (error) { return Promise.reject(error); }
        }
        function getUiState() {
            try {
                return controller ? controller.getUiState() : Object.freeze({ state: state === "ready" ? "input-ready" : state, candidateId: null, capabilityId: null, risk: null, targetSummary: null, beforeValue: null, proposedValue: null, undoGroupLabel: null, errorCode: lastErrorCode, moduleRevision: "vela-controller-v1" });
            } catch (error) {
                return Object.freeze({ state: "failed", candidateId: null, capabilityId: null, risk: null, targetSummary: null, beforeValue: null, proposedValue: null, undoGroupLabel: null, errorCode: stableErrorCode(error), moduleRevision: "vela-controller-v1" });
            }
        }
        function sendProviderMessage(input) { try { if (disposed || state !== "ready" || !providerController) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); } return Promise.resolve(providerController.send(input)).then(function (result) { return providerController.getUiState().state === "proposal-ready" && activePilot && authorityProjection().active ? routeActiveProposal().then(function () { return result; }) : result; }); } catch (error) { return Promise.reject(error); } }
        function checkProviderReadiness(input) { try { if (disposed || state !== "ready" || !providerController || typeof providerController.checkReadiness !== "function") { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); } return providerController.checkReadiness(input); } catch (error) { return Promise.reject(error); } }
        function cancelProviderRequest() {
            var providerState;
            try {
                if (!providerController) { return false; }
                providerState = providerController.getUiState();
                return !!providerController.cancel({ requestId: providerState.requestId });
            } catch (error) { return false; }
        }
        function getProviderUiState() { return providerController ? providerController.getUiState() : Object.freeze({ state: disposed ? "disposed" : state, requestId: null, text: null, errorCode: lastErrorCode, intentReason: null, proposalCapabilityId: null, suggestedOpacity: null, providerId: "lmstudio", modelId: null, moduleRevision: "vela-provider-controller-v2" }); }
        function getProviderDiagnostics() { return providerController && typeof providerController.getDiagnostics === "function" ? providerController.getDiagnostics() : null; }
        function getProviderSurfaceState() {
            var source = getProviderUiState();
            var nextState = source && typeof source.state === "string" ? source.state : "failed";
            return Object.freeze({ state: nextState, text: source && typeof source.text === "string" ? source.text : null, errorCode: source && typeof source.errorCode === "string" ? source.errorCode : null, intentReason: source && typeof source.intentReason === "string" ? source.intentReason : null, moduleRevision: "vela-provider-surface-v1" });
        }
        function getConfirmationSurfaceState() {
            var objectiveReview = objectiveReviewRuntimePort ? objectiveReviewRuntimePort.getProjection() : null;
            if (objectiveReview && objectiveReview.state === "active") { return Object.freeze({ state: "confirmation-ready", beforeValue: objectiveReview.beforeValue, proposedValue: objectiveReview.proposedValue, errorCode: null, moduleRevision: "vela-objective-review-surface-v1" }); }
            if (objectiveReview && objectiveReview.state === "resolved" && objectiveReview.outcome === "approved") { return Object.freeze({ state: "review-approved", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: "vela-objective-review-surface-v1" }); }
            if (objectiveReview && objectiveReview.state === "resolved" && objectiveReview.outcome === "rejected") { return Object.freeze({ state: "rejected", beforeValue: null, proposedValue: null, errorCode: null, moduleRevision: "vela-objective-review-surface-v1" }); }
            var source = getUiState();
            var sourceState = source && typeof source.state === "string" ? source.state : "idle";
            var state = sourceState === "pending-confirmation" ? "confirmation-ready" : sourceState === "executing" ? "executing" : sourceState === "consumed" ? "execution-completed" : sourceState === "discarded" ? "rejected" : sourceState === "failed" || sourceState === "stale" ? "execution-failed" : "idle";
            var hasConfirmation = state !== "idle";
            var beforeValue = hasConfirmation && source && typeof source.beforeValue === "number" && isFinite(source.beforeValue) && source.beforeValue >= 0 && source.beforeValue <= 100 ? source.beforeValue : null;
            var proposedValue = hasConfirmation && source && typeof source.proposedValue === "number" && isFinite(source.proposedValue) && source.proposedValue >= 0 && source.proposedValue <= 100 ? source.proposedValue : null;
            return Object.freeze({ state: state, beforeValue: beforeValue, proposedValue: proposedValue, errorCode: source && typeof source.errorCode === "string" ? source.errorCode : null, moduleRevision: "vela-confirmation-surface-v1" });
        }
        return Object.freeze({ initialize: initialize, attachObjectiveReviewPort: attachObjectiveReviewPort, getStatus: safeStatus, getAuthorityProjection: authorityProjection, getAuthorityDiagnostics: authorityDiagnostics, grantNextOpacityMutation: grantNextOpacityMutation, revokeOpacityDelegation: revokeOpacityDelegation, getObservationReadPort: function () { return initialized && !disposed ? observationReadPort : null; }, getAgentDriverRuntimePort: function () { return initialized && !disposed ? createAgentDriverRuntimePort() : null; }, suspend: suspend, resume: resume, resetSession: resetSession, dispose: dispose, approveActiveCandidate: approveActiveCandidate, rejectActiveCandidate: rejectActiveCandidate, reviewProviderProposal: reviewProviderProposal, getUiState: getUiState, checkProviderReadiness: checkProviderReadiness, sendProviderMessage: sendProviderMessage, cancelProviderRequest: cancelProviderRequest, getProviderUiState: getProviderUiState, getProviderDiagnostics: getProviderDiagnostics, getProviderSurfaceState: getProviderSurfaceState, getConfirmationSurfaceState: getConfirmationSurfaceState });
    }
    return Object.freeze({ createRuntime: createRuntime, deriveRegisteredActionParamsSchema: deriveRegisteredActionParamsSchema, validateRegisteredActionMappings: validateRegisteredActionMappings });
}));
