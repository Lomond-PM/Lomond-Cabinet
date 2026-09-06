# Vela 0.3.11-A2-F1 — Cancellation Reasoning Terminal Reconciliation

Status: COMPLETE / SEALED as part of A2 formal seal. OFFLINE PASS; final targeted real-AE re-acceptance PASS, with the recorded Provider-response evidence limitation below.

## Root cause and attribution

Real A2 Case 4 reached Provider/Agent cancelled but retained reasoning_5 stayed streaming, inactive and expanded (1021 chars). The production integration reproduction observed the same result before any production edit: Runtime subscribers received stream-started and reasoning-delta, but not stream-cancelled.

[Runtime](../../client/js/vela/velaRuntime.js) retired activeAgentReasoning and incremented agentReasoningGeneration before cancelling Provider. [ProviderController](../../client/js/vela/velaProviderController.js) synchronously invokes [Adapter](../../client/js/vela/velaProviderAdapter.js) cancellation, which synchronously publishes its terminal before aborting/settling. Runtime's dispatch guard rejects this event without the active exact invocation. [PresentationModel](../../client/js/vela/velaPresentationModel.js) terminal reconciliation clears active/text but does not change the retained invocation state. [TranscriptView](../../client/js/vela/velaTranscriptView.js) correctly relies on the state transition to collapse once.

Attribution: **pre-existing/latent sealed-behavior regression surfaced during A2 real-AE acceptance**. A2 branch base/HEAD is 823ac2d; A1 implementation/seal commit is c2b08f5. Runtime cancellation ordering and dispatch guard, model closeTransientForTerminal/stream terminal handling, and View collapse logic were not introduced or modified by A2. The same integration test loading immutable c2b08f5 Runtime/Provider/Owner sources fails at the cancelled-state assertion. Evidence: .tmp-vela-a2-f1-baseline-red.log. This does not reopen the historical A1 seal; F1 restores that behavior before the A2 seal.

## Minimal repair

F1 production changes only [velaRuntime.js](../../client/js/vela/velaRuntime.js) and [index.html](../../client/index.html) (unified cache query 20260906-vela-0.3.11-a2-f1).

Before: retire reasoning ownership → existing safety cleanup → Provider.cancel → rejected presentation terminal.

After: existing safety cleanup → Provider.cancel and synchronous exact correlated terminal publication → retire reasoning ownership before returning → remaining delegated cancellation.

No request/invocation/generation guard is weakened. Review barriers, production continuation, composer and logical admission cleanup stay in place. Late Adapter chunks remain rejected; the terminal model also rejects post-terminal events. No deferred cleanup timer or new async routing is added. Runtime event flow is sufficient; no model fallback or View patch is needed. Manual reopening continues to be View-local and survives ordinary rerenders.

## Offline evidence

[test-vela-cancellation-reasoning.js](../../scripts/test-vela-cancellation-reasoning.js): **88 assertions PASS**. Real production Owner/Driver/Runtime/ProviderController/Adapter/Surface/PresentationModel/TranscriptView over controlled network and Host fixtures. Tests cover required A–J: zero/one/multiple reasoning deltas; immediate and post-settlement late chunks; exact correlation; cancellation idempotence; new objective/turn; manual reopen; same-model remount; completed/failed stream; pending Review and held Host execution cancellation with late Host completion. The existing trajectory harness gained only an optional test fetch override; no production debug seam.

Full regression: **179/179 suites PASS, 0 skipped** (.tmp-vela-a2-f1-full.log), including A1 ownership 74, A2 presentation 38 and all Runtime/Provider/presentation/cancellation suites. The final three exact correlation assertions and immediate-late timing strengthening were separately executed after the full run began: 88 PASS. Production was unchanged. Syntax checks for all three F1 changed/new JavaScript files, project consistency, generated i18n freshness and git diff --check PASS.

## Real-AE sequence

1. 4a: active reasoning → cancel; Provider/Agent cancelled, retained content terminal/cancelled, automatic collapse, one cancellation item.
2. 4b: manually reopen → ordinary status synchronization; remains open.
3. 4c: next objective; old transient cleared, fresh turn anchor and completion, no late pollution/LIFECYCLE_BLOCKED.
4. Only after these pass, continue original Case 5 hide/resume and Case 6 actual panel close/reopen with fresh normal and mutation objectives.

Original A2 Cases 1–3 remain PASS; F1 changes the cancellation path only. Normal completion/failure and Review/execution are covered offline, with a fresh real mutation also required by Case 6. Exact same-conversation Surface dispose/recreate remains NOT DIRECTLY REACHABLE through production AE UI; production harness evidence is separate from hide/resume smoke.

## Boundaries and remaining risk

Real CEP acceptance is recorded below. Synchronous Provider.cancel terminal publication is the existing contract and is now covered through the full production chain. No second terminal authority is added. Production still has one conversation, no persistence, switching or A3 routing. Provider terminal validation, stream wire vocabulary/schema, Authority, Review, TaskPlan, JIT and execution/Verify semantics are unchanged. Frozen architecture amendment = NONE. No commit/push/merge.

## Real-AE results — 2026-09-06

Loaded F1 cache query confirmed, Runtime ready, real local Provider enabled using existing Settings controls. Page time origin 1788707077239.2; CEP target 1BE9949604983A0D6FB03B65C140899C. No new production diagnostics or private object read seam.

