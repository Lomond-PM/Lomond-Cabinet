#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const nodeRuntime = require("./velaNodeRuntime");

const ROOT = path.resolve(__dirname, "..");
const protocol = protocolModule.createProtocol(nodeRuntime);
const contextApi = contextModule.createContextApi(protocol);
const HOST_A = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
const HOST_B = "host_fedcba9876543210fedcba9876543210fedcba9876543210";
let assertions = 0;

function check(condition, message) { assert.ok(condition, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}
function expectThrowCode(fn, code, message) {
    assert.throws(fn, (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function makeScheduler() {
    let nextId = 0;
    const timers = new Map();
    return {
        setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        fire(id) { const timer = timers.get(id); if (timer) { timers.delete(id); timer.callback(); } },
        fireAll() { Array.from(timers.keys()).forEach((id) => this.fire(id)); },
        count() { return timers.size; },
        firstId() { return timers.keys().next().value; }
    };
}

function decodeSource(source) {
    const prefix = "AEToolbox.VelaContext.handle(";
    assert.ok(source.startsWith(prefix) && source.endsWith(")"), "Unexpected Host facade source.");
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}

function successResult(request, snapshot) {
    return JSON.stringify({
        protocol: "vela.host-context-result.v1",
        schemaVersion: "1.0",
        requestId: request.requestId,
        sessionId: request.sessionId,
        operation: request.operation,
        ok: true,
        hostAdapterRevision: "vela-context-host-v4",
        snapshot
    });
}

function errorResult(request, code) {
    return JSON.stringify({
        protocol: "vela.host-context-result.v1",
        schemaVersion: "1.0",
        requestId: request.requestId,
        sessionId: request.sessionId,
        operation: request.operation,
        ok: false,
        hostAdapterRevision: "vela-context-host-v4",
        error: { code, message: "A local safe Host context error." }
    });
}

function tierZeroSnapshot(options) {
    options = options || {};
    return { hostInstanceId: options.hostInstanceId || HOST_A, hostReloadEpoch: options.hostReloadEpoch || 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: false, bindingContextAvailable: false, hostAdapterRevision: "vela-context-host-v4" } };
}

function tierOneSnapshot(options) {
    options = options || {};
    const native = options.native !== false;
    const item = { layerIndex: options.layerIndex || 3, selectedOrder: options.selectedOrder || 0, matchName: "ADBE Text Layer", type: "text" };
    if (native) { item.nativeLayerId = options.nativeLayerId || 45; }
    return {
        hostInstanceId: options.hostInstanceId || HOST_A,
        hostReloadEpoch: options.hostReloadEpoch || 1,
        tier: 1,
        projectGeneration: options.projectGeneration || 3,
        activeComp: options.noComp ? null : { itemId: 12, projectGeneration: options.projectGeneration || 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
        selection: { count: options.noComp ? 0 : 1, identityQuality: native ? "native-layer-id" : "index-only", items: options.noComp ? [] : [item] }
    };
}

function tierTwoSnapshot(options) {
    options = options || {};
    const item = {
        nativeLayerId: 45,
        layerIndex: 3,
        selectedOrder: 0,
        matchName: "ADBE Text Layer",
        type: "text",
        omittedFields: []
    };
    const details = options.details || ["name", "textPreview", "bounds"];
    if (details.includes("name")) Object.assign(item, { name: "标题🙂", nameTruncated: false, nameOriginalBytes: Buffer.byteLength("标题🙂") });
    if (details.includes("textPreview")) Object.assign(item, { textPreview: "正文", textPreviewTruncated: false, textPreviewOriginalBytes: Buffer.byteLength("正文") });
    if (details.includes("bounds")) item.bounds = { left: 0, top: 0, width: 100, height: 50 };
    return {
        hostInstanceId: options.hostInstanceId || HOST_A,
        hostReloadEpoch: options.hostReloadEpoch || 1,
        tier: 2,
        projectGeneration: 3,
        activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
        selection: { count: 1, identityQuality: "native-layer-id", items: [item] }
    };
}

function propertyValueSnapshot(request, options) {
    options = options || {};
    const values = options.values || request.scope.targets.map(() => ({ kind: "number", data: 50 }));
    return {
        hostInstanceId: options.hostInstanceId || HOST_A,
        hostReloadEpoch: options.hostReloadEpoch || 1,
        projectGeneration: options.projectGeneration || 3,
        sampleTime: options.sampleTime === undefined ? 1 : options.sampleTime,
        tier: 3,
        targets: request.scope.targets.map((target, index) => ({
            targetOrdinal: options.targetOrdinal === undefined ? target.targetOrdinal : options.targetOrdinal,
            nativeLayerId: options.nativeLayerId === undefined ? target.nativeLayerId : options.nativeLayerId,
            layerIndex: options.layerIndex === undefined ? target.layerIndex : options.layerIndex,
            propertyPath: options.propertyPath || target.propertyPath,
            propertyMatchName: options.propertyMatchName || target.propertyPath[target.propertyPath.length - 2],
            value: values[index]
        }))
    };
}

function makeHarness(handler, customProtocol, customContext) {
    const scheduler = makeScheduler();
    const calls = [];
    const callbacks = [];
    const p = customProtocol || protocol;
    const c = customContext || contextApi;
    const bridge = bridgeModule.createContextBridge({
        protocol: p,
        contextApi: c,
        invokeHost: function (source, callback) {
            calls.push(source);
            callbacks.push(callback);
            if (handler) { handler(source, callback, calls.length - 1); }
        },
        runtime: { setTimeout: scheduler.setTimeout, clearTimeout: scheduler.clearTimeout, timeoutMs: 5000 }
    });
    return { bridge, scheduler, calls, callbacks };
}

async function runBasicTests() {
    assert.throws(() => bridgeModule.createContextBridge({ protocol: {}, contextApi, invokeHost() {}, runtime: {} }), (error) => error && error.code === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
    assertions += 1;
    assert.throws(() => bridgeModule.createContextBridge({ protocol, contextApi: { captureContext() {} }, invokeHost() {}, runtime: { setTimeout() {}, clearTimeout() {}, timeoutMs: 1 } }), (error) => error && error.code === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
    assertions += 1;

    const h0 = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierZeroSnapshot())); });
    check(bridgeModule.isTrustedContextBridge(h0.bridge) && bridgeModule.isTrustedContextBridgeForProtocol(h0.bridge, protocol), "A Bridge instance must retain module-private trust for its exact protocol.");
    check(!bridgeModule.isTrustedContextBridge({ capture: h0.bridge.capture, compareCaptures: h0.bridge.compareCaptures }) && !bridgeModule.isTrustedContextBridge(Object.assign({}, h0.bridge)), "Bridge facades and clones must not inherit trusted instance identity.");
    const secondProtocol = protocolModule.createProtocol(nodeRuntime);
    const secondContextApi = contextModule.createContextApi(secondProtocol);
    const otherBridge = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierZeroSnapshot())); }, secondProtocol, secondContextApi).bridge;
    check(!bridgeModule.isTrustedContextBridgeForProtocol(h0.bridge, secondProtocol) && !bridgeModule.isTrustedContextBridgeForProtocol(otherBridge, protocol), "A trusted Bridge must not cross protocol instances.");
    check(/^session_[a-z0-9]{32,96}$/.test(h0.bridge.getSessionId()), "Bridge sessionId must be locally generated.");
    const tier0 = await h0.bridge.capture({ tier: 0, purpose: "display", selectionOrderMeaningful: true });
    check(tier0.tier === 0 && tier0.executable === false && tier0.fingerprint === null && Object.isFrozen(tier0), "Tier 0 must be a frozen display-only capture.");
    const request0 = decodeSource(h0.calls[0]);
    check(request0.sessionId === h0.bridge.getSessionId() && /^req_[a-z0-9]{32,96}$/.test(request0.requestId), "Session and request IDs must come from the bridge.");
    check(Object.keys(request0).sort().join(",") === "operation,protocol,requestId,schemaVersion,scope,sessionId,tier", "Host request must contain only fixed typed fields.");
    check(h0.calls[0].startsWith("AEToolbox.VelaContext.handle(\"") && h0.calls[0].endsWith("\")"), "Bridge must call only the fixed Host facade.");
    await expectCode(h0.bridge.capture({ tier: 1, purpose: "display", provider: "bad" }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider fields must not enter context requests.");

    const displayHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot({ native: false }))); });
    const display = await displayHarness.bridge.capture({ tier: 1, purpose: "display", selectionOrderMeaningful: true });
    check(display.executable === false && display.fingerprint === null && display.snapshot.selection[0].layerId === undefined, "Index-only display context must not fabricate layerId or fingerprint.");
    check(display.snapshot.activeComp.compId === "ae-project-3-item-12", "Frontend must format compId from project generation and itemId.");

    const bindingHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot())); });
    const binding = await bindingHarness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    check(binding.executable === true && /^sha256:[0-9a-f]{64}$/.test(binding.fingerprint), "Native Layer.id binding must produce a real context fingerprint.");
    check(binding.snapshot.selection[0].layerId === "ae-project-3-item-12-layer-45", "Frontend must bind layerId to project generation and comp identity.");
    check(Object.isFrozen(binding.snapshot) && Object.isFrozen(binding.snapshot.selection), "Binding capture must be deeply frozen.");

    const noIdHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot({ native: false }))); });
    await expectCode(noIdHarness.bridge.capture({ tier: 1, purpose: "binding" }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Binding must reject index-only Host context.");

    const duplicateHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        const snapshot = tierOneSnapshot();
        snapshot.selection.count = 2;
        snapshot.selection.items.push(Object.assign({}, snapshot.selection.items[0], { selectedOrder: 1 }));
        callback(successResult(req, snapshot));
    });
    await expectCode(duplicateHarness.bridge.capture({ tier: 1, purpose: "binding" }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Duplicate native Layer.id values must be rejected.");
}

async function runStateMachineTests() {
    const malformed = makeHarness((source, callback) => callback("not-json"));
    await expectCode(malformed.bridge.capture({ tier: 0 }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Malformed Host JSON must fail closed.");

    const mismatch = makeHarness((source, callback) => {
        const req = decodeSource(source);
        const raw = JSON.parse(successResult(req, tierZeroSnapshot()));
        raw.requestId = "req_" + "z".repeat(32);
        callback(JSON.stringify(raw));
    });
    await expectCode(mismatch.bridge.capture({ tier: 0 }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host metadata must match exactly.");

    const hostError = makeHarness((source, callback) => { const req = decodeSource(source); callback(errorResult(req, "HOST_CONTEXT_BUDGET_EXCEEDED")); });
    await expectCode(hostError.bridge.capture({ tier: 1 }), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Host budget errors must map to stable protocol errors.");

    let secondCallback;
    const twice = makeHarness((source, callback) => {
        secondCallback = callback;
        const req = decodeSource(source);
        callback(successResult(req, tierZeroSnapshot()));
    });
    const firstResult = await twice.bridge.capture({ tier: 0 });
    secondCallback("not-json");
    check(firstResult.tier === 0 && twice.bridge.getState().state === "idle", "A second callback must not change a completed request.");

    const pending = makeHarness();
    const pendingPromise = pending.bridge.capture({ tier: 0 });
    const pendingId = pending.bridge.getState().requestId;
    check(pending.bridge.cancel("req_" + "x".repeat(32)) === false, "A wrong requestId must not cancel the active request.");
    check(pending.bridge.cancel(pendingId) === true, "The exact requestId must cancel the active request.");
    await expectCode(pendingPromise, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Cancel must actively settle the request.");
    const lateReq = decodeSource(pending.calls[0]);
    pending.callbacks[0](successResult(lateReq, tierZeroSnapshot()));
    check(pending.bridge.getState().state === "idle", "A late callback must not revive a cancelled request.");

    const timeout = makeHarness();
    const timeoutPromise = timeout.bridge.capture({ tier: 0 });
    timeout.scheduler.fireAll();
    await expectCode(timeoutPromise, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Timeout must actively settle the request.");
    check(timeout.bridge.getState().state === "idle", "Timeout must clear pending state.");

    const lifecycle = makeHarness();
    const suspendedPromise = lifecycle.bridge.capture({ tier: 0 });
    const oldSession = lifecycle.bridge.getSessionId();
    check(lifecycle.bridge.suspend() === true && lifecycle.bridge.getState().state === "suspended", "Suspend must invalidate pending work.");
    await expectCode(suspendedPromise, protocol.ERROR_CODES.LIFECYCLE_BLOCKED);
    await expectCode(lifecycle.bridge.capture({ tier: 0 }), protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Suspended bridges must reject capture.");
    check(lifecycle.bridge.resume() === true && lifecycle.bridge.getState().state === "idle", "Resume must reopen the bridge without a second global lifecycle.");
    const resetPromise = lifecycle.bridge.capture({ tier: 0 });
    const resetSource = lifecycle.calls[lifecycle.calls.length - 1];
    const newSession = lifecycle.bridge.resetSession();
    await expectCode(resetPromise, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Session reset must settle old pending work.");
    check(newSession !== oldSession && lifecycle.bridge.getSessionId() === newSession, "resetSession must create a new local session ID.");
    const resetReq = decodeSource(resetSource);
    lifecycle.callbacks[lifecycle.callbacks.length - 1](successResult(resetReq, tierZeroSnapshot()));
    check(lifecycle.bridge.getState().sessionId === newSession, "An old-session callback must not replace the new session.");
}

async function runCollisionTest() {
    const repeatedReq = "req_" + "r".repeat(32);
    const localRuntime = {
        utf8ByteLength: (text) => Buffer.byteLength(text, "utf8"),
        sha256Hex: (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex"),
        randomId: (kind) => kind === "session" ? "session_" + "s".repeat(32) : repeatedReq,
        now: () => 1
    };
    const p = protocolModule.createProtocol(localRuntime);
    const c = contextModule.createContextApi(p);
    const collision = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierZeroSnapshot())); }, p, c);
    await collision.bridge.capture({ tier: 0 });
    await expectCode(collision.bridge.capture({ tier: 0 }), p.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Request ID collision retries must be bounded.");
}

function localId(kind, character) { return kind + "_" + character.repeat(32); }

function createQueuedProtocol(sessionIds, requestIds) {
    const queues = { session: sessionIds.slice(), req: requestIds.slice() };
    const last = { session: sessionIds[sessionIds.length - 1], req: requestIds[requestIds.length - 1] };
    const runtime = {
        utf8ByteLength: (text) => Buffer.byteLength(text, "utf8"),
        sha256Hex: (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex"),
        randomId: (kind) => queues[kind].length ? queues[kind].shift() : last[kind],
        now: () => 1
    };
    const p = protocolModule.createProtocol(runtime);
    return { protocol: p, context: contextModule.createContextApi(p) };
}

async function runSessionIdentityTests() {
    const s1 = localId("session", "a");
    const s2 = localId("session", "b");
    const s3 = localId("session", "c");
    const r1 = localId("req", "d");
    const r2 = localId("req", "e");

    const recoveredPair = createQueuedProtocol([s1, s1, s2], [r1]);
    const recovered = makeHarness(null, recoveredPair.protocol, recoveredPair.context);
    check(recovered.bridge.getSessionId() === s1 && recovered.bridge.resetSession() === s2, "Session collision retries must recover with a later unique ID.");

    const exhaustedPair = createQueuedProtocol([s1, s1, s1, s1, s1, s1], [r1]);
    const exhausted = makeHarness(null, exhaustedPair.protocol, exhaustedPair.context);
    const exhaustedPending = exhausted.bridge.capture({ tier: 0 });
    const exhaustedRequestId = exhausted.bridge.getState().requestId;
    const exhaustedGeneration = exhausted.bridge.getState().generation;
    const exhaustedLifecycleEpoch = exhausted.bridge.getState().bridgeLifecycleEpoch;
    assert.throws(() => exhausted.bridge.resetSession(), (error) => error && error.code === exhaustedPair.protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
    assertions += 1;
    check(exhausted.bridge.getSessionId() === s1 && exhausted.bridge.getState().state === "pending" && exhausted.bridge.getState().requestId === exhaustedRequestId && exhausted.bridge.getState().generation === exhaustedGeneration && exhausted.bridge.getState().bridgeLifecycleEpoch === exhaustedLifecycleEpoch, "Failed reset must preserve the old session, lifecycle epoch, generation and pending request atomically.");
    check(exhausted.bridge.cancel(exhaustedRequestId) === true, "The preserved pending request must remain cancellable after reset failure.");
    await expectCode(exhaustedPending, exhaustedPair.protocol.ERROR_CODES.LIFECYCLE_BLOCKED);

    const historyPair = createQueuedProtocol([s1, s2, s1, s3], [r1, r1, r2]);
    const historyCalls = [];
    const historyCallbacks = [];
    const historyScheduler = makeScheduler();
    const historyBridge = bridgeModule.createContextBridge({
        protocol: historyPair.protocol,
        contextApi: historyPair.context,
        invokeHost(source, callback) { historyCalls.push(source); historyCallbacks.push(callback); if (historyCalls.length === 1) { const req = decodeSource(source); callback(successResult(req, tierZeroSnapshot())); } },
        runtime: { setTimeout: historyScheduler.setTimeout, clearTimeout: historyScheduler.clearTimeout, timeoutMs: 5000 }
    });
    await historyBridge.capture({ tier: 0 });
    check(historyBridge.resetSession() === s2 && historyBridge.resetSession() === s3, "Multiple resets must never reuse an earlier session ID.");
    const nextPending = historyBridge.capture({ tier: 0 });
    const nextRequest = decodeSource(historyCalls[1]);
    check(nextRequest.requestId === r2 && nextRequest.requestId !== r1, "Request ID history must survive session reset and force a unique retry.");
    check(historyBridge.cancel(r1) === false && historyBridge.getState().state === "pending", "An old request ID must not cancel a new request.");
    check(historyBridge.cancel(r2) === true, "The current unique request ID must still cancel its request.");
    await expectCode(nextPending, historyPair.protocol.ERROR_CODES.LIFECYCLE_BLOCKED);

    const latePair = createQueuedProtocol([s1, s2], [r1, r2]);
    const late = makeHarness(null, latePair.protocol, latePair.context);
    const oldPromise = late.bridge.capture({ tier: 0 });
    const oldSource = late.calls[0];
    const oldCallback = late.callbacks[0];
    check(late.bridge.resetSession() === s2, "Successful reset must install a different session.");
    await expectCode(oldPromise, latePair.protocol.ERROR_CODES.LIFECYCLE_BLOCKED);
    const newPromise = late.bridge.capture({ tier: 0 });
    oldCallback(successResult(decodeSource(oldSource), tierZeroSnapshot()));
    check(late.bridge.getState().state === "pending" && late.bridge.getState().sessionId === s2, "An old-session callback must not affect the new pending request.");
    const newSource = late.calls[1];
    late.callbacks[1](successResult(decodeSource(newSource), tierZeroSnapshot()));
    check((await newPromise).sessionId === s2 && late.bridge.getState().state === "idle", "The new-session request must settle exactly once without pending residue.");
}

async function runDriftTests() {
    const bindingHarness = makeHarness((source, callback, callIndex) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot({ layerIndex: callIndex < 2 ? 3 : 4 }))); });
    const a = await bindingHarness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const b = await bindingHarness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    check(bindingHarness.bridge.compareCaptures(a, b, { selectionOrderMeaningful: true }).fresh === true, "Equivalent captures must compare fresh.");
    const changed = await bindingHarness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const changedComparison = bindingHarness.bridge.compareCaptures(a, changed, { selectionOrderMeaningful: true });
    check(changedComparison.reason === "CONTEXT_STALE", "Owned captures with changed layer position must compare stale; got " + JSON.stringify(changedComparison));
    const clone = protocol.deepFreeze(protocol.cloneJson(b));
    check(bindingHarness.bridge.compareCaptures(a, clone, { selectionOrderMeaningful: true }).reason === "CONTEXT_CAPTURE_UNTRUSTED", "A deep clone must not inherit capture ownership.");
    check(bindingHarness.bridge.compareCaptures(a, JSON.parse(JSON.stringify(b))).reason === "CONTEXT_CAPTURE_UNTRUSTED", "A JSON round-trip must not inherit capture ownership.");
    check(bindingHarness.bridge.compareCaptures(a, { ...b }).reason === "CONTEXT_CAPTURE_UNTRUSTED", "A spread clone must not inherit capture ownership.");
    check(bindingHarness.bridge.compareCaptures(a, new Proxy(b, {})).reason === "CONTEXT_CAPTURE_UNTRUSTED", "A Proxy wrapper must not inherit capture ownership.");

    const displayHarness = makeHarness((source, callback, callIndex) => {
        const req = decodeSource(source);
        const snapshot = tierOneSnapshot({ nativeLayerId: callIndex === 0 ? 45 : 46 });
        callback(successResult(req, snapshot));
    });
    const d1 = await displayHarness.bridge.capture({ tier: 1, purpose: "display" });
    const d2 = await displayHarness.bridge.capture({ tier: 1, purpose: "display" });
    check(displayHarness.bridge.compareCaptures(d1, d2, { selectionOrderMeaningful: false }).reason === "CONTEXT_CAPTURE_NOT_EXECUTABLE", "Display captures must not authorize freshness comparison.");

    const setLeft = {
        sessionId: "session-local", tier: 1, fingerprint: null,
        snapshot: { activeComp: { compId: "comp-1" }, selection: [
            { layerId: "layer-a", layerIndex: 1, selectedOrder: 0, matchName: "A", type: "layer" },
            { layerId: "layer-b", layerIndex: 2, selectedOrder: 1, matchName: "B", type: "layer" }
        ] }
    };
    const setRight = protocol.cloneJson(setLeft);
    setRight.snapshot.selection = [
        Object.assign({}, setLeft.snapshot.selection[1], { selectedOrder: 0 }),
        Object.assign({}, setLeft.snapshot.selection[0], { selectedOrder: 1 })
    ];
    check(displayHarness.bridge.compareCaptures(setLeft, setRight, { selectionOrderMeaningful: false }).reason === "CONTEXT_CAPTURE_UNTRUSTED", "Ordinary JSON objects must not enter freshness comparison.");
}

async function runOwnershipAndTierTwoTests() {
    const tierTwoHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        check(req.operation === "captureLayerDetails" && req.tier === 2 && req.scope.purpose === "display", "Tier 2 bridge must use the fixed Host operation and display purpose.");
        callback(successResult(req, tierTwoSnapshot({ details: req.scope.details })));
    });
    const tierTwo = await tierTwoHarness.bridge.captureLayerDetails({ details: ["name", "textPreview", "bounds"], selectionOrderMeaningful: false });
    check(tierTwo.tier === 2 && tierTwo.executable === false && tierTwo.fingerprint === null && Object.isFrozen(tierTwo.snapshot.selection[0]), "Tier 2 bridge captures must be deeply frozen, display-only and non-executable.");
    check(tierTwo.snapshot.selection[0].name === "标题🙂" && tierTwo.snapshot.selection[0].bounds.width === 100, "Tier 2 bridge must preserve only validated display details.");
    check(tierTwoHarness.bridge.compareCaptures(tierTwo, tierTwo).reason === "CONTEXT_CAPTURE_NOT_EXECUTABLE", "Tier 2 ownership must never authorize freshness comparison.");
    await expectCode(tierTwoHarness.bridge.captureLayerDetails({ details: ["name", "name"] }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Duplicate Tier 2 details must be rejected.");
    await expectCode(tierTwoHarness.bridge.captureLayerDetails({ details: ["unknown"] }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unknown Tier 2 details must be rejected.");
    await expectCode(tierTwoHarness.bridge.captureLayerDetails({ details: ["name"], target: {} }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 2 bridge options must reject target-like fields.");
    const getterOptions = {};
    let detailGetterReads = 0;
    Object.defineProperty(getterOptions, "details", { enumerable: true, get() { detailGetterReads += 1; return ["name"]; } });
    await expectCode(tierTwoHarness.bridge.captureLayerDetails(getterOptions), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Tier 2 option getters must fail closed.");
    check(detailGetterReads === 0, "Tier 2 option getters must not execute.");
    check(!JSON.stringify(tierTwoHarness.bridge.getState()).includes("标题") && !JSON.stringify(tierTwoHarness.bridge.getState()).includes("正文"), "Tier 2 raw display data must not enter bridge diagnostics state.");
    const badAuthorityHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        callback(successResult(req, tierTwoSnapshot({ details: req.scope.details, hostInstanceId: "host_bad" })));
    });
    await expectCode(badAuthorityHarness.bridge.captureLayerDetails({ details: ["name"] }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 2 must reject malformed Host authority before returning a capture.");

    const firstHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot())); });
    const secondHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot())); });
    const first = await firstHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const second = await secondHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(firstHarness.bridge.compareCaptures(first, second).reason === "CONTEXT_CAPTURE_UNTRUSTED", "Cross-bridge captures must be rejected before content comparison.");
    check(firstHarness.bridge.compareCaptures(first, {}).reason === "CONTEXT_CAPTURE_UNTRUSTED", "Ordinary fake captures must be rejected.");

    const resetHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot())); });
    const beforeReset = await resetHarness.bridge.capture({ tier: 1, purpose: "binding" });
    resetHarness.bridge.resetSession();
    check(resetHarness.bridge.compareCaptures(beforeReset, beforeReset).reason === "CONTEXT_AUTHORITY_MISMATCH", "A resetSession transition must invalidate old capture authority.");

    const suspendHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot())); });
    const beforeSuspend = await suspendHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const epochBeforeSuspend = suspendHarness.bridge.getState().bridgeLifecycleEpoch;
    check(suspendHarness.bridge.suspend() === true && suspendHarness.bridge.suspend() === false && suspendHarness.bridge.resume() === true, "Suspend must transition once and resume without a second invalidation.");
    check(suspendHarness.bridge.getState().bridgeLifecycleEpoch === epochBeforeSuspend + 1 && suspendHarness.bridge.compareCaptures(beforeSuspend, beforeSuspend).reason === "CONTEXT_AUTHORITY_MISMATCH", "Suspend must increment lifecycle authority exactly once and invalidate old captures.");

    const epochHarness = makeHarness((source, callback, callIndex) => {
        const req = decodeSource(source);
        callback(successResult(req, tierOneSnapshot({ hostReloadEpoch: callIndex + 1 })));
    });
    const oldHost = await epochHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const newHost = await epochHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(epochHarness.bridge.compareCaptures(oldHost, newHost).reason === "CONTEXT_AUTHORITY_MISMATCH", "Host reload epoch changes must reject comparison even when project generation is unchanged.");

    let hold = false;
    const cancelHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (!hold) callback(successResult(req, tierOneSnapshot()));
    });
    const beforeCancel = await cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    hold = true;
    const pending = cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const pendingId = decodeSource(cancelHarness.calls[cancelHarness.calls.length - 1]).requestId;
    check(cancelHarness.bridge.cancel(pendingId) === true, "The current pending request must be cancellable.");
    await expectCode(pending, protocol.ERROR_CODES.LIFECYCLE_BLOCKED);
    hold = false;
    const afterCancel = await cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(cancelHarness.bridge.compareCaptures(beforeCancel, afterCancel).fresh === true, "Cancel and request generation changes must not invalidate existing capture authority.");
    hold = true;
    const timedOut = cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    cancelHarness.scheduler.fireAll();
    await expectCode(timedOut, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Timeout must settle without changing capture authority.");
    hold = false;
    const afterTimeout = await cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(cancelHarness.bridge.compareCaptures(beforeCancel, afterTimeout).fresh === true, "Timeout must not invalidate an existing trusted capture.");

    const originalWeakMap = global.WeakMap;
    try {
        global.WeakMap = undefined;
        assert.throws(() => makeHarness(null), (error) => error && error.code === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Bridge creation must fail closed without WeakMap.");
        assertions += 1;
    } finally {
        global.WeakMap = originalWeakMap;
    }
}

async function runCurrentHostAuthorityTests() {
    const epochHarness = makeHarness((source, callback, callIndex) => {
        const req = decodeSource(source);
        callback(successResult(req, tierOneSnapshot({ hostReloadEpoch: callIndex + 1 })));
    });
    const oldHost = await epochHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const newHost = await epochHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(epochHarness.bridge.compareCaptures(oldHost, newHost).reason === "CONTEXT_AUTHORITY_MISMATCH", "old_new: a newly observed Host epoch must invalidate cross-epoch comparison.");
    check(epochHarness.bridge.compareCaptures(oldHost, oldHost).reason === "CONTEXT_AUTHORITY_MISMATCH", "old_old_after_new: a newly observed Host epoch must invalidate the old capture against itself.");
    check(epochHarness.bridge.compareCaptures(newHost, newHost).fresh === true, "new_new: the capture from the current Host epoch must remain fresh against itself.");

    const tierZeroHarness = makeHarness((source, callback, callIndex) => {
        const req = decodeSource(source);
        const snapshot = callIndex === 0 ? tierOneSnapshot({ hostReloadEpoch: 1 }) : tierZeroSnapshot({ hostReloadEpoch: 2 });
        callback(successResult(req, snapshot));
    });
    const beforeTierZero = await tierZeroHarness.bridge.capture({ tier: 1, purpose: "binding" });
    await tierZeroHarness.bridge.capture({ tier: 0, purpose: "display" });
    check(tierZeroHarness.bridge.compareCaptures(beforeTierZero, beforeTierZero).reason === "CONTEXT_AUTHORITY_MISMATCH", "tier0_authority_update: a valid Tier 0 response must update current Host authority.");

    const tierTwoHarness = makeHarness((source, callback, callIndex) => {
        const req = decodeSource(source);
        const snapshot = callIndex === 0 ? tierOneSnapshot({ hostReloadEpoch: 1 }) : tierTwoSnapshot({ hostReloadEpoch: 2, details: req.scope.details });
        callback(successResult(req, snapshot));
    });
    const beforeTierTwo = await tierTwoHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const tierTwo = await tierTwoHarness.bridge.captureLayerDetails({ details: ["name"] });
    check(tierTwoHarness.bridge.compareCaptures(beforeTierTwo, beforeTierTwo).reason === "CONTEXT_AUTHORITY_MISMATCH", "tier2_authority_update: a valid Tier 2 response must update current Host authority.");
    check(tierTwoHarness.bridge.compareCaptures(tierTwo, tierTwo).reason === "CONTEXT_CAPTURE_NOT_EXECUTABLE", "Tier 2 must remain non-executable after updating current Host authority.");

    async function rejectedResponseDoesNotUpdate(label, responder, expectedCode) {
        const harness = makeHarness((source, callback, callIndex) => {
            const req = decodeSource(source);
            if (callIndex === 0) callback(successResult(req, tierOneSnapshot({ hostReloadEpoch: 1 })));
            else responder(req, callback);
        });
        const trusted = await harness.bridge.capture({ tier: 1, purpose: "binding" });
        await expectCode(harness.bridge.capture({ tier: 1, purpose: "binding" }), expectedCode, label + " must be rejected.");
        check(harness.bridge.compareCaptures(trusted, trusted).fresh === true, label + "_does_not_update: rejected Host data must not update current authority.");
    }

    await rejectedResponseDoesNotUpdate("malformed", (req, callback) => callback("not-json"), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    await rejectedResponseDoesNotUpdate("host_error", (req, callback) => callback(errorResult(req, "HOST_CONTEXT_UNAVAILABLE")), protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE);
    await rejectedResponseDoesNotUpdate("requestId_mismatch", (req, callback) => callback(successResult(Object.assign({}, req, { requestId: "req_" + "x".repeat(32) }), tierOneSnapshot({ hostReloadEpoch: 2 }))), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    await rejectedResponseDoesNotUpdate("sessionId_mismatch", (req, callback) => callback(successResult(Object.assign({}, req, { sessionId: "session_" + "x".repeat(32) }), tierOneSnapshot({ hostReloadEpoch: 2 }))), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    await rejectedResponseDoesNotUpdate("operation_mismatch", (req, callback) => callback(successResult(Object.assign({}, req, { operation: "captureLayerDetails" }), tierOneSnapshot({ hostReloadEpoch: 2 }))), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    await rejectedResponseDoesNotUpdate("invalid_snapshot", (req, callback) => {
        const snapshot = tierOneSnapshot({ hostReloadEpoch: 2 });
        snapshot.selection.count = 2;
        callback(successResult(req, snapshot));
    }, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);
    await rejectedResponseDoesNotUpdate("unknown_snapshot_field", (req, callback) => {
        const snapshot = tierOneSnapshot({ hostReloadEpoch: 2 });
        snapshot.untrusted = true;
        callback(successResult(req, snapshot));
    }, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED);

    const synchronousThrowHarness = makeHarness((source, callback, callIndex) => {
        const request = decodeSource(source);
        if (callIndex === 0) callback(successResult(request, tierOneSnapshot({ hostReloadEpoch: 1 })));
        else throw new Error("local invoke failure");
    });
    const beforeSynchronousThrow = await synchronousThrowHarness.bridge.capture({ tier: 1, purpose: "binding" });
    await expectCode(synchronousThrowHarness.bridge.capture({ tier: 1, purpose: "binding" }), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
    check(synchronousThrowHarness.bridge.compareCaptures(beforeSynchronousThrow, beforeSynchronousThrow).fresh === true, "invokeHost_sync_throw_does_not_update: synchronous Host invocation failure must preserve current authority.");

    const timeoutHarness = makeHarness();
    const timeoutInitial = timeoutHarness.bridge.capture({ tier: 1, purpose: "binding" });
    let req = decodeSource(timeoutHarness.calls[0]);
    timeoutHarness.callbacks[0](successResult(req, tierOneSnapshot({ hostReloadEpoch: 1 })));
    const beforeTimeout = await timeoutInitial;
    const timedOut = timeoutHarness.bridge.capture({ tier: 1, purpose: "binding" });
    req = decodeSource(timeoutHarness.calls[1]);
    timeoutHarness.scheduler.fireAll();
    await expectCode(timedOut, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Timeout must settle before a late authority response.");
    timeoutHarness.callbacks[1](successResult(req, tierOneSnapshot({ hostReloadEpoch: 2 })));
    check(timeoutHarness.bridge.compareCaptures(beforeTimeout, beforeTimeout).fresh === true, "late_callback_does_not_update: a response after timeout must not update current authority.");

    const cancelHarness = makeHarness();
    const cancelInitial = cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    req = decodeSource(cancelHarness.calls[0]);
    cancelHarness.callbacks[0](successResult(req, tierOneSnapshot({ hostReloadEpoch: 1 })));
    const beforeCancel = await cancelInitial;
    const cancelled = cancelHarness.bridge.capture({ tier: 1, purpose: "binding" });
    req = decodeSource(cancelHarness.calls[1]);
    check(cancelHarness.bridge.cancel(req.requestId) === true, "The authority regression request must be cancellable.");
    await expectCode(cancelled, protocol.ERROR_CODES.LIFECYCLE_BLOCKED);
    cancelHarness.callbacks[1](successResult(req, tierOneSnapshot({ hostReloadEpoch: 2 })));
    check(cancelHarness.bridge.compareCaptures(beforeCancel, beforeCancel).fresh === true, "cancelled_late_callback_does_not_update: a response after cancellation must not update current authority.");

    const twiceHarness = makeHarness((source, callback) => {
        const request = decodeSource(source);
        callback(successResult(request, tierOneSnapshot({ hostReloadEpoch: 1 })));
        callback(successResult(request, tierOneSnapshot({ hostReloadEpoch: 2 })));
    });
    const firstCallbackCapture = await twiceHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(twiceHarness.bridge.compareCaptures(firstCallbackCapture, firstCallbackCapture).fresh === true, "callback_twice_second_does_not_update: a second callback must not update current authority.");

    const rollbackHarness = makeHarness((source, callback, callIndex) => {
        const request = decodeSource(source);
        const epoch = callIndex === 0 ? 1 : (callIndex === 1 ? 2 : 1);
        callback(successResult(request, tierOneSnapshot({ hostReloadEpoch: epoch })));
    });
    const epochOne = await rollbackHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const epochTwo = await rollbackHarness.bridge.capture({ tier: 1, purpose: "binding" });
    await expectCode(rollbackHarness.bridge.capture({ tier: 1, purpose: "binding" }), "CONTEXT_AUTHORITY_ROLLBACK", "A lower epoch from the same Host must be rejected.");
    check(rollbackHarness.bridge.compareCaptures(epochTwo, epochTwo).fresh === true, "lower_epoch_does_not_rollback: rejecting an older epoch must preserve current authority.");
    check(rollbackHarness.bridge.compareCaptures(epochOne, epochOne).reason === "CONTEXT_AUTHORITY_MISMATCH", "A rejected lower epoch must not revive the earlier capture.");

    const instanceHarness = makeHarness((source, callback, callIndex) => {
        const request = decodeSource(source);
        callback(successResult(request, tierOneSnapshot(callIndex === 0 ? { hostInstanceId: HOST_A, hostReloadEpoch: 3 } : { hostInstanceId: HOST_B, hostReloadEpoch: 1 })));
    });
    const instanceA = await instanceHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const instanceB = await instanceHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(instanceHarness.bridge.compareCaptures(instanceA, instanceA).reason === "CONTEXT_AUTHORITY_MISMATCH", "different_instance_invalidates_old: adopting a fresh Host instance must invalidate old captures.");
    check(instanceHarness.bridge.compareCaptures(instanceB, instanceB).fresh === true, "A capture from the newly observed Host instance must remain fresh.");

    let sameAuthorityCall = 0;
    const stableHarness = makeHarness((source, callback) => {
        const request = decodeSource(source);
        sameAuthorityCall += 1;
        if (sameAuthorityCall === 3) callback(errorResult(request, "HOST_CONTEXT_UNAVAILABLE"));
        else callback(successResult(request, tierOneSnapshot({ hostReloadEpoch: 1 })));
    });
    const stableOne = await stableHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const stableTwo = await stableHarness.bridge.capture({ tier: 1, purpose: "binding" });
    check(stableHarness.bridge.compareCaptures(stableOne, stableTwo).fresh === true, "Repeated captures from the same authority must remain comparable.");
    await expectCode(stableHarness.bridge.capture({ tier: 1, purpose: "binding" }), protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE);
    check(stableHarness.bridge.compareCaptures(stableOne, stableTwo).fresh === true, "host_error_does_not_update: a Host error must not invalidate confirmed authority.");
}

async function runTierThreeBridgeTests() {
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") {
            callback(successResult(req, tierOneSnapshot()));
            return;
        }
        if (req.operation === "captureLayerDetails") {
            callback(successResult(req, tierTwoSnapshot({ details: req.scope.details })));
            return;
        }
        check(req.operation === "resolvePropertyTargets" && req.tier === 3 && req.scope.purpose === "binding", "Tier 3 Bridge must emit the fixed Host operation.");
        check(!Object.prototype.hasOwnProperty.call(req.scope.targets[0], "layerId"), "Tier 3 Host targets must not receive public layerId metadata.");
        callback(successResult(req, {
            hostInstanceId: HOST_A,
            hostReloadEpoch: 1,
            projectGeneration: 3,
            tier: 3,
            targets: req.scope.targets.map((target) => ({
                targetOrdinal: target.targetOrdinal,
                nativeLayerId: target.nativeLayerId,
                layerIndex: target.layerIndex,
                propertyPath: target.propertyPath,
                propertyMatchName: target.propertyPath[target.propertyPath.length - 2],
                propertyIndex: target.propertyPath[target.propertyPath.length - 3] === "indexed" ? target.propertyPath[target.propertyPath.length - 1] : 2,
                propertyType: "property"
            }))
        }));
    });
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding" });
    const path = ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0];
    const resolved = await harness.bridge.resolvePropertyTargets(binding, [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path }]);
    check(resolved.tier === 3 && resolved.purpose === "target-resolution" && resolved.executable === false && resolved.fingerprint === null, "Tier 3 Bridge results must be frozen non-executable target metadata.");
    check(resolved.snapshot.targets[0].propertyMatchName === "ADBE Position" && resolved.snapshot.targets[0].propertyIndex === 2 && !JSON.stringify(resolved).includes("nativeLayerId"), "Tier 3 public capture must not expose native target identifiers.");
    check(harness.bridge.compareCaptures(resolved, resolved).reason === "CONTEXT_CAPTURE_NOT_EXECUTABLE", "Tier 3 target resolution must not authorize freshness comparison.");
    await expectCode(harness.bridge.resolvePropertyTargets(protocol.deepFreeze(protocol.cloneJson(binding)), [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path }]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A cloned Tier 1 binding must not authorize Tier 3 resolution.");
    await expectCode(harness.bridge.resolvePropertyTargets(binding, [{ layerId: "layer-not-bound", propertyPath: path }]), protocol.ERROR_CODES.UNKNOWN_TARGET, "Tier 3 must reject a layer outside the private binding record.");
    await expectCode(harness.bridge.resolvePropertyTargets(binding, [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path }, { layerId: binding.snapshot.selection[0].layerId, propertyPath: path }]), protocol.ERROR_CODES.UNKNOWN_TARGET, "Tier 3 must reject duplicate public targets.");
    await expectCode(harness.bridge.resolvePropertyTargets(binding, []), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 3 must reject an empty target list.");
    await expectCode(harness.bridge.resolvePropertyTargets(binding, Array.from({ length: 5 }, (_, index) => ({ layerId: binding.snapshot.selection[0].layerId, propertyPath: ["named", "ADBE Group " + index, 0] }))), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 3 must reject more than four targets.");
    await expectCode(harness.bridge.resolvePropertyTargets(binding, [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path, nativeLayerId: 45 }]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 3 must reject caller-supplied native Host metadata.");
    const display = await harness.bridge.capture({ tier: 1, purpose: "display" });
    const details = await harness.bridge.captureLayerDetails({ details: ["name"] });
    await expectCode(harness.bridge.resolvePropertyTargets(display, [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path }]), protocol.ERROR_CODES.UNKNOWN_TARGET, "Tier 3 must reject display-only Tier 1 captures.");
    await expectCode(harness.bridge.resolvePropertyTargets(details, [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path }]), protocol.ERROR_CODES.UNKNOWN_TARGET, "Tier 3 must reject Tier 2 captures.");

    const otherBridge = makeHarness((source, callback) => {
        const req = decodeSource(source);
        callback(successResult(req, req.operation === "captureContext" ? tierOneSnapshot() : tierTwoSnapshot({ details: ["name"] })));
    }).bridge;
    await expectCode(otherBridge.resolvePropertyTargets(binding, [{ layerId: binding.snapshot.selection[0].layerId, propertyPath: path }]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Tier 3 must reject a binding capture from another bridge.");

    const staleHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); }
        else { callback(errorResult(req, "HOST_CONTEXT_AUTHORITY_MISMATCH")); }
    });
    const staleBinding = await staleHarness.bridge.capture({ tier: 1, purpose: "binding" });
    await expectCode(staleHarness.bridge.resolvePropertyTargets(staleBinding, [{ layerId: staleBinding.snapshot.selection[0].layerId, propertyPath: path }]), protocol.ERROR_CODES.CONTEXT_STALE, "A Host authority mismatch during Tier 3 resolution must stale the binding.");

    const terminalMismatchHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, {
            hostInstanceId: HOST_A,
            hostReloadEpoch: 1,
            projectGeneration: 3,
            tier: 3,
            targets: [{
                targetOrdinal: 0,
                nativeLayerId: 45,
                layerIndex: 3,
                propertyPath: req.scope.targets[0].propertyPath,
                propertyMatchName: "ADBE Slider Control",
                propertyIndex: 2,
                propertyType: "property"
            }]
        }));
    });
    const indexedBinding = await terminalMismatchHarness.bridge.capture({ tier: 1, purpose: "binding" });
    await expectCode(terminalMismatchHarness.bridge.resolvePropertyTargets(indexedBinding, [{
        layerId: indexedBinding.snapshot.selection[0].layerId,
        propertyPath: ["indexed", "ADBE Slider Control", 1]
    }]), protocol.ERROR_CODES.CONTEXT_STALE, "Tier 3 must reject a Host terminal index that differs from an indexed path segment.");
}

