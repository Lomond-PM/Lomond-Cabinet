# KNOWN_ISSUES.md

## Shape Add registry migration caused Home/UI render regression

Status:
Deferred.

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

- Shape Add is a legacy compound tool, not a normal parameter-only registry tool.
- Do not create a same-id `shapeAdd.tool.jsx` replacement as the next step.
- Do not migrate Shape Add in one pass.
- Formal Shape Add registry migration is paused until the core registry renderer supports the required action/state capabilities.

Main risks:

- Static Home entry and dynamic registry tool with the same `shapeAdd` id can conflict.
- `HomeLayoutManager` saved order may be affected by replacing a static card with a dynamic card.
- Legacy detail panel and registry detail panel can coexist and conflict during panel switching.
- Shape Add depends on `shapeAdd_getState()` and continuous host-state refresh.
- The 19 native shape item buttons need action-specific payloads such as `key` and `matchName`.
- Button disabled/enabled state depends on host state, not only local schema.
- Host messages may return plain `message` strings and mojibake; registry migration should prefer `messageKey`.
- Stroke / Fill subtool parameters and local persistence are more complex than a simple action.
- The tool should not be migrated all at once.

Recommended migration route:

1. Phase 1: Add core registry renderer action/state capability.
2. Phase 2: Add a hidden `shapeAddProbe.tool.jsx`.
3. Phase 3: Migrate one minimal action.
4. Phase 4: Migrate the 19 native shape item buttons.
5. Phase 5: Migrate the Stroke / Fill subtool.
6. Phase 6: Perform same-id replacement only after AE verification.
7. Phase 7: Remove legacy code.

Future investigation notes:

- Audit legacy Shape Add Home entry, detail panel, events, host actions, i18n, and CSS dependencies before changing code.
- Extend core registry support for action payloads, host-state controlled disabled states, state/status cards, and after-action state refresh.
- Test each phase in AE before continuing.

Do not mark this issue as fixed until a future Shape Add migration is implemented and tested in After Effects.

## Settings background preset dropdown render glitch

Status:

Deferred / To be handled in future UI stabilization pass.

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

- Stop active debugging for now.
- Keep the issue documented.
- Revisit later in a dedicated UI stabilization pass.

Future investigation notes:

- Check custom select / dropdown close lifecycle.
- Check document-level pointerdown / click handlers.
- Check duplicate event binding.
- Check scroll container height / overflow state.
- Check stale open / active classes.
- Check whether the dropdown popover should be rendered in a portal layer instead of inside the scroll container.
- Consider replacing Settings preset dropdown with the same standardized registry select component if appropriate.
- Consider building a small UI state stress test before further fixes.

Do not claim the issue is fixed.
