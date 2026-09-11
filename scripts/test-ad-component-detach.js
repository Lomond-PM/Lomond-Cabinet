"use strict";
const assert = require("assert");
const { harness, prepareFeatureSamples } = require("./fixtures/ad-component-detach-harness");
let assertions = 0;
const records = [];
function detach(h) {
    function snapshot() { try { return h.snapshot(); } catch (err) { return { unavailable: err.message }; } }
    const before = snapshot(), offset = h.events.length;
    const result = h.detach();
    records.push({ caseId: 'retained-detach-' + (records.length + 1), faults: h.layers.map(l => ({ name: l.name, flags: l.faults })), before, result, after: snapshot(), events: h.events.slice(offset) });
    // Snapshot fault flags now; the test may clear them before retrying.
    records[records.length - 1] = JSON.parse(JSON.stringify(records[records.length - 1]));
    return result;
}
function eq(a, b, label) { assertions++; assert.deepStrictEqual(a, b, label); }
function ok(a, label) { assertions++; assert.ok(a, label); }
function setup(comments) {
    const h = harness(comments || ["original 中文"]);
    eq(h.create().ok, true, "actual registered creation");
    h.controller = h.layers[h.layers.length - 1];
    h.comp.selectedLayers = [h.controller];
    h.events.length = 0;
    return h;
}
function metadata(h, layer, change, legacy) {
    const data = JSON.parse(layer.comment.slice(h.prefix.length));
    change(data);
    if (legacy) { delete data.artifactId; delete data.tool; data.aetoolbox = true; }
    layer.comment = (legacy ? "" : h.prefix) + JSON.stringify(data);
}
function failedPreflight(h, reason) {
    const before = h.snapshot(); h.events.length = 0;
    const result = detach(h);
    eq(result.ok, false, reason);
    ok(/preflight/.test(result.message), "preflight result");
    eq(h.snapshot(), before, "preserve all recoverable metadata/data");
    eq(h.events, [], "no mutations or Undo group before validation");
}
const texts = ["", "ordinary", '  中文 日本語 😀\r\n"quote"\\path % %25 \\u0000  ', "literal%2520", "\t leading trailing \n"];
texts.forEach(original => {
    const h = setup([original]);
    const source = h.layers[0];
    eq(JSON.parse(source.comment.slice(h.prefix.length)).previousCommentEncoded, encodeURIComponent(original), "explicit encoded original");
    eq(h.registered("detachSelectedComponent").ok, false, "no production registered Detach");
    eq(detach(h).ok, true, "retained Host Detach");
    eq(source.comment, original, "exact original including empty and decode once");
    eq(source.parent, null, "release owned parent");
    eq(h.controller.comment, "", "clear generated controller metadata");
    eq(h.events.filter(e => e.op === "remove").length, 0, "never remove layers");
    eq(h.events.filter(e => e.op === "begin").length, 1, "one group");
    eq(h.events.filter(e => e.op === "end").length, 1, "group ended");
    const after = h.snapshot(); h.events.length = 0;
    eq(detach(h).ok, false, "second Detach explicitly unavailable");
    eq(h.snapshot(), after, "second attempt does not clear restored comment");
    eq(h.events, [], "second attempt does not write");
});

