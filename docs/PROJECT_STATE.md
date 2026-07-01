# PROJECT_STATE.md

## Current Project Overview

This is an After Effects CEP Extension panel. The visible UI title is **Lomond Cabinet**. The extension id and folder are still `com.kevin.aetoolbox`.

Confirmed entry points:

- CEP manifest: `CSXS/manifest.xml`
- Panel HTML: `client/index.html`
- Main frontend logic: `client/js/main.js`
- i18n dictionaries: `client/js/i18n.js`
- Host entry: `host/index.jsx`
- Host tool modules: `host/tools/*.jsx`

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

### Selection Info

Frontend tool id:

```text
selectionInfo
```

Host function:

```js
AEToolbox.tools.selectionInfo.get()
```

Purpose:

- Inspect active comp selected layers.
- Return compact layer names, indexes, and type labels.

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
  - Selection Info
  - Ad Component Kit
  - Shape Add
  - disabled More Tools
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

### Settings

Settings are opened from the Home header button.

Current categories:

- Language
- Motion
- UI scale
- Theme colors
- Procedural Background Engine

Settings are persisted with `localStorage`.

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

## Known Issues / Areas To Watch

- `README.md` appears partially outdated and contains mojibake in some tree/menu examples. Do not rely on it as the current source of truth.
- `host/tools/ecommerceLayout.jsx` is included but likely not active in the current UI flow.
- Some host functions return `message` strings rather than `messageKey`; i18n coverage may be incomplete for host messages.
- `client/js/main.js` and `client/css/style.css` are large and have accumulated multiple iterations. Avoid broad rewrites.
- CEP/AE may cache old JS or JSX; always hard-refresh/reopen panel or restart AE when behavior does not match code.
- If a change appears to have no effect, confirm the active JS and host JSX path before editing algorithms.

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

