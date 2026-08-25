# Vela Agent Observation / Context Plumbing Contract — 0.3.3-E

Status: project-local Runtime plumbing substage. The frozen architecture remains unchanged.

## Stage boundary

0.3.3-E establishes a standalone, ownership-ready contract seam only. Actual Observation providers, structured Context domains, Capability Registry, and read/analyze capabilities remain frozen for 0.3.4. There is **NO HOST OBSERVATION**, no production loading or ownership wiring, and no AE behavioral acceptance requirement in this substage.

The future production owner is `main.js -> AgentRuntimeOwner -> { Agent, AgentObservationRuntime }`; that ownership is documentation-only here and remains deferred to 0.3.4. Surface is neither the Observation owner nor an Agent lifecycle owner.

## Separation from execution Context

Agent Context contains only non-authoritative, read-only world facts plus Observation and Scope provenance for a future model-facing read context. It does not call or reuse `velaContext.js` or `velaContextBridge.js` and never contains a trusted target, binding fingerprint, execution/project generation, property digest/CAS, preflight freshness, permission, approval, execution authority, mutation capability, or Host mutation handle.

AgentScope remains the existing stable `scopeId` plus immutable opaque boundary snapshot. This contract does not define observation domains or give Scope permission or capability meaning.

## Scope guard

Each explicit refresh captures the current active Agent snapshot as:

```js
scopeToken = { scopeId, agentRevision }
```

The token identifies the Agent/Scope runtime state for that one request. It is not a scope revision, authority freshness/generation, execution or binding generation, or Session sequence. After the provider resolves, the runtime rereads the Agent. A different Agent identity, `scopeId`, or Agent `revision` makes the result stale. A stale result is rejected, is not committed, produces no current Context, does not increment `observationRevision`, and appends no Session event.

## ObservationSnapshot

An accepted read commits this minimal deeply frozen, clone-isolated snapshot:

```js
{
  observationRevision,
  agentId,
  scopeToken: { scopeId, agentRevision },
  sourceKind,
  payload
}
```

`observationRevision` is process-local and monotonic and advances exactly once per accepted observation; it uses no clock and has no duplicate `observationId`. `sourceKind` is an opaque provider provenance string, not an AE semantic enum. `payload` is immutable JSON-shaped, non-authoritative fact data. The snapshot carries no authority, permission, approval, capability grant, `executionArmed`, `DelegationGrant`, trusted target, or Host mutation capability.

## AgentContextSnapshot

The same accepted observation deterministically projects to:

```js
{
  agentId,
  scopeToken,
  observationRevision,
  facts
}
```

`facts` is a pure clone-isolated projection of `ObservationSnapshot.payload`. Equivalent Observation snapshots yield equivalent Context snapshots. Context is process-local, non-persistent, and has no Provider/model invocation, execution, presentation, Surface Projection, capability, or authority semantics.

## Refresh and failure contract

`createAgentObservationRuntime(options)` exposes only `refresh()`, snapshot reads, `dispose()`, and `isDisposed()`. `refresh()` always returns a Promise and performs one explicit one-shot `provider.observe({ agentId, scopeToken, scopeBoundary })`; the provider may return a value or Promise. The opaque immutable Scope boundary is request data only.

Refresh is single-flight: concurrent calls return the same in-flight Promise and start at most one provider read. There is no `start`, `stop`, `run`, `poll`, `subscribe`, `advance`, `step`, timer, animation frame, or automatic loop.

A missing provider or null/undefined provider result is unavailable, not a successful empty observation. It fabricates no snapshots and does not advance the revision. Created/not-active Agents, disposed Agents, disposed Observation runtimes, rejected providers, malformed results, stale results, and projection failures fail closed with stable local error codes. The optional `onError` reporter is out-of-band; reporter failure is contained and cannot alter runtime truth.

Only a valid provider result that still matches its captured scope token increments the revision, freezes the Observation, derives Context, and commits both current snapshots. Failed, stale, or unavailable refreshes preserve the last accepted snapshots except that explicit runtime disposal clears its local snapshots.

## Side-effect boundaries

Observation refresh and Context projection append **zero SessionEvents**. `ae/state-observed` is not transport telemetry for every read or poll result; only a future explicitly adopted semantic fact might enter Session, and adoption is outside 0.3.3-E.

Context availability is not Provider/model invocation. This module has no prompt building, model adapter, capability discovery/registry, executable or mutation capability, Scope-to-capability binding, permission inference, trusted execution target, or production diagnostics wiring. Seeing a fact does not grant the ability to modify it.

The standalone UMD publishes to a real CEP/browser page even if a Node-like `module` object is also present, and otherwise supports CommonJS tests. It is not loaded by `client/index.html` in 0.3.3-E.
