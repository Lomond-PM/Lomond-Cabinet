#!/usr/bin/env node
"use strict";

const assert = require("assert");
const registryModule = require("../client/js/vela/velaAgentCapabilityRegistry");
const runtimeModule = require("../client/js/vela/velaAgentCapabilityRuntime");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function throwsCode(fn, code, message) { let found; try { fn(); } catch (error) { found = error; } equal(found && found.code, code, message); }
async function rejectsCode(promise, code, message) { let found; try { await promise; } catch (error) { found = error; } equal(found && found.code, code, message); }
function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

const empty = { type: "object", properties: {}, required: [], additionalProperties: false };
const output = { type: "object", properties: { value: { type: "number" } }, required: ["value"], additionalProperties: false };
function definition(id, kind, environment, concurrency, adapterId) {
    return { capabilityId: id, kind, inputSchema: empty, outputSchema: output, executionEnvironment: environment, adapterId, concurrency, cancellation: environment === "host" ? "commit-only" : "cooperative" };
}

(async function () {
    const read = definition("read-test-v1", "read", "host", "exclusive", "read-adapter-v1");
    const analyze = definition("analyze-test-v1", "analyze", "client", "parallel-safe", "analyze-adapter-v1");
    const registry = registryModule.createRegistry([read, analyze], { availabilityResolvers: { "read-test-v1": () => true, "analyze-test-v1": () => true } });
    equal(registry.listCapabilityIds().join(","), "analyze-test-v1,read-test-v1", "valid read and analyze register deterministically");
    equal(registry.getModelProjection("read-test-v1").adapterId, undefined, "model projection excludes local adapter metadata");
    equal(registry.getLocalProjection("read-test-v1").adapterId, "read-adapter-v1", "local projection includes adapter metadata");
    throwsCode(() => registryModule.createRegistry([read, read]), "CAPABILITY_DUPLICATE", "duplicate capability id fails");
    throwsCode(() => registryModule.createRegistry([{ ...read, kind: "mutate" }]), "CAPABILITY_DEFINITION_INVALID", "unknown kind fails");
    throwsCode(() => registryModule.createRegistry([{ ...read, future: true }]), "CAPABILITY_DEFINITION_INVALID", "unknown field fails");
    throwsCode(() => registryModule.createRegistry([{ ...analyze, executionEnvironment: "host", concurrency: "exclusive" }]), "CAPABILITY_DEFINITION_INVALID", "analyze host execution fails");
    throwsCode(() => registryModule.createRegistry([{ ...read, concurrency: "parallel-safe" }]), "CAPABILITY_DEFINITION_INVALID", "host parallel-safe fails");

    let owner = { sessionId: "session-a", turnId: "turn-a", scopeId: "scope-a", agentRevision: 1 };
    let adapterCalls = 0;
    const basic = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => owner, adapters: {
        "read-adapter-v1": () => { adapterCalls += 1; return { value: 7 }; },
        "analyze-adapter-v1": (invocation) => ({ value: Object.keys(invocation.input).length })
    } });
    const first = await basic.invoke({ capabilityId: "read-test-v1", input: {} });
    const second = await basic.invoke({ capabilityId: "read-test-v1", input: {} });
    check(first.invocationId !== second.invocationId, "invocation ids are unique");
    equal(first.sessionId, "session-a", "result retains session ownership");
    equal(first.turnId, "turn-a", "result retains turn ownership");
    equal(first.status, "succeeded", "valid output succeeds");
    check(Object.isFrozen(first) && Object.isFrozen(first.data), "result and data are immutable");
    const invalidInput = await basic.invoke({ capabilityId: "read-test-v1", input: { extra: true } });
    equal(invalidInput.error.code, "INVALID_INPUT", "invalid input returns closed error");
    equal(adapterCalls, 2, "invalid input never reaches adapter");
    const unknown = await basic.invoke({ capabilityId: "missing-v1", input: {} });
    equal(unknown.error.code, "UNKNOWN_CAPABILITY", "unknown capability fails closed");

    const unavailableRegistry = registryModule.createRegistry([read]);
    const unavailableRuntime = runtimeModule.createCapabilityRuntime({ registry: unavailableRegistry, readOwnership: () => owner, adapters: { "read-adapter-v1": () => ({ value: 1 }) } });
    equal((await unavailableRuntime.invoke({ capabilityId: "read-test-v1", input: {} })).status, "unavailable", "missing scoped availability resolver is unavailable");

    const malformed = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => owner, adapters: { "read-adapter-v1": () => ({ value: 1, partial: true }), "analyze-adapter-v1": () => ({ value: 0 }) } });
    const malformedResult = await malformed.invoke({ capabilityId: "read-test-v1", input: {} });
    equal(malformedResult.status, "error", "malformed output is not succeeded");
    equal(malformedResult.data, null, "malformed output exposes no partial data");
    equal(malformedResult.error.code, "INVALID_OUTPUT", "malformed output uses stable code");
    const wrongIdentityRuntime = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => owner, adapters: { "read-adapter-v1": () => ({ invocationId: "wrong", value: 1 }), "analyze-adapter-v1": () => ({ value: 0 }) } });
    equal((await wrongIdentityRuntime.invoke({ capabilityId: "read-test-v1", input: {} })).error.code, "INVALID_OUTPUT", "adapter cannot replace or inject invocation identity");

    const slowA = deferred(); const slowB = deferred(); const entries = [];
    const runtimeA = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => ({ sessionId: "s1", turnId: "t1", scopeId: "x", agentRevision: 1 }), adapters: { "read-adapter-v1": () => { entries.push("A"); return slowA.promise; }, "analyze-adapter-v1": () => ({ value: 0 }) } });
    const runtimeB = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => ({ sessionId: "s2", turnId: "t2", scopeId: "y", agentRevision: 1 }), adapters: { "read-adapter-v1": () => { entries.push("B"); return slowB.promise; }, "analyze-adapter-v1": () => ({ value: 0 }) } });
    const callA = runtimeA.invoke({ capabilityId: "read-test-v1", input: {} });
    const callB = runtimeB.invoke({ capabilityId: "read-test-v1", input: {} });
    await Promise.resolve(); await Promise.resolve();
    equal(entries.join(","), "A", "different sessions share one process Host serialization boundary");
    slowA.resolve({ value: 1 }); await callA; await Promise.resolve();
    equal(entries.join(","), "A,B", "second Host adapter enters only after first settles");
    slowB.resolve({ value: 2 }); await callB;

    const gate = deferred(); let queuedEntries = 0;
    const running = runtimeA.invoke({ capabilityId: "read-test-v1", input: {} });
    // Replace adapter behavior through a separate runtime while the global queue is occupied.
    const blockerRegistry = registryModule.createRegistry([read], { availabilityResolvers: { "read-test-v1": () => true } });
    const blocker = runtimeModule.createCapabilityRuntime({ registry: blockerRegistry, readOwnership: () => ({ sessionId: "s3", turnId: "t3", scopeId: "z", agentRevision: 1 }), adapters: { "read-adapter-v1": () => { queuedEntries += 1; return gate.promise; } } });
    await running;
    const blocking = blocker.invoke({ capabilityId: "read-test-v1", input: {} }); await Promise.resolve(); await Promise.resolve();
    const queued = runtimeB.invoke({ capabilityId: "read-test-v1", input: {} });
    check(queued.cancel(), "queued invocation cancels before Host entry");
    equal((await queued).status, "cancelled", "cancel returns closed cancelled result");
    gate.resolve({ value: 3 }); await blocking; await Promise.resolve(); await Promise.resolve();
    equal(entries.filter((x) => x === "B").length, 1, "cancelled queued invocation never enters Host adapter");

    let staleOwner = { sessionId: "ss", turnId: "old", scopeId: "scope", agentRevision: 1 };
    const late = deferred();
    const staleRuntime = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => staleOwner, adapters: { "read-adapter-v1": () => late.promise, "analyze-adapter-v1": () => ({ value: 0 }) } });
    const staleCall = staleRuntime.invoke({ capabilityId: "read-test-v1", input: {} }); await Promise.resolve(); await Promise.resolve();
    staleOwner = { ...staleOwner, turnId: "new" }; late.resolve({ value: 9 });
    await rejectsCode(staleCall, "CAPABILITY_RESULT_DISCARDED", "previous-turn callback is discarded, not delivered as a result");
    equal(staleRuntime.getActiveInvocationIds().length, 0, "discard is terminal exactly once");

    let disposeOwner = { sessionId: "sd", turnId: "td", scopeId: "scope-d", agentRevision: 1, disposed: false };
    const disposeLate = deferred();
    const disposeRuntime = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => disposeOwner, adapters: { "read-adapter-v1": () => disposeLate.promise, "analyze-adapter-v1": () => ({ value: 0 }) } });
    const disposeCall = disposeRuntime.invoke({ capabilityId: "read-test-v1", input: {} }); await Promise.resolve(); await Promise.resolve();
    disposeOwner = { ...disposeOwner, disposed: true }; disposeLate.resolve({ value: 4 });
    await rejectsCode(disposeCall, "CAPABILITY_RESULT_DISCARDED", "disposed scope callback is discarded");

    const cancelledLate = deferred();
    const cancelRuntime = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => owner, adapters: { "read-adapter-v1": () => cancelledLate.promise, "analyze-adapter-v1": () => ({ value: 0 }) } });
    const cancelCall = cancelRuntime.invoke({ capabilityId: "read-test-v1", input: {} }); await Promise.resolve(); await Promise.resolve();
    check(cancelCall.cancel(), "active Host invocation can be commit-cancelled");
    equal((await cancelCall).status, "cancelled", "active cancellation settles once");
    cancelledLate.resolve({ value: 10 }); await Promise.resolve(); await Promise.resolve();
    equal(cancelRuntime.getActiveInvocationIds().length, 0, "late callback after cancel cannot recommit");
    check(!cancelCall.cancel(), "terminal invocation cannot cancel twice");

    let analyzeActive = 0; let analyzePeak = 0; const analyzeGateA = deferred(); const analyzeGateB = deferred();
    const analyzeRuntime = runtimeModule.createCapabilityRuntime({ registry, readOwnership: () => owner, adapters: { "read-adapter-v1": () => ({ value: 0 }), "analyze-adapter-v1": () => { analyzeActive += 1; analyzePeak = Math.max(analyzePeak, analyzeActive); const gateValue = analyzeActive === 1 ? analyzeGateA : analyzeGateB; return gateValue.promise.then(() => { analyzeActive -= 1; return { value: 0 }; }); } } });
    const analyzeA = analyzeRuntime.invoke({ capabilityId: "analyze-test-v1", input: {} });
    const analyzeB = analyzeRuntime.invoke({ capabilityId: "analyze-test-v1", input: {} });
    await Promise.resolve(); await Promise.resolve(); equal(analyzePeak, 2, "explicit client parallel-safe analyze calls may overlap");
    analyzeGateA.resolve(); analyzeGateB.resolve();
    assert.deepStrictEqual((await analyzeA).data, (await analyzeB).data); assertions += 1;
    equal(adapterCalls, 2, "analyze path never enters Host read adapter");

    console.log("test-vela-agent-capability-runtime: " + assertions + " assertions passed");
}()).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
