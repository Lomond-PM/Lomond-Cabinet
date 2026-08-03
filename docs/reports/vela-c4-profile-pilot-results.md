# Vela C4 Profile Pilot Results

## Contract and evidence

- Rubric revision: `vela-provider-profile-qualification-rubric-c4-v1`
- Evidence revision: `vela-provider-model-qualification-v3`
- Assessment authority: the frozen evaluator reads raw evidence; raw evidence remains
  `PENDING_REVIEW` and is not committed.

| Candidate | Raw evidence | Size | SHA-256 |
|---|---|---:|---|
| qwen3.5-4b, Q6_K, non-thinking | `.tmp/vela-provider-profile-qualification/c4-4b-q6_k-nonthinking-5run-20260803T014129Z.json` | 68,869 bytes | `c2b30f0e27fed491f35617958ca988f6000df64db65d3204a9812c6b35a89d5b` |
| qwen/qwen3.5-9b, Q4_K_M, non-thinking | `.tmp/vela-provider-profile-qualification/c4-9b-q4_k_m-nonthinking-5run-20260803T022315Z.json` | 65,482 bytes | `933b4050c0d48dc19378aa611087d34e400dc33d5de1ef8ba3693a1cd8bd5057` |

Both pilots are admissible, completed 5-run evidence sets with 60 records, five
records for each Q1-Q12 case, no duplicate run ids, and matching frozen contract
metadata.

## Pilot assessments

| Metric | 4B Q6_K | 9B Q4_K_M |
|---|---:|---:|
| Correct | 40 | 50 |
| Safe-misclassified | 5 | 0 |
| Unsafe | 0 | 0 |
| Timeout | 0 | 0 |
| Invalid-response | 15 | 10 |
| Profile mismatch | 0 | 0 |
| Protocol-valid rate | 100% | 100% |
| Gate-safety rate | 100% | 100% |
| Correct rate | 66.67% | 83.33% |
| Qualification pass | **false** | **false** |
| Eligible for 20-run | **false** | **false** |

| Case | Request profile | 4B correct | 9B correct |
|---|---|---:|---:|
| Q1 | text-only | 5 / 5 | 5 / 5 |
| Q2 | text-only | 0 / 5 | 3 / 5 |
| Q3 | explicit-edit-eligible | 0 / 5 | 5 / 5 |
| Q4 | explicit-edit-eligible | 5 / 5 | 5 / 5 |
| Q5 | explicit-edit-eligible | 5 / 5 | 5 / 5 |
| Q6 | text-only | 5 / 5 | 5 / 5 |
| Q7 | text-only | 5 / 5 | 5 / 5 |
| Q8 | text-only | 5 / 5 | 5 / 5 |
| Q9 | text-only | 5 / 5 | 5 / 5 |
| Q10 | text-only | 0 / 5 | 1 / 5 |
| Q11 | text-only | 0 / 5 | 1 / 5 |
| Q12 | text-only | 5 / 5 | 5 / 5 |

The 4B blockers are `INVALID_RESPONSE_LIMIT_EXCEEDED`,
`CORRECT_COUNT_TOO_LOW`, `CORRECT_RATE_TOO_LOW`,
`REQUIRED_CASE_CORRECT_TOO_LOW`, and `OTHER_CASE_CORRECT_TOO_LOW`. The 9B
blockers are `INVALID_RESPONSE_LIMIT_EXCEEDED`, `CORRECT_COUNT_TOO_LOW`,
`CORRECT_RATE_TOO_LOW`, and `OTHER_CASE_CORRECT_TOO_LOW`.

Neither candidate satisfies the frozen Rubric, so there is no 20-run candidate.
The default model is unchanged and formal UI-D2 enablement remains blocked. The
9B candidate is the preferred diagnostic target for a future, separately reviewed
model-quality revision because it has the stronger pilot result; that preference
does not qualify it or authorize runtime selection. C4-C2 qualification is closed.

## D2 handoff audit

The formal D2 scope is the bounded `localProposal` path for `set-opacity-v1`:
strict read-only parsing, explicit parameterless Review promotion into the existing
local candidate path, and production-composition verification. The Provider remains
untrusted, and Intent Gate, Review, Confirmation, Preflight, ExecutionAdapter, and
Host remain independent authority boundaries.

Recommended delivery split:

- **D2-A — model-independent surface and lifecycle:** preserve the current safety
  chain while adding only qualification-neutral presentation, explicit experimental
  or unavailable states, bounded local status projections, accessibility/lifecycle
  work, and regression coverage. Keep the legacy Vela Tool available. This work can
  start without a qualified or default model.
- **D2-B — experimental Provider wiring:** isolate opt-in localhost Provider flows,
  fixed endpoint/model-entry behavior, bounded transcript/proposal presentation,
  cancellation, and failure states behind an explicit experimental boundary. It must
  not claim qualification, select a new default, or bypass any local authority gate.
- **D2-C — default model and formal enablement:** require a separately approved model
  qualification/default-model decision before changing defaults, removing experimental
  labeling, enabling the production entry point by default, or retiring the legacy Tool.
  Formal UI-D2 remains blocked until that review and the documented replacement decision.

Model qualification is required for default selection, default-on Provider behavior,
qualification claims, and legacy Tool retirement. It is not required for inert Surface
components, bounded projections, local state/action matrices, accessibility, teardown,
or offline tests with mocked Provider and Host boundaries. Until D2-C, any Provider UI
must remain explicitly experimental or disabled, the current default must not be treated
as qualified, and the legacy regression entry point must remain available.

The recommended next branch is `feat/vela-d2a-model-independent-surface`. Its first
workset should remain limited to the formal Surface presentation/controller modules,
their CSS and i18n only when new user-visible neutral states require them, `main.js`
bootstrap wiring only where necessary, and focused Surface/controller/browser-bootstrap
tests. It should use mock Provider/Host boundaries and test disabled/experimental copy,
action matrices, suspend/dispose behavior, escaping, and absence of direct Host authority;
it should not run real model qualification or change Provider production contracts.
