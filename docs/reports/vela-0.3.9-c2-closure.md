# Vela 0.3.9-C2 — Final Integration, Regression & Closure

Date: 2026-09-05. **PASS / READY FOR PR** (feature checkpoint targeting dev; not a release).

Architecture amendment: **NONE**. No unresolved 0.3.9 correctness blocker. No commit, push, merge, pull, rebase, reset, tag, release publication, AE automation, or repeat AE acceptance performed in C2.

## 1. Checkout / base / release scope

- Branch: `codex/vela-0.3.9-c1b-f9-routing`.
- HEAD: `17a822ee9d6c0b785c1efeb5fe8ae80d7ba5ad24` (F1–F8 checkpoint).
- Upstream: none for this local F9 branch. Original feature branch was `feat/vela-0.3.9-a1-stream-contract`; no user work was moved to another branch.
- Merge-base with existing `origin/dev`: `0332107ca81c71f1a226edfae402462c193aa955`. C2 uses the existing remote-tracking ref; it did not refresh or alter refs.
- Initial status: one modified tracked F9 E2E test plus five untracked F9 assets. Relative to origin/dev: 56 tracked changed files, before adding those assets.
- `VERSION=0.3.6` remains the existing release-prepared metadata. AGENTS.md and PROJECT_STATE.md distinguish release preparation from later feature phases. This is a 0.3.9 feature checkpoint for dev, so VERSION, manifest, Host projectVersion, CHANGELOG and release tags are unchanged. Latest published version remains the repository's recorded v0.3.5.
- The worktree is intentionally uncommitted. READY FOR PR describes audited content ready for the user's commit/push decision; it does not claim an empty `git status` or an existing PR.

## 2. Stage closure and acceptance provenance

| Stage | Final disposition / provenance |
| --- | --- |
| A1–A4 | PASS: stream contracts, incremental transport, isolated presentation and terminal lifecycle; current offline suites revalidated |
| B1–B4 | PASS: presentation integration, rendering/turn composition and regression; current offline suites revalidated |
| C1a | Real LM Studio protocol acceptance PASS, as carried into C2 by user handoff |
| C1b F1–F8 | Implementation/focused PASS; retained F5 native-assistant and F6 response-budget reports plus deterministic coverage |
| F9 | Routing matrix and same-Controller mixed conversation regression PASS; saved real evidence: 22/22 requests, 12/12 exact two-step plans, reasoning OFF/ON |
| C2 | Cleanup, 52 syntax checks, 26 critical suites, 171/171 offline regression; manual AE acceptance recorded below |

**USER-MANUAL REAL AE ACCEPTANCE: PASS.** The user reports workstation multi-step requests, reasoning OFF/ON, no-op Verify/progression, real actionable mutation, correct second Review capability, and objective completion all passed. Codex did not operate or observe After Effects and did not rerun acceptance.

Earlier workstation ordinary/multi-step refusal: **NON-REPRODUCED HISTORICAL OBSERVATION**. F9 did not establish its historical root cause and made no speculative production routing fix. User acceptance now removes it as a current blocker; C2 does not expand investigation scope.

References: [F5](vela-0.3.9-c1b-f5-native-assistant.md), [F6](vela-0.3.9-c1b-f6-response-budget.md), [F6 measurements](vela-0.3.9-c1b-f6-measurements.csv), [F9 audit](vela-0.3.9-c1b-f9-routing.md), [F9 probe summary](vela-0.3.9-c1b-f9-probes.json).

## 3. Ownership / final production requirements

