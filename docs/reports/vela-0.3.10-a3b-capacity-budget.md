# Vela 0.3.10-A3b — Capacity Normalization & Conditional Budget Disposition

Status: IMPLEMENTED / focused offline validation PASS; uncommitted task worktree.
Baseline: `184872020be7947bf3bb22bbfd95a608efc91e2a` (HEAD/dev/origin/dev at task start).
Branch: `feat/vela-capacity-budget-a3b-0.3.10`.

This implements the minimum pure policy seam approved in [A3a](../design/vela-provider-capacity-budget-0.3.10-a3a.md). Production constructs the same requests and records `unassessed-capacity` / `allow-current-shape`. Numeric fit and allocation rejection are exercised with explicitly synthetic qualified operands. This is not complete token-window management or real Provider capacity enforcement.

## 1. Implementation and ownership

| Responsibility | Implementation / evidence anchor |
| --- | --- |
| Provider-side capacity normalization and binding validation | `velaProviderAdapter.normalizeCapacityEvidence(raw, expectedIdentity)` |
| Finalized construction accounting and existing generation controls | Adapter `start`, after `buildRequest` / `buildOpenAiBody`; actual canonical/wire UTF-8 lengths and message-content byte sum |
| Pure local conditional policy | `velaProviderAdapter.decideContextBudget(input)`; no I/O, mutation, history or retained cache |
| Separate decision projection | Adapter and Controller `getBudgetDecisionEvidence()`; opt-in through the existing `debugContextEvidence` flag |
| A2 input reporter | Existing `recordContextEvidence` / `publishContextEvidence`; closed A2 schema and contents unchanged |
| Transport serialization / byte ceilings | Existing `velaLocalTransport.getSerializedRequestEvidence` and actual transport checks; no Transport file change |

The pure functions are colocated in the existing Adapter module to preserve CEP registration, module loader and dependency order. Their responsibilities remain separate; neither A2 nor Transport owns capacity qualification or token policy. No manager, store, persistent cache, new global registration, settings field or runtime owner was introduced.

Production path:

```text
Controller.send -> existing captures -> existing profile/grounding selection
 -> Adapter.start -> buildRequest -> buildOpenAiBody (existing byte gates)
 -> existing optional A2 projection
 -> unconditional decideContextBudget(C=null, I=null, G=null, S=null,
      actual closed construction bytes, actual M/R, local invocation identity)
 -> existing transport/terminal parsing/admission path
```

The policy call does not depend on A2 being enabled or on reading its getter. A2 serialization is not used as the policy's input. Wire-byte accounting calls the existing stateless Transport projection directly; a Transport without this optional method, or with unavailable projection, produces `wireUtf8Bytes: null`. That absence does not fail the request. Canonical and message byte accounting remain available.

## 2. Exact capacity normalization contract

Input is a local data record, not Provider response JSON or an accepted Settings object:

```text
normalizeCapacityEvidence(raw, expectedIdentity)
raw = {
  sourceClass, value, unit, tokenBasis, qualified, qualificationId,
  correlation: Identity, instanceCount?, ambiguous?, stale?
}
Identity = {
  endpoint, model, profile, requestId, providerGeneration,
  instanceId, instanceConfigId, providerContractId, samplingBoundary,
  runtimeRevision?, configRevision?
}
```

All identity fields except the two revisions are required for binding. Labels are nonempty strings of at most 512 UTF-16 code units, compared exactly. `providerGeneration` is a positive safe integer. Revisions accept bounded strings or nonnegative safe integers; represented revisions must match on both sides, including their type. Missing optional revisions normalize to null. The closed identity projection also contains `invalid: boolean`; malformed supplied identity remains unusable through normalization.

`samplingBoundary` is an opaque local invocation/sample correlation label, not an AE freshness grant. Production uses requestId as its construction boundary label. Missing instance/config/backend/revision knowledge is not invented. There is no unified contextGeneration and no objective/session/turn identity inferred from Provider generation.

`sourceClass` is closed: `provider-reported`, `operator-configured`, `model-profile-known`, `heuristic`, `unknown`. Unknown names normalize to `unknown`. Only the first and third may be binding, and only with `qualified: true`, a nonempty `qualificationId`, valid correlated identity, positive safe-integer `value`, `unit: "tokens"`, and a nonempty `tokenBasis`.

