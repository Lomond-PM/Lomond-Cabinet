# DESIGN_SYSTEM.md

## 0.3.2 release authority

The 0.3.2 shared-component and semantic-authority convergence is closed. CoreUI owns reusable component behavior and presentation primitives; Registry and product domains retain declarative schema, meaning, persistence, actions, and composition ownership.

The living Design Tuning Registry contains **67 parameters**. This current set differs from the historical Full Design Calibration 67-parameter snapshot. `spacing.content.inlineInset` and `spacing.content.blockInset` are **POST-CALIBRATION SEMANTIC AUTHORITY ADDITIONS**: the former owns Conversation/Composer left-right content inset at its 12px UI-scaled canonical, and the latter owns their top-bottom content inset at its 8px UI-scaled canonical. `spacing.card.inset` owns Vela shell/card placement, while `spacing.surface.edge` owns Vela Settings edges. Historical calibration totals and U/A/D/X/P classifications remain unchanged.

Appearance-backed Design Tuning entries are mirrors of the original Appearance authority, including the migrated Secondary and Tertiary text roles; they do not create parallel Design Tuning persistence. Final Global Settings composition is **General, Appearance, Advanced, Developer**, with Advanced Appearance Settings nested in the Appearance presentation and Developer content gated by Developer Mode. Final Settings IA is closed and AE accepted.

Design Tuning Full Coverage 中，GLOBAL / COMMON 参数必须覆盖所有适用的 canonical semantic consumers；`spacing.settings.*`、`spacing.registry.*`、`spacing.home.*` 仍是 domain-specific。该 scope 只描述消费边界，不决定最终 Settings IA。UI Scale Peek 使用 semantic visual target + structural ancestor path，祖先只保留布局与 containment。Registry Control Lab 分为 Registry Path 与补充无 schema type 的 CoreUI Direct，完整性由自动测试约束。

Design Tuning 使用 real-consumer transient calibration：`onInput → resolver 内存 transient semantic override → real consumers`，`onCommit → persisted authority → clear transient`。Transient 不持久化、不进入 Promotion Evidence。active gesture 期间 Design Tuning editor root 会局部冻结对应 semantic property，避免调参控件被自身 geometry 反馈扰动；其他 Settings 与真实 consumer 继续实时变化。

有意滚动区域统一使用 Core/UI-owned `.ui-scroll-region` presentation contract。Home、Detail、Settings 和 Vela transcript 共用同一 scrollbar skin；feature stylesheet 不重复拥有 scrollbar 视觉。

Settings 是 specialized content surface，不是独立 UI system。Tool Detail 与 Settings 共用 memory-only Surface Presentation Session（surface identity、main scroll、surface payload）；Settings adapter 仅附加 stable semantic disclosure state。CoreUI、common semantic tokens 与 scroll presentation 属于 shared infrastructure；Settings IA、setting authorities、UI Scale Peek 和 disclosure payload 保持 Settings-specific。

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

The four global UI curve families have canonical CSS defaults:

```js
--motion-curve-enter: cubic-bezier(0.16, 1, 0.3, 1)
--motion-curve-exit: cubic-bezier(0.32, 0, 0.67, 0)
--motion-curve-standard: cubic-bezier(0.22, 1, 0.36, 1)
--motion-curve-press: cubic-bezier(0.2, 0, 0, 1)
```

These are Motion Philosophy assets, not domain choreography. `MotionDefaults` maps semantic roles to family identifiers and resolves WAAPI easing from the current computed CSS value when an interaction begins. Duration remains independent; Settings Motion Speed scales only the established major-view duration roles.

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

## Core UI Component Visual Contract

Generic editable controls use `.ui-*` selectors as their canonical visual contract. Registry-prefixed selectors remain compatibility aliases through at least one complete AE regression cycle; Settings, Registry, and Palette continue to own their composition, layout, persistence, and domain behavior.

`CoreUI.createColorField()` owns reusable swatch/value/Hex DOM and invokes the shared app-level color picker seam. The existing HSV/RGB canvas, portal, positioning, cleanup, eyedropper, and ColorSampler implementation remains shared infrastructure rather than domain policy.

Nested Settings surfaces use the left header control for parent navigation: Settings root returns to Home, while Interface Appearance and Palette Workspace return to Settings. Palette Workspace retains its own lifecycle and unsaved-change gate and is not promoted into a new System Router hierarchy.

## Semantic Typography Contract

Typography is organized by semantic role rather than by a primitive numeric scale. The public roles are page title, surface title, section title, body, control text, supporting copy, eyebrow/category, and code/JSON. `--font-ui` preserves the existing `"Segoe UI", Arial, sans-serif` fallback order; `--font-mono` provides the platform-safe code family used by Palette JSON. The legacy `--font-h1`, `--font-h2`, `--font-h3`, `--font-body`, and `--font-small` variables remain compatibility aliases.

Typography Appearance Phase 1 reserves six stable, persistence-facing Parameter IDs: `typography.title.size`, `typography.sectionTitle.size`, `typography.fieldLabel.size`, `typography.body.size`, `typography.supporting.size`, and `typography.code.size`. Their stored values are bounded relative multipliers, not pixels or CSS custom-property names; Parameter ID and CSS implementation remain separate compatibility layers. Reset removes the override, returning the Resolver to the neutral multiplier `1` against the current Design Default.

The computed model is `Design base size × Typography multiplier × effective UI Scale`. Settings inherits the live root `--ui-scale`, so Home, Tool Detail, Settings, Design Tuning, Calibration Chrome, the active UI Scale field, and Control Lab share one global scale authority. Field Label size is independent from Body size, and Code size is independent from Supporting size. Control intentionally follows effective Body size, while Eyebrow intentionally follows effective Supporting size. Domain-specific weights and all existing line-height contracts remain unchanged.

Interface Appearance presents these six multipliers as percentages in a Typography section grouped as Titles, Content, and Code. Core RangeNumber maps stored `0.90–1.20` multiplier values to role-specific `90–120%` controls without changing the v1 persistence representation. Input and scrub interactions use transient, frame-coalesced preview; change, blur, Enter, or drag completion commits one numeric override; Escape or page exit clears preview; Reset removes the override rather than persisting `1`. The layout continues to own wrapping through explicit composition and `contentGrowth`; the Appearance Resolver never mutates DOM capability classes. Weight, line-height, and font-family parameters remain deferred.

Component aliases retain verified emphasis differences such as Settings field labels, Registry field copy, and Home card titles. Geometry-coupled typography remains local, including Home card wrapping, icon identity glyphs, the fixed bootstrap status, Vela experimental status, transcript line height, compact action line height, and responsive ellipsis rules. Typography tokens are internal design-system contracts and are not Interface Appearance parameters.

