# Lomond Cabinet / Vela 0.3.11 — 跨模块源码审计

日期：2026-09-08  
仓库：Lomond-PM/Lomond-Cabinet  
固定提交：`b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`

## 0. 结论与边界

本轮发现了不同于上轮文档漂移、Unicode 参数边界和能力泛化问题的实现风险。优先处理公共 Host 的条件性数据到代码执行、一次性授权路径的最终 Verify 目标关联，以及全局停用与后台任务控制的不一致；不建议将这些缺口带入能力大规模扩张。

**全仓所有源码逐文件审计尚未完成。** 阅读覆盖、抽查范围和未完成范围见 `COVERAGE.md`。本报告不是“全库安全认证”。没有重新运行仓库的全部离线测试，没有本轮真实 CEP/AE 操作，也没有修改、提交或推送远程仓库。

运行了三份本地脚本，共 17 个检查场景；它们是源码摘录、隔离夹具和明确标记的跨层行为模型，不等于 17 个独立漏洞，更不等于完整生产路径通过/失败。实际输出保存在 `all-results.json` 及分项 JSON。

### 证据等级

- **E1 — 源码摘录复现**：相关函数/分支在 Node.js 夹具中实际运行，相关缺陷表现可见。外围依赖不是完整生产对象。
- **E2 — 跨文件路径 + 行为模型**：实际源码说明路径如何连接；局部模型验证其后果，但未执行真实完整 Runtime/Host 链。
- **E3 — 实机依赖或设计判定待核对**：源码行为清楚，但实际宿主条件、完整 UI 后果或已批准交互语义尚需验证。

E1/E2 都不是原生 AE 实测。优先级是本次修复建议，不是 CVSS：P1 建议在能力扩量前解决；P2 为需要排期的正确性/可用性修复；UX 项的设计推断另行标明。

## 1. 总览

| ID | 优先级 | 问题族 | 已有证据 |
| --- | --- | --- | --- |
| A01 | P1，条件性安全问题 | 普通 Host 元数据读取可进入 `eval` | E1；触发还取决于宿主无原生 JSON.parse 及状态读取入口 |
| A02 | P1，执行证据 | 一次性授权最终 Verify 观察当前选择，不验证原提交目标 | E2；真实切层竞态未重放 |
| A03 | P2，事实记录 | already-satisfied 被 Driver 记录为 `committed:true` | E2；完整 no-op 执行未重跑 |
| A04 | P2，事件基础设施 | Session 普通事件重入/异常/退订导致投递和返回值错误；accessor 破坏历史快照 | E1；不等于 Authority event 可伪造 |
| A05 | P2，启用条件 | 撤回 acknowledgement 后仍保持/完成启用 | E1；完整 Settings UI 未实测 |
| A06 | P1，任务可控性 | 全局停用只发给当前 Surface，后台 Review 可以继续占用门禁并失去可见操作入口 | E2；实机完整场景待验证 |
| A07 | P2，协议完整性 | `length` 终止原因可被之后的 `stop` 覆盖，终止后 delta 仍被接受 | E1 + Adapter 路径核对 |
| A08 | P2，用户数据 | Detach 清空源图层注释，没有使用已保存的原始注释 | E1；原生 Undo 未实测 |
| A09 | P2，几何结果 | 旧坐标帮助函数把转换失败降级成图层坐标；背景路径则拒绝可转换对象 | E1；原生宿主/API 矩阵待验证 |
| A10 | P2，UX 风险 | 非 follow 状态仍按总高度增量移动滚动位置 | E1 数值行为；应保持阅读锚点是建议，非声称已有独立批准契约 |
| A11 | P2，Host 编码 | 公共 JSON serializer 没有转义全部 C0 控制字符 | E1；具体工程触发频率未知 |
| A12 | P2，生命周期 | readiness checking 被 suspend 作废后，resume 不退出 checking | E1；main 的 suspend 入口已定位，完整实机路径未重放 |

## 2. A01 — 工程元数据可以变成 Host 代码

**定位**

