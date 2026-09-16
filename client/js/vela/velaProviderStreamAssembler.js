(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && root.self === root && !Object.prototype.hasOwnProperty.call(root, "VelaProviderStreamAssembler")) {
        Object.defineProperty(root, "VelaProviderStreamAssembler", { configurable: false, enumerable: true, value: exported, writable: false });
        if (root.__velaProtocolCoreBootstrapV1 && typeof root.__velaProtocolCoreBootstrapV1.registerModule === "function") { root.__velaProtocolCoreBootstrapV1.registerModule("VelaProviderStreamAssembler", exported); }
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var TYPES = Object.freeze(["stream-started", "reasoning-delta", "text-delta", "stream-completed", "stream-failed", "stream-cancelled"]);
    function invalid(message) { var error = new Error(message); error.code = "PROVIDER_RESPONSE_INVALID"; throw error; }
    function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function create(options) {
        options = options || {};
        var onDelta = typeof options.onDelta === "function" ? options.onDelta : function () {};
        var text = "";
        var reasoning = "";
        var structured = "";
        var buffer = "";
        var done = false;
        var failure = null;
        var frameCount = 0;
        var finishReasonObserved = null;
        var lastValidFrameType = null;
        function consumeFrame(frame) {
            if (done) { if (frame.trim()) { invalid("Streaming data followed [DONE]."); } return; }
            var lines = frame.split(/\r?\n/);
            var data = [];
            lines.forEach(function (line) {
                if (!line || line.charAt(0) === ":") { return; }
                if (line.indexOf("data:") === 0) { data.push(line.slice(5).replace(/^ /, "")); return; }
                if (line.indexOf("event:") === 0 || line.indexOf("id:") === 0 || line.indexOf("retry:") === 0) { return; }
                invalid("Malformed SSE line.");
            });
            if (!data.length) { return; }
            var payload = data.join("\n");
            if (payload === "[DONE]") { done = true; lastValidFrameType = "done"; return; }
            var value;
            try { value = JSON.parse(payload); } catch (error) { invalid("Malformed SSE JSON frame."); }
            if (!value || typeof value !== "object" || !Array.isArray(value.choices) || value.choices.length !== 1 || !value.choices[0] || typeof value.choices[0] !== "object") { invalid("Invalid streaming choice shape."); }
            if (own(value, "error")) { invalid("Provider returned an error frame."); }
            frameCount += 1;
            var reason = value.choices[0].finish_reason;
            if (reason !== undefined && reason !== null && typeof reason !== "string") { invalid("Invalid streaming finish reason."); }
            if (finishReasonObserved !== null && reason && reason !== finishReasonObserved) { invalid("Conflicting streaming finish reasons."); }
            var delta = value.choices[0].delta;
            if (!delta || typeof delta !== "object" || Array.isArray(delta)) { invalid("Invalid streaming delta shape."); }
            // Validate the entire frame before appending or publishing any of its deltas.
            ["content", "reasoning_content", "reasoning", "thinking", "structured_content"].forEach(function (key) {
                if (own(delta, key) && (typeof delta[key] !== "string" || finishReasonObserved !== null && delta[key].length > 0)) { invalid("Invalid content after streaming termination."); }
            });
            if (reason && finishReasonObserved === null) { finishReasonObserved = reason; }
            if (own(delta, "content")) { if (typeof delta.content !== "string") { invalid("Invalid streaming content delta."); } text += delta.content; if (delta.content) { onDelta("text", delta.content); } }
            ["reasoning_content", "reasoning", "thinking"].forEach(function (key) { if (own(delta, key)) { if (typeof delta[key] !== "string") { invalid("Invalid streaming reasoning delta."); } reasoning += delta[key]; if (delta[key]) { onDelta("reasoning", delta[key]); } } });
            if (own(delta, "structured_content")) { if (typeof delta.structured_content !== "string") { invalid("Invalid structured delta."); } structured += delta.structured_content; }
            lastValidFrameType = "delta";
        }
        function feed(chunk) {
            var boundary;
            if (typeof chunk !== "string") { invalid("Streaming chunk must be text."); }
            if (done) { if (chunk.trim()) { invalid("Streaming data followed [DONE]."); } return; }
            buffer += chunk;
            while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
                var separator = buffer.match(/\r?\n\r?\n/)[0];
                consumeFrame(buffer.slice(0, boundary));
                buffer = buffer.slice(boundary + separator.length);
            }
        }
        function finish() {
            if (buffer.trim()) { invalid("Streaming response ended with a partial SSE frame."); }
            if (!done) { invalid("Streaming response ended before [DONE]."); }
            return Object.freeze({ text: text, reasoning: reasoning, structured: structured });
        }
        return Object.freeze({ feed: function (chunk) { if (failure) { throw failure; } try { return feed(chunk); } catch (error) { failure = error; throw error; } },
            finish: function () { if (failure) { throw failure; } try { return finish(); } catch (error) { failure = error; throw error; } }, getState: function () { return Object.freeze({ text: text, reasoning: reasoning, structured: structured, done: done, frameCount: frameCount, finishReasonObserved: finishReasonObserved, lastValidFrameType: lastValidFrameType, trailingBufferLength: buffer.length }); } });
    }
    return Object.freeze({ MODULE_REVISION: "vela-provider-stream-assembler-v1", EVENT_TYPES: TYPES, create: create });
}));
