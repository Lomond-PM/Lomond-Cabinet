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
async function makeRenameExecutionHarness(hostResponder) {
    const protocol = protocolModule.createProtocol(runtime());
    const contextApi = contextModule.createContextApi(protocol);
    const hostCalls = [];
    const bridge = bridgeModule.createContextBridge({ protocol, contextApi, invokeHost(source, callback) {
        const request = decodeContextSource(source);
        const snapshot = request.operation === "captureContext" ? bindingSnapshot() : { hostInstanceId: "host_0123456789abcdef0123456789abcdef0123456789abcdef", hostReloadEpoch: 1, projectGeneration: 3, tier: 3, target: { itemId: 12, nativeLayerId: 45, layerIndex: 3, targetKind: "layer-attribute", attribute: "name", value: { kind: "string", data: "Layer A" } } };
        callback(contextSuccess(request, snapshot));
    }, runtime: { setTimeout() { return 1; }, clearTimeout() {}, timeoutMs: 10 } });
    const binding = await bridge.capture({ tier: 1, purpose: "binding", selectionOrderMeaningful: true });
    const layerId = binding.snapshot.selection[0].layerId;
    const valueCapture = await bridge.captureLayerAttributeValue(binding, { layerId, targetKind: "layer-attribute", attribute: "name" });
    const action = protocol.deepFreeze({ kind: "tool", target: { contextFingerprint: binding.fingerprint, contextTier: 3, layerId, targetKind: "layer-attribute", attribute: "name", propertyValueDigest: valueCapture.snapshot.target.valueDigest }, payload: { toolId: "vela", actionId: "set-layer-name-v1", params: { name: " 主标题 " } } });
    const port = bridgeModule.createExecutionPort(bridge, protocol);
    const adapter = adapterModule.createExecutionAdapter({ protocol, contextApi, contextBridge: bridge, executionPort: port, invokeHost(source, callback) { hostCalls.push(source); hostResponder(source, callback, contextApi); } });
    return { protocol, adapter, action, trustedExecutionContext: Object.freeze({ bindingCapture: binding, valueCapture }), hostCalls };
}
function decodeExecutionSource(source) {
    const prefix = "AEToolbox.VelaExecution.handle(";
    assert.ok(source.startsWith(prefix) && source.endsWith(")"), "Unexpected execution Host facade.");
    return JSON.parse(JSON.parse(source.slice(prefix.length, -1)));
}
function hostError(request, code, mutationCommitted) {
    return JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: false, hostExecutionRevision: "vela-execution-host-v1", error: { code, message: "The Vela Host execution request was rejected.", mutationCommitted } });
}
function hostSuccess(request) {
    return JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: true, hostExecutionRevision: "vela-execution-host-v1", result: { capabilityId: "set-opacity-v1", valueKind: "number", resultingValueDigest: "sha256:" + "a".repeat(64) } });
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
        callback(hostError(request, "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE", true));
        callback(hostError(request, "HOST_EXECUTION_READ_FAILED", false));
    }).then(async (harness) => {
        await assert.rejects(harness.adapter.executeValidatedAction(harness.action, Object.freeze({}), harness.trustedExecutionContext), (error) => { check(error.code === harness.protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE && error.committed === true, "Committed-result unavailable maps to VERIFICATION_UNAVAILABLE with committed true."); return true; });
        check(harness.hostCalls.length === 1, "Adapter must invoke Host at most once and ignore duplicate callbacks.");
        const mutationFailed = await makeExecutionHarness((source, callback) => { callback(hostError(decodeExecutionSource(source), "HOST_EXECUTION_MUTATION_FAILED", null)); });
        await assert.rejects(mutationFailed.adapter.executeValidatedAction(mutationFailed.action, Object.freeze({}), mutationFailed.trustedExecutionContext), (error) => { check(error.code === mutationFailed.protocol.ERROR_CODES.PLAN_FAILED && error.committed === null, "Mutation failure preserves unknown commit truth."); return true; });
        const precommit = await makeExecutionHarness((source, callback) => { callback(hostError(decodeExecutionSource(source), "HOST_EXECUTION_TARGET_NOT_FOUND", false)); });
        await assert.rejects(precommit.adapter.executeValidatedAction(precommit.action, Object.freeze({}), precommit.trustedExecutionContext), (error) => { check(error.code === precommit.protocol.ERROR_CODES.UNKNOWN_TARGET && error.committed === false, "Target missing preserves committed false."); return true; });
        const unknown = await makeExecutionHarness(() => { throw new Error("transport"); });
        await assert.rejects(unknown.adapter.executeValidatedAction(unknown.action, Object.freeze({}), unknown.trustedExecutionContext), (error) => { check(error.code === unknown.protocol.ERROR_CODES.VERIFICATION_UNAVAILABLE && error.committed === null, "Host dispatch transport failure preserves committed null."); return true; });
        const success = await makeExecutionHarness((source, callback) => { callback(hostSuccess(decodeExecutionSource(source))); });
        const successResult = await success.adapter.executeValidatedAction(success.action, Object.freeze({}), success.trustedExecutionContext);
        check(successResult.ok === true && successResult.committed === true && Object.isFrozen(successResult), "Successful Adapter result carries bounded committed true.");
        const rename = await makeRenameExecutionHarness((source, callback, contextApi) => {
            const request = decodeExecutionSource(source);
            check(request.capabilityId === "set-layer-name-v1" && request.scope.target.targetKind === "layer-attribute" && request.scope.params.name === " 主标题 ", "Adapter emits one closed exact-target rename request without recanonicalizing the name.");
            callback(JSON.stringify({ protocol: "vela.host-execution-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: "executeCapability", ok: true, hostExecutionRevision: "vela-execution-host-v1", result: { capabilityId: "set-layer-name-v1", valueKind: "string", resultingValueDigest: contextApi.digestPropertyValue("string", " 主标题 ") } }));
        });
        const renameResult = await rename.adapter.executeValidatedAction(rename.action, Object.freeze({}), rename.trustedExecutionContext);
        check(renameResult.ok === true && renameResult.committed === true && renameResult.summary.capabilityId === "set-layer-name-v1" && rename.hostCalls.length === 1, "Adapter preserves rename committed true and invokes Host exactly once.");
        console.log("test-vela-execution-adapter: " + assertions + " assertions passed.");
    });
}
Promise.resolve().then(run).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
