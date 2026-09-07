# Vela 0.3.11-A4 — Multi-record Runtime Composition

Status: **COMPLETE / SEALED**. Formal documentation seal: 2026-09-07. Sealed A3 baseline `7e474c3`, 180/180 offline PASS. Architecture amendment NONE. No commit/push/merge performed.

## A. Focused composition audit (before production edits)

| Seam | Ownership / limitation | A4 decision |
| --- | --- | --- |
| main composition | One selected/global Owner, Runtime and ownership binding; teardown only follows these slots | Introduce one Core-owned collection; selected aliases become a projection of its selected record; shutdown covers all records |
| AgentRuntimeOwner / Session / Driver | Factory-local Agent, exact Session, Driver, Observation, capability runtime, trajectory slots and disposal; getSessionRuntime returns exact object | Create a fresh Owner for each record; never reuse selected Owner for creation |
| Runtime / ProviderController | createRuntime closure contains Provider request state, ContextBridge, Controller, Plan/Authority owners, Review barriers and epoch; exactAgentSession injected | One initialized Runtime per Owner Session; factory identity cannot hot-swap |
| Observation / Capability runtime | Owner-local current turn, read coalescing and cancellation; Session/Turn/Scope/revision checks retained | Independent per record; no transcript-derived Host truth |
| ContextBridge | Per Runtime current capture and Host/context correlation | Independent active captures; shared external AE world |
| ReviewRuntimePort / attach | One-time attach is per Runtime/Driver instance, not a process singleton; exact review identity and Runtime barrier remain inner authority | Wire once per fresh pair; no changes to Review semantics |
| A1 ownership | WeakMap keyed by opaque identity; exact association and lifetime validation | Retain A1 identity privately; collection returns opaque record reference bearing the same display conversationId, not another ID namespace |
| A2 presentation / A3 source port | Model and cached source port per ownership; Runtime/Driver subscriptions outlive views | Stable per record; admission wraps source operation initiation before model.begin |
| Surface | Main mounts one view; view dispose leaves presentation intact; session readiness view-local | Select detaches old view, mounts source-bound new view; old conversation remains live; no selector controls |
| Diagnostics | Bounded UI slots capture source and reject old publication | Selection updates source aliases and resets slots; no history repository |
| HostReadSerializer | Module-level promise tail serializes Host reads, with per-task mayStart predicate | Shared facility remains; it does not confer Session identity or objective admission |
| Module counters / WeakMaps / trusted registries | Session IDs and local counters namespace objects; trusted membership uses exact objects; Runtime-local Authority/Plan stores | Retain all existing membership checks; no string lookup used by composition; test repeated local IDs |
| Host module state | One actual project, selected layers and Host epoch | C2 must freshly observe C1's committed AE changes; never clone or cache a per-conversation world |
| panel/Core lifecycle | Current invalidation disposes one selected bundle | Invalidate all source handles first, detach Surface, dispose every Runtime/Owner, cancel pending creation, clear admission |

No architecture-level singleton conflict found. Source inspection alone is not a multi-bundle acceptance claim; production-focused and real CEP tests follow.

## B–E. Architecture, production files, records and selection

One Core owns multiple immutable associations addressed only by opaque record references. Ordinary disposal rejects a record holding admission; disposing a selected quiescent record explicitly selects null, with no automatic sibling selection. Core shutdown overrides ordinary disposal and invalidates every record.

Admission is separate from selection and Driver busy. An opaque reservation is acquired before any source send side effect. It remains through observing, streaming, Review, execution, Verify and replan; release requires that exact Driver's terminal state and all tracked source objective/continuation/cancellation calls settled. Old callbacks compare the exact reservation, never objectiveId strings. Busy rejection is typed and occurs before Provider, Agent beginTurn, Host access or presentation.begin. No scheduling or queue.

Default main startup creates/selects one record. Additional records use the same production factory/API; no A5 controls, persistence or background policy are introduced.

The private frozen association contains the exact A1 handle, Owner, Session, initialized Runtime, model and source port. The public record carries only the existing A1 conversationId for correlation. Strings, copied objects, A1 handles and records from another composition cannot recover a port or become selected. Only the trusted root selection callback receives the association; views receive narrow ports.

Production files changed:

- `client/js/vela/velaConversationComposition.js`: collection, factory wiring, admission, selection, disposal and pending-create rollback.
- `client/js/vela/velaConversationOwnership.js`: optional private admission hook around send, Review continuations and cancellation; existing two-argument A3 callers retain compatibility. Fixed grant/revoke consent semantics are unchanged.
- `client/js/main.js`: fresh Owner factory, composition transaction, selected aliases/diagnostics, Surface rebind and all-record Core lifecycle. No trusted instance is exported to window.
- `client/index.html`: load composition after ownership; all project cache queries updated together to `20260907-vela-0.3.11-a4`.

Public operations: createRecord, select(record|null), getRecords, getSelected, getSourcePort(record), getAdmissionState, disposeRecord, dispose, suspend and resume. No by-ID lookup, queue, restore or persistence API. Reselecting the same record is a no-op. Selection retains old Runtime lifecycle and the exact old model, without terminal re-ingestion.

