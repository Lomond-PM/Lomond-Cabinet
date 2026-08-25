# Lomond Cabinet — Vela Agent Architecture Baseline

```text
Status: FROZEN FOR 0.3.x
Architecture version: 2.2
Applies from: 0.3.3
Implementation starts: 0.3.3
Last reviewed against codebase: 0.3.2
```

> **本文档是 0.3.3–0.3.9 实现的架构规范，不是参考路线。** 除非实际实现证明某条 invariant 不成立，否则后续版本应**修改实现去适应本架构**，而不是随实现不断重新定义架构。0.3.2 期间归档为正式架构文档（本文件）；代码跨入新 Agent Runtime 从 0.3.3 开始。

## 归档规则（变更流程）

任何 Vela Agent 改动先问：

```text
是否符合 NON-NEGOTIABLE BOUNDARIES？
↓
是否符合 13 条 invariants？
↓
属于哪个版本阶段？
↓
是否跨越当前阶段允许的 dependency？
```

如果不符合：

```text
不是直接改代码
↓
先提出 Architecture Amendment
↓
说明：
- 哪条 invariant 不成立
- 为什么
- 代码证据
- 替代方案
- migration cost
↓
再决定是否修改 baseline
```

---

## 0. NON-NEGOTIABLE BOUNDARIES（红线区，开工前必读）

```text
1. Model output is never execution authority.
2. TaskPlan is never executable.
3. AuthorizedPlan is never a durable AE target binding.
4. Final mutation targets are resolved JIT.
5. Authority never executes AE operations.
6. Execution Spine never decides user intent.
7. Derived knowledge never becomes authority evidence implicitly.
8. Surface never owns Agent lifecycle or execution authority.
9. Read/analyze and mutation share invocation contracts,
   but mutation alone receives Mutation Safety Spine.
10. Any new capability is denied unless explicitly registered,
    validated and host-routed.
```

这 10 条优先于本文档其余任何内容。只要不违反这十条，无论 0.3.7 的 Agent Loop 还是 0.5 的 memory/subagent，主体架构不会失控。

## 1. 核心判断

> **Vela 当前的 execution/validation 底层已明显为 Agent 化预留了结构（多步 PlanStore、能力注册表工厂、分层指纹 Context Bridge、权限 schema），但 Agent Runtime 本身尚未真正成立。**

四件事：① 保留并拆分 Execution Spine（唯一冻结面）；② 重构上层编排（0.3.1 单动作交互模型允许变化）；③ 新增 Runtime / Session / Scope；④ 把 Confirmation 从固定流程节点变成 Authority Policy 的结果。

**DSH 的角色（已降级）**：参考实现与审计对照组，不再是架构蓝本。决策顺序反转——先问"Vela Baseline 要解决什么问题"，再问"DSH 有没有成熟机制可以参考"。

## 2. 长期架构总览（三层）

```text
                ┌─────────────────────────┐
                │      Agent Runtime      │
                │                         │
 User / Task ──→│ Session                 │
                │ Agent                   │
                │ AgentDriver             │
                │ Observation / Context   │
                │ Model Adapter           │
                │ Capability Registry     │
                └────────────┬────────────┘
                             │
          AgentDriver → CapabilityIntent
                             │
                     ActionCandidate[]
                             │
                ┌────────────▼────────────┐
                │      Authority Plane    │
                │                         │
                │ DelegationGrant         │
                │ Risk / Scope / Budget   │
                │ Policy Engine           │
                │   → ALLOW               │
                │   → REVIEW_REQUIRED     │
                │   → DENY                │
                └────────────┬────────────┘
                             │
                    AuthorizedPlan
                             │
                ┌────────────▼────────────┐
                │     Execution Spine     │  ← 唯一冻结面
                │                         │
                │ step N due → JIT bind   │
                │ Fresh capture / CAS     │
                │ Preflight / Guard       │
                │ Adapter / Host Contract │
                └────────────┬────────────┘
                             ▼
                       After Effects
                             ▼
                    Verified Result
                             │
                    Session Event ──→ Observation ──→ AgentDriver
```