| Owner | Required final behavior / files |
| --- | --- |
| Provider/transport | ProviderStreamEvents and ProviderStreamAssembler own closed event shape and SSE assembly. LocalTransport owns incremental byte accounting/UTF-8 and protocol-DONE early-stop. ProviderAdapter owns native vs strict structured output, 4 MiB stream ceiling, exact qwen3.5 generation policy, terminal validation and optional bounded diagnostics. ProviderController owns profile selection, context capture and final intent admission. CapabilityPromptBuilder separates native/structured prompts. CepModuleLoader registers the new stream modules. |
| Runtime | Runtime subscribes to Provider presentation, validates current request/generation, projects reasoningInvocationId/presentationMode using the Adapter output decision. The reason() promise still settles from Controller terminal control, never from presentation callbacks. main.js passes this runtime into the Surface. |
| Presentation/UI | PresentationModel owns transient reasoning/text and presentationTurnId, current-turn multi-invocation composition and authoritative reconciliation. TranscriptView renders incrementally, anchors reasoning to the user/terminal, supports disclosure and terminal collapse. SurfaceController owns subscription lifecycle and capability-aware status; velaSurface.css and core i18n supply the UI. |
| Agent execution closure | ExecutionPreflight recognizes fresh actual==desired after trusted binding/check/reservation, avoids executor mutation and preserves verification association. PlanController/ConfirmedAuthorityComposer carry successful noncommit truth; Runtime requires fresh Verify before Driver progression. Host execution uses capability-aware Undo label selection. No AgentDriver normative edits. |
| Tests/diagnostics/docs | Permanent stream, lifecycle, rendering, routing and no-op regressions; production profile fixture and qualification tooling remain aligned. F5/F6/F9 probes are explicit operator tools. Generated i18n report and compact historical evidence remain auditable. |

The full file inventory below separates these changes from the small C2 cleanup. This is not an unexplained aggregate dirty-history diff.

## 4. C2 cleanup / F9 asset decisions

- Removed one empty no-op conditional from the SSE assembler. No transport/Parser/Agent semantics changed.
- F9 diagnostic now requires `--run`; `--conversation` or `--smoke` alone exits with usage/code 2. `--summarize` alone reads saved local evidence without network. Importing the script no longer runs it.
- Added an optional three-request `--run --smoke` mode for native chat/proposal/logical plan, with unchanged production request body and no reasoning override. This diagnostic mode was not executed in C2 because no model was loaded.
- Added five guard assertions to the existing multi-step routing suite: all three diagnostic entry points default to usage, and F9 conversation/smoke flags alone are inert. Suite count unchanged; F9 routing now has 105 assertions.
- Retained F9 shared routing harness, A–F tests, same-instance conversation tests, and production E2E A–D state matrix. They directly prevent TEXT_ONLY/logical routing and no-op progression regressions. Fixture Host never calls AE.
- Retained F9 report and structured probe summary under established docs/reports convention. Replaced per-record `.tmp` path fields with stable evidenceId; saved request hashes/decisions/outcomes remain. Updated F9 current status to user-manual PASS and linked this closure.
- Added historical-status pointers to F5/F6 and removed obsolete machine-specific absolute LM Studio installation/log paths from F6. No unrelated documentation reorganization.
- Retained F6 50-row measurement CSV: bounded measurements and hashes justify the final 4 MiB/budget choices. It contains no raw SSE/reasoning payload. Relative historical evidence locators identify provenance, not a prerequisite for another checkout.
- `.tmp/vela-f9`, local regression logs and other local evidence remain ignored; F5/F6 raw directories are absent in this checkout. `git ls-files .tmp` is empty; `.gitignore` pattern `*.tmp` ignores the `.tmp` directory itself. No raw SSE, local LM Studio log, replay or generated scratch file is in the final inventory. Local files were not bulk-deleted.
- No console/TODO/FIXME/WIP logging remains in changed production Vela modules. Diagnostic console summaries stay in scripts. No dead debug-only production subsystem was found; no broad cleanup refactor was performed.

`debugTerminalDiagnostics` retained: Adapter-only explicit `=== true`, never enabled by production Controller/Runtime defaults, not persisted. Rejected terminal preview is capped at 4096 code units; reasoning/raw SSE are excluded, reader error fields capped at 128/256. It may contain rejected model text only when explicitly enabled locally; it is not a telemetry/export feature. It never enters transcript, Context, Observation, Agent, Authority or execution. Existing publication tests verify its isolation.

## 5. Final defaults

