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
const planningIndex = html.indexOf("js/vela/velaPlanningContracts.js");
const driverIndex = html.indexOf("js/vela/velaAgentDriver.js");
const ownerIndex = html.indexOf("js/vela/velaAgentRuntimeOwner.js");
const mainIndex = html.indexOf("js/main.js");
check(sessionIndex !== -1 && sessionIndex < agentIndex && agentIndex < ownerIndex && ownerIndex < mainIndex, "static Agent dependencies load Session to Agent to Owner before main");
check(agentIndex < registryIndex && registryIndex < serializerIndex && serializerIndex < capabilityRuntimeIndex && capabilityRuntimeIndex < activeCompositionIndex && activeCompositionIndex < observationIndex && observationIndex < ownerIndex, "0.3.4 capability and Observation dependencies load in bounded production order");
check(planningIndex !== -1 && planningIndex < driverIndex && driverIndex < ownerIndex, "Planning contracts and AgentDriver load before the sole production Owner");
check(html.indexOf("velaAgentSurfaceProjection.js") === -1, "neutral Agent Surface adapter is not production-loaded");
check(loader.indexOf("VelaAgentRuntime") === -1 && loader.indexOf("velaAgentRuntime") === -1 && loader.indexOf("VelaSessionRuntime") === -1, "CEP module loader remains outside static Agent module loading");
check((main.match(/var velaAgentRuntimeOwner = null;/g) || []).length === 1, "main owns exactly one AgentRuntimeOwner reference");
const runtimeInitStart = main.indexOf("    function initializeVelaRuntime(");
const runtimeInitEnd = main.indexOf("    function getVelaSurfaceUiScale", runtimeInitStart);
const runtimeInit = main.slice(runtimeInitStart, runtimeInitEnd);
check(runtimeInit.indexOf("owner = initializeVelaAgentRuntimeOwner();") < runtimeInit.indexOf("transaction.candidate = window.VelaRuntime.createRuntime"), "Agent owner supplies the exact Session before Runtime construction");

const shutdownStart = main.indexOf("    function shutdownPanelRuntime() {");
const shutdownEnd = main.indexOf("    function recoverPanelRuntime()", shutdownStart);
const shutdown = main.slice(shutdownStart, shutdownEnd);
check(shutdown.indexOf("velaSurfaceController.dispose()") < shutdown.indexOf("velaAgentRuntimeOwner.dispose()"), "shutdown unsubscribes Surface before Agent owner disposal");
check(shutdown.indexOf("velaRuntimeController.dispose()") < shutdown.indexOf("velaAgentRuntimeOwner.dispose()"), "Runtime Authority Plane disposes before Agent Session ownership");

