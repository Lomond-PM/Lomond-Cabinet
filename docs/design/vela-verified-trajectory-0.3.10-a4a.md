# Vela 0.3.10-A4a — Verified Trajectory Source & Projection Contract

Status: evidence-backed audit + proposed A4b implementation contract; A4a COMPLETE, A4b NOT IMPLEMENTED.
Baseline: `b5f8785be11f3eb8db31ad0ae45f7730b30e507d` (HEAD = dev = origin/dev after fetch).
Branch: `feat/vela-verified-trajectory-contract-a4a-0.3.10`.

This document defines a read-only historical projection. It changes no production code, Session schema, execution or Verify behavior. [A1](vela-context-architecture-0.3.10-a1.md) supplies domain/trust/lifecycle constraints; [A3b](../reports/vela-0.3.10-a3b-capacity-budget.md) remains unchanged. [Agent architecture](vela-agent-architecture.md) is FROZEN FOR 0.3.x; architecture amendment NONE. The frozen architecture's named “Verified Result” includes validated Host result semantics; A4 records that separately from the independently fresh Verify used by today's Driver. It does not redefine that frozen term or claim the current Session payload already satisfies the richer trajectory contract.

## A. Current execution / Verify evidence inventory

The table describes CURRENT evidence, not the proposed projection. “Retained” means accessible while the relevant owner is alive, not durable or necessarily accessible through Runtime's public facade.

| Source / producer and canonical owner | Identity and exact available data | Trust / lifecycle; Session and historical sufficiency |
| --- | --- | --- |
| [Driver](../../client/js/vela/velaAgentDriver.js), `buildPlan`, `runIteration` (lines 89–159) | objectiveId, taskId, turn.sessionId/turnId, TaskPlan id/revision, materialized stepId, CapabilityIntent id/params; logical cursor includes logical plan/step and materialization attempt | Local intent/control, requested values are not AE facts. Current TaskPlan replaced at replan/next logical step; latest snapshot retained at terminal until next start. Session submission lacks expected values, logical step/attempt and source-version provenance. |
| [Runtime](../../client/js/vela/velaRuntime.js), `captureReviewBarrier`, `claimApprovedReview`, `continueApprovedReview` (lines 353–479) | objective/task/Session/turn/TaskPlan/step/review identities; exact reviewed semantics and policy; privately captured fingerprint, valueDigest, beforeValue; same reviewed capability object; independent runtime generation | Local Review/control and trusted capture facts. Private barrier Map entries claim/delete/invalidate; no public historical getter. Driver retains current reviewResolution, not a complete review ledger. These are not Provider request identities. |
| [ConfirmedAuthorityComposer](../../client/js/vela/velaConfirmedAuthorityComposer.js), `compose`, `executeConfirmed` (lines 101–153) | fresh candidate and reviewed semantic comparison; claim; AuthorizedPlan; materialized executionPlanId; TaskRun waiting/armed progress; `runAttempted`; settlement `{state, committed:true/false/null, code}` | Local authorization/execution-control boundary. Active record finished after settlement; returned value ephemeral. No Session append in this composer. `authority-ready` means composition/confirmation completed, not mutation or Verify. |
| [TaskRun](../../client/js/vela/velaTaskRun.js), `snapshot`, `arm`, `complete`, `block`, `cancel` (lines 45–66) | taskRunId, authorizedPlanId, executionPlanId, state, executionArmed, createdAt/updatedAt, terminalErrorCode, cancelReason | Canonical execution lifecycle owner. PlanController retains record until invalidate/dispose. Complete occurs before independent Verify. No actual value, Host commit proof or Verify result; no direct Session append. Never export executionArmed as recoverable authority. |
| [PlanController](../../client/js/vela/velaPlanController.js), `run`, `getProgress` (lines 99–161) | TaskRun/authorized/execution plan ids, nextStep/actionCount/candidate states; returned/error `executionReceipt {committed,satisfied,code}` | Execution aggregate, not fresh Verify. Receipt local to `run`, not stored by getProgress. Latest receipt is not a generic multi-action history. Confirmed current logical steps materialize separate single-action plans. False/satisfied coercions lose detail (section C). |
| [ExecutionPreflight](../../client/js/vela/velaExecutionPreflight.js), JIT path in `executeStep` (lines 583–760) | confirmed baseline vs fresh capture, expectation, CAS/binding checks; reservation and plan/actionIndex; `alreadySatisfied`; exact `{ok:true,committed:false,summary:{disposition:"already-satisfied"}}` before executor call | Local fresh execution/capture truth; strongest no-op source. Transient captures cleared after settlement. Summary returned to PlanController, which reduces it. No Session record. Historical projection must copy safe facts before this information is lost. |
| [Host execution](../../host/vela/velaExecution.jsx), `handle` (lines 120–180), validated by [ExecutionAdapter](../../client/js/vela/velaExecutionAdapter.js), `executeValidatedAction` (lines 56–89) | Host request/session/operation/revision correlation; capability, valueKind, resultingValueDigest on success; Host error `mutationCommitted:true/false/null`; Adapter returns committed success summary or protocol error with tri-state commit | Validated Host execution evidence. Private requests contain native bindings: do not copy them. Host beforeDigest is local CAS input, not a returned historical before-value. Success means setter completed and result digest validated; not independent fresh Verify. Result/error is transient; Session does not keep this envelope. |
| [ContextBridge](../../client/js/vela/velaContextBridge.js), `prepareCommittedTarget`, `observeCommittedTarget` (lines 1406–1498) | Private one-shot target handle tied to Session, bridge epoch, Host instance/reload/project generation and exact target. Public safe result: fresh, valueKind, value, valueDigest, observationId (= read requestId) | Independent trusted target read; validates exact committed target and Host identity. Handle consumed before read, never serialized. No Session append; promise result transient. Returned freshness proves that particular read, not continued current truth. |
| [Preflight](../../client/js/vela/velaExecutionPreflight.js), `verifyCommittedValue` (lines 785–808) | execution plan lookup; capability/expected typed scalar; returns `{fresh,valueKind,value,valueDigest,matches,observationRevision,code}` | Best existing typed comparison seam for opacity and rename. Deletes plan verification association before observing. Safe result has no native target; historical retention absent. observationRevision here is a request id, not Driver Observation revision. |
| [Runtime](../../client/js/vela/velaRuntime.js), `ownTerminalVerification`, `verifyCommittedAction` (lines 328–350) | continuation objective/task/capability/expectedValue, runtime generation, private verificationPlanId; accepts exact identity; maps Verify to `{state:"verified"|"unverified"|"blocked"|"cancelled",code}` | Canonical continuation association. Rich actual/digest/fresh/source fields discarded. Continuation closes and invalidates handle after use; current committed is private and lost at close. No terminal getter for full result. |
| [Driver](../../client/js/vela/velaAgentDriver.js), `resolveReview`, `advanceLogicalAfterVerify`, `terminal` (lines 86, 180–193, 225–255) | semantic Verify state, current logical cursor, completed/remaining counts, reviewResolution, terminal outcome/code | Local progression/derived objective conclusion. Session carries sparse post-action/terminal events, not step receipts. Terminal snapshot retains latest logical summary but drops mutable cursor; next objective replaces it. |
| [SessionRuntime](../../client/js/vela/velaSessionRuntime.js), `createSessionLog` (lines 206–316) | `{kind,family,seq,requestId,payload}`; Session id belongs to log. No automatic timestamp, producer version or execution-attempt identity | Append-only occurrence record; general append validates family/kind, not a per-kind rich result schema. Closed log readable while referenced. No automatic persistence/reload restoration. Authority events have a separate in-memory provenance path, not conferred by event shape. |

