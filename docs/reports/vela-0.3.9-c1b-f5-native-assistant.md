# Vela 0.3.9-C1b-F5 — Native Assistant Streaming & Output Capability Separation

Date: 2026-09-05. Implementation and offline regression complete; real AE visual acceptance pending.
Historical stage status above; C2 records subsequent user-performed real AE acceptance as PASS. See [final closure](vela-0.3.9-c2-closure.md).
Architecture amendment: **NONE**. No commit or push.

This correction changes Provider transport response responsibility. It does not change Agent canonical contracts, Authority, Review, Execution, Host, or AgentDriver. The existing dirty C1b workspace was preserved on `feat/vela-0.3.9-a1-stream-contract`; no branch switch, pull into dirty work, reset, commit, or push was performed.

## 1. Original TEXT_ONLY chain

TEXT_ONLY selected a text-envelope JSON schema and prompts requiring the model to emit protocol/schemaVersion/requestId/provider/model/envelope. `delta.content` therefore streamed the JSON serialization; terminal parsing extracted `envelope.text`. The assistant-text presentation mode exposed serialized content transiently and replaced it with prose at terminal completion.

## 2. Output capability and transport decision

`VelaProviderAdapter.getOutputDecision(profile)` returns a frozen decision and frozen `allowedOutputs` array. Each Provider captures its decision at construction from its fixed request profile.

| Profile | allowedOutputs | Current transportMode | presentationMode |
| --- | --- | --- | --- |
| text-only | assistant-text | native-assistant | assistant-text |
| explicit-edit-eligible | structured-proposal | strict-structured | structured |
| bounded-logical-plan-eligible | structured-logical-plan | strict-structured | structured |
| proposal-capable-union, retained compatibility | assistant-text, structured-proposal | strict-structured | structured |

Allowed outputs express capability permissions. The current compatibility strategy chooses a transport; this does not establish permanent architectural exclusivity. No mixed response, Response Parts, tool/action channel, or new card system is implemented.

## 3. Assistant Provider request shape

Production native request keys are exactly `model`, `messages`, `stream`. No `response_format` or `json_schema` is sent. Message order remains system, bounded assistant turn/grounding data, current user. The existing internal canonical request's responseFormat descriptor is retained as internal compatibility metadata, not sent as a model output requirement.

Controller no longer supplies a redundant json-schema mode option. Adapter retains validation of that legacy configuration option for existing callers; it cannot override the profile's output decision.

