#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const contracts = require("../client/js/vela/velaCapabilityContracts");
const protocolModule = require("../client/js/vela/velaProtocol");
const adapterModule = require("../client/js/vela/velaProviderAdapter");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function rejects(callback, message) { assert.throws(callback, /CAPABILITY_CONTRACT_INVALID/, message); assertions += 1; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) { if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]"; if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}"; return JSON.stringify(value); }
function hash(value) { return crypto.createHash("sha256").update(value, "utf8").digest("hex"); }
function contract(id, parameters, paths) {
    return { capabilityId: id, revision: "vela-capability-contract-v1", parameters, modelPolicy: { responseType: "localProposal", branchPolicy: "direct-single-target-edit-only", modelMaySupply: paths || ["params." + parameters.required[0]], groundingField: "selection.selectedLayerOpacity", unavailableBehavior: "respond-with-text-without-guessing" }, localPolicy: { parameterValidatorId: "test-validator-v1", intentValidatorId: "test-intent-v1", routerId: id } };
}
function identifierContract(identifier) {
    return contract("set-identifier-test-v1", { type: "object", additionalProperties: false, required: [identifier], properties: { [identifier]: { type: "number", minimum: 0, maximum: 1 } } });
}
function protocol() { return protocolModule.createProtocol({ utf8ByteLength: (text) => Buffer.byteLength(text, "utf8"), sha256Hex: (text) => hash(text), randomId: (kind) => kind + "_" + "0".repeat(32), now: () => 1 }); }
async function captureBaseline() {
    const calls = [];
    const localProtocol = protocol();
    const provider = adapterModule.createLocalOpenAICompatibleProvider({ protocol: localProtocol, transport: { sendJson(request) { calls.push(request); return new Promise(() => {}); } }, model: "baseline-model", runtime: { setTimeout() { return 1; }, clearTimeout() {}, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(url) { return { protocol: "http:", hostname: "127.0.0.1", port: "1234", pathname: "/v1/chat/completions", username: "", password: "", search: "", hash: "", href: url }; }, nowMs() { return 1; } } });
    const started = provider.start({ messages: [{ role: "user", content: "hello" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } });
    await Promise.resolve(); await Promise.resolve();
    check(calls.length === 1, "The baseline capture creates one local outbound request.");
    provider.cancel(started.requestId); await started.promise;
    return { systemPromptSha256: hash(calls[0].body.messages[0].content), responseFormatStableSha256: hash(stable(calls[0].body.response_format)), bodyStableSha256: hash(stable({ model: calls[0].body.model, messages: calls[0].body.messages.map((message) => ({ role: message.role, content: message.role === "system" ? "<stable-system-prompt>" : message.content })), stream: calls[0].body.stream, response_format: calls[0].body.response_format })) };
}
async function run() {
    const opacity = contracts.getContract("set-opacity-v1");
    check(Object.isFrozen(opacity) && opacity.capabilityId === "set-opacity-v1", "Production Registry exposes one frozen opacity contract.");
    check(JSON.stringify(contracts.listCapabilityIds()) === JSON.stringify(["set-opacity-v1"]), "Production Registry contains only set-opacity-v1.");
    check(contracts.getContract("SET-OPACITY-V1") === null && contracts.getContract("missing") === null, "Capability lookup is exact and fail-closed.");
    const model = contracts.getModelProjection("set-opacity-v1"); const local = contracts.getLocalProjection("set-opacity-v1");
    check(Object.isFrozen(model) && Object.isFrozen(local) && !Object.prototype.hasOwnProperty.call(model, "localPolicy") && !Object.prototype.hasOwnProperty.call(local, "modelPolicy"), "Model and local projections are separated and frozen.");
    check(model.parameters.properties.opacity.minimum === 0 && model.parameters.properties.opacity.maximum === 100 && local.localPolicy.intentValidatorId === "set-opacity-direct-edit-v1", "Production projections retain the existing opacity boundary and local validator identity.");
    assert.throws(() => { model.parameters.properties.opacity.minimum = 99; }, TypeError, "Frozen projections reject mutation in strict mode."); assertions += 1;
    check(contracts.getModelProjection("set-opacity-v1").parameters.properties.opacity.minimum === 0, "Projection mutation cannot contaminate the Registry.");

    const rotation = contract("set-rotation-test-v1", { type: "object", additionalProperties: false, required: ["angle"], properties: { angle: { type: "number", minimum: -36000, maximum: 36000, unit: "degrees" } } });
    const color = contract("set-color-test-v1", { type: "object", additionalProperties: false, required: ["color"], properties: { color: { type: "object", additionalProperties: false, required: ["r", "g", "b", "a"], properties: { r: { type: "number", minimum: 0, maximum: 1 }, g: { type: "number", minimum: 0, maximum: 1 }, b: { type: "number", minimum: 0, maximum: 1 }, a: { type: "number", minimum: 0, maximum: 1 } } } } });
    const testRegistry = contracts.createRegistry([color, rotation]);
    check(JSON.stringify(testRegistry.listCapabilityIds()) === JSON.stringify(["set-color-test-v1", "set-rotation-test-v1"]), "Synthetic scalar and nested-object contracts have deterministic ordering.");
    check(testRegistry.getModelProjection("set-color-test-v1").parameters.properties.color.properties.a.maximum === 1, "Nested parameter schemas survive model projection.");
    check(contracts.createRegistry([], { allowEmpty: true }).listCapabilityIds().length === 0, "Only the test factory can construct an empty Registry.");
    check(JSON.stringify(adapterModule.buildCapabilityParametersForResponse(testRegistry.getModelProjection("set-color-test-v1"))) === JSON.stringify({ type: "object", additionalProperties: false, required: ["color"], properties: { color: { type: "object", additionalProperties: false, required: ["a", "b", "g", "r"], properties: { a: { type: "number", minimum: 0, maximum: 1 }, b: { type: "number", minimum: 0, maximum: 1 }, g: { type: "number", minimum: 0, maximum: 1 }, r: { type: "number", minimum: 0, maximum: 1 } } } } }), "Adapter response parameter schema is derived from a synthetic Contract projection, including nested keys.");
    check(JSON.stringify(contracts.validateCapabilityParams(testRegistry.getLocalProjection("set-rotation-test-v1"), { angle: 180 })) === JSON.stringify({ angle: 180 }), "Contract parameter validator accepts an exact bounded scalar parameter.");
    [
        { angle: "180" }, { angle: NaN }, { angle: 36001 }, { angle: 1, extra: true }, {}, []
    ].forEach((params) => rejects(() => contracts.validateCapabilityParams(testRegistry.getLocalProjection("set-rotation-test-v1"), params), "Contract parameter validator rejects malformed, extra, missing, and out-of-range values."));
    rejects(() => contracts.createRegistry([rotation, rotation]), "Duplicate capability IDs are rejected.");
    const invalidCases = [
        (value) => { value.extra = true; }, (value) => { value.parameters.properties.angle.extra = true; }, (value) => { value.parameters.required = ["missing"]; },
        (value) => { value.parameters.properties.angle.minimum = 2; value.parameters.properties.angle.maximum = 1; }, (value) => { value.parameters.properties.angle.minimum = Infinity; },
        (value) => { value.parameters.properties.angle.unit = "Degrees!"; }, (value) => { value.target = "forbidden"; }, (value) => { value.parameters.properties.angle.callback = "forbidden"; },
        (value) => { value.localPolicy.extra = true; }, (value) => { value.modelPolicy.modelMaySupply = [undefined]; }
    ];
    invalidCases.forEach((mutate) => { const value = clone(rotation); mutate(value); rejects(() => contracts.createRegistry([value]), "Invalid contract values fail closed."); });
    [
        (value) => { value.parameters.properties.angle.required = ["x"]; },
        (value) => { value.parameters.properties.angle.properties = {}; },
        (value) => { value.parameters.properties.angle.additionalProperties = false; },
        (value) => { value.parameters.properties.angle.required = ["angle"]; },
        (value) => { value.parameters.properties.angle.enum = [1, "2"]; },
        (value) => { value.parameters.properties.angle.enum = [1, 1]; },
        (value) => { value.parameters.properties.angle.enum = []; },
        (value) => { value.parameters.properties.angle.oneOf = []; },
        (value) => { value.parameters.properties.angle.$ref = "x"; },
        (value) => { value.parameters.properties.angle.default = 2; },
        (value) => { value.parameters.minimum = 0; },
        (value) => { value.parameters.properties.angle.type = "string"; value.parameters.properties.angle.minimum = 0; },
        (value) => { value.parameters.properties.angle.type = "boolean"; value.parameters.properties.angle.properties = {}; },
        (value) => { value.parameters.maximum = 1; },
        (value) => { value.modelPolicy.modelMaySupply = ["target"]; },
        (value) => { value.modelPolicy.modelMaySupply = ["params.target"]; },
        (value) => { value.modelPolicy.modelMaySupply = ["params.angle.extra"]; },
        (value) => { value.modelPolicy.modelMaySupply = ["params..angle"]; },
        (value) => { value.modelPolicy.modelMaySupply = ["params.constructor"]; },
        (value) => { value.modelPolicy.modelMaySupply = ["params.angle", "params.angle"]; },
        (value) => { value.modelPolicy.modelMaySupply = [{}]; }
    ].forEach((mutate) => { const value = clone(rotation); mutate(value); rejects(() => contracts.createRegistry([value]), "Schema-key and model-supply isolation rejects invalid Contract shapes."); });
    const reordered = clone(rotation);
    reordered.parameters = { properties: { angle: reordered.parameters.properties.angle }, required: ["angle"], additionalProperties: false, type: "object" };
    const canonicalOne = contracts.createRegistry([rotation]).getModelProjection("set-rotation-test-v1");
    const canonicalTwo = contracts.createRegistry([reordered]).getModelProjection("set-rotation-test-v1");
    check(JSON.stringify(canonicalOne) === JSON.stringify(canonicalTwo) && hash(JSON.stringify(canonicalOne)) === hash(JSON.stringify(canonicalTwo)), "Equivalent insertion orders produce identical canonical projections and hashes.");
    const reorderedColor = clone(color);
    reorderedColor.parameters.required = ["color"];
    reorderedColor.parameters.properties.color.required = ["b", "r", "a", "g"];
    reorderedColor.parameters.properties.color.properties = { b: reorderedColor.parameters.properties.color.properties.b, a: reorderedColor.parameters.properties.color.properties.a, r: reorderedColor.parameters.properties.color.properties.r, g: reorderedColor.parameters.properties.color.properties.g };
    const orderedColorProjection = contracts.createRegistry([rotation, color]).getModelProjection("set-color-test-v1");
    const reorderedColorProjection = contracts.createRegistry([reorderedColor, rotation]).getModelProjection("set-color-test-v1");
    check(JSON.stringify(orderedColorProjection) === JSON.stringify(reorderedColorProjection) && JSON.stringify(contracts.createRegistry([rotation, color]).listCapabilityIds()) === JSON.stringify(contracts.createRegistry([color, rotation]).listCapabilityIds()), "Property, required, and capability input ordering cannot change canonical projection or registry listing.");
    const unorderedEnum = contract("enum-test-v1", { type: "object", additionalProperties: false, required: ["mode"], properties: { mode: { type: "string", enum: ["z", "a", "m"] } } });
    check(JSON.stringify(contracts.createRegistry([unorderedEnum]).getContract("enum-test-v1").parameters.properties.mode.enum) === JSON.stringify(["a", "m", "z"]), "Enum values are canonicalized deterministically by schema type.");
    const booleanEnum = contract("boolean-test-v1", { type: "object", additionalProperties: false, required: ["enabled"], properties: { enabled: { type: "boolean", enum: [true, false] } } });
    check(JSON.stringify(contracts.createRegistry([booleanEnum]).getContract("boolean-test-v1").parameters.properties.enabled.enum) === JSON.stringify([false, true]), "Boolean enum canonicalization is false then true.");
    const colorPaths = clone(color); colorPaths.modelPolicy.modelMaySupply = ["params.color.r", "params.color"];
    check(JSON.stringify(contracts.createRegistry([colorPaths]).getModelProjection("set-color-test-v1").modelPolicy.modelMaySupply) === JSON.stringify(["params.color", "params.color.r"]), "Structured and nested model supply paths are validated against declared parameters and sorted.");
    ["selectedTarget", "candidateValue", "planValue", "hostPayloadValue", "requestIdValue", "bindingValue", "authorityValue", "propertyPathValue", "callbackHandler", "executionPlan", "selected_target", "selected-target", "selectedtarget", "candidatevalue", "hostpayloadvalue", "requestidvalue"].forEach((identifier) => {
        rejects(() => contracts.createRegistry([identifierContract(identifier)]), "Forbidden identifier concepts fail closed in schema properties: " + identifier + ".");
    });
    ["params.selectedTarget", "params.candidateValue", "params.planValue", "params.hostPayloadValue", "params.requestIdValue", "params.bindingValue", "params.authorityValue", "params.selected_target", "params.candidate-value", "params.hostpayloadvalue", "params.requestidvalue"].forEach((supplyPath) => {
        const value = clone(rotation); value.modelPolicy.modelMaySupply = [supplyPath];
        rejects(() => contracts.createRegistry([value]), "Forbidden model supply paths fail closed: " + supplyPath + ".");
    });
    ["opacity", "color", "angle", "amount", "selectedOpacity", "currentColor", "colorValue", "ghostAmount", "planningEase", "authoritativeMode"].forEach((identifier) => {
        check(contracts.createRegistry([identifierContract(identifier)]).getModelProjection("set-identifier-test-v1").modelPolicy.modelMaySupply[0] === "params." + identifier, "Safe identifier remains usable in schema and model projection: " + identifier + ".");
    });
    const nestedDangerous = clone(color);
    nestedDangerous.parameters.properties.color.properties.selectedTarget = { type: "number", minimum: 0, maximum: 1 };
    rejects(() => contracts.createRegistry([nestedDangerous]), "Nested schema properties reject forbidden identifier concepts before projection.");
    const cyclic = clone(rotation); cyclic.parameters.properties.angle.self = cyclic; rejects(() => contracts.createRegistry([cyclic]), "Cyclic contract graphs are rejected.");
    rejects(() => contracts.createRegistry([Object.assign({}, rotation, { parameters: new Date() })]), "Non-plain contract objects are rejected.");

    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "vela-capability-contracts", "provider-contract-baseline.json"), "utf8"));
    const baseline = await captureBaseline();
    check(JSON.stringify(baseline) === JSON.stringify(fixture), "Provider prompt, response_format, message order, and stable request body remain byte-for-byte equivalent to the C1 baseline.");
    console.log("test-vela-capability-contracts: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error("FAIL Vela capability contracts - " + error.message); process.exitCode = 1; });
