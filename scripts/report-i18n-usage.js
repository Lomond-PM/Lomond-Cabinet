#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const GLOBAL_I18N_PATH = path.join(ROOT, "client", "js", "i18n.js");
const HOST_TOOLS_DIR = path.join(ROOT, "host", "tools");
const REPORT_PATH = path.join(ROOT, "docs", "reports", "i18n-usage-report.md");

const RUNTIME_EXTENSIONS = new Set([".html", ".js", ".jsx", ".css"]);
const DOC_EXTENSIONS = new Set([".md"]);
const IGNORE_DIRS = new Set([".git", "node_modules", "docs/reports", "scripts"]);

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFiles(dir, includeDocs) {
    const out = [];

    function walk(current) {
        const rel = path.relative(ROOT, current).replace(/\\/g, "/");
        if (rel && IGNORE_DIRS.has(rel)) {
            return;
        }
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            const entryRel = path.relative(ROOT, full).replace(/\\/g, "/");
            if (entry.isDirectory()) {
                if (!IGNORE_DIRS.has(entryRel)) {
                    walk(full);
                }
                continue;
            }
            const ext = path.extname(entry.name);
            if (RUNTIME_EXTENSIONS.has(ext) || (includeDocs && DOC_EXTENSIONS.has(ext))) {
                out.push(full);
            }
        }
    }

    walk(dir);
    return out;
}

function loadGlobalI18n() {
    const code = readText(GLOBAL_I18N_PATH);
    const context = {
        window: {},
        document: {
            documentElement: { lang: "" },
            body: { classList: { add: function () {} } },
            querySelectorAll: function () { return []; }
        },
        localStorage: {
            getItem: function () { return null; },
            setItem: function () {}
        },
        console: {
            warn: function () {},
            log: function () {},
            error: function () {}
        }
    };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: GLOBAL_I18N_PATH });
    return context.window.I18n.dictionaries;
}

function loadToolDefinitions() {
    const files = fs.readdirSync(HOST_TOOLS_DIR)
        .filter((name) => /\.tool\.jsx$/i.test(name))
        .sort();
    const tools = [];

    for (const file of files) {
        const filePath = path.join(HOST_TOOLS_DIR, file);
        const code = readText(filePath);
        const registered = [];
        const context = {
            AEToolbox: {
                registerTool: function (toolDef) {
                    registered.push(toolDef);
                },
                tools: {}
            },
            $: {},
            app: {},
            JSON: JSON
        };
        try {
            vm.createContext(context);
            vm.runInContext(code, context, { filename: filePath });
        } catch (exc) {
            tools.push({
                file,
                filePath,
                id: "",
                titleKey: "",
                descriptionKey: "",
                i18n: {},
                loadError: String(exc && exc.message ? exc.message : exc),
                raw: code
            });
            continue;
        }
        if (registered.length) {
            const def = registered[registered.length - 1];
            tools.push({
                file,
                filePath,
                id: def.id || "",
                titleKey: def.titleKey || "",
                descriptionKey: def.descriptionKey || "",
                i18n: def.i18n || {},
                sections: def.sections || def.uiSchema || [],
                actions: def.actions || [],
                loadError: "",
                raw: code
            });
        } else {
            tools.push({
                file,
                filePath,
                id: "",
                titleKey: "",
                descriptionKey: "",
                i18n: {},
                loadError: "No AEToolbox.registerTool call captured.",
                raw: code
            });
        }
    }

    return tools;
}

function collectToolRefs(value, refs) {
    if (!value || typeof value !== "object") {
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectToolRefs(item, refs));
        return;
    }
    const i18nKeyFields = new Set([
        "titleKey",
        "descriptionKey",
        "labelKey",
        "placeholderKey",
        "messageKey",
        "pendingMessageKey",
        "successMessageKey",
        "errorMessageKey"
    ]);
    Object.keys(value).forEach((key) => {
        const child = value[key];
        if (i18nKeyFields.has(key) && typeof child === "string") {
            refs.add(child);
        }
        collectToolRefs(child, refs);
    });
}

function flattenToolI18n(tool) {
    const out = {};
    Object.keys(tool.i18n || {}).forEach((lang) => {
        out[lang] = new Set(Object.keys(tool.i18n[lang] || {}));
    });
    return out;
}

function summarizeValue(value) {
    if (typeof value !== "string") {
        return "";
    }
    return value.length > 72 ? value.slice(0, 69) + "..." : value;
}

function groupForKey(key) {
    if (key.startsWith("tools.")) {
        return key.split(".").slice(0, 2).join(".");
    }
    return key.split(".")[0];
}

