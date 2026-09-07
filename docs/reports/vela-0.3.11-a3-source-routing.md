# Vela 0.3.11-A3 — Source-bound Async & Command Routing

Status: **COMPLETE / SEALED**. Formal seal: 2026-09-07. Baseline `2f983f1`; A1/A2/F1 sealed. Architecture amendment NONE.

## Focused routing audit (before production edits)

| Class / route | Current source → destination | Pointer / capture | C1/C2 hazard | A3 decision |
| --- | --- | --- | --- | --- |
| A Surface send | Surface → main provider closure → Owner.startObjective | reads global Owner/Runtime at command time | old Surface can send into new owner | bind command to exact ownership handle |
| A Provider readiness / consent | Surface → main Runtime closure | global Runtime | stale readiness/consent can address replacement | bind Runtime and reject stale settlement |
| C Provider send completion | exact Driver/Provider promise → Surface.complete → synchronize | inner Provider is exact; main getters global | C1 completion can read C2 | retain inner routing; bind outer completion and getters |
| B Runtime stream-started/reasoning-delta/text-delta/stream-completed/failed/cancelled | exact Runtime subscription → Surface → injected exact model | Runtime and model captured, subscription tied to visible view | remount loses publication; mixed current command target | conversation-lifetime publication; view only subscribes to render notifications |
| B/D Agent/Driver projection | exact Owner projection → Surface snapshot cache | exact subscription; view lifetime | mixed source status versus global getters | bind projection/status to same source; synchronize model independently of view |
| C/D synchronize / completion | main Provider/Driver/Confirmation getters → exact model | getters re-read global Runtime/Owner | cross-write into old model using new truth | exact source synchronization, stale no-op |
| F approve / reject | displayed Review → main Runtime → active Review | global Runtime, active Review re-read | approves B or a replaced A Review | view captures local opaque command binding for exact Review identity; validate before existing Runtime method |
| F proposal review / confirmation | Surface → Runtime proposal router/controller | global Runtime outside; exact inner objects | different Runtime target | bind outer route; preserve inner Review/Authority/barrier checks |
| G cancel | Surface → Owner.cancelObjective or Runtime.cancelProviderRequest | global Owner/Runtime | cancels B | exact bound cancellation; preserve F1 terminal ordering |
| E diagnostic refresh | main → Owner.refreshActiveComposition → global slots | generation captured; Owner re-read; stale branch clears global error | stale C1 can alter C2 truth | source-bound request/publication; stale callbacks perform no global writes |
| E diagnostic cancel | main diagnostic promise → global Owner | current Owner | cancellation may target replacement | retain source of pending diagnostic |
| E trajectory / context selection getters | debug getter → current Owner/Runtime | synchronous current pointer | no delayed result today, but no source port | select source once at entry, invoke bound diagnostic getters |
| B/D Surface mount/resume | subscribe exact Runtime/projection; unsubscribe on hide/dispose | exact object plus subscription tokens | publication lifetime unnecessarily follows DOM | persistent source publisher; disposable view subscription; no duplicate ingestion |
| C lifecycle/bootstrap | transaction exact owner/runtime/session → ownership commit | exact transaction + Core/panel generations | already rejects stale initialization | NO CHANGE to checks; attach/tear down port within ownership lifetime |
| B/C inner Provider / Runtime / Agent terminal | local instance callbacks with request/generation/epoch/review guards | exact objects | no current-conversation lookup inside these paths | NO CHANGE to wire vocabulary, terminal validation, or security semantics |

## Root ownership problem

A1/A2 made ownership and PresentationModel exact, but main command/getter closures still dereferenced global Runtime/Owner while Surface subscriptions captured older exact objects. A late operation could therefore combine one source model with another source's status or commands. A3 fixes that outer association without changing inner execution authority.

## Chosen seam

Extend the existing ownership module with one cached, least-privilege source port per exact handle. It captures the trusted association once; every command/publication checks that same handle, never an ID lookup or current fallback. Production still creates one ownership record. A mounted view receives only presentation operations and bound commands, not the trusted Runtime bundle. No EventBus, scheduler, persistence or selector.

Cross-conversation source-routing isolation is verified by a production-focused multi-bundle harness, not by a production conversation selector that does not yet exist.

## Implemented production contract

Changed production files: `client/js/main.js`, `client/js/vela/velaConversationOwnership.js`, `client/js/vela/velaSurfaceController.js`. No loader, Runtime, Provider, Host, protocol, schema or security-owner changes.

