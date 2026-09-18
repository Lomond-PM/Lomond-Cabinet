// Retain control identity within one library view, never across comparison panels.
const identity=['data-pal-field','data-cv-field','data-pal-action','data-cv-action','data-group-name','data-cv-group','data-stop','data-cv-handle','data-cv-node','data-id'];
export function captureFocus(root){
 const active=document.activeElement,el=active?.hasAttribute('data-reference-select')?active.closest('.custom-select').previousElementSibling:active;if(!el||!root.contains(el))return null;
 return {attrs:identity.filter(k=>el.hasAttribute(k)).map(k=>[k,el.getAttribute(k)]),palette:el.closest('[data-palette]')?.dataset.palette,tag:el.tagName,selection:['search','text'].includes(el.type)?[el.selectionStart,el.selectionEnd]:null};
}
export function restoreFocus(root,saved,fallback){
 if(!saved)return;let scope=root;
 if(saved.palette)scope=[...root.querySelectorAll('[data-palette]')].find(el=>el.dataset.palette===saved.palette)||root;
 let target=saved.attrs.length?[...scope.querySelectorAll(saved.tag)].find(el=>saved.attrs.every(([k,v])=>el.getAttribute(k)===v)):null;
 if(target?.disabled||target?.closest('[hidden]'))target=null;
 target=target||root.querySelector(fallback);
 (target?._coreSelectComponent?.trigger||target)?.focus({preventScroll:true});
 if(saved.selection&&target?.setSelectionRange)target.setSelectionRange(...saved.selection);
}
