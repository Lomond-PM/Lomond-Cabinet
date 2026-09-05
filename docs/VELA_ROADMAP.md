# Vela — Canonical Product Roadmap

Status: current roadmap; reconciled after Vela 0.3.9 merged into dev (PR #182, `91005f2`).

This is the single current milestone roadmap. [Project state](PROJECT_STATE.md) owns implemented behavior; [frozen Agent architecture](design/vela-agent-architecture.md) owns normative boundaries; [C2 closure](reports/vela-0.3.9-c2-closure.md) owns historical acceptance evidence. Roadmap milestones are not package releases: package metadata remains 0.3.6 and the recorded published tag remains v0.3.5.

## 0.3.x — Build the Complete AE Agent Product

Version numbers follow architecture completion boundaries, not a fixed minor-version ceiling. 0.3.10, 0.3.20+ and further milestones are valid. Completing streaming does not mean the complete Agent product is finished.

| Milestone | Status / scope |
| --- | --- |
| 0.3.7 — Agent Loop Foundation | COMPLETE |
| 0.3.8 — Multi-step Agent | COMPLETE |
| 0.3.9 — Streaming Response & Reasoning Surface | COMPLETE / SEALED / merged into dev; 171/171 offline PASS, user-manual real AE PASS, architecture amendment NONE, no unresolved correctness blocker |
| 0.3.10 — Context Architecture | IN PROGRESS; A0/A1 complete; A2 local input-evidence seam implemented; A3–A6 not started |
| 0.3.11 — Multi-conversation Foundation | Planned |
| 0.3.12 — Capability Model Generalization | Planned |
| 0.3.13+ — AE Capability Completeness Program | Planned, continuing until formal AE Action Coverage Matrix closure; no artificial version ceiling |
| User History Observation Foundation | Required after capability completeness; version assigned at the actual architecture boundary |
| Vela Agent UI Completion | Required; version not assigned |
| Integrated AE Agent Acceptance | Required; version not assigned |
| Product / Architecture Stabilization | Required; version not assigned |

## Context and conversation boundaries

0.3.10 scope includes context item typing/ownership, assembly, bounded selection, budgeting, trusted/untrusted boundaries, Provider/Agent/conversation context relationships and generation budgets with long context. This roadmap does not choose schemas, APIs or implementation algorithms.

[0.3.10-A1 Context contract](design/vela-context-architecture-0.3.10-a1.md) records domain ownership, separate freshness/trust classes, lifecycle eligibility, invocation snapshot requirements, budget ownership and the A0 deferred-decision ledger. It defines focused A2–A6 slices; A2 is the Provider Context Assembly Evidence Seam. This is a design contract, not implemented context assembly or a change to current Provider/Observation/execution behavior.

[A2 implementation evidence](reports/vela-0.3.10-a2-context-evidence.md) records the opt-in, immutable local input projection and exact pre-A2 request/capture equivalence tests. It adds no history, selection policy or capture substitution. A3 owns the next budget/capacity policy decisions; A4–A6 retain the A1 boundaries.

Raw Provider reasoning must not directly enter LLM context by default. It is not Observation, a trusted fact, Authority input or execution justification. Any future treatment requires its own reviewed design; history display never grants authority.

0.3.11 owns Multi-conversation Foundation. In current 0.3.9, reasoning is retained only for the current turn/objective; a new objective clears old raw reasoning. Cross-turn reasoning presentation/history is deferred to conversation/history architecture. Whether UI history retains reasoning and whether model context consumes it are separate decisions; the former does not imply the latter.

## Capability completeness

0.3.12 generalizes the capability model and metadata. 0.3.13+ must account for **every target AE Action** in a formal AE Action Coverage Matrix: either explicit capability coverage, or formal evidence such as `AE_PLATFORM_UNREACHABLE` explaining why the platform cannot support it. “Common actions are sufficient” is not closure. The program continues as many milestones as required.

User History Observation Foundation follows that program. User-action inferences must remain distinct from observed state and must not acquire Authority. A rich Observation Window is a later 0.4.x refinement, not a renamed 0.3.x completeness gate or a way to inject reasoning into Observation.

## Agent UI completion and deferred refinements

Future Agent UI Completion must cover Proposal Card, Execution Card, Agent Activity presentation, complete reasoning/action/result turn composition, capability-aware action presentation and richer assistant text + validated proposal/action composition. Response Parts and a tool-action channel require future evaluation; none shipped in 0.3.9.

Per-invocation TTFT, reasoning/output/total tokens, TPS and total duration belong to presentation observability, never Agent state, Observation or Authority. Reasoning truncation/summarization/virtualization is future UI work with explicit omission semantics.

Model/provider qualification refinement and qwen3.5-4b excessive/repetitive reasoning tuning are separately scoped provider work, not 0.3.9 correctness failures. Long-context generation budget management belongs with future Context budgeting. Complete capability coverage, metadata generalization, mixed response composition and the UI above remain future work, not reopened 0.3.9 TODOs.

## Hard exit and architecture ownership

Entry into 0.4.x requires all applicable 0.3.x hard exit requirements: full capability accounting, User History Observation Foundation, Agent UI Completion, integrated real AE acceptance, and product/architecture stabilization, while preserving the frozen normative boundaries. No numbered milestone alone grants exit.

The user confirmed that earlier planning discussions used the expression “8 hard exit gates”, but no precise enumeration was preserved in the repository. This first canonicalization uses the explicit hard exit requirements above, without inventing or reconstructing a numbered list. The frozen document's **13 invariants** remain intact and are a different concept from roadmap exit criteria; neither replaces the other. Missing historical enumeration is not a blocker for this reconciliation.

The frozen architecture's section 12 is a dependency baseline, explicitly not a mechanical mapping to minor version numbers. Its old 0.3.8/0.3.9 labels do not declare current milestones or implementation completion. Current scheduling is owned here; no dependency, trust boundary or invariant is weakened. This document does not amend the frozen architecture or treat its old schedule as a competing current roadmap.

## 0.4.x — Refine and Deepen the Complete Agent

0.4.x refines an already complete Agent product: planning quality, richer observation presentation (including Observation Window), UX, performance, recovery and related depth. It must not be used to defer baseline Agent product formation or incomplete AE Action Coverage Matrix accounting.
