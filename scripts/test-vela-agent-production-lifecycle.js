#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("client/index.html");
const main = read("client/js/main.js");
const normalizedMain = main.replace(/\r\n?/g, "\n");
const loader = read("client/js/vela/velaCepModuleLoader.js");
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }

const sessionIndex = html.indexOf("js/vela/velaSessionRuntime.js");
const agentIndex = html.indexOf("js/vela/velaAgentRuntime.js");
const registryIndex = html.indexOf("js/vela/velaAgentCapabilityRegistry.js");
const serializerIndex = html.indexOf("js/vela/velaHostReadSerializer.js");
const capabilityRuntimeIndex = html.indexOf("js/vela/velaAgentCapabilityRuntime.js");
const activeCompositionIndex = html.indexOf("js/vela/velaActiveCompositionCapability.js");
const observationIndex = html.indexOf("js/vela/velaAgentObservationRuntime.js");
const ownerIndex = html.indexOf("js/vela/velaAgentRuntimeOwner.js");
const mainIndex = html.indexOf("js/main.js");
check(sessionIndex !== -1 && sessionIndex < agentIndex && agentIndex < ownerIndex && ownerIndex < mainIndex, "static Agent dependencies load Session to Agent to Owner before main");
check(agentIndex < registryIndex && registryIndex < serializerIndex && serializerIndex < capabilityRuntimeIndex && capabilityRuntimeIndex < activeCompositionIndex && activeCompositionIndex < observationIndex && observationIndex < ownerIndex, "0.3.4 capability and Observation dependencies load in bounded production order");
check(html.indexOf("velaAgentSurfaceProjection.js") === -1, "neutral Agent Surface adapter is not production-loaded");
check(loader.indexOf("VelaAgentRuntime") === -1 && loader.indexOf("velaAgentRuntime") === -1 && loader.indexOf("VelaSessionRuntime") === -1, "CEP module loader remains outside static Agent module loading");
check((main.match(/var velaAgentRuntimeOwner = null;/g) || []).length === 1, "main owns exactly one AgentRuntimeOwner reference");
check(normalizedMain.indexOf("initializeVelaAgentRuntimeOwner();\n            initializeVelaSurfaceController();") !== -1, "Agent owner initializes after existing Runtime commit and before Surface Controller");

const shutdownStart = main.indexOf("    function shutdownPanelRuntime() {");
const shutdownEnd = main.indexOf("    function recoverPanelRuntime()", shutdownStart);
const shutdown = main.slice(shutdownStart, shutdownEnd);
check(shutdown.indexOf("velaSurfaceController.dispose()") < shutdown.indexOf("velaAgentRuntimeOwner.dispose()"), "shutdown unsubscribes Surface before Agent owner disposal");
check(shutdown.indexOf("velaAgentRuntimeOwner.dispose()") < shutdown.indexOf("velaRuntimeController.dispose()"), "Agent owner disposes before existing VelaRuntime");

const agentReportStart = main.indexOf("    function reportVelaAgentRuntimeError(");
const agentReportEnd = main.indexOf("    function initializeVelaAgentRuntimeOwner", agentReportStart);
const agentReport = main.slice(agentReportStart, agentReportEnd);
check(agentReport.indexOf("velaAgentRuntimeLastErrorCode") !== -1, "Agent failures use separate diagnostics state");
check(agentReport.indexOf("reportVelaRuntimeError") === -1 && agentReport.indexOf("velaRuntimeLastErrorCode") === -1 && agentReport.indexOf("velaRuntimeStatusRevision") === -1, "Agent diagnostics cannot pollute existing Runtime status");
check(!/resetSession\([^)]*\)[\s\S]{0,120}velaAgentRuntimeOwner\.dispose/.test(main), "existing resetSession is not mapped to Agent disposal");
check(main.indexOf("agentProjection: velaAgentRuntimeOwner") !== -1, "Surface receives only optional current Projection from main-owned Owner");
check(main.indexOf("velaRuntimeController.getObservationReadPort()") !== -1 && main.indexOf("ownerOptions.observationReadPort = observationReadPort") !== -1, "main composition root passes the existing Runtime read-only Context port into the Agent owner");
check(main.indexOf("ownerOptions.AgentCapabilityRuntime") !== -1 && main.indexOf("ownerOptions.ActiveCompositionCapability") !== -1 && main.indexOf("ownerOptions.AgentObservationRuntime") !== -1, "main wires only the focused 0.3.4 capability dependencies");
check(main.indexOf("installVelaActiveCompositionDiagnostics();") !== -1 && main.indexOf("Object.defineProperty(window, \"VelaActiveCompositionDiagnostics\"") !== -1, "main permanently installs the bounded Active Composition diagnostics surface");
check(main.indexOf("diagnostics = Object.freeze({ refresh: refreshActiveCompositionDiagnostics, cancel: cancelActiveCompositionDiagnostics, getState: activeCompositionDiagnosticsState })") !== -1, "diagnostics global exposes only refresh, cancel, and getState");
check(main.indexOf("window.velaAgentRuntimeOwner") === -1 && main.indexOf("window.velaRuntimeController") === -1, "diagnostics preserves lexical production Runtime and Owner ownership");
const ownerCommitStart = main.indexOf("            velaAgentRuntimeOwner = owner;");
check(ownerCommitStart !== -1 && main.indexOf("            resetActiveCompositionDiagnostics();", ownerCommitStart) > ownerCommitStart, "cold/new Owner commit resets diagnostics before exposing new Observation truth");
check(shutdown.indexOf("resetActiveCompositionDiagnostics()") !== -1 && shutdown.indexOf("resetActiveCompositionDiagnostics()") < shutdown.indexOf("velaAgentRuntimeOwner.dispose()"), "shutdown invalidates diagnostic Promise and truth before Owner disposal");
check(main.indexOf("velaAgentRuntimeOwner.refreshActiveComposition()") !== -1 && main.indexOf("velaAgentRuntimeOwner.cancelActiveCompositionRefresh()") !== -1, "diagnostics delegates only to focused production Owner operations");
check(main.indexOf("VelaActiveCompositionDiagnostics", main.indexOf("VelaActiveCompositionDiagnostics") + 1) !== -1 && main.indexOf("CapabilityRuntime.cancel", 0) === -1, "diagnostics exposes no arbitrary Capability Runtime cancellation path");

console.log("test-vela-agent-production-lifecycle: " + assertions + " assertions passed");
