# PROJECT_STATE.md

## 0.3.2 release-candidate authority

Version 0.3.2 is **READY FOR RELEASE**. The merged `dev` integration baseline has passed the complete offline regression and consistency gates, and the user has completed the final integrated After Effects 2026 pre-release acceptance. Previously completed 0.3.2 workstreams are closed and AE accepted: Registry Renderer / shared component convergence, Appearance and Design Tuning foundations, Full Design Calibration and Canonical Promotion, Palette Store v2 and dynamic Palette Workspace, Runtime Console Cleanup, Final Settings IA, and Vela presentation / spacing authority convergence.

Final integrated After Effects 2026 acceptance:

- integrated smoke: **PASS**;
- startup and Tool Catalog: **PASS**;
- Registry tools: **PASS**;
- Final Settings IA: **PASS**;
- Palette Workspace: **PASS**;
- Appearance, ColorAlpha and shared Color Picker: **PASS**;
- living Design Tuning Registry: **67 parameters**;
- persisted Design Tuning overrides: **0**;
- Vela integrated smoke: **PASS**;
- Developer Mode OFF → Back Home: **PASS**;
- project-owned Console warnings/errors: **0**.

Global Settings is ordered **General, Appearance, Advanced, Developer**. Final Settings IA is **CLOSED / AE ACCEPTED**. The living Design Tuning Registry contains **67 parameters**. It is not the same parameter set as the historical calibration-time 67: `spacing.content.inlineInset` and `spacing.content.blockInset` are post-calibration semantic authority additions, while `text.secondary` and `text.tertiary` moved to Appearance authority with Design Tuning mirrors. Historical Full Design Calibration totals and U/A/D/X/P classifications remain frozen facts.

Palette Store v2 remains the sole production Palette persistence authority, with dynamic `DIRECT`, same-palette `REFERENCE`, and registered `DERIVED` slots, `profiles.proceduralAppearance`, native Workspace Save/Cancel, and the legacy compatibility boundary. Cross-palette references, Harmony generation, node editing, global active Palette, and Appearance live-link remain deferred.

Vela spacing ownership is closed and AE accepted: Card Inset owns shell/card placement; Content Inline and Content Block Insets are shared by Conversation and Composer on their respective axes; Surface Edge owns Vela Settings. The 0.3.3 Agent Runtime Foundation is future scope and is not part of 0.3.2.

Design Tuning Full Coverage 已加入 GLOBAL / COMMON consumer convergence 契约、UI Scale Peek semantic target/structure-only ancestor path，以及 Registry Control Lab Registry Path / CoreUI Direct 完整性检查。Developer / Advanced / User 的最终参数安置仍等待 Full Calibration 后复核。

Design Tuning 已改为 real-consumer transient calibration。Resolver precedence 为 canonical → persisted override → transient override；commit 先持久化同值再清 transient，避免闪回。Calibration editor chrome 在 gesture 内冻结自身 semantic geometry，Control Lab 与其他真实 consumer 自然接收 transient。Live Preview Stage 及其 nested scroll owner已移除。

Tool Detail 与 Settings 现在通过同一 memory-only Surface Presentation Session seam 保存独立主 scroll location；Settings payload额外保存 stable-key disclosure state。Design Tuning calibration chrome baseline 在 mount 时建立一次，gesture 边界不再安装或删除 semantic freeze。

Action / Button Foundation now closes the CoreUI `Primary`, `Neutral`, and `Danger` visual roles. Registry `Secondary` maps to Neutral and Registry `danger` maps directly to CoreUI Danger; the Developer Control Lab contains real full-width specimens for all three roles under a semantic action-stack spacing owner. Disabled actions carry no elevation; Palette and Settings retain only domain layout/composition ownership. Navigation, Home tool identity, and Vela remain explicit domain boundaries, with no new User Appearance or Design Tuning parameter.

Typography Appearance Parameters now expose six bounded semantic size controls in Global Settings → Interface Appearance → Typography. Stable Parameter IDs persist numeric relative multipliers in `AEToolbox.appearance.v1`, while the UI presents percentages through Core RangeNumber. Page/Surface titles share intent; Field Label and Code sizes are independent from Body and Supporting; Control and Eyebrow retain their intentional derivations. Weight, line-height, font-family, Text Scale, and domain-specific typography controls remain deferred.

