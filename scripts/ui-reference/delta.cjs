const {serve,root}=require('./server.cjs');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:process.env.UI_REFERENCE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:720,height:640}});page.on('pageerror',e=>console.error(e.message));await page.goto(server.url+'/delta');await page.waitForFunction(()=>window.v);
  const result={ua:await page.evaluate(()=>navigator.userAgent),version:'v26 / 3df562e66d8b6ea36bb592bbb75a8369d2d002bf'};
  const number=page.locator('[data-reg-value=numberValue]');await number.fill('999');
  result.numberDraft=await page.evaluate(()=>({visible:document.querySelector('[data-reg-value=numberValue]').value,model:v.session.values.numberValue,invalid:document.querySelector('[data-reg-value=numberValue]').getAttribute('aria-invalid')}));
  await number.blur();result.numberCommit=await number.inputValue();
  await page.locator('[data-reg-search]').fill('defaultCurve');
  const x=page.locator('[data-reg-curve-value=defaultCurve][data-axis=x1]');await x.fill('9');
  result.curveDraft=await page.evaluate(()=>({visible:document.querySelector('[data-reg-curve-value=defaultCurve][data-axis=x1]').value,model:v.session.values.defaultCurve.x1,invalid:document.querySelector('[data-reg-curve-value=defaultCurve][data-axis=x1]').getAttribute('aria-invalid')}));
  await x.press('Enter');result.curveCommit=await x.inputValue();
  await page.setViewportSize({width:420,height:640});await page.waitForTimeout(150);
  result.searchResize=await page.evaluate(()=>({svg:document.querySelector('.reg-curve-graph').getAttribute('viewBox'),width:document.querySelector('.reg-curve-graph').clientWidth,model:v.graphSizes.defaultCurve}));
  const focus=page.locator('[data-reg-search]');await focus.fill('range');await focus.evaluate(el=>el.setSelectionRange(1,3));await page.evaluate(()=>v.render());
  result.redrawFocus=await page.evaluate(()=>({focused:document.activeElement.hasAttribute('data-reg-search'),selection:[document.activeElement.selectionStart,document.activeElement.selectionEnd]}));
  await page.setViewportSize({width:900,height:640});await page.locator('[data-reg-preview]').click();
  result.previewSpace=await page.evaluate(()=>({open:v.ui.previewOpen,form:document.querySelector('.reg-form').clientWidth,body:document.querySelector('.reg-body').clientWidth}));
  await page.locator('[data-reg-preview]').click();result.previewReverseSpace=await page.evaluate(()=>({open:v.ui.previewOpen,form:document.querySelector('.reg-form').clientWidth,body:document.querySelector('.reg-body').clientWidth}));
  await focus.fill('defaultCurve');const handle=page.locator('[data-reg-handle]').first();const box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+35,box.y-8,{steps:8});await page.mouse.up();
  result.drag=await page.evaluate(()=>({active:!!v.drag,value:v.session.values.defaultCurve,feedback:document.querySelector('[data-reg-handle]').getAttribute('aria-label')}));
  const stable=page.locator('[data-reg-handle]').first(),position=await stable.boundingBox();await page.mouse.move(position.x+position.width/2,position.y+position.height/2);await page.mouse.down();
  result.coalescing=await page.evaluate(async()=>{const graph=document.querySelector('.reg-curve-graph'),original=v.repaintCurve;let paints=0;v.repaintCurve=function(...args){paints++;return original.apply(this,args);};for(let i=0;i<100;i++)v.root.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:200+i/10,clientY:350+i/10}));const before=paints;await new Promise(requestAnimationFrame);const after=paints;v.repaintCurve=original;return {samples:100,beforeFrame:before,afterFrame:after,stableSVG:graph===document.querySelector('.reg-curve-graph')};});await page.mouse.up();
  await page.screenshot({path:root+'/.tmp/vela-evidence/0.3.13-b/lab-registry-v26.png'});
  fs.writeFileSync(root+'/.tmp/vela-evidence/0.3.13-b/registry-delta.json',JSON.stringify(result,null,2));console.log(result);
  await page.evaluate(()=>v.destroy());
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
