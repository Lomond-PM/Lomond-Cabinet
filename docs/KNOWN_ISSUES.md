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
- Shape Add depends on `shapeAdd_getState()` and continuous host-state refresh.
- The 19 native shape item buttons need action-specific payloads such as `key` and `matchName`.
- Button disabled/enabled state depends on host state, not only local schema.
- Host messages may return plain `message` strings and mojibake; registry migration should prefer `messageKey`.
- Stroke / Fill subtool parameters are now expected to use registry persistence, while host creation remains on the preserved legacy path.
- The tool should not be migrated all at once.

Recommended migration route:

1. Phase 1: Add core registry renderer action/state capability. Completed.
2. Phase 2: Add a hidden `shapeAddProbe.tool.jsx`. Completed.
3. Phase 3: Migrate one minimal action. Covered by the probe.
4. Phase 4: Migrate the 19 native shape item buttons. Completed.
5. Phase 5: Migrate the Stroke / Fill subtool UI to registry while preserving legacy host execution. Completed.
6. Phase 6: Remove or simplify remaining obsolete frontend helper code only after AE verification.
7. Phase 7: Remove legacy host wrappers only if no caller uses them.

Future investigation notes:

- Audit legacy Shape Add Home entry, detail panel, events, host actions, i18n, and CSS dependencies before changing code.
- Extend core registry support for action payloads, host-state controlled disabled states, state/status cards, and after-action state refresh.
- Test each phase in AE before continuing.

Do not remove this note until several future Shape Add changes have been tested in After Effects without Home/detail regressions.

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
