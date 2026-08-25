# Vela Agent — 0.3.3 Runtime Contract Foundation (Implementation Contract)

```text
Status: IMPLEMENTATION CONTRACT (NOT an Architecture Amendment)
Applies to: 0.3.3 — Runtime (Agent / Session / Scope / AgentDriver / typed Session events / Persistence seam in-memory / Surface → Agent consumer)
Roadmap label (HANDOFF.md): 0.3.3 — Context & Observation Foundation
Baseline: docs/design/vela-agent-architecture.md (FROZEN FOR 0.3.x, architecture v2.2)
Companion: docs/design/vela-agent-deferred-0.3.4-constraints.md (0.3.4 implementation discipline, unchanged)
```

> 本文档**不修改、不重新解释** `docs/design/vela-agent-architecture.md`（FROZEN FOR 0.3.x）。
> 它只把冻结架构中**明确属于 0.3.3** 的内容翻译成可实现的 contract：数据模型、接口、
> 状态/事件边界、ownership、输入输出、module/file boundary 与 focused-test plan。
> 冻结架构没有明确规定的能力一律标记 DEFER，不补齐、不推测、不提前实现。
> 本任务只落**最小 implementation skeleton**（冻结架构明确规定的 0.3.3 runtime seam），
> 且不触碰任何被禁止修改的文件（见 §0）。

## 0. 边界与禁止项

本轮**禁止修改**：

- `docs/design/vela-agent-architecture.md`（冻结基线，只读）；
- `client/js/main.js`；
- CoreUI、Vela UI / CSS（`client/css/velaSurface.css`、Vela 视图模块的 UI 行为）；
- Registry（`host/tools/*.tool.jsx`、Registry Renderer 行为）；
- Settings（`client/js/settingsSchema.js`、Settings 运行时/UI）；
- Design Tuning、0.3.2 Design System 相关文件。

本轮**只新增**：contract 文档、独立 Runtime 基础模块（`client/js/vela/` 下新文件）、
独立 focused test（`scripts/test-vela-*.js` 下新文件）。新增模块**不接入**
`client/index.html` 静态引用、**不加入** `velaCepModuleLoader` 依赖序、**不改动**
`velaRuntime.js` 或任何现有加载路径——它们作为独立 UMD 模块供 Node 测试直接 require，
浏览器接线属于 0.3.3 实现阶段（本 contract 只定义 seam，不接线）。

## 1. 0.3.3 正式 scope（逐项确认）

逐项确认规则：先查冻结架构该能力属于哪个版本阶段，再查是否属于 0.3.3 明确交付；
两处都命中才 in-scope。HANDOFF 的「Context & Observation Foundation」标签不改变
冻结架构的版本归属：HANDOFF 提到的 Observation API / read+analyze 能力 / Capability
Registry 扩展在冻结架构 §12 中归 **0.3.4 (Observation + Capability)**，故只记录
integration seam，不实现。

### 1.1 In-scope（冻结架构明确 0.3.3 = Runtime 契约基础）

| # | Contract 项 | 冻结架构出处 | 本任务交付 |
|---|---|---|---|
| C1 | Session = append-only typed event log + 确定性投影 | §5, §6, §6.4 | 契约定义 + 最小 skeleton（`velaSessionRuntime.js`） |
| C2 | typed SessionEvent 三分（Fact / Control / Derived） | §6.2 | 契约定义 + skeleton 常量与分类 |
| C3 | AuthorityEvidenceSource 白名单 | §6.2 | 契约定义 + skeleton 白名单表 |
| C4 | 批准事件生命周期（requested / decided / cancelled / expired） | §6.3 | 契约定义 + skeleton 生命周期判定 |
| C5 | 状态三分层（AgentActivity / TaskState / PresentationStatus） | §5.1 | 契约定义 + skeleton 枚举与合法性校验 |
| C6 | executionArmed 语义（进程级、不持久化；归属 TaskRun） | §5.2 | 契约定义（TaskRun 对象不实现） |
| C7 | SessionPersistence seam + InMemorySessionPersistence | §6.4 | 契约定义 + 最小 skeleton |
| C8 | Agent / AgentScope / AgentDriver 接口形状（生命周期、不实现推理循环） | §5 | 契约定义 + skeleton 接口形状 |
| C9 | Surface → Agent consumer 订阅契约 | §4.3, §5 | 契约定义（UI 改动 DEFER，见 §8） |

