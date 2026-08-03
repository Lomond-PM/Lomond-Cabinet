#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const providerModule = require("../client/js/vela/velaProviderAdapter");
const requestBranchPolicy = require("../client/js/vela/velaProviderRequestBranchPolicy");

let assertions = 0;
let protocolSeed = 0;
const FP = "sha256:" + "1".repeat(64);
const DEFAULT_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";

function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function expectCode(callback, code, message) { assert.throws(callback, (error) => error && error.code === code, message); assertions += 1; }
function collectSchemaValues(value, key, output) {
    if (!value || typeof value !== "object") return output;
    if (Object.prototype.hasOwnProperty.call(value, key)) output.push(value[key]);
    Object.keys(value).forEach((child) => collectSchemaValues(value[child], key, output));
    return output;
}

function makeProtocol(overrides) {
    let id = 0;
    let time = 100;
    const protocol = protocolModule.createProtocol(Object.assign({
        utf8ByteLength: (text) => Buffer.byteLength(text, "utf8"),
        sha256Hex: (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex"),
        randomId: (kind) => kind + "_" + (++protocolSeed).toString(36).padStart(31, "a") + (++id).toString(36),
        now: () => time
    }, overrides || {}));
    return { protocol, advance: (value) => { time += value; } };
}

function parseUrl(url) {
    const parsed = new URL(url);
    return {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        username: parsed.username,
        password: parsed.password,
        search: parsed.search,
        hash: parsed.hash,
        href: parsed.href
    };
}

function makeScheduler() {
    let nextId = 0;
    const timers = new Map();
    let cleared = 0;
    return {
        setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
        clearTimeout(id) { if (timers.delete(id)) cleared += 1; },
        fireAll() { const values = Array.from(timers.values()); timers.clear(); values.forEach((item) => item.callback()); },
        count() { return timers.size; },
        cleared() { return cleared; }
    };
}

function makeRuntime(scheduler, overrides, nowMs) {
    let aborts = 0;
    const runtime = {
        setTimeout: scheduler.setTimeout,
        clearTimeout: scheduler.clearTimeout,
        createAbortController: () => ({ signal: { local: true }, abort() { aborts += 1; } }),
        parseUrl,
        nowMs: nowMs || (() => 100)
    };
    Object.assign(runtime, overrides || {});
    return { runtime, aborts: () => aborts };
}

function requestIdFromTransport(request) {
    const match = /Use requestId (req_[a-z0-9]+)/.exec(request.body.messages[0].content);
    assert.ok(match, "System prompt must contain the local request id.");
    return match[1];
}

function canonicalContent(protocol, request, envelope, metadata) {
    metadata = metadata || {};
    return JSON.stringify({
        protocol: metadata.protocol || protocol.PROTOCOLS.RESPONSE,
        schemaVersion: metadata.schemaVersion || protocol.SCHEMA_VERSION,
        requestId: metadata.requestId || requestIdFromTransport(request),
        provider: metadata.provider || "lmstudio",
        model: metadata.model || request.body.model,
        envelope: envelope || { type: "text", text: "ok" }
    });
}

function wrapper(content, overrides) {
    return JSON.stringify(Object.assign({
        id: "chat-local",
        object: "chat.completion",
        created: 1,
        model: "untrusted-wrapper-model",
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop", logprobs: null }],
        usage: {}
    }, overrides || {}));
}

function realLmStudioWrapper(protocol, request, overrides) {
    return Object.assign({
        id: "chatcmpl-local",
        object: "chat.completion",
        created: 1784797754,
        model: request.body.model,
        choices: [{
            index: 0,
            message: {
                role: "assistant",
                content: JSON.stringify({
                    envelope: { text: "Opacity refers to the degree of transparency or lightness in a material, indicating how much light passes through it.", type: "text" },
                    model: request.body.model,
                    protocol: protocol.PROTOCOLS.RESPONSE,
                    provider: "lmstudio",
                    requestId: requestIdFromTransport(request),
                    schemaVersion: protocol.SCHEMA_VERSION
                }),
                reasoning_content: "",
                tool_calls: []
            },
            logprobs: null,
            finish_reason: "stop"
        }],
        usage: {
            prompt_tokens: 239,
            completion_tokens: 144,
            total_tokens: 383,
            completion_tokens_details: { reasoning_tokens: 0 }
        },
        stats: {},
        system_fingerprint: request.body.model
    }, overrides || {});
}

function transportResult(bodyText, overrides) {
    return Object.assign({ status: 200, contentType: "application/json", bodyText, redirected: false, finalUrl: DEFAULT_ENDPOINT }, overrides || {});
}

function input(overrides) {
    return Object.assign({ messages: [{ role: "user", content: "hello" }], context: { contextId: "ctx-1", fingerprint: FP, tier: 0 } }, overrides || {});
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function createHarness(options) {
    options = options || {};
    const clock = options.clock || makeProtocol();
    const scheduler = options.scheduler || makeScheduler();
    const runtimeBundle = options.runtimeBundle || makeRuntime(scheduler, options.runtimeOverrides, () => clock.protocol.now());
    const calls = [];
    const responder = options.responder || ((request) => Promise.resolve(transportResult(wrapper(canonicalContent(clock.protocol, request)))));
    const transport = options.transport || { sendJson(request) { calls.push(request); return responder(request); } };
    const config = {
        protocol: clock.protocol,
        transport,
        endpoint: options.endpoint,
        model: options.model || "Qwen3.5-4B-Q6_K",
        requestProfile: options.requestProfile === undefined ? requestBranchPolicy.PROFILES.TEXT_ONLY : options.requestProfile,
        timeoutMs: options.timeoutMs === undefined ? 30000 : options.timeoutMs,
        responseFormatMode: options.responseFormatMode === undefined ? "json-schema" : options.responseFormatMode,
        runtime: runtimeBundle.runtime
    };
    if (config.endpoint === undefined) delete config.endpoint;
    const provider = providerModule.createLocalOpenAICompatibleProvider(config);
    return { provider, protocol: clock.protocol, advance: clock.advance, scheduler, runtimeBundle, calls, config, transport };
}

async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

async function captureUnhandled(callback) {
    const values = [];
    const listener = (error) => { values.push(error); };
    process.on("unhandledRejection", listener);
    try {
        await callback();
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setImmediate(resolve));
    } finally {
        process.removeListener("unhandledRejection", listener);
    }
    return values;
}

async function run() {
    const base = makeProtocol();
    const scheduler = makeScheduler();
    const runtimeBundle = makeRuntime(scheduler);
    const validTransport = { sendJson() { return Promise.resolve({}); } };
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: Object.assign({}, base.protocol), transport: validTransport, model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Fake protocols must be rejected.");
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Missing transports must be rejected.");
    const getterTransport = {}; Object.defineProperty(getterTransport, "sendJson", { get() { return () => {}; } });
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: getterTransport, model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Transport getters must be rejected.");
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: Object.create(validTransport), model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Inherited transport methods must be rejected.");
    const getterRuntime = Object.assign({}, runtimeBundle.runtime); Object.defineProperty(getterRuntime, "parseUrl", { get() { return parseUrl; } });
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: validTransport, model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: getterRuntime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Runtime getters must be rejected.");
    [999, 120001, Infinity, "30000"].forEach((timeoutMs) => expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: validTransport, model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, timeoutMs, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Invalid timeout values must be rejected."));
    check(createHarness({ timeoutMs: 1000 }).provider.id === "lmstudio" && createHarness({ timeoutMs: 120000 }).provider.kind === "openai-compatible", "Timeout boundary values must be accepted.");
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: validTransport, model: "", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Empty model ids must be rejected.");
    check(createHarness({ model: "\ud83d\ude00".repeat(64) }).provider.id === "lmstudio", "Model ids at the 256-byte UTF-8 limit must be accepted.");
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: validTransport, model: "\ud83d\ude00".repeat(65), requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Model ids must use UTF-8 byte limits.");
    ["text", "json_object", true, null].forEach((responseFormatMode) => expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: validTransport, model: "m", requestProfile: requestBranchPolicy.PROFILES.TEXT_ONLY, responseFormatMode, runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Only the explicit json-schema response format mode is accepted."));
    expectCode(() => providerModule.createLocalOpenAICompatibleProvider({ protocol: base.protocol, transport: validTransport, model: "m", runtime: runtimeBundle.runtime }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Missing request profiles must fail closed.");

    ["http://127.0.0.1:1234/v1/chat/completions", "http://localhost:4321/v1/chat/completions", "http://[::1]:65535/v1/chat/completions"].forEach((endpoint) => {
        const value = createHarness({ endpoint }).provider;
        check(value.id === "lmstudio", endpoint + " must be accepted.");
    });
    [
        "https://127.0.0.1:1234/v1/chat/completions", "http://192.168.1.2:1234/v1/chat/completions",
        "http://127.0.0.2:1234/v1/chat/completions", "http://127.0.0.1/v1/chat/completions",
        "http://127.0.0.1:0/v1/chat/completions", "http://127.0.0.1:65536/v1/chat/completions",
        "http://user@127.0.0.1:1234/v1/chat/completions", "http://127.0.0.1:1234/v1/models",
        "http://127.0.0.1:1234/v1/chat/completions?q=1", "http://127.0.0.1:1234/v1/chat/completions#x"
    ].forEach((endpoint) => expectCode(() => createHarness({ endpoint }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Unsafe endpoints must be rejected."));
    expectCode(() => createHarness({ runtimeOverrides: { parseUrl: () => Object.assign(parseUrl(DEFAULT_ENDPOINT), { hostname: "example.com" }) } }), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Parsed endpoints must be checked independently.");

    const normal = createHarness();
    const handle = normal.provider.start(input());
    check(/^req_[a-z0-9]{32,96}$/.test(handle.requestId), "Request ids must come from protocol.randomId(req).");
    const normalResponse = await handle.promise;
    equal(normalResponse.requestId, handle.requestId, "Canonical response request ids must be local.");
    equal(normalResponse.provider, "lmstudio", "Provider metadata must be local.");
    equal(normalResponse.model, "Qwen3.5-4B-Q6_K", "Model metadata must be local.");
    equal(normal.provider.getState().state, "completed", "Successful requests must complete.");
    check(Object.isFrozen(normal.provider) && Object.isFrozen(normal.provider.capabilities) && Object.isFrozen(normal.provider.getState()), "Provider public objects and state views must be frozen.");
    check(Object.isFrozen(normalResponse) && Object.isFrozen(normal.provider.getDiagnostics()), "Responses and diagnostics must be frozen.");
    equal(normal.calls.length, 1, "Exactly one fake transport call is expected.");
    const sent = normal.calls[0];
    equal(sent.url, DEFAULT_ENDPOINT, "The default endpoint must be used.");
    equal(sent.method, "POST", "Transport method must be POST.");
    equal(sent.headers["Content-Type"], "application/json", "Transport content type must be JSON.");
    check(!Object.prototype.hasOwnProperty.call(sent.headers, "Authorization"), "Authorization must not be sent.");
    equal(sent.allowRedirects, false, "Redirects must be disabled.");
    equal(sent.maxResponseBytes, normal.protocol.HARD_LIMITS.maxResponseJsonBytes, "Transport must receive the response budget.");
    equal(sent.body.stream, false, "Streaming must be disabled.");
    check(Object.isFrozen(sent) && Object.isFrozen(sent.headers) && Object.isFrozen(sent.body), "The complete transport request must be frozen.");
    equal(sent.body.response_format.type, "json_schema", "Production requests must use the LM Studio json_schema response format.");
    const responseSchema = sent.body.response_format.json_schema;
    check(responseSchema && responseSchema.name === "vela_text_response" && responseSchema.strict === true, "The text profile must have the trusted LM Studio wrapper.");
    check(responseSchema.schema.type === "object" && responseSchema.schema.additionalProperties === false, "The canonical response root must be closed.");
    equal(responseSchema.schema.properties.protocol.enum[0], normal.protocol.PROTOCOLS.RESPONSE, "Schema protocol metadata must match the trusted protocol.");
    equal(responseSchema.schema.properties.schemaVersion.enum[0], normal.protocol.SCHEMA_VERSION, "Schema version metadata must match the trusted protocol.");
    equal(responseSchema.schema.properties.requestId.enum[0], handle.requestId, "Schema request ids must bind the current local request.");
    equal(responseSchema.schema.properties.provider.enum[0], "lmstudio", "Schema provider metadata must be local.");
    equal(responseSchema.schema.properties.model.enum[0], "Qwen3.5-4B-Q6_K", "Schema model metadata must bind the configured model.");
    const textVariant = responseSchema.schema.properties.envelope;
    check(!Object.prototype.hasOwnProperty.call(textVariant, "oneOf") && textVariant.properties.type.enum[0] === "text" && textVariant.properties.text.minLength === 1, "The text profile schema permits only a closed text envelope.");
    equal(textVariant.properties.text.maxLength, 1024, "LM Studio text generation must use the bounded generation cap.");
    const schemaMaxLengths = collectSchemaValues(responseSchema.schema, "maxLength", []);
    check(schemaMaxLengths.length > 0 && schemaMaxLengths.every((value) => Number.isInteger(value) && value <= 1024), "No LM Studio schema repetition bound may exceed the conservative generation limit.");
    check(!JSON.stringify(sent.body.response_format).includes("json_object") && !JSON.stringify(sent.body.response_format).includes("actionCandidate") && !JSON.stringify(sent.body.response_format).includes("\"plan\""), "Outbound JSON schema must not express deprecated JSON mode or executable envelopes.");
    equal(sent.body.messages[0].role, "system", "The system message must be local and first.");
    check(sent.body.messages[0].content.includes(handle.requestId) && sent.body.messages[0].content.includes("vela.model-response.v1"), "The system message must bind response metadata.");
    const prompt = sent.body.messages[0].content;
    const proposal57Example = JSON.stringify({ protocol: normal.protocol.PROTOCOLS.RESPONSE, schemaVersion: normal.protocol.SCHEMA_VERSION, requestId: handle.requestId, provider: "lmstudio", model: "Qwen3.5-4B-Q6_K", envelope: { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 57.5 } } } });
    const decisionTable = "DECISION: text by default. Return localProposal only for a direct command to set the current or selected layer opacity to one explicit 0–100 target. Return text for greetings, questions, current-value queries, explanations, suggestions, uncertainty, hypotheticals, negations, relative adjustments, ambiguity, or no one target.";
    check(prompt.includes("text-only") && prompt.includes("localProposal is invalid") && !prompt.includes("candidateId") && !prompt.includes("planId"), "Text prompt has only its local response authority and no execution architecture.");

    const rebound = createHarness({ model: "another-local-model" });
    const reboundHandle = rebound.provider.start(input());
    await reboundHandle.promise;
    equal(rebound.calls[0].body.response_format.json_schema.schema.properties.requestId.enum[0], reboundHandle.requestId, "Schemas must be regenerated for each local request id.");
    equal(rebound.calls[0].body.response_format.json_schema.schema.properties.model.enum[0], "another-local-model", "Schemas must be regenerated for each configured model.");
    const inputHarness = createHarness();
    expectCode(() => inputHarness.provider.start({ messages: [], context: input().context, endpoint: DEFAULT_ENDPOINT }), base.protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unknown start fields must be rejected.");
    expectCode(() => inputHarness.provider.start(input({ messages: [{ role: "system", content: "bad" }] })), base.protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Caller system messages must be rejected.");
    expectCode(() => inputHarness.provider.start(input({ context: { contextId: "c", fingerprint: FP, tier: "0" } })), base.protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "String context tiers must be rejected.");
    [0, 1, 2, 3].forEach((tier) => check(createHarness().provider.start(input({ context: { contextId: "c", fingerprint: FP, tier } })).requestId.indexOf("req_") === 0, "Integer context tiers must be accepted."));
    expectCode(() => createHarness().provider.start(input({ messages: Array.from({ length: 5 }, () => ({ role: "user", content: "x".repeat(15000) })) })), base.protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Canonical requests must enforce the 64 KiB budget.");

    const envelopes = [
        { envelope: { type: "text", text: "ok" }, profile: requestBranchPolicy.PROFILES.TEXT_ONLY },
        { envelope: { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 57.5 } } }, profile: requestBranchPolicy.PROFILES.EXPLICIT_EDIT_ELIGIBLE }
    ];
    for (const item of envelopes) {
        const envelope = item.envelope;
        const harness = createHarness({ requestProfile: item.profile, responder: (request) => Promise.resolve(transportResult(wrapper(canonicalContent(base.protocol, request, envelope)))) });
        const response = await harness.provider.start(input()).promise;
        equal(response.envelope.type, envelope.type, envelope.type + " envelopes must pass through the parser.");
    }
    const unauthorizedModelError = { type: "error", error: { code: base.protocol.ERROR_CODES.EXPRESSION_NOT_ALLOWLISTED, stage: "provider", retryable: false, message: "untrusted", details: {} } };
    const unauthorizedHarness = createHarness({ responder: (request) => Promise.resolve(transportResult(wrapper(canonicalContent(base.protocol, request, unauthorizedModelError)))) });
    const unauthorizedResponse = await unauthorizedHarness.provider.start(input()).promise;
    equal(unauthorizedResponse.envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "A structurally valid model-authored error must become the generic local invalid-response result.");
    equal(unauthorizedHarness.provider.getDiagnostics().errorCode, "MODEL_ERROR_NOT_AUTHORIZED", "Only adapter diagnostics may classify a model-authored error as unauthorized.");
    check(!JSON.stringify(unauthorizedResponse).includes("EXPRESSION_NOT_ALLOWLISTED") && !JSON.stringify(unauthorizedResponse).includes("untrusted"), "Model-authored error fields must not enter the canonical response.");
    for (const fenced of [false, true]) {
        const harness = createHarness({ responder: (request) => { let content = canonicalContent(base.protocol, request); if (fenced) content = "```json\n" + content + "\n```"; return Promise.resolve(transportResult(wrapper(content))); } });
        equal((await harness.provider.start(input()).promise).envelope.type, "text", "Plain and recognized fenced canonical JSON must parse.");
    }
    const canonicalLongText = "x".repeat(1025);
    const longCanonicalHarness = createHarness({ responder: (request) => Promise.resolve(transportResult(wrapper(canonicalContent(base.protocol, request, { type: "text", text: canonicalLongText })))) });
    equal((await longCanonicalHarness.provider.start(input()).promise).envelope.text.length, canonicalLongText.length, "The strict canonical Parser must retain its existing acceptance range beyond the LM Studio generation subset.");
    const realFixtureHarness = createHarness({ responder: (request) => Promise.resolve(transportResult(JSON.stringify(realLmStudioWrapper(base.protocol, request)))) });
    const realFixtureResponse = await realFixtureHarness.provider.start(input()).promise;
    equal(realFixtureResponse.envelope.type, "text", "The complete LM Studio 0.4.19 completion wrapper fixture must normalize before canonical parsing.");
    equal(realFixtureResponse.envelope.text, "Opacity refers to the degree of transparency or lightness in a material, indicating how much light passes through it.", "The canonical Parser must preserve exact text from the real LM Studio fixture regardless of JSON key order.");
    check(!/stats|logprobs|completion_tokens_details|system_fingerprint|reasoning_content|tool_calls/.test(JSON.stringify(realFixtureResponse)) && !/stats|logprobs|completion_tokens_details|system_fingerprint|reasoning_content|tool_calls/.test(JSON.stringify(realFixtureHarness.provider.getDiagnostics())), "Inert LM Studio wrapper metadata must be consumed and discarded before canonical output or diagnostics.");
    function realFixtureResponseFor(mutator) {
        const harness = createHarness({ responder: (request) => {
            const value = realLmStudioWrapper(base.protocol, request);
            mutator(value);
            return Promise.resolve(transportResult(JSON.stringify(value)));
        } });
        return harness.provider.start(input()).promise;
    }
    for (const mutate of [
        (value) => { delete value.choices[0].logprobs; },
        (value) => { delete value.stats; },
        (value) => { delete value.usage.completion_tokens_details; },
        (value) => { value.system_fingerprint = null; },
        (value) => { delete value.system_fingerprint; }
    ]) {
        equal((await realFixtureResponseFor(mutate)).envelope.type, "text", "Only absent or exact inert LM Studio completion metadata may be accepted.");
    }
    for (const mutate of [
        (value) => { value.choices[0].logprobs = {}; },
        (value) => { value.choices[0].logprobs = []; },
        (value) => { value.choices[0].logprobs = "tokens"; },
        (value) => { value.stats = { queue: 1 }; },
        (value) => { value.stats = []; },
        (value) => { value.usage.completion_tokens_details = { reasoning_tokens: 1 }; },
        (value) => { value.usage.completion_tokens_details = { reasoning_tokens: -1 }; },
        (value) => { value.usage.completion_tokens_details = { reasoning_tokens: 0, extra: true }; },
        (value) => { value.usage.prompt_tokens = "239"; },
        (value) => { value.system_fingerprint = {}; },
        (value) => { value.system_fingerprint = "x".repeat(257); }
    ]) {
        equal((await realFixtureResponseFor(mutate)).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Non-inert LM Studio completion metadata must fail closed.");
    }
    for (const extension of [
        { reasoning_content: "", tool_calls: [] },
        { reasoning_content: null },
        { tool_calls: [] },
        {}
    ]) {
        const harness = createHarness({ responder: (request) => {
            const body = JSON.parse(wrapper(canonicalContent(base.protocol, request)));
            Object.assign(body.choices[0].message, extension);
            return Promise.resolve(transportResult(JSON.stringify(body)));
        } });
        const response = await harness.provider.start(input()).promise;
        equal(response.envelope.type, "text", "Empty LM Studio wrapper extensions must be inert.");
        check(JSON.stringify(response).indexOf("reasoning_content") === -1 && JSON.stringify(response).indexOf("tool_calls") === -1, "Inert wrapper extensions must not enter canonical output.");
    }
    for (const extension of [{ reasoning_content: "hidden reasoning" }, { tool_calls: [{}] }, { function_call: null }, { unknown_extension: true }]) {
        const harness = createHarness({ responder: (request) => {
            const body = JSON.parse(wrapper(canonicalContent(base.protocol, request)));
            Object.assign(body.choices[0].message, extension);
            return Promise.resolve(transportResult(JSON.stringify(body)));
        } });
        equal((await harness.provider.start(input()).promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Non-inert wrapper extensions must fail closed.");
    }

    const invalidWrappers = [
        ["not-json", "malformed wrapper"], ["<html>bad</html>", "HTML wrapper"], ["```json\n{}\n```", "fenced wrapper"],
        ['{"choices":[],"choices":[]}', "duplicate wrapper key"], ['{"choices":[]} {}', "trailing root"],
        [JSON.stringify({}), "missing choices"], [JSON.stringify({ choices: [] }), "zero choices"],
        [JSON.stringify({ choices: [{ message: { role: "assistant", content: "x" } }, { message: { role: "assistant", content: "x" } }] }), "multiple choices"],
        [JSON.stringify({ choices: [{}] }), "missing message"], [JSON.stringify({ choices: [{ message: { role: "user", content: "x" } }] }), "wrong role"],
        [JSON.stringify({ choices: [{ message: { role: "assistant" } }] }), "missing content"], [JSON.stringify({ choices: [{ message: { role: "assistant", content: 1 } }] }), "non-string content"],
        [JSON.stringify({ choices: [{ message: { role: "assistant", content: " " } }] }), "blank content"], [JSON.stringify({ choices: [{ message: { role: "assistant", content: [] } }] }), "array content"],
        [JSON.stringify({ choices: [{ message: { role: "assistant", content: "x", tool_calls: [{}] } }] }), "tool calls"],
        [JSON.stringify({ choices: [{ message: { role: "assistant", content: "x", function_call: {} } }] }), "function call"]
    ];
    for (const [bodyText, label] of invalidWrappers) {
        const harness = createHarness({ responder: () => Promise.resolve(transportResult(bodyText)) });
        equal((await harness.provider.start(input()).promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, label + " must be rejected.");
    }
    for (const status of [301, 429, 500]) {
        const harness = createHarness({ responder: () => Promise.resolve(transportResult("{}", { status })) });
        equal((await harness.provider.start(input()).promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_HTTP_ERROR, "Non-200 HTTP status must be rejected.");
    }
    for (const overrides of [{ redirected: true }, { finalUrl: "http://localhost:1234/v1/chat/completions" }]) {
        const harness = createHarness({ responder: () => Promise.resolve(transportResult("{}", overrides)) });
        equal((await harness.provider.start(input()).promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Redirect results must be rejected.");
    }
    const oversized = createHarness({ responder: () => Promise.resolve(transportResult("{" + "x".repeat(base.protocol.HARD_LIMITS.maxResponseJsonBytes) + "}")) });
    equal((await oversized.provider.start(input()).promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE, "Oversized transport bodies must be rejected.");

    for (const metadata of [
        { requestId: "req_" + "b".repeat(32) }, { provider: "other" }, { model: "other" },
        { protocol: "other" }, { schemaVersion: "2.0" }
    ]) {
        const harness = createHarness({ responder: (request) => Promise.resolve(transportResult(wrapper(canonicalContent(base.protocol, request, undefined, metadata)))) });
        const response = await harness.provider.start(input()).promise;
        equal(response.envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, "Canonical response metadata mismatches must fail closed.");
    }
    const wrapperMetadata = createHarness({ responder: (request) => Promise.resolve(transportResult(wrapper(canonicalContent(base.protocol, request), { id: "evil", model: "evil" }))) });
    const wrapperMetadataResponse = await wrapperMetadata.provider.start(input()).promise;
    equal(wrapperMetadataResponse.model, "Qwen3.5-4B-Q6_K", "OpenAI wrapper metadata must remain untrusted.");

    const parserCases = [
        ["not-json", base.protocol.ERROR_CODES.JSON_PARSE_FAILED],
        ["before {} after {}", base.protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS],
        ["{} {}", base.protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS],
        ['{"schemaVersion":"1.0","schemaVersion":"2.0"}', base.protocol.ERROR_CODES.DUPLICATE_JSON_KEY],
        [function (request) { return canonicalContent(base.protocol, request, { type: "text", text: "x" }).replace(/}$/, ',"unknown":true}'); }, base.protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED],
        ["Prose toolId action {\"kind\":\"tool\"}", base.protocol.ERROR_CODES.JSON_PARSE_FAILED]
    ];
    for (const [content, code] of parserCases) {
        const harness = createHarness({ responder: (request) => Promise.resolve(transportResult(wrapper(typeof content === "function" ? content(request) : content))) });
        const response = await harness.provider.start(input()).promise;
        equal(response.envelope.error.code, code, "Parser failures must preserve stable protocol codes.");
        check(!("proposal" in response.envelope) && !("action" in response.envelope) && !("candidate" in response.envelope), "Parser errors must contain no actions.");
        equal(harness.calls.length, 1, "Parser failures must not issue repair requests.");
    }

    const pendingDeferred = deferred();
    const pending = createHarness({ responder: () => pendingDeferred.promise });
    const pendingHandle = pending.provider.start(input());
    expectCode(() => pending.provider.start(input()), base.protocol.ERROR_CODES.PROVIDER_REQUEST_IN_FLIGHT, "Only one request may be pending.");
    equal(pending.provider.cancel("req_" + "z".repeat(32)), false, "Wrong request ids must not cancel an active request.");
    equal(pending.provider.cancel(pendingHandle.requestId), true, "Matching request ids must cancel.");
    equal((await pendingHandle.promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED, "Cancellation must settle the external promise.");
    equal(pending.provider.getState().state, "cancelled", "Cancellation must be terminal.");
    check(pending.runtimeBundle.aborts() >= 1, "Cancellation must abort the transport signal.");
    pendingDeferred.resolve(transportResult("secret late response")); await flush();
    equal(pending.provider.getState().state, "cancelled", "Late resolves must not replace cancellation.");
    const afterCancel = pending.provider.start(input());
    await afterCancel.promise;
    check(afterCancel.requestId !== pendingHandle.requestId, "Cancellation must permit a new request with a new local id.");

    const timeoutDeferred = deferred();
    const timeoutHarness = createHarness({ responder: () => timeoutDeferred.promise, timeoutMs: 1000 });
    const timeoutHandle = timeoutHarness.provider.start(input()); await flush();
    timeoutHarness.advance(1000); timeoutHarness.scheduler.fireAll();
    equal((await timeoutHandle.promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_TIMEOUT, "Timeout must settle independently of transport abort.");
    equal(timeoutHarness.provider.getState().state, "timed-out", "Timeout must be terminal.");
    timeoutDeferred.reject(new Error("late secret stack")); await flush();
    equal(timeoutHarness.provider.getState().state, "timed-out", "Late rejects must not replace timeout.");
    const restart = timeoutHarness.provider.start(input());
    timeoutHarness.advance(1000); timeoutHarness.scheduler.fireAll(); await restart.promise;
    check(restart.requestId !== timeoutHandle.requestId, "A terminal request must allow a new request id.");

    const connection = createHarness({ responder: () => Promise.reject(new Error("secret endpoint stack token")) });
    const connectionResponse = await connection.provider.start(input({ messages: [{ role: "user", content: "private-message" }] })).promise;
    equal(connectionResponse.envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED, "Transport rejects must map to a stable code.");
    const serializedDiagnostics = JSON.stringify(connection.provider.getDiagnostics());
    check(!serializedDiagnostics.includes("secret") && !serializedDiagnostics.includes("private-message") && !serializedDiagnostics.includes(DEFAULT_ENDPOINT), "Diagnostics must redact transport and request data.");
    const diagnostics = connection.provider.getDiagnostics();
    assert.throws(() => { diagnostics.state = "edited"; }, TypeError); assertions += 1;
    equal(connection.provider.getDiagnostics().state, "failed", "External diagnostic mutation must not affect state.");
    check(connection.scheduler.cleared() >= 1, "Terminal requests must clear their timer.");

    const safetyUnhandled = await captureUnhandled(async () => {
        const repeatedId = "req_" + "r".repeat(32);
        const replacementId = "req_" + "s".repeat(32);
        let collisionCalls = 0;
        const collisionClock = makeProtocol({ randomId: () => { collisionCalls += 1; return collisionCalls <= 2 ? repeatedId : replacementId; } });
        const collisionHarness = createHarness({ clock: collisionClock });
        const collisionFirst = collisionHarness.provider.start(input()); await collisionFirst.promise;
        const collisionSecond = collisionHarness.provider.start(input()); await collisionSecond.promise;
        equal(collisionFirst.requestId, repeatedId, "The first deterministic request id must be issued.");
        equal(collisionSecond.requestId, replacementId, "A collided request id must be retried.");
        equal(collisionCalls, 3, "A single collision must consume exactly one retry.");

        let exhaustedCalls = 0;
        const exhaustedClock = makeProtocol({ randomId: () => { exhaustedCalls += 1; return repeatedId; } });
        const exhaustedHarness = createHarness({ clock: exhaustedClock });
        await exhaustedHarness.provider.start(input()).promise;
        expectCode(() => exhaustedHarness.provider.start(input()), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Request id collision exhaustion must fail with a stable code.");
        equal(exhaustedCalls, 1 + 1 + base.protocol.HARD_LIMITS.maxIdCollisionRetries, "Collision retries must have a fixed upper bound.");

        let oldCancelCall = 0;
        const oldCancelDeferred = deferred();
        const oldCancelClock = makeProtocol({ randomId: () => { oldCancelCall += 1; return oldCancelCall <= 2 ? repeatedId : replacementId; } });
        let oldCancelTransportCall = 0;
        const oldCancelHarness = createHarness({ clock: oldCancelClock, responder: (request) => {
            oldCancelTransportCall += 1;
            return oldCancelTransportCall === 1 ? Promise.resolve(transportResult(wrapper(canonicalContent(oldCancelClock.protocol, request)))) : oldCancelDeferred.promise;
        } });
        const oldHandle = oldCancelHarness.provider.start(input()); await oldHandle.promise;
        const newHandle = oldCancelHarness.provider.start(input()); await flush();
        equal(oldCancelHarness.provider.cancel(oldHandle.requestId), false, "An old request id must not cancel a newer request.");
        equal(oldCancelHarness.provider.cancel(newHandle.requestId), true, "The replacement request id must remain cancellable.");
        await newHandle.promise;

        let clockCalls = 0;
        const recoveringClock = makeProtocol({ now: () => { clockCalls += 1; if (clockCalls === 1) throw new Error("clock secret"); return 100; } });
        const recoveringHarness = createHarness({ clock: recoveringClock });
        expectCode(() => recoveringHarness.provider.start(input()), base.protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Initial clock failures must remain pre-publication failures.");
        check(recoveringHarness.provider.getState().state !== "pending", "Initial clock failures must not publish pending state.");
        await recoveringHarness.provider.start(input()).promise;
        equal(recoveringHarness.provider.getState().state, "completed", "A Provider must restart after an initial clock failure.");

        let abortFactoryCalls = 0;
        const abortScheduler = makeScheduler();
        const abortRuntime = makeRuntime(abortScheduler, { createAbortController: () => {
            abortFactoryCalls += 1;
            if (abortFactoryCalls === 2) throw new Error("abort factory secret");
            return { signal: {}, abort() {} };
        } });
        const abortFactoryHarness = createHarness({ scheduler: abortScheduler, runtimeBundle: abortRuntime });
        expectCode(() => abortFactoryHarness.provider.start(input()), base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "AbortController creation failures must remain pre-publication failures.");
        check(abortFactoryHarness.provider.getState().state !== "pending", "AbortController failures must not publish pending state.");
        await abortFactoryHarness.provider.start(input()).promise;

        let timerCalls = 0;
        const timerScheduler = makeScheduler();
        const timerRuntime = makeRuntime(timerScheduler, { setTimeout: (callback, delay) => {
            timerCalls += 1;
            if (timerCalls === 1) throw new Error("timer secret");
            return timerScheduler.setTimeout(callback, delay);
        } });
        const timerFailure = createHarness({ scheduler: timerScheduler, runtimeBundle: timerRuntime });
        const timerFailureHandle = timerFailure.provider.start(input());
        equal((await timerFailureHandle.promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID, "Timer startup failures must settle the returned Promise.");
        equal(timerFailure.provider.getState().state, "failed", "Timer startup failures must exit pending.");
        await timerFailure.provider.start(input()).promise;

        const throwingThenable = createHarness({ responder: () => Object.defineProperty({}, "then", { get() { throw new Error("then secret"); } }) });
        equal((await throwingThenable.provider.start(input()).promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED, "Throwing thenable access must become a connection failure.");
        equal(throwingThenable.provider.getState().state, "failed", "Invalid thenables must exit pending.");

        let terminalClockCalls = 0;
        const terminalClock = makeProtocol({ now: () => { terminalClockCalls += 1; if (terminalClockCalls > 1) throw new Error("terminal clock secret"); return 100; } });
        const terminalClockHarness = createHarness({ clock: terminalClock });
        equal((await terminalClockHarness.provider.start(input()).promise).envelope.type, "text", "Terminal clock failures must not block successful settlement.");
        equal(terminalClockHarness.provider.getDiagnostics().elapsedMs, 0, "Terminal clock failures must use a zero elapsed fallback.");

        let backwardClockCalls = 0;
        const backwardClock = makeProtocol({ now: () => { backwardClockCalls += 1; return backwardClockCalls === 1 ? 100 : 50; } });
        const backwardHarness = createHarness({ clock: backwardClock });
        await backwardHarness.provider.start(input()).promise;
        equal(backwardHarness.provider.getDiagnostics().elapsedMs, 0, "Backward clocks must clamp elapsed time to zero.");

        const clearThrowScheduler = makeScheduler();
        const clearThrowRuntime = makeRuntime(clearThrowScheduler, { clearTimeout: () => { throw new Error("clear secret"); } });
        const clearThrowHarness = createHarness({ scheduler: clearThrowScheduler, runtimeBundle: clearThrowRuntime });
        equal((await clearThrowHarness.provider.start(input()).promise).envelope.type, "text", "clearTimeout failures must not block settlement.");

        const abortThrowScheduler = makeScheduler();
        const abortThrowRuntime = makeRuntime(abortThrowScheduler, { createAbortController: () => ({ signal: {}, abort() { throw new Error("abort secret"); } }) });
        const abortThrowHarness = createHarness({ scheduler: abortThrowScheduler, runtimeBundle: abortThrowRuntime, responder: () => deferred().promise });
        const abortThrowHandle = abortThrowHarness.provider.start(input());
        check(abortThrowHarness.provider.cancel(abortThrowHandle.requestId), "Cancellation must commit even when abort throws.");
        equal((await abortThrowHandle.promise).envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_REQUEST_ABORTED, "Abort failures must not block cancellation settlement.");

        async function expectInvalidTransport(makeValue, label) {
            const harness = createHarness({ responder: (request) => Promise.resolve(makeValue(request)) });
            const response = await harness.provider.start(input()).promise;
            equal(response.envelope.error.code, base.protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID, label + " must be rejected.");
            equal(harness.provider.getDiagnostics().httpStatus, null, label + " must not enter diagnostics as an HTTP status.");
            equal(harness.provider.getState().state, "failed", label + " must exit pending.");
        }
        for (const status of [NaN, Infinity, -Infinity, "200", 99, 600, 1000000]) {
            await expectInvalidTransport(() => transportResult("{}", { status }), "Invalid status " + String(status));
        }
        let statusGetterCalls = 0;
        await expectInvalidTransport(() => {
            const value = transportResult("{}");
            Object.defineProperty(value, "status", { enumerable: true, get() { statusGetterCalls += 1; return 200; } });
            return value;
        }, "A status getter");
        equal(statusGetterCalls, 0, "Transport status getters must never execute.");
        let statusSetterCalls = 0;
        await expectInvalidTransport(() => {
            const value = transportResult("{}");
            Object.defineProperty(value, "status", { enumerable: true, set() { statusSetterCalls += 1; } });
            return value;
        }, "A status setter");
        equal(statusSetterCalls, 0, "Transport status setters must never execute.");
        let bodyGetterCalls = 0;
        await expectInvalidTransport(() => {
            const value = transportResult("{}");
            Object.defineProperty(value, "bodyText", { enumerable: true, get() { bodyGetterCalls += 1; return "{}"; } });
            return value;
        }, "A body getter");
        equal(bodyGetterCalls, 0, "Transport body getters must never execute.");
        await expectInvalidTransport(() => new Proxy(transportResult("{}"), { getOwnPropertyDescriptor() { throw new Error("descriptor secret"); } }), "A descriptor-throwing Proxy");
        await expectInvalidTransport(() => Object.assign(Object.create({ inherited: true }), transportResult("{}")), "A custom-prototype response");
        await expectInvalidTransport(() => { const value = transportResult("{}"); value.self = value; return value; }, "A cyclic response");
        let proxyGetCalls = 0;
        const proxyPassHarness = createHarness({ responder: (request) => Promise.resolve(new Proxy(transportResult(wrapper(canonicalContent(base.protocol, request))), { get(target, key) { if (key === "then") return undefined; proxyGetCalls += 1; throw new Error("get secret " + String(key)); } })) });
        equal((await proxyPassHarness.provider.start(input()).promise).envelope.type, "text", "A descriptor-safe Proxy must be snapshotted without property gets.");
        equal(proxyGetCalls, 0, "Transport Proxy get traps must not execute.");
        let restartTransportCalls = 0;
        const restartAfterInvalid = createHarness({ responder: (request) => {
            restartTransportCalls += 1;
            return Promise.resolve(restartTransportCalls === 1 ? transportResult("{}", { status: NaN }) : transportResult(wrapper(canonicalContent(base.protocol, request))));
        } });
        const invalidHandle = restartAfterInvalid.provider.start(input()); await invalidHandle.promise;
        const recoveredHandle = restartAfterInvalid.provider.start(input());
        equal((await recoveredHandle.promise).envelope.type, "text", "A Provider must restart after an invalid transport result.");
        check(recoveredHandle.requestId !== invalidHandle.requestId, "Transport failure recovery must issue a new request id.");
    });
    equal(safetyUnhandled.length, 0, "Provider failure injection must not produce unhandled rejections.");

    const snapshot = createHarness();
    snapshot.config.model = "changed";
    snapshot.config.endpoint = "http://localhost:9999/v1/chat/completions";
    snapshot.transport.sendJson = () => Promise.reject(new Error("changed"));
    snapshot.config.runtime.parseUrl = () => { throw new Error("changed"); };
    const snapshotResponse = await snapshot.provider.start(input()).promise;
    equal(snapshotResponse.model, "Qwen3.5-4B-Q6_K", "Configuration mutations must not change the model snapshot.");
    equal(snapshot.calls[0].url, DEFAULT_ENDPOINT, "Configuration mutations must not change the endpoint snapshot.");

    const sourceRoot = path.join(__dirname, "..", "client", "js", "vela");
    const providerSource = fs.readFileSync(path.join(sourceRoot, "velaProviderAdapter.js"), "utf8");
    check(!/(?:CSInterface|evalScript|\$\.evalFile|AEToolbox|\bapp\b|\bwindow\b|\bdocument\b|localStorage|fetch\(|XMLHttpRequest|WebSocket|require\([^)]+(?:crypto|http|https|net)|\beval\(|\bFunction\s*\()/.test(providerSource), "Provider core must contain no AE, DOM, network or dynamic runtime dependency.");
    equal((providerSource.match(/require\(/g) || []).length, 5, "CommonJS must use exactly five fixed local requires.");
    check(!providerSource.includes("Return exactly one complete JSON object and nothing else."), "Adapter delegates the complete system prompt instead of retaining a second prompt source.");

    function browserContext() { const context = { console }; context.self = context; vm.createContext(context); return context; }
    function loadUmd(context, name) { return vm.runInContext(fs.readFileSync(path.join(sourceRoot, name), "utf8"), context, { filename: name }); }
    const browser = browserContext();
    loadUmd(browser, "velaProtocol.js"); loadUmd(browser, "velaResponseParser.js"); loadUmd(browser, "velaCapabilityContracts.js"); loadUmd(browser, "velaProviderRequestBranchPolicy.js"); loadUmd(browser, "velaCapabilityPromptBuilder.js"); loadUmd(browser, "velaProviderAdapter.js");
    equal(typeof browser.VelaProviderAdapter.createLocalOpenAICompatibleProvider, "function", "Provider UMD must load after its fixed dependencies.");
    const browserProviderId = vm.runInContext(`(function () {
        var protocol = VelaProtocol.createProtocol({
            utf8ByteLength: function (text) { return unescape(encodeURIComponent(text)).length; },
            sha256Hex: function () { return "a".repeat(64); },
            randomId: function (kind) { return kind + "_" + "a".repeat(32); },
            now: function () { return 1; }
        });
        return VelaProviderAdapter.createLocalOpenAICompatibleProvider({
            protocol: protocol,
            transport: { sendJson: function () { return Promise.resolve({}); } },
            model: "browser-model",
            requestProfile: VelaProviderRequestBranchPolicy.PROFILES.TEXT_ONLY,
            runtime: {
                setTimeout: function () { return 1; },
                clearTimeout: function () {},
                createAbortController: function () { return { signal: {}, abort: function () {} }; },
                parseUrl: function (url) { return { protocol: "http:", hostname: "127.0.0.1", port: "1234", pathname: "/v1/chat/completions", username: "", password: "", search: "", hash: "", href: url }; },
                nowMs: function () { return 0; }
            }
        }).id;
    }())`, browser);
    equal(browserProviderId, "lmstudio", "Provider UMD must execute its browser factory with injected capabilities.");
    let duplicateCode = null; try { loadUmd(browser, "velaProviderAdapter.js"); } catch (error) { duplicateCode = error.code; }
    equal(duplicateCode, "MODULE_ALREADY_REGISTERED", "Duplicate Provider UMD loading must fail closed.");
    const missingProtocol = browserContext(); let missingProtocolCode = null; try { loadUmd(missingProtocol, "velaProviderAdapter.js"); } catch (error) { missingProtocolCode = error.code; }
    equal(missingProtocolCode, "RUNTIME_CAPABILITY_UNAVAILABLE", "Provider UMD requires Protocol bootstrap.");
    const missingParser = browserContext(); loadUmd(missingParser, "velaProtocol.js"); let missingParserCode = null; try { loadUmd(missingParser, "velaProviderAdapter.js"); } catch (error) { missingParserCode = error.code; }
    equal(missingParserCode, "RUNTIME_CAPABILITY_UNAVAILABLE", "Provider UMD requires ResponseParser.");
    const missingPromptBuilder = browserContext(); loadUmd(missingPromptBuilder, "velaProtocol.js"); loadUmd(missingPromptBuilder, "velaResponseParser.js"); loadUmd(missingPromptBuilder, "velaCapabilityContracts.js"); let missingPromptBuilderCode = null; try { loadUmd(missingPromptBuilder, "velaProviderAdapter.js"); } catch (error) { missingPromptBuilderCode = error.code; }
    equal(missingPromptBuilderCode, "RUNTIME_CAPABILITY_UNAVAILABLE", "Provider UMD requires Capability Prompt Builder.");
    const conflict = browserContext(); loadUmd(conflict, "velaProtocol.js"); loadUmd(conflict, "velaResponseParser.js"); loadUmd(conflict, "velaCapabilityContracts.js"); loadUmd(conflict, "velaProviderRequestBranchPolicy.js"); loadUmd(conflict, "velaCapabilityPromptBuilder.js"); const existing = { fake: true }; conflict.VelaProviderAdapter = existing; let conflictCode = null; try { loadUmd(conflict, "velaProviderAdapter.js"); } catch (error) { conflictCode = error.code; }
    check(conflictCode === "MODULE_BOOTSTRAP_CONFLICT" && conflict.VelaProviderAdapter === existing && conflict.__velaProtocolCoreBootstrapV1.hasModule("VelaProviderAdapter") === false, "Preloaded Provider globals must not be overwritten or partially registered.");

    function fakeBootstrapContext(options) {
        options = options || {};
        const context = browserContext();
        let registerCalls = 0;
        const protocolValue = Object.freeze({ createProtocol() {}, isTrustedProtocol() { return true; }, ERROR_CODES: {} });
        const parserValue = Object.freeze({ createResponseParser() {} });
        const capabilityValue = Object.freeze({ getModelProjection() { return Object.freeze({ capabilityId: "set-opacity-v1", parameters: Object.freeze({ properties: Object.freeze({ opacity: Object.freeze({ minimum: 0, maximum: 100 }) }) }) }); } });
        const policyValue = Object.freeze({ PROFILES: Object.freeze({ TEXT_ONLY: "text-only", EXPLICIT_EDIT_ELIGIBLE: "explicit-edit-eligible" }), createRequestBranchPolicy() {} });
        const promptBuilderValue = Object.freeze({ buildSystemPrompt() { return "prompt"; } });
        const modules = Object.assign({ VelaProtocol: protocolValue, VelaResponseParser: parserValue, VelaCapabilityContracts: capabilityValue, VelaProviderRequestBranchPolicy: policyValue, VelaCapabilityPromptBuilder: promptBuilderValue }, options.modules || {});
        const bootstrap = Object.freeze({
            getModule(name) { return modules[name]; },
            hasModule(name) { return Object.prototype.hasOwnProperty.call(modules, name); },
            registerModule(name, value) { registerCalls += 1; modules[name] = value; }
        });
        Object.defineProperty(context, "__velaProtocolCoreBootstrapV1", { configurable: options.bootstrapConfigurable === true, enumerable: false, value: bootstrap, writable: options.bootstrapWritable === true });
        if (options.installGlobals !== false) {
            Object.defineProperty(context, "VelaProtocol", { configurable: options.globalConfigurable === true, enumerable: true, value: options.protocolGlobal || protocolValue, writable: options.globalWritable === true });
            Object.defineProperty(context, "VelaResponseParser", { configurable: false, enumerable: true, value: options.parserGlobal || parserValue, writable: false });
            Object.defineProperty(context, "VelaCapabilityContracts", { configurable: false, enumerable: true, value: options.capabilityGlobal || capabilityValue, writable: false });
            Object.defineProperty(context, "VelaProviderRequestBranchPolicy", { configurable: false, enumerable: true, value: options.policyGlobal || policyValue, writable: false });
            Object.defineProperty(context, "VelaCapabilityPromptBuilder", { configurable: false, enumerable: true, value: options.promptBuilderGlobal || promptBuilderValue, writable: false });
        }
        return { context, registerCalls: () => registerCalls, protocolValue, parserValue, capabilityValue, policyValue, promptBuilderValue };
    }
    const writableBootstrap = fakeBootstrapContext({ bootstrapWritable: true }); let writableBootstrapCode = null; try { loadUmd(writableBootstrap.context, "velaProviderAdapter.js"); } catch (error) { writableBootstrapCode = error.code; }
    check(writableBootstrapCode === "MODULE_BOOTSTRAP_CONFLICT" && writableBootstrap.registerCalls() === 0 && !writableBootstrap.context.VelaProviderAdapter, "Writable fake bootstraps must be rejected before registration.");
    const missingGlobals = fakeBootstrapContext({ installGlobals: false }); let missingGlobalsCode = null; try { loadUmd(missingGlobals.context, "velaProviderAdapter.js"); } catch (error) { missingGlobalsCode = error.code; }
    check(missingGlobalsCode === "RUNTIME_CAPABILITY_UNAVAILABLE" && missingGlobals.registerCalls() === 0, "A bootstrap without installed module globals must not be trusted.");
    const writableGlobal = fakeBootstrapContext({ globalWritable: true }); let writableGlobalCode = null; try { loadUmd(writableGlobal.context, "velaProviderAdapter.js"); } catch (error) { writableGlobalCode = error.code; }
    check(writableGlobalCode === "MODULE_BOOTSTRAP_CONFLICT" && writableGlobal.registerCalls() === 0, "Writable dependency globals must be rejected.");
    const mismatchedIdentity = fakeBootstrapContext({ protocolGlobal: Object.freeze({ createProtocol() {}, isTrustedProtocol() { return true; }, ERROR_CODES: {} }) }); let identityCode = null; try { loadUmd(mismatchedIdentity.context, "velaProviderAdapter.js"); } catch (error) { identityCode = error.code; }
    check(identityCode === "MODULE_BOOTSTRAP_CONFLICT" && mismatchedIdentity.registerCalls() === 0, "Bootstrap modules must exactly match installed dependency globals.");

    console.log("PASS Vela provider: " + assertions + " assertions.");
}

run().catch((error) => {
    console.error("FAIL Vela provider - " + error.message);
    process.exitCode = 1;
});