- `host/index.jsx` → `AEToolbox.parseJson()`。
- `host/tools/adComponentKit.jsx` → `parseArtifactMetadata()`、`parseMetadata()`、`getState()`。
- `host/tools/adComponentKit.tool.jsx` → `stateAction`，间隔 1000 ms。

公共解析函数优先调用原生 JSON.parse，否则使用 `eval("(" + json + ")")`。组件工具从图层 comment 读取 `LOMOND_CABINET_ARTIFACT_V1:` 后的内容，再调用该公共解析器；元数据字段检查发生在解析之后。组件状态查询也会读取选中层的元数据，因此不必走“执行脚本”功能才能触及该解析路径。

**触发条件**：宿主没有原生 JSON.parse；选中层 comment 中含受支持的元数据前缀及可执行但非 JSON 的内容；组件状态读取/相关动作实际被调用。不能扩大成“打开任意工程就无条件执行代码”。

隔离 VM 探针的副作用仅是内存标记从 0 变 1。相同输入在原生 JSON.parse 对照组被拒绝，标记保持 0。没有在实际 AE、工程文件或用户磁盘上执行该输入。

**偏差**：本应只作为数据的工程元信息跨入代码执行。Vela 私有 Host 使用严格 JSON 不会自动修复普通工具的公共 parser；不能仅以 Vela 执行链有 Authority/Preflight 就判定整个插件没有数据到代码路径。

**修复方向**：取消 eval fallback；使用真正不执行代码的 JSON parser，并保留普通工具错误返回契约。补 metadata schema/字节边界，但“先 eval 再检查字段”不是修复。不需要为此暴露 Vela 私有执行能力。

**回归**：无原生 JSON、有原生 JSON、合法元数据、非 JSON 表达式、坏 JSON、普通用户 comment；状态查询在所有无效元数据下无副作用、无 Host mutation。

## 3. A02 — 新鲜不等于验证了同一个目标

**定位**

- `velaAgentDriver.js` → `runIteration()` 中 `executed` 后的 `verifyAction()`。
- `velaRuntime.js` → `createAgentDriverRuntimePort()` 的 `verifyAction()`。
- `velaContextBridge.js` → `opacityVerificationPort.observe()`。
- 对照：显式 Review 的 `verifyCommittedAction()`、Owner 的 trajectory 验证规则。

一次性授权执行后，Driver 调用普通 verifyAction。该函数使用 opacityVerificationPort，再次捕获“现在选中的唯一图层”，仅比较不透明度和 expectedValue；它没有携带/核对原提交目标身份。显式 Review 路径则使用 committed-target verification。

受控模型演示：A 曾提交到 63；提交后 A 被外部改成 20，当前选择变成 B，B 恰为 63。普通 Verify 仍可返回 `fresh:true, matches:true`。选回 A 的对照组才发现 mismatch。这不是完整 Host/Authority 竞态复现，而是实际源码缺失目标关联时的局部行为模型。

Owner 的轨迹投影已经将 current-selection 验证记为 `targetRelation:unproven`、`disposition:unknown`；但 Driver 的该路径仍会据 fresh/matches 完成任务。**消费端的完成判据比证据投影承认的证据强度更强。**

**重要限定**：ExecutionAdapter/Host 对提交当时的结果另有 digest 检查。本项不是说原写入完全未经验证，也不是已证明写错层；缺口在提交后的独立 fresh Verify。它也不同于已接受的 request-send → Review 重新绑定语义。历史报告保留的 unproven 不应被本报告虚构为实机已经闭合。

**修复方向**：让一次性授权与显式 Review 的最终验证都使用受本地执行所有权保护的 committed-target 关联；保留 JIT/新鲜捕获和生命周期失效。不要让模型提交目标身份，也不要把当前选择当成默认替代目标。

**回归**：提交后换同值层、换不同值层、原目标改变/删除、原目标所属合成切换、取消后迟到 Verify；错误关联不能标 completed，正确原目标仍能完成。

## 4. A03 — no-op 被记录为已经提交修改

**定位**：Runtime 的 approved continuation → Driver `resolveReview()`。

