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
        hostInstanceId: "host_0123456789abcdef0123456789abcdef0123456789abcdef",
        hostReloadEpoch: 1,
        tier: 3,
        capturedAt: "volatile-a",
        locale: "en",
        activeComp: { compId: "comp-session-01", type: "CompItem", width: 1920, height: 1080, name: "Comp A" },
        selection: [{ layerId: "layer-session-03", layerIndex: 3, matchName: "ADBE Text Layer", type: "Text", name: "Title" }],
        target: { compId: "comp-session-01", layerId: "layer-session-03", layerIndex: 3, propertyPath: ["named", "ADBE Transform Group", 0, "named", "ADBE Position", 0], propertyMatchName: "ADBE Position", propertyValueDigest: "sha256:value-01", expressionDigest: "sha256:expression-01" },
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
    check(first.canonicalJson.indexOf("host_0123456789abcdef0123456789abcdef0123456789abcdef") !== -1 && first.canonicalJson.indexOf("hostReloadEpoch") !== -1, "Stable fingerprints must include exact Host authority.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ hostInstanceId: undefined }), { requireStableContext: true }), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Missing Host instance authority must be rejected.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ hostReloadEpoch: 0 }), { requireStableContext: true }), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Host reload epoch must be positive.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ hostInstanceId: "host_bad" }), { requireStableContext: true }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Host instance identity must use the fixed opaque format.");
    const changedHost = context.fingerprintContext(makeSnapshot({ hostReloadEpoch: 2 }), { requireStableContext: true });
    check(changedHost.fingerprint !== first.fingerprint, "Host reload authority changes must alter the context fingerprint.");
    const changedProperty = context.fingerprintContext(makeSnapshot({ target: Object.assign({}, makeSnapshot().target, { propertyValueDigest: "sha256:value-02" }) }), { requireStableContext: true });
    check(first.fingerprint !== changedProperty.fingerprint, "A covered property digest change must stale the context.");
    const changedSelection = context.fingerprintContext(makeSnapshot({ selection: [{ layerId: "layer-session-04", layerIndex: 4, matchName: "ADBE Text Layer", type: "Text" }], target: { compId: "comp-session-01", layerId: "layer-session-04", layerIndex: 4, propertyPath: ["named", "ADBE Position", 0], propertyMatchName: "ADBE Position", propertyValueDigest: "sha256:value-01", expressionDigest: "sha256:expression-01" } }), { requireStableContext: true });
    check(first.fingerprint !== changedSelection.fingerprint, "A covered selection change must stale the context.");
    const namesBoundA = context.fingerprintContext(makeSnapshot(), { requireStableContext: true, bindsToDisplayName: true });
    const namesBoundB = context.fingerprintContext(makeSnapshot({ activeComp: Object.assign({}, makeSnapshot().activeComp, { name: "Comp B" }) }), { requireStableContext: true, bindsToDisplayName: true });
    check(namesBoundA.fingerprint !== namesBoundB.fingerprint, "A name-bound action must include the bound display name.");
    const unorderedA = context.fingerprintContext(makeSnapshot({ selection: [{ layerId: "layer-session-04", layerIndex: 4, selectedOrder: 0, matchName: "ADBE Text Layer", type: "Text" }, { layerId: "layer-session-03", layerIndex: 3, selectedOrder: 1, matchName: "ADBE Text Layer", type: "Text" }] }), { requireStableContext: true, selectionOrderMeaningful: false });
    const unorderedB = context.fingerprintContext(makeSnapshot({ selection: [{ layerId: "layer-session-03", layerIndex: 3, selectedOrder: 0, matchName: "ADBE Text Layer", type: "Text" }, { layerId: "layer-session-04", layerIndex: 4, selectedOrder: 1, matchName: "ADBE Text Layer", type: "Text" }] }), { requireStableContext: true, selectionOrderMeaningful: false });
    check(unorderedA.fingerprint === unorderedB.fingerprint, "Only explicitly set-like selection arrays may be order-independent.");
    const orderedA = context.fingerprintContext(makeSnapshot({ selection: [{ layerId: "layer-session-04", layerIndex: 4, selectedOrder: 0, matchName: "ADBE Text Layer", type: "Text" }, { layerId: "layer-session-03", layerIndex: 3, selectedOrder: 1, matchName: "ADBE Text Layer", type: "Text" }] }), { requireStableContext: true, selectionOrderMeaningful: true });
    check(orderedA.fingerprint !== unorderedA.fingerprint, "Meaningful selection order must remain in the fingerprint.");
    const settingsA = context.fingerprintSettings({ capabilityPolicyRevision: "policy-1", registrySchemaRevision: "registry-1", hostAdapterRevision: "host-1" });
    const settingsB = context.fingerprintSettings({ hostAdapterRevision: "host-1", registrySchemaRevision: "registry-1", capabilityPolicyRevision: "policy-1" });
    check(settingsA === settingsB, "Execution settings key order must not affect fingerprint.");
    check(context.fingerprintSettings({ capabilityPolicyRevision: "policy-2" }) !== settingsA, "Execution setting changes must produce a new fingerprint.");
    expectCode(() => context.fingerprintSettings({ provider: "local" }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Provider/model/UI settings must not enter execution settings fingerprinting.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ sessionId: undefined }), { requireStableContext: true }), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Undefined context identities must be rejected as unsafe JSON.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ target: { propertyPath: ["named", "ADBE Position", 0], propertyMatchName: "ADBE Position" } }), { requireStableContext: true }), protocol.ERROR_CODES.UNKNOWN_TARGET, "Executable targets must have stable identities.");
    const getter = {};
    Object.defineProperty(getter, "sessionId", { enumerable: true, get: () => "bad" });
    expectCode(() => context.fingerprintContext(getter), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Context getters must be rejected before normalization.");
    const cycle = makeSnapshot(); cycle.relevantToolState = {}; cycle.relevantToolState.self = cycle.relevantToolState;
    expectCode(() => context.fingerprintContext(cycle), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Context cycles must be rejected before normalization.");
    const dangerous = makeSnapshot(); dangerous.relevantToolState = JSON.parse('{"__proto__":{"polluted":true}}');
    expectCode(() => context.fingerprintContext(dangerous), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Dangerous context keys must be rejected.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ activeComp: { type: "CompItem" } })), protocol.ERROR_CODES.UNKNOWN_TARGET, "An active comp must have compId.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ selection: [{ layerIndex: 3, matchName: "ADBE Text Layer", type: "Text" }] })), protocol.ERROR_CODES.UNKNOWN_TARGET, "Selection must have layerId.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ selection: [{ sessionId: "shared", layerIndex: 3 }] })), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "A public sessionId must not replace layerId.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ selection: [{ layerId: "same" }, { layerId: "same" }] })), protocol.ERROR_CODES.UNKNOWN_TARGET, "Duplicate layerId values must be rejected.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ target: Object.assign({}, makeSnapshot().target, { propertyPath: ["named", "ADBE Position"] }) })), protocol.ERROR_CODES.UNKNOWN_TARGET, "Incomplete property path triples must be rejected.");
    expectCode(() => context.fingerprintContext(makeSnapshot({ target: Object.assign({}, makeSnapshot().target, { propertyPath: ["invalid", "ADBE Position", 0] }) })), protocol.ERROR_CODES.UNKNOWN_TARGET, "Property paths must use named or indexed access.");
    check(context.normalizePropertyPath(["named", "ADBE Position", 0]).join("|") === "named|ADBE Position|0", "A one-level named property path must normalize exactly.");
    check(context.normalizePropertyPath(["indexed", "ADBE Slider Control", 1]).join("|") === "indexed|ADBE Slider Control|1", "A one-level indexed property path must normalize exactly.");
    check(context.normalizePropertyPath(["named", "ADBE Effect Parade", 0, "indexed", "ADBE Slider Control", 1, "named", "ADBE Slider Control-0001", 0]).length === 9, "Mixed named/indexed property paths must normalize exactly.");
    expectCode(() => context.normalizePropertyPath([]), protocol.ERROR_CODES.UNKNOWN_TARGET, "An empty property path must be rejected.");
    expectCode(() => context.normalizePropertyPath(["named", "ADBE Position", 0, "indexed"]), protocol.ERROR_CODES.UNKNOWN_TARGET, "A property path length not divisible by three must be rejected.");
    expectCode(() => context.normalizePropertyPath(["named", "ADBE Position", 1]), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Named property segments must use index zero.");
    [-1, 0, 1.5].forEach((index) => expectCode(() => context.normalizePropertyPath(["indexed", "ADBE Position", index]), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Indexed property segments must use a positive integer."));
    expectCode(() => context.normalizePropertyPath(["named", "", 0]), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property match names must be non-empty.");
    expectCode(() => context.normalizePropertyPath(["named", "x".repeat(57), 0]), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Property match names must be bounded in UTF-8 bytes.");
    const maxPath = [];
    for (let i = 0; i < 12; i += 1) { maxPath.push("indexed", "ADBE Group " + i, i + 1); }
    const maxPathTarget = Object.assign({}, makeSnapshot().target, { propertyPath: maxPath, propertyMatchName: "ADBE Group 11" });
    check(context.fingerprintContext(makeSnapshot({ target: maxPathTarget }), { requireStableContext: true }).fingerprint.indexOf("sha256:") === 0, "Twelve property path levels must be accepted.");
    const overlongPath = maxPath.concat(["indexed", "ADBE Group 12", 13]);
    expectCode(() => context.normalizePropertyPath(overlongPath), protocol.ERROR_CODES.UNKNOWN_TARGET, "Thirteen property path levels must be rejected.");
    expectCode(() => context.fingerprintContext(Object.assign(makeSnapshot(), { unexpected: true })), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unknown snapshot fields must be rejected.");
    const frozenCapture = context.captureContext(makeSnapshot(), { requireStableContext: true });
    check(Object.isFrozen(frozenCapture) && Object.isFrozen(frozenCapture.snapshot) && Object.isFrozen(frozenCapture.snapshot.selection), "Captured context results must be deeply frozen.");
    check(contextModule.isTrustedContextApiForProtocol(context, protocol) === true, "Context APIs must retain their trusted protocol binding.");
    console.log("PASS Vela context: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela context - " + error.message);
    process.exitCode = 1;
}
