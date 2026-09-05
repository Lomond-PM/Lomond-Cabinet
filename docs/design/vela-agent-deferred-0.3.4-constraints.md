# Vela Agent — 0.3.4 Deferred Implementation Constraints

> Historical 0.3.4 implementation constraint record, not the current stage plan. Current scheduling belongs to the [canonical roadmap](../VELA_ROADMAP.md); context scope is now planned under 0.3.10. The design reasoning below is preserved, not asserted to be a completed 0.3.10 design.

```text
Status: DEFERRED (implementation note, NOT architecture)
Applies to: 0.3.4 — Observation & Capability
Source: DSH 源码验证（DeepSeek Harness @deepseek-ai/*，v0.1.0-rc.7）+ Vela 0.3.3 pre-audit
Constraint type: performance / scheduling implementation discipline
```

> 本文件**不修改** `docs/design/vela-agent-architecture.md`（FROZEN FOR 0.3.x）。
> 下述两条属于 0.3.4 的 Context / Capability 实现契约，不是架构 invariant，也不构成 Architecture Amendment。
> 依据：这两条在验证既有 invariants（11 模型可见面最小化、7 双 Spine 分离、Session append-only history），而非推翻它们。

## DEFER TO 0.3.4 — Observation & Capability implementation constraints

### 1. Prompt / Context assembly — maximize byte-stable prefix

- Prompt/context assembly should maximize the byte-stable request prefix:
  - stable identity/instructions/policy/tool schemas first where protocol permits;
  - high-churn AE context and observations later;
  - dynamic projection should be bounded and demand-driven;
  - protocol correctness takes precedence over cache optimization.

形式化：`maximize byte-stable prefix, subject to protocol correctness`（不是"所有动态 context 必须放最后"的硬规则；未来 provider/schema 可能要求固定位置关系）。

DSH 证据：KV cache 复用是显式工程约束——`dsh-compaction-basic/lib/index.js:216,259,643,833`（checkpoint/剪裁不失效前缀缓存）、`dsh-user-approval/lib/types/index.js:81`（策略叙述不改写稳定 system-prompt 前缀）、`dsh-tools/lib/index.js:1606`（未变工具集产生 byte-identical 文本）。

Vela 注意点：当前每轮请求为 `[system prompt] + [assistant grounding summary] + [user message]`（`velaProviderController.js:309`），grounding summary 是逐轮变量——0.3.4 组装时应把高变化 Context projection 置于稳定段之后。

### 2. Capability concurrency — explicit and fail-closed

- Capability concurrency is explicit and fail-closed:
  - concurrency safety is independent from read/analyze/mutate/create risk class;
  - undeclared capability execution is exclusive;
  - only capabilities explicitly declaring concurrency-safe may overlap;
  - mutation remains exclusive unless a future architecture amendment proves otherwise.

关键修正：**不要把 "read = parallel" 写死**。`risk/read ≠ concurrency-safe`——`isConcurrencySafe` 是 capability 自己显式声明的**独立维度**（AE 环境中 `readRenderedFrame`/`readSelectionThroughHost`/`inspectExpensiveCompositionState` 等读可能依赖 ExtendScript 单线程、争用同一 capture lifecycle、有昂贵 host state 或 ordering 要求）。

DSH 证据：`dsh-tools/lib/index.js:2940-2944`（未声明 `isConcurrencySafe` → `exclusive`；显式 true → `parallel`）；`dsh-agent-loop/lib/index.js:896-898`（`maxParallelToolCalls` 默认 10）；读类工具（`dsh-tool-fs:415`、`dsh-tool-web:223`、`dsh-tool-subagent:216`）显式声明 `isConcurrencySafe: () => true`。

---

*设计原则（保留结论）：性能不是 Agent 架构完成后的附加项——stable prefix、bounded context、scoped capability schemas、append-only history、explicit concurrency 都是架构接口设计阶段就决定一半的性能属性。0.3.4 做 Context / Capability 时，把 cache-friendliness 与 parallelizability 当 contract property，而不是 0.4 再来做性能优化。*

