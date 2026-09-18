"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),src=path.join(root,'client/reference/src');
const load=name=>import(pathToFileURL(path.join(src,name)).href);
(async()=>{
 const {schemas,collect}=require('./ui-reference/build.cjs');
 const {REGISTRY_SCHEMAS}=await load('lab/registry-schema.js'),{DATA}=await load('production-data.js');
 assert.deepEqual(REGISTRY_SCHEMAS,JSON.parse(JSON.stringify(schemas())),'Reference Registry definitions must be the current real schema, including conditions/actions/i18n');
 assert.deepEqual(DATA,JSON.parse(JSON.stringify(collect())),'Settings parameter registry snapshot must be current');
 const {RegistrySession}=await load('lab/registry-model.js');const kit=new RegistrySession('kit');
 kit.setContext('noComp');assert.equal(kit.run('createFeatureStack'),null);kit.setContext('text');assert.equal(kit.run('createFeatureStack').preview,true);assert.equal(kit.state.canRefresh,true);
 kit.set('componentKind','iconGrid');assert.equal(kit.visible(kit.field('columns')),true);assert.equal(kit.visible(kit.field('paddingX')),false);
 const {MemoryStore}=await load('memory-store.js');const store=new MemoryStore({n:1});let notifications=0;const unsubscribe=store.subscribe(()=>notifications++);store.change(d=>d.n=2);store.failSave=true;const failed=store.flush();assert.equal(failed.persisted,false);assert.equal(failed.fixtureSaved,false);assert.equal(store.dirty,true);assert.equal(store.saved.n,1);store.failSave=false;assert.equal(store.flush().fixtureSaved,true);assert.equal(store.dirty,false);store.change(d=>d.n=3);store.reload();assert.equal(store.data.n,2);unsubscribe();store.dispose();assert.equal(store.listeners.size,0);assert.ok(notifications>0);
 // Exercise the actual CurveView command and playback methods with a controlled
 // frame queue, including callbacks deliberately delivered after cancellation.
 const {CurveView}=await load('lab/curve-view.js');
 const previousGlobals={requestAnimationFrame:global.requestAnimationFrame,cancelAnimationFrame:global.cancelAnimationFrame,document:global.document};
 try{
  let nextFrame=0,draws=0;const pending=new Map(),allFrames=new Map(),button={textContent:'',focus(){}};
  global.requestAnimationFrame=fn=>{const id=++nextFrame;pending.set(id,fn);allFrames.set(id,fn);return id;};global.cancelAnimationFrame=id=>pending.delete(id);global.document={hidden:false};
  const curves=[{id:'A',durationMs:100},{id:'B',durationMs:200},{id:'C',durationMs:300}];
  const v=Object.assign(Object.create(CurveView.prototype),{ui:{curveId:'A',node:0,playhead:0},playing:false,playEpoch:0,frame:null,disposed:false,root:{querySelector:()=>button},current(){return curves.find(c=>c.id===this.ui.curveId);},render(){},drawPreview(){draws++;}});
  const open=id=>v.click({target:{closest:()=>({dataset:{cvAction:'open',id}})}});
  const tick=delta=>{const id=v.frame,fn=pending.get(id);pending.delete(id);fn(v.last+delta);};
  open('A');assert.equal(pending.size,0);assert.equal(v.ui.playhead,0);
  v.play();tick(30);v.play();open('B');assert.equal(v.playing,false);assert.equal(v.ui.playhead,0);assert.equal(pending.size,0);
  open('A');v.play();const stale=allFrames.get(v.frame);tick(20);open('B');stale(v.last+500);assert.equal(v.ui.playhead,0);assert.equal(pending.size,0);
  open('A');v.play();tick(101);assert.equal(v.ui.playhead,1);assert.equal(v.playing,false);open('B');assert.equal(v.ui.playhead,0);assert.equal(pending.size,0);
  open('A');v.play();const late=allFrames.get(v.frame);open('B');open('C');open('B');v.play();const live=v.frame,count=draws;late(v.last+1000);assert.equal(v.frame,live);assert.equal(draws,count);assert.deepEqual([...pending.keys()],[live]);
  v.disposed=true;v.stop();allFrames.get(live)(v.last+1000);assert.equal(pending.size,0);assert.equal(draws,count);
 }finally{for(const [key,value]of Object.entries(previousGlobals))if(value===undefined)delete global[key];else global[key]=value;}
 const actual=await require('./ui-reference/capture-vela-fixtures.cjs').capture();const saved=JSON.parse(fs.readFileSync(path.join(src,'vela-fixtures.json'),'utf8'));
 assert.deepEqual(actual,saved,'Every fixture must still be emitted by actual Runtime/Conversation ports, not a visual timeline');
 const {referencePhase}=await load('vela-projection.js');for(const [name,f]of Object.entries(actual))assert.equal(referencePhase(f),name);
 const {copy:translate,locale}=await load('copy.js');
 const vocabulary=new Set(Object.entries(DATA.dictionaries.en).filter(([key])=>key.startsWith('reference.ui.')).map(([,text])=>text));
 for(const file of ['app.js','settings.js','registry.js','vela.js','size-probe.js','lab/palette-view.js','lab/curve-view.js','lab/registry-view.js','lab/registry-graph.js','lab/color-picker.js','lab/asset-runtime.js']){
  const text=fs.readFileSync(path.join(src,file),'utf8');
  for(const match of text.matchAll(/\bcopy\((['"])([^'"\n]+)\1/g))assert.ok(vocabulary.has(match[2]),file+' has untranslated fixed copy: '+match[2]);
 }
 locale.value='zh-CN';assert.equal(translate('Color picker'),'颜色选择器');assert.equal(translate('Enter a value from {min} to {max}, using the field step.',{min:-400,max:500}),'请输入 -400 至 500 之间的数值，并遵循字段步长。');assert.equal(translate('Keep My Asset'),'Keep My Asset');locale.value='en';
 assert.equal(actual.partial.driver.logicalPlan.completedStepCount,1);assert.equal(actual.partial.trajectory.terminal.attempts[0].verification.scope,'committed-target');assert.equal(actual.failed.trajectory.terminal.attempts[0].execution.hostCommitted,true);assert.equal(actual.failed.trajectory.terminal.attempts[0].verification.matches,false);
 const paletteModel=require('../client/js/palette/paletteModel');const fixture={revision:1,id:'fixture',metadata:{displayName:'Fixture · 模拟',family:'reference',origin:'custom'},slots:[{id:'solid',label:'Solid',kind:'DIRECT',value:{color:'#B5ADE9'}}]};assert.equal(paletteModel.validatePalette(fixture).ok,true);assert.equal(paletteModel.validatePalette({...fixture,slots:[{id:'gradient',label:'Gradient',kind:'gradient',paint:{}}]}).ok,false,'Lab gradient is not a Palette v2 slot');
 const html=fs.readFileSync(path.join(root,'client/reference/index.html'),'utf8'),bundle=fs.readFileSync(path.join(root,'client/reference/reference.bundle.js'),'utf8');assert.match(html,/connect-src 'none'/);assert.doesNotMatch(bundle,/localStorage\.(?:setItem|removeItem|clear)|evalScript\(|new CSInterface|fetch\(/);assert.match(fs.readFileSync(path.join(root,'client/js/uiReferenceLauncher.js'),'utf8'),/setAttribute\("sandbox", "allow-scripts"\)/);
 console.log('PASS UI reference: exact schemas, Settings definitions, fixture checkpoint failure/recovery, actual Runtime/port snapshots, partial/Verify facts, Palette v2 boundary and no live I/O.');
})().catch(e=>{console.error(e);process.exitCode=1;});
