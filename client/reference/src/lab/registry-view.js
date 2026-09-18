import {viewportRect} from '../geometry.js';
import {copy} from '../copy.js';
import {mountControls,disposeControls,isNumber,rangeNumber,colorControl} from '../controls.js';
import {REGISTRY_SCHEMAS} from './registry-schema.js';
import {RegistrySession,CONTEXTS,clone,defaults,label} from './registry-model.js';
import {ColorPicker} from './color-picker.js';
import {parseColor,toHex} from './color-model.js';
import {curveDrawing,curveGraphHTML,updateCurveGraph} from './registry-graph.js';
import {captureRegistryFocus,restoreRegistryFocus} from './registry-focus.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessions=new Map();
let instance=0;
import {CURVE_HEIGHT,clamp,curveGeometry,endpointSpeed,speedHandle,influenceAt,fromSpeed} from './registry-curve.js';
export {curveGeometry} from './registry-curve.js';


export class RegistryView{
 constructor(root,id,{saved,sessionKey=id}={}){
  this.root=root;this.root.dataset.registryTool=id;this.id=id;this.sessionKey=sessionKey;const cached=saved||sessions.get(sessionKey);this.session=new RegistrySession(id,cached?.session);this.schema=REGISTRY_SCHEMAS[id];this.ui={lang:'en',query:'',collapsed:{},curveModes:{},curveOverlays:{},curveHeights:{},previewOpen:id==='selection'||(root.closest('.plugin')?.clientWidth||0)>=800,...clone(cached?.ui||{})};this.uid='registry-'+(++instance);this.graphSizes={};this.graphObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(entries=>{for(const entry of entries){const key=entry.target.closest('[data-reg-curve]')?.dataset.regCurve;if(!key||!this.root.contains(entry.target)||!entry.contentRect.width)continue;const width=entry.target.clientWidth,height=entry.target.clientHeight,previous=this.graphSizes[key];if(previous&&Math.abs(previous.width-width)<.1&&Math.abs(previous.height-height)<.1)continue;this.graphSizes[key]={width,height};if(this.drag?.key===key)this.drag.rect=null;this.repaintCurve(key);}});this.closingPickers=new Set();this.abort=new AbortController();this.busy=false;this.feedback=cached?.feedback||copy("Interactive preview · After Effects is not connected");
  const options={signal:this.abort.signal};root.addEventListener('click',e=>this.click(e),options);root.addEventListener('input',e=>this.input(e),options);root.addEventListener('change',e=>this.change(e),options);root.addEventListener('focusout',e=>{if(e.target.dataset.regCurveValue)this.commitCurveInput(e.target);},options);root.addEventListener('scroll',()=>{if(this.drag)this.drag.rect=null;},{...options,capture:true});root.addEventListener('pointerdown',e=>this.pointerDown(e),options);root.addEventListener('pointermove',e=>this.pointerMove(e),options);root.addEventListener('pointerup',e=>this.endDrag(e),options);root.addEventListener('pointercancel',e=>this.endDrag(e,true),options);root.addEventListener('lostpointercapture',e=>this.endDrag(e),options);root.addEventListener('keydown',e=>this.keydown(e),options);this.render();if(cached?.scroll)this.root.querySelector('.reg-body').scrollTop=cached.scroll;if(cached?.formScroll)this.root.querySelector('.reg-form').scrollTop=cached.formScroll;
 }
 t(key){return label(this.schema,key,this.ui.lang);}
 attr(field){return `${!this.session.enabled(field)||this.busy?' disabled':''}${field.readonly?' readonly':''}`;}
 actionHTML(field,key){const variant=field.variant||field.style||'secondary';return `<button type="button" class="reg-action reg-${esc(variant)}" data-reg-action="${esc(key)}" ${!this.session.enabled(field)||this.busy?'disabled':''}><span>${esc(this.t(field.labelKey))}</span>${field.secondaryText?`<small>${esc(field.secondaryText)}</small>`:''}</button>`;}
 fieldHTML(field,index){
  const key=field.key,id=`${this.uid}-${key||index}`,title=this.t(field.labelKey),value=this.session.values[key],hint=this.t(field.hintKey),a=this.attr(field),labelHTML=`<label class="reg-label" for="${id}">${esc(title)}</label>`,help=hint?`<span class="reg-hint">${esc(hint)}</span>`:'';
  let control='';
  switch(field.type){
   case 'divider':case 'separator':return '<hr class="reg-divider">';
   case 'subheading':return `<h5 class="reg-subheading">${esc(title)}</h5>`;
   case 'info':case 'note':return `<p class="reg-note">${esc(title)}</p>`;
   case 'button':case 'actionButton':return this.actionHTML(field,key);
   case 'text':control=`${labelHTML}<input id="${id}" data-reg-value="${key}" value="${esc(value)}"${a}>`;break;
   case 'textarea':control=`${labelHTML}<textarea id="${id}" data-reg-value="${key}" rows="3"${a}>${esc(value)}</textarea>`;break;
   case 'number':case 'range':{
    const bounds=`${field.min!==undefined?`min="${field.min}"`:''} ${field.max!==undefined?`max="${field.max}"`:''} step="${field.step||1}"`;
    const number=`<input type="number" id="${id}" data-reg-value="${key}" value="${value}" ${bounds}${a}>`;
    control=labelHTML+(field.type==='range'?rangeNumber(number,`<input type="range" aria-label="${esc(title)} ${copy('slider')}" data-reg-value="${key}" value="${value}" ${bounds}${a}>`):`<div class="reg-numeric">${number}</div>`);break;
   }
   case 'switch':case 'checkbox':control=`<label class="reg-check"><span>${esc(title)}</span><input id="${id}" type="checkbox" ${field.type==='switch'?'role="switch"':''} data-reg-value="${key}" ${value?'checked':''}${a}></label>`;break;
   case 'select':control=`${labelHTML}<select id="${id}" data-reg-value="${key}"${a}>${field.options.map(o=>`<option value="${esc(o.value)}" ${o.value===value?'selected':''} ${o.disabled?'disabled':''}>${esc(this.t(o.labelKey))}</option>`).join('')}</select>`;break;
   case 'tabs':control=`<span class="reg-label">${esc(title)}</span><div class="reg-options" role="group" aria-label="${esc(title)}">${field.options.map(o=>`<button type="button" data-reg-tab="${key}" data-value="${esc(o.value)}" aria-pressed="${o.value===value}" ${o.disabled||!this.session.enabled(field)||this.busy?'disabled':''} title="${esc(this.t(o.descriptionKey))}">${o.iconText?`<i aria-hidden="true">${esc(o.iconText)}</i>`:''}<span>${esc(this.t(o.labelKey))}</span></button>`).join('')}</div>`;break;
   case 'color':control=labelHTML+colorControl(`<input id="${id}" data-reg-value="${key}" value="${esc(value)}" spellcheck="false" maxlength="7" aria-label="${esc(title)} HEX"${a}>`,`<button type="button" data-reg-color="${key}" aria-label="${esc(copy('Edit {title}',{title}))}" aria-haspopup="dialog" aria-expanded="false"${a}><i style="background:${esc(value)}"></i></button>`);break;
   case 'cubicBezier':control=`<span class="reg-label">${esc(title)}${field.readonly?`<small>${copy("Read only")}</small>`:field.disabled?`<small>${copy("Disabled")}</small>`:''}</span><div data-reg-curve="${key}">${this.curveHTML(field)}</div>`;break;
   default:throw new Error('Unsupported Registry control: '+field.type);
  }
  return `<div class="reg-field reg-type-${field.type}" data-reg-field="${esc(key||index)}">${control}${help}</div>`;
 }
 curveSize(key){return {width:this.graphSizes[key]?.width||this.root.querySelector(`[data-reg-curve="${key}"] .reg-graph-viewport`)?.clientWidth||300,height:clamp(this.ui.curveHeights[key]||CURVE_HEIGHT.default,CURVE_HEIGHT.min,CURVE_HEIGHT.max)};}
 drawing(field){const key=field.key;return curveDrawing(this.session.values[key],{key,title:this.t(field.labelKey),mode:this.ui.curveModes[key]||field.initialView||'progress',overlay:this.ui.curveOverlays[key]!==false,editable:!field.readonly&&this.session.enabled(field)&&!this.busy,size:this.curveSize(key),ranges:this.drag?.key===key?this.drag.ranges:null});}
 curveHTML(field){
  const key=field.key,c=this.session.values[key],d=this.drawing(field),editable=!field.readonly&&this.session.enabled(field)&&!this.busy;
  return `<div class="reg-curve-toolbar" role="group" aria-label="${copy("Curve view")}">${['progress','speed'].map(m=>`<button type="button" data-reg-curve-mode="${key}" data-reg-mode="${m}" aria-pressed="${d.mode===m}" ${field.disabled?'disabled':''}>${m==='progress'?copy("Value"):copy("Speed")}</button>`).join('')}<button type="button" class="reg-overlay-button" data-reg-overlay="${key}" aria-pressed="${d.overlay}" aria-label="${copy("Overlay value and speed curves")}" ${field.disabled?'disabled':''}>${copy("Overlay")}</button></div><div class="reg-graph-stage" data-focus="${d.mode}" data-overlay="${d.overlay}"><div class="reg-axis-labels"><span>${copy("Value")}</span><span>${copy("Speed · Δvalue / Δtime")}</span></div><div class="reg-graph-viewport"><svg id="${this.uid}-${key}-graph" class="reg-curve-graph" viewBox="0 0 ${d.width} ${d.height}" style="height:${d.height}px" role="group" aria-label="${esc(d.label)}">${curveGraphHTML(d)}</svg></div><div class="reg-curve-resize" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="${copy("Resize curve height")}" aria-controls="${this.uid}-${key}-graph" aria-valuemin="${CURVE_HEIGHT.min}" aria-valuemax="${CURVE_HEIGHT.max}" aria-valuenow="${d.height}" data-reg-curve-resize="${key}" title="${copy("Drag to resize · Up / Down to adjust")}"><span></span></div></div><div class="reg-curve-values">${['x1','y1','x2','y2'].map(k=>`<label>${k.toUpperCase()}<input type="number" data-reg-curve-value="${key}" data-axis="${k}" value="${c[k]}" min="${k[0]==='x'?0:-4}" max="${k[0]==='x'?1:4}" step="0.01" aria-describedby="${this.uid}-${key}-notice" ${!editable?'disabled':''}></label>`).join('')}</div><p class="reg-curve-notice" id="${this.uid}-${key}-notice" data-reg-curve-notice="${key}" role="status" aria-live="polite"></p><p class="reg-curve-gesture">${d.mode==='speed'?copy("↔ Influence · ↕ Speed"):copy("Drag handles to shape the curve")}</p>`;
 }
 observeGraphs(){this.graphObserver?.disconnect();this.root.querySelectorAll('.reg-graph-viewport').forEach(viewport=>this.graphObserver?.observe(viewport));}
 refreshSections(){this.endDrag(null,true);const saved=captureRegistryFocus(this.root);this.root.querySelector('.reg-sections').innerHTML=this.sectionsHTML();this.observeGraphs();mountControls(this.root);if(saved&&!document.activeElement?.isConnected)restoreRegistryFocus(this.root,saved);}
 sectionsHTML(){
  const query=this.ui.query.toLocaleLowerCase().trim();let count=0;
  const html=(this.schema.sections||[]).map(section=>{
   const allMatch=this.t(section.labelKey).toLocaleLowerCase().includes(query),fields=section.fields.filter(f=>this.session.visible(f)&&(!query||allMatch||(this.t(f.labelKey)+' '+(f.key||'')+' '+(f.secondaryText||'')).toLocaleLowerCase().includes(query)));
   if(!fields.length)return '';count+=fields.length;const collapsed=!query&&(this.ui.collapsed[section.id]??!!section.defaultCollapsed),contentID=`${this.uid}-section-${section.id}`;
   return `<section class="reg-section" data-reg-section="${section.id}"><header class="reg-section-head"><button type="button" class="reg-section-title" data-reg-collapse="${section.id}" aria-expanded="${!collapsed}" aria-controls="${contentID}"><svg class="disclosure-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg><h4>${esc(this.t(section.labelKey))}</h4></button>${section.toggleKey?`<label class="reg-section-toggle"><span class="sr-only">${esc(copy('Enable {title}',{title:this.t(section.labelKey)}))}</span><input type="checkbox" role="switch" data-reg-toggle="${section.toggleKey}" ${this.session.values[section.toggleKey]?'checked':''} ${this.busy?'disabled':''}></label>`:''}</header><div id="${contentID}" class="reg-section-content" ${collapsed?'hidden':''}>${section.descriptionKey?`<p class="reg-description">${esc(this.t(section.descriptionKey))}</p>`:''}<div class="reg-fields ${section.id==='nativeItems'?'reg-native-items':''}">${fields.map((f,i)=>this.fieldHTML(f,section.id+'-'+i)).join('')}</div></div></section>`;
  }).join('');
  return count?html:query?`<p class="reg-empty">${copy("No matching controls. Try another search.")}</p>`:'';
 }
 render(){
  this.endDrag(null,true);const saved=captureRegistryFocus(this.root),scroll=this.root.querySelector('.reg-body')?.scrollTop||0,formScroll=this.root.querySelector('.reg-form')?.scrollTop||0;this.root.dataset.previewOpen=String(this.ui.previewOpen);
  this.closePicker(false);disposeControls(this.root);this.root.innerHTML=`<div class="reg-toolbar"><span class="reg-preview-badge">${copy("Preview")}</span><label><span class="sr-only">${copy("Preview selection")}</span><select data-reg-context ${this.busy?'disabled':''}>${CONTEXTS.map(([key,name])=>`<option value="${key}" ${this.session.context===key?'selected':''}>${esc(copy(name))}</option>`).join('')}</select></label><label><span class="sr-only">${copy("Tool language")}</span><select data-reg-language><option value="en" ${this.ui.lang==='en'?'selected':''}>EN</option><option value="zh-CN" ${this.ui.lang==='zh-CN'?'selected':''}>中文</option></select></label></div><div class="reg-body"><aside class="reg-inspector"><button class="reg-preview-toggle" type="button" data-reg-preview aria-expanded="${this.ui.previewOpen}"><span>${copy("Preview & context")}</span><svg class="disclosure-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg></button><div class="reg-preview-content" ${this.ui.previewOpen?'':'hidden'}><div class="reg-live-preview"></div><div class="reg-context"></div><p class="reg-preview-note">${copy("Local illustration · No changes to After Effects")}</p></div></aside><div class="reg-form">${this.id!=='selection'?`<div class="reg-search"><label><span class="sr-only">${copy("Find a control")}</span><input type="search" data-reg-search placeholder="${copy("Find a control…")}" value="${esc(this.ui.query)}"></label>${!this.schema.hideRestoreDefaults?`<button type="button" data-reg-reset title="${copy("Restore this tool’s controls")}" `+(this.busy?'disabled':'')+`>${copy("Reset")}</button>`:''}</div>`:''}<div class="reg-sections">${this.sectionsHTML()}</div><details class="reg-result" ${this.session.lastResult?'':'hidden'}><summary data-reg-result>${copy("Preview result")}</summary><pre></pre></details></div></div><footer class="reg-footer"><span class="reg-feedback" data-reg-status tabindex="-1" role="status" aria-live="polite"></span><div class="reg-footer-actions">${this.schema.actions.filter(a=>!a.hidden&&!a.fieldOnly).map(a=>this.actionHTML(a,a.id)).join('')}<button type="button" class="reg-action" data-tool-use>${copy("Use in Vela")}</button></div></footer>`;
  this.root.querySelector('.reg-body').scrollTop=scroll;this.root.querySelector('.reg-form').scrollTop=formScroll;this.paint();this.observeGraphs();mountControls(this.root);restoreRegistryFocus(this.root,saved);
 }
 paint(){
  this.root.querySelector('.reg-feedback').textContent=copy(this.feedback);this.root.querySelector('.reg-feedback').dataset.tone=this.session.lastResult?.ok===false?'error':'normal';
  const state=this.session.state,fields=this.schema.stateCard?.fields||[{stateKey:'activeComp',label:copy("Composition")},{stateKey:'selectionCount',label:copy("Selected layers")}];
  this.root.querySelector('.reg-context').innerHTML=`<dl>${fields.map(f=>`<div><dt>${esc(f.label||this.t(f.labelKey))}</dt><dd>${typeof state[f.stateKey]==='boolean'?(state[f.stateKey]?copy("Ready"):copy("Unavailable")):esc(state[f.stateKey])}</dd></div>`).join('')}</dl>`;
  this.root.querySelector('.reg-live-preview').innerHTML=this.previewHTML();const result=this.root.querySelector('.reg-result');result.hidden=!this.session.lastResult;if(this.session.lastResult)result.querySelector('pre').textContent=JSON.stringify(this.session.lastResult,null,2);
 }
 previewHTML(){
  const v=this.session.values,s=this.session.state;if(!s.hasComp)return `<div class="reg-illustration reg-preview-empty">${copy("Open a composition")}<br><small>${copy("Choose a preview context above")}</small></div>`;
  if(this.id==='text'){const fill=v.enableFill?(v.fillMode==='Gradient Fill'?`linear-gradient(110deg,${v.fillColor},#797184)`:v.fillColor):'transparent';return `<div class="reg-illustration"><span class="reg-background-sample" style="padding:${Math.min(v.paddingY,70)/3+3}px ${Math.min(v.paddingX,100)/3+3}px;border-radius:${Math.min(v.cornerRadius,120)/3}px"><i style="background:${esc(fill)};opacity:${v.fillOpacity/100}"></i><i style="border:${v.enableStroke?Math.min(v.strokeWidth,30)/2:0}px solid ${esc(v.strokeColor)};opacity:${v.strokeOpacity/100};${v.strokeMode==='Gradient Stroke'?'mask-image:linear-gradient(90deg,#000,transparent)':''}"></i><strong>${s.selectionCount?'Opening titles':'100 × 100'}</strong></span></div>`;}
  if(this.id==='kit'){if(v.componentKind==='featureStack')return `<div class="reg-illustration"><div class="reg-stack" style="gap:${Math.min(v.gap,100)/4}px;align-items:${v.textAlign==='left'?'flex-start':'center'}">${[copy("Build with intention"),copy("Make it move"),copy("Made in Lomond")].map(text=>`<span style="background:${v.fillColor};border-radius:${v.cornerRadius/3}px;padding:${v.paddingY/4+3}px ${v.paddingX/4+5}px;${v.pillWidthMode==='fixed'?'width:'+Math.min(100,v.fixedWidth/4)+'%;':''}">${text}</span>`).join('')}</div></div>`;return `<div class="reg-illustration"><div class="reg-icon-grid" style="grid-template-columns:repeat(${v.columns},minmax(0,1fr));gap:${Math.min(v.gapY/6,20)}px ${Math.min(v.gapX/6,20)}px">${Array.from({length:6},(_,i)=>`<span style="aspect-ratio:${v.cellWidth}/${v.cellHeight};font-size:${Math.min(22,Math.max(8,v.targetHeight/4))}px">${['◆','●','✦','■','○','◇'][i]}</span>`).join('')}</div></div>`;}
  if(this.id==='shape')return `<div class="reg-illustration"><svg viewBox="0 0 200 110" aria-label="${copy("Shape illustration")}"><path d="M35 55 C35 6 165 6 165 55 S35 104 35 55Z" fill="${v.fillColor}" stroke="${v.strokeColor}" stroke-width="${Math.min(16,v.strokeWidth/2)}" stroke-dasharray="${Math.max(0,v.trimEnd-v.trimStart)*3.9} 390" stroke-dashoffset="${v.trimOffset}"/></svg></div><p class="reg-items-count">${this.session.items.length} preview operations</p>${this.session.items.length?`<ol class="reg-operation-list">${this.session.items.slice(-5).map(item=>`<li>${esc(item.key)}</li>`).join('')}</ol>`:''}`;
  if(this.id==='selection')return `<div class="reg-selection"><strong>${s.selectionCount}</strong><span>selected layers</span></div>${s.selectionCount?`<ul class="reg-layer-list">${Array.from({length:s.selectionCount},(_,i)=>`<li><i>${this.session.context==='shapes'?'◇':'T'}</i><span>${this.session.context==='shapes'?'Shape '+(i+1):['Title','Subtitle','Caption'][i]}<small>${this.session.context==='shapes'?'Shape':'Text'} layer · 2D</small></span></li>`).join('')}</ul>`:`<p class="reg-note">${copy("Choose a selection context above.")}</p>`}`;
  return '<div class="reg-control-mark" aria-hidden="true"><span>01</span><i></i><i></i><b>Registry</b></div>';
 }
 syncFields(key,source){for(const input of this.root.querySelectorAll(`[data-reg-value="${key}"]`))if(input!==source){if(input.type==='checkbox')input.checked=!!this.session.values[key];else input.value=this.session.values[key];}if(this.session.field(key)?.type==='color'){const chip=this.root.querySelector(`[data-reg-color="${key}"] i`);if(chip)chip.style.background=this.session.values[key];}}
 input(e){const el=e.target;if(el.matches('[data-reg-search]')){this.ui.query=el.value;this.refreshSections();return;}
  if(el.dataset.regCurveValue){this.editCurve(el.dataset.regCurveValue,el.dataset.axis,el.value,el);return;}
  const key=el.dataset.regValue;if(!key)return;const value=el.type==='checkbox'?el.checked:el.value,valid=this.session.set(key,value);el.setAttribute('aria-invalid',String(!valid));if(valid){this.syncFields(key,el);this.paint();}
 }
 change(e){const el=e.target;if(el.dataset.regCurveValue){this.commitCurveInput(el);return;}if(el.hasAttribute('data-reg-context')){this.session.setContext(el.value);this.feedback=copy("Preview context changed");this.render();return;}if(el.hasAttribute('data-reg-language')){this.ui.lang=el.value;this.render();return;}if(el.dataset.regToggle){if(!this.busy){this.session.values[el.dataset.regToggle]=el.checked;const section=this.schema.sections.find(s=>s.toggleKey===el.dataset.regToggle);this.ui.collapsed[section.id]=!el.checked;this.updateSection(section.id);}return;}if(el.dataset.regValue){this.input(e);if(el.getAttribute('aria-invalid')==='true'){el.value=this.session.values[el.dataset.regValue];el.removeAttribute('aria-invalid');}if(['select','tabs','switch','checkbox'].includes(this.session.field(el.dataset.regValue)?.type))this.render();else this.syncFields(el.dataset.regValue);}}
 click(e){const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.regCollapse){const id=b.dataset.regCollapse,section=this.schema.sections.find(s=>s.id===id);this.ui.collapsed[id]=!(this.ui.collapsed[id]??!!section.defaultCollapsed);this.updateSection(id);}
  if(b.hasAttribute('data-reg-preview')){this.ui.previewOpen=!this.ui.previewOpen;this.render();this.root.querySelector('[data-reg-preview]').focus({preventScroll:true});}
  if(b.dataset.regTab){this.session.set(b.dataset.regTab,b.dataset.value);this.render();this.root.querySelector(`[data-reg-tab="${b.dataset.regTab}"][data-value="${b.dataset.value}"]`)?.focus({preventScroll:true});}
  if(b.dataset.regCurveMode){this.ui.curveModes[b.dataset.regCurveMode]=b.dataset.regMode;this.repaintCurve(b.dataset.regCurveMode,b);e.stopPropagation();}
  if(b.dataset.regOverlay){const key=b.dataset.regOverlay;this.ui.curveOverlays[key]=this.ui.curveOverlays[key]===false;this.repaintCurve(key,b);e.stopPropagation();}
  if(b.dataset.regColor)this.openPicker(b.dataset.regColor);
  if(b.hasAttribute('data-reg-reset')){this.session.values=defaults(this.schema);this.feedback=copy("Controls restored to source defaults");this.render();this.root.querySelector('[data-reg-reset]')?.focus({preventScroll:true});}
  if(b.dataset.regAction)this.run(b.dataset.regAction);
 }
 async run(key){
  if(this.busy)return;const field=this.session.action(key);if(!field||!this.session.enabled(field)||!this.session.visible(field))return;const action=this.schema.actions.find(a=>a.id===(field.actionId||field.id));
  this.busy=true;this.feedback=copy('Preview')+' · '+(this.t(field.pendingMessageKey||action?.pendingMessageKey)||copy("Running…"));this.render();
  await new Promise(resolve=>{this.finishPending=resolve;this.pendingTimer=setTimeout(resolve,360);});this.finishPending=null;if(this.abort.signal.aborted)return;
  const result=this.session.run(key);this.busy=false;
  this.feedback=result?.ok?copy('Preview')+' · '+(this.t(field.successMessageKey||action?.successMessageKey)||copy("Complete. Inspect the result below.")):copy('Preview')+' · '+(this.t(field.errorMessageKey||action?.errorMessageKey)||copy("Action failed. Check the context and try again."));
  const restoreAction=this.root.contains(document.activeElement)&&document.activeElement?.hasAttribute('data-reg-status');this.render();if(restoreAction)this.root.querySelector(`[data-reg-action="${key}"]`)?.focus({preventScroll:true});
 }
 updateSection(id){
  const section=this.schema.sections.find(s=>s.id===id),host=this.root.querySelector(`[data-reg-section="${id}"]`);if(!host)return;
  const collapsed=this.ui.collapsed[id]??!!section.defaultCollapsed;host.querySelector('[data-reg-collapse]').setAttribute('aria-expanded',String(!collapsed));host.querySelector('.reg-section-content').hidden=collapsed;
  for(const field of section.fields){if(!field.key)continue;const row=host.querySelector(`[data-reg-field="${field.key}"]`),button=host.querySelector(`[data-reg-action="${field.key}"]`);if(button)button.disabled=!this.session.enabled(field)||this.busy;if(row)for(const control of row.querySelectorAll('input,select,textarea,button'))control.disabled=!this.session.enabled(field)||!!field.readonly||this.busy;if(field.type==='cubicBezier')this.repaintCurve(field.key);}
  if(this.picker&&section.fields.some(f=>f.key===this.pickerKey)&&!this.session.values[section.toggleKey])this.closePicker(false);this.paint();mountControls(this.root);
 }
 repaintCurve(key,source){
  const field=this.session.field(key),host=this.root.querySelector(`[data-reg-curve="${key}"]`);if(!host)return;
  const d=this.drawing(field);updateCurveGraph(host.querySelector('svg'),d);
  host.querySelector('[data-reg-curve-resize]').setAttribute('aria-valuenow',String(d.height));host.querySelector('.reg-curve-gesture').textContent=d.mode==='speed'?copy("↔ Influence · ↕ Speed"):copy("Drag handles to shape the curve");
  const stage=host.querySelector('.reg-graph-stage');stage.dataset.focus=d.mode;stage.dataset.overlay=String(d.overlay);
  for(const button of host.querySelectorAll('[data-reg-mode]'))button.setAttribute('aria-pressed',String(button.dataset.regMode===d.mode));host.querySelector('[data-reg-overlay]').setAttribute('aria-pressed',String(d.overlay));
  for(const input of host.querySelectorAll('[data-axis]'))if(input!==source&&input!==document.activeElement){input.value=this.session.values[key][input.dataset.axis];input.removeAttribute('aria-invalid');}
 }
 curveNotice(key,message){const notice=this.root.querySelector(`[data-reg-curve-notice="${key}"]`);if(notice)notice.textContent=message;}
 editCurve(key,axis,value,source){
  const n=Number(value),min=axis[0]==='x'?0:-4,max=axis[0]==='x'?1:4;
  if(value===''||!Number.isFinite(n)||source&&(n<min||n>max)){
   source?.setAttribute('aria-invalid','true');this.curveNotice(key,this.ui.lang==='zh-CN'?`${axis.toUpperCase()} 请输入 ${min} 至 ${max} 的数值。`:`Enter ${axis.toUpperCase()} between ${min} and ${max}.`);return;
  }
  if(this.session.set(key,{...this.session.values[key],[axis]:n})){source?.removeAttribute('aria-invalid');this.curveNotice(key,'');this.repaintCurve(key,source);}
 }
 commitCurveInput(input){
  const key=input.dataset.regCurveValue,axis=input.dataset.axis,raw=input.value;if(input.disabled||!this.session.enabled(this.session.field(key)))return;
  const n=Number(raw),min=axis[0]==='x'?0:-4,max=axis[0]==='x'?1:4,valid=raw!==''&&Number.isFinite(n),value=valid?clamp(n,min,max):this.session.values[key][axis];
  this.session.set(key,{...this.session.values[key],[axis]:value});input.value=String(this.session.values[key][axis]);input.removeAttribute('aria-invalid');this.repaintCurve(key,input);
  if(!valid||n!==value)this.curveNotice(key,this.ui.lang==='zh-CN'?`${axis.toUpperCase()} 已${valid?'限制为':'恢复为'} ${input.value}。`:`${axis.toUpperCase()} ${valid?'limited to':'restored to'} ${input.value}.`);
 }
 setCurveHeight(key,height){this.ui.curveHeights[key]=Math.round(clamp(height,CURVE_HEIGHT.min,CURVE_HEIGHT.max));this.repaintCurve(key);}
 pointerDown(e){
  const resize=e.target.closest('[data-reg-curve-resize]'),handle=e.target.closest('[data-reg-handle]');if((!resize&&!handle)||e.button!==0||this.drag)return;
  const active=document.activeElement;if(this.root.contains(active)&&active?.dataset.regCurveValue)this.commitCurveInput(active);
  const key=resize?.dataset.regCurveResize||handle.dataset.regHandle,svg=this.root.querySelector(`[data-reg-curve="${key}"] svg`),size=this.curveSize(key),rect=viewportRect(svg);
  if(resize)this.drag={kind:'resize',key,pointer:e.pointerId,startY:e.clientY,height:size.height,scaleY:rect.height?rect.height/size.height:1};
  else{const field=this.session.field(key);if(!this.session.enabled(field)||field.readonly||this.busy)return;const c=clone(this.session.values[key]),p=curveGeometry(c,'progress',size),v=curveGeometry(c,'speed',size),point=Number(handle.dataset.point);this.drag={kind:handle.dataset.handleKind,key,point,pointer:e.pointerId,curve:c,geometry:handle.dataset.handleKind==='value'?p:v,ranges:{progress:{min:p.min,max:p.max},speed:{min:v.min,max:v.max}},startX:e.clientX,startY:e.clientY,rect};}
  this.drag.target=resize||handle;this.curveNotice(key,'');(resize||handle).focus({preventScroll:true});this.root.setPointerCapture?.(e.pointerId);e.preventDefault();e.stopPropagation();
 }
 pointerMove(e){
  if(!this.drag||e.pointerId!==this.drag.pointer)return;this.pendingPointer={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY};
  if(this.dragFrame!==undefined)return;this.dragFrame=requestAnimationFrame(()=>{this.dragFrame=undefined;const latest=this.pendingPointer;this.pendingPointer=null;if(latest)this.applyPointer(latest);});
 }
 flushPointer(cancel=false){if(this.dragFrame!==undefined){cancelAnimationFrame(this.dragFrame);this.dragFrame=undefined;}const latest=this.pendingPointer;this.pendingPointer=null;if(latest&&!cancel)this.applyPointer(latest);}
 applyPointer(e){
  const d=this.drag;if(!d||e.pointerId!==d.pointer)return;
  if(d.kind==='resize'){this.setCurveHeight(d.key,d.height+(e.clientY-d.startY)/d.scaleY);return;}
  if(e.clientX===d.startX&&e.clientY===d.startY){if(d.moved){this.session.values[d.key]=clone(d.curve);this.repaintCurve(d.key);}return;}d.moved=true;
  const {key,point,geometry:g}=d,svg=this.root.querySelector(`[data-reg-curve="${key}"] svg`),rect=d.rect||(d.rect=viewportRect(svg));if(!rect.width||!rect.height)return;
  const x=(e.clientX-rect.left)*g.width/rect.width,y=(e.clientY-rect.top)*g.height/rect.height;
  let next;if(d.kind==='value')next={...this.session.values[key],['x'+point]:clamp(g.unX(x),0,1),['y'+point]:g.unY(y)};
  else{const original=speedHandle(d.curve,point,g),speed=Number.isFinite(original.speed)?original.speed:g.unY(original.y),dx=(e.clientX-d.startX)*g.width/rect.width,dy=(e.clientY-d.startY)*g.height/rect.height;next=fromSpeed(d.curve,point,d.kind==='speed-value'?original.influence:influenceAt(original.x+dx,point,g),speed-dy/(g.bottom-g.top)*(g.max-g.min));}
  if(this.session.set(key,next))this.repaintCurve(key,this.root);
 }
 endDrag(e,cancel=false){
  const d=this.drag;if(!d||e?.pointerId!==undefined&&e.pointerId!==d.pointer)return;this.flushPointer(cancel);this.drag=null;
  if(this.root.hasPointerCapture?.(d.pointer))this.root.releasePointerCapture(d.pointer);
  if(cancel){if(d.kind==='resize')this.ui.curveHeights[d.key]=d.height;else this.session.values[d.key]=d.curve;}
  this.repaintCurve(d.key);if(document.activeElement===d.target)this.root.querySelector(d.kind==='resize'?`[data-reg-curve-resize="${d.key}"]`:`[data-reg-handle="${d.key}"][data-point="${d.point}"][data-handle-kind="${d.kind}"]`)?.focus({preventScroll:true});
 }
 keydown(e){
  if(e.target.dataset.regCurveValue&&e.key==='Enter'){e.preventDefault();e.stopPropagation();this.commitCurveInput(e.target);return;}
  if(e.key==='Escape'&&this.drag){e.preventDefault();e.stopPropagation();this.endDrag(null,true);return;}
  const resize=e.target.closest('[data-reg-curve-resize]');if(resize&&['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const key=resize.dataset.regCurveResize;this.setCurveHeight(key,e.key==='Home'?CURVE_HEIGHT.min:e.key==='End'?CURVE_HEIGHT.max:this.curveSize(key).height+(e.key==='ArrowUp'?-1:1)*(e.shiftKey?40:10));return;}
  const h=e.target.closest('[data-reg-handle]');if(!h||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();
  const key=h.dataset.regHandle,n=Number(h.dataset.point),kind=h.dataset.handleKind,c=this.session.values[key],horizontal=['ArrowLeft','ArrowRight'].includes(e.key),delta=(e.shiftKey?.1:.01)*(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1);
  if(kind==='value')this.editCurve(key,(horizontal?'x':'y')+n,c[(horizontal?'x':'y')+n]+delta);
  else{const influence=n===1?c.x1:1-c.x2,speed=endpointSpeed(c,n),g=curveGeometry(c,'speed',this.curveSize(key));if(kind==='speed-value'&&horizontal)return;const next=fromSpeed(c,n,influence+(horizontal?delta*(n===1?1:-1):0),(Number.isFinite(speed)?speed:speed>0?g.max:g.min)+(horizontal?0:delta));if(this.session.set(key,next))this.repaintCurve(key);}
  const current=this.root.querySelector(`[data-reg-handle="${key}"][data-point="${n}"][data-handle-kind="${kind}"]`);current?.focus({preventScroll:true});this.curveNotice(key,current?.getAttribute('aria-label')?.split(';')[0]||'');
 }
 openPicker(key){
  if(this.pickerKey===key){this.closePicker();this.syncFields(key);return;}this.closePicker(false);for(const p of this.closingPickers)p.destroy({restoreFocus:false});this.closingPickers.clear();const color=parseColor(this.session.values[key]),anchor=()=>this.root.querySelector(`[data-reg-color="${key}"]`);this.pickerKey=key;
  this.picker=new ColorPicker(this.root.parentElement,{anchor,rgb:[color.r,color.g,color.b].map(v=>v/255),allowAlpha:false,title:this.t(this.session.field(key).labelKey),onPreview:value=>{const chip=anchor()?.querySelector('i');if(chip)chip.style.background=toHex({r:value.rgb[0]*255,g:value.rgb[1]*255,b:value.rgb[2]*255});},onApply:value=>{this.session.set(key,toHex({r:value.rgb[0]*255,g:value.rgb[1]*255,b:value.rgb[2]*255}));this.closePicker();this.syncFields(key);this.paint();},onCancel:({restoreFocus=true}={})=>{this.closePicker(restoreFocus);this.syncFields(key);},returnFocus:()=>anchor()?.focus({preventScroll:true})});
 }
 closePicker(restoreFocus=true){if(!this.picker)return;const p=this.picker,key=this.pickerKey;this.picker=null;this.pickerKey=null;if(!restoreFocus)p.returnFocus=()=>{};this.root.querySelector(`[data-reg-color="${key}"]`)?.setAttribute('aria-expanded','false');this.closingPickers.add(p);p.close().then(()=>this.closingPickers.delete(p));}
 snapshot(){return {session:this.session.snapshot(),ui:clone(this.ui),feedback:this.busy?'Preview interrupted · Ready to retry':this.feedback,scroll:this.root.querySelector('.reg-body')?.scrollTop||0,formScroll:this.root.querySelector('.reg-form')?.scrollTop||0};}
 destroy(){disposeControls(this.root);this.endDrag(null,true);this.graphObserver?.disconnect();sessions.set(this.sessionKey,this.snapshot());this.abort.abort();clearTimeout(this.pendingTimer);this.finishPending?.();this.picker?.destroy({restoreFocus:false});for(const p of this.closingPickers)p.destroy({restoreFocus:false});this.closingPickers.clear();}
}
