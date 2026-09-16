# Current Project State

## Vela development milestone

**0.3.12-G：INTEGRATED_ACCEPTED / READY FOR COMMIT / PR**（2026-09-16最终裁定），见 [G 综合报告](reports/vela-0.3.12-integrated-acceptance.md)。0.3.12技术关闭与封存裁定已通过：20项原缺陷/治理条目按有界证据CLOSED，5项持续覆盖OPEN，其余29项不变，54个原ID保留。D/F旧超时残余风险已接受，原FAIL、原因及tokens unknown保留；实验限制与120000ms整个请求截止不变，后续观测/资格复核及立即重新处置条件由G报告持有。**仓库封存待承载本裁定的G PR通过CI并合并dev后生效**，当前文档修改尚未提交，不宣称远端已封存。最终198/198基线不变，本轮仅文档检查，不进入0.3.13。

以下B1–F条目保留阶段验收基线与覆盖边界；其原缺陷的当前关闭状态以G最终裁定和机器总账为准。G中新增Remove修复及85项/真实Grid与Feature证据见G报告，历史A08“当时未修复”记录保持。

**E 已通过 PR #211 合并 dev**，AP-01、AP-02、AP-03、UX-01、UX-02 保持 TARGETED_ACCEPTED，见 [E 报告](reports/vela-0.3.12-e-user-assets-exit-safety.md)。

**D 已通过 PR #210 合并 dev**，A05/A06/A07/A12 保持有界接受；自然 Host/Verify 在途 UIDisable、同 Surface checking 的正常 UI suspend/resume 等欠项及原 PROVIDER_TIMEOUT 保留在 [D 报告](reports/vela-0.3.12-d-provider-task-lifecycle.md)。

**C2 已通过 PR #209 合并 dev**，A02、A03 保持 TARGETED_ACCEPTED — AE26.0x67 / AdobeCEP 12.0.1 / Chrome 99；原有覆盖限制见 [C2 报告](reports/vela-0.3.12-c2-execution-facts-verification.md)。

**A04 已通过 PR #208 合并 dev**，保持 TARGETED_ACCEPTED — AdobeCEP 12.0.1 / Chrome 99（Windows Win64）；其有界页面/临时 Agent 验收见 [C1 报告](reports/vela-0.3.12-c1-a04-session-events.md)，不据此扩大完整 Provider→Authority→Host 覆盖。

**A09 已通过 PR #207 合并 dev**；M1、M2/F1 与 A09 均为 **TARGETED_ACCEPTED — AE26.0x67**，不重新打开其验收。ACK Feature 保持 auto/center 与既有有界2D/平移父链规则；TBB Text 使用 source-local padding，Shape/AV visual 使用 comp-space padding。AE26.3x87 跨版本复验 DEFERRED；AV fallback 真实 AE NOT COVERED、离线覆盖保持。完整结果、历史失败及边界见 [A09 主报告](reports/vela-0.3.12-b2-a09-coordinate-space.md)。原缺陷已按G裁定有界CLOSED；阶段支持包络不变，仓库封存待G PR通过CI并合并dev。

当前支持多条独立 live conversation records、全局最多一个 active objective；默认创建并选择一条，支持 selector/New/Close、最多八条记录及各自临时草稿。PresentationModel 由 Conversation 持有，命令/流/完成事件绑定来源 conversation。持久化、历史注入、Authority 恢复、并发目标和目标队列/调度器均未实现。

历史事实保留在原报告：[0.3.11 综合封存](reports/vela-0.3.11-integrated-acceptance.md)、[0.3.10 Context 封存](reports/vela-0.3.10-context-closure.md)、[0.3.9 封存](reports/vela-0.3.9-c2-closure.md)、[A01](reports/vela-0.3.12-b1-a01-host-json-entry.md)、[A11/F1](reports/vela-0.3.12-b1-a11-host-json-serialization.md)、[G-02](reports/vela-0.3.12-b1-g02-layer-name-unicode.md)、[A08](reports/vela-0.3.12-b2-a08-detach-comment-ownership.md)。历史 UNKNOWN、Host 限制及 A08 Detach 注册/UI 未交付仍保留，不由当前摘要升级。

本文件持有当前实现与交接事实；[VELA_ROADMAP](VELA_ROADMAP.md) 是唯一排期来源。[Agent architecture](design/vela-agent-architecture.md) 保持 FROZEN FOR 0.3.x，architecture amendment NONE。

## Package release metadata is separate

VERSION, both manifest fields and Host projectVersion remain **0.3.6**, release-prepared but unpublished; latest recorded published tag is **v0.3.5**. Sealing a Vela feature milestone does not publish 0.3.6 or 0.3.9, alter CHANGELOG release sections, or authorize main/tag operations. Historical release scope remains in [0.3.6 closure](design/vela-agent-0.3.6-closure.md).

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

## 0.3.12 生产复核边界

