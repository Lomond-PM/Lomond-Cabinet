const assert = require("assert");
const { makeHost } = require("./fixtures/host-json-entry-harness");
const baseline = process.argv.includes("--baseline");
let assertions = 0;
const records = [];
function equal(actual, expected, label) {
    assertions++;
    assert.deepStrictEqual(actual, expected, label);
}
const c0 = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i));
const samples = c0.map((value, i) => ({ label: "C0-" + i, value })).concat([
    { label: "C0-combined", value: c0.join("") },
    { label: "quote-backslash", value: '"\\' },
    { label: "literal-escapes", value: String.raw`\u0001\n\t\"\\` },
    { label: "multilingual", value: "中文 English 日本語 العربية é 😀\u2028\u2029" },
    { label: "plain", value: "Normal 中文" },
    { label: "empty", value: "" }
]);
for (const mode of ["native", "missing-parse", "missing-json"]) {
    const host = makeHost(mode);
    const api = host.sandbox.AEToolbox;
    for (const { label, value } of samples) {
        host.sandbox.sample = value;
        const paths = {
            jsonEscape: () => '"' + api.jsonEscape(value) + '"',
            toJsonValue: () => api.toJson({ value }),
            stringifyValue: () => api.stringify(value),
            toJsonStringKey: () => host.run('var o = {}; o[sample] = "value"; AEToolbox.toJson(o)'),
            toJsonNumberKey: () => host.run('var o = {}; o[sample] = 7; AEToolbox.toJson(o)'),
            toJsonBooleanKey: () => host.run('var o = {}; o[sample] = true; AEToolbox.toJson(o)'),
            stringifyKey: () => host.run('var o = {}; o[sample] = "value"; AEToolbox.stringify(o)'),
            nested: () => host.run('var o = {}; o[sample] = [sample, { value: sample }]; AEToolbox.stringify({ nested: [o] })'),
            hostLoadInfo: () => host.run('AEToolbox._registeredToolLoadErrors = [sample]; AEToolbox.getHostLoadInfo()')
        };
        for (const [route, call] of Object.entries(paths)) {
            const raw = call();
            let parsed, error = null;
            try { parsed = JSON.parse(raw); } catch (e) { error = e.name; }
            if (baseline) { records.push({ mode, label, route, input: value, raw, parsed: error ? undefined : parsed, error }); continue; }
            equal(error, null, mode + "/" + label + "/" + route);
            if (route === "jsonEscape" || route === "stringifyValue") equal(parsed, value, route);
            else if (route === "toJsonValue") equal(parsed, { value }, route);
            else if (route === "nested") equal(parsed, { nested: [{ [value]: [value, { value }] }] }, route);
            else if (route === "hostLoadInfo") {
                equal(parsed.registeredToolLoadErrors, value, route);
                equal(parsed.ok, true, route);
                equal(parsed.registeredToolLoadErrorCount, 1, route);
            } else equal(parsed, { [value]: route === "toJsonNumberKey" ? 7 : route === "toJsonBooleanKey" ? true : "value" }, route);
        }
    }
    if (baseline) continue;
    equal(api.jsonEscape('a\r\n\t"\\'), 'a\\r\\n\\t\\"\\\\', "existing escapes unchanged");
    equal(api.toJson({ ok: true, count: 2, message: "完成" }), '{"ok":true,"count":2,"message":"完成"}', "flat bytes");
    equal(host.run('AEToolbox.toJson({ nil: null, absent: undefined, list: [1,2], nested: {a:1}, _keep: true })'), '{"nil":"null","absent":"undefined","list":"1,2","nested":"[object Object]","_keep":true}', "flat coercion retained");
    equal(host.run('AEToolbox.stringify({nil:null, absent:undefined, list:[1, true, "中"], _omit:1, fn:function(){}})'), '{"nil":null,"absent":null,"list":[1,true,"中"]}', "recursive filtering retained");
    equal(host.run('var parent = { inherited: 1 }; var obj = Object.create(parent); obj.own = "yes"; AEToolbox.toJson(obj)'), '{"own":"yes"}', "flat own fields");
    equal(host.run('AEToolbox.stringify(obj)'), '{"own":"yes"}', "recursive own fields");
    equal(JSON.parse(api.getSelectionSummary()), { ok: true, statusId: "no-active-comp", selectedCount: 0 }, "actual success entry");
    equal(JSON.parse(api.runRegisteredToolAction("missing", "missing", "{}")), { ok: false, message: "Registered tool not found." }, "actual error entry");
    equal(host.writes, [], "serializer/diagnostic did not write project");
}
if (baseline) console.log(JSON.stringify({ evidence: "Production modules in Node VM, not real AE", records }, null, 2));
else console.log("Host JSON serialization: " + assertions + " assertions PASS (3 Host JSON modes)");