Both capabilities share the confirmed Review → Composer → TaskRun → JIT → Host/no-op → committed-target Verify path. Their differences are closed typed details: opacity uses `params.opacity`, number, `ADBE Opacity`; rename uses `params.name`, string, layer attribute `name`. The names and paths identify capability semantics, not public executable target identity. Rename parameter validation has an existing 256 UTF-8-byte maximum ([CapabilityContracts](../../client/js/vela/velaCapabilityContracts.js), `validateLayerNameParams`, line 257).

The explicit one-shot delegated opacity route is a separate CURRENT production branch. Runtime's `submitIntent` ALLOW branch (lines 779–805) uses AtomicActivationCoordinator and then `verifyAction`; [ContextBridge](../../client/js/vela/velaContextBridge.js) lines 1752–1765 recaptures **current selection**. Its returned value may be fresh and equal, but this port does not prove it is the original executed target. A4 must preserve `verificationScope:"current-selection"` / `targetRelation:"unproven"`, not promote it to committed-target verification. This audit does not fix that retained path or extend delegation to rename.

## B. Exact event timing map

All Driver `event(...)` records use `requestId = active.objectiveId` ([Driver](../../client/js/vela/velaAgentDriver.js), line 84). That field is not a Provider request id.

| Actual order / producer | Session event and payload meaning | What it cannot prove |
| --- | --- | --- |
| `startObjective`, before Observe | `task/started {taskId,objective}` | admission, mutation, target availability |
| Observe succeeds; intent about to be built | `ae/state-observed {taskId,phase:"pre-action",observationRevision}` | atomic execution baseline, later JIT/CAS freshness |
| `buildPlan`; transition awaiting-outcome; **before** `submitIntent` | `agent/action-performed {taskId,taskPlanId,stepId,capabilityId,phase:"submitted"}` | Runtime admission, Review approval, execution attempted, mutation |
| Runtime reports Review required | `task/review-required {taskId,taskPlanId,stepId,reviewId,reviewRevision,code}` | approval or arming; beforeValue is in suspendedReview, not this event |
| User rejects | `task/review-rejected {taskId,taskPlanId,code}` at Driver terminal | prior steps uncommitted; full rejected review identity/values are absent |
| User approves → Runtime recaptures → semantic claim → Composer accept/confirm → TaskRun arm | No corresponding general Driver approval/result event at these boundaries | absence of an event is not proof a stage did not occur |
| Runtime returns `verification-required` | `tool/result {taskId,capabilityId,committed:true}` **before fresh Verify** | mutation: Runtime returns this for committed execution **or satisfied/no-op** |
| Runtime Verify settles | `ae/state-observed {taskId,phase:"post-action",fresh:verification.state==="verified",observedOpacity:null}` | actual value/digest/Verify id; `fresh:false` conflates fresh mismatch and failed/unavailable verification |
| Verified state accepted by Driver | cursor completed count advances; next Observe before next step materialization; on final step `task/completed {taskId,taskPlanId,code:null}` | per-step mutation vs no-op; complete event alone also occurs for text-only completion |
| Failed/unavailable Verify, execution failure, cancellation | `task/blocked` or `task/cancelled {taskId,taskPlanId,code}` | rollback, no mutation, or exact commit state at cancellation |

