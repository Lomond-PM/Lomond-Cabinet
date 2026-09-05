# Documentation Reconciliation — Post Vela 0.3.9 Closure

Date: 2026-09-05. **PASS / READY FOR DOC PR**. Documentation-only; no commit/push, production edits, 0.3.10 implementation, AE acceptance rerun or package release changes.

## Baseline and document ownership

Started on clean `docs/vela-0.3.9-roadmap-refresh`, HEAD `91005f2a62914080d3a8869160ee0939d02b8532`, equal to freshly fetched origin/dev. PR #182 had already merged 0.3.9. The task branch was already prepared; no work was moved or rebased.

Initial inventory: **34 documentation files**, including all tracked Markdown and report CSV/JSON; no additional tracked TXT/RST/ADOC/README-style files were found elsewhere, including helpers/scripts. Full text was scanned, rather than restricting discovery to filenames containing roadmap. VERSION/manifest/Host metadata, CHANGELOG and documentation-generation/consistency scripts were also inspected as supporting sources, not counted as prose documents. Final inventory: **36**, adding one canonical roadmap and this reconciliation record.

| Responsibility | Sole owner / entry |
| --- | --- |
| Normative Agent architecture | [frozen architecture](../design/vela-agent-architecture.md), unchanged |
| Current roadmap | [VELA_ROADMAP](../VELA_ROADMAP.md), first canonical roadmap created in this repository |
| Current implementation / handoff facts | [PROJECT_STATE](../PROJECT_STATE.md) |
| Onboarding / working rules | [README](../../README.md), [AGENTS](../../AGENTS.md), [HANDOFF](../HANDOFF.md); concise links, not duplicate roadmaps |
| Historical evidence | docs/reports and dated design closure records; [C2](vela-0.3.9-c2-closure.md) retained as final 0.3.9 evidence |
| Package release history | [CHANGELOG](../../CHANGELOG.md) and dated release records, unchanged |
| Design-specific authority | DESIGN_SYSTEM, SHARED_COMPONENT_CATALOG, procedural-appearance; retained without unrelated rewriting |

## Reconciliation decisions

- README, AGENTS, PROJECT_STATE and HANDOFF now distinguish **0.3.9 COMPLETE / SEALED / merged into dev** from package version 0.3.6, and identify **0.3.10 Context Architecture — NEXT**. AGENTS retains tool/registry, ES3, Git, safety, validation and release workflow rules; outdated opacity-only/current-union assumptions are corrected.
- Current defaults are centralized in PROJECT_STATE: production streaming/nonstream fallback; native TEXT_ONLY/internal Adapter canonicalization; strict structured admission; independent untrusted current-turn reasoning; protocol DONE without physical EOF; 4 MiB stream ceiling versus 256 KiB canonical JSON; exact-model 6144/8192 and 2048/4096 budgets; fresh no-op Verify/progression and capability-aware Undo labels.
- `docs/design/vela-agent.md` is explicitly **SUPERSEDED as a current architecture/phase plan**, retained for independent 0.3.0–0.3.2 decisions, contracts and qualification history. Its historical sections are not rewritten as current implementation. Runtime 0.3.3 staging documents and 0.3.4 deferred constraints receive historical-scope pointers.
- Roadmap documents deleted: **0**. No independent current canonical roadmap existed to merge or delete. No historical decision record was removed. All new current-roadmap references point to VELA_ROADMAP; old contract references remain contract references.
- Provider qualification reports and C2 receive current-status pointers only. F5/F6/F9, their failed experiments, PENDING states and limitations remain intact. C2's pre-commit branch/status is historical; the new pointer identifies subsequent merge without fabricating a rerun.
- Generated i18n report and report data files are unchanged. No new documentation tooling/dependency is introduced; the minimal audit checker and its output stay under ignored `.tmp`.

## Canonical route and exit requirements

```text
0.3.x — Complete the AE Agent Product
  0.3.7 Agent Loop Foundation — COMPLETE
  0.3.8 Multi-step Agent — COMPLETE
  0.3.9 Streaming Response & Reasoning Surface — COMPLETE / SEALED
  0.3.10 Context Architecture — NEXT
  0.3.11 Multi-conversation Foundation
  0.3.12 Capability Model Generalization
  0.3.13+ AE Capability Completeness Program — no artificial ceiling
  User History Observation Foundation
  Vela Agent UI Completion
  Integrated AE Agent Acceptance
  Product / Architecture Stabilization
  satisfy all hard exit requirements
→ 0.4.x — Refine and Deepen the Complete Agent
```

