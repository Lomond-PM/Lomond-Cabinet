# 0.3.12-C2 / A02 + A03 — Execution Facts & Target-Bound Verification

当前：**A02、A03 分别 TARGETED_ACCEPTED — AE26.0x67 / AdobeCEP 12.0.1 / Chrome 99（Windows Win64）；C2 READY FOR COMMIT / PR**。分支 `fix/vela-execution-facts-a02-a03-0.3.12`，基线 `dev@cacc25ef729eb85d6f70c553b3fca76a86803568`。A04 已通过 PR #208 合并，保持既有 TARGETED_ACCEPTED。

| 项目 | 当前状态 |
| --- | --- |
| A02 目标关联 | TARGETED_ACCEPTED — AE26.0x67 / AdobeCEP 12.0.1 / Chrome 99；两路正常目标、同值改选、切合成、R3-3b 原目标改值与 typed rename 均通过 |
| A03 执行事实 | TARGETED_ACCEPTED — 同一实际环境；两路 mutation/no-op、Verify 失败保留 committed=true、no-op→Reject 已完成部分及 rename 提交事实均通过 |

范围依据：[指导书 A02/A03](../design/vela-0.3-reconstruction-guidance.md)、[冻结架构](../design/vela-agent-architecture.md)、[现有 trajectory 契约](../design/vela-verified-trajectory-0.3.10-a4a.md)。实施轮未操作真实 AE/Provider；后续有界实机结果见下文。详细日志仅在 `.tmp/vela-evidence/0.3.12/c2-a02-a03/`，实机采集位于其中 `real-ae/`。

## A02 / A03 最小反例

使用实际 Driver、Owner、Runtime、Session、Bridge、Preflight、Adapter、Review/Authority coordinator 组合，仅 Provider/Host 边界受控。`before.json` / `before.log` 保存实施前 18 个有限代表；Host 读取请求、mutation 派发、模拟实际 setter 分开计数。

- **A02 已复现（直接授权）**：执行 A 后改选 B；B 同值时会完成，B 异值时会阻塞。A 随后改值或删除但 B 同值时仍会完成。旧 final Verify 确实读取当前选择，trajectory 如实保留 targetRelation=unproven。**显式 Review 未复现此缺陷**：原一次性 committed-target 句柄读取 A，能发现 A 改值/删除。
- **A03 已复现（两路）**：Review mutation 与 no-op 均约化为不带 committed 的 verification-required，Driver 都记 true；直接授权也把真实 `{committed:false}` no-op 约化成 executed/true。no-op 实际 0 派发/0 写入但 Session 为 true。失败和不确定分支还丢失了向 Driver/Session 的提交事实。

## 最终契约与变更范围

- 两条 Driver 路径都由 Runtime 持有同一个种类的私有 continuation：绑定 objective/task/Session/turn/TaskPlan revision/step、capability 和 typed expectation。Composer 或 Atomic coordinator 给出本地 executionPlanId；Preflight 的终态回调必须匹配该 plan，才交付原有 Bridge 私有验证能力。Verify 一次消费，完成或取消/reset/suspend/dispose 后失效；旧回调不能完成新 objective。
- Bridge 在 fresh Preflight 中为确定目标建立候选，在可靠写入或明确 already-satisfied 后启用；最终读取仍使用原合成 id、图层 id/index 及属性/attribute 身份。当前选择不参与替换。A 改值会 mismatch；A 删除、身份漂移或无法读取会 unverified/blocked；切合成本身不等于目标消失，原合成仍可读时允许验证 A。沿用现有 Host 接口，**没有修改 Host 或扩大执行能力**。
- `fresh && matches` 必须同时具有本地 `targetRelation=committed-target` 才能完成。这个既有标签也用于 no-op 的确定目标，**不表示发生过写入**。request→Review 之前允许重新绑定的历史语义不变；Review barrier、JIT、fresh Preflight、digest/CAS 和 replay 检查不变。
- `committed=true` 仅随可靠执行结果传播；合法 no-op 或明确未执行为 false；未知为 null。`verification-required` 仅表示后续步骤。已知 true 遇到 Verify 失败仍为 true；迟到同值读数不能把 null 变 true。不确定结果不自动重试 mutation，取消不宣称回滚。
- Driver snapshot 的 committed 描述**最近尝试**；Session `tool/result` 保存每次尝试的 committed/disposition 和安全逻辑 id；post-action 事件分别保存 fresh、matches 和 targetRelation。Owner trajectory 保持 reportedCommitted 与 hostCommitted 独立：no-op 为 false / null，Host 未调用；有直接未执行事实时 reportedCommitted=false。多步此前完成项保留，后项失败不抹掉前项事实。
- 没有新事件框架或授权模型。Session 的精确收据、data-only/FIFO、Authority 事务后发布均保留；事件不含 BoundPlan、native binding、nonce 或执行句柄。同步发布引发取消后会再次检查原 objective。Authority 预算耗尽只影响授权生命周期，不能作为 committed 证据；保留兼容入口的诊断也改为采用结果三态。

