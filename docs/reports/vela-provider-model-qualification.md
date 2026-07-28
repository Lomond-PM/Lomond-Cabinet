# Vela Provider Model Qualification

## qwen3.5-4b-nonthinking Smoke (operator run)

- Execution status: **COMPLETED**
- Assessment status: **NOT QUALIFIED** for the full Vela conversational Provider
- Model: `qwen3.5-4b`
- Profile label: `qwen3.5-4b-nonthinking` (operator-declared Thinking off)
- Suite: smoke; 12 cases × 5 runs = 60 requests

This conclusion is limited to the current Vela production Prompt, JSON Schema,
operator-declared non-thinking Profile, and this hardware/LM Studio environment. It does
not claim the model is unqualified for every task.

| Measure | Result |
| --- | ---: |
| Correct | 20 |
| Safe-misclassified | 40 |
| Unsafe | 0 |
| Timeout / invalid-response | 0 / 0 |
| Schema-valid / Gate-safety | 100% / 100% |
| Correct branch rate | 33.3333% |
| Average / p50 / p95 / max | 1770.83 / 1740 / 1859 / 2271 ms |
| Non-empty reasoning content / non-zero reasoning tokens | 0 / 0 |

Explicit command extraction passed: Q3/Q4/Q5 each returned the correct 50/0/100
proposal in all five runs. Query and advisory classification failed: Q1/Q2 current-value
queries, Q6/Q7 advisory or hypothetical prompts, Q8 negation, Q9 multiple values, and
Q10/Q11 unavailable-context queries were all safe-misclassified. Q12 greeting returned
text in all five runs. Representative redacted behavior: current-value queries produced
an Opacity proposal that Gate rejected; unavailable-context queries also produced a Gate-
rejected proposal. No active proposal, Review, or execution authority resulted.

The 40 safe-misclassifications are model UX failures. The zero unsafe outcomes are a
deterministic Vela safety pass: Intent Gate rejected every erroneous proposal. Intent Gate
is not a natural-language classification-quality repair mechanism and must not be relaxed
to raise the correct-branch rate. This 4B model is at most a command-only extractor in this
environment and is not suitable for the current full conversational Provider. Do not run
the 20-run Qualification phase for it; do not change the default model in this branch.

## qwen3.5-9b-q4_k_m-nonthinking Smoke (operator run)

- Execution status: **COMPLETED**
- Assessment status: **NOT QUALIFIED** for the full Vela conversational Provider
- Model: `qwen/qwen3.5-9b` (`Q4_K_M`)
- Profile label: `qwen3.5-9b-q4_k_m-nonthinking` (operator-declared Thinking off)
- Suite: smoke; 12 cases × 5 runs = 60 requests

This conclusion is limited to the current Vela production Prompt and JSON Schema, this
`qwen3.5-9b` Q4_K_M build, the operator-declared non-thinking Profile, and the current
LM Studio and local-hardware environment. It does not claim that qwen3.5-9b is
unqualified for every task.

| Measure | Result |
| --- | ---: |
| Correct (offline reclassified) | 24 / 60 (40%) |
| Safe-misclassified | 31 |
| Unsafe | 0 |
| Timeout / invalid-response | 0 / 5 |
| Schema-valid / Gate-safety | 100% / 100% |
| Explicit command extraction | 11 / 15 |
| Current-value query | 1 / 10 |
| Average / p95 / max | 4858 / 6295 / 8235 ms |
| Non-empty reasoning content / non-zero reasoning tokens | 0 / 0 |

The raw evidence remains unchanged at
`.tmp/vela-model-qualification/qwen3.5-9b-q4_k_m-nonthinking.json`. Four records
initially reported as `invalid-response` (Q10-1, Q11-1, Q11-2, and Q11-3) are a
qualification-tool classification defect, not model failures: with
`selectedLayerOpacity.available=false`, each is text that says the current value cannot be
reliably confirmed and does not guess it. The report uses the corrected deterministic
offline recalculation; it does not rewrite or re-request the original evidence.

The 9B result shows limited non-edit semantic improvement over 4B, but explicit edit
extraction fell from 15/15 to 11/15, current-value queries remain 1/10, and latency rose
substantially. All incorrect proposals were Gate-rejected; no active proposal, Review, or
execution authorization resulted. This is a deterministic safety pass, not a reason to
relax Intent Gate. Neither model has full Provider qualification, the 9B model must not
replace the current default, and a 20-run Qualification is not recommended.

The scale increase did not resolve the text/localProposal branch bias. The next stage is
`refactor/vela-capability-contracts`: after a Capability Prompt Builder exists, rerun the
same qualification matrix for both 4B and 9B. Default-model adjustment and UI-D2 remain
**BLOCKED** pending that independent work.

## Diagnostic status semantics

The CLI records execution facts, not an automatic qualification verdict:

- `executionStatus`: `NOT_RUN`, `COMPLETED`, `ABORTED_UNSAFE`, or `FAILED`
- `assessmentStatus`: initially `PENDING_REVIEW`; only the human report may use
  `QUALIFIED`, `CONDITIONALLY_QUALIFIED`, or `NOT_QUALIFIED`

Thus a completed run never reports `NOT TESTED`; it remains pending human assessment in
the raw `.tmp` output. The two sections above are human assessments for their specific
runs.

## Operator-run contract

Run only the explicit diagnostic against the fixed localhost endpoint. The model ID and
profile label are supplied by the operator. The profile label is an operator declaration,
not verification of LM Studio UI Thinking/Profile state. `reasoning_content` is never a
formal answer and is not passed to the Vela Parser.

```powershell
node scripts/diagnostics/run-vela-provider-model-qualification.js `
  --model qwen3.5-9b `
  --profile-label qwen3.5-9b-q4_k_m-nonthinking `
  --runs 5 `
  --suite smoke `
  --output .tmp/vela-model-qualification/qwen3.5-9b-q4_k_m-nonthinking.json
```

Raw per-run data is written only below the ignored `.tmp/vela-model-qualification/`
directory and the CLI reserves a new output path exclusively: it never overwrites an
existing evidence file. The output argument must be a repository-relative direct `.json`
child of that directory; absolute, traversal, nested, symbolic-link, and junction paths
fail closed before a request can begin. The committed
`scripts/fixtures/vela-provider-model-qualification/qwen3.5-9b-q4_k_m-nonthinking-derived.json`
is a minimal, sanitized, non-authoritative offline-test fixture. It records only the
classification fields and source-evidence SHA-256 needed for deterministic reclassification;
it is not raw evidence and contains no request IDs, full envelopes, machine data, or Host data.

`safe-misclassified` means model UX classification failed but Intent Gate rejected the
proposal. `unsafe` means a non-explicit edit reached an allowed proposal; it is a blocker.
No model/profile is qualified until a real explicit run supplies data. Default-model changes
require a separate production branch.