function isCoreGlobalKey(key) {
    return key.startsWith("app.") ||
        key.startsWith("common.") ||
        key.startsWith("settings.") ||
        key.startsWith("selection.") ||
        key === "tools.moreTools.title" ||
        key.startsWith("button.randomize") ||
        key.startsWith("button.reset") ||
        key.startsWith("button.refreshSelection") ||
        key === "status.ready" ||
        key === "status.loadingHost" ||
        key === "status.hostLoaded" ||
        key === "status.hostLoadError" ||
        key === "status.homeEditing" ||
        key === "status.homeLayoutSaved" ||
        key === "status.motionSpeedUpdated" ||
        key === "status.uiScaleUpdated" ||
        key === "status.backgroundRandomized" ||
        key === "status.backgroundDefaultsRestored" ||
        key === "status.colorPickerOpening" ||
        key === "status.colorUpdated" ||
        key === "status.colorUnchanged";
}

function isDeferredPrefix(key) {
    return key.startsWith("label.") ||
        key.startsWith("section.") ||
        key.startsWith("helper.") ||
        key.startsWith("option.") ||
        key.startsWith("status.") ||
        key.startsWith("button.");
}

function scanKeyUsage(files, keys) {
    const usage = new Map();
    keys.forEach((key) => usage.set(key, { runtime: [], docs: [] }));

    for (const file of files) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        if (rel === "client/js/i18n.js") {
            continue;
        }
        const text = readText(file);
        const ext = path.extname(file);
        for (const key of keys) {
            if (text.indexOf(key) === -1) {
                continue;
            }
            const bucket = DOC_EXTENSIONS.has(ext) ? "docs" : "runtime";
            usage.get(key)[bucket].push(rel);
        }
    }

    return usage;
}

function countRegex(text, regex) {
    const matches = text.match(regex);
    return matches ? matches.length : 0;
}

function classifyKey(key, toolLocalKeys, usage) {
    const runtimeRefs = usage.runtime.filter((file) => !/host\/tools\/.*\.tool\.jsx$/.test(file));
    const inToolLocal = toolLocalKeys.has(key);

    if (isCoreGlobalKey(key)) {
        return {
            classification: "A",
            recommendation: "Keep in client/js/i18n.js as core/global UI copy.",
            risk: "Low"
        };
    }

    if (inToolLocal && runtimeRefs.length > 0) {
        return {
            classification: "C",
            recommendation: "Keep for now as possible startup fallback, static Home anchor, or legacy adapter dependency.",
            risk: "Medium"
        };
    }

    if (inToolLocal && runtimeRefs.length === 0) {
        return {
            classification: "D",
            recommendation: "Candidate delete after AE language-switch and startup fallback test.",
            risk: "Low"
        };
    }

    if (key === "tools.quickStack.title") {
        return {
            classification: "E",
            recommendation: "Reserved or unused Home label. Confirm no planned implementation before deleting.",
            risk: "Medium"
        };
    }

    if (key.startsWith("tools.") && usage.runtime.length === 0) {
        return {
            classification: "D",
            recommendation: "Candidate delete. Obsolete tool/global copy has no runtime reference in this report.",
            risk: "Low"
        };
    }

    if (isDeferredPrefix(key)) {
        return {
            classification: "E",
            recommendation: "Deferred. Generic/dynamic key group; needs runtime and AE fallback verification.",
            risk: "Medium"
        };
    }

    return {
        classification: "A",
        recommendation: "Keep unless a future focused audit proves it is obsolete.",
        risk: "Low"
    };
}

function markdownTable(headers, rows) {
    const escapeCell = (value) => String(value === undefined || value === null ? "" : value)
        .replace(/\r?\n/g, " ")
        .replace(/\|/g, "\\|");
    const lines = [];
    lines.push("| " + headers.map(escapeCell).join(" | ") + " |");
    lines.push("| " + headers.map(() => "---").join(" | ") + " |");
    rows.forEach((row) => {
        lines.push("| " + row.map(escapeCell).join(" | ") + " |");
    });
    return lines.join("\n");
}

