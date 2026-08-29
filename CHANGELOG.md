# Changelog

All notable project-level changes should be documented in this file.

This project follows simple semantic versioning for development handoff:

- `MAJOR`: breaking CEP/package or workflow changes.
- `MINOR`: new tools or substantial user-facing capabilities.
- `PATCH`: fixes, UI adjustments, and documentation updates.

## [Unreleased]

_No unreleased changes._

## [0.3.5] - 2026-08-29

### Planning and authority contracts

- Added the frozen Planning / Authority contract foundation, deterministic CapabilityCompiler, and Legacy Authority Bridge compatibility wiring for closed local `PolicyDecision` production semantics.
- Added ordered one-to-eight-step PlanStore invariants while preserving the rule that `TaskPlan` and raw model output cannot enter the Execution Spine or become authority.
- Kept `AuthorizedPlan` semantic and identity-safe: it carries no trusted native target binding, confirmation nonce, reservation, Host payload, or execution authority.

### Orchestration and review foundations

- Added per-step just-in-time target and value binding, so every mutation step re-enters the existing freshness, permission, replay, reservation, CAS, ExecutionAdapter, and Host safety path at execution time.
- Added AuthorizedPlan materialization, TaskRun-owned process-local `executionArmed`, and PlanController orchestration with ordered execution, failure blocking, cancellation, lifecycle invalidation, and no retry, replan, or rollback.
- Added immutable review-safe PlanReviewProjection snapshots with exact AuthorizedPlan order, closed presentation mappings, revision consistency, observed-versus-execution-time value semantics, and no execution, authority, candidate, native-binding, nonce, reservation, or CAS identity.
- Added a read-only runtime-local ReviewRuntimePort for opaque token-to-projection correlation; tokens are not authority, permission, grants, nonces, or confirmation evidence.

### Production runtime and compatibility

- Production-loads and runtime-owns the materializer, TaskRun factory, projection factory, dormant PlanController, and ReviewRuntimePort on the existing shared PlanStore / ExecutionPreflight mutation-safety spine.
- Added lifecycle-safe suspend, reset-session, and dispose invalidation so stale review correlations and orchestration state cannot resume or schedule later steps.
- Preserved the existing Provider single-proposal → legacy Controller → ConfirmationView → `executeStep(0)` production path and its just-in-time binding behavior.

Production multi-step execution is infrastructure-proven but not user-enabled in 0.3.5. It is deferred by design: no production AuthorizedPlan producer, synthetic producer/debug hook, PlanController accept facade, plan-review Surface, or production confirm/run path exists. A future real producer must own exact revision-bound informed review and enter confirmation through the same gate as immediately runnable PlanController execution. Human-confirmed one-shot multi-step work does not inherently require delegation, but no such producer belongs to the 0.3.5 roadmap.

## [0.3.4] - 2026-08-27

### Vela Agent Runtime / Observation

- Completed the Session, Agent, Scope and turn-identity ownership chain for production Observation, with single-flight refresh, cancellation, freshness guards and bounded immutable projections.
- Added the read/analyze Agent Capability Registry, validated invocation/result envelopes, explicit concurrency contracts and FIFO Host-read serialization.
- Added the read-only `observe-active-composition-v1` vertical slice with lifecycle-owned Active Composition diagnostics and structured Context integration.

### Provider / Prompt

- Added Prompt Builder v4 with a global and profile-stable system prefix followed by turn-dynamic response-contract and trusted-grounding layers.
- Preserved the bounded `proposal-capable-union` behavior: a provisional text-only request becomes union-capable only when trusted Context is eligible, without granting mutation permission.
- Added bounded last-terminal Provider, Context and Host-stage diagnostics without retaining raw prompts, Provider responses, grounding, Host payloads or native project objects.

### Capability / Mutation integration

