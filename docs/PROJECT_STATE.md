# PROJECT_STATE.md

## Current Project Overview

This is an After Effects CEP Extension panel. The visible UI title is **Lomond Cabinet**. The extension id and folder are still `com.kevin.aetoolbox`.

Current project version:

```text
0.2.4
```

Current stable baseline:

```text
0.2.4 on main, tagged v0.2.4
```

Current development track:

```text
0.2.5 development has started on dev, beginning with Procedural Appearance Phase 1 Lab
```

`VERSION` and `CSXS/manifest.xml` remain at `0.2.4`. Do not change them for 0.2.5 development work until a dedicated release task updates release metadata.

Current 0.2.4 release status:

- `VERSION` is `0.2.4`.
- `CSXS/manifest.xml` declares `0.2.4`.
- No `package.json` version file is present in the current workspace.
- `CHANGELOG.md` contains the formal `0.2.4` section.
- Git state confirms tag `v0.2.4` exists and `main` contains it.
- 0.2.4 is the stable release baseline; do not describe it as still awaiting main/tag publication.

Current 0.2.5 procedural appearance status:

- Main design document: `docs/design/procedural-appearance.md`.
- Phase 1 Lab is implemented as a Developer Mode-only registry tool: `host/tools/proceduralAppearanceLab.tool.jsx`.
- Shared frontend engine skeleton: `client/js/proceduralAppearance.js`.
- Generic registry preview field: `proceduralPreview` in `client/js/main.js`.
- Preview contract helper: `client/js/proceduralPreviewContract.js`.
- Cache/DPR helper: `client/js/proceduralCache.js`.
- Curated palette library: `client/js/proceduralPaletteLibrary.js`.
- User palette store: `client/js/proceduralPaletteStore.js`.
- Home icon controller: `client/js/proceduralHomeIcons.js`.
- Scope remains deterministic procedural tool icons, optional theme-mapped recolor, and procedural background MVP.
- Default icon mode: colorful seed-based icons generated from stable tool ids.
- Theme changes must not regenerate icon identity.
- Colorful procedural icons are wired to production Home cards on the 0.2.5 development line. Stable `data-tool` / tool id is the only icon seed source.
- The current BackgroundEngine is not replaced, and procedural background production wiring is still future work.
- Procedural Appearance Phase 1 Lab has entered `dev`; 0.2.5 is no longer documentation-only planning.
- The registry preview contract is explicit: tools declare the preview engine, target field, seed field, and parameter keys instead of relying on hard-coded `target` / `seed` names or passing all registry values into the renderer.
- Procedural preview refreshes are dependency-scoped, batched per animation frame, cleaned up on tool/detail shutdown, and use safe fallback UI for missing engines, invalid input, or canvas/render failures.
- Procedural Appearance recipe cache is bounded with a 128-entry LRU; raster cache remains bounded at 24 entries.
- ProceduralAppearance exposes `clearCache()` and `getCacheStats()` for debug visibility without exposing mutable cache internals or writing cache state to storage.
- Render scale is derived from device pixel ratio with `clamp(DPR, 1, 2)`. DPR affects output raster resolution only, not recipe identity or cache keys.
- Home icon rendering is batched and uses existing ProceduralAppearance recipe/raster cache behavior; Home order, language, theme, and Developer Mode do not change icon identity.
- Procedural Appearance now supports fixed Apple-inspired `paletteId` values through a versioned Palette Library. These are curated project palettes, not Apple official palettes.
- The first palette library contains 8 fixed palettes: `pacificCyan`, `blueLavender`, `tealLuminous`, `mossGold`, `plumRose`, `slateIce`, `warmCoral`, and `graphiteSilver`.
- Home Colorful icons use a stable `toolId -> paletteId` mapping, with deterministic fallback for unmapped tools. The seed remains the stable tool id only.
- Procedural Appearance Lab can select `algorithmDefault` or any fixed palette. `algorithmDefault` preserves the existing algorithmic color path.
- Palette signatures are part of fixed-palette cache identity so palette content/version changes invalidate color recipes without changing geometry seed identity.
- Settings now includes a Palette Library editor. Factory palettes remain in source-controlled `proceduralPaletteLibrary.js`; user custom palettes, built-in overrides, hidden built-ins, and Home tool palette mappings persist under `lomond.proceduralPaletteStore.v1`.
- Palette Workspace runtime UI is now owned by `client/js/proceduralPaletteWorkspace.js`. `main.js` loads and initializes the controller, forwards Settings lifecycle/language/shutdown events, and supplies shared callbacks; it no longer owns Palette Workspace selected state, draft state, preview RAFs, resize/splitter listeners, transition timers, delete confirmation, import/export state, or CRUD UI binding.
- Palette Workspace boundaries: `proceduralPaletteStore.js` owns persistence, validation, resolved palettes, built-in overrides, custom palettes, and tool mappings; `proceduralPaletteEditor.js` owns pure draft/layout/number helpers; `proceduralPaletteWorkspace.js` owns DOM rendering, event binding, draft lifecycle, dirty guards, preview scheduling, Settings transitions, splitter width callbacks, Store subscription, and teardown.
- User palette display names do not participate in visual identity. Color, stop, weight, and guidance changes do affect resolved palette signatures.
- The Palette Store layer resolves factory defaults + built-in overrides + custom palettes for ProceduralAppearance and Home icons. It must not write back to source files.
- Palette Store storage key `lomond.proceduralPaletteStore.v1` and schema version remain unchanged by the Palette Workspace controller extraction.
- Theme-mapped recolor and production procedural background wiring are not implemented yet.
- File picker-based palette import/export is deferred; the current editor supports copy/paste JSON replace/merge.
- Eyedropper overlay lifecycle limitations remain known limitations and are not part of this workstream.

