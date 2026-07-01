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

## i18n Copy Rules

- Use concise labels.
- Add both `en` and `zh-CN` keys.
- Prefer `data-i18n` for static DOM.
- Use `I18n.t()` / `tr()` for dynamic text.
- Avoid hard-coded user-visible English or Chinese in `main.js`.
- Host JSX should return `messageKey` when practical; otherwise frontend falls back to `message`.

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

`uiSchema` remains supported as a compatibility shortcut and is treated as one `Parameters` section. New registry tools should prefer `sections`.

Supported field types in the current generic renderer:

- `text`
- `number`
- `checkbox`
- `select`

Action buttons are rendered from `actions`. A registry tool should not create its own footer.

Debug information may only be shown when:

```js
window.AETOOLBOX_DEBUG_REGISTRY === true
```

By default, registry tools must not show `Registry`, tool id, host function, raw schema, or other implementation details in the user-facing detail page.
