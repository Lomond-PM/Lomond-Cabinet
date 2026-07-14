# Lomond Cabinet 0.3.0: AE Agent Vela Architecture

## Status

This document is an architecture plan for the next development target, 0.3.0.
It is documentation only. It does not change `VERSION`, `CSXS/manifest.xml`,
frontend cache queries, existing tool behavior, or the current release tag.

The first implementation should be based on the latest `dev` line after the
0.2.5 release. The 0.2.5 behavior remains the compatibility baseline.

Vela is an assistant surface for proposing and, after explicit confirmation,
executing narrowly defined After Effects operations. It is not a general
computer-use agent in 0.3.0.

## 1. Product Boundary And 0.3.0 MVP

### Product promise

Vela should let a user describe an AE task in natural language, show the
relevant context, produce a reviewable plan, and execute approved operations
through existing Lomond Cabinet capabilities.

The user must always be able to see:

- which provider and model produced the proposal;
- which composition, layers, properties, or registry action are targeted;
- what will change;
- the risk level and undo group;
- whether the operation is still valid after the latest AE selection change.

### In scope for 0.3.0

- A compact chat surface with a transcript, composer, context summary, and
  bottom status/action bar.
- One cloud provider adapter and one OpenAI-compatible local adapter.
- The first local validation target: LM Studio serving Qwen3.5-4B Q6_K.
- Read-only context collection at explicit, bounded detail levels.
- Structured proposals containing `VelaAction` objects.
- User-confirmed execution of existing allowlisted Registry Tool actions.
- User-confirmed execution of constrained expression actions when an explicit
  property target and before/after preview are available.
- Script proposals represented as reviewed, allowlisted script operations. Raw
  arbitrary ExtendScript is not executable in the default 0.3.0 path.
- Verification after each approved action and a clear result transcript.
- The default permission mode: Confirm Every Action.

### Explicitly out of scope for the first MVP

- Silent or background mutations.
- Arbitrary filesystem access, network requests from model output, shell or
  external-process execution, and arbitrary ExtendScript evaluation.
- A general-purpose browser, terminal, or computer-use tool.
- Automatic model-generated tool registration.
- Replacing the existing registry renderer or migrating existing tools.
- Rewriting `main.js` into an agent runtime.
- Full Access autonomous mode. Its contract is specified below so that it can
  be added without changing the action protocol.

## 2. Current Architecture Audit

The following facts are the design constraints for Vela.

### Tool Registry and action schema

Registry tools live in `host/tools/*.tool.jsx` and register through
`AEToolbox.registerTool(toolDef)`. Current definitions can contain:

- stable `id`, `titleKey`, `descriptionKey`, category, and tool-local i18n;
- `sections` and fields such as text, number, range, color, select, tabs,
  buttons, visibility and enabled conditions;
- `actions` with `id`, `labelKey`, `hostFunction`, style, state refresh, and
  action payload metadata;
- optional `stateAction` and `stateCard` declarations.

The host registry currently resolves the action by `toolId` and `actionId`,
then resolves the declared `hostFunction`. It does not yet provide a Vela
permission boundary, action schema validator, target fingerprint, or
transaction object. Vela must add those checks around the existing registry
contract rather than trusting model-supplied strings.

The core renderer in `client/js/main.js` owns registry DOM, field behavior,
value persistence, status display, and action dispatch. This is useful shared
infrastructure but is already a large module. Vela should call a narrow
facade and keep provider, planning, validation, and execution code in separate
modules.

### Host bridge and `evalScript`

The frontend creates a `CSInterface` and uses `evalScript` for host calls.
`main.js` loads `host/index.jsx` with `$.evalFile(...)`, then calls
`AEToolbox.ping()`, `AEToolbox.getHostLoadInfo()`, selection refresh functions,
and `AEToolbox.runRegisteredToolAction(...)`.

The current bridge is callback-based and string-oriented:

- `jsxQuote()` escapes strings into an ExtendScript call;
- `evalHost()` checks the panel shutdown flag before dispatch;
- `parseResult()` parses JSON when possible but can return a raw message;
- host JSON helpers serialize simple ExtendScript values;
- the host has a legacy `eval` JSON fallback when `JSON.parse` is unavailable.

