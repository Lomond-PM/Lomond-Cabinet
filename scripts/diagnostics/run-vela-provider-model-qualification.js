#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const qualification = require("./velaProviderModelQualification");

const RECORD_KEYS = Object.freeze(["runId", "model", "profileLabel", "caseId", "fixtureId", "requestProfile", "startedAt", "durationMs", "httpStatus", "finishReason", "messageContent", "reasoningContentNonEmpty", "reasoningTokens", "providerErrorCode", "observedEnvelopeType", "localOutcome", "profileMismatchReason", "protocolValid", "outputKind", "proposalOpacity", "intentGate", "classification"]);
const EVIDENCE_KEYS = Object.freeze(["schemaRevision", "endpoint", "model", "profileLabel", "profileVerification", "suite", "runs", "timeoutMs", "fixtureIds", "metadata", "records", "summary", "executionStatus", "assessmentStatus", "failure"]);
const METADATA_KEYS = Object.freeze(["metadataRevision", "caseProfileFingerprint", "profileFixtureSha256", "builderRevision", "requestBranchPolicyRevision", "capabilityId", "capabilityRevision", "protocolVersion", "messageRoleOrder", "textOnlyContract", "explicitEditEligibleContract", "modelIdentifier", "quantization", "operatorDeclaredReasoningMode", "caseCount", "runsPerCase"]);
const LOCAL_OUTCOMES = Object.freeze(["accepted-text", "accepted-local-proposal", "profile-mismatch", "invalid-response", "timeout", "provider-failure"]);
const OBSERVED_ENVELOPE_TYPES = Object.freeze(["text", "localProposal", "error", "unknown", null]);
const PROFILE_MISMATCH_REASONS = Object.freeze(["TEXT_ONLY_RECEIVED_LOCAL_PROPOSAL", "EXTRACTION_RECEIVED_TEXT", null]);
const PROFILE_CONTRACT_KEYS = Object.freeze(["promptSha256", "responseFormatSha256", "stableRequestBodySha256", "messageRoleOrder"]);
const FROZEN_PROFILE_CONTRACTS = deepFreeze({
    textOnly: {
        promptSha256: "cc9aa49f440748db2fc08d900b5c5ad1fdd6fd75f6d79aab9139e26d16450476",
        responseFormatSha256: "85813dd8950079ab9c9542612aa0ad14b82c98e3f3e71f3a370561669e64cdf8",
        stableRequestBodySha256: "208e84b1898f38b98f9a16785ab0a10e6c200551d0193b5b0037f968385a3d54",
        messageRoleOrder: ["system", "assistant", "user"]
    },
    explicitEditEligible: {
        promptSha256: "32d55e4db60f7273c00c51004338e59dca14565643561b20420484b9ccd1bb69",
        responseFormatSha256: "509230d09996e81eb3d4baddd332f3730707badd37d6b4d28b4499b6e6ca6b2f",
        stableRequestBodySha256: "953962fb5b390831287a05b2d72811c6f2d474016766dba40209b8aceb5f4a83",
        messageRoleOrder: ["system", "assistant", "user"]
    }
});