- Added explicit local capability-to-registered-action mapping for `set-opacity-v1`, with canonical mutation parameters remaining owned by Mutation Capability Contracts.
- Added Runtime startup cross-validation against the registered `vela` / `set-opacity-v1` action while keeping action existence, risk, scope and executability under ActionValidator ownership.
- Preserved the existing Parser, Intent Gate, Review, Confirmation, freshness, permission, replay, reservation, Preflight, ExecutionAdapter and Host mutation-safety boundaries; mapping is not execution authority.

### Stability / development infrastructure

- Hardened After Effects native Project lifecycle tracking with guarded validity and identity checks, conservative generation invalidation and reset-required overflow behavior.
- Fixed qualification fixture portability with repository-enforced LF checkout bytes and canonical LF historical raw-byte hashes.
- Made Context Host assignment-failure fault injection stable across LF and CRLF test sources without changing production behavior.

Planning, TaskRun authority semantics, DelegationGrant, Policy Engine, process-local `executionArmed`, autonomous execution and generic mutation Agent capabilities remain deferred to 0.3.5+ or later.

## [0.3.3] - 2026-08-25

### Vela Agent Runtime Foundation

- Added the append-only typed Session foundation, deterministic projections, in-memory persistence seam, Agent lifecycle, stable AgentScope identity with opaque immutable boundaries, and separated runtime revision domains.
- Added runtime-owned Agent Projection and consumer-only Surface subscription, plus main-owned production Agent lifecycle integration with bounded bootstrap, suspend/resume, reload, and shutdown ownership.
- Added standalone Observation / Agent Context plumbing with one-shot async reads, single-flight and stale guards, immutable snapshots, and no Host Observation, production loading, Capability, model invocation, or authority semantics.
- Closed CEP browser/Node hybrid module publication compatibility for production SessionRuntime, AgentRuntime, and AgentRuntimeOwner; the bounded After Effects 2026 integrated acceptance passed.
- Clarified runtime-state ownership: AgentDriver remains contract-only, future process-local `executionArmed` belongs to TaskRun rather than Agent, and no autonomous or authority-bearing runtime was introduced.

Actual Observation and Capability remain staged to 0.3.4. Planning, TaskRun, executionArmed runtime state, and Authority remain staged to 0.3.5+, with AgentDriver reasoning/autonomous behavior deferred to a later frozen stage.

## [0.3.2] - 2026-08-24

### Design system and shared components

- Converged Registry Renderer controls on shared CoreUI component ownership, provenance, accessibility, interaction, and presentation contracts.
- Added the Appearance and Design Tuning foundations, completed full semantic coverage calibration, and promoted the accepted canonical values without rewriting historical calibration evidence.
- Converged semantic surface, spacing, radius, motion, control, typography, border, action, and elevation authorities across their intended consumers.

### Palette and Settings

- Shipped Palette Store v2 with stable dynamic slots, `DIRECT` / same-palette `REFERENCE` / registered `DERIVED` sources, procedural role bindings, native full-v2 Workspace editing, and legacy compatibility boundaries.
- Added Palette Workspace Save/Cancel, Back/Reopen, responsive presentation, shared Color Picker integration, and one-shot Primary Text palette assignment.
- Finalized the Global Settings information architecture as General, Appearance, Advanced, and Developer, including Advanced Appearance disclosure and generic Developer Mode gating.

### Vela and stability

- Converged Vela presentation and spacing ownership: Card Inset owns shell placement, Content Inline/Block Insets are shared by Conversation and Composer, and Surface Edge owns Vela Settings.
- Preserved the experimental Provider activation and execution-authority boundaries; no 0.3.3 Agent Runtime capability is included.
- Removed project-owned startup/runtime Console warnings and expanded integrated regression coverage across bootstrap, Registry, Settings, Appearance, Palette, Design Tuning, Vela, Provider, i18n, and shared controls.

## [0.3.1] - 2026-08-07

### Vela

