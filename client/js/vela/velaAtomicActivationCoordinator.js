(function (root, factory) {
    "use strict";
    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaSessionRuntime, root.VelaAuthorityEvidenceResolver, root.VelaAuthorityActivationGate, root.VelaTaskRun));
        if (Object.prototype.hasOwnProperty.call(root, "VelaAtomicActivationCoordinator") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaAtomicActivationCoordinator", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaSessionRuntime"), require("./velaAuthorityEvidenceResolver"), require("./velaAuthorityActivationGate"), require("./velaTaskRun")));
    }
}(typeof self !== "undefined" ? self : this, function (sessionModule, evidenceModule, gateModule, taskRunModule) {
    "use strict";
    var MODULE_REVISION = "vela-atomic-activation-coordinator-v1";
    var ERROR_CODES = Object.freeze({
        ATOMIC_ACTIVATION_INVALID_OPTIONS: "ATOMIC_ACTIVATION_INVALID_OPTIONS",
        ATOMIC_ACTIVATION_FAILED: "ATOMIC_ACTIVATION_FAILED",
        ATOMIC_ACTIVATION_DEGRADED_PROVENANCE: "ATOMIC_ACTIVATION_DEGRADED_PROVENANCE",
        ATOMIC_ACTIVATED_TASK_UNTRUSTED: "ATOMIC_ACTIVATED_TASK_UNTRUSTED",
        ATOMIC_ACTIVATED_TASK_SETTLED: "ATOMIC_ACTIVATED_TASK_SETTLED"
    });
    var trustedCoordinators = new WeakSet();
    var trustedActivatedTasks = new WeakMap();
    function error(code) { var value = new Error(code); value.code = code; return value; }
    function fail(code) { throw error(code); }

    function createAtomicActivationCoordinator(options) {
        var protocol = options && options.protocol;
        var gate = options && options.activationGate;
        var materializer = options && options.delegatedMaterializer;
        var preflight = options && options.preflight;
        var session = options && options.session;
        var appender = options && options.authorityAppender;
        var resolver = options && options.evidenceResolver;
        var taskRunIdFactory = options && options.taskRunIdFactory;
        var now = options && options.now;
        if (!protocol || !protocol.isPlainObject(options) || !gateModule.isTrustedAuthorityActivationGate(gate) || !materializer || typeof materializer.materializeDelegated !== "function" || !preflight || typeof preflight.createDelegatedActivationPort !== "function" || typeof preflight.activateDelegatedBoundPlan !== "function" || typeof preflight.createExecutionCommitPort !== "function" || typeof preflight.executeStep !== "function" || typeof preflight.discardBoundPlan !== "function" || !sessionModule.isTrustedSessionLog(session) || !sessionModule.isTrustedAuthorityEventAppenderForSession(appender, session) || !evidenceModule.isTrustedAuthorityEvidenceResolver(resolver) || resolver.getSessionId() !== session.getSessionId() || typeof taskRunIdFactory !== "function" || typeof now !== "function") { fail(ERROR_CODES.ATOMIC_ACTIVATION_INVALID_OPTIONS); }

        function cleanup(record, reason) {
            if (record.taskRun) { try { var state = record.taskRun.snapshot().state; if (state === "active" || state === "waiting-approval") { record.taskRun.cancel(reason); } } catch (ignoredTask) {} }
            if (record.executionPlanId) { try { preflight.discardBoundPlan({ planId: record.executionPlanId, reason: reason }); } catch (ignoredPlan) {} }
            if (record.activation && !record.committed) { try { gate.release(record.activation); } catch (ignoredAuthority) {} }
            record.settled = true;
        }

        function activate(authorizedPlan, executionInput) {
            var record = { activation: null, taskRun: null, executionPlanId: null, committed: false, settled: false };
            return Promise.resolve().then(function () {
                record.activation = gate.reserve(authorizedPlan);
                return materializer.materializeDelegated(authorizedPlan, executionInput);
            }).then(function (materialized) {
                if (!materialized || materialized.actionCount !== 1) { fail(ERROR_CODES.ATOMIC_ACTIVATION_FAILED); }
                record.executionPlanId = materialized.executionPlanId;
                var activationPort = preflight.createDelegatedActivationPort({ planId: materialized.executionPlanId, activationId: record.activation.activationId });
                return Promise.resolve(preflight.activateDelegatedBoundPlan({ planId: materialized.executionPlanId, activationPort: activationPort })).then(function () { return materialized; });
            }).then(function (materialized) {
                var taskRunId = taskRunIdFactory("taskRun");
                record.taskRun = taskRunModule.createTaskRun({ protocol: protocol, taskRunId: taskRunId, authorizedPlanId: authorizedPlan.planId, executionPlanId: materialized.executionPlanId, now: now });
                record.taskRun.arm();
                var event = appender.append({ kind: "task/execution-armed", requestId: record.activation.activationId, payload: { taskRunId: taskRunId, planId: authorizedPlan.planId, executionPlanId: materialized.executionPlanId, activationId: record.activation.activationId, taskId: record.activation.taskId } });
                var evidence;
                try { evidence = resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: event.seq, eventKind: event.kind, requestId: event.requestId }); resolver.verifyEvidenceReference(evidence, { eventKind: "task/execution-armed", requestId: event.requestId }); }
                catch (evidenceError) { cleanup(record, "armed-evidence-failed"); throw error(ERROR_CODES.ATOMIC_ACTIVATION_DEGRADED_PROVENANCE); }
                var handle = Object.freeze({ contractType: "activated-task", activationId: record.activation.activationId, planId: authorizedPlan.planId, executionPlanId: materialized.executionPlanId, taskRunId: taskRunId, taskId: record.activation.taskId, armedEvidenceSeq: evidence.seq });
                record.handle = handle;
                trustedActivatedTasks.set(handle, { coordinator: coordinator, record: record });
                return handle;
            }).catch(function (activationError) {
                if (!record.settled) { cleanup(record, "activation-failed"); }
                throw activationError && activationError.code ? activationError : error(ERROR_CODES.ATOMIC_ACTIVATION_FAILED);
            });
        }

        function owned(handle) {
            var identity = handle && trustedActivatedTasks.get(handle);
            if (!identity || identity.coordinator !== coordinator) { fail(ERROR_CODES.ATOMIC_ACTIVATED_TASK_UNTRUSTED); }
            if (identity.record.settled) { fail(ERROR_CODES.ATOMIC_ACTIVATED_TASK_SETTLED); }
            return identity.record;
        }
        function run(handle) {
            var record = owned(handle);
            try { gate.assertPending(record.activation); }
            catch (authorityError) { cleanup(record, "authority-stale-before-run"); return Promise.reject(authorityError); }
            var commitPort = preflight.createExecutionCommitPort({ planId: record.executionPlanId, stepIndex: 0, commit: function () { gate.assertPending(record.activation); gate.consume(record.activation); record.committed = true; } });
            return Promise.resolve(preflight.executeStep({ planId: record.executionPlanId, stepIndex: 0, commitPort: commitPort })).then(function (result) {
                record.taskRun.complete(); record.settled = true; return result;
            }, function (runError) {
                if (record.taskRun.snapshot().state === "active") { try { record.taskRun.block(runError && runError.code ? runError.code : "PLAN_FAILED"); } catch (ignoredBlock) {} }
                if (!record.committed) { try { gate.release(record.activation); } catch (ignoredRelease) {} }
                record.settled = true;
                throw runError;
            });
        }
        function cancel(handle) {
            var record = owned(handle);
            cleanup(record, "cancelled-before-run");
            return true;
        }
        var coordinator = Object.freeze({ activate: activate, run: run, cancel: cancel });
        trustedCoordinators.add(coordinator);
        return coordinator;
    }
    return Object.freeze({ ERROR_CODES: ERROR_CODES, MODULE_REVISION: MODULE_REVISION, createAtomicActivationCoordinator: createAtomicActivationCoordinator, isTrustedAtomicActivationCoordinator: function (value) { return Boolean(value && trustedCoordinators.has(value)); }, isTrustedActivatedTask: function (value) { return Boolean(value && trustedActivatedTasks.has(value)); } });
}));