Confirmed entry points:

- CEP manifest: `CSXS/manifest.xml`
- Panel HTML: `client/index.html`
- Main frontend logic: `client/js/main.js`
- i18n dictionaries: `client/js/i18n.js`
- Host entry: `host/index.jsx`
- Host tool modules: `host/tools/*.jsx`
- Phase 1 registry tool modules: `host/tools/*.tool.jsx`

`manifest.xml` currently points `MainPath` to:

```text
./client/index.html
```

Host JSX is loaded by the frontend with `$.evalFile(...)`; `index.html` does not directly load JSX.

## Implemented Features

Confirmed from current code:

- CEP panel shell with Home view, Tool Detail view, Settings panel, and status pill.
- Custom black-gold UI.
- Custom select overlays replacing native select appearance.
- i18n support for English and Simplified Chinese.
- Home tool card ordering with drag/reorder and `localStorage` persistence.
- Settings persistence through `localStorage`.
- Procedural Home background controlled by CSS variables and settings UI.
- App Launch / Close morph transitions.
- Settings open / close transition.
- AE color picker integration through host JSX.

## Current Tool List

### Retired Developer Mode probes

The following temporary probe tools were removed before 0.2.3 after their validation value was replaced by formal tools or labs:

- `host/tools/registryProbe.tool.jsx`: early minimal registry registration / host communication proof of concept, superseded by Registry Control Lab.
- `host/tools/shapeAddProbe.tool.jsx`: Shape Add one-action probe, superseded by the formal `shapeAdd` registry tool.
- `host/tools/adComponentKitProbe.tool.jsx`: Ad Component Kit Feature Stack / Icon Grid probe, superseded by the formal `ecommerceLayout` registry tool.

### Text Background Box

Frontend tool id:

```text
textBackgroundBox
```

Host function:

```js
AEToolbox.tools.textBackgroundBox.create(paramsJson)
```

Purpose:

- Create shape backgrounds behind selected text layers.
- Uses selected text layer visual bounds and creation-time padding.
- Supports fill/stroke mode choices.
- Migrated to the `.tool.jsx` registry path in `host/tools/textBackgroundBox.tool.jsx`.
- The legacy host implementation remains in `host/tools/textBackgroundBox.jsx` and is reused by the registry action.
- Fill and Stroke are controlled by registry section-level toggles instead of using `None` as the primary enable switch.
- Registry field values and section UI state persist through the core renderer using `aeToolbox.registryToolValues.textBackgroundBox`.

### Registry Control Lab

Host module:

```text
host/tools/registryControlLab.tool.jsx
```

Purpose:

- Validate shared registry renderer controls.
- Includes a section-level toggle test panel for enable/collapse behavior.
- Uses shared registry value persistence to verify saved field and toggle state.
- Covers full-width button fields, primary/secondary variants, center-axis bilingual button text, tabs / option cards, and `visibleWhen` conditional fields.
- Covers action payloads, host state display, state-gated buttons/actions, after-run state refresh, and action-specific status fallbacks.
- This is a Developer Mode-only lab tool and should not appear in the normal Home view.

