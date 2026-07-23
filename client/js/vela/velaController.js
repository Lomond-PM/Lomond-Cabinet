(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaController";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code) { var error = new Error(code); error.code = code; return error; }
    function assertDependencies(protocol, preflight) {
        if (!protocol || typeof protocol.createProtocol !== "function" || typeof protocol.isTrustedProtocol !== "function" || !protocol.ERROR_CODES ||
                !preflight || typeof preflight.createExecutionPreflight !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE");
        }
        return { protocol: protocol, preflight: preflight };
    }
    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var bootstrap;
        var dependencies;
        var exported;
        if (!hasOwn.call(target, BOOTSTRAP_NAME) || hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT"); }
        bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE"); }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED"); }
        dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaExecutionPreflight"));
        exported = Object.freeze(create(dependencies.protocol, dependencies.preflight));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaExecutionPreflight"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.preflight));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule) {
    "use strict";

    var MODULE_REVISION = "vela-controller-v1";
    var trustedControllers = new WeakSet();
    var controllerProtocols = new WeakMap();

    function protocolError(protocol, code) {
        return new protocol.VelaProtocolError(code, undefined, { stage: "vela-controller" });
    }

    function ownData(value, key) {
        var descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) { return undefined; }
        return descriptor.value;
    }

    function safeCode(protocol, stableErrorCodes, error) {
        var descriptor;
        try { descriptor = error && (typeof error === "object" || typeof error === "function") ? Object.getOwnPropertyDescriptor(error, "code") : null; }
        catch (ignored) { return protocol.ERROR_CODES.PLAN_FAILED; }
        return descriptor && !descriptor.get && !descriptor.set && Object.prototype.hasOwnProperty.call(descriptor, "value") &&
            typeof descriptor.value === "string" && stableErrorCodes.indexOf(descriptor.value) !== -1 ? descriptor.value : protocol.ERROR_CODES.PLAN_FAILED;
    }

    function validateOpacity(protocol, input) {
        var opacity;
        if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Opacity proposal input is invalid."); }
        protocol.assertNoUnknownKeys(input, ["opacity"], "velaController.opacityInput");
        opacity = protocol.getOwnDataProperty(input, "opacity");
        if (typeof opacity !== "number" || !Number.isFinite(opacity) || Object.is(opacity, -0) || opacity < 0 || opacity > 100) {
            protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Opacity must be a finite number from 0 to 100.");
        }
        return opacity;
    }

    function createController(options) {
        var protocol = options && ownData(options, "protocol");
        var preflight = options && ownData(options, "preflight");
        if (!protocolModule.isTrustedProtocol(protocol) || !protocol || !protocol.isPlainObject(options)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        protocol.assertNoUnknownKeys(options, ["protocol", "preflight"], "velaController.options");
        if (!preflight || typeof ownData(preflight, "createBoundPlan") !== "function" || typeof ownData(preflight, "confirmBoundPlan") !== "function" ||
                typeof ownData(preflight, "executeStep") !== "function" || typeof ownData(preflight, "discardBoundPlan") !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Controller requires execution preflight.");
        }
        var state = "idle";
        var activeRecord = null;
        var generation = 1;
        var stableErrorCodes = Object.keys(protocol.ERROR_CODES).map(function (key) { return protocol.ERROR_CODES[key]; });

        function safeState() {
            return protocol.deepFreeze({
                state: state,
                candidateId: activeRecord ? activeRecord.candidateId : null,
                capabilityId: activeRecord ? "set-opacity-v1" : null,
                risk: activeRecord ? "write" : null,
                targetSummary: activeRecord ? activeRecord.targetSummary : null,
                beforeValue: activeRecord ? activeRecord.beforeValue : null,
                proposedValue: activeRecord ? activeRecord.proposedValue : null,
                undoGroupLabel: activeRecord ? "Vela: Set Opacity" : null,
                errorCode: activeRecord ? activeRecord.errorCode : null,
                moduleRevision: MODULE_REVISION
            });
        }

        function requireCandidate(input) {
            var candidateId;
            if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Candidate input is invalid."); }
            protocol.assertNoUnknownKeys(input, ["candidateId"], "velaController.candidateInput");
            candidateId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(input, "candidateId"), "velaController.candidateId", protocol.HARD_LIMITS.maxLocalIdBytes);
            if (!activeRecord || activeRecord.candidateId !== candidateId) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Candidate is not active."); }
            return activeRecord;
        }

        function clearPending(reason) {
            if (activeRecord && state === "pending-confirmation") {
                try { preflight.discardBoundPlan({ planId: activeRecord.planId, reason: reason || "superseded" }); } catch (ignored) {}
                activeRecord = null;
            }
        }

        function refreshContext() {
            if (state === "executing") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
            clearPending("refresh");
            state = "input-ready";
            return Promise.resolve(safeState());
        }

        function createOpacityCandidate(input) {
            var opacity;
            var capturedGeneration;
            try { opacity = validateOpacity(protocol, input); }
            catch (error) { return Promise.reject(error); }
            if (state === "executing") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
            clearPending("edit");
            state = "context-loading";
            capturedGeneration = generation;
            return preflight.createBoundPlan({
                localProposal: { capabilityId: "set-opacity-v1", params: { opacity: opacity } },
                selectionOrderMeaningful: true
            }).then(function (plan) {
                var candidateId;
                var review;
                if (capturedGeneration !== generation) { throw protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                if (!plan || !Array.isArray(plan.candidateIds) || plan.candidateIds.length !== 1 || !protocol.isPlainObject(plan.review)) {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan review is invalid.");
                }
                candidateId = plan.candidateIds[0];
                review = plan.review;
                if (review.valueKind !== "number" || typeof review.beforeValue !== "number") {
                    protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan review is invalid.");
                }
                activeRecord = {
                    planId: plan.planId,
                    candidateId: candidateId,
                    proposedValue: opacity,
                    beforeValue: review.beforeValue,
                    targetSummary: "Selected layer Opacity",
                    errorCode: null
                };
                state = "pending-confirmation";
                return safeState();
            }, function (error) {
                if (capturedGeneration === generation) {
                    var code = safeCode(protocol, stableErrorCodes, error);
                    activeRecord = { planId: null, candidateId: null, proposedValue: opacity, beforeValue: null, targetSummary: "Selected layer Opacity", errorCode: code };
                    state = code === protocol.ERROR_CODES.CONTEXT_STALE || code === protocol.ERROR_CODES.UNKNOWN_TARGET ? "stale" : "failed";
                }
                throw error;
            });
        }

        function approveCandidate(input) {
            var record;
            var capturedGeneration;
            try { record = requireCandidate(input); }
            catch (error) { return Promise.reject(error); }
            if (state !== "pending-confirmation") { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.CANDIDATE_STATE_INVALID)); }
            state = "executing";
            capturedGeneration = generation;
            return preflight.confirmBoundPlan({ planId: record.planId }).then(function () {
                return preflight.executeStep({ planId: record.planId, stepIndex: 0 });
            }).then(function () {
                if (capturedGeneration !== generation) { throw protocolError(protocol, protocol.ERROR_CODES.LIFECYCLE_BLOCKED); }
                record.errorCode = null;
                state = "consumed";
                return safeState();
            }, function (error) {
                if (capturedGeneration === generation) {
                    record.errorCode = safeCode(protocol, stableErrorCodes, error);
                    state = record.errorCode === protocol.ERROR_CODES.CONTEXT_STALE || record.errorCode === protocol.ERROR_CODES.UNKNOWN_TARGET ? "stale" : "failed";
                }
                throw error;
            });
        }

        function rejectCandidate(input) {
            var record = requireCandidate(input);
            if (state !== "pending-confirmation") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Candidate cannot be rejected."); }
            preflight.discardBoundPlan({ planId: record.planId, reason: "user-reject" });
            record.errorCode = null;
            state = "discarded";
            return safeState();
        }

        function invalidate(nextState) {
            generation += 1;
            clearPending("lifecycle");
            activeRecord = null;
            state = nextState || "idle";
            return safeState();
        }

        var controller = Object.freeze({
            refreshContext: refreshContext,
            createOpacityCandidate: createOpacityCandidate,
            approveCandidate: approveCandidate,
            rejectCandidate: rejectCandidate,
            getUiState: safeState,
            invalidate: invalidate
        });
        trustedControllers.add(controller);
        controllerProtocols.set(controller, protocol);
        return controller;
    }

    return Object.freeze({
        createController: createController,
        isTrustedControllerForProtocol: function (controller, protocol) {
            return Boolean(controller && protocolModule.isTrustedProtocol(protocol) && trustedControllers.has(controller) && controllerProtocols.get(controller) === protocol);
        }
    });
}));
