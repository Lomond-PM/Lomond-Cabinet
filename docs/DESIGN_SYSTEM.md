# DESIGN_SYSTEM.md

## Visual Direction

The panel is a Black Gold Minimal Pro UI for After Effects.

Design intent:

- Dark professional tool surface.
- Warm gold accents used sparingly.
- High readability in narrow CEP panels.
- Apple-inspired motion, but not Apple-branded UI.
- No heavy glass stack, no decorative overdraw that hurts CEP performance.

## Color Principles

Current theme uses CSS variables in `client/css/style.css`.

General rules:

- Main background: near-black / deep brown-black.
- Cards: dark gray-black / brown-black surfaces.
- Accent: warm gold for borders, highlights, primary controls, and selection.
- Text: warm white primary, lower-opacity warm secondary/tertiary.
- Use gold as emphasis, not as a large fill unless it is a primary action.

Theme colors can be adjusted in Settings:

- Accent color
- Home background
- Tool icon color
- Tool icon line
- Procedural background colors

## Typography Scale

The UI uses compact typography suitable for CEP panels.

Guidelines:

- App title: largest and boldest text on Home.
- Tool title: strong heading in detail header.
- Section title: small, clear heading inside cards.
- Labels: compact, secondary color.
- Helper text: smaller tertiary color.
- Primary button text: clear and bold.

UI scale is user-adjustable from Settings. New controls must remain readable and avoid horizontal overflow at low scale.

## Home Page Principles

Home uses app-icon-like tool cards.

Rules:

- Tool card icon and short name only.
- No long descriptions under Home icons.
- Icon grid should align by icon centers.
- Home icon order is user-reorderable and saved by `toolId`, not absolute coordinates.
- Edit mode should not break click-to-open behavior when inactive.
- Settings and Edit Home are in the Home header.

## Tool Detail Principles

Tool detail pages use:

- Header with Home/back button.
- Tool title.
- Selection chip.
- Main scrollable content.
- Bottom action sheet for primary operations.

Rules:

- Only show controls for the active tool.
- Put core action buttons in the bottom action sheet when possible.
- Keep cards focused and avoid nested heavy visual effects.
- Use collapsible cards for advanced/default settings.
- Avoid displaying all advanced options at once for complex tools.

## Settings Principles

Settings are separate from tool details.

Current groups:

- Language
- Motion
- UI scale
- Theme
- Procedural background

Rules:

- Global settings should not live inside a specific tool.
- Settings panel size should remain stable while changing UI scale.
- Custom selects should use the project overlay style, not system dropdown styling.
- Persist settings in `localStorage`.

Settings are an app-level core panel, not a registry tool.

Current state:

- The production Settings panel keeps its static shell in `client/index.html`, but migrated sections are rendered from the app-level Settings schema.
- The current behavior remains in `client/js/main.js`.
- `BackgroundEngine` remains legacy behavior and should not be replaced opportunistically.
- `client/js/settingsSchema.js` is the draft app-level data model.
- The production panel currently renders Language, Developer Mode, Motion Speed, UI Scale, Theme colors, and Background Engine controls from the Settings schema.
- The Settings renderer baseline has been restored to the stable path after the failed visual-unification attempt.
- Settings internal content should render through a single content pass and use Settings-specific visual classes such as `settings-renderer`, `settings-section`, `settings-section-header`, `settings-field`, and `settings-action-row`.
- The outer morph shell classes such as `settings-view`, `settings-panel`, and `settings-ui-layer` are shell infrastructure and should not be removed during visual migration.
- Background Engine behavior remains owned by the existing `BackgroundEngine` runtime; the schema renderer preserves the legacy control IDs and storage keys.

Future direction:

- Settings must remain an app-level Settings Schema / Settings Renderer system, not a `host/tools/*.tool.jsx` registry tool.
- Settings UI changes should be focused and AE-tested; do not rewrite the shell or `BackgroundEngine` behavior during unrelated work.
- The Settings Renderer Lab is Developer Mode-only and uses sandbox storage; it must not write production Settings keys.
- Settings i18n belongs to core/global dictionaries in `client/js/i18n.js`.
- Developer Mode is a core setting that controls debug/probe/lab registry tool visibility.
- Developer Mode must not be implemented as a tool-specific condition such as `shapeAddProbe` only.
- Background Engine preset selection should continue using the shared portal-style custom select lifecycle and requires repeated regression testing because the old legacy preset dropdown had a deferred render glitch.

## i18n Copy Rules

- Use concise labels.
- Add both `en` and `zh-CN` keys.
- Prefer `data-i18n` for static DOM.
- Use `I18n.t()` / `tr()` for dynamic text.
- Avoid hard-coded user-visible English or Chinese in `main.js`.
- Host JSX should return `messageKey` when practical; otherwise frontend falls back to `message`.
- Registry tool-specific copy belongs in the owning `host/tools/*.tool.jsx` `i18n` block.
- `client/js/i18n.js` should retain core/global/Settings/Home/legacy fallback copy.
- Before deleting global i18n keys, run `node scripts/report-i18n-usage.js` and review `docs/reports/i18n-usage-report.md`; treat dynamic and fallback paths conservatively.

## Motion System

The motion style is:

- fast start
- strong ease-out
- gentle deceleration
- soft landing
- no linear motion
- no exaggerated bounce

Current JS constants live in `Motion` in `client/js/main.js`:

```js
appleOut: "cubic-bezier(0.16, 1, 0.3, 1)"
appleStandard: "cubic-bezier(0.22, 1, 0.36, 1)"
appleIn: "cubic-bezier(0.32, 0, 0.67, 0)"
press: "cubic-bezier(0.2, 0, 0, 1)"
```

Duration values are scaled by Settings motion speed through `duration(name)`.

## App Launch Morph Rules

The Home-to-tool transition is sensitive.

Rules:

- Do not replace it with a simple card scale animation.
- Preserve the visual relationship between Home icon and tool detail page.
- Avoid animating broad layout properties.
- Keep cleanup order stable to avoid one-frame flashes.
- Do not introduce preview clones whose content differs from the final real detail view unless explicitly requested and verified.
- If editing this area, test open and close at all motion speed values.

## Close Transition Rules

Close should return to Home without:

- a stray square shell
- mispositioned bottom action buttons
- misplaced selection chip
- visible duplicate detail content

Rules:

- Clean transient styles after animation.
- Remove temporary nodes after the real view state is already correct.
- Keep `is-animating` semantics intact.

## Hover / Press / Toast Rules

- Hover: small lift or border/background emphasis.
- Press: quick scale feedback.
- Toast/status: low-disruption status pill near bottom.
- Status text updates should not cause large jumps.
- Disable extra hover effects while `app-shell.is-animating` is active.

## Gaussian Blur Restrictions

Blur is allowed only in limited transition content layers where already implemented and tested.

Avoid:

- body blur
- panel-wide blur
- card-list blur
- control blur
- persistent blur

Do not reintroduce `backdrop-filter`.

## Expensive CSS To Avoid

Avoid or use with strong justification:

- `backdrop-filter`
- SVG filters
- Houdini paint worklets
- `mix-blend-mode`
- high-radius animated blur
- large animated shadows
- mouse-following radial gradients
- animating layout properties

## Procedural Background Rules

Current Home background is implemented in `client/index.html` with:

```html
<div class="home-background">
  <div class="bg-layer bg-base"></div>
  <div class="bg-layer bg-glow"></div>
  <div class="bg-layer bg-grid"></div>
  <div class="bg-layer bg-rings"></div>
  <div class="bg-layer bg-accent"></div>
</div>
```

It is controlled by CSS variables through `BackgroundEngine` in `client/js/main.js`.

Rules:

