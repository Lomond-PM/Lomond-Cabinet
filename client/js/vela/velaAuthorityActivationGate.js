(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaPlanningContracts, root.VelaDelegationGrantStore, root.VelaAuthorizedPlanAuthorityProducer));
        if (Object.prototype.hasOwnProperty.call(root, "VelaAuthorityActivationGate") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaAuthorityActivationGate", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaPlanningContracts"), require("./velaDelegationGrantStore"), require("./velaAuthorizedPlanAuthorityProducer")));
    }
}(typeof self !== "undefined" ? self : this, function (planning, grantStoreModule, producerModule) {
    "use strict";

    var MODULE_REVISION = "vela-authority-activation-gate-v1";
    var ERROR_CODES = Object.freeze({
        ACTIVATION_GATE_INVALID_OPTIONS: "ACTIVATION_GATE_INVALID_OPTIONS",
        ACTIVATION_PLAN_UNTRUSTED: "ACTIVATION_PLAN_UNTRUSTED",
        ACTIVATION_PLAN_CORRELATION_FAILED: "ACTIVATION_PLAN_CORRELATION_FAILED",
        ACTIVATION_GRANT_UNAVAILABLE: "ACTIVATION_GRANT_UNAVAILABLE",
        ACTIVATION_RESERVATION_FAILED: "ACTIVATION_RESERVATION_FAILED",
        ACTIVATION_ALREADY_PENDING: "ACTIVATION_ALREADY_PENDING",
        ACTIVATION_PLAN_ALREADY_CONSUMED: "ACTIVATION_PLAN_ALREADY_CONSUMED",
        ACTIVATION_HANDLE_UNTRUSTED: "ACTIVATION_HANDLE_UNTRUSTED",
        ACTIVATION_ALREADY_SETTLED: "ACTIVATION_ALREADY_SETTLED",
        ACTIVATION_STALE: "ACTIVATION_STALE",
        ACTIVATION_ID_INVALID: "ACTIVATION_ID_INVALID"
    });
    var trustedGates = new WeakSet();
    var trustedActivations = new WeakMap();
    var trustedPlanActivations = new WeakMap();

    function fail(code) { var error = new Error(code); error.code = code; throw error; }
    function isPlainObject(value) { return Boolean(value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }
    function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

    function createAuthorityActivationGate(options) {
        if (!isPlainObject(options) || Object.keys(options).some(function (key) { return ["producer", "grantStore", "sessionId", "makeActivationId"].indexOf(key) === -1; })) { fail(ERROR_CODES.ACTIVATION_GATE_INVALID_OPTIONS); }
        var producer = options.producer;
        var grantStore = options.grantStore;
        var sessionId = options.sessionId;
        var makeActivationId = options.makeActivationId;
        if (!grantStoreModule.isTrustedDelegationGrantStore(grantStore) || typeof sessionId !== "string" || sessionId.length === 0 || typeof makeActivationId !== "function" || !producerModule.isTrustedAuthorityProducerFor(producer, grantStore, sessionId)) { fail(ERROR_CODES.ACTIVATION_GATE_INVALID_OPTIONS); }

        function liveGrant(identity, plan) {
            var view;
            var grant;
            var step = plan.steps[0];
            if (identity.storeEpoch !== grantStoreModule.getTrustedDelegationGrantStoreEpoch(grantStore)) { fail(ERROR_CODES.ACTIVATION_GRANT_UNAVAILABLE); }
            try { view = grantStore.lookup(identity.grantId); }
            catch (error) { fail(ERROR_CODES.ACTIVATION_GRANT_UNAVAILABLE); }
            grant = view.grant;
            if (view.status !== "active" || grant.grantId !== identity.grantId || grant.capabilityId !== identity.capabilityId || grant.operationKind !== identity.operationKind || grant.taskId !== identity.taskId || !sameJson(grant.targetScope, identity.targetScope)) { fail(ERROR_CODES.ACTIVATION_PLAN_CORRELATION_FAILED); }
            if (view.remainingActions === 0) { fail(ERROR_CODES.ACTIVATION_RESERVATION_FAILED); }
            if (!step || step.candidateId !== identity.candidateId || step.capabilityId !== identity.capabilityId || !sameJson(step.targetScope, identity.targetScope) || !step.policyDecision || step.policyDecision.decision !== "ALLOW" || !step.policyDecision.provenance || step.policyDecision.provenance.grantId !== identity.grantId || step.policyDecision.provenance.candidateId !== identity.candidateId || step.policyDecision.provenance.requestedOperation !== identity.operationKind || !step.grantProvenance || step.grantProvenance.grantId !== identity.grantId || !step.authorityEvidence || step.authorityEvidence.eventKind !== "delegation/granted") { fail(ERROR_CODES.ACTIVATION_PLAN_CORRELATION_FAILED); }
            return view;
        }
        function reserve(plan) {
            var identity;
            var state;
            var view;
            var storeReservation;
            var activationId;
            var activation;
            identity = producerModule.getTrustedAuthorityPlanIdentity(plan, producer, grantStore, sessionId);
            if (!identity || !planning.isAuthorizedPlan(plan)) { fail(ERROR_CODES.ACTIVATION_PLAN_UNTRUSTED); }
            state = trustedPlanActivations.get(plan);
            if (state === "pending") { fail(ERROR_CODES.ACTIVATION_ALREADY_PENDING); }
            if (state === "consumed") { fail(ERROR_CODES.ACTIVATION_PLAN_ALREADY_CONSUMED); }
            view = liveGrant(identity, plan);
            try { storeReservation = grantStore.reserve(identity.grantId); }
            catch (errorReserve) { fail(ERROR_CODES.ACTIVATION_RESERVATION_FAILED); }
            try { activationId = makeActivationId("authorityActivation"); }
            catch (errorId) { try { grantStore.release(storeReservation); } catch (ignored) {} fail(ERROR_CODES.ACTIVATION_ID_INVALID); }
            if (typeof activationId !== "string" || activationId.length === 0 || !/^[A-Za-z0-9_.:-]+$/.test(activationId)) { try { grantStore.release(storeReservation); } catch (ignoredInvalid) {} fail(ERROR_CODES.ACTIVATION_ID_INVALID); }
            activation = planning.deepFreeze({ contractType: "authority-activation-reservation", activationId: activationId, planId: plan.planId, candidateId: identity.candidateId, grantId: identity.grantId, sessionId: sessionId, taskId: identity.taskId });
            trustedActivations.set(activation, { gate: gate, plan: plan, storeReservation: storeReservation, grantGeneration: view.generation, status: "pending" });
            trustedPlanActivations.set(plan, "pending");
            return activation;
        }
        function activationRecord(activation) {
            var record = activation && trustedActivations.get(activation);
            if (!record || record.gate !== gate) { fail(ERROR_CODES.ACTIVATION_HANDLE_UNTRUSTED); }
            if (record.status !== "pending") { fail(record.status === "stale" ? ERROR_CODES.ACTIVATION_STALE : ERROR_CODES.ACTIVATION_ALREADY_SETTLED); }
            return record;
        }
        function assertSettlementLive(record) {
            var identity = producerModule.getTrustedAuthorityPlanIdentity(record.plan, producer, grantStore, sessionId);
            var view;
            if (!identity) { record.status = "stale"; fail(ERROR_CODES.ACTIVATION_STALE); }
            if (identity.storeEpoch !== grantStoreModule.getTrustedDelegationGrantStoreEpoch(grantStore)) { record.status = "stale"; fail(ERROR_CODES.ACTIVATION_STALE); }
            try { view = grantStore.lookup(identity.grantId); }
            catch (error) { record.status = "stale"; fail(ERROR_CODES.ACTIVATION_STALE); }
            if (view.status !== "active" || view.generation !== record.grantGeneration) { record.status = "stale"; fail(ERROR_CODES.ACTIVATION_STALE); }
        }
        function consume(activation) {
            var record = activationRecord(activation);
            assertSettlementLive(record);
            try { grantStore.consume(record.storeReservation); }
            catch (error) { record.status = "stale"; fail(ERROR_CODES.ACTIVATION_STALE); }
            record.status = "consumed";
            trustedPlanActivations.set(record.plan, "consumed");
            return true;
        }
        function assertPending(activation) {
            var record = activationRecord(activation);
            assertSettlementLive(record);
            return true;
        }
        function release(activation) {
            var record = activationRecord(activation);
            assertSettlementLive(record);
            try { grantStore.release(record.storeReservation); }
            catch (error) { record.status = "stale"; fail(ERROR_CODES.ACTIVATION_STALE); }
            record.status = "released";
            trustedPlanActivations.delete(record.plan);
            return true;
        }
        var gate = Object.freeze({ reserve: reserve, assertPending: assertPending, consume: consume, release: release });
        trustedGates.add(gate);
        return gate;
    }

    return Object.freeze({ ERROR_CODES: ERROR_CODES, MODULE_REVISION: MODULE_REVISION, createAuthorityActivationGate: createAuthorityActivationGate, isTrustedAuthorityActivationGate: function (gate) { return Boolean(gate && trustedGates.has(gate)); }, isTrustedActivationReservation: function (activation) { return Boolean(activation && trustedActivations.has(activation)); } });
}));
