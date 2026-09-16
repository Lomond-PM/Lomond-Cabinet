"use strict";
const assert = require("assert");
const { harness } = require("./fixtures/ad-component-detach-harness");
let assertions = 0;
function eq(actual, expected, label) { assert.deepStrictEqual(actual, expected, label); assertions++; }
function ok(actual, label) { assert.ok(actual, label); assertions++; }
function setup(comments = ["original 中文", "second original"]) {
    const h = harness(comments);
    eq(h.create().ok, true, "actual registered Grid Create");
    h.sources = h.layers.slice(0, comments.length);
    h.controller = h.layers[h.layers.length - 1];
    h.comp.selectedLayers = [h.controller];
    h.events.length = 0;
    return h;
}
function corrupt(h, source, change) {
    const data = JSON.parse(source.comment.slice(h.prefix.length));
    change(data); source.comment = h.prefix + JSON.stringify(data);
}
function reject(h, label) {
    const before = h.snapshot(); h.events.length = 0;
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, false, label);
    ok(/preflight/i.test(result.message), "explicit preflight failure");
    eq(h.snapshot(), before, "all metadata, parents and properties preserved");
    eq(h.events, [], "no writes, removal or Undo group before complete recovery validation");
}
for (const value of [undefined, null, 42, "%ZZ", "%E4%B8", "%ED%A0%80"]) {
    const h = setup();
    corrupt(h, h.sources[1], data => { if (value === undefined) delete data.previousCommentEncoded; else data.previousCommentEncoded = value; });
    reject(h, "later source missing/invalid recovery cannot erase first source or delete controller");
}
for (const original of ["", "original 中文 😀 %25\n  "]) {
    const h = setup([original]);
    const foreign = h.add("unrelated original", "foreign");
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, true, "normal registered Remove remains supported");
    eq(h.sources[0].comment, original, "exactly one decode including empty original");
    eq(foreign.comment, "unrelated original", "foreign comment preserved");
    eq(h.events.filter(e => e.op === "remove").length, 1, "only controller removed");
}
{
    const h = setup(), before = h.snapshot();
    h.sources[1].faults.read = true;
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, false, "unreadable later comment rejects before mutation");
    eq(h.events, [], "unreadable source does not start Undo or modify earlier source");
    h.sources[1].faults.read = false;
    eq(h.snapshot(), before, "read failure preserves original state");
}
// Current production Feature writer supplies actual expression signatures.
function feature(wrapperChurn = false) {
    const h = harness(["feature original"], "text", { wrapperChurn });
    const source = h.layers[0];
    eq(h.registered("createFeatureStack", { widthMode: "auto", align: "center" }).ok, true, "actual Feature expression writer");
    h.sources = [source];
    h.controller = h.layers.find(l => l.comment.startsWith(h.prefix) && JSON.parse(l.comment.slice(h.prefix.length)).role === "controller");
    h.comp.selectedLayers = [h.controller]; h.events.length = 0;
    return h;
}
for (const change of [
    text => text.replace(/^\/\/ previousExpressionEncoded=.*$/m, "// previousExpressionEncoded=%ZZ"),
    text => text.replace(/^\/\/ previousExpressionEncoded=.*\n/m, ""),
    text => text.replace(/^\/\/ previousExpressionEnabled=.*$/m, "// previousExpressionEnabled=unknown")
]) {
    const h = feature(), p = h.sources[0].properties.position;
    p.expression = change(p.expression);
    reject(h, "invalid expression recovery does not clear expression or metadata");
}
{
    const h = feature();
    // Valid retained history fixture; new Feature admission forbids arbitrary user expressions.
    const p = h.sources[0].properties.position;
    p.expression = p.expression.replace(/^\/\/ previousExpressionEncoded=.*$/m, "// previousExpressionEncoded=" + encodeURIComponent("[12,34]"))
        .replace(/^\/\/ previousExpressionEnabled=.*$/m, "// previousExpressionEnabled=true");
    eq(h.registered("removeSelectedGeneratedComponent").ok, true, "valid Feature Remove");
    eq(h.sources[0].properties.position.expression, "[12,34]", "original expression restored");
    eq(h.sources[0].properties.position.expressionEnabled, true, "original enabled state restored");
    eq(h.sources[0].comment, "feature original", "original source comment restored");
}
for (const fault of ["comment", "parent"]) {
    const h = setup(); h.sources[1].faults[fault] = true;
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, false, "actual setter failure is not successful Remove");
    ok(/partial|no rollback/i.test(result.message), "execution failure has explicit partial semantics");
    eq(h.events.filter(e => e.op === "remove").length, 0, "restore failure does not delete controller");
    ok(h.sources[1].comment.startsWith(h.prefix), "failed source recovery retained");
}
{
    const h = feature(); h.sources[0].properties.position.failExpression = true;
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, false, "expression setter failure reported");
    eq(h.events.filter(e => e.op === "remove").length, 0, "expression failure stops deletion");
}
{
    const h = feature(true), p = h.sources[0].properties.position;
    h.propertyModel.read = (target, key, value) => {
        if (target === p && key === "expression") throw Error("isolated expression read");
        return value;
    };
    h.events.length = 0;
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, false, "unreadable expression recovery rejects");
    eq(h.events, [], "unreadable expression rejects before any mutation");
}
{
    const h = setup();
    h.controller.remove = () => { throw Error("isolated remove failure"); };
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, false, "native removal failure is not success");
    ok(/partial|no rollback/i.test(result.message), "deletion failure retains partial semantics");
    eq(h.layers.includes(h.controller), true, "failed removal leaves controller available");
    eq(h.events.filter(e => e.op === "end").length, 1, "Undo group balanced after failure");
}
console.log("Ad Component Remove recovery: " + assertions + " assertions PASS (complete production Host/registry; isolated AE boundaries)");
