# Vela 0.3.6 Delegated Authority Closure

Status: release reconciliation record. This document does not amend the frozen `vela-agent-architecture.md` baseline and does not define 0.3.7 behavior.

## Production scope

Version 0.3.6 implements explicit bounded delegation and one production-reachable pilot:

| Component | Status | Owner |
|---|---|---|
| DelegationGrantStore | IMPLEMENTED / PRODUCTION-REACHABLE | Runtime-local Authority Plane; sole live grant authority |
| DelegationPolicyEngine | IMPLEMENTED / PRODUCTION-REACHABLE | Trusted local policy |
| AuthorityEvidenceResolver | IMPLEMENTED / PRODUCTION-REACHABLE | Trusted Session-history resolver |
| DelegationAuthorityCoordinator | IMPLEMENTED / PRODUCTION-REACHABLE | Atomic grant/evidence transitions and rollback |
| AuthorizedPlanAuthorityProducer | IMPLEMENTED / PRODUCTION-REACHABLE | Trusted PolicyDecision-to-AuthorizedPlan boundary |
| AuthorityActivationGate | IMPLEMENTED / PRODUCTION-REACHABLE | Reservation and authority correlation |
| AtomicActivationCoordinator | IMPLEMENTED / PRODUCTION-REACHABLE for the pilot; generic N-step use DORMANT | Atomic delegated activation |
| Delegated materialization and BoundPlan activation | IMPLEMENTED / PRODUCTION-REACHABLE for one-shot opacity | Materializer and activation coordinator |
| TaskRun arm hardening and execution commit port | IMPLEMENTED / PRODUCTION-REACHABLE | TaskRun / ExecutionPreflight |
| Canonical Authority Plane composition | IMPLEMENTED / PRODUCTION-REACHABLE | VelaRuntime; one Session, Store and composition |
| Post-commit Session publishing and authority diagnostics | IMPLEMENTED / PRODUCTION-REACHABLE | Runtime Authority projection |
| Explicit consent and revoke | IMPLEMENTED / PRODUCTION-REACHABLE | Vela SurfaceController → trusted Runtime API |
| Compiler-to-Policy routing and one-shot `set-opacity-v1` | IMPLEMENTED / PRODUCTION-REACHABLE | ProviderController / Runtime |
| Successful `localProposal` settlement | IMPLEMENTED / PRODUCTION-REACHABLE | ProviderController / SurfaceController |
| Generic Delegation Sheet, persistent grants and autonomous loop | DEFERRED | 0.3.7+ or later focused scope |

## Frozen acceptance

The policy evaluates capability, operation family, exact task/session, scope, risk ceiling, remaining budget, expiry and trusted provenance. Its results remain `ALLOW`, `REVIEW_REQUIRED`, or `DENY`. A bounded mutation may reach `ALLOW` for the first time, but `ALLOW` is not execution authority. Every mutation still crosses AuthorizedPlan production, atomic activation, fresh JIT binding, Guard, PlanStore reservation, authority consumption, ExecutionAdapter and Host validation.

The production pilot is fixed to `set-opacity-v1`, `mutate`, `selected-layer`, risk ceiling `write`, `maxActions = 1`, 60-second expiry, exact current Session, Runtime-owned pilot task, `local-user` provenance, and no persistence.

## Authority invariants

Model and Provider cannot issue grants or forge trusted ActionCandidate, PolicyDecision, AuthorityEvidence, AuthorizedPlan, ActivationReservation or ActivatedTask. They cannot call Host directly. Trusted identities remain private through module-local `WeakSet`/`WeakMap` provenance.

`Policy ALLOW ≠ execution authority`, `AuthorizedPlan ≠ final native binding`, and `ActivationReservation ≠ Host permit`. The commit order remains fresh JIT → Guard → PlanStore reserve → authority consume → Host.

## Grant lifecycle and evidence

Issue, revoke, expire, consume, reset, suspend, dispose and AE restart all fail closed. Grants are process-local and Session replay cannot reconstruct Store authority. The Session whitelist remains `permission/decided`, `delegation/granted`, `delegation/revoked`, and `task/execution-armed`; no event kind was added.

AuthorityEvidence is trusted historical evidence, never live authority. If `delegation/granted` append fails, issue rolls back Store authority without fabricating revoke evidence. If append succeeds but evidence resolution fails, Store authority is immediately revoked and trusted `delegation/revoked` is attempted. If rollback evidence append also fails, Store stays revoked and the caller receives a stable degraded-provenance error. Post-commit publishing never restores authority.

## Budget and failure settlement

One delegated action slot means one Host mutation attempt that crossed the execution commit boundary. Precommit failure does not consume. Postcommit failure consumes and never refunds. This includes expression failure after commit, Host rejection, CAS/postcommit failure and result-verification failure according to their captured commit witness.

## Selection and CAS acceptance

For semantic `selected-layer`, selection changing before fresh binding may bind the new current selected layer. This is accepted dynamic current-selection behavior inherited from 0.3.5-C2. It is distinct from executing a stale native target; stale bound targets must fail closed.

The JIT-capture-to-Host-CAS window is too short for a deterministic manual race. A manual value change followed by the requested mutation proves only that the change preceded fresh capture. Release acceptance therefore relies on Tier-3 capture, Preflight, Host expected-value CAS and Adapter/Host witness regressions. No production debug race hook is added.

## Timestamp contract

Authority timestamps are epoch milliseconds: finite, integer, non-negative, not negative zero, no greater than `Number.MAX_SAFE_INTEGER`, and `expiresAt > issuedAt`. Generic bounded protocol numbers keep their original application range; timestamp support does not widen opacity or other parameter schemas. Realistic-clock tests are retained.

## Successful localProposal settlement

Trusted delegated success follows `localProposal → delegated execution success → local-proposal-handled → Surface completed`. It requires no assistant text and does not manufacture model success copy. Malformed responses, invalid proposals, Policy denial and execution failure retain their error semantics.

## Production reconciliations

Stale Runtime initialization from an old Core generation is cancelled/disposed and cannot report `LIFECYCLE_BLOCKED` into the current generation. A retryable Registry failure publishes `retrying`, not terminal `failed`; exhausted retry publishes `failed` with the real warning and sanitized Host details.

Authority modules are loaded canonically by `VelaCepModuleLoader`, with `VelaRuntime` last. There are no duplicate direct script tags. Runtime uses the exact Agent Session, one GrantStore and one canonical Authority composition.

## Explicit deferrals

0.3.6 does not include AgentDriver, Observe → Reason → Act, Verify/Replan, autonomous retry, no-progress detection, generic Delegation Sheet, persistent grants, multi-capability delegation, multi-step delegated budgeting, autonomous task production, Session intelligence/compaction, or a generic N-step Plan Review producer/surface. These require 0.3.7+ or a later focused stage.
