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
            value: "",
            disabled: false,
            textContent: "",
            children: [],
            firstChild: null,
            parentNode: null,
            listeners: {},
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
            click() {
                (this.listeners.click || []).forEach((handler) => handler({ type: "click" }));
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

function run() {
    const documentRef = makeDocument();
    const root = documentRef.createElement("section");
    const actions = documentRef.createElement("footer");
    const intents = [];
    const ui = uiModule.createVelaUi({
        root,
        actionsRoot: actions,
        t(key, params) { return params && params.code ? key + ":" + params.code : key; },
        onIntent(intent) { intents.push(intent); }
    });
    check(Object.isFrozen(ui), "VelaUi instance is frozen.");
    ui.render({ state: "pending-confirmation", candidateId: "cand_abc", targetSummary: "Selected layer Opacity", beforeValue: 25, proposedValue: 57.5, undoGroupLabel: "Vela: Set Opacity", errorCode: null });
    check(textTree(root).indexOf("25 -> 57.5") !== -1 && textTree(root).indexOf("Selected layer Opacity") !== -1, "UI renders confirmation text through textContent.");
    check(root.innerHTML === undefined && actions.innerHTML === undefined, "Mock DOM observes no dynamic innerHTML writes.");
    const buttons = findButtons(actions);
    check(buttons.length === 4 && buttons[2].disabled === false && buttons[3].disabled === false, "Pending confirmation enables Approve and Reject.");
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    buttons[3].click();
    check(intents[0].type === "refresh" && Object.keys(intents[0]).length === 1, "Refresh intent contains no private data.");
    check(intents[1].type === "proposal" && typeof intents[1].opacity === "number" && !Object.prototype.hasOwnProperty.call(intents[1], "target"), "Proposal intent contains only opacity.");
    check(intents[2].type === "approve" && intents[2].candidateId === "cand_abc" && Object.keys(intents[2]).length === 2, "Approve intent contains only candidateId.");
    check(intents[3].type === "reject" && intents[3].candidateId === "cand_abc" && Object.keys(intents[3]).length === 2, "Reject intent contains only candidateId.");
    ui.render({ state: "executing", candidateId: "cand_abc", targetSummary: "Selected layer Opacity", beforeValue: 25, proposedValue: 57.5, undoGroupLabel: "Vela: Set Opacity", errorCode: null });
    const executingButtons = findButtons(actions);
    check(executingButtons.every((button) => button.disabled === true), "Executing disables every mutation intent button.");
    const input = findInput(root);
    check(input && input.disabled === true, "Executing disables opacity input.");
    ui.teardown();
    check(root.children.length === 0 && actions.children.length === 0, "Teardown clears rendered nodes and listeners.");
    console.log("test-vela-ui: " + assertions + " assertions passed.");
}

try { run(); }
catch (error) { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; }
