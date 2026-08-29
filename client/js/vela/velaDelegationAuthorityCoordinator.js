(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaPlanningContracts, root.VelaSessionRuntime, root.VelaDelegationGrantStore, root.VelaAuthorityEvidenceResolver));
        if (Object.prototype.hasOwnProperty.call(root, "VelaDelegationAuthorityCoordinator") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaDelegationAuthorityCoordinator", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaPlanningContracts"), require("./velaSessionRuntime"), require("./velaDelegationGrantStore"), require("./velaAuthorityEvidenceResolver")));
    }
}(typeof self !== "undefined" ? self : this, function (planning, sessionRuntime, grantStoreModule, evidenceResolverModule) {
    "use strict";

    var MODULE_REVISION = "vela-delegation-authority-coordinator-v1";
    var ERROR_CODES = Object.freeze({
        AUTHORITY_COORDINATOR_INVALID_OPTIONS: "AUTHORITY_COORDINATOR_INVALID_OPTIONS",
        AUTHORITY_TRANSITION_INVALID: "AUTHORITY_TRANSITION_INVALID",
        AUTHORITY_PERMISSION_EVIDENCE_REQUIRED: "AUTHORITY_PERMISSION_EVIDENCE_REQUIRED",
        AUTHORITY_EVIDENCE_APPEND_FAILED: "AUTHORITY_EVIDENCE_APPEND_FAILED",
        AUTHORITY_ISSUE_ROLLED_BACK: "AUTHORITY_ISSUE_ROLLED_BACK",
        AUTHORITY_ROLLBACK_EVIDENCE_FAILED: "AUTHORITY_ROLLBACK_EVIDENCE_FAILED",
        AUTHORITY_ROLLBACK_FAILED: "AUTHORITY_ROLLBACK_FAILED",
        AUTHORITY_TRANSITION_NOT_ACTIVE: "AUTHORITY_TRANSITION_NOT_ACTIVE"
    });

    function fail(code, message, details) { var error = new Error(message || code); error.code = code; if (details) { error.details = details; } throw error; }
    function isPlainObject(value) { return Boolean(value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }
    function samePayload(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

    function createDelegationAuthorityCoordinator(options) {
        if (!isPlainObject(options) || Object.keys(options).some(function (key) { return ["grantStore", "session", "authorityAppender", "evidenceResolver", "issuerId"].indexOf(key) === -1; })) { fail(ERROR_CODES.AUTHORITY_COORDINATOR_INVALID_OPTIONS); }
        var grantStore = options.grantStore;
        var session = options.session;
        var authorityAppender = options.authorityAppender;
        var resolver = options.evidenceResolver;
        var issuerId = options.issuerId;
        if (!grantStoreModule.isTrustedDelegationGrantStore(grantStore) || !sessionRuntime.isTrustedSessionLog(session) || !sessionRuntime.isTrustedAuthorityEventAppenderForSession(authorityAppender, session) || !evidenceResolverModule.isTrustedAuthorityEvidenceResolver(resolver) || resolver.getSessionId() !== session.getSessionId() || typeof issuerId !== "string" || issuerId.length === 0) {
            fail(ERROR_CODES.AUTHORITY_COORDINATOR_INVALID_OPTIONS);
        }

        function assertSessionOpen() { if (session.isClosed()) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Authority Session is unavailable."); } }
        function appendRecoverable(kind, requestId, payload) {
            var expectedSeq = session.getSnapshot().lastSeq + 1;
            var event;
            try { return authorityAppender.append({ kind: kind, requestId: requestId, payload: payload }); }
            catch (error) {
                event = session.getEventBySeq(expectedSeq);
                if (event && event.kind === kind && event.requestId === requestId && samePayload(event.payload, payload)) { return event; }
                fail(ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Authority evidence append failed.");
            }
        }
        function issueGrant(input) {
            var permissionEvent;
            var issued;
            var event;
            var evidence;
            var requestId;
            if (!isPlainObject(input) || Object.keys(input).some(function (key) { return ["spec", "permissionEvidence"].indexOf(key) === -1; }) || !isPlainObject(input.spec)) { fail(ERROR_CODES.AUTHORITY_TRANSITION_INVALID); }
            assertSessionOpen();
            try { permissionEvent = resolver.getVerifiedEvent(input.permissionEvidence); }
            catch (errorPermission) { fail(ERROR_CODES.AUTHORITY_PERMISSION_EVIDENCE_REQUIRED); }
            if (permissionEvent.kind !== "permission/decided" || permissionEvent.payload.decision !== "approved" || permissionEvent.payload.issuedBy !== issuerId || permissionEvent.payload.taskId !== input.spec.taskId) { fail(ERROR_CODES.AUTHORITY_PERMISSION_EVIDENCE_REQUIRED); }
            requestId = input.spec.provenance && input.spec.provenance.requestId;
            if (typeof requestId !== "string" || requestId !== permissionEvent.requestId) { fail(ERROR_CODES.AUTHORITY_PERMISSION_EVIDENCE_REQUIRED); }
            issued = grantStore.issue(input.spec);
            try {
                event = appendRecoverable("delegation/granted", requestId, {
                    grantId: issued.grant.grantId,
                    taskId: issued.grant.taskId,
                    capabilityId: issued.grant.capabilityId,
                    operationKind: issued.grant.operationKind,
                    scopeType: issued.grant.targetScope && issued.grant.targetScope.type,
                    issuedBy: issuerId,
                    permissionSeq: permissionEvent.seq
                });
            } catch (appendError) {
                try { grantStore.revoke(issued.grant.grantId); }
                catch (rollbackError) { fail(ERROR_CODES.AUTHORITY_ROLLBACK_FAILED, "Grant issuance append failed and Store rollback failed.", { grantId: issued.grant.grantId, authorityState: "unknown" }); }
                fail(ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Grant issuance event was not appended; grant was revoked.", { grantId: issued.grant.grantId, authorityState: "revoked", grantedEventAppended: false });
            }
            try { evidence = resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: event.seq, eventKind: event.kind, requestId: event.requestId }); }
            catch (resolveError) {
                try { grantStore.revoke(issued.grant.grantId); }
                catch (rollbackErrorResolved) { fail(ERROR_CODES.AUTHORITY_ROLLBACK_FAILED, "Grant evidence resolution failed and Store rollback failed.", { grantId: issued.grant.grantId, authorityState: "unknown", grantedEventAppended: true }); }
                try {
                    var rollbackEvent = appendRecoverable("delegation/revoked", requestId, { grantId: issued.grant.grantId, taskId: issued.grant.taskId, issuedBy: issuerId, rollbackReason: "granted-evidence-resolution-failed" });
                    fail(ERROR_CODES.AUTHORITY_ISSUE_ROLLED_BACK, "Grant evidence resolution failed; grant was revoked and rollback evidence was appended.", { grantId: issued.grant.grantId, authorityState: "revoked", grantedEventAppended: true, rollbackEventSeq: rollbackEvent.seq });
                } catch (rollbackEvidenceError) {
                    if (rollbackEvidenceError && rollbackEvidenceError.code === ERROR_CODES.AUTHORITY_ISSUE_ROLLED_BACK) { throw rollbackEvidenceError; }
                    fail(ERROR_CODES.AUTHORITY_ROLLBACK_EVIDENCE_FAILED, "Grant was revoked, but rollback evidence could not be appended.", { grantId: issued.grant.grantId, authorityState: "revoked", grantedEventAppended: true });
                }
            }
            return Object.freeze({ grant: issued, evidence: evidence });
        }
        function revokeGrant(input) {
            var active;
            var revoked;
            var event;
            var evidence;
            if (!isPlainObject(input) || Object.keys(input).some(function (key) { return ["grantId", "taskId", "requestId"].indexOf(key) === -1; }) || typeof input.grantId !== "string" || typeof input.requestId !== "string") { fail(ERROR_CODES.AUTHORITY_TRANSITION_INVALID); }
            try { active = grantStore.lookup(input.grantId); }
            catch (errorLookup) { fail(ERROR_CODES.AUTHORITY_TRANSITION_NOT_ACTIVE); }
            if (active.grant.taskId !== null && active.grant.taskId !== input.taskId) { fail(ERROR_CODES.AUTHORITY_TRANSITION_INVALID); }
            revoked = grantStore.revoke(input.grantId);
            try {
                assertSessionOpen();
                event = appendRecoverable("delegation/revoked", input.requestId, { grantId: input.grantId, taskId: active.grant.taskId, issuedBy: issuerId });
            } catch (appendError) {
                fail(ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Grant is revoked but revocation evidence append failed.", { grantId: input.grantId, authorityState: "revoked" });
            }
            try { evidence = resolver.resolveEvidence({ sessionId: session.getSessionId(), seq: event.seq, eventKind: event.kind, requestId: event.requestId }); }
            catch (errorEvidence) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_APPEND_FAILED, "Grant is revoked but revocation evidence is unavailable.", { grantId: input.grantId, authorityState: "revoked" }); }
            return Object.freeze({ grant: revoked, evidence: evidence });
        }

        return Object.freeze({ issueGrant: issueGrant, revokeGrant: revokeGrant });
    }

    return Object.freeze({ ERROR_CODES: ERROR_CODES, MODULE_REVISION: MODULE_REVISION, createDelegationAuthorityCoordinator: createDelegationAuthorityCoordinator });
}));
