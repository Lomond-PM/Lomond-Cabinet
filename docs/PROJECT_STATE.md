# Current Project State

## Vela development milestone

**0.3.12 — Baseline Safety & Fact-chain Closure：COMPLETE / SEALED。** 最终 G 综合验收已经通过 PR #213 合并到 `dev@ce8a73646cb01859d0f258101bee39f547081615`，对应 Project checks 成功；最终生产/测试基线为 **198/198 PASS，0 FAIL，0 skip**。20 项原缺陷/治理条目按有界证据 CLOSED，G-10 / COV-03～06 五个持续覆盖工作面保持 OPEN，其余 29 项沿后续路线；全部 54 个原 ID 保留。D/F 历史 Provider timeout 的 FAIL、原因及实际 token 统计 unknown 保留，残余可用性风险已按 G 裁定接受；Experimental Preview、默认禁用、readiness≠qualification 与现有 120000 ms 整个请求截止保持。完整整合证据、Remove 最小修复、真实两步代表和风险边界见 [0.3.12 G 综合报告](reports/vela-0.3.12-integrated-acceptance.md)。

当前支持多条独立 live conversation records、全局最多一个 active objective；默认创建并选择一条，支持 selector/New/Close、最多八条记录及各自临时草稿。PresentationModel 由 Conversation 持有，命令/流/完成事件绑定来源 conversation。持久化、模型可见历史注入、Authority 恢复、并发目标和目标队列/调度器均未实现。

0.3.12 各 focused 报告继续持有阶段事实与历史失败，不因最终封存重写；当前关闭状态和跨阶段风险以 G 报告及总账为准。历史事实入口：[0.3.11 综合封存](reports/vela-0.3.11-integrated-acceptance.md)、[0.3.10 Context 封存](reports/vela-0.3.10-context-closure.md)、[0.3.9 封存](reports/vela-0.3.9-c2-closure.md)、[A01](reports/vela-0.3.12-b1-a01-host-json-entry.md)、[A11/F1](reports/vela-0.3.12-b1-a11-host-json-serialization.md)、[G-02](reports/vela-0.3.12-b1-g02-layer-name-unicode.md)、[A08](reports/vela-0.3.12-b2-a08-detach-comment-ownership.md)、[A09](reports/vela-0.3.12-b2-a09-coordinate-space.md)、[C1](reports/vela-0.3.12-c1-a04-session-events.md)、[C2](reports/vela-0.3.12-c2-execution-facts-verification.md)、[D](reports/vela-0.3.12-d-provider-task-lifecycle.md)、[E](reports/vela-0.3.12-e-user-assets-exit-safety.md)、[F](reports/vela-0.3.12-f-ux03-readable-review.md)。历史 UNKNOWN、Host 限制及 A08 retained Detach 注册/UI 未交付仍保留，不由封存摘要升级。

本文件持有当前实现与交接事实；[VELA_ROADMAP](VELA_ROADMAP.md) 是唯一排期来源。[Agent architecture](design/vela-agent-architecture.md) 保持 FROZEN FOR 0.3.x，architecture amendment NONE。

## Package release identity

当前产品 metadata 已统一为 **0.3.12**：`VERSION`、manifest 两个版本字段和 Host `projectVersion` 均应一致。当前发行身份为 **`v0.3.12 — Legacy`**，用于冻结 0.3.13/0.3.14 大型 UI 重构前的产品基线。GitHub 上不可变的 `v0.3.12` tag / Release 是“是否已经发布”的权威事实；维护中的仓库文档不再复制一个会在发布瞬间过时的 published/unpublished 状态，因此 release-prep 合并后无需仅为“发布完成”再修改本文件。历史 0.3.6 release scope 保留在 [0.3.6 closure](design/vela-agent-0.3.6-closure.md)。

## 0.3.13 UI platform handoff

