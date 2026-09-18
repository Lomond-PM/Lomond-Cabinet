// Stable, view-scoped identities survive conditional fields and language changes.
export function captureRegistryFocus(root){
 const active=document.activeElement,el=active?.hasAttribute('data-reference-select')?active.closest('.custom-select').previousElementSibling:active;if(!el||!root.contains(el))return null;
 const attrs=[...el.attributes].filter(a=>a.name.startsWith('data-reg-')||['data-axis','data-point','data-handle-kind','data-value','data-tool-use','type'].includes(a.name)).map(a=>[a.name,a.value]);
 return {tag:el.tagName,attrs,id:el.id,section:el.closest('[data-reg-section]')?.dataset.regSection,selection:el.tagName==='TEXTAREA'||['text','search'].includes(el.type)?[el.selectionStart,el.selectionEnd]:null};
}
export function restoreRegistryFocus(root,saved){
 if(!saved)return;
 const usable=el=>el&&!el.disabled&&!el.closest('[hidden]');
 let target=[...root.querySelectorAll(saved.tag)].find(el=>saved.attrs.length?saved.attrs.every(([key,value])=>el.getAttribute(key)===value):saved.id&&el.id===saved.id);
 if(target?.disabled)target=root.querySelector('[data-reg-status]');
 if(!usable(target))target=[...root.querySelectorAll('[data-reg-collapse]')].find(el=>el.dataset.regCollapse===saved.section);
 if(!usable(target))target=root.querySelector('[data-reg-status]');
 (target?._coreSelectComponent?.trigger||target)?.focus({preventScroll:true});
 if(saved.selection&&target?.setSelectionRange&&['text','search','textarea'].includes(target.type))target.setSelectionRange(...saved.selection);
}
