#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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
        "client/js/vela/velaUi.js",
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
        "js/vela/velaUi.js",
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
    check("Qualification diagnostics remain on C3 metadata", diagnostics.indexOf("vela-capability-prompt-builder-v2") !== -1 && diagnostics.indexOf("C3A_PROMPT_SHA256") !== -1 && diagnostics.indexOf("requestProfile") === -1 && diagnostics.indexOf("provider-branch-profiles-v1") === -1, "Qualification diagnostics must remain C3-only until C4-C.");
    check("C4-C remains unimplemented", diagnostics.indexOf("explicit-edit-eligible") === -1 && diagnostics.indexOf("text-only") === -1, "C4-C Profile qualification routing must not be present yet.");
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

function main() {
    const version = checkVersions();
    checkChangelog(version);
    checkRequiredEntrypoints();
    checkIndexHtml();
    checkVelaRuntimeBootstrap();
    checkVelaProviderBranchProfiles();
    checkVelaContextHostIncludes();
    checkRegistryTools();

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
