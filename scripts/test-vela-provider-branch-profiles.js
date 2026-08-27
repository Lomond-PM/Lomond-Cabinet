#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const protocolModule = require("../client/js/vela/velaProtocol");
const contracts = require("../client/js/vela/velaCapabilityContracts");
const promptBuilder = require("../client/js/vela/velaCapabilityPromptBuilder");
const requestBranchPolicy = require("../client/js/vela/velaProviderRequestBranchPolicy");
const providerAdapter = require("../client/js/vela/velaProviderAdapter");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_PATH = path.join(ROOT, "scripts", "fixtures", "vela-capability-contracts", "provider-branch-profiles-v2.json");
const UNION_FIXTURE_PATH = path.join(ROOT, "scripts", "fixtures", "vela-capability-contracts", "provider-bounded-union-transition-v2.json");
const C3_FIXTURE_PATH = path.join(ROOT, "scripts", "fixtures", "vela-capability-contracts", "provider-branch-policy-v2.json");
const C3_FIXTURE_SHA256 = "8a2968b4e8926ea95a742c4c5e6cc4bdae941c06277d37ddb137b3df6513b8d2";
const EXPECTED_KEYS = [
    "fixtureType", "schemaRevision", "promptBuilderRevision", "requestBranchPolicyRevision",
    "capabilityId", "capabilityRevision", "protocolVersion", "messageRoleOrder",
    "fixedModelIdentifier", "fixedRequestId", "fixedAssistantContext", "fixedTextUserMessage",
    "fixedExtractionUserMessage", "textOnly", "explicitEditEligible", "changeReason", "generatedBy"
];
const PROFILE_KEYS = ["promptSha256", "responseFormatSha256", "stableRequestBodySha256"];
let assertions = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
function equal(actual, expected, message) { assert.strictEqual(actual, expected, message); assertions += 1; }
function sha256(value) { return crypto.createHash("sha256").update(value, "utf8").digest("hex"); }
function stable(value) {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
    return JSON.stringify(value);
}
function parsedUrl(value) {
    const url = new URL(value);
    return { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, username: url.username, password: url.password, search: url.search, hash: url.hash, href: url.href };
}
function containsUnion(value) {
    if (!value || typeof value !== "object") return false;
    return Object.keys(value).some((key) => key === "oneOf" || key === "anyOf" || key === "allOf" || containsUnion(value[key]));
}
function assertClosedObjects(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "object") equal(value.additionalProperties, false, "Every object Schema node must set additionalProperties:false.");
    Object.keys(value).forEach((key) => assertClosedObjects(value[key]));
}
function stableBody(body) {
    return stable({
        model: body.model,
        messages: body.messages.map((message) => ({ role: message.role, content: message.content })),
        stream: body.stream,
        response_format: body.response_format
    });
}
function byteDiagnostics(label, captured) {
    const body = captured.body;
    const modelBytes = JSON.stringify(body.model);
    const system = body.messages[0].content;
    const assistant = body.messages[1].content;
    const user = body.messages[2].content;
    const jsonBody = JSON.stringify(body);
    console.log(JSON.stringify({
        profile: label,
        modelJson: modelBytes,
        modelJsonUtf8Bytes: Buffer.byteLength(modelBytes, "utf8"),
        messageCount: body.messages.length,
        messageRoleOrder: body.messages.map((message) => message.role),
        systemUtf8Bytes: Buffer.byteLength(system, "utf8"),
        systemSha256: sha256(system),
        assistantJson: JSON.stringify(assistant),
        assistantUtf8Bytes: Buffer.byteLength(assistant, "utf8"),
        assistantSha256: sha256(assistant),
        userJson: JSON.stringify(user),
        userUtf8Bytes: Buffer.byteLength(user, "utf8"),
        userSha256: sha256(user),
        stream: body.stream,
        responseFormatSha256: sha256(captured.responseFormatBytes),
        jsonStringifyBodyUtf8Bytes: Buffer.byteLength(jsonBody, "utf8"),
        jsonStringifyBodySha256: sha256(jsonBody),
        stableBodySha256: sha256(captured.stableBodyBytes)
    }));
}
async function capture(profile, fixture) {
    const calls = [];
    const protocol = protocolModule.createProtocol({
        utf8ByteLength(value) { return Buffer.byteLength(value, "utf8"); },
        sha256Hex: sha256,
        randomId(kind) { return String(kind) + "_" + "0".repeat(32); },
        now() { return 1; }
    });
    const provider = providerAdapter.createLocalOpenAICompatibleProvider({
        protocol,
        transport: { sendJson(request) { calls.push(request); return new Promise(() => {}); } },
        model: fixture.fixedModelIdentifier,
        requestProfile: profile,
        runtime: {
            setTimeout() { return 1; },
            clearTimeout() {},
            createAbortController() { return { signal: {}, abort() {} }; },
            parseUrl: parsedUrl,
            nowMs() { return 1; }
        }
    });
    const userMessage = profile === requestBranchPolicy.PROFILES.TEXT_ONLY ? fixture.fixedTextUserMessage : fixture.fixedExtractionUserMessage;
    const started = provider.start({
        messages: [{ role: "assistant", content: fixture.fixedAssistantContext }, { role: "user", content: userMessage }],
        context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 }
    });
    await Promise.resolve();
    await Promise.resolve();
    equal(calls.length, 1, "Production Provider must emit exactly one mock-transport request.");
    provider.cancel(started.requestId);
    await started.promise;
    const body = calls[0].body;
    return Object.freeze({
        body,
        prompt: body.messages[0].content,
        responseFormatBytes: stable(body.response_format),
        stableBodyBytes: stableBody(body)
    });
}

