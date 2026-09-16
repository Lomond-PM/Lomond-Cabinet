# Vela 0.3.11-A5 — Minimal Conversation Selection Surface

Status: **COMPLETE / SEALED**. Formal documentation seal: 2026-09-07. Baseline d2a624e, sealed A4:181/181 offline,93/93 each Vela order. No architecture amendment.

## Focused UI audit (before implementation)

- Shell: transcript/composer/controls grid; put a compact native select plus New/Close in a separate top row, using existing control tokens, not a sidebar. Native select supplies keyboard focus/selection behavior; label min-width0 and fixed action buttons support narrow layouts.
- Resize: include top-row measured height in existing resize minimum; keep status/settings/actions intact.
- View: SurfaceController disposal unsubscribes without cancelling Owner/Runtime. Same A2 model/source port can rebind. Draft currently lives in the reused shell textarea, so save/restore bounded strings in a Core UI Map keyed by opaque record; never migrate DOM/disclosure/scroll or Agent data.
- Sources: selected record from composition, active holder needs opaque-reference read-only projection, Provider/Review from selected A3 source. Diagnostics remain selected aliases with stale callback checks.
- A4 API supports transactional create/select/dispose and rollback. Add only read-only collection/admission notification and holder reference; no acquire/release semantic change, queue or ID-based trusted lookup.
- Composer currently couples editing/send permission. Add a separate send-blocked projection so an unselected-holder situation allows typing while disabling Send and new grant UI. A4 source guard remains authoritative.
- Experimental enablement was view-local. Rebinding reuses the user's Core-local enable intent but calls the existing readiness/enable path again; no copied readiness, grants or authority. New record data and draft remain empty.
- UI resource bound: one centralized MAX_LIVE_CONVERSATIONS=8, serialized UI creation, monotonic labels and deterministic preceding/next sibling close fallback. No final-record close.

No frozen architecture conflict found. The audit was followed by implementation and the validation below.


## A–K. Implementation contract

A. The focused audit above covers shell placement, resize, rebind, status, source ownership, existing tokens/i18n and the only A4 UI gaps.

B. The product now renders a native select, New (+), Close (×), and bounded feedback above the transcript. There is no sidebar or framework. The existing status, composer, Review and settings remain in their established slots.

C. Production files changed:

- client/js/vela/velaConversationSwitcher.js: new bounded UI controller.
- client/js/vela/velaConversationComposition.js: additive read-only getActiveRecord and subscribe; notifications after collection/selection/admission changes. Acquire, release, continuation and disposal guards are unchanged.
- client/js/main.js: Core UI lifetime, opaque-record draft save/restore, create/select wiring, selected view rebind, locale refresh and existing readiness recheck using Core-local user enable intent.
- client/js/vela/velaSurface.js, velaResizeController.js and client/css/velaSurface.css: compact header slot and measured fixed-height contribution.
- client/js/vela/velaComposerView.js and velaSurfaceController.js: separate typing from send eligibility; other-owner feedback and proactive new-grant blocking.
- client/js/vela/velaTranscriptView.js: remove owned DOM on view disposal; use the existing segment node when reasoning first arrives after text.
- client/js/i18n.js: English/Chinese labels and bounded feedback.
- client/index.html: switcher loading and synchronized A5 cache query.

Test changes: new scripts/test-vela-conversation-switcher.js; bootstrap fixture globals; transcript grid expectation; optional randomId injection at the trajectory harness environment boundary. The generated i18n report was regenerated, not edited manually.

D. Labels are monotonically assigned per Core: Conversation N / 对话 N. A private Map associates metadata with opaque records. Option positions only select captured opaque records; labels and internal conversation IDs have no lookup or authority capability. Deletion never renumbers survivors.

E. New invokes the A4 production factory, selects only after success and serializes pending creation. The A4 rollback retains the old selection/view on initialization failure and disposes the failed bundle. Fresh records inherit no model, transcript, Review, draft, grant or trajectory.

