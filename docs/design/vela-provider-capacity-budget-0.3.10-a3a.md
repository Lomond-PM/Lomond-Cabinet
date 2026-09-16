# Vela 0.3.10-A3a — Provider Capacity Source & Context Budget Policy Decision

Status: audit and design decisions recorded; A3b enforcement NOT implemented.

Baseline: clean `dev` at `9af6d3bc54830eed164096c705959174950f8050`, with A2 merged. Vela 0.3.9 remains COMPLETE / SEALED. [A1 Context contract](vela-context-architecture-0.3.10-a1.md) governs domain/trust/lifecycle separation; [A2 evidence report](../reports/vela-0.3.10-a2-context-evidence.md) describes current immutable input evidence. [Frozen architecture](vela-agent-architecture.md) remains unchanged; architecture amendment NONE. [Roadmap](../VELA_ROADMAP.md) owns sequencing.

This is documentation-only. CURRENT denotes code/retained test or experiment evidence. DECISION constrains future implementation. EXPERIMENT REQUIRED is not an established Provider guarantee. No new request, tokenizer, truncation, selector, capacity discovery call, enforcement, generation tuning or real AE/LM Studio experiment is performed here.

## A. Current capacity-source inventory

| Source | Actual producer / consumer | Identity, lifetime and unknown behavior | Capacity-policy eligibility |
| --- | --- | --- | --- |
| Readiness `contextLength` | `ProviderController.checkReadiness` calls normalized endpoint `/api/v1/models`; reads `loaded_instances[0].config.context_length`; Surface retains result | Provider-reported loaded configuration, not operator input or inferred architecture maximum. Positive integer accepted; otherwise null. Missing model/unloaded model returns ready=false with null. Ready=true does not require non-null contextLength. | Candidate discovery source only; current flattened result NOT approved as binding capacity. |
| Model metadata / loaded identity | Readiness matches requested model against catalog `key` or any loaded instance `id`; returns requested modelId, loadedInstances count, quantization | After matching an instance, code still reads index 0's config. Actual matched instance id, config revision, sampling time and expiry are not returned. Multiple loaded instances can therefore make reported length ambiguous. | Cannot infer that first instance serves this request. No capacity rule from model-name similarity. |
| Surface readiness cache | `enableExperimental`, `configureExperimental`, `disableExperimental` | Session-only. Config change cancels/invalidates old check; generation rejects late readiness. Successful result is retained; no periodic capacity refresh, TTL or same-name instance-reload detection. Suspend does not itself rediscover capacity. | Not a per-invocation freshness certificate; Surface must not become budget owner. |
| Settings endpoint/model | `main.js` and Settings schema | Operator-configured endpoint/model strings persist; acknowledgement/readiness/enablement do not. No capacity input field or persisted capacity policy found. | These strings identify configuration, not capacity. A persisted model name is not proof of a loaded instance. |
| Request branch/profile | Local request branch policy, Controller, Adapter | Per request; text-only / explicit edit / bounded logical / compatibility union. Profile selects instructions/schema and generation mapping. | Profile is budget context, not a discovered model window. |
| `max_tokens` / `thinking_budget_tokens` | Adapter `getGenerationPolicy`, `buildOpenAiBody` | Exact `qwen3.5-4b` mapping only; other ids return null and omit both fields. | Generation controls, NOT capacity evidence. |
| Protocol/transport limits | Protocol HARD_LIMITS; Adapter; LocalTransport | Request 64 KiB, message 16 KiB subject to other validators; canonical/nonstream response 256 KiB; stream 4 MiB including framing/reasoning. | Independent hard byte limits, never context capacity. |
| Completion usage | Adapter `validateInertWrapperMetadata` accepts bounded prompt/completion/total counts and reasoning token details | Optional terminal metadata validated as inert fields. It is not a preflight count API, capacity certificate or future-request token estimate; streaming canonicalization does not establish a general usage-accounting source. | Historical measurement only; cannot authorize next input growth. |
| A2 budget fields | Adapter/Controller debug evidence | Actual canonical/wire/message UTF-8 costs; tokenCost and modelContextCapacity explicitly null | Cost evidence, not capacity discovery or selection authority. |
| Historical F6 workstation configuration | 0.3.9 F6 report: context loaded at 8192, low-input real probes | Historical exact environment evidence; not current endpoint/instance state or a universal model maximum | Experimental provenance only; cannot seed a default current capacity of 8192. |

