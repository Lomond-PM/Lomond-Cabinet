# Changelog

All notable project-level changes should be documented in this file.

This project follows simple semantic versioning for development handoff:

- `MAJOR`: breaking CEP/package or workflow changes.
- `MINOR`: new tools or substantial user-facing capabilities.
- `PATCH`: fixes, UI adjustments, and documentation updates.

## [0.2.3] - 2026-07-08

Release candidate documentation only. Do not update `VERSION` or `CSXS/manifest.xml` until the release task explicitly requests it.

### Added

- Added an app-level Global Settings Schema draft in `client/js/settingsSchema.js`.
- Documented that Settings is an app-level core settings framework and should not be migrated as a normal registry tool.
- Added a Developer Mode-only Settings Renderer Lab for sandbox testing the future app-level Settings schema controls.
- Migrated the production Settings Developer Mode row to the app-level Settings schema renderer path while preserving the existing `AEToolbox.settings.v1.registryDebugTools` storage.
- Migrated the production Settings Language row to the app-level Settings schema renderer path while preserving the existing `aeToolbox.language` storage.
- Migrated the production Settings Motion Speed and UI Scale rows to the app-level Settings schema renderer path while preserving the existing `AEToolbox.settings.v1` storage.
- Migrated the production Settings Theme color rows to the app-level Settings schema renderer path while preserving the existing `AEToolbox.settings.v1` storage and color application logic.
- Added Ad Component Kit registry migration notes and a schema draft without connecting it to the production Home/detail path.
- Migrated Ad Component Kit to the unified registry tool path with id `ecommerceLayout`, including Feature Stack, Icon Grid, and maintenance actions.
- Added `scripts/report-i18n-usage.js` and `docs/reports/i18n-usage-report.md` to guide conservative i18n cleanup before deleting global keys.

### Notes

- Settings schema data is now used by the production Settings renderer for migrated rows, while Settings remains an app-level core panel and still preserves existing storage and behavior adapters.
- Settings Renderer Lab uses sandbox storage key `AEToolbox.settingsLab.v1` and does not write production Settings keys.
- Ad Component Kit now uses registry metadata/detail rendering while preserving `AEToolbox.ecommerceLayout.v1` and reusing `host/tools/adComponentKit.jsx`.
- Removed the legacy Ad Component Kit frontend detail DOM, action footer, event binding, unused component/ecom CSS, and obsolete global Ad Component Kit i18n entries. The static Home card remains as the saved-order anchor for `ecommerceLayout`.
- Removed the unused legacy / experimental `host/tools/ecommerceLayout.jsx` host module after confirming the active Ad Component Kit runtime path uses `host/tools/adComponentKit.jsx`.
- Retired obsolete Developer Mode probes `registryProbe`, `shapeAddProbe`, and `adComponentKitProbe`; Registry Control Lab and Settings Renderer Lab remain available for renderer/settings validation.
- Settings renderer baseline has been restored to the stable path after the failed visual-unification attempt; Settings remains an app-level core settings framework, not a normal registry tool.
- Tool-local i18n is now the expected location for registry tool strings; `client/js/i18n.js` is reserved for core, Home, Settings, common, and fallback copy.

### Changed

- Ad Component Kit is now the visible unified registry tool for Feature Stack, Icon Grid, and maintenance actions while keeping registry id `ecommerceLayout` and storage key `AEToolbox.ecommerceLayout.v1`.
- Shape Add / Shape Builder has completed registry migration for native shape items and Stroke / Fill, with obsolete frontend adapter, duplicate `shapeAdd.item.*` global i18n, legacy Shape Add CSS, and old host global wrappers removed.
- Text Background Box / Text Plate has completed registry migration and legacy frontend adapter cleanup.
- Home and registry option-card colors now follow theme/design tokens instead of hard-coded accent colors.

### Fixed

- Fixed Shape Add registry number/range input typing so partially typed values such as `1`, `1.`, `12`, and `12.5` are not formatted until commit.

### Known Issues

- Deferred to 0.2.4: closing the CEP panel can still make AE appear frozen for several seconds to more than ten seconds. 0.2.3 does not attempt to fix this; future work should audit CEP unload, pending `evalScript`, polling/state intervals, document/window listeners, and localStorage save paths.

## [0.2.2] - 2026-07-03

### Changed

- Expanded `AGENTS.md` into a full agent handoff and project maintenance guide.
- Documented registry tool architecture, core renderer responsibilities, i18n rules, Developer Mode rules, testing checklist, and release workflow.
- Clarified that registry tools should keep tool-local i18n in their `.tool.jsx` files instead of adding new tool strings to `client/js/i18n.js`.
- Clarified Developer Mode behavior for probe, lab, test, and debug registry tools.
- Documented runtime / AE CEP loading checks for workspace, junction / symlink installs, frontend reloads, and host JSX restarts.
- Updated `.gitignore` for local `.env` files while keeping source directories tracked.

