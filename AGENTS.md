# AGENTS.md

## Project Overview

This repository is the **Lomond Cabinet / AE CEP Toolbox** project.

It is an After Effects CEP Extension panel:

- Frontend: HTML, CSS, and browser JavaScript.
- Host logic: ExtendScript / JSX executed by After Effects.
- Bridge: `CSInterface.evalScript()`.
- CEP entry: `CSXS/manifest.xml` points to `./client/index.html`.
- Visible UI product name: `Lomond Cabinet`.
- Extension bundle id: `com.kevin.aetoolbox`.

Main directories:

```text
CSXS/              CEP manifest and extension metadata
client/            Panel HTML, CSS, browser JavaScript, i18n, CSInterface
host/              ExtendScript entry and shared AE host utilities
host/tools/        Legacy host tools and registry `.tool.jsx` tools
docs/              Project state, design system, handoff, known issues
VERSION            Current project version
CHANGELOG.md       Versioned project changes
```

Do not treat this repository as a generic web app. It is a CEP extension with a browser frontend and an ExtendScript host runtime.

## Runtime / AE CEP Loading

The workspace repository is the source of truth. The After Effects CEP extensions directory should point to this workspace through a junction or symlink during development.

Expected workspace path:

```text
C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

Expected CEP development install path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
```

If a change does not appear in After Effects:

1. Confirm AE is loading the workspace path, not a stale copied extension directory.
2. Reload the CEP panel after frontend changes.
3. Restart After Effects if host JSX changes do not take effect.
4. Confirm `CSXS/manifest.xml` still points to `./client/index.html`.
5. Confirm `host/index.jsx` is loading the expected tool files.

Do not manually edit files inside the CEP extensions directory if it is not the workspace repository.

## Git Workflow Rules

Default development branch is `dev`.

Before starting any task:

1. Run `git status -sb`.
2. Confirm the working tree is clean.
3. Checkout `dev`.
4. Pull latest `origin/dev` if a remote is available.
5. Create a task branch from `dev`.

Use branch prefixes:

- `feat/` for new features.
- `fix/` for bug fixes.
- `docs/` for documentation.
- `style/` for UI/CSS-only changes.
- `refactor/` for refactors.
- `chore/` for configuration or maintenance.
- `i18n/` for language text updates.
- `probe/` for temporary validation tools.
- `audit/` for read-only or documentation audits.

Do not:

- Work directly on `main` unless the user explicitly asks.
- Apply old stash entries unless the user explicitly asks.
- Commit automatically unless the user asks.
- Push automatically unless the user asks.
- Merge branches unless the user asks.
- Create or move tags unless the user asks.
- Delete task branches unless the user asks.
- Reset, rebase, squash, or discard changes unless the user asks.

If the working tree is not clean, stop and report the changed files before doing anything else.

Release flow:

```text
task branch -> dev -> main -> version tag
```

Feature and fix branches are tested first, then merged to `dev`. Only confirmed stable `dev` should be merged to `main`. Tags are created only from release commits on `main`.

## Architecture Principles

The current registry architecture follows this rule:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

Tools should describe what they are and what actions they expose. The frontend core renderer decides how those tools look and behave.

Do not add tool-specific DOM, tool-specific CSS, or one-off UI behavior for ordinary registry tools. If a tool needs a new UI capability, add it to the core registry renderer as a reusable schema capability first.

Frontend responsibilities:

- Render Home, tool detail pages, Settings, status, and shared controls.
- Render registry schemas.
- Collect field values and persist registry values.
- Apply i18n.
- Call host JSX through `CSInterface.evalScript()`.
- Parse JSON returned from host JSX.

Host responsibilities:

- Inspect and modify After Effects comps, layers, properties, effects, and shape contents.
- Use matchName where practical for AE language compatibility.
- Wrap mutating operations in `app.beginUndoGroup()` / `app.endUndoGroup()`.
- Return JSON strings with `ok`, `messageKey` when possible, and useful debug details.

## Registry Tool Contract

Registry tools live in:

```text
host/tools/*.tool.jsx
```

`host/index.jsx` scans `.tool.jsx` files and each tool registers itself with:

```js
AEToolbox.registerTool(toolDef)
```

