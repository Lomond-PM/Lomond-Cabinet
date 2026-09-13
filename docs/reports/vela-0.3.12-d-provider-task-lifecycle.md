# 0.3.12-D — Provider & Active Task Lifecycle

当前状态：**D TARGETED_ACCEPTED / READY FOR COMMIT / PR**。环境为 AE 26.0x67 / AdobeCEP 12.0.1 / Chrome 99（Windows Win64）；接受采用明确区分边界的真实产品证据与真实 CEP 页面受控生产组合证据。

| ID | 当前分项摘要 |
|---|---|
| A05 | TARGETED_ACCEPTED：既有真实撤回、readiness 失效/重试及后台 Review/Grant 证据 |
| A06 | 有界 TARGETED_ACCEPTED：既有真实后台 UI 停止、Grant 撤回、正常 Host mutation/Undo，加 Supplement-01 生产组合在途收束 |
| A07 | 有界 TARGETED_ACCEPTED：既有真实正常 Provider 流及受控异常字节流组合 |
| A12 | 有界 TARGETED_ACCEPTED：既有真实 checking 撤回/重建/明确重试，加 Supplement-01 同实例公开生命周期探针 |

最终离线基线仍为 **195/195**，两个实机/CEP 补验轮均未重跑 suites。自然 Host/Verify 在途窗口内的真实 UI Disable、同 Surface checking 的正常 UI suspend/resume、实际模型两步停止仍 NOT COVERED，留待 G 阶段复核；原真实 `PROVIDER_TIMEOUT` 保持失败记录，根因未明且未修复。INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G，不进入 E。

基线：`dev@2b380d97881a69dcade109bcf4ca477bea3deb5c`；分支 `fix/vela-provider-lifecycle-0.3.12`。C2 已经 PR #209 合并，A02/A03 保持 TARGETED_ACCEPTED。未改 Host、包版本、模型 prompt/schema、冻结架构或 C1 Session 实现。

## 实施轮历史：四项反例与状态

以下表格及实施轮结尾的“真实验收尚未执行 / REAL CEP/AE ACCEPTANCE PENDING”均为实施完成时的历史状态；当前裁定见顶部及 Supplement-01。历史反例、测试与失败记录不改写为 PASS。

| ID | 当前生产最小反例（修复前） | 最小修复 | 验收状态 |
|---|---|---|---|
| A05 | ready 时撤回确认后仍 `enabled=true/acknowledged=false`；checking 时撤回，旧成功回调仍进入 ready | 撤回先清可用状态、推进独立 readiness generation；接到面板 owner 的全局停止与准入门 | IMPLEMENTED / OFFLINE PASS；REAL CEP/AE ACCEPTANCE PENDING |
| A06 | 实际两会话组合中 selected=B、active=A；B 的 Disable 后 A 仍 awaiting-review。两路 Host 在途取消后，真实替身写入一次而 Driver committed 仍 null | 复用 Composition 唯一 holder，分派至实际 Owner；收束型取消保留 Host/Verify Promise 和事实关联，结束后才释放；后台取消与设置 Disable 保持可达 | IMPLEMENTED / OFFLINE PASS；REAL CEP/AE ACCEPTANCE PENDING |
| A12 | checking→suspend→resume→旧回调，仍 checking，后续 enable 不再检查 | 失效即结束 checking；旧 generation 无权写回。恢复/重建需要用户明确重试，网络同步抛错也退出 checking | IMPLEMENTED / OFFLINE PASS；REAL CEP/AE ACCEPTANCE PENDING |
| A07 | `length→stop` 覆盖首原因，终止后内容仍拼接；基线实际 Transport→Adapter→Runtime→Driver 将冲突流接纳到 Review | 首原因不可改写、整帧验证后发布、失败保持；Adapter 将异常收束为稳定错误，合法 DONE 及时结束读取 | IMPLEMENTED / OFFLINE PASS；REAL CEP/AE ACCEPTANCE PENDING |

