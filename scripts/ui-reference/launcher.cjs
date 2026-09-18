const {serve,root}=require('./server.cjs');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const server=await serve(),browser=await chromium.launch({executablePath:process.env.UI_REFERENCE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 try{
  const page=await browser.newPage({viewport:{width:420,height:600}});page.setDefaultTimeout(8000);const errors=[];page.on('console',m=>{if(m.type()==='error')console.log('BROWSER: '+m.text());});page.on('requestfailed',r=>console.log('REQUEST FAILED '+r.url()+' '+r.failure()?.errorText));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.url+'/client/launcher-fixture');await page.locator('#launch').click();const frame=page.frames().find(f=>f.parentFrame());await frame.waitForFunction(()=>window.ReferenceState);
  assert.equal(await frame.evaluate(()=>{try{localStorage.setItem('forbidden','x');return false;}catch{return true;}}),true);
  assert.equal(await frame.evaluate(()=>typeof window.CSInterface),'undefined');assert.equal(await frame.evaluate(()=>typeof window.cep),'undefined');
  await frame.locator('[data-route=vela]').click();await frame.locator('#ref-draft').fill('draft');await page.locator('button').filter({hasText:'reference.exit'}).click();await frame.locator('[data-answer=stay]').click();assert.equal(await page.locator('iframe').count(),1);
  await frame.locator('#ref-draft').focus();await frame.locator('#ref-draft').press('Escape');await frame.locator('[data-answer=discard]').click();await page.waitForFunction(()=>!document.querySelector('iframe'));assert.equal(await page.locator('#untouched').inputValue(),'production draft sentinel');assert.equal(await page.locator('#launch').evaluate(e=>document.activeElement===e),true);results.push('HTTP sandbox isolation, dirty exit, Escape, parent draft and focus PASS');
  await page.goto(pathToFileURL(root+'/client/reference/index.html').href);await page.waitForFunction(()=>window.ReferenceState);assert.equal(await page.evaluate(()=>ReferenceState().route),'registry');results.push('Standalone file entry PASS');
  const fixture=root+'/.tmp/vela-evidence/0.3.13-b/f3/launcher-file.html';fs.writeFileSync(fixture,'<base href="'+pathToFileURL(root+'/client/').href+'"><input id="untouched" value="production draft sentinel"><button id="launch" onclick="UIReferenceLauncher.open()">Launch</button><script>window.I18n={t:k=>k};</script><script src="js/uiReferenceLauncher.js"></script>');
  await page.goto(pathToFileURL(fixture).href);await page.locator('#launch').click();const localFrame=page.frames().find(f=>f.parentFrame());await localFrame.waitForFunction(()=>window.ReferenceState);await localFrame.locator('[data-exit]').click();await page.waitForFunction(()=>!document.querySelector('iframe'));results.push('File parent + sandboxed file iframe load/exit PASS');assert.deepEqual(errors,[]);
  fs.writeFileSync(root+'/.tmp/vela-evidence/0.3.13-b/f3/launcher-results.json',JSON.stringify({results,errors},null,2));console.log(results.join('\n'));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
