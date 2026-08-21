# 0.3.2 Full Design Calibration Worksheet

本表以 `client/js/designTuning/designTuningParameterRegistry.js` 的 `list()` 顺序为唯一参数来源。生成基线：`calibrate/0.3.2-full-design-calibration`，HEAD `afb60945e472615c2be5d5d40ac415af9f25f6fe`。

- U / A / D / X / P：User / Advanced / Developer / Remove from UI / Protected。
- Editable 参数的分类、校准值与采纳结论均留空，等待真实 AE 人工 Calibration。
- `Current Canonical` 记录当前 source-owned 默认值；长度记录独立于 UI Scale 的基准 px 值。
- `Issue / Observation` 只记录观察。只有证据明确属于 hardcode、duplicate authority、missing consumer 或 broken lifecycle 时，才标记 `STRUCTURAL ISSUE`。
- 本工作表不修改 canonical，不代表 promotion decision，也不把视觉异常自动判定为 consumer gap。

## Motion（19）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `motion.curve.enter` | Motion | 进入曲线 | `cubic-bezier(0.16, 1, 0.3, 1)` | 空间展开、内容进入、Home 交接、身份建立、Palette 进入、拖拽安定 | — | — | — | — |
| `motion.curve.exit` | Motion | 退出曲线 | `cubic-bezier(0.32, 0, 0.67, 0)` | 空间收缩、内容退出、Palette 退出 | — | — | — | — |
| `motion.curve.standard` | Motion | 标准曲线 | `cubic-bezier(0.22, 1, 0.36, 1)` | 操作反馈、surface state | — | — | — | — |
| `motion.curve.press` | Motion | 按压曲线 | `cubic-bezier(0.2, 0, 0, 1)` | action press | — | — | — | — |
| `motion.duration.spatialExpand` | Motion | 空间展开 | `480ms` | Tool / Settings spatial morph open | — | — | — | — |
| `motion.duration.spatialContract` | Motion | 空间收缩 | `360ms` | Tool / Settings spatial morph close | — | — | — | — |
| `motion.duration.viewContentEnter` | Motion | 视图内容进入 | `180ms` | Tool / Settings 内容 reveal | — | — | — | — |
| `motion.duration.viewContentExit` | Motion | 视图内容退出 | `120ms` | Tool / Settings 内容 exit | — | — | — | — |
| `motion.duration.actionFeedback` | Motion | 操作反馈 | `160ms` | shared action feedback | — | — | — | — |
| `motion.duration.actionPress` | Motion | 操作按压 | `120ms` | shared button press | — | — | — | — |
| `motion.duration.surfaceState` | Motion | 表面状态 | `160ms` | hover / selected 等 surface state | — | — | — | — |
| `motion.duration.structuralCollapse` | Motion | 结构收起 | `260ms` | disclosure / structural collapse | — | — | — | — |
| `motion.duration.homeHandoffRecede` | Motion | Home 交接退场 | `260ms` | Home identity recede | — | — | — | — |
| `motion.duration.homeHandoffRestore` | Motion | Home 交接恢复 | `260ms` | Home identity restore | — | — | — | — |
| `motion.duration.spatialIdentity` | Motion | 空间身份过渡 | `260ms` | Tool / Settings identity projection | — | — | — | — |
| `motion.duration.toolIdentityOpen` | Motion | 工具身份展开 | `360ms` | Home tool identity open | — | — | — | — |
| `motion.duration.paletteEnter` | Motion | 色板进入 | `260ms` | Palette workspace enter | — | — | — | — |
| `motion.duration.paletteExit` | Motion | 色板退出 | `160ms` | Palette workspace exit | — | — | — | — |
| `motion.duration.dragSettle` | Motion | 拖拽安定 | `260ms` | Home / shared drag settle | — | — | — | — |

