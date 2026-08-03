#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const rubricModule = require("./diagnostics/velaProviderQualificationRubric");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function deeplyFrozen(value) { return Object.isFrozen(value) && (!value || typeof value !== "object" || Object.keys(value).every((key) => deeplyFrozen(value[key]))); }

const caseIds = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10", "Q11", "Q12"];
const profiles = { Q1: "text-only", Q2: "text-only", Q3: "explicit-edit-eligible", Q4: "explicit-edit-eligible", Q5: "explicit-edit-eligible", Q6: "text-only", Q7: "text-only", Q8: "text-only", Q9: "text-only", Q10: "text-only", Q11: "text-only", Q12: "text-only" };
const fixtureIds = { Q1: "A", Q2: "B", Q3: "A", Q4: "A", Q5: "A", Q6: "A", Q7: "A", Q8: "A", Q9: "A", Q10: "C", Q11: "D", Q12: "A" };

function metadata(rubric, model, runs) {
    function contract(value) { return Object.assign({}, value, { messageRoleOrder: ["system", "assistant", "user"] }); }
    return {
        metadataRevision: rubric.appliesTo.metadataRevision,
        caseProfileFingerprint: rubric.appliesTo.caseProfileFingerprint,
        profileFixtureSha256: rubric.appliesTo.profileFixtureSha256,
        builderRevision: "vela-capability-prompt-builder-v3",
        requestBranchPolicyRevision: "vela-provider-request-branch-policy-v1",
        capabilityId: "set-opacity-v1",
        capabilityRevision: "vela-capability-contract-v1",
        protocolVersion: "vela.model-response.v1",
        messageRoleOrder: ["system", "assistant", "user"],
        textOnlyContract: contract(rubric.appliesTo.productionContracts.textOnly),
        explicitEditEligibleContract: contract(rubric.appliesTo.productionContracts.explicitEditEligible),
        modelIdentifier: model,
        quantization: "Q6_K",
        operatorDeclaredReasoningMode: "non-thinking",
        caseCount: 12,
        runsPerCase: runs
    };
}
function record(caseId, attempt, model, profileLabel) {
    const extraction = profiles[caseId] === "explicit-edit-eligible";
    return {
        runId: caseId + "-" + attempt,
        model,
        profileLabel,
        caseId,
        fixtureId: fixtureIds[caseId],
        requestProfile: profiles[caseId],
        startedAt: "2026-01-01T00:00:00.000Z",
        durationMs: 1,
        httpStatus: 200,
        finishReason: "stop",
        messageContent: "{}",
        reasoningContentNonEmpty: false,
        reasoningTokens: 0,
        providerErrorCode: null,
        observedEnvelopeType: extraction ? "localProposal" : "text",
        localOutcome: extraction ? "accepted-local-proposal" : "accepted-text",
        profileMismatchReason: null,
        protocolValid: true,
        outputKind: extraction ? "localProposal" : "text",
        proposalOpacity: extraction ? 50 : null,
        intentGate: extraction ? "allowed" : null,
        classification: "correct"
    };
}
function makeEvidence(runs) {
    const rubric = rubricModule.loadRubric(); const model = "qwen3.5-4b"; const profileLabel = "qwen3.5-4b-nonthinking"; const records = [];
    caseIds.forEach((caseId) => { for (let attempt = 1; attempt <= runs; attempt += 1) records.push(record(caseId, attempt, model, profileLabel)); });
    return { schemaRevision: rubric.appliesTo.evidenceRevision, endpoint: "http://127.0.0.1:1234/v1/chat/completions", model, profileLabel, profileVerification: "operator-declared", suite: "qualification", runs, timeoutMs: 30000, fixtureIds: ["A", "B", "C", "D"], metadata: metadata(rubric, model, runs), records, summary: { forged: true }, executionStatus: "COMPLETED", assessmentStatus: "PENDING_REVIEW", failure: null };
}
function findRecord(evidence, caseId, attempt) { return evidence.records.find((item) => item.runId === caseId + "-" + attempt); }
function makeSafe(recordValue) { Object.assign(recordValue, { observedEnvelopeType: "localProposal", localOutcome: "accepted-local-proposal", outputKind: "localProposal", proposalOpacity: 50, intentGate: "rejected", classification: "safe-misclassified" }); }
function pilotPassEvidence() { const evidence = makeEvidence(5); ["Q1", "Q2", "Q6", "Q7", "Q8", "Q9"].forEach((caseId) => makeSafe(findRecord(evidence, caseId, 1))); return evidence; }
function finalPassEvidence() { const evidence = makeEvidence(20); ["Q1", "Q2", "Q6", "Q7", "Q8", "Q9"].forEach((caseId) => { makeSafe(findRecord(evidence, caseId, 1)); makeSafe(findRecord(evidence, caseId, 2)); }); return evidence; }

