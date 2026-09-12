# 0.3.12-C1 / A04 — Session Event Correctness

当前（2026-09-13）：**A04 TARGETED_ACCEPTED — AdobeCEP 12.0.1 / Chrome 99.0.4844.84（Windows Win64）/ READY FOR COMMIT / PR**。基线 `dev@af6f89ad921a2d874fd4a8fd73162a4f5e295020`，分支 `fix/vela-session-events-a04-0.3.12`。A09 已经 PR #207 合并，不重新打开其验收。

范围依据：[指导书 A04](../design/vela-0.3-reconstruction-guidance.md#a04--session-重入订阅异常和可变-payload-破坏事件语义)、[Session contract](../design/vela-agent-runtime-contract-foundation-0.3.3.md)、[冻结架构](../design/vela-agent-architecture.md)。详细诊断与测试日志仅保存在本机 `.tmp/vela-evidence/0.3.12/c1-a04/`。

## 实际接线与最小反例

`client/index.html` 装载生产 [SessionRuntime](../../client/js/vela/velaSessionRuntime.js)；Owner → AgentRuntime 创建并订阅 Session，Driver 经 Owner 的 `appendSessionEvent` 写入。Runtime 使用同一受信 Session 的 Authority appender；Delegation / AtomicActivation coordinator 依赖 append 立即返回确切收据、完成 evidence / grant / activation 事务后，Runtime 才 `publishCommitted`。模块原“未接线 skeleton”注释已纠正。

基线生产模块直接运行结果（`before.cjs` / `before.json`），以及扩展正式 suite 对基线生产 factory 的失败（`formal-before.cjs` / `formal-before.log`）：

| 最小条件 | 修复前实际结果 | 根因 |
| --- | --- | --- |
| listener 1 收到 A 时 append B | 日志 A/B；外层返回 B；通知 `1:A,1:B,2:B,2:B` | 每次通知和 return 重读日志末项 |
| 首个普通 listener 抛错 | 日志已提交 1 项；append 抛错；后续 listener 与诊断均未执行 | 普通通知缺少异常隔离 |
| 首个 listener 自退订并新增 listener | 收到 `first,new`，原 second 被跳过 | 遍历可变订阅数组 |
| 嵌套 payload 对象 | 原对象与 event.payload 同一对象，调用方也被冻结 | 直接冻结输入 |
| payload getter / 抛错 getter | 冻结事件的 fact 从 1 变 9；或日志 0 项而 lastSeq=1，下一项 seq=2 | 读取 accessor；seq 在验证/冻结完成前推进 |
| Authority A 发布中再 append/publish B | 收据正确且 append 静默，但通知 `1:A,1:B,2:B,2:A` | Authority 发布同样递归遍历订阅者 |

这些是本地 JavaScript / 实际生产模块反例，不是模型 JSON 注入或 Authority 伪造成功。原历史验收不作为本轮新测。

## 最终契约与最小修复

| 边界 | 契约 |
| --- | --- |
| 收据 / 日志 / 通知 | 始终为该调用创建的同一冻结 event；seq 在独立快照验证成功后推进。失败不写日志、不消耗 seq。 |
| 同步重入 | 按**发布调用顺序** FIFO，同一发布的订阅者先收完 A，再收 B；嵌套 append 立即返回已提交 B，B 的通知延至当前订阅者快照结束，仍在最外层调用返回前同步收束。没有 Promise、计时器或异步调度。 |
| 订阅隔离 | 每次发布固定当时的订阅者快照；新增/退订只影响后续发布，已进入快照的 listener 仍收到该项。相同函数的不同订阅有独立、幂等退订句柄。Authority 在 publish 时捕获快照，不在 append 时捕获。 |
| close | 幂等，立即停止剩余当前回调与排队通知；已提交日志/收据保留，getEvents/getEventBySeq/project 仍可读。新 append、publish、subscribe、getSnapshot 拒绝 SESSION_CLOSED。 |
| 异常 | listener 与错误处理器分别隔离；普通通知使用 `onListenerError(error,{phase:"session-post-commit",event})`，Authority 保留 `authority-post-commit`。Agent 仅补一行，把 Session 错误接入已有 Agent/Owner reporter。 |
| Authority | 私有 WeakSet/WeakMap 身份、分类/白名单、公开返回形状不变；append 不发布，Runtime 事务完成后显式发布，入队前即消费一次发布保护。普通同形事件、复制/replay、同名 Session、跨 Session 均不能获得受信身份。 |

普通合法顺序及按序显式发布的 Authority 序列，其 push 与 replay/project 结果一致。**延后发布不承诺全局 seq 通知顺序**：未发布 Authority seq=N 后可先通知普通 N+1；不会为了排序而提前发布 Authority。`project` 仍要求纯 fold，不扩大为允许 fold 写 Session。

已核对同步消费者：Agent projection 仍在外层 append 返回前推进；实际 Agent 的重入用例得到 `first:1, returned:2, second:1, first:2, second:2`。Authority coordinator 获取收据 / 验证 evidence / 完成事务的同步依赖保持，无需修改 Runtime 或事务实现。

输入只通过 own-property descriptor 读取，复制后冻结；不调用 getter/setter/toJSON，不用 JSON 序列化代替验证。规则明确为：

- 输入须为普通或 null-prototype 对象；kind 为合法 own 字段，requestId 非字符串归 null，seq/family 由 Session 生成，额外顶层数据不保留。顶层 accessor（包括非枚举）及 symbol key 拒绝。
- 按 foundation 保留缺失/非普通对象的根 payload → `{}`；不遍历被丢弃的根 payload。保留的 payload 只含普通/null-prototype 对象、数组及 null/undefined/字符串/布尔/有限数字；数组保留 holes，undefined 保留可选字段语义。
- 所有保留的 own 数据（含非枚举字段）独立复制；嵌套 accessor、函数、symbol、BigInt、非有限数、Date/自定义实例、循环引用、数组额外属性拒绝 SESSION_EVENT_INVALID。特殊键按数据定义，不赋值改变 prototype。
- 反射/复制异常在提交前拒绝，并阻止规范化期间重入 append；这不是针对任意恶意 Proxy 或全局原型篡改的 JavaScript 沙箱。现有可选内存 persistence seam 未改造，也不据此恢复 Authority。

生产改动仅 SessionRuntime 与 AgentRuntime 的 reporter 接线；不改变 C2 committed/no-op/Verify、Provider 生命周期、Host JSX、ACK/TBB、UI、包版本或冻结架构。AGENTS / PROJECT_STATE 仅精简重复历史为当前摘要和原报告链接。

## 实施轮离线验证

实施轮最终生产/正式测试状态，Node **v24.14.0**；下列结果在本次 CEP 验收中均未重跑：

| 检查 | 实施轮实际结果 |
| --- | --- |
| `node scripts/test-vela-session-runtime.js` | **279 assertions PASS**；普通与 Authority 两条入口均覆盖重入、订阅变化、异常、close、输入独立/拒绝原子性；另含合法 push/replay、信任隔离。 |
| 实际消费者关联回归 | **12 suites / 932 assertions PASS**：AgentRuntime 158、Owner 73、Driver 223、EvidenceResolver 24、DelegationCoordinator 44、AtomicActivation 18、Authority production composition 18、ActivationGate 52、Runtime 93、Conversation ownership 74 / composition 89 / switcher 66。 |
| `node scripts/run-all-tests.js`（最终稳定状态仅一次） | **192 discovered / 192 executed / 192 PASS / 0 FAIL / 0 skip**。独立实施轮结果，不继承 A09 的同数值历史结果。 |
| 静态与范围 | 5 个修改 JS 的 `node --check`、Markdown 文件/锚点链接、实施轮本地 JSON 解析、格式 / `git diff --check`、i18n freshness、project consistency 均 PASS；未生成 i18n 报告差异。 |

全量后仅改文档；5 个生产/测试文件与全量前记录逐一 SHA-256 一致。AGENTS 稳定规则保留，修改范围仅 2 个生产文件、3 个既有 suite、AGENTS / PROJECT_STATE 和本报告；无新增 suite/fixture 或 tracked JSON，raw 继续 ignored。日志包括 `before.json`、`formal-before.log`、`focused-*`、`related-final-*`、`full.log` / `full-results.json`、`static-results.json`，不生成全仓 hash 清单。

实施轮未操作真实 AE / CEP / Provider；随后有限真实 CEP 验收单列如下，不能据此扩写离线或整链实机覆盖。

## 有限真实 CEP 验收

用户回复“我已重载面板”后，由 `.debug` 的 8088 端口重新发现当前 Lomond Cabinet 页面 target。实际环境为 **AdobeCEP 12.0.1 / Chrome 99.0.4844.84 / V8 9.9.115.10 / Windows Win64**。无 AE 重启、测试工程或 Provider 启动。

| 组 | 实际结果与边界 |
| --- | --- |
| R1 装载 | **PASS**。DevTools `Debugger.getScriptSource` 取得的 SessionRuntime / AgentRuntime 全文与当前工作树逐字节一致；页面 factory 的函数源码属于对应已加载脚本，全局绑定不可改、模块被冻结。核对 dataDescriptors、session-post-commit、同步队列及 Agent reporter 接线；没有 require/eval 第二份模块。 |
| R2 通知 / 订阅 / 异常 / close | **20/20 PASS**。确切 A/B 收据、日志及 `1:A,2:A,1:B,2:B`；嵌套 B 立即提交、外层返回前通知收束；自退订/新增快照和同函数独立句柄正确。独立 Session 与实际临时 Agent 各包含一次预期 listener 抛错和 reporter 再抛错，均隔离；Agent projection 同步推进。close 后只留下 A 的首个回调，A/B 日志保留，关闭后的读/写契约通过。 |
| R3 快照 / 拒绝原子性 | **16/16 PASS**。嵌套输入可修改、事件独立冻结；枚举/非枚举 getter 均零调用，拒绝前后日志长度与 lastSeq 分别保持 1/1、2/2，后续合法 append 无缺口。页面 realm 内用严格身份、descriptor、Object.isFrozen、own-key / in 检查 undefined、holes 和 null-prototype；没有用 JSON 往返证明这些性质。 |
| R4 Authority 发布隔离 | **18/18 PASS**。append 受信确切 event 且无通知，append 后加入的 listener 在 publish 时入快照；局部完成标志仅为探针，A/B 按 FIFO 且只见 complete。普通同形/复制/跨 Session 拒绝 UNPUBLISHABLE，重复 A/B 拒绝 ALREADY_PUBLISHED；延后发布得到合法通知 seq `[2,1]`，日志仍按 append 顺序。未创建 Runtime Grant 或真实执行权限。 |

R2–R4 共 **54 项有限页面断言 PASS**，不是移植或重跑 279 项正式 suite。所有引用身份、访问器计数与数据表示判断均发生在当前 CEP 页面，只返回必要标量和 trace。主动制造的预期异常及信任拒绝单列，不计作产品失败；初始 PowerShell target 数组投影显示 null 是 R1 前的采集器显示问题，已用实际 JSON 区分记录。

三个行为组各自 `finally` 清理完成：**9 个独立 Session 全部 close，1 个临时 Agent dispose 且其 Session 已关闭**；CDP object group 已释放，探针仅用局部 IIFE，没有挂载全局临时引用或连接当前会话/Runtime。无遗留临时订阅或排队通知。

必要脚本、原始 callback、有限 trace 及两份 5 文件基线核对放在 `.tmp/vela-evidence/0.3.12/c1-a04/real-cep/`：`r1-load.json`、`r2/r3/r4-result.json` 与对应 page 脚本 / callback；raw 继续 ignored，无 tracked JSON 或全仓 hash 清单。收尾确认 5 个生产/正式测试文件与实施轮基线一致；本次仅改报告和 AGENTS / PROJECT_STATE，文档链接/JSON/格式、i18n freshness、project consistency 检查 PASS，未重跑任何离线 suite。

**接受边界仅为当前页面生产模块 / 临时 Agent 的有界 CEP 验收，不代表完整 Provider→Authority→Host 任务链重新验证。** INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G，不进入 C2；未暂存、提交、推送、创建 PR 或合并。