const agentReportStart = main.indexOf("    function reportVelaAgentRuntimeError(");
const agentReportEnd = main.indexOf("    function initializeVelaAgentRuntimeOwner", agentReportStart);
const agentReport = main.slice(agentReportStart, agentReportEnd);
check(agentReport.indexOf("velaAgentRuntimeLastErrorCode") !== -1, "Agent failures use separate diagnostics state");
check(agentReport.indexOf("reportVelaRuntimeError") === -1 && agentReport.indexOf("velaRuntimeLastErrorCode") === -1 && agentReport.indexOf("velaRuntimeStatusRevision") === -1, "Agent diagnostics cannot pollute existing Runtime status");
check(!/resetSession\([^)]*\)[\s\S]{0,120}velaAgentRuntimeOwner\.dispose/.test(main), "existing resetSession is not mapped to Agent disposal");
check(main.indexOf("agentProjection: velaAgentRuntimeOwner") !== -1, "Surface receives only optional current Projection from main-owned Owner");
check(main.indexOf("velaRuntimeController.getObservationReadPort()") !== -1 && main.indexOf("ownerOptions.observationReadPort = observationReadPort") !== -1, "main composition root passes the existing Runtime read-only Context port into the Agent owner");
check(main.indexOf("ownerOptions.AgentCapabilityRuntime") !== -1 && main.indexOf("ownerOptions.ActiveCompositionCapability") !== -1 && main.indexOf("ownerOptions.AgentObservationRuntime") !== -1, "main wires only the focused 0.3.4 capability dependencies");
const ownerInitStart = normalizedMain.indexOf("    function initializeVelaAgentRuntimeOwner() {");
const ownerInitEnd = normalizedMain.indexOf("    function reportVelaSurfaceInitializationError()", ownerInitStart);
const ownerInit = normalizedMain.slice(ownerInitStart, ownerInitEnd);
const factoryGuard = ownerInit.indexOf("if (window.VelaAgentCapabilityRuntime && window.VelaActiveCompositionCapability && window.VelaAgentObservationRuntime) {");
const runtimePortGuard = ownerInit.indexOf("if (velaRuntimeController && typeof velaRuntimeController.getObservationReadPort === \"function\") {");
check(factoryGuard !== -1 && runtimePortGuard > factoryGuard && ownerInit.indexOf("ownerOptions.AgentObservationRuntime = window.VelaAgentObservationRuntime;", factoryGuard) < runtimePortGuard, "cold Owner stores Observation module factories before Runtime availability is considered");
check(ownerInit.slice(factoryGuard, runtimePortGuard).indexOf("velaRuntimeController") === -1, "Observation module factory assignment does not depend on an existing Runtime controller");
check(ownerInit.indexOf("ownerOptions.observationReadPort = observationReadPort;", runtimePortGuard) > runtimePortGuard, "only the concrete Observation read port depends on Runtime availability");
check(main.indexOf("velaAgentRuntimeOwner.attachAgentDriverRuntimePort(velaRuntimeController.getAgentDriverRuntimePort())") !== -1, "main wires the narrow Runtime port into the Owner-held Driver after Runtime initialization");
check(main.indexOf("velaAgentRuntimeOwner.startObjective({ message: message") !== -1, "the production composer enters the Owner-held AgentDriver objective path");
check(!/resolveObjectiveReview|resolveReview/.test(main), "B1 exposes no production Confirmation or review resolution wiring");
const driverSource = read("client/js/vela/velaAgentDriver.js");
check(!/PlanController|ExecutionAdapter|confirmBoundPlan|executeStep|TaskRun|Host payload/.test(driverSource), "AgentDriver review contract imports no execution or Host authority owner");
check(main.indexOf("installVelaActiveCompositionDiagnostics();") !== -1 && main.indexOf("Object.defineProperty(window, \"VelaActiveCompositionDiagnostics\"") !== -1, "main permanently installs the bounded Active Composition diagnostics surface");
check(main.indexOf("diagnostics = Object.freeze({ refresh: refreshActiveCompositionDiagnostics, cancel: cancelActiveCompositionDiagnostics, getState: activeCompositionDiagnosticsState })") !== -1, "diagnostics global exposes only refresh, cancel, and getState");
check(main.indexOf("window.velaAgentRuntimeOwner") === -1 && main.indexOf("window.velaRuntimeController") === -1, "diagnostics preserves lexical production Runtime and Owner ownership");
const ownerCommitStart = main.indexOf("            velaAgentRuntimeOwner = owner;");
check(ownerCommitStart !== -1 && main.indexOf("            resetActiveCompositionDiagnostics();", ownerCommitStart) > ownerCommitStart, "cold/new Owner commit resets diagnostics before exposing new Observation truth");
check(shutdown.indexOf("resetActiveCompositionDiagnostics()") !== -1 && shutdown.indexOf("resetActiveCompositionDiagnostics()") < shutdown.indexOf("velaAgentRuntimeOwner.dispose()"), "shutdown invalidates diagnostic Promise and truth before Owner disposal");
check(main.indexOf("velaAgentRuntimeOwner.refreshActiveComposition()") !== -1 && main.indexOf("velaAgentRuntimeOwner.cancelActiveCompositionRefresh()") !== -1, "diagnostics delegates only to focused production Owner operations");
check(main.indexOf("VelaActiveCompositionDiagnostics", main.indexOf("VelaActiveCompositionDiagnostics") + 1) !== -1 && main.indexOf("CapabilityRuntime.cancel", 0) === -1, "diagnostics exposes no arbitrary Capability Runtime cancellation path");

console.log("test-vela-agent-production-lifecycle: " + assertions + " assertions passed");
