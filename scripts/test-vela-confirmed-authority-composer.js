#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const planning = require("../client/js/vela/velaPlanningContracts");
const capabilities = require("../client/js/vela/velaCapabilityContracts");
const compilerModule = require("../client/js/vela/velaCapabilityCompiler");
const grantStoreModule = require("../client/js/vela/velaDelegationGrantStore");
const policyModule = require("../client/js/vela/velaDelegationPolicyEngine");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const contextModule = require("../client/js/vela/velaContext");
const preflightModule = require("../client/js/vela/velaExecutionPreflight");
const materializerModule = require("../client/js/vela/velaAuthorizedPlanMaterializer");
const projectionModule = require("../client/js/vela/velaPlanReviewProjection");
const taskRunModule = require("../client/js/vela/velaTaskRun");
const controllerModule = require("../client/js/vela/velaPlanController");
const composerModule = require("../client/js/vela/velaConfirmedAuthorityComposer");
const runtime = require("./velaNodeRuntime");
const protocol = protocolModule.createProtocol(runtime);
const contextApi = contextModule.createContextApi(protocol);
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
let assertions = 0;
let serial = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
function hostResult(request, snapshot) { return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }
function makeHarness(options) {
    options = options || {};
    const number = ++serial;
    const state = { value: 100, contextCaptures: 0, driftOnConfirm: options.driftOnConfirm === true, executions: 0, runs: 0, generation: 1, claims: 0, cancels: 0, cancelFailure: options.cancelThrows === true };
    const deferred = { claim: [], accept: [], confirm: [], run: [], execution: [] };
    const bridge = bridgeModule.createContextBridge({ protocol, contextApi, invokeHost(source, callback) {
        const request = decode(source);
        if (request.operation === "captureContext") {
            state.contextCaptures += 1;
            const layerIndex = state.driftOnConfirm && state.contextCaptures >= 2 ? 4 : 3;
            callback(hostResult(request, { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 1, projectGeneration: 3, activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 45, layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }] } })); return;
        }
        callback(hostResult(request, { hostInstanceId: HOST, hostReloadEpoch: 1, projectGeneration: 3, sampleTime: 1, tier: 3, targets: request.scope.targets.map(function (target, index) { return { targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: state.value } }; }) }));
    }, runtime: { setTimeout, clearTimeout, timeoutMs: 1000 } });
    const validator = validatorModule.createActionValidator(protocol, { registry: { vela: { id: "vela", actions: { "set-opacity-v1": { id: "set-opacity-v1", executable: true, risk: "write", targetScope: ["layer", "property"], capabilityRevision: "set-opacity-v1", paramsSchema: { type: "object", additionalProperties: false, required: ["opacity"], properties: { opacity: { type: "number", minimum: 0, maximum: 100 } } } } } } } });
    let id = 0;
    function localId(kind) { id += 1; return kind + "_" + String(number * 1000 + id).padStart(32, "0"); }
    const store = planModule.createPlanStore(protocol, { validatorAuthority: validator.authority, candidateIdFactory() { return localId("cand"); }, planIdFactory() { return localId("plan"); }, nonceFactory() { return localId("confirm"); }, reservationIdFactory() { return localId("res"); }, sessionIdFactory() { return localId("session"); }, now() { return ++id; } });
    function executionOutcome() { if (options.executionError) { const failure = new protocol.VelaProtocolError(options.executionError.code || "PLAN_FAILED"); failure.committed = options.executionError.committed; throw failure; } return options.executionResult || { ok: true, committed: true }; }
    const preflight = preflightModule.createExecutionPreflight({ protocol, actionValidator: validator, planStore: store, contextBridge: bridge, getCurrentExecutionBinding() { return { settingsFingerprint: "sha256:" + "a".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: "p1" }, lifecycle: "active", hasVerifier: true }; }, executeValidatedAction() { state.executions += 1; return options.deferExecution ? new Promise(function (resolve, reject) { deferred.execution.push(function () { try { resolve(executionOutcome()); } catch (error) { reject(error); } }); }) : executionOutcome(); } });
    const materializer = materializerModule.createAuthorizedPlanMaterializer({ protocol, planningContracts: planning, capabilityContracts: capabilities, preflight });
    const projection = projectionModule.createPlanReviewProjection({ protocol, planningContracts: planning, capabilityContracts: capabilities });
    const realController = controllerModule.createPlanController({ protocol, materializer, projectionFactory: projection, preflight, planStore: store, taskRunFactory: taskRunModule.createTaskRun, taskRunIdFactory() { return localId("task_run"); }, now() { return ++id; } });
    function maybeDefer(kind, value) { return options["defer" + kind.charAt(0).toUpperCase() + kind.slice(1)] ? new Promise(function (resolve) { deferred[kind].push(function () { resolve(value); }); }) : value; }
    const controller = Object.freeze({ accept(plan, input) { return Promise.resolve(realController.accept(plan, input)).then(function (value) { return maybeDefer("accept", value); }); }, confirm(id) { return Promise.resolve(realController.confirm(id)).then(function (value) { return maybeDefer("confirm", value); }); }, cancel(id, reason) { state.cancels += 1; if (state.cancelFailure) throw Object.assign(new Error("PLAN_FAILED"), { code: "PLAN_FAILED" }); return realController.cancel(id, reason); }, getProgress: realController.getProgress, run() { const args = arguments; state.runs += 1; return options.deferRun ? new Promise(function (resolve, reject) { deferred.run.push(function () { Promise.resolve().then(function () { return realController.run.apply(realController, args); }).then(resolve, reject); }); }) : realController.run.apply(realController, args); } });
    const resolver = compilerModule.createCapabilityViewResolver({ legacyContracts: capabilities });
    let candidateSerial = 0;
    const compiler = compilerModule.createCapabilityCompiler({ resolveCapability: resolver.resolveCapability, makeId() { candidateSerial += 1; return "candidate_" + number + "_" + candidateSerial; } });
    const grantStore = grantStoreModule.createDelegationGrantStore({ now() { return 100; }, idFactory() { return localId("grant"); } });
    const policy = policyModule.createDelegationPolicyEngine({ grantStore, resolveCapability: resolver.resolveCapability, sessionId: "session_1" });
    const claimedReviews = new Set();
    function claimApprovedReview(input) { state.claims += 1; const key = input.reviewId + ":" + input.reviewRevision; function claim() { if (claimedReviews.has(key)) return { claimed: false, code: "LIFECYCLE_BLOCKED" }; claimedReviews.add(key); return { claimed: true }; } return options.deferClaim ? new Promise(function (resolve) { deferred.claim.push(function () { resolve(claim()); }); }) : claim(); }
    const composer = composerModule.createConfirmedAuthorityComposer({ compiler: options.compiler || compiler, policyEngine: options.policy || policy, planController: controller, resolveRegisteredAction: options.resolveRegisteredAction || capabilities.resolveRegisteredAction, makePlanId() { return localId("confirmed_plan"); }, getRuntimeGeneration() { return state.generation; }, claimApprovedReview: options.claimApprovedReview || claimApprovedReview });
    return { state, compiler, policy, grantStore, composer, controller, setCancelFailure(value) { state.cancelFailure = value === true; }, pending(kind) { return deferred[kind].length; }, release(kind) { const next = deferred[kind].shift(); if (!next) return false; next(); return true; } };
}
function approval(h, overrides) {
    overrides = overrides || {};
    const intent = overrides.intent || planning.createCapabilityIntent({ intentId: "intent_" + (++serial), capabilityId: "set-opacity-v1", requestedOperation: "mutate", params: { opacity: overrides.opacity === undefined ? 42 : overrides.opacity } });
    const reviewed = h.compiler.compile(intent);
    const decision = h.policy.evaluate(reviewed, { sessionId: "session_1", taskId: "task_1" });
    const source = overrides.reviewedCandidate || reviewed;
    const action = capabilities.resolveRegisteredAction(source.capabilityId);
    const semantics = Object.freeze({ capabilityId: source.capabilityId, requestedOperation: intent.requestedOperation, operationKind: source.operationKind, kind: source.kind, risk: source.risk, params: source.params, targetScope: source.targetScope, targetProperty: "opacity", requiresConfirmation: source.requiresConfirmation, registeredAction: Object.freeze({ toolId: action.toolId, actionId: action.actionId }), provenance: source.provenance });
    const provenance = decision.provenance || {};
    const policySemantics = Object.freeze({ decision: decision.decision, reasonCode: decision.reasonCode || null, issuedBy: decision.issuedBy || null, rule: provenance.rule || null, capabilityId: provenance.capabilityId || null, requestedOperation: provenance.requestedOperation || null, authoritySource: provenance.authoritySource || null });
    const input = { capabilityIntent: intent, reviewedSemantics: semantics, reviewPolicySemantics: policySemantics, review: { reviewId: overrides.reviewId || "review_1", reviewRevision: 1, objectiveId: "objective_1", taskId: "task_1", taskPlanId: "task_plan_1", taskPlanRevision: 0, stepId: "step_1" }, policyContext: { sessionId: "session_1", taskId: "task_1" } };
    return { intent, reviewed, input };
}
async function run() {
    check(typeof composerModule.createConfirmedAuthorityComposer === "function", "CommonJS production component is available.");
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaConfirmedAuthorityComposer"), "utf8");
    const sandbox = { Object, Error, Promise, WeakMap, JSON, module: { exports: {} }, require() { throw new Error("browser require"); } }; sandbox.self = sandbox; sandbox.window = sandbox; sandbox.VelaPlanningContracts = planning;
    vm.runInNewContext(source, sandbox, { filename: "velaConfirmedAuthorityComposer.js" });
    check(typeof sandbox.VelaConfirmedAuthorityComposer.createConfirmedAuthorityComposer === "function", "CEP UMD registration works.");

    async function settle() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
    async function releaseWhen(harness, kind) { let count; for (count = 0; count < 20; count += 1) { if (harness.release(kind)) return; await settle(); } throw new Error("Deferred " + kind + " stage was not reached."); }
    async function waitPending(harness, kind) { let count; for (count = 0; count < 20; count += 1) { if (harness.pending(kind)) return; await settle(); } throw new Error("Pending " + kind + " stage was not reached."); }
    const happy = makeHarness(); const a = approval(happy);
    const result = await happy.composer.compose(a.input);
    check(Object.isFrozen(a.intent) && result.state === "authority-ready" && result.code === null, "Same frozen intent composes to bounded authority-ready.");
    check(!Object.prototype.hasOwnProperty.call(happy.composer, "createApprovalEvidence"), "Composer exposes no approval issuer or mint API.");
    check(happy.state.claims === 1, "Trusted approval dependency is claimed exactly once after validation.");
    check(happy.state.contextCaptures === 2, "Accept and confirm perform separate fresh context captures.");
    check(happy.state.runs === 0 && happy.state.executions === 0, "Composer never calls run or executeStep/Host seam.");
    check((await happy.composer.compose(a.input)).code === "LIFECYCLE_BLOCKED", "Authority-ready ownership blocks a second composition.");
    check(happy.composer.cancel() === true && happy.state.cancels === 1, "Armed record uses official PlanController cancel cleanup.");
    check((await happy.composer.compose(a.input)).code === "LIFECYCLE_BLOCKED", "Trusted one-shot source blocks the same review from creating a second plan.");

    const executed = makeHarness(); const ex = approval(executed); check((await executed.composer.compose(ex.input)).state === "authority-ready", "E2 execution fixture reaches authority-ready.");
    const executedResult = await executed.composer.executeConfirmed();
    check(executedResult.state === "executed" && executedResult.committed === true && executedResult.code === null && Object.keys(executedResult).sort().join(",") === "code,committed,state", "executeConfirmed returns only bounded committed success truth.");
    check(executed.state.runs === 1 && executed.state.executions === 1, "Composer enters PlanController.run and the Host seam exactly once.");
    check((await executed.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && executed.state.runs === 1 && executed.state.executions === 1, "A terminal execution record cannot run twice.");
    const freshAfterRun = approval(executed, { reviewId: "review_after_run" }); check((await executed.composer.compose(freshAfterRun.input)).state === "authority-ready", "Terminal execution cleanup permits a fresh approval composition."); executed.composer.cancel();

    const concurrent = makeHarness({ deferExecution: true }); const cx = approval(concurrent); await concurrent.composer.compose(cx.input); const firstExecute = concurrent.composer.executeConfirmed(); await waitPending(concurrent, "execution");
    check((await concurrent.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && concurrent.state.runs === 1 && concurrent.state.executions === 1, "Concurrent execute is blocked by Composer runAttempted before PlanController replay guards."); concurrent.release("execution"); check((await firstExecute).committed === true, "The original concurrent execution settles once.");

    const staleExecute = makeHarness({ executionError: Object.assign(new Error("CONTEXT_STALE"), { code: "CONTEXT_STALE", committed: false }) }); const sx = approval(staleExecute); await staleExecute.composer.compose(sx.input); const staleExecutionResult = await staleExecute.composer.executeConfirmed();
    check(staleExecutionResult.state === "blocked" && staleExecutionResult.committed === false && staleExecutionResult.code === "CONTEXT_STALE", "Precommit stale execution preserves committed false."); check((await staleExecute.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && staleExecute.state.executions === 1, "Failed precommit run is spent and cannot retry.");

    const committedUnavailable = makeHarness({ executionError: Object.assign(new Error("VERIFICATION_UNAVAILABLE"), { code: "VERIFICATION_UNAVAILABLE", committed: true }) }); const ux = approval(committedUnavailable); await committedUnavailable.composer.compose(ux.input); const unavailableResult = await committedUnavailable.composer.executeConfirmed();
    check(unavailableResult.committed === true && unavailableResult.code === "VERIFICATION_UNAVAILABLE", "Postcommit result unavailable preserves committed true."); check((await committedUnavailable.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && committedUnavailable.state.executions === 1, "Committed-unavailable execution cannot retry.");

    const unknownCommit = makeHarness({ executionError: Object.assign(new Error("PLAN_FAILED"), { code: "PLAN_FAILED", committed: null }) }); const ux2 = approval(unknownCommit); await unknownCommit.composer.compose(ux2.input); const unknownResult = await unknownCommit.composer.executeConfirmed();
    check(unknownResult.committed === null && unknownResult.code === "PLAN_FAILED", "Unknown post-dispatch truth remains committed null."); check((await unknownCommit.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && unknownCommit.state.executions === 1, "Unknown commit execution cannot retry.");

    const cancelPreRun = makeHarness(); const cp = approval(cancelPreRun); await cancelPreRun.composer.compose(cp.input); check(cancelPreRun.composer.cancel() === true && (await cancelPreRun.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && cancelPreRun.state.executions === 0, "Cancel before execute disarms with no Host seam call.");
    const cancelDuringPreflight = makeHarness(); const cdp = approval(cancelDuringPreflight); await cancelDuringPreflight.composer.compose(cdp.input); const pendingPreflight = cancelDuringPreflight.composer.executeConfirmed(); check(cancelDuringPreflight.composer.cancel() === true && cancelDuringPreflight.state.executions === 0, "Cancel while run is pending before executeStep keeps Host count zero."); const preflightCancelled = await pendingPreflight; check(preflightCancelled.state === "cancelled" && preflightCancelled.committed === false && preflightCancelled.code === "AGENT_DRIVER_CANCELLED" && cancelDuringPreflight.state.executions === 0, "Pre-dispatch cancellation returns bounded committed false and remains spent."); check((await cancelDuringPreflight.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED" && cancelDuringPreflight.state.executions === 0, "Pre-dispatch cancelled authority cannot retry.");
    const cancelAfterDispatch = makeHarness({ deferExecution: true }); const cad = approval(cancelAfterDispatch); await cancelAfterDispatch.composer.compose(cad.input); const pendingDispatch = cancelAfterDispatch.composer.executeConfirmed(); await waitPending(cancelAfterDispatch, "execution"); check(cancelAfterDispatch.composer.cancel() === true && cancelAfterDispatch.state.executions === 1, "Cancel after dispatch does not claim Host rollback."); cancelAfterDispatch.release("execution"); const dispatchedResult = await pendingDispatch; check(dispatchedResult.state === "cancelled" && dispatchedResult.committed === true && cancelAfterDispatch.state.executions === 1, "Late committed Host truth survives lifecycle cancellation without a second dispatch.");
    const cancelAfterUnknown = makeHarness({ deferExecution: true, executionError: Object.assign(new Error("PLAN_FAILED"), { code: "PLAN_FAILED", committed: null }) }); const cau = approval(cancelAfterUnknown); await cancelAfterUnknown.composer.compose(cau.input); const pendingUnknown = cancelAfterUnknown.composer.executeConfirmed(); await waitPending(cancelAfterUnknown, "execution"); check(cancelAfterUnknown.composer.cancel() === true && cancelAfterUnknown.state.executions === 1, "Unknown-outcome fixture cancels only after the Host seam is entered."); cancelAfterUnknown.release("execution"); const unknownCancelled = await pendingUnknown; check(unknownCancelled.state === "cancelled" && unknownCancelled.committed === null && unknownCancelled.code === "AGENT_DRIVER_CANCELLED" && cancelAfterUnknown.state.executions === 1, "Post-dispatch cancellation preserves uncertain commit truth without retry.");
    const disposeDuringRun = makeHarness({ deferExecution: true }); const ddr = approval(disposeDuringRun); await disposeDuringRun.composer.compose(ddr.input); const pendingDispose = disposeDuringRun.composer.executeConfirmed(); await waitPending(disposeDuringRun, "execution"); check(disposeDuringRun.composer.dispose() === true, "Dispose permanently closes an in-flight Composer."); disposeDuringRun.release("execution"); const disposedRun = await pendingDispose; check(disposedRun.state === "cancelled" && disposedRun.committed === true && disposeDuringRun.state.executions === 1, "Dispose preserves late committed truth without duplicate Host execution."); check((await disposeDuringRun.composer.compose(ddr.input)).code === "LIFECYCLE_BLOCKED" && (await disposeDuringRun.composer.executeConfirmed()).code === "LIFECYCLE_BLOCKED", "Disposed Composer cannot compose or execute again.");

    const fresh = makeHarness(); const b = approval(fresh); const next = fresh.compiler.compile(b.intent);
    check(b.reviewed.candidateId !== next.candidateId, "Fresh compile creates a distinct candidate identity.");

    const mismatch = makeHarness(); const m = approval(mismatch); const mismatchedSemantics = Object.freeze(Object.assign({}, m.input.reviewedSemantics, { params: Object.freeze({ opacity: 43 }) }));
    check((await mismatch.composer.compose(Object.assign({}, m.input, { reviewedSemantics: mismatchedSemantics }))).code === "LIFECYCLE_BLOCKED" && mismatch.state.claims === 0, "Semantic mismatch blocks before trusted approval claim.");
    check((await mismatch.composer.compose(m.input)).state === "authority-ready" && mismatch.state.claims === 1, "Failed pre-claim validation leaves upstream approval unspent."); mismatch.composer.cancel();

    const ordered = makeHarness(); const o = approval(ordered); const reversed = {}; Object.keys(o.input.reviewedSemantics).reverse().forEach(function (key) { reversed[key] = o.input.reviewedSemantics[key]; }); Object.freeze(reversed);
    check((await ordered.composer.compose(Object.assign({}, o.input, { reviewedSemantics: reversed }))).state === "authority-ready", "Canonical equivalence ignores object key order."); ordered.composer.cancel();
    const nestedOrdered = makeHarness(); const no = approval(nestedOrdered); const reversedProvenance = {}; Object.keys(no.input.reviewedSemantics.provenance).reverse().forEach(function (key) { reversedProvenance[key] = no.input.reviewedSemantics.provenance[key]; }); Object.freeze(reversedProvenance); const nestedReordered = Object.freeze(Object.assign({}, no.input.reviewedSemantics, { provenance: reversedProvenance }));
    check((await nestedOrdered.composer.compose(Object.assign({}, no.input, { reviewedSemantics: nestedReordered }))).state === "authority-ready", "Canonical equivalence ignores nested object key order."); nestedOrdered.composer.cancel();

    const canonicalHarness = makeHarness(); const canonicalInput = approval(canonicalHarness).input;
    function semanticWith(key, value) { return Object.freeze(Object.assign({}, canonicalInput.reviewedSemantics, { [key]: value })); }
    const nestedMutable = { opacity: 42 };
    const undefinedProperty = Object.freeze({ opacity: 42, missing: undefined });
    const undefinedArray = Object.freeze([42, undefined]);
    const sparseArray = []; sparseArray.length = 1; Object.freeze(sparseArray);
    const accessor = {}; Object.defineProperty(accessor, "opacity", { enumerable: true, configurable: false, get() { return 42; } }); Object.freeze(accessor);
    const symbolObject = { opacity: 42 }; symbolObject[Symbol("hidden")] = true; Object.freeze(symbolObject);
    class SemanticClass { constructor() { this.opacity = 42; } }
    const cycle = {}; cycle.self = cycle; Object.freeze(cycle);
    const invalidReviewed = [
        undefined,
        semanticWith("params", nestedMutable),
        semanticWith("params", undefinedProperty),
        semanticWith("params", undefinedArray),
        semanticWith("params", Object.freeze({ opacity: function () {} })),
        semanticWith("params", Object.freeze({ opacity: Symbol("bad") })),
        semanticWith("params", Object.freeze({ opacity: 1n })),
        semanticWith("params", Object.freeze({ opacity: NaN })),
        semanticWith("params", Object.freeze({ opacity: Infinity })),
        semanticWith("params", Object.freeze({ opacity: -Infinity })),
        semanticWith("params", Object.freeze({ opacity: -0 })),
        semanticWith("params", accessor),
        semanticWith("params", Object.freeze(new SemanticClass())),
        semanticWith("params", Object.freeze(new Date(0))),
        semanticWith("params", Object.freeze(new Map())),
        semanticWith("params", Object.freeze(new Set())),
        semanticWith("params", cycle),
        semanticWith("params", sparseArray),
        semanticWith("params", symbolObject)
    ];
    for (const invalid of invalidReviewed) { const blocked = await canonicalHarness.composer.compose(Object.assign({}, canonicalInput, { reviewedSemantics: invalid })); check(blocked.code === "LIFECYCLE_BLOCKED" && canonicalHarness.state.claims === 0, "Invalid or non-canonical reviewed semantics fail closed before claim."); }
    const freshBase = makeHarness(); const freshApproval = approval(freshBase); const invalidFreshCompiler = { compile() { const candidate = freshBase.compiler.compile(freshApproval.intent); return Object.assign({}, candidate, { params: Object.freeze({ opacity: NaN }) }); } };
    const invalidFresh = makeHarness({ compiler: invalidFreshCompiler });
    check((await invalidFresh.composer.compose(freshApproval.input)).code === "LIFECYCLE_BLOCKED" && invalidFresh.state.claims === 0, "Invalid fresh semantics fail closed before claim.");

    const denied = makeHarness(); const d = approval(denied);
    check((await denied.composer.compose(Object.assign({}, d.input, { policyContext: {} }))).code === "PERMISSION_DENIED" && denied.state.claims === 0, "Fresh DENY fails closed before claim.");
    check((await denied.composer.compose(d.input)).state === "authority-ready", "Pre-claim DENY leaves approval available."); denied.composer.cancel();

    const allowed = makeHarness(); const al = approval(allowed); const grant = allowed.grantStore.issue({ capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer" }, riskCeiling: "write", taskId: "task_1", expiresAt: 200, maxActions: 1, provenance: { source: "local-user", requestId: "req_1", issuedAt: 100 } });
    const before = allowed.grantStore.lookup(grant.grant.grantId);
    check((await allowed.composer.compose(al.input)).code === "LIFECYCLE_BLOCKED" && allowed.state.claims === 0, "Fresh ALLOW is policy-mode drift before claim and never enters delegated path.");
    const after = allowed.grantStore.lookup(grant.grant.grantId);
    check(after.remainingActions === before.remainingActions && after.reservedActions === before.reservedActions, "Policy probe leaves delegation budget unchanged.");

    const stale = makeHarness({ driftOnConfirm: true }); const s = approval(stale);
    const staleResult = await stale.composer.compose(s.input);
    check(staleResult.state === "blocked" && staleResult.code === "CONTEXT_STALE", "Context drift after accept is rejected by confirm Preflight.");
    check(stale.state.runs === 0 && stale.state.executions === 0, "Confirm failure neither arms execution nor reaches Host.");
    check((await stale.composer.compose(s.input)).code === "LIFECYCLE_BLOCKED", "Claimed approval is not restored after confirm failure.");

    const flight = makeHarness({ deferClaim: true }); const f = approval(flight); const flightPromise = flight.composer.compose(f.input); await settle();
    check((await flight.composer.compose(Object.assign({}, f.input, { review: Object.assign({}, f.input.review, { reviewId: "review_2" }) }))).code === "LIFECYCLE_BLOCKED", "Composing state is single-flight.");
    check(flight.composer.cancel() === true, "Pre-claim cancel invalidates the active generation."); await releaseWhen(flight, "claim"); check((await flightPromise).state === "cancelled", "Late claim settlement cannot continue composition.");

    const accepting = makeHarness({ deferAccept: true }); const ac = approval(accepting); const acceptPromise = accepting.composer.compose(ac.input); await waitPending(accepting, "accept");
    check(accepting.composer.cancel() === false, "Accept-pending cancel does not claim terminalization before an execution identity exists."); accepting.release("accept"); check((await acceptPromise).state === "cancelled" && accepting.state.cancels === 1, "Late accept settlement is officially cancelled and never confirmed.");

    const confirming = makeHarness({ deferConfirm: true }); const co = approval(confirming); const confirmPromise = confirming.composer.compose(co.input); await waitPending(confirming, "confirm");
    check(confirming.composer.cancel() === true && confirming.state.cancels === 1, "Cancel while confirm is pending uses official cancellation."); confirming.release("confirm"); check((await confirmPromise).state === "cancelled" && confirming.state.cancels >= 1, "Late confirm settlement cannot revive authority-ready.");

    const disposing = makeHarness({ deferAccept: true }); const di = approval(disposing); const disposePromise = disposing.composer.compose(di.input); await waitPending(disposing, "accept");
    check(disposing.composer.dispose() === true && disposing.composer.dispose() === false, "Dispose is idempotent while composition is pending."); disposing.release("accept"); check((await disposePromise).state === "cancelled", "Late settlement after dispose fails closed."); check((await disposing.composer.compose(di.input)).code === "LIFECYCLE_BLOCKED", "Disposed composer rejects new composition.");

    const armedDispose = makeHarness(); const ad = approval(armedDispose); check((await armedDispose.composer.compose(ad.input)).state === "authority-ready", "Armed dispose fixture reaches authority-ready."); check(armedDispose.composer.dispose() === true && armedDispose.state.cancels === 1, "Dispose terminalizes the private armed TaskRun through PlanController.");

    const lateCancelFailure = makeHarness({ deferAccept: true, cancelThrows: true }); const lf = approval(lateCancelFailure); const lateFailurePromise = lateCancelFailure.composer.compose(lf.input); await waitPending(lateCancelFailure, "accept");
    check(lateCancelFailure.composer.cancel() === false, "Accept-pending cancellation remains unconfirmed without an execution identity."); lateCancelFailure.release("accept"); check((await lateFailurePromise).state === "cancelled" && lateCancelFailure.state.cancels === 1, "Late accept attempts official cancellation even when it fails.");
    check((await lateCancelFailure.composer.compose(Object.assign({}, lf.input, { review: Object.assign({}, lf.input.review, { reviewId: "review_new" }) }))).code === "LIFECYCLE_BLOCKED", "Failed late cancellation retains ownership and blocks new composition.");
    lateCancelFailure.setCancelFailure(false); check(lateCancelFailure.composer.cancel() === true, "A later successful official cancellation releases retained ownership.");

    const readyCancelFailure = makeHarness({ cancelThrows: true }); const rf = approval(readyCancelFailure); check((await readyCancelFailure.composer.compose(rf.input)).state === "authority-ready", "Cancellation-failure fixture reaches authority-ready.");
    check(readyCancelFailure.composer.cancel() === false, "Authority-ready cancellation failure is reported as unconfirmed."); check((await readyCancelFailure.composer.compose(Object.assign({}, rf.input, { review: Object.assign({}, rf.input.review, { reviewId: "review_other" }) }))).code === "LIFECYCLE_BLOCKED", "Authority-ready cancellation failure retains active ownership.");
    readyCancelFailure.setCancelFailure(false); check(readyCancelFailure.composer.cancel() === true, "Cancellation retry releases authority-ready ownership only after terminalization succeeds.");

    const disposeCancelFailure = makeHarness({ cancelThrows: true }); const df = approval(disposeCancelFailure); check((await disposeCancelFailure.composer.compose(df.input)).state === "authority-ready", "Dispose-failure fixture reaches authority-ready.");
    check(disposeCancelFailure.composer.dispose() === true && disposeCancelFailure.state.cancels === 1, "Dispose enters terminal component lifecycle even when underlying cancellation fails."); check((await disposeCancelFailure.composer.compose(df.input)).code === "LIFECYCLE_BLOCKED", "Disposed component remains fail closed after cancellation failure.");

    const runtimeSource = fs.readFileSync(require.resolve("../client/js/vela/velaRuntime"), "utf8");
    const driverSource = fs.readFileSync(require.resolve("../client/js/vela/velaAgentDriver"), "utf8");
    check(/createConfirmedAuthorityComposer/.test(runtimeSource) && /confirmedAuthorityComposer\.compose\s*\(/.test(runtimeSource) && /confirmedAuthorityComposer\.executeConfirmed\s*\(/.test(runtimeSource) && !/ConfirmedAuthorityComposer|confirmedAuthorityComposer/.test(driverSource), "Runtime privately attaches production compose and execute while Driver remains isolated from Composer ownership.");
    check(/planController\.run\(record\.executionPlanId\)/.test(source) && !/executeStep/.test(source) && !/materializeDelegated|AuthorizedPlanAuthorityProducer|AtomicActivationCoordinator/.test(source), "Composer uses only PlanController.run and introduces no second execution or delegation path.");
    console.log("PASS Vela Confirmed Authority Composer E2: " + assertions + " assertions.");
}
run().catch(function (error) { console.error(error && error.stack || error); process.exitCode = 1; });
