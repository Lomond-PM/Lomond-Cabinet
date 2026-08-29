(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaPlanningContracts, root.VelaSessionRuntime));
        if (Object.prototype.hasOwnProperty.call(root, "VelaAuthorityEvidenceResolver") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaAuthorityEvidenceResolver", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaPlanningContracts"), require("./velaSessionRuntime")));
    }
}(typeof self !== "undefined" ? self : this, function (planning, sessionRuntime) {
    "use strict";

    var MODULE_REVISION = "vela-authority-evidence-resolver-v1";
    var ERROR_CODES = Object.freeze({
        EVIDENCE_RESOLVER_INVALID_OPTIONS: "EVIDENCE_RESOLVER_INVALID_OPTIONS",
        EVIDENCE_REFERENCE_INVALID: "EVIDENCE_REFERENCE_INVALID",
        EVIDENCE_SESSION_MISMATCH: "EVIDENCE_SESSION_MISMATCH",
        EVIDENCE_EVENT_NOT_FOUND: "EVIDENCE_EVENT_NOT_FOUND",
        EVIDENCE_KIND_MISMATCH: "EVIDENCE_KIND_MISMATCH",
        EVIDENCE_KIND_INELIGIBLE: "EVIDENCE_KIND_INELIGIBLE",
        EVIDENCE_SESSION_UNAVAILABLE: "EVIDENCE_SESSION_UNAVAILABLE",
        EVIDENCE_UNTRUSTED: "EVIDENCE_UNTRUSTED"
    });
    var trustedResolvers = new WeakSet();
    var trustedEvidence = new WeakMap();

    function fail(code, message) { var error = new Error(message || code); error.code = code; throw error; }
    function isPlainObject(value) { return Boolean(value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }

    function createAuthorityEvidenceResolver(options) {
        if (!isPlainObject(options) || Object.keys(options).some(function (key) { return key !== "session"; })) { fail(ERROR_CODES.EVIDENCE_RESOLVER_INVALID_OPTIONS); }
        var session = options.session;
        if (!sessionRuntime.isTrustedSessionLog(session) || typeof session.getEventBySeq !== "function") { fail(ERROR_CODES.EVIDENCE_RESOLVER_INVALID_OPTIONS); }
        var sessionId = session.getSessionId();

        function assertSessionAvailable() {
            if (session.isClosed()) { fail(ERROR_CODES.EVIDENCE_SESSION_UNAVAILABLE, "Authority evidence Session is closed."); }
        }
        function resolveEvidence(input) {
            var event;
            var evidence;
            assertSessionAvailable();
            if (!isPlainObject(input) || Object.keys(input).some(function (key) { return ["sessionId", "seq", "eventKind", "requestId"].indexOf(key) === -1; })) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
            if (input.sessionId !== sessionId) { fail(ERROR_CODES.EVIDENCE_SESSION_MISMATCH); }
            if (typeof input.seq !== "number" || !Number.isInteger(input.seq) || input.seq < 1) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
            if (typeof input.eventKind !== "string" || !sessionRuntime.isSessionEventKind(input.eventKind)) { fail(ERROR_CODES.EVIDENCE_KIND_INELIGIBLE); }
            if (!sessionRuntime.isAuthorityEvidenceKind(input.eventKind)) { fail(ERROR_CODES.EVIDENCE_KIND_INELIGIBLE); }
            event = session.getEventBySeq(input.seq);
            if (!event) { fail(ERROR_CODES.EVIDENCE_EVENT_NOT_FOUND); }
            if (event.kind !== input.eventKind) { fail(ERROR_CODES.EVIDENCE_KIND_MISMATCH); }
            if (!sessionRuntime.isTrustedAuthorityEvent(event)) { fail(ERROR_CODES.EVIDENCE_UNTRUSTED); }
            if (input.requestId !== undefined && input.requestId !== event.requestId) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
            evidence = planning.createAuthorityEvidence({ eventKind: event.kind, seq: event.seq, requestId: event.requestId === null ? undefined : event.requestId, evidenceType: "authority-evidence" });
            trustedEvidence.set(evidence, { resolver: resolver, session: session, sessionId: sessionId, event: event });
            return evidence;
        }
        function verifyEvidenceReference(evidence, expectations) {
            var identity;
            var current;
            assertSessionAvailable();
            if (!trustedEvidence.has(evidence)) { fail(ERROR_CODES.EVIDENCE_UNTRUSTED); }
            identity = trustedEvidence.get(evidence);
            if (identity.resolver !== resolver || identity.session !== session || identity.sessionId !== sessionId) { fail(ERROR_CODES.EVIDENCE_SESSION_MISMATCH); }
            current = session.getEventBySeq(identity.event.seq);
            if (current !== identity.event || !sessionRuntime.isTrustedAuthorityEvent(current) || current.kind !== evidence.eventKind || current.seq !== evidence.seq) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
            if (expectations !== undefined) {
                if (!isPlainObject(expectations) || Object.keys(expectations).some(function (key) { return ["eventKind", "grantId", "taskId", "requestId"].indexOf(key) === -1; })) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
                if (expectations.eventKind !== undefined && expectations.eventKind !== current.kind) { fail(ERROR_CODES.EVIDENCE_KIND_MISMATCH); }
                if (expectations.requestId !== undefined && expectations.requestId !== current.requestId) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
                if (expectations.grantId !== undefined && expectations.grantId !== current.payload.grantId) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
                if (expectations.taskId !== undefined && expectations.taskId !== current.payload.taskId) { fail(ERROR_CODES.EVIDENCE_REFERENCE_INVALID); }
            }
            return evidence;
        }
        function getVerifiedEvent(evidence) {
            verifyEvidenceReference(evidence);
            return trustedEvidence.get(evidence).event;
        }
        var resolver = Object.freeze({ getSessionId: function () { return sessionId; }, getVerifiedEvent: getVerifiedEvent, resolveEvidence: resolveEvidence, verifyEvidenceReference: verifyEvidenceReference });
        trustedResolvers.add(resolver);
        return resolver;
    }

    return Object.freeze({ ERROR_CODES: ERROR_CODES, MODULE_REVISION: MODULE_REVISION, createAuthorityEvidenceResolver: createAuthorityEvidenceResolver, isTrustedAuthorityEvidenceResolver: function (resolver) { return Boolean(resolver && trustedResolvers.has(resolver)); } });
}));