The non-Review/delegated path writes the same tool/result before `verifyAction`. Its post-action event reads `verification.opacity`, whereas current Runtime `verifyAction` returns `value`; thus actual opacity is generally null in this route too. It checks `fresh && matches` for Driver completion, but the log does not include matches or target correlation. Do not interpret a phase string as a typed Verify result.

Authority-related records have different timing and ownership. Runtime's explicit consent path appends `permission/decided` with approved/local-user/taskId ([Runtime](../../client/js/vela/velaRuntime.js), line 622); [DelegationAuthorityCoordinator](../../client/js/vela/velaDelegationAuthorityCoordinator.js), `issue`, appends `delegation/granted` after grant issuance with rollback handling. [AtomicActivationCoordinator](../../client/js/vela/velaAtomicActivationCoordinator.js), `activate` (lines 45–65), appends `task/execution-armed` after arming, **before run/Host**; payload includes taskRun/authorized/execution plan and activation ids. These prove their own trusted authority occurrences only. Confirmed Review composition does not synthesize these delegated events. Granted, armed, consumed action budget and Host commit are different facts. In particular, AtomicActivationCoordinator.run sets its private `record.committed=true` in the delegated gate-consume callback before the Host setter (lines 83–84); that field means authority budget consumption, not Host commit.

## C. Session information loss and other reductions

1. **Submission named as performed:** source proves the action-performed event precedes Runtime submission. It proves a local submission occurrence only, even though its family is `fact`.
2. **No-op reported as committed:** Driver line 243 sets active.committed and appends committed:true for all verification-required continuations. Preflight's explicit already-satisfied result was committed:false. The Session value cannot recover either mutation disposition or Host commit.
3. **Verification payload loss:** Runtime `verifyCommittedAction` drops value, digest, observation id and fresh. Driver converts the semantic state into a boolean called fresh, and emits no matches. A fresh mismatch becomes fresh:false in Session. Missing post-action event also cannot distinguish “not run” from cancellation/exception before append.
4. **No typed generic history:** tool/result lacks step/attempt/plan identity and target/value; post-action lacks capability and expected value; terminals lack logical completed counts. Session seq can order occurrences but cannot prove which native target or execution attempt a sparse tool/result belongs to. No raw log replay may invent these links.
5. **TaskRun complete is execution lifecycle:** it precedes independent Verify. getProgress retains lifecycle but not the `run` receipt or Verify evidence. Driver task/completed also supports plain assistant text without any mutation.
6. **Receipt reductions:** PlanController marks `satisfied = ok && committed===false`; that is broader than Preflight's actual alreadySatisfied branch. Its error fallback can produce committed:false when no explicit error commit field exists. These are reported execution aggregates, not validated Host-negative evidence. Preflight also defaults absent executor `committed` to `ok` (`normalizeExecutorResult`, lines 510–518). The production ExecutionAdapter is explicit, but a historical generic success shape does not identify which producer ran.
7. **Loss after terminal:** Preflight transient captures, consumed Bridge handle, Composer active record and Runtime continuation are cleared. Driver holds only latest TaskPlan/logical summary; earlier logical step and failed materialization details are replaced. Rich reconstruction from a terminal snapshot plus Session is generally impossible.
8. **General Session append is not producer authentication:** shape/family/seq alone do not establish a Driver/Host/Verify origin. Authority WeakMap provenance is narrow and non-restorable, not generic trajectory provenance. Old events may be retained as `legacy-session-occurrence`, but their stronger execution/verification fields remain unknown.

Where exact live producer/path provenance exists, a Driver terminal may support the fact “Driver concluded completed”; it still does not recover actual value, mutation disposition or committed-target identity. No retroactive upgrade of sparse old events is permitted.

## D. Orthogonal state model and reachable combinations

The following are independent fields, never one combined status enum:

| Dimension | Closed values / interpretation |
| --- | --- |
| Intent | `submitted`, `admitted` are true/false/null. submitted = Driver entered its submit operation; admitted = Runtime accepted the locally validated intent for the relevant Review/Authority route, not Provider text admission. Review = not-required/pending/approved/rejected/unknown. |
| Attempt | `executionAttempted`, `hostInvocationAttempted` are true/false/null. Execution attempt begins at the specific Preflight executeStep entry, not a Driver counter. Host invocation entry is separate; it does not prove delivery or mutation. |
| Mutation | `mutated`, `already-satisfied`, `not-mutated`, `unknown`. Unknown includes commit uncertainty and missing historical evidence. |
| Commit | `reportedCommitted` preserves the exact upstream receipt tri-state. `hostCommitted` separately requires validated Host result/error provenance; no-op has no Host result, hence hostCommitted=null with reason host-not-invoked. |
| Verification | `verified-match`, `verified-mismatch`, `verification-unavailable`, `verification-not-run`, `unknown`; separately record attempted, fresh, matches, scope and targetRelation. |
| Completion | step outcome = active/completed/rejected/cancelled/blocked/unknown; objective outcome = active/completed/rejected/cancelled/blocked/unknown; coverage = none/partial/full/unknown. Partial is not a replacement for the terminal reason. |

Reachable current confirmed-path combinations:

| Case | Mutation / reported commit | Verify / step terminal |
| --- | --- | --- |
| Opacity or rename setter success, matching fresh target read | mutated / true | verified-match / completed |
| Exact fresh JIT value already equals desired; both capabilities | already-satisfied / false | verified-match / completed |
| Setter or no-op, then target changes before fresh Verify | mutated / true **or** already-satisfied / false | verified-mismatch / blocked; preserve earlier execution truth |
| Setter committed, target read unavailable/error | mutated / true | verification-unavailable / blocked |
| Host fails after setter returned, e.g. result readback error | mutated / true from validated Host error | later fresh Verify may match/mismatch/be unavailable if existing continuation association survives; commit truth remains independent |
| Host CAS/validation rejects before setter | not-mutated / false from validated Host error | verification-not-run if observed control path proves it / blocked |
| Host setter throws, malformed/unmatched result, invoke failure | unknown / null at Adapter boundary | normally no activated committed-target Verify; not-run only if control occurrence proves it, otherwise unknown / blocked |
| Review rejected before execution | not-mutated for **this attempt** / no execution receipt (null) | not-run / rejected |
| Cancel before any execution entry, observed locally | not-mutated for this attempt / no receipt | not-run / cancelled |
| Cancel during in-flight execution | mutated, not-mutated or unknown depending on actual retained settlement evidence | not-run/unavailable/unknown, or a completed pre-cancel Verify fact / cancelled |
| CONTEXT_STALE at approved-review precommit barrier | not-mutated / false at that specific proven barrier | not-run; old attempt blocked/superseded, objective may replan |

`mutated` means the validated Host setter completed as an operation, not a promise the numeric/text value changed relative to a historical before-value. `not-mutated` needs direct no-dispatch/pre-setter evidence; it cannot be deduced from cancelled, blocked, unarmed now, or a generic fallback receipt. `already-satisfied` specifically requires the fresh Preflight equality branch and executor bypass, not merely `satisfied:true`.

Current-selection Verify can supply a fresh value comparison but not the executed-target relation. Preserve that comparison; use trajectory verificationDisposition=unknown with `target-correlation-unproven`, even if Driver's independent completion outcome is completed. A4 does not modify Driver completion semantics to resolve this difference.

## E. Provenance and trust rules

Every projected fact names a closed local producer and source occurrence/reference:

- `local-control-occurrence`: Driver submission/review/terminal; Composer or TaskRun lifecycle. Proves only the observed operation or control result.
- `execution-result`: exact Preflight no-op, executor settlement, PlanController receipt. Preserve producer and whether a field was defaulted/coerced.
- `host-commit-evidence`: validated Adapter Host envelope with request/session/operation/capability/contract checks, or matched Host error tri-state. Host success digest validation is not fresh Verify.
- `fresh-verify-evidence`: committed-target Bridge observation plus Preflight comparison and Runtime attempt association; source read identity and target relation required.
- `derived-objective-summary`: Driver terminal and explicit recorded step facts; include references to the facts used, never recompute mutations from cursor count.

Historical freshness is A1 class D evidence of a past read. It is never current JIT state or a re-executable capture. No grant, nonce, reservation, executionArmed, committed-target handle, native binding, activation handle, candidate object or authority evidence object is serialized. IDs retained as non-resolving audit references do not grant access. Do not copy raw objects then delete a few keys: whitelist primitive fields at each canonical owner.

A derived record is not registered with any Authority evidence resolver/WeakMap. `authorityCapable:false` is a statement of the contract, not the security mechanism: no execute/restore API accepts the projection. A4b must test copied and forged projections against those existing boundaries.

## F. Identity and correlation contract

Use the existing Agent Session id plus objectiveId as objective identity. Driver counters reset with owner recreation; they are not durable global keys. Distinguish:

| Identity | Rule |
| --- | --- |
| Driver task / TaskPlan / materialized step / intent | Copy exact live ids/revision at materialization. A TaskPlan is not the AuthorizedPlan or executionPlan. |
| Logical plan / step / index | Copy Driver cursor at the attempt, before advancement; use null/not-applicable for nonlogical objectives. Preserve materializationAttempt; replan gets a distinct attempt record even within one logical step. |
| Execution attempt | Future local `attemptId` is a bounded audit-only id allocated when a materialization is registered, scoped to Session/objective; map only through private local wiring to TaskPlan/step and execution entry. Never use turnId, Session seq or Provider generation alone. |
| TaskRun / AuthorizedPlan / executionPlan / actionIndex | Associate at existing compose/materialize/run boundary; copy ids only, no authority objects. Null before identity exists; do not guess from similar strings. |
| Provider request | Current Driver logical intent does not carry an explicit Provider request association through execution. Default null with `not-wired`; A4b must not repair request-to-Review continuity or join Session.requestId to Provider requestId. |
| Verification | A local verification attempt id can mark observe entry, including failed attempts. Existing successful observationRevision/observationId is a read request id, retained separately. A failure without a returned id must not invent a Host read id. |
| Target | Core `targetRef` is null unless a safe, producer-issued, attempt-scoped public audit alias exists. It must be non-resolving and never expose native ids/path/binding. `targetRelation:"committed-target"` can be proved by Bridge's private checks without publishing the native identity. Across attempts, target equivalence stays unknown absent a reviewed public contract. |

No unified trajectoryGeneration is introduced. Existing Driver, Runtime, Composer, Bridge and PlanController generations guard their own boundaries. The aggregator uses immutable occurrence correlation and separate owner checks, not a replacement global epoch.

## G. Unknown semantics

Unknown is first-class. Nullable booleans/scalars mean unavailable, never false/zero. Each null or unknown field carries an explicit reason keyed by field path. Use `not-applicable` for a nonlogical step and `not-observed`/`not-wired`/`legacy-information-loss` for missing evidence. Other closed reasons: `host-not-invoked`, `commit-uncertain`, `source-reduced`, `target-correlation-unproven`, `verification-result-unavailable`, `cancelled-before-settlement`, `late-result-not-retained`, `owner-invalidated`, `value-omitted-by-bound`, `projection-capacity-exceeded`.

No event-name, phase, UI string, transcript, reasoning, cursor, committed:true aggregate or historical timestamp heuristic fills a missing field. A late event may only add a **new explicitly sourced occurrence** to the original attempt when the still-owned A4b reporting seam allows it; it cannot rewrite an issued immutable snapshot, revive execution or contaminate a new objective. If that source was invalidated/lost, keep unknown. No retroactive enrichment from unrelated future observations.

## H. Multi-step / partial-completion model

Driver `advanceLogicalAfterVerify` increments completedStepCount only after accepted Verify; clears current TaskPlan/intent/review, begins a new turn, then fresh Observe runs before incrementing the logical step index and materializing the next step. `terminal` retains a summary and clears the mutable cursor. These are progression facts, not mutation receipts.

Store separate immutable attempt facts for step 0 and step 1. Example:

```text
step 0: mutated OR already-satisfied (from its own execution source), verified-match, completed
step 1: review rejected, executionAttempted=false, mutation=not-mutated, Verify=not-run
objective: outcome=rejected, coverage=partial, completedStepCount=1, remainingStepCount=1
```

Step 0's committed/verified fact survives step 1 rejection, cancel, stale replan or failure. Never roll it back or replace all steps with objective=failed. Keep reported Driver completion counts separate from `verifiedEvidenceStepCount`; a legacy/cross-target path may report completed steps without sufficient retained evidence to populate equivalent verified-target facts. Unknown counts stay null, not inferred from array length when evidence was omitted.

Replan preserves prior materialization attempt and supersession relation. The actual auto-replan entry is `beginNextIteration`: approved continuation CONTEXT_STALE + committed:false + bounded observation, checked against current loop budgets. `classifyReplanEligibility` naming a MAY_REPLAN category does not prove every failure has an implemented retry path. Committed-null never implies a safe repeat.

## I. Already-satisfied model

Exact source is `fresh.alreadySatisfied` in Preflight, derived from current value capture equality with the typed local expectation, after fresh binding/baseline checks. `executeStep` reserves/settles the local execution lifecycle but bypasses `executeValidatedAction`. Consequently no Host setter or Host Undo group occurs on that branch. `completeTerminal` still activates independent verification when `result.ok===true` and a verification owner exists. Both opacity and rename use this branch.

Project `executionAttempted:true`, `hostInvocationAttempted:false`, `mutationDisposition:"already-satisfied"`, `reportedCommitted:false`, `hostCommitted:null` (host-not-invoked). Fresh Verify supplies a separate match/mismatch/unavailable disposition. A no-op may therefore complete, or fail Verify if state changes afterward.

