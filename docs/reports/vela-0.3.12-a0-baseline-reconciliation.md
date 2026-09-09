# Vela 0.3.12-A0 — Baseline Reconciliation & Production Revalidation Plan

日期：2026-09-09。状态：**A0 COMPLETE（仅文档与复核计划）；生产修复尚未开始**。

## 基线与资料完整性

| 核对项 | 本轮结果 |
| --- | --- |
| 当前分支 | `plan/vela-baseline-reconciliation-a0-0.3.12`，沿用已有任务分支 |
| HEAD | `b93d0d8e30b4bc5f3dfc1bed7476ca112cb7f89a` |
| 本地 origin/dev | 同 HEAD |
| 实时远端 dev | `git ls-remote origin refs/heads/dev` 返回同 HEAD |
| 参考远程审计基线 | 用户提供 `b93d0d8`，与本地一致；完整 R1 规划包及继承审计内容已补齐、导入并核验，首次未取得的过程见下文 |
| 初始工作树 | `git status -sb` 干净；无未跟踪文件；`git diff b93d0d8 HEAD --stat` 为空 |
| 分支操作 | 无 checkout、reset、覆盖、pull、merge；远端查询未改本地 ref，当前已与远端一致 |
| 功能与包 | 0.3.11 COMPLETE / SEALED；包 metadata 仍为 0.3.6，与功能排期分开 |

已读取当前 AGENTS、VELA_ROADMAP、PROJECT_STATE、HANDOFF、README、KNOWN_ISSUES，以及 [0.3.11 综合封存报告](vela-0.3.11-integrated-acceptance.md) 的基线、综合用例、结论和 M 节限制。A1–A5 分报告路径已确认，继承结论来自综合报告/入口；未声称重新全面审计各切片。历史报告中的旧 next 是当时封存记录，不改写其结论；当前导航由 roadmap 取代。

首轮仓库（含隐藏/忽略文件）检索未找到包；随后用户提供实际路径：`C:\Users\Administrator\Downloads\Lomond_Cabinet_0.3_Reconstruction_Plan_R1(1)`。已先读包根 README，再读指导书、完整路线、54项总账、三份原审计/coverage、对话/路线摘要、manifest与压缩包README/结果索引；压缩包只读，未执行其中探针。包根 README 仅使用说明，没有替换项目 README。

R1 修订为 **R1-2026-09-09**，基线与当前 HEAD 一致。manifest 的11个条目（含三个zip）字节数与SHA-256全部匹配；导入后再次核对。JSON导出按原字节导入；指导书仅去除Markdown行末空格，正文与条目原文保留，原审计/coverage/证据包按原字节归档；路线经过差异审阅后采用完整R1版本，并只修正本地A0/current状态及链接。来源见 [manifest](audit-baseline-0.3.11/manifest.json)、[指导书](../design/vela-0.3-reconstruction-guidance.md)、[54项导出](vela-0.3.11-consolidated-register.json)。

**54项 = 29个原审计ID（A01–A12、AP-01–08、UX-01–09）+12个G+7个V+6个COV；0.3.12主办25项。不是54个已确认漏洞。** R1路线完整采用0.3.12–0.3.26参考排程和CC尾部顺延规则；新八Gate明示为新制定，不是恢复历史原八条，不替代冻结架构13 invariants。

完整规划包没有缺件；包自身说明的G-02独立旧探针、生产组合/真实AE证据缺口仍未消失。历史报告与R1指导书/JSON中的交付时态是来源快照，不作为当前事实来源；当前排期只由VELA_ROADMAP持有。导出总账保留原始OPEN状态，不把A0完成批量改成生产条目CLOSED；G-01入口修订和G-09新Gate导入的本轮进展在此报告记录，后续关闭需按R1治理同步规范与导出。

## 文档变更与事实归属

| 文件 | 原有冲突及处理 |
| --- | --- |
| [AGENTS](../../AGENTS.md) | 替换当前 0.3.9 完成/下一步 0.3.10；改为最新封存 0.3.11、A0 COMPLETE（仅文档与复核计划）；生产修复尚未开始；保留冻结规则 |
| [README](../../README.md) | 修正顶部与后部两处旧 current/next 导航 |
| [VELA_ROADMAP](../VELA_ROADMAP.md) | 唯一当前排期；经基线差异审阅，采用完整 R1 的0.3.12–0.3.26排程、25项当前分配、新Gate和CC顺延；旧历史细节仍由封存报告/PROJECT_STATE持有 |
| [PROJECT_STATE](../PROJECT_STATE.md) | 重写混杂的里程碑段，区分最新 182/182 与历史 177/179/180/181；纠正“未实现多会话”及“0.3.11 尚须决定”的当前措辞；历史验收注明时间归属 |
| [HANDOFF](../HANDOFF.md) | 纠正两处旧 next 与 A3 结果的当前性，指向 A0 报告与 canonical roadmap |
| 本报告与 [源码覆盖附件](vela-0.3.12-a0-source-coverage.md) | 放在既有 docs/reports，作为阶段证据快照，不新增平行长期排期或问题事实源 |

已导入R1指导书、总账与全部继承证据；未将包根README或生产文件整体覆盖到仓库。PROJECT_STATE 只记录已实现事实与本轮未实施状态。0.3.11 综合报告及历史切片、冻结 Agent architecture、KNOWN_ISSUES、包 metadata 均保持原文。

证据目录增加一份局部 `.gitignore`，只允许三个已校验的 `*-evidence.zip` 被 Git 收录，避免根目录既有 `*.zip` 规则静默漏掉原证据；未改根规则、未执行 git add。该文件不属于继承 manifest 的11项，不修改任何原始归档。

## 源码覆盖状态

完整 `git ls-files -z` 基线为 **388 文件**：生产源码 116，测试/诊断/工具/fixture 212，文档/证据 51，配置/入口/发布元数据 9。附件逐文件保留基线 Git blob、分类及审阅状态，涵盖 client、host、helpers，未以 Vela 子目录代替全仓库。

“已审阅”仅用于入口/封存文档状态核对；生产代码只做相关调用点/条件分支的局部静态核对；其余仅列入清单、尚待审阅。**生产源码深度审计完成数为 0**。第三方兼容桥、外部运行时、已知生成 i18n 报告及来源待核 fixture 均在附件说明。清单不是漏洞扫描结果或全源码审计证明。

