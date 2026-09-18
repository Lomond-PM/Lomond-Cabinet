// Generated from current host schemas; never execute JSX in the browser.
export const REGISTRY_SCHEMAS={
  "kit": {
    "id": "ecommerceLayout",
    "titleKey": "tools.adComponentKit.title",
    "descriptionKey": "tools.adComponentKit.description",
    "category": "layout",
    "iconText": "A",
    "storageKey": "AEToolbox.ecommerceLayout.v1",
    "stateAction": {
      "hostFunction": "AEToolbox.tools.adComponentKit.getState",
      "intervalMs": 1000
    },
    "stateCard": {
      "titleKey": "tools.adComponentKit.sections.state",
      "fields": [
        {
          "stateKey": "activeComp",
          "labelKey": "tools.adComponentKit.state.activeComp"
        },
        {
          "stateKey": "selectionCount",
          "labelKey": "tools.adComponentKit.state.selectionCount"
        },
        {
          "stateKey": "textLayerCount",
          "labelKey": "tools.adComponentKit.state.textLayerCount"
        },
        {
          "stateKey": "twoDLayerCount",
          "labelKey": "tools.adComponentKit.state.twoDLayerCount"
        },
        {
          "stateKey": "selectedControllerType",
          "labelKey": "tools.adComponentKit.state.selectedControllerType"
        },
        {
          "stateKey": "canCreateFeatureStack",
          "labelKey": "tools.adComponentKit.state.canCreateFeatureStack"
        },
        {
          "stateKey": "canCreateIconGrid",
          "labelKey": "tools.adComponentKit.state.canCreateIconGrid"
        },
        {
          "stateKey": "canRemoveGeneratedComponent",
          "labelKey": "tools.adComponentKit.state.canRemoveGeneratedComponent"
        }
      ]
    },
    "sections": [
      {
        "id": "component",
        "labelKey": "tools.adComponentKit.sections.component",
        "descriptionKey": "tools.adComponentKit.sections.componentDescription",
        "fields": [
          {
            "type": "tabs",
            "key": "componentKind",
            "labelKey": "tools.adComponentKit.fields.componentKind",
            "defaultValue": "featureStack",
            "options": [
              {
                "value": "featureStack",
                "labelKey": "tools.adComponentKit.options.featureStack",
                "descriptionKey": "tools.adComponentKit.options.featureStackDescription",
                "iconText": "F"
              },
              {
                "value": "iconGrid",
                "labelKey": "tools.adComponentKit.options.iconGrid",
                "descriptionKey": "tools.adComponentKit.options.iconGridDescription",
                "iconText": "I"
              }
            ]
          },
          {
            "type": "divider",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "range",
            "key": "gap",
            "labelKey": "tools.adComponentKit.fields.gap",
            "defaultValue": 14,
            "min": 0,
            "max": 100,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "range",
            "key": "paddingX",
            "labelKey": "tools.adComponentKit.fields.paddingX",
            "defaultValue": 24,
            "min": 0,
            "max": 160,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "range",
            "key": "paddingY",
            "labelKey": "tools.adComponentKit.fields.paddingY",
            "defaultValue": 12,
            "min": 0,
            "max": 100,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "range",
            "key": "cornerRadius",
            "labelKey": "tools.adComponentKit.fields.cornerRadius",
            "defaultValue": 28,
            "min": 0,
            "max": 140,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "color",
            "key": "fillColor",
            "labelKey": "tools.adComponentKit.fields.fillColor",
            "defaultValue": "#d6b25e",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "select",
            "key": "pillWidthMode",
            "labelKey": "tools.adComponentKit.fields.pillWidthMode",
            "defaultValue": "auto",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "options": [
              {
                "value": "auto",
                "labelKey": "common.auto"
              },
              {
                "value": "fixed",
                "labelKey": "common.fixed"
              }
            ]
          },
          {
            "type": "number",
            "key": "fixedWidth",
            "labelKey": "tools.adComponentKit.fields.fixedWidth",
            "defaultValue": 320,
            "min": 80,
            "max": 900,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            }
          },
          {
            "type": "select",
            "key": "textAlign",
            "labelKey": "tools.adComponentKit.fields.textAlign",
            "defaultValue": "center",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "options": [
              {
                "value": "center",
                "labelKey": "common.center"
              },
              {
                "value": "left",
                "labelKey": "common.left"
              }
            ]
          },
          {
            "type": "select",
            "key": "sortMode",
            "labelKey": "tools.adComponentKit.fields.sortMode",
            "defaultValue": "yPosition",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "options": [
              {
                "value": "yPosition",
                "labelKey": "common.yPosition"
              },
              {
                "value": "timeline",
                "labelKey": "common.timeline"
              }
            ]
          },
          {
            "type": "button",
            "key": "createFeatureStack",
            "labelKey": "tools.adComponentKit.actions.createFeatureStack",
            "variant": "primary",
            "fullWidth": true,
            "actionId": "createFeatureStack",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "enabledWhen": {
              "stateKey": "canCreateFeatureStack",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.creatingFeatureStack",
            "successMessageKey": "tools.adComponentKit.status.createdFeatureStack",
            "errorMessageKey": "tools.adComponentKit.status.createFeatureStackFailed"
          },
          {
            "type": "button",
            "key": "refreshSelectedComponentFeature",
            "labelKey": "tools.adComponentKit.actions.refreshSelectedComponent",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "refreshSelectedComponent",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "enabledWhen": {
              "stateKey": "canRefresh",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.refreshingComponent",
            "successMessageKey": "tools.adComponentKit.status.componentRefreshed",
            "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
          },
          {
            "type": "button",
            "key": "selectComponentLayersFeature",
            "labelKey": "tools.adComponentKit.actions.selectComponentLayers",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "selectComponentLayers",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "enabledWhen": {
              "stateKey": "canSelectLayers",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.selectingComponentLayers",
            "successMessageKey": "tools.adComponentKit.status.componentLayersSelected",
            "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
          },
          {
            "type": "button",
            "key": "removeSelectedGeneratedComponentFeature",
            "labelKey": "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "removeSelectedGeneratedComponent",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "featureStack"
            },
            "enabledWhen": {
              "stateKey": "canRemoveGeneratedComponent",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.removingGeneratedComponent",
            "successMessageKey": "tools.adComponentKit.status.generatedComponentRemoved",
            "errorMessageKey": "tools.adComponentKit.status.generatedComponentRemoveFailed"
          },
          {
            "type": "info",
            "labelKey": "tools.adComponentKit.notes.iconGridAdvanced",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "range",
            "key": "columns",
            "labelKey": "tools.adComponentKit.fields.columns",
            "defaultValue": 4,
            "min": 1,
            "max": 12,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "select",
            "key": "normalizeMode",
            "labelKey": "tools.adComponentKit.fields.normalizeMode",
            "defaultValue": "fitBox",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "options": [
              {
                "value": "none",
                "labelKey": "common.none"
              },
              {
                "value": "fitBox",
                "labelKey": "common.fitBox"
              },
              {
                "value": "uniformHeight",
                "labelKey": "common.uniformHeight"
              },
              {
                "value": "uniformWidth",
                "labelKey": "common.uniformWidth"
              }
            ]
          },
          {
            "type": "range",
            "key": "targetWidth",
            "labelKey": "tools.adComponentKit.fields.targetWidth",
            "defaultValue": 72,
            "min": 1,
            "max": 400,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "range",
            "key": "targetHeight",
            "labelKey": "tools.adComponentKit.fields.targetHeight",
            "defaultValue": 72,
            "min": 1,
            "max": 400,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "range",
            "key": "cellWidth",
            "labelKey": "tools.adComponentKit.fields.cellWidth",
            "defaultValue": 100,
            "min": 1,
            "max": 600,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "range",
            "key": "cellHeight",
            "labelKey": "tools.adComponentKit.fields.cellHeight",
            "defaultValue": 118,
            "min": 1,
            "max": 600,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "range",
            "key": "gapX",
            "labelKey": "tools.adComponentKit.fields.gapX",
            "defaultValue": 28,
            "min": 0,
            "max": 240,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "range",
            "key": "gapY",
            "labelKey": "tools.adComponentKit.fields.gapY",
            "defaultValue": 24,
            "min": 0,
            "max": 240,
            "step": 1,
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            }
          },
          {
            "type": "select",
            "key": "lastRowAlign",
            "labelKey": "tools.adComponentKit.fields.lastRowAlign",
            "defaultValue": "center",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "options": [
              {
                "value": "left",
                "labelKey": "common.left"
              },
              {
                "value": "center",
                "labelKey": "common.center"
              },
              {
                "value": "right",
                "labelKey": "common.right"
              }
            ]
          },
          {
            "type": "select",
            "key": "gridSortMode",
            "labelKey": "tools.adComponentKit.fields.gridSortMode",
            "defaultValue": "rowMajor",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "options": [
              {
                "value": "rowMajor",
                "labelKey": "common.rowMajor"
              },
              {
                "value": "xPosition",
                "labelKey": "common.xPosition"
              },
              {
                "value": "yPosition",
                "labelKey": "common.yPosition"
              },
              {
                "value": "timeline",
                "labelKey": "common.timeline"
              }
            ]
          },
          {
            "type": "button",
            "key": "createIconGrid",
            "labelKey": "tools.adComponentKit.actions.createIconGrid",
            "variant": "primary",
            "fullWidth": true,
            "actionId": "createIconGrid",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "enabledWhen": {
              "stateKey": "canCreateIconGrid",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.creatingIconGrid",
            "successMessageKey": "tools.adComponentKit.status.createdIconGrid",
            "errorMessageKey": "tools.adComponentKit.status.createIconGridFailed"
          },
          {
            "type": "button",
            "key": "refreshSelectedComponentIcon",
            "labelKey": "tools.adComponentKit.actions.refreshSelectedComponent",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "refreshSelectedComponent",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "enabledWhen": {
              "stateKey": "canRefresh",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.refreshingComponent",
            "successMessageKey": "tools.adComponentKit.status.componentRefreshed",
            "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
          },
          {
            "type": "button",
            "key": "selectComponentLayersIcon",
            "labelKey": "tools.adComponentKit.actions.selectComponentLayers",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "selectComponentLayers",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "enabledWhen": {
              "stateKey": "canSelectLayers",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.selectingComponentLayers",
            "successMessageKey": "tools.adComponentKit.status.componentLayersSelected",
            "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed"
          },
          {
            "type": "button",
            "key": "removeSelectedGeneratedComponentIcon",
            "labelKey": "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "removeSelectedGeneratedComponent",
            "visibleWhen": {
              "key": "componentKind",
              "equals": "iconGrid"
            },
            "enabledWhen": {
              "stateKey": "canRemoveGeneratedComponent",
              "equals": true
            },
            "refreshStateAfterRun": true,
            "pendingMessageKey": "tools.adComponentKit.status.removingGeneratedComponent",
            "successMessageKey": "tools.adComponentKit.status.generatedComponentRemoved",
            "errorMessageKey": "tools.adComponentKit.status.generatedComponentRemoveFailed"
          }
        ]
      }
    ],
    "actions": [
      {
        "id": "createFeatureStack",
        "labelKey": "tools.adComponentKit.actions.createFeatureStack",
        "hostFunction": "AEToolbox.tools.adComponentKit.createFeatureStack",
        "style": "primary",
        "refreshStateAfterRun": true,
        "pendingMessageKey": "tools.adComponentKit.status.creatingFeatureStack",
        "successMessageKey": "tools.adComponentKit.status.createdFeatureStack",
        "errorMessageKey": "tools.adComponentKit.status.createFeatureStackFailed",
        "hidden": true,
        "fieldOnly": true
      },
      {
        "id": "createIconGrid",
        "labelKey": "tools.adComponentKit.actions.createIconGrid",
        "hostFunction": "AEToolbox.tools.adComponentKit.createIconGrid",
        "style": "primary",
        "refreshStateAfterRun": true,
        "pendingMessageKey": "tools.adComponentKit.status.creatingIconGrid",
        "successMessageKey": "tools.adComponentKit.status.createdIconGrid",
        "errorMessageKey": "tools.adComponentKit.status.createIconGridFailed",
        "hidden": true,
        "fieldOnly": true
      },
      {
        "id": "refreshSelectedComponent",
        "labelKey": "tools.adComponentKit.actions.refreshSelectedComponent",
        "hostFunction": "AEToolbox.tools.adComponentKit.refreshSelectedComponent",
        "refreshStateAfterRun": true,
        "pendingMessageKey": "tools.adComponentKit.status.refreshingComponent",
        "successMessageKey": "tools.adComponentKit.status.componentRefreshed",
        "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed",
        "hidden": true,
        "fieldOnly": true
      },
      {
        "id": "selectComponentLayers",
        "labelKey": "tools.adComponentKit.actions.selectComponentLayers",
        "hostFunction": "AEToolbox.tools.adComponentKit.selectComponentLayers",
        "refreshStateAfterRun": true,
        "pendingMessageKey": "tools.adComponentKit.status.selectingComponentLayers",
        "successMessageKey": "tools.adComponentKit.status.componentLayersSelected",
        "errorMessageKey": "tools.adComponentKit.status.componentMaintenanceFailed",
        "hidden": true,
        "fieldOnly": true
      },
      {
        "id": "removeSelectedGeneratedComponent",
        "labelKey": "tools.adComponentKit.actions.removeSelectedGeneratedComponent",
        "hostFunction": "AEToolbox.tools.adComponentKit.removeSelectedGeneratedComponent",
        "refreshStateAfterRun": true,
        "pendingMessageKey": "tools.adComponentKit.status.removingGeneratedComponent",
        "successMessageKey": "tools.adComponentKit.status.generatedComponentRemoved",
        "errorMessageKey": "tools.adComponentKit.status.generatedComponentRemoveFailed",
        "hidden": true,
        "fieldOnly": true
      }
    ],
    "i18n": {
      "en": {
        "tools.adComponentKit.title": "Ad Component Kit",
        "tools.adComponentKit.description": "Create text feature stacks, icon grids, and maintain generated ad components.",
        "tools.adComponentKit.sections.state": "Component State",
        "tools.adComponentKit.sections.component": "Component Builder",
        "tools.adComponentKit.sections.componentDescription": "Choose one component type and tune only the relevant settings.",
        "tools.adComponentKit.state.activeComp": "Active Comp",
        "tools.adComponentKit.state.selectionCount": "Selection",
        "tools.adComponentKit.state.textLayerCount": "Text Layers",
        "tools.adComponentKit.state.twoDLayerCount": "2D Layers",
        "tools.adComponentKit.state.selectedControllerType": "Controller",
        "tools.adComponentKit.state.canCreateFeatureStack": "Can Create Feature Stack",
        "tools.adComponentKit.state.canCreateIconGrid": "Can Create Icon Grid",
        "tools.adComponentKit.state.canRemoveGeneratedComponent": "Can Remove Generated Component",
        "tools.adComponentKit.fields.componentKind": "Component Type",
        "tools.adComponentKit.options.featureStack": "Feature Stack",
        "tools.adComponentKit.options.featureStackDescription": "Create centered pill rows from selected text layers.",
        "tools.adComponentKit.options.iconGrid": "Icon Grid",
        "tools.adComponentKit.options.iconGridDescription": "Arrange selected 2D layers into a normalized grid.",
        "tools.adComponentKit.fields.gap": "Gap",
        "tools.adComponentKit.fields.paddingX": "Padding X",
        "tools.adComponentKit.fields.paddingY": "Padding Y",
        "tools.adComponentKit.fields.cornerRadius": "Corner Radius",
        "tools.adComponentKit.fields.fillColor": "Fill Color",
        "tools.adComponentKit.fields.pillWidthMode": "Pill Width Mode",
        "tools.adComponentKit.fields.fixedWidth": "Fixed Width",
        "tools.adComponentKit.fields.textAlign": "Text Align",
        "tools.adComponentKit.fields.sortMode": "Sort",
        "tools.adComponentKit.fields.columns": "Columns",
        "tools.adComponentKit.fields.normalizeMode": "Normalize Mode",
        "tools.adComponentKit.fields.targetWidth": "Target Width",
        "tools.adComponentKit.fields.targetHeight": "Target Height",
        "tools.adComponentKit.fields.cellWidth": "Cell Width",
        "tools.adComponentKit.fields.cellHeight": "Cell Height",
        "tools.adComponentKit.fields.gapX": "Gap X",
        "tools.adComponentKit.fields.gapY": "Gap Y",
        "tools.adComponentKit.fields.lastRowAlign": "Last Row Align",
        "tools.adComponentKit.fields.gridSortMode": "Sort",
        "tools.adComponentKit.notes.iconGridAdvanced": "Icon Grid is kept in this unified tool, but it remains an advanced workflow.",
        "tools.adComponentKit.actions.createFeatureStack": "Create Feature Stack",
        "tools.adComponentKit.actions.createIconGrid": "Create Icon Grid",
        "tools.adComponentKit.actions.refreshSelectedComponent": "Refresh Selected Component",
        "tools.adComponentKit.actions.selectComponentLayers": "Select Component Layers",
        "tools.adComponentKit.actions.removeSelectedGeneratedComponent": "Remove Selected Generated Component",
        "tools.adComponentKit.status.creatingFeatureStack": "Creating Feature Stack...",
        "tools.adComponentKit.status.createdFeatureStack": "Feature Stack created.",
        "tools.adComponentKit.status.createFeatureStackFailed": "Select one or more text layers.",
        "tools.adComponentKit.status.creatingIconGrid": "Creating Icon Grid...",
        "tools.adComponentKit.status.createdIconGrid": "Icon Grid created.",
        "tools.adComponentKit.status.createIconGridFailed": "Select one or more supported 2D layers.",
        "tools.adComponentKit.status.refreshingComponent": "Refreshing selected component...",
        "tools.adComponentKit.status.componentRefreshed": "Component refreshed.",
        "tools.adComponentKit.status.selectingComponentLayers": "Selecting component layers...",
        "tools.adComponentKit.status.componentLayersSelected": "Component layers selected.",
        "tools.adComponentKit.status.removingGeneratedComponent": "Removing generated component...",
        "tools.adComponentKit.status.generatedComponentRemoved": "Generated component removed.",
        "tools.adComponentKit.status.generatedComponentRemoveFailed": "Select a new generated component layer with Lomond metadata.",
        "tools.adComponentKit.status.componentMaintenanceFailed": "Select a generated component controller."
      },
      "zh-CN": {
        "tools.adComponentKit.title": "电商组件工具箱",
        "tools.adComponentKit.description": "创建卖点胶囊、图标网格，并维护已生成的电商组件。",
        "tools.adComponentKit.sections.state": "组件状态",
        "tools.adComponentKit.sections.component": "组件构建",
        "tools.adComponentKit.sections.componentDescription": "选择一种组件类型，只调整相关参数。",
        "tools.adComponentKit.state.activeComp": "激活合成",
        "tools.adComponentKit.state.selectionCount": "选中数量",
        "tools.adComponentKit.state.textLayerCount": "文本层",
        "tools.adComponentKit.state.twoDLayerCount": "2D 图层",
        "tools.adComponentKit.state.selectedControllerType": "控制器",
        "tools.adComponentKit.state.canCreateFeatureStack": "可创建卖点胶囊",
        "tools.adComponentKit.state.canCreateIconGrid": "可创建图标网格",
        "tools.adComponentKit.state.canRemoveGeneratedComponent": "可移除生成组件",
        "tools.adComponentKit.fields.componentKind": "组件类型",
        "tools.adComponentKit.options.featureStack": "卖点胶囊",
        "tools.adComponentKit.options.featureStackDescription": "将选中文本层创建为居中胶囊行。",
        "tools.adComponentKit.options.iconGrid": "图标网格",
        "tools.adComponentKit.options.iconGridDescription": "将选中的 2D 图层排列为统一网格。",
        "tools.adComponentKit.fields.gap": "间距",
        "tools.adComponentKit.fields.paddingX": "Padding X",
        "tools.adComponentKit.fields.paddingY": "Padding Y",
        "tools.adComponentKit.fields.cornerRadius": "圆角半径",
        "tools.adComponentKit.fields.fillColor": "填充颜色",
        "tools.adComponentKit.fields.pillWidthMode": "胶囊宽度模式",
        "tools.adComponentKit.fields.fixedWidth": "固定宽度",
        "tools.adComponentKit.fields.textAlign": "文本对齐",
        "tools.adComponentKit.fields.sortMode": "排序",
        "tools.adComponentKit.fields.columns": "列数",
        "tools.adComponentKit.fields.normalizeMode": "统一尺寸模式",
        "tools.adComponentKit.fields.targetWidth": "目标宽度",
        "tools.adComponentKit.fields.targetHeight": "目标高度",
        "tools.adComponentKit.fields.cellWidth": "单元格宽度",
        "tools.adComponentKit.fields.cellHeight": "单元格高度",
        "tools.adComponentKit.fields.gapX": "间距 X",
        "tools.adComponentKit.fields.gapY": "间距 Y",
        "tools.adComponentKit.fields.lastRowAlign": "最后一行对齐",
        "tools.adComponentKit.fields.gridSortMode": "网格排序",
        "tools.adComponentKit.notes.iconGridAdvanced": "图标网格保留在统一工具中，但仍属于进阶工作流。",
        "tools.adComponentKit.actions.createFeatureStack": "创建卖点胶囊",
        "tools.adComponentKit.actions.createIconGrid": "创建图标网格",
        "tools.adComponentKit.actions.refreshSelectedComponent": "刷新选中组件",
        "tools.adComponentKit.actions.selectComponentLayers": "选择组件图层",
        "tools.adComponentKit.actions.removeSelectedGeneratedComponent": "移除选中生成组件",
        "tools.adComponentKit.status.creatingFeatureStack": "正在创建卖点胶囊...",
        "tools.adComponentKit.status.createdFeatureStack": "卖点胶囊已创建。",
        "tools.adComponentKit.status.createFeatureStackFailed": "请选择一个或多个文本层。",
        "tools.adComponentKit.status.creatingIconGrid": "正在创建图标网格...",
        "tools.adComponentKit.status.createdIconGrid": "图标网格已创建。",
        "tools.adComponentKit.status.createIconGridFailed": "请选择一个或多个受支持的 2D 图层。",
        "tools.adComponentKit.status.refreshingComponent": "正在刷新选中组件...",
        "tools.adComponentKit.status.componentRefreshed": "组件已刷新。",
        "tools.adComponentKit.status.selectingComponentLayers": "正在选择组件图层...",
        "tools.adComponentKit.status.componentLayersSelected": "已选择组件图层。",
        "tools.adComponentKit.status.removingGeneratedComponent": "正在移除生成组件...",
        "tools.adComponentKit.status.generatedComponentRemoved": "生成组件已移除。",
        "tools.adComponentKit.status.generatedComponentRemoveFailed": "请选择带有 Lomond metadata 的新生成组件图层。",
        "tools.adComponentKit.status.componentMaintenanceFailed": "请选择已生成的组件控制器。"
      }
    }
  },
  "controls": {
    "id": "registryControlLab",
    "titleKey": "tools.registryControlLab.title",
    "descriptionKey": "tools.registryControlLab.description",
    "category": "debug",
    "iconText": "C",
    "debugOnly": true,
    "controlLabCoverage": {
      "registryPath": [
        "text",
        "textarea",
        "number",
        "range",
        "select",
        "checkbox",
        "switch",
        "tabs",
        "color",
        "button",
        "actionButton",
        "divider",
        "separator",
        "info",
        "note",
        "subheading",
        "cubicBezier"
      ],
      "coreUiDirect": [
        "createFieldRow",
        "enhanceSelect",
        "createButton",
        "createShadowField"
      ],
      "buttonVariants": [
        "utility",
        "navigation"
      ],
      "colorFieldAlphaMode": true,
      "exemptions": {
        "proceduralPreview": "Domain-bound canvas specimen requires the Procedural Appearance Lab runtime."
      }
    },
    "stateAction": {
      "hostFunction": "AEToolbox.tools.registryControlLab.getState",
      "intervalMs": 1200
    },
    "stateCard": {
      "titleKey": "tools.registryControlLab.sections.state",
      "fields": [
        {
          "stateKey": "compName",
          "labelKey": "tools.registryControlLab.state.compName"
        },
        {
          "stateKey": "selectedCount",
          "labelKey": "tools.registryControlLab.state.selectedCount"
        },
        {
          "stateKey": "refreshCount",
          "labelKey": "tools.registryControlLab.state.refreshCount"
        }
      ]
    },
    "sections": [
      {
        "id": "basic",
        "labelKey": "tools.registryControlLab.sections.basic",
        "descriptionKey": "tools.registryControlLab.sections.basicDescription",
        "fields": [
          {
            "type": "subheading",
            "labelKey": "tools.registryControlLab.sections.registryPath"
          },
          {
            "type": "info",
            "labelKey": "tools.registryControlLab.notes.basic"
          },
          {
            "type": "text",
            "key": "textValue",
            "labelKey": "tools.registryControlLab.fields.textValue",
            "hintKey": "tools.registryControlLab.hints.textValue",
            "defaultValue": "Sample text"
          },
          {
            "type": "textarea",
            "key": "noteValue",
            "labelKey": "tools.registryControlLab.fields.noteValue",
            "hintKey": "tools.registryControlLab.hints.noteValue",
            "defaultValue": "Multiline note"
          },
          {
            "type": "divider"
          },
          {
            "type": "number",
            "key": "numberValue",
            "labelKey": "tools.registryControlLab.fields.numberValue",
            "hintKey": "tools.registryControlLab.hints.numberValue",
            "defaultValue": 12,
            "min": 0,
            "max": 100,
            "step": 1
          },
          {
            "type": "range",
            "key": "rangeValue",
            "labelKey": "tools.registryControlLab.fields.rangeValue",
            "hintKey": "tools.registryControlLab.hints.rangeValue",
            "defaultValue": 42,
            "min": 0,
            "max": 100,
            "step": 1
          }
        ]
      },
      {
        "id": "options",
        "labelKey": "tools.registryControlLab.sections.options",
        "descriptionKey": "tools.registryControlLab.sections.optionsDescription",
        "fields": [
          {
            "type": "switch",
            "key": "enabled",
            "labelKey": "tools.registryControlLab.fields.enabled",
            "hintKey": "tools.registryControlLab.hints.enabled",
            "defaultValue": true
          },
          {
            "type": "checkbox",
            "key": "acknowledged",
            "labelKey": "tools.registryControlLab.fields.acknowledged",
            "hintKey": "tools.registryControlLab.hints.acknowledged",
            "defaultValue": false
          },
          {
            "type": "select",
            "key": "mode",
            "labelKey": "tools.registryControlLab.fields.mode",
            "hintKey": "tools.registryControlLab.hints.mode",
            "defaultValue": "solid",
            "options": [
              {
                "value": "none",
                "labelKey": "common.none"
              },
              {
                "value": "solid",
                "labelKey": "common.solid"
              },
              {
                "value": "gradient",
                "labelKey": "common.gradient"
              }
            ]
          }
        ]
      },
      {
        "id": "colors",
        "labelKey": "tools.registryControlLab.sections.colors",
        "descriptionKey": "tools.registryControlLab.sections.colorsDescription",
        "fields": [
          {
            "type": "color",
            "key": "fillColor",
            "labelKey": "tools.registryControlLab.fields.fillColor",
            "hintKey": "tools.registryControlLab.hints.fillColor",
            "defaultValue": "#c9a452"
          },
          {
            "type": "color",
            "key": "strokeColor",
            "labelKey": "tools.registryControlLab.fields.strokeColor",
            "hintKey": "tools.registryControlLab.hints.strokeColor",
            "defaultValue": "#ffffff"
          }
        ]
      },
      {
        "id": "togglePanel",
        "labelKey": "tools.registryControlLab.sections.togglePanel",
        "descriptionKey": "tools.registryControlLab.sections.togglePanelDescription",
        "toggleKey": "enableTogglePanel",
        "defaultEnabled": true,
        "collapsible": true,
        "fields": [
          {
            "type": "text",
            "key": "toggleText",
            "labelKey": "tools.registryControlLab.fields.toggleText",
            "hintKey": "tools.registryControlLab.hints.toggleText",
            "defaultValue": "Enabled section"
          },
          {
            "type": "number",
            "key": "toggleNumber",
            "labelKey": "tools.registryControlLab.fields.toggleNumber",
            "hintKey": "tools.registryControlLab.hints.toggleNumber",
            "defaultValue": 8,
            "min": 0,
            "max": 20,
            "step": 1
          }
        ]
      },
      {
        "id": "bezierCurves",
        "labelKey": "tools.registryControlLab.sections.bezierCurves",
        "descriptionKey": "tools.registryControlLab.sections.bezierCurvesDescription",
        "collapsible": true,
        "fields": [
          {
            "type": "cubicBezier",
            "key": "defaultCurve",
            "labelKey": "tools.registryControlLab.fields.defaultCurve",
            "hintKey": "tools.registryControlLab.hints.defaultCurve",
            "defaultValue": {
              "x1": 0.25,
              "y1": 0.1,
              "x2": 0.25,
              "y2": 1
            },
            "progressLabelKey": "tools.registryControlLab.curve.progress",
            "speedLabelKey": "tools.registryControlLab.curve.speed",
            "point1LabelKey": "tools.registryControlLab.curve.point1",
            "point2LabelKey": "tools.registryControlLab.curve.point2"
          },
          {
            "type": "cubicBezier",
            "key": "overshootCurve",
            "labelKey": "tools.registryControlLab.fields.overshootCurve",
            "hintKey": "tools.registryControlLab.hints.overshootCurve",
            "defaultValue": {
              "x1": 0.2,
              "y1": -0.4,
              "x2": 0.35,
              "y2": 1.45
            },
            "initialView": "speed",
            "progressLabelKey": "tools.registryControlLab.curve.progress",
            "speedLabelKey": "tools.registryControlLab.curve.speed",
            "point1LabelKey": "tools.registryControlLab.curve.point1",
            "point2LabelKey": "tools.registryControlLab.curve.point2"
          },
          {
            "type": "cubicBezier",
            "key": "readonlyCurve",
            "labelKey": "tools.registryControlLab.fields.readonlyCurve",
            "hintKey": "tools.registryControlLab.hints.readonlyCurve",
            "defaultValue": {
              "x1": 0.42,
              "y1": 0,
              "x2": 0.58,
              "y2": 1
            },
            "readonly": true
          },
          {
            "type": "cubicBezier",
            "key": "disabledCurve",
            "labelKey": "tools.registryControlLab.fields.disabledCurve",
            "hintKey": "tools.registryControlLab.hints.disabledCurve",
            "defaultValue": {
              "x1": 0.3,
              "y1": 0,
              "x2": 0.7,
              "y2": 1
            },
            "disabled": true
          }
        ]
      },
      {
        "id": "actions",
        "labelKey": "tools.registryControlLab.sections.actions",
        "descriptionKey": "tools.registryControlLab.sections.actionsDescription",
        "composition": "actionStack",
        "fields": [
          {
            "type": "button",
            "key": "secondaryButton",
            "labelKey": "tools.registryControlLab.actions.secondaryButton",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "previewValues"
          },
          {
            "type": "button",
            "key": "primaryButton",
            "labelKey": "tools.registryControlLab.actions.primaryButton",
            "variant": "primary",
            "fullWidth": true,
            "actionId": "previewValues"
          },
          {
            "type": "button",
            "key": "dangerButton",
            "labelKey": "tools.registryControlLab.actions.dangerButton",
            "variant": "danger",
            "fullWidth": true,
            "actionId": "previewValues"
          },
          {
            "type": "button",
            "key": "bilingualButton",
            "labelKey": "tools.registryControlLab.actions.bilingualButton",
            "secondaryText": "rectangle",
            "secondaryTextType": "matchName",
            "textLayout": "centerAxisPair",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "previewValues"
          }
        ]
      },
      {
        "id": "actionState",
        "labelKey": "tools.registryControlLab.sections.actionState",
        "descriptionKey": "tools.registryControlLab.sections.actionStateDescription",
        "fields": [
          {
            "type": "info",
            "labelKey": "tools.registryControlLab.notes.actionState"
          },
          {
            "type": "button",
            "key": "payloadButton",
            "labelKey": "tools.registryControlLab.actions.payloadButton",
            "secondaryText": "payload",
            "textLayout": "centerAxisPair",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "previewValues",
            "actionPayload": {
              "payloadKey": "rectangle",
              "matchName": "ADBE Vector Shape - Rect",
              "omitMessageKey": true
            },
            "pendingMessageKey": "tools.registryControlLab.status.payloadPending",
            "successMessageKey": "tools.registryControlLab.status.payloadReceived",
            "errorMessageKey": "tools.registryControlLab.status.payloadFailed"
          },
          {
            "type": "button",
            "key": "stateDisabledButton",
            "labelKey": "tools.registryControlLab.actions.stateDisabledButton",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "previewValues",
            "enabledWhen": {
              "stateKey": "hasComp",
              "equals": true
            },
            "actionPayload": {
              "source": "stateDisabledButton"
            },
            "pendingMessageKey": "tools.registryControlLab.status.stateButtonPending",
            "successMessageKey": "tools.registryControlLab.status.stateButtonSuccess"
          },
          {
            "type": "button",
            "key": "fallbackErrorButton",
            "labelKey": "tools.registryControlLab.actions.fallbackErrorButton",
            "variant": "secondary",
            "fullWidth": true,
            "actionId": "previewValues",
            "actionPayload": {
              "source": "fallbackErrorButton",
              "forceError": true
            },
            "pendingMessageKey": "tools.registryControlLab.status.fallbackErrorPending",
            "errorMessageKey": "tools.registryControlLab.status.fallbackErrorShown"
          },
          {
            "type": "button",
            "key": "refreshAfterRunButton",
            "labelKey": "tools.registryControlLab.actions.refreshAfterRunButton",
            "variant": "primary",
            "fullWidth": true,
            "actionId": "previewValues",
            "refreshStateAfterRun": true,
            "actionPayload": {
              "source": "refreshAfterRunButton"
            },
            "pendingMessageKey": "tools.registryControlLab.status.refreshAfterRunPending",
            "successMessageKey": "tools.registryControlLab.status.refreshAfterRunSuccess"
          }
        ]
      },
      {
        "id": "tabs",
        "labelKey": "tools.registryControlLab.sections.tabs",
        "descriptionKey": "tools.registryControlLab.sections.tabsDescription",
        "fields": [
          {
            "type": "tabs",
            "key": "componentType",
            "labelKey": "tools.registryControlLab.fields.componentType",
            "hintKey": "tools.registryControlLab.hints.componentType",
            "defaultValue": "feature",
            "options": [
              {
                "value": "feature",
                "labelKey": "tools.registryControlLab.options.feature",
                "descriptionKey": "tools.registryControlLab.options.featureDescription",
                "iconText": "F"
              },
              {
                "value": "grid",
                "labelKey": "tools.registryControlLab.options.grid",
                "descriptionKey": "tools.registryControlLab.options.gridDescription",
                "iconText": "G"
              },
              {
                "value": "longDisabled",
                "labelKey": "tools.registryControlLab.options.longDisabled",
                "descriptionKey": "tools.registryControlLab.options.longDisabledDescription",
                "iconText": "L",
                "disabled": true
              }
            ]
          },
          {
            "type": "number",
            "key": "featureOnlyGap",
            "labelKey": "tools.registryControlLab.fields.featureOnlyGap",
            "defaultValue": 24,
            "min": 0,
            "step": 1,
            "visibleWhen": {
              "key": "componentType",
              "equals": "feature"
            }
          },
          {
            "type": "number",
            "key": "gridOnlyColumns",
            "labelKey": "tools.registryControlLab.fields.gridOnlyColumns",
            "defaultValue": 4,
            "min": 1,
            "max": 12,
            "step": 1,
            "visibleWhen": {
              "key": "componentType",
              "equals": "grid"
            }
          }
        ]
      }
    ],
    "actions": [
      {
        "id": "previewValues",
        "labelKey": "tools.registryControlLab.actions.previewValues",
        "hostFunction": "AEToolbox.tools.registryControlLab.previewValues",
        "style": "primary",
        "refreshStateAfterRun": true,
        "pendingMessageKey": "tools.registryControlLab.status.previewPending",
        "successMessageKey": "tools.registryControlLab.status.previewed",
        "errorMessageKey": "tools.registryControlLab.status.previewFailed"
      }
    ],
    "i18n": {
      "en": {
        "tools.registryControlLab.title": "Registry Control Lab",
        "tools.registryControlLab.description": "Test the shared registry renderer with every standard control type.",
        "tools.registryControlLab.sections.basic": "Basic Controls",
        "tools.registryControlLab.sections.registryPath": "Registry Path",
        "tools.registryControlLab.sections.coreUiDirect": "CoreUI Direct",
        "tools.registryControlLab.fields.shadowField": "Shadow Field",
        "tools.registryControlLab.fields.colorAlphaField": "Color + Alpha Field",
        "tools.registryControlLab.sections.basicDescription": "Text, textarea, numeric entry, and slider behavior.",
        "tools.registryControlLab.sections.colors": "Colors",
        "tools.registryControlLab.sections.colorsDescription": "Color pills, hex values, and the HSV picker.",
        "tools.registryControlLab.sections.options": "Options",
        "tools.registryControlLab.sections.optionsDescription": "Switch and select controls using the shared black-gold UI.",
        "tools.registryControlLab.sections.togglePanel": "Toggle Section",
        "tools.registryControlLab.sections.togglePanelDescription": "Tests section-level enable and collapse behavior.",
        "tools.registryControlLab.sections.actions": "Large Buttons",
        "tools.registryControlLab.sections.actionsDescription": "Tests full-width registry action buttons and center-axis text layout.",
        "tools.registryControlLab.sections.tabs": "Tabs",
        "tools.registryControlLab.sections.tabsDescription": "Tests option cards and conditional field visibility.",
        "tools.registryControlLab.sections.bezierCurves": "Cubic Bezier Curves",
        "tools.registryControlLab.sections.bezierCurvesDescription": "Generic Progress and Speed editing with structured curve values.",
        "tools.registryControlLab.sections.state": "Host State",
        "tools.registryControlLab.sections.actionState": "Action and State",
        "tools.registryControlLab.sections.actionStateDescription": "Action payloads, state-driven disabled buttons, and state refresh hooks.",
        "tools.registryControlLab.fields.textValue": "Text",
        "tools.registryControlLab.fields.noteValue": "Note",
        "tools.registryControlLab.fields.numberValue": "Number",
        "tools.registryControlLab.fields.rangeValue": "Range",
        "tools.registryControlLab.fields.enabled": "Enabled",
        "tools.registryControlLab.fields.acknowledged": "Acknowledge this selection",
        "tools.registryControlLab.fields.mode": "Mode",
        "tools.registryControlLab.fields.fillColor": "Fill Color",
        "tools.registryControlLab.fields.strokeColor": "Stroke Color",
        "tools.registryControlLab.fields.toggleText": "Toggle Text",
        "tools.registryControlLab.fields.toggleNumber": "Toggle Number",
        "tools.registryControlLab.fields.componentType": "Component Type",
        "tools.registryControlLab.fields.featureOnlyGap": "Feature Gap",
        "tools.registryControlLab.fields.gridOnlyColumns": "Grid Columns",
        "tools.registryControlLab.fields.defaultCurve": "Default Curve",
        "tools.registryControlLab.fields.overshootCurve": "Overshoot Curve",
        "tools.registryControlLab.fields.readonlyCurve": "Readonly Curve",
        "tools.registryControlLab.fields.disabledCurve": "Disabled Curve",
        "tools.registryControlLab.curve.progress": "Progress / Value",
        "tools.registryControlLab.curve.speed": "Speed",
        "tools.registryControlLab.curve.point1": "Control Point 1",
        "tools.registryControlLab.curve.point2": "Control Point 2",
        "tools.registryControlLab.actions.previewValues": "Preview Values",
        "tools.registryControlLab.actions.secondaryButton": "Secondary Full-width Button",
        "tools.registryControlLab.actions.primaryButton": "Primary Full-width Button",
        "tools.registryControlLab.actions.dangerButton": "Danger Action Test",
        "tools.registryControlLab.actions.bilingualButton": "Rectangle",
        "tools.registryControlLab.actions.payloadButton": "Send Payload",
        "tools.registryControlLab.actions.stateDisabledButton": "Requires Active Comp",
        "tools.registryControlLab.actions.fallbackErrorButton": "Test Error Fallback",
        "tools.registryControlLab.actions.refreshAfterRunButton": "Run and Refresh State",
        "tools.registryControlLab.options.feature": "Feature",
        "tools.registryControlLab.options.grid": "Grid",
        "tools.registryControlLab.options.longDisabled": "Unavailable long-label option",
        "tools.registryControlLab.options.featureDescription": "Show feature-only fields.",
        "tools.registryControlLab.options.gridDescription": "Show grid-only fields.",
        "tools.registryControlLab.options.longDisabledDescription": "Disabled supporting copy for narrow and typography stress.",
        "tools.registryControlLab.status.previewed": "Received registry control values.",
        "tools.registryControlLab.status.previewPending": "Sending registry control values...",
        "tools.registryControlLab.status.previewFailed": "Registry control preview failed.",
        "tools.registryControlLab.status.stateRefreshed": "Registry host state refreshed.",
        "tools.registryControlLab.status.payloadPending": "Sending action payload...",
        "tools.registryControlLab.status.payloadReceived": "Action payload received.",
        "tools.registryControlLab.status.payloadFailed": "Action payload failed.",
        "tools.registryControlLab.status.stateButtonPending": "Running state-gated action...",
        "tools.registryControlLab.status.stateButtonSuccess": "State-gated action completed.",
        "tools.registryControlLab.status.fallbackErrorPending": "Testing error fallback...",
        "tools.registryControlLab.status.fallbackErrorShown": "Action-specific error fallback shown.",
        "tools.registryControlLab.status.refreshAfterRunPending": "Running action and refreshing state...",
        "tools.registryControlLab.status.refreshAfterRunSuccess": "Action completed and state refreshed.",
        "tools.registryControlLab.state.compName": "Comp",
        "tools.registryControlLab.state.selectedCount": "Selected Layers",
        "tools.registryControlLab.state.refreshCount": "Refresh Count",
        "tools.registryControlLab.notes.basic": "This lab validates shared controls only. It does not modify After Effects layers.",
        "tools.registryControlLab.notes.actionState": "Open a composition to enable the state-gated button. Payload values are sent only with that action and are not persisted.",
        "tools.registryControlLab.hints.textValue": "Single-line text input.",
        "tools.registryControlLab.hints.noteValue": "Multiline text area.",
        "tools.registryControlLab.hints.numberValue": "Type a value or drag horizontally.",
        "tools.registryControlLab.hints.rangeValue": "Number box and slider stay synchronized.",
        "tools.registryControlLab.hints.enabled": "Keeps the existing switch visual style.",
        "tools.registryControlLab.hints.acknowledged": "Checkboxes represent acknowledgement or selection, not an immediate feature toggle.",
        "tools.registryControlLab.hints.mode": "Uses the existing custom select menu.",
        "tools.registryControlLab.hints.fillColor": "Opens the custom HSV color picker.",
        "tools.registryControlLab.hints.strokeColor": "Returns a normalized #rrggbb value.",
        "tools.registryControlLab.hints.toggleText": "This field is muted while the section is disabled.",
        "tools.registryControlLab.hints.toggleNumber": "The toggle value is still collected with form values.",
        "tools.registryControlLab.hints.componentType": "Switch tabs to test visibleWhen field behavior.",
        "tools.registryControlLab.hints.defaultCurve": "Edit P1/P2 by graph, keyboard, numeric input, or scrub.",
        "tools.registryControlLab.hints.overshootCurve": "Y values outside 0-1 remain valid and expand the viewport.",
        "tools.registryControlLab.hints.readonlyCurve": "View switching remains available while curve editing is locked.",
        "tools.registryControlLab.hints.disabledCurve": "All graph, view, and numeric interactions are disabled."
      },
      "zh-CN": {
        "tools.registryControlLab.title": "控件测试实验室",
        "tools.registryControlLab.description": "用于验证共用 registry renderer 的所有标准控件类型。",
        "tools.registryControlLab.sections.basic": "基础控件",
        "tools.registryControlLab.sections.registryPath": "Registry 路径",
        "tools.registryControlLab.sections.coreUiDirect": "CoreUI 直接路径",
        "tools.registryControlLab.fields.shadowField": "阴影字段",
        "tools.registryControlLab.fields.colorAlphaField": "颜色 + Alpha 字段",
        "tools.registryControlLab.sections.basicDescription": "验证文本、多行文本、数值输入和滑杆行为。",
        "tools.registryControlLab.sections.colors": "颜色",
        "tools.registryControlLab.sections.colorsDescription": "验证色块、Hex 值和 HSV 取色器。",
        "tools.registryControlLab.sections.options": "选项",
        "tools.registryControlLab.sections.optionsDescription": "使用共用黑金 UI 的开关和下拉控件。",
        "tools.registryControlLab.sections.togglePanel": "分区开关",
        "tools.registryControlLab.sections.togglePanelDescription": "验证分区级启用和折叠行为。",
        "tools.registryControlLab.sections.actions": "大型按钮",
        "tools.registryControlLab.sections.actionsDescription": "验证横向填满的 registry action button 和中轴双文本布局。",
        "tools.registryControlLab.sections.tabs": "标签页",
        "tools.registryControlLab.sections.tabsDescription": "验证选项卡和条件字段显隐。",
        "tools.registryControlLab.sections.bezierCurves": "三次贝塞尔曲线",
        "tools.registryControlLab.sections.bezierCurvesDescription": "使用结构化曲线值验证通用进度与速度编辑。",
        "tools.registryControlLab.sections.state": "Host 状态",
        "tools.registryControlLab.sections.actionState": "操作与状态",
        "tools.registryControlLab.sections.actionStateDescription": "验证 action payload、状态驱动的禁用按钮和执行后状态刷新。",
        "tools.registryControlLab.fields.textValue": "文本",
        "tools.registryControlLab.fields.noteValue": "备注",
        "tools.registryControlLab.fields.numberValue": "数值",
        "tools.registryControlLab.fields.rangeValue": "滑杆",
        "tools.registryControlLab.fields.enabled": "启用",
        "tools.registryControlLab.fields.acknowledged": "确认此选择",
        "tools.registryControlLab.fields.mode": "模式",
        "tools.registryControlLab.fields.fillColor": "填充颜色",
        "tools.registryControlLab.fields.strokeColor": "描边颜色",
        "tools.registryControlLab.fields.toggleText": "开关文本",
        "tools.registryControlLab.fields.toggleNumber": "开关数值",
        "tools.registryControlLab.fields.componentType": "组件类型",
        "tools.registryControlLab.fields.featureOnlyGap": "卖点间距",
        "tools.registryControlLab.fields.gridOnlyColumns": "网格列数",
        "tools.registryControlLab.fields.defaultCurve": "默认曲线",
        "tools.registryControlLab.fields.overshootCurve": "超调曲线",
        "tools.registryControlLab.fields.readonlyCurve": "只读曲线",
        "tools.registryControlLab.fields.disabledCurve": "禁用曲线",
        "tools.registryControlLab.curve.progress": "进度 / 值",
        "tools.registryControlLab.curve.speed": "速度",
        "tools.registryControlLab.curve.point1": "控制点 1",
        "tools.registryControlLab.curve.point2": "控制点 2",
        "tools.registryControlLab.actions.previewValues": "预览参数",
        "tools.registryControlLab.actions.secondaryButton": "次要横向按钮",
        "tools.registryControlLab.actions.primaryButton": "主要横向按钮",
        "tools.registryControlLab.actions.dangerButton": "危险操作测试",
        "tools.registryControlLab.actions.bilingualButton": "矩形",
        "tools.registryControlLab.actions.payloadButton": "发送 Payload",
        "tools.registryControlLab.actions.stateDisabledButton": "需要激活合成",
        "tools.registryControlLab.actions.fallbackErrorButton": "测试错误 Fallback",
        "tools.registryControlLab.actions.refreshAfterRunButton": "执行并刷新状态",
        "tools.registryControlLab.options.feature": "卖点",
        "tools.registryControlLab.options.grid": "网格",
        "tools.registryControlLab.options.longDisabled": "不可用的长标签选项",
        "tools.registryControlLab.options.featureDescription": "显示卖点专属字段。",
        "tools.registryControlLab.options.gridDescription": "显示网格专属字段。",
        "tools.registryControlLab.options.longDisabledDescription": "用于窄布局和排版压力验证的禁用说明。",
        "tools.registryControlLab.status.previewed": "已接收 registry 控件参数。",
        "tools.registryControlLab.status.previewPending": "正在发送 registry 控件参数...",
        "tools.registryControlLab.status.previewFailed": "Registry 控件预览失败。",
        "tools.registryControlLab.status.stateRefreshed": "Registry host 状态已刷新。",
        "tools.registryControlLab.status.payloadPending": "正在发送 action payload...",
        "tools.registryControlLab.status.payloadReceived": "Action payload 已接收。",
        "tools.registryControlLab.status.payloadFailed": "Action payload 失败。",
        "tools.registryControlLab.status.stateButtonPending": "正在执行状态限制操作...",
        "tools.registryControlLab.status.stateButtonSuccess": "状态限制操作已完成。",
        "tools.registryControlLab.status.fallbackErrorPending": "正在测试错误 fallback...",
        "tools.registryControlLab.status.fallbackErrorShown": "已显示 action 专属错误 fallback。",
        "tools.registryControlLab.status.refreshAfterRunPending": "正在执行并刷新状态...",
        "tools.registryControlLab.status.refreshAfterRunSuccess": "操作已完成，状态已刷新。",
        "tools.registryControlLab.state.compName": "合成",
        "tools.registryControlLab.state.selectedCount": "选中图层",
        "tools.registryControlLab.state.refreshCount": "刷新次数",
        "tools.registryControlLab.notes.basic": "该实验室只验证共用控件，不修改 After Effects 图层。",
        "tools.registryControlLab.notes.actionState": "打开合成后，状态限制按钮会变为可用。Payload 只随本次 action 发送，不会持久化。",
        "tools.registryControlLab.hints.textValue": "单行文本输入。",
        "tools.registryControlLab.hints.noteValue": "多行文本区域。",
        "tools.registryControlLab.hints.numberValue": "可输入数值，也可横向拖动修改。",
        "tools.registryControlLab.hints.rangeValue": "数值框和滑杆保持同步。",
        "tools.registryControlLab.hints.enabled": "保留现有开关视觉风格。",
        "tools.registryControlLab.hints.acknowledged": "复选框表示确认或选择，而不是立即功能开关。",
        "tools.registryControlLab.hints.mode": "使用现有自定义下拉菜单。",
        "tools.registryControlLab.hints.fillColor": "打开自定义 HSV 取色器。",
        "tools.registryControlLab.hints.strokeColor": "返回标准化的 #rrggbb 值。",
        "tools.registryControlLab.hints.toggleText": "分区关闭时该字段会弱化显示。",
        "tools.registryControlLab.hints.toggleNumber": "分区开关值会随表单参数一起收集。",
        "tools.registryControlLab.hints.componentType": "切换标签页以测试 visibleWhen 字段显隐。",
        "tools.registryControlLab.hints.defaultCurve": "可通过图形、键盘、数值输入或拖擦编辑 P1/P2。",
        "tools.registryControlLab.hints.overshootCurve": "0-1 之外的 Y 值仍然合法，并会扩展视口。",
        "tools.registryControlLab.hints.readonlyCurve": "曲线编辑锁定时仍可切换视图。",
        "tools.registryControlLab.hints.disabledCurve": "禁用所有图形、视图与数值交互。"
      }
    }
  }
};
