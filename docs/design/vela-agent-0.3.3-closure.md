# Vela Agent 0.3.3 Runtime Foundation — Integrated Closure

Status: integrated development closure record. This document does not amend the frozen architecture, add a runtime capability, claim completion of an autonomous Agent, or declare version 0.3.3 formally released.

## Closure status

| Status boundary | Result |
|---|---|
| Runtime Foundation Complete | **YES** |
| Final integrated AE acceptance | **PASS** |
| 0.3.3 Development Complete | **YES** |
| Release Preparation | **PENDING** |
| Release Ready | **NO — release preparation pending** |
| Autonomous Agent Complete | **NO** |
| Product version metadata | **0.3.2 unchanged** |

Stages A–F are closed and accepted on the development baseline. Stage G records their integrated contract and validation closure without changing runtime behavior. The normative source remains `vela-agent-architecture.md`, **FROZEN FOR 0.3.x**.

## Stage ledger

| Stage | Final status | Core delivered contract | Important deferred boundary |
|---|---|---|---|
| A — Session Runtime Contract Foundation | **CLOSED / ACCEPTED** | Append-only typed Session events, stable event contracts, deterministic pure projections, in-memory persistence seam | No disk durability, lifecycle integration, TaskRun, or Authority |
| B — Agent / AgentScope Runtime Shape | **CLOSED / ACCEPTED** | One Agent owning one Session, one stable Scope identity with immutable opaque boundary, lifecycle and independent Agent revision | AgentDriver remains reserved; Scope has no permission semantics |
| C — Agent Surface Projection / Subscription | **CLOSED / ACCEPTED** | Runtime-owned AgentProjection, consumer-only Surface subscription, deterministic event reads and listener containment | Surface does not own Agent lifecycle, authority, or execution |
| D — Production Runtime Lifecycle Integration | **CLOSED / ACCEPTED** | `main.js` ownership through AgentRuntimeOwner, ordered bootstrap/shutdown, reload creates fresh Agent/Session, Surface subscription integration | Owner is not Provider or Execution owner; no autonomous lifecycle |
| E — Observation / Agent Context Plumbing Contract | **CLOSED / ACCEPTED** | Standalone one-shot async-capable Observation plumbing, Scope stale guard, immutable Observation/Agent Context snapshots | No Host Observation, production load, Capability, model invocation, or authority; actual work stays 0.3.4 |
| F — Runtime State Convergence | **CLOSED / ACCEPTED** | Current state ownership map and legal 0.3.3 state-contract closure | TaskRun and process-local `executionArmed` runtime state stay 0.3.5+; do not use `Agent.armed` |

## Frozen 0.3.3 requirements matrix

| Frozen requirement | Closure disposition |
|---|---|
| Agent | **IMPLEMENTED** |
| Session | **IMPLEMENTED** |
| Scope | **IMPLEMENTED** |
| Typed Session events | **IMPLEMENTED** |
| Persistence seam | **IMPLEMENTED** |
| Surface -> Agent consumer | **IMPLEMENTED** |
| Runtime state contracts | **IMPLEMENTED for legal 0.3.3 scope** |
| AgentDriver | **CONTRACT-ONLY AS INTENDED** |
| Observation + Capability | **DEFERRED BY FROZEN STAGING to 0.3.4** |
| TaskRun / executionArmed runtime / Planning / Authority | **DEFERRED BY FROZEN STAGING to 0.3.5+** |
| Reasoning/autonomous AgentDriver loop | **DEFERRED to a later frozen stage** |

Conclusion: the **0.3.3 Runtime Foundation has no remaining frozen-stage blocker**.

## Integrated invariants

- Agent to Session is 1:1; Agent to Scope is 1:1.
- Agent owns Session, Scope, and AgentProjection.
- `main.js` owns AgentRuntimeOwner; Surface owns only its Projection subscription handle.
- Existing VelaRuntime and AgentRuntimeOwner are sibling resources owned by `main.js`.
- AgentRuntimeOwner is neither Provider owner nor Execution owner.
- `agentRevision`, `sessionSeq`, `projectionRevision`, `observationRevision`, execution generation, and future authority generation are distinct values with distinct owners.
- Scope remains a stable `scopeId` plus an immutable opaque boundary; Scope is not permission.
- Observation Context is not trusted Execution Context.
- Observation is not Capability; Context is not Authority.
- Future `executionArmed` belongs to TaskRun, never Agent, and is not automatic execution.
- Reload creates a new Owner, new Agent, and new Session; no authority or execution state is restored.
- Proposal is not approval; approval state is not approval authority; permission is not execution authority.

