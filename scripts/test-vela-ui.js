#!/usr/bin/env node
"use strict";

const assert = require("assert");
const uiModule = require("../client/js/vela/velaUi");

let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }

function makeDocument() {
    function node(tag) {
        return {
            tagName: tag,
            className: "",
            type: "",
            min: "",
            max: "",
            step: "",
            placeholder: "",
            value: "",
            disabled: false,
            hidden: false,
            id: "",
            textContent: "",
            children: [],
            firstChild: null,
            parentNode: null,
            listeners: {},
            attributes: {},
            ownerDocument: documentRef,
            appendChild(child) {
                child.parentNode = this;
                this.children.push(child);
                this.firstChild = this.children[0] || null;
                return child;
            },
            removeChild(child) {
                this.children = this.children.filter((item) => item !== child);
                child.parentNode = null;
                this.firstChild = this.children[0] || null;
            },
            addEventListener(type, handler) {
                this.listeners[type] = this.listeners[type] || [];
                this.listeners[type].push(handler);
            },
            removeEventListener(type, handler) {
                this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== handler);
            },
            setAttribute(name, value) { this.attributes[name] = String(value); },
            getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
            click() {
                if (this.disabled) return;
                (this.listeners.click || []).forEach((handler) => handler({ type: "click" }));
            },
            dispatch(type) {
                (this.listeners[type] || []).forEach((handler) => handler({ type }));
            }
        };
    }
    const documentRef = { createElement: node };
    return documentRef;
}

function textTree(node) {
    return (node.textContent || "") + node.children.map(textTree).join("");
}

function findButtons(node, output) {
    output = output || [];
    if (node.tagName === "button") output.push(node);
    node.children.forEach((child) => findButtons(child, output));
    return output;
}

function findInput(node) {
    if (node.tagName === "input") return node;
    for (const child of node.children) {
        const found = findInput(child);
        if (found) return found;
    }
    return null;
}

function findByClass(node, className) {
    if ((node.className || "").split(/\s+/).indexOf(className) !== -1) return node;
    for (const child of node.children) {
        const found = findByClass(child, className);
        if (found) return found;
    }
    return null;
}

