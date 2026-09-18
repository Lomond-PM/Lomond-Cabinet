/* Runtime capture in the existing mocked Provider/Host harness. Never loads AE. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const harness = require('../fixtures/vela-execution-facts-harness');
async function capture() {
  const fixtures = {};
  async function scenario(name, options, run) {
    const h = await harness.create({opacity:20, ...options});
    try {
      await h.start(true);
      const reviews=[JSON.parse(JSON.stringify(h.runtime.getConfirmationSurfaceState()))];
      const review=h.review.bind(h);h.review=async(...args)=>{const current=h.runtime.getConfirmationSurfaceState();if(current.reviewId&&!reviews.some(r=>r.reviewId===current.reviewId))reviews.push(JSON.parse(JSON.stringify(current)));return review(...args);};
      await run(h);
      const ownership=h.load('velaConversationOwnership');
      const handle=ownership.createOwnership({agentOwner:h.owner,session:h.owner.getSessionRuntime(),runtime:h.runtime,presentation:h.load('velaPresentationModel').VelaPresentationModel.create()},bytes=>bytes.fill(1));
      const source=ownership.createSourcePort(handle,()=>({endpoint:'http://127.0.0.1:1234',model:'m'}));
      const provider = source.provider.getState();
      const confirmation = source.confirmation.getState();
      const driver = h.owner.getAgentDriver().getSnapshot();
      fixtures[name] = JSON.parse(JSON.stringify({provider, confirmation, driver, reviews, trajectory:h.owner.getTrajectoryEvidence()}));
      ownership.dispose(handle);
      if (h.waiting.length) { h.release(); await harness.flush(); }
    } finally { h.dispose(); }
  }
  await scenario('review', {}, async()=>{});
  await scenario('executing', {}, async h=>{ h.state.hold='execution'; h.review(); await harness.flush(); });
  await scenario('partial', {}, async h=>{ await h.review(); await h.review('rejected'); });
  await scenario('rejected', {}, async h=>{ await h.review('rejected'); });
  await scenario('cancelled', {}, async h=>{ await h.owner.cancelObjective({settleInFlight:true}); });
  await scenario('failed', {verifyMode:'mismatch'}, async h=>{ await h.review(); });
  await scenario('completed', {}, async h=>{ await h.review(); await h.review(); });
  assert.equal(fixtures.review.confirmation.canApprove,true);
  return fixtures;
}
module.exports = {capture};
if (require.main===module) capture().then(data=>{
  fs.writeFileSync(path.resolve(__dirname,'../../client/reference/src/vela-fixtures.json'),JSON.stringify(data,null,2)+'\n');
  console.log(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,{provider:v.provider.state,confirmation:v.confirmation.state,driver:v.driver.state}])));
}).catch(e=>{console.error(e);process.exitCode=1;});
