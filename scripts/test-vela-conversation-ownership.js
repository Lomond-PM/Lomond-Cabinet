"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const ownershipModule = require("../client/js/vela/velaConversationOwnership");
const entropy = bytes => require("crypto").randomFillSync(bytes);
const PresentationModel = require("../client/js/vela/velaPresentationModel").VelaPresentationModel;
const ownership = { ...ownershipModule, createOwnership: options => ownershipModule.createOwnership({ presentation: PresentationModel.create(), ...options }, entropy) };
const { harness, flush } = require("./test-vela-surface-bootstrap-boundary");
const real = require("./fixtures/vela-selection-harness");
let assertions = 0;
function check(value, message) { assertions++; assert.ok(value, message); }
function same(a, b, message) { assertions++; assert.strictEqual(a, b, message); }
function rejects(fn, code) { assertions++; assert.throws(fn, error => error.code === code); }
function fixture() {
    let disposed = false, runtimeDisposed = false;
    const session = Object.freeze({ sessionId: "session_1", isClosed: () => disposed });
    const agentOwner = Object.freeze({ agentId: "agent_1", getSessionRuntime: () => session, isDisposed: () => disposed });
    const runtime = Object.freeze({ getStatus: () => ({ state: runtimeDisposed ? "disposed" : "ready", disposed: runtimeDisposed }) });
    return { bundle: { agentOwner, session, runtime, presentation: PresentationModel.create() }, closeOwner() { disposed = true; }, closeRuntime() { runtimeDisposed = true; } };
}
async function run() {
    const a = fixture(), b = fixture(), handle = ownership.createOwnership(a.bundle), other = ownership.createOwnership(b.bundle);
    check(/^conversation_[a-f0-9]{32}_[1-9][0-9]*$/.test(handle.conversationId), "dedicated product namespace");
    check(handle.conversationId !== other.conversationId, "two bundles with repeated local identities have independent ids");
    same(Object.keys(handle).join(","), "conversationId", "handle exposes correlation only");
    const id = handle.conversationId, binding = ownership.readBinding(handle);
    for (const key of ["agentOwner", "session", "runtime"]) same(binding[key], a.bundle[key], "exact " + key + " reference, no clone");
    check(Object.isFrozen(handle) && Object.isFrozen(binding), "handle and association immutable");
    assertions++; assert.throws(() => { binding.runtime = b.bundle.runtime; }, TypeError);
    assertions++; assert.throws(() => { handle.conversationId = other.conversationId; }, TypeError);
    a.bundle.runtime = b.bundle.runtime;
    same(ownership.readBinding(handle), binding, "caller options cannot hot swap the association");
    same(handle.conversationId, id, "live identity stable");
    rejects(() => ownership.createOwnership({ ...b.bundle, session: binding.session }), "CONVERSATION_BINDING_INVALID");
    rejects(() => ownership.createOwnership({ ...b.bundle, conversationId: id }), "CONVERSATION_BINDING_INVALID");
    rejects(() => ownership.readBinding({ conversationId: id }), "CONVERSATION_OWNER_STALE");
    rejects(() => ownership.readBinding(id), "CONVERSATION_OWNER_STALE");
    same(ownership.dispose(handle), true, "dispose once");
    same(ownership.dispose(handle), false, "idempotent dispose");
    same(ownership.isLive(handle), false, "disposed handle dead");
    rejects(() => ownership.readBinding(handle), "CONVERSATION_OWNER_STALE");
    same(binding.agentOwner.isDisposed(), false, "record disposal does not dispose trusted Agent");
    same(binding.runtime.getStatus().disposed, false, "record disposal does not operate on Runtime");
    const newer = ownership.createOwnership({ ...binding, presentation: PresentationModel.create() });
    check(newer.conversationId !== id, "new record cannot revive the old identity");
    rejects(() => ownership.readBinding(handle), "CONVERSATION_OWNER_STALE");
    b.closeRuntime(); same(ownership.isLive(other), false, "external Runtime disposal invalidates association");
    rejects(() => ownership.readBinding(other), "CONVERSATION_OWNER_STALE");
    a.closeOwner(); same(ownership.isLive(newer), false, "external Agent disposal invalidates association");

    // Browser entry is independent of CEP CommonJS globals and survives duplicate script evaluation.
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaConversationOwnership"), "utf8");
    const context = { crypto: require("crypto").webcrypto, module: { exports: { sentinel: true } }, require() { throw Error("browser must not require"); } };
    context.window = context; context.self = context; vm.createContext(context); vm.runInContext(source, context);
    const browserModule = context.VelaConversationOwnership, browserHandle = browserModule.createOwnership(fixture().bundle, entropy);
    vm.runInContext(source, context);
    same(context.VelaConversationOwnership, browserModule, "duplicate script preserves module and registry");
    check(browserModule.isLive(browserHandle), "duplicate load preserves live handle");
    check(context.module.exports.sentinel, "CEP CommonJS untouched");
    same(ownership.isLive(browserHandle), false, "foreign-module handle not recognized");
    const freshPage = { crypto: require("crypto").webcrypto }; freshPage.window = freshPage; freshPage.self = freshPage;
    vm.createContext(freshPage); vm.runInContext(source, freshPage);
    same(freshPage.VelaConversationOwnership.isLive(browserHandle), false, "reload cannot restore old handle");
    const unavailable = { crypto: { getRandomValues() { throw Error("unavailable"); } } }; unavailable.window = unavailable; unavailable.self = unavailable;
    vm.createContext(unavailable); vm.runInContext(source, unavailable);
    rejects(() => unavailable.VelaConversationOwnership.createOwnership(fixture().bundle, () => { throw Error("unavailable"); }), "CONVERSATION_ID_UNAVAILABLE");
    const fixedEntropy = bytes => bytes.fill(0);
    check(ownershipModule.createOwnership(fixture().bundle, fixedEntropy).conversationId !== ownershipModule.createOwnership(fixture().bundle, fixedEntropy).conversationId, "serial prevents duplicate ids even with repeated entropy");

    // Execute actual main composition functions, including delayed/stale bootstrap continuations.
    const h = harness(); await h.context.__testHooks.initializeRuntime();
    const initial = h.context.__testHooks.conversation(); check(initial, "only initialized bundle is published");
    same(ownership.readBinding(initial.handle).session, h.calls.runtimeOptions.exactAgentSession, "Runtime construction receives identical Session");
    same(ownership.readBinding(initial.handle).agentOwner, h.context.__testHooks.agentOwner(), "production exact Owner");
    same(ownership.readBinding(initial.handle).runtime, h.context.__testHooks.runtime(), "production exact Runtime");
    await h.context.__testHooks.initializeRuntime(); same(h.context.__testHooks.conversation(), initial, "same core notifications preserve stable conversation");
    h.context.coreBootstrapSnapshot = { hostReady: false, generation: 2 };
    h.context.__testHooks.invalidateForCore(h.context.coreBootstrapSnapshot);
    same(h.context.__testHooks.conversation(), null, "core invalidation clears current binding synchronously");
    rejects(() => ownership.readBinding(initial.handle), "CONVERSATION_OWNER_STALE");
    same(h.calls.runtimeDispose, 1, "old Runtime disposed"); same(h.calls.agentOwnerDispose, 1, "old Owner disposed");
    h.context.coreBootstrapSnapshot = { hostReady: true, generation: 3 };
    await h.context.__testHooks.initializeRuntime(); const next = h.context.__testHooks.conversation();
    check(next && next.handle.conversationId !== initial.handle.conversationId, "new core publishes new ownership");
    same(h.calls.agentOwnerCreate, 2, "new Runtime is not attached to an old one-shot Owner");
    same(h.calls.surfaceCreate, 2, "Surface rebuilt through existing lifecycle, without ownership migration");
    // Even reassigning the obsolete composition record cannot make it current.
    h.context.velaConversationBinding = initial;
    same(h.context.__testHooks.conversation(), null, "old core record cannot become current again");
    h.context.velaConversationBinding = next;
    h.context.__testHooks.disposeBundle();
    rejects(() => ownership.readBinding(next.handle), "CONVERSATION_OWNER_STALE");
    h.context.panelLifecycleGeneration++;
    h.context.coreBootstrapSnapshot = { hostReady: true, generation: 4 };
    await h.context.__testHooks.initializeRuntime();
    check(h.context.__testHooks.conversation().handle.conversationId !== next.handle.conversationId, "dispose/reinitialize creates fresh conversation");

    const delayed = harness({ deferFirst: true }); delayed.context.__testHooks.initializeRuntime(); await flush();
    same(delayed.context.__testHooks.conversation(), null, "pending candidate has no published conversation");
    delayed.context.coreBootstrapSnapshot = { hostReady: true, generation: 2 };
    await delayed.context.__testHooks.initializeRuntime(); const committed = delayed.context.__testHooks.conversation();
    delayed.calls.resolveFirst({ ok: true }); await flush();
    same(delayed.context.__testHooks.conversation(), committed, "late old core success cannot replace conversation");
    const failed = harness({ runtimeFailure: true }); await failed.context.__testHooks.initializeRuntime();
    same(failed.context.__testHooks.conversation(), null, "failed initialize never publishes ownership");
    const missing = harness(); delete missing.context.VelaConversationOwnership; await missing.context.__testHooks.initializeRuntime();
    same(missing.context.__testHooks.runtime(), null, "missing ownership dependency fails before publication");
    same(missing.calls.runtimeDispose, 1, "failed ownership creation disposes candidate");

    const disposalOrder = []; let closingHandle;
    const closing = harness({ onDispose(kind) { if (closingHandle) same(ownership.isLive(closingHandle), false, "ownership revoked before " + kind + " callback"); disposalOrder.push(kind); } });
    await closing.context.__testHooks.initializeRuntime(); closingHandle = closing.context.__testHooks.conversation().handle;
    // Execute the actual panel shutdown body with only unrelated app systems stubbed.
    const mainSource = fs.readFileSync(require.resolve("../client/js/main.js"), "utf8");
    const shutdownSource = mainSource.slice(mainSource.indexOf("    function shutdownPanelRuntime() {"), mainSource.indexOf("    function recoverPanelRuntime()"));
    for (const name of ["lifecycleDebug", "clearProceduralAppearanceSourceDebounce", "stopSelectionPolling", "stopRegistryStatePolling", "clearRegistrySaveTimers", "unbindThemePaletteStore", "teardownPaletteWorkspace", "closeRegistryColorPicker", "cleanupTransientUiState"]) closing.context[name] = () => {};
    Object.assign(closing.context, { coreBootstrapController: null, HomeLayoutManager: null, statusTimer: null });
    closing.context.velaSurfaceShell.dispose = () => {};
    vm.runInContext(shutdownSource + "\nshutdownPanelRuntime();", closing.context);
    same(disposalOrder.join(","), "surface,runtime,owner", "panel shutdown preserves Surface/Runtime/Session disposal order");
    same(closing.context.__testHooks.conversation(), null, "actual shutdown clears current ownership");
    rejects(() => ownership.readBinding(closingHandle), "CONVERSATION_OWNER_STALE");
    closing.context.panelShuttingDown = false; closing.context.panelLifecycleGeneration++;
    closing.context.coreBootstrapSnapshot = { hostReady: true, generation: 1 };
    await closing.context.__testHooks.initializeRuntime();
    check(closing.context.__testHooks.conversation().handle.conversationId !== closingHandle.conversationId, "new panel lifecycle can reuse core number without reviving conversation");

    // Real production owners: wrapping is observational, including an active Review.
    const realBundle = await real.create();
    const session = realBundle.owner.getSessionRuntime(), before = session.getEvents();
    const realHandle = ownership.createOwnership({ agentOwner: realBundle.owner, session, runtime: realBundle.runtime });
    same(ownership.readBinding(realHandle).session, session, "real Session object retained exactly");
    same(session.getEvents().length, before.length, "creation appends no authority/control events");
    const resolver = realBundle.load("velaAuthorityEvidenceResolver").createAuthorityEvidenceResolver({ session });
    for (const value of [realHandle, { conversationId: realHandle.conversationId }]) {
        assertions++; assert.throws(() => resolver.resolveEvidence(value), "conversation identity is not authority evidence");
        assertions++; assert.throws(() => realBundle.load("velaPlanningContracts").createAuthorizedPlan(value), "conversation identity cannot restore AuthorizedPlan");
    }
    await realBundle.start(); const suspended = realBundle.owner.getAgentDriver().getSnapshot().suspendedReview;
    check(suspended, "unchanged Review happy path");
    ownership.dispose(realHandle);
    same(realBundle.owner.getAgentDriver().getSnapshot().suspendedReview, suspended, "ownership disposal neither clones nor resolves Review");
    await realBundle.review();
    same(realBundle.owner.getAgentDriver().getSnapshot().terminal.outcome, "completed", "existing authority path still completes through original owner");
    same(realBundle.state.mutations, 1, "one Host mutation");
    check(realBundle.state.verifies > 0, "fresh Verify occurred");
    realBundle.dispose();

    // Compare actual Provider/Host/Session outputs against immutable sealed 0.3.10 sources.
    async function trace(baseline, mode) {
        const h = await real.create({ baseline, holdProvider: mode === "cancel" });
        const handle = baseline ? null : ownership.createOwnership({ agentOwner: h.owner, session: h.owner.getSessionRuntime(), runtime: h.runtime });
        if (mode === "review") { await h.start(); await h.review(); }
        else {
            const pending = h.owner.startObjective({ message: "Explain keyframes without edits", endpoint: "http://127.0.0.1:1234", model: "m" });
            if (mode === "cancel") { await real.flush(); h.owner.cancelObjective(); h.release(); }
            await pending;
        }
        const result = { wires: h.wires, canonical: h.evidence.canonical, requests: h.requests, events: h.owner.getSessionRuntime().getEvents(), driver: h.owner.getAgentDriver().getSnapshot(), selection: h.runtime.getProviderSelectionEvidence(), state: h.state };
        const serialized = JSON.stringify(result);
        if (handle) ownership.dispose(handle);
        h.dispose(); return serialized;
    }
    for (const mode of ["text", "review", "cancel"]) {
        same(await trace(null, mode), await trace("4d2f544", mode), "sealed 0.3.10 exact output equivalence: " + mode);
    }
    console.log("test-vela-conversation-ownership: " + assertions + " assertions passed.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