反例使用实际生产工厂；仅网络、Host 回调和 DOM 边界受控。修复前标量结果在本轮 `.tmp` 下 `before.json`、`before-owner.json`、`before-adapter.json`，最后一项从上述基线 Git blobs 运行，不重建历史材料。

## 最终状态与 owner 契约

| 状态/事实 | 持有者 | 生命周期与边界 |
|---|---|---|
| 当前 acknowledgement | main 的会话内变量 | 撤回先关准入；不是 mutation 授权，不持久化 |
| Panel Provider 启用意愿 | main 的 `velaExperimentalSessionRequested` | 配置保存后才记录本次明确启用；停用/撤回清除 |
| 实际 Provider 可用性 | selected Surface readiness + Composition 准入门 | 当前确认、启用意愿、成功检查共同允许新任务；holder 仍独立限制单 objective |
| readiness/check generation | Surface 的独立 `readinessGeneration` | 不与发送/Review 的展示 generation 混用；失效回调不能覆盖新检查 |
| selected conversation/Surface | Composition selected / 可销毁视图 | 选中和销毁 Surface 不代表活动 Owner 改变；重建不自动发起检查 |
| active objective | Composition 原有唯一 holder → 对应 Owner/Driver | 不建立第二张活动任务表；全局停止和后台取消按 holder 分派 |
| 已派发 Host 与收束 | 原 Runtime continuation、Driver Promise、trajectory association | 执行权限失效与收据收束分开；保留 committed true/false/null，禁止后续 mutation |

停止在生成/Review 时取消并退役旧 proposal/Review；已批准但未派发时走既有 fresh Preflight/失效路径，阻止写入。Host 或 Verify 已在途时，Driver 暂不进入 terminal，保留 holder 直到对应 Promise 收束，然后取消 objective；不会把停用解释成回滚。Verify 的迟到结果不能完成或推进已停止的 objective。多步已完成部分保留。

unused 一次性 Grant 对所有 live conversation 撤回；重新启用不恢复旧 Grant、Review 或 objective。Surface 隐藏/恢复只作废本视图 readiness；面板级 suspend 通过 Composition 停止任务，活动 Runtime 的 suspend 延后至必要回调收束。恢复后用户再启用，不增加自动网络重试。

收束型取消用于面板/会话控制入口；原 Runtime 的 target Verify、Authority post-commit publish、CAS/JIT/replay 和 Driver 既有直接取消边界不被改成可恢复授权。只保留收束所需的本地事实关联，未公开 BoundPlan 或执行句柄。

## A07 流协议契约

支持范围仍为已有单 choice SSE、字符串 text/reasoning/structured delta 与 `[DONE]`。首个非空 finish reason 冻结；同原因的重复空帧允许，不同原因拒绝。首个终止帧可携带最后一段内容；其后新增任何上述内容都拒绝。finish 到 DONE 之间允许空字符串 delta、已有 role/metadata 和 SSE 注释帧，不扩大多 choice/usage-only 帧支持。

Assembler 在整帧验证通过后才拼接/发布；失败后 feed/finish 都不能恢复。Adapter 将流错误标为 `PROVIDER_RESPONSE_INVALID / stream-assembly`，非 stop 终态和缺 DONE 同样拒绝。DONE 停止 reader，不等待 socket EOF；旧请求的迟到 chunk 不会污染下一请求。

合法流完成与后续 Parser 准入仍分开：原有 `stream-completed` 展示不代表 proposal 有效或已授权；Parser 拒绝继续阻断执行。冲突终态、截断、终止后内容走 `stream-failed`，不会先发布正常流完成。

## 改动与验证

- Surface/main：撤回、停用、readiness 重试以及必要控制状态；未做视觉重构。
- Composition/Ownership/Owner/Driver/Runtime/AtomicActivationCoordinator：沿原 holder 停止，保留在途收据；不改通用执行能力。
- StreamAssembler/Adapter：单调终态与一次异常收束。
- 正式反例与组合：[lifecycle suite](../../scripts/test-vela-provider-task-lifecycle.js)、[多会话 fixture](../../scripts/fixtures/vela-provider-lifecycle-harness.js)、[terminal suite](../../scripts/test-vela-provider-terminal-monotonicity.js)、[assembler suite](../../scripts/test-vela-provider-stream-assembler.js)。既有测试仅调整实际改变的流错误归属、清理参数及 main 生产接线装载。