## Current project overview

Lomond Cabinet is an After Effects CEP extension panel.

- Visible product name: **Lomond Cabinet**
- Manifest menu name: **AE Toolbox**
- Extension id/folder: `com.kevin.aetoolbox`
- Prepared release version: `0.3.2`
- Latest published tag: `v0.3.1`
- Integrated release baseline: `dev` at the release-prep branch point
- Host API version: `1.0.0`

`VERSION`, both version fields in `CSXS/manifest.xml`, and `AEToolbox.projectVersion` identify prepared product version `0.3.2`. The latest published release remains 0.3.1 on immutable tag `v0.3.1` until the user performs the 0.3.2 release operations.

## 0.3.1 release status

Version 0.3.1 is the published stabilization release for the completed Vela D-phase **Experimental Preview** and closes the accepted 0.3.1 Registry, Grid, UI, bootstrap, lifecycle, and release-safety scope.

Completed scope:

- D2-A — model-independent Vela Surface states and lifecycle
- D2-B — explicit session-only local Provider opt-in and LM Studio readiness
- D2-C — trusted Activation Policy and D-phase closeout

The product status is intentionally experimental rather than production-enabled:

- local Provider opt-in is available but disabled by default;
- production activation is locked;
- no model is qualified, recommended, or selected as default;
- formal UI-D2 default enablement is false;
- Vela Persistent Surface is the only Vela entry and the legacy fallback is retired;
- Wide/Compact/Narrow Vela presentation and status behavior are complete for 0.3.1.
- Release-readiness automation and the AE P0 Release Regression passed.

Future model qualification, default-model selection and production activation are separate product decisions, not unfinished D-phase tasks.

## Runtime architecture

### CEP frontend

Primary entry and ownership:

- `CSXS/manifest.xml` → `client/index.html`
- `client/js/main.js` — app bootstrap, Home, Settings and Registry Renderer integration
- `client/js/i18n.js` — core/global English and Simplified Chinese text
- `client/js/settingsSchema.js` — app-level Settings schema
- `client/css/style.css` — shared application styling
- `client/css/velaSurface.css` — Vela Surface styling

The browser frontend loads host JSX through `CSInterface.evalScript()` / `$.evalFile(...)`. `client/index.html` does not load JSX directly.

### After Effects host

- `host/index.jsx` — host entry, shared API and tool loading
- `host/aeUtils.jsx` — AE helpers
- `host/effectUtils.jsx` — effect/property helpers
- `host/shapeUtils.jsx` — shape helpers
- `host/tools/*.tool.jsx` — registry metadata, schemas, actions and tool-local i18n
- `host/tools/*.jsx` — AE execution implementations retained by tools

Host code must remain ExtendScript-compatible.

## Registry Renderer

The 0.3.2 CoreUI / Registry Contract Completion establishes the formal component taxonomy. Registry `checkbox` now means selection/acknowledgement and maps to CoreUI Checkbox, while immediate persistent boolean settings use Registry `switch` and CoreUI Switch with unchanged keys/defaults/storage shapes. Registry `tabs` remains a compatibility schema boundary but is rendered by the card-style CoreUI ChoiceGroup with radio-group keyboard and ARIA behavior. Registry Range and Color now consume CoreUI RangeNumber and ColorField through the existing preview/commit and picker-service seams. Registry section toggles consume CoreUI Switch, and collapsible Registry sections plus Settings theme groups consume the shared Disclosure behavior while retaining domain layout and persistence ownership.

The Developer Control Lab covers these components through the real Registry schema path, including narrow and bilingual stress content. No storage migration, host payload change, Appearance parameter, or redesign is introduced.

Group B now adds the generic CoreUI BezierCurveField and Registry `cubicBezier` mapping. Its only authority is structured `{x1,y1,x2,y2}` data; Progress/Value, derivative Speed, Speed/Influence, numeric inputs, serialization, and SVG are synchronized projections. It supports overshoot, pointer/keyboard/numeric editing, readonly/disabled states, cancellation, and resize-safe presentation. Speed handles provide a bilingual Shift influence-only hint and use AE-inspired half-width-per-endpoint influence geometry without restricting canonical `0–1` influence. Control Lab contains default, overshoot, readonly, and disabled declarative specimens. Motion defaults and Design Tuning remain untouched; a general GraphEditor and Quick Anchor / Nine-Point Anchor remain unimplemented.

