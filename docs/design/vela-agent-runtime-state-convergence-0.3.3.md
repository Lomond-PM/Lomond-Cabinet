# Vela Runtime State Convergence — 0.3.3-F

> Historical 0.3.3 implementation/staging record. Statements about current, next or deferred scope below refer to that stage, not current dev. See the [canonical roadmap](../VELA_ROADMAP.md) and [current project state](../PROJECT_STATE.md); the frozen architecture remains normative.

Status: documentation-only closure for the 0.3.3 Runtime foundation. This document records current implementation ownership, deferred ownership, and frozen-stage gap analysis. It is not an architecture amendment and does not modify `vela-agent-architecture.md`.

## Closure decision

0.3.3-F deliberately implements no runtime module, state field, transition API, Session event producer, production wiring, or Host integration. In particular, it does **not** implement `TaskRun` or an `executionArmed` runtime state. The frozen architecture defines those concepts for a later consumer; their definition is not authorization to instantiate them during 0.3.3.

The existing `EXECUTION_ARMED_CONTRACT` in `velaSessionRuntime.js` is a stable contract marker. It records TaskRun ownership, process-local/non-persistent lifetime, reload reset, and non-Agent ownership. It is not storage, a transition authority, or an implemented TaskRun. Its statement that read/analyze remains available after reload records the frozen future semantic separation; actual Observation and read/analyze Capability implementation remains staged to 0.3.4 and is not claimed as a 0.3.3 runtime acceptance result.

## Current state ownership map

The repository currently keeps these ownership domains separate:

| Domain | Current owner and state | Boundary |
|---|---|---|
| Agent runtime | `VelaAgentRuntime`: `lifecycleStage`, Agent revision, stable Scope identity, immutable opaque Scope boundary | Agent lifecycle/Scope state only; no task, authority, or armed state |
| Session | `VelaSessionRuntime`: append-only typed events, deterministic pure projections, and Session-derived approval/event state | Event truth and derived projection; not execution authorization storage |
| Provider | Existing Provider controller/runtime: request, response, and proposal lifecycle | Model/provider interaction only; not Agent, TaskRun, Confirmation, or authority state |
| Confirmation | Existing confirmation/preflight flow: pending-confirmation, executing, consumed, discarded, failed, and stale lifecycle outcomes | A bounded execution-flow state machine; not approval authority or armed state |
| Execution safety | Review, preflight, trusted context binding, generation/fingerprint freshness, `ExecutionAdapter`, and Host allowlist | Existing mutation safety spine; cannot be bypassed by future TaskRun state |
| Presentation | `PresentationModel` and PresentationStatus projection | Surface semantic status only; not Agent activity, Task state, consent, or authority |
| Future Authority | Not implemented | Planning/Authority contracts begin in the frozen 0.3.5+ staging and later delegated authority remains separately staged |
| Future TaskRun | Not implemented; future owner of `TaskState` and `executionArmed` | First runtime consumer occurs after Planning/Authority/Autonomous Loop prerequisites, at 0.3.5+ |

These domains must not be collapsed into a generic runtime-state object.

## Frozen state tripartition

The frozen state model remains three independent semantic axes:

- **AgentActivity** describes whether a future Agent engine is idle or consuming a reasoning turn. The AgentDriver/runtime loop is not implemented in 0.3.3 and remains a later concern.
- **TaskState** describes the semantic stage of a future TaskRun: active, paused, waiting-approval, blocked, completed, or cancelled. Its runtime implementation is deferred to 0.3.5+.
- **PresentationStatus** describes Surface/UI semantics such as ready, working, waiting, warning, or error. It is a presentation projection, not Agent authority state.

`executionArmed` accompanies the future TaskRun. It is not a fourth Agent state, `AgentActivity`, or `PresentationStatus`. These values may coexist without implying or transitioning one another.

## Frozen executionArmed ownership and lifetime

Future `executionArmed` has exactly this ownership/lifetime contract:

- owner: future `TaskRun`;
- default: `false`;
- lifetime: process-local and non-persistent;
- reload or a new process: `false`;
- Session restore must never restore `true`;
- Agent recreation must never restore `true`;
- Surface remount does not change it;
- Provider reconnect does not change it.

`executionArmed=true` would not itself mean approval, permission, execution authority, automatic execution, Host mutation permission, a trusted execution target, `DelegationGrant`, persisted consent, or Provider invocation.

State ownership is not transition authority. Whether and how a future TaskRun may transition from `false` to `true` must be defined by later Authority/TaskRun contracts; 0.3.3 defines no such transition. Therefore the repository must continue to expose no `Agent.armed`, Agent/Projection/Owner/Surface `executionArmed` field, `runtimeState.executionArmed`, `setExecutionArmed`, `armExecution`, `disarmExecution`, or `transitionExecutionState` API.

## Confirmation, approval, and authority boundary

Confirmation state is not approval authority. A confirmation outcome described as approved does not automatically arm a future TaskRun. Existing confirmation, preflight, and execution behavior remains part of the existing execution safety spine; 0.3.3-F creates no `approve -> armed -> execute` path.

Future `executionArmed` cannot bypass Review, Confirmation when required, Preflight, `ExecutionAdapter`, or the Host allowlist. The execution spine has zero implementation diff in this closure.

## Observation and Agent Context separation

The standalone 0.3.3-E `AgentObservationRuntime` plumbing contract remains unchanged:

- an `ObservationSnapshot` existing does not mean execution is armed;
- an `AgentContextSnapshot` existing does not mean execution is armed;
- a fresh observation is not execution readiness;
- a valid Scope is not permission or execution authority.

Observation freshness must never be bound to armed state. Actual Host Observation, structured observation domains, read/analyze capabilities, and production ownership remain frozen for 0.3.4.

## Session relationship

0.3.3-F adds no SessionEvent and produces no execution-armed telemetry, permission state, or authority state. The frozen taxonomy's `task/execution-armed` control-event name reserves possible future TaskRun/adoption semantics; it does not establish a 0.3.3 event producer, state owner, or transition API. Session persistence cannot turn a future process-local armed value into durable consent.

## Frozen 0.3.3 Runtime gap analysis

| Frozen staged requirement | Current disposition |
|---|---|
| Agent | Completed by 0.3.3-B and production ownership/lifecycle integration in 0.3.3-D |
| Session | Completed by 0.3.3-A |
| Scope | Completed by 0.3.3-B as stable identity plus opaque immutable boundary |
| Typed Session events | Completed by 0.3.3-A |
| Persistence seam | Completed by 0.3.3-A with the bounded in-memory seam |
| Surface -> Agent consumer | Completed by 0.3.3-C and production integration in 0.3.3-D |
| AgentDriver | Contract-only/reserved as intended; no reasoning or autonomous loop in 0.3.3 |
| Runtime state contracts | Legal 0.3.3 contract coverage complete; no premature TaskRun state is required |
| Observation + Capability | Frozen 0.3.4; 0.3.3-E is standalone plumbing only, not actual Host Observation or Capability implementation |
| TaskRun / executionArmed / Planning / Authority | Frozen 0.3.5+ |
| AgentDriver reasoning/autonomous loop | Later stage under the frozen dependency order |

Conclusion: the **0.3.3 Runtime foundation has no remaining frozen-stage blocker**. This does not mean the Vela Agent feature is complete, a production autonomous Agent exists, or autonomous mutation is release-ready. Those claims require later Observation, Capability, Planning, Authority, delegated authority, autonomous-loop, and stabilization stages.

## Zero-diff implementation confirmation

This closure requires zero changes to Session, Agent, AgentRuntimeOwner, Agent Surface Projection, AgentObservationRuntime, SurfaceController, `main.js`, `index.html`, execution Context/Bridge, Provider, Confirmation, Preflight, ExecutionAdapter, Host code, and the frozen architecture. No production wiring or AE behavior changes are introduced; therefore AE behavioral acceptance is not required for 0.3.3-F.
