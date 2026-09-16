# Vela 0.3.11-A2 — Conversation-owned Presentation

Status: **COMPLETE / SEALED — OFFLINE PASS / FINAL REAL-AE PASS**

Initial real AE: Cases 1–3 PASS; Case 4 exposed a latent cancellation reasoning terminal defect; Cases 5–6 were stopped. [A2-F1 repair and evidence](vela-0.3.11-a2-f1-cancellation-reasoning.md) records the production-path reproduction, minimal Runtime ordering repair, 88 focused assertions and 179/179 full regression PASS. Re-acceptance 4a–4c, Case 5 and Case 6 re-test PASS. The F1 report preserves the first Case 6 outer-response failure and UNKNOWN rejected field; this is not a claim of first-attempt success.

Branch: `codex/vela-0.3.11-a2-conversation-owned-presentation`. Date: 2026-09-06. Baseline: [A1 COMPLETE / SEALED](vela-0.3.11-a1-conversation-ownership.md). Frozen architecture amendment = **NONE**.

## A. Root cause

SurfaceController previously created PresentationModel inside mount. Consequently committed items, terminal bookkeeping and transient reasoning identity followed the view lifetime rather than the existing conversation. A1 identity alone did not preserve that truth across a replacement Surface.

## B. Exact production files changed

| File | Change |
| --- | --- |
| [velaConversationOwnership.js](../../client/js/vela/velaConversationOwnership.js) | Frozen exact presentation association; reject reuse by another record, including after disposal. |
| [main.js](../../client/js/main.js) | Create model at ready Runtime/conversation composition; inject the exact associated model into Surface. |
| [velaSurfaceController.js](../../client/js/vela/velaSurfaceController.js) | Require injected model; remove mount factory and local confirmation-terminal suppression. |
| [velaPresentationModel.js](../../client/js/vela/velaPresentationModel.js) | Own confirmation-terminal suppression; make repeated proposal-ready synchronization idempotent. |
| [index.html](../../client/index.html) | Unified frontend cache query `20260906-vela-0.3.11-a2-f1`. |

F1 additionally changes [velaRuntime.js](../../client/js/vela/velaRuntime.js) cancellation ordering only, as recorded in its report. No Host, Provider, Context, Authority, TaskPlan, JIT binding, Preflight, ExecutionAdapter, Verify or frozen architecture file changes.

## C. Ownership/lifetime contract

The composition root creates one fresh PresentationModel when publishing the conversation's ready Runtime. The immutable live binding contains exact AgentRuntimeOwner, Session, Runtime and PresentationModel references. No hot swap, id-string lookup/restore, copy-to-another-record or model reuse is provided. A module-local WeakSet rejects a previously claimed model without retaining it strongly. Duplicate browser evaluation retains the existing ownership namespace.

conversationId remains independent of presentationTurnId, terminalGeneration, transientSerial and reasoning invocation identities. Presentation state never grants authority. The model stores committed items, presentation bookkeeping and existing transient data, not executable Review authorization.

## D. Surface dependency

Surface receives `presentation` directly alongside the existing PresentationModel module's pure projection helpers. Missing injection fails dependency validation; there is no production or test-only factory fallback in Surface. Surface gets no conversation handle or trusted ownership bundle. Existing Runtime stream subscriptions stay in Surface; A3 routing is not implemented.

Two small synchronization changes are necessary for exact remount behavior. A repeated proposal-ready state previously appended a duplicate notice; it is now idempotent while already awaiting Review. The old-confirmation-terminal suppression bit must survive view recreation after a subsequent objective starts, so it follows the model. It has no authorization effect. Actual before/proposed Review data still comes from the existing runtime confirmation projection; A2 does not invent saved Review history.

## E. Conversation/Core disposal

Surface dispose unsubscribes and destroys views without resetting/disposal of the model. Another Surface can receive the same live model. Core replacement/shutdown retains A1's ownership invalidation order, then existing Surface/Runtime disposal. New conversation composition receives a new empty model; old references cannot be rebound as its truth. Invalidating ownership does not revoke ordinary held JavaScript references or persist their contents.

Panel reload is a new conversation, not transcript restoration. Surface absence does not acquire background streaming guarantees; lost deltas while unsubscribed remain an A3 concern.

## F. View-local state

