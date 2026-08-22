"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Report = require("./report-i18n-usage.js");

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "docs", "reports", "i18n-usage-report.md");
let assertions = 0;
function equal(actual, expected, message) { assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message) { assertions += 1; assert.ok(value, message); }
function run(command, args, cwd) {
    return childProcess.spawnSync(command, args, { cwd, encoding: "utf8" });
}
function git(cwd, args) {
    const result = run("git", args, cwd);
    if (result.status !== 0) {
        throw new Error("git " + args.join(" ") + " failed:\n" + result.stdout + result.stderr);
    }
    return result;
}

const before = fs.readFileSync(REPORT_PATH, "utf8");
const first = Report.buildReport().content;
const second = Report.buildReport().content;
equal(first, second, "report generation is deterministic across consecutive builds");
equal(Report.normalizeLineEndings(before), first, "existing generated report content has no unrelated change");
ok(Report.checkReport(REPORT_PATH, first).ok, "current report passes freshness check");
equal(fs.readFileSync(REPORT_PATH, "utf8"), before, "freshness check does not modify the repository report");

// Client-registry i18n key coverage: labelKey/descriptionKey/etc. declared in
// client-side registries are rendered via tr(field.labelKey) and never detected by
// the literal tr("...") scan. They must exist in the global dictionary or they leak
// runtime missing-key warnings, so the report fails when any are absent.
const built = Report.buildReport();
ok(Array.isArray(built.missingClientKeys), "client-registry missing-key inventory is an array");
equal(built.missingClientKeys.length, 0, "no client-registry i18n key is missing from the global dictionary");
equal(built.summary.clientMissingKeyCount, 0, "summary records zero missing client-registry keys");
ok(built.content.includes("## Client Registry i18n Key Coverage"), "report surfaces the client-registry key coverage section");
ok(/(?:^|\n)No client-registry i18n key is missing/i.test(built.content), "coverage section is explicitly clean when no key is missing");
ok(Array.isArray(built.missingLiteralKeys), "literal missing-key inventory is an array");
equal(built.missingLiteralKeys.length, 0, "no literal tr()/data-i18n key is missing from the global dictionary");
equal(built.summary.literalMissingKeyCount, 0, "summary records zero missing literal keys");
ok(built.content.includes("## Literal i18n Key Coverage"), "report surfaces the literal i18n key coverage section");
ok(/(?:^|\n)No literal i18n key is missing/i.test(built.content), "literal coverage section is explicitly clean when no key is missing");
ok(Array.isArray(built.schemaMissingKeys), "tool-schema missing-key inventory is an array");
equal(built.schemaMissingKeys.length, 0, "no Registry Tool schema i18n reference is unresolvable");
equal(built.summary.schemaMissingKeyCount, 0, "summary records zero unresolvable schema keys");
ok(built.content.includes("## Registry Tool Schema i18n Coverage"), "report surfaces the tool-schema i18n coverage section");
ok(/(?:^|\n)No Registry Tool schema i18n reference is unresolvable/i.test(built.content), "schema coverage section is explicitly clean when no key is unresolved");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aetoolbox-i18n-report-"));
const tempReport = path.join(tempRoot, "report.md");
try {
    fs.writeFileSync(tempReport, "stale\n", "utf8");
    const staleBefore = fs.readFileSync(tempReport, "utf8");
    equal(Report.checkReport(tempReport, first).ok, false, "stale content fails the check function");
    equal(fs.readFileSync(tempReport, "utf8"), staleBefore, "stale check mode does not rewrite its target");
    fs.unlinkSync(tempReport);
    equal(Report.checkReport(tempReport, first).ok, false, "missing report fails the check function");
    equal(Report.writeReport(tempReport, first), true, "default write capability creates the expected report");
    equal(fs.readFileSync(tempReport, "utf8"), first, "default write capability writes exact expected content");
    equal(Report.writeReport(tempReport, first), false, "second identical write is a no-op");
    fs.writeFileSync(tempReport, first.replace(/\n/g, "\r\n"), "utf8");
    equal(Report.writeReport(tempReport, first), false, "line-ending-only differences do not cause rewrite churn");
} finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
}

const unknown = childProcess.spawnSync(process.execPath, [path.join(__dirname, "report-i18n-usage.js"), "--unknown"], { encoding: "utf8" });
ok(unknown.status !== 0, "unknown CLI argument exits nonzero");
ok((unknown.stderr + unknown.stdout).includes("Usage: node scripts/report-i18n-usage.js [--check]"), "unknown argument prints usage");

const consistency = fs.readFileSync(path.join(__dirname, "check-project-consistency.js"), "utf8");
ok(/require\("\.\/report-i18n-usage\.js"\)/.test(consistency) && /checkGeneratedI18nReport\(\)/.test(consistency), "project consistency reuses the report module check");
ok(consistency.includes("Run: node scripts/report-i18n-usage.js"), "consistency failure names the repair command");