Semantic hierarchy is not a numeric level system. Section Title, Field Label, and Supporting form a semantic hierarchy through size, weight, and tone together rather than color alone. Field labels establish the object name through their component-appropriate emphasis and consume `--text-primary`; supporting copy uses a smaller semantic size, regular weight, and the existing `--text-tertiary` / `--text-muted` contract. Registry uses a 600 Field Label weight and 400 Supporting weight, remaining softer than Settings while retaining hierarchy even when configurable text tones are visually close. Generic control typography is the base contract, and domain specializations may override it when their semantic role takes precedence over compatibility styling. Palette JSON is the reference code specialization: its composed Core/Registry textarea keeps generic geometry but resolves family, size, weight, and line height from the code role after the generic textarea rules.

Typography family, size, weight, and line height remain non-user-adjustable. `text.secondary` and `text.tertiary` are future Advanced Appearance candidates only; they are not parameters in the current Typography Foundation.

Typography Appearance size parameters use stable semantic parameter IDs rather than persisted CSS variable names. Weight, line-height, font-family, domain-specific typography controls, and any validated UI/monospace family presets remain deferred; future work must not introduce an independent Text Scale by default or treat design tokens as persistence IDs.

## Semantic Spacing Contract

Spacing is organized by semantic relationship rather than by repeated pixel literals. Public semantic tokens cover stable cross-surface relationships such as the top-level Surface edge inset, passive Card inset, Section stack, and Section Header-to-content separation. Core component aliases cover Field copy and generic inline-control relationships. Settings, Registry, Palette, Home, and Vela retain domain aliases where the relationship is shared but the accepted density differs.

Spacing is distinct from component geometry and layout constraints. Control, button, row, card, icon, composer, slider, and preview dimensions remain geometry contracts. `--view-inset` remains the nested Surface positioning boundary and is not a spacing token. Responsive stacking and Wide / Compact / Narrow structures remain breakpoint-owned rather than being replaced by a global compact-spacing multiplier.

`--space-card-inset` is the canonical passive Card/Surface edge-to-content token. Control-internal padding uses component-owned values or aliases instead. `--space-home-tool-grid` owns the Home tool grid, while Vela uses Vela-owned aliases for its internal controls; the compatibility names `--card-pad`, `--view-pad`, and `--tool-gap` remain temporarily available without defining canonical ownership.

No primitive `--space-1`-style scale is established because the current values do not form a reliable semantic hierarchy. Phase 1 preserves all computed spacing values. Typography stress fixtures and content/geometry resilience work remain deferred to Spacing Foundation Phase 2 after Phase 1 AE acceptance.

Typography resilience uses an explicit content-growth composition seam. Default Settings and Registry Fields retain their accepted centered alignment; a renderer or consumer that semantically declares `contentGrowth: true` projects `.is-content-growth`, allowing the owning domain to align controls near the Field copy start without measuring text, counting characters, or depending on locale. Narrow Registry composition restores stretched stacking, so the wide alignment policy does not replace breakpoint behavior.

Interface Appearance rows are owned by the composed `.settings-field.appearance-advanced-field` grid selector. Label, ColorField, inherited/overridden state, and Reset placement remain grid-owned even though the generic Settings Field rule occurs later in the cascade; narrow presentation explicitly becomes a single-column grid. The test-only Typography Stress Contract validates this ownership and the fixed-geometry exclusions without adding production Appearance parameters.

Phase 2 establishes resilience seams, not unlimited typography configurability. Page, Surface and Section titles, Field Labels, Body, Supporting and Code roles may proceed to bounded Appearance design evaluation. Home Card titles, Vela status/action chrome, Vela composer geometry, and font-family choices retain narrower or preset-only boundaries. Typography Appearance Parameters and Text Scale are not implemented by this phase.

## Semantic Radius Contract

Radius is organized by semantic shape ownership rather than by repeated numeric values. Ordinary UI uses `--radius-section-card`, `--radius-nested-surface`, and `--radius-editable-control` for Section/passive Card surfaces, compact nested surfaces, and editable controls. Their usual visual trend is Section/Card > Nested Surface > Editable Control, but this is not a mandatory mathematical scale. Registry option surfaces use a Registry-owned alias, and Home tool tiles use `--radius-home-tile`, so either domain can evolve without borrowing ordinary Card ownership.

The existing `--radius-xl`, `--radius-lg`, `--radius-md`, and `--radius-sm` variables remain implementation references and compatibility sources; they are not a public xs/sm/md/lg/xl design API. New ordinary UI should select a semantic, component, or domain alias instead of guessing ownership from one of these numeric primitives. Phase 1 keeps every migrated consumer computed-equivalent; the application-wide UI Scale authority is inherited by Settings rather than shadowed by a Settings-only baseline.

`--radius-pill: 999px` represents a capsule geometry invariant rather than the largest radius tier. True circles remain `50%` because their shape also depends on equal width and height. Home icon clipping remains a percentage-based procedural identity through `--radius-home-icon` and its compatibility aliases; it is independent from the Home tile and ordinary surfaces. Palette Preview keeps its domain alias and shell-owned clipping, while its canvas remains square-cornered.

Fixed and specialized geometry stays outside the ordinary hierarchy: detail/settings morph endpoints, the fixed detail shell, Select menu, picker/action floating surfaces, action sheet, Vela, procedural recipes, scrollbar details, and other local component geometry retain their accepted ownership and values. Radius is not currently user-configurable. A future Corner Style direction may evaluate bounded `Sharp`, `Balanced`, and `Rounded` presets only for explicitly participating ordinary surfaces and controls; pill, circle, Home/procedural identity, morph endpoints, and frozen Vela structure must remain excluded.

## Semantic Elevation Contract

Lomond Cabinet uses a mostly-flat hierarchy: ordinary surfaces and controls are separated by surface tone and border, while shadow is reserved for shell separation, read-only information surfaces, Utility and Primary actions, floating surfaces, action containers, domain prominence, and explicit interaction feedback. Passive Cards, Settings Sections, Registry Option surfaces, editable controls, Neutral/Danger actions, status pills, and Home tiles remain no-elevation-by-design. This flat contract does not require an `elevation: none` token and must not be replaced by generic raised Card or Control defaults.

