"use strict";
const assert=require('assert');
const {create,flush}=require('./fixtures/vela-trajectory-harness');
const {fixture}=require('./test-vela-surface-controller');
const P=require('../client/js/vela/velaPresentationModel').VelaPresentationModel;
const Surface=require('../client/js/vela/velaSurfaceController').VelaSurfaceController;
let count=0;function eq(a,b,label){assert.deepStrictEqual(a,b,label);count++;}
function nodes(n){return [n,...n.children.flatMap(nodes)];}
function frame(delta){return 'data: '+JSON.stringify({choices:[{delta,finish_reason:null}]})+'\n\n';}
async function setup(){
 const streams=[];
 const h=await create({baseline:process.env.VELA_CANCEL_BASELINE || undefined,fetch:async(url,input)=>{
  let controller;const body=new ReadableStream({start(c){controller=c;}});
  streams.push({controller,input,chunk(delta){controller.enqueue(new TextEncoder().encode(frame(delta)));},done(){controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));controller.close();}});
  return {status:200,redirected:false,url,headers:new Headers({'content-type':'text/event-stream'}),body};
 }});
 const p=P.create(),events=[];h.runtime.subscribePresentationEvents(e=>events.push(e));
 function view(){
  const stub=fixture();stub.controller.dispose();const e=stub.elements;
  const provider={check:async c=>({ready:true,modelId:c.model}),send:message=>h.owner.startObjective({message,endpoint:'http://127.0.0.1:1234',model:'m'}),cancel:()=>h.owner.cancelObjective(),getState(){const d=h.owner.getAgentDriver().getSnapshot();if(d.state!=='idle'&&d.state!=='terminal')return {state:'pending'};if(d.terminal&&d.terminal.outcome==='cancelled')return {state:'cancelled'};return h.runtime.getProviderSurfaceState();}};
  const c=Surface.create({surface:{getElementsForTest:()=>e},provider,confirmation:{review:()=>h.runtime.reviewProviderProposal(),approve:()=>h.runtime.approveActiveCandidate(),reject:()=>h.runtime.rejectActiveCandidate(),getState:()=>h.runtime.getConfirmationSurfaceState()},runtime:h.runtime,presentation:p,PresentationModel:P,TranscriptView:require('../client/js/vela/velaTranscriptView').VelaTranscriptView,ComposerView:require('../client/js/vela/velaComposerView').VelaComposerView,ConfirmationView:require('../client/js/vela/velaConfirmationView').VelaConfirmationView,ActivationPolicy:require('../client/js/vela/velaActivationPolicy').VelaActivationPolicy,t:k=>k});
  c.mount();c.configureExperimental({endpoint:'http://127.0.0.1:1234',model:'m',acknowledged:true});
  return {c,e,async enable(){await c.enableExperimental();},send(message='Explain animation'){e.composer.value=message;e.composer.emit('input');e.actionSlot.children[0].emit('click');},cancel(){e.actionSlot.children[1].emit('click');},toggle(){return nodes(e.transcriptScroll).find(n=>n.className==='vela-transcript-transient-reasoning-toggle');}};
 }
 const v=view();await v.enable();return {h,p,events,streams,v,view};
}
async function finish(t){t.v.c.dispose();t.h.dispose();}
function transient(t){return t.p.getTransientSnapshot();}
function types(t){return t.events.map(e=>e.providerEvent.type);}
function terminalCount(t){return types(t).filter(x=>/stream-(cancelled|completed|failed)/.test(x)).length;}
(async()=>{
 for(const chunks of [[],['accepted reasoning'],['one','two','three']]){
  const t=await setup();t.v.send();await flush();eq(t.streams.length,1,'real Provider fetch active');
  for(const text of chunks){t.streams[0].chunk({reasoning_content:text});await flush();}
  if(chunks.length)eq(t.v.toggle().getAttribute('aria-expanded'),'true','active reasoning open');
  t.v.cancel();t.streams[0].chunk({reasoning_content:"IMMEDIATE LATE"});await flush();
  eq(t.h.runtime.getProviderDiagnostics().lastTerminalDisposition,'cancelled','Provider settled');
  eq(t.h.owner.getAgentDriver().getSnapshot().terminal.outcome,'cancelled','Agent settled');
  eq(transient(t).activeInvocationId,null,'inactive');eq(transient(t).invocations[0].reasoningText,chunks.join(''),'all accepted content retained');
  eq(transient(t).invocations[0].state,'stream-cancelled','cancel reaches model terminal');eq(terminalCount(t),1,'one correlated stream terminal');
  eq(t.events.every(e=>e.reasoningInvocationId===t.events[0].reasoningInvocationId&&e.runtimeGeneration===t.events[0].runtimeGeneration&&e.providerEvent.requestId===t.events[0].providerEvent.requestId&&e.providerEvent.generation===t.events[0].providerEvent.generation),true,'exact invocation/request/generation correlation');
  const before=transient(t),items=t.p.getSnapshot();t.streams[0].chunk({reasoning_content:'LATE',content:'LATE'});await flush();
  eq(transient(t),before,'immediate late chunk ignored');eq(t.p.getSnapshot(),items,'no extra terminal');
  t.h.owner.cancelObjective();t.v.c.refreshLocale();eq(terminalCount(t),1,'cancel idempotent');
  if(chunks.length){
   eq(t.v.toggle().getAttribute('aria-expanded'),'false','one terminal collapse');t.v.toggle().emit('click');t.v.c.refreshLocale();t.v.c.refreshLocale();
   eq(t.v.toggle().getAttribute('aria-expanded'),'true','manual reopen survives synchronization');
   t.v.c.dispose();t.v=t.view();await t.v.enable();eq(transient(t),before,'remount exact truth');eq(t.p.getSnapshot(),items,'remount no duplicate terminal');eq(t.v.toggle().getAttribute('aria-expanded'),'false','new View projects retained cancelled state');
   t.v.toggle().emit('click');t.v.c.refreshLocale();eq(t.v.toggle().getAttribute('aria-expanded'),'true','new View manual reopen retained');
  }else eq(t.v.toggle(),undefined,'no empty retained block');
  t.v.send('Explain easing');eq(transient(t).invocations.length,0,'next begin clears old transient');await flush();eq(t.streams.length,2,'next Provider starts');
  t.streams[0].chunk({reasoning_content:'OLD AFTER NEXT'});t.streams[0].done();await flush();eq(transient(t).invocations.length,1,'old invocation not resurrected');
  t.streams[1].chunk({reasoning_content:'fresh'});await flush();t.streams[1].chunk({content:'fresh answer'});t.streams[1].done();await flush();t.v.c.refreshLocale();
  eq(t.h.owner.getAgentDriver().getSnapshot().terminal.outcome,'completed','next completes without lifecycle blocked');eq(transient(t).invocations[0].reasoningText,'fresh','no old pollution');eq(transient(t).invocations[0].presentationTurnId,'presentation_turn_2','new turn anchor');
  eq(transient(t).invocations[0].state,'stream-completed','normal completion unchanged');eq(t.v.toggle().getAttribute('aria-expanded'),'false','completion collapse');
  eq(t.p.getSnapshot().items.filter(i=>i.kind==='assistant').map(i=>i.text),['fresh answer'],'one assistant terminal');await finish(t);
 }
 const failed=await setup();failed.v.send();await flush();failed.streams[0].chunk({reasoning_content:'before failure'});await flush();failed.streams[0].controller.error(new Error('transport failure'));await flush();failed.v.c.refreshLocale();
 eq(transient(failed).invocations[0].state,'stream-failed','stream failure unchanged');eq(failed.v.toggle().getAttribute('aria-expanded'),'false','failure collapse');eq(terminalCount(failed),1,'one failed terminal');await finish(failed);
 for(const execute of [false,true]){
  const t=await setup();t.v.send('Set opacity to 60%');await flush();const body=JSON.parse(t.streams[0].input.body),props=body.response_format.json_schema.schema.properties;
  t.streams[0].chunk({reasoning_content:'edit reasoning'});await flush();t.streams[0].chunk({content:JSON.stringify({protocol:props.protocol.enum[0],schemaVersion:props.schemaVersion.enum[0],requestId:props.requestId.enum[0],provider:'lmstudio',model:'m',envelope:{type:'localProposal',proposal:{capabilityId:'set-opacity-v1',params:{opacity:60}}}})});t.streams[0].done();await flush();t.v.c.refreshLocale();
  eq(t.h.runtime.getConfirmationSurfaceState().state,'confirmation-ready','real pending Review');
  if(execute){t.h.state.hold='execution';t.v.e.actionSlot.children[4].emit('click');await flush();eq(t.h.waiting.length,1,'execution held at Host boundary');}
  t.h.owner.cancelObjective();await flush();t.v.c.refreshLocale();const settled=t.p.getSnapshot();
  eq(transient(t).invocations[0].state,'stream-completed','Review/execution cancel never relabels completed stream');eq(terminalCount(t),1,'no duplicate stream terminal');
  t.h.owner.cancelObjective();t.v.c.refreshLocale();eq(t.p.getSnapshot(),settled,'idempotent presentation after Review/execution cancel');
  if(execute){t.h.release();await flush();t.v.c.refreshLocale();eq(t.p.getSnapshot(),settled,'late Host result adds no duplicate presentation');}await finish(t);
 }
 console.log('PASS cancellation reasoning: '+count+' assertions (production Owner/Driver/Runtime/Provider/Surface/View)');
})().catch(e=>{console.error(e);process.exitCode=1;});
