# KNOWN_ISSUES.md

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
- The attempted migration was rolled back.

Current conclusion:

- Shape Add is a compound tool, not a normal parameter-only registry tool.
- Do not migrate or rewrite Shape Add in one pass.
- Core registry action/state capability has been added.
- The phased migration has moved the 19 native shape item buttons to `shapeAdd.tool.jsx`.
- Stroke / Fill Shape Layer UI is now on the registry path after native item testing, while host creation logic remains legacy.
- The original Home/UI render regression is not currently reproducing on the phased path, but the migration risk should remain documented.

Main risks:

- Static Home entry and dynamic registry tool with the same `shapeAdd` id can conflict; the phased migration removes the static Home card when the registry entry owns `shapeAdd`.
- `HomeLayoutManager` saved order may be affected by replacing a static card with a dynamic card, so the registry tool must keep the same `shapeAdd` id.
- Legacy detail panel and registry detail panel can coexist and conflict during panel switching; this must be tested in AE.
- Shape Add depends on registry `stateAction` host-state refresh through `AEToolbox.tools.shapeAdd.getRegistryState()`.
- The 19 native shape item buttons need action-specific payloads such as `key` and `matchName`.
- Button disabled/enabled state depends on host state, not only local schema.
- Host messages may return plain `message` strings and mojibake; registry migration should prefer `messageKey`.
- Stroke / Fill subtool parameters are now expected to use registry persistence, while host creation remains on the preserved legacy path.
- The tool should not be migrated all at once.

Recommended migration route:

1. Phase 1: Add core registry renderer action/state capability. Completed.
2. Phase 2: Add a hidden `shapeAddProbe.tool.jsx`. Completed; the temporary probe was later retired after formal migration.
3. Phase 3: Migrate one minimal action. Covered by the retired probe and then by the formal registry tool.
4. Phase 4: Migrate the 19 native shape item buttons. Completed.
5. Phase 5: Migrate the Stroke / Fill subtool UI to registry while preserving legacy host execution. Completed.
6. Phase 6: Remove or simplify remaining obsolete frontend helper code only after AE verification. Completed.
7. Phase 7: Remove legacy host wrappers only if no caller uses them. Completed.

Future investigation notes:

- Audit legacy Shape Add Home entry, detail panel, events, host actions, i18n, and CSS dependencies before changing code.
- Extend core registry support for action payloads, host-state controlled disabled states, state/status cards, and after-action state refresh.
- Test each phase in AE before continuing.

Do not remove this note until several future Shape Add changes have been tested in After Effects without Home/detail regressions.

## Ad Component Kit registry migration risk

Status:

Historical migration risk / current registry path completed.

Area:

- Ad Component Kit
- Home tool list
- Registry / legacy tool coexistence
- Saved Home layout order
- Tool detail panel switching
- Feature Stack and Icon Grid host actions

Current conclusion:

- Ad Component Kit has been formally migrated to the registry path.
- The current frontend id is `ecommerceLayout`.
- The current active host module is `host/tools/adComponentKit.jsx`.
- `host/tools/ecommerceLayout.jsx` was audited as unused legacy / experimental host code and removed.
- Ad Component Kit is a compound tool: Feature Stack, Icon Grid, and component maintenance actions.
- The recommended future registry id is `ecommerceLayout` to preserve `aeToolbox.homeToolOrder`.
- The recommended future shape is one registry tool using tabs / option cards and `visibleWhen`, not multiple Home entries.
- Existing AE creation logic in `host/tools/adComponentKit.jsx` should be reused, not rewritten.
- New Feature Stack and Icon Grid output now writes Lomond artifact metadata and can be removed by `Remove Selected Generated Component`.
- Artifact cleanup is intentionally limited to new output with `LOMOND_CABINET_ARTIFACT_V1` metadata and expressions signed with `LOMOND_CABINET_BINDING_V1`.
- The registry UI now places Refresh Selected Component, Select Component Layers, and Remove Selected Generated Component directly below the active create button; the separate Component Maintenance group and Detach Component UI entry were removed.

