import {viewportRect} from './geometry.js';
import {bilingual} from './shared.js';
// One user-triggered, bounded in-memory sample. No output/progress DOM writes
// during capture, no polling afterward, no store/network/parent inspection.
export class SizeProbe {
 constructor(root){this.root=root;this.frame=null;this.epoch=0;}
 start(){if(this.frame!==null)return;this.result=null;const rows=[],start=performance.now(),epoch=++this.epoch;
  const box=el=>{
   if(!el)return null;const r=el.getBoundingClientRect(),v=viewportRect(el),s=getComputedStyle(el),b=[s.borderLeftWidth,s.borderRightWidth,s.borderTopWidth,s.borderBottomWidth].map(x=>parseFloat(x)||0);
   const gutter=[el.offsetWidth-el.clientWidth-b[0]-b[1],el.offsetHeight-el.clientHeight-b[2]-b[3]],scale=[v.width/(el.offsetWidth||1),v.height/(el.offsetHeight||1)];
   return {tag:el.tagName,id:el.id,class:el.className?.baseVal??el.className,client:[el.clientWidth,el.clientHeight],offset:[el.offsetWidth,el.offsetHeight],scroll:[el.scrollWidth,el.scrollHeight],scrollPosition:[el.scrollLeft,el.scrollTop],border:b,rect:[r.x,r.y,r.width,r.height],viewportRect:v,scrollbarLayout:gutter,scrollbarViewport:gutter.map((n,i)=>n*scale[i]),width:s.width,zoom:s.zoom,transform:s.transform,overflow:[s.overflowX,s.overflowY],opacity:s.opacity,backdropFilter:s.backdropFilter||s.webkitBackdropFilter,mask:s.maskImage||s.webkitMaskImage,viewBox:el.getAttribute('viewBox'),writes:el.dataset.sizeWrites||null,canvas:el.tagName==='CANVAS'?[el.width,el.height]:null};
  };
  const details=this.root.querySelector('[data-size-evidence]');if(details)details.hidden=true;
  this.root.querySelector('[data-size-probe]').disabled=true;
  const sample=now=>{
   if(epoch!==this.epoch)return;const panel=this.root.querySelector('.color-picker-panel');
   rows.push({ms:Math.round(now-start),viewport:[innerWidth,innerHeight],documentClient:[document.documentElement.clientWidth,document.documentElement.clientHeight],calibration:innerWidth/this.root.getBoundingClientRect().width,instances:document.querySelectorAll('.color-picker-layer').length,document:box(document.documentElement),body:box(document.body),root:box(this.root),header:box(this.root.querySelector('.ref-header')),page:box(this.root.querySelector('.ref-page')),scrollOwners:[...this.root.querySelectorAll('.pal-detail,.pal-catalog,.reg-body,.reg-form,.cv-detail,.cp-body')].map(box),graph:box(this.root.querySelector('.reg-curve-graph')),viewportBox:box(this.root.querySelector('.reg-graph-viewport')),layer:box(this.root.querySelector('.color-picker-layer')),panel:box(panel),pickerBody:box(this.root.querySelector('.cp-body')),plane:box(this.root.querySelector('.cp-plane')),canvas:box(this.root.querySelector('.cp-plane canvas')),halo:[...this.root.querySelectorAll('.cp-halo,.cp-halo>span')].map(box),ancestors:[...function*(e){while(e){yield box(e);e=e.parentElement;}}(panel?.parentElement)]});
   if(rows.length<180&&now-start<4000){this.frame=requestAnimationFrame(sample);return;}
   this.frame=null;this.result={version:'0.3.13-b-f2',ua:navigator.userAgent,dpr:devicePixelRatio,rows};
   if(details?.isConnected){details.querySelector('textarea').value=JSON.stringify(this.result);details.querySelector('summary').textContent=bilingual('Size evidence ready · select text to copy','尺寸采样完成 · 选中文本复制');details.hidden=false;}
   const button=this.root.querySelector('[data-size-probe]');if(button)button.disabled=false;
  };
  this.frame=requestAnimationFrame(sample);
 }
 dispose(){this.epoch++;if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;}
}
