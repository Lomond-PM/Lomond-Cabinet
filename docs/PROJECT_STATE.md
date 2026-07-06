# PROJECT_STATE.md

## Current Project Overview

This is an After Effects CEP Extension panel. The visible UI title is **Lomond Cabinet**. The extension id and folder are still `com.kevin.aetoolbox`.

Current version candidate:

```text
0.2.2
```

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

### Registry Probe

Frontend source:

```text
Dynamic Tool Registry Phase 1
```

Host module:

```text
host/tools/registryProbe.tool.jsx
```

Purpose:

- Minimal test tool for dynamic `.tool.jsx` registration.
- Verifies host metadata, i18n merge, generic UI rendering, and `AEToolbox.runRegisteredToolAction(...)`.
- This is a Developer Mode-only sample registry tool and should not appear in the normal Home view.

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
AEToolbox.tools.adComponentKit.detachSelectedComponent()
```

Purpose:

- Build local ecommerce ad components without designing the whole composition.
- Feature Stack: selected text layers become centered pill rows.
- Icon Grid: selected 2D layers become normalized grid items.
- Uses layer comments as component metadata.

### Shape Add

Frontend tool id:

```text
shapeAdd
```

Host functions:

```js
shapeAdd_getState()
shapeAdd_add(matchName, key)
shapeAdd_createStrokeFillLayer(paramsJson)
```

Purpose:

- Add native Shape Layer content items using matchName.
- Resolve target as selected shape layer or selected group where possible.
- Create a linked Stroke / Fill Shape Layer with defaults and effect controls.

Migration status:

- Shape Add is now on the phased registry path for formal use.
- `host/tools/shapeAddProbe.tool.jsx` remains a Developer Mode-only probe for testing one rectangle action through registry action/state capability.
- `host/tools/shapeAdd.tool.jsx` now registers the formal `shapeAdd` registry tool for the 19 native shape item buttons.
- The registry tool reuses the legacy host execution functions instead of rewriting AE layer creation logic.
- The static Home card has been removed so Home resolves `shapeAdd` through the dynamic registry entry and still uses the same `toolId` for saved order.
- The Stroke / Fill Shape Layer subtool UI is now declared as registry sections using range, color, and full-width button fields.
- Stroke / Fill settings are grouped in a collapsible registry settings section under the create button and include a local reset defaults button for only those fields.
- Stroke / Fill creation still reuses the existing legacy host implementation and global wrapper path instead of rewriting AE layer creation logic.
- The old Shape Add detail DOM has been removed from `client/index.html`; obsolete frontend helper functions remain guarded until a later cleanup pass.

### More Tools

Home contains a disabled More Tools card. It is not an active tool.

### Quick Stack

`tools.quickStack.title` exists in i18n, but no active Home tool card or host module was found. Treat it as a reserved/unused label unless future code adds an implementation.

### ecommerceLayout.jsx

`host/tools/ecommerceLayout.jsx` still exists and is included by `host/index.jsx`. It exposes guide/template layout functions, but the active frontend Home card titled Ad Component Kit uses `adComponentKit.jsx` functions. Treat `ecommerceLayout.jsx` as preserved legacy/experimental host code unless explicitly reactivated.

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
- Developer Mode adds debug/probe/lab registry tools to Home:
  - Registry Control Lab
  - Registry Probe
  - Shape Add Probe
- Home background is procedural and configurable.
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

Legacy tools not migrated:

- Ad Component Kit.
- The preserved `ecommerceLayout.jsx` host module.

Legacy host implementations still reused by registry tools:

- Text Background Box / Background Rounded Rectangle keeps the legacy host creation implementation while using the registry metadata/detail path.
- Shape Add native item buttons keep the legacy host add implementation while using the registry metadata/detail path.
- Shape Add Stroke / Fill keeps the legacy host creation implementation while using registry metadata/detail sections for its parameters and action button.

### Shape Add Registry Migration Audit

Current decision:

- Shape Add native item buttons are on the registry path after the action/state capability work.
- Shape Add Stroke / Fill parameter UI is on the registry path, while host execution remains in the legacy `shapeAdd.jsx` module.
- Do not delete `host/tools/shapeAdd.jsx` or the global wrappers while registry Shape Add still reuses them.

Key risks:

- Static Home entry and dynamic registry tool with the same `shapeAdd` id can conflict; the current migration removes the static Home card.
- `HomeLayoutManager` saved order may be affected by replacing static entries with dynamic entries, so the migrated registry tool keeps the same `shapeAdd` id.
- Legacy detail panel and registry detail panel can coexist and conflict; the legacy panel is preserved but no longer opened for dynamic `shapeAdd`.
- Shape Add depends on `shapeAdd_getState()` and continuous host-state refresh.
- The 19 native shape item buttons require action payloads such as `key` and `matchName`.
- Button disabled state depends on host state.
- Host messages should move toward `messageKey` to avoid plain message/i18n/mojibake issues.
- Stroke / Fill host execution still depends on the preserved legacy implementation.

Recommended migration route:

1. Phase 1: core registry renderer action/state capability. Completed.
2. Phase 2: hidden `shapeAddProbe.tool.jsx`. Completed.
3. Phase 3: migrate one minimal action. Covered by the probe.
4. Phase 4: migrate the 19 native shape item buttons. Completed on the registry path.
5. Phase 5: migrate Stroke / Fill subtool UI to registry while reusing the legacy host action. Completed on the registry path.
6. Phase 6: remove or simplify remaining obsolete frontend helper code after AE verification.
7. Phase 7: remove legacy host wrappers only if no registered or global path uses them.

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
- Background Engine UI is schema-rendered, while `BackgroundEngine.applyPreset(...)`, `BackgroundEngine.save(...)`, and `BackgroundEngine.syncControls(...)` remain the behavior layer.
- A Developer Mode-only Settings Renderer Lab exists at `host/tools/settingsRendererLab.tool.jsx` for testing renderer capabilities before formal Settings migration.
- The target direction remains an app-level Settings Schema with phased production adoption after lab validation.
- Settings i18n remains core/global i18n and should stay in `client/js/i18n.js`.

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

Background Engine storage:

- Background Engine continues to use `AEToolbox.background.v1`.
- Background Engine collapse state continues to use `AEToolbox.backgroundSettingsCollapsed.v1`.
- The production UI is now generated from the Settings schema, but it preserves the existing `bgPreset`, color, range, switch, randomize, and reset control IDs so the existing `BackgroundEngine` behavior layer remains intact.

### i18n

- `client/js/i18n.js` owns dictionaries.
- `I18n.init()` is called before UI setup.
- `body.i18n-ready` is used to avoid visible pre-i18n flashes.
- Missing keys warn once in console.

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

## Known Issues / Areas To Watch

- `README.md` appears partially outdated and contains mojibake in some tree/menu examples. Do not rely on it as the current source of truth.
- `host/tools/ecommerceLayout.jsx` is included but likely not active in the current UI flow.
- Some host functions return `message` strings rather than `messageKey`; i18n coverage may be incomplete for host messages.
- `client/js/main.js` and `client/css/style.css` are large and have accumulated multiple iterations. Avoid broad rewrites.
- CEP/AE may cache old JS or JSX; always hard-refresh/reopen panel or restart AE when behavior does not match code.
- If a change appears to have no effect, confirm the active JS and host JSX path before editing algorithms.
- Shape Add is now on the phased registry path. Do not attempt a one-pass rewrite or remove the preserved legacy host actions; see `docs/KNOWN_ISSUES.md`.
- Deferred: Settings Background Engine preset dropdown can trigger a render/layout glitch after closing. See `docs/KNOWN_ISSUES.md`.
- Settings schema migration is phased. Do not replace remaining behavior layers such as `BackgroundEngine` without a dedicated migration and AE regression pass.

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