下一开发里程碑为 **0.3.13 — Visual Baseline & UI Platform Rebuild**。当前 UI Lab 的基础视觉方向已经获得用户认可，因此 0.3.13 不重新发散一套审美：先审计真实页面的生效样式、inline 写入、配置覆盖与交互 owner，再把 UI Lab 已认可的布局、排版、控件和 motion contract 变成可运行参考页面与共享平台。Liquid Glass 仍是 UI Lab 中独立的材质实验层；继续探索 CSS Surface Glass + capability-gated optical treatment / graceful fallback，但它不是共享平台、非玻璃页面或 0.3.13 其他工作包的前置条件。全产品 Home / Registry / Settings / Palette / Vela 迁移与旧路径退出属于 0.3.14。

## Current Provider and presentation behavior

| Area | Implemented state |
| --- | --- |
| Activation | Experimental Preview; production activation blocked by no-qualified-default-model. Local Provider opt-in is session-only, disabled by default; endpoint/model configuration may persist. Readiness is not qualification. |
| Streaming | Production Runtime streaming enabled; explicit nonstream fallback retained. |
| TEXT_ONLY | Native assistant prose streaming; model generates no Vela JSON envelope. Adapter owns internal canonicalization. |
| Structured | Explicit opacity/rename proposals and supported two-step logical plan use strict json_schema. Partial JSON is not presentation prose; partial output never enters Agent. Wrong structured output fails, without successful text fallback. |
| Reasoning | Independent untrusted presentation-only channel; Provider reasoning ON/OFF supported. Current-turn disclosure and user/terminal anchoring; terminal default collapsed. A new objective clears prior raw reasoning. No raw reasoning in LLM context, Observation, Authority or execution justification. |
| Transport | Valid SSE [DONE] ends protocol reading without waiting for CEP physical EOF. Terminal schema/finish validation still required; stream-completed is not authoritative success. Pre-DONE errors and finish_reason=length fail closed. |
| Limits | Streaming ceiling 4 MiB includes reasoning/content/SSE framing. Nonstream/canonical JSON remains a separate 256 KiB limit. |
| Exact qwen3.5-4b policy | Ordinary thinking 6144 / total max_tokens 8192; structured 2048 / 4096. Other model ids do not inherit these fields. |
| Context budget | A3b 保持 unknown C/I/G/S、实际 M/R 不变，结果为 unassessed-capacity / allow-current-shape；readiness contextLength 仅为提示，不参与预算。未接入实时数字容量约束、tokenizer 或模型可见历史。约束来源见 [A3b 报告](reports/vela-0.3.10-a3b-capacity-budget.md)。 |

## 0.3.12 sealed production boundaries

0.3.12 已将公共 Host 数据边界、Session 事件、执行事实/原目标 Verify、Provider/后台任务收束、用户资产保存/离开保护和最小 Review 可读性按 G 的有界证据关闭。关闭不等于所有环境和分支均自然实机覆盖：A09 AE26.3 复验、AV fallback、D 自然 Host/Verify 在途 UI 窗口、特殊 Host 环境、IME/DPI/长时运行及 retained Detach 注册/UI 等限制继续按原报告保留；G-10 / COV-03～06 继续作为后续版本的覆盖工作面。

## Agent execution and authority

Agent Loop Foundation and bounded Multi-step Agent are complete. Current acceptance capabilities include set-opacity-v1 and set-layer-name-v1, including the ordered opacity-then-rename logical plan. This is not complete AE capability coverage or generic multi-capability delegated authority.

Validated candidate → local Review/Authority → fresh Preflight → Host mutation when needed → fresh Verify remains the control path. Fresh actual==desired is already-satisfied: no unnecessary Host mutation or Undo, but fresh Verify is still required before the step completes and the logical cursor advances. Current capability-aware Undo labels are Vela: Set Opacity and Vela: Rename Layer; metadata generalization is future work.

The explicit one-shot opacity delegation retains process-local Session/task/scope/risk/budget/expiry/provenance ownership. Policy ALLOW is not Host permission; model output and Session history cannot forge or restore live authority. Lifecycle invalidation and stale-target/CAS protections remain. Authority details are normative in the frozen architecture and historical in the 0.3.6 closure, not redefined here.

