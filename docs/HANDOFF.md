# HANDOFF.md

## Current handoff — 0.3.5 release-prepared candidate

Lomond Cabinet version **0.3.5** has completed feature development and release preparation on `release/0.3.5`.

- Product metadata / Host `projectVersion`: `0.3.5`
- Latest published release/tag: `0.3.4` / immutable `v0.3.4`
- Final 0.3.5 AE release smoke: **PENDING**
- `main` publication and `v0.3.5` tag: **NOT YET PERFORMED**
- Next action: **final 0.3.5 AE release smoke**

Do not begin G2/H2 or enable production multi-step during release work.

## Completed 0.3.5 scope

The Planning + Authority Contracts Foundation completed A through H1:

- Planning / Authority contracts and CapabilityCompiler;
- Legacy Authority Bridge and trusted local `PolicyDecision` compatibility wiring;
- ordered one-to-eight-step PlanStore invariants and per-step JIT binding;
- AuthorizedPlanMaterializer, TaskRun-owned `executionArmed`, and dormant PlanController orchestration;
- immutable review-safe PlanReviewProjection and production-loaded read-only ReviewRuntimePort;
- shared PlanStore / ExecutionPreflight mutation-safety spine;
- suspend, reset-session, and dispose invalidation.

The frozen architecture remains [`docs/design/vela-agent-architecture.md`](design/vela-agent-architecture.md), **FROZEN FOR 0.3.x**, with zero release-preparation changes.

## Production reality and deferral

Production remains behaviorally single-step:

```text
Provider single proposal
→ legacy Controller
→ existing ConfirmationView
→ approve/reject
→ executeStep(0)
```

The PlanController stack is loaded and runtime-owned but dormant. There is no production AuthorizedPlan producer, accept/confirm/run facade, synthetic producer/debug hook, plan-review Surface, reachable armed TaskRun, or production N-step execution.

Production multi-step execution is deferred by design. A later real producer must establish exact revision-bound informed review and connect confirmation to the same immediately runnable PlanController safety gate. Human-confirmed one-shot multi-step execution does not inherently require delegation; the deferral reflects the absence of an in-scope legitimate producer and consumer.

## Safety invariants

- TaskPlan cannot enter the Execution Spine.
- Model output cannot become authority.
- AuthorizedPlan contains no trusted native binding.
- Final target and value binding remains per-step JIT.
- TaskRun alone owns `executionArmed`.
- Surface remains consumer-only.
- ReviewRuntimePort is correlation-only; tokens are not authority.
- No production PlanController accept, confirm, or run path exists.
- No autonomous loop, retry, replan, or rollback was introduced.

## Verification baseline

Run the complete Vela and repository test inventories plus version, manifest, Host project-version, generated-report, i18n, production-wiring, loader/bootstrap, Host JSX, project-consistency, and `git diff --check` gates.

Known workstation exception:

```text
PRE-EXISTING WORKSTATION EOL FIXTURE FAILURE
```

With `core.autocrlf=true`, the Provider branch-profile JSON fixture is checked out with CRLF rather than its frozen LF bytes. Do not modify the fixture, expected hash, or line-ending policy during release preparation.

## Final AE release smoke

Perform a full AE restart and verify Host `projectVersion` 0.3.5; Vela startup; Provider manual opt-in; ordinary chat and Active Composition reads; legacy single-step opacity review/confirm/mutation; cancel; selection and value drift safety; visibility suspend/resume; panel close/reopen; runtime reset/reload; no plan-review UI, unexpected pending plan, or reachable production N-step path; Console warnings/errors `0/0`; and a second full restart with the key mutation repeated.

Do not inject a synthetic AuthorizedPlan for release acceptance.

## Release flow after acceptance

```text
release/0.3.5
→ final AE release acceptance
→ PR into dev
→ dev → main
→ annotated immutable v0.3.5 tag
→ mandatory post-release documentation reconciliation
→ synchronize main and dev
```

Do not commit, push, merge, tag, or publish as part of the current Codex release-preparation task unless separately authorized. Published tags must never be moved.
