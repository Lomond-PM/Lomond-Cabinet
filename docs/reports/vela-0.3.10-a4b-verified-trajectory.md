# Vela 0.3.10-A4b — Verified Trajectory Evidence Projection

Status: IMPLEMENTED / OFFLINE INTEGRATION PASS / REAL AE ACCEPTANCE PENDING. **A4b is not closed.**
Baseline: `937386a92b0bda9ba0bab04752fcd63b868fa58e` (HEAD/dev/origin/dev at task start).
Branch: `feat/vela-verified-trajectory-a4b-0.3.10`.
Contract: [A4a source/projection contract](../design/vela-verified-trajectory-0.3.10-a4a.md).

## 1–4. Implementation, schema, ownership and source hooks

The projection answers what evidence exists for the current/last objective. It supplies no executable capability, Session event, Provider input, persistence or retry. Canonical truth remains with Driver, Runtime, Preflight, ExecutionAdapter/Host, Bridge and existing execution lifecycle owners.

The closed constructor is `VelaAgentRuntimeOwner.createTrajectoryProjection(input)`. The two reporting slots and their bounded working draft are private to `createOwner`, implemented by `createTrajectorySlots`. `owner.getTrajectoryEvidence()` returns a frozen `{active, terminal}` wrapper containing immutable `vela.verified-trajectory-evidence.v1` snapshots. It exposes no accumulator, Map, writer or owner object.

The schema retains A4a K's fields:

```text
schema = "vela.verified-trajectory-evidence.v1"
authorityCapable = false
projectionId, supersedesProjectionId
objective { sessionId, objectiveId, taskId, logicalPlanId }
lifecycle { state: active|terminal, lateEvidence:false }
attempts[] {
  attemptId
  correlation {
    taskPlanId, taskPlanRevision, materializedStepId, intentId,
    logicalStepId, logicalStepIndex, materializationAttempt, turnId,
    taskRunId, authorizedPlanId, executionPlanId, actionIndex,
    providerRequestId, supersedesAttemptId
  }
  capabilityId
  target { targetRef, targetKind }
  intent { submitted, admitted, review }
  execution {
    executionAttempted, hostInvocationAttempted, mutationDisposition,
    reportedCommitted, hostCommitted, resultCode, resultingValueDigest
  }
  verification {
    attemptId, sourceObservationId, attempted, disposition, scope,
    targetRelation, freshAtRead, matches, expected, actual, actualDigest, code
  }
  completion { outcome, superseded }
  provenance[], unknowns[]
}
completion {
  outcome, code, coverage, declaredStepCount, completedStepCount,
  remainingStepCount, verifiedEvidenceStepCount, sourceAttemptIds[]
}
provenance[], unknowns[]
bounds { complete, omittedAttemptCount, omittedValueCount }
```

`execution.mutationDisposition`: mutated / already-satisfied / not-mutated / unknown. Verification: verified-match / verified-mismatch / verification-unavailable / verification-not-run / unknown. Outcome: active / completed / rejected / cancelled / blocked / unknown. Coverage: none / partial / full / unknown. Review: not-required / pending / approved / rejected / unknown. The submitted/admitted/attempted/commit/fresh/matches fields preserve true/false/null. Optional ids/counts/scalars preserve null. TypedValue is a finite number or string with an explicit `kind`. The implementation's `projectionShape`, `attemptShape`, `sourceShape`, `unknownShape` and `UNKNOWN_REASONS` are the exact executable schemas; A4a's semantic vocabulary is unchanged.

Each FactSource contains factPaths, class, producer, contractRevision, occurrenceId, sourceRequestId, sourceSessionSeq and strength. Five provenance classes are retained. Producer is a closed local-symbol vocabulary; generic Session shape is never treated as producer authentication. Source contract revision is `vela-trajectory-source-v1`, not a runtime generation. Driver source hooks run before the associated Session append, so sourceSessionSeq remains null rather than guessing the next seq.

The constructor reads own data properties, rejects accessors/unknown keys/malformed scalars and paths, copies through closed field descriptors, checks core commit/no-op/Verify consistency and recursively freezes the output. It does not clone owner objects and strip keys. It is a data validator, not an Authority issuer: a caller-created projection has no trusted executable provenance. The reporting pipeline has no caller-facing fact append API.

