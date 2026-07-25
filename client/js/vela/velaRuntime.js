(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaRuntime";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertDependencies(protocol, parser, providerAdapter, localTransport, context, validator, plan, guard, bridge, preflight, executionAdapter, controller, providerController, proposalRouter) {
        if (!protocol || !parser || !providerAdapter || !localTransport || !context || !validator || !plan || !guard || !bridge || !preflight || !executionAdapter || !providerController || !proposalRouter ||
            typeof protocol.createProtocol !== "function" || typeof context.createContextApi !== "function" ||
            typeof validator.createActionValidator !== "function" || typeof plan.createPlanStore !== "function" ||
            typeof bridge.createContextBridge !== "function" || typeof bridge.createExecutionPort !== "function" || typeof bridge.createReviewPort !== "function" || typeof preflight.createExecutionPreflight !== "function" || typeof executionAdapter.createExecutionAdapter !== "function" ||
            !controller || typeof controller.createController !== "function" || typeof controller.isTrustedControllerForProtocol !== "function" || typeof proposalRouter.createProposalRouter !== "function" ||
            typeof parser.createResponseParser !== "function" || typeof providerAdapter.createLocalOpenAICompatibleProvider !== "function" || typeof localTransport.createLocalTransport !== "function" || typeof providerController.createProviderController !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE");
        }
        return { protocol: protocol, parser: parser, providerAdapter: providerAdapter, localTransport: localTransport, context: context, validator: validator, plan: plan, guard: guard, bridge: bridge, preflight: preflight, executionAdapter: executionAdapter, controller: controller, providerController: providerController, proposalRouter: proposalRouter };
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
        dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaResponseParser"), bootstrap.getModule("VelaProviderAdapter"), bootstrap.getModule("VelaLocalTransport"), bootstrap.getModule("VelaContext"), bootstrap.getModule("VelaValidator"), bootstrap.getModule("VelaPlan"), bootstrap.getModule("VelaExecutionGuard"), bootstrap.getModule("VelaContextBridge"), bootstrap.getModule("VelaExecutionPreflight"), bootstrap.getModule("VelaExecutionAdapter"), bootstrap.getModule("VelaController"), bootstrap.getModule("VelaProviderController"), bootstrap.getModule("VelaProviderProposalRouter"));
        exported = Object.freeze(create(dependencies.protocol, dependencies.parser, dependencies.providerAdapter, dependencies.localTransport, dependencies.context, dependencies.validator, dependencies.plan, dependencies.guard, dependencies.bridge, dependencies.preflight, dependencies.executionAdapter, dependencies.controller, dependencies.providerController, dependencies.proposalRouter));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaResponseParser"), require("./velaProviderAdapter"), require("./velaLocalTransport"), require("./velaContext"), require("./velaValidator"), require("./velaPlan"), require("./velaExecutionGuard"), require("./velaContextBridge"), require("./velaExecutionPreflight"), require("./velaExecutionAdapter"), require("./velaController"), require("./velaProviderController"), require("./velaProviderProposalRouter"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.parser, dependencies.providerAdapter, dependencies.localTransport, dependencies.context, dependencies.validator, dependencies.plan, dependencies.guard, dependencies.bridge, dependencies.preflight, dependencies.executionAdapter, dependencies.controller, dependencies.providerController, dependencies.proposalRouter));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, parserModule, providerAdapterModule, localTransportModule, contextModule, validatorModule, planModule, guardModule, bridgeModule, preflightModule, executionAdapterModule, controllerModule, providerControllerModule, proposalRouterModule) {
    "use strict";

    var MODULE_REVISION = "vela-runtime-v1";
    var HOST_ADAPTER_REVISION = "vela-context-host-v4";
    var hasOwn = Object.prototype.hasOwnProperty;
    var stableErrorCodes = Object.keys(protocolModule.ERROR_CODES).map(function (key) { return protocolModule.ERROR_CODES[key]; });

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
        var preflight = null;
        var executionAdapter = null;
        var controller = null;
        var providerController = null;
        var providerProposalRouter = null;
        var protocolClock = null;
        var runtime = environment || {};
        function safeStatus() {
            var bridgeState = bridge ? bridge.getState() : null;
            return Object.freeze({ state: state, initialized: initialized, disposed: disposed, suspended: suspended, moduleRevision: MODULE_REVISION, hostAdapterRevision: initialized ? HOST_ADAPTER_REVISION : null, bridgeState: Object.freeze({ state: bridgeState ? bridgeState.state : null }), lastErrorCode: lastErrorCode });
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
            if (typeof invokeHost !== "function" || typeof setTimer !== "function" || typeof clearTimer !== "function") { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            if (timeoutMs === undefined) { timeoutMs = 10000; }
            protocol = protocolModule.createProtocol(runtimeOptions);
            contextApi = contextModule.createContextApi(protocol);
            validator = validatorModule.createActionValidator(protocol, { registry: [{ id: "vela", actions: [{ id: "set-opacity-v1", executable: true, risk: "write", targetScope: ["layer", "property"], capabilityRevision: "set-opacity-v1", paramsSchema: { type: "object", additionalProperties: false, required: ["opacity"], properties: { opacity: { type: "number", minimum: 0, maximum: 100 } } } }] }], expressionTemplates: [], scriptAllowlist: [] });
            planStore = planModule.createPlanStore(protocol, { validatorAuthority: validator.authority });
            bridge = bridgeModule.createContextBridge({ protocol: protocol, contextApi: contextApi, invokeHost: invokeHost, runtime: { setTimeout: setTimer, clearTimeout: clearTimer, timeoutMs: timeoutMs } });
            executionAdapter = executionAdapterModule.createExecutionAdapter({ protocol: protocol, contextApi: contextApi, contextBridge: bridge, executionPort: bridgeModule.createExecutionPort(bridge, protocol), invokeHost: invokeHost });
            preflight = preflightModule.createExecutionPreflight({
                protocol: protocol,
                actionValidator: validator,
                planStore: planStore,
                contextBridge: bridge,
                reviewPort: bridgeModule.createReviewPort(bridge, protocol),
                getCurrentExecutionBinding: function () { return { settingsFingerprint: contextApi.fingerprintSettings({}), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: MODULE_REVISION }, lifecycle: "ready", hasVerifier: true }; },
                executeValidatedAction: executionAdapter.executeValidatedAction
            });
            controller = controllerModule.createController({ protocol: protocol, preflight: preflight });
            if (!controllerModule.isTrustedControllerForProtocol(controller, protocol)) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            if (typeof fetchFn !== "function" || typeof TextDecoderCtor !== "function" || typeof root.AbortController !== "function") { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
            var localTransport = localTransportModule.createLocalTransport({ protocol: protocol, fetch: fetchFn, TextDecoder: TextDecoderCtor });
            providerController = providerControllerModule.createProviderController({ protocol: protocol, contextBridge: bridge, transport: localTransport, runtime: { setTimeout: setTimer, clearTimeout: clearTimer, createAbortController: function () { var nativeController = new root.AbortController(); return { signal: nativeController.signal, abort: function () { nativeController.abort(); } }; }, parseUrl: function (value) { var parsed = new root.URL(value); return { protocol: parsed.protocol, hostname: parsed.hostname, port: parsed.port, pathname: parsed.pathname, username: parsed.username, password: parsed.password, search: parsed.search, hash: parsed.hash, href: parsed.href }; }, nowMs: wallClock } });
            providerProposalRouter = proposalRouterModule.createProposalRouter({ protocol: protocol, providerController: providerController, controller: controller });
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
            if (controller) { controller.invalidate("stale"); }
            if (providerController) { providerController.invalidate("idle"); }
            if (bridge) { bridge.suspend(); }
            suspended = true;
            state = "suspended";
            return true;
        }
        function resume() {
            if (disposed || state === "failed" || state !== "suspended") { return false; }
            if (bridge) { bridge.resume(); }
            suspended = false;
            state = initialized ? "ready" : "new";
            return true;
        }
        function resetSession() {
            if (disposed || state !== "ready" || !bridge) { return false; }
            if (controller) { controller.invalidate("idle"); }
            if (providerController) { providerController.invalidate("idle"); }
            bridge.resetSession();
            try { protocolClock.reset(); }
            catch (error) { lastErrorCode = stableErrorCode(error); state = "failed"; return false; }
            return true;
        }
        function dispose() {
            if (disposed) { return false; }
            epoch += 1;
            if (bridge) { try { bridge.suspend(); } catch (ignored) {} }
            if (controller) { try { controller.invalidate("idle"); } catch (ignoredController) {} }
            if (providerController) { try { providerController.invalidate("idle"); } catch (ignoredProvider) {} }
            protocol = null; contextApi = null; validator = null; planStore = null; bridge = null; preflight = null; executionAdapter = null; controller = null; providerController = null; providerProposalRouter = null; protocolClock = null;
            initialized = false; suspended = false; disposed = true; state = "disposed";
            return true;
        }
        function ensureReadyController() {
            if (disposed || state !== "ready" || !controller) { throw safeError(suspended ? "LIFECYCLE_BLOCKED" : "RUNTIME_CAPABILITY_UNAVAILABLE"); }
            return controller;
        }
        function refreshContext() {
            try { return ensureReadyController().refreshContext(); }
            catch (error) { return Promise.reject(error); }
        }
        function createOpacityCandidate(input) {
            try { return ensureReadyController().createOpacityCandidate(input); }
            catch (error) { return Promise.reject(error); }
        }
        function approveCandidate(input) {
            try { return ensureReadyController().approveCandidate(input); }
            catch (error) { return Promise.reject(error); }
        }
        function rejectCandidate(input) {
            try { return Promise.resolve(ensureReadyController().rejectCandidate(input)); }
            catch (error) { return Promise.reject(error); }
        }
        function activeCandidateInput() {
            var source = ensureReadyController().getUiState();
            if (!source || source.state !== "pending-confirmation" || typeof source.candidateId !== "string") { throw safeError("CANDIDATE_STATE_INVALID"); }
            return { candidateId: source.candidateId };
        }
        function approveActiveCandidate() {
            try { return ensureReadyController().approveCandidate(activeCandidateInput()); }
            catch (error) { return Promise.reject(error); }
        }
        function rejectActiveCandidate() {
            try { return Promise.resolve(ensureReadyController().rejectCandidate(activeCandidateInput())); }
            catch (error) { return Promise.reject(error); }
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
        function sendProviderMessage(input) { try { if (disposed || state !== "ready" || !providerController) { throw safeError("RUNTIME_CAPABILITY_UNAVAILABLE"); } return providerController.send(input); } catch (error) { return Promise.reject(error); } }
        function cancelProviderRequest() {
            var providerState;
            try {
                if (!providerController) { return false; }
                providerState = providerController.getUiState();
                return !!providerController.cancel({ requestId: providerState.requestId });
            } catch (error) { return false; }
        }
        function getProviderUiState() { return providerController ? providerController.getUiState() : Object.freeze({ state: disposed ? "disposed" : state, requestId: null, text: null, errorCode: lastErrorCode, proposalCapabilityId: null, suggestedOpacity: null, providerId: "lmstudio", modelId: null, moduleRevision: "vela-provider-controller-v1" }); }
        function getProviderSurfaceState() {
            var source = getProviderUiState();
            var nextState = source && typeof source.state === "string" ? source.state : "failed";
            return Object.freeze({ state: nextState, text: source && typeof source.text === "string" ? source.text : null, errorCode: source && typeof source.errorCode === "string" ? source.errorCode : null, moduleRevision: "vela-provider-surface-v1" });
        }
        function getConfirmationSurfaceState() {
            var source = getUiState();
            var sourceState = source && typeof source.state === "string" ? source.state : "idle";
            var state = sourceState === "pending-confirmation" ? "confirmation-ready" : sourceState === "executing" ? "executing" : sourceState === "consumed" ? "execution-completed" : sourceState === "discarded" ? "rejected" : sourceState === "failed" || sourceState === "stale" ? "execution-failed" : "idle";
            var beforeValue = source && typeof source.beforeValue === "number" && isFinite(source.beforeValue) && source.beforeValue >= 0 && source.beforeValue <= 100 ? source.beforeValue : null;
            var proposedValue = source && typeof source.proposedValue === "number" && isFinite(source.proposedValue) && source.proposedValue >= 0 && source.proposedValue <= 100 ? source.proposedValue : null;
            return Object.freeze({ state: state, beforeValue: beforeValue, proposedValue: proposedValue, errorCode: source && typeof source.errorCode === "string" ? source.errorCode : null, moduleRevision: "vela-confirmation-surface-v1" });
        }
        return Object.freeze({ initialize: initialize, getStatus: safeStatus, suspend: suspend, resume: resume, resetSession: resetSession, dispose: dispose, refreshContext: refreshContext, createOpacityCandidate: createOpacityCandidate, approveCandidate: approveCandidate, rejectCandidate: rejectCandidate, approveActiveCandidate: approveActiveCandidate, rejectActiveCandidate: rejectActiveCandidate, reviewProviderProposal: reviewProviderProposal, getUiState: getUiState, sendProviderMessage: sendProviderMessage, cancelProviderRequest: cancelProviderRequest, getProviderUiState: getProviderUiState, getProviderSurfaceState: getProviderSurfaceState, getConfirmationSurfaceState: getConfirmationSurfaceState });
    }
    return Object.freeze({ createRuntime: createRuntime });
}));
