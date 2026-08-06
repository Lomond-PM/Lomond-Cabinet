const fs = require("fs");
const path = require("path");
const CatalogModule = require("../client/js/toolCatalog.js");

let assertions = 0;
function check(value, message) {
    assertions += 1;
    if (!value) throw new Error(message);
}

function tool(id, extra = {}) {
    return Object.assign({ id, titleKey: `tools.${id}.title`, descriptionKey: `tools.${id}.description`, sections: [], actions: [], i18n: { en: {}, "zh-CN": {} } }, extra);
}

function configuredCatalog() {
    const catalog = CatalogModule.createCatalog();
    catalog.registerSystemSurface({ id: "velaPersistentSurface" });
    catalog.registerSystemSurface({ id: "settings" });
    catalog.registerLegacyFallback({ id: "vela", titleKey: "vela.title" });
    catalog.registerStaticHomeEntry("vela");
    return catalog;
}

const registryDefinitions = [
    tool("ecommerceLayout", { titleKey: "tools.adComponentKit.title", descriptionKey: "tools.adComponentKit.description", iconText: "A", storageKey: "AEToolbox.ecommerceLayout.v1" }),
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
    check(catalog.getRegistryTool("ecommerceLayout") === null && catalog.getTool("ecommerceLayout") === null && catalog.getDisplayMetadata("ecommerceLayout") === null, "Ad Component Kit does not exist before Registry readiness");
    check(catalog.getRoute("ecommerceLayout").kind === "unknown" && !catalog.getHomeEntries({ developerMode: true }).some((entry) => entry.id === "ecommerceLayout"), "loading projection has no Ad Component Kit compatibility or static ghost entry");
    check(catalog.getRegistryTool("shapeAdd") === null && catalog.getTool("shapeAdd") === null && catalog.getDisplayMetadata("shapeAdd") === null, "Shape Add does not exist before a Registry definition is committed");
    check(!catalog.getHomeEntries({ developerMode: true }).some((entry) => entry.id === "shapeAdd"), "loading projection contains no Shape Add ghost Home entry");
    check(catalog.getRoute("shapeAdd").kind === "unknown" && catalog.getLegacyFallback("shapeAdd") === null, "Shape Add is unknown before Registry readiness and has no legacy fallback");
    check(catalog.getSystemSurface("velaPersistentSurface").kind === "system" && catalog.getSystemSurface("settings").kind === "system", "system surfaces are explicitly classified");
    check(catalog.getTool("vela").kind === "legacy" && catalog.getLegacyFallback("vela").definition.titleKey === "vela.title", "Vela is an explicit legacy fallback");
    check(catalog.getTool("velaPersistentSurface") === null && catalog.getRegistryTool("settings") === null, "system surfaces do not enter ordinary tool or Registry lookup");
    check(catalog.setRegistryTools(registryDefinitions), "complete Registry catalog commits");
    check(catalog.getRegistryTool("ecommerceLayout").kind === "registry" && catalog.getRegistryTool("ecommerceLayout").homeOwnership === "dynamic" && catalog.getRegistryTool("ecommerceLayout").definition === registryDefinitions[0], "Ad Component Kit becomes a dynamic Registry entry with Host definition identity");
    check(catalog.getDisplayMetadata("ecommerceLayout").titleKey === "tools.adComponentKit.title" && catalog.getDisplayMetadata("ecommerceLayout").descriptionKey === "tools.adComponentKit.description" && catalog.getDisplayMetadata("ecommerceLayout").iconText === "A" && catalog.getDisplayMetadata("ecommerceLayout").storageKey === "AEToolbox.ecommerceLayout.v1", "Ad Component Kit display, icon, and persistence metadata come from its Registry definition");
    check(catalog.getTool("shapeAdd").kind === "registry" && catalog.getRegistryTool("textBackgroundBox") && catalog.getRegistryTool("selectionInfo"), "production Registry tools are queryable");
    check(catalog.getRegistryTool("shapeAdd").homeOwnership === "dynamic" && catalog.getDisplayMetadata("shapeAdd") === registryDefinitions[1], "Shape Add becomes dynamic-owned and uses Registry definition identity");
    check(catalog.getDisplayMetadata("shapeAdd").titleKey === "tools.shapeAdd.title" && catalog.getDisplayMetadata("shapeAdd").descriptionKey === "tools.shapeAdd.description", "Shape Add title and description keys come from its Registry definition");
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
    check(normal.filter((entry) => entry.id === "ecommerceLayout").length === 1 && normal.find((entry) => entry.id === "ecommerceLayout").homeOwnership === "dynamic", "Registry projects exactly one dynamic-owned Ad Component Kit Home entry");
    check(normal.filter((entry) => entry.id === "vela").length === 1 && normal.find((entry) => entry.id === "vela").homeOwnership === "legacy", "Vela legacy card has explicit legacy Home ownership");
    check(catalog.getSystemSurface("velaPersistentSurface").id !== catalog.getLegacyFallback("vela").id, "Vela Persistent Surface and legacy card remain distinct catalog objects");
    check(!normal.some((entry) => /Lab$/.test(entry.id)) && debug.filter((entry) => /Lab$/.test(entry.id)).length === 3, "Developer Mode hides and reveals exactly three explicit labs");
    check(new Set(debug.map((entry) => entry.id)).size === debug.length, "no ID produces two Home entries");
    check(debug.map((entry) => entry.id).join(",") === "vela,ecommerceLayout,shapeAdd,textBackgroundBox,selectionInfo,proceduralAppearanceLab,registryControlLab,settingsRendererLab", "Home projection order is deterministic");
    const ordered = catalog.applyHomeOrder(debug, ["selectionInfo", "vela", "selectionInfo", "missing"]);
    check(ordered[0].id === "selectionInfo" && ordered[1].id === "vela" && new Set(ordered.map((entry) => entry.id)).size === debug.length, "saved Home order preserves all known IDs without duplicates");
}

