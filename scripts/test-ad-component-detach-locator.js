'use strict';
const assert = require('assert'), fs = require('fs'), crypto = require('crypto');
const { harness, prepareFeatureSamples } = require('./fixtures/ad-component-detach-harness');
let assertions = 0;
const records = [];
const plain = v => JSON.parse(JSON.stringify(v));
function eq(a,b,label) { assertions++; assert.deepStrictEqual(plain(a),plain(b),label); }
function ok(a,label) { assertions++; assert.ok(a,label); }
function setup(churn = true) {
    const h = harness(['  原文 日本語 %25 \\u0000\n"quote"  '], 'text', {wrapperChurn:churn});
    h.createResult = h.registered('createFeatureStack');
    eq(h.createResult.ok,true,'actual registered Feature Create');
    [h.source,h.ctrl,h.bg] = h.layers;
    h.comp.selectedLayers=[h.ctrl]; h.comp.time=2.5;
    h.fields=prepareFeatureSamples(h);
    h.ctrl.properties.position.value=[300,200]; h.ctrl.properties.anchor.value=[10,20];
    h.source.properties.anchor.value=[5,7];
    h.events.length=0;
    return h;
}
function snapshot(h) {
    return {time:h.comp.time,layers:h.snapshot(),fields:h.fields.map(f=>({key:f.key,value:f.prop.value,expression:f.prop.expression,enabled:f.prop.expressionEnabled,keys:f.prop.numKeys,writes:f.prop.writes})),flags:h.layers.map(l=>[l.matchName,l.collapseTransformation,l.canSetCollapseTransformation])};
}
function run(h,caseId) {
    const before=snapshot(h); h.events.length=0;
    const result=h.detach(), after=snapshot(h);
    eq(after.flags,before.flags,caseId+' type/collapse flags retained');
    eq(h.events.filter(e=>e.op==='flagWrite'),[],caseId+' no flag writes');
    records.push({caseId,create:h.createResult,before,result,after,events:h.events.slice(),loaded:h.host.loaded});
    return result;
}
function rejected(caseId,change,reason) {
    const h=setup(); change(h); const before=snapshot(h), result=run(h,caseId);
    eq(result.ok,false,caseId);
    ok(/preflight/.test(result.message),caseId+' preflight');
    ok(reason.test(result.message),caseId+' correct gate: '+result.message);
    eq(snapshot(h),before,caseId+' no stored changes');
    eq(h.events.filter(e=>e.op!=='sample'),[],caseId+' no writes or Undo group');
    return h;
}
function sameUnderlyingDifferentReferences(h) {
    const a=h.source.property('ADBE Transform Group').property('ADBE Position');
    const b=h.source.property('ADBE Transform Group').property('ADBE Position');
    const c=a.parentProperty.property(a.propertyIndex);
    ok(a!==b&&a!==c&&b!==c,'fresh wrappers each retrieval');
    ok(h.propertyModel.raw(a)===h.propertyModel.raw(b)&&h.propertyModel.raw(a)===h.propertyModel.raw(c),'one underlying property, no wrapper cache');
    eq([a.propertyIndex,a.matchName,a.propertyDepth],[b.propertyIndex,b.matchName,b.propertyDepth],'same public structural fields');
    return {ab:a===b,ac:a===c,bc:b===c,self:a===a,oneUnderlying:true};
}
function acquireFive(h) {
    const vectors=h.bg.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');
    return [h.source.property('ADBE Transform Group').property('ADBE Position'),
        h.bg.property('ADBE Transform Group').property('ADBE Position'),
        vectors.property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Size'),
        vectors.property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Roundness'),
        vectors.property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color')];
}
const baseline=process.argv.includes('--before');
if(!process.argv.includes('--boundaries-only')) {
    const h=setup(), identity=sameUnderlyingDifferentReferences(h), before=snapshot(h);
    const result=run(h,'wrapper-churn-complete-Feature'); records.at(-1).identity=identity;
    if(baseline) {
        eq(result.ok,false,'pre-fix actual rejection');
        ok(/unknown dependency or tool binding on an unsupported property/.test(result.message),'pre-fix additional binding gate');
        eq(snapshot(h),before,'pre-fix no changes');
        eq(h.events.filter(e=>e.op!=='sample'),[],'pre-fix no writes/Undo');
    } else {
        eq(result.ok,true,result.message);
        eq(h.fields.map(f=>[f.prop.expression,f.prop.expressionEnabled]),Array.from({length:5},()=>['',false]),'all five original templates released');
        eq(h.source.properties.position.value,[302.5,205],'source evaluated position with compensation');
        eq(h.bg.properties.position.value,[303,204.5],'background nested parent compensation');
        eq(h.fields.slice(2).map(f=>f.prop.value),[[102.5,42.5],7.5,[0.1,0.2,0.3,1]],'five-path evaluated values');
        eq(h.source.comment,'  原文 日本語 %25 \\u0000\n"quote"  ','exact source comment');
        eq(h.comp.time,2.5,'nonzero time unchanged');
        const first=h.events.findIndex(e=>!['sample','begin'].includes(e.op));
        for(const f of h.fields) ok(h.events.slice(0,first).some(e=>e.op==='sample'&&e.key===f.key),'sample before mutation '+f.key);
        ok(h.events.filter(e=>e.op==='sample').every(e=>e.t===2.5&&!e.preExpression),'samples/readback at exact time');
        eq(h.events.filter(e=>e.op==='comment').at(-1).layer,h.ctrl.name,'metadata controller last');
        sameUnderlyingDifferentReferences(h);
    }
}
// Boundary cases below run only against the final implementation; --before is a
// historical production reproduction, never an expected passing final suite.
if(!baseline) {
    const h=setup(false); eq(run(h,'stable-wrapper-control').ok,true,'stable wrapper unchanged');
    const unknown=/unknown dependency or tool binding on an unsupported property/;
    const locator=/property locator unavailable or invalid/;
    function valueField(h,key) { return h.propertyModel.raw(h.fields.find(f=>f.key===key).prop); }
    function vectors(h) { return h.bg.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group'); }
    if(!process.argv.includes('--boundaries-only')) {
        const churn=setup(), a=acquireFive(churn), b=acquireFive(churn), d=acquireFive(churn);
        const probes=[];
        for(let n=0;n<5;n++) {
            const c=a[n].parentProperty.property(a[n].propertyIndex), refs=[a[n],b[n],c,d[n]], pairs=[];
            for(let i=0;i<4;i++)for(let j=i+1;j<4;j++) {
                ok(refs[i]!==refs[j],'five-path independent wrapper '+n+':'+i+j);
                ok(churn.propertyModel.raw(refs[i])===churn.propertyModel.raw(refs[j]),'same stored property');
                eq([refs[i].propertyIndex,refs[i].matchName,refs[i].propertyDepth],[refs[j].propertyIndex,refs[j].matchName,refs[j].propertyDepth],'same exposed path fields');
                pairs.push({i,j,strictEqual:refs[i]===refs[j],sameUnderlying:true});
            }
            probes.push({key:churn.fields[n].key,pairs});
        }
        // A read-only acquisition guard catches any execution-time re-resolution.
        churn.propertyModel.read=(p,key,value)=>{
            if((key==='property'||key==='parentProperty')&&churn.events.some(e=>['expression','setValue','parent','comment'].includes(e.op)))
                throw Error('fixture acquisition after first write');
            return value;
        };
        eq(run(churn,'five-wrapper-paths-no-execution-resolution').ok,true,'complete churn finalization using retained props');
        records.at(-1).probes=probes;
        const renamed=setup();
        for(const p of acquireFive(renamed)) {
            let cursor=p;while(cursor.propertyDepth>0){cursor.name='same user display name';cursor=cursor.parentProperty;}
        }
        eq(run(renamed,'names-diagnostic-only').ok,true,'display names do not authorize or block identity');
        for(const [key,delta,accepted] of [['sourcePosition',0.00005,true],['sourcePosition',0.0002,false],['color',0.0000005,true],['color',0.000002,false]]) {
            const fixture=setup(), p=valueField(fixture,key), set=p.setValue;
            p.setValue=function(v){const changed=v.slice();changed[0]+=delta;set.call(this,changed);};
            const result=run(fixture,'churn-fixed-tolerance-'+key+'-'+delta);
            eq(result.ok,accepted,'unchanged geometry/color tolerance');
            if(!accepted)ok(/incomplete/.test(result.message),'post-write error reported accurately');
        }
        for(const fault of ['failWrite','failExpression','parent','comment']) {
            const fixture=setup();
            if(fault==='parent'||fault==='comment')fixture.bg.faults[fault]=true;
            else valueField(fixture,'size')[fault]=true;
            const result=run(fixture,'churn-execution-'+fault);
            eq(result.ok,false,'churn setter failure');ok(/incomplete/.test(result.message),'accurate partial result');
            ok(/no rollback/.test(result.message),'does not claim rollback');
            eq(fixture.events.filter(e=>e.op==='end').length,1,'Undo group ended');
            ok(fixture.ctrl.comment.startsWith(fixture.prefix),'controller metadata survives incomplete operation');
        }
        const normal=setup();
        eq(normal.registered('refreshSelectedComponent').ok,true,'churn registered Refresh');
        eq(normal.registered('removeSelectedGeneratedComponent').ok,true,'churn registered normal Remove');
        eq(normal.source.comment,'  原文 日本語 %25 \\u0000\n"quote"  ','normal Remove original comment');
        const grid=harness(['原 Grid',''],'shape',{wrapperChurn:true});eq(grid.create().ok,true,'churn registered Grid Create');
        grid.comp.selectedLayers=[grid.layers[2]];
        const result=grid.detach();eq(result.ok,true,'Grid outside locator scope');
        eq(grid.layers.slice(0,2).map(l=>l.comment),['原 Grid',''],'Grid exact empty/nonempty recovery');
    }
    rejected('sixth-same-artifact-tool-binding',h=>{
        const p=vectors(h).property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Opacity');
        p.expression=h.fields.find(f=>f.key==='color').prop.expression;
    },unknown);
    rejected('unknown-user-active-dependency',h=>{
        vectors(h).property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Opacity').expression='parent.opacity';
    },unknown);
    rejected('same-name-matchName-different-leaf-index',h=>{
        const fill=vectors(h).property('ADBE Vector Graphic - Fill'), p=fill.property('ADBE Vector Fill Opacity');
        const color=valueField(h,'color');p.name=color.name;p.matchName=color.matchName;p.expression=color.expression;
        ok(p.propertyIndex!==color.propertyIndex,'distinct leaf index fixture');
    },unknown);
    rejected('different-full-path-length',h=>{
        const extra=vectors(h).addProperty('ADBE Vector Group').property('ADBE Vectors Group')
            .property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Size');
        extra.expression=valueField(h,'size').expression;
        ok(extra.propertyDepth!==valueField(h,'size').propertyDepth,'extra ancestor changes full path length');
    },unknown);
    for(const kind of ['Shape','Effect']) rejected('same-named-'+kind+'-ancestor-index',h=>{
        if(kind==='Shape') {
            const root=h.bg.property('ADBE Root Vectors Group'), first=root.property(1);
            const duplicate=root.addProperty('ADBE Vector Group');duplicate.name=first.name;
            const secondVectors=duplicate.property('ADBE Vectors Group');
            const secondSize=secondVectors.property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Size');
            secondSize.expression=valueField(h,'size').expression;
            ok(duplicate.propertyIndex!==first.propertyIndex,'distinct ancestor index, same display/matchName');
        } else {
            const effects=h.ctrl.property('ADBE Effect Parade');
            const first=effects.property('Gap'), duplicate=effects.addProperty(first.matchName);duplicate.name=first.name;
            duplicate.property(1).expression=valueField(h,'round').expression;
            ok(duplicate.propertyIndex!==first.propertyIndex,'duplicate Effect name is not ownership');
        }
    },unknown);
    rejected('same-index-path-different-ancestor-matchName',h=>{
        const transform=h.propertyModel.raw(h.source.property('ADBE Transform Group'));
        h.propertyModel.read=(p,key,value,access)=>p===transform&&key==='matchName'&&typeof access.argument==='number'?'ADBE Other Transform':value;
    },unknown);
    rejected('same-path-different-layer-id',h=>{
        // Controller has the same Position path but is not an admitted Position edit.
        const p=h.ctrl.properties.position;p.expression=valueField(h,'sourcePosition').expression;
        p.evaluate=()=>[300,200];
        eq(p.propertyIndex,h.source.properties.position.propertyIndex,'same leaf index');
        ok(h.ctrl.id!==h.source.id,'different layer identities');
    },unknown);
    rejected('same-layer-path-different-comp-id',h=>{
        // Fault injection: the public comp id changes only when scanning starts.
        // Not a second comp's executable authority and not an AE behavior claim.
        let scanned=false;const get=h.source.property;
        Object.defineProperty(h.comp,'id',{get:()=>scanned?200:100});
        h.source.property=function(k){if(k===1)scanned=true;return get.call(this,k);};
    },unknown);
    rejected('duplicate-planned-locators',h=>{h.bg.id=h.source.id;},/duplicate planned property locator/);
    rejected('release-association-path-changed',h=>{
        // Third locator read for this Position is the release association, after
        // its planned and scan locators. Inject a structural change at that boundary.
        const p=valueField(h,'sourcePosition');let reads=0;
        h.propertyModel.read=(target,key,value)=>{
            if(target===p&&key==='propertyIndex'&&++reads===3)return 99;
            return value;
        };
    },/parent release has no unique planned property/);
    for(const key of ['propertyIndex','matchName','propertyDepth','parentProperty']) {
        rejected('planned-unreadable-'+key,h=>{
            Object.defineProperty(valueField(h,'size'),key,{configurable:true,get(){throw Error('fixture unreadable '+key);}});
        },locator);
        rejected('scan-unreadable-'+key,h=>{
            const p=valueField(h,'size');h.propertyModel.read=(target,k,v,access)=>{
                if(target===p&&k===key&&typeof access.argument==='number')throw Error('fixture scan unreadable '+key);
                return v;
            };
        },locator);
    }
    for(const value of [0,-1,1.5,NaN,Infinity,'2',undefined]) rejected('invalid-propertyIndex-'+String(value),h=>{valueField(h,'size').propertyIndex=value;},locator);
    for(const value of ['',null,undefined,4]) rejected('invalid-matchName-'+String(value),h=>{valueField(h,'size').matchName=value;},locator);
    for(const value of [0,-1,1.5,NaN,Infinity,'5',undefined,22]) rejected('invalid-depth-'+String(value),h=>{
        Object.defineProperty(valueField(h,'size'),'propertyDepth',{get:()=>value});
    },locator);
    rejected('null-parent',h=>Object.defineProperty(valueField(h,'size'),'parentProperty',{get:()=>null}),locator);
    rejected('parent-cycle',h=>{const p=valueField(h,'size');Object.defineProperty(p,'parentProperty',{get:()=>p});},locator);
    rejected('wrong-layer-root',h=>{
        const p=valueField(h,'sourcePosition').parentProperty;
        Object.defineProperty(p,'parentProperty',{get:()=>h.ctrl});
    },locator);
    for(const owner of ['source','comp']) {
        rejected('unreadable-'+owner+'-id',h=>Object.defineProperty(h[owner],'id',{get(){throw Error('fixture id read');}}),locator);
        for(const value of [0,-1,1.5,NaN,Infinity,'100',undefined]) rejected('invalid-'+owner+'-id-'+String(value),h=>{h[owner].id=value;},locator);
    }
    rejected('unreadable-containingComp',h=>{h.ctrl.faults.readProperties=['containingComp'];},locator);
    rejected('wrong-containingComp',h=>{h.source.containingComp={id:999,numLayers:h.comp.numLayers,layer:h.comp.layer};},locator);
    rejected('scan-unreadable-no-expression-property',h=>{
        const transform=h.propertyModel.raw(h.ctrl.property('ADBE Transform Group'));
        h.propertyModel.read=(p,key,v,access)=>{
            if(p===transform&&key==='propertyIndex'&&typeof access.argument==='number')throw Error('fixture unreadable empty group index');
            return v;
        };
    },locator);
    // Identity cannot admit an edit that failed the original F1 ownership checks.
    for(const key of ['sourcePosition','backgroundPosition','size','round','color']) {
        rejected(key+'-keyframes',h=>{valueField(h,key).numKeys=1;},/not writable without changing keyframes/);
        rejected(key+'-template-tampering',h=>{valueField(h,key).expression+='\n// modified';},/unknown\/edited expression/);
        rejected(key+'-wrong-artifact',h=>{const p=valueField(h,key);p.expression=p.expression.replace(/artifactId=[^\n]+/,'artifactId=foreign');},/unknown\/edited expression/);
        rejected(key+'-wrong-role',h=>{const p=valueField(h,key);p.expression=p.expression.replace(/role=[^\n]+/,'role=helper');},/unknown\/edited expression/);
        rejected(key+'-wrong-kind',h=>{const p=valueField(h,key);p.expression=p.expression.replace(/kind=[^\n]+/,'kind=iconGrid');},/unknown\/edited expression/);
        rejected(key+'-protected-history',h=>{const p=valueField(h,key);p.expression=p.expression.replace('previousExpressionEncoded=','previousExpressionEncoded=value%2B1');},/unknown\/edited expression/);
    }
    rejected('churn-text-3D',h=>{h.source.threeDLayer=true;},/unsupported 3D layer/);
    rejected('churn-unknown-type',h=>{h.bg.matchName='unknown';},/unknown\/unreadable layer type/);
    rejected('churn-collapsed-precomp',h=>{h.ctrl.nullLayer=false;h.ctrl.source=new h.host.sandbox.CompItem();h.ctrl.collapseTransformation=true;},/unsupported collapsed precomp/);
}
const output=process.argv.find(a=>a.endsWith('.json'));
console.log('A08-F1b Property locator '+(baseline?'BEFORE reproduction':'focused')+': '+assertions+' assertions PASS (full production Host, synthetic AE wrappers/evaluation; no real AE)');
if(output) {
    const sources=['host/tools/adComponentKit.jsx','scripts/fixtures/ad-component-detach-harness.js',__filename];
    fs.writeFileSync(output,JSON.stringify({phase:baseline?'BEFORE':'AFTER',command:process.argv.join(' '),assertions,sources:sources.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),records},null,2)+'\n',{flag:'wx'});
}