async function runPropertyValueBridgeTests() {
    const path = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
    const pathTwo = ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0];
    const sentinel = "raw-value-sentinel";
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        check(req.operation === "capturePropertyValues" && req.tier === 3 && req.scope.purpose === "binding", "Property-value Bridge must emit the fixed Host operation.");
        check(!Object.prototype.hasOwnProperty.call(req.scope.targets[0], "layerId") && req.scope.targets[0].targetOrdinal === 0, "Property-value requests must inject private native targets and local ordinals.");
        callback(successResult(req, propertyValueSnapshot(req, { values: req.scope.targets.map((target, index) => index === 0 ? { kind: "string", data: sentinel } : { kind: "number", data: 50 }) })));
    });
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const target = { layerId: binding.snapshot.selection[0].layerId, propertyPath: path };
    const capture = await harness.bridge.capturePropertyValues(binding, [target]);
    check(capture.tier === 3 && capture.purpose === "property-value-binding" && capture.executable === true && /^sha256:[a-f0-9]{64}$/.test(capture.fingerprint), "Property values must produce executable digest-only captures.");
    check(capture.snapshot.targets[0].valueKind === "string" && /^sha256:[a-f0-9]{64}$/.test(capture.snapshot.targets[0].valueDigest), "Property-value captures must expose only kind and digest.");
    check(JSON.stringify(capture).indexOf(sentinel) === -1 && JSON.stringify(harness.bridge.getState()).indexOf(sentinel) === -1, "Raw property values must not survive in public captures or bridge state.");
    check(harness.bridge.compareCaptures(capture, capture).fresh === true, "An unchanged trusted property-value capture must compare fresh.");
    check(harness.bridge.compareCaptures(binding, capture).reason === "CONTEXT_CAPTURE_INCOMPATIBLE", "Tier 1 bindings and property-value captures must be incompatible.");
    const resolutionHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, { hostInstanceId: HOST_A, hostReloadEpoch: 1, projectGeneration: 3, tier: 3, targets: req.scope.targets.map((item) => ({ targetOrdinal: item.targetOrdinal, nativeLayerId: item.nativeLayerId, layerIndex: item.layerIndex, propertyPath: item.propertyPath, propertyMatchName: item.propertyPath[item.propertyPath.length - 2], propertyIndex: 1, propertyType: "property" })) }));
    });
    const resolutionBinding = await resolutionHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const resolution = await resolutionHarness.bridge.resolvePropertyTargets(resolutionBinding, [{ layerId: resolutionBinding.snapshot.selection[0].layerId, propertyPath: path }]);
    check(resolutionHarness.bridge.compareCaptures(resolution, resolution).reason === "CONTEXT_CAPTURE_NOT_EXECUTABLE", "Same-class target resolution remains non-executable.");
    check(harness.bridge.compareCaptures(capture, resolution).reason === "CONTEXT_CAPTURE_UNTRUSTED", "Cross-Bridge comparison must reject before class comparison.");
    await expectCode(harness.bridge.capturePropertyValues(protocol.deepFreeze(protocol.cloneJson(binding)), [target]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Cloned bindings must not issue property-value captures.");
    await expectCode(harness.bridge.capturePropertyValues(binding, [{ layerId: target.layerId, propertyPath: path, nativeLayerId: 45 }]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Callers must not inject native property-value identity.");
    await expectCode(harness.bridge.capturePropertyValues(binding, [target, target]), protocol.ERROR_CODES.UNKNOWN_TARGET, "Duplicate property-value targets must reject.");
    await expectCode(harness.bridge.capturePropertyValues(binding, []), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property-value captures must require at least one target.");
    await expectCode(harness.bridge.capturePropertyValues(binding, Array.from({ length: 5 }, () => target)), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property-value captures must limit targets to four.");
    const four = await harness.bridge.capturePropertyValues(binding, [target, { layerId: target.layerId, propertyPath: pathTwo }]);
    check(four.snapshot.targets.length === 2 && four.snapshot.targets[0].propertyPath[4] === "ADBE Opacity" && four.snapshot.targets[1].propertyPath[4] === "ADBE Position", "Property-value target order must remain public ordinal order.");

    async function expectValueFailure(options, code, message) {
        const failing = makeHarness((source, callback) => {
            const req = decodeSource(source);
            if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
            callback(successResult(req, propertyValueSnapshot(req, options)));
        });
        const freshBinding = await failing.bridge.capture({ tier: 1, purpose: "binding" });
        await expectCode(failing.bridge.capturePropertyValues(freshBinding, [{ layerId: freshBinding.snapshot.selection[0].layerId, propertyPath: path }]), code, message);
    }
    const timeBoundaryHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { sampleTime: 10 })));
    });
    const timeBoundaryBinding = await timeBoundaryHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const atDuration = await timeBoundaryHarness.bridge.capturePropertyValues(timeBoundaryBinding, [{ layerId: timeBoundaryBinding.snapshot.selection[0].layerId, propertyPath: path }]);
    check(atDuration.snapshot.sampleTime === 10, "sampleTime at composition duration must be accepted.");
    const toleranceHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { sampleTime: 10.0000001 })));
    });
    const toleranceBinding = await toleranceHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const atTolerance = await toleranceHarness.bridge.capturePropertyValues(toleranceBinding, [{ layerId: toleranceBinding.snapshot.selection[0].layerId, propertyPath: path }]);
    check(atTolerance.snapshot.sampleTime === 10.0000001, "sampleTime at Host tolerance must be accepted.");
    await expectValueFailure({ sampleTime: 10.0000001000001 }, protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "sampleTime beyond Host tolerance must reject.");
    await expectValueFailure({ targetOrdinal: 1 }, protocol.ERROR_CODES.CONTEXT_STALE, "Property-value ordinal drift must reject.");
    await expectValueFailure({ propertyMatchName: "ADBE Wrong" }, protocol.ERROR_CODES.CONTEXT_STALE, "Property-value match-name drift must reject.");
    await expectValueFailure({ values: [{ kind: "number", data: Array(1025).fill("x").join("") }] }, protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Oversized property value data must reject without partial capture.");

    for (const [hostCode, code] of [["HOST_CONTEXT_VALUE_EVALUATION_DISALLOWED", protocol.ERROR_CODES.CONTEXT_VALUE_EVALUATION_DISALLOWED], ["HOST_CONTEXT_VALUE_UNSUPPORTED", protocol.ERROR_CODES.CONTEXT_VALUE_UNSUPPORTED], ["HOST_CONTEXT_VALUE_INVALID", protocol.ERROR_CODES.CONTEXT_VALUE_INVALID]]) {
        const errors = makeHarness((source, callback) => { const req = decodeSource(source); callback(req.operation === "captureContext" ? successResult(req, tierOneSnapshot()) : errorResult(req, hostCode)); });
        const errorBinding = await errors.bridge.capture({ tier: 1, purpose: "binding" });
        await expectCode(errors.bridge.capturePropertyValues(errorBinding, [{ layerId: errorBinding.snapshot.selection[0].layerId, propertyPath: path }]), code, "Host property-value errors must map one-to-one.");
    }
}

