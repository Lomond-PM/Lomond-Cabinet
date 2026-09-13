"use strict";
// C2 boundary model: actual production owners; only Provider/Host are simulated.
const trajectory = require("./vela-trajectory-harness");
async function create(options = {}) {
    const model = { comp: 1, selection: 2, targets: new Map([[2, { comp: 1, index: 1, opacity: options.opacity === undefined ? 50 : options.opacity, name: options.name || "Layer A" }], [3, { comp: 1, index: 2, opacity: options.otherOpacity === undefined ? 60 : options.otherOpacity, name: "Layer B" }]]), results: [], reads: [], dispatches: 0, writes: 0, settled: false, beforeVerifyDone: false };
    const state = { opacity: options.opacity === undefined ? 50 : options.opacity, name: options.name || "Layer A", mutations: 0, undo: 0, verifies: 0, hostMode: options.hostMode || "normal", hold: null, verifyMode: options.verifyMode || "normal" };
    const boundary = {
        ...options,
        sharedState: state,
        onHostRequest(request) {
            if (request.operation === "executeCapability") model.dispatches += 1;
            else if (request.operation === "capturePropertyValues") model.reads.push({ operation: request.operation, targets: request.scope.targets.map(t => t.nativeLayerId) });
            else if (request.operation === "captureLayerAttributeValue" || request.operation.startsWith("observeCommitted")) model.reads.push({ operation: request.operation, comp: request.scope.target.itemId, target: request.scope.target.nativeLayerId });
        },
        onDriverResult(method, result) {
            model.results.push({ method, state: result && result.state, committedPresent: !!result && Object.prototype.hasOwnProperty.call(result, "committed"), committed: result && result.committed === true ? true : result && result.committed === false ? false : null });
            if (method === "submitIntent" && result && result.state === "executed" || method === "continueApprovedReview" && result && result.state === "verification-required") {
                model.settled = true;
                if (options.afterSettlement) options.afterSettlement(model, state);
            }
        },
        holdHostResponse(request) { return options.holdVerify && (request.operation.startsWith("observeCommitted") || model.settled && request.operation === "captureContext"); },
        transformHostResponse(request, response) {
            if (request.operation === "executeCapability") {
                if (state.mutations > model.writes) {
                    model.writes = state.mutations;
                    const target = model.targets.get(request.scope.target.nativeLayerId);
                    if (!target) throw new Error("Fixture: mutation target not found");
                    if (request.capabilityId === "set-layer-name-v1") target.name = request.scope.params.name;
                    else target.opacity = request.scope.params.opacity;
                }
                if (options.hostMode === "uncertain-after-write") { response.ok = false; delete response.result; response.error = { code: "HOST_EXECUTION_MUTATION_FAILED", message: "controlled uncertain result after setter", mutationCommitted: null }; }
                return;
            }
            const operation = request.operation;
            const committedRead = operation.startsWith("observeCommitted");
            if (committedRead && !model.beforeVerifyDone && options.beforeVerify) { model.beforeVerifyDone = true; options.beforeVerify(model, state); }
            const snapshot = response.snapshot;
            if (!snapshot) return;
            if (operation === "captureContext") {
                const target = model.targets.get(model.selection);
                snapshot.activeComp.itemId = model.comp;
                snapshot.selection.items = target ? [{ nativeLayerId: model.selection, layerIndex: target.index, selectedOrder: 0, matchName: "ADBE AV Layer", type: "AVLayer" }] : [];
                snapshot.selection.count = snapshot.selection.items.length;
                return;
            }
            if (operation === "capturePropertyValues") {
                snapshot.targets.forEach((target, i) => { const actual = model.targets.get(request.scope.targets[i].nativeLayerId); if (actual) target.value.data = actual.opacity; });
            } else if (operation === "captureLayerAttributeValue" || committedRead) {
                const requested = request.scope.target;
                const target = model.targets.get(requested.nativeLayerId);
                // Match the existing Host's original-comp + layer-index/id checks.
                if (!target || target.comp !== requested.itemId || target.index !== requested.layerIndex) {
                    response.ok = false; delete response.snapshot; response.error = { code: "HOST_CONTEXT_TARGET_NOT_FOUND", message: "controlled target unavailable" }; return;
                }
                if (options.verifyMode !== "mismatch") snapshot.target.value.data = operation.includes("LayerAttribute") ? target.name : target.opacity;
                if (options.wrongVerificationIdentity && committedRead) snapshot.target.nativeLayerId = 3;
            }
        }
    };
    const h = await trajectory.create(boundary);
    return { ...h, model };
}
module.exports = { create, flush: trajectory.flush };
