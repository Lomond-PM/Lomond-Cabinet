# Lomond Cabinet

Lomond Cabinet is an After Effects CEP extension that combines a registry-driven tool system, procedural Home visuals, and the experimental Vela local-assistant surface.

- **Current product version metadata:** `0.3.6` (unpublished)
- **Latest published tag:** `v0.3.5`
- **Current sealed feature baseline:** `0.3.12`
- **Default development branch:** `dev`
- **Extension bundle id:** `com.kevin.aetoolbox`
- **Manifest menu name:** `AE Toolbox`
- **Visible panel name:** `Lomond Cabinet`

The **0.3.12 — Baseline Safety & Fact-chain Closure** milestone is COMPLETE / SEALED on `dev` after PR #213 and its successful Project checks. The repository's package metadata still reports `0.3.6`; a dedicated release-prep will synchronize the package version and cut the sealed pre-rebuild baseline as **`v0.3.12 — Legacy`** before the 0.3.13 / 0.3.14 UI rebuild. Vela remains an **Experimental Preview**, and production Provider activation remains locked because no model is qualified or selected as the default.

当前 Vela 的 0.3.12 最终开发基线为 **198/198 PASS，0 FAIL，0 skip**。20 项原缺陷/治理条目按 G 的有界证据 CLOSED，G-10 / COV-03～06 持续 OPEN，其余原 ID 沿后续路线；Provider 历史超时的原 FAIL 和 unknown 原因保持。下一开发里程碑是 **0.3.13 — Visual Baseline & UI Platform Rebuild**。UI Lab 的基础视觉方向已经获得用户认可，0.3.13 不重新发散审美；Liquid Glass 继续作为独立、capability-gated、可降级的材质实验，不阻塞共享平台和非玻璃页面工作。见 [唯一当前排期](docs/VELA_ROADMAP.md)、[已实现事实](docs/PROJECT_STATE.md) 和 [0.3.12 综合验收](docs/reports/vela-0.3.12-integrated-acceptance.md)。

## Runtime architecture

Lomond Cabinet is not a conventional web application. It has two runtimes:

- **CEP frontend:** HTML, CSS, and browser JavaScript under `client/`.
- **After Effects host:** ExtendScript / JSX under `host/`.
- **Bridge:** `CSInterface.evalScript()`.
- **CEP entry:** `CSXS/manifest.xml` loads `client/index.html`.
- **Host entry:** frontend bootstrap loads `host/index.jsx`, which in turn loads shared Host utilities and tool modules.

Host JSX must remain ExtendScript-compatible. Browser JavaScript and Host JSX are intentionally kept separate.

## Repository structure

```text
com.kevin.aetoolbox/
├─ CSXS/                         CEP manifest and extension metadata
├─ client/                       CEP frontend
│  ├─ index.html
│  ├─ css/
│  └─ js/
│     ├─ main.js
│     ├─ i18n.js
│     ├─ settingsSchema.js
│     ├─ palette/
│     ├─ ui/
│     └─ vela/
├─ host/                         After Effects ExtendScript host
│  ├─ index.jsx
│  ├─ aeUtils.jsx
│  ├─ effectUtils.jsx
│  ├─ shapeUtils.jsx
│  ├─ tools/
│  └─ vela/
├─ helpers/                      Native/helper utilities
├─ scripts/                      Offline tests, fixtures and diagnostics
├─ docs/                         Design, state, handoff and reports
├─ AGENTS.md                     Repository working rules
├─ CHANGELOG.md                  Published release history
└─ VERSION                       Product version
```

`client/js/main.js` and `client/css/style.css` are compatibility-sensitive shared files. Ordinary tools should use the registry system rather than adding dedicated frontend DOM, CSS, event-binding, or storage paths.

## Current product areas

### Registry Renderer

The registry architecture follows:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

Registry tools live in `host/tools/*.tool.jsx` and register through `AEToolbox.registerTool(...)`. The frontend core renders shared fields, sections, actions, status, persistence, visibility rules, state cards, and Host-action routing.

Current production registry tools include:

- **Text Background Box** — creates shape backgrounds behind selected text layers.
- **Selection Info** — reports active composition and selected-layer information.
- **Ad Component Kit** — creates and maintains Feature Stack and Icon Grid components under compatibility registry id `ecommerceLayout`.
- **Shape Add / Shape Builder** — adds native shape contents and creates linked Stroke / Fill shape layers.

Developer Mode retains renderer and procedural labs used for regression work. They are hidden in normal Home mode.

### Procedural appearance

The Home view supports deterministic procedural tool icons and an optional procedural background.

- Tool identity is seeded from stable tool ids.
- Language, Home order, UI scale, and theme changes do not regenerate icon structure.
- Theme-mapped presentation recolors an existing source image rather than replacing its identity.
- Palette Store v2 remains the sole production Palette persistence authority.
- The classic Background Engine remains available as an explicit fallback.

Detailed decisions are maintained in [`docs/design/procedural-appearance.md`](docs/design/procedural-appearance.md).

### Settings, Appearance, Design Tuning, and Palette