An ordinary embedded Secondary or Neutral Action uses its separated semantic surface, existing border and radius, and no resting elevation. The generic `.panel-local-action` composition seam marks this hierarchy for Settings and Palette actions inside intentionally clipped section/card surfaces; it does not flatten global navigation, Home controls, or other floating controls. An embedded Primary Action combines its emphasized semantic surface with the restrained `--elevation-primary-action`, while a floating surface combines its owned surface and border with a distinctly stronger floating elevation alias. Disabled actions suppress resting elevation regardless of variant. In ordinary sibling flow, later action surfaces paint above neighboring resting shadows; no resting action z-index seam is established.

The canonical static elevation aliases are `--elevation-surface-shell` for the Detail shell, `--elevation-information-surface` for read-only Tool Description and Host Status surfaces, `--elevation-primary-action` for Primary Actions, `--elevation-utility-action` for the shared Utility Action family, `--elevation-floating-surface` for the Select menu, Vela Settings and retained Settings Peek card, `--elevation-floating-picker` for the emphasized Color Picker, and `--elevation-action-container` for the Action Sheet. `--elevation-registry-preview-prominence` remains a scaled Registry preview-domain specialization. Utility Action includes Tool/Settings Back, Edit Home, bootstrap Retry, and Vela Settings/Send/Cancel/Review/Approve/Reject structure; Reject keeps its independent Danger fill. The families preserve their accepted geometry independently; they do not form a numeric level ladder, and no `elevation-0` / `shadow-sm` primitive scale is established.

The legacy raised `.panel-button:not(.utility-action)` shadow is retired: Neutral and Danger remain intentionally flat instead of silently creating another Action elevation family. Fallback Home tool icons retain a protected component optical shadow; procedural-ready icons remain shadow-free, while Home drag keeps its independent two-layer interaction shadow and existing Developer-only intensity seam. Focus rings, component handle shadows, inset contrast edges, picker handle halos, animation suppression, and procedural palette/background lighting are explicit optical or transition exceptions rather than static Elevation authorities. Slider and Switch thumbs consume the explicit `--slider-thumb-optical-shadow` and `--switch-thumb-optical-shadow` component presentation tokens. Their independent `componentOptics.sliderThumbShadow` and `componentOptics.switchThumbShadow` Design Tuning authorities reuse the generic typed ShadowField and project back to those existing tokens; editability does not reclassify either component-optical role as Elevation. The scaled Registry preview prominence token remains an explicit typed-editor exception because its `calc()` grammar cannot safely round-trip through the finite ShadowField grammar.

Elevation is not a User Appearance candidate. Future cross-system Developer Design Tuning may calibrate Surface Shell Shadow Strength, Primary Action Elevation Strength, Floating Shadow Strength, optional floating geometry, independent Border diagnostics, and preview-domain prominence after Typography, Spacing, Radius, Elevation, and Motion foundations are stable. Tuning must support canonical default -> temporary override -> AE calibration -> promote into the canonical semantic default -> remove override with unchanged computed output; no Design Tuning Store or UI is implemented by this Foundation.

## Action / Button Semantic Contract

CoreUI owns the closed base visual semantics for `Primary`, `Neutral`, and `Danger` actions: surface, border, foreground, elevation, and shared interaction-state consumption. Schema-level `Secondary` actions map to CoreUI `Neutral`; `Compact` changes geometry only and does not create another visual role. Disabled actions retain the existing opacity and cursor behavior and must not retain action elevation.

Danger resolves to the Action-only canonical `--danger-surface` Design Default (`rgba(255, 107, 95, 0.22)`), `--danger-border`, and `--danger` foreground with no resting elevation. Hover consumes `--action-danger-hover-surface` (`rgba(255, 107, 95, 0.30)`) so its separation remains stronger than resting. No non-Action status, notice, or state surface consumes `--danger-surface`; those domains retain their independent foreground/status-tone ownership. Registry metadata maps `danger` directly to the CoreUI Danger variant, and the Developer Control Lab provides real full-width Neutral, Primary, and Danger specimens through that pipeline.

Registry action stacks own their sibling rhythm through `--space-registry-action-stack`, currently aliased to the accepted `--space-registry-field-control` source for unchanged computed spacing. This separate alias prevents the action-stack lifecycle from depending on a field-internal label/control relation. The shared `--space-registry-field-block` continues to express Registry schema-block edge inset.

Domains continue to own composition and geometry such as full-width placement, bilingual content, local action rows, Registry sizing, and Settings section layout. Those domain classes may not redefine the canonical role surface merely to reproduce a legacy dark button. Capsule shape remains an independent geometry choice. Existing focus, hover, pressed, keyboard, and motion behavior is preserved by this foundation rather than redesigned.

Navigation and Vela compact actions retain their domain geometry while their explicit `.utility-action` structure consumes the shared Utility surface and resting elevation. Home tool tiles remain outside Action variants. Light-surface diagnostics must confirm that Neutral follows its semantic surface instead of appearing as an isolated dark block, while Utility, Primary, and Danger retain independent authority.

Action/Button semantics are not User Appearance parameters. Future Developer Design Tuning candidates are Primary Action Elevation Strength, Neutral Surface Separation, Primary/Neutral Contrast, Primary/Danger Contrast, Danger Surface Separation, Action Border Strength, Disabled Opacity, and Navigation Elevation/Surface. No tuning store, promotion workflow, or new appearance parameter is introduced by this foundation.

Foundation and future Design Tuning visual acceptance must include both the default dark surface and a light-surface diagnostic. The diagnostic is not a product Light Theme; it is a required inspection condition for detecting hard-coded dark colors, shadow clipping, incorrect surface ownership, and weak border hierarchy.

## Registry Tool UI Contract

### CoreUI component taxonomy and ownership

CoreUI owns generic DOM, native semantics, focus, keyboard behavior, events, visual contracts, and generic normalization. The Registry renderer maps declarative schema to CoreUI and owns visibility/enabled rules plus field binding. A tool/domain owns meaning, persistence policy, host actions, and business state.

- `Checkbox` means selection, acknowledgement, or membership. It commits through the native checkbox `change` event.
- `Switch` means an immediate change to a persistent on/off state. A boolean value alone does not determine which component is correct.
- `ChoiceGroup` is the card-style single-selection component. It owns radio-group ARIA, roving focus, Arrow/Home/End behavior, group disablement, and option disablement.
- Registry `tabs` remains the compatibility schema name and maps internally to `ChoiceGroup`; a future `choiceGroup` schema spelling may be added without changing stored values.
- Registry `range` and `color` reuse `RangeNumber` and `ColorField`. Registry supplies schema policy and preview/commit bindings; compound input synchronization, normalization, focus, and child disabled propagation remain CoreUI responsibilities. The app-level color picker remains infrastructure injected through the ColorField picker seam.
- `Disclosure` owns trigger/content association, native button activation, expanded state, and ARIA. Registry and Settings retain section DOM, layout, persistence, meaning, chevron styling, and the existing Structural Collapse motion contract.

