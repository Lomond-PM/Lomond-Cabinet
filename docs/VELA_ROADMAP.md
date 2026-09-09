# Vela / Lomond Cabinet — Canonical Product Roadmap

**Planning revision: R1-2026-09-09**
**状态：R1 已导入当前规划分支；0.3.12-A0 COMPLETE（仅文档与复核计划）。0.3.12 生产修复尚未开始，其余新里程碑 PLANNED / NOT STARTED。**
**核对基线：`dev@b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`，0.3.11 COMPLETE / SEALED。**

本文件是唯一当前版本排程，已替代旧版当前排程；历史报告、既有封存状态和包发布记录不被改写。详细问题、证据限定、重构边界和工作包见[0.3.x 产品重构与完成指导书](design/vela-0.3-reconstruction-guidance.md)。实际实现事实仍由 PROJECT_STATE 持有，Agent normative 边界由冻结 architecture 持有。

## 一、产品目标

**0.3.x：Build the Complete AE Agent Product。** 形成真正可委托、可验证、完整覆盖目标 AE 工作、界面清楚且可靠的 Agent 产品。

**0.4.x：Refine and Deepen the Complete Agent。** 在产品形成后提升时间历史理解、规划质量、深层恢复/性能、Memory 和专精模型等方向。不把 0.3 的安全、能力、基础 UI 或历史观察缺项拖到 0.4。

版本号服从实际工程完成边界，允许 0.3.10、0.3.20+；没有人工上限。原来源是[项目路线摘要](reports/audit-baseline-0.3.11/roadmap-foundation-summary.txt)及[旧 canonical roadmap（固定提交）][R-OLD]。

## 二、已经完成的历史基线

| 版本 | 已完成语义 |
|---|---|
| 0.3.7 | Agent Loop Foundation — COMPLETE |
| 0.3.8 | Multi-step Agent — COMPLETE；有界多步，不等于完整能力覆盖 |
| 0.3.9 | Streaming Response & Reasoning Surface — COMPLETE / SEALED |
| 0.3.10 | Context Architecture — COMPLETE / SEALED；typing/ownership/evidence/budget-policy，不包含实际历史注入 |
| 0.3.11 | Multi-conversation Foundation — COMPLETE / SEALED；多会话、全局单 active objective、临时草稿 |

历史 0.3.11 报告基线为 182/182 全量离线、94/94 Vela 三种顺序，并有保留限定的真实 AE 验收。它们是历史记录，**本次文档编制没有重跑**。[R-STATE]

包版本与功能里程碑仍分开：当前状态记载 package metadata 0.3.6、最近发布 tag v0.3.5；本方案不会自动更改 VERSION/manifest/Host projectVersion，也不创建 main/tag/release。[R-STATE]

## 三、新路线总表

