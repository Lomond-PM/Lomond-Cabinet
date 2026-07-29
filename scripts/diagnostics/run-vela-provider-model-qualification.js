#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const qualification = require("./velaProviderModelQualification");

function runtime() { return { setTimeout, clearTimeout, createAbortController() { const controller = new AbortController(); return { signal: controller.signal, abort() { controller.abort(); } }; }, parseUrl(value) { const url = new URL(value); return { protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname, username: url.username, password: url.password, search: url.search, hash: url.hash, href: url.href }; }, nowMs() { return Date.now(); } }; }
function responseFacts(rawText) {
    try {
        const wrapper = JSON.parse(rawText); const choice = wrapper && Array.isArray(wrapper.choices) ? wrapper.choices[0] : null; const message = choice && choice.message ? choice.message : {}; const usage = wrapper && wrapper.usage ? wrapper.usage : {}; const details = usage.completion_tokens_details || {};
        return { httpStatus: 200, finishReason: choice && typeof choice.finish_reason === "string" ? choice.finish_reason : null, messageContent: typeof message.content === "string" ? message.content : null, reasoningContentNonEmpty: typeof message.reasoning_content === "string" && message.reasoning_content.length > 0, reasoningTokens: Number.isFinite(details.reasoning_tokens) ? details.reasoning_tokens : 0 };
    } catch (error) { return { httpStatus: 200, finishReason: null, messageContent: null, reasoningContentNonEmpty: false, reasoningTokens: 0 }; }
}
async function oneRun(protocol, args, caseDef, attempt, dependencies) {
    const deps = dependencies || {}; const fetchImpl = deps.fetch || fetch; const evaluateGate = deps.evaluateIntentGate || qualification.evaluateIntentGate;
    const fixture = qualification.FIXTURES[caseDef.fixtureId]; const observed = { request: null, responseText: null, responseStatus: null, startedAt: new Date().toISOString() };
    const transport = qualification.transportModule.createLocalTransport({ protocol, fetch: async (url, options) => { if (url !== qualification.ENDPOINT) throw new Error("Diagnostic endpoint must remain localhost."); observed.request = JSON.parse(options.body); const response = await fetchImpl(url, options); observed.responseStatus = response.status; observed.responseText = await response.clone().text(); return response; }, TextDecoder });
    const provider = qualification.providerAdapterModule.createLocalOpenAICompatibleProvider({ protocol, transport, runtime: runtime(), endpoint: qualification.ENDPOINT, model: args.model, timeoutMs: args.timeout, responseFormatMode: "json-schema" });
    const started = provider.start({ messages: [{ role: "assistant", content: qualification.contextText(fixture) }, { role: "user", content: caseDef.message }], context: { contextId: "qualification-" + fixture.id + "-" + attempt, fingerprint: "sha256:" + "a".repeat(64), tier: 1 } });
    const began = Date.now(); let output; let error = null;
    try { output = await started.promise; } catch (caught) { error = caught; }
    const durationMs = Date.now() - began; const facts = observed.responseText === null ? { httpStatus: null, finishReason: null, messageContent: null, reasoningContentNonEmpty: false, reasoningTokens: 0 } : responseFacts(observed.responseText); facts.httpStatus = observed.responseStatus;
    let result;
    if (error && error.code === protocol.ERROR_CODES.PROVIDER_TIMEOUT) result = { kind: "timeout" };
    else if (!output || !output.envelope) result = { kind: "invalid" };
    else if (output.envelope.type === "text") result = { kind: "text", text: output.envelope.text };
    else if (output.envelope.type === "localProposal") result = { kind: "localProposal", capabilityId: output.envelope.proposal.capabilityId, opacity: output.envelope.proposal.params.opacity };
    else result = { kind: "invalid" };
    const gate = result.kind === "localProposal" ? evaluateGate(caseDef, result) : null;
    const classification = qualification.classify(caseDef, result, gate);
    return Object.freeze({ runId: caseDef.id + "-" + attempt, model: args.model, profileLabel: args.profileLabel, caseId: caseDef.id, fixtureId: fixture.id, startedAt: observed.startedAt, durationMs, httpStatus: facts.httpStatus, finishReason: facts.finishReason, messageContent: facts.messageContent, reasoningContentNonEmpty: facts.reasoningContentNonEmpty, reasoningTokens: facts.reasoningTokens, protocolValid: result.kind === "text" || result.kind === "localProposal", outputKind: result.kind, proposalOpacity: result.opacity === undefined ? null : result.opacity, intentGate: gate === null ? null : gate.allowed === true ? "allowed" : "rejected", classification });
}
function assertDirectory(fsModule, directory) {
    let entry;
    try { entry = fsModule.lstatSync(directory); } catch (error) {
        if (!error || error.code !== "ENOENT") throw error;
        fsModule.mkdirSync(directory); entry = fsModule.lstatSync(directory);
    }
    if (!entry.isDirectory() || entry.isSymbolicLink()) { const error = new Error("Qualification output path contains a symbolic link, junction, or non-directory."); error.code = "QUALIFICATION_OUTPUT_PATH_UNSAFE"; throw error; }
}
function assertRealContainment(fsModule, policy) {
    const rootReal = fsModule.realpathSync(policy.repositoryRoot); const outputReal = fsModule.realpathSync(policy.outputRoot); const relative = path.relative(rootReal, outputReal);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) { const error = new Error("Qualification output directory resolves outside the repository."); error.code = "QUALIFICATION_OUTPUT_PATH_UNSAFE"; throw error; }
}
function reserveOutput(fsModule, output, pathOptions) {
    const policy = qualification.outputPolicy(pathOptions); assertDirectory(fsModule, policy.repositoryRoot); assertDirectory(fsModule, path.join(policy.repositoryRoot, ".tmp")); assertDirectory(fsModule, policy.outputRoot); assertRealContainment(fsModule, policy);
    return fsModule.openSync(output, "wx");
}
async function executeQualification(args, dependencies) {
    const deps = dependencies || {}; const fsModule = deps.fs || fs; const runOne = deps.runOne || oneRun; const metadata = await qualification.qualificationMetadata(args, { fixture: deps.contractFixture }); const output = qualification.assertOutputPath(args.output, deps.pathOptions); const handle = reserveOutput(fsModule, output, deps.pathOptions); const protocol = qualification.createProtocol(); const records = []; const caseDefs = deps.caseDefs || qualification.CASES;
    let executionStatus = qualification.EXECUTION_STATUSES.COMPLETED; let failure = null;
    try {
        for (const caseDef of caseDefs) {
            for (let attempt = 1; attempt <= args.runs; attempt += 1) {
                const record = await runOne(protocol, args, caseDef, attempt, deps); records.push(record);
                if (record.classification === "unsafe") { executionStatus = qualification.EXECUTION_STATUSES.ABORTED_UNSAFE; break; }
            }
            if (executionStatus === qualification.EXECUTION_STATUSES.ABORTED_UNSAFE) break;
        }
    } catch (error) { executionStatus = qualification.EXECUTION_STATUSES.FAILED; failure = error && error.code ? String(error.code) : "DIAGNOSTIC_RUN_FAILED"; }
    const summary = qualification.summarize(records); const statuses = qualification.createRunStatus(executionStatus); const run = Object.freeze({ schemaRevision: "vela-provider-model-qualification-v2", endpoint: qualification.ENDPOINT, model: args.model, profileLabel: args.profileLabel, profileVerification: "operator-declared", suite: args.suite, runs: args.runs, timeoutMs: args.timeout, fixtureIds: Object.keys(qualification.FIXTURES), metadata, records, summary, executionStatus: statuses.executionStatus, assessmentStatus: statuses.assessmentStatus, failure });
    try { fsModule.writeFileSync(handle, JSON.stringify(run, null, 2) + "\n", "utf8"); } finally { fsModule.closeSync(handle); }
    return Object.freeze({ output, run, exitCode: executionStatus === qualification.EXECUTION_STATUSES.ABORTED_UNSAFE ? 2 : executionStatus === qualification.EXECUTION_STATUSES.FAILED ? 1 : 0 });
}
async function main(argv) {
    const args = qualification.parseArgs(argv || process.argv.slice(2));
    process.stdout.write("Confirm that the LM Studio loaded model and Thinking/Profile state match --profile-label. The label is an operator declaration only.\n");
    const result = await executeQualification(args);
    process.stdout.write("Wrote qualification data to " + result.output + "\n");
    if (result.exitCode === 2) process.stderr.write("Unsafe result detected; qualification stopped.\n");
    if (result.exitCode === 1) process.stderr.write("Diagnostic run failed after writing bounded partial data.\n");
    process.exitCode = result.exitCode;
}
if (require.main === module) main().catch((error) => { process.stderr.write("Qualification diagnostic failed: " + (error && error.code ? error.code : String(error)) + "\n"); process.exitCode = 1; });
module.exports = Object.freeze({ oneRun, reserveOutput, executeQualification, main });
