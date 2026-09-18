// Same engine, theme, scale, shell width/height and corresponding captured state.
// The source is the immutable v26 checkout retained by B, never a Site mutation.
const {serve,root}=require('./server.cjs');
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
async function run(){const server=await serve(),browser=await chromium.launch({executablePath:process.env.UI_REFERENCE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const rows=[];
 try{const lab=await browser.newPage({viewport:{width:1200,height:1000}}),ref=await browser.newPage({viewport:{width:420,height:720}});
 await lab.goto(server.url+'/lab/index.html');await ref.goto(server.url+'/client/reference/index.html');await ref.locator('[data-scale]').selectOption('1',{force:true});await ref.locator('[data-route=vela]').click();
 const metrics=page=>page.locator('.vela-shell').first().evaluate(shell=>{const out={shell:[shell.offsetWidth,shell.offsetHeight]};for(const sel of ['.vela-shell','.vela-header','.vela-title h3','.messages','.message-label','.message.user p','.message .reply-line','.proposal-header','.composer','.composer-box','.composer textarea','.composer-toolbar']){const el=sel==='.vela-shell'?shell:shell.querySelector(sel);if(!el)continue;const s=getComputedStyle(el);out[sel]=Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','backgroundColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','position'].map(k=>[k,s[k]]));}return out;});
 for(const [width,theme]of [[420,'dark'],[320,'light'],[720,'dark']]){await ref.setViewportSize({width,height:720});await ref.locator('select[data-theme]').selectOption(theme,{force:true});await lab.locator('#width-input').fill(String(width));await lab.locator('#width-input').dispatchEvent('change');await lab.locator('.theme-control [data-theme='+theme+']').click();
 for(const [state,labState]of [['review','review'],['executing','executing'],['partial','blocked'],['failed','failed']]){await ref.locator('[data-vela-state]').selectOption(state,{force:true});await lab.locator('.state-options [data-state='+labState+']').click();const size=await ref.locator('.vela-shell').evaluate(el=>[el.offsetWidth,el.offsetHeight]);
 // Lab has an independent Tools area. Give its Vela surface the same available
 // shell viewport, without changing any component typography/surface styles.
 await lab.locator('[data-panel=a] .plugin').evaluate((el,size)=>{el.style.height='850px';el.querySelector('.vela-shell').style.flex='0 0 '+size[1]+'px';el.parentElement.style.width=(size[0]+18)+'px';},size);await lab.waitForTimeout(80);
 const reference=await metrics(ref),source=await metrics(lab);assert.deepEqual(reference.shell,source.shell);
 const comparisons=['.vela-title h3','.message-label','.message.user p','.composer-box','.composer textarea'];for(const selector of comparisons)assert.deepEqual(reference[selector],source[selector],selector);
 await ref.locator('.vela-shell').screenshot({path:root+'/.tmp/vela-evidence/0.3.13-b/f3/vela-ref-'+width+'-'+theme+'-'+state+'.png'});await lab.locator('.vela-shell').first().screenshot({path:root+'/.tmp/vela-evidence/0.3.13-b/f3/vela-v26-'+width+'-'+theme+'-'+state+'.png'});rows.push({width,theme,state,labState,reference,source});
 }}fs.writeFileSync(root+'/.tmp/vela-evidence/0.3.13-b/f3/vela-comparison.json',JSON.stringify({ua:await ref.evaluate(()=>navigator.userAgent),rows},null,2));console.log('PASS 12 same-size Vela comparisons; source v26 roles and type metrics retained.');
 }finally{await browser.close();await server.close();}}
run().catch(e=>{console.error(e);process.exitCode=1;});