const hookPath = path.join(ROOT, ".githooks", "pre-commit");
const hook = fs.readFileSync(hookPath, "utf8");
const normalizedHook = Report.normalizeLineEndings(hook);
ok(normalizedHook.startsWith("#!/bin/sh\n"), "pre-commit hook has a portable shell entrypoint");
ok(/(?:^|\n)node\s+scripts\/report-i18n-usage\.js\s+--check(?:\s|$)/.test(normalizedHook), "pre-commit hook runs the shared check CLI");
ok(!/\bgit\s+add\b/.test(hook), "pre-commit hook never stages files");
ok(/checkout-index[\s\S]*--all[\s\S]*--prefix="\$temp_root\/"/.test(normalizedHook), "pre-commit hook exports the complete Git index snapshot");
ok(/mktemp -d/.test(normalizedHook) && /trap cleanup EXIT HUP INT TERM/.test(normalizedHook) && /rm -rf "\$temp_root"/.test(normalizedHook), "pre-commit hook always cleans its temporary snapshot");

const workflow = fs.readFileSync(path.join(ROOT, ".github", "workflows", "project-checks.yml"), "utf8");
ok(workflow.includes("- name: Verify generated i18n report") && workflow.includes("run: node scripts/report-i18n-usage.js --check"), "workflow has an explicit read-only report step");
ok(!workflow.includes("Refresh i18n report") && !/git diff --exit-code -- docs\/reports\/i18n-usage-report\.md/.test(workflow), "workflow no longer generates then diffs the report");

const hookRepo = fs.mkdtempSync(path.join(os.tmpdir(), "aetoolbox-hook-index-"));
try {
    fs.mkdirSync(path.join(hookRepo, ".githooks"), { recursive: true });
    fs.mkdirSync(path.join(hookRepo, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(hookRepo, "docs", "reports"), { recursive: true });
    fs.copyFileSync(hookPath, path.join(hookRepo, ".githooks", "pre-commit"));
    fs.writeFileSync(path.join(hookRepo, "source.txt"), "alpha\n", "utf8");
    fs.writeFileSync(path.join(hookRepo, "docs", "reports", "i18n-usage-report.md"), "REPORT:alpha\n", "utf8");
    fs.writeFileSync(path.join(hookRepo, "scripts", "report-i18n-usage.js"), [
        '"use strict";',
        'const fs = require("fs");',
        'const expected = "REPORT:" + fs.readFileSync("source.txt", "utf8").trim() + "\\n";',
        'const target = "docs/reports/i18n-usage-report.md";',
        'if (process.argv[2] === "--check") {',
        '    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8").replace(/\\r\\n/g, "\\n") !== expected) {',
        '        console.error("Generated i18n report is out of date.");',
        '        console.error("Run: node scripts/report-i18n-usage.js");',
        '        console.error("Then stage docs/reports/i18n-usage-report.md.");',
        '        process.exitCode = 1;',
        '    }',
        '} else { fs.writeFileSync(target, expected, "utf8"); }',
        ''
    ].join("\n"), "utf8");

    git(hookRepo, ["init", "-q"]);
    git(hookRepo, ["config", "user.name", "Report Guard Test"]);
    git(hookRepo, ["config", "user.email", "report-guard@example.invalid"]);
    git(hookRepo, ["add", "."]);
    git(hookRepo, ["commit", "-q", "-m", "baseline"]);
    git(hookRepo, ["config", "core.hooksPath", ".githooks"]);

    fs.writeFileSync(path.join(hookRepo, "source.txt"), "beta\n", "utf8");
    const staleCli = run(process.execPath, ["scripts/report-i18n-usage.js", "--check"], hookRepo);
    ok(staleCli.status !== 0, "shared check CLI rejects a stale generated report");
    equal(fs.readFileSync(path.join(hookRepo, "docs", "reports", "i18n-usage-report.md"), "utf8"), "REPORT:alpha\n", "shared check CLI does not modify a stale report");
    equal(run(process.execPath, ["scripts/report-i18n-usage.js"], hookRepo).status, 0, "fixture generator updates the working-tree report");
    equal(run(process.execPath, ["scripts/report-i18n-usage.js", "--check"], hookRepo).status, 0, "shared check CLI accepts a fresh generated report");
    git(hookRepo, ["add", "source.txt"]);
    const reportUnstaged = run("git", ["hook", "run", "pre-commit"], hookRepo);
    ok(reportUnstaged.status !== 0, "hook rejects staged source when its generated report is only updated in the working tree");
    ok((reportUnstaged.stdout + reportUnstaged.stderr).includes("Run: node scripts/report-i18n-usage.js"), "snapshot failure preserves the generator repair hint");

    git(hookRepo, ["add", "docs/reports/i18n-usage-report.md"]);
    const consistent = run("git", ["hook", "run", "pre-commit"], hookRepo);
    equal(consistent.status, 0, "hook accepts a self-consistent staged source and report: " + consistent.stdout + consistent.stderr);

    fs.writeFileSync(path.join(hookRepo, "source.txt"), "gamma\n", "utf8");
    equal(run("git", ["hook", "run", "pre-commit"], hookRepo).status, 0, "unstaged later source changes do not contaminate the index snapshot check");

    fs.writeFileSync(path.join(hookRepo, "source.txt"), "beta\n", "utf8");
    git(hookRepo, ["rm", "--cached", "docs/reports/i18n-usage-report.md"]);
    ok(run("git", ["hook", "run", "pre-commit"], hookRepo).status !== 0, "hook rejects a report missing from the index even when it exists in the working tree");
} finally {
    fs.rmSync(hookRepo, { recursive: true, force: true });
}

console.log("test-generated-report-guard: " + assertions + " assertions passed.");
