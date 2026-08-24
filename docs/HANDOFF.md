# HANDOFF.md

## 0.3.2 release handoff

Version 0.3.2 is **RELEASED** from the synchronized `main` and `dev` baseline. Registry/shared components, Appearance, the 67-parameter living Design Tuning Registry, Palette Store v2 and native Workspace, Final Settings IA, Runtime Console Cleanup, and Vela spacing convergence are complete. Their focused acceptances and the final integrated After Effects 2026 release smoke are closed and passed.

The next development line is 0.3.3 Agent Runtime Foundation. Keep that work isolated from 0.3.2 and preserve the current Provider, Review, Confirmation, Preflight, ExecutionAdapter, and Host authority boundaries.

## Historical incremental working notes (superseded)

The notes below, before **Purpose**, record intermediate 0.3.2 task handoffs. Their “uncommitted”, pending-AE, or next-step language is historical and is superseded by the release handoff above.

Full Coverage 后续 AE 验收需确认：UI Scale Peek 仅显示语义 reference row；GLOBAL / COMMON control tokens 在 Settings、Registry 与 Control Lab 的适用组件同步；Control Lab 的 Registry Path 完整且 CoreUI Direct ShadowField 可交互。最终参数面向 Developer / Advanced / User 的安置仍延期到校准评审。

AE 需验证 real-consumer transient calibration：continuous drag 实时改变真实适用 consumer，但不写 `AEToolbox.designTuning.v1`；release 仅提交最终值且无闪回。Design Tuning source control 在 active gesture 中应保持稳定，关闭 Settings、Cancel 或 Reset 清 transient。Home/Detail/Settings/Vela transcript 的有意滚动区域使用共享 `.ui-scroll-region` 外观，且无 Preview Stage nested scrollbar。

Settings close/reopen 现在通过 shared Surface Presentation Session 恢复 disclosure payload 与主 scroll；Tool Detail 使用同一 seam、以 `tool:<id>` 隔离位置。验收时需确认首个可见帧已恢复、语言切换不影响 semantic key，并确认 Settings 与 Tool 的 scroll state互不污染。

The uncommitted `refactor/0.3.2-action-button-foundation` work closes CoreUI Primary, Neutral, and Danger button semantics without changing elevation token values, interaction lifecycles, or domain geometry. Registry Secondary maps to Neutral and Registry danger maps to CoreUI Danger. The Developer Control Lab now provides real full-width Neutral, Primary, and Danger specimens with group-owned action-stack spacing; the Action-only Danger surface uses `rgba(255, 107, 95, 0.22)` at rest and an action hover token at `0.30`. `--space-registry-action-stack` preserves the accepted field-control spacing value through an independent action-domain lifecycle. Palette and Settings consume canonical roles while retaining local composition classes. Navigation, Home, and Vela remain separate ownership boundaries. Run the action/button and elevation contracts plus AE light/dark, wide/narrow smoke before commit or PR.

The uncommitted `refactor/0.3.2-typography-appearance` work contains Typography Appearance Phase 1 and Phase 2 together. Interface Appearance renders the six stable size parameters as percentage RangeNumber controls under Typography / Titles, Content, and Code, with transient preview, numeric v1 persistence, remove-override Reset, responsive rows, and page-exit cleanup. Automated contracts pass apart from the retained legacy `test-vela-settings-integration.js` signature failure. Complete AE smoke across locale, width, UI Scale, persistence/reset, semantic independence, Palette JSON, and Vela transcript before commit or PR.

## Purpose

This document explains how to continue Lomond Cabinet development on another machine and preserve the prepared 0.3.2 architecture and release state.

Read before coding:

```text
AGENTS.md
README.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

## Current release

- Product version: `0.3.2`
- Latest published tag: `v0.3.2`
- Release status: **0.3.2 RELEASED**
- Host API version: `1.0.0`

Version 0.3.2 is published from synchronized `main` and `dev` and tagged with immutable `v0.3.2`. The handoff baseline is the released 0.3.2 state; the next development line is 0.3.3 Agent Runtime Foundation.

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
2. Confirm `VERSION` is `0.3.2` for the released baseline.
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

## Post-0.3.2 roadmap

### 0.3.2 — UI / Design System Foundation (released)

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

The active Motion v1 UI work adds that gated Developer stack without changing runtime authority. Four generic BezierCurveField editors commit only on `onChange`, four RangeNumber controls commit semantic milliseconds, Default/Overridden status and reset actions read/write only through the resolver, and promotion evidence is a read-only manual-copy surface. Reset All is intentionally omitted while Motion is the sole UI domain. Content reveal during spatial morph remains AE-verified and unchanged; future Surface Transition work must consume these resolved values rather than introduce another timing authority.

The canonical UI curve defaults now live only in CSS as Enter, Exit, Standard, and Press families. `MotionDefaults.resolveEasing()` reads their computed values at the start of each WAAPI interaction, so CSS presentation and WAAPI share one authority and a future Design Tuning override applies on the next interaction. Semantic roles reference family identifiers; domain choreography remains unchanged. Legacy CSS easing names are forwarding aliases and `main.js` no longer owns easing literals.

Procedural background drift has an independent local curve with the same accepted value, preventing UI Standard calibration from altering artwork motion. `motion.speed`, Reduced Motion, Vela processing pulse, and all existing curve values remain unchanged. AE acceptance should smoke Tool and Settings open/close, Home recede/restore, Palette, Action hover/press, ordinary Vela control response, and procedural drift at the three Motion Speed settings; expected visual delta is none.
## Uncommitted Settings IA Foundation

The Settings information architecture establishes one Settings scroll surface with independently collapsible Appearance, Advanced, and gated Developer stacks. There are no category destination cards or secondary category pages. Appearance owns Language, Theme, Interface UI Scale, Major View Motion Speed, semantic/typography controls, Tool Icon Appearance, nested Background disclosure, and Palette Library. Background UI classification belongs to Appearance while its runtime and persistence remain domain-owned. Advanced owns Developer Access; Developer owns Home Calibration and all procedural parameters including saturation/brightness/grain. Expanded category content is natural-flow geometry with visible overflow, while only collapsed categories clip to zero; `.settings-content` remains the scroll owner, so nested Background/Developer disclosures and locale/UI Scale/responsive reflow cannot be clipped by a stale ancestor cap. Registry Control, Settings Renderer, and Procedural Appearance Labs remain Developer-only Registry/Home tools, but their Settings quick entries and dedicated handoff wiring are intentionally removed. A separate Surface Transition Foundation must later audit CoreMotion, Home/Tool and Settings lifecycles, source/return/target identity, navigation ownership, animation guards, cancellation, and stale callbacks before defining generic open/close/switch behavior.

Vela Settings is a lazy Vela-owned modal opened by the lower-left Vela gear, not a Global Settings disclosure or permanent `settings/vela` route. Closing restores focus to the real launch source without changing Vela conversation/runtime state. Palette Library remains a specialized workspace: it snapshots root scroll, gives scroll ownership to its list/editor panes, and restores the snapshot on exit. AE acceptance must cover Palette scrolling/restoration, Vela modal focus and close restoration, Developer ON/OFF without navigation, unique editor ownership, and bilingual wide/narrow layouts.
# Design Tuning Full Coverage handoff

AE 验收需覆盖：无 override 视觉等价；spacing/radius/control geometry 的实时重排与 reset；五个 typed elevation shadows 的预览、持久化与 reset；Motion 既有 8 项；Appearance/Typography 镜像仍使用原持久化；wide/narrow、中文/英文及 UI Scale 极值。当前工作区 placement 不是最终产品 IA，Surface Transition 相关 radius 不应尝试写 override。

Coverage Completion 后 Motion 为 4 curves + 15 durations；应逐项触发真实交互并确认运行中的 animation 保持 snapshot、下一次 interaction 采用新值。Appearance mirror 共 21 项，新增 focus/hover/selected/checked/primary-action/selection visual roles，需确认与原 Appearance editor 双向同步且 Reset 沿用原 authority。新增 6 个 domain spacing 应在 Registry、Palette、Home 的真实 consumer 上慢拖检查连续性、scope 与 UI Scale 极值。Settings 中展开新增字段、滚动、关闭、重开时应恢复 disclosure 与主 scroll，且 calibration source control 无 gesture jump。

AE 还需校准七个 Color + Alpha fields：重点测试 secondary text、field surface、input border 的 alpha slow drag、no-flash commit、reload 与 reset，再抽测其余四项。Promotion Evidence、Palette JSON 和 Registry Textarea 应使用项目 scrollbar、无 native arrow/corner/resize grip；JSON/raw evidence 可在 element 内水平滚动，但 Settings 主 surface 不得横向 overflow。Control Lab 包含真实 ColorField alpha-mode specimen。

Scroll convergence复测需确认 Promotion Evidence、Palette JSON、Registry/Control Lab Textarea 的 scrollbar完全裁切在rounded outer frame内；原 vertical resize由右下角project grip保留，拖动不选中文字、不触发input且不越出父容器。Vela composer应使用同一 scrollbar/frame presentation、无native arrows/corner，并继续保持此前无textarea resize的行为；transcript与composer仍是独立scroll lifecycle。

Startup blocker修复后必须先执行至少3次AE面板冷启动：Design Tuning Evidence预构建不得抛异常，`loadHost()`必须启动Core Bootstrap，Loading Tools应由ready/degraded snapshot正常清除并显示Home工具池。随后打开含Select与Textarea的Registry/Control Lab，确认Select仍直接mount、Textarea才使用`_coreFrame`。不要只以hot reload代替该验收。
## Vela Settings Ownership Split

The fixed lower-left Vela Settings button lazily opens a Vela-owned modal surface. Closing returns focus to the same button and leaves transcript, composer, session runtime and Vela height/layout intact. Global Settings contains no Vela category or `settings.vela` disclosure, and no permanent `settings/vela` route exists. Endpoint and Model ID continue through `AEToolbox.settings.v1`; acknowledgement, Provider enablement and readiness remain session-only; qualification policy remains internal. The modal reuses CoreUI and shared scroll presentation and is not part of startup-critical Settings pre-render.

Presentation convergence adds formal English/Chinese lazy i18n, one non-duplicated surface heading, shared semantic Card inset and existing typography/radius/surface/border/elevation/control authorities. Open and close snapshot the existing View Content Enter/Exit motion roles; Close, backdrop and Escape share one idempotent exit path before focus restoration. AE should retest narrow localized header fit, spacing, Design Tuning consumer linkage, and modal motion while Vela is processing or reviewing.

Surface Transition Foundation is now implemented for Tool and Global Settings transitions only. The real Home tool/settings icon is the identity target; every transaction freshly snapshots geometry, computed radius and bounded surface presentation, then converges the presentation-only shell before same-boundary cleanup. CoreMotion/MotionDefaults, Home recede/restore, destination-layout content and SurfacePresentationSessions keep their existing ownership. AE must inspect the final 20% of Tool/Settings close at slow legal tuning values, plus open, UI Scale, responsive reflow, session restoration and rapid gated use. Vela Settings is intentionally unchanged.

The visibility-continuity correction separates content exit from carrier presence: Tool/Settings content fades concurrently with contraction, while the shell remains presentation-visible and the destination icon projection progressively owns recognition through handoff. Open uses the corresponding expansion/reveal overlap. Retest normal, fastest legal and slow inspection speeds; a whole-surface fade must not replace visible destination convergence.

Close choreography is direction-aware rather than a literal Open opacity reversal. A shared normalized contract owns reciprocal content windows and destination-recognition-before-handoff; consumer adapters only supply Tool or Settings identity content. Destination is a visible composite of frame plus artwork, the surrogate remains recognizable until the real Home owner is equivalent, and cleanup must not provide a final visible strengthening. MotionDefaults continues to own unchanged canonical duration/easing values.

AE has accepted visible → partial → suppressed content staging; keep those windows frozen. Close destination surrogates now live in an independent app-shell transition identity layer so neither Home environment restoration nor the contracting shell can multiply or clip their effective tail visibility. After recognition is established, frame and artwork hold a readable plateau until presentation-equivalent handoff.

Appearance runtime stability requires AE verification without closing Settings: retain at least two semantic overrides while previewing/committing/resetting another authority. Procedural mode selection is independent from temporary renderer fallback. Startup, Classic → Procedural, and explicit reselect all enter the same activation seam, which resolves fresh DOM mounts and must end in a rendered, visible procedural presentation without losing seed, palette, or parameters. Procedural Background belongs to persistent App Shell presentation, remains live while Settings/Tool content is active, and must not inherit Home recede opacity. Perform Classic ↔ Procedural and parameter changes while Settings remains open and verify the surrounding environment updates immediately; controller mode, `rendered`, and active classes alone are insufficient evidence. Repeated toggles and resize/rerender activation must not duplicate observers. Applying a theme palette assigns `base.canvas` from `palette.shadow` through the existing Home Canvas authority; manual Home Canvas edits remain valid until the next explicit palette application.

Manual AE diagnostics established `freeze-frame` as the production Golden Reference; `opaque-carrier` corroborated the cause, while environment freeze and surrogate suppression produced only second-tier improvement. The first production abstraction regressed to that second tier because it added a whole-carrier opacity fade from recognition-established to handoff, behavior absent from the reference. That fade is removed. Tool/Settings Close now literally preserve the source computed background, border, shadow, and alpha throughout geometry/radius contraction; the independent destination layer establishes recognition, and cleanup transfers ownership at destination-equivalent geometry without pre-fade. Retest normal and slow Tool/Settings Close against the freeze-frame reference; Open, content staging, Home restore, and Motion authority are frozen.