### Settings Renderer Lab

Host module:

```text
host/tools/settingsRendererLab.tool.jsx
```

Purpose:

- Developer Mode-only sandbox for testing future app-level Settings schema rendering.
- Uses the shared registry/core renderer to test select, checkbox/switch, range, number, color, button, and collapsible section behavior.
- Tests Background Engine-like preset select behavior without touching the production `BackgroundEngine`.
- Uses sandbox storage key `AEToolbox.settingsLab.v1`.
- Does not replace the production Settings panel or write production Settings storage keys.

### Selection Info

Frontend tool id:

```text
selectionInfo
```

Host function:

```js
AEToolbox.tools.selectionInfo.run(paramsJson)
```

Purpose:

- Inspect active comp selected layers.
- Return compact layer names, indexes, and type labels.
- Migrated to the `.tool.jsx` registry path in `host/tools/selectionInfo.tool.jsx`.

### Ad Component Kit

Frontend tool id:

```text
ecommerceLayout
```

Visible title:

```text
Ad Component Kit
```

Host module:

```text
host/tools/adComponentKit.jsx
```

Primary host functions:

```js
AEToolbox.tools.adComponentKit.createFeatureStack(paramsJson)
AEToolbox.tools.adComponentKit.createIconGrid(paramsJson)
AEToolbox.tools.adComponentKit.refreshSelectedComponent(paramsJson)
AEToolbox.tools.adComponentKit.selectComponentLayers()
AEToolbox.tools.adComponentKit.removeSelectedGeneratedComponent()
```

Purpose:

- Build local ecommerce ad components without designing the whole composition.
- Feature Stack: selected text layers become centered pill rows.
- Icon Grid: selected 2D layers become normalized grid items.
- Uses layer comments as component metadata.
- New Feature Stack / Icon Grid components created on the current dev line write removable Lomond artifact metadata with an `artifactId`.
- Ad Component Kit expressions written by the tool use a `LOMOND_CABINET_BINDING_V1` signature so cleanup can restore or clear only tool-owned expressions.

Migration status:

- Formally migrated to the `.tool.jsx` registry path in `host/tools/adComponentKit.tool.jsx`.
- Registry id remains `ecommerceLayout` to preserve saved Home order compatibility.
- Current active host module remains `host/tools/adComponentKit.jsx`; the registry action reuses that host logic instead of rewriting AE layer creation algorithms.
- `host/tools/ecommerceLayout.jsx` was audited as unused legacy / experimental host code and removed from `host/index.jsx`.
- Future id cleanup from `ecommerceLayout` to `adComponentKit` would require a separate HomeLayout / storage migration and is not part of the current structure.
- The frontend legacy Ad Component Kit detail DOM, action footer, event binding, and unused component/ecom CSS have been removed after AE verification.
- The static Home card is retained as the Home order anchor while dynamic registry metadata owns the detail page and actions for the same id.
- Feature Stack, Icon Grid, and maintenance actions live in one registry tool using tabs / option cards, `visibleWhen`, `stateAction`, `stateCard`, `enabledWhen` / `disabledWhen`, and `refreshStateAfterRun`.
- `Remove Selected Generated Component` removes only newly created artifacts that carry `LOMOND_CABINET_ARTIFACT_V1` metadata, and only cleans expressions carrying the matching `LOMOND_CABINET_BINDING_V1` signature.
- Cleanup is deliberately forward-only: it does not remove older Ad Component Kit output without Lomond artifact metadata and does not use layer-name heuristics.
- Registry UI now places Refresh Selected Component, Select Component Layers, and Remove Selected Generated Component directly below the active create button for Feature Stack or Icon Grid. The old separate Component Maintenance group is removed, and Detach Component is no longer exposed in the registry UI.
- The draft registry schema remains documented at `docs/schema-drafts/ad-component-kit.registry-schema-draft.md` as historical migration context.
- The obsolete `host/tools/adComponentKitProbe.tool.jsx` Developer Mode probe has been retired; the formal `ecommerceLayout` registry tool owns Feature Stack, Icon Grid, and maintenance action validation.

### Shape Add

Frontend tool id:

```text
shapeAdd
```

Host functions:

```js
AEToolbox.runRegisteredToolAction("shapeAdd", actionId, paramsJson)
```

The removed legacy global wrappers were:

```js
shapeAdd_getState()
shapeAdd_add(matchName, key)
shapeAdd_createStrokeFillLayer(paramsJson)
```