## 3. 长期核心数据流与跨层对象（冻结）

```text
Task Objective
      ↓
AgentDriver
      ↓
TaskPlan ──────────────┐（推理/编排表示，永不直接执行）
      ↓                │
AgentDriver 选择当前可执行意图
      ↓                │
CapabilityIntent ──────┘
      ↓
Capability Compiler（只编译，不当 planner）
      ↓
ActionCandidate[]
      ↓
Authority Plane（ALLOW / REVIEW_REQUIRED / DENY）
      ↓
AuthorizedPlan
      ↓
PlanStore
      ↓
step N due → JIT Observation / Binding → Mutation Safety Spine → AE Host
      ↓
Verified Result → Session Event → Observation → AgentDriver
```

**跨层对象定义**：
- **TaskPlan** = Agent 的推理/编排表示（观察、等待、判断、询问、操作、验证等节点的组合），可变、可重规划、可放弃；**永不可执行**。
- **CapabilityIntent** = Runtime 决定"现在想调用某种能力"的非权威意图（含能力 id 与意图参数，未经校验）。
- **ActionCandidate** = CapabilityIntent 经 capability contract 编译后的严格 typed proposal。
- **AuthorizedPlan** = 经 Authority 决策后的执行意图（见 §3.1）。
- **Verified Result** = Host 执行后经 schema 校验的结果（含 before/after digest 验证），作为 Session FactEvent 落日志。

### 3.1 AuthorizedPlan 的内容与边界（Invariant A/B）

```text
typed capability
params
target scope descriptor   ← 语义描述（selectedLayers / currentComp / specificLayerIds / ...）
authority evidence
risk snapshot
grant provenance
revision
```

**不保存**可长期信任的最终 AE target binding。**最终 binding 永远是 JIT 的**——只有某一步真正要执行时才做目标解析 + 新鲜捕获 + CAS（审批时绑定 Layer 3、十秒后直接操作 Layer 3，是必须禁止的 TOCTOU 漏洞形态）。

## 4. Execution Spine：两层冻结

### 4.1 通用 Capability Invocation Spine（所有能力共用）

```text
Typed Capability
→ validated invocation（闭式 paramsSchema + modelMaySupply + localPolicy validators）
→ explicit adapter（capabilityId → 注册动作/宿主实现）
→ explicit Host contract（host allowlist + model forbidden fields）
→ validated result（结果过 schema 校验 + 有界输出）
```

### 4.2 Mutation Safety Spine（仅 mutation 叠加）

```text
JIT target binding
Fresh capture（目标依赖层的 digest/fingerprint）
CAS（expected value digest 校验）
Replay guard（nonce / replay key）
Preflight
Undo boundary
Before/after verification
```

read/analyze 能力（readSelection / inspectLayer / readComposition / analyzeKeyframes）**不需要** nonce / CAS / undo——0.3.4 扩量观察能力时不被 mutation machinery 拖累。

### 4.3 现有代码资产归属

| 现有模块 | 归属 | 处置 |
|---|---|---|
| `velaPlan.js` | Execution Spine | 保留为 authorized execution plan store |
| `velaExecutionPreflight/Guard/Adapter` | Mutation Safety Spine | 保留，按能力泛化（动作数组、多步） |
| `host/vela/velaContext.jsx`（Tier-3 + digest CAS） | Mutation Safety Spine + Observation | 保留；Tier-1/2 捕获扩展为 Observation providers |
| `host/vela/velaExecution.jsx` | Mutation Safety Spine | 泛化为能力分发表（capabilityId → 注册动作） |
| `velaCapabilityContracts.js`（createRegistry） | Agent Runtime + Authority | 保留工厂；扩为全能力；补 risk/scope 元数据 |
| `velaValidator.js` tool/action 注册表 | Authority + Spine | 保留；注入真实注册表工具 |
| `velaController.js`（单 activeRecord） | 上层编排 | 重构为 Agent/Task/Plan 生命周期 |
| `velaProviderIntentGate.js`（词法拒绝） | 0.3.1 交互模型 | 退役（由 typed content 校验替代，须在 Authority 到位后） |
| `velaProviderProposalRouter.js` / `velaRuntime.js` 单步接线 | 上层编排 | 重构：Runtime 层 + Authority 决策 |
| `velaContextBridge.js` 捕获/fingerprint/compareCaptures | 跨层基础 | 保留；绑定用途与观察用途分离（Invariant 4） |
| 现有 Vela Surface | Agent consumer | 保留 UI，改为订阅 Session 投影 |