| 变更位置 | 有界改动 |
| --- | --- |
| Runtime / Driver | 两路私有目标关联、一次消费及取消隔离；执行/验证事实传递与完成判定 |
| ConfirmedAuthorityComposer | authority-ready 向私有 Runtime 返回已持有的 executionPlanId，无公开事件扩权 |
| Preflight / ExecutionAdapter | 区分派发前 false、派发后 unknown 和可靠结果；错误映射保留事实 |
| AgentRuntimeOwner | 直接 not-executed 事实投影为 reportedCommitted=false |
| 正式 suite / fixture | 实际组合反例与边界对照；旧基线仅排除 C2 有意新增/修正的 Driver/Session 字段，其余 wire、Host 请求、历史事件顺序仍精确对照 |

A04 SessionRuntime/AgentRuntime、Bridge、Host JSX、普通工具、Provider 生命周期、UI、包版本和冻结契约均未改。

## 离线结果

- 新 focused：**597 assertions PASS**。包括两路 A/B 同值/异值、A 改值/删除/index 漂移、切合成、错误验证身份、no-op 目标变化、false/null/true 错误、已写入但 Verify 失败、延迟 Verify 跨取消/新 objective、同步 Session 发布取消、rename mutation/no-op、明确未执行，以及 no-op 后续步骤失败。
- 关联：原 22 个 suite 全部通过；首次全量发现的两个历史比较 suite 调整精确预期后也通过（conversation ownership 77、observation turn isolation 79）。关联合计 **24/24 PASS**，A04 Session 的 279 assertions 保持通过。
- 首次全量：**193 discovered / 193 executed / 191 PASS / 2 FAIL / 0 skip**。两项失败为历史 Driver/Session 全对象等价预期未包含本轮事实变更；保留 `full.log` / `full-result.json`。仅调整上述两个正式测试，原 16 个生产/测试文件字节未变。
- **最终稳定状态全量：193 discovered / 193 executed / 193 PASS / 0 FAIL / 0 skip**，见本地 `full-final.log` / `full-final-result.json`。最终状态完整运行一次；不覆盖首次结果。18 个变更 JavaScript 文件语法、i18n freshness、project consistency、JSON/文档链接、diff 和受限文件范围检查通过。

原反例、最终 focused、各关联日志及两次全量分开放在本地 evidence 路径；不新增 tracked raw/全仓 hash 清单。受控 Host 的请求、mutation 派发和模拟 setter 计数分开，均不宣称实机写入证据。

## 首轮有限真实 AE / CEP 结果（2026-09-13）

用户确认无活动 objective、草稿已保留、允许独立合成及本地 Provider 验收后，正常重载 CEP 并重新发现 `.debug` target；用户通过设置 UI 重新启用 Provider。实际环境为 **AE 26.0x67 / build 67、AdobeCEP 12.0.1 / Chrome 99.0.4844.84、Windows Win64**。R1 对六个模块的实际 `Debugger.getScriptSource` 与工作树逐字节比较，并核对页面实际 factory，全部一致；没有加载第二份模块或覆盖 Runtime/Host 方法。

产品请求、Review 和一次性授权均通过现有 Vela UI。用户完成首个 Review 批准后明确授权后续面板操作；原生 AE 改选、改值和 Undo 仍由用户完成。观测为可移除的 DevTools logpoint：实际 Adapter mutation 入口及回调、Bridge 最终 Verify 请求及回调、Runtime continuation/Verify、Driver snapshot 和 Session 事件，结合现有 trajectory 诊断及独立 Host 读数。首个 mutation 校准入口命中一次；no-op 的零派发覆盖请求前至任务终态的完整区间。