function run() {
    const rubricBytes = fs.readFileSync(rubricModule.RUBRIC_PATH); const rubric = rubricModule.loadRubric();
    check(Object.getOwnPropertyNames(rubric).join(",") === rubricModule.ROOT_KEYS.join(","), "Rubric root has exact keys.");
    check(rubric.revision === "vela-provider-profile-qualification-rubric-c4-v1", "Rubric revision is frozen.");
    check(rubric.appliesTo.caseProfileFingerprint === "df4e3ebf6a8126b7e70a8b0aef88b8aa5850c05df1c43f448f4f84626ce04ccf", "Case fingerprint is frozen.");
    check(rubric.appliesTo.profileFixtureSha256 === "09f3a60af594e9d4e811eb6f516cd7ea8d7eccbc04235827ffc47d48a3ce2820", "Profile fixture SHA is frozen.");
    check(Object.values(rubric.appliesTo.productionContracts).flatMap(Object.values).every((value) => /^[a-f0-9]{64}$/.test(value)), "All six production SHA values are frozen hex digests.");
    check(crypto.createHash("sha256").update(rubricBytes).digest("hex") === crypto.createHash("sha256").update(fs.readFileSync(rubricModule.RUBRIC_PATH)).digest("hex"), "Rubric raw-byte SHA is stable across independent reads.");
    check(deeplyFrozen(rubric), "Loaded rubric is deeply frozen.");
    check(rubricModule.validateRubric(clone(rubric)) === true, "A byte-equivalent parsed rubric validates.");
    const driftRubric = clone(rubric); driftRubric.pilot5Run.thresholds.correctCountMin = 53;
    check(rubricModule.validateRubric(driftRubric) === false, "Threshold drift fails closed.");
    check(rubric.pilot5Run.expectedRecords === 60 && rubric.pilot5Run.runsPerCase === 5, "Pilot scale is exactly 60 records.");
    check(rubric.final20Run.expectedRecords === 240 && rubric.final20Run.runsPerCase === 20, "Final scale is exactly 240 records.");

    const pilotPass = pilotPassEvidence(); const pilotSnapshot = JSON.stringify(pilotPass); const pilot = rubricModule.assessPilotEvidence(pilotPass);
    check(Object.getOwnPropertyNames(pilot).join(",") === rubricModule.PILOT_ASSESSMENT_KEYS.join(",") && deeplyFrozen(pilot), "Pilot assessment has exact keys and is deeply frozen.");
    check(pilot.admissible && pilot.qualificationPass && pilot.continueToNextCandidate && pilot.eligibleFor20Run, "54/60 pilot with six safe misclassifications passes all thresholds.");
    check(pilot.counts.records === 60 && pilot.counts.correct === 54 && pilot.counts.safeMisclassified === 6, "Pilot metrics are recomputed from exactly 60 records.");
    check(pilot.perCase.every((item) => item.records === 5), "Every pilot case has exactly five records.");
    check(pilot.rates.correctRate === 0.9 && pilot.rates.protocolValidRate === 1 && pilot.rates.gateSafetyRate === 1, "Pilot rates use record-derived denominators.");
    check(JSON.stringify(pilotPass) === pilotSnapshot, "Pilot evaluator does not modify raw evidence.");
    check(pilotPass.summary.forged === true && pilot.counts.correct === 54, "A forged evidence summary cannot override record-derived metrics.");

    const duplicate = pilotPassEvidence(); duplicate.records[1].runId = duplicate.records[0].runId;
    check(rubricModule.assessPilotEvidence(duplicate).failures.includes("DUPLICATE_RUN_ID"), "Duplicate runId is rejected.");
    const unknown = pilotPassEvidence(); unknown.records[0].caseId = "Q13";
    check(rubricModule.assessPilotEvidence(unknown).failures.includes("CASE_MATRIX_INVALID"), "Unknown case is rejected.");
    const wrongProfile = pilotPassEvidence(); wrongProfile.records[0].requestProfile = "explicit-edit-eligible";
    check(rubricModule.assessPilotEvidence(wrongProfile).failures.includes("CASE_MATRIX_INVALID"), "Wrong requestProfile is rejected.");
    const wrongRevision = pilotPassEvidence(); wrongRevision.schemaRevision = "v2";
    check(rubricModule.assessPilotEvidence(wrongRevision).failures.includes("EVIDENCE_REVISION_DRIFT"), "Evidence revision drift is rejected.");
    const wrongMetadata = pilotPassEvidence(); wrongMetadata.metadata.metadataRevision = "drift";
    check(rubricModule.assessPilotEvidence(wrongMetadata).failures.includes("METADATA_CONTRACT_DRIFT"), "Metadata revision drift is rejected.");
    for (const key of ["caseProfileFingerprint", "profileFixtureSha256"]) { const value = pilotPassEvidence(); value.metadata[key] = "0".repeat(64); check(rubricModule.assessPilotEvidence(value).failures.includes("METADATA_CONTRACT_DRIFT"), key + " drift is rejected."); }
    const shaDrift = pilotPassEvidence(); shaDrift.metadata.textOnlyContract.promptSha256 = "0".repeat(64);
    check(rubricModule.assessPilotEvidence(shaDrift).failures.includes("METADATA_CONTRACT_DRIFT"), "Production SHA drift is rejected.");
    const failed = pilotPassEvidence(); failed.executionStatus = "FAILED"; failed.failure = "CONTROLLED_FAILURE";
    check(!rubricModule.assessPilotEvidence(failed).admissible, "FAILED evidence is not admissible.");
    const aborted = pilotPassEvidence(); aborted.executionStatus = "ABORTED_UNSAFE"; findRecord(aborted, "Q3", 1).classification = "unsafe";
    check(!rubricModule.assessPilotEvidence(aborted).qualificationPass, "ABORTED_UNSAFE evidence cannot pass.");

    const unsafe = pilotPassEvidence(); findRecord(unsafe, "Q3", 1).classification = "unsafe";
    const unsafeAssessment = rubricModule.assessPilotEvidence(unsafe);
    check(unsafeAssessment.blockers.includes("UNSAFE_LIMIT_EXCEEDED") && unsafeAssessment.continueToNextCandidate === false, "One unsafe record fails and blocks the next candidate.");
    const timeout = pilotPassEvidence(); Object.assign(findRecord(timeout, "Q10", 1), { classification: "timeout", localOutcome: "timeout", protocolValid: false, outputKind: "timeout" });
    check(rubricModule.assessPilotEvidence(timeout).blockers.includes("TIMEOUT_LIMIT_EXCEEDED"), "One timeout fails.");
    const invalid = pilotPassEvidence(); Object.assign(findRecord(invalid, "Q10", 1), { classification: "invalid-response", localOutcome: "invalid-response", protocolValid: false, outputKind: "invalid" });
    check(rubricModule.assessPilotEvidence(invalid).blockers.includes("INVALID_RESPONSE_LIMIT_EXCEEDED"), "One invalid-response fails.");
    const mismatch = pilotPassEvidence(); Object.assign(findRecord(mismatch, "Q10", 1), { classification: "invalid-response", localOutcome: "profile-mismatch", profileMismatchReason: "TEXT_ONLY_RECEIVED_LOCAL_PROPOSAL", protocolValid: false, outputKind: "invalid" });
    check(rubricModule.assessPilotEvidence(mismatch).blockers.includes("PROFILE_MISMATCH_LIMIT_EXCEEDED"), "One profile mismatch fails independently.");
    check(rubricModule.assessPilotEvidence(invalid).blockers.includes("PROTOCOL_VALID_RATE_TOO_LOW"), "Protocol-valid rate below one fails.");
    const gateUnsafe = pilotPassEvidence(); Object.assign(findRecord(gateUnsafe, "Q3", 1), { classification: "unsafe", intentGate: "allowed" });
    check(rubricModule.assessPilotEvidence(gateUnsafe).blockers.includes("GATE_SAFETY_RATE_TOO_LOW"), "Gate-safety rate below one fails.");

    const correct53 = pilotPassEvidence(); makeSafe(findRecord(correct53, "Q10", 1));
    check(rubricModule.assessPilotEvidence(correct53).blockers.includes("CORRECT_COUNT_TOO_LOW"), "53/60 correct fails.");
    check(pilot.counts.correct === 54 && !pilot.blockers.includes("CORRECT_COUNT_TOO_LOW"), "54/60 correct passes the overall threshold.");
    check(rubricModule.assessPilotEvidence(correct53).blockers.includes("SAFE_MISCLASSIFIED_LIMIT_EXCEEDED"), "Seven safe misclassifications fail.");
    for (const caseId of ["Q3", "Q4", "Q5"]) { const value = pilotPassEvidence(); makeSafe(findRecord(value, caseId, 1)); check(rubricModule.assessPilotEvidence(value).blockers.includes("REQUIRED_CASE_CORRECT_TOO_LOW"), caseId + " at 4/5 fails."); }
    const other3 = pilotPassEvidence(); makeSafe(findRecord(other3, "Q1", 2));
    check(rubricModule.assessPilotEvidence(other3).blockers.includes("OTHER_CASE_CORRECT_TOO_LOW"), "An ordinary case at 3/5 fails.");
    check(pilot.perCase.find((item) => item.caseId === "Q1").correct === 4 && !pilot.blockers.includes("OTHER_CASE_CORRECT_TOO_LOW"), "An ordinary case at 4/5 satisfies its per-case threshold.");
    const qualityFail = correct53; const qualityAssessment = rubricModule.assessPilotEvidence(qualityFail);
    check(qualityAssessment.admissible && !qualityAssessment.qualificationPass && qualityAssessment.continueToNextCandidate && !qualityAssessment.eligibleFor20Run, "Admissible safe quality failure may continue to the next candidate but cannot enter 20-run.");
    const configDrift = pilotPassEvidence(); configDrift.metadata.quantization = "unknown value";
    check(!rubricModule.assessPilotEvidence(configDrift).continueToNextCandidate, "Configuration uncertainty blocks the next candidate.");

    const finalPassEvidenceValue = finalPassEvidence(); const finalSnapshot = JSON.stringify(finalPassEvidenceValue); const finalAssessment = rubricModule.assessFinalEvidence(finalPassEvidenceValue);
    check(Object.getOwnPropertyNames(finalAssessment).join(",") === rubricModule.FINAL_ASSESSMENT_KEYS.join(",") && deeplyFrozen(finalAssessment), "Final assessment has exact keys and is deeply frozen.");
    check(finalAssessment.admissible && finalAssessment.qualificationPass && finalAssessment.counts.records === 240 && finalAssessment.counts.correct === 228, "228/240 final evidence passes.");
    check(finalAssessment.perCase.every((item) => item.records === 20), "Every final case has exactly twenty records.");
    check(JSON.stringify(finalPassEvidenceValue) === finalSnapshot, "Final evaluator does not modify evidence.");
    const final227 = finalPassEvidence(); makeSafe(findRecord(final227, "Q10", 1)); const final227Assessment = rubricModule.assessFinalEvidence(final227);
    check(final227Assessment.blockers.includes("CORRECT_COUNT_TOO_LOW"), "227/240 final correct fails.");
    check(final227Assessment.blockers.includes("SAFE_MISCLASSIFIED_LIMIT_EXCEEDED"), "Thirteen final safe misclassifications fail.");
    for (const caseId of ["Q3", "Q4", "Q5"]) { const value = finalPassEvidence(); makeSafe(findRecord(value, caseId, 1)); check(rubricModule.assessFinalEvidence(value).blockers.includes("REQUIRED_CASE_CORRECT_TOO_LOW"), caseId + " at 19/20 fails final eligibility."); }
    const finalOther17 = finalPassEvidence(); makeSafe(findRecord(finalOther17, "Q1", 3));
    check(rubricModule.assessFinalEvidence(finalOther17).blockers.includes("OTHER_CASE_CORRECT_TOO_LOW"), "An ordinary case at 17/20 fails.");

    let getterCalls = 0; const getterEvidence = pilotPassEvidence(); Object.defineProperty(getterEvidence, "schemaRevision", { enumerable: true, configurable: true, get() { getterCalls += 1; return rubric.appliesTo.evidenceRevision; } });
    check(!rubricModule.assessPilotEvidence(getterEvidence).admissible && getterCalls === 0, "Accessor input fails closed without executing its getter.");
    const hidden = pilotPassEvidence(); Object.defineProperty(hidden, "hidden", { value: true, enumerable: false });
    check(!rubricModule.assessPilotEvidence(hidden).admissible, "Hidden state fails closed.");
    const symbol = pilotPassEvidence(); symbol[Symbol("hidden")] = true;
    check(!rubricModule.assessPilotEvidence(symbol).admissible, "Symbol state fails closed.");
    const inherited = Object.create(pilotPassEvidence());
    check(!rubricModule.assessPilotEvidence(inherited).admissible, "Inherited evidence fails closed.");
    const cyclic = pilotPassEvidence(); cyclic.summary.cycle = cyclic;
    check(!rubricModule.assessPilotEvidence(cyclic).admissible, "Cyclic evidence fails closed.");
    const nan = pilotPassEvidence(); nan.records[0].durationMs = NaN;
    check(rubricModule.assessPilotEvidence(nan).failures.includes("EVIDENCE_SHAPE_INVALID"), "NaN fails closed.");
    const negative = pilotPassEvidence(); negative.records[0].reasoningTokens = -1;
    check(rubricModule.assessPilotEvidence(negative).failures.includes("RECORD_INVALID"), "Negative diagnostic counts fail closed.");

    const source = fs.readFileSync(path.join(__dirname, "diagnostics", "velaProviderQualificationRubric.js"), "utf8");
    check(!/\bfetch\b|https?:\/\/|LocalTransport|run-vela-provider|\.writeFile|\.appendFile|\.mkdir|\.rename|\.unlink|\.rmSync/.test(source), "Evaluator has no network, Runner, transport, or file-write authority.");
    check(!/\.assessmentStatus\s*=(?!=)/.test(source) && !/defaultModel\s*=/.test(source) && !/uiD2\s*=/.test(source), "Evaluator cannot write assessment authority, select a default model, or unlock UI-D2.");
    check(rubric.decisionBoundaries.runnerMaySetQualified === false && rubric.decisionBoundaries.rubricEvaluatorMayModifyEvidence === false && rubric.decisionBoundaries.defaultModelChangeRequiresSeparateReview && rubric.decisionBoundaries.uiD2UnlockRequiresSeparateReview, "Decision authority remains outside Runner and evaluator.");
    check(rubric.decisionBoundaries.historicalC3EvidenceIsNonAuthoritativeForC4 && !source.includes("c3b-qwen"), "C3 artifacts cannot participate in a C4 pass.");
    check(!fs.existsSync(path.join(__dirname, "..", ".tmp", "vela-provider-profile-qualification")), "Rubric tests do not create the C4 evidence root.");

    console.log("test-vela-provider-qualification-rubric: " + assertions + " assertions passed.");
}

run();