## 5. Agent Runtime（0.3.3 核心交付）

```text
Agent
├─ Session        —— typed interaction truth（事件日志是实现方式，不是最高层）
├─ Scope          —— 当前活跃作用域（capabilities / context / abort lifetime）
└─ lifecycle      —— 创建 / 会话 / 销毁；与 TaskRun 解耦

AgentDriver
= 具体推理循环（Observe → Reason → Act → Observe → Verify → Replan）

Session
= append-only typed event log + 确定性投影

AgentScope
= listeners / context / capabilities / abort 生命周期 的归属容器

TaskRun
├─ TaskState      —— active / paused / waiting-approval / blocked / completed / cancelled
└─ executionArmed —— 进程级、不持久化；reload 后复位为 false
```

> 注：TaskRun 在 v2.2 中正式定义，但**定义存在 ≠ 0.3.3 必须实现**。TaskRun 的第一个消费者出现在 Planning / Authority / Autonomous Loop 之后（0.3.5+），0.3.3 不得提前实现。

### 5.1 Agent 状态三分层（冻结）

```text
AgentActivity       —— idle / running（Agent 引擎是否在消费轮次）
TaskState           —— active / paused / waiting-approval / blocked / completed / cancelled（任务语义阶段）
PresentationStatus  —— ready / working / waiting / warning / error / ...（Surface UI semantic）
```

典型组合：`AgentActivity=idle`、`TaskState=waiting-approval`、`PresentationStatus=waiting`。三者互不纠缠，与 0.3.2 的 **semantic status ≠ runtime state** 原则一致。

### 5.2 executionArmed 归属 TaskRun（冻结）

**不用 `Agent.armed`**——Agent 无 mutation 授权仍可聊天/观察/分析/读取/提出计划。reload 语义：Agent session 重新开始 → read/analyze 可用 → 旧 TaskRun `executionArmed=false` → **不能继续旧的自主 mutate**。

## 6. Session 与事件

### 6.1 术语三分（冻结）

```text
Canonical Session Record = Session log 中所有正式事件（技术上的权威记录）
Evidentiary Fact         = 可作为世界状态 / authority 依据的事件
Derived Record           = 正式记录，但不具备 evidentiary authority
```

示例：`summary/created` 是 **canonical session record**，但不是 **evidentiary fact / authority evidence**。replay、persistence、audit 均按此区分。

### 6.2 事件认知三分 + AuthorityEvidenceSource 白名单（冻结）

```text
SessionEvent
├─ FactEvent        —— 世界状态事实
│   ├─ user/message
│   ├─ agent/action-performed   （Agent 执行，before/after digest 可验证）
│   ├─ tool/result
│   └─ ae/state-observed        （观察事实：状态从 X 变 Y；不代表"用户执行了某操作"）
│
├─ ControlEvent     —— 会话/任务控制状态
│   ├─ task/started / paused / cancelled
│   ├─ permission/requested / decided / cancelled
│   ├─ delegation/granted / revoked
│   ├─ task/execution-armed
│   └─ todo/write
│
└─ DerivedEvent     —— 推断/派生（summary/created、title/generated、inferred-operation）
```

**禁止"Fact + Control = 权威、Derived = 非权威"的粗分类**。只有**显式列入 AuthorityEvidenceSource 的事件字段**才能参与授权判断：

```text
AuthorityEvidenceSource
├─ permission/decided
├─ delegation/granted
├─ delegation/revoked
├─ task/execution-armed
└─ verified target facts（Tier-3 捕获 + 值 digest 等 FactEvent 字段）
```

`todo/write`、`task/paused` 等 ControlEvent **不自动获得安全意义**。以后新增 ControlEvent 时，不会因"属于 Control"就意外成为授权依据。

