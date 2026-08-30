# PROJECT_STATE.md

## Current release candidate — 0.3.6

Version **0.3.6 Delegated Authority** is release-prepared pending final AE release smoke. Product metadata and Host `projectVersion` are `0.3.6`. The latest published release/tag remains immutable `0.3.5` / `v0.3.5` until publication.

The normative [`vela-agent-architecture.md`](design/vela-agent-architecture.md) remains **FROZEN FOR 0.3.x** with zero release-reconciliation changes. The implementation record is [`vela-agent-0.3.6-closure.md`](design/vela-agent-0.3.6-closure.md).

## Production behavior

0.3.6 adds explicit, bounded, process-local delegation. The only production pilot is one-shot `set-opacity-v1`: `mutate`, semantic `selected-layer`, risk ceiling `write`, one action, 60-second expiry, exact current Session and Runtime-owned task, `local-user` provenance, and no persistence.

The canonical Authority Plane owns one DelegationGrantStore, DelegationPolicyEngine, AuthorityEvidenceResolver, DelegationAuthorityCoordinator, AuthorizedPlanAuthorityProducer, AuthorityActivationGate and AtomicActivationCoordinator. Compiler output enters trusted Policy routing. A valid grant may produce `ALLOW`; absent, invalid, expired, exhausted or revoked authority falls back to human review or fails closed.

`ALLOW` is not execution authority. Every mutation retains fresh JIT binding → Guard → PlanStore reservation → authority consumption → ExecutionAdapter → Host validation/CAS. Model and Provider cannot issue grants, forge trusted authority objects, or call Host directly.

## Lifecycle and budget

Issue, revoke, expiry, consume, reset, suspend, dispose and AE restart fail closed. Grants are never persisted or reconstructed from Session history. AuthorityEvidence is trusted historical evidence, not live authority. The Session event whitelist is unchanged.

One delegated action slot is one Host mutation attempt that crosses the execution commit boundary. Precommit failure does not consume; postcommit failure consumes and is never refunded.

The accepted semantic `selected-layer` target binds current selection at the fresh binding boundary. This differs from a stale native binding, which must fail closed. Manual value drift cannot reliably hit the short Host CAS window; release acceptance relies on Tier-3 capture, Preflight, Host CAS and Adapter/Host witness regressions.

## Runtime closure

Successful delegated `localProposal` settles as `local-proposal-handled` without fabricated assistant text. Stale Runtime initialization cannot report an old `LIFECYCLE_BLOCKED` into the current Core generation. Retryable Registry failure publishes `retrying`; exhausted retry remains terminal and diagnostic.

## Deferred beyond 0.3.6

AgentDriver, Observe → Reason → Act, Verify/Replan, autonomous retry, no-progress detection, generic Delegation Sheet, persistent grants, multi-capability delegation, multi-step delegated budgeting, autonomous task production, Session intelligence/compaction and a generic N-step Plan Review producer/surface remain deferred to 0.3.7+ or later focused work.

## Verification baseline

Release preparation runs every `scripts/test-*.js` suite plus JavaScript syntax, i18n report freshness, project/version consistency, frozen-architecture diff and `git diff --check`. This Windows checkout has a known `core.autocrlf=true` CRLF checkout mismatch for a frozen LF JSON fixture; the fixture, hash and line-ending architecture are not changed during 0.3.6 release work.
