import {viewportRect} from '../geometry.js';
import {copy} from '../copy.js';
import {mountControls,disposeControls,isNumber,rangeNumber} from '../controls.js';
import {AXES,CHANNELS,ColorSession,clamp,toHex,fromHSV,channelValue,channelGradient,axisValue,planePoint,planeLabels,planePixels} from './color-model.js';
import {springStep,MOTION,motionMs} from './tool-spring.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m14 5 5 5M4 20l1-5L16 4a2.8 2.8 0 0 1 4 4L9 19zM3 21l2-2"/></svg>';
let sessionAxis='hsv-v';const preference=()=>sessionAxis;


export function placeColorPopover(bounds,anchor,desired={width:288,height:360}){
 const pad=8,gap=10,width=Math.min(desired.width,Math.max(0,bounds.width-pad*2)),availableHeight=Math.max(0,bounds.height-pad*2),right=anchor.left+anchor.width,bottom=anchor.top+anchor.height;
 let side,left,top,height;
 if(bounds.width-right-gap-pad>=width||anchor.left-gap-pad>=width){side=bounds.width-right-gap-pad>=width?'right':'left';height=Math.min(desired.height,availableHeight);left=side==='right'?right+gap:anchor.left-gap-width;top=clamp(anchor.top-12,pad,Math.max(pad,bounds.height-pad-height));}
 else{const below=Math.max(0,bounds.height-pad-bottom-gap),above=Math.max(0,anchor.top-gap-pad);side=below>=desired.height||below>=above?'bottom':'top';height=Math.min(desired.height,side==='bottom'?below:above);left=clamp(anchor.left,pad,Math.max(pad,bounds.width-pad-width));top=side==='bottom'?bottom+gap:anchor.top-gap-height;}
 const x=clamp(anchor.left+anchor.width/2-left,0,width),y=clamp(anchor.top+anchor.height/2-top,0,height);
 return {left,top,width,height,side,origin:`${x}px ${y}px`};
}