function run() {
    const documentRef = makeDocument();
    const root = documentRef.createElement("section");
    const actions = documentRef.createElement("footer");
    const intents = [];
    const ui = uiModule.createVelaUi({
        root,
        actionsRoot: actions,
        t(key, params) {
            const copy = {
                "vela.manualOpacityRequired": "Enter a target opacity.",
                "vela.manualOpacityInvalid": "Enter a valid value from 0 to 100."
            };
            return copy[key] || (params && params.code ? key + ":" + params.code : (params && params.index ? key + ":" + params.index : key));
        },
        onIntent(intent) { intents.push(intent); }
    });
    check(Object.isFrozen(ui), "VelaUi instance is frozen.");
    ui.render({ state: "pending-confirmation", candidateId: "cand_abc", targetSummary: "Selected layer Opacity", beforeValue: 25, proposedValue: 57.5, undoGroupLabel: "Vela: Set Opacity", errorCode: null });
    check(textTree(root).indexOf("25 -> 57.5") !== -1 && textTree(root).indexOf("Selected layer Opacity") !== -1, "UI renders confirmation text through textContent.");
    const confirmation = findByClass(root, "vela-review-card");
    check(confirmation && confirmation.hidden === false && confirmation.getAttribute("aria-hidden") === "false", "Only a complete pending confirmation exposes the stable legacy confirmation card.");
    check(root.innerHTML === undefined && actions.innerHTML === undefined, "Mock DOM observes no dynamic innerHTML writes.");
    const buttons = findButtons(actions);
    check(buttons.length === 4 && buttons[1].disabled === true && buttons[2].disabled === false && buttons[3].disabled === false, "Pending confirmation enables only Approve and Reject, never a manual Review draft.");
    buttons[0].click();
    buttons[2].click();
    buttons[3].click();
    check(intents[0].type === "refresh" && Object.keys(intents[0]).length === 1, "Refresh intent contains no private data.");
    check(intents[1].type === "approve" && intents[1].candidateId === "cand_abc" && Object.keys(intents[1]).length === 2, "Approve intent contains only candidateId.");
    check(intents[2].type === "reject" && intents[2].candidateId === "cand_abc" && Object.keys(intents[2]).length === 2, "Reject intent contains only candidateId.");
    ui.render({ state: "ready", contextRevision: 1, candidateId: null, targetSummary: null, contextLayerIndex: 3, beforeValue: 100, proposedValue: null, undoGroupLabel: null, errorCode: null });
    let manualInput = findInput(root);
    let readyButtons = findButtons(actions);
    const validation = findByClass(root, "vela-manual-opacity-validation");
    check(confirmation.hidden === true && confirmation.getAttribute("aria-hidden") === "true" && textTree(confirmation).indexOf("100 -> n/a") === -1, "Ready current opacity without a candidate hides and clears the confirmation summary.");
    const initialCard = root.children[0];
    const initialActionNodes = readyButtons.slice();
    check(manualInput.value === "" && manualInput.placeholder === "vela.manualOpacityPlaceholder" && textTree(root).indexOf("vela.currentOpacity") !== -1 && textTree(root).indexOf("100%") !== -1, "Refresh renders current opacity read-only while keeping the manual target input empty.");
    check(validation && validation.id === "vela-manual-opacity-validation" && validation.getAttribute("aria-live") === "polite" && manualInput.getAttribute("aria-describedby") === validation.id && manualInput.getAttribute("aria-invalid") === "false" && validation.textContent === "", "Pristine manual draft keeps a stable, empty polite validation node.");
    check(readyButtons[1].disabled === true, "An empty manual draft disables Review.");
    const intentCountBeforeEmptyReview = intents.length;
    readyButtons[1].click();
    check(intents.length === intentCountBeforeEmptyReview, "Empty-draft Review fails closed before it can create a candidate.");
    manualInput.dispatch("blur");
    check(validation.textContent === "Enter a target opacity." && manualInput.getAttribute("aria-invalid") === "true" && readyButtons[1].disabled === true, "A touched empty draft shows localized required feedback and remains fail closed.");
    manualInput.value = "50";
    manualInput.dispatch("input");
    check(validation.textContent === "" && manualInput.getAttribute("aria-invalid") === "false" && readyButtons[1].disabled === false, "An explicit finite manual target clears validation feedback and enables Review.");
    readyButtons[1].click();
    check(intents[intents.length - 1].type === "proposal" && intents[intents.length - 1].opacity === 50 && !Object.prototype.hasOwnProperty.call(intents[intents.length - 1], "target"), "Manual Review forwards only the explicitly entered opacity.");
    ["", " ", "-1", "101", "NaN", "Infinity", "abc"].forEach((value) => {
        manualInput.value = value;
        manualInput.dispatch("input");
        check(readyButtons[1].disabled === true && manualInput.getAttribute("aria-invalid") === "true" && validation.textContent === (value === "" ? "Enter a target opacity." : "Enter a valid value from 0 to 100."), "Invalid manual draft has localized fail-closed feedback: " + JSON.stringify(value));
    });
    ["0", "57.5", "100"].forEach((value) => {
        manualInput.value = value;
        manualInput.dispatch("input");
        check(readyButtons[1].disabled === false && manualInput.getAttribute("aria-invalid") === "false" && validation.textContent === "", "Boundary manual draft is valid: " + value);
    });
    manualInput.value = "50";
    manualInput.dispatch("input");
    readyButtons[0].click();
    check(manualInput.value === "" && readyButtons[1].disabled === true && manualInput.getAttribute("aria-invalid") === "false" && validation.textContent === "", "Refresh immediately restores pristine manual draft state.");
    ui.render({ state: "ready", contextRevision: 2, candidateId: null, targetSummary: null, contextLayerIndex: 4, beforeValue: 25, proposedValue: null, undoGroupLabel: null, errorCode: null });
    manualInput = findInput(root);
    readyButtons = findButtons(actions);
    check(manualInput.value === "" && readyButtons[1].disabled === true && textTree(root).indexOf("25%") !== -1, "A new Refresh target cannot inherit the previous target draft or turn current opacity into proposed opacity.");
    check(root.children[0] === initialCard && findButtons(actions).every((node, index) => node === initialActionNodes[index]) && findByClass(root, "vela-manual-opacity-validation") === validation, "Render patches keep the legacy card, actions, and validation node identities stable.");
    manualInput.value = "50";
    manualInput.dispatch("input");
    ui.resetTransientState();
    check(manualInput.value === "" && readyButtons[1].disabled === true && validation.textContent === "" && manualInput.getAttribute("aria-invalid") === "false", "Explicit lifecycle reset clears draft and touched validation state without waiting for a context render.");
    ui.render({ state: "executing", candidateId: "cand_abc", targetSummary: "Selected layer Opacity", beforeValue: 25, proposedValue: 57.5, undoGroupLabel: "Vela: Set Opacity", errorCode: null });
    const executingButtons = findButtons(actions);
    check(executingButtons.every((button) => button.disabled === true), "Executing disables every mutation intent button.");
    const input = findInput(root);
    check(input && input.disabled === true, "Executing disables opacity input.");
    check(confirmation.hidden === true && confirmation.getAttribute("aria-hidden") === "true" && textTree(confirmation).indexOf("25 -> 57.5") === -1, "Execution and terminal-adjacent states never retain a visible legacy confirmation summary.");
    ui.teardown();
    check(root.children.length === 0 && actions.children.length === 0, "Teardown clears rendered nodes and listeners.");
    console.log("test-vela-ui: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
