"use strict";
// Trusted local Host fixture; never contacts or executes After Effects.
const protocolModule = require("../../client/js/vela/velaProtocol");
const contextModule = require("../../client/js/vela/velaContext");
const bridgeModule = require("../../client/js/vela/velaContextBridge");
const transportModule = require("../../client/js/vela/velaLocalTransport");
const controllerModule = require("../../client/js/vela/velaProviderController");
const nodeRuntime = require("../velaNodeRuntime");
const message = "把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test";
const cases = [
    { id: "A", opacity: 100, name: "Layer 1" },
    { id: "B", opacity: 60, name: "Layer 1" },
    { id: "C", opacity: 100, name: "Vela Stream Test" },
    { id: "D", opacity: 60, name: "Vela Stream Test" }
];
function createHarness(options) {
    const protocol = protocolModule.createProtocol(nodeRuntime);
    const context = contextModule.createContextApi(protocol);
    const operations = [];
    const bridge = bridgeModule.createContextBridge({ protocol, contextApi: context,
        runtime: { setTimeout, clearTimeout, timeoutMs: 1000 },
        invokeHost(source, callback) {
            const request = JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1)));
            operations.push(request.operation);
            const base = { hostInstanceId: "host_" + "a".repeat(48), hostReloadEpoch: 1, projectGeneration: 1 };
            let snapshot;
            if (request.operation === "captureContext") {
                snapshot = { ...base, tier: 1,
                    activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 },
                    selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] }
                };
            } else if (request.operation === "capturePropertyValues") {
                snapshot = { ...base, tier: 3, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: options.opacity } })) };
            } else { throw Error("Unexpected Host operation: " + request.operation); }
            callback(JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }));
        }
    });
    const transport = transportModule.createLocalTransport({ protocol, TextDecoder, fetch: options.fetch });
    const runtime = { setTimeout, clearTimeout, nowMs: Date.now,
        createAbortController() { const value = new AbortController(); return { signal: value.signal, abort() { value.abort(); } }; },
        parseUrl(value) { const url = new URL(value); return Object.fromEntries(["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"].map(key => [key, url[key]])); }
    };
    const controller = controllerModule.createProviderController({ protocol, contextBridge: bridge, transport, runtime, streaming: true });
    return { controller, operations, send: (input = message) => controller.send({ message: input, endpoint: "http://127.0.0.1:1234", model: options.model || "qwen3.5-4b" }) };
}
module.exports = { createHarness, cases, message };