## 证据等级与逐项导入规则

下文源码短名按唯一受控文件解析：Vela模块位于 `client/js/vela/`，Appearance/DesignTuning分别位于对应子目录，普通工具位于 `host/tools/`；完整路径、blob与已读范围在源码清单。zip内路径与probe ID用于离线定位；引用原档，不将压缩包中的脚本作为新生产测试加载。

后续每个原始条目需记录：原 ID/原文、R1 所属阶段、证据文件及锚点/哈希、基线与环境、实际生产调用链、复现条件、建议边界、离线验证、真实 AE 验收、关闭标准、未决项。允许多个原 ID 对应一个切片，不能通过合并切片丢失原 ID。

证据必须分别标注：摘录探针（可能脱离生产组合）、实际生产模块测试（可用 mock，但必须说明宿主边界）、真实 AE/CEP 证据（注明实际入口与原始记录）、未验证推断（不能升级为确认缺陷）。静态定位只证明符号/路径存在。历史 PASS 不证明新的审计假设已验证；手工转录不能升级为原始 trace。

## 问题到切片的映射（25/25）

按 R1 第7节采用 B1/B2 Host、C1/C2 Session/Verify、D Provider、E 用户资产/退出、F 最小 Review，A0/G 承接治理和跨切片覆盖。以下逐项保留原 ID；不是新总账，规范定义/状态仍见指导书与其 JSON 导出。本轮只有静态生产路径核对与测试计划，未执行这些反例、未确认实机漏洞、未关闭生产问题。已有测试文件仅为核实存在的候选起点，未宣称它们已覆盖反例。

### A01 — 公共 Host 元数据解析进入 eval（B1）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/core-results.json / HOST-METADATA-EVAL；reproduce-core.js。等级：原报告 E1：隔离 Node/VM 摘录；真实宿主条件未验证。
- 当前生产定位（b93d0d8）：host/index.jsx:262–266 → adComponentKit.jsx:742–799；adComponentKit.tool.jsx:16–18 stateAction → getState/parseMetadata。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：缺少原生 JSON.parse 时公共解析器把工程 comment 元数据作为 JavaScript 表达式执行；元数据字段校验在执行之后，状态读取也可触及入口。 限定：条件是无原生 JSON.parse 且元数据入口被调用；不能写成打开任意工程就执行代码。
- 建议边界与关闭标准：换为不执行代码的严格解析；原生/无原生 JSON、合法/坏元数据与状态轮询负向回归；确认无效输入无副作用。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 public Host 模块在有/无 JSON.parse 的隔离 VM 中加载，经注册 stateAction 输入合法、坏 JSON、非 JSON 表达式与普通 comment；表达式仅改隔离内存标记，断言拒绝/零副作用与原结果信封。 候选现有入口：scripts/test-host-registry-transaction.js。
- 真实 AE/CEP 要求：确认实际 AE JSON 可用性和已加载 Host；通过普通工具状态查询验证无效元数据拒绝及合法旧工程兼容；危险输入只用可控无外部副作用夹具。 后续回验：0.3.12；0.3.25。

### A02 — 一次性授权最终 Verify 丢失原提交目标关联（C2）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/host-seam-results.json / VERIFY-UNBOUND-CURRENT-SELECTION；reproduce-host-seams.js。等级：原报告 E2：真实跨文件路径＋受控模型；未重放 AE 切层竞态。
- 当前生产定位（b93d0d8）：velaAgentDriver.js:157–165 verifyAction 完成判据 → velaRuntime.js:829–836 current-selection → velaContextBridge.js:1752–1763；对照 Runtime:352 verifyCommittedAction 与 Owner:225。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：一次性授权执行后的 fresh Verify 读取当前选择，只比较数值；显式 Review 使用 committed-target 路径。Owner 承认 current-selection 的关联 unproven，Driver 仍可据 fresh/matches 完成。 限定：不是已证明写错目标；提交时仍有 digest 验证。不得混同已接受的发送至 Review 前重新绑定。
- 建议边界与关闭标准：两条最终验证都须证明实际提交目标关联；换同值/不同值层、目标变化或删除、切合成、迟到 Verify 均有生产与实机证据。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 Driver/Runtime/Bridge/Owner 组合，真实代码路径＋受控 Host transport；提交 A 后选同值 B/异值 B、A 改值/删除、切 comp、迟到 Verify；不能用 fresh/matches 代替已提交目标关联。 候选现有入口：scripts/test-vela-agent-production-lifecycle.js。
- 真实 AE/CEP 要求：一次性授权与显式 Review 分别记录提交目标独立读数、切层、Verify 与终态；填补 A5 one-shot targetRelation 缺口；不混同 request→Review retargeting。 后续回验：0.3.12；0.3.17；0.3.25。

### A03 — already-satisfied 被记录为 committed:true（C2）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/host-seam-results.json / NOOP-COMMIT-FACT-PROMOTION；reproduce-host-seams.js。等级：原报告 E2：交接模型；完整 no-op 链未重跑。
- 当前生产定位（b93d0d8）：velaRuntime.js:477–485 satisfied/committed → verification-required；velaAgentDriver.js:245–253 统一 committed:true；Preflight:760 no-op 对照。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：真实提交和已满足状态都被约化为 verification-required；Driver 随后统一记录 committed:true，使 Session 与 trajectory 可能矛盾。 限定：no-op 仍需 fresh Verify；不通过强制写入或跳过验证统一记录。
- 建议边界与关闭标准：明确 mutation disposition 与 committed 三态；比较 mutation/no-op/失败/不确定时的 Session、trajectory、Host 次数、Undo 和 Verify。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：实际 continuation→Driver→Session/trajectory；mutation/no-op/未提交失败/提交不确定/Verify失败，逐一断言 tri-state、Host 次数、验证来源与 terminal。 候选现有入口：scripts/test-vela-verified-trajectory.js。
- 真实 AE/CEP 要求：真实 mutation/no-op 两条路径分别记录 Session、trajectory、Host 与 Undo；no-op 零写入但 fresh Verify 不可省略。 后续回验：0.3.12；0.3.17。

