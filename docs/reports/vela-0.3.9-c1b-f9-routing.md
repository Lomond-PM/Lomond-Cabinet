# Vela 0.3.9-C1b-F9 — Multi-step routing / structured-output regression

日期：2026-09-05。基线：`17a822e`（F8 checkpoint）。任务分支：`codex/vela-0.3.9-c1b-f9-routing`。

**C2 状态更新：USER-MANUAL REAL AE ACCEPTANCE: PASS。** 用户已手动确认 multi-step、reasoning OFF/ON、no-op Verify/推进、真实修改、第二个 Review capability 及 objective completed 正常。历史 refusal 归类为 **NON-REPRODUCED HISTORICAL OBSERVATION**，不再是当前 blocker；其历史根因仍未证实。没有以假定根因修改生产代码或 prompt。Codex 未操作或观察 AE，未 commit / push。以下保留 F9 当时的审计与 probe 证据；最终阶段状态见 [C2 closure](vela-0.3.9-c2-closure.md)。

工作树开始为 clean；已 fetch `origin/dev`，本地 dev 与其同为 `0332107`。从包含 F1–F8 的用户任务分支创建 F9 分支，未把任务切回不含这些工作的 dev。

## 1. 精确请求与实际调用链

请求原文：`把当前图层的不透明度改成 60%，然后把它重命名为 Vela Stream Test`

| Ownership boundary | 当前代码 / 实测结果 |
| --- | --- |
| Composer → Surface | `velaComposerView.sendHandler` 原样传递 `composer.value`；`velaSurfaceController.send` 原样调用 provider.send |
| Surface → objective | `main.js` 的 provider.send 调用 AgentRuntimeOwner.startObjective；未提供 owner 时才调用 Runtime.sendProviderMessage |
| AgentDriver → Runtime.reason | `velaAgentDriver.js` 保存 objectiveInput.message，reasonInput 原样使用该值；没有 satisfied 过滤或消息改写 |
| Runtime.reason → Controller.send | `velaRuntime.js` 直接调用 providerController.send(input) |
| local classification | `velaProviderRequestBranchPolicy.js` 的 hasMultipleActions + groundBoundedLogicalRequest；结果 `bounded-logical-plan-eligible`，grounded opacity=60、name=`Vela Stream Test` |
| Controller profile | 在 Context capture **之前** classify；finalProfile 保持 `bounded-logical-plan-eligible`；没有 actual==desired 比较 |
| output decision | `velaProviderAdapter.getOutputDecision` → allowedOutputs=`[structured-logical-plan]`，transportMode=`strict-structured`，presentationMode=`structured` |
| request body | `stream:true`；`response_format.type=json_schema`；name=`vela_bounded_logical_plan_response`；strict=true；closed logical envelope |
| prompts | system 明确只返回两步 logicalPlanProposal；assistant turnResponseContract 绑定当轮 requestId/model，要求用当前用户值替换示例值；user 为精确原文 |
| stream → terminal | reasoning/content 分开；HTTP 200，text/event-stream，DONE，finish_reason=stop；Parser + profile check + logical validation + Intent Gate 接受 |
| Controller → Runtime → AgentDriver | Controller `logical-plan-ready`；Runtime 返回经过验证的 declaration；既有 AgentDriver 进入独立的两步 Review |

核心代码：[`RequestBranchPolicy`](../../client/js/vela/velaProviderRequestBranchPolicy.js)、[`Controller`](../../client/js/vela/velaProviderController.js)、[`Adapter`](../../client/js/vela/velaProviderAdapter.js)、[`PromptBuilder`](../../client/js/vela/velaCapabilityPromptBuilder.js)、[`Runtime`](../../client/js/vela/velaRuntime.js)、[`AgentDriver`](../../client/js/vela/velaAgentDriver.js)。

## 2. 首次降级、F5、F8 与 prompt 裁定

**在当前源码及本次生产 Controller/Adapter 测试中，没有发生从该精确请求到普通聊天的降级。因此无法把 AE 现场的“第一次降级”归到某一层。** 用户目前无法提供现场实际消息与 providerDiagnostics；已按其追加要求模拟多轮不同类型对话后返回多步请求，仍未复现。

可以确定的边界是：若 local classifier 给出 TEXT_ONLY，F5 会合法选择 native assistant，且无 json_schema；此时普通拒绝在格式上是可接受的 terminal text。若 finalProfile 为 bounded logical，普通 prose 解析失败，包装成 text envelope 也被 profile mismatch 拒绝，**没有成功 text fallback**。这不能反推历史现场一定是哪一种路径。