Developer Control Lab exercises Checkbox and Switch separately, a three-option ChoiceGroup including disabled and long bilingual content, Registry Range/Color through their real declarative paths, and a collapsible Registry section. BezierCurveField is the subsequent generic advanced-input contract described below.

### Registry component provenance

Registry Renderer composes shared UI components; it does not create independent visual or interactive primitives. Formal schema fields use `CoreUI.createFieldRow()` for row, label, description and control-region composition, while the renderer retains schema conditions, binding and domain-specific composition. Select creation is active and explicit: `CoreUI.createSelect()` preserves native value/change authority and `CoreUI.enhanceSelect()` owns trigger, body portal, viewport, option presentation, mouse/keyboard interaction, disabled state, focus restoration, single-active coordination and dispose/remount. The former document-wide late-scan ownership is retired.

Registry-specific composites such as sections, Action Fields, Tool Actions, State Cards, Subheadings, Info/Notes, Dividers and Procedural Preview remain Registry-owned, but their reusable visual or interactive primitives must come from the shared component library. Control Lab is a shared-component test consumer, not a source of truth.

A Structural Wrapper is allowed only when it has no independent surface, border/chrome, focus/hover/pressed lifecycle, editable behavior or reusable visual identity and owns layout, grouping, slots, measurement or flow only. Approved Platform / Native Boundaries are limited to explicit value/accessibility/fallback roles such as native Select/options. Specialized Internal Primitives must belong to a named finite editor contract, such as Color Picker channel ranges or canvas geometry; “Registry internal” is not a general exception.

The Registry Primitive Provenance Gate requires every Registry visual or interactive primitive to have an exact shared, composite, platform or specialized provenance. Exceptions are file/function/consumer-specific, documented and test-covered; directory-wide bypasses are prohibited. The accepted baseline is `LOCAL-UNREGISTERED = 0`. The authoritative inventory, maps and current coverage counts are maintained in `docs/SHARED_COMPONENT_CATALOG.md`.

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
- `checkbox` maps to CoreUI Checkbox; `switch` maps to CoreUI Switch without changing the stored boolean shape.
- `range` maps to CoreUI RangeNumber and `color` maps to CoreUI ColorField.
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

- Shape Add has no static Home fallback; the Registry projection owns its single Home card.
- The registry tool keeps the same `shapeAdd` id so saved Home layout order remains meaningful.
- The legacy Shape Add detail panel is retired; Registry Renderer owns the active detail page.
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
- Ad Component Kit has no static Home fallback; Registry metadata owns its Home card, detail page and actions while the stable id preserves saved order.
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

## 0.2.3 Cleanup State And 0.2.4 UI Notes

Before the 0.2.3 release, the current design-system-relevant cleanup state is:

- Ad Component Kit is a unified registry tool with id `ecommerceLayout`, storage `AEToolbox.ecommerceLayout.v1`, schema `host/tools/adComponentKit.tool.jsx`, and host behavior `host/tools/adComponentKit.jsx`.
- Shape Add is a Registry-owned tool; its legacy frontend adapter, duplicate `shapeAdd.item.*` global i18n, old Shape Add CSS, and old global host wrappers are removed.
- Text Background Box is a registry tool with the old frontend adapter removed.
- Registry tool-specific i18n should live in `.tool.jsx`; `client/js/i18n.js` should keep core, Home, Settings, common, and fallback strings.
- Registry Control Lab and Settings Renderer Lab remain Developer Mode-only labs; retired probes should not reappear as formal Home tools.

0.2.4 UI notes on `dev`:

- Closing the CEP panel is mitigated on the 0.2.4 development line through lifecycle guards and Home teardown. This is still a lifecycle/performance concern, not a visual design-system concern.
- Color picker updates include axis modes, channel sliders, Hex input select-all, popup flip / clamp positioning, and a Windows-only eyedropper helper MVP.
- Shape Add native components now use the generic registry section collapse behavior.
- 0.2.5 procedural appearance is part of the shipped baseline retained in the 0.3.0 release-preparation line; future visual changes should be planned separately from the 0.2.4 baseline notes above.

## 0.3.1 Semantic Token Contract

0.3.1 performs only a narrow semantic-token consolidation: muted text has an explicit tertiary alias, and proven shared panel surfaces, on-accent text, danger presentation, and Settings dividers use named tokens without changing their audited values. Full spacing, typography, radius, shadow, and control-size tokenization remains deferred.

Settings retains its fixed UI-scale isolation, Vela retains its existing Wide / Compact / Narrow responsive geometry, and procedural appearance retains its separate runtime presentation ownership.
# Motion / Transition Foundation (0.3.2 Phase 1)

Motion defaults and motion lifecycle are separate capabilities. `MotionDefaults` owns semantic duration/easing roles; `CoreMotion` owns scoped presentation transactions, cancellation, stale-callback guards, frame scheduling, and idempotent cleanup. CSS remains the owner of action feedback, focus immediacy, simple surface state, and collapse presentation. Geometry-dependent spatial surface morphs use domain-provided rects/radii and the shared transaction lifecycle.

## Motion Philosophy curve families

CSS is the single Design Default authority for the global Enter, Exit, Standard, and Press cubic-bezier families. Compatibility names such as `--ease-apple-out` are forwarding aliases only. `MotionDefaults.curveFamilies` maps family identifiers to CSS properties, while `roleCurveFamily` maps semantic roles such as Spatial Expand, View Content Exit, Action Feedback, and Action Press to those families. WAAPI consumers call `resolveEasing(role, root)` at interaction start, so CSS and WAAPI consume the same computed family and a future Design Tuning override affects the next interaction without mutating an animation already in flight.

Motion Philosophy, semantic role, and domain choreography remain separate. A semantic role may later reference a formally owned semantic-local curve asset when real design evidence requires it, but domain consumers must not introduce raw cubic-bezier literals. `motion.speed` and all role durations remain independent from curve control points. Reduced Motion policy and `CoreMotion` finalization retain final execution priority.

Procedural artwork motion is isolated from UI Motion Philosophy. The 18-second Home background drift owns `--procedural-background-drift-curve`; its current computed value is preserved and an override of UI Standard cannot change it. Vela ordinary control response may inherit Standard, while processing pulse, responsive resize, and provider/runtime timing remain domain-local, No Motion, or out of scope as appropriate.

Future Design Tuning may expose stable conceptual parameters such as `motion.curve.enter`, independently mapped to implementation CSS properties; CSS property names are not persistence IDs. Curve calibration remains outside User Appearance and its storage. Promote-to-Default changes the one canonical CSS family value, after which removing the temporary override must leave the computed result unchanged.