The normal chat-completions shape is consistent with [LM Studio's documented endpoint](https://lmstudio.ai/docs/developer/openai-compat/chat-completions). The inference-mode overrides described below exist only in the diagnostic probe.

## 4. Removed prompt burden

TEXT_ONLY no longer includes the global structured serialization instructions, exact JSON-object requirement, protocol/schemaVersion echo, requestId/provider/model echo, or concrete text-envelope example. It retains ordinary conversation, user-language policy, trusted-grounding factual use, no guessed current values, no proposals, and no claims of performed or future unauthorized AE edits.

## 5. Native canonicalization seam

After existing HTTP, redirect, MIME, body size, OpenAI wrapper, message role/content, reasoning type and tool-call validation, the native branch calls private `normalizeAssistantTextResponse(content, requestId)`. It creates and validates the existing canonical text response and deep-freezes it. Whitespace is preserved; empty/whitespace-only terminal output fails. Both SSE assembly and non-stream completions converge here.

There is no parse-JSON-then-fallback path. JSON-looking native prose stays inert text and cannot create a proposal. Structured malformed output stays a failure.

## 6. Metadata ownership

Vela supplies requestId from the active local request, provider from Adapter ownership, model from configured model, and protocol/schemaVersion from the trusted Protocol. The OpenAI wrapper's model does not override these fields. Model content contributes only the text field on the native path. Model-owned error-looking or proposal-looking prose never becomes typed authority.

## 7. Structured isolation

Proposal and logical-plan requests retain their existing strict json_schema, private assembler, terminal parser and validation. Their content deltas retain the existing Provider event vocabulary and remain hidden by structured presentation mode. Reasoning remains independently presentable. No partial JSON is admitted to Agent. Review, Authority and multistep execution regressions pass; none of their production modules were changed by F5.

## 8. Runtime presentation alignment

Runtime derives presentationMode through the same `getOutputDecision(finalProfile)` used by Adapter, using the Controller's current profile. The existing request/generation and invocation guards remain intact. No presentation metadata was added to Provider stream events.

A new exact-text test found that whitespace-only deltas were rejected by event string validation and silently lost at publication. Delta content now accepts non-empty whitespace strings; identity fields still require nonblank strings. Event names and fields are unchanged. This preserves spaces and line breaks across transient and committed prose.

## 9. Qualification correction

Added `provider-branch-profiles-v3.json`; v1/v2 and historical evidence remain untouched. v3 freezes the new native prompt, absence of response_format (normalized as null only for hashing), and stable request body. Structured hashes remain unchanged. Current capture helpers, consistency checks, and current-run diagnostics use v3. Native diagnostic observation treats the message as text based on request profile; it does not infer typed output from JSON-looking prose. Structured qualification continues to require valid schema-bound output.

Native fixture hashes:

- prompt: `a97b9c367790eee8ae679e42005141d15cea7b8e4581fbc97dc0e5fb892f7045`
- absent response format: `74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b`
- stable body: `4e45a9548c79c8a039f7def323a884a91db489a7a455fa5e4f4332ab69817de2`
- v3 fixture bytes: `93f21dfc7231ffcba116a32c10aab89ea105e4d041c98c9064427d75e86d28ef`

This is a transport contract correction, not a new qualified default-model declaration. No formal clean-worktree qualification run was invoked; frozen activation policy and historical rubric remain unchanged.

## 10–14. Real LM Studio evidence

Model: loaded `qwen3.5-4b`, Q6_K. Endpoint: local `/v1/chat/completions`. Production Adapter + LocalTransport were exercised; no AE/Host operations were made. Probe-only `reasoning_effort: high/none` controlled reasoning. An initial `chat_template_kwargs.enable_thinking` attempt produced no reasoning and was not accepted as reasoning-enabled evidence.

| Final probe | reasoning deltas / chars | content deltas / chars | DONE / finish_reason | Canonical result |
| --- | --- | --- | --- | --- |
| Native, enabled, 你好。 | 606 / 2169 | 14 / 24 | yes / stop | text, success |
| Native, disabled, 你好。 | 0 / 0 | 8 / 14 | yes / stop | text, success |
| Proposal, disabled | 0 / 0 | 93 / 258 | yes / stop | localProposal, opacity 47 |
| Logical plan, disabled | 0 / 0 | 112 / 325 | yes / stop | two steps, opacity 47 then name Hero |

Enabled final text: `你好！有什么可以帮你的吗？或者你想聊聊什么话题？`
Disabled final text: `你好！有什么我可以帮你的吗？`

For both native successes, concatenated text deltas exactly equal canonical envelope.text. There is no transport-level JSON-to-text replacement. Enabled reasoning contains none of `schemaVersion`, `requestId`, `vela.model-response`, or `envelope`; it discusses the greeting and behavioral instructions. Real AE rendering, duplicate prevention and anchoring still need the acceptance pass below.

Important repeated-probe limitation: an earlier two-sentence keyframe explanation succeeded with reasoning enabled (628 reasoning deltas, 39 content deltas). On repetition, the same longer question produced 1024 reasoning deltas and hit the existing stream response size budget before content/DONE. A reasoning-enabled structured proposal also exceeded that budget. Both returned `PROVIDER_RESPONSE_TOO_LARGE`; no partial candidate or successful text was admitted. Limits were not increased or bypassed. These failures preclude claiming general reasoning-enabled model reliability from the successful greeting.

Local raw evidence, with request, reasoning/content events, raw SSE, finish_reason/DONE, canonical result and diagnostics:

- `.tmp/vela-f5/probe-enabled.json` — `req_a8abfeed096a177c60ba59ec98413f89`
- `.tmp/vela-f5/probe-disabled.json` — `req_2a6f11ccb8db3dfeb68fb0e3bca9968f`
- `.tmp/vela-f5/probe-proposal.json` — `req_315dccd4b7b1177d43c37f6cfa2a8ec9`
- `.tmp/vela-f5/probe-logical.json` — `req_960b3a7f504636ef9f084c0f34b8eb0b`
- `.tmp/vela-f5/probe-enabled-overflow.json` — `req_19ab462c73af1514d5f3b9918cea0376`
- `.tmp/vela-f5/probe-proposal-overflow.json` — `req_1841221aaf70e6ef892b12dbbe1e84d9`

These are local acceptance artifacts, not published qualification evidence. Reproduce via `node scripts/diagnostics/probe-vela-native-assistant.js --run`. The script preserves timestamped attempts and returns a failing exit code if any terminal result is an error.

## 15. F5 file changes

Production changes:

- `client/js/vela/velaCapabilityPromptBuilder.js`
- `client/js/vela/velaProviderAdapter.js`
- `client/js/vela/velaProviderController.js`
- `client/js/vela/velaRuntime.js`
- `client/js/vela/velaProviderStreamEvents.js` (already untracked from preceding C1b work)

Qualification and checks:

- `scripts/diagnostics/velaProviderModelQualification.js`
- `scripts/diagnostics/run-vela-provider-model-qualification.js`
- `scripts/diagnostics/probe-vela-native-assistant.js` (new)
- `scripts/fixtures/vela-capability-contracts/provider-branch-profiles-v3.json` (new)
- `scripts/check-project-consistency.js`

Tests updated for native transport and retained structured rejection: capability-contracts, capability-prompt-builder, local-transport, prompt-stability, provider-branch-profiles, provider-controller, provider-model-qualification, provider-production-e2e, provider-proposal-router, provider, runtime, provider-stream-equivalence, provider-stream-lifecycle, provider-stream-publication. New: `scripts/test-vela-native-assistant-output.js`.

This report is new. Other files already modified/untracked at task start belong to the preceding C1b work, including Surface/CSS/Transcript changes; they were preserved. No F5 change to Host, Parser, AgentDriver, Review or Authority implementation.

## 16–17. Validation

- New native output suite: **67 assertions PASS**, including minimal request, protocol-free prompt, independent reasoning, raw text identity, local metadata, non-stream fallback, malformed/empty content, invalid message shapes, size limit, missing DONE, strict structured rejection, and immutable capability decision.
- Stream equivalence: **9 PASS**; lifecycle: **14 PASS**; publication: **23 PASS**; event contract: **31 PASS**.
- Provider: **297 PASS**; ProviderController: **157 PASS**; production E2E: **289 PASS**; proposal Router: **37 PASS**; Runtime: **93 PASS**.
- Current qualification diagnostics: **217 PASS**; branch profiles: **70 PASS**.
- Full offline regression: **169/169 PASS, 0 skipped**. Includes Review, Authority, TaskRun, multistep presentation, turn composition, reasoning disclosure, transcript streaming and anchoring suites.
- Generated i18n report is current; project consistency and git diff whitespace checks pass. Changed JavaScript syntax checks pass.
- Full log: `.tmp/vela-f5/full-offline.txt`.

## 18. Architecture check

`docs/design/vela-agent-architecture.md` remains FROZEN FOR 0.3.x and unchanged. No requirement was found making model-generated TEXT_ONLY canonical wire envelopes a frozen invariant. Amendment: **NONE**.

Model owns reasoning, human-facing prose, and explicitly requested structured candidate content. Vela owns protocol and identities, internal canonical representation, structured validation and authority/admission.

## 19. Next real AE C1b acceptance

Reload the CEP panel to load the changed browser modules. No Host change requires an AE restart for F5 itself; verify active loaded modules if cached behavior persists.

1. Ordinary chat with reasoning enabled: reasoning expands while active, native prose grows incrementally, disclosure collapses at terminal, exactly one committed assistant message remains.
2. Repeat with reasoning disabled: no reasoning surface; same native streaming and terminal semantics.
3. Check spaces, newlines, Chinese text and consecutive turns: no content loss, JSON envelope flash or terminal replacement jump; reasoning stays anchored to its own turn.
4. Cancel and timeout before/after first delta, then immediately send again: no stale chunks, late DONE or duplicate commit; disclosure/anchor behavior remains intact.
5. Exercise CEP post-DONE reader early-stop and panel close/reopen.
6. Single proposal: reasoning may show, machine JSON stays hidden, no admission before terminal validation, existing Review/Approve required.
7. Two-step logical-plan: strict typed terminal, existing ordered Review/Authority/multistep semantics; no partial candidate.
8. Malformed structured terminal: visible failure, no prose fallback, no Review candidate or execution.
9. Repeat longer reasoning-enabled questions and structured turns: monitor the preserved response-size failure documented above. Successful short chat is not sufficient to close this model reliability concern.