| Area | Final state |
| --- | --- |
| Streaming | Production Runtime default enabled; explicit presentationStreaming=false keeps nonstream fallback. Low-level Adapter still opts into streaming explicitly. |
| TEXT_ONLY | native-assistant / assistant-text; no response_format/json_schema; delta.content is human-facing prose; Adapter privately constructs/validates canonical response metadata. |
| Structured | proposal and logical-plan strict json_schema; partial JSON excluded from presentation prose and candidate admission; invalid structured response never falls back to successful text. |
| Reasoning | Independent untrusted presentation-only channel; excluded from subsequent model messages, Observation, Authority, justification and execution. No cross-turn raw reasoning retention. |
| qwen3.5-4b | Exact model-id policy only: ordinary thinking_budget_tokens=6144 / max_tokens=8192; structured 2048/4096. Other model ids inherit none of these qwen-specific fields. Reasoning mode remains Provider/operator-controlled. |
| Transport limits | 4,194,304 raw stream bytes, including reasoning/content/framing; canonical/nonstream JSON limit remains 262,144 bytes. Pre-DONE failure fails; post-DONE close/cancel cannot overwrite protocol completion. finish_reason=length fails terminal validation. |
| Presentation | Active reasoning expandable/collapsible; terminal reasoning retained on current turn, default collapsed, between its user and authoritative terminal. New objective clears previous raw reasoning. Multi-invocation presentation ids carry no Agent step/plan authority. |
| Execution | Fresh actual==desired → already-satisfied, committed=false, no executor/Host mutation or Undo. Fresh Verify remains required. Each logical step advances only through existing Driver control. Undo labels: Vela: Set Opacity / Vela: Rename Layer. |

## 6. Trust-boundary audit

All twelve invariants PASS under source review and current regression coverage; this is not a claim of formal verification.

| Invariant | Ownership evidence / tests (scripts/test-vela-*.js) |
| --- | --- |
| 1. raw reasoning is not trusted Agent state | StreamEvents closed schema, Runtime projection, PresentationModel-only storage; runtime / stream-events / production-e2e |
| 2. text delta is not proposal | Adapter event path has no candidate admission; native JSON-looking prose remains inert; native-assistant-output |
| 3. partial structured JSON is not candidate | Parser/profile/Controller validation is terminal-only; PresentationModel filters structured text; stream-lifecycle / presentation-model-streaming / multistep-routing |
| 4. stream-completed is not authoritative success | Adapter emits presentation completion before terminal parser; malformed terminal still fails; provider-stream-publication |
| 5. presentation cannot settle Runtime.reason() | dispatchPresentationEvent only forwards to listeners; reason() resolves through Controller.send promise; runtime / provider-stream-lifecycle |
| 6. structured admission follows complete validation | Adapter Parser+metadata+profile check → Controller logical contracts+Intent Gate → Runtime → Driver; provider-controller / multistep-routing / production-e2e |
| 7. Provider does not own Authority | No stream event or Provider declaration gains binding/token/nonce/Host payload; stream-events / confirmed-authority-composer / full authority suites |
| 8. Review/Authority/Preflight/Host/Verify retained | Fresh guard check/reserve still precedes execution/no-op; execution-preflight / confirmed-authority-composer / execution-host / production-e2e |
| 9. no-op derives from fresh state | Preflight compares fresh captured value to trusted expectation; committed=false; post-terminal fresh Verify can still mismatch; execution-preflight / plan-controller / production-e2e |
| 10. malformed/truncated/overflow never partially commits | Byte ceiling, DONE requirement, terminal finish-reason check and Parser validation precede candidate admission; local-transport / stream-assembler / response-budget / stream-lifecycle |
| 11. cancel/timeout/stale/late isolation | Provider current generation/pending checks, Runtime epoch/invocation checks, Surface subscription teardown; stream-publication / stream-lifecycle / runtime / surface-controller |
| 12. presentation ids have no control authority | presentationTurnId anchors DOM only; reasoningInvocationId routes transient events only; transcript-turn-composition / multistep-presentation / runtime |

No invariant failure was found; no correctness fix outside cleanup was attempted.

## 7. Final verification