Capability completeness requires the formal AE Action Coverage Matrix to close for every target action through coverage or formal platform-unreachable evidence. Common-action coverage is insufficient. The four later 0.3.x stages have no speculative version numbers.

The user clarified that prior discussion mentioned “8 hard exit gates” but never recorded exact text in the repository. No list was fabricated, reconstructed or substituted with the frozen architecture's 13 invariants. The explicitly approved hard exit requirements above are canonical; missing historical enumeration is not an outstanding blocker.

Context scope remains future scope, not a completed design. UI reasoning history is distinct from model-context consumption. Raw reasoning remains excluded by default from model context, Observation, trusted facts, Authority and execution justification. Cards/activity/richer composition and telemetry belong to future UI; TTFT/tokens/TPS/duration are presentation observability, not trusted Agent state. Provider tuning is not a 0.3.9 failure. A richer Observation Window remains 0.4.x refinement; User History Observation Foundation remains a 0.3.x requirement.

## Full inventory

Classes: A current normative; B current roadmap/planning; C current project status/handoff; D historical design/decision; E historical acceptance/report; F generated report; G obsolete/superseded current-state document; H unrelated-to-Vela-roadmap documentation. The old Vela phase plan's competing-current role was G and is now retired into D. No active G document remains.

| Document | Class | Disposition |
| --- | --- | --- |
| `AGENTS.md` | A | Updated current-state wording/navigation. |
| `CHANGELOG.md` | H | Package release history, distinct from feature milestones; unchanged. |
| `README.md` | C | Updated current-state wording/navigation. |
| `docs/DESIGN_SYSTEM.md` | A | Current domain/working authority; not a competing Vela roadmap. |
| `docs/HANDOFF.md` | C | Updated current-state wording/navigation. |
| `docs/KNOWN_ISSUES.md` | C | Current facts/navigation reconciled; issues retain accepted scope. |
| `docs/PROJECT_STATE.md` | C | Updated current-state wording/navigation. |
| `docs/SHARED_COMPONENT_CATALOG.md` | A | Current domain/working authority; not a competing Vela roadmap. |
| `docs/design/procedural-appearance.md` | A | Current domain/working authority; not a competing Vela roadmap. |
| `docs/design/vela-agent-0.3.3-closure.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/design/vela-agent-0.3.4-closure.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/design/vela-agent-0.3.6-closure.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/design/vela-agent-architecture.md` | A | Current domain/working authority; not a competing Vela roadmap. |
| `docs/design/vela-agent-deferred-0.3.4-constraints.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent-observation-context-plumbing-0.3.3.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent-runtime-contract-foundation-0.3.3.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent-runtime-lifecycle-integration-0.3.3.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent-runtime-shape-0.3.3.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent-runtime-state-convergence-0.3.3.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent-surface-subscription-projection-0.3.3.md` | D | Updated historical-scope/current-state pointer only. |
| `docs/design/vela-agent.md` | D | G → D: SUPERSEDED current-plan role; retained historical design. |
| `docs/reports/FINAL_SETTINGS_IA_PREVIEW.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/FULL_DESIGN_CALIBRATION_WORKSHEET.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/FULL_DESIGN_CANONICAL_PROMOTION_REPORT.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/i18n-usage-report.md` | F | Generated report; unchanged (F9 summary is historical probe evidence). |
| `docs/reports/vela-0.3.9-c1b-f5-native-assistant.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/vela-0.3.9-c1b-f6-measurements.csv` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/vela-0.3.9-c1b-f6-response-budget.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/vela-0.3.9-c1b-f9-probes.json` | F | Generated report; unchanged (F9 summary is historical probe evidence). |
| `docs/reports/vela-0.3.9-c1b-f9-routing.md` | E | Historical outcomes/decisions preserved; pointer only where needed. |
| `docs/reports/vela-0.3.9-c2-closure.md` | E | Updated historical-scope/current-state pointer only. |
| `docs/reports/vela-c4-profile-pilot-results.md` | E | Updated historical-scope/current-state pointer only. |
| `docs/reports/vela-provider-model-qualification.md` | E | Updated historical-scope/current-state pointer only. |
| `docs/schema-drafts/ad-component-kit.registry-schema-draft.md` | D | Historical scope preserved; dated contracts are not current phase instructions. |
| `docs/VELA_ROADMAP.md` | B | NEW — single current canonical roadmap. |
| `docs/reports/documentation-reconciliation-post-vela-0.3.9.md` | E | NEW — this audit inventory, not an additional roadmap. |

Final counts: A=5, B=1, C=4, D=9, E=14, F=2, H=1, G=0; 36 documents. No document deleted.


## Stale-information sweep and verification

Full-text sweep examined current/next/version/roadmap, unsupported streaming/reasoning, terminal-only/single-step-only, old stage TODOs, 0.4 product formation, Observation Window placement and reduced capability-completeness claims. Disposition is semantic, not a blind replacement of old version strings:

- No stale Vela current-stage claim remains in the four onboarding/state entries. Legitimate 0.3.6 package metadata is not stale feature status.
- One exact `terminal-only` candidate remains in C2: terminal-only **validation/admission**, not a claim that streaming is unsupported; preserved as correct evidence.
- The roadmap's common-actions/product-formation matches explicitly reject those incorrect shortcuts.
- Frozen section 12 retains its old numeric dependency map and explicit nonmechanical-version allowance. Current scheduling is cross-referenced from the new roadmap without editing normative content, reassigning Authority, or treating old labels as current status.
- Dated design documents and reports retain then-current claims under explicit historical scope or already clear closure titles/status. No failed run or historical PENDING was mechanically changed to PASS.

- Internal-link check: **90 local Markdown links**, including relative paths and Markdown heading fragments; **0 missing paths/anchors/references**. Fenced examples and external URLs are excluded. No renamed/deleted document targets were introduced. Bare historical local evidence paths are provenance text, not promised repository links.
- Project consistency PASS; generated i18n report freshness PASS; git diff --check PASS. No full production regression was run for this documentation-only task, per the user's scope.
- Frozen architecture Git-normalized blob hash is **2f62df04d5eb873fbfd63217f12b476a8761de5d**, identical to origin/dev. Its content and header remain untouched; Windows CRLF checkout normalization is not an architecture amendment.
- VERSION, CSXS/manifest.xml, host/index.jsx, CHANGELOG.md and all production client/host/scripts remain unchanged against the task baseline.
- Minimal full-text inventory/link-check script and machine results are ignored local audit artifacts under .tmp; no new dependency or product/tooling code enters this PR.


No unresolved documentation contradiction. Package release progression remains separately authorized; no 0.3.10 implementation or frozen architecture amendment is implied by this documentation PR.

## Final Git state

15 tracked documentation files modified; 2 intended new documents untracked. Tracked diff stat below excludes the two new documents. No commit or push performed.

```text
## docs/vela-0.3.9-roadmap-refresh
 M AGENTS.md
 M README.md
 M docs/HANDOFF.md
 M docs/PROJECT_STATE.md
 M docs/design/vela-agent-deferred-0.3.4-constraints.md
 M docs/design/vela-agent-observation-context-plumbing-0.3.3.md
 M docs/design/vela-agent-runtime-contract-foundation-0.3.3.md
 M docs/design/vela-agent-runtime-lifecycle-integration-0.3.3.md
 M docs/design/vela-agent-runtime-shape-0.3.3.md
 M docs/design/vela-agent-runtime-state-convergence-0.3.3.md
 M docs/design/vela-agent-surface-subscription-projection-0.3.3.md
 M docs/design/vela-agent.md
 M docs/reports/vela-0.3.9-c2-closure.md
 M docs/reports/vela-c4-profile-pilot-results.md
 M docs/reports/vela-provider-model-qualification.md