This path is acceptable for existing compatibility behavior, but provider
output must never be concatenated into it. Vela requires a typed request
envelope, an allowlisted host method, JSON schema validation on both sides,
request ids, context fingerprints, cancellation, and late-result rejection.

### Undo groups

Current mutating host modules create their own `app.beginUndoGroup()` /
`app.endUndoGroup()` boundaries. Some paths use `finally`; older paths end the
group in both the success and catch branches. There is no cross-tool Vela
transaction and no generic rollback API.

Vela must not nest an uncontrolled outer undo group around an existing tool.
The first adapter should let the selected Registry Tool own its existing undo
group and record its label in the Vela result. Expression and allowlisted
script adapters need their own narrow `try/finally` boundary. A future host
transaction helper can normalize this after AE regression, but it is not a
reason to rewrite current tool algorithms in 0.3.0.

### Selection and AE context

`AEToolbox.getSelectionSummary()` currently reports the active composition and
selected-layer count/label. `AEToolbox.AE.getActiveComp()` and individual host
tools can inspect `activeItem`, `selectedLayers`, layer indices, match names,
and layer metadata. Registry state actions poll selected state for some tools.

There is not yet a stable context revision or a single, permission-aware
context snapshot API. Vela therefore needs an explicit host context adapter
that returns a bounded snapshot and a fingerprint. It must never infer a
target from a display name alone.

### Settings and storage

Production Settings are app-level schema-driven controls rendered through the
core path. The formal storage contract is `AEToolbox.settings.v1` in
`localStorage`. Registry tool values use their own declared storage keys, and
Palette Store data uses `lomond.proceduralPaletteStore.v1`.

Vela provider and permission preferences should be added to the existing
Settings schema only in a later implementation task. Credentials must not be
stored as plain localStorage values by default. A local LM Studio endpoint can
work without a secret; cloud credentials require a deliberate credential
storage decision or a user-supplied session token.

### Lifecycle and shutdown

`main.js` currently owns `panelShuttingDown` and `panelSuspended` guards,
selection and registry polling, pending registry saves, custom select cleanup,
Home teardown, Palette Store flush, Palette Workspace teardown, procedural Home
icons/background teardown, and page lifecycle listeners.

Vela must register one controller with this lifecycle facade. On suspend it
must cancel provider requests and stop rendering without losing the transcript.
On shutdown it must abort requests, close confirmations, clear timers and
animation frames, reject late callbacks, and release any provider/portal
listeners. No Vela code should add a second global shutdown state.

### i18n and UI components

Core Settings, Home, common controls, and fallback copy live in
`client/js/i18n.js`. Registry tools own tool-local dictionaries in their
`.tool.jsx` files. Shared settings and chat labels belong to core i18n.

Existing controls include custom selects, textareas, number/range inputs,
option cards, section disclosure, status pills, modal-like panels, and shared
button styles. Vela should reuse those tokens and components. It should not
create a second color picker, custom Settings renderer, or tool-specific
registry DOM adapter.

## 3. Provider Adapter And OpenAI-Compatible Protocol

### Adapter boundary

Provider adapters convert a provider-specific response into a canonical
`VelaModelResponse`. They do not create AE calls and do not receive an
execution callback.

```js
{
    id: "lmstudio",
    kind: "openai-compatible",
    capabilities: {
        chat: true,
        jsonSchema: false,
        streaming: false,
        cancellation: true
    },
    complete: function (request, signal) { /* Promise<VelaModelResponse> */ },
    cancel: function (requestId) { /* provider request only */ }
}
```

The cloud adapter and LM Studio adapter share a protocol client but have
separate endpoint, authentication, timeout, and diagnostic policies. The
initial local adapter targets an OpenAI-compatible `/v1/chat/completions`
endpoint. A later adapter may support `/v1/responses` without changing the
canonical Vela protocol.

### Canonical request

```json
{
  "protocol": "vela.model-request.v1",
  "requestId": "req_...",
  "model": "Qwen3.5-4B Q6_K",
  "messages": [],
  "responseFormat": {
    "type": "json_object",
    "schemaId": "vela-response.v1"
  },
  "context": {
    "contextId": "ctx_...",
    "fingerprint": "sha256-like-stable-value",
    "tier": "selection-summary"
  }
}
```

The adapter must set an AbortController/timeout, cap request and response
sizes, redact secrets from diagnostics, and attach the provider/model to the
transcript. Network failures become provider errors, never action requests.

