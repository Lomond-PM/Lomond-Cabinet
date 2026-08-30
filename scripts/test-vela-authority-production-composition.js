#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const main = read("client/js/main.js");
const index = read("client/index.html");
const loader = read("client/js/vela/velaCepModuleLoader.js");
const runtime = read("client/js/vela/velaRuntime.js");
const router = read("client/js/vela/velaProviderProposalRouter.js");
const surface = read("client/js/vela/velaSurfaceController.js");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }

const authorityFiles = ["velaDelegationGrantStore.js", "velaDelegationPolicyEngine.js", "velaAuthorityEvidenceResolver.js", "velaDelegationAuthorityCoordinator.js", "velaAuthorizedPlanAuthorityProducer.js", "velaAuthorityActivationGate.js", "velaAtomicActivationCoordinator.js"];
authorityFiles.forEach((file) => check(loader.indexOf(file) !== -1, "production loader includes " + file));
check(authorityFiles.every((file) => index.indexOf(file) === -1), "Authority modules have no duplicate direct script tags");
check(loader.indexOf("velaAtomicActivationCoordinator.js") < loader.indexOf("velaRuntime.js"), "Runtime is loaded after the complete Authority graph");
check(main.indexOf("exactAgentSession: exactAgentSession") !== -1 && main.indexOf("owner = initializeVelaAgentRuntimeOwner();") !== -1, "main passes only the exact owner Session into Runtime composition");
check(!/DelegationGrantStore|DelegationPolicyEngine|AuthorityEvidenceResolver|DelegationAuthorityCoordinator|AuthorizedPlanAuthorityProducer|AuthorityActivationGate|AtomicActivationCoordinator/.test(main), "main owns no raw Authority Plane component");
check(!/issueGrant|revokeGrant|produceAuthorized|reserveActivation|activateDelegated|runDelegated|grantSpec/.test(main + surface + router), "production orchestration and Surface expose no generic grant spec or raw delegated activation path");
check(router.indexOf("DelegationPolicyEngine") === -1 && router.indexOf("policyEngine") === -1, "ProviderProposalRouter remains disconnected from DelegationPolicyEngine");
check(runtime.indexOf("providerProposalRouter = proposalRouterModule.createProposalRouter") !== -1 && runtime.indexOf("providerProposalRouter.review()") !== -1, "Provider proposals retain the existing review router");
check(runtime.indexOf("grantNextOpacityMutation") !== -1 && runtime.indexOf("revokeOpacityDelegation") !== -1 && runtime.indexOf("getAuthorityProjection") !== -1 && runtime.indexOf("getAuthorityDiagnostics") !== -1, "Runtime exposes only the fixed pilot operations plus bounded Authority observation seams");
check(!/getGrantStore|getPolicyEngine|getEvidenceResolver|getAuthorityCoordinator|getAuthorityProducer|getActivationGate|getAtomicCoordinator/.test(runtime), "Runtime facade exposes no raw Authority dependency getter");
check(surface.indexOf("vela.surfaceGrantOpacityConsent") !== -1 && surface.indexOf("vela.surfaceRevokeOpacityConsent") !== -1, "Surface contains the explicit one-shot consent and revoke action");
check(read("VERSION").trim() === "0.3.5", "H2 does not change VERSION");

console.log("test-vela-authority-production-composition: " + assertions + " assertions passed.");
