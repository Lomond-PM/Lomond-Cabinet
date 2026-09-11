// AE object substitutes adapted from test-grid-host-contract; production loaded in full by A01 harness.
const { makeHost, prefix } = require('./host-json-entry-harness');
// Fixture tree links model public AE Property API fields, not production locator logic.
function linkProperty(parent, child, index, matchName) {
    Object.defineProperties(child, {
        parentProperty: { configurable: true, get: () => parent },
        propertyDepth: { configurable: true, get: () => parent.propertyDepth + 1 }
    });
    child.propertyIndex = index;
    child.matchName = matchName;
    if (!child.name) child.name = matchName;
    return child;
}
function propertyModel(churn) {
    const underlying = new WeakMap();
    const model = { churn: !!churn, reads: [], read: null, raw: p => underlying.get(p) || p };
    model.wrap = function (p, access) {
        if (!p || !model.churn || p.fixtureLayer) return p;
        p = model.raw(p);
        const wrapper = new Proxy(p, {
            get(target, key) {
                let value = target[key];
                if (model.read) value = model.read(target, key, value, access);
                if (key === 'parentProperty') return model.wrap(value, access);
                if (key === 'property' || key === 'addProperty') return function (arg) {
                    const result = value.call(target, arg);
                    model.reads.push({ method: key, argument: arg });
                    return model.wrap(result, { parent: target, method: key, argument: arg });
                };
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set(target, key, value) { target[key] = value; return true; }
        });
        underlying.set(wrapper, p);
        return wrapper;
    };
    return model;
}
function property(value, options) {
    options = options || {};
    const p = {
        value: Array.isArray(value) ? value.slice() : value,
        numKeys: 0,
        canSetExpression: true,
        expressionError: '',
        expressionEnabled: options.expressionEnabled === true,
        dimensionsSeparated: options.dimensionsSeparated === true,
        writes: 0,
        setValue: options.writable === false ? null : function (next) {
            if (this.event) this.event({op:'setValue', value:next});
            if (this.failWrite) throw Error('fixture property write');
            this.writes += 1;
            this.value = Array.isArray(next) ? next.slice() : next;
        },
        valueAtTime: function (t, preExpression) {
            if (this.event) this.event({op:'sample',t,preExpression});
            if (this.failSample) throw Error('fixture sample failure');
            if (this.expressionEnabled && !preExpression) {
                if (!this.evaluate) throw Error('fixture evaluator not supplied');
                return this.evaluate(t);
            }
            return Array.isArray(this.value) ? this.value.slice() : this.value;
        }
    };
    let expression='';
    Object.defineProperty(p,'expression',{get(){return expression;},set(v){
        if(p.event)p.event({op:'expression',value:v});
        if(p.failExpression)throw Error('fixture expression write');
        expression=v;p.expressionEnabled=!!v;
    }});
    return p;
}

function makeLayer(kind, options) {
    options = options || {};
    const anchor = property(options.anchor || [0, 0], { expressionEnabled: options.anchorExpression });
    const position = property(options.position || [400, 300], { expressionEnabled: options.positionExpression, dimensionsSeparated: options.separated });
    const scale = property(options.scale || [100, 100], { expressionEnabled: options.scaleExpression });
    const rotation = property(options.rotation || 0, { expressionEnabled: options.rotationExpression });
    const positionX = property(position.value[0], { writable: options.separatedWritable !== false, expressionEnabled: options.positionExpression });
    const positionY = property(position.value[1], { writable: options.separatedWritable !== false, expressionEnabled: options.positionExpression });
    const effectList=[];
    const effects = {
        addProperty: function (type) { const value=property(0), effect={name:'',numProperties:1,property:()=>value};effectList.push(effect);linkProperty(effects,effect,effectList.length,type);linkProperty(effect,value,1,type+'-0001');return effect; },
        property: function (name) { return typeof name==='number'?effectList[name-1]:effectList.find(e=>e.name===name); }
    };
    Object.defineProperty(effects,'numProperties',{get:()=>effectList.length});
    const transform = {
        numProperties: 4,
        property: function (name) {
            if(typeof name==='number')return [anchor,position,scale,rotation][name-1];
            return { "ADBE Anchor Point": anchor, "ADBE Position": position, "ADBE Scale": scale, "ADBE Rotate Z": rotation, "ADBE Position_0": positionX, "ADBE Position_1": positionY }[name] || null;
        }
    };
    [anchor,position,scale,rotation,positionX,positionY].forEach((p,i)=>linkProperty(transform,p,i+1,
        ['ADBE Anchor Point','ADBE Position','ADBE Scale','ADBE Rotate Z','ADBE Position_0','ADBE Position_1'][i]));
    let parentValue = options.parent || null;
    let commentValue = options.comment || "";
    const layer = {
        name: options.name || kind,
        matchName: kind === "text" ? "ADBE Text Layer" : (kind === "shape" ? "ADBE Vector Layer" : (kind === "camera" ? "ADBE Camera Layer" : (kind === "light" ? "ADBE Light Layer" : "ADBE AV Layer"))),
        threeDLayer: options.threeD === true,
        locked: options.locked === true,
        nullLayer: options.nullLayer === true || kind === "null",
        adjustmentLayer: options.adjustment === true,
        // Observed AE Text/Vector flags: inherent true, not a user-toggleable precomp collapse.
        collapseTransformation: options.collapse === undefined ? kind === "text" || kind === "shape" : options.collapse,
        canSetCollapseTransformation: options.canSetCollapse === undefined ? kind !== "text" && kind !== "shape" : options.canSetCollapse,
        continuouslyRasterize: options.continuous === undefined ? kind === "shape" : options.continuous === true,
        sourceSizeReads: 0,
        writes: 0,
        properties: { anchor, position, scale, rotation, positionX, positionY },
        property: function (name) {
            if (name === "ADBE Transform Group") { return transform; }
            if (name === "ADBE Text Properties") { return kind === "text" ? {} : null; }
            if (name === "ADBE Root Vectors Group") { return kind === "shape" ? {} : null; }
            if (name === "ADBE Effect Parade") { return effects; }
            return null;
        },
        sourceRectCalls: 0,
        sourceRectAtTime: options.noSourceRect ? null : function () {
            this.sourceRectCalls += 1;
            if (options.sourceThrows) { throw new Error("source unavailable"); }
            return options.rect || { left: -50, top: -40, width: 100, height: 80 };
        },
        sourcePointToCompCalls: 0,
        sourcePointToComp: options.noSourcePointToComp ? null : function (point) {
            this.sourcePointToCompCalls += 1;
            if (options.sourcePointThrowsAt === this.sourcePointToCompCalls) { throw new Error("transport failed"); }
            if (options.sourcePointNull) { return null; }
            if (options.sourcePointShort) { return [1]; }
            if (options.sourcePointNaN) { return [NaN, 1]; }
            if (options.sourcePointInfinity) { return [Infinity, 1]; }
            return [position.value[0] + (point[0] - anchor.value[0]) * scale.value[0] / 100, position.value[1] + (point[1] - anchor.value[1]) * scale.value[1] / 100];
        },
        // Explicit legacy API capability for ordinary successful Feature fixtures.
        // AE boundary model only: 2D affine point transform; no rendering or expression engine.
        toComp: function (point) {
            const angle=rotation.value*Math.PI/180;
            const x=(point[0]-anchor.value[0])*scale.value[0]/100;
            const y=(point[1]-anchor.value[1])*scale.value[1]/100;
            const result=[position.value[0]+Math.cos(angle)*x-Math.sin(angle)*y,position.value[1]+Math.sin(angle)*x+Math.cos(angle)*y];
            return this.parent ? this.parent.toComp(result) : result;
        }
    };
    Object.defineProperty(layer, "width", { get: function () { layer.sourceSizeReads += 1; if (options.sourceSizeThrows) { throw new Error("source size must not be read"); } return options.width === undefined ? 100 : options.width; } });
    Object.defineProperty(layer, "height", { get: function () { layer.sourceSizeReads += 1; if (options.sourceSizeThrows) { throw new Error("source size must not be read"); } return options.height === undefined ? 80 : options.height; } });
    Object.defineProperty(layer, "parent", { get: function () { return parentValue; }, set: function (value) { layer.writes += 1; parentValue = value; } });
    Object.defineProperty(layer, "comment", { get: function () { return commentValue; }, set: function (value) { layer.writes += 1; commentValue = value; } });
    return layer;
}


function harness(comments, kind, options) {
 const host=makeHost('native'), events=[];
 const model=propertyModel(options && options.wrapperChurn);
 // AE boundary constructors/sources only; actual production classification is never copied here.
 function FootageItem() {}
 host.sandbox.FootageItem=FootageItem;
 const comp=new host.sandbox.CompItem();
 comp.id=100;
 const layers=[];
 function add(comment, name, layerKind, options) {
  const layer=makeLayer(layerKind || 'av',Object.assign({comment,name:name||'source',position:[400,300]},options));
  layer.source=layerKind==='text'||layerKind==='shape'?null:layerKind==='precomp'?new host.sandbox.CompItem():new FootageItem();
  const faults={}; let raw=comment, parent=null;
  if(layerKind==='shape') {
   function group(){
    const children={}, order=[], p=property(0);
    p.property=k=>typeof k==='number'?order[k-1]:(children[k]||p.addProperty(k));
    p.addProperty=k=>{const child=group();order.push(child);linkProperty(p,child,order.length,k);if(!children[k])children[k]=child;return child;};
    Object.defineProperty(p,'numProperties',{get:()=>order.length});
    return p;
   }
   const root=group(), originalProperty=layer.property;
   layer.property=function(key){return key==='ADBE Root Vectors Group'?root:originalProperty.call(this,key);};
  }
  // Wrap model in a fault-injectable boundary; production functions remain untouched.
  const wrapped=new Proxy(layer,{get(target,key){
   if(faults.readProperties&&faults.readProperties.includes(key))throw Error('fixture unreadable '+key);
   if(key==='comment'){if(faults.read)throw Error('fixture comment read');return raw;}
   if(key==='parent')return parent;
   return target[key];
  },set(target,key,value){
   if(key==='collapseTransformation'||key==='canSetCollapseTransformation')events.push({layer:target.name,op:'flagWrite',key,value});
   if(key==='comment'||key==='parent'){
    events.push({layer:target.name,op:key,value:key==='parent'?(value?value.name:null):value});
    if(faults[key])throw Error('fixture '+key+' write');
    if(key==='comment')raw=value;else parent=value;return true;
   }
   target[key]=value;return true;
  }});
  wrapped.faults=faults;wrapped.index=layers.length+1;wrapped.id=1000+wrapped.index;wrapped.containingComp=comp;
  wrapped.fixtureLayer=true;wrapped.propertyDepth=0;wrapped.parentProperty=null;
  wrapped.setParentWithJump=function(next){wrapped.parent=next;}; // Explicit model: no AE implicit compensation.
  wrapped.moveAfter=function(other){events.push({op:'moveAfter',layer:wrapped.name,other:other.name});};
  const properties=[layer.property('ADBE Transform Group'),layer.property('ADBE Effect Parade')];
  if(layerKind==='shape')properties.push(layer.property('ADBE Root Vectors Group'));
  const namedProperty=layer.property;
  properties.forEach((p,i)=>linkProperty(wrapped,p,i+1,['ADBE Transform Group','ADBE Effect Parade','ADBE Root Vectors Group'][i]));
  wrapped.numProperties=properties.length;
  wrapped.property=function(key){return model.wrap(typeof key==='number'?properties[key-1]:namedProperty.call(this,key),{parent:wrapped,method:'property',argument:key});};
  wrapped.remove=function(){events.push({layer:wrapped.name,op:'remove'});layers.splice(layers.indexOf(wrapped),1);};
  layers.push(wrapped);return wrapped;
 }
 comments.forEach((c,i)=>add(c,'source'+i,kind));
 comp.selectedLayers=layers.slice();comp.time=0;comp.name='A08 disposable VM';
 comp.layer=i=>layers[i-1];Object.defineProperty(comp,'numLayers',{get:()=>layers.length});
 comp.layers={addNull:()=>add('','controller','null'),addShape:()=>add('','generated','shape')};
 host.sandbox.app.project={activeItem:comp};
 host.sandbox.app.beginUndoGroup=name=>events.push({op:'begin',name});
 host.sandbox.app.endUndoGroup=()=>events.push({op:'end'});
 const api=host.sandbox.AEToolbox;
 function registered(action,params){return JSON.parse(api.runRegisteredToolAction('ecommerceLayout',action,JSON.stringify(params||{})));}
 function create(){return registered('createIconGrid',{normalizeMode:'none',columns:1});}
 function detach(){return JSON.parse(api.tools.adComponentKit.detachSelectedComponent());}
 function snapshot(){return layers.map(l=>({name:l.name,index:l.index,comment:l.comment,units:Array.from({length:l.comment.length},(_,i)=>l.comment.charCodeAt(i)),parent:l.parent?l.parent.name:null,transformExpressions:Object.keys(l.properties).map(k=>({key:k,expression:l.properties[k].expression||'',enabled:l.properties[k].expressionEnabled,writes:l.properties[k].writes})),position:l.properties.position.value,scale:l.properties.scale.value,anchor:l.properties.anchor.value}));}
 return {host,comp,layers,events,add,registered,create,detach,snapshot,prefix,propertyModel:model};
}
function featureProperties(h) {
 const result=[];
 for(const layer of h.layers) {
  if(!layer.comment.startsWith(h.prefix))continue;
  const data=JSON.parse(layer.comment.slice(h.prefix.length));
  if(data.componentType!=='featureStack')continue;
  if(data.role==='sourceLayerBinding')result.push({layer,prop:layer.properties.position,key:'sourcePosition',size:2});
  if(data.role==='generatedLayer') {
   const vectors=layer.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');
   result.push({layer,prop:layer.properties.position,key:'backgroundPosition',size:2},
    {layer,prop:vectors.property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Size'),key:'size',size:2},
    {layer,prop:vectors.property('ADBE Vector Shape - Rect').property('ADBE Vector Rect Roundness'),key:'round',size:0},
    {layer,prop:vectors.property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color'),key:'color',size:4});
  }
 }
 return result;
}
// Deliberately synthetic evaluator outputs, NOT an AE expression interpreter or visual proof.
function prepareFeatureSamples(h) {
 const fields=featureProperties(h);
 const functions={sourcePosition:t=>[10+t,20+2*t],backgroundPosition:t=>[3+t,4+t],size:t=>[100+t,40+t],round:t=>5+t,color:t=>[0.1,0.2,0.3,1]};
 for(const f of fields) {
  f.prop.evaluate=functions[f.key];
  f.prop.event=e=>h.events.push(Object.assign({layer:f.layer.name,key:f.key},e));
 }
 for(const l of h.layers)for(const [key,p] of Object.entries(l.properties))if(!p.event)p.event=e=>h.events.push(Object.assign({layer:l.name,key},e));
 return fields;
}
module.exports={harness,featureProperties,prepareFeatureSamples};