最终稳定生产/测试状态：

| 检查 | 实际结果 |
|---|---|
| focused | 8/8 PASS；其中 lifecycle 208、terminal 73、assembler 29 assertions |
| 按消费者选择的关联回归 | 18/18 PASS，包括 C1 Session/Agent、C2 execution facts、Authority、会话与 Provider/transport |
| 本轮唯一一次全量 | discovered 195 / executed 195 / PASS 195 / FAIL 0 / skip 0（`full-01.log`） |
| 语法 | 20 个变更或新增 JS 文件 `node --check` PASS |
| 文档/格式 | 4 份当前入口/阶段文档、54 个本地链接 PASS；`git diff --check` PASS |
| i18n / consistency | 已生成必要 i18n report；freshness 与 project consistency PASS |
| 范围 | Host、VERSION/manifest、冻结架构、C1 Session/Agent、C2 Preflight/ExecutionAdapter、Protocol 与能力契约无字节变化 |

关联回归初次 16/18；调试日志保留了静态清理断言、Driver 额外公开字段及合法流完成展示的兼容问题。最终保留原 Driver 返回形状和流完成/Parser 拒绝分离契约，修正必要清理参数断言；以上最终结果均来自修正后的代码。历史 193/193 不作本轮新测。

详细命令/日志仅放 `.tmp/vela-evidence/0.3.12/d-provider-task-lifecycle/`；无全仓 hash 或大型 tracked evidence。

## 剩余有限实机验收

1. 无活动任务且草稿自行保留后重载 CEP；从已加载脚本核对本轮模块。真实 Provider 由用户明确启用。
2. A05/A12：ready 与 checking 时分别撤回确认；旧成功回调不复活。重新确认/启用可正常 ready；同 Surface suspend/resume 与会话 Surface 重建分别检查明确重试。
3. A06：A 生成或 Review 时选 B，再全局 Disable；确认 A 收到取消、B 不能发送且后台控制可达。对独立可丢弃目标做一次正常操作对照，以及可可靠观察的 Host 在途/Verify 停用；核对收束前 holder、最终三处 committed 事实与无后续 mutation。不能可靠取得窗口则记 NOT COVERED，不替换真实 Host 方法。
4. A07：当前 Provider 正常流/DONE 对照及取消后新请求；冲突 finish、终止后内容等若真实 Provider 不产生，继续保留受控字节流的离线证据等级，不伪装为真实 Provider 已通过。

本轮未运行真实 Provider/AE，未暂存、提交、推送或创建 PR。A05/A06/A07/A12 分别停在 IMPLEMENTED / OFFLINE PASS / REAL CEP/AE ACCEPTANCE PENDING；不自动 TARGETED_ACCEPTED，不进入 E。INTEGRATED_ACCEPTED / CLOSED 仍留待 0.3.12-G。

## 首轮有限真实 CEP/AE 验收（2026-09-13，历史裁定）

以上为实施轮记录。本次实际环境：**AE 26.0x67 / AdobeCEP 12.0.1 / Chrome 99.0.4844.84 / Windows Win64**；本地 LM Studio endpoint 为 `http://127.0.0.1:1234`，模型 `qwen3.8-27b`，readiness 返回一个已加载实例、Q4_K_M、contextLength 131072。用户确认验收前提并授权通过现有 UI 启用 Provider；一次性 Grant 由用户实际点击授予。

首轮分项裁定（Supplement-01 前，保留原结论）：