Do not add new client `evalScript` calls to those removed wrappers.

Purpose:

- Add native Shape Layer content items using matchName.
- Resolve target as selected shape layer or selected group where possible.
- Create a linked Stroke / Fill Shape Layer with defaults and effect controls.

Migration status:

- Shape Add is now on the phased registry path for formal use.
- The obsolete `host/tools/shapeAddProbe.tool.jsx` Developer Mode probe has been retired; the formal `shapeAdd` registry tool owns Shape Add action/state validation.
- `host/tools/shapeAdd.tool.jsx` now registers the formal `shapeAdd` registry tool for the 19 native shape item buttons.
- The registry tool reuses the legacy host execution functions instead of rewriting AE layer creation logic.
- The static Home card has been removed so Home resolves `shapeAdd` through the dynamic registry entry and still uses the same `toolId` for saved order.
- The Stroke / Fill Shape Layer subtool UI is now declared as registry sections using range, color, and full-width button fields.
- Stroke / Fill settings are grouped in a collapsible registry settings section under the create button and include a local reset defaults button for only those fields.
- Stroke / Fill creation still reuses the existing host implementation in `host/tools/shapeAdd.jsx` instead of rewriting AE layer creation logic.
- The legacy frontend adapter, duplicate `shapeAdd.item.*` global i18n keys, legacy Shape Add CSS, and old host global wrappers have been removed after AE testing.
- The Shape Add registry number/range input typing bug has been fixed; typed draft values are no longer forced to `1.0` during input.
- The old Shape Add detail DOM and obsolete frontend helper functions have been removed from the active frontend path.
- The Add Native Components / 添加原生组件 section is collapsible through the generic registry section collapse mechanism, and its collapse state is persisted by the registry renderer.
- This collapsible section does not change Shape Add host behavior or restore the old legacy frontend adapter.

### More Tools

Home contains a disabled More Tools card. It is not an active tool.

### Quick Stack

`tools.quickStack.title` exists in i18n, but no active Home tool card or host module was found. Treat it as a reserved/unused label unless future code adds an implementation.

### ecommerceLayout host id

`host/tools/ecommerceLayout.jsx` has been removed after audit. The active Ad Component Kit host behavior is `host/tools/adComponentKit.jsx`, while the registry id remains `ecommerceLayout` for saved Home order and storage compatibility.

## Current UI State

### Home

- Title: `Lomond Cabinet`.
- Header includes `Edit Home` and Settings buttons.
- Tool grid includes:
  - Text Background Box
  - Selection Info, when `host/tools/selectionInfo.tool.jsx` exists and host JSX loads successfully
  - Ad Component Kit
  - Shape Add, through `host/tools/shapeAdd.tool.jsx` when host registry loading succeeds
  - disabled More Tools
- Developer Mode adds retained lab/debug registry tools to Home:
  - Registry Control Lab
  - Settings Renderer Lab
- Home background is procedural and configurable.
- 0.2.5 planning proposes a new procedural appearance layer for full rounded-square app-like tool icons and a background language that visually relates to the icons while keeping generation logic separate.
- Home icon order is persisted with key:

```text
aeToolbox.homeToolOrder
```

### Tool Detail

- No `Tool 0x` overline is shown.
- Header includes Home/back button, tool title, and selection chip.
- Tool-specific panels are switched through `data-tool-panel`.
- Tool action footers are switched through `data-tool-actions`.
- Phase 1 registry tools use a generic dynamic detail panel and generic dynamic action footer.

## Tool Registry Phase 1

Current status:

- `host/index.jsx` provides `AEToolbox.registerTool(toolDef)`.
- `host/index.jsx` provides `AEToolbox.getRegisteredTools()`.
- `host/index.jsx` provides `AEToolbox.runRegisteredToolAction(toolId, actionId, paramsJson)`.
- Only files matching `host/tools/*.tool.jsx` are scanned automatically.
- Existing legacy files matching `host/tools/*.jsx` are not scanned dynamically and remain on the static include path.
- The frontend appends dynamic tools to Home without changing existing legacy tool cards.
- The generic dynamic renderer supports schema sections, `text`, `textarea`, `number`, `range`, `checkbox`, `select`, `color`, `info`, `divider`, `button` / `actionButton`, `tabs`, `visibleWhen`, section toggles, and action buttons.
- The registry renderer supports transient `actionPayload` on button/action schema entries.
- The registry renderer supports `stateAction` host state queries, runtime-only state storage, state-driven disabled buttons/actions, `stateCard`, and `refreshStateAfterRun`.