import {activeMotion,motionTrack,stepMotion} from './asset-runtime.js';
// The picker owns a draft, never a library mutation. Its caller decides how to
// commit a solid or a gradient color stop; opacity stops remain independent.
export class ColorPicker{
 constructor(host,{anchor=()=>null,rgb,opacity=1,allowAlpha=true,title=copy("Color"),snapshot,presence,onPreview=()=>{},onApply=()=>{},onCancel=()=>{},returnFocus}={}){
  Object.assign(this,{host,anchor,allowAlpha,title,onPreview,onApply,onCancel,returnFocus});
  this.session=new ColorSession(rgb,opacity);this.mode=AXES.includes(snapshot?.mode)?snapshot.mode:preference();
  if(snapshot?.color){const c=snapshot.color;this.session.color=fromHSV(c.h,c.s,c.v,allowAlpha?c.a:1);}
  this.abort=new AbortController();this.closed=false;this.disposed=false;this.sampling=false;this.presence={value:0,velocity:0,...(presence||snapshot?.presence)};this.presenceTarget=1;this.presenceTime=performance.now();this.reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;this.presenceFrame=null;this.track=motionTrack(activeMotion(),{value:this.presence.value},{value:1},{value:this.presence.velocity},!!(presence||snapshot?.presence));
  this.layer=document.createElement('div');this.layer.className='color-picker-layer';
  this.layer.innerHTML=`<div class="cp-halo" aria-hidden="true"><span></span><span></span><span></span></div><section class="color-picker-panel" role="dialog" aria-label="${esc(copy('Color picker: {title}',{title}))}"><header class="cp-header"><div><h4>${copy("Color picker")}</h4><p>${esc(title)}</p></div><button type="button" data-cp-action="cancel" class="cp-close" aria-label="${copy("Cancel color edit")}">×</button></header><div class="cp-body"><div class="cp-content"><div class="cp-visual"><div class="cp-axes" aria-label="${copy("Color plane axis")}">${['hsv','rgb'].map(f=>`<div role="group" aria-label="${copy('{family} axes',{family:f.toUpperCase()})}"><span>${f.toUpperCase()}</span>${[...f].map(k=>`<button type="button" data-cp-axis="${f}-${k}" aria-label="${copy('{axis} axis',{axis:copy(CHANNELS[k].name)})}" title="${copy('Hold {channel} constant in the plane',{channel:copy(CHANNELS[k].name)})}">${k.toUpperCase()}</button>`).join('')}</div>`).join('')}</div><div class="cp-plane" data-cp-plane tabindex="0" role="group" aria-roledescription="${copy('two-dimensional color field')}" aria-label="${copy("Color field; arrow keys to adjust, Shift for larger steps")}"><canvas aria-hidden="true"></canvas><span class="cp-plane-handle" aria-hidden="true"></span></div><div class="cp-plane-labels" aria-hidden="true"><span data-cp-y></span><span data-cp-x></span></div><label class="cp-axis-label"><span data-cp-axis-label></span><output data-cp-axis-value></output></label><input class="cp-range cp-axis-range" type="range" data-cp-field="axis" min="0" max="1000" step="1"><div class="cp-comparison"><button type="button" data-cp-action="reset" title="${copy("Restore original color")}"><span class="cp-checker"><i data-cp-original></i></span><span>${copy("Original")}</span></button><div><span class="cp-checker"><i data-cp-current></i></span><span>${copy("Current")}</span></div><button type="button" class="cp-pick" data-cp-action="pick">${icon}<span>${copy("Pick")}</span></button></div></div><div class="cp-values"><div class="cp-hex-row"><label><span>HEX</span><input data-cp-field="hex" aria-label="${copy("HEX color")}" spellcheck="false" maxlength="${allowAlpha?9:7}" autocomplete="off"></label><button type="button" data-cp-action="copy" title="${copy("Copy HEX")}">${copy("Copy")}</button></div><details class="cp-channel-details" ${snapshot?.expanded?'open':''}><summary><span data-cp-family></span> ${copy('channels')}</summary><div class="cp-channel-fields">${Object.keys(CHANNELS).map(k=>`<label class="cp-channel" data-cp-row="${k}"><span title="${copy(CHANNELS[k].name)}">${k.toUpperCase()}</span>${rangeNumber(`<span class="cp-number"><input type="number" data-cp-channel="${k}" aria-label="${copy('{channel} value',{channel:copy(CHANNELS[k].name)})}" min="0" max="${CHANNELS[k].max}" step="1"><span>${CHANNELS[k].unit}</span></span>`,`<input type="range" class="cp-range" data-cp-channel="${k}" aria-label="${copy(CHANNELS[k].name)}" min="0" max="${CHANNELS[k].max}" step="1">`)}</label>`).join('')}${allowAlpha?`<label class="cp-channel cp-alpha"><span title="${copy("Opacity")}">A</span>${rangeNumber(`<span class="cp-number"><input type="number" data-cp-channel="a" aria-label="${copy("Opacity value")}" min="0" max="100" step="1"><span>%</span></span>`,`<input type="range" class="cp-range" data-cp-channel="a" aria-label="${copy("Opacity")}" min="0" max="100" step="1">`)}</label>`:`<p class="cp-opacity-note">${copy("Opacity is controlled by the gradient’s opacity stops.")}</p>`}<p class="cp-help">${copy("Choose an axis, then drag in the color field. Arrow keys fine-tune; Shift makes larger steps.")}</p><p class="cp-pick-note"></p></div></details></div></div></div><footer class="cp-footer"><span class="cp-status" role="status">${copy("Not applied")}</span><div><button type="button" data-cp-action="cancel">${copy("Cancel")}</button><button type="button" data-cp-action="apply" class="primary-button">${copy("Apply")}</button></div></footer></section>`;
  host.append(this.layer);this.panel=this.query('.color-picker-panel');this.halo=this.query('.cp-halo');this.blurLayers=[...this.halo.children];this.anchor()?.setAttribute('aria-expanded','true');
  const options={signal:this.abort.signal};
  this.motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');this.motionPreference?.addEventListener('change',event=>{this.reduced=event.matches;this.schedulePresence();},options);
  this.layer.addEventListener('click',e=>this.click(e),options);
  this.layer.addEventListener('input',e=>this.input(e),options);
  this.layer.addEventListener('change',e=>this.change(e),options);
  this.layer.addEventListener('keydown',e=>this.keydown(e),options);
  this.layer.addEventListener('pointerdown',e=>this.pointerdown(e),options);
  this.supported=typeof window.EyeDropper==='function';
  this.query('[data-cp-action="pick"]').disabled=!this.supported;
  this.query('.cp-pick-note').textContent=this.supported?copy("Pick any screen color. Esc cancels sampling."):copy("Screen picking isn’t available in this browser. Use the color field or enter HEX.");
  document.addEventListener('pointerdown',e=>{if(!this.closed&&!this.sampling&&!this.layer.contains(e.target)&&!this.anchor()?.contains(e.target))this.cancel({restoreFocus:false});},{...options,capture:true});
  this.layer.addEventListener('focusout',e=>{if(!this.closed&&!this.sampling&&e.relatedTarget&&!this.layer.contains(e.relatedTarget)&&!this.anchor()?.contains(e.relatedTarget))this.cancel({restoreFocus:false});},options);
  document.addEventListener('scroll',e=>{if(!this.layer.contains(e.target))this.schedulePosition();},{...options,capture:true});
  window.addEventListener('resize',()=>this.schedulePosition(),options);
  this.query('details').addEventListener('toggle',()=>this.schedulePosition(),options);
  if(typeof ResizeObserver==='function'){this.observer=new ResizeObserver(()=>{this.schedulePosition();this.scheduleDraw();});this.observer.observe(host);this.observer.observe(this.panel);this.observer.observe(this.query('[data-cp-plane]'));}
  mountControls(this.layer);this.update();this.position();this.enter();this.query('[data-cp-plane]').focus({preventScroll:true});
 }
 schedulePosition(){if(this.closed||this.positionRequest||!globalThis.requestAnimationFrame)return;this.positionRequest=requestAnimationFrame(()=>{this.positionRequest=0;this.position();});}
 position(){if(this.closed)return;const anchor=this.anchor();if(!anchor)return;const bounds=viewportRect(this.host),rect=viewportRect(anchor);if(!bounds.width||!bounds.height||!rect.width)return;
  const scroll=anchor.closest('.pal-detail')?viewportRect(anchor.closest('.pal-detail')):null;if(scroll&&(rect.bottom<=scroll.top||rect.top>=scroll.bottom)){this.cancel({restoreFocus:false});return;}
  const sx=bounds.width/(this.host.clientWidth||bounds.width),sy=bounds.height/(this.host.clientHeight||bounds.height),w=bounds.width/sx,h=bounds.height/sy,a={left:(rect.left-bounds.left)/sx,top:(rect.top-bounds.top)/sy,width:rect.width/sx,height:rect.height/sy};
  // Read intrinsic content in layout coordinates. The scroller's scrollHeight
  // includes its previously assigned viewport and rounds fractional heights;
  // feeding that value back across a scrollbar threshold oscillates the plane.
  const cssHeight=el=>parseFloat(getComputedStyle(el).height)||el.offsetHeight;
  const bodyStyle=getComputedStyle(this.query('.cp-body')),panelStyle=getComputedStyle(this.panel);
  const desired=Math.ceil(cssHeight(this.query('.cp-header'))+cssHeight(this.query('.cp-content'))+cssHeight(this.query('.cp-footer'))+parseFloat(bodyStyle.paddingTop)+parseFloat(bodyStyle.paddingBottom)+parseFloat(panelStyle.borderTopWidth)+parseFloat(panelStyle.borderBottomWidth));
  const pos=placeColorPopover({width:w,height:h},a,{width:288,height:Math.min(desired||360,480)});
  this.layer.dataset.sizeWrites=String((this.positionWrites||0)+1);this.positionWrites=Number(this.layer.dataset.sizeWrites);this.layer.style.width=pos.width+'px';this.layer.style.maxHeight=pos.height+'px';this.layer.style.left=pos.left+'px';this.layer.style.top=pos.top+'px';this.panel.style.maxHeight=pos.height+'px';this.layer.dataset.side=pos.side;
  this.panel.style.transformOrigin=pos.origin;const [ox,oy]=pos.origin.split(' ').map(parseFloat);this.halo.style.transformOrigin=`${ox+30}px ${oy+30}px`;this.motionX=pos.side==='right'?-7:pos.side==='left'?7:0;this.motionY=pos.side==='bottom'?-7:pos.side==='top'?7:0;
  this.anchor()?.setAttribute('aria-expanded','true');this.scheduleDraw();
 }
 query(selector){return this.layer.querySelector(selector);}
 snapshot(){return {mode:this.mode,color:{...this.session.color},expanded:this.query('details').hasAttribute('open'),presence:this.capturePresence()};}
 capturePresence(){this.advancePresence(performance.now());return {...this.presence};}
 enter(){this.paintPresence();this.schedulePresence();}
 advancePresence(now){const dt=Math.max(0,(now-this.presenceTime)/1000);this.presenceTime=now;if(this.disposed||!dt)return;
  if(this.reduced){const step=dt*1000/motionMs(120),value=this.presence.value;this.presence={value:this.presenceTarget?Math.min(1,value+step):Math.max(0,value-step),velocity:0};}
  else if(this.track){const next=stepMotion(this.track,dt);this.presence={value:next.frame.value,velocity:next.velocity.value};}
  else this.presence=springStep(this.presence.value,this.presence.velocity,this.presenceTarget,dt,{response:this.presenceTarget?MOTION.pickerOpen:MOTION.pickerClose,damping:1});
 }
 paintPresence(){const p=clamp(this.presence.value),spatial=this.track?this.presence.value:p,transform=this.reduced?'none':`translate(${(1-spatial)*(this.motionX||0)}px,${(1-spatial)*(this.motionY||0)}px) scale(${.97+.03*spatial})`;
  // Never fade the common ancestor: opacity < 1 makes a new backdrop root.
  // The surface and each backdrop-filter element receive the same progress.
  this.panel.style.opacity=String(p);this.panel.style.transform=transform;this.halo.style.transform=transform;
  this.blurLayers.forEach((layer,i)=>{layer.style.opacity=String(p);layer.style.setProperty('--blur',([3,8,16][i]*p)+'px');});
 }
 schedulePresence(){if(this.disposed||this.presenceFrame!==null)return;
  if(typeof requestAnimationFrame!=='function'){this.presence={value:this.presenceTarget,velocity:0};this.paintPresence();if(this.closed)this.remove();return;}
  this.presenceFrame=requestAnimationFrame(now=>{this.presenceFrame=null;if(this.disposed)return;this.advancePresence(now);
   const done=this.track&&!this.reduced?this.track.elapsed>=this.track.spec.duration/1000:Math.abs(this.presence.value-this.presenceTarget)<.002&&Math.abs(this.presence.velocity)<.02;if(done)this.presence={value:this.presenceTarget,velocity:0};this.paintPresence();if(done){if(this.closed)this.remove();}else this.schedulePresence();
  });
 }
 close(){if(this.closed)return this.closingPromise||Promise.resolve();this.capturePresence();this.stopInteraction();this.presenceTarget=0;this.track=motionTrack(activeMotion(),{value:this.presence.value},{value:0},{value:this.presence.velocity},Math.abs(this.presence.velocity)>.001);this.layer.dataset.closing='true';this.layer.inert=true;this.layer.style.pointerEvents='none';this.layer.querySelectorAll('button,input,summary,[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));this.layer.setAttribute('aria-hidden','true');this.closingPromise=new Promise(resolve=>this.resolveClose=resolve);this.schedulePresence();return this.closingPromise;}
 stopInteraction(){disposeControls(this.layer);this.endPlane?.(false);this.closed=true;this.sampleAbort?.abort();this.abort.abort();this.observer?.disconnect();if(this.drawRequest)cancelAnimationFrame(this.drawRequest);if(this.positionRequest)cancelAnimationFrame(this.positionRequest);this.anchor()?.setAttribute('aria-expanded','false');}
 remove(){if(this.disposed)return;this.disposed=true;if(this.presenceFrame!==null)cancelAnimationFrame(this.presenceFrame);this.presenceFrame=null;this.layer.remove();this.resolveClose?.();this.resolveClose=null;}
 setMode(mode){if(!AXES.includes(mode))return;this.mode=mode;sessionAxis=mode;this.update();}
 update(preview=false){if(this.closed)return;const c=this.session.color,family=this.mode.slice(0,3),axis=this.mode.at(-1);
  this.layer.querySelectorAll('[data-cp-axis]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cpAxis===this.mode)));
  this.layer.querySelectorAll('[data-cp-row]').forEach(row=>row.hidden=!family.includes(row.dataset.cpRow));
  this.layer.querySelectorAll('[data-cp-channel]').forEach(input=>{const k=input.dataset.cpChannel,v=k==='a'?c.a*100:channelValue(c,k);if(input!==document.activeElement||input.type==='range')input.value=Math.round(v);if(input.type==='range')input.style.background=k==='a'?`linear-gradient(to right,${toHex(c)}00,${toHex(c)}),conic-gradient(#a8a8a8 25%,#ddd 0 50%,#a8a8a8 0 75%,#ddd 0) 0 / 10px 10px`:channelGradient(c,k);});
  this.query('[data-cp-family]').textContent=family.toUpperCase();
  const [x,y]=planeLabels(this.mode).map(copy);this.query('[data-cp-x]').textContent=x+' →';this.query('[data-cp-y]').textContent='↑ '+y;
  const plane=this.query('[data-cp-plane]');plane.title=`${x}: ${Math.round(planePoint(c,this.mode).x*100)}%, ${y}: ${Math.round((1-planePoint(c,this.mode).y)*100)}%`;
  const point=planePoint(c,this.mode),handle=this.query('.cp-plane-handle');handle.style.left=clamp(point.x)*100+'%';handle.style.top=clamp(point.y)*100+'%';handle.style.background=toHex(c);
  const strip=this.query('[data-cp-field="axis"]');strip.value=Math.round(clamp(axisValue(c,this.mode))*1000);strip.style.background=channelGradient(c,axis);strip.setAttribute('aria-label',copy('{axis} axis',{axis:copy(CHANNELS[axis].name)}));strip.setAttribute('aria-valuetext',Math.round(channelValue(c,axis))+CHANNELS[axis].unit);
  this.query('[data-cp-axis-label]').textContent=copy(CHANNELS[axis].name);this.query('[data-cp-axis-value]').textContent=Math.round(channelValue(c,axis))+CHANNELS[axis].unit;
  this.query('[data-cp-original]').style.background=toHex(this.session.initial,true);this.query('[data-cp-current]').style.background=toHex(c,true);
  const hex=this.query('[data-cp-field="hex"]');if(hex!==document.activeElement)hex.value=toHex(c,this.allowAlpha&&c.a<1);
  if(preview){this.report(copy("Not applied"));this.onPreview(this.session.value);}
  this.scheduleDraw();
 }
 scheduleDraw(){if(this.drawRequest||!globalThis.requestAnimationFrame)return;this.drawRequest=requestAnimationFrame(()=>{this.drawRequest=0;this.draw();});}
 draw(){if(this.closed)return;const canvas=this.query('canvas'),plane=this.query('.cp-plane'),scale=viewportRect(this.host).width/this.host.offsetWidth||1,dpr=Math.min((window.devicePixelRatio||1)*scale,2),w=Math.min(640,Math.round(plane.clientWidth*dpr)),h=Math.min(400,Math.round(plane.clientHeight*dpr));if(!w||!h)return;
  const key=[this.mode,this.session.color[this.mode.at(-1)],w,h].join(':');if(key===this.drawKey)return;const ctx=canvas.getContext('2d');if(!ctx)return;this.drawKey=key;canvas.dataset.sizeWrites=String((this.drawWrites||0)+1);this.drawWrites=Number(canvas.dataset.sizeWrites);canvas.width=w;canvas.height=h;const pixels=ctx.createImageData(w,h);pixels.data.set(planePixels(this.session.color,this.mode,w,h));ctx.putImageData(pixels,0,0);
 }
 report(text,error=false){text=copy(text);const el=this.query('.cp-status');el.textContent=text;el.dataset.error=String(error);}
 input(e){const input=e.target,k=input.dataset.cpChannel;
  if(k){if(input.value===''||!Number.isFinite(Number(input.value))||input.validity?.valid===false)return;this.session.channel(k,Number(input.value));this.update(true);}
  else if(input.dataset.cpField==='axis'){this.session.axis(this.mode,Number(input.value)/1000);this.update(true);}
  else if(input.dataset.cpField==='hex'){input.removeAttribute('aria-invalid');}
 }
 commitHex(){const input=this.query('[data-cp-field="hex"]');try{if(input.value!==toHex(this.session.color,this.allowAlpha&&this.session.color.a<1))this.session.hex(input.value,this.allowAlpha);input.removeAttribute('aria-invalid');this.update(true);return true;}catch(error){input.setAttribute('aria-invalid','true');this.report(error.message,true);return false;}}
 change(e){if(e.target.dataset.cpField==='hex')this.commitHex();else if(e.target.dataset.cpChannel){const k=e.target.dataset.cpChannel;e.target.value=Math.round(k==='a'?this.session.color.a*100:channelValue(this.session.color,k));}}
 click(e){const axis=e.target.closest('[data-cp-axis]');if(axis){this.setMode(axis.dataset.cpAxis);return;}
  const action=e.target.closest('[data-cp-action]')?.dataset.cpAction;
  if(action==='cancel')this.cancel();
  if(action==='apply'){if(!this.commitHex())return;this.onApply(this.session.value);}
  if(action==='reset'){this.session.reset();this.query('[data-cp-field="hex"]').value=toHex(this.session.color,this.allowAlpha&&this.session.color.a<1);this.update(true);}
  if(action==='pick')this.pick();
  if(action==='copy')this.copy();
 }
 pointerdown(e){const plane=e.target.closest('[data-cp-plane]');if(!plane||e.button!==0)return;e.preventDefault();this.endPlane?.(false);plane.focus({preventScroll:true});const before={...this.session.color},events=new AbortController();plane.setPointerCapture?.(e.pointerId);
  const move=event=>{if(event.pointerId!==e.pointerId||this.closed)return;const rect=viewportRect(plane);this.session.plane(this.mode,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height);this.update(true);};
  this.endPlane=commit=>{events.abort();this.endPlane=null;if(plane.hasPointerCapture?.(e.pointerId))plane.releasePointerCapture(e.pointerId);if(!commit){this.session.color=before;this.update(true);}};
  plane.addEventListener('pointermove',move,{signal:events.signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])plane.addEventListener(type,event=>{if(event.pointerId===e.pointerId){if(type==='pointerup')move(event);this.endPlane?.(type==='pointerup');}},{signal:events.signal});window.addEventListener('blur',()=>this.endPlane?.(false),{signal:events.signal});move(e);
 }
 keydown(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(this.sampling)this.sampleAbort?.abort();else this.cancel();return;}
  if(e.target.matches('[data-cp-plane]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();const p=planePoint(this.session.color,this.mode),step=e.shiftKey?.05:1/255;this.session.plane(this.mode,p.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),p.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));this.update(true);}
  if(e.key==='Enter'&&e.target.matches('[data-cp-field="hex"]')){e.preventDefault();this.commitHex();}
  if(e.key==='Tab'){const items=[...this.layer.querySelectorAll('button:not(:disabled),input,summary,[tabindex="0"]')].filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY')),first=items[0],last=items.at(-1);if((e.shiftKey&&e.target===first)||(!e.shiftKey&&e.target===last)){e.preventDefault();const anchor=this.anchor(),underlying=[...this.host.querySelectorAll('button:not(:disabled),input,select,summary,[tabindex="0"]')].filter(el=>!this.layer.contains(el)&&!el.closest('[hidden]'));const next=e.shiftKey?anchor:underlying[underlying.indexOf(anchor)+1];this.cancel({restoreFocus:false});(next||anchor)?.focus({preventScroll:true});}}
 }
 async copy(){try{await navigator.clipboard.writeText(toHex(this.session.color,this.allowAlpha&&this.session.color.a<1));if(!this.closed)this.report(copy("HEX copied."));}catch{if(!this.closed){this.query('[data-cp-field="hex"]').select();this.report(copy("Select and copy the HEX value."));}}}
 async pick(){if(!this.supported||this.sampling||this.closed)return;this.sampling=true;const abort=new AbortController();this.sampleAbort=abort;this.query('[data-cp-action="pick"]').disabled=true;this.report(copy("Pick a screen color · Esc to cancel"));
  try{const result=await new window.EyeDropper().open({signal:abort.signal});if(this.closed||abort.signal.aborted)return;this.session.hex(result.sRGBHex,false);this.update(true);}
  catch(error){if(!this.closed)this.report(error.name==='AbortError'?copy("Sampling cancelled. Your draft is kept."):copy("Screen picking failed. Try again or enter HEX."),error.name!=='AbortError');}
  finally{this.sampling=false;if(!this.closed)this.query('[data-cp-action="pick"]').disabled=!this.supported;}
 }
 cancel(options){if(this.closed)return;this.onCancel(options);}
 destroy({restoreFocus=true}={}){if(this.disposed)return;this.stopInteraction();this.remove();if(restoreFocus)this.returnFocus?.();}
}
