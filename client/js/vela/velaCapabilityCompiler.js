(function (root, factory) {
    "use strict";

    var hasModule = typeof module === "object" && module.exports;
    var planning = hasModule
        ? require("./velaPlanningContracts")
        : (root && root.VelaPlanningContracts) || null;

    var exported = Object.freeze(factory(planning));

    if (hasModule) {
        module.exports = exported;
    } else {
        if (root && root.self === root && root["win" + "dow"] === root && !Object.prototype.hasOwnProperty.call(root, "VelaCapabilityCompiler")) {
            Object.defineProperty(root, "VelaCapabilityCompiler", { configurable: false, enumerable: true, value: exported, writable: false });
        }
    }
}(typeof self !== "undefined" ? self : this, function (planning) {
    "use strict";

    // =========================================================================
    // 0.3.5-B CapabilityCompiler — a deterministic local compile boundary.
    // Contract: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x, §3/§7).
    //
    //   CapabilityIntent → CapabilityCompiler → ActionCandidate
    //
    // The Compiler is NOT a planner, NOT an authority, NOT an executor. It only:
    //   1. verifies the capability is registered,
    //   2. verifies the requested operation is supported,
    //   3. validates/canonicalizes planner-suppliable params,
    //   4. rejects planner/model-forbidden fields (target, nonce, authority, ...),
    //   5. injects local-runtime-owned metadata (risk, targetScope, provenance),
    //   6. produces an immutable, non-authoritative ActionCandidate.
    //
    // The capability source of truth is the REAL Capability Registry /
    // Capability Contracts, reached through an injected resolveCapability. This
    // module is standalone UMD and is intentionally NOT production-loaded; it is
    // exercised by Node tests.
    // =========================================================================

    if (!planning || typeof planning.createActionCandidate !== "function" || typeof planning.createCapabilityIntent !== "function" || typeof planning.isCapabilityIntent !== "function" || typeof planning.assertCapabilityIntentNonAuthoritative !== "function" || typeof planning.assertActionCandidateNonAuthoritative !== "function" || typeof planning.isPlainObject !== "function") {
        throw new Error("RUNTIME_CAPABILITY_UNAVAILABLE");
    }

    var MODULE_REVISION = "vela-capability-compiler-v1";

    // Compiler-local stable fail-closed codes. Distinct from existing protocol
    // codes and from the 0.3.5-A planning/authority codes (no collision).
    var ERROR_CODES = Object.freeze({
        CAPABILITY_COMPILATION_FAILED: "CAPABILITY_COMPILATION_FAILED",
        CAPABILITY_NOT_REGISTERED: "CAPABILITY_NOT_REGISTERED",
        CAPABILITY_OPERATION_UNSUPPORTED: "CAPABILITY_OPERATION_UNSUPPORTED",
        CAPABILITY_PARAMS_INVALID: "CAPABILITY_PARAMS_INVALID"
    });

    var OPERATION_KINDS = planning.OPERATION_KINDS;
    var RISK_LEVELS = planning.RISK_LEVELS;
    var INVOCATION_KINDS = planning.INVOCATION_KINDS;
    var TARGET_SCOPE_TYPES = planning.TARGET_SCOPE_TYPES;
    var FORBIDDEN_AUTHORITY_MARKERS = planning.FORBIDDEN_AUTHORITY_MARKERS;
    var FORBIDDEN_BINDING_KEYS = planning.FORBIDDEN_BINDING_KEYS;

    function fail(code, message, details) {
        var error = new Error(message || code);
        error.code = code;
        if (details !== undefined) { error.details = details; }
        throw error;
    }

    function isPlainObject(value) { return planning.isPlainObject(value); }
    function hasOwn(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function contains(list, value) { return list.indexOf(value) !== -1; }
    function clone(value) { return planning.cloneJson(value, [], "compiler"); }

    function assertNoForbiddenKeys(value, label, code, context) {
        var key;
        var normalized;
        var i;
        var j;
        if (!isPlainObject(value)) { return; }
        for (key in value) {
            if (!hasOwn(value, key)) { continue; }
            normalized = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
            for (i = 0; i < FORBIDDEN_AUTHORITY_MARKERS.length; i += 1) { if (normalized === FORBIDDEN_AUTHORITY_MARKERS[i]) { fail(code, label + " carries a forbidden authority/execution field: " + key, { stage: context }); } }
            for (j = 0; j < FORBIDDEN_BINDING_KEYS.length; j += 1) { if (normalized === FORBIDDEN_BINDING_KEYS[j]) { fail(code, label + " carries a forbidden resolved-target/binding field: " + key, { stage: context }); } }
        }
    }

    // -------------------------------------------------------------------------
    // Parameter schema validation (closed; mirrors the capability validators)
    // -------------------------------------------------------------------------
    function validateSchemaValue(schema, value, label) {
        var key;
        var i;
        if (value === null && schema.nullable === true) { return null; }
        if (schema.type === "object") {
            if (value === null || typeof value !== "object" || Array.isArray(value)) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " must be an object."); }
            for (key in value) {
                if (hasOwn(value, key) && !hasOwn(schema.properties || {}, key)) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " has an unknown property: " + key); }
            }
            for (i = 0; i < (schema.required || []).length; i += 1) { if (!hasOwn(value, schema.required[i])) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " is missing required property: " + schema.required[i]); } }
            if (!schema.properties) { return clone(value); }
            for (key in schema.properties) {
                if (hasOwn(schema.properties, key) && hasOwn(value, key)) { validateSchemaValue(schema.properties[key], value[key], label + "." + key); }
            }
            return clone(value);
        }
        if (schema.type === "number") {
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " must be a finite number."); }
            if (schema.minimum !== undefined && value < schema.minimum) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " is below the minimum."); }
            if (schema.maximum !== undefined && value > schema.maximum) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " is above the maximum."); }
        } else if (schema.type === "string") {
            if (typeof value !== "string") { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " must be a string."); }
        } else if (schema.type === "boolean") {
            if (typeof value !== "boolean") { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " must be a boolean."); }
        } else {
            fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " has an unsupported schema type.");
        }
        if (schema.enum && schema.enum.indexOf(value) === -1) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, label + " is not an allowed enum value."); }
        return clone(value);
    }

    // -------------------------------------------------------------------------
    // Canonical capability view (the single shape the Compiler consumes).
    // -------------------------------------------------------------------------
    function canonicalizeCapability(raw, source) {
        var view;
        var modelMaySupply;
        var suppliable;
        if (!isPlainObject(raw) || typeof raw.capabilityId !== "string" || raw.capabilityId.length === 0) {
            fail(ERROR_CODES.CAPABILITY_COMPILATION_FAILED, "A capability descriptor is required.", { stage: "capability-view" });
        }
        if (source === "agent-registry") {
            if (typeof raw.kind !== "string" || !contains(planning.OPERATION_KINDS, raw.kind) || !isPlainObject(raw.inputSchema)) {
                fail(ERROR_CODES.CAPABILITY_COMPILATION_FAILED, "Invalid agent-registry capability descriptor.", { stage: "capability-view" });
            }
            view = {
                capabilityId: raw.capabilityId,
                source: "agent-registry",
                operationKind: raw.kind,
                supportedOperations: Object.freeze([raw.kind]),
                risk: contains(RISK_LEVELS, raw.kind) ? raw.kind : "read",
                paramsSchema: raw.inputSchema,
                suppliableFields: Object.freeze(Object.keys(raw.inputSchema.properties || {}).slice().sort()),
                invocationKind: null,
                registeredAction: raw.adapterId ? Object.freeze({ adapterId: raw.adapterId }) : null,
                targetScope: Object.freeze({ type: "current-comp" }),
                requiresConfirmation: false,
                available: true
            };
        } else if (source === "legacy-contracts") {
            if (!isPlainObject(raw.parameters) || !isPlainObject(raw.modelPolicy) || !isPlainObject(raw.registeredAction)) {
                fail(ERROR_CODES.CAPABILITY_COMPILATION_FAILED, "Invalid legacy capability contract.", { stage: "capability-view" });
            }
            modelMaySupply = Array.isArray(raw.modelPolicy.modelMaySupply) ? raw.modelPolicy.modelMaySupply : [];
            suppliable = modelMaySupply.map(function (path) {
                return typeof path === "string" && path.indexOf("params.") === 0 ? path.slice("params.".length) : path;
            });
            view = {
                capabilityId: raw.capabilityId,
                source: "legacy-contracts",
                operationKind: "mutate",
                supportedOperations: Object.freeze(["mutate", "create"]),
                risk: "write",
                paramsSchema: raw.parameters,
                suppliableFields: Object.freeze(suppliable.slice().sort()),
                invocationKind: "tool",
                registeredAction: Object.freeze({ toolId: raw.registeredAction.toolId, actionId: raw.registeredAction.actionId }),
                targetScope: Object.freeze({ type: "selected-layer" }),
                requiresConfirmation: true,
                available: true
            };
        } else {
            fail(ERROR_CODES.CAPABILITY_COMPILATION_FAILED, "Unsupported capability source.", { stage: "capability-view" });
        }
        return Object.freeze(view);
    }

    function validateCapabilityView(view) {
        if (!view || typeof view !== "object") { return false; }
        if (typeof view.capabilityId !== "string" || typeof view.operationKind !== "string" || !contains(OPERATION_KINDS, view.operationKind) || !Array.isArray(view.supportedOperations) || !contains(RISK_LEVELS, view.risk) || !isPlainObject(view.paramsSchema) || !Array.isArray(view.suppliableFields)) { return false; }
        return true;
    }

    // -------------------------------------------------------------------------
    // Resolver adapter over the REAL registries (source of truth; no second copy)
    // -------------------------------------------------------------------------
    function createCapabilityViewResolver(options) {
        var agentRegistry = options && options.agentRegistry;   // System B registry (getContract)
        var legacyContracts = options && options.legacyContracts; // System A module (getLocalProjection)
        function resolveCapability(capabilityId) {
            var descriptor;
            if (typeof capabilityId !== "string" || capabilityId.length === 0) { return null; }
            if (agentRegistry && typeof agentRegistry.getContract === "function") {
                descriptor = agentRegistry.getContract(capabilityId);
                if (descriptor) { return canonicalizeCapability(descriptor, "agent-registry"); }
            }
            if (legacyContracts && typeof legacyContracts.getContract === "function") {
                descriptor = legacyContracts.getContract(capabilityId);
                if (descriptor) { return canonicalizeCapability(descriptor, "legacy-contracts"); }
            }
            return null;
        }
        return Object.freeze({ resolveCapability: resolveCapability });
    }

    // -------------------------------------------------------------------------
    // Compiler core
    // -------------------------------------------------------------------------
    function createCapabilityCompiler(options) {
        var settings;
        var resolveCapability;
        var makeId;
        if (!isPlainObject(options) || typeof options.resolveCapability !== "function") {
            fail(ERROR_CODES.CAPABILITY_COMPILATION_FAILED, "createCapabilityCompiler requires resolveCapability.", { stage: "compiler-create" });
        }
        settings = options;
        resolveCapability = settings.resolveCapability;
        makeId = typeof settings.makeId === "function" ? settings.makeId : defaultMakeId;

        function canonicalParams(intent, view) {
            var params = intent.params || {};
            var canonical = {};
            var keys = Object.keys(params);
            var key;
            var max = view.suppliableFields;
            var i;
            // Fail-closed: planner/model params must be a strict subset of the
            // fields the capability contract marks as model-suppliable. Any other
            // key (local-only, unknown, or a forged target/authority field) fails.
            for (i = 0; i < keys.length; i += 1) {
                key = keys[i];
                if (max.indexOf(key) === -1) { fail(ERROR_CODES.CAPABILITY_PARAMS_INVALID, "Parameter '" + key + "' is not a model-suppliable field for this capability."); }
            }
            // Forbidden authority/execution fields fail closed even if upstream
            // supposedly validated them. This is the Compiler's own trust edge.
            assertNoForbiddenKeys(params, "CapabilityIntent.params", ERROR_CODES.CAPABILITY_PARAMS_INVALID, "compiler-params");
            // Validate the (already-subset) params against the closed schema.
            canonical = validateSchemaValue(view.paramsSchema, params, "CapabilityIntent.params");
            return canonical;
        }

        function compile(intent) {
            var view;
            var candidate;
            var provenance;
            var canonical;
            if (!planning.isCapabilityIntent(intent)) {
                fail(planning.ERROR_CODES.PLANNING_CONTRACT_INVALID, "compileCapabilityIntent requires a CapabilityIntent.", { stage: "compiler-compile" });
            }
            // Compiler trust boundary: even if a CapabilityIntent object was
            // assembled directly, re-check it carries no authority/binding.
            planning.assertCapabilityIntentNonAuthoritative(intent);
            view = resolveCapability(intent.capabilityId);
            if (!view || !validateCapabilityView(view)) {
                fail(ERROR_CODES.CAPABILITY_NOT_REGISTERED, "Capability is not registered: " + intent.capabilityId, { stage: "compiler-compile", details: { capabilityId: intent.capabilityId } });
            }
            if (view.supportedOperations.indexOf(intent.requestedOperation) === -1) {
                fail(ERROR_CODES.CAPABILITY_OPERATION_UNSUPPORTED, "Operation is not supported by this capability.", { stage: "compiler-compile", details: { capabilityId: intent.capabilityId, requestedOperation: intent.requestedOperation, supportedOperations: view.supportedOperations } });
            }
            canonical = canonicalParams(intent, view);
            provenance = Object.freeze({
                source: "compiler",
                moduleRevision: MODULE_REVISION,
                capabilityId: intent.capabilityId,
                requestedOperation: intent.requestedOperation,
                capabilitySource: view.source
            });
            candidate = planning.createActionCandidate({
                candidateId: makeId("cand"),
                capabilityId: intent.capabilityId,
                operationKind: view.operationKind,
                kind: view.invocationKind,
                risk: view.risk,
                params: canonical,
                targetScope: view.targetScope,
                requiresConfirmation: view.requiresConfirmation,
                provenance: provenance
            });
            // Enforce the output is non-authoritative (never approval/authority).
            planning.assertActionCandidateNonAuthoritative(candidate);
            return candidate;
        }

        return Object.freeze({
            MODULE_REVISION: MODULE_REVISION,
            ERROR_CODES: ERROR_CODES,
            resolveCapability: resolveCapability,
            compile: compile
        });
    }

    function defaultMakeId(kind) {
        var hex = "";
        var i;
        var randomBytes;
        var cryptoObj = (typeof globalThis !== "undefined" && globalThis.crypto) || (typeof self !== "undefined" && self.crypto) || null;
        if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
            randomBytes = new Uint8Array(32);
            cryptoObj.getRandomValues(randomBytes);
            for (i = 0; i < randomBytes.length; i += 1) { hex += ("0" + randomBytes[i].toString(16)).slice(-2); }
        } else {
            for (i = 0; i < 4; i += 1) { hex += Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0"); }
        }
        return String(kind || "id") + "_" + hex;
    }

    function compileCapabilityIntent(intent, environment) {
        var env = isPlainObject(environment) ? environment : {};
        var compiler;
        if (typeof env.resolveCapability !== "function") { fail(ERROR_CODES.CAPABILITY_COMPILATION_FAILED, "compileCapabilityIntent requires an environment capability resolver.", { stage: "compileCapabilityIntent" }); }
        compiler = createCapabilityCompiler({ resolveCapability: env.resolveCapability, makeId: env.makeId });
        return compiler.compile(intent);
    }

    return Object.freeze({
        MODULE_REVISION: MODULE_REVISION,
        ERROR_CODES: ERROR_CODES,
        createCapabilityCompiler: createCapabilityCompiler,
        compileCapabilityIntent: compileCapabilityIntent,
        canonicalizeCapability: canonicalizeCapability,
        createCapabilityViewResolver: createCapabilityViewResolver,
        validateCapabilityView: validateCapabilityView,
        isCapabilityIntent: planning.isCapabilityIntent,
        createCapabilityIntent: planning.createCapabilityIntent
    });
}));