### Canonical response

```json
{
  "protocol": "vela.model-response.v1",
  "requestId": "req_...",
  "provider": "lmstudio",
  "model": "Qwen3.5-4B Q6_K",
  "contentType": "plan",
  "message": "I found one selected text layer.",
  "actions": [],
  "contextFingerprint": "..."
}
```

The response is untrusted data. It enters the protocol parser, then the
schema/target/permission validator. It can never become an `evalScript` string
directly.

## 4. Qwen JSON / Schema Fallback Strategy

Qwen3.5-4B Q6_K in LM Studio may not honor strict JSON schema or function-call
semantics consistently. The adapter should use the following descending
strategy:

1. Request a JSON object with a short schema, no markdown, and a fixed
   `protocol` and `schemaVersion`.
2. If the provider supports JSON mode, enable it. Do not assume it supports
   `json_schema` just because the endpoint is OpenAI-compatible.
3. Parse the complete message as JSON.
4. If the message is fenced, remove only a recognized JSON code fence and parse
   again.
5. If multiple JSON candidates are present, parse each candidate and accept
   only one complete object that passes the strict response schema. Do not
   execute a partial object or silently choose an ambiguous candidate.
6. If parsing or validation fails, return a text-only assistant message with a
   diagnostic status such as `MODEL_RESPONSE_SCHEMA_INVALID`. It contains no
   executable actions.
7. A repair request may be offered as an explicit, bounded follow-up. Repair
   output is validated from the beginning and is never trusted because it was
   requested as a repair.

Unknown fields, unknown action kinds, missing target fingerprints, invalid
numbers, oversized strings, and unrecognized tool/action ids are rejection
conditions. There is no fallback to `eval`, JavaScript source execution, or
free-form ExtendScript.

## 5. VelaAction: Tool, Expression, Script

All action kinds share one envelope:

```json
{
  "id": "act_01",
  "kind": "tool",
  "title": "Create a background rectangle",
  "rationale": "...",
  "risk": "write",
  "target": {
    "contextFingerprint": "...",
    "compId": "stable-session-id",
    "layerIndices": [3]
  },
  "payload": {},
  "undoGroupLabel": "Vela: Create background rectangle",
  "requiresConfirmation": true
}
```

`title` and `rationale` are display-only strings. Stable ids, enum values, and
payload fields are validated against local schemas. User-visible prose is not
an authority.

### `kind: "tool"`

```json
{
  "kind": "tool",
  "payload": {
    "toolId": "textBackgroundBox",
    "actionId": "create",
    "params": {
      "paddingX": 40
    }
  }
}
```

The validator looks up `toolId` in the loaded registry, confirms that
`actionId` is declared, validates parameters against the tool field schema,
and rejects action ids that are not explicitly executable. The model cannot
provide or override `hostFunction`.

### `kind: "expression"`

Expression actions require an explicit target property reference, old value
when readable, new expression text, and a bounded reason. The target must be
resolved from composition/layer/property metadata, not a name-only lookup.

The first implementation should allow only a constrained property adapter:
selected layer or an explicitly enumerated layer index, known property chain or
match name, expression length limit, and before/after preview. A property with
no stable target or a target that changed after planning is rejected.

### `kind: "script"`

Script actions are not arbitrary code execution. In 0.3.0 an executable script
action must reference a package-owned `scriptId` from an allowlist and pass
typed arguments through a host adapter. A model-provided `source` string can be
shown for review but is display-only and must not be passed to `evalScript`.

If an eventual reviewed-script feature permits user-authored ExtendScript, it
must use a separate high-risk permission, static checks, an explicit target,
an undo group, a timeout, and a host-side allowlist. It is not part of the
default 0.3.0 execution path.

## 6. Context Layers And On-Demand Reads

Context is read in layers. Each layer has a size, privacy, and latency budget.
The model receives only the minimum layer needed for the request.

| Tier | Contents | Default |
|---|---|---|
| 0 | No AE data; tool catalog and capability summary only | Always available |
| 1 | Active-comp summary, selection count, selected layer indices/types, current tool/detail | Default for first request |
| 2 | Explicit selected-layer metadata: names, match names, bounds, text summary, component metadata | User or planner requested |
| 3 | Explicit property values, expressions, effect/shape details, or narrow host state | Explicit confirmation and bounded query |

