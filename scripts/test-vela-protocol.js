#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const parserModule = require("../client/js/vela/velaResponseParser");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const parser = parserModule.createResponseParser(protocol);
let assertions = 0;

function check(condition, message) {
    assert.ok(condition, message);
    assertions += 1;
}

function expectCode(callback, code, message) {
    assert.throws(callback, (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

const CONTEXT_FP = "sha256:" + "1".repeat(64);

function makeAction(overrides) {
    return Object.assign({
        providerActionId: "provider_act_01",
        kind: "tool",
        title: "Create a rectangle",
        rationale: "The selected layer needs a background.",
        risk: "write",
        target: { contextFingerprint: CONTEXT_FP, compId: "comp-session-01", layerIndices: [3] },
        payload: { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 40 } },
        undoGroupLabel: "Vela: Create rectangle",
        requiresConfirmation: true
    }, overrides || {});
}

function makeResponse(overrides) {
    return Object.assign({
        protocol: protocol.PROTOCOLS.RESPONSE,
        schemaVersion: protocol.SCHEMA_VERSION,
        requestId: "req_01",
        provider: "local-test",
        model: "test-model",
        envelope: { type: "plan", summary: "One proposed action.", proposals: [makeAction()] }
    }, overrides || {});
}

function run() {
    const response = makeResponse();
    check(parser.parseProviderResponse(JSON.stringify(response)).ok === true, "A canonical response should parse.");
    check(parser.parseProviderResponse("```json\n" + JSON.stringify(response) + "\n```").ok === true, "A single recognized JSON fence should parse.");
    check(parser.parseProviderResponse("\uFEFF" + JSON.stringify(response)).ok === true, "A UTF-8 BOM should be accepted.");
    check(parser.parseProviderResponse(JSON.stringify({ envelope: { type: "text", text: "```json {\"kind\":\"tool\"}```" }, protocol: protocol.PROTOCOLS.RESPONSE, schemaVersion: protocol.SCHEMA_VERSION, requestId: "r", provider: "p", model: "m" })).ok === true, "JSON-looking text must remain text.");
    check(parser.hasMultipleRootCandidates("{} {}") === true, "Multiple JSON roots should be detected.");
    check(parser.parseProviderResponse("{} {}", { requestId: "req_ambiguous" }).response.envelope.error.code === protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "Multiple JSON roots must be rejected.");
    check(parser.parseProviderResponse("Here is {} and then {}", { requestId: "req_ambiguous_2" }).response.envelope.error.code === protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "JSON roots embedded in prose must remain ambiguous.");
    check(parser.parseProviderResponse("```\n" + JSON.stringify(response) + "\n```").response.envelope.error.code === protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "An unlabelled fence must fail closed.");
    check(parser.parseProviderResponse("before\n```json\n" + JSON.stringify(response) + "\n```", { requestId: "req_fence_prose" }).response.envelope.error.code === protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "Fence-adjacent prose must be rejected.");
    check(parser.parseProviderResponse(" ", { requestId: "req_empty" }).response.envelope.error.code === protocol.ERROR_CODES.JSON_PARSE_FAILED, "Empty/whitespace provider output must fail.");
    check(parser.parseProviderResponse("Here is the answer: " + JSON.stringify(response)).response.envelope.error.code === protocol.ERROR_CODES.JSON_PARSE_FAILED, "Prose must not be searched for an implicit action.");
    check(parser.parseProviderResponse("```json\n{}\n```\n```json\n{}\n```", { requestId: "req_multi_fence" }).response.envelope.error.code === protocol.ERROR_CODES.FENCED_JSON_AMBIGUOUS, "Multiple fences must be rejected.");
    check(parser.parseProviderResponse('{"schemaVersion":"1.0","schemaVersion":"2.0"}', { requestId: "req_dup" }).response.envelope.error.code === protocol.ERROR_CODES.DUPLICATE_JSON_KEY, "Duplicate top-level keys must be rejected before JSON.parse.");
    check(parser.parseProviderResponse('{"a":{"x":1,"\\u0078":2}}', { requestId: "req_dup_nested" }).response.envelope.error.code === protocol.ERROR_CODES.DUPLICATE_JSON_KEY, "Duplicate escaped nested keys must be rejected.");

    const textResponse = makeResponse({ envelope: { type: "text", text: "The model can mention JSON and toolId without proposing an action." } });
    check(parser.parseProviderResponse(JSON.stringify(textResponse)).response.envelope.type === "text", "Text must not become an action envelope.");
    const candidateResponse = makeResponse({ envelope: { type: "actionCandidate", proposal: makeAction() } });
    check(parser.parseProviderResponse(JSON.stringify(candidateResponse)).ok === true, "The actionCandidate envelope should parse.");
    const errorResponse = makeResponse({ envelope: { type: "error", error: { code: protocol.ERROR_CODES.UNKNOWN_TOOL, stage: "action-validate", retryable: false, message: "Unknown local tool.", details: { toolId: "not-loaded" } } } });
    const parsedErrorResponse = parser.parseProviderResponse(JSON.stringify(errorResponse));
    check(parsedErrorResponse.ok === true, "The structured error envelope should parse.");
    check(parsedErrorResponse.response.envelope.error.message !== errorResponse.envelope.error.message, "Provider error messages must be replaced by stable local messages.");
    check(Object.isFrozen(parsedErrorResponse.response) && Object.isFrozen(parsedErrorResponse.response.envelope) && Object.isFrozen(parsedErrorResponse.response.envelope.error) && Object.isFrozen(parsedErrorResponse.response.envelope.error.details), "Canonical provider errors must be deeply frozen.");
    assert.throws(() => { parsedErrorResponse.response.envelope.error.details.toolId = "changed"; }, TypeError, "Frozen provider error details must reject mutation."); assertions += 1;
    const secretError = makeResponse({ envelope: { type: "error", error: { code: protocol.ERROR_CODES.UNKNOWN_TOOL, stage: "provider", retryable: false, message: "secret token source stack credential", details: { reason: "secret token source stack credential" } } } });
    const secretParsed = parser.parseProviderResponse(JSON.stringify(secretError));
    const secretSerialized = JSON.stringify(secretParsed.response);
    check(secretSerialized.indexOf("secret") === -1 && secretSerialized.indexOf("token") === -1 && secretSerialized.indexOf("credential") === -1, "Provider error source text must not enter canonical output.");
    check(!Object.prototype.hasOwnProperty.call(secretParsed.response.envelope, "proposal") && !Object.prototype.hasOwnProperty.call(secretParsed.response.envelope, "action") && !Object.prototype.hasOwnProperty.call(secretParsed.response.envelope, "candidate"), "Error envelopes must not carry executable fields.");
    const nativeFailure = protocol.createCanonicalErrorResponse(new Error("native secret stack token"), { requestId: "req_native" });
    check(JSON.stringify(nativeFailure).indexOf("native secret") === -1 && Object.isFrozen(nativeFailure.envelope.error.details), "Native Error message and stack must not leak into canonical errors.");
    const parserFailure = parser.parseProviderResponse("not-json", { requestId: "req_failure" });
    check(Object.isFrozen(parserFailure.error) && !("stack" in parserFailure.error), "Parser rejection must expose only a frozen canonical error record.");
    check(!Object.prototype.hasOwnProperty.call(errorResponse.envelope, "proposals"), "An error envelope must not carry proposals.");
    check(parser.parseProviderResponse(JSON.stringify(makeResponse({ schemaVersion: "2.0" }))).response.envelope.error.code === protocol.ERROR_CODES.SCHEMA_VERSION_UNSUPPORTED, "Unknown major versions must be rejected.");
    check(parser.parseProviderResponse(JSON.stringify(makeResponse({ envelope: { type: "plan", summary: "x", proposals: [makeAction({ payload: { toolId: "x", actionId: "x", params: { hostFunction: "bad" } } })] } }))).response.envelope.error.code === protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Dangerous nested action fields must be rejected.");
    check(parser.parseProviderResponse(JSON.stringify(makeResponse({ envelope: { type: "error", error: { code: protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, stage: "parse", retryable: false, message: "x", details: { source: "bad" } } } }))).response.envelope.error.code === protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Error details must reject source/code payloads.");

    expectCode(() => protocolModule.createProtocol({}), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Missing runtime capabilities must fail closed.");
    check(Object.isFrozen(protocol) && protocolModule.isTrustedProtocol(protocol), "Bound protocol instances must be frozen and module-authenticated.");
    expectCode(() => parserModule.createResponseParser(Object.assign({}, protocol)), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Duck-typed protocol clones must be rejected.");
    expectCode(() => protocolModule.createProtocol(Object.assign({}, runtime, { sha256Hex: () => "bad" })).sha256Hex("x"), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Invalid hash provider output must be rejected.");
    [
        "",
        "cand_" + "a".repeat(31),
        "cand_" + "a".repeat(97),
        "cand_" + "a".repeat(31) + " ",
        "cand_" + "a".repeat(31) + "/",
        "cand_" + "a".repeat(31) + "\\",
        "cand_" + "a".repeat(31) + ":",
        "cand_" + "a".repeat(31) + "\u4e2d",
        "cand_" + "a".repeat(31) + "\ud83d\ude00",
        "plan_" + "a".repeat(32)
    ].forEach((invalidId) => {
        expectCode(() => protocolModule.createProtocol(Object.assign({}, runtime, { randomId: () => invalidId })).randomId("cand"), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Invalid runtime ids must fail closed.");
    });
    expectCode(() => protocolModule.createProtocol(Object.assign({}, runtime, { randomId: () => { throw new Error("secret"); } })).randomId("cand"), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Runtime id exceptions must become stable errors.");
    check(/^cand_[a-z0-9]{32,96}$/.test(protocol.randomId("cand")), "The Node runtime adapter must return a valid ASCII local id.");
    check(/^req_[a-z0-9]{32,96}$/.test(protocol.randomId("req")), "The trusted protocol runtime must generate request ids.");
    [
        "",
        "req_" + "a".repeat(31),
        "req_" + "a".repeat(97),
        "req_" + "a".repeat(32) + " ",
        "req_" + "a".repeat(31) + "\u4e2d"
    ].forEach((invalidId) => {
        expectCode(() => protocolModule.createProtocol(Object.assign({}, runtime, { randomId: () => invalidId })).randomId("req"), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Invalid request ids must fail closed.");
    });
    expectCode(() => protocolModule.createProtocol(Object.assign({}, runtime, { randomId: () => "cand_" + "a".repeat(32) })).randomId("req"), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Runtime ids with the wrong kind must fail closed.");
    [
        "PROVIDER_CONFIG_INVALID", "PROVIDER_REQUEST_IN_FLIGHT", "PROVIDER_REQUEST_ABORTED", "PROVIDER_TIMEOUT",
        "PROVIDER_CONNECTION_FAILED", "PROVIDER_HTTP_ERROR", "PROVIDER_RESPONSE_INVALID", "PROVIDER_RESPONSE_TOO_LARGE"
    ].forEach((key) => {
        const providerError = protocol.createCanonicalErrorResponse(new protocol.VelaProtocolError(protocol.ERROR_CODES[key], "untrusted provider text", { stage: "provider" }), { requestId: "req_test", provider: "lmstudio", model: "test-model" });
        check(providerError.envelope.error.code === protocol.ERROR_CODES[key] && providerError.envelope.error.message.indexOf("untrusted") === -1, key + " must produce a stable canonical provider error.");
        check(protocol.validateCanonicalResponse(providerError).envelope.error.code === protocol.ERROR_CODES[key], key + " canonical provider errors must validate.");
    });
    ["CONTEXT_VALUE_EVALUATION_DISALLOWED", "CONTEXT_VALUE_UNSUPPORTED", "CONTEXT_VALUE_INVALID"].forEach((key) => {
        const contextError = protocol.createCanonicalErrorResponse(new protocol.VelaProtocolError(protocol.ERROR_CODES[key], "untrusted Host payload", { stage: "context-bridge" }), { requestId: "req_test", provider: "lmstudio", model: "test-model" });
        check(contextError.envelope.error.code === protocol.ERROR_CODES[key] && contextError.envelope.error.message.indexOf("untrusted") === -1, key + " must produce a safe canonical error.");
        check(protocol.validateCanonicalResponse(contextError).envelope.error.code === protocol.ERROR_CODES[key], key + " canonical errors must validate.");
    });
    const mutableRuntime = Object.assign({}, runtime);
    const snapshottedProtocol = protocolModule.createProtocol(mutableRuntime);
    mutableRuntime.utf8ByteLength = () => 0;
    mutableRuntime.randomId = () => "bad";
    check(snapshottedProtocol.utf8ByteLength("abc") === 3 && /^cand_[a-z0-9]{32,96}$/.test(snapshottedProtocol.randomId("cand")), "Protocol instances must snapshot injected runtime capabilities.");
    check(protocol.utf8ByteLength("中") === 3 && protocol.utf8ByteLength("🙂") === 4, "UTF-8 byte length must distinguish multibyte characters.");
    const genericAtLimit = "中".repeat(2730);
    check(protocol.assertString(genericAtLimit, "generic") === genericAtLimit, "Multibyte generic strings within the byte limit should pass.");
    expectCode(() => protocol.assertString(genericAtLimit + "中", "generic"), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Multibyte generic strings over the byte limit must fail.");
    expectCode(() => protocol.assertString("x".repeat(protocol.HARD_LIMITS.maxStringBytes + 1), "generic"), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Generic strings must be bounded.");
    expectCode(() => protocol.assertString("x".repeat(protocol.HARD_LIMITS.maxMessageBytes + 1), "message", protocol.HARD_LIMITS.maxMessageBytes), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Message strings must be bounded separately.");
    expectCode(() => protocol.canonicalStringify(new Array(protocol.HARD_LIMITS.maxArrayLength + 1).fill(0)), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Arrays must be bounded.");
    expectCode(() => protocol.canonicalStringify({ value: protocol.HARD_LIMITS.maxNumberAbs + 1 }), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Numbers must be bounded.");
    expectCode(() => protocol.canonicalStringify(-0), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Negative zero must be rejected.");
    expectCode(() => protocol.canonicalStringify(NaN), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "NaN must be rejected.");
    expectCode(() => protocol.canonicalStringify(Infinity), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Infinity must be rejected.");
    expectCode(() => protocol.canonicalStringify(undefined), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Undefined must be rejected, not dropped.");
    expectCode(() => protocol.canonicalStringify(1n), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "BigInt must be rejected.");
    expectCode(() => protocol.canonicalStringify(new Date()), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Date must be rejected.");
    expectCode(() => protocol.canonicalStringify(/x/), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "RegExp must be rejected.");
    expectCode(() => protocol.canonicalStringify(new Uint8Array([1])), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Typed arrays must be rejected.");
    expectCode(() => protocol.canonicalStringify(Object.create({ inherited: true })), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Custom prototypes must be rejected.");
    const accessor = {};
    Object.defineProperty(accessor, "value", { enumerable: true, get: () => 1 });
    expectCode(() => protocol.canonicalStringify(accessor), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Getters must not execute during canonicalization.");
    expectCode(() => protocol.canonicalStringify({ toJSON: "not executable data" }), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "toJSON-bearing objects must be rejected.");
    const cycle = {}; cycle.self = cycle;
    expectCode(() => protocol.canonicalStringify(cycle), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Cycles must be rejected explicitly.");
    const dangerous = JSON.parse('{"__proto__":{"polluted":true}}');
    expectCode(() => protocol.canonicalStringify(dangerous), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Parsed dangerous prototype keys must be rejected.");
    check(protocol.canonicalStringify({ b: 1, a: "e\u0301" }) === protocol.canonicalStringify({ a: "é", b: 1 }), "Canonical JSON must sort keys and normalize Unicode NFC.");
    check(protocol.sha256Canonical({ b: 1, a: 2 }).indexOf("sha256:") === 0, "Fingerprint output must use the canonical SHA-256 format.");

    let nested = {};
    for (let index = 0; index < protocol.HARD_LIMITS.maxNestedDepth + 2; index += 1) nested = { next: nested };
    expectCode(() => protocol.canonicalStringify(nested), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Nested JSON must be bounded.");
    expectCode(() => protocol.validateActionProposal(makeAction({ payload: { value: "x".repeat(protocol.HARD_LIMITS.maxActionPayloadBytes) } })), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Action payloads must be bounded.");

    const sourceRoot = path.join(__dirname, "..", "client", "js", "vela");
    fs.readdirSync(sourceRoot).filter((name) => name.endsWith(".js")).forEach((name) => {
        const source = fs.readFileSync(path.join(sourceRoot, name), "utf8");
        check(!/(?:require\(["'](?:crypto|fs|net|http|https)["']\)|Buffer\.|process\.|Date\.now\(|randomBytes\(|randomUUID\(|CSInterface|evalScript|\$\.evalFile|AEToolbox|\bapp\b|\bwindow\b|\bdocument\b|localStorage|fetch\(|XMLHttpRequest|WebSocket|\beval\(|\bFunction\s*\()/.test(source), name + " must remain environment-independent.");
    });

    const umdFiles = ["velaProtocol.js", "velaValidator.js", "velaPlan.js", "velaExecutionGuard.js", "velaContext.js", "velaContextBridge.js", "velaExecutionPreflight.js", "velaResponseParser.js"];
    function browserContext() {
        const context = { console, browserRuntime: runtime };
        context.self = context;
        vm.createContext(context);
        return context;
    }
    function loadUmd(context, name) {
        return vm.runInContext(fs.readFileSync(path.join(sourceRoot, name), "utf8"), context, { filename: name });
    }
    const browser = browserContext();
    umdFiles.forEach((name) => loadUmd(browser, name));
    check(typeof browser.require === "undefined" && typeof browser.Buffer === "undefined" && typeof browser.process === "undefined", "UMD modules must load without NodeIntegration globals.");
    const browserResult = vm.runInContext(`(function () {
        var p = VelaProtocol.createProtocol(browserRuntime);
        var fp = "sha256:" + "1".repeat(64);
        var sf = "sha256:" + "2".repeat(64);
        var parser = VelaResponseParser.createResponseParser(p);
        var parsed = parser.parseProviderResponse(JSON.stringify({ protocol: p.PROTOCOLS.RESPONSE, schemaVersion: p.SCHEMA_VERSION, requestId: "r", provider: "p", model: "m", envelope: { type: "text", text: "ok" } }));
        var rejected = parser.parseProviderResponse("not-json");
        var validator = VelaValidator.createActionValidator(p, { registry: { t: { id: "t", actions: { a: { id: "a", executable: true, risk: "read", targetScope: ["layer"], capabilityRevision: "v1", paramsSchema: { type: "object", additionalProperties: false, properties: {} } } } } } });
        var action = validator.validateActionProposal({ providerActionId: "p1", kind: "tool", title: "t", rationale: "r", risk: "read", target: { contextFingerprint: fp, layerId: "l1" }, payload: { toolId: "t", actionId: "a", params: {} }, undoGroupLabel: "u", requiresConfirmation: false }).action;
        var store = VelaPlan.createPlanStore(p, { validatorAuthority: validator.authority, now: function () { return 1; } });
        var permission = { mode: "confirm-every-action", grants: [], policyRevision: "p1" };
        var plan = store.createPlan({ validatedActions: [action], contextFingerprint: fp, settingsFingerprint: sf, permissionSnapshot: permission });
        var confirmed = store.confirmPlan(plan.planId, { contextFingerprint: fp, settingsFingerprint: sf, permissionSnapshot: permission });
        var candidate = store.getCandidate(confirmed.candidateIds[0]);
        var current = { lifecycle: "active", planRevision: plan.planRevision, totalSteps: 1, confirmationNonce: candidate.confirmationNonce, permissionSnapshot: permission, contextFingerprint: fp, settingsFingerprint: sf, hasVerifier: true };
        var guard = VelaExecutionGuard.createExecutionGuard(store);
        var checked = guard.check(plan.planId, 0, current);
        var reserved = guard.reserve(plan.planId, 0, current);
        var completed = guard.complete(reserved.reservation, { ok: true });
        return { parsed: parsed.ok, rejected: rejected.error.code, checked: checked.ok, completed: completed.state, preflight: typeof VelaExecutionPreflight.createExecutionPreflight === "function" };
    }())`, browser);
    check(browserResult.parsed === true && browserResult.rejected === protocol.ERROR_CODES.JSON_PARSE_FAILED && browserResult.checked === true && browserResult.completed === "consumed" && browserResult.preflight === true, "UMD smoke test must exercise parser, validator, PlanStore, ExecutionGuard and register ExecutionPreflight in dependency order.");
    const originalGlobals = {
        VelaProtocol: browser.VelaProtocol,
        VelaResponseParser: browser.VelaResponseParser,
        VelaContext: browser.VelaContext,
        VelaValidator: browser.VelaValidator,
        VelaPlan: browser.VelaPlan,
        VelaExecutionGuard: browser.VelaExecutionGuard,
        VelaContextBridge: browser.VelaContextBridge,
        VelaExecutionPreflight: browser.VelaExecutionPreflight
    };
    let duplicateProtocolCode = null;
    try { loadUmd(browser, "velaProtocol.js"); } catch (error) { duplicateProtocolCode = error.code; }
    check(duplicateProtocolCode === protocol.ERROR_CODES.MODULE_ALREADY_REGISTERED && browser.VelaProtocol === originalGlobals.VelaProtocol, "Repeated protocol loading must fail without replacing its identity.");
    let duplicateValidatorCode = null;
    try { loadUmd(browser, "velaValidator.js"); } catch (error) { duplicateValidatorCode = error.code; }
    check(duplicateValidatorCode === protocol.ERROR_CODES.MODULE_ALREADY_REGISTERED && browser.VelaValidator === originalGlobals.VelaValidator, "Repeated dependent loading must fail without replacing its identity.");
    let duplicatePreflightCode = null;
    try { loadUmd(browser, "velaExecutionPreflight.js"); } catch (error) { duplicatePreflightCode = error.code; }
    check(duplicatePreflightCode === protocol.ERROR_CODES.MODULE_ALREADY_REGISTERED && browser.VelaExecutionPreflight === originalGlobals.VelaExecutionPreflight, "Repeated ExecutionPreflight loading must fail without replacing its identity.");
    const wrongOrder = browserContext();
    let wrongOrderCode = null;
    try { loadUmd(wrongOrder, "velaResponseParser.js"); } catch (error) { wrongOrderCode = error.code; }
    check(wrongOrderCode === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Wrong UMD dependency order must produce a stable error code.");
    const conflict = browserContext();
    const existingConflict = { existing: true };
    conflict.VelaProtocol = existingConflict;
    let conflictCode = null;
    try { loadUmd(conflict, "velaProtocol.js"); } catch (error) { conflictCode = error.code; }
    check(conflictCode === protocol.ERROR_CODES.MODULE_BOOTSTRAP_CONFLICT && conflict.VelaProtocol === existingConflict && conflict.__velaProtocolCoreBootstrapV1 === undefined, "UMD global conflicts must fail without creating a bootstrap.");

    const preempted = browserContext();
    const fakeProtocol = { createProtocol: () => ({ fake: true }), isTrustedProtocol: () => true, ERROR_CODES: {} };
    preempted.VelaProtocol = fakeProtocol;
    preempted.__velaProtocolCoreModulesV1 = { VelaProtocol: fakeProtocol };
    let preemptedCode = null;
    try { loadUmd(preempted, "velaProtocol.js"); } catch (error) { preemptedCode = error.code; }
    check(preemptedCode === protocol.ERROR_CODES.MODULE_BOOTSTRAP_CONFLICT && preempted.VelaProtocol === fakeProtocol && preempted.__velaProtocolCoreBootstrapV1 === undefined, "Matching fake global and legacy registry entries must never be adopted.");

    const fakeBootstrapContext = browserContext();
    let fakeBootstrapCalled = false;
    const fakeBootstrap = { registerModule: () => { fakeBootstrapCalled = true; }, getModule: () => { fakeBootstrapCalled = true; }, hasModule: () => false };
    fakeBootstrapContext.__velaProtocolCoreBootstrapV1 = fakeBootstrap;
    let fakeBootstrapCode = null;
    try { loadUmd(fakeBootstrapContext, "velaProtocol.js"); } catch (error) { fakeBootstrapCode = error.code; }
    check(fakeBootstrapCode === protocol.ERROR_CODES.MODULE_BOOTSTRAP_CONFLICT && fakeBootstrapCalled === false && fakeBootstrapContext.__velaProtocolCoreBootstrapV1 === fakeBootstrap, "A pre-seeded bootstrap name must be rejected without invoking attacker methods.");
    const dependentConflict = browserContext();
    loadUmd(dependentConflict, "velaProtocol.js");
    dependentConflict.VelaResponseParser = { existing: true };
    const existingParserGlobal = dependentConflict.VelaResponseParser;
    let dependentConflictCode = null;
    try { loadUmd(dependentConflict, "velaResponseParser.js"); } catch (error) { dependentConflictCode = error.code; }
    check(dependentConflictCode === protocol.ERROR_CODES.MODULE_BOOTSTRAP_CONFLICT && dependentConflict.VelaResponseParser === existingParserGlobal && dependentConflict.__velaProtocolCoreBootstrapV1.hasModule("VelaResponseParser") === false, "Dependent UMD conflicts must reject replacement without partial registration.");

    const fakeWrongOrder = browserContext();
    fakeWrongOrder.VelaProtocol = fakeProtocol;
    let fakeWrongOrderCode = null;
    try { loadUmd(fakeWrongOrder, "velaValidator.js"); } catch (error) { fakeWrongOrderCode = error.code; }
    check(fakeWrongOrderCode === protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE && fakeWrongOrder.VelaValidator === undefined, "Dependent modules must not trust same-name globals without the real bootstrap.");

    console.log("PASS Vela protocol: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela protocol - " + error.message);
    process.exitCode = 1;
}
