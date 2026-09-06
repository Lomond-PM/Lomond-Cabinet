# Vela — Canonical Product Roadmap

Status: current roadmap; reconciled at Vela 0.3.10 Context Architecture COMPLETE / SEALED.

This is the single current milestone roadmap. [Project state](PROJECT_STATE.md) owns implemented behavior; [frozen Agent architecture](design/vela-agent-architecture.md) owns normative boundaries; [C2 closure](reports/vela-0.3.9-c2-closure.md) owns historical acceptance evidence. Roadmap milestones are not package releases: package metadata remains 0.3.6 and the recorded published tag remains v0.3.5.

## 0.3.x — Build the Complete AE Agent Product

Version numbers follow architecture completion boundaries, not a fixed minor-version ceiling. 0.3.10, 0.3.20+ and further milestones are valid. Completing streaming does not mean the complete Agent product is finished.

| Milestone | Status / scope |
| --- | --- |
| 0.3.7 — Agent Loop Foundation | COMPLETE |
| 0.3.8 — Multi-step Agent | COMPLETE |
| 0.3.9 — Streaming Response & Reasoning Surface | COMPLETE / SEALED / merged into dev; 171/171 offline PASS, user-manual real AE PASS, architecture amendment NONE, no unresolved correctness blocker |
| 0.3.10 — Context Architecture | COMPLETE / SEALED; 176/176 offline PASS, 0 skipped; A4 real AE PASS; A6R 15/15 PASS; A1 U11 CLOSED; architecture amendment NONE |
| 0.3.11 — Multi-conversation Foundation | IN PROGRESS; A1 Conversation Ownership Root COMPLETE / SEALED; 177/177 offline PASS and 5/5 targeted real-AE PASS; production still one conversation; A2 Conversation-owned Presentation + F1 offline 179/179 PASS, real-AE PASS / COMPLETE / SEALED (Case 6 re-test; recorded limitation); architecture amendment NONE |
| 0.3.12 — Capability Model Generalization | Planned |
| 0.3.13+ — AE Capability Completeness Program | Planned, continuing until formal AE Action Coverage Matrix closure; no artificial version ceiling |
| User History Observation Foundation | Required after capability completeness; version assigned at the actual architecture boundary |
| Vela Agent UI Completion | Required; version not assigned |
| Integrated AE Agent Acceptance | Required; version not assigned |
| Product / Architecture Stabilization | Required; version not assigned |

## Context and conversation boundaries

Completed 0.3.10 scope includes context typing/ownership, invocation assembly evidence, bounded selection eligibility evidence, conservative capacity/budget policy, trust/freshness/lifecycle boundaries and real AE Observation turn isolation. Model-visible history and live numeric long-context capacity integration remain excluded. This roadmap does not choose schemas, APIs or implementation algorithms.

[0.3.10-A1 Context contract](design/vela-context-architecture-0.3.10-a1.md) records domain ownership, separate freshness/trust classes, lifecycle eligibility, invocation snapshot requirements, budget ownership and the A0 deferred-decision ledger. It defines focused A2–A6 slices; A2 is the Provider Context Assembly Evidence Seam. A1 remains the design contract; the completed slices below implement bounded evidence and turn isolation, not history injection.

[A2 implementation evidence](reports/vela-0.3.10-a2-context-evidence.md) records the opt-in, immutable local input projection and exact pre-A2 request/capture equivalence tests. It adds no history, selection policy or capture substitution. [A3a capacity/budget decision](design/vela-provider-capacity-budget-0.3.10-a3a.md) defines source qualification, unknown-mode compatibility, accounting ownership and the conditional budget relation. [A3b implementation evidence](reports/vela-0.3.10-a3b-capacity-budget.md) records pure normalization/conditional dispositions, separate decision evidence and exact pre/post canonical/wire/capture equivalence. Production remains unknown/current-shape compatibility; no live numeric enforcement, new discovery or generation tuning. Future numeric integration requires qualified operands and targeted Provider evidence. A4–A6 retain the A1 boundaries.

[A4a source/projection contract](design/vela-verified-trajectory-0.3.10-a4a.md) and [A4b implementation evidence](reports/vela-0.3.10-a4b-verified-trajectory.md) establish bounded canonical-source reporting. A4b is merged through PR #190; targeted real AE acceptance is user-confirmed in the A5a and integrated closure task requests, with externally retained evidence and no invented repository artifacts. A4 answers what evidence exists; it adds no Provider history input.

[A5a Bounded Context Selection Policy Contract](design/vela-context-selection-0.3.10-a5a.md) resolves A1 U7: only eligible verified attempts from the most-recent terminal are optional historical candidates; active trajectory and conversation transcript selection are deferred. A3b currently always disables optional expansion, including synthetic full-fit decisions. [A5b implementation evidence](reports/vela-0.3.10-a5b-context-selection.md) records bounded immutable eligibility/omission evidence with zero model-visible optional history, 23 immutable pre-A5b production comparisons and full offline regression PASS. General conversation ownership remains 0.3.11; frozen architecture amendment NONE.