Global Settings is ordered as **General, Appearance, Advanced, Developer**. Appearance owns user-facing visual preferences and Palette access; Advanced owns advanced appearance controls; Developer is gated by Developer Mode and owns Design Tuning and labs.

The living Design Tuning Registry contains 67 parameters. Palette Store v2 owns dynamic `DIRECT`, same-palette `REFERENCE`, and registered `DERIVED` slots plus procedural appearance role bindings. Cross-palette references, Harmony generation, node editing, global active Palette, and Appearance live-link remain deferred.

### Vela Experimental Preview

Vela is a persistent conversation surface for local, approval-driven After Effects assistance.

The optional LM Studio Provider is:

- experimental and disabled by default;
- restricted to loopback addresses;
- enabled only after explicit acknowledgement and readiness for the current panel session;
- reset on reload for acknowledgement, readiness, and enablement;
- allowed to persist only endpoint and Model ID configuration.

Readiness means only that the configured local model instance is loaded. It is **not** qualification. No model is qualified, recommended, or selected as the production default.

The trusted activation policy keeps production activation locked. The opt-in Agent path supports bounded opacity and rename proposals and an ordered two-step logical plan. Every candidate remains subject to local validation and the existing Review/Authority/Preflight/Host/Verify boundaries. Fresh already-satisfied steps skip mutation and Undo but still Verify before progressing.

0.3.9 enables native assistant streaming for TEXT_ONLY, strict structured proposal/logical output, and an independent untrusted reasoning surface. Partial structured output never enters Agent execution. Current-turn reasoning disclosure is supported; raw reasoning is not model context, and old raw reasoning is cleared on the next objective.

0.3.12 hardens the current path: Session receipts and snapshots, execution facts and committed-target Verify, Provider/task lifecycle, user-asset persistence and dirty exit protection, and complete per-step Review details now use the sealed 0.3.12 contracts. This still does not constitute complete AE capability coverage or general model qualification.

Full current defaults and limitations are owned by [PROJECT_STATE](docs/PROJECT_STATE.md); future work is owned only by [VELA_ROADMAP](docs/VELA_ROADMAP.md). The [frozen Agent architecture](docs/design/vela-agent-architecture.md) remains normative. Historical 0.3.6 release decisions remain in [its closure](docs/design/vela-agent-0.3.6-closure.md).

## Development installation

During development, the repository workspace is the source of truth. The CEP Extensions path should point to the workspace through a junction or symlink rather than using a separately copied tree.

Windows CEP path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
```

Primary Windows workspace used by this project:

```text
C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

macOS CEP path:

```text
~/Library/Application Support/Adobe/CEP/extensions/com.kevin.aetoolbox/
```

Open the panel from:

```text
Window > Extensions > AE Toolbox
```

or, depending on the AE version:

```text
Window > Extensions (Legacy) > AE Toolbox
```

## Development workflow

The repository uses:

```text
task branch → dev → main → annotated version tag
```

- Create feature, fix, documentation, audit, or release branches from current `dev`.
- Test focused branches before merging to `dev`.
- Promote only accepted `dev` to `main`.
- Create release tags from the accepted release commit on `main`.
- Published tags are immutable and must never be moved.
- After publication, perform a **mandatory post-release state reconciliation** so `README.md`, `docs/PROJECT_STATE.md`, and `docs/HANDOFF.md` identify the newly published version/tag rather than the preceding release candidate.
- After that reconciliation, keep `main` and `dev` on the same post-release documentation commit before new development starts.

This post-publication step is part of the release workflow, not optional cleanup. Release-preparation documents may legitimately describe a candidate before publication; publication is not considered administratively closed until the maintained current-state documents are reconciled.

Before modifying the project, read:

```text
AGENTS.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

## Version and release status

The package currently still reports **0.3.6**, and the latest published release remains immutable **`v0.3.5`**. The sealed 0.3.12 feature baseline on `dev` is the next intended release cut and will be published as **`v0.3.12 — Legacy`** before the major UI rebuild. A dedicated release-prep must synchronize the version sources and CHANGELOG before `dev → main`; do not tag the current `0.3.6` package as `v0.3.12` without that synchronization.

Keep these synchronized for the Legacy release and future releases:

- `VERSION`
- `CSXS/manifest.xml` bundle and extension versions
- `AEToolbox.projectVersion` in `host/index.jsx`
- `CHANGELOG.md`
- `README.md`
- `docs/PROJECT_STATE.md`
- `docs/HANDOFF.md`

`AEToolbox.hostApiVersion` is an independent Host contract version and remains `1.0.0`; it is not the product version.

The next development milestone after the Legacy cut is **0.3.13 — Visual Baseline & UI Platform Rebuild**. The accepted UI Lab visual direction is the starting baseline; Liquid Glass remains an exploratory material capability rather than a prerequisite for the platform rebuild. See the [canonical roadmap](docs/VELA_ROADMAP.md).

## Known issues and release history

Remaining accepted limitations are tracked in [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md). See [`CHANGELOG.md`](CHANGELOG.md) for release history.
