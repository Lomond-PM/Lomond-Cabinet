# PROJECT_STATE.md

## Current released baseline — 0.3.4

Version **0.3.4** is the current **RELEASED / PUBLISHED BASELINE** for Lomond Cabinet.

Published state:

- product version: `0.3.4`
- immutable release tag: `v0.3.4`
- development branch: `dev`
- release branch: closed
- final Vela release gate: **49/49 suites PASS**
- Context Host: **292 assertions PASS**
- final After Effects 2026 release acceptance: **PASS**
- Host `projectVersion`: `0.3.4`
- project-owned Console warnings/errors: **0/0**

The 0.3.4 release is closed. It is no longer a release candidate and no final-AE or publication step remains pending.

The normative Vela architecture baseline remains [`docs/design/vela-agent-architecture.md`](design/vela-agent-architecture.md), marked **FROZEN FOR 0.3.x**. The implementation closure for this release is [`docs/design/vela-agent-0.3.4-closure.md`](design/vela-agent-0.3.4-closure.md).

## 0.3.4 Observation + Capability Foundation

The release completed three focused stages:

1. **0.3.4-A — Active Composition Observation**
2. **0.3.4-B — Prompt Stable Prefix Reconciliation**
3. **0.3.4-C — Capability → Registered Action Mapping**

Production now owns:

- lifecycle-bounded Session / Agent / Scope foundations;
- turn identity and typed invocation/result envelopes;
- Observation Runtime with freshness, cancellation and single-flight behavior;
- read/analyze Agent Capability Registry and Runtime;
- FIFO Host-read serialization;
- structured Context and Active Composition observation;
- Prompt Builder v4 stable-prefix layering;
- bounded Provider / Context / Host lifecycle diagnostics;
- local mutation capability-to-registered-action identity mapping;
- integration with the existing mutation safety spine;
- guarded AE native Project-reference lifecycle handling.

### Registry and authority ownership

The final 0.3.4 ownership split is:

```text
Capability Definition
≠ Capability Availability
≠ Registered Action
≠ Execution Authority
```

- **Agent Capability Registry** owns read/analyze capability definitions and availability.
- **Mutation Capability Contracts** own bounded mutation definitions, canonical application parameters, and local registered-action identity mapping.
- **Vela Runtime / ActionValidator** own actual local action registration, existence, risk, scope and executability.
- **Mutation Safety Spine** remains the only path to mutation authority.

The Agent Capability Registry remains restricted to `read` and `analyze`. There is no generic mutation Agent Capability in 0.3.4.

### Observation and Context

`observe-active-composition-v1` remains a local read-only capability. Observation freshness, Context eligibility and capability availability do not grant mutation permission.

Union profile selection remains bounded:

```text
provisionalProfile == text-only
&& contextUnionEligible
→ proposal-capable-union
```

Union is not produced directly by lexical classification and does not bypass Review, Confirmation or execution guards.

### Prompt architecture

Prompt Builder v4 keeps:

```text
GLOBAL STATIC CONTRACT
→ PROFILE-STABLE SYSTEM CONTRACT
→ TURN-DYNAMIC RESPONSE CONTRACT
→ TURN-DYNAMIC TRUSTED GROUNDING
→ USER INPUT
```

Production message order remains:

```text
system → assistant → user
```

Request identity, model identity, Context, grounding and user input remain outside the stable system prefix.

### Capability → registered action mapping

The bounded mutation fixture remains `set-opacity-v1`.

Its local registered-action identity is:

```json
{
  "toolId": "vela",
  "actionId": "set-opacity-v1"
}
```

Mapping resolves local identity only. It is not availability, target binding, confirmation, permission, or execution authority.

### Mutation safety spine

The effective mutation path remains:

```text
Provider response
→ Parser
→ Intent Gate
→ Proposal Router
→ canonical params / registered-action mapping
→ Context target binding
→ candidate
→ Review
→ Confirmation
→ freshness / permission / replay / reservation guards
→ ExecutionAdapter
→ ContextBridge
→ Host validation
→ AE mutation
```

The model cannot supply target identity, nonce, confirmation state, registered-action identity, Host payload, or execution authority.

## Verification state

### Offline / static

The canonical 0.3.4 release gate completed with:

- Vela regression inventory: **49/49 suites PASS**
- Context Host: **292 assertions PASS**
- Execution Preflight: **314 assertions PASS**
- Provider: **276 assertions PASS**
- Context Bridge: **258 assertions PASS**
- Capability Prompt Builder: **226 assertions PASS**
- Provider Model Qualification: **217 assertions PASS**
- Protocol / Parser: **159 assertions PASS**
- Capability Contracts: **147 assertions PASS**
- Prompt Stability: **25 assertions PASS**
- project JavaScript syntax checks: **PASS**
- Host JSX parse/run: **PASS**
- i18n report: **PASS**
- project consistency: **PASS**
- `git diff --check`: **PASS**

Qualification fixtures use repository-enforced LF checkout bytes, and frozen historical raw-byte hashes are bound to canonical LF Git content.

### After Effects 2026

Accepted evidence includes:

- Active Composition absence/presence and selected/unselected layer states;
- sequential freshness and A→B→A transitions;
- single-flight, cancellation and reload lifecycle;
- ordinary Provider conversation and opacity reads;
- bounded proposal, Review, Confirmation and approved mutation execution;
- Context freshness and proposal-capable Union behavior;
- Provider cancellation and session reset;
- default/old Project → real Project replacement and repeated Project transitions;
- same-Project repeated turns;
- no mutation before approval;
- reject/cancel paths do not execute;
- Host `projectVersion` = `0.3.4`;
- project-owned Console warnings/errors = `0/0`.

## Vela Experimental Preview status

Vela remains experimental in 0.3.4:

- Provider disabled by default;
- explicit session-only acknowledgement and enablement;
- loopback endpoints only;
- no qualified/recommended/default model;
- production activation locked;
- Persistent Surface remains the only Vela user entry;
- no autonomous Agent loop;
- no generic mutation Agent Capability.

## Next development phase — 0.3.5 Planning + Authority

The next phase is **0.3.5 Planning + Authority**.

It must begin with a **read-only scope / architecture audit** against the frozen architecture and the 0.3.4 closure. Do not jump directly into implementation.

Still deferred at the start of 0.3.5:

- Planner / planning runtime
- TaskPlan
- TaskRun authority semantics
- TaskState authority semantics
- DelegationGrant
- Policy Engine
- process-local `executionArmed`
- authority tokens
- automatic execution
- retry / scheduler / priorities
- generic mutation Agent Capability

The existence of future-facing comments or contracts for these concepts does not make them implemented authority.

## Historical released baselines

### 0.3.3 — Runtime Foundation

Version 0.3.3 is the historical Runtime Foundation release. It completed Session Runtime, Agent / AgentScope shape, Agent Surface projection, production lifecycle integration, the standalone Observation seam and runtime-state ownership convergence. Its historical closure remains in [`docs/design/vela-agent-0.3.3-closure.md`](design/vela-agent-0.3.3-closure.md).

### 0.3.2 — UI / Design System Foundation

Version 0.3.2 is the historical integrated UI / Design System Foundation release. Its accepted scope includes Registry Renderer / shared component convergence, Appearance and Design Tuning foundations, Palette Store v2 and dynamic Palette Workspace, Runtime Console Cleanup, Final Settings IA, and Vela presentation / spacing authority convergence.

Detailed historical release changes belong in [`CHANGELOG.md`](../CHANGELOG.md) and the versioned closure/design records rather than the current-state header of this file.

## Current project overview

- Visible product name: **Lomond Cabinet**
- Manifest menu name: **AE Toolbox**
- Extension id/folder: `com.kevin.aetoolbox`
- Current published release version: `0.3.4`
- Latest published tag: `v0.3.4`
- Product metadata: `0.3.4`
- 0.3.4 published: **YES**
- 0.3.4 final AE release smoke: **PASS**
- Host API version: `1.0.0`
- Next phase: **0.3.5 Planning + Authority read-only audit**

`VERSION`, both product-version fields in `CSXS/manifest.xml`, and `AEToolbox.projectVersion` are synchronized at `0.3.4`. `AEToolbox.hostApiVersion` is independently versioned and remains `1.0.0`.

## Release-state maintenance rule

Release preparation may legitimately describe the next version as a candidate. Once `dev → main` promotion and the annotated version tag are complete, publication is not administratively closed until the maintained current-state documents are reconciled.

For every future release, the mandatory post-publication step is:

1. confirm the immutable version tag points to the accepted release commit;
2. update `README.md`, `docs/PROJECT_STATE.md`, and `docs/HANDOFF.md` from candidate/pending language to the published version/tag;
3. record final AE release acceptance as complete;
4. synchronize `main` and `dev` onto the same post-release documentation commit;
5. only then begin the next development phase.

Published version tags must never be moved to include later documentation-only reconciliation commits.