The exact no-op summary currently exists only at Preflight return; PlanController reduces it to satisfied, Composer returns state satisfied, Runtime hides that distinction behind verification-required, and Session then writes committed:true. There is no complete terminal no-op getter. A4b must capture the explicit branch before reduction, not retrospectively rename existing tool/result events.

## J. Cancellation / commit uncertainty

Driver.cancel increments its own generation, calls Runtime cancellation, then terminalizes. Runtime invalidates review barriers/continuation/verification ownership and asks Composer/delegated execution to cancel. PlanController.cancel changes TaskRun and record generation and attempts discard; source explicitly says in-flight steps are **not forcibly interrupted**. A Host invocation already dispatched can settle after cancellation.

Composer can return cancelled with committed true/false/null from its receipt. Runtime's cancelled continuation return drops that field, and Driver current-generation guards ignore late results. Thus cancellation safety against resumption is not a complete historical commit audit. A4b must preserve a separately associated execution observation before lossy cancellation mapping if available, or record unknown. It must not delay terminal, retain executable handles longer, start extra Verify, force interrupt Host or change cancellation behavior merely to improve reporting.

Host setter exceptions produce mutationCommitted=null because an exception does not prove no mutation. Post-setter read/serialization failures preserve true. Adapter malformed/correlation-invalid response and invoke failure use null. PlanController fallback false is not equivalent to these Host proofs. Successful Host commit remains true through later mismatch/unavailable Verify. Preflight may activate a Verify handle on committed:true error; whether Runtime can consume it depends on its existing continuation/lifecycle checks. That is not a new retry permission.

For A4b, a terminal snapshot may be sealed with commit unknown if settlement has not been observed. Optional later reporting is limited to a correlated immutable successor snapshot of the original retained objective, explicitly marked late; if the objective has been evicted or its reporting source is gone, count/drop as unavailable without mutating the new objective. Execution and Authority lifetimes never extend for this reporting purpose. The exact callback ordering/re-entrancy behavior requires the focused tests in M/N before enabling such a successor seam; the minimum implementation may retain unknown instead.

## K. Proposed immutable versioned schema

The v1 contract is a closed data-only objective projection. The following is schema notation, not implemented JS or a new Session event:

```text
{
  schema: "vela.verified-trajectory-evidence.v1",
  authorityCapable: false,
  projectionId: LocalAuditId,
  supersedesProjectionId: LocalAuditId | null,
  objective: { sessionId, objectiveId, taskId, logicalPlanId: Id|null },
  lifecycle: { state: "active"|"terminal", lateEvidence: boolean },
  attempts: [ {
    attemptId: LocalAuditId,
    correlation: {
      taskPlanId, taskPlanRevision, materializedStepId, intentId,
      logicalStepId: Id|null, logicalStepIndex: integer|null,
      materializationAttempt: integer|null, turnId: Id|null,
      taskRunId: Id|null, authorizedPlanId: Id|null,
      executionPlanId: Id|null, actionIndex: integer|null,
      providerRequestId: Id|null, supersedesAttemptId: Id|null
    },
    capabilityId: Id,
    target: { targetRef: Id|null, targetKind: "property"|"layer-attribute"|"unknown" },
    intent: { submitted: triBool, admitted: triBool, review: ReviewDisposition },
    execution: {
      executionAttempted: triBool, hostInvocationAttempted: triBool,
      mutationDisposition: MutationDisposition,
      reportedCommitted: triBool, hostCommitted: triBool,
      resultCode: Code|null, resultingValueDigest: Digest|null
    },
    verification: {
      attemptId: Id|null, sourceObservationId: Id|null,
      attempted: triBool, disposition: VerificationDisposition,
      scope: "committed-target"|"current-selection"|"unknown",
      targetRelation: "committed-target"|"unproven",
      freshAtRead: triBool, matches: triBool,
      expected: TypedValue|null, actual: TypedValue|null,
      actualDigest: Digest|null, code: Code|null
    },
    completion: { outcome: StepOutcome, superseded: boolean },
    provenance: [FactSource], unknowns: [UnknownField]
  } ],
  completion: {
    outcome: ObjectiveOutcome, code: Code|null, coverage: "none"|"partial"|"full"|"unknown",
    declaredStepCount: integer|null, completedStepCount: integer|null,
    remainingStepCount: integer|null, verifiedEvidenceStepCount: integer|null,
    sourceAttemptIds: [LocalAuditId]
  },
  provenance: [FactSource], unknowns: [UnknownField],
  bounds: { complete: boolean, omittedAttemptCount: integer, omittedValueCount: integer }
}
triBool = true | false | null
TypedValue = { kind: "number", data: finiteNumber }
           | { kind: "string", data: boundedString }
FactSource = {
  factPaths: [closedSchemaPath],
  class: one of the five provenance classes in E,
  producer: closedLocalSymbol, contractRevision: Id|null,
  occurrenceId: LocalAuditId,
  sourceRequestId: Id|null, sourceSessionSeq: integer|null,
  strength: "direct"|"reduced"|"derived"
}
UnknownField = { path: closedSchemaPath, reason: closedReasonFromG }
```

