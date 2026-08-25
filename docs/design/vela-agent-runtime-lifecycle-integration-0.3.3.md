# Vela Agent — 0.3.3-D Production Runtime Lifecycle Integration

```text
Status: AUTOMATED IMPLEMENTATION GATE
Applies to: 0.3.3-D — Production Agent / Session Runtime Lifecycle Integration
Baseline: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x)
```

## Ownership and creation

`main.js` owns existing `VelaRuntime` and `VelaAgentRuntimeOwner` as sibling resources. The Owner has
exactly one current Agent and exposes its Projection. It is created and activated only after existing
VelaRuntime initialization commits successfully. Agent activation means only that the runtime entity
is active; it does not start Provider, reasoning, execution, or append a synthetic SessionEvent.

Agent integration is optional and fail-closed. Missing modules, Owner/Agent construction failure, or
activation failure use separate Agent diagnostics and do not dispose or alter the already-ready
VelaRuntime, Provider readiness, Confirmation, visible status, or Execution Spine. Projection listener
errors use the same separate diagnostics path. Agent diagnostics never write
`velaRuntimeLastErrorCode` or `velaRuntimeStatusRevision`.

## Production loading

`velaSessionRuntime.js`, `velaAgentRuntime.js`, and `velaAgentRuntimeOwner.js` load statically and in
that dependency order before `main.js`. They are not added to `velaCepModuleLoader`. The neutral
`velaAgentSurfaceProjection.js` adapter remains standalone and is not production-loaded.

CEP browser-page execution is selected before CommonJS when the page root is its own `self` and
browser global, even if CEP Node integration also exposes `module` and `require`. Static scripts
therefore consume dependencies from the browser root. Genuine Node module execution continues to use
relative CommonJS dependencies and exports. This distinction prevents CEP page scripts from treating
the page's Node globals as proof that the script itself was loaded as a CommonJS module.

## Surface subscription

SurfaceController receives an optional Projection and owns only one subscription handle. Mount and
resume subscribe once; suspend and dispose unsubscribe. Missing Projection or subscribe failure keeps
all existing Surface behavior available. Surface never creates, activates, mutates, or disposes Agent.

Projection notification reads and caches only the latest immutable Projection snapshot. It does not
call existing `synchronize()`, mutate DOM/status/transcript/composer, invoke Provider/Confirmation/
execution, or enter PresentationModel. There is zero transcript migration and no PresentationStatus
mapping in 0.3.3-D.

## Lifecycle boundaries

Suspend removes the Surface subscription while Agent, Session, and Owner remain alive. Resume
resubscribes and receives current atomic initial truth. Panel shutdown disposes SurfaceController first,
then AgentRuntimeOwner, then existing VelaRuntime, ensuring Surface unsubscribe precedes Agent final
disposed notification. Owner disposal is idempotent and delegates Session close to Agent disposal.

PresentationModel reset, existing VelaRuntime session reset, Provider reset, and UI reset are not Agent
disposal. Full panel/context reload creates a new Owner, Agent, and Session; it restores no approval,
execution authority, or execution-arming state.

Provider, Review, Confirmation, Preflight, ExecutionAdapter, Host bridge/allowlist, and every existing
send/review/approve/reject execution path remain unchanged. AgentDriver, Observation, Context,
planning, TaskRun, delegated authority, transcript migration, and autonomous behavior remain deferred.

## Acceptance status

Automated validation is necessary but does not close 0.3.3-D. DSH post-implementation conformance
review and real AE/CEP acceptance are still required.

---

*This integration contract is subordinate to the frozen architecture and does not amend it.*