Never send project-wide layer dumps, file paths, raw credentials, or unrelated
Settings by default. Text content and expressions are sensitive context and
should be truncated and clearly shown in the context chip before sending.

### Context fingerprint

The host context adapter returns:

```json
{
  "contextId": "ctx_...",
  "fingerprint": "...",
  "activeComp": { "name": "Comp 1", "width": 1920, "height": 1080 },
  "selection": [
    { "layerIndex": 3, "matchName": "ADBE Text Layer", "type": "Text" }
  ],
  "tier": 1,
  "capturedAt": "session-relative timestamp"
}
```

The fingerprint is generated from stable session metadata and the selected
targets, not from display language or Home order. Before execution, Vela asks
the host for a fresh fingerprint. A selection, active comp, target property,
or relevant tool state change invalidates the plan and requires confirmation
again.

## 7. Plan, Confirm, Execute, Verify Data Flow

```text
user message
  -> context tier selection
  -> provider adapter
  -> canonical model response
  -> response parser
  -> action schema validator
  -> target/context validator
  -> risk classification
  -> reviewable Vela plan
  -> user confirmation
  -> fresh context fingerprint
  -> Execution Guard
  -> allowlisted host adapter / registry action
  -> host JSON result
  -> verification query
  -> transcript result and next-step suggestion
```

The plan stores the original request id, provider/model, context fingerprint,
action ids, schemas, risk, and expected verification. It is immutable after
confirmation. Editing one action creates a new plan revision and requires a
new confirmation.

Execution is sequential in 0.3.0. After each step:

1. The guard checks panel lifecycle, permission, context fingerprint, action
   schema, target existence, and remaining budgets.
2. The host adapter executes one operation.
3. The result is parsed as a bounded JSON result.
4. The verifier reads only the requested postcondition.
5. Failure stops the plan by default. The user may retry or discard; the model
   cannot automatically continue after a failed mutation.

## 8. Execution Guard And Risk Levels

### Guard checks

Every executable action passes:

- protocol and schema validation;
- loaded registry/action allowlist validation;
- target reference and context fingerprint validation;
- permission-mode validation;
- action risk and capability validation;
- maximum payload/string/step limits;
- panel not suspended or shutting down;
- one active execution per Vela controller;
- request id and action id replay protection;
- host API compatibility check;
- undo boundary availability;
- postcondition/verifier availability for mutations.

The guard owns a cancellation token. Cancelling, closing the panel, changing
selection, or changing the plan invalidates pending execution. Late
`evalScript` callbacks are ignored by request id and generation token.

### Risk levels

| Level | Examples | Default policy |
|---|---|---|
| `read` | context summary, selection metadata, verification query | May run after user request; still bounded |
| `write` | existing Registry Tool create/update action, constrained expression | Confirm Every Action |
| `destructive` | remove generated artifact, delete/replace content, broad property change | Explicit confirmation with target list and diff |
| `script` | allowlisted ExtendScript adapter | Disabled unless separately enabled and confirmed |
| `external` | filesystem, network, process, shell, arbitrary code | Denied in 0.3.0 |

Risk is determined by the local action definition and adapter, never by the
model's claimed risk string. A model cannot downgrade an action.

## 9. Permission Model

### Confirm Every Action (0.3.0 default)

Every mutation displays a confirmation card. The user can approve, reject,
edit parameters, or cancel the plan. Approval applies only to the exact action
revision and current context fingerprint.

### Confirm Plan (planned 0.3.x capability)

The user approves a complete bounded plan. Each step still runs through the
Execution Guard and fresh target checks. A changed selection, target, action,
parameter, risk, or verification result pauses the plan and requests a new
confirmation. A plan approval is not permission for newly generated actions.

### Full Access (later, not shipped in 0.3.0)

Full Access is an explicit user session mode, not a hidden model capability.
It should require a visible warning, scope selection, time limit, action/step
budget, and a stop control. Full Access must still retain the hard deny list
for unapproved external operations unless the user separately grants a future
capability.

The planned Full Access budget defaults are:

- maximum 8 mutation steps per plan;
- maximum 60 seconds of active execution;
- maximum 2 retries per step;
- maximum 1 concurrent host mutation;
- no automatic plan expansion;
- stop on target/context drift, failed verification, timeout, or lifecycle
  shutdown.