A registry tool may declare:

- `id`
- `titleKey`
- `descriptionKey`
- `category`
- `icon` / `iconText`
- `sections`
- `fields`
- `actions`
- `stateAction`
- `stateCard`
- `i18n`
- host action functions under `AEToolbox.tools.<toolId>`

Registry tools must not:

- Create custom detail page DOM.
- Add dedicated CSS.
- Implement custom UI interaction for controls.
- Write directly to `localStorage`.
- Duplicate core renderer behavior.
- Bypass `AEToolbox.runRegisteredToolAction(...)` for normal registry actions.

Use `sections` for new tools. `uiSchema` exists as a compatibility shortcut but should not be the default for new work.

Each action should map to a host function:

```js
{
  id: "create",
  labelKey: "tools.example.actions.create",
  hostFunction: "AEToolbox.tools.example.create"
}
```

Host JSX must remain ExtendScript-compatible. In `host/`, do not use:

- `let`
- `const`
- arrow functions
- `class`
- `import` / `export`
- template literals
- optional chaining
- spread / destructuring
- trailing commas that can break older ExtendScript engines

Use `var` and ES3-style code in host JSX.

## Core Renderer Rules

The core registry renderer in `client/js/main.js` owns:

- Home card rendering for dynamic tools.
- Tool detail page rendering.
- Section and field rendering.
- Field value collection.
- Registry tool value persistence.
- i18n application.
- Shared status handling.
- Action execution.
- Host state refresh lifecycle.

Supported shared controls and behaviors include:

- `text`
- `textarea`
- `number`
- `range`
- `checkbox` / switch
- `select`
- `color`
- `info`
- `divider`
- `button` / `actionButton`
- `tabs` / option cards
- full-width primary/secondary buttons
- center-axis bilingual / matchName button layout
- `visibleWhen`
- section toggle / collapse
- `actionPayload`
- `stateAction`
- `enabledWhen` / `disabledWhen`
- `stateCard`
- `refreshStateAfterRun`
- action fallback messages with `pendingMessageKey`, `successMessageKey`, and `errorMessageKey`
- per-tool value persistence under `aeToolbox.registryToolValues.<toolId>`

`actionPayload` is transient. It is merged into the clicked action params and must not be persisted as user settings.

`stateAction` state is runtime-only. It must not be written to `localStorage`.

If a migrated tool needs a missing control type, report or add the missing control as a generic core renderer capability. Do not create a tool-specific workaround.

## App-Level Settings Rules

Settings is an app-level core panel, not a registry tool.

Current production Settings behavior is phased and app-level:

- The outer Settings shell lives in `client/index.html`.
- Settings behavior lives in `client/js/main.js`.
- Migrated Settings rows are rendered from `client/js/settingsSchema.js` through the Settings renderer path.
- `BackgroundEngine` remains the runtime owner for procedural background behavior.
- Settings i18n belongs in `client/js/i18n.js` because it is core/global UI.

The app-level Settings data model lives in:

```text
client/js/settingsSchema.js
```

Do not migrate Settings as `host/tools/*.tool.jsx`. Do not replace the Settings shell, migrate storage keys, or change `BackgroundEngine` behavior as a side effect of unrelated work.

Settings renderer baseline is currently restored to the stable path. Future Settings work should proceed through the app-level Settings Schema and Settings Renderer Lab, then through focused production tasks.

Developer Mode is a core Settings value. It controls debug/probe/lab registry tool visibility generically and must not be implemented as a tool-specific condition.

## i18n Rules

The panel supports:

- `en`
- `zh-CN`

Current direction:

- `client/js/i18n.js` should mainly contain core, global, Settings, Home, and legacy strings.
- Registry tool-specific text should live in that tool's `.tool.jsx` `i18n` object.
- Do not keep adding new registry tool strings to `client/js/i18n.js`.
- New registry tools should ship their own `en` and `zh-CN` dictionaries.
- Tool metadata must use `titleKey` and `descriptionKey`.
- User-visible action labels, section titles, field labels, hints, status messages, and option labels must use i18n keys.
- Host JSX should return `messageKey` when practical.
- Before deleting old global keys, run `node scripts/report-i18n-usage.js` and inspect `docs/reports/i18n-usage-report.md`.
- Treat Home static anchors, startup fallback, dynamic key construction, and preserved legacy adapters as reasons to defer deletion until AE tests confirm the path is safe.

