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
        var hasProtocol;
        var hasParser;
        var protocolDependency;
        var parserDependency;
        try {
            hasProtocol = hasModule.call(bootstrap, "VelaProtocol");
            hasParser = hasModule.call(bootstrap, "VelaResponseParser");
            protocolDependency = getModule.call(bootstrap, "VelaProtocol");
            parserDependency = getModule.call(bootstrap, "VelaResponseParser");
        } catch (error) {
            throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", "The Vela protocol bootstrap dependencies are unavailable.");
        }
        if (hasProtocol !== true || hasParser !== true || protocolDependency !== protocolGlobal || parserDependency !== parserGlobal) {
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
        var exported = Object.freeze(create(assertProtocolModule(protocolDependency), assertParserModule(parserDependency)));
        try { registerModule.call(bootstrap, name, exported); }
        catch (error) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " could not be registered."); }
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol")), assertParserModule(require("./velaResponseParser"))));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, parserModule) {
    "use strict";

    var trustedOutboundBodies = new WeakMap();
    var DEFAULT_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";
    var PROVIDER_ID = "lmstudio";
    var PROVIDER_KIND = "openai-compatible";
    var RESPONSE_SCHEMA_ID = "vela-response.v1";
    var RESPONSE_FORMAT_MODE = "json-schema";
    var LMSTUDIO_TEXT_GENERATION_MAX_CHARS = 1024;
    var LMSTUDIO_ERROR_STAGE_GENERATION_MAX_CHARS = 128;
    var LMSTUDIO_ERROR_MESSAGE_GENERATION_MAX_CHARS = 512;
    var MIN_TIMEOUT_MS = 1000;
    var MAX_TIMEOUT_MS = 120000;
    var DEFAULT_TIMEOUT_MS = 30000;
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
                if (!hasOwn(details, "reasoning_tokens") || ownDataValue(protocol, details, "reasoning_tokens") !== 0) {
                    responseFailure(protocol, "The OpenAI response reasoning details are unsupported.");
                }
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
        var setTimer = ownDataFunction(runtime, "setTimeout");
        var clearTimer = ownDataFunction(runtime, "clearTimeout");
        var createAbortController = ownDataFunction(runtime, "createAbortController");
        var parseUrl = ownDataFunction(runtime, "parseUrl");
        var nowMs = ownDataFunction(runtime, "nowMs");

        var endpoint = options.endpoint === undefined ? DEFAULT_ENDPOINT : options.endpoint;
        var model = options.model;
        var timeoutMs = options.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : options.timeoutMs;
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

        var capabilities = Object.freeze({ chat: true, jsonSchema: true, streaming: false, cancellation: true });
        var state = "idle";
        var activeRequest = null;
        var generation = 0;
        var usedRequestIds = new Set();
        var diagnostics = Object.freeze({ providerId: PROVIDER_ID, modelId: model, requestId: null, state: state, elapsedMs: 0, httpStatus: null, errorCode: null });

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

        function makeDiagnostics(record, nextState, httpStatus, errorCode, elapsedValue) {
            return Object.freeze({
                providerId: PROVIDER_ID,
                modelId: model,
                requestId: record ? record.requestId : null,
                state: nextState,
                elapsedMs: record ? (elapsedValue === undefined ? safeElapsed(record) : elapsedValue) : 0,
                httpStatus: safeHttpStatus(httpStatus),
                errorCode: errorCode || null
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
            record.state = nextState;
            record.settled = true;
            state = nextState;
            activeRequest = null;
            var timerId = record.timerId;
            record.timerId = null;
            diagnostics = makeDiagnostics(record, nextState, fields.httpStatus, fields.errorCode);
            if (timerId !== null) {
                try { clearTimer(timerId); } catch (error) { /* terminal state remains authoritative */ }
            }
            if (fields.abort === true) {
                try { record.controller.abort.call(record.controller.receiver); } catch (error) { /* terminal state remains authoritative */ }
            }
            try { record.resolve(response); } catch (error) { /* Promise resolve is treated as non-observable */ }
            return true;
        }

        function finishWithError(record, capturedGeneration, nextState, code, httpStatus, abort) {
            return finishRequest(record, capturedGeneration, nextState, canonicalError(code, record.requestId), {
                abort: abort === true,
                errorCode: code,
                httpStatus: httpStatus
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
            var errorCodes = Object.keys(protocol.ERROR_CODES).map(function (key) { return protocol.ERROR_CODES[key]; });
            var errorSchema = {
                type: "object",
                additionalProperties: false,
                required: ["code", "stage", "retryable", "message", "details"],
                properties: {
                    code: { type: "string", enum: errorCodes },
                    stage: { type: "string", minLength: 1, maxLength: LMSTUDIO_ERROR_STAGE_GENERATION_MAX_CHARS },
                    retryable: { type: "boolean" },
                    message: { type: "string", maxLength: LMSTUDIO_ERROR_MESSAGE_GENERATION_MAX_CHARS },
                    details: { type: "object", additionalProperties: false, maxProperties: 0 }
                }
            };
            var textEnvelope = {
                type: "object",
                additionalProperties: false,
                required: ["type", "text"],
                properties: {
                    type: enumString(protocol.ENVELOPE_TYPES.TEXT),
                    text: { type: "string", minLength: 1, maxLength: LMSTUDIO_TEXT_GENERATION_MAX_CHARS }
                }
            };
            var errorEnvelope = {
                type: "object",
                additionalProperties: false,
                required: ["type", "error"],
                properties: {
                    type: enumString(protocol.ENVELOPE_TYPES.ERROR),
                    error: errorSchema
                }
            };
            var localProposalEnvelope = {
                type: "object",
                additionalProperties: false,
                required: ["type", "proposal"],
                properties: {
                    type: enumString(protocol.ENVELOPE_TYPES.LOCAL_PROPOSAL),
                    proposal: {
                        type: "object",
                        additionalProperties: false,
                        required: ["capabilityId", "params"],
                        properties: {
                            capabilityId: enumString("set-opacity-v1"),
                            params: {
                                type: "object",
                                additionalProperties: false,
                                required: ["opacity"],
                                properties: { opacity: { type: "number", minimum: 0, maximum: 100 } }
                            }
                        }
                    }
                }
            };
            return protocol.deepFreeze({
                name: "vela_response",
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
                        envelope: { type: "object", oneOf: [textEnvelope, errorEnvelope, localProposalEnvelope] }
                    }
                }
            });
        }

        function systemMessage(requestId) {
            var metadata = responseMetadata(requestId);
            return [
                "Return exactly one complete JSON object and nothing else.",
                "Follow the attached json_schema exactly; it is format guidance and the local Parser will validate again.",
                "Use protocol " + metadata.protocol + " and schemaVersion " + metadata.schemaVersion + ".",
                "Use requestId " + metadata.requestId + ", provider " + metadata.provider + ", and model " + metadata.model + ".",
                "This version permits only text, error, or localProposal envelopes; never return plan or actionCandidate.",
                "A localProposal may contain only capabilityId set-opacity-v1 and params.opacity from 0 through 100.",
                "Do not use Markdown, fences, explanations, prefixes, suffixes, envelopeType, top-level placeholder fields, tool_calls, function_call, source, code, target, propertyPath, risk, candidateId, planId, confirmationNonce, reservation, digest, authority, or multiple JSON roots.",
                "Do not create or claim a trusted candidateId."
            ].join(" ");
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
            var request = {
                protocol: protocol.PROTOCOLS.REQUEST,
                schemaVersion: protocol.SCHEMA_VERSION,
                requestId: requestId,
                model: model,
                messages: [{ role: "system", content: systemMessage(requestId) }].concat(messages),
                responseFormat: { type: "json_object", schemaId: RESPONSE_SCHEMA_ID },
                context: context
            };
            protocol.validateCanonicalRequest(request);
            return protocol.deepFreeze(protocol.cloneJson(request, { maxBytes: protocol.HARD_LIMITS.maxRequestJsonBytes }));
        }

        function buildOpenAiBody(request) {
            var body = {
                model: model,
                messages: request.messages,
                stream: false,
                response_format: {
                    type: "json_schema",
                    json_schema: buildResponseJsonSchema(request.requestId)
                }
            };
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

        function validateTransportResponse(snapshot, requestId) {
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
            validateInertWrapperMetadata(protocol, wrapper, choice);
            var message = choice.message;
            if (!protocol.isPlainObject(message)) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant message is invalid."); }
            protocol.assertNoUnknownKeys(message, OPENAI_MESSAGE_KEYS, "provider.openAiMessage");
            if (Object.prototype.hasOwnProperty.call(message, "function_call")) { protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant message contains unsupported calls."); }
            if (Object.prototype.hasOwnProperty.call(message, "reasoning_content") && message.reasoning_content !== "" && message.reasoning_content !== null) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant reasoning is unsupported.");
            }
            if (Object.prototype.hasOwnProperty.call(message, "tool_calls") && (!Array.isArray(message.tool_calls) || message.tool_calls.length !== 0)) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant message contains unsupported calls.");
            }
            if (message.role !== "assistant" || typeof message.content !== "string" || !message.content.trim()) {
                protocol.fail(protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "The OpenAI assistant content is invalid.");
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
            var request = buildRequest(input, requestId);
            var body = buildOpenAiBody(request);
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
                settled: false
            };
            var transportInput = protocol.deepFreeze({
                url: endpoint,
                method: "POST",
                headers: protocol.deepFreeze({ "Content-Type": "application/json" }),
                body: body,
                maxRequestBytes: protocol.HARD_LIMITS.maxRequestJsonBytes,
                maxResponseBytes: protocol.HARD_LIMITS.maxResponseJsonBytes,
                allowRedirects: false
            });
            var requestForTransport = Object.freeze({
                url: transportInput.url,
                method: transportInput.method,
                headers: transportInput.headers,
                body: transportInput.body,
                signal: controller.signal,
                maxRequestBytes: transportInput.maxRequestBytes,
                maxResponseBytes: transportInput.maxResponseBytes,
                allowRedirects: transportInput.allowRedirects
            });
            var pendingDiagnostics = makeDiagnostics(record, "pending", null, null, 0);

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
                try { pending = sendJson(requestForTransport); }
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
                    finishWithError(record, capturedGeneration, "failed", protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, null, false);
                    return;
                }
                var result;
                try { result = validateTransportResponse(snapshot, requestId); }
                catch (error) {
                    var code = error instanceof protocol.VelaProtocolError ? error.code : protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID;
                    if (code !== protocol.ERROR_CODES.PROVIDER_HTTP_ERROR && code !== protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE) { code = protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID; }
                    finishWithError(record, capturedGeneration, "failed", code, snapshot.status, false);
                    return;
                }
                if (result.parserErrorCode) {
                    finishRequest(record, capturedGeneration, "failed", result.response, { errorCode: result.parserErrorCode, httpStatus: 200 });
                } else {
                    finishRequest(record, capturedGeneration, "completed", result.response, { errorCode: null, httpStatus: 200 });
                }
            }).catch(function () {
                finishWithError(record, capturedGeneration, "failed", protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED, null, false);
            });
            return Object.freeze({ requestId: requestId, promise: promise });
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
            if (activeRequest && activeRequest.state === "pending") { diagnostics = makeDiagnostics(activeRequest, "pending", null, null); }
            return Object.freeze({
                providerId: diagnostics.providerId,
                modelId: diagnostics.modelId,
                requestId: diagnostics.requestId,
                state: diagnostics.state,
                elapsedMs: diagnostics.elapsedMs,
                httpStatus: diagnostics.httpStatus,
                errorCode: diagnostics.errorCode
            });
        }

        return Object.freeze({
            id: PROVIDER_ID,
            kind: PROVIDER_KIND,
            capabilities: capabilities,
            start: start,
            cancel: cancel,
            getState: getState,
            getDiagnostics: getDiagnostics
        });
    }

    function isTrustedOutboundBodyForTransport(body, transport, protocol) {
        var record = trustedOutboundBodies.get(body);
        return !!record && record.transport === transport && record.protocol === protocol && protocolModule.isTrustedProtocol(protocol);
    }
    return Object.freeze({
        createLocalOpenAICompatibleProvider: createLocalOpenAICompatibleProvider,
        isTrustedOutboundBodyForTransport: isTrustedOutboundBodyForTransport
    });
}));
