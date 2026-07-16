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
let assertions = 0;

function check(condition, message) { assert.ok(condition, message); assertions += 1; }
async function expectCode(value, code, message) {
    await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message || ("Expected " + code));
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
        hostAdapterRevision: "vela-context-host-v1",
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
        hostAdapterRevision: "vela-context-host-v1",
        error: { code, message: "A local safe Host context error." }
    });
}

function tierZeroSnapshot() {
    return { tier: 0, capabilities: { maxTier: 1, nativeLayerIdAvailable: false, bindingContextAvailable: false, hostAdapterRevision: "vela-context-host-v1" } };
}

function tierOneSnapshot(options) {
    options = options || {};
    const native = options.native !== false;
    const item = { layerIndex: options.layerIndex || 3, selectedOrder: options.selectedOrder || 0, matchName: "ADBE Text Layer", type: "text" };
    if (native) { item.nativeLayerId = options.nativeLayerId || 45; }
    return {
        tier: 1,
        projectGeneration: options.projectGeneration || 3,
        activeComp: options.noComp ? null : { itemId: 12, projectGeneration: options.projectGeneration || 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 },
        selection: { count: options.noComp ? 0 : 1, identityQuality: native ? "native-layer-id" : "index-only", items: options.noComp ? [] : [item] }
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
    assert.throws(() => exhausted.bridge.resetSession(), (error) => error && error.code === exhaustedPair.protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE);
    assertions += 1;
    check(exhausted.bridge.getSessionId() === s1 && exhausted.bridge.getState().state === "pending" && exhausted.bridge.getState().requestId === exhaustedRequestId && exhausted.bridge.getState().generation === exhaustedGeneration, "Failed reset must preserve the old session, generation and pending request atomically.");
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
    const bindingHarness = makeHarness((source, callback) => { const req = decodeSource(source); callback(successResult(req, tierOneSnapshot())); });
    const a = await bindingHarness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const b = await bindingHarness.bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    check(bindingHarness.bridge.compareCaptures(a, b, { selectionOrderMeaningful: true }).fresh === true, "Equivalent captures must compare fresh.");
    const reordered = protocol.deepFreeze(protocol.cloneJson(b));
    const changedIndex = protocol.cloneJson(reordered);
    changedIndex.snapshot.selection[0].layerIndex = 4;
    check(bindingHarness.bridge.compareCaptures(a, changedIndex, { selectionOrderMeaningful: true }).reason === protocol.ERROR_CODES.CONTEXT_STALE, "Layer reorder must be stale even with the same layerId.");

    const displayHarness = makeHarness((source, callback, callIndex) => {
        const req = decodeSource(source);
        const snapshot = tierOneSnapshot({ nativeLayerId: callIndex === 0 ? 45 : 46 });
        callback(successResult(req, snapshot));
    });
    const d1 = await displayHarness.bridge.capture({ tier: 1, purpose: "display" });
    const d2 = await displayHarness.bridge.capture({ tier: 1, purpose: "display" });
    check(displayHarness.bridge.compareCaptures(d1, d2, { selectionOrderMeaningful: false }).fresh === false, "Selection identity changes must be stale for set-like comparison.");

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
    check(displayHarness.bridge.compareCaptures(setLeft, setRight, { selectionOrderMeaningful: false }).fresh === true, "Set-like comparison must ignore selection order and selectedOrder.");
    check(displayHarness.bridge.compareCaptures(setLeft, setRight, { selectionOrderMeaningful: true }).fresh === false, "Ordered comparison must detect selection order drift.");
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