- Background is for Home only.
- Use CSS variables for parameters.
- No external images.
- No Canvas, WebGL, Houdini, SVG filter, or backdrop filter.
- If motion is enabled, animate only opacity or transform slowly.
- Pause or reduce effect during `.app-shell.is-animating`.

## New Tool UI Consistency

When adding a tool:

- Add a Home icon that fits current icon style.
- Use short Home name only.
- Use tool detail cards for controls.
- Use bottom action sheet for primary tool actions.
- Use `panel-card`, `control-card`, `control-row`, `pill-slider`, `num-input`, `color-shell`, `custom-select` patterns.
- Add i18n keys for every label.
- Do not create a visually separate mini-design system inside one tool.

## Registry Tool UI Contract

Registry tools must be declarative. A `.tool.jsx` file may provide only tool metadata, i18n dictionaries, sections, fields, actions, and host action references.

Registry tools must not:

- Define custom page structure.
- Define custom CSS.
- Hard-code user-visible English or Chinese.
- Render their own controls.
- Add debug metadata to the normal user interface.
- Override Home, Detail, Settings, App Launch, Close, or status behavior.

All user-visible registry text must use i18n keys:

- `titleKey`
- `descriptionKey`
- `section.labelKey`
- `field.labelKey`
- `field.placeholderKey`
- `action.labelKey`
- host result `messageKey`

The frontend registry renderer is the only place that creates UI for registry tools. It must reuse the existing design-system classes:

- `info-panel`
- `intro-panel`
- `panel-card`
- `control-card`
- `card-heading`
- `control-row`
- `switch-row`
- `select-input` / custom select overlay
- `num-input`
- `text-input`
- `color-shell`
- `primary-action`
- `secondary-action`

Current registry schema shape:

```js
{
  id: "toolId",
  titleKey: "tools.toolId.title",
  descriptionKey: "tools.toolId.description",
  category: "layout",
  iconText: "T",
  sections: [
    {
      id: "main",
      labelKey: "tools.toolId.sections.main",
      toggleKey: "enableMain",
      defaultEnabled: true,
      collapsible: true,
      fields: [
        {
          type: "number",
          key: "amount",
          labelKey: "tools.toolId.fields.amount",
          defaultValue: 10,
          min: 0,
          max: 100,
          step: 1
        }
      ]
    }
  ],
  actions: [
    {
      id: "create",
      labelKey: "tools.toolId.actions.create",
      hostFunction: "AEToolbox.tools.toolId.create",
      style: "primary"
    }
  ],
  i18n: {
    en: {},
    "zh-CN": {}
  }
}
```

Section-level toggles are part of the core renderer contract:

- `toggleKey` adds a shared switch in the section header.
- `defaultEnabled` controls the initial enabled state.
- `collapsible: true` allows the section body to collapse.
- Disabled sections must still collect their toggle value.
- Tools must let host actions decide how disabled section data affects execution.

Registry tool values are persisted by the core renderer:

- Storage key: `aeToolbox.registryToolValues.<toolId>`.
- Tools only provide `defaultValue`, `toggleKey`, and `defaultEnabled`.
- The renderer merges schema defaults with saved values when opening a tool.
- Field values, section toggles, and section collapse state are saved automatically.
- Tools must not implement their own `localStorage` handling.

Registry renderer standard controls now include:

- `button` / `actionButton` fields with `variant`, `fullWidth`, `actionId`, and optional center-axis bilingual text.
- `tabs` fields rendered as option cards with `iconText`, translated title, and translated description.
- `visibleWhen` on any field for conditional display based on another field value.
- Developer Mode-only tools may use `debugOnly: true`, `developerOnly: true`, or `category: "debug"` and are hidden from the normal Home view.

Registry action/state capabilities:

- Button fields and footer actions may declare `actionPayload`; the renderer merges that payload into only the clicked action params.
- `actionPayload` is transient. It is not persisted and does not become a user-editable field value.
- If `actionPayload` and schema values use the same key, payload wins for that action call.
- Field-triggered actions must still exist in the tool `actions` list so the host registry can resolve `hostFunction`.
- Actions may use `hidden: true` or `fieldOnly: true` when they are intended only for schema button fields and should not appear in the footer action sheet.
- Button fields may use `clientAction: "resetFields"` with `resetKeys` to restore a specific group of registry field values without resetting the whole tool.
- Tools may declare `stateAction.hostFunction` and optional `stateAction.intervalMs`.
- Host state is runtime-only and must not be written to `localStorage`.
- Fields and actions may use `disabledWhen` / `enabledWhen` with `stateKey` and `equals` to control availability.
- `stateCard` displays translated state values through the shared renderer.
- `refreshStateAfterRun` refreshes host state after a successful action without creating another polling interval.
- `pendingMessageKey`, `successMessageKey`, and `errorMessageKey` are frontend fallbacks. Host `messageKey` still has priority.
- Registry tools must not write tool-specific DOM for state display or disabled buttons.

For bilingual / matchName button text, tools may declare:

```js
{
  type: "button",
  labelKey: "tools.example.actions.rectangle",
  secondaryText: "rectangle",
  secondaryTextType: "matchName",
  textLayout: "centerAxisPair"
}
```

The renderer aligns primary text to the right side of the button center axis and matchName text to the left side of the same axis. Tools must not implement this alignment themselves.

`uiSchema` remains supported as a compatibility shortcut and is treated as one `Parameters` section. New registry tools should prefer `sections`.

## Shape Add Registry Migration Constraint

Shape Add is a compound tool. It must not be treated as a normal parameter-only registry tool.

The phased migration path is:

1. Add core renderer action/state capability.
2. Add hidden `shapeAddProbe.tool.jsx`. Completed and later retired after formal migration.
3. Validate one minimal rectangle action. Completed through the retired probe.
4. Migrate the 19 native shape item buttons. Completed.
5. Migrate Stroke / Fill Shape Layer subtool UI through registry schema while preserving the legacy host implementation. Completed.
6. Remove or simplify remaining obsolete frontend helper code only after AE verification. Completed.
7. Remove legacy host wrappers only when no registered or global caller uses them. Completed.

The formal registry Shape Add uses:

- `host/tools/shapeAdd.tool.jsx` with id `shapeAdd`.
- Full-width secondary registry buttons for the 19 native shape item actions.
- `textLayout: "centerAxisPair"` with AE matchName text for bilingual / matchName alignment.
- `actionPayload` to pass each item's `key` and `matchName`.
- `stateAction` and `stateCard` to show the current target.
- `enabledWhen` / `disabledWhen` style state checks so buttons do not fire without a valid target.
- `refreshStateAfterRun` after each add action.
- Existing legacy host execution in `host/tools/shapeAdd.jsx`; do not rewrite AE layer creation logic for this migration step.
- Registry range/color/full-width button fields for the Stroke / Fill Shape Layer subtool, calling `AEToolbox.runRegisteredToolAction("shapeAdd", "createStrokeFillLayer", paramsJson)` through the registry action path.
- A collapsible Stroke / Fill settings section below the create button, with a local reset button that affects only Stroke / Fill defaults.

Known constraints remain:

- The static Home Shape Add card must not coexist with the dynamic registry `shapeAdd` card.
- The registry tool keeps the same `shapeAdd` id so saved Home layout order remains meaningful.
- The legacy detail panel may remain in markup while the registry detail path owns the active `shapeAdd` page.
- The Stroke / Fill Shape Layer subtool UI is registry-rendered, while host execution remains in `host/tools/shapeAdd.jsx`.
- Plain host `message` strings should continue moving toward `messageKey` normalization.

Do not add Shape Add-specific CSS or custom page structure during this process. Any capability needed by Shape Add should become a reusable core registry renderer capability first.

