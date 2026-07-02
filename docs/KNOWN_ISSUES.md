# KNOWN_ISSUES.md

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