Legacy compatibility notes:

- The removed legacy `ecommerceLayout.jsx` host module is gone.
- The retained `ecommerceLayout` registry id and `AEToolbox.ecommerceLayout.v1` storage key are compatibility choices, not evidence of an active legacy frontend.

### Ad Component Kit Registry Migration Draft

Current decision:

- Keep Ad Component Kit as one registry tool with id `ecommerceLayout`.
- Do not split Feature Stack and Icon Grid into separate Home entries at this stage.
- Use `tabs` / option cards for `componentKind`.
- Use `visibleWhen` for Feature Stack and Icon Grid field groups.
- Use `stateAction` and `stateCard` to show active comp, selection count, valid text layer count, valid 2D layer count, and selected component controller type.
- Use `enabledWhen` / `disabledWhen` for create, refresh, select, and detach actions.
- Prefer preserving storage key `AEToolbox.ecommerceLayout.v1` during the first registry migration pass.
- Keep tool-specific i18n in the future `.tool.jsx`; leave common/global labels in `client/js/i18n.js`.

Do not delete the static Ad Component Kit Home card unless the replacement plan preserves `aeToolbox.homeToolOrder` behavior. The old Ad Component Kit detail panel and footer have already been removed; the active detail page is the registry renderer.

Host implementations still reused by registry tools:

- Text Background Box / Background Rounded Rectangle keeps the legacy host creation implementation while using the registry metadata/detail path.
- Shape Add native item buttons keep the legacy host add implementation while using the registry metadata/detail path.
- Shape Add Stroke / Fill keeps the legacy host creation implementation while using registry metadata/detail sections for its parameters and action button.

### Shape Add Registry Migration Audit

Current decision:

- Shape Add native item buttons are on the registry path after the action/state capability work.
- Shape Add Stroke / Fill parameter UI is on the registry path, while host execution remains in the legacy `shapeAdd.jsx` module.
- Do not delete `host/tools/shapeAdd.jsx`; it remains the active Shape Add host behavior module. The old global wrappers have already been removed.

Key risks:

- Static Home entry and dynamic registry tool with the same `shapeAdd` id can conflict; the current migration removes the static Home card.
- `HomeLayoutManager` saved order may be affected by replacing static entries with dynamic entries, so the migrated registry tool keeps the same `shapeAdd` id.
- Legacy detail panel and registry detail panel can coexist and conflict; the legacy panel is preserved but no longer opened for dynamic `shapeAdd`.
- Shape Add depends on registry `stateAction` host-state refresh through `AEToolbox.tools.shapeAdd.getRegistryState()`.
- The 19 native shape item buttons require action payloads such as `key` and `matchName`.
- Button disabled state depends on host state.
- Host messages should move toward `messageKey` to avoid plain message/i18n/mojibake issues.
- Stroke / Fill host execution still depends on the preserved legacy implementation.

Recommended migration route:

1. Phase 1: core registry renderer action/state capability. Completed.
2. Phase 2: hidden `shapeAddProbe.tool.jsx`. Completed; the temporary probe was later retired.
3. Phase 3: migrate one minimal action. Covered by the retired probe and then by the formal registry tool.
4. Phase 4: migrate the 19 native shape item buttons. Completed on the registry path.
5. Phase 5: migrate Stroke / Fill subtool UI to registry while reusing the legacy host action. Completed on the registry path.
6. Phase 6: remove or simplify remaining obsolete frontend helper code after AE verification. Completed.
7. Phase 7: remove legacy host wrappers after confirming no registered or global path uses them. Completed.

### Settings

Settings are opened from the Home header button.

Current categories:

- Language
- Motion
- UI scale
- Theme colors
- Procedural Background Engine

Settings are persisted with `localStorage`.

Current implementation status:

- Settings remains an app-level panel with a static shell in `client/index.html`.
- Settings behavior is still implemented in `client/js/main.js`.
- `BackgroundEngine` remains the authoritative runtime behavior for procedural background settings.
- Settings should not be treated as a normal registry tool.
- An app-level Settings schema exists at `client/js/settingsSchema.js`.
- `client/index.html` loads the schema so migrated production Settings sections can be rendered from data.
- Language, Developer Mode / `registryDebugTools`, Motion Speed, UI Scale, Theme colors, and Background Engine controls are currently connected to the production Settings UI through the schema renderer path.
- Settings internal content is rendered through `renderSettingsContent()` plus section renderers using the `settings-renderer` / `settings-section` / `settings-field` visual structure.
- The Settings renderer baseline has been restored to the stable path after the failed visual-unification attempt.
- The outer Settings morph shell remains in `client/index.html` and still uses `#settingsView`, `.settings-panel`, `.settings-ui-layer`, and `.settings-content`.
- Background Engine UI is schema-rendered, while `BackgroundEngine.applyPreset(...)`, `BackgroundEngine.save(...)`, and `BackgroundEngine.syncControls(...)` remain the behavior layer.
- A Developer Mode-only Settings Renderer Lab exists at `host/tools/settingsRendererLab.tool.jsx` for testing renderer capabilities before formal Settings migration.
- The target direction remains an app-level Settings Schema with phased production adoption after lab validation.
- Settings i18n remains core/global i18n and should stay in `client/js/i18n.js`.
- Settings is not a normal registry tool. Treat it as an app-level core settings framework with behavior adapters for existing storage and `BackgroundEngine`.

Current Settings storage:

- `AEToolbox.settings.v1`
- `AEToolbox.background.v1`
- `AEToolbox.backgroundSettingsCollapsed.v1`
- `aeToolbox.language`

Draft future Settings storage:

- `AEToolbox.settings.v2`

The v2 key is documented only. Runtime code still writes to the v1 and background legacy keys.

Developer Mode storage:

- Developer Mode continues to use `AEToolbox.settings.v1.registryDebugTools` for compatibility with existing user settings.
- It controls debug/probe/lab tool visibility generically through `window.AETOOLBOX_DEBUG_REGISTRY`.

Language storage:

- Language continues to use `aeToolbox.language` through the existing `I18n.setLanguage(...)` path.
- Changing language still refreshes Home labels, Settings copy, active tool detail, registry tool fields/actions, and custom select labels.

Motion / UI Scale storage:

- Motion Speed and UI Scale continue to use `AEToolbox.settings.v1`.
- Existing `setupMotionSpeed()`, `setupUiScale()`, `applyUiScale(...)`, and `linkPersistedRange(...)` behavior remains in place.

Theme color storage:

- Theme colors continue to use `AEToolbox.settings.v1`.
- Existing `applyThemeAccent(...)`, `applyHomeBackground(...)`, `applyToolIconTheme(...)`, `setupColorControls()`, and AE host color picker behavior remain in place.
- The built-in registry/settings color picker on `dev` now uses a `ColorSampler` provider framework for eyedropper sampling.
- Native `window.EyeDropper` is detected as a provider, but current AE CEP testing shows it immediately cancels; the provider marks itself unusable for the session and falls through to the Windows helper provider.
- `WindowsHelperProvider` is a Windows-only MVP using a PowerShell / WinForms / Drawing helper. It can sample colors across windows and synchronizes picked colors through the existing color setter path for Hex, preview, swatch, color plane, axis slider, and H/S/V/R/G/B channel sliders.
- The ColorSampler provider boundary is intended to allow a future C# / C++ native helper replacement without changing color picker UI, color model, sliders, or registry field integration.
- The 0.2.4 color picker control work also includes H / S / V / R / G / B axis modes, H / S / V / R / G / B channel sliders, Hex input click / focus select-all, and popup flip / clamp positioning near panel edges.

Background Engine storage:

- Background Engine continues to use `AEToolbox.background.v1`.
- Background Engine collapse state continues to use `AEToolbox.backgroundSettingsCollapsed.v1`.
- The production UI is now generated from the Settings schema, but it preserves the existing `bgPreset`, color, range, switch, randomize, and reset control IDs so the existing `BackgroundEngine` behavior layer remains intact.

### i18n

- `client/js/i18n.js` owns dictionaries.
- `I18n.init()` is called before UI setup.
- `body.i18n-ready` is used to avoid visible pre-i18n flashes.
- Missing keys warn once in console.
- i18n cleanup now uses the generated report as the safety gate before 0.2.3. Use `scripts/report-i18n-usage.js` to generate `docs/reports/i18n-usage-report.md`.
- Do not bulk-delete `client/js/i18n.js` keys. Registry tool copy should live in each `host/tools/*.tool.jsx`, but `client/js/i18n.js` still owns core/global/Settings/Home/fallback copy.
- Low-risk duplicate cleanup has already removed confirmed migrated tool keys, including Text Background Box / Selection Info title duplicates, Shape Add `shapeAdd.item.*` duplicates, and final global tool title fallback duplicates for Shape Add and Ad Component Kit.
- Deferred keys must not be mechanically deleted. The next cleanup pass should start from the generated report, then verify AE startup, Home fallback, tool detail rendering, and language switching.

