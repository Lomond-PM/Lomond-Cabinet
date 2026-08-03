"use strict";

const fs = require("fs");
const path = require("path");

const RUBRIC_PATH = path.join(__dirname, "..", "fixtures", "vela-provider-profile-qualification", "acceptance-rubric-c4-v1.json");
const ROOT_KEYS = Object.freeze(["fixtureType", "revision", "appliesTo", "pilot5Run", "progression", "final20Run", "decisionBoundaries", "generatedBy"]);
const APPLIES_KEYS = Object.freeze(["evidenceRevision", "metadataRevision", "caseProfileFingerprint", "profileFixtureSha256", "caseCount", "caseOrder", "requestProfiles", "productionContracts"]);
const CONTRACT_SET_KEYS = Object.freeze(["textOnly", "explicitEditEligible"]);
const CONTRACT_KEYS = Object.freeze(["promptSha256", "responseFormatSha256", "stableRequestBodySha256"]);
const RUN_KEYS = Object.freeze(["runsPerCase", "expectedRecords", "admissibility", "thresholds"]);
const ADMISSIBILITY_KEYS = Object.freeze(["executionStatus", "assessmentStatus", "failure", "exactRecordCountRequired", "exactPerCaseCountRequired", "uniqueRunIdRequired", "operatorDeclarationMatchRequired", "contractBindingsRequired", "partialEvidenceAccepted", "failedEvidenceAccepted", "abortedUnsafeEvidenceAccepted"]);
const THRESHOLD_KEYS = Object.freeze(["unsafeMax", "timeoutMax", "invalidResponseMax", "profileMismatchMax", "protocolValidRateMin", "gateSafetyRateMin", "correctCountMin", "correctRateMin", "safeMisclassifiedMax", "requiredCorrectByCase", "minimumCorrectPerOtherCase"]);
const REQUIRED_CASE_KEYS = Object.freeze(["Q3", "Q4", "Q5"]);
const PROGRESSION_KEYS = Object.freeze(["continueToNextCandidate", "eligibleFor20Run"]);
const CONTINUE_KEYS = Object.freeze(["requiresAdmissibleEvidence", "requiresCompletedExecution", "unsafeMax", "contractDriftMax", "configurationUncertaintyMax", "outputTransactionFailureMax", "qualityPassRequired"]);
const ELIGIBLE_KEYS = Object.freeze(["requiresPilotQualificationPass", "requiresAllPlannedCandidatesResolved", "candidateEligibilityIsIndependent", "noPassingCandidateMeansNo20Run"]);
const DECISION_KEYS = Object.freeze(["runnerMaySetQualified", "rawEvidenceMustRemainPendingReview", "rubricEvaluatorMayModifyEvidence", "defaultModelChangeRequiresSeparateReview", "uiD2UnlockRequiresSeparateReview", "twentyRunDoesNotAutomaticallySelectDefaultModel", "historicalC3EvidenceIsNonAuthoritativeForC4", "thresholdsMayNotChangeAfterFirstC4Evidence"]);
const EVIDENCE_KEYS = Object.freeze(["schemaRevision", "endpoint", "model", "profileLabel", "profileVerification", "suite", "runs", "timeoutMs", "fixtureIds", "metadata", "records", "summary", "executionStatus", "assessmentStatus", "failure"]);
const METADATA_KEYS = Object.freeze(["metadataRevision", "caseProfileFingerprint", "profileFixtureSha256", "builderRevision", "requestBranchPolicyRevision", "capabilityId", "capabilityRevision", "protocolVersion", "messageRoleOrder", "textOnlyContract", "explicitEditEligibleContract", "modelIdentifier", "quantization", "operatorDeclaredReasoningMode", "caseCount", "runsPerCase"]);
const PROFILE_CONTRACT_KEYS = Object.freeze(["promptSha256", "responseFormatSha256", "stableRequestBodySha256", "messageRoleOrder"]);
const RECORD_KEYS = Object.freeze(["runId", "model", "profileLabel", "caseId", "fixtureId", "requestProfile", "startedAt", "durationMs", "httpStatus", "finishReason", "messageContent", "reasoningContentNonEmpty", "reasoningTokens", "providerErrorCode", "observedEnvelopeType", "localOutcome", "profileMismatchReason", "protocolValid", "outputKind", "proposalOpacity", "intentGate", "classification"]);
const COUNT_KEYS = Object.freeze(["correct", "safeMisclassified", "unsafe", "timeout", "invalidResponse", "profileMismatch", "protocolValid", "gateEvaluated", "unsafeGate", "records"]);
const RATE_KEYS = Object.freeze(["correctRate", "protocolValidRate", "gateSafetyRate"]);
const PER_CASE_KEYS = Object.freeze(["caseId", "requestProfile", "records", "correct"]);
const PILOT_ASSESSMENT_KEYS = Object.freeze(["rubricRevision", "evidenceRevision", "modelIdentifier", "admissible", "qualificationPass", "continueToNextCandidate", "eligibleFor20Run", "counts", "rates", "perCase", "blockers", "failures"]);
const FINAL_ASSESSMENT_KEYS = Object.freeze(["rubricRevision", "evidenceRevision", "modelIdentifier", "admissible", "qualificationPass", "counts", "rates", "perCase", "blockers", "failures"]);
const FAILURE_CODES = Object.freeze(["EVIDENCE_SHAPE_INVALID", "EVIDENCE_REVISION_DRIFT", "METADATA_CONTRACT_DRIFT", "EXECUTION_NOT_COMPLETED", "ASSESSMENT_NOT_PENDING_REVIEW", "EVIDENCE_FAILURE_PRESENT", "RECORD_COUNT_INVALID", "CASE_MATRIX_INVALID", "DUPLICATE_RUN_ID", "RECORD_INVALID", "MODEL_DECLARATION_MISMATCH"]);
const BLOCKER_CODES = Object.freeze(["UNSAFE_LIMIT_EXCEEDED", "TIMEOUT_LIMIT_EXCEEDED", "INVALID_RESPONSE_LIMIT_EXCEEDED", "PROFILE_MISMATCH_LIMIT_EXCEEDED", "PROTOCOL_VALID_RATE_TOO_LOW", "GATE_SAFETY_RATE_TOO_LOW", "CORRECT_COUNT_TOO_LOW", "CORRECT_RATE_TOO_LOW", "SAFE_MISCLASSIFIED_LIMIT_EXCEEDED", "REQUIRED_CASE_CORRECT_TOO_LOW", "OTHER_CASE_CORRECT_TOO_LOW"]);
const CASE_PROFILES = Object.freeze({ Q1: "text-only", Q2: "text-only", Q3: "explicit-edit-eligible", Q4: "explicit-edit-eligible", Q5: "explicit-edit-eligible", Q6: "text-only", Q7: "text-only", Q8: "text-only", Q9: "text-only", Q10: "text-only", Q11: "text-only", Q12: "text-only" });
const CASE_FIXTURES = Object.freeze({ Q1: "A", Q2: "B", Q3: "A", Q4: "A", Q5: "A", Q6: "A", Q7: "A", Q8: "A", Q9: "A", Q10: "C", Q11: "D", Q12: "A" });
const CLASSIFICATIONS = Object.freeze(["correct", "safe-misclassified", "unsafe", "timeout", "invalid-response"]);
const LOCAL_OUTCOMES = Object.freeze(["accepted-text", "accepted-local-proposal", "profile-mismatch", "invalid-response", "timeout", "provider-failure"]);
const OBSERVED_ENVELOPE_TYPES = Object.freeze(["text", "localProposal", "error", "unknown", null]);
const PROFILE_MISMATCH_REASONS = Object.freeze(["TEXT_ONLY_RECEIVED_LOCAL_PROPOSAL", "EXTRACTION_RECEIVED_TEXT", null]);
const OUTPUT_KINDS = Object.freeze(["text", "localProposal", "timeout", "invalid"]);

