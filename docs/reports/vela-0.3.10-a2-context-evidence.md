# Vela 0.3.10-A2 — Provider Context Assembly Evidence Seam

Status: implemented locally; no commit, push, PR or real AE acceptance. Baseline: `d0a0d4884b8cd361e4a8dc3bd6cc839720dc3b07` (clean dev with A1 merged). [A1 contract](../design/vela-context-architecture-0.3.10-a1.md) remains the Context design reference; [frozen architecture](../design/vela-agent-architecture.md) is unchanged. Architecture amendment: NONE. Vela 0.3.9 remains sealed.

## Implementation and ownership

- [ProviderController](../../client/js/vela/velaProviderController.js): explicit local constructor option `debugContextEvidence: true`; read-only `getContextEvidence()`. Default is off/null. No Runtime/Driver/UI/Settings wiring enables it automatically. It retains only the latest construction evidence, replacing it on the next valid send. This is a debug/test seam, not a history store.
- [ProviderAdapter](../../client/js/vela/velaProviderAdapter.js): same opt-in flag/getter; snapshots finalized canonical input and wire representation before dispatch. Construction failure records disposition without retaining rejected input. Selected snapshots never absorb response content or terminal state.
- [LocalTransport](../../client/js/vela/velaLocalTransport.js): stateless `getSerializedRequestEvidence(body)` returns the existing `trustedSerialize` representation only for an existing trusted outbound body. Plain serialized/copied bodies return null. Existing sendJson/readStream serialization and dispatch code are unchanged.

Evidence is data-only, recursively frozen, and is not accepted by any binding, permission, admission or execution API. It exposes no native target, property path, capture handle, grant, nonce or executionArmed value. The canonical request's pre-existing contextId/fingerprint/tier is retained as exact input evidence; it cannot recreate a private capture. Unchanged prompt text may contain prohibitions mentioning “nonce”; that is not nonce material.

No new module/global registry/loader path, Context owner, selector, persistence or lifecycle recorder was introduced. Runtime invocation/objective/session/turn identities remain explicit null because these constructors do not receive them through local wiring. Presence of an Agent elsewhere does not justify inferring those identities.

## Representation v1

Controller getter returns null when disabled/not yet closed, otherwise:

```text
schema: vela.provider-context-evidence.v1
authorityCapable: false
controllerGeneration: existing Controller generation
closure: closed | source-capture-failed | cancelled-before-construction-closure
         | budget-rejected | construction-failed
input: Adapter evidence or null
sources: exactly two AE source descriptors
exclusions: fixed list of uncollected domains
```

Each AE source descriptor contains `domain`, `producer`, `samplingBoundary`, `disposition`, `selectionReason`, `trustClass`, `sourceFreshnessClass`, `selectedRepresentation`, `selectedUtf8Bytes`, `omittedCount`, `errorCode`, `unavailableReason`.

`samplingBoundary` contains operation, order, attempted, captureId, hostInstanceId, hostReloadEpoch, projectGeneration, aeSampleTime, sampledAt, atomicWithOtherReads. Unknown/unexposed metadata is null; no identity is parsed out of a display id. `aeSampleTime` is the exposed AE sample time, not wall-clock time. Tier-1 does not expose projectGeneration directly in its public snapshot, so that field is null; the property capture exposes it. `sampledAt` is null. `atomicWithOtherReads` is false.

Adapter evidence:

```text
schema: vela.provider-input-evidence.v1
authorityCapable: false
closure: closed | budget-rejected | construction-failed
correlation:
  requestId, providerGeneration, model, profile
  runtimeInvocationId/objectiveId/sessionId/turnId: null
  unavailableReason: not-supplied-through-local-wiring
freshnessClass: B-invocation-selected
canonicalRequestJson: exact finalized canonical request serialization, or null
wireRequestJson: existing Transport serializer output, or null
wireEvidenceUnavailableReason: null or explicit unavailable/not-closed reason
budget:
  canonicalUtf8Bytes, wireUtf8Bytes, messageContentUtf8Bytes
  requestByteCeiling, messageByteCeiling
  tokenCost/modelContextCapacity: null; unknownReason
sources: instruction, local contract/envelope, caller-input representation references
errorCode: stable construction error or null
```

The three Adapter source entries identify system/profile instructions from PromptBuilder, the locally assembled response-contract/grounding envelope, and current caller input. Their representation references resolve within the retained canonical JSON. The two Controller AE entries record only the values actually used in the grounding projection. Controller and Adapter generations remain separate. Invocation-selected B retains observed-fact/A source classification only for accepted reads; unavailable source status is local control evidence, not a synthetic AE fact. Non-AE source freshness is not applicable (null).