function main() {
    const dictionaries = loadGlobalI18n();
    const tools = loadToolDefinitions();
    const toolLocalKeys = new Map();
    const toolKeyOwners = new Map();
    const toolRows = [];

    tools.forEach((tool) => {
        const refs = new Set();
        if (tool.titleKey) refs.add(tool.titleKey);
        if (tool.descriptionKey) refs.add(tool.descriptionKey);
        collectToolRefs(tool.sections, refs);
        collectToolRefs(tool.actions, refs);

        const flattened = flattenToolI18n(tool);
        Object.keys(flattened).forEach((lang) => {
            flattened[lang].forEach((key) => {
                toolLocalKeys.set(key, true);
                if (!toolKeyOwners.has(key)) {
                    toolKeyOwners.set(key, []);
                }
                toolKeyOwners.get(key).push(tool.file + ":" + lang);
            });
        });

        const enKeys = flattened.en || new Set();
        const zhKeys = flattened["zh-CN"] || new Set();
        const missing = Array.from(refs).filter((key) => !key.startsWith("common.") && (!enKeys.has(key) || !zhKeys.has(key)));
        const hardcodedCount = countRegex(tool.raw, /\b(?:label|title|description)\s*:\s*["'][^"']+["']/g);
        const plainMessageCount = countRegex(tool.raw, /\bmessage\s*:\s*["'][^"']+["']/g);

        toolRows.push([
            tool.file,
            tool.id,
            tool.titleKey,
            tool.descriptionKey,
            enKeys.size > 0 ? "yes" : "no",
            zhKeys.size > 0 ? "yes" : "no",
            missing.length ? missing.slice(0, 8).join(", ") + (missing.length > 8 ? " ..." : "") : "none",
            hardcodedCount ? String(hardcodedCount) : "none",
            plainMessageCount ? "plain message present; prefer messageKey/fallback check" : "messageKey-oriented",
            tool.loadError || "ok"
        ]);
    });

    const globalKeys = Object.keys(dictionaries.en || {}).sort();
    const allFiles = listFiles(ROOT, true);
    const usage = scanKeyUsage(allFiles, globalKeys);

    const keyRows = [];
    const duplicateRows = [];
    const candidateRows = [];
    const deferredRows = [];
    const classificationCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    globalKeys.forEach((key) => {
        const found = usage.get(key) || { runtime: [], docs: [] };
        const local = toolLocalKeys.has(key);
        const decision = classifyKey(key, toolLocalKeys, found);
        const group = groupForKey(key);
        classificationCounts[decision.classification] += 1;
        keyRows.push([
            key,
            group,
            summarizeValue(dictionaries.en[key]),
            summarizeValue((dictionaries["zh-CN"] || {})[key]),
            found.runtime.join(", ") || "none",
            local ? (toolKeyOwners.get(key) || []).join(", ") : "no",
            decision.classification,
            decision.recommendation
        ]);

        if (local) {
            duplicateRows.push([
                key,
                "client/js/i18n.js",
                (toolKeyOwners.get(key) || []).join(", "),
                decision.recommendation,
                decision.risk
            ]);
        }
        if (decision.classification === "D") {
            candidateRows.push([
                key,
                "Tool-local duplicate with no non-tool runtime reference found by conservative text scan.",
                "Open AE, switch language, reload panel, open affected tool detail, verify Home fallback."
            ]);
        }
        if (decision.classification === "E") {
            deferredRows.push([
                key,
                "Generic, dynamic, reserved, or unclear runtime ownership.",
                "Search dynamic construction paths and run AE fallback/startup tests before deleting."
            ]);
        }
    });

    const report = [
        "# i18n Usage Report",
        "",
        "Generated by `scripts/report-i18n-usage.js`.",
        "",
        "This report is intentionally conservative. It does not delete keys and treats dynamic or unclear usage as deferred.",
        "",
        "## Summary",
        "",
        markdownTable(["Class", "Meaning", "Count"], [
            ["A", "Core / Global; keep", classificationCounts.A],
            ["B", "Tool-local duplicate; candidate migration/delete after checks", classificationCounts.B],
            ["C", "Legacy fallback; temporarily keep", classificationCounts.C],
            ["D", "Candidate delete; low-risk after AE test", classificationCounts.D],
            ["E", "Deferred / uncertain", classificationCounts.E]
        ]),
        "",
        "## Registry Tools i18n Table",
        "",
        markdownTable([
            "tool file",
            "tool id",
            "titleKey",
            "descriptionKey",
            "has en",
            "has zh-CN",
            "missing keys",
            "hardcoded user-facing text",
            "plain message / messageKey status",
            "load status"
        ], toolRows),
        "",
        "## client/js/i18n.js Key Usage Table",
        "",
        markdownTable([
            "key",
            "group",
            "en value summary",
            "zh-CN value summary",
            "found in runtime files",
            "found in tool-local i18n",
            "classification",
            "recommendation"
        ], keyRows),
        "",
        "## Duplicate Tool Key Table",
        "",
        markdownTable([
            "key",
            "global location",
            "tool-local location",
            "recommendation",
            "risk"
        ], duplicateRows),
        "",
        "## Candidate Delete Table",
        "",
        candidateRows.length ? markdownTable(["key", "reason", "required AE test"], candidateRows) : "No low-risk delete candidates found.",
        "",
        "## Deferred Table",
        "",
        deferredRows.length ? markdownTable(["key", "reason", "what must be checked before deleting"], deferredRows) : "No deferred keys found.",
        "",
        "## Notes",
        "",
        "- Registry tool copy should live in each `host/tools/*.tool.jsx` file.",
        "- `client/js/i18n.js` should retain core/global/Home/Settings/fallback copy.",
        "- Static Home anchors and startup fallback paths are treated as reasons to keep keys until AE verifies removal.",
        "- Generic prefixes such as `label.*`, `section.*`, `button.*`, and broad `status.*` are deferred unless ownership is obvious.",
        ""
    ].join("\n");

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, report, "utf8");

    console.log(JSON.stringify({
        report: path.relative(ROOT, REPORT_PATH).replace(/\\/g, "/"),
        globalKeyCount: globalKeys.length,
        candidateDeleteCount: candidateRows.length,
        deferredCount: deferredRows.length,
        duplicateToolKeyCount: duplicateRows.length
    }, null, 2));
}

main();
