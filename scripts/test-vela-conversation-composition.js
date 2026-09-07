"use strict";
const assert = require("assert");
const { prepare, loader, flush } = require("./fixtures/vela-trajectory-harness");
const { harness, flush: bootFlush } = require("./test-vela-surface-bootstrap-boundary");
const { fixture } = require("./test-vela-surface-controller");
const C = require("../client/js/vela/velaConversationComposition");
const O = require("../client/js/vela/velaConversationOwnership");
const P = require("../client/js/vela/velaPresentationModel").VelaPresentationModel;
const Surface = require("../client/js/vela/velaSurfaceController").VelaSurfaceController;
let count = 0;
function eq(a,b,label) { assert.deepStrictEqual(a,b,label); count++; }
function ok(a,label) { assert.ok(a,label); count++; }
function throws(fn,code) { assert.throws(fn,e=>e.code===code); count++; }
function deferred() { let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; }
function make(options={}) {
 const load=loader(), bundles=[], associations=new Map(); let selectedView=null, viewDisposals=0;
 const c=C.createComposition({Ownership:O,PresentationModel:P,fillRandomValues:b=>b.fill(3),getConfig:()=>({endpoint:"http://127.0.0.1:1234",model:"m"}),
  createOwner() { const h=prepare({...options,load,sharedState:bundles[0]&&bundles[0].state});bundles.push(h);return h.owner; },
  createRuntime(session) { const h=bundles.find(b=>b.owner.getSessionRuntime()===session);if(options.failAt===bundles.length) return {...h.runtime,initialize:()=>Promise.reject({code:"INJECTED_INIT_FAILURE"})};return h.runtime; },
  unbindSurface() { if(selectedView) {selectedView.dispose();selectedView=null;viewDisposals++;}if(options.onUnbind)options.onUnbind(); },
  onSelectionChanged(record,a) { if(!a)return; associations.set(record,a); const f=fixture();f.controller.dispose(); selectedView=Surface.create({surface:{getElementsForTest:()=>f.elements},sourcePort:a.sourcePort,provider:a.sourcePort.provider,confirmation:a.sourcePort.confirmation,presentation:a.presentation,PresentationModel:P,TranscriptView:require('../client/js/vela/velaTranscriptView').VelaTranscriptView,ComposerView:require('../client/js/vela/velaComposerView').VelaComposerView,ConfirmationView:require('../client/js/vela/velaConfirmationView').VelaConfirmationView,ActivationPolicy:require('../client/js/vela/velaActivationPolicy').VelaActivationPolicy,t:k=>k,agentProjection:a.sourcePort.agentProjection,authority:a.sourcePort.authority});selectedView.mount(); }
 });
 return {c,bundles,associations,get viewDisposals(){return viewDisposals;}};
}
async function run() {
 // A/B: actual factory bundles share one module namespace and one Host world.
 let h=make();const a=await h.c.createRecord(),b=await h.c.createRecord(),d=await h.c.createRecord();
 const pa=h.c.getSourcePort(a),pb=h.c.getSourcePort(b),pd=h.c.getSourcePort(d);
 eq(h.c.getRecords().length,3,"B collection is not a two-slot container");ok(a.conversationId!==b.conversationId,"A A1 correlation IDs distinct");
 h.c.select(a);h.c.select(b);const aa=h.associations.get(a),ab=h.associations.get(b);
 ["handle","agentOwner","session","runtime","presentation","sourcePort"].forEach(k=>ok(aa[k]!==ab[k],"A distinct "+k));
 ok(Object.isFrozen(aa)&&Object.isFrozen(a),"A immutable association and opaque record");eq(Object.keys(a),["conversationId"],"no exposed trusted bundle");
 throws(()=>h.c.select(a.conversationId),"CONVERSATION_RECORD_STALE");throws(()=>h.c.getSourcePort({conversationId:a.conversationId}),"CONVERSATION_RECORD_STALE");
 throws(()=>h.c.getSourcePort(aa.handle),"CONVERSATION_RECORD_STALE");
 // H/L: a real live grant and Observation in A never seed B or a newly created record.
 await pa.authority.grant();ok(pa.authority.getState().active,"L positive-control grant active in A");eq(pb.authority.getState().active,false,"L B does not inherit A grant");
 const grantSibling=await h.c.createRecord();eq(h.c.getSourcePort(grantSibling).authority.getState().active,false,"L fresh record does not inherit existing grant");h.c.disposeRecord(grantSibling);await pa.authority.revoke();
 await pa.diagnostics.refresh();ok(h.bundles[0].owner.getObservationRuntime().getContextSnapshot(),"L A owns current Observation context");eq(h.bundles[1].owner.getObservationRuntime().getContextSnapshot(),null,"L B has no inherited current context");
 // C/D/K: both Drivers and deterministic environments begin with identical local serials.
 await pa.provider.send("Explain animation");const aSnapshot=pa.presentation.getSnapshot();
 eq(pb.presentation.getSnapshot().items.length,0,"C second presentation empty");eq(pb.provider.getState().state,"idle","C Provider terminal not inherited");
 eq(h.bundles[1].owner.getAgentDriver().getSnapshot().state,"idle","C second Driver idle");
 await pb.provider.send("Explain keyframes");
 eq(h.bundles[0].owner.getAgentDriver().getSnapshot().objectiveId,h.bundles[1].owner.getAgentDriver().getSnapshot().objectiveId,"K identical local objective IDs");
 eq(JSON.parse(h.bundles[0].wires[0]).messages.length,JSON.parse(h.bundles[1].wires[0]).messages.length,"C no extra inherited transcript context");
 eq(h.c.getAdmissionState().busy,false,"G terminal releases");h.c.select(a);h.c.select(b);h.c.select(a);
 eq(h.c.getSourcePort(a).presentation,aa.presentation,"D exact model retained");eq(pa.presentation.getSnapshot(),aSnapshot,"D roundtrip no duplicate terminal ingestion");
 ok(h.viewDisposals>=4,"D real Surface unbind/remount");
 // H/L/M: Review waits despite send promise resolving. Execute+Verify remain held.
 await pa.provider.send("Set opacity to 60%");eq(h.bundles[0].owner.getAgentDriver().getSnapshot().state,"awaiting-review","H real pending Review");
 ok(h.c.getAdmissionState().busy,"H Review retains gate");eq(pb.confirmation.getState().state,"idle","L no Review inheritance");
 const before={req:h.bundles[1].requests.length,wires:h.bundles[1].wires.length,p:pb.presentation.getSnapshot(),driver:h.bundles[1].owner.getAgentDriver().getSnapshot()};
 throws(()=>pb.provider.send("Explain blocked"),"CONVERSATION_OBJECTIVE_BUSY");throws(()=>pa.provider.send("Same record blocked"),"CONVERSATION_OBJECTIVE_BUSY");
 eq(h.bundles[1].requests.length,before.req,"F no rejected Host access");eq(h.bundles[1].wires.length,before.wires,"F no rejected Provider request");eq(pb.presentation.getSnapshot(),before.p,"F no rejected presentation.begin");eq(h.bundles[1].owner.getAgentDriver().getSnapshot(),before.driver,"F no rejected Agent beginTurn");
 throws(()=>h.c.disposeRecord(a),"CONVERSATION_RECORD_ACTIVE");
 h.bundles[0].state.hold="verify";const approval=pa.confirmation.captureReviewCommands().approve();await flush();
 ok(h.c.getAdmissionState().busy,"H Verify holds gate");eq(h.bundles[0].state.opacity,60,"M shared Host mutated");throws(()=>pb.provider.send("During verify"),"CONVERSATION_OBJECTIVE_BUSY");
 h.bundles[0].release();await approval;h.bundles[0].state.hold=null;eq(h.c.getAdmissionState().busy,false,"G verified release");
 await pb.provider.send("Set opacity to 60%");await pb.confirmation.captureReviewCommands().approve();eq(h.bundles[1].owner.getAgentDriver().getSnapshot().terminal.outcome,"completed","M fresh second observation detects already satisfied");
 eq(h.bundles[1].state.mutations,1,"M no duplicate mutation");ok(h.bundles[1].events.includes("capturePropertyValues"),"M C2 fresh Host capture");ok(pb.confirmation.getState().state!=="confirmation-ready","L second objective no inherited pending Review");
 // Independent, selected and entire Core disposal.
 h.c.select(b);h.c.disposeRecord(a);ok(pb.isLive()&&pd.isLive(),"N siblings live");throws(()=>pa.provider.cancel(),"CONVERSATION_OWNER_STALE");throws(()=>h.c.select(a),"CONVERSATION_RECORD_STALE");
 h.c.disposeRecord(b);eq(h.c.getSelected(),null,"O selected disposal explicitly selects null");ok(pd.isLive(),"O unselected sibling retained");
 h.c.dispose();ok(h.bundles.every(x=>x.owner.isDisposed()&&x.runtime.getStatus().disposed),"P ALL actual owners/runtimes disposed");throws(()=>pd.provider.send("late"),"CONVERSATION_OWNER_STALE");
 const fresh=make();await fresh.c.createRecord();eq(fresh.c.getRecords().length,1,"P fresh Core seeds no old records");throws(()=>fresh.c.select(d),"CONVERSATION_RECORD_STALE");fresh.c.dispose();
 // E/I/J: real delayed stream, hidden publication, cancellation settlement, stale chunks.
 const streams=[];h=make({fetch:async url=>{let controller;const body=new ReadableStream({start(c){controller=c;}});streams.push({chunk(delta,finish=null){try {controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta,finish_reason:finish}]})+'\n\n'));}catch(_){}},done(){try{controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));controller.close();}catch(_){}}});return {status:200,redirected:false,url,headers:new Headers({'content-type':'text/event-stream'}),body};}});
 const r1=await h.c.createRecord(),r2=await h.c.createRecord(),p1=h.c.getSourcePort(r1),p2=h.c.getSourcePort(r2);h.c.select(r1);
 const run1=p1.provider.send("Explain animation");await flush();streams[0].chunk({reasoning_content:"first"});await flush();h.c.select(r2);streams[0].chunk({reasoning_content:" hidden"});await flush();
 eq(p1.presentation.getTransientSnapshot().invocations[0].reasoningText,"first hidden","E unselected source keeps ingesting");eq(p2.presentation.getSnapshot().items.length,0,"E selected sibling stays empty");
 throws(()=>p2.provider.send("Blocked"),"CONVERSATION_OBJECTIVE_BUSY");p1.provider.cancel();throws(()=>p2.provider.send("Before settlement"),"CONVERSATION_OBJECTIVE_BUSY");await run1;
 eq(p1.presentation.getTransientSnapshot().invocations[0].state,"stream-cancelled","I F1 terminal reconciled");
 const run2=p2.provider.send("Explain other");await flush();streams[0].chunk({content:"late"},"stop");streams[0].done();await flush();
 eq(h.c.getAdmissionState().conversationId,r2.conversationId,"J old late stream cannot release later holder");throws(()=>p1.provider.send("Still blocked"),"CONVERSATION_OBJECTIVE_BUSY");
 streams[1].chunk({content:"second answer"},"stop");streams[1].done();await run2;h.c.select(r1);eq(p1.presentation.getTransientSnapshot().invocations[0].reasoningText,"first hidden","E cancelled view roundtrip retained");h.c.dispose();
 // I: cancel while a real Host Verify callback is still pending, not merely a stream.
 h=make();const hv1=await h.c.createRecord(),hv2=await h.c.createRecord(),hp1=h.c.getSourcePort(hv1),hp2=h.c.getSourcePort(hv2);
 await hp1.provider.send("Set opacity to 60%");h.bundles[0].state.hold="verify";
 const verify=hp1.confirmation.captureReviewCommands().approve();await flush();hp1.provider.cancel();await flush();
 throws(()=>hp2.provider.send("Before Host settlement"),"CONVERSATION_OBJECTIVE_BUSY");
 h.bundles[0].release();await verify;eq(h.c.getAdmissionState().busy,false,"I cancel release after outstanding Host continuation");h.bundles[0].state.hold=null;
 await hp2.provider.send("After cancel");eq(h.c.getAdmissionState().busy,false,"I handoff succeeds after settled cancelled Verify");h.c.dispose();
 // H: rejected Review also terminates the reservation.
 h=make();const rr=await h.c.createRecord(),rp=h.c.getSourcePort(rr);await rp.provider.send("Set opacity to 60%");await rp.confirmation.captureReviewCommands().reject();eq(h.c.getAdmissionState().busy,false,"H rejected Review releases");h.c.dispose();
 // A two-step logical objective keeps admission across intermediate Verify and next Review.
 h=make();const lr=await h.c.createRecord(),ls=await h.c.createRecord(),lp=h.c.getSourcePort(lr);
 await lp.provider.send("把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test");await lp.confirmation.captureReviewCommands().approve();
 eq(h.bundles[0].owner.getAgentDriver().getSnapshot().state,"awaiting-review","H logical intermediate Verify advances to next Review");throws(()=>h.c.getSourcePort(ls).provider.send("Between steps"),"CONVERSATION_OBJECTIVE_BUSY");
 await lp.confirmation.captureReviewCommands().approve();eq(h.c.getAdmissionState().busy,false,"G logical final Verify releases");h.c.dispose();
 // Provider failure is a terminal boundary and does not leak the reservation.
 h=make({fetch:async()=>{throw new Error("injected network failure")}});const er=await h.c.createRecord();await h.c.getSourcePort(er).provider.send("Explain failure");eq(h.bundles[0].owner.getAgentDriver().getSnapshot().state,"terminal","Q actual Provider failure terminal");eq(h.c.getAdmissionState().busy,false,"Q failed Provider releases");h.c.dispose();
 // Q rollback after actual Runtime creation; failed sibling cannot steal the gate.
 h=make({failAt:2});const valid=await h.c.createRecord();await assert.rejects(h.c.createRecord(),e=>e.code==="INJECTED_INIT_FAILURE");count++;
 ok(h.c.getSourcePort(valid).isLive(),"Q C1 unaffected");ok(h.bundles[1].owner.isDisposed()&&h.bundles[1].runtime.getStatus().disposed,"Q candidate fully disposed");eq(h.c.getRecords().length,1,"Q no partial record");eq(h.c.getAdmissionState().busy,false,"Q no gate leak");h.c.dispose();
 // Failed-start sync exception must release before Driver begin; pending Core creation is revoked.
 const pendingInit=deferred();let pendingBundle;const pendingComposition=C.createComposition({Ownership:O,PresentationModel:P,fillRandomValues:b=>b.fill(2),getConfig:()=>{throw {code:"CONFIG_FAILED"};},createOwner(){pendingBundle=prepare();return pendingBundle.owner;},createRuntime(){return {...pendingBundle.runtime,initialize:()=>pendingInit.promise};}});
 const creating=pendingComposition.createRecord();pendingComposition.dispose();pendingInit.resolve();await assert.rejects(creating,e=>e.code==="CONVERSATION_COMPOSITION_DISPOSED");count++;ok(pendingBundle.owner.isDisposed()&&pendingBundle.runtime.getStatus().disposed,"P pending bundle disposed before late initialize resolves");
 let failedBundle;const failed=C.createComposition({Ownership:O,PresentationModel:P,fillRandomValues:b=>b.fill(2),getConfig:()=>{throw {code:"CONFIG_FAILED"};},createOwner(){failedBundle=prepare();return failedBundle.owner;},createRuntime:()=>failedBundle.runtime});
 const fr=await failed.createRecord();throws(()=>failed.getSourcePort(fr).provider.send("error"),"CONFIG_FAILED");eq(failed.getAdmissionState().busy,false,"Q synchronous failed start releases reservation");eq(failedBundle.owner.getAgentDriver().getSnapshot().state,"idle","Q failed config never starts Driver");failed.dispose();
 // R actual main bootstrap retains one default record and all-record Core cleanup.
 const bootOptions={};const main=harness(bootOptions);await main.context.__testHooks.initializeRuntime();await bootFlush();const composition=main.context.velaConversationComposition;
 eq(composition.getRecords().length,1,"R production seeds exactly one");bootOptions.agentOwnerFailure=true;await assert.rejects(composition.createRecord(),e=>e.code==="AGENT_RUNTIME_UNAVAILABLE");count++;eq(main.context.__testHooks.agentError(),null,"Q failed C2 creation cannot publish an Agent error into selected C1");bootOptions.agentOwnerFailure=false;const old=main.calls.surfaceOptions.sourcePort;const extra=await composition.createRecord();composition.select(extra);
 eq(main.context.velaConversationBinding.record,extra,"R selected aliases follow composition");eq(main.calls.agentOwnerCreate,3,"R production factory creates fresh Owner");
 main.context.__testHooks.disposeBundle();eq(main.calls.agentOwnerDispose,2,"P main disposes unselected Owner too");eq(main.calls.runtimeDispose,2,"P main disposes unselected Runtime too");eq(old.isLive(),false,"P old default port revoked");
 console.log(`PASS multi-record runtime composition: ${count} assertions (A-R; actual factories, shared modules/Host, real Surface and main bootstrap)`);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
