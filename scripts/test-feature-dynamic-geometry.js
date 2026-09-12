// A09-M1c: text, admission and independent arithmetic; never real AE expression proof.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const {harness, featureProperties, prepareFeatureSamples} = require('./fixtures/ad-component-detach-harness');
const {candidate, legacySource, legacyPills} = require('./fixtures/feature-expression-contract');
let assertions=0, activeRecord; const records=[];
function check(value, label) {assertions++; assert.ok(value,label);}
function equal(a,b,label) {assertions++; assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),label);}
function scenario(name, fn) {
 activeRecord={name};records.push(activeRecord);
 try {fn();activeRecord.pass=true;}catch(error){activeRecord.pass=false;activeRecord.error=String(error.stack);}
}
function body(prop) {return prop.expression.split('\n').slice(7).join('\n');}
scenario('new-create-v2',()=>{
 const h=harness(['original'],'text'); check(h.registered('createFeatureStack').ok,'Create');
 const fields=featureProperties(h);
 for(const f of fields.filter(f=>!['round','color'].includes(f.key)))check(body(f.prop).startsWith('// ACK_FEATURE_GEOMETRY_V2\n'),'V2 '+f.key);
 equal(body(fields.find(f=>f.key==='round').prop),candidate.roundness,'Roundness unchanged');
 equal(body(fields.find(f=>f.key==='color').prop),candidate.fillColor,'Fill unchanged');
});
const guard='if (!ctrl || Number(ctrl.effect("Pill Width Mode")(1))!==0 || Number(ctrl.effect("Text Align")(1))!==1) { throw new Error("ACK_FEATURE_UNSUPPORTED_PARAMETERS: auto/center required"); }';
const resolver=[
 '  function layerFromRef(ref) {', '    try {', '      var byIndex = thisComp.layer(ref.i);',
 '      if (byIndex && byIndex.name == ref.n) { return byIndex; }', '    } catch (e1) {}',
 '    return thisComp.layer(ref.n);', '  }',
 '  for (var refIndex=0;refIndex<refs.length;refIndex++) { refs[refIndex]=layerFromRef(refs[refIndex]); }'
].join('\n');
function canonicalCandidate(text,key) {
 text=text.replace('// ACK_FEATURE_GEOMETRY_V2\n','').replace(guard+'\n','');
 if(key==='sourcePosition') {
  text=text.replace(/  var refs = .*;\n  var itemIndex = (\d+);\n/,(_,i)=>'var refs=[thisComp.layer("A09_M1B_TEXT_A"),thisComp.layer("A09_M1B_TEXT_B")];\nvar itemIndex='+i+';\n');
  text=text.replace(resolver+'\n','');
 }
 return text;
}
scenario('d0-fulltext-and-legacy-frozen',()=>{
 const h=harness(['A','B'],'text');check(h.registered('createFeatureStack').ok,'Create');
 let i=0;
 for(const f of featureProperties(h)) {
  const key=f.key==='sourcePosition'?'sourcePosition'+(['A','B'][i++]):({backgroundPosition:'backgroundPosition',size:'rectSize',round:'roundness',color:'fillColor'}[f.key]);
  equal(canonicalCandidate(body(f.prop),f.key),candidate[key],'D0 exact normalized '+key);
 }
 const source=fs.readFileSync('host/tools/adComponentKit.jsx','utf8').replace(/\r\n/g,'\n');
 function extracted(start,end){return vm.runInNewContext('('+source.slice(source.indexOf('    function '+start),source.indexOf('    function '+end)).trim()+')');}
 equal(extracted('legacyFeatureTextPositionExpression(', 'bindFeatureTextPositionToController(')('[{i:9,n:"A"}]',0),legacySource('[{i:9,n:"A"}]',0),'full frozen V1 source');
 const pillText=source.slice(source.indexOf('    function legacyFeaturePillExpressions('),source.indexOf('    // CURRENT/V2:')).trim();
 equal(vm.runInNewContext('('+pillText+')')(),legacyPills(),'full frozen V1 pill bodies');
});

