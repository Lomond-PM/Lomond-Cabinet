# Current Project State

## Vela development milestone

**0.3.9 — Streaming Response & Reasoning Surface: COMPLETE / SEALED / merged into dev**, PR #182, merge commit `91005f2`. **0.3.10 — Context Architecture: IN PROGRESS**; A0/A1 complete, A2 evidence seam merged into dev, A3a capacity/budget policy recorded; A3b pure normalization/conditional disposition implemented and focused offline validated; A4–A6 not started.

[0.3.10-A1 Context Taxonomy, Ownership & Lifecycle Contract](design/vela-context-architecture-0.3.10-a1.md) records the design baseline and deferred decisions. `currentContext` remains a compatibility/read-only Observation projection with unchanged API/behavior. [A2 implementation evidence](reports/vela-0.3.10-a2-context-evidence.md) describes the opt-in local Controller/Adapter input snapshot and stateless Transport serialization projection. Current messages, captures, admission and execution semantics remain unchanged. No history selection, trajectory store or multi-conversation runtime is implemented.

[A3a Provider Capacity Source & Context Budget Policy Decision](design/vela-provider-capacity-budget-0.3.10-a3a.md) defines current-shape compatibility for unknown capacity/cost/reserve and conditional numeric fit checks. [A3b implementation evidence](reports/vela-0.3.10-a3b-capacity-budget.md) records the pure normalization/disposition seam and separate immutable decision projection. Production always evaluates unknown C/I/G/S with exact bytes and unchanged actual M/R, yielding `unassessed-capacity` / `allow-current-shape`, even with A2 debug evidence disabled. Current readiness contextLength remains advisory and is not consumed. No real capacity enforcement, tokenizer, discovery rewiring or generation tuning is implemented; qualified numeric decisions are synthetic-test evidence only. Empirical instance routing, full-input accounting and near-capacity reserve semantics remain explicit requirements before future live numeric integration.

This file owns current implementation status and handoff facts. [VELA_ROADMAP](VELA_ROADMAP.md) is the only current roadmap. [Agent architecture](design/vela-agent-architecture.md) remains FROZEN FOR 0.3.x, architecture amendment NONE. The [C2 closure](reports/vela-0.3.9-c2-closure.md) is final historical evidence: 171/171 offline suites PASS, 0 skipped, USER-MANUAL REAL AE ACCEPTANCE PASS, no unresolved 0.3.9 correctness blocker. Codex did not operate or observe AE.

## Package release metadata is separate

VERSION, both manifest fields and Host projectVersion remain **0.3.6**, release-prepared but unpublished; latest recorded published tag is **v0.3.5**. Sealing the Vela 0.3.9 feature milestone does not publish 0.3.6 or 0.3.9, alter CHANGELOG release sections, or authorize main/tag operations. Historical release scope remains in [0.3.6 closure](design/vela-agent-0.3.6-closure.md).

## Current Provider and presentation behavior

| Area | Implemented state |
| --- | --- |
| Activation | Experimental Preview; production activation blocked by no-qualified-default-model. Local Provider opt-in is session-only, disabled by default; endpoint/model configuration may persist. Readiness is not qualification. |
| Streaming | Production Runtime streaming enabled; explicit nonstream fallback retained. |
| TEXT_ONLY | Native assistant prose streaming; model generates no Vela JSON envelope. Adapter owns internal canonicalization. |
| Structured | Explicit opacity/rename proposals and supported two-step logical plan use strict json_schema. Partial JSON is not presentation prose; partial output never enters Agent. Wrong structured output fails, without successful text fallback. |
| Reasoning | Independent untrusted presentation-only channel; Provider reasoning ON/OFF supported. Current-turn disclosure and user/terminal anchoring; terminal default collapsed. A new objective clears prior raw reasoning. No raw reasoning in LLM context, Observation, Authority or execution justification. |
| Transport | Valid SSE [DONE] ends protocol reading without waiting for CEP physical EOF. Terminal schema/finish validation still required; stream-completed is not authoritative success. Pre-DONE errors and finish_reason=length fail closed. |
| Limits | Streaming ceiling 4 MiB includes reasoning/content/SSE framing. Nonstream/canonical JSON remains a separate 256 KiB limit. |
| Exact qwen3.5-4b policy | Ordinary thinking 6144 / total max_tokens 8192; structured 2048 / 4096. Other model ids do not inherit these fields. |

## Agent execution and authority

Agent Loop Foundation and bounded Multi-step Agent are complete. Current acceptance capabilities include set-opacity-v1 and set-layer-name-v1, including the ordered opacity-then-rename logical plan. This is not complete AE capability coverage or generic multi-capability delegated authority.

Validated candidate → local Review/Authority → fresh Preflight → Host mutation when needed → fresh Verify remains the control path. Fresh actual==desired is already-satisfied: no unnecessary Host mutation or Undo, but fresh Verify is still required before the step completes and the logical cursor advances. Current capability-aware Undo labels are Vela: Set Opacity and Vela: Rename Layer; metadata generalization is future work.

The explicit one-shot opacity delegation retains process-local Session/task/scope/risk/budget/expiry/provenance ownership. Policy ALLOW is not Host permission; model output and Session history cannot forge or restore live authority. Lifecycle invalidation and stale-target/CAS protections remain. Authority details are normative in the frozen architecture and historical in the 0.3.6 closure, not redefined here.

## Accepted observations and future work

Historical workstation ordinary/multi-step refusal is NON-REPRODUCED HISTORICAL OBSERVATION, not a current blocker. F9 real Provider evidence accepted 22/22 requests including 12/12 exact logical plans; user-manual AE acceptance confirmed reasoning OFF/ON, no-op progression, real mutation, correct second Review and objective completion.

qwen3.5 verbosity/repetition is model/provider tuning, not Vela correctness failure. Cross-turn reasoning UI history and model-context consumption are separate future decisions. Context budgeting, conversation foundations, capability generalization/completeness, mixed response, cards/activity, telemetry and rendering refinements are assigned in the [roadmap](VELA_ROADMAP.md), not 0.3.9 TODOs.

## Verification and ownership

Latest full feature baseline: 171/171 suites PASS, 0 skipped. Documentation-only reconciliation runs project consistency, i18n freshness and internal-link/diff checks; it does not rerun production or AE acceptance. Generated i18n content is owned by its script. [HANDOFF](HANDOFF.md) is a concise navigation entry; [KNOWN_ISSUES](KNOWN_ISSUES.md) owns accepted issues; CHANGELOG/release documents own package release history.