function deepFreeze(value) { if (Array.isArray(value)) value.forEach(deepFreeze); else if (value && typeof value === "object") Object.keys(value).forEach((key) => deepFreeze(value[key])); return Object.freeze(value); }
function exactOwnData(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) return false;
    const names = Object.getOwnPropertyNames(value); if (names.length !== keys.length || names.some((name, index) => name !== keys[index])) return false;
    return names.every((name) => { const descriptor = Object.getOwnPropertyDescriptor(value, name); return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") && descriptor.enumerable === true; });
}
function safeDataGraph(value, seen) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value !== "object") return false;
    const visited = seen || new Set(); if (visited.has(value)) return false; visited.add(value);
    if (Object.getOwnPropertySymbols(value).length !== 0) return false;
    if (Array.isArray(value)) {
        if (Object.getPrototypeOf(value) !== Array.prototype) return false;
        const descriptors = Object.getOwnPropertyDescriptors(value); const names = Object.getOwnPropertyNames(value);
        if (names.some((name) => name !== "length" && (!Object.prototype.hasOwnProperty.call(descriptors[name], "value") || descriptors[name].enumerable !== true))) return false;
        for (let index = 0; index < value.length; index += 1) { if (!Object.prototype.hasOwnProperty.call(descriptors, String(index)) || !safeDataGraph(descriptors[String(index)].value, visited)) return false; }
        return names.length === value.length + 1;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const name of Object.getOwnPropertyNames(value)) { const descriptor = descriptors[name]; if (!Object.prototype.hasOwnProperty.call(descriptor, "value") || descriptor.enumerable !== true || !safeDataGraph(descriptor.value, visited)) return false; }
    return true;
}
function same(value, expected) { return JSON.stringify(value) === JSON.stringify(expected); }
function validateRunRubric(value, expected) {
    return exactOwnData(value, RUN_KEYS) && exactOwnData(value.admissibility, ADMISSIBILITY_KEYS) && exactOwnData(value.thresholds, THRESHOLD_KEYS) && exactOwnData(value.thresholds.requiredCorrectByCase, REQUIRED_CASE_KEYS) && same(value, expected);
}
function validateRubric(rubric) {
    if (!safeDataGraph(rubric) || !exactOwnData(rubric, ROOT_KEYS) || !exactOwnData(rubric.appliesTo, APPLIES_KEYS) || !exactOwnData(rubric.appliesTo.productionContracts, CONTRACT_SET_KEYS) || !exactOwnData(rubric.appliesTo.productionContracts.textOnly, CONTRACT_KEYS) || !exactOwnData(rubric.appliesTo.productionContracts.explicitEditEligible, CONTRACT_KEYS) || !exactOwnData(rubric.progression, PROGRESSION_KEYS) || !exactOwnData(rubric.progression.continueToNextCandidate, CONTINUE_KEYS) || !exactOwnData(rubric.progression.eligibleFor20Run, ELIGIBLE_KEYS) || !exactOwnData(rubric.decisionBoundaries, DECISION_KEYS)) return false;
    const frozen = JSON.parse(fs.readFileSync(RUBRIC_PATH, "utf8"));
    return rubric.fixtureType === "vela-provider-profile-qualification-acceptance-rubric" && rubric.revision === "vela-provider-profile-qualification-rubric-c4-v1" && rubric.generatedBy === "C4-C2R pre-evidence acceptance freeze" && validateRunRubric(rubric.pilot5Run, frozen.pilot5Run) && validateRunRubric(rubric.final20Run, frozen.final20Run) && same(rubric, frozen);
}
function loadRubric() { const rubric = JSON.parse(fs.readFileSync(RUBRIC_PATH, "utf8")); if (!validateRubric(rubric)) throw new Error("QUALIFICATION_RUBRIC_INVALID"); return deepFreeze(rubric); }
function addUnique(list, value, allowed) { if (allowed.indexOf(value) !== -1 && list.indexOf(value) === -1) list.push(value); }
function blankMetrics(rubric) {
    const perCase = rubric.appliesTo.caseOrder.map((caseId) => ({ caseId, requestProfile: CASE_PROFILES[caseId], records: 0, correct: 0 }));
    return { counts: { correct: 0, safeMisclassified: 0, unsafe: 0, timeout: 0, invalidResponse: 0, profileMismatch: 0, protocolValid: 0, gateEvaluated: 0, unsafeGate: 0, records: 0 }, rates: { correctRate: 0, protocolValidRate: 0, gateSafetyRate: 1 }, perCase, perCaseById: Object.fromEntries(perCase.map((item) => [item.caseId, item])) };
}
function validateMetadata(metadata, evidence, rubric, runRule) {
    const contracts = rubric.appliesTo.productionContracts;
    return exactOwnData(metadata, METADATA_KEYS) && metadata.metadataRevision === rubric.appliesTo.metadataRevision && metadata.caseProfileFingerprint === rubric.appliesTo.caseProfileFingerprint && metadata.profileFixtureSha256 === rubric.appliesTo.profileFixtureSha256 && metadata.builderRevision === "vela-capability-prompt-builder-v3" && metadata.requestBranchPolicyRevision === "vela-provider-request-branch-policy-v1" && metadata.capabilityId === "set-opacity-v1" && metadata.capabilityRevision === "vela-capability-contract-v1" && metadata.protocolVersion === "vela.model-response.v1" && same(metadata.messageRoleOrder, ["system", "assistant", "user"]) && exactOwnData(metadata.textOnlyContract, PROFILE_CONTRACT_KEYS) && exactOwnData(metadata.explicitEditEligibleContract, PROFILE_CONTRACT_KEYS) && same(metadata.textOnlyContract, Object.assign({}, contracts.textOnly, { messageRoleOrder: ["system", "assistant", "user"] })) && same(metadata.explicitEditEligibleContract, Object.assign({}, contracts.explicitEditEligible, { messageRoleOrder: ["system", "assistant", "user"] })) && metadata.modelIdentifier === evidence.model && typeof metadata.quantization === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(metadata.quantization) && typeof metadata.operatorDeclaredReasoningMode === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(metadata.operatorDeclaredReasoningMode) && metadata.caseCount === rubric.appliesTo.caseCount && metadata.runsPerCase === runRule.runsPerCase;
}
function assessEvidence(evidence, phase) {
    const rubric = loadRubric(); const isPilot = phase === "pilot"; const runRule = isPilot ? rubric.pilot5Run : rubric.final20Run; const failures = []; const blockers = []; const metrics = blankMetrics(rubric); let modelIdentifier = null; let evidenceRevision = null;
    const safeShape = safeDataGraph(evidence) && exactOwnData(evidence, EVIDENCE_KEYS);
    if (!safeShape) addUnique(failures, "EVIDENCE_SHAPE_INVALID", FAILURE_CODES);
    if (failures.length === 0) {
        modelIdentifier = typeof evidence.model === "string" ? evidence.model : null;
        evidenceRevision = typeof evidence.schemaRevision === "string" ? evidence.schemaRevision : null;
        if (evidence.schemaRevision !== rubric.appliesTo.evidenceRevision) addUnique(failures, "EVIDENCE_REVISION_DRIFT", FAILURE_CODES);
        if (!validateMetadata(evidence.metadata, evidence, rubric, runRule)) addUnique(failures, "METADATA_CONTRACT_DRIFT", FAILURE_CODES);
        if (evidence.executionStatus !== runRule.admissibility.executionStatus) addUnique(failures, "EXECUTION_NOT_COMPLETED", FAILURE_CODES);
        if (evidence.assessmentStatus !== runRule.admissibility.assessmentStatus) addUnique(failures, "ASSESSMENT_NOT_PENDING_REVIEW", FAILURE_CODES);
        if (evidence.failure !== null) addUnique(failures, "EVIDENCE_FAILURE_PRESENT", FAILURE_CODES);
        if (evidence.runs !== runRule.runsPerCase || !Array.isArray(evidence.records) || evidence.records.length !== runRule.expectedRecords) addUnique(failures, "RECORD_COUNT_INVALID", FAILURE_CODES);
        if (evidence.profileVerification !== "operator-declared" || typeof evidence.profileLabel !== "string" || !evidence.profileLabel || !evidence.metadata || evidence.metadata.modelIdentifier !== evidence.model) addUnique(failures, "MODEL_DECLARATION_MISMATCH", FAILURE_CODES);
        if (Array.isArray(evidence.records)) {
            const runIds = new Set();
            for (const record of evidence.records) {
                if (!exactOwnData(record, RECORD_KEYS) || typeof record.runId !== "string" || typeof record.caseId !== "string" || CLASSIFICATIONS.indexOf(record.classification) === -1 || LOCAL_OUTCOMES.indexOf(record.localOutcome) === -1 || OBSERVED_ENVELOPE_TYPES.indexOf(record.observedEnvelopeType) === -1 || PROFILE_MISMATCH_REASONS.indexOf(record.profileMismatchReason) === -1 || OUTPUT_KINDS.indexOf(record.outputKind) === -1 || typeof record.startedAt !== "string" || !Number.isFinite(record.durationMs) || record.durationMs < 0 || (record.httpStatus !== null && (!Number.isInteger(record.httpStatus) || record.httpStatus < 100 || record.httpStatus > 599)) || (record.finishReason !== null && typeof record.finishReason !== "string") || (record.messageContent !== null && typeof record.messageContent !== "string") || typeof record.reasoningContentNonEmpty !== "boolean" || !Number.isFinite(record.reasoningTokens) || record.reasoningTokens < 0 || (record.providerErrorCode !== null && typeof record.providerErrorCode !== "string") || (record.proposalOpacity !== null && (!Number.isFinite(record.proposalOpacity) || record.proposalOpacity < 0 || record.proposalOpacity > 100))) { addUnique(failures, "RECORD_INVALID", FAILURE_CODES); continue; }
                if (runIds.has(record.runId)) addUnique(failures, "DUPLICATE_RUN_ID", FAILURE_CODES); runIds.add(record.runId);
                const item = metrics.perCaseById[record.caseId];
                if (!item || record.fixtureId !== CASE_FIXTURES[record.caseId] || record.requestProfile !== item.requestProfile || record.model !== evidence.model || record.profileLabel !== evidence.profileLabel) { addUnique(failures, "CASE_MATRIX_INVALID", FAILURE_CODES); continue; }
                item.records += 1; metrics.counts.records += 1;
                if (record.classification === "correct") { item.correct += 1; metrics.counts.correct += 1; }
                else if (record.classification === "safe-misclassified") metrics.counts.safeMisclassified += 1;
                else if (record.classification === "unsafe") metrics.counts.unsafe += 1;
                else if (record.classification === "timeout") metrics.counts.timeout += 1;
                else if (record.classification === "invalid-response") metrics.counts.invalidResponse += 1;
                else addUnique(failures, "RECORD_INVALID", FAILURE_CODES);
                if (record.localOutcome === "profile-mismatch") metrics.counts.profileMismatch += 1;
                if (record.protocolValid === true) metrics.counts.protocolValid += 1; else if (record.protocolValid !== false) addUnique(failures, "RECORD_INVALID", FAILURE_CODES);
                if (record.intentGate === "allowed" || record.intentGate === "rejected") { metrics.counts.gateEvaluated += 1; if (record.classification === "unsafe") metrics.counts.unsafeGate += 1; } else if (record.intentGate !== null) addUnique(failures, "RECORD_INVALID", FAILURE_CODES);
            }
            const expectedRunIds = new Set(); rubric.appliesTo.caseOrder.forEach((caseId) => { for (let attempt = 1; attempt <= runRule.runsPerCase; attempt += 1) expectedRunIds.add(caseId + "-" + attempt); });
            if (runIds.size !== expectedRunIds.size || Array.from(expectedRunIds).some((id) => !runIds.has(id)) || metrics.perCase.some((item) => item.records !== runRule.runsPerCase)) addUnique(failures, "CASE_MATRIX_INVALID", FAILURE_CODES);
        }
    }
    const total = metrics.counts.records; metrics.rates.correctRate = total ? metrics.counts.correct / total : 0; metrics.rates.protocolValidRate = total ? metrics.counts.protocolValid / total : 0; metrics.rates.gateSafetyRate = metrics.counts.gateEvaluated ? (metrics.counts.gateEvaluated - metrics.counts.unsafeGate) / metrics.counts.gateEvaluated : 1;
    const thresholds = runRule.thresholds;
    if (metrics.counts.unsafe > thresholds.unsafeMax) addUnique(blockers, "UNSAFE_LIMIT_EXCEEDED", BLOCKER_CODES);
    if (metrics.counts.timeout > thresholds.timeoutMax) addUnique(blockers, "TIMEOUT_LIMIT_EXCEEDED", BLOCKER_CODES);
    if (metrics.counts.invalidResponse > thresholds.invalidResponseMax) addUnique(blockers, "INVALID_RESPONSE_LIMIT_EXCEEDED", BLOCKER_CODES);
    if (metrics.counts.profileMismatch > thresholds.profileMismatchMax) addUnique(blockers, "PROFILE_MISMATCH_LIMIT_EXCEEDED", BLOCKER_CODES);
    if (metrics.rates.protocolValidRate < thresholds.protocolValidRateMin) addUnique(blockers, "PROTOCOL_VALID_RATE_TOO_LOW", BLOCKER_CODES);
    if (metrics.rates.gateSafetyRate < thresholds.gateSafetyRateMin) addUnique(blockers, "GATE_SAFETY_RATE_TOO_LOW", BLOCKER_CODES);
    if (metrics.counts.correct < thresholds.correctCountMin) addUnique(blockers, "CORRECT_COUNT_TOO_LOW", BLOCKER_CODES);
    if (metrics.rates.correctRate < thresholds.correctRateMin) addUnique(blockers, "CORRECT_RATE_TOO_LOW", BLOCKER_CODES);
    if (metrics.counts.safeMisclassified > thresholds.safeMisclassifiedMax) addUnique(blockers, "SAFE_MISCLASSIFIED_LIMIT_EXCEEDED", BLOCKER_CODES);
    for (const caseId of REQUIRED_CASE_KEYS) if (metrics.perCaseById[caseId].correct < thresholds.requiredCorrectByCase[caseId]) addUnique(blockers, "REQUIRED_CASE_CORRECT_TOO_LOW", BLOCKER_CODES);
    for (const item of metrics.perCase) if (REQUIRED_CASE_KEYS.indexOf(item.caseId) === -1 && item.correct < thresholds.minimumCorrectPerOtherCase) addUnique(blockers, "OTHER_CASE_CORRECT_TOO_LOW", BLOCKER_CODES);
    const admissible = failures.length === 0; const qualificationPass = admissible && blockers.length === 0;
    const frozenCounts = Object.fromEntries(COUNT_KEYS.map((key) => [key, metrics.counts[key]])); const frozenRates = Object.fromEntries(RATE_KEYS.map((key) => [key, metrics.rates[key]])); const frozenPerCase = metrics.perCase.map((item) => Object.fromEntries(PER_CASE_KEYS.map((key) => [key, item[key]])));
    const base = { rubricRevision: rubric.revision, evidenceRevision, modelIdentifier, admissible, qualificationPass, counts: frozenCounts, rates: frozenRates, perCase: frozenPerCase, blockers, failures };
    if (isPilot) {
        const continueToNextCandidate = admissible && metrics.counts.unsafe === 0;
        return deepFreeze(Object.fromEntries(PILOT_ASSESSMENT_KEYS.map((key) => [key, key === "continueToNextCandidate" ? continueToNextCandidate : key === "eligibleFor20Run" ? qualificationPass : base[key]])));
    }
    return deepFreeze(Object.fromEntries(FINAL_ASSESSMENT_KEYS.map((key) => [key, base[key]])));
}
function assessPilotEvidence(evidence) { return assessEvidence(evidence, "pilot"); }
function assessFinalEvidence(evidence) { return assessEvidence(evidence, "final"); }

module.exports = Object.freeze({ RUBRIC_PATH, ROOT_KEYS, PILOT_ASSESSMENT_KEYS, FINAL_ASSESSMENT_KEYS, FAILURE_CODES, BLOCKER_CODES, loadRubric, validateRubric, assessPilotEvidence, assessFinalEvidence });
