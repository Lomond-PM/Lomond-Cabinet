const fs = require("fs");
const path = require("path");
const Bootstrap = require("../client/js/coreBootstrap.js");

let assertions = 0;
function check(value, message) {
    assertions += 1;
    if (!value) throw new Error(message);
}

function catalog(tools, loadErrors) {
    return JSON.stringify({ ok: true, tools: tools || [{ id: "shapeAdd" }], loadErrors: loadErrors || [] });
}

function clock() {
    let now = 0;
    let nextId = 1;
    const timers = new Map();
    return {
        setTimeout(fn, delay) { const id = nextId++; timers.set(id, { fn, at: now + delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        advance(ms) {
            const end = now + ms;
            while (true) {
                let selected = null;
                for (const [id, timer] of timers) {
                    if (timer.at <= end && (!selected || timer.at < selected.timer.at)) selected = { id, timer };
                }
                if (!selected) break;
                now = selected.timer.at;
                timers.delete(selected.id);
                selected.timer.fn();
            }
            now = end;
        },
        size() { return timers.size; }
    };
}

function harness(options = {}) {
    const fakeClock = clock();
    const calls = [];
    const states = [];
    const catalogs = [];
    let hostReadyCount = 0;
    const controller = Bootstrap.createController({
        evalScript(source, callback) { calls.push({ source, callback }); },
        hostLoadSource: "LOAD_HOST",
        timeoutMs: 100,
        retryDelaysMs: options.retryDelaysMs || [10, 20],
        setTimeout: fakeClock.setTimeout,
        clearTimeout: fakeClock.clearTimeout,
        onStateChange(state) { states.push(state); },
        onHostReady() { hostReadyCount += 1; },
        onCatalog(value) { catalogs.push(value); }
    });
    return { controller, calls, states, catalogs, fakeClock, hostReadyCount: () => hostReadyCount };
}

function complete(h, registry = catalog(), evalResult = "") {
    h.calls[h.calls.length - 1].callback(evalResult);
    h.calls[h.calls.length - 1].callback("AEToolbox host loaded");
    h.calls[h.calls.length - 1].callback(registry);
}

// Complete success path and immutable/read-only snapshot behavior.
{
    const h = harness();
    check(h.controller.start() === true, "initial bootstrap starts");
    complete(h);
    const state = h.controller.getSnapshot();
    check(state.state === "ready" && state.hostReady && state.registryReady, "eval, ping, and full registry reach ready");
    check(state.toolCount === 1 && state.loadErrorCount === 0 && h.catalogs.length === 1, "complete catalog is committed once");
    check(h.fakeClock.size() === 0, "successful callbacks clear every stage timeout");
    state.state = "failed";
    check(h.controller.getSnapshot().state === "ready", "snapshot cannot mutate controller state");
}

// Eval failures, invalid responses, and timeout.
{
    const h = harness(); h.controller.start(); h.calls[0].callback("EvalScript error.");
    check(h.controller.getSnapshot().lastErrorStage === "eval-file" && h.controller.getSnapshot().lastErrorCode === "HOST_EVAL_FAILED", "EvalScript error has stable stage and code diagnostics");
}
{
    const h = harness(); h.controller.start(); complete(h, catalog(), "");
    check(h.controller.getSnapshot().state === "ready", "empty eval callback result continues to authoritative ping");
}
{
    const h = harness(); h.controller.start(); complete(h, catalog(), "undefined");
    check(h.controller.getSnapshot().state === "ready", "undefined eval callback result continues to authoritative ping");
}
{
    const h = harness(); h.controller.start(); complete(h, catalog(), "host file completion value");
    check(h.controller.getSnapshot().state === "ready", "arbitrary non-error eval completion continues to authoritative ping");
}
{
    const h = harness(); h.controller.start(); h.fakeClock.advance(100);
    check(h.controller.getSnapshot().lastErrorStage === "timeout" && h.controller.getSnapshot().lastErrorCode === "HOST_EVAL_TIMEOUT", "missing eval callback has timeout diagnostics");
}

// Ping failure and timeout.
{
    const h = harness(); h.controller.start(); h.calls[0].callback(""); h.calls[1].callback("bad");
    check(h.controller.getSnapshot().lastErrorCode === "HOST_PING_INVALID", "invalid ping fails readiness");
}
{
    const h = harness(); h.controller.start(); h.calls[0].callback(""); h.fakeClock.advance(100);
    check(h.controller.getSnapshot().lastErrorCode === "HOST_PING_TIMEOUT", "missing ping callback times out");
}

// Registry validation and degraded publication.
{
    const h = harness(); h.controller.start(); h.calls[0].callback(""); h.calls[1].callback("AEToolbox host loaded"); h.calls[2].callback('{"ok":false,"tools":[],"loadErrors":["REGISTRY_EMPTY_CATALOG: registry"],"registryRevision":0,"lastAttemptSucceeded":false}');
    const state = h.controller.getSnapshot();
    check(state.state === "retrying" && state.lastErrorCode === "REGISTRY_REQUEST_FAILED" && h.catalogs.length === 0, "retryable registry request failure remains non-terminal and does not publish");
    check(state.generation === 2 && state.attempt === 1 && state.registryRequestCount === 1, "generation 2 identifies invalidation of the first generation 1 request");
    check(state.lastErrorDetails.loadErrors[0] === "REGISTRY_EMPTY_CATALOG: registry" && state.lastErrorDetails.registryRevision === 0 && !state.lastErrorDetails.lastAttemptSucceeded, "Host registry failure diagnostics survive normalization");
}
{
    const h = harness(); h.controller.start(); h.calls[0].callback(""); h.calls[1].callback("AEToolbox host loaded"); h.calls[2].callback(catalog([]));
    check(h.controller.getSnapshot().lastErrorCode === "REGISTRY_EMPTY", "empty registry is not ready");
}
{
    const h = harness(); h.controller.start(); complete(h, catalog([{ id: "shapeAdd" }], ["broken.tool.jsx"]));
    check(h.controller.getSnapshot().state === "degraded" && h.controller.getSnapshot().retryAvailable, "tools plus load errors publish degraded with retry");
}
check(Bootstrap.validateCatalog(catalog([{ id: "x" }, { id: "x" }])).code === "REGISTRY_TOOL_DUPLICATE", "duplicate ids are rejected");
check(Bootstrap.validateCatalog('{"ok":true,"tools":{},"loadErrors":[]}').code === "REGISTRY_RESPONSE_INVALID", "tools must be an array");

// Real Host outer contract accepts production and Developer Mode schema shapes.
{
    const actualShapeFixture = [
        { id: "ecommerceLayout", storageKey: "AEToolbox.ecommerceLayout.v1", stateAction: { hostFunction: "AEToolbox.tools.adComponentKit.getState" }, sections: [{ id: "component", fields: [{ key: "mode", type: "select", options: [{ value: "featureStack" }] }] }], actions: [{ id: "createFeatureStack", hostFunction: "AEToolbox.tools.adComponentKit.createFeatureStack", hidden: true }], i18n: { en: {}, "zh-CN": {} } },
        { id: "shapeAdd", stateAction: { hostFunction: "AEToolbox.tools.shapeAdd.getRegistryState" }, sections: [], actions: [{ id: "addItem", hidden: true }] },
        { id: "textBackgroundBox", sections: [{ id: "geometry", fields: [] }], actions: [{ id: "create", hostFunction: "AEToolbox.tools.textBackgroundBox.create" }] },
        { id: "selectionInfo", sections: [], actions: [{ id: "refresh", hostFunction: "AEToolbox.tools.selectionInfo.run" }] },
        { id: "proceduralAppearanceLab", developerOnly: true, storageKey: "AEToolbox.proceduralAppearanceLab.v1", sections: [], actions: [] },
        { id: "registryControlLab", category: "debug", stateAction: { hostFunction: "AEToolbox.tools.registryControlLab.getState" }, sections: [], actions: [] },
        { id: "settingsRendererLab", developerOnly: true, sections: [{ id: "actions", fields: [{ type: "button", clientAction: "resetFields" }] }], actions: [] }
    ];
    const validated = Bootstrap.validateCatalog(catalog(actualShapeFixture));
    check(validated.ok && validated.order.length === 7, "real production and Developer Mode outer schema shapes are accepted");
}

// Ping remains a raw-string contract and generation stays stable across successful stages.
{
    const h = harness(); h.controller.start(); const generation = h.controller.getSnapshot().generation;
    h.calls[0].callback("undefined");
    check(h.calls[1].source === "AEToolbox.ping()", "eval completion proceeds directly to raw ping without JSON parsing");
    h.calls[1].callback("AEToolbox host loaded");
    check(h.states.some((state) => state.state === "host-ready" && state.generation === generation), "exact ping reaches host-ready under the same generation");
    check(h.controller.getSnapshot().state === "registry-loading" && h.controller.getSnapshot().generation === generation, "registry-loading retains successful generation authority");
    h.calls[2].callback(catalog());
    check(h.controller.getSnapshot().state === "ready" && h.controller.getSnapshot().generation === generation, "ready retains the successful generation");
}

// Automatic retry, limit, and manual retry.
{
    const h = harness(); h.controller.start(); h.calls[0].callback("EvalScript error."); h.fakeClock.advance(10);
    check(h.controller.getSnapshot().attempt === 2 && h.calls.length === 2, "first failure schedules a new-generation automatic retry");
    complete(h);
    check(h.controller.getSnapshot().state === "ready", "automatic retry can recover");
}

// Realistic startup transaction: stale completions, transient recovery, terminal failure, and duplicate start.
{
    const h = harness();
    check(h.controller.start() && !h.controller.start(), "duplicate bootstrap start is serialized into one Host load request");
    const staleLoad = h.calls[0].callback;
    h.fakeClock.advance(100);
    check(h.controller.getSnapshot().state === "retrying", "timed-out current request enters bounded retry without terminal failure");
    staleLoad("");
    check(h.calls.length === 1, "stale generation completion cannot begin ping or Registry work");
    h.fakeClock.advance(10);
    complete(h);
    check(h.controller.getSnapshot().state === "ready" && h.controller.getSnapshot().registryRequestCount === 1, "current generation succeeds after stale completion is ignored");
}
{
    const h = harness(); h.controller.start();
    h.calls[0].callback(""); h.calls[1].callback("AEToolbox host loaded"); h.calls[2].callback('{"ok":false,"tools":[],"loadErrors":["REGISTRY_EMPTY_CATALOG: registry"],"registryRevision":0,"lastAttemptSucceeded":false}');
    check(h.states.filter((state) => state.state === "failed").length === 0 && h.controller.getSnapshot().state === "retrying", "first transient Host registry failure does not publish a terminal failure");
    h.fakeClock.advance(10); complete(h);
    check(h.controller.getSnapshot().state === "ready" && h.controller.getSnapshot().registryRequestCount === 2, "bounded retry performs exactly one additional Registry request before recovery");
}
{
    const h = harness({ retryDelaysMs: [] }); h.controller.start();
    h.calls[0].callback(""); h.calls[1].callback("AEToolbox host loaded"); h.calls[2].callback('{"ok":false,"tools":[],"loadErrors":["REGISTRY_DIRECTORY_UNAVAILABLE: tools"],"registryRevision":0,"lastAttemptSucceeded":false}');
    check(h.controller.getSnapshot().state === "failed" && h.controller.getSnapshot().lastErrorDetails.loadErrors.length === 1, "final Registry failure remains terminal with actionable Host diagnostics");
}
{
    const h = harness(); h.controller.start(); h.calls[0].callback("EvalScript error."); h.fakeClock.advance(10); h.calls[1].callback("EvalScript error."); h.fakeClock.advance(20); h.calls[2].callback("EvalScript error.");
    check(h.controller.getSnapshot().attempt === 3 && h.controller.getSnapshot().retryAvailable, "automatic retries stop at the configured limit");
    check(h.fakeClock.size() === 0, "retry limit leaves no live timer");
    check(h.controller.retry() === true && h.controller.getSnapshot().attempt === 1, "manual retry resets attempt count");
    complete(h);
    check(h.controller.getSnapshot().state === "ready", "manual retry can recover");
}

// Stale generation, retained catalog, and atomic replacement.
{
    const h = harness(); h.controller.start(); const stale = h.calls[0].callback; h.fakeClock.advance(100);
    stale("AEToolbox host evaluated");
    check(h.calls.length === 1, "late callback after timeout is ignored before retry starts");
    h.fakeClock.advance(10);
    complete(h, catalog([{ id: "old" }], ["retryable.tool.jsx"]));
    check(h.catalogs[0].order.join(",") === "old", "first valid catalog is published atomically");
    h.controller.retry();
    h.calls[h.calls.length - 1].callback("EvalScript error.");
    check(h.catalogs.length === 1 && h.catalogs[0].order[0] === "old", "failed retry cannot clear the existing catalog");
    h.fakeClock.advance(10); complete(h, catalog([{ id: "new" }]));
    check(h.catalogs.length === 2 && h.catalogs[1].order.join(",") === "new", "successful retry atomically replaces the catalog");
}

// Shutdown invalidates callbacks and clears timers.
{
    const h = harness(); h.controller.start(); const callback = h.calls[0].callback;
    check(h.controller.shutdown() === true && h.controller.getSnapshot().state === "shutdown", "shutdown invalidates the generation");
    check(h.fakeClock.size() === 0, "shutdown clears stage and retry timers");
    callback("AEToolbox host evaluated");
    check(h.calls.length === 1, "shutdown ignores late callbacks");
}

// Production integration boundaries remain explicit and idempotent.
{
    const root = path.join(__dirname, "..");
    const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
    const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
    check(/toolCatalog\.getHomeEntries\(\{ developerMode:/.test(main) && !/openEcommerceLayoutTool/.test(main + html), "ecommerceLayout is rendered only by the dynamic Tool Catalog projection");
    check(/oldTools = grid\.querySelectorAll\("\.tool-app\[data-dynamic-tool='true'\]"\)/.test(main), "dynamic cards are replaced rather than accumulated");
    check((main.match(/toolBootstrapRetry"\)\.addEventListener\("click"/g) || []).length === 1, "Retry listener is bound once");
    check(!/bindPanelLifecycle\(\);\s*startSelectionPolling\(\)/.test(main), "selection polling no longer starts before Registry readiness");
    check(/selectionPollTimer \|\| panelShuttingDown \|\| panelSuspended/.test(main), "selection polling retains duplicate timer guard");
    check(/coreBootstrapSnapshot\.state !== "ready" && coreBootstrapSnapshot\.state !== "degraded"/.test(main), "Registry polling is gated by catalog readiness");
    check(/coreBootstrapController\.shutdown\(\)/.test(main), "panel shutdown invalidates Core bootstrap");
    check(/renderCoreBootstrapState\(coreBootstrapSnapshot\)/.test(main), "locale refresh reprojects bootstrap text");
    check(/snapshot\.state === "failed" && window\.console && console\.warn/.test(main), "only terminal Core failure emits the project-owned warning");
    check(/snapshot\.state === "ready"[\s\S]*root\.hidden = true/.test(main), "ready hides bootstrap status UI");
    check(/id="toolBootstrapStatus" role="status" aria-live="polite"/.test(html), "bootstrap feedback has accessible live status");
    check(/js\/coreBootstrap\.js[^>]*><\/script>[\s\S]*js\/main\.js/.test(html), "Core bootstrap module loads before main.js");
}

console.log(`Core bootstrap tests passed: ${assertions} assertions.`);
