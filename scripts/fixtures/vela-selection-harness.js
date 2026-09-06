"use strict";
// Complete production JS owners, deterministic simulated Host/Provider boundaries.
// No AE process or network is contacted. Baseline loader reads immutable git blobs.
const fs = require("fs"), path = require("path"), Module = require("module"), cp = require("child_process");
const root = path.resolve(__dirname, "../..");
const sourceCache = new Map();
function loader(ref, observer, options, evidence) {
    const cache = new Map();
    function load(name) {
        const filename = path.resolve(root, "client/js/vela", name.endsWith(".js") ? name : name + ".js");
        if (cache.has(filename)) return cache.get(filename).exports;
        const m = new Module(filename, module); m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, m);
        m.require = function (request) { if (request === "__selectionCanonicalRecorder") return value => evidence.canonical.push(JSON.stringify(value)); return request.startsWith("./") ? load(request.slice(2)) : require(request); };
        const source = sourceCache.get((ref || "working") + filename) || (ref ? cp.execFileSync("git", ["show", ref + ":" + path.relative(root, filename).replace(/\\/g, "/")], { encoding: "utf8" }) : fs.readFileSync(filename, "utf8"));
        sourceCache.set((ref || "working") + filename, source);
        // Test-only read observation on both immutable and current sources; the
        // canonical request is never replaced, including with A2 debug disabled.
        const compiledSource = path.basename(filename, ".js") === "velaProviderAdapter" ? source.replace("recordContextEvidence(requestId, request, body, null);", "recordContextEvidence(requestId, request, body, null); require(\"__selectionCanonicalRecorder\")(request);") : source;
        m._compile(compiledSource, filename); m.loaded = true;
        const factory = { velaAgentDriver: "createAgentDriver", velaExecutionPreflight: "createExecutionPreflight", velaExecutionAdapter: "createExecutionAdapter", velaConfirmedAuthorityComposer: "createConfirmedAuthorityComposer" }[path.basename(filename, ".js")];
        if (observer && factory) {
            const original = m.exports[factory];
            m.exports = Object.freeze({ ...m.exports, [factory](opts) {
                const key = factory === "createConfirmedAuthorityComposer" ? "onTrajectoryAssociation" : "onTrajectoryFact";
                return original({ ...opts, [key](fact) { if (opts[key]) opts[key](fact); observer(fact); } });
            } });
        }
        if (path.basename(filename, ".js") === "velaProviderController") {
            const original = m.exports.createProviderController;
            m.exports = Object.freeze({ ...m.exports, createProviderController(opts) {
                const controller = original({ ...opts, streaming: options.streaming !== false, debugContextEvidence: options.debug !== false });
                evidence.controllers.push(controller); return controller;
            }});
        }
        if (path.basename(filename, ".js") === "velaProviderAdapter") {
            const original = m.exports.createLocalOpenAICompatibleProvider;
            m.exports = Object.freeze({ ...m.exports, createLocalOpenAICompatibleProvider(opts) {
                const provider = original({ ...opts, onSelectionBudget(budget) { if (options.selectionObserver) options.selectionObserver(budget); if (opts.onSelectionBudget) opts.onSelectionBudget(budget); } });
                return Object.freeze({ ...provider, start(input) { const result = provider.start(input); evidence.inputs.push(provider.getContextEvidence()); return result; } });
            }, ...(options.evaluatorThrows ? { evaluateContextSelection() { throw Error("injected evidence failure"); } } : {}) });
        }
        if (path.basename(filename, ".js") === "velaAgentRuntimeOwner") {
            m.exports = Object.freeze({ ...m.exports,
                ...(options.sampleThrows ? { sampleSelectionSource() { throw Error("injected source read failure"); } } : {}),
                ...(options.sourceDisappears ? { isSelectionSampleCurrent() { return false; } } : {}) });
        }
        if (path.basename(filename, ".js") === "velaRuntime") {
            const original = m.exports.createRuntime;
            m.exports = Object.freeze({ ...m.exports, createRuntime(opts) {
                const runtime = original(opts);
                return Object.freeze({ ...runtime, getAgentDriverRuntimePort() {
                    const port = runtime.getAgentDriverRuntimePort();
                    if (!port || !port.attachSelectionSource) return port;
                    return Object.freeze({ ...port, attachSelectionSource(source) { evidence.sourcePorts.push(source); return port.attachSelectionSource(source); } });
                } });
            } });
        }
        return m.exports;
    }
    return load;
}
async function flush() { for (let i = 0; i < 150; i++) await Promise.resolve(); }
async function create(options = {}) {
    const evidence = { inputs: [], canonical: [], controllers: [], sourcePorts: [] };
    const load = loader(options.baseline, options.reportObserver, options, evidence), events = [], requests = [], wires = [], waiting = [];
    let id = 0;
    const env = { ...require("../velaNodeRuntime"), randomId(kind) { return kind + "_" + String(++id).padStart(32, "0"); }, now: () => 100, setTimeout, clearTimeout, TextDecoder };
    const p = load("velaProtocol").createProtocol(env), context = load("velaContext").createContextApi(p);
    const state = { unavailable: options.unavailable || false, noSelection: options.noSelection || false, opacity: options.opacity === undefined ? 50 : options.opacity, name: options.name || "Layer A", mutations: 0, undo: 0, verifies: 0, hostMode: options.hostMode || "normal", hold: null, verifyMode: options.verifyMode || "normal" };
    const base = { hostInstanceId: "host_" + "a".repeat(48), hostReloadEpoch: 1, projectGeneration: 1 };
    const owner = load("velaAgentRuntimeOwner").createOwner({ AgentCapabilityRuntime: load("velaAgentCapabilityRuntime"), ActiveCompositionCapability: load("velaActiveCompositionCapability"), AgentObservationRuntime: load("velaAgentObservationRuntime") });
    env.fetch = async (url, input) => {
        wires.push(input.body); const body = JSON.parse(input.body), props = body.response_format && body.response_format.json_schema.schema.properties;
        let content = "safe text";
        if (props) {
            const logical = body.response_format.json_schema.name === "vela_bounded_logical_plan_response";
            const rename = options.rename === true;
            const envelope = logical ? { type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 60 } }, { capabilityId: "set-layer-name-v1", params: { name: "Vela Stream Test" } }] } : { type: "localProposal", proposal: { capabilityId: rename ? "set-layer-name-v1" : "set-opacity-v1", params: rename ? { name: "Vela Stream Test" } : { opacity: 60 } } };
            content = JSON.stringify({ protocol: props.protocol.enum[0], schemaVersion: props.schemaVersion.enum[0], requestId: props.requestId.enum[0], provider: "lmstudio", model: body.model, envelope });
        }
        const raw = body.stream ? "data: " + JSON.stringify({ choices: [{ delta: { content, reasoning_content: "RAW_TRAJECTORY_REASONING_SENTINEL" }, finish_reason: "stop" }] }) + "\n\ndata: [DONE]\n\n" : JSON.stringify({ choices: [{ message: { role: "assistant", content, reasoning_content: "RAW_TRAJECTORY_REASONING_SENTINEL" }, finish_reason: "stop" }] });
        const response = new Response(raw, { headers: { "content-type": body.stream ? "text/event-stream" : "application/json" } });
        if (options.holdProvider) await new Promise(resolve => waiting.push(resolve));
        return { status: 200, redirected: false, url, headers: response.headers, body: response.body };
    };
    function invokeHost(source, callback) {
        const execution = source.startsWith("AEToolbox.VelaExecution.handle(");
        const prefix = execution ? "AEToolbox.VelaExecution.handle(" : "AEToolbox.VelaContext.handle(";
        const request = JSON.parse(JSON.parse(source.slice(prefix.length, -1))); requests.push(request); events.push(request.operation);
        function answer() {
            const response = { protocol: execution ? "vela.host-execution-result.v1" : "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true };
            if (execution) {
                response.hostExecutionRevision = "vela-execution-host-v1";
                const mode = state.hostMode;
                if (mode === "invoke") throw Error("invoke uncertainty");
                if (mode === "malformed") { callback("malformed"); return; }
                if (mode === "false" || mode === "null") { response.ok = false; response.error = { code: mode === "false" ? "HOST_EXECUTION_VALUE_MISMATCH" : "HOST_EXECUTION_MUTATION_FAILED", message: "injected", mutationCommitted: mode === "false" ? false : null }; }
                else {
                    state.mutations++; state.undo++;
                    const rename = request.capabilityId === "set-layer-name-v1";
                    if (rename) state.name = request.scope.params.name; else state.opacity = request.scope.params.opacity;
                    response.result = { capabilityId: request.capabilityId, valueKind: rename ? "string" : "number", resultingValueDigest: context.digestPropertyValue(rename ? "string" : "number", rename ? state.name : state.opacity) };
                    if (mode === "committed-error") { response.ok = false; delete response.result; response.error = { code: "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE", message: "injected", mutationCommitted: true }; }
                }
            } else {
                response.hostAdapterRevision = "vela-context-host-v4";
                const operation = request.operation;
                if (operation === "captureContext") response.snapshot = { ...base, tier: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } };
                else if (operation === "capturePropertyValues") response.snapshot = { ...base, tier: 3, sampleTime: 0, targets: request.scope.targets.map((t, index) => ({ targetOrdinal: index, nativeLayerId: t.nativeLayerId, layerIndex: t.layerIndex, propertyPath: t.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: state.opacity } })) };
                else if (operation === "captureLayerAttributeValue") response.snapshot = { ...base, tier: 3, target: { ...request.scope.target, value: { kind: "string", data: state.name } } };
                else if (operation.startsWith("observeCommitted")) {
                    state.verifies++; const rename = operation.includes("LayerAttribute");
                    response.snapshot = { ...base, tier: 3, target: { ...request.scope.target, value: { kind: rename ? "string" : "number", data: state.verifyMode === "mismatch" ? (rename ? "different" : 12) : (rename ? state.name : state.opacity) } } };
                    if (state.verifyMode === "error") { response.ok = false; delete response.snapshot; response.error = { code: "HOST_CONTEXT_UNAVAILABLE", message: "injected" }; }
                } else response.snapshot = { hostInstanceId: base.hostInstanceId, hostReloadEpoch: base.hostReloadEpoch, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } };
            }
            if (!execution && request.operation === "captureContext" && state.unavailable) { delete response.snapshot; response.ok = false; response.error = { code: "HOST_CONTEXT_UNAVAILABLE", message: "unavailable" }; }
            if (!execution && request.operation === "captureContext" && state.noSelection) { response.snapshot.selection.count = 0; response.snapshot.selection.items = []; }
            callback(JSON.stringify(response));
        }
        if (state.hold === "execution" && execution || state.hold === "verify" && request.operation.startsWith("observeCommitted")) waiting.push(answer); else answer();
    }
    const runtime = load("velaRuntime").createRuntime({ exactAgentSession: owner.getSessionRuntime(), environment: env, invokeHost });
    await runtime.initialize(); owner.attachObservationReadPort(runtime.getObservationReadPort()); owner.attachAgentDriverRuntimePort(runtime.getAgentDriverRuntimePort()); runtime.attachObjectiveReviewPort(owner.getObjectiveReviewPort()); owner.activate();
    function start(logical = false) { return owner.startObjective({ message: logical ? "把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test" : options.rename ? "把当前图层重命名为 Vela Stream Test" : "Set opacity to 60%", endpoint: "http://127.0.0.1:1234", model: "m" }); }
    function review(outcome = "approved") { const r = owner.getAgentDriver().getSnapshot().suspendedReview; return owner.resolveObjectiveReview({ reviewId: r.reviewId, revision: r.revision, outcome }); }
    return { load, owner, runtime, state, events, requests, wires, waiting, start, review, evidence, release() { const f = waiting.shift(); if (f) f(); }, dispose() { owner.dispose(); runtime.dispose(); } };
}
module.exports = { create, flush };
