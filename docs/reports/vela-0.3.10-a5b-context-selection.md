# Vela 0.3.10-A5b — Bounded Context Selection Evidence

Status: COMPLETE / OFFLINE INTEGRATION PASS (evidence-only). This is eligibility/omission evidence, **not model-visible history or memory**.

Immutable pre-A5b baseline: `8eeb211d0c6a6fa0c6033b271f238529eb78cb46`, captured before production edits. Branch: `feat/vela-context-selection-evidence-a5b-0.3.10`. Normative [A5a contract](../design/vela-context-selection-0.3.10-a5a.md) is unchanged. A4 real AE acceptance is the user-confirmed baseline; no historical acceptance artifacts are invented here.

## 1. Implementation and ownership

The stateless A5 `evaluateContextSelection` function is colocated in [ProviderAdapter](../../client/js/vela/velaProviderAdapter.js) beside the existing pure A3 decision functions. This avoids a new loader/global module. A5 semantic eligibility is separate from A3 resource decisions and Adapter request construction: the evaluator returns data only and its result is never read by `buildRequest`, `assembleMessages`, `buildOpenAiBody`, Transport or admission.

[AgentRuntimeOwner](../../client/js/vela/velaAgentRuntimeOwner.js) retains canonical A4 trajectory source. [Runtime](../../client/js/vela/velaRuntime.js) forwards a reporting-only source port on the existing Driver reasoning route. [ProviderController](../../client/js/vela/velaProviderController.js) owns one latest immutable selection companion and samples/finalizes it within the current invocation. A2 still describes only actual selected input. No history store, event bus, persistence service or UI was introduced.

## 2. Exact output schema

`schema="vela.provider-context-selection.v1"`, `policyRevision="vela-terminal-history-policy-v1"`, `authorityCapable=false`, `mode="evidence-only"`, `sampleBoundary="invocation-construction"`.

| Field | Exact contents / meaning |
| --- | --- |
| correlation | requestId, controllerGeneration, sessionId, objectiveId, unavailableReason. Missing ids remain null; unavailableReason is null or source-unavailable. |
| source | slot=most-recent-terminal; projectionId/objectiveId/sessionId or null; state=available/unavailable/incomplete; reasons[]; bounds=null or {complete, omittedAttemptCount, omittedValueCount}. |
| requiredCurrent[] | Four {domain, disposition:preserve-current-construction} entries: system-profile-instructions, response-contract, current-user-objective, current-controller-grounding. No duplicate message text. |
| candidates[] | candidateId, sourceAttemptIndex, ordinal, attemptId, logicalStepIndex, materializationAttempt, sourceProjectionId, domain=terminal-verified-attempt, objectiveRelation=previous-terminal, trust, freshness, eligibility, reasons[], order, modelRepresentation, representationUtf8Bytes. trust/freshness are null unless the semantic gate succeeds, then locally-verified-outcome/D. |
| selectedItems[] | Always empty. There is no inclusion branch. |
| omittedItems[] | One {candidateId, reasons[]} per inventoried candidate, in registration order. |
| domainExclusions[] | {domain, reason, omittedCount:null}; fixed domains: agent-observation-currentContext, active-trajectory, session-history, presentation-transcript, prior-assistant-prose, notices-errors, raw-reasoning, prior-provider-declarations, a3-resource-evidence, authority-native-material. |
| budget | schema, requestId, disposition, optionalExpansion, basis, tokenBasis, omissionReason. Missing budget evidence stays unavailable/null. No capacity/instance/native owner object copied. |
| cost | eligibleRepresentationUtf8Bytes, selectedHistoricalUtf8Bytes=0, fullSelectedInputTokenCost=null, tokenConversion=null. Preview byte sum is not full-input token cost. |
| counts | inventoriedCount, eligibleCount, selectedCount=0, omittedCount, uninspectedCount, omittedBySourceCount. Unknown counts stay null; known source omission count is preserved when available. |
| bounds | complete, reportingOverflowCount. No required-input truncation or budget change. |

