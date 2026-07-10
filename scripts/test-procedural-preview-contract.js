#!/usr/bin/env node
"use strict";

const path = require("path");

const contract = require(path.resolve(__dirname, "..", "client", "js", "proceduralPreviewContract.js"));

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return "[" + value.map(stableStringify).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
}

function run() {
    let assertions = 0;
    const previewField = {
        type: "proceduralPreview",
        key: "preview",
        engine: "proceduralAppearance",
        targetKey: "target",
        seedKey: "seed",
        parameterKeys: ["warp", "brightness", "grain"]
    };
    const toolDef = {
        id: "proceduralAppearanceLab",
        sections: [
            {
                id: "preview",
                fields: [previewField]
            },
            {
                id: "params",
                fields: [
                    { type: "text", key: "seed" },
                    { type: "select", key: "target" },
                    { type: "range", key: "warp" },
                    { type: "range", key: "brightness" },
                    { type: "range", key: "grain" }
                ]
            }
        ]
    };
    const values = {
        target: "icon",
        seed: "shapeAdd",
        warp: 0.7,
        brightness: 0.84,
        grain: 0.05,
        language: "zh-CN",
        uiState: "ignored"
    };

    assert(contract.findProceduralPreviewField(toolDef) === previewField, "Did not find proceduralPreview field.");
    assertions += 1;

    const deps = contract.getProceduralPreviewDependencies(previewField);
    assert(stableStringify(deps) === stableStringify(["target", "seed", "warp", "brightness", "grain"]), "Dependencies were not extracted correctly.");
    assertions += 1;

    const input = contract.extractProceduralPreviewInput(previewField, values);
    assert(input.ok, "Expected valid preview input.");
    assert(input.engine === "proceduralAppearance", "Engine was not extracted.");
    assert(input.target === "icon", "Target was not extracted.");
    assert(input.seed === "shapeAdd", "Seed was not extracted.");
    assert(typeof input.params.language === "undefined", "Non-parameter field leaked into params.");
    assert(typeof input.params.uiState === "undefined", "UI state leaked into params.");
    assert(input.params.warp === 0.7 && input.params.brightness === 0.84 && input.params.grain === 0.05, "Declared params were not extracted.");
    assertions += 7;

    assert(contract.shouldRefreshProceduralPreview(previewField, "warp"), "Dependency change did not trigger refresh.");
    assert(contract.shouldRefreshProceduralPreview(previewField, "seed"), "Seed change did not trigger refresh.");
    assert(!contract.shouldRefreshProceduralPreview(previewField, "language"), "Non-dependency change triggered refresh.");
    assertions += 3;

    assert(contract.findProceduralPreviewField({ id: "shapeAdd", sections: [{ fields: [{ type: "range", key: "amount" }] }] }) === null, "Ordinary tools should not have a preview contract.");
    assertions += 1;

    const missing = contract.extractProceduralPreviewInput({ type: "proceduralPreview", parameterKeys: ["warp"] }, values);
    assert(!missing.ok && missing.errorCode === "MISSING_CONTRACT_KEYS", "Missing targetKey/seedKey should return safe error.");
    assertions += 1;

    const invalidSeed = contract.extractProceduralPreviewInput(previewField, Object.assign({}, values, { seed: "   " }));
    assert(!invalidSeed.ok && invalidSeed.errorCode === "INVALID_SEED", "Empty seed should return safe error.");
    assertions += 1;

    const invalidTarget = contract.extractProceduralPreviewInput(previewField, Object.assign({}, values, { target: "poster" }));
    assert(!invalidTarget.ok && invalidTarget.errorCode === "INVALID_TARGET", "Invalid target should return safe error.");
    assertions += 1;

    const reorderedField = Object.assign({}, previewField, {
        parameterKeys: ["grain", "warp", "brightness"]
    });
    const reordered = contract.extractProceduralPreviewInput(reorderedField, values);
    assert(stableStringify(input.params) === stableStringify(reordered.params), "parameterKeys order changed output semantics.");
    assertions += 1;

    console.log("PASS procedural preview contract: " + assertions + " assertions.");
}

try {
    run();
} catch (error) {
    console.error("FAIL procedural preview contract - " + error.message);
    process.exitCode = 1;
}
