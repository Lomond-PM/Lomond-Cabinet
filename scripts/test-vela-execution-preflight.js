#!/usr/bin/env node
"use strict";

const assert = require("assert");
const protocolModule = require("../client/js/vela/velaProtocol");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const preflightModule = require("../client/js/vela/velaExecutionPreflight");
const contextModule = require("../client/js/vela/velaContext");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const contextApi = contextModule.createContextApi(protocol);
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
const PATH = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
let assertions = 0;
let harnessCount = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function localId(kind, number) { return kind + "_" + String(number).padStart(32, "0"); }

function makeScheduler() {
    let next = 0;
    const jobs = new Map();
    return {
        setTimeout(callback) { const id = ++next; jobs.set(id, callback); return id; },
        clearTimeout(id) { jobs.delete(id); },
        fireAll() { Array.from(jobs.keys()).forEach((id) => { const callback = jobs.get(id); jobs.delete(id); callback(); }); }
    };
}

function decode(source) {
    const prefix = "AEToolbox.VelaContext.handle(";
    check(source.startsWith(prefix) && source.endsWith(")"), "Bridge must use the fixed Host facade.");
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}

function success(request, snapshot) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot });
}

function hostError(request, code) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error: { code, message: "local test error" } });
}

function bindingSnapshot(state) {
    const first = { nativeLayerId: 45, layerIndex: state.layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" };
    const items = [first];
    if (state.selectionExtra) items.push({ nativeLayerId: 46, layerIndex: 4, selectedOrder: 1, matchName: "ADBE AV Layer", type: "av" });
    return {
        hostInstanceId: state.hostInstanceId,
        hostReloadEpoch: state.hostReloadEpoch,
        tier: 1,
        projectGeneration: state.projectGeneration,
        activeComp: { itemId: 12, projectGeneration: state.projectGeneration, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
        selection: { count: items.length, identityQuality: "native-layer-id", items }
    };
}

function valueSnapshot(request, state) {
    return {
        hostInstanceId: state.hostInstanceId,
        hostReloadEpoch: state.hostReloadEpoch,
        projectGeneration: state.projectGeneration,
        sampleTime: state.sampleTime,
        tier: 3,
        targets: request.scope.targets.map((target) => ({
            targetOrdinal: target.targetOrdinal,
            nativeLayerId: target.nativeLayerId,
            layerIndex: target.layerIndex,
            propertyPath: state.responsePath || target.propertyPath,
            propertyMatchName: state.responseMatchName || target.propertyPath[target.propertyPath.length - 2],
            value: { kind: "number", data: state.value }
        }))
    };
}

function capabilities() {
    return { registry: { local: { id: "local", actions: { mutate: { id: "mutate", executable: true, risk: "write", targetScope: ["property"], capabilityRevision: "v1", paramsSchema: { type: "object", additionalProperties: false, properties: {} } } } } } };
}

function proposal(fingerprint, digest, overrides) {
    return Object.assign({
        providerActionId: "provider-action",
        kind: "tool",
        title: "Set bounded property",
        rationale: "A test action.",
        risk: "write",
        target: { contextFingerprint: fingerprint, contextTier: 3, layerId: "ae-project-3-item-12-layer-45", propertyPath: PATH, propertyMatchName: "ADBE Opacity", propertyValueDigest: digest },
        payload: { toolId: "local", actionId: "mutate", params: {} },
        undoGroupLabel: "Vela test",
        requiresConfirmation: true
    }, overrides || {});
}

function makeHarness() {
    const harnessId = ++harnessCount;
    const state = { hostInstanceId: HOST, hostReloadEpoch: 1, projectGeneration: 3, layerIndex: 3, selectionExtra: false, value: 50, sampleTime: 1, errorCode: null, targetMissing: false, responsePath: null, responseMatchName: null, deferred: false, clockThrowAfter: null };
    const scheduler = makeScheduler();
    const calls = [];
    const callbacks = [];
    const events = [];
    const bridge = bridgeModule.createContextBridge({
        protocol,
        contextApi,
        invokeHost(source, callback) {
            const request = decode(source);
            calls.push(request);
            callbacks.push(callback);
            events.push(request.operation === "captureContext" ? "tier1" : "tier3");
            if (state.deferred) return;
            if (request.operation === "captureContext") callback(success(request, bindingSnapshot(state)));
            else if (state.targetMissing) callback(hostError(request, "HOST_CONTEXT_TARGET_NOT_FOUND"));
            else if (state.errorCode) callback(hostError(request, state.errorCode));
            else callback(success(request, valueSnapshot(request, state)));
        },
        runtime: { setTimeout: scheduler.setTimeout, clearTimeout: scheduler.clearTimeout, timeoutMs: 10 }
    });
    const validator = validatorModule.createActionValidator(protocol, capabilities());
    let counter = 0;
    const store = planModule.createPlanStore(protocol, {
        validatorAuthority: validator.authority,
        candidateIdFactory: () => localId("cand", harnessId * 1000 + (++counter)),
        planIdFactory: () => localId("plan", harnessId * 1000 + (++counter)),
        nonceFactory: () => localId("confirm", harnessId * 1000 + (++counter)),
        reservationIdFactory: () => localId("res", harnessId * 1000 + (++counter)),
        sessionIdFactory: () => localId("session", harnessId * 1000 + (++counter)),
        now: () => { if (state.clockThrowAfter === 0) throw new Error("clock unavailable"); if (Number.isInteger(state.clockThrowAfter) && state.clockThrowAfter > 0) state.clockThrowAfter -= 1; return 1; }
    });
    let settingsFingerprint = "sha256:" + "a".repeat(64);
    let permissionSnapshot = { mode: "confirm-every-action", grants: ["layer.write"], policyRevision: "p1" };
    let executorCalls = 0;
    let executorMode = "success";
    let currentCalls = 0;
    const preflight = preflightModule.createExecutionPreflight({
        protocol,
        actionValidator: validator,
        planStore: store,
        contextBridge: bridge,
        getCurrentExecutionBinding() {
            currentCalls += 1;
            events.push("current");
            return { settingsFingerprint, permissionSnapshot, lifecycle: "active", hasVerifier: state.hasVerifier !== false };
        },
        executeValidatedAction(action, metadata) {
            executorCalls += 1;
            events.push("executor");
            check(Object.isFrozen(action) && Object.isFrozen(metadata) && !Object.prototype.hasOwnProperty.call(metadata, "reservation"), "Executor receives only frozen action and bounded metadata.");
            if (executorMode === "throw") throw new Error("executor failure");
            if (executorMode === "reject") return Promise.reject(new Error("executor rejection"));
            if (executorMode === "committed-result-unavailable") return Promise.reject(new protocol.VelaProtocolError(protocol.ERROR_CODES.PLAN_FAILED));
            if (executorMode === "failed-result") return { ok: false, summary: { reason: "fake" } };
            if (executorMode === "invalid-result") return { ok: true, summary: { source: "unsafe" } };
            if (executorMode === "accessor-result") { const value = { ok: true }; Object.defineProperty(value, "summary", { enumerable: true, get() { throw new Error("accessor"); } }); return value; }
            if (executorMode === "resolve-twice") return { then(resolve) { resolve({ ok: true, summary: { executed: true } }); resolve({ ok: false }); } };
            if (executorMode === "resolve-then-reject") return { then(resolve, reject) { resolve({ ok: true, summary: { executed: true } }); reject(new Error("late")); } };
            if (executorMode === "reject-then-resolve") return { then(resolve, reject) { reject(new Error("first")); resolve({ ok: true }); } };
            return { ok: true, summary: { executed: true } };
        }
    });
    return {
        state, scheduler, calls, callbacks, events, bridge, validator, store, preflight,
        valueDigest(value) { return contextApi.describePropertyValue("number", value).valueDigest; },
        get executorCalls() { return executorCalls; }, get currentCalls() { return currentCalls; },
        set settings(value) { settingsFingerprint = value; }, set permission(value) { permissionSnapshot = value; }, set executorMode(value) { executorMode = value; }
    };
}

async function seedAndCreate(harness, overrides) {
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    return harness.preflight.createBoundPlan({ proposal: proposal(binding.fingerprint, harness.valueDigest(harness.state.value), overrides), selectionOrderMeaningful: true });
}

async function confirm(harness, plan) {
    return harness.preflight.confirmBoundPlan({ planId: plan.planId });
}

async function run() {
    const dependencyHarness = makeHarness();
    check(validatorModule.isTrustedActionValidator(dependencyHarness.validator) && validatorModule.isTrustedActionValidatorForProtocol(dependencyHarness.validator, protocol), "Original validator instances must carry module-private trusted identity.");
    check(bridgeModule.isTrustedContextBridge(dependencyHarness.bridge) && bridgeModule.isTrustedContextBridgeForProtocol(dependencyHarness.bridge, protocol), "Original bridge instances must carry module-private trusted identity.");
    const fakeValidatorOptions = { protocol, actionValidator: { authority: dependencyHarness.validator.authority, validateActionProposal: dependencyHarness.validator.validateActionProposal }, planStore: dependencyHarness.store, contextBridge: dependencyHarness.bridge, getCurrentExecutionBinding() {}, executeValidatedAction() {} };
    assert.throws(() => preflightModule.createExecutionPreflight(fakeValidatorOptions), (error) => error && error.code === protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED); assertions += 1;
    assert.throws(() => preflightModule.createExecutionPreflight({ protocol, actionValidator: Object.assign({}, dependencyHarness.validator), planStore: dependencyHarness.store, contextBridge: dependencyHarness.bridge, getCurrentExecutionBinding() {}, executeValidatedAction() {} }), (error) => error && error.code === protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED); assertions += 1;
    assert.throws(() => preflightModule.createExecutionPreflight({ protocol, actionValidator: dependencyHarness.validator, planStore: {}, contextBridge: dependencyHarness.bridge, getCurrentExecutionBinding() {}, executeValidatedAction() {} }), (error) => error && error.code === protocol.ERROR_CODES.UNTRUSTED_PLAN_STORE); assertions += 1;
    assert.throws(() => preflightModule.createExecutionPreflight({ protocol, actionValidator: dependencyHarness.validator, planStore: dependencyHarness.store, contextBridge: { capture: dependencyHarness.bridge.capture, compareCaptures: dependencyHarness.bridge.compareCaptures }, getCurrentExecutionBinding() {}, executeValidatedAction() {} }), (error) => error && error.code === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); assertions += 1;
    const secondProtocol = protocolModule.createProtocol(runtime);
    check(!validatorModule.isTrustedActionValidatorForProtocol(dependencyHarness.validator, secondProtocol) && !bridgeModule.isTrustedContextBridgeForProtocol(dependencyHarness.bridge, secondProtocol), "Validator and bridge identity must bind the exact protocol instance.");
    assert.throws(() => preflightModule.createExecutionPreflight({ protocol: secondProtocol, actionValidator: dependencyHarness.validator, planStore: dependencyHarness.store, contextBridge: dependencyHarness.bridge, getCurrentExecutionBinding() {}, executeValidatedAction() {} }), (error) => error && error.code === protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Cross-protocol validator instances must reject before plan or bridge use."); assertions += 1;

    const harness = makeHarness();
    const plan = await seedAndCreate(harness);
    check(plan.actionCount === 1 && plan.candidates.length === 1 && !JSON.stringify(plan).includes("nativeLayerId") && !JSON.stringify(plan).includes("value\""), "Bound plan public view remains single-step and digest-only.");
    check(harness.currentCalls === 1, "Bound plan creation must read current execution binding exactly once.");
    const confirmed = await confirm(harness, plan);
    check(confirmed.state === "confirmed", "Bound plan confirmation must succeed with matching current bindings.");
    harness.events.length = 0;
    const execution = await harness.preflight.executeStep({ planId: plan.planId, stepIndex: 0 });
    check(execution.candidate.state === "consumed" && execution.result.ok === true && harness.executorCalls === 1, "Same-state preflight must reserve once and execute the fake executor once.");
    check(harness.events.join(",") === "tier1,tier3,current,executor", "Observable preflight ordering must be Tier 1, Tier 3, one current binding read, then executor; Guard check and reserve are synchronous between current and executor.");
    await expectCode(harness.preflight.executeStep({ planId: plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Consumed plans must clear their private capture record.");

    const invalidTier = makeHarness();
    const invalidSeed = await invalidTier.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    await expectCode(invalidTier.preflight.createBoundPlan({ proposal: proposal(invalidSeed.fingerprint, invalidTier.valueDigest(50), { target: Object.assign({}, proposal(invalidSeed.fingerprint, invalidTier.valueDigest(50)).target, { contextTier: 1 }) }), selectionOrderMeaningful: true }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Tier 3 property target is required.");
    const digestMismatch = makeHarness();
    const mismatchSeed = await digestMismatch.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    await expectCode(digestMismatch.preflight.createBoundPlan({ proposal: proposal(mismatchSeed.fingerprint, digestMismatch.valueDigest(51)), selectionOrderMeaningful: true }), protocol.ERROR_CODES.CONTEXT_STALE, "Value capture digest must exactly match the validated action target.");
    const mismatchedPath = makeHarness();
    const pathSeed = await mismatchedPath.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    mismatchedPath.state.responsePath = ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0];
    await expectCode(mismatchedPath.preflight.createBoundPlan({ proposal: proposal(pathSeed.fingerprint, mismatchedPath.valueDigest(50)), selectionOrderMeaningful: true }), protocol.ERROR_CODES.CONTEXT_STALE, "Host property-path mismatches must reject without a bound plan.");
    const mismatchedMatchName = makeHarness();
    const matchSeed = await mismatchedMatchName.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    mismatchedMatchName.state.responseMatchName = "ADBE Position";
    await expectCode(mismatchedMatchName.preflight.createBoundPlan({ proposal: proposal(matchSeed.fingerprint, mismatchedMatchName.valueDigest(50)), selectionOrderMeaningful: true }), protocol.ERROR_CODES.CONTEXT_STALE, "Host property match-name mismatches must reject without a bound plan.");
    const nonProperty = makeHarness();
    const nonPropertySeed = await nonProperty.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    await expectCode(nonProperty.preflight.createBoundPlan({ proposal: proposal(nonPropertySeed.fingerprint, nonProperty.valueDigest(50), { target: { contextFingerprint: nonPropertySeed.fingerprint, layerId: "ae-project-3-item-12-layer-45" } }), selectionOrderMeaningful: true }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Non-property targets must be rejected before any plan registration.");

    const valueDrift = makeHarness();
    const valuePlan = await seedAndCreate(valueDrift);
    await confirm(valueDrift, valuePlan);
    valueDrift.state.value = 51;
    await expectCode(valueDrift.preflight.executeStep({ planId: valuePlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Value digest drift must block before reserve.");
    check(valueDrift.executorCalls === 0 && valueDrift.store.getCandidate(valuePlan.candidateIds[0]).state === "stale", "Value drift must mark the candidate stale without executor access.");

    const timeDrift = makeHarness();
    const timePlan = await seedAndCreate(timeDrift);
    await confirm(timeDrift, timePlan);
    timeDrift.state.sampleTime = 2;
    await expectCode(timeDrift.preflight.executeStep({ planId: timePlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Sample-time drift must block before reserve.");
    check(timeDrift.executorCalls === 0, "Sample-time drift must not call executor.");

    const selectionDrift = makeHarness();
    const selectionPlan = await seedAndCreate(selectionDrift);
    await confirm(selectionDrift, selectionPlan);
    selectionDrift.state.selectionExtra = true;
    await expectCode(selectionDrift.preflight.executeStep({ planId: selectionPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Selection-only drift must require a fresh candidate.");
    check(selectionDrift.executorCalls === 0, "Selection-only drift must not call executor.");

    const targetMissing = makeHarness();
    const targetMissingPlan = await seedAndCreate(targetMissing);
    await confirm(targetMissing, targetMissingPlan);
    targetMissing.state.targetMissing = true;
    await expectCode(targetMissing.preflight.executeStep({ planId: targetMissingPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Layer-index or target-resolution drift must fail closed before reserve.");
    check(targetMissing.executorCalls === 0 && targetMissing.store.getCandidate(targetMissingPlan.candidateIds[0]).state === "stale", "Unknown targets must stale the candidate without executor access.");

    const expression = makeHarness();
    const expressionPlan = await seedAndCreate(expression);
    await confirm(expression, expressionPlan);
    expression.state.errorCode = "HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED";
    await expectCode(expression.preflight.executeStep({ planId: expressionPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_VALUE_EVALUATION_DISALLOWED, "Expression-enabled values must block without stale consumption.");
    check(expression.store.getCandidate(expressionPlan.candidateIds[0]).state === "confirmed" && expression.executorCalls === 0, "Expression blocking must preserve a retryable confirmed candidate.");
    expression.state.errorCode = null;
    check((await expression.preflight.executeStep({ planId: expressionPlan.planId, stepIndex: 0 })).candidate.state === "consumed", "Expression recovery must allow a later fresh execution.");

    const unavailable = makeHarness();
    const unavailablePlan = await seedAndCreate(unavailable);
    await confirm(unavailable, unavailablePlan);
    unavailable.state.errorCode = "HOST_CONTEXT_UNAVAILABLE";
    await expectCode(unavailable.preflight.executeStep({ planId: unavailablePlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE, "Temporary Host unavailability must remain a transient verification failure.");
    check(unavailable.store.getCandidate(unavailablePlan.candidateIds[0]).state === "confirmed" && unavailable.executorCalls === 0, "Temporary Host unavailability must not stale, reserve or execute the candidate.");
    unavailable.state.errorCode = null;
    check((await unavailable.preflight.executeStep({ planId: unavailablePlan.planId, stepIndex: 0 })).candidate.state === "consumed", "A candidate must retry successfully after temporary Host recovery.");

    const verifier = makeHarness();
    const verifierPlan = await seedAndCreate(verifier);
    await confirm(verifier, verifierPlan);
    verifier.state.hasVerifier = false;
    await expectCode(verifier.preflight.executeStep({ planId: verifierPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE, "Guard check failures must prevent reservation and executor access.");
    check(verifier.executorCalls === 0 && verifier.store.getCandidate(verifierPlan.candidateIds[0]).state === "confirmed", "A failed synchronous guard check must leave the candidate retryable.");

    const settingsDrift = makeHarness();
    const settingsPlan = await seedAndCreate(settingsDrift);
    settingsDrift.settings = "sha256:" + "b".repeat(64);
    await expectCode(settingsDrift.preflight.confirmBoundPlan({ planId: settingsPlan.planId }), protocol.ERROR_CODES.CONTEXT_STALE, "Settings drift must reject confirmation.");
    const permissionDrift = makeHarness();
    const permissionPlan = await seedAndCreate(permissionDrift);
    permissionDrift.permission = { mode: "confirm-every-action", grants: [], policyRevision: "p2" };
    await expectCode(permissionDrift.preflight.confirmBoundPlan({ planId: permissionPlan.planId }), protocol.ERROR_CODES.PERMISSION_DENIED, "Permission drift must reject confirmation.");
    const contextDrift = makeHarness();
    const contextPlan = await seedAndCreate(contextDrift);
    contextDrift.state.selectionExtra = true;
    await expectCode(contextDrift.preflight.confirmBoundPlan({ planId: contextPlan.planId }), protocol.ERROR_CODES.CONTEXT_STALE, "Tier 1 context drift must reject confirmation and stale the private binding.");
    check(contextDrift.executorCalls === 0 && contextDrift.store.getCandidate(contextPlan.candidateIds[0]).state === "stale", "Confirmation context drift must not leave an executable candidate.");

    const executorThrow = makeHarness();
    const throwPlan = await seedAndCreate(executorThrow);
    await confirm(executorThrow, throwPlan);
    executorThrow.executorMode = "throw";
    await expectCode(executorThrow.preflight.executeStep({ planId: throwPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.PLAN_FAILED, "Synchronous executor failure must fail the reservation.");
    check(executorThrow.store.getCandidate(throwPlan.candidateIds[0]).state === "failed", "Executor throw must consume the candidate.");
    check(executorThrow.store.getPlanView(throwPlan.planId).state === "failed" && executorThrow.store.getPlanView(throwPlan.planId).nextStep === 1 && executorThrow.executorCalls === 1, "Executor throw must leave the reserved action index consumed exactly once.");
    await expectCode(executorThrow.preflight.executeStep({ planId: throwPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Executor throw replay must keep the terminal state and release the preflight operation lock.");
    check(executorThrow.executorCalls === 1, "Executor throw replay must not invoke the executor again.");

    const executorReject = makeHarness();
    const rejectPlan = await seedAndCreate(executorReject);
    await confirm(executorReject, rejectPlan);
    executorReject.executorMode = "reject";
    await expectCode(executorReject.preflight.executeStep({ planId: rejectPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.PLAN_FAILED, "Rejected executor promises must fail the reservation.");
    check(executorReject.store.getCandidate(rejectPlan.candidateIds[0]).state === "failed", "Rejected executor promises must consume replay protection.");
    check(executorReject.store.getPlanView(rejectPlan.planId).state === "failed" && executorReject.store.getPlanView(rejectPlan.planId).nextStep === 1 && executorReject.executorCalls === 1, "Rejected executor promises must leave the reserved action index consumed exactly once.");
    await expectCode(executorReject.preflight.executeStep({ planId: rejectPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Rejected executor replay must keep the terminal state and release the preflight operation lock.");
    check(executorReject.executorCalls === 1, "Rejected executor replay must not invoke the executor again.");

    async function assertTerminalFailure(mode, expectedCode, label) {
        const terminal = makeHarness();
        const terminalPlan = await seedAndCreate(terminal);
        await confirm(terminal, terminalPlan);
        terminal.executorMode = mode;
        await expectCode(terminal.preflight.executeStep({ planId: terminalPlan.planId, stepIndex: 0 }), expectedCode, label + " must reject with the stable terminal error.");
        const terminalCandidate = terminal.store.getCandidate(terminalPlan.candidateIds[0]);
        check(terminalCandidate.state === "failed" && terminal.executorCalls === 1, label + " must terminalize the reservation after one executor invocation.");
        check(terminal.store.getPlanView(terminalPlan.planId).state === "failed" && terminal.store.getPlanView(terminalPlan.planId).nextStep === 1, label + " must preserve the atomically consumed reservation index.");
        await expectCode(terminal.preflight.executeStep({ planId: terminalPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, label + " replay must remain terminal and prove the preflight operation lock was released.");
        check(terminal.executorCalls === 1, label + " replay must not invoke the executor again.");
        return terminal;
    }

    await assertTerminalFailure("invalid-result", protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Invalid executor results");
    await assertTerminalFailure("accessor-result", protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Accessor executor results");
    const resolveTwice = makeHarness();
    const resolveTwicePlan = await seedAndCreate(resolveTwice);
    await confirm(resolveTwice, resolveTwicePlan);
    resolveTwice.executorMode = "resolve-twice";
    check((await resolveTwice.preflight.executeStep({ planId: resolveTwicePlan.planId, stepIndex: 0 })).candidate.state === "consumed" && resolveTwice.executorCalls === 1, "Resolve-twice thenables must retain only the first successful terminal path.");
    await assertTerminalFailure("reject-then-resolve", protocol.ERROR_CODES.PLAN_FAILED, "Reject-then-resolve thenables");
    const resolveThenReject = makeHarness();
    const resolveThenRejectPlan = await seedAndCreate(resolveThenReject);
    await confirm(resolveThenReject, resolveThenRejectPlan);
    resolveThenReject.executorMode = "resolve-then-reject";
    check((await resolveThenReject.preflight.executeStep({ planId: resolveThenRejectPlan.planId, stepIndex: 0 })).candidate.state === "consumed" && resolveThenReject.executorCalls === 1, "Resolve-then-reject thenables must retain only the first completion.");

    const completionClock = makeHarness();
    const completionClockPlan = await seedAndCreate(completionClock);
    await confirm(completionClock, completionClockPlan);
    completionClock.state.clockThrowAfter = 1;
    await expectCode(completionClock.preflight.executeStep({ planId: completionClockPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Completion clock failure must fall back through fail to emergency abort.");
    check(completionClock.store.getCandidate(completionClockPlan.candidateIds[0]).state === "failed" && completionClock.store.getPlanView(completionClockPlan.planId).nextStep === 1 && completionClock.executorCalls === 1, "Completion clock fallback must not strand an active reservation.");

    const failureClock = makeHarness();
    const failureClockPlan = await seedAndCreate(failureClock);
    await confirm(failureClock, failureClockPlan);
    failureClock.state.clockThrowAfter = 1;
    failureClock.executorMode = "throw";
    await expectCode(failureClock.preflight.executeStep({ planId: failureClockPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.PLAN_FAILED, "Failure clock failure must fall back to emergency abort.");
    check(failureClock.store.getCandidate(failureClockPlan.candidateIds[0]).state === "failed" && failureClock.store.getPlanView(failureClockPlan.planId).nextStep === 1 && failureClock.executorCalls === 1, "Failure clock fallback must not strand an active reservation.");

    const failedResult = makeHarness();
    const failedResultPlan = await seedAndCreate(failedResult);
    await confirm(failedResult, failedResultPlan);
    failedResult.executorMode = "failed-result";
    const failedExecution = await failedResult.preflight.executeStep({ planId: failedResultPlan.planId, stepIndex: 0 });
    check(failedExecution.result.ok === false && failedExecution.candidate.state === "failed" && failedResult.executorCalls === 1, "A bounded executor failure result must resolve its explicit executor failure and consume the candidate.");
    check(failedResult.store.getPlanView(failedResultPlan.planId).state === "failed" && failedResult.store.getPlanView(failedResultPlan.planId).nextStep === 1, "An explicit executor failure must preserve the atomically consumed reservation index.");
    await expectCode(failedResult.preflight.executeStep({ planId: failedResultPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "An explicit executor failure replay must keep the terminal state and release the preflight operation lock.");
    check(failedResult.executorCalls === 1, "An explicit executor failure replay must not invoke the executor again.");

    const committedUnavailable = makeHarness();
    committedUnavailable.executorMode = "committed-result-unavailable";
    const committedUnavailablePlan = await seedAndCreate(committedUnavailable);
    await confirm(committedUnavailable, committedUnavailablePlan);
    await expectCode(committedUnavailable.preflight.executeStep({ planId: committedUnavailablePlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.PLAN_FAILED, "Committed-result unavailable must terminalize as a non-retryable plan failure.");
    check(committedUnavailable.store.getCandidate(committedUnavailablePlan.candidateIds[0]).state === "failed" && committedUnavailable.store.getPlanView(committedUnavailablePlan.planId).state === "failed" && committedUnavailable.store.getPlanView(committedUnavailablePlan.planId).nextStep === 1, "Committed-result unavailable must consume the reservation and must not complete.");
    await expectCode(committedUnavailable.preflight.executeStep({ planId: committedUnavailablePlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Committed-result unavailable replay must remain permanently consumed.");
    check(committedUnavailable.executorCalls === 1, "Committed-result unavailable must not call executor or Host again.");

    const reset = makeHarness();
    const resetPlan = await seedAndCreate(reset);
    await confirm(reset, resetPlan);
    reset.bridge.resetSession();
    await expectCode(reset.preflight.executeStep({ planId: resetPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Session reset must stale the candidate before reserve.");
    check(reset.executorCalls === 0, "Session reset must not call executor.");

    const reload = makeHarness();
    const reloadPlan = await seedAndCreate(reload);
    await confirm(reload, reloadPlan);
    reload.state.hostReloadEpoch = 2;
    await expectCode(reload.preflight.executeStep({ planId: reloadPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Host authority reload must stale the candidate before reserve.");
    check(reload.executorCalls === 0, "Host authority reload must not call executor.");

    const suspended = makeHarness();
    const suspendedPlan = await seedAndCreate(suspended);
    await confirm(suspended, suspendedPlan);
    check(suspended.bridge.suspend() === true, "Suspending the Bridge must succeed before preflight execution.");
    await expectCode(suspended.preflight.executeStep({ planId: suspendedPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Suspend must be transient and reserve nothing.");
    check(suspended.executorCalls === 0 && suspended.store.getCandidate(suspendedPlan.candidateIds[0]).state === "confirmed", "Suspend must preserve a candidate until lifecycle resumes.");
    check(suspended.bridge.resume() === true, "Resuming the Bridge must restore request availability.");
    await expectCode(suspended.preflight.executeStep({ planId: suspendedPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "A resumed Bridge must reject the old candidate because its capture lifecycle changed.");
    const replacementPlan = await seedAndCreate(suspended);
    check(replacementPlan.actionCount === 1, "A fresh plan must be creatable after a suspend/resume lifecycle boundary.");

    const timeout = makeHarness();
    const timeoutPlan = await seedAndCreate(timeout);
    await confirm(timeout, timeoutPlan);
    timeout.state.deferred = true;
    const pending = timeout.preflight.executeStep({ planId: timeoutPlan.planId, stepIndex: 0 });
    await Promise.resolve();
    await Promise.resolve();
    timeout.scheduler.fireAll();
    await expectCode(pending, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Timeout must reject before reserve.");
    check(timeout.executorCalls === 0 && timeout.store.getCandidate(timeoutPlan.candidateIds[0]).state === "confirmed", "Timeout must preserve a retryable candidate and prevent executor calls.");
    timeout.callbacks.forEach((callback, index) => {
        const request = timeout.calls[index];
        callback(success(request, request.operation === "captureContext" ? bindingSnapshot(timeout.state) : valueSnapshot(request, timeout.state)));
        callback(success(request, request.operation === "captureContext" ? bindingSnapshot(timeout.state) : valueSnapshot(request, timeout.state)));
    });
    check(timeout.store.getCandidate(timeoutPlan.candidateIds[0]).state === "confirmed", "Late Host callbacks after timeout must not consume or stale the candidate.");
    timeout.state.deferred = false;
    check((await timeout.preflight.executeStep({ planId: timeoutPlan.planId, stepIndex: 0 })).candidate.state === "consumed", "A transient timeout must allow a later fully fresh execution.");

    const strictInput = makeHarness();
    const strictPlan = await seedAndCreate(strictInput);
    await confirm(strictInput, strictPlan);
    await expectCode(strictInput.preflight.executeStep({ planId: strictPlan.planId, stepIndex: 0, target: {} }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Execution input must reject caller-supplied target or capture overrides.");
    assert.throws(() => strictInput.preflight.discardBoundPlan({ planId: "plan_" + "f".repeat(32) }), (error) => error && error.code === protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Foreign plans must not gain a private execution binding."); assertions += 1;
    const discarded = strictInput.preflight.discardBoundPlan({ planId: strictPlan.planId, reason: "user-discard" });
    check(discarded.state === "discarded", "Explicit discard must transition the underlying plan and clear the private binding.");
    await expectCode(strictInput.preflight.executeStep({ planId: strictPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Discarded bound plans must no longer retain private capture references.");
}

run().then(() => console.log("PASS Vela execution preflight: " + assertions + " assertions."), (error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