- 52/52 changed `.js` files pass `node --check`, including files new to Git. Changed Host JSX is covered by execution-host/ES3 checks in the full suite.
- Project consistency PASS; generated i18n report freshness PASS; `git diff --check` PASS; no manual report regeneration necessary.
- 26/26 focused critical suites PASS (full list in local `.tmp/vela-c2-checks.json`): Agent CEP hybrid, AgentDriver, CEP loader, ConfirmedAuthorityComposer, ExecutionHost, ExecutionPreflight, LocalTransport, multi-step presentation/routing, native output, PlanController, PresentationModel streaming, ProviderController, production E2E, five Provider stream suites, response budget, Runtime, SurfaceController, four transcript suites.
- `node scripts/run-all-tests.js`: **171/171 runnable suites PASS; 0/171 skipped**. Count unchanged from F9: cleanup strengthened one suite, added none and removed none.
- Critical matrix: Host fixture write counts A/B/C/D = **2/1/1/0**, two independent Reviews and two fresh Verifies in every case. Production E2E: 333 assertions; routing: 105 assertions.
- Diagnostics default gates PASS with no requests. Changed loader/global behavior was not introduced in C2; CEP/hybrid tests passed, so no additional loader order campaign was run.
- Optional new Provider smoke **SKIPPED**: local HTTP model catalog responded, but `lms ps` explicitly reported no loaded models. Catalog visibility is not readiness. No model loaded, no new inference sent, no benchmark rerun. Prior real evidence retained: C1a user handoff, F5, F6 final 12/12, F9 22/22 including 12 exact logical plans.
- Local logs: `.tmp/vela-c2-checks.log`, `.tmp/vela-c2-checks.json`, `.tmp/vela-c2-full-regression.log`. They are ignored scratch evidence, not PR content.

## 8. Frozen architecture / deferred scope

`docs/design/vela-agent-architecture.md` remains **FROZEN FOR 0.3.x**, with no Git diff against origin/dev and the same Git-normalized blob hash (the Windows checkout uses CRLF while the repository blob uses LF); architecture amendment **NONE**. This report follows existing reports convention; no roadmap/release rewrite or 0.3.10 design started.

Deferred, not 0.3.9 failures:

- qwen3.5-4b verbosity/repetitive deliberation; model/provider tuning and qualification refinement.
- Cross-turn reasoning UI history; raw reasoning in model context remains prohibited by default, with any future change requiring separate design.
- Context Architecture → 0.3.10; Multi-conversation → 0.3.11.
- Mixed assistant text + proposal/action composition; Response Parts / tool-action channel.
- Proposal Card, Execution Card, Agent Activity UI.
- TTFT/token usage/TPS presentation telemetry.
- Complete AE capability coverage and capability metadata generalization.
- Reasoning truncation/summarization/virtualization and long-context generation budget management.

## 9. Final Git inventory / hygiene

The following complete inventory includes tracked differences against origin/dev **and** the six intended untracked assets, including this report. Untracked source/docs must be included when the user later authorizes a commit; they are not local scratch. No unexpected files, raw captures or generated scratch artifacts require removal. The only generated tracked-input report, i18n usage, is fresh.

### Production (18)

- `client/css/velaSurface.css`
- `client/js/i18n.js`
- `client/js/main.js`
- `client/js/vela/velaCapabilityPromptBuilder.js`
- `client/js/vela/velaCepModuleLoader.js`
- `client/js/vela/velaConfirmedAuthorityComposer.js`
- `client/js/vela/velaExecutionPreflight.js`
- `client/js/vela/velaLocalTransport.js`
- `client/js/vela/velaPlanController.js`
- `client/js/vela/velaPresentationModel.js`
- `client/js/vela/velaProviderAdapter.js`
- `client/js/vela/velaProviderController.js`
- `client/js/vela/velaProviderStreamAssembler.js`
- `client/js/vela/velaProviderStreamEvents.js`
- `client/js/vela/velaRuntime.js`
- `client/js/vela/velaSurfaceController.js`
- `client/js/vela/velaTranscriptView.js`
- `host/vela/velaExecution.jsx`

