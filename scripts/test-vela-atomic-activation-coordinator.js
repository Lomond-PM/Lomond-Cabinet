#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const planning = require("../client/js/vela/velaPlanningContracts");
const sessionModule = require("../client/js/vela/velaSessionRuntime");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const storeModule = require("../client/js/vela/velaDelegationGrantStore");
const policyModule = require("../client/js/vela/velaDelegationPolicyEngine");
const evidenceModule = require("../client/js/vela/velaAuthorityEvidenceResolver");
const delegationModule = require("../client/js/vela/velaDelegationAuthorityCoordinator");
const producerModule = require("../client/js/vela/velaAuthorizedPlanAuthorityProducer");
const gateModule = require("../client/js/vela/velaAuthorityActivationGate");
const materializerModule = require("../client/js/vela/velaAuthorizedPlanMaterializer");
const atomicModule = require("../client/js/vela/velaAtomicActivationCoordinator");
const runtime = require("./velaNodeRuntime");
const protocol = protocolModule.createProtocol(runtime);
let assertions = 0; let serial = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) { const promise = typeof value === "function" ? Promise.resolve().then(value) : Promise.resolve(value); await assert.rejects(promise, error => error && error.code === code, message); assertions += 1; }

const capabilityResolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilities });
const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: capabilityResolver.resolveCapability, makeId() { return "candidate_" + (++serial); } });
function makeCandidate(value) { return compiler.compile(planning.createCapabilityIntent({ intentId: "intent_" + (++serial), capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: value || 50 } })); }

function harness(options) {
    options = options || {}; let now = 100; let hostCalls = 0; const order = []; let discarded = 0;
    const session = sessionModule.createSessionLog({ sessionId: "session_" + (++serial) });
    const appender = sessionModule.createAuthorityEventAppender(session);
    const resolver = evidenceModule.createAuthorityEvidenceResolver({ session });
    const store = storeModule.createDelegationGrantStore({ now() { return now; }, idFactory() { return "grant_" + (++serial); } });
    const policy = policyModule.createDelegationPolicyEngine({ grantStore: store, resolveCapability: capabilityResolver.resolveCapability, sessionId: session.getSessionId() });
    const producer = producerModule.createAuthorizedPlanAuthorityProducer({ policyEngine: policy, grantStore: store, evidenceResolver: resolver, makePlanId() { return "plan_" + (++serial); } });
    const delegation = delegationModule.createDelegationAuthorityCoordinator({ grantStore: store, session, authorityAppender: appender, evidenceResolver: resolver, issuerId: "local-user" });
    const permission = appender.append({ kind: "permission/decided", requestId: "req_" + serial, payload: { decision: "approved", issuedBy: "local-user", taskId: "task_1" } });
    const permissionEvidence = resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: permission.seq, eventKind: permission.kind, requestId: permission.requestId });
    const issued = delegation.issueGrant({ spec: { capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId: "task_1", expiresAt: 200, maxActions: 1, provenance: { source: "local-user", requestId: permission.requestId, issuedAt: 100 } }, permissionEvidence });
    const plan = producer.produce({ candidate: makeCandidate(options.opacity), context: { sessionId: session.getSessionId(), taskId: "task_1" }, delegationGrantedEvidence: issued.evidence });
    const gate = gateModule.createAuthorityActivationGate({ producer, grantStore: store, sessionId: session.getSessionId(), makeActivationId() { return "activation_" + (++serial); } });
    const activationPorts = new WeakMap(); const commitPorts = new WeakMap();
    const preflight = {
        createBoundPlan() { order.push("materialize"); if (options.materializeFail) return Promise.reject(Object.assign(new Error("materialize"), { code: "PLAN_INVALID" })); return Promise.resolve({ planId: "execution_" + serial, planRevision: 0, actionCount: options.actionCount || 1, review: { valueKind: "number", beforeValue: 100 } }); },
        createDelegatedActivationPort(input) { const port = Object.freeze({}); activationPorts.set(port, input); return port; },
        activateDelegatedBoundPlan(input) { order.push("bound-activate"); if (!activationPorts.has(input.activationPort) || options.boundFail) return Promise.reject(Object.assign(new Error("bound"), { code: "CONTEXT_STALE" })); return Promise.resolve(true); },
        createExecutionCommitPort(input) { const port = Object.freeze({}); commitPorts.set(port, input); return port; },
        executeStep(input) { order.push("jit"); if (options.guardFail) return Promise.reject(Object.assign(new Error("guard"), { code: "CONTEXT_STALE" })); order.push("plan-reserve"); const commit = commitPorts.get(input.commitPort); commit.commit({}); order.push("authority-consumed"); hostCalls += 1; order.push("host"); if (options.hostFail) return Promise.reject(Object.assign(new Error("host"), { code: "PLAN_FAILED" })); return Promise.resolve({ ok: true }); },
        discardBoundPlan() { discarded += 1; return true; }
    };
    const materializer = materializerModule.createAuthorizedPlanMaterializer({ protocol, planningContracts: planning, capabilityContracts: capabilities, preflight, authorityProducerModule: producerModule, authorityProducer: producer, authorityGrantStore: store, authoritySessionId: session.getSessionId() });
    const coordinator = atomicModule.createAtomicActivationCoordinator({ protocol, activationGate: gate, delegatedMaterializer: materializer, preflight, session, authorityAppender: appender, evidenceResolver: resolver, taskRunIdFactory() { return "task_run_" + (++serial); }, now() { return ++now; } });
    return { session, store, gate, delegation, issued, plan, coordinator, order, getHostCalls() { return hostCalls; }, getDiscarded() { return discarded; }, setNow(value) { now = value; } };
}