R1原审计的 A02 最终 Verify 关联与 A03 提交事实已由 [C2](reports/vela-0.3.12-c2-execution-facts-verification.md) 实施并完成离线及有界真实验收，阶段分别 TARGETED_ACCEPTED，现原缺陷已按G裁定有界CLOSED；迟到 Verify、不确定 Host 返回等保留原离线证据等级。A05/A06/A12 启停生命周期不属于 C2。下述历史控制路径与封存结果不扩写为所有新反例均已通过；原审计来源见 [A0报告](reports/vela-0.3.12-a0-baseline-reconciliation.md)，原封存 UNKNOWN 不升级。

## Agent execution and authority

Agent Loop Foundation and bounded Multi-step Agent are complete. Current acceptance capabilities include set-opacity-v1 and set-layer-name-v1, including the ordered opacity-then-rename logical plan. This is not complete AE capability coverage or generic multi-capability delegated authority.

Validated candidate → local Review/Authority → fresh Preflight → Host mutation when needed → fresh Verify remains the control path. Fresh actual==desired is already-satisfied: no unnecessary Host mutation or Undo, but fresh Verify is still required before the step completes and the logical cursor advances. Current capability-aware Undo labels are Vela: Set Opacity and Vela: Rename Layer; metadata generalization is future work.

The explicit one-shot opacity delegation retains process-local Session/task/scope/risk/budget/expiry/provenance ownership. Policy ALLOW is not Host permission; model output and Session history cannot forge or restore live authority. Lifecycle invalidation and stale-target/CAS protections remain. Authority details are normative in the frozen architecture and historical in the 0.3.6 closure, not redefined here.

## Accepted observations and future work

Historical workstation ordinary/multi-step refusal is NON-REPRODUCED HISTORICAL OBSERVATION, not a current blocker. F9 real Provider evidence accepted 22/22 requests including 12/12 exact logical plans; user-manual AE acceptance confirmed reasoning OFF/ON, no-op progression, real mutation, correct second Review and objective completion.

qwen3.5 verbosity/repetition is model/provider tuning, not Vela correctness failure. Cross-turn reasoning UI history and model-context consumption are separate future decisions. Future live numeric budget integration, capability generalization/completeness, mixed response, cards/activity, telemetry and rendering refinements are assigned in the [roadmap](VELA_ROADMAP.md), not 0.3.9 TODOs.

## Verification and ownership

当前 G 验证以 [G 综合报告](reports/vela-0.3.12-integrated-acceptance.md) 为准；最终 198/198 对应 G 的最终生产/测试代码，历史及中间版本结果不混用。Generated i18n content 由脚本拥有。[HANDOFF](HANDOFF.md) 是导航入口；[KNOWN_ISSUES](KNOWN_ISSUES.md) 持有既有问题；CHANGELOG 持有包发布历史。

## Context closure and 0.3.11 inheritance

Current Provider input contains only current system/profile, response contract/grounding envelope and current user objective. A5 historical candidates are evidence-only; model-visible optional historical context = 0 and current A3 optionalExpansion=false. 未实现 transcript/model-visible history、raw reasoning history 注入或 persistent Memory；多会话 runtime 已由 0.3.11 实现。

Trajectory 仅保留有界不可变 active / last-terminal 证据；取消封存已有事实，不做迟到补充，dispose/reload 清空两槽。`currentContext` 仍为兼容/只读 Observation projection。现有语义及原始覆盖限制见 [A4b](reports/vela-0.3.10-a4b-verified-trajectory.md) 和 [Context contract](design/vela-context-architecture-0.3.10-a1.md)。

A6a found no accidental unbounded retention in bounded A2/A3/A4/A5 evidence structures. Presentation items may grow as UI history, Session events as canonical Session records, and Plan/replay/security bookkeeping under their security owners; these are not A2–A5 Context leaks and were not pruned. Runtime.resetSession() is not a new Agent Session, a new conversation or panel reload.

0.3.10 封存时提出的 conversation owner、Session/Presentation/Provider ownership、switch/cancel、shared Host 与 composition scheduling 决策，现由已封存 0.3.11 切片记录承接，不再作为未开始的当前任务。新增 conversationId 本身不证明隔离；继承限制见 [0.3.10 closure](reports/vela-0.3.10-context-closure.md)，request-to-Review continuity 见 [KNOWN_ISSUES](KNOWN_ISSUES.md#vela-request-to-review-target-continuity)。

A2 acceptance follow-up: [A2-F1 cancellation reasoning reconciliation](reports/vela-0.3.11-a2-f1-cancellation-reasoning.md) repairs a pre-existing terminal-publication ordering defect surfaced by real AE Case 4. F1 offline: 88 focused assertions and 179/179 full suites PASS, 0 skipped. Real-AE 4a–4c, Case 5 and Case 6 re-test PASS. First Case 6 outer-response failure and UNKNOWN rejected field remain documented. A2 and F1 are COMPLETE / SEALED; no further production change was made for the non-reproduced response failure.
