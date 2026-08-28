#!/usr/bin/env node
"use strict";

const assert = require("assert");
const protocolModule = require("../client/js/vela/velaProtocol");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const preflightModule = require("../client/js/vela/velaExecutionPreflight");
const contextModule = require("../client/js/vela/velaContext");
const planningContracts = require("../client/js/vela/velaPlanningContracts");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const contextApi = contextModule.createContextApi(protocol);
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
const PATH = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
const SETTINGS = "sha256:" + "a".repeat(64);
let assertions = 0;
let harnessCounter = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, codes, message) {
    codes = Array.isArray(codes) ? codes : [codes];
    await assert.rejects(Promise.resolve(value), function (error) { return error && codes.indexOf(error.code) !== -1; }, message);
    assertions += 1;
}
function localId(kind, value) { return kind + "_" + String(value).padStart(32, "0"); }
function decode(source) {
    const prefix = "AEToolbox.VelaContext.handle(";
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}
function success(request, snapshot) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot });
}
function hostError(request, code) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: false, hostAdapterRevision: "vela-context-host-v4", error: { code, message: "bounded" } });
}
function capabilities() {
    return { registry: { vela: { id: "vela", actions: { "set-opacity-v1": { id: "set-opacity-v1", executable: true, risk: "write", targetScope: ["layer", "property"], capabilityRevision: "set-opacity-v1", paramsSchema: { type: "object", additionalProperties: false, required: ["opacity"], properties: { opacity: { type: "number", minimum: 0, maximum: 100 } } } } } } } };
}

function makeHarness() {
    const harnessId = ++harnessCounter;
    const state = { value: 100, layerIndex: 3, selectionExtra: false, targetMissing: false, race: false, defer: false };
    const captures = [];
    const boundActions = [];
    let deferredResolve = null;
    let settings = SETTINGS;
    let permission = { mode: "confirm-every-action", grants: ["layer.write"], policyRevision: "p1" };
    const bridge = bridgeModule.createContextBridge({
        protocol,
        contextApi,
        invokeHost(source, callback) {
            const request = decode(source);
            captures.push(request.operation);
            if (request.operation === "captureContext") {
                const items = [{ nativeLayerId: 45, layerIndex: state.layerIndex, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }];
                if (state.selectionExtra) items.push({ nativeLayerId: 46, layerIndex: 4, selectedOrder: 1, matchName: "ADBE AV Layer", type: "av" });
                callback(success(request, { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 1, projectGeneration: 3, activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: items.length, identityQuality: "native-layer-id", items } }));
                return;
            }
            if (state.targetMissing) { callback(hostError(request, "HOST_CONTEXT_TARGET_NOT_FOUND")); return; }
            callback(success(request, { hostInstanceId: HOST, hostReloadEpoch: 1, projectGeneration: 3, sampleTime: captures.length, tier: 3, targets: request.scope.targets.map(function (target, index) { return { targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: state.value } }; }) }));
        },
        runtime: { setTimeout, clearTimeout, timeoutMs: 1000 }
    });
    const validator = validatorModule.createActionValidator(protocol, capabilities());
    let id = 0;
    const store = planModule.createPlanStore(protocol, {
        validatorAuthority: validator.authority,
        candidateIdFactory: function () { return localId("cand", harnessId * 1000 + (++id)); },
        planIdFactory: function () { return localId("plan", harnessId * 1000 + (++id)); },
        nonceFactory: function () { return localId("confirm", harnessId * 1000 + (++id)); },
        reservationIdFactory: function () { return localId("res", harnessId * 1000 + (++id)); },
        sessionIdFactory: function () { return localId("session", harnessId * 1000 + (++id)); },
        now: function () { return ++id; }
    });
    const preflight = preflightModule.createExecutionPreflight({
        protocol,
        actionValidator: validator,
        planStore: store,
        contextBridge: bridge,
        getCurrentExecutionBinding() { return { settingsFingerprint: settings, permissionSnapshot: permission, lifecycle: "active", hasVerifier: true }; },
        executeValidatedAction(action) {
            boundActions.push(action);
            check(validator.authority.isValidatedAction(action), "Every transient JIT action must pass the existing validator authority.");
            check(typeof action.target.layerId === "string" && typeof action.target.propertyValueDigest === "string", "The executor receives a native-bound target only after the step becomes due.");
            if (state.race) { state.value += 1; state.race = false; }
            if (action.target.propertyValueDigest !== contextApi.describePropertyValue("number", state.value).valueDigest) {
                throw new protocol.VelaProtocolError(protocol.ERROR_CODES.CONTEXT_STALE);
            }
            const finish = function () {
                state.value = action.payload.params.opacity;
                return { ok: true, summary: { capabilityId: "set-opacity-v1", resultingValueDigest: contextApi.digestPropertyValue("number", state.value) } };
            };
            if (state.defer) { return new Promise(function (resolve) { deferredResolve = function () { state.defer = false; resolve(finish()); }; }); }
            return finish();
        }
    });
    return {
        state, captures, boundActions, bridge, validator, store, preflight,
        set settings(value) { settings = value; },
        set permission(value) { permission = value; },
        release() { if (deferredResolve) { const resolve = deferredResolve; deferredResolve = null; resolve(); } }
    };
}

