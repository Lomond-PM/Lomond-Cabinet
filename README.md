# Lomond Cabinet

Lomond Cabinet is an After Effects CEP extension that combines a registry-driven tool system, procedural Home visuals, and the experimental Vela local-assistant surface.

- **Current product version:** `0.3.4`
- **Latest published tag:** `v0.3.4`
- **Default development branch:** `dev`
- **Extension bundle id:** `com.kevin.aetoolbox`
- **Manifest menu name:** `AE Toolbox`
- **Visible panel name:** `Lomond Cabinet`

Version 0.3.4 is the current published and frozen release for the Vela Observation + Capability Foundation. Vela remains an **Experimental Preview**, and production Provider activation remains locked because no model is qualified or selected as the default. Version 0.3.5 is the next development phase and is reserved for Planning + Authority work beginning with a read-only scope/architecture audit.

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

Readiness means only that the configured local model instance is loaded. It is **not** qualification. No model is qualified, recommended, or selected as the production default in 0.3.4.

The trusted activation policy keeps production activation locked. A model proposal cannot execute directly. With actionable Context, the transitional `proposal-capable-union` profile may return conversational text or a bounded `set-opacity-v1` proposal, but every mutation still crosses Review, Confirmation, freshness and permission checks, Preflight, ExecutionAdapter, and Host validation.

Version 0.3.4 closes the Observation + Capability Foundation:

- Session / Agent / Scope foundations and turn identity;
- lifecycle-owned Observation Runtime;
- read/analyze Agent Capability Registry and Runtime;
- typed invocation/result envelopes;
- FIFO Host-read serialization;
- structured Context and Active Composition observation;
- Prompt Builder v4 stable-prefix layering;
- local capability-to-registered-action mapping;
- bounded Provider / Context / Host diagnostics;
- AE native Project-reference lifecycle hardening.

The core architecture boundary is:

```text
Capability Definition
≠ Capability Availability
≠ Registered Action
≠ Execution Authority
```

See:

- [`docs/design/vela-agent-architecture.md`](docs/design/vela-agent-architecture.md) — frozen 0.3.x architecture baseline;
- [`docs/design/vela-agent-0.3.4-closure.md`](docs/design/vela-agent-0.3.4-closure.md) — 0.3.4 implementation closure;
- [`docs/design/vela-agent-0.3.3-closure.md`](docs/design/vela-agent-0.3.3-closure.md) — historical Runtime Foundation closure;
- [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) — accepted limitations.

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

The current published release is **0.3.4**, tagged with immutable **`v0.3.4`**. The final 0.3.4 Vela inventory passed **49/49 suites**, final After Effects 2026 release acceptance passed, Host `projectVersion` reports `0.3.4`, and project-owned Console warnings/errors are `0/0`.

Keep these synchronized for future releases:

- `VERSION`
- `CSXS/manifest.xml` bundle and extension versions
- `AEToolbox.projectVersion` in `host/index.jsx`
- `CHANGELOG.md`
- `README.md`
- `docs/PROJECT_STATE.md`
- `docs/HANDOFF.md`

`AEToolbox.hostApiVersion` is an independent Host contract version and remains `1.0.0`; it is not the product version.

The next development phase is **0.3.5 Planning + Authority**, beginning with a read-only architecture/scope audit. Do not jump directly into Planner, DelegationGrant, Policy Engine, TaskRun authority semantics, or `executionArmed` implementation.

## Known issues and release history

Remaining accepted limitations are tracked in [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md). See [`CHANGELOG.md`](CHANGELOG.md) for release history.
