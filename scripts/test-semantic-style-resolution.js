"use strict";
const assert = require("node:assert/strict");
const Rules = require("../client/js/ui/semanticStyleResolver.js");
const Projection = require("../client/js/ui/semanticStyleProjection.js");
const Appearance = require("../client/js/appearance/appearanceResolver.js").AppearanceResolver;
const Tuning = require("../client/js/designTuning/designTuningResolver.js");
const AR = require("../client/js/appearance/appearanceParameterRegistry.js").AppearanceParameterRegistry;
const AS = require("../client/js/appearance/appearanceStateStore.js").AppearanceStateStore;
const TR = require("../client/js/designTuning/designTuningParameterRegistry.js");
const TS = require("../client/js/designTuning/designTuningStateStore.js");
const UI = require("../client/js/ui/coreUi.js");
const explicit = { color: "#123456", alpha: .73 }, separator = { color: "#abcdef", alpha: .41 };
function harness(A = Appearance, T = Tuning, initial = {}) {
    const bytes = { ...initial }, css = {}, writes = [], state = { safe: true, fail: false, saves: 0 };
    const storage = { getItem: k => bytes[k] || null, setItem(k, v) { state.saves++; if (state.fail) throw Error("save-failed"); bytes[k] = v; } };
    const style = { setProperty(k, v) { css[k] = v; writes.push([k, v]); }, removeProperty(k) { delete css[k]; writes.push([k, null]); } };
    const store = TS.create({ storage, registry: TR }); store.load();
    const tuning = T.create({ registry: TR, store, rootStyle: style, readComputed: k => css[k] || ({ "--panel-border": "rgba(214,178,94,.22)", "--separator": "rgba(214,178,94,.16)", "--input-border": "rgba(214,178,94,.16)" }[k]) || "12px", isProjectionSafe: () => state.safe, parseShadow: UI.parseShadowValue, serializeShadow: UI.serializeShadowValue, parseColorAlpha: UI.parseColorAlphaValue, serializeColorAlpha: UI.serializeColorAlphaValue, getCanonicalDuration: () => 100 });
    const appearance = A.create({ registry: AR, store: AS.create({ storage, registry: AR }), rootStyle: style, runtime: { commitBaseInput: () => true } });
    tuning.initialize(); appearance.initialize({ "base.accent": "#d6b25e" });
    return { appearance, tuning, store, bytes, css, writes, state, style };
}
function conflict(h) {
    h.tuning.setOverride("border.panel", explicit); const calibrated = h.css["--panel-border"];
    h.appearance.setBaseInput("base.accent", "#f08040"); const themed = h.css["--panel-border"];
    h.tuning.setTransientOverride("border.separator", separator); const unrelated = h.css["--panel-border"];
    h.tuning.resetParameter("border.panel"); const reset = h.css["--panel-border"];
    h.appearance.resolve(); const resolvedAgain = h.css["--panel-border"];
    return { calibrated, themed, unrelated, reset: reset || null, resolvedAgain };
}
function tests() {
    const cssSource = require("node:fs").readFileSync(require("node:path").join(__dirname,"../client/css/style.css"),"utf8");
    for (const [id,definition] of Object.entries(Rules.definitions)) {
        const literal=cssSource.match(new RegExp(definition.cssProperty+":\\s*([^;]+);"))[1];
        assert.deepEqual(Rules.legacyDefaults()[id],UI.parseColorAlphaValue(literal),"Legacy bootstrap defaults agree with canonical stylesheet");
    }
    const h = harness();
    assert.deepEqual(conflict(h), { calibrated: "rgba(18, 52, 86, 0.73)", themed: "rgba(18, 52, 86, 0.73)", unrelated: "rgba(18, 52, 86, 0.73)", reset: "rgba(240, 128, 64, 0.22)", resolvedAgain: "rgba(240, 128, 64, 0.22)" });
    for (const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]) {
        const x = harness(), actions = [()=>x.appearance.setBaseInput("base.accent", "#f08040"),()=>x.tuning.setOverride("border.panel", explicit),()=>x.tuning.setTransientOverride("border.separator", separator)];
        order.forEach(i=>actions[i]());
        assert.equal(x.css["--panel-border"], Rules.serialize(explicit));
        assert.equal(x.css["--separator"], Rules.serialize(separator));
        assert.deepEqual(x.tuning.getStyleProvenance().resolved, Rules.resolve({theme:{accent:"#f08040"},calibration:{"border.panel":explicit},calibrationPreview:{"border.separator":separator}}));
    }
    const p = Projection.forRoot(h.style), saves = h.state.saves;
    h.tuning.setOverride("border.panel", explicit);
    p.update({themePreview:{accent:"#00ff00"}});
    assert.equal(h.css["--panel-border"], Rules.serialize(explicit), "theme preview cannot bypass explicit calibration");
    assert.equal(h.css["--input-border"], "rgba(0, 255, 0, 0.16)");
    h.tuning.setTransientOverride("border.panel", separator);
    assert.equal(h.css["--panel-border"], Rules.serialize(separator));
    h.tuning.clearTransientOverride("border.panel");
    assert.equal(h.css["--panel-border"], Rules.serialize(explicit));
    p.update({themePreview:null});
    assert.equal(h.css["--input-border"], "rgba(240, 128, 64, 0.16)");
    assert.equal(h.state.saves, saves+1, "previews/cancel do not persist");
    h.appearance.preview("interaction.focus.ring", "#aabbcc");
    h.appearance.clearPreview("interaction.focus.ring");
    assert.equal(h.css["--panel-border"], Rules.serialize(explicit));
    h.tuning.setTransientOverride("border.panel", separator); h.tuning.resetParameter("border.panel");
    assert.equal(h.css["--panel-border"], "rgba(240, 128, 64, 0.22)");
    h.tuning.setOverride("border.panel", explicit); h.tuning.resetDomain("border");
    assert.equal(h.css["--separator"], "rgba(240, 128, 64, 0.16)");
    assert.equal(h.tuning.getEvidence("border").canonical["border.panel"].color,"#f08040", "canonical follows current theme, not initialization order");
    const count=h.writes.filter(([k])=>Object.values(Rules.definitions).some(d=>d.cssProperty===k)).length;
    h.appearance.resolve(); p.flush(); p.flush();
    assert.equal(h.writes.filter(([k])=>Object.values(Rules.definitions).some(d=>d.cssProperty===k)).length,count,"managed projection is idempotent");
    h.state.safe=false; h.state.fail=true;
    const receipt=h.tuning.setOverride("border.panel",explicit);
    assert.deepEqual([receipt.accepted,receipt.applied,receipt.persisted],[true,false,false]);
    h.appearance.setBaseInput("base.accent","#010203");
    assert.equal(h.css["--panel-border"],"rgba(240, 128, 64, 0.22)","Appearance cannot bypass deferred calibration");
    assert.equal(h.tuning.getStyleProvenance().pending,true);
    assert.equal(h.tuning.getStyleProvenance().projected.values["border.panel"],h.css["--panel-border"]);
    h.state.safe=true; h.tuning.flushPendingProjection();
    assert.equal(h.css["--panel-border"],Rules.serialize(explicit));
    assert.equal(h.tuning.getPersistenceState().persisted,false,"flush is not persistence");
    h.state.fail=false; assert.equal(h.tuning.retrySave().persisted,true);
    const bytes=h.bytes[TS.storageKey]; h.tuning.setTransientOverride("border.panel",separator); h.tuning.restoreSaved();
    assert.equal(h.css["--panel-border"],Rules.serialize(explicit)); assert.equal(h.bytes[TS.storageKey],bytes);
    const provenance=h.appearance.getStyleProvenance(); assert.throws(()=>{provenance.resolved.values["border.panel"]="red";},TypeError);
    assert.throws(()=>p.update({calibration:{"border.panel":{color:"red",alpha:1}}}),TypeError);
    assert.equal(p.getState().resolved.values["border.panel"],Rules.serialize(explicit));
    const other=harness(); assert.notEqual(other.css["--panel-border"],h.css["--panel-border"]);
    assert.equal(Projection.forRoot(h.style),p); assert.throws(()=>Projection.forRoot(h.style,{targets:{}}));
    const saved=harness(Appearance,Tuning,{[TS.storageKey]:JSON.stringify({version:1,overrides:{"border.panel":{color:"#d6b25e",alpha:.22}}})});
    saved.appearance.setBaseInput("base.accent","#f08040"); assert.equal(saved.css["--panel-border"],"rgba(214, 178, 94, 0.22)","explicit value equal to old default remains an override");
    console.log("PASS semantic styles: original conflict, 6 update orders, scoped previews/cancel/reset, current-theme provenance, idempotence, deferred/save failure, explicit-default identity and isolated roots.");
}
if(require.main===module) tests();
module.exports={harness,conflict,tests};
