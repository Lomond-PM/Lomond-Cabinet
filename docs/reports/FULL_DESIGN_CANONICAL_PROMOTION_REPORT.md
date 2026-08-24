# 0.3.2 Full Design Canonical Promotion Report

This is an **audit / report artifact** of the Canonical Promotion phase. It is not a runtime authority and is not consumed by production code. The authoritative calibration decision record remains `docs/reports/FULL_DESIGN_CALIBRATION_WORKSHEET.md`; this report records how the 37 **A** calibrated values were promoted to the true canonical authorities and how parity is verified.

## Baseline

- Worksheet final classification: `TOTAL = 67`, `U = 27`, `A = 37`, `D = 0`, `X = 0`, `P = 3`.
- P (Protected, unchanged): `radius.sectionCard`, `radius.homeTile`, `radius.homeIcon`.
- The user's real AE calibration state contributed 39 persisted Design Tuning overrides; of these, 37 are **A** (promoted) and 2 are **U** (`spacing.registry.fieldControl = 14`, `spacing.home.toolGrid = 16`) whose values equal their canonical.

## Promotion Rule

- `U` → KEEP CANONICAL (no semantic canonical change).
- `A` → PROMOTE CALIBRATED VALUE TO CANONICAL (the only 37 canonical code changes).
- `P` → PROTECTED / NO CHANGE.
- `D = 0`, `X = 0`.

## Canonical Authority Mapping

| Domain | Canonical owner | # A |
| --- | --- | --- |
| Motion durations | `client/js/ui/motionDefaults.js` (`durations`) | 8 |
| Motion curves | `client/css/style.css` (`--motion-curve-*`) | 3 |
| Spacing | `client/css/style.css` (`--space-*`) | 13 |
| Radius | `client/css/style.css` (`--radius-*`) | 3 |
| Controls / Geometry | `client/css/style.css` (`--control-height`, `--button-height`, `--*-optical-shadow`) | 4 |
| Elevation | `client/css/style.css` (`--elevation-*`) | 4 |
| Surface | `client/css/style.css` (`--surface-utility-action`, `--action-neutral-surface`) | 2 |

## 37 A Manifest / Before → After

| Parameter ID | Canonical Before | Canonical After (calibrated) |
| --- | --- | --- |
| `motion.curve.exit` | cubic-bezier(0.32, 0, 0.67, 0) | cubic-bezier(0.0421, 0.5278, 0.1749, 0.999) |
| `motion.curve.standard` | cubic-bezier(0.22, 1, 0.36, 1) | cubic-bezier(0.0273, 1.0024, 0.36, 1) |
| `motion.curve.press` | cubic-bezier(0.2, 0, 0, 1) | cubic-bezier(0.2486, -0.6113, 0.3389, 1.325) |
| `motion.duration.spatialExpand` | 480ms | 460ms |
| `motion.duration.spatialContract` | 360ms | 400ms |
| `motion.duration.viewContentEnter` | 180ms | 400ms |
| `motion.duration.viewContentExit` | 120ms | 340ms |
| `motion.duration.homeHandoffRecede` | 260ms | 220ms |
| `motion.duration.homeHandoffRestore` | 260ms | 300ms |
| `motion.duration.spatialIdentity` | 260ms | 330ms |
| `motion.duration.toolIdentityOpen` | 360ms | 450ms |
| `spacing.surface.edge` | 18px | 22px |
| `spacing.section.stack` | 12px | 28px |
| `spacing.section.headerContent` | 11px | 24px |
| `spacing.field.copy` | 2px | 10px |
| `spacing.field.block` | 7px | 14px |
| `spacing.control.inline` | 8px | 10px |
| `spacing.registry.cardInset` | 14px | 30px |
| `spacing.registry.introContent` | 14px | 22px |
| `spacing.registry.sectionHeaderContent` | 14px | 12px |
| `spacing.registry.sectionCopy` | 5px | 4px |
| `spacing.registry.fieldCopy` | 3px | 4px |
| `spacing.home.majorStack` | 16px | 30px |
| `spacing.home.cardTitle` | 11px | 14px |
| `radius.primaryWorkSurface` | 22px (`--radius-lg`) | 35px (own token) |
| `radius.nestedSurface` | 16px (`--radius-md`) | 28px (own token) |
| `radius.editableControl` | 10px (`--radius-sm`) | 20px (own token) |
| `geometry.control.height` | 30px | 22px |
| `geometry.button.height` | 38px | 40px |
| `componentOptics.sliderThumbShadow` | 0 2px 8px rgba(0, 0, 0, 0.32) | 0 4px 16px rgba(92, 191, 255, 0.79) |
| `componentOptics.switchThumbShadow` | 0 2px 8px rgba(0, 0, 0, 0.28) | 0 4px 16px rgba(92, 191, 255, 0.79) |
| `elevation.utilityAction` | 0 12px 30px rgba(0, 0, 0, 0.28) | 0 8px 28px rgba(48, 196, 255, 0.46) |
| `elevation.floatingSurface` | 0 12px 26px rgba(0, 0, 0, 0.34) | 0 10px 48px rgba(72, 146, 214, 0.51) |
| `elevation.floatingPicker` | 0 14px 28px rgba(0, 0, 0, 0.42) | 0 10px 48px rgba(72, 146, 214, 0.51) |
| `elevation.actionContainer` | 0 12px 30px rgba(0, 0, 0, 0.28) | 0 8px 30px rgba(113, 224, 255, 0.32) |
| `surface.utilityAction` | rgba(18, 17, 14, 1) | rgba(16, 63, 103, 1) |
| `surface.neutralAction` | rgba(15, 14, 11, 1) | rgba(60, 82, 105, 1) |