async function run() {
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaAtomicActivationCoordinator"), "utf8");
    const sandbox = { Object, Error, Promise, WeakMap, WeakSet }; sandbox.self = sandbox; sandbox.window = sandbox;
    sandbox.VelaSessionRuntime = sessionModule; sandbox.VelaAuthorityEvidenceResolver = evidenceModule; sandbox.VelaAuthorityActivationGate = gateModule; sandbox.VelaTaskRun = require("../client/js/vela/velaTaskRun");
    vm.runInNewContext(source, sandbox, { filename: "velaAtomicActivationCoordinator.js" });
    check(typeof sandbox.VelaAtomicActivationCoordinator.createAtomicActivationCoordinator === "function", "CEP-like UMD coordinator registration works.");

    const h = harness(); const beforeEvents = h.session.getEvents().length;
    const activated = await h.coordinator.activate(h.plan, { selectionOrderMeaningful: true });
    check(atomicModule.isTrustedActivatedTask(activated), "Dormant activation returns privately branded ActivatedTask.");
    check(h.session.getEvents().length === beforeEvents + 1 && h.session.getEvents().slice(-1)[0].kind === "task/execution-armed", "Armed evidence is appended only after successful arm.");
    await expectCode(() => h.coordinator.run(Object.assign({}, activated)), atomicModule.ERROR_CODES.ATOMIC_ACTIVATED_TASK_UNTRUSTED, "Copied ActivatedTask cannot run.");
    await h.coordinator.run(activated);
    check(h.order.join(",") === "materialize,bound-activate,jit,plan-reserve,authority-consumed,host", "Commit ordering is PlanStore reserve, authority consume, then Host.");
    check(h.getHostCalls() === 1 && h.store.lookup(h.issued.grant.grant.grantId).consumedActions === 1, "Success calls Host once and consumes authority exactly once.");
    await expectCode(() => h.coordinator.run(activated), atomicModule.ERROR_CODES.ATOMIC_ACTIVATED_TASK_SETTLED, "Double run is rejected.");

    const cancelled = harness(); const cancelledTask = await cancelled.coordinator.activate(cancelled.plan, { selectionOrderMeaningful: true }); cancelled.coordinator.cancel(cancelledTask);
    check(cancelled.store.lookup(cancelled.issued.grant.grant.grantId).remainingActions === 1 && cancelled.getDiscarded() === 1, "Precommit cancel discards and releases authority budget.");

    const revoked = harness(); const revokedTask = await revoked.coordinator.activate(revoked.plan, { selectionOrderMeaningful: true }); revoked.delegation.revokeGrant({ grantId: revoked.issued.grant.grant.grantId, taskId: "task_1", requestId: "req_revoked" });
    await expectCode(revoked.coordinator.run(revokedTask), gateModule.ERROR_CODES.ACTIVATION_STALE, "Revoke after arm prevents run.");
    check(revoked.getHostCalls() === 0, "Stale authority never reaches Host.");

    const guard = harness({ guardFail: true }); const guardTask = await guard.coordinator.activate(guard.plan, { selectionOrderMeaningful: true }); await expectCode(guard.coordinator.run(guardTask), "CONTEXT_STALE", "JIT/Guard precommit failure propagates.");
    check(guard.getHostCalls() === 0 && guard.store.lookup(guard.issued.grant.grant.grantId).remainingActions === 1, "Precommit failure releases budget and calls no Host.");

    const host = harness({ hostFail: true }); const hostTask = await host.coordinator.activate(host.plan, { selectionOrderMeaningful: true }); await expectCode(host.coordinator.run(hostTask), "PLAN_FAILED", "Postcommit Host failure propagates.");
    check(host.getHostCalls() === 1 && host.store.lookup(host.issued.grant.grant.grantId).consumedActions === 1, "Postcommit Host failure never refunds budget.");

    const materialize = harness({ materializeFail: true }); await expectCode(materialize.coordinator.activate(materialize.plan, { selectionOrderMeaningful: true }), "PLAN_INVALID", "Materialization failure fails activation.");
    check(materialize.store.lookup(materialize.issued.grant.grant.grantId).remainingActions === 1, "Materialization failure releases reservation.");
    const multi = harness({ actionCount: 2 }); await expectCode(multi.coordinator.activate(multi.plan, { selectionOrderMeaningful: true }), "PLAN_INVALID", "Multi-action materialization fails closed.");
    check(multi.store.lookup(multi.issued.grant.grant.grantId).remainingActions === 1, "Multi-action rejection releases reservation.");
    console.log("PASS Vela AtomicActivationCoordinator: " + assertions + " assertions.");
}
run();