Runtime 区分真实 committed 与 `execution.state === "satisfied"`，但二者返回同样的 `{state:"verification-required"}`。Driver 收到这个状态后统一设置 `active.committed=true`，追加 `tool/result`，payload 为 `committed:true`。

局部交接模型中，输入为 `{state:"satisfied", committed:false}`，Runtime 内部 committed 仍为 false，但 Session 事件变为 true。

**偏差**：目标已满足、执行尝试发生、Host 被调用、Host 已提交、Verify 成功是不同事实。现有 trajectory 可以正确记录 already-satisfied/no Host；它不能替 canonical Session 中不同事实的错误标记兜底。Session FactEvent 的存在也不应被误解成自动可用的 Authority evidence。

**修复方向**：在交接契约保留 mutation disposition 和三态 committed（true/false/unknown）；Driver 原样投影被实际证明的事实。no-op 继续需要 fresh Verify，不能通过跳过验证或强制执行一次修改来“统一”记录。

**回归**：真实 mutation、already-satisfied、失败未提交、提交不确定、提交后验证失败；对照 Session、trajectory、Host 调用计数和 Undo 数量。

## 5. A04 — Session append 不具备稳定事件收据和订阅隔离

**定位**：`velaSessionRuntime.js` → `appendInternal()`、`publishAuthorityInternal()`、`subscribe()`、事件 payload 构造。

普通事件追加后，循环每次读取 `events[events.length - 1]`，最后也返回该表达式；订阅数组在循环中可被直接改变，普通订阅者异常没有被隔离。

实际摘录探针：

| 场景 | 日志/行为 |
| --- | --- |
| 第一个订阅者在 outer 回调里 append inner | 日志是 outer/inner；后一个订阅者收到 inner/inner；append(outer) 返回 inner |
| 第一个普通订阅者抛异常 | 事件已提交，但 append 抛出；后续订阅者未收到；该路径不调用已有 onListenerError |
| 第一个订阅者退订自己 | 数组位移使后一个订阅者被跳过 |
| payload 含 getter | Object.isFrozen 为 true，但改变 getter 闭包状态后，旧事件读数从 1 变 2 |

冻结架构要求 Session 是 append-only typed log、事件深冻结和数据快照、投影为确定性折叠。以上问题让 push 订阅与 log replay 不再可靠等价，也使“已经提交”的调用看起来像失败。

**边界**：getter 输入需要本地 JS 调用者，普通 JSON 无法携带 getter；不把它报成模型远程注入。Authority evidence 另有可信事件身份/来源验证，本项不是已证明的 Authority 伪造。

**修复方向**：捕获本次追加的确切 event 并始终返回它；对订阅者使用稳定快照，定义重入顺序并隔离观察者异常；以严格 data-only 复制或拒绝 accessor 建立快照。不要靠“以后所有订阅者都不许出错”保证 append 的提交语义。

**回归**：上述四场景，加嵌套多次 append、回调新增订阅者、close/dispose、Authority deferred publish；检查每个事件准确投递和提交收据身份。

## 6. A05 — acknowledgement 状态与启用事实分离

**定位**：`velaSurfaceController.js` → `configureExperimental()`、`enableExperimental()`；main 的 acknowledgement change 处理。

configureExperimental 的 changed 仅包含 endpoint/model，不包括 acknowledgement。撤回 acknowledgement 不使已启用状态失效，也不作废同配置的在途 readiness。readiness 成功提交时不再次检查当前 acknowledgement。

摘录探针确认两种结果：已 ready 后取消勾选，仍为 enabled=true/acknowledged=false；checking 期间取消勾选，迟到的 ready 仍将状态设为 enabled=true/acknowledged=false。

**偏差/边界**：这是实验 Provider 启用条件和 UI 状态的不一致，不是 mutation Authority grant 被绕过。如果 acknowledgement 产品语义意图是“本面板曾确认过一次”，需要显式表达该事实，而不是让当前可撤回 checkbox 与实际启用条件互相矛盾。

