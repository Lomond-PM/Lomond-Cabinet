# 0.3.13-B — 可运行参考页与视觉 / 交互契约

状态：**B ACCEPTED / READY FOR COMMIT / PR**。用户已完成约定范围的 AE/CEP 实机验收，B 参考页反馈项已闭合；尚待提交和合并。当前参考基线为 UI Lab v26 加 B/F1–F4 已验收适配，最终验收记录见第 11 节。初版及 F1–F4 历史失败和当时待验收记录保留。本次仅关闭 B 工作包，不宣布整个 0.3.13 完成，不追加 F5，不进入 C。

## 1. 基线与本轮范围

- 工作分支 `feat/ui-reference-pages-0.3.13-b`；起点 `f57106b06ddd972741684d084d00b3d147cf88a5`，与本轮读取的 `dev/origin/dev` 相同。先读 AGENTS、当前路线、A 报告及指导书对应工作包；不重新审计全部历史材料。
- Sites 返回的 **Lomond UI Lab v26**：源码 `3df562e66d8b6ea36bb592bbb75a8369d2d002bf`；部署 `appgdep_6aac90e0154881918fca5955896b541f` 为 `succeeded`，更新时间 `2026-09-18T01:17:23.778808+00:00`。相对 A 的 v21，仅追踪新增 Registry Controls 和相关修订。[版本证据](../../.tmp/vela-evidence/0.3.13-b/sites-provenance.json)
- 实际运行证据来自该提交的本地构建、原 Registry 模块探针和仓库参考产物。部署版本由 Sites 元数据核对；本轮没有另做线上全页审计，也没有编辑、保存、发布或冻结 Site。
- 隔离浏览器为 Windows 上的 **Edge 153 / HeadlessChrome 153**，Playwright 1.58.2。源码打包目标 Chromium 99；没有把转译、UA 或 CSS.supports 当作真实 CEP 验收。本轮不操作 AE、不探测调试入口；A 的真实 CEP 未覆盖事实仍保留。
- 未改 VERSION、manifest、Host、Runtime、Provider、Authority、生产资产与存储。生产接线为 Developer 按钮、惰性参考启动器及配套 i18n；F1 另给 CoreUI.enhanceSelect 增加可选坐标适配输入，默认消费者行为不变；按现有检查规则统一更新前端 cache query，产品版本仍为 0.3.12。

## 2. Registry Controls 增量核对与复用

来源：v26 `dist/registry-{model,view,focus,curve,graph}.js`。`scripts/check-registry.mjs` 本轮 PASS；另运行引用原模块的 [delta.cjs](../../scripts/ui-reference/delta.cjs)，没有手抄被测算法。[运行摘录](../../.tmp/vela-evidence/0.3.13-b/registry-delta.json)

| 反例 / 归类 | 本轮实际结果 | B 的处理 |
|---|---|---|
| 通用数值草稿，**已观察缺陷** | `numberValue` 输入 999，文本仍为 999，模型已成为 100，aria-invalid=false；blur 才显示 100 | `ReferenceRegistry.input/commitNumber`：越界草稿不写模型；Enter / blur 归一化并同步控件。Palette 数值采用相同明确提交原则 |
| 曲线草稿，**已观察通过** | X1 输入 9 时模型保留 0.25，标记 invalid；Enter 后两者为 1 | 沿用 v26 `editCurve/commitCurveInput`；不沿用旧问题结论 |
| 重绘焦点，**已观察通过** | 重绘后搜索框身份及选区 `[1,3]` 保留 | 复用 `registry-focus`；异步动作结束不抢走已移出的焦点 |
| 搜索后尺寸监听，**已观察通过** | 420 宽时过滤后 SVG viewBox、clientWidth、observer 值均为 370 | 复用 observer 的重绑与失效处理 |
| 预览折叠，**已观察通过** | 900 宽专用反例中，展开表单 678 / body 898，折叠后表单恢复 898 | 保留布局逻辑，并提供不依赖 container query 的 CEP 布局状态 |
| 曲线拖动，**已观察通过** | 同一帧 100 个样本：帧前 0 次、帧后 1 次重绘；SVG 节点不替换；手柄 accessible name 同步 X/Y | 复用帧合并和图形更新；参考适配另补 capture loss / blur / resize 的取消 |

可复用的是字段模型、条件计算、控件、焦点快照、曲线几何与更新方式；需要适配的是数值提交、手势终结、隔离存储、布局降级及页面 owner。原 Controls 展示不能代替复杂页：B 的 Kit 定义由 `build.cjs.schemas()` 直接提取当前 `host/tools/adComponentKit.tool.jsx`，保留字段、条件、分组、动作及工具中英文文案，并独立验证 Icon Grid 分支、无 Comp 禁用和失败结果。

## 3. 四类完整页与状态矩阵

入口：[client/reference/index.html](../../client/reference/index.html)。生产 Developer 入口见 [uiReferenceLauncher.js](../../client/js/uiReferenceLauncher.js) 和 `main.js::renderSettingsDeveloperMode`。参考页不加载 CSInterface 或生产命令 / Store owner。

| 页面 | 已实现内容 / 状态 | 数据与命令边界 |
|---|---|---|
| Registry | Ad Component Kit 完整字段与两种构型、长说明、条件分组、维护动作、禁用原因、pending、成功 / 失败；另有 Controls 页 | 当前真实 schema；Host 上下文和动作结果是明确标识的 `RegistrySession` fixture，不能调用 hostFunction |
| Global Settings | General、Appearance、背景内容、Advanced、Developer；27 个 Appearance 参数、67 个 Design Tuning 定义、保护项、密集曲线、预览 / 重置 / 未保存 / 保存失败 / 重试 | 当前 registries / schema / resolver 默认值快照，不读取用户配置；参数值只进入参考会话及局部预览 |
| Vela | 待批准、执行、部分完成、拒绝、取消、Verify 失败，另含完成状态；当前步范围、目标、before / proposed、Verify 与已完成事实 | 现有 Runtime + Conversation source port 在隔离 harness 内捕获，`vela-fixtures.json` 可重建；F1 以 v26 Vela 角色呈现相同 Review/port 投影；批准 / 拒绝按钮仅说明命令被隔离 |
| Palette / Curve | Palette 完整库与编辑器、组 / 槽位、纯色 / 渐变 / opacity stops、局部颜色弹层；Curve 库、节点 / 手柄、密集数值、预览与 UI motion 选用 | Lab seed 的会话副本；不读 Site 用户库，不读写生产 Palette/Curve。导入、导出及 AE 执行不作为可用生产功能 |

Vela 的页面状态由 `vela-projection.js::referencePhase` 读取 Driver / trajectory 决定，不能由 selector 名称、动画或时间轴制造。现有通用 Surface 状态可能是 completed / awaiting-continuation；参考页保留原投影供查看，使用真实终结与 coverage 事实显示拒绝、执行或部分完成。部分完成固定保留 1/2 已完成及 committed-target Verify；失败 fixture 保留 Host committed=true 与 Verify mismatch，不错误显示“未发生变更”。[捕获器](../../scripts/ui-reference/capture-vela-fixtures.cjs)

Palette 边界：Lab 是 RGB/alpha/渐变 paint 模型；生产 Palette v2 是带 revision / metadata / profiles 的 DIRECT、REFERENCE、DERIVED 槽位。只有不透明纯色可形成 DIRECT 的颜色输入，仍需生产身份与元数据适配；渐变、透明度、引用、派生及 profile 不能无损套用。focused 使用真实 `PaletteModel.validatePalette` 验证边界，不转换真实用户资产。Curve 的 AE data 不是新增能力契约。

## 4. B 的短契约与后续归属

