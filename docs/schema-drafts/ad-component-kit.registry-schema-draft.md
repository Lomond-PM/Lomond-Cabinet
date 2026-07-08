# Ad Component Kit Registry Schema Draft

Status: draft only. Not connected to the production Home, detail renderer, or host runtime.

This document records the proposed registry design for migrating the legacy Ad Component Kit / Ecommerce Component Kit. It must not be treated as an implementation file.

## Current Legacy State

- Frontend tool id: `ecommerceLayout`
- Visible title: `Ad Component Kit`
- Active host module: `host/tools/adComponentKit.jsx`
- Former legacy host module: `host/tools/ecommerceLayout.jsx` (removed after separate unused-path audit)
- Current storage key: `AEToolbox.ecommerceLayout.v1`

The current active creation path is `AEToolbox.tools.adComponentKit`. The old `host/tools/ecommerceLayout.jsx` file exposed guide/template layout helpers and was later removed after a separate unused-path audit.

## Migration Decision

Keep Ad Component Kit as one registry tool.

Rationale:

- The current tool is a compound tool with two related builders, Feature Stack and Icon Grid, plus maintenance actions.
- Keeping one Home entry preserves the current user model.
- The registry renderer already supports `tabs`, `visibleWhen`, `stateAction`, `stateCard`, `enabledWhen`, `disabledWhen`, `actionPayload`, full-width buttons, and persisted values.
- Splitting into multiple Home tools should wait until there are truly independent product badge, price block, coupon, CTA, or banner host actions.

Recommended registry id:

```text
ecommerceLayout
```

Use the existing id to keep `aeToolbox.homeToolOrder` meaningful when the static Home card is eventually replaced by the dynamic registry card.

## Draft Tool Definition

```js
AEToolbox.registerTool({
    id: "ecommerceLayout",
    titleKey: "tools.adComponentKit.title",
    descriptionKey: "tools.adComponentKit.description",
    category: "ecommerce",
    iconText: "A",
    storageKey: "AEToolbox.ecommerceLayout.v1",
    stateAction: {
        hostFunction: "AEToolbox.tools.adComponentKit.getState",
        intervalMs: 1000
    },
    stateCard: {
        titleKey: "tools.adComponentKit.sections.state",
        fields: [
            { stateKey: "activeComp", labelKey: "tools.adComponentKit.state.activeComp" },
            { stateKey: "selectionCount", labelKey: "tools.adComponentKit.state.selectionCount" },
            { stateKey: "textLayerCount", labelKey: "tools.adComponentKit.state.textLayerCount" },
            { stateKey: "twoDLayerCount", labelKey: "tools.adComponentKit.state.twoDLayerCount" },
            { stateKey: "selectedControllerType", labelKey: "tools.adComponentKit.state.selectedControllerType" }
        ]
    },
    sections: [],
    actions: []
});
```

## Draft Sections

### Component Type

```js
{
    id: "componentType",
    labelKey: "tools.adComponentKit.sections.componentType",
    descriptionKey: "tools.adComponentKit.sections.componentTypeDescription",
    fields: [
        {
            type: "tabs",
            key: "componentKind",
            labelKey: "tools.adComponentKit.fields.componentKind",
            defaultValue: "featureStack",
            options: [
                {
                    value: "featureStack",
                    labelKey: "tools.adComponentKit.options.featureStack",
                    descriptionKey: "tools.adComponentKit.options.featureStackDescription",
                    iconText: "F"
                },
                {
                    value: "iconGrid",
                    labelKey: "tools.adComponentKit.options.iconGrid",
                    descriptionKey: "tools.adComponentKit.options.iconGridDescription",
                    iconText: "I"
                }
            ]
        }
    ]
}
```

### Feature Stack

Visible when `componentKind == featureStack`.

Fields:

- `gap`: `range` / `number`, default `14`
- `paddingX`: `range` / `number`, default `24`
- `paddingY`: `range` / `number`, default `12`
- `cornerRadius`: `range` / `number`, default `28`
- `pillWidthMode`: `select`, values `auto`, `fixed`
- `fixedWidth`: `range` / `number`, default `320`, visible or meaningful when `pillWidthMode == fixed`
- `fillColor`: `color`, default `#d6b25e`
- `gradientEnable`: `checkbox`, default `false`
- `textAlign`: `select`, values `center`, `left`
- `sortMode`: `select`, values `yPosition`, `timeline`

