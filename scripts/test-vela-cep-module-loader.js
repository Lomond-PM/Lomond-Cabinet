#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const VELA = path.join(ROOT, "client", "js", "vela");
const loaderSource = fs.readFileSync(path.join(VELA, "velaCepModuleLoader.js"), "utf8");
let assertions = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
async function expectCode(promise, code, message) {
    await assert.rejects(Promise.resolve(promise), (error) => error && error.code === code, message || ("Expected " + code));
    assertions += 1;
}

function makeBrowser(options) {
    options = options || {};
    const timers = new Map();
    let nextTimer = 0;
    const context = {
        Promise,
        Set,
        Map,
        WeakMap,
        WeakSet,
        Uint8Array,
        JSON,
        Math,
        Number,
        String,
        Array,
        Object,
        RegExp,
        Error,
        Date,
        console: { log() {}, warn() {} },
        setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        crypto: { getRandomValues(values) { for (let index = 0; index < values.length; index += 1) values[index] = index + 1; return values; } }
    };
    context.window = context;
    context.self = context;
    const document = {
        currentScript: { src: options.loaderSrc || "file:///C:/extension/client/js/vela/velaCepModuleLoader.js?v=test" },
        head: null,
        documentElement: null,
        createElement() { return { parentNode: null, async: true, onload: null, onerror: null, src: "" }; }
    };
    let appendCount = 0;
    const requestedUrls = [];
    const host = {
        appendChild(script) {
            appendCount += 1;
            requestedUrls.push(script.src);
            script.parentNode = host;
            const filename = script.src.split("?")[0].slice(script.src.split("?")[0].lastIndexOf("/") + 1);
            if (options.failFile === filename) { script.onerror(); return script; }
            if (options.timeoutFile === filename) { return script; }
            try {
                vm.runInContext(fs.readFileSync(path.join(VELA, filename), "utf8"), sandbox, { filename });
                script.onload();
            } catch (error) {
                script.onerror();
            }
            return script;
        },
        removeChild(script) { script.parentNode = null; }
    };
    document.head = host;
    context.document = document;
    if (options.moduleDescriptor) Object.defineProperty(context, "module", options.moduleDescriptor);
    if (options.exportsDescriptor) Object.defineProperty(context, "exports", options.exportsDescriptor);
    if (options.requireDescriptor) Object.defineProperty(context, "require", options.requireDescriptor);
    const sandbox = vm.createContext(context);
    vm.runInContext(loaderSource, sandbox, { filename: "velaCepModuleLoader.js" });
    return { context, sandbox, timers, document, getAppendCount() { return appendCount; }, requestedUrls };
}