These values are design defaults, not implementation commitments. They must be
made explicit in tests and UI before Full Access is enabled.

## 10. UI Information Architecture

Vela should be a focused app-level assistant surface, not a normal tool card
with arbitrary tool-specific detail DOM.

### Chat area

- Header: Vela name, provider/model status, connection indicator, and close.
- Transcript: user messages, assistant text, context reads, plan cards, action
  results, verification, and errors.
- Composer: multiline input, send, cancel generation, and context-tier affordance.
- Context chip: active comp, selection count, requested context tier, and stale
  state.

### Plan card

Each action card shows:

- action kind and risk badge;
- target summary and context fingerprint status;
- expected change and undo group;
- parameters or expression diff;
- Approve, Reject, Edit, and Show Details controls.

The card must never render model-provided HTML. Text is escaped and displayed
through existing UI primitives.

### Bottom status/action bar

The compact bar contains provider/model, permission mode, request state,
context freshness, Stop, Clear, and Settings/connection entry points. It is
not a second navigation system.

### Settings integration

Provider endpoint, model id, timeout, permission mode, and developer diagnostics
should be added through the app-level Settings schema in a later branch. The
first UI implementation should use generic schema fields and existing i18n;
Vela controller state must not be persisted as an executable plan.

## 11. Module And File Plan

Keep Vela out of `main.js` except for a small lifecycle and navigation adapter.

### Frontend modules

```text
client/js/vela/
  velaController.js          # session, transcript, lifecycle facade
  velaProviderAdapter.js     # cloud/local OpenAI-compatible adapters
  velaProtocol.js            # request/response/action schemas
  velaResponseParser.js      # Qwen JSON/fence/fallback parsing
  velaContext.js             # tier selection and context fingerprints
  velaPlan.js                # immutable plan revisions and budgets
  velaValidator.js           # schema, target, risk, and capability checks
  velaExecutionGuard.js      # permission, cancellation, replay, lifecycle
  velaHostBridge.js          # typed allowlisted host calls only
  velaUi.js                  # chat/plan/status rendering using shared styles
```

These names are proposed boundaries, not files to create in this planning
branch.

### Host modules

```text
host/vela/
  velaContext.jsx            # bounded context and fingerprint queries
  velaToolAdapter.jsx        # registry action allowlist/param validation
  velaExpressionAdapter.jsx  # explicit property target and expression guard
  velaScriptAdapter.jsx      # package-owned script id allowlist
  velaResult.jsx             # bounded JSON result helpers
```

`host/index.jsx` should expose one stable Vela facade that dispatches only
typed adapter methods. It should not expose a model-provided function path or
script source. Existing registry registrations and host action modules remain
unchanged.

### Test and documentation modules

```text
scripts/test-vela-protocol.js
scripts/test-vela-provider.js
scripts/test-vela-actions.js
scripts/test-vela-guard.js
scripts/test-vela-context.js
scripts/test-vela-lifecycle.js
docs/design/vela-agent.md
```

No third-party dependency is required for pure protocol and guard tests.

## 12. Testing Strategy

### Pure Node tests

Test without DOM, Canvas, AE, network, or a real model:

- canonical request/response schema validation;
- Qwen plain JSON, fenced JSON, malformed JSON, ambiguous JSON, oversized
  output, and unknown field handling;
- tool action lookup and params validation;
- expression target validation and old/new diff generation;
- script id allowlist and raw-source rejection;
- risk classification cannot be downgraded by model output;
- context fingerprint changes invalidate a plan;
- permission modes and budget exhaustion;
- request id replay and generation-token behavior;
- provider timeout, abort, and late result rejection.

### Mock bridge tests

Use a fake typed bridge to confirm:

- no provider text reaches `evalScript`;
- only allowlisted host methods are called;
- each call includes request id, action id, context fingerprint, and bounded
  JSON payload;
- host error/invalid JSON stops the plan;
- cancellation ignores late callbacks.

### Host/AE tests

Manual AE regression is required for:

- active comp and selection changes between plan and confirmation;
- Registry Tool actions and existing Undo Groups;
- expression preview and undo;
- allowlisted script adapter rejection paths;
- action verification and failure recovery;
- panel close during provider request, confirmation, and host execution;
- Home, Detail, Settings, Palette Workspace, Shape Add, Ad Component Kit,
  color picker, and BackgroundEngine non-regression.

