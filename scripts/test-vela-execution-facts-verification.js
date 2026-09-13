#!/usr/bin/env node
"use strict";
const assert = require("assert");
const { create, flush } = require("./fixtures/vela-execution-facts-harness");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function same(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); assertions += 1; }
function toolResults(h) { return h.owner.getSessionRuntime().getEvents().filter(e => e.kind === "tool/result"); }
async function finish(h, route, logical) { if (route === "delegated") h.runtime.grantNextOpacityMutation(); let state = await h.start(logical); while (state.state === "awaiting-review") state = await h.review(); return state; }
async function run() {
    const matrix = [
        { id: "mutation", commit: true, writes: 1, terminal: "completed", disposition: "mutated", verify: true },
        { id: "noop", opacity: 60, commit: false, writes: 0, terminal: "completed", disposition: "already-satisfied", verify: true },
        { id: "select-same-B", afterSettlement(m) { m.selection = 3; }, commit: true, writes: 1, terminal: "completed", verify: true },
        { id: "select-different-B", otherOpacity: 17, afterSettlement(m) { m.selection = 3; }, commit: true, writes: 1, terminal: "completed", verify: true },
        { id: "A-changed-B-same", afterSettlement(m) { m.targets.get(2).opacity = 19; m.selection = 3; }, commit: true, writes: 1, terminal: "blocked", verify: true },
        { id: "A-deleted-B-same", afterSettlement(m) { m.targets.delete(2); m.selection = 3; }, commit: true, writes: 1, terminal: "blocked", verify: true },
        { id: "comp-switched-A-still-readable", afterSettlement(m) { m.comp = 9; m.selection = 3; }, commit: true, writes: 1, terminal: "completed", verify: true },
        { id: "A-index-replaced", afterSettlement(m) { m.targets.get(2).index = 4; }, commit: true, writes: 1, terminal: "blocked", verify: true },
        { id: "wrong-verify-identity", wrongVerificationIdentity: true, commit: true, writes: 1, terminal: "blocked", verify: true },
        { id: "noop-A-changed", opacity: 60, afterSettlement(m) { m.targets.get(2).opacity = 10; m.selection = 3; }, commit: false, writes: 0, terminal: "blocked", disposition: "already-satisfied", verify: true },
        { id: "noop-A-deleted", opacity: 60, afterSettlement(m) { m.targets.delete(2); m.selection = 3; }, commit: false, writes: 0, terminal: "blocked", disposition: "already-satisfied", verify: true },
        { id: "known-negative", hostMode: "false", commit: false, writes: 0, terminal: "blocked", disposition: "not-mutated", verify: false },
        { id: "uncertain", hostMode: "null", commit: null, writes: 0, terminal: "blocked", disposition: "unknown", verify: false },
        { id: "invoke-uncertain", hostMode: "invoke", commit: null, writes: 0, terminal: "blocked", verify: false },
        { id: "malformed-uncertain", hostMode: "malformed", commit: null, writes: 0, terminal: "blocked", verify: false },
        { id: "uncertain-after-write", hostMode: "uncertain-after-write", commit: null, writes: 1, terminal: "blocked", verify: false },
        { id: "committed-result-error", hostMode: "committed-error", commit: true, writes: 1, terminal: "completed", verify: true },
        { id: "committed-verify-error", verifyMode: "error", commit: true, writes: 1, terminal: "blocked", verify: true }
    ];
    for (const route of ["review", "delegated"]) for (const item of matrix) {
        const h = await create(item);
        try {
            const result = await finish(h, route);
            const label = route + "/" + item.id;
            same(result.terminal.outcome, item.terminal, label + " outcome");
            same(result.committed, item.commit, label + " Driver preserves tri-state");
            const receipts = toolResults(h);
            same(receipts.length, 1, label + " one execution fact, no automatic mutation retry");
            same(receipts[0].payload.committed, item.commit, label + " Session preserves tri-state");
            same(receipts[0], h.owner.getSessionRuntime().getEventBySeq(receipts[0].seq), label + " A04 exact receipt retained");
            check(Object.isFrozen(receipts[0].payload), label + " A04 data-only snapshot remains frozen");
            check(receipts[0].payload.taskPlanId && receipts[0].payload.stepId, label + " safe attempt correlation");
            if (item.disposition) same(receipts[0].payload.disposition, item.disposition, label + " no-op/mutation disposition");
            same(h.model.dispatches, item.opacity === 60 ? 0 : 1, label + " mutation dispatch count");
            same(h.model.writes, item.writes, label + " independent simulated setter count");
            const targetReads = h.model.reads.filter(read => read.operation.startsWith("observeCommitted"));
            same(targetReads.length, item.verify ? 1 : 0, label + " separate bound verification read request");
            check(targetReads.every(read => read.target === 2 && read.comp === 1), label + " verifier never substitutes current selection");
            const attempt = h.owner.getTrajectoryEvidence().terminal.attempts[0];
            same(attempt.execution.reportedCommitted, item.commit, label + " trajectory agrees on reported commit");
            if (item.disposition) same(attempt.execution.mutationDisposition, item.disposition, label + " trajectory disposition");
            if (item.terminal === "completed") {
                same(attempt.verification.targetRelation, "committed-target", label + " exact local target relation");
                const observation = h.owner.getSessionRuntime().getEvents().filter(e => e.kind === "ae/state-observed" && e.payload.phase === "post-action").pop();
                check(observation.payload.fresh === true && observation.payload.matches === true && observation.payload.targetRelation === "committed-target", label + " Session target-bound fresh Verify facts");
            }
            check(!JSON.stringify(h.owner.getSessionRuntime().getSnapshot()).match(/nativeLayerId|propertyPath|confirmationNonce|delegatedActivationToken|executionResult|boundPlan/), label + " no private control handles in public events");
            if (item.id === "uncertain-after-write") {
                const before = h.owner.getAgentDriver().getSnapshot();
                const observation = await h.runtime.getAgentDriverRuntimePort().verifyOpacity({ expectedOpacity: 60 });
                check(observation.fresh && observation.matches, label + " independent later current-value read matches");
                same(h.owner.getAgentDriver().getSnapshot(), before, label + " later matching read does not manufacture commit/completion");
                same(toolResults(h)[0].payload.committed, null, label + " uncertainty is not upgraded by later read");
            }
        } finally { h.dispose(); }
    }

    for (const route of ["review", "delegated"]) {
        const h = await create({ holdVerify: true });
        try {
            if (route === "delegated") h.runtime.grantNextOpacityMutation();
            let pending = h.start();
            if (route === "review") { same((await pending).state, "awaiting-review", "Review before delayed Verify"); pending = h.review(); }
            await flush();
            same(h.waiting.length, 1, route + " Verify is dispatched and deliberately delayed");
            h.owner.cancelObjective();
            const cancelled = h.owner.getTrajectoryEvidence().terminal;
            same(h.owner.getAgentDriver().getSnapshot().committed, true, route + " cancel is not rollback");
            const next = await h.start();
            const snapshot = h.owner.getAgentDriver().getSnapshot();
            const nextEvidence = h.owner.getTrajectoryEvidence();
            h.release(); await pending; await flush();
            same(h.owner.getAgentDriver().getSnapshot(), snapshot, route + " late Verify cannot finish replaced objective");
            same(h.owner.getTrajectoryEvidence(), nextEvidence, route + " late Verify cannot rewrite trajectory");
            same(cancelled.completion.outcome, "cancelled", route + " original terminal stays cancelled");
            check(next.objectiveId !== cancelled.objective.objectiveId, route + " replacement objective identity differs");
        } finally { h.dispose(); }
    }

    for (const phase of ["tool/result", "post-action", "task/execution-armed"]) for (const route of ["review", "delegated"]) {
        if (phase === "task/execution-armed" && route === "review") continue; // This deferred Session Authority publication belongs to the delegated route.
        const h = await create();
        let next;
        let original;
        let subscription;
        try {
            subscription = h.owner.getSessionRuntime().subscribe(event => {
                if (next || !(event.kind === phase || phase === "post-action" && event.kind === "ae/state-observed" && event.payload.phase === phase)) return;
                subscription.unsubscribe();
                h.owner.cancelObjective();
                original = h.owner.getAgentDriver().getSnapshot();
                next = h.start();
            });
            if (route === "delegated") h.runtime.grantNextOpacityMutation();
            const initial = await h.start();
            if (route === "review") { same(initial.state, "awaiting-review", "explicit Review before synchronous callback probe"); await h.review(); }
            check(next, route + "/" + phase + " synchronous publication cancelled the original objective");
            const replacement = await next;
            same(original.terminal.outcome, "cancelled", route + "/" + phase + " callback cancellation stays terminal");
            same(original.committed, phase === "task/execution-armed" ? null : true, route + "/" + phase + " cancellation preserves settled facts only");
            check(replacement.objectiveId !== original.objectiveId, "replacement has its own identity");
            if (phase === "task/execution-armed") same(replacement.terminal, { outcome: "blocked", code: "PROVIDER_REQUEST_IN_FLIGHT" }, "existing Provider ownership blocks synchronous restart before old request settlement; no lifecycle expansion");
            else same(replacement.state, "awaiting-review", "old event callback cannot complete the replacement");
            same(h.model.writes, phase === "task/execution-armed" ? 0 : 1, "no extra mutation from synchronous reentry");
            same(h.model.reads.filter(r => r.operation.startsWith("observeCommitted")).length, phase === "post-action" ? 1 : 0, "no late verification after publication cancellation");
        } finally { if (subscription) subscription.unsubscribe(); h.dispose(); }
    }

    for (const kind of ["rejected", "preflight-drift"]) {
        const h = await create();
        try {
            await h.start();
            if (kind === "preflight-drift") h.model.targets.get(2).opacity = 41;
            const result = await h.review(kind === "rejected" ? "rejected" : "approved");
            same(result.committed, false, kind + " known pre-dispatch result is false");
            same(h.model.dispatches, 0, kind + " no Host mutation dispatch");
            same(h.model.writes, 0, kind + " no setter evidence");
            const evidence = h.owner.getTrajectoryEvidence();
            same((evidence.active || evidence.terminal).attempts[0].execution.reportedCommitted, false, kind + " trajectory has direct non-execution fact");
        } finally { h.dispose(); }
    }

    for (const name of ["Layer A", "Vela Stream Test"]) {
        const h = await create({ rename: true, name });
        try {
            const result = await finish(h, "review");
            same(result.terminal.outcome, "completed", "typed rename uses existing bound attribute Verify");
            same(result.committed, name !== "Vela Stream Test", "rename mutation/no-op retains exact fact");
            same(h.model.writes, name === "Vela Stream Test" ? 0 : 1, "rename setter counted independently");
            same(h.model.reads.filter(r => r.operation === "observeCommittedLayerAttributeValue").length, 1, "rename no-op also verifies freshly");
        } finally { h.dispose(); }
    }

    const logical = await create({ opacity: 60 });
    try {
        same((await logical.start(true)).state, "awaiting-review", "logical no-op step enters Review");
        same((await logical.review()).state, "awaiting-review", "verified no-op advances to second Review");
        const first = logical.owner.getTrajectoryEvidence().active.attempts[0];
        logical.state.hostMode = "null";
        const result = await logical.review();
        same(result.terminal.outcome, "blocked", "later uncertain step blocks logical objective");
        same(result.committed, null, "snapshot describes latest attempt, not prior steps");
        same(result.logicalPlan.completedStepCount, 1, "verified no-op counts as completed step");
        same(result.logicalPlan.partialCompletion, true, "later failure retains partial completion");
        same(toolResults(logical).map(e => e.payload.committed), [false, null], "each logical attempt keeps its own commit fact");
        same(logical.owner.getTrajectoryEvidence().terminal.attempts[0], first, "prior no-op verified evidence unchanged");
        same(logical.model.writes, 0, "neither no-op nor uncertain-negative model wrote");
    } finally { logical.dispose(); }
    console.log("test-vela-execution-facts-verification: " + assertions + " assertions passed");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
