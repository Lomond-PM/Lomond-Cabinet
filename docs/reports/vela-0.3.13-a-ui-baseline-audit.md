# 0.3.13-A — Production UI & UI Lab Baseline Audit

日期：2026-09-17。结论：**A 的可达范围审计完成，可启动有界的 B 参考页工作；完整生产视觉、真实 CEP 和 Runtime 状态验收仍有缺口。** 本报告不关闭关联条目，不宣布 0.3.13 完成，不进入 B 实施。

## 1. 实际基线与证据等级

- 生产工作树：`audit/ui-platform-baseline-0.3.13-a`，初始干净；HEAD / dev / 本轮核对的 origin/dev 为 `8cda7a0dfacb1dca0bd25bcd2c39e2ca1904ddfc`。main / `v0.3.12` 为 `d545d5aba0e62510a81e09059309f99da81d0da3`；`git diff --stat v0.3.12 HEAD` 为空，merge SHA 不同没有形成产品内容差异。198/198 是 0.3.12 封存历史结果，本轮未重跑。
- UI Lab：Sites 返回 **Lomond UI Lab v21**，更新于 `2026-09-16T12:26:09Z`，源码 `87127b95f84ab60aff4329e9a2006f23d4b988e5`；对应 deployment `appgdep_6aaa8ab15164819187946021ae7b0a8e` 为 succeeded。完整标识在 [访问与版本记录][access]。没有使用 Capability Coverage Dashboard、9 月 13 日 Library 文本投影或旧本地 checkout `1d714f6` 代替它；没有修改、发布或冻结 Site。
- 按 Sites 技能取得当前版本源码，临时 clone detached 到 v21，只读其受控文件。Sites 安装/构建包装器遇到 npm 启动路径错误，改用临时目录中的 `npm ci --ignore-scripts` 与 `node scripts/build.mjs`，构建成功。使用实际 Worker、实际 dist 模块及其 migration 建立内存 SQLite；未调用真实 Site 资产 API，未复制 Site 用户资产。
- **线上可见结果未覆盖**：[线上入口](https://lomond-ui-lab.yujiankai120.chatgpt.site) 的授权 HTTP 读取返回 Cloudflare 403；CUA inventory 失败、内置浏览器超时，Windows Browser 观察又被 URL 识别策略停止，均未绕过。以下 Lab 截图证明的是 v21 源码的本地运行结果，不是线上部署截图。
- **真实 CEP 页面未覆盖**：前段发现 AE 未运行；收尾发现 AE 2026 进程于 10:36 启动，文件版本 **26.3 / CEPHtmlEngine 12.0.1**。当前 CEP 进程参数没有匹配本扩展，`.debug` 指定的 `127.0.0.1:8088/json` 仍拒绝连接；不能据此声称 Lomond 已加载。见 [宿主发现记录][cep]。未启动/重启 AE、打开工程、打开或重载用户面板。
- **本轮运行等级**：隔离 headless Edge **153.0.4234.32**，全新浏览器上下文、loopback 服务、内存资产库；非 loopback 网络统一阻断。生产观察加载仓库 `client/index.html` 和实际 `.tool.jsx` schema，CEP bridge 仅返回固定的 bootstrap/schema/no-comp 读 fixture，其他请求拒绝且不 eval；没有 Provider 请求、批准、Host mutation。截图中的 unavailable、无合成、Lab 3 layers selected 都不是实际 AE 资产事实。

已读 AGENTS、PROJECT_STATE、VELA_ROADMAP、KNOWN_ISSUES，指导书的重构边界、视觉平台、0.3.13/14 与关联 ID；定向追溯 0.3.12 E 资产/退出报告。代码重点覆盖 index/manifest、main 的初始化/Settings/Registry/Palette/路由/终结路径、CoreUI、Appearance/Design Tuning、Palette 与程序化展示链、Vela Surface/Views/Composition 边界；Lab 覆盖 app/tool views、Palette/Curve/store/model/focus/assets、lifecycle、picker/tool motion、recipe、glass 与对应 contract。未重新遍历封存历史材料。

全量已加载 CSS 经 CSSOM 枚举：`style.css` 728 条叶规则、5895 项展开声明；`velaSurface.css` 75 条、820 项，含媒体条件。另有 client JS 214 行显式 style 写入位置清单。**枚举不是每条规则、每个状态的人工验收**；动态参数写入另追 resolver/registry。raw 位于 [contract observations][contracts] 和 [写入清单][writers]。

## 2. 已认可方向与四类整页差距

沿用 Lab v21 的基础方向：平静的 Dark/Light 表面、克制的容器分隔、标题/字段/辅助文案分工、有限主操作强调、紧凑工具面板，以及 Palette/Curve 的库—编辑器—局部弹层关系。它们是已认可方向的**可运行参考**；本轮没有重新批准每项新增组件或数值。稳定候选、业务演示和材质实验必须分开。

| 完整页面 | 本轮实际观察 | 仍缺什么 / B 应消费什么 |
|---|---|---|
| 复杂 Registry | 生产 Ad Component Kit 实际 schema/renderer，状态卡、条件字段、选项卡、底部动作；420 英文、720 中文。Lab `dist/tool-views.js` 的 Kit 只有简化组件选择、spacing 和示意 | Lab 没有等价复杂 schema 页；B 用现有 `ecommerceLayout` schema 的真实字段、长说明、状态/disabled/错误/动作优先级，Host 状态明确标 fixture。不能用三按钮 specimen 代表整页 |
| Global Settings | 生产 General、Appearance、Advanced、Developer/Design Tuning；实际 owner 为 `main.js:renderSettingsContent`，不是 SettingsSchema 的过渡分类 | Lab 只有 theme / default colors / motion 的设置弹层，没有完整 Appearance/Developer 页。B 补真实分类、长内容、保存失败、预览与 dirty leave；不得借此迁移存储 |
| Vela | Lab review/executing/blocked/failed 页面及生命周期源码；生产仅 idle/未启用整页、实际 Transcript/Composer 隔离实例及 Review 契约测试 | Lab 的 blocked/部分应用是模拟；真实生产待批准、执行、部分完成、失败整页本轮未取得。B 必须用实际 Runtime 投影形状与现有 View/port 验证映射，离线 fixture 显式标识；当前步 Review、原目标 Verify 和已完成事实不能被 Lab 多层示意替代 |
| Palette（附 Curve） | 生产 Palette 工作区与中文内容；Lab Palette 编辑、Color Picker、Curve 完整库/编辑器，320/420/720 与短高度 | 两边资产模型并不相同；Lab 只有英文，没有生产 UI Scale。生产搜索未找到完整 Curve Library，仅有 cubicBezier 控件/调校能力。B 需在 Palette 参考页带 Curve 密集编辑的共享控件要求，不顺手新增 AE 曲线执行能力 |

代表矩阵为 Lab 320×440、420×560、720×560，Dark/Light；Curve 720/320 Light，Palette 420 Dark。生产 420×640 默认 scale .92，320×460 scale 1.18，720×640 scale .62/.92，真实 en/zh-CN。生产没有 Lab 式成套 Dark/Light 开关：`AppearanceResolver.DESIGN_DEFAULTS` 为暗色基础加逐项覆盖，改变 canvas 不等于 Light 全套。未伪造生产 Light 主题补齐矩阵；完整主题/缩放/中文组合属于 B/F 与 0.3.14 的未覆盖项。

代表证据：[生产 Registry][shot-registry]、[生产 Design Tuning][shot-settings]、[Lab Palette Picker][shot-picker]、[Lab 窄 Curve 编辑][shot-curve]、[Lab 窄 Review][shot-review]。共30张截图及页面文本/脚本/样式列表保留在本工作包 raw；详见 [生产观察][production]、[Lab页面观察][lab-pages]、[Lab编辑/动效观察][lab-detail]、[复现探针][probe]。不把截图当成源码或执行证据。

## 3. 真实样式决议与可复用边界

加载链为 `CSXS/manifest.xml → client/index.html → css/style.css + css/velaSurface.css → js/ui/*、Appearance/DesignTuning、业务模块、main.js → velaCepModuleLoader`。CEP Extensions junction 指向本仓库；真实运行面板的 cache/module 身份仍未知。隔离页记录了实际加载 URL；其中 query 后缀仍为 `20260907-vela-0.3.11-a5`，这只是缓存标识，不据此判定生产加载了旧版本。

| 决议 / 写入者 | 当前实际链与消费者 | 重建建议 |
|---|---|---|
| CSS canonical / alias | `style.css :root` 定义语义及 domain alias；Settings label weight 800 对通用 650，Registry 600；Registry card inset 30×scale 对通用 12×scale；Vela正文使用 supporting size。名称统一没有消除领域语义偏移 | B 用整页确认字体/密度角色；C 统一语义定义，领域差异必须显式说明，不能以旧 alias 为保留目标 |
| Appearance | `appearance/appearanceResolver.js:resolveAndApply`：theme/design → baseInputs → saved overrides → previewOverrides → root inline CSS；main 的设置镜像回到 owner，再供 CoreUI、Settings、Registry、Home/Vela 使用 | 保留受验证参数与 accepted/applied/persisted 语义，替换最终投影；main 的 fallback 仅在 owner 不可用时写，不误报为始终同时运行 |
| Design Tuning | `designTuningResolver.js:applyProjection`：transient > saved；无 override 时 removeProperty；canonical 初次采集，投影可被 isProjectionSafe 延后。与 Appearance 对 border 等共同写入 | **已复现最后写入胜出**，需 C 单一决议/唯一最终写入者；B 先明确优先级、预览和重置含义，不新增第三套 writer |
| 程序化与 Palette | `palette/paletteStore.js` 持有生产 v2 数据；Workspace draft → Save；`proceduralAppearance`/`proceduralThemeMap`/Icons/Background 负责源与展示，Classic BackgroundEngine 独立 fallback | 共享平台拥有控制与投影，源身份、用户数据、映射仍归原业务 owner。不得 theme/scale 切换重建源身份，Palette 编辑不得暗中改 Appearance accent/canvas |
| Motion | 生产 `ui/motionDefaults.js` + Design Tuning duration/curve resolver；Workspace 仍调用注入 `duration(normal/fast)`；`main.js:closeRegistryColorPicker` 直接清理移除 | B 区分页面 morph 与 Palette Popover；C/D 收敛既有来源，不将 Lab 的演示时钟做新 authority，也不本轮调整动画 |

Lab 可提取候选是 `color-model`、`palette-model`、`curve-model/presets` 的纯数据/采样/验证函数，`view-focus` 的稳定身份与 selection 恢复方法，`color-picker` 的 draft/Apply/Cancel 与中断终结语义，`tool-spring` / `asset-runtime:motionTrack,stepMotion` 的曲线快照机制。**先适配生产契约后复用，不能原样搬整个 app。** `palette-gradient-contract.md` 明示没有参考旧插件模型；其 gradient 独立 color/opacity stops、Curve Hold/多点模型超出旧 Palette/4点 Bézier 能力，不能做无损等价迁移的假设。

必须重建生产适配的是 `app/tool-views` 页面宿主、overlay/route/focus owner、Settings IA、i18n/scale、资产 persistence adapter 和 Runtime 投影接线。Lab `palette-store/curve-store` 的 D1 revision/CAS、450ms debounce、409 草稿保护有参考价值，但 `asset-runtime:initAssets` 的全局订阅与 store 生命周期不能直接变成 CEP 面板级可反复 mount/dispose 的单例。Lab private Site 资产和 local 演示设置不得当作生产用户资产。

## 4. 发现、证据与归属（均不关闭）

类型：**观察缺陷**表示本轮真实模块的隔离运行已复现；**设计选择**不是已确诊安全缺陷；**源码风险**尚未运行复现；**未覆盖**不能视作通过。

| ID / 类型 | 具体证据与结论 | 归属 / 对 B 的影响 |
|---|---|---|
| V-05 / 观察缺陷 | `appearanceResolver.js:142–173` 与 `designTuningResolver.js:43–54`；probe 将 border.panel 设为 rgba(18,52,86,.73)，Appearance accent 变化后变为 rgba(240,128,64,.22)，原校准仍在；无关 separator transient 又使它恢复。reset 会暂落回静态金色，下一次 Appearance.resolve 再改变。见 `production-observations.probes.styleWriters` | C 修决议与 reset；**B 必须先明确 owner/优先级契约**，无需先修整个 legacy 平台 |
| AP-05 / 观察缺陷（迁移债务） | `main.js:linkPersistedRange,setupMotionSpeed`；3 次 input、没有 change/pointerup，隔离 storage 已产生 3 次 settings 写入（1.1/1.15/1.2），见 `contract-observations.probes.inputPersistence` | D 定义 preview/commit/cancel，0.3.14 迁消费者；不把每个 input 的持久化当共享默认 |
| AP-06 / 观察缺陷 | `ui/coreUi.js:bindResizeGrip` 返回的 cleanup 未结束内部活动手势；实际 textarea 拖至120px后 `_coreDispose()`，继续 move 仍变160px。见 `production-observations.probes.resizeDispose` | D；B 参考实例必须可靠终结活动交互，不能复制此 factory 的生命周期 |
| A10 / 观察缺陷 | `velaTranscriptView.js:restoreScroll,renderWithTransient`；用户 scrollTop80，只有下方最后一行变长，重建 snapshot 后 top240、scrollHeight460→620。见 `probes.transcript`。现有28断言通过，但其上方扩展用例没有覆盖此反例 | D scroll anchor，E 消费；B 长内容参考必须保留阅读锚点 |
| UX-05 / 观察缺陷 | `velaSurface.js:measureLayoutMode` + `velaSurface.css:416`；320×460/1.18 时 primary status 实测1×1且 clip=0，保留实验说明；并非按信息重要性裁剪。见 `contract-observations.probes.narrowVela` | E；B 窄页必须仍可读关键任务状态 |
| AP-07 / 源码风险 | `velaSurfaceController.js:190–205 synchronize` 会用 authority/other conversation/stopping 覆盖 statusText，tone 仍来自 projection.tone；本轮未制造跨会话运行状态，未确认每个组合实际错色 | E 联合状态投影；B 使用真实投影形状避免加重分叉 |
| UX-06 / 设计选择 | `velaConversationSwitcher.js:closeRecord` 保护 active/last，但非活动非空会话直接 select→disposeRecord→metadata.delete，没有草稿/历史 leave negotiation | E 实现并验证既定产品目标：非空会话关闭确认；不能误改 Conversation/Session/Driver 所有权 |
| UX-07 / 源码风险 + 部分检查通过 | `main.js:10309` 用固定 picker→select→VelaSettings→Settings 的 Escape 顺序；CoreUI 另持有 portal/outside/焦点；`velaConfirmationView:render` 隐藏旧操作未提供统一焦点交接。Shared Select 契约测通过，Lab picker Escape 实测回到锚点、资产不变；不能推导整个生产 overlay 栈/模态连续性通过 | D/E；B 明确最上层 Escape、outside、focus return、异步更新不抢焦点 |
| UX-08 / 设计选择、已观察 | `velaComposerView.js:render` 将输入 disabled 绑定 enabled；实际模块 enabled=false 后 textarea.disabled=true，草稿资格与启用资格绑定 | E 实现并验证既定产品目标：起草不依赖 Provider 启用；B 标清起草/发送/执行三种资格 |
| UX-09 / 设计选择、键盘缺口已观察 | 生产 `velaComposerView` 只绑定 input/click，Ctrl+Enter probe sends=0；Lab `app.js` 是 Enter 发送（跳过 composing/Shift），二者都不能直接充当“Enter 换行、Ctrl/Cmd+Enter 发送”契约；Conversation 原生 select 与 CoreUI 路径仍分叉 | E 实现并验证既定键盘契约：Enter 换行、Ctrl/Cmd+Enter 发送并保护 IME；真实 IME/Cmd、读屏焦点未覆盖，B 保留必测项 |
| V-01～04 / 设计选择；V-04另有观察缺陷 | `style.css :root` 的大标题800/正文12×scale/辅助10.5×scale、Registry大 inset 和多层表面、蓝色 thumb/utility/floating 阴影与金色强调竞争，见 Registry/Settings 截图；320/1.18 Settings 返回按钮与 title rect 横向重叠3.5px，见 `probes.narrowHeader` | B 定整页比例/角色/操作权重；C token，0.3.14页面迁移。没有以“旧数值不够小/大”直接决定新 token |
| V-06～07 / 设计选择 + 未覆盖 | Lab `tool-views.js`/`asset-settings.js` 缺复杂 Registry/Global Settings；`lifecycle.js` 只有模拟任务；已有共享组件不等于四类生产页齐备 | **阻止 B 直接验收/扩散**；B 必须补齐并人工确认，不能只交Home或按钮截图 |
| G-11 / 未覆盖 | Lab 曲线压力模型检查（500条×128点/100 pointer events）及 teardown 测通过；没有真实 CEP 长时运行、heap趋势、GPU/帧预算或长期 listener/frame 计量 | D/F 分层资源测量；AP-06是具体反例，不代表其他模块都泄漏 |
| COV-01 / 部分覆盖 | 两张实际 CSS 全量枚举、写入清单、main/CoreUI 重点路径与代表页面；所有工具、所有配置/异常/交互组合及真实CEP尚未覆盖 | B/F补参考与真实模块覆盖，0.3.14补全产品页；不关闭 |
| COV-02 / 部分覆盖 | Appearance/校准的真实模块切换与 Palette 页面；生产 assets/exit 190断言通过。没有运行真实持久化故障、所有程序化模式/theme映射/源缓存/DPR组合 | C/F与0.3.14程序化迁移；内存库成功不能替代真实用户数据验收 |

额外生命周期风险：生产旧 picker 的 `main.js:beginDrag` 把 mousemove/up 绑定到 document，`cleanup` 未结束活动内层 drag，也未覆盖 blur/capture terminal；本轮仅源码确认，不追加“已复现”。相反 `velaResizeController` 明确在 pointercancel/lostcapture/blur/suspend/dispose 调 endDrag；保留已移动高度属于其现有终结选择，不能简单改为所有 cancel 都回滚。

## 5. 交互、资产与执行边界

生产 `system/systemSurfaceRouter` 先等待 beforeLeave settle 才改 route；`main.js:requestSettingsLeave` 先协商 Palette，再检查 Appearance/Design Tuning 保存失败。`proceduralPaletteWorkspace:requestTransition/saveCurrent` 要求 persisted；v2 `palette/paletteStore` 区分内置覆盖、custom、hide、tool mappings，preview 不写 Store。资产读失败/写失败/退出协商的190断言本轮通过，属于离线模块证据；0.3.12 已建立的保护必须作为新平台约束保留。

Appearance/Design Tuning 的 accepted、applied、persisted 不等价：base 设置可由 Settings 承担持久化，Design Tuning 可暂缓投影。新 UI 的“已保存”不得仅看 control change、动画结束或 accepted。Lab Store CAS 与 picker draft 保留是可借鉴机制，D1 GET 的初始化/升级与写入语义必须经新的生产 adapter 审核，不能直接接真实用户库。

生产 `velaSurfaceController:subscribeSource/synchronize`、`velaConfirmationView:render` 消费本地投影，批准命令捕获 Review 身份/revision；当前步、原目标、before/proposed、部分完成事实属于 Runtime/Confirmation/Verify 的可信链。Lab `lifecycle.js:executionAt/presentation/LifecyclePlayer.tick` 按时间产生 applied count、状态与 demo 批准，仅可作为 fixture。不得把它接成生产 Review/Execution/Completed，也不得让动画或原始 reasoning 成为 Authority/Preflight/Host/Verify 的输入。Conversation、Session、Driver 的 owner 保持独立于 UI dispose。

Palette Popover 的 Lab `color-picker.js` 开/闭从实际 presence/velocity 接续；close 先 abort interaction、断 observer/采样、设 inert，再完成 visual exit。普通路径使用 `activeMotion→motionTrack/stepMotion` 的曲线/时长快照；无资产 fallback 用 `tool-spring`，reduced-motion 改为短淡入淡出。Lab 自带检查覆盖重开、pointer terminal、resize、取消/并发/异步采样晚到；本轮浏览器只直接观察打开、Escape取消、焦点恢复与资产未变。

`motion-recipe.html/recipe-motion.js` 是独立控制实验：GSAP3.13.0 只作时钟，曲线来自同一 asset runtime；reverse 反向当前段、interrupt 从当前位置/速度重定向，generation 防晚回调，reduce直达端点，destroy杀时钟。实际页面 open→reverse→interrupt 与 reduce 观察、原模块 contract 测均完成；没有修改参数或宣称生产 picker 已具备同样能力。真实采色、所有快速开闭组合、跨窗口焦点/IME仍未覆盖。

## 6. CEP 迁移与 Liquid Glass

本轮在现代 Edge 运行了最终本地构建产物；manifest 的 CSXS7/AE13～99.9 范围不能当作现代 CSS/API 支持声明。当前安装 CEP12.0.1；[Adobe CEP12 文档](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md) 给出 Chromium99，而 Lab 的 `@container` / `:has()` 自 Chromium105 才提供，存在明确兼容差异。[Chrome 官方说明](https://developer.chrome.com/blog/has-with-cq-m105)

- Lab `styles.css/palette.css/curve.css` 的容器断点和 `:has` 必须提供容器测量/class 或等价布局 fallback；不支持时不能靠 optical 保持布局。
- `color-picker/tool-launcher/view-focus` 使用 ResizeObserver、AbortController+listener signal、inert、requestSubmit、clipboard/EyeDropper、现代选择器/API；逐项测功能与清理，inert等提供焦点/事件替代，原生采色保留可用的手工输入。ESM/JS 打包及目标语法审计不能解决 CSS、焦点、DOM、compositor 问题。
- Lab Worker/D1/server 构建不是 CEP 浏览器产物；需独立打包与存储/资源URL适配。真实中英文、DPI、缩放、短高、字体回退、GPU滤镜/滚动成本仍须在最终 CEP 产物上验证。依赖清单见 [Lab 浏览器依赖][dependencies]；它是扫描结果，不是 compatibility PASS。

Liquid Glass 单列：`glass-model/glass-optics/glass-specimens/liquid-glass` 把 CSS Surface 与 SDF/SVG displacement Optical 分开；前景内容由 DOM 持有。gate 检查 CSS/filter、SVG raster、budget/decode，未获资格 CEP 走 Surface，forced-colors/reduce-transparency 走 Solid；语法及 raster 探针不证明 live backdrop compositor 正确。浏览器 [Surface only 截图][shot-glass] 仍有完整内容和控件，当前未观察到基础页面依赖 Optical 才可读。

v21 的 `GLASS_BUDGET={pixels:393216,mapMs:180}` 是预算常量，不是本轮性能实测结果。当前 displacementGain=1；`displacementSafety` 是保留诊断，不能据它宣布实际场无折叠。最新实验记录撤回过弱的全局衰减/最终 blur，保留四相采样及 sidebar高密度；本轮模型测试通过但 raster mocked，光学折叠/锯齿质量、实际CEP效果/GPU性能**未验收**。这些缺口不阻塞非玻璃 B/C/D；若未来基础排版依赖 Optical，则另报基础平台缺陷。

## 7. 后续替代、最小 B 与停止点

| 旧入口与消费者 | 替代方向 / 持续保留的业务 owner | 退出时点 |
|---|---|---|
| `main.js` Registry renderer、CoreUI factories、`style.css` domain alias | 声明式共享控件/布局/单投影；tool schema 仍持有字段数据与动作 | C/D建平台；0.3.14-A迁移，E确认无消费者后删旧工厂/alias |
| main Settings 与 Appearance/DesignTuning双写 | App级Settings参考IA；单语义决议、预览/保存反馈；各Store继续持有数据 | C建立替代、0.3.14-B迁移、E删旧写入；不清配置 |
| `proceduralPaletteWorkspace`、main旧picker；Lab Palette/Curve视图 | 共享编辑/gesture/overlay/focus；生产Palette v2持久化和程序化源语义保留，Curve另做适配设计 | D平台、0.3.14-B/D迁移，E退出旧DOM/事件；本版不扩Host |
| Vela Surface/Views/Conversation控件与Home入口 | 消费同一Runtime投影的新参考视图，独立共享交互owner | E落实基础交互；0.3.14-C迁页、E删旧路径，Authority等不随UI删除 |
| Lab生命周期/recipe/glass | 生命周期永为fixture；motion可适配；glass独立可降级实验 | 不作为生产旧路径迁入；不设玻璃前置门 |

**B 最小交付：一个本地可运行参考壳、四类完整参考页、短的视觉/交互契约与状态矩阵。** 沿用 v21 方向；Registry接真实复杂schema，Settings含Appearance/Developer，Vela涵盖待批准/执行/部分完成/失败且有真实投影适配契约，Palette含完整编辑与Curve共享控件需求。使用明确标注的无副作用fixture，禁接真实批准/Host写入；不能用重画静态替代页证明生产状态已存在。B 可以为参考所需实现最小公共模块，不能再独立制造另一套配置、motion或执行authority。

进入 B 前已具备：可核对的最新 Lab 源码、可运行参考与生产真实模块、具体样式/交互反例和替代清单。**不能省略的 B 约束**是四页真实内容/状态对应、语义owner/优先级、资产/退出/可信链保护、CEP容器/API回退；这些未落实就不能宣布 B 验收或开始批量扩散。现有AP-05/06、A10等实现修复可归C/D/E，全面消费者迁移归0.3.14，无需在A追加legacy修复。

B 验收应在320/420/720、短高、Dark/Light、实际scale与中英文代表组合中确认完整层级/主操作/长内容；用实际参考模块测最上层Escape、outside/focus、dirty leave先于route/dispose、gesture终结、异步锚点、preview/commit/cancel、键盘/IME、motion中断和清理。非空会话关闭确认、起草不依赖 Provider 启用，以及 Enter 换行、Ctrl/Cmd+Enter 发送并保护 IME，均为既定产品目标，后续只做实现与验证，不重新开启产品决策。

**0.3.13/0.3.14 的真实 AE/CEP 实机测试由用户执行，最终须人工整页批准。** B 交付可加载产物、最小测试步骤与预期结果；Codex 完成离线及隔离浏览器验证后，标记 **USER REAL-AE ACCEPTANCE REQUIRED**，将真实 CEP 入口身份、布局、交互及 IME 等实机项目交由用户验证。用户验收前保留相应 NOT COVERED，不声称 CEP 验收完成；不以用户开放可读观察入口供 Codex 自动验证作为默认必要操作。本轮真实 CEP 未覆盖的历史事实保持不变。

B 达到上述范围后停止并回报，未通过列缺口；不自动进入 C。本轮已在 A 停止。

## 8. 本轮检查与清理

- Lab v21 `npm run check`：**8/8脚本通过**（颜色/Palette/lifecycle/tool motion/Curve/UI audit/recipe/glass），见 [Lab日志][lab-checks]；含模型、DOM与SQLite fixture，不是实机资格。
- 生产 focused：system-surface-router 9断言、shared-select-lifecycle、user-assets-exit-safety 190断言、readable-review 78断言、transcript-scroll 28断言，**5/5脚本通过**；`check-project-consistency.js` 通过且含现有生成i18n报告freshness。见 [focused日志][checks]。这些PASS不抵消本轮新probe复现的未覆盖反例。
- 四次隔离观察 raw 均无 pageerror、无外网请求；所有浏览器/context、loopback server、内存DB已关闭，临时View已dispose/remove，活动mouse手势已终结；只保留复现探针、版本源码和必要raw。未改生产/测试/Site受控源码或真实配置、Palette/Curve、AE资产。
- 交付仅本报告；证据在忽略目录 `.tmp/vela-evidence/0.3.13-a/`，不会随报告自动入Git。未运行全量离线回归/正式模型资格，未暂存、提交、推送、PR、合并、tag。
- 最终 `git diff --check` 与报告未跟踪内容的独立 whitespace 检查通过；最终 `git status -sb` 仅此报告为新增，Lab受控源码仍干净。两处临时 node_modules 的删除被自动审批策略以 `blocked by policy` 拦截，未执行删除；它们与 lockfile/源码/探针保留在忽略目录，无运行实例或真实用户状态。

[access]: ../../.tmp/vela-evidence/0.3.13-a/access-baseline.json
[cep]: ../../.tmp/vela-evidence/0.3.13-a/cep-runtime-discovery.json
[contracts]: ../../.tmp/vela-evidence/0.3.13-a/contract-observations.json
[production]: ../../.tmp/vela-evidence/0.3.13-a/production-observations.json
[lab-pages]: ../../.tmp/vela-evidence/0.3.13-a/browser-observations.json
[lab-detail]: ../../.tmp/vela-evidence/0.3.13-a/lab-detail-observations.json
[probe]: ../../.tmp/vela-evidence/0.3.13-a/observe.cjs
[writers]: ../../.tmp/vela-evidence/0.3.13-a/style-write-inventory.txt
[dependencies]: ../../.tmp/vela-evidence/0.3.13-a/lab-browser-dependencies.txt
[lab-checks]: ../../.tmp/vela-evidence/0.3.13-a/lab-checks.log
[checks]: ../../.tmp/vela-evidence/0.3.13-a/focused-checks.log
[shot-registry]: ../../.tmp/vela-evidence/0.3.13-a/screenshots/production-420-en-registry.png
[shot-settings]: ../../.tmp/vela-evidence/0.3.13-a/screenshots/production-420-en-design-tuning.png
[shot-picker]: ../../.tmp/vela-evidence/0.3.13-a/screenshots/lab-420-palette-picker.png
[shot-curve]: ../../.tmp/vela-evidence/0.3.13-a/screenshots/lab-320-light-curve-editor.png
[shot-review]: ../../.tmp/vela-evidence/0.3.13-a/screenshots/lab-320-light-review-top.png
[shot-glass]: ../../.tmp/vela-evidence/0.3.13-a/screenshots/lab-glass-surface-only.png