Current architectural rule:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

The frontend core renders shared registry sections, fields, actions, visibility, enablement, state cards, status, persistence and host routing. Ordinary tools should not add dedicated frontend DOM or CSS.

Current production registry tools:

### Text Background Box

- Registry id: `textBackgroundBox`
- Schema: `host/tools/textBackgroundBox.tool.jsx`
- Host behavior: `host/tools/textBackgroundBox.jsx`
- Creates shape backgrounds behind selected text layers.
- Fill and Stroke are section-controlled through the registry path.

### Selection Info

- Registry id: `selectionInfo`
- Schema: `host/tools/selectionInfo.tool.jsx`
- Reports active composition and selected-layer information.

### Ad Component Kit

- Compatibility registry id: `ecommerceLayout`
- Schema: `host/tools/adComponentKit.tool.jsx`
- Host behavior: `host/tools/adComponentKit.jsx`
- Creates Feature Stack and Icon Grid components.
- Icon Grid validates the complete selection before input-layer writes. Its 0.3.1 contract supports unlocked, unparented 2D Text/Shape/AV layers with zero rotation, positive uniform or non-uniform scale, finite source bounds, and four successful `sourcePointToComp()` conversions.
- Unsupported or unsafe input rejects the entire action with a stable reason; bounds conversion failure is never replaced with layer-space coordinates. Refresh derives normalize corrections from member-local source bounds and current member Scale, so repeated Refresh is idempotent and Controller Position/Scale/Rotation remain unchanged. Fixed-cell layout and final visual recentering remain outside this work.
- New output uses Lomond metadata and signed tool expressions for forward-only cleanup.
- The `ecommerceLayout` id and `AEToolbox.ecommerceLayout.v1` storage key remain for Home-order/storage compatibility.
- The removed `host/tools/ecommerceLayout.jsx` module is not an active path.

### Shape Add / Shape Builder

- Registry id: `shapeAdd`
- Schema: `host/tools/shapeAdd.tool.jsx`
- Host behavior: `host/tools/shapeAdd.jsx`
- Adds 19 native shape contents and creates linked Stroke / Fill shape layers.
- The static duplicate Home card and obsolete global wrappers have been removed.
- Do not delete the retained host implementation while registered actions use it.

### Developer Mode labs

Developer Mode retains shared renderer/Settings/procedural labs. They are hidden from normal Home mode and are not production tools. Registry Control Lab, Settings Renderer Lab, and Procedural Appearance Lab remain registered and launch normally from Home; the newly introduced Settings quick entries and their Settings-specific handoff wiring are removed. Quick launch is deferred to an independent Surface Transition Foundation covering generic open, close, and switch protocols rather than local Settings animation patches.

## Settings

Settings is an app-level core system, not a registry tool.

- Schema: `client/js/settingsSchema.js`
- Runtime/UI behavior: `client/js/main.js`
- Primary storage: `AEToolbox.settings.v1`
- Background compatibility storage: `AEToolbox.background.v1`
- Background collapse storage: `AEToolbox.backgroundSettingsCollapsed.v1`
- Language storage: `aeToolbox.language`

Current Settings areas include language, Developer Mode, motion speed, UI scale, interface colors, tool icon appearance, Palette Library, procedural appearance parameters and background behavior.

`BackgroundEngine` remains the owner of the classic path. `ProceduralHomeBackground` owns the optional procedural background source/presentation path. No Settings v2 migration is part of 0.3.1.

## Procedural appearance

Version 0.2.5 introduced the procedural appearance production paths retained in 0.3.1.

Key modules:

- `client/js/proceduralAppearance.js`
- `client/js/proceduralPreviewContract.js`
- `client/js/proceduralCache.js`
- `client/js/proceduralPaletteLibrary.js`
- `client/js/proceduralPaletteStore.js`
- `client/js/proceduralPaletteEditor.js`
- `client/js/proceduralPaletteWorkspace.js`
- `client/js/proceduralHomeIcons.js`
- `client/js/proceduralHomeBackground.js`

Current boundaries:

- source identity is deterministic from engine version, target, stable seed and normalized parameters;
- Home tool identity uses stable tool ids only;
- language, Home order, Developer Mode, UI scale and theme do not change icon source identity;
- Theme-mapped mode is a presentation mapping over a source raster;
- Palette Store v2 (`lomond.paletteStore.v2`) is the sole persisted Palette authority; the v1 key (`lomond.proceduralPaletteStore.v1`) is migration / rollback / import-only evidence and is never written by production;
- the classic Background Engine remains an explicit fallback;
- source and presentation invalidation remain separate.

Detailed design: `docs/design/procedural-appearance.md`.

## Reusable Palette System Foundation (0.3.2)

The 0.3.2 Reusable Palette System Foundation is **CLOSED / AE ACCEPTED**. The final real AE acceptance was completed by the user with no issues observed. It is intentionally bounded and does not expand into cross-palette references, Harmonies or generator UI, arbitrary derivation scripts, a node/graph editor, a global active Palette, Appearance live-link, or a semantic role-mapping editor.

Final authority map (single owner per layer; no competing authority):

- **Palette Definition / Schema** — `client/js/palette/paletteModel.js` (PaletteModel): pure validation/normalization of the v2 palette (stable `paletteId`/`slotId`, `DIRECT`/`REFERENCE`/`DERIVED`).
- **Derivation grammar / math** — `client/js/palette/colorDerivationRegistry.js` (`mix.v1`, `oklchAdjust.v1`).
- **Resolved graph** — `client/js/palette/paletteResolver.js` (resolvePalette over the current full v2 draft; fail-closed).
- **Palette persistence (sole authority)** — `client/js/palette/paletteStore.js` (`lomond.paletteStore.v2`): custom palettes, canonical-relative built-in overrides, hidden built-ins, `toolPaletteMap`, v1→v2 migration, v1/v2 import, export. `LegacyProceduralPaletteAdapter` and the `proceduralPaletteStore` facade are projection / delegation only and hold no persistence.
- **Built-in factory canonical** — `client/js/proceduralPaletteLibrary.js` (unique `listPalettes()` source; Store v2 stores only canonical-relative overrides).
- **Workspace** — `client/js/proceduralPaletteWorkspace.js`: memory-only full-v2 draft; Save is the only Store write boundary; Cancel clears transient effect. Uses the stable projection/update seam (ordinary edit → validate/resolve → in-place projection; structural edit → local editor-scroll rebuild preserving scroll owner).
- **Procedural consumer projection** — `client/js/palette/legacyProceduralPaletteAdapter.js` produces the legacy procedural consumer shape + semantic signature; `proceduralAppearance.js`, `proceduralHomeIcons.js`, `proceduralHomeBackground.js`, `proceduralThemeMap.js` consume that projection.
- **Application semantics** — Palette value → explicit assignment → existing Appearance authority. `themeAccent` / `homeBackground` remain Settings-backed Appearance inputs and are never implicitly rewritten by Palette edits; the Palette→Accent/Canvas flow (`suggestThemeAccentFromPalette`, gated by `suggestThemeAccent`) is an explicit user action only. Manual Appearance edits retain final authority.
- **Design Tuning** — separate calibration authority; unrelated to Palette authority.
- **CSS** — presentation output only; Palette core never writes semantic CSS.

## Vela architecture and safety state

### Surface and Provider

Vela provides a persistent transcript/composer Surface on Home. The optional local Provider is restricted to loopback endpoints:

The user's preferred Surface height persists separately under the versioned layout key `AEToolbox.velaSurfaceLayout.v1`. Mount, panel resize, responsive-mode changes, and UI-scale changes derive a clamped effective CSS-pixel height without replacing the original preference. Provider acknowledgement, readiness, and enablement remain session-only; transcript, multi-session, and context state are not persisted by this feature.

- `127.0.0.1`
- `localhost`
- `[::1]`

Endpoint and Model ID may persist. Acknowledgement, enabled state, readiness and authority are session-only and clear on reload. Readiness checks LM Studio's native model catalog and means only that the configured model instance is loaded.

### Trusted activation policy

`client/js/vela/velaActivationPolicy.js` is the single trusted owner of product activation state:

```text
releaseMode = experimental-preview
experimentalOptInAllowed = true
productionEnabled = false
productionBlockReason = no-qualified-default-model
qualifiedDefaultModelId = null
legacyFallbackRetained = false
formalUiD2Enabled = false
```

Settings, local persistence, readiness, acknowledgement, model output and transcript content cannot change those values.

### Execution boundary

The frozen safety chain is:

```text
Provider
-> Parser
-> Profile mismatch check
-> Intent Gate
-> proposal-ready
-> Review
-> private Router
-> local candidate
-> Confirmation
-> Approve
-> Preflight
-> ExecutionAdapter
-> Host
```

Review, Confirmation and Host authority remain independent. A model-authored proposal cannot execute directly. For the current `set-opacity-v1` capability, the model contributes only the bounded opacity value; target identity, request/candidate ids, plan, nonce, digest, authority and Host payload remain locally trusted.

The 0.3.1 `proposal-capable-union` profile is a bounded transition mechanism: when trusted Context shows one actionable opacity target, the Provider may return text or a `set-opacity-v1` proposal. It is not autonomous execution, does not add capabilities, and does not weaken Review, Confirmation, Preflight, Execution Guard, Execution Adapter, or Host authority.

The Context Bridge remains the foundation for observation, trusted target binding, fingerprints, lifecycle generations, and fresh execution checks. Request-time target continuity is intentionally deferred: proposal-ready remains identity-free and Review performs a fresh target bind.

### Qualification state

The C4 profile qualification infrastructure, Runner and Rubric are present. Historical 4B and 9B pilot candidates did not qualify. No 20-run candidate was eligible, and no default model was selected.

Historical evidence remains ignored/local and is not part of the release tree. Sanitized deterministic fixtures and reports remain for regression and provenance.

## i18n

Supported languages:

- English (`en`)
- Simplified Chinese (`zh-CN`)

Core/global/Settings/Home copy lives in `client/js/i18n.js`. Registry tool-specific copy belongs in the owning `.tool.jsx` file. The generated usage report is maintained through `scripts/report-i18n-usage.js` and `docs/reports/i18n-usage-report.md`.

## Current motion and lifecycle state

The application retains:

- Home-to-tool and tool-to-Home morph transitions;
- Settings open/close transitions;
- Home Edit drag/reorder behavior;
- panel shutdown guards;
- timer, observer, polling and pending-host-call cleanup;
- Vela cancellation, late-response, reload and duplicate-bootstrap guards.

Lifecycle and large core-file refactors require focused AE regression because `client/js/main.js` and `client/css/style.css` are compatibility-sensitive.

## Known issues and deferred work

Source of truth: `docs/KNOWN_ISSUES.md`.

The 0.3.1 Vela responsive/status work was the baseline for the now-complete 0.3.2 semantic authority and shared-component convergence. Remaining accepted limitations—not completed 0.3.2 work—are tracked in `docs/KNOWN_ISSUES.md`.

The generated i18n report guard is line-ending tolerant and checks working-tree, Git-index, and CI snapshots through their existing boundaries. Grid strict visual bounds, fail-closed input handling, current fixed-cell sizing, and Refresh scale idempotence are closed for 0.3.1.

Other areas to watch:

- Settings Background Engine preset dropdown render/layout issue;
- Windows eyedropper helper taskbar/first-cancel/context-menu MVP limitations;
- AE/CEP caching of old browser or JSX files;
- Home ordering compatibility through stable tool ids;
- remaining host messages that return plain text instead of `messageKey`.

## Release baseline

Version 0.3.2 is prepared from the integrated `dev` baseline. Version 0.3.1 remains published on `main`, and `v0.3.1` remains the latest immutable published tag until the user completes the release.

The release contains:

- Vela Protocol, Context, Provider, routing and execution safety infrastructure;
- model qualification diagnostics and frozen Rubric;
- Vela Surface and accessibility/lifecycle work;
- explicit experimental LM Studio opt-in and readiness;
- trusted Activation Policy;
- retained 0.2.5 procedural appearance production paths;
- expanded offline, browser VM, loader and production E2E coverage.

`CHANGELOG.md` contains the formal 0.3.2 release notes and historical release sections. Existing published tags must not be moved.

## Next development direction