| 版本 | 主目标 | 本版交付 | 前置 |
|---|---|---|---|
| 0.3.12 | 基线安全与事实链收口 | 修复高风险数据入口、提交目标验证、Session 事实、后台任务控制、用户资产保存及最小 Review/退出保护。 | 0.3.11 |
| 0.3.13 | 视觉基线与 UI 平台重建 | 先批准真实页面视觉基线，再重建样式决议、共享交互、弹层/焦点/手势、预览提交和 UI 生命周期。 | 0.3.12 |
| 0.3.14 | 产品 UI 迁移与外观一致性 | 将 Home、Registry、Settings、Palette、Vela 全面迁移；完成排版层级、容器减法、状态呈现和程序化参数语义。 | 0.3.13 |
| 0.3.15 | 能力模型泛化 | 泛化能力描述、参数/结果、注册映射、计划表达与受控模型可见集合；建立 AE Action Coverage Matrix。 | 0.3.14 |
| 0.3.16 | 有界上下文消费与容量预算 | 将 0.3.10 的证据基础接到真实跨轮上下文消费；接入合格容量来源、完整输入核算与超限策略。 | 0.3.15 |
| 0.3.17 | 通用任务委托与 Agent 任务体验 | 通用 scope/risk/budget 授权；有界多步执行；Proposal/Review/Execution/Result 卡片与混合响应分离。 | 0.3.16 |
| 0.3.18 | AE 能力完整性 I：工程、合成、图层 | 覆盖工程/素材组织、合成与图层生命周期、结构观察和目标解析。 | 0.3.17 |
| 0.3.19 | AE 能力完整性 II：属性、关键帧、时间 | 覆盖属性寻址、值维度、关键帧、插值及时间相关动作。 | 0.3.18 |
| 0.3.20 | AE 能力完整性 III：文字、形状、路径、表达式 | 覆盖文字与形状结构、路径/蒙版数据及受控表达式操作；不得以任意脚本代替能力边界。 | 0.3.19 |
| 0.3.21 | AE 能力完整性 IV：效果与合成关系 | 覆盖效果参数、遮罩/轨道遮罩关系、预合成、父子结构和跨合成引用。 | 0.3.20 |
| 0.3.22 | AE 能力完整性 V：媒体、输出及全矩阵收口 | 覆盖媒体/音频/导入输出、渲染队列等目标动作并完成全域缺口回扫；必要时追加后续覆盖版本。 | 0.3.21 |
| 0.3.23 | 用户历史观察基础 | 在能力完整性之后交付 typed、bounded、queryable 的历史观察；区分世界变化、Vela 执行和用户动作推断。 | CC（能力完整性门） |
| 0.3.24 | Agent UI 完整收口 | 让通用任务 UI 覆盖全部已完成能力；完善跨轮/多会话呈现、全文审阅、结果摘要和有界展示观测。 | 0.3.23 |
| 0.3.25 | 整合 AE 验收与模型资格 | 真实产品任务矩阵、Provider/模型/配置资格、失败与恢复路径、端到端回归。 | 0.3.24 |
| 0.3.26 | 产品与架构稳定化及发布收口 | 全源码覆盖台账最终对账、长期资源/性能、迁移回退、死代码清理、文档与发布准备。 | 0.3.25 |


## 四、原路线迁移关系

**原 0.3.12 Capability Model Generalization → 新 0.3.15。** 中间新增 0.3.12 安全/事实、0.3.13 视觉/UI平台、0.3.14 产品页面迁移。不是把泛化删除，也不是只延长补丁阶段。

**原 0.3.13+ AE Capability Completeness → 新 0.3.18 起。** 泛化之后，0.3.16 将上下文证据变成真实有界消费，0.3.17 将一次性示范权限变成通用委托及任务呈现。

原未编号的 User History Observation、Agent UI Completion、Integrated Acceptance、Stabilization，在参考排程中分别为 0.3.23–0.3.26。UI 不等这些尾部版本才开始做：0.3.13–14 重建基础并迁移全部当前产品页面，0.3.17 落地通用任务体验，每波能力跟进 UI，最后才整体收口。

## 五、能力覆盖与尾部版本顺延规则

**CC = AE Capability Completeness Gate。** 0.3.18–22 是初始五波分组，不是“最多五波”。能力矩阵须逐项证明目标动作已覆盖，或有正式 `AE_PLATFORM_UNREACHABLE` 证据；未研究、未实现或未实测不算关闭。“常用动作足够”不是退出。

若能力完整性最后一个版本是 `0.3.N`，后四项实际编号为：

| 稳定语义里程碑 | 版本规则 | 本轮 N=22 的参考编号 |
|---|---|---|
| User History Observation Foundation | 0.3.(N+1) | 0.3.23 |
| Agent UI Completion | 0.3.(N+2) | 0.3.24 |
| Integrated AE Acceptance & Model Qualification | 0.3.(N+3) | 0.3.25 |
| Product / Architecture Stabilization | 0.3.(N+4) | 0.3.26 |

例：若需要 0.3.23、0.3.24 两个追加覆盖版本，尾部顺延为 0.3.25–28。前面尚未启动的版本若再拆分，同样显式重排，不更改已封存历史编号。

## 六、版本分配索引