F. Selection saves the old draft, disposes only the old view binding, and binds the exact selected source/PresentationModel. Hidden Runtime/source ingestion continues. Selection does not cancel, transfer admission or copy committed events. Diagnostics follow selected aliases. Existing stale-source guards remain authoritative.

G. The active holder is a separate opaque-record projection. Its option gets a minimal Running suffix. Another selected record says “另一对话正在运行”; its composer remains editable, Send and new authority acquisition are blocked. The A4 CONVERSATION_OBJECTIVE_BUSY source guard remains independently enforced. Selection never releases the holder.

H. Drafts are bounded to 8192 characters in the private Core UI Map and textarea maximum length. They are not PresentationModel items, Session data, Provider history, observations or authority. They vanish on record/Core disposal. Disclosure retains existing view semantics; exact scroll restoration is not added.

I. Close rejects the holder and final record. Selected close chooses the preceding live creation-order sibling, or next when first, binds that sibling before disposing the target. Unselected quiescent close preserves selection. Failure reports a bounded error and continues to render composition truth. No automatic cancellation is introduced.

J. MAX_LIVE_CONVERSATIONS = 8 is centralized product policy. At capacity New is disabled, with visible localized feedback; forced controller invocation returns CONVERSATION_LIMIT_REACHED without allocation. Closing frees a slot. This is not a frozen architecture invariant.

K. Native select exposes selectedIndex and native keyboard interaction; select/New/Close have accessible labels, and Close/New have explanatory titles. A min-width:0 flexible label column leaves fixed buttons accessible. Existing resize minimum includes the header. Real narrow measurements are recorded below; no new typography/layout system or view-state store was introduced.

## L. Focused coverage

A5 suite: **66 assertions PASS**, using the actual composition, Owner/Runtime/source, PresentationModel, SurfaceController and switcher controls with simulated network/Host boundaries. The actual main closure is also exercised.

| Request coverage | Evidence |
| --- | --- |
| A/B/C initial, C2, C3 | Fresh exact production records, labels, controls and selected binding |
| D/E roundtrip and draft | Same model snapshot, no auto-commit, exact per-record draft restore |
| F/G streaming and busy | Hidden stream retained, sibling untouched, editable draft, disabled Send, forced UI click inert, forced source send typed busy |
| H/I Review and cancel | Same suspended Review object; one mutation/Verify; cancel settlement releases admission |
| J/K/L/M close | Unselected exact disposal, selected preceding fallback, active rejection without cancellation, last-record rejection |
| N/O bound and failure | Eight-record limit, no extra allocation, slot reuse, failed initialization rollback without phantom or leaked Owner |
| P/Q identity and hidden completion | Opaque selection rejects strings; repeated local identifiers inherit A4 coverage; no automatic selection jump or sibling pollution |
| R Core replacement | Fresh list/draft/model/admission; main disposes all bundles and UI |
| S narrow | Existing responsive/scroll suites plus actual 246px CEP measurements below; fake DOM is not claimed as a layout engine |
| T default equivalence | Actual main single-record bootstrap/rebind coverage plus all existing single-conversation suites |

A4 composition 89, bootstrap 31 and SurfaceController 239 assertions PASS. Existing A1/A2/F1/A3, Composer/Transcript/Presentation, Provider/Runtime, Review, lifecycle, diagnostics, layout and i18n suites passed in the full run.

## M. Offline validation

- Full offline regression: **182/182 runnable suites PASS; 0 skipped**.
- Vela order: **94/94 forward, 94/94 reverse, 94/94 forward again PASS**.
- Local ignored logs: .tmp/vela-a5-full.log and .tmp/vela-a5-order.log. These are offline evidence, not AE traces.
- Changed-JavaScript syntax, generated-report freshness, project consistency and diff whitespace checks all PASS in final verification.

## N. Closed-loop repairs