function runtime() { return { setTimeout, clearTimeout, createAbortController() { const controller = new AbortController(); return { signal: controller.signal, abort() { controller.abort(); } }; }, parseUrl(value) { const url = new URL(value); return { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, username: url.username, password: url.password, search: url.search, hash: url.hash, href: url.href }; }, nowMs() { return Date.now(); } }; }
function deepFreeze(value) { if (Array.isArray(value)) value.forEach(deepFreeze); else if (value && typeof value === "object") Object.keys(value).forEach((key) => deepFreeze(value[key])); return Object.freeze(value); }
function exactOwnData(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0 || Object.getOwnPropertyNames(value).join("|") !== keys.join("|")) return false;
    return keys.every((key) => { const descriptor = Object.getOwnPropertyDescriptor(value, key); return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") && descriptor.enumerable === true; });
}
function localError(code, message) { const error = new Error(message || code); error.code = code; return error; }
function boundedFailureCode(error) { const code = error && typeof error.code === "string" ? error.code : "DIAGNOSTIC_RUN_FAILED"; return /^[A-Z0-9_]{1,64}$/.test(code) ? code : "DIAGNOSTIC_RUN_FAILED"; }
async function captureBoundedResponse(response, ceiling) {
    let clone;
    try { clone = response && typeof response.clone === "function" ? response.clone() : null; } catch (error) { return Object.freeze({ text: null, oversized: false }); }
    if (!clone || !clone.body || typeof clone.body.getReader !== "function") return Object.freeze({ text: null, oversized: false });
    const reader = clone.body.getReader(); const decoder = new TextDecoder(); let total = 0; let text = "";
    try {
        while (true) {
            const part = await reader.read();
            if (!part || part.done === true) break;
            if (!(part.value instanceof Uint8Array)) return Object.freeze({ text: null, oversized: false });
            total += part.value.byteLength;
            if (total > ceiling) {
                try { if (typeof reader.cancel === "function") await reader.cancel(); } catch (error) { /* bounded observation is already terminal */ }
                return Object.freeze({ text: null, oversized: true });
            }
            text += decoder.decode(part.value, { stream: true });
        }
        text += decoder.decode();
        return Object.freeze({ text, oversized: false });
    } catch (error) { return Object.freeze({ text: null, oversized: false }); }
}
function responseFacts(rawText, status) {
    const empty = { httpStatus: Number.isInteger(status) ? status : null, finishReason: null, messageContent: null, reasoningContentNonEmpty: false, reasoningTokens: 0, observedEnvelopeType: null };
    if (typeof rawText !== "string") return empty;
    try {
        const wrapper = JSON.parse(rawText); const choice = wrapper && Array.isArray(wrapper.choices) ? wrapper.choices[0] : null; const message = choice && choice.message ? choice.message : {}; const usage = wrapper && wrapper.usage ? wrapper.usage : {}; const details = usage.completion_tokens_details || {};
        let observedEnvelopeType = "unknown";
        if (typeof message.content === "string") {
            try {
                const canonical = JSON.parse(message.content); const type = canonical && canonical.envelope && canonical.envelope.type;
                observedEnvelopeType = type === "text" || type === "localProposal" || type === "error" ? type : "unknown";
            } catch (error) { observedEnvelopeType = "unknown"; }
        }
        return { httpStatus: empty.httpStatus, finishReason: choice && typeof choice.finish_reason === "string" ? choice.finish_reason : null, messageContent: typeof message.content === "string" ? message.content : null, reasoningContentNonEmpty: typeof message.reasoning_content === "string" && message.reasoning_content.length > 0, reasoningTokens: Number.isFinite(details.reasoning_tokens) ? details.reasoning_tokens : 0, observedEnvelopeType };
    } catch (error) { return Object.assign({}, empty, { observedEnvelopeType: "unknown" }); }
}
async function oneRun(protocol, args, caseDef, attempt, dependencies) {
    const deps = dependencies || {}; const fetchImpl = deps.fetch || fetch; const evaluateGate = deps.evaluateIntentGate || qualification.evaluateIntentGate;
    if (qualification.PROFILE_CASES.indexOf(caseDef) === -1) throw localError("QUALIFICATION_CONTRACT_DRIFT");
    const fixture = qualification.FIXTURES[caseDef.fixtureId]; const observed = { responseStatus: null, capture: Promise.resolve(Object.freeze({ text: null, oversized: false })), startedAt: new Date().toISOString() };
    const transport = qualification.transportModule.createLocalTransport({ protocol, fetch: async (url, options) => {
        if (url !== qualification.ENDPOINT) throw localError("QUALIFICATION_ENDPOINT_DRIFT");
        const response = await fetchImpl(url, options); observed.responseStatus = response && response.status;
        observed.capture = captureBoundedResponse(response, protocol.HARD_LIMITS.maxResponseJsonBytes);
        return response;
    }, TextDecoder });
    const providerOptions = { protocol, transport, runtime: runtime(), endpoint: qualification.ENDPOINT, model: args.model, requestProfile: caseDef.requestProfile, timeoutMs: args.timeout, responseFormatMode: "json-schema" };
    const provider = qualification.providerAdapterModule.createLocalOpenAICompatibleProvider(providerOptions);
    const started = provider.start({ messages: [{ role: "assistant", content: qualification.contextText(fixture) }, { role: "user", content: caseDef.message }], context: { contextId: "qualification-" + fixture.id + "-" + attempt, fingerprint: "sha256:" + "a".repeat(64), tier: 1 } });
    const began = Date.now(); const output = await started.promise; const durationMs = Date.now() - began; const capture = await observed.capture; const facts = responseFacts(capture.oversized ? null : capture.text, observed.responseStatus);
    const envelope = output && output.envelope; const providerErrorCode = envelope && envelope.type === "error" && typeof envelope.error.code === "string" ? envelope.error.code : null;
    let result = { kind: "invalid" }; let localOutcome = "provider-failure"; let mismatchReason = null;
    if (providerErrorCode === protocol.ERROR_CODES.PROVIDER_TIMEOUT) { result = { kind: "timeout" }; localOutcome = "timeout"; }
    else if (envelope && envelope.type === "text") { result = { kind: "text", text: envelope.text }; localOutcome = "accepted-text"; }
    else if (envelope && envelope.type === "localProposal") { result = { kind: "localProposal", capabilityId: envelope.proposal.capabilityId, opacity: envelope.proposal.params.opacity }; localOutcome = "accepted-local-proposal"; }
    else if (providerErrorCode === protocol.ERROR_CODES.PROVIDER_RESPONSE_INVALID) {
        localOutcome = "invalid-response";
        if (caseDef.requestProfile === "text-only" && facts.observedEnvelopeType === "localProposal") { localOutcome = "profile-mismatch"; mismatchReason = "TEXT_ONLY_RECEIVED_LOCAL_PROPOSAL"; }
        if (caseDef.requestProfile === "explicit-edit-eligible" && facts.observedEnvelopeType === "text") { localOutcome = "profile-mismatch"; mismatchReason = "EXTRACTION_RECEIVED_TEXT"; }
    }
    let gate = null;
    if (caseDef.requestProfile === "explicit-edit-eligible" && result.kind === "localProposal") gate = evaluateGate(caseDef, result);
    const classification = qualification.classifyProfileCase(caseDef, result, gate);
    return deepFreeze({
        runId: caseDef.id + "-" + attempt, model: args.model, profileLabel: args.profileLabel, caseId: caseDef.id, fixtureId: fixture.id, requestProfile: caseDef.requestProfile,
        startedAt: observed.startedAt, durationMs, httpStatus: facts.httpStatus, finishReason: facts.finishReason, messageContent: facts.messageContent,
        reasoningContentNonEmpty: facts.reasoningContentNonEmpty, reasoningTokens: facts.reasoningTokens, providerErrorCode, observedEnvelopeType: facts.observedEnvelopeType,
        localOutcome, profileMismatchReason: mismatchReason, protocolValid: result.kind === "text" || result.kind === "localProposal",
        outputKind: result.kind, proposalOpacity: result.kind === "localProposal" ? result.opacity : null, intentGate: gate === null ? null : gate.allowed === true ? "allowed" : "rejected", classification
    });
}
function assertDirectory(fsModule, directory) {
    let entry;
    try { entry = fsModule.lstatSync(directory); } catch (error) {
        if (!error || error.code !== "ENOENT") throw error;
        fsModule.mkdirSync(directory); entry = fsModule.lstatSync(directory);
    }
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw localError("QUALIFICATION_OUTPUT_PATH_UNSAFE", "Qualification output path contains a symbolic link, junction, or non-directory.");
}
function assertRealContainment(fsModule, policy) {
    const rootReal = fsModule.realpathSync(policy.repositoryRoot); const outputReal = fsModule.realpathSync(policy.outputRoot); const relative = path.relative(rootReal, outputReal);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw localError("QUALIFICATION_OUTPUT_PATH_UNSAFE", "Qualification output directory resolves outside the repository.");
}
function reservePartialOutput(fsModule, output, pathOptions) {
    const policy = qualification.profileOutputPolicy(pathOptions); assertDirectory(fsModule, policy.repositoryRoot); assertDirectory(fsModule, path.join(policy.repositoryRoot, ".tmp")); assertDirectory(fsModule, policy.outputRoot); assertRealContainment(fsModule, policy);
    const partial = output + ".partial";
    if (fsModule.existsSync(output)) throw localError("QUALIFICATION_OUTPUT_EXISTS");
    if (fsModule.existsSync(partial)) throw localError("QUALIFICATION_PARTIAL_EXISTS");
    let handle;
    try { handle = fsModule.openSync(partial, "wx"); } catch (error) {
        if (error && error.code === "EEXIST") throw localError("QUALIFICATION_PARTIAL_EXISTS");
        throw error;
    }
    return Object.freeze({ output, partial, handle });
}
function validateProfileQualificationMetadata(metadata, args) {
    if (!exactOwnData(metadata, METADATA_KEYS) || metadata.metadataRevision !== qualification.PROFILE_METADATA_REVISION || metadata.caseProfileFingerprint !== qualification.PROFILE_CASE_FINGERPRINT || metadata.profileFixtureSha256 !== qualification.PROFILE_FIXTURE_SHA256 || metadata.builderRevision !== "vela-capability-prompt-builder-v3" || metadata.requestBranchPolicyRevision !== "vela-provider-request-branch-policy-v1" || metadata.capabilityId !== "set-opacity-v1" || metadata.capabilityRevision !== "vela-capability-contract-v1" || metadata.protocolVersion !== "vela.model-response.v1" || JSON.stringify(metadata.messageRoleOrder) !== JSON.stringify(["system", "assistant", "user"]) || metadata.caseCount !== qualification.PROFILE_CASES.length || metadata.runsPerCase !== args.runs || metadata.modelIdentifier !== args.model || metadata.quantization !== args.quantization || metadata.operatorDeclaredReasoningMode !== args.reasoningMode) throw localError("QUALIFICATION_CONTRACT_DRIFT");
    if (!exactOwnData(metadata.textOnlyContract, PROFILE_CONTRACT_KEYS) || !exactOwnData(metadata.explicitEditEligibleContract, PROFILE_CONTRACT_KEYS) || JSON.stringify(metadata.textOnlyContract) !== JSON.stringify(FROZEN_PROFILE_CONTRACTS.textOnly) || JSON.stringify(metadata.explicitEditEligibleContract) !== JSON.stringify(FROZEN_PROFILE_CONTRACTS.explicitEditEligible)) throw localError("QUALIFICATION_CONTRACT_DRIFT");
    return metadata;
}
function validateEvidence(run) {
    if (!exactOwnData(run, EVIDENCE_KEYS) || run.schemaRevision !== qualification.PROFILE_EVIDENCE_REVISION || run.assessmentStatus !== qualification.ASSESSMENT_STATUSES.PENDING_REVIEW || !Array.isArray(run.records) || run.records.length > qualification.PROFILE_CASES.length * run.runs) throw localError("QUALIFICATION_EVIDENCE_INVALID");
    run.records.forEach((record) => {
        if (!exactOwnData(record, RECORD_KEYS) || LOCAL_OUTCOMES.indexOf(record.localOutcome) === -1 || OBSERVED_ENVELOPE_TYPES.indexOf(record.observedEnvelopeType) === -1 || PROFILE_MISMATCH_REASONS.indexOf(record.profileMismatchReason) === -1) throw localError("QUALIFICATION_EVIDENCE_INVALID");
    });
}
function finalizeEvidence(fsModule, reservation, run) {
    validateEvidence(run);
    let serialized;
    try { serialized = JSON.stringify(run, null, 2) + "\n"; } catch (error) { throw localError("QUALIFICATION_EVIDENCE_SERIALIZE_FAILED"); }
    if (!serialized || Buffer.byteLength(serialized, "utf8") > 8 * 1024 * 1024) throw localError("QUALIFICATION_EVIDENCE_SERIALIZE_FAILED");
    let closed = false;
    try {
        fsModule.writeFileSync(reservation.handle, serialized, "utf8");
        fsModule.fsyncSync(reservation.handle);
        fsModule.closeSync(reservation.handle); closed = true;
        if (fsModule.existsSync(reservation.output)) throw localError("QUALIFICATION_OUTPUT_EXISTS");
        fsModule.renameSync(reservation.partial, reservation.output);
    } catch (error) {
        if (!closed) { try { fsModule.closeSync(reservation.handle); } catch (closeError) { /* forensic partial remains */ } }
        if (error && /^QUALIFICATION_/.test(String(error.code || ""))) throw error;
        const operation = !closed ? "QUALIFICATION_EVIDENCE_WRITE_FAILED" : "QUALIFICATION_EVIDENCE_FINALIZE_FAILED";
        throw localError(operation);
    }
}
async function executeQualification(args, dependencies) {
    const deps = dependencies || {}; const fsModule = deps.fs || fs; const runOneImpl = deps.runOne || oneRun; const metadataFactory = deps.profileQualificationMetadata || qualification.profileQualificationMetadata;
    const metadata = validateProfileQualificationMetadata(await metadataFactory(args, deps.metadataOptions), args);
    const output = qualification.assertProfileOutputPath(args.output, deps.pathOptions);
    const reserve = deps.reservePartialOutput || reservePartialOutput; const reservation = reserve(fsModule, output, deps.pathOptions);
    const protocol = qualification.createProtocol(); const records = []; let executionStatus = qualification.EXECUTION_STATUSES.COMPLETED; let failure = null;
    try {
        outer: for (const caseDef of qualification.PROFILE_CASES) {
            for (let attempt = 1; attempt <= args.runs; attempt += 1) {
                const record = await runOneImpl(protocol, args, caseDef, attempt, deps); records.push(record);
                if (record.classification === "unsafe") { executionStatus = qualification.EXECUTION_STATUSES.ABORTED_UNSAFE; break outer; }
            }
        }
    } catch (error) { executionStatus = qualification.EXECUTION_STATUSES.FAILED; failure = boundedFailureCode(error); }
    const summary = qualification.summarizeProfileRecords(records); const statuses = qualification.createRunStatus(executionStatus);
    const run = deepFreeze({ schemaRevision: qualification.PROFILE_EVIDENCE_REVISION, endpoint: qualification.ENDPOINT, model: args.model, profileLabel: args.profileLabel, profileVerification: "operator-declared", suite: args.suite, runs: args.runs, timeoutMs: args.timeout, fixtureIds: Object.keys(qualification.FIXTURES), metadata, records: records.slice(), summary, executionStatus: statuses.executionStatus, assessmentStatus: statuses.assessmentStatus, failure });
    finalizeEvidence(fsModule, reservation, run);
    return deepFreeze({ output, run, exitCode: executionStatus === qualification.EXECUTION_STATUSES.ABORTED_UNSAFE ? 2 : executionStatus === qualification.EXECUTION_STATUSES.FAILED ? 1 : 0 });
}
async function main(argv) {
    const args = qualification.parseProfileArgs(argv || process.argv.slice(2));
    process.stdout.write("Confirm that the LM Studio loaded model and Thinking/Profile state match --profile-label. The label is an operator declaration only.\n");
    const result = await executeQualification(args);
    process.stdout.write("Wrote qualification data to " + result.output + "\n");
    if (result.exitCode === 2) process.stderr.write("Unsafe result detected; qualification stopped.\n");
    if (result.exitCode === 1) process.stderr.write("Diagnostic run failed after writing bounded failure evidence.\n");
    process.exitCode = result.exitCode;
}
if (require.main === module) main().catch((error) => { process.stderr.write("Qualification diagnostic failed: " + (error && error.code ? error.code : String(error)) + "\n"); process.exitCode = 1; });
module.exports = Object.freeze({ RECORD_KEYS, EVIDENCE_KEYS, METADATA_KEYS, LOCAL_OUTCOMES, OBSERVED_ENVELOPE_TYPES, PROFILE_MISMATCH_REASONS, captureBoundedResponse, responseFacts, oneRun, reservePartialOutput, validateProfileQualificationMetadata, finalizeEvidence, executeQualification, main });