```js
{
    id: "featureStack",
    labelKey: "tools.adComponentKit.sections.featureStack",
    descriptionKey: "tools.adComponentKit.sections.featureStackDescription",
    fields: [
        { type: "range", key: "gap", labelKey: "tools.adComponentKit.fields.gap", defaultValue: 14, min: 0, max: 100, step: 1, visibleWhen: { key: "componentKind", equals: "featureStack" } },
        { type: "range", key: "paddingX", labelKey: "tools.adComponentKit.fields.paddingX", defaultValue: 24, min: 0, max: 160, step: 1, visibleWhen: { key: "componentKind", equals: "featureStack" } },
        { type: "range", key: "paddingY", labelKey: "tools.adComponentKit.fields.paddingY", defaultValue: 12, min: 0, max: 100, step: 1, visibleWhen: { key: "componentKind", equals: "featureStack" } },
        { type: "range", key: "cornerRadius", labelKey: "tools.adComponentKit.fields.cornerRadius", defaultValue: 28, min: 0, max: 140, step: 1, visibleWhen: { key: "componentKind", equals: "featureStack" } },
        {
            type: "select",
            key: "pillWidthMode",
            labelKey: "tools.adComponentKit.fields.pillWidthMode",
            defaultValue: "auto",
            visibleWhen: { key: "componentKind", equals: "featureStack" },
            options: [
                { value: "auto", labelKey: "common.auto" },
                { value: "fixed", labelKey: "common.fixed" }
            ]
        },
        { type: "range", key: "fixedWidth", labelKey: "tools.adComponentKit.fields.fixedWidth", defaultValue: 320, min: 80, max: 900, step: 1, visibleWhen: { key: "componentKind", equals: "featureStack" } },
        { type: "color", key: "fillColor", labelKey: "tools.adComponentKit.fields.fillColor", defaultValue: "#d6b25e", visibleWhen: { key: "componentKind", equals: "featureStack" } },
        { type: "checkbox", key: "gradientEnable", labelKey: "tools.adComponentKit.fields.gradientEnable", defaultValue: false, visibleWhen: { key: "componentKind", equals: "featureStack" } },
        {
            type: "select",
            key: "textAlign",
            labelKey: "tools.adComponentKit.fields.textAlign",
            defaultValue: "center",
            visibleWhen: { key: "componentKind", equals: "featureStack" },
            options: [
                { value: "center", labelKey: "common.center" },
                { value: "left", labelKey: "common.left" }
            ]
        },
        {
            type: "select",
            key: "sortMode",
            labelKey: "tools.adComponentKit.fields.sortMode",
            defaultValue: "yPosition",
            visibleWhen: { key: "componentKind", equals: "featureStack" },
            options: [
                { value: "yPosition", labelKey: "common.yPosition" },
                { value: "timeline", labelKey: "common.timeline" }
            ]
        }
    ]
}
```

### Icon Grid

Visible when `componentKind == iconGrid`.

Fields:

- `columns`: `range` / `number`, default `4`
- `normalizeMode`: `select`, values `none`, `uniformHeight`, `uniformWidth`, `fitBox`
- `targetWidth`: `range` / `number`, default `72`
- `targetHeight`: `range` / `number`, default `72`
- `cellWidth`: `range` / `number`, default `100`
- `cellHeight`: `range` / `number`, default `118`
- `gapX`: `range` / `number`, default `28`
- `gapY`: `range` / `number`, default `24`
- `lastRowAlign`: `select`, values `center`, `left`, `right`
- `gridSortMode`: `select`, values `rowMajor`, `yPosition`, `xPosition`, `timeline`

### Component State

This should be implemented with a tool-level `stateCard`, not tool-specific DOM.

Suggested state fields:

- `activeComp`
- `selectionCount`
- `textLayerCount`
- `twoDLayerCount`
- `selectedControllerType`
- `canCreateFeatureStack`
- `canCreateIconGrid`
- `canRefresh`
- `canSelectLayers`
- `canDetach`

### Create Actions

```js
{
    id: "createFeatureStack",
    labelKey: "tools.adComponentKit.actions.createFeatureStack",
    hostFunction: "AEToolbox.tools.adComponentKit.createFeatureStack",
    enabledWhen: { stateKey: "canCreateFeatureStack", equals: true },
    refreshStateAfterRun: true,
    pendingMessageKey: "tools.adComponentKit.status.creatingFeatureStack",
    successMessageKey: "tools.adComponentKit.status.createdFeatureStack",
    errorMessageKey: "tools.adComponentKit.status.createFeatureStackFailed"
}
```

```js
{
    id: "createIconGrid",
    labelKey: "tools.adComponentKit.actions.createIconGrid",
    hostFunction: "AEToolbox.tools.adComponentKit.createIconGrid",
    enabledWhen: { stateKey: "canCreateIconGrid", equals: true },
    refreshStateAfterRun: true,
    pendingMessageKey: "tools.adComponentKit.status.creatingIconGrid",
    successMessageKey: "tools.adComponentKit.status.createdIconGrid",
    errorMessageKey: "tools.adComponentKit.status.createIconGridFailed"
}
```