### 6.3 批准事件生命周期（冻结）

```text
permission/requested  { requestId, candidateId, ... }   ← 发起，等待
permission/decided    { requestId, decision }            ← 终态：用户决策
permission/cancelled  { requestId, reason }              ← 终态：Agent/task 取消
（可选）permission/expired { requestId }                 ← 终态：超时
```

投影：`requested − (decided ∪ cancelled ∪ expired) = pending approvals`。**不做"requested+decided 原子成对提交"**（交互时序上不可能）。in-memory 阶段无"悬挂 ask"问题（Session 整体销毁）；引入 SessionPersistence 后为 reload 定义 recovery（无终态 request 恢复为 cancelled）。

### 6.4 in-memory first + Persistence seam

| 方案 | 语义 | 0.3.x 选择 |
|---|---|---|
| A. Session-only | 面板生命周期结束 → Session 消失 | ✅ in-memory append-only log + 确定性投影 |
| B. Crash-recoverable | reload → replay 前一会话 | 未来需求经 `SessionPersistence` seam 引入 |

`SessionPersistence` seam 从 0.3.3 定义接口，0.3.x 用 in-memory 实现（唯一 provider 为 `InMemorySessionPersistence`，甚至可为 optional/null provider）；不预先引入 fsync/crash journal。事件深冻结、数据快照、seq 连续；投影为纯折叠。

## 7. 计划分层（冻结）

| | TaskPlan | CapabilityIntent | ActionCandidate | AuthorizedPlan |
|---|---|---|---|---|
| 层次 | 思考/编排 | Runtime 意图 | 编译后提案 | 授权后执行意图 |
| 内容 | 节点组合 | 能力 id + 意图参数 | typed + contract 校验 | + authority evidence + grant provenance |
| 可变性 | 可变/重规划/放弃 | 可放弃 | 可重排（未授权） | revision 化，supersede 而非修改 |
| 权威 | AgentDriver | AgentDriver | Capability Compiler | Authority + PlanStore |

**CapabilityCompiler 边界（冻结）**：输入是 **CapabilityIntent，不是整个 TaskPlan**。TaskPlan 含观察/等待/判断/询问等非可编译节点；由 AgentDriver 先选择当前可执行的 actionable intent，再交给 Compiler。**Compiler 只负责"从非权威 capability intent 编译出严格 typed candidate"，不负责决定"现在该做哪一步"**——它永远不会变成另一个 planner。TaskPlan → ActionCandidate[] 的转换只经 capability contract（`paramsSchema` + `modelMaySupply` + `localPolicy` validators），模型永远无法把非类型化内容带进执行面；replan 只替换 TaskPlan，不触碰已授权 AuthorizedPlan。

## 8. 权限模型（冻结）

### 8.1 DelegationGrant

```text
capability          （具体能力或能力族）
target scope        （currentComp / selectedLayers / specificLayerIds / ...）
risk ceiling        （read / analyze / mutate / create）
time/task lifetime  （taskId / expiresAt）
operation budget    （maxActions / 步数或时间预算）
```

- 语义 = allowed-once（单次）或 plan/task 级临时 grant（confirm-plan = PlanIntent 获得临时 DelegationGrant）；
- **full-access = 范围更宽的 DelegationGrant，不是绕过**——Preflight/CAS/Guard/Host 全部执行。

### 8.2 PolicyDecision

```text
ALLOW             → 直接进入 Execution Spine
REVIEW_REQUIRED   → 用户审阅（确认 UI = 策略结果的呈现，不是 authority system）
DENY              → 拒绝，带稳定码 + provenance（哪个 grant/规则拒绝）
```

确认模式是派生结果：confirm-every-action = 写操作几乎总返回 REVIEW_REQUIRED；confirm-plan = PlanIntent 临时 grant。协议现有 `PERMISSION_MODES` / `permissionSnapshot.grants[]` 保留为传输形状（grants = 当前有效 DelegationGrant，mode = 派生展示值）。

### 8.3 Preset 简单，Authority Contract 精确