**修复方向**：明确 acknowledgement 的生命周期；若当前确认是条件，撤回时失效启用和在途 readiness，异步完成再次检查当前配置/确认；与 Mutation Authority 的撤销策略分别定义，不能混成一个布尔值。

## 7. A06 — 全局停用没有覆盖实际后台任务所有者

**定位**：main 的 `velaExperimentalSessionRequested` 与 Disable handler；SurfaceController 的 `disableExperimental()`/`synchronize()`；Conversation 的持有者门禁。

Settings 写入全局 enable intent=false，却只调用当前 selected Surface 的 disableExperimental。该方法只能取消自己的 provider。后台 source 的 Runtime/Driver 不因换视图而销毁；这是多会话正确的既有语义。

可推出的组合场景：C1 等待 Review → 选择空闲 C2 → Disable → C1 没有收到取消 → 返回 C1 时新 Surface 因全局 false 不再自动启用 → `if(!experimentalEnabled) action="send"` 隐去该任务的 Review/Cancel。C1 仍可能占 admission，活动会话不能 Close。

本地模型确认分派没有发给 C1，且 disabled action 投影为 send；**尚未在真实 main/Composition/DOM/AE 中重放整个场景**。不能称为实机死锁已确诊。源代码已足够要求增加该集成负向用例。

**修复方向**：先确定按钮是面板级还是会话级，并使标签、enable intent、停止请求与 source owner 一致。无论采用哪种语义，停用新请求不能同时隐藏既有任务的取消/拒绝入口。不要直接清 holder；仍需等原调用安全收束，避免晚到 Host 回调污染新任务。

**回归**：C1 流式/Review/Verify/取消收束期间选择 C2，分别停用、改模型、撤回 acknowledgement；确认命令到达正确 owner，晚回调隔离且有可用恢复入口。

## 8. A07 — 终止原因不是单调状态

**定位**：`velaProviderStreamAssembler.js` 的 consumeFrame；ProviderAdapter 的 SSE → 终态 wrapper 合成。

Assembler 对每个非空 finish_reason 直接覆盖 finishReasonObserved。之前的 length 不会被锁定；后来 stop 可以取代它。达到 finish_reason 后也没有阻止后续内容 delta。Adapter 最后用这个最终值合成 wrapper；后面的“非 stop 则失败”无法恢复已经丢掉的 length。

已运行场景：length → stop → DONE 得到 stop；stop → content delta → DONE 得到拼接后的文本。

**偏差**：错误/截断终态不能被后续数据洗成正常完成。它依赖异常或不符合预期协议的 Provider 帧，不是普通 happy path 必然出错。后续结构化 Parser/Intent Gate/Authority 仍存在，不能据此声称任意部分 JSON 已直接执行。

**修复方向**：定义并验证单调的终态规则；矛盾 finish、失败后成功覆盖、终止后内容等拒绝或进入明确定义的错误路径。不要顺便删除合法 DONE 提前停止读取的优化。

## 9. A08 — Detach 清掉了源图层的用户注释

**定位**：Ad Component Kit 的 `setLayerArtifactMetadata()`、`restoreSourceLayerBinding()`、`detachSelectedComponent()`。

sourceLayerBinding 元数据保存 previousCommentEncoded；Remove 路径知道如何恢复。Detach 对所有组件层统一执行 parent=null 和 comment=""，没有恢复该保存值。

摘录变更循环配合已保存注释夹具，结果是用户原始注释变为空。没有实际 AE Undo 测试，因此不声称无法通过 Undo 恢复；这里是 Detach 行为本身丢弃了非工具拥有的数据。

**修复方向**：区别 generated layer 与 source binding，恢复用户原始 comment、只移除工具拥有的 metadata。不要借修复之机猜测/清除不属于该工具的表达式或用户数据。Detach 是否也应解除表达式需要单独对照其产品契约，本报告不把它自动认定为缺陷。

## 10. A09 — 坐标转换失败不应伪装成有效几何

**定位**：Ad Component Kit 的 `getLayerVisualBoundsInComp()`，Text Background Box 的 `layerVisualBoundsInComp()`；对照组件中的 strict Grid conversion。

