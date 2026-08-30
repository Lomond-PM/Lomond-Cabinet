const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const scriptsDirectory = __dirname;
const repositoryRoot = path.join(scriptsDirectory, "..");
const localEvidenceRequirements = Object.freeze({
    "test-vela-provider-model-qualification.js": Object.freeze([
        ".tmp/vela-model-qualification/c3b-qwen35-4b.json",
        ".tmp/vela-model-qualification/c3b-qwen35-9b.json"
    ])
});
const discoveredTests = fs.readdirSync(scriptsDirectory)
    .filter((name) => /^test-.*\.js$/i.test(name))
    .sort();
const skipped = [];
const tests = discoveredTests.filter((name) => {
    const requirements = localEvidenceRequirements[name];
    if (!requirements) return true;
    const missing = requirements.filter((relativePath) => !fs.existsSync(path.join(repositoryRoot, relativePath)));
    if (!missing.length) return true;
    skipped.push({ name, missing });
    return false;
});
const failures = [];

skipped.forEach((item) => {
    console.log(`SKIP ${item.name}: missing local evidence ${item.missing.join(", ")}`);
});

tests.forEach((name) => {
    const result = childProcess.spawnSync(process.execPath, [path.join(scriptsDirectory, name)], {
        cwd: repositoryRoot,
        encoding: "utf8"
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) failures.push(name);
});

console.log(`Full offline regression: ${tests.length - failures.length}/${tests.length} runnable suites passed; ${skipped.length}/${discoveredTests.length} discovered suites skipped for missing local evidence.`);
if (failures.length) {
    console.error(`Failed suites: ${failures.join(", ")}`);
    process.exitCode = 1;
}
