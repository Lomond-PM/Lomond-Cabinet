"use strict";
const assert = require("assert");
const { createHarness, cases, message } = require("./fixtures/vela-routing-harness");
const adapter = require("../client/js/vela/velaProviderAdapter");
let assertions = 0;
function check(value, label) { assert.ok(value, label); assertions++; }
async function run(testCase, input, kind, reasoning) {
    let body;
    const sequence = Array.isArray(input) ? input : null;
    const harness = createHarness({ ...testCase, fetch: async (url, options) => {
        body = JSON.parse(options.body);
        const props = body.response_format && body.response_format.json_schema.schema.properties;
        let content = "抱歉，我无法直接操作您的软件。";
        if (kind !== "prose") {
            const envelope = kind === "text-envelope" ? { type: "text", text: content } : kind === "proposal" ?
                { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 60 } } } :
                { type: "logicalPlanProposal", steps: [{ capabilityId: "set-opacity-v1", params: { opacity: 60 } }, { capabilityId: "set-layer-name-v1", params: { name: "Vela Stream Test" } }] };
            content = JSON.stringify({ protocol: props.protocol.enum[0], schemaVersion: props.schemaVersion.enum[0], requestId: props.requestId.enum[0], provider: props.provider.enum[0], model: props.model.enum[0], envelope });
        }
        const frame = (delta, finish_reason = null) => "data: " + JSON.stringify({ choices: [{ delta, finish_reason }] }) + "\n\n";
        const raw = (reasoning ? frame({ reasoning_content: "Plan the two requested edits." }) : "") + frame({ content }) + frame({}, "stop") + "data: [DONE]\n\n";
        const response = new Response(raw, { status: 200, headers: { "content-type": "text/event-stream" } });
        return { status: 200, redirected: false, url, headers: response.headers, body: response.body };
    } });
    const results = [];
    for (const turn of sequence || [{ input, kind, reasoning }]) {
        kind = turn.kind; reasoning = turn.reasoning;
        const result = await harness.send(turn.input);
        results.push({ result, body, diagnostics: harness.controller.getDiagnostics(), operations: harness.operations.slice() });
    }
    return sequence ? results : results[0];
}
(async () => {
    // Diagnostic entry points must be inert unless real requests are opted in.
    const childProcess = require("child_process");
    const path = require("path");
    for (const script of ["probe-vela-native-assistant.js", "probe-vela-response-budget.js", "probe-vela-multistep-routing.js"]) {
        const guarded = childProcess.spawnSync(process.execPath, [path.join(__dirname, "diagnostics", script)], { encoding: "utf8", timeout: 5000 });
        check(guarded.status === 2 && /--run/.test(guarded.stderr), script + " defaults to usage without real requests");
    }
    for (const flag of ["--conversation", "--smoke"]) {
        const guarded = childProcess.spawnSync(process.execPath, [path.join(__dirname, "diagnostics/probe-vela-multistep-routing.js"), flag], { encoding: "utf8", timeout: 5000 });
        check(guarded.status === 2 && /--run/.test(guarded.stderr), flag + " alone cannot authorize requests");
    }
    for (const testCase of cases) for (const reasoning of [false, true]) {
        const value = await run(testCase, message, "logical", reasoning);
        check(value.diagnostics.provisionalProfile === "bounded-logical-plan-eligible" && value.diagnostics.finalProfile === "bounded-logical-plan-eligible", testCase.id + " classified before context, unaffected by current values/reasoning");
        check(value.result.state === "logical-plan-ready" && value.result.logicalPlanProposal.declaredStepCount === 2, "Two-step terminal reaches Controller admission");
        check(value.result.logicalPlanProposal.steps[0].params.opacity === 60 && value.result.logicalPlanProposal.steps[1].params.name === "Vela Stream Test", "Exact requested values survive parser and intent gate");
        check(value.body.messages[2].content === message, "Current user message preserved byte-for-byte");
        check(value.body.response_format.type === "json_schema" && value.body.response_format.json_schema.strict && value.body.response_format.json_schema.name === "vela_bounded_logical_plan_response", "Actual transport body carries strict logical schema");
        const prompts = JSON.stringify(value.body.messages.slice(0, 2));
        check(/Return only one logicalPlanProposal/.test(prompts) && !/Do not create proposals|Answer normal conversation|Do not describe a proposal|never return steps/.test(prompts), "Logical prompt excludes native/single-step contradictions");
        check(prompts.includes("selected layer opacity " + testCase.opacity), "Production trusted opacity projection exercised");
        check(!prompts.includes(testCase.name), "Name is not currently projected to Provider; no invented Context expansion");
        const decision = adapter.getOutputDecision(value.diagnostics.finalProfile);
        check(decision.allowedOutputs.join() === "structured-logical-plan" && decision.transportMode === "strict-structured" && decision.presentationMode === "structured", "Output capability unchanged by reasoning");
        for (const kind of ["prose", "text-envelope"]) {
            const wrong = await run(testCase, message, kind, reasoning);
            check(wrong.result.state === "failed" && !wrong.result.text, "Wrong structured terminal cannot become successful ordinary fallback");
        }
    }
    const single = await run(cases[1], "把当前图层的不透明度改成 60%", "proposal", false);
    check(single.diagnostics.finalProfile === "explicit-edit-eligible" && single.result.state === "proposal-ready", "Already-satisfied single edit still uses proposal profile");
    const ordinary = await run(cases[0], "请解释 AE 关键帧的作用", "prose", true);
    check(ordinary.diagnostics.finalProfile === "text-only" && !ordinary.body.response_format && ordinary.result.state === "completed", "Ordinary question uses native assistant without schema");
    for (const reasoning of [false, true]) {
        const sequence = [
            { input: "请解释 AE 关键帧", kind: "prose" },
            { input: "当前图层不透明度是多少？", kind: "prose" },
            { input: "把当前图层的不透明度改成 60%", kind: "proposal" },
            { input: "请解释缓动", kind: "prose" },
            { input: message, kind: "logical" },
            { input: "谢谢，请解释预合成", kind: "prose" },
            { input: message, kind: "logical" }
        ].map(turn => ({ ...turn, reasoning }));
        const results = await run(cases[1], sequence);
        check(results.map(value => value.diagnostics.finalProfile).join() === ["text-only", "text-only", "explicit-edit-eligible", "text-only", "bounded-logical-plan-eligible", "text-only", "bounded-logical-plan-eligible"].join(), "Same Controller recomputes each turn profile after knowledge, query, proposal and logical turns");
        for (const index of [4, 6]) {
            check(results[index].result.state === "logical-plan-ready" && results[index].body.messages.length === 3, "Return to multi-step succeeds without historical messages");
            check(!JSON.stringify(results[index].body.messages).includes("Do not create proposals"), "Previous native contract does not leak to structured turn");
        }
    }
    console.log("PASS Vela multi-step routing: " + assertions + " assertions.");
})().catch(error => { console.error(error); process.exitCode = 1; });