// A saved ID that is absent while loading remains usable once Registry entries arrive.
{
    const catalog = configuredCatalog();
    const savedOrder = ["ecommerceLayout", "shapeAdd", "vela"];
    const loading = catalog.applyHomeOrder(catalog.getHomeEntries({ developerMode: false }), savedOrder);
    check(!loading.some((entry) => entry.id === "shapeAdd" || entry.id === "ecommerceLayout") && savedOrder[0] === "ecommerceLayout", "loading projection creates no Registry ghosts and does not mutate persisted order input");
    catalog.setRegistryTools([tool("ecommerceLayout"), tool("shapeAdd")]);
    const ready = catalog.applyHomeOrder(catalog.getHomeEntries({ developerMode: false }), savedOrder);
    check(ready[0].id === "ecommerceLayout" && ready[1].id === "shapeAdd" && ready.filter((entry) => entry.id === "ecommerceLayout").length === 1, "Registry readiness reapplies saved Ad Component Kit order without a ghost or duplicate");
}

// Atomic updates, stable diagnostics, snapshot isolation, and metadata immutability.
{
    const catalog = configuredCatalog();
    const input = registryDefinitions.map((definition) => Object.assign({}, definition));
    const before = JSON.stringify(input);
    check(catalog.setRegistryTools(input), "initial Registry update succeeds");
    const oldShape = catalog.getRegistryTool("shapeAdd");
    const oldEcommerce = catalog.getRegistryTool("ecommerceLayout");
    check(catalog.setRegistryTools([tool("duplicate"), tool("duplicate")]) === false, "duplicate Registry ID is rejected deterministically");
    check(catalog.getRegistryTool("shapeAdd") === oldShape && catalog.getRegistryTool("ecommerceLayout") === oldEcommerce && catalog.getHomeEntries({ developerMode: false }).filter((entry) => entry.id === "ecommerceLayout").length === 1, "failed Registry refresh retains one last-known-good Ad Component Kit entry");
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

// Ad Component Kit refresh and retry remain Registry-only and duplicate-free.
{
    const catalog = configuredCatalog();
    const first = tool("ecommerceLayout", { iconText: "A", storageKey: "AEToolbox.ecommerceLayout.v1" });
    const replacement = tool("ecommerceLayout", { titleKey: "tools.adComponentKit.nextTitle", descriptionKey: "tools.adComponentKit.nextDescription", iconText: "A", storageKey: "AEToolbox.ecommerceLayout.v1" });
    check(catalog.setRegistryTools([first]) && catalog.getRegistryTool("ecommerceLayout").definition === first, "first successful Registry load publishes Ad Component Kit once");
    check(catalog.setRegistryTools([replacement]) && catalog.getRegistryTool("ecommerceLayout").definition === replacement && catalog.getDisplayMetadata("ecommerceLayout").titleKey === "tools.adComponentKit.nextTitle", "successful refresh replaces Ad Component Kit definition without fallback metadata");
    check(catalog.getHomeEntries({ developerMode: false }).filter((entry) => entry.id === "ecommerceLayout").length === 1, "retry success projects exactly one Ad Component Kit Home entry");
    check(catalog.getRoute("ecommerceLayout").kind === "registry" && catalog.getLegacyFallback("ecommerceLayout") === null && catalog.getSystemSurface("ecommerceLayout") === null, "Ad Component Kit routes only as Registry and has no legacy or system registration");
    check(catalog.getHomeEntries({ developerMode: false }).some((entry) => entry.id === "ecommerceLayout") && catalog.getHomeEntries({ developerMode: true }).some((entry) => entry.id === "ecommerceLayout"), "Developer Mode never filters the production Ad Component Kit tool");
}

// Successful refresh and retry replace Shape Add strictly from Registry authority.
{
    const catalog = configuredCatalog();
    const first = tool("shapeAdd", { titleKey: "tools.shapeAdd.title", descriptionKey: "tools.shapeAdd.description" });
    const replacement = tool("shapeAdd", { titleKey: "tools.shapeAdd.nextTitle", descriptionKey: "tools.shapeAdd.nextDescription" });
    check(catalog.setRegistryTools([first]) && catalog.getRegistryTool("shapeAdd").definition === first, "first successful Registry load publishes Shape Add once");
    check(catalog.setRegistryTools([replacement]) && catalog.getRegistryTool("shapeAdd").definition === replacement && catalog.getDisplayMetadata("shapeAdd").titleKey === "tools.shapeAdd.nextTitle", "successful refresh replaces Shape Add without retaining old compatibility fields");
    check(catalog.getHomeEntries({ developerMode: false }).filter((entry) => entry.id === "shapeAdd").length === 1, "retry success projects exactly one Shape Add Home entry");
    check(catalog.getRoute("shapeAdd").kind === "registry" && catalog.getRoute("missing").kind === "unknown", "Shape Add routes only through Registry and unknown IDs do not fall back to it");
    check(catalog.getHomeEntries({ developerMode: false }).some((entry) => entry.id === "shapeAdd") && catalog.getHomeEntries({ developerMode: true }).some((entry) => entry.id === "shapeAdd"), "Developer Mode does not filter the production Shape Add tool");
}

// Production integration keeps projection and event ownership centralized.
{
    const root = path.join(__dirname, "..");
    const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
    const index = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
    const adSchema = fs.readFileSync(path.join(root, "host/tools/adComponentKit.tool.jsx"), "utf8");
    const loadOrderSource = main.slice(main.indexOf("loadOrder: function ()"), main.indexOf("saveOrder: function ()"));
    check(!/DynamicTools|DynamicToolOrder|var ToolRegistry/.test(main), "main no longer owns parallel hard-coded and dynamic tool maps");
    check(/getHomeEntries\(\{ developerMode:/.test(main) && !/:not\(\[data-dynamic-tool='true'\]\)/.test(main), "Home deduplication is projected by Tool Catalog instead of DOM probing");
    check((main.match(/data-home-events-bound/g) || []).length >= 2 && /getAttribute\("data-home-events-bound"\) === "true"/.test(main), "Home buttons retain one-time event binding guard");
    check(/route\.kind === "registry"/.test(main) && !/route\.kind === "legacy"|renderVelaDetail/.test(main), "production detail routing accepts Registry tools without a Vela legacy special case");
    check(!/registerRegistryCompatibilityMetadata\(\{\s*id:\s*["']shapeAdd["']/.test(main), "production code contains no Shape Add compatibility metadata registration");
    check(!/registerRegistryCompatibilityMetadata|compatibilityMetadata|COMPATIBILITY_METADATA/.test(main + fs.readFileSync(path.join(root, "client/js/toolCatalog.js"), "utf8")), "obsolete Registry compatibility metadata layer has no production references");
    check(!/openEcommerceLayoutTool|data-tool=["']ecommerceLayout["']|data-tool-title=["']ecommerceLayout["']|ecommerce-tool-icon/.test(index), "production HTML contains no static or hidden Ad Component Kit card");
    check(!/id="openVelaTool"|data-tool="vela"/.test(index) && /id="velaSurfaceMount"/.test(index) && /tool-app app-card is-disabled/.test(index) && /tools\.moreTools\.title/.test(index), "Persistent Surface and disabled More Tools remain without a Vela legacy card");
    check(/button\.setAttribute\("data-tool", tool\.id\)/.test(main) && /icon\.textContent = tool\.iconText/.test(main) && /title\.textContent = tr\(tool\.titleKey/.test(main), "dynamic Home card consumes Registry id, iconText, and translated title");
    check(/id:\s*"ecommerceLayout"/.test(adSchema) && /titleKey:\s*"tools\.adComponentKit\.title"/.test(adSchema) && /descriptionKey:\s*"tools\.adComponentKit\.description"/.test(adSchema) && /iconText:\s*"A"/.test(adSchema) && /storageKey:\s*"AEToolbox\.ecommerceLayout\.v1"/.test(adSchema), "Host Ad Component Kit schema remains the complete display and persistence authority");
    check(loadOrderSource.indexOf("saveStoredJson") === -1 && /commitDynamicToolCatalog[\s\S]*HomeLayoutManager\.loadOrder\(\)/.test(main), "loading filters only the in-memory order and Registry commit reapplies persisted Home order");
    check(index.indexOf("js/toolCatalog.js") < index.indexOf("js/main.js"), "Tool Catalog loads before main.js");
}

console.log(`Tool Catalog tests passed: ${assertions} assertions.`);
