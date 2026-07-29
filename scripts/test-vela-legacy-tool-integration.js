#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const runtimeModule = require("../client/js/vela/velaRuntime");
const nodeRuntime = require("./velaNodeRuntime");

const ROOT = path.resolve(__dirname, "..");
const HOST = "host_0123456789abcdef0123456789abcdef0123456789abcdef";
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function decode(source) { return JSON.parse(JSON.parse(source.slice("AEToolbox.VelaContext.handle(".length, -1))); }

function hostResult(request) {
    let snapshot;
    if (request.operation === "captureContext") {
        snapshot = { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 1, projectGeneration: 3, activeComp: { itemId: 12, projectGeneration: 3, type: "CompItem", width: 1920, height: 1080, duration: 10, frameRate: 30 }, selection: { count: 1, identityQuality: "native-layer-id", items: [{ nativeLayerId: 45, layerIndex: 3, selectedOrder: 0, matchName: "ADBE AV Layer", type: "av" }] } };
    } else if (request.operation === "capturePropertyValues") {
        snapshot = { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 3, projectGeneration: 3, sampleTime: 1, targets: request.scope.targets.map((target, index) => ({ targetOrdinal: index, nativeLayerId: target.nativeLayerId, layerIndex: target.layerIndex, propertyPath: target.propertyPath, propertyMatchName: "ADBE Opacity", value: { kind: "number", data: 100 } })) };
    } else {
        snapshot = { hostInstanceId: HOST, hostReloadEpoch: 1, tier: 0, capabilities: { maxTier: 3, nativeLayerIdAvailable: true, bindingContextAvailable: true, hostAdapterRevision: "vela-context-host-v4" } };
    }
    return JSON.stringify({ protocol: "vela.host-context-result.v1", schemaVersion: "1.0", requestId: request.requestId, sessionId: request.sessionId, operation: request.operation, ok: true, hostAdapterRevision: "vela-context-host-v4", snapshot });
}

function createRuntime() {
    return runtimeModule.createRuntime({ environment: Object.assign({ setTimeout, clearTimeout }, nodeRuntime), invokeHost(source, callback) { callback(hostResult(decode(source))); } });
}

function makeDocument() {
    const ids = {};
    let documentRef;
    function node(tag) {
        return {
            tagName: tag, children: [], parentNode: null, firstChild: null, className: "", textContent: "", value: "", disabled: false, hidden: false, listeners: {}, attributes: {}, style: {}, ownerDocument: documentRef,
            classList: { add() {}, remove() {}, contains() { return false; } },
            appendChild(child) { child.parentNode = this; this.children.push(child); this.firstChild = this.children[0] || null; return child; },
            removeChild(child) { this.children = this.children.filter((item) => item !== child); child.parentNode = null; this.firstChild = this.children[0] || null; },
            addEventListener(type, handler) { (this.listeners[type] || (this.listeners[type] = [])).push(handler); },
            removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== handler); },
            setAttribute(name, value) { this.attributes[name] = String(value); },
            getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
            click() { if (!this.disabled) (this.listeners.click || []).forEach((handler) => handler({ type: "click" })); },
            dispatch(type) { (this.listeners[type] || []).forEach((handler) => handler({ type })); }
        };
    }
    documentRef = {
        hidden: false, body: node("body"), documentElement: node("html"), createElement: node, createDocumentFragment() { return node("fragment"); },
        getElementById(id) { return ids[id] || null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
    };
    ["registryToolPanel", "registryToolActions", "statusText", "statusPill", "detailHeading"].forEach((id) => { ids[id] = node("div"); ids[id].id = id; });
    return documentRef;
}

function find(node, predicate) {
    if (predicate(node)) return node;
    for (const child of node.children) { const found = find(child, predicate); if (found) return found; }
    return null;
}
function textTree(node) { return (node.textContent || "") + node.children.map(textTree).join(""); }
function buttons(node) { const output = []; (function walk(item) { if (item.tagName === "button") output.push(item); item.children.forEach(walk); }(node)); return output; }
function flush() { return new Promise((resolve) => setImmediate(resolve)); }

