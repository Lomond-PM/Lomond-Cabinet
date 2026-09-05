(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaProviderAdapter";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertProtocolModule(dependency) {
        if (!dependency || typeof dependency.createProtocol !== "function" || typeof dependency.isTrustedProtocol !== "function" || !dependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaProviderAdapter requires VelaProtocol.");
        }
        return dependency;
    }

    function assertParserModule(dependency) {
        if (!dependency || typeof dependency.createResponseParser !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaProviderAdapter requires VelaResponseParser.");
        }
        return dependency;
    }
    function assertCapabilityContracts(dependency) {
        if (!dependency || typeof dependency.getModelProjection !== "function" || typeof dependency.getRepresentationModelProjection !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaProviderAdapter requires VelaCapabilityContracts.");
        }
        return dependency;
    }

    function assertCapabilityPromptBuilder(dependency) {
        if (!dependency || typeof dependency.buildSystemPrompt !== "function" || typeof dependency.buildTurnContract !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaProviderAdapter requires VelaCapabilityPromptBuilder.");
        }
        return dependency;
    }
    function assertRequestBranchPolicy(dependency) {
        if (!dependency || typeof dependency !== "object" || !Object.isFrozen(dependency)) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaProviderAdapter requires VelaProviderRequestBranchPolicy.");
        }
        return dependency;
    }

    function ownDataDescriptor(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap cannot be inspected."); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap contract is invalid.");
        }
        return descriptor;
    }

    function requireInstalledGlobal(target, name, missingCode) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, name)) {
            if (name in target) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " must be an own browser global."); }
            throw bootstrapError(missingCode, name + " is not loaded.");
        }
        var descriptor = ownDataDescriptor(target, name);
        if (descriptor.configurable !== false || descriptor.writable !== false || descriptor.enumerable !== true ||
            !descriptor.value || !Object.isFrozen(descriptor.value)) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " browser registration is invalid.");
        }
        return descriptor.value;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) {
            if (BOOTSTRAP_NAME in target) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap must be an own browser global."); }
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaProviderAdapter requires the Vela protocol bootstrap.");
        }
        var bootstrapDescriptor = ownDataDescriptor(target, BOOTSTRAP_NAME);
        var bootstrap = bootstrapDescriptor.value;
        if (bootstrapDescriptor.configurable !== false || bootstrapDescriptor.writable !== false || bootstrapDescriptor.enumerable !== false ||
            !bootstrap || !Object.isFrozen(bootstrap)) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap registration is invalid.");
        }
        var getModule = ownDataDescriptor(bootstrap, "getModule").value;
        var hasModule = ownDataDescriptor(bootstrap, "hasModule").value;
        var registerModule = ownDataDescriptor(bootstrap, "registerModule").value;
        if (typeof getModule !== "function" || typeof hasModule !== "function" || typeof registerModule !== "function") {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap methods are invalid.");
        }
        var protocolGlobal = requireInstalledGlobal(target, "VelaProtocol", "RUNTIME_CAPABILITY_UNAVAILABLE");
        var parserGlobal = requireInstalledGlobal(target, "VelaResponseParser", "RUNTIME_CAPABILITY_UNAVAILABLE");
        var capabilityGlobal = requireInstalledGlobal(target, "VelaCapabilityContracts", "RUNTIME_CAPABILITY_UNAVAILABLE");
        var policyGlobal = requireInstalledGlobal(target, "VelaProviderRequestBranchPolicy", "RUNTIME_CAPABILITY_UNAVAILABLE");
        var promptBuilderGlobal = requireInstalledGlobal(target, "VelaCapabilityPromptBuilder", "RUNTIME_CAPABILITY_UNAVAILABLE");
        var hasProtocol;
        var hasParser;
        var hasCapability;
        var hasPolicy;
        var hasPromptBuilder;
        var protocolDependency;
        var parserDependency;
        var capabilityDependency;
        var policyDependency;
        var promptBuilderDependency;
        try {
            hasProtocol = hasModule.call(bootstrap, "VelaProtocol");
            hasParser = hasModule.call(bootstrap, "VelaResponseParser");
            hasCapability = hasModule.call(bootstrap, "VelaCapabilityContracts");
            hasPolicy = hasModule.call(bootstrap, "VelaProviderRequestBranchPolicy");
            hasPromptBuilder = hasModule.call(bootstrap, "VelaCapabilityPromptBuilder");
            protocolDependency = getModule.call(bootstrap, "VelaProtocol");
            parserDependency = getModule.call(bootstrap, "VelaResponseParser");
            capabilityDependency = getModule.call(bootstrap, "VelaCapabilityContracts");
            policyDependency = getModule.call(bootstrap, "VelaProviderRequestBranchPolicy");
            promptBuilderDependency = getModule.call(bootstrap, "VelaCapabilityPromptBuilder");
        } catch (error) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap dependencies are unavailable.");
        }
        if (hasProtocol !== true || hasParser !== true || hasCapability !== true || hasPolicy !== true || hasPromptBuilder !== true || protocolDependency !== protocolGlobal || parserDependency !== parserGlobal || capabilityDependency !== capabilityGlobal || policyDependency !== policyGlobal || promptBuilderDependency !== promptBuilderGlobal) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap dependency identity is invalid.");
        }
        var existingModule;
        try { existingModule = hasModule.call(bootstrap, name) === true ? getModule.call(bootstrap, name) : undefined; }
        catch (error) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela provider module registry is unavailable."); }
        if (existingModule !== undefined) {
            var installed = requireInstalledGlobal(target, name, "MODULE_BOOTSTRAP_CONFLICT");
            if (installed !== existingModule) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " browser identity is invalid."); }
            throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered.");
        }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with the loaded module."); }
        var exported = Object.freeze(create(assertProtocolModule(protocolDependency), assertParserModule(parserDependency), assertCapabilityContracts(capabilityDependency), assertRequestBranchPolicy(policyDependency), assertCapabilityPromptBuilder(promptBuilderDependency)));
        try { registerModule.call(bootstrap, name, exported); }
        catch (error) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " could not be registered."); }
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol")), assertParserModule(require("./velaResponseParser")), assertCapabilityContracts(require("./velaCapabilityContracts")), assertRequestBranchPolicy(require("./velaProviderRequestBranchPolicy")), assertCapabilityPromptBuilder(require("./velaCapabilityPromptBuilder"))));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, parserModule, capabilityContracts, requestBranchPolicy, capabilityPromptBuilder) {
    "use strict";

    var trustedOutboundBodies = new WeakMap();
    var DEFAULT_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";
    var PROVIDER_ID = "lmstudio";
    var PROVIDER_KIND = "openai-compatible";
    var RESPONSE_SCHEMA_IDS = Object.freeze({ TEXT_ONLY: "vela-text-response.v1", EXPLICIT_EDIT_ELIGIBLE: "vela-local-proposal-response.v1", PROPOSAL_CAPABLE_UNION: "vela-bounded-union-response.v1", BOUNDED_LOGICAL_PLAN_ELIGIBLE: "vela-bounded-logical-plan-response.v1" });
    var MODEL_ERROR_NOT_AUTHORIZED = "MODEL_ERROR_NOT_AUTHORIZED";
    var RESPONSE_FORMAT_MODE = "json-schema";
    // SSE includes per-token JSON metadata and framing, unlike canonical terminal JSON.
    // F6 observed upper range: 1,491,362 bytes; 4 MiB leaves 2.81x headroom.
    var RESOURCE_POLICY = Object.freeze({ maxStreamResponseBytes: 4 * 1024 * 1024 });
    var QWEN35_4B_ASSISTANT_POLICY = Object.freeze({ thinkingBudgetTokens: 6144, maxOutputTokens: 8192 });
    var QWEN35_4B_STRUCTURED_POLICY = Object.freeze({ thinkingBudgetTokens: 2048, maxOutputTokens: 4096 });
    function getGenerationPolicy(modelId, requestProfile) {
        // Calibrated LM Studio model identity only; unknown/non-reasoning providers inherit their own defaults.
        if (modelId !== "qwen3.5-4b") { return null; }
        assertRequestProfile(requestProfile);
        return requestProfile === REQUEST_PROFILES.TEXT_ONLY ? QWEN35_4B_ASSISTANT_POLICY : QWEN35_4B_STRUCTURED_POLICY;
    }
    var LMSTUDIO_TEXT_GENERATION_MAX_CHARS = 1024;
    var MIN_TIMEOUT_MS = 1000;
    var MAX_TIMEOUT_MS = 300000;
    var DEFAULT_TIMEOUT_MS = 120000;
    var MAX_MODEL_BYTES = 256;
    var ENDPOINT_PATTERN = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([1-9][0-9]{0,4})\/v1\/chat\/completions$/;
    var PARSED_URL_KEYS = ["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"];
    var TRANSPORT_RESULT_KEYS = ["status", "contentType", "bodyText", "redirected", "finalUrl"];
    var OPENAI_ROOT_KEYS = ["id", "object", "created", "model", "choices", "usage", "system_fingerprint", "stats"];
    var OPENAI_CHOICE_KEYS = ["index", "message", "finish_reason", "logprobs"];
    var OPENAI_MESSAGE_KEYS = ["role", "content", "reasoning_content", "tool_calls"];
    var OPENAI_USAGE_KEYS = ["prompt_tokens", "completion_tokens", "total_tokens", "completion_tokens_details"];
    var OPENAI_COMPLETION_DETAILS_KEYS = ["reasoning_tokens"];
    var MAX_SYSTEM_FINGERPRINT_CODE_UNITS = 256;
    var MAX_DEBUG_TERMINAL_CONTENT_CODE_UNITS = 4096;

    function getRequestProfiles() {
        var profiles;
        var text;
        var explicit;
            var union;
            var logical;
        try {
            profiles = Object.getOwnPropertyDescriptor(requestBranchPolicy, "PROFILES");
            if (!profiles || profiles.get || profiles.set || !Object.prototype.hasOwnProperty.call(profiles, "value") || !Object.isFrozen(profiles.value)) { throw new Error(); }
            text = Object.getOwnPropertyDescriptor(profiles.value, "TEXT_ONLY");
            explicit = Object.getOwnPropertyDescriptor(profiles.value, "EXPLICIT_EDIT_ELIGIBLE");
            union = Object.getOwnPropertyDescriptor(profiles.value, "PROPOSAL_CAPABLE_UNION");
            logical = Object.getOwnPropertyDescriptor(profiles.value, "BOUNDED_LOGICAL_PLAN_ELIGIBLE");
            if (!text || !explicit || !union || !logical || text.get || text.set || explicit.get || explicit.set || union.get || union.set || logical.get || logical.set || text.writable !== false || text.configurable !== false || explicit.writable !== false || explicit.configurable !== false || union.writable !== false || union.configurable !== false || logical.writable !== false || logical.configurable !== false || text.value !== "text-only" || explicit.value !== "explicit-edit-eligible" || union.value !== "proposal-capable-union" || logical.value !== "bounded-logical-plan-eligible") { throw new Error(); }
            return profiles.value;
        } catch (error) { throw configFailure(); }
    }
    var REQUEST_PROFILES = getRequestProfiles();
    // Current compatibility strategies; allowed outputs can compose in future transports.
    function getOutputDecision(profile) {
        assertRequestProfile(profile);
        var nativeText = profile === REQUEST_PROFILES.TEXT_ONLY;
        return Object.freeze({
            allowedOutputs: Object.freeze(nativeText ? ["assistant-text"] :
                (profile === REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE ? ["structured-logical-plan"] :
                (profile === REQUEST_PROFILES.PROPOSAL_CAPABLE_UNION ? ["assistant-text", "structured-proposal"] : ["structured-proposal"]))),
            transportMode: nativeText ? "native-assistant" : "strict-structured",
            presentationMode: nativeText ? "assistant-text" : "structured"
        });
    }
    function assertRequestProfile(value) {
        if (value !== REQUEST_PROFILES.TEXT_ONLY && value !== REQUEST_PROFILES.EXPLICIT_EDIT_ELIGIBLE && value !== REQUEST_PROFILES.PROPOSAL_CAPABLE_UNION && value !== REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE) { throw configFailure(); }
        return value;
    }

    function configFailure(message, stage) {
        return new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.PROVIDER_CONFIG_INVALID, message || "The local provider configuration is invalid.", { stage: stage || "provider-config" });
    }

    function responseFailure(protocol, message) {
        protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, message || "The OpenAI response wrapper is invalid.");
    }

    function hasOwn(value, key) {
        return Object.prototype.hasOwnProperty.call(value, key);
    }

    function ownDataValue(protocol, value, key) {
        try {
            return protocol.getOwnDataProperty(value, key);
        } catch (error) {
            responseFailure(protocol);
        }
    }

    function assertEmptyPlainObject(protocol, value, message) {
        var names;
        if (!protocol.isPlainObject(value)) { responseFailure(protocol, message); }
        try {
            names = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys(value) : Object.getOwnPropertyNames(value);
        } catch (error) {
            responseFailure(protocol, message);
        }
        if (names.length !== 0) { responseFailure(protocol, message); }
    }

    function assertNonNegativeSafeInteger(protocol, value, message) {
        if (!Number.isSafeInteger(value) || value < 0) { responseFailure(protocol, message); }
    }

    function validateInertWrapperMetadata(protocol, wrapper, choice) {
        var usage;
        var details;
        var fingerprint;
        if (hasOwn(choice, "logprobs") && ownDataValue(protocol, choice, "logprobs") !== null) {
            responseFailure(protocol, "The OpenAI choice log probabilities are unsupported.");
        }
        if (hasOwn(wrapper, "stats")) {
            assertEmptyPlainObject(protocol, ownDataValue(protocol, wrapper, "stats"), "The OpenAI response stats are invalid.");
        }
        if (hasOwn(wrapper, "usage")) {
            usage = ownDataValue(protocol, wrapper, "usage");
            if (!protocol.isPlainObject(usage)) { responseFailure(protocol, "The OpenAI response usage is invalid."); }
            protocol.assertNoUnknownKeys(usage, OPENAI_USAGE_KEYS, "provider.openAiUsage");
            ["prompt_tokens", "completion_tokens", "total_tokens"].forEach(function (key) {
                if (hasOwn(usage, key)) { assertNonNegativeSafeInteger(protocol, ownDataValue(protocol, usage, key), "The OpenAI response usage is invalid."); }
            });
            if (hasOwn(usage, "completion_tokens_details")) {
                details = ownDataValue(protocol, usage, "completion_tokens_details");
                if (!protocol.isPlainObject(details)) { responseFailure(protocol, "The OpenAI response completion details are invalid."); }
                protocol.assertNoUnknownKeys(details, OPENAI_COMPLETION_DETAILS_KEYS, "provider.openAiCompletionDetails");
                if (!hasOwn(details, "reasoning_tokens")) { responseFailure(protocol, "The OpenAI response reasoning details are invalid."); }
                assertNonNegativeSafeInteger(protocol, ownDataValue(protocol, details, "reasoning_tokens"), "The OpenAI response reasoning details are invalid.");
            }
        }
        if (hasOwn(wrapper, "system_fingerprint")) {
            fingerprint = ownDataValue(protocol, wrapper, "system_fingerprint");
            if (fingerprint !== null && (typeof fingerprint !== "string" || fingerprint.length > MAX_SYSTEM_FINGERPRINT_CODE_UNITS)) {
                responseFailure(protocol, "The OpenAI system fingerprint is invalid.");
            }
        }
    }

    function ownDataFunction(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { throw configFailure(); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || typeof descriptor.value !== "function") {
            throw configFailure();
        }
        return descriptor.value;
    }

    function ownDataOption(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { throw configFailure(); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) { throw configFailure(); }
        return descriptor.value;
    }

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.validateCanonicalRequest !== "function" || typeof protocol.randomId !== "function") {
            throw configFailure();
        }
        return protocol;
    }

    function validateAbortController(value) {
        if (!value || (typeof value !== "object" && typeof value !== "function")) { throw configFailure(); }
        var signalDescriptor;
        var abortDescriptor;
        try {
            signalDescriptor = Object.getOwnPropertyDescriptor(value, "signal");
            abortDescriptor = Object.getOwnPropertyDescriptor(value, "abort");
        } catch (error) {
            throw configFailure();
        }
        if (!signalDescriptor || signalDescriptor.get || signalDescriptor.set || !Object.prototype.hasOwnProperty.call(signalDescriptor, "value") ||
            !abortDescriptor || abortDescriptor.get || abortDescriptor.set || typeof abortDescriptor.value !== "function") {
            throw configFailure();
        }
        return { signal: signalDescriptor.value, abort: abortDescriptor.value, receiver: value };
    }

    function buildCapabilityParametersForResponse(capability) {
        function copySchema(schema) {
            var result;
            if (!schema || typeof schema !== "object") { throw new Error("CAPABILITY_RESPONSE_SCHEMA_INVALID"); }
            if (schema.type === "object") {
                if (schema.additionalProperties !== false || !Array.isArray(schema.required) || !schema.properties || typeof schema.properties !== "object") { throw new Error("CAPABILITY_RESPONSE_SCHEMA_INVALID"); }
                result = { type: "object", additionalProperties: false, required: schema.required.slice(), properties: {} };
                Object.keys(schema.properties).forEach(function (key) { result.properties[key] = copySchema(schema.properties[key]); });
                return result;
            }
            result = { type: schema.type };
            if (schema.type === "number") { result.minimum = schema.minimum; result.maximum = schema.maximum; }
            if (schema.enum) { result.enum = schema.enum.slice(); }
            return result;
        }
        if (!capability || !capability.parameters) { throw new Error("CAPABILITY_RESPONSE_SCHEMA_INVALID"); }
        return copySchema(capability.parameters);
    }
    function freezeRepresentation(value) {
        if (!value || typeof value !== "object" || Object.isFrozen(value)) { return value; }
        Object.keys(value).forEach(function (key) { freezeRepresentation(value[key]); });
        return Object.freeze(value);
    }
    function buildDormantLocalProposalRepresentationSchema() {
        var opacity = capabilityContracts.getRepresentationModelProjection("set-opacity-v1");
        var layerName = capabilityContracts.getRepresentationModelProjection("set-layer-name-v1");
        function variant(capability) {
            return {
                type: "object",
                additionalProperties: false,
                required: ["type", "proposal"],
                properties: {
                    type: { type: "string", enum: ["localProposal"] },
                    proposal: {
                        type: "object",
                        additionalProperties: false,
                        required: ["capabilityId", "params"],
                        properties: {
                            capabilityId: { type: "string", enum: [capability.capabilityId] },
                            params: buildCapabilityParametersForResponse(capability)
                        }
                    }
                }
            };
        }
        if (!opacity || !layerName) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "Dormant local proposal representation is unavailable."); }
        return freezeRepresentation({ oneOf: [variant(opacity), variant(layerName)] });
    }
    function buildBoundedLogicalPlanRepresentationSchema() {
        var opacity = capabilityContracts.getRepresentationModelProjection("set-opacity-v1");
        var layerName = capabilityContracts.getRepresentationModelProjection("set-layer-name-v1");
        function step(capability) { return { type: "object", additionalProperties: false, required: ["capabilityId", "params"], properties: { capabilityId: { type: "string", enum: [capability.capabilityId] }, params: buildCapabilityParametersForResponse(capability) } }; }
        if (!opacity || !layerName) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "Bounded logical plan representation is unavailable."); }
        return freezeRepresentation({ type: "object", additionalProperties: false, required: ["type", "steps"], properties: { type: { type: "string", enum: ["logicalPlanProposal"] }, steps: { type: "array", minItems: 2, maxItems: 2, items: { oneOf: [step(opacity), step(layerName)] } } } });
    }

    function createLocalOpenAICompatibleProvider(options) {
        options = options || {};
        var protocol = requireProtocol(options.protocol);
        var responseParser;
        try { responseParser = parserModule.createResponseParser(protocol); }
        catch (error) { throw configFailure(); }

        var transport = options.transport;
        var runtime = options.runtime;
        if (!transport || !runtime) { throw configFailure(); }
        var sendJson = ownDataFunction(transport, "sendJson");
        var readStream = options.streaming === true ? ownDataFunction(transport, "readStream") : null;
        var streamAssembler = null;
        var streamEvents = null;
        var onStreamEvent = typeof options.onStreamEvent === "function" ? options.onStreamEvent : null;
        var debugTerminalDiagnostics = options.debugTerminalDiagnostics === true;
        if (options.streaming === true) {
            try { streamAssembler = typeof VelaProviderStreamAssembler !== "undefined" ? VelaProviderStreamAssembler : module["require"]("./velaProviderStreamAssembler"); } catch (streamRequireError) { throw configFailure("The streaming assembler is unavailable.", "provider-stream-assembler"); }
            try { streamEvents = typeof VelaProviderStreamEvents !== "undefined" ? VelaProviderStreamEvents : module["require"]("./velaProviderStreamEvents"); } catch (eventRequireError) { throw configFailure("The stream event contract is unavailable.", "provider-stream-events"); }
        }
        var setTimer = ownDataFunction(runtime, "setTimeout");
        var clearTimer = ownDataFunction(runtime, "clearTimeout");
        var createAbortController = ownDataFunction(runtime, "createAbortController");
        var parseUrl = ownDataFunction(runtime, "parseUrl");
        var nowMs = ownDataFunction(runtime, "nowMs");

        var endpoint = options.endpoint === undefined ? DEFAULT_ENDPOINT : options.endpoint;
        var model = options.model;
        var requestProfile = assertRequestProfile(ownDataOption(options, "requestProfile"));
        var outputDecision = getOutputDecision(requestProfile);
        var timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : options.timeoutMs;
        // Legacy configuration validation only. The profile-owned output decision selects transport.
        var responseFormatMode = options.responseFormatMode === undefined ? RESPONSE_FORMAT_MODE : options.responseFormatMode;
        if (typeof endpoint !== "string" || typeof model !== "string" || responseFormatMode !== RESPONSE_FORMAT_MODE ||
            !Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
            throw configFailure();
        }
        try {
            model = protocol.normalizeString(model);
            if (!model.length || protocol.utf8ByteLength(model) > MAX_MODEL_BYTES) { throw configFailure(); }
        } catch (error) {
            throw configFailure();
        }

        var endpointMatch = ENDPOINT_PATTERN.exec(endpoint);
        if (!endpointMatch || Number(endpointMatch[2]) < 1 || Number(endpointMatch[2]) > 65535) { throw configFailure(); }
        var parsedUrl;
        try { parsedUrl = protocol.cloneJson(parseUrl(endpoint), { maxBytes: protocol.HARD_LIMITS.maxStringBytes }); }
        catch (error) { throw configFailure(); }
        if (!protocol.isPlainObject(parsedUrl)) { throw configFailure(); }
        try { protocol.assertNoUnknownKeys(parsedUrl, PARSED_URL_KEYS, "provider.endpoint"); }
        catch (error) { throw configFailure(); }
        var parsedHost = parsedUrl.hostname === "[::1]" ? "::1" : parsedUrl.hostname;
        var lexicalHost = endpointMatch[1] === "[::1]" ? "::1" : endpointMatch[1];
        if (parsedUrl.protocol !== "http:" || parsedHost !== lexicalHost || parsedUrl.port !== endpointMatch[2] ||
            parsedUrl.pathname !== "/v1/chat/completions" || parsedUrl.username !== "" || parsedUrl.password !== "" ||
            parsedUrl.search !== "" || parsedUrl.hash !== "" || parsedUrl.href !== endpoint) {
            throw configFailure();
        }

        try { validateAbortController(createAbortController()); }
        catch (error) { throw configFailure(); }

        var capabilities = Object.freeze({ chat: true, jsonSchema: true, streaming: options.streaming === true, cancellation: true });
        var state = "idle";
        var activeRequest = null;
        var generation = 0;
        var usedRequestIds = new Set();
        var diagnostics = Object.freeze({ providerId: PROVIDER_ID, modelId: model, requestId: null, state: state, elapsedMs: 0, httpStatus: null, errorCode: null, terminalFailureBoundary: null });
        var terminalDebugEvidence = null;
        var contextEvidenceEnabled = options.debugContextEvidence === true;
        var contextEvidence = null;

        // Local, opt-in construction evidence. Never fed back to request/admission owners.
        function recordContextEvidence(requestId, request, body, error) {
            if (!contextEvidenceEnabled) { return; }
            try {
                var canonicalJson = request && body ? JSON.stringify(request) : null;
                var serializeEvidence = ownDataFunction(transport, "getSerializedRequestEvidence");
                var wireJson = body && serializeEvidence ? serializeEvidence(body) : null;
                var budgetFailure = error && (error.code === protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED);
                var projected = {
                    schema: "vela.provider-input-evidence.v1",
                    authorityCapable: false,
                    closure: body ? "closed" : budgetFailure ? "budget-rejected" : "construction-failed",
                    correlation: { requestId: requestId, providerGeneration: generation + 1, model: model, profile: requestProfile, runtimeInvocationId: null, objectiveId: null, sessionId: null, turnId: null, unavailableReason: "not-supplied-through-local-wiring" },
                    freshnessClass: "B-invocation-selected",
                    canonicalRequestJson: canonicalJson,
                    wireRequestJson: wireJson,
                    wireEvidenceUnavailableReason: wireJson === null ? "transport-projection-unavailable-or-input-not-closed" : null,
                    budget: { canonicalUtf8Bytes: canonicalJson === null ? null : protocol.utf8ByteLength(canonicalJson), wireUtf8Bytes: wireJson === null ? null : protocol.utf8ByteLength(wireJson), messageContentUtf8Bytes: request && body ? request.messages.map(function (message) { return protocol.utf8ByteLength(message.content); }) : null, requestByteCeiling: protocol.HARD_LIMITS.maxRequestJsonBytes, messageByteCeiling: protocol.HARD_LIMITS.maxMessageBytes, tokenCost: null, modelContextCapacity: null, unknownReason: "not-measured-by-byte-budget" },
                    sources: body ? [
                        { domain: "local-instruction", producer: "VelaCapabilityPromptBuilder.buildSystemPrompt", representation: "canonical.messages[0]", selectionReason: "current-profile-instructions", trustClass: "local-control-record", sourceFreshnessClass: null },
                        { domain: "local-response-contract", producer: "VelaProviderAdapter.assembleMessages", representation: "canonical.messages[1]", selectionReason: "current-turn-contract-and-grounding-envelope", trustClass: "derived-record", sourceFreshnessClass: null },
                        { domain: "user-input", producer: "VelaProviderAdapter.buildRequest", representation: "canonical.messages[2..]", selectionReason: "caller-supplied-current-input", trustClass: "untrusted-content", sourceFreshnessClass: null }
                    ] : [],
                    errorCode: error && typeof error.code === "string" ? error.code : null
                };
                if (protocol.utf8ByteLength(JSON.stringify(projected)) > 512 * 1024) { contextEvidence = null; return; }
                contextEvidence = protocol.deepFreeze(projected);
            } catch (ignoredEvidence) { contextEvidence = null; }
        }

        function getCapabilityModelSpec() {
            var capability = capabilityContracts.getModelProjection("set-opacity-v1");
            var parameters;
            var paths;
            var parameterName;
            var parameterSchema;
            if (!capability || !capability.parameters || capability.parameters.type !== "object" || capability.parameters.additionalProperties !== false ||
                !Array.isArray(capability.parameters.required) || !capability.parameters.properties || !capability.modelPolicy ||
                capability.modelPolicy.responseType !== protocol.ENVELOPE_TYPES.LOCAL_PROPOSAL || !Array.isArray(capability.modelPolicy.modelMaySupply) ||
                capability.modelPolicy.modelMaySupply.length !== 1) {
                protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Capability contract is unavailable.");
            }
            parameters = capability.parameters;
            paths = capability.modelPolicy.modelMaySupply;
            if (typeof paths[0] !== "string" || paths[0].indexOf("params.") !== 0 || paths[0].split(".").length !== 2) {
                protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Capability contract model projection is invalid.");
            }
            parameterName = paths[0].slice("params.".length);
            if (!Object.prototype.hasOwnProperty.call(parameters.properties, parameterName) || parameters.required.indexOf(parameterName) === -1) {
                protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Capability contract model parameter is invalid.");
            }
            parameterSchema = parameters.properties[parameterName];
            if (!parameterSchema || parameterSchema.type !== "number" || parameterSchema.minimum !== 0 || parameterSchema.maximum !== 100) {
                protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Capability contract model range is invalid.");
            }
            return { capability: capability, parameters: parameters, parameterName: parameterName };
        }

        getCapabilityModelSpec();

        function issueUniqueRequestId() {
            var attempts = 1 + protocol.HARD_LIMITS.maxIdCollisionRetries;
            while (attempts > 0) {
                var requestId = protocol.randomId("req");
                if (!usedRequestIds.has(requestId)) {
                    usedRequestIds.add(requestId);
                    return requestId;
                }
                attempts -= 1;
            }
            throw configFailure("The local provider could not issue a unique request id.", "provider-request-id");
        }

        function safeNow(fallback) {
            try {
                var value = nowMs();
                return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0) ? value : fallback;
            } catch (error) {
                return fallback;
            }
        }

        function readNowMs() {
            var value;
            try { value = nowMs(); }
            catch (error) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, undefined, { stage: "provider-clock" }); }
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) { throw new protocol.VelaProtocolError(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, undefined, { stage: "provider-clock" }); }
            return value;
        }

        function safeElapsed(record) {
            var value = safeNow(record.startedAt) - record.startedAt;
            if (!Number.isFinite(value) || value < 0 || Object.is(value, -0)) { return 0; }
            value = Math.floor(value);
            return value > protocol.HARD_LIMITS.maxNumberAbs ? protocol.HARD_LIMITS.maxNumberAbs : value;
        }

        function safeHttpStatus(value) {
            return Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
        }

        function makeDiagnostics(record, nextState, httpStatus, errorCode, elapsedValue, failureBoundary) {
            return Object.freeze({
                providerId: PROVIDER_ID,
                modelId: model,
                requestId: record ? record.requestId : null,
                state: nextState,
                elapsedMs: record ? (elapsedValue === undefined ? safeElapsed(record) : elapsedValue) : 0,
                httpStatus: safeHttpStatus(httpStatus),
                errorCode: errorCode || null,
                terminalFailureBoundary: failureBoundary || null
            });
        }

        function recordTerminalDebugEvidence(record, fields) {
            var terminalContent = null;
            var parsedTerminal = null;
            var actualEnvelopeType = null;
            var actualProtocol = null;
            var actualSchemaVersion = null;
            if (!debugTerminalDiagnostics || !record) { return; }
            fields = fields || {};
            if (fields.parserOutcome === "rejected" && typeof fields.assembledContent === "string") {
                terminalContent = fields.assembledContent.slice(0, MAX_DEBUG_TERMINAL_CONTENT_CODE_UNITS);
                try { parsedTerminal = responseParser.parseProviderJson(fields.assembledContent); }
                catch (ignoredParse) { parsedTerminal = null; }
                if (protocol.isPlainObject(parsedTerminal)) {
                    actualEnvelopeType = typeof parsedTerminal.envelope === "object" && parsedTerminal.envelope !== null && typeof parsedTerminal.envelope.type === "string" ? parsedTerminal.envelope.type : null;
                    actualProtocol = typeof parsedTerminal.protocol === "string" ? parsedTerminal.protocol : null;
                    actualSchemaVersion = typeof parsedTerminal.schemaVersion === "string" ? parsedTerminal.schemaVersion : null;
                }
            }
            terminalDebugEvidence = Object.freeze({
                requestProfile: requestProfile,
                outputDecision: outputDecision,
                responseSchemaPresent: record.responseSchemaPresent === true,
                transportMode: options.streaming === true ? "stream" : "json",
                streamDone: fields.streamDone === true,
                assembledTextChars: Number.isSafeInteger(fields.assembledTextChars) && fields.assembledTextChars >= 0 ? fields.assembledTextChars : null,
                assembledReasoningChars: Number.isSafeInteger(fields.assembledReasoningChars) && fields.assembledReasoningChars >= 0 ? fields.assembledReasoningChars : null,
                assembledStructuredChars: Number.isSafeInteger(fields.assembledStructuredChars) && fields.assembledStructuredChars >= 0 ? fields.assembledStructuredChars : null,
                parserOutcome: fields.parserOutcome === "accepted" || fields.parserOutcome === "rejected" ? fields.parserOutcome : null,
                expectedEnvelopeType: requestProfile === REQUEST_PROFILES.TEXT_ONLY ? "text" : (requestProfile === REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE ? "logicalPlanProposal" : "localProposal"),
                actualEnvelopeType: actualEnvelopeType,
                actualProtocol: actualProtocol,
                actualSchemaVersion: actualSchemaVersion,
                terminalContentPreview: terminalContent,
                terminalContentTruncated: terminalContent !== null && fields.assembledContent.length > terminalContent.length,
                markdownFencePresent: terminalContent !== null && /```/.test(terminalContent)
                ,transportDiagnostics: fields.transportDiagnostics || null
                ,assemblerFinishEntered: record.assemblerFinishEntered === true
                ,terminalParserEntered: record.terminalParserEntered === true
            });
        }

        function canonicalError(code, requestId) {
            try {
                return protocol.createCanonicalErrorResponse(new protocol.VelaProtocolError(code, undefined, { stage: "provider" }), {
                    requestId: requestId || "unknown",
                    provider: PROVIDER_ID,
                    model: model
                });
            } catch (error) {
                var messages = {};
                messages[protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID] = "The local provider configuration is invalid.";
                messages[protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED] = "The local provider request was cancelled.";
                messages[protocol.ERROR_CODES.PROVIDER_TIMEOUT] = "The local provider request timed out.";
                messages[protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED] = "The local provider connection failed.";
                messages[protocol.ERROR_CODES.PROVIDER_HTTP_ERROR] = "The local provider returned an HTTP error.";
                messages[protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID] = "The local provider response is invalid.";
                messages[protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE] = "The local provider response exceeded its size limit.";
                var errorValue = Object.freeze({ code: code, details: Object.freeze({}), message: messages[code] || "The local provider request failed.", retryable: false, stage: "provider" });
                return Object.freeze({
                    envelope: Object.freeze({ error: errorValue, type: "error" }),
                    model: model,
                    protocol: protocol.PROTOCOLS.RESPONSE,
                    provider: PROVIDER_ID,
                    requestId: requestId || "unknown",
                    schemaVersion: protocol.SCHEMA_VERSION
                });
            }
        }

        function isCurrentPending(record, capturedGeneration) {
            return activeRequest === record && activeRequest.generation === capturedGeneration && record.state === "pending";
        }

        function finishRequest(record, capturedGeneration, nextState, response, fields) {
            if (!isCurrentPending(record, capturedGeneration)) { return false; }
            fields = fields || {};
            finishPresentation(record, nextState === "completed" ? "stream-completed" : nextState === "cancelled" ? "stream-cancelled" : "stream-failed", nextState === "completed" || nextState === "cancelled" ? null : fields.errorCode, fields.failureBoundary);
            record.state = nextState;
            record.settled = true;
            state = nextState;
            activeRequest = null;
            var timerId = record.timerId;
            record.timerId = null;
            diagnostics = makeDiagnostics(record, nextState, fields.httpStatus, fields.errorCode, undefined, fields.failureBoundary);
            recordTerminalDebugEvidence(record, fields.debugEvidence || record.debugEvidence);
            if (timerId !== null) {
                try { clearTimer(timerId); } catch (error) { /* terminal state remains authoritative */ }
            }
            if (fields.abort === true) {
                try { record.controller.abort.call(record.controller.receiver); } catch (error) { /* terminal state remains authoritative */ }
            }
            try { record.resolve(response); } catch (error) { /* Promise resolve is treated as non-observable */ }
            return true;
        }

        function emitStreamEvent(record, type, errorCode, failureBoundary, text) {
            var value;
            if (!onStreamEvent || !record || options.streaming !== true) { return; }
            value = { type: type, requestId: record.requestId, generation: record.generation, providerId: PROVIDER_ID, modelId: model };
            if (type === "text-delta" || type === "reasoning-delta") { value.text = text; }
            if (type === "stream-failed") { value.errorCode = errorCode || protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID; if (failureBoundary) { value.failureBoundary = failureBoundary; } }
            try { onStreamEvent(streamEvents.canonicalize(value)); } catch (ignoredListener) { /* presentation listeners are non-authoritative */ }
        }

        function finishPresentation(record, type, errorCode, failureBoundary) {
            if (options.streaming !== true || record.presentationTerminal) { return false; }
            record.presentationTerminal = true;
            emitStreamEvent(record, type, errorCode, failureBoundary);
            return true;
        }

        function finishWithError(record, capturedGeneration, nextState, code, httpStatus, abort, failureBoundary) {
            return finishRequest(record, capturedGeneration, nextState, canonicalError(code, record.requestId), {
                abort: abort === true,
                errorCode: code,
                httpStatus: httpStatus,
                failureBoundary: failureBoundary || null
            });
        }

        function responseMetadata(requestId) {
            return Object.freeze({
                protocol: protocol.PROTOCOLS.RESPONSE,
                schemaVersion: protocol.SCHEMA_VERSION,
                requestId: requestId,
                provider: PROVIDER_ID,
                model: model
            });
        }

        function enumString(value) {
            return { type: "string", enum: [value] };
        }

        function buildResponseJsonSchema(requestId) {
            var metadata = responseMetadata(requestId);
            var modelSpec = getCapabilityModelSpec();
            var capability = modelSpec.capability;
            var textEnvelope = {
                type: "object",
                description: "Normal conversation, questions, current-value queries, explanations, suggestions, and ambiguity; never invent a value or use an explicit direct one-target opacity command. The root envelope remains required.",
                additionalProperties: false,
                required: ["type", "text"],
                properties: {
                    type: enumString(protocol.ENVELOPE_TYPES.TEXT),
                    text: { type: "string", minLength: 1, maxLength: LMSTUDIO_TEXT_GENERATION_MAX_CHARS }
                }
            };
            var localProposalEnvelope = buildDormantLocalProposalRepresentationSchema();
            var logicalPlanEnvelope = buildBoundedLogicalPlanRepresentationSchema();
            var envelope = requestProfile === REQUEST_PROFILES.TEXT_ONLY ? textEnvelope : (requestProfile === REQUEST_PROFILES.EXPLICIT_EDIT_ELIGIBLE ? localProposalEnvelope : (requestProfile === REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE ? logicalPlanEnvelope : { oneOf: [textEnvelope, localProposalEnvelope] }));
            return protocol.deepFreeze({
                name: requestProfile === REQUEST_PROFILES.TEXT_ONLY ? "vela_text_response" : (requestProfile === REQUEST_PROFILES.EXPLICIT_EDIT_ELIGIBLE ? "vela_local_proposal_response" : (requestProfile === REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE ? "vela_bounded_logical_plan_response" : "vela_bounded_union_response")),
                strict: true,
                schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["protocol", "schemaVersion", "requestId", "provider", "model", "envelope"],
                    properties: {
                        protocol: enumString(metadata.protocol),
                        schemaVersion: enumString(metadata.schemaVersion),
                        requestId: enumString(metadata.requestId),
                        provider: enumString(metadata.provider),
                        model: enumString(metadata.model),
                        envelope: envelope
                    }
                }
            });
        }

        function promptContract(requestId) {
            var metadata = responseMetadata(requestId);
            var modelSpec = getCapabilityModelSpec();
            return Object.freeze({
                systemPrompt: capabilityPromptBuilder.buildSystemPrompt(modelSpec.capability, requestProfile),
                turnContract: capabilityPromptBuilder.buildTurnContract(modelSpec.capability, metadata.requestId, metadata.model, requestProfile)
            });
        }

        function assembleMessages(messages, contract) {
            var grounding = "unavailable";
            var remaining = messages.slice();
            var assistantContent;
            if (remaining.length && remaining[0].role === "assistant") { grounding = remaining.shift().content; }
            assistantContent = JSON.stringify({ turnResponseContract: contract.turnContract, trustedGrounding: grounding });
            assistantContent = protocol.assertString(assistantContent, "provider assistant turn message", protocol.HARD_LIMITS.maxMessageBytes);
            return [{ role: "system", content: contract.systemPrompt }, { role: "assistant", content: assistantContent }].concat(remaining);
        }

        function buildRequest(input, requestId) {
            protocol.assertSafeJson(input);
            if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider input must be an object."); }
            protocol.assertNoUnknownKeys(input, ["messages", "context"], "provider.input");
            if (!Array.isArray(input.messages)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider messages must be an array."); }
            var messages = input.messages.map(function (message, index) {
                if (!protocol.isPlainObject(message)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider message is invalid.", { details: { index: index } }); }
                protocol.assertNoUnknownKeys(message, ["role", "content"], "provider.input.messages[" + index + "]");
                if (message.role !== "user" && message.role !== "assistant") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider message role is invalid."); }
                return { role: message.role, content: protocol.assertString(message.content, "provider message", protocol.HARD_LIMITS.maxMessageBytes) };
            });
            if (!protocol.isPlainObject(input.context)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider context is invalid."); }
            protocol.assertNoUnknownKeys(input.context, ["contextId", "fingerprint", "tier"], "provider.input.context");
            var context = {
                contextId: protocol.assertNonEmptyString(input.context.contextId, "provider.context.contextId"),
                fingerprint: protocol.assertFingerprint(input.context.fingerprint, "provider.context.fingerprint"),
                tier: input.context.tier
            };
            if (!Number.isInteger(context.tier) || context.tier < 0 || context.tier > 3) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Provider context tier is invalid."); }
            var contract = promptContract(requestId);
            var request = {
                protocol: protocol.PROTOCOLS.REQUEST,
                schemaVersion: protocol.SCHEMA_VERSION,
                requestId: requestId,
                model: model,
                messages: assembleMessages(messages, contract),
                // Internal canonical contract; this is not the model's transport format.
                responseFormat: { type: "json_object", schemaId: requestProfile === REQUEST_PROFILES.TEXT_ONLY ? RESPONSE_SCHEMA_IDS.TEXT_ONLY : (requestProfile === REQUEST_PROFILES.EXPLICIT_EDIT_ELIGIBLE ? RESPONSE_SCHEMA_IDS.EXPLICIT_EDIT_ELIGIBLE : (requestProfile === REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE ? RESPONSE_SCHEMA_IDS.BOUNDED_LOGICAL_PLAN_ELIGIBLE : RESPONSE_SCHEMA_IDS.PROPOSAL_CAPABLE_UNION)) },
                context: context
            };
            protocol.validateCanonicalRequest(request);
            return protocol.deepFreeze(protocol.cloneJson(request, { maxBytes: protocol.HARD_LIMITS.maxRequestJsonBytes }));
        }

        function buildOpenAiBody(request) {
            var body = {
                model: model,
                messages: request.messages,
                stream: false
            };
            if (outputDecision.transportMode === "strict-structured") {
                body.response_format = {
                    type: "json_schema",
                    json_schema: buildResponseJsonSchema(request.requestId)
                };
            }
            if (options.streaming === true) { body.stream = true; }
            var generationPolicy = getGenerationPolicy(model, requestProfile);
            if (generationPolicy) {
                // Preserve the operator's reasoning on/off choice. max_tokens is shared by thinking and final output.
                body.thinking_budget_tokens = generationPolicy.thinkingBudgetTokens;
                body.max_tokens = generationPolicy.maxOutputTokens;
            }
            var serialized = JSON.stringify(body);
            if (typeof serialized !== "string" || protocol.utf8ByteLength(serialized) > protocol.HARD_LIMITS.maxRequestJsonBytes) {
                protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "The local provider request exceeds its size limit.");
            }
            body = protocol.deepFreeze(body);
            trustedOutboundBodies.set(body, Object.freeze({ protocol: protocol, transport: transport }));
            return body;
        }

        function snapshotTransportResponse(value) {
            if (!protocol.isPlainObject(value)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The transport response is invalid."); }
            protocol.assertNoUnknownKeys(value, TRANSPORT_RESULT_KEYS, "provider.transportResponse");
            var status = protocol.getOwnDataProperty(value, "status");
            var contentType = protocol.getOwnDataProperty(value, "contentType");
            var bodyText = protocol.getOwnDataProperty(value, "bodyText");
            var redirected = protocol.getOwnDataProperty(value, "redirected");
            var finalUrl = protocol.getOwnDataProperty(value, "finalUrl");
            if (!Number.isInteger(status) || status < 100 || status > 599 || typeof contentType !== "string" || typeof bodyText !== "string" || typeof redirected !== "boolean" || typeof finalUrl !== "string") {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The transport response fields are invalid.");
            }
            return Object.freeze({
                status: status,
                contentType: contentType,
                bodyText: bodyText,
                redirected: redirected,
                finalUrl: finalUrl
            });
        }

        function validateTransportResponse(snapshot, requestId, setFailureBoundary) {
            var status = snapshot.status;
            var bodyText = snapshot.bodyText;
            if (status !== 200) { protocol.fail(protocol.ERROR_CODES.PROVIDER_HTTP_ERROR, "The local provider returned an HTTP error.", { details: { actualType: String(status) } }); }
            if (snapshot.redirected !== false || snapshot.finalUrl !== endpoint) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The local provider redirect result is invalid."); }
            if (!/^application\/json(?:\s*;\s*[^;]+=[^;]+)*\s*$/i.test(snapshot.contentType)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The local provider content type is invalid."); }
            if (protocol.utf8ByteLength(bodyText) > protocol.HARD_LIMITS.maxResponseJsonBytes) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE, "The local provider response is too large."); }
            var trimmed = bodyText.trim();
            if (!trimmed || trimmed[0] !== "{") { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI response wrapper is invalid."); }
            var wrapper;
            try { wrapper = responseParser.parseProviderJson(trimmed); }
            catch (error) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI response wrapper is invalid."); }
            if (!protocol.isPlainObject(wrapper)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI response wrapper is invalid."); }
            protocol.assertNoUnknownKeys(wrapper, OPENAI_ROOT_KEYS, "provider.openAiResponse");
            if (!Array.isArray(wrapper.choices) || wrapper.choices.length !== 1) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI response must contain one choice."); }
            var choice = wrapper.choices[0];
            if (!protocol.isPlainObject(choice)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI choice is invalid."); }
            protocol.assertNoUnknownKeys(choice, OPENAI_CHOICE_KEYS, "provider.openAiChoice");
            if (typeof choice.finish_reason === "string" && choice.finish_reason !== "stop") {
                responseFailure(protocol, "The provider did not complete its response normally.");
            }
            validateInertWrapperMetadata(protocol, wrapper, choice);
            var message = choice.message;
            if (!protocol.isPlainObject(message)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant message is invalid."); }
            protocol.assertNoUnknownKeys(message, OPENAI_MESSAGE_KEYS, "provider.openAiMessage");
            if (Object.prototype.hasOwnProperty.call(message, "function_call")) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant message contains unsupported calls."); }
            if (Object.prototype.hasOwnProperty.call(message, "reasoning_content") && message.reasoning_content !== null && typeof message.reasoning_content !== "string") {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant reasoning metadata is invalid.");
            }
            if (Object.prototype.hasOwnProperty.call(message, "tool_calls") && (!Array.isArray(message.tool_calls) || message.tool_calls.length !== 0)) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant message contains unsupported calls.");
            }
            if (message.role !== "assistant" || typeof message.content !== "string" || !message.content.trim()) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant content is invalid.");
            }
            setFailureBoundary("content-response");
            if (outputDecision.transportMode === "native-assistant") {
                return normalizeAssistantTextResponse(message.content, requestId);
            }
            var rawCanonical;
            try { rawCanonical = responseParser.parseProviderJson(message.content); }
            catch (error) { rawCanonical = null; }
            if (rawCanonical && protocol.isPlainObject(rawCanonical) &&
                (rawCanonical.protocol !== protocol.PROTOCOLS.RESPONSE || rawCanonical.schemaVersion !== protocol.SCHEMA_VERSION ||
                 rawCanonical.requestId !== requestId || rawCanonical.provider !== PROVIDER_ID || rawCanonical.model !== model)) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The Vela response metadata is invalid.");
            }
            var parsed = responseParser.parseProviderResponse(message.content, { requestId: requestId, provider: PROVIDER_ID, model: model });
            if (!parsed.ok) { return { response: parsed.response, parserErrorCode: parsed.error.code }; }
            if (parsed.response.protocol !== protocol.PROTOCOLS.RESPONSE || parsed.response.schemaVersion !== protocol.SCHEMA_VERSION ||
                parsed.response.requestId !== requestId || parsed.response.provider !== PROVIDER_ID || parsed.response.model !== model) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The Vela response metadata is invalid.");
            }
            if (parsed.response.envelope.type === protocol.ENVELOPE_TYPES.ERROR) {
                setFailureBoundary("profile-validation");
                return { response: canonicalError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, requestId), parserErrorCode: MODEL_ERROR_NOT_AUTHORIZED };
            }
            if ((requestProfile === REQUEST_PROFILES.TEXT_ONLY && parsed.response.envelope.type !== protocol.ENVELOPE_TYPES.TEXT) ||
                (requestProfile === REQUEST_PROFILES.EXPLICIT_EDIT_ELIGIBLE && parsed.response.envelope.type !== protocol.ENVELOPE_TYPES.LOCAL_PROPOSAL) ||
                (requestProfile === REQUEST_PROFILES.BOUNDED_LOGICAL_PLAN_ELIGIBLE && parsed.response.envelope.type !== protocol.ENVELOPE_TYPES.LOGICAL_PLAN_PROPOSAL)) {
                setFailureBoundary("profile-validation");
                return { response: canonicalError(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, requestId), parserErrorCode: protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID };
            }
            var canonical = {
                protocol: protocol.PROTOCOLS.RESPONSE,
                schemaVersion: protocol.SCHEMA_VERSION,
                requestId: requestId,
                provider: PROVIDER_ID,
                model: model,
                envelope: parsed.response.envelope
            };
            protocol.validateCanonicalResponse(canonical);
            return { response: protocol.deepFreeze(protocol.cloneJson(canonical, { maxBytes: protocol.HARD_LIMITS.maxResponseJsonBytes })), parserErrorCode: null };
        }

        function start(input) {
            if (activeRequest && activeRequest.state === "pending") {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_REQUEST_IN_FLIGHT, "A local provider request is already in flight.", { stage: "provider" });
            }
            var requestId = issueUniqueRequestId();
            var request;
            var body;
            try { request = buildRequest(input, requestId); body = buildOpenAiBody(request); }
            catch (constructionError) { recordContextEvidence(requestId, null, null, constructionError); throw constructionError; }
            recordContextEvidence(requestId, request, body, null);
            var startedAt = readNowMs();
            var controller;
            try { controller = validateAbortController(createAbortController()); }
            catch (error) { throw configFailure(); }
            var resolvePromise;
            var promise = new Promise(function (resolve) { resolvePromise = resolve; });
            var nextGeneration = generation + 1;
            var record = {
                generation: nextGeneration,
                requestId: requestId,
                state: "pending",
                startedAt: startedAt,
                timerId: null,
                controller: controller,
                resolve: resolvePromise,
                settled: false,
                presentationTerminal: false,
                responseSchemaPresent: body.response_format && body.response_format.type === "json_schema",
                assemblerFinishEntered: false,
                terminalParserEntered: false,
                debugEvidence: null
            };
            var transportInput = protocol.deepFreeze({
                url: endpoint,
                method: "POST",
                headers: protocol.deepFreeze({ "Content-Type": "application/json" }),
                body: body,
                maxRequestBytes: protocol.HARD_LIMITS.maxRequestJsonBytes,
                maxResponseBytes: options.streaming === true ? RESOURCE_POLICY.maxStreamResponseBytes : protocol.HARD_LIMITS.maxResponseJsonBytes,
                allowRedirects: false
            });
            var privateAssembler = options.streaming === true ? streamAssembler.create({ onDelta: function (channel, deltaText) { if (isCurrentPending(record, capturedGeneration)) { emitStreamEvent(record, channel === "reasoning" ? "reasoning-delta" : "text-delta", null, null, deltaText); } } }) : null;
            var requestForTransportValue = {
                url: transportInput.url,
                method: transportInput.method,
                headers: transportInput.headers,
                body: transportInput.body,
                signal: controller.signal,
                maxRequestBytes: transportInput.maxRequestBytes,
                maxResponseBytes: transportInput.maxResponseBytes,
                allowRedirects: transportInput.allowRedirects
            };
            if (options.streaming === true) {
                requestForTransportValue.onChunk = function (decodedText) {
                    if (!isCurrentPending(record, capturedGeneration)) { return false; }
                    privateAssembler.feed(decodedText);
                    return privateAssembler.getState().done === true;
                };
                if (debugTerminalDiagnostics) {
                    requestForTransportValue.onTransportDiagnostic = function (transportDiagnostic) {
                        var assemblerState = privateAssembler.getState();
                        record.debugEvidence = { transportDiagnostics: Object.freeze({ requestId: record.requestId, generation: record.generation, httpStatus: transportDiagnostic.httpStatus, contentType: transportDiagnostic.contentType, bytesRead: transportDiagnostic.bytesRead, decodedChunkCount: transportDiagnostic.decodedChunkCount, sseFrameCount: assemblerState.frameCount, assemblerDone: assemblerState.done, doneObserved: assemblerState.done, finishReasonObserved: assemblerState.finishReasonObserved, lastValidFrameType: assemblerState.lastValidFrameType, trailingBufferLength: assemblerState.trailingBufferLength, readerErrorName: transportDiagnostic.readerErrorName, readerErrorMessage: transportDiagnostic.readerErrorMessage, abortSignaled: transportDiagnostic.abortSignaled, requestState: record.state, earlyStopped: transportDiagnostic.earlyStopped }) };
                    };
                }
            }
            var requestForTransport = Object.freeze(requestForTransportValue);
            var pendingDiagnostics = makeDiagnostics(record, "pending", null, null, 0, null);

            generation = nextGeneration;
            activeRequest = record;
            state = "pending";
            diagnostics = pendingDiagnostics;

            var capturedGeneration = record.generation;
            try {
                var timerId = setTimer(function () {
                    finishWithError(record, capturedGeneration, "timed-out", protocol.ERROR_CODES.PROVIDER_TIMEOUT, null, true);
                }, timeoutMs);
                if (isCurrentPending(record, capturedGeneration)) {
                    record.timerId = timerId;
                } else {
                    try { clearTimer(timerId); } catch (error) { /* terminal state remains authoritative */ }
                }
            } catch (error) {
                finishWithError(record, capturedGeneration, "failed", protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, null, false);
                return Object.freeze({ requestId: requestId, promise: promise });
            }

            Promise.resolve().then(function () {
                if (!isCurrentPending(record, capturedGeneration)) { return undefined; }
                var pending;
                if (options.streaming === true) { emitStreamEvent(record, "stream-started"); }
                try { pending = options.streaming === true ? readStream(requestForTransport) : sendJson(requestForTransport); }
                finally { trustedOutboundBodies.delete(body); }
                if (!pending || (typeof pending !== "object" && typeof pending !== "function") || typeof pending.then !== "function") {
                    throw new Error("The transport did not return a Promise-like value.");
                }
                return pending;
            }).then(function (transportResponse) {
                if (!isCurrentPending(record, capturedGeneration)) { return; }
                var snapshot;
                try { snapshot = snapshotTransportResponse(transportResponse); }
                catch (error) {
                    finishWithError(record, capturedGeneration, "failed", protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, null, false, "outer-response");
                    return;
                }
                var result;
                var failureBoundary = "outer-response";
                if (options.streaming === true) {
                    try {
                        record.assemblerFinishEntered = true;
                        var streamResult = privateAssembler.finish();
                        var assemblerState = privateAssembler.getState();
                        snapshot = Object.freeze({ status: snapshot.status, contentType: "application/json", bodyText: JSON.stringify({ choices: [{ message: { role: "assistant", content: streamResult.text, reasoning_content: streamResult.reasoning || null }, finish_reason: assemblerState.finishReasonObserved || "stop" }] }), redirected: snapshot.redirected, finalUrl: snapshot.finalUrl });
                        finishPresentation(record, "stream-completed");
                    } catch (streamError) {
                        finishWithError(record, capturedGeneration, "failed", protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, snapshot.status, false, "stream-assembly");
                        return;
                    }
                }
                try { record.terminalParserEntered = true; result = validateTransportResponse(snapshot, requestId, function (value) { failureBoundary = value; }); }
                catch (error) {
                    var code = error instanceof protocol.VelaProtocolError ? error.code : protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID;
                    if (code !== protocol.ERROR_CODES.PROVIDER_HTTP_ERROR && code !== protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE) { code = protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID; }
                    finishWithError(record, capturedGeneration, "failed", code, snapshot.status, false, failureBoundary);
                    return;
                }
                if (result.parserErrorCode) {
                    finishRequest(record, capturedGeneration, "failed", result.response, { errorCode: result.parserErrorCode, httpStatus: 200, failureBoundary: failureBoundary, debugEvidence: options.streaming === true ? { streamDone: assemblerState.done, assembledTextChars: streamResult.text.length, assembledReasoningChars: streamResult.reasoning.length, assembledStructuredChars: streamResult.structured.length, assembledContent: streamResult.text, parserOutcome: "rejected", transportDiagnostics: record.debugEvidence && record.debugEvidence.transportDiagnostics } : { parserOutcome: "rejected" } });
                } else {
                    finishRequest(record, capturedGeneration, "completed", result.response, { errorCode: null, httpStatus: 200, debugEvidence: options.streaming === true ? { streamDone: assemblerState.done, assembledTextChars: streamResult.text.length, assembledReasoningChars: streamResult.reasoning.length, assembledStructuredChars: streamResult.structured.length, parserOutcome: "accepted", transportDiagnostics: record.debugEvidence && record.debugEvidence.transportDiagnostics } : { parserOutcome: "accepted" } });
                }
            }).catch(function (error) {
                var transportCode = options.streaming === true && error instanceof protocol.VelaProtocolError ? error.code : protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED;
                if (transportCode !== protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID && transportCode !== protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE) { transportCode = protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED; }
                finishWithError(record, capturedGeneration, "failed", transportCode, null, false, "transport-read");
            });
            return Object.freeze({ requestId: requestId, promise: promise });
        }

        function normalizeAssistantTextResponse(text, requestId) {
            if (typeof text !== "string" || !text.trim()) { responseFailure(protocol, "The assistant text is empty or invalid."); }
            var canonical = {
                protocol: protocol.PROTOCOLS.RESPONSE, schemaVersion: protocol.SCHEMA_VERSION,
                requestId: requestId, provider: PROVIDER_ID, model: model,
                envelope: { type: protocol.ENVELOPE_TYPES.TEXT, text: text }
            };
            protocol.validateCanonicalResponse(canonical);
            return { response: protocol.deepFreeze(protocol.cloneJson(canonical, { maxBytes: protocol.HARD_LIMITS.maxResponseJsonBytes })), parserErrorCode: null };
        }

        function cancel(requestId) {
            var record = activeRequest;
            if (!record || record.state !== "pending" || record.requestId !== requestId) { return false; }
            return finishWithError(record, record.generation, "cancelled", protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED, null, true);
        }

        function getState() {
            return Object.freeze({ state: state, requestId: activeRequest ? activeRequest.requestId : diagnostics.requestId });
        }

        function getDiagnostics() {
            if (activeRequest && activeRequest.state === "pending") { diagnostics = makeDiagnostics(activeRequest, "pending", null, null, undefined, null); }
            var value = {
                providerId: diagnostics.providerId,
                modelId: diagnostics.modelId,
                requestId: diagnostics.requestId,
                state: diagnostics.state,
                elapsedMs: diagnostics.elapsedMs,
                httpStatus: diagnostics.httpStatus,
                errorCode: diagnostics.errorCode,
                terminalFailureBoundary: diagnostics.terminalFailureBoundary
            };
            if (debugTerminalDiagnostics) { value.terminalDebugEvidence = terminalDebugEvidence; }
            return Object.freeze(value);
        }

        return Object.freeze({
            id: PROVIDER_ID,
            kind: PROVIDER_KIND,
            capabilities: capabilities,
            start: start,
            cancel: cancel,
            getState: getState,
            getContextEvidence: function () { return contextEvidence; },
            getDiagnostics: getDiagnostics
        });
    }

    function isTrustedOutboundBodyForTransport(body, transport, protocol) {
        var record = trustedOutboundBodies.get(body);
        return !!record && record.transport === transport && record.protocol === protocol && protocolModule.isTrustedProtocol(protocol);
    }
    return Object.freeze({
        RESOURCE_POLICY: RESOURCE_POLICY,
        getGenerationPolicy: getGenerationPolicy,
        getOutputDecision: getOutputDecision,
        createLocalOpenAICompatibleProvider: createLocalOpenAICompatibleProvider,
        buildCapabilityParametersForResponse: buildCapabilityParametersForResponse,
        buildDormantLocalProposalRepresentationSchema: buildDormantLocalProposalRepresentationSchema,
        isTrustedOutboundBodyForTransport: isTrustedOutboundBodyForTransport
    });
}));
