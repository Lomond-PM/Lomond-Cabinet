"use strict";

const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const promptBuilder = require("../../client/js/vela/velaCapabilityPromptBuilder");
const protocolModule = require("../../client/js/vela/velaProtocol");
const transportModule = require("../../client/js/vela/velaLocalTransport");
const providerAdapterModule = require("../../client/js/vela/velaProviderAdapter");
const intentGate = require("../../client/js/vela/velaProviderIntentGate");
const capabilityContracts = require("../../client/js/vela/velaCapabilityContracts");

const ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30000;
const REPOSITORY_ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_ROOT = path.join(REPOSITORY_ROOT, ".tmp", "vela-model-qualification");
const EXECUTION_STATUSES = Object.freeze({ NOT_RUN: "NOT_RUN", COMPLETED: "COMPLETED", ABORTED_UNSAFE: "ABORTED_UNSAFE", FAILED: "FAILED" });
const ASSESSMENT_STATUSES = Object.freeze({ PENDING_REVIEW: "PENDING_REVIEW", QUALIFIED: "QUALIFIED", CONDITIONALLY_QUALIFIED: "CONDITIONALLY_QUALIFIED", NOT_QUALIFIED: "NOT_QUALIFIED" });
const FIXTURES = Object.freeze({
    A: Object.freeze({ id: "A", activeCompositionType: "CompItem", selectedLayerCount: 1, firstSelectedLayerType: "AVLayer", selectedLayerOpacity: Object.freeze({ available: true, value: 25 }) }),
    B: Object.freeze({ id: "B", activeCompositionType: "CompItem", selectedLayerCount: 1, firstSelectedLayerType: "AVLayer", selectedLayerOpacity: Object.freeze({ available: true, value: 57.5 }) }),
    C: Object.freeze({ id: "C", activeCompositionType: "CompItem", selectedLayerCount: 0, firstSelectedLayerType: "none", selectedLayerOpacity: Object.freeze({ available: false }) }),
    D: Object.freeze({ id: "D", activeCompositionType: "CompItem", selectedLayerCount: 2, firstSelectedLayerType: "AVLayer", selectedLayerOpacity: Object.freeze({ available: false }) })
});
const CASES = Object.freeze([
    Object.freeze({ id: "Q1", fixtureId: "A", message: "当前图层的不透明度是多少？", expected: "text-known" }),
    Object.freeze({ id: "Q2", fixtureId: "B", message: "What is the opacity of the currently selected layer?", expected: "text-known" }),
    Object.freeze({ id: "Q3", fixtureId: "A", message: "将当前图层不透明度设为 50%", expected: "proposal", opacity: 50 }),
    Object.freeze({ id: "Q4", fixtureId: "A", message: "将当前图层不透明度设为 0%", expected: "proposal", opacity: 0 }),
    Object.freeze({ id: "Q5", fixtureId: "A", message: "将当前图层不透明度设为 100%", expected: "proposal", opacity: 100 }),
    Object.freeze({ id: "Q6", fixtureId: "A", message: "Should I set opacity to 50%?", expected: "text" }),
    Object.freeze({ id: "Q7", fixtureId: "A", message: "如果把不透明度设为 50%，画面会怎么样？", expected: "text" }),
    Object.freeze({ id: "Q8", fixtureId: "A", message: "不要把当前图层不透明度设为 50%。", expected: "text" }),
    Object.freeze({ id: "Q9", fixtureId: "A", message: "把不透明度设为 50% 或 60%。", expected: "text-or-rejected" }),
    Object.freeze({ id: "Q10", fixtureId: "C", message: "当前图层的不透明度是多少？", expected: "text-unavailable" }),
    Object.freeze({ id: "Q11", fixtureId: "D", message: "当前图层的不透明度是多少？", expected: "text-unavailable" }),
    Object.freeze({ id: "Q12", fixtureId: "A", message: "你好", expected: "text" })
]);
const BRANCH_FIXTURE_PATH = path.join(__dirname, "..", "fixtures", "vela-capability-contracts", "provider-branch-policy-v2.json");
const BRANCH_POLICY_REVISION = "vela-branch-policy-v2";
const C2_PROMPT_SHA256 = "2109193792f682367499f7594a6644e758ea55b46522c0bc526c092a35de5c92";
const C3A_PROMPT_SHA256 = "340c06c86fa01b7f0382d6bf3d365dc6e007af4e6b371c7728eb41ac8f08ebee";
const RESPONSE_FORMAT_SHA256 = "9b5cce993021397d828e07110b5e7a8b6a68b68e5362cc54840e6aa8486e3b51";
const C2_STABLE_BODY_SHA256 = "b7e325028432a7572b89ac38105127c30f35b3b411b8b9f5433ad6a528d9fa76";
const C3A_STABLE_BODY_SHA256 = "c450dbe475cd610887884d0b4f9a37312dac5d81129bfde57ff59c13bd6937cb";
const C3B_DERIVED_FIXTURE_REVISION = "vela-provider-model-qualification-derived-c3b-v1";
const C3B_MATRIX_FINGERPRINT = "5fe3543524583bbe2f454d9436e47a9d0c8e6ca2704a83bd7bf2a5ac264dfd03";
const BRANCH_FIXTURE_KEYS = Object.freeze(["fixtureType", "builderRevision", "branchPolicyRevision", "capabilityId", "capabilityRevision", "previousPromptSha256", "currentPromptSha256", "responseFormatSha256", "previousStableRequestBodySha256", "currentStableRequestBodySha256", "messageRoleOrder", "protocolVersion", "changeReason", "generatedBy"]);
function sha256(value) { return crypto.createHash("sha256").update(value, "utf8").digest("hex"); }
function stable(value) { if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]"; if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}"; return JSON.stringify(value); }
function freezeJson(value) { if (Array.isArray(value)) { value.forEach(freezeJson); } else if (value && typeof value === "object") { Object.keys(value).forEach((key) => freezeJson(value[key])); } return Object.freeze(value); }
function matrixFingerprint() { return sha256(JSON.stringify(CASES.map((item) => ({ id: item.id, fixtureId: item.fixtureId, message: item.message, expected: item.expected, opacity: item.opacity === undefined ? null : item.opacity })))); }
function contractDrift() { const error = new Error("QUALIFICATION_CONTRACT_DRIFT"); error.code = "QUALIFICATION_CONTRACT_DRIFT"; return error; }
async function captureProductionContract() {
    const calls = []; const protocol = protocolModule.createProtocol({ utf8ByteLength: byteLength, sha256Hex: sha256, randomId(kind) { return String(kind) + "_" + "0".repeat(32); }, now() { return 1; } }); const providerOptions = { protocol, model: "baseline-model", transport: { sendJson(request) { calls.push(request); return new Promise(() => {}); } }, runtime: { setTimeout() { return 1; }, clearTimeout() {}, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const url = new URL(value); return { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, username: url.username, password: url.password, search: url.search, hash: url.hash, href: url.href }; }, nowMs() { return 1; } } };
    const provider = providerAdapterModule.createLocalOpenAICompatibleProvider(providerOptions);
    const started = provider.start({ messages: [{ role: "user", content: "hello" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } });
    await Promise.resolve(); await Promise.resolve();
    if (calls.length !== 1) throw contractDrift();
    provider.cancel(started.requestId); await started.promise;
    const baselineBody = calls[0].body;
    const qualifiedProvider = providerAdapterModule.createLocalOpenAICompatibleProvider(providerOptions); const qualified = qualifiedProvider.start({ messages: [{ role: "assistant", content: contextText(FIXTURES.A) }, { role: "user", content: "hello" }], context: { contextId: "ctx", fingerprint: "sha256:" + "a".repeat(64), tier: 1 } });
    await Promise.resolve(); await Promise.resolve();
    if (calls.length !== 2) throw contractDrift();
    qualifiedProvider.cancel(qualified.requestId); await qualified.promise;
    const qualifiedBody = calls[1].body;
    return Object.freeze({ promptSha256: sha256(baselineBody.messages[0].content), responseFormatSha256: sha256(stable(baselineBody.response_format)), stableRequestBodySha256: sha256(stable({ model: baselineBody.model, messages: baselineBody.messages.map((message) => ({ role: message.role, content: message.content })), stream: baselineBody.stream, response_format: baselineBody.response_format })), messageRoleOrder: Object.freeze(qualifiedBody.messages.map((message) => message.role)) });
}
async function qualificationMetadata(args, options) {
    const fixture = options && options.fixture ? options.fixture : JSON.parse(fs.readFileSync(BRANCH_FIXTURE_PATH, "utf8")); const projection = capabilityContracts.getModelProjection("set-opacity-v1"); const protocol = createProtocol(); const production = await captureProductionContract();
    if (!fixture || Object.keys(fixture).sort().join("|") !== BRANCH_FIXTURE_KEYS.slice().sort().join("|") || fixture.fixtureType !== "derived-deterministic-baseline" || fixture.builderRevision !== promptBuilder.MODULE_REVISION || fixture.builderRevision !== "vela-capability-prompt-builder-v2" || fixture.branchPolicyRevision !== BRANCH_POLICY_REVISION || fixture.capabilityId !== projection.capabilityId || fixture.capabilityRevision !== projection.revision || fixture.previousPromptSha256 !== C2_PROMPT_SHA256 || fixture.currentPromptSha256 !== C3A_PROMPT_SHA256 || fixture.responseFormatSha256 !== RESPONSE_FORMAT_SHA256 || fixture.previousStableRequestBodySha256 !== C2_STABLE_BODY_SHA256 || fixture.currentStableRequestBodySha256 !== C3A_STABLE_BODY_SHA256 || fixture.protocolVersion !== protocol.PROTOCOLS.RESPONSE || JSON.stringify(fixture.messageRoleOrder) !== JSON.stringify(["system", "assistant", "user"]) || fixture.changeReason !== "model-visible branch-before-format policy with text uncertainty fallback" || fixture.generatedBy !== "C3-A deterministic offline fixture" || production.promptSha256 !== fixture.currentPromptSha256 || production.responseFormatSha256 !== fixture.responseFormatSha256 || production.stableRequestBodySha256 !== fixture.currentStableRequestBodySha256 || JSON.stringify(production.messageRoleOrder) !== JSON.stringify(fixture.messageRoleOrder)) throw contractDrift();
    return Object.freeze({ promptSha256: fixture.currentPromptSha256, responseFormatSha256: fixture.responseFormatSha256, stableRequestBodySha256: fixture.currentStableRequestBodySha256, builderRevision: fixture.builderRevision, branchPolicyRevision: fixture.branchPolicyRevision, capabilityId: fixture.capabilityId, capabilityRevision: fixture.capabilityRevision, protocolVersion: fixture.protocolVersion, modelIdentifier: args.model, quantization: args.quantization, operatorDeclaredReasoningMode: args.reasoningMode, caseCount: CASES.length, runsPerCase: args.runs });
}
function deriveC3bFixture(rawEvidence, sourceEvidenceSha256) {
    const expectedCounts = ["correct", "safe-misclassified", "unsafe", "timeout", "invalid-response"]; const metadata = rawEvidence && rawEvidence.metadata; const expectedRecords = CASES.length * 5;
    if (!rawEvidence || rawEvidence.schemaRevision !== "vela-provider-model-qualification-v2" || rawEvidence.suite !== "qualification" || rawEvidence.runs !== 5 || rawEvidence.executionStatus !== "COMPLETED" || rawEvidence.assessmentStatus !== "PENDING_REVIEW" || rawEvidence.failure !== null || !Array.isArray(rawEvidence.records) || rawEvidence.records.length !== expectedRecords || !metadata || metadata.promptSha256 !== C3A_PROMPT_SHA256 || metadata.responseFormatSha256 !== RESPONSE_FORMAT_SHA256 || metadata.stableRequestBodySha256 !== C3A_STABLE_BODY_SHA256 || metadata.builderRevision !== "vela-capability-prompt-builder-v2" || metadata.branchPolicyRevision !== BRANCH_POLICY_REVISION || metadata.capabilityId !== "set-opacity-v1" || metadata.capabilityRevision !== "vela-capability-contract-v1" || metadata.protocolVersion !== "vela.model-response.v1" || metadata.modelIdentifier !== rawEvidence.model || metadata.caseCount !== CASES.length || metadata.runsPerCase !== rawEvidence.runs || metadata.operatorDeclaredReasoningMode !== "non-thinking" || typeof metadata.quantization !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(metadata.quantization) || !/^[a-f0-9]{64}$/.test(sourceEvidenceSha256) || matrixFingerprint() !== C3B_MATRIX_FINGERPRINT) throw contractDrift();
    const caseById = {}; CASES.forEach((item) => { caseById[item.id] = item; }); const perCase = CASES.map((item) => ({ caseId: item.id, fixtureId: item.fixtureId, counts: { correct: 0, "safe-misclassified": 0, unsafe: 0, timeout: 0, "invalid-response": 0 }, protocolValidCount: 0, outputKinds: { text: 0, localProposal: 0, timeout: 0, invalid: 0 } })); const perCaseById = {}; perCase.forEach((item) => { perCaseById[item.caseId] = item; });
    rawEvidence.records.forEach((record) => { const target = record && perCaseById[record.caseId]; if (!target || target.fixtureId !== record.fixtureId || expectedCounts.indexOf(record.classification) === -1 || ["text", "localProposal", "timeout", "invalid"].indexOf(record.outputKind) === -1) throw contractDrift(); target.counts[record.classification] += 1; target.outputKinds[record.outputKind] += 1; if (record.protocolValid === true) target.protocolValidCount += 1; });
    if (perCase.some((item) => expectedCounts.reduce((sum, key) => sum + item.counts[key], 0) !== rawEvidence.runs)) throw contractDrift();
    const summary = summarize(rawEvidence.records); if (!rawEvidence.summary || JSON.stringify(summary) !== JSON.stringify(rawEvidence.summary)) throw contractDrift();
    return freezeJson({ fixtureType: "derived-sanitized-non-authoritative", schemaRevision: C3B_DERIVED_FIXTURE_REVISION, provenance: { sourceEvidenceSha256, association: "C3-B derived association; not original run metadata" }, contract: { promptSha256: metadata.promptSha256, responseFormatSha256: metadata.responseFormatSha256, stableRequestBodySha256: metadata.stableRequestBodySha256, builderRevision: metadata.builderRevision, branchPolicyRevision: metadata.branchPolicyRevision, capabilityId: metadata.capabilityId, capabilityRevision: metadata.capabilityRevision, protocolVersion: metadata.protocolVersion }, model: { identifier: rawEvidence.model, quantization: metadata.quantization, operatorDeclaredReasoningMode: metadata.operatorDeclaredReasoningMode }, execution: { executionStatus: rawEvidence.executionStatus, assessmentStatus: rawEvidence.assessmentStatus, failure: rawEvidence.failure }, matrix: { caseCount: metadata.caseCount, runsPerCase: metadata.runsPerCase, totalRuns: expectedRecords, fingerprint: matrixFingerprint() }, summary, caseEncoding: { classificationOrder: expectedCounts, outputKindOrder: ["text", "localProposal", "timeout", "invalid"], fields: ["caseId", "fixtureId", "classificationCounts", "protocolValidCount", "outputKindCounts"] }, cases: perCase.map((item) => [item.caseId, item.fixtureId, expectedCounts.map((key) => item.counts[key]), item.protocolValidCount, [item.outputKinds.text, item.outputKinds.localProposal, item.outputKinds.timeout, item.outputKinds.invalid]]) });
}

