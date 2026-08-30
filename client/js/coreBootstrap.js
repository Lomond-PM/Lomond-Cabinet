(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.CoreBootstrap = api;
    }
}(typeof window !== "undefined" ? window : this, function () {
    "use strict";

    var DEFAULT_TIMEOUT_MS = 15000;
    var DEFAULT_RETRY_DELAYS_MS = [500, 1500];

    function copySnapshot(snapshot) {
        return {
            state: snapshot.state,
            generation: snapshot.generation,
            attempt: snapshot.attempt,
            hostReady: snapshot.hostReady,
            registryReady: snapshot.registryReady,
            toolCount: snapshot.toolCount,
            loadErrorCount: snapshot.loadErrorCount,
            lastErrorStage: snapshot.lastErrorStage,
            lastErrorCode: snapshot.lastErrorCode,
            lastErrorDetails: snapshot.lastErrorDetails ? {
                loadErrors: snapshot.lastErrorDetails.loadErrors.slice(0),
                registryRevision: snapshot.lastErrorDetails.registryRevision,
                lastAttemptSucceeded: snapshot.lastErrorDetails.lastAttemptSucceeded
            } : null,
            registryRequestCount: snapshot.registryRequestCount,
            retryAvailable: snapshot.retryAvailable
        };
    }

    function parseJson(raw) {
        if (typeof raw !== "string" || !raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (ignored) {
            return null;
        }
    }

    function validateCatalog(raw) {
        var result = parseJson(raw);
        var tools;
        var errors;
        var map = {};
        var order = [];
        var i;
        var tool;
        var id;

        if (!result || result.ok !== true) {
            return {
                ok: false,
                stage: result ? "registry" : "catalog-validation",
                code: result ? "REGISTRY_REQUEST_FAILED" : "REGISTRY_RESPONSE_INVALID",
                details: result ? {
                    loadErrors: result.loadErrors instanceof Array ? result.loadErrors.filter(function (value) { return typeof value === "string"; }).slice(0) : [],
                    registryRevision: typeof result.registryRevision === "number" ? result.registryRevision : null,
                    lastAttemptSucceeded: result.lastAttemptSucceeded === true
                } : null
            };
        }
        if (!(result.tools instanceof Array) || !(result.loadErrors instanceof Array)) {
            return { ok: false, stage: "catalog-validation", code: "REGISTRY_RESPONSE_INVALID" };
        }
        tools = result.tools;
        errors = result.loadErrors;
        for (i = 0; i < errors.length; i++) {
            if (typeof errors[i] !== "string") {
                return { ok: false, stage: "catalog-validation", code: "REGISTRY_RESPONSE_INVALID" };
            }
        }
        for (i = 0; i < tools.length; i++) {
            tool = tools[i];
            id = tool && typeof tool.id === "string" ? tool.id.replace(/^\s+|\s+$/g, "") : "";
            if (!id) {
                return { ok: false, stage: "catalog-validation", code: "REGISTRY_TOOL_INVALID" };
            }
            if (Object.prototype.hasOwnProperty.call(map, id)) {
                return { ok: false, stage: "catalog-validation", code: "REGISTRY_TOOL_DUPLICATE" };
            }
            map[id] = tool;
            order[order.length] = id;
        }
        if (!order.length) {
            return { ok: false, stage: "catalog-validation", code: "REGISTRY_EMPTY" };
        }
        return {
            ok: true,
            degraded: errors.length > 0,
            tools: map,
            order: order,
            loadErrors: errors
        };
    }

    function createController(options) {
        options = options || {};
        var evalScript = options.evalScript;
        var setTimer = options.setTimeout || setTimeout;
        var clearTimer = options.clearTimeout || clearTimeout;
        var timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
        var retryDelays = options.retryDelaysMs || DEFAULT_RETRY_DELAYS_MS;
        var snapshot = {
            state: "idle",
            generation: 0,
            attempt: 0,
            hostReady: false,
            registryReady: false,
            toolCount: 0,
            loadErrorCount: 0,
            lastErrorStage: null,
            lastErrorCode: null,
            lastErrorDetails: null,
            registryRequestCount: 0,
            retryAvailable: false
        };
        var stageTimer = null;
        var retryTimer = null;
        var stopped = false;

        function publish(patch) {
            var key;
            for (key in patch) {
                if (Object.prototype.hasOwnProperty.call(patch, key)) {
                    snapshot[key] = patch[key];
                }
            }
            if (typeof options.onStateChange === "function") {
                options.onStateChange(copySnapshot(snapshot));
            }
        }

        function clearStageTimer() {
            if (stageTimer !== null) {
                clearTimer(stageTimer);
                stageTimer = null;
            }
        }

        function clearRetryTimer() {
            if (retryTimer !== null) {
                clearTimer(retryTimer);
                retryTimer = null;
            }
        }

        function isCurrent(generation) {
            return !stopped && generation === snapshot.generation;
        }

        function scheduleStageTimeout(generation, code, fail) {
            clearStageTimer();
            stageTimer = setTimer(function () {
                stageTimer = null;
                if (isCurrent(generation)) {
                    fail("timeout", code);
                }
            }, timeoutMs);
        }

        function scheduleRetry() {
            var delayIndex = snapshot.attempt - 1;
            clearRetryTimer();
            if (delayIndex >= retryDelays.length) {
                return;
            }
            retryTimer = setTimer(function () {
                retryTimer = null;
                beginAttempt(false);
            }, retryDelays[delayIndex]);
        }

        function fail(stage, code, details) {
            var willRetry = snapshot.attempt - 1 < retryDelays.length;
            clearStageTimer();
            snapshot.generation += 1;
            publish({
                state: willRetry ? "retrying" : "failed",
                hostReady: false,
                lastErrorStage: stage,
                lastErrorCode: code,
                lastErrorDetails: details || null,
                retryAvailable: !willRetry
            });
            if (willRetry) {
                scheduleRetry();
            }
        }

        function invoke(source, callback, errorStage, errorCode) {
            try {
                evalScript(source, callback);
            } catch (ignored) {
                fail(errorStage, errorCode);
            }
        }

        function requestRegistry(generation) {
            publish({ state: "registry-loading", registryRequestCount: snapshot.registryRequestCount + 1, lastErrorStage: null, lastErrorCode: null, lastErrorDetails: null, retryAvailable: false });
            scheduleStageTimeout(generation, "REGISTRY_TIMEOUT", fail);
            invoke("AEToolbox.getRegisteredTools()", function (raw) {
                var candidate;
                if (!isCurrent(generation)) {
                    return;
                }
                clearStageTimer();
                candidate = validateCatalog(raw);
                if (!candidate.ok) {
                    fail(candidate.stage, candidate.code, candidate.details);
                    return;
                }
                if (typeof options.onCatalog === "function") {
                    options.onCatalog(candidate, copySnapshot(snapshot));
                }
                publish({
                    state: candidate.degraded ? "degraded" : "ready",
                    registryReady: true,
                    toolCount: candidate.order.length,
                    loadErrorCount: candidate.loadErrors.length,
                    lastErrorStage: candidate.degraded ? "registry" : null,
                    lastErrorCode: candidate.degraded ? "REGISTRY_PARTIAL" : null,
                    retryAvailable: candidate.degraded
                });
            }, "registry", "REGISTRY_REQUEST_FAILED");
        }

        function requestPing(generation) {
            scheduleStageTimeout(generation, "HOST_PING_TIMEOUT", fail);
            invoke("AEToolbox.ping()", function (raw) {
                if (!isCurrent(generation)) {
                    return;
                }
                clearStageTimer();
                if (raw !== "AEToolbox host loaded") {
                    fail("ping", raw === "EvalScript error." ? "HOST_API_UNAVAILABLE" : "HOST_PING_INVALID");
                    return;
                }
                publish({ state: "host-ready", hostReady: true, lastErrorStage: null, lastErrorCode: null });
                if (typeof options.onHostReady === "function") {
                    options.onHostReady(copySnapshot(snapshot));
                }
                requestRegistry(generation);
            }, "ping", "HOST_API_UNAVAILABLE");
        }

        function beginAttempt(resetAttempt) {
            var generation;
            if (stopped) {
                return false;
            }
            clearStageTimer();
            clearRetryTimer();
            snapshot.generation += 1;
            snapshot.attempt = resetAttempt ? 1 : snapshot.attempt + 1;
            generation = snapshot.generation;
            publish({
                state: "host-loading",
                hostReady: false,
                toolCount: snapshot.toolCount,
                loadErrorCount: 0,
                lastErrorStage: null,
                lastErrorCode: null,
                lastErrorDetails: null,
                retryAvailable: false
            });
            scheduleStageTimeout(generation, "HOST_EVAL_TIMEOUT", fail);
            invoke(options.hostLoadSource, function (raw) {
                if (!isCurrent(generation)) {
                    return;
                }
                clearStageTimer();
                if (raw === "EvalScript error.") {
                    fail("eval-file", "HOST_EVAL_FAILED");
                    return;
                }
                requestPing(generation);
            }, "eval-file", "HOST_EVAL_FAILED");
            return true;
        }

        return {
            start: function () {
                return snapshot.state === "idle" ? beginAttempt(true) : false;
            },
            retry: function () {
                if (snapshot.state !== "failed" && snapshot.state !== "degraded") {
                    return false;
                }
                return beginAttempt(true);
            },
            shutdown: function () {
                if (stopped) {
                    return false;
                }
                stopped = true;
                clearStageTimer();
                clearRetryTimer();
                snapshot.generation += 1;
                publish({ state: "shutdown", hostReady: false, registryReady: false, lastErrorStage: "shutdown", lastErrorCode: null, retryAvailable: false });
                return true;
            },
            getSnapshot: function () {
                return copySnapshot(snapshot);
            }
        };
    }

    return {
        DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
        DEFAULT_RETRY_DELAYS_MS: DEFAULT_RETRY_DELAYS_MS.slice(0),
        validateCatalog: validateCatalog,
        createController: createController
    };
}));
