// Loads the complete production Host and real registry. Only native AE objects are substituted.
const { makeHost } = require('./host-json-entry-harness');
const copy = v => Array.isArray(v) ? Array.from(v) : v;

// General matrix oracle for the fixture Host, independent of TBB (which must use Host APIs).
const multiply = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const point = (m, p) => [m[0]*p[0]+m[2]*p[1]+m[4], m[1]*p[0]+m[3]*p[1]+m[5]];
function inverse(m) {
    const d=m[0]*m[3]-m[1]*m[2];
    return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];
}
function matrix(layer) {
    const p=layer.props, a=p.anchor.value, s=p.scale.value, r=p.rotation.value*Math.PI/180, pos=p.position.value;
    const m=[Math.cos(r)*s[0]/100,Math.sin(r)*s[0]/100,-Math.sin(r)*s[1]/100,Math.cos(r)*s[1]/100,0,0];
    m[4]=pos[0]-m[0]*a[0]-m[2]*a[1]; m[5]=pos[1]-m[1]*a[0]-m[3]*a[1];
    return layer.parent ? multiply(matrix(layer.parent),m) : m;
}
function harness(options={}) {
    const transformSource=options.hostLogicalReturns ? (source,file)=>/[/\\]textBackgroundBox\.jsx$/.test(file)?require('./extendscript-logical-returns').logicalReturns(source):source : null;
    const host=makeHost('native',{transformSource}), events=[], calls=[], layers=[], timeline=[];
    const comp=new host.sandbox.CompItem();
    function FootageItem() {}
    host.sandbox.FootageItem=FootageItem;
    let time=0.5, nextId=1;
    const faults={};
    const event=(op, fields={})=>{const e={op,...fields};events.push(e);timeline.push({type:'write',...e}); if(faults.write && faults.write(op,fields))throw Error('native write fault: '+op);};
    const call=e=>{calls.push(e);timeline.push({type:'read',...e});};
    function nativeCall(e, fn){calls.push(e);timeline.push(e);try{e.result=fn();return e.result;}catch(error){e.error=String(error);throw error;}}
    function prop(name, value) {
        let current=copy(value), expression='';
        const p={name,matchName:name,numKeys:0,expressionEnabled:false,expressionError:'',canSetExpression:true,dimensionsSeparated:false,
            valueAtTime(t){call({api:'valueAtTime',name,t});return copy(current);},
            setValue(v){event('setValue',{name,value:v}); if(!faults.ignoreValue || !faults.ignoreValue(name,v))current=copy(v);},
            seed(v){current=copy(v);}};
        Object.defineProperty(p,'value',{configurable:true,get:()=>copy(current)});
        Object.defineProperty(p,'expression',{get:()=>expression,set(v){event('expression',{name,value:v});expression=v;p.expressionEnabled=!!v;}});
        return p;
    }
    function group(name, seed=false) {
        const p=prop(name,0), children=[];
        p.property=k=>typeof k==='number' ? children[k-1]||null : children.find(c=>c.matchName===k||c.name===k)||null;
        const defaults={'ADBE Vector Anchor':[0,0],'ADBE Vector Position':[0,0],'ADBE Vector Scale':[100,100],'ADBE Vector Group Opacity':100,'ADBE Vector Rect Position':[0,0],'ADBE Vector Rect Size':[100,60],'ADBE Vector Fill Color':[1,1,1,1],'ADBE Vector Fill Opacity':100};
        const builtins={
            'ADBE Vector Group':['ADBE Vectors Group','ADBE Vector Transform Group'],
            'ADBE Vector Transform Group':['ADBE Vector Anchor','ADBE Vector Position','ADBE Vector Scale','ADBE Vector Skew','ADBE Vector Skew Axis','ADBE Vector Rotation','ADBE Vector Group Opacity'],
            'ADBE Vector Shape - Rect':['ADBE Vector Rect Position','ADBE Vector Rect Size','ADBE Vector Rect Roundness'],
            'ADBE Vector Graphic - Fill':['ADBE Vector Fill Color','ADBE Vector Fill Opacity'],
            'ADBE Vector Graphic - Stroke':['ADBE Vector Stroke Color','ADBE Vector Stroke Width','ADBE Vector Stroke Opacity'],
            'ADBE Vector Graphic - G-Fill':['ADBE Vector Fill Opacity','ADBE Vector Grad Start Pt','ADBE Vector Grad End Pt'],
            'ADBE Vector Graphic - G-Stroke':['ADBE Vector Stroke Width','ADBE Vector Stroke Opacity','ADBE Vector Grad Start Pt','ADBE Vector Grad End Pt'],
            'ADBE Slider Control':['ADBE Slider Control-0001'],'ADBE Color Control':['ADBE Color Control-0001'],'ADBE Point Control':['ADBE Point Control-0001']};
        function add(k, quiet) {
            if(!quiet)event('addProperty',{name:k});
            const c=group(k,true); c.seed(defaults[k]===undefined?0:defaults[k]);
            c.propertyIndex=children.length+1; c.parentProperty=p;children.push(c);return c;
        }
        p.addProperty=k=>add(k,false);
        p.seedChild=k=>add(k,true);
        Object.defineProperty(p,'numProperties',{get:()=>children.length});
        for(const k of builtins[name]||[])add(k,seed);
        return p;
    }
    function add(kind='text', options={}) {
        const id=nextId++, properties={anchor:prop('ADBE Anchor Point',options.anchor||[12,18]),position:prop('ADBE Position',options.position||[200,185]),scale:prop('ADBE Scale',options.scale||[140,90]),rotation:prop('ADBE Rotate Z',options.rotation||0)};
        const transform={property:k=>Object.values(properties).find(p=>p.matchName===k)||null};
        const effects=group('ADBE Effect Parade'),root=group('ADBE Root Vectors Group');
        let parent=options.parent||null, name=options.name||kind+id, comment='';
        const layer={id,containingComp:comp,matchName:kind==='text'?'ADBE Text Layer':kind==='shape'?'ADBE Vector Layer':kind==='camera'?'ADBE Camera Layer':'ADBE AV Layer',
            threeDLayer:!!options.threeD,locked:false,nullLayer:kind==='null',adjustmentLayer:false,
            collapseTransformation:kind==='text'||kind==='shape',canSetCollapseTransformation:kind!=='text'&&kind!=='shape',
            source:kind==='av'?new FootageItem():kind==='precomp'?new host.sandbox.CompItem():null,
            startTime:0,inPoint:0,outPoint:5,width:100,height:60,props:properties,root,effects,
            property:k=>k==='ADBE Transform Group'?transform:k==='ADBE Effect Parade'?effects:k==='ADBE Root Vectors Group'&&kind==='shape'?root:k==='ADBE Text Properties'&&kind==='text'?{}:null,
            sourceRectAtTime(t){call({api:'sourceRectAtTime',id,t}); if(options.onRect)options.onRect(comp); if(options.rectThrows)throw Error('rect unavailable');return Object.prototype.hasOwnProperty.call(options,'rect')?options.rect:{left:-50,top:-30,width:100,height:60};},
            sourcePointToComp(p){return nativeCall({type:'read',api:'sourcePointToComp',id,point:copy(p),time:comp.time},()=>options.forward?options.forward(p,layer,calls):point(matrix(layer),p));},
            compPointToSource(p){return nativeCall({type:'read',api:'compPointToSource',id,point:copy(p),time:comp.time},()=>options.inverse?options.inverse(p,layer,calls):point(inverse(matrix(layer)),p));},
            setParentWithJump(v){event('setParentWithJump',{id,parent:v&&v.id});parent=v;},
            moveAfter(v){event('moveAfter',{id,source:v.id});}};
        Object.defineProperties(layer,{
            index:{configurable:true,get:()=>layers.indexOf(layer)+1},name:{get:()=>name,set(v){event('name',{id,value:v});name=v;}},
            comment:{get:()=>comment,set(v){event('comment',{id,value:v});comment=v;}},
            parent:{configurable:true,get:()=>parent,set(v){
                event('parent',{id,parent:v&&v.id});
                if(faults.ignoreParentAssignment)return;
                // Model AE's compensating assignment. Test assertions also inspect Position BEFORE this phase.
                const world=matrix(layer), local=v?multiply(inverse(matrix(v)),world):world;
                parent=v;
                const a=properties.anchor.value;
                properties.position.seed(point(local,a));
                properties.scale.seed([Math.hypot(local[0],local[1])*100,(local[0]*local[3]-local[1]*local[2])/Math.hypot(local[0],local[1])*100]);
                properties.rotation.seed(Math.atan2(local[1],local[0])*180/Math.PI);
            }}
        });
        // Offline external-state drift, deliberately separate from production mutation events.
        layer.fixtureParent=v=>{parent=v;};
        for(const key of ['threeDLayer','startTime','inPoint','outPoint']){
            let value=layer[key];Object.defineProperty(layer,key,{configurable:true,get:()=>value,set(v){event(key,{id,value:v});value=v;}});
        }
        if(kind==='shape'&&!options.emptyShape){const g=root.seedChild('ADBE Vector Group');g.property('ADBE Vectors Group').seedChild('ADBE Vector Shape - Rect');}
        if(options.noRect)layer.sourceRectAtTime=undefined;
        if(options.noForward)layer.sourcePointToComp=undefined;
        if(options.noInverse)layer.compPointToSource=undefined;
        layers.push(layer);return layer;
    }
    Object.assign(comp,{id:100,name:'TBB coordinate VM',width:960,height:540,selectedLayers:[],layer:i=>layers[i-1],layers:{addShape(){event('addShape');const l=add('shape',{emptyShape:true,anchor:[0,0],position:[0,0],scale:[100,100]});return l;}}});
    Object.defineProperties(comp,{numLayers:{get:()=>layers.length},time:{configurable:true,get:()=>time,set(v){event('time',{value:v});time=v;}}});
    host.sandbox.app.project={activeItem:comp};
    host.sandbox.app.beginUndoGroup=name=>event('beginUndoGroup',{name});
    host.sandbox.app.endUndoGroup=()=>event('endUndoGroup');
    const results=[];
    function run(params={}){const result=JSON.parse(host.sandbox.AEToolbox.runRegisteredToolAction('textBackgroundBox','create',JSON.stringify(params)));results.push(result);return result;}
    function readValue(p){try{return p.value;}catch(error){return {readError:String(error)};}}
    function snapshot(){return layers.map(l=>({id:l.id,name:l.name,parent:l.parent&&l.parent.id,comment:l.comment,transform:Object.fromEntries(Object.entries(l.props).map(([k,p])=>[k,{value:readValue(p),expression:p.expression,numKeys:p.numKeys}])),effects:l.effects.numProperties,shapes:l.root.numProperties}));}
    function select(...sources){comp.selectedLayers=sources;events.length=0;calls.length=0;timeline.length=0;}
    function setTime(v){time=v;}
    return {host,comp,layers,events,calls,timeline,results,faults,add,select,run,snapshot,setTime,prop};
}
module.exports={harness,matrix,point,inverse};