| 契约 | B 的可运行约束 | 后续收敛 |
|---|---|---|
| 视觉角色 | 保留 v26 Dark/Light token、系统字体栈与平面容器。标题 / 分组 / 字段 / supporting / code 分层；primary、普通、danger、disabled 与状态分别表达。320/420/720 和 0.62–1.18 UI Scale 支持内容滚动；短高度折叠预览设置，不截去编辑内容 | C 定义生产语义 token 和最终投影；不把旧类名作为约束 |
| 样式 owner / 优先级 | iframe 内 Lab base / 控件样式 → shell theme → 显式选择的会话 paint，由 `app.js::projectAppearance` 单点写根变量。Settings 参数只由 `SettingsView.paint` 写局部示例；shell UI Scale 是观察环境设置，不是另一份持久 Settings。组件 inline 只持有局部几何 / 编辑进度 | C 接通所有生产 Appearance / Design Tuning consumer；B 不建立全产品 resolver 或持久配置 |
| Settings 预览范围 | 实际定义与默认来源可核对；颜色、字号、示例 field / surface / shadow、motion 可预览；其余调校值在示例输出中可核对，未声称所有 legacy domain 已映射到 Lab consumer | 完整生产参数投影、重复 writer 清理属于 C；背景引擎不在 B 运行 |
| overlay / Escape / 焦点 | 父启动器拥有参考 iframe；参考 owner 拥有离开对话框；颜色弹层拥有草稿及返回焦点。Escape 先处理最上层 modal / picker / gesture，再请求退出。outside click 取消 picker；离开确认先于 route 变更与 dispose | D 收敛共享 owner；普通生产 overlay 尚未迁移 |
| gesture | pointerup 提交最终样本；pointercancel、capture loss、blur、resize、退出与 dispose 取消草稿，移除 capture / frame / listener | D 复用经反例验证的终结语义；不批修 legacy |
| preview / commit / cancel | ColorPicker preview 不改库，Apply 才改会话草稿；取消还原。Save 仅会话检查点；失败保留草稿。结果区分 accepted / applied / fixtureSaved / persisted，persisted 恒为 false | 生产保存与退出继续由 0.3.12 Store / workspace 持有；0.3.14 接适配器后才能迁移 |
| motion | Palette Popover 沿用 v26 `tool-spring.js` 的 response / damping / pace，未调参；同目标快速关开接续 presence / velocity，结束释放 frame。选择 Curve 仅影响 fixture 的已有 Lab track。Settings motion 示例来源为现有 `MotionDefaults` 与参数定义 | D 再统一生产 motion 消费路径，不能把这两个隔离上下文扩成两个生产 authority |
| reduced-motion / 清理 | 开关遵循系统 preference，移除空间位移；关闭完成移除层，销毁时不等待动画。偏好监听、ResizeObserver、timer、frame、订阅均释放 | D/F 的真实共享实现验收仍必需 |
| Vela 基础交互 | 非空 fixture 会话关闭确认；Provider 未启用仍可起草；Enter 换行、Ctrl/Cmd+Enter 模拟发送、IME 阻止发送；追加长内容保持阅读锚点，不抢起草焦点 | E 实现并验证既定 UX-06/08 目标；不重新开启产品决策或改变 A 的分类 |

`client/reference/src/lab/` 是明确标记的 v26 参考副本，`memory-store.js`、捕获 fixture、浏览器探针只用于本包。C/D 应把可复用原语收敛为共享模块后让参考页消费同一实现；0.3.14 再逐页替换 main/CoreUI、Registry renderer、Settings、Palette workspace、Vela view，验证后删除对应旧路径和临时适配。临时启动器与重复 Lab view 不得成为第二套永久产品 UI。

A10、AP-05～07、UX-05～09、G-11、V-01～07、COV-01～02 的对应证据由以上视觉 / owner / 语义 / 兼容项承接；本报告不批量关闭条目，不修改 current 文档或冻结架构。

## 5. B 初版验证记录（F1 结果见第 7 节）

- 新增 focused `node scripts/test-ui-reference.js`：PASS。验证真实 schema 一致、Settings 定义快照、失败后检查点、实际 Runtime / source port 重捕获、部分完成 / Verify 事实、Palette v2 边界以及无 live Provider / Host / Store 依赖。
- `node scripts/ui-reference/browser.cjs`：17 组行为检查与 20 个整页代表组合 PASS；包含暗 / 亮、中英文内容、320×440 / 420×420 / 420×600 / 720×700、0.62 / 0.92 / 1 / 1.18，进入窄屏 Palette/Curve 编辑器。覆盖 invalid draft、失败重试、最上层 Escape、IME、锚点、取消、反向开闭、活动手势退出后旧节点事件、订阅释放。[结果与尺寸](../../.tmp/vela-evidence/0.3.13-b/browser-results.json)
- `node scripts/ui-reference/launcher.cjs`：HTTP sandbox、独立 file 入口、file 父页的隔离 iframe 均 PASS；验证 Storage 隔离、命令 API 未加载、dirty 退出、父页草稿与焦点保留。[加载结果](../../.tmp/vela-evidence/0.3.13-b/launcher-results.json)
- 初始 file iframe 无法读取本地 CSS/JS，已保留 [失败证据](../../.tmp/vela-evidence/0.3.13-b/loader-file-sandbox-failure.txt)。修为惰性加载数据型 `embedded.js` + 自包含 `srcdoc`，保留 `sandbox="allow-scripts"`、script hash CSP、connect-src none；未以 allow-same-origin 放宽隔离。UTF-8 显式指定后复测通过。
- **最终全量离线：199/199 PASS，0 FAIL，0 skip**，本轮实际执行一次。[原始输出](../../.tmp/vela-evidence/0.3.13-b/full-offline.log) 历史 0.3.12 的 198/198 仍只属于历史。
- JS syntax、确定性产物 `build.cjs --check`、i18n 生成报告及 project consistency 检查通过。新增 i18n 后按规则更新了生成报告，缺失 key 为 0；未删减检查。`git diff --check` 与 53 个新增文件的 whitespace 检查通过；JS syntax 检查 42 个文件通过。全量后仅做换行规范化和证据 / 浏览器探针收尾，受影响的 focused、确定性产物与文件加载检查已复测。
- 初版兼容缺口：真实 CEP 字体栅格、原生 select、缩放 / 焦点传递未覆盖；F1 已补自定义 select 创建接线与旧 Chromium 的缩放坐标适配，但真实 CEP 仍由用户验收。浏览器已移除 container / :has 规则验证显式布局 fallback；关闭层另有 tabindex / pointer-events fallback。JS 产物的 Chromium 99 target 不代表 CEF 实机通过。
- 初版 Palette/Curve 英文 chrome 是此次 F1 的明确缺口，已在当前参考范围补齐；真实 OS IME、CEP 字体与焦点仍需用户复测。未扩大到全产品翻译迁移。
- Liquid Glass Optical 未加载、未调参、未验收。基础页使用 CSS Surface；颜色弹层面板有独立不透明背景，halo 是可移除装饰。光学质量或性能不作为本包前置门。

代表截图：[复杂 Registry](../../.tmp/vela-evidence/0.3.13-b/registry-kit-420x600.png)、[窄 Settings 曲线](../../.tmp/vela-evidence/0.3.13-b/settings-page-320x440.png)、[Vela 部分完成](../../.tmp/vela-evidence/0.3.13-b/vela-page-720x700.png)、[Palette](../../.tmp/vela-evidence/0.3.13-b/palette-palette-720x700.png)、[Curve 密集编辑](../../.tmp/vela-evidence/0.3.13-b/palette-curve-420x600.png)。raw 位于忽略的 `.tmp/vela-evidence/0.3.13-b/`，不会随 Git 自动提交；重建脚本在正常源码目录。

## 6. 用户实机加载、退出与最小验收

**以下 0.3.13 / 0.3.14 AE/CEP 操作由用户执行。无需开放调试入口。**

1. 先按现有 0.3.12 保存 / 退出流程处理生产草稿。使用现有 workspace → CEP Extensions junction；用户自行重载面板以加载本次代码，无需复制文件或更改 manifest。
2. Global Settings → **Advanced → Developer Mode**（若尚未开启）；展开 **Developer → Design Tuning**，点击 **UI 参考页 · 0.3.13-B**。应看到“隔离模拟 / 无 Provider、Host 或资产写入”。普通 Home 和生产页面不被替换。
3. 按下表验证；参考按钮不得使 AE 工程、Provider 或真实 Palette/Curve 发生变化。

