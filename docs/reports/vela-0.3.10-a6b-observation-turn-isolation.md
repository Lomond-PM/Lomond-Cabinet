# Vela 0.3.10-A6b — Observation Turn Isolation

Status: **A6b PASS / CLOSED**. Offline regression and all 15 required real AE cases PASS. Final user-native confirmation: opacity remained 60 with no additional Vela Undo after R3-N through R4/R5.

Base: `105459b537d518a1199889f42059dcc1ba4f9282` (dev). Branch: `fix/vela-observation-turn-isolation-a6b-0.3.10`. Architecture amendment: **NONE**. No commit, push, PR, or frozen architecture edit.

## Root cause and patch

The pre-fix `AgentObservationRuntime.refresh()` returned any pending `inFlight` Promise before capturing the caller's identity. An independent diagnostics turn A followed immediately by `Driver.startObjective()` (which calls `beginTurn()` at `velaAgentDriver.js:178`) therefore made the new turn B await A. The existing freshness guard correctly rejected A, but that same rejection incorrectly blocked B before Provider grounding. In the reverse order, Owner diagnostics unconditionally called `beginTurn()` and invalidated B itself.

Only two production files change:

- `client/js/vela/velaAgentObservationRuntime.js`: `refresh()` at line 264 captures once and coalesces only exact `agentId`, nonempty `sessionId`, nonempty `turnId`, `scopeToken.scopeId`, and `scopeToken.agentRevision`. Each in-flight record holds its request and Promise. Both settlement branches clear the slot only when it still contains that record. The Promise retains its operation-specific cancel handle.
- `client/js/vela/velaAgentRuntimeOwner.js`: `hasActiveObjective()` at line 328 uses the existing Driver snapshot and the closed states `observing`, `reasoning`, `awaiting-outcome`, `awaiting-review`, `verifying`. `idle` and `terminal` are inactive even when a historical objective ID remains. `refreshActiveComposition()` at line 394 advances a diagnostics turn only without an active objective. During an objective it reads/coalesces within the current turn. Owner cleanup is likewise guarded by captured operation identity.

`cancelActiveCompositionRefresh()` at Owner line 411 cancels only the captured independently owned diagnostics handle. It cannot cancel a newer objective through an ambiguous “latest observation” handle. A diagnostics subscriber to an active objective cannot cancel that objective's shared read and returns false. Driver/Provider cancellation is unchanged.

Freshness remains enforced. Old agent/session/turn/scope/revision results cannot commit or replace the last successful Observation/Context. `CAPABILITY_RESULT_DISCARDED` still maps to `OBSERVATION_RESULT_STALE`. The legacy-provider commit path explicitly checks normalized session/turn identity in addition to scope/revision. The capability success path now also rejects after standalone ObservationRuntime disposal. Stale warnings are not suppressed.

No changes to HostReadSerializer, ContextBridge, ProviderController/Adapter, Driver, Review, Authority, Preflight, ExecutionAdapter, Host JSX, A2–A5 schemas, prompts, or activation policy. No new diagnostics API or runtime instance.

## Offline evidence

`scripts/test-vela-observation-turn-isolation.js`: **75 assertions PASS**, including exact same-turn Promise and one invocation, five identity changes, A/B cleanup, A/B/C ordering, late overwrite prevention, legacy freshness, discard mapping, disposal, real production Owner/Driver/Capability/Serializer/Bridge fixture in both directions, cancellation ownership, Review association, Verify adjacency, and all seven Driver lifecycle policy states.

Four immutable pre-A6b comparisons use the fixed base commit above: text, mutation, already-satisfied, and logical multi-step. Exact Provider wires, canonical evidence, Host requests/events, mutation/Verify counts and Driver terminal snapshots match. Normal sequential Host read counts do not increase. Baselines are neither replaced by HEAD nor fetched by tests.

Supporting fixture changes: explicit session/turn IDs in the legacy observation test; one additive controllable observation hold in `scripts/fixtures/vela-selection-harness.js`. No production timing seam.

Full offline regression: **176/176 runnable suites PASS; 0 skipped**. This includes observation context (82), Owner (70), Driver (223), production lifecycle (34), runtime (93), Provider E2E (333), context selection (724 / 23 immutable comparisons), verified trajectory (416 / 14), capacity (425 / 9), A2 context evidence (241 / 9), multi-step (105), stream lifecycle (14), and bootstrap (39).

