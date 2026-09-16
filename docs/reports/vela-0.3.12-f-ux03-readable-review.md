# 0.3.12-F / UX-03 — Minimum Readable Review

当前：**UX-03 TARGETED_ACCEPTED — 有界混合证据 / F READY FOR COMMIT / PR**。分支 `fix/vela-review-readability-ux03-0.3.12`，基线 `dev@ba383a4c9160dca4263503856c072d1acc1b77e1`。接受依据为既有真实单步 Provider/AE、长名称 Review 与 CEP 可读性，本轮当前 CEP 完整生产组合的受控两步补验，以及最终 197/197 离线回归。真实 Provider 两步端到端仍 **NOT COVERED**；原 `PROVIDER_TIMEOUT` 原因未明、未修复，G 必须重新处置该覆盖欠项与可用性风险。E 已通过 PR #211 合并，五项 TARGETED_ACCEPTED 及边界见 [E 报告](vela-0.3.12-e-user-assets-exit-safety.md)。范围依据[指导书 UX-03](../design/vela-0.3-reconstruction-guidance.md#ux-03--批准前目标范围与完整变化不可充分审阅)。INTEGRATED_ACCEPTED / CLOSED 留待 G，本轮不进入 G。

## 实际接线与反例

main 为所选 Conversation 安装 SourcePort；SurfaceController 从 `confirmation.getState()` 读取 Runtime 投影，并通过 `captureReviewCommands` 捕获该 Review 的命令。当前 objective 路径是 Runtime barrier capture → Driver.suspendedReview → Owner.objectiveReviewProjection → ObjectiveReviewRuntimePort → Runtime Surface projection → ConfirmationView。保留的 Controller 单项候选路径不是当前 objective 工厂。

| 显示字段 | 可靠来源及关联 | 实际批准范围 | 修复前 |
|---|---|---|---|
| comp/layer | Review binding capture 与 value capture 的相同 compId/layerId；Driver Review revision | 当前 materialized 步骤的一项修改 | 没有投影到页面 |
| 属性/attribute | 本次已验证 CapabilityIntent：opacity 或 name | 仅该属性/attribute | 仅摘要文案 |
| before | rename 的同次 attribute capture；opacity 的同次私有 Review summary | 同一已捕获目标 | opacity 又读取当前选择，显示来源与 barrier 可分离 |
| proposed | 本次本地 CapabilityIntent.params | 不授权后续步骤 | 单行文本可能被 CSS ellipsis 截断 |
| reviewId/revision/步骤 | Driver 当前 suspendedReview 与已存在 logical cursor | 当前步骤 n/total；不等于整个 objective | 页面未保留 identity/范围或展开入口 |

最小反例使用实际 Runtime/Owner/Driver/Bridge，只有 Provider/Host 边界为受控替身；待批准时零 mutation，页面无 target、review identity、scope；生产 CSS 截断 summary。原始结果及中间失败在 `.tmp/vela-evidence/0.3.12/f-ux03-readable-review/`，不加入 Git。

## 契约与变更边界

- comp/layer 名称不在该 binding capture 中；直接显示可靠完整标识，不从模型、当前选择或名称猜测补全。rename 的 before 本身是捕获的原名。display 仅复制标量，DOM 不获得 BoundPlan、nonce、Grant 或 native binding。
- opacity 使用现有 `reviewPort.summarize(bindingCapture,valueCapture)`，移除第二次 current-selection 展示读取。兼容 Controller 仅从原 `createBoundPlan` 返回值旁新增只读 `reviewTarget`；未改 Preflight 确认、CAS/JIT、执行或验证规则。
- 缺失或错配目标/revision、before 或步骤范围时，批准命令与按钮均拒绝；拒绝/取消保持原入口。旧 source command 仍校验原 reviewId/revision；显示刷新不换绑、不授权。
- 本地步骤号来自已存在 logical cursor。当前 objective 每次只 materialize 一个步骤；批准仅覆盖本步骤。保留旧 PlanReviewProjection 的 `entire-plan` 合同，不将它翻译成整个 objective。
- 原区域增加可键盘展开的全文，字符串使用带引号及转义的文本表示；不 trim/normalize，不使用 innerHTML。当前 rename 参数仍遵守既有 256 UTF-8 byte、禁止控制字符等规则；读取已有原名的表示不改原值。
- 同 Review 普通刷新/切语言保留展开；新 Review/revision、取消和 dispose 清旧内容。展开不作为授权前置条件。窄布局与按钮可达性由实际 CEP 呈现验收。

