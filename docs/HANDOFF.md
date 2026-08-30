# HANDOFF.md

## Current handoff — 0.3.6 release candidate

Lomond Cabinet **0.3.6 Delegated Authority** is release-prepared on `release/0.3.6`, pending final AE release smoke.

- Product metadata / Host `projectVersion`: `0.3.6`
- Latest published release/tag: `0.3.5` / immutable `v0.3.5`
- H2 real-AE delegated acceptance: **PASS**
- Registry retry retest and Console project-owned warnings/errors: **PASS / 0/0**
- Frozen architecture: **unchanged**

## Accepted production scope

The explicit one-shot `set-opacity-v1` pilot is production-reachable with exact Session/task binding, `selected-layer` scope, `write` risk ceiling, one action, 60-second expiry, `local-user` provenance and no persistence. Consent, revoke, expiry, consume, lifecycle invalidation, restart clearing, Policy fallback and successful `localProposal` settlement passed real AE acceptance.

Canonical ownership is VelaRuntime → exact Agent Session → one GrantStore → one Authority Plane composition. Authority modules load through `VelaCepModuleLoader`, with `VelaRuntime` last and no duplicate direct script tags.

## Safety handoff

- Model/Provider cannot issue grants, forge trusted authority objects, or call Host.
- Policy `ALLOW` is not execution authority; AuthorizedPlan is not native binding; ActivationReservation is not Host permission.
- The mutation spine remains fresh JIT → Guard → PlanStore reserve → authority consume → Host.
- Precommit failure does not consume; postcommit failure consumes without refund.
- Session evidence cannot restore live Store authority; the event whitelist is unchanged.
- Semantic current-selection rebinding is accepted before fresh binding; stale native bindings fail closed.
- CAS acceptance relies on deterministic offline capture/Preflight/Host/Adapter witnesses, not a production debug race hook.

## Deferred scope

Do not add AgentDriver, autonomous loops, Observe → Reason → Act, Verify/Replan, autonomous retry, persistent or generic grants, multi-capability or multi-step delegated budgeting, generic Delegation Sheet, Session intelligence, or generic N-step Plan Review production behavior during release work.

## Final AE release smoke

After all offline gates pass: fully restart AE; confirm panel startup and Host `projectVersion = 0.3.6`; Provider readiness and normal read; no-grant opacity human review; explicit consent; delegated mutation; one-shot consumption and second-request fallback; revoke or expiry spot-check; restart clears grants; canonical diagnostics; Console project-owned warnings/errors `0/0`.

Only after this smoke passes may 0.3.6 proceed to PR/publication flow. Do not commit, push, merge or tag as part of release reconciliation unless explicitly authorized.
