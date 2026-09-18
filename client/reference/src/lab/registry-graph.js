import {copy} from '../copy.js';
import {curveGeometry,speedHandle} from './registry-curve.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tick=n=>!Number.isFinite(n)?(n>0?'∞':'−∞'):Math.abs(n)>=1000?n.toExponential(0):Number(n.toPrecision(3)).toString();
const coordinate=n=>String(Number(n.toFixed(4)));
const node=(key,tag,attrs={},children=[],text=null)=>({key,tag,attrs,children,text});
const text=(key,x,y,value,attrs={})=>node(key,'text',{x,y,...attrs},[],value);
const path=(key,cls,d,attrs={})=>node(key,'path',{class:cls,d,...attrs});
const caches=new WeakMap();

// A stable SVG tree: only numeric attributes, visibility and accessible names change.
export function curveDrawing(c,{key,title,mode,overlay,editable,size,ranges}){
 const p=curveGeometry(c,'progress',size,ranges?.progress);
 // A value-only editor never samples the hidden speed curve.
 const v=mode==='speed'||overlay?curveGeometry(c,'speed',size,ranges?.speed):null,g=mode==='speed'?v:p;
 const valueVisible=mode==='progress'||overlay,speedVisible=!!v;
 const focusAttrs=(point,kind,label,active)=>({tabindex:editable&&active?'0':null,role:editable&&active?'button':null,'data-reg-handle':editable&&active?key:null,'data-point':point,'data-handle-kind':kind,'aria-label':editable&&active?label:null});
 const handle=(id,point,x,y,kind,label,active)=>node(id,'g',{class:'reg-handle-group',...focusAttrs(point,kind,label+copy('; arrow keys adjust, Shift for larger steps'),active)},[
  node(id+'-title','title',{},[],label),node(id+'-hit','circle',{class:'reg-handle-hit',cx:x,cy:y,r:9}),node(id+'-dot','circle',{class:'reg-handle',cx:x,cy:y,r:3})
 ]);
 const nodes=[
  path('grid','reg-graph-grid',`M${g.left} ${g.top}V${g.bottom}H${g.right} M${g.left} ${g.y(0)}H${g.right} M${g.left} ${g.y(1)}H${g.right}`),
  node('value-axis','g',{class:'reg-value-axis',hidden:!valueVisible},[text('value-one',g.left-8,p.y(1)+4,'1',{'text-anchor':'end'}),text('value-zero',g.left-8,p.y(0)+4,'0',{'text-anchor':'end'})]),
  node('speed-axis','g',{class:'reg-speed-axis',hidden:!speedVisible},[
   text('speed-high',g.right+8,v?v.y(v.hi)+4:0,v?tick(v.hi):''),text('speed-zero',g.right+8,v?v.y(0)+4:0,'0'),text('speed-low',g.right+8,v?v.y(v.lo)+4:0,v?tick(v.lo):'',{hidden:!v||v.lo>=0})
  ]),text('time-zero',g.left,g.height-7,'0',{class:'reg-time-label'}),text('time-one',g.right,g.height-7,'1',{class:'reg-time-label','text-anchor':'end'}),
  path('value-line','reg-graph-line',p.path,{'data-reg-series':'progress',hidden:!valueVisible}),
  path('speed-line','reg-graph-line',v?.path||'',{'data-reg-series':'speed',hidden:!speedVisible}),
  node('value-handles','g',{hidden:mode!=='progress'},[
   path('value-tangent','reg-graph-handle',`M${p.x(0)},${p.y(0)} L${p.x(c.x1)},${p.y(c.y1)} M${p.x(1)},${p.y(1)} L${p.x(c.x2)},${p.y(c.y2)}`),
   ...[1,2].map(n=>handle('value-'+n,n,p.x(c['x'+n]),p.y(c['y'+n]),'value',copy('Control point {index}: X {x}, Y {y}',{index:n,x:coordinate(c['x'+n]),y:coordinate(c['y'+n])}),mode==='progress'))
  ]),
  node('speed-handles','g',{hidden:mode!=='speed'},[1,2].flatMap(n=>{
   const h=v?speedHandle(c,n,v):{x:0,y:0,anchorX:0,anchorY:0,speed:0,influence:0},direction=copy(n===1?'Outgoing':'Incoming');
   return [path('speed-tangent-'+n,'reg-graph-handle reg-speed-tangent',`M${h.anchorX},${h.anchorY}H${h.x}`),
    node('speed-keyframe-'+n,'g',{class:'reg-speed-keyframe',...focusAttrs(n,'speed-value',copy('{kind} speed {speed}; up and down arrows adjust speed',{kind:direction,speed:tick(h.speed)}),mode==='speed')},[
     node('speed-keyframe-hit-'+n,'circle',{class:'reg-handle-hit',cx:h.anchorX,cy:h.anchorY,r:7}),path('speed-diamond-'+n,'reg-keyframe',`M${h.anchorX},${h.anchorY-3}l3 3-3 3-3-3Z`)
    ]),handle('speed-'+n,n,h.x,h.y,'speed',copy('{kind}: speed {speed}, influence {influence}%',{kind:direction,speed:tick(h.speed),influence:Math.round(h.influence*10000)/100}),mode==='speed'),
    text('speed-infinity-'+n,h.x,h.y+(h.speed>0?12:-7),tick(h.speed),{hidden:Number.isFinite(h.speed)})];
  }))
 ];
 return {nodes,width:g.width,height:g.height,mode,overlay,label:`${title}; ${copy(mode==='progress'?'value focused':'speed focused')}${overlay?copy(', value and speed overlay'):''}`};
}
function attributes(attrs){return Object.entries(attrs).filter(([,v])=>v!==null&&v!==false).map(([k,v])=>` ${k}="${v===true?'':esc(v)}"`).join('');}
export function curveGraphHTML(drawing){
 const serialize=n=>`<${n.tag} data-graph-node="${n.key}"${attributes(n.attrs)}>${n.text===null?n.children.map(serialize).join(''):esc(n.text)}</${n.tag}>`;
 return drawing.nodes.map(serialize).join('');
}
export function updateCurveGraph(svg,drawing){
 let nodes=caches.get(svg);if(!nodes){nodes=new Map([...svg.querySelectorAll('[data-graph-node]')].map(el=>[el.getAttribute('data-graph-node'),el]));caches.set(svg,nodes);}
 const update=n=>{const el=nodes.get(n.key);for(const [key,value]of Object.entries(n.attrs)){if(value===null||value===false){if(el.hasAttribute(key))el.removeAttribute(key);}else{const next=value===true?'':String(value);if(el.getAttribute(key)!==next)el.setAttribute(key,next);}}if(n.text!==null&&el.textContent!==String(n.text))el.textContent=n.text;n.children.forEach(update);};
 drawing.nodes.forEach(update);
 const active=nodes.get(drawing.mode==='speed'?'speed-line':'value-line'),other=nodes.get(drawing.mode==='speed'?'value-line':'speed-line');
 if(other.nextElementSibling!==active)svg.insertBefore(active,other.nextElementSibling);
 svg.setAttribute('viewBox',`0 0 ${drawing.width} ${drawing.height}`);svg.style.height=drawing.height+'px';svg.setAttribute('aria-label',drawing.label);
}