## BezierCurveField advanced-input contract

`CoreUI.createBezierCurveField()` is a generic cubic-bezier advanced input inspired by the interaction language of the After Effects Graph Editor. It is not a general GraphEditor, timeline, keyframe system, preset grid, or Motion-specific component. Its sole canonical editable value is `{x1, y1, x2, y2}`: `x1/x2` are finite values constrained to `0–1`, while finite `y1/y2` remain unbounded so anticipation and overshoot are valid. Sampled points, SVG paths, serialized CSS, viewport ranges, and Speed/Influence projections are derived presentation only.

The Progress/Value view maps normalized time to normalized progress and exposes fixed `(0,0)` / `(1,1)` endpoints with P1/P2 tangent handles. Its viewport always includes 0 and 1 and expands for out-of-range Y values. Pointer dragging, keyboard handle adjustment, and the four reused CoreUI NumberInputs all edit the same structured value. Live input and committed change are distinct; invalid drafts never replace the last legal curve, Escape/pointer cancellation restores the edit snapshot, and resize changes presentation only.

The Speed view plots the finite visual projection `dy/dx = (dy/du)/(dx/du)` from the same canonical curve. Start influence is `x1`, start speed is `y1/x1`, end influence is `1-x2`, and end speed is `(1-y2)/(1-x2)`. Direct Speed/Influence manipulation converts back into P1/P2; holding Shift during Speed-handle drag constrains the edit to influence while preserving speed. The AE-inspired influence presentation maps each endpoint's canonical `0–1` influence onto half of the usable graph width, so maximum start/end influence meets at graph center while the Speed curve itself continues across the full normalized-time width. The half-width factor is presentation and inverse-pointer geometry only, never a canonical data restriction. Near-zero influence degrades to an undefined/locked speed handle without invalidating an otherwise legal CSS cubic-bezier; visual clipping prevents non-finite or extreme SVG output and never rewrites canonical data.

Registry `type: "cubicBezier"` maps structured defaults and values to BezierCurveField. CoreUI owns math, DOM, input events, accessibility, focus, cleanup, and generic validation; Registry owns schema conditions and binding; the domain owns meaning, persistence policy, preview/commit application, and any serialization required by a Host action. Motion Design Tuning is only a future consumer and no Motion default, family property, Appearance storage, or Promote-to-Default path is referenced here. The Control Lab contains default, overshoot, readonly, and disabled specimens through the real Registry path. Split view remains deferred. The previously referenced 3×3 UI remains a separate Quick Anchor / Nine-Point Anchor candidate.

`motion.speed` is the persisted **Major View Motion Speed** multiplier. It applies only to major view content and spatial morph presentation, never action feedback, focus, pointer tracking, responsive reflow, Peek qualification, provider/runtime timers, Vela resize, or procedural drift. Business/runtime state, presentation state, and motion transactions are independent; completion of a motion transaction has no authority to commit routes, Registry state, persistence, or tool runtime state.

The current `.is-animating` class remains a domain compatibility guard, not a CoreMotion singleton constraint. Different scoped keys may coexist. Future adapters may therefore provide capsule or other geometry without modifying CoreMotion; identity/content handoff stays in the adapter.

Expected Phase 1 visual delta: **NONE**.

## Motion Phase 2 choreography contracts

## Design Tuning Infrastructure

Design Tuning is an independent developer/designer calibration authority, not User Appearance or ordinary Settings state. Its versioned partial overrides persist only under `AEToolbox.designTuning.v1`. Motion resolution follows canonical default → validated Design Tuning override → existing Major View Motion Speed policy → Reduced Motion policy → interaction snapshot → consumer. Empty or invalid tuning state preserves canonical behavior exactly.

Motion duration canonicals remain exclusively in `MotionDefaults.durations`; the tuning registry maps stable parameter ids to existing semantic roles without copying numeric defaults. The four raw canonical curves remain exclusively in the stylesheet custom properties `--motion-curve-enter`, `--motion-curve-exit`, `--motion-curve-standard`, and `--motion-curve-press`; no JavaScript curve defaults are introduced. Structured curve overrides are validated and projected as root inline custom properties, preserving one computed authority for CSS and WAAPI. Reset removes the inline property so the stylesheet resumes authority.

Projection is application-coordinated: changes apply immediately when no protected Tool/Settings presentation is active, otherwise only the latest pending projection is flushed by the real `endAnimation()` cleanup boundary. Current WAAPI/CSS presentation inputs remain unchanged and the next interaction consumes the new values. The infrastructure exposes reset and promotion-evidence data APIs but adds no Design Tuning Settings UI in this phase.

The Motion v1 calibration UI consumes that infrastructure under Developer → Design Tuning → Motion, with Curves and Durations groups for exactly four curve families and four semantic durations. Curves use the generic CoreUI BezierCurveField: `onInput` changes only the editor-local draft, while `onChange` commits a structured override through the resolver. Durations use CoreUI RangeNumber with consumer-only editing bounds and commit through the same resolver. Default/Overridden text, per-parameter reset, Reset Motion, and read-only promotion evidence are presentation consumers only; no UI code writes CSS, storage, canonical defaults, or source files.

Content reveal during spatial morph is technically valid and AE-verified. Motion v1 calibrates its existing Enter/Exit durations without redefining reveal phase, destination layout, or interactive boundaries; those general phase contracts remain deferred to Surface Transition, which must consume resolved Design Tuning Motion values rather than define parallel timing configuration.

Home presentation handoff is an optional domain choreography component, separate from spatial surface morph. Recede retains opacity `0.42`, scale `0.972`, and apple-out timing; restore retains the `0.44/0.975 → 1/1` keyframes. Tool and Settings adapters choose when to trigger these states. CoreMotion does not know about Home.

Tool identity and content handoff are likewise separate from geometry. Tool open uses a 360ms identity presentation and starts the existing 180ms content enter at `spatial expand - content enter`, so both content and 480ms geometry finish together. During the morph, the existing real `.detail-ui-layer` is temporarily laid out from the already-resolved destination shell geometry while the outer shell clips its presentation. Prepared, destination-laid-out, visible, and interactive are separate states; interaction remains disabled until the spatial transaction completes. Temporary sizing is transaction-bound and removed on completion or cancellation. This seam can be reused by a future Mounted Tool adapter without invoking Home handoff.

Canonical Action press now uses centered `scale(0.96)` with the existing 120ms press easing. Future Design Tuning candidates are press scale/translation, Home recede scale/opacity/duration, and Tool identity/content handoff timing.
## Settings information architecture (0.3.2)

