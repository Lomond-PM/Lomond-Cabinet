# KNOWN_ISSUES.md

This file records historical migration risks, shipped mitigations that still require monitoring, and unresolved runtime limitations. Do not remove a section merely because the corresponding feature has shipped.

## Shape Add registry migration caused Home/UI render regression

Status:

Historical migration risk / resolved for the current phased registry path.

Area:

- Shape Add
- Home tool list
- Registry / legacy tool coexistence
- Saved Home layout order
- Tool detail panel switching
- Host state refresh

Observed behavior:

- A prior attempt to migrate Shape Add directly to the `.tool.jsx` registry path caused visible Home/UI regression.
- Home tool entries and visual styling appeared inconsistent with the stable panel state.
- The attempted one-pass migration was rolled back.

Current conclusion:

- Shape Add is a compound tool, not a normal parameter-only registry tool.
- Core registry action/state capability is in place.
- The 19 native shape item buttons and Stroke / Fill UI use the registry path.
- Host creation behavior remains in the preserved `host/tools/shapeAdd.jsx` module.
- The obsolete probe, frontend adapter, duplicate global i18n, legacy CSS, and old host wrappers were removed only after AE testing.
- The original Home/UI regression is not currently reproducing, but the migration risk remains relevant to future structural changes.

Main risks:

- Static and dynamic Home entries with the same `shapeAdd` id can conflict.
- `HomeLayoutManager` saved order depends on the stable `shapeAdd` id.
- Legacy and registry detail panels must not be allowed to coexist again.
- Button enabled state depends on host state, not only local schema.
- Shape Add host behavior must not be rewritten opportunistically during UI or procedural appearance work.

Do not remove this note until several future Shape Add changes have been tested in After Effects without Home/detail regressions.

## Ad Component Kit registry migration risk

Status:

Historical migration risk / current registry path completed.

Area:

- Ad Component Kit
- Home tool list
- Saved Home layout order
- Feature Stack and Icon Grid host actions
- Generated artifact ownership and cleanup

Current conclusion:

- The frontend and registry id remains `ecommerceLayout` for Home order and storage compatibility.
- The active host module is `host/tools/adComponentKit.jsx`.
- The unused legacy / experimental `host/tools/ecommerceLayout.jsx` module was removed.
- Feature Stack, Icon Grid, and maintenance actions are owned by one registry tool.
- New output writes `LOMOND_CABINET_ARTIFACT_V1` ownership metadata.
- Tool-owned expressions use the `LOMOND_CABINET_BINDING_V1` signature.
- `Remove Selected Generated Component` is intentionally forward-only.

Main risks:

- Do not rename `ecommerceLayout` or `AEToolbox.ecommerceLayout.v1` without a dedicated HomeLayout and storage migration.
- Cleanup must never delete layers that lack Lomond artifact metadata.
- Cleanup must not use layer-name heuristics for old output.
- Icon Grid source layers are user-owned and must not be deleted.
- Only expressions with the matching Lomond signature may be restored or cleared.
- Host action messages should continue moving toward `messageKey` fallbacks without changing the AE algorithms.

Do not extend artifact cleanup to legacy no-metadata output unless a dedicated audit defines a safe ownership model.

## CEP panel close freeze

Status:

Mitigation shipped in 0.2.4; continued cross-environment monitoring required.

Area:

- CEP panel shutdown
- App close / unload lifecycle
- Host bridge calls
- Runtime polling / timers
- localStorage save paths

Historical behavior:

- In 0.2.3 and earlier, closing the plugin window could make After Effects appear frozen for several seconds to more than ten seconds.

Shipped mitigation:

- 0.2.4 added a shutdown guard that stops new host calls and ignores late callbacks.
- Selection polling, registry state polling, runtime timers, and pending registry saves are stopped during shutdown.
- Home edit / drag state, Home timers, and document-level drag listeners are torn down.
- Current testing shows normal close behavior from detail pages and substantially improved close behavior from Home.

Current decision:

- Treat the mitigation as shipped in 0.2.4, not as a pending release item.
- Do not remove the lifecycle guards during unrelated cleanup.
- Do not claim the underlying CEP behavior is universally resolved until broader AE / CEP testing supports that conclusion.
- Continue regression testing close behavior from Home, Home Edit, Settings, registry detail pages, and Developer Mode states.