| Production file / symbol | Added reporting boundary |
| --- | --- |
| [AgentDriver](../../client/js/vela/velaAgentDriver.js), `trajectory`, `runIteration`, `resolveReview`, `advanceLogicalAfterVerify`, `beginNextIteration`, `terminal` | Objective creation, explicit materialization ids/typed expectation, Review occurrence/rejection, step completion, supersession and terminal control facts. No Session payload change. |
| [Runtime](../../client/js/vela/velaRuntime.js), `reportTrajectory`, `submitIntent`, `continueApprovedReview`, `verifyCommittedAction`, `verifyAction` | Associates source facts with the current objective/TaskPlan and executionPlan. Checks both plan and supplied objective/TaskPlan before forwarding. Provides a one-time private runtime-port reporting attachment used by Owner. Does not expose a trajectory writer through the panel getter. |
| [ExecutionPreflight](../../client/js/vela/velaExecutionPreflight.js), `executeStep`, `verifyCommittedValue` | Execution entry; exact fresh alreadySatisfied branch before reduction; committed-target read entry and safe full read/comparison result or read rejection. Existing result and Verify schemas unchanged. |
| [ExecutionAdapter](../../client/js/vela/velaExecutionAdapter.js), `executeValidatedAction` | Host invocation entry; validated success/error or uncertain transport/parse settlement. Copies plan/read request ids and scalar commit/code/digest only. Never copies the private execution request. |
| [ConfirmedAuthorityComposer](../../client/js/vela/velaConfirmedAuthorityComposer.js), `compose`, `executeConfirmed` | Copies actual TaskRun/AuthorizedPlan/executionPlan ids from PlanController progress when available; separately reports the reduced execution receipt before returning existing state. Does not treat satisfied as proof of the no-op branch. |
| [AgentRuntimeOwner](../../client/js/vela/velaAgentRuntimeOwner.js), `createTrajectoryProjection`, `createTrajectorySlots`, `getTrajectoryEvidence` | Closed data fold and bounded retention. Source facts arrive from Driver or Runtime; Owner does not execute, verify or reconstruct Session history. Constructor is colocated here to avoid a new module registration/dependency. |
| [main.js](../../client/js/main.js), `VelaTrajectoryDiagnostics.getEvidence` | Optional read-only real-AE inspection; getter returns null unless Developer Mode's existing `AETOOLBOX_DEBUG_REGISTRY` flag is true. Installation failure cannot block startup. Production fact generation does not depend on this flag. |

Runtime is the narrow association/assembly producer at the reduction boundaries; Owner performs only the bounded data fold/retention. No new event bus, central history manager, module-loader entry, universal generation or persistence backend exists.

## 5–7. No-op, Host commit and Verify

An explicit Preflight alreadySatisfied branch records executionAttempted=true, hostInvocationAttempted=false, mutationDisposition=already-satisfied, reportedCommitted=false and hostCommitted=null / host-not-invoked. Opacity and rename then independently run the existing fresh committed-target Verify. PlanController satisfied:true and Session tool/result committed:true are never used to infer this disposition.

Validated Host success records hostCommitted=true and mutationDisposition=mutated. Validated pre-setter Host rejection may record false/not-mutated. Setter exception, malformed/correlation-invalid response and invoke uncertainty preserve null/unknown unless stronger validated Host evidence exists. The exact reduced Composer receipt is separately recorded as reportedCommitted with strength=reduced; it never supplies Host-negative truth. Validated committed-result-unavailable errors retain true even if later Verify mismatches or fails.

Preflight captures freshAtRead, matches, typed actual, digest and source read request id before Runtime reduces the result. A missing read id stays null. Fresh mismatch is freshAtRead=true / matches=false, distinct from unavailable. Runtime also reports unavailability if validation fails before a complete Preflight result can be forwarded. Skipped verification is recorded as not-run only at the existing control boundary that returns without requesting Verify. Cancellation during an entered read preserves attempted=true and unknown disposition rather than claiming the read did not run.

The delegated opacity path retains its existing current-selection Verify. Its comparison is recorded with scope=current-selection, targetRelation=unproven and disposition=unknown / target-correlation-unproven. Driver may conclude completed while verifiedEvidenceStepCount remains zero. There is no delegated target-semantics repair.

## 8–10. Cancellation, supersession, retention and bounds

Minimum cancellation policy: **no late successor enrichment**. The terminal projection seals whatever evidence was already received. An in-flight Host operation with no settlement leaves commit unknown; cancellation during Verify preserves already-established Host true. No terminal delay, extra Verify, extra Host read or extended handle lifetime is introduced. Late source results cannot enter a different objective/TaskPlan/executionPlan; Owner also refuses updates after its active draft is sealed.