### A04 — Session 重入、订阅异常和可变 payload 破坏事件语义（C1）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/core-results.json / SESSION-REENTRANCY、SESSION-OBSERVER-ERROR、SESSION-ACCESSOR、SESSION-UNSUBSCRIBE；reproduce-core.js。等级：原报告 E1：4 类摘录复现；非完整模块验收。
- 当前生产定位（b93d0d8）：client/js/vela/velaSessionRuntime.js:56–68 deepFreeze；:236 payload；:241–305 appendInternal/publishAuthorityInternal/subscribe。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：append 使用日志末项而非本次 event 通知/返回；重入会投递另一个事件，异常阻断后续订阅，退订使遍历跳项，getter 使冻结记录仍可变化。 限定：本地 getter 不是模型 JSON 注入；不得因此宣布 Authority event 可伪造。
- 建议边界与关闭标准：稳定事件收据身份、确定重入顺序、订阅快照及观察者异常隔离、严格 data-only 快照；push 与 replay 对照。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 Session 模块验证 outer receipt、nested append 顺序、抛错隔离、新增/退订订阅者、getter/data-only、close/dispose 与 Authority deferred publication；对照 push/replay。 候选现有入口：scripts/test-vela-session-runtime.js。
- 真实 AE/CEP 要求：真实任务 Session 顺序/事实与 UI 一致；实机不注入任意 Authority；重入/故障覆盖明确保留为离线生产模块证据。 后续回验：0.3.12；0.3.16；0.3.23。

### A05 — 撤回实验 acknowledgement 后仍启用（D）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/stream-ui-results.json / UI-ACK-WITHDRAWAL-READY、UI-ACK-WITHDRAWAL-CHECKING；reproduce-stream-ui.js。等级：原报告 E1：ready 与 checking 两种摘录复现。
- 当前生产定位（b93d0d8）：main.js:2394 acknowledgement change → SurfaceController.js:220–258 configure/enable；changed 仅 endpoint/model，完成仅 generation/state 检查。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：配置变更仅检查 endpoint/model；撤回确认既不失效已启用状态，也不作废同配置在途 readiness。 限定：Provider 启用确认不等于 mutation grant；不得将二者合并为一个布尔权限。
- 建议边界与关闭标准：本方案将“当前 acknowledgement=true”定为实验启用条件；撤回后禁止新请求、作废旧 readiness，并按 A06 的已存在任务控制语义收束。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 SurfaceController＋实际 main 配置入口；ready/checking 撤回、迟到 ready、重新确认；面板级资格与 mutation grant 分离。 候选现有入口：scripts/test-vela-surface-controller.js。
- 真实 AE/CEP 要求：真实 checkbox 撤回即禁新请求，旧 readiness 不重新启用；活动任务按 A06 收束并显示，不清授权历史冒充回滚。 后续回验：0.3.12；0.3.13。

### A06 — 全局停用只操作当前视图，后台任务可能失去入口（D）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/host-seam-results.json / GLOBAL-DISABLE-SELECTED-ONLY；reproduce-host-seams.js。等级：原报告 E2：分派/投影模型；完整多会话 AE 场景未复现。
- 当前生产定位（b93d0d8）：main.js:2396 selected Surface disable；:4350 重绑 enable intent；SurfaceController.js:261–270 cancel 当前 provider、:178 disabled→send；ConversationComposition.js:31 pending holder。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：全局启用意愿被关闭，但取消仅到达 selected Surface；后台 Review 可以继续占 holder，返回时 disabled 又把操作投影成 send。 限定：停用不是强制中断不可中断 Host 写入；不得提前清 holder、丢迟到结果或暗示回滚。
- 建议边界与关闭标准：面板级 Provider 启用由面板级 owner 决议；停用禁入新请求，并向真实 active owner 发出停止后续工作的命令，保留取消/拒绝与收束反馈。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：实际 Composition/Ownership/Surface 与 main wiring 组合；C1 streaming/Review/held Verify/cancelling 时 C2 停用/改模型/撤回；命令到 active owner、holder 等待安全结算、旧结果不串会话。 候选现有入口：scripts/test-vela-conversation-composition.js。
- 真实 AE/CEP 要求：实际 C1 后台/C2 当前的四态矩阵，返回 C1 仍可取消/拒绝并读收束结果；证据需捕获非零 held 区间，禁止直接清 holder。 后续回验：0.3.12；0.3.17。

### A07 — SSE 终止原因可逆，终止后仍接收内容（D）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/stream-ui-results.json / STREAM-TERMINAL-OVERWRITE、STREAM-POST-FINISH-DELTA；reproduce-stream-ui.js。等级：原报告 E1＋Adapter 静态路径。
- 当前生产定位（b93d0d8）：velaProviderStreamAssembler.js:24–47 consumeFrame finish 覆写与 delta；ProviderAdapter.js:1292 wrapper → :1104 finish 校验。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：length 可被后续 stop 覆盖，finish_reason 后的 content delta 仍被拼接；后续正常终态检查无法看见已经丢失的错误。 限定：保留合法 DONE 提前结束读取；不把异常 Provider 帧风险扩写成任意部分 JSON 直接执行。
- 建议边界与关闭标准：终态单调；矛盾 finish、终止后内容、截断/错误帧等有严格规则和生产模块对抗回归。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 Assembler/Adapter/Transport 组合输入 length→stop、stop→delta、冲突 finish、截断/错误、合法 DONE/分块边界；断言异常不可被末尾 stop 洗白且结构化 admission 无候选。 候选现有入口：scripts/test-vela-provider-stream-lifecycle.js。
- 真实 AE/CEP 要求：CEP 实际流式/取消/正常 DONE 验收；异常帧来自受控 transport，单列模拟故障来源，不声称真实模型自然发出异常帧。 后续回验：0.3.12；0.3.25。