If the issue returns, first build an instrumentation and reproduction matrix by AE version, CEP version, close location, Developer Mode state, and active panel state. Avoid large UI refactors as the first response.

## Color picker eyedropper helper limitations

Status:

Windows helper MVP shipped in 0.2.4 with accepted limitations.

Area:

- Built-in color picker
- ColorSampler provider framework
- Windows helper eyedropper
- PowerShell / WinForms / Drawing overlay

Current implementation:

- Native `window.EyeDropper` exists in AE CEP but immediately cancels in current testing and is marked unusable for that session.
- `WindowsHelperProvider` is the working Windows path and can sample across windows.
- Picked colors synchronize through the existing Hex, preview, swatch, plane, axis, and H/S/V/R/G/B control paths.

Known limitations:

- The Windows taskbar may briefly flash while the helper starts or activates the overlay.
- The first Pick in a new plugin session can have unreliable Esc cancellation.
- Right-click cancel can still invoke the CEP WebView context menu.

Current decision:

- Do not treat native EyeDropper as the primary AE CEP implementation unless future testing proves it reliable.
- Keep the ColorSampler provider contract stable.
- Do not resume complex PowerShell overlay focus patches during unrelated work.
- Prefer a dedicated C# / C++ helper or separately scoped helper replacement for future improvements.

## Settings background preset dropdown render glitch

Status:

Deferred / pending extended regression testing after the Settings schema migration.

Area:

- Settings panel
- Background Engine preset dropdown
- Dropdown / popover state
- Scroll container / panel layout

Observed behavior:

- Opening the Background Engine preset dropdown and then clicking elsewhere may occasionally cause layout or render glitches.
- Reproduction is unstable.

Current decision:

- Keep the issue documented until repeated AE tests cover open/close, Esc, outside click, resize, language switching, and narrow panel widths.
- The production Settings renderer should continue using the shared portal-style custom select lifecycle.
- Do not rewrite `BackgroundEngine` behavior as part of dropdown debugging.
- Do not mark this issue fixed based on a single successful session.

Future investigation should check duplicate event binding, stale open/active classes, document-level pointer handlers, scroll-container overflow, and popover cleanup. A focused UI state stress test is preferable to further ad hoc patches.

## Procedural Palette Editor MVP limitations

Status:

Accepted 0.2.5 limitation.

Area:

- Settings Palette Library
- Procedural Palette Store
- Procedural Appearance Lab palette select
- Import / export workflow

Current implementation:

- Built-in palettes remain factory defaults in `client/js/proceduralPaletteLibrary.js`.
- User custom palettes, built-in overrides, hidden built-ins, and Home tool palette assignments persist in `localStorage` under `lomond.proceduralPaletteStore.v1`.
- Settings exposes a Palette Library editor with color / stops / weights editing, Home tool mapping, live icon/background previews, and copy/paste JSON replace/merge.

Known limitations:

- The GUI does not write user data to source files, by design.
- File picker-based import/export is not implemented yet; use copy/paste JSON.
- Procedural Appearance Lab still uses the host-declared fixed palette select. User-created palettes appear in Settings/Home mapping, but dynamic Lab select options require a future generic registry dynamic-options provider.
- The current persistence layer is localStorage only. A user data JSON file location can be added later if needed.

Do not solve these by hard-coding tool-specific DOM hacks into the registry renderer or by writing generated palette data back into `proceduralPaletteLibrary.js`.

## Procedural source render warm-up

Status:

Accepted 0.2.5 limitation.

The first source/geometry parameter change after plugin startup may incur a one-time render warm-up delay. Subsequent source changes are noticeably faster. This is currently acceptable for the Developer Mode procedural controls. Palette/theme presentation changes should remain presentation-only and must not trigger the complete source rebuild.

## Vela narrow status row reflow

Status:

Deferred to 0.3.1. The D2-A AE CEP Surface smoke test passed with this known layout issue.

At narrow panel widths, the Vela status row does not reflow above the action row and can
appear cramped or truncated in the bottom controls. This has no safety or execution-path
impact. Do not temporarily change the breakpoint, DOM order, or grid structure as part of
D2-A closeout; address the reflow in the dedicated 0.3.1 layout pass.

The Vela experimental Settings helper text, acknowledgement, actions, and readiness
feedback are also cramped at narrow panel widths. This is deferred to 0.3.1 and has no
safety or execution-path impact.