F5 与输出格式有关，但没有证据证明它错误选择了精确请求的 profile。相对 `0332107`，当前 RequestBranchPolicy 没有改动；logical prompt 分支也没有改动。TEXT_ONLY 的 system / turn prompt 变为 native 文本指令，与 logical 分支分离。

F8 idempotence 在 Review/Authority 后的 fresh Preflight 执行。源码中 local classification 只接收 message；Controller 不根据 opacity 是否相等降级；模型当前名称不在 Provider projection 中。A–D 控制回归通过。因此排除当前代码中“F8 提前 satisfied 判断导致路由降级”的具体假设。F1–F8 在此 checkout 为一个 checkpoint，不能凭该提交单独重建各阶段的现场缓存状态。

实际 logical prompt 不包含 `Do not create proposals`、`Answer normal conversation`、`Do not describe a proposal` 或 single-step 的 `never return steps`。它明确允许生成 declaration，同时声明它不是 executable plan、Review、binding、Host payload 或 authority。保留后续本地 validation/review/authority/execution/verification 约束；没有 mutually contradictory ordinary-chat constraints。

没有证据要求更改 F6 generation policy、Parser、schema enforcement 或 qualification。实际生产 body hash 在 probe evidence 中保存；reasoning_effort 是诊断 fetch seam 唯一额外字段，production body 与 sent body 均保留。这是当前 body 的直接验证，**不是冻结模型资格认证**，不宣称旧 qualification hash 适用于新 body。

## 3. Deterministic matrix

| Case | 真实 Host 状态由 fixture 模拟 | Provider terminal | Host 模拟写入数 | Verify 数 |
| --- | --- | --- | --- | --- |
| A | 100 / Layer 1 | logical plan，opacity 60 → rename Vela Stream Test | 2 | 2 |
| B | 60 / Layer 1 | 同上，两步不裁剪 | 1（rename） | 2 |
| C | 100 / Vela Stream Test | 同上，两步不裁剪 | 1（opacity） | 2 |
| D | 60 / Vela Stream Test | 同上，两次 Review 后完成 | 0 | 2 |
| E | 单步 opacity 60，当前已为 60 | explicit-edit-eligible → proposal-ready | 按现有控制路径处理 | 保留既有语义 |
| F | 普通知识问题 | text-only → native assistant；无 schema | 0 | 不适用 |

重要限制：当前 `summaryFromProjection` 只传 comp type、selection count/type、opacity，不传 layer name。Controller direct probes 中 A/C 与 B/D 的 grounding 各自相同，不能声称模型看到了 current name。名称 old/target 的独立状态由 production Runtime/AgentDriver/Preflight/Verify 的 Host fixture 回归覆盖；没有扩展 0.3.10 Context。

D 的裁定依据是现有控制链与新增回归：两步仍各自 Review、fresh Preflight、already-satisfied、fresh Verify，objective completed。没有发现或新增“all-satisfied 提前转聊天”的优化。

## 4. 真实 LM Studio probes

LM Studio 初始未启动、未加载模型。通过 CLI 启动本机 1234 server 并加载 `qwen3.5-4b`，context length=16384（约 3.86 GiB）。保持模型与服务可供用户后续手动验收使用。

全部调用经过 production ContextBridge + Controller + Adapter + LocalTransport；Host grounding 是本地 fixture，不涉及 AE。没有硬编码 requestProfile。生产 structured budget 为 2048 thinking / 4096 max tokens，保持不变。仅在诊断 fetch 中增加 `reasoning_effort=none`（OFF）或 `low`（ON），记录原始和实际 body；未修改生产 reasoning 设置。

| Case | OFF 用时 / reasoning chars | ON 用时 / reasoning chars | 结果 |
| --- | --- | --- | --- |
| A | 2559 ms / 0 | 24842 ms / 8837 | 两次均 accepted，精确两步 |
| B | 2127 ms / 0 | 25861 ms / 9287 | 两次均 accepted，精确两步 |
| C | 2040 ms / 0 | 26268 ms / 9002 | 两次均 accepted，精确两步 |
| D | 2120 ms / 0 | 25919 ms / 8439 | 两次均 accepted，精确两步 |

用户追加的多轮序列在**同一个 Controller 实例**中依次执行，每种 reasoning 模式各一组：

1. 请用一句话解释 AE 关键帧。
2. 当前图层的不透明度是多少？
3. 把当前图层的不透明度改成 60%
4. 请简短解释图层重命名的用途。
5. 精确双步骤请求。
6. 谢谢，请简短说明什么是缓动。
7. 再次精确双步骤请求。