When editing existing i18n:

- Do not rename keys unless the task explicitly requires it.
- Prefer changing values only.
- If a `.jsx` file currently uses Unicode escape strings, keep that style in the same file.
- Do not hard-code user-visible Chinese or English in renderer logic.

## Developer Mode Rules

Developer Mode is a general switch for debug, probe, lab, and renderer validation tools.

Developer Mode tools are hidden from normal Home by default and appear only when the Settings Developer Mode switch is enabled.

Examples:

- `Registry Control Lab`
- `Settings Renderer Lab`
- tools whose id/title/description contains `probe`, `lab`, `test`, `debug`, or `controlLab`
- tools with `debugOnly: true`
- tools with `developerOnly: true`
- tools with `category: "debug"`

Formal production tools must not depend on Developer Mode.

Do not delete Developer Mode lab tools just because they are hidden. They are used to validate the core registry renderer and migration paths. Temporary probes may be retired after the formal tool path replaces them and AE testing confirms they no longer add regression value.

## Current Tool Status

### Shape Add / Shape Builder

Status: formal registry tool.

- `host/tools/shapeAdd.tool.jsx` owns registry metadata, sections, fields, actions, and tool-local i18n.
- The formal Home entry uses tool id `shapeAdd`.
- The legacy static Home card was removed to avoid duplicate Home entries.
- The 19 native shape item buttons are available through registry full-width buttons.
- Native item buttons use `actionPayload` for `key` and `matchName`.
- Buttons use host state through `stateAction`, `stateCard`, and state-driven disabled rules.
- Actions refresh state after running.
- Stroke / Fill Shape Layer UI is registry-rendered.
- Stroke / Fill parameters live under the create button in a collapsible registry section.
- Stroke / Fill has a section-local reset defaults button.
- `host/tools/shapeAdd.jsx` still contains necessary legacy host action logic and must remain for now.
- The obsolete `shapeAddProbe` Developer Mode probe was retired after the formal Shape Add registry path stabilized.
- Shape Add legacy frontend adapter, duplicate `shapeAdd.item.*` global i18n, legacy Shape Add CSS, and old global host wrappers have been cleaned up after AE testing.
- Shape Add number/range inputs preserve raw typed text during editing and only normalize on commit.

### Text Background Box / Background Rounded Rectangle

Status: registry tool.

- `host/tools/textBackgroundBox.tool.jsx` owns registry metadata and schema.
- The registry action reuses the existing host creation behavior.
- Fill and Stroke are controlled by section toggles.

### Selection Info

Status: registry tool.

- `host/tools/selectionInfo.tool.jsx` owns metadata, action, and i18n.

### Ad Component Kit

Status: registry tool.

- Feature Stack and Icon Grid are exposed through the registry UI.
- Current frontend id is `ecommerceLayout`.
- Current active host module is `host/tools/adComponentKit.jsx`.
- The old `host/tools/ecommerceLayout.jsx` guide/template host module was audited and removed.
- The formal schema is `host/tools/adComponentKit.tool.jsx`.
- The active host behavior is `host/tools/adComponentKit.jsx`.
- Storage remains `AEToolbox.ecommerceLayout.v1`.
- Keep id `ecommerceLayout` for HomeLayout saved-order and `AEToolbox.ecommerceLayout.v1` storage compatibility unless a dedicated migration is requested.
- Keep one tool and use tabs / visibleWhen for Feature Stack and Icon Grid, not split them into multiple Home tools.
- Do not rewrite the AE creation algorithms in `host/tools/adComponentKit.jsx`.
- Schema draft: `docs/schema-drafts/ad-component-kit.registry-schema-draft.md`.
- Do not refactor these unless explicitly requested.

### Registry Control Lab

Status: Developer Mode tool.

- Used to validate renderer controls, persistence, action/state behavior, and status behavior.

### Preserved / Legacy Host Modules

Some host files may remain included for compatibility or future work. Do not delete preserved host modules unless all call paths are verified.

## Testing Checklist

