import {projectSettingsBorders,ownsBorder} from './style-projection.js';
import {copy} from './copy.js';
import {DATA} from './production-data.js';
import {REGISTRY_SCHEMAS} from './lab/registry-schema.js';
import {ReferenceRegistry} from './registry.js';
import {MemoryStore} from './memory-store.js';
import {esc,bilingual} from './shared.js';
const fields=DATA.settings.sections.flatMap(s=>s.fields);
const colorValue=value=>{if(typeof value==='object')return value;const rgb=String(value).match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(Number);return rgb?{color:'#'+rgb.slice(0,3).map(n=>Math.round(n).toString(16).padStart(2,'0')).join(''),alpha:rgb[3]??1}:{color:value,alpha:1};};
const curveDefault=value=>{const n=String(value||'cubic-bezier(.2,0,.2,1)').match(/-?\d*\.?\d+/g).map(Number);return {x1:n[0],y1:n[1],x2:n[2],y2:n[3]};};
function tuningValue(p){const raw=DATA.variables[p.cssProperty];if(p.type==='cubicBezier')return curveDefault(raw);if(p.type==='durationMs')return DATA.durations[p.motionRole];if(p.type==='colorAlpha')return colorValue(raw);if(p.type==='shadow'){const n=raw.split('rgba')[0].trim().split(/\s+/).map(parseFloat);return {offsetX:n[0],offsetY:n[1],blur:n[2],spread:n[3]||0,...colorValue(raw)};}return Number.parseFloat(raw)||p.editing?.trackMin||0;}
function expand(p,value){const base={key:p.id,labelKey:p.labelKey||'settings.designTuning.parameter.'+p.id,descriptionKey:p.descriptionKey||p.presentation?.descriptionKey,defaultValue:value,readonly:p.disposition==='PROTECTED',disabled:p.disposition==='PROTECTED',disabledReason:p.reason},type=p.controlType||p.type;
 if(type==='colorAlpha'||type==='shadow'){const parts=type==='shadow'?['offsetX','offsetY','blur','spread','color','alpha']:['color','alpha'];return parts.map(k=>({...base,key:p.id+'.'+k,labelKey:base.labelKey+' · '+k,type:k==='color'?'color':'number',defaultValue:value[k],min:k==='alpha'?0:k==='blur'?0:-100,max:k==='alpha'?1:100,step:k==='alpha'?.01:1}));}
 return [{...base,type:type==='cubicBezier'?'cubicBezier':type==='color'?'color':'range',min:p.validation?.min??p.validity?.min??0,max:p.validation?.max??p.validity?.max,trackMin:p.editing?.trackMin,trackMax:p.editing?.trackMax,step:p.validation?.step??p.editing?.step??.01}];
}
const appearance=DATA.appearance.flatMap(p=>expand(p,p.controlType==='color'?colorValue(DATA.defaults[p.id]).color:DATA.defaults[p.id]));
const tuning=DATA.tuning.map(p=>({...p,value:tuningValue(p)}));
const schema={id:'referenceSettings',i18n:DATA.dictionaries,actions:[],hideRestoreDefaults:true,sections:[
 {id:'general',labelKey:'settings.navigation.general',fields:[...fields.filter(f=>f.key==='language'),...appearance.filter(f=>['layout.scale','motion.speed'].includes(f.key))]},
 {id:'appearance',labelKey:'settings.navigation.appearance',fields:appearance.filter(f=>!['layout.scale','motion.speed'].includes(f.key))},
 {id:'icons',labelKey:'settings.theme.toolIconAppearance',defaultCollapsed:true,fields:fields.filter(f=>['proceduralIconMode','toolIconDarkSourceMode','toolIconDarkPaletteId','toolIconColor','toolIconLine'].includes(f.key)).map(f=>({...f,options:f.options?.length?f.options:[{value:'fixture',labelKey:'reference.fixturePalette'}]}))},
 {id:'background',labelKey:'section.backgroundEngine',defaultCollapsed:true,fields:DATA.settings.sections.find(s=>s.id==='backgroundEngine').fields.filter(f=>f.type!=='button').map(f=>({...f,key:'background.'+f.key,visibleWhen:undefined,enabledWhen:undefined,options:f.options?.length?f.options:[{value:'fixture',labelKey:'reference.fixturePalette'}]}))},
 {id:'advanced',labelKey:'settings.navigation.advanced',defaultCollapsed:true,fields:[...fields.filter(f=>f.key==='registryDebugTools'),...DATA.settings.sections.find(s=>s.id==='vela').fields.map(f=>({...f,readonly:true,descriptionKey:'reference.fixture'}))]},
 {id:'developer',labelKey:'settings.navigation.developer',defaultCollapsed:true,fields:fields.filter(f=>['homeIconRadius','homeDragShadowIntensity'].includes(f.key))},
 ...[...new Set(tuning.map(p=>p.domain))].map(domain=>({id:'tuning-'+domain,labelKey:['settings','designTuning',domain==='componentOptics'?'controls':domain,'title'].join('.'),defaultCollapsed:true,fields:tuning.filter(p=>p.domain===domain).flatMap(p=>expand(p,p.value))})),
 {id:'procedural',labelKey:'settings.developer.homeCalibration',defaultCollapsed:true,fields:DATA.settings.sections.find(s=>s.id==='proceduralAppearance').fields.filter(f=>f.type!=='button')}
]};
REGISTRY_SCHEMAS.settings=schema;
export const settingsStore=new MemoryStore({values:Object.fromEntries(schema.sections.flatMap(s=>s.fields).map(f=>[f.key,f.defaultValue])),overrides:[]});
export class SettingsView extends ReferenceRegistry {
 constructor(root){super(root,'settings',{saved:{session:{values:settingsStore.data.values},ui:{previewOpen:true}},sessionKey:'reference-settings'});this.store=settingsStore;this.root.classList.add('settings-reference');this.session.setContext('text');root.addEventListener('click',e=>{if(e.target.closest('[data-settings-play]'))this.root.querySelector('.ref-settings-preview').classList.toggle('playing');},{signal:this.abort.signal});}
 t(key){if(key?.includes(' · ')){const [base,part]=key.split(' · ');return super.t(base)+' · '+copy(part);}return super.t(key);}
 previewHTML(){return `<div class="ref-settings-preview"><strong>${esc(bilingual('Live appearance preview','外观实时预览'))}</strong><p>${esc(bilingual('Long supporting text remains readable in a compact field group.','紧凑字段分组中的长说明仍应清晰可读。'))}</p><button class="primary-button" data-settings-play>${esc(bilingual('Preview motion','预览动效'))}</button><span class="ref-motion-dot" aria-hidden="true"></span><input aria-label="${copy('Preview field')}" value="Lomond Cabinet"><span class="ref-state">${esc(bilingual('Selected · Focus · Error','已选择 · 焦点 · 错误'))}</span><output data-tuning-output></output></div>`;}
 paint(){super.paint();const root=this.root.querySelector('.ref-settings-preview');if(!root)return;const v=this.session.values,baseline=this.checkpoint?JSON.parse(this.checkpoint):{},changed=id=>settingsStore.data.overrides.includes(id)||this.checkpoint&&JSON.stringify(baseline[id])!==JSON.stringify(v[id]);const map={'base.accent':'--accent','base.canvas':'--stage','surface.panel':'--surface','text.primary':'--text'};for(const [id,property]of Object.entries(map))if(changed(id))root.style.setProperty(property,v[id]);else root.style.removeProperty(property);
  const calibration={},preview={};
  for(const p of DATA.tuning.filter(p=>ownsBorder(p.id))){const keys=[p.id+'.color',p.id+'.alpha'];if(keys.some(k=>settingsStore.data.overrides.includes(k)))calibration[p.id]={color:settingsStore.data.values[keys[0]],alpha:settingsStore.data.values[keys[1]]};if(keys.some(k=>this.checkpoint&&JSON.stringify(baseline[k])!==JSON.stringify(v[k])))preview[p.id]={color:v[keys[0]],alpha:v[keys[1]]};}
  projectSettingsBorders(root,calibration,preview);
  const applied=[];for(const p of DATA.tuning){const compound=['shadow','colorAlpha'].includes(p.type),parts=compound?Object.keys(tuning.find(q=>q.id===p.id).value):[],value=compound?Object.fromEntries(parts.map(k=>[k,v[p.id+'.'+k]])):v[p.id],isChanged=compound?parts.some(k=>changed(p.id+'.'+k)):changed(p.id);if(!isChanged)continue;
   let css=String(value);if(p.type==='cubicBezier')css=`cubic-bezier(${value.x1},${value.y1},${value.x2},${value.y2})`;if(p.type==='lengthPx')css=value+'px';if(p.type==='percentage')css=value+'%';if(compound){const hex=value.color.slice(1),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),color=`rgba(${rgb},${value.alpha})`;css=p.type==='shadow'?`${value.offsetX}px ${value.offsetY}px ${value.blur}px ${value.spread}px ${color}`:color;}
   if(p.cssProperty&&!ownsBorder(p.id))root.style.setProperty(p.cssProperty,css);applied.push(p.id+' = '+css);
  }
  root.style.fontSize=(13*(v['typography.body.size']||1))+'px';root.style.setProperty('--ref-motion-ms',(v['motion.duration.viewContentEnter']||DATA.durations.viewContentEnter)+'ms');root.querySelector('[data-tuning-output]').textContent=applied.slice(-3).join('\n');
 }
 save(){super.save();settingsStore.change(d=>{d.overrides=Object.keys(this.session.values).filter(k=>this.session.values[k]!==schema.sections.flatMap(s=>s.fields).find(f=>f.key===k)?.defaultValue);d.values={...this.session.values};});const result=settingsStore.flush();if(!result.fixtureSaved)this.checkpoint=JSON.stringify(settingsStore.saved.values);this.paint();return result.fixtureSaved;}
 discard(){settingsStore.reload();this.session.values={...settingsStore.data.values};this.checkpoint=JSON.stringify(this.session.values);this.render();}
 reset(){this.session.values=Object.fromEntries(schema.sections.flatMap(s=>s.fields).map(f=>[f.key,f.defaultValue]));this.render();}
}
export const settingsSchema=schema;
