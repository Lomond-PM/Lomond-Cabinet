const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HOST = path.resolve(__dirname, "../../host");

// Expand complete production includes in place; no function extraction or copies.
function expand(file) {
    return fs.readFileSync(file, "utf8")
        .replace(/^#target.*$/gm, "")
        .replace(/^#include "([^"]+)".*$/gm, (_, relative) => expand(path.resolve(path.dirname(file), relative)));
}

function makeHost(mode) {
    const loaded = [];
    const writes = [];
    function File(file) {
        if (!(this instanceof File)) return new File(file);
        this.fsName = path.resolve(String(file));
        this.name = path.basename(this.fsName);
        this.parent = { fsName: path.dirname(this.fsName) };
    }
    function Folder(folder) {
        if (!(this instanceof Folder)) return new Folder(folder);
        this.fsName = path.resolve(folder);
        this.exists = fs.existsSync(this.fsName);
    }
    Folder.prototype.getFiles = function (filter) {
        return fs.readdirSync(this.fsName).map(name => new File(path.join(this.fsName, name))).filter(filter);
    };
    function CompItem() {}
    const sandbox = {
        File, Folder, CompItem,
        app: { project: { activeItem: null }, beginUndoGroup() { writes.push("beginUndoGroup"); }, endUndoGroup() {} },
        $: { fileName: path.join(HOST, "index.jsx"), global: null },
        __a01Marker: 0
    };
    sandbox.$.global = sandbox;
    vm.createContext(sandbox);
    if (mode === "missing-parse") vm.runInContext("JSON.parse = undefined;", sandbox);
    if (mode === "missing-json") vm.runInContext("JSON = undefined;", sandbox);
    sandbox.$.evalFile = file => {
        loaded.push(path.relative(HOST, file.fsName));
        vm.runInContext(expand(file.fsName), sandbox, { filename: file.fsName, timeout: 1000 });
    };
    vm.runInContext(expand(path.join(HOST, "index.jsx")), sandbox, { filename: "host/index.jsx (expanded includes)", timeout: 3000 });
    function guard(object, label) {
        return new Proxy(object, {
            set(target, key) { writes.push(label + "." + String(key)); throw new Error("Project write forbidden"); },
            defineProperty(target, key) { writes.push(label + "." + String(key)); throw new Error("Project definition forbidden"); },
            deleteProperty(target, key) { writes.push(label + "." + String(key)); throw new Error("Project deletion forbidden"); }
        });
    }
    const project = sandbox.app.project;
    sandbox.app.project = guard(project, "project");
    function select(comment, hasComp = true, selected = true) {
        const layer = guard({ comment, name: "A01 fixture", threeDLayer: true, parent: null, property() { return null; } }, "layer");
        const comp = new CompItem();
        Object.assign(comp, { name: "Disposable VM fixture", selectedLayers: guard(selected ? [layer] : [], "selection"), numLayers: 1,
            layer() { return layer; }, layers: guard({ addShape() { writes.push("addShape"); throw new Error("AE creation outside fixture"); } }, "layers") });
        project.activeItem = hasComp ? guard(comp, "comp") : null;
        writes.length = 0;
        return layer;
    }
    function state() {
        const registry = JSON.parse(sandbox.AEToolbox.getRegisteredTools());
        const definitions = registry.tools;
        const tool = definitions.find(item => item.id === "ecommerceLayout");
        if (!tool) throw new Error("Production ecommerceLayout registration missing: " + JSON.stringify(registry));
        // Same trusted expression used by main.js refreshRegistryToolState -> evalHost.
        return JSON.parse(vm.runInContext(tool.stateAction.hostFunction + "()", sandbox, { timeout: 1000 }));
    }
    return { sandbox, loaded, writes, select, state, run(source) { return vm.runInContext(source, sandbox, { timeout: 1000 }); } };
}

const artifact = { owner: "Lomond Cabinet / AEToolbox", tool: "adComponentKit", kind: "featureStack", artifactId: "ack_fixture", componentId: "ack_fixture", componentType: "featureStack", role: "controller", index: 0, createdAt: "2026-09-09", previousCommentEncoded: "%E4%B8%AD%E6%96%87" };
const legacy = { aetoolbox: true, componentId: "legacy_fixture", componentType: "featureStack", role: "controller", index: 0 };
const prefix = "LOMOND_CABINET_ARTIFACT_V1:";
// Payload can only change a VM-local scalar; no IO/process/Host mutation calls.
const expression = "(__a01Marker += 1, " + JSON.stringify(artifact) + ")";
const legacyExpression = "(__a01Marker += 1, " + JSON.stringify(legacy) + ")";

module.exports = { makeHost, artifact, legacy, prefix, expression, legacyExpression };
