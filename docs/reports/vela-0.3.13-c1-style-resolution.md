# 0.3.13-C1 — 语义样式决议与单一 CSS 投影

状态：**C1 TARGETED_ACCEPTED / READY FOR COMMIT / PR，尚待提交和合并**。实施记录日期：2026-09-19。用户实机确认范围及剩余未确认项见第 6 节；仅收口 C1，不宣布整个 C 或 0.3.13 完成，不关闭正式总账条目。

采用仓库已验收的 **v26 + B/F1–F4**；起点为干净工作树 `refactor/ui-style-resolution-0.3.13-c1`，HEAD `4b47568c4c63e7eb97b7eb6bde0bc9f3c7a2a9c7`（B 合并节点）。读取 AGENTS、当前路线、指导书 5.4/5.5 及 A/B 报告，定向复核 A 的 V-05 反例。没有重新获取 Site，也没有重做全量 UI 审计；历史 A/B 报告保持原文。

## 1. 首批属性、决议与持久 owner

| 语义属性 | 生产最终输出 | 无显式校准时 | 现有消费者示例 |
|---|---|---|---|
| `border.panel` | `--panel-border` | 当前 Settings accent，alpha 0.22 | `--border-default`、通用 surface、面板/卡片边框 |
| `border.input` | `--input-border` | 当前 Settings accent，alpha 0.16 | `--field-border`、输入框、Registry 字段 |
| `border.separator` | `--separator` | 当前 Settings accent，alpha 0.16 | `--border-subtle`、Settings section、分隔线 |

默认 bootstrap 值沿现有 [style.css](../../client/css/style.css) 的 `#d6b25e` 与上述 alpha；focused 测试核对默认值与该 CSS 一致。没有把用户存量覆盖重新标成默认，也没有把 v26 中性配色全局覆盖到 legacy 页面。

规则由 [semanticStyleResolver.js](../../client/js/ui/semanticStyleResolver.js)::resolve 纯计算：**设计默认 → 主题派生默认 → 显式 Design Tuning 校准**。三个属性采用相同优先级，各自保留上述 alpha。主题 preview 替换 theme 层，校准 preview 只替换对应校准项，然后完整重算；主题 preview 不能盖过显式校准。颜色须为六位 HEX，alpha 为有限的 0–1 数值，最终规范化成 rgba。非法层值在接受前拒绝，不部分污染已决议状态。

数据责任不变：Settings 持有 `base.accent`；Appearance 持有自身用户外观覆盖；这三个校准项仍由 Design Tuning Store 持久化。Appearance 镜像的现有委托不变，投影模块只持有会话输入快照，不读写存储、不引入第二份持久副本。显式值即使等于旧默认，主题改变后也仍是显式值。

`getStyleProvenance()` 在 `CoreAppearance`、`AEToolboxDesignTuning` 返回同一 root 的只读可复制快照：设计来源、提交主题输入、有效主题、派生默认、校准、各层预览、最终值与来源，以及 `resolved` / `projected`、pending/applied revision。`persistenceOwner` 只是归属，不是保存成功回执。暂停投影时两份快照可以不同；flush 不会把保存失败改成 persisted。参考 iframe 的 `ReferenceStyleProvenance()` 使用相同接口，没有新增诊断面板或持久日志。

## 2. 实际接线与旧 writer 退出

| 实际入口 | 本轮接线 / 移除 |
|---|---|
| `main.js:applyThemeAccent` → `CoreAppearance.setBaseInput` → `AppearanceResolver.resolveAndApply` | 将上述三项交给共享 theme 层；删除原三个直接 write 及重复派生公式。main fallback 的三个直接 setProperty 也改为同一投影委托 |
| `DesignTuningResolver.applyProjection` ← override / transient / clear / reset / restore | 传入完整校准与 preview 快照；原通用 setProperty/removeProperty 循环跳过三个受管项，其他项保持原路径 |
| `main.js:initializeDesignTuning` / `endAnimation` | 沿既有 `isProjectionSafe` 注册共享 guard；Appearance 也不能绕过它。原 `flushPendingProjection` 继续收束延后投影 |
| 参考 `app.js:projectAppearance`、`settings.js:paint/save` | 经 [style-projection.js](../../client/reference/src/style-projection.js) 使用同一 resolver/projector，输入仅来自自身隔离会话；Settings 的旧三项 inline writer 已委托 |

[semanticStyleProjection.js](../../client/js/ui/semanticStyleProjection.js)::forRoot 按 root style 的 WeakMap 复用唯一实例；只有其 flush 写入受管 CSS。设置/校准更新均先决议再投影，重复决议不重复写相同值。初始化时 CSS 字面值仍是无脚本 fallback，不是第二个运行时 writer。实际生产入口对三个属性的所有动态写入栈均落到该模块，且实际 Settings section 的 borderColor 与 provenance 的 separator 一致。

单项/分组/全部重置清除对应 transient，再移除 owner 中的覆盖；三个属性立即回到**当前主题派生值**，不再先 removeProperty 落回静态金色、等待另一事件纠正。Design Tuning evidence 的这三项 canonical 也改为当前主题派生值，不读启动时被覆盖污染的快照。原保存、重试、恢复回执保留，Appearance 的 applied 不再在受管投影被 guard 阻挡时报 true。

参考页保留已验收的独立默认输入：Dark `#292a31`、Light `#d8d8e0`，alpha 1；由 CSS `--reference-border-default` 提供，来源标为 `accepted-v26-theme`，不反读已投影的 `--border`。shell 将 panel 名称临时映射到 `--border`；Settings 局部 preview 使用三个生产变量名。适配只提供默认输入/名称，不再计算优先级。它不引入生产 accent 派生到 v26 基线，不读取父页 Store；sandbox 仍仅 `allow-scripts`，opaque iframe 的 localStorage 仍不可用。

本轮有意修正的外观差异仅为冲突结果：显式校准在改主题后保持；无关校准更新不再让边框跳回；重置立即跟随当前主题。无冲突生产路径及参考默认表现保持兼容。原 Settings accent 控件的提交/持久化方式未改；共享 theme-preview 输入口有测试，但不声称 AP-05 的逐 input 保存或 D 的手势合同已迁移完成。

## 3. 原实施轮：反例与最终自动验证

[test-semantic-style-resolution.js](../../scripts/test-semantic-style-resolution.js) 引用真实 Store/registry/resolver，[c1.cjs](../../scripts/ui-reference/c1.cjs) 加载真实 `client/index.html`、Settings HEX change 入口及实际 launcher iframe。生产浏览器实例中的 CEP bootstrap/只读能力查询均由闭合 fixture 回应或拒绝，**不执行 evalScript 内容**；非本地网络拒绝。没有 Provider 请求、Host mutation、AE 操作或真实配置写入。

- **原反例保留且复现**：校准 `rgba(18,52,86,.73)` → 改 accent 后被覆为 `rgba(240,128,64,.22)` → 改无关 separator 又恢复；reset 曾为 null，下一次 Appearance.resolve 才派生。最终相同输入保持显式值，reset 稳定为当前主题。[原输出](../../.tmp/vela-evidence/0.3.13-c1/original-conflict.json)
- **focused 14 套通过**：六种更新顺序、默认/显式等于默认、theme/calibration 分层 preview、取消与单项/分组重置、幂等、动态 canonical、只读 provenance、不同 root 隔离；延后投影且保存异常时回执为 accepted=true/applied=false/persisted=false，flush 后仍未持久化，重试/恢复保持原 owner 语义。[focused](../../.tmp/vela-evidence/0.3.13-c1/focused.log)
- **真实入口的隔离浏览器检查通过**：三项 computed CSS 与 projected provenance 相同，Settings 实际分隔线消费一致；writer 栈只有共享模块；生产与参考状态不串扰；新建干净实例的 Home/Registry/Settings 受检字体/表面/边框/Scale 等 computed 值与 B 相同。后者不是所有生产页面所有样式的穷举。
- **两引擎各 15 个整页 + 2 个 opaque iframe 对照通过，最终严格零像素差异**：Registry、Settings、Vela、Palette、Curve；320×500 Light/1.18/中文、420×680 Dark/1/英文、720×640 Light/0.62/中文；实际 iframe 另含 Vela Dark/Light。[Edge](../../.tmp/vela-evidence/0.3.13-c1/edge-c1.json)、[Chromium 99](../../.tmp/vela-evidence/0.3.13-c1/chromium99-c1.json)
- **关联回归重新执行通过**：F1/F2 两引擎分别各 10 组、F3 几何列对齐/图标；Edge 17 组行为 + 20 组页面组合；HTTP/file/sandbox 三条 launcher 加载退出路径。覆盖数字/HEX、Select、Curve 显式播放、IME、焦点、阅读锚点、dirty leave、Picker 正常/反向/中断/reduced-motion 与销毁。[F1](../../.tmp/vela-evidence/0.3.13-c1/chromium99-results.json)、[F2](../../.tmp/vela-evidence/0.3.13-c1/chromium99-f2-results.json)、[F3](../../.tmp/vela-evidence/0.3.13-c1/chromium99-f3-results.json)、[行为](../../.tmp/vela-evidence/0.3.13-c1/browser-results.json)、[入口](../../.tmp/vela-evidence/0.3.13-c1/launcher-results.json)
- **B 结构约束关联通过**：Chromium 99 实际 opaque iframe 的 Picker 传统占位 8/17px、Scale 0.62/1/1.18、溢出临界点、首次打开/反向，共 30 段×75帧；F4 每引擎 36 个渲染对照中最终参考/iframe 各 24/24 渐进模糊通过，Chromium 99 v26 源页 12 个失败负对照保留。未改变 Picker owner/自然高度、Registry HTML 测量、Vela 内容裁剪与 haze 分层。[Picker](../../.tmp/vela-evidence/0.3.13-c1/after-iframe-chromium99-scroll-geometry.json)、[Edge blur](../../.tmp/vela-evidence/0.3.13-c1/edge-blur-render.json)、[旧引擎 blur](../../.tmp/vela-evidence/0.3.13-c1/chromium99-blur-render.json)
- **最终全量离线 200/200 PASS，0 FAIL、0 skip**，对最终实现/测试状态执行一次；包含新增 C1 suite。41 模块 Chromium 99 确定性构建及 `--check`、i18n report `--check`、project consistency 通过；生成 i18n 报告未过期，无需改写。没有正式模型资格运行。[全量](../../.tmp/vela-evidence/0.3.13-c1/full-offline.log)、[i18n](../../.tmp/vela-evidence/0.3.13-c1/i18n.log)、[一致性](../../.tmp/vela-evidence/0.3.13-c1/consistency.log)

过程中真实发现过参考 Settings preview 误用 legacy 金色默认的回归（320 Light，Edge 336/Chromium 99 332 个差异像素），已通过上述 v26 默认输入适配修复，未改测试容差。[失败证据](../../.tmp/vela-evidence/0.3.13-c1/edge-reference-default-regression.json) Chromium 99 另有退出按钮顶部圆角 10 像素、最大 1 色阶的间歇差异；保存逐像素位置及失败批次，统一指针状态后仍出现过一次，同代码/同零阈值复测通过。六个未改 B 页面重复渲染未复现，**内部栅格原因未确认，不归因 CEP，也不宣称彻底消除该测试波动**。[逐像素证据](../../.tmp/vela-evidence/0.3.13-c1/chromium99-settings-raster-noise.json)、[失败批次](../../.tmp/vela-evidence/0.3.13-c1/chromium99-second-raster-comparison.json)、[B 重复对照](../../.tmp/vela-evidence/0.3.13-c1/unchanged-b-raster.json)

实际环境为 headless Edge **153.0.4234.32 / ANGLE RTX 3070 D3D11**、Chromium **99.0.4812.0 / ANGLE Vulkan SwiftShader**，Playwright 1.58.2；完整启动参数、版本与后端在 C1 raw 中。软件旧引擎与隔离 iframe 结果不是 AE/CEP、长期性能或 GPU 资格结论。本轮未覆盖真实 AE/CEP、真实 Provider/Host 执行、生产资产迁移；B 的用户批准只作为既有基线，不代替 C1 实机复测。

## 4. 剩余 C 范围与 C/F 验收约束

Appearance 的 gold/interaction/action 派生族、表面/文字/排版，其他 Design Tuning 阴影/尺寸/透明度/motion，以及组件/domain aliases，仍由原入口管理，需后续 C 按角色继续登记、接线、移除旧 writer。`--field-border`、`--border-default/subtle` 目前保留单向名称 alias；生产消费者仍为 CoreUI、Registry、Settings、Home/Palette/Vela 的既有 CSS，本包只改变三项上游来源。

后续 C 迁入其他角色时必须保留显式覆盖身份、分层 preview、保存失败与延后投影反例，并选择相应生产默认配置；D 才收敛交互生命周期。0.3.14 各页迁到共享平台后，按实际消费者替换/删除旧 alias、参考名称适配及余下 legacy writer；不能只改名就删除兼容入口。组件局部几何、SVG/canvas 坐标和编辑进度继续由组件持有。新增共享模块不依赖 reference、fixture、Site 或测试，参考适配与测试 fixture 也不成为生产数据 owner。

后续 C/F 验收必须继续保留**生产侧分层 preview 取消、分组 reset 的实机未确认项**；现有自动验证通过不升级为用户实机证据。本次 separator 代表路径的有界收口不等于三个属性全部组合逐项实测，也不豁免后续相关验收。

