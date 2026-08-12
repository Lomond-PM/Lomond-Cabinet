# HANDOFF.md

The uncommitted `refactor/0.3.2-action-button-foundation` work closes CoreUI Primary, Neutral, and Danger button semantics without changing elevation token values, interaction lifecycles, or domain geometry. Registry Secondary maps to Neutral and Registry danger maps to CoreUI Danger. The Developer Control Lab now provides real full-width Neutral, Primary, and Danger specimens with group-owned action-stack spacing; the Action-only Danger surface uses `rgba(255, 107, 95, 0.22)` at rest and an action hover token at `0.30`. `--space-registry-action-stack` preserves the accepted field-control spacing value through an independent action-domain lifecycle. Palette and Settings consume canonical roles while retaining local composition classes. Navigation, Home, and Vela remain separate ownership boundaries. Run the action/button and elevation contracts plus AE light/dark, wide/narrow smoke before commit or PR.

The uncommitted `refactor/0.3.2-typography-appearance` work contains Typography Appearance Phase 1 and Phase 2 together. Interface Appearance renders the six stable size parameters as percentage RangeNumber controls under Typography / Titles, Content, and Code, with transient preview, numeric v1 persistence, remove-override Reset, responsive rows, and page-exit cleanup. Automated contracts pass apart from the retained legacy `test-vela-settings-integration.js` signature failure. Complete AE smoke across locale, width, UI Scale, persistence/reset, semantic independence, Palette JSON, and Vela transcript before commit or PR.

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
- Latest published tag: `v0.3.1`
- Release status: **0.3.1 Vela Experimental Preview published**
- Host API version: `1.0.0`

Version 0.3.1 is published on `main` and tagged `v0.3.1`. Post-release development continues from `dev`, which is the baseline for the next 0.3.2 work.

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

The active 0.3.2 contract-completion work makes CoreUI the behavior owner for Checkbox, Switch, card-style ChoiceGroup, RangeNumber, ColorField, and Disclosure. Registry remains the declarative adapter and domain code retains meaning, persistence policy, business state, host actions, and payload ownership. `checkbox` and `switch` preserve the same boolean storage shape but have distinct semantics; compatibility `tabs` now consumes ChoiceGroup; Range/Color no longer own duplicate Registry compound-control behavior. Registry collapsible headings are native buttons and Settings theme groups share the same Disclosure controller without changing their layout or motion contract.

AE acceptance should cover Control Lab Checkbox/Switch/ChoiceGroup/Range/Color/Disclosure, Vela acknowledgement, production Registry option cards, section toggles, Settings theme disclosure, keyboard/focus, disabled states, picker preview/commit/cancel, and wide/narrow bilingual stress.

BezierCurveField is now available as a generic CoreUI advanced input and Registry `cubicBezier` field with structured `{x1,y1,x2,y2}` state. Progress and Speed views, Speed/Influence projection, P1/P2 numeric fallback, pointer/keyboard editing, parser/serializer, cancellation, readonly/disabled behavior, and resize presentation all share that single authority. In the AE-inspired Speed view, Shift-drag changes influence only; each endpoint maps canonical influence `0–1` over its half of the graph while the Speed curve retains the full time axis. The half-width factor is presentation geometry, not a data limit. Control Lab provides default, overshoot, readonly, and disabled specimens. AE should verify the bilingual Speed-only hint, free/Shift half-width drag parity, center meeting at influence 1, zero-influence degradation, extreme curves, Escape/pointer cancellation, numeric scrub/commit, UI Scale, wide/narrow layout, and structured Registry payloads. Motion defaults, Motion Design Tuning storage, general GraphEditor functionality, and Quick Anchor / Nine-Point Anchor are outside this scope.

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

Published tags `v0.3.0` and `v0.3.1` are immutable. Future version tags should be created only after the reviewed release commit reaches `main`.

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
# Motion Phase 1 handoff

Motion architecture is CSS-first for ordinary interactions and transaction-based only for cancellation-sensitive spatial presentation. `MotionDefaults` is the semantic source; `CoreMotion` is a domain-neutral scoped lifecycle engine. Domain adapters retain geometry, routing hooks, Palette/Peek/Appearance cleanup, and content handoff. The legacy global animation lock remains only around current Home/Settings flows.

