# PROJECT_STATE.md

## Current project overview

Lomond Cabinet is an After Effects CEP extension panel.

- Visible product name: **Lomond Cabinet**
- Manifest menu name: **AE Toolbox**
- Extension id/folder: `com.kevin.aetoolbox`
- Current release version: `0.3.1`
- Latest existing published tag: `v0.3.0`
- 0.3.1 release branch baseline: `release/0.3.1`
- Host API version: `1.0.0`

`VERSION`, both version fields in `CSXS/manifest.xml`, and `AEToolbox.projectVersion` identify product version `0.3.1`. The complete automated suite and AE P0 Release Regression passed before the release bump. No 0.3.1 commit, merge, or tag is implied by this document.

The primary Windows development environment uses a junction from the CEP Extensions directory to the workspace repository, so normal work does not require a separate copy/sync operation.

## 0.3.1 release status

Version 0.3.1 stabilizes the completed Vela D-phase **Experimental Preview** and closes the accepted 0.3.1 Registry, Grid, UI, bootstrap, lifecycle, and release-safety scope.

Completed scope:

- D2-A — model-independent Vela Surface states and lifecycle
- D2-B — explicit session-only local Provider opt-in and LM Studio readiness
- D2-C — trusted Activation Policy and D-phase closeout

The product status is intentionally experimental rather than production-enabled:

- local Provider opt-in is available but disabled by default;
- production activation is locked;
- no model is qualified, recommended, or selected as default;
- formal UI-D2 default enablement is false;
- Vela Persistent Surface is the only Vela entry and the legacy fallback is retired;
- Wide/Compact/Narrow Vela presentation and status behavior are complete for 0.3.1.
- Release-readiness automation and the AE P0 Release Regression passed.

Future model qualification, default-model selection and production activation are separate product decisions, not unfinished D-phase tasks.

## Runtime architecture

### CEP frontend

Primary entry and ownership:

- `CSXS/manifest.xml` → `client/index.html`
- `client/js/main.js` — app bootstrap, Home, Settings and Registry Renderer integration
- `client/js/i18n.js` — core/global English and Simplified Chinese text
- `client/js/settingsSchema.js` — app-level Settings schema
- `client/css/style.css` — shared application styling
- `client/css/velaSurface.css` — Vela Surface styling

The browser frontend loads host JSX through `CSInterface.evalScript()` / `$.evalFile(...)`. `client/index.html` does not load JSX directly.

### After Effects host

- `host/index.jsx` — host entry, shared API and tool loading
- `host/aeUtils.jsx` — AE helpers
- `host/effectUtils.jsx` — effect/property helpers
- `host/shapeUtils.jsx` — shape helpers
- `host/tools/*.tool.jsx` — registry metadata, schemas, actions and tool-local i18n
- `host/tools/*.jsx` — AE execution implementations retained by tools

Host code must remain ExtendScript-compatible.

## Registry Renderer

Current architectural rule:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

The frontend core renders shared registry sections, fields, actions, visibility, enablement, state cards, status, persistence and host routing. Ordinary tools should not add dedicated frontend DOM or CSS.

Current production registry tools:

### Text Background Box

- Registry id: `textBackgroundBox`
- Schema: `host/tools/textBackgroundBox.tool.jsx`
- Host behavior: `host/tools/textBackgroundBox.jsx`
- Creates shape backgrounds behind selected text layers.
- Fill and Stroke are section-controlled through the registry path.

### Selection Info

- Registry id: `selectionInfo`
- Schema: `host/tools/selectionInfo.tool.jsx`
- Reports active composition and selected-layer information.

### Ad Component Kit

- Compatibility registry id: `ecommerceLayout`
- Schema: `host/tools/adComponentKit.tool.jsx`
- Host behavior: `host/tools/adComponentKit.jsx`
- Creates Feature Stack and Icon Grid components.
- Icon Grid validates the complete selection before input-layer writes. Its 0.3.1 contract supports unlocked, unparented 2D Text/Shape/AV layers with zero rotation, positive uniform or non-uniform scale, finite source bounds, and four successful `sourcePointToComp()` conversions.
- Unsupported or unsafe input rejects the entire action with a stable reason; bounds conversion failure is never replaced with layer-space coordinates. Refresh derives normalize corrections from member-local source bounds and current member Scale, so repeated Refresh is idempotent and Controller Position/Scale/Rotation remain unchanged. Fixed-cell layout and final visual recentering remain outside this work.
- New output uses Lomond metadata and signed tool expressions for forward-only cleanup.
- The `ecommerceLayout` id and `AEToolbox.ecommerceLayout.v1` storage key remain for Home-order/storage compatibility.
- The removed `host/tools/ecommerceLayout.jsx` module is not an active path.

