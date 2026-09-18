// UI-independent paint data. CSS and SVG are projections, never stored gradients.
export const SCHEMA_VERSION=1;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const clone=value=>JSON.parse(JSON.stringify(value));
export const uid=()=>globalThis.crypto?.randomUUID?.()||`p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const hexToRgb=hex=>{const h=hex.replace('#','');if(!/^[0-9a-f]{6}$/i.test(h))throw new Error('Enter a six-digit HEX color.');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);};
export const rgbToHex=rgb=>'#'+rgb.map(v=>Math.round(clamp(v)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export const solid=(hex='#B5ADE9')=>({kind:'solid',colorSpace:'srgb',rgb:hexToRgb(hex),opacity:1});
export function gradient(a='#6D66CF',b='#EBA88B',type='linear'){
 return {kind:'gradient',type,colorSpace:'srgb',interpolation:'linear-srgb',colorStops:[{id:uid(),offset:0,rgb:hexToRgb(a)},{id:uid(),offset:1,rgb:hexToRgb(b)}],opacityStops:[{id:uid(),offset:0,opacity:1},{id:uid(),offset:1,opacity:1}],start:type==='radial'?[.5,.5]:[0,.5],end:[1,.5],highlightLength:0,highlightAngle:0};
}
export const slot=(name,paint=solid())=>({id:uid(),name,paint});
export const palette=(name='Untitled palette',groupId=null)=>({id:uid(),name,groupId,slots:[]});
export function seedLibrary(){
 const groups=[{id:'brand',name:'Brand'},{id:'motion',name:'Motion'},{id:'studies',name:'Studies'}];
 const make=(name,groupId,slots)=>({...palette(name,groupId),slots});
 const dusk=gradient('#393D75','#F0B09C');dusk.colorStops.splice(1,0,{id:uid(),offset:.54,rgb:hexToRgb('#B68BCB')});
 const halo=gradient('#B5ADE9','#5C67A4','radial');halo.opacityStops[1].opacity=0;
 return {schemaVersion:1,groups,palettes:[
  make('Vela · Core','brand',[slot('Ink',solid('#17181D')),slot('Mist',solid('#E9E9EE')),slot('Iris',solid('#B5ADE9')),slot('Sage',solid('#A0C3B1')),slot('Iris light',gradient('#6D66CF','#C5C1EF'))]),
  make('Afterglow','motion',[slot('Dusk',dusk),slot('Ember',solid('#F0B09C')),slot('Twilight',solid('#393D75')),slot('Halo',halo)]),
  make('Atlantic','studies',[slot('Deep',solid('#192E42')),slot('Tide',solid('#35788B')),slot('Foam',solid('#CCE2DD')),slot('Current',gradient('#193E57','#92CEC5'))]),
  make('Monochrome',null,['#101114','#34353D','#777A89','#B6B8C3','#F1F1F5'].map((hex,i)=>slot(`Neutral ${i+1}`,solid(hex))))
 ]};
}
export function copyPalette(source){const p=clone(source);p.id=uid();p.name=p.name.slice(0,75)+' copy';p.slots=p.slots.map(copySlot);return p;}
export function copySlot(source){const s=clone(source);s.id=uid();if(s.paint.kind==='gradient')for(const key of ['colorStops','opacityStops'])s.paint[key].forEach(stop=>stop.id=uid());return s;}
export function filterPalettes(data,{query='',group='all',type='all'}={}){const q=query.trim().toLocaleLowerCase();return data.palettes.filter(p=>(group==='all'||(group==='none'?p.groupId===null:p.groupId===group))&&(type==='all'||p.slots.some(s=>s.paint.kind===type))&&(!q||[p.name,data.groups.find(g=>g.id===p.groupId)?.name||'',...p.slots.map(s=>s.name),...p.slots.flatMap(s=>s.paint.kind==='solid'?[rgbToHex(s.paint.rgb)]:s.paint.colorStops.map(c=>rgbToHex(c.rgb)))].join(' ').toLocaleLowerCase().includes(q)));}
export function removeGroup(data,id){data.groups=data.groups.filter(g=>g.id!==id);data.palettes.forEach(p=>{if(p.groupId===id)p.groupId=null;});}
export const ordered=stops=>[...stops].sort((a,b)=>a.offset-b.offset);
export function sampleStops(stops,t,key){const list=ordered(stops);if(t<list[0].offset)return clone(list[0][key]);let left=list[0];for(const right of list.slice(1)){if(t<right.offset){const u=(t-left.offset)/(right.offset-left.offset);return Array.isArray(left[key])?left[key].map((v,i)=>v+(right[key][i]-v)*u):left[key]+(right[key]-left[key])*u;}left=right;}return clone(left[key]);}
export function addStop(paint,channel,offset=.5){const key=channel==='color'?'colorStops':'opacityStops',value=channel==='color'?'rgb':'opacity';if(paint[key].length>=32)throw new Error('A gradient can have up to 32 stops per channel.');const stop={id:uid(),offset:clamp(offset),[value]:sampleStops(paint[key],offset,value)};paint[key].push(stop);return stop;}
export function setAngle(paint,degrees){const r=degrees*Math.PI/180,dx=Math.cos(r),dy=Math.sin(r),scale=.5/Math.max(Math.abs(dx),Math.abs(dy));paint.start=[.5-dx*scale,.5-dy*scale];paint.end=[.5+dx*scale,.5+dy*scale];}
export const angleOf=paint=>(Math.atan2(paint.end[1]-paint.start[1],paint.end[0]-paint.start[0])*180/Math.PI+360)%360;

export function validateLibrary(data){
 const fail=message=>{throw new Error(message);},ids=new Set(),id=value=>{if(typeof value!=='string'||!/^[-_A-Za-z0-9]{1,100}$/.test(value)||ids.has(value))fail('Invalid or duplicate identity.');ids.add(value);};
 const name=value=>{if(typeof value!=='string'||!value.trim()||value.length>80)fail('Names must contain 1–80 characters.');};
 const number=(v,a=0,b=1)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)fail('Color or geometry value is outside its range.');};
 const rgb=value=>{if(!Array.isArray(value)||value.length!==3)fail('Invalid RGB color.');value.forEach(v=>number(v));};
 if(!data||data.schemaVersion!==SCHEMA_VERSION||!Array.isArray(data.groups)||!Array.isArray(data.palettes)||data.groups.length>100||data.palettes.length>200)fail('Unsupported palette library.');
 data.groups.forEach(g=>{id(g.id);name(g.name);});
 data.palettes.forEach(p=>{id(p.id);name(p.name);if(p.groupId!==null&&!data.groups.some(g=>g.id===p.groupId))fail('Palette group does not exist.');if(!Array.isArray(p.slots)||p.slots.length>64)fail('A palette supports up to 64 slots.');p.slots.forEach(s=>{id(s.id);name(s.name);const a=s.paint;if(!a||a.colorSpace!=='srgb')fail('Unsupported color space.');if(a.kind==='solid'){rgb(a.rgb);number(a.opacity);return;}if(a.kind!=='gradient'||!['linear','radial'].includes(a.type)||a.interpolation!=='linear-srgb')fail('Unsupported paint type.');for(const key of ['colorStops','opacityStops']){if(!Array.isArray(a[key])||a[key].length<2||a[key].length>32)fail('Each gradient channel needs 2–32 stops.');a[key].forEach(stop=>{id(stop.id);number(stop.offset);key==='colorStops'?rgb(stop.rgb):number(stop.opacity);});}for(const point of [a.start,a.end]){if(!Array.isArray(point)||point.length!==2)fail('Invalid gradient point.');point.forEach(v=>number(v,-2,3));}if(Math.hypot(a.start[0]-a.end[0],a.start[1]-a.end[1])<.0001)fail('Gradient start and end must differ.');number(a.highlightLength,-.99,.99);number(a.highlightAngle,-360,360);});});
 return data;
}

// Neutral handoff: normalized coordinates become shape-local points. This is
// deliberately not an undocumented AE Colors property / setValue payload.
export function shapePaint(paint,{width=1920,height=1080}={}){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Shape dimensions must be positive.');
 if(paint.kind==='solid')return {schema:'lomond.shape-paint/1',kind:'fill',colorSpace:'srgb',color:clone(paint.rgb),opacity:paint.opacity*100};
 return {schema:'lomond.shape-paint/1',kind:'gradient-fill',type:paint.type,colorSpace:paint.colorSpace,interpolation:paint.interpolation,coordinateSpace:'shape-local',bounds:{width,height},startPoint:[(paint.start[0]-.5)*width,(paint.start[1]-.5)*height],endPoint:[(paint.end[0]-.5)*width,(paint.end[1]-.5)*height],highlightLength:paint.highlightLength*100,highlightAngle:paint.highlightAngle,colorStops:ordered(paint.colorStops).map(({offset,rgb})=>({position:offset,color:clone(rgb)})),opacityStops:ordered(paint.opacityStops).map(({offset,opacity})=>({position:offset,opacity:opacity*100}))};
}

// Independent RGB / alpha ramps preserve color beneath transparent stops.
// SVG is a disposable UI preview, sampled only at each channel's exact stops.
export function paintSVG(paint,width=240,height=112,ramp=false){
 const outer=content=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${content}</svg>`;
 if(paint.kind==='solid')return outer(`<rect width="100%" height="100%" fill="${rgbToHex(paint.rgb)}" opacity="${paint.opacity}"/>`);
 const start=ramp?[0,.5]:paint.start,end=ramp?[1,.5]:paint.end,s=[start[0]*width,start[1]*height],e=[end[0]*width,end[1]*height],radius=Math.hypot(e[0]-s[0],e[1]-s[1]),radial=!ramp&&paint.type==='radial',angle=Math.atan2(e[1]-s[1],e[0]-s[0])+paint.highlightAngle*Math.PI/180;
 const tag=radial?'radialGradient':'linearGradient',geometry=radial?`cx="${s[0]}" cy="${s[1]}" r="${radius}" fx="${s[0]+Math.cos(angle)*radius*paint.highlightLength}" fy="${s[1]+Math.sin(angle)*radius*paint.highlightLength}"`:`x1="${s[0]}" y1="${s[1]}" x2="${e[0]}" y2="${e[1]}"`;
 const grad=(id,stops)=>`<${tag} id="${id}" gradientUnits="userSpaceOnUse" color-interpolation="sRGB" ${geometry}>${stops}</${tag}>`;
 const colors=ordered(paint.colorStops).map(c=>`<stop offset="${c.offset}" stop-color="${rgbToHex(c.rgb)}"/>`).join('');
 const alpha=ordered(paint.opacityStops).map(c=>`<stop offset="${c.offset}" stop-color="white" stop-opacity="${c.opacity}"/>`).join('');
 return outer(`<defs>${grad('c',colors)}${grad('a',alpha)}<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:alpha"><rect width="100%" height="100%" fill="url(#a)"/></mask></defs><rect width="100%" height="100%" fill="url(#c)" mask="url(#m)"/>`);
}
export const paintURL=(paint,w=240,h=112,ramp=false)=>'data:image/svg+xml,'+encodeURIComponent(paintSVG(paint,w,h,ramp));
