#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const observationModule = require("../client/js/vela/velaAgentObservationRuntime");

let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
async function expectCode(operation, code, message) {
    let thrown = null;
    try { await operation(); } catch (error) { thrown = error; }
    assertions += 1;
    assert.ok(thrown && thrown.code === code, message || ("Expected " + code));
}

const CODES = observationModule.ERROR_CODES;
check(Object.isFrozen(observationModule) && typeof observationModule.createAgentObservationRuntime === "function", "CommonJS exports the frozen runtime factory");

const sourcePath = path.join(__dirname, "../client/js/vela/velaAgentObservationRuntime.js");
const source = fs.readFileSync(sourcePath, "utf8");
const browser = { document: {} };
browser.self = browser;
browser.window = browser;
const priorModule = Object.freeze({ prior: true });
vm.runInNewContext(source, { self: browser, module: { exports: priorModule }, Object, Promise, Error, Array, String, Number, JSON, isFinite });
check(browser.VelaAgentObservationRuntime && typeof browser.VelaAgentObservationRuntime.createAgentObservationRuntime === "function", "CEP/browser hybrid publishes on the browser global");
equal(Object.prototype.hasOwnProperty.call(browser, "VelaAgentObservationRuntime"), true, "browser publication is an own global property");
check(!source.includes("Date.now") && !source.includes("setInterval") && !source.includes("requestAnimationFrame"), "runtime uses no clock or polling scheduler");

function harness(options = {}) {
    let snapshot = {
        agentId: "agent_test",
        lifecycleStage: options.lifecycleStage || "active",
        scopeId: "scope_a",
        scopeBoundary: { opaque: { value: 1 } },
        revision: options.revision === undefined ? 4 : options.revision
    };
    let observeCalls = 0;
    let lastRequest = null;
    const reports = [];
    const provider = Object.prototype.hasOwnProperty.call(options, "provider") ? options.provider : {
        observe(request) {
            observeCalls += 1;
            lastRequest = request;
            return { sourceKind: "test", payload: { comp: { name: "Demo" }, selected: [1, 2] } };
        }
    };
    const runtime = observationModule.createAgentObservationRuntime({
        readAgentSnapshot() { return snapshot; },
        provider,
        onError: options.onError || ((error, details) => reports.push({ error, details }))
    });
    return {
        runtime,
        reports,
        get calls() { return observeCalls; },
        get request() { return lastRequest; },
        setSnapshot(next) { snapshot = next; },
        mutateSnapshot(patch) { snapshot = Object.assign({}, snapshot, patch); }
    };
}

