// C1 only: real production entry + accepted B artifact, with closed Host reads.
const {serve,root}=require('./server.cjs');
const {chromium}=require('playwright');
const {PNG}=require('playwright-core/lib/utilsBundle');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {environment}=require('./f4-mechanism.cjs');
const raw=root+'/.tmp/vela-evidence/0.3.13-c1',engine=process.env.C1_ENGINE||'edge';
const baseline='4b47568c4c63e7eb97b7eb6bde0bc9f3c7a2a9c7';
function displayRead(s){const prefix='AEToolbox.VelaContext.handle(';if(!s.startsWith(prefix))return false;try{return JSON.parse(JSON.parse(s.slice(prefix.length,-1))).operation==='getCapabilities';}catch{return false;}}
const old=p=>execFileSync('git',['show',baseline+':'+p],{cwd:root,encoding:'utf8',maxBuffer:8e6});
function pixelDiff(a,b){a=PNG.sync.read(a);b=PNG.sync.read(b);assert.equal(a.width,b.width);assert.equal(a.height,b.height);let changed=0,max=0;for(let i=0;i<a.data.length;i+=4){const d=Math.max(...[0,1,2].map(k=>Math.abs(a.data[i+k]-b.data[i+k])));if(d){changed++;max=Math.max(max,d);}}return {changed,max,pixels:a.width*a.height};}
async function run(){
 fs.mkdirSync(raw,{recursive:true});
 const server=await serve(),browser=await chromium.launch({executablePath:process.env.UI_REFERENCE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
 const rows=[],errors=[];let env;
 const context=await browser.newContext({viewport:{width:420,height:680},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===server.url?route.continue():route.abort());
 async function page(){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));if(!env)env=await environment(browser,p);return p;}
 try{
  const schemas=Object.values(require('./build.cjs').schemas());
  const prod=await page();
  const productionBootstrap=({schemas,origin})=>{
   if(location.pathname!=='/client/index.html')return;
   window.__c1Host=[];window.__c1Writes=[];
   const set=CSSStyleDeclaration.prototype.setProperty,remove=CSSStyleDeclaration.prototype.removeProperty;
   for(const [name,fn]of [['setProperty',set],['removeProperty',remove]])CSSStyleDeclaration.prototype[name]=function(key,...rest){if(this===document.documentElement.style&&['--panel-border','--input-border','--separator'].includes(key))window.__c1Writes.push({name,key,value:rest[0],stack:new Error().stack});return fn.call(this,key,...rest);};
   window.__adobe_cep__={getSystemPath:()=>origin,getHostEnvironment:()=>JSON.stringify({appName:'ISOLATED C1 FIXTURE',appVersion:'NO AE'}),evalScript(source,cb){window.__c1Host.push(source);let value={ok:false,message:'No live Host'};if(source.startsWith('$.evalFile('))value='';else if(source==='AEToolbox.ping()')value='AEToolbox host loaded';else if(source==='AEToolbox.getRegisteredTools()')value={ok:true,tools:schemas,loadErrors:[]};else if(source==='AEToolbox.getSelectionSummary()')value={ok:true,statusId:'no-active-comp',selectedCount:0};setTimeout(()=>cb(typeof value==='string'?value:JSON.stringify(value)),0);}};
  };
  await prod.addInitScript(productionBootstrap,{schemas,origin:server.url});
  await prod.goto(server.url+'/client/index.html');await prod.waitForFunction(()=>window.CoreAppearance&&window.AEToolboxDesignTuning);
  await prod.locator('[data-tool=settings]').click();await prod.waitForFunction(()=>!document.querySelector('#appShell').classList.contains('is-animating'));
  await prod.evaluate(()=>document.querySelector('#settingsCategoryAppearance')._coreDisclosure.setExpanded(true));
  await prod.evaluate(()=>AEToolboxDesignTuning.setOverride('border.panel',{color:'#123456',alpha:.73}));
  // Real Settings field -> applyThemeAccent -> Appearance owner -> projector.
  await prod.locator('#themeAccentHex').fill('#f08040');await prod.locator('#themeAccentHex').dispatchEvent('change');
  const conflict=await prod.evaluate(()=>{
   const dt=AEToolboxDesignTuning,app=CoreAppearance,out=[];
   const capture=label=>{const state=app.getStyleProvenance(),style=getComputedStyle(document.documentElement),values=Object.fromEntries(Object.entries(state.targets).map(([id,property])=>[id,style.getPropertyValue(property).trim()]));out.push({label,css:values['border.panel'],values,field:getComputedStyle(document.querySelector('.settings-section')).borderColor,provenance:state});};
   capture('real-settings-change');dt.setTransientOverride('border.separator',{color:'#778899',alpha:.5});capture('unrelated-preview');
   dt.resetParameter('border.panel');capture('reset');app.resolve();capture('repeat');
   const shell=document.querySelector('#appShell');shell.classList.add('is-animating');
   const set=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('C1 save fault');};
   let receipt;try{receipt=dt.setOverride('border.panel',{color:'#123456',alpha:.73});}finally{Storage.prototype.setItem=set;}
   app.setBaseInput('base.accent','#010203');capture('deferred');shell.classList.remove('is-animating');dt.flushPendingProjection();capture('flushed');
   return {out,receipt,storage:dt.getPersistenceState(),writers:window.__c1Writes,host:window.__c1Host};
  });
  rows.push({production:conflict});
  assert.equal(conflict.out[0].css,'rgba(18, 52, 86, 0.73)');assert.equal(conflict.out[1].css,conflict.out[0].css);
  assert.equal(conflict.out[2].css,'rgba(240, 128, 64, 0.22)');assert.equal(conflict.out[3].css,conflict.out[2].css);assert.equal(conflict.out[4].css,conflict.out[2].css);
  assert.deepEqual([conflict.receipt.accepted,conflict.receipt.applied,conflict.receipt.persisted],[true,false,false]);
  assert.equal(conflict.out[5].css,conflict.out[0].css);assert.equal(conflict.storage.persisted,false);
  for(const row of conflict.out){assert.deepEqual(row.values,row.provenance.projected.values);assert.equal(row.field,row.values['border.separator'],'Actual Settings separator consumes the resolved role');}
  assert.ok(conflict.writers.every(w=>w.name==='setProperty'&&w.stack.includes('semanticStyleProjection.js')),'one writer stack only');
  assert.ok(conflict.host.every(s=>displayRead(s)||s.startsWith('$.evalFile(')||['AEToolbox.ping()','AEToolbox.getRegisteredTools()','AEToolbox.getSelectionSummary()'].includes(s)),JSON.stringify(conflict.host));
  // Isolated reference cannot inherit this production calibration or storage.
  const ref=await page();await ref.goto(server.url+'/client/launcher-fixture');await ref.locator('#launch').click();let frame=ref.frames().find(f=>f.parentFrame());await frame.waitForFunction(()=>window.ReferenceStyleProvenance);
  const isolated=await frame.evaluate(()=>({style:ReferenceStyleProvenance(),storage:(()=>{try{localStorage.getItem('anything');return 'allowed';}catch{return 'denied';}})()}));
  assert.equal(isolated.storage,'denied');assert.equal(isolated.style.shell.resolved.values['border.panel'],'rgba(41, 42, 49, 1)');assert.equal(await ref.locator('iframe').getAttribute('sandbox'),'allow-scripts');
  await frame.locator('[data-route=settings]').evaluate(e=>e.click());
  await frame.locator('[data-reg-collapse="tuning-border"]').evaluate(e=>e.click());
  await frame.locator('[data-reg-value="border.panel.color"]').fill('#123456');await frame.locator('[data-reg-value="border.panel.color"]').dispatchEvent('change');
  const preview=await frame.evaluate(()=>ReferenceStyleProvenance().settings);assert.equal(preview.resolved.provenance['border.panel'].source,'design-tuning-preview');
  await frame.locator('[data-save]').evaluate(e=>e.click());const saved=await frame.evaluate(()=>ReferenceStyleProvenance().settings);assert.equal(saved.resolved.provenance['border.panel'].source,'design-tuning-override');
  assert.equal(await prod.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--panel-border').trim()),'rgba(18, 52, 86, 0.73)');
  rows.push({isolated,preview,saved});await ref.close();await prod.close();
  // Fresh, empty browser profiles for ordinary production compatibility. No
  // calibration from the conflict fixture is treated as a default input.
  const compatibility=[];
  for(const version of ['before','after']){
   const isolatedContext=await browser.newContext({viewport:{width:420,height:680},reducedMotion:'reduce'});
   try{
    await isolatedContext.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
    const p=await isolatedContext.newPage();p.on('pageerror',e=>errors.push(e.stack));
    await p.addInitScript(productionBootstrap,{schemas,origin:server.url});
    if(version==='before')for(const file of ['appearance/appearanceResolver.js','designTuning/designTuningResolver.js','main.js'])await p.route('**/client/js/'+file+'?*',r=>r.fulfill({body:old('client/js/'+file),contentType:'text/javascript'}));
    await p.goto(server.url+'/client/index.html');await p.waitForFunction(()=>window.CoreAppearance&&window.AEToolboxDesignTuning);
    const samples=[];
    for(const route of ['home','registry','settings']){
     if(route==='registry')await p.locator('[data-tool=ecommerceLayout]').click();
     if(route==='settings'){await p.locator('#backBtn').click();await p.waitForFunction(()=>!document.querySelector('#appShell').classList.contains('is-animating'));await p.locator('[data-tool=settings]').click();}
     await p.waitForFunction(()=>!document.querySelector('#appShell').classList.contains('is-animating'));
     await p.mouse.move(0,0);await p.evaluate(()=>document.activeElement.blur());
     const roles=await p.evaluate(()=>{
      const style=getComputedStyle(document.documentElement),out={};
      for(const key of ['--panel-border','--input-border','--separator','--border-default','--border-subtle','--field-border','--gold','--text-primary','--surface-panel','--ui-scale'])out[key]=style.getPropertyValue(key).trim();
      for(const sel of ['#appShell','#settingsPanel','.settings-section','.registry-field']){const el=document.querySelector(sel);if(el){const s=getComputedStyle(el);out[sel]=Object.fromEntries(['fontSize','fontWeight','color','backgroundColor','borderColor','padding','gap'].map(k=>[k,s[k]]));}}
      return out;
     });
     await p.screenshot({path:raw+'/'+engine+'-'+version+'-production-'+route+'.png',animations:'disabled',caret:'hide'});samples.push({route,roles});
    }
    compatibility.push(samples);
   }finally{await isolatedContext.close();}
  }
  assert.deepEqual(compatibility[1],compatibility[0],'Production non-conflicting style roles remain compatible');rows.push({compatibility});
  // Exact same-engine raster comparison with the accepted repository artifact.
  for(const spec of [{width:320,height:500,theme:'light',scale:'1.18',lang:'zh-CN'},{width:420,height:680,theme:'dark',scale:'1',lang:'en'},{width:720,height:640,theme:'light',scale:'0.62',lang:'zh-CN'}]){
   for(const [route,variant]of [['registry','kit'],['settings',null],['vela',null],['palette','palette'],['palette','curve']]){
    const images=[];
    for(const version of ['before','after']){
     const p=await page();await p.setViewportSize(spec);
     if(version==='before')for(const file of ['reference.bundle.js','reference.css'])await p.route('**/client/reference/'+file,r=>r.fulfill({body:old('client/reference/'+file),contentType:file.endsWith('js')?'text/javascript':'text/css'}));
     await p.goto(server.url+'/client/reference/index.html');await p.waitForFunction(()=>window.ReferenceState);
     await p.locator('select[data-theme]').selectOption(spec.theme,{force:true});await p.locator('[data-scale]').selectOption(spec.scale,{force:true});await p.locator('[data-locale]').selectOption(spec.lang,{force:true});
     await p.locator('[data-route='+route+']').evaluate(e=>e.click());if(variant&&variant!=='kit')await p.locator('[data-variant='+variant+']').evaluate(e=>e.click());
     if(route==='palette')await p.locator(variant==='curve'?'[data-cv-action=open]':'[data-pal-action=open]').first().evaluate(e=>e.click());
     await p.mouse.move(0,0);await p.evaluate(()=>document.activeElement.blur());await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     images.push(await p.screenshot({path:raw+'/'+engine+'-'+version+'-'+route+'-'+(variant||'page')+'-'+spec.width+'.png',animations:'disabled',caret:'hide'}));await p.close();
    }
    const diff=pixelDiff(...images);rows.push({spec,route,variant,diff});assert.equal(diff.changed,0,'Unintended accepted-reference visual change: '+JSON.stringify({spec,route,variant,diff}));
   }
  }
  // Compare the actual generated opaque iframe, not only standalone CSS/JS.
  for(const theme of ['dark','light']){
   const images=[];
   for(const version of ['before','after']){
    const p=await page();await p.goto(server.url+'/client/launcher-fixture');
    if(version==='before'){const scope={window:{}};vm.runInNewContext(old('client/reference/embedded.js'),scope);await p.evaluate(doc=>Object.defineProperty(window,'UIReferenceArtifact',{configurable:true,value:doc}),scope.window.UIReferenceArtifact);}
    await p.locator('#launch').click();const f=p.frames().find(f=>f.parentFrame());await f.waitForFunction(()=>window.ReferenceState);await f.locator('[data-route=vela]').evaluate(e=>e.click());await f.locator('select[data-theme]').selectOption(theme,{force:true});
    await p.mouse.move(0,0);await f.evaluate(()=>document.activeElement.blur());await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    images.push(await p.screenshot({path:raw+'/'+engine+'-'+version+'-iframe-'+theme+'.png',animations:'disabled',caret:'hide'}));await p.close();
   }
   const diff=pixelDiff(...images);rows.push({iframe:true,theme,diff});assert.equal(diff.changed,0,'Opaque iframe visual drift');
  }
  assert.deepEqual(errors,[]);console.log('PASS '+engine+': real production conflict/field/deferred/save/writer provenance, sandbox isolation, 15 accepted page raster comparisons + 2 opaque iframe comparisons.');
 }finally{fs.writeFileSync(raw+'/'+engine+'-c1.json',JSON.stringify({baseline,environment:env,rows,errors},null,2));await context.close();await browser.close();await server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