After the 0.3.2 release, the next isolated development target is **0.3.3 — Agent Runtime Foundation**. It must not be merged into the 0.3.2 release preparation or weaken the existing Vela authority boundaries.

Registry evolves toward a typed Capability Registry consumable by both Agent and Human UI. Capabilities may be `read`, `analyze`, `mutate`, or `create`; a dedicated Human UI is not required for a capability to exist.

Long-term natural-language understanding and candidate generation must remain separate from execution authority. Preserve typed allowlists, parameter schemas, trusted target binding, Context fingerprints, generation/replay protection, fresh Preflight, Execution Guard, Execution Adapter, Host allowlists, and lifecycle fail-closed behavior. Later authority work may replace single-message lexical denial, hard text/proposal splits, universal raw-message provenance, and confirm-every-action as the only authority model, but none of those migrations are part of 0.3.1.
# 0.3.2 Motion Architecture Foundation

Phase 1 establishes semantic Motion Defaults, CSS/JS view-content duration parity, and scoped `CoreMotion` transactions for the existing spatial surface morph path. Home/Detail and Home/Settings retain their existing geometry, radii, overlay/content choreography, 480ms expand and 360ms contract curves. The Settings launch-source measurement now restores the exact pre-measurement Home class and transition state.

Deferred to Phase 2: action press perceptual centering; Tool open handoff/overlap; remaining Settings close paint-order or content choreography; nested Settings and Peek presentation; deeper morph reentrancy/resize remediation; full reduced-motion coverage; collapse actual-height remediation.

## Motion Phase 2 targeted remediation

## Design Tuning Infrastructure

The 0.3.2 Design Tuning Infrastructure adds a separate `AEToolbox.designTuning.v1` partial-override store, stable eight-parameter Motion registry, resolver, startup projection, reset APIs, and developer-readable promotion evidence. Duration canonicals remain in `MotionDefaults`; curve canonicals remain in CSS. Valid tuning resolves before the unchanged `motion.speed` major-view policy, while Reduced Motion retains final presentation authority. Protected Tool/Settings presentation defers CSS curve projection until the existing real animation cleanup boundary, with latest-value-wins behavior and no timeout or queue. No Developer Settings UI, Bezier editor, duration controls, Surface Transition work, or Vela ownership work is included.

Motion v1 now presents those eight parameters under the gated Developer → Design Tuning → Motion stack. Generic BezierCurveField editors keep pointer/numeric `onInput` local until `onChange` commits; RangeNumber durations likewise separate draft from commit. The UI reports Default/Overridden state, supports per-parameter and Motion-domain reset, and exposes resolver-generated promotion evidence as read-only JSON. It never writes CSS, localStorage, canonical defaults, or source files. The AE-verified content reveal choreography is unchanged, and Surface Transition remains a later consumer of resolved Motion values.

Canonical Action press is geometrically centered. Tool and Settings open share the existing Home recede presentation; Tool and Settings close now restore Home during the final 260ms of their 360ms contract using the same semantic derived-delay relationship. Both Home source measurement helpers restore exact pre-measurement class/transition state. Tool open identity lasts 360ms and overlaps the existing content reveal, which completes with the 480ms spatial expansion. The real detail content uses a temporary destination-layout stage, preventing continuous responsive reflow while the outer shell expands. Settings Close remains the closed-good geometry/measurement reference; only its Home restore trigger moved earlier.

## Motion Philosophy / Curve Foundation

CSS now owns the single canonical defaults for Enter, Exit, Standard, and Press. `MotionDefaults` owns family/property and semantic-role/family mappings and resolves the current computed curve for each WAAPI interaction; `main.js` no longer owns raw easing copies. This establishes a future Design Tuning override seam without changing any curve value, duration, choreography, or User Appearance persistence. Procedural background drift retains its accepted curve through an isolated local property, while Vela pulse and Reduced Motion boundaries remain unchanged.

The implemented BezierCurveField is the bounded generic cubic-bezier input described above. It does not add Design Tuning storage, Promote UI, Motion Settings, presets, or a general graph framework.
## Settings Information Architecture Foundation