(async function run() {
    const initial = harness();
    equal(initial.runtime.getObservationSnapshot(), null, "observation snapshot starts null at revision zero");
    equal(initial.runtime.getContextSnapshot(), null, "context snapshot starts null");
    const accepted = await initial.runtime.refresh();
    equal(accepted.observationRevision, 1, "first accepted observation increments exactly once");
    equal(initial.calls, 1, "explicit refresh performs one provider read");
    check(Object.isFrozen(accepted) && Object.isFrozen(accepted.scopeToken) && Object.isFrozen(accepted.payload) && Object.isFrozen(accepted.payload.comp), "ObservationSnapshot is deeply frozen");
    equal(accepted.agentId, "agent_test", "ObservationSnapshot retains Agent provenance");
    assert.deepStrictEqual(accepted.scopeToken, { scopeId: "scope_a", agentRevision: 4 }); assertions += 1;
    assert.deepStrictEqual(initial.request.scopeToken, { scopeId: "scope_a", agentRevision: 4 }); assertions += 1;
    check(Object.isFrozen(initial.request) && Object.isFrozen(initial.request.scopeBoundary), "provider request and opaque Scope boundary are immutable");
    check(initial.request.scopeBoundary !== accepted.payload, "Scope boundary remains separate from observation facts");

    const isolatedPayload = { nested: { value: 7 } };
    const isolation = harness({ provider: { observe() { return { sourceKind: "test", payload: isolatedPayload }; } } });
    const isolatedObservation = await isolation.runtime.refresh();
    isolatedPayload.nested.value = 99;
    equal(isolatedObservation.payload.nested.value, 7, "nested provider payload is clone-isolated");
    const context = isolation.runtime.getContextSnapshot();
    check(Object.isFrozen(context) && Object.isFrozen(context.scopeToken) && Object.isFrozen(context.facts) && Object.isFrozen(context.facts.nested), "AgentContextSnapshot is deeply frozen");
    check(context.facts !== isolatedObservation.payload && context.scopeToken !== isolatedObservation.scopeToken, "Context projection is clone-isolated from Observation");
    assert.deepStrictEqual(context, { agentId: "agent_test", scopeToken: { scopeId: "scope_a", agentRevision: 4 }, observationRevision: 1, facts: { nested: { value: 7 } } }); assertions += 1;

    const deterministicA = harness({ provider: { observe() { return { sourceKind: "test", payload: { z: [1, { a: true }] } }; } } });
    const deterministicB = harness({ provider: { observe() { return Promise.resolve({ sourceKind: "test", payload: { z: [1, { a: true }] } }); } } });
    await deterministicA.runtime.refresh();
    await deterministicB.runtime.refresh();
    equal(JSON.stringify(deterministicA.runtime.getContextSnapshot()), JSON.stringify(deterministicB.runtime.getContextSnapshot()), "equivalent Observation inputs project deterministic Context");
    equal(deterministicA.runtime.getContextSnapshot(), deterministicA.runtime.getContextSnapshot(), "Context read returns committed snapshot without a side effect");

    let resolvePending;
    let pendingCalls = 0;
    const pending = harness({ provider: { observe() {
        pendingCalls += 1;
        if (pendingCalls === 1) { return new Promise(resolve => { resolvePending = resolve; }); }
        return { sourceKind: "test", payload: { ready: "again" } };
    } } });
    const firstPromise = pending.runtime.refresh();
    const duplicatePromise = pending.runtime.refresh();
    equal(firstPromise, duplicatePromise, "duplicate refresh returns the same in-flight Promise");
    await Promise.resolve();
    equal(pendingCalls, 1, "single-flight duplicate calls provider exactly once");
    resolvePending({ sourceKind: "test", payload: { ready: true } });
    await firstPromise;
    await pending.runtime.refresh();
    equal(pendingCalls, 2, "single-flight state clears after completion for a later explicit refresh");

    let resolveStale;
    let staleCalls = 0;
    const stale = harness({ provider: { observe() {
        staleCalls += 1;
        if (staleCalls === 1) { return new Promise(resolve => { resolveStale = resolve; }); }
        return { sourceKind: "test", payload: { fresh: true } };
    } } });
    const stalePromise = stale.runtime.refresh();
    await Promise.resolve();
    stale.mutateSnapshot({ scopeId: "scope_b", revision: 5, scopeBoundary: { opaque: { value: 2 } } });
    resolveStale({ sourceKind: "test", payload: { old: true } });
    await expectCode(() => stalePromise, CODES.OBSERVATION_RESULT_STALE, "Scope change rejects the pending result as stale");
    equal(stale.runtime.getObservationSnapshot(), null, "stale result is not committed");
    equal(stale.runtime.getContextSnapshot(), null, "stale result generates no current Context");
    equal(stale.reports[0].error.code, CODES.OBSERVATION_RESULT_STALE, "stale failure reaches the out-of-band reporter");
    const freshAfterStale = await stale.runtime.refresh();
    equal(freshAfterStale.observationRevision, 1, "stale result does not increment observationRevision");

    const unavailable = harness({ provider: null });
    await expectCode(() => unavailable.runtime.refresh(), CODES.OBSERVATION_PROVIDER_UNAVAILABLE, "missing provider fails unavailable");
    equal(unavailable.runtime.getObservationSnapshot(), null, "missing provider fabricates no observation");
    const noResult = harness({ provider: { observe() { return null; } } });
    await expectCode(() => noResult.runtime.refresh(), CODES.OBSERVATION_PROVIDER_UNAVAILABLE, "null provider result is unavailable, not empty success");
    equal(noResult.runtime.getObservationSnapshot(), null, "unavailable result does not increment or fabricate state");

    const rejected = harness({ provider: { observe() { throw new Error("raw provider detail"); } } });
    await expectCode(() => rejected.runtime.refresh(), CODES.OBSERVATION_PROVIDER_FAILED, "provider throw is normalized fail-closed");
    equal(rejected.reports[0].error.message, CODES.OBSERVATION_PROVIDER_FAILED, "raw provider exception does not cross the module boundary");
    const promiseRejected = harness({ provider: { observe() { return Promise.reject(new Error("raw rejection")); } } });
    await expectCode(() => promiseRejected.runtime.refresh(), CODES.OBSERVATION_PROVIDER_FAILED, "provider Promise rejection is normalized fail-closed");

    for (const malformed of [{}, { sourceKind: "", payload: {} }, { sourceKind: "test" }, { sourceKind: "test", payload: undefined }, { sourceKind: "test", payload: new Date() }]) {
        const invalid = harness({ provider: { observe() { return malformed; } } });
        await expectCode(() => invalid.runtime.refresh(), CODES.OBSERVATION_RESULT_INVALID, "malformed provider result fails closed");
        equal(invalid.runtime.getObservationSnapshot(), null, "malformed result commits no observation");
    }

    const created = harness({ lifecycleStage: "created" });
    await expectCode(() => created.runtime.refresh(), CODES.AGENT_NOT_ACTIVE, "created Agent fails closed as not active");
    equal(created.calls, 0, "not-active lifecycle gate runs before provider read");
    const disposedAgent = harness({ lifecycleStage: "disposed" });
    await expectCode(() => disposedAgent.runtime.refresh(), CODES.AGENT_DISPOSED, "disposed Agent fails closed");
    equal(disposedAgent.calls, 0, "disposed Agent cannot invoke provider");

    const disposal = harness();
    check(disposal.runtime.dispose(), "ObservationRuntime disposes once");
    check(!disposal.runtime.dispose() && disposal.runtime.isDisposed(), "ObservationRuntime dispose is idempotent");
    await expectCode(() => disposal.runtime.refresh(), CODES.OBSERVATION_RUNTIME_DISPOSED, "refresh after runtime dispose fails closed");
    equal(disposal.calls, 0, "disposed runtime cannot invoke provider");

    let throwingReporterCalls = 0;
    const contained = harness({ provider: null, onError() { throwingReporterCalls += 1; throw new Error("reporter failure"); } });
    await expectCode(() => contained.runtime.refresh(), CODES.OBSERVATION_PROVIDER_UNAVAILABLE, "throwing reporter cannot replace stable refresh failure");
    equal(throwingReporterCalls, 1, "throwing onError is invoked once and contained");
    equal(contained.runtime.getObservationSnapshot(), null, "reporter failure cannot mutate runtime truth");

    const sessionEvents = [];
    await harness({ provider: { observe() { return { sourceKind: "test", payload: { sessionEvents } }; } } }).runtime.refresh();
    equal(sessionEvents.length, 0, "refresh appends zero SessionEvents");

    const snapshotKeys = Object.keys(accepted).sort();
    assert.deepStrictEqual(snapshotKeys, ["agentId", "observationRevision", "payload", "scopeToken", "sourceKind"]); assertions += 1;
    const contextKeys = Object.keys(context).sort();
    assert.deepStrictEqual(contextKeys, ["agentId", "facts", "observationRevision", "scopeToken"]); assertions += 1;
    const serialized = JSON.stringify({ accepted, context });
    for (const field of ["authority", "permission", "approval", "executionArmed", "DelegationGrant", "capability", "mutation", "trustedTarget"]) {
        check(!Object.prototype.hasOwnProperty.call(accepted, field) && !Object.prototype.hasOwnProperty.call(context, field), "snapshots expose no " + field + " field");
    }
    check(!serialized.includes("Host mutation"), "snapshots contain no Host mutation handle");

    const runtimeKeys = Object.keys(initial.runtime);
    for (const api of ["start", "stop", "run", "poll", "subscribe", "advance", "step", "sendContextToProvider", "buildPrompt", "invokeModel", "execute", "discoverCapabilities"]) {
        check(!runtimeKeys.includes(api), "runtime exposes no " + api + " API");
    }
    equal(initial.calls, 1, "snapshot reads do not invoke Provider/model again");

    let optionError = null;
    try { observationModule.createAgentObservationRuntime({}); } catch (error) { optionError = error; }
    equal(optionError && optionError.code, CODES.OBSERVATION_RUNTIME_OPTIONS_INVALID, "missing Agent read seam fails closed");

    console.log("test-vela-agent-observation-context: " + assertions + " assertions passed");
}()).catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
