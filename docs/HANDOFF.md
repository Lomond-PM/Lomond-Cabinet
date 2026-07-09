# HANDOFF.md

## Purpose

This file explains how to package and continue development of the current AE CEP Toolbox project on another machine.

Before coding on the new machine, read:

```text
AGENTS.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

## Packaging Checklist

Before zipping or copying the project folder:

- Commit the intended handoff state first when possible.
- Confirm `git status --short --branch` is clean, or document why it is not.
- Confirm the root folder contains `CSXS/manifest.xml`.
- Include all of:
  - `client/`
  - `host/`
  - `CSXS/`
  - `docs/`
  - `AGENTS.md`
  - `README.md`
  - `.gitignore`
  - `CHANGELOG.md`
  - `VERSION`
- Do not include machine-specific temp files.
- Preserve folder name if possible:

```text
com.kevin.aetoolbox
```

- If testing in AE immediately after copying, restart AE or reload the CEP panel to avoid stale cached JS/JSX.

## Install Location On Another Machine

Windows recommended development path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox\
```

Example expanded path:

```text
C:\Users\<UserName>\AppData\Roaming\Adobe\CEP\extensions\com.kevin.aetoolbox\
```

macOS recommended development path:

```text
~/Library/Application Support/Adobe/CEP/extensions/com.kevin.aetoolbox/
```

The extension root must contain:

```text
CSXS/manifest.xml
```

## Version Management During Handoff

Before handoff:

1. Check the current version:

```text
VERSION
```

2. Confirm manifest version fields match `VERSION`:

```text
ExtensionBundleVersion
<Extension ... Version="...">
```

3. Confirm `CHANGELOG.md` has an entry for the current version.
4. Commit the handoff state.
5. Package only source and documentation, not runtime cache, archives, logs, or scratch files.

Current release-prep note:

- `VERSION` is `0.2.3`.
- `CHANGELOG.md` contains the `0.2.3` release entry for the registry migration / cleanup release.
- Do not create or move tags during documentation-only handoff work.

On a new machine:

1. Create a new development branch before coding:

```bash
git checkout -b dev
```

2. Ask Codex to read project docs before making changes.
3. Keep future version changes synchronized across `VERSION`, `CHANGELOG.md`, and `CSXS/manifest.xml`.

## Unsigned CEP Debug Mode

During development, unsigned CEP extensions usually require PlayerDebugMode.

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

## Open The Panel In After Effects

After copying the extension and restarting AE, open it from:

```text
Window > Extensions > AE Toolbox
```

Depending on AE version, it may appear under:

```text
Window > Extensions (Legacy) > AE Toolbox
```

The current visible panel title inside the UI is **Lomond Cabinet**. The manifest menu name is currently **AE Toolbox**.

## Suggested First Prompt For Codex On New Machine

Use this as the first prompt:

```text
请先阅读 AGENTS.md、docs/PROJECT_STATE.md、docs/DESIGN_SYSTEM.md、docs/HANDOFF.md，不要修改代码，先总结项目结构、当前工具、前端/host 调用路径和需要注意的风险。
```

## Suggested Workflow For Adding A Tool

1. Read `client/index.html`, `client/js/main.js`, `client/js/i18n.js`, `host/index.jsx`.
2. Add a Home card in `index.html`.
3. Add a `ToolRegistry` entry in `main.js`.
4. Add detail UI panels with `data-tool-panel`.
5. Add bottom action footer with `data-tool-actions` if needed.
6. Add i18n keys in both dictionaries.
7. Add parameter collection and event binding in `main.js`.
8. Add a host module in `host/tools/`.
9. Include it in `host/index.jsx`.
10. Return JSON strings from host functions.
11. Test active code path with a version/debug field if behavior does not change.

## Common Pitfalls

### AE Caches Old JSX

If a host change appears to have no effect:

- Confirm `host/index.jsx` includes the expected file.
- Confirm the panel re-ran `$.evalFile(...)`.
- Restart AE if needed.
- Add a temporary debug `version` field to the host return JSON.

### Browser Cache / CEP Cache

If CSS or JS changes do not appear:

- Update query string versions in `client/index.html`.
- Close and reopen the panel.
- Restart AE if needed.

### Do Not Load JSX In index.html

Bad:

```html
<script src="../host/index.jsx"></script>
```

Correct:

- `index.html` loads browser JS only.
- `main.js` loads host JSX with `CSInterface.evalScript()` and `$.evalFile(...)`.

### Host JSX Cannot Use Modern JS

Do not use:

- `let`
- `const`
- arrow functions
- `import` / `export`
- template literals
- optional chaining
- spread / destructuring

Use `var` and ExtendScript-compatible syntax.

### i18n Key Incomplete

When adding UI:

- Add English key.
- Add Simplified Chinese key.
- Add `data-i18n` or `tr(...)`.
- Check dynamic labels after language switch.

### Codex Overwrites Manual Tuning

Avoid broad rewrites of:

- `client/css/style.css`
- `client/js/main.js`
- user settings in `localStorage`
- visual constants
- motion constants

Make targeted patches.

### Modified The Wrong Function

This project has legacy or preserved functions, especially around ecommerce layout. If behavior does not change:

- Search event binding in `main.js`.
- Inspect the exact `evalScript` string.
- Confirm the host function name.
- Confirm `host/index.jsx` includes the expected module.
- Add a debug `version` in the returned JSON.

### Deferred Settings Dropdown Render Glitch

Settings Background Engine preset dropdown has a deferred render/layout glitch. The issue appears related to dropdown close state, popover cleanup, or Settings scroll container layout.

Do not claim this is fixed unless verified in AE. See:

```text
docs/KNOWN_ISSUES.md
```

### Deferred CEP Panel Close Freeze

Closing the plugin window could make After Effects appear frozen for several seconds to more than ten seconds in 0.2.3 and earlier. This is not fixed by the 0.2.3 release/tag.

The `dev` branch now contains a 0.2.4 development-line mitigation from `fix/panel-close-freeze-audit`. Current testing shows tool detail close behaving normally and Home close noticeably improved with little to no perceptible impact.

The mitigation added shutdown lifecycle guards, close-time `evalScript` / UI refresh guards, polling and timer cleanup, pending registry save cleanup, and Home close teardown. Do not remove those guards during unrelated cleanup.

Do not treat panel close freeze as a 0.2.3 blocker. Before a 0.2.4 release, run close regression across Home, Home Edit, Settings, Shape Add detail, Ad Component Kit detail, Developer Mode off, and Developer Mode on.

If close freezes return, start with instrumentation and a reproduction matrix by AE version, CEP version, active view, Developer Mode state, pending host call state, and Home edit/drag state. Re-audit remaining close-time work, CEP unload, pending `evalScript`, Home teardown, observers, listeners, custom select cleanup, registry polling, and localStorage writes before considering larger UI changes.

Do not opportunistically refactor `HomeLayoutManager`, Settings, BackgroundEngine, or App Launch / Close motion while working on close lifecycle follow-up.

### Color Picker Eyedropper Provider Notes

The `dev` branch contains a 0.2.4 development-line eyedropper implementation for the built-in color picker.

Current implementation:

- Color sampling is routed through the `ColorSampler` provider framework in `client/js/main.js`.
- Native `window.EyeDropper` exists in AE CEP, but current testing shows it immediately cancels instead of opening the system picker. The provider marks it unusable for the session.
- `WindowsHelperProvider` uses a Windows-only PowerShell / WinForms / Drawing helper under `helpers/win/eyedropper/`.
- Picked colors sync through the existing color picker setter path, updating Hex, preview, swatch, color plane, axis slider, H/S/V/R/G/B sliders, and the active color field.

Known MVP limitations:

- Windows taskbar may briefly flash while the helper overlay starts.
- Pressing Esc during the helper initialization delay may not cancel.
- After that delay window, Esc cancellation can still be unreliable in some AE / Windows focus states.
- These issues currently have lower priority because core cross-window picking works.

Future eyedropper work should focus on Windows helper overlay focus / activation / cancel lifecycle. A future C# / C++ helper can replace the PowerShell MVP behind the same `ColorSampler` provider interface. Do not change color picker UI, color model, H/S/V/R/G/B sliders, axis modes, Settings semantics, or registry field behavior as part of helper follow-up unless the task explicitly asks.

## Current Active Tool Bridge Summary

Text Background Box:

```js
AEToolbox.tools.textBackgroundBox.create(paramsJson)
```

Selection Info:

```js
AEToolbox.tools.selectionInfo.get()
```

Ad Component Kit:

```js
AEToolbox.tools.adComponentKit.createFeatureStack(paramsJson)
AEToolbox.tools.adComponentKit.createIconGrid(paramsJson)
AEToolbox.tools.adComponentKit.refreshSelectedComponent(paramsJson)
AEToolbox.tools.adComponentKit.selectComponentLayers()
AEToolbox.tools.adComponentKit.detachSelectedComponent()
```

Ad Component Kit migration note:

- The current registry/frontend id is `ecommerceLayout`.
- The active host implementation is `host/tools/adComponentKit.jsx`.
- The active registry schema is `host/tools/adComponentKit.tool.jsx`.
- The storage key remains `AEToolbox.ecommerceLayout.v1`.
- `host/tools/ecommerceLayout.jsx` was separately audited as unused legacy / experimental host code and removed.
- Keep the registry id `ecommerceLayout` unless a dedicated HomeLayout / storage migration is planned.
- Ad Component Kit is now one registry tool with Feature Stack, Icon Grid, and maintenance actions represented by tabs / option cards, state cards, and state-gated actions.
- The legacy Ad Component Kit detail DOM, action footer, frontend event binding, and unused component/ecom CSS have been removed.
- The static Home card is retained as the saved-order anchor for `ecommerceLayout`; registry metadata owns the active detail page and actions.
- A schema draft exists at `docs/schema-drafts/ad-component-kit.registry-schema-draft.md`.
- The obsolete `host/tools/adComponentKitProbe.tool.jsx` Developer Mode probe has been retired; use the formal `ecommerceLayout` registry tool for Ad Component Kit regression testing.

Shape Add:

```js
AEToolbox.runRegisteredToolAction("shapeAdd", actionId, paramsJson)
```

Shape Add / Shape Builder is the formal registry Home entry. The registry schema is `host/tools/shapeAdd.tool.jsx`, and active host behavior remains in `host/tools/shapeAdd.jsx`.

The old global wrappers `shapeAdd_getState()`, `shapeAdd_add(matchName, key)`, and `shapeAdd_createStrokeFillLayer(paramsJson)` have been removed after frontend cleanup. Do not add new client `evalScript` calls to those removed wrappers.

Shape Add frontend cleanup completed before 0.2.3:

- Legacy frontend adapter removed.
- Duplicate `shapeAdd.item.*` global i18n keys removed.
- Legacy Shape Add CSS removed except active Home/tool icon selectors.
- Registry number/range typing bug fixed so input is normalized on commit instead of on every keystroke.

Text Background Box:

- Active registry schema is `host/tools/textBackgroundBox.tool.jsx`.
- Active host behavior is `host/tools/textBackgroundBox.jsx`.
- Legacy frontend adapter has been removed.

Developer Mode-only registry tools are hidden from normal users and appear only when Settings > Developer Mode is enabled:

- Registry Control Lab
- Settings Renderer Lab

Retired temporary probes:

- `registryProbe`
- `shapeAddProbe`
- `adComponentKitProbe`