AE acceptance must confirm parity for Primary/Neutral/Danger interaction, Home↔Tool, Home↔Settings, collapse, Palette, Peek, drag and Vela, plus `motion.speed` values 0.75/1/1.35 without late cleanup, ghosts, or residue. Known visual remediation remains Phase 2.

## Motion Phase 2 handoff

AE must validate centered Action press across canonical and compatibility consumers; Settings-open Home recede; completion-aligned Home restore for both Tool and Settings close; and Tool-open identity/content overlap at motion speeds 0.75, 1, and 1.35. Settings Close retains its protected measurement, geometry, backdrop, and cleanup path. DOM preparation remains in the existing Tool adapter; real content is temporarily laid out at destination geometry and clipped by the expanding shell, while interaction remains locked until the spatial transaction completes. Narrow layout is the primary reflow/clip stress test.

## Motion Curve Foundation handoff

## Design Tuning Infrastructure handoff

The active `refactor/0.3.2-design-tuning-infrastructure` work establishes the non-UI calibration authority for four Motion curve families and four semantic durations. `AEToolbox.designTuning.v1` stores only validated partial overrides; it never touches Appearance or Settings persistence. Duration overrides enter before the existing Major View Motion Speed multiplier. Structured curve overrides project onto the existing root curve properties, while raw canonical curves remain stylesheet-owned. Projection during protected Tool/Settings motion is deferred until `endAnimation()` and only the latest pending state applies. Reset removes overrides, promotion evidence is data-only, Reduced Motion remains authoritative, and the next task may add Developer → Design Tuning → Motion UI without changing these boundaries.

The canonical UI curve defaults now live only in CSS as Enter, Exit, Standard, and Press families. `MotionDefaults.resolveEasing()` reads their computed values at the start of each WAAPI interaction, so CSS presentation and WAAPI share one authority and a future Design Tuning override applies on the next interaction. Semantic roles reference family identifiers; domain choreography remains unchanged. Legacy CSS easing names are forwarding aliases and `main.js` no longer owns easing literals.

Procedural background drift has an independent local curve with the same accepted value, preventing UI Standard calibration from altering artwork motion. `motion.speed`, Reduced Motion, Vela processing pulse, and all existing curve values remain unchanged. AE acceptance should smoke Tool and Settings open/close, Home recede/restore, Palette, Action hover/press, ordinary Vela control response, and procedural drift at the three Motion Speed settings; expected visual delta is none.
## Uncommitted Settings IA Foundation

The active `refactor/0.3.2-settings-information-architecture` work establishes one Settings scroll surface with independently collapsible Appearance, Vela, Advanced, and gated Developer stacks. There are no category destination cards or secondary category pages. Appearance owns Language, Theme, Interface UI Scale, Major View Motion Speed, semantic/typography controls, Tool Icon Appearance, nested Background disclosure, and Palette Library. Background UI classification belongs to Appearance while its runtime and persistence remain domain-owned. Advanced owns Developer Access; Developer owns Home Calibration and all procedural parameters including saturation/brightness/grain. Expanded category content is natural-flow geometry with visible overflow, while only collapsed categories clip to zero; `.settings-content` remains the scroll owner, so nested Background/Developer disclosures and locale/UI Scale/responsive reflow cannot be clipped by a stale ancestor cap. Registry Control, Settings Renderer, and Procedural Appearance Labs remain Developer-only Registry/Home tools, but their Settings quick entries and dedicated handoff wiring are intentionally removed. A separate Surface Transition Foundation must later audit CoreMotion, Home/Tool and Settings lifecycles, source/return/target identity, navigation ownership, animation guards, cancellation, and stale callbacks before defining generic open/close/switch behavior.

Vela is a transitional dedicated disclosure inside Global Settings root, not a permanent `settings/vela` route. The lower-left Vela gear expands/focuses it and passes its real launch source into the existing Settings morph; future work should migrate the whole category into a Vela-owned popup. Palette Library remains a specialized workspace: it snapshots root scroll, gives scroll ownership to its list/editor panes, and restores the snapshot on exit. AE acceptance must cover disclosure independence, Palette scrolling/restoration, Vela focus and close restoration, Developer ON/OFF without navigation, unique editor ownership, bilingual wide/narrow layouts, and unchanged Settings morph behavior.