A deterministic test starts a replacement objective before releasing the old Host callback. The new projection is unchanged by that callback. During an in-flight committed-target read, the existing Bridge can reject the next Observe with OBSERVATION_PROVIDER_FAILED; this existing behavior is preserved, not repaired. A subsequent terminal legitimately replaces the last-terminal slot; a late old result does not.

Stale precommit Review recapture records direct no-execution evidence. Driver replan retains the old blocked/superseded materialization and registers a new attemptId with the same logical step, incremented materializationAttempt and supersedesAttemptId. Other missing execution evidence remains unknown. A cursor count does not manufacture per-step facts.

Step completion is supplied by Driver; verifiedEvidenceStepCount is calculated independently from retained verified-match plus completed-step evidence. Step-0 facts remain unchanged when step 1 is rejected, cancelled or fails Verify. Partial coverage preserves completedStepCount=1, remainingStepCount=1 and the distinct objective terminal outcome. Text-only completion creates no mutation attempt.

Retention is one active objective plus one most-recent terminal. Starting another objective preserves the previous terminal until a newer terminal replaces it. Runtime reset/suspend preserve copied history; Owner dispose/panel reload clear both slots. There is no Session JSON restoration or unbounded Session objective list.

Reporting bounds are 16 attempts/objective, 16 FactSource entries/attempt, 64 unknown entries/attempt, 256 UTF-8 bytes per id/code/digest/string value and 64 KiB serialized/objective. Oversize optional values are omitted with explicit counts/reasons. Entire excess/unrepresentable attempt records are omitted rather than retaining stronger facts without their provenance. The projection then marks complete=false, projection-capacity-exceeded and verifiedEvidenceStepCount=null. Driver completion counts remain their separate control facts. All tested normal one/two-step/replan cases fit without truncation. Agent action/loop and Provider budgets are unchanged.

## 11–12. Authority and Provider isolation

The getter has no mutation methods or consumer subscription. Re-entrant reads return frozen data; consumer writes throw without changing the retained snapshot. Test-injected source reporters that read re-entrantly and then throw leave Host/Verify/progression unchanged. Source delivery is guarded; errors do not become execution failures. The production attachment is internal Runtime/Owner wiring, not a user event-bus subscription.

Negative tests pass copied, forged, modified and JSON-round-tripped projections to existing AuthorizedPlan, TaskRun, grant issuance, Review, Authority evidence and committed-target-port boundaries. They are rejected. No trajectory object is registered in an Authority/native-binding trusted WeakMap. The test does not claim serialized data alone is an execution identity.

No Provider, A2, A3, Session or presentation module consumes the projection. Exact pre/post wire and Session event comparisons prove the current path unchanged. Existing A2, A3, reasoning and Provider production suites also pass. Raw reasoning is emitted by the Provider fixture but absent from the projection. Future historical selection remains A5 work.

## 13. Offline validation and evidence limits

**34 suites / 4,022 assertions PASS**, including the new suite's **416 assertions and 14 immutable pre-A4b production equivalence cases**. Baseline modules are loaded from git commit `937386a` with independent module instances and the same deterministic fixture inputs. No baseline is generated from modified production source.

New artifacts:

- [test-vela-verified-trajectory.js](../../scripts/test-vela-verified-trajectory.js): exact source facts, no-op/commit/Verify, cancellation/late isolation, replan, partial completion, retention, bounds, malformed input, Session forgery, Authority rejection and throwing/re-entrant reader tests.
- [vela-trajectory-harness.js](../../scripts/fixtures/vela-trajectory-harness.js): actual production JS Runtime/Owner/Driver/Composer/Preflight/Adapter/Bridge path with deterministic simulated Host/Provider. Git baseline loader is test-only. Setter/Undo counters are **fixture counters**, not observed real AE behavior.

| Existing `scripts/test-vela-*.js` | Assertions |
| --- | ---: |
| agent-driver | 223 |
| runtime | 93 |
| agent-runtime-owner | 70 |
| agent-production-lifecycle | 34 |
| execution-preflight | 581 |
| execution-adapter | 13 |
| execution-host | 41 |
| plan-controller | 63 |
| task-run | 23 |
| confirmed-authority-composer | 93 |
| jit-binding | 41 |
| session-runtime | 92 |
| provider-production-e2e | 333 |
| multistep-routing | 105 |
| multistep-presentation | 9 |
| authority-evidence-resolver | 24 |
| authority-activation-gate | 52 |
| authorized-plan-authority-producer | 50 |
| authority-production-composition | 18 |
| delegation-authority-coordinator | 44 |
| provider-context-evidence | 241 |
| capacity-budget | 425 |
| transcript-reasoning | 12 |
| presentation-model-streaming | 17 |
| provider | 297 |
| provider-controller | 157 |
| provider-stream-lifecycle | 14 |
| provider-stream-publication | 23 |
| local-transport | 30 |
| browser-bootstrap | 39 |
| cep-module-loader | 96 |
| surface-controller | 239 |
| runtime-status-view | 14 |