- Added the bounded experimental `proposal-capable-union` transition profile for actionable Context, restoring natural-language `set-opacity-v1` proposal reachability while permitting either conversational text or the existing strictly bounded local proposal.
- Kept mutation authority unchanged: model proposals remain identity-free until trusted Review binding and must still pass Intent Gate, Review, Confirmation, fresh Preflight, Execution Guard, Execution Adapter, and the Host allowlist.
- Added bounded Provider diagnostics for provisional/final profile, Context eligibility, response schema/type, and Intent Gate outcome without exposing raw messages, Provider responses, or Host identity.
- Persisted the user's preferred Vela Surface height independently from viewport/UI-scale clamps and Provider session state.
- Preserved complete conversation history and improved transcript scroll behavior.
- Completed Wide/Compact/Narrow responsive status presentation, shared status tones, and resize stabilization without expanding Vela beyond Experimental Preview.
- Expanded the local Provider default/maximum response timeouts and hardened restored-panel Runtime lifecycle recovery.

### Registry and tool architecture

- Added recoverable Core Host/Registry bootstrap and transactional Host Registry publication.
- Centralized the Tool Catalog boundary, then removed retired generic legacy/static catalog APIs.
- Completed Registry-owned Home/catalog migration for Ad Component Kit while retaining the compatibility id `ecommerceLayout`.
- Removed Shape Add compatibility catalog metadata after its Registry-owned path was established.
- Fixed Registry Renderer empty Action Sheet output and section subheadings.
- Removed the legacy Vela Home/detail path so the Persistent Surface is the single production entry.

### Grid

- Added strict visual-bounds measurement through `sourcePointToComp()` with all-or-nothing, fail-closed handling for unsupported or unsafe layers.
- Made Grid Refresh scale-idempotent while preserving Controller transforms.
- Stabilized the current fixed-cell/unified sizing behavior for supported Text, Shape, Solid, Footage, and Precomp inputs.

### UI

- Completed a narrow semantic-token contract pass for `--text-muted`, shared panel surfaces, text on accent, danger surfaces/borders, and the Settings divider.
- Preserved existing computed layout and visuals; this is not a complete Design System tokenization.

### Infrastructure and release safety

- Made the generated i18n report guard portable across LF/CRLF worktrees while retaining local hook, consistency, and CI freshness checks.
- Added and passed the formal 0.3.1 release-readiness suite and AE P0 Release Regression.
- Expanded bootstrap, lifecycle, restored-panel, Provider, Registry, Grid, and generated-report regression coverage.

## [0.3.0] - 2026-08-03

### Added

- Added the persistent Vela conversation Surface with accessible composer, transcript, status, resize, and lifecycle behavior.
- Added explicit, session-only opt-in for the experimental local LM Studio Provider. Provider access remains disabled by default.
- Added loopback-only endpoint validation and local loaded-model readiness checks for `127.0.0.1`, `localhost`, and `[::1]`.
- Added a text conversation path and a guarded `set-opacity-v1` proposal path for explicit opacity edits.
- Added independent Review, Confirmation, Preflight, ExecutionAdapter, and Host boundaries so model proposals cannot execute directly.
- Added a frozen local Activation Policy that identifies Vela as an Experimental Preview and locks production activation while no qualified default model exists.
- Added profile-aware Provider qualification diagnostics, a frozen evaluation rubric, and extensive offline regression infrastructure without selecting a default model.
- Added Surface accessibility, cancellation, late-response protection, reload, suspend/resume, and duplicate-bootstrap regression coverage.

### Changed

- Consolidated Vela Protocol, Context, Provider, Router, execution, Surface, and bootstrap ownership behind bounded local module contracts.
- Changed Provider requests to deterministic profile-specific routing: ordinary conversation accepts text, while explicit opacity extraction accepts only a guarded local proposal.
- Tightened deterministic English and Chinese opacity-command recognition without delegating intent classification to the model.
- Integrated Vela Settings and Surface entry points with the existing app-level Settings and Registry Renderer composition while retaining the legacy Vela fallback.
- Expanded test, diagnostic, generated-report, documentation, browser VM, and production-composition coverage for the complete Vela path.