UI 只显示"只观察 / 允许修改选中内容 / 允许修改当前项目"（preset = 一组精确 grant 的捆绑）；底层 grant 表达 `currentComp / selectedLayers / specificLayerIds / specificCapability / create-only / mutate-only / maxActions / taskId / expiresAt`。**UI 档位不得成为底层权限 schema**。

### 8.4 语义纠正

`never` = 确定性拒绝（不是"无需询问"）；无批准预设 = 宽 grant + never（越界即拒）。

## 9. 观察（冻结）

### 9.1 Invariant — Observation generation ≠ Authority freshness

**不要**"项目任何地方改变 → global generation++ → 所有 pending candidate stale"。分层 revision，动作只绑定它依赖的层：

```text
Project revision / Comp revision / Selection revision / Target capture digest / Property value digest
```

Authority freshness 只取动作目标依赖的具体 digest（Tier-3）；Observation generation 是 Agent 的宽视图，不具权威性。

### 9.2 Invariant — 事实 ≠ 推断（见 §6.2）

`ae/state-observed`（opacity 100→50）是事实；"用户手动把 opacity 改成 50"是推断（DerivedEvent）。Authority 只消费 AuthorityEvidenceSource 白名单内字段。

### 9.3 示范数据三级可信度

```text
VerifiedOperation   —— Agent 调用能力（action-performed + 验证）/ AE 可靠 callback 的用户动作
ObservedTransition  —— before/after state diff（弱标签）
InferredOperation   —— 根据 transition 推断（仅辅助）
```

**只有 VerifiedOperation 能成为强示范数据**；ObservedTransition 需经归因或用户确认才升级：

```text
ObservedTransition → operation inference → user confirmation / stronger evidence → DemonstrationEpisode
```

## 10. 策略接口（不固化 DSH 数值）

DSH 数值（repeat 3/5/8、retry 2/500ms/10s、compaction 0.8/0.16、prune 8192/4096/1024、64KB）是**参考值**。定义接口，默认值由 AE 实测：

```text
BudgetPolicy / RetryPolicy（仅幂等读，变更永不自动重试）/ CompactionPolicy（must-be-smaller + 确定性回退）/ LoopHealthPolicy（no-progress、阻塞门槛）
```

不变式：截断 = "因预算省略 N 项"（不混淆上游不完整）；总结必须比被遮蔽内容更小。

## 11. LegacyAuthorityPolicy（0.3.5 兼容迁移 seam）

0.3.5 先实现极薄兼容策略，输入**至少**包含 `capabilityId / risk / targetScope / requestedOperation / current grants`：

```text
LegacyAuthorityPolicy

safe-local-read within declared capability scope
    → ALLOW
mutation
    → REVIEW_REQUIRED
anything outside explicit policy
    → DENY
```

**禁止只看 `risk === "read"` 就 ALLOW**（未来 readFile/readExternalAsset/readCredential 不能自动放行）。新 Planning Controller 从第一天只知道 PolicyDecision，不知道 confirm button；0.3.6 用 `DelegationPolicyEngine` 替换本策略时 Controller 无需重构。

## 12. 版本路线图（冻结依赖顺序，数字可合并）

| 版本 | 主目标 | 关键架构产物 |
|---|---|---|
| **0.3.2** | UI / Design System | Surface 与 presentation contract；零 Runtime scope creep；归档本基线 |
| **0.3.3** | Runtime | Agent / Session / Scope / AgentDriver / typed Session events / Persistence seam（in-memory）/ Surface → Agent consumer |
| **0.3.4** | Observation + Capability | structured Context / Observation providers / Capability Registry / read+analyze 能力 / generic capability→registered-action 映射 / 统一 invocation+result 信封 |
| **0.3.5** | Planning + Authority Contracts | TaskPlan / CapabilityIntent / ExecutionPlan / CapabilityCompiler / PolicyDecision+DelegationGrant+AuthorityEvidence 类型 / LegacyAuthorityPolicy / 多步 PlanStore 解锁 / JIT binding / PlanController / pause·resume·abort / Surface plan projection |
| **0.3.6** | Delegated Authority | PolicyEngine / Grant lifecycle / scope+risk / budget / expiry / provenance / ALLOW·REVIEW_REQUIRED·DENY / mutation 首次可在有限授权下 ALLOW（仍走完整 Mutation Safety Spine） |
| **0.3.7** | Autonomous Loop | Observe → Reason → Act → Verify → Replan / Completion / Blocked / Cancel / budgets / no-progress detection |
| **0.3.8** | Session Intelligence | observation window / timeline / projections / summaries / bounded context / compaction / todo+task projection |
| **0.3.9** | Stabilization | 全量审计 / invariants / failure+lifecycle / AE acceptance / regression / docs |
| **0.4.x** | Refinement | planning quality / UX / visual observation / performance / capability breadth / recovery / summaries |