## Protected (unchanged)

- `radius.sectionCard` → `var(--radius-lg)` = 22px.
- `radius.homeTile` → `var(--radius-lg)` = 22px.
- `radius.homeIcon` → 25.5%.
- `--radius-lg` / `--radius-md` / `--radius-sm` bases remain 22 / 16 / 10px; the three calibrated radius tokens were decoupled from these bases so Protected identity is never changed.

## Typed Parity Verification

`scripts/test-canonical-promotion.js` re-reads the clean-state canonical for every A parameter from the actual canonical authority (MotionDefaults durations, CSS declared value parsed by the shared `parseShadowValue` / `parseColorAlphaValue` / `parseNumeric` / cubic-bezier parser) and asserts typed equality with the worksheet `Calibrated Value`:

- `A = 37` promoted with typed parity.
- `P = 3` unchanged.
- clean-state default (no Design Tuning overrides) reproduces the accepted snapshot for all 37 A.
- `resetAll` is idempotent: clearing overrides leaves the resolved values equal to the calibrated snapshot.

## Design Tuning Authority Preservation

Design Tuning remains a formal calibration system; the promotion changes only the canonical baseline values in `MotionDefaults` / canonical CSS. No Design Tuning Registry entries, overrides functionality, transient calibration, or UI were removed or disabled.

## AE Acceptance（CLOSED / AE ACCEPTED）

Canonical Promotion changes the *value source*, not the visual result. The user completed the real AE two-phase acceptance and confirmed all checkpoints:

1. **Existing overrides parity — PASS.** The promoted build rendered identically to pre-promotion with the original 39 Design Tuning overrides present (override == new canonical; no double-application or visual drift).
2. **Reset All 39 → 0 — PASS.** The user cleared `AEToolbox.designTuning.v1` overrides via Design Tuning Reset All; override count went `39 → 0`. This is a user calibration-lifecycle action, **not** a runtime migration; no code deletes user overrides.
3. **Post-reset visual parity — PASS.** Visual result was identical before and after the reset across Motion / Spacing / Radius / Controls / Elevation / Surface; Protected parameters unaffected.
4. **Full AE restart parity — PASS.** After a complete AE restart the overrides remained `0` and the UI kept the accepted calibration result.
5. **Console clean — PASS.** project-owned Console warnings/errors = 0.

Canonical Promotion: **CLOSED / AE ACCEPTED**.