`createSourcePort(handle, getConfig)` caches one port on the exact ownership record. It captures Owner, Runtime, Driver, projection and PresentationModel once. `isLive` checks the original record, including exact Session and Runtime liveness. Invalidation closes the source subscriptions before the existing Runtime/Owner disposal sequence. It cannot resolve a string conversation ID or fall back to current selection.

Send captures endpoint/model configuration at initiation; conversation identity is already fixed. Cancel, proposal review, readiness and consent commands all use the captured source. Surface captures opaque approve/reject closures when rendering a Review; they compare the exact source's Review ID/revision (or legacy local candidate ID), reject stale/consumed bindings, then call the unchanged Runtime command. Runtime barriers, Review correlation and Authority validation remain authoritative.

Runtime events are ingested once by the conversation port, independently of visible DOM. Exact Driver and Agent projection subscriptions synchronize only that model. Promise settlement synchronizes that source even after its Surface has been disposed; stale settlement rejects with `CONVERSATION_OWNER_STALE`. View notifications can be unsubscribed/rebuilt without moving or recreating the publisher. Transient deltas during Surface-only hiding are retained in memory; existing Runtime suspension/cancellation semantics still govern actual panel lifecycle. No durable replay or persistence is introduced.

Main diagnostics captures source binding and exact Owner before requesting Observation. Global bounded current slots are a publication surface: changing source clears the slots, and a late prior-source success/error performs no write, including no clearing of the new source's capability error. Pending cancellation uses its captured Owner. Trajectory reads select a source once and call its bound getter; Context selection evidence remains Runtime-owned and source-bound through the port. Observation Session/Turn/Scope/revision validation is unchanged.

## Offline validation

- A3 focused suite: **54 assertions PASS**, synthetic colliding IDs, real production Runtime/Owner/Driver/Provider bundles, actual main bootstrap/replacement, and actual main diagnostics prefix.
- Full offline regression: **180/180 PASS, 0 skipped**, `.tmp/a3-full-final.log`.
- Vela forward/reverse/forward: **92/92 PASS each round**, fresh Node processes, `.tmp/a3-order.log`.
- Existing A1 74, A2 38, F1 88, SurfaceController 239, bootstrap 31, production lifecycle 34, diagnostics 72 and all other required suites included in full PASS.
- Syntax, generated i18n freshness, project consistency and diff checks PASS. No generated report rewrite needed.

Initial wiring regression caught obsolete static assertions expecting global-pointer text in main; these now assert the source-bound seams. The new synthetic stream fixture initially omitted the required frozen Provider event and was corrected to respect the existing event contract. No sealed-behavior repair, wire change or security amendment was necessary.

## Focused case coverage

| Required case | Executed result |
| --- | --- |
| A source stream | PASS: source-only reasoning/text/completed/failed publication |
| B stale stream | PASS: captured late listener cannot change an existing disposed invocation |
| C completion | PASS: C1 completion never reads C2 Provider or Driver; source terminal committed without view |
| D approve | PASS: synthetic and real production Review route only to C1; C2 Review unchanged |
| E stale Review | PASS: revised, consumed and disposed bindings fail closed |
| F cancel | PASS: only bound source cancellation invoked |
| G F1 terminal | PASS: exact cancelled state and retained reasoning, including real streaming chain |
| H diagnostics | PASS: live source result retained; disposed result rejected; actual main late result cannot clear C2 error |
| I repeated IDs | PASS: same objective/request generation/presentation turn/reasoning identifiers isolated by source |
| J remount | PASS: model remains same, hidden deltas retained, resume does not re-ingest events |
| K replacement | PASS: old stream/completion/Review/send/cancel fail closed; actual main replacement remains clean |
| L equivalence | PASS: text, streaming, Review, execution, fresh Verify, cancellation/recovery; wrong model target still blocked |

## Real AE acceptance

User requested the built-in browser CEP DevTools and opened AE/LM Studio. Connected to port 8088, verified actual CEP extension path and `vela-conversation-ownership-0.3.11-a3-v1`; Runtime ready; existing `qwen3.5-4b` at loopback port 1234 enabled via the normal session opt-in UI.