### 1.2 DEFER（只记录 integration seam，不实现）

| 能力 | 冻结架构版本归属 | 0.3.3 的 seam |
|---|---|---|
| Observation providers / structured Context / read+analyze 能力 | 0.3.4 | Session 事件已预留 `ae/state-observed` FactEvent 与 `tool/result`；provider 注册留给 0.3.4 |
| Capability Registry 扩展（read/analyze/mutate/create 全能力） | 0.3.4 | 现有 `velaCapabilityContracts.js` 工厂保留；不扩展 |
| generic capability → registered-action 映射 / 统一 invocation+result 信封 | 0.3.4 | 现有 Spine 不动；信封统一留给 0.3.4 |
| TaskPlan / CapabilityIntent / CapabilityCompiler | 0.3.5 | 本 contract 不定义任何 planner/意图类型 |
| PolicyDecision / DelegationGrant / AuthorityEvidence / LegacyAuthorityPolicy | 0.3.5 | 只记录：`permission/*` 事件已定义形状，消费方 0.3.5+ |
| JIT binding / 多步 PlanStore 解锁 / PlanController | 0.3.5 | 现有 `velaPlan.js` 保留，不扩展 |
| TaskRun 对象（TaskState + executionArmed 载体） | 0.3.5+ | §5 注明确「0.3.3 不得提前实现」；仅定义语义 |
| Autonomous Loop（Observe→Reason→Act→Verify→Replan） | 0.3.7 | AgentDriver 只给接口形状，循环不实现 |
| Surface 订阅改造（UI 消费 Session 投影） | 0.3.3 契约 / 实现阶段 | 禁止改 UI；契约在 C9，实现 DEFER |
| `velaProviderIntentGate.js` 退役 | 须在 Authority 到位后 | 0.3.5+，本轮不动 |

## 2. 数据模型

### 2.1 SessionEvent 三分（C2，冻结 §6.2）

```text
SessionEvent
├─ FactEvent        —— 世界状态事实
│   ├─ user/message
│   ├─ agent/action-performed   （Agent 执行，before/after digest 可验证）
│   ├─ tool/result
│   └─ ae/state-observed        （观察事实：状态从 X 变 Y；不代表用户操作）
├─ ControlEvent     —— 会话/任务控制状态
│   ├─ task/started / paused / cancelled
│   ├─ permission/requested / decided / cancelled
│   ├─ delegation/granted / revoked
│   ├─ task/execution-armed
│   └─ todo/write
└─ DerivedEvent     —— 推断/派生（summary/created、title/generated、inferred-operation）
```

Skeleton 常量：`SESSION_EVENT_FAMILIES`（fact / control / derived）与
`SESSION_EVENT_KINDS`（上述 kind 列表），`classifyEventKind(kind)` 返回族；
未知 kind 返回 `null`（fail-closed，不做模糊归类）。

### 2.2 AuthorityEvidenceSource 白名单（C3，冻结 §6.2）

```text
AuthorityEvidenceSource
├─ permission/decided
├─ delegation/granted
├─ delegation/revoked
├─ task/execution-armed
└─ verified target facts（Tier-3 捕获 + 值 digest 等 FactEvent 字段）
```