## Current Motion State

The `Motion` object in `client/js/main.js` defines:

```js
appleOut
appleStandard
appleIn
press
fast
normal
launch
close
```

Motion speed is user-adjustable in Settings and affects durations through `duration(name)`.

Confirmed motion systems:

- Home to tool App Launch morph transition.
- Tool Close transition back to Home.
- Settings open / close morph transition.
- Hover and press states.
- Status pill updates.
- Animation warmup probe.

Known constraint:

- App Launch / Close has been sensitive to flicker and misplaced transient elements. Do not modify this code casually.

## Important Issues Previously Addressed

These are based on current code and recent project history. Verify visually after major changes.

- Startup first-frame or i18n flash: current code uses `i18n-ready`.
- App Launch / Close end-frame jumps: current code contains dedicated finish/cleanup logic and animation state handling.
- Home icon drag jitter: current code uses placeholder/floating drag item behavior.
- Feature Stack coordinate issues: current host code uses controller/component logic and metadata.
- Icon Grid active path diagnosis: current host code returns version data for icon grid.
- Native select appearance: current code uses custom select overlays appended to `body`.
- Shape Add text alignment: current CSS aligns native shape item buttons around a fixed center axis.
- Home Edit toggle flow: current code uses `HomeLayoutManager.isEditing`; the first click enters edit mode and Done saves the layout.
- CEP panel close freeze mitigation: `fix/panel-close-freeze-audit` has been merged to `dev` for the 0.2.4 development line. The mitigation adds shutdown lifecycle guards, stops polling / timers / pending registry saves, guards close-time host/UI refresh work, and adds Home close teardown. This is not part of v0.2.3.
- Built-in color picker eyedropper: `dev` contains the ColorSampler provider framework and Windows-only helper MVP. Native `window.EyeDropper` is not usable in current AE CEP testing because it immediately cancels, so the Windows helper is the current working provider.
- Windows eyedropper overlay lifecycle follow-up: an attempt to remove the remaining taskbar flash / first-run Esc / right-click menu limitations was tested and rolled back because it did not meet the required stability. Those fixes are not included in 0.2.4; the previously verified Windows helper MVP remains the 0.2.4 behavior.

## Known Issues / Areas To Watch

- `README.md` appears partially outdated and contains mojibake in some tree/menu examples. Do not rely on it as the current source of truth.
- The Ad Component Kit registry id remains `ecommerceLayout` even though the old `host/tools/ecommerceLayout.jsx` module has been removed. Do not rename the id without a dedicated storage and HomeLayout migration.
- Some host functions return `message` strings rather than `messageKey`; i18n coverage may be incomplete for host messages.
- `client/js/main.js` and `client/css/style.css` are large and have accumulated multiple iterations. Avoid broad rewrites.
- CEP/AE may cache old JS or JSX; always hard-refresh/reopen panel or restart AE when behavior does not match code.
- If a change appears to have no effect, confirm the active JS and host JSX path before editing algorithms.
- Shape Add is now on the phased registry path. Do not attempt a one-pass rewrite or remove the preserved legacy host actions; see `docs/KNOWN_ISSUES.md`.
- Deferred: Settings Background Engine preset dropdown can trigger a render/layout glitch after closing. See `docs/KNOWN_ISSUES.md`.
- Settings schema migration is phased. The internal UI shell is now on the Settings Renderer path, but do not replace remaining behavior layers such as `BackgroundEngine` without a dedicated migration and AE regression pass.
- 0.2.4 stable baseline: closing the CEP panel has been noticeably mitigated after `fix/panel-close-freeze-audit`; tool detail close is behaving normally in current testing and Home close has little to no perceptible impact. Continue monitoring across AE / CEP environments.
- Color picker eyedropper helper limitations: the current Windows helper may briefly flash the Windows taskbar during sampling, first-run Esc cancellation can be unreliable, and right-click cancel may show the CEP WebView context menu. These are lower-priority MVP limitations unless they begin to affect core pick success.
- 0.2.5 procedural appearance development: Phase 1 Lab has entered `dev`. Tool icons should be generated from stable `toolId` / hash seeds; theme color changes should not regenerate icon structure; theme-mapped mode should recolor without destroying per-tool visual memory.