Raw Provider reasoning must not directly enter LLM context by default. It is not Observation, a trusted fact, Authority input or execution justification. Any future treatment requires its own reviewed design; history display never grants authority.

0.3.11 owns Multi-conversation Foundation. [A2 presentation report](reports/vela-0.3.11-a2-conversation-presentation.md) records the conversation-owned PresentationModel and explicit Surface injection; A2 and F1 are COMPLETE / SEALED after targeted real-AE re-acceptance, with the first Case 6 response-field UNKNOWN retained in the seal. Exact next dependency: **0.3.11-A3 — Source-bound Async & Command Routing**; not started. In current 0.3.10, reasoning is retained only for the current turn/objective; a new objective clears old raw reasoning. Cross-turn reasoning presentation/history is deferred to conversation/history architecture. Whether UI history retains reasoning and whether model context consumes it are separate decisions; the former does not imply the latter.

[A6b final report](reports/vela-0.3.10-a6b-observation-turn-isolation.md) closes the original R1-1 defect: obsolete diagnostics failure previously blocked a newer objective. Exact turn coalescing, guarded cleanup and cancellation ownership now preserve the new objective; obsolete diagnostics may still safely report stale. Post-fix A6R 15/15 PASS closes A1 U11. See [0.3.10 integrated closure](reports/vela-0.3.10-context-closure.md) for retention/reset constraints and the explicit 0.3.11 ownership/scheduling decisions. Model-visible optional history remains zero; A3 optionalExpansion=false.

## Capability completeness

0.3.12 generalizes the capability model and metadata. 0.3.13+ must account for **every target AE Action** in a formal AE Action Coverage Matrix: either explicit capability coverage, or formal evidence such as `AE_PLATFORM_UNREACHABLE` explaining why the platform cannot support it. “Common actions are sufficient” is not closure. The program continues as many milestones as required.

User History Observation Foundation follows that program. User-action inferences must remain distinct from observed state and must not acquire Authority. A rich Observation Window is a later 0.4.x refinement, not a renamed 0.3.x completeness gate or a way to inject reasoning into Observation.

## Agent UI completion and deferred refinements

Future Agent UI Completion must cover Proposal Card, Execution Card, Agent Activity presentation, complete reasoning/action/result turn composition, capability-aware action presentation and richer assistant text + validated proposal/action composition. Response Parts and a tool-action channel require future evaluation; none shipped in 0.3.9.

Per-invocation TTFT, reasoning/output/total tokens, TPS and total duration belong to presentation observability, never Agent state, Observation or Authority. Reasoning truncation/summarization/virtualization is future UI work with explicit omission semantics.

Model/provider qualification refinement and qwen3.5-4b excessive/repetitive reasoning tuning are separately scoped provider work, not 0.3.9 correctness failures. Live numeric capacity integration remains future budget work under the completed conservative A3 policy. Complete capability coverage, metadata generalization, mixed response composition and the UI above remain future work, not reopened 0.3.9 TODOs.

## Hard exit and architecture ownership

Entry into 0.4.x requires all applicable 0.3.x hard exit requirements: full capability accounting, User History Observation Foundation, Agent UI Completion, integrated real AE acceptance, and product/architecture stabilization, while preserving the frozen normative boundaries. No numbered milestone alone grants exit.

The user confirmed that earlier planning discussions used the expression “8 hard exit gates”, but no precise enumeration was preserved in the repository. This first canonicalization uses the explicit hard exit requirements above, without inventing or reconstructing a numbered list. The frozen document's **13 invariants** remain intact and are a different concept from roadmap exit criteria; neither replaces the other. Missing historical enumeration is not a blocker for this reconciliation.

The frozen architecture's section 12 is a dependency baseline, explicitly not a mechanical mapping to minor version numbers. Its old 0.3.8/0.3.9 labels do not declare current milestones or implementation completion. Current scheduling is owned here; no dependency, trust boundary or invariant is weakened. This document does not amend the frozen architecture or treat its old schedule as a competing current roadmap.

## 0.4.x — Refine and Deepen the Complete Agent

0.4.x refines an already complete Agent product: planning quality, richer observation presentation (including Observation Window), UX, performance, recovery and related depth. It must not be used to defer baseline Agent product formation or incomplete AE Action Coverage Matrix accounting.

A2 acceptance follow-up: [A2-F1 cancellation reasoning reconciliation](reports/vela-0.3.11-a2-f1-cancellation-reasoning.md) repairs a pre-existing terminal-publication ordering defect surfaced by real AE Case 4. F1 offline: 88 focused assertions and 179/179 full suites PASS, 0 skipped. Real-AE 4a–4c, Case 5 and Case 6 re-test PASS. First Case 6 outer-response failure and UNKNOWN rejected field remain documented. A2 and F1 are COMPLETE / SEALED; no further production change was made for the non-reproduced response failure.