All ids are audit-only strings, at most 256 UTF-8 bytes. Missing required live correlation rejects the proposed **projection input**, not execution; sparse legacy data is not assigned fabricated live ids. Model strings/phase text cannot choose producer/class. The source revision identifies the local producer contract; it is not a new runtime generation.

Opacity expected/actual are numbers and rename expected/actual are bounded strings; core execution, commit and Verify fields are shared. No opacity-only field is in the core. Unknown capability-specific details remain absent/unknown pending a separately reviewed extension; this is not Capability Model Generalization. Exact actual/expected data is optional when a safe bounded value cannot be retained; a digest is not reversible text and is not evidence of the missing value by itself.

Minimum projection bounds: at most 16 materialization attempt records per objective, 16 FactSource records per attempt, 64 unknown-field entries per attempt, 256-byte ids/codes/digests, 256 UTF-8 bytes per string value, and 64 KiB serialized per objective. These are **reporting limits**, not new action/loop or input budgets. Preserve required identity/disposition/unknown flags first; omit optional values with explicit counts/reasons. If complete core records do not fit, publish an incomplete bounded projection with omitted-attempt count, never silently claim completeness or change execution. A4b must demonstrate current two-step/replan bounds fit and define deterministic safe construction of the incomplete record. No rolling summary or model compaction.

## L. Owner, lifecycle and minimum retention decision

Canonical truth remains distributed: Preflight owns no-op/execute facts; Adapter/Host owns commit evidence; Bridge/Preflight owns fresh Verify; Driver owns progression. **Runtime is the narrow assembly producer** because it already associates the current objective/task/expectation with Composer execution and a private verification plan. Runtime alone currently loses rich facts before Driver can see them; Driver/Session-only reconstruction is insufficient.

Future A4b should add private read-only reporting at those reduction points and have the existing AgentRuntimeOwner retain the bounded objective projection alongside Driver lifetime. This is a small ephemeral accumulator inside existing ownership, not a central trajectory store/service, a new truth source or a persistence manager. It receives allowlisted primitive facts with exact occurrence correlation; no public injection of arbitrary facts and no Provider/Surface/PresentationModel ingestion. If safe capture of a fact requires changing an execution result contract, observer ordering or an executable handle lifetime, stop and split that work rather than infer the fact.

Minimum retention: one active objective projection plus one most-recent terminal objective projection, scoped to the owning in-memory Agent Session. A terminal remains readable during the next objective. When a newer terminal is retained, the previous terminal slot may be replaced; record retention coverage explicitly, do not claim full Session trajectory history. Already-returned immutable snapshots remain historical values while referenced. No unbounded per-Session objective array. A6 may revisit longer retention, but A4b cannot silently claim it.

Cancel/suspend/runtime reset preserve already copied historical facts within this lifetime while invalidating execution eligibility. Owner dispose/panel reload clears owned projections; no restore from Session JSON, localStorage or in-memory persistence receipts. Native bindings, grants and executionArmed never survive through this projection. A5 alone decides whether any historical fact may enter a future Provider invocation. A4 getters, A2 evidence and A3 spare capacity provide no automatic selection.

## M. A4b focused implementation scope and acceptance tests

1. Implement only the closed immutable projection constructors/validator, bounded existing-owner accumulator and narrow read-only getter. Publish no new Session kind/schema and create no Provider context path.
2. At materialization/Review/run association, copy existing safe ids and register the audit attempt. Keep logical, TaskPlan and execution identities distinct. Provider request stays unknown unless already explicitly carried without continuity changes.
3. Capture explicit Preflight no-op, exact Adapter Host result/error commit and full Preflight Verify result before PlanController/Runtime reductions. Report each fact at its source with provenance; do not upgrade receipt aliases/defaults. Source hooks must be non-authorizing and must not change execution settlement, throw into it or introduce re-entrant control side effects.
4. Runtime associates facts with existing continuation; Driver supplies progression/terminal relation before cursor replacement. Preserve old attempts and their facts on replan/next step. No mutation/Verify retries, new Host reads or lifecycle repair.
5. Handle cancel/late evidence conservatively. The minimum can seal unknown; a late successor projection needs separate exact original-attempt tests and cannot restore continuation or current truth. Failed reporting must not change execution outcome.

Required A4b focused tests (not implemented in A4a):