### Shape Add / Shape Builder

- Registry id: `shapeAdd`
- Schema: `host/tools/shapeAdd.tool.jsx`
- Host behavior: `host/tools/shapeAdd.jsx`
- Adds 19 native shape contents and creates linked Stroke / Fill shape layers.
- The static duplicate Home card and obsolete global wrappers have been removed.
- Do not delete the retained host implementation while registered actions use it.

### Developer Mode labs

Developer Mode retains shared renderer/Settings/procedural labs. They are hidden from normal Home mode and are not production tools.

## Settings

Settings is an app-level core system, not a registry tool.

- Schema: `client/js/settingsSchema.js`
- Runtime/UI behavior: `client/js/main.js`
- Primary storage: `AEToolbox.settings.v1`
- Background compatibility storage: `AEToolbox.background.v1`
- Background collapse storage: `AEToolbox.backgroundSettingsCollapsed.v1`
- Language storage: `aeToolbox.language`

Current Settings areas include language, Developer Mode, motion speed, UI scale, interface colors, tool icon appearance, Palette Library, procedural appearance parameters and background behavior.

`BackgroundEngine` remains the owner of the classic path. `ProceduralHomeBackground` owns the optional procedural background source/presentation path. No Settings v2 migration is part of 0.3.1.

## Procedural appearance

Version 0.2.5 introduced the procedural appearance production paths retained in 0.3.1.

Key modules:

- `client/js/proceduralAppearance.js`
- `client/js/proceduralPreviewContract.js`
- `client/js/proceduralCache.js`
- `client/js/proceduralPaletteLibrary.js`
- `client/js/proceduralPaletteStore.js`
- `client/js/proceduralPaletteEditor.js`
- `client/js/proceduralPaletteWorkspace.js`
- `client/js/proceduralHomeIcons.js`
- `client/js/proceduralHomeBackground.js`

Current boundaries:

- source identity is deterministic from engine version, target, stable seed and normalized parameters;
- Home tool identity uses stable tool ids only;
- language, Home order, Developer Mode, UI scale and theme do not change icon source identity;
- Theme-mapped mode is a presentation mapping over a source raster;
- Palette Store owns user overrides, custom palettes, hidden built-ins and tool mappings under `lomond.proceduralPaletteStore.v1`;
- the classic Background Engine remains an explicit fallback;
- source and presentation invalidation remain separate.

Detailed design: `docs/design/procedural-appearance.md`.

## Vela architecture and safety state

### Surface and Provider

Vela provides a persistent transcript/composer Surface on Home. The optional local Provider is restricted to loopback endpoints:

The user's preferred Surface height persists separately under the versioned layout key `AEToolbox.velaSurfaceLayout.v1`. Mount, panel resize, responsive-mode changes, and UI-scale changes derive a clamped effective CSS-pixel height without replacing the original preference. Provider acknowledgement, readiness, and enablement remain session-only; transcript, multi-session, and context state are not persisted by this feature.

- `127.0.0.1`
- `localhost`
- `[::1]`

Endpoint and Model ID may persist. Acknowledgement, enabled state, readiness and authority are session-only and clear on reload. Readiness checks LM Studio's native model catalog and means only that the configured model instance is loaded.

### Trusted activation policy

`client/js/vela/velaActivationPolicy.js` is the single trusted owner of product activation state:

```text
releaseMode = experimental-preview
experimentalOptInAllowed = true
productionEnabled = false
productionBlockReason = no-qualified-default-model
qualifiedDefaultModelId = null
legacyFallbackRetained = false
formalUiD2Enabled = false
```

Settings, local persistence, readiness, acknowledgement, model output and transcript content cannot change those values.

### Execution boundary

The frozen safety chain is:

```text
Provider
-> Parser
-> Profile mismatch check
-> Intent Gate
-> proposal-ready
-> Review
-> private Router
-> local candidate
-> Confirmation
-> Approve
-> Preflight
-> ExecutionAdapter
-> Host
```