| 最小操作 | 预期 |
|---|---|
| 420 中宽 Dark，切换四页；320 窄宽与短高度；720 宽；Light、中文及 scale 两端各看一个代表页 | 层级、字段、长内容和操作可读且可滚动；短高度可折叠“预览设置”；没有横向截断关键控件 |
| Kit 切两类构型 / 无 Comp；模拟动作失败；Controls 数值输入 999、曲线 X1 输入 9 后 Enter；搜索曲线后 resize | 条件和禁用原因正确；草稿 / 提交一致；结果明确为 fixture；曲线尺寸与手柄反馈正确 |
| Settings 改颜色 / 调校值，预览 / 重置；勾保存失败后保存，再取消失败并重试；带修改离页选择留下 | 失败保留草稿、留下不换页；检查点始终 persisted=false，生产设置不变化 |
| Vela 查看待批准 / 执行 / 部分完成 / 拒绝 / 取消 / 失败；展开 review；起草并试 Enter / Ctrl或Cmd+Enter / IME；退出非空会话 | 当前步、原目标、before/proposed、Verify、已完成事实不混淆；批准按钮不执行；不抢焦点；关闭先确认 |
| Palette 编辑、开弹层后取消 / Apply / 快速关开；拖 stop / Curve handle 时失焦、resize 或 Escape；系统减少动态效果 | 预览取消不落库、终结不留活动手势、关闭后无残层；减少动态效果不依赖空间位移；真实用户资产不改变 |
| 退出参考页，检查原 Settings 草稿 / 焦点；再次打开 | 回到原生产页面，参考会话重建；无自动 Provider / Host 行为 |

正常退出用页内或外层“退出参考页”，Escape 先退出局部交互，再进行离开协商。可用“留在当前页”或“丢弃并离开”；保存失败不会强行离开。加载失败尚未 ready 时外层退出可直接返回。若面板失去响应，在确认生产草稿已经保存后由用户重载面板；不清空 localStorage，不重置真实资产，不要求重启 AE。若手动启用了 Developer Mode，可在测试后恢复原开关状态。

独立浏览器查看可直接打开 `client/reference/index.html`；无需开发服务器。重建命令：`npm ci --ignore-scripts --no-audit --no-fund`（在 `scripts/ui-reference`），再于仓库根运行 `node scripts/ui-reference/capture-vela-fixtures.cjs`、`node scripts/ui-reference/build.cjs`。捕获器仅调用现有无网络 / 无 AE harness。

收尾：最终 `git status -sb` 仅含本包修改及新增内容，无暂存。只交付本 B 报告、参考实现 / 启动接线、对应测试和必要的生成 i18n 报告；不改 A 报告或其他 current 文档。隔离浏览器 / HTTP 实例已关闭，测试中的活动订阅与手势已释放，必要证据保留。未暂存、提交、推送、创建 PR、合并、tag 或发布。**等待用户实机复测，不进入 C。**


## 7. B-F1 — 用户实机反馈修复

沿用 B 的 **UI Lab v26 / 3df562e66d8b6ea36bb592bbb75a8369d2d002bf**，只读使用已有源码与其真实运行页；未取另一个视觉版本、未改 Site。没有操作、重载或重启 AE，也没有读取父页 Store、修改 Runtime / Authority / Host / 真实资产。普通生产消费者不迁移。本节覆盖并更新初版限制；第 5 节的 199/199 是初版历史，本次另有最终全量记录。

| 用户反馈 | 根因 / 本轮处置与证据等级 |
|---|---|
| 1. Picker 动态两种宽度重影 | **原现象未复现，不能标记已修复。** Edge 153、Chromium 99.0.4812.0 的首次打开、静止、resize、反向关开与四种 scale 逐帧记录均为一个实例、稳定布局宽度；可见 rect 随既有 presence 动画变化。另确认画布旧实现用变换后的 rect 决定 backing size，现由稳定的 plane 布局尺寸 × 视口缩放 × DPR 决定，避免动画参与绘图分辨率反馈。没有禁用正常动画、锁死宽度或延迟显示；halo 保留，未把合成层/GPU 风险定性为 CEP bug。提供页内按需采样供剩余实机定位。证据：[几何探针](../../scripts/ui-reference/geometry.cjs)、[旧版 Edge](../../.tmp/vela-evidence/0.3.13-b/f1/before-edge-geometry.json)、[最终 Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f1/after-chromium99-geometry.json)，实现 color-picker.js::position/draw 与 size-probe.js |
| 2. Vela 视觉不忠实 | **已观察的实现偏差，已重建参考呈现。** 初版独立小字卡片、旧 ConfirmationView 外观与底部输入区，改为 v26 的 vela-shell / messages / message / proposal / composer / haze 角色。真实 Runtime fixture、PresentationModel、Review ID/revision/target/current-step、before/proposed、committed/Verify 与部分完成事实保留；没有 LifecyclePlayer 或执行时间轴。12 个同尺寸/主题/对应状态对照保留真实渲染与 computed style；字体、消息、输入框关键角色一致。用户消息内容、单步/两步目标、Review 身份展开、部分完成/Verify 详情及命令隔离提示是必要内容差异，不伪造 Lab 的 3 图层执行事实。证据：[vela.js](../../client/reference/src/vela.js)、[对照与截图](../../.tmp/vela-evidence/0.3.13-b/f1/vela-comparison.json)、[对照脚本](../../scripts/ui-reference/vela-compare.cjs)。最终视觉批准仍待用户 |
| 3. 滚动条 / Select 系统外观 | **工程漏接，已修复；非笼统 CEP 缺陷。** 初版只有 scrollbar-*，未包含 Chromium 99 的 ::-webkit-scrollbar；模板 select 也未调用 enhancement。CoreUI.createSelect 只创建 native 值端口，enhanceSelect 才拥有 trigger / body portal。现在 controls.js 在明确创建/重建入口挂载，dispose 前释放，styles/controls.css 覆盖 iframe 内实际滚动元素及 body portal；无全局延迟扫描，无父 Store 访问，sandbox 仍仅 allow-scripts。另确认旧 Chromium 的 CSS zoom rect 为缩放前坐标：geometry.js 以填满视口的唯一根布局校准，CoreUI 仅增加可选 getControlRect 输入，定位计算仍只有一个 owner。默认生产消费者保留原路径。实测自定义展开、value/change、disabled、方向键、Escape、焦点、搜索/语言重建与销毁 |
| 4. Curve 手柄参数入口 | **入口隐藏 / 组织不清，已修复。** 模型原本具备 in/out，旧 UI 把它们放在默认折叠的 Handle coordinates。现有“编辑选中元素参数 / 返回曲线图”，选中节点/入/出手柄有对应标记和独立参数区；全局预览时长与界面 motion 单列。时间按相邻节点限制、节点值 −200–300%、手柄值 −400–500%、预览 80–10000 ms 明确显示；固定端点、首末缺失手柄及非 Bézier 段给出原因。数值/图形/模型双向验证，保留原模型值域及精度，不套用 AE Speed/Influence、不新增 Host 能力。证据：curve-view.js::editor/handleFields/paint/keydown 与 F1 参数反例 |
| 5. 旧数值框交互 | **缺失交互已恢复。** 核对生产 coreUi.js::bindNumberDrag/createNumberInput/createRangeNumber、main.js schema consumer、proceduralPaletteWorkspace 与关联测试。旧→新：4px 横向启动阈值、8px/step、点击编辑并全选、方向键一步、范围/小数精度、Enter 提交退出编辑、Escape 恢复、数字/滑块联动均保留；不增加修饰键倍率。四页所用数值、Controls、Picker 通道和 Curve 参数统一由 controls.js 创建；未变化的 blur 不重建、不吞后续图形按键；中间空/符号/越界草稿不写模型，pointerup 取最终样本，cancel/capture-loss/blur/resize/dispose 清理。只改会话预览，检查点仍显式保存、persisted=false |
| 6. Registry 曲线持续收缩 | **已在 Chromium 99/100 复现并修复。** 旧 SVG ResizeObserver 的 contentRect≈getBBox（约 703.70），布局 clientWidth=735；把它写回 viewBox 后下一次测量变为约 672.38，反复下降至最小 160。现代 Edge 不复现，故旧测试漏掉了反例。现在观察独立 .reg-graph-viewport HTML 容器，使用其布局宽度，SVG 只消费绘图坐标；搜索后重绑、resize、首次打开与 0.62/0.92/1/1.18 均稳定。不与 Picker 重影合并归因。证据：[直接 observer/bbox 样本](../../.tmp/vela-evidence/0.3.13-b/f1/svg-observer.json)、[修复前 Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f1/before-chromium99-geometry.json)、[修复后](../../.tmp/vela-evidence/0.3.13-b/f1/after-chromium99-geometry.json)，registry-view.js::observeGraphs/curveSize |
| 7. i18n | **当前参考范围补齐并验证。** 新固定与参数化 copy 归 client/js/i18n.js，copy.js/shared.js 只投影。覆盖四页、Controls、Picker 通道/提示、Curve 参数/范围/不可用原因、菜单、错误/空状态、动态 accessible name；按需重建时使用当前语言。实际 schema 文案继续来自工具定义；用户资产名称、内置数据名称、HEX、代码/证据值保持原样。除 missing-key 外新增固定文案词表检查及中文动态行为/错误反例；不宣称完成全产品翻译。生成报告已更新，三类 missing-key 均为 0 |

