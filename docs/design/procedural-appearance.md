# Procedural Appearance Plan for 0.2.5

## Phase 1 Lab Status

The first 0.2.5 implementation phase adds a Developer Mode-only Procedural Appearance Lab.

Implemented scope:

- Shared frontend procedural engine skeleton in `client/js/proceduralAppearance.js`.
- Deterministic FNV-1a-style string hash.
- Deterministic seeded PRNG.
- Normalized generation parameters.
- Shared canvas renderer for `icon` and `background` targets.
- Memory cache keyed by `engineVersion + target + seed + normalizedParams`.
- Registry Lab entry in `host/tools/proceduralAppearanceLab.tool.jsx`.
- Generic registry `proceduralPreview` field type in `client/js/main.js`.
- Explicit procedural preview contract helper in `client/js/proceduralPreviewContract.js`.
- Dependency-scoped preview refresh, lifecycle cleanup, and safe fallback UI at the registry renderer boundary.
- Generic procedural preview CSS in `client/css/style.css` instead of renderer inline visual styles.
- Bounded procedural cache helper in `client/js/proceduralCache.js`.
- Recipe cache capped at 128 LRU entries; raster cache capped at 24 LRU entries.
- Debug cache API: `ProceduralAppearance.clearCache()` and `ProceduralAppearance.getCacheStats()`.
- DPR-aware internal raster rendering with render scale clamped to the range 1-2.
- Apple-inspired curated Palette Library in `client/js/proceduralPaletteLibrary.js`.
- Fixed `paletteId` support for ProceduralAppearance recipes and cache identity.
- Colorful production Home tool icon wiring in `client/js/proceduralHomeIcons.js`.
- Home icon identity is based only on stable tool id / `data-tool`.
- Home Colorful icons use stable `toolId -> paletteId` mapping; palette selection changes color identity but not geometry seed identity.

The Lab is intentionally isolated:

- It remains the experimentation surface even though Colorful procedural Home icons are now wired to production Home cards.
- It does not replace the existing BackgroundEngine.
- It does not modify Settings behavior.
- It does not modify color picker / eyedropper behavior.
- It does not modify Ad Component Kit or Shape Add.
- Preview contract work does not modify the procedural generation algorithm, engine version, seed hashing, palette mapping, warp, ribbon, grain/noise, or deterministic snapshot behavior.
- Cache and DPR work does not modify recipe fields, seed identity, palette mapping, warp, ribbon, grain/noise, or deterministic snapshot behavior.
- Home icon wiring does not modify the procedural generation algorithm, `engineVersion`, seed hashing, warp, ribbon, grain/noise, or deterministic snapshot behavior.
- Palette Library work does not modify the confirmed default shape parameters, geometry recipe, seed hashing, PRNG sequence, `engineVersion`, Home layout/order, or BackgroundEngine.

## Goal

0.2.5 moves the project from the 0.2.4 feature-stabilization line into procedural appearance work.

The goal is to create a deterministic visual system for tool icons and Home background artwork:

- Tool icons are generated from stable tool identifiers.
- A user changing theme colors does not regenerate tool identity.
- The default mode is colorful procedural icons.
- An optional theme-mapped mode can remap generated art toward the current background and accent colors.
- Tool icons should read like full app icons: rounded-square artwork that fills the icon plate, not small decorative glyphs on a flat card.
- The visual language should be soft, abstract, warped gradients.
- Do not use dot/line decoration as the main style.
- Do not introduce transparent glass UI.
- Home background and tool icons should share a visual language but remain separate generation systems.

0.2.5 must not regress the 0.2.4 work: color picker controls, eyedropper MVP, Ad Component Kit cleanup, Shape Add collapsible section, and panel close mitigation.

## 0.2.4 Boundary

0.2.4 is the stable feature line. It includes:

- Panel close freeze mitigation.
- Color picker H / S / V / R / G / B axis modes and channel sliders.
- Hex input click / focus select-all.
- Color picker popup flip / clamp positioning.
- ColorSampler provider framework and Windows-only eyedropper helper MVP.
- Ad Component Kit removable artifacts.
- Shape Add native components collapsible section.

