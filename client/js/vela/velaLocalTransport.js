(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaLocalTransport";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";
    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertProtocol(moduleValue) {
        if (!moduleValue || typeof moduleValue.isTrustedProtocol !== "function" || typeof moduleValue.createProtocol !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        return moduleValue;
    }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var protocol;
        var adapter;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function" || bootstrap.hasModule("VelaProtocol") !== true || bootstrap.hasModule("VelaProviderAdapter") !== true) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        protocol = bootstrap.getModule("VelaProtocol");
        adapter = bootstrap.getModule("VelaProviderAdapter");
        if (protocol !== target.VelaProtocol || !Object.isFrozen(protocol) || adapter !== target.VelaProviderAdapter || !Object.isFrozen(adapter)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        exported = Object.freeze(create(assertProtocol(protocol), adapter));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocol(require("./velaProtocol")), require("./velaProviderAdapter")));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, providerAdapterModule) {
    "use strict";

    var ENDPOINT_PATTERN = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([1-9][0-9]{0,4})\/v1\/chat\/completions$/;
    var MODELS_ENDPOINT_PATTERN = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([1-9][0-9]{0,4})\/api\/v1\/models$/;
    var trustedTransports = new WeakSet();
    var transportProtocols = new WeakMap();
    var hasOwn = Object.prototype.hasOwnProperty;
    var TRUSTED_SCHEMA_MAX_DEPTH = 16;

    function ownData(value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { return undefined; }
        return descriptor && !descriptor.get && !descriptor.set && hasOwn.call(descriptor, "value") ? descriptor.value : undefined;
    }
    function protocolError(protocol, code, details) { return new protocol.VelaProtocolError(code, undefined, { stage: "local-transport", details: details || {} }); }
    function endpointIsLocal(url) {
        var match = typeof url === "string" ? ENDPOINT_PATTERN.exec(url) : null;
        return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 65535;
    }
    function modelsEndpointIsLocal(url) {
        var match = typeof url === "string" ? MODELS_ENDPOINT_PATTERN.exec(url) : null;
        return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 65535;
    }
    function validHeaders(headers) {
        return headers && Object.keys(headers).length === 1 && ownData(headers, "Content-Type") === "application/json";
    }
    function trustedAdapterAvailable() {
        return providerAdapterModule && typeof providerAdapterModule.isTrustedOutboundBodyForTransport === "function";
    }
    function dangerousKey(key) {
        key = String(key).toLowerCase();
        return key === "__proto__" || key === "prototype" || key === "constructor";
    }
    function trustedString(value) {
        var index;
        if (typeof value !== "string" || typeof value.normalize !== "function") { throw new Error("invalid string"); }
        for (index = 0; index < value.length; index += 1) {
            var code = value.charCodeAt(index);
            if (code >= 0xd800 && code <= 0xdbff) {
                if (index + 1 >= value.length || value.charCodeAt(index + 1) < 0xdc00 || value.charCodeAt(index + 1) > 0xdfff) { throw new Error("invalid surrogate"); }
                index += 1;
            } else if (code >= 0xdc00 && code <= 0xdfff) {
                throw new Error("invalid surrogate");
            }
        }
        return value.normalize("NFC");
    }
    function trustedSerialize(value, protocol, active, depth) {
        var names;
        var parts;
        var index;
        var descriptor;
        if (value === null) { return "null"; }
        if (typeof value === "string") { return JSON.stringify(trustedString(value)); }
        if (typeof value === "boolean") { return value ? "true" : "false"; }
        if (typeof value === "number") {
            if (!Number.isFinite(value) || Object.is(value, -0)) { throw new Error("invalid number"); }
            return JSON.stringify(value);
        }
        if (!value || typeof value !== "object" || depth > TRUSTED_SCHEMA_MAX_DEPTH || active.indexOf(value) !== -1) { throw new Error("invalid value"); }
        active.push(value);
        try {
            if (Array.isArray(value)) {
                var lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
                var arrayLength;
                var itemDescriptor;
                if (!lengthDescriptor || lengthDescriptor.get || lengthDescriptor.set || !hasOwn.call(lengthDescriptor, "value") || !Number.isInteger(lengthDescriptor.value) || lengthDescriptor.value < 0 || lengthDescriptor.value > protocol.HARD_LIMITS.maxArrayLength) { throw new Error("invalid array"); }
                arrayLength = lengthDescriptor.value;
                names = Object.getOwnPropertyNames(value);
                if (names.length !== arrayLength + 1) { throw new Error("sparse or extended array"); }
                parts = [];
                for (index = 0; index < arrayLength; index += 1) {
                    itemDescriptor = Object.getOwnPropertyDescriptor(value, String(index));
                    if (!itemDescriptor || itemDescriptor.get || itemDescriptor.set || !hasOwn.call(itemDescriptor, "value") || itemDescriptor.enumerable !== true) { throw new Error("invalid array item"); }
                    parts.push(trustedSerialize(itemDescriptor.value, protocol, active, depth + 1));
                }
                return "[" + parts.join(",") + "]";
            }
            if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) { throw new Error("invalid prototype"); }
            names = Object.getOwnPropertyNames(value);
            if (names.length > protocol.HARD_LIMITS.maxObjectProperties) { throw new Error("too many properties"); }
            names.sort();
            parts = [];
            for (index = 0; index < names.length; index += 1) {
                if (dangerousKey(names[index])) { throw new Error("dangerous key"); }
                descriptor = Object.getOwnPropertyDescriptor(value, names[index]);
                if (!descriptor || descriptor.get || descriptor.set || !hasOwn.call(descriptor, "value") || descriptor.enumerable !== true) { throw new Error("invalid property"); }
                parts.push(JSON.stringify(trustedString(names[index])) + ":" + trustedSerialize(descriptor.value, protocol, active, depth + 1));
            }
            return "{" + parts.join(",") + "}";
        } finally {
            active.pop();
        }
    }
    function createLocalTransport(options) {
        options = options || {};
        var protocol = ownData(options, "protocol");
        var fetchFn = ownData(options, "fetch");
        var TextDecoderCtor = ownData(options, "TextDecoder");
        if (!protocolModule.isTrustedProtocol(protocol) || typeof fetchFn !== "function" || typeof TextDecoderCtor !== "function" || !protocol.isPlainObject(options)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        protocol.assertNoUnknownKeys(options, ["protocol", "fetch", "TextDecoder"], "localTransport.options");
        if (!trustedAdapterAvailable()) { throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); }
        function sendJson(input) {
            var responseStarted = false;
            if (!protocol.isPlainObject(input)) { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID)); }
            try {
                protocol.assertNoUnknownKeys(input, ["url", "method", "headers", "body", "signal", "allowRedirects", "maxRequestBytes", "maxResponseBytes"], "localTransport.request");
                if (!endpointIsLocal(input.url) || input.method !== "POST" || input.allowRedirects !== false || !validHeaders(input.headers) ||
                        !Number.isInteger(input.maxRequestBytes) || !Number.isInteger(input.maxResponseBytes) || input.maxRequestBytes < 1 || input.maxResponseBytes < 1) {
                    throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID);
                }
                var trustedBody = providerAdapterModule.isTrustedOutboundBodyForTransport(input.body, transport, protocol) === true;
                var requestText;
                if (trustedBody) {
                    requestText = trustedSerialize(input.body, protocol, [], 0);
                } else {
                    protocol.assertSafeJson(input.body);
                    requestText = protocol.canonicalStringify(input.body, { maxBytes: input.maxRequestBytes });
                }
                if (protocol.utf8ByteLength(requestText) > input.maxRequestBytes) { throw protocolError(protocol, protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED); }
            } catch (error) {
                return Promise.reject(error instanceof protocol.VelaProtocolError ? error : protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID));
            }
            return Promise.resolve().then(function () {
                return fetchFn(input.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: requestText, signal: input.signal, credentials: "omit", redirect: "error" });
            }).then(function (response) {
                var reader;
                var decoder;
                var chunks = [];
                var total = 0;
                if (!response || typeof response.status !== "number" || !response.headers || typeof response.headers.get !== "function" || !response.body || typeof response.body.getReader !== "function") {
                    throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID);
                }
                responseStarted = true;
                reader = response.body.getReader();
                decoder = new TextDecoderCtor("utf-8", { fatal: true });
                function readNext() {
                    return Promise.resolve(reader.read()).then(function (part) {
                        if (!part || typeof part.done !== "boolean") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                        if (part.done) { return decoder.decode(); }
                        if (!part.value || typeof part.value.byteLength !== "number") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                        total += part.value.byteLength;
                        if (total > input.maxResponseBytes) {
                            try { reader.cancel(); } catch (ignored) {}
                            throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE);
                        }
                        chunks.push(decoder.decode(part.value, { stream: true }));
                        return readNext();
                    });
                }
                return readNext().then(function (tail) {
                    var bodyText = chunks.join("") + tail;
                    if (protocol.utf8ByteLength(bodyText) > input.maxResponseBytes) { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE); }
                    return protocol.deepFreeze({ status: response.status, contentType: String(response.headers.get("content-type") || ""), bodyText: bodyText, redirected: response.redirected === true, finalUrl: String(response.url || "") });
                });
            }).catch(function (error) {
                if (error instanceof protocol.VelaProtocolError) { throw error; }
                throw protocolError(protocol, responseStarted ? protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID : protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED);
            });
        }
        function readJson(input) {
            var responseStarted = false;
            if (!protocol.isPlainObject(input)) { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID)); }
            try {
                protocol.assertNoUnknownKeys(input, ["url", "signal", "maxResponseBytes"], "localTransport.readRequest");
                if (!modelsEndpointIsLocal(input.url) || !Number.isInteger(input.maxResponseBytes) || input.maxResponseBytes < 1) { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID); }
            } catch (error) { return Promise.reject(error instanceof protocol.VelaProtocolError ? error : protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID)); }
            return Promise.resolve().then(function () {
                return fetchFn(input.url, { method: "GET", headers: { "Accept": "application/json" }, signal: input.signal, credentials: "omit", redirect: "error" });
            }).then(function (response) {
                var reader;
                var decoder;
                var chunks = [];
                var total = 0;
                if (!response || typeof response.status !== "number" || !response.headers || typeof response.headers.get !== "function" || !response.body || typeof response.body.getReader !== "function") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                responseStarted = true;
                reader = response.body.getReader();
                decoder = new TextDecoderCtor("utf-8", { fatal: true });
                function readNext() {
                    return Promise.resolve(reader.read()).then(function (part) {
                        if (!part || typeof part.done !== "boolean") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                        if (part.done) { return decoder.decode(); }
                        if (!part.value || typeof part.value.byteLength !== "number") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                        total += part.value.byteLength;
                        if (total > input.maxResponseBytes) { try { reader.cancel(); } catch (ignored) {} throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE); }
                        chunks.push(decoder.decode(part.value, { stream: true }));
                        return readNext();
                    });
                }
                return readNext().then(function (tail) {
                    var bodyText = chunks.join("") + tail;
                    if (protocol.utf8ByteLength(bodyText) > input.maxResponseBytes) { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE); }
                    return protocol.deepFreeze({ status: response.status, contentType: String(response.headers.get("content-type") || ""), bodyText: bodyText, redirected: response.redirected === true, finalUrl: String(response.url || "") });
                });
            }).catch(function (error) {
                if (error instanceof protocol.VelaProtocolError) { throw error; }
                throw protocolError(protocol, responseStarted ? protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID : protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED);
            });
        }
        function readStream(input) {
            var responseStarted = false;
            var requestText;
            var onChunk;
            var onTransportDiagnostic;
            if (!protocol.isPlainObject(input)) { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID)); }
            try {
                protocol.assertNoUnknownKeys(input, ["url", "method", "headers", "body", "signal", "allowRedirects", "maxRequestBytes", "maxResponseBytes", "onChunk", "onTransportDiagnostic"], "localTransport.streamRequest");
                onChunk = ownData(input, "onChunk");
                onTransportDiagnostic = ownData(input, "onTransportDiagnostic");
                if (!endpointIsLocal(input.url) || input.method !== "POST" || input.allowRedirects !== false || !validHeaders(input.headers) || typeof onChunk !== "function" ||
                        (onTransportDiagnostic !== undefined && typeof onTransportDiagnostic !== "function") || !Number.isInteger(input.maxRequestBytes) || !Number.isInteger(input.maxResponseBytes) || input.maxRequestBytes < 1 || input.maxResponseBytes < 1) { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID); }
                if (providerAdapterModule.isTrustedOutboundBodyForTransport(input.body, transport, protocol) === true) { requestText = trustedSerialize(input.body, protocol, [], 0); }
                else { protocol.assertSafeJson(input.body); requestText = protocol.canonicalStringify(input.body, { maxBytes: input.maxRequestBytes }); }
                if (protocol.utf8ByteLength(requestText) > input.maxRequestBytes) { throw protocolError(protocol, protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED); }
            } catch (error) { return Promise.reject(error instanceof protocol.VelaProtocolError ? error : protocolError(protocol, protocol.ERROR_CODES.PROVIDER_CONFIG_INVALID)); }
            return Promise.resolve(fetchFn(input.url, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "text/event-stream" }, body: requestText, signal: input.signal, credentials: "omit", redirect: "error" })).then(function (response) {
                var reader;
                var decoder;
                var total = 0;
                var decodedChunkCount = 0;
                var earlyStopped = false;
                if (!response || typeof response.status !== "number" || !response.headers || typeof response.headers.get !== "function" || !response.body || typeof response.body.getReader !== "function") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                responseStarted = true;
                reader = response.body.getReader();
                decoder = new TextDecoderCtor("utf-8", { fatal: true });
                function release() { try { if (reader && typeof reader.releaseLock === "function") { reader.releaseLock(); } } catch (ignored) {} }
                function diagnostic(phase, error) {
                    var detail;
                    if (typeof onTransportDiagnostic !== "function") { return; }
                    detail = Object.freeze({
                        phase: phase,
                        httpStatus: response.status,
                        contentType: String(response.headers.get("content-type") || ""),
                        bytesRead: total,
                        decodedChunkCount: decodedChunkCount,
                        readerErrorName: error && typeof error.name === "string" ? error.name.slice(0, 128) : null,
                        readerErrorMessage: error && typeof error.message === "string" ? error.message.slice(0, 256) : null,
                        abortSignaled: input.signal && input.signal.aborted === true,
                        earlyStopped: earlyStopped
                    });
                    try { onTransportDiagnostic(detail); } catch (ignoredDiagnostic) {}
                }
                function completeWithoutEof() {
                    var tail = decoder.decode();
                    if (tail) { onChunk(tail); }
                    earlyStopped = true;
                    try { Promise.resolve(reader.cancel()).catch(function () {}); } catch (ignoredCancel) {}
                    release();
                    diagnostic("protocol-done", null);
                    return protocol.deepFreeze({ status: response.status, contentType: String(response.headers.get("content-type") || ""), bodyText: "", redirected: response.redirected === true, finalUrl: String(response.url || "") });
                }
                function readNext() {
                    return Promise.resolve(reader.read()).then(function (part) {
                        var decoded;
                        if (!part || typeof part.done !== "boolean") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                        if (part.done) {
                            decoded = decoder.decode();
                            if (decoded) { onChunk(decoded); }
                            release();
                            return protocol.deepFreeze({ status: response.status, contentType: String(response.headers.get("content-type") || ""), bodyText: "", redirected: response.redirected === true, finalUrl: String(response.url || "") });
                        }
                        if (!part.value || typeof part.value.byteLength !== "number") { throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID); }
                        total += part.value.byteLength;
                        if (total > input.maxResponseBytes) { try { reader.cancel(); } catch (ignoredCancel) {} release(); throw protocolError(protocol, protocol.ERROR_CODES.PROVIDER_RESPONSE_TOO_LARGE); }
                        decoded = decoder.decode(part.value, { stream: true });
                        if (decoded) {
                            decodedChunkCount += 1;
                            if (onChunk(decoded) === true) { return completeWithoutEof(); }
                        }
                        return readNext();
                    });
                }
                return readNext().catch(function (error) { diagnostic("reader-read", error); release(); throw error; });
            }).catch(function (error) {
                if (error instanceof protocol.VelaProtocolError) { throw error; }
                throw protocolError(protocol, responseStarted ? protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID : protocol.ERROR_CODES.PROVIDER_CONNECTION_FAILED);
            });
        }
        var transport = Object.freeze({ sendJson: sendJson, readStream: readStream, readJson: readJson });
        trustedTransports.add(transport);
        transportProtocols.set(transport, protocol);
        return transport;
    }
    function isTrustedLocalTransportForProtocol(value, protocol) { return trustedTransports.has(value) && transportProtocols.get(value) === protocol && protocolModule.isTrustedProtocol(protocol); }
    return Object.freeze({ createLocalTransport: createLocalTransport, isTrustedLocalTransportForProtocol: isTrustedLocalTransportForProtocol });
}));