All output is recursively frozen. Each known inventoried candidate appears exactly once in omittedItems. No append/mutation API exists. Source/omission failures may yield a bounded unavailable summary; if both evaluator and fallback evaluation themselves throw, diagnostic evidence is null and the existing request continues.

## 3. Trusted source and invocation wiring

1. Owner creates a private inert source-port object during `createOwner`. Its private source registry binds the object to that Owner closure. Copies of its shape, copied A4 projections and constructor-validated JSON are not registered sources.
2. `attachAgentDriverRuntimePort` supplies the port through the one-time `attachSelectionSource` seam. Runtime holds it only for reporting and clears it on disposal.
3. Runtime constructs Controller with its existing **exactAgentSession object identity**. Driver `reason` forwards the source port as a separate local argument; it does not alter the Provider input object. Direct legacy `sendProviderMessage` has no objective source port and reports unavailable.
4. Controller calls Owner `sampleSelectionSource(port, exactSession)` once when the invocation begins. The port must be known, the session must be the identical live Session object, Owner must not be disposed, and the current Driver must have a nonterminal objective/turn whose session matches. No identity is inferred from presentationTurnId, Session seq or model generation.
5. Only the terminal slot is read. The sample includes current session/objective ids and that frozen terminal reference. It includes no active trajectory payload. Before construction closes, `isSelectionSampleCurrent` checks the captured local ownership; an invalidated source becomes unavailable. The check does not reread or substitute a newer terminal into the captured sample.
6. Adapter reports the already-computed A3 decision through `onSelectionBudget` before dispatch. Controller supplies its own generation and the actual Adapter-issued requestId. The callback returns no messages/body or dispatch decision. Selection observer failures are caught.

The private source/sample registries authenticate only this reporting route. **Selection evidence and candidate representations are never registered in them or any Authority/Review/native registry.** Calling the exported pure evaluator on synthetic data creates only unauthenticated local data; Controller has no caller-supplied trajectory-input path. Session object identity is checked, not serialized into evidence.

## 4. Eligibility behavior

The source must have exact A4 schema/non-authorizing marker, terminal lifecycle, no late enrichment, complete bounds and zero omitted attempts/values. Bounds are checked before attempting to inspect candidate rows. The closed A4 constructor then validates/copies safe primitive data; it is not the authentication mechanism. Malformed, conflicting or incomplete sources are not salvaged. Empty completed text terminals produce an available source with zero candidates; there is no backward search.

For full/partial mutation-bearing terminals, declared/completed/remaining counts must be known and coherent; Driver completion provenance is required. Every candidate needs completed/non-superseded attempt status, unambiguous identities, attempted fresh committed-target verified-match with targetRelation=committed-target, true matches, real Verify/observation ids, equal same-kind expected/actual values, and direct Preflight Verify provenance correlated to the observation id. Driver correlation/expected-value and derived completion provenance are required separately.

Capability validation reuses `validateRepresentationCapabilityParams`; only set-opacity-v1 and set-layer-name-v1 are mapped. Reduced receipts cannot replace direct evidence. Required unknowns/ancestor unknowns disqualify a claim; unrelated absent targetRef/providerRequestId/logical ids remain unknown without invalidating an otherwise supported past fact.

- Mutated requires executionAttempted=true, hostInvocationAttempted=true, reportedCommitted=true, hostCommitted=true, direct Adapter Host-commit evidence and direct execution/Host-entry evidence.
- Already-satisfied requires executionAttempted=true, hostInvocationAttempted=false, reportedCommitted=false, hostCommitted=null with explicit host-not-invoked and direct Preflight no-op evidence. Independent fresh Verify remains mandatory. It does not claim Vela changed the value.
- Rejected/cancelled/blocked partial parents preserve an eligible completed step; later unverified or unfinished steps have no model preview.
- Unproven delegated current-selection Verify, mismatch/unavailable/not-run Verify, uncertain mutation commit, supersession, missing provenance/value, unsupported mapping and conflicts are ineligible. No weaker “maybe verified” claim is emitted.

