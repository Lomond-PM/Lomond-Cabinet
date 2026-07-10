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
        "client/js/proceduralAppearance.js",
        "host/index.jsx"
    ].forEach((file) => {
        check("Required entry exists: " + file, exists(file), file + " is required.");
    });
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
        "js/i18n.js",
        "js/settingsSchema.js",
        "js/proceduralAppearance.js",
        "js/main.js"
    ];
    expected.forEach((item) => {
        check(
            "Expected frontend reference present: " + item,
            frontendRefs.some((ref) => ref.path === item),
            "client/index.html must reference " + item + "."
        );
    });
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