Skeleton：`AUTHORITY_EVIDENCE_KINDS` 集合 + `isAuthorityEvidenceKind(kind)`。
**禁止**「Fact+Control 全权威、Derived 全非权威」的粗分类——只有白名单内 kind 参与
授权判断。`todo/write`、`task/paused` 等 ControlEvent 不自动获得安全意义。

### 2.3 批准事件生命周期（C4，冻结 §6.3）

```text
permission/requested  { requestId, candidateId, ... }   ← 发起，等待
permission/decided    { requestId, decision }            ← 终态：用户决策
permission/cancelled  { requestId, reason }              ← 终态：Agent/task 取消
（可选）permission/expired { requestId }                 ← 终态：超时
```

投影规则：`pending = requested − (decided ∪ cancelled ∪ expired)`。
不做「requested+decided 原子成对提交」；in-memory 阶段无悬挂 ask（Session 整体销毁）；
引入 SessionPersistence 后为 reload 定义 recovery（无终态 request 恢复为 cancelled）。

Skeleton：`isPermissionEventKind(kind)`、`isPermissionTerminal(kind)`、
`projectPendingApprovalIds(events)`（纯折叠）。

### 2.4 状态三分层（C5，冻结 §5.1）

```text
AgentActivity       —— idle / running（Agent 引擎是否在消费轮次）
TaskState           —— active / paused / waiting-approval / blocked / completed / cancelled
PresentationStatus  —— ready / working / waiting / warning / error / ...
```

三者互不纠缠（与 0.3.2 semantic status ≠ runtime state 一致）。典型组合：
`AgentActivity=idle`、`TaskState=waiting-approval`、`PresentationStatus=waiting`。

Skeleton：三个枚举常量 + `isValidStateTripartition({agentActivity, taskState, presentationStatus})`
（只校验枚举合法性，不编码组合规则——组合语义属于 Surface 投影，0.3.3 不固化）。

### 2.5 Session 数据模型（C1/C6/C7，冻结 §5/§6）

```text
Session
= append-only typed event log + 确定性投影
   ├─ events: 深冻结（deep-frozen）事件数组；seq 连续（1,2,3,...）
   ├─ snapshot: 数据快照（浅拷贝容器 + 深冻结事件）
   └─ projection: 纯折叠（fold），输入事件序 → 确定输出；无副作用
```

- 事件**不可变**：append 后任何修改被拒绝（抛 `SESSION_EVENT_FROZEN`）。
- seq **连续**：append 自行分配 `seq = lastSeq + 1`，因此 continuity 是 implementation-enforced
  invariant；当前公开 append path 不接受外部 seq，gap 在结构上不可达。`SESSION_SEQ_GAP`
  保留为 defensive/stable contract marker，不为触发该错误而扩大 API。
- 投影**确定性**：同一事件序列、同一 fold 函数 → 同一输出；投影不改变 log。
- `executionArmed` **进程级、不持久化**：Session 是 in-memory，reload 后 Session
  消失，任何 armed 状态随之消失；0.3.3 通过「Session 非持久化」天然满足
  「reload 后无执行授权残留」，TaskRun 对象载体不实现（C6）。

### 2.6 SessionPersistence seam（C7，冻结 §6.4）

```text
SessionPersistence（接口，0.3.3 定义）
  persist(sessionSnapshot) -> receipt | null
  restore(receipt) -> sessionSnapshot | null

InMemorySessionPersistence —— 0.3.x 唯一 provider（in-memory，可 optional/null）
```

不引入 fsync/crash journal；事件深冻结、数据快照、seq 连续；投影为纯折叠。
Seam 的存在只为 0.3.x 后续（SessionPersistence 落地/reload recovery）留接口。

## 3. 接口契约

### 3.1 Session API（C1）

```text
createSessionLog(options?) -> {
  append(event)        // 校验类型 + 深冻结 + 分配连续 seq；返回带 seq 的事件（不可变）
  getEvents()          // 深冻结数组快照
  getSnapshot()        // { sessionId, events, lastSeq }
  project(fold, seed)  // 确定性投影：fold(accumulator, event) -> accumulator
  subscribe(listener)  // 可选：append 通知（不持久化；0.3.3 最小形态可无订阅）
  close()              // 释放；关闭后 append 拒绝（SESSION_CLOSED）
}
```