## Spacing（18）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `spacing.surface.edge` | Spacing | 表面边缘 | `18px` | primary work surfaces 的外缘 inset | — | — | — | — |
| `spacing.card.inset` | Spacing | 卡片内边距 | `12px` | shared card content inset | — | — | — | — |
| `spacing.section.stack` | Spacing | 分区堆叠间距 | `12px` | shared section vertical stack | — | — | — | — |
| `spacing.section.headerContent` | Spacing | 分区标题与内容 | `11px` | shared section header → content | — | — | — | — |
| `spacing.field.copy` | Spacing | 字段文本间距 | `2px` | FieldRow label / supporting copy | — | — | — | — |
| `spacing.field.block` | Spacing | 字段块间距 | `7px` | shared field block stack | — | — | — | — |
| `spacing.control.inline` | Spacing | 行内控件间距 | `8px` | shared inline control composition | — | — | — | — |
| `spacing.settings.fieldControl` | Spacing | 设置字段与控件 | `12px` | Settings FieldRow copy → control | — | — | — | — |
| `spacing.registry.cardInset` | Spacing | Registry 卡片内边距 | `14px` | Registry section/card content | — | — | — | — |
| `spacing.registry.introContent` | Spacing | Registry 导语与内容 | `14px` | Tool intro → Registry content | — | — | — | — |
| `spacing.registry.sectionHeaderContent` | Spacing | Registry 分区标题与内容 | `14px` | Registry section header → body | — | — | — | — |
| `spacing.registry.sectionCopy` | Spacing | Registry 分区文本间距 | `5px` | Registry section title / description | — | — | — | — |
| `spacing.registry.fieldCopy` | Spacing | Registry 字段文本间距 | `3px` | Registry FieldRow label / supporting | — | — | — | — |
| `spacing.registry.fieldControl` | Spacing | Registry 字段与控件 | `14px` | Registry FieldRow copy → control；action stack alias | — | — | — | — |
| `spacing.palette.fieldControl` | Spacing | 色板字段与控件 | `10px` | Palette Editor FieldRow copy → control | — | — | — | — |
| `spacing.home.toolGrid` | Spacing | Home 工具网格间距 | `16px` | Home tool grid | — | — | — | — |
| `spacing.home.majorStack` | Spacing | Home 主堆叠间距 | `16px` | Home major regions | — | — | — | — |
| `spacing.home.cardTitle` | Spacing | Home 卡片标题间距 | `11px` | Home tool artwork → title | — | — | — | — |

## Radius（6）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `radius.primaryWorkSurface` | Radius | 主工作表面圆角 | `22px` (`--radius-lg`) | Tool Detail / Settings primary work surfaces | — | — | — | — |
| `radius.nestedSurface` | Radius | 嵌套表面圆角 | `16px` (`--radius-md`) | nested surfaces；Registry option / Palette item aliases | — | — | — | — |
| `radius.editableControl` | Radius | 可编辑控件圆角 | `10px` (`--radius-sm`) | shared editable controls | — | — | — | — |
| `radius.sectionCard` | Radius | 分区卡片圆角 | `22px` (`--radius-lg`) | section-card identity；Palette preview alias | **P** | — | Surface Transition identity handoff protected | 不在本阶段 promotion |
| `radius.homeTile` | Radius | Home 瓦片圆角 | `22px` (`--radius-lg`) | Home tool tile identity | **P** | — | Surface Transition identity handoff protected | 不在本阶段 promotion |
| `radius.homeIcon` | Radius | Home 图标圆角 | `25.5%` | Home tool icon identity | **P** | — | Surface Transition identity handoff protected | 不在本阶段 promotion |

## Controls & Geometry（5）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `geometry.control.height` | Controls | 控件高度 | `30px` | shared input/select/range control height | — | — | — | — |
| `geometry.button.height` | Controls | 按钮高度 | `38px` | shared standard Button geometry | — | — | — | — |
| `geometry.button.horizontalPadding` | Controls | 按钮水平内边距 | `14px` | shared standard Button horizontal inset | — | — | — | — |
| `componentOptics.sliderThumbShadow` | Controls | 滑块手柄光学阴影 | `0 2px 8px rgba(0, 0, 0, 0.32)` | shared Slider thumb | — | — | — | — |
| `componentOptics.switchThumbShadow` | Controls | 开关手柄光学阴影 | `0 2px 8px rgba(0, 0, 0, 0.28)` | shared Switch thumb | — | — | — | — |

