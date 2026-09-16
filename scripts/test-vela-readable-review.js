"use strict";
const assert = require("assert");
const {fixture} = require("./test-vela-surface-controller");
const View = require("../client/js/vela/velaConfirmationView").VelaConfirmationView;
const ports = require("../client/js/vela/velaReviewRuntimePort");
const protocol = require("../client/js/vela/velaProtocol").createProtocol(require("./velaNodeRuntime"));
const harness = require("./fixtures/vela-execution-facts-harness");
const ownership = require("../client/js/vela/velaConversationOwnership");
const Presentation = require("../client/js/vela/velaPresentationModel").VelaPresentationModel;
let assertions = 0;
function check(value, label) { assertions++; assert.ok(value, label); }
function same(actual, expected, label) { assertions++; assert.deepStrictEqual(actual, expected, label); }
function target(revision=1, layer=2) { return {compId:"ae-project-1-item-1",layerId:"ae-project-1-item-1-layer-"+layer,revision}; }
function active(extra={}) {return {state:"active",reviewId:"review_a",revision:1,target:target(),stepNumber:1,stepCount:2,capabilityId:"set-layer-name-v1",valueKind:"string",beforeValue:" A\n😀<b> ",proposedValue:" A😀<b> changed ",outcome:null,...extra};}
async function run() {
    let current=active(), calls=[];
    const port=ports.createObjectiveReviewRuntimePort({protocol,ownerPort:{getProjection:()=>current,resolve:input=>{calls.push(input);return input;}}});
    let p=port.getProjection();
    check(p.canApprove && Object.isFrozen(p.target),"bounded target is frozen and readable");
    same(p.target,{compId:target().compId,layerId:target().layerId},"only scalar target projection, no binding");
    current.target.layerId="bad";
    same(p.target.layerId,target().layerId,"input independence");
    for(const bad of [null, target(2), {...target(),compId:"ae-project-1-item-2"}, {...target(),layerId:"same name"}]) {
        current=active({target:bad});
        check(!port.getProjection().canApprove,"missing/mismatched target is not approvable");
        assertions++;assert.throws(()=>port.resolve("approved"),e=>e.code==="CANDIDATE_STATE_INVALID");
        port.resolve("rejected");
    }
    current=active({beforeValue:null,capabilityId:"set-opacity-v1",valueKind:"number",proposedValue:60});
    check(!port.getProjection().canApprove,"missing baseline is blocked");
    current=active({beforeValue:null});check(!port.getProjection().canApprove,"missing string baseline is blocked but reject remains available");
    assertions++;assert.throws(()=>port.resolve("approved"),e=>e.code==="CANDIDATE_STATE_INVALID");port.resolve("rejected");
    current=active({stepNumber:null});check(!port.getProjection().canApprove,"unknown scope is blocked");
    current=active();p=port.getProjection();
    const state={...p,state:"confirmation-ready",approvalScope:"current-step"};
    const test=fixture(), slot=test.elements.actionSlot;
    const realm={window:{}};require("vm").runInNewContext(require("fs").readFileSync(require("path").join(__dirname,"../client/js/i18n.js"),"utf8"),realm);
    const usedKeys=new Set();
    function translate(key,args){usedKeys.add(key);return key+(args?JSON.stringify(args):"");}
    let approved=0,rejected=0;
    const view=View.create({actionSlot:slot,t:translate,onApprove:()=>approved++,onReject:()=>rejected++});
    const e=view.getElementsForTest();
    const before=" <img src=x onerror=alert(1)>中😀\n"+"same prefix ".repeat(12)+" A ";
    const proposed=before.replace("\n", "\\n").slice(0,-3)+" B ";
    const capabilities=require("../client/js/vela/velaCapabilityContracts");
    same(capabilities.validateCapabilityParams(capabilities.getRepresentationLocalProjection("set-layer-name-v1"),{name:proposed}).name,proposed,"long proposed value obeys existing capability budget");
    view.render("confirm",{...state,beforeValue:before,proposedValue:proposed});
    check(e.details.hidden && !e.approve.disabled,"full details optional, not an authorization ritual");
    e.toggle.emit("click");
    same(e.toggle.getAttribute("aria-expanded"),"true","expanded state");
    same(e.before.textContent,JSON.stringify(before),"complete before exact escaped notation");
    same(e.proposed.textContent,JSON.stringify(proposed),"complete proposed retains suffix and whitespace");
    same(e.before.children.length,0,"HTML-looking string creates no elements");
    check(e.target.textContent.includes(target().layerId)&&e.scope.textContent.includes('"total":2'),"target identity and scope directly visible");
    view.render("confirm",{...state,beforeValue:before,proposedValue:proposed});view.refreshLocale();
    check(!e.details.hidden,"same review refresh and locale preserve expansion");
    same(approved,0,"view-only operations never approve");
    view.render("confirm",{...state,reviewId:"review_b",revision:2});
    check(e.details.hidden&&!e.before.textContent.includes("same prefix"),"new review clears prior text and expansion");
    view.render("confirm",{...state,target:null,canApprove:false});e.approve.emit("click");
    check(e.approve.disabled&&!e.reject.disabled&&!e.problem.hidden&&approved===0,"missing target blocks actual click and leaves Reject");
    e.reject.emit("click");same(rejected,1,"Reject still routed");
    view.render("confirm",{...state,capabilityId:"set-opacity-v1",valueKind:"number",beforeValue:20,proposedValue:60});
    e.toggle.emit("click");same(e.before.textContent,"20%","opacity unit");same(e.proposed.textContent,"60%","proposed unit");
    view.render("send",null);check(e.card.hidden&&e.before.textContent==="","cancel clears text");
    view.dispose();same(slot.children.length,0,"dispose removes view nodes");e.approve.emit("click");same(approved,0,"disposed handler inert");

    for(const key of usedKeys)for(const lang of ["en","zh-CN"])check(typeof realm.window.I18n.dictionaries[lang][key]==="string",lang+" defines actual rendered key "+key);

    for(const rename of [false,true]) {
        const h=await harness.create({opacity:20,rename,name:before});
        try {
            await h.start();const s=h.runtime.getConfirmationSurfaceState();const r=h.owner.getAgentDriver().getSnapshot().suspendedReview;
            check(s.canApprove,"actual production chain has readable review");same([s.reviewId,s.revision],[r.reviewId,r.revision],"actual review identity association");
            same(s.target,{compId:target().compId,layerId:target().layerId},"target from binding capture");
            same(s.beforeValue,rename?before:20,"baseline from same captured target");same(h.model.dispatches,0,"review itself has no mutation");
            h.model.selection=3;h.model.targets.get(3).name="misleading current label";
            same(h.runtime.getConfirmationSurfaceState(),s,"display remains captured when selection changes");
            await h.runtime.rejectActiveCandidate();same(h.model.dispatches,0,"reject no mutation");
        } finally {h.dispose();}
    }
    const h=await harness.create({opacity:20});
    try {
        await h.start(true);let s=h.runtime.getConfirmationSurfaceState();
        same([s.stepNumber,s.stepCount,s.approvalScope],[1,2,"current-step"],"first materialized step only");
        await h.runtime.approveActiveCandidate();s=h.runtime.getConfirmationSurfaceState();
        same([s.stepNumber,s.stepCount,s.capabilityId],[2,2,"set-layer-name-v1"],"second step requires its own review");
        same(h.model.dispatches,1,"first approval cannot dispatch second mutation");
        await h.runtime.rejectActiveCandidate();same(h.model.dispatches,1,"second rejection preserves first only");
    } finally {h.dispose();}
    const owned=await harness.create({opacity:20});
    let handle;
    try {
        handle=ownership.createOwnership({agentOwner:owned.owner,session:owned.owner.getSessionRuntime(),runtime:owned.runtime,presentation:Presentation.create()},bytes=>require("crypto").randomFillSync(bytes));
        const source=ownership.createSourcePort(handle,()=>({endpoint:"http://127.0.0.1:1234",model:"m"}));
        await owned.start();const s=source.confirmation.getState();
        const mismatched=source.confirmation.captureReviewCommands({...s,revision:s.revision+1});
        assertions++;assert.throws(()=>mismatched.approve(),e=>e.code==="CONVERSATION_REVIEW_STALE");
        same(owned.model.dispatches,0,"mismatched displayed revision cannot approve through actual source command");
        const old=source.confirmation.captureReviewCommands(s);await old.reject();
        await owned.start();
        assertions++;assert.throws(()=>old.approve(),e=>e.code==="CONVERSATION_REVIEW_STALE");
        same(owned.model.dispatches,0,"old commands cannot approve replacement review");
        const fresh=source.confirmation.captureReviewCommands(source.confirmation.getState());await fresh.reject();
    } finally {if(handle)ownership.dispose(handle);owned.dispose();}
    console.log("Readable Review: "+assertions+" assertions PASS");
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