function properties(layer) {
 const out=[];
 function visit(p,path) {
  out.push({path,value:p.value,expression:p.expression,enabled:p.expressionEnabled,keys:p.numKeys,writes:p.writes});
  for(let i=1;i<=(p.numProperties||0);i++)visit(p.property(i),path+'/'+i);
 }
 visit(layer,'layer');return out;
}
function snapshot(h) {return JSON.stringify({time:h.comp.time,layers:h.layers.map(l=>({id:l.id,name:l.name,comment:l.comment,parent:l.parent&&l.parent.id,properties:properties(l)}))});}
function instrument(h) {
 function visit(p) {if(p.setValue)p.event=e=>h.events.push(e);for(let i=1;i<=(p.numProperties||0);i++)visit(p.property(i));}
 h.layers.forEach(visit);h.events.length=0;
}
function reject(h,action,params,reason) {
 instrument(h);const before=snapshot(h),r=h.registered(action,params);
 equal(r.ok,false,'reject');check(/preflight/.test(r.message),'explicit preflight');
 if(reason)check(r.message.includes(reason),reason+': '+r.message);
 equal(snapshot(h),before,'all read properties, metadata, parent, count/time retained');
 equal(h.events.filter(e=>!['sample'].includes(e.op)),[],'no writes or Undo group');
 activeRecord.rejection=r;
 return r;
}
function fixture(version='V2',options={}) {
 const h=harness(['user A','user B'],'text',options);
 check(h.registered('createFeatureStack').ok,'fixture Create');
 h.texts=h.layers.filter(l=>l.matchName==='ADBE Text Layer');h.ctrl=h.layers.find(l=>l.name==='FEATURE_STACK_CTRL');
 h.bgs=h.layers.filter(l=>l.name.endsWith('_PILL_BG'));
 if(version==='V1') {
  const old=legacyPills();
  for(const f of featureProperties(h)) {
   let text;
   if(f.key==='sourcePosition') {
    const match=/\n  var refs = (\[[^\r\n]*\]);\n  var itemIndex = ([0-9]+);\n/.exec(f.prop.expression);
    text=legacySource(match[1],Number(match[2]));
   } else text=old[{backgroundPosition:0,size:1,round:2,color:3}[f.key]];
   f.prop.expression=f.prop.expression.split('\n').slice(0,7).join('\n')+'\n'+text;
  }
 }
 h.comp.selectedLayers=[h.ctrl];return h;
}
const sourceFaults={
 'nonuniform-rotation':(h,l)=>{l.properties.scale.value=[140,90];l.properties.rotation.value=8;},
 'zero-scale':(h,l)=>{l.properties.scale.value=[0,100];},
 'negative-scale':(h,l)=>{l.properties.scale.value=[-100,100];},
 'nan-scale':(h,l)=>{l.properties.scale.value=[NaN,100];},
 'anchor-keys':(h,l)=>{l.properties.anchor.numKeys=1;},
 'scale-keys':(h,l)=>{l.properties.scale.numKeys=1;},
 'rotation-keys':(h,l)=>{l.properties.rotation.numKeys=1;},
 'position-keys':(h,l)=>{l.properties.position.numKeys=1;},
 'anchor-expression':(h,l)=>{l.properties.anchor.expression='value';},
 'scale-expression':(h,l)=>{l.properties.scale.expression='value';},
 'rotation-expression':(h,l)=>{l.properties.rotation.expression='value';},
 'unknown-position':(h,l)=>{l.properties.position.expression='value';},
 'disabled-expression':(h,l)=>{l.properties.scale.expression='value';l.properties.scale.expressionEnabled=false;},
 'three-d':(h,l)=>{l.threeDLayer=true;},
 'nonneutral-z':(h,l)=>{l.properties.anchor.value=[0,0,1];},
 'separated-position':(h,l)=>{l.properties.position.dimensionsSeparated=true;},
 'locked-source':(h,l)=>{l.locked=true;}
};
for(const [name,change] of Object.entries(sourceFaults))for(const action of ['createFeatureStack','refreshSelectedComponent'])scenario(action+'-'+name,()=>{
 const h=action==='createFeatureStack'?harness(['A','B'],'text'):fixture();
 change(h,h.layers[1]);reject(h,action);
});
for(const [name,change] of Object.entries({
 scale:p=>{p.properties.scale.value=[110,100];},rotation:p=>{p.properties.rotation.value=8;},
 positionExpression:p=>{p.properties.position.expression='value';},scaleKeys:p=>{p.properties.scale.numKeys=1;},
 anchorExpression:p=>{p.properties.anchor.expression='value';},positionKeys:p=>{p.properties.position.numKeys=1;},
 threeD:p=>{p.threeDLayer=true;},unknownType:p=>{p.matchName='Unknown Layer';}
}))for(const action of ['createFeatureStack','refreshSelectedComponent'])scenario(action+'-external-'+name,()=>{
 const h=action==='createFeatureStack'?harness(['A'],'text'):fixture();
 const p=h.add('external','external','null');(h.ctrl||h.layers[0]).parent=p;change(p);reject(h,action);
});
for(const action of ['createFeatureStack','refreshSelectedComponent'])scenario(action+'-multiple-parent-chain',()=>{
 const h=action==='createFeatureStack'?harness(['A'],'text'):fixture();
 const p=h.add('external','parent','null'),q=h.add('external','grandparent','null');p.parent=q;(h.ctrl||h.layers[0]).parent=p;
 reject(h,action,null,'PARENT_CHAIN');
});
for(const [name,change] of Object.entries({
 extraGroup:(h,b)=>b.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'),
 extraShape:(h,b)=>b.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Ellipse'),
 groupScale:(h,b)=>{b.property('ADBE Root Vectors Group').property(1).property('ADBE Vector Transform Group').property('ADBE Vector Scale').value=[120,100];},
 groupRotation:(h,b)=>{b.property('ADBE Root Vectors Group').property(1).property('ADBE Vector Transform Group').property('ADBE Vector Rotation').value=8;},
 groupSkew:(h,b)=>{b.property('ADBE Root Vectors Group').property(1).property('ADBE Vector Transform Group').property('ADBE Vector Skew').value=5;},
 groupAnchor:(h,b)=>{b.property('ADBE Root Vectors Group').property(1).property('ADBE Vector Transform Group').property('ADBE Vector Anchor').value=[1,0];},
 rectPosition:(h,b)=>{b.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group').property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Position').value=[1,0];},
 localScale:(h,b)=>{b.properties.scale.value=[110,100];},
 localRotation:(h,b)=>{b.properties.rotation.value=8;},
 anchor:(h,b)=>{b.properties.anchor.value=[1,0];},
 wrongParent:(h,b)=>{b.parent=h.ctrl;},
 missingSize:(h,b)=>{featureProperties(h).find(f=>f.layer===b&&f.key==='size').prop.expression='';},
 disabledSize:(h,b)=>{featureProperties(h).find(f=>f.layer===b&&f.key==='size').prop.expressionEnabled=false;},
 forgedBasis:(h,b)=>{b.sourcePointToComp=p=>[400+p[0]*1.1,300+p[1]];},
 unavailableBasis:(h,b)=>{const convert=b.sourcePointToComp;b.sourcePointToComp=function(p){if(p[0]===1&&p[1]===0)throw Error('basis unreadable');return convert.call(this,p);};}
}))scenario('refresh-background-'+name,()=>{const h=fixture('V1');change(h,h.bgs[1]);reject(h,'refreshSelectedComponent');});
for(const [name,value] of [['Pill Width Mode',1],['Pill Width Mode',2],['Pill Width Mode',0.1],['Text Align',0],['Text Align',2],['Padding X',-1],['Gap',NaN]])scenario('refresh-parameter-'+name+'-'+value,()=>{
 const h=fixture('V1');h.ctrl.property('ADBE Effect Parade').property(name).property(1).value=value;reject(h,'refreshSelectedComponent');
});
for(const params of [{pillWidthMode:'fixed'},{pillWidthMode:'unknown'},{textAlign:'left'},{textAlign:'unknown'},{paddingX:-1}])scenario('create-parameters-'+JSON.stringify(params),()=>reject(harness(['A'],'text'),'createFeatureStack',params));
for(const version of ['V1','V2']) {
 scenario(version+'-refresh-exact-and-migrate',()=>{
  const h=fixture(version), before=featureProperties(h).map(f=>f.prop.expression);
  instrument(h);equal(h.registered('refreshSelectedComponent').ok,true,'Refresh exact '+version);
  for(const f of featureProperties(h).filter(f=>!['round','color'].includes(f.key)))check(body(f.prop).startsWith('// ACK_FEATURE_GEOMETRY_V2\n'),'only V2 after apply');
  const begin=h.events.findIndex(e=>e.op==='begin'),first=h.events.findIndex(e=>e.op==='expression');check(begin>=0&&first>begin,'migration starts after complete plan/Undo begins');
  if(version==='V2')equal(featureProperties(h).map(f=>f.prop.expression),before,'V2 idempotent exact bodies');
 });
 for(const key of ['sourcePosition','backgroundPosition','size','round','color'])scenario(version+'-mutated-'+key,()=>{
  const h=fixture(version),f=featureProperties(h).find(f=>f.key===key);f.prop.expression+='\n// edited';reject(h,'refreshSelectedComponent');
 });
 for(const churn of [false,true])scenario(version+'-detach-locator-churn-'+churn,()=>{
  const h=fixture(version,{wrapperChurn:churn});prepareFeatureSamples(h);const result=h.detach();
  equal(result.ok,true,'A08 known exact '+version+' '+JSON.stringify(result));
  for(const l of h.texts) {equal(l.comment,l===h.texts[0]?'user A':'user B','prior comments');check(!l.properties.position.expression,'source binding finalized');}
 });
 for(const protection of ['edited','history','wrongRole','wrongArtifact','disabled'])scenario(version+'-detach-protect-'+protection,()=>{
  const h=fixture(version),f=featureProperties(h)[0];prepareFeatureSamples(h);
  if(protection==='edited')f.prop.expression+='\n// user';
  if(protection==='history')f.prop.expression=f.prop.expression.replace('// previousExpressionEncoded=','// previousExpressionEncoded=value');
  if(protection==='wrongRole')f.prop.expression=f.prop.expression.replace('// role=sourceLayerBinding','// role=generatedLayer');
  if(protection==='wrongArtifact')f.prop.expression=f.prop.expression.replace('// artifactId=','// artifactId=other');
  if(protection==='disabled')f.prop.expressionEnabled=false;
  instrument(h);const before=snapshot(h);equal(h.detach().ok,false,'protected');equal(snapshot(h),before,'A08 zero data changes');
 });
}
scenario('refresh-v1-later-member-rejection-never-migrates',()=>{
 const h=fixture('V1');h.bgs[1].properties.scale.value=[99,100];reject(h,'refreshSelectedComponent',{},'BACKGROUND_COMP_BASIS');
 for(const f of featureProperties(h))check(!body(f.prop).startsWith('// ACK_FEATURE_GEOMETRY_V2'),'all V1 preserved');
});
scenario('refresh-stale-indices-resolve-exact-members',()=>{
 const h=fixture('V1');for(const l of h.layers)l.index+=10;
 equal(h.registered('refreshSelectedComponent').ok,true,'stored indices can age; exact body plus names/membership');
});
scenario('refresh-rejects-noncanonical-literal-refs',()=>{
 const h=fixture('V1');const p=featureProperties(h)[0].prop;p.expression=p.expression.replace(/(var refs = \[.*)\];/,'$1,];');
 reject(h,'refreshSelectedComponent',{},'SOURCE_REFERENCES');
});
for(const name of ['source0','line\nbreak','line\u2028break'])scenario('create-unambiguous-expression-refs-'+JSON.stringify(name),()=>{
 const h=harness(['A'],'text');
 if(name==='source0')h.add('unrelated','source0','text');else h.layers[0].name=name;
 reject(h,'createFeatureStack',{},'AMBIGUOUS_SOURCE_NAME');
});
for(const [ratio,accepted] of [[1+0.5e-8,true],[1+2e-8,false]])scenario('fixed-uniform-ratio-epsilon-'+ratio,()=>{
 const h=harness(['A'],'text');h.layers[0].properties.scale.value=[133*ratio,133];h.layers[0].properties.rotation.value=8;
 if(accepted)check(h.registered('createFeatureStack').ok,'fixed ratio inside');else reject(h,'createFeatureStack',{},'NONUNIFORM_ROTATION');
});
for(const version of ['V1','V2'])scenario(version+'-Create-exact-rebind-preflight',()=>{
 const h=fixture(version);h.comp.selectedLayers=[h.texts[0]];
 equal(h.registered('createFeatureStack').ok,true,'existing exact rebind preserved');
 const broken=fixture(version);broken.comp.selectedLayers=[broken.texts[0]];broken.bgs[1].properties.scale.value=[90,100];
 reject(broken,'createFeatureStack',{},'BACKGROUND_COMP_BASIS');
});
scenario('refresh-neutral-3d-vector-readback-on-2d-layers',()=>{
 const h=fixture();for(const l of h.layers){l.properties.anchor.value.push(0);l.properties.position.value.push(0);l.properties.scale.value.push(100);}
 equal(h.registered('refreshSelectedComponent').ok,true,'native 2D values can include neutral Z');
});
scenario('refresh-basis-uses-exact-host-points',()=>{
 const h=fixture(),seen=[];for(const b of h.bgs){const f=b.sourcePointToComp;b.sourcePointToComp=function(p){seen.push([b.name,...p]);return f.call(this,p);};}
 equal(h.registered('refreshSelectedComponent').ok,true,'basis passes');
 for(const b of h.bgs)equal(seen.filter(p=>p[0]===b.name).slice(-3).map(p=>p.slice(1)),[[0,0],[1,0],[0,1]],'actual Host point inputs');
});
for(const delta of [0.00005,0.0002])scenario('fixed-basis-epsilon-'+delta,()=>{
 const h=fixture();h.bgs[0].sourcePointToComp=p=>[400+p[0]*(1+delta),300+p[1]];
 if(delta<1e-4)equal(h.registered('refreshSelectedComponent').ok,true,'inside predeclared 1e-4');else reject(h,'refreshSelectedComponent',{},'BACKGROUND_COMP_BASIS');
});
for(const [scale,rotation] of [[[140,90],0],[[133,133],8],[[75,75],-8],[[100,100],0]])scenario('create-supported-'+scale+'-'+rotation,()=>{
 const h=harness(['A'],'text'),l=h.layers[0];l.properties.anchor.value=[12,18];l.properties.position.value=[440,260];l.properties.scale.value=scale;l.properties.rotation.value=rotation;
 const result=h.registered('createFeatureStack');equal(result.ok,true,'supported '+JSON.stringify(result));
 const field=featureProperties(h).find(f=>f.key==='size');
 const r=l.sourceRectAtTime(h.comp.time),a=rotation*Math.PI/180;
 equal(field.prop.value.map(x=>Math.round(x*1e8)),[(Math.abs(Math.cos(a)*r.width*scale[0]/100)+Math.abs(Math.sin(a)*r.height*scale[1]/100)+48),(Math.abs(Math.sin(a)*r.width*scale[0]/100)+Math.abs(Math.cos(a)*r.height*scale[1]/100)+24)].map(x=>Math.round(x*1e8)),'independent pre-expression AABB dimensions');
 // Explicit synthetic D0-style static compensation readback, not an AE parenting implementation.
 const bg=field.layer;bg.properties.scale.value=[10000/scale[0],10000/scale[1]];bg.properties.rotation.value=-rotation;
 h.comp.selectedLayers=[h.layers.find(l=>l.name==='FEATURE_STACK_CTRL')];equal(h.registered('refreshSelectedComponent').ok,true,'supported measured unit basis');
});

