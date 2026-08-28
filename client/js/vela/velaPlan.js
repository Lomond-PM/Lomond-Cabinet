(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaPlan";
    var BOOTSTRAP_NAME = "__velaProtocolCoreBootstrapV1";

    function bootstrapError(code, message) {
        var error = new Error(message);
        error.code = code;
        return error;
    }

    function assertDependencies(protocolDependency, validatorDependency) {
        if (!protocolDependency || typeof protocolDependency.createProtocol !== "function" || typeof protocolDependency.isTrustedProtocol !== "function" || !protocolDependency.ERROR_CODES) {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaPlan requires VelaProtocol.");
        }
        if (!validatorDependency || typeof validatorDependency.isTrustedAuthority !== "function" || typeof validatorDependency.isTrustedAuthorityForProtocol !== "function") {
            throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaPlan requires VelaValidator.");
        }
        return { protocol: protocolDependency, validator: validatorDependency };
    }

    function registerBrowserModule(target, name, create) {
        var hasOwn = Object.prototype.hasOwnProperty;
        if (!hasOwn.call(target, BOOTSTRAP_NAME)) { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "VelaPlan requires the Vela protocol bootstrap."); }
        var bootstrap = target[BOOTSTRAP_NAME];
        if (!bootstrap || !Object.isFrozen(bootstrap) || typeof bootstrap.getModule !== "function" || typeof bootstrap.hasModule !== "function" || typeof bootstrap.registerModule !== "function") { throw bootstrapError("RUNTIME_CAPABILITY_UNAVAILABLE", "The Vela protocol bootstrap is invalid."); }
        if (bootstrap.hasModule(name)) { throw bootstrapError("MODULE_ALREADY_REGISTERED", name + " is already registered."); }
        if (hasOwn.call(target, name) || !Object.isExtensible(target)) { throw bootstrapError("MODULE_BOOTSTRAP_CONFLICT", name + " global registration conflicts with the loaded module."); }
        var dependencies = assertDependencies(bootstrap.getModule("VelaProtocol"), bootstrap.getModule("VelaValidator"));
        var exported = Object.freeze(create(dependencies.protocol, dependencies.validator));
        bootstrap.registerModule(name, exported);
        Object.defineProperty(target, name, { configurable: false, enumerable: true, value: exported, writable: false });
    }

    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        registerBrowserModule(root, MODULE_NAME, factory);
    } else if (typeof module === "object" && module.exports) {
        var dependencies = assertDependencies(require("./velaProtocol"), require("./velaValidator"));
        module.exports = Object.freeze(factory(dependencies.protocol, dependencies.validator));
    }
}(typeof self !== "undefined" ? self : this, function (protocolModule, validatorModule) {
    "use strict";

    var activeSessionIds = new Set();
    var trustedPlanStores = new WeakSet();
    var planStoreProtocols = new WeakMap();

    function isTrustedPlanStore(store) {
        return Boolean(store && trustedPlanStores.has(store));
    }

    function isTrustedPlanStoreForProtocol(store, protocol) {
        return Boolean(isTrustedPlanStore(store) && protocolModule.isTrustedProtocol(protocol) && planStoreProtocols.get(store) === protocol);
    }

    function requireProtocol(protocol) {
        if (!protocolModule.isTrustedProtocol(protocol) || typeof protocol.canonicalStringify !== "function" || typeof protocol.assertLocalId !== "function") {
            throw new protocolModule.VelaProtocolError(protocolModule.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
        }
        return protocol;
    }

    function createPlanStore(protocol, options) {
        protocol = requireProtocol(protocol);
        options = options || {};
        if (!validatorModule.isTrustedAuthority(options.validatorAuthority)) {
            protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "A trusted local validation authority is required.", { stage: "plan-create" });
        }
        if (!validatorModule.isTrustedAuthorityForProtocol(options.validatorAuthority, protocol)) {
            protocol.fail(protocol.ERROR_CODES.PROTOCOL_AUTHORITY_MISMATCH, "The validation authority is bound to another protocol instance.", { stage: "plan-create" });
        }

        var authority = options.validatorAuthority;
        var candidateIdFactory = options.candidateIdFactory || function (kind) { return protocol.randomId(kind); };
        var confirmationIdFactory = options.nonceFactory || function (kind) { return protocol.randomId(kind); };
        var planIdFactory = options.planIdFactory || function (kind) { return protocol.randomId(kind); };
        var reservationIdFactory = options.reservationIdFactory || function (kind) { return protocol.randomId(kind); };
        var sessionIdFactory = options.sessionIdFactory || function (kind) { return protocol.randomId(kind); };
        var clock = options.now || function () { return protocol.now(); };
        var plans = new Map();
        var candidates = new Map();
        var replayKeys = new Set();
        var reservations = new WeakMap();
        var reservationsByCandidate = new Map();
        var settledReservations = new WeakMap();
        var stableErrorCodes = new Set(Object.keys(protocol.ERROR_CODES).map(function (key) {
            return protocol.ERROR_CODES[key];
        }));
        var confirmationIds = new Set();
        var reservationIds = new Set();
        var nextRevision = 0;
        var executionActive = false;
        var sessionId = freshRawId(sessionIdFactory, "session", activeSessionIds, "plan-create");
        activeSessionIds.add(sessionId);

        function safeNow() {
            var value;
            try { value = clock(); }
            catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "The local clock is unavailable."); }
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
                protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "The local clock is unavailable.");
            }
            return value;
        }

        function snapshot(value) {
            return protocol.deepFreeze(protocol.cloneJson(value, {
                maxBytes: protocol.HARD_LIMITS.maxResponseJsonBytes,
                allowDangerousPaths: ["candidateId", "candidateIds.*", "candidates.*.candidateId"]
            }));
        }

        function requiredCandidate(candidateId) {
            if (typeof candidateId !== "string" || !candidates.has(candidateId)) {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "The local candidate was not found.", { details: { candidateId: typeof candidateId === "string" ? candidateId : "invalid" } });
            }
            return candidates.get(candidateId);
        }

        function requiredPlan(planId) {
            if (typeof planId !== "string" || !plans.has(planId)) {
                protocol.fail(protocol.ERROR_CODES.PLAN_INVALID, "The local plan was not found.", { stage: "plan-lifecycle" });
            }
            return plans.get(planId);
        }

        function binding(value) {
            if (!protocol.isPlainObject(value)) { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Candidate binding must be an object."); }
            protocol.assertFingerprint(value.contextFingerprint, "binding.contextFingerprint");
            protocol.assertFingerprint(value.settingsFingerprint, "binding.settingsFingerprint");
            var permissionSnapshot = protocol.validatePermissionSnapshot(value.permissionSnapshot);
            return {
                contextFingerprint: value.contextFingerprint,
                settingsFingerprint: value.settingsFingerprint,
                permissionSnapshot: permissionSnapshot,
                confirmationNonce: value.confirmationNonce
            };
        }

        function bindingMatches(candidate, supplied) {
            var current = binding(supplied);
            if (candidate.contextFingerprint !== current.contextFingerprint || candidate.settingsFingerprint !== current.settingsFingerprint) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Candidate context or execution settings are stale.", { stage: "candidate-lifecycle" });
            }
            if (protocol.canonicalStringify(candidate.permissionSnapshot) !== protocol.canonicalStringify(current.permissionSnapshot)) {
                protocol.fail(protocol.ERROR_CODES.PERMISSION_DENIED, "Candidate permission snapshot no longer matches.", { stage: "candidate-lifecycle" });
            }
            if (candidate.action.target.contextFingerprint !== candidate.contextFingerprint) {
                protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "Candidate action target is not bound to the candidate context.", { stage: "candidate-lifecycle" });
            }
            return current;
        }

        function freshRawId(factory, kind, used, stage) {
            var attempt;
            for (attempt = 0; attempt < protocol.HARD_LIMITS.maxIdCollisionRetries; attempt += 1) {
                var raw;
                try { raw = factory(kind); }
                catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "A local id factory failed.", { stage: stage }); }
                protocol.assertLocalId(raw, kind);
                if (!used.has(raw)) { return raw; }
            }
            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local id factory exhausted the collision budget.", { stage: stage });
        }

        function sessionBoundId(kind, raw) {
            return kind + "_" + protocol.sha256Hex(sessionId + ":" + kind + ":" + raw);
        }

        function freshBoundId(factory, kind, used, stage) {
            var rawAttempts = new Set();
            var attempt;
            for (attempt = 0; attempt < protocol.HARD_LIMITS.maxIdCollisionRetries; attempt += 1) {
                var raw;
                try { raw = factory(kind); }
                catch (error) { protocol.fail(protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "A local id factory failed.", { stage: stage }); }
                protocol.assertLocalId(raw, kind);
                var value = sessionBoundId(kind, raw);
                protocol.assertLocalId(value, kind);
                if (!used.has(value) && !rawAttempts.has(raw)) { return value; }
                rawAttempts.add(raw);
            }
            protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A local id factory exhausted the collision budget.", { stage: stage });
        }

        function allConfirmed(plan) {
            return plan.candidateIds.every(function (id) { return candidates.get(id).state === "confirmed"; });
        }

        function validatePlanInput(input) {
            input = input || {};
            if (!Array.isArray(input.validatedActions) || input.validatedActions.length < 1 || input.validatedActions.length > protocol.HARD_LIMITS.maxPlanSteps) {
                protocol.fail(protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Plan steps exceed the protocol limit.", { stage: "plan-create" });
            }
            if (input.validatorAuthority !== undefined && input.validatorAuthority !== authority) {
                protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "The plan authority does not match the local validator.");
            }
            protocol.assertSafeJson(input.validatedActions);
            protocol.assertFingerprint(input.contextFingerprint, "plan.contextFingerprint");
            protocol.assertFingerprint(input.settingsFingerprint, "plan.settingsFingerprint");
            var permissionSnapshot = protocol.validatePermissionSnapshot(input.permissionSnapshot);
            var actions = input.validatedActions.map(function (action, index) {
                if (!authority.isValidatedAction(action)) {
                    protocol.fail(protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Only locally validated actions can enter a plan.", { details: { index: index } });
                }
                protocol.validateNormalizedAction(action);
                if (action.target.contextFingerprint !== input.contextFingerprint) {
                    protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "A plan action target is not bound to the plan context.", { details: { index: index } });
                }
                return protocol.cloneJson(action, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            });
            protocol.assertJsonBudget(actions.map(function (action) { return action.payload; }), { maxBytes: protocol.HARD_LIMITS.maxPlanPayloadBytes });
            return {
                actions: actions,
                contextFingerprint: input.contextFingerprint,
                settingsFingerprint: input.settingsFingerprint,
                permissionSnapshot: permissionSnapshot
            };
        }

        function buildPlan(input, supersedesPlanId) {
            var validated = validatePlanInput(input);
            var planId = freshBoundId(planIdFactory, "plan", plans, "plan-create");
            var planRevision = nextRevision;
            var createdAt = safeNow();
            var plan = {
                planId: planId,
                planRevision: planRevision,
                contextFingerprint: validated.contextFingerprint,
                settingsFingerprint: validated.settingsFingerprint,
                permissionSnapshot: protocol.cloneJson(validated.permissionSnapshot, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }),
                candidateIds: [],
                actionCount: validated.actions.length,
                state: "pending-confirmation",
                nextStep: 0,
                createdAt: createdAt
            };
            if (supersedesPlanId) { plan.supersedesPlanId = supersedesPlanId; }
            var localIds = new Set();
            var candidateRecords = [];
            validated.actions.forEach(function (action, actionIndex) {
                var usedIds = new Set(Array.from(candidates.keys()).concat(Array.from(localIds)));
                var candidateId = freshBoundId(candidateIdFactory, "cand", usedIds, "plan-create");
                localIds.add(candidateId);
                plan.candidateIds.push(candidateId);
                candidateRecords.push({
                    schemaVersion: protocol.SCHEMA_VERSION,
                    candidateId: candidateId,
                    action: action,
                    contextFingerprint: validated.contextFingerprint,
                    settingsFingerprint: validated.settingsFingerprint,
                    permissionSnapshot: protocol.cloneJson(validated.permissionSnapshot, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes }),
                    planRevision: planRevision,
                    actionIndex: actionIndex,
                    requiresConfirmation: action.requiresConfirmation,
                    issuedAt: safeNow(),
                    state: "pending-confirmation",
                    planId: planId
                });
            });
            return { plan: plan, candidates: candidateRecords };
        }

        function commitPlan(bundle) {
            bundle.candidates.forEach(function (candidate) { candidates.set(candidate.candidateId, candidate); });
            plans.set(bundle.plan.planId, bundle.plan);
            nextRevision += 1;
            return getPlanView(bundle.plan.planId);
        }

        function createPlan(input) {
            return commitPlan(buildPlan(input));
        }

        function revisePlan(planId, validatedActions, suppliedBindings) {
            var previous = requiredPlan(planId);
            if (previous.state === "active" || previous.candidateIds.some(function (id) { return candidates.get(id).state === "executing"; })) {
                protocol.fail(protocol.ERROR_CODES.EXECUTION_BUSY, "An executing plan cannot be revised.");
            }
            if (previous.state !== "pending-confirmation" && previous.state !== "confirmed") {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Only a pending or confirmed plan can be revised.", { details: { state: previous.state } });
            }
            var current = binding(suppliedBindings);
            var bundle = buildPlan({
                validatedActions: validatedActions,
                contextFingerprint: current.contextFingerprint,
                settingsFingerprint: current.settingsFingerprint,
                permissionSnapshot: current.permissionSnapshot
            }, previous.planId);
            previous.candidateIds.forEach(function (candidateId) {
                var candidate = candidates.get(candidateId);
                if (candidate.state === "pending-confirmation" || candidate.state === "confirmed" || candidate.state === "stale") {
                    candidate.state = "superseded";
                    candidate.supersededAt = bundle.plan.createdAt;
                    candidate.supersededByPlanId = bundle.plan.planId;
                }
            });
            previous.state = "superseded";
            previous.supersededAt = bundle.plan.createdAt;
            previous.supersededByPlanId = bundle.plan.planId;
            previous.supersededByRevision = bundle.plan.planRevision;
            return commitPlan(bundle);
        }

        function getCandidate(candidateId) {
            return snapshot(requiredCandidate(candidateId));
        }

        function getPlanView(planId) {
            var plan = requiredPlan(planId);
            var view = {
                planId: plan.planId,
                planRevision: plan.planRevision,
                contextFingerprint: plan.contextFingerprint,
                settingsFingerprint: plan.settingsFingerprint,
                permissionSnapshot: plan.permissionSnapshot,
                candidateIds: plan.candidateIds.slice(),
                candidates: plan.candidateIds.map(function (id) { return candidates.get(id); }),
                actionCount: plan.actionCount,
                state: plan.state,
                nextStep: plan.nextStep,
                createdAt: plan.createdAt
            };
            ["supersedesPlanId", "supersededByPlanId", "supersededByRevision", "supersededAt"].forEach(function (key) {
                if (plan[key] !== undefined) { view[key] = plan[key]; }
            });
            return snapshot(view);
        }

        function confirmCandidate(candidateId, supplied) {
            var candidate = requiredCandidate(candidateId);
            var plan = requiredPlan(candidate.planId);
            if (candidate.state !== "pending-confirmation" || plan.state !== "pending-confirmation") {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Only a pending candidate can be confirmed.", { details: { candidateId: candidateId, state: candidate.state } });
            }
            var current = bindingMatches(candidate, supplied);
            var nonce = freshBoundId(confirmationIdFactory, "confirm", confirmationIds, "candidate-confirm");
            var confirmedAt = safeNow();
            var confirmedPermission = protocol.cloneJson(current.permissionSnapshot, { maxBytes: protocol.HARD_LIMITS.maxActionPayloadBytes });
            confirmationIds.add(nonce);
            candidate.confirmationNonce = nonce;
            candidate.confirmedAt = confirmedAt;
            candidate.state = "confirmed";
            candidate.permissionSnapshot = confirmedPermission;
            if (allConfirmed(plan)) { plan.state = "confirmed"; }
            return getCandidate(candidateId);
        }

        function confirmPlan(planId, supplied) {
            var plan = requiredPlan(planId);
            if (plan.state !== "pending-confirmation") {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Only a pending plan can be confirmed.", { details: { state: plan.state } });
            }
            var current = binding(supplied);
            plan.candidateIds.forEach(function (candidateId) { confirmCandidate(candidateId, current); });
            if (!allConfirmed(plan)) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Every plan candidate must be confirmed."); }
            plan.state = "confirmed";
            return getPlanView(planId);
        }

        function markStale(candidateId, reason) {
            var candidate = requiredCandidate(candidateId);
            var plan = requiredPlan(candidate.planId);
            if (plan.candidateIds.some(function (id) { return candidates.get(id).state === "executing"; })) {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "An executing plan cannot become stale.");
            }
            if (candidate.state !== "pending-confirmation" && candidate.state !== "confirmed") {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Only pending or confirmed candidates can become stale.", { details: { candidateId: candidateId, state: candidate.state } });
            }
            var staleAt = safeNow();
            candidate.state = "stale";
            candidate.staleReason = reason || "binding-changed";
            candidate.staleAt = staleAt;
            plan.state = "stale";
            return getCandidate(candidateId);
        }

        function discardPlan(planId, reason) {
            var plan = requiredPlan(planId);
            if (plan.state !== "pending-confirmation" && plan.state !== "confirmed") {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "Only pending or confirmed plans can be discarded.");
            }
            if (plan.candidateIds.some(function (id) { return candidates.get(id).state === "executing"; })) {
                protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "An executing plan cannot be discarded.");
            }
            var discardedAt = safeNow();
            plan.candidateIds.forEach(function (candidateId) {
                var candidate = candidates.get(candidateId);
                if (candidate.state === "pending-confirmation" || candidate.state === "confirmed") {
                    candidate.state = "discarded";
                    candidate.discardReason = reason || "user-discarded";
                    candidate.discardedAt = discardedAt;
                }
            });
            plan.state = "discarded";
            return getPlanView(planId);
        }

        function prepareStep(planId, stepIndex, current) {
            var plan = requiredPlan(planId);
            current = current || {};
            if (executionActive) { protocol.fail(protocol.ERROR_CODES.EXECUTION_BUSY, "Another Vela execution is active."); }
            if (plan.state === "superseded") { protocol.fail(protocol.ERROR_CODES.PLAN_FAILED, "The plan revision has been superseded."); }
            if (plan.state === "stale" || plan.state === "discarded") { protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "The plan is stale or discarded."); }
            if (plan.state === "failed" || plan.state === "consumed") { protocol.fail(protocol.ERROR_CODES.PLAN_FAILED, "The plan is already spent."); }
            if (plan.state !== "confirmed" && plan.state !== "active") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "The plan is not confirmed."); }
            if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= protocol.HARD_LIMITS.maxPlanSteps || stepIndex !== plan.nextStep || stepIndex >= plan.actionCount) {
                protocol.fail(protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "The requested plan step is outside the budget.", { details: { index: stepIndex, totalSteps: plan.actionCount } });
            }
            if (current.planRevision !== undefined && current.planRevision !== plan.planRevision) { protocol.fail(protocol.ERROR_CODES.CONTEXT_STALE, "The plan revision is stale."); }
            if (current.totalSteps !== undefined && current.totalSteps !== plan.actionCount) { protocol.fail(protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "The plan step count does not match the immutable plan."); }
            if (current.lifecycle !== "active" && current.lifecycle !== "ready") { protocol.fail(protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "The application lifecycle does not permit execution."); }
            var candidate = candidates.get(plan.candidateIds[stepIndex]);
            if (candidate.state !== "confirmed") { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "The plan step candidate is not confirmed.", { details: { state: candidate.state } }); }
            var currentBinding = bindingMatches(candidate, current);
            if (candidate.requiresConfirmation !== false && candidate.confirmationNonce !== currentBinding.confirmationNonce) { protocol.fail(protocol.ERROR_CODES.PERMISSION_DENIED, "The confirmation nonce does not match."); }
            if (candidate.action.risk !== "read" && current.hasVerifier !== true) { protocol.fail(protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE, "A mutation verifier is unavailable."); }
            var publicReplayKey = candidate.candidateId + ":" + candidate.planRevision + ":" + stepIndex;
            var internalReplayKey = sessionId + ":" + publicReplayKey;
            if (replayKeys.has(internalReplayKey)) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_REPLAY, "The plan step replay key has already been used.", { details: { replayKey: publicReplayKey } }); }
            return { plan: plan, candidate: candidate, stepIndex: stepIndex, replayKey: publicReplayKey, internalReplayKey: internalReplayKey };
        }

        function checkStep(planId, stepIndex, current) {
            try {
                var prepared = prepareStep(planId, stepIndex, current);
                return { ok: true, replayKey: prepared.replayKey, actionIndex: prepared.stepIndex, totalSteps: prepared.plan.actionCount, candidate: snapshot(prepared.candidate) };
            } catch (error) {
                var normalized = error instanceof protocol.VelaProtocolError ? error : new protocol.VelaProtocolError(protocol.ERROR_CODES.PLAN_INVALID, "Plan step validation failed.", { stage: "execution-guard" });
                return Object.freeze({ ok: false, error: protocol.createErrorEnvelope(normalized).error });
            }
        }

        function reserveStep(planId, stepIndex, current) {
            var prepared = prepareStep(planId, stepIndex, current);
            var reservationId = freshBoundId(reservationIdFactory, "res", reservationIds, "execution-reserve");
            var reservedAt = safeNow();
            var handle = Object.freeze({ reservationId: reservationId });
            reservationIds.add(reservationId);
            replayKeys.add(prepared.internalReplayKey);
            prepared.candidate.state = "executing";
            prepared.candidate.reservedAt = reservedAt;
            prepared.plan.state = "active";
            prepared.plan.nextStep += 1;
            executionActive = true;
            reservations.set(handle, prepared);
            reservationsByCandidate.set(prepared.candidate.candidateId, handle);
            return { ok: true, reservation: handle, candidate: snapshot(prepared.candidate), replayKey: prepared.replayKey, actionIndex: prepared.stepIndex, totalSteps: prepared.plan.actionCount };
        }

        function stableAbortCode(errorCode) {
            return typeof errorCode === "string" && stableErrorCodes.has(errorCode)
                ? errorCode
                : protocol.ERROR_CODES.PLAN_FAILED;
        }

        function safeFailureCode(error) {
            var descriptor;
            if (!error || typeof error !== "object") { return protocol.ERROR_CODES.PLAN_FAILED; }
            try {
                descriptor = Object.getOwnPropertyDescriptor(error, "code");
                if (!descriptor || descriptor.get || descriptor.set || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                    return protocol.ERROR_CODES.PLAN_FAILED;
                }
                return stableAbortCode(descriptor.value);
            } catch (ignored) {
                return protocol.ERROR_CODES.PLAN_FAILED;
            }
        }

        function makeTerminalAcknowledgement(candidate, plan, state, errorCode, emergencyAbort) {
            var acknowledgement = {
                candidateId: candidate.candidateId,
                planId: plan.planId,
                state: state,
                emergencyAbort: emergencyAbort === true
            };
            if (errorCode !== undefined) { acknowledgement.errorCode = errorCode; }
            return Object.freeze(acknowledgement);
        }

        function terminalCandidateView(candidate, state, completedAt, resultSnapshot) {
            var view = protocol.cloneJson(candidate, {
                maxBytes: protocol.HARD_LIMITS.maxResponseJsonBytes,
                allowDangerousPaths: ["candidateId"]
            });
            view.state = state;
            view.completedAt = completedAt;
            view.result = resultSnapshot;
            return snapshot(view);
        }

        function commitTerminal(prepared) {
            var candidate = prepared.candidate;
            var plan = prepared.plan;
            candidate.state = prepared.state;
            candidate.completedAt = prepared.completedAt;
            candidate.result = prepared.resultSnapshot;
            plan.state = prepared.planState;
            executionActive = false;
            reservations.delete(prepared.reservation);
            reservationsByCandidate.delete(candidate.candidateId);
            settledReservations.set(prepared.reservation, prepared.acknowledgement);
            return prepared.publicCandidate;
        }

        function abortStep(reservation, errorCode) {
            if (reservation && settledReservations.has(reservation)) {
                return settledReservations.get(reservation);
            }
            if (!reservation || !reservations.has(reservation)) {
                protocol.fail(protocol.ERROR_CODES.RESERVATION_INVALID, "The execution reservation is invalid.");
            }
            var prepared = reservations.get(reservation);
            var candidate = prepared.candidate;
            var plan = prepared.plan;
            var stableCode = stableAbortCode(errorCode);
            var acknowledgement = makeTerminalAcknowledgement(candidate, plan, "failed", stableCode, true);
            candidate.state = "failed";
            candidate.result = { ok: false, errorCode: stableCode, emergencyAbort: true };
            plan.state = "failed";
            executionActive = false;
            reservations.delete(reservation);
            reservationsByCandidate.delete(candidate.candidateId);
            settledReservations.set(reservation, acknowledgement);
            return acknowledgement;
        }

        function completeStep(reservation, result) {
            if (!reservation || !reservations.has(reservation)) { protocol.fail(protocol.ERROR_CODES.RESERVATION_INVALID, "The execution reservation is invalid."); }
            var prepared = reservations.get(reservation);
            var candidate = prepared.candidate;
            var plan = prepared.plan;
            if (candidate.state !== "executing" || !executionActive) { protocol.fail(protocol.ERROR_CODES.CANDIDATE_STATE_INVALID, "The reservation is no longer executing."); }
            if (!protocol.isPlainObject(result) || typeof result.ok !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution result must contain a boolean ok field."); }
            protocol.assertSafeJson(result);
            if (result.summary !== undefined) { protocol.assertJsonBudget(result.summary, { maxBytes: protocol.HARD_LIMITS.maxErrorDetailsJsonBytes }); }
            var completedAt = safeNow();
            var resultSnapshot = result.summary === undefined ? { ok: result.ok } : protocol.cloneJson(result.summary, { maxBytes: protocol.HARD_LIMITS.maxErrorDetailsJsonBytes });
            var terminalState = result.ok ? "consumed" : "failed";
            var terminalPlanState = plan.state === "stale" ? "stale" : (result.ok ? (plan.nextStep >= plan.actionCount ? "consumed" : "confirmed") : "failed");
            var acknowledgement = makeTerminalAcknowledgement(candidate, plan, terminalState, undefined, false);
            var publicCandidate = terminalCandidateView(candidate, terminalState, completedAt, resultSnapshot);
            return commitTerminal({
                reservation: reservation,
                candidate: candidate,
                plan: plan,
                state: terminalState,
                planState: terminalPlanState,
                completedAt: completedAt,
                resultSnapshot: resultSnapshot,
                acknowledgement: acknowledgement,
                publicCandidate: publicCandidate
            });
        }

        function failStep(reservation, error) {
            var code = safeFailureCode(error);
            try { return completeStep(reservation, { ok: false, summary: { errorCode: code } }); }
            catch (failure) {
                if (reservation && (reservations.has(reservation) || settledReservations.has(reservation))) {
                    return abortStep(reservation, code);
                }
                throw failure;
            }
        }

        function issue(input) {
            var plan = createPlan({
                validatedActions: [input && input.action],
                validatorAuthority: input && input.validatorAuthority,
                contextFingerprint: input && input.contextFingerprint,
                settingsFingerprint: input && input.settingsFingerprint,
                permissionSnapshot: input && input.permissionSnapshot
            });
            return getCandidate(plan.candidateIds[0]);
        }

        function confirm(candidateId, supplied) { return confirmCandidate(candidateId, supplied); }
        function reserve(candidateId, supplied, stepIndex) {
            var candidate = requiredCandidate(candidateId);
            return reserveStep(candidate.planId, stepIndex === undefined ? candidate.actionIndex : stepIndex, supplied);
        }
        function complete(candidateId, success, summary) {
            if (typeof success !== "boolean") { protocol.fail(protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution success must be boolean."); }
            var handle = reservationsByCandidate.get(candidateId);
            if (!handle) { protocol.fail(protocol.ERROR_CODES.RESERVATION_INVALID, "The candidate has no active reservation."); }
            var result = { ok: success };
            if (summary !== undefined) { result.summary = summary; }
            return completeStep(handle, result);
        }
        function discard(candidateId, reason) {
            var candidate = requiredCandidate(candidateId);
            return discardPlan(candidate.planId, reason);
        }

        var store = Object.freeze({
            checkStep: checkStep,
            complete: complete,
            completeStep: completeStep,
            abortStep: abortStep,
            confirm: confirm,
            confirmCandidate: confirmCandidate,
            confirmPlan: confirmPlan,
            createPlan: createPlan,
            discard: discard,
            discardPlan: discardPlan,
            failStep: failStep,
            getCandidate: getCandidate,
            getPlanView: getPlanView,
            issue: issue,
            markStale: markStale,
            reserve: reserve,
            reserveStep: reserveStep,
            revisePlan: revisePlan,
            validateBinding: binding
        });
        trustedPlanStores.add(store);
        planStoreProtocols.set(store, protocol);
        return store;
    }

    return {
        createPlanStore: createPlanStore,
        PlanStore: createPlanStore,
        CandidateStore: createPlanStore,
        isTrustedPlanStore: isTrustedPlanStore,
        isTrustedPlanStoreForProtocol: isTrustedPlanStoreForProtocol
    };
}));
