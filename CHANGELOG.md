# Changelog

All notable project-level changes should be documented in this file.

This project follows simple semantic versioning for development handoff:

- `MAJOR`: breaking CEP/package or workflow changes.
- `MINOR`: new tools or substantial user-facing capabilities.
- `PATCH`: fixes, UI adjustments, and documentation updates.

## Unreleased

### Added

- Added progressive Tool Registry Phase 1 infrastructure.
- Added host APIs for `AEToolbox.registerTool`, `AEToolbox.getRegisteredTools`, and `AEToolbox.runRegisteredToolAction`.
- Added automatic host scanning for `host/tools/*.tool.jsx` only.
- Added a dynamic frontend detail renderer for minimal registry `uiSchema` fields and action buttons.
- Added `host/tools/registryProbe.tool.jsx` as a minimal registry sample tool.

### Changed

- Most legacy tools are still statically registered and have not been migrated to the registry.
- Migrated Selection Info from the legacy static Home/detail path to `host/tools/selectionInfo.tool.jsx`.

## [0.1.1] - 2026-07-01

### Fixed

- Centered tool detail titles between the left navigation button and right status chip.
- Renamed Text Background Box behavior to Background Rounded Rectangle in the UI.
- Expanded Background Rounded Rectangle creation to support selected non-text layers.
- Added default 100x100 rounded rectangle creation when no layer is selected.
- Updated selection summary text to report generic selected layers instead of text-only status.

### Changed

- Added development install path rules to `AGENTS.md`.
- Synchronized manifest and `VERSION` to `0.1.1`.

## [0.1.0] - 2026-07-01

### Added

- Initial version-management baseline for the AE CEP Extension project.
- CEP panel structure with `CSXS/manifest.xml`, `client/`, and `host/`.
- HTML/CSS/JavaScript frontend for the Lomond Cabinet panel.
- ExtendScript host bridge loaded through `CSInterface.evalScript()` and `$.evalFile(...)`.
- English and Simplified Chinese i18n dictionaries.
- Home view with app-style tool cards and persisted drag ordering.
- Settings panel with language, motion, UI scale, theme color, and procedural background controls.
- Custom black-gold UI controls, including custom select overlays.
- Text Background Box tool.
- Selection Info tool.
- Ad Component Kit tool with Feature Stack and Icon Grid builders.
- Shape Add tool with native shape item creation and Stroke / Fill Shape Layer creation.
- Project handoff documentation under `docs/`.

### Fixed

- Documented current fixes and safeguards around App Launch / Close animation state handling.
- Documented current fixes around Home icon drag jitter and placeholder-based reordering.
- Documented current fixes around Shape Add item text alignment.
- Documented current fixes around custom select overlay clipping.
- Documented current fixes around Shape Add Stroke / Fill layer insertion and miter limit controls.

### Changed

- Manifest version fields are synchronized to `0.1.0`.
- `VERSION` is the project-level version source for handoff.
- `README.md`, `AGENTS.md`, and `docs/HANDOFF.md` now include version-management guidance.

### Known Issues

- `host/tools/ecommerceLayout.jsx` is still included but appears to be legacy or experimental relative to the active Ad Component Kit UI path.
- Some host JSX messages are plain `message` strings rather than `messageKey` values.
- `client/js/main.js` and `client/css/style.css` are large and should be patched carefully instead of rewritten.
- CEP or AE may cache old JavaScript or JSX; reopen the panel or restart AE when changes do not appear.
