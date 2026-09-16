# Lomond Cabinet / Vela — 0.3.11 外观专项审计

审计日期：2026-09-08。仓库：`Lomond-PM/Lomond-Cabinet`。基线：`b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`。

## 结论与证据边界

建议在 0.3.x 中安排独立的外观一致性与交互稳定化阶段，但不据此擅自修改既有版本编号、冻结架构或远程源码。现有 Palette / Appearance / Design Tuning / Procedural consumer 分层可以保留。此次主要发现是保存结果没有闭合、可变引用泄漏、参数作用域与界面承诺不一致、旧手势与新提交边界并存，以及状态与排版投影的局部不一致。

本次是远程源代码与设计文档的专项链路审计，不是整个外观系统的逐行审毕证明。`COVERAGE.md` 列出了实际阅读的模块/范围与未完成项。没有修改远程仓库，没有运行仓库全量回归，没有操作用户的 AE 工程，没有完成原生 CEP/AE 验收。

本地证据来自三类：手工转录的生产函数摘录与故障/事件夹具；固定 Palette 分支的数值内核转录与固定 recipe；局部 CSS 在 headless Chromium 中的隔离计算。它们不能等同于完整模块原文件、完整生产 composition 或 CEP 像素截图。源码块的格式有压缩、函数有重命名；测试中替换的依赖在各脚本头部声明。远程 blob SHA 是源引用，不是本地摘录文件的哈希。

共运行 19 个局部场景：状态 7、手势/状态投影 5、像素内核 4、CSS 3，包含正常对照和一个被排除的疑点。复现脚本断言成功表示观察到了问题/对照行为，不表示产品回归 PASS。

## 对照的设计初衷

以 `docs/DESIGN_SYSTEM.md` 的当前外观与 Design Tuning 收口说明，以及 `docs/design/procedural-appearance.md` 中 Palette v2 Phase 4/5 与共享生产消费者约定为依据。

- PaletteModel 定义 schema；PaletteResolver 解析图；ColorDerivationRegistry 持有派生语法/数学；PaletteStore v2 持久化。
- Workspace 持有完整 v2 draft、选择、dirty 与 transient preview；普通编辑不重建完整 Workspace。
- Appearance 持有用户外观参数；Design Tuning 校准参数独立；镜像编辑器继续委托原 authority，不另造 persistence。
- 同一 engineVersion/target/seed/normalizedParams 对应可复现的生成。主题映射是 presentation，不应改变 seed/几何。
- 新外观控件区分内存预览、最终 commit 与取消；字体使用角色乘数并与 UI Scale 组合。

设计文档中保留了不同历史阶段，不将旧阶段“尚未实现”等陈述当作当前缺陷；也不以早期黑金配色为由否定后续已校准的阴影、蓝色光学细节或其他当前默认值。

## Finding 总表

| ID | 建议级别 | 分类 | 结论 |
|---|---|---|---|
| AP-01 | P1，条件性 | 用户资产保存 | Palette 回滚将“未读到旧值”误当成“旧值不存在”，可能删除已有 v2 数据 |
| AP-02 | P2 | 状态/保存结果 | Appearance commit 吞掉持久化失败；Design Tuning 有相同静态路径 |
| AP-03 | P2，API 边界 | 数据归属 | Appearance 的嵌套对象通过浅拷贝/直接返回泄漏，默认值也可跨实例污染 |
| AP-04 | P2 | 参数语义 | 固定 Palette 分支不消费 saturation/brightness；hueShift 同样无作用但不宣称它是当前 Home 滑块 |
| AP-05 | P3，迁移一致性 | 手势/持久化 | 旧基本设置/经典背景滑块每个 input 都保存，与新 preview/commit 机制并存 |
| AP-06 | P2 | 交互生命周期 | ResizeGrip 在活动拖动中 dispose 后仍保留文档/窗口监听 |
| AP-07 | P3 | 状态展示 | “另一对话正在运行”的文案与当前会话旧 tone 分开投影，可显示成功色 |
| AP-08 | P3，完整级联待验证 | 字体/缩放 | Vela 流式区域与最终文本的字号来源、固定像素间距不一致 |

级别用于建议修复顺序，不是 CVSS 分值。P1 指潜在用户数据损失，不代表已在用户设备观察到该损失；P2/P3 也不自动意味着应立即重开所有已封存里程碑。

## AP-01 — Palette 保存失败可能误删旧数据

