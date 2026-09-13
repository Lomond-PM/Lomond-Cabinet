"use strict";
const assert = require("assert");
const { fixture } = require("./test-vela-surface-controller");
const { create, flush } = require("./fixtures/vela-provider-lifecycle-harness");
let assertions = 0;
function eq(a, b, message) { assert.deepStrictEqual(a, b, message); assertions++; }
function ok(value, message) { assert.ok(value, message); assertions++; }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const config = { endpoint: "http://127.0.0.1:1234", model: "configured-model", acknowledged: true };
const ready = { ready: true, modelId: config.model };
async function readiness() {
    let f = fixture(); f.controller.mount(); f.controller.configureExperimental(config);
    await f.controller.enableExperimental(); eq(f.controller.getExperimentalState().enabled, true, "ready control");
    f.controller.configureExperimental({ ...config, acknowledged: false });
    eq(f.controller.getExperimentalState().enabled, false, "A05 withdrawal revokes ready");
    eq(f.controller.getExperimentalState().readiness, null, "withdrawal clears readiness");
    await f.controller.enableExperimental(); eq(f.calls.check.length, 1, "withdrawn acknowledgement cannot check"); f.controller.dispose();
    for (const invalidation of ["withdraw", "config", "suspend", "dispose"]) {
        const old = deferred(), fresh = deferred(); let checks = 0;
        f = fixture({ readinessCheck: () => ++checks === 1 ? old.promise : fresh.promise });
        f.controller.mount(); f.controller.configureExperimental(config); const pending = f.controller.enableExperimental();
        if (invalidation === "withdraw") f.controller.configureExperimental({ ...config, acknowledged: false });
        if (invalidation === "config") f.controller.configureExperimental({ ...config, endpoint: "http://localhost:1234" });
        if (invalidation === "suspend") { f.controller.suspend(); f.controller.resume(); }
        if (invalidation === "dispose") f.controller.dispose();
        ok(f.controller.getExperimentalState().state !== "checking", invalidation + " ends checking");
        if (invalidation !== "dispose") {
            f.controller.configureExperimental(config); const retry = f.controller.enableExperimental();
            eq(checks, 2, invalidation + " explicit retry starts a new check");
            old.resolve(ready); await pending;
            eq(f.controller.getExperimentalState().state, "checking", "old success cannot overwrite new check");
            fresh.resolve(ready); await retry;
            eq(f.controller.getExperimentalState().enabled, true, "new check enables normally");
            f.controller.disableExperimental(); await f.controller.enableExperimental();
            eq(checks, 3, "same configuration can be checked again");
        } else { old.resolve(ready); await pending; eq(f.controller.getExperimentalState().enabled, false, "disposed view cannot become ready"); }
        f.controller.dispose();
    }
    // Rebuilding a conversation Surface is distinct from resuming the same instance.
    const old = deferred(); f = fixture({ readinessPromise: old.promise }); f.controller.mount(); f.controller.configureExperimental(config);
    const pending = f.controller.enableExperimental(); f.controller.dispose();
    const replacement = fixture(); replacement.controller.mount(); replacement.controller.configureExperimental(config);
    old.resolve(ready); await pending;
    eq(replacement.calls.check.length, 0, "rebuild does not auto-check");
    eq(replacement.controller.getExperimentalState().enabled, false, "old generation cannot enable replacement");
    await replacement.controller.enableExperimental(); eq(replacement.controller.getExperimentalState().enabled, true, "replacement explicit retry"); replacement.controller.dispose();
    f = fixture({ readinessCheck() { throw Error("network boundary"); } }); f.controller.mount(); f.controller.configureExperimental(config);
    await f.controller.enableExperimental(); eq(f.controller.getExperimentalState().state, "readiness-network-failed", "synchronous network failure exits checking"); f.controller.dispose();
}
async function pair(options) {
    const h = create(options); h.a = await h.composition.createRecord(); h.b = await h.composition.createRecord();
    h.composition.select(h.a); h.pa = h.composition.getSourcePort(h.a); h.pb = h.composition.getSourcePort(h.b);
    h.driver = h.bundles[0].owner.getAgentDriver(); h.host = h.bundles[0]; return h;
}
function blockedSend(h) {
    assert.throws(() => h.pb.provider.send("Set opacity to 60%"), e => e.code === "PROVIDER_SESSION_DISABLED"); assertions++;
    assert.throws(() => h.pb.authority.grant(), e => e.code === "PROVIDER_SESSION_DISABLED"); assertions++;
}
async function owners() {
    let h = await pair();
    try {
        await h.pa.provider.send("Set opacity to 60%"); const review = h.pa.confirmation.captureReviewCommands();
        h.composition.select(h.b); h.view.disableExperimental(); await flush();
        eq(h.driver.getSnapshot().terminal.outcome, "cancelled", "selected B disables A's Review");
        eq(h.driver.getSnapshot().suspendedReview, null, "Review is retired");
        eq(h.composition.getActiveRecord(), null, "settled Review releases holder"); blockedSend(h);
        h.enable(); assert.throws(() => review.approve(), e => e.code === "CONVERSATION_REVIEW_STALE"); assertions++;
        await h.pb.provider.send("Set opacity to 60%"); eq(h.bundles[1].owner.getAgentDriver().getSnapshot().state, "awaiting-review", "fresh objective allowed after explicit re-enable");
    } finally { h.dispose(); }
    // Actual in-flight Host, both local Review and one-shot Authority. No transport replacement inside Runtime.
    for (const direct of [false, true]) for (const hostMode of ["normal", "false", "null", "committed-error"]) {
        h = await pair({ hostMode });
        try {
            if (direct) await h.pa.authority.grant(); else await h.pa.provider.send("Set opacity to 60%");
            h.host.state.hold = "execution";
            const pending = direct ? h.pa.provider.send("Set opacity to 60%") : h.pa.confirmation.captureReviewCommands().approve();
            await flush(); eq(h.host.waiting.length, 1, "Host operation dispatched and awaiting callback");
            h.composition.select(h.b); h.view.disableExperimental();
            eq(h.composition.getActiveRecord(), h.a, "global stop keeps actual A holder");
            eq(h.composition.getAdmissionState().providerStopped, true, "panel records stop while holder settles");
            ok(h.driver.getSnapshot().state !== "terminal", "not terminal before Host callback");
            const buttons = h.elements.actionSlot.children;
            ok(buttons.some(b => b.textContent === "vela.surfaceCancel" && !b.hidden && !b.disabled), "background control remains reachable while disabled");
            blockedSend(h); h.view.disableExperimental(); // Idempotent stop cannot release or erase A.
            h.host.release(); await pending; await flush();
            const committed = hostMode === "false" ? false : hostMode === "null" ? null : true;
            eq(h.driver.getSnapshot().committed, committed, "late execution preserves tri-state committed: " + direct + "/" + hostMode);
            eq(h.driver.getSnapshot().terminal.outcome, "cancelled", "settled cancellation cannot complete objective");
            eq(h.host.state.verifies, 0, "stop starts no later Verify or step");
            eq(h.host.requests.filter(r => r.capabilityId && r.scope && r.scope.params).length, 1, "exactly one mutation dispatch");
            const results = h.host.owner.getSessionRuntime().getEvents().filter(e => e.kind === "tool/result");
            eq(results.at(-1).payload.committed, committed, "Session execution fact agrees with Driver");
            const attempt = h.host.owner.getTrajectoryEvidence().terminal.attempts[0];
            eq(attempt.execution.reportedCommitted, committed, "trajectory reported commit agrees");
            eq(attempt.execution.hostCommitted, committed, "trajectory retains Host evidence");
            eq(h.composition.getActiveRecord(), null, "holder releases only after settlement");
        } finally { h.dispose(); }
    }
    h = await pair();
    try { await h.pa.authority.grant(); h.composition.select(h.b); h.view.disableExperimental(); h.enable(); eq(h.pa.authority.getState().active, false, "unused grant never revives"); }
    finally { h.dispose(); }
}
async function phases() {
    const streams = [];
    let h = await pair({ fetch: async url => {
        let controller; const body = new ReadableStream({ start(c) { controller = c; } });
        streams.push({ chunk(delta, reason = null) { try { controller.enqueue(new TextEncoder().encode("data: " + JSON.stringify({ choices: [{ delta, finish_reason: reason }] }) + "\n\n")); } catch (_) {} }, done() { try { controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n")); controller.close(); } catch (_) {} } });
        return { status: 200, redirected: false, url, headers: new Headers({ "content-type": "text/event-stream" }), body };
    } });
    try {
        const old = h.pa.provider.send("Explain animation"); await flush(); streams[0].chunk({ content: "partial" }); await flush();
        h.composition.select(h.b); h.view.disableExperimental(); await old; await flush();
        eq(h.driver.getSnapshot().terminal.outcome, "cancelled", "background generation stops"); blockedSend(h);
        h.enable(); const next = h.pb.provider.send("Explain other"); await flush();
        streams[0].chunk({ content: "old proposal" }, "stop"); streams[0].done(); await flush();
        eq(h.composition.getActiveRecord(), h.b, "late model contents cannot release next holder");
        streams[1].chunk({ content: "new response" }, "stop"); streams[1].done(); await next;
        eq(h.bundles[1].owner.getAgentDriver().getSnapshot().terminal.outcome, "completed", "new generation succeeds");
        eq(h.host.state.mutations, 0, "no mutation from stale model content");
    } finally { h.dispose(); }
    // Approved Review stopped during a real fresh read, before mutation dispatch.
    let hold = false;
    h = await pair({ holdHostResponse: r => hold && r.operation === "captureContext" });
    try {
        await h.pa.provider.send("Set opacity to 60%"); hold = true;
        const pending = h.pa.confirmation.captureReviewCommands().approve(); await flush();
        eq(h.host.waiting.length, 1, "approved continuation held at fresh read");
        h.composition.select(h.b); h.view.disableExperimental(); hold = false; h.host.release(); await pending;
        eq(h.host.requests.filter(r => r.capabilityId && r.scope && r.scope.params).length, 0, "stop before dispatch prevents mutation");
        eq(h.driver.getSnapshot().committed, false, "known non-execution remains false");
    } finally { h.dispose(); }
    for (const direct of [false, true]) for (const noOp of [false, true]) {
        h = await pair({ opacity: noOp ? 60 : 20 });
        try {
            if (direct) await h.pa.authority.grant(); else await h.pa.provider.send("Set opacity to 60%");
            h.host.state.hold = "verify";
            const pending = direct ? h.pa.provider.send("Set opacity to 60%") : h.pa.confirmation.captureReviewCommands().approve();
            await flush(); eq(h.driver.getSnapshot().state, "verifying", "held at target Verify");
            h.composition.select(h.b); h.view.disableExperimental();
            eq(h.composition.getActiveRecord(), h.a, "Verify holder retained"); h.host.release(); await pending;
            eq(h.driver.getSnapshot().committed, !noOp, "Verify cancellation preserves mutation/no-op");
            eq(h.driver.getSnapshot().terminal.outcome, "cancelled", "late Verify cannot complete stopped objective");
            eq(h.host.state.mutations, noOp ? 0 : 1, "writes distinct from read/dispatch count");
        } finally { h.dispose(); }
    }
    h = await pair();
    try {
        await h.pa.provider.send("把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test");
        h.host.state.hold = "verify"; const pending = h.pa.confirmation.captureReviewCommands().approve(); await flush();
        h.composition.select(h.b); h.view.disableExperimental(); h.host.release(); await pending;
        eq(h.host.state.name, "Layer A", "stopped logical objective never renames");
        eq(h.host.state.mutations, 1, "no second mutation");
        eq(h.driver.getSnapshot().committed, true, "completed write still recorded");
    } finally { h.dispose(); }
    h = await pair();
    try {
        await h.pa.provider.send("Set opacity to 60%"); h.host.state.hold = "execution";
        const pending = h.pa.confirmation.captureReviewCommands().approve(); await flush();
        h.composition.suspend();
        eq(h.host.runtime.getStatus().state, "ready", "panel suspend defers Host Runtime teardown until settlement");
        eq(h.composition.getActiveRecord(), h.a, "suspend retains holder");
        h.host.release(); await pending; await flush();
        eq(h.host.runtime.getStatus().state, "suspended", "Runtime suspended after callback settlement");
        eq(h.driver.getSnapshot().committed, true, "suspend retains write fact");
        h.composition.resume(); h.enable(); h.host.state.hold = null;
        eq(h.host.runtime.getStatus().state, "ready", "resumed Runtime can retry");
        await h.pb.provider.send("Explain animation"); eq(h.bundles[1].owner.getAgentDriver().getSnapshot().terminal.outcome, "completed", "normal post-resume request");
    } finally { h.dispose(); }
    h = await pair({ opacity: 60 });
    try {
        await h.pa.provider.send("把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test");
        await h.pa.confirmation.captureReviewCommands().approve();
        eq(h.driver.getSnapshot().state, "awaiting-review", "logical second Review reached");
        eq(h.driver.getSnapshot().logicalPlan.completedStepCount, 1, "first no-op verified");
        const first = h.host.owner.getTrajectoryEvidence().active.attempts[0];
        h.composition.select(h.b); h.view.disableExperimental(); await flush();
        eq(h.driver.getSnapshot().logicalPlan.completedStepCount, 1, "stop preserves completed no-op step");
        eq(h.host.owner.getTrajectoryEvidence().terminal.attempts[0], first, "earlier step facts unchanged");
        eq(h.host.state.mutations, 0, "later Review stop dispatches nothing");
    } finally { h.dispose(); }
}
async function mainWiring() {
    const fs = require("fs"), vm = require("vm");
    const main = fs.readFileSync(require.resolve("../client/js/main"), "utf8");
    for (const action of ["disable", "withdraw"]) {
        const h = await pair();
        try {
            await h.pa.provider.send("Set opacity to 60%"); h.composition.select(h.b);
            const node = () => ({ checked: true, handlers: {}, addEventListener(name, handler) { this.handlers[name] = handler; } });
            const acknowledgement = node(), enableButton = node(), disableButton = node();
            const context = { Promise, acknowledgement, enableButton, disableButton, VelaExperimentalAcknowledged: true,
                VelaProviderEndpoint: config.endpoint, VelaProviderModel: config.model, velaExperimentalSessionRequested: true,
                velaConversationComposition: h.composition, velaSurfaceController: h.view, velaRuntimeLastErrorCode: null,
                tr: k => k, velaExperimentalStatusKey: k => k, byId: id => ({ velaExperimentalAcknowledgement: acknowledgement, velaExperimentalEnable: enableButton, velaExperimentalDisable: disableButton })[id],
                configureSession() { context.configureVelaExperimentalSession(); }, refreshSession() { context.refreshVelaExperimentalSettings(); }, saveEndpoint() {}, saveModel() {}
            };
            vm.createContext(context);
            vm.runInContext(main.slice(main.indexOf("    function stopVelaExperimentalSession() {"), main.indexOf("    var BackgroundEngine =")), context);
            vm.runInContext(main.slice(main.indexOf('        acknowledgement.addEventListener("change"'), main.indexOf("        mount.appendChild(acknowledgementLabel.root)")), context);
            context.refreshVelaExperimentalSettings(); eq(disableButton.disabled, false, "global Disable remains available with selected B/active A");
            if (action === "withdraw") { acknowledgement.checked = false; acknowledgement.handlers.change(); } else disableButton.handlers.click();
            await flush(); eq(h.driver.getSnapshot().terminal.outcome, "cancelled", "actual main " + action + " dispatches to A");
            eq(context.velaExperimentalSessionRequested, false, "panel intent revoked first");
            blockedSend(h);
            // The real click handler sets intent after saving a configuration that invalidates it.
            let requestedAtCheck = null;
            context.saveEndpoint = () => context.stopVelaExperimentalSession();
            context.velaSurfaceController = { enableExperimental() { requestedAtCheck = context.velaExperimentalSessionRequested; return Promise.resolve(); } };
            context.refreshSession = () => {};
            enableButton.handlers.click(); await flush(); eq(requestedAtCheck, true, "configuration save cannot erase explicit retry intent");
        } finally { h.dispose(); }
    }
}
(async () => { await readiness(); await owners(); await phases(); await mainWiring(); console.log("PASS Provider/task lifecycle: " + assertions + " assertions."); })().catch(e => { console.error(e); process.exitCode = 1; });
