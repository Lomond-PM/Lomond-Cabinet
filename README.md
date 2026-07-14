# Lomond Cabinet / AE Toolbox

Lomond Cabinet is an After Effects CEP Extension panel for building and maintaining AE utility tools. The extension bundle id remains:

```text
com.kevin.aetoolbox
```

The current manifest menu name is:

```text
AE Toolbox
```

Current project version:

```text
0.2.5
```

Current release track:

```text
0.2.5 is the current release candidate. 0.2.4 remains the stable main baseline and the `v0.2.4` tag exists on `main`. The `v0.2.5` tag has not been created or published.
```

This release-preparation branch updates `VERSION` and `CSXS/manifest.xml` to 0.2.5. Do not create or move a release tag until the manual release checks are complete.

## Project Type

This is an **After Effects CEP Extension**.

- Frontend: HTML, CSS, and browser JavaScript.
- Host logic: ExtendScript / JSX.
- Bridge: `CSInterface.evalScript()`.
- Host JSX loading: `$.evalFile(...)` from `client/js/main.js`.

`client/index.html` must not directly load `.jsx` files.

## Directory Structure

```text
com.kevin.aetoolbox/
  CSXS/
    manifest.xml
  client/
    index.html
    css/
      style.css
    js/
      main.js
      i18n.js
      lib/
        CSInterface.js
  host/
    index.jsx
    aeUtils.jsx
    effectUtils.jsx
    shapeUtils.jsx
    tools/
      textBackgroundBox.jsx
      selectionInfo.jsx
      adComponentKit.jsx
      shapeAdd.jsx
  docs/
    PROJECT_STATE.md
    DESIGN_SYSTEM.md
    HANDOFF.md
  AGENTS.md
  CHANGELOG.md
  VERSION
  README.md
```

## Current Tools

Confirmed active frontend tools:

- Background Rounded Rectangle / Text Background Box
- Selection Info
- Ad Component Kit
- Shape Add / Shape Builder

The Home view also contains a disabled More Tools card.

Developer Mode tools are hidden from the normal Home view and appear only when the Developer Mode setting is enabled:

- Registry Control Lab
- Settings Renderer Lab

Temporary probes retired before 0.2.3:

- Registry Probe
- Shape Add Probe
- Ad Component Kit Probe

Ad Component Kit uses registry id `ecommerceLayout` and storage key `AEToolbox.ecommerceLayout.v1` for HomeLayout and storage compatibility, but its active schema and host implementation are:

```text
host/tools/adComponentKit.tool.jsx
host/tools/adComponentKit.jsx
```

The legacy `host/tools/ecommerceLayout.jsx` module has been removed. If the tool is ever renamed from `ecommerceLayout` to `adComponentKit`, that must be a dedicated HomeLayout and storage migration.

## Installation

CEP extensions do not go in After Effects `Scripts` or `ScriptUI Panels`.