下表只表示主办/开始版本。每个原问题的原始证据、限定、关闭条件和后续回验在[完整总账](design/vela-0.3-reconstruction-guidance.md#section-8)；COV 工作面不是缺陷，也不意味着在开始版本一次审完所有源码。

| 主办版本 | 工作面 | 条目 |
|---|---|---|
| 0.3.12 | 基线安全与事实链收口 | A01、A02、A03、A04、A05、A06、A07、A08、A09、A11、A12、AP-01、AP-02、AP-03、UX-01、UX-02、UX-03、G-01、G-02、G-09、G-10、COV-03、COV-04、COV-05、COV-06 |
| 0.3.13 | 视觉基线与 UI 平台重建 | A10、AP-05、AP-06、AP-07、UX-05、UX-06、UX-07、UX-08、UX-09、G-11、V-01、V-02、V-03、V-04、V-05、V-06、V-07、COV-01、COV-02 |
| 0.3.14 | 产品 UI 迁移与外观一致性 | AP-04、AP-08 |
| 0.3.15 | 能力模型泛化 | G-03、G-08 |
| 0.3.16 | 有界上下文消费与容量预算 | G-04、G-05 |
| 0.3.17 | 通用任务委托与 Agent 任务体验 | UX-04、G-06、G-12 |
| 0.3.25 | 整合 AE 验收与模型资格 | G-07 |

三份审计的原始 ID 共 29 个（A 12、AP 8、UX 9）；加入首轮/路线 G 12、视觉 V 7、审计覆盖 COV 6，共 54 个工作项。**这不是 54 个已确诊漏洞。** 原报告明确存在转录、替身、局部 CSS 与实机未验证边界。[R-A]；[R-AP][R-UX]

## 七、重构原则

可重写 UI/Renderer/DOM/CSS决议、拆 main/CoreUI、替换内部 API 和删除旧实现；旧视觉封存不阻止新产品设计。**先真实页面视觉基线，再重构基础，再迁移消费者**；不以新 token 数量、文件数量或框架更换作为成功标准。

保留模型无执行权、TaskPlan 非执行对象、JIT/fresh/CAS/replay/Host边界、read/analyze 与 mutation 分层、用户资产、会话隔离及权限不恢复。真正改变 normative Agent 边界时，先提 Architecture Amendment；本文不自行修改 frozen v2.2。[R-ARCH]

原报告里“不编号、不改风格”的当轮范围，已由本次用户新要求扩展；原始发现和证据仍保留，不将任何报告重写为全量审计或新视觉已经验收。

## 八、八项新退出门

原项目只保存“曾有八项”的摘要，未保存精确枚举。本 R1 **新制定**以下清单，不声称找回原八条，也不替代冻结架构的 13 invariants。[R-OLD]

| Gate | 退出要求 |
|---|---|
| GATE-01 | 安全、Authority 与事实可信；输入/提交/目标验证与 Session 不夸大事实。 |
| GATE-02 | 完整可委托 Agent；有界连续执行、Review、失败/取消/恢复可控。 |
| GATE-03 | 正式 AE Action Coverage Matrix 完整关闭或有审核平台不可达证据。 |
| GATE-04 | 实际跨轮上下文与容量、多会话隔离、typed/bounded/queryable User History 基础。 |
| GATE-05 | UI 产品形成：视觉层级可复现、Review可读、状态结果准确、草稿/键盘/响应式可靠。 |
| GATE-06 | Provider/模型配置级资格与本地运行兼容；readiness 不等资格。 |
| GATE-07 | 全产品整合 AE 验收、生产回归与实际源码覆盖台账闭合。 |
| GATE-08 | 资源/性能、迁移/回退、用户资产、文档和可发布状态稳定。 |

详细证据见[指导书第 10 节](design/vela-0.3-reconstruction-guidance.md#section-10)。关键安全、数据、事实或知情批准风险不能用一个 known issue 标签绕过；关键能力/资格仍 UNKNOWN 时不能退出。**任何编号本身都不授予进入 0.4 的资格。**

## 九、当前规划状态与下一项

**0.3.12-A0 — Baseline Reconciliation & Production Revalidation Plan。**

[A0 报告](reports/vela-0.3.12-a0-baseline-reconciliation.md)记录资料/哈希、入口对账、完整源码清单、25项生产复核计划与0.3.13样页/ADR待办。建议下一项为0.3.12-B1中的A01公共Host JSON数据入口生产复核与修复，A11/G-02随后独立处理；需新的实施任务，本轮到A0停止。

当前生产修复与所有后续重构均未开始，远程未因本交付被修改。实际开发遵循 focused branch → 实施/回归 → AE/CEP → 用户 commit/push → PR 到 dev；正式版本发布另行处理。

## 十、来源

[R-OLD]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/VELA_ROADMAP.md
[R-STATE]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/PROJECT_STATE.md
[R-ARCH]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/design/vela-agent-architecture.md
[R-A]: reports/audit-baseline-0.3.11/source-audit.md
[R-AP]: reports/audit-baseline-0.3.11/appearance-audit.md
[R-UX]: reports/audit-baseline-0.3.11/uiux-audit.md
