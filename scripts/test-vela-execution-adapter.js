#!/usr/bin/env node
"use strict";

const assert = require("assert");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const adapterModule = require("../client/js/vela/velaExecutionAdapter");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function runtime() { let n = 0; return { utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: () => "a".repeat(64), randomId: (kind) => kind + "_" + String(++n).padStart(32, "0"), now: () => 1 }; }
function expectCode(fn, code, message) { assert.throws(fn, (error) => error && error.code === code, message); assertions += 1; }
async function expectRejectCode(promise, code, message) { await assert.rejects(promise, (error) => error && error.code === code, message); assertions += 1; }
const PATH = ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0];
function decodeContextSource(source) {
    const prefix = "AEToolbox.VelaContext.handle(";
    assert.ok(source.startsWith(prefix) && source.endsWith(")"), "Unexpected context Host facade.");
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}
function contextSuccess(request, snapshot) {
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot });
}
function bindingSnapshot() {
    return { hostInstanceId: "host_0123456789abcdef0123456789abcdef0123456789abcdef", hostReloadEpoch: 1, tier: 1, projectGeneration: 3, activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 45, layerIndex: 3, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }] } };
}
function valueSnapshot(request, digest) {
    return { hostInstanceId: "host_0123456789abcdef0123456789abcdef0123456789abcdef", hostReloadEpoch: 1, projectGeneration: 3, sampleTime: 1, tier: 3, targets: request.scope.targets.map((target) => ({ targetOrdinal: target.targetOrdinal, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: 50 } })) };
}
async function makeExecutionHarness(hostResponder) {
    const protocol = protocolModule.createProtocol(runtime());
    const contextApi = contextModule.createContextApi(protocol);
    const contextCalls = [];
    const hostCalls = [];
    const bridge = bridgeModule.createContextBridge({
        protocol,
        contextApi,
        invokeHost(source, callback) {
            const request = decodeContextSource(source);
            contextCalls.push(request);
            callback(contextSuccess(request, request.operation === "captureContext" ? bindingSnapshot() : valueSnapshot(request)));
        },
        runtime: { setTimeout() { return 1; }, clearTimeout() {}, timeoutMs: 10 }
    });
    const binding = await bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const target = { layerId: binding.snapshot.selection[0].layerId, propertyPath: PATH };
    const valueCapture = await bridge.capturePropertyValues(binding, [target]);
    const action = protocol.deepFreeze({ kind: "tool", target: { contextFingerprint: binding.fingerprint, contextTier: 3, layerId: target.layerId, propertyPath: PATH, propertyMatchName: "ADBE Opacity", propertyValueDigest: valueCapture.snapshot.targets[0].valueDigest }, payload: { toolId: "vela", actionId: "set-opacity-v1", params: { opacity: 75 } } });
    const port = bridgeModule.createExecutionPort(bridge, protocol);
    const adapter = adapterModule.createExecutionAdapter({ protocol, contextApi, contextBridge: bridge, executionPort: port, invokeHost(source, callback) { hostCalls.push(source); hostResponder(source, callback); } });
    return { protocol, contextApi, adapter, action, trustedExecutionContext: Object.freeze({ bindingCapture: binding, valueCapture }), hostCalls, contextCalls };
}
function decodeExecutionSource(source) {
    const prefix = "AEToolbox.VelaExecution.handle(";
    assert.ok(source.startsWith(prefix) && source.endsWith(")"), "Unexpected execution Host facade.");
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}
function hostError(request, code) {
    return JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: false, hostExecutionRevision: "vela-execution-host-v1", error: { code, message: "The Vela Host execution request was rejected." } });
}
function run() {
    const protocol = protocolModule.createProtocol(runtime());
    const contextApi = contextModule.createContextApi(protocol);
    const bridge = bridgeModule.createContextBridge({ protocol, contextApi, invokeHost() {}, runtime: { setTimeout() { return 1; }, clearTimeout() {}, timeoutMs: 10 } });
    const port = bridgeModule.createExecutionPort(bridge, protocol);
    check(bridgeModule.isTrustedExecutionPortForProtocol(port, protocol), "Bridge issues a private execution port only for its exact Protocol.");
    expectCode(() => adapterModule.createExecutionAdapter({ protocol, contextApi, contextBridge: bridge, executionPort: { buildRequest() {} }, invokeHost() {} }), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Adapter rejects a forged execution port before any Host call.");
    const adapter = adapterModule.createExecutionAdapter({ protocol, contextApi, contextBridge: bridge, executionPort: port, invokeHost() {} });
    check(adapterModule.isTrustedExecutionAdapterForProtocol(adapter, protocol) && Object.isFrozen(adapter), "Adapter is protocol-bound and frozen.");
    check(!Object.prototype.hasOwnProperty.call(adapter, "contextBridge") && !Object.prototype.hasOwnProperty.call(adapter, "executionPort"), "Adapter never exposes trusted bridge or private port references.");
    check(!/\beval\s*\(|\bFunction\s*\(/.test(require("fs").readFileSync(require("path").join(__dirname, "..", "client", "js", "vela", "velaExecutionAdapter.js"), "utf8")), "Execution adapter contains no dynamic-code path.");
    return makeExecutionHarness((source, callback) => {
        const request = decodeExecutionSource(source);
        callback(hostError(request, "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE"));
        callback(hostError(request, "HOST_EXECUTION_READ_FAILED"));
    }).then(async (harness) => {
        await expectRejectCode(harness.adapter.executeValidatedAction(harness.action, Object.freeze({}), harness.trustedExecutionContext), harness.protocol.ERROR_CODES.PLAN_FAILED, "Committed-result unavailable maps to PLAN_FAILED.");
        check(harness.hostCalls.length === 1, "Adapter must invoke Host at most once and ignore duplicate callbacks.");
        console.log("test-vela-execution-adapter: " + assertions + " assertions passed.");
    });
}
Promise.resolve().then(run).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