async function runPropertyValueFreshnessTests() {
    const path = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
    let value = 50;
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        if (req.operation === "resolvePropertyTargets") {
            callback(successResult(req, { hostInstanceId: HOST_A, hostReloadEpoch: 1, projectGeneration: 3, tier: 3, targets: req.scope.targets.map((target) => ({ targetOrdinal: target.targetOrdinal, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: target.propertyPath[target.propertyPath.length - 2], propertyIndex: 1, propertyType: "property" })) }));
            return;
        }
        callback(successResult(req, propertyValueSnapshot(req, { values: req.scope.targets.map(() => ({ kind: "number", data: value })) })));
    });
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding" });
    const target = { layerId: binding.snapshot.selection[0].layerId, propertyPath: path };
    const first = await harness.bridge.capturePropertyValues(binding, [target]);
    const resolution = await harness.bridge.resolvePropertyTargets(binding, [target]);
    check(harness.bridge.compareCaptures(first, resolution).reason === "CONTEXT_CAPTURE_INCOMPATIBLE", "Target-resolution and property-value captures from one Bridge must be incompatible.");
    const same = await harness.bridge.capturePropertyValues(binding, [target]);
    check(harness.bridge.compareCaptures(first, same).fresh === true, "Equal property-value captures must compare fresh.");
    value = 51;
    const changed = await harness.bridge.capturePropertyValues(binding, [target]);
    check(harness.bridge.compareCaptures(first, changed).reason === "CONTEXT_STALE", "Property value digest changes must stale comparison.");
    let bindingGeneration = 0;
    const ancestryHarness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") {
            bindingGeneration += 1;
            callback(successResult(req, tierOneSnapshot({ nativeLayerId: bindingGeneration === 1 ? 45 : 46, layerIndex: bindingGeneration === 1 ? 3 : 4 })));
            return;
        }
        callback(successResult(req, propertyValueSnapshot(req)));
    });
    const bindingA = await ancestryHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const propertyA = await ancestryHarness.bridge.capturePropertyValues(bindingA, [{ layerId: bindingA.snapshot.selection[0].layerId, propertyPath: path }]);
    const bindingB = await ancestryHarness.bridge.capture({ tier: 1, purpose: "binding" });
    const propertyB = await ancestryHarness.bridge.capturePropertyValues(bindingB, [{ layerId: bindingB.snapshot.selection[0].layerId, propertyPath: path }]);
    check(ancestryHarness.bridge.compareCaptures(propertyA, propertyB).reason === "CONTEXT_STALE", "Tier 1 binding fingerprint changes must stale property-value captures.");
    const oldSession = first;
    harness.bridge.resetSession();
    check(harness.bridge.compareCaptures(oldSession, oldSession).reason === "CONTEXT_AUTHORITY_MISMATCH", "Session reset must invalidate property-value captures.");
}