Global Settings is one scroll surface composed of independently collapsible Appearance, Advanced, and gated Developer category stacks. Categories are CoreUI Disclosures, not secondary Settings pages, and multiple categories may remain open. Appearance owns Language, Theme, Interface UI Scale, Major View Motion Speed, semantic Appearance, Typography, Tool Icon Appearance, nested Background disclosure, and the Palette Library launcher. Background UI classification belongs to Appearance while its procedural and Classic/Legacy runtime and persistence remain domain-owned. Advanced is not Developer: it owns Developer Access, while Developer owns Home Calibration and every existing procedural appearance parameter including saturation/brightness/grain. Developer Mode is a persistent visibility gate, not a security boundary. Expanded Settings category disclosures use natural-flow height and visible overflow; only the collapsed state clips to zero. `.settings-content` remains the ordinary vertical scroll owner, so nested disclosure, locale, UI Scale, and responsive reflow cannot leave an ancestor with stale measured geometry.

Registry Control Lab, Settings Renderer Lab, and Procedural Appearance Lab remain real Developer-only Registry/Home tools, but their new Settings quick-launch entries are intentionally deferred. They will not return through Settings-specific animation patches. A separate future Surface Transition Foundation must audit CoreMotion, Home/Tool and Settings open/close, source/return/target identity, navigation ownership, the global animation guard, cancellation, and stale callbacks before defining generic `open(target)`, `close(current/context)`, and `switch(current, target)` protocols.

Vela Settings is a separate, lazily created Vela-owned surface opened by the fixed lower-left Vela Settings button. Endpoint and Model ID remain persistent Vela configuration; acknowledgement, readiness, and enable/disable remain session/runtime state with no authority change. Vela has neither a Global Settings category nor a permanent `settings/vela` route.

Palette Library remains a specialized responsive workspace. Wide mode uses `Library | Splitter | Editor` master-detail topology with independent list/editor scrolling; Narrow mode uses `Library → Editor` natural flow with `.palette-workspace` as its single vertical scroll owner. Narrow selection is owned only by the existing `.is-stacked` responsive state, and mode-specific overflow or sizing rules must not leak into Wide. Scroll ownership and overflow geometry remain consumer-local, while native scrollbar presentation is canonical at the application scope and requires no consumer opt-in class; special visual exceptions must be explicit. CoreUI FieldRow owns editor label/control geometry, while Palette wrappers own only section and vertical composition: row-to-row spacing belongs to the Editor stack, FieldRow internal spacing belongs to the Palette field consumer, and terminal inset belongs to the scroll content boundary. AE runtime DOM geometry—not static selector presence—is the acceptance authority for visual layout correctness. Closing restores the pre-entry Settings scroll position. Settings relocation does not create new parameter IDs, stores, defaults, runtime consumers, or duplicate editors. UI Scale Peek keeps Preview content separate from its surface presentation: the semantic UI Scale anchor owns the visible frame and inset, while only the proven immediate structural host releases shadow clipping; Settings and the controller continue to participate in live UI Scale.
# Design Tuning Full Coverage（0.3.2）

Developer → Design Tuning 当前是完整设计校准工作区，不代表最终 Settings IA。参数在此处出现不改变 runtime authority：Design Tuning-owned 参数写入 `AEToolbox.designTuning.v1`；已有 Appearance 参数复用原 Appearance authority。

Full Coverage 的正式含义是：coverage universe 内每个已成立、具有 canonical source 和真实 consumer 的独立 semantic authority，都明确归入 `EDITABLE`、`MIRROR_EXISTING_AUTHORITY`、`PROTECTED`、`UNSUPPORTED_WITH_REASON` 或 `INTENTIONALLY_NOT_TUNABLE`；它不等于把全部 CSS property 变成参数。Forwarding alias 必须记录 `derivedFrom`，不得建立第二套 override authority。

Motion 的 15 个正式 duration roles 与 4 个 curve families 全部可编辑，duration canonical 仍仅来自 `MotionDefaults`。21 项 Appearance 视觉参数在校准区为 mirror，preview、commit、reset 和 persistence 继续由 Appearance 拥有；`base.accent`、`base.canvas`、`layout.scale`、`motion.speed` 保留专用入口。RGBA alpha authority、含 UI Scale `calc()` 的 Registry Preview elevation 与不存在独立 semantic authority 的 border width 均以具体 typed-round-trip 原因标为 unsupported。三个 Surface Transition identity radius 继续 protected。

Alpha-bearing semantic colors use the generic CoreUI ColorField alpha mode and a structured `{ color: "#rrggbb", alpha: 0..1 }` value. Only the finite canonical `rgba(r, g, b, alpha)` grammar is parsed; raw CSS strings, variables and arbitrary color functions are rejected. Stylesheet tokens remain canonical, while transient and persisted Design Tuning projection serialize validated values back onto the same semantic custom property. Default six-digit ColorField behavior is unchanged.

Calibration consumer-gap closure establishes three reusable surface roles without component-named authority: Conversation Surface for persistent communication containers, Utility Chrome Surface for persistent application chrome, and Utility Action Surface for the shared compact action presentation. Vela's main conversation carrier and the global status base consume the first two roles. Tool/Settings Back, Edit Home, Bootstrap Retry, Vela Settings, and Vela Send/Cancel/confirmation actions consume Utility Action Surface while retaining independent behavior, routing, layout, state, and elevation ownership. The pre-merge `surface.navigationAction` test override migrates one-way to `surface.utilityAction`; only the final authority is persisted.

Registry Tool Description and Host Status cards share the existing Field Surface, Field Border, and Primary Text presentation without acquiring editable Field behavior or geometry. Registry `info` / `note` description and helper cards consume the same Field Surface and Field Border while retaining their supporting-text foreground and read-only geometry. Registry Path remains the editable negative control on the same presentation tokens. The former top-right selection capsule had no interaction or unique state source: it duplicated the same selection summary already projected through Global Status, so its DOM, updater, selectors, and capsule-only copy are removed while Global Status remains the sole presentation owner.

Border, foreground, status-tone, elevation, radius, hover, and pressed contracts remain independently owned by their existing semantic authorities. Conversation Surface, Utility Chrome Surface, Utility Action Surface, and Field Surface are future Theme Palette mapping candidates; no Palette schema, Store, editor, mapping, or procedural-generation authority is changed here.

The former Appearance / Design Tuning `surface.card` authority is retired after consumer tracing proved that it had no production Card-container role: Settings and Registry work surfaces already resolve through Panel Surface, while its only actual container specimen was the Registry Control Lab direct-path fixture. The fixture now tests the production Panel Surface contract. Neutral Actions retain their existing `--action-neutral-surface` canonical independently, and Bezier/number/editable children consume Field Surface. A test fixture cannot establish a Theme Palette role, and container surface changes must not propagate into child control presentation.

