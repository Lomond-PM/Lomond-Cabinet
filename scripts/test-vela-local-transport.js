#!/usr/bin/env node
"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const adapterModule = require("../client/js/vela/velaProviderAdapter");
const transportModule = require("../client/js/vela/velaLocalTransport");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function makeProtocol() { return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v, "utf8").digest("hex"), randomId: (kind) => kind + "_" + "a".repeat(32), now: () => 1 }); }
function providerRuntime() { return { setTimeout() { return 1; }, clearTimeout() {}, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const url = new URL(value); return { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, username: url.username, password: url.password, search: url.search, hash: url.hash, href: url.href }; }, nowMs() { return 1; } }; }
function response(text, options) { options = options || {}; let used = false; return { status: options.status === undefined ? 200 : options.status, redirected: options.redirected === true, url: options.url || "http://127.0.0.1:1234/v1/chat/completions", headers: { get: () => options.contentType === undefined ? "application/json" : options.contentType }, body: { getReader() { return { read() { if (used) return Promise.resolve({ done: true }); used = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(text) }); }, cancel() { return Promise.resolve(); } }; } } }; }
async function run() {
    const protocol = makeProtocol(); let call = null;
    const transport = transportModule.createLocalTransport({ protocol, fetch(url, options) { call = { url, options }; return Promise.resolve(response("{}")); }, TextDecoder });
    const result = await transport.sendJson({ url: "http://127.0.0.1:1234/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json" }, body: { a: 1 }, signal: {}, allowRedirects: false, maxRequestBytes: 1024, maxResponseBytes: 1024 });
    check(Object.isFrozen(result) && result.bodyText === "{}", "Transport returns only a frozen safe response snapshot.");
    check(call.options.credentials === "omit" && call.options.redirect === "error" && call.options.method === "POST", "Transport enforces omit credentials, POST and redirect error.");
    check(call.options.headers.Authorization === undefined, "Transport never sends Authorization.");
    await assert.rejects(transport.sendJson({ url: "https://example.com/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json" }, body: {}, signal: {}, allowRedirects: false, maxRequestBytes: 10, maxResponseBytes: 10 }), (error) => error.code === "PROVIDER_CONFIG_INVALID"); assertions += 1;
    const badType = transportModule.createLocalTransport({ protocol, fetch() { return Promise.resolve(response("{}", { contentType: "text/html" })); }, TextDecoder });
    check((await badType.sendJson({ url: "http://localhost:1234/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json" }, body: {}, signal: {}, allowRedirects: false, maxRequestBytes: 1024, maxResponseBytes: 1024 })).contentType === "text/html", "Transport preserves only bounded normalized content type for adapter validation.");
    const oversized = transportModule.createLocalTransport({ protocol, fetch() { return Promise.resolve(response("x".repeat(20))); }, TextDecoder });
    await assert.rejects(oversized.sendJson({ url: "http://[::1]:1234/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json" }, body: {}, signal: {}, allowRedirects: false, maxRequestBytes: 1024, maxResponseBytes: 4 }), (error) => error.code === "PROVIDER_RESPONSE_TOO_LARGE"); assertions += 1;
    let deepBody = {};
    let cursor = deepBody;
    for (let index = 0; index < 9; index += 1) { cursor.next = {}; cursor = cursor.next; }
    const request = { url: "http://127.0.0.1:1234/v1/chat/completions", method: "POST", headers: { "Content-Type": "application/json" }, signal: {}, allowRedirects: false, maxRequestBytes: 8192, maxResponseBytes: 1024 };
    await assert.rejects(transport.sendJson(Object.assign({}, request, { body: deepBody })), (error) => error.code === "PAYLOAD_BUDGET_EXCEEDED"); assertions += 1;
    await assert.rejects(transport.sendJson(Object.assign({}, request, { body: Object.freeze(deepBody) })), (error) => error.code === "PAYLOAD_BUDGET_EXCEEDED"); assertions += 1;
    const fakeSchemaBody = Object.freeze({ response_format: Object.freeze({ type: "json_schema", json_schema: Object.freeze({ schema: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({ nested: Object.freeze({}) }) }) }) }) }) }) }) }) }) }) });
    await assert.rejects(transport.sendJson(Object.assign({}, request, { body: fakeSchemaBody })), (error) => error.code === "PAYLOAD_BUDGET_EXCEEDED"); assertions += 1;
    const accessorBody = {};
    Object.defineProperty(accessorBody, "body", { enumerable: true, get() { throw new Error("must not run"); } });
    await assert.rejects(transport.sendJson(Object.assign({}, request, { body: accessorBody })), (error) => error.code === "UNSAFE_JSON_VALUE"); assertions += 1;
    let crossInstanceFetches = 0;
    const otherTransport = transportModule.createLocalTransport({ protocol, fetch() { crossInstanceFetches += 1; return Promise.resolve(response("{}")); }, TextDecoder });
    const crossProvider = adapterModule.createLocalOpenAICompatibleProvider({ protocol, transport: { sendJson(input) { return otherTransport.sendJson(input); } }, model: "m", responseFormatMode: "json-schema", runtime: providerRuntime() });
    await crossProvider.start({ messages: [{ role: "user", content: "x" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } }).promise;
    check(crossInstanceFetches === 0, "A body branded for another transport instance must not reach fetch.");
    let capturedTrustedRequest = null;
    const captureProvider = adapterModule.createLocalOpenAICompatibleProvider({ protocol, transport: { sendJson(input) { capturedTrustedRequest = input; return Promise.resolve({ status: 500, contentType: "application/json", bodyText: "{}", redirected: false, finalUrl: input.url }); } }, model: "m", responseFormatMode: "json-schema", runtime: providerRuntime() });
    await captureProvider.start({ messages: [{ role: "user", content: "x" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } }).promise;
    await assert.rejects(transport.sendJson(capturedTrustedRequest), (error) => error.code === "PAYLOAD_BUDGET_EXCEEDED"); assertions += 1;
    check(call !== null, "Only the adapter's original, same-transport send attempt may use its short-lived provenance.");
    let trustedPayload = null;
    const trustedTransport = transportModule.createLocalTransport({ protocol, fetch(url, options) { trustedPayload = JSON.parse(options.body); return Promise.resolve(response("{}", { status: 500, url })); }, TextDecoder });
    const trustedProvider = adapterModule.createLocalOpenAICompatibleProvider({ protocol, transport: trustedTransport, model: "m", responseFormatMode: "json-schema", runtime: providerRuntime() });
    await trustedProvider.start({ messages: [{ role: "assistant", content: "bounded context" }, { role: "user", content: "current user text" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } }).promise;
    const trustedSchema = trustedPayload.response_format.json_schema.schema;
    check(trustedPayload.messages.length === 3 && trustedPayload.messages.map((message) => message.role).join(",") === "system,assistant,user" && trustedPayload.messages[2].content === "current user text", "Trusted serialization must preserve all ordered system, context and user messages.");
    check(trustedSchema.required.length === 6 && trustedSchema.required.join(",") === "protocol,schemaVersion,requestId,provider,model,envelope", "Trusted serialization must preserve every canonical response required field.");
    const variants = trustedSchema.properties.envelope.oneOf;
    check(variants.length === 2 && variants[0].properties.type.enum[0] === "text" && variants[1].properties.type.enum[0] === "localProposal" && variants[1].properties.proposal.properties.params.properties.opacity.maximum === 100, "Trusted serialization must expose only model-authorized text and bounded localProposal envelope variants in order.");
    check(trustedSchema.properties.protocol.enum.length === 1 && !/code|stage|retryable|details/.test(JSON.stringify(trustedSchema.properties.envelope)), "Trusted serialization must keep canonical metadata while omitting model-visible error structure.");
    console.log("test-vela-local-transport: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
