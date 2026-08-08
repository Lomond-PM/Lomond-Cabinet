const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const css = fs.readFileSync(path.join(root, "client/css/style.css"), "utf8");
let assertions = 0;

function check(value, message) {
    assertions += 1;
    if (!value) throw new Error(message);
}

const setup = main.slice(main.indexOf("function setupUiScale"), main.indexOf("function setBackgroundSettingsCollapsed"));
const scrub = main.slice(main.indexOf("function setupRegistryNumberDrag"), main.indexOf("function syncRegistryColorField"));
const peek = main.slice(main.indexOf("function beginSettingsPeekManipulation"), main.indexOf("function setBackgroundSettingsCollapsed"));

check(/SETTINGS_PEEK_DELAY_MS = 300/.test(main), "Peek uses the fixed 300ms intent delay");
check(/pointerdown[\s\S]*beginSettingsPeekManipulation\("range"\)/.test(setup), "UI Scale range starts a manipulation on pointer drag");
check(/input[\s\S]*rangeManipulating[\s\S]*markSettingsPeekManipulationChanged/.test(setup), "Range arms Peek only after a real value input");
check(/pointerup[\s\S]*pointercancel[\s\S]*lostpointercapture/.test(setup), "Range handles pointer completion and cancellation");
check(/onDragStart[\s\S]*onDragChange[\s\S]*onDragEnd/.test(main.slice(main.indexOf("function renderSettingsRangeRow"), main.indexOf("function renderSettingsMotion"))), "UI Scale number reuses the shared scrub lifecycle hooks");
check(/Math\.abs\(delta\) < 4[\s\S]*options\.onDragStart/.test(scrub), "Numeric scrub starts only after horizontal movement crosses the existing threshold");
check(!/addEventListener\("input"[\s\S]{0,160}beginSettingsPeekManipulation\("number-scrub"\)/.test(setup), "Normal numeric text input does not start Peek");
check(/manipulation\.changed = true[\s\S]*setTimeout[\s\S]*SettingsPeekManipulation === manipulation/.test(peek), "Delayed entry verifies the same active changed manipulation");
check(/beginSettingsPeekPreview\(byId\("settingsMotionMount"\)\)/.test(peek), "Peek retains the real Motion section scope");
check(/is-settings-peek-home/.test(peek) && /#homeView\.is-settings-peek-home[\s\S]*pointer-events: none !important/.test(css), "Peek reveals the real Home as non-interactive");
check(/is-peek-preview #settingsMotionMount[\s\S]*visibility: visible[\s\S]*pointer-events: auto/.test(css), "Motion section remains visible and interactive without relocation");
check(/is-peek-preview \.settings-root-page > \.settings-section[\s\S]*visibility: hidden/.test(css), "Other Settings sections are suppressed with geometry-preserving visibility");
check(/function endSettingsPeekPreview[\s\S]*clearTimeout[\s\S]*classList\.remove\("is-peek-preview"/.test(peek), "Peek exit is idempotent and clears timer and presentation state");
check(/wasPreviewingHome[\s\S]*classList\.remove\("is-settings-peek-home"\)[\s\S]*if \(wasPreviewingHome\) home\.classList\.remove\("is-active"\)/.test(peek), "Peek cleanup does not hide a normally active Home");
check(/window\.addEventListener\("blur", up\)/.test(scrub) && /window\.addEventListener\("blur"[\s\S]*endSettingsPeekManipulation/.test(main), "Window blur cleans shared scrub and Peek presentation state");
check(/function cleanupTransientUiState[\s\S]*endSettingsPeekManipulation/.test(main), "Panel lifecycle cleanup exits Peek");
check(/function closeSettingsPanel[\s\S]*endSettingsPeekManipulation/.test(main), "Settings close exits Peek before navigation lifecycle");
check(!/previewUiScale|uiScalePeekValue|appearance\.v1/.test(peek), "Peek adds no persistence key or appearance override state");
check(!/ActiveRoute\s*=|SystemRouter\.(?:open|close|navigate)|playAnimation|beginAnimation/.test(peek), "Peek does not change route or invoke morph animation");

console.log(`Settings Peek contract tests passed: ${assertions} assertions.`);
