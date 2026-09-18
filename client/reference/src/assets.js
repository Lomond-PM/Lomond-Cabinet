import {viewportRect} from './geometry.js';
import {isNumber} from './controls.js';
import {PaletteView} from './lab/palette-view.js';
import {CurveView} from './lab/curve-view.js';
import {clone,clamp,paintURL} from './lab/palette-model.js';
import {assetSettingsStore} from './lab/curve-store.js';
import {bilingual} from './shared.js';
import {normalizeField} from './lab/registry-model.js';
// Reference-only lifecycle adaptation. The unmodified production stores are absent.
export class ReferencePalette extends PaletteView {
 constructor(root,snapshot){super(root,snapshot);this.numericDrafts=new WeakMap();window.addEventListener('blur',()=>this.endStop(false),{signal:this.abort.signal});root.addEventListener('focusin',e=>{if(isNumber(e.target))this.numericDrafts.set(e.target,e.target.value);},{signal:this.abort.signal});root.addEventListener('focusout',e=>{if(e.target.getAttribute('aria-invalid')==='true'&&root.contains(e.target))this.change(e);},{signal:this.abort.signal});}
 input(e){const el=e.target;if(isNumber(el)&&(!el.value||!el.validity.valid)){el.setAttribute('aria-invalid','true');return;}super.input(e);if(isNumber(el)){el.removeAttribute('aria-invalid');this.numericDrafts.set(el,el.value);}}
 change(e){const el=e.target;if(isNumber(el)){const next=normalizeField({type:'number',min:el.min===''?undefined:Number(el.min),max:el.max===''?undefined:Number(el.max),step:Number(el.step)||1},el.value);el.value=next??this.numericDrafts.get(el)??0;el.removeAttribute('aria-invalid');}super.change(e);}
 dragStop(e){
  const handle=e.target.closest('[data-stop]');if(!handle||e.button!==0)return;
  e.preventDefault();this.endStop(false);this.ui.stopId=handle.dataset.stop;this.render();
  const target=this.root.querySelector(`[data-stop="${this.ui.stopId}"]`),track=target.closest('.pal-stop-track'),{p,s}=this.current(),draft=clone(s.paint),events=new AbortController();
  const drag={target,track,pointer:e.pointerId,palette:p.id,slot:s.id,stop:this.ui.stopId,channel:this.ui.channel==='color'?'colorStops':'opacityStops',draft,events,frame:null,pending:null};this.stopDrag=drag;
  target.focus({preventScroll:true});target.setPointerCapture(e.pointerId);
  const sample=ev=>{const rect=viewportRect(track);drag.pending=Math.round(clamp((ev.clientX-rect.left)/rect.width)*1000)/1000;if(drag.frame===null)drag.frame=requestAnimationFrame(()=>this.flushStop());};
  target.addEventListener('pointermove',ev=>{if(ev.pointerId===drag.pointer)sample(ev);},{signal:events.signal});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(type,ev=>{if(ev.pointerId===drag.pointer){if(type==='pointerup')sample(ev);this.endStop(type==='pointerup');}},{signal:events.signal});
 }
 flushStop(){const d=this.stopDrag;if(!d)return;if(d.frame!==null)cancelAnimationFrame(d.frame);d.frame=null;if(d.pending===null)return;d.draft[d.channel].find(s=>s.id===d.stop).offset=d.pending;d.target.style.left=(d.pending*100)+'%';d.target.setAttribute('aria-valuenow',String(d.pending*100));this.root.querySelectorAll(`[data-paint="${d.slot}"]`).forEach(img=>img.src=paintURL(d.draft,Number(img.dataset.w),Number(img.dataset.h),!!img.dataset.ramp));d.pending=null;}
 endStop(commit){const d=this.stopDrag;if(!d)return;if(commit)this.flushStop();if(d.frame!==null)cancelAnimationFrame(d.frame);d.events.abort();this.stopDrag=null;if(d.target.hasPointerCapture?.(d.pointer))d.target.releasePointerCapture(d.pointer);if(commit)this.store.change(data=>{data.palettes.find(p=>p.id===d.palette).slots.find(s=>s.id===d.slot).paint=d.draft;},{kind:'paint',undo:'Move gradient stop'});else this.paint();}
 keydown(e){if(e.key==='Escape'&&this.stopDrag){e.preventDefault();e.stopPropagation();this.endStop(false);return;}if(e.key==='Enter'&&!e.isComposing&&isNumber(e.target)){e.preventDefault();this.change(e);return;}super.keydown(e);}
 render(){this.endStop(false);super.render();}
 click(e){const action=e.target.closest('[data-pal-action]')?.dataset.palAction;if(['export','export-paint','import'].includes(action)){this.message(bilingual('Fixture library only. Import/export does not access production assets.','仅使用模拟库；本参考页不导入或导出生产资产。'));return;}super.click(e);}
 get dirty(){return this.store.dirty||assetSettingsStore().dirty||!!this.picker||!!this.stopDrag||!!this.root.querySelector('[aria-invalid=true]');}
 save(){return this.store.flush().fixtureSaved&&assetSettingsStore().flush().fixtureSaved;}
 discard(){this.endStop(false);this.closePicker(false,{animate:false});this.store.reload();assetSettingsStore().reload();}
 destroy(){this.endStop(false);super.destroy();}
}
export class ReferenceCurve extends CurveView {
 constructor(root,snapshot){super(root,snapshot);window.addEventListener('blur',()=>{this.endDrag(false);this.stop();},{signal:this.abort.signal});}
 keydown(e){if(e.key==='Escape'&&this.drag){e.preventDefault();e.stopPropagation();this.endDrag(false);return;}super.keydown(e);}
 click(e){const action=e.target.closest('[data-cv-action]')?.dataset.cvAction;if(['export-ae','export-curve','export-library','import'].includes(action)){this.message(bilingual('Fixture only; no AE execution or production asset transfer.','仅模拟数据，不执行 AE 操作或迁移生产资产。'));return;}super.click(e);}
 get dirty(){return this.store.dirty||assetSettingsStore().dirty||!!this.drag||!!this.root.querySelector('[aria-invalid=true]');}
 save(){return this.store.flush().fixtureSaved&&assetSettingsStore().flush().fixtureSaved;}
 discard(){this.endDrag(false);this.store.reload();assetSettingsStore().reload();}
}
