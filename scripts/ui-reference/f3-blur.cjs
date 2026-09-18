// Pixel evidence, not CSS.supports/UA acceptance. Uses the unchanged v26 source
// and actual embedded sandbox. Patterned scroll content is explicitly a fixture.
const {serve,root}=require('./server.cjs');const {chromium}=require('playwright');const {PNG}=require('playwright-core/lib/utilsBundle');const fs=require('node:fs'),assert=require('node:assert/strict');
const raw=root+'/.tmp/vela-evidence/0.3.13-b/f3',engine=process.env.F3_ENGINE||'edge';
async function run(){const server=await serve(),browser=await chromium.launch({executablePath:process.env.UI_REFERENCE_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});const rows=[],errors=[];
try{for(const theme of ['dark','light'])for(const scale of ['1','0.92'])for(const kind of ['source','reference','iframe']){
 const page=await browser.newPage({viewport:{width:kind==='source'?1200:420,height:1100}});page.on('pageerror',e=>errors.push(e.stack));await page.goto(server.url+(kind==='source'?'/lab/index.html':kind==='iframe'?'/client/launcher-fixture':'/client/reference/index.html'));let surface=page;
 if(kind==='iframe'){await page.locator('#launch').click();await page.waitForSelector('iframe');surface=page.frames().find(f=>f.parentFrame());await surface.waitForSelector('[data-route=vela]');assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts');}
 if(kind!=='source'){await surface.locator('select[data-scale]').selectOption(scale,{force:true});await surface.locator('select[data-theme]').selectOption(theme,{force:true});await surface.locator('[data-route=vela]').evaluate(e=>e.click());}else{await page.locator('.theme-control [data-theme='+theme+']').click();}
 const shell=surface.locator('.vela-shell').first();
 // Equal shell and effect geometry for rendering comparison only. No production
 // code or actual captured facts are replaced; a separate probe document is used.
 await shell.evaluate((el,{scale,kind})=>{el.style.width='400px';el.style.flex='0 0 450px';el.style.height='450px';el.style.setProperty('--composer-height','126px','important');el.style.setProperty('--composer-fade','48px','important');if(kind==='source'){el.closest('.plugin').style.height='850px';el.closest('.plugin').style.zoom=scale;}const m=el.querySelector('.messages');m.innerHTML='<p>BLUR RENDER FIXTURE / 模糊渲染反例</p>'+Array.from({length:80},(_,i)=>'<p style="height:24px;background:repeating-linear-gradient(90deg,#222 0 3px,#ddd 3px 6px);color:red">Evidence '+i+' 事实 0123456789</p>').join('');},{scale,kind});
 await surface.addStyleTag({content:'.vela-shell{--composer-height:126px!important;--composer-fade:48px!important}'});
 for(const scroll of [120,157]){
  await shell.locator('.messages').evaluate((e,y)=>e.scrollTop=y,scroll);await surface.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const info=await shell.evaluate((el,kind)=>{const root=document.querySelector('#reference-root'),k=root?innerWidth/root.getBoundingClientRect().width:(getComputedStyle(el.closest('.plugin')).zoom==='1'?1:NaN),s=el.getBoundingClientRect(),h=el.querySelector('.composer-haze').getBoundingClientRect(),c=el.querySelector('.composer').getBoundingClientRect(),calibrated=Number.isFinite(k)?k:1;return {shell:{x:s.x,y:s.y,w:s.width,h:s.height},haze:{x:h.x,y:h.y,w:h.width,h:h.height},composer:{x:c.x,y:c.y,w:c.width,h:c.height},k:calibrated,layers:[...el.querySelectorAll('.composer-haze>span')].map(e=>{const s=getComputedStyle(e);return {blur:s.backdropFilter,mask:s.webkitMaskImage,opacity:s.opacity}}),veil:getComputedStyle(el.querySelector('.composer-haze'),'::after').backgroundImage,ancestors:(()=>{const a=[];for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);a.push({tag:e.tagName,class:e.className,filter:s.filter,backdrop:s.backdropFilter,mask:s.webkitMaskImage,opacity:s.opacity,overflow:s.overflow,isolation:s.isolation,zoom:s.zoom,transform:s.transform});}return a;})()};},kind);
  // Whole-viewport screenshots avoid old Chromium's pre-zoom DOMRect clipping.
  const name=engine+'-'+kind+'-'+theme+'-'+scale+'-'+scroll;
  const on=PNG.sync.read(await page.screenshot({path:raw+'/'+name+'-blur.png'}));
  await shell.locator('.composer-haze>span').evaluateAll(nodes=>nodes.forEach(e=>e.style.setProperty('backdrop-filter','none','important')));
  const off=PNG.sync.read(await page.screenshot({path:raw+'/'+name+'-gradient-only.png'}));await shell.locator('.composer-haze>span').evaluateAll(nodes=>nodes.forEach(e=>e.style.removeProperty('backdrop-filter')));
  let k=info.k;if(kind==='source'){
   // The source plugin has a known explicit 400px shell, so this calibration
   // uses a layout invariant, not UA detection.
   k=400*Number(scale)/info.shell.w;
  }
  const frameOffset=kind==='iframe'?await page.locator('iframe').boundingBox():{x:0,y:0};const rect={x:Math.round(info.haze.x*k+frameOffset.x),y:Math.round(info.haze.y*k+frameOffset.y),w:Math.round(info.haze.w*k),h:Math.round(info.haze.h*k)};
  await page.screenshot({path:raw+'/'+name+'-shell.png',clip:{x:info.shell.x*k+frameOffset.x,y:info.shell.y*k+frameOffset.y,width:info.shell.w*k,height:info.shell.h*k}});
  const band=(from,to)=>{let sum=0,count=0;for(let y=rect.y+Math.round(from*Number(scale));y<rect.y+Math.round(to*Number(scale));y++)for(let x=rect.x+Math.round(rect.w*.7);x<rect.x+Math.round(rect.w*.88);x++){if(x<0||y<0||x>=on.width||y>=on.height)continue;const i=(y*on.width+x)*4;sum+=Math.abs(on.data[i]-off.data[i])+Math.abs(on.data[i+1]-off.data[i+1])+Math.abs(on.data[i+2]-off.data[i+2]);count+=3;}return sum/count;};
  const top=band(2,8),middle=band(26,34),clear=band(-20,-10),row={kind,theme,scale,scroll,info,rect,top,middle,clear,blurPixels:middle>2,progressive:top<middle*.65};
  assert.ok(row.blurPixels,'A gradient alone is not background blur: '+JSON.stringify(row));assert.equal(info.layers.length,4);rows.push(row);
 }
 // Text/buttons remain above the effect and receive input in the real document.
 if(kind!=='source'){await shell.locator('textarea').fill('Sharp input / 清晰输入');assert.equal(await shell.locator('textarea').inputValue(),'Sharp input / 清晰输入');}
 await page.close();
 }
 assert.deepEqual(errors,[]);const progressive=rows.every(r=>r.progressive),contained=rows.every(r=>r.clear<1);fs.writeFileSync(raw+'/'+engine+'-blur-render.json',JSON.stringify({progressive,contained,rows,errors},null,2));console.log(JSON.stringify({engine,rows:rows.length,blurPixels:rows.every(r=>r.blurPixels),progressive,contained,scope:'Isolated browser, not real CEP',measurements:rows.map(({kind,theme,scale,scroll,top,middle,clear})=>({kind,theme,scale,scroll,top,middle,clear}))},null,2));if(!progressive||!contained)process.exitCode=2;
}finally{await browser.close();await server.close();}}
run().catch(e=>{console.error(e);process.exitCode=1;});
