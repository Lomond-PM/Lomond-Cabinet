"use strict";
const assert = require("assert");
const { create, flush } = require("./fixtures/vela-trajectory-harness");
const BASE = "937386a92b0bda9ba0bab04752fcd63b868fa58e";
let assertions = 0;
function check(v, msg) { assertions++; assert.ok(v, msg); }
function same(a, b, msg) { assertions++; assert.deepStrictEqual(a, b, msg); }
function rejects(fn, msg) { assertions++; assert.throws(fn, undefined, msg); }
function frozen(v) { return !v || typeof v !== "object" ? typeof v !== "function" : Object.isFrozen(v) && Object.values(v).every(frozen); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
async function finish(h, logical) { let r = await h.start(logical); while (r.state === "awaiting-review") r = await h.review(); return r; }
async function run() {
    const cases = [
        { id: "opacity-mutation", mutation: "mutated", commit: true, verification: "verified-match" },
        { id: "rename-mutation", rename: true, mutation: "mutated", commit: true, verification: "verified-match" },
        { id: "opacity-noop", opacity: 60, mutation: "already-satisfied", commit: null, verification: "verified-match" },
        { id: "rename-noop", rename: true, name: "Vela Stream Test", mutation: "already-satisfied", commit: null, verification: "verified-match" },
        { id: "mutation-mismatch", verifyMode: "mismatch", mutation: "mutated", commit: true, verification: "verified-mismatch" },
        { id: "noop-mismatch", opacity: 60, verifyMode: "mismatch", mutation: "already-satisfied", commit: null, verification: "verified-mismatch" },
        { id: "verify-error", verifyMode: "error", mutation: "mutated", commit: true, verification: "verification-unavailable" },
        { id: "committed-error", hostMode: "committed-error", mutation: "mutated", commit: true, verification: "verified-match" },
        { id: "pre-setter-false", hostMode: "false", mutation: "not-mutated", commit: false, verification: "verification-not-run" },
        ...["null", "invoke", "malformed"].map(hostMode => ({ id: hostMode, hostMode, mutation: "unknown", commit: null, verification: "verification-not-run" })),
        { id: "two-step", logical: true, mutation: "mutated", commit: true, verification: "verified-match" },
        { id: "two-step-noop", logical: true, opacity: 60, name: "Vela Stream Test", mutation: "already-satisfied", commit: null, verification: "verified-match" }
    ];
    let example;
    for (const c of cases) {
        const h = await create(c); const result = await finish(h, c.logical); const projection = h.owner.getTrajectoryEvidence().terminal;
        check(projection && frozen(projection), c.id + " immutable terminal projection");
        const a = projection.attempts[0];
        same(a.execution.mutationDisposition, c.mutation, c.id + " exact source mutation disposition");
        same(a.execution.hostCommitted, c.commit, c.id + " Host tri-state");
        same(a.verification.disposition, c.verification, c.id + " independent Verify disposition");
        same(a.completion.outcome, result.terminal.outcome, c.id + " Driver completion");
        same(projection.bounds.complete, true, c.id + " normal path fully fits");
        same(a.correlation.providerRequestId, null, c.id + " no inferred Provider request");
        check(a.unknowns.some(x => x.path === "correlation.providerRequestId" && x.reason === "not-wired"), c.id + " explicit missing correlation");
        check(!JSON.stringify(projection).match(/nativeLayerId|propertyPath|executionArmed|RAW_TRAJECTORY_REASONING_SENTINEL|grantId|nonce/), c.id + " native/control/reasoning isolation");
        check(!h.wires.join("").includes("trajectory"), c.id + " Provider isolation");
        check(!JSON.stringify(h.owner.getSessionRuntime().getSnapshot()).includes("trajectory_"), c.id + " no Session schema/event additions");
        if (c.mutation === "already-satisfied") {
            same(h.state.mutations, 0, c.id + " no Host setter"); same(h.state.undo, 0, c.id + " no simulated Undo"); same(h.state.verifies, c.logical ? 2 : 1, c.id + " independent read");
            same(a.execution.reportedCommitted, false, c.id + " explicit no-op false"); same(a.execution.hostInvocationAttempted, false, c.id + " executor bypass");
            check(a.unknowns.some(x => x.path === "execution.hostCommitted" && x.reason === "host-not-invoked"), c.id + " absent Host fact explained");
        }
        if (c.verification === "verified-match" || c.verification === "verified-mismatch") {
            same(a.verification.freshAtRead, true, c.id + " freshness independent from equality");
            check(a.verification.sourceObservationId !== null && a.verification.attemptId !== null, c.id + " independent Verify source identities");
            same(a.verification.targetRelation, "committed-target", c.id + " target privately checked");
        }
        if (c.logical) { same(projection.attempts.length, 2, "separate logical attempts"); same(projection.completion.verifiedEvidenceStepCount, 2, "retained verified count"); }
        const prior = await create({ ...c, baseline: BASE }); const baselineResult = await finish(prior, c.logical);
        same(result, baselineResult, c.id + " pre/post complete Driver snapshot equivalence");
        same(h.requests, prior.requests, c.id + " exact Host request sequence/payload equivalence");
        same(h.wires, prior.wires, c.id + " exact wire/schema/generation/admission equivalence");
        same(h.state, prior.state, c.id + " same setter/Undo/Verify counts and actual state");
        same(h.owner.getSessionRuntime().getSnapshot(), prior.owner.getSessionRuntime().getSnapshot(), c.id + " unchanged Session events");
        if (!example) example = projection;
        h.dispose(); prior.dispose();
    }
    for (const action of ["rejected", "cancelled", "failed"]) {
        const h = await create(); await h.start(true); await h.review();
        const first = h.owner.getTrajectoryEvidence().active.attempts[0];
        if (action === "rejected") h.review("rejected");
        if (action === "cancelled") h.owner.cancelObjective();
        if (action === "failed") { h.state.verifyMode = "error"; await h.review(); }
        const e = h.owner.getTrajectoryEvidence().terminal;
        same(e.attempts[0], first, "step 0 unchanged after step 1 " + action);
        same(e.completion.coverage, "partial", action + " partial objective coverage");
        same(e.completion.completedStepCount, 1, action + " one completed step");
        same(e.completion.remainingStepCount, 1, action + " remaining step preserved");
        same(e.completion.verifiedEvidenceStepCount, 1, action + " count from retained facts");
        if (action !== "failed") { same(e.attempts[1].execution.mutationDisposition, "not-mutated", action + " direct no-execution proof"); same(e.attempts[1].verification.disposition, "verification-not-run", action + " direct no-Verify proof"); }
        h.dispose();
    }
    for (const hold of ["execution", "verify"]) {
        const h = await create(); await h.start(); h.state.hold = hold; const pending = h.review(); await flush();
        check(h.waiting.length === 1, hold + " deterministic dispatched operation");
        h.owner.cancelObjective(); const terminal = h.owner.getTrajectoryEvidence().terminal; const json = JSON.stringify(terminal);
        same(terminal.completion.outcome, "cancelled", hold + " cancellation not delayed");
        same(terminal.attempts[0].execution.hostCommitted, hold === "verify" ? true : null, hold + " preserves known commit else unknown");
        const old = h.owner.getTrajectoryEvidence().terminal; h.state.hold = null; let next = await h.start();
        const nextSlots = h.owner.getTrajectoryEvidence(); const nextProjection = nextSlots.active;
        h.release(); await pending; await flush();
        same(h.owner.getTrajectoryEvidence().active, nextProjection, hold + " late old settlement cannot report into next active attempt");
        same(h.owner.getTrajectoryEvidence().terminal, nextSlots.terminal, hold + " late result cannot replace latest terminal");
        same(JSON.stringify(old), json, hold + " minimum no late enrichment");
        if (next.state === "terminal") { same(next.terminal.code, "OBSERVATION_PROVIDER_FAILED", "existing busy Verify read can block next Observe; no lifecycle repair"); next = await h.start(); }
        else same(h.owner.getTrajectoryEvidence().terminal, old, hold + " previous terminal retained during next objective");
        check(h.owner.getTrajectoryEvidence().active.objective.objectiveId !== old.objective.objectiveId, hold + " next identity distinct");
        h.review("rejected"); check(h.owner.getTrajectoryEvidence().terminal !== old, hold + " latest terminal replaces slot"); h.dispose();
        same(h.owner.getTrajectoryEvidence(), { active: null, terminal: null }, hold + " dispose clears both slots");
    }
    const stale = await create(); await stale.start(true); stale.state.opacity = 40;
    const replanned = await stale.review(); same(replanned.state, "awaiting-review", "stale barrier replans under existing policy");
    let e = stale.owner.getTrajectoryEvidence().active;
    same(e.attempts.length, 2, "both materializations retained");
    same(e.attempts[0].execution.mutationDisposition, "not-mutated", "direct stale precommit proof");
    same(e.attempts[1].correlation.supersedesAttemptId, e.attempts[0].attemptId, "supersedes exact attempt");
    same(e.attempts[1].correlation.materializationAttempt, 1, "logical materialization increments"); stale.dispose();

    const delegated = await create(); delegated.runtime.grantNextOpacityMutation(); const delegatedResult = await delegated.start();
    same(delegatedResult.terminal.outcome, "completed", "retained delegated progression unchanged");
    e = delegated.owner.getTrajectoryEvidence().terminal;
    same(e.attempts[0].verification.scope, "current-selection", "legacy Verify scope explicit");
    same(e.attempts[0].verification.targetRelation, "unproven", "no target continuity repair");
    same(e.attempts[0].verification.disposition, "unknown", "comparison not executed-target verification");
    same(e.completion.verifiedEvidenceStepCount, 0, "Driver completion does not upgrade verified evidence count"); delegated.dispose();

    const h = await create(); await finish(h); const saved = h.owner.getTrajectoryEvidence().terminal;
    for (const method of ["resetSession", "suspend"]) { h.runtime[method](); same(h.owner.getTrajectoryEvidence().terminal, saved, method + " preserves copied history"); if (method === "suspend") h.runtime.resume(); }
    h.owner.getSessionRuntime().append({ kind: "tool/result", requestId: "forged", payload: { committed: true, matches: true } });
    same(h.owner.getTrajectoryEvidence().terminal, saved, "forged sparse Session fact has no ingestion path");
    const api = h.load("velaAgentRuntimeOwner"), build = api.createTrajectoryProjection;
    same(build(example), example, "closed constructor round-trip");
    for (const mutate of [x => { x.attempts[0].execution.hostCommitted = false; }, x => { x.attempts[0].verification.freshAtRead = null; }, x => { x.attempts[0].provenance[0].factPaths = ["arbitrary.path"]; }]) { const bad = clone(example); mutate(bad); rejects(() => build(bad), "reject contradictory live evidence or non-schema fact path"); }
    for (const property of ["reasoning", "nativeBinding", "nonce", "grant", "executionArmed"]) { const bad = clone(example); bad[property] = "sentinel"; rejects(() => build(bad), "reject foreign owner/control field " + property); }
    let accessorCalled = false; const accessor = clone(example); Object.defineProperty(accessor, "schema", { get() { accessorCalled = true; throw Error(); }, enumerable: true });
    rejects(() => build(accessor), "reject accessor"); same(accessorCalled, false, "never invoke accessor");
    for (const value of ["x".repeat(257), "中".repeat(86), 12, undefined]) { const bad = clone(example); bad.projectionId = value; rejects(() => build(bad), "bounded id validation"); }
    const oversized = clone(example); oversized.attempts[0].verification.actual = { kind: "string", data: "中".repeat(90) };
    const boundedValue = build(oversized); same(boundedValue.attempts[0].verification.actual, null, "oversize value omitted"); same(boundedValue.bounds.omittedValueCount, 1, "value omission count"); same(boundedValue.bounds.complete, false, "explicit incomplete evidence");
    const many = clone(example); many.attempts = Array.from({ length: 20 }, (_, i) => ({ ...clone(example.attempts[0]), attemptId: "attempt_" + i }));
    const bounded = build(many); check(bounded.attempts.length <= 16 && Buffer.byteLength(JSON.stringify(bounded)) <= 65536, "attempt and serialized byte bounds");
    check(bounded.bounds.omittedAttemptCount >= 4 && !bounded.bounds.complete, "omissions explicit"); same(bounded.completion.verifiedEvidenceStepCount, null, "incomplete count not zero");
    const resolver = h.load("velaAuthorityEvidenceResolver").createAuthorityEvidenceResolver({ session: h.owner.getSessionRuntime() });
    const protocol = h.load("velaProtocol").createProtocol(require("./velaNodeRuntime"));
    const grants = h.load("velaDelegationGrantStore").createDelegationGrantStore({ now: () => 100, idFactory: () => "grant_1" });
    for (const candidate of [saved, { schema: saved.schema, authorityCapable: true }, { ...clone(saved), executionArmed: true }, clone(saved)]) {
        rejects(() => h.load("velaPlanningContracts").createAuthorizedPlan(candidate), "trajectory cannot compose AuthorizedPlan");
        rejects(() => h.load("velaTaskRun").createTaskRun({ ...candidate, protocol }), "trajectory cannot create/arm TaskRun");
        rejects(() => resolver.resolveEvidence(candidate), "trajectory cannot resolve authority evidence");
        rejects(() => grants.issue(candidate), "trajectory cannot restore grant");
        rejects(() => h.owner.resolveObjectiveReview(candidate), "trajectory cannot satisfy Review");
        rejects(() => h.load("velaContextBridge").createCommittedTargetVerificationPort(candidate, protocol), "trajectory cannot restore native target handle");
    }
    for (let i = 0; i < 5; i++) { const current = h.owner.getTrajectoryEvidence(); rejects(() => { current.terminal.attempts.push({}); }, "consumer mutation rejected"); same(h.owner.getTrajectoryEvidence().terminal, saved, "reentrant getter preserves snapshot"); }
    h.dispose(); const reload = await create(); same(reload.owner.getTrajectoryEvidence(), { active: null, terminal: null }, "reload creates no restored trajectory");
    await reload.owner.startObjective({ message: "hello", endpoint: "http://127.0.0.1:1234", model: "m" }); same(reload.owner.getTrajectoryEvidence().terminal.attempts.length, 0, "text completion creates no mutation attempt"); reload.dispose();
    let inspected = 0, observing;
    observing = await create({ reportObserver() { if (observing) { check(frozen(observing.owner.getTrajectoryEvidence()), "reentrant read remains immutable"); inspected++; } throw Error("injected reporting consumer failure"); } });
    const observedResult = await finish(observing, true);
    same(observedResult.terminal.outcome, "completed", "report callback failure does not affect execution/progression");
    same([observing.state.mutations, observing.state.undo, observing.state.verifies], [2, 2, 2], "report failure does not add/remove setter/Undo/Verify");
    same(observing.owner.getTrajectoryEvidence().terminal.attempts.length, 2, "report errors do not drop valid projection"); check(inspected > 10, "source hooks actually exercised with reentrant throwing observer"); observing.dispose();
    console.log("PASS Vela verified trajectory: " + assertions + " assertions; " + cases.length + " pre-A4b production equivalence cases.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