`qualified` / `qualificationId` represent an attestation by a future reviewed local source adapter. They do not authenticate a raw model claim, grant execution authority, or qualify LM Studio by themselves. Production exposes no capacity input option or discovery connection. Likewise, `model-profile-known` does not infer capacity from a model name; the caller must supply the exact qualified contract and binding.

Optional `instanceCount` must be a positive safe integer when supplied. A count greater than one is conservatively ambiguous, even if an instance label was supplied; A3b does not prove routing among multiple loaded instances. Ambiguity and stale flags must be booleans when supplied. There is no `loaded_instances[0]` selection in this seam.

Output has exactly these fields and is recursively frozen:

```text
{
  schema: "vela.provider-capacity-evidence.v1",
  sourceClass, correlation: ClosedIdentity,
  value: positiveSafeInteger | null, unit: "tokens" | null,
  tokenBasis: label | null, qualificationId: label | null,
  instanceCount: nonnegativeSafeInteger | null,
  ambiguous: boolean, stale: boolean,
  status: "known" | "conditional" | "ambiguous" | "stale" | "unknown",
  usable: boolean, reason: closedReason | null
}
```

A valid positive claim can remain in the summary with `usable: false`; only `usable` authorizes numerical use. `conditional` is an otherwise well-formed but unqualified source. Explicit ambiguity takes precedence over stale and malformed data. Correlation mismatch reports stale. Other invalid/missing data reports unknown.

Capacity reasons: `ambiguous-capacity`, `stale-capacity`, `invalid-source-flags`, `invalid-instance-count`, `missing-or-invalid-capacity`, `incompatible-unit`, `missing-token-basis`, `invalid-binding-identity`, `missing-binding-identity`, `correlation-mismatch`, `unqualified-source`, or null.

The implementation reads own data properties and does not call accessors. It projects only named fields; foreign text, native bindings and control records are not copied. As with the existing local APIs, arbitrary JS Proxy execution is not a security boundary provided by this data contract.

## 3. Exact decision input and projection

```text
decideContextBudget({
  correlation: Identity,
  capacity: RawCapacity | null,
  inputCost: {
    kind: "exact" | "bounded",
    value?, low?, high?, unit: "tokens", tokenBasis,
    certified: true, fullInput: true, methodId, correlation: Identity
  } | null,
  generationReserve: ReviewedReserve | null,
  safetyReserve: ReviewedReserve | null,
  bytes?: { canonicalUtf8Bytes, wireUtf8Bytes, messageContentUtf8Bytes },
  generationControls?: { maxTokens, thinkingBudgetTokens }
})
ReviewedReserve = {
  value, unit: "tokens", tokenBasis, reviewed: true, reviewId,
  correlation: Identity
}
```

An exact cost normalizes `low = high = value`. A bounded cost requires both finite nonnegative safe-integer inclusive bounds, `low <= high`, and certification of the complete serialized model input, including applicable template/schema overhead. `methodId` identifies the reviewed accounting/bounds contract; the interval carries its certified uncertainty. Byte measurements, partial message token counts, uncertified estimates and historical usage cannot supply that certification. No tokenizer or estimator is implemented here.

G and S each require a reviewed nonnegative safe integer, review identifier and matching identity/basis. An explicitly reviewed zero is allowed; absent or invalid values never become zero or Infinity. G is combined generation headroom, not M or R. No field automatically derives G from generation controls.

Closed output:

```text
{
  schema: "vela.provider-budget-decision-evidence.v1",
  authorityCapable: false,
  correlation: ClosedIdentity,
  capacity: NormalizedCapacity,
  inputCost: { kind, low, high, unit, tokenBasis, methodId,
               fullInput, usable, reason },
  generationReserve: { value, unit, tokenBasis, reviewId, status, usable, reason },
  safetyReserve:     { value, unit, tokenBasis, reviewId, status, usable, reason },
  bytes: { canonicalUtf8Bytes, wireUtf8Bytes, messageContentUtf8Bytes,
           unit: "utf8-bytes", tokenConversion: null },
  generationControls: { maxTokens, thinkingBudgetTokens, reserveDerived: false },
  disposition, inputBudgetTokens: nonnegativeSafeInteger | null,
  proof: { fullFit: boolean, inputFit: boolean, inputOverflow: boolean },
  dispatch: "allow-current-shape" | "allow-proven-fit" | "reject-required-construction",
  optionalExpansion: false
}
```