Scroll position, DOM references/caches, reasoning expanded/userToggled disclosure state, composer DOM draft and layout/resize remain View-local. Active reasoning defaults open; terminal/cancel collapses it; new begin clears old raw reasoning. Recreating a View restores only model-held data, not manual disclosure or unsent draft. Existing experimental enablement remains Surface/session UI behavior; no new session-settings migration is included.

## G. Focused tests

[test-vela-conversation-presentation.js](../../scripts/test-vela-conversation-presentation.js): **38 assertions PASS**. Covers exact binding and reuse rejection, two Surface instances over one model, assistant/notice/error and confirmation terminal deduplication, turn continuity, streaming/cancelled reasoning reconstruction and next-begin cleanup, Review projection, view-local exclusion, stale disposed subscriptions, fresh Core replacement, actual main injection and duplicate browser loading.

[test-vela-conversation-ownership.js](../../scripts/test-vela-conversation-ownership.js): **74 assertions PASS**, preserving A1 ownership and immutable baseline comparisons. Existing fixtures now explicitly inject models: SurfaceController **239**, Surface **162**, bootstrap **31** assertions PASS. All related PresentationModel, TranscriptView, streaming/reasoning, multistep, persistent Surface, Runtime and Provider lifecycle suites are included in the full run.

## H. Full regression

`node scripts/run-all-tests.js`: **178/178 runnable suites PASS, 0 skipped**, including 90 Vela suites. Log: `.tmp-vela-a2-full.log`. The final four focused confirmation-terminal/dependency assertions were added after that full run started and separately passed in the 38-assertion focused run; production was unchanged thereafter.

Final checks PASS: syntax for all 9 changed/new JavaScript files, generated i18n freshness, project consistency, 51 local documentation links (including anchors), and git diff --check. No generated report rewrite is needed. Vela forward/reverse/forward checks passed **90/90 suites in each of three rounds**, each suite in a fresh Node process, including the final 38-assertion focused test. Log: `.tmp-vela-a2-order.log`. These order checks are offline evidence, not three real CEP runs.

Post-F1 full regression: **179/179 PASS, 0 skipped**; final focused rerun: cancellation **88**, A2 **38**, A1 **74** PASS. See the F1 report for current checks and real-AE evidence; the 178-suite/order results above are the pre-F1 baseline.

## I. Remaining UNKNOWNs

Actual A2 CEP/AE acceptance is **PASS**, including F1 cancellation repair and Case 6 re-test; it is not inherited from A1. The first Case 6 response failed outer-response validation; the exact invalid field remains **UNKNOWN**, and its same-prompt retry completed without production changes. See the F1 report for the failed trial and evidence limits. Exact private reference identity is proven by the production offline harness, without a new private diagnostics seam. A production Surface-only destruction/recreation path retaining Core/conversation is **NOT DIRECTLY REACHABLE** through current UI. Actual main recreation is tested by the existing offline harness; real AE exercised reachable tool-detail hide/Home resume only. See main's showRealToolDetail/showHomeView and initializeVelaSurfaceController.

No unresolved offline blocker or scope-expanding stop condition was found. Background inactive-surface stream delivery and cross-conversation command routing remain unimplemented, not claimed as verified.

## J. Targeted real-AE results — PASS (Case 6 re-test)

Use the actual panel loaded with the A2 cache query and ownership revision `vela-conversation-ownership-0.3.11-a2-v1`, the existing real local Provider and ordinary Review controls. Read existing Console/diagnostics automatically. Request native AE actions only when required. Do not add debug seams or test switching.

| Case | Acceptance evidence required | Status |
| --- | --- | --- |
| 1 — streaming/reasoning | Text-only objective streams reasoning/text and completes; ordinary collapse and terminal rendering; no production Console errors. | PASS |
| 2 — sequential objectives | Two objectives complete; first committed transcript remains; correct turn anchors, order and no duplicated terminals. | PASS |
| 3 — Review → Execute → Verify | Selected-layer supported opacity edit: no preapproval mutation, correct target, one intended commit, fresh Verify and normal Review/terminal presentation. | PASS |
| 4 — cancel → next | Cancel while active, settle; retained collapsed cancelled reasoning; next begin clears it and next objective completes without old stream contamination. | PASS |
| 5 — Surface lifecycle | Enter an existing tool detail then return Home in the same Core; committed presentation remains. Exact Surface-only reconstruction is NOT DIRECTLY REACHABLE in real UI; offline harness supplies that invariant. | PASS smoke; exact remount offline PASS |
| 6 — panel/Core replacement | Stop at pending Review, close/reopen panel: empty new conversation presentation, no old Review/authority/continuation recovery; new normal objective completes. Session-only Provider opt-in is re-enabled normally. New Review mutation completes with one Host commit and fresh Verify. | PASS on re-test; first response failure retained |