async function runPropertyValueReviewPortTests() {
    const opacityPath = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
    const positionPath = ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0];
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { values: [{ kind: "number", data: 25 }] })));
    });
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const target = { layerId: binding.snapshot.selection[0].layerId, propertyPath: opacityPath };
    const value = await harness.bridge.capturePropertyValues(binding, [target]);
    const reviewPort = bridgeModule.createReviewPort(harness.bridge, protocol);
    const review = reviewPort.summarize(binding, value);
    check(bridgeModule.isTrustedReviewPortForProtocol(reviewPort, protocol), "Review port must carry exact Bridge and Protocol identity.");
    check(Object.isFrozen(review) && Object.keys(review).sort().join(",") === "beforeValue,valueKind" && review.beforeValue === 25 && review.valueKind === "number", "Review port must return only a frozen bounded Opacity beforeValue summary.");
    check(!JSON.stringify(value).includes("beforeValue") && !JSON.stringify(value).includes("\"data\"") && !JSON.stringify(value).includes("\"value\""), "Public property-value capture must not expose beforeValue or raw value.");
    check(!Object.prototype.hasOwnProperty.call(harness.bridge, "createReviewPort") && !Object.prototype.hasOwnProperty.call(harness.bridge, "reviewPort"), "Review port must not appear on the public Bridge object.");
    expectThrowCode(() => reviewPort.summarize(protocol.deepFreeze(protocol.cloneJson(binding)), value), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Review port must reject cloned binding captures.");
    expectThrowCode(() => reviewPort.summarize(binding, protocol.deepFreeze(JSON.parse(JSON.stringify(value)))), protocol.ERROR_CODES.CONTEXT_STALE, "Review port must reject JSON-cloned value captures.");

    const nonOpacity = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { values: [{ kind: "number", data: 25 }] })));
    });
    const nonOpacityBinding = await nonOpacity.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const nonOpacityValue = await nonOpacity.bridge.capturePropertyValues(nonOpacityBinding, [{ layerId: nonOpacityBinding.snapshot.selection[0].layerId, propertyPath: positionPath }]);
    const nonOpacityReview = bridgeModule.createReviewPort(nonOpacity.bridge, protocol);
    expectThrowCode(() => nonOpacityReview.summarize(nonOpacityBinding, nonOpacityValue), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Review port must reject non-Opacity targets.");

    const stringValue = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { values: [{ kind: "string", data: "25" }] })));
    });
    const stringBinding = await stringValue.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const stringCapture = await stringValue.bridge.capturePropertyValues(stringBinding, [{ layerId: stringBinding.snapshot.selection[0].layerId, propertyPath: opacityPath }]);
    const stringReview = bridgeModule.createReviewPort(stringValue.bridge, protocol);
    expectThrowCode(() => stringReview.summarize(stringBinding, stringCapture), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Review port must reject non-number Opacity values.");

    const outOfRange = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { values: [{ kind: "number", data: 101 }] })));
    });
    const rangeBinding = await outOfRange.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    await expectCode(outOfRange.bridge.capturePropertyValues(rangeBinding, [{ layerId: rangeBinding.snapshot.selection[0].layerId, propertyPath: opacityPath }]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Out-of-range Opacity beforeValue must fail closed before review.");
}

async function runPropertyValueLifecycleTests() {
    const path = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
    let lateCallback = null;
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        lateCallback = () => callback(successResult(req, propertyValueSnapshot(req)));
    });
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding" });
    const target = { layerId: binding.snapshot.selection[0].layerId, propertyPath: path };
    const pending = harness.bridge.capturePropertyValues(binding, [target]);
    const requestId = harness.bridge.getState().requestId;
    await expectCode(harness.bridge.capturePropertyValues(binding, [target]), protocol.ERROR_CODES.EXECUTION_BUSY, "A pending property-value capture must block a second request.");
    check(harness.bridge.cancel(requestId) === true, "Property-value capture cancellation must settle the active request.");
    await expectCode(pending, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Cancelled property-value captures must reject once.");
    lateCallback();
    check(harness.bridge.getState().state === "idle" && harness.bridge.compareCaptures(binding, binding).fresh === true, "Late property-value callbacks must not register captures or invalidate existing bindings.");
    harness.bridge.suspend();
    await expectCode(harness.bridge.capturePropertyValues(binding, [target]), protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Suspended bridges must reject property-value capture.");
    harness.bridge.resume();
}

async function runPropertyValueSelectionFreshnessInvariantTests() {
    const path = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
    let selectionIncludesB = false;
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") {
            const snapshot = tierOneSnapshot();
            if (selectionIncludesB) {
                snapshot.selection.count = 2;
                snapshot.selection.items.push({ nativeLayerId: 46, layerIndex: 4, selectedOrder: 1, matchName: "ADBE Text Layer", type: "text" });
            }
            callback(successResult(req, snapshot));
            return;
        }
        callback(successResult(req, propertyValueSnapshot(req, { sampleTime: 1, values: req.scope.targets.map(() => ({ kind: "number", data: 50 })) })));
    });
    const bindingA = await harness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const targetA = { layerId: bindingA.snapshot.selection[0].layerId, propertyPath: path };
    const first = await harness.bridge.capturePropertyValues(bindingA, [targetA]);
    selectionIncludesB = true;

    // A historical Tier 1 binding remains usable until a fresh binding is captured.
    // It proves ancestry only, never current selection freshness.
    const replayedOldBinding = await harness.bridge.capturePropertyValues(bindingA, [targetA]);
    check(replayedOldBinding.snapshot.sampleTime === first.snapshot.sampleTime && replayedOldBinding.snapshot.targets[0].valueDigest === first.snapshot.targets[0].valueDigest, "Reusing an old binding can still read the same target but must not be treated as a fresh selection verification.");

    // Execution invariant: fresh Tier 1 binding -> capturePropertyValues(freshBinding, targets)
    // -> compareCaptures(original, fresh). Never reuse a candidate-era binding as current selection proof.
    const bindingB = await harness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const second = await harness.bridge.capturePropertyValues(bindingB, [{ layerId: bindingB.snapshot.selection[0].layerId, propertyPath: path }]);
    const comparison = harness.bridge.compareCaptures(first, second);
    check(comparison.fresh === false && comparison.reason === "CONTEXT_STALE", "A fresh Tier 1 selection change must stale property-value captures through bindingFingerprint ancestry.");
    check(first.snapshot.sampleTime === second.snapshot.sampleTime && first.snapshot.targets[0].valueDigest === second.snapshot.targets[0].valueDigest && JSON.stringify(first.snapshot.targets[0].propertyPath) === JSON.stringify(second.snapshot.targets[0].propertyPath), "Selection-only stale results must retain the same value, sample time and target; ancestry is the differing freshness input.");
}

