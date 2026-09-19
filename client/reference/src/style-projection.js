import '../../js/ui/semanticStyleResolver.js';
import '../../js/ui/semanticStyleProjection.js';

// Compatibility inputs/names only. Resolution and the final writer are shared
// with production; this module has no access to the parent or persistent Store.
const Resolver=window.SemanticStyleResolver,Projection=window.SemanticStyleProjection;
const roots=new WeakMap();
function defaultsFor(root){
 const color=getComputedStyle(root).getPropertyValue('--reference-border-default').trim();
 return Object.fromEntries(Object.keys(Resolver.definitions).map(id=>[id,{color,alpha:1}]));
}
export function projectShellBorders(){
 const root=document.documentElement,defaults=defaultsFor(root);
 let projection=roots.get(root);
 if(!projection){projection=Projection.forRoot(root.style,{defaults,defaultSource:'accepted-v26-theme',targets:{'border.panel':'--border'}});roots.set(root,projection);}
 projection.update({defaults});
 const preview=document.querySelector('.ref-settings-preview');
 if(preview&&roots.has(preview))roots.get(preview).update({defaults});
}
export function projectSettingsBorders(root,calibration,preview){
 let projection=roots.get(root);
 if(!projection){projection=Projection.forRoot(root.style,{defaults:defaultsFor(root),defaultSource:'accepted-v26-theme'});roots.set(root,projection);}
 projection.update({defaults:defaultsFor(root),calibration,calibrationPreview:preview});
}
export const ownsBorder=id=>Resolver.owns(id);
window.ReferenceStyleProvenance=()=>({
 shell:Projection.forRoot(document.documentElement.style).getState(),
 settings:(()=>{const node=document.querySelector('.ref-settings-preview');return node?Projection.forRoot(node.style).getState():null;})()
});
