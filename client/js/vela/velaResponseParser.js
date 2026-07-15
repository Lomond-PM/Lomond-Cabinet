(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaResponseParser";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertProtocolModule(dependency) {
        if (!dependency || typeof dependency.createProtocol !== "function" || typeof dependency.isTrustedProtocol !== "function" || !dependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaResponseParser requires VelaProtocol.");
        }
        return dependency;
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaResponseParser requires the Vela protocol bootstrap."); }
        var bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "The Vela protocol bootstrap is invalid.");
        }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered."); }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with the loaded module."); }
        var dependency = assertProtocolModule(bootstrap.getModule("VelaProtocol"));
        var exported = Object.freeze(create(dependency));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(assertProtocolModule(require("./velaProtocol"))));
    } else if (root) {
        registerBrowserModule(root, MODULE_NAME, factory);
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule) {
    "use strict";

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.validateCanonicalResponse !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return protocol;
    }

    function JsonScanner(text, protocol) {
        this.text = text;
        this.index = 0;
        this.protocol = protocol;
    }

    JsonScanner.prototype.fail = function () {
        this.protocol.fail(this.protocol.ERROR_CODES.JSON_PARSE_FAILED, "Provider JSON syntax is invalid.", {
            stage: "response-parse"
        });
    };

    JsonScanner.prototype.skipWhitespace = function () {
        while (this.index < this.text.length && /[\t\n\r ]/.test(this.text[this.index])) {
            this.index += 1;
        }
    };

    JsonScanner.prototype.parseString = function () {
        var start = this.index;
        if (this.text[this.index] !== '"') {
            this.fail();
        }
        this.index += 1;
        var escaped = false;
        while (this.index < this.text.length) {
            var character = this.text[this.index];
            if (escaped) {
                if (character === "u") {
                    if (!/^[0-9a-fA-F]{4}$/.test(this.text.slice(this.index + 1, this.index + 5))) {
                        this.fail();
                    }
                    this.index += 4;
                }
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === '"') {
                this.index += 1;
                try {
                    return JSON.parse(this.text.slice(start, this.index));
                } catch (error) {
                    this.fail();
                }
            } else if (character < " ") {
                this.fail();
            }
            this.index += 1;
        }
        this.fail();
    };

    JsonScanner.prototype.parseNumber = function () {
        var match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.index));
        if (!match) {
            this.fail();
        }
        this.index += match[0].length;
        if (this.index < this.text.length && !/[\t\n\r ,\]}]/.test(this.text[this.index])) {
            this.fail();
        }
    };

    JsonScanner.prototype.parseLiteral = function (literal) {
        if (this.text.slice(this.index, this.index + literal.length) !== literal) {
            this.fail();
        }
        this.index += literal.length;
    };

    JsonScanner.prototype.parseArray = function () {
        this.index += 1;
        this.skipWhitespace();
        if (this.text[this.index] === "]") {
            this.index += 1;
            return;
        }
        while (true) {
            this.parseValue();
            this.skipWhitespace();
            if (this.text[this.index] === "]") {
                this.index += 1;
                return;
            }
            if (this.text[this.index] !== ",") {
                this.fail();
            }
            this.index += 1;
            this.skipWhitespace();
        }
    };

    JsonScanner.prototype.parseObject = function () {
        this.index += 1;
        this.skipWhitespace();
        var keys = Object.create(null);
        if (this.text[this.index] === "}") {
            this.index += 1;
            return;
        }
        while (true) {
            var key = this.parseString();
            if (Object.prototype.hasOwnProperty.call(keys, key)) {
                this.protocol.fail(this.protocol.ERROR_CODES.DUPLICATE_JSON_KEY, "Provider JSON contains a duplicate key.", {
                    stage: "response-parse",
                    details: { field: key }
                });
            }
            keys[key] = true;
            this.skipWhitespace();
            if (this.text[this.index] !== ":") {
                this.fail();
            }
            this.index += 1;
            this.skipWhitespace();
            this.parseValue();
            this.skipWhitespace();
            if (this.text[this.index] === "}") {
                this.index += 1;
                return;
            }
            if (this.text[this.index] !== ",") {
                this.fail();
            }
            this.index += 1;
            this.skipWhitespace();
        }
    };

    JsonScanner.prototype.parseValue = function () {
        this.skipWhitespace();
        var character = this.text[this.index];
        if (character === "{") {
            this.parseObject();
        } else if (character === "[") {
            this.parseArray();
        } else if (character === '"') {
            this.parseString();
        } else if (character === "-") {
            this.parseNumber();
        } else if (character === "t") {
            this.parseLiteral("true");
        } else if (character === "f") {
            this.parseLiteral("false");
        } else if (character === "n") {
            this.parseLiteral("null");
        } else if (/[0-9]/.test(character || "")) {
            this.parseNumber();
        } else {
            this.fail();
        }
    };

    JsonScanner.prototype.parseDocument = function () {
        this.skipWhitespace();
        this.parseValue();
        this.skipWhitespace();
        if (this.index !== this.text.length) {
            this.fail();
        }
    };

    function parseJson(text, protocol) {
        try {
            new JsonScanner(text, protocol).parseDocument();
            return JSON.parse(text);
        } catch (error) {
            if (error instanceof protocol.VelaProtocolError) {
                throw error;
            }
            protocol.fail(protocol.ERROR_CODES.JSON_PARSE_FAILED, "Provider JSON could not be parsed.", {
                stage: "response-parse"
            });
        }
    }

    function findMatchingRootEnd(text, start) {
        var opening = text[start];
        var closing = opening === "{" ? "}" : "]";
        var depth = 0;
        var inString = false;
        var escaped = false;
        for (var index = start; index < text.length; index += 1) {
            var character = text[index];
            if (inString) {
                if (escaped) { escaped = false; }
                else if (character === "\\") { escaped = true; }
                else if (character === '"') { inString = false; }
                continue;
            }
            if (character === '"') { inString = true; }
            else if (character === opening) { depth += 1; }
            else if (character === closing) {
                depth -= 1;
                if (depth === 0) { return index + 1; }
            }
        }
        return -1;
    }

    function hasMultipleRootCandidates(text, protocol) {
        var count = 0;
        for (var index = 0; index < text.length; index += 1) {
            if (text[index] !== "{" && text[index] !== "[") { continue; }
            var end = findMatchingRootEnd(text, index);
            if (end === -1) { continue; }
            try {
                parseJson(text.slice(index, end), protocol);
                count += 1;
                if (count > 1) { return true; }
                index = end - 1;
            } catch (error) {
                if (error.code === protocol.ERROR_CODES.DUPLICATE_JSON_KEY) { throw error; }
            }
        }
        return false;
    }

    function unwrapRecognizedFence(text, protocol) {
        var trimmed = text.replace(/^\uFEFF/, "").trim();
        if (trimmed.indexOf("```") === -1) { return trimmed; }
        var match = /^```json[ \t]*\r?\n([\s\S]*?)\r?\n```$/i.exec(trimmed);
        if (!match || match[1].indexOf("```") !== -1) {
            protocol.fail(protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "Provider JSON framing is ambiguous.", {
                stage: "response-parse"
            });
        }
        return match[1].trim();
    }

    function createResponseParser(protocol) {
        protocol = requireProtocol(protocol);
        function parseProviderJson(input) {
            if (typeof input === "string") {
                if (protocol.utf8ByteLength(input) > protocol.HARD_LIMITS.maxResponseJsonBytes) {
                    protocol.fail(protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Provider response exceeds the response budget.", {
                        stage: "response-parse",
                        details: { limit: protocol.HARD_LIMITS.maxResponseJsonBytes }
                    });
                }
                var trimmedInput = input.replace(/^\uFEFF/, "").trim();
                if (trimmedInput && (trimmedInput[0] === "{" || trimmedInput[0] === "[")) {
                    if (hasMultipleRootCandidates(trimmedInput, protocol)) {
                        protocol.fail(protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "Multiple complete JSON candidates were supplied.", {
                            stage: "response-parse"
                        });
                    }
                    return parseJson(trimmedInput, protocol);
                }
                var body = unwrapRecognizedFence(trimmedInput, protocol);
                if (!body) {
                    protocol.fail(protocol.ERROR_CODES.JSON_PARSE_FAILED, "Provider JSON is empty.", { stage: "response-parse" });
                }
                if (hasMultipleRootCandidates(body, protocol)) {
                    protocol.fail(protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "Multiple complete JSON candidates were supplied.", {
                        stage: "response-parse"
                    });
                }
                return parseJson(body, protocol);
            }
            protocol.assertSafeJson(input, {
                maxStringBytes: protocol.HARD_LIMITS.maxMessageBytes,
                allowDangerousPaths: [
                    "envelope.proposal.payload.source", "envelope.proposal.payload.expressionText",
                    "envelope.proposals.*.payload.source", "envelope.proposals.*.payload.expressionText",
                    "envelope.error.code", "envelope.error.stage", "envelope.error.message",
                    "envelope.error.details.candidateId"
                ]
            });
            if (!protocol.isPlainObject(input)) {
                protocol.fail(protocol.ERROR_CODES.JSON_PARSE_FAILED, "Provider response must be a JSON object or JSON string.", {
                    stage: "response-parse"
                });
            }
            return input;
        }
        function parseCanonicalResponse(input) {
            return protocol.validateCanonicalResponse(parseProviderJson(input));
        }
        function parseProviderResponse(input, metadata) {
            try {
                return { ok: true, response: parseCanonicalResponse(input) };
            } catch (error) {
                var normalized = error instanceof protocol.VelaProtocolError
                    ? error
                    : new protocol.VelaProtocolError(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider response validation failed.", { stage: "response-parse" });
                var response = protocol.createCanonicalErrorResponse(normalized, metadata || {});
                return Object.freeze({ ok: false, error: response.envelope.error, response: response });
            }
        }
        return {
            hasMultipleRootCandidates: function (text) { return hasMultipleRootCandidates(text, protocol); },
            parseCanonicalResponse: parseCanonicalResponse,
            parseProviderJson: parseProviderJson,
            parseProviderResponse: parseProviderResponse,
            parseProviderResponseOrThrow: parseCanonicalResponse,
            unwrapRecognizedFence: function (text) { return unwrapRecognizedFence(text, protocol); }
        };
    }

    return { createResponseParser: createResponseParser };
}));