async function run() {
    const moduleSentinel = { exports: { sentinel: true } };
    const exportsSentinel = moduleSentinel.exports;
    const browser = makeBrowser({
        moduleDescriptor: { configurable: true, enumerable: false, writable: true, value: moduleSentinel },
        exportsDescriptor: { configurable: true, enumerable: true, writable: true, value: exportsSentinel },
        requireDescriptor: { configurable: true, enumerable: false, writable: true, value: function () { throw new Error("must not call require"); } }
    });
    const beforeModule = Object.getOwnPropertyDescriptor(browser.context, "module");
    const beforeExports = Object.getOwnPropertyDescriptor(browser.context, "exports");
    const beforeRequire = Object.getOwnPropertyDescriptor(browser.context, "require");
    check(browser.context.VelaCepModuleLoader.getStatus().state === "idle", "Loader status starts idle without exposing instances.");
    check(browser.document.currentScript && browser.document.currentScript.src.indexOf("velaCepModuleLoader.js?v=test") !== -1, "Loader captures its own script URL while the synchronous script context is available.");
    browser.document.scripts = [{ src: "file:///C:/unrelated/a.js" }, { src: "file:///C:/unrelated/velaCepModuleLoader.js" }];
    browser.document.currentScript = null;
    const concurrentA = browser.context.VelaCepModuleLoader.load();
    const concurrentB = browser.context.VelaCepModuleLoader.load();
    check(concurrentA === concurrentB, "Concurrent loader calls share one Promise.");
    const result = await concurrentA;
    check(result.ok === true && result.state === "ready", "Loader reaches ready state.");
    check(Object.isFrozen(browser.context.VelaCepModuleLoader.getStatus()) && browser.context.VelaCepModuleLoader.getStatus().state === "ready" && browser.context.VelaCepModuleLoader.getStatus().lastErrorCode === null, "Loader exposes only a frozen ready diagnostic snapshot.");
    check(Object.isFrozen(result) && Object.isFrozen(result.modules), "Loader result is frozen.");
    check(result.modules.length === 9 && result.modules[result.modules.length - 1] === "VelaRuntime" && result.modules[result.modules.length - 2] === "VelaExecutionAdapter", "Loader returns bounded dependency order.");
    check(browser.context.__velaProtocolCoreBootstrapV1.getModule("VelaProtocol") === browser.context.VelaProtocol, "Protocol uses the browser bootstrap identity.");
    check(browser.context.__velaProtocolCoreBootstrapV1.getModule("VelaRuntime") === browser.context.VelaRuntime, "Runtime uses the browser bootstrap identity.");
    check(Object.isFrozen(browser.context.VelaRuntime), "Runtime browser module is frozen.");
    check(browser.context.module === moduleSentinel && browser.context.module.exports === exportsSentinel, "module identity is restored.");
    check(browser.context.exports === exportsSentinel, "exports identity is restored.");
    check(browser.context.require === beforeRequire.value, "require identity is restored.");
    check(JSON.stringify(Object.getOwnPropertyDescriptor(browser.context, "module")) === JSON.stringify(beforeModule), "module descriptor is restored exactly.");
    check(JSON.stringify(Object.getOwnPropertyDescriptor(browser.context, "exports")) === JSON.stringify(beforeExports), "exports descriptor is restored exactly.");
    check(JSON.stringify(Object.getOwnPropertyDescriptor(browser.context, "require")) === JSON.stringify(beforeRequire), "require descriptor is restored exactly.");
    check(await browser.context.VelaCepModuleLoader.load() === result, "Ready loader calls return the same result.");
    check(Object.getOwnPropertyDescriptor(browser.context, "CSInterface") === undefined, "Loader does not create CSInterface state.");
    check(Object.getOwnPropertyDescriptor(browser.context, "__adobe_cep__") === undefined, "Loader does not create Adobe CEP state.");
    check(browser.getAppendCount() === 9, "Loader injects each protected module exactly once.");
    check(browser.requestedUrls[0] === "file:///C:/extension/client/js/vela/velaProtocol.js?v=test", "The captured loader base and cache query produce VelaProtocol as the first request after currentScript is cleared.");
    check(JSON.stringify(browser.requestedUrls) === JSON.stringify([
        "file:///C:/extension/client/js/vela/velaProtocol.js?v=test",
        "file:///C:/extension/client/js/vela/velaContext.js?v=test",
        "file:///C:/extension/client/js/vela/velaValidator.js?v=test",
        "file:///C:/extension/client/js/vela/velaPlan.js?v=test",
        "file:///C:/extension/client/js/vela/velaExecutionGuard.js?v=test",
        "file:///C:/extension/client/js/vela/velaContextBridge.js?v=test",
        "file:///C:/extension/client/js/vela/velaExecutionPreflight.js?v=test",
        "file:///C:/extension/client/js/vela/velaExecutionAdapter.js?v=test",
        "file:///C:/extension/client/js/vela/velaRuntime.js?v=test"
    ]), "Captured location preserves the fixed module order and cache query without inspecting unrelated scripts.");

    check(!Object.prototype.hasOwnProperty.call(browser.context, "velaRuntimeController"), "Browser module path never publishes a runtime instance.");

    const absent = makeBrowser();
    await absent.context.VelaCepModuleLoader.load();
    check(!Object.prototype.hasOwnProperty.call(absent.context, "module"), "Absent module remains absent after load.");
    check(!Object.prototype.hasOwnProperty.call(absent.context, "exports"), "Absent exports remains absent after load.");
    check(!Object.prototype.hasOwnProperty.call(absent.context, "require"), "Absent require remains absent after load.");

    const failed = makeBrowser({ failFile: "velaContext.js" });
    await expectCode(failed.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Module load error fails closed.");
    await expectCode(failed.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "Failed loader remains failed until reload.");
    check(failed.context.VelaCepModuleLoader.getStatus().state === "failed" && failed.context.VelaCepModuleLoader.getStatus().lastErrorCode === "RUNTIME_CAPABILITY_UNAVAILABLE", "Failed loader caches a bounded diagnostic error code.");
    check(!failed.context.VelaRuntime, "Failed loader does not create the runtime module.");

    const timeout = makeBrowser({ timeoutFile: "velaProtocol.js" });
    const timeoutPromise = timeout.context.VelaCepModuleLoader.load();
    await Promise.resolve();
    await Promise.resolve();
    timeout.timers.forEach((callback) => callback());
    await expectCode(timeoutPromise, "RUNTIME_CAPABILITY_UNAVAILABLE", "Module timeout fails closed.");
    check(!timeout.context.VelaProtocol, "Timed-out module does not register a partial protocol facade.");

    const partial = makeBrowser();
    Object.defineProperty(partial.context, "VelaProtocol", { configurable: true, enumerable: true, writable: true, value: Object.freeze({}) });
    await expectCode(partial.context.VelaCepModuleLoader.load(), "MODULE_BOOTSTRAP_CONFLICT", "Pre-existing facade fails closed.");

    const accessorValue = { exports: { accessor: true } };
    const accessor = makeBrowser({ moduleDescriptor: { configurable: true, enumerable: true, get() { return accessorValue; } } });
    const accessorBefore = Object.getOwnPropertyDescriptor(accessor.context, "module");
    await accessor.context.VelaCepModuleLoader.load();
    const accessorAfter = Object.getOwnPropertyDescriptor(accessor.context, "module");
    check(accessorAfter.get === accessorBefore.get && accessorAfter.enumerable === accessorBefore.enumerable && accessorAfter.configurable === accessorBefore.configurable, "Accessor descriptor is restored exactly.");

    const invalidLocation = makeBrowser({ loaderSrc: "file:///C:/extension/client/js/vela/not-the-loader.js?v=bad" });
    invalidLocation.document.currentScript = null;
    await expectCode(invalidLocation.context.VelaCepModuleLoader.load(), "RUNTIME_CAPABILITY_UNAVAILABLE", "An invalid synchronous loader URL fails closed.");
    check(invalidLocation.getAppendCount() === 0, "An invalid loader URL injects no protected module.");

    console.log("test-vela-cep-module-loader: " + assertions + " assertions passed.");
}

run().catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
