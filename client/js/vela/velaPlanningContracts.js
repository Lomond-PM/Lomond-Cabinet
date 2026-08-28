(function (root, factory) {
    "use strict";

    var hasModule = typeof module === "object" && module.exports;
    var sessionRuntime = hasModule
        ? require("./velaSessionRuntime")
        : (root && root.VelaSessionRuntime) || null;

    var exported = Object.freeze(factory(sessionRuntime));

    if (hasModule) {
        module.exports = exported;
    } else {
        if (root && root.self === root && root["win" + "dow"] === root && !Object.prototype.hasOwnProperty.call(root, "VelaPlanningContracts")) {
            Object.defineProperty(root, "VelaPlanningContracts", { configurable: false, enumerable: true, value: exported, writable: false });
        }
    }
}(typeof self !== "undefined" ? self : this, function (sessionRuntime) {
    "use strict";

    // =========================================================================
    // 0.3.5-A Planning + Authority Contract Foundation
    // Contract: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x)
    // This module is a standalone UMD contract module. It is intentionally NOT
    // wired into client/index.html, velaCepModuleLoader.js or main.js. It is
    // exercised by Node tests (scripts/test-vela-planning-contracts.js).
    //
    // Scope (from the 0.3.5 pre-implementation audit, Section V):
    //   contract types + closed enums + fail-closed validators + immutable
    //   snapshots + stable module-local contract errors + a thin migration seam.
    // NO production wiring. NO execution authority expansion. NO existing
    // trusted module is modified.
    // =========================================================================

    var MODULE_REVISION = "vela-planning-contracts-v1";

    // -------------------------------------------------------------------------
    // Stable, module-local contract error codes (new; never mutate existing codes)
    // -------------------------------------------------------------------------
    var ERROR_CODES = Object.freeze({
        PLANNING_CONTRACT_INVALID: "PLANNING_CONTRACT_INVALID",
        PLANNING_CONTRACT_FORBIDDEN_FIELD: "PLANNING_CONTRACT_FORBIDDEN_FIELD",
        AUTHORITY_CONTRACT_INVALID: "AUTHORITY_CONTRACT_INVALID",
        AUTHORITY_EVIDENCE_INVALID: "AUTHORITY_EVIDENCE_INVALID",
        POLICY_INPUT_INVALID: "POLICY_INPUT_INVALID",
        POLICY_DENIED: "POLICY_DENIED"
    });

    // -------------------------------------------------------------------------
    // Closed enums (frozen; never extended casually)
    // -------------------------------------------------------------------------
    var CONTRACT_TYPES = Object.freeze(["task-plan", "capability-intent", "action-candidate", "authorized-plan"]);
    var PLAN_NODE_KINDS = Object.freeze(["observe", "wait", "judge", "ask", "operate", "verify"]);
    var OPERATION_KINDS = Object.freeze(["read", "analyze", "mutate", "create"]);
    var INVOCATION_KINDS = Object.freeze(["tool", "expression", "script"]);
    var RISK_LEVELS = Object.freeze(["read", "analyze", "mutate", "create", "write", "destructive", "script", "external"]);
    var POLICY_DECISIONS = Object.freeze(["ALLOW", "REVIEW_REQUIRED", "DENY"]);
    var TARGET_SCOPE_TYPES = Object.freeze(["selected-layer", "selected-layers", "current-comp", "specific-layer", "specific-layers", "current-project", "none"]);
    var AUTHORITY_EVIDENCE_TYPES = Object.freeze(["canonical-record", "evidentiary-fact", "authority-evidence"]);
    var TRUSTED_DECISION_SOURCES = Object.freeze(["local-authority", "legacy-policy"]);
    var GRANT_RISK_CEILINGS = Object.freeze(["read", "analyze", "mutate", "create", "write"]);
    var DENY_REASON_CODES = Object.freeze(["unknown-capability", "unsupported-operation", "invalid-params", "outside-declared-scope", "policy-denied"]);

    // Fields that carry execution/authority semantics and are forbidden in any
    // planning/authority object (normalized to lowercase).
    var FORBIDDEN_AUTHORITY_MARKERS = Object.freeze([
        "nonce", "confirmation", "confirmationnonce", "confirmationstate", "confirmationnonce",
        "reservation", "executionarmed", "executestate", "authority", "authoritative",
        "approved", "allow", "allowed", "granted", "host", "hostpayload", "execute",
        "execution", "binding", "trustedbinding", "jitexecution"
    ]);

    // Resolved AE target identity keys (a trusted native binding); forbidden in
    // every planning object. The target scope descriptor is a semantic label,
    // never these keys.
    var FORBIDDEN_BINDING_KEYS = Object.freeze([
        "target", "targetid", "layerid", "nativelayerid", "itemid", "layerindex",
        "compositionid", "compid", "projectid", "layerindices", "layerids", "nativeid"
    ]);

    // -------------------------------------------------------------------------
    // Fail-closed helpers
    // -------------------------------------------------------------------------
    function fail(code, message, details) {
        var error = new Error(message || code);
        error.code = code;
        if (details !== undefined) { error.details = details; }
        throw error;
    }

    function isPlainObject(value) {
        if (!value || typeof value !== "object") { return false; }
        return Object.prototype.toString.call(value) === "[object Object]";
    }

    function hasOwn(value, key) {
        return Object.prototype.hasOwnProperty.call(value, key);
    }

    function contains(list, value) {
        return list.indexOf(value) !== -1;
    }

    function assertString(value, label, context) {
        if (typeof value !== "string") { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " must be a string.", { stage: context }); }
        if (value.length > 1024) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " exceeds the limit.", { stage: context }); }
        return value;
    }

    function assertNonEmptyString(value, label, context) {
        assertString(value, label, context);
        if (value.length === 0 || value !== value.trim()) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " must be a non-empty trimmed string.", { stage: context }); }
        return value;
    }

    function assertLocalId(value, label, context) {
        assertNonEmptyString(value, label, context);
        // Local ids mirror the repository local-id shape: <kind>_<a-z0-9>+ or a
        // plan/scoped id. No control characters.
        if (!/^[A-Za-z0-9_.:-]+$/.test(value)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " is not a valid local id.", { stage: context }); }
        return value;
    }

    function assertNonNegativeInteger(value, label, context) {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " must be a non-negative integer.", { stage: context }); }
        return value;
    }

    function assertFingerprint(value, label, context) {
        assertNonEmptyString(value, label, context);
        if (!/^(?:sha256:)?[a-f0-9]{64}$/i.test(value)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " is not a SHA-256 fingerprint.", { stage: context }); }
        return value;
    }

    function assertBoolean(value, label, context) {
        if (typeof value !== "boolean") { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " must be a boolean.", { stage: context }); }
        return value;
    }

    function assertNoUnknownKeys(value, allowed, label, code, context) {
        var key;
        if (!isPlainObject(value)) { fail(code, label + " must be an object.", { stage: context }); }
        for (key in value) {
            if (hasOwn(value, key) && allowed.indexOf(key) === -1) {
                fail(code, label + " contains an unknown field: " + key, { stage: context });
            }
        }
        return value;
    }

    function normalizeKey(key) { return String(key).toLowerCase().replace(/[^a-z0-9]/g, ""); }

    function assertNoForbiddenKeys(value, label, options, code, context) {
        var key;
        var normalized;
        var i;
        var j;
        var forbidden = options.forbiddenMarkers || FORBIDDEN_AUTHORITY_MARKERS;
        if (!isPlainObject(value)) { return; }
        for (key in value) {
            if (!hasOwn(value, key)) { continue; }
            normalized = normalizeKey(key);
            for (i = 0; i < forbidden.length; i += 1) {
                if (normalized === forbidden[i]) {
                    fail(code, label + " carries a forbidden authority/execution field: " + key, { stage: context });
                }
            }
            for (j = 0; j < FORBIDDEN_BINDING_KEYS.length; j += 1) {
                if (normalized === FORBIDDEN_BINDING_KEYS[j]) {
                    fail(code, label + " carries a forbidden resolved-target/binding field: " + key, { stage: context });
                }
            }
        }
        return value;
    }

    // Deep, fail-closed JSON clone. Rejects functions, symbols, undefined,
    // bigint, non-finite/negative-zero numbers, accessors, prototypes other than
    // Object.prototype, unknown/non-enumerable handling and reference cycles.
    function cloneJson(value, seen, label) {
        seen = seen || [];
        var out;
        var keys;
        var i;
        var desc;
        var descriptorValue;
        if (value === null || typeof value === "string" || typeof value === "boolean") {
            return value;
        }
        if (typeof value === "number") {
            if (!Number.isFinite(value) || Object.is(value, -0)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning number must be finite JSON data.", { detail: (label || "value") }); }
            return value;
        }
        if (Array.isArray(value)) {
            if (seen.indexOf(value) !== -1) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning object has a reference cycle.", { detail: (label || "array") }); }
            seen.push(value);
            out = new Array(value.length);
            for (i = 0; i < value.length; i += 1) { out[i] = cloneJson(value[i], seen, label); }
            seen.pop();
            return out;
        }
        if (value && typeof value === "object") {
            if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
                fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning object must be an ordinary object.", { detail: (label || "object") });
            }
            if (seen.indexOf(value) !== -1) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning object has a reference cycle.", { detail: (label || "object") }); }
            seen.push(value);
            out = {};
            keys = Object.keys(value);
            for (i = 0; i < keys.length; i += 1) {
                desc = Object.getOwnPropertyDescriptor(value, keys[i]);
                if (!desc || desc.get || desc.set || !hasOwn(desc, "value")) {
                    fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning object has a non-data property.", { detail: (label || keys[i]) });
                }
                descriptorValue = desc.value;
                if (typeof descriptorValue === "undefined" || typeof descriptorValue === "function" || typeof descriptorValue === "symbol" || typeof descriptorValue === "bigint") {
                    fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning object carries a non-JSON value.", { detail: (label || keys[i]) });
                }
                out[keys[i]] = cloneJson(descriptorValue, seen, label);
            }
            seen.pop();
            return out;
        }
        fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "A planning value is not JSON data.", { detail: (label || "value") });
    }

    function snapshot(value, label) {
        return deepFreeze(cloneJson(value, [], label));
    }

    function deepFreeze(value, seen) {
        seen = seen || [];
        var keys;
        var i;
        if (!value || typeof value !== "object" || seen.indexOf(value) !== -1) { return value; }
        seen.push(value);
        if (Array.isArray(value)) {
            for (i = 0; i < value.length; i += 1) { deepFreeze(value[i], seen); }
        } else {
            keys = Object.keys(value);
            for (i = 0; i < keys.length; i += 1) { deepFreeze(value[keys[i]], seen); }
        }
        return Object.freeze(value);
    }

    // -------------------------------------------------------------------------
    // Session taxonomy reference (single source; never duplicated here)
    // -------------------------------------------------------------------------
    function isDerivedSessionKind(kind) {
        var derived = sessionRuntime && sessionRuntime.SESSION_EVENT_KINDS && sessionRuntime.SESSION_EVENT_KINDS.derived;
        return Boolean(derived && typeof kind === "string" && derived.indexOf(kind) !== -1);
    }

    function isAuthorityEvidenceKind(kind) {
        // Fail-closed: if the canonical session runtime is unavailable, nothing
        // is an authority-evidence kind. We never maintain a second whitelist.
        return Boolean(sessionRuntime && typeof sessionRuntime.isAuthorityEvidenceKind === "function" && sessionRuntime.isAuthorityEvidenceKind(kind));
    }

    function isKnownSessionKind(kind) {
        return Boolean(sessionRuntime && typeof sessionRuntime.isSessionEventKind === "function" && sessionRuntime.isSessionEventKind(kind));
    }

    // -------------------------------------------------------------------------
    // TaskPlan — Agent reasoning/orchestration representation; never executable.
    // -------------------------------------------------------------------------
    function createTaskPlan(input) {
        var steps;
        var plan = {
            contractType: "task-plan",
            planId: null,
            taskId: null,
            revision: null,
            steps: []
        };
        if (!isPlainObject(input)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "TaskPlan input must be an object.", { stage: "task-plan" }); }
        assertNoUnknownKeys(input, ["planId", "taskId", "revision", "steps"], "TaskPlan", ERROR_CODES.PLANNING_CONTRACT_INVALID, "task-plan");
        plan.planId = assertLocalId(input.planId, "TaskPlan.planId", "task-plan");
        plan.taskId = input.taskId === undefined ? null : assertLocalId(input.taskId, "TaskPlan.taskId", "task-plan");
        assertNonNegativeInteger(input.revision, "TaskPlan.revision", "task-plan");
        plan.revision = input.revision;
        if (!Array.isArray(input.steps)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "TaskPlan.steps must be an array.", { stage: "task-plan" }); }
        steps = input.steps.map(function (step, index) { return normalizeTaskPlanStep(step, index); });
        assertNoForbiddenKeys(plan, "TaskPlan", {}, ERROR_CODES.PLANNING_CONTRACT_INVALID, "task-plan");
        plan.steps = steps;
        return snapshot(plan, "TaskPlan");
    }

    function normalizeTaskPlanStep(step, index) {
        var normalized = {};
        var stepId;
        var kind;
        var intent;
        if (!isPlainObject(step)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "TaskPlan.steps[" + index + "] must be an object.", { stage: "task-plan" }); }
        assertNoUnknownKeys(step, ["stepId", "kind", "capabilityIntent", "rationale", "metadata"], "TaskPlan.steps[" + index + "]", ERROR_CODES.PLANNING_CONTRACT_INVALID, "task-plan");
        assertNoForbiddenKeys(step, "TaskPlan.steps[" + index + "]", {}, ERROR_CODES.PLANNING_CONTRACT_INVALID, "task-plan");
        stepId = assertLocalId(step.stepId, "TaskPlan.steps[" + index + "].stepId", "task-plan");
        kind = step.kind;
        if (!contains(PLAN_NODE_KINDS, kind)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "TaskPlan.steps[" + index + "].kind is not a closed plan node kind.", { stage: "task-plan" }); }
        normalized.stepId = stepId;
        normalized.kind = kind;
        if (step.capabilityIntent !== undefined) {
            intent = createCapabilityIntent(step.capabilityIntent);
            // A plan node may carry a capability intent, but the intent itself is
            // never an execution authority. Verify it stays non-authoritative.
            assertCapabilityIntentNonAuthoritative(intent);
            normalized.capabilityIntent = intent;
        }
        if (step.rationale !== undefined) { normalized.rationale = assertString(step.rationale, "TaskPlan.steps[" + index + "].rationale", "task-plan"); }
        if (step.metadata !== undefined) {
            if (!isPlainObject(step.metadata)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "TaskPlan.steps[" + index + "].metadata must be an object.", { stage: "task-plan" }); }
            assertNoForbiddenKeys(step.metadata, "TaskPlan.steps[" + index + "].metadata", {}, ERROR_CODES.PLANNING_CONTRACT_INVALID, "task-plan");
            normalized.metadata = snapshot(step.metadata, "TaskPlan.metadata");
        } else {
            normalized.metadata = Object.freeze({});
        }
        return normalized;
    }

    function isTaskPlan(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "task-plan" && Array.isArray(value.steps));
    }

    function snapshotTaskPlan(plan) {
        if (!isTaskPlan(plan)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "snapshotTaskPlan requires a TaskPlan.", { stage: "task-plan" }); }
        return snapshot(plan, "TaskPlan");
    }

    // The structural enforcement of the "TaskPlan is never executable / never
    // carries an authority marker" invariant: a TaskPlan must not contain any
    // field a spine module could consume as authority (nonce, binding, host
    // payload, confirmation state, reservation, executionArmed, decision).
    function assertTaskPlanNotExecutable(plan) {
        var i;
        var step;
        if (!isTaskPlan(plan)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "assertTaskPlanNotExecutable requires a TaskPlan.", { stage: "task-plan" }); }
        assertNoForbiddenKeys(plan, "TaskPlan", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "task-plan");
        for (i = 0; i < plan.steps.length; i += 1) {
            step = plan.steps[i];
            assertNoForbiddenKeys(step, "TaskPlan.step", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "task-plan");
            if (hasOwn(step, "capabilityIntent")) { assertCapabilityIntentNonAuthoritative(step.capabilityIntent); }
        }
        return plan;
    }

    // -------------------------------------------------------------------------
    // CapabilityIntent — non-authoritative intent to invoke a capability.
    // -------------------------------------------------------------------------
    function createCapabilityIntent(input) {
        var intent = { contractType: "capability-intent", intentId: null, capabilityId: null, requestedOperation: null, params: null };
        if (!isPlainObject(input)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "CapabilityIntent input must be an object.", { stage: "capability-intent" }); }
        assertNoUnknownKeys(input, ["intentId", "capabilityId", "requestedOperation", "params"], "CapabilityIntent", ERROR_CODES.PLANNING_CONTRACT_INVALID, "capability-intent");
        assertNoForbiddenKeys(input, "CapabilityIntent", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "capability-intent");
        intent.intentId = assertLocalId(input.intentId, "CapabilityIntent.intentId", "capability-intent");
        intent.capabilityId = assertCapabilityId(input.capabilityId, "CapabilityIntent.capabilityId", "capability-intent");
        if (!contains(OPERATION_KINDS, input.requestedOperation)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "CapabilityIntent.requestedOperation is not a closed operation kind.", { stage: "capability-intent" }); }
        intent.requestedOperation = input.requestedOperation;
        if (!isPlainObject(input.params)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "CapabilityIntent.params must be an object.", { stage: "capability-intent" }); }
        assertNoForbiddenKeys(input.params, "CapabilityIntent.params", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "capability-intent");
        intent.params = snapshot(input.params, "CapabilityIntent.params");
        return snapshot(intent, "CapabilityIntent");
    }

    function normalizeCapabilityIntent(raw) {
        // Fail-closed: strip/forbid any authority/binding/execution field that a
        // planner or model could try to attach. Never accept forged fields.
        var normalized;
        if (!isPlainObject(raw)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "CapabilityIntent raw input must be an object.", { stage: "capability-intent" }); }
        assertNoForbiddenKeys(raw, "CapabilityIntent.raw", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "capability-intent");
        normalized = createCapabilityIntent({ intentId: raw.intentId, capabilityId: raw.capabilityId, requestedOperation: raw.requestedOperation, params: raw.params });
        assertCapabilityIntentNonAuthoritative(normalized);
        return normalized;
    }

    function isCapabilityIntent(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "capability-intent");
    }

    function snapshotCapabilityIntent(intent) {
        if (!isCapabilityIntent(intent)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "snapshotCapabilityIntent requires a CapabilityIntent.", { stage: "capability-intent" }); }
        return snapshot(intent, "CapabilityIntent");
    }

    function assertCapabilityIntentNonAuthoritative(intent) {
        var i;
        if (!isCapabilityIntent(intent)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "assertCapabilityIntentNonAuthoritative requires a CapabilityIntent.", { stage: "capability-intent" }); }
        assertNoForbiddenKeys(intent, "CapabilityIntent", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "capability-intent");
        assertNoForbiddenKeys(intent.params, "CapabilityIntent.params", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "capability-intent");
        // Recursively guard nested plain-data params against forged authority.
        guardNestedParams(intent.params, "CapabilityIntent.params", 0);
        return intent;
    }

    function guardNestedParams(value, label, depth) {
        var key;
        if (depth > 8) { fail(ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, label + " exceeds the nesting bound.", { stage: "capability-intent" }); }
        if (Array.isArray(value)) {
            value.forEach(function (item) { guardNestedParams(item, label, depth + 1); });
            return;
        }
        if (isPlainObject(value)) {
            assertNoForbiddenKeys(value, label, {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "capability-intent");
            for (key in value) {
                if (hasOwn(value, key)) { guardNestedParams(value[key], label + "." + key, depth + 1); }
            }
        }
    }

    function assertCapabilityId(value, label, context) {
        assertNonEmptyString(value, label, context);
        if (!/^[a-z][a-z0-9-]*-v[1-9][0-9]*$/.test(value)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, label + " is not a valid capability id.", { stage: context }); }
        return value;
    }

    // -------------------------------------------------------------------------
    // ActionCandidate — a locally validated candidate; never authority.
    // -------------------------------------------------------------------------
    function createActionCandidate(input) {
        var candidate = { contractType: "action-candidate", candidateId: null, capabilityId: null, operationKind: null, kind: null, risk: null, params: null, targetScope: null, requiresConfirmation: false, provenance: null };
        if (!isPlainObject(input)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate input must be an object.", { stage: "action-candidate" }); }
        assertNoUnknownKeys(input, ["candidateId", "capabilityId", "operationKind", "kind", "risk", "params", "targetScope", "requiresConfirmation", "provenance"], "ActionCandidate", ERROR_CODES.PLANNING_CONTRACT_INVALID, "action-candidate");
        assertNoForbiddenKeys(input, "ActionCandidate", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
        candidate.candidateId = assertLocalId(input.candidateId, "ActionCandidate.candidateId", "action-candidate");
        candidate.capabilityId = assertCapabilityId(input.capabilityId, "ActionCandidate.capabilityId", "action-candidate");
        // operationKind is the capability-operation discriminator (read/analyze/
        // mutate/create). It is required so a read/analyze candidate is legal
        // without a mutation invocation kind. kind (tool/expression/script) is
        // optional and describes only a mutation-spine invocation form.
        if (!contains(OPERATION_KINDS, input.operationKind)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate.operationKind is not a closed operation kind.", { stage: "action-candidate" }); }
        candidate.operationKind = input.operationKind;
        if (input.kind !== undefined && input.kind !== null) {
            if (!contains(INVOCATION_KINDS, input.kind)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate.kind is not a closed invocation kind.", { stage: "action-candidate" }); }
            candidate.kind = input.kind;
        } else {
            candidate.kind = null;
        }
        if (!contains(RISK_LEVELS, input.risk)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate.risk is not a closed risk level.", { stage: "action-candidate" }); }
        candidate.risk = input.risk;
        if (!isPlainObject(input.params)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate.params must be an object.", { stage: "action-candidate" }); }
        assertNoForbiddenKeys(input.params, "ActionCandidate.params", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
        candidate.params = snapshot(input.params, "ActionCandidate.params");
        candidate.targetScope = normalizeTargetScope(input.targetScope, "action-candidate");
        assertBoolean(input.requiresConfirmation, "ActionCandidate.requiresConfirmation", "action-candidate");
        candidate.requiresConfirmation = input.requiresConfirmation;
        if (input.provenance !== undefined) {
            if (!isPlainObject(input.provenance)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate.provenance must be an object.", { stage: "action-candidate" }); }
            assertNoUnknownKeys(input.provenance, ["source", "moduleRevision", "capabilityId", "requestedOperation", "capabilitySource"], "ActionCandidate.provenance", ERROR_CODES.PLANNING_CONTRACT_INVALID, "action-candidate");
            assertNoForbiddenKeys(input.provenance, "ActionCandidate.provenance", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
            candidate.provenance = snapshot(input.provenance, "ActionCandidate.provenance");
        } else {
            candidate.provenance = Object.freeze({ source: "local-validator" });
        }
        return snapshot(candidate, "ActionCandidate");
    }

    function normalizeTargetScope(scope, context) {
        if (!isPlainObject(scope)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate.targetScope must be an object.", { stage: context }); }
        assertNoForbiddenKeys(scope, context + ".targetScope", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, context);
        if (!contains(TARGET_SCOPE_TYPES, scope.type)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, context + ".targetScope.type is not a closed scope kind.", { stage: context }); }
        return snapshot(scope, "ActionCandidate.targetScope");
    }

    function isActionCandidate(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "action-candidate");
    }

    function snapshotActionCandidate(candidate) {
        if (!isActionCandidate(candidate)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "snapshotActionCandidate requires an ActionCandidate.", { stage: "action-candidate" }); }
        return snapshot(candidate, "ActionCandidate");
    }

    function assertActionCandidateNonAuthoritative(candidate) {
        var step;
        if (!isActionCandidate(candidate)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "assertActionCandidateNonAuthoritative requires an ActionCandidate.", { stage: "action-candidate" }); }
        assertNoForbiddenKeys(candidate, "ActionCandidate", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
        assertNoForbiddenKeys(candidate.params, "ActionCandidate.params", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
        assertNoForbiddenKeys(candidate.targetScope, "ActionCandidate.targetScope", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
        // A candidate must never claim it is approved/confirmed/trusted.
        step = candidate;
        if (Object.prototype.hasOwnProperty.call(step, "approved") || Object.prototype.hasOwnProperty.call(step, "allow") || Object.prototype.hasOwnProperty.call(step, "policyDecision")) {
            fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "ActionCandidate must not carry an approval/authority decision.", { stage: "action-candidate" });
        }
        return candidate;
    }

    // The canonical validation entry point that a future CapabilityCompiler can
    // call once it has locally validated params against a capability contract.
    function normalizeActionCandidate(raw) {
        var candidate;
        if (!isPlainObject(raw)) { fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "ActionCandidate raw input must be an object.", { stage: "action-candidate" }); }
        assertNoForbiddenKeys(raw, "ActionCandidate.raw", {}, ERROR_CODES.PLANNING_CONTRACT_FORBIDDEN_FIELD, "action-candidate");
        candidate = createActionCandidate(raw);
        assertActionCandidateNonAuthoritative(candidate);
        return candidate;
    }

    // -------------------------------------------------------------------------
    // AuthorizedPlan — execution intent after an Authority decision.
    // -------------------------------------------------------------------------
    function createAuthorizedPlan(input) {
        var plan = { contractType: "authorized-plan", planId: null, revision: null, steps: [] };
        var steps;
        if (!isPlainObject(input)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan input must be an object.", { stage: "authorized-plan" }); }
        assertNoUnknownKeys(input, ["planId", "revision", "steps"], "AuthorizedPlan", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        assertNoForbiddenKeys(input, "AuthorizedPlan", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        plan.planId = assertLocalId(input.planId, "AuthorizedPlan.planId", "authorized-plan");
        assertNonNegativeInteger(input.revision, "AuthorizedPlan.revision", "authorized-plan");
        plan.revision = input.revision;
        if (!Array.isArray(input.steps)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan.steps must be an array.", { stage: "authorized-plan" }); }
        steps = input.steps.map(function (step, index) { return normalizeAuthorizedStep(step, index); });
        plan.steps = steps;
        return snapshot(plan, "AuthorizedPlan");
    }

    function normalizeAuthorizedStep(step, index) {
        var normalized = {};
        var scope;
        if (!isPlainObject(step)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan.steps[" + index + "] must be an object.", { stage: "authorized-plan" }); }
        assertNoUnknownKeys(step, ["candidateId", "capabilityId", "kind", "risk", "params", "targetScope", "requiresConfirmation", "policyDecision", "grantProvenance", "authorityEvidence"], "AuthorizedPlan.steps[" + index + "]", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        assertNoForbiddenKeys(step, "AuthorizedPlan.steps[" + index + "]", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        normalized.candidateId = assertLocalId(step.candidateId, "AuthorizedPlan.steps[" + index + "].candidateId", "authorized-plan");
        normalized.capabilityId = assertCapabilityId(step.capabilityId, "AuthorizedPlan.steps[" + index + "].capabilityId", "authorized-plan");
        if (!contains(INVOCATION_KINDS, step.kind)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan.steps[" + index + "].kind is not a closed invocation kind.", { stage: "authorized-plan" }); }
        normalized.kind = step.kind;
        if (!contains(RISK_LEVELS, step.risk)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan.steps[" + index + "].risk is not a closed risk level.", { stage: "authorized-plan" }); }
        normalized.risk = step.risk;
        if (!isPlainObject(step.params)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan.steps[" + index + "].params must be an object.", { stage: "authorized-plan" }); }
        assertNoForbiddenKeys(step.params, "AuthorizedPlan.steps[" + index + "].params", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        normalized.params = snapshot(step.params, "AuthorizedPlan.params");
        scope = normalizeTargetScope(step.targetScope, "authorized-plan.steps[" + index + "]");
        assertNoForbiddenKeys(scope, "AuthorizedPlan.targetScope", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        normalized.targetScope = scope;
        assertBoolean(step.requiresConfirmation, "AuthorizedPlan.steps[" + index + "].requiresConfirmation", "authorized-plan");
        normalized.requiresConfirmation = step.requiresConfirmation;
        if (step.policyDecision !== undefined) { normalized.policyDecision = createPolicyDecision(step.policyDecision); }
        if (step.grantProvenance !== undefined) {
            if (!isPlainObject(step.grantProvenance)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "AuthorizedPlan.steps[" + index + "].grantProvenance must be an object.", { stage: "authorized-plan" }); }
            assertNoUnknownKeys(step.grantProvenance, ["grantId", "capabilityFamily", "source", "issuedAt"], "AuthorizedPlan.grantProvenance", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
            assertNoForbiddenKeys(step.grantProvenance, "AuthorizedPlan.grantProvenance", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
            normalized.grantProvenance = snapshot(step.grantProvenance, "AuthorizedPlan.grantProvenance");
        }
        if (step.authorityEvidence !== undefined) { normalized.authorityEvidence = createAuthorityEvidence(step.authorityEvidence); }
        return normalized;
    }

    function isAuthorizedPlan(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "authorized-plan" && Array.isArray(value.steps));
    }

    function snapshotAuthorizedPlan(plan) {
        if (!isAuthorizedPlan(plan)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "snapshotAuthorizedPlan requires an AuthorizedPlan.", { stage: "authorized-plan" }); }
        return snapshot(plan, "AuthorizedPlan");
    }

    // Structural enforcement of "AuthorizedPlan must not carry a long-trusted
    // final AE target binding": the resolved native identity (layer, item,
    // index, id) and any trusted-binding/host/payload/execution fields are
    // forbidden. Only the semantic target scope descriptor + freshness digests
    // may be present.
    function assertAuthorizedPlanNoTrustedBinding(plan) {
        var i;
        var step;
        if (!isAuthorizedPlan(plan)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "assertAuthorizedPlanNoTrustedBinding requires an AuthorizedPlan.", { stage: "authorized-plan" }); }
        assertNoForbiddenKeys(plan, "AuthorizedPlan", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
        for (i = 0; i < plan.steps.length; i += 1) {
            step = plan.steps[i];
            assertNoForbiddenKeys(step, "AuthorizedPlan.step", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
            assertNoForbiddenKeys(step.targetScope, "AuthorizedPlan.targetScope", { forbiddenMarkers: FORBIDDEN_AUTHORITY_MARKERS }, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "authorized-plan");
            if (hasOwn(step, "policyDecision")) { assertPolicyDecisionClosed(step.policyDecision); }
            if (hasOwn(step, "authorityEvidence")) { assertAuthorityEvidenceNotDerived(step.authorityEvidence); }
        }
        return plan;
    }

    // -------------------------------------------------------------------------
    // PolicyDecision — closed, deterministic, immutable.
    // -------------------------------------------------------------------------
    function createPolicyDecision(input) {
        var decision = { contractType: "policy-decision", decision: null, reasonCode: null, provenance: null, issuedBy: null };
        var provenance;
        if (!isPlainObject(input)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "PolicyDecision input must be an object.", { stage: "policy-decision" }); }
        assertNoUnknownKeys(input, ["decision", "reasonCode", "provenance", "issuedBy"], "PolicyDecision", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "policy-decision");
        assertNoForbiddenKeys(input, "PolicyDecision", {}, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "policy-decision");
        if (!contains(POLICY_DECISIONS, input.decision)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "PolicyDecision.decision is not a closed value.", { stage: "policy-decision" }); }
        decision.decision = input.decision;
        if (input.reasonCode !== undefined && input.reasonCode !== null) {
            decision.reasonCode = assertString(input.reasonCode, "PolicyDecision.reasonCode", "policy-decision");
        } else {
            decision.reasonCode = null;
        }
        if (input.provenance !== undefined) {
            provenance = input.provenance;
            if (!isPlainObject(provenance)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "PolicyDecision.provenance must be an object.", { stage: "policy-decision" }); }
            assertNoUnknownKeys(provenance, ["rule", "capabilityId", "requestedOperation", "issuedBy"], "PolicyDecision.provenance", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "policy-decision");
            assertNoForbiddenKeys(provenance, "PolicyDecision.provenance", {}, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "policy-decision");
            decision.provenance = snapshot(provenance, "PolicyDecision.provenance");
        } else {
            decision.provenance = Object.freeze({});
        }
        if (input.issuedBy !== undefined) {
            if (!contains(TRUSTED_DECISION_SOURCES, input.issuedBy)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "PolicyDecision.issuedBy is not a trusted decision source.", { stage: "policy-decision" }); }
            decision.issuedBy = input.issuedBy;
        } else {
            decision.issuedBy = null;
        }
        return snapshot(decision, "PolicyDecision");
    }

    function isPolicyDecision(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "policy-decision");
    }

    function snapshotPolicyDecision(decision) {
        if (!isPolicyDecision(decision)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "snapshotPolicyDecision requires a PolicyDecision.", { stage: "policy-decision" }); }
        return snapshot(decision, "PolicyDecision");
    }

    function assertPolicyDecisionClosed(decision) {
        if (!isPolicyDecision(decision)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "assertPolicyDecisionClosed requires a PolicyDecision.", { stage: "policy-decision" }); }
        if (!contains(POLICY_DECISIONS, decision.decision)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "PolicyDecision is not closed.", { stage: "policy-decision" }); }
        if (!decision.issuedBy) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "PolicyDecision must carry a trusted issuedBy source.", { stage: "policy-decision" }); }
        return decision;
    }

    // A model/provider-supplied decision carries no authority semantics: only a
    // decision with a trusted local issuedBy source is authoritative. This is the
    // enforced invariant "model output is never execution authority".
    function assertTrustedDecisionSource(decision) {
        if (!isPolicyDecision(decision) || !decision.issuedBy || !contains(TRUSTED_DECISION_SOURCES, decision.issuedBy)) {
            fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "A PolicyDecision must originate from a trusted local source.", { stage: "policy-decision" });
        }
        return decision;
    }

    // -------------------------------------------------------------------------
    // DelegationGrant — typed contract only. It NEVER grants mutation authority.
    // -------------------------------------------------------------------------
    function createDelegationGrant(input) {
        var grant = { contractType: "delegation-grant", grantId: null, capabilityFamily: null, targetScope: null, riskCeiling: null, taskId: null, expiresAt: null, maxActions: null, provenance: null };
        if (!isPlainObject(input)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "DelegationGrant input must be an object.", { stage: "delegation-grant" }); }
        assertNoUnknownKeys(input, ["grantId", "capabilityFamily", "capabilityId", "targetScope", "riskCeiling", "taskId", "expiresAt", "maxActions", "provenance"], "DelegationGrant", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "delegation-grant");
        assertNoForbiddenKeys(input, "DelegationGrant", {}, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "delegation-grant");
        grant.grantId = assertLocalId(input.grantId, "DelegationGrant.grantId", "delegation-grant");
        grant.capabilityFamily = assertNonEmptyString(input.capabilityFamily, "DelegationGrant.capabilityFamily", "delegation-grant");
        if (input.capabilityId !== undefined) { grant.capabilityId = assertCapabilityId(input.capabilityId, "DelegationGrant.capabilityId", "delegation-grant"); }
        if (input.targetScope !== undefined) { grant.targetScope = normalizeTargetScope(input.targetScope, "delegation-grant"); }
        if (!contains(GRANT_RISK_CEILINGS, input.riskCeiling)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "DelegationGrant.riskCeiling is not a closed grant ceiling.", { stage: "delegation-grant" }); }
        grant.riskCeiling = input.riskCeiling;
        if (input.taskId !== undefined) { grant.taskId = assertLocalId(input.taskId, "DelegationGrant.taskId", "delegation-grant"); }
        if (input.expiresAt !== undefined) {
            if (typeof input.expiresAt !== "number" || !Number.isFinite(input.expiresAt)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "DelegationGrant.expiresAt must be a finite number.", { stage: "delegation-grant" }); }
            grant.expiresAt = input.expiresAt;
        }
        if (input.maxActions !== undefined) {
            assertNonNegativeInteger(input.maxActions, "DelegationGrant.maxActions", "delegation-grant");
            grant.maxActions = input.maxActions;
        }
        if (input.provenance !== undefined) {
            if (!isPlainObject(input.provenance)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "DelegationGrant.provenance must be an object.", { stage: "delegation-grant" }); }
            assertNoUnknownKeys(input.provenance, ["source", "requestId", "issuedAt"], "DelegationGrant.provenance", ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "delegation-grant");
            assertNoForbiddenKeys(input.provenance, "DelegationGrant.provenance", {}, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "delegation-grant");
            grant.provenance = snapshot(input.provenance, "DelegationGrant.provenance");
        } else {
            grant.provenance = Object.freeze({});
        }
        return snapshot(grant, "DelegationGrant");
    }

    function isDelegationGrant(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "delegation-grant");
    }

    function snapshotDelegationGrant(grant) {
        if (!isDelegationGrant(grant)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "snapshotDelegationGrant requires a DelegationGrant.", { stage: "delegation-grant" }); }
        return snapshot(grant, "DelegationGrant");
    }

    // In 0.3.5-A a syntactically valid DelegationGrant is only a typed record.
    // It never grants mutation execution authority, never sets executionArmed,
    // and never bypasses the policy. 0.3.6 owns grant activation.
    function grantAllowsMutation(grant) {
        if (!isDelegationGrant(grant)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "grantAllowsMutation requires a DelegationGrant.", { stage: "delegation-grant" }); }
        return false;
    }

    function assertGrantDoesNotAuthorizeMutation(grant) {
        if (!isDelegationGrant(grant)) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "assertGrantDoesNotAuthorizeMutation requires a DelegationGrant.", { stage: "delegation-grant" }); }
        if (grantAllowsMutation(grant) === true) { fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "A DelegationGrant must not authorize a mutation in 0.3.5-A.", { stage: "delegation-grant" }); }
        // Grants carry no authority markers; they are structure + descriptors.
        assertNoForbiddenKeys(grant, "DelegationGrant", {}, ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "delegation-grant");
        return grant;
    }

    // -------------------------------------------------------------------------
    // AuthorityEvidence — immutable receipt/reference; tri-part classification.
    // -------------------------------------------------------------------------
    function createAuthorityEvidence(input) {
        var evidence = { contractType: "authority-evidence", eventKind: null, seq: null, requestId: null, evidenceType: null, classification: null };
        if (!isPlainObject(input)) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "AuthorityEvidence input must be an object.", { stage: "authority-evidence" }); }
        assertNoUnknownKeys(input, ["eventKind", "seq", "requestId", "evidenceType"], "AuthorityEvidence", ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "authority-evidence");
        assertNoForbiddenKeys(input, "AuthorityEvidence", {}, ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "authority-evidence");
        if (!isKnownSessionKind(input.eventKind)) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "AuthorityEvidence.eventKind is not a known SessionEvent kind.", { stage: "authority-evidence" }); }
        evidence.eventKind = input.eventKind;
        assertNonNegativeInteger(input.seq, "AuthorityEvidence.seq", "authority-evidence");
        evidence.seq = input.seq;
        if (input.requestId !== undefined) { evidence.requestId = assertNonEmptyString(input.requestId, "AuthorityEvidence.requestId", "authority-evidence"); }
        if (!contains(AUTHORITY_EVIDENCE_TYPES, input.evidenceType)) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "AuthorityEvidence.evidenceType is not a closed value.", { stage: "authority-evidence" }); }
        // A DerivedEvent can never be classified as authority-evidence: enforce
        // that the caller cannot fabricate an authority-evidence from a derived
        // (or non-whitelisted) kind. This directly enforces the frozen rule.
        if (input.evidenceType === "authority-evidence" && !isAuthorityEvidenceKind(input.eventKind)) {
            fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "Only whitelisted kinds can be authority evidence.", { stage: "authority-evidence" });
        }
        if (input.evidenceType === "authority-evidence" && isDerivedSessionKind(input.eventKind)) {
            fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "A DerivedEvent can never be AuthorityEvidence.", { stage: "authority-evidence" });
        }
        evidence.evidenceType = input.evidenceType;
        evidence.classification = classifyAuthorityEvidence(evidence);
        return snapshot(evidence, "AuthorityEvidence");
    }

    function isAuthorityEvidence(value) {
        return Boolean(value && isPlainObject(value) && value.contractType === "authority-evidence");
    }

    // Three-way classification per frozen §6.1/§6.2:
    //   canonical-record     — a formal session record without evidentiary standing
    //   evidentiary-fact     — a fact that can be world-state basis
    //   authority-evidence   — an authority basis (must be a whitelisted kind)
    function classifyAuthorityEvidence(evidence) {
        var kind;
        var isAuthority;
        var isDerived;
        var isFact;
        if (!isAuthorityEvidence(evidence)) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "classifyAuthorityEvidence requires AuthorityEvidence.", { stage: "authority-evidence" }); }
        kind = evidence.eventKind;
        isDerived = isDerivedSessionKind(kind);
        isFact = Boolean(sessionRuntime && typeof sessionRuntime.classifyEventKind === "function" && sessionRuntime.classifyEventKind(kind) === "fact");
        isAuthority = isAuthorityEvidenceKind(kind) && !isDerived;
        if (isAuthority) { return "authority-evidence"; }
        if (isDerived) { return "canonical-record"; }
        if (isFact) { return "evidentiary-fact"; }
        return "canonical-record";
    }

    function assertAuthorityEvidenceNotDerived(evidence) {
        if (!isAuthorityEvidence(evidence)) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "assertAuthorityEvidenceNotDerived requires AuthorityEvidence.", { stage: "authority-evidence" }); }
        if (isAuthorityEvidenceKind(evidence.eventKind)) {
            if (isDerivedSessionKind(evidence.eventKind)) {
                fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "A DerivedEvent can never be AuthorityEvidence.", { stage: "authority-evidence" });
            }
            return evidence;
        }
        if (evidence.evidenceType === "authority-evidence") {
            fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "AuthorityEvidence.evidenceType is authority-evidence but its kind is not whitelisted.", { stage: "authority-evidence" });
        }
        return evidence;
    }

    function snapshotAuthorityEvidence(evidence) {
        if (!isAuthorityEvidence(evidence)) { fail(ERROR_CODES.AUTHORITY_EVIDENCE_INVALID, "snapshotAuthorityEvidence requires AuthorityEvidence.", { stage: "authority-evidence" }); }
        return snapshot(evidence, "AuthorityEvidence");
    }

    // -------------------------------------------------------------------------
    // LegacyAuthorityPolicy — thin deterministic migration seam (0.3.5-A).
    // NOT a PolicyEngine. Pure function; holds no UI/DOM/Host/Provider
    // ownership. NEVER keys ALLOW off risk === "read".
    // -------------------------------------------------------------------------
    function scopeCovers(declared, targetScope) {
        var targetType;
        if (!declared || !isPlainObject(declared)) { return false; }
        if (!declared.scopeType) { return false; }
        if (declared.scopeType === "current-project") { return true; }
        targetType = targetScope && targetScope.type;
        if (declared.scopeType === "current-comp") { return contains(["current-comp", "selected-layer", "selected-layers"], targetType); }
        if (declared.scopeType === "selected-layers") { return contains(["selected-layer", "selected-layers"], targetType); }
        if (declared.scopeType === "specific-layers") { return contains(["specific-layer", "specific-layers"], targetType); }
        if (declared.scopeType === "none") { return targetType === "none"; }
        return false;
    }

    function legacyAuthorityPolicy(input) {
        var capabilityId;
        var requestedOperation;
        var declaredLocalScope;
        var capabilityKnown;
        var paramsValid;
        var operationSupported;
        var isMutation;
        var provenance;
        var source;
        if (!isPlainObject(input)) { fail(ERROR_CODES.POLICY_INPUT_INVALID, "LegacyAuthorityPolicy input must be an object.", { stage: "legacy-policy" }); }
        assertNoUnknownKeys(input, ["capabilityId", "requestedOperation", "risk", "targetScope", "capabilityKnown", "paramsValid", "operationSupported", "declaredLocalScope"], "LegacyAuthorityPolicy", ERROR_CODES.POLICY_INPUT_INVALID, "legacy-policy");
        assertNoForbiddenKeys(input, "LegacyAuthorityPolicy", {}, ERROR_CODES.POLICY_INPUT_INVALID, "legacy-policy");

        capabilityId = input.capabilityId;
        requestedOperation = input.requestedOperation;
        declaredLocalScope = input.declaredLocalScope || null;
        capabilityKnown = input.capabilityKnown === true;
        paramsValid = input.paramsValid !== false;
        operationSupported = input.operationSupported !== false;

        if (typeof capabilityId !== "string" || capabilityId.length === 0) {
            return createPolicyDecision({ decision: "DENY", reasonCode: "unsupported-operation", issuedBy: "legacy-policy", provenance: { rule: "invalid-input", requestedOperation: requestedOperation || null } });
        }
        if (!contains(OPERATION_KINDS, requestedOperation)) {
            return createPolicyDecision({ decision: "DENY", reasonCode: "unsupported-operation", issuedBy: "legacy-policy", provenance: { rule: "unsupported-operation", capabilityId: capabilityId, requestedOperation: requestedOperation } });
        }
        if (!capabilityKnown) {
            return createPolicyDecision({ decision: "DENY", reasonCode: "unknown-capability", issuedBy: "legacy-policy", provenance: { rule: "unknown-capability", capabilityId: capabilityId } });
        }
        if (!operationSupported) {
            return createPolicyDecision({ decision: "DENY", reasonCode: "unsupported-operation", issuedBy: "legacy-policy", provenance: { rule: "unsupported-operation", capabilityId: capabilityId, requestedOperation: requestedOperation } });
        }
        if (!paramsValid) {
            return createPolicyDecision({ decision: "DENY", reasonCode: "invalid-params", issuedBy: "legacy-policy", provenance: { rule: "invalid-params", capabilityId: capabilityId } });
        }

        isMutation = requestedOperation === "mutate" || requestedOperation === "create";
        if (isMutation) {
            source = { rule: "mutation", capabilityId: capabilityId, requestedOperation: requestedOperation };
            return createPolicyDecision({ decision: "REVIEW_REQUIRED", reasonCode: "mutation", issuedBy: "legacy-policy", provenance: source });
        }

        // read/analyze: ALLOW only with an explicit registration + declared
        // safe-local read/analyze scope. risk label alone is never sufficient.
        if (requestedOperation === "read" || requestedOperation === "analyze") {
            if (!declaredLocalScope || declaredLocalScope.capabilityId !== capabilityId) {
                return createPolicyDecision({ decision: "DENY", reasonCode: "outside-declared-scope", issuedBy: "legacy-policy", provenance: { rule: "no-declared-scope", capabilityId: capabilityId, requestedOperation: requestedOperation } });
            }
            if (!scopeCovers(declaredLocalScope, input.targetScope)) {
                return createPolicyDecision({ decision: "DENY", reasonCode: "outside-declared-scope", issuedBy: "legacy-policy", provenance: { rule: "outside-declared-scope", capabilityId: capabilityId, requestedOperation: requestedOperation } });
            }
            provenance = { rule: "declared-safe-local-read", capabilityId: capabilityId, requestedOperation: requestedOperation };
            return createPolicyDecision({ decision: "ALLOW", reasonCode: "declared-safe-local-read", issuedBy: "legacy-policy", provenance: provenance });
        }

        return createPolicyDecision({ decision: "DENY", reasonCode: "policy-denied", issuedBy: "legacy-policy", provenance: { rule: "outside-explicit-policy", capabilityId: capabilityId, requestedOperation: requestedOperation } });
    }

    // -------------------------------------------------------------------------
    // Cross-contract non-interchangeability (TaskPlan vs AuthorizedPlan)
    // -------------------------------------------------------------------------
    function assertNotInterchangeable(value) {
        if (isTaskPlan(value)) {
            // A TaskPlan is never an AuthorizedPlan: it carries no authority
            // decision, no candidate identity, no risk snapshot.
            if (hasOwn(value, "steps") && value.steps.some(function (step) { return hasOwn(step, "policyDecision") || hasOwn(step, "authorityEvidence"); })) {
                fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "A TaskPlan must not be convertible to an AuthorizedPlan.", { stage: "contract-intersection" });
            }
        }
        if (isAuthorizedPlan(value)) {
            // An AuthorizedPlan must not expose task-plan node kinds.
            if (value.steps.some(function (step) { return contains(PLAN_NODE_KINDS, step.kind); })) {
                fail(ERROR_CODES.AUTHORITY_CONTRACT_INVALID, "An AuthorizedPlan must not carry TaskPlan node kinds.", { stage: "contract-intersection" });
            }
        }
        if (isTaskPlan(value) || isAuthorizedPlan(value)) {
            return value;
        }
        fail(ERROR_CODES.PLANNING_CONTRACT_INVALID, "assertNotInterchangeable requires a TaskPlan or AuthorizedPlan.", { stage: "contract-intersection" });
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        CONTRACT_TYPES: CONTRACT_TYPES,
        PLAN_NODE_KINDS: PLAN_NODE_KINDS,
        OPERATION_KINDS: OPERATION_KINDS,
        INVOCATION_KINDS: INVOCATION_KINDS,
        RISK_LEVELS: RISK_LEVELS,
        POLICY_DECISIONS: POLICY_DECISIONS,
        TARGET_SCOPE_TYPES: TARGET_SCOPE_TYPES,
        AUTHORITY_EVIDENCE_TYPES: AUTHORITY_EVIDENCE_TYPES,
        TRUSTED_DECISION_SOURCES: TRUSTED_DECISION_SOURCES,
        FORBIDDEN_AUTHORITY_MARKERS: FORBIDDEN_AUTHORITY_MARKERS,
        FORBIDDEN_BINDING_KEYS: FORBIDDEN_BINDING_KEYS,
        // TaskPlan
        createTaskPlan: createTaskPlan,
        isTaskPlan: isTaskPlan,
        snapshotTaskPlan: snapshotTaskPlan,
        assertTaskPlanNotExecutable: assertTaskPlanNotExecutable,
        // CapabilityIntent
        createCapabilityIntent: createCapabilityIntent,
        normalizeCapabilityIntent: normalizeCapabilityIntent,
        isCapabilityIntent: isCapabilityIntent,
        snapshotCapabilityIntent: snapshotCapabilityIntent,
        assertCapabilityIntentNonAuthoritative: assertCapabilityIntentNonAuthoritative,
        // ActionCandidate
        createActionCandidate: createActionCandidate,
        normalizeActionCandidate: normalizeActionCandidate,
        isActionCandidate: isActionCandidate,
        snapshotActionCandidate: snapshotActionCandidate,
        assertActionCandidateNonAuthoritative: assertActionCandidateNonAuthoritative,
        // AuthorizedPlan
        createAuthorizedPlan: createAuthorizedPlan,
        isAuthorizedPlan: isAuthorizedPlan,
        snapshotAuthorizedPlan: snapshotAuthorizedPlan,
        assertAuthorizedPlanNoTrustedBinding: assertAuthorizedPlanNoTrustedBinding,
        // PolicyDecision
        createPolicyDecision: createPolicyDecision,
        isPolicyDecision: isPolicyDecision,
        snapshotPolicyDecision: snapshotPolicyDecision,
        assertPolicyDecisionClosed: assertPolicyDecisionClosed,
        assertTrustedDecisionSource: assertTrustedDecisionSource,
        // DelegationGrant
        createDelegationGrant: createDelegationGrant,
        isDelegationGrant: isDelegationGrant,
        snapshotDelegationGrant: snapshotDelegationGrant,
        grantAllowsMutation: grantAllowsMutation,
        assertGrantDoesNotAuthorizeMutation: assertGrantDoesNotAuthorizeMutation,
        // AuthorityEvidence
        createAuthorityEvidence: createAuthorityEvidence,
        isAuthorityEvidence: isAuthorityEvidence,
        classifyAuthorityEvidence: classifyAuthorityEvidence,
        assertAuthorityEvidenceNotDerived: assertAuthorityEvidenceNotDerived,
        snapshotAuthorityEvidence: snapshotAuthorityEvidence,
        // LegacyAuthorityPolicy (migration seam)
        legacyAuthorityPolicy: legacyAuthorityPolicy,
        scopeCovers: scopeCovers,
        // cross-contract
        isAuthorityEvidenceKind: isAuthorityEvidenceKind,
        isDerivedSessionKind: isDerivedSessionKind,
        assertNotInterchangeable: assertNotInterchangeable,
        // helpers (fail-closed primitives)
        isPlainObject: isPlainObject,
        deepFreeze: deepFreeze,
        cloneJson: cloneJson,
        snapshot: snapshot
    });
}));