旧组件帮助函数尝试 layer.toComp，异常后直接用原始局部点继续计算“合成坐标”。背景帮助函数同样只尝试 toComp，失败就返回 null。仓库的严格 Grid 路径已经使用 sourcePointToComp 并在失败时明确拒绝。

夹具只提供 sourcePointToComp，并定义 2 倍缩放与平移，真实中心应为 (600,350)。旧组件函数返回 (50,25)，背景函数返回 null；为相同对象补上 toComp 的正向对照即可正确转换。

**边界**：这是相关函数在明确输入能力下的复现，不是“所有 AE 版本/所有图层必然缺少 toComp”的主张。具体宿主、图层类型与生产可达性仍需实机矩阵。传统工具的该帮助函数有实际排序/状态/创建消费者，不能因新的 Icon Grid 已经严格化就忽略旧路径。

**修复方向**：采用明确支持且经过验证的 Host 坐标转换，失败返回不可用；禁止图层空间与合成空间静默混用。检查无父级/有父级、缩放/旋转/关键帧、2D/3D、零尺寸和表达式条件。

## 11. A10 — 不跟随底部时仍然会被新内容带着移动

**定位**：`velaTranscriptView.js` → renderWithTransient → restoreScroll。

当 follow=false，代码仍调用高度补偿：scrollTop = oldTop + newHeight - oldHeight。若用户正在读旧消息，新内容只在视口下方增加 200 px，旧 scrollTop=100 也会变成 300。

该数值行为已复现，但没有本轮真实浏览器布局测试，也未找到一个单独批准的“保持顶部阅读锚点 vs 保持底部距离”契约。因此这是**具体 UX 风险及改进建议**，而非本报告擅自宣布的架构红线违规。

建议保持可见消息及其偏移，只对锚点上方内容变化补偿；不要对所有高度变化无差别补偿。实机覆盖读历史时持续 streaming、reasoning 折叠、语言切换与会话切换。

## 12. A11 — 公共 Host serializer 不能保证输出合法 JSON

**定位**：`host/index.jsx` → jsonEscape、toJson、stringify。

jsonEscape 转义了反斜线、引号、CR/LF/TAB，但没覆盖全部 U+0000–U+001F。U+0001 字符夹具经公共 serializer 输出后，JSON.parse 抛错；普通换行对照正常。

**偏差/边界**：普通工具名称、文本、错误或工程元信息不能假定永远没有控制字符。具体 AE 原生字段是否允许、当前用户工程是否遇到未知；Vela 私有 JSON 路径另行处理，不等于所有 Host 返回值都有该缺陷。

**修复方向**：使用完整 JSON string escaping/严格 serializer；保持既有错误返回形状，补全部 C0 字符、引号/反斜线和正常多语言数据的往返测试。与上轮参数高代理项校验缺口是不同位置的问题。

## 13. A12 — readiness 被挂起作废后没有恢复态

**定位**：SurfaceController 的 enableExperimental/suspend/resume；main 中进入工具详情及面板挂起的 Surface.suspend 调用。

检查中 suspend 会 generation++，使旧结果过时，但不把 experimentalState 从 checking 移出。旧 Promise 返回 superseded；resume 只恢复订阅和 synchronize；再次 enable 因 checking 提前返回。

摘录探针最终为 checking、enabled=false、实际 provider.check 仅调用 1 次。实机工具详情切换/面板生命周期尚未重放；不要把普通会话重新创建 Surface 的路径与原 View 的 suspend/resume 混淆。

**修复方向**：在作废在途检查时进入明确可重试状态；resume 明确重试或提示重新启用。既不能接受旧 generation 回包，也不能永远留在 waiting/checking。

## 14. 设计初衷的综合判断

没有证据要求推翻 Conversation ownership、单 objective admission、TaskPlan/AuthorizedPlan/Host 分层。可见问题多数是边界实现没有闭合：