### Maintenance Actions

- `refreshSelectedComponent`
- `selectComponentLayers`
- `detachSelectedComponent`

These should use `enabledWhen` based on `canRefresh`, `canSelectLayers`, and `canDetach`.

## Draft State Model

Draft only. Do not implement during Phase 1.

```json
{
  "ok": true,
  "hasComp": true,
  "activeComp": "Main Comp",
  "selectionCount": 3,
  "textLayerCount": 3,
  "twoDLayerCount": 3,
  "selectedControllerType": "featureStack",
  "canCreateFeatureStack": true,
  "canCreateIconGrid": true,
  "canRefresh": false,
  "canSelectLayers": false,
  "canDetach": false,
  "messageKey": "tools.adComponentKit.state.ready"
}
```

State rules:

- Feature Stack requires one or more selected non-3D text layers.
- Icon Grid requires one or more selected supported 2D layers.
- Refresh, select component layers, and detach require a selected component controller.
- Controller type should come from `layer.comment` metadata first, with controller names such as `FEATURE_STACK_CTRL` and `ICON_GRID_CTRL` only as fallback hints.
- State values are runtime-only and must not be persisted.

## Persistence Strategy

Preferred Phase 1 / Phase 2 strategy:

```text
AEToolbox.ecommerceLayout.v1
```

Reasons:

- Preserves user parameters.
- Reduces migration risk.
- Avoids split writes between legacy storage and registry storage.
- Keeps existing defaults and saved `componentKind` behavior stable.

Alternative future strategy:

```text
aeToolbox.registryToolValues.ecommerceLayout
```

If the registry storage key is adopted, implement an explicit adapter:

1. Read `AEToolbox.ecommerceLayout.v1`.
2. Merge with schema defaults.
3. Save to the new registry state shape.
4. Ignore removed legacy fields rather than deleting them immediately.

Do not implement storage migration in this draft phase.

## Tool-Local i18n Plan

Future `adComponentKit.tool.jsx` should own tool-local keys:

- `tools.adComponentKit.title`
- `tools.adComponentKit.description`
- section labels and descriptions
- field labels and descriptions
- option labels that are specific to this tool
- action labels
- action pending / success / error status keys
- state card labels
- state status message keys

Keep global/common keys in `client/js/i18n.js`:

- `common.left`
- `common.center`
- `common.right`
- `common.none`
- `common.auto`
- `common.fixed`
- `common.timeline`
- shared app/status/settings labels

Do not delete existing `client/js/i18n.js` keys until the registry tool is active and the legacy detail path has been removed.

## Host Wrapper Plan

Do not rewrite AE creation algorithms.

Future host additions should be thin wrappers around existing logic:

- `AEToolbox.tools.adComponentKit.getState()`
- messageKey normalization for create / refresh / select / detach results
- optional wrapper actions only if existing functions cannot return stable `messageKey`

Existing functions to preserve:

- `createFeatureStack(paramsJson)`
- `createIconGrid(paramsJson)`
- `refreshSelectedComponent(paramsJson)`
- `selectComponentLayers()`
- `detachSelectedComponent()`

## Legacy Cleanup Plan

Only after the registry tool is active and AE-tested:

1. Remove legacy detail DOM in `client/index.html`.
2. Remove `collectEcommerceParams`, `setEcommerceParams`, `saveEcommerceParams`, `setActiveComponentKind`, and related static event bindings from `client/js/main.js`.
3. Remove unused `.component-*` and `.ecom-*` CSS.
4. Move tool-local i18n out of `client/js/i18n.js` or leave compatibility keys until no caller uses them.
5. Completed: audit and remove unused `host/tools/ecommerceLayout.jsx`.

## Phased Migration Plan

1. Phase 1: migration notes and schema draft. This document.
2. Phase 2: Developer Mode probe using a non-production id such as `adComponentKitProbe`.
3. Phase 3: minimal official action validation, preferably one create action.
4. Phase 4: full tabs migration with Feature Stack and Icon Grid under one registry tool.
5. Phase 5: maintenance actions and stateCard.
6. Phase 6: same-id replacement using `id: "ecommerceLayout"` and one Home entry.
7. Phase 7: legacy DOM / CSS / i18n / event cleanup after AE testing.

## Phase 2 Probe Recommendation

Next safest implementation task:

- Add `host/tools/adComponentKitProbe.tool.jsx`.
- Mark it `debugOnly: true`.
- Do not use id `ecommerceLayout`.
- Use one action first, preferably `createFeatureStack`, because it has fewer icon normalization edge cases than Icon Grid.
- Add `stateAction` before enabling the action button.
- Do not remove or modify the legacy Ad Component Kit UI.