function steps() {
    return [
        { capabilityId: "set-opacity-v1", params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" } },
        { capabilityId: "set-opacity-v1", params: { opacity: 25 }, targetScope: { type: "selected-layer", property: "opacity" } }
    ];
}

async function createAndConfirm(harness, customSteps) {
    const plan = await harness.preflight.createBoundPlan({ steps: customSteps || steps(), selectionOrderMeaningful: true });
    const confirmed = await harness.preflight.confirmBoundPlan({ planId: plan.planId });
    return { plan, confirmed };
}

async function run() {
    const positive = makeHarness();
    const created = await createAndConfirm(positive);
    const semanticJson = JSON.stringify(positive.store.getPlanView(created.plan.planId));
    check(!semanticJson.includes("layerId") && !semanticJson.includes("propertyValueDigest") && !semanticJson.includes("nativeLayerId"), "Semantic PlanStore candidates must contain no native layer binding or value digest.");
    check(created.plan.review.beforeValue === 100, "Review retains bounded presentation evidence only.");
    check(positive.boundActions.length === 0, "Neither step is JIT-bound at create or confirm time.");
    const nonces = created.confirmed.candidates.map(function (candidate) { return candidate.confirmationNonce; });
    const before0Captures = positive.captures.length;
    const result0 = await positive.preflight.executeStep({ planId: created.plan.planId, stepIndex: 0 });
    check(result0.candidate.state === "consumed" && positive.state.value === 50, "Step zero captures 100, executes 50, and verifies successfully.");
    check(positive.boundActions.length === 1 && positive.boundActions[0].target.propertyValueDigest === contextApi.describePropertyValue("number", 100).valueDigest, "Step zero expected digest is its step-due current value.");
    check(positive.captures.length === before0Captures + 2, "Step zero performs one fresh Tier 1 and one fresh value capture.");
    check(positive.store.getPlanView(created.plan.planId).state === "confirmed" && positive.store.getPlanView(created.plan.planId).nextStep === 1, "Intermediate success preserves the preflight record and advances PlanStore ordering.");
    check(positive.boundActions.length === 1, "Step one was not bound before step zero became terminal.");
    const result1 = await positive.preflight.executeStep({ planId: created.plan.planId, stepIndex: 1 });
    check(result1.candidate.state === "consumed" && positive.state.value === 25, "Step one observes post-step-zero value 50 and executes 25 without false stale.");
    check(positive.boundActions[1].target.propertyValueDigest === contextApi.describePropertyValue("number", 50).valueDigest, "Step one receives its own current CAS baseline rather than review value 100.");
    const finalView = positive.store.getPlanView(created.plan.planId);
    check(finalView.state === "consumed" && finalView.candidates.map(function (candidate) { return candidate.confirmationNonce; }).join(",") === nonces.join(","), "Final plan is consumed and JIT does not replace confirmation nonces.");
    await expectCode(positive.preflight.executeStep({ planId: created.plan.planId, stepIndex: 1 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Final completion releases the private preflight record and prevents replay.");

    const order = makeHarness();
    const ordered = await createAndConfirm(order);
    const captureCount = order.captures.length;
    await expectCode(order.preflight.executeStep({ planId: ordered.plan.planId, stepIndex: 1 }), protocol.ERROR_CODES.CAPABILITY_BUDGET_EXCEEDED, "Out-of-order step one remains rejected.");
    check(order.boundActions.length === 0 && order.captures.length === captureCount, "An out-of-order future step cannot be JIT-bound or captured early.");
    order.state.defer = true;
    const pending = order.preflight.executeStep({ planId: ordered.plan.planId, stepIndex: 0 });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    await expectCode(order.preflight.executeStep({ planId: ordered.plan.planId, stepIndex: 1 }), protocol.ERROR_CODES.EXECUTION_BUSY, "Overlapping next-step execution remains blocked by preflight single-flight.");
    order.release(); await pending;

    const selection = makeHarness();
    const selectionPlan = await createAndConfirm(selection);
    selection.state.selectionExtra = true;
    await expectCode(selection.preflight.executeStep({ planId: selectionPlan.plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Post-review selection drift blocks the current step.");
    check(selection.store.getPlanView(selectionPlan.plan.planId).state === "stale" && selection.boundActions.length === 0, "Selection stale terminalizes the plan before execution and blocks later steps.");

    const missing = makeHarness();
    const missingPlan = await createAndConfirm(missing);
    missing.state.targetMissing = true;
    await expectCode(missing.preflight.executeStep({ planId: missingPlan.plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.UNKNOWN_TARGET, "An unresolvable reviewed scope fails UNKNOWN_TARGET.");
    check(missing.store.getPlanView(missingPlan.plan.planId).state === "stale", "Target resolution failure blocks the remaining plan.");

    const race = makeHarness();
    const racePlan = await createAndConfirm(race);
    race.state.race = true;
    await expectCode(race.preflight.executeStep({ planId: racePlan.plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "A value race after JIT capture is still rejected by CAS.");
    check(race.store.getPlanView(racePlan.plan.planId).state === "failed", "CAS failure terminalizes the plan and blocks later steps without retry or rollback.");

    const settings = makeHarness();
    const settingsPlan = await createAndConfirm(settings);
    settings.settings = "sha256:" + "b".repeat(64);
    await expectCode(settings.preflight.executeStep({ planId: settingsPlan.plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CONTEXT_STALE, "Changed settings remain stale at step due time.");
    check(settings.boundActions.length === 0, "Settings failure cannot reach execution.");

    const permission = makeHarness();
    const permissionPlan = await createAndConfirm(permission);
    permission.permission = { mode: "confirm-every-action", grants: ["layer.write"], policyRevision: "p2" };
    await expectCode(permission.preflight.executeStep({ planId: permissionPlan.plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.PERMISSION_DENIED, "Changed permission snapshot remains denied at step due time.");
    check(permission.boundActions.length === 0, "Permission failure cannot reach execution.");

    const discarded = makeHarness();
    const discardPlan = await discarded.preflight.createBoundPlan({ steps: steps(), selectionOrderMeaningful: true });
    const discardView = discarded.preflight.discardBoundPlan({ planId: discardPlan.planId, reason: "user-cancelled" });
    check(discardView.state === "discarded" && discarded.boundActions.length === 0, "Discard clears semantic authority without JIT binding or execution.");
    await expectCode(discarded.preflight.executeStep({ planId: discardPlan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "Discarded records cannot execute.");

    const contracts = makeHarness();
    const taskPlan = planningContracts.createTaskPlan({ planId: "plan_task", revision: 0, steps: [{ stepId: "step_task", kind: "observe" }] });
    await expectCode(contracts.preflight.createBoundPlan({ steps: [taskPlan], selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "TaskPlan cannot enter the JIT execution seam.");
    const rawCandidate = planningContracts.createActionCandidate({ candidateId: "cand_task", capabilityId: "set-opacity-v1", operationKind: "mutate", kind: "tool", risk: "write", params: { opacity: 50 }, targetScope: { type: "selected-layer", property: "opacity" }, requiresConfirmation: true });
    await expectCode(contracts.preflight.createBoundPlan({ steps: [rawCandidate], selectionOrderMeaningful: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Raw ActionCandidate cannot enter the JIT execution seam.");

    const single = makeHarness();
    const singlePlan = await single.preflight.createBoundPlan({ localProposal: { capabilityId: "set-opacity-v1", params: { opacity: 60 } }, selectionOrderMeaningful: true });
    await single.preflight.confirmBoundPlan({ planId: singlePlan.planId });
    check((await single.preflight.executeStep({ planId: singlePlan.planId, stepIndex: 0 })).candidate.state === "consumed" && single.state.value === 60, "Current one-step set-opacity remains compatible.");

    const freshStore = makeHarness();
    await expectCode(freshStore.preflight.executeStep({ planId: created.plan.planId, stepIndex: 0 }), protocol.ERROR_CODES.CANDIDATE_NOT_FOUND, "A fresh preflight/store cannot resurrect another session's authority.");
    console.log("PASS Vela JIT binding: " + assertions + " assertions.");
}

run().catch(function (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