Source anchors (baseline symbols/lines, not an external API claim):

- [ProviderController](../../client/js/vela/velaProviderController.js): `normalizeEndpoint`, `checkReadiness` (around 264–321), especially instance matching followed by `loaded[0]`.
- [SurfaceController](../../client/js/vela/velaSurfaceController.js): `configureExperimental`, `enableExperimental`, `disableExperimental`, `suspend` (215–297).
- [main.js](../../client/js/main.js): model normalization/configuration, `collectSettings`, `applySettings` (around 326–370, 9491–9516); [Settings schema](../../client/js/settingsSchema.js), endpoint/model fields.
- [ProviderAdapter](../../client/js/vela/velaProviderAdapter.js): generation constants/`getGenerationPolicy` (152–159), `validateInertWrapperMetadata` (247 onward), `buildOpenAiBody`, response validation; [Protocol](../../client/js/vela/velaProtocol.js), HARD_LIMITS; [LocalTransport](../../client/js/vela/velaLocalTransport.js), sendJson/readStream.
- [Readiness fixture](../../scripts/fixtures/vela-provider-readiness/lm-studio-models-native-v1.json): one loaded 9B instance with context_length=8192, unloaded 4B and embedding entries. This fixture does not prove correct multi-instance capacity routing.
- [F6 report](../reports/vela-0.3.9-c1b-f6-response-budget.md), §§5, 11–12 and generation semantics: historical context, field support and low-input calibration limitations.

DECISION: no current production source is already sufficient to claim a fresh, invocation-bound hard capacity. Preserve readiness behavior; do not fix its flattening as incidental A3a cleanup. Approve the native loaded-instance configuration as the preferred FUTURE discovery source only after exact-instance/routing correlation and validity requirements below are met.

## B. Capacity trust taxonomy

“Authoritative capacity” means usable by a local resource-budget decision under a validated Provider contract. It never means AE execution Authority, model qualification or activation permission.

| Class | Trust meaning / owner | Correlation and stale semantics | Fallback / decision eligibility |
| --- | --- | --- | --- |
| Provider-reported | Provider reports active instance configuration; Provider-side discovery/normalization owns interpretation | Endpoint, provider contract/backend identity, requested model, resolved instance/config, sampling boundary and current runtime lifetime required. Ambiguous routing, reload, failed refresh or mismatched identity invalidates binding use. | Preferred conditional source. Current readiness flattening remains advisory. Qualified source may support numeric fit/overflow decisions; never silently truncate. |
| Operator-configured | Explicit local budget intent, NOT verified physical capacity; trusted configuration owner | Exact endpoint/model and policy revision required; changes invalidate prior decisions. No such current field exists. | Unverified configured capacity cannot establish model fit or lift limits. A separately explicit operator hard budget may restrict a request as local policy, labeled as such, not model overflow. No new settings UI in A3a/A3b. |
| Model-profile-known | Reviewed artifact/backend/profile metadata, not guessed from a brand/id | Must distinguish theoretical maximum from actual loaded window and bind exact policy/model/runtime compatibility | A documented maximum alone is not the active configured capacity. Only a reviewed contract establishing actual configuration can supply usable capacity. No current entry qualifies. |
| Estimated / heuristic | Inference about possible capacity; no verified resource guarantee | Method, version, basis and identity needed; stale on any underlying change | Diagnostic only. Cannot justify expansion, certify fit or silently omit required input. |
| Unknown / unavailable | No usable positive capacity, ambiguous source, invalid value or stale evidence | Explicit reason and known identity; never default to zero/infinity | Current-shape compatibility mode (§F); no optional context growth. |

Selection/truncation authorization remains a local content policy responsibility: even qualified capacity only provides a constraint. It cannot decide that required text is disposable. All actual truncation remains excluded.