### Tests / diagnostics / fixtures / consistency tooling (37)

- `scripts/check-project-consistency.js`
- `scripts/diagnostics/probe-vela-multistep-routing.js` — untracked, intended for PR
- `scripts/diagnostics/probe-vela-native-assistant.js`
- `scripts/diagnostics/probe-vela-response-budget.js`
- `scripts/diagnostics/run-vela-provider-model-qualification.js`
- `scripts/diagnostics/velaProviderModelQualification.js`
- `scripts/fixtures/vela-capability-contracts/provider-branch-profiles-v3.json`
- `scripts/fixtures/vela-routing-harness.js` — untracked, intended for PR
- `scripts/test-vela-capability-contracts.js`
- `scripts/test-vela-capability-prompt-builder.js`
- `scripts/test-vela-cep-module-loader.js`
- `scripts/test-vela-confirmed-authority-composer.js`
- `scripts/test-vela-execution-preflight.js`
- `scripts/test-vela-local-transport.js`
- `scripts/test-vela-multistep-presentation.js`
- `scripts/test-vela-multistep-routing.js` — untracked, intended for PR
- `scripts/test-vela-native-assistant-output.js`
- `scripts/test-vela-plan-controller.js`
- `scripts/test-vela-presentation-model-streaming.js`
- `scripts/test-vela-prompt-stability.js`
- `scripts/test-vela-provider-branch-profiles.js`
- `scripts/test-vela-provider-controller.js`
- `scripts/test-vela-provider-model-qualification.js`
- `scripts/test-vela-provider-production-e2e.js`
- `scripts/test-vela-provider-proposal-router.js`
- `scripts/test-vela-provider-stream-assembler.js`
- `scripts/test-vela-provider-stream-equivalence.js`
- `scripts/test-vela-provider-stream-events.js`
- `scripts/test-vela-provider-stream-lifecycle.js`
- `scripts/test-vela-provider-stream-publication.js`
- `scripts/test-vela-provider.js`
- `scripts/test-vela-response-budget.js`
- `scripts/test-vela-runtime.js`
- `scripts/test-vela-surface-controller.js`
- `scripts/test-vela-transcript-reasoning.js`
- `scripts/test-vela-transcript-streaming.js`
- `scripts/test-vela-transcript-turn-composition.js`

### Docs (7)

- `docs/reports/i18n-usage-report.md`
- `docs/reports/vela-0.3.9-c1b-f5-native-assistant.md`
- `docs/reports/vela-0.3.9-c1b-f6-measurements.csv`
- `docs/reports/vela-0.3.9-c1b-f6-response-budget.md`
- `docs/reports/vela-0.3.9-c1b-f9-probes.json` — untracked, intended for PR
- `docs/reports/vela-0.3.9-c1b-f9-routing.md` — untracked, intended for PR
- `docs/reports/vela-0.3.9-c2-closure.md` — untracked, intended for PR

Total: 62 files (56 tracked differences + 6 intended untracked additions).

Current status (relative to HEAD):

```text
## codex/vela-0.3.9-c1b-f9-routing
 M client/js/vela/velaProviderStreamAssembler.js
 M docs/reports/vela-0.3.9-c1b-f5-native-assistant.md
 M docs/reports/vela-0.3.9-c1b-f6-response-budget.md
 M scripts/test-vela-provider-production-e2e.js
?? docs/reports/vela-0.3.9-c1b-f9-probes.json
?? docs/reports/vela-0.3.9-c1b-f9-routing.md
?? docs/reports/vela-0.3.9-c2-closure.md
?? scripts/diagnostics/probe-vela-multistep-routing.js
?? scripts/fixtures/vela-routing-harness.js
?? scripts/test-vela-multistep-routing.js
```

Tracked final diff stat against origin/dev (Git does not count untracked additions here):

