# Vela Agent — 0.3.3-C Surface Subscription / Projection

> Historical 0.3.3 implementation/staging record. Statements about current, next or deferred scope below refer to that stage, not current dev. See the [canonical roadmap](../VELA_ROADMAP.md) and [current project state](../PROJECT_STATE.md); the frozen architecture remains normative.

```text
Status: IMPLEMENTATION CONTRACT (NOT an Architecture Amendment)
Applies to: 0.3.3-C — Surface ↔ Agent Subscription / Projection
Baseline: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x)
Mode: C1 contract/seam only; no production wiring
```

## 1. Ownership

AgentProjection is owned by Agent runtime and exposed through `agent.getProjection()`. Surface is a
read-only future consumer: it neither creates nor disposes Agent and never owns Agent lifecycle.
Projection aggregates committed Agent runtime changes and committed Session append notifications.

## 2. Independent cursors

- `agentRevision`: existing Agent runtime-shape revision; changes only on real activation, unequal
  scope replacement, and first disposal.
- `sessionSeq`: append-only Session event cursor; changes only when Session appends.
- `projectionRevision`: process-local notification/stale-render ordinal; increases once for every
  consumer-visible committed change.

Projection revision is not Agent revision, Session seq, an execution generation, an approval or
authority generation, or a SessionEvent seq.

## 3. Subscription envelope

Every immutable envelope contains `projectionRevision`, `agentRevision`, `sessionSeq`, and one closed
`changeKind`: `initial`, `agent`, `session`, or `disposed`. These classifications are not SessionEvent
kinds and never enter the Session log.

`projection.subscribe(listener)` registers first, then synchronously delivers exactly one current
`initial` envelope. Initial delivery reads committed truth and does not increment projectionRevision.
Committed state always changes before notification. Equal/no-op Agent operations do not notify.

Every listener is isolated. A listener exception is reported through the injected `onListenerError`
seam and cannot escape into Session append or Agent mutation, prevent another consumer from running,
or duplicate a Session commit. Error reporting itself is also contained. `onListenerError` is an
injected out-of-band reporting seam; when no reporter is provided, its current default is a no-op.
That default exists only so consumer failure cannot contaminate committed runtime truth: consumer
error is not Session append failure, Agent mutation failure, or another subscriber failure. It does
not mean errors should remain permanently silent in production. The 0.3.3-D production
Surface/runtime wiring must inject a real reporter or diagnostics path.

Unsubscribe is idempotent, dispose-safe, removes only that consumer, and never disposes Agent.

## 4. Session changes and reads

Projection internally subscribes to the Agent-owned Session. After an append commits, sessionSeq and
projectionRevision advance, Agent revision remains unchanged, and a `session` notification is sent.
Subscription itself appends no SessionEvent.

`readSessionEvents({fromSeq})` uses an inclusive cursor and returns every SessionEvent satisfying
`event.seq >= fromSeq`. The current default start is seq `1` when `fromSeq` is omitted or is not a
valid positive numeric start. The returned frozen slice remains in deterministic seq order. Session
events are not yet equivalent to the production transcript and no bubble, notice, proposal,
confirmation, error, or other presentation semantics are inferred here.

## 5. Snapshot and neutral adapter

Projection `getSnapshot()` reads current committed truth and returns a frozen header containing Agent
identity/lifecycle/scope, Agent revision, Session identity/last seq, and Projection revision. It does
not cache a second Agent state model.

`velaAgentSurfaceProjection.js` is a pure read adapter. It returns neutral runtime, session,
projection, and ordered event rows only. It cannot mutate Agent/Scope/Session, call Provider, approve,
confirm, execute, or derive permission, authority, PresentationStatus, AgentActivity, or TaskState.
PresentationStatus and transcript migration remain deferred.

## 6. Disposal and external Session close

First Agent disposal commits lifecycle `disposed` and Agent revision, increments Projection revision,
sends one final `disposed` notification, closes Session, then clears external subscribers. Listener
failures are contained. Repeated disposal changes no cursor and sends no notification. After disposal,
subscribe fails with `AGENT_DISPOSED`, while Projection snapshot/event reads and Session historical
reads remain available.

External `Session.close()` is not Agent disposal: it does not change lifecycle, and later Agent
runtime changes may still produce Projection notifications, while further Session append is closed.

## 7. Deferred boundaries

- Production lifecycle owner and Surface subscription wiring: 0.3.3-D.
- Production transcript migration and PresentationStatus mapping: deferred.
- AgentDriver remains CONTRACT-ONLY / RESERVED FOR FUTURE REASONING LOOP.
- Observation, Context, Authority, capability expansion, TaskRun, delegation, and automatic approval
  or execution remain deferred.
- Provider, Review, Confirmation, Preflight, ExecutionAdapter, Host JSX, and Host allowlist are
  unchanged.

---

*This implementation contract is subordinate to the frozen architecture and does not amend it.*