- **4a PASS**: reasoning_1 observed streaming/active/expanded (656 chars at sample). Cancellation settled Provider cancelled/PROVIDER_REQUEST_ABORTED and Agent cancelled/AGENT_DRIVER_CANCELLED, active null. Retained 1544 chars, state stream-cancelled, active false, header 输出流已取消, expanded false. Exactly one cancellation item. Request req_dac5a7798a9f9d4b5d5ad94eeaea58d5342b6e7653f2c638690c29928cbc3b6b.
- **4b PASS**: manual reopen followed by two composer input/status synchronizations remained expanded; same 1544 chars, one cancellation item.
- **4c PASS**: next begin immediately had zero transient segments and preserved prior committed items. New reasoning_3 appeared between its own user and assistant; stream-completed and Provider/Agent completed, no old reasoning contamination or LIFECYCLE_BLOCKED. Request req_fd195957db06b9529e61990cc2ce744129909ace4c71a02919b126bef01d5b0a; assistant ends F1-NEXT-OK.
- **Original Case 5 PASS**: actual Home pointerdown/up opened Selection Info detail (detail is-active, Home not active), then Home button resumed Surface. Same page lifetime; committed items exactly equal, unsent F1 VIEW DRAFT and manually expanded disclosure retained; Runtime ready, confirmation idle, no duplicate. Initial click-only probe did not activate the pointer-owned card route and is not counted as hide/resume evidence.
- **Original Case 6 PASS on re-test**: before native close/reopen, old page had six committed items and pending opacity Review (50 → 60), request req_2acff55d662ba49618189d9ef724d51384d39faf52fc69cc52f045d0399d677d. No approval; both layers read 50/60. User performed the native panel close/reopen. New CEP target A06ED0A994C3621A012C19C59C9C7D89, time origin 1788707739490.6: Runtime/loader ready, statusRevision 1, empty transcript and reasoning, Provider/confirmation idle, approve disabled, trajectory active/terminal null, authorization inactive and latest authority metadata null. Old Review/continuation did not recover. Session Provider opt-in was re-enabled through existing Settings.

Case 6 new text request req_8b63a02e0fc74af61bd3c143829135a0f3fbe60055d528623e035e230f7a98c9 completed Provider/Agent; assistant ends F1-REOPEN-OK, reasoning_2 stream-completed/inactive, correct user/reasoning/assistant order. This was a same-prompt retry after the recorded failure below, without Core reload or production changes.

New mutation request req_6f33f9b3f753a6dde675a6a8b9ab6d7d3b9453f22e973292a9c51bd4125cd5ee produced one Review notice, summary opacity 50 → 60. Independent read-only Host evidence before approval: selected layer 1 in 合成 1, layer 1 = 50, layer 2 = 60. Approval used the existing production button. Exactly one trajectory attempt, one Host commit req_d5a2778afe4fa6cb21d57f32be71e6f878d4122c3af2a2a59c08e472ae580435, followed by fresh committed-target Verify req_31d0b2bed0e39e8d87b5d20ed0726e494a732b22763bb01fe4a11b58033ce863: verified-match, expected/actual 60. Independent final readback 60/60; Agent completed/full, one completed step, one verified step, no active objective. UI local-proposal-handled/success, confirmation idle, authority inactive, reasoning_3 stream-completed/inactive. Prior committed items remain; one mutation notice and no duplicate assistant/notice/error. This also provides compact normal/Review regression smoke for F1.

### Case 6 failed first response and evidence limitation

The first new-page text objective failed: req_21b695b65d3d7448e713c40520d3706b95875b4ff8ccb9b3098d279db2bbd627, HTTP 200 streaming response, Provider failed / PROVIDER_RESPONSE_INVALID / outer-response; Agent blocked, no attempts or Host mutation, Runtime ready, confirmation idle, authority inactive. Reasoning reached stream-completed/inactive and collapsed; exactly one error item. Transport stream completion is distinct from validated Provider terminal completion, as required by the unchanged 0.3.9 boundary.

The exact rejected response field is **UNKNOWN**: the original raw response was not recovered from DevTools (fetch SSE EventStream table was empty; response copy/HAR did not yield an artifact), and LM Studio INFO logs only recorded stream completion. Inspection of unchanged Adapter validation identifies checks such as non-stop finish reason or empty assistant content, but neither is claimed as the observed cause. Existing Provider tests reject reasoning-only/empty final content. A same-prompt retry with DevTools exception inspection enabled completed normally; no repeatable Vela defect was established and no Provider/validation change was made. This is a retained failed trial, not a clean first-attempt pass or proof of model reliability. A2 ownership/presentation/replacement criteria passed on re-test; the diagnostic gap remains explicit in the formal seal.

Console during F1 re-acceptance: no new production or operator exceptions; the failed Provider trial produced a handled transcript error, not a Console exception. The earlier A2 acceptance's two operator Console errors remain historical and unrelated. Cases 1–3 retain their prior real-AE PASS. Cases 4a–4c, 5 and 6 re-test PASS: acceptance is complete and A2 is COMPLETE / SEALED with the explicit limitation above. Final focused rerun: cancellation 88, A2 presentation 38, A1 ownership 74 PASS; no further production fix was required.

Final Active Composition diagnostics refresh: available CompItem, 1920 × 1080, 50 fps, invocation inv_1_4, both lastErrorCode and capabilityErrorCode null. Runtime ready/error null, active objective null, confirmation idle, authorization inactive. Latest reasoning collapsed. Current page has three user items, one assistant, one mutation notice and the single retained failed-trial error; no duplicate presentation. DevTools exception pause was disabled after inspection. Project consistency, generated i18n freshness and diff whitespace checks passed after documentation reconciliation.
