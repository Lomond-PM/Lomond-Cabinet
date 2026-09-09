# Current Project State

## Vela development milestone

**0.3.11 — Multi-conversation Foundation：COMPLETE / SEALED**。0.3.12-A0 文档规划 COMPLETE，已合并 dev。当前 **0.3.12-B1 / A11：TARGETED_ACCEPTED / READY FOR COMMIT / PR**，完整公共字符串转义及F1输入准入已获有界实机接受，见 [A11 报告](reports/vela-0.3.12-b1-a11-host-json-serialization.md)。A01 已通过 PR #202 合并 dev，保留 TARGETED_ACCEPTED 与剩余覆盖裁定：公共 `AEToolbox.parseJson` 已移除执行输入的回退，缺少原生 JSON.parse 时使用严格 JSON 解析，实际注册状态链与其他直接消费者的离线验证通过，六组有界真实 AE 验收已接受；覆盖限制保留，INTEGRATED_ACCEPTED / CLOSED 留待 0.3.12-G，B1/0.3.12 未完成。当前排期唯一来源为 [VELA_ROADMAP](VELA_ROADMAP.md)，A01 历史证据及宿主边界见 [A01 阶段报告](reports/vela-0.3.12-b1-a01-host-json-entry.md)，资料与覆盖规划保留在 [A0 阶段报告](reports/vela-0.3.12-a0-baseline-reconciliation.md)。

A11-F1 已补强公共 parseJson：解码后含 U+0000 的对象成员名在属性建立前拒绝（Host兼容性契约）；F1 224项、A01 1122项、serializer 2307项、registry 27项及185/185离线套件通过（0 skip），A11（含F1）真实复验：入口20/20、编码310/310、公共返回3/3 PASS；10项含NUL对象键按用户预授权接受为Host支持范围限制，不计编码PASS。INTEGRATED_ACCEPTED / CLOSED 留待0.3.12-G。首次3 PASS / 1 FAIL / 316 NOT COVERED保留为历史。

首次 A11 真实验收：AE-01 装载 PASS；AE-02 在 U+0000 的 toJson 字符串键返回空键时内容断言 FAIL，矩阵停止（3 PASS / 1 FAIL / 316 NOT COVERED）；AE-03 完整组 NOT COVERED。当时未裁定TARGETED_ACCEPTED；当前以本次复验结论为准，详见A11报告。

当前已实现：多条独立 live conversation records，全局最多一个 active objective；默认启动创建并选择一条；selector/New/Close、最多八条记录及各记录临时草稿。Conversation 拥有 PresentationModel，Surface 通过显式注入使用它；命令、流与完成事件绑定来源 conversation。持久化、历史注入、Authority 恢复、并发目标和队列/调度器均未实现。

最新封存证据见 [0.3.11 综合验收](reports/vela-0.3.11-integrated-acceptance.md)：182/182 离线套件 PASS（0 skipped），94/94 每个 forward/reverse/forward 顺序 PASS，A5 focused 66 与 11 个实际产品 CEP/AE 用例 PASS。综合验收保留实际运行与继承离线证据的边界及全部 UNKNOWN；无 raw wire archive 声明。A01 实施轮1122 focused assertions、最终代码全量离线183/183 PASS（0 skipped）是 A01 历史结果；原A11轮重跑A01 1122项/全量184，F1轮重跑224/1122/2307/27项及全量185；本次真实验收未重跑离线；A01 历史六组有界真实 AE 验收已 TARGETED_ACCEPTED，architecture amendment NONE。

历史切片证据：[A1](reports/vela-0.3.11-a1-conversation-ownership.md) 177/177、真实 AE 5/5；[A2](reports/vela-0.3.11-a2-conversation-presentation.md) / F1 179/179；[A3](reports/vela-0.3.11-a3-source-routing.md) 180/180；[A4](reports/vela-0.3.11-a4-runtime-composition.md) 181/181；[A5](reports/vela-0.3.11-a5-conversation-selection.md) 182/182。以上均 COMPLETE / SEALED，不是并列的当前基线。此前 [0.3.10](reports/vela-0.3.10-context-closure.md) 176/176、A4 real AE PASS、A6R 15/15、A1 U11 CLOSED 保留为历史封存事实。

Historical **0.3.9 — Streaming Response & Reasoning Surface: COMPLETE / SEALED / merged into dev**, PR #182, merge `91005f2`, retains its own 171/171 baseline.

