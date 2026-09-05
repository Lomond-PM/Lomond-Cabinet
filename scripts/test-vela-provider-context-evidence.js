"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { create, cases, flush } = require("./fixtures/vela-context-evidence-harness");
const baseline = require("./fixtures/vela-provider-context-evidence-baseline.json");
const adapter = require("../client/js/vela/velaProviderAdapter");
let assertions = 0;
function check(value, message) { assertions++; assert.ok(value, message); }
function same(actual, expected, message) { assertions++; assert.deepStrictEqual(actual, expected, message); }
function frozenData(value) { if (!value || typeof value !== "object") return typeof value !== "function"; return Object.isFrozen(value) && Object.values(value).every(frozenData); }
async function run() {
    for (const c of cases) {
        const h = create({ ...c, debug: true });
        const result = await h.send();
        const e = h.controller.getContextEvidence();
        check(e && e.closure === "closed" && e.input.closure === "closed", c.id + " closes selected input");
        same(h.bodies[0], baseline.cases[c.id].wireJson, c.id + " exact pre-A2 wire serialization");
        same(h.hostCalls, baseline.cases[c.id].hostRequests, c.id + " exact pre-A2 capture path/payload");
        same(result, baseline.cases[c.id].result, c.id + " same admission outcome");
        same(e.input.wireRequestJson, h.bodies[0], c.id + " actual sent bytes represented");
        const canonical = JSON.parse(e.input.canonicalRequestJson), wire = JSON.parse(h.bodies[0]);
        same(canonical.messages, wire.messages, c.id + " canonical system/assistant/user exact equality");
        same(wire, JSON.parse(baseline.cases[c.id].wireJson), c.id + " schema/stream/model/generation policy unchanged");
        same(e.input.budget.wireUtf8Bytes, Buffer.byteLength(h.bodies[0]), c.id + " known wire bytes");
        same(e.input.budget.canonicalUtf8Bytes, Buffer.byteLength(e.input.canonicalRequestJson), c.id + " known canonical bytes");
        same(e.input.budget.messageContentUtf8Bytes, canonical.messages.map(m => Buffer.byteLength(m.content)), c.id + " message byte accounting");
        check(e.input.budget.tokenCost === null && e.input.budget.modelContextCapacity === null, "tokens/capacity unknown");
        check(e.input.correlation.objectiveId === null && e.input.correlation.sessionId === null && e.input.correlation.turnId === null && e.input.correlation.runtimeInvocationId === null, "no invented owner correlation");
        check(e.input.correlation.requestId === canonical.requestId && e.input.correlation.providerGeneration === 1 && e.controllerGeneration === 2, "generations retain distinct ownership");
        check(frozenData(e), "deeply frozen data only");
        check(Buffer.byteLength(JSON.stringify(e)) < 160 * 1024, "bounded local evidence");
        check(!/nativeLayerId|layerIndex|propertyPath|captureHandle|executionArmed|grantId|RAW_REASONING_A2_SENTINEL/.test(JSON.stringify(e)) && !/"nonce"\s*:/.test(e.input.canonicalRequestJson), "no native binding, authority or reasoning payload (unchanged prompt may prohibit nonce)");
        check(!JSON.stringify(h.controller.getDiagnostics()).includes("canonicalRequestJson") && !JSON.stringify(h.controller.getUiState()).includes("provider-context-evidence"), "not normal UI/diagnostics exposure");
        check(e.exclusions.every(s => s.disposition === "not-collected" && s.omittedCount === null), "uncollected domains are not zero omitted items");
        if (!c.unavailable && !c.propertyUnavailable && !c.noSelection) {
            check(e.sources.every(s => s.disposition === "selected"), "both sources actually selected");
            check(e.sources[0].samplingBoundary.captureId !== e.sources[1].samplingBoundary.captureId && e.sources.every(s => s.samplingBoundary.atomicWithOtherReads === false), "separate sampling boundaries");
            same(e.sources[1].selectedRepresentation, { selectedLayerOpacity: 57.5 }, "only selected value projected");
            check(e.sources[0].samplingBoundary.projectGeneration === null && e.sources[1].samplingBoundary.aeSampleTime === 0, "unexposed provenance unknown; AE sample time is not wall-clock time");
        }
        if (c.noSelection) check(e.sources[1].disposition === "not-collected" && !e.sources[1].samplingBoundary.attempted, "no selection does not invent property read");
        if (c.unavailable) check(e.sources[0].disposition === "upstream-unavailable" && e.sources[0].selectedRepresentation === null && e.sources[0].trustClass === "local-control-record", "unavailable fallback is not synthetic AE fact");
        if (c.propertyUnavailable) check(e.sources[1].disposition === "upstream-unavailable" && e.sources[0].disposition === "not-selected-by-current-construction", "successful Tier-1 excluded when whole grounding falls back");
        const disabled = create({ ...c }); await disabled.send();
        check(disabled.controller.getContextEvidence() === null, "default off");
        same(disabled.bodies, h.bodies, "debug opt-in does not change request");
    }
    const fail = create({ debug: true, captureFailure: true });
    same((await fail.send()).state, "failed", "capture failure remains failed");
    const failed = fail.controller.getContextEvidence();
    check(failed.closure === "source-capture-failed" && failed.input === null && failed.sources[0].disposition === "source-capture-failed" && fail.bodies.length === 0, "capture failure never constructs/admit Provider input");

    const before = create({ debug: true, holdHost: true });
    const beforePending = before.send();
    check(before.controller.cancel({ requestId: null }), "cancel before closure");
    const beforeEvidence = before.controller.getContextEvidence();
    check(beforeEvidence.closure === "cancelled-before-construction-closure" && beforeEvidence.input === null, "cancel is not selected input");
    before.options.holdHost = false;
    await before.send("next objective");
    const nextEvidence = before.controller.getContextEvidence();
    before.pendingHost[0](); await beforePending; await flush();
    check(before.controller.getContextEvidence() === nextEvidence && beforeEvidence.input === null, "late capture cannot contaminate next request");

    for (const action of ["cancel", "timeout", "invalidate"]) {
        const h = create({ debug: true, holdFetch: true }); const pending = h.send(); await flush();
        const closed = h.controller.getContextEvidence(); const serialized = JSON.stringify(closed);
        check(closed.closure === "closed", action + " starts with closed input");
        if (action === "cancel") h.controller.cancel({ requestId: h.controller.getUiState().requestId });
        if (action === "timeout") h.timers[0]();
        if (action === "invalidate") h.controller.invalidate("idle");
        await flush();
        same(JSON.stringify(closed), serialized, action + " cannot mutate closed input");
        h.options.holdFetch = false; await h.send("isolated subsequent invocation");
        const next = h.controller.getContextEvidence();
        h.fetchGate.resolve(); await pending; await flush();
        check(h.controller.getContextEvidence() === next && next !== closed, action + " late terminal cannot replace next evidence");
        check(h.controller.getUiState().state === "completed" && !next.input.wireRequestJson.includes("RAW_REASONING_A2_SENTINEL"), action + " next admission/input isolated");
    }
    const streaming = create({ debug: true, streaming: true, holdStream: true });
    const streamEvents = []; streaming.controller.subscribeStreamEvents(e => streamEvents.push(e));
    const streamPending = streaming.send(); await flush();
    const closedStream = streaming.controller.getContextEvidence(); const streamJson = JSON.stringify(closedStream);
    streaming.streamReads[0].resolve({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"reasoning_content":"RAW_REASONING_A2_SENTINEL"},"finish_reason":null}]}\n\n') });
    await flush();
    check(streamEvents.some(e => e.type === "reasoning-delta"), "actual reasoning delta exercises channel");
    streaming.controller.cancel({ requestId: streaming.controller.getUiState().requestId });
    await streamPending;
    streaming.streamReads[1].resolve({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') }); await flush();
    same(JSON.stringify(closedStream), streamJson, "stream cancel/late DONE leave closure immutable");
    check(streaming.controller.getUiState().state === "cancelled" && !streamJson.includes("RAW_REASONING_A2_SENTINEL"), "reasoning excluded and late DONE cannot admit");
    streaming.options.holdStream = false; await streaming.send("next stream objective");
    check(!JSON.stringify(streaming.controller.getContextEvidence()).includes("RAW_REASONING_A2_SENTINEL"), "next stream input excludes raw/retained reasoning");

    const h = create();
    const direct = adapter.createLocalOpenAICompatibleProvider({ protocol: h.protocol, transport: h.transport, runtime: h.runtime, model: "m", requestProfile: "text-only", debugContextEvidence: true });
    let budgetError;
    try { direct.start({ messages: [{ role: "user", content: "x".repeat(20000) }], context: { contextId: "context", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } }); } catch (e) { budgetError = e; }
    check(budgetError && direct.getContextEvidence().closure === "budget-rejected", "existing budget rejection recorded");
    check(direct.getContextEvidence().canonicalRequestJson === null && h.bodies.length === 0, "rejected payload not retained/dispatched");
    check(h.transport.getSerializedRequestEvidence({ model: "m", messages: [], stream: false }) === null, "serialized data cannot recover trusted outbound body identity");
    const integrated = create({ debug: true, streaming: true });
    const owner = require("../client/js/vela/velaAgentRuntimeOwner").createOwner({
        AgentCapabilityRuntime: require("../client/js/vela/velaAgentCapabilityRuntime"),
        ActiveCompositionCapability: require("../client/js/vela/velaActiveCompositionCapability"),
        AgentObservationRuntime: require("../client/js/vela/velaAgentObservationRuntime"),
        observationReadPort: integrated.bridge
    });
    const noMutation = () => { throw new Error("text-only objective must not request execution"); };
    owner.activate();
    owner.attachAgentDriverRuntimePort({ reason(input) { return integrated.controller.send(input).then(result => ({ type: "text", text: result.text })); }, submitIntent: noMutation, continueApprovedReview: noMutation, verifyCommittedAction: noMutation, verifyAction: noMutation });
    const streamReasoning = []; integrated.controller.subscribeStreamEvents(event => { if (event.type === "reasoning-delta") streamReasoning.push(event.text); });
    await owner.startObjective({ message: "first objective", endpoint: "http://127.0.0.1:1234", model: "m" });
    const observation = owner.getObservationRuntime().getObservationSnapshot();
    check(streamReasoning.join("").includes("RAW_REASONING_A2_SENTINEL"), "real Controller stream emits reasoning in owner harness");
    check(!JSON.stringify(owner.getSessionRuntime().getSnapshot()).includes("RAW_REASONING_A2_SENTINEL"), "reasoning absent from actual Session task records");
    check(!JSON.stringify(observation).includes("RAW_REASONING_A2_SENTINEL"), "reasoning absent from actual production Observation projection");
    check(observation.provenance.hostContextId !== integrated.controller.getContextEvidence().sources[0].samplingBoundary.captureId, "Driver Observation is not Provider sampling boundary");
    await owner.startObjective({ message: "second objective", endpoint: "http://127.0.0.1:1234", model: "m" });
    check(!JSON.stringify(integrated.controller.getContextEvidence()).includes("RAW_REASONING_A2_SENTINEL") && !integrated.bodies[1].includes("first objective"), "subsequent objective excludes prior output and objective history");
    same(integrated.controller.getContextEvidence().input.correlation.objectiveId, null, "even real Agent presence cannot invent unwired correlation");
    owner.dispose();
    // No new data path to Session/Observation/Runtime: the only production additions are the two input owners.
    for (const file of ["velaAgentObservationRuntime.js", "velaSessionRuntime.js", "velaAgentDriver.js", "velaPresentationModel.js"]) {
        check(!fs.readFileSync(path.join(__dirname, "../client/js/vela", file), "utf8").includes("getContextEvidence"), file + " has no evidence ingestion path");
    }
    console.log("PASS Vela Provider context evidence: " + assertions + " assertions; 9 immutable pre-A2 wire/capture baselines.");
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