// Mathematical model only. toComp/fromComp below are explicit affine substitutes,
// not Host APIs; independent expected uses center/half-extent projection, not builders.
function affineModel(anchor,position,scale,rotation,parent) {
 const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sx=scale[0]/100,sy=scale[1]/100;
 const layer={anchor,position,scale,rotation,parent};
 layer.toComp=p=>{const x=(p[0]-anchor[0])*sx,y=(p[1]-anchor[1])*sy,q=[layer.position[0]+c*x-s*y,layer.position[1]+s*x+c*y];return parent?parent.toComp(q):q;};
 layer.fromComp=p=>{const q=parent?parent.fromComp(p):p,x=q[0]-layer.position[0],y=q[1]-layer.position[1];return [anchor[0]+(c*x+s*y)/sx,anchor[1]+(-s*x+c*y)/sy];};
 layer.transform={anchorPoint:anchor,scale,rotation};return layer;
}
function oracle(rect,a,p,s,r,translation) {
 const rad=r*Math.PI/180,c=Math.cos(rad),n=Math.sin(rad),x=(rect.left+rect.width/2-a[0])*s[0]/100,y=(rect.top+rect.height/2-a[1])*s[1]/100;
 const center=[translation[0]+p[0]+c*x-n*y,translation[1]+p[1]+n*x+c*y];
 const extent=[Math.abs(c*rect.width*s[0]/100)+Math.abs(n*rect.height*s[1]/100),Math.abs(n*rect.width*s[0]/100)+Math.abs(c*rect.height*s[1]/100)];
 return {center,extent};
}
function close(a,b,label){
 (activeRecord.comparisons||(activeRecord.comparisons=[])).push({label,actual:a,expected:b,absoluteError:Math.abs(a-b),epsilon:1e-4});
 check(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-4,label+' '+a+' vs '+b);
}
for(const external of [false,true])for(const changed of [false,true])for(const controllerAnchor of [[0,0],[10,20]])scenario('independent-affine-math-'+external+'-'+changed+'-'+controllerAnchor,()=>{
 const h=fixture(),fields=featureProperties(h),translation=(external?[505,283]:[440,260]).map((v,i)=>v-controllerAnchor[i]);
 const parent=external?affineModel([11,7],[76,30],[100,100],0,null):null;
 const ctrl=affineModel(controllerAnchor,[440,260],[100,100],0,parent);
 ctrl.effect=name=>()=>({'Gap':14,'Padding X':24,'Padding Y':12,'Pill Width Mode':0,'Text Align':1}[name]);
 const texts=[affineModel([12,18],[210,140],[140,90],0,ctrl),affineModel([23,9],[540,330],[133,133],8,ctrl)];
 const rects=[{left:3,top:-45,width:changed?380:300,height:35},{left:2,top:-44,width:changed?310:230,height:38}];
 texts.forEach((l,i)=>{l.name='source'+i;l.sourceRectAtTime=()=>rects[i];});
 const comp={layer:k=>typeof k==='number'?texts[k-1]:texts.find(l=>l.name===k)};
 const sourceFields=fields.filter(f=>f.key==='sourcePosition');
 texts.forEach((l,i)=>{l.position=vm.runInNewContext(body(sourceFields[i].prop),{parent:ctrl,thisComp:comp,thisLayer:l,time:0.5});});
 const expected=texts.map((l,i)=>oracle(rects[i],l.anchor,l.position,l.scale,l.rotation,translation));
 const total=expected.reduce((sum,x)=>sum+x.extent[1]+24,14);let y=-total/2;
 texts.forEach((l,i)=>{
  const bg=affineModel([0,0],[0,0],[10000/l.scale[0],10000/l.scale[1]],-l.rotation,l);
  bg.position=vm.runInNewContext(body(fields.find(f=>f.key==='backgroundPosition').prop),{parent:l,thisLayer:bg,time:0.5});
  const size=vm.runInNewContext(body(fields.find(f=>f.key==='size').prop),{parent:l,thisLayer:bg,time:0.5});
  const corners=[[-size[0]/2,-size[1]/2],[size[0]/2,-size[1]/2],[size[0]/2,size[1]/2],[-size[0]/2,size[1]/2]].map(bg.toComp);
  const actual=[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))];
  const e=expected[i],target=[e.center[0]-e.extent[0]/2-24,e.center[1]-e.extent[1]/2-12,e.center[0]+e.extent[0]/2+24,e.center[1]+e.extent[1]/2+12];
  actual.forEach((v,j)=>close(v,target[j],'comp visible AABB '+i+'/'+j));
  close(e.center[0],translation[0],'visual center X');close(e.center[1],translation[1]+y+(e.extent[1]+24)/2,'visual center Y');
  y+=e.extent[1]+24+14;
 });
 equal(h.comp.time,0,'offline action did not seek');
});
for(const mode of [1,2,0.1])scenario('runtime-guard-mode-'+mode,()=>{
 const h=fixture(),ctrl={effect:name=>()=>name==='Pill Width Mode'?mode:1};
 for(const f of featureProperties(h).filter(f=>!['round','color'].includes(f.key))) {
  let error;try{vm.runInNewContext(body(f.prop),{parent:f.key==='sourcePosition'?ctrl:{parent:ctrl}});}catch(e){error=e;}
  check(error&&String(error).includes('ACK_FEATURE_UNSUPPORTED_PARAMETERS'),'explicit parameter error '+f.key);
 }
});
for(const align of [0,2,0.9])scenario('runtime-guard-align-'+align,()=>{
 const h=fixture(),ctrl={effect:name=>()=>({valueOf:()=>name==='Pill Width Mode'?0:align})};
 for(const f of featureProperties(h).filter(f=>!['round','color'].includes(f.key))) {
  let error;try{vm.runInNewContext(body(f.prop),{parent:f.key==='sourcePosition'?ctrl:{parent:ctrl}});}catch(e){error=e;}
  check(error&&String(error).includes('ACK_FEATURE_UNSUPPORTED_PARAMETERS'),'explicit parameter error '+f.key);
 }
});
const summary={scenarios:records.length,assertions,passed:records.filter(r=>r.pass).length,failed:records.filter(r=>!r.pass).length};
if(process.env.A09_M1C_RECORDS)fs.writeFileSync(process.env.A09_M1C_RECORDS,JSON.stringify({summary,records},null,2)+'\n');
console.log(JSON.stringify(summary));
for(const r of records.filter(r=>!r.pass))console.error(r.name+': '+r.error);
if(summary.failed)process.exitCode=1;