1. Reusing the real shell across selected-view reconstruction exposed leftover transcript DOM. TranscriptView disposal now removes only its owned list/transient nodes while retaining model truth. The focused roundtrip and full transcript suites pass; real repeated switching showed no duplicate terminal/content.
2. Text-first then reasoning update could pass an undefined local segment to createReasoningShell. It now uses the existing ref.node. Streaming-focused and full suites pass; real hidden streaming/return/cancellation rendered normally.
3. The new grid row required updating the old transcript-scroll static expectation, preserving its minmax/overflow checks. The generated i18n guard required report regeneration.
4. The eight-bundle fixture exposed collisions under its deterministic fake ID source. The optional test environment randomId override uses the production random-ID implementation for this resource-bound test; production identity/security semantics were not weakened. A4 repeated-local-ID tests remain unchanged and pass.

No frozen contract, Provider wire, parser, Intent Gate, Review/Authority semantics, Preflight, Host or Verify implementation was changed.

## O. Targeted real CEP / AE acceptance

Performed 2026-09-07 via the built-in browser at CEP DevTools port 8088, inspecting the actual installed workspace-junction panel. Actions were dispatched through the actual product DOM controls in the DevTools console. No separate multi-bundle factory harness substituted for the product UI. The user opened AE/LM Studio and manually narrowed the actual docked panel. Existing project-owned VelaTrajectoryDiagnostics and independent CSInterface read-only Host queries supplied evidence.

| Case | Observed evidence | Result |
| --- | --- | --- |
| 1 create/select | New created C2 then C3; selected indices 1/2; actual selector switched C1/C2/C3; C3 transcript empty | PASS |
| 2 sequential text | C1 returned “A5 C1 文本完成。”; C2 independently answered greeting; return C1 retained its own single user/assistant result | PASS |
| 3 streaming background | C1 continued long reasoning while C2 selected; return displayed later reasoning; C2 retained only its own text. Earlier C1 text completed while hidden and selection stayed C2 | PASS |
| 4 admission UX | Running suffix stayed on C1; C2 displayed other-conversation-running, Send disabled, textarea editable. On hidden completion C2 Send became enabled without selection jump | PASS |
| 5 Review switching | Same session_1/objective_agent_4/agent_task_4 association and 60→40 summary before/after C2 roundtrip; C2 blocked. Bound Approve produced exactly one terminal attempt/Host commit and fresh committed-target verified-match, expected=actual=40 | PASS |
| 6 cancel handoff | C1 long stream, away/back, actual Cancel; C1 showed cancelled terminal; C2 Send enabled and completed “谢谢” request. No C1 text/reasoning appeared in C2 | PASS |
| 7 draft | Unsent “A5 未发送草稿 exact 你好” restored exactly on C1 return; C2 draft empty and C1 transcript empty before send | PASS |
| 8 close | C3 closed to C2; C2 later closed to C1; holder Close disabled; final Close disabled. Real eight-record cap displayed localized feedback; closing freed New. Labels were C1,C4…C10, not renumbered | PASS |
| 9 narrow | User resized actual CEP viewport to 246px; document scrollWidth=246, Vela width=211.625, data-layout=narrow. Select/New/Close and composer/settings/send/authority bounds remained within viewport. DevTools screencast visually checked | PASS |
| 10 Core reload | Actual inspected location.reload from seven live records and an unsent draft: only 对话 1, index0, empty draft/transcript, active=null, terminal=null, other=false, Close disabled; UI requires Provider acknowledgement/configuration again | PASS |
| 11 shared Host | Independent baseline100. C1 one-shot-authorized 100→60 commit with fresh matches=true; C2 fresh query returned60 and had no inherited mutation attempts. Separate Review test changed60→40. Cleanup Review40→100 passed committed-target verified-match and independent Host read returned100 | PASS |

The initial 100→60 request used the existing one-shot grant and therefore did not exercise explicit Review. A separate ungranted 60→40 request was used for Review switching. The one-shot 100→60 path's retained trajectory has fresh matches=true but targetRelation=unproven/disposition=unknown; it is not called committed-target verified-match. The subsequent explicit Review40 and cleanup100 operations do contain committed-target verified-match evidence.