| 代表 | 实际结果 |
| --- | --- |
| R1 装载 | PASS；真实脚本/页面 factory 对应当前六个生产模块，初始化无错误 |
| R2-A Review mutation | PASS；合成 389 / A 401：20→60，B 402 保持 80；派发 1、原 A fresh Verify 1；Driver/Session/trajectory committed=true，hostCommitted=true；一次 Undo 严格恢复 B0 |
| R2-A Review no-op | PASS；真实 60→60 Review 后进入 already-satisfied；派发 0、原 A fresh Verify 1；committed=false，reportedCommitted=false / hostCommitted=null；B0/B1 零差异，不 Undo |
| R2-B 一次性授权 mutation | PASS；A 30→65，B 不变；派发 1、原 A fresh Verify 1；三处提交事实为 true；一次 Undo 严格恢复 B0 |
| R2-B 一次性授权 no-op | PASS；65→65 进入 already-satisfied，派发 0、原 A fresh Verify 1；三处事实为 false，hostCommitted=null；B0/B1 零差异，不 Undo |
| R3-1 同值改选 | PASS；A 20→70 后用户改选 70 的 B，Agent 仍请求 389/401 并 verified-match/completed；一次 Undo 恢复 A，属性/身份零差异 |
| R3-2 异值 B + 切合成 | PASS；A 25→75 后用户切到合成 403 / B 415（15），Agent 仍请求 389/401 并 verified-match/completed；另一 B 保持 15；一次 Undo 恢复原 A，属性/身份零差异 |
| R3-3 原目标改值负向 | **NOT COVERED — 采集准备前提失败**，详见下文；不判产品 FAIL，不重发 |
| R4 多步 no-op→Reject、普通 rename | **NOT RUN**；停止后续产品验收，待裁定 |

R3 三次暂停均实际命中 `verifyCommittedAction` 中 `record.verificationPlanId = null` 之前：可靠 Host 回调已返回、`committed=true`、executionPlanId 与 verificationPlanId 一致，最终 Verify Host 派发尚为 0。暂停期间不发 evalScript，不修改计时器、有效期或关联字段。R3-1/2 的 Agent 自身请求/回调证明原目标关联，不以独立后置读取代替。

**R3-3 未覆盖原因**：准备脚本给合成 389 的 A 设为 20、B 设为 80 并调用 `openInViewer()`，但保存的 B0 中 `activeCompId` 实际仍为 403。采集器遗漏了发送前的活动合成断言。真实 UI 请求因此对当前 403/415 执行 15→80，后续 Verify 也读取同一 403/415 并正常完成。暂停时用户修改的是另一对象 389/401（20→35）并改选 402；这不是“实际执行目标被改值”的反例。原始 B0、派发目标、暂停关联、Agent 回调、独立两合成读数和用户确认均保留在 `r3-3-*`，不得把此 completed 解释成 A02 错误目标完成，也不得把它列为负向 PASS。后续产品请求已停止，未尝试重发至通过。

首次 Session logpoint 的采集器转义问题使早期事件未被直接记录；通过既有 Owner 的只读 Session snapshot 补齐，随后修正采集条件，补采点及时移除以避免重复历史快照。另一次暂停帧的本地变量作用域错误仅重做只读采集。两者均与产品错误分开留存，没有生产修改或产品重试。

恢复与清理完成：R2 两次、R3 正向两次产品 Undo 均核对通过；未覆盖用例先单独 Undo 用户的 A 改值（35→20），确认另一 B 仍为 80，再单独 Undo Vela 修改（另一 B 80→15）。合计 **5 次产品 Undo + 1 次用户改值 Undo**，所查属性/身份恢复，选择/活动合成变化单列。全部临时断点/logpoint 已移除、调试连接及采集引用已释放，无遗留暂停、临时页面订阅或活动 objective；保留正常对话、配置与测试资产。

实机轮未运行 focused、关联或全量 suites；193/193 仍归属上面的最终实施轮。最终 **18 个生产/正式测试 JavaScript 文件与该基线 SHA 全部一致**，本轮仅改文档并在 ignored 路径保存有限证据。JSON/JSONL 解析、五份当前文档的 70 个本地链接与格式、i18n freshness、project consistency、`git diff --check` 均通过；没有 Git 写操作。