?? docs/VELA_ROADMAP.md
?? docs/reports/documentation-reconciliation-post-vela-0.3.9.md
```

```text
AGENTS.md                                          | 32 ++++++---------
 README.md                                          | 37 ++++--------------
 docs/HANDOFF.md                                    | 42 +++++---------------
 docs/PROJECT_STATE.md                              | 45 +++++++++++++---------
 .../vela-agent-deferred-0.3.4-constraints.md       |  2 +
 ...ela-agent-observation-context-plumbing-0.3.3.md |  2 +
 ...vela-agent-runtime-contract-foundation-0.3.3.md |  2 +
 ...la-agent-runtime-lifecycle-integration-0.3.3.md |  2 +
 docs/design/vela-agent-runtime-shape-0.3.3.md      |  2 +
 .../vela-agent-runtime-state-convergence-0.3.3.md  |  2 +
 ...-agent-surface-subscription-projection-0.3.3.md |  2 +
 docs/design/vela-agent.md                          |  4 +-
 docs/reports/vela-0.3.9-c2-closure.md              |  2 +
 docs/reports/vela-c4-profile-pilot-results.md      |  2 +
 docs/reports/vela-provider-model-qualification.md  |  2 +
 15 files changed, 76 insertions(+), 104 deletions(-)
```