## 验证与剩余验收

- 最终 focused：Readable Review **78 assertions PASS**。关联生产组合覆盖 Runtime/Owner/Driver、Surface/SourcePort、Preflight、C1/C2/D/E；历史精确 trace 仅剔除明确移除的展示读取对，并保留请求关联的一致关系和其他语义字段。
- 最终 full：**197 discovered / 197 executed / 197 PASS / 0 FAIL / 0 skip**，见本地 `full-final-after-i18n.log`。早先 190/197 和实施中失败保留；中间 197/197 不替代最后翻译修正后的结果。
- 修复中实际发现并保留的反例：兼容首个 plan revision=0 被新增 truthy 判断转成 null；窄布局旧规则覆盖新增跨栏规则；真实 opacity Review 属性标题缺翻译键。分别保留合法 0、提高局部选择器优先级、补齐双语键并加入实际字典校验，未放宽安全预期。
- 真实环境：AE **26.0x67** / AdobeCEP **12.0.1** / Chrome **99.0.4844.84**，Windows Win64。当前本地 Provider `qwen3.8-27b`，Q4_K_M，contextLength 131072；本轮按明确授权从设置 UI 启用，未更改模型或配置。
- 真实 CEP 页面已加载的 10 个变更 JS 与工作树一致；隔离生产 ReviewRuntimePort + Surface + ConfirmationView 的 15 项页面 realm 检查通过。缺失/错配目标和 before 阻断按钮与批准命令，拒绝可用；无复制生产工厂、无 live 模块替换。
- CEP 生产组件实际渲染：292px 窄 Surface 中文、652px 宽 Surface 英文；Space 展开、Ctrl+End 访问长值尾部，焦点、aria-expanded、全文、目标与范围、批准/拒绝可达。语言为隔离翻译依赖，未改 live 用户语言。
- 产品 opacity：原目标 comp430/A442，20%→60%，审批前零派发；真实 UI 批准后一次 mutation，Agent 对原 A fresh/matches，Driver、Session、trajectory 的提交事实一致，B443保持75%。用户一次原生 Undo 后 B2 严格恢复 B0。初次缺标题的零写入 Review 已正常拒绝并保留记录，修正后重验。

长名称最初两个真实请求均由 Intent Gate 以 `target-mismatch` 拒绝，Driver blocked/CANDIDATE_NOT_FOUND，零 mutation，工程未变，记录未覆盖。随后源码与实际页面纯输入检查确认采集前提错误：rename 契约将中文引号当作名称内容，请求加了引号而采集预期未含引号。未改生产 Gate、名称值或模型；按既有字面名称格式纠正请求后补验。纠正后的 180-byte 字面名称通过真实 Provider/Parser/Intent Gate 进入 Review；实际产品页面使用 CDP 340×900 视口（Surface 305px）完整呈现原名与 proposed 末尾，批准/拒绝可达。此为实际页面视口控制，不声称手动调整了原生 AE 停靠窗口。审批前零 mutation；UI Reject 后 B1 严格恢复/保持 B0，无需 Undo。两步请求真实返回 `PROVIDER_TIMEOUT`，Driver blocked，未形成 logical plan/Review，整个 objective 零 mutation，Host B0 未变、holder 已释放。只记 **NOT COVERED**，不以离线两步通过替代真实产品代表；不延长超时、不改模型/上下文配置、不重发。


## Supplement-01：当前 CEP 完整两步生产组合

复用同一 target、page timeOrigin 及 10 个变更脚本的有效装载证据，未重载、未加载第二份生产模块。独立 Composition 的唯一 holder、Session、Owner/Driver/Runtime 经 SourcePort 接入真实 SurfaceController/ConfirmationView；仅在构造接口提供受控 readiness、Provider 字节流和 Host 读写。Provider logical-plan 响应经过实际 Parser、逻辑计划校验与准入；未手写 Grant/AuthorizedPlan、修改内部步骤状态或手工 render。使用临时生产 View 的实际按钮事件批准/拒绝。

