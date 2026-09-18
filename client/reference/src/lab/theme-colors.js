// Derive UI colors from a paint without changing the canonical paint itself.
const bytes=rgb=>rgb.map(v=>Math.round(Math.max(0,Math.min(1,v))*255)/255);
const luminance=rgb=>rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const hex=rgb=>'#'+bytes(rgb).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').toUpperCase();
const parse=h=>h.match(/../g).map(v=>parseInt(v,16)/255);
export function accentTokens(rgb,theme='dark'){
 const light=theme==='light',surfaces=(light?['f5f5f7','ededf0','ffffff','f4f4f7']:['101114','0c0d10','17181d','1c1d23']).map(parse),destination=light?[0,0,0]:[1,1,1];
 const blend=amount=>bytes(rgb.map((v,i)=>v+(destination[i]-v)*amount));
 const valid=color=>surfaces.every(bg=>contrast(color,bg)>=4.5)&&surfaces.every(bg=>contrast(color,color.map((v,i)=>v*.14+bg[i]*.86))>=4.5);
 let color=blend(0);if(!valid(color)){let low=0,high=1;for(let i=0;i<24;i++){const mid=(low+high)/2;if(valid(blend(mid)))high=mid;else low=mid;}color=blend(high);}
 const dark=parse('101114'),white=[1,1,1],on=contrast(color,dark)>=contrast(color,white)?dark:white;
 return {'--accent':hex(color),'--accent-fill':`rgba(${color.map(v=>Math.round(v*255)).join(',')},.14)`,'--on-accent':hex(on),'--focus-ring':hex(color)};
}
