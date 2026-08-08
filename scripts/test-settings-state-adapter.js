const Adapter = require("../client/js/settings/settingsStateAdapter.js");
let assertions = 0;
function check(value, message) { assertions += 1; if (!value) throw new Error(message); }
const values = {};
const storage = { getItem: (key) => values[key] || null, setItem: (key, value) => { values[key] = value; } };
values["AEToolbox.settings.v1"] = JSON.stringify({ themeAccent: "#112233", proceduralIconMode: "themeMapped" });
const adapter = Adapter.create({ storage, defaults: { themeAccent: "#d6b25e", uiScale: 0.92, proceduralIconMode: "colorful" } });
check(adapter.load().themeAccent === "#112233", "loads saved snapshot");
check(adapter.get("uiScale") === 0.92, "fills missing defaults");
adapter.set("uiScale", 1.05);
adapter.update({ themeAccent: "#445566" });
check(adapter.save(), "saves snapshot");
const saved = JSON.parse(values["AEToolbox.settings.v1"]);
check(saved.uiScale === 1.05 && saved.themeAccent === "#445566", "round trip persists updates");
check(saved.proceduralIconMode === "themeMapped", "unmounted field remains preserved");
values["AEToolbox.settings.v1"] = "{";
check(adapter.load().themeAccent === "#d6b25e", "malformed storage falls back safely");
console.log(`Settings State Adapter tests passed: ${assertions} assertions.`);
