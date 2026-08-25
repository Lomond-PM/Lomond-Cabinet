# AGENTS.md

## Project identity

This repository is **Lomond Cabinet**, an After Effects CEP extension.

- Product version metadata: `0.3.3` (release-prepared, unpublished)
- Latest published tag: `v0.3.2`
- Visible panel title: `Lomond Cabinet`
- Manifest menu name: `AE Toolbox`
- Extension bundle id: `com.kevin.aetoolbox`

The product uses two runtimes:

- browser HTML/CSS/JavaScript under `client/`;
- ExtendScript / JSX under `host/`, executed by After Effects.

`CSXS/manifest.xml` loads `client/index.html`. Browser code reaches the host through `CSInterface.evalScript()`; `client/index.html` must not load JSX directly.

## Current repository structure

```text
CSXS/                  CEP manifest
client/                panel HTML, CSS and browser JavaScript
client/js/vela/        Vela policy, Provider, runtime, Surface and safety modules
host/                  ExtendScript entry and shared AE utilities
host/tools/            registry schemas (`*.tool.jsx`) and host implementations (`*.jsx`)
helpers/               native/platform helper assets
scripts/               tests, diagnostics, fixtures and consistency tools
docs/                  design, state, reports, handoff and known issues
VERSION                 product version
CHANGELOG.md            published release history
```

See `README.md` for the current high-level tree and `docs/PROJECT_STATE.md` for implementation state.

## Development installation

The workspace repository is the source of truth. In the primary Windows environment the CEP Extensions path is a junction to the workspace:

```text
%APPDATA%\Adobe\CEP\extensions\com.kevin.aetoolbox
-> C:\Users\Administrator\.openclaw\workspace\com.kevin.aetoolbox
```

Do not copy files between workspace and Extensions during normal development. Do not edit a separate stale Extensions copy.

After browser changes, reload the CEP panel. After host JSX changes, restart After Effects when the host remains cached.

## Git workflow

Default development branch: `dev`.

Normal flow:

```text
task branch -> dev -> main -> version tag
```

Before work:

1. inspect `git status -sb`;
2. ensure the worktree is understood;
3. update `dev` from `origin/dev`;
4. create a focused task branch.

Common prefixes:

- `feat/`
- `fix/`
- `docs/`
- `style/`
- `refactor/`
- `chore/`
- `i18n/`
- `audit/`
- `release/`

Do not reset, discard, rebase, force-push, move tags, or apply old stashes without explicit authorization. Do not commit, push, merge, or tag unless the user asks.

Published tags are immutable. `v0.3.2` points to the published 0.3.2 release on `main`; older published tags such as `v0.3.1` and `v0.3.0` remain immutable.

## Architecture principles

The registry architecture follows:

```text
Tool owns data and actions.
Core owns UI and behavior.
```

Ordinary tools must prefer `host/tools/*.tool.jsx` schemas and shared renderer capabilities. They must not default to dedicated DOM, CSS, frontend event binding, or direct `localStorage` writes.

Frontend responsibilities:

- Home, tool detail, Settings and Vela UI;
- registry schema rendering;
- shared controls, status, persistence and i18n;
- calls to host JSX and parsing host responses.

Host responsibilities:

- After Effects comp/layer/property/effect/shape operations;
- matchName-based compatibility where practical;
- undo groups around mutations;
- ExtendScript-compatible JSON-string responses.

Host code must remain ES3/ExtendScript-compatible. Do not use `let`, `const`, arrow functions, classes, modules, template literals, optional chaining, spread or destructuring in `host/`.

## Registry tool contract

Registry tools register through:

```js
AEToolbox.registerTool(toolDef)
```

Schemas may declare metadata, sections, fields, actions, state actions/cards, visibility and enablement rules, transient action payloads, and tool-local i18n.

Normal actions must route through:

```js
AEToolbox.runRegisteredToolAction(toolId, actionId, paramsJson)
```

`actionPayload` is transient and must not be persisted. Runtime host state is also non-persistent.

Current production registry tools:

- Text Background Box (`textBackgroundBox`)
- Selection Info (`selectionInfo`)
- Ad Component Kit (compatibility id `ecommerceLayout`)
- Shape Add / Shape Builder (`shapeAdd`)

Do not rename `ecommerceLayout` without a dedicated Home-order and storage migration. Do not delete retained host implementations such as `host/tools/shapeAdd.jsx` while registered actions still use them.

## Settings and storage

Settings is an app-level system, not a registry tool.

- schema: `client/js/settingsSchema.js`
- runtime/UI ownership: `client/js/main.js`
- primary storage: `AEToolbox.settings.v1`
- compatibility background storage: `AEToolbox.background.v1`
- language storage: `aeToolbox.language`

Do not introduce a Settings schema/storage migration as a side effect of unrelated work. BackgroundEngine and ProceduralHomeBackground retain separate runtime responsibilities.

## i18n

Supported languages:

- `en`
- `zh-CN`

Core, Home, Settings and fallback copy belongs in `client/js/i18n.js`. Registry tool-specific copy belongs in the owning `.tool.jsx` `i18n` block.