When fresh sources conflict, do not take the largest number. A qualified active capacity plus explicit local hard ceiling may yield the smaller local operating ceiling, retaining both provenances. Conflicting instance reports or unresolved routing yield unknown. Do not substitute catalog maximum, last successful readiness or heuristic capacity after discovery failure. Future new source kinds require reviewed normalization, not a generic “trusted” boolean.

## C. Current generation-policy evidence

| Model / profile | Fields actually sent | Supported interpretation |
| --- | --- | --- |
| Exact `qwen3.5-4b`, native assistant TEXT_ONLY | thinking_budget_tokens=6144; max_tokens=8192 | Current calibrated reasoning allowance and total generation cap |
| Exact `qwen3.5-4b`, structured proposal | thinking_budget_tokens=2048; max_tokens=4096 | Same generation owner, smaller structured policy |
| Exact `qwen3.5-4b`, logical plan / retained union | thinking_budget_tokens=2048; max_tokens=4096 | Non-TEXT_ONLY mapping; no new logical-plan-specific reserve |
| Every other model id, including related brand/path names | Neither field added | Provider defaults remain unknown locally; no inherited Qwen policy |

CURRENT code and F6 evidence establish that this calibrated path treats `max_tokens` as shared reasoning + final generation allowance. `thinking_budget_tokens` is not added on top of it. Neither field is a hard model context length. The arithmetic differences 8192−6144 and 4096−2048 are nominal headroom, NOT guaranteed independent final-only reservations.

The Adapter does not send reasoning_effort for this policy; operator reasoning on/off choice is preserved. Native text has no model JSON envelope/strict response_format, structured paths send the existing json_schema, and stream selection is unchanged. No field-support negotiation or automatic retry after removing an unsupported generation field exists. Non-200 responses fail with the existing Provider HTTP error; a server that silently ignores a field cannot be detected merely because a response succeeds. Malformed terminal/length failures remain fail-closed through existing validation.

Historical F6 tested this LM Studio/model environment and some unsupported options. Those findings are not proof for all backends/versions. In particular, it explicitly says 8192 loaded context and output cap constrain actual generation together and probes used low input. It does NOT prove that the endpoint requires `input + requested max_tokens <= contextLength`, guarantees a final reserve, or preserves the same headroom near capacity. EXPERIMENT REQUIRED before claiming clamp/reject/truncate behavior near the window boundary.

## D. Budget domains and exact ownership

| Domain / responsibility | Owner | Constraint |
| --- | --- | --- |
| A transport byte ceiling / final byte validation | Protocol defines ceilings; Adapter validates body/canonical request; Transport validates actual wire/response | Independent admission check; no renaming to context-window management |
| B Provider input context budget | Future local Provider construction policy coordinated by Runtime, using Controller/Adapter construction | A3 computes eligible input bound; A5 later owns optional-item selection policy. A2 cannot select. |
| C output generation reserve | Adapter's reviewed model/profile generation contract | Distinguish requested maximum M from usable reserved headroom G; do not change current fields |
| D reasoning generation budget | Same Adapter model/profile policy | For current calibrated semantics reasoning is inside total generation, not an additional context reservation |
| E hard model capacity discovery | Provider-side discovery via existing local Provider/transport boundary | Surface readiness may display results but cannot own authoritative normalization/cache |
| Capacity normalization | Provider-side narrow pure normalizer; Runtime supplies current invocation/config lifetime | Positive safe integer, unit/token-basis semantics, source/provenance, instance ambiguity, stale checks; no name inference |
| F estimation uncertainty / safety reserve | Input accounting method owns error bound; reviewed budget policy owns additional safety reserve | No arbitrary constant percentage claimed safe; unknown bound remains unknown |
| Input cost accounting | Adapter-side accounting of finalized construction; optional Provider count source only after review | Include actual model prompt transformation obligations, not just wire byte length |
| Final numeric fit decision | Local Provider construction policy immediately before dispatch eligibility, with current identity check | Does not grant execution Authority or alter branch/profile/intent |
| A2 evidence reporting | Existing Controller/Adapter evidence seam and Transport serialization projection | Reports actual input/cost; future correlated decision evidence records basis/disposition separately |