async function runPropertyValueBudgetBoundaryTests() {
    const paths = [
        ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0],
        ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0],
        ["named", "ADBE Transform Group", 0, "named", "ADBE Scale", 0],
        ["named", "ADBE Transform Group", 0, "named", "ADBE Rotate Z", 0]
    ];
    const exact = "a".repeat(1024);
    const harness = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { values: req.scope.targets.map(() => ({ kind: "string", data: exact })) })));
    });
    const binding = await harness.bridge.capture({ tier: 1, purpose: "binding" });
    const targets = paths.map((propertyPath) => ({ layerId: binding.snapshot.selection[0].layerId, propertyPath }));
    const one = await harness.bridge.capturePropertyValues(binding, [targets[0]]);
    check(one.snapshot.targets[0].valueKind === "string" && !JSON.stringify(one).includes(exact) && !JSON.stringify(harness.bridge.getState()).includes(exact), "A 1024-byte property value must be accepted while raw text remains undisclosed.");
    const four = await harness.bridge.capturePropertyValues(binding, targets);
    check(four.snapshot.targets.length === 4 && four.snapshot.targets.every((target) => target.valueKind === "string" && /^sha256:[a-f0-9]{64}$/.test(target.valueDigest) && !Object.prototype.hasOwnProperty.call(target, "value")), "Four exact 1024-byte targets must meet the 4096-byte aggregate boundary using digest-only output.");

    const oversized = makeHarness((source, callback) => {
        const req = decodeSource(source);
        if (req.operation === "captureContext") { callback(successResult(req, tierOneSnapshot())); return; }
        callback(successResult(req, propertyValueSnapshot(req, { values: req.scope.targets.map((target, index) => ({ kind: "string", data: index === 3 ? "b".repeat(1025) : "b".repeat(1024) })) })));
    });
    const oversizedBinding = await oversized.bridge.capture({ tier: 1, purpose: "binding" });
    const oversizedTargets = paths.map((propertyPath) => ({ layerId: oversizedBinding.snapshot.selection[0].layerId, propertyPath }));
    await expectCode(oversized.bridge.capturePropertyValues(oversizedBinding, oversizedTargets), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "The first representable 4097-byte aggregate response must reject without a partial property-value capture.");
    const recovered = await oversized.bridge.capturePropertyValues(oversizedBinding, [oversizedTargets[0]]);
    check(recovered.snapshot.targets.length === 1 && recovered.snapshot.targets[0].valueKind === "string", "Budget rejection must not create a partial capture or block subsequent valid response validation.");
}

