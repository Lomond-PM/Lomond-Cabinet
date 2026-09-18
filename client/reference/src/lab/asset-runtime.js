import {copy} from '../copy.js';
import {accentTokens} from './theme-colors.js';
import {clone,clamp,rgbToHex,paintURL,shapePaint} from './palette-model.js';
import {evaluateCurve,curveSlope,sampleCurve,motionSamples,curveToAE} from './curve-model.js';
import {paletteStore} from './palette-store.js';
import {curveStore,assetSettingsStore} from './curve-store.js';
let started=false,ready;const unsubscribers=[];const listeners=new Set();
export function getCurve(id){const curve=curveStore().data?.curves.find(c=>c.id===id);return curve?clone(curve):null;}
export function getPaint(ref){const paint=paletteStore().data?.palettes.find(p=>p.id===ref?.paletteId)?.slots.find(s=>s.id===ref.slotId)?.paint;return paint?clone(paint):null;}
export function paintCSS(paint){return paint.kind==='solid'?`rgba(${paint.rgb.map(v=>Math.round(v*255)).join(',')},${paint.opacity})`:`url("${paintURL(paint,320,320)}") center / cover`;}
export function activeMotion(){if(!started)return null;const data=assetSettingsStore().data,curve=data?.motion.curveId?getCurve(data.motion.curveId):null;return curve?{curve,duration:data.motion.durationMs}:null;}
export function assetSummary(){const data=assetSettingsStore().data,c=data?.motion.curveId?getCurve(data.motion.curveId):null;return {motion:c?.name||copy("Default spring"),duration:data?.motion.durationMs||400,status:assetSettingsStore().status,error:assetSettingsStore().error};}
export function observeAssets(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function refreshAssetUI(){if(!started)return;refreshAssets();}
function refreshAssets(){listeners.forEach(fn=>fn());}
export function appearanceSelection(){const data=assetSettingsStore().data;return {accent:getPaint(data.appearance.accent),fill:getPaint(data.appearance.toolFill)};}
export function initAssets(){if(started)return ready;started=true;const stores=[paletteStore(),curveStore(),assetSettingsStore()];stores.forEach(store=>unsubscribers.push(store.subscribe(refreshAssets)));ready=Promise.all(stores.map(s=>s.ready)).then(refreshAssets);return ready;}
export function disposeAssets(){unsubscribers.splice(0).forEach(fn=>fn());listeners.clear();started=false;}
export function useCurve(id,durationMs){const store=assetSettingsStore();if(!store.data)throw new Error('UI settings are still loading.');if(id&&!getCurve(id))throw new Error('Choose an existing curve.');store.change(d=>{d.motion={curveId:id,durationMs:clamp(durationMs||400,80,3000)};});}
export function usePaint(ref,role){const store=assetSettingsStore();if(!store.data)throw new Error('UI settings are still loading.');if(!['accent','toolFill'].includes(role))throw new Error('Unknown appearance role.');const paint=getPaint(ref);if(!paint)throw new Error('Choose an existing color slot.');if(role==='accent'&&paint.kind!=='solid')throw new Error('Accent colors use a solid slot.');store.change(d=>d.appearance[role]=clone(ref));}
export function resetPaint(){if(!assetSettingsStore().data)throw new Error('UI settings are still loading.');assetSettingsStore().change(d=>d.appearance={accent:null,toolFill:null});}
// Timed preset tracks preserve position on retargeting. A decaying correction
// also carries incoming velocity for interruptions; fresh entries use the curve exactly.
export function motionTrack(spec,from,to,velocity={},continuous=false){if(!spec)return null;return {spec:clone(spec),from:{...from},to:{...to},velocity:{...velocity},continuous,elapsed:0};}
export function stepMotion(track,dt){track.elapsed+=Math.max(0,dt);const duration=track.spec.duration/1000,u=clamp(track.elapsed/duration),e=evaluateCurve(track.spec.curve,u),slope=curveSlope(track.spec.curve,u),initial=curveSlope(track.spec.curve,0),frame={},velocity={};for(const key of Object.keys(track.to)){const delta=track.to[key]-track.from[key],correction=track.continuous?(track.velocity[key]||0)*duration-delta*initial:0;frame[key]=u===1?track.to[key]:track.from[key]+delta*e+correction*u*(1-u)**2;velocity[key]=u===1?0:(delta*slope+correction*(1-u)*(1-3*u))/duration;}return {frame,velocity,done:u===1};}
