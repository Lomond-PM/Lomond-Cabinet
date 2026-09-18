// Six-axis picker semantics from the project's Registry color picker, expressed
// as independent color math. UI gestures and persistence do not live here.
export const AXES=['hsv-h','hsv-s','hsv-v','rgb-r','rgb-g','rgb-b'];
export const CHANNELS={h:{name:'Hue',max:359,unit:'°'},s:{name:'Saturation',max:100,unit:'%'},v:{name:'Brightness',max:100,unit:'%'},r:{name:'Red',max:255,unit:''},g:{name:'Green',max:255,unit:''},b:{name:'Blue',max:255,unit:''}};
export const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const byte=v=>Math.round(clamp(v,0,255));
const hue=v=>((v%360)+360)%360;
export function fromRGB(rgb,alpha=1,previous){
 const [r,g,b]=rgb.map(byte),hi=Math.max(r,g,b)/255,lo=Math.min(r,g,b)/255,d=hi-lo;
 let h=previous?.h||0;if(d){if(hi===r/255)h=((g-b)/255/d)%6;else if(hi===g/255)h=(b-r)/255/d+2;else h=(r-g)/255/d+4;h=hue(h*60);}
 return {r,g,b,h,s:hi===0?(previous?.s||0):d/hi,v:hi,a:clamp(alpha)};
}
export function fromHSV(h,s,v,a=1){
 h=hue(h);s=clamp(s);v=clamp(v);const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
 const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return {r:byte((rgb[0]+m)*255),g:byte((rgb[1]+m)*255),b:byte((rgb[2]+m)*255),h,s,v,a:clamp(a)};
}
export function parseColor(text,previous,allowAlpha=true){const raw=String(text).trim().replace(/^#/,'');if(!new RegExp(allowAlpha?'^[0-9a-f]{6}([0-9a-f]{2})?$':'^[0-9a-f]{6}$','i').test(raw))throw new Error(allowAlpha?'Enter a 6-digit HEX color, or 8 digits with opacity.':'Enter a 6-digit HEX color.');return fromRGB([0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)),raw.length===8?parseInt(raw.slice(6,8),16)/255:previous?.a??1,previous);}
export const toHex=(c,alpha=false)=>'#'+[c.r,c.g,c.b,...(alpha?[c.a*255]:[])].map(v=>byte(v).toString(16).padStart(2,'0')).join('').toUpperCase();
export const channelValue=(c,k)=>k==='s'||k==='v'?c[k]*100:c[k];
export function setChannel(c,k,value){if(!Number.isFinite(value))throw new Error('Invalid color channel.');if(k==='a')return {...c,a:clamp(value/100)};if(!CHANNELS[k])throw new Error('Invalid color channel.');const n=clamp(value,0,CHANNELS[k].max);if(['h','s','v'].includes(k))return fromHSV(k==='h'?n:c.h,k==='s'?n/100:c.s,k==='v'?n/100:c.v,c.a);return fromRGB(['r','g','b'].map(key=>key===k?n:c[key]),c.a,c);}
export const axisValue=(c,mode)=>mode.startsWith('hsv')?c[mode.at(-1)]/(mode==='hsv-h'?359:1):c[mode.at(-1)]/255;
export function planePoint(c,mode){if(mode==='hsv-h')return {x:c.s,y:1-c.v};if(mode==='hsv-s')return {x:c.h/359,y:1-c.v};if(mode==='hsv-v')return {x:c.h/359,y:1-c.s};if(mode==='rgb-r')return {x:c.g/255,y:1-c.b/255};if(mode==='rgb-g')return {x:c.r/255,y:1-c.b/255};return {x:c.r/255,y:1-c.g/255};}
export function fromPlane(c,mode,x,y){x=clamp(x);y=clamp(y);if(mode==='hsv-h')return fromHSV(c.h,x,1-y,c.a);if(mode==='hsv-s')return fromHSV(x*359,c.s,1-y,c.a);if(mode==='hsv-v')return fromHSV(x*359,1-y,c.v,c.a);if(mode==='rgb-r')return fromRGB([c.r,x*255,(1-y)*255],c.a,c);if(mode==='rgb-g')return fromRGB([x*255,c.g,(1-y)*255],c.a,c);return fromRGB([x*255,(1-y)*255,c.b],c.a,c);}
export const fromAxis=(c,mode,value)=>setChannel(c,mode.at(-1),clamp(value)*CHANNELS[mode.at(-1)].max);
export const planeLabels=mode=>({'hsv-h':['Saturation','Brightness'],'hsv-s':['Hue','Brightness'],'hsv-v':['Hue','Saturation'],'rgb-r':['Green','Blue'],'rgb-g':['Red','Blue'],'rgb-b':['Red','Green']}[mode]);
export function channelGradient(c,k){const count=k==='h'?13:9;return `linear-gradient(to right,${Array.from({length:count},(_,i)=>toHex(setChannel(c,k,i/(count-1)*CHANNELS[k].max))).join(',')})`;}
export function planePixels(c,mode,width,height){
 const bytes=new Uint8ClampedArray(width*height*4),dx=Math.max(1,width-1),dy=Math.max(1,height-1);
 // Rasterization avoids creating an HSV/RGB state object for every pixel.
 if(mode.startsWith('rgb')){const fixed={r:0,g:1,b:2}[mode.at(-1)],horizontal=fixed===0?1:0,vertical=fixed===2?1:2,value=c[mode.at(-1)];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;bytes[i+fixed]=value;bytes[i+horizontal]=Math.round(x/dx*255);bytes[i+vertical]=Math.round((1-y/dy)*255);bytes[i+3]=255;}return bytes;
 }
 const hueColors=new Float64Array(width*3);
 for(let x=0;x<width;x++){const h=(mode==='hsv-h'?c.h:x/dx*359)/60,t=1-Math.abs(h%2-1),rgb=h<1?[1,t,0]:h<2?[t,1,0]:h<3?[0,1,t]:h<4?[0,t,1]:h<5?[t,0,1]:[1,0,t];hueColors.set(rgb,x*3);}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const s=mode==='hsv-h'?x/dx:mode==='hsv-s'?c.s:1-y/dy,v=mode==='hsv-v'?c.v:1-y/dy,chroma=v*s,base=v-chroma,i=(y*width+x)*4;
  bytes[i]=Math.round((hueColors[x*3]*chroma+base)*255);bytes[i+1]=Math.round((hueColors[x*3+1]*chroma+base)*255);bytes[i+2]=Math.round((hueColors[x*3+2]*chroma+base)*255);bytes[i+3]=255;
 }return bytes;
}
export class ColorSession{
 constructor(rgb,alpha=1){this.initial=fromRGB(rgb.map(v=>v*255),alpha);this.color={...this.initial};}
 get value(){return {rgb:[this.color.r,this.color.g,this.color.b].map(v=>v/255),opacity:this.color.a};}
 get dirty(){return toHex(this.color,true)!==toHex(this.initial,true);}
 reset(){this.color={...this.initial};}
 channel(k,v){this.color=setChannel(this.color,k,v);}
 plane(mode,x,y){this.color=fromPlane(this.color,mode,x,y);}
 axis(mode,v){this.color=fromAxis(this.color,mode,v);}
 hex(text,allowAlpha=true){this.color=parseColor(text,this.color,allowAlpha);}
}
