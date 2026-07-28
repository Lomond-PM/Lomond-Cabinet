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
function localProposalResponse(opacity) { return async (url, options) => { const request = JSON.parse(options.body); const schema = request.response_format.json_schema.schema; const bodyText = JSON.stringify({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ envelope: { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity } } }, protocol: "vela.model-response.v1", schemaVersion: "1.1", provider: "lmstudio", model: request.model, requestId: schema.properties.requestId.enum[0] }) } }] }); const bytes = new TextEncoder().encode(bodyText); let read = false; return { status: 200, redirected: false, url, headers: { get(name) { return String(name).toLowerCase() === "content-type" ? "application/json" : null; } }, body: { getReader() { return { read() { if (read) return Promise.resolve({ done: true }); read = true; return Promise.resolve({ done: false, value: bytes }); }, cancel() {} }; } }, clone() { return { text: async () => bodyText }; } }; }; }
function tempPolicy() { const root = fs.mkdtempSync(path.join(os.tmpdir(), "vela-provider-model-qualification-")); fs.mkdirSync(path.join(root, ".tmp")); return { root, options: { repositoryRoot: root } }; }
async function run() {
    const outputPath = ".tmp/vela-model-qualification/example.json";
    const args = qualification.parseArgs(["--model", "qwen3.5-4b", "--profile-label", "declared-nonthinking", "--runs", "5", "--output", outputPath]);
    check(args.model === "qwen3.5-4b" && args.runs === 5 && args.timeout === 30000 && args.suite === "smoke", "CLI parser retains the explicit model/profile and production timeout default.");
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
    const temporary = tempPolicy(); const q3 = qualification.CASES.find((item) => item.id === "Q3"); const q6 = qualification.CASES.find((item) => item.id === "Q6"); let requestCalls = 0; let gateCalls = 0;
    const unsafeArgs = qualification.parseArgs(["--model", "diagnostic", "--profile-label", "offline", "--runs", "5", "--output", ".tmp/vela-model-qualification/unsafe.json"]);
    const unsafe = await cli.executeQualification(unsafeArgs, { pathOptions: temporary.options, caseDefs: [q6], fetch: async (...values) => { requestCalls += 1; return localProposalResponse(50)(...values); }, evaluateIntentGate(caseDef, result) { gateCalls += 1; check(caseDef.id === "Q6" && result.kind === "localProposal" && result.opacity === 50, "Injected Gate receives the parsed proposal and original non-explicit case."); return { allowed: true }; } });
    const unsafePayload = fs.readFileSync(unsafe.output); const unsafeHash = crypto.createHash("sha256").update(unsafePayload).digest("hex");
    check(unsafe.exitCode === 2 && unsafe.run.executionStatus === "ABORTED_UNSAFE" && unsafe.run.assessmentStatus === "PENDING_REVIEW" && unsafe.run.records.length === 1 && unsafe.run.records[0].intentGate === "allowed" && unsafe.run.records[0].classification === "unsafe" && requestCalls === 1 && gateCalls === 1, "Unsafe oneRun flow parses the response, records the actual allowed Gate result, writes evidence, and stops before later cases.");
    await assert.rejects(() => cli.executeQualification(unsafeArgs, { pathOptions: temporary.options, caseDefs: [q6], runOne: async () => { requestCalls += 1; } }), (error) => error && error.code === "EEXIST"); assertions += 1;
    check(requestCalls === 1 && unsafeHash === crypto.createHash("sha256").update(fs.readFileSync(unsafe.output)).digest("hex"), "Existing output is atomically rejected before requests and remains unchanged.");
    const rejected = await cli.executeQualification(qualification.parseArgs(["--model", "diagnostic", "--profile-label", "offline", "--runs", "1", "--output", ".tmp/vela-model-qualification/rejected.json"]), { pathOptions: temporary.options, caseDefs: [q6], fetch: localProposalResponse(50), evaluateIntentGate() { return { allowed: false }; } });
    check(rejected.exitCode === 0 && rejected.run.records[0].intentGate === "rejected" && rejected.run.records[0].classification === "safe-misclassified", "Rejected Gate decision remains a safe misclassification without unsafe abort.");
    const correct = await cli.executeQualification(qualification.parseArgs(["--model", "diagnostic", "--profile-label", "offline", "--runs", "1", "--output", ".tmp/vela-model-qualification/correct.json"]), { pathOptions: temporary.options, caseDefs: [q3], fetch: localProposalResponse(50), evaluateIntentGate() { return { allowed: true }; } });
    check(correct.exitCode === 0 && correct.run.records[0].intentGate === "allowed" && correct.run.records[0].classification === "correct", "Explicit matching proposal preserves the actual allowed Gate decision and correct classification.");
    const linkedOutput = path.join(temporary.root, ".tmp", "vela-model-qualification"); const external = fs.mkdtempSync(path.join(os.tmpdir(), "vela-provider-model-qualification-external-")); fs.rmSync(linkedOutput, { recursive: true, force: true }); fs.symlinkSync(external, linkedOutput, process.platform === "win32" ? "junction" : "dir"); let escapedCalls = 0;
    await assert.rejects(() => cli.executeQualification(qualification.parseArgs(["--model", "diagnostic", "--profile-label", "offline", "--runs", "1", "--output", ".tmp/vela-model-qualification/escaped.json"]), { pathOptions: temporary.options, caseDefs: [q6], runOne: async () => { escapedCalls += 1; } }), (error) => error && error.code === "QUALIFICATION_OUTPUT_PATH_UNSAFE"); assertions += 1;
    check(escapedCalls === 0 && !fs.existsSync(path.join(external, "escaped.json")), "A real directory symlink or junction is rejected before a request or external write.");
    fs.rmSync(temporary.root, { recursive: true, force: true }); fs.rmSync(external, { recursive: true, force: true });
    console.log("test-vela-provider-model-qualification: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
