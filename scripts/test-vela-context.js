#!/usr/bin/env node
"use strict";

const assert = require("assert");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const context = contextModule.createContextApi(protocol);
let assertions = 0;

function check(condition, message) { assert.ok(condition, message); assertions += 1; }
function expectCode(callback, code, message) { assert.throws(callback, (error) => error && error.code === code, message || ("Expected " + code)); assertions += 1; }

function makeSnapshot(overrides) {
    return Object.assign({
        sessionId: "ae-session-01",
        tier: 3,
        capturedAt: "volatile-a",
        locale: "en",
        activeComp: { sessionId: "comp-session-01", type: "CompItem", width: 1920, height: 1080, name: "Comp A" },
        selection: [{ sessionId: "layer-session-03", layerIndex: 3, matchName: "ADBE Text Layer", type: "Text", name: "Title" }],
        target: { compId: "comp-session-01", layerId: "layer-session-03", layerIndex: 3, propertyPath: ["ADBE Transform Group", "ADBE Position"], propertyValueDigest: "sha256:value-01", expressionDigest: "sha256:expression-01" },
        relevantToolState: { schemaRevision: 2, params: { paddingX: 40, paddingY: 20 } },
        homeOrder: ["unrelated", "ui"]
    }, overrides || {});
}

function run() {
    const first = context.fingerprintContext(makeSnapshot(), { requireStableContext: true });
    const reordered = context.fingerprintContext(makeSnapshot({ capturedAt: "volatile-b", relevantToolState: { params: { paddingY: 20, paddingX: 40 }, schemaRevision: 2 } }), { requireStableContext: true });
    check(first.fingerprint === reordered.fingerprint, "Canonical context fingerprinting must ignore volatile fields and object key order.");
    check(first.canonicalJson.indexOf("capturedAt") === -1 && first.canonicalJson.indexOf("Comp A") === -1, "Volatile timestamps and display names must not enter default fingerprints.");
    check(first.fingerprint.indexOf("sha256:") === 0, "Context fingerprint must use the sha256 prefix.");
    const changedProperty = context.fingerprintContext(makeSnapshot({ target: Object.assign({}, makeSnapshot().target, { propertyValueDigest: "sha256:value-02" }) }), { requireStableContext: true });
    check(first.fingerprint !== changedProperty.fingerprint, "A covered property digest change must stale the context.");
    const changedSelection = context.fingerprintContext(makeSnapshot({ selection: [{ sessionId: "layer-session-04", layerIndex: 4, matchName: "ADBE Text Layer", type: "Text" }], target: { compId: "comp-session-01", layerId: "layer-session-04", layerIndex: 4, propertyPath: ["ADBE Position"], propertyValueDigest: "sha256:value-01", expressionDigest: "sha256:expression-01" } }), { requireStableContext: true });
    check(first.fingerprint !== changedSelection.fingerprint, "A covered selection change must stale the context.");
    const namesBoundA = context.fingerprintContext(makeSnapshot(), { requireStableContext: true, bindsToDisplayName: true });
    const namesBoundB = context.fingerprintContext(makeSnapshot({ activeComp: Object.assign({}, makeSnapshot().activeComp, { name: "Comp B" }) }), { requireStableContext: true, bindsToDisplayName: true });
    check(namesBoundA.fingerprint !== namesBoundB.fingerprint, "A name-bound action must include the bound display name.");
    const unorderedA = context.fingerprintContext(makeSnapshot({ selection: [{ sessionId: "layer-session-04", layerIndex: 4, matchName: "ADBE Text Layer", type: "Text" }, { sessionId: "layer-session-03", layerIndex: 3, matchName: "ADBE Text Layer", type: "Text" }] }), { requireStableContext: true, selectionOrderMeaningful: false });
    const unorderedB = context.fingerprintContext(makeSnapshot({ selection: [{ sessionId: "layer-session-03", layerIndex: 3, matchName: "ADBE Text Layer", type: "Text" }, { sessionId: "layer-session-04", layerIndex: 4, matchName: "ADBE Text Layer", type: "Text" }] }), { requireStableContext: true, selectionOrderMeaningful: false });
    check(unorderedA.fingerprint === unorderedB.fingerprint, "Only explicitly set-like selection arrays may be order-independent.");
    const orderedA = context.fingerprintContext(makeSnapshot({ selection: [{ sessionId: "layer-session-04", layerIndex: 4, matchName: "ADBE Text Layer", type: "Text" }, { sessionId: "layer-session-03", layerIndex: 3, matchName: "ADBE Text Layer", type: "Text" }] }), { requireStableContext: true, selectionOrderMeaningful: true });
    check(orderedA.fingerprint !== unorderedA.fingerprint, "Meaningful selection order must remain in the fingerprint.");
    const settingsA = context.fingerprintSettings({ capabilityPolicyRevision: "policy-1", registrySchemaRevision: "registry-1", hostAdapterRevision: "host-1" });
    const settingsB = context.fingerprintSettings({ hostAdapterRevision: "host-1", registrySchemaRevision: "registry-1", capabilityPolicyRevision: "policy-1" });
    check(settingsA === settingsB, "Execution settings key order must not affect fingerprint.");
    check(context.fingerprintSettings({ capabilityPolicyRevision: "policy-2" }) !== settingsA, "Execution setting changes must produce a new fingerprint.");
    expectCode(() => context.fingerprintSettings({ provider: "local" }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider/model/UI settings must not enter execution settings fingerprinting.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ sessionId: undefined }), { requireStableContext: true }), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Undefined context identities must be rejected as unsafe JSON.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ target: { propertyPath: ["ADBE Position"] } }), { requireStableContext: true }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Executable targets must have stable identities.");
    const getter = {};
    Object.defineProperty(getter, "sessionId", { enumerable: true, get: () => "bad" });
    expectCode(() => context.fingerprintContext(getter), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Context getters must be rejected before normalization.");
    const cycle = makeSnapshot(); cycle.relevantToolState = {}; cycle.relevantToolState.self = cycle.relevantToolState;
    expectCode(() => context.fingerprintContext(cycle), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Context cycles must be rejected before normalization.");
    const dangerous = makeSnapshot(); dangerous.relevantToolState = JSON.parse('{"__proto__":{"polluted":true}}');
    expectCode(() => context.fingerprintContext(dangerous), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Dangerous context keys must be rejected.");
    console.log("PASS Vela context: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela context - " + error.message);
    process.exitCode = 1;
}
