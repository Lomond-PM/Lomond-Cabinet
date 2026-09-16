const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { makeHost, artifact, prefix } = require("./fixtures/host-json-entry-harness");
let checks = 0;
function equal(a, b, label) { checks++; assert.deepStrictEqual(a, b, label); }
function reject(fn) {
    checks++;
    assert.throws(fn, e => e.name === "SyntaxError" && e.message === "Unsupported Host JSON member name: U+0000");
}
const restricted = [
    '{"\\u0000":"secret"}', '{"\\u0000B":1}', '{"A\\u0000B":1}', '{"A\\u0000":1}',
    '{"":1,"\\u0000":2}', '{"\\u0000":1,"":2}',
    '{"A":1,"A\\u0000B":2}', '{"A\\u0000B":1,"A":2}',
    '{"outer":{"\\u0000":1}}', '[{"outer":[{"A\\u0000B":1}]}]',
    '{"\\u0041\\u0000\\u0042":1}', '{"quote\\\"\\u0000":1}',
    '{"slash\\\\\\u0000":1}', '{"value":"ok", "A\\u0000B" \r\n : 2}'
];
const allowed = [
    '{"":"empty","A":"prefix"}', '{"value":"\\u0000"}', '"\\u0000"',
    '{"\\\\u0000":"literal"}', '{"quote\\\"":"\\u0000"}', '{"slash\\\\":"ok"}',
    '{"\\u005cu0000":"literal"}', '{"value":"\\\":\\u0000"}',
    '{"": ["\\u0000", {"中文":"日本語 😀"}]}', '{"A":1,"A":2}',
    '1e400', '-0', 'true', 'null'
];
for (let i = 1; i < 32; i++) allowed.push(JSON.stringify({ [String.fromCharCode(i)]: String.fromCharCode(0, i) }));
for (const mode of ["native", "missing-parse", "missing-json"]) {
    const host = makeHost(mode), api = host.sandbox.AEToolbox;
    // VM-only instrumentation, never installed in real AE or production.
    if (mode === "native") host.run('var savedParse = JSON.parse; var delegateInputs = []; JSON.parse = function (text) { delegateInputs.push(text); return savedParse(text); };');
    host.run('var nulWrites = 0; Object.defineProperty(Object.prototype, String.fromCharCode(0), { configurable: true, set: function () { nulWrites++; } });');
    for (const text of restricted) reject(() => api.parseJson(text));
    equal(host.run('nulWrites'), 0, "no restricted property assignment");
    if (mode === "native") equal(host.run('delegateInputs.length'), 0, "all restricted keys blocked before delegation");
    for (const text of allowed) {
        const result = api.parseJson(text), expected = JSON.parse(text);
        // Primitive comparison preserves -0/infinity; object comparison uses independent Node JSON.
        if (expected !== null && typeof expected === "object") equal(JSON.stringify(result), JSON.stringify(expected), mode + " allowed");
        else equal(result, expected, mode + " primitive");
    }
    if (mode === "native") equal(Array.from(host.run('delegateInputs')), allowed, "allowed inputs retain exact delegate text/order");
    let coercions = 0;
    equal(JSON.stringify(api.parseJson({ toString() { coercions++; return coercions === 1 ? '{"safe":1}' : '{"\\u0000":2}'; } })), '{"safe":1}', "single stable input");
    equal(coercions, 1, "coerce input once");
    for (const text of ['{"a":1,}', '"\\x00"', '{"value":"raw\u0000"}', '{"a":1} trailing', '(__a01Marker += 1)', '{"a":}']) {
        checks++; assert.throws(() => api.parseJson(text), e => e.name === "SyntaxError");
    }
    equal(host.sandbox.__a01Marker, 0, "no execution");
    // Actual metadata/state consumer must reject the whole comment, even if all
    // component fields would otherwise be valid before the restricted extra key.
    host.select(prefix + JSON.stringify({ ...artifact, ["A\u0000B"]: "bad" }));
    const state = host.state();
    equal(state.state.canRefresh, false, "invalid metadata never becomes component");
    equal(state.state.canRemoveGeneratedComponent, false, "no truncated object consumed");
    equal(host.writes, [], "state consumer did not mutate project");
    host.select(prefix + JSON.stringify(artifact));
    equal(host.state().state.canRefresh, true, "legal component still works");
    if (mode === "native") {
        host.run('JSON.parse = function () { throw new Error("delegate sentinel"); };');
        checks++; assert.throws(() => api.parseJson('{"safe":1}'), /delegate sentinel/, "delegate failure never falls back");
        reject(() => api.parseJson('{"\\u0000":1}'));
    }
}
const source = fs.readFileSync(path.join(__dirname, '../host/index.jsx'), 'utf8');
equal(/key = stringValue\(\);\s*admitMemberName\(key\);\s*whitespace\(\);[\s\S]*?setMember\(result, key, value\(\)\)/.test(source), true, "fallback admission before value and assignment");
console.log('Host JSON member admission: ' + checks + ' assertions PASS (3 production-module VM environments)');