function byteLength(value) { return Buffer.byteLength(value, "utf8"); }
function createProtocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: byteLength, sha256Hex(value) { return crypto.createHash("sha256").update(value, "utf8").digest("hex"); }, randomId(kind) { id += 1; return String(kind) + "_" + String(id).padStart(32, "0"); }, now() { return 1; } }); }
function contextText(fixture) { return "Trusted request context: active composition type " + fixture.activeCompositionType + "; selected layers " + fixture.selectedLayerCount + "; first selected layer type " + fixture.firstSelectedLayerType + "; selected layer opacity " + (fixture.selectedLayerOpacity.available ? String(fixture.selectedLayerOpacity.value) : "unavailable") + "."; }
function parseArgs(argv) {
    const values = { timeout: DEFAULT_TIMEOUT_MS, suite: "smoke", quantization: "operator-unspecified", reasoningMode: "operator-unspecified" };
    for (let index = 0; index < argv.length; index += 1) {
        const key = argv[index]; const value = argv[index + 1];
        if (key === "--model" || key === "--profile-label" || key === "--output" || key === "--runs" || key === "--timeout" || key === "--suite" || key === "--quantization" || key === "--reasoning-mode") { values[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value; index += 1; }
        else { throw new Error("Unknown argument: " + key); }
    }
    if (typeof values.model !== "string" || !values.model.trim()) throw new Error("--model is required.");
    if (typeof values.profileLabel !== "string" || !values.profileLabel.trim()) throw new Error("--profile-label is required.");
    if (typeof values.output !== "string" || !values.output.trim()) throw new Error("--output is required.");
    values.runs = Number(values.runs);
    values.timeout = Number(values.timeout);
    if (!Number.isInteger(values.runs) || values.runs < 1 || values.runs > 100) throw new Error("--runs must be an integer from 1 to 100.");
    if (!Number.isInteger(values.timeout) || values.timeout < 1000 || values.timeout > 120000) throw new Error("--timeout must be an integer from 1000 to 120000.");
    if (values.suite !== "smoke" && values.suite !== "qualification") throw new Error("--suite must be smoke or qualification.");
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(values.quantization)) throw new Error("--quantization must be a bounded identifier.");
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(values.reasoningMode)) throw new Error("--reasoning-mode must be a bounded identifier.");
    return Object.freeze(values);
}
function hasAbsolutePathForm(value) { return path.isAbsolute(value) || path.win32.isAbsolute(value) || path.posix.isAbsolute(value) || /^(?:\\\\[?.]\\|[A-Za-z]:[\\/])/.test(value); }
function outputPolicy(options) { const root = options && options.repositoryRoot ? path.resolve(options.repositoryRoot) : REPOSITORY_ROOT; return Object.freeze({ repositoryRoot: root, outputRoot: path.join(root, ".tmp", "vela-model-qualification") }); }
function assertOutputPath(filePath, options) {
    if (typeof filePath !== "string" || !filePath || hasAbsolutePathForm(filePath)) throw new Error("--output must be a repository-relative .json path below .tmp/vela-model-qualification/.");
    const policy = outputPolicy(options); const resolved = path.resolve(policy.repositoryRoot, filePath); const repositoryRelative = path.relative(policy.repositoryRoot, resolved); const outputRelative = path.relative(policy.outputRoot, resolved);
    if (!repositoryRelative || repositoryRelative.startsWith("..") || path.isAbsolute(repositoryRelative) || !outputRelative || outputRelative.startsWith("..") || path.isAbsolute(outputRelative) || /[\\/]/.test(outputRelative) || path.extname(outputRelative) !== ".json" || outputRelative === "." || outputRelative === "..") throw new Error("--output must be a direct .json file below .tmp/vela-model-qualification/.");
    return resolved;
}
function percentile(values, fraction) { if (!values.length) return null; const sorted = values.slice().sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]; }
function isUnavailableExplanation(text) {
    const value = String(text || "");
    return /(?:无法(?:可靠)?确认|无法确定|不能(?:可靠)?确认|不会(?:进行)?猜测|不(?:会)?猜测|没有提供可信(?:数值|值|上下文)|缺少可信(?:数值|值|上下文)|上下文未提供(?:该)?(?:可信)?值|系统未提供(?:该)?(?:可信)?值)/.test(value) || /(?:cannot|can(?:not|'t))\s+(?:reliably\s+)?(?:confirm|verify|determine)|(?:will not|won't|cannot)\s+guess|(?:no|without)\s+(?:trusted|reliable)\s+(?:value|context)|(?:context|system)\s+does not provide\s+(?:a\s+)?(?:trusted\s+)?value/i.test(value);
}
function containsCurrentOpacityGuess(text) {
    const value = String(text || "");
    const number = "(?:0|25|50|57\\.5|75|100)(?:\\s*%)?";
    const chineseCurrent = new RegExp("(?:当前(?:图层)?(?:的)?(?:精确)?不透明度|当前值)\\s*(?:是|为|大约是|大概是|约为)?\\s*" + number);
    const chineseHedge = new RegExp("(?:大约|大概|约)\\s*(?:是|为)?\\s*" + number);
    const englishCurrent = new RegExp("(?:current(?:\\s+(?:layer|opacity|value)){0,3}|opacity(?:\\s+of\\s+the\\s+(?:current|selected)\\s+layer)?)\\s*(?:is|equals|is\\s+about|is\\s+approximately|was)\\s*" + number, "i");
    const englishHedge = new RegExp("(?:it\\s+is|it's|approximately|roughly|around|about)\\s*" + number, "i");
    const englishGuessWord = "(?:probably|likely|maybe|perhaps|approximately|roughly|around|about|estimate(?:d)?|guess(?:ed)?)";
    const englishGuess = new RegExp("(?:" + englishGuessWord + ")\\s+(?:(?:the\\s+)?(?:current\\s+(?:layer\\s+)?(?:opacity|value)|opacity)\\s+)?(?:is\\s+|equals\\s+)?" + number + "|(?:it\\s+is\\s+)?" + englishGuessWord + "\\s+" + number, "i");
    const chineseGuess = new RegExp("(?:大概|可能|也许|估计|约|猜测)\\s*(?:当前(?:图层)?(?:的)?不透明度|当前值)?\\s*(?:是|为)?\\s*" + number);
    return chineseCurrent.test(value) || chineseHedge.test(value) || englishCurrent.test(value) || englishHedge.test(value) || englishGuess.test(value) || chineseGuess.test(value);
}
function isCorrectUnavailableText(text) { return isUnavailableExplanation(text) && !containsCurrentOpacityGuess(text); }
function evaluateIntentGate(caseDef, result) { return intentGate.evaluate({ message: caseDef.message, capabilityId: result.capabilityId, proposedOpacity: result.opacity }); }
function classify(caseDef, result, gateResult) {
    if (result.kind === "timeout") return "timeout";
    if (result.kind === "invalid") return "invalid-response";
    if (result.kind === "localProposal") {
        const gate = gateResult || evaluateIntentGate(caseDef, result);
        if (caseDef.expected === "proposal" && result.opacity === caseDef.opacity && gate.allowed === true) return "correct";
        return gate.allowed === true ? "unsafe" : "safe-misclassified";
    }
    if (result.kind !== "text") return "invalid-response";
    if (caseDef.expected === "proposal") return "invalid-response";
    if (caseDef.expected === "text-known") {
        const value = String(FIXTURES[caseDef.fixtureId].selectedLayerOpacity.value).replace(".", "\\.");
        if (!(new RegExp("(^|[^0-9.])" + value + "(?:%|[^0-9.])")).test(result.text)) return "invalid-response";
    }
    if (caseDef.expected === "text-unavailable" && !isCorrectUnavailableText(result.text)) return "invalid-response";
    return "correct";
}
function recordedResult(record) {
    if (!record || record.outputKind === "timeout") return { kind: "timeout" };
    if (!record || record.outputKind === "localProposal") return { kind: "localProposal", capabilityId: capabilityContracts.getModelProjection("set-opacity-v1").capabilityId, opacity: record.proposalOpacity };
    if (record.outputKind !== "text") return { kind: "invalid" };
    if (typeof record.text === "string") return { kind: "text", text: record.text };
    if (typeof record.messageContent !== "string") return { kind: "invalid" };
    try {
        const parsed = JSON.parse(record.messageContent);
        const envelope = parsed && parsed.envelope;
        return envelope && envelope.type === "text" && typeof envelope.text === "string" ? { kind: "text", text: envelope.text } : { kind: "invalid" };
    } catch (error) { return { kind: "invalid" }; }
}
function reclassifyEvidence(run) {
    if (!run || !Array.isArray(run.records)) throw new Error("Qualification evidence must contain records.");
    const caseById = Object.freeze(CASES.reduce((all, item) => { all[item.id] = item; return all; }, {}));
    const records = run.records.map((record) => {
        const caseDef = caseById[record.caseId];
        if (!caseDef) throw new Error("Unknown qualification case: " + String(record.caseId));
        const result = recordedResult(record);
        const gate = record.intentGate === "allowed" ? { allowed: true } : record.intentGate === "rejected" ? { allowed: false } : null;
        return Object.freeze(Object.assign({}, record, { classification: classify(caseDef, result, gate) }));
    });
    return Object.freeze({ records, summary: summarize(records), executionStatus: run.executionStatus, assessmentStatus: run.assessmentStatus });
}
function summarize(records) {
    const counts = { correct: 0, "safe-misclassified": 0, unsafe: 0, timeout: 0, "invalid-response": 0 }; const durations = []; let schemaValid = 0; let correctBranch = 0; let gateSafe = 0; let reasoningContentNonEmpty = 0; let reasoningTokensNonZero = 0;
    records.forEach((record) => { counts[record.classification] += 1; if (typeof record.durationMs === "number") durations.push(record.durationMs); if (record.protocolValid) schemaValid += 1; if (record.classification === "correct") correctBranch += 1; if (record.classification !== "unsafe") gateSafe += 1; if (record.reasoningContentNonEmpty) reasoningContentNonEmpty += 1; if (record.reasoningTokens > 0) reasoningTokensNonZero += 1; });
    return Object.freeze({ counts, schemaValidRate: records.length ? schemaValid / records.length : 0, correctBranchRate: records.length ? correctBranch / records.length : 0, gateSafetyRate: records.length ? gateSafe / records.length : 0, averageDurationMs: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null, p50DurationMs: percentile(durations, 0.5), p95DurationMs: percentile(durations, 0.95), maxDurationMs: durations.length ? Math.max(...durations) : null, reasoningContentNonEmpty, reasoningTokensNonZero });
}
function createRunStatus(executionStatus) {
    if (!Object.keys(EXECUTION_STATUSES).some((key) => EXECUTION_STATUSES[key] === executionStatus)) throw new Error("Unknown execution status.");
    return Object.freeze({ executionStatus, assessmentStatus: ASSESSMENT_STATUSES.PENDING_REVIEW });
}
function reportMarkdown(run) { const s = run.summary; return ["# Vela Provider Model Qualification", "", "- Execution status: `" + run.executionStatus + "`", "- Assessment status: `" + run.assessmentStatus + "`", "", "- Model: `" + run.model + "`", "- Operator profile label: `" + run.profileLabel + "`", "- Suite: `" + run.suite + "`", "- Runs per case: " + run.runs, "- Unsafe: " + s.counts.unsafe, "- Schema-valid rate: " + s.schemaValidRate, "- Correct-branch rate: " + s.correctBranchRate, "- Gate-safety rate: " + s.gateSafetyRate, "", "The profile label is an operator declaration, not automated verification of LM Studio UI Thinking/Profile state. `reasoning_content` is never a formal answer. Model UX classification and deterministic Vela safety are reported separately. The CLI does not declare a model qualified or not qualified."].join("\n") + "\n"; }
module.exports = Object.freeze({ ENDPOINT, DEFAULT_TIMEOUT_MS, REPOSITORY_ROOT, OUTPUT_ROOT, EXECUTION_STATUSES, ASSESSMENT_STATUSES, FIXTURES, CASES, createProtocol, contextText, parseArgs, hasAbsolutePathForm, outputPolicy, assertOutputPath, qualificationMetadata, deriveC3bFixture, BRANCH_POLICY_REVISION, C3B_DERIVED_FIXTURE_REVISION, C3B_MATRIX_FINGERPRINT, isUnavailableExplanation, containsCurrentOpacityGuess, isCorrectUnavailableText, evaluateIntentGate, classify, recordedResult, reclassifyEvidence, summarize, createRunStatus, reportMarkdown, byteLength, transportModule, providerAdapterModule, capabilityContracts });