Windows development install path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox\
```

macOS development install path:

```text
~/Library/Application Support/Adobe/CEP/extensions/com.kevin.aetoolbox/
```

The extension root must contain:

```text
CSXS/manifest.xml
```

Restart After Effects after copying the extension folder.

Open the panel from:

```text
Window > Extensions > AE Toolbox
```

Depending on AE version, it may appear under:

```text
Window > Extensions (Legacy) > AE Toolbox
```

## Unsigned CEP Debug Mode

During development, enable PlayerDebugMode for the relevant CSXS version.

Windows PowerShell examples:

```powershell
reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add HKCU\Software\Adobe\CSXS.13 /v PlayerDebugMode /t REG_SZ /d 1 /f
```

macOS examples:

```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
defaults write com.adobe.CSXS.13 PlayerDebugMode 1
```

Restart After Effects after changing this setting.

## Development Workflow

Recommended development loop:

1. Read `AGENTS.md` and the docs under `docs/`.
2. Check current git status.
3. Make focused changes.
4. If CSS or browser JS changes do not appear, update the query string version in `client/index.html`.
5. If host JSX changes do not appear, reopen the panel or restart AE.
6. Keep frontend and host responsibilities separate.
7. Update `CHANGELOG.md` when adding or changing user-facing behavior.

## Frontend / Host Boundary

Frontend files:

- `client/index.html`
- `client/css/style.css`
- `client/js/main.js`
- `client/js/i18n.js`

Frontend responsibilities:

- UI rendering and interaction.
- Motion and view state.
- Settings and localStorage persistence.
- i18n.
- Parameter collection.
- Calling host JSX through `CSInterface.evalScript()`.

Host files:

- `host/index.jsx`
- `host/tools/*.jsx`
- `host/aeUtils.jsx`
- `host/effectUtils.jsx`
- `host/shapeUtils.jsx`

Host responsibilities:

- After Effects comp, layer, effect, and property operations.
- Shape Layer creation and manipulation.
- ExtendScript-compatible JSON string responses.

Host JSX must remain ExtendScript-compatible. Do not use modern JavaScript syntax in `host/`.

## i18n

Supported languages:

- `en`
- `zh-CN`

Rules:

- Core, Home, Settings, common, and fallback copy belongs in `client/js/i18n.js`.
- Registry tool-specific copy belongs in the owning `host/tools/*.tool.jsx` `i18n` block.
- Use `data-i18n` for static DOM text.
- Use `tr(...)` / `I18n.t(...)` for dynamic text.
- Registry tools should provide `titleKey` and `descriptionKey` in their tool definition.
- Before deleting old global keys, run `node scripts/report-i18n-usage.js` and review `docs/reports/i18n-usage-report.md`.

## Registry Architecture

Current principle:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

Registry tools live in `host/tools/*.tool.jsx`. They declare metadata, sections, fields, actions, state actions, state cards, and tool-local i18n. They should not add dedicated DOM, dedicated CSS, or custom renderer behavior.

Settings is not a registry tool. It is an app-level core settings framework. The Settings shell and behavior remain app-owned, while migrated rows are rendered from the app-level Settings schema.

Current migrated registry tools:

- `shapeAdd`: Shape Add / Shape Builder, including 19 native shape items and Stroke / Fill layer creation.
- `textBackgroundBox`: Text Background Box / Text Plate.
- `selectionInfo`: Selection Info.
- `ecommerceLayout`: Ad Component Kit, including Feature Stack, Icon Grid, and maintenance actions.

Current Developer Mode labs:

- `registryControlLab`: registry renderer/action/state validation.
- `settingsRendererLab`: app-level Settings renderer validation.
- `proceduralAppearanceLab`: deterministic procedural icon/background engine validation for 0.2.5.

Current 0.2.4 release highlights:

- Panel close freeze mitigation through shutdown guards, polling / timer cleanup, and Home close teardown.
- Built-in color picker H / S / V / R / G / B axis modes, channel sliders, Hex input select-all, and popup flip / clamp positioning.
- ColorSampler provider framework with Windows-only eyedropper helper MVP. Native `window.EyeDropper` exists in AE CEP but immediate-cancels in current testing, so the Windows helper is the working provider.
- Ad Component Kit removable artifacts for newly created Feature Stack / Icon Grid output using Lomond metadata and signed tool expressions.
- Shape Add Add Native Components / 添加原生组件 section collapse.

0.2.4 has been published to `main` and tagged `v0.2.4`. The 0.2.5 release candidate includes the Procedural Appearance Lab, production Colorful and Theme-mapped Home icons, and optional procedural Home background support while preserving the classic BackgroundEngine fallback.

## Continue Development On Another Machine

Copy the full folder:

```text
com.kevin.aetoolbox/
```

to the CEP extensions directory on the new machine.

Then ask Codex to read:

```text
AGENTS.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

before making code changes.

Recommended first prompt:

```text
请先阅读 AGENTS.md、docs/PROJECT_STATE.md、docs/DESIGN_SYSTEM.md、docs/HANDOFF.md，不要修改代码，先总结项目结构。
```

## Version Management

Project version is stored in:

```text
VERSION
```

CEP manifest version fields should stay synchronized with `VERSION`:

- `ExtensionBundleVersion`
- `<Extension ... Version="...">`

Document user-facing changes in:

```text
CHANGELOG.md
```

Before packaging a handoff build:

1. Confirm `VERSION`, `CHANGELOG.md`, and `CSXS/manifest.xml` agree.
2. Confirm `git status` is clean or intentionally documented.
3. Include `.gitignore`, `README.md`, `CHANGELOG.md`, `VERSION`, `AGENTS.md`, and `docs/`.