async function run() {
    const fixtureText = fs.readFileSync(FIXTURE_PATH, "utf8");
    const fixture = JSON.parse(fixtureText);
    const unionFixture = JSON.parse(fs.readFileSync(UNION_FIXTURE_PATH, "utf8"));
    const projection = contracts.getModelProjection("set-opacity-v1");
    equal(Object.keys(fixture).sort().join("|"), EXPECTED_KEYS.slice().sort().join("|"), "Fixture must contain exactly the bounded Profile contract fields.");
    equal(Object.keys(fixture.textOnly).sort().join("|"), PROFILE_KEYS.slice().sort().join("|"), "textOnly contains exactly three SHA fields.");
    equal(Object.keys(fixture.explicitEditEligible).sort().join("|"), PROFILE_KEYS.slice().sort().join("|"), "explicitEditEligible contains exactly three SHA fields.");
    check(!/(?:qualification|caseProfileFingerprint|runsPerCase|operator|endpoint|timestamp|localPath|modelResponse)/i.test(fixtureText), "Fixture excludes qualification, operator, endpoint, timestamp, path, and model-response metadata.");
    equal(fixture.fixtureType, "vela-provider-branch-profiles", "Fixture type is fixed.");
    equal(fixture.schemaRevision, "v2", "Current fixture schema revision is fixed.");
    equal(fixture.promptBuilderRevision, "vela-capability-prompt-builder-v4", "Current fixture binds Prompt Builder v4 identity.");
    equal(fixture.requestBranchPolicyRevision, "vela-provider-request-branch-policy-v1", "Historical fixture retains Request Branch Policy v1 identity.");
    equal(fixture.capabilityId, projection.capabilityId, "Fixture capability id matches production.");
    equal(fixture.capabilityRevision, projection.revision, "Fixture capability revision matches production.");
    equal(fixture.protocolVersion, "vela.model-response.v1", "Fixture Protocol version remains 1.1 response protocol.");
    equal(fixture.fixedRequestId, "req_" + "0".repeat(32), "Fixture uses the fixed production request id.");
    equal(sha256(fs.readFileSync(C3_FIXTURE_PATH, "utf8")), C3_FIXTURE_SHA256, "C3 fixture bytes remain unchanged.");

    const textA = await capture(requestBranchPolicy.PROFILES.TEXT_ONLY, fixture);
    const textB = await capture(requestBranchPolicy.PROFILES.TEXT_ONLY, fixture);
    const extractionA = await capture(requestBranchPolicy.PROFILES.EXPLICIT_EDIT_ELIGIBLE, fixture);
    const extractionB = await capture(requestBranchPolicy.PROFILES.EXPLICIT_EDIT_ELIGIBLE, fixture);
    const unionA = await capture(requestBranchPolicy.PROFILES.PROPOSAL_CAPABLE_UNION, fixture);
    const unionB = await capture(requestBranchPolicy.PROFILES.PROPOSAL_CAPABLE_UNION, fixture);
    if (process.argv.indexOf("--diagnose") !== -1) {
        byteDiagnostics("text-only", textA);
        byteDiagnostics("explicit-edit-eligible", extractionA);
        byteDiagnostics("proposal-capable-union", unionA);
    }
    [
        [textA, textB, "text-only"],
        [extractionA, extractionB, "explicit-edit-eligible"]
    ].forEach(([first, second, label]) => {
        equal(first.prompt, second.prompt, label + " Prompt bytes are deterministic across two independent production captures.");
        equal(first.responseFormatBytes, second.responseFormatBytes, label + " response_format bytes are deterministic across two independent production captures.");
        equal(first.stableBodyBytes, second.stableBodyBytes, label + " stable body bytes are deterministic across two independent production captures.");
    });
    [
        [textA, fixture.textOnly, "text-only"],
        [extractionA, fixture.explicitEditEligible, "explicit-edit-eligible"]
    ].forEach(([captureResult, expected, label]) => {
        equal(sha256(captureResult.prompt), expected.promptSha256, label + " Prompt SHA matches fixture.");
        equal(sha256(captureResult.responseFormatBytes), expected.responseFormatSha256, label + " response_format SHA matches fixture.");
        equal(sha256(captureResult.stableBodyBytes), expected.stableRequestBodySha256, label + " stable body SHA matches fixture.");
        equal(captureResult.body.model, fixture.fixedModelIdentifier, label + " root model metadata is fixed.");
        equal(captureResult.body.messages.map((message) => message.role).join("→"), fixture.messageRoleOrder.join("→"), label + " message order is system → assistant → user.");
        check(!containsUnion(captureResult.body.response_format), label + " Schema contains no oneOf, anyOf, allOf, or union fallback.");
        assertClosedObjects(captureResult.body.response_format);
    });
    check(textA.prompt !== extractionA.prompt && fixture.textOnly.promptSha256 !== fixture.explicitEditEligible.promptSha256, "Profile Prompt SHA values differ.");
    check(textA.responseFormatBytes !== extractionA.responseFormatBytes && fixture.textOnly.responseFormatSha256 !== fixture.explicitEditEligible.responseFormatSha256, "Profile response_format SHA values differ.");
    check(textA.stableBodyBytes !== extractionA.stableBodyBytes && fixture.textOnly.stableRequestBodySha256 !== fixture.explicitEditEligible.stableRequestBodySha256, "Profile stable body SHA values differ.");
    equal(unionFixture.fixtureType, "vela-provider-experimental-transition", "Union fixture is isolated from historical qualification evidence.");
    equal(unionFixture.profile, "proposal-capable-union", "Union fixture freezes the third Profile identity.");
    equal(unionFixture.qualificationStatus, "experimental-transition", "Union is not marked as a qualified default.");
    equal(unionFixture.promptBuilderRevision, promptBuilder.MODULE_REVISION, "Union fixture records the current Prompt Builder revision.");
    equal(unionFixture.requestBranchPolicyRevision, requestBranchPolicy.MODULE_REVISION, "Union fixture records the current Request Branch Policy revision.");
    equal(unionA.prompt, unionB.prompt, "Union Prompt bytes are deterministic.");
    equal(unionA.responseFormatBytes, unionB.responseFormatBytes, "Union response_format bytes are deterministic.");
    equal(unionA.stableBodyBytes, unionB.stableBodyBytes, "Union stable body bytes are deterministic.");
    equal(sha256(unionA.prompt), unionFixture.promptSha256, "Union Prompt SHA matches its transition fixture.");
    equal(sha256(unionA.responseFormatBytes), unionFixture.responseFormatSha256, "Union response_format SHA matches its transition fixture.");
    equal(sha256(unionA.stableBodyBytes), unionFixture.stableRequestBodySha256, "Union stable body SHA matches its transition fixture.");
    check(containsUnion(unionA.body.response_format) && unionA.body.response_format.json_schema.name === "vela_bounded_union_response", "Union schema alone contains the frozen oneOf transition contract.");
    assertClosedObjects(unionA.body.response_format);

    const textSchema = textA.body.response_format.json_schema.schema;
    const extractionSchema = extractionA.body.response_format.json_schema.schema;
    equal(textSchema.properties.envelope.properties.type.enum.join("|"), "text", "text-only Schema permits only the text envelope.");
    equal(extractionSchema.properties.envelope.properties.type.enum.join("|"), "localProposal", "explicit-edit-eligible Schema permits only the localProposal envelope.");
    ["protocol", "schemaVersion", "requestId", "provider", "model"].forEach((key) => {
        equal(textSchema.properties[key].enum[0], extractionSchema.properties[key].enum[0], "Root metadata " + key + " is identical across Profiles.");
    });

    console.log("test-vela-provider-branch-profiles: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
