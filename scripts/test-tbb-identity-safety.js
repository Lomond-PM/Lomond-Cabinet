const assert=require('assert'),fs=require('fs'),vm=require('vm');
const {harness}=require('./fixtures/tbb-coordinate-harness');
const {logicalReturns}=require('./fixtures/extendscript-logical-returns');
const before=process.argv.includes('--before'),records=[];
let scenarios=0,assertions=0;
function equal(a,b,label){assert.deepStrictEqual(a,b,label);assertions++;}
function check(v,label){assert.ok(v,label);assertions++;}
function scenario(name,fn){const h=harness({hostLogicalReturns:true});fn(h);scenarios++;records.push({name,results:h.results,events:h.events,calls:h.calls});}
// Pin the interpreter substitute to the pure-expression observations, not the TBB result.
for(const [expression,expected] of [['true || false && false',false],['true || (false && false)',true],['false && false || true && true',true]]){
    equal(vm.runInNewContext(logicalReturns('(function(){return '+expression+';}())')),expected,'AE logical observation '+expression);
}
scenario('R1 exact no-parent form through full Host/registry',h=>{
    const s=h.add('text',{anchor:[12,18],position:[330,275],scale:[140,90],rect:{left:3.14453125,top:-29.12109375,width:253.125,height:29.609375}});h.select(s);
    const r=h.run({paddingX:24,paddingY:12});
    if(before){equal(r.ok,false);equal(r.count,0);check(r.message.includes('Source identity/parent changed during preflight.'),r.message);equal(h.events,[]);}
    else {equal(r.ok,true,r.message);equal(r.count,1);equal(h.layers.length,2);equal(h.layers[1].parent.id,s.id);}
});
scenario('same null/null logic also affects initial default background parent readback',h=>{
    h.select();const r=h.run();
    if(before){equal(r.ok,false);check(r.message.includes('Destination Position space does not match the plan.'),r.message);equal(h.layers.length,1,'already added Shape');}
    else {equal(r.ok,true,r.message);equal(h.layers.length,1);equal(h.layers[0].parent,null);}
});
if(!before){
    function parent(h,kind='null'){return h.add(kind,{anchor:[11,7],position:[90,60],scale:[100,100]});}
    function reject(h,detail){const count=h.layers.length,r=h.run();equal(r.ok,false,detail);equal(r.count,0);check(r.message.includes('TBB_UNSUPPORTED_COORDINATE_ENVELOPE'),r.message);equal(h.events,[],'all preflight before any write');equal(h.layers.length,count);return r;}
    for(const kind of ['null','text'])scenario(kind+' parent with stable copied scalar identity passes both parent readbacks',h=>{
        const p=parent(h,kind),s=h.add('text',{parent:p,scale:[133,133],rotation:8});h.select(s);const r=h.run();equal(r.ok,true,r.message);equal(r.count,1);const bg=h.layers.at(-1);equal(bg.parent,s);
        equal(h.events.filter(e=>e.op==='setParentWithJump').map(e=>e.parent),[p.id]);equal(h.events.filter(e=>e.op==='parent').map(e=>e.parent),[s.id]);
    });
    scenario('source id drift during geometry read is compared with the plan-start scalar',h=>{let s;s=h.add('text',{onRect:()=>{s.id=987;}});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));});
    scenario('source containingComp drift does not follow the old reference as expected identity',h=>{let s;s=h.add('text',{onRect:()=>{s.containingComp={id:987};}});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));});
    scenario('source moved out of any comp rejects',h=>{let s;s=h.add('text',{onRect:()=>{s.containingComp=null;}});h.select(s);reject(h);});
    scenario('source invalidated/replaced after the plan identity was read rejects',h=>{let s;s=h.add('text',{onRect:()=>{Object.defineProperty(s,'id',{get(){throw Error('removed native layer');}});}});h.select(s);reject(h);});
    scenario('same comp object changes id after planning rejects',h=>{const s=h.add('text',{onRect:()=>{h.comp.id=987;}});h.select(s);reject(h);});
    scenario('parent null becomes an object during preflight rejects',h=>{const p=parent(h);let s;s=h.add('text',{onRect:()=>s.fixtureParent(p)});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));});
    scenario('parent object becomes null during preflight rejects',h=>{const p=parent(h);let s;s=h.add('text',{parent:p,onRect:()=>s.fixtureParent(null)});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));});
    scenario('parent replaced by different identity with same name/index rejects',h=>{
        const p=parent(h),replacement=parent(h);replacement.name=p.name;
        Object.defineProperty(replacement,'index',{value:p.index,configurable:true});
        let s;s=h.add('text',{parent:p,onRect:()=>s.fixtureParent(replacement)});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));
    });
    scenario('parent id drift is checked against frozen value, not the retained parent reference',h=>{
        const p=parent(h),s=h.add('text',{parent:p,onRect:()=>{p.id=987;}});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));
    });
    scenario('parent containingComp drift is checked against frozen value',h=>{
        const p=parent(h),s=h.add('text',{parent:p,onRect:()=>{p.containingComp={id:987};}});h.select(s);check(reject(h).message.includes('Source identity/parent changed during preflight.'));
    });
    const badIds=[undefined,null,false,0,-1,1.5,'300',NaN,Infinity];
    for(const field of ['source.id','source.containingComp.id','parent.id','parent.containingComp.id'])for(const value of badIds)scenario('invalid '+field+' '+String(value)+' rejects',h=>{
        const p=parent(h),s=h.add('text',{parent:field.startsWith('parent')?p:null}),target=field.startsWith('parent')?p:s;
        if(field.endsWith('containingComp.id'))target.containingComp={id:value};else target.id=value;
        h.select(s);reject(h);
    });
    for(const value of [undefined,false,0,''])scenario('non-null falsy parent '+String(value)+' is never no-parent',h=>{const s=h.add('text');s.fixtureParent(value);h.select(s);reject(h);});
    scenario('missing parent property is not explicit null',h=>{const s=h.add('text');delete s.parent;h.select(s);reject(h);});
    for(const field of ['id','containingComp','parent'])scenario('source '+field+' getter exception rejects',h=>{
        const s=h.add('text');Object.defineProperty(s,field,{configurable:true,get(){throw Error('native identity read failed');}});h.select(s);reject(h);
    });
    for(const field of ['id','containingComp'])scenario('parent '+field+' getter exception rejects',h=>{
        const p=parent(h),s=h.add('text',{parent:p});Object.defineProperty(p,field,{configurable:true,get(){throw Error('native parent identity read failed');}});h.select(s);reject(h);
    });
    for(const key of ['source','parent'])scenario(key+' containingComp.id getter exception rejects',h=>{const p=parent(h),s=h.add('text',{parent:p});(key==='source'?s:p).containingComp={get id(){throw Error('native comp identity read failed');}};h.select(s);reject(h);});
    scenario('source parent getter fails only in the final preflight recheck',h=>{
        let reads=0;const s=h.add('text');Object.defineProperty(s,'parent',{get(){if(++reads>=3)throw Error('late parent read');return null;},configurable:true});h.select(s);reject(h);
    });
    scenario('later selected source identity drifts: earlier source has no background',h=>{
        const a=h.add('text');let b;b=h.add('text',{onRect:()=>{b.id=987;}});h.select(a,b);reject(h);equal(h.layers.length,2);
    });
    scenario('later selection invalidates earlier source identity: no mutation',h=>{
        const a=h.add('text'),b=h.add('text',{onRect:()=>{a.id=987;}});h.select(a,b);reject(h);equal(h.layers.length,2);
    });
    for(const phase of ['initial','final'])scenario(phase+' parent assignment throws: truthful execution partial failure',h=>{
        const p=parent(h),s=h.add('text',{parent:p});h.select(s);h.faults.write=op=>op===(phase==='initial'?'setParentWithJump':'parent');const r=h.run();equal(r.ok,false);check(r.message.includes('TBB_EXECUTION_FAILED'));check(r.message.includes('partial changes may remain'));equal(h.layers.length,3);
    });
    scenario('silently ignored final parent assignment is rejected by readback',h=>{
        const s=h.add('text');h.select(s);h.faults.ignoreParentAssignment=true;const r=h.run();equal(r.ok,false);check(r.message.includes('TBB_EXECUTION_FAILED'),r.message);check(r.message.includes('Unreadable layer identity.'),r.message);check(r.message.includes('partial changes may remain'));
    });
    scenario('silently ignored initial parent assignment is rejected before Position write',h=>{
        const p=parent(h),s=h.add('text',{parent:p}),add=h.comp.layers.addShape;h.comp.layers.addShape=()=>{const bg=add();bg.setParentWithJump=()=>{};return bg;};h.select(s);const r=h.run();equal(r.ok,false);check(r.message.includes('Destination Position space does not match the plan.'));equal(h.events.filter(e=>e.op==='setValue').length,0);
    });
    scenario('final readback compares to frozen source identity even if source id changed in execution',h=>{
        const s=h.add('text');h.select(s);h.faults.write=op=>{if(op==='parent')s.id=987;return false;};const r=h.run();equal(r.ok,false);check(r.message.includes('Final source parent assignment failed.'));check(r.message.includes('partial changes may remain'));
    });
}
if(process.env.TBB_IDENTITY_EVIDENCE_OUTPUT)fs.writeFileSync(process.env.TBB_IDENTITY_EVIDENCE_OUTPUT,JSON.stringify({phase:before?'F1 before: defect reproduction, not real product acceptance':'F1 after',scenarios,assertions,records},null,2)+'\n');
console.log(`TBB identity ${before?'before defect reproduction':'safety'}: ${scenarios} scenarios / ${assertions} assertions PASS`);
