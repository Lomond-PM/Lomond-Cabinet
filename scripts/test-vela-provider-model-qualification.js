#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
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
async function run() {
    const outputPath = ".tmp/vela-model-qualification/example.json";
    const args = qualification.parseArgs(["--model", "qwen3.5-4b", "--profile-label", "declared-nonthinking", "--quantization", "Q4_K_M", "--reasoning-mode", "nonthinking", "--runs", "5", "--output", outputPath]);
    const branchFixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "vela-capability-contracts", "provider-branch-policy-v2.json"), "utf8"));
    let productionCaptureCalls = 0;
    await assert.rejects(() => qualification.qualificationMetadata(args, { fixture: branchFixture, captureProductionContract() { productionCaptureCalls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT" && error.code !== "PROVIDER_CONFIG_INVALID"); assertions += 1;
    check(productionCaptureCalls === 0, "Current C4 production incompatibility stops C3 metadata before Provider or transport capture.");
    const driftKeys = Object.keys(branchFixture).concat(["unknown", "requestId", "modelResponse", "endpoint", "machinePath", "timestamp", "rawEvidence"]);
    for (const key of driftKeys) { const value = JSON.parse(JSON.stringify(branchFixture)); const added = !Object.prototype.hasOwnProperty.call(value, key); if (added) value[key] = "x"; else value[key] = key === "messageRoleOrder" ? ["user"] : "drift"; let calls = 0; const drift = tempPolicy(); await assert.rejects(() => cli.executeQualification(Object.assign({}, args, { output: ".tmp/vela-model-qualification/drift-" + key + ".json" }), { pathOptions: drift.options, contractFixture: value, runOne: async () => { calls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1; check(calls === 0 && !fs.existsSync(path.join(drift.root, ".tmp", "vela-model-qualification", "drift-" + key + ".json")), "Contract drift " + key + " prevents requests and evidence."); fs.rmSync(drift.root, { recursive: true, force: true }); if (!added) { const missing = JSON.parse(JSON.stringify(branchFixture)); delete missing[key]; calls = 0; const missingDrift = tempPolicy(); await assert.rejects(() => cli.executeQualification(Object.assign({}, args, { output: ".tmp/vela-model-qualification/missing-" + key + ".json" }), { pathOptions: missingDrift.options, contractFixture: missing, runOne: async () => { calls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1; check(calls === 0 && !fs.existsSync(path.join(missingDrift.root, ".tmp", "vela-model-qualification", "missing-" + key + ".json")), "Missing contract field " + key + " prevents requests and evidence."); fs.rmSync(missingDrift.root, { recursive: true, force: true }); } }
    check(args.model === "qwen3.5-4b" && args.runs === 5 && args.timeout === 30000 && args.suite === "smoke" && args.quantization === "Q4_K_M" && args.reasoningMode === "nonthinking", "CLI parser retains bounded operator-declared metadata and the production timeout default.");
    assert.throws(() => qualification.parseArgs(["--model", "m"])); assertions += 1;
    check(qualification.assertOutputPath(outputPath).endsWith("example.json"), "Diagnostic output is constrained to the dedicated ignored directory.");
    ["C:\\tmp\\result.json", "C:/tmp/result.json", "\\\\server\\share\\result.json", "\\\\?\\C:\\tmp\\result.json", "\\\\.\\C:\\tmp\\result.json", "/tmp/result.json", ".tmp/vela-model-qualification/nested/result.json", ".tmp/vela-model-qualification/../result.json", ".tmp/vela-model-qualification-evil/result.json"].forEach((value) => { assert.throws(() => qualification.assertOutputPath(value)); assertions += 1; });
    check(Object.keys(qualification.FIXTURES).join(",") === "A,B,C,D" && qualification.FIXTURES.A.selectedLayerOpacity.value === 25 && qualification.FIXTURES.C.selectedLayerOpacity.available === false, "Fixtures expose only bounded model-visible context facts.");
    check(qualification.CASES.length === 12 && qualification.CASES.some((item) => item.id === "Q12"), "The qualification matrix contains all fixed query, edit, ambiguity, selection, and greeting cases.");
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
    const temporary = tempPolicy(); const q3 = qualification.CASES.find((item) => item.id === "Q3"); const q6 = qualification.CASES.find((item) => item.id === "Q6");
    check(qualification.classify(q6, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: true }) === "unsafe" && qualification.classify(q6, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: false }) === "safe-misclassified" && qualification.classify(q3, { kind: "localProposal", capabilityId: "set-opacity-v1", opacity: 50 }, { allowed: true }) === "correct", "Pure C3 classification retains unsafe, safe-misclassified, and correct historical semantics while execution is disabled.");
    const guardedArgs = qualification.parseArgs(["--model", "diagnostic", "--profile-label", "offline", "--runs", "5", "--output", ".tmp/vela-model-qualification/guarded.json"]);
    let fsCalls = 0; let runOneCalls = 0; let fetchCalls = 0;
    const observedFs = new Proxy(fs, { get(target, key) { const value = target[key]; return typeof value === "function" ? function () { fsCalls += 1; return value.apply(target, arguments); } : value; } });
    await assert.rejects(() => cli.executeQualification(guardedArgs, { fs: observedFs, pathOptions: temporary.options, contractFixture: branchFixture, runOne: async () => { runOneCalls += 1; }, fetch: async () => { fetchCalls += 1; } }), (error) => error && error.code === "QUALIFICATION_CONTRACT_DRIFT"); assertions += 1;
    check(fsCalls === 0 && runOneCalls === 0 && fetchCalls === 0 && !fs.existsSync(path.join(temporary.root, ".tmp", "vela-model-qualification", "guarded.json")), "C3 compatibility guard precedes reserveOutput, output creation, runOne, fetch, and partial evidence.");
    const linkedOutput = path.join(temporary.root, ".tmp", "vela-model-qualification"); const external = fs.mkdtempSync(path.join(os.tmpdir(), "vela-provider-model-qualification-external-")); fs.rmSync(linkedOutput, { recursive: true, force: true }); fs.symlinkSync(external, linkedOutput, process.platform === "win32" ? "junction" : "dir"); let escapedCalls = 0;
    await assert.rejects(Promise.resolve().then(() => cli.reserveOutput(fs, qualification.assertOutputPath(".tmp/vela-model-qualification/escaped.json", temporary.options), temporary.options)), (error) => error && error.code === "QUALIFICATION_OUTPUT_PATH_UNSAFE"); assertions += 1;
    check(escapedCalls === 0 && !fs.existsSync(path.join(external, "escaped.json")), "A real directory symlink or junction is rejected before a request or external write.");
    fs.rmSync(temporary.root, { recursive: true, force: true }); fs.rmSync(external, { recursive: true, force: true });
    console.log("test-vela-provider-model-qualification: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
