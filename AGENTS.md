# AGENTS.md

## Project Overview

This project is an After Effects CEP Extension panel.

- Frontend: HTML, CSS, and browser JavaScript under `client/`.
- Host logic: ExtendScript / JSX under `host/`.
- CEP entry: `CSXS/manifest.xml` points to `./client/index.html`.
- Frontend calls After Effects operations through `CSInterface.evalScript()`.

The current product name shown in the UI is **Lomond Cabinet**. The extension bundle id remains `com.kevin.aetoolbox`.

## Project Structure

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
      ecommerceLayout.jsx
      adComponentKit.jsx
      shapeAdd.jsx
  docs/
```

## Frontend / Host Responsibility Boundary

Frontend responsibilities:

- Build and update the UI.
- Manage Home view, tool detail view, settings, status pill, custom selects, colors, persisted settings, and i18n.
- Collect parameters from UI controls.
- Call host JSX with `CSInterface.evalScript()`.
- Parse JSON strings returned by host JSX.

Host JSX responsibilities:

- Inspect and modify After Effects comps, layers, properties, effects, and shape contents.
- Use matchName where possible for Chinese/English AE compatibility.
- Wrap mutating operations in `app.beginUndoGroup()` / `app.endUndoGroup()`.
- Return JSON strings to the frontend.

Do not mix browser JavaScript and ExtendScript responsibilities.

## CEP / ExtendScript Rules

- `index.html` must not directly load `.jsx` files.
- Host JSX is loaded from `client/js/main.js` with `CSInterface.evalScript()` and `$.evalFile(...)`.
- `host/index.jsx` includes shared host files and tool modules with `#include`.
- Host JSX must stay ExtendScript-compatible.

Do not use the following in host JSX:

- `let`
- `const`
- arrow functions
- `class`
- `import` / `export`
- template literals
- optional chaining
- spread / destructuring
- trailing commas that can break older ExtendScript engines

Use `var` and ES3-style code in `host/`.

## i18n Rules

The panel supports:

- `en`
- `zh-CN`

Rules:

- Add user-visible frontend strings to `client/js/i18n.js`.
- Use `data-i18n`, `data-i18n-title`, `data-i18n-aria-label`, or `I18n.t(...)`.
- New tools must define `titleKey` and `descriptionKey` in `ToolRegistry`.
- Host JSX should return `messageKey` when practical; the frontend may fall back to `message`.
- Avoid hard-coded user-visible text in HTML and `main.js`.

## UI And Motion Rules

Keep the current direction:

- Black Gold minimal professional UI.
- Apple-inspired fast-start / slow-stop motion.
- Home page uses app-icon style tool cards.
- Tool details use cards and a bottom action sheet.
- Settings are a separate panel with morph transition.
- Status feedback uses the bottom status pill.

Do not casually change these systems:

- App Launch / Close morph transition.
- Settings open / close transition.
- Home icon drag reorder behavior.
- Status pill behavior.
- Custom select overlay behavior.

Avoid restoring deprecated heavy visuals:

- Liquid Glass layering
- `backdrop-filter`
- SVG filters
- Houdini / paint worklets
- large area blur
- mouse-following glow
- expensive nested shadows

## Performance Rules

- Prefer `transform` and `opacity` for animation.
- Do not animate layout properties such as `left`, `top`, `width`, `height`, margin, or padding except where already intentionally implemented and verified.
- Do not keep broad `will-change` active permanently.
- Do not add high-frequency `mousemove` effects.
- Do not introduce React, Vue, or other large frontend frameworks.
- Do not use external CDNs.
- Keep CSS and JS changes scoped; `style.css` and `main.js` are large and should not be rewritten wholesale.

## New Tool Rules

When adding a tool:

1. Add a Home tool card in `client/index.html`.
2. Add a `toolId` entry in `ToolRegistry` in `client/js/main.js`.
3. Add `titleKey` and `descriptionKey` to `client/js/i18n.js`.
4. Add the tool detail UI in `client/index.html`.
5. Add bottom action buttons if needed.
6. Wire events and parameter collection in `client/js/main.js`.
7. Add host logic in `host/tools/<toolName>.jsx`.
8. Include the host module from `host/index.jsx`.
9. Return JSON strings from host functions.
10. Support clear `ok`, `message` / `messageKey`, and useful debug fields.

Do not break existing tools while adding a new one.

## Protection Rules

- Do not overwrite user config stored in `localStorage`.
- Do not reset existing visual parameters unless the user explicitly asks.
- Do not reset `Motion`, `StorageKeys`, or persisted defaults casually.
- Do not remove old host tools unless the user explicitly asks; some may be unused but preserved.
- Before editing, read the current implementation path and confirm the active code path.
- If a bug is suspected in unused code, document it first instead of changing it.

## Version Control Rules

- Before changing files, check `git status --short --branch`.
- Do not rewrite large files without a specific reason and a narrow scope.
- Keep each functional change in its own commit when practical.
- Use clear commit message prefixes:
  - `feat:`
  - `fix:`
  - `docs:`
  - `style:`
  - `refactor:`
  - `chore:`
- Update `CHANGELOG.md` for new features, user-facing fixes, and behavior changes.
- If changing the plugin version, keep these synchronized:
  - `VERSION`
  - `CHANGELOG.md`
  - `CSXS/manifest.xml` `ExtensionBundleVersion`
  - `CSXS/manifest.xml` extension `Version`
- Do not commit generated archives, logs, backup folders, runtime cache, or dependency folders.
- Keep `.gitignore` focused on generated files only; do not ignore source directories such as `CSXS/`, `client/`, `host/`, or `docs/`.

## Git Workflow

Default branch for development is `dev`.

All future code changes, bug fixes, new tools, UI updates, i18n changes, documentation changes, and refactors must start from `dev`, unless the user explicitly says otherwise.

Before starting any task:

1. Run `git status`.
2. Confirm the working tree is clean.
3. Checkout `dev`.
4. Pull latest changes from origin if remote is available.
5. Create a task branch from `dev`.

Use branch prefixes:

- `feat/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `style/` for UI/CSS-only changes
- `refactor/` for refactors
- `chore/` for configuration or maintenance
- `i18n/` for language text updates

Do not commit automatically unless the user asks.

Do not merge branches unless the user explicitly asks.

Do not push unless the user explicitly asks.

Do not modify `main` unless the user explicitly asks.

Do not create or update version tags unless the user explicitly asks.

If the working tree is not clean, stop and report the changed files before doing anything.

If a task requires merging, releasing, tagging, or version bumping, wait for explicit user instruction.

## Development Install Path

The source of truth is the workspace Git repository:

`C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox`

Codex must modify files only in this workspace repository.

The After Effects CEP extensions directory should point to this workspace through a Windows junction or symlink:

`%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox`
-> `C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox`

Do not manually edit files inside the CEP extensions directory if it is not the workspace repository.

Do not copy files between workspace and extensions during normal development.

After modifying frontend files, reload the CEP panel.
After modifying host JSX files, restart After Effects if changes do not take effect.

Git is used only in the workspace repository for version control.