Review, Confirmation and Host authority remain independent. A model-authored proposal cannot execute directly. For the current `set-opacity-v1` capability, the model contributes only the bounded opacity value; target identity, request/candidate ids, plan, nonce, digest, authority and Host payload remain locally trusted.

The 0.3.1 `proposal-capable-union` profile is a bounded transition mechanism: when trusted Context shows one actionable opacity target, the Provider may return text or a `set-opacity-v1` proposal. It is not autonomous execution, does not add capabilities, and does not weaken Review, Confirmation, Preflight, Execution Guard, Execution Adapter, or Host authority.

The Context Bridge remains the foundation for observation, trusted target binding, fingerprints, lifecycle generations, and fresh execution checks. Request-time target continuity is intentionally deferred: proposal-ready remains identity-free and Review performs a fresh target bind.

### Qualification state

The C4 profile qualification infrastructure, Runner and Rubric are present. Historical 4B and 9B pilot candidates did not qualify. No 20-run candidate was eligible, and no default model was selected.

Historical evidence remains ignored/local and is not part of the release tree. Sanitized deterministic fixtures and reports remain for regression and provenance.

## i18n

Supported languages:

- English (`en`)
- Simplified Chinese (`zh-CN`)

Core/global/Settings/Home copy lives in `client/js/i18n.js`. Registry tool-specific copy belongs in the owning `.tool.jsx` file. The generated usage report is maintained through `scripts/report-i18n-usage.js` and `docs/reports/i18n-usage-report.md`.

## Current motion and lifecycle state

The application retains:

- Home-to-tool and tool-to-Home morph transitions;
- Settings open/close transitions;
- Home Edit drag/reorder behavior;
- panel shutdown guards;
- timer, observer, polling and pending-host-call cleanup;
- Vela cancellation, late-response, reload and duplicate-bootstrap guards.

Lifecycle and large core-file refactors require focused AE regression because `client/js/main.js` and `client/css/style.css` are compatibility-sensitive.

## Known issues and deferred work

Source of truth: `docs/KNOWN_ISSUES.md`.

The 0.3.1 Vela responsive/status work and narrow semantic-token pass are complete. The token pass covers explicit muted text and proven shared surface, on-accent, danger, and Settings-divider values while preserving established layout and computed visual behavior. Full design-system tokenization is deferred to 0.3.2; Settings scale isolation, Vela responsive structure, and procedural presentation remain unchanged.

The generated i18n report guard is line-ending tolerant and checks working-tree, Git-index, and CI snapshots through their existing boundaries. Grid strict visual bounds, fail-closed input handling, current fixed-cell sizing, and Refresh scale idempotence are closed for 0.3.1.

Other areas to watch:

- Settings Background Engine preset dropdown render/layout issue;
- Windows eyedropper helper taskbar/first-cancel/context-menu MVP limitations;
- AE/CEP caching of old browser or JSX files;
- Home ordering compatibility through stable tool ids;
- remaining host messages that return plain text instead of `messageKey`.

## Release baseline

0.3.0 remains the latest existing immutable published tag. The 0.3.1 release bump is prepared only after the full automated suite and AE P0 regression passed.

The release contains:

- Vela Protocol, Context, Provider, routing and execution safety infrastructure;
- model qualification diagnostics and frozen Rubric;
- Vela Surface and accessibility/lifecycle work;
- explicit experimental LM Studio opt-in and readiness;
- trusted Activation Policy;
- retained 0.2.5 procedural appearance production paths;
- expanded offline, browser VM, loader and production E2E coverage.

`CHANGELOG.md` contains the formal 0.3.1 release section. Existing published tags must not be moved.

## Next development direction

The next development target is **0.3.2 — UI / Design System Foundation**. It should establish a complete semantic token hierarchy and progressively align Vela, Registry Renderer, Settings, and Home without redesigning the accepted Vela structure.

Registry evolves toward a typed Capability Registry consumable by both Agent and Human UI. Capabilities may be `read`, `analyze`, `mutate`, or `create`; a dedicated Human UI is not required for a capability to exist.

Long-term natural-language understanding and candidate generation must remain separate from execution authority. Preserve typed allowlists, parameter schemas, trusted target binding, Context fingerprints, generation/replay protection, fresh Preflight, Execution Guard, Execution Adapter, Host allowlists, and lifecycle fail-closed behavior. Later authority work may replace single-message lexical denial, hard text/proposal splits, universal raw-message provenance, and confirm-every-action as the only authority model, but none of those migrations are part of 0.3.1.
