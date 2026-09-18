// Geometry is in CSS pixels. Only curve coordinates change with the viewport;
// text, keyframe diamonds, handles and their hit areas are never stretched.
export const CURVE_HEIGHT={min:120,default:160,max:480};
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const cubic=(a,b,t)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;
const derivative=(a,b,t)=>3*(1-t)**2*a+6*(1-t)*t*(b-a)+3*t*t*(1-b);
export function endpointSpeed(c,point){
 const dx=point===1?c.x1:1-c.x2,dy=point===1?c.y1:1-c.y2;
 if(dx>1e-10)return dy/dx;
 if(Math.abs(dy)>1e-10)return Math.sign(dy)*Infinity;
 // Coincident endpoint and control point: use the first nonzero Taylor term.
 const nextX=point===1?c.x2:1-c.x1,nextY=point===1?c.y2:1-c.y1;
 return nextX>1e-10?nextY/nextX:Math.abs(nextY)>1e-10?Math.sign(nextY)*Infinity:1;
}
export function curveGeometry(c,mode='progress',size={},range){
 const width=Math.max(160,size.width||300),height=clamp(size.height||CURVE_HEIGHT.default,CURVE_HEIGHT.min,CURVE_HEIGHT.max);
 const left=32,right=width-42,top=16,bottom=height-24,plotWidth=right-left;
 const samples=mode==='speed'?Array.from({length:161},(_,i)=>{const t=(i+.001)/160.002;return {x:cubic(c.x1,c.x2,t),v:derivative(c.y1,c.y2,t)/Math.max(.0000001,derivative(c.x1,c.x2,t))};}):[];
 const endpoints=[endpointSpeed(c,1),endpointSpeed(c,2)].filter(Number.isFinite);
 const lo=mode==='speed'?Math.min(0,...samples.map(p=>p.v),...endpoints):Math.min(0,c.y1,c.y2),hi=mode==='speed'?Math.max(1,...samples.map(p=>p.v),...endpoints):Math.max(1,c.y1,c.y2);
 const pad=(hi-lo)*.1,min=range?.min??lo-pad,max=range?.max??hi+pad;
 const x=t=>left+t*plotWidth,y=v=>bottom-(v-min)/(max-min)*(bottom-top);
 const path=mode==='speed'?samples.map((p,i)=>`${i?'L':'M'}${x(p.x).toFixed(3)},${y(p.v).toFixed(3)}`).join(' '):`M${x(0)},${y(0)} C${x(c.x1)},${y(c.y1)} ${x(c.x2)},${y(c.y2)} ${x(1)},${y(1)}`;
 return {min,max,lo,hi,x,y,path,width,height,left,right,top,bottom,plotWidth,unX:px=>(px-left)/plotWidth,unY:py=>min+(bottom-py)/(bottom-top)*(max-min)};
}
// View-only projection. 100% temporal influence occupies <=49% of the plot.
// Pixel clearance keeps both visual dots and their hit areas separate on narrow panels.
export function influenceTrack(g){return {start:9,end:Math.max(10,Math.min(g.plotWidth*.49,g.plotWidth/2-11))};}
export function speedHandle(c,point,g){
 const influence=point===1?c.x1:1-c.x2,speed=endpointSpeed(c,point),track=influenceTrack(g),distance=track.start+(track.end-track.start)*influence;
 const displaySpeed=Number.isFinite(speed)?speed:speed>0?g.max:g.min;
 return {influence,speed,x:g.x(point===1?0:1)+(point===1?distance:-distance),y:g.y(displaySpeed),anchorX:g.x(point===1?0:1),anchorY:g.y(displaySpeed)};
}
export function influenceAt(px,point,g){const track=influenceTrack(g),distance=point===1?px-g.left:g.right-px;return clamp((distance-track.start)/(track.end-track.start),0,1);}
export function fromSpeed(c,point,influence,speed){
 // A finite velocity requires a nonzero temporal tangent. Opening/changing view
 // never normalizes stored zero-length or infinite-slope handles; only an edit does.
 const d=clamp(influence,.0001,1),s=Number.isFinite(speed)?speed:0,next={...c};
 if(point===1){next.x1=d;next.y1=clamp(s*d,-4,4);}else{next.x2=1-d;next.y2=clamp(1-s*d,-4,4);}
 return next;
}
