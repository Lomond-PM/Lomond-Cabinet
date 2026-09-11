// Explicit evidence capture; never run automatically by suite discovery.
const fs = require("fs");
const crypto = require("crypto");
const { harness } = require("./fixtures/ad-component-detach-harness");
const target = process.argv[2];
if (!target) throw Error("Pass a new evidence JSON path (existing files refused)");
const original = '  中文 日本語 😀\n"quote"\\path % %25 literal\\u0000  ';
const h = harness([original]);
const beforeCreate = h.snapshot();
const create = h.create();
if (!create.ok) throw Error(JSON.stringify(create));
const controller = h.layers[1];
const data = JSON.parse(controller.comment.slice(h.prefix.length));
h.add(h.prefix + JSON.stringify(Object.assign({}, data, { role: "generatedLayer" })), "generated").parent = controller;
h.add("unrelated 中文", "unrelated");
h.add(h.prefix + JSON.stringify(Object.assign({}, data, { componentId: "other", artifactId: "other" })), "other");
h.comp.selectedLayers = [controller];
const registeredDetach = h.registered("detachSelectedComponent");
const beforeDetach = h.snapshot();
h.events.length = 0;
const result = h.detach();
const record = { command: process.argv.join(" "), runtime: process.version,
    productionSha256: crypto.createHash("sha256").update(fs.readFileSync("host/tools/adComponentKit.jsx")).digest("hex"),
    loaded: h.host.loaded, source: "Registered createIconGrid; generated/other layers constructed from production controller metadata; retained Detach direct call, not registered",
    beforeCreate, create, registeredDetach, beforeDetach, result, afterDetach: h.snapshot(), events: h.events };
fs.writeFileSync(target, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(target + ": " + JSON.stringify(result));