Before removing global keys, run:

```text
node scripts/report-i18n-usage.js
```

and inspect `docs/reports/i18n-usage-report.md`. Do not bulk-delete keys based only on static search.

After changing `client/`, `host/`, i18n keys, tool schemas, or related references, verify the generated report before completing the task:

```text
node scripts/report-i18n-usage.js --check
node scripts/check-project-consistency.js
```

If the report check fails, run `node scripts/report-i18n-usage.js` and include the resulting `docs/reports/i18n-usage-report.md` change in the same task. Do not maintain generated report content by hand or bypass CI to ignore report differences.

Enable the repository pre-commit checks once per clone with:

```text
git config core.hooksPath .githooks
```

The hook checks report freshness only; it does not modify or stage files.

## Vela 0.3.1 boundaries

Vela ships in 0.3.1 as an **Experimental Preview**. The bounded `proposal-capable-union` profile is a transition mechanism for text or `set-opacity-v1` proposals when actionable Context exists; it is not autonomous Agent execution.

The trusted activation policy is owned by `client/js/vela/velaActivationPolicy.js` and remains:

- release mode: `experimental-preview`
- experimental opt-in allowed: true
- production enabled: false
- production block reason: `no-qualified-default-model`
- qualified default model: none
- formal UI-D2 enabled: false
- legacy fallback retained: false

The local Provider is disabled by default. Endpoint and Model ID may persist; acknowledgement, readiness, enablement and authority are session-only and clear on reload. Readiness proves only that a local model instance is loaded; it is not qualification.

Do not allow model output, transcript text, Settings values, readiness or local storage to mutate activation policy.

The execution boundary remains:

```text
Provider
-> Parser
-> Profile mismatch check
-> Intent Gate
-> proposal-ready
-> Review
-> private Router
-> local candidate
-> Confirmation
-> Approve
-> Preflight
-> ExecutionAdapter
-> Host
```

Review, Confirmation and Host authority are separate. A `localProposal` must never execute automatically. The model may supply only the bounded opacity parameter for `set-opacity-v1`; target identity, plan, nonce, digest, authority and Host payload remain local/trusted.

Do not change Prompt, response schemas, Protocol, Parser, Request Branch Policy, Intent Gate, Proposal Router, Confirmation, Preflight, ExecutionAdapter, Host, capability contracts, qualification Rubric or frozen activation values during unrelated work.

## Procedural appearance boundaries

- Tool icon identity is based on stable tool id/hash seeds.
- Theme, language, Home order and UI scale must not regenerate source identity.
- Theme-mapped presentation recolors a source raster rather than changing its recipe.
- Palette Store persists user overrides and mappings without rewriting built-in palette source.
- Classic BackgroundEngine remains an explicit fallback.

Detailed design: `docs/design/procedural-appearance.md`.

## Developer Mode

Developer Mode controls lab/debug registry visibility generically. Production tools must not depend on it.

Retained labs validate shared renderer, Settings and procedural capabilities. Do not delete them merely because normal users do not see them.

## Validation expectations

Choose checks proportional to the change.

Typical focused gate:

- relevant specialty tests;
- `node --check` for changed JavaScript;
- `node scripts/check-project-consistency.js`;
- generated-report verification when generated inputs change;
- `git diff --check`;
- `git status -sb`.

Before a PR or release, run the full offline suite once. Run Vela forward/reverse/forward order testing only when loader/global/cache/order semantics change. Real qualification runs require their separately frozen clean-worktree/evidence process and must not be triggered by ordinary development.

AE smoke should verify the active path, not merely file presence. When behavior appears unchanged, confirm CEP cache, the active frontend module, `evalScript` routing and the loaded JSX before changing algorithms.

## Known issues and sensitive areas

Consult `docs/KNOWN_ISSUES.md` before opportunistic fixes.

The accepted 0.3.1 and 0.3.2 release work is closed. Do not reopen that scope during post-release work without a new focused regression and explicit authorization. The 0.3.3 Runtime Foundation is release-prepared; frozen staging keeps actual Observation + Capability in 0.3.4 and Planning / Authority / TaskRun in 0.3.5+.

Other sensitive areas:

- `client/js/main.js` and `client/css/style.css` are large compatibility-sensitive files;
- Home ordering depends on stable tool ids;
- panel-close lifecycle guards must not be removed casually;
- Windows eyedropper helper has documented MVP limitations;
- Settings Background Engine dropdown rendering has a deferred issue;
- AE/CEP caching can make correct changes appear inactive.

## Release management

Product metadata is staged at `0.3.3`. The latest published release/tag remains `0.3.2` / immutable `v0.3.2` until the reviewed release-prep reaches `dev`, then `main`, and an annotated `v0.3.3` tag is created.

Future release version changes must keep synchronized:

- `VERSION`
- both version fields in `CSXS/manifest.xml`
- `AEToolbox.projectVersion` in `host/index.jsx`
- `CHANGELOG.md`
- maintained current-version documentation

`AEToolbox.hostApiVersion` is independent and remains `1.0.0` unless its contract changes deliberately.
