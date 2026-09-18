// Dynamic spring behavior following Apple's response / damping model (WWDC18).
// Response values are this Lab's tuning, not published SpringBoard constants.
export const MOTION={pace:.85,response:.46*.85,tapDamping:1,pickerOpen:.34*.85,pickerClose:.26*.85};
export const motionMs=milliseconds=>milliseconds*MOTION.pace;
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
export function springStep(value,velocity,target,dt,{response=MOTION.response,damping=1}={}){
 const w=2*Math.PI/response,y=value-target;
 if(damping===1){const b=velocity+w*y,e=Math.exp(-w*dt);return {value:target+(y+b*dt)*e,velocity:(velocity-w*b*dt)*e};}
 const z=damping*w,wd=w*Math.sqrt(1-damping*damping),b=(velocity+z*y)/wd,e=Math.exp(-z*dt),c=Math.cos(wd*dt),s=Math.sin(wd*dt);
 return {value:target+e*(y*c+b*s),velocity:e*((b*wd-z*y)*c+(-y*wd-z*b)*s)};
}
export function stepFrame(frame,velocity,target,dt,damping=1){
 const next={},speed={};for(const key of Object.keys(target)){const s=springStep(frame[key],velocity[key]||0,target[key],dt,{damping});next[key]=s.value;speed[key]=s.velocity;}return {frame:next,velocity:speed};
}
export function settled(frame,velocity,target){return Object.keys(target).every(k=>Math.abs(frame[k]-target[k])<(k==='p'?.0008:.18)&&Math.abs(velocity[k]||0)<(k==='p'?.008:2));}
