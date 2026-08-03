#!/usr/bin/env node
"use strict";

const assert = require("assert");
const protocolModule = require("../client/js/vela/velaProtocol");
const validatorModule = require("../client/js/vela/velaValidator");
const planModule = require("../client/js/vela/velaPlan");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const CONTEXT_FP = "sha256:" + "1".repeat(64);
const OTHER_CONTEXT_FP = "sha256:" + "2".repeat(64);
let assertions = 0;

function localId(kind, value) { return kind + "_" + Number(value).toString(36).padStart(32, "0"); }

function makeStore(authority, seed) {
    let candidate = 0;
    let confirmation = 0;
    return planModule.createPlanStore(protocol, {
        validatorAuthority: authority,
        candidateIdFactory: () => localId("cand", seed * 100 + (++candidate)),
        nonceFactory: () => localId("confirm", seed * 100 + (++confirmation)),
        planIdFactory: () => localId("plan", seed),
        reservationIdFactory: () => localId("res", seed),
        sessionIdFactory: () => localId("session", seed),
        now: () => seed
    });
}

function capabilityAction(overrides) {
    return Object.assign({
        id: "create",
        executable: true,
        risk: "write",
        targetScope: ["layer"],
        capabilityRevision: "registry-v1",
        paramsSchema: { type: "object", additionalProperties: false, properties: {} }
    }, overrides || {});
}

function capabilitiesFor(action) {
    return { registry: { local: { id: "local", actions: { create: action } } } };
}

function check(condition, message) { assert.ok(condition, message); assertions += 1; }
function expectCode(callback, code, message) { assert.throws(callback, (error) => error && error.code === code, message || ("Expected " + code)); assertions += 1; }

const capabilities = {
    registry: {
        textBackgroundBox: {
            id: "textBackgroundBox",
            actions: {
                create: {
                    id: "create",
                    executable: true,
                    risk: "write",
                    targetScope: ["layer", "property"],
                    capabilityRevision: "registry-v1",
                    paramsSchema: {
                        type: "object",
                        required: ["paddingX"],
                        additionalProperties: false,
                        properties: {
                            paddingX: { type: "number", minimum: 0, maximum: 200 },
                            paddingY: { type: "number", minimum: 0, maximum: 200 }
                        }
                    }
                },
                inspect: {
                    id: "inspect",
                    executable: true,
                    risk: "read",
                    targetScope: ["layer", "property"],
                    capabilityRevision: "registry-v1",
                    paramsSchema: { type: "object", additionalProperties: false, properties: {} }
                }
            }
        }
    },
    expressionTemplates: {
        positionOffset: {
            templateId: "positionOffset",
            risk: "write",
            targetScope: ["property"],
            definitionRevision: "expression-v1",
            argsSchema: {
                type: "object",
                required: ["distance"],
                additionalProperties: false,
                properties: { distance: { type: "number", minimum: 0, maximum: 100 } }
            }
        }
    },
    scriptAllowlist: {
        setTextColor: {
            scriptId: "setTextColor",
            risk: "script",
            targetScope: ["layer", "property"],
            definitionRevision: "script-v1",
            argsSchema: {
                type: "object",
                required: ["hex"],
                additionalProperties: false,
                properties: { hex: { type: "string", minLength: 7, maxLength: 7 } }
            }
        }
    }
};

function baseAction(kind, payload, overrides) {
    return Object.assign({
        providerActionId: "provider_action_01",
        kind: kind || "tool",
        title: "A bounded Vela action",
        rationale: "A local test proposal.",
        risk: "read",
        target: { contextFingerprint: CONTEXT_FP, compId: "comp-session-01", layerIndex: 3, propertyPath: ["ADBE Transform Group", "ADBE Position"] },
        payload: payload || {},
        undoGroupLabel: "Vela: Test action",
        requiresConfirmation: true
    }, overrides || {});
}