## 5. 原用户实机交接步骤与恢复（历史记录）

以下保留原实施轮交接步骤与当时待验收状态，不表示用户已逐项执行或完成配置恢复；当前结论以顶部及第 6 节为准。

真实 AE/CEP 由用户执行，无需开放调试入口。先保存现有草稿，记录当前 accent 和三个 border 校准的**值及是否有显式覆盖**；可使用现有 evidence 查看/复制。仅在可恢复的设置上测试，不清空 localStorage。

1. 用户自行重载已保存的面板，使用普通生产 **Settings → Appearance / Developer → Design Tuning**。本轮缓存标识为 `20260919-style-resolution-c1`，VERSION 仍 0.3.12。将面板边框校准为易区分颜色，再改变 accent、预览另一个 separator；面板边框应保持显式校准，未覆盖项随 accent 变化，取消 separator 应回到它原先所属层的值。交换这两步的顺序，应得到相同最终外观。
2. 对一个已记录的测试 border 做单项重置，再测试 border 分组重置：应立即回到当前主题派生颜色，没有先变金色再跳回；切页返回应稳定。测试结束后恢复原 accent；原来有覆盖的项恢复记录值，原来无覆盖的项保持重置状态。只恢复这三项，勿用“全部重置”代替。出现保存失败提示时保留未保存状态，通过原重试/恢复入口处理，不把可见应用当已保存；无需在实机制造存储故障。
3. 从 **Developer → Design Tuning → UI 参考页** 进入隔离页（独立文件仍为 `client/reference/index.html`）。在一个窄面板及一个非 1 Scale 下切 Dark/Light，查看四页；参考 Settings 中预览边框、模拟保存失败/取消，不应改变生产校准。快速确认共享列/数字操作、Picker、Curve 仅点击播放、Vela 渐进背景与事实内容仍符合 B。退出时按原草稿协商返回，必要时用户保存草稿后重载即可退出临时会话，不清配置或重启 AE。

自动实例、浏览器、server 与订阅通过 finally/实例退出释放；raw、临时包装脚本及依赖留在既有忽略目录，不进入交付。收尾 `git diff --check`、全部变更/新增文件 whitespace、17 个 JS 文件语法及报告链接检查通过，确定性产物 `--check` 通过；最终 git status 为 15 个修改、6 个新增，未暂存。[静态结果](../../.tmp/vela-evidence/0.3.13-c1/final-static-checks.json)、[产物检查](../../.tmp/vela-evidence/0.3.13-c1/build-check.log)。变更仅为共享决议/投影、生产和参考最小接线、三个确定性参考产物、必要缓存标识、测试/构建依赖接线及本报告；未改 Site、Liquid Glass、Host、Runtime、Authority、真实存储 schema、版本或冻结架构。**USER REAL-AE ACCEPTANCE REQUIRED；到此停止，不进入下一工作包。**

## 6. C1 有界用户验收与收口

**C1 TARGETED_ACCEPTED / READY FOR COMMIT / PR，尚待提交和合并。** 用户本轮明确确认：

- 以“分隔边框” `border.separator` 为代表，显式绿色校准在 Accent 改蓝后保持不变；单项重置后立即采用当前主题派生色，随后跟随 Accent 变化；交换 Accent 与显式校准的操作顺序，最终结果一致。
- 参考页与生产配置隔离检查通过。
- 已验收参考页的视觉、控件及交互回归检查通过。

以上以用户反馈为实机证据来源，**不扩写为 panel/input/separator 三个属性全部组合逐项实测**。生产侧分层 preview 取消、分组 reset 仍未明确实机确认，已在第 4 节保留为后续 C/F 验收项；原自动验证仅维持其原证据等级。不补写未提供的宿主版本、性能数据、截图或配置恢复结果。

第 3 节的 200/200、浏览器对照及其他自动结果保持原实施轮执行归属，本轮没有重新构建、运行浏览器或重复全量测试。原写入反例、参考默认值回归修复、原因未确认的间歇栅格差异，以及第 5 节当时待验收记录均保留，不通过本次验收改写历史失败或未确认原因。

本轮仅更新本报告。报告全文 whitespace（含未跟踪内容）、交付范围及最终 git status 检查通过；原有源码、产物、测试和必要新增文件保留，工作树仍为 15 个修改、6 个新增，均未暂存；`.tmp`、临时依赖与 raw 由现有忽略规则排除，不进入提交范围。只收口 C1，不宣布整个 C/0.3.13 完成，不批量关闭正式总账条目；不暂存、提交、推送、创建 PR、合并或开始 C2。