两组的 profile 序列均为 `text-only → text-only → explicit-edit-eligible → text-only → bounded-logical-plan-eligible → text-only → bounded-logical-plan-eligible`。14/14 请求成功；第 5、7 轮全部接受准确两步。Controller 每轮构造新的三条消息，不把前轮 transcript、native prompt 或示例带入下一轮。这验证了真实现有会话策略；没有人为把历史消息注入 production body。单步 candidate 在 probe 中不批准、不执行。

合计 **22/22 请求成功，12/12 logical 请求 accepted**；全数 HTTP 200、text/event-stream、DONE、stop；零 ordinary logical fallback。有限次数 probe 不能证明模型永不失败，更不能替代 AE 现场 acceptance。

摘要：[`vela-0.3.9-c1b-f9-probes.json`](vela-0.3.9-c1b-f9-probes.json)。完整本地证据位于 `.tmp/vela-f9/*.json`，包括 productionBody、sentBody、system prompt、turn contract、json_schema、raw SSE、stream state、terminal、Controller diagnostics、events、SHA-256。原始 evidence 未纳入版本管理。

复现命令：

```text
node scripts/diagnostics/probe-vela-multistep-routing.js --run
node scripts/diagnostics/probe-vela-multistep-routing.js --run --conversation
node scripts/diagnostics/probe-vela-multistep-routing.js --summarize
```

## 5. 修改文件与验证

- `scripts/fixtures/vela-routing-harness.js`：生产 Controller/ContextBridge 的本地只读 Host fixture，共享 A–D 与精确原文。
- `scripts/test-vela-multistep-routing.js`：100 assertions，覆盖 A–F、reasoning deltas ON/OFF、实际 body/schema/prompt、错误 prose/text envelope fail closed、同实例多轮 profile 切换。
- `scripts/test-vela-provider-production-e2e.js`：强化 A–D trusted state、existing Agent admission、独立 Review、0/1/2 次写入、每步 Verify；整套 333 assertions PASS。
- `scripts/diagnostics/probe-vela-multistep-routing.js`：真实 streaming probe、多轮 probe、证据摘要生成。
- 本报告及 `vela-0.3.9-c1b-f9-probes.json`。

`node scripts/run-all-tests.js`：**171/171 PASS，0 skipped**（基线 170，新添 1 suite）。完整日志 `.tmp/vela-f9-full-regression.log`。i18n report freshness、project consistency、修改 JS 的 node --check、git diff --check 均通过。生产 client/host、frozen architecture、F6 policy、stream transport、4 MiB ceiling 均未修改。

Architecture amendment：不需要。当前结果符合既有“ordinary text / structured candidate / actual execution”三个边界；未实现 mixed response、Response Parts、cards 或 tool-call channel。

## 6. 用户手动 AE acceptance checklist（C2 已报告 PASS）

以下为已交付并由用户完成的人工验收范围记录，C2 不要求重新执行。历史拒绝没有复现，也没有声称找到并修复其根因。

- [ ] 准备单个选中图层：opacity 100、旧名称。发送精确请求；第一 Review 为 set-opacity-v1/60，批准后第二 Review 为 set-layer-name-v1/Vela Stream Test；批准后两步真实生效、objective completed。
- [ ] opacity 已为 60、旧名称：仍有两步 Review；第一步 no-op 后 Verify 并推进，第二步真实 rename，最终 completed。
- [ ] opacity 100、名称已为 Vela Stream Test：第一步真实修改，第二步 no-op 后 Verify，最终 completed。
- [ ] 建议补测两者已满足：两步各自 Review/Verify、没有 Host write、最终 completed。
- [ ] 上述至少前三组分别用 reasoning OFF、ON 测试；切换不应改变 required output、第二 Review capability 或 objective completion。
- [ ] 在同一面板先进行知识问答、当前值查询、单步编辑，再回到精确双步骤请求；不得退为“请手动修改软件”的 ordinary prose。
- [ ] 如仍失败，保留实际发送原文和只读 `VelaRuntimeStatusView.providerDiagnostics`（尤其 provisionalProfile、finalProfile、responseSchemaName、parsedResponseType、lastTerminalFailureBoundary），并保存 LM Studio 对应请求的 messages/response_format 与 terminal。

若现场 profile=text-only，下一步定位加载的 classifier 与实际消息；若 bounded logical 且无 schema，定位当场 Adapter/request body；若 schema/prompt 正确而响应不合法，定位 Provider enforcement；若 logical-plan-ready 后失败，再定位 Runtime/Driver admission。没有这些现场证据，不能将缓存、语句差异、F5、F8 或模型拒绝中的任何一个写成已证实根因。
