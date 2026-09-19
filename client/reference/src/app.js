import {projectShellBorders} from './style-projection.js';
import {REGISTRY_SCHEMAS} from './lab/registry-schema.js';
import {label as schemaLabel} from './lab/registry-model.js';
import {SizeProbe} from './size-probe.js';
import {copy} from './copy.js';
import {mountControls,disposeControls,cancelNumberEdits,closeSelect} from './controls.js';
import {ReferenceRegistry} from './registry.js';
import {SettingsView,settingsStore} from './settings.js';
import {ReferencePalette,ReferenceCurve} from './assets.js';
import {ReferenceVela} from './vela.js';
import {paletteStore} from './lab/palette-store.js';
import {curveStore,assetSettingsStore} from './lab/curve-store.js';
import {initAssets,disposeAssets,observeAssets,appearanceSelection,paintCSS} from './lab/asset-runtime.js';
import {accentTokens} from './lab/theme-colors.js';
import {locale,t,esc,bilingual,OverlayOwner} from './shared.js';
const root=document.querySelector('#reference-root'),snapshots={},abort=new AbortController();
let view=null,route='registry',variant='kit',negotiating=false,exited=false,theme='dark',scale=.92;
const stores=[settingsStore,paletteStore(),curveStore(),assetSettingsStore()];
const overlay=new OverlayOwner(root),sizeProbe=new SizeProbe(root);
function projectAppearance(){const html=document.documentElement;html.dataset.theme=theme;projectShellBorders();for(const property of ['--accent','--accent-fill','--on-accent','--focus-ring','--tool-fill'])html.style.removeProperty(property);const {accent,fill}=appearanceSelection();if(accent?.kind==='solid')for(const [key,value]of Object.entries(accentTokens(accent.rgb,theme)))html.style.setProperty(key,value);if(fill)html.style.setProperty('--tool-fill',paintCSS(fill));}
function resize(){cancelNumberEdits();closeSelect();if(view?.drag){view instanceof ReferenceCurve?view.endDrag(false):view.endDrag(null,true);}view?.endStop?.(false);view?.picker?.endPlane?.(false);root.style.zoom=String(scale);root.style.width=innerWidth/scale+'px';root.style.height=innerHeight/scale+'px';root.dataset.paletteWide=String(innerWidth/scale>=620);root.dataset.curveWide=String(innerWidth/scale>=680);root.dataset.registryWide=String(innerWidth/scale>=800);view?.picker?.schedulePosition();}
function status(text){root.querySelector('[data-reference-status]').textContent=text;}
function updateStatus(){if(exited||!view)return;status(t(view.store?.status==='error'?'reference.failed':route==='vela'?'reference.conversationStatus':view.dirty?'reference.unsavedStatus':'reference.saved'));}
function renderShell(){sizeProbe.dispose();disposeControls(root);document.documentElement.lang=locale.value;root.innerHTML=`<header class="ref-header"><div><strong>${esc(t('reference.title'))}</strong><span>0.3.13-B</span><button data-exit>${esc(t('reference.exit'))}</button></div><p>${esc(t('reference.fixture'))}</p><details class="ref-setup" ${innerHeight>=500?'open':''}><summary>${esc(bilingual('Preview setup','预览设置'))}</summary><div class="ref-options"><label>${copy("Theme")}<select data-theme><option value="dark">${copy("Dark")}</option><option value="light">${copy("Light")}</option></select></label><label>${copy("Language")}<select data-locale><option value="en">English</option><option value="zh-CN">中文</option></select></label><label>${copy("UI Scale")}<select data-scale>${[.62,.92,1,1.18].map(n=>`<option value="${n}" ${n===scale?'selected':''}>${n}</option>`).join('')}</select></label></div><details class="ref-diagnostics"><summary>${copy('Size diagnostics')}</summary><button type="button" data-size-probe>${esc(bilingual('Sample sizes once (4s); then open the picker','一次尺寸采样（4 秒）；点击后打开颜色弹层'))}</button><details data-size-evidence hidden><summary></summary><textarea readonly aria-label="${esc(bilingual('Size sampling evidence','尺寸采样证据'))}"></textarea></details></details></details></header><nav class="ref-nav" aria-label="${copy("Reference pages")}">${[['registry','Registry'],['settings',copy("Global Settings")],['vela','Vela'],['palette',copy("Palette / Curve")]].map(([id,label])=>`<button data-route="${id}">${label}</button>`).join('')}</nav><div class="ref-subnav"></div><section class="ref-page"></section><footer class="ref-save"><div><button data-save>${esc(t('reference.save'))}</button><label><input type="checkbox" data-failure>${esc(t('reference.failSave'))}</label></div><span data-reference-status role="status">${esc(t('reference.saved'))}</span></footer>`;root.querySelector('[data-theme]').value=theme;root.querySelector('[data-locale]').value=locale.value;mountControls(root);resize();}
function mount(){const page=root.querySelector('.ref-page'),sub=root.querySelector('.ref-subnav');page.className='ref-page';
 root.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-current',b.dataset.route===route?'page':'false'));
 sub.innerHTML=route==='registry'?`<button data-variant="kit">${esc(schemaLabel(REGISTRY_SCHEMAS.kit,REGISTRY_SCHEMAS.kit.titleKey,locale.value))}</button><button data-variant="controls">${copy("Registry Controls")}</button><label><input data-action-error type="checkbox">${esc(bilingual('Action failure fixture','动作失败模拟'))}</label>`:route==='palette'?`<button data-variant="palette">${copy("Palette")}</button><button data-variant="curve">${copy("Curve")}</button><small>${esc(bilingual('Lab paint model · Palette v2 adapter pending; session data only','Lab Paint 模型 · Palette v2 适配待完成；仅会话内数据'))}</small>`:route==='settings'?`<button data-reset>${esc(t('reference.reset'))}</button><small>${esc(bilingual('Actual Appearance / Design Tuning definitions · isolated preview','实际 Appearance / Design Tuning 定义 · 隔离预览'))}</small>`:'';
 if(route==='registry'){page.classList.add('registry-root');view=new ReferenceRegistry(page,variant,{saved:snapshots[variant],sessionKey:'reference-'+variant});const run=view.session.run.bind(view.session);view.session.run=key=>{if(root.querySelector('[data-action-error]')?.checked)return view.session.lastResult={ok:false,preview:true,action:key,error:'FIXTURE_ACTION_FAILED'};return run(key);};}
 if(route==='settings'){page.classList.add('registry-root');view=new SettingsView(page);}
 if(route==='palette'){page.classList.add(variant==='curve'?'curve-root':'palette-root');view=variant==='curve'?new ReferenceCurve(page,snapshots.curve):new ReferencePalette(page,snapshots.palette);}
 if(route==='vela'){page.classList.add('reference-vela');view=new ReferenceVela(page,snapshots.vela);}
 if(view.ui?.lang!==undefined){view.ui.lang=locale.value;view.render();}
 sub.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===variant)));
 resize();updateStatus();
}
async function negotiate(){
 if(negotiating)return false;cancelNumberEdits();closeSelect();
 // Cancel a pointer transaction before opening a competing overlay.
 if(view instanceof ReferenceRegistry)view.endDrag(null,true);if(view instanceof ReferencePalette)view.endStop(false);if(view instanceof ReferenceCurve)view.endDrag(false);
 if(!view.dirty)return true;negotiating=true;
 const conversation=route==='vela',choices=[['stay',t('reference.stay')],['discard',t('reference.discard')]];if(!conversation&&!view.picker)choices.push(['save',t('reference.save')]);
 const answer=await overlay.ask(t(conversation?'reference.conversation':'reference.unsaved'),choices);negotiating=false;
 if(answer==='stay')return false;if(answer==='discard'){view.discard();return true;}const saved=view.save();status(t(saved?'reference.saved':'reference.failed'));return saved;
}
function disposeView(){if(view?.snapshot)snapshots[route==='vela'?'vela':variant]=view.snapshot();view?.destroy();view=null;}
async function navigate(next,nextVariant){if(!await negotiate())return;disposeView();route=next;variant=nextVariant||(next==='registry'?'kit':'palette');mount();}
async function exit(){if(exited||!await negotiate())return;disposeView();sizeProbe.dispose();disposeControls(root);overlay.dispose();unobserve();disposeAssets();stores.forEach(s=>s.dispose());abort.abort();exited=true;root.innerHTML=`<div class="ref-exited"><h1>${esc(bilingual('Reference closed','参考页已关闭'))}</h1><p>${esc(bilingual('Session fixtures disposed. Close this standalone window or return to Settings.','会话模拟实例已释放。请关闭独立窗口或返回设置页。'))}</p></div>`;if(parent!==window)parent.postMessage({type:'lomond-reference-exit'},'*');}
renderShell();mount();projectAppearance();initAssets();const unobserve=observeAssets(projectAppearance);
stores.forEach(s=>s.subscribe(updateStatus));
for(const type of ['input','focusout','pointerup','pointercancel'])root.addEventListener(type,updateStatus,{signal:abort.signal});
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.route&&b.dataset.route!==route)navigate(b.dataset.route);if(b.dataset.variant&&b.dataset.variant!==variant)navigate(route,b.dataset.variant);if(b.hasAttribute('data-vela-appearance')){root.querySelector('.ref-setup').open=true;root.querySelector('[data-theme]').parentElement.querySelector('.select-trigger').focus();}if(b.hasAttribute('data-size-probe'))sizeProbe.start();if(b.hasAttribute('data-exit'))exit();if(b.hasAttribute('data-save')){if(view.picker||view.drag||view.stopDrag){status(bilingual('Apply or cancel the active edit first.','请先应用或取消当前编辑。'));return;}status(t(view.save()?'reference.saved':'reference.failed'));}if(b.hasAttribute('data-reset'))view.reset();},{signal:abort.signal});
root.addEventListener('change',async e=>{const el=e.target;if(el.hasAttribute('data-theme')){theme=el.value;projectAppearance();}if(el.hasAttribute('data-scale')){scale=Number(el.value);resize();}if(el.hasAttribute('data-failure'))stores.forEach(s=>s.failSave=el.checked);if(el.hasAttribute('data-locale')){const next=el.value;if(await negotiate()){disposeView();locale.value=next;renderShell();mount();}else el.value=locale.value;}},{signal:abort.signal});
window.addEventListener('resize',resize,{signal:abort.signal});window.addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='lomond-reference-request-exit')exit();},{signal:abort.signal});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!overlay.current){if(closeSelect()){e.preventDefault();return;}if(view?.picker){view.closePicker();e.preventDefault();}else if(view?.drag||view?.stopDrag){view instanceof ReferencePalette?view.endStop(false):view instanceof ReferenceCurve?view.endDrag(false):view.endDrag(null,true);e.preventDefault();}else{e.preventDefault();exit();}}},{signal:abort.signal});
// Read-only probe over fixture state; no commands or production bindings.
Object.defineProperty(window,'ReferenceState',{value:()=>({route,variant,exited,dirty:view?.dirty||false,gesture:!!(view?.drag||view?.stopDrag),values:view?.session?.snapshot(),palette:JSON.parse(JSON.stringify(paletteStore().data)),curve:JSON.parse(JSON.stringify(curveStore().data)),subscriptions:stores.map(s=>s.listeners.size)})});
if(parent!==window)parent.postMessage({type:'lomond-reference-ready'},'*');