F1 自动验证（以下为本轮实际执行）：

- [f1.cjs](../../scripts/ui-reference/f1.cjs)：**Edge 153、Chromium 99 各 10 组 PASS**；包括旧引擎物理指针在非 1 scale 的色域命中、portal 视口定位、数值最终 pointerup 样本、重建焦点、无变化 Enter/blur、活动手势销毁、用户资产名保持和中文错误。动态尺寸每场景 100 帧，四种 scale 的首次打开/搜索 resize/Picker 打开及反向共 16 段；图表布局/viewBox、Picker 单实例/宽度/画布尺寸的稳定性有断言。[Edge 专项](../../.tmp/vela-evidence/0.3.13-b/f1/edge-results.json)、[Chromium 99 专项](../../.tmp/vela-evidence/0.3.13-b/f1/chromium99-results.json)、[Edge 尺寸](../../.tmp/vela-evidence/0.3.13-b/f1/after-edge-geometry.json)
- 关联浏览器 **17 组行为 + 20 个四页组合 PASS**：320/420/720、短高度、Dark/Light、中英文、实际 scale 代表值；正常/反向/中断/reduced-motion、阅读位置、IME 事件、dirty leave、真实捕获状态与清理保留。[结果](../../.tmp/vela-evidence/0.3.13-b/f1/browser-results.json)
- HTTP sandbox、独立 file、file 父页自包含 sandbox 入口全部 PASS；生产草稿/焦点保留，Storage/API 隔离仍成立。[加载结果](../../.tmp/vela-evidence/0.3.13-b/f1/launcher-results.json)
- **最终全量离线 199/199 PASS，0 FAIL，0 skip**，针对最终生产及离线测试状态执行一次；随后仅修正浏览器探针的 disclosure / textarea 定位并完成证据和报告，无生产修改。[本轮全量](../../.tmp/vela-evidence/0.3.13-b/f1/full-offline.log) CoreUI Select focused、reference focused、确定性 build --check、生成报告、project consistency 通过；没有触发正式模型资格或真实 Provider/Host 测试。
- 收尾检查：`git diff --check` 通过；62 个未跟踪文件的 whitespace 检查通过，52 个新增/修改 JavaScript 文件 `node --check` 通过。[静态检查](../../.tmp/vela-evidence/0.3.13-b/f1/final-static-checks.json)
- 字体栅格、GPU/合成层动态重影、真实 OS IME、CEP 焦点/缩放与整体视觉仍为用户实机验收范围。隔离 Chromium 99 的通过不等于 CEP 通过；未将其称为真实 CEP。测试实例由 finally 关闭，探针/订阅/portal/手势按销毁路径释放；必要 raw 留在原 .tmp 体系的 f1 子目录，未尝试删除先前被拦截的目录。

最小实机复测（用户执行，加载/恢复沿第 6 节）：

1. 先保存生产草稿，由用户重载面板；Developer → Design Tuning → UI 参考页。cache query 为 20260918-ui-reference-b-f1，VERSION 仍 0.3.12。
2. Picker：首次打开、静止、resize、0.62/0.92/1/1.18、快速关开各观察动态过程。若两种宽度重影仍在，展开“预览设置 → 尺寸诊断”，点“一次尺寸采样”，随即打开 Picker；最多 180 帧 / 4 秒自动停止，展开证据后选中文本复制即可。无需调试端口，不会自动发送数据或操作 AE。
3. Registry Controls：观察图表不再持续收缩；搜索 defaultCurve 后 resize；检查自定义下拉展开与滚动条，切页/语言/主题后再看。四页数值框试横拖、点击全选、方向键、Enter/Escape；拖动中失焦/resize 后不得继续变化。
4. Curve：点击节点/手柄，再点“编辑选中元素参数”；应有节点/入/出区及范围说明。数字与图形互相更新，端点和 Linear/Hold 不适用状态明确。Vela 对照 v26 的整体会话/输入区，查看 Review 身份、部分完成与 Verify 失败；按钮仍不执行真实命令。
5. 中文查看新建/搜索重建、Picker 校验、参数和菜单；确认用户资产名称不变。退出应先协商，返回原生产草稿；系统减少动态效果下再试一次 Picker。若异常需重载，由用户先按既有流程保存生产草稿，不清空存储、不重启 AE。

**USER REAL-AE RE-ACCEPTANCE REQUIRED。** 本包停止；未暂存、提交、推送、PR、合并、发布或进入 C。


## 8. B-F2 — Curve 工作流、组合控件布局与 Picker 重影定位

继续同一 B/F1 工作树与 v26 视觉来源。未改 Site、Host、Runtime、Authority、曲线模型、真实资产或产品版本；F1 历史结果保留在第 7 节。本次收到的 Picker 状态是 **用户实机仍失败；自动环境尚未复现实机的动态重影**。下述实验复现了与滚动条宽度对应的布局振荡，但不能据此关闭 CEP 重影或宣布 B 验收。

| 项目 | 本轮实现与证据 |
|---|---|
| Curve 信息顺序 | [curve-view.js](../../client/reference/src/lab/curve-view.js)::editor/handleFields：曲线预览 → 回放与必要时长 → 当前选中元素参数 → 默认折叠的曲线类型/结构/UI motion。固定端点只留紧凑说明；不存在的手柄不渲染面板，非 Bézier 用说明和“曲线类型”入口。节点/入/出按钮与图形选中状态一致，一次只显示当前元素的可编辑参数。中间节点、类型、拆分/删除/反向、组/副本等仍存在；原范围、精度和数据未改。[当前呈现](../../.tmp/vela-evidence/0.3.13-b/f2/edge-curve-preview-playback.png) |
| 显式回放 | 旧 click(open) 在选库条目后显式 play，已移除。play/stop 用回放代次与曲线 ID 防止迟到回调推进新曲线或清掉新 frame；选条目、创建/复制/删除、销毁与重进停止旧回放并复位，普通 render 不创建轮次。未新增偏好或 motion authority。实际旧产物的选曲自动播放已复现：[前例](../../.tmp/vela-evidence/0.3.13-b/f2/before-workflow.json)。[focused](../../scripts/test-ui-reference.js) 直接调用实际 CurveView 方法，强制交付已取消的旧回调；真实页面另覆盖首次进入、暂停后换曲、播放中换曲、播放完成后换曲、快速选择、离页返回及参数/语言/主题重绘 |
| RangeNumber / Color | [controls.js](../../client/reference/src/controls.js)::rangeNumber/colorControl/mountControls 与 [controls.css](../../client/reference/styles/controls.css) 统一创建规则。Registry、Settings 及 Palette/Picker 的同类控件共同消费；Vela 当前无此类输入。实际 DOM/Tab 顺序为数值/HEX 在左、滑块/预览按钮在右。数值按范围/步长估算为 7–12ch + 18px，HEX 为 9ch + 18px；滑块取得剩余宽度且至少 104px，空间不足换行。规则只约束组合控件，不再依赖增强前的 input[type=number]。F1 横拖/全选/步进/草稿/取消/联动/清理保留；额外有明确标记的负数六位小数共享控件 fixture，不向生产 schema 增字段 |
| Picker 已确认的反馈 | [color-picker.js](../../client/reference/src/lab/color-picker.js)::position 原先读取 .cp-body.scrollHeight（含上次受限视口且为整数），写 panel maxHeight；301/300px 的溢出临界点令滚动条出现/消失，平面宽度改变后再次触发 ResizeObserver。Chromium 99、scale=1、真实 8px 占位时 body clientWidth 在 **286/278** 间交替，17px 时为 **286/269**，canvas backing width 对应 **262/254**、**262/245**；75 帧期间定位持续写入。单实例、根/document clientWidth=420、外层 panel clientWidth=286 稳定，故该反例并非重复实例或内外 viewport 宽度混用。[修复前逐帧](../../.tmp/vela-evidence/0.3.13-b/f2/before-chromium99-scroll-geometry.json) |
| Picker 修复与剩余缺口 | 明确滚动 owner 为 .cp-body，采用 Chromium 99 可用的 overflow-y:scroll 保留其占位；现代 scrollbar 属性显式回到同一 WebKit 样式路径。新增内部 .cp-content，position 从未变换的 computed layout height、padding/border 求自然高度并向上取整，不再回读 scroller 的受限视口高度。正常/反向/中断动效、halo 与弹层自适应宽度保留。修复后内容、canvas、根布局稳定，定位写入稳定至 2–5 次；未隐藏全部滚动条、固定新宽度或追加显示延时。**已修复自动反例中的布局循环；CEP 动态重影仍待用户确认**。若新采样显示几何/占位稳定而视觉仍重影，剩余检查归绘制/合成层，不再当布局已修复的证据 |
| 有界诊断 | 扩展原 [size-probe.js](../../client/reference/src/size-probe.js)：inner/document/root 尺寸、校准比例、实际各滚动 owner 的 overflow/scroll/client/offset、边框扣除后的布局/视口占位、祖先 zoom/transform、portal/plane/canvas 写入及 halo 绘制属性。最多 180 帧/4秒，采样先存内存，结束才显示证据；测试断言采样期间 header 高度不变。销毁使旧回调失效；不读父 Store、不自动发送、不要求调试端口。[Chromium 99 页内采样](../../.tmp/vela-evidence/0.3.13-b/f2/chromium99-user-sampler.json) |

