import {viewportRect} from './geometry.js';
import '../../js/ui/coreUi.js';

// Explicit creation/disposal boundary. Call after creating this owner's DOM,
// never from a document scan or observer. Native selects remain the value port;
// CoreUI.enhanceSelect owns their portal and event contract.
const bindings=new WeakMap();
const activeNumbers=new Set();
export const isNumber=el=>el?.type==='number'||el?.hasAttribute?.('data-reference-number');
export function cancelNumberEdits(){for(const number of [...activeNumbers])number.cancel();}
function bindRange(input){
 const abort=new AbortController();let gesture=null;
 const emit=()=>input.dispatchEvent(new Event('input',{bubbles:true}));
 const finish=commit=>{if(!gesture)return;const previous=gesture.value;gesture.events.abort();gesture=null;activeNumbers.delete(api);if(!commit){input.value=previous;emit();}};
 const api={cancel:()=>finish(false),dispose(){finish(false);abort.abort();}};
 input.addEventListener('pointerdown',e=>{if(e.button!==0||input.disabled)return;finish(false);const events=new AbortController(),options={signal:events.signal};gesture={value:input.value,events};activeNumbers.add(api);for(const type of ['pointerup','pointercancel','lostpointercapture'])input.addEventListener(type,ev=>{if(ev.pointerId===e.pointerId)finish(type==='pointerup');},options);window.addEventListener('blur',api.cancel,options);window.addEventListener('resize',api.cancel,options);},{signal:abort.signal});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){e.preventDefault();e.stopPropagation();finish(false);}},{signal:abort.signal});return api;
}
function bindNumber(input){
 const abort=new AbortController(),options={signal:abort.signal};let start=input.value,editing=false,drag=null,dispatching=false,disposed=false,ignoreClick=false;
 input.dataset.referenceNumber='';input.type='text';input.inputMode='decimal';input.classList.add('ui-number-input','is-drag-ready');
 const step=()=>Number(input.getAttribute('step'))>0?Number(input.getAttribute('step')):1;
 const normalize=raw=>{let n=raw.trim()===''||!Number.isFinite(Number(raw))?Number(start):Number(raw);if(!Number.isFinite(n))n=0;for(const [attr,fn]of [['min',Math.max],['max',Math.min]])if(input.hasAttribute(attr))n=fn(n,Number(input.getAttribute(attr)));const p=String(step()).split('.')[1]?.length||0;n=Number(n.toFixed(p));for(const [attr,fn]of [['min',Math.max],['max',Math.min]])if(input.hasAttribute(attr))n=fn(n,Number(input.getAttribute(attr)));return String(n);};
 const emit=type=>{dispatching=true;input.dispatchEvent(new Event(type,{bubbles:true}));dispatching=false;};
 const begin=()=>{if(editing||drag)return;start=input.value;editing=true;activeNumbers.add(api);input.classList.add('is-editing-number');};
 const end=()=>{editing=false;activeNumbers.delete(api);input.classList.remove('is-editing-number','is-dragging-number');};
 const clearDrag=()=>{if(!drag)return;const d=drag;drag=null;d.events.abort();if(input.hasPointerCapture?.(d.id))input.releasePointerCapture(d.id);input.ownerDocument.body.style.userSelect=d.userSelect;};
 const cancel=()=>{if(!editing&&!drag)return;clearDrag();input.value=start;input.removeAttribute('aria-invalid');end();emit('input');};
 const commit=()=>{if(!editing&&!drag)return;clearDrag();if(input.value===start){end();return;}const next=normalize(input.value),changed=Number(next)!==Number(start);input.value=next;input.removeAttribute('aria-invalid');end();if(changed){emit('input');emit('change');}};
 const blurCommitted=()=>{const current=input.ownerDocument.activeElement,keys=['data-reg-value','data-reg-curve-value','data-axis','data-pal-field','data-cv-field','data-cp-channel'];if(current===input||!input.isConnected&&isNumber(current)&&keys.some(k=>input.hasAttribute(k))&&keys.every(k=>input.getAttribute(k)===current.getAttribute(k)))current.blur();};
 const api={cancel,dispose(){if(disposed)return;disposed=true;cancel();abort.abort();activeNumbers.delete(api);}};
 input.addEventListener('focus',begin,options);
 input.addEventListener('blur',()=>{if(!drag)commit();},options);
 input.addEventListener('click',e=>{if(ignoreClick){ignoreClick=false;e.preventDefault();return;}begin();input.focus();input.select();},options);
 // Capture stops invalid intermediate text before page adapters can coerce it.
 input.addEventListener('input',e=>{if(dispatching)return;begin();const text=input.value.trim(),n=Number(text),invalid=!text||/^[+-]?\.?$/.test(text)||/\.$/.test(text)||!Number.isFinite(n)||input.hasAttribute('min')&&n<Number(input.min)||input.hasAttribute('max')&&n>Number(input.max);input.setAttribute('aria-invalid',String(invalid));if(invalid)e.stopImmediatePropagation();}, {...options,capture:true});
 input.addEventListener('change',e=>{if(!dispatching){e.stopImmediatePropagation();commit();}}, {...options,capture:true});
 input.addEventListener('keydown',e=>{if(input.disabled||input.readOnly||e.isComposing||e.keyCode===229)return;if(!['Enter','Escape','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'){cancel();input.blur();}else if(e.key==='Enter'){commit();blurCommitted();}else{begin();input.value=normalize(String((Number(input.value)||Number(start)||0)+(e.key==='ArrowUp'?1:-1)*step()));emit('input');}},options);
 input.addEventListener('pointerdown',e=>{
  if(e.button!==0||input.disabled||input.readOnly||editing||document.activeElement===input)return;
  e.preventDefault();start=input.value;const events=new AbortController(),o={signal:events.signal};drag={id:e.pointerId,x:e.clientX,started:false,events,userSelect:document.body.style.userSelect};activeNumbers.add(api);input.setPointerCapture?.(e.pointerId);
  const move=ev=>{const d=drag;if(!d||ev.pointerId!==d.id)return;const delta=ev.clientX-d.x;if(!d.started&&Math.abs(delta)<4)return;d.started=true;document.body.style.userSelect='none';input.classList.add('is-dragging-number');input.value=normalize(String(Number(start)+delta/8*step()));emit('input');};
  input.addEventListener('pointermove',move,o);input.addEventListener('pointerup',ev=>{if(!drag||ev.pointerId!==drag.id)return;move(ev);const moved=drag.started;if(moved){ignoreClick=true;commit();}else{clearDrag();activeNumbers.delete(api);input.focus();input.select();}},o);
  for(const type of ['pointercancel','lostpointercapture'])input.addEventListener(type,ev=>{if(drag&&ev.pointerId===drag.id)cancel();},o);
 },options);
 window.addEventListener('blur',cancel,options);window.addEventListener('resize',cancel,options);
 return api;
}
// Explicit compound creation contract. The value precedes its visual control in
// DOM and Tab order; lifecycle enhancement never relies on input[type=number].
export function rangeNumber(value,range){return '<div class="reference-combo ref-range-number"><span class="ref-combo-value">'+value+'</span>'+range+'</div>';}
export function colorControl(hex,preview){return '<div class="reference-combo ref-color-control"><span class="ref-combo-value">'+hex+'</span>'+preview+'</div>';}
export function mountControls(root){
 let owned=bindings.get(root);if(!owned){owned=new Map();bindings.set(root,owned);}
 for(const [node,binding]of owned)if(!root.contains(node)){binding.dispose();owned.delete(node);}
 for(const select of root.querySelectorAll('select')){
  if(owned.has(select)){owned.get(select).sync();continue;}
  const component=window.CoreUI.enhanceSelect({select,document:root.ownerDocument,getControlRect:viewportRect});
  select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const label=select.labels?.[0]?.cloneNode(true);label?.querySelectorAll('select,.custom-select').forEach(el=>el.remove());const name=select.getAttribute('aria-label')||label?.textContent?.trim()||select.id;
  component.trigger.setAttribute('aria-label',name);component.trigger.dataset.referenceSelect='';
  const events=new AbortController();select.addEventListener('change',()=>{if(component.menu.contains(document.activeElement))component.trigger.focus();},{capture:true,signal:events.signal});
  // CoreUI's trigger owns arrows. Complete the same contract inside the portal.
  component.menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();component.close(true);}else if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const items=[...component.viewport.querySelectorAll('button:not(:disabled)')],i=items.indexOf(document.activeElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}else if(e.key==='Tab')component.close(false);},{signal:events.signal});
  component.trigger.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&component.trigger.getAttribute('aria-expanded')==='true')component.viewport.querySelector('.is-selected:not(:disabled),button:not(:disabled)')?.focus();},{signal:events.signal});
  const dispose=component.dispose;owned.set(select,{sync:component.sync,dispose(){events.abort();dispose();select.removeAttribute('aria-hidden');select.removeAttribute('tabindex');}});
 }
 for(const input of root.querySelectorAll('input[type=number]'))if(!owned.has(input))owned.set(input,bindNumber(input));
 for(const input of root.querySelectorAll('input[type=range]'))if(!owned.has(input))owned.set(input,bindRange(input));
}
export function disposeControls(root){const owned=bindings.get(root);if(!owned)return;bindings.delete(root);for(const b of owned.values())b.dispose();}
export function closeSelect(){return window.CoreUI.closeSelectComponents();}