Syntax checks, project consistency, i18n generated-report freshness and `git diff --check` PASS. Logs: `%TEMP%/vela-a6b-offline.log` and `%TEMP%/vela-a6b-consistency.log`.

## Real AE method and evidence

Actual loaded panel: `file:///C:/Users/Premi/AppData/Roaming/Adobe/CEP/extensions/com.kevin.aetoolbox/client/index.html`, accessed through the existing CEP remote DevTools on port 8088. Reloaded after patch; both updated factory source checks were true, Developer Mode true, Runtime ready. The existing settings UI enabled `http://127.0.0.1:1234`, model ID `qwen3.8-27b`. This is acceptance using the user's model, not model qualification.

Only real panel DOM/UI actions and existing public getters were used: `VelaActiveCompositionDiagnostics.refresh()/getState()`, the `VelaRuntimeStatusView` property, and `VelaTrajectoryDiagnostics.getEvidence()`. No private Owner reads, second runtime, fake outputs, breakpoint, transport patch, artificial Host delay, native AE automation, or test harness supplied real acceptance facts. Native layer preparation/value/Undo checks were performed by the user.

This is **repeated near-concurrent acceptance**, not proof of exact simultaneous Host execution. In R2-2 a forward overlap was followed by a refresh adjacent to the observed ready Review; exact overlap with its internal capture is not observable from these seams.

Raw JSON and available Console/AX captures are outside the repository:

`C:/Users/Premi/AppData/Local/Temp/vela-a6b-real-rHWTLk/`

`acceptance-index.json` contains exact Provider IDs and per-case filenames. Each case file contains actual Runtime, Observation, trajectory and visible UI. IDs below are abbreviated only for readability; the evidence files contain the full values. `lastTerminalRequestId` identifies a Provider request; Observation `turnId`, `hostContextId`, and Host instance identity are distinct. Failed diagnostics keep last-successful provenance; that older turn must not be mistaken for the new objective's current turn.

Host identity throughout: `host_000001a075772338db4400008d1a0000610e000000000001`; composition `ae-project-1-item-1`; session `session_1`; reload epoch 2.

| Case | Operations / key evidence | Provider request prefix / objective | Result |
| --- | --- | --- | --- |
| Baseline | Independent Observation succeeded; safe text completed | `req_d6d7fb4c` / 1 | PASS |
| R1-1 | Refresh → Send; old diagnostics stale, new objective completed | `req_82dc30b0` / 2 | PASS |
| R1-2 | Repeat refresh → Send; same safe isolation | `req_26ad4ed4` / 3 | PASS |
| R1-3 | Send → refresh; Observation succeeded at turn 7; text completed | `req_73d0d5c8` / 4 | PASS |
| R1-4 | Send → refresh; Observation succeeded at turn 8; text completed | `req_5d465521` / 5 | PASS |
| R2-1 | Send → refresh; Review 50 → 60; refresh while pending kept turn 9, candidate and projection; Reject; no Host invocation | `req_b2dddab7` / 6 | PASS |
| R2-2 | Forward overlap; ready-Review refresh succeeded at turn 11; exact candidate/projection unchanged; Reject; no Host invocation | `req_b68fe3ec` / 7 | PASS |
| R3 | Approve once → refresh; one mutated attempt; hostCommitted true; committed-target verified-match, actual 60; user confirmed one Undo restored 50 | `req_e6728123` / 8 | PASS |
| R3-N | Prepared 60; Approve → refresh; already-satisfied; Host not invoked; independent committed-target verified-match 60; user confirmed no new Undo | `req_deb1c109` / 9 | PASS |
| R4-1 | Actual streaming → refresh → Cancel → refresh → next Send; old cancelled, new marker only; independent read recovered | `req_67b5acab` / 11 (old 10) | PASS |
| R4-2 | Second actual streaming cancel/recovery; old cancelled, new marker only; independent read recovered | `req_5299b64c` / 13 (old 12) | PASS |
| R5-1 | Send → refresh → terminal; Observation succeeded | `req_3e20c8fd` / 14 | PASS |
| R5-2 | Streaming → refresh/Cancel/refresh/next Send; recovered | `req_5231f094` / 16 (old 15) | PASS |
| R5-3 | Send → refresh → terminal; Observation succeeded | `req_2141e58c` / 17 | PASS |
| R5-4 | Streaming → refresh/Cancel/refresh/next Send; recovered | `req_a80d8ad1` / 19 (old 18) | PASS |
| R5-5 | Send → refresh → terminal; Observation succeeded; final independent read succeeded | `req_a3ea1db2` / 20 | PASS |