### A08 — Detach 清空原始用户注释（B2）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/host-seam-results.json / HOST-DETACH-SOURCE-COMMENT；reproduce-host-seams.js。等级：原报告 E1：变更循环夹具；AE Undo 未实测。
- 当前生产定位（b93d0d8）：host/tools/adComponentKit.jsx:765–780 保存 previousCommentEncoded；:1405–1416 restoreSourceLayerBinding；:2416–2447 Detach 循环清 comment。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：source binding 已保存 previousCommentEncoded，但 Detach 对所有组件层直接清空 comment；Remove 与 Detach 的数据归属处理不一致。 限定：不宣称永久不可恢复；不趁机清理无归属证据的表达式或其他用户数据。
- 建议边界与关闭标准：分别处理 generated layer 与 source binding；恢复原注释，只移除工具拥有的数据；真实 AE 值与 Undo 验收。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：加载原工具模块，source/generated/无归属层分类夹具；经注册 Detach 调用；原注释、表达式及其他用户数据独立断言，故障与正常 Remove 对照。 候选现有入口：scripts/test-grid-host-contract.js。
- 真实 AE/CEP 要求：实际有原注释的源层创建组件→Detach→读回→Undo；只改工具拥有数据；记录部分失败和已保存 metadata 兼容。 后续回验：0.3.12；0.3.18。

### A09 — 坐标转换失败被伪装为有效几何（B2）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/host-seam-results.json / HOST-COORDINATE-FALLBACK；reproduce-host-seams.js。等级：原报告 E1：能力夹具；宿主/API/图层矩阵待验证。
- 当前生产定位（b93d0d8）：adComponentKit.jsx:85–131 bounds（:121 失败回退局部点），:150 strict sourcePointToComp；:1502/:1521/:1647 消费；textBackgroundBox.jsx:184–243 → :297。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：旧路径 toComp 失败后直接使用局部点，另一条背景路径则返回 null；严格 Grid 路径已有 sourcePointToComp 对照。 限定：不声称所有 AE 都没有 toComp；禁止只替换 API 名字而不验证空间语义。
- 建议边界与关闭标准：定义受支持的坐标空间与 Host 转换；不可转换明确失败；父级、旋转、缩放、时间、2D/3D 和表达式条件做矩阵。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原两工具模块，toComp 缺失/抛错与 sourcePointToComp 可用/失败对照；确认局部/合成坐标及调用方失败无写入；不能只替换 API 名。 候选现有入口：scripts/test-grid-host-contract.js。
- 真实 AE/CEP 要求：按支持 AE 版本与图层类型验证 parent、旋转、缩放、时间/关键帧、2D/3D、表达式和零尺寸；真实 bounds/产物/Undo 对照。 后续回验：0.3.12；0.3.18–0.3.21。

### A11 — 公共 serializer 未转义全部 C0 字符（B1）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/core-results.json / HOST-JSON-CONTROL；reproduce-core.js。等级：原报告 E1：U+0001 与换行对照。
- 当前生产定位（b93d0d8）：host/index.jsx:15–42 jsonEscape/toJson/stringify → 普通工具结果。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：公共字符串转义漏掉部分 U+0000–U+001F，可能输出无效 JSON；私有 Vela JSON 路径不自动补救公共返回。 限定：与 G-02 的参数代理项校验是不同问题；具体工程发生频率未知。
- 建议边界与关闭标准：完整字符串转义与严格往返；覆盖所有 C0、多语言、引号/反斜线、异常信息及既有结果形状。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：加载原 serializer，对全部 C0、键/值、引号/反斜线、中英文与错误消息严格 JSON.parse 往返；保留既有信封。 候选现有入口：scripts/test-host-registry-transaction.js。
- 真实 AE/CEP 要求：真实 Host 返回含可支持控制字符/多语言的结果，经 CEP JSON.parse 消费；记录原生字段不允许字符的限制。 后续回验：0.3.12；0.3.25。

### A12 — readiness 被 suspend 作废后卡在 checking（D）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/source-audit.md)；source-evidence.zip :: lomond_audit_0311/stream-ui-results.json / UI-READINESS-SUSPEND；reproduce-stream-ui.js。等级：原报告 E1＋main 入口定位；完整实机待测。
- 当前生产定位（b93d0d8）：SurfaceController.js:242 checking 提前返回、:252 superseded、:302–303 suspend/resume；main.js:4954/:8194/:9169 suspend 调用。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：generation 失效旧检查但状态仍 checking，resume 不退出，再次 enable 又提前返回，形成不可重试状态。 限定：面板 suspend 与切会话重建 Surface 是不同路径，分别测试。
- 建议边界与关闭标准：失效检查必须进入明确可重试态；恢复后自动重试或提示重试有契约；不接受旧 generation 结果。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 controller：pending check→suspend→resume→再 enable；新旧 generation 对照，检查次数与可重试态；区分切会话销毁重建。 候选现有入口：scripts/test-vela-surface-controller.js。
- 真实 AE/CEP 要求：实际进入/退出工具详情与面板挂起，各路径可重试且不接收旧 ready；0.3.12 验收为本轮前置，R1 所列 0.3.13/14 为回验。 后续回验：0.3.13；0.3.14。

### AP-01 — Palette 失败回滚可能删除未知旧数据（E）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/appearance-audit.md)；appearance-evidence.zip :: state-results.json / AP-01 两场景；probes/run-state-probes.js。等级：原报告：手工转录存储故障夹具；原生 localStorage 条件未重放。
- 当前生产定位（b93d0d8）：palette/paletteStore.js:210–231 commit：previous=null、getItem→setItem、catch removeItem；Workspace.js:698–710 saveDraft 到 Store。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：previous=null 混淆读取失败与确认无旧值；getItem 抛异常且 removeItem 可用时，未写入新值也会删除原资产。 限定：不是所有配额失败都会丢色卡；不得坏数据自动恢复默认覆盖旧资产。
- 建议边界与关闭标准：独立记录 oldValueReadSucceeded/previousValue/writeAttempted；未知旧状态不删除；写入/回滚双失败和迁移证据保留测试。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 Palette Store 经公开 save/import 入口，读失败但删除可用、无旧值写失败、有旧值写失败、回滚再失败、v1迁移；未知旧状态不删，UI 不假报成功。 候选现有入口：scripts/test-palette-store-v2.js。
- 真实 AE/CEP 要求：真实 Palette 保存/重开＋受控 storage adapter 故障；备份用户资产，记录原生故障是否可复现，不把模型条件等同 quota 必现。 后续回验：0.3.12；0.3.14。

