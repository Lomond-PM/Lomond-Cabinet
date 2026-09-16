'use strict';
const assert=require('assert'),fs=require('fs');
const {harness,prepareFeatureSamples}=require('./fixtures/ad-component-detach-harness');
let assertions=0;const records=[];
function eq(a,b,label){assertions++;assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),label);}
function ok(value,label){assertions++;assert.ok(value,label);}
function setup(t=2.5){
 const h=harness(['  原文 日本語 %25 \\u0000\n"quote"  '],'text');
 eq(h.registered('createFeatureStack').ok,true,'actual registered Create');
 h.source=h.layers[0];h.ctrl=h.layers[1];h.bg=h.layers[2];h.comp.selectedLayers=[h.ctrl];h.comp.time=t;
 h.fields=prepareFeatureSamples(h);
 h.ctrl.properties.position.value=[300,200];h.ctrl.properties.anchor.value=[10,20];
 h.source.properties.anchor.value=[5,7];
 h.events.length=0;return h;
}
function layerFlags(h){return h.layers.map(l=>{
 const record={name:l.name};
 for(const key of ['matchName','locked','threeDLayer','collapseTransformation','canSetCollapseTransformation','nullLayer','continuouslyRasterize']){
  try{record[key]=l[key]===undefined?'[unavailable]':l[key];}catch(e){record[key]='[throws: '+e.message+']';}
 }
 try{record.sourceKind=l.source===null?'null':l.source instanceof h.host.sandbox.CompItem?'CompItem':l.source instanceof h.host.sandbox.FootageItem?'FootageItem':'unknown';}catch(e){record.sourceKind='[throws: '+e.message+']';}
 return record;
});}
function snap(h){return {time:h.comp.time,layers:h.snapshot(),flags:layerFlags(h),fields:h.fields.map(f=>({key:f.key,value:f.prop.value,expression:f.prop.expression,enabled:f.prop.expressionEnabled,keys:f.prop.numKeys}))};}
function run(h,id){const before=snap(h);h.events.length=0;const result=h.detach();const after=snap(h);eq(after.flags,before.flags,id+' flags/types preserved');eq(h.events.filter(e=>e.op==='flagWrite'),[],id+' no flag assignments');records.push({caseId:id,time:h.comp.time,before,result,after,events:h.events.slice()});return result;}
function rejected(id,change,reason){const h=setup();change(h);const before=snap(h);const result=run(h,id);eq(result.ok,false,id);ok(/preflight/.test(result.message),id+' preflight');if(reason)ok(reason.test(result.message),id+' reaches intended admission: '+result.message);eq(snap(h),before,id+' zero property changes');eq(h.events.filter(e=>e.op!=='sample'),[],id+' zero writes/Undo');}
// F1a: production Create supplies exact templates and metadata. The factories now
// model observed Text/Vector collapse=true, canSet=false, not one-off bypasses.
{
 const h=setup();
 for(const [layer,matchName] of [[h.source,'ADBE Text Layer'],[h.bg,'ADBE Vector Layer']]){
  eq([layer.matchName,layer.collapseTransformation,layer.canSetCollapseTransformation],[matchName,true,false],'observed factory flags');
 }
 eq([h.ctrl.matchName,h.ctrl.nullLayer,h.ctrl.collapseTransformation],['ADBE AV Layer',true,false],'actual addNull factory');
 const result=run(h,'F1a-real-shaped-feature');eq(result.ok,true,result.message);
 eq(h.fields.map(f=>f.prop.expression),['','','','',''],'five real template properties finalized');
 eq(h.source.properties.position.value,[302.5,205],'source parent path');
 eq(h.bg.properties.position.value,[303,204.5],'Text source also admitted as background ancestor');
 eq(h.source.comment,'  原文 日本語 %25 \\u0000\n"quote"  ','original comment restored');
}
for(const kind of ['text','shape','av','precomp']){
 const h=setup(),parent=h.add('external user comment','external '+kind,kind);
 parent.properties.position.value=[50,30];parent.properties.anchor.value=[4,6];h.ctrl.parent=parent;
 const result=run(h,'F1a-translation-parent-'+kind);eq(result.ok,true,result.message);
 eq(h.source.properties.position.value,[348.5,229],'type-admitted parent translation unchanged');
 eq(h.bg.properties.position.value,[349,228.5],'nested translation unchanged');
 ok(h.ctrl.parent===parent,'external relationship protected');eq(parent.comment,'external user comment','external data protected');
}
for(const member of ['source','bg','ctrl']){
 rejected('F1a-'+member+'-locked',h=>h[member].locked=true,/locked layer/);
 rejected('F1a-'+member+'-3D',h=>h[member].threeDLayer=true,/unsupported 3D layer/);
 rejected('F1a-'+member+'-unknown-type',h=>h[member].matchName='ADBE Unknown Layer',/unknown\/unreadable layer type/);
 for(const key of ['matchName','locked','threeDLayer','collapseTransformation','canSetCollapseTransformation']){
  rejected('F1a-'+member+'-throws-'+key,h=>h[member].faults.readProperties=[key],key==='matchName'?/unknown\/unreadable layer type/:/unreadable layer flags/);
 }
 for(const key of ['threeDLayer','collapseTransformation','canSetCollapseTransformation']){
  rejected('F1a-'+member+'-missing-'+key,h=>delete h[member][key],/unavailable layer flags/);
 }
}
function parentReject(id,kind,options,change,reason){rejected(id,h=>{const p=h.add('intact user','parent '+kind,kind,options);h.ctrl.parent=p;if(change)change(p,h);},reason);}
for(const kind of ['text','shape']){
 parentReject('F1a-'+kind+'-parent-3D',kind,{threeD:true},null,/parent space unsupported 3D/);
 parentReject('F1a-'+kind+'-parent-scale',kind,{scale:[120,100]},null,/unit scale, zero rotation/);
 parentReject('F1a-'+kind+'-parent-rotation',kind,{rotation:10},null,/unit scale, zero rotation/);
 for(const key of ['matchName','threeDLayer','collapseTransformation','canSetCollapseTransformation']){
  parentReject('F1a-'+kind+'-parent-throws-'+key,kind,{},p=>p.faults.readProperties=[key],key==='matchName'?/parent space unknown\/unreadable layer type/:/parent space unreadable layer flags/);
 }
}
// These keep valid artifact metadata/templates; reasons prove the type/space gate
// was reached, instead of attributing an earlier metadata failure to collapse.
parentReject('F1a-collapsed-precomp','precomp',{collapse:true},null,/unsupported collapsed precomp/);
parentReject('F1a-collapsed-precomp-canSet-false','precomp',{collapse:true,canSetCollapse:false},null,/unsupported collapsed precomp/);
parentReject('F1a-rasterized-footage-canSet-false','av',{collapse:true,canSetCollapse:false},null,/unsupported rasterized AV space/);
parentReject('F1a-continuous-footage','av',{continuous:true},null,/unsupported rasterized AV space/);
parentReject('F1a-camera-canSet-false','camera',{canSetCollapse:false},null,/unknown\/unreadable layer type/);
parentReject('F1a-unknown-source','av',{},p=>p.source={},/unknown AV source type/);
parentReject('F1a-unavailable-type','av',{},p=>delete p.matchName,/unknown\/unreadable layer type/);
parentReject('F1a-unknown-source-canSet-false','av',{canSetCollapse:false},p=>p.source={},/unknown AV source type/);
parentReject('F1a-nonboolean-null-flag','av',{},p=>p.nullLayer=0,/unavailable AV space flags/);
parentReject('F1a-nonboolean-continuous-flag','av',{},p=>p.continuouslyRasterize='false',/unavailable AV space flags/);
for(const key of ['threeDLayer','collapseTransformation','canSetCollapseTransformation']){
 parentReject('F1a-nonboolean-parent-'+key,'shape',{},p=>p[key]='false',/unavailable layer flags/);
}
for(const key of ['source','nullLayer','continuouslyRasterize']){
 parentReject('F1a-unreadable-AV-'+key,'av',{},p=>p.faults.readProperties=[key],/unreadable AV source\/space flags/);
}
rejected('F1a-member-precomp-collapse',h=>{h.ctrl.source=new h.host.sandbox.CompItem();h.ctrl.nullLayer=false;h.ctrl.collapseTransformation=true;},/unsupported collapsed precomp/);
rejected('F1a-member-rasterized-footage',h=>{h.ctrl.nullLayer=false;h.ctrl.collapseTransformation=true;h.ctrl.canSetCollapseTransformation=false;},/unsupported rasterized AV space/);
rejected('F1a-member-unknown-source',h=>{h.ctrl.nullLayer=false;h.ctrl.source={};},/unknown AV source type/);
{
 const h=setup(),parent=h.add('external','ordinary footage','av');h.ctrl.parent=parent;
 // continuouslyRasterize was an optional existing heuristic, not a required AE API.
 delete parent.continuouslyRasterize;delete h.ctrl.continuouslyRasterize;
 const result=run(h,'F1a-AV-without-optional-continuous-flag');eq(result.ok,true,result.message);
}
for(const t of [2.5,7.25]){
 const h=setup(t), oldCount=h.layers.length;
 const corner=h.ctrl.property('ADBE Effect Parade').property('Corner Radius').property(1);
 corner.numKeys=2;corner.evaluate=time=>5+time;corner.expression='controller animation';h.fields.find(f=>f.key==='round').prop.evaluate=time=>corner.valueAtTime(time,false);
 const result=run(h,'finalize-at-'+t);eq(result.ok,true,result.message);
 for(const f of h.fields){eq(f.prop.expression,'',f.key+' expression released');eq(f.prop.expressionEnabled,false,f.key+' disabled');}
 eq(h.source.properties.position.value,[300-10+10+t,200-20+20+2*t],'source evaluated local -> comp');
 eq(h.bg.properties.position.value,[300-10+10+t-5+3+t,200-20+20+2*t-7+4+t],'background nested parent translation');
 eq(h.fields.find(f=>f.key==='size').prop.value,[100+t,40+t],'evaluated size not base');
 eq(h.fields.find(f=>f.key==='round').prop.value,5+t,'animated controller sample');
 eq(h.fields.find(f=>f.key==='color').prop.value,[0.1,0.2,0.3,1],'evaluated fill');
 eq(corner.numKeys,2,'controller keys retained');eq(corner.expression,'controller animation','controller driver retained');
 eq(h.source.comment,'  原文 日本語 %25 \\u0000\n"quote"  ','original exact');
 eq(h.layers.length,oldCount,'no deletion');eq(h.source.parent,null,'source released');eq(h.bg.parent,null,'background released');eq(h.comp.time,t,'time not moved');
 const firstWrite=h.events.findIndex(e=>!['sample','begin'].includes(e.op));
 const initial=h.events.slice(0,firstWrite).filter(e=>e.op==='sample');
 ok(initial.length>=5,'preflight reads present');
 for(const f of h.fields)ok(initial.some(e=>e.key===f.key),'sample '+f.key+' before first mutation');
 ok(h.events.filter(e=>e.op==='sample').every(e=>e.t===t&&e.preExpression===false),'all samples and verification use exact time, post expression');
 ok(h.events.slice(firstWrite).filter(e=>e.op==='sample').every(e=>h.fields.some(f=>f.key===e.key)),'only readback of planned writes after dependency mutation');
 eq(h.events.filter(e=>e.op==='begin').length,1,'one Undo');eq(h.events.filter(e=>e.op==='end').length,1,'ended');
 const last=h.events.filter(e=>e.op==='comment').at(-1);eq(last.layer,h.ctrl.name,'controller metadata last');
 const after=snap(h);eq(h.detach().ok,false,'repeat explicitly unavailable');eq(snap(h),after,'repeat leaves restored original');
}
{
 const h=setup(3.25);
 // Archived actual AE B1 returns length-three Position/Anchor/Scale even on 2D layers.
 for(const l of [h.source,h.ctrl,h.bg]) {
  l.properties.position.value.push(0);l.properties.anchor.value.push(0);l.properties.scale.value.push(100);
 }
 for(const f of h.fields.filter(f=>/Position/.test(f.key))){const evaluate=f.prop.evaluate;f.prop.evaluate=t=>evaluate(t).concat(0);}
 const result=run(h,'2D-three-component-AE-shape');eq(result.ok,true,result.message);
 eq(h.source.properties.position.value,[303.25,206.5,0],'source retains AE vector arity');
 eq(h.bg.properties.position.value,[304.5,206.75,0],'background compensates translation with neutral Z');
}
for(const key of ['sourcePosition','backgroundPosition','size','round','color']){
 rejected(key+'-keys',h=>h.fields.find(f=>f.key===key).prop.numKeys=1);
 rejected(key+'-user-expression',h=>h.fields.find(f=>f.key===key).prop.expression+='\n// user edit');
 rejected(key+'-read-failure',h=>h.fields.find(f=>f.key===key).prop.failSample=true);
 rejected(key+'-expression-error',h=>h.fields.find(f=>f.key===key).prop.expressionError='fixture evaluation failure');
 rejected(key+'-not-writable',h=>h.fields.find(f=>f.key===key).prop.setValue=null);
 rejected(key+'-invalid-number',h=>h.fields.find(f=>f.key===key).prop.evaluate=()=>NaN);
 rejected(key+'-saved-expression',h=>{const p=h.fields.find(f=>f.key===key).prop;p.expression=p.expression.replace('previousExpressionEncoded=','previousExpressionEncoded=value%2B1');});
}
rejected('wrong-artifact',h=>{const p=h.fields[0].prop;p.expression=p.expression.replace(/artifactId=[^\n]+/,'artifactId=foreign');});
rejected('wrong-role',h=>{h.fields[0].prop.expression=h.fields[0].prop.expression.replace('role=sourceLayerBinding','role=generatedLayer');});
rejected('unknown-body',h=>{h.fields[0].prop.expression=h.fields[0].prop.expression.replace('var gap=','var modified=');});
rejected('saved-disabled-user-expression',h=>{h.fields[0].prop.expression=h.fields[0].prop.expression.replace('previousExpressionEncoded=','previousExpressionEncoded=%25ZZ');});
rejected('expression-disabled',h=>h.fields[0].prop.expressionEnabled=false);
rejected('wrong-dimension',h=>h.fields[0].prop.evaluate=()=>[1,2,3]);
rejected('negative-size',h=>h.fields.find(f=>f.key==='size').prop.evaluate=()=>[-1,2]);
rejected('negative-roundness',h=>h.fields.find(f=>f.key==='round').prop.evaluate=()=>-1);
rejected('separated-position',h=>h.source.properties.position.dimensionsSeparated=true);
rejected('locked',h=>h.source.locked=true);
rejected('3D',h=>h.source.threeDLayer=true);
rejected('parent-scale',h=>h.ctrl.properties.scale.value=[120,100]);
rejected('parent-rotation',h=>h.ctrl.properties.rotation.value=30);
rejected('protected-anchor-expression',h=>h.source.properties.anchor.expression='value');
rejected('missing-parent-release-api',h=>h.bg.setParentWithJump=null);
rejected('external-source-parent',h=>h.source.parent=h.add('user','external'));
rejected('user-replaced-source-comment',h=>h.source.comment='user replacement');
rejected('controller-effect-error',h=>h.ctrl.property('ADBE Effect Parade').property('Gap').property(1).expressionError='bad effect');
rejected('nonfinite-time',h=>h.comp.time=NaN);
rejected('additional-owned-property',h=>{
 const extra=h.source.properties.rotation;extra.expression=h.fields[0].prop.expression;
 const original=h.source.property;h.source.numProperties=1;h.source.property=k=>k===1?extra:original(k);
});
rejected('unowned-active-dependency-on-released-layer',h=>{
 const vectors=h.bg.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');
 vectors.property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Opacity').expression='parent.opacity';
});
rejected('unsafe-third-scale-component',h=>h.ctrl.properties.scale.value=[100,100,50]);
rejected('infinite-controller-value',h=>h.ctrl.property('ADBE Effect Parade').property('Gap').property(1).value=Infinity);
for(const [delta,accepted] of [[0.00005,true],[0.0002,false]]){
 const h=setup(),p=h.fields.find(f=>f.key==='round').prop,set=p.setValue;
 p.setValue=function(v){set.call(this,v+delta);};
 eq(run(h,'fixed-geometry-tolerance-'+delta).ok,accepted,'predeclared geometry tolerance');
}
{
 const h=setup(), other=h.add('unrelated','user layer'), external=h.add('external','external');
 external.properties.position.value=[50,30];external.properties.anchor.value=[4,6];h.ctrl.parent=external;
 other.parent=h.ctrl;other.properties.rotation.expression='value+time';other.properties.rotation.numKeys=3;
 h.source.properties.rotation.numKeys=2; // not written: zero rotation at this t, animation kept.
 const before=[other.comment,other.properties.rotation.expression,other.properties.rotation.numKeys,h.source.properties.rotation.numKeys];
 const result=run(h,'protected-unrelated-and-external');eq(result.ok,true,result.message);
 ok(h.ctrl.parent===external,'external parent retained');ok(other.parent===h.ctrl,'unowned relationship retained');
 eq([other.comment,other.properties.rotation.expression,other.properties.rotation.numKeys,h.source.properties.rotation.numKeys],before,'unwritten animations/data retained');
 eq(h.source.properties.position.value,[348.5,229],'external ancestry contributes to comp target');
}
for(const fault of ['failWrite','failExpression','parent','comment','verify']){
 const h=setup();
 if(fault==='parent')h.bg.faults.parent=true;
 else if(fault==='comment')h.bg.faults.comment=true;
 else if(fault==='verify') {const p=h.fields.find(f=>f.key==='size').prop, original=p.setValue;p.setValue=function(v){original.call(this,v);this.value=[0,0];};}
 else h.fields[2].prop[fault]=true;
 const result=run(h,'execution-'+fault);eq(result.ok,false,'runtime failure');ok(/incomplete/.test(result.message),'partial result');ok(/no rollback/.test(result.message),'no rollback claim');
 eq(h.events.filter(e=>e.op==='end').length,1,'runtime group ended');ok(h.ctrl.comment.startsWith(h.prefix),'controller recovery metadata retained');
 if(fault!=='comment')ok(h.source.comment.startsWith(h.prefix),'all metadata survives property/parent failure');
 ok(h.events.some(e=>['expression','parent','setValue'].includes(e.op)),'actual mutation attempts recorded');
}
{
 const h=setup();eq(h.registered('refreshSelectedComponent').ok,true,'normal registered Refresh');
 eq(h.registered('removeSelectedGeneratedComponent').ok,true,'normal registered Remove unchanged');
 eq(h.source.comment,'  原文 日本語 %25 \\u0000\n"quote"  ','Remove still restores comment');
}
console.log('A08-F1/F1a current-frame Detach: '+assertions+' assertions PASS (full production Host; synthetic evaluation/parent model, no real AE/Undo)');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({command:process.argv.join(' '),assertions,records},null,2)+'\n',{flag:'wx'});