The final 0.3.2 Settings shell is one root scroll composition containing independent CoreUI Disclosure categories for General, Appearance, Advanced, and Developer. It has no user-facing category destination cards or secondary category pages. General owns Language, Interface UI Scale, and Major View Motion Speed. Appearance owns Theme, Interface Appearance, Advanced Appearance Settings, Background, and the single Palette Library launcher. Advanced owns advanced application controls. Developer Access, Design Tuning, procedural calibration, and Labs each retain one owner behind Developer Mode. Background runtime and persistence remain domain-owned; Registry Control Lab, Settings Renderer Lab, and Procedural Appearance Lab remain real Developer Registry tools.

Vela is deliberately not registered as `settings/vela`. Its fixed gear opens a lazy Vela-owned modal and closing restores focus to that launch source. Global Settings owns no Vela category, mount, or route. Acknowledgement and Provider enablement/readiness remain session/runtime-only; qualification policy remains trusted internal authority.

Developer Mode remains a persistent visibility gate rather than a security boundary. Turning it off removes the Developer disclosure from the current stack without navigation, closing Settings, changing scroll ownership, or deleting calibration values. Palette Library remains a specialized workspace whose pane scrollers take ownership while open and whose exit restores the root scroll position. Existing Settings, Appearance, Background, Palette, and Vela stores retain their IDs and consumers; Design Tuning Store/Resolver, Motion tuning, and Promote-to-Default are not implemented.
# 0.3.2 Design Tuning Full Coverage

Calibration Authority Convergence formalizes `one semantic role → one calibration authority → all intended consumers`. Tool Detail and Global Settings now consume one Primary Work Surface radius authority while Section Card, Home identity, editable controls, pills, overlays, and protected transition roles remain separate. Editable calibration values are constrained only by intrinsic domain, runtime safety, or source-authority semantics; practical slider tracks are navigation aids and do not clamp typed, transient, persisted, or reloaded legal values. Calibration ranges are exploratory domains, not canonical recommendations, and canonical stylesheet values remain unchanged.

Design Tuning 已扩展为跨 Motion、Spacing、Radius、Controls/Geometry 与 Elevation 的校准工作区。五个单层 semantic elevation shadows 已通过通用 typed ShadowField 开放；Slider 与 Switch 手柄的独立 optical shadow 也在 Controls 域复用同一 ShadowField 开放校准，但继续归类为 Component Optical Presentation，不进入 Elevation。现有 Appearance/Typography 参数作为原 authority 的第二编辑入口，Design Tuning reset 不影响这些用户参数。Surface Transition identity radius 保持受保护只读。

Coverage Completion 现在由显式 semantic authority manifest 与 focused completeness test 约束：unclassified 为零，alias 记录 `derivedFrom`，unsupported/protected/intentional exclusion 必须给出原因。Motion 已覆盖全部 15 个 duration roles；新增的 Registry intro/header/copy、Palette field-control、Home card-title spacing 继续通过既有 typed length、UI Scale composition 与 transient real-consumer projection。Appearance calibration mirror 扩展到全部 21 项 user-adjustable visual authority，包括 interaction/action state colors，但绝不进入 Design Tuning Store。

七个 stylesheet-owned RGBA semantic authorities 现通过 generic CoreUI ColorField alpha mode 成为 typed Design Tuning parameters。Store 只保存 normalized structured color/alpha，canonical capture 和 projection 使用有限 RGBA parser/serializer；derived aliases 仍无独立 override。CoreUI Textarea 统一使用 shared editable-scroll presentation，Promotion Evidence、Palette JSON 与 Registry Textarea 不再显示 native resize grip，Palette list/editor intentional owners复用 `.ui-scroll-region`。

Editable surfaces now use a real outer clipping frame plus inner scroll owner, so scrollbar track/thumb/corner remain inside the rounded border. Native textarea resize chrome remains disabled, while CoreUI Textarea preserves its former vertical resize capability with a generic project grip and session-local geometry. Vela composer was the missed native-scroll owner; it now uses the same framed editable-scroll presentation while retaining its prior no-resize contract and independent Vela lifecycle.

The AE startup blocker after this convergence was a synchronous pre-host exception: Design Tuning Evidence construction referenced a nonexistent `getUiScale()` before `loadHost()`, leaving the initial Loading Tools placeholder untouched. The invalid call was removed because CSS already owns the scale-aware minimum height. A related Select renderer mount typo introduced while adopting `_coreFrame` was also restored to the legacy direct-element contract; only Textarea mounts its composition frame. A focused startup readiness test now executes the CoreUI Evidence prebuild and verifies that host bootstrap remains reachable.