### AP-02 — 外观应用成功与保存成功未区分（E）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/appearance-audit.md)；appearance-evidence.zip :: state-results.json / AP-02 两场景；probes/run-state-probes.js；Design Tuning 为静态同类路径。等级：Appearance 局部故障复现；Design Tuning 同类静态确认。
- 当前生产定位（b93d0d8）：AppearanceStateStore.js:57–65 → AppearanceResolver.js:195–218；DesignTuningStateStore.js:23 → Resolver.js:63/:78；main.js:9703–9710。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：Resolver 忽略保存失败仍返回成功；无 storage 也可报告 persisted:true，显示值与重启恢复值分离。 限定：基础 Settings 由 main wrapper 保存不是本项缺陷；不擅自将临时值变成持久化事实。
- 建议边界与关闭标准：本方案采用 accepted/applied/persisted 分离；失败可保留当前外观但必须标为未保存，并提供重试和还原至已保存值；reset 同契约。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 Store/Resolver/main 消费组合验证 storage 缺失/抛错、commit/reset、重试/还原；accepted/applied/persisted 分离且不改 Settings 存储归属。 候选现有入口：scripts/test-appearance-state-store.js。
- 真实 AE/CEP 要求：真实外观应用后保存失败反馈、重试、还原、重开值；错误注入单列，正常 persistence 用实际 CEP。 后续回验：0.3.13；0.3.14。

### AP-03 — 外观快照泄漏可变引用及默认值污染（E）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/appearance-audit.md)；appearance-evidence.zip :: state-results.json / AP-03 两场景；probes/run-state-probes.js。等级：原报告：对象引用夹具；当前普通消费者是否误用未知。
- 当前生产定位（b93d0d8）：AppearanceStateStore.js:14–21 copyOverrides、:68–74 set、:88–105 getter/snapshot；AppearanceResolver.js:12 defaults、:88–92 copy、:230 getResolvedValue；main.js:8842 CoreAppearance。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：浅拷贝和直接返回 colorAlpha 嵌套对象使读接口成为写接口；外层冻结不足以保护工厂默认值。 限定：本地 JS API 风险，不是用户拖动必现，也不是远程模型注入。
- 建议边界与关闭标准：入库独立规范化、对外深快照、默认值深冻结；跨实例与绕过校验负向测试。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原模块跨实例规范化与深快照：修改返回 colorAlpha 不影响 store/defaults；绕过范围验证拒绝；检查正常多消费者。 候选现有入口：scripts/test-appearance-resolver.js。
- 真实 AE/CEP 要求：真实 Appearance/校准/主题切换与重开；可变引用反例是本地 JS API 离线证据，不声称用户拖动/模型注入必现。 后续回验：0.3.13；0.3.14。

### UX-01 — Escape 被菜单与 Settings 两层消费（E）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/uiux-audit.md)；uiux-evidence.zip :: browser-results.json / UXP10-escape-bubbles-to-parent；probes/escape-handlers-excerpt.js。等级：原报告 UXP10：浏览器事件＋摘录，关闭函数计数替身。
- 当前生产定位（b93d0d8）：coreUi.js:456–469 triggerKeydown → main.js:10268–10273 全局 Escape。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：菜单仅 preventDefault，外层不尊重消费结果，单次 Escape 同时退出两层。 限定：不依靠同时 close 所有层获得表面干净；与 UX-02 联合验收但保留独立 ID。
- 建议边界与关闭标准：先修事件消费，后由统一 overlay/input owner 调度；菜单/picker/文本编辑/模态每次只结束应结束的一层。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：完整 CoreUI 组件＋实际 main 关闭分派（不只计数替身），菜单/picker/文本编辑/dirty Palette/模态每次只消费一层；兼顾键盘默认事件。 候选现有入口：scripts/test-shared-select-lifecycle.js。
- 真实 AE/CEP 要求：真实 CEP Escape 层级与 Settings dirty 场景；不能靠关闭全部层通过；后续 overlay owner 迁移回验。 后续回验：0.3.13；0.3.14。

### UX-02 — Palette 外层关闭绕过 dirty gate（E）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/uiux-audit.md)；uiux-audit.md UX-02 跨模块静态链；无完整产品 AE 复现 probe。等级：原报告：跨模块静态闭合；未重放全产品 AE。
- 当前生产定位（b93d0d8）：main.js:9946–9958 close/back，:10109 closePaletteWorkspace，:10247 backdrop；SystemSurfaceRouter.js:48–53 先清 active；Workspace.js:534–548/:689–695/:1449–1454。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：内部返回受保护，外层 Escape/背景关闭直接 discardDraft；Router 又先清 active 再回调，阻碍取消离开。 限定：不是已保存 Palette 资产丢失；不能使 AE/面板卸载等待确认而挂起。
- 建议边界与关闭标准：所有用户主动离开先 negotiate leave 再改 route/dispose；保存/丢弃/继续编辑一致；强制卸载与用户离开分开。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：原 Router/Workspace/main 组合：Escape/backdrop/back/切路由各触发保存/丢弃/继续编辑，保存失败不走离开；route 在协商通过后才改变；shutdown 独立。 候选现有入口：scripts/test-palette-workspace-continuity.js。
- 真实 AE/CEP 要求：真实 dirty Palette 四类主动离开/菜单 Escape 联合验收；原生强制卸载不中断宿主、不等待确认；此项是未保存草稿，不是 AP-01 已存资产。 后续回验：0.3.13；0.3.14。