## F–G. Admission lifecycle

Acquisition precedes getConfig, Agent start/beginTurn, Provider, Host and presentation.begin. A second send, including from the same record, synchronously throws `CONVERSATION_OBJECTIVE_BUSY` without partial start effects.

Tracked calls count outstanding sends, Review continuations and cancellation. Release requires the exact Driver being terminal (or idle after failed start) and zero outstanding calls. Synchronous cancellation is counted until its settlement microtask; outstanding original send/Verify continuations must also settle. A send promise resolving into awaiting-review does not release. Intermediate logical-step Verify and subsequent Review retain the reservation. No timeout infers settlement.

Driver publications schedule checks against the captured opaque reservation. Old checks cannot release a newer holder, even with repeated objective IDs. No release token is exposed. Failed config/start and Provider terminals release safely; Core shutdown revokes sources and disposes bundles before clearing admission.

## H–J. Isolation, shared Host and lifecycle

Owner/Session/Driver, Runtime/Provider, Review, trajectory, Observation/ContextBridge, Authority/Plan stores, presentation and source port are per record. Tests use one production module namespace and shared simulated Host, including a positive-control active C1 grant and Observation that do not appear in siblings.

C2 freshly captures the shared AE world after C1 commits. No transcript restores a target. JIT resolution, CAS, Preflight and Verify remain unchanged. Already-satisfied work still passes local Review and fresh Verify without a duplicate Host mutation.

Ordinary disposal rejects an admission holder with `CONVERSATION_RECORD_ACTIVE`, including Review and cancellation settlement. Selected quiescent disposal explicitly selects null; no automatic sibling selection. Core shutdown invalidates all A1/source handles before view disposal, resets selected diagnostics, disposes each Runtime before its Owner, includes unselected/pending records and clears the collection/gate.

Bounded diagnostics slots follow selected aliases and retain exact-source/generation checks. Surface status/error callbacks also require the still-selected controller. Failed C2 Owner creation cannot publish an Agent error into selected C1.

## K. Focused tests

`scripts/test-vela-conversation-composition.js`: **89 assertions PASS**, requested A–R coverage using actual factories, shared module/Host identity, real SurfaceController/View components and actual main bootstrap harness; no mock record-array substitute.

Coverage: three live records plus creation during a grant; immutable exact association and forged/string/stale rejection; sequential/repeated-ID objectives; selection roundtrip and hidden streaming; rejection before Agent/Provider/Host/presentation; Review/Verify/logical-step admission; rejected Review; stream cancellation and held Host Verify cancellation; stale release; grant/Observation isolation; shared Host capture; independent/selected/Core/pending-create disposal; failed initialization/config/Provider; selected diagnostics and default one-record equivalence.

The trajectory fixture now offers synchronous prepare factories alongside its unchanged async create convenience path, so composition itself initializes and attaches the bundle. Static bootstrap/Authority assertions now inspect the migrated seam. Existing behavioral assertions remain.

A1 74, A2 38, F1 88, A3 54 and default Surface bootstrap 31 assertions PASS. Full regression includes Driver, Session, Provider/streaming, Review, Runtime/Owner, Context/trajectory and Authority suites.

## L. Full validation

Full offline regression: **181/181 runnable suites PASS**, 0 skipped (one new A4 suite). Vela forward/reverse/forward: **93/93 PASS in each order**. JavaScript syntax, generated i18n report freshness, project consistency and git diff whitespace checks PASS. Local logs: `.tmp/vela-a4-full-regression.log` and `.tmp/vela-a4-order.log`.

Frozen architecture, Provider wire, Parser, Intent Gate, Host and security-owner source files unchanged. Package version remains0.3.6; no release metadata or tags changed.

## M. Closed-loop findings and repairs

- Two old static tests matched single-bundle construction in main. They now check exact Session injection and initialize-before-commit across composition/main; behavioral tests remained passing.
- Project consistency requires unified frontend cache queries; all resource tags now use the A4 query.
- Code review found failed C2 Owner creation could publish into selected C1 diagnostics. Guarded cold-start reporting and a focused C1-live/C2-failed regression close it.
- Admission tracking is limited to objective/Review/cancel operations; fixed grant/revoke consent behavior remains independent. Positive-control grant isolation is tested.
- The initial shared-world assertion expected already-satisfied detection before Review. The established path is Review/Preflight/Verify; the test follows it, with no target/security change.
- Some DevTools inspection commands used incorrect diagnostic names or queried Settings before lazy mounting. They failed before state changes; corrected calls use existing APIs/controls. These are acceptance harness errors, not product defects.

## N. Targeted real CEP / AE acceptance

2026-09-07, built-in CEP DevTools port8088, workspace junction installation, LM Studio `http://127.0.0.1:1234`, `qwen3.5-4b`. Test Comp, one selected layer, opacity initially100. Actual production factory/API and evalScript Host are used; no added product debug seam. Default main bundle remained idle during the separate test composition.

