const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const HOST_PATH = path.join(ROOT, "host", "index.jsx");
const FULL_HOST_SOURCE = fs.readFileSync(HOST_PATH, "utf8").replace(/\r\n/g, "\n").replace(/^#target.*$/gm, "");
const registryStart = FULL_HOST_SOURCE.indexOf("var AEToolbox = AEToolbox || {};");
const registryEnd = FULL_HOST_SOURCE.indexOf("    AEToolbox.parseJson = function");
const sortFunction = FULL_HOST_SOURCE.indexOf("function sortFiles");
const loaderStart = FULL_HOST_SOURCE.lastIndexOf("(function () {", sortFunction);
const loaderCall = FULL_HOST_SOURCE.indexOf("AEToolbox.loadRegisteredToolFiles();", loaderStart);
const loaderClose = FULL_HOST_SOURCE.indexOf("})();", loaderCall);
const loaderEnd = loaderClose + 5;
const selectionFunction = FULL_HOST_SOURCE.indexOf("AEToolbox.getSelectionSummary");
const infoStart = FULL_HOST_SOURCE.lastIndexOf("(function () {", selectionFunction);
if (registryStart < 0 || registryEnd < 0 || loaderStart < 0 || loaderEnd < loaderStart || infoStart < 0) {
    throw new Error("Unable to isolate the Host Registry production source.");
}
const HOST_SOURCE = FULL_HOST_SOURCE.slice(registryStart, registryEnd) +
    "})();\n" +
    FULL_HOST_SOURCE.slice(loaderStart, loaderEnd) + "\n" +
    FULL_HOST_SOURCE.slice(infoStart);

let assertions = 0;
function check(value, message) {
    assertions += 1;
    if (!value) throw new Error(message);
}

function definition(id, actionName) {
    return {
        id,
        titleKey: `tools.${id}.title`,
        descriptionKey: `tools.${id}.description`,
        sections: [{ id: "main", fields: [] }],
        actions: actionName ? [{ id: "run", hostFunction: `AEToolbox.tools.fixture.${actionName}` }] : [],
        i18n: { en: {}, "zh-CN": {} }
    };
}

function makeHarness() {
    let attempt = [];
    const observations = [];

    function FakeFile(filePath) {
        if (!(this instanceof FakeFile)) return new FakeFile(filePath);
        this.fsName = String(filePath || "C:/repo/host/index.jsx");
        this.name = this.fsName.replace(/^.*[\\/]/, "");
        this.parent = { fsName: "C:/repo/host" };
    }
    function FakeFolder(folderPath) {
        if (!(this instanceof FakeFolder)) return new FakeFolder(folderPath);
        this.fsName = String(folderPath || "C:/repo/host/tools");
        this.exists = true;
    }
    FakeFolder.prototype.getFiles = function (filter) {
        return attempt.map((entry) => {
            const file = new FakeFile(`C:/repo/host/tools/${entry.name}`);
            file.__entry = entry;
            return file;
        });
    };

    const sandbox = {
        console,
        File: FakeFile,
        Folder: FakeFolder,
        app: {},
        CompItem: function CompItem() {},
        Shape: function Shape() {},
        PropertyType: {},
        KeyframeInterpolationType: {},
        $: {
            fileName: "C:/repo/host/index.jsx",
            global: null,
            evalFile(file) {
                const entry = file.__entry;
                if (entry.throwError) throw new Error(`C:/private/work/${entry.name}: secret stack payload`);
                if (entry.source) {
                    vm.runInContext(entry.source, sandbox, { filename: entry.name });
                } else {
                    sandbox.AEToolbox.registerTool(entry.tool);
                }
                if (entry.observe) entry.observe(sandbox.AEToolbox, observations);
            }
        }
    };
    sandbox.$.global = sandbox;
    vm.createContext(sandbox);

    return {
        sandbox,
        observations,
        load(entries) {
            attempt = entries.slice();
            vm.runInContext(HOST_SOURCE, sandbox, { filename: "host/index.transaction-test.jsx" });
            return JSON.parse(sandbox.AEToolbox.getRegisteredTools());
        },
        info() { return JSON.parse(sandbox.AEToolbox.getHostLoadInfo()); }
    };
}

function filesFor(ids) {
    return ids.map((id) => ({ name: `${id}.tool.jsx`, tool: definition(id) }));
}

const productionIds = [
    "ecommerceLayout",
    "proceduralAppearanceLab",
    "registryControlLab",
    "selectionInfo",
    "settingsRendererLab",
    "shapeAdd",
    "textBackgroundBox"
];

const realDefinitionFiles = fs.readdirSync(path.join(ROOT, "host", "tools"))
    .filter((name) => /\.tool\.jsx$/i.test(name))
    .map((name) => ({
        name,
        source: fs.readFileSync(path.join(ROOT, "host", "tools", name), "utf8")
    }));

// Complete initial publication and deterministic repeated load.
{
    const h = makeHarness();
    const unordered = realDefinitionFiles.slice().reverse();
    const first = h.load(unordered);
    const expected = productionIds.slice().sort();
    check(first.ok === true && first.loadErrors.length === 0, `complete definitions publish with no errors: ${JSON.stringify(first)}`);
    check(first.tools.map((tool) => tool.id).join(",") === expected.join(","), "all production and Developer Mode definitions publish in sorted order");
    check(h.sandbox.AEToolbox._registeredToolRegistryRevision === 1, "first commit increments revision once");
    const second = h.load(unordered);
    check(second.tools.length === expected.length && new Set(second.tools.map((tool) => tool.id)).size === expected.length, "second complete load is idempotent without duplicates");
    check(second.tools.map((tool) => tool.id).join(",") === expected.join(","), "repeated load order is stable");
    check(h.sandbox.AEToolbox._registeredToolRegistryRevision === 2, "second successful commit increments revision once");
}

// First-load failure never publishes a partial catalog.
{
    const h = makeHarness();
    const result = h.load([
        { name: "a.tool.jsx", tool: definition("a") },
        { name: "broken.tool.jsx", throwError: true, tool: definition("broken") },
        { name: "c.tool.jsx", tool: definition("c") }
    ]);
    check(result.ok === false && result.tools.length === 0, "cold-start failure returns no partial tools");
    check(result.loadErrors.length === 1 && /^REGISTRY_DEFINITION_LOAD_FAILED: broken\.tool\.jsx$/.test(result.loadErrors[0]), "cold-start failure returns a stable sanitized error");
    check(h.sandbox.AEToolbox._registryTransaction === null, "failed initial transaction is cleaned up");
}
{
    const h = makeHarness();
    const result = h.load([]);
    check(result.ok === false && result.tools.length === 0 && result.loadErrors[0] === "REGISTRY_EMPTY_CATALOG: registry", "empty definitions fail with a stable diagnostic");
}

// Last-known-good references and actions survive a failed staging attempt.
{
    const h = makeHarness();
    h.sandbox.AEToolbox = { tools: { fixture: { oldAction() { return '{"ok":true,"message":"old"}'; }, newAction() { return '{"ok":true,"message":"new"}'; } } } };
    h.sandbox.$.global = h.sandbox;
    const first = h.load([{ name: "old.tool.jsx", tool: definition("old", "oldAction") }]);
    const toolsRef = h.sandbox.AEToolbox._registeredTools;
    const mapRef = h.sandbox.AEToolbox._registeredToolMap;
    const revision = h.sandbox.AEToolbox._registeredToolRegistryRevision;
    check(first.ok && JSON.parse(h.sandbox.AEToolbox.runRegisteredToolAction("old", "run", "{}")).ok, "active action works after initial commit");

    const failed = h.load([
        {
            name: "new.tool.jsx",
            tool: definition("new", "newAction"),
            observe(api, observations) {
                observations.push({
                    stagingAction: JSON.parse(api.runRegisteredToolAction("new", "run", "{}")),
                    activeAction: JSON.parse(api.runRegisteredToolAction("old", "run", "{}"))
                });
            }
        },
        { name: "z-broken.tool.jsx", throwError: true, tool: definition("broken") }
    ]);
    check(failed.ok === true && failed.tools.map((tool) => tool.id).join(",") === "old", "failed reload returns the last-known-good catalog");
    check(h.sandbox.AEToolbox._registeredTools === toolsRef && h.sandbox.AEToolbox._registeredToolMap === mapRef, "rollback preserves active array and map identity");
    check(h.sandbox.AEToolbox._registeredToolRegistryRevision === revision, "rollback does not increment active Registry revision");
    check(h.observations[0].stagingAction.ok === false && h.observations[0].activeAction.ok === true, "staging action is hidden while old active action remains callable");
    check(JSON.parse(h.sandbox.AEToolbox.runRegisteredToolAction("new", "run", "{}")).ok === false, "rolled-back staging action remains unavailable");
    check(JSON.parse(h.sandbox.AEToolbox.runRegisteredToolAction("old", "run", "{}")).ok === true, "old active action remains callable after rollback");
    check(h.sandbox.AEToolbox._registryTransaction === null, "failed reload clears transaction state");

    const recovered = h.load([{ name: "new.tool.jsx", tool: definition("new", "newAction") }]);
    check(recovered.ok && recovered.tools[0].id === "new" && recovered.loadErrors.length === 0, "retry success publishes a new complete catalog and clears errors");
    check(h.sandbox.AEToolbox._registeredTools !== toolsRef && h.sandbox.AEToolbox._registeredToolMap !== mapRef, "successful commit atomically replaces active references");
}

// Duplicate ids fail the whole transaction without overwriting active state.
{
    const h = makeHarness();
    h.load([{ name: "stable.tool.jsx", tool: definition("stable") }]);
    const toolsRef = h.sandbox.AEToolbox._registeredTools;
    const duplicate = h.load([
        { name: "a.tool.jsx", tool: definition("duplicate") },
        { name: "b.tool.jsx", tool: definition("duplicate") }
    ]);
    check(duplicate.ok && duplicate.tools[0].id === "stable", "duplicate id rolls back to active catalog");
    check(duplicate.loadErrors.some((error) => /^REGISTRY_TOOL_DUPLICATE: b\.tool\.jsx$/.test(error)), "duplicate id is reported instead of silently overwritten");
    check(h.sandbox.AEToolbox._registeredTools === toolsRef, "duplicate rollback does not mutate active array");
}

// Diagnostics describe active state and never expose paths or stack text.
{
    const h = makeHarness();
    h.load([{ name: "stable.tool.jsx", tool: definition("stable") }]);
    h.load([{ name: "C-secret-broken.tool.jsx", throwError: true, tool: definition("broken") }]);
    const registry = JSON.parse(h.sandbox.AEToolbox.getRegisteredTools());
    const info = h.info();
    check(info.registeredToolCount === registry.tools.length && info.registeredToolLoadErrorCount === registry.loadErrors.length, "Host load info matches active catalog and latest attempt errors");
    check(info.hasValidRegisteredToolCatalog === true && info.registeredToolLastAttemptSucceeded === false, "Host load info distinguishes valid active catalog from failed latest attempt");
    check(!/[\\/]private[\\/]|stack|secret payload/i.test(JSON.stringify(registry.loadErrors)), "sanitized errors contain no absolute path or stack payload");
}

console.log(`Host registry transaction tests passed: ${assertions} assertions.`);
