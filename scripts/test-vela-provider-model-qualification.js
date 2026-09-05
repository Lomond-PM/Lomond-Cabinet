#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const Module = require("module");
const os = require("os");
const path = require("path");
const vm = require("vm");
const qualification = require("./diagnostics/velaProviderModelQualification");
const cli = require("./diagnostics/run-vela-provider-model-qualification");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function fixtureRun() {
    const fixturePath = path.resolve(__dirname, "fixtures", "vela-provider-model-qualification", "qwen3.5-9b-q4_k_m-nonthinking-derived.json");
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const records = fixture.records.map((item) => ({ caseId: item[0], fixtureId: item[1], outputKind: item[2], proposalOpacity: item[3], intentGate: item[4], durationMs: item[5], text: item[6], protocolValid: true, reasoningContentNonEmpty: false, reasoningTokens: 0 }));
    return { fixturePath, fixture, run: { records, executionStatus: "COMPLETED", assessmentStatus: "PENDING_REVIEW" } };
}
function c3bFixtureRun(name) {
    const fixturePath = path.resolve(__dirname, "fixtures", "vela-provider-model-qualification", name + "-derived.json"); const evidencePath = path.resolve(__dirname, "..", ".tmp", "vela-model-qualification", name + ".json");
    const evidenceBytes = fs.readFileSync(evidencePath); return { fixturePath, fixture: JSON.parse(fs.readFileSync(fixturePath, "utf8")), evidence: JSON.parse(evidenceBytes), sourceEvidenceSha256: crypto.createHash("sha256").update(evidenceBytes).digest("hex") };
}
function tempPolicy() { const root = fs.mkdtempSync(path.join(os.tmpdir(), "vela-provider-model-qualification-")); fs.mkdirSync(path.join(root, ".tmp")); return { root, options: { repositoryRoot: root } }; }
function stable(value) { if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]"; if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}"; return JSON.stringify(value); }
function profileFingerprint(cases) { return crypto.createHash("sha256").update(stable(cases.map((item, index) => [index, item.id, item.fixtureId, item.message, item.requestProfile, item.expectedOutcome, item.expectedOpacity])), "utf8").digest("hex"); }
function deeplyFrozen(value) { return Object.isFrozen(value) && (!value || typeof value !== "object" || Object.keys(value).every((key) => deeplyFrozen(value[key]))); }
function deepFreezeCopy(value) { const copy = JSON.parse(JSON.stringify(value)); (function freeze(item) { if (item && typeof item === "object") { Object.keys(item).forEach((key) => freeze(item[key])); Object.freeze(item); } })(copy); return copy; }
function stream(bytes, chunkSize) { let offset = 0; return { getReader() { return { read() { if (offset >= bytes.length) return Promise.resolve({ done: true }); const value = bytes.slice(offset, Math.min(bytes.length, offset + (chunkSize || bytes.length))); offset += value.length; return Promise.resolve({ done: false, value }); }, cancel() { offset = bytes.length; return Promise.resolve(); } }; } }; }
function response(bodyText, options) {
    const settings = options || {}; const bytes = new TextEncoder().encode(bodyText); const makeBody = () => stream(bytes, settings.chunkSize);
    return { status: settings.status || 200, redirected: false, url: qualification.ENDPOINT, headers: { get(name) { return String(name).toLowerCase() === "content-type" ? "application/json" : null; } }, body: makeBody(), clone: settings.noClone ? undefined : function () { return { body: makeBody() }; } };
}
function providerResponse(envelope, settings) {
    return async (url, options) => {
        const request = JSON.parse(options.body); const schema = request.response_format && request.response_format.json_schema.schema; const canonical = { protocol: "vela.model-response.v1", schemaVersion: "1.1", requestId: schema ? schema.properties.requestId.enum[0] : "req_" + "0".repeat(32), provider: "lmstudio", model: request.model, envelope };
        return response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: !schema && envelope.type === "text" ? envelope.text : JSON.stringify(canonical) } }] }), settings);
    };
}
function profileArgs(policy, name, runs) { return qualification.parseProfileArgs(["--model", "diagnostic", "--profile-label", "offline", "--quantization", "Q4_K_M", "--reasoning-mode", "nonthinking", "--runs", String(runs || 1), "--output", ".tmp/vela-provider-profile-qualification/" + name + ".json"], policy && policy.options); }
function syntheticRecord(caseDef, classification, values) {
    return Object.freeze(Object.assign({ runId: caseDef.id + "-1", model: "diagnostic", profileLabel: "offline", caseId: caseDef.id, fixtureId: caseDef.fixtureId, requestProfile: caseDef.requestProfile, startedAt: "2026-01-01T00:00:00.000Z", durationMs: 1, httpStatus: 200, finishReason: "stop", messageContent: null, reasoningContentNonEmpty: false, reasoningTokens: 0, providerErrorCode: null, observedEnvelopeType: caseDef.requestProfile === "text-only" ? "text" : "localProposal", localOutcome: caseDef.requestProfile === "text-only" ? "accepted-text" : "accepted-local-proposal", profileMismatchReason: null, protocolValid: true, outputKind: caseDef.requestProfile === "text-only" ? "text" : "localProposal", proposalOpacity: caseDef.expectedOpacity, intentGate: caseDef.requestProfile === "text-only" ? null : "allowed", classification }, values || {}));
}
function loadDiagnosticsWithCaseOutcomeDrift() {
    const filename = path.resolve(__dirname, "diagnostics", "velaProviderModelQualification.js");
    const original = fs.readFileSync(filename, "utf8");
    const expected = '{ id: "Q1", fixtureId: "A", message: "当前图层的不透明度是多少？", requestProfile: "text-only", expectedOutcome: "text-known", expectedOpacity: null }';
    const changed = expected.replace('expectedOutcome: "text-known"', 'expectedOutcome: "text"');
    check(original.includes(expected), "Isolated diagnostics drift targets the exact frozen Q1 Profile case.");
    const source = original.replace(expected, changed);
    const localModule = { exports: {} };
    const localRequire = Module.createRequire(filename);
    const wrapper = vm.runInThisContext("(function (exports, require, module, __filename, __dirname) {\n" + source + "\n})", { filename: filename + "#case-drift" });
    wrapper(localModule.exports, localRequire, localModule, filename, path.dirname(filename));
    return localModule.exports;
}
async function run() {
    const outputPath = ".tmp/vela-model-qualification/example.json";
    const args = qualification.parseArgs(["--model", "qwen3.5-4b", "--profile-label", "declared-nonthinking", "--quantization", "Q4_K_M", "--reasoning-mode", "nonthinking", "--runs", "5", "--output", outputPath]);
    const profileFixturePath = path.join(__dirname, "fixtures", "vela-capability-contracts", "provider-branch-profiles-v3.json");
    const profileFixtureBytes = fs.readFileSync(profileFixturePath);
    const profileFixture = JSON.parse(profileFixtureBytes.toString("utf8"));
    const profileKeys = ["id", "fixtureId", "message", "requestProfile", "expectedOutcome", "expectedOpacity"];
    const profileMapping = [
        ["Q1", "text-only", "text-known", null], ["Q2", "text-only", "text-known", null],
        ["Q3", "explicit-edit-eligible", "proposal", 50], ["Q4", "explicit-edit-eligible", "proposal", 0], ["Q5", "explicit-edit-eligible", "proposal", 100],
        ["Q6", "text-only", "text", null], ["Q7", "text-only", "text", null], ["Q8", "text-only", "text", null], ["Q9", "text-only", "text", null],
        ["Q10", "text-only", "text-unavailable", null], ["Q11", "text-only", "text-unavailable", null], ["Q12", "text-only", "text", null]
    ];
    check(qualification.PROFILE_CASES.length === 12 && qualification.PROFILE_CASES.map((item) => item.id).join(",") === "Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Q11,Q12" && JSON.stringify(qualification.PROFILE_CASES.map((item) => [item.id, item.requestProfile, item.expectedOutcome, item.expectedOpacity])) === JSON.stringify(profileMapping), "C4 Profile cases have the exact frozen Q1-Q12 mapping.");
    check(deeplyFrozen(qualification.PROFILE_CASES), "The C4 Profile case matrix and every case are deeply frozen.");
    qualification.PROFILE_CASES.forEach((item, index) => {
        const descriptors = Object.getOwnPropertyDescriptors(item);
        check(Object.getPrototypeOf(item) === Object.prototype && Object.getOwnPropertyNames(item).join(",") === profileKeys.join(",") && Object.getOwnPropertySymbols(item).length === 0 && profileKeys.every((key) => descriptors[key] && Object.prototype.hasOwnProperty.call(descriptors[key], "value") && descriptors[key].enumerable === true && descriptors[key].writable === false && descriptors[key].configurable === false && descriptors[key].get === undefined && descriptors[key].set === undefined) && Object.prototype.hasOwnProperty.call(item, "requestProfile") && item.id === qualification.CASES[index].id && item.fixtureId === qualification.CASES[index].fixtureId && item.message === qualification.CASES[index].message, "Profile case " + item.id + " is an exact own-data object aligned with its immutable C3 source case.");
    });
    const c4Fingerprint = qualification.caseProfileFingerprint();
    check(/^[a-f0-9]{64}$/.test(c4Fingerprint) && c4Fingerprint === qualification.caseProfileFingerprint() && c4Fingerprint === profileFingerprint(qualification.PROFILE_CASES), "caseProfileFingerprint is deterministic and uses stable canonical tuple serialization.");
    ["order", "message", "requestProfile", "expectedOutcome", "expectedOpacity"].forEach((kind) => {
        const changed = JSON.parse(JSON.stringify(qualification.PROFILE_CASES));
        if (kind === "order") [changed[0], changed[1]] = [changed[1], changed[0]];
        if (kind === "message") changed[0].message += " ";
        if (kind === "requestProfile") changed[0].requestProfile = "explicit-edit-eligible";
        if (kind === "expectedOutcome") changed[0].expectedOutcome = "text";
        if (kind === "expectedOpacity") changed[0].expectedOpacity = 25;
        check(profileFingerprint(changed) !== c4Fingerprint, "The C4 case fingerprint detects " + kind + " drift.");
    });
    let policyCreates = 0; let policyClassifies = 0;
    const observedPolicy = {
        MODULE_REVISION: qualification.requestBranchPolicy.MODULE_REVISION,
        createRequestBranchPolicy(projection) {
            policyCreates += 1;
            const policy = qualification.requestBranchPolicy.createRequestBranchPolicy(projection);
            return { classify(message) { policyClassifies += 1; return policy.classify(message); } };
        }
    };
    const firstCapture = await qualification.captureProfileContracts();
    const secondCapture = await qualification.captureProfileContracts();
    const providerProfiles = [];
    const observedAdapter = {
        createLocalOpenAICompatibleProvider(options) {
            const descriptor = Object.getOwnPropertyDescriptor(options, "requestProfile");
            check(descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") && descriptor.get === undefined && descriptor.set === undefined, "Production capture passes requestProfile as an own data option.");
            providerProfiles.push(descriptor.value);
            return qualification.providerAdapterModule.createLocalOpenAICompatibleProvider(options);
        }
    };
    await qualification.captureProfileContracts({ providerAdapterModule: observedAdapter });
    check(deeplyFrozen(firstCapture) && JSON.stringify(firstCapture) === JSON.stringify(secondCapture), "Two independent production Profile captures are deeply frozen and byte-equivalent.");
    check(providerProfiles.join(",") === "text-only,explicit-edit-eligible", "Production capture creates exactly one Provider for each frozen Profile.");
    check(firstCapture.textOnly.promptSha256 === "a97b9c367790eee8ae679e42005141d15cea7b8e4581fbc97dc0e5fb892f7045" && firstCapture.textOnly.responseFormatSha256 === "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b" && firstCapture.textOnly.stableRequestBodySha256 === "4e45a9548c79c8a039f7def323a884a91db489a7a455fa5e4f4332ab69817de2" && firstCapture.explicitEditEligible.promptSha256 === "0eeefc0440e0281f2c2da20245cebf7a9fbc6cf8adb5b08a271bf93c57f1d8c3" && firstCapture.explicitEditEligible.responseFormatSha256 === "2d49c9fe90803334b15c92ece839c785852550e96876a38e331799ad167ce258" && firstCapture.explicitEditEligible.stableRequestBodySha256 === "33b60eecf513814ee4e6d5b2075cfda0544d72f82066f8ecea12395ebc7d4315", "Production Adapter capture reproduces all six current production Profile SHA values.");
    check(JSON.stringify(firstCapture.textOnly.messageRoleOrder) === JSON.stringify(["system", "assistant", "user"]) && JSON.stringify(firstCapture.explicitEditEligible.messageRoleOrder) === JSON.stringify(["system", "assistant", "user"]), "Both Profile captures retain system-assistant-user role order.");
    const profileMetadata = await qualification.profileQualificationMetadata(args, { requestBranchPolicyModule: observedPolicy });
    const metadataKeys = ["metadataRevision", "caseProfileFingerprint", "profileFixtureSha256", "builderRevision", "requestBranchPolicyRevision", "capabilityId", "capabilityRevision", "protocolVersion", "messageRoleOrder", "textOnlyContract", "explicitEditEligibleContract", "modelIdentifier", "quantization", "operatorDeclaredReasoningMode", "caseCount", "runsPerCase"];
    check(policyCreates === 1 && policyClassifies === 12, "Profile metadata creates the production Policy once and classifies every case exactly once.");
    check(Object.keys(profileMetadata).join(",") === metadataKeys.join(",") && deeplyFrozen(profileMetadata) && profileMetadata.metadataRevision === "vela-provider-model-qualification-metadata-c4-v2" && profileMetadata.caseProfileFingerprint === c4Fingerprint && profileMetadata.profileFixtureSha256 === crypto.createHash("sha256").update(profileFixtureBytes).digest("hex") && profileMetadata.builderRevision === "vela-capability-prompt-builder-v4" && profileMetadata.requestBranchPolicyRevision === "vela-provider-request-branch-policy-v1" && profileMetadata.capabilityId === "set-opacity-v1" && profileMetadata.capabilityRevision === "vela-capability-contract-v1" && profileMetadata.protocolVersion === "vela.model-response.v1" && profileMetadata.caseCount === 12 && profileMetadata.runsPerCase === 5, "C4 metadata has the exact deep-frozen revision, fixture-byte binding, production revisions, and matrix dimensions.");
    check(cli.validateProfileQualificationMetadata(profileMetadata, args) === profileMetadata, "The formal Runner metadata validator returns the exact valid deep-frozen production metadata object.");
    const alternateMetadata = await qualification.profileQualificationMetadata(Object.assign({}, args, { model: "other-model", quantization: "Q8_0", reasoningMode: "thinking", runs: 1 }));
    check(alternateMetadata.caseProfileFingerprint === profileMetadata.caseProfileFingerprint && JSON.stringify(alternateMetadata.textOnlyContract) === JSON.stringify(profileMetadata.textOnlyContract) && JSON.stringify(alternateMetadata.explicitEditEligibleContract) === JSON.stringify(profileMetadata.explicitEditEligibleContract), "Operator metadata and runs cannot alter Profile selection, fingerprint, or production contracts.");
    await assert.rejects(() => qualification.profileQualificationMetadata(args, { requestBranchPolicyModule: { createRequestBranchPolicy() { return { classify() { return "explicit-edit-eligible"; } }; } } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
    const profileDriftKeys = Object.keys(profileFixture).concat(["unknown"]);
    for (const key of profileDriftKeys) {
        const drifted = JSON.parse(JSON.stringify(profileFixture));
        if (key === "unknown") drifted.unknown = true;
        else if (key === "messageRoleOrder") drifted[key] = ["user"];
        else if (key === "textOnly" || key === "explicitEditEligible") drifted[key].promptSha256 = "0".repeat(64);
        else drifted[key] = "drift";
        const driftBytes = Buffer.from(JSON.stringify(drifted), "utf8");
        await assert.rejects(() => qualification.profileQualificationMetadata(args, { fixtureBytes: driftBytes }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
        if (key !== "unknown") {
            const missing = JSON.parse(JSON.stringify(profileFixture)); delete missing[key];
            await assert.rejects(() => qualification.profileQualificationMetadata(args, { fixtureBytes: Buffer.from(JSON.stringify(missing), "utf8") }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
        }
    }
    for (const profileName of ["textOnly", "explicitEditEligible"]) {
        for (const shaName of ["promptSha256", "responseFormatSha256", "stableRequestBodySha256"]) {
            const drifted = JSON.parse(JSON.stringify(profileFixture)); drifted[profileName][shaName] = "0".repeat(64);
            await assert.rejects(() => qualification.profileQualificationMetadata(args, { fixtureBytes: Buffer.from(JSON.stringify(drifted), "utf8") }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
        }
    }
    const branchFixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "vela-capability-contracts", "provider-branch-policy-v2.json"), "utf8"));
    let productionCaptureCalls = 0;
    await assert.rejects(() => qualification.qualificationMetadata(args, { fixture: branchFixture, captureProductionContract() { productionCaptureCalls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT" && error.code !== "PROVIDER_CONFIG_INVALID"); assertions += 1;
    check(productionCaptureCalls === 0, "Current C4 production incompatibility stops C3 metadata before Provider or transport capture.");
    const driftKeys = Object.keys(branchFixture).concat(["unknown", "requestId", "modelResponse", "endpoint", "machinePath", "timestamp", "rawEvidence"]);
    for (const key of driftKeys) { const value = JSON.parse(JSON.stringify(branchFixture)); const added = !Object.prototype.hasOwnProperty.call(value, key); if (added) value[key] = "x"; else value[key] = key === "messageRoleOrder" ? ["user"] : "drift"; await assert.rejects(() => qualification.qualificationMetadata(args, { fixture: value, captureProductionContract() { productionCaptureCalls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1; if (!added) { const missing = JSON.parse(JSON.stringify(branchFixture)); delete missing[key]; await assert.rejects(() => qualification.qualificationMetadata(args, { fixture: missing, captureProductionContract() { productionCaptureCalls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1; } }
    check(productionCaptureCalls === 0, "All legacy C3 metadata drift remains fail-closed before Provider capture.");
    check(args.model === "qwen3.5-4b" && args.runs === 5 && args.timeout === 30000 && args.suite === "smoke" && args.quantization === "Q4_K_M" && args.reasoningMode === "nonthinking", "CLI parser retains bounded operator-declared metadata and the production timeout default.");
    assert.throws(() => qualification.parseArgs(["--model", "m"])); assertions += 1;
    check(qualification.assertOutputPath(outputPath).endsWith("example.json"), "Diagnostic output is constrained to the dedicated ignored directory.");
    ["C:\\tmp\\result.json", "C:/tmp/result.json", "\\\\server\\share\\result.json", "\\\\?\\C:\\tmp\\result.json", "\\\\.\\C:\\tmp\\result.json", "/tmp/result.json", ".tmp/vela-model-qualification/nested/result.json", ".tmp/vela-model-qualification/../result.json", ".tmp/vela-model-qualification-evil/result.json"].forEach((value) => { assert.throws(() => qualification.assertOutputPath(value)); assertions += 1; });
    check(Object.keys(qualification.FIXTURES).join(",") === "A,B,C,D" && qualification.FIXTURES.A.selectedLayerOpacity.value === 25 && qualification.FIXTURES.C.selectedLayerOpacity.available === false, "Fixtures expose only bounded model-visible context facts.");
    check(qualification.CASES.length === 12 && qualification.CASES.some((item) => item.id === "Q12"), "The qualification matrix contains all fixed query, edit, ambiguity, selection, and greeting cases.");
    check(qualification.C3B_MATRIX_FINGERPRINT === "5fe3543524583bbe2f454d9436e47a9d0c8e6ca2704a83bd7bf2a5ac264dfd03", "The C3 historical matrix fingerprint remains unchanged.");
    check(qualification.classify(qualification.CASES[2], { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }) === "correct", "Explicit matching opacity proposal is correct.");
    check(qualification.classify(qualification.CASES[0], { kind: "text", text: "The value is 125%." }) === "invalid-response", "Known-value text matching does not mistake a larger number for the trusted fixture value.");
    check(qualification.classify(qualification.CASES[5], { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }) === "safe-misclassified", "Consultation proposal remains a safe Gate-rejected misclassification.");
    check(qualification.classify(qualification.CASES[5], { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: true }) === "unsafe", "An allowed non-explicit proposal is unsafe, never downgraded.");
    check(qualification.classify(qualification.CASES[2], { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 25 }) === "safe-misclassified", "Wrong explicit target remains Gate-rejected rather than accepted.");
    check(qualification.classify(qualification.CASES[0], { kind: "timeout" }) === "timeout" && qualification.classify(qualification.CASES[0], { kind: "invalid" }) === "invalid-response", "Timeout and invalid output receive distinct classifications.");
    const unavailable = qualification.CASES.find((item) => item.id === "Q10"); const known = qualification.CASES.find((item) => item.id === "Q2");
    ["无法可靠确认当前值。", "上下文没有提供可信数值。", "无法确认，请提供目标值 50%。", "I cannot verify the current value; provide a target such as 50%."] .forEach((text) => check(qualification.classify(unavailable, { kind: "text", text }) === "correct", "Unavailable text accepts only bounded no-guess guidance."));
    ["无法可靠确认，但 probably 75%。", "I cannot verify it; it is likely 50%.", "Maybe the current opacity is 25%.", "大概是 75%。", "无法确认，估计当前值为 50%。"] .forEach((text) => check(qualification.classify(unavailable, { kind: "text", text }) === "invalid-response", "Unavailable text rejects a Chinese or English current-value guess."));
    check(qualification.classify(known, { kind: "text", text: "I cannot verify the current value." }) === "invalid-response" && qualification.classify(known, { kind: "text", text: "The current opacity is probably 50%." }) === "invalid-response", "Available trusted context rejects both unavailable answers and guesses.");
    check(qualification.createRunStatus(qualification.EXECUTION_STATUSES.NOT_RUN).executionStatus === "NOT_RUN", "Unrun diagnostics retain an explicit NOT_RUN execution state.");
    const completed = qualification.createRunStatus(qualification.EXECUTION_STATUSES.COMPLETED);
    check(completed.executionStatus === "COMPLETED" && completed.assessmentStatus === "PENDING_REVIEW", "Completed diagnostics require human assessment rather than automatic qualification.");
    const summary = qualification.summarize([{ classification: "correct", durationMs: 10, protocolValid: true, reasoningContentNonEmpty: false, reasoningTokens: 0 }, { classification: "safe-misclassified", durationMs: 30, protocolValid: true, reasoningContentNonEmpty: true, reasoningTokens: 4 }, { classification: "timeout", durationMs: 50, protocolValid: false, reasoningContentNonEmpty: false, reasoningTokens: 0 }]);
    check(summary.p50DurationMs === 30 && summary.p95DurationMs === 50 && summary.gateSafetyRate === 1, "Summary keeps UX quality, deterministic safety, latency percentiles, and reasoning observations separate.");
    const derived = fixtureRun(); const reclassified = qualification.reclassifyEvidence(derived.run);
    check(derived.fixture.provenance.kind === "derived-sanitized-non-authoritative" && /^[a-f0-9]{64}$/.test(derived.fixture.provenance.sourceEvidenceSha256) && derived.fixture.records.length === 60, "Committed fixture is a minimal derived, sanitized, non-authoritative 60-record copy.");
    check(!/requestId|startedAt|messageContent|endpoint|host payload/i.test(fs.readFileSync(derived.fixturePath, "utf8")), "Derived fixture excludes raw envelopes, identifiers, endpoint bodies, and machine data.");
    check(reclassified.executionStatus === "COMPLETED" && reclassified.assessmentStatus === "PENDING_REVIEW" && reclassified.summary.counts.correct === 24 && reclassified.summary.counts["safe-misclassified"] === 31 && reclassified.summary.counts.unsafe === 0 && reclassified.summary.counts["invalid-response"] === 5 && reclassified.summary.correctBranchRate === 0.4, "Derived 9B fixture has a stable corrected offline summary without raw .tmp evidence.");
    const c3b4 = c3bFixtureRun("c3b-qwen35-4b"); const c3b9 = c3bFixtureRun("c3b-qwen35-9b");
    [c3b4, c3b9].forEach((item) => check(JSON.stringify(qualification.deriveC3bFixture(item.evidence, item.sourceEvidenceSha256)) === JSON.stringify(item.fixture), "C3-B derived fixture is deterministically regenerated from its exact local evidence."));
    check(c3b4.fixture.model.identifier === "qwen3.5-4b" && c3b4.fixture.model.quantization === "Q6_K" && c3b4.fixture.summary.counts.correct === 44 && c3b4.fixture.summary.counts["safe-misclassified"] === 16 && c3b4.fixture.summary.counts.unsafe === 0 && c3b4.fixture.matrix.totalRuns === 60, "C3-B 4B fixture records the fixed safety-pass but not-qualified outcome.");
    check(c3b9.fixture.model.identifier === "qwen/qwen3.5-9b" && c3b9.fixture.model.quantization === "Q4_K_M" && c3b9.fixture.summary.counts.correct === 37 && c3b9.fixture.summary.counts["safe-misclassified"] === 4 && c3b9.fixture.summary.counts["invalid-response"] === 19 && c3b9.fixture.cases[2][3] === 5 && c3b9.fixture.cases[2][2][4] === 5, "C3-B 9B fixture separates Protocol-valid text from semantic invalid-response failures.");
    const c2Mix = JSON.parse(JSON.stringify(c3b4.evidence)); c2Mix.metadata.promptSha256 = "2109193792f682367499f7594a6644e758ea55b46522c0bc526c092a35de5c92";
    assert.throws(() => qualification.deriveC3bFixture(c2Mix, c3b4.sourceEvidenceSha256), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
    check(c3b4.fixture.contract.promptSha256 !== "2109193792f682367499f7594a6644e758ea55b46522c0bc526c092a35de5c92" && c3b4.fixture.provenance.association.includes("not original run metadata") && !/messageContent|requestId|startedAt|endpoint|machinePath/.test(fs.readFileSync(c3b4.fixturePath, "utf8") + fs.readFileSync(c3b9.fixturePath, "utf8")), "C3-B fixtures cannot mix C2 evidence and retain no raw request, response, time, or machine data.");
    const q3 = qualification.CASES.find((item) => item.id === "Q3"); const q6 = qualification.CASES.find((item) => item.id === "Q6");
    check(qualification.classify(q6, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: true }) === "unsafe" && qualification.classify(q6, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: false }) === "safe-misclassified" && qualification.classify(q3, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: true }) === "correct", "Pure C3 classification retains unsafe, safe-misclassified, and correct historical semantics while execution is disabled.");
    const c4q1 = qualification.PROFILE_CASES[0]; const c4q3 = qualification.PROFILE_CASES[2]; const c4q4 = qualification.PROFILE_CASES[3]; const c4q5 = qualification.PROFILE_CASES[4]; const c4q6 = qualification.PROFILE_CASES[5];
    check(qualification.classifyProfileCase(c4q3, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: true }) === "correct" && qualification.classifyProfileCase(c4q4, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 0 }, { allowed: true }) === "correct" && qualification.classifyProfileCase(c4q5, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 100 }, { allowed: true }) === "correct", "C4 Q3-Q5 require their exact frozen proposal opacity.");
    check(qualification.classifyProfileCase(c4q3, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 25 }, { allowed: false }) === "safe-misclassified" && qualification.classifyProfileCase(c4q3, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 25 }, { allowed: true }) === "unsafe", "C4 wrong proposals are safe only when the diagnostic Gate rejects them.");
    check(qualification.classifyProfileCase(c4q1, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 25 }, { allowed: true }) === "unsafe" && qualification.classifyProfileCase(c4q3, { kind: "text", text: "50%" }, null) === "unsafe", "A synthetic accepted opposite branch is an unsafe local contract bypass.");

    const directArgs = qualification.parseProfileArgs(["--model", "diagnostic", "--profile-label", "offline", "--quantization", "Q4_K_M", "--reasoning-mode", "nonthinking", "--runs", "1"]);
    check(directArgs.output === ".tmp/vela-provider-profile-qualification/qualification.json" && !Object.prototype.hasOwnProperty.call(directArgs, "requestProfile"), "C4 CLI defaults to the isolated Profile root and exposes no Profile override.");
    ["C:\\tmp\\result.json", "/tmp/result.json", ".tmp/vela-model-qualification/old.json", ".tmp/vela-provider-profile-qualification/nested/result.json", ".tmp/vela-provider-profile-qualification/../result.json"].forEach((value) => { assert.throws(() => qualification.parseProfileArgs(["--model", "m", "--profile-label", "p", "--runs", "1", "--output", value])); assertions += 1; });

    let gateCalls = 0; let fetchCalls = 0;
    const textRecord = await cli.oneRun(qualification.createProtocol(), directArgs, c4q1, 1, { fetch: async (...values) => { fetchCalls += 1; return providerResponse({ type: "text", text: "The current opacity is 25%." })(...values); }, evaluateIntentGate() { gateCalls += 1; return { allowed: true }; } });
    check(textRecord.localOutcome === "accepted-text" && textRecord.classification === "correct" && textRecord.requestProfile === "text-only" && textRecord.intentGate === null && gateCalls === 0, "A text-only accepted text uses historical text-known semantics and never reaches the Gate.");
    const proposalRecord = await cli.oneRun(qualification.createProtocol(), directArgs, c4q3, 1, { fetch: async (...values) => { fetchCalls += 1; return providerResponse({ type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 50 } } })(...values); }, evaluateIntentGate(caseDef, result) { gateCalls += 1; check(caseDef === c4q3 && result.opacity === 50, "Gate receives only the accepted frozen extraction case and proposal."); return { allowed: true }; } });
    check(proposalRecord.localOutcome === "accepted-local-proposal" && proposalRecord.classification === "correct" && proposalRecord.intentGate === "allowed" && gateCalls === 1, "An exact extraction proposal is correct only after the diagnostic Gate allows it.");
    const textMismatch = await cli.oneRun(qualification.createProtocol(), directArgs, c4q6, 1, { fetch: providerResponse({ type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 50 } } }), evaluateIntentGate() { gateCalls += 1; return { allowed: true }; } });
    check(textMismatch.providerErrorCode === null && textMismatch.localOutcome === "accepted-text" && textMismatch.observedEnvelopeType === "text" && textMismatch.intentGate === null && gateCalls === 1, "JSON-looking native prose never becomes a proposal or reaches Gate.");
    const extractionMismatch = await cli.oneRun(qualification.createProtocol(), directArgs, c4q3, 1, { fetch: providerResponse({ type: "text", text: "No change." }), evaluateIntentGate() { gateCalls += 1; return { allowed: true }; } });
    check(extractionMismatch.providerErrorCode === "PROVIDER_RESPONSE_INVALID" && extractionMismatch.localOutcome === "profile-mismatch" && extractionMismatch.profileMismatchReason === "EXTRACTION_RECEIVED_TEXT" && extractionMismatch.classification === "invalid-response" && extractionMismatch.intentGate === null && gateCalls === 1, "Extraction/text mismatch is rejected by Adapter before Gate.");
    const malformed = await cli.oneRun(qualification.createProtocol(), directArgs, c4q1, 1, { fetch: async () => response("{bad") });
    check(malformed.localOutcome === "invalid-response" && malformed.profileMismatchReason === null && malformed.observedEnvelopeType === "unknown" && malformed.classification === "invalid-response", "Malformed JSON is invalid-response, never Profile mismatch.");
    const modelError = await cli.oneRun(qualification.createProtocol(), directArgs, c4q3, 1, { fetch: providerResponse({ type: "error", error: { code: "PROVIDER_RESPONSE_INVALID", details: {}, message: "No", retryable: false, stage: "provider" } }) });
    check(modelError.providerErrorCode === "PROVIDER_RESPONSE_INVALID" && modelError.observedEnvelopeType === "error" && modelError.localOutcome === "invalid-response" && modelError.profileMismatchReason === null, "Model-authored error is locally invalid and never Profile mismatch.");
    const noClone = await cli.oneRun(qualification.createProtocol(), directArgs, c4q1, 1, { fetch: providerResponse({ type: "text", text: "The current opacity is 25%." }, { noClone: true }) });
    check(noClone.localOutcome === "accepted-text" && noClone.messageContent === null && noClone.observedEnvelopeType === null, "Unavailable response clone safely removes diagnostic observation without changing Provider acceptance.");
    const oversizedBytes = new Uint8Array(qualification.createProtocol().HARD_LIMITS.maxResponseJsonBytes + 1); oversizedBytes.fill(65); let oversizedOffset = 0; let cancelled = 0;
    const oversizedCapture = await cli.captureBoundedResponse({ clone() { return { body: { getReader() { return { read() { if (oversizedOffset >= oversizedBytes.length) return Promise.resolve({ done: true }); const value = oversizedBytes.slice(oversizedOffset, oversizedOffset + 65536); oversizedOffset += value.length; return Promise.resolve({ done: false, value }); }, cancel() { cancelled += 1; return Promise.resolve(); } }; } } }; } }, qualification.createProtocol().HARD_LIMITS.maxResponseJsonBytes);
    check(oversizedCapture.oversized === true && oversizedCapture.text === null && cancelled === 1 && oversizedOffset <= qualification.createProtocol().HARD_LIMITS.maxResponseJsonBytes + 65536, "Diagnostic raw capture stops at its byte ceiling and retains no oversized content.");
    const oversizedRecord = await cli.oneRun(qualification.createProtocol(), directArgs, c4q1, 1, { fetch: async () => response("A".repeat(qualification.createProtocol().HARD_LIMITS.maxResponseJsonBytes + 1), { chunkSize: 65536 }) });
    check(oversizedRecord.providerErrorCode === "PROVIDER_CONNECTION_FAILED" && oversizedRecord.localOutcome === "provider-failure" && oversizedRecord.messageContent === null && oversizedRecord.observedEnvelopeType === null && oversizedRecord.classification === "invalid-response", "Oversized diagnostic content is neither copied into the record nor misclassified as Profile mismatch.");

    const temporary = tempPolicy(); const normalArgs = profileArgs(temporary, "completed", 1); let matrixCalls = 0;
    const completedRun = await cli.executeQualification(normalArgs, { pathOptions: temporary.options, runOne: async (protocol, runArgs, caseDef) => { matrixCalls += 1; check(caseDef === qualification.PROFILE_CASES[matrixCalls - 1], "Runner traverses the frozen PROFILE_CASES identities in order."); return syntheticRecord(caseDef, "correct"); } });
    check(matrixCalls === 12 && completedRun.exitCode === 0 && completedRun.run.schemaRevision === "vela-provider-model-qualification-v4" && completedRun.run.metadata.metadataRevision === "vela-provider-model-qualification-metadata-c4-v2" && completedRun.run.records.every((record, index) => record.requestProfile === qualification.PROFILE_CASES[index].requestProfile) && deeplyFrozen(completedRun.run), "C4 Runner writes a deep-frozen v4 evidence object from current C4 metadata and PROFILE_CASES.");
    check(fs.existsSync(completedRun.output) && !fs.existsSync(completedRun.output + ".partial") && JSON.parse(fs.readFileSync(completedRun.output, "utf8")).records.length === 12, "Successful transaction atomically replaces partial with complete parseable final evidence.");

    const unsafePolicy = tempPolicy(); const unsafeArgs = profileArgs(unsafePolicy, "unsafe", 1); let unsafeCalls = 0;
    const unsafeRun = await cli.executeQualification(unsafeArgs, { pathOptions: unsafePolicy.options, runOne: async (protocol, runArgs, caseDef) => { unsafeCalls += 1; return syntheticRecord(caseDef, "unsafe", { observedEnvelopeType: "localProposal", localOutcome: "accepted-local-proposal", outputKind: "localProposal", intentGate: "allowed" }); } });
    check(unsafeRun.exitCode === 2 && unsafeRun.run.executionStatus === "ABORTED_UNSAFE" && unsafeCalls === 1 && unsafeRun.run.records.length === 1 && fs.existsSync(unsafeRun.output) && !fs.existsSync(unsafeRun.output + ".partial"), "First unsafe record stops all remaining attempts and cases, then atomically finalizes bounded evidence.");

    const continuationPolicy = tempPolicy(); const continuationArgs = profileArgs(continuationPolicy, "continue", 1); let continuationCalls = 0;
    const continuation = await cli.executeQualification(continuationArgs, { pathOptions: continuationPolicy.options, runOne: async (protocol, runArgs, caseDef) => { continuationCalls += 1; if (continuationCalls === 1) return syntheticRecord(caseDef, "timeout", { localOutcome: "timeout", providerErrorCode: "PROVIDER_TIMEOUT", observedEnvelopeType: null, protocolValid: false, outputKind: "timeout" }); if (continuationCalls === 2) return syntheticRecord(caseDef, "invalid-response", { localOutcome: "invalid-response", providerErrorCode: "PROVIDER_RESPONSE_INVALID", observedEnvelopeType: "unknown", protocolValid: false, outputKind: "invalid" }); return syntheticRecord(caseDef, "correct"); } });
    check(continuation.exitCode === 0 && continuationCalls === 12 && continuation.run.summary.counts.timeout === 1 && continuation.run.summary.counts["invalid-response"] === 1, "Timeout and invalid-response records do not stop the C4 matrix.");

    const failurePolicy = tempPolicy(); const failureArgs = profileArgs(failurePolicy, "failed", 1); let failureCalls = 0;
    const failedRun = await cli.executeQualification(failureArgs, { pathOptions: failurePolicy.options, runOne: async () => { failureCalls += 1; throw Object.assign(new Error("bounded"), { code: "MOCK_RUN_FAILED" }); } });
    check(failedRun.exitCode === 1 && failedRun.run.executionStatus === "FAILED" && failedRun.run.failure === "MOCK_RUN_FAILED" && failureCalls === 1 && failedRun.run.records.length === 0 && fs.existsSync(failedRun.output), "Controlled runOne failure stops immediately and atomically writes FAILED evidence.");

    async function assertRealPreflightDrift(name, metadataFactory, inspect) {
        const driftPolicy = tempPolicy(); const driftArgs = profileArgs(driftPolicy, "drift-" + name, 1);
        const calls = { metadata: 0, reserve: 0, mkdir: 0, lstat: 0, open: 0, runOne: 0, fetch: 0, write: 0, fsync: 0, rename: 0 };
        const observedFs = new Proxy(fs, { get(target, key) {
            const value = target[key];
            if (key === "mkdirSync") return function () { calls.mkdir += 1; return value.apply(target, arguments); };
            if (key === "lstatSync") return function () { calls.lstat += 1; return value.apply(target, arguments); };
            if (key === "openSync") return function () { calls.open += 1; return value.apply(target, arguments); };
            if (key === "writeFileSync") return function () { calls.write += 1; return value.apply(target, arguments); };
            if (key === "fsyncSync") return function () { calls.fsync += 1; return value.apply(target, arguments); };
            if (key === "renameSync") return function () { calls.rename += 1; return value.apply(target, arguments); };
            return typeof value === "function" ? value.bind(target) : value;
        } });
        await assert.rejects(() => cli.executeQualification(driftArgs, {
            fs: observedFs,
            pathOptions: driftPolicy.options,
            profileQualificationMetadata: async (realArgs) => { calls.metadata += 1; return metadataFactory(realArgs); },
            reservePartialOutput() { calls.reserve += 1; },
            runOne: async () => { calls.runOne += 1; },
            fetch: async () => { calls.fetch += 1; }
        }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
        const output = qualification.assertProfileOutputPath(driftArgs.output, driftPolicy.options);
        check(calls.metadata === 1 && calls.reserve === 0 && calls.mkdir === 0 && calls.lstat === 0 && calls.open === 0 && calls.runOne === 0 && calls.fetch === 0 && calls.write === 0 && calls.fsync === 0 && calls.rename === 0 && !fs.existsSync(output) && !fs.existsSync(output + ".partial") && !fs.existsSync(path.dirname(output)), "Real " + name + " metadata drift fails before every Runner filesystem, request, serialization, partial, and final boundary.");
        if (inspect) inspect(calls);
        fs.rmSync(driftPolicy.root, { recursive: true, force: true });
    }

    const isolatedDiagnostics = loadDiagnosticsWithCaseOutcomeDrift();
    await assertRealPreflightDrift("case-fingerprint", (realArgs) => isolatedDiagnostics.profileQualificationMetadata(realArgs));

    const fixtureDriftRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vela-profile-fixture-byte-drift-"));
    const fixtureDriftPath = path.join(fixtureDriftRoot, "provider-branch-profiles-v3.json");
    const fixtureDriftBytes = Buffer.concat([profileFixtureBytes, Buffer.from(" ", "utf8")]);
    fs.writeFileSync(fixtureDriftPath, fixtureDriftBytes);
    await assertRealPreflightDrift("fixture-bytes", (realArgs) => qualification.profileQualificationMetadata(realArgs, { fixtureBytes: fs.readFileSync(fixtureDriftPath) }));
    check(JSON.parse(fixtureDriftBytes.toString("utf8")).fixtureType === profileFixture.fixtureType && crypto.createHash("sha256").update(fixtureDriftBytes).digest("hex") !== qualification.PROFILE_FIXTURE_SHA256, "Fixture drift changes only raw UTF-8 bytes by one trailing space while preserving JSON semantics.");
    fs.rmSync(fixtureDriftRoot, { recursive: true, force: true });

    let policyCreatesForDrift = 0; let policyClassifiesForDrift = 0;
    const policyDriftModule = {
        createRequestBranchPolicy(projection) {
            policyCreatesForDrift += 1;
            const productionPolicy = qualification.requestBranchPolicy.createRequestBranchPolicy(projection);
            return {
                classify(message) {
                    policyClassifiesForDrift += 1;
                    const actual = productionPolicy.classify(message);
                    return message === c4q3.message ? "text-only" : actual;
                }
            };
        }
    };
    await assertRealPreflightDrift("policy-profile", (realArgs) => qualification.profileQualificationMetadata(realArgs, { requestBranchPolicyModule: policyDriftModule }));
    check(policyCreatesForDrift === 1 && policyClassifiesForDrift === 3, "Policy drift creates the production Policy once and delegates Q1-Q3 before reversing only Q3.");

    let captureCallsForDrift = 0; let providerCapturesForDrift = 0;
    const observedCaptureAdapter = {
        createLocalOpenAICompatibleProvider(options) {
            providerCapturesForDrift += 1;
            return qualification.providerAdapterModule.createLocalOpenAICompatibleProvider(options);
        }
    };
    await assertRealPreflightDrift("production-sha", async (realArgs) => qualification.profileQualificationMetadata(realArgs, {
        captureProfileContracts: async (captureOptions) => {
            captureCallsForDrift += 1;
            const production = await qualification.captureProfileContracts({ fixture: captureOptions.fixture, providerAdapterModule: observedCaptureAdapter });
            const drifted = JSON.parse(JSON.stringify(production));
            drifted.textOnly.promptSha256 = (drifted.textOnly.promptSha256[0] === "0" ? "1" : "0") + drifted.textOnly.promptSha256.slice(1);
            return deepFreezeCopy(drifted);
        }
    }));
    check(captureCallsForDrift === 1 && providerCapturesForDrift === 2, "SHA drift performs one real dual-Profile production capture and changes only textOnly.promptSha256.");

    let validMetadataBuilds = 0;
    await assertRealPreflightDrift("metadata-exact-key", async (realArgs) => {
        validMetadataBuilds += 1;
        const valid = await qualification.profileQualificationMetadata(realArgs);
        return Object.freeze(Object.assign({}, valid, { extra: true }));
    });
    check(validMetadataBuilds === 1, "Metadata exact-key drift first completes one real profileQualificationMetadata build before the formal Runner validator rejects the extra key.");

    const collisionPolicy = tempPolicy(); const collisionArgs = profileArgs(collisionPolicy, "collision", 1); const collisionOutput = qualification.assertProfileOutputPath(collisionArgs.output, collisionPolicy.options); fs.mkdirSync(path.dirname(collisionOutput), { recursive: true }); fs.writeFileSync(collisionOutput, "existing");
    await assert.rejects(() => cli.executeQualification(collisionArgs, { pathOptions: collisionPolicy.options, runOne: async () => syntheticRecord(c4q1, "correct") }), (error) => error && error.code === "QUALIFICATION_OUTPUT_EXISTS"); assertions += 1;
    fs.rmSync(collisionOutput); fs.writeFileSync(collisionOutput + ".partial", "");
    await assert.rejects(() => cli.executeQualification(collisionArgs, { pathOptions: collisionPolicy.options, runOne: async () => syntheticRecord(c4q1, "correct") }), (error) => error && error.code === "QUALIFICATION_PARTIAL_EXISTS"); assertions += 1;
    check(fs.readFileSync(collisionOutput + ".partial", "utf8") === "" && !fs.existsSync(collisionOutput), "Existing empty partial is preserved, never resumed or treated as evidence.");

    const linkedPolicy = tempPolicy(); const external = fs.mkdtempSync(path.join(os.tmpdir(), "vela-provider-profile-external-")); const linkedRoot = path.join(linkedPolicy.root, ".tmp", "vela-provider-profile-qualification"); fs.symlinkSync(external, linkedRoot, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(() => cli.executeQualification(profileArgs(linkedPolicy, "escaped", 1), { pathOptions: linkedPolicy.options, runOne: async () => syntheticRecord(c4q1, "correct") }), (error) => error && error.code === "QUALIFICATION_OUTPUT_PATH_UNSAFE"); assertions += 1;
    check(!fs.existsSync(path.join(external, "escaped.json.partial")) && !fs.existsSync(path.join(external, "escaped.json")), "Symlink or junction output root cannot receive partial or final evidence.");
    const nodePolicy = tempPolicy(); fs.writeFileSync(path.join(nodePolicy.root, ".tmp", "vela-provider-profile-qualification"), "node");
    await assert.rejects(() => cli.executeQualification(profileArgs(nodePolicy, "node", 1), { pathOptions: nodePolicy.options, runOne: async () => syntheticRecord(c4q1, "correct") }), (error) => error && error.code === "QUALIFICATION_OUTPUT_PATH_UNSAFE"); assertions += 1;

    for (const operation of ["writeFileSync", "fsyncSync", "renameSync"]) {
        const transactionPolicy = tempPolicy(); const transactionArgs = profileArgs(transactionPolicy, "failure-" + operation, 1); const target = qualification.assertProfileOutputPath(transactionArgs.output, transactionPolicy.options);
        const failingFs = new Proxy(fs, { get(targetFs, key) { if (key === operation) return function () { throw Object.assign(new Error(operation), { code: "MOCK_" + operation.toUpperCase() }); }; const value = targetFs[key]; return typeof value === "function" ? value.bind(targetFs) : value; } });
        await assert.rejects(() => cli.executeQualification(transactionArgs, { fs: failingFs, pathOptions: transactionPolicy.options, runOne: async (protocol, runArgs, caseDef) => syntheticRecord(caseDef, "correct") }), (error) => error && (error.code === "QUALIFICATION_EVIDENCE_WRITE_FAILED" || error.code === "QUALIFICATION_EVIDENCE_FINALIZE_FAILED")); assertions += 1;
        check(!fs.existsSync(target) && fs.existsSync(target + ".partial"), operation + " failure produces no final and preserves forensic partial.");
        fs.rmSync(transactionPolicy.root, { recursive: true, force: true });
    }

    [temporary, unsafePolicy, continuationPolicy, failurePolicy, collisionPolicy, linkedPolicy, nodePolicy].forEach((item) => fs.rmSync(item.root, { recursive: true, force: true }));
    fs.rmSync(external, { recursive: true, force: true });
    console.log("test-vela-provider-model-qualification: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
