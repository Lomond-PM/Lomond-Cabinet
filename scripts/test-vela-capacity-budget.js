"use strict";
const assert = require("assert");
const fs = require("fs");
const Module = require("module");
const adapter = require("../client/js/vela/velaProviderAdapter");
const { create, cases, flush } = require("./fixtures/vela-context-evidence-harness");
const baseline = require("./fixtures/vela-capacity-budget-baseline.json");
let assertions = 0;
function same(actual, expected, label) { assertions++; assert.deepStrictEqual(actual, expected, label); }
function check(actual, label) { assertions++; assert.ok(actual, label); }
function frozen(value) { return !value || typeof value !== "object" ? typeof value !== "function" : Object.isFrozen(value) && Object.values(value).every(frozen); }
const identity = { endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "synthetic", profile: "text-only", requestId: "request-1", providerGeneration: 1, instanceId: "instance-1", instanceConfigId: "instance-config-1", providerContractId: "synthetic-contract-v1", samplingBoundary: "invocation-1", runtimeRevision: 1, configRevision: "revision-1" };
function operands() {
    return { correlation: { ...identity },
        capacity: { sourceClass: "provider-reported", value: 1000, unit: "tokens", tokenBasis: "synthetic-full-window-v1", qualified: true, qualificationId: "synthetic-qualified-v1", correlation: { ...identity }, instanceCount: 1 },
        inputCost: { kind: "bounded", low: 600, high: 700, unit: "tokens", tokenBasis: "synthetic-full-window-v1", certified: true, fullInput: true, methodId: "synthetic-certified-inclusive-bounds-v1", correlation: { ...identity } },
        generationReserve: { value: 200, unit: "tokens", tokenBasis: "synthetic-full-window-v1", reviewed: true, reviewId: "synthetic-reserve-review-v1", correlation: { ...identity } },
        safetyReserve: { value: 100, unit: "tokens", tokenBasis: "synthetic-full-window-v1", reviewed: true, reviewId: "synthetic-reserve-review-v1", correlation: { ...identity } } };
}
function decide(change) { const input = operands(); if (change) change(input); return adapter.decideContextBudget(input); }
async function run() {
    const fit = decide();
    same(fit.disposition, "full-fit", "certified inclusive upper fits exactly");
    same(fit.inputBudgetTokens, 700, "C-G-S only with reviewed compatible operands");
    same(fit.proof, { fullFit: true, inputFit: true, inputOverflow: false }, "distinct proofs");
    same(fit.dispatch, "allow-proven-fit", "known-fit disposition");
    check(frozen(fit), "all projections deeply immutable");
    same(fit.optionalExpansion, false, "spare capacity never enables selector");
    same(decide(x => { x.inputCost = { ...x.inputCost, kind: "exact", value: 700 }; }).disposition, "full-fit", "exact cost");
    same(decide(x => { x.inputCost.high = 701; }).disposition, "fit-not-established-under-bound", "upper bound exceeds allocation, not physical overflow");
    same(decide(x => { x.inputCost.high = 1100; }).proof.inputOverflow, false, "upper over C is not definite overflow");
    const overflow = decide(x => { x.inputCost.low = 1001; x.inputCost.high = 1100; x.generationReserve = null; x.safetyReserve = null; });
    same(overflow.disposition, "required-input-overflow", "lower exceeds C even with unknown G/S");
    same(overflow.proof, { fullFit: false, inputFit: false, inputOverflow: true }, "input-only proof");
    same(overflow.dispatch, "reject-required-construction", "deterministic pre-dispatch failure result");
    let dispatched = 0;
    // Consumer simulation only: no synthetic evidence is injected into production.
    function syntheticDispatch(evidence) { const d = adapter.decideContextBudget(evidence); if (d.dispatch === "reject-required-construction") return d.disposition; dispatched++; return "sent"; }
    const rejected = operands(); rejected.inputCost.low = 1001; rejected.inputCost.high = 1100; rejected.generationReserve = null;
    same(syntheticDispatch(rejected), "required-input-overflow", "allocation stops before hypothetical dispatch");
    same(dispatched, 0, "no dispatch/truncate/retry of mandatory input");
    same(syntheticDispatch(operands()), "sent", "synthetic fit permits unchanged construction");
    same(decide(x => { x.capacity = null; }).disposition, "unassessed-capacity", "unknown C");
    same(decide(x => { x.inputCost = null; }).disposition, "unassessed-input-cost", "unknown I");
    const noG = decide(x => { x.generationReserve = null; x.generationControls = { maxTokens: 1000, thinkingBudgetTokens: 800 }; });
    same(noG.disposition, "unassessed-generation-reserve", "M=C never creates zero I budget");
    same(noG.inputBudgetTokens, null, "unknown never substituted");
    same(noG.proof.inputFit, true, "input fit is not full fit");
    same(noG.generationReserve.value, null, "M/R never derive G");
    same(decide(x => { x.safetyReserve = null; }).disposition, "unassessed-safety-reserve", "no implicit S");
    for (const field of ["capacity", "inputCost", "generationReserve", "safetyReserve"]) {
        const incompatible = decide(x => { x[field].tokenBasis = "other-tokenizer"; });
        same(incompatible.disposition, "incompatible-token-basis", field + " basis mismatch");
        same(incompatible.proof.fullFit, false, field + " cannot prove fit");
        same(decide(x => { x[field].unit = "bytes"; }).proof.fullFit, false, field + " bytes never tokens");
    }
    for (const value of [undefined, null, 0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "8192"]) {
        const result = decide(x => { x.capacity.value = value; });
        same(result.capacity.usable, false, "invalid C: " + value);
        same(result.dispatch, "allow-current-shape", "invalid C cannot drive numeric rejection");
    }
    for (const sourceClass of ["operator-configured", "heuristic", "unknown", "qwen"]) {
        const result = decide(x => { x.capacity.sourceClass = sourceClass; });
        same(result.capacity.usable, false, sourceClass + " not binding");
        same(result.disposition, "unassessed-capacity", "no model-name inference");
    }
    same(decide(x => { x.capacity.sourceClass = "model-profile-known"; }).capacity.usable, true, "qualified exact profile contract allowed synthetically");
    same(decide(x => { x.capacity.qualified = false; }).capacity.status, "conditional", "unqualified positive claim only conditional");
    same(decide(x => { delete x.capacity.qualificationId; }).capacity.usable, false, "qualification provenance required");
    same(decide(x => { x.capacity.ambiguous = true; }).disposition, "ambiguous-capacity", "ambiguous serving source");
    same(decide(x => { x.capacity.instanceCount = 2; }).disposition, "ambiguous-capacity", "no flattening multiple instances");
    for (const value of [0, -1, "1", Infinity]) same(decide(x => { x.capacity.instanceCount = value; }).capacity.usable, false, "invalid serving instance count");
    same(decide(x => { x.capacity.ambiguous = "false"; }).capacity.usable, false, "malformed ambiguity flag is not a safe false");
    same(decide(x => { x.capacity.stale = true; }).disposition, "stale-capacity", "late discovery explicitly stale");
    for (const field of Object.keys(identity)) {
        for (const operand of ["capacity", "inputCost", "generationReserve", "safetyReserve"]) {
            const result = decide(x => { x[operand].correlation[field] = typeof identity[field] === "number" ? identity[field] + 1 : identity[field] + "-next"; });
            same(result.proof.fullFit, false, operand + ": changed " + field);
            same(result.dispatch, "allow-current-shape", operand + ": old evidence not reused");
        }
    }
    for (const field of Object.keys(identity).filter(x => !["runtimeRevision", "configRevision"].includes(x))) {
        same(decide(x => { delete x.capacity.correlation[field]; }).capacity.reason, "missing-binding-identity", field + " required for binding");
    }
    same(decide(x => { x.capacity.correlation.runtimeRevision = {}; }).capacity.reason, "invalid-binding-identity", "malformed optional revision not silently absent");
    same(decide(x => { x.correlation.runtimeRevision = {}; }).capacity.usable, false, "invalid expected correlation survives normalization");
    same(decide(x => { delete x.capacity.correlation.configRevision; }).capacity.usable, false, "missing represented revision");
    for (const change of [x => { x.inputCost.low = -1; }, x => { x.inputCost.low = 701; }, x => { x.inputCost.high = Infinity; }, x => { x.inputCost.certified = false; }, x => { x.inputCost.fullInput = false; }, x => { delete x.inputCost.methodId; }]) {
        same(decide(change).disposition, "unassessed-input-cost", "uncertified/invalid complete-input bounds unusable");
    }
    same(decide(x => { x.generationReserve.reviewed = false; }).disposition, "unassessed-generation-reserve", "unreviewed G");
    same(decide(x => { x.safetyReserve.value = -1; }).disposition, "unassessed-safety-reserve", "negative S");
    same(decide(x => { x.generationReserve.value = 0; x.safetyReserve.value = 0; }).inputBudgetTokens, 1000, "explicit reviewed zero is supported");
    const extreme = decide(x => { x.capacity.value = Number.MAX_SAFE_INTEGER; x.generationReserve.value = Number.MAX_SAFE_INTEGER; x.safetyReserve.value = Number.MAX_SAFE_INTEGER; });
    same(extreme.inputBudgetTokens, null, "no unsafe reserve sum/subtraction");
    same(extreme.disposition, "fit-not-established-under-bound", "reserves leave no admissible input allocation");
    const source = operands(); const before = JSON.stringify(source); adapter.decideContextBudget(source);
    same(JSON.stringify(source), before, "pure functions never mutate caller operands");
    let getterCalls = 0; const hostile = { get capacity() { getterCalls++; throw Error("getter"); } };
    same(adapter.decideContextBudget(hostile).disposition, "unassessed-capacity", "accessors ignored");
    same(getterCalls, 0, "no getter execution");
    const contaminated = operands();
    for (const obj of [contaminated, contaminated.capacity, contaminated.inputCost, contaminated.generationReserve, contaminated.safetyReserve, contaminated.correlation]) Object.assign(obj, { reasoning: "RAW_REASONING_SENTINEL", history: "HISTORY_SENTINEL", nativeBinding: "NATIVE_SENTINEL", authority: "AUTHORITY_SENTINEL", trajectory: "VERIFIED_TRAJECTORY_SENTINEL", session: "SESSION_SENTINEL" });
    const clean = adapter.decideContextBudget(contaminated);
    check(!JSON.stringify(clean).includes("SENTINEL"), "closed projections omit reasoning/history/native/authority/session/trajectory");
    same(clean.disposition, "full-fit", "spare capacity never consumes foreign context fields");
    for (const c of cases) {
        const h = create({ ...c, debug: true }); const result = await h.send();
        const a2 = h.controller.getContextEvidence().input, decision = h.controller.getBudgetDecisionEvidence();
        same(a2.canonicalRequestJson, baseline.cases[c.id].canonicalJson, c.id + " exact pre-A3b canonical JSON");
        same(h.bodies[0], baseline.cases[c.id].wireJson, c.id + " exact wire/messages/schema/stream/M/R");
        same(h.hostCalls, baseline.cases[c.id].hostRequests, c.id + " capture sequence/payload");
        same(result, baseline.cases[c.id].result, c.id + " admission result");
        same(decision.correlation.requestId, a2.correlation.requestId, c.id + " separate A2 correlation");
        same(decision.correlation.providerGeneration, a2.correlation.providerGeneration, c.id + " Adapter generation correlation");
        same(decision.correlation.profile, a2.correlation.profile, c.id + " profile correlation");
        same(decision.disposition, "unassessed-capacity", c.id + " production unknown C");
        same(decision.dispatch, "allow-current-shape", c.id + " compatibility");
        same(decision.inputCost.kind, "unknown", c.id + " no tokenizer");
        same(decision.generationReserve.value, null, c.id + " G unknown");
        same(decision.safetyReserve.value, null, c.id + " S unknown");
        same(decision.bytes.canonicalUtf8Bytes, Buffer.byteLength(a2.canonicalRequestJson), c.id + " exact canonical bytes");
        same(decision.bytes.wireUtf8Bytes, Buffer.byteLength(h.bodies[0]), c.id + " actual transport bytes");
        same(decision.bytes.messageContentUtf8Bytes, a2.budget.messageContentUtf8Bytes.reduce((a, b) => a + b, 0), c.id + " exact message bytes");
        const wire = JSON.parse(h.bodies[0]);
        same(decision.generationControls.maxTokens, wire.max_tokens ?? null, c.id + " actual M");
        same(decision.generationControls.thinkingBudgetTokens, wire.thinking_budget_tokens ?? null, c.id + " actual R");
        check(frozen(decision), c.id + " immutable separate snapshot");
        check(!JSON.stringify(decision).includes("RAW_REASONING_A2_SENTINEL"), c.id + " streamed reasoning excluded");
        const off = create({ ...c, debug: false }); const offResult = await off.send();
        same(off.bodies[0], baseline.cases[c.id].wireJson, c.id + " debug-off wire equivalence");
        same(off.hostCalls, baseline.cases[c.id].hostRequests, c.id + " debug-off captures");
        same(offResult, result, c.id + " debug-off admission");
        same(off.controller.getContextEvidence(), null, c.id + " A2 off");
        same(off.controller.getBudgetDecisionEvidence(), null, c.id + " debug decision off");
    }
    for (const action of ["cancel", "invalidate", "timeout"]) {
        const h = create({ debug: true, holdFetch: true }); const pending = h.send(); await flush();
        const previous = h.controller.getBudgetDecisionEvidence(), serialized = JSON.stringify(previous);
        if (action === "cancel") h.controller.cancel({ requestId: h.controller.getUiState().requestId });
        if (action === "invalidate") h.controller.invalidate("idle");
        if (action === "timeout") h.timers[0]();
        await flush(); h.options.holdFetch = false; h.options.model = "next-model";
        await h.controller.send({ message: "Set opacity to 50%", endpoint: "http://127.0.0.1:1235", model: "next-model" });
        const next = h.controller.getBudgetDecisionEvidence();
        check(previous !== next && previous.correlation.requestId !== next.correlation.requestId, action + " next invocation isolated");
        same(next.correlation.endpoint, "http://127.0.0.1:1235/v1/chat/completions", action + " endpoint switched");
        same(next.correlation.model, "next-model", action + " model switched");
        check(next.correlation.profile !== previous.correlation.profile, action + " profile switched");
        h.fetchGate.resolve(); await pending; await flush();
        same(h.controller.getBudgetDecisionEvidence(), next, action + " late result cannot overwrite next decision");
        same(JSON.stringify(previous), serialized, action + " old snapshot remains immutable historical evidence");
    }
    const capture = create({ debug: true }); await capture.send(); capture.options.holdHost = true;
    const pendingCapture = capture.send("second objective");
    same(capture.controller.getBudgetDecisionEvidence(), null, "new capture clears old projection before construction");
    capture.controller.cancel({ requestId: null }); capture.pendingHost[0](); await pendingCapture;
    same(capture.controller.getBudgetDecisionEvidence(), null, "late cancelled capture cannot publish budget");

    // Test-only instrumentation counts the real pure-policy entry without replacing its
    // operands/result, transport, or A2 getter. No production injection option exists.
    const filename = require.resolve("../client/js/vela/velaProviderAdapter");
    const original = require.cache[filename]; const observed = new Module(filename, module);
    observed.filename = filename; observed.paths = Module._nodeModulePaths(require("path").dirname(filename));
    global.__velaA3bPolicyCalls = 0;
    try {
        observed._compile(fs.readFileSync(filename, "utf8").replace("function decideContextBudget(input) {", "function decideContextBudget(input) { global.__velaA3bPolicyCalls++;"), filename);
        observed.loaded = true; require.cache[filename] = observed;
        // Use an independently constructed trusted transport bound to this Adapter.
        const transportFile = require.resolve("../client/js/vela/velaLocalTransport");
        const oldTransport = require.cache[transportFile]; delete require.cache[transportFile];
        try {
            const h = create({ debug: false });
            const p = observed.exports.createLocalOpenAICompatibleProvider({ protocol: h.protocol, transport: require(transportFile).createLocalTransport({ protocol: h.protocol, TextDecoder, fetch: () => Promise.reject(Error("offline")) }), runtime: h.runtime, endpoint: identity.endpoint, model: "m", requestProfile: "text-only", debugContextEvidence: false });
            await p.start({ messages: [{ role: "user", content: "hello" }], context: { contextId: "context", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } }).promise;
            same(global.__velaA3bPolicyCalls, 1, "production policy invoked with A2 disabled");
            same(p.getBudgetDecisionEvidence(), null, "execution independent of debug exposure");
        } finally { require.cache[transportFile] = oldTransport; }
    } finally { require.cache[filename] = original; delete global.__velaA3bPolicyCalls; }
    console.log("PASS Vela capacity/budget: " + assertions + " assertions; " + cases.length + " pre-A3b canonical/wire/capture baselines.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