| ID | 本次结论 | 接受边界或缺口 |
|---|---|---|
| A05 | **TARGETED_ACCEPTED — 本次 AE/CEP 环境** | ready/checking 撤回、旧成功回调失效、明确重新启用、后台 Review 撤回及 unused Grant 失效取得真实证据；不包含尚未取得的 Host/Verify 在途停止证据 |
| A06 | **PARTIAL / PENDING DISPOSITION** | 后台生成、后台 Review 全局停止及正常 mutation 对照通过；两路 Host/Verify 在途停止与多步后续 mutation 阻断仍 NOT COVERED |
| A07 | **TARGETED_ACCEPTED — 有界真实正常流 + 既有异常字节流组合** | 正常 stop/DONE、Parser 接纳与下游消费通过；取消后新请求也正常完成。冲突 finish、终止后内容、截断、迟到 chunk 隔离仍沿用实施轮受控边界证据，不宣称自然异常或迟到 chunk 已实机覆盖 |
| A12 | **PARTIAL / PENDING DISPOSITION** | checking 撤回后重试及切会话销毁/重建隔离通过；同一 Surface checking 时的实际 suspend/resume 未取得，不能由视图隐藏推导通过 |

**D 未达到 READY FOR COMMIT / PR**。本次在单步 Review 在途代表的 Provider 生成阶段发生 `PROVIDER_TIMEOUT`，按停止纪律结束后续产品动作；不以此猜定 D 生命周期修复的根因，也不把未进入的执行窗口算成 PASS。INTEGRATED_ACCEPTED / CLOSED 仍留待 0.3.12-G，不进入 E。

### 实际代表与观测边界

| 组 | 实际结果 |
|---|---|
| R1 装载 | 正常重载后重新发现 `.debug` 的 8088 target；11 个实际已加载生产脚本与当前工作树正文一致。10 个原字节相同，main 唯一差异为加载时移除 UTF-8 BOM。未 require/eval 第二份页面生产模块、未覆盖生产函数 |
| R1 正常无修改请求 | 真实流 116 帧，首终止原因 `stop`，最后帧 `done`；Adapter `completed`、Parser `accepted / text`、Driver `completed / committed=false`，mutation 派发 0。流完成与 Parser/执行准入分别记录 |
| R2-A ready 撤回 | 撤回后 acknowledged=false、enabled=false、requested=false、providerStopped=true；单独重新勾选仍不可用；明确启用的新检查才恢复 ready |
| R2-B checking 撤回 | 实际检查 generation=5 已开始且尚未回调时撤回；generation 变为 6 并退出 checking。旧请求随后真实返回 ready=true，但被标为 readiness-superseded，未恢复可用性；重新确认并显式检查成功 |
| R2-C 同 Surface suspend/resume | **NOT COVERED**：checking 时尝试正常导航，但没有命中实际 Surface suspend 接线，检查正常完成。没有用不可见状态代替生命周期证据，也没有重复尝试至命中 |
| R2-D 切会话重建 | B 的 checking 实例确实 dispose；旧成功回调到达时 disposed=true、captured=1/current=2。新选中 A 的 Surface 从 generation=0/configuring 开始，没有自动检查；显式启用后正常 ready。采集中的 surface 数字标记关联 sourcePort，实例替换由 dispose、generation 重置与调用顺序证明，不将该数字误当实例身份 |
| R3-A 后台生成 Disable | 控制前 selected=B、holder=A、A=reasoning 且真实 stream-started；全局 Disable 先关准入，再取消 A 的 Provider/Driver，pending 收束后释放 holder。B 收束期间显示活动任务反馈和取消入口；终态不能发送；返回 A 可见“输出流已取消 / 已取消本地请求”。无可执行 Review、无 mutation |
| R3-B 后台 Review 撤回 | A 确实 awaiting-review（20%→60%），selected=B 时撤回确认；A 终态 cancelled、suspendedReview=null、holder 释放。返回 A 可读取消反馈，批准按钮隐藏且禁用；A/B 所查字段不变，mutation 派发 0 |
| R3 unused Grant | 用户实际授予，active=true；有效期内通过设置 UI Disable 后变为 revoked/active=false。明确重新启用后仍 revoked，不恢复权限；无写入、不 Undo |
| R4 正常 mutation 对照 | comp416 / A429 实际 20%→60%，B428 保持 80%；mutation 派发/可靠回调各 1，Agent 对原 A 的 fresh/matches Verify 成功。Driver committed=true、Session tool/result committed=true、trajectory reportedCommitted=true/hostCommitted=true。Host 回调窗口约 29 ms，Verify 约 33 ms。用户一次原生 Undo 后所采 B2 严格等于 B0 |
| R4-A 两步前提 | 实际请求返回 text，logicalPlan=null、actions=0，未形成 opacity→rename 两步计划，目标不变；该多步代表 **NOT COVERED**，未注入提案或执行第二项 |
| R4-A 单步 Review 在途代表 | 按“优先两步”的范围另取普通单步 opacity 请求；真实生成约 120 秒后 Adapter timed-out / PROVIDER_TIMEOUT、Driver blocked / committed=false，未出现 Review，mutation/Verify 派发均 0，目标不变。本次请求 **FAIL — PROVIDER_TIMEOUT**；Host/Verify 在途停止前提未成立，仍 **NOT COVERED**。没有重发或改代码 |
| R4-B / 收尾 R5 | 因上述超时停止，未继续一次性授权在途用例或新增收尾请求。此前 R3-A 取消后，经明确启用的 R3-B、正常 mutation 对照均为新的成功 request，可证明有限恢复；不替代尚未取得的在途取消后恢复或迟到 chunk 证据 |

