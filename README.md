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
0.2.2
```

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
- Registry Probe
- Shape Add Probe

Ad Component Kit uses registry id `ecommerceLayout` for HomeLayout and storage compatibility, but its active host implementation is `host/tools/adComponentKit.jsx`.

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

- Add all user-visible text to `client/js/i18n.js`.
- Use `data-i18n` for static DOM text.
- Use `tr(...)` / `I18n.t(...)` for dynamic text.
- New tools should provide `titleKey` and `descriptionKey` in `ToolRegistry`.

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