约束：纯 Node 可运行；无 DOM / AE / network / storage 依赖；clock/id 可注入
（与现有 `scripts/velaNodeRuntime.js` 模式一致，但 skeleton 默认不依赖它，
仅接受 `options` 注入）。

### 3.2 Agent / AgentScope / AgentDriver 接口形状（C8，冻结 §5）

```text
Agent
├─ Session          —— typed interaction truth（append-only log + 投影）
├─ Scope            —— 当前活跃作用域（capabilities / context / abort lifetime）
└─ lifecycle        —— 创建 / 会话 / 销毁；与 TaskRun 解耦

AgentScope
= listeners / context / capabilities / abort 生命周期 的归属容器

AgentDriver
= 具体推理循环（Observe → Reason → Act → Observe → Verify → Replan）——0.3.7 实现
```

0.3.3 只定义接口形状常量（不创建 Agent 实例、不实现循环）。Skeleton 提供
`AGENT_LIFECYCLE_STAGES`（created / active / disposed）与接口形状注释；
**不**实现 Agent 工厂——无冻结依据不发明。

### 3.3 Surface → Agent consumer 订阅契约（C9，冻结 §4.3/§5）

```text
Surface 是 Agent consumer：
  订阅 Session 投影，呈现 PresentationStatus（ready / working / waiting / warning / error）
  不拥有 Agent 生命周期，不拥有执行权威（Boundary #8）
```

0.3.3 定义契约（Surface 只能消费 Session 投影的 presentation 层），UI 改造 DEFER
（禁止改 Vela UI/CSS）。

## 4. 状态/事件边界与 ownership

| 层 | 拥有 | 不拥有 |
|---|---|---|
| Session | append-only 事件日志、seq、深冻结、确定性投影 | 决策、执行、授权 |
| AgentScope | capabilities / context / abort 归属 | 不持有 mutation 授权 |
| TaskRun（0.3.5+） | executionArmed（进程级、不持久化） | 0.3.3 不实现 |
| Surface | 订阅投影、呈现 presentation | Agent 生命周期、执行权威 |
| Authority（0.3.5+） | PolicyDecision | 0.3.3 不存在 |

事件写入边界：只有 Runtime 内部（Session owner）可 append；事件一经写入不可变。
投影只读：任何 consumer 不得通过投影反向写 log。

## 5. 输入输出与错误契约

- 输入：`append(event)` 接受 plain object；未知 kind / 非对象 / 已关闭 → 抛稳定错误码
  （`SESSION_EVENT_INVALID`、`SESSION_CLOSED`）。`SESSION_SEQ_GAP` 是 defensive/stable
  contract marker；append 自行生成连续 seq，当前公开 path 下结构上不可达。
- Payload：plain-object payload 被保留并深冻结；缺失或 non-plain-object payload 当前
  coercion 为 `{}`，尚无 per-kind typed-content validation。这是后续 0.3.3 hardening
  consideration，不是 0.3.3-A blocker。
- 深冻结：事件 append 后递归 `Object.freeze`；对已冻结事件/快照的修改由 JS 引擎
  在严格模式下拒绝（TypeError）。`SESSION_EVENT_FROZEN` 保留为语义码，标识
  「已冻结对象不得修改」这一不变式，不依赖具体抛错形态。
- 输出：`getEvents()` / `getSnapshot()` 深冻结；`project()` 返回 fold 结果（不冻结结果，
  由调用方决定——fold 是纯函数，不持有状态）。
- 错误码全部为稳定字符串，不依赖显示语言（与现有 `protocol.ERROR_CODES` 风格一致）。

## 6. Module / file boundary

