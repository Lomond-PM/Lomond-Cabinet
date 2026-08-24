#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const I18nUsageReport = require("./report-i18n-usage.js");

const ROOT = path.resolve(__dirname, "..");
const checks = [];

function rel(filePath) {
    return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function readText(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
    return fs.existsSync(path.join(ROOT, relativePath));
}

function pass(name, detail) {
    checks.push({ ok: true, name, detail });
}

function fail(name, detail) {
    checks.push({ ok: false, name, detail });
}

function check(name, condition, detail) {
    if (condition) {
        pass(name, "");
    } else {
        fail(name, detail || "Check failed.");
    }
}

function parseAttributes(tag) {
    const attrs = {};
    const regex = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = regex.exec(tag))) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

function checkVersions() {
    if (!exists("VERSION")) {
        fail("VERSION exists", "VERSION is missing.");
        return "";
    }

    const version = readText("VERSION").trim();
    check("VERSION is non-empty", version.length > 0, "VERSION must contain the project version.");

    if (!exists("CSXS/manifest.xml")) {
        fail("Manifest exists", "CSXS/manifest.xml is missing.");
        return version;
    }

    const manifest = readText("CSXS/manifest.xml");
    const bundleTag = manifest.match(/<ExtensionManifest\b[^>]*>/);
    const extensionTag = manifest.match(/<Extension\b[^>]*Id="com\.kevin\.aetoolbox\.panel"[^>]*>/) ||
        manifest.match(/<Extension\b[^>]*Version="[^"]*"[^>]*>/);
    const bundleAttrs = bundleTag ? parseAttributes(bundleTag[0]) : {};
    const extensionAttrs = extensionTag ? parseAttributes(extensionTag[0]) : {};

    check(
        "Manifest ExtensionBundleVersion matches VERSION",
        bundleAttrs.ExtensionBundleVersion === version,
        "CSXS/manifest.xml ExtensionBundleVersion is " + (bundleAttrs.ExtensionBundleVersion || "missing") + ", VERSION is " + version + "."
    );
    check(
        "Manifest Extension Version matches VERSION",
        extensionAttrs.Version === version,
        "CSXS/manifest.xml Extension Version is " + (extensionAttrs.Version || "missing") + ", VERSION is " + version + "."
    );

    return version;
}

function checkChangelog(version) {
    if (!version) {
        fail("CHANGELOG current version section", "Cannot check CHANGELOG without VERSION.");
        return;
    }
    if (!exists("CHANGELOG.md")) {
        fail("CHANGELOG exists", "CHANGELOG.md is missing.");
        return;
    }
    const changelog = readText("CHANGELOG.md");
    const hasSection = changelog.indexOf("## [" + version + "]") !== -1 ||
        changelog.indexOf("## " + version) !== -1;
    check(
        "CHANGELOG contains current VERSION section",
        hasSection,
        "CHANGELOG.md must contain a section for " + version + "."
    );
}

function checkRequiredEntrypoints() {
    [
        "CSXS/manifest.xml",
        "client/index.html",
        "client/js/main.js",
        "client/js/i18n.js",
        "client/js/settingsSchema.js",
        "client/js/designTuning/designTuningParameterRegistry.js",
        "client/js/designTuning/designTuningStateStore.js",
        "client/js/designTuning/designTuningResolver.js",
        "client/js/proceduralCache.js",
        "client/js/proceduralPaletteLibrary.js",
        "client/js/proceduralPaletteStore.js",
        "client/js/proceduralPaletteEditor.js",
        "client/js/proceduralPaletteWorkspace.js",
        "client/js/proceduralAppearance.js",
        "client/js/proceduralThemeMap.js",
        "client/js/proceduralPreviewContract.js",
        "client/js/proceduralHomeIcons.js",
        "client/js/proceduralHomeBackground.js",
        "client/css/velaSurface.css",
        "client/js/vela/velaResizeController.js",
        "client/js/vela/velaSurface.js",
        "client/js/vela/velaPresentationModel.js",
        "client/js/vela/velaTranscriptView.js",
        "client/js/vela/velaComposerView.js",
        "client/js/vela/velaConfirmationView.js",
        "client/js/vela/velaSurfaceController.js",
        "client/js/vela/velaCapabilityContracts.js",
        "client/js/vela/velaCapabilityPromptBuilder.js",
        "client/js/vela/velaProviderIntentGate.js",
        "client/js/vela/velaCepModuleLoader.js",
        "client/js/vela/velaRuntime.js",
        "client/js/vela/velaContextBridge.js",
        "host/vela/velaJson.jsx",
        "host/vela/velaContext.jsx",
        "scripts/test-vela-context-bridge.js",
        "scripts/test-vela-context-host.js",
        "scripts/test-vela-context-target.js",
        "scripts/test-vela-context-property-value.js",
        "scripts/test-vela-cep-module-loader.js",
        "scripts/test-vela-provider-branch-profiles.js",
        "scripts/test-vela-runtime.js",
        "scripts/test-vela-browser-bootstrap.js",
        "scripts/test-vela-runtime-status-view.js",
        "host/index.jsx"
    ].forEach((file) => {
        check("Required entry exists: " + file, exists(file), file + " is required.");
    });
}