Before asking the user to verify a major UI/tool change in AE, run or provide this checklist.

Developer Mode:

- Developer Mode off: Registry Control Lab is hidden.
- Developer Mode off: Settings Renderer Lab is hidden.
- Developer Mode on: retained lab/debug tools are visible.
- Developer Mode on/off does not break saved Home order.

Shape Add:

- Home shows Shape Add / Shape Builder only once.
- No target: native item buttons are disabled.
- Valid shape target: native item buttons are enabled.
- All 19 native shape item buttons can add their item.
- State card refreshes after add actions.
- Stroke / Fill Shape Layer creation works.
- Stroke / Fill settings persist.
- Stroke / Fill section-local reset affects only Stroke / Fill defaults.
- Chinese/English switching works.

Other tools:

- Text Background Box / Background Rounded Rectangle works.
- Selection Info works.
- Ad Component Kit Feature Stack works.
- Ad Component Kit Icon Grid works.
- Home Edit enter/edit/done flow works.
- Settings opens normally.
- App Launch / Close transitions still work.
- No untranslated i18n keys are visible.
- No `null.addEventListener` errors appear.

## Known Issues / Do Not Fix Casually

### Settings Background Engine preset dropdown render glitch

Status: Deferred.

Opening the Settings Background Engine preset dropdown and closing it by clicking elsewhere can cause a Settings layout/render glitch. This is documented in `docs/KNOWN_ISSUES.md`.

Do not fix this opportunistically. It needs a dedicated UI state stabilization pass.

### HomeLayoutManager

Home ordering is sensitive because static and dynamic tools share saved `toolId` order.

Do not refactor `HomeLayoutManager` casually.

Do not save absolute icon positions. Home order should remain a `toolId` order array.

### Shape Add host actions

Do not delete `host/tools/shapeAdd.jsx` casually.

The registry Shape Add UI uses registered actions:

```js
AEToolbox.runRegisteredToolAction("shapeAdd", actionId, paramsJson)
```

Formal host behavior remains in `host/tools/shapeAdd.jsx`; formal registry schema remains in `host/tools/shapeAdd.tool.jsx`.

Removed legacy global wrappers:

```js
shapeAdd_getState()
shapeAdd_add(matchName, key)
shapeAdd_createStrokeFillLayer(paramsJson)
```

Do not add new `client` evalScript calls to these removed wrappers. Use registry actions instead.

### CEP panel close freeze

Status: Deferred to 0.2.4.

Closing the CEP panel can still make After Effects appear frozen for several seconds to more than ten seconds. Do not claim this is fixed in 0.2.3 and do not patch shutdown lifecycle opportunistically. A future focused task should audit pending `evalScript` calls, registry state polling, document/window listeners, custom select cleanup, and localStorage save paths.

## Release Workflow

Release flow:

```text
task branch -> dev -> main -> tag
```

Before preparing a release:

1. Confirm the task branch has been tested.
2. Merge the task branch into `dev`.
3. Test `dev` in AE.
4. Update release metadata only after the user asks.
5. Merge stable `dev` into `main`.
6. Create the version tag from `main`.

When changing the version, keep these synchronized:

- `VERSION`
- `CSXS/manifest.xml` `ExtensionBundleVersion`
- `CSXS/manifest.xml` extension `Version`
- `package.json`, if it exists
- `README.md` / docs, if they explicitly state the current version
- `CHANGELOG.md`

`v0.2.1` has been published and must not be moved. `v0.2.2` is the agent handoff guide / project maintainability release. `0.2.3` is currently the registry migration / cleanup release-prep track; do not update VERSION or create a tag until explicitly asked.

Do not move existing tags unless the user explicitly asks.

## Development Install Path

The source of truth is the workspace Git repository:

```text
C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

Codex must modify files only in this workspace repository.

The After Effects CEP extensions directory should point to this workspace through a Windows junction or symlink:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
-> C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

Do not manually edit files inside the CEP extensions directory if it is not the workspace repository.

Do not copy files between workspace and extensions during normal development.

After modifying frontend files, reload the CEP panel.

After modifying host JSX files, restart After Effects if changes do not take effect.

Git is used only in the workspace repository for version control.
