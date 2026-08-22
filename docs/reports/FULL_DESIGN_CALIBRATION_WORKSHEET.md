# 0.3.2 Full Design Calibration Worksheet

本表以 `client/js/designTuning/designTuningParameterRegistry.js` 的 `list()` 顺序为唯一参数来源。生成基线：`calibrate/0.3.2-full-design-calibration`，HEAD `afb60945e472615c2be5d5d40ac415af9f25f6fe`。

- U = USE / ACCEPTED UNCHANGED；A = ADJUSTED / ACCEPTED；D = DEFERRED；X = REJECTED / EXCLUDED；P = PROTECTED。
- 本表已从 calibration preparation worksheet 推进为 **completed calibration classification record**，基于用户真实 AE Calibration 后落盘的 `AEToolbox.designTuning.v1` overrides 快照完成分类。
- 分类规则：Editable 且 `current == canonical` → **U**；`current != canonical` → **A**；Worksheet 声明 Protected → **P**（优先于值比较）；D / X 仅在存在明确 evidence 时使用（当前 D = 0、X = 0）。
- `Current Canonical` 记录当前 source-owned 默认值；长度记录独立于 UI Scale 的基准 px 值；`Calibrated Value` 记录最终采纳值（A 默认采用当前校准值，U/P 采用 canonical）。
- `Issue / Observation` 只记录观察。只有证据明确属于 hardcode、duplicate authority、missing consumer 或 broken lifecycle 时，才标记 `STRUCTURAL ISSUE`。
- 本工作表不修改 canonical，不代表 canonical promotion 已执行；仅提供 promotion-ready 分类与采纳结论（真实 Canonical Promotion 为下一独立阶段）。
- **Promotion Status**：37 个 A 已全部提升到正式 canonical authority（MotionDefaults + canonical CSS），`scripts/test-canonical-promotion.js` 验证 typed parity（37 A / 27 U 无 semantic 变化 / 3 P 未变 / reset parity）。`docs/reports/FULL_DESIGN_CANONICAL_PROMOTION_REPORT.md` 记录审计。**Override-clear acceptance pending**：用户真实 AE 中通过 Design Tuning Reset All 清除 39 overrides 为 0 后，UI 视觉应与 promotion 前一致（`39 → 0` 为用户 calibration lifecycle action，非代码 migration）。