| Cases | Required proof |
| --- | --- |
| Opacity mutation; rename mutation | One Host setter, typed expected/actual, commit true and distinct independent matched Verify |
| Opacity no-op; rename no-op | Explicit Preflight branch, zero Host setter/Undo, commit false/no Host evidence, separate fresh Verify |
| Fresh mismatch after mutation and after no-op | Preserve earlier disposition; freshAtRead true, matches false, blocked completion |
| Verify unavailable/error, consumed handle, owner invalidation | Distinguish entered read from not-run/unknown; no fabricated actual/source read id |
| Host committed true error; validated false pre-setter; null setter failure/malformed result | Preserve validated commit and producer; PlanController fallback false / satisfied aliases cannot upgrade facts |
| Review rejection; cancel before Preflight; cancellation during dispatched Host and during Verify | Correct attempt/Host-entry dimensions, no rollback inference; late settlement cannot change new objective or resume authority |
| Stale approved barrier and JIT failure/replan | Distinct superseded materialization, no duplicate Host execution; exact scope of proven not-mutated |
| Two-step full completion | Each independently verified step preserved; fresh Observe before step 1 |
| Step-1 rejection/cancel/failure after step-0 match | step 0 unchanged; partial coverage plus terminal reason/counts; cursor alone cannot fill missing facts |
| Delegated current-selection Verify | Fresh comparison retained, executed-target relation unproven; Driver completion does not force verified-target fact |
| Next objective, reset, suspend/dispose/reload, retention overflow | Bounded active/last-terminal ownership, immutable old records, no durable restoration |
| Forged Session events, copied trajectory, raw reasoning/transcript sentinels | No provenance upgrade, no native/Authority fields, no authority recovery or automatic Provider injection |
| Getter disabled / consumer throws / re-entrant observer / truncated projection | Execution and Verify equivalence, explicit missing-data reasons, no changed authority/Host/terminal behavior |

## N. Existing tests, unresolved evidence and real AE gate

Ran 15 **existing** suites: all PASS, **1,798 assertions**. No tests or production files changed.

| `scripts/test-vela-*.js` | Assertions | Evidence / limits |
| --- | ---: | --- |
| [agent-driver](../../scripts/test-vela-agent-driver.js) | 223 | two-step full/partial, replan, review/cancel/late continuation (lines 116–200, 416–438); injected Runtime ports, not real AE |
| [runtime](../../scripts/test-vela-runtime.js) | 93 | current wiring/continuation guards; many critical path assertions are source-based (lines 63–77), not end-to-end Host races |
| [provider-production-e2e](../../scripts/test-vela-provider-production-e2e.js) | 333 | existing Provider production admission; not proof of native Host commit |
| [agent-production-lifecycle](../../scripts/test-vela-agent-production-lifecycle.js) | 34 | production owner/read/Verify wiring and isolation; includes source assertions |
| [execution-preflight](../../scripts/test-vela-execution-preflight.js) | 581 | committed-target one-shot reads; null commit, invalidation/in-flight read, committed error; rename/no-op and mismatch (lines 331–392, 629–671) |
| [jit-binding](../../scripts/test-vela-jit-binding.js) | 41 | fresh binding, stale/replay/discard tests |
| [session-runtime](../../scripts/test-vela-session-runtime.js) | 92 | event taxonomy, append/provenance and in-memory semantics |
| [plan](../../scripts/test-vela-plan.js) | 45 | PlanStore lifecycle/replay |
| [plan-controller](../../scripts/test-vela-plan-controller.js) | 63 | lifecycle and receipt/cancel behavior |
| [task-run](../../scripts/test-vela-task-run.js) | 23 | arm/complete/block/cancel ownership |
| [multistep-routing](../../scripts/test-vela-multistep-routing.js) | 105 | Provider logical-plan admission/routing, not native two-step execution |
| [execution-host](../../scripts/test-vela-execution-host.js) | 41 | mocked JSX realm: both setters, CAS, Undo and true/false/null errors (lines 116–154); not AE process acceptance |
| [execution-adapter](../../scripts/test-vela-execution-adapter.js) | 13 | validated result/error and request correlation |
| [confirmed-authority-composer](../../scripts/test-vela-confirmed-authority-composer.js) | 93 | claims, policy drift, TaskRun composition, pending cancel/late settlement |
| [authority-production-composition](../../scripts/test-vela-authority-production-composition.js) | 18 | existing authority composition isolation |

Unresolved evidence requiring A4b tests: the complete real production Runtime→Composer→Preflight→Host→Verify reporting association across cancel/late settlement; proof no observer changes settlement/re-entrancy; source version/provenance of imported legacy events; safe target audit alias if any; deterministic projection-bound overflow; exact retained terminal successor ordering. These are not solved by the current green component tests.

Real AE for A4a: not required; none operated. For A4b, require a **targeted real AE projection smoke** after offline integration: opacity mutation and no-op, rename mutation and no-op, two-step completion and second-step rejection with the first step retained. Compare projected facts with observed AE values and Undo behavior. This validates the new production reporting path even though Host/Verify semantics must remain unchanged. Destructive/uncertain setter failures and tight timing races should use deterministic offline injection; do not force unsafe real-AE failures. Existing sealed 0.3.9 acceptance does not certify a future A4b getter. No new real Provider/LM Studio acceptance is implied if Provider wiring remains untouched.

Docs-only validation also includes project consistency, generated i18n freshness, relative document links and diff/whitespace checks. Changed files: this contract, PROJECT_STATE and VELA_ROADMAP only. Production/test/Host/frozen architecture diff = 0. No staging, commit, push or PR; baseline HEAD unchanged.