| Case | Evidence | Result |
| --- | --- | --- |
| 1 streaming/reasoning | `A3_CASE1` console: requesting → completed, 107 sampled streaming states with nonempty reasoning; reasoning_1 stream-completed, 5020 chars, collapsed; one user/assistant pair | PASS |
| 2 Review → Execute → Verify | `A3_CASE2_REVIEW/AFTER/HOST`: displayed 100 → 63; clicked bound Approve; actual AE opacity 63; trajectory hostCommitted=true, mutated, fresh committed-target verified-match, expected=actual=63 | PASS |
| 3 cancel → next | `A3_CASE3_CANCEL/SETTLED`: reasoning_3 retained 80 chars, streaming/open → stream-cancelled/collapsed; Provider cancelled; next user message completed once | PASS |
| 4 hide/resume | `A3_CASE4_DURING_HIDDEN/STREAM_RESUME/FINAL`: Home pointer navigation hides Surface during reasoning_6 (84 chars); same invocation resumes at 1713 chars; ends once at 5497 chars, collapsed, one reply | PASS |
| 5 pending Review + Core replacement | `A3_CASE5_PENDING/REPLACED/HOST_UNCHANGED`: 63 → 64 Review pending; actual pagehide/pageshow lifecycle injected through DevTools; session_1 → session_2, Runtime ready, empty transcript/segments/trajectory/Provider terminal; retained old Approve/Reject nodes disconnected and inert; Host stays 63 | PASS |
| 6 diagnostics adjacent/during objective | `A3_CASE6_DIAGNOSTICS/DURING`: valid 800×800, 30s, 30fps comp; session_1, turn_3 then current objective turn_4; fresh Context success; trajectory verified; replacement refresh uses session_2/scope_2/hostReloadEpoch=2 with no stale prior truth | PASS |

The [real-AE evidence transcript](vela-0.3.11-a3-real-ae-evidence.json) records the observed fields and exact evidence limits. Built-in browser raw content export is unsupported, so this is an explicitly labeled manual transcription, not a fabricated raw export.

One DevTools test command had a quoting SyntaxError before execution; corrected command ran successfully. This was an acceptance-command typo, not a product defect. Cross-conversation isolation is offline multi-bundle evidence only; no production conversation selector exists.

## Scope and seal

Production still creates exactly one conversation; no persistence, switching, second conversation UI, A4 multi-record composition, scheduler or concurrent objective policy. Frozen architecture amendment = NONE. A3 is **COMPLETE / SEALED**. Exact next dependency: **0.3.11-A4 — Multi-record Runtime Composition**; not started. Formal seal changes documentation status only and does not commit, push or merge the stage.

## Remaining UNKNOWNs and evidence limits

No unresolved A3 correctness defect was observed. C1/C2 separation, delayed callbacks and intentionally repeated local IDs are offline evidence; real AE has no conversation selector. Case 5 uses injected lifecycle events executing the actual production handlers, not a claim of a second production conversation or a native window close. Existing trajectory unknown fields (including providerRequestId/targetRef where not wired) and the sealed A2 response-field UNKNOWN remain unchanged; this stage does not infer them. Transient capture across Runtime suspension is subject to the existing Runtime lifecycle, not a new persistence guarantee.

Acceptance command labels above are captured in this task's DevTools tool outputs. Offline execution logs are local ignored files. The initial successful test mutation was 100 → 63. The first cleanup request was safely blocked by Intent Gate (`target-mismatch`, session_2, CANDIDATE_NOT_FOUND, zero attempts). The model's actual numeric output was not captured and remains UNKNOWN. A production-focused reproduction (requested 100, fixture emits 60) proves blocked terminal, no Review and zero Host mutations. This is preserved safety behavior, not an A3 routing defect. The explicit retry `Set opacity to 100%` produced Review 63 → 100 and completed through fresh committed-target verified-match; actual AE opacity was read back as 100. The test layer is restored.

## Formal seal reconciliation — 2026-09-07

A3 is COMPLETE / SEALED. This reconciliation updates only this report, PROJECT_STATE, HANDOFF and VELA_ROADMAP. Production behavior, tests, the manually transcribed real-AE evidence JSON and frozen architecture remain unchanged. No A4 work or debug seam was introduced.

The final production-state results are retained: A3 54 assertions; full offline 180/180 PASS, 0 skipped; Vela forward/reverse/forward 92/92 PASS each round; A1 74, A2 38 and F1 88 PASS; targeted real-AE Cases 1–6 PASS. No expensive regression or real-AE rerun was performed solely for this documentation seal. The test layer remains recorded as restored to opacity 100%.

All evidence limitations above remain part of the seal: offline-only C1/C2 isolation, injected lifecycle events rather than native close/reopen, manually transcribed evidence because raw export was unsupported, inherited trajectory/A2 UNKNOWNs, and the uncaptured numeric output of the safely blocked first cleanup request. The explicit recovery retry passed Review, Host commit and fresh Verify.

Formal-seal checks: documentation links and anchors, project consistency, generated i18n freshness, applicable JavaScript syntax, evidence JSON validity and git diff --check PASS. Before/after SHA-256 checks confirm that only the four authorized documentation files changed during reconciliation. Exact next dependency: **0.3.11-A4 — Multi-record Runtime Composition**; not started.