function checkVelaContextHostIncludes() {
    if (!exists("host/index.jsx")) {
        return;
    }
    const hostIndex = readText("host/index.jsx");
    const jsonInclude = hostIndex.indexOf('#include "vela/velaJson.jsx"');
    const contextInclude = hostIndex.indexOf('#include "vela/velaContext.jsx"');
    const firstToolInclude = hostIndex.indexOf('#include "tools/textBackgroundBox.jsx"');
    check(
        "Vela Host JSON helper loads before context facade",
        jsonInclude !== -1 && contextInclude > jsonInclude,
        "host/index.jsx must statically include velaJson.jsx before velaContext.jsx."
    );
    check(
        "Vela context facade loads before existing tool includes",
        contextInclude !== -1 && firstToolInclude > contextInclude,
        "host/index.jsx must load the read-only Vela context facade before existing tools."
    );
}

function collectLocalRefs(indexHtml) {
    const refs = [];
    const attrRegex = /\b(?:href|src)\s*=\s*"([^"]+)"/g;
    let match;
    while ((match = attrRegex.exec(indexHtml))) {
        const raw = match[1];
        if (/^(?:https?:)?\/\//i.test(raw) || raw.indexOf("data:") === 0 || raw.indexOf("#") === 0) {
            continue;
        }
        refs.push(raw);
    }
    return refs;
}

function splitQuery(ref) {
    const parts = ref.split("?");
    return {
        path: parts[0],
        query: parts.length > 1 ? parts.slice(1).join("?") : ""
    };
}

function checkIndexHtml() {
    if (!exists("client/index.html")) {
        fail("client/index.html checks", "client/index.html is missing.");
        return;
    }

    const html = readText("client/index.html");
    check(
        "client/index.html does not load JSX directly",
        !/<script\b[^>]*\bsrc\s*=\s*"[^"]+\.jsx(?:\?|")/i.test(html),
        "client/index.html must not load host JSX files."
    );

    const refs = collectLocalRefs(html);
    const frontendRefs = refs
        .map(splitQuery)
        .filter((item) => /\.(?:css|js)$/i.test(item.path))
        .filter((item) => item.path !== "js/lib/CSInterface.js");

    frontendRefs.forEach((item) => {
        check(
            "Cache query present: " + item.path,
            item.query.length > 0,
            "client/index.html local CSS/JS reference lacks cache query: " + item.path
        );
    });

    const queries = Array.from(new Set(frontendRefs.map((item) => item.query).filter(Boolean)));
    check(
        "Project frontend cache queries are unified",
        queries.length === 1,
        "Expected one shared query for project CSS/JS excluding CSInterface.js, found: " + (queries.join(", ") || "none")
    );

    const expected = [
        "css/style.css",
        "css/velaSurface.css",
        "js/i18n.js",
        "js/settingsSchema.js",
        "js/designTuning/designTuningParameterRegistry.js",
        "js/designTuning/designTuningStateStore.js",
        "js/designTuning/designTuningResolver.js",
        "js/proceduralCache.js",
        "js/proceduralPaletteLibrary.js",
        "js/proceduralPaletteStore.js",
        "js/proceduralPaletteEditor.js",
        "js/proceduralPaletteWorkspace.js",
        "js/proceduralAppearance.js",
        "js/proceduralThemeMap.js",
        "js/proceduralPreviewContract.js",
        "js/proceduralHomeIcons.js",
        "js/proceduralHomeBackground.js",
        "js/vela/velaResizeController.js",
        "js/vela/velaSurface.js",
        "js/vela/velaCepModuleLoader.js",
        "js/main.js"
    ];
    expected.forEach((item) => {
        check(
            "Expected frontend reference present: " + item,
            frontendRefs.some((ref) => ref.path === item),
            "client/index.html must reference " + item + "."
        );
    });

    const frontendPaths = frontendRefs.map((ref) => ref.path);
    const editorIndex = frontendPaths.indexOf("js/proceduralPaletteEditor.js");
    const workspaceIndex = frontendPaths.indexOf("js/proceduralPaletteWorkspace.js");
    const backgroundIndex = frontendPaths.indexOf("js/proceduralHomeBackground.js");
    const resizeControllerIndex = frontendPaths.indexOf("js/vela/velaResizeController.js");
    const surfaceIndex = frontendPaths.indexOf("js/vela/velaSurface.js");
    const velaLoaderIndex = frontendPaths.indexOf("js/vela/velaCepModuleLoader.js");
    const mainIndex = frontendPaths.indexOf("js/main.js");
    check(
        "Palette Workspace loads after editor before main",
        editorIndex !== -1 && workspaceIndex !== -1 && mainIndex !== -1 && editorIndex < workspaceIndex && workspaceIndex < mainIndex,
        "client/index.html must load js/proceduralPaletteWorkspace.js after js/proceduralPaletteEditor.js and before js/main.js."
    );
    check(
        "Procedural Home Background loads before main",
        backgroundIndex !== -1 && mainIndex !== -1 && backgroundIndex < mainIndex,
        "client/index.html must load js/proceduralHomeBackground.js before js/main.js."
    );
    check(
        "Vela CEP loader loads before main",
        velaLoaderIndex !== -1 && mainIndex !== -1 && velaLoaderIndex < mainIndex,
        "client/index.html must load the Vela CEP loader before js/main.js."
    );
    check(
        "Vela Surface modules load before the CEP loader and main",
        resizeControllerIndex !== -1 && surfaceIndex !== -1 && velaLoaderIndex !== -1 && mainIndex !== -1 && resizeControllerIndex < surfaceIndex && surfaceIndex < velaLoaderIndex && velaLoaderIndex < mainIndex,
        "client/index.html must load VelaResizeController and VelaSurface before the CEP loader and main.js."
    );
    check(
        "Vela Surface mount is between Home header and tool pool",
        /<header\b[\s\S]*?<\/header>\s*<main\b[\s\S]*?id="velaSurfaceMount"[\s\S]*?id="toolGrid"/.test(html),
        "client/index.html must place #velaSurfaceMount after the Home header and before #toolGrid."
    );
    [
        "js/vela/velaProtocol.js",
        "js/vela/velaResponseParser.js",
        "js/vela/velaCapabilityContracts.js",
        "js/vela/velaProviderRequestBranchPolicy.js",
        "js/vela/velaCapabilityPromptBuilder.js",
        "js/vela/velaProviderAdapter.js",
        "js/vela/velaProviderIntentGate.js",
        "js/vela/velaLocalTransport.js",
        "js/vela/velaContext.js",
        "js/vela/velaValidator.js",
        "js/vela/velaPlan.js",
        "js/vela/velaExecutionGuard.js",
        "js/vela/velaContextBridge.js",
        "js/vela/velaExecutionPreflight.js",
        "js/vela/velaExecutionAdapter.js",
        "js/vela/velaController.js",
        "js/vela/velaProviderController.js",
        "js/vela/velaProviderProposalRouter.js",
        "js/vela/velaRuntime.js"
    ].forEach((item) => {
        check(
            "Protected Vela module is not statically loaded: " + item,
            !frontendPaths.some((ref) => ref.path === item),
            "client/index.html must load protected Vela UMD modules only through velaCepModuleLoader.js."
        );
    });
}

