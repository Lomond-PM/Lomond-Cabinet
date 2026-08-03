#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const nodeRuntime = require("./velaNodeRuntime");
const ROOT = path.resolve(__dirname, "..");
const jsonSource = fs.readFileSync(path.join(ROOT, "host", "vela", "velaJson.jsx"), "utf8");
const contextSource = fs.readFileSync(path.join(ROOT, "host", "vela", "velaContext.jsx"), "utf8");
const executionSource = fs.readFileSync(path.join(ROOT, "host", "vela", "velaExecution.jsx"), "utf8");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }

function makeRealm(options) {
    options = options || {};
    function CompItem() {}
    let value = 57.5;
    let setCalls = 0;
    let readCalls = 0;
    let undoBegins = 0;
    let undoEnds = 0;
    const opacity = {
        propertyType: "property",
        matchName: "ADBE Opacity",
        canSetExpression: true,
        expressionEnabled: false,
        get value() {
            readCalls += 1;
            if (options.failReadBeforeSet && setCalls === 0) { throw new Error("pre-read failed"); }
            if (options.failReadAfterSet && setCalls > 0) { throw new Error("post-read failed"); }
            return value;
        },
        setValue(next) {
            setCalls += 1;
            if (options.failSetValue) { throw new Error("setValue failed"); }
            value = next;
            if (options.failSerializeAfterSet) { realm.AEToolbox.__failSerializeAfterSet = true; }
        }
    };
    const transform = { propertyType: "named", matchName: "ADBE Transform Group", property(name) { return name === "ADBE Opacity" ? opacity : null; } };
    const layer = { id: 17, index: 1, property(name) { return name === "ADBE Transform Group" ? transform : null; } };
    const comp = new CompItem();
    Object.assign(comp, { id: 9, layer(index) { return index === 1 ? layer : null; } });
    const project = { activeItem: comp };
    const realm = { AEToolbox: {}, CompItem, PropertyType: { PROPERTY: "property", NAMED_GROUP: "named" }, app: { project, beginUndoGroup() { undoBegins += 1; }, endUndoGroup() { undoEnds += 1; } }, console };
    vm.createContext(realm);
    vm.runInContext(jsonSource, realm, { filename: "velaJson.jsx" });
    vm.runInContext(contextSource, realm, { filename: "velaContext.jsx" });
    const testExecutionSource = options.failSerializeAfterSet ? executionSource.replace(
        "function serialize(value) { return json.stringifyBounded(value, { maxBytes: 4096, maxStringBytes: 512, maxDepth: 5, maxArrayLength: 16, maxObjectProperties: 16 }); }",
        "function serialize(value) { if (AEToolbox.__failSerializeAfterSet === true) { throw hostError(\"HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE\"); } return json.stringifyBounded(value, { maxBytes: 4096, maxStringBytes: 512, maxDepth: 5, maxArrayLength: 16, maxObjectProperties: 16 }); }"
    ) : executionSource;
    vm.runInContext("(function(AEToolbox,VelaPropertyValueDigest,VelaVerifyExecutionAuthority){\n" + testExecutionSource + "\n}(AEToolbox,AEToolbox.__velaPropertyValueDigestV1,AEToolbox.__velaVerifyExecutionAuthorityV1));", realm, { filename: "velaExecution.jsx" });
    return { realm, comp, layer, opacity, getValue: () => value, getSetCalls: () => setCalls, getReadCalls: () => readCalls, getUndoBegins: () => undoBegins, getUndoEnds: () => undoEnds };
}
function result(facade, request) { return JSON.parse(facade.handle(JSON.stringify(request))); }
function authority(realm) {
    return result(realm.AEToolbox.VelaContext, { protocol: "vela.host-context-request.v1", schemaVersion: "1.0", requestId: "req_" + "a".repeat(32), sessionId: "session_" + "b".repeat(32), operation: "getCapabilities", tier: 0, scope: { purpose: "display", selectionOrderMeaningful: false } }).snapshot;
}
function request(authorityValue, digest, opacity) {
    return { protocol: "vela.host-execution-request.v1", schemaVersion: "1.0", requestId: "req_" + "c".repeat(32), sessionId: "session_" + "d".repeat(32), operation: "executeCapability", capabilityId: "set-opacity-v1", scope: { expectedHostInstanceId: authorityValue.hostInstanceId, expectedHostReloadEpoch: authorityValue.hostReloadEpoch, expectedProjectGeneration: 1, target: { itemId: 9, nativeLayerId: 17, layerIndex: 1, propertyPath: ["named", "ADBE Transform Group", 0, "named", "ADBE Opacity", 0], propertyMatchName: "ADBE Opacity", expectedValueDigest: digest }, params: { opacity } } };
}