Known costs use UTF-8. Source projected-JSON costs are not additive allocations of wire bytes: messages/contract/escaping have their own exact costs. No tokenizer, capacity assumption, truncation, input selector, compaction or generation-policy change exists. Adapter evidence has a 512 KiB serialized ceiling; valid canonical/wire inputs remain subject to their existing 64 KiB ceilings and the Controller adds only fixed-count bounded source metadata. No unbounded collection is maintained. Evidence construction failure is contained; it cannot replace a production error or create permission.

## Sampling and omission behavior

| Case | Evidence semantics |
| --- | --- |
| Normal selected layer | Tier-1 captureContext and optional capturePropertyValues have different capture ids and ordered independent sampling boundaries. |
| No selection | Tier-1 values selected; property source not-collected, attempted=false. |
| Upstream unavailable | Source disposition upstream-unavailable; actual legacy unavailable wire grounding retained, but no selectedRepresentation fabricates AE facts. |
| Property unavailable | Successful Tier-1 read recorded as not-selected-by-current-construction because current behavior falls back to the whole unavailable grounding; property source upstream-unavailable. |
| Malformed/capture failure | source-capture-failed; no Provider input or dispatch. |
| Cancel before closure | cancelled-before-construction-closure; input null. Attempted distinguishes an in-flight read from an unattempted source. |
| Existing construction budget rejection | budget-rejected; rejected payload not retained or dispatched. Controller validation failures before a valid invocation are not treated as constructed Provider inputs. |
| History/Observation/reasoning | Agent Observation, currentContext, Session, transcript, prior assistant text, raw reasoning and verified trajectory are not-collected by this construction. |

Unknown omission counts are null, never zero. Evidence does not claim the preceding Driver Observation was selected, that reads were atomic, or that the Tier-1 fingerprint covers the property value.

## Closure and races

Closure occurs after canonical input and body construction, before network dispatch. The closed selected-input object is never modified by stream start/delta/terminal, cancellation, timeout or late completion. Existing request lifecycle/diagnostics remain separate; this projection proves constructed input, not network delivery or model attention.

Before closure, cancel/invalidate can publish a separate construction disposition with no input. Generation checks prevent an old attempt from publishing over a later request. After closure the same immutable evidence remains available through terminal; next valid send replaces the latest reference. External test-held old snapshots remain immutable data, with no active owner capability. There is no new terminal/admission path.

## Before/after equivalence evidence

[Frozen baseline fixture](../../scripts/fixtures/vela-provider-context-evidence-baseline.json) was generated in memory from git objects for the pre-A2 Controller/Adapter at the baseline commit, using [deterministic offline harness](../../scripts/fixtures/vela-context-evidence-harness.js). No working-tree production file was replaced. The fixture records actual fetch body strings, exact Host request arrays and admission outcomes, not a digest substituted for inputs. Routine tests read this fixture and need no git/network access.

Nine cases: TEXT_ONLY, structured opacity, logical plan; streaming exact qwen3.5-4b text/proposal/logical policy; no selection; upstream unavailable; property unavailable. [A2 focused test](../../scripts/test-vela-provider-context-evidence.js) compares current enabled and default-off requests against pre-A2 exact wire strings, capture payloads/order and outcomes. This covers system/assistant/user content, response schema, stream flag, model and generation fields without changing serialization shape/order. The existing Transport sorts wire keys, so Adapter JSON.stringify(body) alone is deliberately not used as wire evidence.

## Validation

Focused tests: A2 241 assertions; Provider Controller 157; Provider Adapter 297; Protocol 195; production E2E 333; streaming lifecycle 14; streaming publication 23; response budget 38; transcript reasoning 12; presentation streaming 17; stream equivalence 9; LocalTransport 30; prompt stability 24; native assistant output 67. All passed. These are focused results, not full-suite requalification.

A2 covers capture failure, pre-closure cancellation, post-closure cancellation/timeout/invalidation, late fetch/Host/stream completion, next-request replacement and no invented correlation. An offline Owner/Driver/production Observation integration sends actual Controller reasoning events and asserts absence from Session, Observation, selected input and subsequent objective. Existing production E2E additionally covers reasoning exclusion from Runtime/Driver/Session and next request. No production Runtime wiring changed.

Additional required checks: changed-JS syntax, project consistency, generated i18n freshness, document link targets and git diff checks are reported in the task handoff. Host capture and request semantics are unchanged, so real AE acceptance is not required for this slice. No real AE/Provider run was performed. A3 retains unknown capacity/token policy; A4–A6 and 0.3.11 remain deferred under A1.