No universal BudgetManager, persistent capacity service or new context owner is required. Placement describes responsibilities, not an approved new module/API shape. Runtime/Driver/Surface cannot infer fresh capacity from A2's recorded input, and generation policy remains Adapter-owned.

## E. Token-cost strategy decision

| Candidate | Allowed use | Accuracy limit |
| --- | --- | --- |
| Exact local tokenizer | Future fit accounting if exact tokenizer/template/model revision and all prompt transformations are known | Encoding user text alone is not exact full request cost; system/assistant roles, special tokens, chat template, schema injection and backend transformations must be covered |
| Provider-supplied preflight count | Preferred potential full-input count if bound to the exact request and serving instance | No such production count API exists here; requires reviewed API/experimental evidence, not inferred from completion usage |
| Provider terminal usage | Historical validation/calibration | Too late to authorize this request and not reusable as next request's exact cost |
| Deterministic local estimate | Diagnostic, or numeric conservative gating only with a validated finite upper error bound for this backend/input class | Must be labeled estimated; repeatability alone does not prove a bound |
| Byte-derived estimate | Current bytes remain exact bytes; any conversion is heuristic unless separately validated | No approved bytes-per-token ratio; UTF-8/JSON/SSE sizes are not token counts, including non-ASCII and schema/template overhead |
| Unknown cost | Valid explicit state | Current-shape compatibility mode; no certified token fit and no optional expansion |

DECISION — A3b minimum acceptable implementation is **exact current byte accounting plus explicit unknown token accounting**, together with the conditional numeric decision contract below. It MUST NOT ship a guessed tokenizer ratio as the basis for hard model-fit claims. Numeric enforcement requires either full exact accounting or a finite, validated conservative upper bound. A heuristic without that bound cannot reject current required content solely because its estimated token count is large; it may report uncertainty. This permits useful bounded enforcement without pretending a tokenizer exists.

If an estimate is later supplied, required metadata: method id/version, unit, endpoint/model/backend/tokenizer/template applicability, counted components and omitted overhead, point estimate if any, lower/upper or absolute error bound (null if unknown), calibration evidence id and applicability limits, source/measurement time or invocation boundary, rounding rule, and whether the upper bound is certified for this use. Statistical confidence/average error must not be labeled a hard bound. Unknown error or hidden template cost cannot be replaced by zero. Round validated upper bounds upward and usable capacities downward in the same token basis.

Safety margin is required whenever known residual accounting error exists. Exact full-prompt accounting may use zero estimation error; an additional safety reserve may be zero only under an explicitly reviewed contract with no unaccounted overhead. No default 5%, 10%, 1024 or other invented reserve is approved. If no finite defensible bound exists, the result is unassessed, not “fits with margin.”

## F. Unknown-capacity policy — resolved in A3a

Define **current-shape compatibility** narrowly: the existing locally built system/profile instructions, response contract/grounding envelope and current user objective, with no added history/optional context and all existing byte, timeout, streaming, Parser and activation restrictions intact. This is bounded by existing safeguards; it is not a promise that every such request fits the model, nor a new numerical definition of “short.”

| Capacity / cost / reserve situation | Future disposition |
| --- | --- |
| Qualified current capacity + usable exact/bounded cost + known reviewed reserve | Apply §G; allow only if mandatory construction fits the applicable policy |
| Capacity number configured but unverified | Do not certify model fit; current-shape compatibility. If operator separately mandated a hard local ceiling, honor it as operator policy when comparable cost is usable; do not invent such a mandate from the word capacity |
| Capacity unavailable/unknown/ambiguous | Continue current-shape requests under existing limits with `unassessed-capacity`; optional context expansion disabled |
| Capacity stale after endpoint/model/instance switch | Discard it for decisions; fresh discovery or unknown compatibility, never implicit reuse |
| Readiness unavailable/stale | No usable capacity from it. Existing readiness/experimental activation gate remains independent: if that gate blocks calls, this policy cannot reopen it |
| Qualified capacity + exact cost + unknown generation reserve | Input-only bound can detect definite input overflow; otherwise current-shape compatibility with `unassessed-generation-reserve`, not full-fit certification |
| Qualified capacity + unbounded estimate/unknown cost | Current-shape compatibility with `unassessed-input-cost`; no optional growth; reject only on independent byte/policy gates or a separately proven mandatory-input lower-bound overflow |
| All values numerically present but token basis or semantics incompatible | Treat numerical fit as unknown; no mixed-unit arithmetic |
| Provider rejects request despite local fit/compatibility | Existing terminal failure; no automatic retry with removed instructions, reduced generation controls or trimmed objective |