### UX-03 — 批准前目标、范围与完整变化不可充分审阅（F）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/uiux-audit.md)；uiux-evidence.zip :: browser-results.json / UXP03-confirmation-target-display、UXP04-long-name-ellipsis；sources/velaConfirmationView.js。等级：原版 ConfirmationView blob 核验＋局部 DOM/CSS；非完整 Runtime。
- 当前生产定位（b93d0d8）：velaRuntime.js:1007–1019 confirmation projection → ConfirmationView.js:31–44 摘要；velaSurface.css:213–231 action row/ellipsis。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：仅数值/名称 before→proposed 的单行摘要，长文本可被截断且缺展开入口；未呈现目标合成/图层与步骤范围。 限定：不是 Authority 绕过。显示快照不能代替 JIT/Preflight，不得让模型描述充当受信目标。
- 建议边界与关闭标准：0.3.12 先保障完整本地变化与可靠可显示目标说明；0.3.17 形成正式 Review 卡，显示步骤与已完成部分；信息不足须阻断或明确重新取得。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：实际本地 Review projection→完整 View/CSS：长中英文目标/前后值全文可读，说明当前步/范围与不可用信息；目标取自受控本地，不取模型；不得赋予 Surface Authority。 候选现有入口：scripts/test-vela-review-runtime-seam.js。
- 真实 AE/CEP 要求：真实 Review 长名/opacity、窄屏、目标漂移/重新捕获、拒绝/批准；完整知情批准信息与实际执行目标相符；最终任务卡留到 0.3.17。 后续回验：0.3.14；0.3.17；0.3.24。

### G-01 — 入口文档与 current/latest 状态漂移（A0）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；conversation-decisions.md；基线五入口 diff；R1 guidance §8.4。等级：首轮对话与本次远程 PROJECT_STATE/ROADMAP 复核。
- 当前生产定位（b93d0d8）：AGENTS/README/HANDOFF → PROJECT_STATE、VELA_ROADMAP。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：入口历史节点、当前/最新测试数字及已实现多会话语义互相冲突；Codex/DSH 可能读到两套现状。 限定：0.3.11 功能封存不自动 bump 包版本、不自动发布。
- 建议边界与关闭标准：一份当前实现状态、一份当前路线；历史报告不改写；入口只留短摘要并链接；版本对账检查拒绝矛盾 current。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：现有 consistency/i18n、当前状态检索、文档链接与 production diff=0；本轮已经执行入口文档修订，未编写测试。 候选现有入口：scripts/check-project-consistency.js。
- 真实 AE/CEP 要求：纯文档无 AE 要求；每次封存再检查 current/latest，不冒充产品修复；本轮事实见报告检查节。 后续回验：每次封存。

### G-02 — 图层名末尾孤立高代理项被接受（B1）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；conversation-decisions.md 的 Unicode 摘要；原独立 Node 脚本缺失。等级：首轮对话报告 Node 最小复现；独立脚本未进入三份证据包。
- 当前生产定位（b93d0d8）：client/js/vela/velaCapabilityContracts.js:234–258 utf8ByteLengthExact → validateLayerNameParams；:228/:290 参数分派。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：字符串末尾 charCodeAt(index+1) 为 NaN，现有范围比较未拒绝孤立高代理项。 限定：不把未归档的旧最小复现升级成当前完整执行链证据；不是已证权限绕过。
- 建议边界与关闭标准：生产原模块复验并补边界；合法代理对、孤立高/低代理项、ASCII/多语言与 UTF-8 byte limit 对照。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：require 原 capability contracts，合法代理对、末尾/中间孤立高低代理项、ASCII/中文、255/256/257 UTF-8 bytes；不得复制 validator；先记录原模块实际拒绝/接受。 候选现有入口：scripts/test-vela-capability-contracts.js。
- 真实 AE/CEP 要求：合法多语言 rename/Undo；非法参数在生产链 Host 前拒绝；不向用户工程写畸形 Unicode 以证明风险。 后续回验：0.3.12；0.3.15。

### G-09 — 原八个 hard exit gates 的精确枚举未保留（A0）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；roadmap-foundation-summary.txt；conversation-decisions.md。等级：项目摘要提到八项，remote 明确未保存原枚举。
- 当前生产定位（b93d0d8）：VELA_ROADMAP 八项新 Gate → guidance §10；冻结 architecture 独立。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：现有来源支持若干硬要求，但不支持重建原来的逐条八项内容。 限定：这是新制定而非找回原清单；不替代冻结架构 13 invariants。
- 建议边界与关闭标准：本次新定义 GATE-01…08 并在规划 PR 中采纳；保留新旧来源说明，建立任务/证据映射。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：核对 Gate-01…08 两处一致、声明新制定而非历史复原；不改 13 invariants；本轮已导入。 候选现有入口：不适用：文档核对。
- 真实 AE/CEP 要求：本项规划不需 AE；Gate 满足性后续各版本用实际证据证明，不能将导入视为 Gate PASS。 后续回验：0.3.26。

### G-10 — 审计 UNKNOWN 与证据分散、全审覆盖未完成（A0/G）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；三份 coverage、manifest 与各原报告限制。等级：三份 coverage＋首轮建议。
- 当前生产定位（b93d0d8）：docs/reports/audit-baseline-0.3.11 manifest → 原 reports/archives；A0 inventory。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：局部摘录、原模块、浏览器与真实 AE 证据强度不同；历史 UNKNOWN 不能靠追加文档被洗成 PASS。 限定：不把 46 个继承局部场景当新测结果、全量回归或 46 个漏洞。
- 建议边界与关闭标准：问题保留 ID/源提交/原始证明类型/复核方法/修复提交/验收/未知；完整源码清单驱动覆盖，见 COV 组。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：字节/哈希验证、54 ID 和25当前条目映射检查；未验证保持 open，修复提交/新验收后补事实；本轮已建索引，完整审计未完成。 候选现有入口：不适用：证据完整性核对。
- 真实 AE/CEP 要求：逐修复补真实证据；历史 UNKNOWN 原文保留，NOT_REPRODUCED 需条件差异和风险处置。 后续回验：各版本；0.3.25–0.3.26。

