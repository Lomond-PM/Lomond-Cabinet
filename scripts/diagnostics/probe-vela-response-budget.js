"use strict";
// Explicit local measurement, not model qualification or Host execution.
// Retains raw local evidence in .tmp; never admits diagnostic clone output.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pm = require("../../client/js/vela/velaProtocol");
const am = require("../../client/js/vela/velaProviderAdapter");
const tm = require("../../client/js/vela/velaLocalTransport");
const sm = require("../../client/js/vela/velaProviderStreamAssembler");
const lp = require("../../client/js/vela/velaLogicalPlanContracts");
const output = path.resolve(__dirname, "../../.tmp/vela-f6");
const prompts = {
    short: "请简短解释 AE 关键帧的作用。",
    medium: "我刚开始学习 After Effects。请解释位置关键帧、线性插值和缓入缓出之间的关系，并给出一个文字从左侧滑入画面的学习示例。只需说明思路，不要执行修改。",
    long: "请给 AE 初学者写一份约600字的动画学习说明，解释关键帧、插值、缓动、运动模糊、父子关系和预合成如何配合。用一个标题文字从画外进入、停留再淡出的例子说明，并指出三个常见错误。仅作教学解释，不执行项目修改。",
    proposal: "Set layer opacity to 47%",
    logical: "Set layer opacity to 47% then rename it to Hero",
    overflow: "请用两句话解释 After Effects 的关键帧是什么。"
};
const runtime = {
    setTimeout, clearTimeout, nowMs: Date.now,
    createAbortController() {
        const controller = new AbortController();
        return { signal: controller.signal, abort() { controller.abort(); } };
    },
    parseUrl(value) {
        const url = new URL(value);
        return Object.fromEntries(["protocol", "hostname", "port", "pathname", "username", "password", "search", "hash", "href"].map(key => [key, url[key]]));
    }
};
async function probe([name, effort, overrides], phase, index) {
    const protocol = pm.createProtocol({
        utf8ByteLength: value => Buffer.byteLength(value),
        sha256Hex: value => crypto.createHash("sha256").update(value).digest("hex"),
        randomId: () => "req_" + crypto.randomBytes(16).toString("hex"), now: Date.now
    });
    protocol.attachLogicalPlanContracts(lp);
    const evidence = {
        phase, index, name, effort, extra: overrides || null, started: new Date().toISOString(),
        events: [], hardCeiling: am.RESOURCE_POLICY.maxStreamResponseBytes, captureLimit: 4 * 1024 * 1024
    };
    let observed = Promise.resolve(), timer;
    const transport = tm.createLocalTransport({
        protocol, TextDecoder,
        async fetch(url, options) {
            const body = JSON.parse(options.body);
            evidence.productionBody = JSON.parse(JSON.stringify(body));
            if (effort !== null) body.reasoning_effort = effort;
            Object.assign(body, overrides || {});
            evidence.sentBody = body;
            const controller = new AbortController();
            timer = setTimeout(() => controller.abort(), 120000);
            options.signal.addEventListener("abort", () => controller.abort(), { once: true });
            const response = await fetch(url, { ...options, signal: controller.signal, body: JSON.stringify(body) });
            evidence.status = response.status;
            // Separate bounded observer preserves full measurements if production stops early.
            // The actual response still goes through production LocalTransport and Adapter.
            observed = (async () => {
                const reader = response.clone().body.getReader();
                const decoder = new TextDecoder("utf-8", { fatal: true });
                let bytes = 0, chunks = 0, raw = "";
                try {
                    while (true) {
                        const part = await reader.read();
                        if (part.done) { raw += decoder.decode(); break; }
                        bytes += part.value.byteLength;
                        if (bytes > evidence.captureLimit) {
                            reader.cancel().catch(() => {});
                            throw Error("Diagnostic capture ceiling");
                        }
                        chunks++;
                        raw += decoder.decode(part.value, { stream: true });
                    }
                } catch (error) { evidence.captureError = error.message; }
                finally { reader.releaseLock(); }
                evidence.raw = raw;
                evidence.fullBytes = bytes;
                evidence.fullChunks = chunks;
                let reasoningDeltas = 0, contentDeltas = 0;
                const assembler = sm.create({ onDelta(channel) { if (channel === "reasoning") reasoningDeltas++; else contentDeltas++; } });
                try { assembler.feed(raw); assembler.finish(); }
                catch (error) { evidence.assemblyError = error.message; }
                const state = assembler.getState();
                evidence.full = {
                    reasoningDeltas, contentDeltas, reasoningChars: state.reasoning.length,
                    contentChars: state.text.length, reasoningUtf8: Buffer.byteLength(state.reasoning),
                    contentUtf8: Buffer.byteLength(state.text), frames: state.frameCount,
                    done: state.done, finish: state.finishReasonObserved, content: state.text
                };
            })();
            return response;
        }
    });
    const adapter = am.createLocalOpenAICompatibleProvider({
        protocol, transport, runtime, model: "qwen3.5-4b",
        requestProfile: name === "proposal" ? "explicit-edit-eligible" : name === "logical" ? "bounded-logical-plan-eligible" : "text-only",
        streaming: true, debugTerminalDiagnostics: true, timeoutMs: 120000,
        onStreamEvent: event => evidence.events.push(event)
    });
    try {
        evidence.result = await adapter.start({
            messages: [{ role: "user", content: prompts[name] }],
            context: { contextId: "f6-probe", fingerprint: "sha256:" + "a".repeat(64), tier: 0 }
        }).promise;
        evidence.diagnostics = adapter.getDiagnostics();
        await observed;
    } finally { clearTimeout(timer); }
    evidence.duration = Date.now() - Date.parse(evidence.started);
    const file = path.join(output, `${phase}-${index}-${name}-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
    const terminal = evidence.result.envelope;
    const diagnostics = evidence.diagnostics.terminalDebugEvidence || {};
    const measured = diagnostics.transportDiagnostics || {};
    console.log(JSON.stringify({
        file, name, effort, ...evidence.full, content: undefined, bytes: evidence.fullBytes,
        bytesRead: measured.bytesRead, decodedChunkCount: measured.decodedChunkCount,
        hardCeiling: evidence.hardCeiling, utilization: evidence.fullBytes / evidence.hardCeiling,
        result: terminal.type, error: terminal.error && terminal.error.code, duration: evidence.duration
    }));
    return terminal.type !== "error" && !evidence.captureError && evidence.full.done && evidence.full.finish === "stop";
}
async function main() {
    const args = process.argv.slice(2);
    if (!args.includes("--run") || args.some(arg => !["--run", "--policy"].includes(arg))) {
        console.error("Usage: node scripts/diagnostics/probe-vela-response-budget.js --run [--policy]\nRequires local LM Studio, qwen3.5-4b loaded on port 1234. Default: 12 acceptance requests; --policy: 7 medium comparisons including expected length failure.");
        process.exitCode = 2;
        return;
    }
    fs.mkdirSync(output, { recursive: true });
    const policy = args.includes("--policy");
    const cases = policy ? [
        ...["none", "low", "medium", "high"].map(effort => ["medium", effort]),
        ["medium", null, { thinking_budget_tokens: 1024, max_tokens: 4096 }],
        ["medium", null, { thinking_budget_tokens: 2048, max_tokens: 4096 }],
        ["medium", null, { thinking_budget_tokens: 1024, max_tokens: 128 }]
    ] : [
        ...["short", "medium", "long", "proposal", "logical"].flatMap(name => [[name, null], [name, null]]),
        ["medium", "none"], ["overflow", null]
    ];
    for (let index = 0; index < cases.length; index++) {
        const success = await probe(cases[index], policy ? "policy-recheck" : "acceptance-recheck", index);
        if (!policy && !success) process.exitCode = 1;
    }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