| Case | Observed evidence | Result |
| --- | --- | --- |
| 1 Two bundles | Both ready/live; Sessions session_2/session_3; distinct A1 IDs | PASS |
| 2 Sequential text | Both completed, independent user/assistant pairs, both start at presentation_turn_1; admission idle afterward | PASS |
| 3 Active C1 blocks C2 | CONVERSATION_OBJECTIVE_BUSY; C2 Driver/Provider idle, zero items; holder C1 | PASS |
| 4 View source change | Real SurfaceController on temporary offscreen DOM shell; 143 samples selected C2 while C1 streamed, reasoning length17→8289, C2 items0; same C1 model/snapshot retained on return | PASS, API/view evidence |
| 5 Review gate | C1 awaiting-review100→63, C2 busy; C2 Review idle and Authority inactive; release after approved completion | PASS |
| 6 Shared Host | C1 committed63 and fresh Verify matched; C2 own fresh Review63→63, then already-satisfied with no Host invocation and fresh Verify matched63 | PASS |
| 7 Cancel handoff | C1 cancelled after reasoning length22; immediate C2 busy; cancelled promise settlement releases; C2 completes while C1 remains cancelled | PASS |
| 8 Dispose / fresh Core | Direct composition dispose with two live records and active text start: all Owners/Runtimes disposed, ports false, old commands/late continuation stale; real panel reload starts ready session_1, empty trajectory/transcript, inactive Authority, one Surface | PASS with boundary below |

C1 A1 ID: `conversation_abff1ec2c2f37c17be09f49338fc3190_2`; C2: `conversation_a8cdc14c98d2b41f83f91826b5b033be_3`.

C1 Verify `req_5bb89472f3c34ec5606eead379f5518dafb8eb0b9f3c016b4c2cdfcf353b9e11`; C2 already-satisfied Verify `req_c61b4c3ae2cf8545c62a89824216678321598201f4596ada9cc1697b77aba26d`. Both actual63, verified-match.

Cleanup used a new admitted C1 request, Review63→100, approval and fresh Verify `req_32e0663b8dda64f0b842485c34eba99f5057a7f4991c874c664448db33990656`: actual100, verified-match. Separate read-only Host check returned100. Temporary timers, Surface/shell and DOM removed before reload. No A4 cleanup mismatch.

Final-code default UI smoke also PASS: actual reload, fresh session_1 with empty trajectory/transcript and one Surface; acknowledgement initially false. Existing Settings acknowledgement/enable controls activated the local session, and the real composer sent “用一句话解释关键帧。” The UI showed “已收到本地响应”, one user/assistant pair, completed terminal, Runtime ready and lastErrorCode null. A final separate Host read returned opacity100. The cold-start diagnostic isolation refinement was covered by its focused failure-injection regression and this final-code default startup smoke.

## O. Evidence limitations / UNKNOWNs

- Targeted compatibility/correctness acceptance, not model qualification. Readiness/output confer no authority.
- Case4 uses real production Surface on an offscreen test-only shell, not A5 user-facing switching UX.
- Main's composition stays lexical. Multi-record disposal used the natural public factory, not an exported main instance. Main all-record shutdown/rebind/rollback is covered offline; real default Core reload is separately observed. This is not a native AE panel close/reopen claim.
- Real evidence above is manually transcribed from observed DevTools console output, not raw network traces or an automatically exported archive. Reasoning content is omitted; only lengths/lifecycle retained. Repeated-ID, held-Verify, failure injection and stale-diagnostic races are offline evidence.
- Existing trajectory unknowns and sealed A2/A3 limitations remain unchanged. A4 does not retroactively upgrade historical evidence.
- Inherited A3 cleanup limitation: the initial request was safely blocked by Intent Gate (target-mismatch / CANDIDATE_NOT_FOUND / zero attempts); the actual model numeric output was not captured and remains UNKNOWN. The explicit retry63→100 passed Review, Host commit and fresh Verify, followed by independent Host read100. This event belongs to the [sealed A3 evidence](vela-0.3.11-a3-source-routing.md#remaining-unknowns-and-evidence-limits), not the A4 cleanup above.

## P–Q. Scope and readiness

Multiple live production records supported; default startup seeds/selects one until A5. At most one active Agent objective per production Core composition. No persistence/restore, selector controls, history injection, Observation Window, scheduler or concurrent-objective policy. Frozen architecture amendment **NONE**. Authority/Review/TaskPlan, Provider terminal validation and Host contracts unchanged.

**A4 is COMPLETE / SEALED** within the evidence boundaries above. Formal seal changes documentation only; final 181/181 offline and three 93/93 order results are reused because production/test code is unchanged during reconciliation. No commit/push/merge or architecture amendment. Exact next dependency: **0.3.11-A5 — Minimal Conversation Selection Surface**, not started.

Formal-seal checks: 54 local documentation links and 2 anchors PASS across this report, PROJECT_STATE, HANDOFF and VELA_ROADMAP; project consistency, generated i18n freshness and git diff whitespace checks PASS. No JavaScript or JSON changes in this reconciliation, so additional syntax/JSON validation is not applicable. Earlier implementation/test changes remain uncommitted in the existing task worktree.