// Saved older shapes are constructed fixtures, not claimed historical AE samples.
[false, true].forEach(legacy => {
    const h = setup();
    h.layers.forEach(layer => metadata(h, layer, () => {}, legacy));
    const source = h.layers[0];
    h.events.length = 0;
    eq(detach(h).ok, true, "valid new/legacy recovery metadata");
    eq(source.comment, "original 中文", "legacy recovery field restored");
});
[d => delete d.previousCommentEncoded, d => d.previousCommentEncoded = null,
    d => d.previousCommentEncoded = 42, d => d.previousCommentEncoded = false,
    d => d.previousCommentEncoded = {}, d => d.previousCommentEncoded = "%ZZ",
    d => d.previousCommentEncoded = "%E4%B8", d => d.previousCommentEncoded = "%ED%A0%80"
].forEach(change => {
    [false, true].forEach(legacy => {
        const h = setup();
        if (legacy) metadata(h, h.controller, () => {}, true);
        metadata(h, h.layers[0], change, legacy);
        failedPreflight(h, "missing/type/damaged original is not empty");
    });
});
{
    const h = setup();
    const data = JSON.parse(h.controller.comment.slice(h.prefix.length));
    ["generatedLayer", "helperLayer", "item", "itemBg", "icon"].forEach(role => {
        h.add(h.prefix + JSON.stringify(Object.assign({}, data, { role })), role).parent = h.controller;
    });
    const other = h.add(h.prefix + JSON.stringify(Object.assign({}, data, { artifactId: "other" })), "same ID other artifact");
    const unrelated = h.add("user 中文", "unrelated");
    unrelated.parent = h.controller;
    const foreignParent = h.add("external parent", "external");
    h.controller.parent = foreignParent;
    const saved = [other.comment, unrelated.comment, unrelated.parent, h.controller.parent];
    h.layers[0].properties.rotation.expression = 'user rotation expression';
    const transforms = h.snapshot().map(l => [l.transformExpressions, l.position, l.anchor, l.scale]);
    h.events.length = 0;
    eq(detach(h).ok, true, "mixed owned roles");
    eq([other.comment, unrelated.comment, unrelated.parent, h.controller.parent], saved, "foreign ownership/parent unchanged");
    eq(h.snapshot().map(l => [l.transformExpressions, l.position, l.anchor, l.scale]), transforms, "no expression/transform writes");
    eq(h.events.filter(e => e.op === "remove").length, 0, "generated retained");
}
{
    const h = setup();
    metadata(h, h.layers[0], d => d.role = "unknown");
    failedPreflight(h, "unknown owned role refused");
}
{
    const h = setup();
    metadata(h, h.layers[0], d => d.componentType = "different");
    failedPreflight(h, "ambiguous component type refused");
}
{
    const h = setup(); const source = h.layers[0];
    source.comment = "user rewrote comment 中文";
    const parent = source.parent;
    eq(detach(h).ok, true, "only remaining owned layer detached");
    eq(source.comment, "user rewrote comment 中文", "user replacement preserved");
    eq(source.parent, parent, "unowned source relationship left alone");
}
// A retry can encounter already-restored sources; preserve them and finish remaining ownership.
["parent", "comment"].forEach(fault => {
    const h = setup(["first", "second"]); const source = h.layers[1];
    const recovery = source.comment, controllerMetadata = h.controller.comment;
    source.faults[fault] = true;
    const result = detach(h);
    eq(result.ok, false, "write failure is not success");
    ok(/completed layers: 1/.test(result.message), "partial completion reported");
    ok(/no rollback/.test(result.message), "no atomic claim");
    eq(h.layers[0].comment, "first", "prior successful layer remains changed");
    eq(source.comment, recovery, "failing source retains recovery metadata");
    eq(h.controller.comment, controllerMetadata, "controller metadata retained until last");
    eq(h.events.filter(e => e.op === "end").length, 1, "failure ends group");
    source.faults[fault] = false;
    eq(detach(h).ok, true, "retry completes remaining layers");
    eq(h.layers[0].comment, "first", "retry preserves restored layer");
    eq(source.comment, "second", "retry restores failing layer");
});
[0, 1].forEach(index => {
    const h = setup(); h.layers[index].faults.read = true;
    eq(detach(h).ok, false, "comment read failure returns envelope");
    eq(h.events, [], "read failure before writes/group");
});
{
    const h = setup(); h.controller.faults.comment = true;
    const result = detach(h);
    eq(result.ok, false, "last controller write failure");
    eq(h.layers[0].comment, "original 中文", "partial source restoration stays accurate");
    eq(h.events.filter(e => e.op === "end").length, 1, "controller failure closes group");
}
// Exercise the actual writer again via registered creation, not a private debug export.
texts.forEach(original => {
    const h = harness([original], 'text');
    eq(h.registered('createFeatureStack').ok, true, 'actual Feature Stack writer');
    const source = h.layers[0];
    const encoded = JSON.parse(source.comment.slice(h.prefix.length)).previousCommentEncoded;
    h.comp.selectedLayers = [source];
    eq(h.registered('createFeatureStack').ok, true, 'rebind through registered Feature Stack');
    eq(JSON.parse(source.comment.slice(h.prefix.length)).previousCommentEncoded, encoded, 'rebind preserves saved original');
    const controller = h.layers[h.layers.length - 2];
    h.comp.selectedLayers = [controller];
    prepareFeatureSamples(h);
    eq(detach(h).ok, true, 'rebound component detach');
    eq(source.comment, original, 'rebound original restored exactly');
    eq(source.properties.position.expression, '', 'F1 finalizes current owned expression; original historical run remains archived');
});
{
    const h = setup(); const source = h.layers[0], saved = source.comment;
    eq(h.registered("refreshSelectedComponent").ok, true, "real registered Grid refresh");
    eq(source.comment, saved, "refresh preserves saved recovery metadata");
    source.parent = null; h.comp.selectedLayers = [source];
    eq(h.create().ok, false, 'Grid already rejects repeated metadata binding');
    eq(source.comment, saved, 'Grid rejection preserves recovery information');
}
{
    const h = harness(["original"], "text");
    eq(h.registered("createFeatureStack").ok, true, "Feature Stack created for update");
    const source = h.layers[0], saved = source.comment;
    h.comp.selectedLayers = [h.layers[1]];
    eq(h.registered("refreshSelectedComponent").ok, true, "real registered Feature Stack refresh");
    eq(source.comment, saved, "Feature Stack refresh preserves recovery");
}
["read", "comment"].forEach(fault => {
    const h = harness(["original"]); h.layers[0].faults[fault] = true;
    eq(h.create().ok, false, "writer fault cannot claim creation success");
    h.layers[0].faults[fault] = false;
    eq(h.layers[0].comment, "original", "writer fault keeps original");
});
{
    const h = setup(); const source = h.layers[0];
    metadata(h, source, d => delete d.previousCommentEncoded);
    const before = source.comment; source.parent = null; h.comp.selectedLayers = [source];
    eq(h.create().ok, false, "rebind missing recovery fails");
    eq(source.comment, before, "rebind does not replace missing recovery metadata");
}
{
    const h = setup();
    const result = h.registered("removeSelectedGeneratedComponent");
    eq(result.ok, true, "normal registered Remove control");
    eq(h.layers[0].comment, "original 中文", "Remove original restoration unchanged");
    eq(h.events.filter(e => e.op === "remove").length, 1, "Remove deletes controller unlike Detach");
}
console.log("A08 retained Host Detach: " + assertions + " assertions PASS (complete Host/registry modules; AE object substitutes, no real Undo)");

if (process.argv[2]) require('fs').writeFileSync(process.argv[2], JSON.stringify({ command: process.argv.join(' '), assertions, records }, null, 2) + '\n', { flag: 'wx' });
