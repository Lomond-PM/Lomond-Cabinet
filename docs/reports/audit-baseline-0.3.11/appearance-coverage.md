# 外观审计覆盖记录

基线 `Lomond-PM/Lomond-Cabinet@b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`。

## 实际阅读范围

| 模块/文件 | 覆盖范围 | 未包含的证明 |
|---|---|---|
| appearance/appearanceParameterRegistry.js | 参数定义、验证、persistence 分类，完整小模块 | 全部真实控件交互 |
| appearance/appearanceStateStore.js | load/save/override/snapshot，完整小模块 | 原生 localStorage 故障 |
| appearance/appearanceResolver.js | defaults/resolve/preview/commit/reset，完整小模块 | 全部 CSS 级联 |
| designTuning/designTuningStateStore.js | 存储/规范化，完整小模块 | 全套迁移压力测试 |
| designTuning/designTuningResolver.js | canonical/transient/commit/projection，完整小模块 | 所有校准项逐项实机 |
| palette/paletteResolver.js | 解析图完整小模块 | 极深图资源上限测试 |
| palette/paletteStore.js | 保存事务、读取、CRUD、import/merge/export 相关路径 | 完整模块的所有输入组合 |
| palette/legacyPaletteMigration.js | schema/转换/override 逻辑及部分 migrateStorage | 完整迁移故障矩阵 |
| proceduralPaletteStore.js | v2 facade、委托、transient、保存/删除及部分通知 | 完整 startup/recovery 尾部 |
| proceduralAppearance.js | 参数/recipe/fixed-vs-algorithm 配色、数值渲染内核和输出 | 完整文件原样运行、实际 Canvas/cache/DPR |
| proceduralHomeIcons.js | palette identity/source params/render/ThemeMap 边界 | 队列和 teardown 尾部穷尽审计 |
| proceduralHomeBackground.js | source identity/参数/颜色/LUT/sourceField 前半逻辑 | controller 后半完整生命周期 |
| ui/coreUi.js | 输入、range/number、textarea、ResizeGrip 前部函数 | 完整 select/color/bezier/shadow controller |
| ui/coreMotion.js | 完整小模块，transaction guard/cleanup | 所有 main motion 接线与 reduced-motion 行为 |
| statusTone.js | 完整小模块 | 每一种状态的实机截图 |
| vela/velaSurfaceController.js | synchronize 状态/颜色/全局活动交接 | 完整原模块组合执行 |
| vela/velaPresentationModel.js | projectSurfaceState/statusTone 与部分 presentation 逻辑 | 本次不重复整个 Agent/Provider 审计 |
| client/css/velaSurface.css | 1–文件结束，被返回的全部规则已读 | 在所有 style.css/inline override 下的级联证明 |
| client/css/style.css | root tokens、基础 typography/spacing/elevation、初始全局规则 | 后续全部规则、媒体查询、selector specificity |
| client/js/main.js | Appearance/Tuning 控件、Palette 通知、source 参数、BackgroundEngine、range保存、UI Scale/Motion、收尾等明确函数路径 | 约万行文件逐行全覆盖 |
| i18n.js | Palette 摘要相关双语文案核对 | 整体翻译/文案审计 |
| docs/DESIGN_SYSTEM.md | 当前收口、角色/外观/校准与部分历史规范 | 全文每个历史阶段逐项实现核查 |
| docs/design/procedural-appearance.md | 最新 Palette v2 Phase4/5、source/presentation、共享源参数与确定性约定 | 全文所有早期建议的独立还原 |

本轮没有对 proceduralPaletteWorkspace.js 全文重新逐行读完，没有重跑已有仓库测试，也没有完整读取 DESIGN_TUNING_REGISTRY 的每个定义。涉及这些消费者的建议保留组合验收要求。

## 本地实际执行

- `node probes/run-state-probes.js`：7 个场景，其中 1 个为 X01 非缺陷排除。
- `node probes/run-ui-probes.js`：5 个场景，活动清理、正常结束、旧滑块提交以及状态展示反例/对照。
- `node probes/run-pixel-probes.js`：4 个固定 Palette 数值内核场景，含 contrast 敏感性对照。
- `python probes/run-css-probe.py`：3 个 UI Scale 下的隔离 CSS/Chromium 场景。

这些是手工转录摘录与替代边界，不能标为“原仓库19个测试通过”。具体替代边界见脚本与 JSON 的 type/limitations。

## 未执行

原生 AE/CEP、用户工程、全仓全量回归、完整页面截图/视觉比对、全 CSSOM、真实持久化故障、native keyboard/DPI/跨屏、长时运行性能、真实生产 source queue 与所有 UI teardown 竞态。没有证据的项目不作无漏洞保证。
