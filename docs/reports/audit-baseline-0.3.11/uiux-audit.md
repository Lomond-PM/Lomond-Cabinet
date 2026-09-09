# Lomond Cabinet / Vela 0.3.11 — UI/UX 专项审计

基线：`Lomond-PM/Lomond-Cabinet`，`dev` = `b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`。
日期：2026-09-08。只读审计，未修改仓库，未批准新的版本号或路线变更。

## 结论

现有产品需要的是交互正确性与任务呈现闭合，而不是更换视觉风格或重新实现设计系统。
最高优先级：Escape 事件被下拉菜单和外层 Settings 同时消费、Palette 外层关闭绕过 dirty gate、批准前的信息不足。
多步骤完成/部分完成、会话关闭恢复、窄面板关键状态和键盘焦点，应作为 Agent UI Completion 的明确验收对象。

## 方法与证据边界

- 通过 GitHub 连接器读取固定提交的源码、入口 HTML 和 DESIGN_SYSTEM。
- 深入检查 Vela 输入/确认/会话选择/Surface、主程序 Settings 与 Palette 关闭链、CoreUI Select 键盘处理、相关 i18n 和 Vela CSS。
- 执行 10 个 Chromium 局部场景。浏览器、合成 DOM、翻译函数及依赖替身均见 `probes/run-browser-probes.py`。
- `sources/velaComposerView.js` 和 `sources/velaConfirmationView.js` 按连接器返回内容重建，Git blob SHA-1 与远程完全一致；测试前再次断言匹配。不是修改后的近似实现。
- CSS 只载入标明出处的 selector 摘录；Escape 使用两个原处理器摘录，后续关闭函数为计数替身。
- **未运行完整应用 main.js、完整 style.css 级联、真实 Agent/Host，未在原生 CEP/AE、真实 Windows IME、屏幕阅读器上验收。**
- 静态发现、局部复现和产品设计建议分别标注；10 个场景不构成全仓或整个 UI/UX 的 PASS。

## UX-01：Escape 同时关闭下拉菜单与外层 Settings

类型：实现缺陷；建议 P1。

`client/js/ui/coreUi.js` 的 `triggerKeydown` 在 Escape 分支只执行 `preventDefault()` 与 `close(true)`，没有阻止事件传播。
`client/js/main.js` 的 document keydown 处理器不检查 `defaultPrevented`，继续执行 closeRegistryColorPicker、closeVelaSettingsSurface 或 requestCloseSettings。

UXP10 用真实浏览器事件和原处理器摘录复现：menuCloses=1、settingsCloses=1，且 document 收到事件时 defaultPrevented=true。
下游仅使用替身，因此该测试证明事件分派缺陷，不等同于完整 Settings 动画重放。

建议：当前最上层交互消费 Escape；外层尊重消费结果。不要通过所有入口一起 close 形成“看似干净”的结束。
验证：菜单打开/未打开、picker 打开、输入编辑、Palette dirty、多层表面分别只退出合适的一层。

源码锚点：coreUi.js 约 459–492；main.js 约 10268–10274。

## UX-02：Palette 返回受保护，外层关闭却直接丢弃草稿

类型：静态确认的跨模块控制流缺陷；建议 P1；完整 AE 场景未重放。

受保护路径：requestSettingsBack → Palette.requestBack → requestWorkspaceBack → requestTransition（dirty 时展示保存/丢弃/取消）。
另一条路径：document Escape 或 settingsBackdrop → requestCloseSettings → SystemSurfaceRouter.close / closeSettingsPanel → closePaletteWorkspace({reason:'settings-close',animate:false}) → public close → closeWorkspace → resetWorkspaceDomState({discardDraft:true,...})。

SystemSurfaceRouter.close 在回调前就把 active 清空，没有 dirty 协商边界。因而修复时必须在关闭裁定通过后再改变 route，不能先清 route 再弹取消提示。

影响：尚未保存的 Palette 编辑内容可能被外层关闭直接丢弃。这与 AP-01 的“已持久化旧数据回滚风险”不同。
条件：Settings 已打开、非全局过渡中、相关 Escape 未被其他输入控制阻止，或用户点击背景关闭区域。

建议：所有用户主动离开入口走同一 draft 协商；panel-shutdown 的强制清理独立保留，不能让卸载被 UI 确认阻塞。

