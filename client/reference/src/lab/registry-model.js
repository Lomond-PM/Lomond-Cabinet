import {REGISTRY_SCHEMAS} from './registry-schema.js';
export const clone=value=>structuredClone(value);
export const registryFields=schema=>(schema.sections||[]).flatMap(section=>section.fields||[]);
const common={auto:'Auto',fixed:'Fixed',center:'Center',left:'Left',right:'Right',yPosition:'Y position',xPosition:'X position',timeline:'Timeline',none:'None',fitBox:'Fit box',uniformHeight:'Uniform height',uniformWidth:'Uniform width',rowMajor:'Row major',solid:'Solid',gradient:'Gradient'};
const commonZh={auto:'自动',fixed:'固定',center:'居中',left:'左对齐',right:'右对齐',yPosition:'Y 位置',xPosition:'X 位置',timeline:'时间线',none:'无',fitBox:'适合边框',uniformHeight:'统一高度',uniformWidth:'统一宽度',rowMajor:'按行排列',solid:'纯色',gradient:'渐变'};
export function label(schema,key,lang='en'){return schema.i18n?.[lang]?.[key]??schema.i18n?.en?.[key]??(lang==='zh-CN'?commonZh:common)[key?.replace('common.','')]??key??'';}
export function defaults(schema){const values={};for(const section of schema.sections||[]){if(section.toggleKey)values[section.toggleKey]=section.defaultEnabled!==false;for(const field of section.fields||[])if(field.key&&field.defaultValue!==undefined)values[field.key]=clone(field.defaultValue);}return values;}
export function condition(rule,values,state){if(!rule)return true;if(Array.isArray(rule))return rule.every(r=>condition(r,values,state));const value=rule.stateKey?state[rule.stateKey]:values[rule.key];if(Object.hasOwn(rule,'equals'))return value===rule.equals;if(Object.hasOwn(rule,'notEquals'))return value!==rule.notEquals;return !!value;}
export function normalizeField(field,value){
 if(['switch','checkbox'].includes(field.type))return !!value;
 if(['number','range'].includes(field.type)){if(value===''||!Number.isFinite(Number(value)))return undefined;const n=Math.max(field.min??-Infinity,Math.min(field.max??Infinity,Number(value))),step=field.step||1,base=field.min||0;return Number(Math.max(field.min??-Infinity,Math.min(field.max??Infinity,base+Math.round((n-base)/step)*step)).toFixed(6));}
 if(['select','tabs'].includes(field.type))return field.options.some(o=>o.value===value&&!o.disabled)?value:undefined;
 if(field.type==='color')return /^#[0-9a-f]{6}$/i.test(value)?value.toUpperCase():undefined;
 if(field.type==='cubicBezier'){const v=Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(value?.[k])]));if(Object.values(v).some(n=>!Number.isFinite(n)))return undefined;for(const k of ['x1','x2'])v[k]=Math.max(0,Math.min(1,v[k]));for(const k of ['y1','y2'])v[k]=Math.max(-4,Math.min(4,v[k]));return v;}
 return String(value??'');
}
export const CONTEXTS=[['text','3 text layers'],['shapes','6 shape layers'],['component','Existing component'],['empty','No selection'],['noComp','No composition']];
export class RegistrySession{
 constructor(id,saved){this.id=id;this.schema=REGISTRY_SCHEMAS[id];if(!this.schema)throw new Error('Unknown registry tool');this.values=defaults(this.schema);this.context=id==='shape'?'shapes':'text';this.generated=null;this.refreshCount=1;this.items=[];this.lastResult=null;if(saved){this.context=CONTEXTS.some(([k])=>k===saved.context)?saved.context:this.context;this.generated=saved.generated||null;this.refreshCount=saved.refreshCount||1;this.items=clone(saved.items||[]);this.lastResult=clone(saved.lastResult||null);for(const field of registryFields(this.schema)){if(saved.values?.[field.key]===undefined)continue;const v=normalizeField(field,saved.values[field.key]);if(v!==undefined)this.values[field.key]=v;}for(const s of this.schema.sections||[])if(s.toggleKey&&typeof saved.values?.[s.toggleKey]==='boolean')this.values[s.toggleKey]=saved.values[s.toggleKey];}}
 get state(){const hasComp=this.context!=='noComp',hasComponent=hasComp&&(!!this.generated||this.context==='component'),count=!hasComp||this.context==='empty'?0:this.context==='shapes'?6:3,textCount=this.context==='text'||hasComponent?count:0;return {hasComp,activeComp:hasComp?'Opening titles':'—',compName:hasComp?'Opening titles':'—',selectionCount:count,selectedCount:count,textLayerCount:textCount,twoDLayerCount:count,selectedControllerType:hasComponent?(this.generated||'featureStack'):'—',canCreateFeatureStack:hasComp&&textCount>0,canCreateIconGrid:hasComp&&count>0,canRefresh:hasComponent,canSelectLayers:hasComponent,canRemoveGeneratedComponent:hasComponent,canAdd:hasComp&&(this.context==='shapes'||hasComponent),targetLabel:hasComp&&(this.context==='shapes'||hasComponent)?'Shape layer / Contents':'—',source:hasComp&&count?'Selection':'—',refreshCount:this.refreshCount};}
 field(key){return registryFields(this.schema).find(f=>f.key===key);}
 section(field){return (this.schema.sections||[]).find(s=>s.fields.includes(field));}
 visible(field){return condition(field.visibleWhen,this.values,this.state);}
 enabled(field){const section=this.section(field);return !field.disabled&&!(section?.toggleKey&&!this.values[section.toggleKey])&&condition(field.enabledWhen,this.values,this.state);}
 set(key,value){const field=this.field(key);if(!field||!this.visible(field)||!this.enabled(field)||field.readonly)return false;const next=normalizeField(field,value);if(next===undefined)return false;this.values[key]=next;return true;}
 setContext(context){if(CONTEXTS.some(([k])=>k===context)){this.context=context;this.generated=null;this.items=[];this.lastResult=null;}}
 action(key){return this.field(key)||this.schema.actions.find(a=>a.id===key);}
 payload(action){return {...clone(this.values),...clone(action.actionPayload||{})};}
 run(key){const field=this.action(key);if(!field||!this.visible(field)||!this.enabled(field))return null;
  if(field.clientAction==='resetFields'){const original=defaults(this.schema);for(const k of field.resetKeys||[])this.values[k]=clone(original[k]);return this.lastResult={ok:true,preview:true,action:'resetFields'};}
  const action=this.schema.actions.find(a=>a.id===(field.actionId||field.id));if(!action)return null;
  const payload=this.payload(field),ok=!payload.forceError;
  if(ok){if(action.id==='createFeatureStack'||action.id==='createIconGrid')this.generated=action.id==='createFeatureStack'?'featureStack':'iconGrid';if(action.id==='removeSelectedGeneratedComponent'){this.generated=null;if(this.context==='component')this.context='text';}if(action.id==='addItem')this.items.push({key:payload.key,matchName:payload.matchName});if(action.id==='createStrokeFillLayer'){this.context='shapes';this.items=[{key:'strokeFill',matchName:'Stroke + Fill Layer'}];}if(field.refreshStateAfterRun??action.refreshStateAfterRun)this.refreshCount++;if(action.id==='refresh')this.refreshCount++;}
  return this.lastResult={ok,preview:true,action:action.id,payload,hostFunction:action.hostFunction};
 }
 snapshot(){return clone({values:this.values,context:this.context,generated:this.generated,refreshCount:this.refreshCount,items:this.items,lastResult:this.lastResult});}
}
