"use strict";
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const {create, flush} = require('./fixtures/vela-trajectory-harness');
const {harness, flush: bootFlush} = require('./test-vela-surface-bootstrap-boundary');
const {fixture} = require('./test-vela-surface-controller');
const O = require('../client/js/vela/velaConversationOwnership');
const P = require('../client/js/vela/velaPresentationModel').VelaPresentationModel;
const Surface = require('../client/js/vela/velaSurfaceController').VelaSurfaceController;
let count = 0;
function eq(a,b,label) { assert.deepStrictEqual(a,b,label); count++; }
function stale(fn) { assert.throws(fn, e => /^CONVERSATION_(OWNER|REVIEW)_/.test(e.code)); count++; }
function deferred() { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; }
function event(type,text) { return {type:'provider-stream-event',runtimeGeneration:1,reasoningInvocationId:'reasoning_1',presentationMode:'assistant-text',providerEvent:Object.freeze({type,text,requestId:'same_request',generation:1,providerId:'local',modelId:'m'})}; }
function synthetic() {
 const operation=deferred(), diagnostic=deferred(), listeners=[], projections=[];
 const state={provider:{state:'idle'},confirmation:{state:'idle'},review:{state:'active',reviewId:'same_review',revision:1},cancel:0,approve:0,reject:0,reads:0,driverReads:0};
 const session={isClosed:()=>false};
 const driver={getSnapshot(){state.driverReads++;return {objectiveId:'same_objective',state:state.provider.state==='pending'?'requesting':state.provider.state==='idle'?'idle':'terminal'};}};
 const owner={isDisposed:()=>false,getSessionRuntime:()=>session,getAgentDriver:()=>driver,startObjective(){state.provider={state:'pending'};return operation.promise;},cancelObjective(){state.cancel++;listeners.forEach(f=>f(event('stream-cancelled')));state.provider={state:'cancelled'};return true;},getObjectiveReviewPort:()=>({getProjection:()=>state.review}),refreshActiveComposition:()=>diagnostic.promise,cancelActiveCompositionRefresh:()=>true,getTrajectoryEvidence:()=>state};
 const runtime={getStatus:()=>({state:'ready'}),getProviderSurfaceState(){state.reads++;return state.provider;},getConfirmationSurfaceState:()=>state.confirmation,subscribePresentationEvents(fn){listeners.push(fn);return {unsubscribe(){const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);}};},approveActiveCandidate(){state.approve++;return operation.promise;},rejectActiveCandidate(){state.reject++;return Promise.resolve();},getProviderSelectionEvidence:()=>state};
 const p=P.create(),handle=O.createOwnership({agentOwner:owner,session,runtime,presentation:p},b=>b.fill(1)),port=O.createSourcePort(handle,()=>({endpoint:'http://127.0.0.1:1234',model:'m'}));
 return {p,handle,port,state,operation,diagnostic,listeners,emit(e){listeners.slice().forEach(f=>f(e));}};
}
async function real(options) { const h=await create(options); const p=P.create(),handle=O.createOwnership({agentOwner:h.owner,session:h.owner.getSessionRuntime(),runtime:h.runtime,presentation:p},b=>b.fill(2)); const port=O.createSourcePort(handle,()=>({endpoint:'http://127.0.0.1:1234',model:'m'})); return {...h,p,handle,port,close(){O.dispose(handle);h.dispose();}}; }
function view(t) {
 const stub=fixture();stub.controller.dispose();const e=stub.elements;
 const c=Surface.create({surface:{getElementsForTest:()=>e},sourcePort:t.port,provider:t.port.provider,confirmation:t.port.confirmation,presentation:t.p,PresentationModel:P,TranscriptView:require('../client/js/vela/velaTranscriptView').VelaTranscriptView,ComposerView:require('../client/js/vela/velaComposerView').VelaComposerView,ConfirmationView:require('../client/js/vela/velaConfirmationView').VelaConfirmationView,ActivationPolicy:require('../client/js/vela/velaActivationPolicy').VelaActivationPolicy,t:k=>k});
 c.mount();return {c,e};
}
async function run() {
 // A/C/I: same local stream/turn IDs, changed visible selection, exact destinations.
 const a=synthetic(),b=synthetic();let current=a;
 const op=a.port.provider.send('C1'),bp=b.port.provider.send('C2');current=b;
 b.emit(event('stream-started'));b.emit(event('reasoning-delta','C2 only'));
 const bTransient=JSON.stringify(b.p.getTransientSnapshot());
 const bBefore=JSON.stringify(b.p.getSnapshot());
 for(const type of ['stream-started','reasoning-delta','text-delta','stream-completed']) a.emit(event(type,'C1 only'));
 eq(b.p.getSnapshot().items[0].presentationTurnId,a.p.getSnapshot().items[0].presentationTurnId,'repeated local turn IDs');
 eq(JSON.stringify(b.p.getSnapshot()),bBefore,'A/I C2 untouched by C1 events');
 eq(JSON.stringify(b.p.getTransientSnapshot()),bTransient,'I identical reasoning/request IDs cannot collide');
 eq(a.p.getTransientSnapshot().invocations[0].reasoningText,'C1 only','A source stream actually ingested');
 const reads=b.state.reads,driverReads=b.state.driverReads;a.state.provider={state:'completed',text:'C1 terminal'};a.operation.resolve('done');await op;
 eq(b.state.reads,reads,'C completion never reads current Provider');eq(current,b,'selection independent');
 eq(b.state.driverReads,driverReads,'C completion never reads current Driver with repeated objective ID');
 eq(a.p.getSnapshot().items.some(x=>JSON.stringify(x).includes('C1 terminal')),true,'C source terminal committed without Surface');
 // D/E: exact source, stale displayed Review within same source, then disposal.
 const commands=a.port.confirmation.captureReviewCommands();await commands.reject();eq(a.state.reject,1,'D C1 review rejected');eq(b.state.reject,0,'D C2 Review unchanged');
 const old=a.port.confirmation.captureReviewCommands();a.state.review={...a.state.review,revision:2};stale(()=>old.approve());stale(()=>old.reject());
 const approve=a.port.confirmation.captureReviewCommands();await approve.approve();eq(a.state.approve,1,'D source approve');eq(b.state.approve,0,'D C2 not approved');stale(()=>approve.approve());
 // F/G: exact cancelled stream still reaches C1, C2 independent.
 const c=synthetic();const cp=c.port.provider.send('cancel me');c.emit(event('stream-started'));c.emit(event('reasoning-delta','retained'));
 c.port.provider.cancel();c.operation.resolve();await cp;
 eq(c.p.getTransientSnapshot().invocations[0].state,'stream-cancelled','G exact F1 terminal');eq(c.p.getTransientSnapshot().invocations[0].reasoningText,'retained','G retained reasoning');eq(b.state.cancel,0,'F C2 uncancelled');
 // H: diagnostic result source-owned, or rejected on source invalidation.
 const diagnostic=a.port.diagnostics.refresh();a.diagnostic.resolve({source:'C1'});eq(await diagnostic,{source:'C1'},'H source result survives selection change');
 const d=synthetic(),lateDiagnostic=d.port.diagnostics.refresh().catch(e=>e.code);O.dispose(d.handle);d.diagnostic.resolve({source:'old'});eq(await lateDiagnostic,'CONVERSATION_OWNER_STALE','H stale diagnostic rejected');
 // B/K: captured listener, promise and command all fail closed after replacement.
 const delayed=synthetic(),late=delayed.port.provider.send('old').catch(e=>e.code),listener=delayed.listeners[0],review=delayed.port.confirmation.captureReviewCommands();
 delayed.emit(event('stream-started'));delayed.emit(event('reasoning-delta','before disposal'));
 const frozen=JSON.stringify(delayed.p.getSnapshot()),frozenTransient=JSON.stringify(delayed.p.getTransientSnapshot());O.dispose(delayed.handle);
 for(const type of ['reasoning-delta','text-delta','stream-completed','stream-failed','stream-cancelled'])listener(event(type,'LATE'));
 delayed.operation.resolve();eq(await late,'CONVERSATION_OWNER_STALE','K stale completion');eq(JSON.stringify(delayed.p.getSnapshot()),frozen,'B no stale publication');stale(()=>review.approve());stale(()=>review.reject());stale(()=>delayed.port.provider.cancel());stale(()=>delayed.port.provider.send('no'));eq(JSON.stringify(b.p.getSnapshot()),bBefore,'K current untouched');
 eq(JSON.stringify(delayed.p.getTransientSnapshot()),frozenTransient,'B stale stream cannot finish an existing old invocation');
 const failed=synthetic(),failedOperation=failed.port.provider.send('fail');failed.emit(event('stream-started'));failed.emit(event('reasoning-delta','retained failure'));failed.emit(event('stream-failed'));failed.state.provider={state:'failed',errorCode:'PROVIDER_TIMEOUT'};failed.operation.reject(new Error('timeout'));await failedOperation.catch(()=>{});eq(failed.p.getTransientSnapshot().invocations[0].state,'stream-failed','A failure terminal source-bound');eq(JSON.stringify(b.p.getTransientSnapshot()),bTransient,'A failed C1 stream leaves C2 unchanged');O.dispose(failed.handle);
 b.operation.resolve();await bp;
 for(const t of [a,b,c])O.dispose(t.handle);
 // Real production Runtime/Owner/Driver/Provider: normal text and full Review chain.
 const r1=await real(),r2=await real();await r1.port.provider.send('Explain animation');eq(r1.owner.getAgentDriver().getSnapshot().terminal.outcome,'completed','L text terminal');eq(r2.p.getSnapshot().items.length,0,'L second bundle empty');
 await r1.port.provider.send('Set opacity to 60%');await r2.port.provider.send('Set opacity to 60%');
 const r2Review=r2.owner.getAgentDriver().getSnapshot().suspendedReview;const token=r1.port.confirmation.captureReviewCommands();await token.approve();
 eq(r1.state.mutations,1,'L source executes once');eq(r1.state.verifies,1,'L fresh Verify once');eq(r2.state.mutations,0,'D real C2 never mutates');eq(r2.owner.getAgentDriver().getSnapshot().suspendedReview,r2Review,'D exact real C2 Review retained');
 const invalid=r2.port.confirmation.captureReviewCommands();r2.close();stale(()=>invalid.approve());stale(()=>invalid.reject());r1.close();
 // Acceptance cleanup observation: a parsed but mismatched model value must remain blocked.
 const mismatch=await real();await mismatch.port.provider.send('Set opacity to 100%'); // fixture returns 60
 eq(mismatch.runtime.getProviderDiagnostics().intentReason,'target-mismatch','L wrong model target preserves Intent Gate');
 eq(mismatch.owner.getAgentDriver().getSnapshot().terminal.outcome,'blocked','L mismatch is source-owned blocked terminal');
 eq(mismatch.state.mutations,0,'L mismatched proposal never reaches Host');eq(mismatch.runtime.getConfirmationSurfaceState().state,'idle','L no Review for mismatched proposal');mismatch.close();
 // J/G: actual streaming while hidden, dispose/remount same model, cancel then next objective.
 const streams=[];const stream=await real({fetch:async(url)=>{let controller;const body=new ReadableStream({start(c){controller=c;}});streams.push({chunk(delta,finish=null){controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta,finish_reason:finish}]})+'\n\n'));},done(){controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));controller.close();}});return {status:200,redirected:false,url,headers:new Headers({'content-type':'text/event-stream'}),body};}});
 let v=view(stream);const pending=stream.port.provider.send('Explain animation');await flush();streams[0].chunk({reasoning_content:'before hide'});await flush();v.c.suspend();streams[0].chunk({reasoning_content:' while hidden'});await flush();
 eq(stream.p.getTransientSnapshot().invocations[0].reasoningText,'before hide while hidden','J no visible Surface required');v.c.dispose();v=view(stream);const before=stream.p.getTransientSnapshot();v.c.suspend();v.c.resume();eq(stream.p.getTransientSnapshot(),before,'J no duplicate ingestion on resume');
 stream.port.provider.cancel();await pending;eq(stream.p.getTransientSnapshot().invocations[0].state,'stream-cancelled','G real source cancel terminal');eq(stream.p.getTransientSnapshot().invocations[0].reasoningText,'before hide while hidden','G real retained reasoning');
 const next=stream.port.provider.send('Explain next');await flush();streams[1].chunk({content:'next answer'},'stop');streams[1].done();await next;eq(stream.owner.getAgentDriver().getSnapshot().terminal.outcome,'completed','L cancel then next');v.c.dispose();stream.close();
 // Actual main composition closure: replacement rejects old commands and preserves fresh model.
 const main=harness();main.context.__testHooks.initializeRuntime();await bootFlush();const oldOptions=main.calls.surfaceOptions;const oldPort=oldOptions.sourcePort;
 eq(oldOptions.runtime,undefined,'least privilege no Runtime bundle');eq(oldOptions.provider,oldPort.provider,'actual main uses bound send');
 vm.runInContext('coreBootstrapSnapshot = {generation:2,hostReady:true};',main.context);main.context.__testHooks.invalidateForCore(main.context.coreBootstrapSnapshot);main.context.__testHooks.initializeRuntime();await bootFlush();
 stale(()=>oldOptions.provider.send('stale'));stale(()=>oldOptions.confirmation.captureReviewCommands());eq(main.calls.surfaceOptions.presentation.getSnapshot().items.length,0,'K actual main replacement clean');
 // H actual main diagnostics publication: changed source without lifecycle reset.
 const mainSource=fs.readFileSync(require.resolve('../client/js/main.js'),'utf8');
 const prefix=mainSource.slice(0,mainSource.indexOf('    var Motion = {'));
 const da=synthetic(),db=synthetic();
 const ctx={CSInterface:function(){},VelaConversationOwnership:O,AETOOLBOX_DEBUG_REGISTRY:true};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(prefix+'\nvar panelShuttingDown=false; window.setDiagnosticSource=function(owner,handle){velaAgentRuntimeOwner=owner;velaConversationBinding={handle:handle};}; }());',ctx);
 function diagnosticOwner(t){const bound=O.readBinding(t.handle).agentOwner;return {...bound,getObservationRuntime:()=>({})};}
 ctx.setDiagnosticSource(diagnosticOwner(da),da.handle);const d1=ctx.VelaActiveCompositionDiagnostics.refresh();
 ctx.setDiagnosticSource(diagnosticOwner(db),db.handle);const d2=ctx.VelaActiveCompositionDiagnostics.refresh();
 db.diagnostic.reject({code:'OBSERVATION_PROVIDER_FAILED',capabilityErrorCode:'INVALID_OUTPUT'});await d2;
 const truth=JSON.stringify(ctx.VelaActiveCompositionDiagnostics.getState());da.diagnostic.resolve({});eq((await d1).status,'cancelled','H main rejects old source even without Core reset');eq(JSON.stringify(ctx.VelaActiveCompositionDiagnostics.getState()),truth,'H stale callback cannot clear C2 capability error');
 O.dispose(da.handle);O.dispose(db.handle);
 console.log(`PASS source-bound routing: ${count} assertions (A-L; real production bundles and main wiring)`);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