Disposition labels here are design vocabulary, not added Protocol error codes. Unknown does not mean unlimited: no optional expansion is allowed, no ceiling is raised, current request bounds remain enforced, and failure is visible. Nor does unknown automatically invalidate every otherwise-enabled Provider request. This rule resolves A1 U8's unknown-capacity policy; actual discovery reliability and reserve semantics remain explicit evidence requirements.

## G. Formal future budget relationship

Use only values in the same reviewed model/backend token basis:

- `C`: qualified active usable context capacity; may be reduced by an explicit local operating ceiling. A merely estimated/theoretical capacity cannot supply C. If the source supplies a validated interval, use its safe lower capacity bound; otherwise no inferred interval.
- `I_low`, `I_high`: defensible lower/upper costs of the complete model input. Exact full accounting has both equal to I. A bounded estimate includes known accounting error in I_high; unknown upper bound is null.
- `G`: reviewed combined generation headroom reservation required by this local policy, or unknown. `M` is the actual requested max_tokens, a different quantity. Choosing `G=M` is a possible future conservative policy only after explicit review; it is NOT automatically the current Provider API requirement.
- `R`: reasoning control from current Adapter policy. Under current calibrated shared-generation semantics it is contained within M/G accounting, not added twice. Unknown inclusion semantics make combined reserve unknown.
- `S`: additional reviewed residual safety reserve, excluding uncertainty already included in I_high; no double counting.

Conditional full-fit proof:

```text
I_max = C - G - S
full_fit = (all operands usable and correlated) and (I_max >= 0) and (I_high <= I_max)
AND existing transport/canonical/message hard limits pass
```

This is a LOCAL allocation relation, not an assertion that LM Studio itself implements this inequality. Negative I_max means the reviewed allocation cannot fit; it does not mean the model's physical context length is negative. If an exact mandatory cost exceeds I_max, reject required-input allocation. If a certified upper estimate exceeds it, the policy may conservatively reject as `fit-not-established-under-bound`; do not falsely claim measured physical overflow. With unknown operands, do not evaluate by substituting zero or infinity.

Independent input-only proof: a qualified hard C and a valid `I_low > C` establish that mandatory input alone cannot fit, even when G is unknown. When `I_high <= C` but G is unknown, only input-fit has been assessed; full generation fit remains unknown. A heuristic point estimate is neither bound.

CURRENT decisive counterexample to naive enforcement: F6 loaded context 8192 while ordinary requests sent max_tokens=8192 and had nonempty input. Automatically setting G=M would assign zero input budget and reject the sealed short-request behavior. A3a explicitly does NOT choose that rule for current profiles. Likewise M−R=2048 is not an approved independent final reserve. Current G remains unknown until the experimental/contract requirement in §L is resolved; A3b must support the compatibility/input-only dispositions rather than manufacture G or tune M/R.

For future optional inputs, the whole assembled cost (including per-item/template overhead) must fit the computed bound. Summing isolated tokenizations is not assumed equivalent to whole-prompt tokenization. A3b must not implement item omission to force this formula; A5 owns that future selection stage.

## H. Required versus optional input

