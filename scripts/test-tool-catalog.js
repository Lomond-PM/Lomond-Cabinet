const fs = require("fs");
const path = require("path");
const CatalogModule = require("../client/js/toolCatalog.js");

let assertions = 0;
function check(value, message) {
    assertions += 1;
    if (!value) throw new Error(message);
}

function tool(id, extra = {}) {
    return Object.assign({ id, titleKey: `tools.${id}.title`, sections: [], actions: [], i18n: { en: {}, "zh-CN": {} } }, extra);
}

function configuredCatalog() {
    const catalog = CatalogModule.createCatalog();
    catalog.registerSystemSurface({ id: "velaPersistentSurface" });
    catalog.registerSystemSurface({ id: "settings" });
    catalog.registerLegacyFallback({ id: "vela", titleKey: "vela.title" });
    catalog.registerRegistryCompatibilityMetadata({ id: "ecommerceLayout", title: "Ad Component Kit" });
    catalog.registerRegistryCompatibilityMetadata({ id: "shapeAdd", title: "Shape Add" });
    catalog.registerStaticHomeEntry("ecommerceLayout");
    catalog.registerStaticHomeEntry("vela");
    return catalog;
}

const registryDefinitions = [
    tool("ecommerceLayout", { storageKey: "AEToolbox.ecommerceLayout.v1" }),
    tool("shapeAdd", { stateAction: { hostFunction: "AEToolbox.tools.shapeAdd.getRegistryState" } }),
    tool("textBackgroundBox"),
    tool("selectionInfo"),
    tool("proceduralAppearanceLab", { developerOnly: true }),
    tool("registryControlLab", { category: "debug" }),
    tool("settingsRendererLab", { debugOnly: true })
];

// Explicit classification and authority.
{
    const catalog = configuredCatalog();
    check(catalog.getSystemSurface("velaPersistentSurface").kind === "system" && catalog.getSystemSurface("settings").kind === "system", "system surfaces are explicitly classified");
    check(catalog.getTool("vela").kind === "legacy" && catalog.getLegacyFallback("vela").definition.titleKey === "vela.title", "Vela is an explicit legacy fallback");
    check(catalog.getTool("velaPersistentSurface") === null && catalog.getRegistryTool("settings") === null, "system surfaces do not enter ordinary tool or Registry lookup");
    check(catalog.setRegistryTools(registryDefinitions), "complete Registry catalog commits");
    check(catalog.getTool("shapeAdd").kind === "registry" && catalog.getRegistryTool("textBackgroundBox") && catalog.getRegistryTool("selectionInfo"), "production Registry tools are queryable");
    check(catalog.getDisplayMetadata("shapeAdd") === catalog.getRegistryTool("shapeAdd").definition, "Registry schema overrides compatibility metadata");
    check(catalog.getRoute("shapeAdd").kind === "registry" && catalog.getRoute("vela").kind === "legacy" && catalog.getRoute("unknown").kind === "unknown", "routing distinguishes Registry, legacy, and unknown");
    check(catalog.getRoute("settings").kind === "system", "system routing remains outside ordinary detail routing");
}

// Registry authority wins over an explicitly declared same-id legacy fallback.
{
    const catalog = CatalogModule.createCatalog();
    const legacy = tool("shared", { title: "Legacy" });
    const registry = tool("shared", { title: "Registry" });
    catalog.registerLegacyFallback(legacy);
    catalog.setRegistryTools([registry]);
    check(catalog.getTool("shared").kind === "registry" && catalog.getTool("shared").definition === registry, "Registry authority wins without mixing legacy metadata");
}