mutation 计数来自实际 `velaExecutionAdapter` 派发位置，且由正常 mutation 对照验证确实命中；未用最终值、Undo 可见性或 Host 总调用数推定零派发。停止、readiness、holder、Driver、Session、trajectory 和 Agent Verify 由实际页面代码上的不中断条件日志点取得；独立 Host 读数只作验收对照。不暂停 CEP、不延长网络/Host 回调或修改超时，不调用私有执行/停止方法，不构造 Grant。没有取得 Host 回调前或 Verify 回调前的有效 UI 停止窗口，因此两种窗口均不标 PASS。

### 清理与提交面核对

测试资产为独立可丢弃合成 `D_PROVIDER_LIFECYCLE_26_0`（416），A=429、B=428；准备 JSX 与只读探针分开保存。唯一产品写入已由用户原生 Undo 并独立核对恢复。结束时 A=20%、B=80%、原名称及身份保持；会话 A terminal/blocked、会话 B idle、holder=null，没有活动 objective 或遗留暂停。**Provider 仍为用户授权的 enabled/ready，acknowledged=true，unused Grant 保持 revoked**；没有偷偷重新启用或清除用户会话/资产。

23 个本轮日志观测点已全部移除，页面采集标记及临时引用已清理，CDP 采集连接关闭。采集器的局部标记初始化/Node 校验限制单独记录，修正后才执行依赖动作；不与真实 `PROVIDER_TIMEOUT` 或 R2-C 未覆盖混算。

本轮前后 **20 个变更生产/正式测试 JS 哈希全部一致**，维持实施轮最终 **195/195** 基线；实机轮未重跑任何 focused、关联或全量 suite，没有新的离线 PASS 计数。详细命令、有限 trace、回调、目标读数和用户确认仅位于 `.tmp/vela-evidence/0.3.12/d-provider-task-lifecycle/real-ae/`。本轮 tracked 文档仅追加本报告，不生成全仓 hash 或大型 tracked evidence；未暂存、提交、推送、PR、合并或 tag。

本次收尾：47 份证据 JSON、4 个 JSONL 文件解析通过；本报告 4 个本地链接、空白/冲突标记检查通过；i18n freshness、project consistency、`git diff --check` 均通过。JSONL 保留实际任务观察区间，临时观测的错误单列；这些检查不计入离线 suite 数量。

## Supplement-01：真实 CEP 受控生产组合（2026-09-13）

**S1 PASS；S2 六个代表全部 PASS；临时对象清理完成。A06、A12 按用户规定的混合证据边界有界 TARGETED_ACCEPTED，D TARGETED_ACCEPTED / READY FOR COMMIT / PR。** 本轮没有新的真实 Provider 请求、真实 AE mutation 或 Undo，也没有重演首轮正常产品矩阵。

### 装载与隔离

