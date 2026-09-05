"use strict";
// Explicit LM Studio probe. Only reasoning_effort is varied at the diagnostic
// fetch seam. Production Controller selects profile, prompts, schema and budgets.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createHarness, cases, message } = require("../fixtures/vela-routing-harness");
const adapter = require("../../client/js/vela/velaProviderAdapter");
const assembler = require("../../client/js/vela/velaProviderStreamAssembler");
const output = path.resolve(__dirname, "../../.tmp/vela-f9");
async function probe(testCase, effort, sequence) {
    let evidence;
    let observation = Promise.resolve();
    const harness = createHarness({ ...testCase, async fetch(url, options) {
        evidence.productionBody = JSON.parse(options.body);
        evidence.sentBody = effort === null ? evidence.productionBody : { ...evidence.productionBody, reasoning_effort: effort };
        evidence.productionBodySha256 = crypto.createHash("sha256").update(options.body).digest("hex");
        const response = await fetch(url, { ...options, body: JSON.stringify(evidence.sentBody) });
        evidence.status = response.status;
        evidence.contentType = response.headers.get("content-type");
        observation = (async () => {
            const reader = response.clone().body.getReader();
            const decoder = new TextDecoder(); let raw = "", bytes = 0;
            try {
                while (true) {
                    const part = await reader.read(); if (part.done) break;
                    bytes += part.value.byteLength;
                    if (bytes > adapter.RESOURCE_POLICY.maxStreamResponseBytes) { await reader.cancel(); throw Error("Diagnostic ceiling"); }
                    raw += decoder.decode(part.value, { stream: true });
                }
                raw += decoder.decode(); evidence.raw = raw;
                const stream = assembler.create(); stream.feed(raw); stream.finish();
                evidence.stream = stream.getState();
            } catch (error) { evidence.observerError = error.message; }
            finally { reader.releaseLock(); }
        })();
        return response;
    } });
    harness.controller.subscribeStreamEvents(event => evidence.events.push(event));
    const inputs = sequence || [message];
    for (let index = 0; index < inputs.length; index++) {
        evidence = { case: testCase, message: inputs[index], effort, started: new Date().toISOString(), events: [] };
        try { evidence.result = await harness.send(inputs[index]); } catch (error) { evidence.error = error.code || error.message; }
        await observation;
        evidence.diagnostics = harness.controller.getDiagnostics();
        evidence.outputDecision = adapter.getOutputDecision(evidence.diagnostics.finalProfile);
        evidence.hostOperations = harness.operations.slice();
        evidence.durationMs = Date.now() - Date.parse(evidence.started);
        fs.mkdirSync(output, { recursive: true });
        fs.writeFileSync(path.join(output, testCase.id + "-" + effort + (sequence ? "-turn-" + index : "") + ".json"), JSON.stringify(evidence, null, 2) + "\n");
        console.log(JSON.stringify({ case: testCase.id, turn: index, effort, status: evidence.status, profile: evidence.diagnostics.finalProfile, result: evidence.result && evidence.result.state, steps: evidence.result && evidence.result.logicalPlanProposal && evidence.result.logicalPlanProposal.declaredStepCount, error: evidence.error, durationMs: evidence.durationMs }));
        if (evidence.error || !evidence.result || evidence.result.state === "failed" ||
            (inputs[index] === message && evidence.result.state !== "logical-plan-ready")) process.exitCode = 1;
    }
}
function summarize() {
    const records = fs.readdirSync(output).filter(file => /^(?:[ABCD]|conversation-B)-(?:none|low)(?:-turn-\d+)?\.json$/.test(file)).sort().map(file => {
        const evidence = JSON.parse(fs.readFileSync(path.join(output, file), "utf8"));
        const plan = evidence.result && evidence.result.logicalPlanProposal;
        return { evidenceId: file.replace(/\.json$/, ""), case: evidence.case, message: evidence.message,
            reasoningEffort: evidence.effort, productionBodySha256: evidence.productionBodySha256,
            provisionalProfile: evidence.diagnostics.provisionalProfile, finalProfile: evidence.diagnostics.finalProfile,
            ...evidence.outputDecision, responseSchema: evidence.productionBody.response_format ? evidence.productionBody.response_format.json_schema.name : null,
            status: evidence.status, contentType: evidence.contentType, done: evidence.stream && evidence.stream.done,
            finishReason: evidence.stream && evidence.stream.finishReasonObserved,
            reasoningChars: evidence.stream && evidence.stream.reasoning.length,
            terminalState: evidence.result && evidence.result.state, error: evidence.error || null,
            steps: plan ? plan.steps.map(step => ({ capabilityId: step.capabilityId, params: step.params })) : null,
            durationMs: evidence.durationMs };
    });
    fs.writeFileSync(path.resolve(__dirname, "../../docs/reports/vela-0.3.9-c1b-f9-probes.json"), JSON.stringify({
        note: "Production Controller/Adapter/LocalTransport, trusted simulated Host opacity; current name is not projected to Provider. Diagnostic fetch varies only reasoning_effort. Not AE acceptance or model qualification.", records
    }, null, 2) + "\n");
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--summarize") { summarize(); return; }
    if (!args.includes("--run") || args.some(arg => !["--run", "--conversation", "--smoke"].includes(arg)) || (args.includes("--conversation") && args.includes("--smoke"))) {
        console.error("Usage: node scripts/diagnostics/probe-vela-multistep-routing.js --run [--conversation|--smoke]\nUse --summarize alone to rebuild saved evidence without network requests. --smoke sends exactly three requests with unchanged production bodies; requires local LM Studio qwen3.5-4b on port 1234.");
        process.exitCode = 2;
        return;
    }
    if (args.includes("--smoke")) {
        await probe({ ...cases[0], id: "C2-smoke" }, null, ["请用一句话解释 AE 关键帧。", "把当前图层的不透明度改成 60%", message]);
    } else if (args.includes("--conversation")) {
        const sequence = ["请用一句话解释 AE 关键帧。", "当前图层的不透明度是多少？", "把当前图层的不透明度改成 60%", "请简短解释图层重命名的用途。", message, "谢谢，请简短说明什么是缓动。", message];
        for (const effort of ["none", "low"]) await probe({ ...cases[1], id: "conversation-B" }, effort, sequence);
    } else for (const testCase of cases) for (const effort of ["none", "low"]) await probe(testCase, effort);
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