async function run() {
    const index = fs.readFileSync(path.join(ROOT, "client", "index.html"), "utf8");
    const uiRef = "js/vela/velaUi.js";
    const mainRef = "js/main.js";
    check(index.indexOf(uiRef) !== -1 && index.indexOf(mainRef) > index.indexOf(uiRef), "Production index.html loads VelaUi before main.js.");
    const documentRef = makeDocument();
    const windowRef = { document: documentRef, Promise, Set, Map, WeakMap, WeakSet, Uint8Array, JSON, Math, Number, String, Array, Object, RegExp, Error, Date, TextEncoder, URL, AbortController, crypto: { getRandomValues(values) { for (let index = 0; index < values.length; index += 1) values[index] = index + 1; return values; } }, console: { warn() {} }, I18n: { init() {}, t(key) { return { "vela.manualOpacityRequired": "Enter a target opacity.", "vela.manualOpacityInvalid": "Enter a valid value from 0 to 100." }[key] || key; } }, CSInterface: function CSInterface() {}, setTimeout, clearTimeout, setInterval() { return 1; }, clearInterval() {}, getComputedStyle() { return { getPropertyValue() { return "1"; } }; }, addEventListener() {} };
    windowRef.window = windowRef;
    windowRef.self = windowRef;
    const sandbox = vm.createContext(windowRef);
    vm.runInContext(fs.readFileSync(path.join(ROOT, "client", uiRef), "utf8"), sandbox, { filename: uiRef });
    ["velaProtocol.js", "velaResponseParser.js", "velaCapabilityContracts.js", "velaProviderAdapter.js", "velaProviderIntentGate.js", "velaLocalTransport.js", "velaContext.js", "velaValidator.js", "velaPlan.js", "velaExecutionGuard.js", "velaContextBridge.js", "velaExecutionPreflight.js", "velaExecutionAdapter.js", "velaController.js", "velaProviderController.js", "velaProviderProposalRouter.js", "velaRuntime.js"].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, "client", "js", "vela", file), "utf8"), sandbox, { filename: file }));
    let mainSource = fs.readFileSync(path.join(ROOT, "client", mainRef), "utf8");
    mainSource = mainSource.replace(/\}\)\(\);\s*$/, "window.__velaLegacyToolIntegration = { render: renderVelaDetail, configure: configureToolDetail, registerTool: function (id, tool) { DynamicTools[id] = tool; }, suspend: suspendPanelRuntime, resume: resumePanelRuntime, setRuntime: function (value) { velaRuntimeController = value; } };\n}());");
    vm.runInContext(mainSource, sandbox, { filename: mainRef });
    const hooks = windowRef.__velaLegacyToolIntegration;
    check(hooks && typeof hooks.render === "function" && typeof hooks.configure === "function" && typeof hooks.suspend === "function", "Actual main.js exposes only the production legacy-tool closure to this test VM.");
    const runtime = createRuntime();
    await runtime.initialize();
    windowRef.__createCalls = 0;
    windowRef.__refresh = () => runtime.refreshContext();
    windowRef.__create = (opacity) => { windowRef.__createCalls += 1; return runtime.createOpacityCandidate({ opacity }); };
    windowRef.__suspend = () => runtime.suspend();
    windowRef.__resume = () => runtime.resume();
    windowRef.__uiState = () => runtime.getUiState();
    windowRef.__providerUiState = () => runtime.getProviderUiState();
    const controller = vm.runInContext("({ refreshContext: function () { return __refresh(); }, createOpacityCandidate: function (input) { return __create(Number(input.opacity)); }, approveCandidate: function () { return Promise.reject(new Error('unused')); }, rejectCandidate: function () { return false; }, suspend: function () { return __suspend(); }, resume: function () { return __resume(); }, getUiState: function () { return __uiState(); }, getProviderUiState: function () { return __providerUiState(); } })", sandbox);
    hooks.setRuntime(controller);
    hooks.registerTool("registryA", { id: "registryA", title: "Registry A", description: "Registry A content", sections: [], actions: [] });
    hooks.configure("registryA");
    const panel = documentRef.getElementById("registryToolPanel");
    const actions = documentRef.getElementById("registryToolActions");
    const registryRoot = panel.firstChild;
    check(registryRoot && registryRoot.parentNode === panel && panel.children.length === 1, "Production Registry renderer owns the shared content root before Vela navigation.");
    hooks.configure("vela");
    let input = find(panel, (node) => node.tagName === "input");
    let validation = find(panel, (node) => node.id === "vela-manual-opacity-validation");
    let confirmation = find(panel, (node) => (node.className || "").split(/\s+/).indexOf("vela-review-card") !== -1);
    let actionNodes = buttons(actions);
    check(actionNodes.length === 4 && input && validation && input.value === "" && validation.textContent === "" && input.getAttribute("aria-invalid") === "false" && registryRoot.parentNode === null && panel.children.length === 1, "Fresh Vela route removes the prior Registry root and owns the only active content root.");
    actionNodes[0].click();
    await flush(); await flush();
    check(find(panel, (node) => node.tagName === "input") === input && find(panel, (node) => node.id === validation.id) === validation && input.value === "" && actionNodes[1].disabled === true && validation.textContent === "" && input.getAttribute("aria-invalid") === "false" && confirmation.hidden === true && confirmation.getAttribute("aria-hidden") === "true" && textTree(confirmation).indexOf("100 -> n/a") === -1, "Refresh through main.js keeps DOM identity, displays trusted current context, and hides an incomplete confirmation.");
    input.dispatch("blur");
    check(validation.textContent === "Enter a target opacity." && input.getAttribute("aria-invalid") === "true" && actionNodes[1].disabled, "Real blur event reaches the required validation state without calling Runtime.");
    ["abc", "-1", "101", "Infinity", " "].forEach((value) => { input.value = value; input.dispatch("input"); check(validation.textContent === "Enter a valid value from 0 to 100." && actionNodes[1].disabled, "Real invalid input fails closed: " + JSON.stringify(value)); });
    input.value = "50";
    input.dispatch("input");
    check(validation.textContent === "" && input.getAttribute("aria-invalid") === "false" && !actionNodes[1].disabled, "Real valid input enables Review.");
    actionNodes[1].click();
    await flush(); await flush();
    const candidateState = runtime.getUiState();
    check(windowRef.__createCalls === 1 && candidateState.state === "pending-confirmation" && candidateState.beforeValue === 100 && candidateState.proposedValue === 50, "main.js routes the real Review event once to Runtime createOpacityCandidate with trusted beforeValue and manual proposedValue.");
    check(confirmation.hidden === false && confirmation.getAttribute("aria-hidden") === "false" && textTree(confirmation).indexOf("100 -> 50") !== -1 && textTree(confirmation).indexOf("n/a") === -1, "A real pending confirmation exposes only its complete trusted/manual summary.");
    runtime.rejectCandidate({ candidateId: candidateState.candidateId });
    await runtime.refreshContext();
    hooks.render();
    input = find(panel, (node) => node.tagName === "input");
    actionNodes = buttons(actions);
    confirmation = find(panel, (node) => (node.className || "").split(/\s+/).indexOf("vela-review-card") !== -1);
    check(confirmation.hidden === true && confirmation.getAttribute("aria-hidden") === "true" && textTree(confirmation).indexOf("100 -> 50") === -1, "Reject plus Refresh immediately clears and hides the old confirmation summary.");
    input.value = "57.5";
    input.dispatch("input");
    check(!actionNodes[1].disabled, "A decimal boundary draft remains enabled before lifecycle reset.");
    hooks.suspend();
    hooks.resume();
    check(input.value === "" && actionNodes[1].disabled && validation.textContent === "" && input.getAttribute("aria-invalid") === "false", "Actual main.js suspend/resume explicitly clears legacy draft and validation state.");
    hooks.render();
    check(find(panel, (node) => node.id === validation.id) !== null && buttons(actions).length === 4, "A new legacy UI lifecycle leaves no duplicate validation node or action listener set.");
    hooks.configure("registryA");
    check(panel.children.length === 1 && find(panel, (node) => node.id === "vela-manual-opacity-validation") === null && buttons(actions).length === 1, "Leaving Vela tears down legacy nodes and lets the single Registry action owner reclaim the shared content root.");
    hooks.configure("vela");
    check(panel.children.length === 1 && find(panel, (node) => node.id === "vela-manual-opacity-validation") !== null && buttons(actions).length === 4, "Registry A to Vela repeated navigation leaves one active Vela root and one action set.");
    console.log("test-vela-legacy-tool-integration: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