重新发现同一 CEP target；page realm uniqueId 及 11 个生产 scriptId 与原 R1 一致，页面未重载，复用原装载证据。20 个生产/正式测试文件与原 195/195 基线及本轮开始时哈希一致。

探针直接使用当前页面 `VelaSurfaceController`、`VelaConversationComposition`、`VelaConversationOwnership`、Owner/Driver/Session/Runtime 及其已经装载的 Authority/Parser/Preflight/Adapter 依赖。构造关系按既有 [lifecycle fixture](../../scripts/fixtures/vela-provider-lifecycle-harness.js) 和 [trajectory fixture](../../scripts/fixtures/vela-trajectory-harness.js)；未 require/eval 第二份生产模块。Node 内置 crypto 仅提供环境接口所需的同步摘要与随机数。受控 `environment.fetch`、`invokeHost` 只注入新建 Runtime，未替换 live Runtime、全局 CSInterface/fetch 或模块导出。

临时 Composition 使用自身唯一 holder；每个代表新建独立 A/B Owner、Session、Runtime 和隐藏的独立 DOM 容器。授权来自该隔离 scope 的正常 `sourcePort.authority.grant()`→生产协调器链；未手写受信身份、借用用户 Grant 或连接真实执行端口。停止调用临时 Composition 的公开面板级入口，不宣称真实 UI Disable。

### S1：同实例 Surface 生命周期

当前 main 接线确实存在：普通 registry 工具打开路径调用 Surface suspend，返回 Home/工具关闭路径调用 resume；`visibilitychange` 隐藏时进入 `suspendPanelRuntime`，显示时经 `recoverPanelRuntime`→`resumePanelRuntime`（Home 激活时 resume Surface）。`pagehide`/`beforeunload`/`unload` 为关闭路径，不能与同实例恢复混同。首轮导航未命中不代表这些路径不存在。

真实页面生产 SurfaceController 配合真实 DOM、受控 readiness Promise，通过其公开 API 完成：mount→checking→suspend→resume→释放旧成功结果→明确重试→ready。页面内严格引用比较确认始终为同一实例，未 dispose/重建来替代恢复。

- 第一次 checking：readiness generation=1、检查次数=1。
- suspend：generation=2，退出 checking；resume 后检查次数仍为 1，无自动网络重试。
- 旧成功回调：captured=1/current=2，返回 readiness-superseded，enabled 保持 false。
- 明确重试：generation=3、检查次数=2；新结果返回后同实例 experimental-ready/enabled=true。

10 个页面断言通过，generation 由只针对临时 S1 容器的可移除只读日志点取得。**证据等级为真实 CEP 页面生产 Surface / 受控 readiness / 公开生命周期 API 探针**；正常 UI 在 checking 时触发同实例 suspend/resume 仍 NOT COVERED。

### S2：实际多会话生产组合在途收束

下表数字全部属于**构造边界的受控 Host**，不是实际 AE 写入证据。每例仅有 1 次 mutation 派发；false/null 回调的来源明确保留。

| 代表 | 停止时实际等待点 | 回调来源与最终 committed | 替身写入 / Verify 派发 | 结果 |
|---|---|---|---|---|
| Review，两步计划 | 第一项 Host 回调未返回 | 成功结果及 resultingValueDigest → true | 1 / 0 | PASS；第二项 rename 派发 0 |
| 一次性 opacity | Host 回调未返回 | 成功结果及 resultingValueDigest → true | 1 / 0 | PASS |
| Review | Host 成功已返回，Verify 未返回 | 可靠写入事实 true；迟到匹配 Verify 不改为 completed | 1 / 1 | PASS |
| 一次性 opacity | Host 成功已返回，Verify 未返回 | 可靠写入事实 true；迟到匹配 Verify 不改为 completed | 1 / 1 | PASS |
| Review，明确未写入 | Host 回调未返回 | HOST_EXECUTION_VALUE_MISMATCH / mutationCommitted=false → false | 0 / 0 | PASS |
| 一次性 opacity，提交不确定 | Host 回调未返回 | HOST_EXECUTION_MUTATION_FAILED / mutationCommitted=null → null | 0 / 0 | PASS；未把替身内部计数推定为 Runtime 的 false |

