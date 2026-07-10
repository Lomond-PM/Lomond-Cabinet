#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const version = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const host = fs.readFileSync(path.join(ROOT, "host", "index.jsx"), "utf8");
const match = host.match(/AEToolbox\.projectVersion\s*=\s*["']([^"']+)["']/);

if (!match) {
    console.error("FAIL host/index.jsx does not declare AEToolbox.projectVersion.");
    process.exitCode = 1;
} else if (match[1] !== version) {
    console.error("FAIL AEToolbox.projectVersion is " + match[1] + ", VERSION is " + version + ".");
    process.exitCode = 1;
} else {
    console.log("PASS AEToolbox.projectVersion matches VERSION: " + version);
}
