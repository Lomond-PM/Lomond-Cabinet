# Lomond Cabinet

Lomond Cabinet is an After Effects CEP extension that combines a registry-driven tool system, procedural Home visuals, and the experimental Vela local-assistant surface.

- **Current version:** `0.3.2`
- **Latest published tag:** `v0.3.2`
- **Extension bundle id:** `com.kevin.aetoolbox`
- **Manifest menu name:** `AE Toolbox`
- **Visible panel name:** `Lomond Cabinet`

Version 0.3.2 remains the current published and frozen release for the integrated UI / Design System Foundation. It adds shared component convergence, Appearance and Design Tuning authorities, Palette Store v2 and its native Workspace, the final Settings information architecture, and Vela spacing convergence. Vela remains an **Experimental Preview**, and production Provider activation remains locked because no model is qualified or selected as the default. Development and final integrated AE acceptance of the isolated 0.3.3 Agent Runtime Foundation are complete, but 0.3.3 is not formally released: release preparation remains pending. Actual Observation and Capability stay staged to 0.3.4; Planning, TaskRun, executionArmed runtime state, and Authority stay staged to 0.3.5+; the AgentDriver reasoning/autonomous loop remains later under the [frozen architecture baseline](docs/design/vela-agent-architecture.md).

## Runtime architecture

Lomond Cabinet is not a conventional web application. It has two runtimes:

- **CEP frontend:** HTML, CSS, and browser JavaScript under `client/`.
- **After Effects host:** ExtendScript / JSX under `host/`.
- **Bridge:** `CSInterface.evalScript()`.
- **CEP entry:** `CSXS/manifest.xml` loads `client/index.html`.
- **Host entry:** frontend bootstrap loads `host/index.jsx`, which in turn loads shared host utilities and tool modules.

Host JSX must remain compatible with ExtendScript. Browser JavaScript and host JSX are intentionally kept separate.

## Repository structure

The tree below is intentionally abridged and lists the current ownership boundaries rather than every file:

```text
com.kevin.aetoolbox/
├─ CSXS/
│  └─ manifest.xml                 CEP manifest and extension metadata
├─ client/
│  ├─ index.html                   CEP document and frontend module loading
│  ├─ css/
│  │  ├─ style.css                 shared application and registry styling
│  │  └─ velaSurface.css           Vela Surface styling
│  └─ js/
│     ├─ main.js                   app bootstrap, Home, Settings, registry renderer
│     ├─ i18n.js                   core/global English and Simplified Chinese copy
│     ├─ settingsSchema.js         app-level Settings schema
│     ├─ lib/                      CEP/browser support libraries
│     ├─ vela/                     Vela policy, Provider, runtime, Surface and safety modules
│     ├─ proceduralAppearance.js   deterministic procedural rendering engine
│     ├─ proceduralHomeIcons.js    Home icon controller
│     ├─ proceduralHomeBackground.js
│     ├─ proceduralPaletteStore.js
│     └─ proceduralPaletteWorkspace.js
├─ host/
│  ├─ index.jsx                    host bootstrap and registry loading
│  ├─ aeUtils.jsx                  shared AE helpers
│  ├─ effectUtils.jsx              effect/property helpers
│  ├─ shapeUtils.jsx               shape helpers
│  └─ tools/
│     ├─ *.tool.jsx                registry metadata, schemas, actions and tool i18n
│     └─ *.jsx                     AE execution implementations retained by tools
├─ helpers/
│  └─ win/eyedropper/              Windows color-sampling helper
├─ scripts/
│  ├─ diagnostics/                 qualification and diagnostic utilities
│  ├─ fixtures/                    deterministic test fixtures
│  ├─ check-project-consistency.js
│  ├─ report-i18n-usage.js
│  └─ test-*.js                    offline regression tests
├─ docs/
│  ├─ design/                      Vela, procedural appearance and architecture docs
│  ├─ reports/                     generated and historical diagnostic reports
│  ├─ schema-drafts/               retained migration/design drafts
│  ├─ PROJECT_STATE.md             detailed current implementation state
│  ├─ DESIGN_SYSTEM.md             UI and interaction rules
│  ├─ HANDOFF.md                   development handoff and installation notes
│  └─ KNOWN_ISSUES.md              accepted and deferred issues
├─ AGENTS.md                       repository working rules for coding agents
├─ CHANGELOG.md                    published release history
├─ VERSION                         product version
└─ README.md
```