F2 实际验证：

- [f2.cjs](../../scripts/ui-reference/f2.cjs)：Edge 153 / Chromium 99.0.4812.0 **各 10 组 PASS**，涵盖上述回放全序列、当前元素参数、320/420/720 与短高度、中文/英文、0.62/1/1.18、真实 DOM/Tab 顺序、小数联动、合法负数精度及诊断退出清理。[Edge](../../.tmp/vela-evidence/0.3.13-b/f2/edge-f2-results.json)、[Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f2/chromium99-f2-results.json)
- [f2-geometry.cjs](../../scripts/ui-reference/f2-geometry.cjs)：显式移除 Playwright headless 的 --hide-scrollbars 默认项，并断言实际 8px/17px 占位；不是只检查样式或浏览器版本。0.62/1/1.18 下，首次打开、溢出阈值 −1/+1/−1px、反向关开各 75 帧，**每环境 30 段 PASS**；最终 Edge、Chromium 99 独立页，以及实际 launcher 的 opaque iframe 均通过。旧默认隐藏滚动条的探针不能证明传统占位路径。[Edge](../../.tmp/vela-evidence/0.3.13-b/f2/after-edge-scroll-geometry.json)、[Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f2/after-chromium99-scroll-geometry.json)、[隔离 iframe](../../.tmp/vela-evidence/0.3.13-b/f2/after-iframe-chromium99-scroll-geometry.json)
- F1 专项在当前产物上 **两引擎各 10 组 PASS**；关联浏览器 **17 组行为 + 20 组页面组合 PASS**，保留 Picker 正常/反向/中断/reduced-motion、阅读锚点、IME、dirty leave、数值/手势与退出清理。[F1 Edge](../../.tmp/vela-evidence/0.3.13-b/f2/edge-results.json)、[F1 Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f2/chromium99-results.json)、[关联](../../.tmp/vela-evidence/0.3.13-b/f2/browser-results.json)
- 折叠区 Select 的探针曾因自动滚动的迟到 scroll 关闭新菜单；[事件证据](../../.tmp/vela-evidence/0.3.13-b/f2/select-trace.json) 确认其符合既有 scroll-close 契约。测试先完成自身滚动再真实点击，未修改生产 Select 或用重试掩盖结果。
- HTTP sandbox、独立 file、file 父页 sandbox 三条加载/退出路径 PASS。[入口](../../.tmp/vela-evidence/0.3.13-b/f2/launcher-results.json) 没有放宽 iframe sandbox。
- **最终全量离线 199/199 PASS，0 FAIL，0 skip**，本轮对最终生产/离线测试状态执行一次；不是引用 F1 结果。[原始输出](../../.tmp/vela-evidence/0.3.13-b/f2/full-offline.log) 确定性 build --check、reference focused、project consistency、生成 i18n 报告通过（1125 global keys，三类 missing=0）。随后仅补 iframe 证据运行、报告与收尾检查；无生产修改。未运行真实 Provider/Host 或正式模型资格测试。

收尾：`git diff --check`、64 个未跟踪文件的 whitespace 与 54 个新增/修改 JS 文件语法检查通过；报告本地链接均存在。[静态检查](../../.tmp/vela-evidence/0.3.13-b/f2/final-static-checks.json) 最终 `git status -sb` 仍为原 B 分支，仅本包及保留的 B/F1 改动，无暂存。测试浏览器与服务器均已关闭，必要证据留存；没有新增长期诊断实例。

用户最小复测（实际 AE/CEP 仍由用户执行）：

1. 按既有流程保存生产草稿后自行重载面板，Developer → Design Tuning → UI 参考页；cache query 为 **20260918-ui-reference-b-f2**。加载/退出/恢复沿第 6 节，不重启 AE、不清空存储。
2. Curve：确认回放紧接预览；选择端点/中间节点/入出手柄，只有实际可编辑的当前参数出现，低频操作可展开。试首次进入、播放 A 后选择 B、A 播放中与完成后换曲、快速选择、离页返回；新曲线均复位且只有点击播放/重播才运行。
3. 四页中实际存在的组合控件及 Picker：检查数值/HEX 在前的 Tab 顺序；窄宽与放大 scale 下滑块可用；横拖、全选、步进、小数输入、Enter/Escape 和滑块联动仍成立。
4. Picker：观察首次打开、静止、内容临界溢出、resize、非 1 scale、快速关开。若仍重影，先关闭 Picker，展开“预览设置 → 尺寸诊断”，点一次采样后再打开，等待结束后复制证据；说明当时 scale/是否仍可见重影即可。证据在结束后才显示，可能改变页面可用高度；其变化不属于采样区间。无需开放端口或发送真实请求。

**USER REAL-AE RE-ACCEPTANCE REQUIRED。** 未获用户复测确认前，Picker 实机问题与 B 验收保持未关闭。只更新本报告及实现/测试/必要生成文件；不暂存、提交、推送、PR、发布或进入 C。


## 9. B-F3 — 共享列、图标与 Vela 渐进模糊

**用户验收更新：用户确认 F2 其余项目通过，包括 Picker 动态重影。** 该确认归属于本次反馈所覆盖的 Curve 工作流、播放切换、组合控件基本交互及 Picker 复测；不推导为所有 B 项目 PASS。第 7/8 节的失败与当时未确认状态是历史记录，保留原文；Picker 不再是当前失败项。F3 的共享列、图标已完成自动验证；Vela 模糊仍有下面明确的兼容失败与实机缺口，**不能宣布三项均已完成或 B 验收通过**。

### 9.1 共享列与图标

[controls.js](../../client/reference/src/controls.js)::mountControls 删除逐字段范围/当前值的宽度写入；[controls.css](../../client/reference/styles/controls.css) 由两种组合共同消费 8rem（当前根字号下 128px）输入列、8px 间距和 border-box，去掉 native range 的额外 margin。值变化不再决定分界；需要扩容时，由整个字段组继承同一 --ref-combo-column，不改变字体或截断。右侧 range 保留至少 104px，不足则按实际 DOM 顺序换行；普通文本输入不受此规则限制。