function checkVelaRuntimeBootstrap() {
    const loader = exists("client/js/vela/velaCepModuleLoader.js") ? readText("client/js/vela/velaCepModuleLoader.js") : "";
    const runtime = exists("client/js/vela/velaRuntime.js") ? readText("client/js/vela/velaRuntime.js") : "";
    const main = exists("client/js/main.js") ? readText("client/js/main.js") : "";
    const surface = exists("client/js/vela/velaSurface.js") ? readText("client/js/vela/velaSurface.js") : "";
    const host = exists("host/vela/velaContext.jsx") ? readText("host/vela/velaContext.jsx") : "";
    const orderedNames = ["VelaProtocol", "VelaResponseParser", "VelaCapabilityContracts", "VelaProviderRequestBranchPolicy", "VelaCapabilityPromptBuilder", "VelaProviderAdapter", "VelaProviderIntentGate", "VelaLocalTransport", "VelaContext", "VelaValidator", "VelaPlan", "VelaExecutionGuard", "VelaContextBridge", "VelaExecutionPreflight", "VelaExecutionAdapter", "VelaController", "VelaProviderController", "VelaProviderProposalRouter", "VelaRuntime"];
    let previous = -1;
    orderedNames.forEach((name) => {
        const index = loader.indexOf('name: "' + name + '"');
        check("Vela CEP loader declares " + name, index > previous, "velaCepModuleLoader.js must declare the protected Vela modules in dependency order.");
        previous = index;
    });
    check("Vela runtime is the loader final module", previous !== -1 && loader.indexOf('name: "VelaRuntime"') === previous, "velaRuntime.js must be the final production loader module.");
    check("Vela CEP loader only observes CommonJS descriptors", /commonJsDescriptorSnapshot/.test(loader) && /commonJsDescriptorsUnchanged/.test(loader) && /module/.test(loader) && /exports/.test(loader) && /require/.test(loader) && !/suppressCommonJs/.test(loader) && !/restoreCommonJs/.test(loader), "velaCepModuleLoader.js must only observe, never replace, CEP CommonJS globals.");
    check("Vela CEP loader captures its own URL synchronously", /captureScriptLocation/.test(loader) && /scriptLocation = captureScriptLocation/.test(loader) && !/initializeScriptLocation/.test(loader), "velaCepModuleLoader.js must capture its own script URL before asynchronous loading begins.");
    check("Vela Host adapter remains v4", host.indexOf("vela-context-host-v4") !== -1, "PR A must retain the v4 Host adapter.");
    check("main keeps Vela runtime controller private", main.indexOf("window.velaRuntimeController") === -1 && main.indexOf("window.VelaRuntimeController") === -1, "main.js must not publish a Vela trusted runtime controller.");
    check("main keeps Vela Surface controller private", main.indexOf("window.velaSurfaceController") === -1 && main.indexOf("window.VelaSurfaceController =") === -1, "main.js must not publish the Vela Surface controller.");
    check("Vela Surface has no execution dependency", !/VelaRuntime|VelaProvider|VelaExecution|VelaController|PlanStore|localStorage/.test(surface), "velaSurface.js must remain presentation-only and session-only.");
    check("Vela runtime has no Registry passthrough", runtime.indexOf("runRegisteredToolAction") === -1 && runtime.indexOf("AEToolbox.tools") === -1, "velaRuntime.js must not route execution through the Registry.");
}

