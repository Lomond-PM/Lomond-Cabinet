#!/usr/bin/env node
"use strict";
const assert = require("assert"); const fs = require("fs"); const path = require("path"); const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8"); const velaCss = fs.readFileSync(path.join(root, "client/css/velaSurface.css"), "utf8"); const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8"); const vela = fs.readFileSync(path.join(root, "client/js/vela/velaSurface.js"), "utf8");
assert.ok(/\.ui-scroll-region::-webkit-scrollbar[\s\S]*track[\s\S]*thumb[\s\S]*corner/.test(css), "shared scroll presentation owns the full WebKit contract");
["home-content ui-scroll-region", "detail-content ui-scroll-region", "settings-content ui-scroll-region"].forEach(value => assert.ok(html.includes(value), value + " is an intentional shared owner"));
assert.ok(vela.includes("vela-transcript-scroll ui-scroll-region"), "Vela transcript uses shared scroll presentation");
assert.ok(!/\.vela-transcript-scroll::-webkit-scrollbar/.test(velaCss), "Vela has no duplicate scrollbar skin");
assert.ok(!/settings-design-tuning-preview|designTuningPreviewStage/.test(css + html + vela), "removed Preview Stage owns no nested scroll");
assert.ok(/overflow-x:\s*hidden/.test(velaCss), "Vela transcript does not create horizontal scrolling");
console.log("Shared scroll-region contract tests passed.");