0.2.5 procedural appearance work should not reopen these systems unless a visual integration point is explicitly required.

The eyedropper overlay lifecycle limitations remain known limitations. Do not continue the taskbar flash / first-run Esc / right-click menu fix as part of procedural appearance work.

## Deterministic Rule

For the Lab and all future production integration:

```text
engineVersion + target + seed + normalizedParams -> same output
```

Rules:

- Do not use uncontrolled `Math.random()`.
- All random values must come from the seeded PRNG.
- `icon` and `background` targets share the same engine.
- Targets may use different composition presets.
- Tool icon seed defaults should come from `toolId` / tool hash.
- Background previews may use a manual seed.
- Tool icon output must not overlay letters, initials, or abbreviations.
- The current BackgroundEngine remains available; procedural background is a future optional mode.

## Visual Style

Target style:

- Full rounded-square icon artwork.
- Soft abstract warped gradients.
- A few broad color regions with smooth transitions.
- Subtle depth from value contrast, not glass blur.
- No transparent glass panels, frosted overlays, or heavy shadow stacks.
- No dotted grids, line fields, sparkles, random marks, or diagram-like decoration.
- Icons should be distinguishable by generated color and shape composition even without labels.
- The Home background may echo the icon language at larger scale, but must stay quiet enough for tool cards and Settings controls.

Default icon mode:

- `colorful`: stable generated palettes derived from tool seed.

Optional icon mode:

- `themeMapped`: preserve generated luminance / composition but remap colors toward the current theme background and accent range.

Theme changes must not change the generated seed, shape composition, or tool identity.

## Procedural Icon Engine

The icon engine should be deterministic and side-effect free:

```text
tool id -> hash -> seeded random -> icon recipe -> render
```

Recommended output for the MVP:

- DOM canvas or offscreen canvas rendered to a data URL / bitmap cache.
- Square base size such as 128 or 160 logical pixels.
- Device-pixel-ratio aware rendering.
- Rounded-square clipping at the icon container, not transparency-dependent artwork.
- Cache by `toolId + mode + algorithmVersion + size + devicePixelRatio`.
- The current Lab cache key is `engineVersion + target + seed + normalizedParams`.
- DPR is not part of recipe identity. It may affect the rendered raster dimensions and raster cache entry, but it must not affect recipe generation or public recipe cache keys.

The engine should generate a compact recipe before drawing. A recipe is easier to test than raw pixels:

```js
{
  version: 1,
  seed: 123456789,
  palette: [...],
  blobs: [...],
  warp: {...},
  grain: {...}
}
```

The renderer can then draw:

- Base gradient.
- 3 to 6 large warped blobs.
- Optional subtle value wash.
- Optional fine noise at very low opacity.

Avoid per-frame animation for icon artwork in the MVP. Static icons are cheaper and preserve identity.

## Seed, Hash, And Deterministic Random

Stable seed inputs:

- Primary: registry tool id, for example `shapeAdd`, `textBackgroundBox`, `selectionInfo`, `ecommerceLayout`.
- Optional namespace: `LomondCabinet.icon.v1`.
- Optional fallback for static entries: stable Home tool id.

Do not include:

- Theme color.
- Current language.
- Tool title text.
- Tool order.
- Runtime selection state.
- Date / time.

Recommended hash:

- Use a small deterministic string hash such as FNV-1a 32-bit or Murmur-style 32-bit.
- Store no generated icon state in localStorage unless caching becomes necessary.

Recommended seeded random:

- `mulberry32`, `sfc32`, or another small deterministic PRNG.
- Keep implementation local and documented.
- Expose simple helpers such as `random()`, `range(min, max)`, `pick(array)`.

Algorithm versioning:

- Include `algorithmVersion` in cache keys.
- If the visual algorithm changes later, bump the version so stale cached icons can be discarded.

## Palette Generation

### Curated Palette Library

