(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaAgentRuntimeOwner";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var agentRuntime = null;
    var exported;

    if (browserPage) {
        agentRuntime = root.VelaAgentRuntime;
    } else if (typeof module === "object" && module.exports) {
        agentRuntime = require("./velaAgentRuntime");
    }

    exported = Object.freeze(factory(agentRuntime));
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function (defaultAgentRuntime) {
    "use strict";

    var MODULE_REVISION = "vela-agent-runtime-owner-0.3.3-v1";
    var ERROR_CODES = Object.freeze({
        AGENT_OWNER_RUNTIME_UNAVAILABLE: "AGENT_OWNER_RUNTIME_UNAVAILABLE"
    });

    function fail(code) {
        var error = new Error(code);
        error.code = code;
        throw error;
    }

    function isPlainObject(value) {
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; }
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
    }

    function createOwner(options) {
        var settings = isPlainObject(options) ? options : {};
        var runtime = Object.prototype.hasOwnProperty.call(settings, "AgentRuntime") ? settings.AgentRuntime : defaultAgentRuntime;
        var reporter = typeof settings.onListenerError === "function" ? settings.onListenerError : function () {};
        var agent;
        var projection;
        var disposed = false;

        if (!runtime || typeof runtime.createAgent !== "function") {
            fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE);
        }

        agent = runtime.createAgent({
            onListenerError: function (error, envelope) {
                try { reporter(error, envelope); }
                catch (reportError) { /* Diagnostics must never affect runtime truth. */ }
            }
        });
        if (!agent || typeof agent.getProjection !== "function" || typeof agent.activate !== "function" || typeof agent.dispose !== "function") {
            fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE);
        }
        projection = agent.getProjection();

        return Object.freeze({
            getCurrentAgent: function () { return agent; },
            getCurrentProjection: function () { return projection; },
            activate: function () {
                if (disposed) { return false; }
                agent.activate();
                return true;
            },
            dispose: function () {
                if (disposed) { return false; }
                disposed = true;
                agent.dispose();
                return true;
            },
            isDisposed: function () { return disposed; }
        });
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        createOwner: createOwner
    });
}));