Cases 1–3 prior AE evidence remains valid: normal Provider request req_33580269a9fad6198c8f3adf4cae82b12625d3dc1d740d5b10bf224f9aed325d; sequential requests req_6e3f31073bbed45e1b14ecfc7536212d1cf066272fd18c92203e382ece95663d and req_18f7a8fdb991b2e73b9c12f5002dd25555e170702e2cd733edd491f4d3ec01a7 completed with retained first committed content and correct anchors. Case 3 layer 1 opacity 60 → 50, layer 2 stayed 60; preapproval readback 60/60, one Host commit req_e8473462a4df341cc994617c4d0dabf87092199e851d59428ccf2d6435cd5fa5, fresh Verify req_5687485f3ac8e17fd64a526b208f950073fb4f3c678a1ca74b14a07b04b86dc3 matched 50. No duplicate terminal or production Console error. Cases 4–6 detailed observations and request correlation are in the F1 report.

## K. Explicit confirmation

Production still has **exactly one conversation**. No persistence, switching, second conversation, background Agent continuation, A3 async source routing, history injection, draft/scroll persistence, scheduler, Observation Window, temporal understanding, Capability Model Generalization or Agent UI Completion. Streaming wire vocabulary and terminal-validation boundary are unchanged. Frozen architecture amendment = **NONE**.

A2 implementation and real-AE acceptance are complete; **COMPLETE / SEALED**, with the explicitly recorded Case 6 response-evidence limitation. A1 remains sealed. Exact next dependency: **0.3.11-A3 — Source-bound Async & Command Routing**; not started. No commit, push or merge.

## L. Formal seal reconciliation — 2026-09-06

A2 and its F1 reconciliation are **COMPLETE / SEALED**. Final real-AE Cases 1–6 PASS, with Case 4 passing after F1 and Case 6 passing on same-prompt retry. Acceptance evidence agrees with the ownership contract; no architectural conflict was found. Conversation composition owns the exact model, Surface requires explicit injection without a creation fallback, Surface disposal retains it, and Core replacement creates fresh presentation truth. Composer draft, scroll, DOM/ref caches, disclosure interaction state and layout/resize remain View-local.

The seal retains two evidence boundaries: exact same-live-conversation Surface disposal/recreation is **NOT DIRECTLY REACHABLE** through production AE UI and is proven by the production-focused harness; the first Case 6 HTTP 200 stream failed with **PROVIDER_RESPONSE_INVALID / outer-response**, the raw rejected response was not recovered and its exact rejected field is **UNKNOWN**. Agent failed closed without attempts or Host mutation; Runtime remained ready. Same-prompt retry succeeded, no reproducible Vela defect was established, and Provider validation was not modified. This is not a clean first-attempt PASS.

F1 is a **pre-existing/latent sealed-behavior regression surfaced during A2 acceptance**, repaired by restoring exact correlated cancellation terminal publication before retiring reasoning ownership. There is no model fallback or View lifecycle patch. The A1 seal is not reopened.

Formal seal changes only this report, the F1 report, PROJECT_STATE, HANDOFF and VELA_ROADMAP. No production or test source changes occur in this reconciliation. The completed 179/179 full regression (0 skipped) covers the final production state; final F1 88, A2 38 and A1 74 focused assertions also passed on that state. These regression results are reused rather than rerunning unchanged production for documentation-only seal work. Final reconciliation checks PASS: syntax for 12 changed/new JavaScript files, project consistency, generated i18n freshness, 64 local documentation links and git diff --check. SHA-256 comparison against the seal-entry snapshot confirms all tracked/untracked non-document source files remained unchanged. Overall 0.3.11 remains IN PROGRESS; A3 is not implemented.