## 0.2.5 Procedural Appearance Plan

Detailed plan:

```text
docs/design/procedural-appearance.md
```

Planned scope:

- Deterministic procedural icon engine. Phase 1 skeleton is implemented in `client/js/proceduralAppearance.js`.
- Seed / hash / deterministic random helpers. Phase 1 uses stable hash and seeded PRNG; uncontrolled `Math.random()` is not used.
- Colorful default palette generation.
- Optional theme-mapped recolor mode.
- Procedural Home background MVP with related visual language but separate generation logic.
- Developer Mode preview / lab before production Home wiring. Phase 1 Lab is now available only when Developer Mode tools are visible.

Deterministic rule:

```text
engineVersion + target + seed + normalizedParams -> same output
```

Lab cache rule:

```text
engineVersion + target + seed + normalizedParams
```

Current boundaries:

- Colorful procedural Home icons are connected through `client/js/proceduralHomeIcons.js`.
- The Lab does not replace the existing BackgroundEngine.
- Tool icon previews do not overlay letters or abbreviations.
- Background target previews can use a manual seed.
- The Lab preview renderer does not pass unrelated UI, language, or state fields to the procedural engine.
- The preview contract and fallback work did not modify `client/js/proceduralAppearance.js`, the engine version, seed hashing, palette/warp/ribbon/grain/noise logic, or deterministic snapshots.
- Cache/DPR work preserves the procedural visual algorithm and deterministic recipe snapshots. It does not connect generated previews to production Home icons or replace `BackgroundEngine`.
- Home icon wiring reuses the existing engine without changing recipe fields, `engineVersion`, seed hashing, palette, warp, ribbon, grain/noise, or deterministic snapshots. It does not implement theme-mapped recolor or procedural background production mode.

Suggested implementation branches:

1. `feature/procedural-appearance-lab` - Phase 1 Developer Mode Lab and engine skeleton.
2. `feat/procedural-home-icons` - connect generated icons to Home after Lab validation.
3. `feat/procedural-icon-theme-map` - optional theme-mapped recolor mode.
4. `feat/procedural-background-mvp` - procedural background optional mode while preserving BackgroundEngine.
5. `docs/update-procedural-appearance-state` - document tested behavior and remaining limitations.

Non-goals:

- Do not modify color picker / eyedropper behavior as part of this workstream.
- Do not continue Windows eyedropper overlay lifecycle fixes here.
- Do not modify Ad Component Kit cleanup or Shape Add host behavior.
- Do not rewrite BackgroundEngine in the first pass.
- Do not introduce transparent glass UI or dot/line decorative icon styles.

## 0.2.4 Release Baseline

0.2.4 has been merged to `main` and tagged `v0.2.4`. Use it as the stable baseline while 0.2.5 development proceeds on `dev`.

Baseline checks:

1. `VERSION` is `0.2.4`.
2. `CSXS/manifest.xml` `ExtensionBundleVersion` and extension `Version` are `0.2.4`.
3. No `package.json` version file exists in the current workspace.
4. `CHANGELOG.md` has the final `0.2.4` section.
5. Git tag `v0.2.4` exists and is contained by `main`.

For future releases, create a dedicated release branch and update `VERSION`, `CSXS/manifest.xml`, and release notes only when explicitly requested.

## Later Development Suggestions

- Keep new tools small and isolated before expanding UI.
- Prefer adding focused helper functions over refactoring the full `main.js`.
- For host tools, add debug `version` fields during algorithm changes until active path is confirmed.
- Continue using matchName in host JSX.
- Prefer component-local layouts for AE generated components when practical.
- Keep user-adjusted settings and defaults persistent.

## Continue Development On Another Machine

1. Copy the entire `com.kevin.aetoolbox/` folder.
2. Place it in the CEP extensions directory.
3. Enable unsigned CEP extension debug mode.
4. Restart After Effects.
5. Open the panel from the Window menu.
6. Ask Codex to read:

```text
AGENTS.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

before modifying code.

## CEP Install Paths

Windows:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox\
```

macOS:

```text
~/Library/Application Support/Adobe/CEP/extensions/com.kevin.aetoolbox/
```

The extension root must contain `CSXS/manifest.xml`.

