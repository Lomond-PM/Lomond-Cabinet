import {viewportRect,viewportScale} from './geometry.js';
import {DATA} from './production-data.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {locale,copy} from './copy.js';
export {locale};
export function t(key,values={}){let text=DATA.dictionaries[locale.value]?.[key]??DATA.dictionaries.en[key]??key;return text.replace(/\{(\w+)\}/g,(_,k)=>values[k]??'{'+k+'}');}
export const bilingual=(en,zh)=>copy(en);
// One modal owner per reference instance. Negotiation completes before disposal.
export class OverlayOwner {
 constructor(root){this.root=root;this.current=null;}
 ask(message,choices){
  if(this.current)return Promise.resolve('stay');
  const focus=document.activeElement,layer=document.createElement('div');layer.className='ref-modal';
  layer.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">${esc(t('reference.confirm'))}</h2><p>${esc(message)}</p><div>${choices.map(([id,label])=>`<button data-answer="${id}">${esc(label)}</button>`).join('')}</div></section>`;
  this.root.append(layer);const abort=new AbortController();
  return new Promise(resolve=>{
   const done=id=>{abort.abort();layer.remove();this.current=null;if(focus?.isConnected)focus.focus({preventScroll:true});resolve(id);};this.current={done,layer};
   layer.addEventListener('click',e=>{const answer=e.target.closest('[data-answer]');if(answer)done(answer.dataset.answer);},{signal:abort.signal});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();done('stay');}if(e.key==='Tab'){const items=[...layer.querySelectorAll('button')],index=items.indexOf(document.activeElement);e.preventDefault();items[(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}},{signal:abort.signal,capture:true});
   layer.querySelector('button').focus();
  });
 }
 dispose(){this.current?.done('stay');}
}
export function preserveReading(root,change){
 const pinned=root.scrollHeight-root.scrollTop-root.clientHeight<12;
 const anchor=[...root.children].find(el=>viewportRect(el).bottom>viewportRect(root).top);
 const top=anchor?viewportRect(anchor).top:null;change();
 if(pinned)root.scrollTop=root.scrollHeight;else if(anchor?.isConnected)root.scrollTop+=(viewportRect(anchor).top-top)/viewportScale(root);
}