async function runPropertyValueLateCallbackAndResponseDriftTests() {
    const paths = [
        ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0],
        ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0]
    ];
    async function captureBinding(harness) {
        const callIndex = harness.calls.length;
        const pending = harness.bridge.capture({ tier: 1, purpose: "binding" });
        const req = decodeSource(harness.calls[callIndex]);
        harness.callbacks[callIndex](successResult(req, tierOneSnapshot()));
        return pending;
    }

    const timeoutHarness = makeHarness();
    const timeoutBinding = await captureBinding(timeoutHarness);
    const timeoutTarget = { layerId: timeoutBinding.snapshot.selection[0].layerId, propertyPath: paths[0] };
    const timedOut = timeoutHarness.bridge.capturePropertyValues(timeoutBinding, [timeoutTarget]);
    const timeoutRequest = decodeSource(timeoutHarness.calls[1]);
    timeoutHarness.scheduler.fireAll();
    await expectCode(timedOut, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Property-value timeout must settle before any late callback.");
    timeoutHarness.callbacks[1](successResult(timeoutRequest, propertyValueSnapshot(timeoutRequest)));
    timeoutHarness.callbacks[1]("malicious late Host response");
    check(timeoutHarness.bridge.getState().state === "idle" && timeoutHarness.bridge.compareCaptures(timeoutBinding, timeoutBinding).fresh === true, "Timeout callbacks twice must not normalize, register captures or disturb trusted bindings.");
    const timeoutRecovery = timeoutHarness.bridge.capturePropertyValues(timeoutBinding, [timeoutTarget]);
    const timeoutRecoveryRequest = decodeSource(timeoutHarness.calls[2]);
    timeoutHarness.callbacks[2](successResult(timeoutRecoveryRequest, propertyValueSnapshot(timeoutRecoveryRequest)));
    check((await timeoutRecovery).executable === true, "Bridge must recover after property-value timeout callbacks.");

    const suspendHarness = makeHarness();
    const suspendBinding = await captureBinding(suspendHarness);
    const suspendTarget = { layerId: suspendBinding.snapshot.selection[0].layerId, propertyPath: paths[0] };
    const suspended = suspendHarness.bridge.capturePropertyValues(suspendBinding, [suspendTarget]);
    const suspendRequest = decodeSource(suspendHarness.calls[1]);
    check(suspendHarness.bridge.suspend() === true, "Suspending a pending property-value request must succeed.");
    await expectCode(suspended, protocol.ERROR_CODES.LIFECYCLE_BLOCKED, "Suspended property-value requests must reject.");
    suspendHarness.callbacks[1](successResult(suspendRequest, propertyValueSnapshot(suspendRequest)));
    suspendHarness.callbacks[1]("malicious suspended late Host response");
    check(suspendHarness.bridge.getState().state === "suspended", "Suspend callbacks twice must not normalize or change Bridge state.");
    suspendHarness.bridge.resume();
    const resumedBinding = await captureBinding(suspendHarness);
    const resumedTarget = { layerId: resumedBinding.snapshot.selection[0].layerId, propertyPath: paths[0] };
    const suspendRecovery = suspendHarness.bridge.capturePropertyValues(resumedBinding, [resumedTarget]);
    const suspendRecoveryRequest = decodeSource(suspendHarness.calls[3]);
    suspendHarness.callbacks[3](successResult(suspendRecoveryRequest, propertyValueSnapshot(suspendRecoveryRequest)));
    check((await suspendRecovery).executable === true, "Bridge must recover after suspended late callbacks.");

    const reorderHarness = makeHarness();
    const reorderBinding = await captureBinding(reorderHarness);
    const reorderTargets = paths.map((propertyPath) => ({ layerId: reorderBinding.snapshot.selection[0].layerId, propertyPath }));
    const reordered = reorderHarness.bridge.capturePropertyValues(reorderBinding, reorderTargets);
    const reorderRequest = decodeSource(reorderHarness.calls[1]);
    const reorderedSnapshot = propertyValueSnapshot(reorderRequest);
    reorderedSnapshot.targets.reverse();
    await expectCode((reorderHarness.callbacks[1](successResult(reorderRequest, reorderedSnapshot)), reordered), protocol.ERROR_CODES.CONTEXT_STALE, "Host-reordered property-value targets must reject as one response.");
    const reorderRecovery = reorderHarness.bridge.capturePropertyValues(reorderBinding, [reorderTargets[0]]);
    const reorderRecoveryRequest = decodeSource(reorderHarness.calls[2]);
    reorderHarness.callbacks[2](successResult(reorderRecoveryRequest, propertyValueSnapshot(reorderRecoveryRequest)));
    check((await reorderRecovery).snapshot.targets.length === 1, "Target reorder rejection must not leave a partial ownership record.");

    const partialHarness = makeHarness();
    const partialBinding = await captureBinding(partialHarness);
    const partialTargets = paths.map((propertyPath) => ({ layerId: partialBinding.snapshot.selection[0].layerId, propertyPath }));
    const partial = partialHarness.bridge.capturePropertyValues(partialBinding, partialTargets);
    const partialRequest = decodeSource(partialHarness.calls[1]);
    const partialSnapshot = propertyValueSnapshot(partialRequest);
    partialSnapshot.targets = partialSnapshot.targets.slice(0, 1);
    await expectCode((partialHarness.callbacks[1](successResult(partialRequest, partialSnapshot)), partial), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Partial Host property-value targets must reject as one response.");
    const partialRecovery = partialHarness.bridge.capturePropertyValues(partialBinding, [partialTargets[0]]);
    const partialRecoveryRequest = decodeSource(partialHarness.calls[2]);
    partialHarness.callbacks[2](successResult(partialRecoveryRequest, propertyValueSnapshot(partialRecoveryRequest)));
    check((await partialRecovery).snapshot.targets.length === 1, "Partial target rejection must not leave ownership that blocks a later valid capture.");

    const twiceHarness = makeHarness();
    const twiceBinding = await captureBinding(twiceHarness);
    const twiceTarget = { layerId: twiceBinding.snapshot.selection[0].layerId, propertyPath: paths[0] };
    const firstCallback = twiceHarness.bridge.capturePropertyValues(twiceBinding, [twiceTarget]);
    const firstRequest = decodeSource(twiceHarness.calls[1]);
    twiceHarness.callbacks[1](successResult(firstRequest, propertyValueSnapshot(firstRequest, { values: [{ kind: "number", data: 50 }] })));
    const firstCapture = await firstCallback;
    const digest = firstCapture.snapshot.targets[0].valueDigest;
    const fingerprint = firstCapture.fingerprint;
    twiceHarness.callbacks[1](successResult(firstRequest, propertyValueSnapshot(firstRequest, { values: [{ kind: "number", data: 51 }] })));
    check(firstCapture.fingerprint === fingerprint && firstCapture.snapshot.targets[0].valueDigest === digest && twiceHarness.bridge.compareCaptures(firstCapture, firstCapture).fresh === true, "A second callback after successful property-value capture must be ignored and cannot alter the registered capture.");
}

function runQuoteAndModuleTests() {
    const quoted = bridgeModule.quoteForExtendScript('"\\\r\n\u2028\u2029中🙂');
    check(quoted.indexOf("\\\"") !== -1 && quoted.indexOf("\\\\") !== -1 && quoted.indexOf("\\u2028") !== -1 && quoted.indexOf("\\u2029") !== -1, "Quote helper must escape quotes, slashes and line separators.");
    check(quoted.indexOf("中") === -1 && quoted.indexOf("🙂") === -1 && /\\u4e2d/.test(quoted), "Quote helper must encode non-ASCII UTF-16 code units.");

    const source = fs.readFileSync(path.join(ROOT, "client", "js", "vela", "velaContextBridge.js"), "utf8");
    check(!/(?:CSInterface|\.evalScript\s*\(|\bdocument\b|localStorage|XMLHttpRequest|WebSocket|fetch\s*\(|\bapp\b|\$\.evalFile)/.test(source), "Context bridge must not directly depend on CEP, DOM, network or AE globals.");
    check(!/require\([^)]+(?:crypto|fs|http|https|net)/.test(source), "Context bridge CommonJS dependencies must remain fixed local modules.");

    const realm = { self: null, console };
    realm.self = realm;
    vm.createContext(realm);
    ["velaProtocol.js", "velaContext.js", "velaContextBridge.js"].forEach((file) => {
        vm.runInContext(fs.readFileSync(path.join(ROOT, "client", "js", "vela", file), "utf8"), realm, { filename: file });
    });
    realm.testRuntime = {
        utf8ByteLength: (text) => Buffer.byteLength(text, "utf8"),
        sha256Hex: (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex"),
        randomId: (kind) => kind + "_" + "a".repeat(32),
        now: () => 1
    };
    const scheduler = makeScheduler();
    realm.testSetTimeout = scheduler.setTimeout;
    realm.testClearTimeout = scheduler.clearTimeout;
    vm.runInContext([
        "var browserProtocol = VelaProtocol.createProtocol(testRuntime);",
        "var browserContext = VelaContext.createContextApi(browserProtocol);",
        "var browserBridge = VelaContextBridge.createContextBridge({",
        "  protocol: browserProtocol,",
        "  contextApi: browserContext,",
        "  invokeHost: function () {},",
        "  runtime: { setTimeout: testSetTimeout, clearTimeout: testClearTimeout, timeoutMs: 1000 }",
        "});"
    ].join("\n"), realm);
    const browserBridge = realm.browserBridge;
    check(/^session_/.test(browserBridge.getSessionId()), "Browser UMD path must construct a working bridge with trusted dependencies.");
}

async function run() {
    const unhandled = [];
    function onUnhandled(error) { unhandled.push(error); }
    process.on("unhandledRejection", onUnhandled);
    try {
        await runBasicTests();
        await runStateMachineTests();
        await runCollisionTest();
        await runSessionIdentityTests();
        await runDriftTests();
        await runOwnershipAndTierTwoTests();
        await runCurrentHostAuthorityTests();
        await runTierThreeBridgeTests();
        await runPropertyValueBridgeTests();
        await runPropertyValueReviewPortTests();
        await runPropertyValueFreshnessTests();
        await runPropertyValueLifecycleTests();
        await runPropertyValueSelectionFreshnessInvariantTests();
        await runPropertyValueBudgetBoundaryTests();
        await runPropertyValueLateCallbackAndResponseDriftTests();
        runQuoteAndModuleTests();
        await new Promise((resolve) => setImmediate(resolve));
        check(unhandled.length === 0, "Bridge tests must not produce unhandled Promise rejections.");
    } finally {
        process.removeListener("unhandledRejection", onUnhandled);
    }
    console.log("PASS Vela context bridge: " + assertions + " assertions.");
}

run().catch((error) => {
    console.error("FAIL Vela context bridge - " + error.message + "\n" + (error.stack || ""));
    process.exitCode = 1;
});