Calibration UX 使用 parameter binding 增量刷新状态和 evidence，Disclosure、scroll 与无关字段 DOM 不因 commit/reset 被销毁。Appearance 原编辑器与 calibration mirror 通过共享 authority notification 同步，programmatic `setValue()` 不触发再次提交。
## Vela Settings Ownership Split

Vela Settings now opens lazily from the fixed lower-left button on Vela Surface. Global Settings owns no Vela category, mount, disclosure key or route, and no permanent `settings/vela` route exists. Endpoint and Model ID retain `AEToolbox.settings.v1`; acknowledgement, Provider enable/disable and readiness remain session/runtime-only projections; qualification and activation policy remain internal. Opening or closing the surface does not initialize, dispose or reset Vela conversation/runtime state.

The accepted presentation convergence uses one localized `Vela Settings` header, shared semantic spacing/typography/radius/surface/border/elevation and CoreUI controls. Its bounded modal enter/exit uses the existing View Content motion roles and one close lifecycle for button, backdrop and Escape; it does not introduce identity morph or Surface Transition ownership.

Surface Transition Foundation now applies to Home Tool Identity ↔ Tool Detail and Home Settings Identity ↔ Global Settings. Each transition snapshots the real target rect and computed identity presentation at transaction start, continuously converges the shell, establishes destination equivalence, and only then hands visibility back to the real element. CoreMotion and MotionDefaults retain lifecycle and timing authority; real Tool/Settings content retains destination layout, scroll and interaction ownership and is never scaled with the shell. Vela Settings remains an ordinary opacity/translate modal outside this foundation.

Identity visibility continuity keeps content opacity on the real content wrappers rather than the spatial carrier. Tool and Settings close now begin `viewContentExit` together with spatial contraction, mirroring the existing overlapping open reveal staging. Destination icon surrogates establish the recognizable identity while surface presentation converges; no whole-shell fade-to-zero is used as a handoff mask.

The choreography seam now derives reciprocal content windows from normalized spatial progress rather than independent consumer timers. Tool and Settings share the same suppression and destination-recognition phases. Close destination descriptors explicitly distinguish frame presentation, artwork projection, and the real Home owner so transparent procedural artwork cannot collapse the whole carrier into a visibility valley; canonical Motion durations/easings remain unchanged.

AE accepted the content exit choreography. The remaining Close-tail correction moves Tool and Settings destination surrogates to an app-shell transition identity layer, isolating their effective presentation from Home restore opacity and from the contracting shell's frame interpolation/clipping. Recognition now reaches a stable plateau before ownership transfers to the fully restored real Home target.

Appearance Runtime Stability now keeps authority-local preview/commit cleanup granular and persists Settings-backed Appearance values only after successful runtime resolution. Unrelated semantic overrides remain projected throughout preview, commit, reset, and rerender. Procedural background selection no longer depends on renderer survival: fallback is presentation-only, stale generations cannot present, and startup, Classic → Procedural activation, and explicit retry share one mount-aware activation lifecycle. The lifecycle refreshes selected config before invalidation on an existing runtime or fully initializes against current DOM after teardown/rerender, without clearing seed, palette, or parameters. Procedural Background is a persistent App Shell environment: Settings/Tool activity and Home content state do not suspend source generation or pixel presentation, and spatial transitions do not dim the environment through Home recede ownership. Explicit theme palette application additionally assigns the palette shadow to the existing Home Canvas authority while retaining manual override behavior between palette applications.

The manual diagnostic matrix identified frame-presentation interpolation as the primary Close visibility cause and established `freeze-frame` as the Golden Reference: retaining the source frame outperformed environment freeze and surrogate removal. A subsequent production-only carrier fade from recognition-established to handoff failed to reproduce that reference and has been removed. Production now matches the proven path: each real source shell retains its computed background/border/shadow and opacity throughout geometry/radius contraction, the independent layer owns destination recognition, and cleanup transfers ownership directly at destination-equivalent geometry. No canonical color, alpha, Motion duration/easing, Open path, content window, Home lifecycle, or Design Tuning authority changed.