### Safety

- The experimental Provider is disabled by default, and production activation is locked with `no-qualified-default-model`.
- No local model is qualified, recommended, or selected as the production default in this release.
- A `localProposal` never executes automatically; Review is not Confirmation, and Confirmation does not itself grant Host authority.
- Readiness means only that the configured local model instance is loaded; it is not qualification.
- Reload clears session acknowledgement, enablement, and readiness while retaining only endpoint and Model ID configuration.
- Host execution receives only locally validated trusted payloads after the complete approval and preflight chain.

### Known Issues

- At narrow panel widths, the Vela status/action row and experimental Settings controls can appear cramped or truncated.
- These layout issues are deferred to 0.3.1 and have no safety or execution-path impact.

## [0.2.5] - 2026-07-14

### Added

- Added a Developer Mode-only Procedural Appearance Lab for testing deterministic procedural icon and background generation.
- Added a shared procedural visual engine skeleton with seeded hash, seeded random, normalized params, canvas rendering, and memory cache keys.
- Drafted the 0.2.5 procedural appearance plan for deterministic tool icons, optional theme-mapped recolor, and a procedural background MVP.
- Added `scripts/check-project-consistency.js` for release/version, entrypoint, cache-query, and registry tool structure checks.
- Added an explicit `proceduralPreview` registry field contract and pure contract helper tests for Procedural Appearance Lab previews.
- Added bounded procedural appearance cache helpers and tests for recipe/raster cache limits, LRU behavior, cache stats, and DPR render scaling.
- Added Colorful procedural Home tool icons driven only by stable tool ids, with a dedicated Home icon controller and pure identity/queue tests.
- Added an Apple-inspired curated procedural palette library with 8 fixed versioned palettes, stable palette signatures, and pure palette validation tests.
- Added stable Home tool `paletteId` mapping for Colorful procedural icons while keeping icon seed identity based only on tool id.
- Added optional Home procedural icon Theme-mapped presentation mode, using source-image luminance between the Settings tool icon base and accent colors.
- Added a standalone deterministic Theme Map helper and tests without adding theme colors to procedural recipes or engine cache identity.
- Added Theme Settings dark-endpoint source selection between compatible manual endpoints and a visible Palette Library scale.
- Added an optional production Home procedural background controller with classic/follow-icon-theme/manual-procedural source selection, stable manual seed, resolved palette selection, intensity control, and deterministic background rendering.
- Added a Developer Mode-only collapsible Procedural Appearance Parameters section. Its range/number controls use the shared ProceduralAppearance defaults and update Home icons and the procedural background together.
- Added Developer Mode controls for palette presentation mapping: shadow darkening/chroma, middle-stop lift and position, highlight lift/chroma, and mapping contrast. These affect only Theme-mapped icon/background presentation and keep source recipes unchanged.
- Added Palette Scale presentation mapping from resolved `shadow` / `base` / `highlight` roles, with a one-time secondary-color suggestion for Interface Accent when a source palette is actively selected.
- Added Procedural Appearance Lab palette selection for the fixed palette library.
- Added a Settings Palette Library editor backed by `lomond.proceduralPaletteStore.v1` for custom palettes, built-in overrides, Home tool palette assignment, live icon/background previews, and copy/paste JSON import/export.
- Added `scripts/test-procedural-palette-store.js` for Palette Store validation, persistence, signatures, imports, and tool mapping behavior.

### Changed

