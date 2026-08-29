#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const sessionRuntime = require("../client/js/vela/velaSessionRuntime");
const planning = require("../client/js/vela/velaPlanningContracts");
const resolverModule = require("../client/js/vela/velaAuthorityEvidenceResolver");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectCode(fn, code, message) { assert.throws(fn, error => error && error.code === code, message); assertions += 1; }

function browserSmoke() {
    const sandbox = { Object, Error, Date, Map, WeakMap, WeakSet, Number, Boolean, String, Array, RegExp, JSON };
    sandbox.self = sandbox; sandbox.window = sandbox;
    ["velaSessionRuntime", "velaPlanningContracts", "velaAuthorityEvidenceResolver"].forEach(name => {
        vm.runInNewContext(fs.readFileSync(require.resolve("../client/js/vela/" + name), "utf8"), sandbox, { filename: name + ".js" });
    });
    check(typeof sandbox.VelaAuthorityEvidenceResolver.createAuthorityEvidenceResolver === "function", "CEP-like UMD resolver registration works without loader wiring.");
}

function run() {
    const C = resolverModule.ERROR_CODES;
    browserSmoke();
    const session = sessionRuntime.createSessionLog({ sessionId: "session_evidence" });
    const appender = sessionRuntime.createAuthorityEventAppender(session);
    const resolver = resolverModule.createAuthorityEvidenceResolver({ session });
    const permission = appender.append({ kind: "permission/decided", requestId: "req_1", payload: { decision: "approved", issuedBy: "local-user" } });
    const granted = appender.append({ kind: "delegation/granted", requestId: "req_1", payload: { grantId: "grant_1", taskId: "task_1", issuedBy: "local-user" } });
    const revoked = appender.append({ kind: "delegation/revoked", requestId: "req_2", payload: { grantId: "grant_1", taskId: "task_1", issuedBy: "local-user" } });
    const armed = appender.append({ kind: "task/execution-armed", requestId: "req_3", payload: { taskRunId: "task_run_1" } });

    function resolve(event) { return resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: event.seq, eventKind: event.kind, requestId: event.requestId }); }
    const permissionEvidence = resolve(permission);
    const grantEvidence = resolve(granted);
    const revokeEvidence = resolve(revoked);
    const armedEvidence = resolve(armed);
    check(planning.isAuthorityEvidence(permissionEvidence) && permissionEvidence.eventKind === "permission/decided", "permission/decided resolves from a real trusted record.");
    check(grantEvidence.eventKind === "delegation/granted", "delegation/granted resolves.");
    check(revokeEvidence.eventKind === "delegation/revoked", "delegation/revoked resolves.");
    check(armedEvidence.eventKind === "task/execution-armed", "task/execution-armed fixture resolves without a producer or TaskRun wiring.");
    check(Object.isFrozen(grantEvidence), "AuthorityEvidence is immutable.");
    resolver.verifyEvidenceReference(grantEvidence, { eventKind: "delegation/granted", grantId: "grant_1", taskId: "task_1", requestId: "req_1" }); assertions += 1;

    expectCode(() => resolver.resolveEvidence({ kind: "delegation/granted", seq: granted.seq }), C.EVIDENCE_REFERENCE_INVALID, "Raw event-shaped JSON is rejected.");
    expectCode(() => resolver.verifyEvidenceReference(Object.assign({}, grantEvidence)), C.EVIDENCE_UNTRUSTED, "Copied evidence loses module-private identity.");
    expectCode(() => resolver.verifyEvidenceReference(Object.assign({}, grantEvidence, { eventKind: "delegation/revoked" })), C.EVIDENCE_UNTRUSTED, "Copied and modified evidence is rejected.");
    expectCode(() => resolver.resolveEvidence({ sessionId: "session_other", seq: granted.seq, eventKind: granted.kind }), C.EVIDENCE_SESSION_MISMATCH, "Wrong session is rejected.");
    expectCode(() => resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: 999, eventKind: granted.kind }), C.EVIDENCE_EVENT_NOT_FOUND, "Unknown seq is rejected.");
    expectCode(() => resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: granted.seq, eventKind: "delegation/revoked" }), C.EVIDENCE_KIND_MISMATCH, "Kind mismatch is rejected.");

    const derived = session.append({ kind: "summary/created", requestId: "req_d", payload: {} });
    expectCode(() => resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: derived.seq, eventKind: derived.kind }), C.EVIDENCE_KIND_INELIGIBLE, "DerivedEvent can never become AuthorityEvidence.");
    expectCode(() => resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: 1, eventKind: "unknown/kind" }), C.EVIDENCE_KIND_INELIGIBLE, "Unknown event kind is rejected.");
    const modelShaped = session.append({ kind: "delegation/granted", requestId: "req_model", payload: { grantId: "fake" } });
    expectCode(() => resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: modelShaped.seq, eventKind: modelShaped.kind }), C.EVIDENCE_UNTRUSTED, "A model-shaped public append cannot become trusted evidence.");

    const otherSession = sessionRuntime.createSessionLog({ sessionId: "session_other" });
    const otherAppender = sessionRuntime.createAuthorityEventAppender(otherSession);
    const otherResolver = resolverModule.createAuthorityEvidenceResolver({ session: otherSession });
    const otherPermission = otherAppender.append({ kind: "permission/decided", requestId: "req_other", payload: { decision: "approved", issuedBy: "local-user" } });
    const otherEvidence = otherResolver.resolveEvidence({ sessionId: "session_other", seq: otherPermission.seq, eventKind: otherPermission.kind, requestId: otherPermission.requestId });
    expectCode(() => resolver.verifyEvidenceReference(otherEvidence), C.EVIDENCE_SESSION_MISMATCH, "Permission evidence from another Session is rejected.");
    expectCode(() => resolver.verifyEvidenceReference(grantEvidence, { grantId: "wrong" }), C.EVIDENCE_REFERENCE_INVALID, "Grant correlation mismatch is rejected.");
    expectCode(() => resolver.verifyEvidenceReference(grantEvidence, { taskId: "wrong" }), C.EVIDENCE_REFERENCE_INVALID, "Task correlation mismatch is rejected.");

    const beforeEvents = session.getEvents().length;
    resolver.verifyEvidenceReference(permissionEvidence); assertions += 1;
    resolver.verifyEvidenceReference(permissionEvidence); assertions += 1;
    check(session.getEvents().length === beforeEvents, "Evidence resolution and verification are side-effect free.");

    session.close();
    expectCode(() => resolver.verifyEvidenceReference(grantEvidence), C.EVIDENCE_SESSION_UNAVAILABLE, "Closed Session evidence fails closed.");
    expectCode(() => resolver.resolveEvidence({ sessionId: "session_evidence", seq: granted.seq, eventKind: granted.kind }), C.EVIDENCE_SESSION_UNAVAILABLE, "Closed Session cannot resolve new evidence.");

    console.log("PASS Vela AuthorityEvidenceResolver: " + assertions + " assertions.");
}

run();
