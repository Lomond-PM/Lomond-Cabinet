"use strict";
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const P = require('../client/js/vela/velaPresentationModel').VelaPresentationModel;
const O = require('../client/js/vela/velaConversationOwnership');
const {fixture, flush} = require('./test-vela-surface-controller');
const {harness, flush: bootFlush} = require('./test-vela-surface-bootstrap-boundary');
let count=0;
function check(x,m){count++;assert.ok(x,m);}
function eq(a,b,m){count++;assert.deepStrictEqual(a,b,m);}
function own(p=P.create()) { const session={isClosed:()=>false}; const owner={isDisposed:()=>false,getSessionRuntime:()=>session}; return O.createOwnership({agentOwner:owner,session,runtime:{getStatus:()=>({state:'ready'})},presentation:p},b=>b.fill(7)); }
function event(type,text){return Object.freeze({type:'provider-stream-event',runtimeGeneration:1,reasoningInvocationId:'reasoning_1',presentationMode:'assistant-text',providerEvent:Object.freeze({type,text,requestId:'req_test',generation:1,providerId:'local',modelId:'model'})});}
function nodes(root){return [root,...root.children.flatMap(nodes)];}
async function run(){
 const Surface = require('../client/js/vela/velaSurfaceController').VelaSurfaceController;
 assert.throws(()=>Surface.create({}), /trusted presentation dependencies/);count++;
 for(const state of ['execution-completed','rejected','execution-failed']){
  const model=P.create();model.begin('confirmation');model.apply({state:'completed',text:'done'});
  const confirmation={state,errorCode:'CONTEXT_STALE'};model.applyConfirmation(confirmation);
  const before=model.getSnapshot();const view=fixture({presentation:model});view.setProvider({state:'completed',text:'done'});view.setConfirmation(confirmation);view.controller.mount();view.controller.dispose();
  const remount=fixture({presentation:model});remount.setProvider({state:'completed',text:'done'});remount.setConfirmation(confirmation);remount.controller.mount();
  eq(model.getSnapshot(),before,'confirmation terminal deduplicated across view creation: '+state);remount.controller.dispose();
 }
 const p=P.create(), h=own(p), binding=O.readBinding(h);
 check(binding.presentation===p,'exact conversation model'); check(O.readBinding(h)===binding,'stable binding');
 assert.throws(()=>own(p),e=>e.code==='CONVERSATION_PRESENTATION_INVALID');count++;
 assert.throws(()=>{binding.presentation=P.create();},TypeError);count++;
 for(const terminal of [{state:'completed',text:'answer'},{state:'cancelled'},{state:'failed',errorCode:'PROVIDER_TIMEOUT'},{state:'proposal-ready'}]){
  const model=P.create();own(model); model.begin('objective'); model.apply(terminal);
  const before=model.getSnapshot(); const a=fixture({presentation:model});a.setProvider(terminal);a.controller.mount();a.controller.dispose();
  const b=fixture({presentation:model});b.setProvider(terminal);b.controller.mount();b.controller.refreshLocale();
  eq(model.getSnapshot(),before,'remount preserves assistant/notice/error terminal without duplicates'); b.controller.dispose();
 }
 p.begin('first');p.applyPresentationEvent(event('stream-started'));p.applyPresentationEvent(event('reasoning-delta','reasoning retained'));
 const a=fixture({presentation:p,runtime:{}});a.setProvider({state:'pending'});a.controller.mount();
 const toggle=nodes(a.elements.transcriptScroll).find(n=>n.className==='vela-transcript-transient-reasoning-toggle');
 check(toggle.attributes['aria-expanded']==='true','active reasoning defaults open'); toggle.emit('click');
 a.elements.composer.value='view draft';a.elements.transcriptScroll.scrollTop=77;
 const saved=p.getTransientSnapshot();const late=a.presentationListeners[0];a.controller.dispose();late(event('reasoning-delta','LATE'));
 eq(p.getTransientSnapshot(),saved,'disposed subscription cannot mutate old model');
 const b=fixture({presentation:p});b.setProvider({state:'pending'});b.controller.mount();
 eq(p.getTransientSnapshot(),saved,'reasoning and turn survive remount');eq(b.elements.composer.value,'','new view has no inherited draft');
 check(!JSON.stringify(p.getSnapshot()).includes('view draft'),'draft not committed');
 check(!('scrollTop' in p.getSnapshot()),'scroll remains view-local');
 const newToggle=nodes(b.elements.transcriptScroll).find(n=>n.className==='vela-transcript-transient-reasoning-toggle');
 check(newToggle.attributes['aria-expanded']==='true','manual disclosure state not migrated');
 p.applyPresentationEvent(event('stream-cancelled'));p.apply({state:'cancelled'}); b.setProvider({state:'cancelled'});b.controller.refreshLocale();
 check(newToggle.attributes['aria-expanded']==='false','cancel collapses reasoning');
 const c=fixture({presentation:p});b.controller.dispose();c.setProvider({state:'cancelled'});c.controller.mount();
 eq(p.getTransientSnapshot().invocations[0].reasoningText,'reasoning retained','cancelled reasoning retained across view reconstruction');
 p.begin('second');p.clearConfirmationTerminal();eq(p.getTransientSnapshot().presentationTurnId,'presentation_turn_2','view recreation never resets turn serial');eq(p.getTransientSnapshot().invocations.length,0,'next begin clears previous raw reasoning');c.controller.dispose();
 const review={state:'confirmation-ready',beforeValue:60,proposedValue:70}; p.applyConfirmation(review);
 const r=fixture({presentation:p});r.setProvider({state:'pending'});r.setConfirmation(review);const snap=p.getSnapshot();r.controller.mount();
 eq(p.getSnapshot(),snap,'pending Review notice not duplicated');check(nodes(r.elements.actionSlot).some(n=>n.textContent==='t:vela.surfaceApprove'),'new view projects existing confirmation');r.controller.dispose();
 // Prior terminal suppression is presentation synchronization truth, not a view flag.
 const s=P.create();s.begin('old');s.apply({state:'completed',text:'done'});s.applyConfirmation({state:'execution-completed'});s.begin('next');s.clearConfirmationTerminal();
 const oldTerminal={state:'execution-completed'};const v=fixture({presentation:s});v.setProvider({state:'pending'});v.setConfirmation(oldTerminal);v.controller.mount();const before=s.getSnapshot();v.controller.dispose();
 const w=fixture({presentation:s});w.setProvider({state:'pending'});w.setConfirmation(oldTerminal);w.controller.mount();eq(s.getSnapshot(),before,'old confirmation terminal stays suppressed after new objective/remount');w.controller.dispose();
 O.dispose(h);assert.throws(()=>O.readBinding(h),e=>e.code==='CONVERSATION_OWNER_STALE');count++;
 assert.throws(()=>own(p),e=>e.code==='CONVERSATION_PRESENTATION_INVALID');count++;
 const fresh=O.readBinding(own()).presentation;check(fresh!==p,'replacement owns fresh model');eq(fresh.getSnapshot().items.length,0,'no old transcript leak');
 const source=fs.readFileSync(require.resolve('../client/js/vela/velaConversationOwnership'),'utf8');const page={};page.window=page;page.self=page;vm.createContext(page);vm.runInContext(source,page);const module=page.VelaConversationOwnership;vm.runInContext(source,page);check(page.VelaConversationOwnership===module,'duplicate browser load preserves namespace');
 const main=harness();main.context.__testHooks.initializeRuntime();await bootFlush();const h1=main.context.__testHooks.conversation().handle;const p1=main.context.window.VelaConversationOwnership.readBinding(h1).presentation;
 check(main.calls.surfaceOptions.presentation===p1,'actual main explicitly injects exact owned model');p1.begin('old committed');p1.apply({state:'completed',text:'old answer'});
 main.context.__testHooks.initializeRuntime();await bootFlush();check(main.context.window.VelaConversationOwnership.readBinding(h1).presentation===p1,'same generation retains model');
 vm.runInContext('velaSurfaceController.dispose(); velaSurfaceController = null;',main.context);main.context.__testHooks.initializeSurface();check(main.calls.surfaceOptions.presentation===p1,'actual root recreates Surface with same model');
 vm.runInContext('coreBootstrapSnapshot = {generation:2,hostReady:true};',main.context);main.context.__testHooks.invalidateForCore(main.context.coreBootstrapSnapshot);main.context.__testHooks.initializeRuntime();await bootFlush();
 const p2=main.calls.surfaceOptions.presentation;check(p2!==p1,'Core replacement injects distinct presentation');eq(p2.getSnapshot().items.length,0,'Core replacement empty');p1.begin('stale old view');eq(p2.getSnapshot().items.length,0,'old reference cannot replace new truth');
 check(!fs.readFileSync(require.resolve('../client/js/vela/velaSurfaceController'),'utf8').includes('PresentationModel.create()'),'no Surface factory fallback');
 await flush();console.log(`PASS conversation-owned presentation: ${count} assertions`);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
