import {clamp,clone,uid} from './palette-model.js';
import {COMPACT_BASE,COMPACT_RESPONSE} from './curve-presets.js';
export const CURVE_SCHEMA=1;
export const curveNode=(t,v,interpolation='bezier')=>({id:uid(),t,v,in:null,out:null,interpolation});
export function bezierCurve(name,x1=.25,y1=.1,x2=.25,y2=1,groupId='basic'){
 const a=curveNode(0,0),b=curveNode(1,1);a.out=[x1,y1];b.in=[x2,y2];return {id:uid(),name,groupId,tags:[],durationMs:600,nodes:[a,b]};
}
const cvCubic=(a,b,c,d,u)=>{const q=1-u;return q*q*q*a+3*q*q*u*b+3*q*u*u*c+u*u*u*d;};
export function curveSegment(a,b){return [[a.t,a.v],a.out||[a.t+(b.t-a.t)/3,a.v+(b.v-a.v)/3],b.in||[b.t-(b.t-a.t)/3,b.v-(b.v-a.v)/3],[b.t,b.v]];}
export function curveParameter(points,t){let lo=0,hi=1;for(let i=0;i<36;i++){const u=(lo+hi)/2;if(cvCubic(...points.map(p=>p[0]),u)<t)lo=u;else hi=u;}return (lo+hi)/2;}
export function evaluateCurve(curve,t){const n=curve.nodes;t=clamp(t);if(t<=0)return n[0].v;if(t>=1)return n.at(-1).v;let i=0;while(i<n.length-2&&n[i+1].t<=t)i++;const a=n[i],b=n[i+1];if(a.interpolation==='hold')return a.v;if(a.interpolation==='linear')return a.v+(b.v-a.v)*(t-a.t)/(b.t-a.t);const points=curveSegment(a,b);return cvCubic(...points.map(p=>p[1]),curveParameter(points,t));}
export function curveSlope(curve,t){const e=.00001,a=Math.max(0,t-e),b=Math.min(1,t+e);return (evaluateCurve(curve,b)-evaluateCurve(curve,a))/(b-a);}
export function sampleCurve(curve,count=121){return Array.from({length:count},(_,i)=>({offset:i/(count-1),value:evaluateCurve(curve,i/(count-1))}));}
export function curveBounds(curve){const ys=curve.nodes.flatMap(n=>[n.v,...(n.in?[n.in[1]]:[]),...(n.out?[n.out[1]]:[])]),min=Math.min(0,...ys),max=Math.max(1,...ys),pad=Math.max(.12,(max-min)*.08);return {min:min-pad,max:max+pad};}
export function curvePath(curve,{width=320,height=180,pad=12,bounds=curveBounds(curve)}={}){const point=([x,y])=>`${pad+x*(width-pad*2)},${pad+(bounds.max-y)/(bounds.max-bounds.min)*(height-pad*2)}`;let path=`M${point([curve.nodes[0].t,curve.nodes[0].v])}`;for(let i=0;i<curve.nodes.length-1;i++){const a=curve.nodes[i],b=curve.nodes[i+1],p=curveSegment(a,b);path+=a.interpolation==='hold'?`L${point([b.t,a.v])}L${point([b.t,b.v])}`:a.interpolation==='linear'?`L${point([b.t,b.v])}`:`C${point(p[1])} ${point(p[2])} ${point(p[3])}`;}return path;}
export function validateCurveLibrary(data){const fail=m=>{throw new Error(m);},ids=new Set(),id=v=>{if(typeof v!=='string'||!/^[-_A-Za-z0-9]{1,100}$/.test(v)||ids.has(v))fail('Invalid or duplicate curve identity.');ids.add(v);},name=v=>{if(typeof v!=='string'||!v.trim()||v.length>80)fail('Use a name of 1–80 characters.');},num=(v,a,b)=>{if(!Number.isFinite(v)||v<a||v>b)fail('Curve coordinate is outside its range.');};
 if(!data||data.schemaVersion!==1||!Array.isArray(data.groups)||!Array.isArray(data.curves)||data.groups.length>100||data.curves.length>500)fail('Unsupported curve library.');data.groups.forEach(g=>{id(g.id);name(g.name);});
 data.curves.forEach(c=>{id(c.id);name(c.name);if(c.groupId!==null&&!data.groups.some(g=>g.id===c.groupId))fail('Curve group does not exist.');if(!Array.isArray(c.tags)||c.tags.length>12||c.tags.some(t=>typeof t!=='string'||t.length>40))fail('Invalid curve tags.');num(c.durationMs,80,10000);if(!Array.isArray(c.nodes)||c.nodes.length<2||c.nodes.length>128)fail('Use 2–128 curve points.');c.nodes.forEach((n,i)=>{id(n.id);num(n.t,0,1);num(n.v,-2,3);if(i&&n.t-c.nodes[i-1].t<.00001)fail('Point times must increase.');if(!['bezier','linear','hold'].includes(n.interpolation))fail('Unknown interpolation.');for(const [k,lo,hi]of [['in',c.nodes[i-1]?.t??n.t,n.t],['out',n.t,c.nodes[i+1]?.t??n.t]])if(n[k]!==null){if(!Array.isArray(n[k])||n[k].length!==2)fail('Invalid control handle.');num(n[k][0],lo,hi);num(n[k][1],-4,5);}});if(c.nodes[0].t!==0||c.nodes[0].v!==0||c.nodes.at(-1).t!==1||c.nodes.at(-1).v!==1)fail('Curve endpoints must be (0,0) and (1,1).');});return data;
}
export function duplicateCurve(curve){const c=clone(curve);c.id=uid();c.name=c.name.slice(0,75)+' copy';c.nodes.forEach(n=>n.id=uid());return c;}
export function filterCurves(data,{query='',group='all'}={}){const q=query.toLowerCase().trim();return data.curves.filter(c=>(group==='all'||(group==='none'?c.groupId===null:c.groupId===group))&&(!q||[c.name,...c.tags,data.groups.find(g=>g.id===c.groupId)?.name||''].join(' ').toLowerCase().includes(q)));}
export function splitCurve(curve,index,t){if(curve.nodes.length>=128)throw new Error('A curve supports up to 128 points.');const a=curve.nodes[index],b=curve.nodes[index+1];if(!b)return;t=t??(a.t+b.t)/2;if(t<=a.t+.00001||t>=b.t-.00001)throw new Error('Choose a time inside this segment.');const n=curveNode(t,evaluateCurve(curve,t),a.interpolation);
 if(a.interpolation==='bezier'){const p=curveSegment(a,b),u=curveParameter(p,t),mix=(a,b)=>a.map((v,i)=>v+(b[i]-v)*u),q=[mix(p[0],p[1]),mix(p[1],p[2]),mix(p[2],p[3])],r=[mix(q[0],q[1]),mix(q[1],q[2])],s=mix(r[0],r[1]);a.out=q[0];n.in=r[0];n.out=r[1];n.t=s[0];n.v=s[1];b.in=q[2];}curve.nodes.splice(index+1,0,n);return n;
}
export function removeCurvePoint(curve,index){if(index<=0||index>=curve.nodes.length-1)throw new Error('Keep the first and last points.');curve.nodes.splice(index,1);}
export function moveCurvePoint(curve,index,t,v){const n=curve.nodes[index];if(index===0||index===curve.nodes.length-1)return;const before=curve.nodes[index-1],after=curve.nodes[index+1],nt=clamp(t,before.t+.0001,after.t-.0001),nv=clamp(v,-2,3),dt=nt-n.t,dv=nv-n.v;n.t=nt;n.v=nv;for(const k of ['in','out'])if(n[k]){n[k][0]=clamp(n[k][0]+dt,k==='in'?before.t:nt,k==='in'?nt:after.t);n[k][1]=clamp(n[k][1]+dv,-4,5);}if(before.out)before.out[0]=Math.min(before.out[0],nt);if(after.in)after.in[0]=Math.max(after.in[0],nt);}
export function reverseCurve(curve){if(curve.nodes.slice(0,-1).some(n=>n.interpolation==='hold'))throw new Error('Reverse is available for continuous curves.');curve.nodes=curve.nodes.reverse().map((n,i,list)=>({...n,t:1-n.t,v:1-n.v,in:n.out?[1-n.out[0],1-n.out[1]]:null,out:n.in?[1-n.in[0],1-n.in[1]]:null,interpolation:i<list.length-1?list[i+1].interpolation:'bezier'}));}
// Presets use authored, bounded geometry. Playback sampling never adds editor nodes.
const presetNodes=nodes=>nodes.map(n=>({...clone(n),id:uid()}));
const reflectedNodes=nodes=>{const c={nodes:presetNodes(nodes)};reverseCurve(c);return c.nodes;};
const scaleNodes=(nodes,t0,v0,scale)=>nodes.map(n=>({...n,t:t0+n.t*scale,v:v0+n.v*scale,in:n.in?[t0+n.in[0]*scale,v0+n.in[1]*scale]:null,out:n.out?[t0+n.out[0]*scale,v0+n.out[1]*scale]:null}));
const joinHalves=(first,second)=>{const a=scaleNodes(first,0,0,.5),b=scaleNodes(second,.5,.5,.5);a.at(-1).out=b[0].out;a.at(-1).interpolation=b[0].interpolation;return [...a,...b.slice(1)];};
function bounceOutNodes(){
 const d=2.75,k=7.5625,nodes=[];
 for(const [a,b,center,floor]of [[0,1/d,0,0],[1/d,2/d,1.5/d,.75],[2/d,2.5/d,2.25/d,.9375],[2.5/d,1,2.625/d,.984375]]){
  const span=b-a,value=t=>k*(t-center)**2+floor,slope=t=>2*k*(t-center);
  if(!nodes.length)nodes.push(curveNode(0,0));nodes.at(-1).out=[a+span/3,value(a)+slope(a)*span/3];const n=curveNode(b,1);n.in=[b-span/3,value(b)-slope(b)*span/3];nodes.push(n);
 }
 return nodes;
}
export function seedCurveLibrary(){
 const groups=[['basic','Essentials'],['power','Power'],['smooth','Smooth'],['back','Overshoot'],['bounce','Bounce'],['elastic','Elastic'],['spring','Spring'],['steps','Steps']].map(([id,name])=>({id,name})),curves=[];
 // Keep temporal handles representable by AE without inserting sampled keys.
 const add=(name,x1,y1,x2,y2)=>curves.push(bezierCurve(name,x1,y1,x2,y2));
 add('Linear',1/3,1/3,2/3,2/3);curves[0].nodes[0].interpolation='linear';add('Ease',.25,.1,.25,1);add('Ease In',.42,0,.99899,1-.00101/.58);add('Ease Out',.00101,.00101/.58,.58,1);add('Ease In Out',.42,0,.58,1);add('Easy Ease · zero speed',1/3,0,2/3,1);add('Soft UI',.22,1,.36,1);add('Snappy UI',.16,1,.3,1);add('Emphasized',.2,0,0,1);add('Anticipate & settle',.5,-.35,.4,1.3);
 const insert=(name,nodes,groupId,tags=[])=>curves.push({id:uid(),name,groupId,tags,durationMs:700,nodes});
 for(const [label,group]of [['Quad','power'],['Cubic','power'],['Quart','power'],['Quint','power'],['Sine','smooth'],['Expo','smooth'],['Circ','smooth'],['Back','back']]){
  const inward=presetNodes(COMPACT_BASE[label]),outward=reflectedNodes(inward);
  for(const direction of ['In','Out','In Out'])insert(`${label} ${direction}`,direction==='In'?inward:direction==='Out'?outward:joinHalves(presetNodes(inward),presetNodes(outward)),group,[label.toLowerCase(),direction.toLowerCase()]);
 }
 const bounceOut=bounceOutNodes(),bounceIn=reflectedNodes(bounceOut);insert('Bounce In',bounceIn,'bounce',['bounce','in']);insert('Bounce Out',bounceOut,'bounce',['bounce','out']);insert('Bounce In Out',joinHalves(presetNodes(bounceIn),presetNodes(bounceOut)),'bounce',['bounce','in out']);
 for(const [name,nodes]of Object.entries(COMPACT_RESPONSE))insert(name,presetNodes(nodes),name.endsWith('spring')?'spring':'elastic',[name.toLowerCase(),'compact']);
 for(const count of [1,2,3,4,6,8,12]){const nodes=Array.from({length:count+1},(_,i)=>curveNode(i/count,i/count,'hold'));curves.push({id:uid(),name:count===1?'Hold / Step end':`Steps ${count} · end`,groupId:'steps',tags:['discrete','hold'],durationMs:800,nodes});}
 return validateCurveLibrary({schemaVersion:1,groups,curves});
}
// Duplicate offsets preserve discrete Hold jumps for Web Animations consumers.
export function motionSamples(curve){const samples=[{offset:0,value:0}];for(let i=0;i<curve.nodes.length-1;i++){const a=curve.nodes[i],b=curve.nodes[i+1];if(a.interpolation==='hold'){samples.push({offset:b.t,value:a.v},{offset:b.t,value:b.v});continue;}const count=Math.max(4,Math.ceil((b.t-a.t)*180));for(let j=1;j<=count;j++){const t=a.t+(b.t-a.t)*j/count;samples.push({offset:j===count?b.t:t,value:j===count?b.v:evaluateCurve(curve,t)});}}return samples;}
export function curveToAE(curve,{startTime=0,duration=1,startValue=0,endValue=100}={}){
 if(![startTime,duration,startValue,endValue].every(Number.isFinite)||duration<=0)throw new Error('Use finite values and a positive duration.');
 const delta=endValue-startValue,make=(t,v)=>({time:startTime+t*duration,value:startValue+v*delta,inInterpolation:'LINEAR',outInterpolation:'LINEAR',inEase:null,outEase:null}),keys=[make(0,0)],sampledSegments=[];
 for(let i=0;i<curve.nodes.length-1;i++){
  const a=curve.nodes[i],b=curve.nodes[i+1],left=keys.at(-1),right=make(b.t,b.v),p=curveSegment(a,b),span=b.t-a.t,outDx=p[1][0]-a.t,inDx=b.t-p[2][0];
  if(a.interpolation==='hold')left.outInterpolation='HOLD';
  else if(a.interpolation==='bezier'){
   if(outDx/span<.001||inDx/span<.001){
    sampledSegments.push(i);const count=Math.max(8,Math.ceil(span*240));for(let j=1;j<count;j++){const t=a.t+span*j/count;keys.push(make(t,evaluateCurve(curve,t)));}
   }else{left.outInterpolation='BEZIER';right.inInterpolation='BEZIER';left.outEase={speed:delta/duration*(p[1][1]-a.v)/outDx,influence:outDx/span*100};right.inEase={speed:delta/duration*(b.v-p[2][1])/inDx,influence:inDx/span*100};}
  }
  keys.push(right);
 }
 return {schema:'lomond.ae-temporal-plan/1',propertyScope:'scalar-nonspatial',mode:sampledSegments.length?'mixed-sampled':'temporal-handles',...(sampledSegments.length?{sampledSegments,reason:'Segments with zero or sub-0.1% handles use sampled linear keys; other segments retain their interpolation.'}:{}),keys};
}