### Security regression tests

Reject prompt injection that asks for hidden context, arbitrary host function
paths, file/network/process access, raw ExtendScript execution, or skipping
confirmation. Test provider responses containing HTML, JavaScript, malformed
JSON, fake success fields, and action ids from tools not loaded in the host.

## 13. Branch And Phase Order

Recommended sequence, all branches based on the latest `dev` and merged only
after focused testing:

1. `plan/vela-0.3.0-architecture` - this document only.
2. `feat/vela-protocol-core` - canonical schemas, parser, action validator,
   context fingerprint types, and pure tests. No AE execution.
3. `feat/vela-local-provider` - LM Studio OpenAI-compatible adapter with
   timeout, abort, diagnostics, and Qwen fallback tests.
4. `feat/vela-context-read` - bounded host context facade and selection drift
   checks. Read-only in AE.
5. `feat/vela-execution-guard` - permissions, plan confirmation, typed bridge,
   registry action allowlist, and mocked execution tests.
6. `feat/vela-chat-ui` - compact chat/plan/status surface using shared UI and
   i18n, with no tool behavior changes.
7. `feat/vela-registry-actions` - confirmed execution of selected existing
   registry actions and postcondition verification.
8. `feat/vela-expression-actions` - constrained explicit-property expression
   path, only after AE undo and target tests pass.
9. `feat/vela-script-allowlist` - package-owned script ids only; raw script
   execution remains denied.
10. `chore/vela-0.3.0-hardening` - cloud adapter, provider settings, lifecycle
    matrix, security review, performance, docs, and release checklist.

### Recommended first implementation branch

The recommended first code branch is `feat/vela-protocol-core`.

Minimum acceptance criteria:

- `VelaAction` schemas exist for `tool`, `expression`, and `script`.
- Plain and fenced Qwen JSON can be parsed; malformed or ambiguous output
  produces a text-only result with no actions.
- Unknown tool/action ids, unbounded payloads, missing targets, and unknown
  fields are rejected.
- Model output never calls `CSInterface.evalScript` or any host function.
- Context fingerprint and permission fields are required in an executable
  candidate.
- At least the pure Node protocol, parser, validator, and negative security
  tests pass.
- No existing `main.js`, registry tool, host action, Settings key, or runtime
  behavior changes are required beyond testable type/facade seams.

## 14. Main Technical Risks And Release Blockers

### Release blockers for 0.3.0

- Any path where provider output can become an `evalScript` string without
  schema, target, permission, and allowlist validation.
- Execution after active comp, selection, property, or tool state changes
  without a fresh confirmation.
- Arbitrary ExtendScript, filesystem, network, shell, or external-process
  execution in the default permission mode.
- No reliable cancellation or late-result rejection during panel shutdown.
- No undo/verification behavior for a mutating action.
- Cloud credentials stored insecurely or exposed in transcript/diagnostics.
- Qwen malformed JSON causing a false executable plan.
- Vela code coupled directly to `main.js` state such that existing Home,
  Settings, registry, Palette, or shutdown behavior regresses.
- AE manual tests missing for narrow panels, selection drift, undo, and close
  during an active request.

### Deferrable risks

- Streaming tokens and partial plan display.
- Confirm Plan mode.
- Full Access autonomous mode.
- Multi-provider model discovery and automatic model selection.
- Dynamic registration of new tools by the model.
- Rich property previews and project-wide context search.
- File-based credential storage and offline encrypted history.

### Performance and reliability risks

Small local models may take several seconds and may produce repetitive repair
requests. Use one in-flight request, bounded retries, response size limits,
and visible status. Do not let provider latency block AE's UI or host bridge.

Host calls are asynchronous from CEP's perspective but may still block AE
while an ExtendScript action runs. Keep actions small, use existing undo
groups, and stop plans on the first uncertain result.

The existing `main.js` lifecycle is a high-risk integration point. The first
Vela implementation should use a narrow adapter for shutdown, visibility,
Settings, and navigation, then add dedicated tests before any extraction.

## Final boundary

Vela 0.3.0 is an approval-driven assistant over explicit AE capabilities. The
model proposes; local schemas, target fingerprints, permissions, and the
Execution Guard decide whether an action can be shown or run. The user remains
the authority for mutations. Full Access is a later, bounded mode and not a
default escape hatch from these rules.
