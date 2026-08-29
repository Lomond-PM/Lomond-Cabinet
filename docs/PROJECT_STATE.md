# PROJECT_STATE.md

## Current release-prepared baseline — 0.3.5

Version **0.3.5** is the current **RELEASE-PREPARED CANDIDATE** for Lomond Cabinet.

- Product metadata and Host `projectVersion`: `0.3.5`
- Release branch: `release/0.3.5`
- Latest published release/tag: `0.3.4` / immutable `v0.3.4`
- Final 0.3.5 AE release smoke: **PENDING**
- Publication to `main` and tag `v0.3.5`: **NOT YET PERFORMED**

The normative architecture remains [`docs/design/vela-agent-architecture.md`](design/vela-agent-architecture.md), marked **FROZEN FOR 0.3.x**. Release preparation does not amend it.

## 0.3.5 Planning + Authority Contracts Foundation

Completed stages:

1. **A — Planning / Authority Contracts**
2. **B — CapabilityCompiler**
3. **C — Legacy Authority Bridge + PolicyDecision production wiring**
4. **D1 — Multi-step PlanStore invariants**
5. **E1 — Per-step JIT Binding**
6. **F1 — AuthorizedPlanMaterializer + TaskRun + PlanController**
7. **G1 — PlanReviewProjection**
8. **H1 — Review-only Runtime Seam**

The foundation provides closed Planning and Authority contracts, ordered one-to-eight-step PlanStore behavior, per-step JIT target/value binding, AuthorizedPlan materialization, TaskRun-owned process-local `executionArmed`, dormant PlanController orchestration, immutable review-safe projections, and runtime-local read-only review correlation.

## Production behavior reality

F1/G1/H1 modules are production-loaded and owned by VelaRuntime, sharing the existing PlanStore and ExecutionPreflight safety spine. They are deliberately dormant.

The reachable production mutation path remains:

```text
Provider single proposal
→ legacy Controller
→ existing ConfirmationView
→ approve/reject
→ executeStep(0)
```

There is no production AuthorizedPlan producer, synthetic producer/debug hook, PlanController `accept` facade, plan-review Surface, production PlanController `confirm`/`run` path, autonomous loop, retry, replan, or rollback.

## Authority and execution boundaries

- `TaskPlan` cannot enter the Execution Spine.
- Model output and transcript text cannot become authority.
- `AuthorizedPlan` contains semantic intent but no trusted native target binding, Host payload, confirmation nonce, reservation, or execution authority.
- Every executable step performs final target and value binding just in time through Preflight, Guard, ExecutionAdapter, and Host validation.
- `executionArmed` is owned only by TaskRun and is unreachable in the 0.3.5 production path.
- Surface remains consumer-only and receives no PlanController or execution identity.
- ReviewRuntimePort performs correlation only; its tokens are not authority, permission, grants, nonces, or confirmation evidence.

## Production multi-step deferral

Production multi-step execution is **deferred by design** to a later version.

- No real producer belongs to the 0.3.5 roadmap.
- Actionable review requires an exact immutable, revision-bound informed review snapshot.
- Future production confirmation must enter the same safety gate as immediately runnable PlanController execution; it must not create an armed-but-not-runnable state.
- Future producer ownership belongs to later Authority/Agent orchestration work.

Human-confirmed one-shot multi-step execution does not inherently require delegation. The deferral exists because 0.3.5 has no legitimate production producer or consumer, not because every human-confirmed multi-step plan would require a DelegationGrant.

## Verification and known workstation baseline

Release preparation runs the complete Vela and repository test inventories plus version/manifest/Host consistency, loader/bootstrap production wiring, generated-report and i18n freshness, Host JSX checks, project consistency, and `git diff --check`.

On this Windows checkout, `core.autocrlf=true` causes the committed LF Provider branch-profile fixture to be checked out with CRLF bytes. The known direct-test and project-consistency failure is recorded as:

```text
PRE-EXISTING WORKSTATION EOL FIXTURE FAILURE
```

The fixture, expected hash, and line-ending policy must not be changed during release preparation.

## Next architectural stage

After publication and mandatory state reconciliation, later work may design a real production AuthorizedPlan producer, actionable whole-plan review ownership, and a confirmation-to-immediately-runnable execution gate. Planner, DelegationPolicyEngine, AgentDriver, autonomous execution, generic mutation Agent capabilities, retry/replan/rollback, and production N-step enablement remain outside 0.3.5.

The latest published tag remains `v0.3.4` until final AE release smoke passes, the accepted release reaches `main`, and an annotated immutable `v0.3.5` tag is created. After publication, reconcile README, this file, and HANDOFF from candidate language to the published baseline; record final AE acceptance; synchronize `main` and `dev`; and never move the published tag.
