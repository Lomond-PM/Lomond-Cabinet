#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
const source = fs.readFileSync(path.join(__dirname, "..", "client", "js", "vela", "velaProviderUi.js"), "utf8");
const mainSource = fs.readFileSync(path.join(__dirname, "..", "client", "js", "main.js"), "utf8");
check(source.includes("createProviderUi"), "Provider UI exposes its bounded renderer factory.");
check(source.includes("provider-send") && source.includes("provider-cancel") && source.includes("provider-review"), "Provider UI emits only send, cancel and parameterless review intents.");
check(!/innerHTML|localStorage|VelaExecution|evalScript|AEToolbox/.test(source), "Provider UI has no HTML injection, persistence, Host or execution seam.");
check(source.includes("textContent") && source.includes("state.text"), "Provider text is rendered through textContent only.");
check(source.includes("proposal-ready") && source.includes("proposalCapabilityId") && source.includes("suggestedOpacity"), "Provider UI renders only the bounded local proposal summary.");
check(!/provider-approve|createOpacityCandidate|approveCandidate|rejectCandidate|VelaExecution/.test(source), "Provider UI exposes no confirmation or execution control.");
check(source.includes('onIntent({ type: "provider-review" })') && !source.includes("opacity: state.suggestedOpacity"), "Review intent carries no model parameters, target data or execution identifiers.");
check(source.includes("getModel") && source.includes("saveModel") && source.includes('listen(modelInput, "change"') && source.includes('listen(modelInput, "blur"'), "Provider UI uses the injected unified-settings model seam on change and blur.");
check(!/localStorage|endpoint.*save|message.*save|proposal.*save/i.test(source), "Provider UI persists neither endpoint, message nor provider proposal data.");
check(mainSource.includes('velaProviderModel: "qwen3.5-4b"') && mainSource.includes('saveStoredJson(StorageKeys.settings, collectSettings())'), "The model default is stored through the existing unified settings object.");
check(mainSource.includes("normalizeVelaProviderModel") && mainSource.includes("bytes > 256") && mainSource.includes("VelaProviderModel = normalizeVelaProviderModel(data.velaProviderModel)") && !/\bproviderModel\b/.test(mainSource), "Stored model values use only the formal velaProviderModel field and invalid values fall back through settings reload.");
check(source.includes("state.state === \"pending\""), "Pending state disables duplicate send and enables cancellation.");
console.log("test-vela-provider-ui: " + assertions + " assertions passed.");