function run() {
    const validator = validatorModule.createActionValidator(protocol, capabilities);
    const validTool = baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 40 } }, { risk: "external" });
    const validatedTool = validator.validateActionProposal(validTool);
    check(validatedTool.computedRisk === "write", "Local registry risk must override provider risk.");
    check(validatedTool.action.requiresConfirmation === true, "Mutating tool actions must require confirmation.");
    check(validatedTool.action.payload.toolId === "textBackgroundBox", "Tool id must remain typed data.");
    check(validator.authority.isValidatedAction(validatedTool.action) === true, "Only the local validator authority can sign an action.");
    check(Object.isFrozen(validatedTool.action) === true, "Validated actions must be frozen.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: {} })), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Missing required parameters must fail.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 201 } })), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Out-of-range parameters must be rejected.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 40, unknown: true } })), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unknown typed parameters must be rejected.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 40, hostFunction: "bad" } })), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Nested executable fields must be rejected.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "not-loaded", actionId: "create", params: {} })), protocol.ERROR_CODES.UNKNOWN_TOOL, "Unknown tools must be rejected.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "not-declared", params: {} })), protocol.ERROR_CODES.UNKNOWN_TOOL_ACTION, "Unknown tool actions must be rejected.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 40 } }, { target: { contextFingerprint: CONTEXT_FP } })), protocol.ERROR_CODES.UNKNOWN_TARGET, "Name-free target references must be explicit.");
    expectCode(() => validator.validateActionProposal(baseAction("tool", { toolId: "textBackgroundBox", actionId: "create", params: { paddingX: 40 } }), { expectedContextFingerprint: OTHER_CONTEXT_FP }), protocol.ERROR_CODES.CONTEXT_STALE, "Stale proposal fingerprints must be rejected.");

    const fakeRegistry = { textBackgroundBox: { id: "textBackgroundBox", actions: { fake: { id: "fake", risk: "write", targetScope: ["layer"], capabilityRevision: "x", paramsSchema: { type: "object", additionalProperties: false } } } } };
    expectCode(() => validatorModule.createActionValidator(protocol, { registry: fakeRegistry }), protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE, "Actions without executable true must be rejected during capability snapshot.");
    [false, "true", 1].forEach((value) => {
        expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(capabilityAction({ executable: value }))), protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE, "Executable must be own boolean true.");
    });
    const getterExecutable = capabilityAction();
    Object.defineProperty(getterExecutable, "executable", { enumerable: true, get: () => true });
    expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(getterExecutable)), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Executable getters must be rejected.");
    const throwingDescriptor = new Proxy(capabilityAction(), { getOwnPropertyDescriptor(target, key) { if (key === "executable") throw new Error("descriptor"); return Reflect.getOwnPropertyDescriptor(target, key); } });
    expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(throwingDescriptor)), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Descriptor failures must fail closed.");
    const inheritedDefinition = Object.create(capabilityAction());
    expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(inheritedDefinition)), protocol.ERROR_CODES.UNSAFE_JSON_VALUE, "Prototype capability definitions must be rejected.");
    const oldExecutable = Object.prototype.executable;
    const oldRisk = Object.prototype.risk;
    const oldParamsSchema = Object.prototype.paramsSchema;
    const oldRevision = Object.prototype.capabilityRevision;
    const oldRegistry = Object.prototype.registry;
    const oldProperties = Object.prototype.properties;
    try {
        Object.prototype.executable = true;
        const noExecutable = capabilityAction(); delete noExecutable.executable;
        expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(noExecutable)), protocol.ERROR_CODES.ACTION_NOT_EXECUTABLE, "Inherited executable must be rejected.");
        Object.prototype.risk = "write";
        const noRisk = capabilityAction(); delete noRisk.risk;
        expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(noRisk)), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Inherited risk must be rejected.");
        Object.prototype.paramsSchema = { type: "object", additionalProperties: false, properties: {} };
        const noSchema = capabilityAction(); delete noSchema.paramsSchema;
        expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(noSchema)), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Inherited parameter schemas must be rejected.");
        Object.prototype.capabilityRevision = "inherited";
        const noRevision = capabilityAction(); delete noRevision.capabilityRevision;
        expectCode(() => validatorModule.createActionValidator(protocol, capabilitiesFor(noRevision)), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Inherited revisions must be rejected.");
        Object.prototype.registry = capabilitiesFor(capabilityAction()).registry;
        const emptyCapabilitiesValidator = validatorModule.createActionValidator(protocol, {});
        expectCode(() => emptyCapabilitiesValidator.validateActionProposal(baseAction("tool", { toolId: "local", actionId: "create", params: {} })), protocol.ERROR_CODES.UNKNOWN_TOOL, "Inherited capability registries must be ignored.");
        Object.prototype.properties = { inheritedParam: { type: "string" } };
        const isolatedSchemaValidator = validatorModule.createActionValidator(protocol, capabilitiesFor(capabilityAction({ paramsSchema: { type: "object", additionalProperties: false } })));
        expectCode(() => isolatedSchemaValidator.validateActionProposal(baseAction("tool", { toolId: "local", actionId: "create", params: { inheritedParam: "bad" } }, { target: { contextFingerprint: CONTEXT_FP, layerId: "layer-1" } })), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Inherited schema properties must not expand local schemas.");
    } finally {
        if (oldExecutable === undefined) delete Object.prototype.executable; else Object.prototype.executable = oldExecutable;
        if (oldRisk === undefined) delete Object.prototype.risk; else Object.prototype.risk = oldRisk;
        if (oldParamsSchema === undefined) delete Object.prototype.paramsSchema; else Object.prototype.paramsSchema = oldParamsSchema;
        if (oldRevision === undefined) delete Object.prototype.capabilityRevision; else Object.prototype.capabilityRevision = oldRevision;
        if (oldRegistry === undefined) delete Object.prototype.registry; else Object.prototype.registry = oldRegistry;
        if (oldProperties === undefined) delete Object.prototype.properties; else Object.prototype.properties = oldProperties;
    }
    const oldTemplateId = Object.prototype.templateId;
    const oldScriptId = Object.prototype.scriptId;
    try {
        Object.prototype.templateId = "positionOffset";
        expectCode(() => validatorModule.createActionValidator(protocol, { expressionTemplates: { inherited: { risk: "write", targetScope: ["property"], definitionRevision: "v1", argsSchema: { type: "object", additionalProperties: false, properties: {} } } } }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Inherited expression template ids must be rejected.");
        Object.prototype.scriptId = "setTextColor";
        expectCode(() => validatorModule.createActionValidator(protocol, { scriptAllowlist: { inherited: { risk: "script", targetScope: ["layer"], definitionRevision: "v1", argsSchema: { type: "object", additionalProperties: false, properties: {} } } } }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Inherited script ids must be rejected.");
    } finally {
        if (oldTemplateId === undefined) delete Object.prototype.templateId; else Object.prototype.templateId = oldTemplateId;
        if (oldScriptId === undefined) delete Object.prototype.scriptId; else Object.prototype.scriptId = oldScriptId;
    }

    const expression = baseAction("expression", { templateId: "positionOffset", args: { distance: 12 }, expressionText: "raw expression source", preview: { before: [0, 0], after: [12, 0] } });
    const expressionResult = validator.validateActionProposal(expression);
    check(expressionResult.computedRisk === "write", "Expression risk must be locally classified.");
    check(expressionResult.action.payload.expressionText === undefined, "Raw expression text must not enter executable payload.");
    check(expressionResult.display.displayExpressionPreview === expression.payload.expressionText, "Raw expression text must be display-only.");
    check(expressionResult.action.requiresConfirmation === true, "Expression actions require confirmation.");
    expectCode(() => validator.validateActionProposal(baseAction("expression", { templateId: "positionOffset", args: { distance: 12 }, preview: { before: 0, after: 1 } }, { target: { contextFingerprint: CONTEXT_FP, compId: "c" } })), protocol.ERROR_CODES.UNKNOWN_TARGET, "Expression actions require a property target.");
    expectCode(() => validator.validateActionProposal(baseAction("expression", { templateId: "missing", args: {}, preview: { before: 0, after: 1 } })), protocol.ERROR_CODES.EXPRESSION_NOT_ALLOWLISTED, "Unregistered expression templates must be rejected.");

    const script = baseAction("script", { scriptId: "setTextColor", args: { hex: "#ff0000" }, source: "raw script source" }, { risk: "read" });
    const scriptResult = validator.validateActionProposal(script);
    check(scriptResult.computedRisk === "script", "Script risk must come from the local allowlist.");
    check(scriptResult.action.payload.source === undefined, "Raw script source must not enter executable payload.");
    check(scriptResult.display.displaySourcePreview === script.payload.source, "Script source must be display-only.");
    check(scriptResult.action.requiresConfirmation === true, "Script actions require explicit confirmation.");
    expectCode(() => validator.validateActionProposal(baseAction("script", { scriptId: "not-registered", args: {} })), protocol.ERROR_CODES.SCRIPT_NOT_ALLOWLISTED, "Unregistered script ids must be rejected.");
    expectCode(() => validator.validateActionProposal(baseAction("script", { scriptId: "setTextColor", args: { hex: "#ff0000" }, source: "x".repeat(protocol.HARD_LIMITS.maxDisplayScriptSourceBytes + 1) })), protocol.ERROR_CODES.PAYLOAD_BUDGET_EXCEEDED, "Display-only script source must be bounded.");
    expectCode(() => validator.validateActionProposal(baseAction("javascript", {})), protocol.ERROR_CODES.UNKNOWN_ACTION_KIND, "Unknown action kinds must be rejected.");
    const safeValidationFailure = validator.tryValidateActionProposal(baseAction("javascript", {}));
    check(safeValidationFailure.ok === false && Object.isFrozen(safeValidationFailure.error) && !("stack" in safeValidationFailure.error), "Non-throwing validator errors must be frozen canonical records without stacks.");

    expectCode(() => planModule.createPlanStore(protocol, { validatorAuthority: { isValidatedAction: () => true } }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Fake authorities must be rejected before PlanStore creation.");
    expectCode(() => planModule.createPlanStore(protocol, { validatorAuthority: Object.assign({}, validator.authority) }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Authority shallow clones must be rejected.");
    expectCode(() => planModule.createPlanStore(protocol, { validatorAuthority: Object.create(validator.authority) }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Authority prototype clones must be rejected.");
    expectCode(() => planModule.createPlanStore(protocol, { validatorAuthority: { validated: true, brand: "trusted", isValidatedAction: validator.authority.isValidatedAction } }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Fake authority brands must be rejected.");
    expectCode(() => planModule.createPlanStore(Object.assign({}, protocol), { validatorAuthority: validator.authority }), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Duck-typed protocol objects must not bypass PlanStore hard limits.");
    expectCode(() => planModule.createPlanStore(Object.create(protocol), { validatorAuthority: validator.authority }), protocol.ERROR_CODES.RUNTIME_CAPABILITY_UNAVAILABLE, "Protocol prototype clones must be rejected.");
    const secondProtocol = protocolModule.createProtocol(runtime);
    const secondValidator = validatorModule.createActionValidator(secondProtocol, capabilities);
    expectCode(() => planModule.createPlanStore(secondProtocol, { validatorAuthority: validator.authority }), protocol.ERROR_CODES.PROTOCOL_AUTHORITY_MISMATCH, "A P1 authority must not create a P2 PlanStore.");
    expectCode(() => planModule.createPlanStore(protocol, { validatorAuthority: secondValidator.authority }), protocol.ERROR_CODES.PROTOCOL_AUTHORITY_MISMATCH, "A P2 authority must not create a P1 PlanStore.");
    const maliciousProtocol = protocolModule.createProtocol(Object.assign({}, runtime, { utf8ByteLength: () => 0 }));
    expectCode(() => planModule.createPlanStore(maliciousProtocol, { validatorAuthority: validator.authority }), protocol.ERROR_CODES.PROTOCOL_AUTHORITY_MISMATCH, "Cross-protocol byte-budget attacks must fail before plan budget calculation.");
    check(validatorModule.isTrustedAuthorityForProtocol(validator.authority, protocol) === true && validatorModule.isTrustedAuthorityForProtocol(validator.authority, secondProtocol) === false, "Authority trust must use exact protocol object identity.");
    const validatorModulePath = require.resolve("../client/js/vela/velaValidator");
    const cachedValidatorModule = require.cache[validatorModulePath];
    try {
        delete require.cache[validatorModulePath];
        const isolatedValidatorModule = require("../client/js/vela/velaValidator");
        const isolatedValidator = isolatedValidatorModule.createActionValidator(protocol, capabilities);
        expectCode(() => planModule.createPlanStore(protocol, { validatorAuthority: isolatedValidator.authority }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Authorities from another validator module instance must be rejected.");
    } finally {
        require.cache[validatorModulePath] = cachedValidatorModule;
    }

    const store = makeStore(validator.authority, 1);
    const plan = store.createPlan({ validatedActions: [validatedTool.action], validatorAuthority: validator.authority, contextFingerprint: CONTEXT_FP, settingsFingerprint: "sha256:" + "2".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: "policy-1" } });
    check(plan.candidates.length === 1 && plan.state === "pending-confirmation", "A plan must contain immutable candidate records.");
    expectCode(() => store.createPlan({ validatedActions: [protocol.cloneJson(validatedTool.action)], contextFingerprint: CONTEXT_FP, settingsFingerprint: "sha256:" + "2".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: "policy-1" } }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Cloned actions must not become validated candidates.");
    expectCode(() => store.createPlan({ validatedActions: [Object.assign({}, validatedTool.action)], contextFingerprint: CONTEXT_FP, settingsFingerprint: "sha256:" + "2".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: "policy-1" } }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Shallow action clones must not become validated candidates.");
    expectCode(() => store.createPlan({ validatedActions: [JSON.parse(JSON.stringify(validatedTool.action))], contextFingerprint: CONTEXT_FP, settingsFingerprint: "sha256:" + "2".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: "policy-1" } }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "JSON action clones must not become validated candidates.");
    const validatorB = validatorModule.createActionValidator(protocol, capabilities);
    const storeB = makeStore(validatorB.authority, 2);
    expectCode(() => storeB.createPlan({ validatedActions: [validatedTool.action], contextFingerprint: CONTEXT_FP, settingsFingerprint: "sha256:" + "2".repeat(64), permissionSnapshot: { mode: "confirm-every-action", grants: [], policyRevision: "policy-1" } }), protocol.ERROR_CODES.VALIDATION_AUTHORITY_REQUIRED, "Actions signed by another validator authority must be rejected.");
    console.log("PASS Vela actions: " + assertions + " assertions.");
}

try { run(); }
catch (error) {
    console.error("FAIL Vela actions - " + error.message);
    process.exitCode = 1;
}