## Ad Component Kit Registry Migration Constraint

Ad Component Kit is also a compound tool, but its current scope is narrower than Shape Add:

- Feature Stack builder.
- Icon Grid builder.
- Component maintenance actions for refresh, select child layers, and detach.

The current production registry id is `ecommerceLayout`, while the active host implementation is `host/tools/adComponentKit.jsx`. The old `host/tools/ecommerceLayout.jsx` guide/template host module was separately audited and removed because no active runtime path called it.

Current registry design:

- One registry tool owns Feature Stack, Icon Grid, and maintenance actions instead of splitting them into multiple Home entries.
- Id is `ecommerceLayout` so saved Home layout order remains compatible.
- `tabs` / option cards switch Feature Stack vs Icon Grid.
- `visibleWhen` switches fields by `componentKind`.
- `stateAction` and `stateCard` show active comp, selection count, valid text layer count, valid 2D layer count, selected controller type, and action availability.
- `enabledWhen` / `disabledWhen` gate create, refresh, select, and detach actions.
- The tool reuses the existing `host/tools/adComponentKit.jsx` AE creation logic.
- `AEToolbox.ecommerceLayout.v1` remains the storage key to preserve user parameters.
- The registry id remains `ecommerceLayout` for HomeLayout and storage compatibility; do not rename it without a dedicated migration.
- The legacy Ad Component Kit detail DOM, footer actions, frontend event binding, and unused component/ecom CSS have been removed after AE verification.
- The static Home card remains only as a saved-order-compatible Home entry for the same `ecommerceLayout` id; registry metadata owns the active detail page and actions.
- The legacy `host/tools/ecommerceLayout.jsx` host module has been removed; active behavior is `host/tools/adComponentKit.jsx`.

Migration was phased:

1. Schema draft and migration notes.
2. Developer Mode probe with a non-production id such as `adComponentKitProbe`. Completed and later retired after formal migration.
3. Minimal official action validation.
4. Full tabs / visibleWhen migration.
5. Maintenance actions and state card.
6. Same-id replacement of the legacy Home/detail path.
7. Legacy DOM, event, CSS, and i18n cleanup after AE verification. Completed for the frontend detail path.

Do not add Ad Component Kit-specific DOM, CSS, or custom page structure during migration. Any missing UI behavior must become a generic core renderer capability first.

Supported field types in the current generic renderer:

- `text`
- `textarea`
- `number`
- `range`
- `checkbox`
- `select`
- `color`
- `info`
- `divider`
- `button` / `actionButton`
- `tabs`

Action buttons are rendered from `actions`. A registry tool should not create its own footer.

Debug information may only be shown when:

```js
window.AETOOLBOX_DEBUG_REGISTRY === true
```

By default, registry tools must not show `Registry`, tool id, host function, raw schema, or other implementation details in the user-facing detail page.

## 0.2.3 Cleanup State

Before the 0.2.3 release, the current design-system-relevant cleanup state is:

- Ad Component Kit is a unified registry tool with id `ecommerceLayout`, storage `AEToolbox.ecommerceLayout.v1`, schema `host/tools/adComponentKit.tool.jsx`, and host behavior `host/tools/adComponentKit.jsx`.
- Shape Add is a registry tool with legacy frontend adapter, duplicate `shapeAdd.item.*` global i18n, old Shape Add CSS, and old global host wrappers removed.
- Text Background Box is a registry tool with the old frontend adapter removed.
- Registry tool-specific i18n should live in `.tool.jsx`; `client/js/i18n.js` should keep core, Home, Settings, common, and fallback strings.
- Registry Control Lab and Settings Renderer Lab remain Developer Mode-only labs; retired probes should not reappear as formal Home tools.

Deferred 0.2.4 risk:

- Closing the CEP panel can still make AE appear frozen for several seconds to more than ten seconds. This is a lifecycle/performance issue, not a visual design-system issue, and should be handled in a focused future task.