- **事实强度没有贯穿消费者**：no-op 的 commit 标记、unproven Verify 被 Driver 接受、Session push/replay 不一致。
- **控制范围没有贯穿所有权**：全局启用意愿/停用按钮与 selected View 的操作范围不一致。
- **严格数据边界没有覆盖整个产品**：Vela 的严格执行入口不能代替普通 Host metadata 的安全解析。
- **局部修复没有覆盖旧消费者**：严格 Grid 坐标路径存在，但旧几何帮助函数仍可能返回错误空间数据。

没有在已读链路中证明“模型输出可以直接伪造有效 Vela 权限并执行”；这不是全仓不存在权限漏洞的保证。普通 Host 的条件性 eval 问题也不因上述限定而降低重要性。

0.3.12 能力泛化、模型历史、容量预算、持久化等已明确延期的路线项不在本轮伪装成缺陷。已接受的 request-to-Review retargeting 不等于 A02 的提交后目标验证问题。保留原来的 bounded UNKNOWN 比为了关闭报告强行写 PASS 更正确。

## 15. 建议修复顺序与验收

先分开做普通 Host 严格 JSON、一次性授权 committed-target Verify、实验启停/后台任务控制三项 focused repair；每项都有局部负向回归，再做对应真实 AE 验收。不是把三者和 0.3.12 泛化放进一个大重构。

随后处理 Session 事件收据/订阅隔离、no-op 事实语义、SSE 终态单调性。它们会成为更多能力和历史消费者的公共依赖，宜在扩大使用前稳定。

传统工具 Detach/几何与公共 serializer 做独立工具回归；readiness/滚动做独立 UI 场景。权限不确定、Host 回调未收束时不得为了恢复界面而直接释放 admission 或自动重试 mutation。

报告不能作为修复完成的证据。完成某项修复时应保留：原缺陷负向用例、正向对照、实际改动提交、相关现有回归、必要的真实 AE 值/Undo/Session/trajectory 对照，以及没有覆盖的条件。

## 16. 固定源码与设计来源

所有下列链接固定同一提交，避免随 dev 变化：

- [docs/design/vela-agent-architecture.md](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/design/vela-agent-architecture.md)
- [docs/VELA_ROADMAP.md](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/VELA_ROADMAP.md)
- [docs/PROJECT_STATE.md](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/PROJECT_STATE.md)
- [docs/KNOWN_ISSUES.md](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/KNOWN_ISSUES.md)
- [docs/reports/vela-0.3.11-integrated-acceptance.md](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/reports/vela-0.3.11-integrated-acceptance.md)
- [docs/reports/vela-0.3.11-a5-conversation-selection.md](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/reports/vela-0.3.11-a5-conversation-selection.md)
- [host/index.jsx](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/host/index.jsx)
- [host/tools/adComponentKit.jsx](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/host/tools/adComponentKit.jsx)
- [host/tools/adComponentKit.tool.jsx](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/host/tools/adComponentKit.tool.jsx)
- [host/tools/textBackgroundBox.jsx](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/host/tools/textBackgroundBox.jsx)
- [client/js/main.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/main.js)
- [client/js/vela/velaAgentDriver.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaAgentDriver.js)
- [client/js/vela/velaRuntime.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaRuntime.js)
- [client/js/vela/velaContextBridge.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaContextBridge.js)
- [client/js/vela/velaAgentRuntimeOwner.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaAgentRuntimeOwner.js)
- [client/js/vela/velaSessionRuntime.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaSessionRuntime.js)
- [client/js/vela/velaAuthorityEvidenceResolver.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaAuthorityEvidenceResolver.js)
- [client/js/vela/velaExecutionAdapter.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaExecutionAdapter.js)
- [client/js/vela/velaSurfaceController.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaSurfaceController.js)
- [client/js/vela/velaConversationComposition.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaConversationComposition.js)
- [client/js/vela/velaConversationOwnership.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaConversationOwnership.js)
- [client/js/vela/velaConversationSwitcher.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaConversationSwitcher.js)
- [client/js/vela/velaProviderStreamAssembler.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaProviderStreamAssembler.js)
- [client/js/vela/velaProviderAdapter.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaProviderAdapter.js)
- [client/js/vela/velaTranscriptView.js](https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/client/js/vela/velaTranscriptView.js)