- Confirmed `AEToolbox.settings.v1` as the formal production Settings storage contract for the 0.2.5 release line; no v2 migration is included before release.
- Recorded the one-time procedural source-render warm-up after startup as an accepted limitation; palette/theme presentation changes remain presentation-only.
- Aligned 0.2.5 release documentation with the final published state: 0.2.4 is the previous stable baseline and 0.2.5 is the current stable release.
- Replaced the handoff new-tool workflow with a registry-first default path.
- Unified frontend CSS/JS cache query strings to the formal 0.2.5 release build id.
- Clarified host API version versus project release version semantics in `host/index.jsx`.
- Refreshed the i18n usage report after Procedural Appearance Lab entered the registry tool set.
- Scoped Procedural Appearance Lab preview refreshes to declared target, seed, and parameter dependencies instead of passing full registry values to the engine.
- Moved generic procedural preview layout and fallback styling from renderer inline styles into `client/css/style.css`.
- Added ProceduralAppearance `clearCache()` and `getCacheStats()` debug APIs without persisting cache state.
- Updated procedural preview rendering to generate internal rasters at a controlled device-pixel-ratio scale capped at 2 while preserving logical canvas size.
- Split procedural Home background rendering into a cached 0–255 source luminance field and a presentation-only 256-entry theme LUT. Theme changes now reuse the source field and do not clear the engine cache.
- Unified procedural Home background parameter normalization with the shared `ProceduralAppearance.normalizeParams()` defaults; background no longer maintains a separate default parameter table.
- Clarified procedural background invalidation: `followIconTheme` keeps a palette-independent luminance source field while palette id/signature and derived colors only rebuild presentation; manual procedural source palette changes retain source invalidation.
- Exposed shared procedural parameters through the existing `AEToolbox.settings.v1` Settings object, with safe normalization for missing or invalid saved values and a shared-default reset action.
- Tuned the shared default value structure toward cleaner highlights and deeper mid/dark values: brightness `0.88`, highlight concentration `0.52`, highlight area `0.06`, contrast `0.92`, and depth `0.80`.
- Kept procedural Home icon identity independent from language, Home order, Developer Mode, theme colors, and Settings changes.
- Included `paletteId` and palette signature in procedural recipe/cache identity for fixed palettes without changing seed, engine version, or geometry recipe fields.
- Resolved procedural palettes through a Palette Store layer so factory palettes remain source-controlled defaults while user edits stay in localStorage.
- Extracted the Settings Palette Library / Palette Workspace runtime controller from `client/js/main.js` into `client/js/proceduralPaletteWorkspace.js`, keeping Store persistence, editor draft helpers, and Workspace DOM lifecycle responsibilities separated without changing Palette Store schema or user-visible behavior.
- Added `proceduralIconMode` to the existing Settings schema, defaulting to Colorful and persisting with the existing Settings object.
- Added schema-driven Theme Settings groups for Interface Appearance and Tool Icon Appearance, including conditional endpoint controls, a compact luminance ramp, and a Palette Library summary entry.
- Clarified Home Base Color as the existing `--bg-main` surface base, and refreshed Theme palette controls, dynamic source options, and shared disclosure styling.

### Fixed

- Added procedural preview lifecycle cleanup for pending animation-frame renders when switching tools, closing details, or entering panel shutdown.
- Added safe procedural preview fallback handling for missing engines, invalid schema input, unavailable canvas contexts, and render exceptions.
- Added generic Settings visibility/open-state metadata for Theme groups and preserved Settings scroll position when returning from Palette Workspace.
- Fixed Theme-mapped dark endpoint and ramp refreshes after Palette Store changes; the ramp now uses one clipped shell and a borderless inner gradient.
- Fixed shared Settings custom-select overflow with constrained trigger/menu text, viewport-clamped portal menus, and scroll/close cleanup.

### Notes