首轮停止时，R3 原目标改值、R4 多步 no-op→Reject 与 typed rename 尚待补验；当时 A02/A03 未升级 TARGETED_ACCEPTED，C2 未标 READY FOR COMMIT / PR。旧 R3-3 的 **NOT COVERED — 采集准备前提失败** 及原始证据保持，不改记产品 FAIL。

## Supplement-01：三项原定补验与最终裁定

仅补 R3-3b、R4-A、R4-B，raw 位于 `real-ae/supplement-01/`。重新发现的 target、六个实际 script ID、已加载源码 SHA、页面 Session/终态身份与前轮一致，AE 仍为 26.0x67；复用 R1，不重载、不重跑已通过矩阵。开始与结束均无活动 objective、无遗留暂停。

R3-3b 复用恢复后的 389/401/402，由用户明确激活合成并仅选 A。授权前及紧接发送前的真实只读断言均满足 active comp=389、selectedLayers=[401]、A=20/B=80、原身份及普通静态 Text 条件。可靠执行后沿原断点窗口再核对：唯一 mutation 请求确为 389/401、参数 80、Host 成功收据与 requestId 对应、committed=true、executionPlanId 与验证关联一致，最终 Verify Host 派发仍为 0；成立后才请用户改值。暂停期间不发 evalScript，不改有效期或生产函数。

| 补验 | 实际结果 |
| --- | --- |
| R3-3b 原目标改值 | **PASS**；用户确认实际 A 80→35 并改选 B=80 后，Agent 请求仍为 389/401，fresh 读到 number 35，相对 80 为 verified-mismatch；终态 blocked / AGENT_DRIVER_TASK_UNVERIFIED。Driver、Session、trajectory 保留 committed=true（reported/host 均 true）；全区间 mutation 仅 1 次，未自动重写。独立读数 A=35/B=80。先 Undo 用户改值使 A=80，再 Undo Vela 使 A=20，两步独立核对，最终 B0 零差异 |
| R4-A no-op→Reject | **PASS**；Provider 真实形成 opacity20→rename 的两步计划。第一步 Review 20→20 后 already-satisfied，原 A fresh Verify 通过，committed=false、reportedCommitted=false / hostCommitted=null。第二步在真实 rename Review 上 Reject。整个 objective mutation 派发 **0**，B0/B1 零差异；终态 rejected / REVIEW_REJECTED、coverage=partial，完成 1/剩余 1，Driver partialCompletion=true；第一步 completed 记录及 Session 事实保留，第二步明确未执行。不 Undo |
| R4-B 普通 rename | **PASS**；经真实 Review 对 A401 执行 C2_A→C2_A_RENAMED，派发 1 次；Agent 自身 observeCommittedLayerAttributeValue 读取原层，string expectation/actual 一致且 fresh matches。Driver/Session/trajectory 提交事实为 true；一次原生 Undo 严格恢复 B0、身份和名称 code units `[67,50,95,65]` |

证据按 objective/step/attempt 关联。R4-A 初段的本地 Node 采集回调沿用了旧 case 标签，事件本身完整；依据发送前 trace index 与 objective_agent_9 校正采集投影并改用可变上下文，原始 JSONL 标签保留并单独说明。未重发产品请求、未覆盖旧 R3-3、未修改生产或正式测试。

补验的两次产品 Undo 与一次用户改值 Undo 均核对通过；全部临时断点/logpoint、调试连接及采集引用已清理，保留正常对话、配置和资产。**18 个生产/正式测试文件仍与最终 193/193 基线逐字节 SHA 一致**；本轮 suites 运行数为 0。补验 JSON/JSONL、五份文档的 70 个本地链接与格式、i18n freshness、project consistency、diff 及有限 scope 检查全部通过；raw 继续 ignored，没有 Git 写操作。

结合首轮已通过结果，分别裁定 **A02 TARGETED_ACCEPTED**、**A03 TARGETED_ACCEPTED — AE26.0x67 / AdobeCEP 12.0.1 / Chrome 99**；**C2 READY FOR COMMIT / PR**。迟到 Verify 跨取消、不确定/异常 Host 返回及 publication 内重入保持原离线证据等级，真实条件仍 NOT COVERED，不扩写为全部故障实机通过。不进入 D；INTEGRATED_ACCEPTED / CLOSED 留待 **0.3.12-G**，不提交、推送、PR 或合并。