`client/js/main.js` and `client/css/style.css` are large compatibility-sensitive files. New ordinary tools should use the registry system rather than adding dedicated DOM, CSS, event binding, or storage paths.

## Current product areas

### Registry Renderer

The registry architecture follows:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

Registry tools live in `host/tools/*.tool.jsx` and register through `AEToolbox.registerTool(...)`. The core frontend renders shared fields, sections, actions, status, persistence, visibility rules, state cards, and host-action routing.

Current production registry tools include:

- **Text Background Box** — creates shape backgrounds behind selected text layers.
- **Selection Info** — reports active composition and selected-layer information.
- **Ad Component Kit** — creates and maintains Feature Stack and Icon Grid components. Icon Grid accepts a fully valid selection of unlocked, unparented 2D Text, Shape, Solid, Footage, or Precomp layers with finite visual bounds, zero rotation, and positive scale; it rejects the whole selection instead of skipping invalid layers or guessing coordinates. Refresh uses member-local visual sizes, is idempotent, and preserves the Controller transform. Its compatibility registry id remains `ecommerceLayout`.
- **Shape Add / Shape Builder** — adds native shape contents and creates linked Stroke / Fill shape layers.

Developer Mode retains renderer and procedural labs used for regression work. They are hidden in normal Home mode.

### Procedural appearance

The Home view supports deterministic procedural tool icons and an optional procedural background.

- Tool identity is seeded from stable tool ids.
- Language, Home order, UI scale, and theme changes do not regenerate icon structure.
- Theme-mapped presentation recolors an existing source image rather than replacing its identity.
- Palette editing and mappings persist through the Palette Store without rewriting the built-in palette source file.
- The classic Background Engine remains available as an explicit fallback.

Detailed decisions are maintained in [`docs/design/procedural-appearance.md`](docs/design/procedural-appearance.md).

### Settings, Appearance, Design Tuning, and Palette

Global Settings is one disclosure-based composition ordered as **General, Appearance, Advanced, Developer**. Appearance owns user-facing visual preferences and the Palette Library entry; Advanced contains Advanced Appearance Settings; Developer is gated by Developer Mode and contains the Design Tuning workspace and labs.

The living Design Tuning Registry contains 67 parameters. Appearance-backed parameters remain mirrors of their original authority, while Design Tuning-owned parameters use the validated `AEToolbox.designTuning.v1` override path. This living 67-parameter set is different from the historical calibration-time 67-parameter snapshot.

Palette Store v2 is the sole production persistence authority. Palettes have stable dynamic slots using `DIRECT`, same-palette `REFERENCE`, or registered `DERIVED` sources, plus procedural appearance role bindings. Palette Workspace edits a full-v2 memory draft; Save is the Store write boundary and Cancel discards transient preview. Cross-palette references, Harmony generators, node editing, global active Palette, and Appearance live-link remain deferred.

### Vela Experimental Preview

Vela is a persistent conversation surface for local, approval-driven After Effects assistance.

The optional LM Studio Provider is:

- experimental and disabled by default;
- restricted to loopback addresses: `127.0.0.1`, `localhost`, or `[::1]`;
- enabled only after explicit acknowledgement and readiness for the current panel session;
- reset on reload for acknowledgement, readiness, and enablement;
- allowed to persist only endpoint and Model ID configuration.

Readiness means only that the configured local model instance is loaded. It is **not** qualification. No model is qualified, recommended, or selected as the production default in 0.3.2.

