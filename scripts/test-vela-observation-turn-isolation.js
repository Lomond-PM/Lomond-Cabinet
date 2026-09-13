"use strict";
const assert = require("assert");
const observation = require("../client/js/vela/velaAgentObservationRuntime");
const { create, flush } = require("./fixtures/vela-selection-harness");
let assertions = 0;
function same(a, b, label) { assertions++; assert.strictEqual(a, b, label); }
function check(a, label) { assertions++; assert.ok(a, label); }
function outcome(p) { return p.then(value => ({ value }), error => ({ code: error.code })); }
function unit(capability = true) {
    let snapshot = { agentId: "agent", sessionId: "session", turnId: "A", scopeId: "scope", revision: 1, lifecycleStage: "active", scopeBoundary: {} };
    const reads = [], reports = [];
    const runtime = observation.createAgentObservationRuntime({ readAgentSnapshot: () => snapshot,
        capabilityId: capability ? "observe" : null,
        capabilityRuntime: capability ? { invoke() {
            let resolve, reject; const owner = { ...snapshot };
            const p = new Promise((yes, no) => { resolve = yes; reject = no; });
            const record = { owner, cancelled: 0, reject, finish() { resolve({ status: "succeeded", sessionId: owner.sessionId, turnId: owner.turnId, capabilityId: "observe", invocationId: "inv_" + reads.indexOf(record), data: { available: true, compositionId: "comp", type: "CompItem", width: 1, height: 1, duration: 1, frameRate: 1, hostContextId: "capture", hostInstanceId: "host", hostReloadEpoch: 1 } }); } };
            p.cancel = () => { record.cancelled++; resolve({ status: "cancelled" }); return true; }; reads.push(record); return p;
        } } : null,
        provider: capability ? null : { observe() { return new Promise(resolve => reads.push({ finish: () => resolve({ sourceKind: "test", payload: { value: reads.length } }) })); } },
        onError: e => reports.push(e.code) });
    return { runtime, reads, reports, drift: patch => { snapshot = { ...snapshot, ...patch }; } };
}
const message = { message: "Explain keyframes without edits", endpoint: "http://127.0.0.1:1234", model: "m" };
async function run() {
    const coalesced = unit(), one = coalesced.runtime.refresh(), two = coalesced.runtime.refresh(); coalesced.reads[0].finish(); const pair = await Promise.all([one, two]); same(pair[0], pair[1], "same-turn callers receive same valid snapshot"); same(coalesced.reads.length, 1, "same-turn success invokes once");
    const h = unit(); const a = h.runtime.refresh(); same(h.runtime.refresh(), a, "same-turn exact promise"); same(h.reads.length, 1, "one invocation");
    const old = outcome(a); h.drift({ turnId: "B", revision: 2 }); const b = h.runtime.refresh(); check(a !== b, "B cannot inherit A promise");
    h.reads[0].finish(); same((await old).code, "OBSERVATION_RESULT_STALE", "A stale only to its caller"); same(h.runtime.refresh(), b, "A cleanup cannot clear B"); same(h.reads.length, 2, "B still coalesces");
    h.reads[1].finish(); const accepted = await b; same(accepted.provenance.turnId, "B", "B commits"); same(h.runtime.getContextSnapshot().provenance.turnId, "B", "context is B");
    for (const field of ["agentId", "sessionId", "turnId", "scopeId", "revision"]) {
        const d = unit(); const p = d.runtime.refresh(), stale = outcome(p); d.drift({ [field]: field === "revision" ? 2 : "changed" }); const newer = d.runtime.refresh();
        check(newer !== p, field + " isolates coalescing"); d.reads[1].finish(); await newer; const latest = d.runtime.getObservationSnapshot();
        d.reads[0].finish(); same((await stale).code, "OBSERVATION_RESULT_STALE", field + " old cannot commit"); same(d.runtime.getObservationSnapshot(), latest, field + " late cannot overwrite");
    }
    const t = unit(), pa = outcome(t.runtime.refresh()); t.drift({ turnId: "B", revision: 2 }); const pb = outcome(t.runtime.refresh()); t.drift({ turnId: "C", revision: 3 }); const pc = t.runtime.refresh();
    t.reads[1].finish(); same((await pb).code, "OBSERVATION_RESULT_STALE", "triple B stale"); same(t.runtime.refresh(), pc, "C remains coalescible after B");
    t.reads[2].finish(); const c = await pc; t.reads[0].finish(); same((await pa).code, "OBSERVATION_RESULT_STALE", "triple A stale"); same(t.runtime.getObservationSnapshot(), c, "only C retained");
    const discarded = unit(), discardedResult = outcome(discarded.runtime.refresh()); discarded.reads[0].reject({ code: "CAPABILITY_RESULT_DISCARDED" }); same((await discardedResult).code, "OBSERVATION_RESULT_STALE", "discard mapping unchanged");
    const disposed = unit(), disposedResult = outcome(disposed.runtime.refresh()); disposed.runtime.dispose(); disposed.reads[0].finish(); same((await disposedResult).code, "OBSERVATION_RUNTIME_DISPOSED", "standalone runtime dispose blocks capability commit"); same(disposed.runtime.getObservationSnapshot(), null, "no late disposed snapshot");
    const unknown = unit(); unknown.drift({ turnId: null }); same((await outcome(unknown.runtime.refresh())).code, "AGENT_NOT_ACTIVE", "unknown turn not reusable");
    for (const field of ["sessionId", "turnId", "scopeId", "revision"]) {
        const legacy = unit(false), first = outcome(legacy.runtime.refresh()); await flush(); legacy.drift({ [field]: field === "revision" ? 2 : "next" }); const next = legacy.runtime.refresh(); await flush(); legacy.reads[1].finish(); await next; const saved = legacy.runtime.getContextSnapshot(); legacy.reads[0].finish(); same((await first).code, "OBSERVATION_RESULT_STALE", "legacy " + field + " guard"); same(legacy.runtime.getContextSnapshot(), saved, "legacy last-successful retained");
    }
    // Real Owner/Driver/Capability/Serializer/Bridge chain with held simulated Host.
    const forward = await create(); forward.state.hold = "observation"; const diagnostic = outcome(forward.owner.refreshActiveComposition()); await flush(); const request = forward.owner.startObjective(message); await flush();
    same(forward.owner.getAgentDriver().getSnapshot().state, "observing", "new objective observing"); const currentDiagnostic = forward.owner.refreshActiveComposition(); forward.release();
    same((await diagnostic).code, "OBSERVATION_RESULT_STALE", "old diagnostic remains stale"); await flush(); same(forward.owner.refreshActiveComposition(), currentDiagnostic, "old Owner cleanup cannot clear newer diagnostic subscriber"); forward.state.hold = null; forward.release(); await Promise.all([request, currentDiagnostic]);
    same(forward.owner.getAgentDriver().getSnapshot().terminal.outcome, "completed", "forward reaches Provider and completes"); same(forward.wires.length, 1, "grounding reaches Provider once"); forward.dispose();
    const reverse = await create(); reverse.state.hold = "observation"; const objective = reverse.owner.startObjective(message); await flush(); const turn = reverse.owner.getCurrentAgent().getSnapshot();
    const diagnosticB = reverse.owner.refreshActiveComposition(); same(reverse.owner.getCurrentAgent().getCurrentTurnId(), turn.turnId, "reverse preserves objective turn"); same(reverse.owner.getCurrentAgent().getRevision(), turn.revision, "reverse preserves revision");
    same(reverse.owner.getObservationRuntime().refresh(), diagnosticB, "reverse shares current operation"); same(reverse.owner.cancelActiveCompositionRefresh(), false, "diagnostic subscriber cannot cancel objective shared read");
    reverse.state.hold = null; reverse.release(); await Promise.all([objective, diagnosticB]); same(reverse.wires.length, 1, "reverse proceeds to Provider"); reverse.dispose();
    const cancel = await create(); cancel.state.hold = "observation"; const oldDiagnostic = outcome(cancel.owner.refreshActiveComposition()); await flush(); const freshObjective = cancel.owner.startObjective(message); await flush();
    same(cancel.owner.cancelActiveCompositionRefresh(), true, "cancel captured old diagnostic handle"); same((await oldDiagnostic).code, "OBSERVATION_REFRESH_CANCELLED", "old caller cancelled only");
    cancel.state.hold = null; cancel.release(); await freshObjective; same(cancel.owner.getAgentDriver().getSnapshot().terminal.outcome, "completed", "new objective unaffected by old cancel"); cancel.dispose();
    const review = await create(); await review.start(); const before = review.owner.getAgentDriver().getSnapshot(), reviewTurn = review.owner.getCurrentAgent().getCurrentTurnId(); await review.owner.refreshActiveComposition();
    same(review.owner.getCurrentAgent().getCurrentTurnId(), reviewTurn, "awaiting-review turn unchanged"); same(review.owner.getAgentDriver().getSnapshot().suspendedReview, before.suspendedReview, "Review identity unchanged"); same(review.state.mutations, 0, "diagnostic does not execute");
    review.state.hold = "verify"; const execution = review.review(); await flush(); const verifyTurn = review.owner.getCurrentAgent().getCurrentTurnId(); const adjacent = await outcome(review.owner.refreshActiveComposition()); check(adjacent.value || adjacent.code === "OBSERVATION_PROVIDER_FAILED", "existing Bridge busy rejection stays local to diagnostic"); same(review.owner.getCurrentAgent().getCurrentTurnId(), verifyTurn, "Verify adjacency turn unchanged");
    review.state.hold = null; review.release(); await execution; same(review.owner.getTrajectoryEvidence().terminal.attempts[0].verification.disposition, "verified-match", "Verify unchanged"); same(review.state.mutations, 1, "one mutation"); review.dispose();
    const closing = await create(); closing.state.hold = "observation"; const closingRead = outcome(closing.owner.refreshActiveComposition()); await flush(); closing.dispose(); closing.release(); check((await closingRead).code, "dispose rejects pending"); same(closing.owner.getObservationRuntime().getObservationSnapshot(), null, "disposed Owner no late commit");
    const objectiveCancel = await create({ holdProvider: true }); const pending = objectiveCancel.owner.startObjective(message); await flush(); objectiveCancel.owner.cancelObjective(); objectiveCancel.release(); await pending; same(objectiveCancel.owner.getAgentDriver().getSnapshot().terminal.outcome, "cancelled", "objective cancel unchanged"); objectiveCancel.dispose();
    // Owner policy over the closed Driver state contract, including verifying.
    const ownerModule = require("../client/js/vela/velaAgentRuntimeOwner"), driverModule = require("../client/js/vela/velaAgentDriver");
    for (const state of ["idle", "terminal", "observing", "reasoning", "awaiting-outcome", "awaiting-review", "verifying"]) {
        const policyOwner = ownerModule.createOwner({
            AgentDriver: { createAgentDriver(options) { const driver = driverModule.createAgentDriver(options); return { ...driver, getSnapshot: () => Object.freeze({ ...driver.getSnapshot(), state, objectiveId: "retained-objective" }) }; } },
            AgentCapabilityRuntime: require("../client/js/vela/velaAgentCapabilityRuntime"), ActiveCompositionCapability: require("../client/js/vela/velaActiveCompositionCapability"), AgentObservationRuntime: observation
        });
        // An unavailable read is sufficient to check turn ownership; no fake AE fact.
        policyOwner.attachObservationReadPort({ getState: () => ({ state: "ready" }), capture: () => Promise.reject(Error("unavailable")) }); policyOwner.activate(); policyOwner.beginTurn(); const turnBefore = policyOwner.getCurrentAgent().getSnapshot();
        await outcome(policyOwner.refreshActiveComposition()); const turnAfter = policyOwner.getCurrentAgent().getSnapshot();
        same(turnAfter.revision, turnBefore.revision + (["idle", "terminal"].includes(state) ? 1 : 0), state + " exact turn policy"); policyOwner.dispose();
    }
    // Immutable pre-fix comparison; fixture inputs and Host/Provider calls unchanged.
    for (const kind of ["text", "mutation", "noop", "logical"]) {
        const outputs = [];
        for (const baseline of ["105459b537d518a1199889f42059dcc1ba4f9282", undefined]) {
            const x = await create({ baseline, opacity: kind === "noop" ? 60 : 50 });
            if (kind === "text") await x.owner.startObjective(message); else { await x.start(kind === "logical"); await x.review(); if (kind === "logical") await x.review(); }
            const { committed, ...terminal } = x.owner.getAgentDriver().getSnapshot();
            if (!baseline) same(committed, kind === "mutation" || kind === "logical", "C2 latest attempt commit is explicit without changing observation ownership");
            outputs.push(JSON.stringify({ wires: x.wires, canonical: x.evidence.canonical, requests: x.requests, events: x.events, mutations: x.state.mutations, verifies: x.state.verifies, terminal })); x.dispose();
        }
        same(outputs[0], outputs[1], kind + " immutable sequential equivalence including read counts");
    }
    console.log("PASS Vela observation turn isolation: " + assertions + " assertions; 4 immutable pre-A6b production comparisons.");
}
run().catch(e => { console.error(e); process.exitCode = 1; });