Action base surfaces remain role-specific calibration authorities. `surface.neutralAction`, `surface.dangerAction`, and `surface.utilityAction` are independent Design Tuning Color + Alpha parameters projecting to their existing semantic properties; Primary Action continues to delegate to the pre-existing Appearance authority and Store. Neutral, Danger, Utility, and Primary base surfaces do not alias Panel, Field, or one another. Hover, pressed, disabled, processing, approval, rejection, and other interaction/state presentations remain independently owned and are not flattened into the base surface parameters.

Vela Reject remains structurally a Utility Action: Utility owns its border, foreground, geometry, pill identity, layout, placement, and interaction structure. A narrow `.vela-reject-action` modifier changes only the destructive fill, using `--danger-surface` at rest and `--action-danger-hover-surface` on hover. Reject is not remapped to the complete Danger button variant, and Approve remains an unchanged Utility Action.

Every editable Color + Alpha stylesheet canonical must use the finite `rgba(r, g, b, alpha)` grammar accepted by the shared parser, including fully opaque values. A visually equivalent HEX literal is not a valid canonical for this typed authority: it would resolve to `null` during startup calibration evidence capture and make the pre-rendered Settings field invalid before Core Bootstrap begins.

Scrollable editable surfaces created by CoreUI Textarea receive `.ui-editable-scroll`, which shares the scrollbar width, track, thumb, hover, button suppression and corner treatment of `.ui-scroll-region`. Layout-owned textareas disable the native resize grip. Ordinary text wraps and hides horizontal overflow; code, JSON and raw evidence may retain element-owned horizontal scrolling without propagating it to the Settings surface. Accidental overflow must be fixed rather than merely skinned.

Rounded editable surfaces use an outer `.ui-scroll-frame` for border, radius, surface and `overflow:hidden` clipping, with the textarea as the inner scroll owner. CoreUI Textarea defaults to its historically supported vertical resize through a generic project-owned pointer grip; `none`, `horizontal` and `both` are explicit metadata alternatives. Resize geometry is mount-local, bounded by consumer minima and the parent width, and never enters Settings, Appearance or Design Tuning persistence. Vela composer shares the frame and scrollbar presentation but keeps its pre-existing no-resize behavior.

Calibration editor 更新必须是增量 projection；parameter commit 不得重建 Settings composition。Existing Authority Mirrors 是同一 User Appearance authority 的同步投影。UI Scale Peek 由字段的 semantic preview anchor 拥有，不依赖 category DOM 层级。CoreUI RangeNumber 的 `.ui-range` / 正式 range class 共同拥有 slider presentation contract。

Settings 参数的 Slider 创建路径统一归 CoreUI RangeNumber 所有：RangeNumber 无条件提供 `.ui-range`，由基础组件定义轨道、胶囊 thumb、hover/active、focus-visible 与 disabled presentation；consumer class 只负责布局，不得修补 thumb 形状。`trackMin` / `trackMax` 仅定义便于校准的滑轨窗口，数值字段仍按完整 validity bounds 接受输入。Registry Color Picker 的 H/S/V/R/G/B channel slider 是已登记的紧凑专用编辑器例外，不构成 Settings 参数路径。

Scrollbar presentation 是当前 CEP document 的单一应用级 contract，覆盖 app shell、动态挂载节点以及 append 到 `body` 的 Core custom Select portal。Scroll owner 仍由 Settings、Tool、Palette、Vela 等 consumer 的 overflow contract 决定；consumer 不复制 scrollbar skin。Chromium/操作系统拥有的原生 `<select>` 弹出层不属于可可靠样式化的 DOM surface，是明确的平台例外；正式生产参数应优先消费 app-owned Core custom Select。

Core custom Select 的 portal popup 分离外层 Surface 与内层 Scroll Viewport：Surface拥有background、border、radius、elevation与clipping，Viewport在上下inset内拥有option flow、overflow和Scrollbar。Scrollbar视觉继续来自document-global contract，Select不得建立feature-local skin。

Design Tuning参数可通过通用`presentation.labelKey` / `presentation.descriptionKey`提供用户可见语义说明。Elevation在中文UI称为“视觉层级 / 阴影”，避免与geometry height混淆；每个Elevation参数必须说明其真实consumer，且新增参数缺少description metadata时由contract test阻止。

CoreUI ShadowField owns the visible and accessible semantics of its six structured subfields: X Offset, Y Offset, Blur, Spread, Color, and Opacity. Consumers provide localized label presentation metadata but may not infer meaning from field order or add elevation-specific subfield markup. Each label remains grouped with its own control across wide and narrow wrapping.

ShadowField clones its incoming structured value before any user edit, so a control draft can never mutate Resolver canonical or persisted evidence by reference. Number typing and scrubbing, nested ColorField picker/HEX edits, and alpha edits each emit a complete `{ offsetX, offsetY, blur, spread, color, alpha }` value: interaction updates use transient projection, completion commits one persisted override, cancellation restores current authority, and Reset removes override ownership before refreshing all six controls, status, and disabled state. `setValue()` remains the model-to-UI direction; subcontrol callbacks own UI-to-model propagation.

Tool与Settings header是稳定的navigation action layer，Back Button在resting状态即进入该层级。Hover transform只增强interaction presentation，不负责修复基础阴影可见性；Surface Transition期间仍由全局animation guard抑制临时Button shadow。

Design Tuning reset 是原子投影生命周期：先取消当前 transient gesture，再由参数自身 authority 删除 persisted override / inline projection，随后读取 resolver 的 resolved canonical 并通过通用 `setValue` seam 同步当前挂载控件，最后刷新 Default/Overridden 与 Reset 状态。RangeNumber、BezierCurveField、ColorField（含 Alpha）和 ShadowField 均必须支持该 projection；Existing Authority Mirror 继续调用原 Appearance reset 与 binding notification，不进入 Design Tuning Store。

Settings reset actions compose the shared CoreUI Neutral Button family. Per-parameter Reset uses the generic compact size variant; Reset Domain, Reset Motion, and Reset All use the standard size. Size does not create a new surface, radius, or interaction authority, and no Reset selector may impose fixed-square geometry.

Compact size defines intrinsic minimum dimensions but does not own parent layout. Design Tuning parameter Reset explicitly opts out of CSS Grid's default block-axis stretch through `align-self: start`; otherwise a taller copy track can expand the button above its compact height even when the compact class and minimum dimensions are correct.