[A4a Verified Trajectory Source & Projection Contract](design/vela-verified-trajectory-0.3.10-a4a.md) and [A4b implementation evidence](reports/vela-0.3.10-a4b-verified-trajectory.md) define and implement bounded immutable active/last-terminal evidence. PR #190 is merged. A4b PASS / CLOSED; targeted real AE acceptance was user-observed and confirmed in the A5a request and integrated closure request. Per-case raw artifacts are externally retained/not present in the repository; offline fixtures are not real AE evidence. Cancellation seals available facts without late enrichment; dispose/reload clears both slots. Session/Provider/Authority semantics remain unchanged.

[A5a Bounded Context Selection Policy Contract](design/vela-context-selection-0.3.10-a5a.md) resolves A1 U7: only eligible verified attempts from the most-recent terminal are optional historical candidates; active trajectory and conversation transcript selection are deferred. A3b currently always disables optional expansion, including synthetic full-fit decisions. [A5b implementation evidence](reports/vela-0.3.10-a5b-context-selection.md) records bounded immutable eligibility/omission evidence with zero model-visible optional history, 23 immutable pre-A5b production comparisons and full offline regression PASS. General conversation ownership remains 0.3.11; frozen architecture amendment NONE.

[0.3.10-A1 Context Taxonomy, Ownership & Lifecycle Contract](design/vela-context-architecture-0.3.10-a1.md) records the design baseline and deferred decisions. `currentContext` remains a compatibility/read-only Observation projection with unchanged API/behavior. [A2 implementation evidence](reports/vela-0.3.10-a2-context-evidence.md) describes the opt-in local Controller/Adapter input snapshot and stateless Transport serialization projection. Current messages, captures, admission and execution semantics remain unchanged. No model-visible history inclusion or persistent trajectory store is implemented; multi-record runtime composition is now owned by 0.3.11-A4.

[A3a Provider Capacity Source & Context Budget Policy Decision](design/vela-provider-capacity-budget-0.3.10-a3a.md) defines current-shape compatibility for unknown capacity/cost/reserve and conditional numeric fit checks. [A3b implementation evidence](reports/vela-0.3.10-a3b-capacity-budget.md) records the pure normalization/disposition seam and separate immutable decision projection. Production always evaluates unknown C/I/G/S with exact bytes and unchanged actual M/R, yielding `unassessed-capacity` / `allow-current-shape`, even with A2 debug evidence disabled. Current readiness contextLength remains advisory and is not consumed. No real capacity enforcement, tokenizer, discovery rewiring or generation tuning is implemented; qualified numeric decisions are synthetic-test evidence only. Empirical instance routing, full-input accounting and near-capacity reserve semantics remain explicit requirements before future live numeric integration.

This file owns current implementation status and handoff facts. [VELA_ROADMAP](VELA_ROADMAP.md) is the only current roadmap. [Agent architecture](design/vela-agent-architecture.md) remains FROZEN FOR 0.3.x, architecture amendment NONE. The [C2 closure](reports/vela-0.3.9-c2-closure.md) is final historical evidence: 171/171 offline suites PASS, 0 skipped, USER-MANUAL REAL AE ACCEPTANCE PASS, no unresolved 0.3.9 correctness blocker. For that historical 0.3.9 acceptance, Codex did not operate or observe AE. A6R used the real CEP DevTools, with native AE value/Undo confirmation by the user.

## Historical 0.3.11-A3 sealed acceptance

A3 real AE used the built-in browser CEP DevTools with the existing local qwen3.5-4b instance. Core replacement used injected page lifecycle events executing the actual pagehide/pageshow handlers, not native panel close/reopen, yielding a fresh session and no restored Review; cross-conversation isolation is proven only by the production-focused multi-bundle harness. At the sealed A3 baseline, production had one conversation and no A4 composition. At its sealed baseline A4 supported multiple live records while default startup selected one. A5 adds user-facing switching; persistence remains absent and frozen architecture amendment NONE.

Formal seal changed only authoritative documentation. 该 A3 文档封存当时复用了 180/180 离线结果；它不是当前最新基线，也不是本轮执行结果。 The [A3 report](reports/vela-0.3.11-a3-source-routing.md) retains the manually transcribed evidence limitation, inherited trajectory/A2 UNKNOWNs, and the safely blocked cleanup target-mismatch whose actual model value remains UNKNOWN; the explicit retry restored opacity to 100 through fresh Verify.

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

## 0.3.12 生产复核边界