```text
client/css/velaSurface.css                         |  62 ++++++
 client/js/i18n.js                                  |  14 ++
 client/js/main.js                                  |   1 +
 client/js/vela/velaCapabilityPromptBuilder.js      |   8 +-
 client/js/vela/velaCepModuleLoader.js              |   4 +
 client/js/vela/velaConfirmedAuthorityComposer.js   |   5 +-
 client/js/vela/velaExecutionPreflight.js           |  42 +++--
 client/js/vela/velaLocalTransport.js               |  83 +++++++-
 client/js/vela/velaPlanController.js               |   6 +-
 client/js/vela/velaPresentationModel.js            |  50 ++++-
 client/js/vela/velaProviderAdapter.js              | 196 +++++++++++++++++--
 client/js/vela/velaProviderController.js           |  23 ++-
 client/js/vela/velaProviderStreamAssembler.js      |  68 +++++++
 client/js/vela/velaProviderStreamEvents.js         |  57 ++++++
 client/js/vela/velaRuntime.js                      |  58 +++++-
 client/js/vela/velaSurfaceController.js            |  44 ++++-
 client/js/vela/velaTranscriptView.js               | 156 ++++++++++++++-
 docs/reports/i18n-usage-report.md                  |  11 +-
 docs/reports/vela-0.3.9-c1b-f5-native-assistant.md | 150 +++++++++++++++
 docs/reports/vela-0.3.9-c1b-f6-measurements.csv    |  51 +++++
 docs/reports/vela-0.3.9-c1b-f6-response-budget.md  | 209 +++++++++++++++++++++
 host/vela/velaExecution.jsx                        |   5 +-
 scripts/check-project-consistency.js               |  14 +-
 scripts/diagnostics/probe-vela-native-assistant.js |  92 +++++++++
 scripts/diagnostics/probe-vela-response-budget.js  | 146 ++++++++++++++
 .../run-vela-provider-model-qualification.js       |  13 +-
 .../diagnostics/velaProviderModelQualification.js  |  10 +-
 .../provider-branch-profiles-v3.json               |  31 +++
 scripts/test-vela-capability-contracts.js          |   4 +-
 scripts/test-vela-capability-prompt-builder.js     |   6 +-
 scripts/test-vela-cep-module-loader.js             |   6 +-
 scripts/test-vela-confirmed-authority-composer.js  |   4 +
 scripts/test-vela-execution-preflight.js           |  28 ++-
 scripts/test-vela-local-transport.js               |  59 +++++-
 scripts/test-vela-multistep-presentation.js        |  32 ++++
 scripts/test-vela-native-assistant-output.js       |  80 ++++++++
 scripts/test-vela-plan-controller.js               |   4 +
 scripts/test-vela-presentation-model-streaming.js  |  52 +++++
 scripts/test-vela-prompt-stability.js              |  10 +-
 scripts/test-vela-provider-branch-profiles.js      |  15 +-
 scripts/test-vela-provider-controller.js           |  73 ++++---
 scripts/test-vela-provider-model-qualification.js  |  14 +-
 scripts/test-vela-provider-production-e2e.js       |  81 ++++++--
 scripts/test-vela-provider-proposal-router.js      |   6 +-
 scripts/test-vela-provider-stream-assembler.js     |  22 +++
 scripts/test-vela-provider-stream-equivalence.js   |  44 +++++
 scripts/test-vela-provider-stream-events.js        |  31 +++
 scripts/test-vela-provider-stream-lifecycle.js     |  68 +++++++
 scripts/test-vela-provider-stream-publication.js   |  81 ++++++++
 scripts/test-vela-provider.js                      |   9 +-
 scripts/test-vela-response-budget.js               |  95 ++++++++++
 scripts/test-vela-runtime.js                       |  36 +++-
 scripts/test-vela-surface-controller.js            |  45 ++++-
 scripts/test-vela-transcript-reasoning.js          |  41 ++++
 scripts/test-vela-transcript-streaming.js          |  34 ++++
 scripts/test-vela-transcript-turn-composition.js   |  40 ++++
 56 files changed, 2440 insertions(+), 189 deletions(-)
```

Final judgment: **Vela 0.3.9-C2 PASS / READY FOR PR**. No remaining correctness blocker; commit/push/PR publication remains for the user's next instruction.
