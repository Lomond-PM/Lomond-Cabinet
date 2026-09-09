const assert = require("assert");
const { makeHost, artifact, legacy, prefix, expression, legacyExpression } = require("./fixtures/host-json-entry-harness");

const modes = ["native", "missing-parse", "missing-json"];
if (process.argv.includes("--observe")) {
    for (const mode of modes) {
        const host = makeHost(mode);
        for (const [name, comment] of [["valid-artifact", prefix + JSON.stringify(artifact)], ["valid-legacy", JSON.stringify(legacy)], ["artifact-expression", prefix + expression], ["legacy-expression", legacyExpression]]) {
            host.select(comment);
            host.sandbox.__a01Marker = 0;
            const state = host.state();
            console.log(JSON.stringify({ mode, name, canRefresh: state.state.canRefresh, canRemoveGeneratedComponent: state.state.canRemoveGeneratedComponent, marker: host.sandbox.__a01Marker, writes: host.writes.length }));
        }
    }
} else {
    let checks = 0;
    function equal(actual, expected, label) {
        checks++;
        assert.deepStrictEqual(actual, expected, label);
    }
    function rejects(fn, label) {
        checks++;
        assert.throws(fn, error => error.name === "SyntaxError", label);
    }
    // Cross-realm data comparison preserves -0, infinity and own __proto__ keys.
    function compare(actual, expected, label) {
        if (expected === null || typeof expected !== "object") {
            equal(actual, expected, label);
        } else {
            equal(Array.isArray(actual), Array.isArray(expected), label);
            equal(Object.keys(actual), Object.keys(expected), label);
            for (const key of Object.keys(expected)) compare(actual[key], expected[key], label + "." + key);
        }
    }
    const valid = [
        "{}", "[]", "null", "true", "false", "0", "-0", "-12.75e+2", "1E-2", "1e400",
        " \t\r\n [1, false, null, {\"nested\": [\"中文\", \"日本語\", \"🙂\"]}] \n",
        '"\\\"\\\\\\/\\b\\f\\n\\r\\t\\u0000\\u4e2d\\uD83D\\uDE42"',
        '"\\uD800"', '"\\uDC00"', '"line\u2028separator\u2029"',
        '{"duplicate":1,"duplicate":2}', '{"__proto__":{"a01Data":true},"constructor":4,"prototype":5,"hasOwnProperty":6}',
        '{"__proto__":1,"__proto__":2}', JSON.stringify(artifact), JSON.stringify(legacy),
        JSON.stringify({ long: "x".repeat(9000), items: Array.from({ length: 70 }, (_, i) => i) }),
        "[".repeat(12) + "0" + "]".repeat(12)
    ];
    const invalid = [
        "", " ", "undefined", "NaN", "Infinity", "+1", "01", "-01", ".1", "1.", "1e", "1e+", "--1",
        "[1,]", "[,1]", "[1 2]", "{\"a\":1,}", "{a:1}", "{'a':1}", "{\"a\" 1}", "{\"a\":}",
        "{} {}", "truefalse", "null0", "[", "{", '"unterminated', '"\\x41"', '"\\u123"', '"\\uZZZZ"',
        '"raw\ncontrol"', '"raw\u0000control"', '"\\v"', '"\\0"', '"\\', "\u00a0{}", "\ufeff{}", "/*comment*/{}",
        expression, legacyExpression, '{}; __a01Marker += 1', '({"a":1})',
        '(function(){ __a01Marker += 1; return {}; }())', '{"a":(__a01Marker += 1)}'
    ];
    for (const mode of modes) {
        const host = makeHost(mode);
        const api = host.sandbox.AEToolbox;
        const parse = api.parseJson;
        const info = JSON.parse(api.getHostLoadInfo());
        equal(info.registeredToolLoadErrorCount, 0, mode + " all actual registry files loaded without errors");
        equal(info.hasValidRegisteredToolCatalog, true, mode + " production registry transaction committed");
        equal(info.registeredToolLastAttemptSucceeded, true, mode + " production registry validation succeeded");
        equal(host.loaded.some(file => /adComponentKit\.tool\.jsx$/.test(file)), true, "actual registry schema loaded");
        for (const input of valid) compare(parse(input), JSON.parse(input), mode + " valid JSON");
        for (const input of invalid) rejects(() => parse(input), mode + " rejects " + input);
        for (const input of [null, true, false, 12]) compare(parse(input), JSON.parse(input), mode + " coercion");
        rejects(() => parse(undefined), "undefined input");
        equal(host.run("({}).a01Data"), undefined, "no prototype mutation");

        const comments = [
            [prefix + JSON.stringify(artifact), true, true], [JSON.stringify(legacy), true, false],
            ["An ordinary 中文 comment", false, false], ["", false, false], ['ordinary "aetoolbox" mention', false, false],
            [prefix + expression, false, false], [legacyExpression, false, false],
            [prefix + JSON.stringify(artifact) + "; __a01Marker += 1", false, false],
            [JSON.stringify(legacy) + "; __a01Marker += 1", false, false],
            [prefix + '{"tool":"wrong","artifactId":"x"}', false, false],
            [prefix + '{"tool":"adComponentKit"}', false, false],
            [prefix + "null", false, false], [prefix + "{}", false, false], [prefix + "{broken", false, false],
            ['{"aetoolbox":false}', false, false]
        ];
        for (const [comment, refresh, remove] of comments) {
            const layer = host.select(comment);
            const first = host.state();
            equal(first.ok, true, "state envelope");
            equal(first.state.canRefresh, refresh, mode + " metadata recognition");
            equal(first.state.canRemoveGeneratedComponent, remove, mode + " artifact recognition");
            for (let i = 0; i < 3; i++) equal(host.state(), first, mode + " stable repeated registered state");
            equal(layer.comment, comment, "comment unchanged");
            equal(host.writes, [], "no project writes or undo groups");
        }
        host.select("", false);
        equal(host.state().messageKey, "tools.adComponentKit.state.noComp", "no comp");
        host.select("", true, false);
        equal(host.state().messageKey, "tools.adComponentKit.state.noSelection", "no selection");

        // All other direct consumers invoke the actual public parser. No Host creation is simulated.
        let calls = 0;
        api.parseJson = function (input) { calls++; return parse(input); };
        const params = '{"label":"中文 / 日本語","nested":[1,{"value":true}]}';
        for (const fn of [api.tools.settingsRendererLab.preview, api.tools.settingsRendererLab.resetSandbox, api.tools.registryControlLab.previewValues]) {
            const before = calls;
            equal(JSON.parse(fn(params)).received, JSON.parse(params), "lab valid params");
            equal(JSON.parse(fn(expression)).received, {}, "lab invalid params default");
            equal(calls - before, 2, "lab calls production parser");
        }
        host.select("", false);
        const beforeAd = calls;
        equal(JSON.parse(api.tools.adComponentKit.createFeatureStack(params)).ok, false, "Ad params then no-comp guard");
        equal(JSON.parse(api.tools.adComponentKit.createFeatureStack(expression)).ok, false, "Ad invalid params then no-comp guard");
        equal(calls - beforeAd, 2, "Ad parameter consumer reached");
        const shape = api.tools.shapeAdd;
        const beforeState = calls;
        equal(JSON.parse(shape.getRegistryState()).state.hasComp, false, "actual Shape state envelope");
        equal(calls > beforeState, true, "Shape result parser reached");
        const savedAdd = shape.add;
        const savedState = shape.getState;
        let args;
        // Downstream spies delimit parameter/result compatibility, not AE operation evidence.
        shape.add = (matchName, key) => { args = [matchName, key]; return '{"ok":true,"createdCount":1}'; };
        equal(JSON.parse(shape.addRegistryItem('{"key":"rectangle","matchName":"ADBE Vector Shape - Rect"}')).createdCount, 1, "Shape result normalization");
        equal(args, ["ADBE Vector Shape - Rect", "rectangle"], "Shape params preserved");
        shape.addRegistryItem(expression);
        equal(args, ["", ""], "Shape invalid params default");
        shape.getState = () => expression;
        equal(JSON.parse(shape.getRegistryState()).ok, false, "Shape invalid result rejected");
        shape.add = savedAdd;
        shape.getState = savedState;

        host.select("");
        const savedBegin = host.sandbox.app.beginUndoGroup;
        let boundaries = 0;
        host.sandbox.app.beginUndoGroup = () => { boundaries++; throw new Error("A01 post-parse mutation boundary"); };
        for (const fn of [api.tools.textBackgroundBox.create, shape.createStrokeFillLayer]) {
            const before = calls;
            checks++;
            assert.throws(() => fn('{"strokeWidth":3,"fillColor":"#112233"}'), /A01 post-parse mutation boundary/);
            const count = boundaries;
            equal(JSON.parse(fn(expression)).ok, false, "invalid mutation params rejected");
            equal(boundaries, count, "invalid params never reach undo group");
            equal(calls - before, 2, "mutation parameter consumer reached");
        }
        host.sandbox.app.beginUndoGroup = savedBegin;
        api.parseJson = parse;
        equal(host.sandbox.__a01Marker, 0, mode + " zero input execution across consumers");
        equal(host.writes, [], "no project changes");

        if (mode !== "native") {
            host.run("Object.defineProperty = undefined;");
            compare(parse(JSON.stringify(legacy)), legacy, "ES3 ordinary metadata without defineProperty");
            rejects(() => parse('{"__proto__":{"a01Data":true}}'), "unsafe legacy prototype setter fails closed without defineProperty");
            host.run("delete Object.prototype.__proto__;");
            compare(parse('{"__proto__":{"a01Data":true}}'), JSON.parse('{"__proto__":{"a01Data":true}}'), "ES3 ordinary proto-named property");
        }
    }
    const native = makeHost("native");
    native.run("JSON.parse = function () { throw new SyntaxError('native rejection sentinel'); };");
    checks++;
    assert.throws(() => native.sandbox.AEToolbox.parseJson("{}"), /native rejection sentinel/, "native rejection never falls back");
    console.log(`Host JSON entry: ${checks} assertions PASS (3 JSON environments; actual Host/includes/registered state; no AE)`);
}