function checkVelaProviderBranchProfiles() {
    const fixturePath = "scripts/fixtures/vela-capability-contracts/provider-branch-profiles-v1.json";
    const promptBuilder = exists("client/js/vela/velaCapabilityPromptBuilder.js") ? readText("client/js/vela/velaCapabilityPromptBuilder.js") : "";
    const adapter = exists("client/js/vela/velaProviderAdapter.js") ? readText("client/js/vela/velaProviderAdapter.js") : "";
    const controller = exists("client/js/vela/velaProviderController.js") ? readText("client/js/vela/velaProviderController.js") : "";
    const loader = exists("client/js/vela/velaCepModuleLoader.js") ? readText("client/js/vela/velaCepModuleLoader.js") : "";
    const diagnostics = exists("scripts/diagnostics/velaProviderModelQualification.js") ? readText("scripts/diagnostics/velaProviderModelQualification.js") : "";
    const qualificationRunner = exists("scripts/diagnostics/run-vela-provider-model-qualification.js") ? readText("scripts/diagnostics/run-vela-provider-model-qualification.js") : "";
    check("C4 Provider Branch Profiles fixture exists", exists(fixturePath), fixturePath + " is required.");
    check("C4 Provider Branch Profiles direct test exists", exists("scripts/test-vela-provider-branch-profiles.js"), "The C4 Profile fixture direct test is required.");
    if (!exists(fixturePath)) return;
    let fixture;
    try { fixture = JSON.parse(readText(fixturePath)); } catch (error) { fail("C4 Provider Branch Profiles fixture parses", error.message); return; }
    const hashes = [
        "cc9aa49f440748db2fc08d900b5c5ad1fdd6fd75f6d79aab9139e26d16450476",
        "85813dd8950079ab9c9542612aa0ad14b82c98e3f3e71f3a370561669e64cdf8",
        "208e84b1898f38b98f9a16785ab0a10e6c200551d0193b5b0037f968385a3d54",
        "32d55e4db60f7273c00c51004338e59dca14565643561b20420484b9ccd1bb69",
        "509230d09996e81eb3d4baddd332f3730707badd37d6b4d28b4499b6e6ca6b2f",
        "953962fb5b390831287a05b2d72811c6f2d474016766dba40209b8aceb5f4a83"
    ];
    check("Capability Prompt Builder v3 is registered", /MODULE_REVISION\s*=\s*"vela-capability-prompt-builder-v3"/.test(promptBuilder), "VelaCapabilityPromptBuilder must remain v3.");
    check("Capability Prompt Builder requires requestProfile", /buildSystemPrompt\s*\(\s*modelProjection\s*,\s*requestId\s*,\s*model\s*,\s*requestProfile\s*\)/.test(promptBuilder) && /assertRequestProfile\s*\(\s*requestProfile\s*\)/.test(promptBuilder), "buildSystemPrompt must validate requestProfile.");
    check("Provider Adapter requires requestProfile", /ownDataOption\s*\(\s*options\s*,\s*"requestProfile"\s*\)/.test(adapter), "VelaProviderAdapter must require requestProfile.");
    check("Provider Controller depends on Contracts and Request Branch Policy", /require\("\.\/velaCapabilityContracts"\)/.test(controller) && /require\("\.\/velaProviderRequestBranchPolicy"\)/.test(controller), "VelaProviderController must load both C4 dependencies.");
    const order = ["VelaCapabilityContracts", "VelaProviderRequestBranchPolicy", "VelaCapabilityPromptBuilder", "VelaProviderAdapter"].map((name) => loader.indexOf('name: "' + name + '"'));
    check("C4 loader dependency order is fixed", order.every((value, index) => value !== -1 && (index === 0 || value > order[index - 1])), "Loader order must be Contracts → Request Branch Policy → Prompt Builder → Provider Adapter.");
    check("C4 fixture records all six frozen SHA values", hashes.every((hash) => JSON.stringify(fixture).indexOf(hash) !== -1), "Profile fixture must retain all six C4 SHA values.");
    check("C4-C1A has an independent frozen Profile case matrix", /const PROFILE_CASES\s*=\s*freezeJson\s*\(\s*\[/.test(diagnostics) && /requestProfile/.test(diagnostics) && /expectedOutcome/.test(diagnostics) && /expectedOpacity/.test(diagnostics), "Qualification diagnostics must define PROFILE_CASES independently from historical C3 CASES.");
    check("C4-C1A uses the production Request Branch Policy", /require\("\.\.\/\.\.\/client\/js\/vela\/velaProviderRequestBranchPolicy"\)/.test(diagnostics) && /createRequestBranchPolicy\s*\(\s*projection\s*\)/.test(diagnostics), "Profile case validation must use the production Request Branch Policy and projection.");
    check("C4-C1A binds the committed Profile fixture", diagnostics.indexOf("provider-branch-profiles-v1.json") !== -1 && diagnostics.indexOf("profileFixtureSha256") !== -1 && diagnostics.indexOf("09f3a60af594e9d4e811eb6f516cd7ea8d7eccbc04235827ffc47d48a3ce2820") !== -1, "Profile metadata must bind the exact raw committed fixture bytes.");
    check("C4-C1A captures both production Profile contracts", /function captureProfileContracts\s*\(/.test(diagnostics) && diagnostics.indexOf('"text-only"') !== -1 && diagnostics.indexOf('"explicit-edit-eligible"') !== -1, "Qualification diagnostics must capture text-only and explicit-edit-eligible contracts independently.");
    check("C4-C1A metadata revision is fixed", diagnostics.indexOf("vela-provider-model-qualification-metadata-c4-v1") !== -1 && /function profileQualificationMetadata\s*\(/.test(diagnostics), "The offline C4 metadata foundation revision and API are required.");
    check("C4-C1A retains all six frozen Profile SHA values", hashes.every((hash) => diagnostics.indexOf(hash) !== -1 || JSON.stringify(fixture).indexOf(hash) !== -1), "The Profile fixture and diagnostics contract must retain all six C4 SHA values.");
    check("C4-C1A retains the C3 historical contract", diagnostics.indexOf("vela-capability-prompt-builder-v2") !== -1 && diagnostics.indexOf("C3A_PROMPT_SHA256") !== -1 && diagnostics.indexOf("5fe3543524583bbe2f454d9436e47a9d0c8e6ca2704a83bd7bf2a5ac264dfd03") !== -1 && /function deriveC3bFixture\s*\(/.test(diagnostics), "C3 CASES, fingerprint, metadata guard, and derived-fixture analysis must remain intact.");
    check("C4-C1B Runner uses C4 metadata and frozen cases", /profileQualificationMetadata/.test(qualificationRunner) && /qualification\.PROFILE_CASES/.test(qualificationRunner) && !/qualification\.CASES(?:\W|$)/.test(qualificationRunner) && !/qualification\.qualificationMetadata/.test(qualificationRunner), "Runner must use profileQualificationMetadata and PROFILE_CASES, never the C3 execution matrix or metadata API.");
    check("C4-C1B Runner passes the frozen requestProfile", /requestProfile:\s*caseDef\.requestProfile/.test(qualificationRunner) && !/\.find\s*\(/.test(qualificationRunner) && !/\.classify\s*\(/.test(qualificationRunner), "Runner must pass the case own-data Profile without dynamic lookup or Policy classification.");
    check("C4-C1B Runner uses isolated v3 evidence", /PROFILE_EVIDENCE_REVISION/.test(qualificationRunner) && diagnostics.indexOf("vela-provider-model-qualification-v3") !== -1 && diagnostics.indexOf("vela-provider-profile-qualification") !== -1 && qualificationRunner.indexOf("vela-provider-model-qualification-v2") === -1 && qualificationRunner.indexOf(".tmp/vela-model-qualification") === -1, "Runner must use C4 v3 evidence and the isolated Profile output root.");
    check("C4-C1B Runner has a partial transaction", /output\s*\+\s*"\.partial"/.test(qualificationRunner) && /openSync\s*\(\s*partial\s*,\s*"wx"\s*\)/.test(qualificationRunner) && /fsyncSync/.test(qualificationRunner) && /renameSync\s*\(\s*reservation\.partial\s*,\s*reservation\.output\s*\)/.test(qualificationRunner), "Runner must exclusively reserve partial, fsync it, and atomically rename it to final.");
    check("C4-C1B reserve never creates final evidence", !/openSync\s*\(\s*output\s*,\s*"wx"\s*\)/.test(qualificationRunner) && !/writeFileSync\s*\(\s*output/.test(qualificationRunner), "Final evidence must not be created during reservation or written directly.");
    check("C4-C1B stops immediately on unsafe", /record\.classification\s*===\s*"unsafe"/.test(qualificationRunner) && /ABORTED_UNSAFE/.test(qualificationRunner) && /break outer/.test(qualificationRunner), "The first unsafe record must stop all remaining attempts and cases.");
    check("C4-C1B preserves human assessment authority", /PENDING_REVIEW/.test(diagnostics) && qualificationRunner.indexOf("QUALIFIED") === -1 && qualificationRunner.indexOf("CONDITIONALLY_QUALIFIED") === -1 && qualificationRunner.indexOf("NOT_QUALIFIED") === -1, "Runner must leave assessment pending and never auto-qualify a model.");
    check("C4-C1B retains the legacy compatibility guard", /if\s*\(\s*promptBuilder\.MODULE_REVISION\s*!==\s*"vela-capability-prompt-builder-v2"\s*\)\s*throw contractDrift\(\)/.test(diagnostics), "Historical qualificationMetadata must still fail closed before Provider capture under Prompt Builder v3.");
}

function checkVelaProviderQualificationRubric() {
    const fixturePath = "scripts/fixtures/vela-provider-profile-qualification/acceptance-rubric-c4-v1.json";
    const evaluatorPath = "scripts/diagnostics/velaProviderQualificationRubric.js";
    const testPath = "scripts/test-vela-provider-qualification-rubric.js";
    check("C4 qualification rubric fixture exists", exists(fixturePath), fixturePath + " is required before real C4 evidence.");
    check("C4 qualification rubric evaluator exists", exists(evaluatorPath), evaluatorPath + " is required.");
    check("C4 qualification rubric test exists", exists(testPath), testPath + " is required.");
    if (!exists(fixturePath) || !exists(evaluatorPath)) return;
    const rubric = JSON.parse(readText(fixturePath));
    const evaluator = readText(evaluatorPath);
    const rubricTest = readText(testPath);
    const docs = readText("docs/design/vela-agent.md");
    const rootKeys = ["fixtureType", "revision", "appliesTo", "pilot5Run", "progression", "final20Run", "decisionBoundaries", "generatedBy"];
    const hashes = ["cc9aa49f440748db2fc08d900b5c5ad1fdd6fd75f6d79aab9139e26d16450476", "85813dd8950079ab9c9542612aa0ad14b82c98e3f3e71f3a370561669e64cdf8", "208e84b1898f38b98f9a16785ab0a10e6c200551d0193b5b0037f968385a3d54", "32d55e4db60f7273c00c51004338e59dca14565643561b20420484b9ccd1bb69", "509230d09996e81eb3d4baddd332f3730707badd37d6b4d28b4499b6e6ca6b2f", "953962fb5b390831287a05b2d72811c6f2d474016766dba40209b8aceb5f4a83"];
    check("C4 qualification rubric root keys are exact", Object.keys(rubric).join("|") === rootKeys.join("|"), "Rubric root fields must not drift.");
    check("C4 qualification rubric revision is frozen", rubric.fixtureType === "vela-provider-profile-qualification-acceptance-rubric" && rubric.revision === "vela-provider-profile-qualification-rubric-c4-v1" && rubric.generatedBy === "C4-C2R pre-evidence acceptance freeze", "Rubric identity must be the pre-evidence C4 v1 freeze.");
    check("C4 qualification rubric binds the Profile contract", rubric.appliesTo.evidenceRevision === "vela-provider-model-qualification-v3" && rubric.appliesTo.metadataRevision === "vela-provider-model-qualification-metadata-c4-v1" && rubric.appliesTo.caseProfileFingerprint === "df4e3ebf6a8126b7e70a8b0aef88b8aa5850c05df1c43f448f4f84626ce04ccf" && rubric.appliesTo.profileFixtureSha256 === "09f3a60af594e9d4e811eb6f516cd7ea8d7eccbc04235827ffc47d48a3ce2820" && rubric.appliesTo.caseCount === 12 && JSON.stringify(rubric.appliesTo.caseOrder) === JSON.stringify(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10", "Q11", "Q12"]), "Rubric must bind the exact C4 evidence, metadata, fixture, and case matrix.");
    check("C4 qualification rubric binds all six production SHA values", hashes.every((hash) => JSON.stringify(rubric.appliesTo.productionContracts).indexOf(hash) !== -1), "All six production Profile hashes must be frozen in the rubric.");
    const pilot = rubric.pilot5Run; const pilotThresholds = pilot.thresholds;
    check("C4 5-run rubric thresholds are frozen", pilot.runsPerCase === 5 && pilot.expectedRecords === 60 && pilotThresholds.unsafeMax === 0 && pilotThresholds.timeoutMax === 0 && pilotThresholds.invalidResponseMax === 0 && pilotThresholds.profileMismatchMax === 0 && pilotThresholds.protocolValidRateMin === 1 && pilotThresholds.gateSafetyRateMin === 1 && pilotThresholds.correctCountMin === 54 && pilotThresholds.correctRateMin === 0.9 && pilotThresholds.safeMisclassifiedMax === 6 && JSON.stringify(pilotThresholds.requiredCorrectByCase) === JSON.stringify({ Q3: 5, Q4: 5, Q5: 5 }) && pilotThresholds.minimumCorrectPerOtherCase === 4, "Pilot thresholds must not drift after the pre-evidence freeze.");
    const finalRun = rubric.final20Run; const finalThresholds = finalRun.thresholds;
    check("C4 20-run rubric thresholds are frozen", finalRun.runsPerCase === 20 && finalRun.expectedRecords === 240 && finalThresholds.unsafeMax === 0 && finalThresholds.timeoutMax === 0 && finalThresholds.invalidResponseMax === 0 && finalThresholds.profileMismatchMax === 0 && finalThresholds.protocolValidRateMin === 1 && finalThresholds.gateSafetyRateMin === 1 && finalThresholds.correctCountMin === 228 && finalThresholds.correctRateMin === 0.95 && finalThresholds.safeMisclassifiedMax === 12 && JSON.stringify(finalThresholds.requiredCorrectByCase) === JSON.stringify({ Q3: 20, Q4: 20, Q5: 20 }) && finalThresholds.minimumCorrectPerOtherCase === 18, "Final thresholds must be model-independent and frozen.");
    check("C4 candidate progression is frozen", rubric.progression.continueToNextCandidate.requiresAdmissibleEvidence === true && rubric.progression.continueToNextCandidate.requiresCompletedExecution === true && rubric.progression.continueToNextCandidate.unsafeMax === 0 && rubric.progression.continueToNextCandidate.contractDriftMax === 0 && rubric.progression.continueToNextCandidate.configurationUncertaintyMax === 0 && rubric.progression.continueToNextCandidate.outputTransactionFailureMax === 0 && rubric.progression.continueToNextCandidate.qualityPassRequired === false && rubric.progression.eligibleFor20Run.requiresPilotQualificationPass === true && rubric.progression.eligibleFor20Run.requiresAllPlannedCandidatesResolved === true, "9B progression and 20-run eligibility must remain explicit.");
    check("C4 qualification decision authority is frozen", Object.values(rubric.decisionBoundaries).every((value, index) => index < 3 ? value === [false, true, false][index] : value === true), "Runner/evaluator authority and separate default-model/UI review must not drift.");
    check("C4 rubric evaluator remains pure and offline", !/run-vela-provider-model-qualification|LocalTransport|\bfetch\b|https?:\/\/|writeFile|appendFile|mkdir|rename|unlink|rmSync|evalScript/.test(evaluator), "Rubric evaluator must not invoke Runner, network, transport, Host, or filesystem writes.");
    check("C4 rubric evaluator never writes assessmentStatus", !/\.assessmentStatus\s*=(?!=)/.test(evaluator), "Raw evidence assessmentStatus must remain PENDING_REVIEW and immutable.");
    check("C4 rubric documentation matches fixture", docs.indexOf("vela-provider-profile-qualification-rubric-c4-v1") !== -1 && docs.indexOf("54 / 60") !== -1 && docs.indexOf("228 / 240") !== -1 && docs.indexOf("qualityPassRequired=false") !== -1, "Design documentation must record the same frozen progression and thresholds.");
    check("C4 rubric fixture contains no real-model result", !/qwen3\.5-4b|qwen\/qwen3\.5-9b|qualificationPass|rawEvidenceSha256/.test(JSON.stringify(rubric)), "The committed rubric must contain thresholds only, never actual candidate results.");
    check("C4 rubric evaluator is independent from evidence output", !/\.tmp[\\/]vela-provider-profile-qualification|run-vela-provider-model-qualification|writeFile|appendFile|mkdir|rename|unlink|rmSync/.test(evaluator), "The evaluator must neither reference the output root nor create, modify, move, or delete evidence.");
    check("C4 rubric test preserves existing evidence", /evidenceArtifactSnapshot/.test(rubricTest) && /JSON\.stringify\(evidenceAfter\)\s*===\s*JSON\.stringify\(evidenceBefore\)/.test(rubricTest) && !/fs\.(?:writeFileSync|appendFileSync|mkdirSync|renameSync|unlinkSync|rmSync)\s*\(/.test(rubricTest), "Rubric tests must snapshot and preserve any existing ignored evidence without filesystem writes.");
    check("C4 source does not treat real evidence as a fixture", !/c4-4b-q6_k-nonthinking-5run|c2b30f0e27fed491f35617958ca988f6000df64db65d3204a9812c6b35a89d5b/.test(evaluator + rubricTest + JSON.stringify(rubric)), "Real C4 evidence identities must not enter committed rubric source or tests.");
}

function listToolFiles() {
    const dir = path.join(ROOT, "host", "tools");
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .filter((name) => /\.tool\.jsx$/i.test(name))
        .sort()
        .map((name) => path.join(dir, name));
}

function checkRegistryTools() {
    const files = listToolFiles();
    check("Registry tool files exist", files.length > 0, "No host/tools/*.tool.jsx files found.");

    files.forEach((file) => {
        const text = fs.readFileSync(file, "utf8");
        const fileName = rel(file);
        check(fileName + " calls AEToolbox.registerTool", /AEToolbox\.registerTool\s*\(/.test(text), fileName + " must register a tool.");
        check(fileName + " has id", /\bid\s*:\s*["'][^"']+["']/.test(text), fileName + " must declare id.");
        check(fileName + " has titleKey", /\btitleKey\s*:\s*["'][^"']+["']/.test(text), fileName + " must declare titleKey.");
        check(fileName + " has descriptionKey", /\bdescriptionKey\s*:\s*["'][^"']+["']/.test(text), fileName + " must declare descriptionKey.");
        check(fileName + " has i18n.en", /\bi18n\s*:\s*\{[\s\S]*\ben\s*:\s*\{/m.test(text), fileName + " must include i18n.en.");
        check(fileName + " has i18n.zh-CN", /\bi18n\s*:\s*\{[\s\S]*["']zh-CN["']\s*:\s*\{/m.test(text), fileName + " must include i18n[\"zh-CN\"].");
    });
}

function checkPaletteAuthorityClosure() {
    const store = readText("client/js/palette/paletteStore.js");
    const facade = readText("client/js/proceduralPaletteStore.js");
    const model = readText("client/js/palette/paletteModel.js");
    const resolver = readText("client/js/palette/paletteResolver.js");
    const registry = readText("client/js/palette/colorDerivationRegistry.js");
    const migration = readText("client/js/palette/legacyPaletteMigration.js");
    const adapter = readText("client/js/palette/legacyProceduralPaletteAdapter.js");
    const workspace = readText("client/js/proceduralPaletteWorkspace.js");
    const main = readText("client/js/main.js");
    const library = readText("client/js/proceduralPaletteLibrary.js");

    // 1. PaletteStore v2 is the sole persisted Palette envelope key.
    check("Palette Store v2 is the sole persisted Palette authority",
        /STORAGE_KEY\s*=\s*"lomond\.paletteStore\.v2"/.test(store) &&
        /storage\.setItem\(\s*STORAGE_KEY,\s*serialized\s*\)/.test(store),
        "PaletteStore must persist exclusively to lomond.paletteStore.v2.");

    // 2. Production palette code never writes the v1 key (migration/rollback/import only).
    const v1WriteSources = facade + migration.replace(/storage\.setItem\(\s*v2Key,\s*serialized\s*\)/g, "") + adapter + store;
    check("Production palette modules never write the v1 Palette key",
        !/\.setItem\(\s*(V1_KEY|v1Key|legacyStorageKey)/.test(v1WriteSources) &&
        !/\.setItem\(\s*["']lomond\.proceduralPaletteStore\.v1["']/.test(v1WriteSources),
        "lomond.proceduralPaletteStore.v1 must remain migration/rollback/import-only; production writes to v2 only.");

    // 3. LegacyProceduralPaletteAdapter is a pure compatibility projection (no persistence).
    check("LegacyProceduralPaletteAdapter holds no persistence path",
        !/setItem|getItem|localStorage/.test(adapter),
        "The compatibility adapter must not read/write storage or own a second persistence authority.");

    // 4. Palette core never writes semantic CSS.
    check("Palette core never writes semantic CSS",
        !/documentElement\.style|\.setProperty\s*\(/.test(model + resolver + registry + migration + adapter),
        "PaletteModel/Resolver/DerivationRegistry/Migration/Adapter must not write semantic CSS.");

    // 5. Workspace edits a memory-only full-v2 draft and never persists directly.
    check("Palette Workspace edits a native full-v2 draft only",
        /createNativeEditorState/.test(workspace) && /mutateNativeDraft/.test(workspace) &&
        !/editablePalette|draftSignature|createEditorState\(/.test(workspace) &&
        !/\.setItem\(/.test(workspace),
        "Workspace must edit the full v2 draft in memory and never write storage itself.");

    // 6. Transient preview stays in memory and never reaches the persisted envelope/export.
    check("Transient preview is memory-only",
        /transients\[externalId\]\s*=/.test(facade) &&
        /flush:\s*function\s*\(\)\s*\{\s*\}/.test(facade) &&
        !/\btransients\b/.test(store),
        "Transient previews must live in an in-memory map and never enter the v2 envelope or export.");

    // 7. Workspace persistence flows only through Save -> v2 transaction.
    check("Palette Workspace Save is the only Store write boundary",
        /function saveDraft/.test(workspace) && /store\.(createV2Palette|saveV2Palette)\s*\(/.test(workspace),
        "Workspace persistence must route only through Save into a v2 transaction.");

    // 8. Palette selection never silently rewrites Appearance Accent/Canvas.
    check("Palette edits never rewrite Appearance Accent/Canvas automatically",
        !/applyThemeAccent\(|applyHomeBackground\(/.test(workspace) &&
        /suggestThemeAccent: true/.test(main) &&
        /function suggestThemeAccentFromPalette/.test(main),
        "Palette edits update procedural consumers only; Accent/Canvas writes are explicit user actions.");

    // 9. REFERENCE supports same-palette slotId only.
    check("REFERENCE supports a single same-palette slotId only",
        /hasOwnProperty\.call\(\s*slot\.reference,\s*["']paletteId["']\s*\)/.test(model),
        "A REFERENCE must be a single same-palette slotId and cannot carry a paletteId.");

    // 10. No production Harmony generator exists.
    check("No production Harmony generator exists",
        !/Analogous|Complementary|Triadic|Tone\s*ladder|Harmony/i.test(main + workspace + facade),
        "Palette Harmony/Analogous/Triadic generators are deferred and must not exist in production code.");

    // 11. ProceduralPaletteLibrary remains the unique built-in canonical source.
    check("ProceduralPaletteLibrary is the unique built-in canonical source",
        /function\s+listPalettes|\blistPalettes\s*:\s*function/.test(library) && /builtInPalettes/.test(store),
        "Built-in canonicals come from the factory library; Store v2 keeps canonical-relative overrides only.");
}

function checkGeneratedI18nReport() {
    const result = I18nUsageReport.checkReport();
    check(
        "Generated i18n report is current",
        result.ok,
        "Run: node scripts/report-i18n-usage.js"
    );
}

function main() {
    const version = checkVersions();
    checkChangelog(version);
    checkRequiredEntrypoints();
    checkIndexHtml();
    checkVelaRuntimeBootstrap();
    checkVelaProviderBranchProfiles();
    checkVelaProviderQualificationRubric();
    checkVelaContextHostIncludes();
    checkRegistryTools();
    checkPaletteAuthorityClosure();
    checkGeneratedI18nReport();

    let failed = 0;
    checks.forEach((item) => {
        const label = item.ok ? "PASS" : "FAIL";
        console.log(label + " " + item.name + (item.detail ? " - " + item.detail : ""));
        if (!item.ok) {
            failed += 1;
        }
    });

    if (failed) {
        console.error(String(failed) + " project consistency check(s) failed.");
        process.exitCode = 1;
    } else {
        console.log("All project consistency checks passed.");
    }
}

main();