## Elevation（7）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `elevation.surfaceShell` | Elevation | 表面外壳层级 | `0 18px 48px rgba(0, 0, 0, 0.38)` | Tool Detail primary work surface | — | — | — | — |
| `elevation.informationSurface` | Elevation | 信息表面层级 | `0 12px 30px rgba(0, 0, 0, 0.28)` | Tool Description、Host Status 等只读信息 surface | — | — | — | — |
| `elevation.primaryAction` | Elevation | 主要操作层级 | `0 4px 10px rgba(0, 0, 0, 0.18)` | Primary action buttons | — | — | — | — |
| `elevation.utilityAction` | Elevation | 实用操作层级 | `0 12px 30px rgba(0, 0, 0, 0.28)` | Back、Edit Home、Retry、Vela utility actions | — | — | — | — |
| `elevation.floatingSurface` | Elevation | 浮动表面层级 | `0 12px 26px rgba(0, 0, 0, 0.34)` | Vela Settings、Select menu 等 floating surfaces | — | — | — | — |
| `elevation.floatingPicker` | Elevation | 浮动选择器层级 | `0 14px 28px rgba(0, 0, 0, 0.42)` | Registry / Core color picker | — | — | — | — |
| `elevation.actionContainer` | Elevation | 操作容器层级 | `0 12px 30px rgba(0, 0, 0, 0.28)` | floating Tool action container | — | — | — | — |

## Text Color + Alpha（2）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `text.secondary` | Text | 次要文本 | `rgba(246, 240, 223, 0.66)` | secondary/supporting hierarchy consumers | — | — | — | — |
| `text.tertiary` | Text | 三级文本 | `rgba(246, 240, 223, 0.42)` | tertiary/muted hierarchy consumers；`--text-muted` alias | — | — | — | — |

## Surface Color + Alpha（7）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `surface.field` | Surface | 字段表面 | `rgba(5, 4, 3, 0.5)` | editable fields 与既定 field-like information consumers | — | — | — | — |
| `surface.registryOption` | Surface | Registry 选项表面 | `rgba(8, 7, 6, 0.68)` | Registry ChoiceGroup / option cards | — | — | — | — |
| `surface.conversation` | Surface | 对话表面 | `rgba(17, 16, 12, 1)` | Vela conversation surface | — | — | — | — |
| `surface.utilityChrome` | Surface | 工具栏表面 | `rgba(18, 17, 14, 1)` | utility chrome / status-action rails | — | — | — | — |
| `surface.utilityAction` | Surface | 工具操作表面 | `rgba(18, 17, 14, 1)` | Utility / Navigation Button resting fill；Reject 除外 | — | — | — | — |
| `surface.neutralAction` | Surface | 中性操作表面 | `rgba(15, 14, 11, 1)` | Neutral Button resting fill | — | — | — | — |
| `surface.dangerAction` | Surface | 危险操作表面 | `rgba(255, 107, 95, 0.22)` | Danger Button 与 Reject destructive fill | — | — | — | — |

## Border Color + Alpha（3）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `border.separator` | Border | 分隔边框 | `rgba(214, 178, 94, 0.16)` | separators / subtle boundaries；`--border-subtle` alias | — | — | — | — |
| `border.panel` | Border | 面板边框 | `rgba(214, 178, 94, 0.22)` | panel / default boundaries；`--border-default` alias | — | — | — | — |
| `border.input` | Border | 输入框边框 | `rgba(214, 178, 94, 0.16)` | shared Field border；`--field-border` alias | — | — | — | — |

## Session Notes

| AE Session / Date | Theme / Surface Condition | UI Scale / Width | Domain | Observation | Structural Evidence? | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — |

## Promotion Summary

| Parameter ID | Canonical Before | Calibrated Value | Decision | Canonical After | Override Removed with Same Computed Result? | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — |
