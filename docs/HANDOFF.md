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

Current release baseline note:

- `VERSION` is `0.2.4`.
- `CSXS/manifest.xml` is `0.2.4`.
- `CHANGELOG.md` contains the formal `0.2.4` release section.
- Git state confirms `v0.2.4` exists and is contained by `main`.
- Treat 0.2.4 as the stable main baseline.
- Do not create or move tags during documentation-only handoff work.

Current 0.2.5 development note:

- Procedural Appearance Phase 1 Lab has entered `dev`.
- Main plan: `docs/design/procedural-appearance.md`.
- Phase 1 adds a Developer Mode-only Lab and shared procedural engine skeleton.
- The 0.2.5 development line also includes Colorful Home icons and a fixed Apple-inspired Palette Library. These palettes are curated project palettes, not Apple official palettes.
- Home icon seed identity remains stable tool id only. `paletteId` controls fixed color selection and must not be derived from language, title, Home order, theme color, or UI Scale.
- `algorithmDefault` keeps the existing procedural color path; theme-mapped palettes, user-editable palettes, and production procedural background wiring are still future work.
- Do not change `VERSION`, `CSXS/manifest.xml`, helper scripts, color picker, Ad Component Kit, Shape Add, or production Settings semantics in this workstream.
- 0.2.5 should continue from the 0.2.4 stable feature line and focus on deterministic procedural icons and a procedural background MVP.
- Do not continue Windows eyedropper overlay lifecycle fixes in this workstream; those limitations remain documented known issues.

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

Default to the registry-first path for ordinary new tools:

1. Create `host/tools/<toolId>.tool.jsx`.
2. Register the tool with `AEToolbox.registerTool(toolDef)`.
3. Put tool metadata, schema, actions, state declarations, and tool-local i18n in the `.tool.jsx` file.
4. Let the core registry renderer own DOM, control behavior, status display, persistence, and action execution.
5. Put AE execution logic in `host/tools/<toolId>.jsx` when the tool needs host behavior, then call it through registry actions.
6. Return JSON strings from host functions, preferably with `ok`, `messageKey`, and structured details.
7. If a UI capability is missing, add it as a generic registry renderer capability before using it in the tool schema.
8. Test the active code path in AE; add temporary debug result fields only while confirming routing.

Ordinary registry tools must not default to:

- Dedicated Home card DOM.
- Dedicated detail page DOM.
- Dedicated CSS.
- Dedicated frontend event binding.
- Direct `localStorage` writes.
- Bypassing `AEToolbox.runRegisteredToolAction(...)` for normal actions.

Static Home anchors are only for explicit compatibility needs during legacy migration, such as preserving saved Home order, storage ids, or a known startup fallback path.

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

The 0.2.4 release line contains the mitigation from `fix/panel-close-freeze-audit`. Current testing shows tool detail close behaving normally and Home close noticeably improved with little to no perceptible impact.

The mitigation added shutdown lifecycle guards, close-time `evalScript` / UI refresh guards, polling and timer cleanup, pending registry save cleanup, and Home close teardown. Do not remove those guards during unrelated cleanup.

Do not treat panel close freeze as a 0.2.3 blocker. Before a 0.2.4 release, run close regression across Home, Home Edit, Settings, Shape Add detail, Ad Component Kit detail, Developer Mode off, and Developer Mode on.

If close freezes return, start with instrumentation and a reproduction matrix by AE version, CEP version, active view, Developer Mode state, pending host call state, and Home edit/drag state. Re-audit remaining close-time work, CEP unload, pending `evalScript`, Home teardown, observers, listeners, custom select cleanup, registry polling, and localStorage writes before considering larger UI changes.

Do not opportunistically refactor `HomeLayoutManager`, Settings, BackgroundEngine, or App Launch / Close motion while working on close lifecycle follow-up.

### Color Picker Eyedropper Provider Notes

The 0.2.4 release line contains the eyedropper implementation for the built-in color picker.

Current implementation:

- Color sampling is routed through the `ColorSampler` provider framework in `client/js/main.js`.
- Native `window.EyeDropper` exists in AE CEP, but current testing shows it immediately cancels instead of opening the system picker. The provider marks it unusable for the session.
- `WindowsHelperProvider` uses a Windows-only PowerShell / WinForms / Drawing helper under `helpers/win/eyedropper/`.
- Picked colors sync through the existing color picker setter path, updating Hex, preview, swatch, color plane, axis slider, H/S/V/R/G/B sliders, and the active color field.

Known MVP limitations:

- Windows taskbar may briefly flash while the helper overlay starts.
- Each new plugin session's first Pick may have unreliable Esc cancellation.
- Right-click cancel may still invoke the CEP WebView default context menu.
- These issues currently have lower priority because core cross-window picking works.

Recent lifecycle note:

- A focused attempt to fix the remaining Windows helper taskbar flash / first-run Esc / right-click menu behavior was tested and rolled back.
- Those fixes are not included in 0.2.4.
- Do not write future release notes as if those lifecycle issues were fixed in 0.2.4.

Future eyedropper work should focus on a dedicated helper replacement or a small, isolated overlay lifecycle task. A future C# / C++ helper can replace the PowerShell MVP behind the same `ColorSampler` provider interface. Do not change color picker UI, color model, H/S/V/R/G/B sliders, axis modes, Settings semantics, or registry field behavior as part of helper follow-up unless the task explicitly asks.

## 0.2.5 Procedural Appearance Handoff

The 0.2.5 visual direction is documented in:

```text
docs/design/procedural-appearance.md
```

Core decisions:

- Tool icons should be generated from stable `toolId` / hash seeds.
- Changing theme colors must not regenerate icon identity.
- Default icon mode is colorful procedural artwork.
- Optional theme-mapped mode should recolor by luminance / accent mapping while preserving composition.
- Icons should fill the rounded-square app-icon area.
- Visual style is soft abstract warped gradients.
- Do not use dot/line decoration as the main style.
- Do not introduce transparent glass UI.
- Background artwork may share visual language with icons, but icon and background generation must remain separate.
- Phase 1 Lab uses `engineVersion + target + seed + normalizedParams` as the deterministic output and cache key basis.

Current Phase 1 files:

- `client/js/proceduralAppearance.js`
- `client/js/proceduralPreviewContract.js`
- `client/js/proceduralHomeIcons.js`
- `host/tools/proceduralAppearanceLab.tool.jsx`
- `client/js/main.js` generic `proceduralPreview` registry field support
- `docs/design/procedural-appearance.md`

Procedural preview contract:

- Registry tools declare `type: "proceduralPreview"` with `engine`, `targetKey`, `seedKey`, and `parameterKeys`.
- The core renderer reads only the declared target, seed, and parameter keys. Do not pass full registry value objects into the procedural engine.
- Preview refresh is dependency-scoped: target, seed, or declared parameter changes can schedule a render; unrelated registry field changes should not enter the procedural preview path.
- Pending preview animation-frame work is cleaned up when changing tools, closing detail views, or entering panel shutdown.
- Preview boundary failures use fallback UI rather than uncaught exceptions. Missing engine, missing canvas, invalid target/seed, and render exceptions should remain contained at the renderer boundary.
- Preview layout and fallback styling belong in generic registry/procedural preview CSS, not inline renderer styles.
- Do not change `client/js/proceduralAppearance.js`, engine version, seed hashing, palette, warp, ribbon, grain/noise, or deterministic snapshots during preview contract work.

Procedural Home icon wiring:

- Colorful Home icons are rendered by `client/js/proceduralHomeIcons.js`.
- The only seed source is the stable tool id from `data-tool`; do not use title text, current language, Home order, DOM index, Developer Mode state, theme color, or Settings values.
- Static Home anchors and dynamic registry tools must pass through the same controller path and dedupe by tool id.
- Existing glyph/text icons are fallback only. Successful procedural canvas rendering should cover the rounded-square icon area and hide the fallback visually.
- Theme-mapped recolor and procedural background production wiring are not implemented yet.

Suggested branch sequence:

1. `feature/procedural-appearance-lab`
2. `feat/procedural-home-icons`
3. `feat/procedural-icon-theme-map`
4. `feat/procedural-background-mvp`
5. `docs/update-procedural-appearance-state`

Recommended first implementation step:

- Validate the Developer Mode Lab in AE before replacing production Home icons.

Risk areas:

- CEP performance from canvas rendering.
- Generated icons becoming too similar.
- Theme-mapped mode collapsing into a one-color palette.
- Regressing Home Edit order, Settings, color picker, eyedropper MVP, Ad Component Kit cleanup, Shape Add collapsible, or panel close shutdown guards.

## 0.2.4 Release Baseline

0.2.4 has been merged to `main` and tagged `v0.2.4`. Treat it as the stable baseline while 0.2.5 work continues on `dev`.

Baseline facts:

1. `VERSION` is `0.2.4`.
2. `CSXS/manifest.xml` `ExtensionBundleVersion` and extension `Version` are `0.2.4`.
3. `CHANGELOG.md` contains the final 0.2.4 section.
4. No `package.json` version file exists in the current workspace.
5. `v0.2.4` exists and is contained by `main`.

For future releases, create a dedicated release branch, run AE regression, update release metadata only when requested, merge through `dev` and `main`, then create a new version tag from `main`.

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
AEToolbox.tools.adComponentKit.removeSelectedGeneratedComponent()
```

Ad Component Kit migration note:

- The current registry/frontend id is `ecommerceLayout`.
- The active host implementation is `host/tools/adComponentKit.jsx`.
- The active registry schema is `host/tools/adComponentKit.tool.jsx`.
- The storage key remains `AEToolbox.ecommerceLayout.v1`.
- `host/tools/ecommerceLayout.jsx` was separately audited as unused legacy / experimental host code and removed.
- Keep the registry id `ecommerceLayout` unless a dedicated HomeLayout / storage migration is planned.
- Ad Component Kit is now one registry tool with Feature Stack, Icon Grid, and maintenance actions represented by tabs / option cards, state cards, and state-gated actions.
- New Feature Stack / Icon Grid output writes `LOMOND_CABINET_ARTIFACT_V1` metadata into layer comments, including owner, tool, kind, role, `artifactId`, component id, and created timestamp.
- Tool-written expressions use the `LOMOND_CABINET_BINDING_V1` signature with artifact id and previous expression state, allowing cleanup to restore previous expressions or clear tool-owned expressions.
- `Remove Selected Generated Component` only trusts Lomond artifact metadata and matching signed expressions. It must not delete layers without metadata, must not clean unsigned expressions, and must not guess legacy components by layer name.
- Artifact cleanup is forward-only and intentionally does not handle old Ad Component Kit output created before this metadata existed.
- The registry UI places Refresh Selected Component, Select Component Layers, and Remove Selected Generated Component directly below the active Feature Stack / Icon Grid create button. The separate Component Maintenance group is removed.
- Detach Component is no longer exposed in the registry UI. Do not reintroduce it casually; future maintenance actions should keep cleanup semantics precise and metadata-based.
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