The trusted activation policy keeps:

- `releaseMode = experimental-preview`
- `productionEnabled = false`
- `productionBlockReason = no-qualified-default-model`
- `qualifiedDefaultModelId = null`
- `formalUiD2Enabled = false`
- `legacyFallbackRetained = false`

A model proposal cannot execute directly. With actionable Context, the transitional `proposal-capable-union` profile may return conversational text or a bounded `set-opacity-v1` proposal. Every proposal still passes parsing, profile checks, Intent Gate, Review, Confirmation, fresh Preflight, Execution Guard, ExecutionAdapter, and Host boundaries. Vela Persistent Surface is the only Vela user entry; the legacy Tool fallback is retired.

The Surface remembers the user's vertical height preference in `AEToolbox.velaSurfaceLayout.v1`. Current viewport, responsive layout, and UI-scale constraints clamp only the effective displayed height, so a temporarily small panel does not overwrite the preference. This layout preference is independent of Vela conversation data and Provider session enablement; acknowledgement, readiness, and enablement still clear on reload, and no multi-session or context persistence is introduced.

See the frozen [`docs/design/vela-agent-architecture.md`](docs/design/vela-agent-architecture.md) baseline, the [`0.3.3 Runtime Foundation closure record`](docs/design/vela-agent-0.3.3-closure.md), and the bounded [`0.3.3-A foundation contract`](docs/design/vela-agent-runtime-contract-foundation-0.3.3.md). The existing [`docs/design/vela-agent.md`](docs/design/vela-agent.md) documents the shipped preview safety path, and [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) tracks accepted preview limitations.

## Development installation

During development, the repository workspace is the source of truth. The CEP Extensions path should point to the workspace through a junction or symlink rather than using a separately copied tree.

Windows CEP path:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
```

Typical junction target:

```text
C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

macOS CEP path:

```text
~/Library/Application Support/Adobe/CEP/extensions/com.kevin.aetoolbox/
```

The extension root must contain `CSXS/manifest.xml`.

Open the panel from:

```text
Window > Extensions > AE Toolbox
```

or, depending on the AE version:

```text
Window > Extensions (Legacy) > AE Toolbox
```

Unsigned development installs generally require PlayerDebugMode for the matching CSXS version.

## Development workflow

The repository uses:

```text
task branch → dev → main → version tag
```

- Create feature, fix, documentation, audit, or release branches from current `dev`.
- Test task branches before merging to `dev`.
- Merge only confirmed stable `dev` into `main`.
- Create release tags from the corresponding release commit on `main`.
- Do not move published tags.

The workspace and CEP extension are junctioned in the primary Windows development environment, so normal development does not require a copy/sync step. Reload the CEP panel after browser changes and restart After Effects when host JSX remains cached.

Before modifying the project, read:

```text
AGENTS.md
docs/PROJECT_STATE.md
docs/DESIGN_SYSTEM.md
docs/HANDOFF.md
```

## Version and release status

The current published release is `0.3.2`, tagged with immutable `v0.3.2`. The isolated 0.3.3 Agent Runtime Foundation has completed development closure and final integrated AE acceptance but is not yet formally released; release preparation remains pending. Releases follow the reviewed `dev → main → version tag` flow.

Keep these synchronized for future releases:

- `VERSION`
- `CSXS/manifest.xml` bundle and extension versions
- `AEToolbox.projectVersion` in `host/index.jsx`
- `CHANGELOG.md`
- current-version statements in maintained documentation

`AEToolbox.hostApiVersion` is an independent host contract version and remains `1.0.0` in release 0.3.2.

## Known issues

The 0.3.2 integrated UI, Settings, Palette, Design Tuning, and Vela spacing work is closed and AE accepted. Remaining accepted limitations are tracked in [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

## License and release history

See [`CHANGELOG.md`](CHANGELOG.md) for release history. Published release tags must remain immutable.
