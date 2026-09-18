import {copy} from './copy.js';
import {isNumber} from './controls.js';
import {RegistryView} from './lab/registry-view.js';
import {normalizeField} from './lab/registry-model.js';
import {esc,bilingual} from './shared.js';
export class ReferenceRegistry extends RegistryView {
 constructor(root,id,options={}){
  super(root,id,options);this.checkpoint=JSON.stringify(this.session.values);
  window.addEventListener('blur',()=>this.endDrag(null,true),{signal:this.abort.signal});
  root.addEventListener('focusout',e=>{if(isNumber(e.target)&&e.target.dataset.regValue)this.commitNumber(e.target);},{signal:this.abort.signal});
  root.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&isNumber(e.target)&&e.target.dataset.regValue){e.preventDefault();this.commitNumber(e.target);}},{signal:this.abort.signal});
 }
 fieldHTML(field,index){let html=super.fieldHTML(field,index);if(field.trackMax!==undefined)html=html.replace(/<input type="range"[^>]+>/,tag=>tag.replace(/ max="[^"]*"/,'').replace(/ min="[^"]*"/,'').replace('>',' min="'+(field.trackMin??field.min??0)+'" max="'+field.trackMax+'">'));if(field.descriptionKey&&!field.hintKey)html+=`<p class="reg-hint">${esc(this.t(field.descriptionKey))}</p>`;if(!this.session.enabled(field))html+=`<p class="reg-hint ref-disabled">${esc(copy(field.disabledReason||'')||bilingual('Unavailable in the selected fixture context.','在所选模拟上下文中不可用。'))} ${esc(field.enabledWhen?.stateKey||'')}</p>`;return html;}
 input(e){const el=e.target,key=el.dataset.regValue,field=key&&this.session.field(key);if(isNumber(el)&&field){const raw=el.value,n=Number(raw);if(raw===''||!Number.isFinite(n)||n<(field.min??-Infinity)||n>(field.max??Infinity)){el.setAttribute('aria-invalid','true');return;}}super.input(e);}
 commitNumber(el){const key=el.dataset.regValue,field=this.session.field(key);if(!field||el.disabled)return;const next=normalizeField(field,el.value);if(next!==undefined)this.session.set(key,next);el.value=this.session.values[key];el.removeAttribute('aria-invalid');this.syncFields(key);this.paint();}
 change(e){if(isNumber(e.target)&&e.target.dataset.regValue){this.commitNumber(e.target);return;}super.change(e);}
 endDrag(e,cancel=false){super.endDrag(e,cancel||e?.type==='lostpointercapture');}
 get dirty(){return this.busy||!!this.picker||!!this.drag||!!this.root.querySelector('[aria-invalid="true"]')||this.checkpoint!==JSON.stringify(this.session.values);}
 save(){this.root.querySelectorAll('input[type=number][data-reg-value]').forEach(el=>this.commitNumber(el));this.checkpoint=JSON.stringify(this.session.values);return true;}
 discard(){this.endDrag(null,true);this.closePicker(false);this.session.values=JSON.parse(this.checkpoint);this.render();}
}
