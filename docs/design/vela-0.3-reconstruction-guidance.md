# Lomond Cabinet / Vela — 0.3.x 产品重构与完成指导书

**规划修订：R1-2026-09-09**
**基准节点：0.3.11 — Multi-conversation Foundation，COMPLETE / SEALED**
**核对仓库：`Lomond-PM/Lomond-Cabinet`，`dev@b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a`**
**文档状态：保留 R1 规划来源；当前 A01 为 TARGETED_ACCEPTED / READY FOR COMMIT / PR（覆盖限制见 A01 当前条目）。其余条目不因本次裁定改变，整个 B1/0.3.12 未完成。**

> **总目标：先修可信性与数据风险，再重建视觉和 UI 基础，随后泛化能力、形成可委托的完整 AE Agent。**
> 项目处于早期阶段，允许替换旧实现、重组模块与页面结构；不以维护既有类名、旧 Renderer 或庞大主程序为目的。需要保留的是执行安全、用户资产、明确的所有权和经过验证的产品语义，而不是实现外形。

## 阅读导航

- [1. 本次规划裁定与来源边界](#section-1)
- [2. 基线、历史与问题分类](#section-2)
- [3. 新版 0.3.x 路线与依赖](#section-3)
- [4. 允许重构的范围与不可静默跨越的边界](#section-4)
- [5. UI 视觉层级与平台重建方案](#section-5)
- [6. Agent 能力、上下文与任务体验方案](#section-6)
- [7. 各版本工作包与退出条件](#section-7)
- [8. 完整问题与工作项总账](#section-8)
- [9. 未完成全量审计的接续安排](#section-9)
- [10. 八项新的 0.3.x hard exit gates](#section-10)
- [11. 实施、证据与发布工作流](#section-11)
- [12. 第一项落地任务](#section-12)
- [13. 0.4.x 的边界](#section-13)
- [14. 来源与证据索引](#section-14)

<a id="section-1"></a>
## 1. 本次规划裁定与来源边界

### 1.1 保留的产品目标

`0.3.x = Build the Complete AE Agent Product`；`0.4.x = Refine and Deepen the Complete Agent`。0.3.x 不设人为版本号上限，必须完成正式 AE Action Coverage Matrix、User History Observation Foundation、Agent UI Completion、整合 AE 验收与稳定化，不能因为数字接近某个整数就进入 0.4。[S-P]；[S-R]

产品不是“只能调用两种工具的聊天助手”，也不是“每一步固定要求手动批准的脚本入口”。目标是：在用户明确委托的范围内，持续读取、理解、计划、操作、验证和收尾；遇到权限不足、风险、歧义或不可验证条件时，回到 Review、询问或安全停止。[S-C]；[S-ARCH]

### 1.2 本次新作出的规划决定

以下是**本次为了回答版本重排与重构授权而制定的方案**，并非原始审计报告已经批准的事实。

| 决策 | 本次规划 |
|---|---|
| 版本插入 | 0.3.12 基线安全与事实链；0.3.13 视觉基线与 UI 平台；0.3.14 产品 UI 迁移。原 0.3.12 Capability Generalization 顺延为 0.3.15。 |
| 产品依赖补齐 | 0.3.16 明确交付真实有界跨轮上下文与容量预算；0.3.17 明确交付通用委托与任务呈现，避免长期悬空。 |
| 重构力度 | 允许重写 UI 组件/Renderer/样式决议/页面 DOM、拆分 main.js、改内部 API、删除旧兼容层；不要求只做最小补丁。 |
| 设计工作顺序 | 先用真实 DOM、真实内容和状态建立整页样例，再反推组件/样式基础；不先造新框架，再期待它自动生成好界面。 |
| Provider 启用 | 定义为面板级模型使用资格；与任务授权及单步批准分别持有。停用先禁入新请求，再正确处理真实活动任务。 |
| 实验确认 | 当前 acknowledgement 是实验启用条件；撤回即使资格失效，旧 readiness 不得重新启用。正在收束的任务仍有清晰控制与结果。 |
| 草稿与离开 | 起草不依赖 Provider 已启用；所有用户主动离开均先通过 dirty gate，再改变路由/销毁对象。强制卸载另行处理。 |
| 非空会话关闭 | 本版采用明确确认而非恢复旧 Runtime；空会话直接关闭。历史持久化与执行权恢复不在该动作中混入。 |
| 保存失败 | 分开 accepted/applied/persisted；可保留当前视觉，但明确未保存并支持重试/还原。不得返回伪保存成功。 |
| 固定 Palette 参数 | 保留默认固定配色语义；不适用参数标注/禁用。需要对固定 Palette 做颜色变换时，以独立契约和确定性版本迁移实现。 |
| 键盘与阅读 | Enter 换行、Ctrl/Cmd+Enter 发送并保护 IME；非跟随状态保留可见消息锚点，不被下方新增内容拖走。 |
| 退出门 | 本文新制定八项退出门，明确不是“找回历史原八条”；Agent 的 13 条 invariants 继续另行适用。 |

这些决定应作为本次规划入仓的评审内容。实际实施中若需改变它们，应记录设计/架构决策和受影响验收，不在某个修复 PR 内悄悄改义。

### 1.3 与旧审计建议的关系

三份审计报告均按原文保留，不改写它们的观察、证据与当时边界。以下建议被本次后续用户要求明确更新：

- 原报告“暂不指定版本号”被本次正式版本排程替代。
- UI/UX 报告“本轮不换视觉风格、不重做设计系统”的**当时工作范围**，被用户随后提出的“杂乱、层级不清、偏老式”以及“可以大胆重构”扩展。它不再是本轮重构的禁令。
- 早期 UI/Settings IA 的封存是历史接受基线，不意味着以后永远不能重做；新视觉与 IA 需要新的评审/迁移证据，不能篡改过去的验收结论。
- “允许大胆重构”不意味着取消模型/Authority/Host 信任边界，也不意味着允许新实现继承未经验证的安全结论。

### 1.4 本文与仓库其他文件的职责

| 文件 | 职责 |
|---|---|
| `docs/VELA_ROADMAP.md` | 入仓后作为唯一当前版本排程；本包提供新版候选文件。 |
| 本指导书 | 问题定义、重构原则、工作包、验收与迁移指导；版本分配是 R1 路线的快照。 |
| `docs/PROJECT_STATE.md` | 当前实际已实现状态；不能用计划替代实施事实。 |
| `docs/design/vela-agent-architecture.md` | Agent 规范性信任/执行边界；修改需 Architecture Amendment。 |
| 新视觉/UI 设计决策与样页资产 | UI composition、样式/交互决议与新视觉默认值的权威来源。 |
| 原审计报告及证据包 | 历史发现与原证据，不随问题修复被覆盖。 |
| consolidated register JSON | 本文 54 项条目的可机器读取导出，不形成第二份手工维护的规范。 |

后续重新拆版本时，在同一规划 PR 中同步路线、本文分配快照及导出总账。**已封存 0.3.7–0.3.11 不改号、不改历史 PASS；新发现通过前向修复版本关闭。**

<a id="section-2"></a>
## 2. 基线、历史与问题分类

### 2.1 本次核对的事实

远程 `dev` 仍为 `b93d0d8…`，对应 2026-09-07 合并的 PR #200。现行路线记载 0.3.11 已封存，下一项旧排程为尚未启动的 0.3.12 Capability Model Generalization。本次方案尚未修改远程文件。[S-R]；[S-S]

| 历史里程碑 | 保留事实 |
|---|---|
| 0.3.7 Agent Loop Foundation | COMPLETE。 |
| 0.3.8 Multi-step Agent | COMPLETE；有界多步已建立，不等于通用 AE 能力完整。 |
| 0.3.9 Streaming Response & Reasoning Surface | COMPLETE / SEALED；历史离线基线 171/171，真实 AE 验收按原报告边界保留。 |
| 0.3.10 Context Architecture | COMPLETE / SEALED；历史离线基线 176/176；模型可见 optional history 仍为 0。 |
| 0.3.11 Multi-conversation Foundation | COMPLETE / SEALED；历史离线基线 182/182，Vela 94/94 × forward/reverse/forward；多会话、全局单 active objective、最多 8 个 UI 会话、临时草稿。 |

当前包 metadata 仍为 **0.3.6**，仓库状态记载最近发布 tag 为 **v0.3.5**；这与 Vela 功能里程碑编号是两套事实，不是本次自动修订对象。[S-S]

### 2.2 已有证据不能被升级

三份报告合计包含 **29 个带原始 ID 的发现条目**：A01–A12、AP-01–AP-08、UX-01–UX-09。它们不是 29 个已实机确诊的安全漏洞。

原报告分别记录 17、19、10 个局部检查场景，合计 46；包括正向对照和被排除的疑点。部分是手工转录生产函数、受控模型或隔离 CSS；UI/UX 中只有两个视图模块明确做过与远程 Git blob 一致性验证。**本次编制文档没有重新执行这些检查，更没有重新运行仓库全量测试或操作真实 AE。**[S-A]；[S-AP][S-UX]

本总账另补 **12 项 G 系列路线/初轮事项、7 项 V 系列视觉重建事项、6 项 COV 系列审计工作面**，总计 54 项。新增 ID 只用于整合，不代表新增漏洞数量。

### 2.3 分类和闭环状态

| 类别 | 处理方式 |
|---|---|
| 条件性安全/数据风险 | 优先生产模块复核，补可执行反例和条件说明；不能等完整 UI 重构后再修。 |
| 已见实现语义缺陷 | 修代码同时修契约交接与回归，不只修可见文案。 |
| 设计选择/产品缺项 | 先明确本次新语义，再实现；不把旧版本明确排除的未来功能称为 regression。 |
| 视觉候选原因 | 用完整生效样式和实机页面验证；不能仅凭 CSS token 数值下审美定论。 |
| 未覆盖工作面 | 进入覆盖台账；未检查不是 PASS，也不能仅因未知就判 FAIL。 |

建议 issue 生命周期：`OPEN → REVALIDATED / NOT_REPRODUCED / DESIGN_DECIDED → IMPLEMENTED → TARGETED_ACCEPTED → INTEGRATED_ACCEPTED → CLOSED`。`NOT_REPRODUCED` 不自动关闭：必须说明与原条件的差异、现有防护、剩余风险以及下一步处置。

<a id="section-3"></a>
## 3. 新版 0.3.x 路线与依赖

### 3.1 版本路线总表（R1）

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

**状态：以上 15 个未来里程碑均是 PLANNED / NOT STARTED。** 文中的版本名不是 release/tag 已创建的声明。

### 3.2 对原路线的显式映射

| 原安排 | 新安排 | 原因 |
|---|---|---|
| 0.3.12 Capability Model Generalization | **0.3.15** | 在扩量前先修安全/事实/用户资产，并重建可持续承载能力的 UI 基础。 |
| 0.3.13+ AE Capability Completeness | **0.3.18 起** | 泛化之后补真实上下文与通用委托，再按动作矩阵扩量。 |
| User History Observation，未编号 | **参考 0.3.23；始终依赖 CC** | 保留原“能力完整性之后”的顺序。 |
| Agent UI Completion，未编号 | **参考 0.3.24** | UI 基础已在 0.3.13–14 重建；0.3.17 有任务 UI，0.3.24 只做全部能力的最终收口。 |
| Integrated Acceptance，未编号 | **参考 0.3.25** | 加入配置级模型资格和真实用户旅程的正式完成标准。 |
| Product/Architecture Stabilization，未编号 | **参考 0.3.26** | 全审、性能、资源、迁移、文档与发布形成最后退出证据。 |

### 3.3 能力覆盖不受五波或 0.3.26 的数字限制

0.3.18–0.3.22 是**初始分组排程**，不是承诺五个版本一定覆盖全部 AE。具体动作分波在 0.3.15 的矩阵中校准，不能靠变更组名缩小产品范围。

定义 **CC = AE Capability Completeness Gate**。若最后一个覆盖里程碑是 `0.3.N`，则后续四项依次为：

| 语义里程碑 | 实際分配规则 |
|---|---|
| User History Observation Foundation | `0.3.(N+1)` |
| Agent UI Completion | `0.3.(N+2)` |
| Integrated AE Acceptance & Model Qualification | `0.3.(N+3)` |
| Product & Architecture Stabilization | `0.3.(N+4)` |

本表按 `N=22` 给出 0.3.23–0.3.26。若覆盖需追加 0.3.23、0.3.24 两波，则尾部顺延为 0.3.25–0.3.28。**不是为了保住“0.3.26 结束”把未完成能力转入 0.4。**

同理，0.3.12–0.3.17 若经实际复杂度判断需拆成新的正式版本，也应顺延尚未启动的编号。一个版本可以有多个 focused PR；不能用版本名强迫做巨型 PR。

### 3.4 关键依赖与可提前进行的工作

```text
0.3.11 sealed
   ↓
0.3.12 安全 / 事实 / 数据保护
   ↓
0.3.13 真实页面视觉基线 → UI 平台重建
   ↓
0.3.14 产品页面迁移 / 旧路径退出
   ↓
0.3.15 能力泛化 + 覆盖矩阵
   ↓
0.3.16 上下文消费 + 容量
   ↓
0.3.17 通用委托 + 任务体验
   ↓
0.3.18…0.3.N 能力覆盖 → CC
   ↓
历史观察基础 → UI 最终收口 → 整体验收/模型资格 → 稳定化 → 0.4
```

只读能力调查、动作矩阵盘点、样页设计和模型资格测试设计可以提前开展；**允许并行准备，不等于允许跳过生产前置门**。UI 重建不应拖到能力扩量结束才开始，安全修复也不必等待视觉设计批准。

<a id="section-4"></a>
## 4. 允许重构的范围与不可静默跨越的边界

### 4.1 明确允许替换的内容

可重写 CoreUI 内部实现和 API、Registry Renderer、Settings/Palette 页面 composition、Vela 可视表面、CSS 组织/命名/组件变体、状态投影、共享弹层与交互生命周期。可拆分 `main.js` 与过大的 `coreUi.js`，删除重复 factory、旧 class alias 和已无消费者的兼容代码。可重组 Settings 信息架构、减少卡片嵌套、替换默认视觉数值。需要时可重构 Agent 上层编排和跨层适配，以减少能力特判与状态重复。

**不要求保持所有旧 DOM 和内部 API 兼容。** 对内部消费者可以成组迁移；对确有外部调用者的入口、用户配置 schema、工具标识、工程元数据和生成身份，必须单独决定兼容/迁移策略。

技术路线允许评估新的渲染组织方式，但换框架不是验收目标；不得在未验证 CEP、构建/装载、调试与分发成本前将整项目迁往另一宿主平台。优先证明新结构减少了真实复杂性。

### 4.2 Agent 红线仍是重构约束

以下概括用于指导本次重构，不代替冻结架构原文：[S-ARCH]

- 模型输出、reasoning、摘要和 UI 文案永不直接获得执行权；TaskPlan 不直接执行，Compiler 不接管规划。
- Authority 决策不执行 AE 操作；Execution Spine 不猜用户意图；Surface 不拥有 Agent 生命周期与执行权。
- 最终目标 JIT 解析，相关事实新鲜度依赖正确的 digest/CAS；最终 Verify 对实际提交目标给出足够证据。
- read/analyze 共享调用契约但不被强加 mutation nonce/CAS/Undo；也不能仅因 risk=read 就无条件 ALLOW。
- 新能力必须显式注册、验证和 Host 路由；授权中的 scope/risk/budget/expiry/provenance 不因 UI 简化而消失。
- 执行权不跨 reload 自动恢复；取消/停用不等于回滚，提交不确定不能自动重试 mutation。
- 会话切换不转移旧结果或 Review 命令；当前生产仍维持单个 Core 全局至多一个 active objective。

### 4.3 如何处理冻结架构

`FROZEN FOR 0.3.x` 不是“所有源码永久不能重构”。保持规范边界的结构替换可以直接按重构方案、回归与实机证据推进。

确需改变 normative 对象、信任边界、invariant 或依赖时，先做 **Architecture Amendment**：标明原条款、实际问题及代码证据、替代方案、信任影响、迁移成本与对应测试，再更新基线。本文并未自行修改架构 v2.2，也没有将“大改”解释成默认批准削弱安全。

UI 视觉/结构基线与 Agent architecture 分开维护。改变标题字重、DOM 或 Settings 分组不必机械触发 Agent amendment；改变 Surface 是否可执行任务则必须触发。

### 4.4 迁移必须具有终点

每个替代实现写清：旧入口、所有现用消费者、新入口、迁移批次、删除时点和回退方式。禁止永久保留 legacy/new 双写路径；短期兼容 adapter 只在明确迁移窗口内存在。

回退优先回退代码和配置投影，不恢复旧授权、不丢弃用户资产。新默认视觉不能依赖“先清空 localStorage”；旧用户数据先只读备份/版本迁移/保留原数据证据。生成算法输出改变则有 engine/version 和旧 preset 处置，不能让同标识悄悄变义。

<a id="section-5"></a>
## 5. UI 视觉层级与平台重建方案

### 5.1 目标不是“再统一一次 CSS”

用户明确感到杂乱、层级不清、偏老式，这是本次需要解决的产品问题。前轮给出的高字重分布、常驻彩色阴影、容器体积与小正文比例等，是**有源码依据的候选原因**，尚未替代完整实机观察。不能将“67 个参数都接通”“都用了 CoreUI”当成视觉已成立。[S-C]；[S-DESIGN]

本次新方向：**安静的工作界面，明确的任务重点。** 品牌辨识度集中在 Home、程序化图标、少量关键动作与经过验证的空间转场；参数/任务工作区降低装饰竞争。现代感来自可读性、比例、主次和一致行为，不以玻璃、巨大圆角、更多动效或更换字体作为目标。

### 5.2 先整页样例，再底层收敛

0.3.13-A 必须至少提供三类真实页面：复杂 Registry 工具、Global Settings（包含外观与开发区）、Vela 待批准/部分完成。再增加 Palette 编辑作为数据密集交互对照。使用真实 DOM、已有/新 CoreUI 行为和真实中英文内容；不是一张无法运行的宽屏效果图。

必须同时展示：正常内容、长名称/长错误、禁用原因、折叠、空状态、执行中、失败、不同宽度与 UI Scale。先确定页面关系与尺度，再写共享组件与样式 contract。仅“按钮做得好看”不能通过样页 gate。

此前明确废弃的 Vela 生成效果图不作为设计依据；新视觉参考必须独立批准。用户未重新提供的实机截图不得凭记忆模拟为现状。

### 5.3 页面组合规则

| 对象 | 本次设计规则 |
|---|---|
| 结构分组 | 默认只管布局，不自动有背景、边框、圆角、阴影。 |
| 常驻工作表面 | 少量稳定层次；靠内容关系与对齐分组，不把每个 feature 套卡片。 |
| 文字 | 页面标题、分组标题、字段标签、正文、说明有真实主次；避免多个短标签同时重强调、正文过小。 |
| 操作 | 当前任务的主要动作可识别；返回/设置/重置不与其同权，也不能弱到不可发现。 |
| 状态 | 文字、tone、可访问描述由同一展示决议产生；颜色不单独承载关键含义。 |
| 阴影/强调色 | 为深度、选中、焦点、关键动作和异常服务；常驻装饰光晕不是默认控件身份。 |
| 窄面板 | 优先重排；完整 Review/错误可展开/换行，关键状态不靠 clip 成 1px。 |
| 品牌/动效 | Home 保留程序化视觉身份；转场解释空间关系，不覆盖任务反馈或造成不可退出等待。 |

新具体字号、圆角、间距和色值由样页决定。本规划不在未看完整页面时指定另一套任意数值，也不因字体名或蓝/金色本身判定好坏。

### 5.4 UI 平台的职责拆分（目标职责，不强制文件名）

```text
用户设置 / 设计默认 / Palette / 校准 / transient
               ↓ 声明的层与各自 owner
          语义样式决议与来源说明
               ↓ 唯一最终投影
     共享视觉角色 + CoreUI 组件样式
               ↓
   Domain composition（Home/Registry/Settings/Palette/Vela）
               ↓
          可视 DOM 与交互反馈
```

共享基础负责控件状态机、手势、焦点、弹层、通用滚动/缩放和可访问语义；业务层负责字段意义、持久化命令、任务含义和页面 composition。Registry 不变成万能 UI/Agent 引擎，CoreUI 不决定业务权限。

`main.js` 的目标是 composition root 和有限的应用生命周期接线，而不是继续持有页面工厂、颜色数学、共享手势、长动画、配置保存和 Agent 任务决策。允许按职责迁出，不要求为了文件大小任意切碎。

### 5.5 样式决议与单一投影

每个语义属性登记：默认来源、主题派生、持久 owner、允许的校准覆盖、transient 所属层、最终 CSS 输出与消费者。**预览先替换自己的层，再执行完整决议；不作为绕过所有优先关系的任意全局写入。**

Appearance 是用户外观权限源；Design Tuning 对其镜像继续委托，不获得第二份持久副本。对于 border 等既有主题派生与校准共用输出的属性，明确“派生默认 vs 显式校准”的优先关系，由一个最终阶段写 CSS。变更主题后应按决议重新得到同一个有效结果，不能由哪个事件最后触发决定。

为调试提供只读 resolved provenance：默认值、用户覆盖、校准、当前预览、最终值及来源。它是诊断，不是新的设置 owner，也不写入执行事实。

### 5.6 统一用户操作的终结语义

| 事件 | 目标契约 |
|---|---|
| 拖动/输入过程 | 有界、帧合并的内存预览，不逐帧冒充已保存。 |
| 明确提交/拖动完成 | 验证→提交所属 authority→返回应用与持久化结果。 |
| Escape | 当前最上层交互先消费；编辑/弹层取消与页面离开分层。 |
| 用户离开页面 | 有未提交/未保存内容时先协商，再改变 route/销毁；不能先清 active route。 |
| pointercancel/捕获丢失/blur | 每种控件明确 commit 或 cancel，通用 owner 执行，不让各页面自行猜测。 |
| dispose | 结束活动手势、释放捕获、清 frame/timer/subscription，再移除 DOM；重复操作幂等。 |
| 强制卸载 | 不等待交互确认；保存已批准可保存的非权威内容策略与强制清理分开，授权绝不恢复。 |

键盘编辑不能被事件冒泡关闭整个 Settings；模态需要正确涵盖 portal 菜单/颜色选择器，而不是用一个只锁 panel 子树的 Tab trap 破坏弹层。只有用户当前聚焦目标被自身操作移除时才交接焦点，异步更新不抢焦点。

### 5.7 分层资源策略

展示历史可做虚拟化和有界文本预览；长结果可展开/复制/访问全文。reasoning 仍是非权威输出，展示保留与模型上下文消费是两份决定。省略/截断需要明确标识，不删事实后声称完整。

Session、Plan/replay/security bookkeeping 由原安全 owner 决定保留，不拿 UI 虚拟化顺手裁剪它们。Palette 图深度、Canvas 尺寸、recipe/raster cache、生成队列、事件监听与跨页资源独立测量和定界。先测量再定性能预算，不声称已知资源增长一定是泄漏。

<a id="section-6"></a>
## 6. Agent 能力、上下文与任务体验方案

### 6.1 能力泛化必须贯穿整条链

0.3.15 不是“把两个 Registry 文件合并”。它要处理模型可见描述、参数/结果 schema、请求分支、CapabilityIntent、Compiler、逻辑计划、授权元数据、Host 映射和 Verify/展示投影中的能力特判。[S-C]；[S-ARCH]

共同描述是统一能力知识来源；模型只看到允许的最小投影；本地策略看到 scope/risk/执行与验证要求；Host 接受经过受控转换的调用。描述中 `risk: low`、`registered: true` 不是某次调用的授权。

验收必须包含不同形态能力：读取、派生分析、修改；至少一种列表/集合/向量或不同于单标量的结果，暴露目标解析和结果验证差异。**同类能力新增主要新增定义、局部验证、适配与测试，而非在 Provider/Driver/Review/Surface 全链增加新的能力 ID 分支。**新执行类别需要核心扩展是合理的，不能把“永不改核心”当教条。

### 6.2 替换旧 Intent Gate 的条件

不通过不断增加关键词/数字数量正则实现自然语言泛化。只有 typed 参数、允许 scope、风险、目标验证、Authority 和负向用例已到位，才退役旧词法判断。文本询问、否定、假设、歧义、超范围请求仍需正确区分；否则泛化只是把示范能力的保守限制去掉。

### 6.3 上下文消费是新的实际能力，不是旧里程碑漏改开关

0.3.16 对当前 `optionalExpansion=false` 与 model-visible history=0 的明确基线做正式演进，更新具体 Context 消费契约与测试，而不是简单启用一行开关。[S-R]；[S-S]

至少区分：当前用户目标、当前世界观察、已验证执行事实、历史对话文字、派生总结、模型 reasoning。历史对话作为不可信输入；旧世界事实具有时间/来源限制，目标执行前仍重新观察与校验。raw reasoning 默认不入模型上下文。

能力选择、Observation 大小、历史选取与生成保留量必须一起进入预算。合格数值来源可启用 numeric 判定；来源不合格则保持显式 unknown 策略。已知超限不继续发送；未知容量不声称 full-fit。对所有声称支持的模型/配置给出实际 Provider 证据。

本版最低要求是有用、可信的**当前会话内跨轮延续**，不是自动持久化全历史或训练数据。跨 reload 持久 Memory 若后续加入，另设 schema/迁移/隐私和失效语义，永不恢复权限。

### 6.4 通用委托与任务状态

0.3.17 将一个目标范围内的权限、执行预算、失效时间与来源落实到通用 Grant/TaskRun。用户可以授予明确范围内的连续工作，不必机械批准每一个低风险已授权步骤；不满足权限或出现风险/歧义就回 Review/询问/拒绝。

模型 proposal、用户批准、实际 Host 调用、提交、no-op、验证和任务完成分别记录。结果未知就是未知。执行失败可设计受控 replan，但提交不确定不能自动重试同一 mutation，也不能借“恢复”无条件撤销用户可能已改变的工程。

保持单 Core 全局单 active objective；并发、排队、后台多任务作为独立后续能力评估，不因按钮体验问题直接打开并发。

### 6.5 产品展示分成三个互相连接的层

| 层 | 展示什么 | 不承担什么 |
|---|---|---|
| 对话 / Reasoning | 用户输入、模型文字、可折叠推理输出 | 不证明动作已完成。 |
| Task / Proposal / Review / Execution | 当前目标、步骤、待批准的本地变化与范围、执行状态 | 不持有 Native binding 或生成授权。 |
| Result / Recovery | 已验证完成、no-op、未执行、拒绝、部分完成、提交/验证不确定与下一步 | 不把 cancelled 解释成回滚，不替模型编造事实。 |

Review 不再把长变化文本挤在按钮行。目标和前后值必须来自本地受控投影，长名称可全文审阅，批准范围明确。任务完整摘要可由本地事实确定性生成；reasoning 或 assistant 文字可以解释但不能覆盖结果事实。

混合响应中的模型正文、validated proposal/action 与本地执行事实保持不同类型；结构化响应只能在 terminal validation 后进入下一层。任何“流已结束”不自动等于“任务已完成”。

### 6.6 AE Action Coverage Matrix

0.3.15 建立初始动作全集及支持宿主/版本边界；0.3.18 起逐波填充。目标范围需明确列举，不能默默把原来的“完整 AE Agent”收缩为“常用动作”。对无法由当前宿主接口提供的动作，保留研究过程、原生约束、尝试和可复查证据。[S-P]；[S-R]

建议矩阵列：动作 ID/族、支持环境、读/分析/修改类别、参数/结果、观察前提、目标解析、scope/risk/权限、Host 路由、Undo/副作用、Verify 证据、UI Review/Result、离线/浏览器/AE 用例、限制、不可达证据、负责人、当前状态。

建议状态：`UNASSESSED / SCOPED / IMPLEMENTED / INTEGRATED / AE_ACCEPTED / AE_PLATFORM_UNREACHABLE_EVIDENCED`。只有后两类在符合目标边界与证据审核后可计入 CC 关闭；技术实现但无端到端证明不能直接算覆盖。算法参数范围/对象子类型未覆盖时保留子条目，不能用一次 happy path 掩盖整个动作族。

### 6.7 User History Observation 不等于 Observation Window

历史观察基础继续放在能力完整性之后。它提供 typed、bounded、queryable 的事实与推断记录；AE 状态从 X 变 Y 不自动等于“用户执行了操作 Z”。当前 Vela 自身动作可以有更强来源证据，外部/用户动作的因果归属按实际可观察能力记录。[S-R]；[S-P][S-ARCH]

0.4 的 Observation Window、时间轨迹理解、长期偏好与规划质量，是对已经可用 Agent 的深化。0.3 必须先拥有可信基础；不能把未来窗口 UI 作为基础历史记录缺失的借口。

<a id="section-7"></a>
## 7. 各版本工作包与退出条件

本章是版本级 work package，不是单个 Codex prompt。每个版本可以包含多次只读审计、多个 focused PR 和多轮实机验收。优先级、原始证据与具体测试见[问题总账](#section-8)。

### 0.3.12 — 基线安全与事实链收口

**目的：不把当前已知的安全、事实或资产风险带入新 UI 与能力扩量。**

| 切片 | 范围与交付 |
|---|---|
| A0 基线对账与证据升级 | 入仓本指导书和新路线；更新入口状态；固定实际源码清单；为原摘录/模型发现建立生产模块重验用例；登记八项新退出门。 |
| B1 公共 Host 数据边界 | A01、A11、G-02：不执行代码的 JSON、完整转义、代理项/UTF-8 参数验证；不破坏原结果信封。 |
| B2 普通工具数据/几何 | A08、A09：用户注释归属与恢复，坐标空间契约及失败语义；独立工具 AE/Undo 验收。 |
| C1 Session 事件正确性 | A04：确切事件收据、重入次序、订阅隔离与 data-only 快照。 |
| C2 执行事实与最终验证 | A02、A03：committed-target Verify、no-op/提交不确定三态；Session 与 trajectory 证据强度一致。 |
| D Provider/活动任务生命周期 | A05、A06、A07、A12：启用/确认/检查/停用正确 owner、单调流终态、可重试收束；不能隐藏后台任务控制。 |
| E 用户资产与退出安全 | AP-01–03、UX-01–02：保存事务、快照、保存反馈、Escape 和用户主动离开协商。 |
| F 最小可审阅确认 | UX-03：批准前完整变化可读、可靠目标/范围说明；结构上为后续正式卡片留接口，不要求此时完成最终视觉。 |
| G 集成与封存 | 聚合安全/数据/目标漂移/取消/No-op/后台会话/Palette dirty 等旅程；原报告 UNKNOWN 和未覆盖项重新标定。 |

**退出：**所有影响生产安全、提交真实性、活动任务可控性、用户资产和知情批准的已报告 P1 问题完成生产级复核与处置；本版本承诺修复的 P2 同样交付。不能复现的条件性问题需有确切条件差异和风险裁定，不能只写“本机正常”。完成对应真实 AE/CEP 检查；全量回归使用当时真实测试数量，不沿用 182/182 假装新测。

**不在本版做：**批量更换 UI 默认数值、能力大扩张、完整历史注入、并行 objective。必要的共享模块结构替换允许进行，但不能用 UI 重构拖延关键修复。

### 0.3.13 — 视觉基线与 UI 平台重建

**目的：先证明新页面视觉成立，再让底层能够稳定生成它。**

| 切片 | 范围与交付 |
|---|---|
| A 真实页面/生效样式审计 | 全 CSS、inline 写入、component/domain alias、配置覆盖与当前页面状态；记录视觉候选原因，不把旧数字当结论。 |
| B 参考页面与新视觉契约 | Registry、Settings、Vela、Palette 样页；层级/比例/操作权重/窄布局/字体角色/动效含义；先人工批准再扩散。 |
| C 样式平台重构 | 单一语义决议与最终 CSS 投影，声明 owner/优先级/preview；合并重复实现，拆 main/CoreUI，定义兼容层退出。 |
| D 共享交互 owner | overlay 栈、Escape、leave negotiation、焦点、手势/resize/capture、scroll anchor、preview/commit/cancel、清理与失效。 |
| E Vela 基础交互 | AP-07、UX-05–09：状态文字/tone一致、窄栏优先级、起草资格、非空会话关闭确认、键盘与 native/shared control 决策。 |
| F 新平台验收 | 真实组件模块和参考页面使用同一实现；默认/用户/校准配置与回退；旧路径有列表和迁移时点。 |

A10、AP-05/06、UX-07 等旧缺陷应在新交互 contract 中闭合，不额外保留一套 legacy 行为补丁。非 UI 的 Authority/Grant/Host 不能被并入 shared UI controller。

**退出：**整页参考通过视觉与行为评审；共享平台可以复现同一视觉、解释每项样式来源、可靠清理活动交互；关键无障碍/键盘路径实测。允许尚未迁完所有页面，但必须有可运行对照、迁移清单及 0.3.14 删除旧实现的明确安排。

### 0.3.14 — 产品 UI 迁移与外观一致性

**目的：把新基线真正应用到整个产品，而不是只留在 Lab。**

| 顺序 | 交付 |
|---|---|
| A Registry + Shared Controls | 复杂工具字段/分组/动作清晰；保留 schema 业务语义；迁移数字、颜色、选择、折叠、文本/JSON、滚动与预览控件。 |
| B Settings + Palette | 新 IA/视觉层级、统一离开与保存反馈、长页面/图编辑/导入导出；不丢数据，不重建整个 Workspace 破坏焦点/滚动。 |
| C Home + Vela | 保留 Home 品牌与工具身份，减少常驻噪声；会话/草稿/状态/Review/streaming 与新视觉体系一致。 |
| D 程序化外观语义 | AP-04：固定与算法配色参数作用域；AP-08：stream→terminal 同角色；源/展示签名、缓存/生成预算和 DPR。 |
| E 旧路径删除与迁移验收 | 删除已被替代样式、class alias、旧工厂与重复写入；验证旧用户数据、默认值与回退，不依赖清空配置。 |

**退出：**Home、所有当前 Registry 工具、Settings、Palette、Vela 的真实页面均采用新平台；中英文/窄短面板/缩放/DPI/焦点/异常状态完成基线。P1 路径不得因新 DOM/样式回归。仅修底层测试通过但用户仍看到旧页面，不能关闭本版本。

**此时不是最终 Agent UI Completion。** 当前能力对应的 UI 要完整；新增通用能力/任务在 0.3.17 和每波覆盖中继续接入，0.3.24 做全域收口。

### 0.3.15 — Capability Model Generalization

**目的：解除“加一个能力就改遍整条链”的结构限制。** 原 0.3.12 的语义完整迁到这里，不缩水为少量新工具。

工作包：能力专用化地图；共同描述/调用/结果与 local-only 元数据；结构性 schema 与失败边界；logical plan 有界但不写死能力/顺序；模型可见能力选择；Compiler/Authority/Host adapter 分工；Intent Gate 替代与迁移；UI 的 capability-aware 只读投影；AE Action Matrix 初始化。

**退出：**旧不透明度/重命名能力不回归；至少覆盖 read、analyze、mutate 三种不同职责和非单标量形态；同类新能力不需 Provider/Driver/Review/Surface 多层能力特判；所有调用仍经注册、参数验证、策略和 Host 合同。安全相关新增分支都有负向用例。尚未扩成完整 AE coverage 不影响泛化本身封存，但不得宣称产品已经完整。

### 0.3.16 — 有界上下文消费与 Provider 容量预算

工作包：更新 Context selection/consumption 契约；有来源的跨轮输入；当前目标与历史讨论关系；fresh Observation 与旧事实分离；模型/实例容量来源资格；system/schema/observation/history/user 与生成保留的完整核算；超限选择/裁剪/拒绝与精确省略；未知容量兼容模式；本地 Provider 实证。

**退出：**有意在上下轮延续的目标和引用可正确消费；跨会话不泄漏，旧授权不能复用；输入超限与容量未知可解释；raw reasoning 不被默认当历史注入。不能只以 debug evidence 中出现 history candidates 关闭本版，必须验证真正发给模型的输入。

**不要求：**持久 Memory、全历史无限保留、Observation Window、专精模型训练。若历史摘要加入，必须小于原文且保留 derived 类型；不通过摘要获得权限事实。

### 0.3.17 — 通用任务委托与 Agent 任务体验

工作包：通用 Grant/TaskRun 的 scope/risk/budget/expiry/provenance；多步计划当前步与后续步的 Review 范围；本地 TaskPresentation；Proposal/Review/Execution/Result 组件；有类型的正文+proposal/action 组合；失败/取消/部分完成/验证不确定；任务活动与 Provider 生成状态分离；同会话起草与全局 admission 反馈。

**退出：**授权内多步可连续运行，越界/歧义/风险升级进入正确 Review 或拒绝；用户能读清批准范围，结束时准确知道哪些变化已发生。自动执行不绕过两条 Spine；取消不释放尚未收束的 Host 任务，不自动回滚已提交结果。

本版本使用 0.3.13–14 的新 UI 平台，不再创建第三套任务卡样式系统。旧一次性不透明度权限入口可迁为通用受限委托入口，需显式内部 API/用户语义迁移，不永远并列两个权威来源。

### 0.3.18 — AE Coverage I：工程、合成、图层

从 0.3.15 矩阵取本波动作清单，而非仅列出几个示例能力。交付结构观察、工程/素材组织、合成/图层创建与管理、对象解析等本波目标动作。必须覆盖对象类型、可用性、scope、部分失败、删除/重排/切换后的目标失效。

本波同时复核普通工具 Host 行为与新 Agent 能力交界；不能因为某个工具不是由 Vela 调用就排除用户数据风险。每个动作应具备注册、Host 合同、输入/结果验证、UI 审阅/结果和真实 AE 证据。

### 0.3.19 — AE Coverage II：属性、关键帧、时间

工作包包括属性路径/类型、标量与多维值、关键帧及插值、时间/持续时长相关动作。具体清单以矩阵为准。测试属性支持差异、keyframed/non-keyframed、表达式驱动、时间改变、已满足、不可写和多目标部分完成。

**退出：**本波矩阵逐条满足条件，不把“属性 setter 可用”当成整个属性族已完整；验证方法对具体动作有实义。

### 0.3.20 — AE Coverage III：文字、形状、路径、表达式

工作包包括文字内容与已声明样式/结构、形状与路径结构、相关蒙版数据、表达式读写/启停等受控动作。表达式是有专门风险和结果验证的能力，不是给模型开任意 ExtendScript 执行通道。

**退出：**结构性变更、属性依赖、名称/Unicode/数据大小、撤销和失败结果可验证；不能通过生成一段任意脚本绕过能力矩阵。

### 0.3.21 — AE Coverage IV：效果与合成关系

工作包包括效果及其参数、遮罩/轨道遮罩的组合关系、父子结构、预合成与跨合成依赖。本波必须明确何种对象/效果/环境在声明支持范围内；第三方/宿主限制不能被模糊地当作已支持，也不能悄悄缩小原矩阵。

**退出：**跨对象 fresh dependencies、关联重排、缺失引用、局部提交/Undo 和 Verify 有证据；本波条目关闭但全局 CC 仍以完整矩阵为准。

### 0.3.22 — AE Coverage V：媒体、输出与全矩阵回扫

工作包包括目标范围内的媒体、音频、导入/输出、渲染队列与工程级工作流；文件/外部副作用明确授权和成功证据。不能假设所有动作都有 Undo，必须给出真实副作用与停止/恢复边界。

在本波末逐项回扫所有目标动作和此前未覆盖子类型。**退出只有两种合法结果：CC 通过；或继续追加下一个 0.3.x 覆盖版本。** 不用“覆盖了最常用的操作”替代完整性，不把未研究清楚标记为平台不可达。

### 参考 0.3.23 — User History Observation Foundation

前置是 CC，而不是日期或某个固定版本号。提供 typed、bounded、queryable 历史来源、事件/状态变化、可信事实与推断分离、精确省略和可查询索引。能力本身的观察结果必须足以支持这些历史记录。

**退出：**Vela 的执行事实、AE 状态观察、外部/用户动作推断均有来源与边界；查询结果不恢复权限、不代替当前新鲜事实。最低交付可以限定在明确生命周期内；跨重启档案另行声明，不静默承诺无限持久化。

### 参考 0.3.24 — Agent UI Completion

将全部已交付能力与历史观察接入新 UI：完整任务/行动/结果回合组合、长文本与结构化数据、范围/风险、部分完成/拒绝/取消、会话生命周期、空/错误/配置状态、支持信息、键盘与响应式，以及有界展示遥测。

TTFT、reasoning/output/total tokens、TPS、总时长仅在有合格来源时展示；无来源显示不可用/未知。这些值不进入 Agent 任务状态、Observation 或 Authority。reasoning 的保留/截断/虚拟化有明确省略语义。

**退出：**普通用户不借助 Console 就能理解完整旅程；每波能力引入的 UI 都遵循同一视觉和行为 contract；不是此时才首次解决 UI 杂乱。

### 参考 0.3.25 — Integrated AE Acceptance & Model Qualification

制定真实任务矩阵，涵盖多步/跨轮/多会话、授权/Review、目标漂移、no-op、部分完成、模型错误/超限、取消/停用/重开、资产保存/恢复、各 UI 状态。测试的模型/Provider/配置/宿主/版本/能力范围写入证据；资格标准先定，再采样，不能按一次成功挑选结果。

每项安全负向用例必须符合边界；模型任务成功率、延迟和输出质量的接受阈值通过测试设计决定，本文不捏造具体通过比例。局部读取成功、readiness PASS、单模型的一次演示均不能单独成为资格。

**退出：**正式支持集有资格记录，已知风险有裁定，任务结果和真实 AE 值/Undo 对照成立。无合格默认模型时，不解除现有 no-qualified-default-model 阻断；实际支持集必须以资格证据决定。

### 参考 0.3.26 — Product / Architecture Stabilization

完成全源码覆盖台账最终对账；清理重复/死实现与过期 shims；长期运行、缓存/内存/监听/渲染与日志预算；输入/输出/用户设置/工程 metadata 迁移与回退；文档/current 状态/支持矩阵/版本关系；可分发构建与真实安装/重开。

**退出：**[八项新 hard exit gates](#section-10) 全部通过，所有安全/数据/事实/知情批准的关键阻断已处理，剩余非阻断问题和条件精确可追踪。发布准备和 main/tag 操作按独立流程执行，不由此文档授权自动推送。


<a id="section-8"></a>
## 8. 完整问题与工作项总账

本章保留所有原始 A/AP/UX ID；G/V/COV 为本次整合增加的分类。**54 项工作项不等于 54 个漏洞**，其中包含产品缺项、设计决策、未完成审计和原有不确定性。表中的主办版本是本 R1 的分配；COV 的主办表示启动/主要 owner，不意味着该版本已完成所有覆盖。尾部版本受 CC 顺延规则约束。

没有条目因编制本文而变为已修复；每项仍须按证据等级生产重验或设计裁定。原报告中已排除的 X01 不加入缺陷列表。


### 8.1 跨模块源码发现（12 项）


| ID | 事项 | 分类/优先级 | 主办版本 |
|---|---|---|---|
| A01 | 公共 Host 元数据解析进入 eval | 条件性安全缺陷 / P1 | 0.3.12 |
| A02 | 一次性授权最终 Verify 丢失原提交目标关联 | 执行证据正确性 / P1 | 0.3.12 |
| A03 | already-satisfied 被记录为 committed:true | 事实记录正确性 / P2 | 0.3.12 |
| A04 | Session 重入、订阅异常和可变 payload 破坏事件语义 | 事件基础设施 / P2 | 0.3.12 |
| A05 | 撤回实验 acknowledgement 后仍启用 | 启用条件与生命周期 / P2 | 0.3.12 |
| A06 | 全局停用只操作当前视图，后台任务可能失去入口 | 任务可控性 / P1 | 0.3.12 |
| A07 | SSE 终止原因可逆，终止后仍接收内容 | Provider 协议完整性 / P2 | 0.3.12 |
| A08 | Detach 清空原始用户注释 | 普通工具用户数据 / P2 | 0.3.12 |
| A09 | 坐标转换失败被伪装为有效几何 | 普通工具结果正确性 / P2 | 0.3.12 |
| A10 | 非 follow 状态仍按全部新增高度移动阅读位置 | UX 设计裁定＋实现候选 / P2 | 0.3.13 |
| A11 | 公共 serializer 未转义全部 C0 字符 | Host 数据编码 / P2 | 0.3.12 |
| A12 | readiness 被 suspend 作废后卡在 checking | UI/Provider 生命周期 / P2 | 0.3.12 |


#### A01 — 公共 Host 元数据解析进入 eval

**当前条目（2026-09-09 用户裁定）：TARGETED_ACCEPTED / READY FOR COMMIT / PR。** 公共入口修复已实施，复用实施轮1122 focused assertions、183/183 suites PASS（0 skipped）；六组有界真实 AE 验收已接受。无可用 JSON.parse 回退为生产模块 VM PASS / 真实 ExtendScript NOT COVERED；本次 dev 合并接受该覆盖风险，0.3.12-G 重新裁定。`__proto__` 特殊环境、FolderItem 与 null 差异、有限字段/Undo/时间观察及未捕获动作回调均保留限制，见 [A01 报告](../reports/vela-0.3.12-b1-a01-host-json-entry.md#验收裁定与剩余覆盖)。INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G；若出现回退解析错误、安全属性处理失效或相关回归，立即重新打开对应修复，不等待整合阶段。修复 commit / PR 尚未产生，关联待后补。

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.25。
**原有证据：**原报告 E1：隔离 Node/VM 摘录；真实宿主条件未验证。[S-A]
**定位：**`host/index.jsx::parseJson；host/tools/adComponentKit.jsx::parseArtifactMetadata/parseMetadata/getState`。

缺少原生 JSON.parse 时公共解析器把工程 comment 元数据作为 JavaScript 表达式执行；元数据字段校验在执行之后，状态读取也可触及入口。

**关闭标准：**换为不执行代码的严格解析；原生/无原生 JSON、合法/坏元数据与状态轮询负向回归；确认无效输入无副作用。

**边界：**条件是无原生 JSON.parse 且元数据入口被调用；不能写成打开任意工程就执行代码。


#### A02 — 一次性授权最终 Verify 丢失原提交目标关联

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.17；0.3.25。
**原有证据：**原报告 E2：真实跨文件路径＋受控模型；未重放 AE 切层竞态。[S-A]
**定位：**`velaAgentDriver.js::runIteration；velaRuntime.js::verifyAction；velaContextBridge.js::opacityVerificationPort`。

一次性授权执行后的 fresh Verify 读取当前选择，只比较数值；显式 Review 使用 committed-target 路径。Owner 承认 current-selection 的关联 unproven，Driver 仍可据 fresh/matches 完成。

**关闭标准：**两条最终验证都须证明实际提交目标关联；换同值/不同值层、目标变化或删除、切合成、迟到 Verify 均有生产与实机证据。

**边界：**不是已证明写错目标；提交时仍有 digest 验证。不得混同已接受的发送至 Review 前重新绑定。


#### A03 — already-satisfied 被记录为 committed:true

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.17。
**原有证据：**原报告 E2：交接模型；完整 no-op 链未重跑。[S-A]
**定位：**`velaRuntime.js approved continuation；velaAgentDriver.js::resolveReview`。

真实提交和已满足状态都被约化为 verification-required；Driver 随后统一记录 committed:true，使 Session 与 trajectory 可能矛盾。

**关闭标准：**明确 mutation disposition 与 committed 三态；比较 mutation/no-op/失败/不确定时的 Session、trajectory、Host 次数、Undo 和 Verify。

**边界：**no-op 仍需 fresh Verify；不通过强制写入或跳过验证统一记录。


#### A04 — Session 重入、订阅异常和可变 payload 破坏事件语义

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.16；0.3.23。
**原有证据：**原报告 E1：4 类摘录复现；非完整模块验收。[S-A]
**定位：**`velaSessionRuntime.js::appendInternal/publishAuthorityInternal/subscribe`。

append 使用日志末项而非本次 event 通知/返回；重入会投递另一个事件，异常阻断后续订阅，退订使遍历跳项，getter 使冻结记录仍可变化。

**关闭标准：**稳定事件收据身份、确定重入顺序、订阅快照及观察者异常隔离、严格 data-only 快照；push 与 replay 对照。

**边界：**本地 getter 不是模型 JSON 注入；不得因此宣布 Authority event 可伪造。


#### A05 — 撤回实验 acknowledgement 后仍启用

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.13。
**原有证据：**原报告 E1：ready 与 checking 两种摘录复现。[S-A]
**定位：**`velaSurfaceController.js::configureExperimental/enableExperimental；main.js acknowledgement`。

配置变更仅检查 endpoint/model；撤回确认既不失效已启用状态，也不作废同配置在途 readiness。

**关闭标准：**本方案将“当前 acknowledgement=true”定为实验启用条件；撤回后禁止新请求、作废旧 readiness，并按 A06 的已存在任务控制语义收束。

**边界：**Provider 启用确认不等于 mutation grant；不得将二者合并为一个布尔权限。


#### A06 — 全局停用只操作当前视图，后台任务可能失去入口

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.17。
**原有证据：**原报告 E2：分派/投影模型；完整多会话 AE 场景未复现。[S-A]
**定位：**`main.js Disable handler；velaSurfaceController.js；Conversation admission`。

全局启用意愿被关闭，但取消仅到达 selected Surface；后台 Review 可以继续占 holder，返回时 disabled 又把操作投影成 send。

**关闭标准：**面板级 Provider 启用由面板级 owner 决议；停用禁入新请求，并向真实 active owner 发出停止后续工作的命令，保留取消/拒绝与收束反馈。

**边界：**停用不是强制中断不可中断 Host 写入；不得提前清 holder、丢迟到结果或暗示回滚。


#### A07 — SSE 终止原因可逆，终止后仍接收内容

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.25。
**原有证据：**原报告 E1＋Adapter 静态路径。[S-A]
**定位：**`velaProviderStreamAssembler.js::consumeFrame；velaProviderAdapter.js terminal wrapper`。

length 可被后续 stop 覆盖，finish_reason 后的 content delta 仍被拼接；后续正常终态检查无法看见已经丢失的错误。

**关闭标准：**终态单调；矛盾 finish、终止后内容、截断/错误帧等有严格规则和生产模块对抗回归。

**边界：**保留合法 DONE 提前结束读取；不把异常 Provider 帧风险扩写成任意部分 JSON 直接执行。


#### A08 — Detach 清空原始用户注释

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.18。
**原有证据：**原报告 E1：变更循环夹具；AE Undo 未实测。[S-A]
**定位：**`host/tools/adComponentKit.jsx::setLayerArtifactMetadata/restoreSourceLayerBinding/detachSelectedComponent`。

source binding 已保存 previousCommentEncoded，但 Detach 对所有组件层直接清空 comment；Remove 与 Detach 的数据归属处理不一致。

**关闭标准：**分别处理 generated layer 与 source binding；恢复原注释，只移除工具拥有的数据；真实 AE 值与 Undo 验收。

**边界：**不宣称永久不可恢复；不趁机清理无归属证据的表达式或其他用户数据。


#### A09 — 坐标转换失败被伪装为有效几何

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.18–0.3.21。
**原有证据：**原报告 E1：能力夹具；宿主/API/图层矩阵待验证。[S-A]
**定位：**`adComponentKit.jsx::getLayerVisualBoundsInComp；textBackgroundBox.jsx::layerVisualBoundsInComp`。

旧路径 toComp 失败后直接使用局部点，另一条背景路径则返回 null；严格 Grid 路径已有 sourcePointToComp 对照。

**关闭标准：**定义受支持的坐标空间与 Host 转换；不可转换明确失败；父级、旋转、缩放、时间、2D/3D 和表达式条件做矩阵。

**边界：**不声称所有 AE 都没有 toComp；禁止只替换 API 名字而不验证空间语义。


#### A10 — 非 follow 状态仍按全部新增高度移动阅读位置

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**原报告 E1 数值行为；无完整浏览器/AE 阅读锚点验收。[S-A]
**定位：**`velaTranscriptView.js::renderWithTransient/restoreScroll`。

新增内容即使仅在视口下方，follow=false 也使用 oldTop+总高度增量，可能移动用户正在阅读的消息。

**关闭标准：**本方案采用“可见消息锚点＋偏移”契约；只有锚点上方变化才补偿；新消息、reasoning 折叠、切语言/会话均验收。

**边界：**这是本次明确的新阅读语义，不伪称原基线已有该契约；不误裁剪安全记录。


#### A11 — 公共 serializer 未转义全部 C0 字符

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.25。
**原有证据：**原报告 E1：U+0001 与换行对照。[S-A]
**定位：**`host/index.jsx::jsonEscape/toJson/stringify`。

公共字符串转义漏掉部分 U+0000–U+001F，可能输出无效 JSON；私有 Vela JSON 路径不自动补救公共返回。

**关闭标准：**完整字符串转义与严格往返；覆盖所有 C0、多语言、引号/反斜线、异常信息及既有结果形状。

**边界：**与 G-02 的参数代理项校验是不同问题；具体工程发生频率未知。


#### A12 — readiness 被 suspend 作废后卡在 checking

**分配：**主办 0.3.12；集成/回验 0.3.13；0.3.14。
**原有证据：**原报告 E1＋main 入口定位；完整实机待测。[S-A]
**定位：**`velaSurfaceController.js::enableExperimental/suspend/resume`。

generation 失效旧检查但状态仍 checking，resume 不退出，再次 enable 又提前返回，形成不可重试状态。

**关闭标准：**失效检查必须进入明确可重试态；恢复后自动重试或提示重试有契约；不接受旧 generation 结果。

**边界：**面板 suspend 与切会话重建 Surface 是不同路径，分别测试。


### 8.2 外观专项发现（8 项）


| ID | 事项 | 分类/优先级 | 主办版本 |
|---|---|---|---|
| AP-01 | Palette 失败回滚可能删除未知旧数据 | 条件性用户资产风险 / P1 | 0.3.12 |
| AP-02 | 外观应用成功与保存成功未区分 | 持久化反馈 / P2 | 0.3.12 |
| AP-03 | 外观快照泄漏可变引用及默认值污染 | 数据拥有权 / P2 | 0.3.12 |
| AP-04 | 固定 Palette 的参数作用域与控件承诺不一致 | 参数语义与性能 / P2 | 0.3.14 |
| AP-05 | 旧滑块 input 即持久化 | 交互迁移债务 / P3 | 0.3.13 |
| AP-06 | 活动 ResizeGrip 销毁不结束手势 | 交互生命周期 / P2 | 0.3.13 |
| AP-07 | 跨会话文案与颜色分别投影 | 状态展示 / P3 | 0.3.13 |
| AP-08 | 流式与最终正文角色和缩放来源分叉 | 排版一致性候选 / P3 | 0.3.14 |


#### AP-01 — Palette 失败回滚可能删除未知旧数据

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.14。
**原有证据：**原报告：手工转录存储故障夹具；原生 localStorage 条件未重放。[S-AP]
**定位：**`palette/paletteStore.js::commit`。

previous=null 混淆读取失败与确认无旧值；getItem 抛异常且 removeItem 可用时，未写入新值也会删除原资产。

**关闭标准：**独立记录 oldValueReadSucceeded/previousValue/writeAttempted；未知旧状态不删除；写入/回滚双失败和迁移证据保留测试。

**边界：**不是所有配额失败都会丢色卡；不得坏数据自动恢复默认覆盖旧资产。


#### AP-02 — 外观应用成功与保存成功未区分

**分配：**主办 0.3.12；集成/回验 0.3.13；0.3.14。
**原有证据：**Appearance 局部故障复现；Design Tuning 同类静态确认。[S-AP]
**定位：**`appearanceStateStore.js/appearanceResolver.js；designTuningStateStore.js/designTuningResolver.js；main.js`。

Resolver 忽略保存失败仍返回成功；无 storage 也可报告 persisted:true，显示值与重启恢复值分离。

**关闭标准：**本方案采用 accepted/applied/persisted 分离；失败可保留当前外观但必须标为未保存，并提供重试和还原至已保存值；reset 同契约。

**边界：**基础 Settings 由 main wrapper 保存不是本项缺陷；不擅自将临时值变成持久化事实。


#### AP-03 — 外观快照泄漏可变引用及默认值污染

**分配：**主办 0.3.12；集成/回验 0.3.13；0.3.14。
**原有证据：**原报告：对象引用夹具；当前普通消费者是否误用未知。[S-AP]
**定位：**`appearanceStateStore.js::getOverride/getOverrides/snapshot；appearanceResolver.js::DESIGN_DEFAULTS/getResolvedValue`。

浅拷贝和直接返回 colorAlpha 嵌套对象使读接口成为写接口；外层冻结不足以保护工厂默认值。

**关闭标准：**入库独立规范化、对外深快照、默认值深冻结；跨实例与绕过校验负向测试。

**边界：**本地 JS API 风险，不是用户拖动必现，也不是远程模型注入。


#### AP-04 — 固定 Palette 的参数作用域与控件承诺不一致

**分配：**主办 0.3.14；集成/回验 0.3.14。
**原有证据：**原报告：固定 recipe 的数值内核转录；非完整引擎/Canvas。[S-AP]
**定位：**`proceduralAppearance.js::createPalette/createFixedPalette/renderField；proceduralHomeIcons.js`。

固定 Palette 不消费 saturation/brightness/hueShift，但参数进入 source identity，可能重绘而无像素变化；Home 图标使用固定映射。

**关闭标准：**本方案保留固定 Palette 默认保色：仅算法配色适用的参数明确标注/按分支禁用；如确需固定 Palette 调整，另设明确变换契约与兼容/引擎版本迁移。

**边界：**不暗改同 engineVersion 的旧输出；hueShift 只确认源 API 参数，不伪称当前 Home 有该滑块。


#### AP-05 — 旧滑块 input 即持久化

**分配：**主办 0.3.13；集成/回验 0.3.14。
**原有证据：**原报告：事件夹具；没有实机卡顿数据。[S-AP]
**定位：**`main.js::linkPersistedRange/setupUiScale/setupMotionSpeed/BackgroundEngine.bindControls`。

旧基本设置和背景滑块每次 input 都保存，与新 Appearance/Tuning 内存预览和最终 commit 并存。

**关闭标准：**统一 gesture preview/commit/cancel；明确键盘、Enter/blur、pointercancel、离开页面语义，并迁移旧消费者。

**边界：**不以 debounce 代替提交语义；不宣称所有外观控件都每帧写入。


#### AP-06 — 活动 ResizeGrip 销毁不结束手势

**分配：**主办 0.3.13；集成/回验 0.3.14。
**原有证据：**原报告：事件夹具；完整导航到达性未验证。[S-AP]
**定位：**`ui/coreUi.js::bindResizeGrip/createTextarea`。

cleanup 只拆 pointerdown 和视觉 class，活动 move/up/cancel/blur 监听继续持有并修改已移除 frame。

**关闭标准：**活动终结器属于控制器生命周期；dispose/失焦/捕获丢失幂等终结并释放捕获；验证剩余监听与旧 DOM 不再写入。

**边界：**不能只删视觉 class，也不能把所有页面离开一律解释为提交。


#### AP-07 — 跨会话文案与颜色分别投影

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.17。
**原有证据：**原报告：交接夹具；完整 Surface 未运行。[S-AP]
**定位：**`velaSurfaceController.js::synchronize；StatusToneContract`。

other-running 只替换文字，保留 selected conversation 旧 completed/success tone。

**关闭标准：**单一最终 display status 同时产生 label/tone/accessibility；保留选中会话真实历史，不让 UI 改任务状态。

**边界：**颜色修复不得触碰 admission/权限逻辑；全局与局部状态可不同但各自一致。


#### AP-08 — 流式与最终正文角色和缩放来源分叉

**分配：**主办 0.3.14；集成/回验 0.3.14；0.3.24。
**原有证据：**原报告：隔离 Chromium CSS；未加载完整级联。[S-AP]
**定位：**`style.css typography tokens；velaSurface.css transient/message selectors`。

transient 正文继承 body、最终正文显式 supporting；固定像素间距与 UI Scale 并存。

**关闭标准：**同一 assistant 正文跨 streaming/terminal 用同角色；reasoning 可独立轻量角色；完整 CSS/中英文/尺度状态视觉对照。

**边界：**不将隔离 CSS 差异写成每个安装环境必现；不机械把所有 px 变全局 token。


### 8.3 UI/UX 专项发现（9 项）


| ID | 事项 | 分类/优先级 | 主办版本 |
|---|---|---|---|
| UX-01 | Escape 被菜单与 Settings 两层消费 | 交互正确性 / P1 | 0.3.12 |
| UX-02 | Palette 外层关闭绕过 dirty gate | 用户草稿保护 / P1 | 0.3.12 |
| UX-03 | 批准前目标、范围与完整变化不可充分审阅 | 知情批准与产品缺口 / P1 | 0.3.12 |
| UX-04 | 完整任务及部分完成结果缺少对应呈现 | Agent 产品完成度 / P2 | 0.3.17 |
| UX-05 | 窄栏按位置而非信息重要性隐藏状态 | 响应式信息层级 / P2 | 0.3.13 |
| UX-06 | 会话关闭是销毁但没有内容保护 | 产品语义选择 / P2 | 0.3.13 |
| UX-07 | 键盘焦点交接与模态连续性不足 | 交互缺陷＋待验证项 / P2 | 0.3.13 |
| UX-08 | 起草被绑定到 Provider 启用 | 首次使用产品建议 / P3 | 0.3.13 |
| UX-09 | 会话原生控件与共享交互体系分叉 | 共享组件收敛建议 / P3 | 0.3.13 |


#### UX-01 — Escape 被菜单与 Settings 两层消费

**分配：**主办 0.3.12；集成/回验 0.3.13；0.3.14。
**原有证据：**原报告 UXP10：浏览器事件＋摘录，关闭函数计数替身。[S-UX]
**定位：**`coreUi.js::triggerKeydown；main.js document keydown`。

菜单仅 preventDefault，外层不尊重消费结果，单次 Escape 同时退出两层。

**关闭标准：**先修事件消费，后由统一 overlay/input owner 调度；菜单/picker/文本编辑/模态每次只结束应结束的一层。

**边界：**不依靠同时 close 所有层获得表面干净；与 UX-02 联合验收但保留独立 ID。


#### UX-02 — Palette 外层关闭绕过 dirty gate

**分配：**主办 0.3.12；集成/回验 0.3.13；0.3.14。
**原有证据：**原报告：跨模块静态闭合；未重放全产品 AE。[S-UX]
**定位：**`main.js requestCloseSettings/closeSettingsPanel；systemSurfaceRouter.js；proceduralPaletteWorkspace.js`。

内部返回受保护，外层 Escape/背景关闭直接 discardDraft；Router 又先清 active 再回调，阻碍取消离开。

**关闭标准：**所有用户主动离开先 negotiate leave 再改 route/dispose；保存/丢弃/继续编辑一致；强制卸载与用户离开分开。

**边界：**不是已保存 Palette 资产丢失；不能使 AE/面板卸载等待确认而挂起。


#### UX-03 — 批准前目标、范围与完整变化不可充分审阅

**分配：**主办 0.3.12；集成/回验 0.3.14；0.3.17；0.3.24。
**原有证据：**原版 ConfirmationView blob 核验＋局部 DOM/CSS；非完整 Runtime。[S-UX]
**定位：**`velaConfirmationView.js；velaRuntime.js Review projection；velaSurface.css`。

仅数值/名称 before→proposed 的单行摘要，长文本可被截断且缺展开入口；未呈现目标合成/图层与步骤范围。

**关闭标准：**0.3.12 先保障完整本地变化与可靠可显示目标说明；0.3.17 形成正式 Review 卡，显示步骤与已完成部分；信息不足须阻断或明确重新取得。

**边界：**不是 Authority 绕过。显示快照不能代替 JIT/Preflight，不得让模型描述充当受信目标。


#### UX-04 — 完整任务及部分完成结果缺少对应呈现

**分配：**主办 0.3.17；集成/回验 0.3.24；0.3.25。
**原有证据：**原报告：状态压缩和文案静态确认；终态具体路由待集成。[S-UX]
**定位：**`ConversationOwnership providerState；SurfaceController；PresentationModel；i18n.js`。

多阶段压缩成 pending，结果仍偏单步不透明度文案；缺完整 logical plan 的步骤、部分完成、取消后已有变化摘要。

**关闭标准：**非权威 TaskPresentation 从可信执行/验证事实生成；呈现完成/no-op/未执行/拒绝/部分完成/验证不可用。

**边界：**不让模型编写完成事实；reasoning 不等执行日志，取消不等回滚。


#### UX-05 — 窄栏按位置而非信息重要性隐藏状态

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**原报告 UXP01/02：局部 CSS/DOM。[S-UX]
**定位：**`velaSurface.css narrow；SurfaceController status accessibility`。

静态说明非空时主要任务状态压到 1px；无障碍标签存在不代表视觉用户看得到。

**关闭标准：**保留右侧/窄模式一段可读文本的位置要求，但内容由任务优先级决议；阻塞/待批准/部分完成优先。

**边界：**不直接撤销既定窄面板可读文本要求，不只用圆点传达状态。


#### UX-06 — 会话关闭是销毁但没有内容保护

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**原报告：Switcher 静态路径；不是 0.3.11 架构失效。[S-UX]
**定位：**`velaConversationSwitcher.js::closeRecord；main.js surface unbind`。

活动与最后一个会话受到保护；其他会话即使有草稿/历史，也直接 dispose 并删 metadata。

**关闭标准：**本方案选择：空会话直接关，非空会话明确确认关闭并提示临时性；未来如做恢复，仅恢复不具执行能力的内容。

**边界：**不为撤销关闭而恢复旧 Runtime/grant/Review command；跨重启持久化不是已交付事实。


#### UX-07 — 键盘焦点交接与模态连续性不足

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**原版 Composer UXP09 焦点复现；模态隔离/IME 仍待测。[S-UX]
**定位：**`velaComposerView.js；main.js Vela settings；CoreUI portal controls`。

Send 隐藏后焦点可落 BODY；Ctrl+Enter 未实现但按钮 Enter 正常；模态有初始/返回焦点，完整 Tab containment 未证明。

**关闭标准：**仅在本次用户操作使焦点失效时交接；本方案选 Enter 换行、Ctrl/Cmd+Enter 发送且避开 IME composition；含 portal 的 Tab/Escape 测试。

**边界：**不宣称完全无键盘支持或已发生 IME 误发送；不随异步更新抢焦点。


#### UX-08 — 起草被绑定到 Provider 启用

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.17。
**原有证据：**原版 Composer UXP07/08 对照。[S-UX]
**定位：**`velaComposerView.js；main.js renderVelaSettingsContent`。

Provider 未启用则输入 disabled/readOnly；另一会话活动时已经允许起草、仅禁发。

**关闭标准：**本方案允许先起草；发送资格单独计算并说明前提；Provider enable、任务 grant、单步批准三个概念分离。

**边界：**不自动勾实验确认，不把 readiness 当资格，也不自动授予 mutation。


#### UX-09 — 会话原生控件与共享交互体系分叉

**分配：**主办 0.3.13；集成/回验 0.3.14。
**原有证据：**原报告：静态路径；原生控件不自动构成缺陷。[S-UX]
**定位：**`velaConversationSwitcher.js；ui/coreUi.js select`。

会话使用原生 select，Settings 使用增强 portal select，关闭、焦点、长选项和状态反馈可能拥有不同契约。

**关闭标准：**采用共同 interaction contract；优先复用新 CoreUI 行为，若保留 native 则登记边界与等价测试。

**边界：**不以调用某工厂作为唯一 PASS，不造万能 Renderer，不丢领域 composition。


### 8.4 首轮事项与路线缺项（12 项）


| ID | 事项 | 分类/优先级 | 主办版本 |
|---|---|---|---|
| G-01 | 入口文档与 current/latest 状态漂移 | 基线治理 / P1（开工前） | 0.3.12 |
| G-02 | 图层名末尾孤立高代理项被接受 | 参数验证缺陷 / P2 | 0.3.12 |
| G-03 | 能力专用化分散在整条链路 | 已规划的架构泛化 / 产品硬依赖 | 0.3.15 |
| G-04 | 历史展示与模型跨轮消费尚未连接 | 产品能力缺项 / 0.3 硬交付（本次明确） | 0.3.16 |
| G-05 | 能力扩量缺少真实容量预算闭环 | 上下文/Provider 产品依赖 / 扩量前必须 | 0.3.16 |
| G-06 | 一次性不透明度权限不等于通用任务委托 | Delegated Agent 产品依赖 / 0.3 硬交付 | 0.3.17 |
| G-07 | 模型资格与本地运行支持需要可验证交付 | 产品支持声明 / 0.3 硬交付 | 0.3.25 |
| G-08 | 完整 AE Action Matrix 需提前建立且最终闭合 | 范围与验收治理 / 0.3 硬门 | 0.3.15 |
| G-09 | 原八个 hard exit gates 的精确枚举未保留 | 产品契约重建 / 开工前明确 | 0.3.12 |
| G-10 | 审计 UNKNOWN 与证据分散、全审覆盖未完成 | 证据与覆盖治理 / 持续门禁 | 0.3.12 |
| G-11 | 长期运行的资源边界需要分层测量 | 运行稳定性 / 0.3 退出前闭合 | 0.3.13 |
| G-12 | 混合响应、卡片与展示遥测需要明确归属 | Agent UI 产品缺项 / 0.3 产品形成 | 0.3.17 |


#### G-01 — 入口文档与 current/latest 状态漂移

**分配：**主办 0.3.12；集成/回验 每次封存。
**原有证据：**首轮对话与本次远程 PROJECT_STATE/ROADMAP 复核。[S-R]；[S-S][S-C]
**定位：**`AGENTS.md；README.md；docs/PROJECT_STATE.md；docs/VELA_ROADMAP.md`。

入口历史节点、当前/最新测试数字及已实现多会话语义互相冲突；Codex/DSH 可能读到两套现状。

**关闭标准：**一份当前实现状态、一份当前路线；历史报告不改写；入口只留短摘要并链接；版本对账检查拒绝矛盾 current。

**边界：**0.3.11 功能封存不自动 bump 包版本、不自动发布。


#### G-02 — 图层名末尾孤立高代理项被接受

**分配：**主办 0.3.12；集成/回验 0.3.12；0.3.15。
**原有证据：**首轮对话报告 Node 最小复现；独立脚本未进入三份证据包。[S-C]
**定位：**`velaCapabilityContracts.js::utf8ByteLengthExact/validateLayerNameParams`。

字符串末尾 charCodeAt(index+1) 为 NaN，现有范围比较未拒绝孤立高代理项。

**关闭标准：**生产原模块复验并补边界；合法代理对、孤立高/低代理项、ASCII/多语言与 UTF-8 byte limit 对照。

**边界：**不把未归档的旧最小复现升级成当前完整执行链证据；不是已证权限绕过。


#### G-03 — 能力专用化分散在整条链路

**分配：**主办 0.3.15；集成/回验 0.3.17；每波覆盖。
**原有证据：**首轮源码审计＋现行路线；不是历史阶段 bug。[S-C]；[S-R][S-ARCH]
**定位：**`两套 capability contract/registry；PromptBuilder/RequestBranchPolicy/IntentGate/LogicalPlanContracts；授权入口`。

能力 ID、固定句式、两步顺序和单数值/字符串类型渗入多个层；只改 Registry 不能完成泛化。

**关闭标准：**共享描述与调用契约，执行类别各有适配；非标量/多结果样本；新增同类能力无需全链加 if；词法 Gate 在本地策略替代到位后退役。

**边界：**统一契约不等把 read 强加 nonce/CAS/Undo；注册元数据不等授权。


#### G-04 — 历史展示与模型跨轮消费尚未连接

**分配：**主办 0.3.16；集成/回验 0.3.23；0.3.25。
**原有证据：**本次远程事实：optional history=0；原 0.3.10 明确不包含。[S-R]；[S-S]
**定位：**`Context assembly/selection；Conversation ownership；Provider invocation`。

0.3.10 提供证据与选择资格，0.3.11 提供多会话，不等于模型已经能延续上下轮任务。

**关闭标准：**实现最小有用的跨轮消费并保留来源/类型/新鲜度；历史值不能代替当前 target fact；对话隔离与省略说明验收。

**边界：**不返工否定旧封存范围；不默认注入 raw reasoning，不提前宣称持久 Memory。


#### G-05 — 能力扩量缺少真实容量预算闭环

**分配：**主办 0.3.16；集成/回验 0.3.18–0.3.22；0.3.25。
**原有证据：**远程 A3 现状：unknown compatibility；数值仅合成测试。[S-R]；[S-S]
**定位：**`Provider capacity sources；Context budget selection/accounting`。

当前没有合格 live numeric capacity；扩大 schema/观察/历史不能继续假设全部塞入上下文即可。

**关闭标准：**合格容量和保留量来源、完整请求成本核算；已知超限拒绝/裁剪/选能力；未知模式有显式有界策略与证据。

**边界：**本地模型兼容是硬要求；不捏造 token 容量、不默认复杂 tokenizer 或无限长上下文。


#### G-06 — 一次性不透明度权限不等于通用任务委托

**分配：**主办 0.3.17；集成/回验 0.3.18–0.3.25。
**原有证据：**现行设计目标＋当前能力限定。[S-C]；[S-S][S-ARCH]
**定位：**`Policy/Grant/TaskRun；Driver；Review projection`。

产品目标是授权内持续观察/执行/验证，不是每个步骤都固定人工批准，也不是全局一个 unrestricted 开关。

**关闭标准：**显式 scope/risk/budget/expiry/provenance；授权内连续工作，越权/歧义/高风险回到 Review 或拒绝。

**边界：**ALLOW 不等 Host permission；任何 grant 仍不能绕开 Mutation Safety Spine。


#### G-07 — 模型资格与本地运行支持需要可验证交付

**分配：**主办 0.3.25；集成/回验 0.3.26。
**原有证据：**远程现状 no-qualified-default-model；首轮建议。[S-R]；[S-S][S-C]
**定位：**`Provider readiness/qualification；supported model profiles`。

连得上或一次测试成功不代表模型在能力范围内合格；小模型兼容和预算约束必须参与产品验收。

**关闭标准：**在扩量中持续积累配置级证据，0.3.25 正式签署模型/Provider/参数/能力/宿主支持矩阵；安全与可靠性阈值先定后测。

**边界：**不按模型营销名称推资格，不在本规划中指定未经验证的新模型或云服务。


#### G-08 — 完整 AE Action Matrix 需提前建立且最终闭合

**分配：**主办 0.3.15；集成/回验 0.3.18–0.3.22；CC。
**原有证据：**原始路线及远程 canonical roadmap。[S-R]；[S-P]
**定位：**`docs/design/ae-action-coverage-matrix（待建）`。

Host 有方法、Agent 可调用、能验证结果和动作完整覆盖不是同一层级；“常用足够”不满足原产品目标。

**关闭标准：**每个目标动作映射到观察、参数、目标、Authority、执行、Verify、UI、AE证据；未研究保持 open，平台不可达有可复验证据。

**边界：**分组波次不是缩小目标；不能用 AE_PLATFORM_UNREACHABLE 包装未实现。


#### G-09 — 原八个 hard exit gates 的精确枚举未保留

**分配：**主办 0.3.12；集成/回验 0.3.26。
**原有证据：**项目摘要提到八项，remote 明确未保存原枚举。[S-P]；[S-R]
**定位：**`roadmap hard exit section；frozen architecture invariants`。

现有来源支持若干硬要求，但不支持重建原来的逐条八项内容。

**关闭标准：**本次新定义 GATE-01…08 并在规划 PR 中采纳；保留新旧来源说明，建立任务/证据映射。

**边界：**这是新制定而非找回原清单；不替代冻结架构 13 invariants。


#### G-10 — 审计 UNKNOWN 与证据分散、全审覆盖未完成

**分配：**主办 0.3.12；集成/回验 各版本；0.3.25–0.3.26。
**原有证据：**三份 coverage＋首轮建议。[S-A]；[S-AP][S-UX]
**定位：**`docs/reports；audit coverage ledger；source inventory`。

局部摘录、原模块、浏览器与真实 AE 证据强度不同；历史 UNKNOWN 不能靠追加文档被洗成 PASS。

**关闭标准：**问题保留 ID/源提交/原始证明类型/复核方法/修复提交/验收/未知；完整源码清单驱动覆盖，见 COV 组。

**边界：**不把 46 个继承局部场景当新测结果、全量回归或 46 个漏洞。


#### G-11 — 长期运行的资源边界需要分层测量

**分配：**主办 0.3.13；集成/回验 0.3.16；0.3.24；0.3.26。
**原有证据：**源码/状态记录有可增长 UI/Session；未证明泄漏。[S-S]；[S-C][S-AP]
**定位：**`Transcript/Session；replay/Plan；Palette graph/cache；background/render queues`。

八个会话和草稿长度上限不等于所有内存有界；展示、事实日志、安全重放与缓存需要不同保留策略。

**关闭标准：**UI虚拟化/清理、引用与缓存、长会话/图深度/生成尺寸资源预算有实测；处置与持有者契约一致。

**边界：**不为内存有界随意删安全记录，不把正常增长直接命名为泄漏。


#### G-12 — 混合响应、卡片与展示遥测需要明确归属

**分配：**主办 0.3.17；集成/回验 0.3.24。
**原有证据：**远程路线明确未来 Response Parts/cards/activity/telemetry。[S-R]；[S-C]
**定位：**`Provider typed parts；TaskPresentation；Transcript/Review/Execution cards`。

助手文字、模型推理、validated proposal/action 和本地执行结果不能共用一个模糊成功终态；性能指标属于展示观测。

**关闭标准：**建立有类型的混合响应边界及本地结果投影；0.3.24 完成各能力和 TTFT/tokens/TPS/duration 可用性/缺失语义。

**边界：**原始 delta 永不进入执行链；无来源指标显示未知，不能发明 token 统计。


### 8.5 新视觉/UI 重建事项（7 项）


| ID | 事项 | 分类/优先级 | 主办版本 |
|---|---|---|---|
| V-01 | 高权重文字过多、正文过小的层级候选 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |
| V-02 | 容器与卡片嵌套制造视觉噪声 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |
| V-03 | 常驻彩色阴影与强调色竞争 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |
| V-04 | 表面几何、字体与空间密度比例失衡 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |
| V-05 | 最终样式来源与写入时序需要收敛 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |
| V-06 | 组件一致不等于页面设计一致 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |
| V-07 | 缺少整页可复现的视觉基线与验收资产 | 本次新设计/重构决策 / 页面级重建 | 0.3.13 |


#### V-01 — 高权重文字过多、正文过小的层级候选

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`style.css typography roles`。

默认标题、字段标签、分类和 Home 标题多个角色用高字重；不能仅因都有 token 就认为整页主次成立。

**关闭标准：**基于真实页面制定标题/字段/正文/辅助角色关系，中英文与窄面板先验；正文不靠极小字号挤入。

**边界：**字重数值本身不是漏洞；字体替换不是默认解法。


#### V-02 — 容器与卡片嵌套制造视觉噪声

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`Registry/Settings/Palette/Vela composition`。

结构分组自动卡片化容易让边框、底色、标题层层争夺注意力；需页面级关系而非组件级统一。

**关闭标准：**布局 wrapper 默认不产生视觉外壳；通过对齐和接近关系分组，仅独立表面使用边框/底色。

**边界：**这是用户观感对应的新设计假设，需要完整截图确认，不声称每个页面都有同样问题。


#### V-03 — 常驻彩色阴影与强调色竞争

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`style.css elevation/action/optics defaults`。

默认暖金强调与蓝色 utility/光学阴影并存；视觉强调可能在强调控件存在而非任务重要性。

**关闭标准：**工作面降低常驻装饰强度，阴影用于前后关系；主要动作、选中、焦点与异常有清晰层级；Home保留身份。

**边界：**不把蓝色判成历史 bug；新数值通过新的视觉基线批准，非恢复早期配色。


#### V-04 — 表面几何、字体与空间密度比例失衡

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`radius/geometry/spacing/type；responsive layouts`。

较强外壳体积与紧凑内容尺度可能共同挤压可读区域；只加留白或只缩圆角不足以解决。

**关闭标准：**定义表面/控件/内容比例和尺度模型，低缩放不是不可读字号通行证；窄布局重排，不隐藏关键事实。

**边界：**不凭 root 数值断定实际全部控件错误；geometry 与 spacing 不混为同一 token。


#### V-05 — 最终样式来源与写入时序需要收敛

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`AppearanceResolver；DesignTuningResolver；style.css；main.js`。

Appearance 与校准项存在共享 CSS 输出名；多来源不等已证覆盖漏洞，但需要明确决议而非最后写入获胜。

**关闭标准：**每个语义属性有声明式来源/优先级/owner；预览只替换所属层；唯一投影阶段写最终 CSS；可解释 resolved provenance。

**边界：**不把 Appearance/Palette/Tuning 合成一个万能 owner；是决议链收敛而非粗暴合并。


#### V-06 — 组件一致不等于页面设计一致

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`CoreUI；Renderer；domain composition`。

相同按钮样式不能决定页面哪个动作更重要；现有工厂、别名和约万行主程序不能成为阻止重构的理由。

**关闭标准：**先样页后底层；可重写 CoreUI/Registry Renderer、拆 main、重组 DOM与 IA，保留业务与安全边界并删除替代实现。

**边界：**不为换技术而换框架；不以更多 abstraction/更多 token 作为交付。


#### V-07 — 缺少整页可复现的视觉基线与验收资产

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.24。
**原有证据：**用户明确观感＋前轮源码候选；非完整实机审美证明。[S-C]；[S-DESIGN]
**定位：**`visual fixtures；default/custom/calibration profiles`。

已读证据不足以证明完整 CSS 级联、用户配置、DPI和各状态形成稳定画面；局部 PASS 不等视觉成立。

**关闭标准：**建立真实 DOM/文案/状态的版本化视觉样页；固定尺寸/配置/字体环境/语言；人工视觉批准＋自动差异与行为门禁。

**边界：**不把无截图内容认定为已复現视觉 bug；不采用之前已废弃的两张生成效果图。


### 8.6 尚未完成的审计工作面（6 项）


| ID | 事项 | 分类/优先级 | 主办版本 |
|---|---|---|---|
| COV-01 | 主程序、全量 CSS、CoreUI 与全部页面交互 | 未完成审计工作面（不是缺陷） / 覆盖门禁 | 0.3.13 |
| COV-02 | Palette/Appearance/程序化引擎完整联动 | 未完成审计工作面（不是缺陷） / 覆盖门禁 | 0.3.13 |
| COV-03 | Vela 安全关键与辅助模块剩余路径 | 未完成审计工作面（不是缺陷） / 覆盖门禁 | 0.3.12 |
| COV-04 | 普通 Host、全部工具与 JSX 契约 | 未完成审计工作面（不是缺陷） / 覆盖门禁 | 0.3.12 |
| COV-05 | 测试、脚本、CI 与运行环境的覆盖可靠性 | 未完成审计工作面（不是缺陷） / 覆盖门禁 | 0.3.12 |
| COV-06 | 真实 AE、CEP、IME、DPI 与长时运行 | 未完成审计工作面（不是缺陷） / 覆盖门禁 | 0.3.12 |


#### COV-01 — 主程序、全量 CSS、CoreUI 与全部页面交互

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.26。
**原有证据：**继承三份覆盖清单。[S-A]；[S-AP][S-UX]
**定位：**`main.js；client/js/ui/**；client/css/**；Settings/Registry/Home/Vela DOM`。

此前 main、CSS 级联、全部控件/状态/cleanup 并未逐文件审完。

**关闭标准：**取得固定提交源码清单，文件/函数覆盖与生产入口关联；全部控件和层叠/焦点/取消/跨页矩阵。

**边界：**清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。


#### COV-02 — Palette/Appearance/程序化引擎完整联动

**分配：**主办 0.3.13；集成/回验 0.3.14；0.3.26。
**原有证据：**继承三份覆盖清单。[S-A]；[S-AP][S-UX]
**定位：**`palette/**；Workspace/Editor；ProceduralHomeIcons/Background/ThemeMap/cache`。

迁移/recovery、极深图、队列/teardown、Canvas/DPR与所有用户覆盖组合未穷尽。

**关闭标准：**完整模块输入/故障/恢复、图和尺寸上限、源/展示签名、缓存/队列及像素/性能验证。

**边界：**清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。


#### COV-03 — Vela 安全关键与辅助模块剩余路径

**分配：**主办 0.3.12；集成/回验 0.3.15–0.3.17；0.3.26。
**原有证据：**继承三份覆盖清单。[S-A]；[S-AP][S-UX]
**定位：**`Protocol/Parser/Compiler/PlanStore/Preflight/Grant/Coordinator/Provider/Observation/Owner`。

源码审计覆盖了关键链但非全部文件/分支；不能给全仓权限安全认证。

**关闭标准：**安全关键优先完整复核；变更版本补调用链与对抗测试；剩余项 owner 和退出日期明确。

**边界：**清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。


#### COV-04 — 普通 Host、全部工具与 JSX 契约

**分配：**主办 0.3.12；集成/回验 0.3.18–0.3.22；0.3.26。
**原有证据：**继承三份覆盖清单。[S-A]；[S-AP][S-UX]
**定位：**`host/vela/**；host/tools/**；tool schema/lab；Shape Add/Ad Component Kit`。

公共 Host 及部分工具已有发现，但所有工具定义、Host Context/JSON 与 Shape Add 未全面审毕。

**关闭标准：**逐工具数据归属、输入/输出、Undo、部分完成与观察证据；覆盖不受是否已接入 Vela 限制。

**边界：**清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。


#### COV-05 — 测试、脚本、CI 与运行环境的覆盖可靠性

**分配：**主办 0.3.12；集成/回验 每版本；0.3.25–0.3.26。
**原有证据：**继承三份覆盖清单。[S-A]；[S-AP][S-UX]
**定位：**`scripts/**；tests/fixtures；CI；Windows helper；加载/发布配置`。

182 suites 未被逐条审计；手写摘录/替身可能不能约束实际生产；Windows/PowerShell helper 未实测。

**关闭标准：**分离纯契约/生产模块/浏览器/CEP/AE证据；测试清单与路径映射；遗漏、skip、隔离/反序和关键场景检测。

**边界：**清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。


#### COV-06 — 真实 AE、CEP、IME、DPI 与长时运行

**分配：**主办 0.3.12；集成/回验 每版本；0.3.25–0.3.26。
**原有证据：**继承三份覆盖清单。[S-A]；[S-AP][S-UX]
**定位：**`用户真实支持环境；渲染/焦点/资源/Host/protocol 实例`。

多处条件性缺陷与视觉假设只有局部模型；没有全产品截图、性能、输入法、屏幕阅读器和原生故障矩阵。

**关闭标准：**逐项补对应真实旅程，记录模型/宿主/配置/值与 Undo；不能复现的保留精确限定，而非清空 UNKNOWN。

**边界：**清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。


### 8.7 排除项与防止误修

**X01 — Palette 摘要的 tool overrides 计数正确。** `toolPaletteMap` 对应的中英文文案本就是“工具覆盖”，不是 `builtInOverrides`。保留原排除证据，不改成内置色卡覆盖数量。[S-AP]

以下也不能未经证据自动变成缺陷：已经接受的 request→Review 前 retargeting、0.3.10 未注入历史的明确 scope、0.3.11 的 in-memory 与单 active objective、ThemeMap 与 source 分离、readiness 不等 qualification、暂未验证的每一种对比度/字体/DPI问题。它们按新版本演进，不篡改原 scope。

单个模块使用 native select、不调用 CoreUI 工厂、出现 CSS 常量或存在不同业务密度，都不自动判 FAIL；真正约束是可解释的所有权、统一交互、完整视觉和产品需求。

<a id="section-9"></a>
## 9. 未完成全量审计的接续安排

三轮审计没有实现“全部源码逐文件审毕”。本规划不把这项请求遗忘，而是将它作为覆盖项目贯穿后续版本，并在稳定化前完成核对。[S-A]；[S-AP][S-UX]

### 9.1 先建立实际源码 inventory

0.3.12-A0 取得固定提交的完整源码清单，按生产/测试/构建/工具/第三方来源分类，记录加载入口与运行环境。不能从连接器已取到的若干文件反推整个仓库总量或覆盖百分比。

每项至少记录：`path / commit-or-blob / source-kind / production-entry / owner / reviewed-ranges / method / findings / tests / environment / remaining-gap`。生成文件与第三方代码可以采用来源/版本/接口及使用边界审计，不需要为了宣称全量而伪装逐行人工读过。

### 9.2 按风险先后，而不是把剩余项全部压到最后

| 工作面 | 开始与主要完成点 |
|---|---|
| Protocol/Parser/Plan/Preflight/Grant/Authority/Host 数据边界 | 0.3.12 优先；0.3.15/17 变更后重新覆盖。 |
| main/CoreUI/CSS/所有页面 composition | 0.3.13 审计与改造；0.3.14 产品迁移完成。 |
| Palette/Appearance/引擎/队列/迁移 | 0.3.12 先资产风险；0.3.13–14 全链路。 |
| 全部普通工具与 JSX/schema | 0.3.12 先已见风险；按 0.3.18–22 动作域完成，包含未接入 Agent 的工具。 |
| 全部测试/夹具/脚本/CI/Windows helper | 0.3.12 建清单；随消费者版本完成；0.3.25–26 汇总验收。 |
| 真实 CEP/AE/IME/DPI/长时运行 | 从每个 focused repair 开始；不能全部延后到最终验收。 |

0.3.26 的职责是补剩余缺口、验证变更后状态和最终核对，不是第一次进行安全审计。文件变更会使受影响旧结论需要复核，不能永久沿用 b93d0d8 的“已读”标签。

### 9.3 整体验证矩阵

**源码与证据层次：**纯契约测试 → 实际生产模块测试 → 真实浏览器组件/完整页面 → CEP/Host 接线 → 原生 AE 操作与值/Undo → 完整用户任务。每层记录替身范围；不能以摘录测试代替实际生产模块。

**视觉环境采样建议：**以 280/360/520/760 CSS px 宽度、420/640/900 高度作为代表组合起点，覆盖实际声明支持的最小尺寸；UI Scale 0.62/0.92/1.18 与角色乘数边界；DPR/OS 缩放按实际两台开发环境测量；中英文、长文本、空状态、禁用、错误、pending Review、部分完成。它们是新验收采样建议，**不是现有产品已经支持或已经测过这些组合的声明**。

不要求所有笛卡尔积一开始穷尽；先覆盖风险组合、响应式断点两侧、最坏长内容和所有状态类别，再补 pairwise/高频旅程。每个样例声明字体环境、配置来源和 CSS/构建 commit；默认值、用户自定义、开发校准分别测试，不通过清空用户配置制造 PASS。

**关键旅程：**

1. 首次打开→先起草→配置→实验确认→连接/启用→发送，草稿不丢，资格语义明确。
2. Proposal→完整 Review→批准/拒绝→Host→fresh Verify，显示内容与实际目标一致。
3. 多步中第一步成功、第二步拒绝/失败，结果准确说明已发生变化；取消不暗示回滚。
4. C1 在生成/Review/Verify，切 C2 后停用/改配置/撤回确认；正确 owner 收束，holder 不提前释放。
5. Palette dirty→打开菜单→Escape→外层主动离开，逐层消费且保存/丢弃/继续编辑一致。
6. 修改外观→preview→cancel/commit→存储失败→重试/还原→重开，显示与保存事实匹配。
7. 长对话阅读中 streaming/折叠/切语言，锚点稳定；动态按钮不丢焦点；IME 不误发。
8. 长期切页、生成背景、跨 DPI、缩放、dispose/reload，活动监听/队列/缓存有界且权限不恢复。

<a id="section-10"></a>
## 10. 八项新的 0.3.x hard exit gates

**出处说明：原始项目摘要说曾有“8 个明确 hard exit gates”，但没有逐条内容；远程路线也明确未保存枚举。本节是 R1 新制定的替代清单，汇合原有明确产品要求和本轮新增交付，不是声称恢复了历史原文。** Agent architecture 的 13 条 invariants 仍独立生效。[S-P]；[S-R][S-ARCH]

| Gate | 必须成立 | 核心证据 |
|---|---|---|
| **GATE-01 安全、Authority 与事实可信** | 不可信输入不能变代码/权限；JIT/CAS/replay/Host 边界成立；Session/trajectory/最终 Verify 不夸大提交或目标关联。 | 生产级对抗用例、目标漂移/no-op/不确定提交测试、原生 AE 证据、相关审计项关闭。 |
| **GATE-02 完整可委托 Agent** | 授权内有界连续 Observe/Reason/Act/Verify/Replan；越界/风险/歧义正确 Review/拒绝；取消/停用/收束可控。 | 通用多能力任务、权限/预算/过期、no-progress、部分完成、恢复/取消旅程。 |
| **GATE-03 AE 能力完整性** | 每个正式目标 AE Action 覆盖，或有审核过的 AE_PLATFORM_UNREACHABLE 证据；无未研究动作被伪装为关闭。 | 完整矩阵、动作级 Host/Verify/UI/AE 验收、平台限制证据及缺口零遗漏核对。 |
| **GATE-04 Context / Conversation / History 基础完整** | 有用的跨轮消费、合格容量/超限策略、多会话隔离、typed bounded queryable User History；历史不获得权限。 | 实际输入证据、预算/省略、跨会话与生命周期用例、历史查询/事实推断区分。 |
| **GATE-05 UI 产品形成与视觉稳定** | 全产品视觉主次清楚且可复现；Review 完整可读；任务结果准确；草稿/用户离开/键盘/响应式可用；没有新旧局部体系长期并存。 | 人工批准整页基线、完整 CSS 与配置矩阵、行为/可访问/IME/窄面板和全部能力 UI 旅程。 |
| **GATE-06 Provider/模型资格与本地兼容** | 正式支持配置有资格证据；readiness 与 qualification 分离；本地模型可完成声明任务，不虚报容量和遥测。 | 支持集与配置级资格报告、结构化/流式/错误处理/预算/质量与延迟记录。 |
| **GATE-07 全产品整合验收与审计覆盖** | 按完整实际源码清单完成适当方法的审计；关键生产、浏览器、CEP/AE与用户任务通过；不存在用摘录替代整包证明。 | 版本化覆盖台账、真实全量回归、场景记录、修复与证据 ID 映射，明确 skipped/未测处置。 |
| **GATE-08 稳定化、资产迁移与可发布状态** | 资源/性能、错误恢复、配置/工程数据迁移和回退成立；当前文档一致；包/里程碑与发布流程明确。 | 长时测量、失败/回退/重开、安装/构建、docs 一致性、正式 release-prep 检查。 |

任何 P1 安全、数据损失、事实误报、不可控任务或知情批准阻断都不能以“已知问题”静默带入退出。非阻断风险可以显式接受，但不能削减上述硬要求。资格、能力完整性或关键安全路径仍为 UNKNOWN 时，不能用总测试数量替代证据。

**0.3.26 不是退出条件，八个 Gate 才是。** Gate 未过就继续 0.3.x。

<a id="section-11"></a>
## 11. 实施、证据与发布工作流

### 11.1 每个 focused task 的输入

开工读取当前 roadmap、PROJECT_STATE、相关架构/视觉契约、目标 issue 和原证据。核验实际 dev/branch 与基准差异；若目标文件已经变更，先复验，不把本报告的行号机械应用到新代码。

任务卡最少包含：目标与非目标、问题 ID、原始证据层次、拟改 owner/契约、迁移与删除范围、生产负向用例、正向对照、AE/CEP验收、已知未知和退出判断。不要把本指导书整份复制成一个“全部实施”的巨型任务。

### 11.2 推荐开发节奏

`最新 dev → focused branch → 针对性 audit/方案 → Codex/DSH 实施 → 生产模块回归 → AE/CEP 验收 → 用户 commit/push → GitHub PR → merge dev`。

大型 ownership/Registry/Context/Agent/main.js/style.css/lifecycle 变更先只读审计；DSH 不被一律限制成只能读。实现自动化 green 不代替 native AE；未完成需要的实机验收前，不让工具自动提交、推送或合并。纯文档规划 PR 无需假造 AE 测试，应明确 production diff=0 并完成文档检查。

Git routine 仍由用户通过 Codex UI / GitHub 网页优先完成；PR 目标为 dev。阶段到 READY FOR PR 时，交付可复制 title、description、合并后同步 dev 和清理本地 focused branch 的命令。项目内命令在 VS Code 终端，PowerShell 优先单行。不在本规划交付中自动执行 Git 写操作。[S-C]

### 11.3 证据闭合的最低记录

每个修复保留：原缺陷条件/样例；实际源码提交；测试命令/环境/真实结果；替身范围；AE 前后值/Undo或对应副作用证明；相关 Session/trajectory/界面状态；剩余 UNKNOWN；与原 ID 关联的关闭结论。没有归档的截图或 payload 不编造文件名和链接。

如果重构使旧函数消失，也必须在新的生产入口中保留同一反例与正向对照；删除代码不自动关闭风险。历史报告原文不改，新的 closure 引用旧证据及实际修复。

### 11.4 文档治理

`AGENTS.md` 与 README 只保留简短 current/next 摘要和链接；不重复大段历史测数。PROJECT_STATE 只描述实现事实；roadmap 只描述未来排程；issue ledger 维护开放/关闭与证据；历史报告归档。

改变视觉/默认设置/内部 API 时更新当前 contract 和 migration note，明确 supersedes 范围，避免让新旧段落都自称 current。每次 sealed 只记录真实跑过的检查，复用历史证据则标明 reused 和适用范围。

### 11.5 包版本与功能版本继续分开

现有 0.3.6 package metadata 不因本规划命名 0.3.12–26 而立即改变。未来是否合并里程碑与产品包编号，应由独立 release/versioning 决策和迁移说明裁定。正式发布仍在功能整体成型、release-prep 与用户确认后执行 `dev → main → tag`；不得把“新路线生成”当作创建 release 的授权。[S-S]

<a id="section-12"></a>
## 12. 第一项落地任务

### `0.3.12-A0 — Baseline Reconciliation & Production Revalidation Plan`

**第一步不是改样式，也不是直接重写全部 UI。** 先把路线和风险证据变成仓库可执行的基线，然后优先处理安全/事实/资产风险；UI 样页准备可以并行开展。

交付如下：

1. 将本指导书、新 `docs/VELA_ROADMAP.md`、原报告证据索引和总账入仓；更新入口 current/next，历史封存与包版本保持事实不变。
2. 为 0.3.12 工作包建立 focused task 列表；原三份报告所有 A/AP/UX ID 保留，G/V/COV 是整合扩展命名。
3. 获取固定提交完整源码清单，标出实际生产入口、待复核范围与安全关键优先级；不得宣称全仓已审完。
4. 将高风险原探针转成生产模块测试计划并验证反例确实作用于当前代码；先处理 A01、A02、A06、AP-01、UX-01/02/03 等关键路径，相关 P2 按工作包紧随。
5. 建立 UI 0.3.13 样页/视觉状态矩阵和重构 ADR 清单，不在 A0 批量改 UI 数值或 CSS。

A0 以文档/计划为主；生产重验或修复单独切片、清楚记录。如果原函数在目标 dev 上已变化，先更新反例和定位，再决定修复；不能为了符合本报告去制造同名缺陷。

<a id="section-13"></a>
## 13. 0.4.x 的边界

只有本轮八个新退出门通过，才进入 0.4。0.4 聚焦已经完整可用 Agent 的深度，不承担 0.3 基础缺口：[S-P]；[S-R]

| 0.4 方向 | 与 0.3 的区别 |
|---|---|
| Observation Window / 时间历史理解 | 建立在 typed/queryable 事实基础上理解轨迹，而不是第一次有历史数据。 |
| 规划质量与全局轨迹约束 | 提高复杂目标与切片控制质量；不要求因此引入 DLLM。 |
| 更深恢复、性能与细节 UX | 优化已经正确可控的产品，不留关键保存/取消/目标验证问题到此处理。 |
| 长期 Memory / 跨生命周期知识 | 单独的保留、隐私、来源、失效与非权威语义；旧批准不可复活。 |
| 专精本地模型/蒸馏的研究准备 | 依赖可信观察和执行结果；不把训练模型作为修补未完成产品的前置条件，也不默认收集用户工程用于训练。 |

后三项中的具体实现、模型选择和训练硬件预算不由本次审计替代研究；它们是后续方向，不额外扩张当前修复任务。需要排具体 0.4 版本时，以 0.3 退出时的实证和用户需求重新规划。

<a id="section-14"></a>
## 14. 来源与证据索引

本文事实来源与新决策分开：S-A/S-AP/S-UX 是原审计报告；S-R/S-S/S-ARCH/S-DESIGN 是固定提交仓库事实/规范；S-P 只是项目路线**摘要**；S-C 是本次对话的审计补充、用户视觉评价与重构授权。

- **S-A**：跨模块源码审计 `AUDIT.md` 与 coverage，原日期 2026-09-08；本包按字节归档为 `source-audit.md`、`source-coverage.md`、`source-evidence.zip`。
- **S-AP**：外观专项审计 `APPEARANCE_AUDIT.md` 与 coverage/证据；保留 X01“工具覆盖计数正确”的排除结论，不把它误修成内置色卡覆盖数。
- **S-UX**：UI/UX 专项审计 `UIUX_AUDIT.md` 与证据；其“不改风格”是历史当轮范围，已由本次后续需求扩展。
- **S-P**：`整理Vela开发路线.txt`，仅包含 0.3/0.4 目标及八个 gate 的存在说明；内部旧下载链接不是本次已取得完整原文的证明。
- **S-C**：本次对话首轮远程审计（文档漂移、Unicode、泛化/历史/预算/资格/矩阵/资源），随后 UI 视觉层级讨论，以及用户“可以大胆重构，项目处于早期”的最新授权。G-02 的原独立探针未在三份包中，V 系列是设计候选/新决策，不升级为原生 AE 已确诊问题。

归档 SHA-256 与文件列表见 `../reports/audit-baseline-0.3.11/manifest.json`。原文报告不被本文覆盖；新方案的版本安排以本 R1 路线为准。

[S-A]: ../reports/audit-baseline-0.3.11/source-audit.md
[S-AP]: ../reports/audit-baseline-0.3.11/appearance-audit.md
[S-UX]: ../reports/audit-baseline-0.3.11/uiux-audit.md
[S-P]: ../reports/audit-baseline-0.3.11/roadmap-foundation-summary.txt
[S-C]: ../reports/audit-baseline-0.3.11/conversation-decisions.md
[S-R]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/VELA_ROADMAP.md
[S-S]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/PROJECT_STATE.md
[S-ARCH]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/design/vela-agent-architecture.md
[S-DESIGN]: https://github.com/Lomond-PM/Lomond-Cabinet/blob/b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a/docs/DESIGN_SYSTEM.md

---

**总裁定：可以大胆更换早期实现，但先修事实与数据，再建立整页设计基线，用新平台承载完整能力。0.3 的出口是一个安全、可委托、界面清晰且真正覆盖目标 AE 工作的产品，而不是一个恰好走到某个版本号的工程。**