Fourteen comparisons cover both capabilities' mutation/no-op, mutation/no-op mismatch, unavailable Verify, committed Host error, validated false, setter/invoke/malformed uncertainty, two-step mutation and two-step no-op. Each compares complete Driver snapshots, exact Host requests, actual Provider wire, Session events and simulated mutation/Undo/Verify counters. No execution/Verify result is replaced with a trajectory result.

Final checks PASS: syntax for all nine changed/new JS files, project consistency, generated i18n freshness, local document links and git diff/whitespace. The generated report is unchanged. These offline checks do not close the real-AE gate below.

## 14–18. Production files, real acceptance and git handoff

Exactly seven production files changed: main.js, velaAgentDriver.js, velaAgentRuntimeOwner.js, velaRuntime.js, velaConfirmedAuthorityComposer.js, velaExecutionPreflight.js and velaExecutionAdapter.js. Host, TaskRun, PlanController, Session, Provider/A2/A3, schema/Parser/Intent Gate, Authority modules and frozen architecture have zero diff. No loader module was added.

### Targeted real AE acceptance — NOT RUN / PENDING

Use a disposable composition with one selected, unlocked, ordinary layer and no opacity expression. Reload the CEP panel to load the changed browser JS. Enable the existing Developer Mode to permit the read-only diagnostic getter. Use existing Provider configuration/readiness/Review normally; do not change any activation policy.

After each objective terminal, capture in CEP DevTools:

```js
JSON.stringify(window.VelaTrajectoryDiagnostics.getEvidence(), null, 2)
```

This getter performs no Host/Provider operation. A null return means the Developer Mode flag is off or Owner is unavailable. The browser-side source is loaded only after panel reload. Retain each JSON result before a later terminal replaces the last-terminal slot. Record actual AE opacity/name and whether a Vela Undo operation was added, rather than judging from the transcript alone.

| Case | Initial AE state / objective | Expected projection and actual result | Actual result |
| --- | --- | --- | --- |
| 1 opacity mutation | opacity 50; `Set opacity to 60%`; approve | mutated, hostCommitted=true, verified-match; actual 60; one Vela opacity mutation/Undo; completed | PENDING |
| 2 opacity already-satisfied | opacity 60; same objective; approve | already-satisfied, reportedCommitted=false, hostCommitted=null/host-not-invoked; separate fresh verified-match; actual 60; no new Host mutation/Undo; completed | PENDING |
| 3 rename mutation | name Layer A; `把当前图层重命名为 Vela Stream Test`; approve | mutated, Host true, typed string verified-match; actual requested name; one rename mutation/Undo; completed | PENDING |
| 4 rename already-satisfied | name already Vela Stream Test; same objective; approve | already-satisfied, false reported commit, no Host commit evidence; independent verified-match; no new mutation/Undo; completed | PENDING |
| 5 two-step full completion | opacity 50/name Layer A; `把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test`; approve both | two distinct verified attempts; actual 60/new name; two Vela mutation/Undo operations; completed/full, counts 2/0 | PENDING |
| 6 second-step rejection | same initial state/objective; approve opacity, reject rename | step 0 unchanged mutated/verified/completed; step 1 rejected/not-mutated/not-run; actual opacity 60/name Layer A; one Vela mutation/Undo; objective rejected/partial, counts 1/1 | PENDING |

For case 6, also capture the active projection at the second Review, then compare its step-0 record to the terminal step-0 record. For no-op cases, compare the prior and subsequent AE Undo state and inspect hostInvocationAttempted=false plus the independent Verify source id. Do not force real setter exceptions, malformed responses or timing races; those remain offline injected cases.

Real LM Studio acceptance: **not separately required** because Provider wiring/requests/admission are unchanged. Existing configured local Provider is used only to drive the user-manual AE smoke. No new discovery, model qualification or budget work.

Architecture amendment: **NONE**. No A4a semantic amendment, frozen architecture edit, execution/Verify/Authority/Driver semantics change or A5 selection is intended or required. This report does not claim real AE PASS from the offline fixture.

Git handoff: task branch above, baseline HEAD unchanged; production/test/docs changes are uncommitted. No staging, commit, push or PR. Completion/closure stays pending until all six actual AE results and projections are recorded and reviewed.