**源码：** `client/js/palette/paletteStore.js::create/commit`，远程 source lines 210–231 附近；blob `5a840265c1d7ae4c06a8fe2aefbd6f3cc026d07d`。

`previous` 初始为 null，读取旧存储与写新存储在同一个 try 中。如果 `getItem` 抛异常，`previous` 仍为 null。catch 中以该 null 值决定调用 `removeItem(STORAGE_KEY)`。

这把两个不同事实合并了：

1. 已成功读取，并确定 key 不存在。
2. 尚未成功读取，不知道 key 是否存在。

局部故障夹具保留一份旧 Palette 数据，使 getItem 抛异常而 removeItem 正常。结果：commit 返回 `ok:false / STORAGE_WRITE_FAILED`；新数据写入次数 0；removeItem 调用 1 次；旧数据被删除。正常读取旧数据、首次 setItem 失败的对照中，旧数据被成功恢复，没有被删除。

**边界：**这是存储适配器故障模型下的确定控制流。未在真实 localStorage 中复现“读失败但删除成功”；不能声称常见配额不足都会删数据，也不能声称用户已丢失色卡。若原生接口读写删除都一同失败，删除也不会成功。

**建议：**分开记录 oldValueReadSucceeded / previousValue / writeAttempted；读取失败直接中止，不对未知旧状态执行删除。写入失败回滚只依据已确认的旧快照；保留类型准确的失败报告。不要把修复做成“坏数据自动恢复默认”，那会掩盖资产丢失。

**回归：**读失败而删除可用；无旧值且写失败；有旧值且写失败；回滚再次失败；UI 不报告保存成功；旧 v1 迁移证据不被删除。

## AP-02 — 提交返回值与持久化事实不一致

**源码：** `appearance/appearanceStateStore.js::save`；`appearance/appearanceResolver.js::commit/reset`；`designTuning/designTuningStateStore.js::save`；`designTuning/designTuningResolver.js::mutate/commitTransientOverride`；`main.js::commitAppearanceValue`。

Appearance Store 已返回 `{persisted:false}`，但 Resolver 先改内存、清 transient，再调用 save 并忽略其结果，仍返回 true。控件侧随后刷新外观和 override 状态，没有显示持久化失败的通道。没有 storage 时，Store 的 save 还可以返回 `persisted:true`。

局部夹具：原保存颜色 `#112233`，本次设置为 `#445566`，setItem 抛错。commit 返回 true；当前 resolved 为 `#445566`；磁盘仍是 `#112233`。重开会话依赖旧存储时自然不会恢复当前看到的新颜色。

Design Tuning 中也静态确认到 save 返回值未被消费；其完整原模块及 UI 尚未单独运行。基础 Settings 参数由 main wrapper 调用 saveSettings，不把“Resolver 不自行保存基础 Settings”误判成缺陷。

**建议：**让结果区分 accepted/applied/persisted；保存失败时可保留视觉预览，但须标记未保存并可重试/撤销。另一合法选择是回到已保存值。不要把任一选择当作默认批准的新产品语义。reset 与普通 commit 使用一致的结果处理。

## AP-03 — 外观读取接口泄漏可变嵌套对象

**源码：** `appearanceStateStore.js::copyOverrides/getOverride/getOverrides/snapshot`；`appearanceResolver.js::DESIGN_DEFAULTS/copy/getResolvedValue`；`main.js::ensureCoreAppearance`。

外层复制不是完整数据快照。ColorAlpha 对象通过浅拷贝/直接返回可被调用者修改；DESIGN_DEFAULTS 只冻结外层，内部 colorAlpha 也可被更改。

局部夹具先合法提交 alpha=0.5，再修改读取出的对象 alpha=8。Store 内部值也变成 8，而 Registry 正常 validate 会拒绝 8。另一个夹具将第一个 Resolver 读出的默认 secondary alpha 从 0.66 改成 0.07，新建第二个 Resolver 时默认值也是 0.07。测试后恢复了转录夹具的默认值，避免案例互相污染。

**边界：**需要本地 JavaScript 消费者修改所读对象；不是用户正常拖动必现，不是模型 JSON 权限绕过，不声称当前已有消费者在这样修改。当前 main 会暴露 CoreAppearance，因此这不是完全没有消费者的孤立内部对象问题。

**建议：**入库时保留独立的规范化对象；对外返回深复制/深冻结快照；深冻结工厂默认值。这里只处理 Appearance 数据，不引入第二个写入 owner，不更改校准数值。

