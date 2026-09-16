const assert=require('assert');
const fs=require('fs');
const {harness,matrix,point}=require('./fixtures/tbb-coordinate-harness');
let scenarios=0, assertions=0;
const records=[];
function check(value,message){assert.ok(value,message);assertions++;}
function equal(a,b,message){assert.deepStrictEqual(a,b,message);assertions++;}
function near(a,b,message){check(Math.abs(a-b)<=1e-4,message+': '+a+' vs '+b);}
function scenario(name,fn){const h=harness();fn(h);scenarios++;records.push({name,results:h.results,events:h.events,calls:h.calls,timeline:h.timeline,snapshot:h.snapshot()});}
const before=process.argv.includes('--before');
const parent=(h,kind='null')=>h.add(kind,{anchor:[11,7],position:[90,60],scale:[100,100]});
function rejection(h,code){const b=h.snapshot(),r=h.run();equal(r.ok,false,code);check(r.message.includes(code),r.message);equal(r.count,0,'preflight count');equal(h.events,[],'no Undo/project/property writes');equal(h.snapshot(),b,'unchanged');return r;}

scenario('forward unavailable: old silent success / strict zero writes',h=>{
    const s=h.add('text',{noForward:true});h.select(s);
    if(before){const r=h.run();equal(r.ok,true,'historical silent success');equal(h.layers.length,2);check(h.events.some(e=>e.op==='setValue'&&e.name==='ADBE Anchor Point'),'Anchor already written');}
    else rejection(h,'TBB_SOURCE_TO_COMP_FAILED');
});
scenario('inverse unavailable: old comp point written in parent space',h=>{
    const p=parent(h);p.compPointToSource=undefined;const s=h.add('text',{parent:p});h.select(s);
    if(before){const expected=point(matrix(s),[0,0]),r=h.run();equal(r.ok,true);check(h.events.some(e=>e.op==='setValue'&&e.name==='ADBE Position'&&e.value[0]===expected[0]&&e.value[1]===expected[1]),'wrong-space write');}
    else rejection(h,'TBB_COMP_TO_PARENT_FAILED');
});
scenario('observed Host methods and absent expression-only methods',h=>{
    const s=h.add('text');h.select(s);
    equal(typeof s.sourcePointToComp,'function');equal(typeof s.compPointToSource,'function');equal(typeof s.toComp,'undefined');equal(typeof s.fromComp,'undefined');equal(h.run().ok,true);
});
scenario('visual: sourcePointToComp exists but old toComp-only path rejects',h=>{
    const s=h.add('shape',{scale:[100,100]});h.select(s);const r=h.run();
    if(before){equal(r.ok,false);equal(h.layers.length,1);equal(h.calls.filter(c=>c.api==='sourcePointToComp').length,0);}
    else {equal(r.ok,true);equal(h.layers.length,2);equal(h.calls.filter(c=>c.api==='sourcePointToComp').length,4);}
});