实际同容器测量（420、scale=1）：旧数值/HEX 右边界分别 **67.05 / 81.06px**，右侧控件起点 **77.05 / 89.06px**；新边界统一 **128px**，起点 **136px**。两引擎均检查 Registry、Settings，以及 Palette/Picker；Vela 没有这类输入。覆盖 320/420/720、短高度、0.62/1/1.18、中英文、主题、值提交后重建；有合法负数六位小数、HEX alpha、单位和整组扩容/换行反例。原 Tab 顺序、横拖/全选/步进/Enter/Escape/滑块联动及清理保留。[Edge 几何](../../.tmp/vela-evidence/0.3.13-b/f3/edge-f3-results.json)、[Chromium 99 几何](../../.tmp/vela-evidence/0.3.13-b/f3/chromium99-f3-results.json)、[测试](../../scripts/ui-reference/f3.cjs)

图标定向清单（来源仍为 v26 / 3df562e66d8b6ea36bb592bbb75a8369d2d002bf）：

| 源图标 / 位置 | 当前差异 → 原因 → 处置 |
|---|---|
| app.js::icons.settings / Vela 输入工具栏 | F1 用 ◇ 替代源 SVG → 参考模板迁移遗漏 → 恢复原 path + 两个 circle；按钮进入现有参考外观设置，仍只改会话内预览 |
| icons.plus / Vela 标题栏 | 新会话入口漏掉 → 参考模板遗漏 → 恢复源 plus SVG 与 30px 命中区；命令明确隔离，仅显示提示，不清空会话、不改变 Runtime 事实 |
| icons.check / lifecycle-view.js 执行行 | 字符 ✓ / · 替代 → 手写事实模板没有消费原图标 → 完成事实使用源 check，活动事实可用源 loader，尚未完成行保留源设计的序号；不把 hostCommitted=true 自动画成 Verify 成功 |
| icons.send / stop / Vela 发送位置 | 箭头已有相同 path，但执行态缺少 stop → 状态图标漏映射 → 共用 [icons.js](../../client/reference/src/icons.js) 原 SVG，执行态显示 stop；点击仍是隔离命令，不能批准或执行 |
| styles.css::.plugin summary::before / 四页通用折叠项 | Chromium 99 为实心块，webkitMaskImage=none；Edge 正常 → 原 v26 仅写非前缀 mask，参考兼容补齐遗漏 → 同一 data-SVG 增加 -webkit-mask，不改变路径、尺寸和重量 |
| Registry section / preview disclosure；Curve 图形；Picker 吸管 | 原 SVG/path/viewBox 与 stroke/currentColor 保留，无迁移遗漏；复核搜索重建、主题/语言和非 1 scale 后仍存在。Palette 的复制、返回等文字字符本来就在 v26，不冒充新增 SVG 修复 |

[图标来源清单](../../.tmp/vela-evidence/0.3.13-b/f3/icon-inventory.json) 与 f3.cjs 直接对照原 v26 app.js 的 SVG 内容、24×24 viewBox、1.5 stroke、fill=none；Registry disclosure 为源 16×16 / 1.5，Picker 吸管为源 24×24 / 1.6。未发现 symbol/use、外部 mask 或字体图标打包丢失；新模块只内联已有 Lab 字形，不引入另一套库，不改生产程序化图标身份。自包含产物、CSP、sandbox 保持原边界。

### 9.2 Vela 模糊：已定位的差异与未完成项

v26 原效果是 **4 层 backdrop-filter blur（2/8/18/36px）+ 各层自上而下的透明渐变 mask + 最上方表面颜色渐变**，不是普通 filter blur，也不是纯色遮挡。Picker 同样使用背景模糊，但为三个矩形交集 mask、3/8/16px，以及独立 presence/transform；其正常不能证明 Vela 的组合正常。

逐层核对 [vela.js](../../client/reference/src/vela.js) 的 composer-haze、[styles.css](../../client/reference/styles/styles.css) 的对应规则、reference.css 和最终 embedded.js：四个节点、前缀/非前缀 backdrop 与 mask、动态尺寸和 z-index 均进入产物且实际命中。没有找到工程漏接或无条件 fallback 覆盖；祖先没有额外 opacity/filter/mask 截断背景采样，messages 继续经过背景层，composer 文字/按钮在 z-index=2 且可交互。未修改已通过的 Picker 定位、滚动 owner、gutter 或 halo。

[f3-blur.cjs](../../scripts/ui-reference/f3-blur.cjs) 在**真实 v26 页、仓库参考页、实际 launcher opaque iframe** 中，使用标注的条纹/中英文长内容 fixture，固定相同 400×450 shell / haze 几何，分别滚动 120/157px；Dark/Light、scale=1/0.92，每引擎 24 个对照。对同一帧分别保留背景模糊和仅禁用模糊，测量背景条纹的像素变化，排除文字抗锯齿变化；截图、祖先样式及实际坐标同时留存。这是独立探针页面，不复制或同步生产消息 DOM。

- **Edge 153：24 个对照通过渐进效果与背景层边界检查。** 顶部 2–8px 带变化约 7.9，中部 26–34px 带约 41.5（0–255 RGB 平均差），源页与参考页接近；层外条纹差为 0。[结果](../../.tmp/vela-evidence/0.3.13-b/f3/edge-blur-render.json)、[v26 渲染](../../.tmp/vela-evidence/0.3.13-b/f3/edge-source-dark-1-120-shell.png)、[参考渲染](../../.tmp/vela-evidence/0.3.13-b/f3/edge-reference-dark-1-120-shell.png)
- **Chromium 99.0.4812.0：24 个对照存在实际背景模糊，但渐进遮罩验收失败。** 源页、参考页、opaque iframe 都出现硬边界和整块强模糊；顶部变化约 91、中部约 80，mask 属性虽然解析，实际没有目标渐进效果。效果层外条纹保持不变。脚本以非零退出，未改阈值使其通过。[失败结果](../../.tmp/vela-evidence/0.3.13-b/f3/chromium99-blur-render.json)、[v26 渲染](../../.tmp/vela-evidence/0.3.13-b/f3/chromium99-source-dark-1-120-shell.png)、[隔离 iframe 渲染](../../.tmp/vela-evidence/0.3.13-b/f3/chromium99-iframe-dark-1-120-shell.png)
- **用户实机“效果缺失”的确切原因仍未确认。** 上述是本机隔离 headless Chromium 的可复现组合差异，不等同于真实 CEP 的缺失，也没有证据将其归因于 AE/CEP。临时测试的 compositing、mask 包装及本地 SVG filter 候选，未得到可靠的等效渐进效果；有的切断了背景采样，因此全部未写入产物。当前保留 v26 原实现，不以渐变色块代替模糊。没有重型依赖、常驻采样、消息镜像或 Liquid Glass 扩展。**本项仍未完成，不能只等待一次视觉确认就把已知 Chromium 99 渐进失败注销。**

### 9.3 最终验证与用户交接

以下均针对本次最终生产产物执行，历史 PASS 未替代本轮结果：

- F3 列与图标专项：Edge / Chromium 99 均通过；Vela 另有 12 组同尺寸/主题/状态类型对照通过。模糊渲染结果单列如上，**Chromium 99 渐进项 FAIL**。[12 组对照](../../.tmp/vela-evidence/0.3.13-b/f3/vela-comparison.json)
- F1、F2 专项两引擎分别各 10 组 PASS；关联浏览器 17 组行为 + 20 组页面组合 PASS，保留数值交互、Picker 正常/反向/中断/reduced-motion、阅读位置、IME、dirty leave、事实呈现及销毁清理。[F1 Edge](../../.tmp/vela-evidence/0.3.13-b/f3/edge-results.json)、[F1 Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f3/chromium99-results.json)、[F2 Edge](../../.tmp/vela-evidence/0.3.13-b/f3/edge-f2-results.json)、[F2 Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f3/chromium99-f2-results.json)、[关联](../../.tmp/vela-evidence/0.3.13-b/f3/browser-results.json)
- HTTP sandbox、独立 file、file 父页 sandbox 三条加载与退出路径 PASS，父页草稿/焦点保留。[入口检查](../../.tmp/vela-evidence/0.3.13-b/f3/launcher-results.json)
- **最终全量离线 199/199 PASS，0 FAIL，0 skip**，对最终生产/测试状态（含最后的浏览器探针修订）执行一次；探针修订前的一次全量另留历史，未作为最终结果沿用。[全量原始结果](../../.tmp/vela-evidence/0.3.13-b/f3/full-offline.log) reference focused、Select lifecycle、确定性 build --check、project consistency、生成 i18n 检查均通过。i18n 报告因新增键引用按规则重新生成，1125 global keys，三类 missing=0；没有新增无关翻译范围。未运行真实 Provider/Host 或正式资格测试。

- Picker 传统滚动条关联：Edge、Chromium 99 独立页、Chromium 99 opaque iframe **各 30 段 × 75 帧 PASS**；8/17px 占位、0.62/1/1.18、首次打开、实际临界溢出/刚好容纳、反向开闭均稳定。[Edge](../../.tmp/vela-evidence/0.3.13-b/f3/after-edge-scroll-geometry.json)、[Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f3/after-chromium99-scroll-geometry.json)、[iframe](../../.tmp/vela-evidence/0.3.13-b/f3/after-iframe-chromium99-scroll-geometry.json)。旧探针直接拿整数 scrollHeight ±1 设 CSS height，在缩放取整后未跨越实际阈值，曾正确报出 overflow required；现由有界探测找到相邻真实溢出/容纳高度，保留两侧断言，未改生产 Picker 或放宽稳定性要求。[原失败](../../.tmp/vela-evidence/0.3.13-b/f3/geometry-threshold-probe-failure-chromium99.json)
- 收尾：git diff --check 通过；67 个未跟踪文件 whitespace、57 个新增/修改 JS 语法和报告链接检查通过。[静态结果](../../.tmp/vela-evidence/0.3.13-b/f3/final-static-checks.json)。浏览器/服务器均 finally 关闭，临时探针和局部状态随隔离实例销毁；未尝试删除此前受策略拦截的目录。

实机加载方法沿第 6 节：用户先保存生产草稿，自行重载后从 Developer → Design Tuning → UI 参考页进入；cache query 为 **20260918-ui-reference-b-f3**，VERSION 仍 0.3.12。最小视觉复测只需：

1. Registry Controls 与 Settings 对比数值/HEX 边界；改变数值、切换 UI Scale、收窄面板，检查左列/间距相同、滑块可用且交互不退化。
2. 看 Vela 外观、加号、完成/执行图标，以及四页折叠箭头；切换主题/语言并重新进入一次，检查字形、重量、清晰度和命中区域。
3. Vela 追加长证据并滚动，使文字确实经过输入区背后；对照上面的 Edge 目标截图，观察是否渐进模糊、是否缺失或有硬边，确认前景文字/按钮清晰可操作。实机结果由用户反馈，**不要求调试入口**；此反馈不自动豁免已记录的 Chromium 99 失败。退出仍先协商；必要重载由用户在保存生产草稿后执行，不清空存储、不重启 AE。

**USER REAL-AE RE-ACCEPTANCE REQUIRED。** 共享列/图标待用户复核；Vela 兼容失败保持 OPEN，B 不宣告完整验收。只改参考实现、对应产物/测试、必要缓存标识/生成报告和本报告；Site、Host、Runtime、Authority、真实资产、版本及冻结架构未改。不暂存、提交、推送、创建 PR、发布或进入 C。


## 10. B-F4 — Vela 渐进背景模糊兼容修复

仅处理 composer-haze，沿用 v26 源码与相同工作树；第 9.2 节记录的是 F3 当时结果，未覆写或把失败改成 PASS。Picker 用户验收状态不变。本轮未操作 AE、修改 Site、共享列、图标、Host、Runtime、Authority、存储或版本。

### 10.1 最小失败条件与候选

先整理 F3 的 transform / fill / mask-size / 叠层顺序、包装层和 SVG filter 候选：部分仍为整块模糊，部分切断背景采样；当时没有 PNG mask 实测。[候选归档](../../.tmp/vela-evidence/0.3.13-b/f4/f3-candidates.json)

[f4-mechanism.cjs](../../scripts/ui-reference/f4-mechanism.cjs) 每例使用新页面及相同条纹/几何/表面渐变；**Chromium 99 的最小触发条件是 backdrop 层的祖先同时具有圆角和 overflow:hidden**。只用单层也可失败，不需要四层互相影响。去除圆角或移走裁剪即可恢复，isolation/z-index/渐变变量不是本反例的必要条件。这缩小了 F3 的失败机制；不能推广成所有 Chromium 99 mask 都不支持，更不等于已确认用户 CEP 的内部原因。

| 最小对照 / 候选 | 实际结果与处置 |
|---|---|
| 普通内容 + CSS / PNG 渐变 mask | 两引擎都可渐变，证明资源和普通遮罩路径存在 |
| 单层 backdrop blur，无 mask | 均匀模糊，如预期；仅有 RGB 差不能判为渐进 |
| 同元素单层 CSS blur + mask | Chromium 99 在矩形裁剪下渐进；祖先加入 8px 圆角后失效。Edge 均正常 |
| 原四层 CSS 组合 | 矩形裁剪下渐进；圆角裁剪下 Chromium 99 顶部/中部 RGB 差约 91/80，硬边强模糊；Edge 正常 |
| 小型内嵌 PNG mask | 确定性 1×512 白色 RGB、仅 alpha 变化，4 张各 540–561 bytes；沿原 0–30/18–52/38–76/62–100% 停点，在 blur 元素本身设 100%×100%、no-repeat，等待实际 Image 解码。Chromium 99 普通 PNG mask 正常，但 blur 组合仍失败；真实旧参考/launcher iframe 顶部/中部约 91.10/79.97，不能等价。未纳入产物 |
| 4 个不重叠区域、原 2/8/18/36px blur | Chromium 99 仍有入口硬边、分段接缝及采样差异，约 85.30/60.87；不满足原阈值。未增加条带数量，不作为降级交付 |
| **分离内容裁剪，保留原四层 CSS mask** | **采用。** 两引擎的最终参考页及实际 opaque iframe 均通过渐进、边缘扩散和条纹衰减检查；效果自身底部圆角可保留 |

证据：[Edge 最小对照](../../.tmp/vela-evidence/0.3.13-b/f4/edge-mechanism.json)、[Chromium 99 最小对照](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-mechanism.json)、[PNG 载荷](../../.tmp/vela-evidence/0.3.13-b/f4/png-mask-manifest.json)、[PNG 实际失败](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-png-blur-render.json)、[四分区失败](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-four-zones-blur-render.json)。后两候选使用保留的 F4 前产物，脚本非零退出；不是最终方案通过记录。

### 10.2 采用实现与真实渲染

[vela.js](../../client/reference/src/vela.js)::render 增加一个 vela-content-clip，只包标题与消息，持有原圆角裁剪；haze/composer 保持其外的兄弟层。[reference.css 源文件](../../client/reference/styles/reference.css) 仅在 reference-vela 下解除外壳 overflow 裁剪，并把底部 7px 圆角交给效果层自身。**不增加模糊层：仍为 4 层，半径、mask 停点、表面渐变、覆盖面积、前景 z-order 与动态高度来源均未改变。** 无消息复制、背景采集、额外动画或常驻循环；PNG 只存在于候选探针，不是交付资源。

[f4-blur.cjs](../../scripts/ui-reference/f4-blur.cjs) 保留 F3 原阈值（顶部 2–8px 差值小于中部 26–34px 的 0.65 倍；中部须有实际 blur），另比较开关 blur 前后的 10–90% 边缘过渡宽度及条纹标准差。表面渐变一直开启；深层细节测量仅在隔离探针暂时隐藏前景，正常截图/交互另验。原始绝对导数 RMS 在 Edge 受渐变抖动噪声影响，保留数值但不用它判扩散；改用归一化边缘宽度，没有放宽原 F3 阈值。

- 每引擎 **36 个渲染对照**：v26 源页 12、最终参考页 12、实际 launcher opaque iframe 12；Dark/Light、1/0.62/1.18 scale、滚动 120/157。最终候选各 **24/24 PASS**，层外差值为 0；Chromium 99 的 v26 原页 **12/12 保持失败负对照**。[Edge](../../.tmp/vela-evidence/0.3.13-b/f4/edge-blur-render.json)、[Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-blur-render.json)
- Chromium 99、Dark、scale=1、iframe：顶部/中部差值 **8.24/43.93**；深度 4/22/46/66% 的边缘宽度 **0.95/6.49/24.88/45.67px**，关闭 blur 后均约 **0.8px**；条纹强度比 **0.817/0.210/0.022/0.036**。这是扩散而非纯染色、遮挡或均匀 blur。Edge 对应宽度 **0.95/6.18/25.75/47.22px**，存在后端栅格差异，不宣称像素相同。[最终 iframe](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-iframe-dark-1-120-shell.png)、[Edge v26 对照](../../.tmp/vela-evidence/0.3.13-b/f4/edge-source-dark-1-120-shell.png)、[旧引擎 v26 负对照](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-source-dark-1-120-shell.png)
- 实际环境：**Edge 153.0.4234.32 / ANGLE NVIDIA RTX 3070 D3D11**；**HeadlessChrome 99.0.4812.0 / ANGLE Vulkan SwiftShader**；Playwright 1.58.2、headless，显式取消默认 --hide-scrollbars。版本、完整启动参数、SystemInfo/WebGL 后端随上述 raw 保存。旧引擎软件渲染通过不是 CEP/GPU 硬件结论；未要求用户改任何宿主参数。

### 10.3 滚动、成本与最终验证

[f4-lifecycle.cjs](../../scripts/ui-reference/f4-lifecycle.cjs) 对旧/新产物、scale=1/1.18，各引擎 4 个实际 launcher iframe 场景通过：多行输入增高/收回、真实物理点击及焦点、Enter 换行/隔离发送、部分完成和 Verify 失败事实、长内容追加的阅读锚点、320px resize、dirty leave 与销毁。动态另采 90 帧滚动中的 4 张截图，未只验终点。[Chromium 99 动态截图](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-final-1-scroll-30.png)

成本区间与截图采集分开：每场景 120 帧滚动。scale=1 时效果面积仍为 402×175px，输入增高后 402×223px；新增裁剪 wrapper，不新增效果层。Edge iframe CDP 合成树 14→14，旧引擎共享 parent/iframe CDP 树 21→17；最终 rAF P95 分别约 10.1/18ms，均无 >34ms 帧。120 帧 TaskDuration：Edge 旧 48.6–49.8ms、新 47.4–47.6ms；Chromium 99 旧 129.5–131.0ms、新 126.9–129.8ms，区间内无新增 layout/recalc。**这是单次有界 headless 观测，不是 GPU raster 成本或真实 CEP 流畅度保证，也不宣称性能提升。** [Edge 成本/生命周期](../../.tmp/vela-evidence/0.3.13-b/f4/edge-lifecycle-cost.json)、[Chromium 99](../../.tmp/vela-evidence/0.3.13-b/f4/chromium99-lifecycle-cost.json)

- 关联浏览器 **17 组行为 + 20 组页面组合 PASS**：包含数值、Picker 正常/反向/中断/reduced-motion、阅读位置、IME 事件、焦点/离开协商与清理；同尺寸主题状态的 Vela **12 组对照 PASS**。没有重新宣布全部用户验收通过。[关联](../../.tmp/vela-evidence/0.3.13-b/f4/browser-results.json)、[Vela](../../.tmp/vela-evidence/0.3.13-b/f4/vela-comparison.json)
- HTTP sandbox、独立 file、file 父页 sandbox 三路径 PASS，sandbox 仍只 allow-scripts，父页草稿和焦点保留。[入口](../../.tmp/vela-evidence/0.3.13-b/f4/launcher-results.json)
- 最终实现与测试状态：reference focused、确定性 build --check、i18n report --check、project consistency 通过；**本轮最终全量离线 199/199 PASS，0 FAIL、0 skip**，执行一次，未触发正式模型资格或真实 Provider/Host。[全量](../../.tmp/vela-evidence/0.3.13-b/f4/full-offline.log)
- 本轮变更只有 vela.js、reference.css 源规则及生成 reference.css/reference.bundle.js/embedded.js，4 个 F4 针对性脚本和本报告；B/F1/F2/F3 其他改动保留。git diff --check、未跟踪内容 whitespace、JS 语法和报告链接收尾结果见[静态检查](../../.tmp/vela-evidence/0.3.13-b/f4/final-static-checks.json)。测试浏览器、HTTP server、临时循环随 finally/隔离实例退出，无真实资产操作。

### 10.4 用户最小实机复测与停止

当前有合格的隔离浏览器候选，已知 Chromium 99 圆角裁剪反例通过；**真实 CEP 的原始缺失是否消失、宿主合成质量及滚动成本仍未覆盖**。不是仍有已知候选失败而只等待用户批准降级。

1. 按第 6 节先保存生产草稿，由用户自行重载面板，从 **Developer → Design Tuning → UI 参考页 → Vela** 进入；自包含加载方式不变，本轮未更换 F3 cache query。若宿主仍缓存旧产物，先退出参考页、保存草稿后再由用户重载；不清存储、不重启 AE。独立文件入口仍为 client/reference/index.html。
2. Dark/Light 各追加长证据并上下滚动，使文字穿过输入区背景；应从清晰逐渐扩散，顶部无硬边，不能只有文字变暗。再试一次非 1 UI Scale。
3. 输入多行再清空，确认效果范围跟随输入区；前景文字/按钮清晰、点击与焦点正常，滚动没有明显新增卡顿。退出有草稿时先协商，返回原生产页。异常时退出参考页即可恢复普通入口；无需调试端口或真实批准/Host 动作。

**USER REAL-AE RE-ACCEPTANCE REQUIRED。** B 未完整验收；不将此轮推导为 F3 共享列/图标已获用户确认。不暂存、提交、推送、创建 PR、发布或进入 C。

## 11. B 最终用户验收与收口

**B ACCEPTED / READY FOR COMMIT / PR；尚待提交和合并。** 本轮用户明确确认已完成约定范围的 AE/CEP 实机验收：F2 通过，包括 Picker 重影修复、Curve 工作流与播放切换、组合控件交互；F3 共享列对齐与图标正常；F4 Vela 渐进背景模糊获实机视觉批准。B 参考页反馈项至此闭合，不追加 F5。本记录以用户本轮反馈为实机确认来源，不补写未提供的 AE/CEP 版本、性能数据或截图。

自动证据仍归属第 5、7–10 节各次执行，最终实现/测试状态沿用第 10.3 节的离线 199/199 PASS、隔离浏览器及确定性构建结果；本轮没有重新运行这些检查。用户实机批准与自动结果分别成立，不把 headless 结果改称 CEP 结果。初版和 F1–F4 的失败、淘汰候选、负对照及当时 USER REAL-AE ACCEPTANCE REQUIRED / RE-ACCEPTANCE REQUIRED 记录保留原文；其历史 FAIL/OPEN 不作全局替换，当前结论以本节及顶部状态为准。

当前已验收参考基线为 **Lomond UI Lab v26 / 3df562e66d8b6ea36bb592bbb75a8369d2d002bf，加仓库 B/F1–F4 适配**，不是修改或重新发布 Site。后续 C/D 提取共享平台时应保留：数值草稿/提交/取消与手势清理、Curve 显式播放及迟到回调隔离、组合控件共享列和真实 DOM/Tab 顺序、原 SVG 图标及自包含资源、Picker 稳定滚动 owner/尺寸来源，以及 Vela 内容圆角裁剪与四层 composer-haze 分离的结构约束。对应回归用例、旧引擎失败负对照、焦点/阅读锚点/离开协商和 Runtime 事实边界一并保留，不因提取共享模块退回已失败路径。

本次只关闭 **0.3.13-B 工作包**，不宣布整个 0.3.13 完成，不批量关闭正式总账条目；本验收不扩展为跨平台资格、长期性能保证、真实 Provider/Host 执行或生产资产迁移通过。

本轮仅更新本报告的顶部状态和本节，保留全部已验收源码、产物、测试、依赖声明/锁文件及必要生成 i18n 报告。已检查报告 whitespace（含其未跟踪内容）、交付文件范围与最终 git status：必要新增入口、参考源文件/产物及测试未遗漏；.tmp、node_modules 和原始证据由现有忽略规则排除，不进入提交范围。未重新构建、重复全量测试或修改其他文件；未暂存、提交、推送、创建 PR、合并或进入 C。