## Motion（19）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `motion.curve.enter` | Motion | 进入曲线 | `cubic-bezier(0.16, 1, 0.3, 1)` | 空间展开、内容进入、Home 交接、身份建立、Palette 进入、拖拽安定 | **U** | cubic-bezier(0.16, 1, 0.3, 1) | — | KEEP CANONICAL |
| `motion.curve.exit` | Motion | 退出曲线 | `cubic-bezier(0.32, 0, 0.67, 0)` | 空间收缩、内容退出、Palette 退出 | **A** | cubic-bezier(0.0421, 0.5278, 0.1749, 0.999) | — | PROMOTE CURRENT VALUE |
| `motion.curve.standard` | Motion | 标准曲线 | `cubic-bezier(0.22, 1, 0.36, 1)` | 操作反馈、surface state | **A** | cubic-bezier(0.0273, 1.0024, 0.36, 1) | — | PROMOTE CURRENT VALUE |
| `motion.curve.press` | Motion | 按压曲线 | `cubic-bezier(0.2, 0, 0, 1)` | action press | **A** | cubic-bezier(0.2486, -0.6113, 0.3389, 1.325) | — | PROMOTE CURRENT VALUE |
| `motion.duration.spatialExpand` | Motion | 空间展开 | `480ms` | Tool / Settings spatial morph open | **A** | 460ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.spatialContract` | Motion | 空间收缩 | `360ms` | Tool / Settings spatial morph close | **A** | 400ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.viewContentEnter` | Motion | 视图内容进入 | `180ms` | Tool / Settings 内容 reveal | **A** | 400ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.viewContentExit` | Motion | 视图内容退出 | `120ms` | Tool / Settings 内容 exit | **A** | 340ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.actionFeedback` | Motion | 操作反馈 | `160ms` | shared action feedback | **U** | 160ms | — | KEEP CANONICAL |
| `motion.duration.actionPress` | Motion | 操作按压 | `120ms` | shared button press | **U** | 120ms | — | KEEP CANONICAL |
| `motion.duration.surfaceState` | Motion | 表面状态 | `160ms` | hover / selected 等 surface state | **U** | 160ms | — | KEEP CANONICAL |
| `motion.duration.structuralCollapse` | Motion | 结构收起 | `260ms` | disclosure / structural collapse | **U** | 260ms | — | KEEP CANONICAL |
| `motion.duration.homeHandoffRecede` | Motion | Home 交接退场 | `260ms` | Home identity recede | **A** | 220ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.homeHandoffRestore` | Motion | Home 交接恢复 | `260ms` | Home identity restore | **A** | 300ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.spatialIdentity` | Motion | 空间身份过渡 | `260ms` | Tool / Settings identity projection | **A** | 330ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.toolIdentityOpen` | Motion | 工具身份展开 | `360ms` | Home tool identity open | **A** | 450ms | — | PROMOTE CURRENT VALUE |
| `motion.duration.paletteEnter` | Motion | 色板进入 | `260ms` | Palette workspace enter | **U** | 260ms | — | KEEP CANONICAL |
| `motion.duration.paletteExit` | Motion | 色板退出 | `160ms` | Palette workspace exit | **U** | 160ms | — | KEEP CANONICAL |
| `motion.duration.dragSettle` | Motion | 拖拽安定 | `260ms` | Home / shared drag settle | **U** | 260ms | — | KEEP CANONICAL |

## Spacing（18）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `spacing.surface.edge` | Spacing | 表面边缘 | `18px` | primary work surfaces 的外缘 inset | **A** | 22px | — | PROMOTE CURRENT VALUE |
| `spacing.card.inset` | Spacing | 卡片内边距 | `12px` | shared card content inset | **U** | 12px | — | KEEP CANONICAL |
| `spacing.section.stack` | Spacing | 分区堆叠间距 | `12px` | shared section vertical stack | **A** | 28px | — | PROMOTE CURRENT VALUE |
| `spacing.section.headerContent` | Spacing | 分区标题与内容 | `11px` | shared section header → content | **A** | 24px | — | PROMOTE CURRENT VALUE |
| `spacing.field.copy` | Spacing | 字段文本间距 | `2px` | FieldRow label / supporting copy | **A** | 10px | — | PROMOTE CURRENT VALUE |
| `spacing.field.block` | Spacing | 字段块间距 | `7px` | shared field block stack | **A** | 14px | — | PROMOTE CURRENT VALUE |
| `spacing.control.inline` | Spacing | 行内控件间距 | `8px` | shared inline control composition | **A** | 10px | — | PROMOTE CURRENT VALUE |
| `spacing.settings.fieldControl` | Spacing | 设置字段与控件 | `12px` | Settings FieldRow copy → control | **U** | 12px | — | KEEP CANONICAL |
| `spacing.registry.cardInset` | Spacing | Registry 卡片内边距 | `14px` | Registry section/card content | **A** | 30px | — | PROMOTE CURRENT VALUE |
| `spacing.registry.introContent` | Spacing | Registry 导语与内容 | `14px` | Tool intro → Registry content | **A** | 22px | — | PROMOTE CURRENT VALUE |
| `spacing.registry.sectionHeaderContent` | Spacing | Registry 分区标题与内容 | `14px` | Registry section header → body | **A** | 12px | — | PROMOTE CURRENT VALUE |
| `spacing.registry.sectionCopy` | Spacing | Registry 分区文本间距 | `5px` | Registry section title / description | **A** | 4px | — | PROMOTE CURRENT VALUE |
| `spacing.registry.fieldCopy` | Spacing | Registry 字段文本间距 | `3px` | Registry FieldRow label / supporting | **A** | 4px | — | PROMOTE CURRENT VALUE |
| `spacing.registry.fieldControl` | Spacing | Registry 字段与控件 | `14px` | Registry FieldRow copy → control；action stack alias | **U** | 14px | user set to canonical; accepted unchanged | KEEP CANONICAL |
| `spacing.palette.fieldControl` | Spacing | 色板字段与控件 | `10px` | Palette Editor FieldRow copy → control | **U** | 10px | — | KEEP CANONICAL |
| `spacing.home.toolGrid` | Spacing | Home 工具网格间距 | `16px` | Home tool grid | **U** | 16px | user set to canonical; accepted unchanged | KEEP CANONICAL |
| `spacing.home.majorStack` | Spacing | Home 主堆叠间距 | `16px` | Home major regions | **A** | 30px | — | PROMOTE CURRENT VALUE |
| `spacing.home.cardTitle` | Spacing | Home 卡片标题间距 | `11px` | Home tool artwork → title | **A** | 14px | — | PROMOTE CURRENT VALUE |

## Radius（6）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `radius.primaryWorkSurface` | Radius | 主工作表面圆角 | `22px` (`--radius-lg`) | Tool Detail / Settings primary work surfaces | **A** | 35px | — | PROMOTE CURRENT VALUE |
| `radius.nestedSurface` | Radius | 嵌套表面圆角 | `16px` (`--radius-md`) | nested surfaces；Registry option / Palette item aliases | **A** | 28px | — | PROMOTE CURRENT VALUE |
| `radius.editableControl` | Radius | 可编辑控件圆角 | `10px` (`--radius-sm`) | shared editable controls | **A** | 20px | — | PROMOTE CURRENT VALUE |
| `radius.sectionCard` | Radius | 分区卡片圆角 | `22px` (`--radius-lg`) | section-card identity；Palette preview alias | **P** | 22px | Surface Transition identity handoff protected | NO CHANGE / PROTECTED |
| `radius.homeTile` | Radius | Home 瓦片圆角 | `22px` (`--radius-lg`) | Home tool tile identity | **P** | 22px | Surface Transition identity handoff protected | NO CHANGE / PROTECTED |
| `radius.homeIcon` | Radius | Home 图标圆角 | `25.5%` | Home tool icon identity | **P** | 25.5% | Surface Transition identity handoff protected | NO CHANGE / PROTECTED |

## Controls & Geometry（5）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `geometry.control.height` | Controls | 控件高度 | `30px` | shared input/select/range control height | **A** | 22px | — | PROMOTE CURRENT VALUE |
| `geometry.button.height` | Controls | 按钮高度 | `38px` | shared standard Button geometry | **A** | 40px | — | PROMOTE CURRENT VALUE |
| `geometry.button.horizontalPadding` | Controls | 按钮水平内边距 | `14px` | shared standard Button horizontal inset | **U** | 14px | — | KEEP CANONICAL |
| `componentOptics.sliderThumbShadow` | Controls | 滑块手柄光学阴影 | `0 2px 8px rgba(0, 0, 0, 0.32)` | shared Slider thumb | **A** | 0 4px 16px 0 rgba(92, 191, 255, 0.79) | — | PROMOTE CURRENT VALUE |
| `componentOptics.switchThumbShadow` | Controls | 开关手柄光学阴影 | `0 2px 8px rgba(0, 0, 0, 0.28)` | shared Switch thumb | **A** | 0 4px 16px 0 rgba(92, 191, 255, 0.79) | — | PROMOTE CURRENT VALUE |

## Elevation（7）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `elevation.surfaceShell` | Elevation | 表面外壳层级 | `0 18px 48px rgba(0, 0, 0, 0.38)` | Tool Detail primary work surface | **U** | 0 18px 48px rgba(0, 0, 0, 0.38) | — | KEEP CANONICAL |
| `elevation.informationSurface` | Elevation | 信息表面层级 | `0 12px 30px rgba(0, 0, 0, 0.28)` | Tool Description、Host Status 等只读信息 surface | **U** | 0 12px 30px rgba(0, 0, 0, 0.28) | — | KEEP CANONICAL |
| `elevation.primaryAction` | Elevation | 主要操作层级 | `0 4px 10px rgba(0, 0, 0, 0.18)` | Primary action buttons | **U** | 0 4px 10px rgba(0, 0, 0, 0.18) | — | KEEP CANONICAL |
| `elevation.utilityAction` | Elevation | 实用操作层级 | `0 12px 30px rgba(0, 0, 0, 0.28)` | Back、Edit Home、Retry、Vela utility actions | **A** | 0 8px 28px 0 rgba(48, 196, 255, 0.46) | — | PROMOTE CURRENT VALUE |
| `elevation.floatingSurface` | Elevation | 浮动表面层级 | `0 12px 26px rgba(0, 0, 0, 0.34)` | Vela Settings、Select menu 等 floating surfaces | **A** | 0 10px 48px 0 rgba(72, 146, 214, 0.51) | — | PROMOTE CURRENT VALUE |
| `elevation.floatingPicker` | Elevation | 浮动选择器层级 | `0 14px 28px rgba(0, 0, 0, 0.42)` | Registry / Core color picker | **A** | 0 10px 48px 0 rgba(72, 146, 214, 0.51) | — | PROMOTE CURRENT VALUE |
| `elevation.actionContainer` | Elevation | 操作容器层级 | `0 12px 30px rgba(0, 0, 0, 0.28)` | floating Tool action container | **A** | 0 8px 30px 0 rgba(113, 224, 255, 0.32) | — | PROMOTE CURRENT VALUE |

## Text Color + Alpha（2）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `text.secondary` | Text | 次要文本 | `rgba(246, 240, 223, 0.66)` | secondary/supporting hierarchy consumers | **U** | rgba(246, 240, 223, 0.66) | — | KEEP CANONICAL |
| `text.tertiary` | Text | 三级文本 | `rgba(246, 240, 223, 0.42)` | tertiary/muted hierarchy consumers；`--text-muted` alias | **U** | rgba(246, 240, 223, 0.42) | — | KEEP CANONICAL |

## Surface Color + Alpha（7）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `surface.field` | Surface | 字段表面 | `rgba(5, 4, 3, 0.5)` | editable fields 与既定 field-like information consumers | **U** | rgba(5, 4, 3, 0.5) | — | KEEP CANONICAL |
| `surface.registryOption` | Surface | Registry 选项表面 | `rgba(8, 7, 6, 0.68)` | Registry ChoiceGroup / option cards | **U** | rgba(8, 7, 6, 0.68) | — | KEEP CANONICAL |
| `surface.conversation` | Surface | 对话表面 | `rgba(17, 16, 12, 1)` | Vela conversation surface | **U** | rgba(17, 16, 12, 1) | — | KEEP CANONICAL |
| `surface.utilityChrome` | Surface | 工具栏表面 | `rgba(18, 17, 14, 1)` | utility chrome / status-action rails | **U** | rgba(18, 17, 14, 1) | — | KEEP CANONICAL |
| `surface.utilityAction` | Surface | 工具操作表面 | `rgba(18, 17, 14, 1)` | Utility / Navigation Button resting fill；Reject 除外 | **A** | rgba(16, 63, 103, 1) | — | PROMOTE CURRENT VALUE |
| `surface.neutralAction` | Surface | 中性操作表面 | `rgba(15, 14, 11, 1)` | Neutral Button resting fill | **A** | rgba(60, 82, 105, 1) | — | PROMOTE CURRENT VALUE |
| `surface.dangerAction` | Surface | 危险操作表面 | `rgba(255, 107, 95, 0.22)` | Danger Button 与 Reject destructive fill | **U** | rgba(255, 107, 95, 0.22) | — | KEEP CANONICAL |

## Border Color + Alpha（3）

| Parameter ID | Domain | 中文名称 | Current Canonical | Intended Consumers | U/A/D/X/P Classification | Calibrated Value | Issue / Observation | Promotion Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `border.separator` | Border | 分隔边框 | `rgba(214, 178, 94, 0.16)` | separators / subtle boundaries；`--border-subtle` alias | **U** | rgba(214, 178, 94, 0.16) | — | KEEP CANONICAL |
| `border.panel` | Border | 面板边框 | `rgba(214, 178, 94, 0.22)` | panel / default boundaries；`--border-default` alias | **U** | rgba(214, 178, 94, 0.22) | — | KEEP CANONICAL |
| `border.input` | Border | 输入框边框 | `rgba(214, 178, 94, 0.16)` | shared Field border；`--field-border` alias | **U** | rgba(214, 178, 94, 0.16) | — | KEEP CANONICAL |

## Session Notes

| AE Session / Date | Theme / Surface Condition | UI Scale / Width | Domain | Observation | Structural Evidence? | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| AE session (user completed) | accepted current combination | — | All | 用户已在真实 AE 完成实际 Design Tuning，并将当前组合视为可接受。Capture source = `AEToolbox.designTuning.v1` overrides 快照（39 项覆盖）。 | No structural issue observed | 分类已完成（U=27 / A=37 / D=0 / X=0 / P=3）；Canonical Promotion 为下一独立阶段 |

## Promotion Summary

| Parameter ID | Canonical Before | Calibrated Value | Decision | Canonical After | Override Removed with Same Computed Result? | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `motion.curve.exit` | cubic-bezier(0.32, 0, 0.67, 0) | cubic-bezier(0.0421, 0.5278, 0.1749, 0.999) | PROMOTE CURRENT VALUE | cubic-bezier(0.0421, 0.5278, 0.1749, 0.999) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.curve.standard` | cubic-bezier(0.22, 1, 0.36, 1) | cubic-bezier(0.0273, 1.0024, 0.36, 1) | PROMOTE CURRENT VALUE | cubic-bezier(0.0273, 1.0024, 0.36, 1) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.curve.press` | cubic-bezier(0.2, 0, 0, 1) | cubic-bezier(0.2486, -0.6113, 0.3389, 1.325) | PROMOTE CURRENT VALUE | cubic-bezier(0.2486, -0.6113, 0.3389, 1.325) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.spatialExpand` | 480ms | 460ms | PROMOTE CURRENT VALUE | 460ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.spatialContract` | 360ms | 400ms | PROMOTE CURRENT VALUE | 400ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.viewContentEnter` | 180ms | 400ms | PROMOTE CURRENT VALUE | 400ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.viewContentExit` | 120ms | 340ms | PROMOTE CURRENT VALUE | 340ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.homeHandoffRecede` | 260ms | 220ms | PROMOTE CURRENT VALUE | 220ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.homeHandoffRestore` | 260ms | 300ms | PROMOTE CURRENT VALUE | 300ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.spatialIdentity` | 260ms | 330ms | PROMOTE CURRENT VALUE | 330ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `motion.duration.toolIdentityOpen` | 360ms | 450ms | PROMOTE CURRENT VALUE | 450ms | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.surface.edge` | 18px | 22px | PROMOTE CURRENT VALUE | 22px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.section.stack` | 12px | 28px | PROMOTE CURRENT VALUE | 28px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.section.headerContent` | 11px | 24px | PROMOTE CURRENT VALUE | 24px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.field.copy` | 2px | 10px | PROMOTE CURRENT VALUE | 10px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.field.block` | 7px | 14px | PROMOTE CURRENT VALUE | 14px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.control.inline` | 8px | 10px | PROMOTE CURRENT VALUE | 10px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.registry.cardInset` | 14px | 30px | PROMOTE CURRENT VALUE | 30px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.registry.introContent` | 14px | 22px | PROMOTE CURRENT VALUE | 22px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.registry.sectionHeaderContent` | 14px | 12px | PROMOTE CURRENT VALUE | 12px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.registry.sectionCopy` | 5px | 4px | PROMOTE CURRENT VALUE | 4px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.registry.fieldCopy` | 3px | 4px | PROMOTE CURRENT VALUE | 4px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.home.majorStack` | 16px | 30px | PROMOTE CURRENT VALUE | 30px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `spacing.home.cardTitle` | 11px | 14px | PROMOTE CURRENT VALUE | 14px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `radius.primaryWorkSurface` | 22px | 35px | PROMOTE CURRENT VALUE | 35px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `radius.nestedSurface` | 16px | 28px | PROMOTE CURRENT VALUE | 28px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `radius.editableControl` | 10px | 20px | PROMOTE CURRENT VALUE | 20px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `geometry.control.height` | 30px | 22px | PROMOTE CURRENT VALUE | 22px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `geometry.button.height` | 38px | 40px | PROMOTE CURRENT VALUE | 40px | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `componentOptics.sliderThumbShadow` | 0px 2px 8px rgba(0, 0, 0, 0.32) | 0px 4px 16px rgba(92, 191, 255, 0.79) | PROMOTE CURRENT VALUE | 0px 4px 16px rgba(92, 191, 255, 0.79) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `componentOptics.switchThumbShadow` | 0px 2px 8px rgba(0, 0, 0, 0.28) | 0px 4px 16px rgba(92, 191, 255, 0.79) | PROMOTE CURRENT VALUE | 0px 4px 16px rgba(92, 191, 255, 0.79) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `elevation.utilityAction` | 0px 12px 30px rgba(0, 0, 0, 0.28) | 0px 8px 28px rgba(48, 196, 255, 0.46) | PROMOTE CURRENT VALUE | 0px 8px 28px rgba(48, 196, 255, 0.46) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `elevation.floatingSurface` | 0px 12px 26px rgba(0, 0, 0, 0.34) | 0px 10px 48px rgba(72, 146, 214, 0.51) | PROMOTE CURRENT VALUE | 0px 10px 48px rgba(72, 146, 214, 0.51) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `elevation.floatingPicker` | 0px 14px 28px rgba(0, 0, 0, 0.42) | 0px 10px 48px rgba(72, 146, 214, 0.51) | PROMOTE CURRENT VALUE | 0px 10px 48px rgba(72, 146, 214, 0.51) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `elevation.actionContainer` | 0px 12px 30px rgba(0, 0, 0, 0.28) | 0px 8px 30px rgba(113, 224, 255, 0.32) | PROMOTE CURRENT VALUE | 0px 8px 30px rgba(113, 224, 255, 0.32) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `surface.utilityAction` | rgba(18, 17, 14, 1) | rgba(16, 63, 103, 1) | PROMOTE CURRENT VALUE | rgba(16, 63, 103, 1) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
| `surface.neutralAction` | rgba(15, 14, 11, 1) | rgba(60, 82, 105, 1) | PROMOTE CURRENT VALUE | rgba(60, 82, 105, 1) | Yes (promoted == calibrated; override removable) | capture `AEToolbox.designTuning.v1` |