源码：main.js 9925–9976、9970–10260、10260–10470；system/systemSurfaceRouter.js；proceduralPaletteWorkspace.js 450–590、684–710、770–850、1400–1485。

## UX-03：确认信息不能支持充分审阅

类型：已实现呈现的功能缺口；建议 P1（知情批准），不是 Authority 绕过。

ConfirmationView 只输出 Opacity before→proposed 或 Layer name before→proposed；没有合成/目标图层/步骤范围呈现。
summary 是普通 span，没有 title、tabindex 或展开入口，CSS 明确使用单行 ellipsis。

UXP03：即使合成测试额外提供目标展示字段，摘要仍只有 `Opacity 100% → 63%`。
UXP04：240px 合成 action row 中，长名字摘要 clientWidth=117、scrollWidth=1007，ellipsis 生效，没有 title，也不可独立聚焦。
宽度数值只适用于夹具，不是实机布局量测。

建议：以可换行/可展开的本地 Review 说明区域承载目标、变化、步骤范围；操作行只放明确动作。目标身份来自本地受控 review 投影，不由模型文字或 UI 自选目标形成 Authority。
必须继续保留 fresh Preflight；显示目标不等于长期锁死 AE binding。

源码：velaConfirmationView.js；velaSurface.css `.vela-confirmation-summary`、`.vela-action-slot`。

## UX-04：多步骤任务缺少对应的完整结果呈现

类型：产品完成度缺口，并伴随旧文案专用化；建议 P2，在 0.3.x 产品退出前闭合。

Surface 的来源主要是 provider/confirmation 的压缩状态；非 terminal Driver 阶段在 source port 中归并为 pending。
Confirmation/Presentation 模块没有面向完整 logical plan 的步骤清单/部分完成摘要。已存在的 `surfaceStatusExecuting`、`surfaceExecutionCompleted` 等文案仍指向 opacity；applyConfirmation 对 execution-completed 选择固定完成 key。

不把这些静态事实扩大成“所有重命名任务实机一定显示不透明度成功”：不同生产终态路由会影响具体可见文案，本轮没有运行完整 Runtime。

建议：增加非权威 TaskPresentation，区分目标、当前步骤、已验证完成、被拒绝、未执行、验证不可用和取消后的已有结果。
不能让模型补写完成事实；不能将 `cancelled` 解释成回滚；不能把 reasoning 当执行日志。

源码：velaConversationOwnership.js providerState；velaSurfaceController.js actionState/projectedStatusText；velaPresentationModel.js apply/applyConfirmation；i18n.js 300–350。

## UX-05：窄模式牺牲的是主要状态而非次要说明

类型：CSS/交互优先级问题；建议 P2。

narrow 下 `.vela-status-text` 被压成 1px 并 clip；只有 data-detail-empty=true 才恢复。小字说明非空时保留说明而隐藏任务状态。
UXP01 复现主要状态变成 1px，实验说明可见；UXP02 验证空说明时恢复。
aria-label 仍有信息，不能说信息从可访问树完全丢失；问题是视觉用户难以获取。

建议：保持“窄模式保留一段可读文本”的既定要求，但由单个最终 display projection 选择优先级。任务阻塞、待批准、执行、部分完成优先于静态实验说明。
不要改变共享 StatusToneContract 的所有权，不以彩色圆点替代可读文字。

源码：velaSurface.js refreshLocale；velaSurfaceController.js synchronizeStatusAccessibility；velaSurface.css narrow selectors。

## UX-06：会话 Close 是销毁，却没有按内容保护或恢复

类型：UX 安全性/产品选择；建议 P2。不是违背 0.3.11 in-memory 语义的架构缺陷。

ConversationSwitcher 保护了 active record 和最后一个 record；对普通 record，closeRecord 直接 dispose 并删除 metadata/draft。
会话仅以序号显示；单独的关闭按钮不区分空会话、有草稿或有历史。

建议：空会话直接关闭；含草稿/历史的会话采用确认或有界恢复方案之一，并说明当前内容不会跨面板重启保留。
恢复方案不得复活 Runtime、旧授权、旧 Review command；如恢复只读 transcript/draft，应在新建会话所有权下明确它们没有执行能力。