The 0.2.5 development line now includes a fixed, versioned, Apple-inspired palette library. These palettes are curated for the Lomond Cabinet procedural visual system and must not be described as Apple official palettes.

First palette ids:

- `pacificCyan`
- `blueLavender`
- `tealLuminous`
- `mossGold`
- `plumRose`
- `slateIce`
- `warmCoral`
- `graphiteSilver`

Each palette defines stable roles:

- `shadow`
- `base`
- `secondary`
- `highlight`

Each palette also defines non-linear stops and role weights. The weights guide color mapping only; they must not change geometry, ribbon placement, warp fields, seed hashing, or random call order.

Palette identity:

```text
palette id + palette version + colors + stops + weights -> palette signature
```

The palette signature is included in fixed-palette recipe/cache identity. This means palette content or version changes invalidate cached color recipes without changing the tool seed or geometry recipe.

`algorithmDefault` remains the current algorithmic color path. It preserves existing deterministic snapshots and does not attach a fixed palette signature.

Default colorful mode:

1. Derive a base hue from the seed.
2. Generate 3 to 5 related hues:
   - one primary hue;
   - one analogous hue;
   - one split-complement or triadic accent;
   - one warm/cool counterpoint when contrast is too low.
3. Clamp saturation and value for dark UI readability.
4. Avoid muddy low-saturation palettes unless the seed intentionally produces a muted icon.
5. Ensure minimum contrast between the brightest and darkest generated color.

Suggested ranges:

- Saturation: 45-90%.
- Value: 45-96%.
- Background region value: 22-55%.
- Accent region value: 70-98%.

The palette should create visual memory independent of current app theme.

Fixed palette mode:

1. Resolve `paletteId` from the fixed Palette Library.
2. Map `shadow`, `base`, `secondary`, and `highlight` into existing color roles.
3. Keep `base` dominant, `secondary` visible but controlled, and `highlight` narrow.
4. Do not mechanically split the canvas into four equal color bands.
5. Do not consume the geometry PRNG sequence while resolving palette data.

Home Colorful icon palette mapping:

- `shapeAdd` -> `pacificCyan`
- `textBackgroundBox` -> `blueLavender`
- `selectionInfo` -> `graphiteSilver`
- `ecommerceLayout` -> `warmCoral`
- `proceduralAppearanceLab` -> `tealLuminous`
- `registryControlLab` -> `slateIce`
- `settingsRendererLab` -> `plumRose`

Unmapped tools use a deterministic fallback based only on stable tool id and the fixed palette id list. Language, Home order, theme color, UI scale, and display title must not affect palette mapping.

Not implemented yet:

- User-editable palette library.
- Theme-mapped recolor from app theme tokens.
- Production procedural background palette wiring.

## Theme-Mapped Recolor

Theme-mapped mode should be optional and reversible.

Principle:

- Preserve generated composition and relative luminance.
- Map generated dark regions toward Home background color.
- Map generated bright / accent regions toward theme accent color.
- Keep hue variance so icons do not collapse into a one-note palette.

Possible mapping:

```text
generated color -> luminance t
theme background -> low end
theme accent -> high end
secondary generated hue -> hue offset / local variation
```

Rules:

- Do not recompute seed.
- Do not change blob positions or shapes.
- Do not rewrite saved Home order or tool ids.
- Do not map every icon to identical accent/background gradients.
- Keep a per-tool hue offset derived from seed so theme-mapped icons remain distinguishable.

## Procedural Background MVP

The Home background already uses procedural CSS layers. 0.2.5 can plan a more coherent procedural background without replacing Settings behavior in one step.

MVP direction:

- Keep background generation separate from icon generation.
- Use the same visual vocabulary: large soft warped gradients.
- Use theme colors as the primary user-controlled inputs.
- Keep rendering cheap in CEP.
- Prefer CSS variables or a single static canvas over continuous animation.
- Avoid WebGL, Houdini, SVG filters, backdrop-filter, or large animated blur.

Possible implementation path:

1. Add a background recipe generator with a fixed app-level seed.
2. Render a quiet full-panel background layer.
3. Map existing BackgroundEngine settings into the new recipe when possible.
4. Keep old BackgroundEngine storage keys during migration.

Do not remove or rewrite BackgroundEngine behavior during the first procedural appearance task.

## Suggested File Structure

Recommended implementation files for future branches:

```text
client/js/procedural/
  random.js
  color.js
  iconRecipe.js
  iconRenderer.js
  backgroundRecipe.js
  backgroundRenderer.js
  cache.js
docs/design/procedural-appearance.md
```

If the project prefers fewer files, a single `client/js/proceduralAppearance.js` can be used for the MVP, but keep the internal sections clear:

- hash / PRNG;
- palette;
- icon recipe;
- icon renderer;
- background recipe;
- background renderer;
- cache.

Do not put tool-specific procedural code in registry tools. Tools provide stable ids; core appearance code owns rendering.

## Branch Plan

Recommended branch split:

1. `plan/procedural-appearance-0.2.5`
   - Documentation only.
   - No runtime code.

2. `feat/procedural-icon-engine`
   - Add hash / PRNG / palette / recipe / canvas renderer.
   - Render icons in a small isolated preview path or Developer Mode lab first.

3. `feat/procedural-home-icons`
   - Connect Colorful generated icons to Home tool cards.
   - Preserve existing icon text / fallback path.
   - Keep tool id based identity stable.
   - Do not implement theme-mapped recolor or production procedural background.

4. `feat/procedural-icon-theme-map`
   - Add optional theme-mapped recolor mode.
   - Ensure theme changes do not alter icon recipes.

5. `feat/procedural-background-mvp`
   - Add background recipe/render path.
   - Keep BackgroundEngine storage and Settings semantics intact.

6. `docs/update-procedural-appearance-state`
   - Record tested behavior and remaining limitations.

Each branch should be AE-tested before merging to `dev`.

## Non-Goals

Do not do these as part of the 0.2.5 procedural appearance MVP:

- Do not modify AE host creation algorithms.
- Do not modify tool schemas except for explicit appearance settings if a later task asks.
- Do not change Settings storage semantics.
- Do not rewrite BackgroundEngine in the first pass.
- Do not change the color picker model, sliders, eyedropper provider contract, or popup positioning.
- Do not continue fixing Windows eyedropper overlay taskbar / Esc / right-click lifecycle in this workstream.
- Do not change Ad Component Kit cleanup semantics.
- Do not change Shape Add host behavior.
- Do not introduce transparent glass UI.
- Do not use dot/line decoration as the primary visual language.
- Do not generate new icons when only the theme color changes.

## Tests And Risks

Functional tests:

- Home renders all active tools with stable generated icons.
- Tool icon identity is stable across panel reload, AE restart, language change, theme change, Developer Mode toggle, and Home reorder.
- Theme-mapped mode changes color mapping only, not composition.
- Existing icon fallback still works if canvas rendering fails.
- Settings open / close remains normal.
- Home Edit ordering remains stable.
- Registry tools still open correctly.
- 0.2.4 features do not regress: color picker, eyedropper MVP, Ad Component Kit cleanup, Shape Add collapsible, panel close guard.

Performance tests:

- First Home render should not visibly stall CEP.
- Icon rendering should be cached per session.
- DevicePixelRatio rendering should not allocate excessive canvases.
- No continuous icon animation in MVP.
- Background rendering should not trigger layout loops.

Visual risks:

- Generated icons may look too similar if palette constraints are too narrow.
- Theme-mapped mode may collapse into a one-color theme if hue variance is not preserved.
- Abstract gradients may reduce tool recognizability if text labels are hidden or too small.
- Overly bright icons can fight the black-gold UI.

Mitigation:

- Start with Developer Mode preview / lab.
- Snapshot icons for known tool ids.
- Add a small visual acceptance matrix for dark theme, accent changes, English/Chinese, Developer Mode on/off, and narrow panel width.
