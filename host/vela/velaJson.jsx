var AEToolbox = AEToolbox || {};
var __velaHostJsonInstallTokenV1 = typeof __velaHostJsonInstallTokenV1 === "undefined" ? null : __velaHostJsonInstallTokenV1;

(function () {
    var HARD_LIMITS = {
        maxBytes: 32 * 1024,
        maxStringBytes: 8 * 1024,
        maxDepth: 8,
        maxArrayLength: 64,
        maxObjectProperties: 64
    };
    var DANGEROUS_KEYS = {
        "__proto__": true,
        "prototype": true,
        "constructor": true
    };

    function makeError(code) {
        var error = new Error(code === "HOST_CONTEXT_BUDGET_EXCEEDED" ?
            "The Host context JSON budget was exceeded." :
            "The Host context JSON value is invalid.");
        error.code = code;
        return error;
    }

    function invalid() {
        throw makeError("HOST_CONTEXT_REQUEST_INVALID");
    }

    function budget() {
        throw makeError("HOST_CONTEXT_BUDGET_EXCEEDED");
    }

    function isHighSurrogate(code) {
        return code >= 0xD800 && code <= 0xDBFF;
    }

    function isLowSurrogate(code) {
        return code >= 0xDC00 && code <= 0xDFFF;
    }

    function utf8ByteLength(text) {
        var count = 0;
        var i;
        var code;
        var next;
        if (typeof text !== "string") {
            invalid();
        }
        for (i = 0; i < text.length; i++) {
            code = text.charCodeAt(i);
            if (isHighSurrogate(code)) {
                if (i + 1 >= text.length) {
                    invalid();
                }
                next = text.charCodeAt(i + 1);
                if (!isLowSurrogate(next)) {
                    invalid();
                }
                count += 4;
                i++;
            } else if (isLowSurrogate(code)) {
                invalid();
            } else if (code <= 0x7F) {
                count += 1;
            } else if (code <= 0x7FF) {
                count += 2;
            } else {
                count += 3;
            }
        }
        return count;
    }

    function effectiveLimit(value, hard) {
        if (typeof value === "undefined") {
            return hard;
        }
        if (typeof value !== "number" || !isFinite(value) || value < 0 || Math.floor(value) !== value) {
            invalid();
        }
        return Math.min(value, hard);
    }

    function normalizeLimits(limits) {
        limits = limits || {};
        return {
            maxBytes: effectiveLimit(limits.maxBytes, HARD_LIMITS.maxBytes),
            maxStringBytes: effectiveLimit(limits.maxStringBytes, HARD_LIMITS.maxStringBytes),
            maxDepth: effectiveLimit(limits.maxDepth, HARD_LIMITS.maxDepth),
            maxArrayLength: effectiveLimit(limits.maxArrayLength, HARD_LIMITS.maxArrayLength),
            maxObjectProperties: effectiveLimit(limits.maxObjectProperties, HARD_LIMITS.maxObjectProperties)
        };
    }

    function parseBounded(text, requestedLimits) {
        var limits = normalizeLimits(requestedLimits);
        var index = 0;
        var length;

        if (typeof text !== "string") {
            invalid();
        }
        if (utf8ByteLength(text) > limits.maxBytes) {
            budget();
        }
        length = text.length;

        function skipWhitespace() {
            var code;
            while (index < length) {
                code = text.charCodeAt(index);
                if (code !== 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
                    break;
                }
                index++;
            }
        }

        function parseHex4() {
            var raw;
            if (index + 4 > length) {
                invalid();
            }
            raw = text.substr(index, 4);
            if (!/^[0-9a-fA-F]{4}$/.test(raw)) {
                invalid();
            }
            index += 4;
            return parseInt(raw, 16);
        }

        function parseString() {
            var output = "";
            var code;
            var escaped;
            var unicode;
            var low;
            if (text.charAt(index) !== "\"") {
                invalid();
            }
            index++;
            while (index < length) {
                code = text.charCodeAt(index++);
                if (code === 0x22) {
                    if (utf8ByteLength(output) > limits.maxStringBytes) {
                        budget();
                    }
                    return output;
                }
                if (code < 0x20) {
                    invalid();
                }
                if (code === 0x5C) {
                    if (index >= length) {
                        invalid();
                    }
                    escaped = text.charAt(index++);
                    if (escaped === "\"" || escaped === "\\" || escaped === "/") {
                        output += escaped;
                    } else if (escaped === "b") {
                        output += "\b";
                    } else if (escaped === "f") {
                        output += "\f";
                    } else if (escaped === "n") {
                        output += "\n";
                    } else if (escaped === "r") {
                        output += "\r";
                    } else if (escaped === "t") {
                        output += "\t";
                    } else if (escaped === "u") {
                        unicode = parseHex4();
                        if (isHighSurrogate(unicode)) {
                            if (text.substr(index, 2) !== "\\u") {
                                invalid();
                            }
                            index += 2;
                            low = parseHex4();
                            if (!isLowSurrogate(low)) {
                                invalid();
                            }
                            output += String.fromCharCode(unicode, low);
                        } else if (isLowSurrogate(unicode)) {
                            invalid();
                        } else {
                            output += String.fromCharCode(unicode);
                        }
                    } else {
                        invalid();
                    }
                } else {
                    if (isHighSurrogate(code)) {
                        if (index >= length || !isLowSurrogate(text.charCodeAt(index))) {
                            invalid();
                        }
                        output += String.fromCharCode(code, text.charCodeAt(index));
                        index++;
                    } else if (isLowSurrogate(code)) {
                        invalid();
                    } else {
                        output += String.fromCharCode(code);
                    }
                }
            }
            invalid();
        }

        function parseNumber() {
            var start = index;
            var value;
            if (text.charAt(index) === "-") {
                index++;
            }
            if (text.charAt(index) === "0") {
                index++;
                if (/[0-9]/.test(text.charAt(index))) {
                    invalid();
                }
            } else {
                if (!/[1-9]/.test(text.charAt(index))) {
                    invalid();
                }
                while (/[0-9]/.test(text.charAt(index))) {
                    index++;
                }
            }
            if (text.charAt(index) === ".") {
                index++;
                if (!/[0-9]/.test(text.charAt(index))) {
                    invalid();
                }
                while (/[0-9]/.test(text.charAt(index))) {
                    index++;
                }
            }
            if (text.charAt(index) === "e" || text.charAt(index) === "E") {
                index++;
                if (text.charAt(index) === "+" || text.charAt(index) === "-") {
                    index++;
                }
                if (!/[0-9]/.test(text.charAt(index))) {
                    invalid();
                }
                while (/[0-9]/.test(text.charAt(index))) {
                    index++;
                }
            }
            value = Number(text.substring(start, index));
            if (!isFinite(value) || (value === 0 && text.charAt(start) === "-")) {
                invalid();
            }
            return value;
        }

        function parseArray(depth) {
            var output = [];
            if (depth > limits.maxDepth) {
                budget();
            }
            index++;
            skipWhitespace();
            if (text.charAt(index) === "]") {
                index++;
                return output;
            }
            while (true) {
                if (output.length >= limits.maxArrayLength) {
                    budget();
                }
                output[output.length] = parseValue(depth + 1);
                skipWhitespace();
                if (text.charAt(index) === "]") {
                    index++;
                    return output;
                }
                if (text.charAt(index) !== ",") {
                    invalid();
                }
                index++;
                skipWhitespace();
            }
        }

        function parseObject(depth) {
            var output = {};
            var count = 0;
            var key;
            if (depth > limits.maxDepth) {
                budget();
            }
            index++;
            skipWhitespace();
            if (text.charAt(index) === "}") {
                index++;
                return output;
            }
            while (true) {
                if (count >= limits.maxObjectProperties) {
                    budget();
                }
                key = parseString();
                if (DANGEROUS_KEYS[key] || Object.prototype.hasOwnProperty.call(output, key)) {
                    invalid();
                }
                skipWhitespace();
                if (text.charAt(index) !== ":") {
                    invalid();
                }
                index++;
                output[key] = parseValue(depth + 1);
                count++;
                skipWhitespace();
                if (text.charAt(index) === "}") {
                    index++;
                    return output;
                }
                if (text.charAt(index) !== ",") {
                    invalid();
                }
                index++;
                skipWhitespace();
            }
        }

        function parseValue(depth) {
            var ch;
            if (depth > limits.maxDepth) {
                budget();
            }
            skipWhitespace();
            ch = text.charAt(index);
            if (ch === "{") {
                return parseObject(depth);
            }
            if (ch === "[") {
                return parseArray(depth);
            }
            if (ch === "\"") {
                return parseString();
            }
            if (ch === "-" || /[0-9]/.test(ch)) {
                return parseNumber();
            }
            if (text.substr(index, 4) === "true") {
                index += 4;
                return true;
            }
            if (text.substr(index, 5) === "false") {
                index += 5;
                return false;
            }
            if (text.substr(index, 4) === "null") {
                index += 4;
                return null;
            }
            invalid();
        }

        skipWhitespace();
        if (index >= length) {
            invalid();
        }
        var result = parseValue(0);
        skipWhitespace();
        if (index !== length) {
            invalid();
        }
        return result;
    }

    function isPlainObject(value) {
        var prototype;
        if (!value || typeof value !== "object") {
            return false;
        }
        if (typeof Object.getPrototypeOf !== "function") {
            return false;
        }
        try {
            prototype = Object.getPrototypeOf(value);
            return prototype === Object.prototype || prototype === null;
        } catch (ignoredPrototype) {
            return false;
        }
    }

    function isStrictArray(value) {
        var prototype;
        try {
            if (typeof Array.isArray === "function") {
                if (!Array.isArray(value)) {
                    return false;
                }
            } else if (Object.prototype.toString.call(value) !== "[object Array]") {
                return false;
            }
            if (typeof Object.getPrototypeOf !== "function") {
                return false;
            }
            prototype = Object.getPrototypeOf(value);
            return prototype === Array.prototype;
        } catch (ignoredArray) {
            return false;
        }
    }

    function canonicalArrayIndex(key, length, maximum) {
        var index = 0;
        var i;
        var code;
        if (typeof key !== "string" || !key.length) {
            return -1;
        }
        if (key === "0") {
            return length > 0 ? 0 : -1;
        }
        code = key.charCodeAt(0);
        if (code < 0x31 || code > 0x39) {
            return -1;
        }
        for (i = 0; i < key.length; i++) {
            code = key.charCodeAt(i);
            if (code < 0x30 || code > 0x39) {
                return -1;
            }
            index = (index * 10) + (code - 0x30);
            if (index > maximum) {
                return -1;
            }
        }
        if (String(index) !== key || index < 0 || index >= length) {
            return -1;
        }
        return index;
    }

    function createWriter(maxBytes) {
        var chunks = [];
        var byteCount = 0;
        return {
            append: function (fragment) {
                var fragmentBytes;
                if (typeof fragment !== "string") {
                    invalid();
                }
                fragmentBytes = utf8ByteLength(fragment);
                if (byteCount + fragmentBytes > maxBytes) {
                    budget();
                }
                chunks[chunks.length] = fragment;
                byteCount += fragmentBytes;
            },
            finish: function () {
                return chunks.join("");
            }
        };
    }

    function writeQuotedString(value, limits, writer) {
        var i;
        var code;
        if (utf8ByteLength(value) > limits.maxStringBytes) {
            budget();
        }
        writer.append("\"");
        for (i = 0; i < value.length; i++) {
            code = value.charCodeAt(i);
            if (code === 0x22) {
                writer.append("\\\"");
            } else if (code === 0x5C) {
                writer.append("\\\\");
            } else if (code === 0x08) {
                writer.append("\\b");
            } else if (code === 0x0C) {
                writer.append("\\f");
            } else if (code === 0x0A) {
                writer.append("\\n");
            } else if (code === 0x0D) {
                writer.append("\\r");
            } else if (code === 0x09) {
                writer.append("\\t");
            } else if (code < 0x20 || code === 0x2028 || code === 0x2029) {
                writer.append("\\u" + ("0000" + code.toString(16)).slice(-4));
            } else if (isHighSurrogate(code)) {
                if (i + 1 >= value.length || !isLowSurrogate(value.charCodeAt(i + 1))) {
                    invalid();
                }
                writer.append(value.substr(i, 2));
                i++;
            } else if (isLowSurrogate(code)) {
                invalid();
            } else {
                writer.append(value.charAt(i));
            }
        }
        writer.append("\"");
    }

    function stringifyBounded(value, requestedLimits) {
        var limits = normalizeLimits(requestedLimits);
        var stack = [];
        var writer = createWriter(limits.maxBytes);

        function serialize(current, depth) {
            var keys;
            var i;
            var descriptor;
            var lengthDescriptor;
            var length;
            var hasLengthName;
            var standardArrayProfile;
            var seenIndexes;
            var arrayIndex;
            if (depth > limits.maxDepth) {
                budget();
            }
            if (current === null) {
                writer.append("null");
                return;
            }
            if (typeof current === "string") {
                writeQuotedString(current, limits, writer);
                return;
            }
            if (typeof current === "number") {
                if (!isFinite(current) || (current === 0 && 1 / current === -Infinity)) {
                    invalid();
                }
                writer.append(String(current));
                return;
            }
            if (typeof current === "boolean") {
                writer.append(current ? "true" : "false");
                return;
            }
            if (typeof current !== "object") {
                invalid();
            }
            for (i = 0; i < stack.length; i++) {
                if (stack[i] === current) {
                    invalid();
                }
            }
            stack[stack.length] = current;
            if (isStrictArray(current)) {
                try {
                    lengthDescriptor = Object.getOwnPropertyDescriptor(current, "length");
                    keys = Object.getOwnPropertyNames(current);
                } catch (ignoredArrayDescriptor) {
                    invalid();
                }
                hasLengthName = false;
                for (i = 0; i < keys.length; i++) {
                    if (keys[i] === "length") {
                        hasLengthName = true;
                    }
                }
                standardArrayProfile = !!lengthDescriptor;
                if (standardArrayProfile) {
                    if (lengthDescriptor.get || lengthDescriptor.set ||
                            !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
                            typeof lengthDescriptor.value !== "number" || !isFinite(lengthDescriptor.value) ||
                            Math.floor(lengthDescriptor.value) !== lengthDescriptor.value || lengthDescriptor.value < 0 ||
                            (lengthDescriptor.value === 0 && 1 / lengthDescriptor.value === -Infinity) || !hasLengthName) {
                        invalid();
                    }
                    length = lengthDescriptor.value;
                } else {
                    if (hasLengthName) {
                        invalid();
                    }
                    try {
                        length = current.length;
                    } catch (ignoredArrayLength) {
                        invalid();
                    }
                    if (typeof length !== "number" || !isFinite(length) || Math.floor(length) !== length || length < 0 ||
                            (length === 0 && 1 / length === -Infinity)) {
                        invalid();
                    }
                }
                if (length > limits.maxArrayLength) {
                    budget();
                }
                if (keys.length !== length + (standardArrayProfile ? 1 : 0)) {
                    invalid();
                }
                seenIndexes = {};
                for (i = 0; i < keys.length; i++) {
                    if (keys[i] === "length") {
                        if (!standardArrayProfile) {
                            invalid();
                        }
                        continue;
                    }
                    arrayIndex = canonicalArrayIndex(keys[i], length, limits.maxArrayLength);
                    if (arrayIndex < 0 || Object.prototype.hasOwnProperty.call(seenIndexes, String(arrayIndex))) {
                        invalid();
                    }
                    seenIndexes[String(arrayIndex)] = true;
                }
                for (i = 0; i < length; i++) {
                    if (!Object.prototype.hasOwnProperty.call(seenIndexes, String(i))) {
                        invalid();
                    }
                }
                writer.append("[");
                for (i = 0; i < length; i++) {
                    try {
                        descriptor = Object.getOwnPropertyDescriptor(current, String(i));
                    } catch (ignoredElementDescriptor) {
                        invalid();
                    }
                    if (!descriptor || descriptor.get || descriptor.set ||
                            !Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.enumerable !== true) {
                        invalid();
                    }
                    if (i > 0) {
                        writer.append(",");
                    }
                    serialize(descriptor.value, depth + 1);
                }
                writer.append("]");
                stack.length--;
                return;
            }
            if (!isPlainObject(current)) {
                invalid();
            }
            try {
                keys = Object.getOwnPropertyNames(current);
            } catch (ignoredObjectKeys) {
                invalid();
            }
            if (keys.length > limits.maxObjectProperties) {
                budget();
            }
            keys.sort();
            writer.append("{");
            for (i = 0; i < keys.length; i++) {
                if (DANGEROUS_KEYS[keys[i]]) {
                    invalid();
                }
                try {
                    descriptor = Object.getOwnPropertyDescriptor(current, keys[i]);
                } catch (ignoredObjectDescriptor) {
                    invalid();
                }
                if (!descriptor || descriptor.get || descriptor.set ||
                        !Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.enumerable !== true) {
                    invalid();
                }
                if (i > 0) {
                    writer.append(",");
                }
                writeQuotedString(keys[i], limits, writer);
                writer.append(":");
                serialize(descriptor.value, depth + 1);
            }
            writer.append("}");
            stack.length--;
        }

        serialize(value, 0);
        return writer.finish();
    }

    if (Object.prototype.hasOwnProperty.call(AEToolbox, "VelaJson") ||
            Object.prototype.hasOwnProperty.call(AEToolbox, "__velaHostBootstrapV1") || __velaHostJsonInstallTokenV1 !== null) {
        throw makeError("VELA_JSON_MODULE_CONFLICT");
    }
    var installToken = {};
    var api = {
        revision: "vela-json-host-v1",
        parseBounded: parseBounded,
        stringifyBounded: stringifyBounded,
        utf8ByteLength: utf8ByteLength
    };
    var bootstrap = {
        installToken: installToken,
        VelaJson: api
    };
    if (typeof Object.freeze === "function") {
        Object.freeze(installToken);
        Object.freeze(api);
        Object.freeze(bootstrap);
    }
    if (typeof Object.defineProperty === "function") {
        try {
            Object.defineProperty(AEToolbox, "VelaJson", {
                configurable: false,
                enumerable: true,
                value: api,
                writable: false
            });
        } catch (ignoredInstall) {
            AEToolbox.VelaJson = api;
        }
    } else {
        AEToolbox.VelaJson = api;
    }
    if (AEToolbox.VelaJson !== api) {
        throw makeError("VELA_JSON_MODULE_CONFLICT");
    }
    if (typeof Object.defineProperty === "function") {
        try {
            Object.defineProperty(AEToolbox, "__velaHostBootstrapV1", {
                configurable: false,
                enumerable: false,
                value: bootstrap,
                writable: false
            });
        } catch (ignoredBootstrapInstall) {
            AEToolbox.__velaHostBootstrapV1 = bootstrap;
        }
    } else {
        AEToolbox.__velaHostBootstrapV1 = bootstrap;
    }
    if (AEToolbox.__velaHostBootstrapV1 !== bootstrap) {
        throw makeError("VELA_JSON_MODULE_CONFLICT");
    }
    __velaHostJsonInstallTokenV1 = installToken;
}());