真实开发可用 0.3.4 / 0.3.4.1 等内部阶段；**保持依赖顺序，不机械对应 minor version**。0.3.2 影响为零 Runtime scope creep。

## 13. 架构 Invariant 汇总（冻结清单，13 条）

1. **TaskPlan 永不进入 Execution Spine**——执行路径只接受 AuthorizedPlan。
2. **AuthorizedPlan 不携带可长期信任的最终 AE binding**——最终 binding 永远 JIT（执行时解析 + 新鲜捕获 + CAS）。
3. **DerivedEvent 永不得作为 Authority/Preflight/CAS 事实依据；FactEvent 与 ControlEvent 也只有显式列入 AuthorityEvidenceSource 的字段才能被消费。**
4. **Observation generation ≠ Authority freshness**——动作只绑定其依赖的分层 digest。
5. **executionArmed 归属 TaskRun，不归属 Agent**——reload 后 read/analyze 可用，旧任务自主 mutate 不可续跑。
6. **Confirmation 是 PolicyDecision 的结果，不是固定流程节点**。
7. **Capability Invocation Spine 与 Mutation Safety Spine 分离**——read/analyze 不叠加 nonce/CAS/undo。
8. **never = 确定性拒绝；full-access = 更宽 grant（均非绕过）**。
9. **事实 ≠ 推断**：ae/state-observed 是事实，"用户执行了 X"是推断（DerivedRecord）。
10. **Preset 简单，Authority Contract 精确**——UI 档位不得成为底层权限 schema。
11. **模型可见面最小化**——模型只见 {capabilityId, description, paramsSchema}；闭式 schema 不支持的 keyword 响亮失败。
12. **有界输出 + 精确省略计数；总结必须更小（含确定性回退）**。
13. **CapabilityCompiler 输入是 CapabilityIntent 而非 TaskPlan**——Compiler 只编译，不决定"下一步做什么"。

## 14. 验收要点（按版本）

- **0.3.3**：reload 后 TaskRun.executionArmed=false 且 read/analyze 可用；Session 投影确定性；状态三分离成立。
- **0.3.4**：read 能力全链路（观察 → CapabilityIntent → Compiler → ALLOW → 通用 Spine → 结果回灌）；read 路径无 nonce/CAS/undo；错误信封稳定码。
- **0.3.5**：LegacyAuthorityPolicy 下 8 步计划单次 REVIEW_REQUIRED + 逐步 JIT 绑定 + 任一步 CONTEXT_STALE 失败闭合；replan 只替换 TaskPlan；Controller 无 confirm button 概念；`risk=read` 但越 scope 的候选被 DENY。
- **0.3.6**：REVIEW_REQUIRED 体验等价 0.3.1；DENY 带 provenance；grant 越界必升级 + justification；ALLOW 的 mutation 仍过完整 Mutation Safety Spine。
- **0.3.7**：no-progress 检测终止死循环；完成声明必须有验证证据（读 Context 确认）。
- **0.3.8**：观察窗口区分 Canonical/Evidentiary/Derived；总结不获得 epistemic authority；跨 reload 为 A 方案。

---

*冻结声明：本文档自发布起为 **FROZEN FOR 0.3.x**。0.3.3–0.3.9 的模块边界、跨层对象、Authority 语义与两条 Spine 以此为准；实现中若发现某条 invariant 不成立，先按"归档规则"提出 Architecture Amendment，再修改本文档，不得静默偏离。*

