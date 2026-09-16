(function (root, factory) {
    "use strict";

    var MODULE_NAME = "VelaAgentRuntimeOwner";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var agentRuntime = null;
    var agentDriver = null;
    var exported;

    if (browserPage) {
        agentRuntime = root.VelaAgentRuntime;
        agentDriver = root.VelaAgentDriver;
    } else if (typeof module === "object" && module.exports) {
        agentRuntime = require("./velaAgentRuntime");
        agentDriver = require("./velaAgentDriver");
    }

    exported = Object.freeze(factory(agentRuntime, agentDriver));
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = exported;
    }
}(typeof self !== "undefined" ? self : this, function (defaultAgentRuntime, defaultAgentDriver) {
    "use strict";

    // Reporting-only provenance, separate from every Authority/native registry.
    var selectionSources = new WeakMap();
    var selectionSamples = new WeakMap();
    function sampleSelectionSource(port, exactSession) {
        var read = selectionSources.get(port);
        if (!read) { return null; }
        var sample = read(false, exactSession);
        if (sample) { selectionSamples.set(sample, function () { return read(false, exactSession); }); }
        return sample;
    }
    function isSelectionSampleCurrent(sample) {
        var read = selectionSamples.get(sample), current = read && read();
        return !!current && current.sessionId === sample.sessionId && current.objectiveId === sample.objectiveId;
    }
    function isSelectionSourceLive(port) { var read = selectionSources.get(port); return !!read && read(true) === true; }
    var MODULE_REVISION = "vela-agent-runtime-owner-0.3.3-v1";
    var ERROR_CODES = Object.freeze({
        AGENT_OWNER_RUNTIME_UNAVAILABLE: "AGENT_OWNER_RUNTIME_UNAVAILABLE"
    });

    function fail(code) {
        var error = new Error(code);
        error.code = code;
        throw error;
    }

    function isPlainObject(value) {
        if (!value || Object.prototype.toString.call(value) !== "[object Object]") { return false; }
        var prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
    }

    var TRAJECTORY_SCHEMA = "vela.verified-trajectory-evidence.v1";
    var UNKNOWN_REASONS = ["not-applicable", "not-observed", "not-wired", "legacy-information-loss", "host-not-invoked", "commit-uncertain", "source-reduced", "target-correlation-unproven", "verification-result-unavailable", "cancelled-before-settlement", "late-result-not-retained", "owner-invalidated", "value-omitted-by-bound", "projection-capacity-exceeded"];
    function trajectoryError() { throw new Error("TRAJECTORY_INPUT_INVALID"); }
    function bytes(text) { var size = 0; for (var i = 0; i < text.length; i++) { var c = text.charCodeAt(i); if (c < 128) { size++; } else if (c < 2048) { size += 2; } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { size += 4; i++; } else { size += 3; } } return size; }
    function freezeData(value) { if (value && typeof value === "object") { Object.keys(value).forEach(function (key) { freezeData(value[key]); }); Object.freeze(value); } return value; }
    function own(value, key) { var d = Object.getOwnPropertyDescriptor(value, key); if (!d || !Object.prototype.hasOwnProperty.call(d, "value")) { trajectoryError(); } return d.value; }
    function label(value) { if (typeof value !== "string" || !value.length || bytes(value) > 256) { trajectoryError(); } return value; }
    var outcome = ["active", "completed", "rejected", "cancelled", "blocked", "unknown"];
    var unknownShape = { path: "id", reason: UNKNOWN_REASONS };
    var sourceShape = { factPaths: { list: "id", max: 32 }, class: ["local-control-occurrence", "execution-result", "host-commit-evidence", "fresh-verify-evidence", "derived-objective-summary"], producer: ["VelaAgentDriver", "VelaRuntime", "VelaExecutionPreflight", "VelaExecutionAdapter", "VelaPlanController"], contractRevision: "id?", occurrenceId: "id", sourceRequestId: "id?", sourceSessionSeq: "int?", strength: ["direct", "reduced", "derived"] };
    var attemptShape = {
        attemptId: "id", correlation: { taskPlanId: "id", taskPlanRevision: "int", materializedStepId: "id", intentId: "id", logicalStepId: "id?", logicalStepIndex: "int?", materializationAttempt: "int?", turnId: "id?", taskRunId: "id?", authorizedPlanId: "id?", executionPlanId: "id?", actionIndex: "int?", providerRequestId: "id?", supersedesAttemptId: "id?" },
        capabilityId: "id", target: { targetRef: "id?", targetKind: ["property", "layer-attribute", "unknown"] },
        intent: { submitted: "tri", admitted: "tri", review: ["not-required", "pending", "approved", "rejected", "unknown"] },
        execution: { executionAttempted: "tri", hostInvocationAttempted: "tri", mutationDisposition: ["mutated", "already-satisfied", "not-mutated", "unknown"], reportedCommitted: "tri", hostCommitted: "tri", resultCode: "id?", resultingValueDigest: "id?" },
        verification: { attemptId: "id?", sourceObservationId: "id?", attempted: "tri", disposition: ["verified-match", "verified-mismatch", "verification-unavailable", "verification-not-run", "unknown"], scope: ["committed-target", "current-selection", "unknown"], targetRelation: ["committed-target", "unproven"], freshAtRead: "tri", matches: "tri", expected: "value?", actual: "value?", actualDigest: "id?", code: "id?" },
        completion: { outcome: outcome, superseded: "bool" }, provenance: { list: sourceShape, max: 1024 }, unknowns: { list: unknownShape, max: 1024 }
    };
    var projectionShape = {
        schema: [TRAJECTORY_SCHEMA], authorityCapable: [false], projectionId: "id", supersedesProjectionId: "id?",
        objective: { sessionId: "id", objectiveId: "id", taskId: "id", logicalPlanId: "id?" }, lifecycle: { state: ["active", "terminal"], lateEvidence: [false] },
        attempts: { list: attemptShape, max: 1024 },
        completion: { outcome: outcome, code: "id?", coverage: ["none", "partial", "full", "unknown"], declaredStepCount: "int?", completedStepCount: "int?", remainingStepCount: "int?", verifiedEvidenceStepCount: "int?", sourceAttemptIds: { list: "id", max: 1024 } },
        provenance: { list: sourceShape, max: 16 }, unknowns: { list: unknownShape, max: 64 }, bounds: { complete: "bool", omittedAttemptCount: "int", omittedValueCount: "int" }
    };
    // Closed structural copy, never clone-an-owner-and-delete. Typed values alone may
    // exceed the output byte bound; the constructor below omits them explicitly.
    function copyShape(value, shape) {
        if (typeof shape === "string") {
            if (value === null && (shape.indexOf("?") >= 0 || shape === "tri")) { return null; }
            if (shape === "id" || shape === "id?") { return label(value); }
            if (shape === "tri" || shape === "bool") { if (typeof value !== "boolean") { trajectoryError(); } return value; }
            if (shape === "int" || shape === "int?") { if (!Number.isSafeInteger(value) || value < 0) { trajectoryError(); } return value; }
            if (shape === "value?") {
                var kind = own(value, "kind"), data = own(value, "data");
                if (!isPlainObject(value) || Object.keys(value).sort().join(",") !== "data,kind" || (kind !== "number" && kind !== "string") || (kind === "number" ? typeof data !== "number" || !Number.isFinite(data) : typeof data !== "string")) { trajectoryError(); }
                return { kind: kind, data: data };
            }
            trajectoryError();
        }
        if (Array.isArray(shape)) { if (shape.indexOf(value) < 0) { trajectoryError(); } return value; }
        if (shape.list) {
            if (!Array.isArray(value) || value.length > shape.max || Object.keys(value).length !== value.length) { trajectoryError(); }
            var list = []; for (var i = 0; i < value.length; i++) { list.push(copyShape(own(value, String(i)), shape.list)); } return list;
        }
        if (!isPlainObject(value) || Object.keys(value).sort().join(",") !== Object.keys(shape).sort().join(",")) { trajectoryError(); }
        var out = {}; Object.keys(shape).forEach(function (key) { out[key] = copyShape(own(value, key), shape[key]); }); return out;
    }
    function markUnknown(record, path, reason) {
        record.unknowns = record.unknowns.filter(function (item) { return item.path !== path; });
        record.unknowns.push({ path: path, reason: reason });
    }
    function fillUnknowns(record) {
        function walk(value, path) {
            if (value === null || value === "unknown") {
                if (!record.unknowns.some(function (u) { return u.path === path; })) { markUnknown(record, path, "not-observed"); }
            } else if (value && typeof value === "object" && !Array.isArray(value)) { Object.keys(value).forEach(function (key) { if (["unknowns", "provenance", "bounds"].indexOf(key) < 0) { walk(value[key], path ? path + "." + key : key); } }); }
        }
        walk(record, "");
    }
    function createTrajectoryProjection(input) {
        var out = copyShape(input, projectionShape);
        var retained = [];
        function validatePaths(record, shape) {
            function known(path) { var node = shape; return path.split(".").every(function (part) { if (!node || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, part)) { return false; } node = node[part]; return true; }); }
            record.unknowns.forEach(function (item) { if (!known(item.path)) { trajectoryError(); } });
            record.provenance.forEach(function (item) { item.factPaths.forEach(function (path) { if (!known(path)) { trajectoryError(); } }); });
        }
        validatePaths(out, projectionShape);
        var ids = [];
        out.attempts.forEach(function (attempt) {
            validatePaths(attempt, attemptShape);
            if (ids.indexOf(attempt.attemptId) !== -1) { trajectoryError(); } ids.push(attempt.attemptId);
            var execution = attempt.execution, verification = attempt.verification;
            if (execution.hostCommitted === true && execution.mutationDisposition !== "mutated" || execution.hostCommitted === false && execution.mutationDisposition !== "not-mutated") { trajectoryError(); }
            if (execution.mutationDisposition === "already-satisfied" && (execution.reportedCommitted !== false || execution.hostCommitted !== null || execution.executionAttempted !== true || execution.hostInvocationAttempted !== false)) { trajectoryError(); }
            if ((verification.disposition === "verified-match" || verification.disposition === "verified-mismatch") && (verification.attempted !== true || verification.freshAtRead !== true || verification.scope !== "committed-target" || verification.targetRelation !== "committed-target" || verification.matches !== (verification.disposition === "verified-match") || !verification.sourceObservationId)) { trajectoryError(); }
            if (verification.disposition === "verification-not-run" && verification.attempted !== false) { trajectoryError(); }
            ["expected", "actual"].forEach(function (key) {
                var value = attempt.verification[key];
                if (value && value.kind === "string" && bytes(value.data) > 256) { attempt.verification[key] = null; out.bounds.omittedValueCount++; out.bounds.complete = false; markUnknown(attempt, "verification." + key, "value-omitted-by-bound"); }
            });
            fillUnknowns(attempt);
            if (retained.length >= 16 || attempt.provenance.length > 16 || attempt.unknowns.length > 64) { out.bounds.omittedAttemptCount++; out.bounds.complete = false; }
            else { retained.push(attempt); }
        });
        out.attempts = retained;
        function boundedSummary() {
            out.completion.sourceAttemptIds = out.attempts.map(function (a) { return a.attemptId; });
            if (!out.bounds.complete) { out.completion.verifiedEvidenceStepCount = null; markUnknown(out, "bounds", "projection-capacity-exceeded"); markUnknown(out, "completion.verifiedEvidenceStepCount", "projection-capacity-exceeded"); }
        }
        boundedSummary(); fillUnknowns(out);
        while (bytes(JSON.stringify(out)) > 64 * 1024 && out.attempts.length) { out.attempts.pop(); out.bounds.omittedAttemptCount++; out.bounds.complete = false; boundedSummary(); }
        if (bytes(JSON.stringify(out)) > 64 * 1024 || out.unknowns.length > 64) { trajectoryError(); }
        return freezeData(out);
    }
    function createTrajectorySlots() {
        var draft = null, active = null, terminal = null, serial = 0, occurrence = 0;
        function source(record, fact, paths, sourceClass, strength) {
            record.provenance.push({ factPaths: paths, class: sourceClass, producer: fact.producer, contractRevision: "vela-trajectory-source-v1", occurrenceId: "trajectory_occurrence_" + (++occurrence), sourceRequestId: fact.sourceRequestId || null, sourceSessionSeq: null, strength: strength || "direct" });
        }
        function currentAttempt(fact) { return draft && draft.attempts.filter(function (a) { return a.correlation.taskPlanId === fact.taskPlanId; })[0]; }
        function report(fact) {
            if (fact.kind === "objective") {
                draft = { schema: TRAJECTORY_SCHEMA, authorityCapable: false, projectionId: "trajectory_projection_" + (++serial), supersedesProjectionId: null,
                    objective: { sessionId: label(fact.sessionId), objectiveId: label(fact.objectiveId), taskId: label(fact.taskId), logicalPlanId: null }, lifecycle: { state: "active", lateEvidence: false }, attempts: [],
                    completion: { outcome: "active", code: null, coverage: "none", declaredStepCount: null, completedStepCount: 0, remainingStepCount: null, verifiedEvidenceStepCount: 0, sourceAttemptIds: [] }, provenance: [], unknowns: [], bounds: { complete: true, omittedAttemptCount: 0, omittedValueCount: 0 } };
                source(draft, fact, ["objective"], "local-control-occurrence");
            } else {
                if (!draft || fact.objectiveId !== draft.objective.objectiveId) { return; }
                var a = currentAttempt(fact);
                if (fact.kind === "attempt") {
                    if (a) { return; }
                    if (draft.attempts.length >= 16) { draft.bounds.complete = false; draft.bounds.omittedAttemptCount++; markUnknown(draft, "attempts", "projection-capacity-exceeded"); }
                    else {
                        var previous = draft.attempts.filter(function (entry) { return entry.correlation.logicalStepId === fact.logicalStepId; }).slice(-1)[0];
                        if (previous) { previous.completion.superseded = true; }
                        a = { attemptId: "trajectory_attempt_" + (++serial), correlation: { taskPlanId: fact.taskPlanId, taskPlanRevision: fact.taskPlanRevision, materializedStepId: fact.stepId, intentId: fact.intentId, logicalStepId: fact.logicalStepId, logicalStepIndex: fact.logicalStepIndex, materializationAttempt: fact.materializationAttempt, turnId: fact.turnId, taskRunId: null, authorizedPlanId: null, executionPlanId: null, actionIndex: null, providerRequestId: null, supersedesAttemptId: previous ? previous.attemptId : null }, capabilityId: fact.capabilityId, target: { targetRef: null, targetKind: fact.capabilityId === "set-layer-name-v1" ? "layer-attribute" : "property" },
                            intent: { submitted: true, admitted: null, review: "unknown" }, execution: { executionAttempted: null, hostInvocationAttempted: null, mutationDisposition: "unknown", reportedCommitted: null, hostCommitted: null, resultCode: null, resultingValueDigest: null },
                            verification: { attemptId: null, sourceObservationId: null, attempted: null, disposition: "unknown", scope: "unknown", targetRelation: "unproven", freshAtRead: null, matches: null, expected: fact.expectedValue, actual: null, actualDigest: null, code: null }, completion: { outcome: "active", superseded: false }, provenance: [], unknowns: [] };
                        if (!fact.logicalPlanId) { markUnknown(a, "correlation.logicalStepId", "not-applicable"); markUnknown(a, "correlation.logicalStepIndex", "not-applicable"); }
                        markUnknown(a, "correlation.providerRequestId", "not-wired"); markUnknown(a, "target.targetRef", "not-wired");
                        draft.objective.logicalPlanId = fact.logicalPlanId; draft.completion.declaredStepCount = fact.stepCount; draft.completion.remainingStepCount = fact.stepCount - draft.completion.completedStepCount;
                        source(a, fact, ["correlation", "capabilityId", "intent.submitted", "verification.expected"], "local-control-occurrence"); draft.attempts.push(a);
                    }
                } else if (fact.kind === "terminal") {
                    if (a && a.completion.outcome === "active") { a.completion.outcome = fact.outcome; }
                    if (a && fact.outcome === "cancelled") {
                        if (a.execution.hostInvocationAttempted && a.execution.hostCommitted === null) { markUnknown(a, "execution.hostCommitted", "cancelled-before-settlement"); }
                        if (a.verification.attempted && a.verification.freshAtRead === null) { markUnknown(a, "verification.disposition", "cancelled-before-settlement"); }
                    }
                    draft.lifecycle.state = "terminal"; draft.completion.outcome = fact.outcome; draft.completion.code = fact.code;
                    if (fact.completedStepCount !== null) { draft.completion.completedStepCount = fact.completedStepCount; draft.completion.remainingStepCount = fact.remainingStepCount; }
                    if (!draft.attempts.length && fact.outcome === "completed") { draft.completion.declaredStepCount = 0; draft.completion.remainingStepCount = 0; }
                    source(draft, fact, ["completion.outcome", "completion.completedStepCount", "completion.remainingStepCount"], "derived-objective-summary", "derived");
                } else if (a) {
                    if (fact.kind === "review") { a.intent.admitted = true; a.intent.review = fact.review; source(a, fact, ["intent.admitted", "intent.review"], "local-control-occurrence"); }
                    else if (fact.kind === "not-executed") {
                        a.execution.executionAttempted = false; a.execution.hostInvocationAttempted = false; a.execution.mutationDisposition = "not-mutated"; a.execution.reportedCommitted = false; a.execution.resultCode = fact.code || null;
                        a.verification.attempted = false; a.verification.disposition = "verification-not-run";
                        source(a, fact, ["execution.executionAttempted", "execution.hostInvocationAttempted", "execution.mutationDisposition", "execution.reportedCommitted", "verification.attempted", "verification.disposition"], "local-control-occurrence");
                    } else if (fact.kind === "association") {
                        a.correlation.executionPlanId = fact.planId; a.correlation.authorizedPlanId = fact.authorizedPlanId; a.correlation.taskRunId = fact.taskRunId; a.correlation.actionIndex = 0;
                        source(a, fact, ["correlation.executionPlanId", "correlation.authorizedPlanId", "correlation.taskRunId", "correlation.actionIndex"], "local-control-occurrence");
                    } else if (fact.kind === "execution-entered") {
                        a.execution.executionAttempted = true; source(a, fact, ["execution.executionAttempted"], "execution-result");
                    } else if (fact.kind === "host-entered") {
                        a.execution.hostInvocationAttempted = true; source(a, fact, ["execution.hostInvocationAttempted"], "execution-result");
                    } else if (fact.kind === "already-satisfied") {
                        a.execution.executionAttempted = true; a.execution.hostInvocationAttempted = false; a.execution.mutationDisposition = "already-satisfied"; a.execution.reportedCommitted = false;
                        markUnknown(a, "execution.hostCommitted", "host-not-invoked"); source(a, fact, ["execution"], "execution-result");
                    } else if (fact.kind === "host-result") {
                        a.execution.reportedCommitted = fact.committed; a.execution.hostCommitted = fact.hostCommitted;
                        a.execution.resultCode = fact.code; a.execution.resultingValueDigest = fact.digest;
                        a.execution.mutationDisposition = fact.hostCommitted === true ? "mutated" : fact.hostCommitted === false ? "not-mutated" : "unknown";
                        if (fact.hostCommitted === null) { markUnknown(a, "execution.hostCommitted", "commit-uncertain"); }
                        source(a, fact, ["execution.reportedCommitted", "execution.hostCommitted", "execution.mutationDisposition", "execution.resultCode", "execution.resultingValueDigest"], fact.hostValidated ? "host-commit-evidence" : "execution-result");
                    } else if (fact.kind === "execution-receipt") {
                        a.execution.reportedCommitted = fact.committed;
                        source(a, fact, ["execution.reportedCommitted"], "execution-result", "reduced");
                    } else if (fact.kind === "verification-skipped") {
                        if (a.verification.attempted === null) { a.verification.attempted = false; a.verification.disposition = "verification-not-run"; source(a, fact, ["verification.attempted", "verification.disposition"], "local-control-occurrence"); }
                    } else if (fact.kind === "verify-entered") {
                        a.verification.attemptId = "trajectory_verify_" + (++serial); a.verification.attempted = true; a.verification.scope = fact.scope;
                        source(a, fact, ["verification.attemptId", "verification.attempted", "verification.scope"], "local-control-occurrence");
                    } else if (fact.kind === "verify-result") {
                        a.verification.scope = fact.scope; a.verification.targetRelation = fact.scope === "committed-target" && fact.fresh === true ? "committed-target" : "unproven";
                        a.verification.freshAtRead = fact.fresh; a.verification.matches = fact.matches; a.verification.actual = fact.actual; a.verification.actualDigest = fact.digest; a.verification.sourceObservationId = fact.sourceRequestId; a.verification.code = fact.code;
                        a.verification.disposition = fact.scope === "current-selection" ? "unknown" : fact.fresh === true && fact.matches !== null ? (fact.matches ? "verified-match" : "verified-mismatch") : "verification-unavailable";
                        if (a.verification.actual && a.verification.actual.kind === "string" && bytes(a.verification.actual.data) > 256) { a.verification.actual = null; draft.bounds.complete = false; draft.bounds.omittedValueCount++; markUnknown(a, "verification.actual", "value-omitted-by-bound"); }
                        if (fact.scope === "current-selection") { markUnknown(a, "verification.disposition", "target-correlation-unproven"); }
                        if (!fact.sourceRequestId) { markUnknown(a, "verification.sourceObservationId", "verification-result-unavailable"); }
                        source(a, fact, ["verification"], "fresh-verify-evidence");
                    } else if (fact.kind === "step-completed") {
                        a.completion.outcome = "completed"; draft.completion.completedStepCount++; draft.completion.remainingStepCount = draft.completion.declaredStepCount - draft.completion.completedStepCount;
                        source(a, fact, ["completion"], "derived-objective-summary", "derived");
                    } else if (fact.kind === "superseded") { a.completion.outcome = "blocked"; a.completion.superseded = true; source(a, fact, ["completion"], "local-control-occurrence"); }
                }
            }
            draft.completion.verifiedEvidenceStepCount = draft.attempts.filter(function (a) { return a.verification.disposition === "verified-match" && a.completion.outcome === "completed"; }).length;
            var count = draft.completion.completedStepCount, total = draft.completion.declaredStepCount;
            draft.completion.coverage = count > 0 && total !== null && count === total ? "full" : count > 0 ? "partial" : "none";
            draft.supersedesProjectionId = active ? active.projectionId : null; draft.projectionId = "trajectory_projection_" + (++serial);
            var snapshot = createTrajectoryProjection(draft);
            if (draft.lifecycle.state === "terminal") { terminal = snapshot; active = null; draft = null; } else { active = snapshot; }
        }
        return { accept: function (fact) { try { report(fact); } catch (ignoredProjection) { /* reporting cannot alter execution */ } }, get: function () { return Object.freeze({ active: active, terminal: terminal }); }, clear: function () { draft = null; active = null; terminal = null; } };
    }

    function createOwner(options) {
        var settings = isPlainObject(options) ? options : {};
        var runtime = Object.prototype.hasOwnProperty.call(settings, "AgentRuntime") ? settings.AgentRuntime : defaultAgentRuntime;
        var driverModule = Object.prototype.hasOwnProperty.call(settings, "AgentDriver") ? settings.AgentDriver : defaultAgentDriver;
        var reporter = typeof settings.onListenerError === "function" ? settings.onListenerError : function () {};
        var agent;
        var projection;
        var capabilityRuntime = null;
        var observationRuntime = null;
        var observationRefreshPromise = null;
        var observationRefreshIdentity = null;
        var observationRefreshOwned = false;
        var driver = null;
        var disposed = false;
        // Reporting-only slots; no Session replay, execution handle or public writer.
        var trajectory = createTrajectorySlots();
        var selectionSource = Object.freeze({ kind: "vela-terminal-selection-source-port" });
        selectionSources.set(selectionSource, function (livenessOnly, exactSession) {
            if (disposed || !agent || agent.getSession().isClosed()) { return null; }
            if (livenessOnly) { return true; }
            if (!exactSession || exactSession !== agent.getSession()) { return null; }
            var current = driver && driver.getSnapshot();
            if (!current || !current.objectiveId || !current.turn || current.terminal) { return null; }
            var sessionId = agent.getSnapshot().sessionId;
            if (sessionId !== current.turn.sessionId) { return null; }
            return Object.freeze({ sessionId: sessionId, objectiveId: current.objectiveId, terminal: trajectory.get().terminal });
        });

        if (!runtime || typeof runtime.createAgent !== "function") {
            fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE);
        }

        agent = runtime.createAgent({
            onListenerError: function (error, envelope) {
                try { reporter(error, envelope); }
                catch (reportError) { /* Diagnostics must never affect runtime truth. */ }
            }
        });
        if (!agent || typeof agent.getProjection !== "function" || typeof agent.activate !== "function" || typeof agent.dispose !== "function") {
            fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE);
        }
        projection = agent.getProjection();

        if (!driverModule || typeof driverModule.createAgentDriver !== "function") { fail(ERROR_CODES.AGENT_OWNER_RUNTIME_UNAVAILABLE); }
        driver = driverModule.createAgentDriver({
            beginTurn: function () { return agent.beginTurn(); },
            observe: function () {
                if (!observationRuntime) { return Promise.reject(Object.assign(new Error("OBSERVATION_PROVIDER_UNAVAILABLE"), { code: "OBSERVATION_PROVIDER_UNAVAILABLE" })); }
                return observationRuntime.refresh();
            },
            getObservation: function () { return observationRuntime ? observationRuntime.getObservationSnapshot() : null; },
            appendSessionEvent: function (event) { return agent.getSession().append(event); },
            onTrajectoryFact: function (fact) { if (!disposed) { trajectory.accept(fact); } },
            onListenerError: function (error, envelope) { try { reporter(error, envelope); } catch (ignored) {} }
        });

        function attachObservationReadPort(observationReadPort) {
            var capability;
            if (disposed || observationRuntime || !settings.AgentCapabilityRuntime || !settings.ActiveCompositionCapability || !settings.AgentObservationRuntime || !observationReadPort) { return false; }
            capability = settings.ActiveCompositionCapability.create({ contextBridge: observationReadPort });
            capabilityRuntime = settings.AgentCapabilityRuntime.createCapabilityRuntime({
                registry: capability.registry,
                adapters: capability.adapters,
                readOwnership: function () {
                    var snapshot = agent.getSnapshot();
                    return { sessionId: snapshot.sessionId, turnId: snapshot.turnId, scopeId: snapshot.scopeId, agentRevision: snapshot.revision, disposed: snapshot.lifecycleStage === "disposed" };
                }
            });
            observationRuntime = settings.AgentObservationRuntime.createAgentObservationRuntime({
                readAgentSnapshot: function () { return agent.getSnapshot(); },
                capabilityRuntime: capabilityRuntime,
                capabilityId: capability.capabilityId,
                onError: function (error) { try { reporter(error, Object.freeze({ phase: "observation" })); } catch (ignored) {} }
            });
            return true;
        }
        if (settings.observationReadPort) {
            attachObservationReadPort(settings.observationReadPort);
        }

        function hasActiveObjective() {
            var snapshot = driver && driver.getSnapshot();
            return !!snapshot && ["observing", "reasoning", "awaiting-outcome", "awaiting-review", "verifying"].indexOf(snapshot.state) !== -1;
        }

        function sameObservationTurn(left, right) {
            return !!left && !!right && !!left.sessionId && !!left.turnId && left.agentId === right.agentId &&
                left.sessionId === right.sessionId && left.turnId === right.turnId &&
                left.scopeId === right.scopeId && left.revision === right.revision;
        }

        function objectiveReviewProjection() {
            var snapshot;
            var review;
            var resolution;
            if (disposed || !driver) { return Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null }); }
            snapshot = driver.getSnapshot();
            review = snapshot.suspendedReview;
            resolution = snapshot.reviewResolution;
            if (snapshot.state === "awaiting-review" && review) {
                return Object.freeze({ state: "active", reviewId: review.reviewId, revision: review.revision, target: review.reviewTarget, stepNumber: snapshot.logicalPlan ? snapshot.logicalPlan.currentStepIndex + 1 : 1, stepCount: snapshot.logicalPlan ? snapshot.logicalPlan.stepCount : 1, capabilityId: review.capabilityId, valueKind: review.capabilityId === "set-layer-name-v1" ? "string" : "number", beforeValue: review.beforeValue, proposedValue: review.capabilityId === "set-layer-name-v1" ? review.params.name : review.params.opacity, outcome: null });
            }
            if (snapshot.state === "awaiting-outcome" && resolution && resolution.outcome === "approved") {
                return Object.freeze({ state: "resolved", reviewId: resolution.reviewId, revision: resolution.revision, capabilityId: null, beforeValue: null, proposedValue: null, outcome: resolution.outcome });
            }
            if (snapshot.state === "terminal" && snapshot.terminal && snapshot.terminal.outcome === "rejected" && resolution && resolution.outcome === "rejected") {
                return Object.freeze({ state: "resolved", reviewId: resolution.reviewId, revision: resolution.revision, capabilityId: null, beforeValue: null, proposedValue: null, outcome: resolution.outcome });
            }
            return Object.freeze({ state: "inactive", reviewId: null, revision: null, capabilityId: null, beforeValue: null, proposedValue: null, outcome: null });
        }
        var objectiveReviewPort = Object.freeze({
            getProjection: objectiveReviewProjection,
            resolve: function (input) { if (disposed || !driver) { throw Object.assign(new Error("AGENT_OWNER_RUNTIME_UNAVAILABLE"), { code: "AGENT_OWNER_RUNTIME_UNAVAILABLE" }); } return driver.resolveReview(input); }
        });

        return Object.freeze({
            getCurrentAgent: function () { return agent; },
            getSessionRuntime: function () { return disposed ? null : agent.getSession(); },
            getCurrentProjection: function () { return projection; },
            getObservationRuntime: function () { return observationRuntime; },
            getAgentDriver: function () { return disposed ? null : driver; },
            getObjectiveReviewPort: function () { return disposed ? null : objectiveReviewPort; },
            getTrajectoryEvidence: function () { return trajectory.get(); },
            attachAgentDriverRuntimePort: function (port) {
                var attached = !disposed && driver ? driver.attachRuntimePort(port) : false;
                if (attached && typeof port.attachTrajectoryReporter === "function") {
                    port.attachTrajectoryReporter(function (fact) { if (!disposed) { trajectory.accept(fact); } });
                }
                if (attached && typeof port.attachSelectionSource === "function") {
                    try { port.attachSelectionSource(selectionSource); } catch (ignoredSelectionAttachment) {}
                }
                return attached;
            },
            startObjective: function (input) { return !disposed && driver ? driver.startObjective(input) : Promise.reject(Object.assign(new Error("AGENT_OWNER_RUNTIME_UNAVAILABLE"), { code: "AGENT_OWNER_RUNTIME_UNAVAILABLE" })); },
            resolveObjectiveReview: function (input) { if (disposed || !driver) { throw Object.assign(new Error("AGENT_OWNER_RUNTIME_UNAVAILABLE"), { code: "AGENT_OWNER_RUNTIME_UNAVAILABLE" }); } return driver.resolveReview(input); },
            cancelObjective: function (options) { return !disposed && driver ? driver.cancel(options) : false; },
            attachObservationReadPort: attachObservationReadPort,
            activate: function () {
                if (disposed) { return false; }
                agent.activate();
                return true;
            },
            beginTurn: function () {
                if (disposed || !agent || typeof agent.beginTurn !== "function") { return null; }
                return agent.beginTurn();
            },
            refreshActiveComposition: function () {
                var operation;
                var activeObjective;
                if (disposed || !observationRuntime) { return Promise.reject(Object.assign(new Error("OBSERVATION_PROVIDER_UNAVAILABLE"), { code: "OBSERVATION_PROVIDER_UNAVAILABLE" })); }
                if (observationRefreshPromise && sameObservationTurn(observationRefreshIdentity, agent.getSnapshot())) { return observationRefreshPromise; }
                activeObjective = hasActiveObjective();
                if (!activeObjective) { agent.beginTurn(); }
                observationRefreshIdentity = agent.getSnapshot();
                observationRefreshOwned = !activeObjective;
                operation = observationRuntime.refresh();
                observationRefreshPromise = operation;
                function clear() {
                    if (observationRefreshPromise === operation) { observationRefreshPromise = null; observationRefreshIdentity = null; observationRefreshOwned = false; }
                }
                operation.then(clear, clear);
                return operation;
            },
            cancelActiveCompositionRefresh: function () {
                // A diagnostic subscriber cannot cancel an objective's shared read.
                return !disposed && observationRefreshOwned && observationRefreshPromise && typeof observationRefreshPromise.cancel === "function" ? observationRefreshPromise.cancel() : false;
            },
            dispose: function () {
                if (disposed) { return false; }
                disposed = true;
                trajectory.clear();
                if (driver) { driver.dispose(); }
                if (observationRuntime) { observationRuntime.dispose(); }
                if (capabilityRuntime) { capabilityRuntime.dispose(); }
                agent.dispose();
                return true;
            },
            isDisposed: function () { return disposed; }
        });
    }

    return Object.freeze({
        sampleSelectionSource: sampleSelectionSource,
        isSelectionSampleCurrent: isSelectionSampleCurrent,
        isSelectionSourceLive: isSelectionSourceLive,
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        createTrajectoryProjection: createTrajectoryProjection,
        createOwner: createOwner
    });
}));