No pending request remained at the checkpoints. All four cancels were effective while the objective was active and the UI was streaming; Provider terminal was `cancelled / PROVIDER_REQUEST_ABORTED`, Driver terminal `cancelled / AGENT_DRIVER_CANCELLED`. Each following request had a distinct ID, completed with its requested new marker, and did not revive the old result. No execution attempts appeared in text cases.

R3 evidence: `executionAttempted=true`, `hostInvocationAttempted=true`, `mutationDisposition=mutated`, `reportedCommitted=true`, `hostCommitted=true`. Verify source `req_a99c688461738067ec1e88e46bb9449cf68b01a47e60797c77134bc7e93fd0fa`, `verified-match`, `committed-target`, `freshAtRead=true`, expected/actual 60. One declared/completed/verified step.

R3-N evidence: `executionAttempted=true`, `hostInvocationAttempted=false`, `mutationDisposition=already-satisfied`, `reportedCommitted=false`, `hostCommitted=null`; the full evidence includes explicit `host-not-invoked`. Verify source `req_389e70eb41c1bfa8f8dda6de73b468c0dd2157695eec36639b65edd47e350a72`, independently `verified-match / committed-target / freshAtRead=true`, actual 60.

## Console outcomes and limitations

Retained expected diagnostics warnings:

- R1-1, R1-2, forward portion of R2-2, and the four cancel/next-send sequences: `[Vela Agent] listener unavailable: OBSERVATION_RESULT_STALE`. Only old diagnostics failed (`REFRESH_FAILED`); new objectives completed and subsequent independent reads succeeded. Last-successful diagnostics provenance remained visibly old until successful refresh. This is the expressly permitted post-A6b stale outcome.
- R3 and R3-N immediately after Approve: `[Vela Agent] listener unavailable: OBSERVATION_PROVIDER_FAILED`; diagnostics returned `REFRESH_FAILED / ADAPTER_ERROR`. Execution and Verify completed correctly, and the next independent reads succeeded. The unchanged ContextBridge rejects reads while pending (`velaContextBridge.js:838`, 931, 1047, 1255); Observation maps capability adapter failure at `velaAgentObservationRuntime.js:217`. Offline held-Verify coverage confirms this existing local busy path. Real diagnostics expose ADAPTER_ERROR, not its underlying Bridge code, so the busy cause is a source-supported inference, not a claimed directly exposed real error field.

One operator Console input collision produced `Uncaught SyntaxError: Unexpected string` at VM714 when unrelated typed text prefixed a file-save command. It executed no test operation; the capture was saved again. This is not a project-owned scheduling error. The attempted `r3-console.txt` body-text export was incomplete (`]`) because the rendered Console export did not contain its marker; exclude it as evidence. R3 full JSON snapshots, user confirmation and the observed Console output in the task remain evidence. Other raw captures are identified separately, rather than claiming one complete exported Console log.

No demonstrated wrong association, deadlock, permanent pending state, late cross-publication, wrong mutation or failed recovery was observed. Different scheduling order alone is not treated as a race. This does not claim that all reads pass through one serializer, or close future temporal-history/multi-conversation design.

## Handoff

The historical pre-fix R1-1 failure is retained separately under `%TEMP%/vela-a6r-real-VHk7uR`; it is not counted as post-fix acceptance.

USER-MANUAL REAL AE READ-CONTENTION ACCEPTANCE: PASS

A1 U11 CLOSED. A6R PASS. Ready for 0.3.10 documentation reconciliation / integrated closure. A6b was required and is now closed; no further patch was needed during the post-fix real run. The frozen architecture and canonical milestone closure documents remain unchanged; integrated 0.3.10 documentation reconciliation is a subsequent task.

Working tree contains the two production edits, the focused test, two supporting test/fixture edits and this report. No commit, push or PR has been performed.