R1原审计指出A02一次性授权最终Verify关联、A03 no-op的Session提交标记、A05/A06/A12启停生命周期等待复核路径。这些路径本轮未修复；下述控制路径与封存结果不应被扩写为所有新反例都已通过。详细条件/来源/生产模块验证计划见[A0报告](reports/vela-0.3.12-a0-baseline-reconciliation.md)。R1总账的OPEN状态不是本轮新确诊；原封存UNKNOWN不升级。

## Agent execution and authority

Agent Loop Foundation and bounded Multi-step Agent are complete. Current acceptance capabilities include set-opacity-v1 and set-layer-name-v1, including the ordered opacity-then-rename logical plan. This is not complete AE capability coverage or generic multi-capability delegated authority.

Validated candidate → local Review/Authority → fresh Preflight → Host mutation when needed → fresh Verify remains the control path. Fresh actual==desired is already-satisfied: no unnecessary Host mutation or Undo, but fresh Verify is still required before the step completes and the logical cursor advances. Current capability-aware Undo labels are Vela: Set Opacity and Vela: Rename Layer; metadata generalization is future work.

The explicit one-shot opacity delegation retains process-local Session/task/scope/risk/budget/expiry/provenance ownership. Policy ALLOW is not Host permission; model output and Session history cannot forge or restore live authority. Lifecycle invalidation and stale-target/CAS protections remain. Authority details are normative in the frozen architecture and historical in the 0.3.6 closure, not redefined here.

## Accepted observations and future work

Historical workstation ordinary/multi-step refusal is NON-REPRODUCED HISTORICAL OBSERVATION, not a current blocker. F9 real Provider evidence accepted 22/22 requests including 12/12 exact logical plans; user-manual AE acceptance confirmed reasoning OFF/ON, no-op progression, real mutation, correct second Review and objective completion.

qwen3.5 verbosity/repetition is model/provider tuning, not Vela correctness failure. Cross-turn reasoning UI history and model-context consumption are separate future decisions. Future live numeric budget integration, capability generalization/completeness, mixed response, cards/activity, telemetry and rendering refinements are assigned in the [roadmap](VELA_ROADMAP.md), not 0.3.9 TODOs.

## Verification and ownership

最新完整功能封存基线为 **182/182 suites PASS，0 skipped（0.3.11-A5 / 综合封存继承）**，顺序测试 94/94 ×3。176/176 与 171/171 分别属于历史 0.3.10、0.3.9。A01 实施轮生产组合测试1122项断言、全量离线183/183 PASS（0 skipped），属于 A01 历史结果；原A11离线184/184、F1离线185/185 PASS（0 skipped），本次未重跑，详见 A11 报告；真实 AE 的六组有界验收另见报告；两者都不等于整个 B1/0.3.12 封存。Generated i18n content 由脚本拥有。[HANDOFF](HANDOFF.md) 是导航入口；[KNOWN_ISSUES](KNOWN_ISSUES.md) 持有既有问题；CHANGELOG 持有包发布历史。

## Context closure and 0.3.11 inheritance

Current Provider input contains only current system/profile, response contract/grounding envelope and current user objective. A5 historical candidates are evidence-only; model-visible optional historical context = 0 and current A3 optionalExpansion=false. 未实现 transcript/model-visible history、raw reasoning history 注入或 persistent Memory；多会话 runtime 已由 0.3.11 实现。

A6a found no accidental unbounded retention in bounded A2/A3/A4/A5 evidence structures. Presentation items may grow as UI history, Session events as canonical Session records, and Plan/replay/security bookkeeping under their security owners; these are not A2–A5 Context leaks and were not pruned. Runtime.resetSession() is not a new Agent Session, a new conversation or panel reload.

0.3.10 封存时提出的 conversation owner、Session/Presentation/Provider ownership、switch/cancel、shared Host 与 composition scheduling 决策，现由已封存 0.3.11 切片记录承接，不再作为未开始的当前任务。新增 conversationId 本身不证明隔离；继承限制见 [0.3.10 closure](reports/vela-0.3.10-context-closure.md)，request-to-Review continuity 见 [KNOWN_ISSUES](KNOWN_ISSUES.md#vela-request-to-review-target-continuity)。

A2 acceptance follow-up: [A2-F1 cancellation reasoning reconciliation](reports/vela-0.3.11-a2-f1-cancellation-reasoning.md) repairs a pre-existing terminal-publication ordering defect surfaced by real AE Case 4. F1 offline: 88 focused assertions and 179/179 full suites PASS, 0 skipped. Real-AE 4a–4c, Case 5 and Case 6 re-test PASS. First Case 6 outer-response failure and UNKNOWN rejected field remain documented. A2 and F1 are COMPLETE / SEALED; no further production change was made for the non-reproduced response failure.
