# HANDOFF.md

## Purpose

This document explains how to continue Lomond Cabinet development on another machine and how to preserve the current 0.3.1 architecture and release state.

Read before coding:

```text
AGENTS.md
README.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

## Current release

- Product version: `0.3.1`
- Latest existing published tag: `v0.3.0`
- Release status: **0.3.1 Vela Experimental Preview release bump prepared after automated and AE P0 regression**
- Host API version: `1.0.0`

Version 0.3.1 is prepared on the release branch. This handoff does not imply that a release commit, merge, or tag has occurred.

Vela remains experimental:

- Provider disabled by default;
- explicit session-only acknowledgement and enablement;
- loopback endpoints only;
- no qualified/recommended/default model;
- production activation locked;
- Vela Persistent Surface is the only Vela entry; the legacy fallback is retired.
- Vela Surface height is a versioned, persistent layout preference. Viewport/UI-scale clamps affect only the displayed height and do not overwrite that preference. Provider enablement remains session-only, and conversation/context persistence is still out of scope.

## Source of truth and junction setup

The workspace Git repository is the source of truth.

Primary Windows workspace:

```text
C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

Primary CEP development path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
```

In the main development environment, the CEP path is a Windows junction to the workspace. Therefore:

- do not copy/sync files between workspace and Extensions during normal development;
- do not edit a stale secondary Extensions folder;
- reload the CEP panel after frontend changes;
- restart After Effects when host JSX remains cached.

On another machine, create an equivalent junction/symlink or place the complete extension tree at the CEP path.

macOS development path:

```text
~/Library/Application Support/Adobe/CEP/extensions/com.kevin.aetoolbox/
```

The extension root must contain:

```text
CSXS/manifest.xml
```

## Repository contents required for a handoff

Preserve the full source repository when moving development to another machine. Runtime-critical areas include:

```text
CSXS/
client/
host/
helpers/
```

Development and maintenance context also requires:

```text
scripts/
docs/
AGENTS.md
README.md
CHANGELOG.md
VERSION
.gitignore
```

Do not include machine-specific temporary data, debug logs, ignored qualification evidence, node_modules, generated archives, editor state, or workspace-local scratch files in a handoff archive.

The preferred folder name remains:

```text
com.kevin.aetoolbox
```

## Initial setup on another machine

1. Clone or copy the repository.
2. Confirm `VERSION` is `0.3.1` for the current release baseline.
3. Confirm both manifest version fields match `VERSION`.
4. Configure CEP PlayerDebugMode for the AE/CSXS version when using an unsigned development extension.
5. Create the CEP junction/symlink or install the full extension folder.
6. Restart After Effects.
7. Open:

```text
Window > Extensions > AE Toolbox
```

or:

```text
Window > Extensions (Legacy) > AE Toolbox
```

8. Confirm the visible panel title is Lomond Cabinet.
9. Create a task branch from updated `dev` before changing code.

Recommended first Codex prompt:

```text
请先阅读 AGENTS.md、README.md、docs/PROJECT_STATE.md、docs/DESIGN_SYSTEM.md、docs/HANDOFF.md，不要修改代码，先总结当前架构、活动工具、Vela安全边界、前端/Host调用路径和已知风险。
```

## Runtime loading

- `CSXS/manifest.xml` loads `client/index.html`.
- Browser JavaScript loads host JSX through `CSInterface.evalScript()` and `$.evalFile(...)`.
- `client/index.html` must not load `.jsx` files directly.
- `host/index.jsx` owns host bootstrap and tool loading.
- Registry schemas live in `host/tools/*.tool.jsx`.
- AE implementations live in retained `host/tools/*.jsx` modules.

If a host change appears inactive:

1. confirm `host/index.jsx` loads the expected module;
2. confirm the frontend invokes the expected host function;
3. reload the panel;
4. restart After Effects;
5. add a temporary bounded debug version only when needed to prove the active path.

If CSS/browser JavaScript appears stale, verify the cache query in `client/index.html`, close/reopen the panel, then restart AE if required.

## Current architecture boundaries

### Registry Renderer

```text
Tool owns data and actions.
Core owns UI and behavior.
```

Ordinary tools should declare schema/actions/i18n in `.tool.jsx` and reuse the shared renderer. Do not default to dedicated DOM, CSS, frontend event handling or direct storage.

Production tool ids:

- `textBackgroundBox`
- `selectionInfo`
- `ecommerceLayout` — Ad Component Kit compatibility id
- `shapeAdd`

Do not rename `ecommerceLayout` without a dedicated storage/Home-order migration. Do not remove retained host modules such as `shapeAdd.jsx` while registry actions still depend on them.

Icon Grid uses a strict all-or-nothing input contract. It supports unlocked, unparented 2D Text, Shape, Solid, Footage, and Precomp layers only when transforms and visual bounds are safe (zero rotation, positive scale, finite source rectangle, and successful `sourcePointToComp()` for every corner). It rejects 3D, parented, locked, expression-driven, negative-scale, collapsed Precomp, zero-size, non-finite, and unsupported layers without silently skipping them; ordinary Shape continuous rasterization remains supported. Refresh measures member-local source bounds with current member Scale, so unchanged inputs are idempotent even when the Controller is moved, rotated, or positively scaled. It does not rewrite member metadata. Keep fixed-cell layout and final visual recentering as separate work.

### Settings

Settings is app-owned, not a registry tool.

- schema: `client/js/settingsSchema.js`
- main storage: `AEToolbox.settings.v1`
- background compatibility storage: `AEToolbox.background.v1`
- language storage: `aeToolbox.language`

Do not introduce a Settings v2 migration or replace BackgroundEngine behavior during unrelated work.

### Procedural appearance

- stable tool ids determine icon identity;
- theme/language/order/UI scale do not regenerate source structure;
- Theme Map is presentation-only;
- Palette Store owns persisted user overrides and mappings;
- classic BackgroundEngine remains available;
- source and presentation invalidation remain separate.

Detailed plan: `docs/design/procedural-appearance.md`.

### Vela

Trusted product activation is owned by:

```text
client/js/vela/velaActivationPolicy.js
```

Frozen 0.3.1 values:

```text
releaseMode = experimental-preview
experimentalOptInAllowed = true
productionEnabled = false
productionBlockReason = no-qualified-default-model
qualifiedDefaultModelId = null
legacyFallbackRetained = false
formalUiD2Enabled = false
```

Endpoint and Model ID may persist. Acknowledgement, readiness, enabled state and authority do not persist. Reload requires a new explicit opt-in. Readiness is not qualification.

Execution authority remains separated across Parser/Profile checks, Intent Gate, Review, Router, local candidate, Confirmation, Preflight, ExecutionAdapter and Host. A model proposal never executes directly.

The 0.3.1 `proposal-capable-union` profile may produce text or the single bounded `set-opacity-v1` proposal when actionable Context is available. It is a transition profile, not a delegated Agent contract, and it does not bypass any authority boundary.

Do not weaken Prompt/schema/Protocol/Parser/Policy/Gate/Router/Confirmation/Preflight/Adapter/Host/qualification/activation boundaries during unrelated work.

## Windows eyedropper helper

The working Windows color-sampling path uses the helper under:

```text
helpers/win/eyedropper/
```

The ColorSampler provider boundary allows a future helper replacement without changing the color picker UI or color model.

Known MVP limitations remain documented in `docs/KNOWN_ISSUES.md`, including possible taskbar flash, first-session cancellation inconsistency, and CEP context-menu behavior on right click. Do not opportunistically rewrite the color picker while working on unrelated tasks.

## i18n

Supported languages:

- English
- Simplified Chinese

Core/global/Home/Settings copy belongs in `client/js/i18n.js`; registry tool copy belongs in each `.tool.jsx` i18n block.

Before deleting global keys, run:

```text
node scripts/report-i18n-usage.js
```

and inspect the generated report. Do not infer safe deletion from static search alone.

## Development workflow

```text
task branch -> dev -> main -> version tag
```

- Start focused work from current `dev`.
- Run relevant specialty tests during implementation.
- Run consistency/static/diff checks before a PR.
- Run the full offline suite once for substantial PR or release gates.
- Use AE smoke for active runtime paths.
- Keep published tags immutable.

Existing published tag `v0.3.0` must not be moved. Create a new `v0.3.1` tag only after the reviewed release commit reaches the intended release branch.

## Version management

Future release changes must synchronize:

- `VERSION`
- `CSXS/manifest.xml` bundle version
- `CSXS/manifest.xml` extension version
- `AEToolbox.projectVersion` in `host/index.jsx`
- `CHANGELOG.md`
- maintained current-version statements

`AEToolbox.hostApiVersion` changes only when the Host contract changes deliberately.

## Post-0.3.1 roadmap

### 0.3.2 — UI / Design System Foundation

Establish a complete semantic token hierarchy for color, surface, text, status, interaction, typography, spacing, radius, geometry, and component tokens. Progressively align Vela, Registry Renderer, Settings, and Home without redesigning the accepted Vela UI structure.

### 0.3.3 — Context & Observation Foundation

Build Observation API, progressive context, task context, conversation context, and typed read/analyze capabilities. Evolve Registry toward a Capability Registry consumed by both Agent and Human UI. A capability may `read`, `analyze`, `mutate`, or `create`; Human UI is not required. Analysis capabilities such as audio BPM detection belong in this registry even without a complex workflow screen.

### 0.3.4 — Agent Authority Foundation

Define `ModelSuggestion`, `ActionCandidate`, `DelegationGrant`, and a Policy Engine returning `ALLOW`, `REVIEW_REQUIRED`, or `DENY`. Natural-language understanding/candidate generation and execution authority must be fully decoupled.

### 0.4.0 — First Delegated Agent

Introduce the bounded loop `Observe → Plan → Act → Verify → Replan` only after the user grants task-scoped authority. Review should then represent missing authority, out-of-scope/high-risk actions, ambiguity, or escalation rather than an unconditional step in every delegated operation.

### 0.4.x — Agent Reliability

Add audit, checkpoints, undo/rollback, action/time budgets, loop detection, recovery, completion verification, authority provenance, and prompt-injection separation.

### 0.5.x — Context Memory & Demonstration Learning

Add preference memory, operation observation, state diffs, demonstration episodes, learned procedures, and a skill library. Prefer memory, retrieval, and demonstration learning over live model-weight modification.

### 0.6+ — Visual / Creative Agent

Add rendered observation, multimodal reasoning, animation evaluation, and optional fine-tuning after the prior Context, Authority, and Reliability foundations are established.

### Safety migration direction

Strongly retain typed capability allowlists, parameter schemas, trusted target binding, Context fingerprints, generation/replay protection, fresh Preflight, Execution Guard, Execution Adapter, Host allowlists, and lifecycle fail-closed behavior.

Future reviewed contracts may migrate away from single-message lexical proposal denial, the hard text-only/proposal-only split, raw-message parameter provenance as a universal gate, and confirm-every-action as the only authority model. The 0.3.1 bounded union remains a transition architecture, not autonomous Agent behavior.

## Minimal regression checklist after moving machines

- extension starts and reloads;
- Home, Home Edit, Settings and Registry Renderer load;
- Text Background Box, Selection Info, Ad Component Kit and Shape Add open;
- language switching works;
- procedural icons/background load;
- Windows helper is present when testing on Windows;
- Vela shows Experimental / Not qualified;
- Provider remains disabled by default;
- explicit session opt-in can reach readiness;
- reload clears acknowledgement/readiness/enablement;
- Vela Persistent Surface mounts without a legacy Home/detail fallback;
- no new console/bootstrap/controller errors appear.