## 5. Candidate representation

Fixed JSON field order:

```json
{
  "kind": "historical-verified-operation",
  "temporalClass": "historical-not-current",
  "freshnessClass": "D",
  "targetRelationToCurrent": "unproven",
  "ordinal": 0,
  "actionType": "set-opacity-v1",
  "result": { "kind": "number", "data": 60 },
  "operationDisposition": "already-satisfied",
  "verificationBasis": "local-committed-target-verified-match",
  "objectiveRelation": "previous-terminal",
  "objectiveOutcome": "rejected",
  "objectiveCoverage": "partial"
}
```

This is a **local preview only**. No request ids, native target identities, digests, grants, objective prose or raw A4 JSON are included. Equal facts from distinct attempts remain distinct and retain source registration order. Candidate ordinal/sourceAttemptIndex describe inventory order; preview ordinal describes eligible order.

Quotes, JSON-like syntax, markup-looking strings and instruction-like valid names remain typed JSON data. Existing name validation prohibits newline/control characters and strings over 256 UTF-8 bytes; A5 rejects them rather than weakening that contract. Historical verification proves a past result for the original attempt, not current selection identity, current AE state, permission or freshness for another execution.

## 6. Omission policy

Closed order: prohibited-source, deferred-source, source-unavailable, not-within-retention, incomplete-evidence, conflict, superseded, target-relation-unproven, verification-not-match, not-eligible, representation-overflow, budget-unassessed, optional-expansion-disabled, budget-omitted.

Semantic rejection reasons are recorded before budgeting; no budget reason is attached to a semantically ineligible candidate. Eligible candidates stay eligible even when omitted. Current unknown A3 operands yield budget-unassessed; synthetic full-fit with optionalExpansion=false yields optional-expansion-disabled; missing/miscorrelated A3 evidence yields source-unavailable. budget-omitted is reserved vocabulary, not a live selection operation. Prohibited domains are never collected just to count them.

## 7–9. A3, A2 and zero-selection proof

A3 normalization, resource inputs, generation policy and existing decision schema have zero semantic change. The new Adapter callback passes the frozen existing A3 decision independently of debug flags; no readiness contextLength, inferred G/S or byte-to-token conversion is introduced. The selector never grants expansion, including a synthetic full-fit decision. `selectedItems` is initialized to [] and never populated; counts.selectedCount and selectedHistoricalUtf8Bytes remain literal zero through every success/failure path.

A2 input/context snapshots and exclusion claims remain unchanged. The separate Controller `getSelectionEvidence()` getter and Runtime `getProviderSelectionEvidence()` facade expose safe frozen diagnostic data, following existing read-only diagnostics conventions; no UI/global debug object was added. Policy runs with debugContextEvidence on or off. Missing A2 debug snapshots do not disable evaluation or change A3 policy.

## 10–12. Equivalence, excluded content and Authority

[Focused tests](../../scripts/test-vela-context-selection.js) use a fixed pre-A5b Git commit and the [selection harness](../../scripts/fixtures/vela-selection-harness.js). The harness loads real production JS owners/modules on both sides, with deterministic simulated Host and Provider I/O. No baseline replacement, online fetch, model request or real AE execution occurs in tests. Existing A2/A3/A4 immutable baseline suites are unchanged.

Twenty-three scenarios compare complete canonical JSON on every dispatched invocation, A2 evidence where debug is enabled, exact wire JSON (therefore messages, role order, schema, model, stream and M/R), Host/capture requests, fixture mutation/Undo/Verify counts, Provider admission state, Driver, Authority projection and Session records. Routes include native/streaming text, opacity/name proposals, native/streaming logical plan, unavailable grounding, no selection, no eligible history, all four mutation/no-op historical outcomes, three partial terminals, debug off, source/evaluator/observer failure.