### COV-03 — Vela 安全关键与辅助模块剩余路径（C1/C2/D/F/G）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；source/appearance/uiux-coverage.md。等级：继承三份覆盖清单。
- 当前生产定位（b93d0d8）：client/js/vela/** 经 client/index.html/CEP module loader/Core composition；详见源码清单。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：源码审计覆盖了关键链但非全部文件/分支；不能给全仓权限安全认证。 限定：清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。
- 建议边界与关闭标准：安全关键优先完整复核；变更版本补调用链与对抗测试；剩余项 owner 和退出日期明确。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：Protocol/Parser/Compiler/Plan/Preflight/Grant/Coordinator/Provider/Observation/Owner 优先逐分支补审；测试使用真实模块与 adversarial 输入；本轮只定位相关片段。 候选现有入口：scripts/run-all-tests.js（后续，不在本轮运行）。
- 真实 AE/CEP 要求：每次修改后真实 Review/提交/Verify/取消生命周期；0.3.15–17 回验，0.3.26 最终核对；未审范围保留。 后续回验：0.3.15–0.3.17；0.3.26。

### COV-04 — 普通 Host、全部工具与 JSX 契约（B1/B2/G）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；source/appearance/uiux-coverage.md。等级：继承三份覆盖清单。
- 当前生产定位（b93d0d8）：host/index.jsx 公共入口/#include/registry loader → host/vela、host/tools/*.tool.jsx 与实现。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：公共 Host 及部分工具已有发现，但所有工具定义、Host Context/JSON 与 Shape Add 未全面审毕。 限定：清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。
- 建议边界与关闭标准：逐工具数据归属、输入/输出、Undo、部分完成与观察证据；覆盖不受是否已接入 Vela 限制。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：逐工具输入/输出/用户数据/Undo/部分失败，包含 Shape Add、lab 与未接 Agent 工具；不因 A01/B2 修复就标全 Host 已审。 候选现有入口：scripts/test-host-registry-transaction.js。
- 真实 AE/CEP 要求：逐工具实际入口与 AE 副作用、Undo、失败矩阵；按0.3.18–22动作域持续完成，0.3.26核对。 后续回验：0.3.18–0.3.22；0.3.26。

### COV-05 — 测试、脚本、CI 与运行环境的覆盖可靠性（G）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；source/appearance/uiux-coverage.md。等级：继承三份覆盖清单。
- 当前生产定位（b93d0d8）：scripts/**、.github/workflows/project-checks.yml、.githooks/pre-commit、helpers/win/eyedropper/windows-eyedropper.ps1、CSXS/manifest.xml。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：182 suites 未被逐条审计；手写摘录/替身可能不能约束实际生产；Windows/PowerShell helper 未实测。 限定：清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。
- 建议边界与关闭标准：分离纯契约/生产模块/浏览器/CEP/AE证据；测试清单与路径映射；遗漏、skip、隔离/反序和关键场景检测。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：审查 runner发现规则/skip/fixture 与生产模块接线、CI平台及helper；现存 suite 只列候选，不能用数量替代可靠性；本轮无测试代码改动。 候选现有入口：scripts/run-all-tests.js（待审阅）。
- 真实 AE/CEP 要求：Windows helper/CEP装载/真实安装单独验收；CI Linux/Node20 不代表 Windows AE；每版跟随消费者，0.3.25–26汇总。 后续回验：每版本；0.3.25–0.3.26。

### COV-06 — 真实 AE、CEP、IME、DPI 与长时运行（G）

- 原始定义/证据：[R1 总账](../design/vela-0.3-reconstruction-guidance.md#section-8)，[原始来源](audit-baseline-0.3.11/manifest.json)；source/appearance/uiux-coverage.md；0.3.11 integrated M。等级：继承三份覆盖清单。
- 当前生产定位（b93d0d8）：CSXS/manifest.xml → client/index.html/main → CSInterface.evalScript → host/index.jsx；实际 AE/CEP/OS 环境未运行。仅静态相关路径核对，不等于完整模块审计或动态复现。
- 待验证条件：多处条件性缺陷与视觉假设只有局部模型；没有全产品截图、性能、输入法、屏幕阅读器和原生故障矩阵。 限定：清单必须先于“全量审计完成”结论；未查不等 PASS，也不自动等 FAIL。
- 建议边界与关闭标准：逐项补对应真实旅程，记录模型/宿主/配置/值与 Undo；不能复现的保留精确限定，而非清空 UNKNOWN。 生产项须反例/正向对照、实际模块回归、对应 AE/CEP 证据和原 ID 闭环后才能关闭；未复现须记录精确条件差异与风险裁定。
- 离线计划：预先按生产模块/浏览器/CEP/原生 AE 分层设计记录，IME/DPI/长时测量不得用 mock PASS替代。 候选现有入口：无可替代原生验收的单一离线 suite。
- 真实 AE/CEP 要求：各 focused slice 从首次修复开始取环境/模型配置/页面/值/Undo/资源证据；全审与长时留到对应里程碑收口。 后续回验：每版本；0.3.25–0.3.26。

## 依赖顺序与下一项最小任务

A0（G-01/G-09、证据/清单）→ B1 公共数据边界 → B2 普通工具；C1 稳定 Session 事件 → C2 提交事实/Verify → F 最小完整 Review 的结果一致性回验。D 生命周期与 E 资产保护可独立拆 focused slice，但 F 和最终 G 整合必须再覆盖 D 的后台任务与 E 的离开路径。P1 A01、A02、A06、AP-01、UX-01/02/03 优先，相关 P2 紧随；不是把整个 B1–G 合成一个大修复。本轮不启动其中任何实现。

建议下一项 **0.3.12-B1 / A01 公共 Host JSON 数据入口生产复核与修复**：只针对 host/index.jsx 公共 parseJson 及 Ad Component Kit 元数据/注册状态调用链建立真实模块反例，取消数据进入 eval 的路径、保留现有 JSON 结果信封与 ES3；合法/坏元数据、有/无原生 JSON 对照，读取无副作用；记录实际 AE 条件和工具状态入口。A11/G-02 在 B1 内以独立子任务紧随，避免混同字符串编码与参数 Unicode 验证。此为建议任务，需新的实施指令；本轮到 A0 停止。

## 0.3.13 样页/视觉矩阵与 ADR 待办

此处是准备清单，不创建 UI 资产、不批准任何视觉数值。指导书 §5、§9.3 为来源。

| 样页 | 必须比较的状态 | 交付/批准要求 |
| --- | --- | --- |
| 复杂 Registry 工具 | 分组/长字段/禁用原因/错误/折叠/执行状态 | 真实 schema、DOM、共享行为与中英文内容 |
| Global Settings | Appearance/开发区、默认/用户/校准/预览、保存失败 | 完整 CSS 来源与显示/持久化事实，不清配置制造 PASS |
| Vela | 待批准/长目标/部分完成/失败/取消/空状态 | 本地 Review/Result 来源、主次、窄屏全文与可用操作 |
| Palette 编辑 | dirty、图/列表、导入错误、离开协商/保存失败 | 数据密集对照、焦点/滚动及用户资产保护 |

环境采样采用 R1 建议宽280/360/520/760、高420/640/900 CSS px、UI Scale0.62/0.92/1.18、角色乘数边界、中英文/长文本、DPR/OS缩放实测；不是已支持/已测声明。当前 manifest MinSize320×460，280/420应标为压力/布局研究，并核实宿主实际可达性；先风险组合与断点两侧，再补 pairwise，不承诺全笛卡尔积。旧已废弃效果图不作为新基线。

待写 ADR：整页视觉/排版与布局壳语义（V-01–04/06/07）；样式 owner/优先级/单一投影（V-05）；overlay/Escape/leave/focus/portal（UX-01/02/07）；gesture preview/commit/cancel/dispose（AP-05/06）；窄屏状态、起草资格、非空会话关闭、native/shared控件（AP-07、UX-05–09）；固定 Palette 与引擎版本/迁移（AP-04）；stream/terminal字体角色（AP-08）；main/CoreUI/Renderer 迁移清单与旧入口删除、资产回退。Agent规范边界不变则不机械触发 amendment；确有改变需另提 Architecture Amendment，本轮未改冻结文档。

## 仍缺少的证据与关闭边界

完整 R1 交付包已取得并验证；资料完整不等于其历史证据已覆盖生产。仍缺：G-02 原独立最小复现脚本；三轮探针的大部分完整生产组合复验；无原生 JSON、提交后切层、no-op canonical Session、后台 Review 停用、readiness suspend、storage故障、Detach/Undo、坐标矩阵、完整CSS/原生IME/DPI/长时证据。原17+19+10=46局部场景均未重跑，其中包括对照与X01排除，不能当46个漏洞或本轮全量回归。

0.3.11综合报告M节原有UNKNOWN全部保留：手工转录非raw wire/native recording；held Verify/cancellation及部分竞态仍是继承离线证据；page/Core reload不等原生关闭/AE重启；activeItem=null原因、cleanup numeric output、A2/A3 provenance、A5 one-shot targetRelation未升级。A02生产复核将专门补提交目标关联，但本轮没有完成它。

COV-01/02 主要进入0.3.13–14；COV-03/04/05/06从0.3.12开始，按各自回验版本完成，不要求A0全源码深审。A0的规划交付完成不表示任何新Gate通过或0.3.12生产阶段完成。

## 本轮检查

第一阶段已完成的基线、i18n/consistency、86个本地链接存在性与388文件清单检查保留为当时结果；R1导入后按新增文档/证据重新做定向检查，最终结果如下。未运行生产反例、全离线套件/顺序测试、AE、Provider或qualification；未改测试代码、冻结架构或包metadata；未commit/push/merge/tag。


| 最终检查 | 本轮结果 |
| --- | --- |
| 基线与只读边界 | HEAD、本地origin/dev及本轮远端查询均b93d0d8；383个非变更受控文件Git blob与HEAD一致；生产/测试/冻结架构/历史封存/metadata无内容差异 |
| 原始资料 | manifest11/11字节与SHA-256匹配；JSON导出及manifest原字节一致；指导书仅Markdown行末空格格式化、规范内容一致 |
| 原模块来源核对 | UIUX zip内ComposerView与ConfirmationView两个原模块Git blob均与当前HEAD匹配；未运行其浏览器探针 |
| ID与分配 | 54个唯一ID在指导书/路线完整保留；25/25当前工作项映射齐备；候选现有测试路径存在，不宣称测试覆盖成立 |
| 源码清单 | 388/388基线受控文件已列入，blob/入口/owner/范围/方法/关联/测试/环境/剩余缺口均有字段；未审明确标记 |
| 文档链接 | 153个本地链接目标、44个锚点检查通过（包括导入材料的相对引用）；固定提交外链不冒充本轮远程页面重审 |
| 既有检查 | node scripts/report-i18n-usage.js --check PASS；node scripts/check-project-consistency.js PASS；git diff --check PASS |
| 已跟踪差异格式 | `git diff --check` PASS；仅覆盖已跟踪差异，不作为新增文件格式已检查的证明 |
| 新增文件格式 | 对全部14个新增文本文件逐一执行 `git diff --no-index --check -- /dev/null <path>`：4份新增规划文件（指导书、总账JSON、A0报告、源码清单）及1份归档 `.gitignore` 均无空白错误；9份继承文本中仅有下列已知例外。两个JSON文件另经严格解析通过；3份二进制ZIP不作文本格式检查，由manifest字节/哈希核验覆盖 |
| 原始证据空白例外 | `audit-baseline-0.3.11/source-audit.md:3`、`:4` 的历史Markdown双空格换行被 `--no-index --check` 明确报告，按字节保留，不改原证据、不宣称该文件无空白错误。其余新增文本无空白错误。`--no-index` 对新增内容返回1，例外文件返回3；已区分文件差异与空白诊断，未将返回1误记为格式失败。LF/CRLF checkout提示不属于空白错误 |
| 工作树交付 | 5个受控入口文档修改，17个新增规划/证据/归档配置文件；全部未暂存、未提交 |

**A0完成判定：COMPLETE（文档规划交付），不是0.3.12生产修复完成或SEALED。** 完整R1已导入并对齐，资料和源码覆盖边界明确，25项复核计划、依赖、最小下一项与0.3.13准备清单可审阅。生产修复尚未开始；保留所有未验证条件与历史UNKNOWN。到此停止，不自动执行B1、Host修复或UI重构。

## 提交前文档收束（2026-09-09）

本次仅修正本报告基线表的资料最终状态、AGENTS变更行的A0完成状态，并补足新增文件格式检查的范围与例外说明。五个入口的当前状态已核对且正确，未重复修改；历史封存中的当时状态不改。原始manifest的11项字节数/SHA-256再次全部匹配。仅执行文档相关既有检查与逐新增文件Git格式检查；不重新展开审计，不进入B1，不运行全量离线回归或AE，不暂存或commit/push。
