# Vela Agent 0.3.4 Closure

Status: implementation closure and release reconciliation record. This document does not amend `vela-agent-architecture.md`, add 0.3.5 Authority behavior, or declare 0.3.4 published.

## 1. Scope

Version 0.3.4 completes the **Observation + Capability Foundation** through Active Composition Observation, Prompt Stable Prefix Reconciliation, and Capability to Registered Action Mapping. Planning and Authority remain outside this release.

## 2. Final architecture map

| Layer | Final 0.3.4 ownership |
| --- | --- |
| Session Runtime | Typed in-memory events and deterministic projections; no authority |
| Agent Runtime / Scope | Session, scope, turn and invocation lifecycle identities |
| Observation Runtime | Single-flight refresh, cancellation, freshness and accepted facts |
| Agent Capability Registry | Validated `read` and `analyze` definitions and availability |
| Capability Runtime | Closed invocation/result envelopes and adapter boundaries |
| Host Read Serializer | FIFO serialization of Host reads |
| Active Composition Capability | Local read-only `observe-active-composition-v1` projection |
| Context Bridge | Tiered Context validation, Host routing and freshness inputs |
| Provider Controller / Adapter | Request-profile selection, bounded transport and response lifecycle |
| Prompt Builder v4 | Stable system contracts and turn-dynamic response/grounding layers |
| Mutation Capability Contracts | Canonical mutation parameters and local action identity mapping |
| ActionValidator | Actual registered-action existence, risk, scope and executability |
| Mutation Safety Spine | Review through Host mutation authority |

## 3. Registry ownership

Capability Definition, Capability Availability, Registered Action and Execution Authority are distinct states.

- The **Agent Capability Registry** owns read/analyze capability definitions and runtime availability.
- **Mutation Capability Contracts** own canonical mutation parameters, model-supply limits and optional local registered-action identity.
- The **ActionValidator registry** owns whether that action actually exists, its risk/scope metadata and whether it is executable.

Resolving a mapping does not grant permission or authority.

## 4. Observation / Context semantics

Observation reads are one-shot, single-flight and cancellable. Accepted snapshots carry bounded freshness and provenance; refresh failures remain closed. Structured Context can enrich a request or bind a later trusted target, but Context freshness and eligibility are not mutation permission. Observation state is not an authority token and does not accumulate an unbounded history.

## 5. Prompt layering

Prompt Builder v4 uses:

```text
GLOBAL STATIC CONTRACT
→ PROFILE-STABLE SYSTEM CONTRACT
→ TURN-DYNAMIC RESPONSE CONTRACT
→ TURN-DYNAMIC TRUSTED GROUNDING
→ USER INPUT
```

The emitted order is `system → assistant → user`. Request id, model identity, Context, grounding and user input do not enter the stable system prefix.

## 6. Union semantics

The bounded transition is:

```text
provisionalProfile == text-only
&& contextUnionEligible
→ proposal-capable-union
```

The Union profile is not produced directly by lexical classification. Context enrichment may occur during ordinary conversation and still grants no mutation authority.

## 7. Capability to Action mapping

The `set-opacity-v1` Mutation Capability Contract resolves locally to:

```json
{
  "toolId": "vela",
  "actionId": "set-opacity-v1"
}
```

The model cannot supply this identity. Runtime startup cross-validates it against ActionValidator, and canonical parameters remain contract-owned. Mapping lookup is identity resolution only.

## 8. Mutation safety boundary

The only mutation path remains Provider response, Parser, Intent Gate, Proposal Router, local mapping and canonicalization, trusted Context target binding, candidate, Review, Confirmation, freshness/permission/replay/reservation checks, Preflight, ExecutionAdapter, ContextBridge, Host validation and After Effects mutation.

The model cannot supply target identity, nonce, confirmation, registered-action identity, Host payload or execution authority.

## 9. AE native reference lifecycle constraint

A saved After Effects native object reference cannot be assumed safe for permanent comparison across Project lifecycle transitions. Host Context therefore retains the prior Project reference, checks `isValid()` when available, guards strict identity comparison, and conservatively increments project generation when validity or comparison cannot be trusted. Generation overflow latches session-reset-required semantics.

## 10. Diagnostics

Provider `lastTerminal*`, Context `lastContext*`, closed Host read-failure stages and Active Composition diagnostics provide developer lifecycle observability only. They are bounded, closed and last-only; they retain no raw prompt, raw Provider response, grounding, Host payload, project path, native object or authority.

## 11. Qualification / portability

Qualification JSON fixtures use the repository policy `scripts/fixtures/**/*.json text eol=lf`. Frozen raw-byte hashes therefore bind canonical LF Git content across Windows and Unix checkouts. Historical qualification meaning and evidence remain unchanged.

## 12. Final verification

- Full Vela inventory: **49/49 suites PASS**.
- Context Host: **292 assertions PASS**, including LF/CRLF-stable assignment-failure injection.
- JavaScript syntax, Host/version, Execution Host, Grid Host, registry transaction, i18n, consistency and whitespace gates: **PASS**.
- Integrated AE evidence: Active Composition lifecycle/freshness, Provider and Prompt paths, Project transitions, mapped proposal approval/rejection/cancellation and approved opacity mutation: **accepted for release preparation**.
- Project-owned AE Console warnings/errors: **0/0**.

The final Context Host portability correction was test-only, so it did not invalidate the accepted production AE evidence. A final release smoke remains the explicit pre-publication acceptance step.

## 13. Explicit 0.3.5 deferrals

The following are not implemented by 0.3.4: Planner, autonomous AgentDriver loop, TaskPlan, TaskRun authority semantics, TaskState authority, DelegationGrant, Policy Engine, process-local `executionArmed`, authority tokens, automatic execution, retry scheduling, task priorities and generic mutation Agent capabilities.

Version 0.3.5 must begin with a read-only scope and architecture audit before any of these are implemented.

## 14. Historical documents

`vela-agent-architecture.md` remains the **FROZEN FOR 0.3.x** normative baseline and is unchanged by this closure. `vela-agent-deferred-0.3.4-constraints.md` remains historical/deferred evidence of the implementation constraints that guided 0.3.4; it is not rewritten here.
