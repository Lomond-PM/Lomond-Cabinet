# Vela 0.3.9-C1b-F6 — Response Hard-Limit Calibration & Reasoning/Completion Budget Policy

日期：2026-09-05。状态：实现、离线回归、真实 LM Studio acceptance 完成；真实 AE 面板复测待进行。未 commit / push。
以上为该阶段历史状态；C2 已记录用户后续手动 real AE acceptance PASS，见 [final closure](vela-0.3.9-c2-closure.md)。

结论：旧 256 KiB ceiling 把逐 token SSE 当作短 terminal JSON 计费，已成为正常 reasoning workload 的阻断点。先测量并将 **stream transport ceiling 校准为 4 MiB**，再比较 reasoning policy。最终 qwen3.5-4b 普通聊天使用 `thinking_budget_tokens=6144, max_tokens=8192`；strict structured 使用 `2048/4096`。保留 LM Studio 的 reasoning on/off 选择，无自动重试。最终 12/12 真实请求成功，0 次 TOO_LARGE；全离线回归 170/170。

## 1–2. 原 ceiling、定义位置与可配置性

- 原 production streaming 与 non-streaming 共用 `262144` bytes（256 KiB）：[`velaProtocol.js:147`](../../client/js/vela/velaProtocol.js#L147) 的冻结 `HARD_LIMITS.maxResponseJsonBytes`。
- Adapter 负责向 LocalTransport 传入 `maxResponseBytes`。当前分支位置：[`velaProviderAdapter.js:914`](../../client/js/vela/velaProviderAdapter.js#L914)。F6 仅把 streaming 分支改为独立 Provider resource policy。
- 当前 streaming production default 是 [`RESOURCE_POLICY.maxStreamResponseBytes`](../../client/js/vela/velaProviderAdapter.js#L152) = `4194304` bytes（4 MiB），对象冻结。无 Settings、localStorage 或模型输出配置入口。
- LocalTransport 接口接收调用方传入的正整数 `maxResponseBytes`；这是可信代码 seam，不是用户自由调大上限的选项。non-streaming、canonical terminal JSON 仍为 256 KiB；`maxMessageBytes=16 KiB`、`maxStringBytes=8 KiB` 未改变。

## 3–4. Exact accounting：所有 channel 共用 raw body ceiling

代码证据：[`velaLocalTransport.js:254–307`](../../client/js/vela/velaLocalTransport.js#L254)。每个请求 `total=0`；每次 `reader.read()` 得到 `Uint8Array` 后：

```js
total += part.value.byteLength;
if (total > input.maxResponseBytes) {
    // cancel reader, release lock, throw PROVIDER_RESPONSE_TOO_LARGE
}
decoded = decoder.decode(part.value, { stream: true });
```

这是 Fetch 暴露的 HTTP **response entity body bytes**，SSE 下即 UTF-8 SSE 字节；不是网络包、HTTP headers、TLS overhead，也不是 JS 字符数或仅组装后正文大小。若浏览器负责 HTTP decompression，计量的是其暴露给 reader 的解压后 body。

| 内容 | 是否计入同一 ceiling | 原因 |
| --- | --- | --- |
| `reasoning_content` | 是 | channel 分流在 byte check 之后 |
| `delta.content`，包括自然语言正文 | 是 | 同一个原始 SSE body |
| strict structured candidate JSON | 是 | JSON 以 content 传输，转义字节同样计入 |
| `data:`、空行、metadata、finish frame、`[DONE]`、SSE comments | 是 | 解码/解析之前累计整块 |
| UTF-8 split sequence、decoder flush | 是；不重复计数 | 原始字节已在前一个/当前 read 中入账；flush 只产出已入账字符 |
| assembler trailing buffer | 是 | buffer 字符来自已入账的原始 chunk |
| DONE 同一 chunk 后的额外字节 | 是 | 整块先检查，随后才识别 DONE |
| DONE 之后尚未读取的 chunk | 否 | protocol-done early-stop 取消 reader，不继续等待 EOF |

精确边界是 `>`，等于上限允许。首次跨越时 `bytesRead` 可比上限略大一个 read chunk，但该超限 chunk 不会解码或发布。`decodedChunkCount` 只计非空的 decode 产出，不能当作 token 数；JSON `sseFrameCount` 排除 DONE/comments。Assembler 按 JS string `.length` 记录 chars（UTF-16 code units），CSV 另列 UTF-8 payload bytes，避免混用。

non-streaming 的同类 byte accumulation 在 [`velaLocalTransport.js:165`](../../client/js/vela/velaLocalTransport.js#L165)，随后还有 decoded JSON UTF-8 budget 检查。Assembler 不减免 reasoning，也未新建独立无上限 buffer 通道。

## 5. 原 production operating envelope

环境：本机 LM Studio，`http://127.0.0.1:1234/v1/chat/completions`，`qwen3.5-4b`（Q6_K，约 3.86 GiB），加载 context length 8192，CUDA backend 2.33.0。开始时模型未加载，使用本地 `lms load qwen3.5-4b --context-length 8192 --yes` 加载。未执行 Host 或资格认证。模型保持加载，便于下一次 AE smoke。

所有推理请求都经过 production Adapter + LocalTransport。初次测量保留旧 256 KiB，并在 fetch 的独立 `Response.clone()` 旁路收集完整原始 SSE（诊断 cap 4 MiB / 120 s）；旁路输出绝不进入 Runtime、Parser admission 或 execution。这样无需先调高 production 就能观测正常完成的总大小。下面 DONE/finish、完整 chars/frames/bytes 属于完整 observer；原 production terminal 保留真实失败。完整 observer 与 production 各自的 bytes/chunks/frames 均保存在 CSV，不能把旁路 DONE 当作旧 production 成功。

| Case | R deltas / chars | C deltas / chars | 完整 SSE bytes | 占旧 ceiling | 完整 frames | DONE / finish | 原 production |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| short on | 893 / 3488 | 61 / 123 | 243611 | 92.93% | 955 | yes / stop | text |
| medium on | 1322 / 5409 | 573 / 1028 | 478399 | 182.49% | 1896 | yes / stop | TOO_LARGE |
| long on | 5574 / 13045 | 299 / 491 | 1491362 | 568.91% | 5874 | yes / stop | TOO_LARGE |
| proposal on | 4775 / 20371 | 145 / 336 | 1250144 | 476.89% | 4921 | yes / stop | TOO_LARGE |
| two-step logical on | 5513 / 24204 | 192 / 480 | 1450030 | 553.14% | 5706 | yes / stop | TOO_LARGE |
| medium off (`none`) | 0 / 0 | 581 / 1051 | 143320 | 54.67% | 582 | yes / stop | text |
| known overflow prompt on | 1188 / 4565 | 35 / 73 | 311454 | 118.81% | 1224 | yes / stop | TOO_LARGE |
| medium inherited default | 1113 / 4348 | 687 / 1263 | 451207 | 172.12% | 1801 | yes / stop | TOO_LARGE |

短/中/长提示分别为简述 AE 关键帧、解释位置/线性插值/缓动并举文字滑入例子、约 600 字解释六个动画概念并举例和列三个错误；完整提示保存在诊断脚本。proposal 为 opacity 47%；logical 为 opacity 47% 后 rename Hero。

初次完整正常区间 **143320–1491362 bytes**，reasoning-on 为 **243611–1491362**。在提高 ceiling 后通过同一 production 路径回放这 8 个完整 SSE，8/8 canonical 成功；proposal/plan 仍走严格 schema/Parser。原失败不是只截了异常无限流。

## 6. 用户 1024 budget 回归的精确复现

同一个 medium prompt，实际发送 `thinking_budget_tokens=1024, max_tokens=4096`，继承 reasoning enabled：

- reasoning 1023 个非空 deltas，4207 chars；正文 820 deltas，1498 chars。
- 完整 SSE **462549 bytes**；1844 JSON frames，DONE，`finish_reason=stop`。
- 首个正文 frame 结束时累计 **261361 bytes**，已用旧 ceiling 的 99.70%；旧上限只能容纳 **4 个正文 frames**，后续继续正常输出就越界。
- 新 ceiling 下成功，仅占 11.03%。这是“reasoning → 正文已经开始 → 旧 transport ceiling 截断”的直接字节证据，不能用继续降低 reasoning 来掩盖。

旧基线各失败请求 production 第一次越界 `bytesRead` 为 262176、262331、262307、262163、262391、262155；完整 response 大小与这些提前停止计数在 CSV 分列。

## 7–10. 判定与 calibration

确认旧 ceiling 过低：8 个原样本中 6 个 TOO_LARGE；短回答已用 92.93%；proposal 与 logical 只要保留 reasoning 就分别需要 1.25 MB / 1.45 MB。medium 的 reasoning/content 实际 UTF-8 payload 仅 5529 + 2554 = 8083 bytes，而 SSE 共 478399 bytes，metadata/framing 占主导。这与将旧短 terminal JSON 的 256 KiB 限额直接用于逐 token SSE 的实现相符；它不是正文长度预算。

**只调整 stream transport：262144 → 4194304 bytes。** 初次观测最大 1491362，4 MiB 提供 **2.81 倍容量 / 约 64.4% 空余**。最终 acceptance 新最大 1637100，仍有 **2.56 倍容量 / 约 61.0% 空余**。选择整数 MiB 的有限 ceiling，使观测正常上沿落在约三分之一至四成，而非继续贴边运行；不是无依据放大或取消 accounting。

这个 ceiling 仍在解析前保护整个 body，reasoning 未豁免；超限取消 reader 并失败。canonical/text budgets、timeout/cancel、strict Parser 继续独立保护。4 MiB 是 body admission 上限，不等于浏览器总 heap 上限；字符串和 JSON 对象存在额外内存开销，极大的单一 fetch chunk 也可能先由底层分配。没有据此声称全部 UI heap 被限定为 4 MiB。有限边界 + 120 s 当前默认 timeout 能拦截持续异常输出/停滞，相关 synthetic tests 通过。

## 11–12. 原 reasoning 配置与真实支持的选项

F5 production 未显式发送 `reasoning_effort`、`thinking_budget_tokens`、`max_tokens`；使用 LM Studio 当前实例/模型配置。本次新加载实例 model info 的 reasoning options 为 on/off、default on；API separateReasoningContent 开启。不能把用户此前手动设置的 1024 推定为卸载重载后仍持久有效，故本次通过请求显式复现 1024。

能力证据来自本机 `/api/v1/models`、真实 HTTP 成功/400、LM Studio server log 和只读 bundled server 实现：

- 模型“on/off”与 OpenAI-compatible HTTP `reasoning_effort` 枚举不是同一层。实际 `on` / `off` 请求被 400 拒绝，错误列出 `none, minimal, low, medium, high, xhigh`。未把未测枚举当作已验证配置。
- `none` 实测关闭 reasoning。`low/medium/high` 请求成功，但 server log 明确提示该模型不支持 strength，fallback 到模型 on；因此不能把三次随机输出差异当成高/中/低强度效果。
- `/v1/chat/completions` 实际字段是 **`thinking_budget_tokens`**，bundled server 将其映射到 `reasoning.budgetTokens`。非负整数或 null；负数实测 400。未把 SDK/另一 REST 路径的 `reasoning_budget` 错发到该 endpoint。
- 原始证据：当时本机 `.tmp/vela-f6/model-info.json`、2026-09-05 LM Studio server log，以及 LM Studio 安装内 bundled main/index.js 的只读字段检索。日志与安装文件属于原工作站的 local-only provenance，不要求其他 checkout 存在相同绝对路径。未修改 LM Studio settings 或该实现。

同一 medium prompt，在 transport 已校准后比较：

| effort / reasoning budget / total | R deltas / chars | C deltas / chars | SSE bytes | DONE / finish | 结果 |
| --- | ---: | ---: | ---: | --- | --- |
| none / inherited / inherited | 0 / 0 | 591 / 1043 | 143384 | yes / stop | text |
| low (fallback on) / inherited / inherited | 1565 / 5661 | 403 / 746 | 499224 | yes / stop | text |
| medium (fallback on) / inherited / inherited | 1381 / 5861 | 851 / 1533 | 561618 | yes / stop | text |
| high (fallback on) / inherited / inherited | 1316 / 5461 | 615 / 1094 | 483252 | yes / stop | text |
| inherited on / 1024 / 4096 | 1023 / 4207 | 820 / 1498 | 462549 | yes / stop | text |
| inherited on / 2048 / 4096 | 1330 / 5349 | 455 / 780 | 449854 | yes / stop | text |
| inherited on / 1024 / 128 | 128 / 565 | 0 / 0 | 32837 | yes / length | RESPONSE_INVALID |

medium 配置完成后正文有实质解释，未见明显空答或截断；这不是回答事实准确率评测。另有 6 个参数拒绝探针（`policy-*`）完整保存在 CSV，不把 HTTP 400 与正常 workload overflow 混合统计。

## 13. 最终 Provider-owned policy；被淘汰的配置

[`getGenerationPolicy`](../../client/js/vela/velaProviderAdapter.js#L155) 仅对校准过的精确 model id `qwen3.5-4b` 返回冻结配置：

| Profile | thinking_budget_tokens | max_tokens（total output） |
| --- | ---: | ---: |
| TEXT_ONLY / native assistant | 6144 | 8192 |
| strict structured profiles | 2048 | 4096 |
| 其他 model id，包括未知 alias/non-reasoning model | 不发送 | 不发送 |

字段仅由 Adapter 构造请求。Runtime / Presentation 不含模型专用参数。**不发送 reasoning_effort**，保留 operator 的 enabled/disabled；Provider 显式预算会覆盖同名模型实例默认预算，因此不再把手动 LM Studio 1024 当作 Vela production 普通聊天的实际 budget。只在诊断覆盖请求里发 1024。

先试过统一 `2048/4096`，短/中各 3/3、proposal/plan 各 3/3 成功，但长普通回答 **0/3**：reasoning 均约 2047 deltas，content 2045–2046 deltas，4130/4448/4022 chars，输出混入反复起草/字数自检，以 `length` 结束；SSE 1021273–1021808 bytes，仅占新 ceiling 24.36%，已经不是 transport overflow。因此淘汰这个 ordinary default，没有用低 reasoning budget 换表面成功，也没有把失败样本删掉。

普通聊天改用 6144：略高于未受限基线长解释的 5574 reasoning deltas 所反映的 token 量级，并增加 total 到 8192。独立 capacity probe 的 long 在 4557 reasoning deltas 后自然完成，正文 548 chars，1242364 bytes；随后最终两次 long 都完成，最大 6129 reasoning deltas。delta 数受 token/chunk 合并影响，不能视为 tokenizer 精确计数；本次绝大多数 LM Studio token 单独成 frame，数值用于判断量级而非建立跨模型 token 等式。

structured 保留 2048/4096：在现有 bounded schema 下 3+2 次每类均有完整 candidate，最终仅需 93–170 content deltas，最初三轮最高 194。两种 profile 分配基于现有 output decision，未引入复杂度分类、Prompt 修改或新 Agent branch。简单聊天可自然早停，本次短回答 612/820 reasoning deltas；仍可能过度思考（两句解释也达 1949），F6 不承诺 optimal latency 或最少 reasoning。

## 14. Reasoning 与 final capacity 的关系

区分三个单位与职责：

1. `thinking_budget_tokens`：模型 reasoning 的 token 预算，实际强制结束行为由 LM Studio/模型处理。
2. `max_tokens`：**reasoning + final 共用 total output budget**。1024/128 探针只生成 128 reasoning deltas、无正文、finish length，证明它不是只留给 final 的独立 quota。
3. 4 MiB transport ceiling：reasoning/content/SSE 的 body byte 安全阀，不负责建议模型回答长度。

6144→8192 和 2048→4096 都留下名义 2048 token 的 final 差额；这不是 API 提供的独立 final reservation，也不能保证上下文接近容量时仍有相同余量。8192 loaded context 与 output cap 同时约束实际生成；本次为低输入单轮 probe。跨 turn 长上下文不在本阶段。

当前 API 未验证独立 final-only budget，未虚构该能力。强制 reasoning 截断后模型可能继续在 content 起草，统一 2048 的失败就是反例。

为保留真实终态，F6 还修正 Adapter 在 stream 重建 wrapper 时覆盖 `finish_reason=stop` 的行为：[`velaProviderAdapter.js:989`](../../client/js/vela/velaProviderAdapter.js#L989) 传递 assembler 的实际 finish reason，[`line 822`](../../client/js/vela/velaProviderAdapter.js#L822) 拒绝已报告的非 stop finish。length 即使有非空正文和 DONE 也失败，不将 partial commit 为 success。未改 Protocol/Parser；既有缺失 finish metadata 的兼容行为未扩大。

## 15–16. 最终 production 配置真实 repeat acceptance

以下 12 次来自同一 final batch。短、中、长、proposal、two-step logical 各重复两次，另测 medium none 和已知 overflow 的两句关键帧提示。所有生产 transport `bytesRead` 与完整 observer bytes 一致；表中 chunks 是 production `decodedChunkCount`。全部收到 DONE、`finish_reason=stop`，全部 authoritative success。

| Case | R deltas / chars | C deltas / chars | Transport bytes | 占 4 MiB | Chunks / frames | Terminal |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| short 1 | 820 / 3124 | 52 / 95 | 222750 | 5.31% | 873 / 873 | text |
| short 2 | 612 / 2435 | 47 / 90 | 168294 | 4.01% | 660 / 660 | text |
| medium 1 | 1116 / 4597 | 635 / 1140 | 437481 | 10.43% | 1752 / 1752 | text |
| medium 2 | 1742 / 6419 | 393 / 725 | 541655 | 12.91% | 2136 / 2136 | text |
| long 1 | 3376 / 10115 | 335 / 554 | 941175 | 22.44% | 3712 / 3712 | text |
| long 2 | 6129 / 13806 | 317 / 505 | 1637100 | 39.03% | 6447 / 6447 | text |
| proposal 1 | 2047 / 7988 | 93 / 258 | 545162 | 13.00% | 2141 / 2141 | localProposal |
| proposal 2 | 2047 / 8613 | 146 / 336 | 556335 | 13.26% | 2194 / 2194 | localProposal |
| logical 1 | 2047 / 9487 | 110 / 325 | 550629 | 13.13% | 2158 / 2158 | logicalPlanProposal |
| logical 2 | 2047 / 9596 | 170 / 459 | 565314 | 13.48% | 2218 / 2218 | logicalPlanProposal |
| medium none | 0 / 0 | 675 / 1191 | 165775 | 3.95% | 676 / 676 | text |
| overflow prompt on | 1949 / 6857 | 48 / 91 | 508461 | 12.12% | 1998 / 1998 | text |

最终普通 workload **0/12 TOO_LARGE，0/12 其他失败**；reasoning enabled 为 11/11，其中五类重复核心集合为 10/10。structured 连同同预算初始三轮为 proposal 5/5、logical 5/5。样本支持“旧 ceiling 不再频繁截断这些正常请求”，不等于任意 prompt/模型版本/长上下文都不会失败。

人工检查两次 long：554/505 字完整解释，无统一 2048 配置中的重复草稿或截断。但示例仍有概念/措辞不严谨，例如“画外进入”写成画内起点、Ease In 与插值/父子层级解释不够准确。F6 不据此改变模型资格或冻结 activation policy；完成可靠性成功与内容正确性是两回事。

## 17–18. Focused tests 与 full regression

新增 [`scripts/test-vela-response-budget.js`](../../scripts/test-vela-response-budget.js)，**38 assertions PASS**，实际组合 Adapter + LocalTransport，覆盖：

- 旧 256 KiB 限制真实生效；reasoning+content+metadata+framing 共同计费；校准后同一 >旧 cap 请求成功。
- 精确 4 MiB 成功、4 MiB+1 失败（含 SSE comment padding）；text/proposal/logical 同样受保护。
- partial content 后大量 reasoning synthetic runaway 超限：authoritative error、没有 stream-completed；三种 profile 均不会 partial success/admission，随后同 Provider 新请求成功。
- malformed structured 仍失败，无 fallback；长度预算耗尽的非空 partial prose，在 streaming/non-streaming 都拒绝。
- cancel、timeout 先发生后收到 late oversized chunk，原终态不被覆盖；post-DONE early-stop 不读取晚到 reader error。
- profile 参数、operator on/off 不被重写、non-reasoning provider 不收到 qwen-specific 字段。

原有 stream lifecycle、Runtime、Surface、Transcript、strict-parser 等 suite 一同回归，覆盖 stale/generation/terminal publication 与 presentation 分支。没有新增自动 fallback 或 partial execution 通道。真实极端无限/超 4 MiB 通过受控 synthetic 注入验证，不要求模型无限生成来冒充确定性测试。

`node scripts/run-all-tests.js`：**170/170 runnable suites PASS，0 skipped**（F5 为 169/169；本次新增 1 suite）。日志 `.tmp/vela-f6/offline.txt`。未触发正式模型 qualification 采样。F6 没有 loader/global/cache 改动，因此不重复 forward/reverse/forward order 试验。

收尾检查：Adapter、focused test、诊断脚本的 `node --check` 均通过；`report-i18n-usage.js --check`、`check-project-consistency.js`、`git diff --check` 通过。诊断脚本无 `--run` 时只输出用法并以 2 退出，不发送请求。CSV 共 50 条，final 12 条均无错误且 production/observer bytes 一致。

## 19. Architecture amendment

**NONE**。现有 frozen architecture 未规定固定 transport byte 数或 qwen reasoning 值；这是 Provider resource/safety policy calibration。

F6 production 改动仅在 Adapter：有限 stream ceiling、模型/profile 预算 seam、保留并拒绝已知 truncated finish。native TEXT_ONLY 保持自然语言 streaming；strict response schema、Protocol、Parser、Prompt、AgentDriver、Authority、Review、Confirmation、Execution、Host 均未因 F6 改动。工作区已有 F5 及之前未提交改动；不能将整个 git diff 误当作 F6。

## 20. Deferred

- Cross-turn reasoning presentation/history retention → 后续 conversation/history architecture。新 objective `begin()` 清除上一 turn raw reasoning 的现状不变。
- raw reasoning 未来可作为 UI history，但默认不得进入 LLM context，不是 Observation，不提供 Authority / execution justification。
- reasoning UI 截断、摘要、虚拟化、持久化 deferred。本次未取得独立 AE UI 性能 blocker 证据；没有用 presentation 截断控制 Provider。未来若做，必须明确省略状态且不影响 final/Provider 终态。
- Context Architecture / 0.3.10、Response Parts、mixed response、cards、retry policy、长上下文容量管理不在 F6。
- 任意 prompt 的模型质量、复杂度分配、低延迟策略、其他 model id/backend 的预算适配需独立证据；本次不扩展资格和启用权限。

## 21. 下一次 real AE C1b 复测

1. Reload CEP panel，确认 junction 指向 workspace 和新 Adapter 生效。用本报告短、中、长提示，reasoning on/off 各观察 native final streaming、DONE 后一次成功提交；不能只测“你好”。
2. 专项复测原 1024 症状：生产 ordinary 实际发 6144/8192，应检查 request body，避免把 LM Studio GUI 显示的默认 1024 误当实际值。若需严格复现 1024 请求，使用诊断脚本 `--policy` 的显式 override；其 462549-byte 样本应在新 cap 下完整完成。
3. reasoning-on proposal 与 two-step logical，各至少两次：strict candidate 完整后才可进入原有 Review/Confirmation；partial、malformed、length、overflow 均不得 admission/execution。
4. 使用受控 transport fixture 注入 >4 MiB，覆盖已流出 partial final 后失败、错误展示、partial 不作为 committed assistant、下一条正常请求成功；不要靠手动把 production cap 调回旧值验收正常请求。
5. cancel、timeout、panel reload/close、late callbacks、DONE 后连接未 EOF：原 lifecycle 不回退、不重复 terminal、不出现旧 turn 复活。
6. 长 reasoning 的展开/收起、final 开始时布局、底部跟随/手动滚动锚点保持；报告性能问题再决定独立 UI 工作。新 turn 旧 reasoning 清除仍是已知 deferred 行为。

## Evidence 与复现入口

- [`vela-0.3.9-c1b-f6-measurements.csv`](vela-0.3.9-c1b-f6-measurements.csv)：50 个真实请求（含参数拒绝、旧 cap 失败、被淘汰配置），每次 reasoning/content deltas、chars、UTF-8、production bytesRead/decodedChunkCount/frame、完整 observer 值、DONE、finish、ceiling/utilization、terminal、请求预算、evidence filename、原始 SSE SHA-256。`rejected-uniform-2048` 显式标记失败中间方案；`final-accepted` 才是最终配置。另 8 次 replay 是同一响应的离线重放，不算新真实请求。
- 原始本地证据 `.tmp/vela-f6/*.json` 保留每次请求和原始 SSE，未纳入产品/历史存储；`replay.json` 保留八次重放结果。
- 可复现诊断：`node scripts/diagnostics/probe-vela-response-budget.js --run`，发送 12 次最终 acceptance；加 `--policy` 比较七个 medium 配置（包含预期 length 失败）。需要本地模型加载。脚本使用 production Adapter/Transport，request override 与 productionBody 分开保存，单请求 120 s、observer 4 MiB；失败 acceptance 返回非零。不默认运行、不执行 Host、不建立 telemetry subsystem。
- 诊断脚本是此次临时采样脚本的可维护版本；保留相同 prompts、生产路径和有界 observer，历史 CSV 不被重新运行覆盖。随机采样/环境变化会改变精确数字。