## Production ownership record

```text
main.js
├─ existing VelaRuntime
├─ VelaAgentRuntimeOwner
│  └─ current Agent
│     ├─ Session
│     ├─ Scope
│     └─ Projection
└─ VelaSurfaceController
   └─ Projection subscription handle
```

VelaRuntime and AgentRuntimeOwner remain main-owned sibling resources. The Surface consumes Projection and does not own Agent lifecycle, Provider, Confirmation, execution, or authority.

## Execution safety boundary

0.3.3 does not alter Provider, Review, Confirmation, Preflight, ExecutionAdapter, or the Host allowlist. Agent runtime receives no approval authority, permission authority, execution authority, or automatic-apply authority. A proposal cannot execute directly, and future armed state cannot bypass the existing safety spine.

```text
READ WORLD != PROVE EXECUTION TARGET / AUTHORITY
```

Observation refresh does not automatically append a SessionEvent. `ae/state-observed` is not read-transport telemetry. No `executionArmed` runtime event producer exists in 0.3.3: a future taxonomy reservation is not a current producer implementation.

## CEP compatibility closure

A CEP browser page may expose both a browser root and Node-like globals. Production SessionRuntime, AgentRuntime, and AgentRuntimeOwner therefore use browser-page-first module publication detection; their production load has passed After Effects 2026 validation. Standalone AgentObservationRuntime uses the same future-safe convention but remains absent from production loading.

## Integrated automated validation

The A–F required tests are part of the canonical `scripts/test-*.js` suite; integrated audit found no coverage hole requiring a new G-specific integration test.

```text
FULL_OFFLINE_TOTAL=132
FULL_OFFLINE_PASSED=132
FULL_OFFLINE_FAILED=0
```

The final values above are the 0.3.3-G rerun result. Project consistency, generated i18n report freshness, focused Runtime regressions, and whitespace validation also pass.

## Final AE acceptance

Final integrated AE acceptance: **PASS**. The user completed the bounded After Effects 2026 smoke with these results:

- cold panel boot: **PASS**;
- project-owned Console errors/warnings: **0**;
- Vela Surface behavior: **PASS**;
- Home to/from tool-detail suspend/resume: **PASS**;
- Provider transport disconnect/recovery and normal interaction: **PASS**, subject to the readiness note below;
- send, proposal, and review: **PASS**;
- confirmation reject: **PASS**;
- confirmation approve and safe execution: **PASS**;
- close/reopen: **PASS**;
- duplicate Agent lifecycle, subscription, or response symptoms: **not observed**;
- narrow/resize regression: **PASS**.

After Provider transport recovery, the existing UI readiness state does not restore itself automatically. A manually initiated new conversation restores normal operation. This is existing Provider reconnect/readiness behavior, is non-blocking, and is not a 0.3.3 runtime regression or a new automatic-reconnect requirement. Automatic reconnect is not claimed as passing.

The smoke does not claim validation of Observation, Capability, Authority, or AgentDriver reasoning because those features are not production-implemented.

## Release boundary and deferred manifest

Runtime Foundation Complete, final AE acceptance, 0.3.3 Development Complete, Release Preparation, and Autonomous Agent Complete are separate product states. The foundation, AE acceptance, and development are complete; release preparation remains pending; autonomous Agent completion is false. `VERSION`, manifest versions, and Host project version remain 0.3.2. The 0.3.3 version bump, `dev -> main`, and tag belong to a later release-preparation step, not this closure branch.

Frozen deferred work remains:

- **0.3.4:** actual Observation, Host-backed structured Context, Capability Registry, read/analyze capabilities, generic capability-to-registered-action mapping, and unified invocation/result envelopes.
- **0.3.5+:** Planning, TaskRun, TaskState runtime, process-local `executionArmed` runtime state, Authority, PolicyDecision, DelegationGrant, Permission, and JIT binding/authority integration according to the frozen architecture.
- **Later frozen stage:** AgentDriver reasoning and autonomous loop.
