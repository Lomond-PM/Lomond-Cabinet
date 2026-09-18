// Dynamic geometry evidence: renders the actual artifact, not copied layout logic.
const {serve,root}=require('./server.cjs');
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
async function run(){
 const server=await serve(),browser=await chromium.launch({executablePath:process.env.UI_REFERENCE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const tag=process.env.GEOMETRY_TAG||'after',before=process.env.GEOMETRY_BEFORE==='1',results=[];
 try{const page=await browser.newPage({viewport:{width:720,height:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const scale of [.62,.92,1,1.18]){
  await page.goto(server.url+(before?'/.tmp/vela-evidence/0.3.13-b/f1/before/index.html':'/client/reference/index.html'));
  await page.locator('[data-scale]').selectOption({value:String(scale)},{force:true});await page.locator('[data-variant=controls]').evaluate(el=>el.click());
  const sample=async(kind)=>page.evaluate(async({kind,scale})=>{
   const rows=[];const read=el=>{if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {client:el.clientWidth,offset:el.offsetWidth,rect:r.width,height:r.height,cssWidth:s.width,zoom:s.zoom,transform:s.transform,viewBox:el.getAttribute('viewBox'),canvas:el.tagName==='CANVAS'?[el.width,el.height]:null};};
   for(let i=0;i<100;i++){await new Promise(requestAnimationFrame);rows.push({time:performance.now(),instances:document.querySelectorAll('.color-picker-layer').length,root:read(document.querySelector('#reference-root')),graph:read(document.querySelector('.reg-curve-graph')),stage:read(document.querySelector('.reg-graph-stage')),layer:read(document.querySelector('.color-picker-layer')),panel:read(document.querySelector('.color-picker-panel')),canvas:read(document.querySelector('.cp-plane canvas'))});}return {kind,scale,rows};
  },{kind,scale});
  results.push(await sample('registry-open'));
  await page.locator('[data-reg-search]').fill('defaultCurve');await page.setViewportSize({width:420,height:600});results.push(await sample('registry-search-resize'));
  await page.locator('[data-route=palette]').evaluate(el=>el.click());if(await page.locator('[data-answer=discard]').count())await page.locator('[data-answer=discard]').evaluate(el=>el.click());if(!await page.locator('.pal-detail').isVisible())await page.locator('[data-pal-action=open]').first().evaluate(el=>el.click());
  await page.locator('[data-pal-action=open-color]').scrollIntoViewIfNeeded();await page.locator('[data-pal-action=open-color]').evaluate(el=>el.click());results.push(await sample('picker-open'));await page.screenshot({path:root+'/.tmp/vela-evidence/0.3.13-b/f1/'+tag+'-picker-'+scale+'.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(20);await page.locator('[data-pal-action=open-color]').evaluate(el=>el.click());results.push(await sample('picker-reverse'));await page.setViewportSize({width:720,height:700});
 }
 if(!before){for(const result of results){const tail=result.rows.slice(10);if(result.kind.startsWith('registry')){assert.ok(tail.every(r=>Math.abs(Number(r.graph.viewBox.split(' ')[2])-r.graph.client)<2));assert.ok(Math.max(...tail.map(r=>r.graph.client))-Math.min(...tail.map(r=>r.graph.client))<2);}else{assert.ok(result.rows.every(r=>r.instances===1));assert.equal(new Set(result.rows.map(r=>r.layer.cssWidth)).size,1);assert.equal(new Set(tail.map(r=>String(r.canvas.canvas))).size,1);}}assert.deepEqual(errors,[]);}
 fs.writeFileSync(root+'/.tmp/vela-evidence/0.3.13-b/f1/'+tag+'-geometry.json',JSON.stringify({ua:await page.evaluate(()=>navigator.userAgent),errors,results},null,2));
 console.log(JSON.stringify(results.map(r=>({kind:r.kind,scale:r.scale,graph:[r.rows[0].graph?.viewBox,r.rows.at(-1).graph?.viewBox],widths:[...new Set(r.rows.map(x=>x.layer?.cssWidth).filter(Boolean))],instances:Math.max(...r.rows.map(x=>x.instances))})),null,2));
 }finally{await browser.close();await server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