- The Lab does not replace production Home icons or the current BackgroundEngine.
- Procedural Home background is now an optional production mode; classic BackgroundEngine remains available as the explicit fallback, while the procedural source defaults to following the icon theme. Theme-mapped icon recolor remains separate from source recipe identity.
- Developer Mode controls are an editor surface only; disabling Developer Mode hides the parameter section without changing the stored or active normalized values.
- Procedural preview contract work does not change the procedural generation algorithm, engine version, seed behavior, recipe output, or deterministic snapshot expectations.
- Procedural cache/DPR work does not change palette, warp, ribbon, grain/noise, recipe fields, seed hashing, or production Home/background wiring.
- The curated palette library is Apple-inspired / Apple-like only; it is not an Apple official palette set.
- `algorithmDefault` keeps the existing procedural color path and deterministic snapshot behavior.
- User-editable palette changes remain separate from Theme-mapped presentation; procedural Home background uses the same resolved palette API without changing icon mappings.
- File picker-based palette import/export remains future work; the current editor supports copy/paste JSON import/export.
- The original 0.2.4 color picker / eyedropper / Ad Component Kit cleanup / Shape Add collapsible behavior remains out of scope for this workstream.
- The current duplicate i18n tool-key count is retained because the duplicates are core Settings preset keys also mirrored by Settings Renderer Lab for validation.

## [0.2.4] - 2026-07-09

### Added

- Added H / S / V / R / G / B axis modes to the built-in color picker.
- Added H / S / V / R / G / B single-channel sliders to the built-in color picker.
- Added click / focus select-all behavior for Hex color inputs.
- Added flip / clamp positioning for color picker popups so lower-panel fields can open without clipping.
- Added a ColorSampler provider framework for the built-in color picker eyedropper path, with native EyeDropper, Windows helper, and unavailable-provider boundaries.
- Added a Windows-only eyedropper helper MVP using PowerShell / WinForms / Drawing so the built-in color picker can sample colors across windows and sync results back to Hex, preview, swatch, plane, axis slider, and H/S/V/R/G/B channel sliders.
- Added removable Ad Component Kit artifact metadata for newly created Feature Stack and Icon Grid components, including per-batch `artifactId` ownership data and signed tool expressions.
- Added `Remove Selected Generated Component` for new Ad Component Kit artifacts. Cleanup only trusts `LOMOND_CABINET_ARTIFACT_V1` metadata and only restores / clears expressions signed with `LOMOND_CABINET_BINDING_V1`.
- Added collapsible Shape Add native components section for `Add Native Components` / `添加原生组件`, with persisted section state.

### Fixed

- Mitigated AE freeze when closing the CEP panel by guarding shutdown lifecycle, stopping polling / timers / pending registry saves, and skipping close-time host/UI refresh work.
- Added Home close teardown for Home edit / drag state, Home timers, and document-level drag listeners.
- Moved Ad Component Kit refresh / select / remove actions directly under the active create button, removed the separate Component Maintenance group, and removed the Detach Component entry from the registry UI.

### Changed

- Kept registry tool copy tool-local: Ad Component Kit and Shape Add strings remain in their `.tool.jsx` files instead of moving into `client/js/i18n.js`.
- Kept Settings as an app-level core settings framework, not a normal registry tool.
- Preserved the ColorSampler provider contract so a future C# / C++ color sampler helper can replace the Windows PowerShell MVP without changing picker UI, color model, sliders, or registry field integration.

### Known / Follow-up

- Ad Component Kit artifact cleanup is forward-only. It does not process old generated components without Lomond metadata, does not guess by layer name, and does not clean expressions without the `LOMOND_CABINET_BINDING_V1` signature.
- Native `window.EyeDropper` exists in AE CEP but immediately cancels in current testing, so it is marked unusable for the session and the Windows helper provider is used instead.
- The Windows eyedropper helper is currently an MVP. The Windows taskbar may briefly flash during sampling, first-run Esc cancellation can be unreliable, and right-click cancel may still show the CEP WebView context menu.
- A focused attempt to fix the Windows helper overlay lifecycle issues was tested and rolled back. Those fixes are not included in 0.2.4.
- Future eyedropper work should prefer a dedicated native C# / C++ helper or a focused helper replacement over further complex PowerShell overlay lifecycle patches.
- Continue monitoring close behavior across AE / CEP environments after the 0.2.4 release.
- The panel close mitigation is included in 0.2.4 and is not part of the published 0.2.3 tag.

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