## Accepted observations and future work

Historical workstation ordinary/multi-step refusal is NON-REPRODUCED HISTORICAL OBSERVATION, not a current blocker. F9 real Provider evidence accepted 22/22 requests including 12/12 exact logical plans; user-manual AE acceptance confirmed reasoning OFF/ON, no-op progression, real mutation, correct second Review and objective completion.

0.3.12 G additionally obtained a real supported two-step representative under the current local configuration: first-step write and fresh Verify completed, the second step formed an independent Review and was rejected, preserving partial-completion facts. This proves that representative can complete the intended review chain; it does not establish general model qualification or erase the older D/F timeouts. qwen3.5 verbosity/repetition and the unresolved timeout/latency distribution remain model/provider qualification or observability concerns rather than reasons to rewrite sealed 0.3.12 execution facts.

Cross-turn reasoning UI history and model-context consumption are separate future decisions. Future live numeric budget integration, capability generalization/completeness, mixed response, cards/activity, telemetry and rendering refinements are assigned in the [roadmap](VELA_ROADMAP.md), not historical 0.3.9 TODOs.

## Verification and ownership

0.3.12 当前封存验证以 [G 综合报告](reports/vela-0.3.12-integrated-acceptance.md) 为准；最终 **198/198** 对应 G 的最终生产/测试代码，历史及中间版本结果不混用。PR #213 的 Project checks 已成功并合并 dev。Generated i18n content 由脚本拥有。[HANDOFF](HANDOFF.md) 是导航入口；[KNOWN_ISSUES](KNOWN_ISSUES.md) 持有既有问题；CHANGELOG 持有包发布历史。

## Context closure and 0.3.11 inheritance

Current Provider input contains only current system/profile, response contract/grounding envelope and current user objective. A5 historical candidates are evidence-only; model-visible optional historical context = 0 and current A3 optionalExpansion=false. 未实现 transcript/model-visible history、raw reasoning history 注入或 persistent Memory；多会话 runtime 已由 0.3.11 实现。

Trajectory 仅保留有界不可变 active / last-terminal 证据；取消封存已有事实，不做迟到补充，dispose/reload 清空两槽。`currentContext` 仍为兼容/只读 Observation projection。现有语义及原始覆盖限制见 [A4b](reports/vela-0.3.10-a4b-verified-trajectory.md) 和 [Context contract](design/vela-context-architecture-0.3.10-a1.md)。

A6a found no accidental unbounded retention in bounded A2/A3/A4/A5 evidence structures. Presentation items may grow as UI history, Session events as canonical Session records, and Plan/replay/security bookkeeping under their security owners; these are not A2–A5 Context leaks and were not pruned. Runtime.resetSession() is not a new Agent Session, a new conversation or panel reload.

0.3.10 封存时提出的 conversation owner、Session/Presentation/Provider ownership、switch/cancel、shared Host 与 composition scheduling 决策，现由已封存 0.3.11 切片记录承接，不再作为未开始的当前任务。新增 conversationId 本身不证明隔离；继承限制见 [0.3.10 closure](reports/vela-0.3.10-context-closure.md)，request-to-Review continuity 见 [KNOWN_ISSUES](KNOWN_ISSUES.md#vela-request-to-review-target-continuity)。

A2 acceptance follow-up: [A2-F1 cancellation reasoning reconciliation](reports/vela-0.3.11-a2-f1-cancellation-reasoning.md) repairs a pre-existing terminal-publication ordering defect surfaced by real AE Case 4. F1 offline: 88 focused assertions and 179/179 full suites PASS, 0 skipped. Real-AE 4a–4c, Case 5 and Case 6 re-test PASS. First Case 6 outer-response failure and UNKNOWN rejected field remain documented. A2 and F1 are COMPLETE / SEALED; no further production change was made for the non-reproduced response failure.