源码：velaConversationSwitcher.js；main.js unbindVelaConversationSurface。

## UX-07：键盘操作缺少状态变换后的焦点连续性

类型：按钮焦点问题局部复现；模态焦点为待整体验证项；建议 P2。

UXP09：聚焦 Send 后执行 render('cancel',...)，原按钮被隐藏，浏览器 activeElement 落回 BODY，而不是 Cancel 或 Composer。
UXP05 Ctrl+Enter 不发送；UXP06 聚焦 Send 后 Enter 正常发送。因此不能称“完全不支持键盘”，也不应把 Enter 换行当成 IME 错误。

Vela 设置的代码有打开时聚焦 Close、关闭后 returnFocus；已读开放/关闭链未见完整 Tab containment 和背景焦点隔离。此项尚未做完整 UI Tab/Shift+Tab 测试，不宣称已经证实背景操作可被触发。

建议：只有当前焦点因自身操作消失时，合理交接至新的动作或稳定输入区；不要因每个异步状态更新而抢焦点。明确键盘发送契约，保留多行和 IME 输入。模态需验证 portal Select/ColorPicker 归属，不可用粗暴 Tab trap 截断弹出控件。

源码：velaComposerView.js；main.js ensure/open/closeVelaSettingsSurface。

## UX-08：Provider 配置与“是否能起草”绑定过紧

类型：产品设计建议；建议 P3。

UXP07 证实 experimentalEnabled=false 时 composer.disabled=true 且 readOnly=true。
UXP08 正向对照：另一会话活动时，当前启用会话仍可起草，仅 Send disabled。这部分设计应保留。

建议：草稿编辑与发送资格分离；允许先写目标，发送处显示连接/启用等清晰前置条件。
启用 Provider、授权某个修改任务、批准某一步，是三个不同概念，不应通过一个模糊按钮混合。
不改变非持久授权和手动 opt-in 边界，不把缺省未认证模型静默设为 ready。

源码：velaComposerView.js；main.js renderVelaSettingsContent；i18n.js settings.vela 系列。

## UX-09：新增会话控件与已有组件交互体系存在分叉

类型：共享组件收敛建议；建议 P3，不作为 0.3.11 封存失败。

ConversationSwitcher 直接建立原生 select 和按钮；Settings 使用增强 portal select。外观一致性之外，还应检查关闭层级、焦点、禁用原因和长选项文本行为。
不能仅凭“没有调用 CoreUI 工厂”断言违规或漏洞：Vela 有专用职责，原生控件也有自身键盘行为。应明确它是批准的 native boundary，还是需要迁回共同控件契约。
不建立万能 Renderer；保留各 domain composition 和 ownership。

## 不建议在本轮顺手做的事

- 不更换黑金视觉风格、Home 程序化图标、既有 Surface morph 与 Settings IA。
- 不把 Vela 拆成与 Home 无关的第二个产品；维持 Home 顶部对话区域和独立设置槽。
- 不引入并行 objective，不解除串行门禁以让按钮“更好用”。
- 不将 Provider reasoning 当运行事实，不让 UI 描述成为执行授权。
- 不为会话恢复而保存/复活旧 Authority，不因“完成 UI”提前承诺持久历史。

## 建议验收组合

| 用户旅程 | 必须能判定的结果 |
|---|---|
| 首次启动 → 起草 → 连接 → 启用 | 用户知道为何不能发；草稿不会因设置流程无故丢失 |
| 一个简单修改 → Review | 目标、前后值、批准范围完整可读 |
| 两步任务 → 第一步成功 → 第二步拒绝/失败 | 已有变化明确；拒绝/取消不暗示全局回滚 |
| Palette 编辑 → Select Escape → 外层 Escape/背景关闭 | 一次只退出合适一层；dirty gate 在主动离开时一致 |
| 两个会话切换 → 关闭含草稿会话 | 活动任务隔离保留；关闭语义与恢复边界可解释 |
| 窄/短面板 × 两种语言 × 缩放边界 | 关键状态和确认内容不被单纯隐藏/截断代替 |
| 全键盘流程 + IME + 弹出控件 | 焦点连续、无误发送、无背景误操作 |

这是验收建议，不是以上所有场景已经 PASS。
