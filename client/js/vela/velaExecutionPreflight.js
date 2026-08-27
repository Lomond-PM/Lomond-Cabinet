(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaExecutionPreflight";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertDependencies(protocolDependency, capabilityContractsDependency, validatorDependency, planDependency, guardDependency, bridgeDependency) {
        if (!protocolDependency || typeof protocolDependency.createProtocol !== "function" || typeof protocolDependency.isTrustedProtocol !== "function" || !protocolDependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires VelaProtocol.");
        }
        if (!validatorDependency || typeof validatorDependency.isTrustedActionValidatorForProtocol !== "function" || typeof validatorDependency.isTrustedAuthorityForProtocol !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires VelaValidator.");
        }
        if (!capabilityContractsDependency || typeof capabilityContractsDependency.getLocalProjection !== "function" || typeof capabilityContractsDependency.resolveRegisteredAction !== "function" || typeof capabilityContractsDependency.validateCapabilityParams !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires VelaCapabilityContracts.");
        }
        if (!planDependency || typeof planDependency.isTrustedPlanStoreForProtocol !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires VelaPlan.");
        }
        if (!guardDependency || typeof guardDependency.createExecutionGuard !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires VelaExecutionGuard.");
        }
        if (!bridgeDependency || typeof bridgeDependency.isTrustedContextBridgeForProtocol !== "function" || typeof bridgeDependency.isTrustedReviewPortForProtocol !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires VelaContextBridge.");
        }
        return { protocol: protocolDependency, capabilityContracts: capabilityContractsDependency, validator: validatorDependency, plan: planDependency, guard: guardDependency, bridge: bridgeDependency };
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaExecutionPreflight requires the Vela protocol bootstrap."); }
        var bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "The Vela protocol bootstrap is invalid."); }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered."); }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with the loaded module."); }
        var dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaCapabilityContracts"), bootstrap.getModule("VelaValidator"), bootstrap.getModule("VelaPlan"), bootstrap.getModule("VelaExecutionGuard"), bootstrap.getModule("VelaContextBridge"));
        var exported = Object.freeze(create(dependencies.protocol, dependencies.capabilityContracts, dependencies.validator, dependencies.plan, dependencies.guard, dependencies.bridge));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaCapabilityContracts"), require("./velaValidator"), require("./velaPlan"), require("./velaExecutionGuard"), require("./velaContextBridge"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.capabilityContracts, dependencies.validator, dependencies.plan, dependencies.guard, dependencies.bridge));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, capabilityContracts, validatorModule, planModule, guardModule, bridgeModule) {
    "use strict";

    function requireOwnFunction(protocol, value, key) {
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
        catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Execution preflight dependencies are unavailable."); }
        if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value") || typeof descriptor.value !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Execution preflight dependencies are unavailable.");
        }
        return descriptor.value;
    }

    function protocolError(protocol, code) {
        return new protocol.VelaProtocolError(code, undefined, { stage: "execution-preflight" });
    }

    function isProtocolError(protocol, error) {
        return error instanceof protocol.VelaProtocolError;
    }

    function createExecutionPreflight(options) {
        var protocol = options && options.protocol;
        if (!protocolModule.isTrustedProtocol(protocol)) {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        if (!protocol.isPlainObject(options)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution preflight options must be an object."); }
        protocol.assertNoUnknownKeys(options, ["protocol", "actionValidator", "planStore", "contextBridge", "reviewPort", "getCurrentExecutionBinding", "executeValidatedAction"], "executionPreflight.options");

        var actionValidator = protocol.getOwnDataProperty(options, "actionValidator");
        var planStore = protocol.getOwnDataProperty(options, "planStore");
        var contextBridge = protocol.getOwnDataProperty(options, "contextBridge");
        var reviewPort = Object.prototype.hasOwnProperty.call(options, "reviewPort") ? protocol.getOwnDataProperty(options, "reviewPort") : null;
        if (!validatorModule.isTrustedActionValidatorForProtocol(actionValidator, protocol) || !validatorModule.isTrustedAuthorityForProtocol(actionValidator.authority, protocol)) {
            protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Execution preflight requires a trusted action validator.");
        }
        if (!planModule.isTrustedPlanStoreForProtocol(planStore, protocol)) {
            protocol.fail(protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE, "Execution preflight requires a trusted plan store.");
        }
        if (!bridgeModule.isTrustedContextBridgeForProtocol(contextBridge, protocol)) {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Execution preflight requires a trusted context bridge.");
        }
        if (!reviewPort) {
            reviewPort = bridgeModule.createReviewPort(contextBridge, protocol);
        }
        if (!bridgeModule.isTrustedReviewPortForProtocol(reviewPort, protocol)) {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Execution preflight requires a trusted review port.");
        }
        var getCurrentExecutionBinding = requireOwnFunction(protocol, options, "getCurrentExecutionBinding");
        var executeValidatedAction = requireOwnFunction(protocol, options, "executeValidatedAction");
        var guard = guardModule.createExecutionGuard(planStore);
        if (!guard || typeof guard.check !== "function" || typeof guard.reserve !== "function" || typeof guard.complete !== "function" || typeof guard.fail !== "function" || typeof guard.abort !== "function") {
            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Execution guard terminalization is unavailable.");
        }
        var recordsByPlanId = new Map();
        var active = false;

        function summarizeReview(bindingCapture, valueCapture) {
            var summarize = requireOwnFunction(protocol, reviewPort, "summarize");
            var summary;
            try { summary = summarize(bindingCapture, valueCapture); }
            catch (error) { throw error instanceof protocol.VelaProtocolError ? error : protocolError(protocol, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED); }
            protocol.assertSafeJson(summary);
            if (!protocol.isPlainObject(summary)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution review summary is invalid."); }
            protocol.assertNoUnknownKeys(summary, ["valueKind", "beforeValue"], "executionPreflight.review");
            if (summary.valueKind !== "number" || typeof summary.beforeValue !== "number" || !Number.isFinite(summary.beforeValue) || Object.is(summary.beforeValue, -0) ||
                    summary.beforeValue < 0 || summary.beforeValue > 100) {
                protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution review summary is invalid.");
            }
            return protocol.deepFreeze({ valueKind: "number", beforeValue: summary.beforeValue });
        }

        function cloneCurrentBinding() {
            var raw;
            try { raw = getCurrentExecutionBinding(); }
            catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Current execution binding is unavailable."); }
            protocol.assertSafeJson(raw);
            if (!protocol.isPlainObject(raw)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Current execution binding is invalid."); }
            protocol.assertNoUnknownKeys(raw, ["settingsFingerprint", "permissionSnapshot", "lifecycle", "hasVerifier"], "executionPreflight.current");
            protocol.assertFingerprint(protocol.getOwnDataProperty(raw, "settingsFingerprint"), "executionPreflight.current.settingsFingerprint");
            protocol.validatePermissionSnapshot(protocol.getOwnDataProperty(raw, "permissionSnapshot"));
            if (raw.lifecycle !== undefined && raw.lifecycle !== "ready" && raw.lifecycle !== "active") { protocol.fail(protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Current execution lifecycle is blocked."); }
            if (raw.hasVerifier !== undefined && typeof raw.hasVerifier !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Current execution verifier is invalid."); }
            return protocol.deepFreeze(protocol.cloneJson(raw, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }));
        }

        function assertSinglePropertyTarget(action) {
            var target = action && action.target;
            var allowed = ["contextFingerprint", "contextTier", "layerId", "propertyPath", "propertyMatchName", "propertyValueDigest"];
            if (!protocol.isPlainObject(target)) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Execution preflight requires an explicit property target."); }
            protocol.assertNoUnknownKeys(target, allowed, "executionPreflight.target");
            protocol.assertFingerprint(protocol.getOwnDataProperty(target, "contextFingerprint"), "executionPreflight.target.contextFingerprint");
            if (protocol.getOwnDataProperty(target, "contextTier") !== 3) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Execution preflight requires a Tier 3 property target."); }
            var layerId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "layerId"), "executionPreflight.target.layerId", 256);
            var propertyPath = protocol.getOwnDataProperty(target, "propertyPath");
            if (!Array.isArray(propertyPath) || propertyPath.length < 3 || propertyPath.length > 36 || propertyPath.length % 3 !== 0) {
                protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Execution preflight property path is invalid.");
            }
            propertyPath.forEach(function (part, index) {
                var offset = index % 3;
                if (offset === 0 && part !== "named" && part !== "indexed") { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Execution preflight property path is invalid."); }
                if (offset === 1) { protocol.assertNonEmptyString(part, "executionPreflight.target.propertyPath[" + index + "]", 56); }
                if (offset === 2 && (!Number.isInteger(part) || (propertyPath[index - 2] === "named" ? part !== 0 : part < 1 || part > protocol.HARD_LIMITS.maxNumberAbs))) {
                    protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Execution preflight property path is invalid.");
                }
            });
            var propertyMatchName = protocol.assertNonEmptyString(protocol.getOwnDataProperty(target, "propertyMatchName"), "executionPreflight.target.propertyMatchName", 56);
            if (propertyPath[propertyPath.length - 2] !== propertyMatchName) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Execution preflight property target is inconsistent."); }
            var propertyValueDigest = protocol.assertFingerprint(protocol.getOwnDataProperty(target, "propertyValueDigest"), "executionPreflight.target.propertyValueDigest");
            return protocol.deepFreeze({ layerId: layerId, propertyPath: protocol.cloneJson(propertyPath, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }), propertyMatchName: propertyMatchName, propertyValueDigest: propertyValueDigest });
        }

        function assertBindingCapture(capture) {
            if (!capture || !Object.isFrozen(capture) || capture.tier !== 1 || capture.executable !== true) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Execution binding capture is invalid.");
            }
            protocol.assertFingerprint(capture.fingerprint, "executionPreflight.binding.fingerprint");
            return capture;
        }

        function assertValueCapture(capture, target) {
            var item;
            if (!capture || !Object.isFrozen(capture) || capture.tier !== 3 || capture.purpose !== "property-value-binding" || capture.executable !== true || !capture.snapshot || !Array.isArray(capture.snapshot.targets) || capture.snapshot.targets.length !== 1) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Property value capture is invalid.");
            }
            protocol.assertFingerprint(capture.fingerprint, "executionPreflight.valueCapture.fingerprint");
            item = capture.snapshot.targets[0];
            if (!item || item.layerId !== target.layerId || protocol.canonicalStringify(item.propertyPath) !== protocol.canonicalStringify(target.propertyPath) || item.propertyMatchName !== target.propertyMatchName || item.valueDigest !== target.propertyValueDigest) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Property value capture does not match the validated target.");
            }
            return capture;
        }

        function recordForPlan(planId) {
            var record = recordsByPlanId.get(planId);
            if (!record) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "The plan has no execution-context binding."); }
            return record;
        }

        function clearRecord(record, terminalLifecycle) {
            if (terminalLifecycle !== undefined) { record.lifecycle = terminalLifecycle; }
            recordsByPlanId.delete(record.planId);
            record.originalBindingCapture = null;
            record.originalValueCapture = null;
            record.lifecycle = "cleared";
        }

        function markStale(record, reason) {
            planStore.markStale(record.candidateId, reason);
            clearRecord(record, "stale");
        }

        function withActive(operation) {
            if (active) { return Promise.reject(protocolError(protocol, protocol.ERROR_CODES.EXECUTION_BUSY)); }
            active = true;
            return Promise.resolve().then(operation).then(function (value) { active = false; return value; }, function (error) { active = false; throw error; });
        }

        function freshBinding(selectionOrderMeaningful) {
            return contextBridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: selectionOrderMeaningful !== false }).then(assertBindingCapture);
        }

        function createBoundPlan(input) {
            return withActive(function () {
                if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan input is invalid."); }
                protocol.assertNoUnknownKeys(input, ["proposal", "localProposal", "selectionOrderMeaningful"], "executionPreflight.createBoundPlan");
                if (typeof protocol.getOwnDataProperty(input, "selectionOrderMeaningful") !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan selection order is invalid."); }
                var proposal = Object.prototype.hasOwnProperty.call(input, "proposal") ? protocol.getOwnDataProperty(input, "proposal") : undefined;
                var localProposal = Object.prototype.hasOwnProperty.call(input, "localProposal") ? protocol.getOwnDataProperty(input, "localProposal") : undefined;
                if ((proposal === undefined) === (localProposal === undefined)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan requires exactly one proposal source."); }
                if (localProposal !== undefined) {
                    var localCapabilityId;
                    var localParams;
                    var localCapability;
                    var registeredAction;
                    var validatedLocalParams;
                    if (!protocol.isPlainObject(localProposal)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Local proposal input is invalid."); }
                    protocol.assertNoUnknownKeys(localProposal, ["capabilityId", "params"], "executionPreflight.localProposal");
                    localCapabilityId = protocol.getOwnDataProperty(localProposal, "capabilityId");
                    localParams = protocol.getOwnDataProperty(localProposal, "params");
                    localCapability = capabilityContracts.getLocalProjection(localCapabilityId);
                    registeredAction = capabilityContracts.resolveRegisteredAction(localCapabilityId);
                    if (!localCapability || !registeredAction || !protocol.isPlainObject(localParams)) { protocol.fail(protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Local proposal capability is unavailable."); }
                    try { validatedLocalParams = capabilityContracts.validateCapabilityParams(localCapability, localParams); }
                    catch (error) { protocol.fail(protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Local capability parameters are invalid."); }
                    localProposal = protocol.deepFreeze({ capabilityId: localCapabilityId, params: validatedLocalParams, registeredAction: registeredAction });
                }
                return freshBinding(protocol.getOwnDataProperty(input, "selectionOrderMeaningful")).then(function (bindingCapture) {
                    var selection = bindingCapture.snapshot && bindingCapture.snapshot.selection;
                    var bindingItems = Array.isArray(selection) ? selection : selection && selection.items;
                    var layerId;
                    var target;
                    if (localProposal !== undefined) {
                        if (!Array.isArray(bindingItems) || bindingItems.length !== 1 || !bindingItems[0] || typeof bindingItems[0].layerId !== "string") {
                            protocol.fail(protocol.ERROR_CODES.UNKNOWN_TARGET, "Local opacity proposal requires exactly one selected layer.");
                        }
                        layerId = bindingItems[0].layerId;
                        target = {
                            contextFingerprint: bindingCapture.fingerprint,
                            contextTier: 3,
                            layerId: layerId,
                            propertyPath: ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0],
                            propertyMatchName: "ADBE Opacity",
                            propertyValueDigest: null
                        };
                    } else {
                        var validated = actionValidator.validateActionProposal(proposal, { expectedContextFingerprint: bindingCapture.fingerprint });
                        var action = validated && validated.action;
                        if (!actionValidator.authority.isValidatedAction(action)) { protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Validated action provenance is invalid."); }
                        target = assertSinglePropertyTarget(action);
                        if (action.target.contextFingerprint !== bindingCapture.fingerprint) { protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Validated action context is stale."); }
                    }
                    return contextBridge.capturePropertyValues(bindingCapture, [{ layerId: target.layerId, propertyPath: target.propertyPath }]).then(function (valueCapture) {
                        var review;
                        var action;
                        if (localProposal !== undefined) {
                            if (!valueCapture.snapshot || !Array.isArray(valueCapture.snapshot.targets) || valueCapture.snapshot.targets.length !== 1) {
                                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Local opacity value capture is invalid.");
                            }
                            target.propertyValueDigest = valueCapture.snapshot.targets[0].valueDigest;
                            proposal = {
                                providerActionId: "local:" + localProposal.capabilityId + ":" + valueCapture.requestId,
                                kind: "tool",
                                title: "Set Opacity",
                                rationale: "Local deterministic opacity proposal.",
                                risk: "write",
                                target: target,
                                payload: { toolId: localProposal.registeredAction.toolId, actionId: localProposal.registeredAction.actionId, params: protocol.cloneJson(localProposal.params, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }) },
                                undoGroupLabel: "Vela: Set Opacity",
                                requiresConfirmation: true
                            };
                            var validatedLocal = actionValidator.validateActionProposal(proposal, { expectedContextFingerprint: bindingCapture.fingerprint });
                            action = validatedLocal && validatedLocal.action;
                            if (!actionValidator.authority.isValidatedAction(action)) { protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Validated local action provenance is invalid."); }
                            target = assertSinglePropertyTarget(action);
                        } else {
                            action = actionValidator.validateActionProposal(proposal, { expectedContextFingerprint: bindingCapture.fingerprint }).action;
                            if (!actionValidator.authority.isValidatedAction(action)) { protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Validated action provenance is invalid."); }
                        }
                        assertValueCapture(valueCapture, target);
                        review = summarizeReview(bindingCapture, valueCapture);
                        var current = cloneCurrentBinding();
                        var plan = planStore.createPlan({
                            validatedActions: [action],
                            validatorAuthority: actionValidator.authority,
                            contextFingerprint: bindingCapture.fingerprint,
                            settingsFingerprint: current.settingsFingerprint,
                            permissionSnapshot: current.permissionSnapshot
                        });
                        var candidateId = plan.candidateIds[0];
                        var record = {
                            planId: plan.planId,
                            planRevision: plan.planRevision,
                            candidateId: candidateId,
                            actionIndex: 0,
                            action: protocol.deepFreeze(protocol.cloneJson(action, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes })),
                            originalBindingCapture: bindingCapture,
                            originalValueCapture: valueCapture,
                            target: target,
                            contextFingerprint: bindingCapture.fingerprint,
                            propertyValueCaptureFingerprint: valueCapture.fingerprint,
                            selectionOrderMeaningful: protocol.getOwnDataProperty(input, "selectionOrderMeaningful"),
                            lifecycle: "pending-confirmation",
                            confirmationNonce: null
                        };
                        try { recordsByPlanId.set(plan.planId, record); }
                        catch (error) {
                            try { planStore.discardPlan(plan.planId, "preflight-registration-failed"); } catch (ignored) { /* fail closed without returning a plan */ }
                            protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Execution context binding could not be registered.");
                        }
                        return protocol.deepFreeze({
                            planId: plan.planId,
                            planRevision: plan.planRevision,
                            candidateIds: plan.candidateIds,
                            candidates: plan.candidates,
                            actionCount: plan.actionCount,
                            state: plan.state,
                            nextStep: plan.nextStep,
                            createdAt: plan.createdAt,
                            review: review
                        });
                    });
                });
            });
        }

        function confirmBoundPlan(input) {
            return withActive(function () {
                if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan confirmation input is invalid."); }
                protocol.assertNoUnknownKeys(input, ["planId"], "executionPreflight.confirmBoundPlan");
                var planId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(input, "planId"), "executionPreflight.planId", protocol.HARD_LIMITS.maxLocalIdBytes);
                var record = recordForPlan(planId);
                if (record.lifecycle !== "pending-confirmation") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Bound plan cannot be confirmed."); }
                return freshBinding(record.selectionOrderMeaningful).then(function (fresh) {
                    if (fresh.fingerprint !== record.contextFingerprint) {
                        markStale(record, "context-drift-before-confirmation");
                        throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE);
                    }
                    var current = cloneCurrentBinding();
                    var confirmed = planStore.confirmPlan(planId, {
                        contextFingerprint: fresh.fingerprint,
                        settingsFingerprint: current.settingsFingerprint,
                        permissionSnapshot: current.permissionSnapshot
                    });
                    var candidate = planStore.getCandidate(record.candidateId);
                    record.confirmationNonce = candidate.confirmationNonce;
                    record.lifecycle = "confirmed";
                    return confirmed;
                });
            });
        }

        function staleFromError(record, error) {
            if (error && (error.code === protocol.ERROR_CODES.CONTEXT_STALE || error.code === protocol.ERROR_CODES.UNKNOWN_TARGET)) {
                if (recordsByPlanId.get(record.planId) === record) {
                    markStale(record, error.code === protocol.ERROR_CODES.UNKNOWN_TARGET ? "target-drift" : "context-drift");
                }
                return protocolError(protocol, error.code === protocol.ERROR_CODES.UNKNOWN_TARGET ? protocol.ERROR_CODES.UNKNOWN_TARGET : protocol.ERROR_CODES.CONTEXT_STALE);
            }
            return error;
        }

        function normalizeExecutorResult(value) {
            protocol.assertSafeJson(value);
            if (!protocol.isPlainObject(value)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Executor result is invalid."); }
            protocol.assertNoUnknownKeys(value, ["ok", "summary"], "executionPreflight.executorResult");
            if (typeof protocol.getOwnDataProperty(value, "ok") !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Executor result is invalid."); }
            if (value.summary !== undefined) { protocol.assertJsonBudget(value.summary, { maxBytes: protocol.HARD_LIMITS.maxErrorDetailsJsonBytes }); }
            return protocol.deepFreeze(protocol.cloneJson(value, { maxBytes: protocol.HARD_LIMITS.maxErrorDetailsJsonBytes }));
        }

        function executeStep(input) {
            return withActive(function () {
                if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution step input is invalid."); }
                protocol.assertNoUnknownKeys(input, ["planId", "stepIndex"], "executionPreflight.executeStep");
                var planId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(input, "planId"), "executionPreflight.planId", protocol.HARD_LIMITS.maxLocalIdBytes);
                if (protocol.getOwnDataProperty(input, "stepIndex") !== 0) { protocol.fail(protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Execution preflight supports only step zero."); }
                var record = recordForPlan(planId);
                if (record.lifecycle !== "confirmed") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Bound plan is not confirmed."); }
                return freshBinding(record.selectionOrderMeaningful).then(function (freshBindingCapture) {
                    return contextBridge.capturePropertyValues(freshBindingCapture, [{ layerId: record.target.layerId, propertyPath: record.target.propertyPath }]).then(function (freshValueCapture) {
                        return { bindingCapture: freshBindingCapture, valueCapture: freshValueCapture };
                    });
                }).then(function (fresh) {
                    var freshBindingCapture = fresh.bindingCapture;
                    var freshValueCapture = fresh.valueCapture;
                    var comparison = contextBridge.compareCaptures(record.originalValueCapture, freshValueCapture);
                    if (!comparison || comparison.fresh !== true || comparison.reason !== null) {
                        markStale(record, "property-value-drift");
                        throw protocolError(protocol, protocol.ERROR_CODES.CONTEXT_STALE);
                    }
                    var current = cloneCurrentBinding();
                    current = protocol.deepFreeze(protocol.cloneJson({
                        lifecycle: current.lifecycle === undefined ? "active" : current.lifecycle,
                        planRevision: record.planRevision,
                        totalSteps: 1,
                        confirmationNonce: record.confirmationNonce,
                        permissionSnapshot: current.permissionSnapshot,
                        contextFingerprint: freshBindingCapture.fingerprint,
                        settingsFingerprint: current.settingsFingerprint,
                        hasVerifier: current.hasVerifier === true
                    }, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }));
                    var checked = guard.check(record.planId, 0, current);
                    if (!checked.ok) { throw protocolError(protocol, checked.error.code); }
                    var reserved = guard.reserve(record.planId, 0, current);
                    record.lifecycle = "executing";
                    var terminalized = false;
                    var action = protocol.deepFreeze(protocol.cloneJson(reserved.candidate.action, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }));
                    var metadata = protocol.deepFreeze({ planId: record.planId, planRevision: record.planRevision, candidateId: record.candidateId, actionIndex: 0 });
                    /* Capture ownership remains in the bridge WeakMap.  This opaque
                       value is never cloned, serialized, returned, or stored by
                       PlanStore; the execution adapter must validate it again. */
                    var trustedExecutionContext = Object.freeze({ bindingCapture: freshBindingCapture, valueCapture: freshValueCapture });

                    function stableExecutorError(error) {
                        return isProtocolError(protocol, error) ? error : protocolError(protocol, protocol.ERROR_CODES.PLAN_FAILED);
                    }

                    function failTerminal(error) {
                        var stableError = stableExecutorError(error);
                        if (terminalized) { throw stableError; }
                        try {
                            guard.fail(reserved.reservation, stableError);
                            terminalized = true;
                            clearRecord(record, "failed");
                            throw stableError;
                        } catch (failure) {
                            if (terminalized) { throw stableError; }
                            try {
                                guard.abort(reserved.reservation, stableError.code);
                                terminalized = true;
                                clearRecord(record, "failed");
                            } catch (abortFailure) {
                                throw protocolError(protocol, protocol.ERROR_CODES.PLAN_FAILED);
                            }
                            throw stableError;
                        }
                    }

                    function completeTerminal(result) {
                        if (terminalized) { throw protocolError(protocol, protocol.ERROR_CODES.PLAN_FAILED); }
                        try {
                            var candidate = guard.complete(reserved.reservation, result);
                            terminalized = true;
                            clearRecord(record, result.ok ? "consumed" : "failed");
                            return protocol.deepFreeze({ candidate: candidate, result: result });
                        } catch (error) {
                            return failTerminal(error);
                        }
                    }

                    function completeReturned(value) {
                        var result;
                        try { result = normalizeExecutorResult(value); }
                        catch (error) { return failTerminal(error); }
                        return completeTerminal(result);
                    }

                    var returned;
                    try { returned = executeValidatedAction(action, metadata, trustedExecutionContext); }
                    catch (error) { return failTerminal(error); }
                    return Promise.resolve(returned).then(completeReturned, failTerminal);
                }).catch(function (error) { throw staleFromError(record, error); });
            });
        }

        function discardBoundPlan(input) {
            if (!protocol.isPlainObject(input)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan discard input is invalid."); }
            protocol.assertNoUnknownKeys(input, ["planId", "reason"], "executionPreflight.discardBoundPlan");
            var planId = protocol.assertNonEmptyString(protocol.getOwnDataProperty(input, "planId"), "executionPreflight.planId", protocol.HARD_LIMITS.maxLocalIdBytes);
            var record = recordForPlan(planId);
            var reason = protocol.getOwnDataProperty(input, "reason");
            if (reason !== undefined && typeof reason !== "string") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Bound plan discard reason is invalid."); }
            var view = planStore.discardPlan(planId, reason);
            clearRecord(record, "discarded");
            return view;
        }

        return Object.freeze({
            createBoundPlan: createBoundPlan,
            confirmBoundPlan: confirmBoundPlan,
            executeStep: executeStep,
            discardBoundPlan: discardBoundPlan
        });
    }

    return Object.freeze({ createExecutionPreflight: createExecutionPreflight });
}));