Reasoning, assistant prose, Session payload and execution-native sentinels are absent from evidence/preview/wire history. Source access never reads PresentationModel or arbitrary Session events. Spare synthetic capacity does not change the exclusion set. Copied, forged, modified and JSON-roundtripped selection evidence and model previews fail AuthorizedPlan, TaskRun, Review, grant, Authority resolver and committed-target/native-handle boundaries. The false authorityCapable marker alone is not relied on for safety.

## 13. Lifetime, failure and bounds

Controller retains one latest companion, replaces it at invocation start and clears it on invalidation. Cancellation/late Provider results cannot mutate closed snapshots or overwrite a newer invocation. Replacing A4 terminal after sampling does not rewrite the sampled evidence. Owner disposal invalidates its source and clears diagnostic visibility; Runtime disposal drops Controller/source references; reload restores nothing. No A4 retention or cancellation/Host/Verify lifetime is extended.

Maximums: 16 candidates, 1,024 UTF-8 bytes per preview, 16 KiB combined previews, 64 KiB total output, 256 UTF-8 bytes per id/code/value string. Whole representations are omitted on preview overflow; oversized output becomes a bounded incomplete summary, never a truncated required message. Source overflow is rejected before candidate construction. Current two capability contracts constrain valid preview values more tightly than the final 1,024-byte guard: max-length quote-heavy strings exercise JSON escaping; longer/control-bearing strings fail the existing value/source gate first. No unsafe real-AE overflow/failure injection is performed.

## 14–19. Validation, files and closure

Focused suite: **724 assertions / 23 immutable pre-A5b production equivalence cases PASS**. Full offline regression: **175/175 runnable suites PASS, 0 skipped**. The final focused suite includes lost-source historical cases, excluded-domain payloads, closed-Session invalidation and complete canonical recording with debug off; all 724 assertions PASS. Vela forward/reverse/forward testing: 87/87 suites PASS in each round. Syntax for all seven changed/new JS files, project consistency, i18n freshness, local documentation links and whitespace/diff checks PASS. The only existing test edit updates Runtime's exact facade-key allowlist for the new read-only getter; existing behavior assertions and immutable baselines remain intact.

Exactly four production files changed:

1. [velaAgentRuntimeOwner.js](../../client/js/vela/velaAgentRuntimeOwner.js): private authenticated source/sample access and port attachment; A4 schema/fold unchanged.
2. [velaRuntime.js](../../client/js/vela/velaRuntime.js): source forwarding, exact Session association and read-only diagnostic facade.
3. [velaProviderController.js](../../client/js/vela/velaProviderController.js): invocation sampling, safe optional Owner dependency, companion publication/lifetime/getter.
4. [velaProviderAdapter.js](../../client/js/vela/velaProviderAdapter.js): pure A5 evaluator and observational A3 callback; request construction unchanged.

Other files: new focused suite/harness, one Runtime facade assertion update, this report and PROJECT_STATE/VELA_ROADMAP handoff updates. No Host, Authority, Execution, Verify, Parser, Intent Gate, PromptBuilder, Session, Presentation, loader list, A4 contract or frozen architecture changes.

Real LM Studio acceptance: **NOT REQUIRED** for this evidence-only scope, subject to exact wire/profile/admission equivalence PASS. Real AE acceptance: **NOT REQUIRED**, subject to unchanged Host/lifecycle behavior and offline equivalence. No model-visible history has shipped. Architecture amendment: **NONE**.

No commit, push or PR. The task branch remains uncommitted for review; staged diff = 0. Final git inventory: four modified production JS files, one updated Runtime facade test, two new test/harness files, two updated state/roadmap documents and this new report. Frozen architecture and A5a contract diff = 0. This feature's local data can describe eligible history but cannot insert it into model input or alter existing execution authority.
