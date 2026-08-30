const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const scriptsDirectory = __dirname;
const tests = fs.readdirSync(scriptsDirectory)
    .filter((name) => /^test-.*\.js$/i.test(name))
    .sort();
const failures = [];

tests.forEach((name) => {
    const result = childProcess.spawnSync(process.execPath, [path.join(scriptsDirectory, name)], {
        cwd: path.join(scriptsDirectory, ".."),
        encoding: "utf8"
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) failures.push(name);
});

console.log(`Full offline regression: ${tests.length - failures.length}/${tests.length} suites passed.`);
if (failures.length) {
    console.error(`Failed suites: ${failures.join(", ")}`);
    process.exitCode = 1;
}