| 补验代表 | 实际结果 |
|---|---|
| 首步 Review | 同一 objective 的 `1/2`，opacity `20%→60%`；目标 ID 与本次 capture 相符，明确“仅批准本步骤”；批准前模拟派发 0 |
| 首步批准 → 第二步 Review | 模拟 opacity 派发/写入恰为 1，生产 fresh 原目标 Verify matches；独立 Review 显示 `2/2`、`"Layer A"→"Vela Stream Test"`，rename 派发 0；旧 opacity 全文清除，目标对应第二次 capture |
| 实际可读性 | 当前 CEP 620px 独立容器中点击展开；截图与可见区域核对全文完整，批准/拒绝在视口内且可命中；未重跑中英文/宽窄矩阵 |
| 旧命令负向 API 探针 | 首步真实捕获且未消费的旧批准命令在第二步抛 `CONVERSATION_REVIEW_STALE`；第二步 identity/revision、可批准/拒绝状态保持，rename 派发仍为 0 |
| 第二步实际 Reject | 终态 `rejected / REVIEW_REJECTED`；Driver 与 trajectory 保留 completedStepCount=1、remainingStepCount=1、partial completion；Session 保留首步 committed=true 与 fresh/matches。原名保持，第二步未执行，holder 释放 |

本例只证明真实 CEP 页面生产链分别生成、呈现和消费两次独立 Review。受控边界只返回模拟读写事实，不证明真实模型生成该计划、真实 AE 执行模拟写入、超时已修复或模型已获资格。完整结果、有限 trace、脚本及两张实际呈现截图位于 `.tmp/vela-evidence/0.3.12/f-ux03-readable-review/supplement-01/`。

临时对象、DOM、订阅在 `finally` 清理；旧命令与采集引用、可移除观测点已释放。live Provider 保持禁用/未确认；本轮真实 Provider 网络请求 0、真实执行桥调用 0，真实工程所查 B0/B1 严格相同。原会话/草稿、语言、视口与 Provider 端点/模型保持原值，没有真实 mutation 或 Undo。26 个受影响生产/正式测试文件与补验前最终基线逐字节一致，本轮未重跑 197 suites。

## 当前裁定与清理

| 有限验收 | 结果与来源 |
|---|---|
| 可靠目标、完整变化与范围 | 实际 production capture/投影及 CEP 页面通过；无名称时显示可靠 comp/layer ID |
| 缺失/错配与旧 Review 命令 | 正式生产组合 + 当前 CEP 隔离组件通过；没有 live 函数覆盖或授权注入 |
| 中英文、窄宽、全文/键盘/清理 | 实际 CEP 生产组件及产品页面渲染通过；使用容器/DevTools 视口，非原生停靠窗口手工调整 |
| opacity Review 批准/拒绝与恢复 | 真实 UI/Provider/AE 通过；一次 native Undo 严格恢复 B0 |
| 合法长名称 rename Review | 请求格式纠正后真实 UI/Provider 通过；零派发，Reject 后工程未变 |
| 两步任务的当前步骤批准范围 | 当前 CEP 完整生产组合＋受控 Provider/Host 通过 1/2→2/2、旧命令隔离及第二步拒绝；真实 Provider 两步端到端仍 **NOT COVERED** |

前轮因真实两步产品代表缺失，历史裁定为 **UX-03 PARTIAL / PENDING DISPOSITION**，原超时与零派发记录保留。按 Supplement-01 的明确接受裁定，当前以分列的真实单步证据、真实 CEP 受控完整生产组合及最终离线结果收束为 **UX-03 TARGETED_ACCEPTED — 有界混合证据 / F READY FOR COMMIT / PR**。真实 Provider 两步代表和未解释的 `PROVIDER_TIMEOUT` 继续作为 G 的覆盖欠项与可用性风险，不能由本次接受自动视为解决。INTEGRATED_ACCEPTED / CLOSED 留待 G。

清理已完成：无活动 objective、holder=null、无暂停；临时 Surface/View/DOM/引用与全部 logpoint 已释放；测试会话走正常关闭路径，保留空白会话；仅删除本轮 comp430/A442/B443，删除前核对身份、层数、名称和已恢复的 opacity，原 comp416 仍存在且已重新激活。Provider 恢复本轮开始的禁用/未确认状态，模型、端点、语言和视口保持/恢复原值。未清理用户历史工程或配置，未执行 Git 写操作。

最终语法、i18n freshness、project consistency、Markdown 本地链接和 diff 格式检查通过。所有完整日志、必要脚本/回调/trace/截图保留在原 `.tmp` 路径；只有本短报告作为阶段事实源。