// Home ownership, Developer Mode, order, and deduplication.
{
    const catalog = configuredCatalog();
    catalog.setRegistryTools(registryDefinitions);
    const normal = catalog.getHomeEntries({ developerMode: false });
    const debug = catalog.getHomeEntries({ developerMode: true });
    check(normal.filter((entry) => entry.id === "ecommerceLayout").length === 1 && normal.find((entry) => entry.id === "ecommerceLayout").homeOwnership === "static", "static ecommerceLayout and Registry schema project one static-owned Home entry");
    check(normal.filter((entry) => entry.id === "vela").length === 1 && normal.find((entry) => entry.id === "vela").homeOwnership === "legacy", "Vela legacy card has explicit legacy Home ownership");
    check(catalog.getSystemSurface("velaPersistentSurface").id !== catalog.getLegacyFallback("vela").id, "Vela Persistent Surface and legacy card remain distinct catalog objects");
    check(!normal.some((entry) => /Lab$/.test(entry.id)) && debug.filter((entry) => /Lab$/.test(entry.id)).length === 3, "Developer Mode hides and reveals exactly three explicit labs");
    check(new Set(debug.map((entry) => entry.id)).size === debug.length, "no ID produces two Home entries");
    check(debug.map((entry) => entry.id).join(",") === "ecommerceLayout,vela,shapeAdd,textBackgroundBox,selectionInfo,proceduralAppearanceLab,registryControlLab,settingsRendererLab", "Home projection order is deterministic");
    const ordered = catalog.applyHomeOrder(debug, ["selectionInfo", "vela", "selectionInfo", "missing"]);
    check(ordered[0].id === "selectionInfo" && ordered[1].id === "vela" && new Set(ordered.map((entry) => entry.id)).size === debug.length, "saved Home order preserves all known IDs without duplicates");
}

// Atomic updates, stable diagnostics, snapshot isolation, and metadata immutability.
{
    const catalog = configuredCatalog();
    const input = registryDefinitions.map((definition) => Object.assign({}, definition));
    const before = JSON.stringify(input);
    check(catalog.setRegistryTools(input), "initial Registry update succeeds");
    const oldShape = catalog.getRegistryTool("shapeAdd");
    check(catalog.setRegistryTools([tool("duplicate"), tool("duplicate")]) === false, "duplicate Registry ID is rejected deterministically");
    check(catalog.getRegistryTool("shapeAdd") === oldShape, "failed Registry refresh retains the previously committed catalog");
    check(catalog.getSnapshot().diagnostics.some((item) => item.code === "REGISTRY_ID_DUPLICATE" && item.id === "duplicate"), "duplicate conflict has a stable diagnostic");
    const replacement = tool("replacement");
    check(catalog.setRegistryTools([replacement]) && catalog.getRegistryTool("shapeAdd") === null && catalog.getRegistryTool("replacement").definition === replacement, "successful Registry update drops stale dynamic objects");
    const snapshot = catalog.getSnapshot();
    check(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.registryTools) && Object.isFrozen(snapshot.diagnostics), "snapshot collections are read-only");
    check(Object.isFrozen(snapshot.registryTools[0]) && !Object.prototype.hasOwnProperty.call(snapshot.registryTools[0], "definition"), "snapshot descriptors cannot expose mutable Registry definitions");
    check(JSON.stringify(input) === before, "catalog does not mutate Registry metadata or nested i18n objects");
    check(catalog.getTool("unknown") === null && catalog.getRegistryTool("unknown") === null, "unknown IDs return explicit null");
    check(catalog.getTool("stack") === null && catalog.getTool("grid") === null, "Stack and Grid are not independent catalog tools");
}

// Production integration keeps projection and event ownership centralized.
{
    const root = path.join(__dirname, "..");
    const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
    const index = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
    check(!/DynamicTools|DynamicToolOrder|var ToolRegistry/.test(main), "main no longer owns parallel hard-coded and dynamic tool maps");
    check(/getHomeEntries\(\{ developerMode:/.test(main) && !/:not\(\[data-dynamic-tool='true'\]\)/.test(main), "Home deduplication is projected by Tool Catalog instead of DOM probing");
    check((main.match(/data-home-events-bound/g) || []).length >= 2 && /getAttribute\("data-home-events-bound"\) === "true"/.test(main), "Home buttons retain one-time event binding guard");
    check(/route\.kind === "registry"/.test(main) && /route\.kind === "legacy" && toolId === "vela"/.test(main), "configureToolDetail uses explicit Registry and legacy route kinds");
    check(index.indexOf("js/toolCatalog.js") < index.indexOf("js/main.js"), "Tool Catalog loads before main.js");
}

console.log(`Tool Catalog tests passed: ${assertions} assertions.`);