if(!before){
    function rectPath(bg){return bg.root.property(1).property('ADBE Vectors Group').property('ADBE Vector Shape - Rect');}
    function normal(h,s,params={paddingX:24,paddingY:12}){
        const r=s.sourceRectAtTime(h.comp.time),center=[r.left+r.width/2,r.top+r.height/2];
        const expected=point(matrix(s),center),sourceBefore=h.snapshot(),n=h.layers.length;
        const target=s.parent?[expected[0]-(s.parent.props.position.value[0]-s.parent.props.anchor.value[0]),expected[1]-(s.parent.props.position.value[1]-s.parent.props.anchor.value[1])]:expected;
        h.select(s);const result=h.run(params);equal(result.ok,true,result.message);equal(result.count,1);equal(h.layers.length,n+1);
        const bg=h.layers[n];equal(bg.parent.id,s.id,'final compensating parent');
        const writes=h.events.filter(e=>e.op==='setValue'&&e.name==='ADBE Position');equal(writes.length,1,'one planned Position');
        target.forEach((v,i)=>near(writes[0].value[i],v,'planned '+(s.parent?'parent':'comp')+' Position'));
        const actual=point(matrix(bg),bg.props.anchor.value);expected.forEach((v,i)=>near(actual[i],v,'final center'));
        equal(h.snapshot().slice(0,n),sourceBefore,'source not changed');
        const size=rectPath(bg).property('ADBE Vector Rect Size').value;
        near(size[0],r.width+2*params.paddingX,'local Text / unit visual width');near(size[1],r.height+2*params.paddingY,'height');
        const firstWrite=h.timeline.findIndex(e=>e.type==='write');
        check(firstWrite>0,'reads precede writes');check(h.timeline.slice(firstWrite).every(e=>!e.api),'no conversion or sourceRect sampling in execution');
        equal(h.comp.time,0.5,'current time preserved');check(h.events.every(e=>e.op!=='time'),'no seek');
        const corners=[[r.left,r.top],[r.left+r.width,r.top],[r.left+r.width,r.top+r.height],[r.left,r.top+r.height]];
        if(s.matchName==='ADBE Text Layer')corners.forEach(p=>{const a=point(matrix(s),p),b=point(matrix(bg),p);a.forEach((v,i)=>near(b[i],v,'snapshot basis preserved'));});
        return bg;
    }
    scenario('unparented Text: nonzero Anchor/Position and anisotropic Scale',h=>normal(h,h.add('text')));
    scenario('unparented Text does not require any inverse API',h=>normal(h,h.add('text',{noInverse:true})));
    for(const kind of ['null','text'])scenario('Text with nonzero '+kind+' parent Anchor/Position',h=>{
        const p=parent(h,kind),s=h.add('text',{parent:p,scale:[133,133],rotation:8,anchor:[23,9],position:[160,190]});
        s.compPointToSource=()=>{throw Error('must invert actual parent, not source');};normal(h,s);
        equal(h.calls.filter(c=>c.api==='compPointToSource').map(c=>c.id),[p.id]);
    });
    scenario('source Scale has AE 2D three-component storage; Z stays 100',h=>{
        const s=h.add('text',{scale:[140,90,100]});const add=h.comp.layers.addShape;
        h.comp.layers.addShape=()=>{const bg=add();bg.props.scale.seed([100,100,100]);bg.props.anchor.seed([0,0,0]);bg.props.position.seed([0,0,0]);return bg;};
        h.select(s);equal(h.run().ok,true);check(h.events.some(e=>e.op==='setValue'&&e.name==='ADBE Scale'&&e.value[2]===100));
    });
    scenario('legacy API spies never used on successful parent path',h=>{
        const p=parent(h),s=h.add('text',{parent:p});let count=0;s.toComp=p.fromComp=()=>{count++;throw Error('legacy API');};normal(h,s);equal(count,0);
    });
    const invalid=[['null',null],['undefined',undefined],['short',[1]],['empty',[]],['string','12'],['string x',['1',2]],['string y',[1,'2']],['NaN x',[NaN,2]],['NaN y',[1,NaN]],['Infinity x',[Infinity,2]],['Infinity y',[1,-Infinity]],['object',{}],['number',17],['boolean',false]];
    for(const [label,value] of invalid){
        scenario('forward invalid '+label,h=>{const s=h.add('text',{forward:()=>value});h.select(s);rejection(h,'TBB_INVALID_CONVERSION_RETURN');});
        scenario('inverse invalid '+label,h=>{const p=h.add('null',{scale:[100,100],inverse:()=>value}),s=h.add('text',{parent:p});h.select(s);rejection(h,'TBB_INVALID_CONVERSION_RETURN');});
    }
    for(const method of ['forward','inverse'])for(const failure of ['missing','not function','throw'])scenario(method+' '+failure+' never falls back',h=>{
        const p=parent(h),s=h.add('text',{parent:p}),target=method==='forward'?s:p,key=method==='forward'?'sourcePointToComp':'compPointToSource';
        target[key]=failure==='missing'?undefined:failure==='not function'?7:()=>{throw Error('Host exception');};
        let legacy=0;target[method==='forward'?'toComp':'fromComp']=()=>{legacy++;return [1,2];};h.select(s);
        rejection(h,method==='forward'?'TBB_SOURCE_TO_COMP_FAILED':'TBB_COMP_TO_PARENT_FAILED');equal(legacy,0);
    });
    for(const kind of ['shape','av']){
        scenario(kind+' strict four-corner AABB success',h=>{const s=h.add(kind,{scale:[100,100]});let legacy=0;s.toComp=()=>{legacy++;return [0,0];};normal(h,s);equal(legacy,0);equal(h.calls.filter(c=>c.api==='sourcePointToComp').length,4);});
        for(let corner=1;corner<=4;corner++)for(const mode of ['throw','NaN'])scenario(kind+' corner '+corner+' '+mode+' rejects whole plan',h=>{
            let n=0;const s=h.add(kind,{scale:[100,100],forward:p=>{if(++n===corner){if(mode==='throw')throw Error('corner');return [NaN,0];}return p;}});h.select(s);
            rejection(h,mode==='throw'?'TBB_SOURCE_TO_COMP_FAILED':'TBB_INVALID_CONVERSION_RETURN');
        });
        scenario(kind+' missing forward despite legacy method',h=>{const s=h.add(kind,{scale:[100,100],noForward:true});s.toComp=()=>{throw Error('do not call');};h.select(s);rejection(h,'TBB_SOURCE_TO_COMP_FAILED');});
    }
    for(const kind of ['text','shape','av'])for(const [label,rect] of [
        ['zero width',{left:0,top:0,width:0,height:50}],['zero height',{left:0,top:0,width:50,height:0}],['negative',{left:0,top:0,width:-10,height:50}],
        ['string width',{left:0,top:0,width:'100',height:50}],['NaN left',{left:NaN,top:0,width:100,height:50}],['Infinity height',{left:0,top:0,width:100,height:Infinity}],['missing left',{top:0,width:100,height:50}],['overflow',{left:1e308,top:0,width:1e308,height:50}]
    ])scenario(kind+' invalid rect '+label+' cannot use dimensions fallback',h=>{
        const s=h.add(kind,{scale:[100,100],rect});Object.defineProperty(s,'width',{get(){throw Error('forbidden dimensions fallback');}});h.select(s);rejection(h,'TBB_INVALID_SOURCE_GEOMETRY');
    });
    for(const kind of ['text','shape'])for(const fault of [{noRect:true},{rectThrows:true},{rect:null},{rect:undefined}])scenario(kind+' unavailable rect cannot use dimensions',h=>{const s=h.add(kind,{scale:[100,100],...fault});h.select(s);rejection(h,'TBB_INVALID_SOURCE_GEOMETRY');});
    for(const fault of [{noRect:true},{rectThrows:true},{rect:null},{rect:undefined}])scenario('AV unavailable rect uses finite footage dimensions',h=>{
        const s=h.add('av',{scale:[100,100],...fault});h.select(s);const r=h.run({paddingX:10,paddingY:5});equal(r.ok,true,r.message);equal(rectPath(h.layers[1]).property('ADBE Vector Rect Size').value,[120,70]);equal(h.calls.filter(c=>c.api==='sourcePointToComp').length,4);
    });
    for(const size of [0,-1,NaN,Infinity,'100'])scenario('AV invalid fallback size '+String(size),h=>{const s=h.add('av',{scale:[100,100],noRect:true});s.width=size;h.select(s);rejection(h,'TBB_INVALID_SOURCE_GEOMETRY');});
    scenario('finite converted corners with zero projected area reject',h=>{const s=h.add('shape',{scale:[100,100],forward:()=>[1,2]});h.select(s);rejection(h,'TBB_INVALID_SOURCE_GEOMETRY');});
    scenario('finite extreme corners whose AABB overflows reject',h=>{let n=0;const s=h.add('shape',{scale:[100,100],forward:()=>[++n%2?1e308:-1e308,n%2?10:-10]});h.select(s);rejection(h,'TBB_INVALID_SOURCE_GEOMETRY');});
    for(const fault of ['forward','inverse','visual','geometry','envelope'])scenario('valid first / invalid last '+fault+' produces zero mutation',h=>{
        const first=h.add('text');let last;
        if(fault==='inverse'){const p=parent(h);p.compPointToSource=undefined;last=h.add('text',{parent:p});}
        else last=h.add(fault==='visual'?'shape':'text',{noForward:fault==='forward'||fault==='visual',scale:[100,100],rect:fault==='geometry'?{left:0,top:0,width:0,height:1}:{left:0,top:0,width:50,height:30},threeD:fault==='envelope'});
        h.select(first,last);rejection(h,({forward:'TBB_SOURCE_TO_COMP_FAILED',inverse:'TBB_COMP_TO_PARENT_FAILED',visual:'TBB_SOURCE_TO_COMP_FAILED',geometry:'TBB_INVALID_SOURCE_GEOMETRY',envelope:'TBB_UNSUPPORTED_COORDINATE_ENVELOPE'})[fault]);
    });
    scenario('multi-input success uses all conversions before first mutation',h=>{
        const a=h.add('text'),p=parent(h),b=h.add('text',{parent:p}),s=h.add('shape',{scale:[100,100]});h.select(a,b,s);equal(h.run().ok,true);equal(h.layers.length,7);
        const first=h.timeline.findIndex(e=>e.type==='write');equal(h.timeline.filter(e=>e.api==='sourcePointToComp').length,6);check(h.timeline.slice(first).every(e=>!e.api));
    });
    for(const value of [undefined,null,NaN,Infinity,'0.5'])scenario('unavailable/nonfinite measurement time '+String(value),h=>{const s=h.add('text');h.setTime(value);h.select(s);rejection(h,'TBB_TIME_MISMATCH');});
    for(const delta of [2e-9,-2e-9])scenario('time mismatch between rect and conversion '+delta,h=>{const s=h.add('text',{onRect:()=>h.setTime(0.5+delta)});h.select(s);rejection(h,'TBB_TIME_MISMATCH');check(h.events.every(e=>e.op!=='time'));});
    scenario('time within fixed 1e-9 epsilon accepted without seeking',h=>{const s=h.add('text',{onRect:()=>h.setTime(0.5+5e-10)});h.select(s);equal(h.run().ok,true);equal(h.comp.time,0.5+5e-10);check(h.events.every(e=>e.op!=='time'));});
    scenario('time changes during forward rejected before inverse or mutation',h=>{const p=parent(h),s=h.add('text',{parent:p,forward:()=>{h.setTime(1);return [5,6];}});h.select(s);rejection(h,'TBB_TIME_MISMATCH');equal(h.calls.filter(c=>c.api==='compPointToSource').length,0);});
    scenario('time changes during inverse rejected',h=>{const p=h.add('null',{scale:[100,100],inverse:()=>{h.setTime(1);return [5,6];}}),s=h.add('text',{parent:p});h.select(s);rejection(h,'TBB_TIME_MISMATCH');});
    scenario('unreadable current time has a stable preflight reason',h=>{const s=h.add('text');Object.defineProperty(h.comp,'time',{get(){throw Error('time unavailable');}});h.select(s);rejection(h,'TBB_TIME_MISMATCH');});
    scenario('unavailable addShape is rejected before Undo group',h=>{const s=h.add('text');h.comp.layers.addShape=undefined;h.select(s);rejection(h,'TBB_UNSUPPORTED_COORDINATE_ENVELOPE');});
    scenario('unreadable Transform is rejected before creation',h=>{const s=h.add('text');Object.defineProperty(s.props.position,'value',{get(){throw Error('property unreadable');}});h.select(s);const r=h.run();equal(r.ok,false);check(r.message.includes('TBB_UNSUPPORTED_COORDINATE_ENVELOPE'));equal(h.events,[]);});
    const envelopeCases={
        '3D':(h,s)=>{s.threeDLayer=true;},'locked':(h,s)=>{s.locked=true;},'adjustment':(h,s)=>{s.adjustmentLayer=true;},
        'unknown type':(h,s)=>{s.matchName='ADBE Camera Layer';},'zero scale':(h,s)=>s.props.scale.seed([0,100]),'negative scale':(h,s)=>s.props.scale.seed([-100,100]),
        'nonuniform rotated':(h,s)=>s.props.rotation.seed(8),'source keys':(h,s)=>{s.props.position.numKeys=1;},'source expression':(h,s)=>{s.props.position.expression='value';},
        'separated Position':(h,s)=>{s.props.position.dimensionsSeparated=true;},'bad Anchor':(h,s)=>s.props.anchor.seed([NaN,0]),
        'parent rotation':(h,s)=>{const p=parent(h);p.props.rotation.seed(8);s.setParentWithJump(p);},
        'parent scale':(h,s)=>{const p=parent(h);p.props.scale.seed([120,100]);s.setParentWithJump(p);},
        'parent chain':(h,s)=>{const p=parent(h);p.setParentWithJump(parent(h));s.setParentWithJump(p);},
        'parent expression':(h,s)=>{const p=parent(h);p.props.position.expression='value';s.setParentWithJump(p);},
        'parent Shape':(h,s)=>s.setParentWithJump(h.add('shape',{scale:[100,100]})),
        'parent 3D':(h,s)=>s.setParentWithJump(h.add('null',{scale:[100,100],threeD:true}))
    };
    for(const [name,setup] of Object.entries(envelopeCases))scenario('M2 supported envelope rejects '+name,h=>{const s=h.add('text');setup(h,s);h.select(s);rejection(h,'TBB_UNSUPPORTED_COORDINATE_ENVELOPE');});
    for(const kind of ['null','precomp','camera'])scenario('unverified source '+kind,h=>{const s=h.add(kind);h.select(s);rejection(h,'TBB_UNSUPPORTED_COORDINATE_ENVELOPE');});
    scenario('complex Shape group transform rejected',h=>{const s=h.add('shape',{scale:[100,100]});s.root.property(1).property('ADBE Vector Transform Group').property('ADBE Vector Skew').seed(5);h.select(s);rejection(h,'TBB_UNSUPPORTED_COORDINATE_ENVELOPE');});
    scenario('nested Shape group rejected',h=>{const s=h.add('shape',{scale:[100,100]});s.root.property(1).property('ADBE Vectors Group').seedChild('ADBE Vector Group');h.select(s);rejection(h,'TBB_UNSUPPORTED_COORDINATE_ENVELOPE');});
    scenario('no selection default retains 100x100 / roundness 15 / no conversion',h=>{h.select();const r=h.run({paddingX:400,paddingY:200,cornerRadius:55});equal(r.ok,true);equal(r.selectionLabel,'Default 100x100');const bg=h.layers[0],rect=rectPath(bg);equal(rect.property('ADBE Vector Rect Size').value,[100,100]);equal(rect.property('ADBE Vector Rect Roundness').value,15);equal(bg.props.position.value,[480,270]);equal(bg.parent,null);equal(h.calls,[]);});
    for(const params of [{enableFill:false,enableStroke:false},{fillMode:'Gradient Fill'},{enableStroke:true,strokeMode:'Gradient Stroke'},{enableStroke:true,strokeMode:'Solid Stroke'}])scenario('style controls retained '+JSON.stringify(params),h=>{const s=h.add('text');h.select(s);equal(h.run(params).ok,true);});
    scenario('nonfinite padding rejected before writes',h=>{const s=h.add('text');h.select(s);const r=h.run({paddingX:'Infinity'});equal(r.ok,false);check(r.message.includes('TBB_INVALID_SOURCE_GEOMETRY'));equal(h.events,[]);});
    for(const op of ['addShape','setValue','addProperty','expression','parent','setParentWithJump'])scenario('execution '+op+' exception reports possible partial changes',h=>{
        const p=parent(h),s=h.add('text',{parent:p});h.select(s);h.faults.write=(name)=>name===op;const r=h.run();equal(r.ok,false);check(r.message.includes('TBB_EXECUTION_FAILED'));check(r.message.includes('partial changes may remain'));equal(h.events.at(-1).op,'endUndoGroup');check(h.events.some(e=>e.op==='addShape'));
    });
    scenario('critical Position silent setter failure is detected',h=>{const s=h.add('text');h.select(s);h.faults.ignoreValue=name=>name==='ADBE Position';const r=h.run();equal(r.ok,false);check(r.message.includes('TBB_EXECUTION_FAILED'));equal(h.layers.length,2,'partial Shape is honestly retained');});
    scenario('later execution failure reports completed count, without rollback claim',h=>{const a=h.add('text'),b=h.add('text');h.select(a,b);let n=0;h.faults.write=op=>op==='addShape'&&++n===2;const r=h.run();equal(r.ok,false);equal(r.count,1);equal(h.layers.length,3);check(r.message.includes('partial changes may remain'));});
}

if(process.env.TBB_EVIDENCE_OUTPUT)fs.writeFileSync(process.env.TBB_EVIDENCE_OUTPUT,JSON.stringify({phase:before?'M2 before defect reproduction (not product acceptance)':'M2 focused after',scenarios,assertions,records},(key,value)=>typeof value==='number'&&!Number.isFinite(value)?{number:String(value)}:value===undefined?{undefined:true}:value,2)+'\n');
console.log(`TBB coordinate ${before?'before defect reproduction':'safety'}: ${scenarios} scenarios / ${assertions} assertions PASS`);