`elevation.utilityAction` projects the stylesheet-canonical `--elevation-utility-action` structured shadow. It controls only resting Utility Action shadow; hover border/transform, pressed transform, disabled or animation suppression, and Back stacking remain separate contracts. The canonical value was lifted unchanged from the former shared raised-panel-button literal, so introducing the authority has no intended default visual delta.

`elevation.informationSurface` projects the existing single-layer shadow formerly duplicated by `.info-panel`. It is shared by the read-only Tool Description and Host Status cards only; editable Field controls continue to share their surface/border presentation without gaining Card elevation.

CoreUI RangeNumber owns its own value-cluster plus remaining-track grid. The numeric input or inline number/unit cluster occupies the intrinsic first column and the slider owns `minmax(0, 1fr)`; at the shared narrow breakpoint the component stacks internally. Registry, Settings, Design Tuning, Color + Alpha, and Control Lab may supply semantic classes and track bounds but may not duplicate the outer topology. Slider thumb geometry remains internal to the track and cannot determine component layout.

CoreUI ColorField scales its intrinsic swatch/HEX minimums with global UI Scale and explicitly keeps the swatch at shared control height, overriding Button's action-size minimum when Button supplies only the interactive primitive. This keeps ColorField, Color + Alpha, and ShadowField free of low-scale overflow and aligns ShadowField Color and Opacity control centerlines. Control Lab injects the same production `openCoreColorPicker` adapter and owns only specimen preview/commit/cancel state; it does not implement a fixture-only picker.

稳定的 spacing、普通 radius、control geometry 与单层 semantic elevation shadow 可进行 typed runtime override；参与 Surface Transition identity handoff 的 radius 暂以只读形式展示。Elevation 使用通用结构化 shadow contract，stylesheet token 仍是 canonical authority。最终归入 Developer、Advanced 或用户 Appearance 的分类，延期到 AE 全量校准之后决定。
## Vela Settings Ownership

Vela Settings is owned by `Vela Surface -> fixed lower-left Settings button -> lazy Vela-owned modal surface`. Global Settings no longer composes a Vela category and there is no permanent `settings/vela` route. Endpoint and Model ID retain the existing `AEToolbox.settings.v1` persistent authority; acknowledgement, enablement and readiness remain session/runtime-only; qualification and activation policy remain trusted internal authority. The surface reuses CoreUI, semantic tokens and `.ui-scroll-region` without reinitializing conversation or runtime state.

Its presentation consumes Surface Edge, Surface Title and Settings field typography, Section Card radius, Panel surface/border, Floating Surface elevation, CoreUI control geometry, and View Content Enter/Exit motion roles. Lazy creation immediately projects the active locale. The header is the single surface heading; qualification copy remains body introduction rather than a duplicated Vela heading.

## Surface Transition Foundation

Tool Detail and Global Settings spatial morphs share a destination-identity snapshot seam. Destination Identity is the current real target geometry, computed radius, bounded visual presentation, and explicit visibility/handoff ownership. The shell must reach a destination-equivalent frame before the same-boundary reveal and cleanup; cleanup is never the final visible identity change. Layout, visibility, and interaction remain separate states, and spatial shell geometry remains separate from real content layout geometry. Registry and Settings content is laid out at destination size without being transform-scaled or cloned as interactive DOM.

Motion timing authority and transition choreography authority are separate. Geometry is directionally reciprocal, content staging is structurally reciprocal through a shared normalized window, and identity visibility is direction-aware: Open origin readability is secondary because the initiating action identifies it, while Close destination readability is primary. Destination Identity means the visible composite (frame presentation plus artwork projection and the real destination), not merely a convenient transparent inner node. Close must establish destination recognition before source presentation relinquishes readability; the surrogate remains the owner until the real Home destination is ready, and cleanup only transfers ownership and clears transient state.

Once Close destination recognition is established, its presentation remains stable through handoff. The destination surrogate is owned by an independent transition identity layer, not by the fading Home environment or the shrinking/clipping consumer shell. Spatial geometry completion alone does not imply that the real destination is ready for visual ownership; surrogate removal requires presentation equivalence, and the transfer must not visibly strengthen frame or artwork.


Content Visibility is distinct from Surface Identity Visibility, Destination Identity Visibility, and backdrop/environment visibility. Open overlaps destination content reveal with expansion; close is its semantic inverse and overlaps content exit with contraction. The content wrapper may fade and suppress while the spatial carrier remains trackable and the destination icon projection becomes established. Whole-shell fade-out must never mask an endpoint, radius, identity, or cleanup discontinuity.

## Appearance Runtime Stability

Appearance resolution order is canonical/base input, persisted semantic override, then authority-local transient preview. Commit and preview clearing are granular: committing authority A cannot change unrelated authority B, and clearing A's transient reveals A's persisted value rather than its canonical value. Settings-backed authorities persist only after the resolver has accepted and projected the committed value, keeping Store, Resolver, runtime CSS, and controls synchronized in the same lifecycle.

Selected Background Mode, Procedural Renderer Runtime State, and Fallback Presentation are separate authorities. A render failure may temporarily hide the procedural canvas, but it does not rewrite the selected mode. Every non-procedural → procedural transition is a formal activation boundary. Startup, mode activation, and explicit retry share one activation seam: it resolves the current shell/canvas, initializes or remounts when necessary, otherwise updates the selected runtime config before invalidation, clears recoverable failure state, and schedules the current source under a fresh generation while preserving seed/palette/parameters. Home Content Visibility and Background Environment Visibility are independent: the procedural background belongs to persistent App Shell presentation, remains renderable while Settings or a Tool is active, and may defer only when the actual shell/canvas target is unavailable or the document is hidden. Spatial transition presentation must not multiply the persistent environment opacity. Success requires source-field production and pixel transfer into the current visible canvas, not only an active presentation flag.

Applying a theme palette assigns its secondary color to the existing accent authority and its shadow color to the existing `base.canvas` authority. This is an assignment event, not a permanent derived alias: later manual Home Canvas changes remain authoritative until another palette is explicitly applied.

Close additionally separates Spatial Carrier Presentation from Destination Identity Presentation. The carrier keeps the freshly computed source background, border, and shadow unchanged for the entire geometry/radius contraction; the independent destination layer establishes recognition from the real destination composite. At destination-equivalent geometry, cleanup may transfer ownership directly without a pre-handoff carrier fade. Presentation Value Authority remains the real computed source/destination state, while Presentation Transition Strategy decides which owner presents those values over time. A transparent destination frame must not weaken the spatial carrier, and the implementation must neither manufacture an opaque replacement color nor add a late material morph or carrier-opacity window.