| CURRENT component | Classification | Overflow rule |
| --- | --- | --- |
| System/profile/capability instructions | Required intact | No deletion, paraphrase or alternative profile to save budget |
| Local response contract and its metadata/schema | Required intact | No dropping correlation/strict schema or falling back from structured to text |
| Current user objective | Required intact | Fail required-input allocation when established; never silent truncation or partial edit extraction |
| Current assistant grounding envelope | Required as currently constructed | Preserve exact current representation, including existing unavailable fallback |
| Structured-profile grounding | Preserve current source/result semantics | Not a newly imposed requirement that an actual opacity value always exist. Current Controller can produce unavailable grounding; A3 cannot invent fresh facts, delete constraints or add a target-continuity gate |
| Future conversation/history/verified trajectory | Separately selected optional by default | Absent today; A5 must explicitly approve any inclusion/required classification |
| Raw reasoning | Prohibited, not an optional item awaiting spare budget | No inclusion regardless of capacity |

No current component is made optional in A3a. Unknown capacity alone does not authorize modifying the current request. “Required grounding” means preserve the current profile's grounding construction contract, not assume AE state that is unavailable.

## I. Omission / overflow disposition matrix

| Cause | Disposition | Evidence / fallback |
| --- | --- | --- |
| Item not selected by policy | Continue without it, only if it is optional and an approved selector exists | not-selected-by-policy; no implication it was unavailable |
| Optional item omitted for context budget | Future A5 may omit whole approved optional items deterministically | budget-omitted with item/count/cost provenance; A3b implements no such selector |
| Item unavailable upstream | Preserve existing unavailable handling; fail only where existing contract already requires failure | upstream-unavailable distinct from budget omission; never fabricate an AE fact |
| Request rejected by byte ceiling | Fail request under existing limit | transport/canonical/message-byte-rejected, never label token overflow |
| Model capacity unknown | Continue current shape; no optional expansion | unassessed-capacity, no numeric fit assertion |
| Complete assembly fails a usable computed budget | If future optional items exist, deterministic optional removal may be proposed by A5; otherwise fail allocation | Preserve whether failure is exact overflow or conservative fit-not-established |
| Required current objective/contract cannot fit | Fail request | Required content remains intact; no silent truncation, summary or branch change |
| Heuristic estimate suggests overflow but lacks error bound | Continue current shape if independent gates pass | unassessed-input-cost, not a proven overflow |
| Conflicting/stale source | Deterministic fallback to unknown mode | Never choose larger capacity or retain a stale “known” label |

Deterministic fallback in A3b means a deterministic disposition (known-bound decision or unchanged current-shape compatibility), not a second Provider attempt or rewritten prompt. Unknown omitted counts remain null; not collected, upstream unavailable and policy/budget omissions remain separate A1/A2 categories.

## J. Model/profile switching and invalidation

A usable decision correlation must include normalized endpoint, Provider/backend contract identity where required, exact requested model, resolved serving instance/config identity or explicit ambiguity, profile and generation-policy revision, runtime lifetime/config revision, and the invocation whose input was assessed. Sampling time or invocation-local discovery boundary must be explicit. Provider request generation is correlation within a lifetime, not a durable model identity or unified contextGeneration.

| Event | Required future behavior |
| --- | --- |
| Endpoint/model changes | Invalidate capacity eligibility, accounting compatibility and prior budget decision; no alias/brand-based reuse |
| Profile changes | Recompute generation/accounting/required-input decision. Raw discovery data may remain historical, but old profile's approved budget cannot carry forward; revalidate all relevant correlations |
| Same model id reload/config change or backend restart | Invalidate prior binding capacity; same string is insufficient identity |
| Multiple loaded instances / model key routes ambiguously | Unknown unless serving-instance mapping is explicitly established; never choose index 0 by convenience |
| Late readiness/discovery completion | Record only as historical if retained; cannot replace current identity's decision |
| Runtime reset/dispose/panel reload | Invalidate process-local capacity eligibility and budget decisions; persisted configuration does not restore proof |
| Readiness failure after prior success | Prior capacity becomes last-reported only; no fallback as current known capacity |

No numeric TTL is invented. A3b's safe minimum is invocation-local source validity plus immediate config/lifetime recheck before dispatch; no cross-invocation capacity cache is required. Even this does not make an external model reload atomic with dispatch. If an instance/config stability guarantee cannot be established, use unknown compatibility and retain the Provider's existing failure handling. Profile changes never imply Host/Authority freshness changes.

## K. A3b implementation scope and A2 integration

Proposed A3b scope:

1. A narrow data-only capacity/cost/reserve normalizer and pure disposition calculation implementing §§B, E–J; test known, invalid, stale, ambiguous and unknown states. No generic BudgetManager.
2. Preserve current byte checks and current-shape compatibility as the production default when usable token/capacity/reserve evidence is absent. Conditional numeric gating may operate only with the evidence qualifications above; no guessed constants or silent output-cap reductions.
3. If native discovery is wired, keep it Provider-owned and distinct from Surface readiness enablement; match the actual instance or explicitly return unknown. Do not silently alter readiness semantics or expand to uncontrolled probing. Any new network discovery/read path must be stated and tested as A3b scope, not assumed to exist because A3a approved a source class.
4. Correlate immutable budget-decision evidence (source, identities, usable/unknown operands, method/uncertainty, disposition) with A2's actual constructed input. A2 remains the reporter, never the selector or policy owner. Closed A2 snapshots are not edited retrospectively; use a separate correlated decision projection or reviewed versioned additive evidence shape.
5. Verify pre-A3b wire/capture equivalence for compatibility mode, known-bound rejection before dispatch, stale/late switch handling and no authority/Session/reasoning ingestion. A2 disabled must not disable required policy checks: debug evidence is not a production policy dependency.

A3 asks “why was this input allowed under these constraints?” A2 answers “what was actually constructed, and what bytes/sources did it contain?” The policy reads locally owned construction inputs, not a debug getter that can be null. No history selection, actual omission/truncation, tokenizer, compaction, generation tuning, verified trajectory, capability changes or multi-conversation implementation belongs in this slice.

## L. Unresolved / experimental evidence requirements

These are not excuses to guess defaults; unknown-mode disposition is already resolved.

| Requirement | Evidence needed before promoting to a guarantee |
| --- | --- |
| LM Studio instance routing and context_length meaning | Exact server/backend version, requested model key versus loaded id, multiple-instance cases, unload/reload/reconfigure, and whether reported field is the active hard window for that route |
| Near-capacity max_tokens semantics | Controlled real LM Studio requests around capacity; distinguish rejection, effective generation clamping and any server-side input truncation; capture exact request/config/terminal evidence |
| Reasoning inclusion / minimum final headroom | Confirm applicable combined accounting and whether any independent final-only reservation exists; do not infer from nominal M−R or delta counts |
| Exact full-input accounting | Provider count endpoint availability or exact tokenizer/template/schema transformation contract; non-ASCII, structured profile and backend overhead cases |
| Finite estimator/safety bounds | Versioned calibration covering applicable input classes with explicit limits; no general guarantee from average error or one model |
| Operator capacity policy UX | Separate explicit intent for an advisory configured capacity versus a hard local spending/size ceiling; no current field and no implied mandate |

No real LM Studio probe or real AE acceptance was run in A3a. F6 is historical evidence for calibrated generation behavior, not new capacity enforcement acceptance. A3b can implement unknown/conditional policy without those experiments, but MUST NOT claim operational full-fit enforcement for current models until all necessary operands/semantics are supported. A1 U8 is resolved as policy; discovery and generation-reserve empirical qualification remain identified work, while A4–A6 and 0.3.11 retain their scopes.

## Verification record

Existing suites run only to confirm CURRENT facts: [response-budget](../../scripts/test-vela-response-budget.js) 38; [Provider Adapter](../../scripts/test-vela-provider.js) 297; [Provider Controller/readiness](../../scripts/test-vela-provider-controller.js) 157; [Settings integration](../../scripts/test-vela-settings-integration.js) 46; [branch profiles](../../scripts/test-vela-provider-branch-profiles.js) 70; [Surface/readiness lifecycle](../../scripts/test-vela-surface-controller.js) 239. Six suites / 847 assertions PASS. The readiness fixture test proves a single-instance example; it does not close the multi-instance routing unknown.

Documentation acceptance: project consistency, i18n report freshness, internal-link targets and whitespace/diff checks, reported in the task handoff. Production/test/frozen architecture diff must remain zero. No A3b behavior acceptance, new tests, commit, push or PR is implied.