Input cost `kind` is exact/bounded/unknown; invalid cost has null low/high and `fullInput: false`. Its reasons are `unknown-token-cost`, `invalid-input-bounds`, `incompatible-unit`, `missing-token-basis`, `uncertified-full-input`, the three identity-validation reasons above, or null. Reserve status is known/unknown; reasons are `unknown-reserve`, `incompatible-unit`, `missing-token-basis`, `unreviewed-reserve`, the identity reasons, or null. Unknown scalar values and absent labels are null. Byte numbers are nonnegative safe integers or null, never tokens.

| Disposition | Proof / dispatch meaning |
| --- | --- |
| `unassessed-capacity` | C unavailable/unqualified/invalid; current-shape compatibility |
| `ambiguous-capacity` | serving source ambiguous; compatibility |
| `stale-capacity` | explicit stale or capacity identity mismatch; compatibility |
| `unassessed-input-cost` | C usable but complete correlated cost unavailable; compatibility |
| `unassessed-generation-reserve` | C/I comparable, no definite overflow, G unknown/unreviewed; compatibility |
| `unassessed-safety-reserve` | G usable but S unavailable/unreviewed; compatibility |
| `incompatible-token-basis` | usable operands disagree on basis, or cost/reserve uses incompatible unit; compatibility |
| `full-fit` | qualified C, certified I_high and reviewed G/S share identity/basis; I_high <= C-G-S; allow-proven-fit |
| `required-input-overflow` | comparable certified I_low > hard C, irrespective of G/S; reject-required-construction |
| `fit-not-established-under-bound` | all operands qualified/comparable but upper bound exceeds allocation, or reserves leave no nonnegative allocation; reject-required-construction |

C's invalid unit remains `unassessed-capacity`, with its own `incompatible-unit` reason. The top-level disposition identifies the first decisive missing operand; every operand retains its reason. `inputFit` requires I_high <= C and does not prove generation fit. `inputOverflow` requires I_low > C; an upper bound over C alone does not prove physical overflow. Input-only proofs need no G/S basis agreement. Full-fit does.

Reserve comparisons precede subtraction so even MAX_SAFE_INTEGER operands cannot cause unsafe arithmetic. If reserves exceed C, `inputBudgetTokens` remains null; this is an explicit allocation failure, not an invented zero budget. The bounded failure is conservative refusal to establish fit, not a claim of exact physical overflow.

`dispatch` is a pure local disposition. A3b does not add a public Protocol error, caller-injectable production operands, or real numeric rejection branch. The focused suite consumes synthetic rejection before a simulated dispatch. Future qualification and live consumption of numerical rejection remain a separately reviewed integration step; current `start` always gets the explicit compatibility result.

## 4–7. Current production operands and behavior

Production capacity source: **none qualified**. Readiness's existing contextLength and first-loaded-instance behavior are untouched and never supplied to policy. No `/api/v1/models` invocation probing, new network request, storage, readiness/enablement change or model-name inference.

Token input cost: **unknown**. Exact bytes remain exact bytes. Passing Transport byte checks does not prove model-window fit.

G and S: **unknown**. Actual qwen3.5-4b M/R are preserved: ordinary text 8192/6144, structured 4096/2048. Other models retain existing fields/default behavior. `max_tokens = 8192` does not produce a zero input allocation.

Compatibility preserves current system/profile instructions, response contract, grounding, objective, schema, stream flag, M/R, captures and admission. There is no truncation, optional expansion, retry, generation reduction, branch fallback, history/trajectory/Session injection or selector even in a synthetic spare-capacity decision.

## 8–10. Synthetic proofs, correlation and A2 relationship

[`test-vela-capacity-budget.js`](../../scripts/test-vela-capacity-budget.js) exercises C=1000, certified [600,700], reviewed G=200/S=100: full fit at I_max=700. Raising I_high to 701 produces conditional allocation failure. I_low=1001 proves required-input-overflow even with G/S unknown; a simulated consumer records zero dispatches. These are explicitly synthetic units/contracts, not measurements of any real model.

Every identity field is switched independently for capacity, input cost, G and S: endpoint, model, profile, requestId, Provider generation, instance, instance config, backend contract, sampling boundary, runtime/config revision. Old operands cannot bind by model string alone. Missing required identity, malformed optional identity, one-sided revisions, explicit stale completion and multiple instances fail numerical use.

