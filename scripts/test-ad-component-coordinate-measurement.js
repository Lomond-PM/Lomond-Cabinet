"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { harness } = require("./fixtures/ad-component-detach-harness");
const beforeMode = process.argv.includes("--before");
const records = [], failures = [];
let assertions = 0;
const plain = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "number" && !Number.isFinite(v) ? String(v) : v));
function check(value, label) { assertions++; assert.ok(value, label); }
function equal(a, b, label) { assertions++; assert.deepStrictEqual(plain(a), plain(b), label); }
function modelPoint(layer, point) {
    const p=layer.properties, a=p.anchor.value, s=p.scale.value, pos=p.position.value;
    const angle=p.rotation.value*Math.PI/180, x=(point[0]-a[0])*s[0]/100, y=(point[1]-a[1])*s[1]/100;
    const result=[pos[0]+Math.cos(angle)*x-Math.sin(angle)*y,pos[1]+Math.sin(angle)*x+Math.cos(angle)*y];
    return layer.parent ? modelPoint(layer.parent,result) : result;
}
function setup(kind="text", count=1) {
    const h=harness(Array(count).fill("original 中文"),kind);
    const instrumented=new Set();
    function instrument(layer) {
        if(instrumented.has(layer))return;instrumented.add(layer);
        const seen=new Set();
        function visit(p) {
            if(!p||seen.has(p))return;seen.add(p);
            if(p.setValue) p.event=e=>h.events.push({layer:layer.name,property:p.matchName,...plain(e)});
            for(let i=1;i<=Number(p.numProperties||0);i++)visit(p.property(i));
        }
        visit(layer);
        for(const p of Object.values(layer.properties))p.event=e=>h.events.push({layer:layer.name,property:p.matchName,...plain(e)});
        const isShape=layer.matchName==="ADBE Vector Layer";
        layer.sourceRectAtTime=function(t) {
            h.events.push({op:"measure-rect",layer:layer.name,time:t});
            if(isShape && layer.name.endsWith("_PILL_BG")) {
                const vectors=layer.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
                const size=vectors.property("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").value;
                return {left:-size[0]/2,top:-size[1]/2,width:size[0],height:size[1]};
            }
            return {left:0,top:0,width:100,height:50};
        };
        layer.toComp=function(p) { h.events.push({op:"measure-point",layer:layer.name,input:Array.from(p)});return modelPoint(layer,p); };
    }
    h.layers.forEach((l,i)=>{l.properties.position.value=[500,300-i*150];l.properties.anchor.value=[10,20];l.properties.scale.value=[200,150];instrument(l);});
    // Shape descendants do not exist until creation: attach observation after creation too.
    for(const name of ["addNull","addShape"]) {
        const original=h.comp.layers[name];
        h.comp.layers[name]=function(){const l=original();instrument(l);h.events.push({op:name,layer:l.name});return l;};
    }
    h.comp.time=1.25;
    h.instrument=()=>{for(const l of h.layers){instrumented.delete(l);instrument(l);}};
    h.api=h.host.sandbox.AEToolbox;
    h.act=(action,params={})=>JSON.parse(h.api.runRegisteredToolAction("ecommerceLayout",action,JSON.stringify(params)));
    h.bounds=l=>h.api.tools.adComponentKit.getLayerVisualBoundsInComp(l,h.comp.time);
    h.clear=()=>{h.events.length=0;};
    h.mutations=()=>h.events.filter(e=>["setValue","expression","parent","comment","addNull","addShape","remove","moveAfter"].includes(e.op));
    h.capture=()=>({layers:h.snapshot(),events:plain(h.events)});
    h.clear();return h;
}
const faults = {
    missing:l=>{delete l.toComp;},
    throws:l=>{l.toComp=()=>{throw Error("conversion failure");};},
    unknownReason:l=>{l.toComp=()=>{throw null;};},
    null:l=>{l.toComp=()=>null;},
    undefined:l=>{l.toComp=()=>undefined;},
    short:l=>{l.toComp=()=>[100];},
    nan:l=>{l.toComp=()=>[NaN,20];},
    infinity:l=>{l.toComp=()=>[10,Infinity];},
    stringPoint:l=>{l.toComp=()=>["100",20];},
    partial:l=>{const original=l.toComp;let calls=0;l.toComp=p=>{if(++calls===3)throw Error("third corner");return original(p);};},
    rectThrows:l=>{l.sourceRectAtTime=()=>{throw Error("source read");};},
    rectNull:l=>{l.sourceRectAtTime=()=>null;},
    rectMissing:l=>{delete l.sourceRectAtTime;},
    rectNaN:l=>{l.sourceRectAtTime=()=>({left:NaN,top:0,width:100,height:50});},
    rectInfinity:l=>{l.sourceRectAtTime=()=>({left:0,top:0,width:Infinity,height:50});},
    rectString:l=>{l.sourceRectAtTime=()=>({left:0,top:0,width:"100",height:50});},
    rectZeroWidth:l=>{l.sourceRectAtTime=()=>({left:0,top:0,width:0,height:50});},
    rectZeroHeight:l=>{l.sourceRectAtTime=()=>({left:0,top:0,width:100,height:0});},
    rectNegative:l=>{l.sourceRectAtTime=()=>({left:0,top:0,width:-1,height:50});},
    collapsedBounds:l=>{l.toComp=()=>[100,200];},
    boundsOverflow:l=>{let i=0;l.toComp=()=>[++i%2?1e308:-1e308,10+i];}
};
function scenario(id, run) {
    const record={caseId:id}; records.push(record);
    try { run(record);record.expectationsMatched=true; }
    catch(e){record.expectationsMatched=false;record.assertionError=e.message;failures.push(id);}
}
for(const [name,fault] of Object.entries(faults)) {
    scenario("measurement-"+name,r=>{const h=setup();fault(h.layers[0]);let error;try{r.returned=plain(h.bounds(h.layers[0]));}catch(e){error=e;r.error=String(e);}r.observed=h.capture();check(!!error,"measurement must explicitly fail");check(/MEASUREMENT|geometry|bounds|comp|source/i.test(String(error)),"recognizable error even without underlying reason");equal(h.mutations(),[],"measurement read only");});
    for(const entry of ["create","state","refresh"])scenario(entry+"-"+name,r=>{
        const h=setup("text",2);let bad=h.layers[1];
        if(entry==="refresh") {
            const created=h.act("createFeatureStack",{paddingX:0,paddingY:0,sortMode:"yPosition"});check(created.ok,"real creation prepares valid metadata");
            h.instrument();h.comp.selectedLayers=[h.layers.find(l=>l.name==="FEATURE_STACK_CTRL")];
        }
        fault(bad);h.clear();const snapshot=h.snapshot();
        r.returned=entry==="state"?h.host.state():h.act(entry==="create"?"createFeatureStack":"refreshSelectedComponent",{paddingX:0,paddingY:0});
        r.observed=h.capture();r.mutationCount=h.mutations().length;
        if(entry==="state") {equal(r.returned.ok,true,"state envelope");equal(r.returned.state.textLayerCount,1,"only usable text geometry");equal(r.returned.state.twoDLayerCount,1,"only usable grid candidate geometry");}
        else {equal(r.returned.ok,false,"action fails");check(typeof r.returned.message==="string"&&r.returned.message.length>0,"existing error envelope");check(/ACK_MEASUREMENT_/.test(r.returned.message),"actual measurement rejection, not a later support gate");}
        equal(h.snapshot(),snapshot,"all source/generated data retained on failure");equal(h.mutations(),[],"no Anchor/Rect/Position/parent/expression or layer creation");equal(h.events.filter(e=>e.op==="begin").length,0,"preflight before Undo");
    });
}
scenario("normal-measurement",r=>{const h=setup();r.returned=plain(h.bounds(h.layers[0]));equal(r.returned,{left:480,top:270,right:680,bottom:345,width:200,height:75,centerX:580,centerY:307.5},"independent simple2D arithmetic");});
scenario("normal-create-sort-union",r=>{
    const h=setup("text",2);r.returned=h.act("createFeatureStack",{paddingX:0,paddingY:0,sortMode:"yPosition"});r.observed=h.capture();
    equal(r.returned.ok,true,"create success");equal(r.returned.items.map(x=>x.textName),["source1","source0"],"actual geometric sorting");equal(r.returned.originalCenter,[580,232.5],"two-layer union center");equal(r.returned.items.map(x=>x.pillSize),[[200,75],[200,75]],"per item measured sizes");
    equal(h.events.filter(e=>e.op==="begin").length,1,"one Undo group");equal(h.events.filter(e=>e.op==="end").length,1,"balanced group");
    const first=h.events.findIndex(e=>e.op==="begin");check(!h.events.slice(first).some(e=>e.op.startsWith("measure-")),"all Create geometry reads before writes");
});
scenario("normal-refresh-translation-parent",r=>{
    const h=setup("text",2);h.layers.forEach(l=>{l.properties.scale.value=[100,100];});check(h.act("createFeatureStack",{paddingX:0,paddingY:0}).ok,"prepare via production");h.instrument();h.comp.selectedLayers=[h.layers.find(l=>l.name==="FEATURE_STACK_CTRL")];h.clear();
    r.before=h.snapshot();r.returned=h.act("refreshSelectedComponent");r.observed=h.capture();
    equal(r.returned.ok,true,"refresh success");equal(h.layers.length,5,"no new/deleted layers");equal(h.events.filter(e=>e.op==="begin").length,1,"one Undo");equal(h.events.filter(e=>e.op==="end").length,1,"balanced Undo");
    const first=h.events.findIndex(e=>e.op==="begin");check(!h.events.slice(first).some(e=>e.op.startsWith("measure-")),"no post-mutation geometry measurement");
});
function refreshFixture() {
    const h=setup("text",2);h.layers.forEach(l=>{l.properties.scale.value=[100,100];});
    check(h.act("createFeatureStack",{paddingX:0,paddingY:0}).ok,"prepare full production component");
    h.instrument();h.comp.selectedLayers=[h.layers.find(l=>l.name==="FEATURE_STACK_CTRL")];h.clear();return h;
}
for(const [name,change] of Object.entries({
    backgroundMissing:h=>{delete h.layers.find(l=>l.name.endsWith("_PILL_BG")).toComp;},
    parentScale:h=>{h.comp.selectedLayers[0].properties.scale.value=[120,100];},
    parentRotation:h=>{h.comp.selectedLayers[0].properties.rotation.value=10;},
    source3D:h=>{h.layers[0].threeDLayer=true;},
    sourceUnknownExpression:h=>{h.layers[0].properties.position.expression="value+[time,0]";},
    sourceKeys:h=>{h.layers[0].properties.anchor.numKeys=1;},
    backgroundExtraGroup:h=>{h.layers.find(l=>l.name.endsWith("_PILL_BG")).property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");},
    sourceParentExpression:h=>{h.comp.selectedLayers[0].properties.position.expression="value+thisComp.layer(1).position";}
}))scenario("refresh-boundary-"+name,r=>{
    const h=refreshFixture();change(h);h.clear();r.before=h.snapshot();r.returned=h.act("refreshSelectedComponent");r.observed=h.capture();
    equal(r.returned.ok,false,"bounded preflight rejects "+name);equal(h.snapshot(),r.before,"rejection preserves data");equal(h.mutations(),[],"no mutations");equal(h.events.filter(e=>e.op==="begin").length,0,"no Undo before plan");
});
scenario("refresh-execution-setter-failure",r=>{
    const h=refreshFixture();h.layers.find(l=>l.name.endsWith("_PILL_BG")).properties.position.failWrite=true;
    r.returned=h.act("refreshSelectedComponent");r.observed=h.capture();equal(r.returned.ok,false,"setter exception not success");check(/partial/.test(r.returned.message),"partial failure explicit");check(h.mutations().length>0,"writes before failing setter visible");equal(h.events.filter(e=>e.op==="end").length,1,"Undo always ends");
});
scenario("refresh-compatible-original-model",r=>{
    // Independent fixture arithmetic: union center (397.5,296.5), controller (400,300),
    // two 104-high pills with gap14 -> local centers (-2.5,-62.5),(-2.5,55.5).
    const h=harness(["original","second"],"text");check(h.registered("createFeatureStack").ok,"real metadata writer");
    h.layers[0].properties.anchor.value=[5,7];h.comp.selectedLayers=[h.layers.find(l=>l.name==="FEATURE_STACK_CTRL")];
    r.returned=h.registered("refreshSelectedComponent");r.after=h.snapshot();equal(r.returned,{ok:true,message:"Component refreshed (2 item(s))."},"existing envelope/content");
    equal(h.layers.slice(0,2).map(l=>l.properties.anchor.value),[[0,0],[0,0]],"centered anchors");
    equal(h.layers.slice(0,2).map(l=>l.properties.position.value),[[-2.5,-62.5],[-2.5,55.5]],"retained successful positions");
    for(const bg of h.layers.filter(l=>l.name.endsWith("_PILL_BG"))){const rect=bg.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property("ADBE Vector Shape - Rect");equal(rect.property("ADBE Vector Rect Size").value,[148,104],"retained pill geometry");}
});
scenario("state-no-valid-geometry",r=>{const h=setup();faults.missing(h.layers[0]);r.returned=h.host.state();equal(r.returned.state.canCreateFeatureStack,false,"no usable text");equal(r.returned.state.canCreateIconGrid,false,"no usable geometry");equal(h.mutations(),[],"state read only");});
scenario("refresh-external-translation-parent",r=>{
    const h=harness(["original","second"],"text");check(h.registered("createFeatureStack").ok,"real creation");
    const ctrl=h.layers.find(l=>l.name==="FEATURE_STACK_CTRL");
    const external=h.add("unrelated 中文","external","null",{position:[70,30],anchor:[5,7]});
    ctrl.parent=external;h.layers[0].properties.anchor.value=[5,7];h.comp.selectedLayers=[ctrl];
    const unrelated=h.snapshot().find(l=>l.name==="external");
    r.returned=h.registered("refreshSelectedComponent");r.after=h.snapshot();
    equal(r.returned.ok,true,"translation ancestor with nonzero Anchor admitted");
    // Comp union moves by (65,23); conversion back to controller space cancels that offset.
    equal(h.layers.slice(0,2).map(l=>l.properties.position.value),[[-2.5,-62.5],[-2.5,55.5]],"parent-space targets remain correct");
    check(ctrl.parent===external,"external relation retained");
    equal(h.snapshot().find(l=>l.name==="external"),unrelated,"external user data retained");
});
scenario("legacy-does-not-substitute-grid-api",r=>{
    const h=setup();delete h.layers[0].toComp;
    check(typeof h.layers[0].sourcePointToComp==="function","Grid API independently available");
    try{r.returned=h.bounds(h.layers[0]);}catch(e){r.error=String(e);}
    check(/ACK_MEASUREMENT_TO_COMP_FAILED/.test(r.error),"no API priority or support expansion");
});
for(const name of ["rectThrows","rectZeroWidth","rectNaN"])scenario("AV-no-invalid-rect-replacement-"+name,r=>{const h=setup("av");faults[name](h.layers[0]);try{r.returned=h.bounds(h.layers[0]);}catch(e){r.error=String(e);}check(!!r.error,"bad existing rect cannot use width/height");});
scenario("normal-state",r=>{const h=setup();r.returned=h.host.state();equal(r.returned.state.canCreateFeatureStack,true,"Feature ready");equal(r.returned.state.canCreateIconGrid,true,"Grid ready");equal(h.mutations(),[],"state no write");});
scenario("shape-without-rect",r=>{const h=setup("shape");faults.rectNull(h.layers[0]);try{r.returned=h.bounds(h.layers[0]);}catch(e){r.error=String(e);}check(!!r.error,"no Shape width fallback");});
scenario("AV-explicit-source-size",r=>{const h=setup("av");delete h.layers[0].sourceRectAtTime;r.returned=plain(h.bounds(h.layers[0]));equal([r.returned.width,r.returned.height],[200,120],"AV width100 height80 transformed");});
scenario("grid-strict-compatible",r=>{const h=setup("shape");r.returned=h.act("createIconGrid",{normalizeMode:"none"});equal(r.returned.ok,true,"strict Grid successful API preserved");});
scenario("grid-strict-rejection",r=>{const h=setup("shape");h.layers[0].sourcePointToComp=()=>[NaN,1];r.returned=h.act("createIconGrid");equal(r.returned.reason,"GRID_NON_FINITE_BOUNDS","unchanged Grid reason");equal(h.mutations(),[],"Grid preflight");});
const summary={stage:beforeMode?"before":"after",scenarios:records.length,assertions,matched:records.length-failures.length,failed:failures.length,failures};
if(process.env.A09_EVIDENCE_DIR){const out=path.resolve(process.env.A09_EVIDENCE_DIR);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,summary.stage+"-records.json"),JSON.stringify({summary,records},null,2)+"\n",{flag:beforeMode?"wx":"w"});fs.writeFileSync(path.join(out,summary.stage+"-summary.json"),JSON.stringify(summary,null,2)+"\n",{flag:beforeMode?"wx":"w"});}
console.log(JSON.stringify(summary));
if(!beforeMode&&failures.length)process.exitCode=1;
