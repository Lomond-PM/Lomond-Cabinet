// Chromium 99 returns getBoundingClientRect in pre-zoom coordinates; current
// Chromium returns viewport coordinates. The reference root has one explicit
// width/zoom owner and fills the viewport. Calibrate against that invariant,
// never against an animated child, SVG bbox or UA string.
export function viewportRect(element){
 const rect=element.getBoundingClientRect(),root=document.querySelector('#reference-root');
 const factor=root?.contains(element)?innerWidth/root.getBoundingClientRect().width:1;
 const result={};for(const key of ['x','y','left','top','right','bottom','width','height'])result[key]=rect[key]*(factor||1);return result;
}
export function viewportScale(element){return viewportRect(element).width/(element.offsetWidth||element.clientWidth||1);}