## AP-04 — 固定 Palette 下部分源参数不会改变图像

**源码：** `proceduralAppearance.js::createPalette/createFixedPalette/createRecipe/sampleFlowPalette/renderField`；`proceduralHomeIcons.js::getIconParams/renderTool`；`main.js::updateProceduralHomeIconAppearance`。

算法配色 createPalette 消费 hueShift/saturation/brightness；固定配色 createFixedPalette 只接收 resolved Palette 并直接构造颜色。renderField 后续也不读取这三个参数。Home 图标通过稳定 toolId→paletteId 映射使用固定 Palette。规范文档还明确将 saturation/brightness 列为生产共享源参数。

因此当前并非“同一参数在不同 Palette 下强弱不同”，而是固定分支中没有这个参数到像素的路径。参数依然进入 normalized source identity，可触发不同 cache key/重绘，却不改变这一分支的像素结果。

固定 recipe、48×48 RGBA、转录的固定 Palette 数值内核结果：

| 参数 | 对照值 | 不同字节数 |
|---|---|---:|
| saturation | 0 / 1.4 | 0 |
| brightness | 0.2 / 1.4 | 0 |
| hueShift（源 API 参数） | -30 / 30 | 0 |
| contrast（敏感性对照） | 0 / 1 | 6667 |

前三组 SHA-256 均为 `8eece04ba061cc61dc03a363944ac0ae0280278a2eca16c674910e071d82a503`。这只代表夹具图像，不是用户当前 Home 图标哈希。没有使用原生 Canvas、完整引擎 cache、ThemeMap、CEP 或 AE。

**建议先裁定参数作用域：**固定 Palette 下也应有视觉调整，则使用明确的派生转换、保证默认值兼容并测试几何不变；如果固定 Palette 就应严格保色，则界面标出这些参数只适用于算法配色，在不适用分支禁用/解释，避免无意义失效。不能为了“让所有滑块有用”而直接改坏已批准配色或偷偷改变 engineVersion 对应的确定性。

## AP-05 — 旧滑块每次 input 都写存储

**源码：** `main.js::linkRange/linkPersistedRange/setupUiScale/setupMotionSpeed/BackgroundEngine.bindControls/setupProceduralBackgroundControls`。

linkPersistedRange 给 range 的每个 input 注册 notify；消费者在 notify 中 saveSettings 或 BackgroundEngine.save。局部 fixture 连续派发三个 input，在还没有 change/pointerup 时已经产生三次保存。

这是与新 Appearance/Design Tuning 预览提交机制并存的旧路径，不把它夸大成所有外观控件都写每帧，也不把本次未测的实际卡顿说成既成事实。作为历史实现可解释，但在统一交互阶段应有明确迁移裁定。

**建议：**把即时渲染与最终保存拆开，统一鼠标拖动、键盘、Enter/blur、Escape、pointercancel、离开页面与关闭的终结语义。先指定每种终结究竟 commit 还是 cancel，再调整绑定，避免用 debounce 代替语义设计。

## AP-06 — 活动 ResizeGrip 销毁不结束手势

**源码：** `ui/coreUi.js::bindResizeGrip/createTextarea`。

pointerdown 创建四个活动监听：document pointermove/pointerup/pointercancel 与 window blur。end 会移除；但返回的 cleanup 只移除 grip 的 pointerdown 和 body class，没有调用 end，也无法访问并注销闭包中的活动监听。

局部事件 fixture：拖动开始后调用 cleanup，四个活动监听仍存在；将 frame 从父节点移除，再派发 pointermove，旧 frame 仍被写入 width=130px/height=100px。正常 pointerup 再 cleanup 的对照监听数为 0。

**边界：**证明的是提供的清理函数在活动手势下不完备；尚未验证每一条真实导航/重建路径是否会在该时间窗调用它。

**建议：**把活动终结器保存在控制器生命周期上；dispose 先终结活动手势并释放 pointer capture，再拆常驻事件；lostpointercapture、重复结束、窗口失焦和 owner 移除应可幂等处理。不只删除视觉 class。

## AP-07 — 跨会话状态的文案与 tone 来自不同状态

**源码：** `velaSurfaceController.js::synchronize`；`velaPresentationModel.js::projectSurfaceState/statusTone`；`statusTone.js`；`velaSurface.css` 状态点。

Surface 先算当前会话 projection。availability.other 时只把 statusText 改成“另一对话正在运行”，data-tone 仍使用旧 projection.tone。当前会话上一个结果 completed 时，projection 为 completed/success；这可与 other-running 文案同时出现。CSS 将 success 映射为 success 色。