本轮新增（均独立、不接线）：

```text
client/js/vela/velaSessionRuntime.js     # C1–C7 最小 skeleton（单模块，UMD）
scripts/test-vela-session-runtime.js     # focused tests（纯 Node，node 直接运行）
docs/design/vela-agent-runtime-contract-foundation-0.3.3.md   # 本文档
```

不修改、不新增：`velaCepModuleLoader.js`（依赖序冻结）、`velaRuntime.js`（单步接线冻结）、
`client/index.html`（静态加载清单冻结）、`velaProtocol.js`（协议冻结）。

0.3.3 实现阶段（后续任务）预计的边界（本 contract 只预告，不落）：

```text
client/js/vela/velaSession.js            # 未来：Session owner（接线到 Runtime）
client/js/vela/velaSessionPersistence.js # 未来：Persistence provider 独立文件
client/js/vela/velaAgentRuntime.js       # 未来：Agent/AgentScope 生命周期
```

## 7. Focused-test plan

`scripts/test-vela-session-runtime.js`（本轮，纯 Node，`node scripts/test-vela-session-runtime.js`）：

| 测试 | 验证 |
|---|---|
| event 分类 | 每个 kind 归属正确族；未知 kind → null（fail-closed） |
| 白名单 | 仅 `AUTHORITY_EVIDENCE_KINDS` 内 kind 返回 true；`todo/write`、`task/paused` 不误入 |
| 批准生命周期 | requested→pending；decided/cancelled/expired 后不再 pending；投影纯折叠 |
| append 不可变 | append 后事件深冻结；修改抛 `SESSION_EVENT_FROZEN` |
| seq 连续 | seq 从 1 递增；continuity 由 implementation 强制，`SESSION_SEQ_GAP` 为当前 append path 下结构上不可达的 defensive marker |
| 投影确定性 | 同一序列两次投影结果深相等；投影不改 log |
| snapshot | getSnapshot 深冻结、含 sessionId/lastSeq |
| close | close 后 append 拒绝（`SESSION_CLOSED`） |
| persistence seam | InMemorySessionPersistence persist→restore roundtrip 保持事件/seq；null provider 合法 |
| 状态三分离 | 合法组合通过；非法枚举拒绝 |

0.3.3 验收映射（冻结 §14）：

```text
reload 后 TaskRun.executionArmed=false；未来 read/analyze 应保持可用
   → 0.3.3-A skeleton 只证明 Session/runtime execution authorization 不跨 reload
     持久化，且 executionArmed 不属于 Session persistence；Observation/read/analyze
     capability 尚未实现，其 reload 可用性留给后续对应实现验收
Session 投影确定性
   → 投影确定性测试
状态三分离成立
   → 枚举合法性测试 + 契约 §2.4
```

## 8. DEFER 记录（integration seam，不实现）

- 0.3.4 Observation & Capability：provider 注册、read+analyze 能力、Registry 扩展、
  统一 invocation/result 信封 → 本节不实现；Session 事件模型已为其预留 kind。
- 0.3.5 Planning & Authority：TaskPlan/CapabilityIntent/Compiler、PolicyDecision/
  DelegationGrant/AuthorityEvidence、LegacyAuthorityPolicy、JIT binding、PlanController、
  TaskRun 对象 → 只记录；`permission/*` 事件形状已冻结（§6.3），消费方 0.3.5+。
- 0.3.7 Autonomous Loop：AgentDriver 推理循环 → 0.3.3 仅接口形状。
- Surface UI 订阅改造 → 契约已定义（C9），UI 实现 DEFER。
- `velaProviderIntentGate.js` 退役 → 须在 Authority 到位后（0.3.5+）。

---

*本 contract 不构成 Architecture Amendment；不修改冻结基线。0.3.3 实现若与
冻结架构冲突，以冻结架构为准并走其「归档规则」提出 Amendment，不得静默偏离。*