六例各自按真实生产路径到达 awaiting-outcome 或 verifying；控制前严格确认 selected===B、activeRecord===A。公开停止入口关闭准入并抵达 A；回调仍未释放时 A 非 terminal，holder 始终为同一 A。普通新请求先得到 PROVIDER_SESSION_DISABLED；随后明确恢复临时可用资格、开放 Provider 准入，再次尝试 B 得到 **CONVERSATION_OBJECTIVE_BUSY**，且没有 B 的网络请求。这直接证明 holder 保留，不是根据 Provider 禁用状态推断。

释放受控结果后，原 A 均以 cancelled 收束；Driver committed、Session 唯一 tool/result 的 committed、trajectory reportedCommitted/hostCommitted 一致保留 true、false 或 null。两条 Verify 用例的实际生产 trajectory 记录 fresh/matches=true，但 Driver 仍 cancelled，没有完成或推进任务。逐例 trace 的“派发→停止→重新开放但 holder 阻止抢入→释放回调→holder 释放”顺序全部成立。

两步代表的响应仅从受控 fetch 提供，经过真实 Parser、logical-plan 准入及首项 Review；公开 Driver 投影 stepCount=2。停止后首项写入事实 true 保留，completedStepCount=0（未捏造 fresh Verify 完成），第二项 rename 派发为 0，替身原名称不变。**这不是实际模型两步停止验收。**

每例收束后明确重新启用，在 B 经实际生产链完成一个新受控请求；无 busy 遗留，A 原终态/提交事实不变，旧 Review 收据保持 stale、旧 Grant 不恢复。S2 六例共 162 个页面断言通过，计数不属于离线 suites。

采集前置错误单列保留：首次两步采集器误读取 Driver 投影的 `declaredStepCount`，而当前公开字段为 `stepCount`；在批准前断言中止，零 mutation，清理完成。仅修正 `.tmp` 字段读取后进行有效探针，原脚本/失败返回及更正说明均保留；未改生产或正式测试，也未将采集错误混作产品失败。

### 清理、边界与 G 阶段欠项

所有临时 Surface、Composition、Owner/Session/Runtime、订阅和 DOM 均在 finally 中清理；Owner disposed、Session closed、Runtime disposed、受控待回调数 0，页面临时容器数 0。S1 两个日志点已移除，无暂停或全局临时生产对象引用。

页面内前后比较确认 live 会话选择/列表、草稿、Provider 确认与状态、状态投影、配置存储及原 factory/CSInterface/fetch 引用不变。真实 Host 只读对照的 project item count、active comp/time/selection、comp416 的 A429/B428 身份/名称/opacity/parent 不变；本轮没有真实执行派发。结束时 live Provider 仍 enabled/ready、acknowledged=true，旧 Grant 未复活，原 blocked 终态保持。

以下继续作为 G 阶段复核欠项，不因本轮混合证据而升级：

- 自然 Host/Verify 在途窗口内的真实 UI Disable：NOT COVERED。
- 同 Surface checking 时正常 UI 触发 suspend/resume：NOT COVERED。
- 实际模型形成两步计划后的在途停止：NOT COVERED；本轮为受控 Provider 生产组合。
- 首轮真实 PROVIDER_TIMEOUT：保持 FAIL，根因未明；本轮未解释、修复、延长超时或修改模型/上下文配置。

仅更新本报告；本轮原始脚本、有限 trace、结果与清理证据放 `.tmp/vela-evidence/0.3.12/d-provider-task-lifecycle/real-ae/supplement-01/`，不覆盖首轮证据、不生成全仓 hash。20 个生产/正式测试文件保持最终 195/195 基线；未重跑 suites，未提交、推送、PR、合并或进入 E。INTEGRATED_ACCEPTED / CLOSED 仍留待 0.3.12-G。

Supplement-01 收尾检查通过：新增证据 JSON/JSONL 解析、本报告 6 个本地链接与格式、i18n freshness、project consistency、`git diff --check`。没有新增离线 suite 运行记录。