Adapter stores only its latest immutable decision. Controller clears its separate projection at the start of a new non-inflight send and publishes only after the current guarded construction. Cancel/invalidate/timeout leave an already closed snapshot as historical invocation evidence; a subsequent invocation replaces it. Late results do not republish it. Cancellation before closure has no decision. Reload recreates these locals; no persistence or authority restoration.

A2's `vela.provider-input-evidence.v1` snapshot is never augmented or mutated. The separate projection carries matching requestId, Provider generation, model and profile plus endpoint/construction boundary. Its unavailable serving-instance identity remains null. No native binding, Review, Authority, nonce, TaskRun, raw reasoning or request text enters this projection. Debug getters expose it only with `debugContextEvidence: true`; policy still runs with that flag false. A test-only call counter verifies the actual production policy entry without replacing operands or result.

## 11. Pre/post equivalence evidence

[`vela-capacity-budget-baseline.json`](../../scripts/fixtures/vela-capacity-budget-baseline.json) was captured before A3b edits from baseline `1848720` using the existing deterministic A2 harness. It records canonical JSON, actual Transport wire JSON, Host requests and complete admission results for nine cases: text, proposal, logical plan, three qwen streaming profiles, no selection, unavailable context, unavailable property capture.

Post-A3b tests compare byte-for-byte canonical and wire strings and deep-equal captures/results. Wire equality covers messages, response schema, stream flag and generation policy. Debug-off requests/captures/results also match. A2's independent pre-A2 equivalence suite still passes. These fixtures use mocked Host and transport responses, not real AE/LM Studio evidence.

## 12. Validation

All 18 focused suites PASS, **2,353 assertions** in total:

| Script (`scripts/test-vela-*.js`) | Assertions |
| --- | ---: |
| capacity-budget | 425 |
| provider-context-evidence | 241 |
| provider-controller (includes native readiness fixtures) | 157 |
| provider | 297 |
| protocol | 195 |
| provider-production-e2e | 333 |
| provider-branch-profiles | 70 |
| surface-controller (includes Surface readiness) | 239 |
| surface | 162 |
| response-budget | 38 |
| prompt-stability | 24 |
| provider-stream-equivalence | 9 |
| provider-stream-lifecycle | 14 |
| provider-stream-publication | 23 |
| transcript-reasoning | 12 |
| presentation-model-streaming | 17 |
| local-transport | 30 |
| native-assistant-output | 67 |

Also PASS: changed JS syntax (Adapter, Controller, focused suite), project consistency, generated i18n freshness and `git diff --check`. The generated report required no edit. Runtime/Driver wiring and loader/global registration did not change; no full offline suite or real qualification run was invoked.

## 13–17. Changed files, acceptance and handoff

Production files changed: [`velaProviderAdapter.js`](../../client/js/vela/velaProviderAdapter.js), [`velaProviderController.js`](../../client/js/vela/velaProviderController.js). Added one focused test and one baseline fixture. Added this report and updated current PROJECT_STATE / canonical roadmap. No Host, Transport, Prompt, schema, Protocol, Parser, Intent Gate, Review, Authority, Execution or frozen architecture edits.

Real LM Studio acceptance: **not required for this scoped slice; deferred**. No discovery path, actual capacity-based dispatch, wire or generation behavior changed. Qualifying routing, numeric operands or live rejection would require targeted real Provider evidence and a focused scope.

Real AE acceptance: **not required**. Host/capture wiring and behavior are unchanged, with offline sequence equivalence. No AE operation was performed or claimed.

Architecture amendment: **NONE**. [Frozen Agent architecture](../design/vela-agent-architecture.md), A1 ownership/freshness boundaries, A3a decisions and sealed 0.3.7–0.3.9 semantics remain in force. Multi-conversation, temporal history, AE capability expansion and request-to-Review continuity are not part of this implementation.

Remaining design/evidence work: exact-instance routing among multiple loaded instances; reviewed provider/model full-window basis; certified complete-input accounting (including backend overhead); empirically justified combined G and S; semantics of live near-capacity rejection; future optional selection under A1. This seam supplies none of those missing facts.

Git handoff: HEAD remains the baseline on the task branch; 4 tracked files modified and 3 new files untracked (the two production files, PROJECT_STATE, roadmap; focused suite, fixture, this report). No staging, commit, push or PR. Production diff is limited to the two named JS files; production diff is intentionally nonzero for A3b. Frozen architecture and Host diffs are zero.
