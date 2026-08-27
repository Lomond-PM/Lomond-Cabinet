# HANDOFF.md

## Current handoff — 0.3.4 published baseline

Lomond Cabinet version **0.3.4** is released and published.

Current release state:

- product version: `0.3.4`
- immutable published tag: `v0.3.4`
- current development baseline: `dev`
- release branch: closed
- final Vela regression: **49/49 suites PASS**
- Context Host: **292 assertions PASS**
- final After Effects 2026 release acceptance: **PASS**
- Host `projectVersion`: `0.3.4`
- project-owned Console warnings/errors: **0/0**
- next phase: **0.3.5 Planning + Authority**

Version 0.3.4 closes the Observation + Capability Foundation. It is no longer a release candidate, and no final-AE or publication step remains pending.

## Next action

Do **not** begin 0.3.5 implementation directly.

The next recommended action is:

```text
latest dev
→ read-only 0.3.5 scope / architecture audit
→ reconcile against frozen architecture + 0.3.4 closure
→ define the first focused Planning/Authority slice
```

Do not jump directly into:

- Planner implementation
- TaskPlan / TaskRun authority semantics
- TaskState authority semantics
- DelegationGrant
- Policy Engine
- `executionArmed`
- authority tokens
- automatic execution
- generic mutation Agent Capability
- retry / scheduling / priority systems

The existence of future-facing comments or contracts does not grant runtime authority.

## 0.3.4 architecture closure

The completed release contains:

- Session / Agent / Scope foundations and turn identity;
- Observation Runtime with freshness, cancellation and single-flight ownership;
- read/analyze Agent Capability Registry and Runtime;
- typed invocation/result envelopes;
- FIFO Host-read serialization;
- structured Context and Active Composition observation;
- Prompt Builder v4 stable-prefix layering;
- bounded Provider / Context / Host lifecycle diagnostics;
- local capability-to-registered-action identity mapping;
- integration with the existing mutation safety spine;
- guarded AE native Project-reference lifecycle handling.

The critical authority distinction is:

```text
Capability Definition
≠ Capability Availability
≠ Registered Action
≠ Execution Authority
```

Mapping and Context eligibility do not grant mutation permission. Every mutation continues through the existing Review, Confirmation, freshness/permission/replay/reservation, Preflight, ExecutionAdapter, ContextBridge, and Host validation boundaries.

Read before 0.3.5 design work:

```text
AGENTS.md
README.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
docs/design/vela-agent-architecture.md
docs/design/vela-agent-0.3.4-closure.md
docs/design/vela-agent-deferred-0.3.4-constraints.md
```

`docs/design/vela-agent-architecture.md` remains **FROZEN FOR 0.3.x**. The 0.3.4 closure document is an implementation closure, not an Architecture Amendment.

## Vela Experimental Preview boundary

Vela remains experimental:

- Provider disabled by default;
- explicit session-only acknowledgement and enablement;
- loopback endpoints only;
- no qualified/recommended/default model;
- production activation locked;
- Vela Persistent Surface is the only Vela user entry;
- Provider enablement remains session-only;
- conversation/context persistence remains out of scope;
- no autonomous Agent loop;
- no generic mutation Agent Capability.

`observe-active-composition-v1` remains a local read-only capability. `set-opacity-v1` remains the only bounded mutation proposal fixture in the current safety path.

## Source of truth and junction setup

The workspace Git repository is the source of truth.

Primary Windows workspace:

```text
C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

Primary CEP development path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
```

In the main development environment, the CEP path is a Windows junction to the workspace.

Therefore:

- do not copy/sync files between workspace and Extensions during normal development;
- do not edit a stale secondary Extensions folder;
- reload the CEP panel after browser-side changes;
- restart After Effects when Host JSX remains cached.

## Git workflow

Normal focused development flow:

```text
dev
→ focused task branch
→ implementation / offline tests
→ AE acceptance when required
→ commit / push
→ PR into dev
→ merge / sync / branch cleanup
```

Formal release flow:

```text
dev
→ release/<version>
→ release preparation
→ final AE release acceptance
→ PR into dev
→ dev → main
→ annotated immutable version tag
→ mandatory post-release state reconciliation
→ main/dev synchronized
```

Published version tags must never be moved.

## Mandatory post-release state reconciliation

This step is now a formal release invariant because candidate-state documentation repeatedly remained stale after publication in earlier releases.

After every future version tag is created, publication is not administratively closed until all of the following are true:

1. `VERSION`, Manifest product versions and Host `projectVersion` match the published version.
2. The annotated immutable tag points to the accepted `main` release commit.
3. `README.md` says the new version/tag is published, not staged or pending.
4. `docs/PROJECT_STATE.md` identifies the new version as the released baseline and records final AE acceptance as complete.
5. `docs/HANDOFF.md` points development to the next phase instead of the closed release branch.
6. `main` and `dev` are synchronized onto the same post-release documentation commit.
7. Obsolete focused/release branches and completed external-worktree branches are removed when no longer needed.

The tag should continue to point to the original accepted release commit. Later documentation-only reconciliation commits must **not** cause the published tag to be moved.

## Current verification baseline

Canonical 0.3.4 release evidence:

- Vela inventory: **49/49 suites PASS**
- Context Host: **292 assertions PASS**
- Execution Preflight: **314 assertions PASS**
- Provider: **276 assertions PASS**
- Context Bridge: **258 assertions PASS**
- Capability Prompt Builder: **226 assertions PASS**
- Provider Model Qualification: **217 assertions PASS**
- Protocol / Parser: **159 assertions PASS**
- Capability Contracts: **147 assertions PASS**
- Prompt Stability: **25 assertions PASS**
- static / Host / i18n / project-consistency gates: **PASS**
- final After Effects 2026 release smoke: **PASS**
- project-owned Console warnings/errors: **0/0**

Detailed verification and architecture ownership are recorded in:

```text
docs/design/vela-agent-0.3.4-closure.md
CHANGELOG.md
```

## Historical releases

- `v0.3.4` — Observation + Capability Foundation; current published baseline.
- `v0.3.3` — Runtime Foundation; historical baseline.
- `v0.3.2` — integrated UI / Design System Foundation; historical baseline.

Historical implementation details belong in `CHANGELOG.md`, versioned closure documents, and retained design records rather than in the current handoff header.

## Current continuation point

Start from the latest synchronized `dev` branch.

The first 0.3.5 action should be a read-only audit that answers:

- what Planning objects actually need to exist;
- where authority decisions belong;
- how TaskRun / TaskState relate to existing Session and Agent scopes;
- how DelegationGrant and Policy Engine should remain distinct from capability availability and action mapping;
- how existing Review / Confirmation / Preflight / Host safety must constrain future Agent-driven execution;
- which frozen 0.3.x architecture statements remain normative versus deferred implementation detail.

Do not treat the completed 0.3.4 capability-to-action mapping as permission or automatic execution authority.
