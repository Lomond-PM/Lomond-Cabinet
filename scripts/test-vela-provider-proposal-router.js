#!/usr/bin/env node
"use strict";
const assert = require("assert");
const crypto = require("crypto");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const bridgeModule = require("../client/js/vela/velaContextBridge");
const transportModule = require("../client/js/vela/velaLocalTransport");
const providerControllerModule = require("../client/js/vela/velaProviderController");
const controllerModule = require("../client/js/vela/velaController");
const routerModule = require("../client/js/vela/velaProviderProposalRouter");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(value, code, message) { await assert.rejects(Promise.resolve(value), (error) => error && error.code === code, message); assertions += 1; }
function deferred() { let resolve; let reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; }
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }
function protocol() { let id = 0; return protocolModule.createProtocol({ utf8ByteLength: (v) => Buffer.byteLength(v, "utf8"), sha256Hex: (v) => crypto.createHash("sha256").update(v, "utf8").digest("hex"), randomId: (kind) => kind + "_" + (++id).toString().padStart(32, "a"), now: () => 1 }); }
function hostResult(request) { const hostInstanceId = "host_" + "a".repeat(48); let snapshot = { hostInstanceId, hostReloadEpoch: 1, tier: 1, projectGeneration: 1, activeComp: { itemId: 1, projectGeneration: 1, type: "CompItem", width: 100, height: 100, duration: 1, frameRate: 24 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 2, layerIndex: 1, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] } }; if (request.tier === 3) snapshot = { hostInstanceId, hostReloadEpoch: 1, tier: 3, projectGeneration: 1, sampleTime: 0, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: 20 } })) }; return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot }); }
function createHarness(options) {
    options = options || {};
    const p = protocol(); const context = contextModule.createContextApi(p); let creates = 0;
    const bridge = bridgeModule.createContextBridge({ protocol: p, contextApi: context, invokeHost(source, cb) { cb(hostResult(decode(source))); }, runtime: { setTimeout, clearTimeout, timeoutMs: 1000 } });
    const reviewPort = bridgeModule.createReviewPort(bridge, p);
    const transport = transportModule.createLocalTransport({ protocol: p, fetch(url, options) { const body = JSON.parse(options.body); const requestId = /Use requestId (req_[a-z0-9]+)/.exec(JSON.parse(body.messages[1].content).turnResponseContract)[1]; const response = JSON.stringify({ id: "x", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId, provider: "lmstudio", model: "m", envelope: { type: "localProposal", proposal: { capabilityId: "set-opacity-v1", params: { opacity: 57.5 } } } }), tool_calls: [] }, finish_reason: "stop" }], usage: {} }); let done = false; return Promise.resolve({ status: 200, redirected: false, url, headers: { get: () => "application/json" }, body: { getReader() { return { read() { if (done) return Promise.resolve({ done: true }); done = true; return Promise.resolve({ done: false, value: new TextEncoder().encode(response) }); }, cancel() {} }; } } }); }, TextDecoder });
    const provider = providerControllerModule.createProviderController({ protocol: p, contextBridge: bridge, transport, runtime: { setTimeout, clearTimeout, createAbortController() { return { signal: {}, abort() {} }; }, parseUrl(value) { const u = new URL(value); return { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, username: u.username, password: u.password, search: u.search, hash: u.hash, href: u.href }; }, nowMs: () => 1 } });
    const preflight = { createBoundPlan(input) { creates += 1; check(Object.keys(input).join(",") === "localProposal,selectionOrderMeaningful", "Router supplies only the bounded local proposal shape to the local controller."); check(input.localProposal.capabilityId === "set-opacity-v1" && input.localProposal.params.opacity === 57.5, "Router forwards the normalized opacity exactly once."); return options.createPromise || (options.createFailure ? Promise.reject(new p.VelaProtocolError(p.ERROR_CODES.CONTEXT_STALE)) : Promise.resolve({ planId: "plan_local", candidateIds: ["cand_local"], review: { valueKind: "number", beforeValue: 20 } })); }, discardBoundPlan() {}, confirmBoundPlan() { return Promise.resolve(); }, executeStep() { return Promise.resolve(); } };
    const controller = controllerModule.createController({ protocol: p, preflight });
    const router = routerModule.createProposalRouter({ protocol: p, providerController: provider, controller });
    return { p, provider, controller, router, proposalPort: providerControllerModule.createProposalPort(provider, p), getCreates: () => creates };
}
async function sendProposal(h) { return h.provider.send({ message: "Set the selected layer opacity to 57.5%", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" }); }
async function run() {
    const h = createHarness();
    check(Object.isFrozen(h.router) && Object.keys(h.router).join(",") === "review", "Router exposes only the parameterless review operation.");
    check(routerModule.isTrustedProposalRouterForProtocol(h.router, h.p), "Router is bound to the exact Protocol instance.");
    check(!routerModule.isTrustedProposalRouterForProtocol(Object.create(h.router), h.p), "Prototype clones cannot forge router identity.");
    await expectCode(h.router.review(), h.p.ERROR_CODES.CANDIDATE_NOT_FOUND, "Review without a private proposal fails closed.");
    const greeting = createHarness();
    const greetingState = await greeting.provider.send({ message: "你好", endpoint: "http://127.0.0.1:1234/v1/chat/completions", model: "m" });
    check(greetingState.state === "intent-rejected" && greetingState.intentReason === "missing-action" && greetingState.proposalCapabilityId === null && greetingState.suggestedOpacity === null && greeting.provider.getUiState().state !== "proposal-ready", "A union greeting receiving localProposal is rejected by Intent Gate and leaves no proposal for the Router to review.");
    check(greeting.getCreates() === 0 && greeting.controller.getUiState().candidateId === null, "Intent Gate rejection creates neither a local plan nor a candidate.");
    await expectCode(greeting.router.review(), greeting.p.ERROR_CODES.CANDIDATE_NOT_FOUND, "Intent Gate rejection leaves no active proposal that Router Review can revive.");
    const proposal = await sendProposal(h);
    check(proposal.state === "proposal-ready" && proposal.suggestedOpacity === 57.5, "Provider emits only the read-only proposal summary before review.");
    check(h.controller.getUiState().candidateId === null && h.getCreates() === 0, "Proposal-ready creates neither a candidate nor a local plan.");
    const pending = await h.router.review();
    check(pending.state === "pending-confirmation" && pending.candidateId === "cand_local", "Review creates the existing local confirmation candidate.");
    check(h.getCreates() === 1 && h.provider.getUiState().state === "idle", "Review finalizes the request-scoped proposal after candidate creation.");
    await expectCode(h.router.review(), h.p.ERROR_CODES.CANDIDATE_NOT_FOUND, "Replay cannot promote the consumed proposal again.");
    const next = await sendProposal(h);
    check(next.state === "proposal-ready", "A later provider request may supply a new independent proposal.");
    const first = h.router.review(); const second = h.router.review();
    await first;
    await expectCode(second, h.p.ERROR_CODES.CANDIDATE_STATE_INVALID, "Concurrent reviews cannot create a second candidate from one proposal.");
    const h2 = createHarness(); await sendProposal(h2); h2.provider.invalidate("idle");
    await expectCode(h2.router.review(), h2.p.ERROR_CODES.CANDIDATE_NOT_FOUND, "Lifecycle invalidation clears a proposal before review.");
    const failed = createHarness({ createFailure: true }); await sendProposal(failed);
    await expectCode(failed.router.review(), failed.p.ERROR_CODES.CONTEXT_STALE, "Candidate-creation failure returns the existing local error without promotion retry.");
    check(failed.provider.getUiState().state === "idle" && failed.provider.getUiState().errorCode === failed.p.ERROR_CODES.CONTEXT_STALE && failed.controller.getUiState().state === "idle" && failed.controller.getUiState().candidateId === null, "Review failure records one terminal error while atomically returning Provider, candidate and confirmation state to idle.");
    await expectCode(failed.router.review(), failed.p.ERROR_CODES.CANDIDATE_NOT_FOUND, "Candidate-creation failure leaves no replayable provider proposal.");
    const idempotent = createHarness(); await sendProposal(idempotent); const transaction = idempotent.proposalPort.beginReview();
    check(transaction.requestId === idempotent.provider.getUiState().requestId && Number.isInteger(transaction.generation), "A review transaction carries the Provider request id and existing request generation.");
    check(idempotent.proposalPort.finalizeReview({ requestId: transaction.requestId, generation: transaction.generation, outcome: "failed", errorCode: idempotent.p.ERROR_CODES.UNKNOWN_TARGET }) === true && idempotent.proposalPort.finalizeReview({ requestId: transaction.requestId, generation: transaction.generation, outcome: "failed", errorCode: idempotent.p.ERROR_CODES.UNKNOWN_TARGET }) === false, "Proposal finalization is idempotent and cannot revive a completed transaction.");
    const latePlan = deferred(); const lifecycle = createHarness({ createPromise: latePlan.promise }); await sendProposal(lifecycle); const lateReview = lifecycle.router.review(); lifecycle.provider.invalidate("idle"); lifecycle.controller.invalidate("idle"); latePlan.resolve({ planId: "late_plan", candidateIds: ["late_candidate"], review: { valueKind: "number", beforeValue: 20 } }); await expectCode(lateReview, lifecycle.p.ERROR_CODES.LIFECYCLE_BLOCKED, "A lifecycle invalidation rejects a late binding completion."); check(lifecycle.provider.getUiState().state === "idle" && lifecycle.controller.getUiState().state === "idle" && lifecycle.controller.getUiState().candidateId === null, "A late binding callback cannot restore an invalidated proposal, candidate, or confirmation.");
    const foreign = createHarness();
    assert.throws(() => routerModule.createProposalRouter({ protocol: h.p, providerController: foreign.provider, controller: h.controller }), (error) => error.code === h.p.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE); assertions += 1;
    check(!/candidate|plan|nonce|digest|native|authority/i.test(JSON.stringify(proposal)), "Public provider state continues to omit trusted execution data.");
    console.log("test-vela-provider-proposal-router: " + assertions + " assertions passed.");
}
run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