控制流摘录夹具确认此组合；没有运行完整多会话 SurfaceController。发送门禁与执行权限不是本项问题，不能为修颜色而改 admission 或 cancel 语义。

**建议：**保留 selected conversation 的独立历史状态，同时从选中会话状态、全局活动状态、授权提示构建一致的 display status（含 label/tone/accessibility），不要仅覆盖文本。全局 status 与局部 status 可以有不同内容，但各自文案与颜色应表达同一状态。

## AP-08 — 流式区的字体/间距未完全进入角色与缩放体系

**源码：** `client/css/style.css` root typography/UI Scale tokens；`client/css/velaSurface.css` message 与 transient 区域。

最终 `.vela-transcript-message` 显式用 supporting-size；`.vela-transcript-transient-text` 没有显式字号。受控父元素使用项目 body token 时，流式文本继承 body-size，最终文本使用 supporting-size。另有 transient segment `padding:7px 10px`、列表 gap8/margin10、文本 margin6 等未乘 UI Scale 的固定值。

隔离 Chromium CSS 夹具结果：

| UI Scale | 流式字号 | 最终字号 | transient padding |
|---:|---:|---:|---|
| 0.62 | 7.44px | 6.51px | 7px 10px |
| 0.92 | 11.04px | 9.66px | 7px 10px |
| 1.18 | 14.16px | 12.39px | 7px 10px |

**边界：**已确认被审 CSS 片段的计算差异。没有加载全部 style.css 级联，也没有真实 CEP，因此不声称每个安装环境都会出现肉眼可见的终态跳字号。该项是局部设计一致性债务与整合验收候选，不是已完成实机视觉验收。

**建议：**明确 assistant 正文、user 正文、reasoning 正文的字体角色；同一条 assistant 内容的 transient→committed 复用同一角色。间距使用已有角色或 Vela 本地域 alias ×UI Scale。无需为了几处 px 抽出全新全局 token 系统。

## 被排除/不应误判的内容

### X01 — Palette 摘要 overrides 统计

初看代码统计 toolPaletteMap 而非 builtInOverrides，存在命名疑点。随后核对 `i18n.js`：英文为 `tool overrides`，中文为“个工具覆盖”。所以它统计工具映射是正确的。本报告不把它列为 bug，也不建议把计数改成内置 Palette override 数量。state-results.json 保留排除证据，避免以后重复误修。

### 保留的架构边界

Design Tuning 的 Appearance-backed 镜像有明确的委托约定，并不因为两个入口就成为 competing authority。Palette→Primary Text/Accent/Canvas 是显式赋值而非自动 live-link，不应改成随着 Palette 编辑静默漂移。Palette graph 已有 missing/self-reference/cycle 与错误传播路径，不因保存问题推翻图解析器。ThemeMap 作为 presentation 与源生成分离、确定性工具 identity、现有 narrow controls 结构均应保留。

### 尚不能作出的结论

没有真实屏幕级对比度、native select 样式、DPI 切换、全部 CSS 层叠、Color Picker/Bezier editor、长时间内存和逐帧性能的完备证据；这些既不标 PASS，也不因未测自动判 FAIL。深层 Palette 图资源上限、完整迁移/import 故障矩阵等也未穷尽。

## 建议的 0.3.x 工程切片

不指定未经批准的新版本号，可暂用阶段名 `Appearance Consistency & Interaction Stabilization`。

1. 保存与数据归属：AP-01/AP-02/AP-03，先补失败用例，修返回结果/事务/对象快照。
2. 手势与预览：AP-05/AP-06，统一终结语义，不改外观审美数值。
3. 参数与展示：AP-04/AP-07/AP-08，先裁定作用域/角色，再做局部迁移与视觉验收。

AP-01 适合先修；其余外观项可以在独立切片推进，不要求全部阻塞 0.3.12 的只读规划。此前 Host/Agent 事实与控制漏洞仍保持独立修复范围。

退出证据应包括源码实际模块的回归、保存/读错/回滚错注入、拖动取消/离开/销毁、同 Palette 的参数敏感性、seed/几何稳定性、stream→terminal 字体连续性、跨会话 label/tone 一致性，以及当前 AE/CEP 下默认和窄面板/两端 UI Scale 的真实接受记录。

本报告是审计建议，不是已实施或已批准的路线变更。