Main risks:

- A static Home entry and a dynamic registry tool with the same `ecommerceLayout` id can conflict if they coexist.
- Replacing the static card can affect `HomeLayoutManager` saved order unless the id stays stable.
- Legacy detail DOM and registry detail panel can coexist and conflict during detail switching.
- Feature Stack and Icon Grid have different valid-selection requirements and need host state.
- Refresh, select component layers, and detach require selected controller metadata.
- Remove Selected Generated Component must remain metadata-based. It must not delete layers that lack Lomond artifact metadata, must not clean unsigned expressions, and must not use layer-name heuristics for old output.
- Icon Grid uses existing user layers as source bindings; cleanup must not delete those source layers. It should remove the controller, clear metadata / parent bindings, and restore or clear only signed tool expressions.
- Host actions currently return plain `message` strings; registry migration should move toward `messageKey` fallbacks.
- Existing user parameters are stored under `AEToolbox.ecommerceLayout.v1`; persistence migration must not lose values.

Recommended migration route:

1. Phase 1: migration notes and schema draft. Completed.
2. Phase 2: Developer Mode probe with a non-production id such as `adComponentKitProbe`. Completed; the temporary probe was later retired after formal migration.
3. Phase 3: validate one minimal official action.
4. Phase 4: migrate Feature Stack and Icon Grid through tabs / visibleWhen.
5. Phase 5: migrate maintenance actions and stateCard.
6. Phase 6: same-id replacement using `id: "ecommerceLayout"`.
7. Phase 7: remove legacy DOM, event bindings, CSS, and i18n after AE testing.

Do not rename the `ecommerceLayout` registry id or storage key without a dedicated HomeLayout / storage migration.

Do not extend artifact cleanup to legacy no-metadata Ad Component Kit output unless a dedicated migration / audit task defines a safe ownership model.

## CEP panel close freeze

Status:

Mitigated on `dev` for the 0.2.4 development line; still pending broader AE / CEP regression before release.

Area:

- CEP panel shutdown
- App close / unload lifecycle
- Host bridge calls
- Runtime polling / timers
- localStorage save paths

Observed behavior:

- In 0.2.3 and earlier, closing the plugin window can make After Effects appear frozen for several seconds to more than ten seconds.
- This is not addressed in the 0.2.3 release or tag.
- On `dev`, after `fix/panel-close-freeze-audit`, closing from tool detail pages is behaving normally in current testing.
- On `dev`, closing from Home is now noticeably improved and has little to no perceptible impact in current testing.

Current decision:

- Do not treat this as fixed in 0.2.3.
- Do not claim this has shipped until the 0.2.4 release is merged to `main` and tagged.
- Keep the shutdown lifecycle guards in place; do not remove them during unrelated cleanup.
- Continue monitoring close behavior across more AE / CEP environments before 0.2.4 release.
- Run a focused 0.2.4 release regression around Home, Settings, registry tool detail pages, and Developer Mode before publishing.

Mitigation added on `dev`:

- Added a panel shutdown guard so close / unload paths stop new host calls and ignore late callbacks.
- Guarded close-time `CSInterface.evalScript()` use and UI refresh work.
- Stopped selection polling, registry state polling, runtime timers, and pending registry save timers during shutdown.
- Added Home close teardown for Home edit / drag state, Home timers, and document-level drag listeners.

Follow-up notes:

- If the issue returns, first build an instrumentation / reproduction matrix by AE version, CEP version, close location, Developer Mode state, and active panel state.
- Re-audit remaining close-time work, CEP unload behavior, pending `CSInterface.evalScript()` callbacks, Home teardown, observers, listeners, and localStorage writes.
- Avoid large UI refactors as a first response.

## Color picker eyedropper helper limitations

