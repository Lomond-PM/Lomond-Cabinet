(function (root, factory) {
    "use strict";
    var name = "VelaConversationOwnership";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    if (browserPage) {
        // Re-evaluation must not create a second handle namespace on this page.
        if (!Object.prototype.hasOwnProperty.call(root, name)) {
            Object.defineProperty(root, name, { value: factory(), writable: false, configurable: false });
        }
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var records = new WeakMap();
    var sequence = 0;
    function fail(code) { var error = new Error(code); error.code = code; throw error; }
    function invalidate(record) { record.disposed = true; record.binding = null; }
    function live(record) {
        var binding;
        if (!record || record.disposed) { return false; }
        binding = record.binding;
        try {
            if (binding.agentOwner.isDisposed() || binding.agentOwner.getSessionRuntime() !== binding.session || binding.session.isClosed() || binding.runtime.getStatus().disposed === true) {
                invalidate(record); return false;
            }
        } catch (error) { invalidate(record); return false; }
        return true;
    }
    function createOwnership(options, fillRandomValues) {
        var binding;
        var bytes = new Uint8Array(16);
        var id;
        var handle;
        if (!options || Object.keys(options).sort().join(",") !== "agentOwner,runtime,session") { fail("CONVERSATION_BINDING_INVALID"); }
        // Only copy the association container, never any trusted object.
        binding = Object.freeze({ agentOwner: options.agentOwner, session: options.session, runtime: options.runtime });
        if (!binding.agentOwner || typeof binding.agentOwner.isDisposed !== "function" || typeof binding.agentOwner.getSessionRuntime !== "function" || !binding.session || typeof binding.session.isClosed !== "function" || !binding.runtime || typeof binding.runtime.getStatus !== "function") { fail("CONVERSATION_BINDING_INVALID"); }
        var record = { binding: binding, disposed: false };
        if (!live(record) || binding.runtime.getStatus().state !== "ready") { fail("CONVERSATION_BINDING_INVALID"); }
        if (!Number.isSafeInteger(sequence + 1)) { fail("CONVERSATION_ID_UNAVAILABLE"); }
        try { fillRandomValues(bytes); } catch (error) { fail("CONVERSATION_ID_UNAVAILABLE"); }
        sequence += 1;
        id = "conversation_" + Array.prototype.map.call(bytes, function (value) { return ("0" + value.toString(16)).slice(-2); }).join("") + "_" + sequence;
        handle = Object.freeze({ conversationId: id });
        records.set(handle, record);
        return handle;
    }
    function readBinding(handle) {
        var record = records.get(handle);
        if (!live(record)) { fail("CONVERSATION_OWNER_STALE"); }
        return record.binding;
    }
    function dispose(handle) {
        var record = records.get(handle);
        if (!record || record.disposed) { return false; }
        // The composition root alone disposes Runtime/Agent in their existing order.
        invalidate(record);
        return true;
    }
    return Object.freeze({ MODULE_REVISION: "vela-conversation-ownership-0.3.11-a1-v1", createOwnership: createOwnership, readBinding: readBinding, isLive: function (handle) { return live(records.get(handle)); }, dispose: dispose });
}));
