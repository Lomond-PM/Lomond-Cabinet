# Vela Agent — 0.3.3-B Agent / AgentScope Runtime Shape

> Historical 0.3.3 implementation/staging record. Statements about current, next or deferred scope below refer to that stage, not current dev. See the [canonical roadmap](../VELA_ROADMAP.md) and [current project state](../PROJECT_STATE.md); the frozen architecture remains normative.

```text
Status: IMPLEMENTATION CONTRACT (NOT an Architecture Amendment)
Applies to: 0.3.3-B — Agent / AgentScope Runtime Shape
Baseline: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x, architecture v2.2)
Foundation: docs/design/vela-agent-runtime-contract-foundation-0.3.3.md
```

This contract realizes only the process-local Agent and AgentScope shape. It does not wire the
module into CEP production bootstrap and does not modify any existing execution safety boundary.

## 1. Agent composition and identity

```text
Agent
├─ exactly one Session
├─ exactly one AgentScope
└─ lifecycle: created → active → disposed
```

- Agent contains and owns the runtime composition of exactly one Session.
- Session owns only its append-only Session log truth and never owns or drives Agent lifecycle.
- `agentId` and `sessionId` are independent stable runtime identities and use separate namespaces.
- The exposed Session reference is the existing Session API; it creates no second mutation model and
  grants no execution capability.
- Lifecycle active is distinct from `AgentActivity.running`, `TaskState.active`, and future
  `PresentationStatus`. None of those projection/task fields enter the Agent snapshot.

## 2. Lifecycle and revision

- New Agent: lifecycle `created`, revision `0`.
- `activate()` performs `created → active`; calling it while active is a no-op.
- `dispose()` performs `created|active → disposed`, closes the owned Session write path, and is
  idempotent.
- After disposal, `activate()` and `setScopeBoundary()` fail closed with `AGENT_DISPOSED`.
- Historical Session events and pure projection remain readable after Agent disposal.
- `Session.close()` does not drive Agent lifecycle and is not equivalent to Agent disposal.
- Revision is monotonic, process-local, non-persistent, and records only actual Agent runtime-shape
  changes: activation, unequal scope-boundary replacement, and first disposal. It has no safety or
  permission meaning.

Agent creation, activation, disposal, scope replacement, and revision changes append no SessionEvent;
the frozen SessionEvent taxonomy has no matching lifecycle kinds and must not be repurposed.

## 3. AgentScope

AgentScope is a stable runtime identity plus an immutable opaque boundary snapshot:

```text
AgentScope = stable scopeId + immutable opaque boundary
```

- The scope object and `scopeId` remain stable for the Agent lifetime.
- `setScopeBoundary(snapshot)` clones and deep-freezes the replacement as one value.
- An equal replacement is a no-op; an unequal replacement increments Agent revision once.
- Replacing the boundary never mutates an older boundary snapshot.
- The boundary is opaque and carries no AE observation, target binding, Context, capability,
  permission, approval, grant, or execution meaning in 0.3.3-B.
- Scope is not an Observation payload and never implies Permission or Authority.

Observation providers, Context plumbing, AE polling, abort implementation, capability availability,
and Capability Registry data remain deferred.

## 4. Snapshot and persistence boundary

Agent snapshot is a frozen read-only representation containing exactly:

```text
agentId
sessionId
lifecycleStage
scopeId
scopeBoundary
revision
```

Agent identity, lifecycle, scope identity/boundary, and revision are process-local and are not added
to SessionPersistence. Reload/new process does not restore active Agent state. No TaskRun,
execution-arming, permission, approval, delegation, or execution state is stored by this module.

## 5. AgentDriver remains reserved

AgentDriver intentionally remains **CONTRACT-ONLY / RESERVED FOR FUTURE LOOP IMPLEMENTATION**.
The frozen architecture assigns its concrete Observe → Reason → Act → Observe → Verify → Replan
loop to the later autonomous-loop stage. 0.3.3-B does not export `createAgentDriver()`, create a Driver
runtime object, place Driver metadata in Agent snapshots, or redefine AgentDriver as a provenance
descriptor.

## 6. Deferred integration

- At the 0.3.3-B delivery boundary, Surface ↔ Agent subscription/projection was deferred. It is
  subsequently defined by `docs/design/vela-agent-surface-subscription-projection-0.3.3.md` without
  changing the Agent/AgentScope shape specified here.
- Observation and Context are deferred to their architecture stage.
- Provider orchestration is absent: Agent is not Provider, activate does not start Provider or a loop.
- Existing Review, Confirmation, Preflight, ExecutionAdapter, Host allowlist, and both Execution
  Spine boundaries remain unchanged.
- The module is standalone and Node-testable; it is not loaded by `client/index.html` or
  `velaCepModuleLoader`.

---

*This document is an implementation contract under the frozen architecture. If implementation and
the frozen baseline conflict, implementation stops and the architecture amendment process applies.*