Status:

Windows-only helper MVP on `dev` for the 0.2.4 development line; known limitations accepted for now.

Area:

- Built-in color picker
- ColorSampler provider framework
- Windows helper eyedropper
- PowerShell / WinForms / Drawing overlay

Current implementation:

- The built-in color picker uses a `ColorSampler` provider framework.
- Native `window.EyeDropper` exists in AE CEP, but current testing shows it immediately cancels instead of opening a usable system picker.
- Immediate native EyeDropper cancel marks the native provider unusable for the current session.
- `WindowsHelperProvider` uses a Windows-only PowerShell / WinForms / Drawing helper.
- The helper can pick colors across windows.
- Picked colors synchronize through the existing color setter path for Hex input, preview, swatch, color plane, axis slider, H/S/V/R/G/B channel sliders, and the current color field value.

Known limitations:

- The Windows taskbar may briefly flash while the helper starts or activates the overlay.
- Each new plugin session's first Pick can have unreliable Esc cancellation. In current AE testing, focus may fall back to the AE timeline instead of being captured by the helper overlay.
- Right-click cancel may cancel the helper but can still invoke the CEP WebView default context menu, such as Back / Forward / Print / View Source.
- These limitations currently do not significantly affect the core pick-color workflow, so they are lower priority than the main eyedropper capability.

Current decision:

- Do not treat native `window.EyeDropper` as the primary implementation in AE CEP unless future CEP testing proves it can open reliably.
- Do not replace the helper opportunistically during unrelated color picker work.
- Keep the ColorSampler provider interface stable so a future C# / C++ native helper can replace the PowerShell MVP without changing picker UI, color model, axis modes, sliders, or registry field integration.
- A focused attempt to fix the remaining Windows helper taskbar flash / first-run Esc / right-click menu behavior was tested and rolled back. Those fixes are not part of 0.2.4.
- Future work should prefer a dedicated native helper / C# helper or a separately scoped helper replacement instead of further complex PowerShell overlay focus patches.

## Settings background preset dropdown render glitch

Status:

Deferred / Pending extended regression testing after Background Engine Settings schema migration.

Area:

- Settings panel
- Background Engine preset dropdown
- Dropdown / popover state
- Scroll container / panel layout

Observed behavior:

- In Settings, opening the Background Engine preset dropdown and then clicking elsewhere may occasionally cause render glitches.
- The issue appears related to dropdown close behavior, transient UI state, scroll container layout, or popover cleanup.
- Reproduction is unstable.

Known reproduction clues:

1. Open Settings.
2. Open Background Engine preset dropdown.
3. Click elsewhere in the Settings panel or outside the dropdown.
4. Occasionally the Settings panel layout / scroll / card area renders incorrectly.

Attempted fixes:

- Several attempts were made around dropdown close handling and transient state cleanup.
- No reliable improvement was observed.

Current decision:

- Stop direct legacy dropdown debugging.
- Keep the issue documented until the migrated Settings schema-rendered Background Engine UI is tested repeatedly in AE.
- Background Engine UI migration now routes the preset control through the shared Settings renderer/custom select lifecycle while preserving the existing `BackgroundEngine` behavior layer.
- Settings internal UI shell migration keeps using the shared portal-style select lifecycle; this issue remains pending extended regression verification.
- Do not mark this issue fixed until repeated open/close, ESC, outside click, resize, and language-switch tests show no recurrence.

Future investigation notes:

- Check custom select / dropdown close lifecycle.
- Check document-level pointerdown / click handlers.
- Check duplicate event binding.
- Check scroll container height / overflow state.
- Check stale open / active classes.
- Check whether the dropdown popover should be rendered in a portal layer instead of inside the scroll container.
- Continue validating that the shared portal-style custom select used by the migrated Settings renderer does not reproduce the old layout glitch.
- Consider building a small UI state stress test before further fixes.

Do not claim the issue is fixed.