Narrow bounds: viewport246; select x23.78125→159.4375, New165.828125→186.828125, Close193.21875→214.21875, textarea24.78125→213.21875, settings23.78125→63.78125, Send76.578125→214.21875. Native resizeContent on the docked panel did not change its width; the actual narrow PASS is based on the user's subsequent native resize, not simulated CSS width.

Console evidence labels include C3/C1 restored, BACKGROUND, CANCEL/handoffSend, C2 read, reviewBefore/reviewAway/reviewReturn/APPROVED, RESTORED/HOST restored, LAST/CAP/FREE and FRESH_CORE. A single malformed acceptance console expression failed at JavaScript parse time before any action; corrected expression then produced the Review evidence above. This was not a product error.

## P. Evidence limitations / UNKNOWNs

- This report manually transcribes observed DevTools outputs; no raw wire archive or native screen recording is claimed. Screenshot was visually inspected in the tool output.
- Forced source admission, same-local-ID collisions, creation/disposal failure injection, stale callbacks, delayed Verify and exact opaque Review-object equality remain offline evidence. Real Review identity is evidenced by the same objective association/summary and single committed attempt, without adding a private execution/debug export.
- Native keyboard-only traversal was not separately replayed. Accessibility relies on native select/button semantics, DOM labels/selected state and focused tests; real narrow control availability was measured/observed.
- Existing A2/A3 response-field and trajectory provenance UNKNOWNs remain. The one-shot path's unproven target relation is explicitly retained above. No model qualification or production activation is inferred from these tests.
- Real reload is an actual inspected page/Core reload, not a native AE application restart or close/reopen of every docked panel.
- Tested locale/layout: Chinese actual CEP at732px and246px; English copy is covered offline. No persistent view history or exact scroll/disclosure restoration is promised.

## Q–S. Outcome

Q. Production UI now exposes multi-conversation create/select/close; multiple live production records are supported, bounded to8 by UI policy, with globally at most one active objective. No persistence, concurrent objectives, queue, history injection or full Agent UI Completion. Frozen architecture amendment = **NONE**.

R. **A5 is COMPLETE / SEALED**, formal documentation seal 2026-09-07. All bounded evidence/UNKNOWNs above remain part of the seal. No commit, push or merge was performed.

S. Overall **0.3.11: READY FOR FINAL INTEGRATED ACCEPTANCE / NOT YET SEALED**. Exact next step: **0.3.11 Final Integrated Multi-conversation Acceptance**. This is readiness, not a claim that the overall milestone has already passed integrated acceptance or been sealed. The test layer is restored to100; final panel Core is fresh and Provider disabled pending the existing session opt-in.


## Formal seal reconciliation — 2026-09-07

This seal changes only this report, PROJECT_STATE, HANDOFF and VELA_ROADMAP. Production/test behavior and the frozen architecture remain unchanged. The accepted 66 focused assertions, 182/182 runnable suites (0 skipped), 94/94 forward/reverse/forward and 11 targeted product-UI CEP/AE cases are reused; no expensive regression or AE run is repeated for a documentation-only seal.

The full section P limitations, including manually transcribed evidence, offline-only race/failure coverage, unreplayed native keyboard traversal, Chinese-only real layout coverage, page/Core reload scope, inherited UNKNOWNs and the one-shot targetRelation limitation, remain explicit. The explicit Review and cleanup evidence is not generalized to the one-shot path. Formal seal checks cover local documentation links/anchors, project consistency, generated i18n freshness, whitespace and unchanged non-document files. No JSON or JavaScript source is changed by this seal.

Formal-seal checks PASS: 56 local documentation links and 1 explicit anchor resolved; all 383 non-seal files matched the turn-start content hashes; generated i18n freshness, project consistency and git diff --check passed. JavaScript syntax and JSON source validation are not rerun because this seal changed neither source type. The branch retains the pre-existing uncommitted A5 implementation/test changes; no staging, commit, push or merge occurred.