## [0.2.1] - 2026-07-03

### Changed

- Migrated Background Rounded Rectangle / Text Background Box to the `.tool.jsx` registry path while keeping existing host creation behavior.
- Legacy and registry tools continue to coexist during the incremental migration.
- Added core registry renderer support for section-level enable toggles and collapsible section bodies.
- Updated Background Rounded Rectangle to use section toggles for Fill and Stroke enablement.
- Added a Registry Control Lab section-toggle test panel.
- Added shared registry tool parameter persistence under `aeToolbox.registryToolValues.<toolId>`.
- Added a shared registry Restore Defaults action for schema-driven tools.
- Added core registry renderer support for full-width button fields and primary/secondary variants.
- Added core registry renderer support for tabs / option card fields.
- Added `visibleWhen` conditional display support for registry fields.
- Extended Registry Control Lab to cover full-width buttons, center-axis bilingual button text, tabs, and conditional fields.
- Added core registry action/state capabilities: action payloads, host state queries, state-driven disabled buttons/actions, state status cards, after-run state refresh, and action-specific status fallbacks.
- Extended Registry Control Lab to cover action payloads, host state display, state-gated buttons, after-run state refresh, and action-specific status fallback behavior.
- Added a Developer Mode / registry debug tools setting for showing debug-only registry probe tools.
- Added a debug-only Shape Add Probe registry tool to validate action payload, stateAction, state-driven disabled state, state card, and after-run state refresh against the legacy Shape Add host action.
- Documented the Shape Add registry migration audit before continuing with a phased AE-tested migration path.
- Migrated the formal Shape Add native item buttons to the `.tool.jsx` registry path using action payloads, host state, state-driven disabled buttons, and after-run state refresh.
- Migrated the Shape Add Stroke / Fill Shape Layer subtool UI into registry sections while routing through the registered `createStrokeFillLayer` action and preserving `host/tools/shapeAdd.jsx` behavior.
- Moved Stroke / Fill parameters into a collapsible registry settings section under the create button and added a section-local reset defaults button.
- Removed the legacy static Home card for Shape Add so the registry Shape Add entry owns the Home card and saved `toolId` order can continue using `shapeAdd`.
- Added hidden / field-only registry actions so schema button fields can resolve host functions without creating duplicate footer buttons.
- Added tool-local Shape Add i18n for title, description, and 19 native shape item labels.
- Developer Mode now owns debug/probe/lab registry tools such as Registry Control Lab, Registry Probe, and Shape Add Probe.

### Fixed

- Fixed the Home Edit toggle flow so the first click enters Home editing mode and only the Done click saves the layout.

### Notes / Known Issues

- Deferred: Settings Background Engine preset dropdown may trigger a render/layout glitch after closing. The issue is documented in `docs/KNOWN_ISSUES.md` for a future UI stabilization pass.

### Migration Notes

- Shape Add phase migration is now the active formal path. The 19 native shape item buttons and Stroke / Fill Shape Layer UI use the registry path, while the legacy host execution module remains preserved for AE layer operations.

## [0.2.0] - 2026-07-02

### Added

- Added progressive Tool Registry Phase 1 infrastructure.
- Added host APIs for `AEToolbox.registerTool`, `AEToolbox.getRegisteredTools`, and `AEToolbox.runRegisteredToolAction`.
- Added automatic host scanning for `host/tools/*.tool.jsx` only.
- Added a dynamic frontend detail renderer for minimal registry `uiSchema` fields and action buttons.
- Added `host/tools/registryProbe.tool.jsx` as a minimal registry sample tool.
- Added the Registry Tool UI Contract documentation and stabilized the generic registry renderer structure.
- Added `host/tools/registryControlLab.tool.jsx` to validate shared registry controls.
- Added registry renderer support for textarea, range, color, info, and divider fields.
- Added standard registry renderer controls for text, textarea, number, range, checkbox, select, color, info, and divider fields.
- Added a custom color control with hex input and HSV picker support for registry tools.
- Defined registry renderer design rules for tool-owned metadata and core-owned UI behavior.

### Changed

- Most legacy tools are still statically registered and have not been migrated to the registry.
- Migrated Selection Info from the legacy static Home/detail path to `host/tools/selectionInfo.tool.jsx`.
- Improved registry renderer control styling with a minimal adapter that reuses the existing black-gold UI system.
- Improved registry tool detail layout to match the existing black-gold Apple-like panel design.
- Preserved Home, Settings, App Launch / Close motion, and existing legacy tool behavior while extending registry UI support.

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

- `host/tools/ecommerceLayout.jsx` has been removed after audit; Ad Component Kit active host behavior is `host/tools/adComponentKit.jsx`.
- Some host JSX messages are plain `message` strings rather than `messageKey` values.
- `client/js/main.js` and `client/css/style.css` are large and should be patched carefully instead of rewritten.
- CEP or AE may cache old JavaScript or JSX; reopen the panel or restart AE when changes do not appear.