function run() {
    const shaRealm = { AEToolbox: {}, console };
    vm.createContext(shaRealm);
    vm.runInContext(jsonSource, shaRealm, { filename: "velaJson.jsx" });
    vm.runInContext(contextSource.replace("function propertyValueDigest(value) {", "AEToolbox.__testSha256Utf8 = sha256Utf8;\n    function propertyValueDigest(value) {"), shaRealm, { filename: "velaContext-sha-test.jsx" });
    const sha = shaRealm.AEToolbox.__testSha256Utf8;
    [["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"], ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"]].forEach(([value, expected]) => check(sha(value) === expected, "Host SHA-256 standard vector is exact."));
    ["ASCII", "\u4e2d\u6587", "\ud83d\ude42"].forEach((value) => check(sha(value) === crypto.createHash("sha256").update(value, "utf8").digest("hex"), "Host SHA-256 UTF-8 vector matches Node for valid text."));
    ["\uD800", "\uDC00"].forEach((value) => assert.throws(() => sha(value), (error) => error && error.code === "HOST_CONTEXT_VALUE_INVALID", "Host SHA-256 rejects an isolated surrogate with HOST_CONTEXT_VALUE_INVALID."));
    assertions += 2;
    const clientProtocol = protocolModule.createProtocol(nodeRuntime);
    const clientContext = contextModule.createContextApi(clientProtocol);
    const digestRealm = makeRealm();
    const digestVectors = [["null", null], ["boolean", true], ["boolean", false], ["number", 0], ["number", 100], ["number", 57.5], ["number", 0.1], ["string", "\u4e2d\u6587"], ["string", "\ud83d\ude42"], ["number-array", vm.runInContext("[0,1,57.5]", digestRealm.realm)]];
    digestVectors.forEach(([kind, value]) => {
        const clientValue = kind === "number-array" ? [0, 1, 57.5] : value;
        check(digestRealm.realm.AEToolbox.__velaPropertyValueDigestV1(value) === clientContext.digestPropertyValue(kind, clientValue), "Host and client property-value digests match for " + kind + ".");
    });
    [-0, Infinity, NaN].forEach((value) => assert.throws(() => digestRealm.realm.AEToolbox.__velaPropertyValueDigestV1(value), (error) => error && error.code === "HOST_CONTEXT_VALUE_INVALID", "Host rejects non-canonical property number."));
    assertions += 3;
    const fixture = makeRealm();
    const { realm } = fixture;
    check(realm.AEToolbox.VelaExecution.hostExecutionRevision === "vela-execution-host-v1", "Execution facade publishes the bounded v1 revision.");
    check(realm.AEToolbox.__velaPropertyValueDigestV1(0) === "sha256:5cc2dce0f8175fdddc21847211d6ca1114efb2da3bb3d6ee61add6291d874491", "Host property digest accepts zero deterministically.");
    check(realm.AEToolbox.__velaPropertyValueDigestV1(57.5).indexOf("sha256:") === 0, "Host property digest uses the canonical digest format.");
    check(realm.AEToolbox.__velaVerifyExecutionAuthorityV1({ expectedHostInstanceId: "wrong", expectedHostReloadEpoch: 1, expectedProjectGeneration: 1 }).code === "HOST_EXECUTION_AUTHORITY_MISMATCH", "Private verifier returns only a bounded mismatch code.");
    const current = authority(realm);
    const digest = realm.AEToolbox.__velaPropertyValueDigestV1(57.5);
    const success = result(realm.AEToolbox.VelaExecution, request(current, digest, 100));
    check(success.ok === true && success.result.resultingValueDigest === realm.AEToolbox.__velaPropertyValueDigestV1(100), "Host executes the exact opacity capability and returns only the resulting digest.");
    check(fixture.getValue() === 100 && fixture.getSetCalls() === 1 && fixture.getUndoBegins() === 1 && fixture.getUndoEnds() === 1, "Successful execution performs exactly one setValue inside one closed Undo group.");
    const mismatch = result(realm.AEToolbox.VelaExecution, request(current, "sha256:" + "0".repeat(64), 50));
    check(mismatch.ok === false && mismatch.error.code === "HOST_EXECUTION_VALUE_MISMATCH" && fixture.getSetCalls() === 1, "Expected-value digest mismatch fails before another mutation.");
    const drift = makeRealm();
    const driftAuthority = authority(drift.realm);
    check(drift.realm.AEToolbox.__velaVerifyExecutionAuthorityV1({ expectedHostInstanceId: driftAuthority.hostInstanceId, expectedHostReloadEpoch: driftAuthority.hostReloadEpoch, expectedProjectGeneration: 1 }).ok === true, "Authority verification initializes current project observation without exposing it.");
    drift.realm.app.project = { activeItem: drift.comp };
    const driftResult = result(drift.realm.AEToolbox.VelaExecution, request(driftAuthority, drift.realm.AEToolbox.__velaPropertyValueDigestV1(57.5), 90));
    check(driftResult.ok === false && driftResult.error.code === "HOST_EXECUTION_AUTHORITY_MISMATCH", "Project generation drift is rejected by the current authority verifier.");
    check(drift.getUndoBegins() === 0 && drift.getSetCalls() === 0, "Authority drift occurs before Undo or mutation.");
    const expressionFixture = makeRealm();
    const expressionAuthority = authority(expressionFixture.realm);
    expressionFixture.opacity.expressionEnabled = true;
    const expression = result(expressionFixture.realm.AEToolbox.VelaExecution, request(expressionAuthority, expressionFixture.realm.AEToolbox.__velaPropertyValueDigestV1(57.5), 80));
    check(expression.ok === false && expression.error.code === "HOST_EXECUTION_EXPRESSION_ENABLED" && expressionFixture.getSetCalls() === 0, "Expression-enabled opacity fails closed before mutation.");
    const preRead = makeRealm({ failReadBeforeSet: true });
    const preReadAuthority = authority(preRead.realm);
    const preReadResult = result(preRead.realm.AEToolbox.VelaExecution, request(preReadAuthority, preRead.realm.AEToolbox.__velaPropertyValueDigestV1(57.5), 70));
    check(preReadResult.ok === false && preReadResult.error.code === "HOST_EXECUTION_READ_FAILED" && preRead.getSetCalls() === 0 && preRead.getUndoBegins() === 0 && preRead.getUndoEnds() === 0, "Pre-mutation digest read failure remains retryable and occurs before Undo or setValue.");
    const setThrow = makeRealm({ failSetValue: true });
    const setThrowAuthority = authority(setThrow.realm);
    const setThrowResult = result(setThrow.realm.AEToolbox.VelaExecution, request(setThrowAuthority, setThrow.realm.AEToolbox.__velaPropertyValueDigestV1(57.5), 70));
    check(setThrowResult.ok === false && setThrowResult.error.code === "HOST_EXECUTION_MUTATION_FAILED" && setThrow.getSetCalls() === 1 && setThrow.getUndoBegins() === 1 && setThrow.getUndoEnds() === 1, "setValue failure is a non-retryable mutation failure with a closed Undo group.");
    const postRead = makeRealm({ failReadAfterSet: true });
    const postReadAuthority = authority(postRead.realm);
    const postReadResult = result(postRead.realm.AEToolbox.VelaExecution, request(postReadAuthority, postRead.realm.AEToolbox.__velaPropertyValueDigestV1(57.5), 70));
    check(postReadResult.ok === false && postReadResult.error.code === "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE" && !postReadResult.result && postRead.getSetCalls() === 1 && postRead.getUndoBegins() === 1 && postRead.getUndoEnds() === 1, "Post-write digest read failure is committed-result unavailable and returns no success result.");
    const postSerialize = makeRealm({ failSerializeAfterSet: true });
    const postSerializeAuthority = authority(postSerialize.realm);
    const postSerializeResult = result(postSerialize.realm.AEToolbox.VelaExecution, request(postSerializeAuthority, postSerialize.realm.AEToolbox.__velaPropertyValueDigestV1(57.5), 70));
    check(postSerializeResult.ok === false && postSerializeResult.error.code === "HOST_EXECUTION_COMMITTED_RESULT_UNAVAILABLE" && !postSerializeResult.result && postSerialize.getSetCalls() === 1 && postSerialize.getUndoBegins() === 1 && postSerialize.getUndoEnds() === 1, "Post-write envelope serialization failure preserves committed-result unavailable semantics.");
    console.log("test-vela-execution-host: " + assertions + " assertions passed.");
}
try { run(); } catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
